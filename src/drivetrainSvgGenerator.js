import { SprocketGeometry } from './sprocketGeometry.js';

export class DrivetrainSVGGenerator {
  constructor(config = {}) {
    this.pitch = config.pitch || 12.7;
    this.geometry = new SprocketGeometry(this.pitch);
    this.clearanceTolerance = config.clearanceTolerance || this.pitch * 0.03;
    this.inwardTolerance = config.inwardTolerance || 0.015;
    this.coordinatePrecision = 3;
  }

  render(options) {
    const layout = this._buildLayout(options);
    const style = this._buildStyle(options.styleConfig || {});

    if (options.animation && options.animation.enabled) {
      return this._renderAnimatedSvg(layout, style, options);
    }

    let svg = this._renderSvgOpen(layout);
    svg += this._renderCassette(layout, style, options);
    svg += this._renderChainring(layout, style, options);
    svg += this._renderChain(layout.chainPins, style);
    svg += this._renderLabels(layout, style, options);
    svg += '</svg>';
    return this._minifySvg(svg);
  }

  _buildLayout(options) {
    const rearRadius = this.geometry.getPitchRadius(options.selectedCog);
    const frontRadius = this.geometry.getPitchRadius(options.chainring);
    const solution = this._solvePitchLockedLayout(options, rearRadius, frontRadius);
    const rearCenter = { x: 0, y: 0 };
    const frontCenter = { x: solution.centerDistance, y: 0 };
    const rearRotation = solution.rearBottomAngle - (0.5 * this.geometry.getToothAngle(options.selectedCog));
    const frontRotation = solution.frontTopAngle - (0.5 * this.geometry.getToothAngle(options.chainring));
    const rearBottom = this.geometry.getValleyCenter(
      options.selectedCog,
      0,
      rearRotation,
      rearCenter
    );
    const rearTop = this.geometry.getValleyCenter(
      options.selectedCog,
      solution.rearWrapCount,
      rearRotation,
      rearCenter
    );
    const frontTop = this.geometry.getValleyCenter(
      options.chainring,
      0,
      frontRotation,
      frontCenter
    );
    const frontBottom = this.geometry.getValleyCenter(
      options.chainring,
      solution.frontWrapCount,
      frontRotation,
      frontCenter
    );

    return {
      rearCenter,
      frontCenter,
      requestedCenterDistance: options.chainstay,
      effectiveCenterDistance: solution.centerDistance,
      rearRadius,
      frontRadius,
      rearRotation,
      frontRotation,
      rearTop,
      rearBottom,
      frontTop,
      frontBottom,
      straightLinkCount: solution.straightLinkCount,
      rearWrapCount: solution.rearWrapCount,
      frontWrapCount: solution.frontWrapCount,
      chainPins: this._buildClosedChainPins({
        selectedCog: options.selectedCog,
        chainring: options.chainring,
        rearCenter,
        frontCenter,
        rearRotation,
        frontRotation,
        rearWrapCount: solution.rearWrapCount,
        frontWrapCount: solution.frontWrapCount,
        straightLinkCount: solution.straightLinkCount
      })
    };
  }

  _solvePitchLockedLayout(options, rearRadius, frontRadius) {
    const targetCenterDistance = options.chainstay;
    const frontToothAngle = this.geometry.getToothAngle(options.chainring);
    const rearToothAngle = this.geometry.getToothAngle(options.selectedCog);
    const radiusDelta = frontRadius - rearRadius;
    const targetStraightLength = Math.sqrt(Math.max(0, targetCenterDistance ** 2 - radiusDelta ** 2));
    const targetStraightLinks = Math.max(1, Math.round(targetStraightLength / this.pitch));
    const targetFrontWrap = this._getTargetFrontWrapCount(options, targetCenterDistance);
    const targetRearWrap = this._getTargetRearWrapCount(options, targetCenterDistance);
    let best = null;

    for (let straightLinkCount = Math.max(1, targetStraightLinks - 12);
      straightLinkCount <= targetStraightLinks + 12;
      straightLinkCount++) {
      const straightLength = straightLinkCount * this.pitch;

      for (let frontWrapCount = 2; frontWrapCount < options.chainring - 1; frontWrapCount++) {
        if (!this._isWrapCountAllowed(frontWrapCount, targetFrontWrap, frontRadius, rearRadius)) {
          continue;
        }

        const frontDelta = frontWrapCount * frontToothAngle;
        if (frontDelta <= 0 || frontDelta >= Math.PI * 1.85) continue;

        for (let rearWrapCount = 2; rearWrapCount < options.selectedCog - 1; rearWrapCount++) {
          if (!this._isWrapCountAllowed(rearWrapCount, targetRearWrap, rearRadius, frontRadius)) {
            continue;
          }

          if (!this._hasEvenLinkCount(straightLinkCount, frontWrapCount, rearWrapCount)) {
            continue;
          }

          const rearDelta = rearWrapCount * rearToothAngle;
          if (rearDelta <= 0 || rearDelta >= Math.PI * 1.85) continue;

          const frontHalf = frontDelta / 2;
          const rearHalf = rearDelta / 2;
          const verticalOffset = (rearRadius * Math.sin(rearHalf)) - (frontRadius * Math.sin(frontHalf));
          const horizontalSpan = Math.sqrt(Math.max(0, straightLength ** 2 - verticalOffset ** 2));
          const centerDistance = horizontalSpan - (frontRadius * Math.cos(frontHalf)) -
            (rearRadius * Math.cos(rearHalf));

          if (!Number.isFinite(centerDistance) || centerDistance < 150 || centerDistance > 800) {
            continue;
          }

          const candidateGeometry = this._buildCandidateGeometry({
            centerDistance,
            frontRadius,
            rearRadius,
            frontHalf,
            rearHalf
          });
          const clearance = this._measureCandidateClearance(candidateGeometry);

          if (!clearance.valid) {
            continue;
          }

          const score = this._scoreLayoutCandidate({
            centerDistance,
            targetCenterDistance,
            frontWrapCount,
            rearWrapCount,
            targetFrontWrap,
            targetRearWrap,
            verticalOffset,
            clearance
          });

          if (!best || score < best.score) {
            best = {
              score,
              centerDistance,
              straightLinkCount,
              frontWrapCount,
              rearWrapCount,
              frontTopAngle: -frontHalf,
              frontBottomAngle: frontHalf,
              rearBottomAngle: Math.PI - rearHalf,
              rearTopAngle: Math.PI + rearHalf
            };
          }
        }
      }
    }

    return best || this._fallbackLayout(options, rearRadius, frontRadius);
  }

  _getTargetFrontWrapCount(options, targetCenterDistance) {
    const targetAngle = this._getTargetWrapAngles(options, targetCenterDistance).front;
    return Math.round(targetAngle / this.geometry.getToothAngle(options.chainring));
  }

  _getTargetRearWrapCount(options, targetCenterDistance) {
    const targetAngle = this._getTargetWrapAngles(options, targetCenterDistance).rear;
    return Math.round(targetAngle / this.geometry.getToothAngle(options.selectedCog));
  }

  _getTargetWrapAngles(options, targetCenterDistance) {
    const rearRadius = this.geometry.getPitchRadius(options.selectedCog);
    const frontRadius = this.geometry.getPitchRadius(options.chainring);
    const radiusDelta = Math.abs(frontRadius - rearRadius);
    const tangentAngle = Math.asin(Math.max(-0.95, Math.min(0.95, radiusDelta / targetCenterDistance)));
    const smallWrap = Math.PI - (2 * tangentAngle);
    const largeWrap = Math.PI + (2 * tangentAngle);

    return frontRadius >= rearRadius
      ? { front: largeWrap, rear: smallWrap }
      : { front: smallWrap, rear: largeWrap };
  }

  _isWrapCountAllowed(wrapCount, targetWrapCount, sprocketRadius, otherRadius) {
    const overwrapAllowance = sprocketRadius < otherRadius ? 1 : 4;
    return wrapCount <= targetWrapCount + overwrapAllowance;
  }

  _hasEvenLinkCount(straightLinkCount, frontWrapCount, rearWrapCount) {
    return ((straightLinkCount * 2) + frontWrapCount + rearWrapCount) % 2 === 0;
  }

  _scoreLayoutCandidate(candidate) {
    const centerError = Math.abs(candidate.centerDistance - candidate.targetCenterDistance);
    const frontWrapError = Math.abs(candidate.frontWrapCount - candidate.targetFrontWrap);
    const rearWrapError = Math.abs(candidate.rearWrapCount - candidate.targetRearWrap);
    const smoothness = Math.abs(candidate.verticalOffset);
    const inwardPenalty = candidate.clearance.maxInward * 800;
    const clearanceReward = Math.min(candidate.clearance.minClearance, this.pitch * 0.75) * 0.6;
    const wrapReward = Math.min(candidate.frontWrapCount, candidate.targetFrontWrap + 2) * 0.35 +
      Math.min(candidate.rearWrapCount, candidate.targetRearWrap + 2) * 0.35;

    return (centerError * 10) + (frontWrapError * 6) + (rearWrapError * 6) + (smoothness * 0.2) +
      inwardPenalty - clearanceReward - wrapReward;
  }

  _buildCandidateGeometry(candidate) {
    const rearCenter = { x: 0, y: 0 };
    const frontCenter = { x: candidate.centerDistance, y: 0 };

    return {
      rearCenter,
      frontCenter,
      rearRadius: candidate.rearRadius,
      frontRadius: candidate.frontRadius,
      rearTop: this._pointOnCircle(rearCenter, candidate.rearRadius, Math.PI + candidate.rearHalf),
      rearBottom: this._pointOnCircle(rearCenter, candidate.rearRadius, Math.PI - candidate.rearHalf),
      frontTop: this._pointOnCircle(frontCenter, candidate.frontRadius, -candidate.frontHalf),
      frontBottom: this._pointOnCircle(frontCenter, candidate.frontRadius, candidate.frontHalf)
    };
  }

  _measureCandidateClearance(candidate) {
    const checks = [
      this._measureSprocketSegmentClearance(
        candidate.rearTop,
        candidate.frontTop,
        candidate.rearCenter,
        candidate.rearRadius
      ),
      this._measureSprocketSegmentClearance(
        candidate.frontTop,
        candidate.rearTop,
        candidate.frontCenter,
        candidate.frontRadius
      ),
      this._measureSprocketSegmentClearance(
        candidate.frontBottom,
        candidate.rearBottom,
        candidate.frontCenter,
        candidate.frontRadius
      ),
      this._measureSprocketSegmentClearance(
        candidate.rearBottom,
        candidate.frontBottom,
        candidate.rearCenter,
        candidate.rearRadius
      )
    ];
    const minClearance = Math.min(...checks.map((check) => check.clearance));
    const maxInward = Math.max(...checks.map((check) => check.inward));

    return {
      valid: checks.every((check) => check.valid),
      minClearance,
      maxInward
    };
  }

  _measureSprocketSegmentClearance(start, end, center, radius) {
    const vector = {
      x: end.x - start.x,
      y: end.y - start.y
    };
    const length = Math.hypot(vector.x, vector.y);
    const unit = {
      x: vector.x / length,
      y: vector.y / length
    };
    const radial = {
      x: (start.x - center.x) / radius,
      y: (start.y - center.y) / radius
    };
    const outwardVelocity = (unit.x * radial.x) + (unit.y * radial.y);
    const inward = Math.max(0, -outwardVelocity);
    const trimmedDistance = this._distanceFromPointToTrimmedSegment(center, start, end, this.pitch * 0.65);
    const clearance = trimmedDistance - radius;

    return {
      valid: inward <= this.inwardTolerance && clearance >= -this.clearanceTolerance,
      clearance,
      inward
    };
  }

  _distanceFromPointToTrimmedSegment(point, start, end, trimDistance) {
    const vector = {
      x: end.x - start.x,
      y: end.y - start.y
    };
    const lengthSquared = (vector.x ** 2) + (vector.y ** 2);
    const length = Math.sqrt(lengthSquared);

    if (length === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const rawT = (((point.x - start.x) * vector.x) + ((point.y - start.y) * vector.y)) / lengthSquared;
    const trimT = Math.min(0.45, trimDistance / length);
    const t = Math.max(trimT, Math.min(1 - trimT, rawT));
    const closest = {
      x: start.x + vector.x * t,
      y: start.y + vector.y * t
    };

    return Math.hypot(point.x - closest.x, point.y - closest.y);
  }

  _fallbackLayout(options, rearRadius, frontRadius) {
    const radiusDelta = frontRadius - rearRadius;
    const targetStraightLength = Math.sqrt(Math.max(0, options.chainstay ** 2 - radiusDelta ** 2));
    const straightLinkCount = Math.max(1, Math.round(targetStraightLength / this.pitch));
    const frontWrapCount = Math.max(2, Math.round(options.chainring / 2));
    let rearWrapCount = Math.max(2, Math.round(options.selectedCog / 2));
    if (!this._hasEvenLinkCount(straightLinkCount, frontWrapCount, rearWrapCount)) {
      rearWrapCount += rearWrapCount < options.selectedCog - 2 ? 1 : -1;
    }
    const frontHalf = (frontWrapCount * this.geometry.getToothAngle(options.chainring)) / 2;
    const rearHalf = (rearWrapCount * this.geometry.getToothAngle(options.selectedCog)) / 2;

    return {
      centerDistance: options.chainstay,
      straightLinkCount,
      frontWrapCount,
      rearWrapCount,
      frontTopAngle: -frontHalf,
      frontBottomAngle: frontHalf,
      rearBottomAngle: Math.PI - rearHalf,
      rearTopAngle: Math.PI + rearHalf
    };
  }

  _buildClosedChainPins(config) {
    const pins = [];
    const rearBottom = this.geometry.getValleyCenter(config.selectedCog, 0, config.rearRotation, config.rearCenter);
    const rearTop = this.geometry.getValleyCenter(
      config.selectedCog,
      config.rearWrapCount,
      config.rearRotation,
      config.rearCenter
    );
    const frontTop = this.geometry.getValleyCenter(config.chainring, 0, config.frontRotation, config.frontCenter);
    const frontBottom = this.geometry.getValleyCenter(
      config.chainring,
      config.frontWrapCount,
      config.frontRotation,
      config.frontCenter
    );

    this._appendLinePins(pins, rearTop, frontTop, config.straightLinkCount, true);
    for (let i = 1; i <= config.frontWrapCount; i++) {
      pins.push({
        ...this.geometry.getValleyCenter(config.chainring, i, config.frontRotation, config.frontCenter),
        source: 'chainring-wrap'
      });
    }
    this._appendLinePins(pins, frontBottom, rearBottom, config.straightLinkCount, false);
    for (let i = 1; i < config.rearWrapCount; i++) {
      pins.push({
        ...this.geometry.getValleyCenter(config.selectedCog, i, config.rearRotation, config.rearCenter),
        source: 'cassette-wrap'
      });
    }

    return pins;
  }

  _appendLinePins(pins, start, end, linkCount, includeStart) {
    const firstStep = includeStart ? 0 : 1;
    for (let i = firstStep; i <= linkCount; i++) {
      const t = i / linkCount;
      pins.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        source: 'straight'
      });
    }
  }

  _buildStyle(styleConfig) {
    const fills = styleConfig.fillColors || [];
    return {
      cassetteFill: fills[0] || '#cbd5e1',
      cassetteAltFill: fills[1] || '#e2e8f0',
      selectedFill: fills[2] || '#334155',
      chainringFill: fills[2] || fills[0] || '#1e293b',
      outlineColor: styleConfig.outlineColor || '#0f172a',
      textColor: styleConfig.textColor || '#64748b',
      chainOuter: styleConfig.chainOuter || '#cbd5e1',
      chainInner: styleConfig.chainInner || '#94a3b8',
      chainPin: styleConfig.chainPin || '#f8fafc',
      cassetteOpacity: styleConfig.layerOpacity !== undefined ? styleConfig.layerOpacity : 0.35,
      selectedOpacity: styleConfig.selectedOpacity !== undefined ? styleConfig.selectedOpacity : 1,
      flatTopChain: styleConfig.flatTopChain === true
    };
  }

  _renderAnimatedSvg(layout, style, options) {
    const animation = this._buildAnimationConfig(layout, options);
    let svg = this._renderSvgOpen(layout);
    svg += this._renderAnimatedDefs(layout, style, options);
    svg += this._renderAnimatedCassette(layout, style, options, animation);
    svg += this._renderAnimatedChainring(layout, style, options, animation);
    svg += this._renderAnimatedChain(layout.chainPins, animation);
    svg += this._renderLabels(layout, style, options);
    svg += '</svg>';
    return this._minifySvg(svg);
  }

  _buildAnimationConfig(layout, options) {
    const frontRpm = options.animation.rpm;
    const cassetteRpm = frontRpm * options.chainring / options.selectedCog;
    const frontDuration = 60 / frontRpm;
    const cassetteDuration = 60 / cassetteRpm;
    const chainPathLength = this._measureChainTrackLength(layout, options);
    const chainDistancePerFrontRevolution = options.chainring * this.pitch;
    const chainDuration = chainPathLength / (chainDistancePerFrontRevolution * (frontRpm / 60));

    return {
      frontRpm,
      cassetteRpm,
      frontDuration,
      cassetteDuration,
      chainDuration,
      chainPathId: 'drivetrain-chain-path',
      outerLinkId: 'drivetrain-link-outer',
      innerLinkId: 'drivetrain-link-inner',
      pinId: 'drivetrain-chain-pin'
    };
  }

  _renderAnimatedDefs(layout, style, options) {
    let svg = '<defs>';
    svg += `<path id="drivetrain-chain-path" d="${this._buildChainTrackPath(layout)}"/>`;
    svg += this._renderAnimatedLinkDef('drivetrain-link-outer', 'outer', style);
    svg += this._renderAnimatedLinkDef('drivetrain-link-inner', 'inner', style);
    svg += this._renderAnimatedPinDef('drivetrain-chain-pin', style);
    svg += '</defs>';
    return svg;
  }

  _renderAnimatedLinkDef(id, type, style) {
    const isOuter = type === 'outer';
    const radius = this.pitch * (isOuter ? 0.34 : 0.32);
    const waist = this.pitch * (isOuter ? 0.25 : 0.24);
    const fill = isOuter ? style.chainOuter : style.chainInner;
    let svg = `<g id="${id}">`;
    svg += `<path d="${this._getChainPlatePath(radius, waist, style)}" fill="${fill}" stroke="${style.outlineColor}" `;
    svg += 'stroke-width="0.45" stroke-linejoin="round"/>';
    svg += '</g>';
    return svg;
  }

  _renderAnimatedPinDef(id, style) {
    const pinRadius = this.pitch * 0.13;
    let svg = `<circle id="${id}" cx="0" cy="0" r="${pinRadius}" `;
    svg += `fill="${style.chainPin}" stroke="${style.outlineColor}" stroke-width="0.45"/>`;
    return svg;
  }

  _renderAnimatedCassette(layout, style, options, animation) {
    const sortedCogs = [...options.cogs].sort((a, b) => b - a);
    const from = this._radToDeg(layout.rearRotation);
    const to = from + 360;
    let svg = `<g transform="translate(${layout.rearCenter.x} ${layout.rearCenter.y})">`;
    svg += '<g>';
    svg += `<animateTransform attributeName="transform" type="rotate" from="${from}" to="${to}" `;
    svg += `dur="${animation.cassetteDuration}s" repeatCount="indefinite"/>`;

    sortedCogs.forEach((teeth, index) => {
      const isSelected = teeth === options.selectedCog;
      const fill = isSelected
        ? style.selectedFill
        : (index % 2 === 0 ? style.cassetteFill : style.cassetteAltFill);
      const opacity = isSelected ? style.selectedOpacity : style.cassetteOpacity;
      const path = this.geometry.generateSprocketPath(
        teeth,
        Math.min(11, this.geometry.getPitchRadius(teeth) * 0.45)
      );
      svg += `<path d="${path}" fill="${fill}" stroke="${style.outlineColor}" `;
      svg += `stroke-width="0.55" fill-rule="evenodd" opacity="${opacity}"/>`;
    });

    svg += '</g></g>';
    return svg;
  }

  _renderAnimatedChainring(layout, style, options, animation) {
    const innerHoleRadius = Math.max(18, layout.frontRadius - this.pitch * 1.5);
    const path = this.geometry.generateSprocketPath(options.chainring, innerHoleRadius);
    const from = this._radToDeg(layout.frontRotation);
    const to = from + 360;
    let svg = `<g transform="translate(${layout.frontCenter.x} ${layout.frontCenter.y})">`;
    svg += '<g>';
    svg += `<animateTransform attributeName="transform" type="rotate" from="${from}" to="${to}" `;
    svg += `dur="${animation.frontDuration}s" repeatCount="indefinite"/>`;
    svg += `<path d="${path}" fill="${style.chainringFill}" stroke="${style.outlineColor}" `;
    svg += 'stroke-width="0.7" fill-rule="evenodd"/>';
    svg += '</g></g>';
    return svg;
  }

  _renderAnimatedChain(pins, animation) {
    const innerLinks = [];
    const outerLinks = [];
    const pinsSvg = [];

    pins.forEach((point, index) => {
      const next = pins[(index + 1) % pins.length];
      const length = Math.hypot(next.x - point.x, next.y - point.y);

      if (length < this.pitch * 0.35 || length > this.pitch * 1.75) {
        return;
      }

      const linkId = index % 2 === 0 ? animation.outerLinkId : animation.innerLinkId;
      const linkBegin = -(animation.chainDuration * (index + 0.5) / pins.length);
      const pinBegin = -(animation.chainDuration * index / pins.length);
      const linkSvg = this._renderAnimatedUse(linkId, animation, linkBegin, true);
      const pinSvg = this._renderAnimatedUse(animation.pinId, animation, pinBegin, false);

      if (index % 2 === 0) {
        outerLinks.push(linkSvg);
      } else {
        innerLinks.push(linkSvg);
      }
      pinsSvg.push(pinSvg);
    });

    let svg = '<g id="inner-links">';
    svg += innerLinks.join('');
    svg += '</g><g id="outer-links">';
    svg += outerLinks.join('');
    svg += '</g><g id="pins">';
    svg += pinsSvg.join('');
    svg += '</g>';
    return svg;
  }

  _renderAnimatedUse(defId, animation, begin, rotate) {
    let svg = '<g>';
    svg += `<use href="#${defId}"/>`;
    svg += `<animateMotion dur="${animation.chainDuration}s" begin="${begin}s" `;
    svg += `repeatCount="indefinite"${rotate ? ' rotate="auto"' : ''}>`;
    svg += `<mpath href="#${animation.chainPathId}"/>`;
    svg += '</animateMotion>';
    svg += '</g>';
    return svg;
  }

  _buildChainTrackPath(layout) {
    const track = this._buildChainTrackGeometry(layout);

    return [
      `M ${track.rearTop.x} ${track.rearTop.y}`,
      `L ${track.frontTop.x} ${track.frontTop.y}`,
      this._buildArcCommand(layout.frontRadius, track.frontLargeArc, track.frontBottom),
      `L ${track.rearBottom.x} ${track.rearBottom.y}`,
      this._buildArcCommand(layout.rearRadius, track.rearLargeArc, track.rearTop),
      'Z'
    ].join(' ');
  }

  _buildArcCommand(radius, largeArc, end) {
    return `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  _measureChainTrackLength(layout) {
    const track = this._buildChainTrackGeometry(layout);
    const topRun = Math.hypot(track.frontTop.x - track.rearTop.x, track.frontTop.y - track.rearTop.y);
    const bottomRun = Math.hypot(
      track.rearBottom.x - track.frontBottom.x,
      track.rearBottom.y - track.frontBottom.y
    );
    const frontArc = layout.frontRadius * track.frontArcAngle;
    const rearArc = layout.rearRadius * track.rearArcAngle;

    return topRun + frontArc + bottomRun + rearArc;
  }

  _buildChainTrackGeometry(layout) {
    const centerVector = {
      x: layout.frontCenter.x - layout.rearCenter.x,
      y: layout.frontCenter.y - layout.rearCenter.y
    };
    const centerDistance = Math.hypot(centerVector.x, centerVector.y);
    const radiusDelta = layout.rearRadius - layout.frontRadius;
    const normalX = Math.max(-0.999, Math.min(0.999, radiusDelta / centerDistance));
    const normalY = Math.sqrt(Math.max(0, 1 - (normalX ** 2)));
    const topNormal = { x: normalX, y: -normalY };
    const bottomNormal = { x: normalX, y: normalY };
    const rearTop = this._offsetPoint(layout.rearCenter, topNormal, layout.rearRadius);
    const frontTop = this._offsetPoint(layout.frontCenter, topNormal, layout.frontRadius);
    const frontBottom = this._offsetPoint(layout.frontCenter, bottomNormal, layout.frontRadius);
    const rearBottom = this._offsetPoint(layout.rearCenter, bottomNormal, layout.rearRadius);
    const frontArcAngle = this._normalizeCounterclockwiseDelta(
      Math.atan2(frontTop.y - layout.frontCenter.y, frontTop.x - layout.frontCenter.x),
      Math.atan2(frontBottom.y - layout.frontCenter.y, frontBottom.x - layout.frontCenter.x)
    );
    const rearArcAngle = this._normalizeCounterclockwiseDelta(
      Math.atan2(rearBottom.y - layout.rearCenter.y, rearBottom.x - layout.rearCenter.x),
      Math.atan2(rearTop.y - layout.rearCenter.y, rearTop.x - layout.rearCenter.x)
    );

    return {
      rearTop,
      frontTop,
      frontBottom,
      rearBottom,
      frontArcAngle,
      rearArcAngle,
      frontLargeArc: frontArcAngle > Math.PI ? 1 : 0,
      rearLargeArc: rearArcAngle > Math.PI ? 1 : 0
    };
  }

  _offsetPoint(point, unit, distance) {
    return {
      x: point.x + unit.x * distance,
      y: point.y + unit.y * distance
    };
  }

  _renderSvgOpen(layout) {
    const padding = 95;
    const minX = -layout.rearRadius - padding;
    const maxX = layout.effectiveCenterDistance + layout.frontRadius + padding;
    const maxRadius = Math.max(layout.rearRadius, layout.frontRadius);
    const minY = -maxRadius - padding;
    const maxY = maxRadius + padding;

    let svg = '<svg xmlns="http://www.w3.org/2000/svg" ';
    svg += `viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" `;
    svg += `data-effective-chainstay="${layout.effectiveCenterDistance}" `;
    svg += 'width="100%" height="100%">';
    return svg;
  }

  _renderCassette(layout, style, options) {
    const sortedCogs = [...options.cogs].sort((a, b) => b - a);
    let svg = '';

    sortedCogs.forEach((teeth, index) => {
      const isSelected = teeth === options.selectedCog;
      const fill = isSelected
        ? style.selectedFill
        : (index % 2 === 0 ? style.cassetteFill : style.cassetteAltFill);
      const opacity = isSelected ? style.selectedOpacity : style.cassetteOpacity;
      const path = this.geometry.generateSprocketPath(
        teeth,
        Math.min(11, this.geometry.getPitchRadius(teeth) * 0.45)
      );
      svg += `<g transform="translate(${layout.rearCenter.x} ${layout.rearCenter.y}) `;
      svg += `rotate(${this._radToDeg(layout.rearRotation)})">`;
      svg += `<path d="${path}" fill="${fill}" stroke="${style.outlineColor}" `;
      svg += `stroke-width="0.55" fill-rule="evenodd" opacity="${opacity}"/>`;
      svg += '</g>';
    });

    return svg;
  }

  _renderChainring(layout, style, options) {
    const innerHoleRadius = Math.max(18, layout.frontRadius - this.pitch * 1.5);
    const path = this.geometry.generateSprocketPath(options.chainring, innerHoleRadius);
    let svg = `<g transform="translate(${layout.frontCenter.x} ${layout.frontCenter.y}) `;
    svg += `rotate(${this._radToDeg(layout.frontRotation)})">`;
    svg += `<path d="${path}" fill="${style.chainringFill}" stroke="${style.outlineColor}" `;
    svg += 'stroke-width="0.7" fill-rule="evenodd"/>';
    svg += '</g>';
    return svg;
  }

  _renderChain(pins, style) {
    const links = [];
    const innerLinks = [];
    const outerLinks = [];

    for (let i = 0; i < pins.length; i++) {
      const start = pins[i];
      const end = pins[(i + 1) % pins.length];
      const length = Math.hypot(end.x - start.x, end.y - start.y);

      if (length < this.pitch * 0.35 || length > this.pitch * 1.75) {
        continue;
      }

      const type = i % 2 === 0 ? 'outer' : 'inner';
      links.push({ type, svg: this._renderLinkPlate(start, end, type, style) });
    }

    links.forEach((link) => {
      if (link.type === 'outer') {
        outerLinks.push(link.svg);
      } else {
        innerLinks.push(link.svg);
      }
    });

    let svg = `<g>${innerLinks.join('')}</g><g>${outerLinks.join('')}</g><g>`;
    pins.forEach((point) => {
      svg += this._renderPin(point, style);
    });
    svg += '</g>';
    return svg;
  }

  _renderLabels(layout, style, options) {
    if (!options.showText) {
      return '';
    }

    let svg = '';
    svg += this._renderLabel(layout.rearCenter.x, layout.rearRadius + 22, `${options.selectedCog}T`, style);
    svg += this._renderLabel(layout.frontCenter.x, layout.frontRadius + 24, `${options.chainring}T`, style);
    return svg;
  }

  _renderLinkPlate(start, end, type, style) {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const angle = this._radToDeg(Math.atan2(end.y - start.y, end.x - start.x));
    const isOuter = type === 'outer';
    const radius = this.pitch * (isOuter ? 0.34 : 0.32);
    const waist = this.pitch * (isOuter ? 0.25 : 0.24);
    const fill = isOuter ? style.chainOuter : style.chainInner;
    const path = this._getChainPlatePath(radius, waist, style);

    let svg = `<g transform="translate(${centerX} ${centerY}) rotate(${angle})">`;
    svg += `<path d="${path}" fill="${fill}" stroke="${style.outlineColor}" `;
    svg += 'stroke-width="0.45" stroke-linejoin="round"/>';
    svg += '</g>';
    return svg;
  }

  _renderPin(point, style) {
    const pinRadius = this.pitch * 0.13;
    let svg = `<circle cx="${point.x}" cy="${point.y}" r="${pinRadius}" `;
    svg += `fill="${style.chainPin}" stroke="${style.outlineColor}" stroke-width="0.45"/>`;
    return svg;
  }

  _getPlatePath(radius, waist) {
    const halfPitch = this.pitch / 2;
    return [
      `M ${-halfPitch} ${-radius}`,
      `C ${-this.pitch / 3} ${-radius}, ${-this.pitch / 6} ${-waist}, 0 ${-waist}`,
      `C ${this.pitch / 6} ${-waist}, ${this.pitch / 3} ${-radius}, ${halfPitch} ${-radius}`,
      `A ${radius} ${radius} 0 0 1 ${halfPitch} ${radius}`,
      `C ${this.pitch / 3} ${radius}, ${this.pitch / 6} ${waist}, 0 ${waist}`,
      `C ${-this.pitch / 6} ${waist}, ${-this.pitch / 3} ${radius}, ${-halfPitch} ${radius}`,
      `A ${radius} ${radius} 0 0 1 ${-halfPitch} ${-radius}`,
      'Z'
    ].join(' ');
  }

  _getFlatTopPlatePath(radius, waist) {
    const halfPitch = this.pitch / 2;
    return [
      `M ${-halfPitch} ${-radius}`,
      `L ${halfPitch} ${-radius}`,
      `A ${radius} ${radius} 0 0 1 ${halfPitch} ${radius}`,
      `C ${this.pitch / 3} ${radius}, ${this.pitch / 6} ${waist}, 0 ${waist}`,
      `C ${-this.pitch / 6} ${waist}, ${-this.pitch / 3} ${radius}, ${-halfPitch} ${radius}`,
      `A ${radius} ${radius} 0 0 1 ${-halfPitch} ${-radius}`,
      'Z'
    ].join(' ');
  }

  _getChainPlatePath(radius, waist, style) {
    return style.flatTopChain
      ? this._getFlatTopPlatePath(radius, waist)
      : this._getPlatePath(radius, waist);
  }

  _normalizeCounterclockwiseDelta(startAngle, endAngle) {
    let delta = endAngle - startAngle;
    while (delta < 0) delta += 2 * Math.PI;
    while (delta >= 2 * Math.PI) delta -= 2 * Math.PI;
    return delta;
  }

  _pointOnCircle(center, radius, angle) {
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    };
  }

  _renderLabel(x, y, label, style) {
    let svg = `<text x="${x}" y="${y}" font-size="12" fill="${style.textColor}" `;
    svg += 'font-family="monospace" font-weight="bold" text-anchor="middle" ';
    svg += `dominant-baseline="central">${label}</text>`;
    return svg;
  }

  _radToDeg(angle) {
    return angle * 180 / Math.PI;
  }

  _formatNumber(value) {
    const multiplier = 10 ** this.coordinatePrecision;
    const rounded = Math.round(Number.parseFloat(value) * multiplier) / multiplier;
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }

  _minifySvg(svg) {
    return svg
      .replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value))
      .replace(/\s\/>/g, '/>')
      .replace(/>\s+</g, '><');
  }
}
