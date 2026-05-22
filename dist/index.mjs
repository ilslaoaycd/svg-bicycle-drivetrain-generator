// src/sprocketGeometry.js
var SprocketGeometry = class {
  constructor(pitch = 10) {
    this.pitch = pitch;
  }
  p2c(radius, angle) {
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }
  getPitchRadius(teeth) {
    return this.pitch / (2 * Math.sin(Math.PI / teeth));
  }
  getOuterRadius(teeth) {
    return this.getPitchRadius(teeth) + this.pitch * 0.075;
  }
  getToothAngle(teeth) {
    return 2 * Math.PI / teeth;
  }
  getValleyAngle(teeth, index, rotation = 0) {
    return rotation + (index + 0.5) * this.getToothAngle(teeth);
  }
  getValleyCenter(teeth, index, rotation = 0, center = { x: 0, y: 0 }) {
    const radius = this.getPitchRadius(teeth);
    const angle = this.getValleyAngle(teeth, index, rotation);
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
      angle,
      index: this.normalizeIndex(index, teeth)
    };
  }
  getValleyCenters(teeth, rotation = 0, center = { x: 0, y: 0 }) {
    return Array.from({ length: teeth }, (_, index) => {
      return this.getValleyCenter(teeth, index, rotation, center);
    });
  }
  normalizeIndex(index, teeth) {
    return (index % teeth + teeth) % teeth;
  }
  getIndexForAngle(teeth, worldAngle, rotation = 0) {
    const toothAngle = this.getToothAngle(teeth);
    return this.normalizeIndex(Math.round((worldAngle - rotation) / toothAngle - 0.5), teeth);
  }
  generateSprocketPath(teeth, innerHoleRadius) {
    const rollerRadius = this.pitch * 0.3125;
    const pitchRadius = this.getPitchRadius(teeth);
    const outerRadius = this.getOuterRadius(teeth);
    const toothAngle = this.getToothAngle(teeth);
    const phi = 50 * (Math.PI / 180);
    const flatTopWidth = this.pitch * 0.4;
    const delta = flatTopWidth / 2 / outerRadius;
    let path = "";
    for (let i = 0; i < teeth; i++) {
      const toothCenterAngle = i * toothAngle;
      const previousValleyAngle = (i - 0.5) * toothAngle;
      const currentValleyAngle = (i + 0.5) * toothAngle;
      const previousValley = this.p2c(pitchRadius, previousValleyAngle);
      const currentValley = this.p2c(pitchRadius, currentValleyAngle);
      const p1x = previousValley.x + rollerRadius * Math.cos(previousValleyAngle + Math.PI - phi);
      const p1y = previousValley.y + rollerRadius * Math.sin(previousValleyAngle + Math.PI - phi);
      const p2x = outerRadius * Math.cos(toothCenterAngle - delta);
      const p2y = outerRadius * Math.sin(toothCenterAngle - delta);
      const p3x = outerRadius * Math.cos(toothCenterAngle + delta);
      const p3y = outerRadius * Math.sin(toothCenterAngle + delta);
      const p4x = currentValley.x + rollerRadius * Math.cos(currentValleyAngle + Math.PI + phi);
      const p4y = currentValley.y + rollerRadius * Math.sin(currentValleyAngle + Math.PI + phi);
      const nextP1x = currentValley.x + rollerRadius * Math.cos(currentValleyAngle + Math.PI - phi);
      const nextP1y = currentValley.y + rollerRadius * Math.sin(currentValleyAngle + Math.PI - phi);
      if (i === 0) {
        path += `M ${p1x} ${p1y} `;
      }
      path += `L ${p2x} ${p2y} `;
      path += `A ${outerRadius} ${outerRadius} 0 0 1 ${p3x} ${p3y} `;
      path += `L ${p4x} ${p4y} `;
      path += `A ${rollerRadius} ${rollerRadius} 0 0 0 ${nextP1x} ${nextP1y} `;
    }
    path += "Z ";
    const segments = 48;
    for (let i = segments; i >= 0; i--) {
      const point = this.p2c(innerHoleRadius, i / segments * (2 * Math.PI));
      path += i === segments ? `M ${point.x} ${point.y} ` : `L ${point.x} ${point.y} `;
    }
    path += "Z";
    return path;
  }
};

// src/cassetteSvgGenerator.js
var CassetteSVGGenerator = class {
  constructor(pitch = 10) {
    this.pitch = pitch;
    this.geometry = new SprocketGeometry(pitch);
    this.coordinatePrecision = 3;
  }
  _p2c(radius, angle) {
    return this.geometry.p2c(radius, angle);
  }
  _getPitchRadius(teeth) {
    return this.geometry.getPitchRadius(teeth);
  }
  _getOuterRadius(teeth) {
    return this.geometry.getOuterRadius(teeth);
  }
  _generateCogPath(teeth) {
    return this.geometry.generateSprocketPath(teeth, 9.5);
  }
  _generateLockringPath() {
    const outerRadius = 11.8;
    const notchRadius = 9.4;
    const innerRadius = 8.1;
    const notches = 12;
    const notchHalfWidth = 1;
    let path = "";
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * (2 * Math.PI);
      const pt = this._p2c(outerRadius, angle);
      if (i === 0) {
        path += `M ${pt.x} ${pt.y} `;
      } else {
        path += `L ${pt.x} ${pt.y} `;
      }
    }
    path += "Z ";
    for (let i = notches - 1; i >= 0; i--) {
      const theta = i * (Math.PI / 6);
      const u = { x: Math.cos(theta), y: Math.sin(theta) };
      const v = { x: -Math.sin(theta), y: Math.cos(theta) };
      const enterInner = {
        x: innerRadius * u.x + notchHalfWidth * v.x,
        y: innerRadius * u.y + notchHalfWidth * v.y
      };
      const enterNotch = {
        x: notchRadius * u.x + notchHalfWidth * v.x,
        y: notchRadius * u.y + notchHalfWidth * v.y
      };
      const exitNotch = {
        x: notchRadius * u.x - notchHalfWidth * v.x,
        y: notchRadius * u.y - notchHalfWidth * v.y
      };
      const exitInner = {
        x: innerRadius * u.x - notchHalfWidth * v.x,
        y: innerRadius * u.y - notchHalfWidth * v.y
      };
      if (i === notches - 1) {
        path += `M ${enterInner.x} ${enterInner.y} `;
      } else {
        path += `A ${innerRadius} ${innerRadius} 0 0 0 ${enterInner.x} ${enterInner.y} `;
      }
      path += `L ${enterNotch.x} ${enterNotch.y} `;
      path += `A ${notchRadius} ${notchRadius} 0 0 0 ${exitNotch.x} ${exitNotch.y} `;
      path += `L ${exitInner.x} ${exitInner.y} `;
    }
    const startTheta = (notches - 1) * (Math.PI / 6);
    const startU = { x: Math.cos(startTheta), y: Math.sin(startTheta) };
    const startV = { x: -Math.sin(startTheta), y: Math.cos(startTheta) };
    const startPt = {
      x: innerRadius * startU.x + notchHalfWidth * startV.x,
      y: innerRadius * startU.y + notchHalfWidth * startV.y
    };
    path += `A ${innerRadius} ${innerRadius} 0 0 0 ${startPt.x} ${startPt.y} Z`;
    return path;
  }
  _resolveColor(index, styleConfig) {
    if (!styleConfig || !styleConfig.fillColors || styleConfig.fillColors.length === 0) {
      const defaults = ["#e2e8f0", "#cbd5e1"];
      return index === 0 ? "#334155" : defaults[index % 2];
    }
    const fills = styleConfig.fillColors;
    if (fills.length === 1) return fills[0];
    if (fills.length === 2) return fills[index % 2];
    if (index === 0) return fills[2];
    return fills[(index - 1) % 2];
  }
  _resolveOutline(index, styleConfig) {
    if (styleConfig && styleConfig.outlineColor) return styleConfig.outlineColor;
    return index === 0 ? "#1e293b" : "#94a3b8";
  }
  _resolveOpacity(index, styleConfig) {
    if (styleConfig && styleConfig.layerOpacities && styleConfig.layerOpacities[index] !== void 0) {
      return styleConfig.layerOpacities[index];
    }
    if (styleConfig && styleConfig.layerOpacity !== void 0) {
      return index === 0 && styleConfig.selectedOpacity !== void 0 ? styleConfig.selectedOpacity : styleConfig.layerOpacity;
    }
    return 1;
  }
  _formatNumber(value) {
    const multiplier = 10 ** this.coordinatePrecision;
    const rounded = Math.round(Number.parseFloat(value) * multiplier) / multiplier;
    return Object.is(rounded, -0) ? "0" : String(rounded);
  }
  _minifySvg(svg) {
    return svg.replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value)).replace(/\sclass="[^"]*"/g, "").replace(/\s\/>/g, "/>").replace(/>\s+</g, "><");
  }
  _minifyFragment(svg) {
    return svg.replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value)).replace(/\s\/>/g, "/>").replace(/>\s+</g, "><");
  }
  calculateStack(teethArray, options = {}) {
    const sortedTeeth = [...teethArray].sort((a, b) => b - a);
    const cogWidth = options.cogWidth ?? 1.2;
    const cogPitch = options.cogPitch ?? 3;
    const stackWidth = sortedTeeth.length === 0 ? 0 : (sortedTeeth.length - 1) * cogPitch + cogWidth;
    const lockringWidth = options.lockringWidth ?? 1;
    return {
      sortedCogs: sortedTeeth,
      cogWidth,
      cogPitch,
      stackWidth,
      lockringX: stackWidth + 0.2,
      lockringWidth,
      largestRadius: sortedTeeth.length ? this._getOuterRadius(sortedTeeth[0]) : 0,
      smallestRadius: sortedTeeth.length ? this._getOuterRadius(sortedTeeth[sortedTeeth.length - 1]) : 0,
      cogs: sortedTeeth.map((teeth, index) => ({
        teeth,
        index,
        x: index * cogPitch,
        centerX: index * cogPitch + cogWidth / 2,
        width: cogWidth,
        pitchRadius: this._getPitchRadius(teeth),
        outerRadius: this._getOuterRadius(teeth)
      }))
    };
  }
  renderFrontGroup(teethArray, styleConfig = {}) {
    const sortedTeeth = [...teethArray].sort((a, b) => b - a);
    if (sortedTeeth.length === 0) return "";
    const showText = styleConfig.showText !== false;
    const textColor = styleConfig.textColor || null;
    const textAngles = new Array(sortedTeeth.length);
    const smallestTeeth = sortedTeeth[sortedTeeth.length - 1];
    const firstStep = 2 * Math.PI / smallestTeeth;
    let prevAngle = Math.round(-Math.PI / 2 / firstStep) * firstStep;
    textAngles[sortedTeeth.length - 1] = prevAngle;
    const minGap = 2 * (Math.PI / 180);
    for (let i = sortedTeeth.length - 2; i >= 0; i--) {
      const teeth = sortedTeeth[i];
      const step = 2 * Math.PI / teeth;
      let nextToothIndex = Math.floor(prevAngle / step) + 1;
      let exactAngle = nextToothIndex * step;
      while (exactAngle <= prevAngle + minGap) {
        nextToothIndex++;
        exactAngle = nextToothIndex * step;
      }
      textAngles[i] = exactAngle;
      prevAngle = exactAngle;
    }
    let svg = '<g class="cassette-front-group">';
    sortedTeeth.forEach((teeth, index) => {
      const fill = this._resolveColor(index, styleConfig);
      const stroke = this._resolveOutline(index, styleConfig);
      const opacity = this._resolveOpacity(index, styleConfig);
      let computedTextColor = textColor;
      if (!computedTextColor) {
        const isDefaultLargestCog = index === 0 && (!styleConfig.fillColors || styleConfig.fillColors.length === 0);
        computedTextColor = isDefaultLargestCog ? "#94a3b8" : "#64748b";
      }
      svg += '<g class="cog-layer">';
      svg += `<path d="${this._generateCogPath(teeth)}" fill="${fill}" stroke="${stroke}" `;
      svg += `stroke-width="0.5" fill-rule="evenodd" opacity="${opacity}"/>`;
      if (showText) {
        const textRadius = this._getOuterRadius(teeth) - this.pitch * 0.19;
        const exactAngle = textAngles[index];
        const textX = textRadius * Math.cos(exactAngle);
        const textY = textRadius * Math.sin(exactAngle);
        let textRotation = exactAngle * 180 / Math.PI + 90;
        const normalizedAngle = (exactAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        if (normalizedAngle > Math.PI / 3 && normalizedAngle < 4 * Math.PI / 3) textRotation += 180;
        const styleStr = !textColor ? "mix-blend-mode: difference; fill: white;" : `fill: ${computedTextColor};`;
        svg += `<text x="${textX}" y="${textY}" font-size="2.4" `;
        svg += 'font-family="monospace" font-weight="bold" text-anchor="middle" ';
        svg += 'dominant-baseline="central" opacity="0.9" ';
        svg += `style="pointer-events: none; user-select: none; ${styleStr}" `;
        svg += `transform="rotate(${textRotation}, ${textX}, ${textY})">${teeth}T</text>`;
      }
      svg += "</g>";
    });
    svg += '<g class="lockring-group">';
    svg += `<path d="${this._generateLockringPath()}" fill="#111827" stroke="#374151" `;
    svg += 'stroke-width="0.5" fill-rule="evenodd"/>';
    svg += "</g></g>";
    return this._minifyFragment(svg);
  }
  renderSideGroup(teethArray, direction = "ltr", styleConfig = {}) {
    const stack = this.calculateStack(teethArray, styleConfig);
    if (stack.sortedCogs.length === 0) return "";
    const displayCogs = direction === "ltr" ? stack.cogs : [...stack.cogs].reverse();
    const maxRadius = stack.largestRadius;
    const freehubRadius = styleConfig.freehubRadius ?? 9.5;
    const showText = styleConfig.showText !== false;
    const textColor = styleConfig.textColor || "#64748b";
    let svg = '<g class="cassette-side-group">';
    svg += `<rect x="-1" y="-${freehubRadius}" width="${stack.stackWidth + 2}" `;
    svg += `height="${freehubRadius * 2}" fill="#475569" rx="0.5"/>`;
    displayCogs.forEach((cog, displayIndex) => {
      const trueIndex = stack.sortedCogs.indexOf(cog.teeth);
      const xOffset = direction === "ltr" ? cog.x : displayIndex * stack.cogPitch;
      const fill = this._resolveColor(trueIndex, styleConfig);
      const stroke = this._resolveOutline(trueIndex, styleConfig);
      svg += '<g class="cassette-cog-side">';
      svg += `<rect x="${xOffset}" y="-${cog.outerRadius}" width="${stack.cogWidth}" height="${cog.outerRadius * 2}" `;
      svg += `fill="${fill}" stroke="${stroke}" stroke-width="0.3" rx="0.2"/>`;
      if (showText) {
        const tx = xOffset + stack.cogWidth / 2;
        const ty = Math.min(maxRadius + 4, cog.outerRadius + 4);
        svg += `<text x="${tx}" y="${ty}" font-size="2.5" fill="${textColor}" `;
        svg += 'font-family="monospace" text-anchor="middle" font-weight="bold" ';
        svg += 'style="pointer-events: none; user-select: none;" ';
        svg += `transform="rotate(90 ${tx} ${ty})">${cog.teeth}T</text>`;
      }
      svg += "</g>";
    });
    const lockringX = direction === "ltr" ? stack.lockringX : -1.2;
    svg += `<rect class="cassette-lockring-side" x="${lockringX}" y="-11.8" width="${stack.lockringWidth}" height="23.6" fill="#111827" rx="0.2"/>`;
    svg += "</g>";
    return this._minifyFragment(svg);
  }
  renderFront(teethArray, styleConfig = {}) {
    const sortedTeeth = [...teethArray].sort((a, b) => b - a);
    if (sortedTeeth.length === 0) return "";
    const maxRadius = this._getOuterRadius(sortedTeeth[0]);
    const viewSize = Math.ceil(maxRadius + this.pitch);
    const showText = styleConfig.showText !== false;
    const textColor = styleConfig.textColor || null;
    const textAngles = new Array(sortedTeeth.length);
    const smallestTeeth = sortedTeeth[sortedTeeth.length - 1];
    const firstStep = 2 * Math.PI / smallestTeeth;
    let prevAngle = Math.round(-Math.PI / 2 / firstStep) * firstStep;
    textAngles[sortedTeeth.length - 1] = prevAngle;
    const minGap = 2 * (Math.PI / 180);
    for (let i = sortedTeeth.length - 2; i >= 0; i--) {
      const teeth = sortedTeeth[i];
      const step = 2 * Math.PI / teeth;
      let nextToothIndex = Math.floor(prevAngle / step) + 1;
      let exactAngle = nextToothIndex * step;
      while (exactAngle <= prevAngle + minGap) {
        nextToothIndex++;
        exactAngle = nextToothIndex * step;
      }
      textAngles[i] = exactAngle;
      prevAngle = exactAngle;
    }
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" ';
    svg += `viewBox="-${viewSize} -${viewSize} ${viewSize * 2} ${viewSize * 2}" `;
    svg += 'style="width: 100%; height: 100%; max-height: 400px; display: block;">';
    sortedTeeth.forEach((teeth, index) => {
      const fill = this._resolveColor(index, styleConfig);
      const stroke = this._resolveOutline(index, styleConfig);
      const opacity = this._resolveOpacity(index, styleConfig);
      let computedTextColor = textColor;
      if (!computedTextColor) {
        const isDefaultLargestCog = index === 0 && (!styleConfig.fillColors || styleConfig.fillColors.length === 0);
        computedTextColor = isDefaultLargestCog ? "#94a3b8" : "#64748b";
      }
      const pathD = this._generateCogPath(teeth);
      svg += '<g class="cog-layer">';
      svg += `<path d="${pathD}" fill="${fill}" stroke="${stroke}" `;
      svg += `stroke-width="0.5" fill-rule="evenodd" opacity="${opacity}" />`;
      if (showText) {
        const textRadius = this._getOuterRadius(teeth) - this.pitch * 0.19;
        const exactAngle = textAngles[index];
        const textX = textRadius * Math.cos(exactAngle);
        const textY = textRadius * Math.sin(exactAngle);
        let textRotation = exactAngle * 180 / Math.PI + 90;
        const normalizedAngle = (exactAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        if (normalizedAngle > Math.PI / 3 && normalizedAngle < 4 * Math.PI / 3) {
          textRotation += 180;
        }
        const styleStr = !textColor ? "mix-blend-mode: difference; fill: white;" : `fill: ${computedTextColor};`;
        svg += `<text x="${textX}" y="${textY}" font-size="2.4" `;
        svg += 'font-family="monospace" font-weight="bold" text-anchor="middle" ';
        svg += 'dominant-baseline="central" opacity="0.9" ';
        svg += `style="pointer-events: none; user-select: none; ${styleStr}" `;
        svg += `transform="rotate(${textRotation}, ${textX}, ${textY})">${teeth}T</text>`;
      }
      svg += "</g>";
    });
    const lockringD = this._generateLockringPath();
    svg += '<g class="lockring-group">';
    svg += `<path d="${lockringD}" fill="#111827" stroke="#374151" `;
    svg += 'stroke-width="0.5" fill-rule="evenodd" />';
    if (showText) {
      svg += '<text x="0" y="-10.6" dominant-baseline="central" font-size="1.1" ';
      svg += 'fill="#d1d5db" text-anchor="middle" font-weight="bold" ';
      svg += 'font-family="sans-serif" style="pointer-events: none;">LOCK</text>';
      svg += '<text x="0" y="10.6" dominant-baseline="central" font-size="0.9" ';
      svg += 'fill="#9ca3af" text-anchor="middle" font-family="sans-serif" ';
      svg += 'style="pointer-events: none;">40 N.m</text>';
    }
    svg += "</g></svg>";
    return this._minifySvg(svg);
  }
  renderSide(teethArray, direction = "ltr", styleConfig = {}) {
    const sortedTeeth = [...teethArray].sort((a, b) => b - a);
    if (sortedTeeth.length === 0) return "";
    const displayTeeth = direction === "ltr" ? sortedTeeth : [...sortedTeeth].reverse();
    const cogWidth = 1.2;
    const stepWidth = 3;
    const totalWidth = displayTeeth.length * stepWidth;
    const maxRadius = this._getOuterRadius(sortedTeeth[0]);
    const viewHeight = Math.ceil(maxRadius + this.pitch);
    const freehubRadius = 9.5;
    const showText = styleConfig.showText !== false;
    const textColor = styleConfig.textColor || "#64748b";
    let carrierPath = "M 0 0 ";
    displayTeeth.forEach((teeth, i) => {
      const r = this._getPitchRadius(teeth) - 2;
      const x = i * stepWidth + cogWidth / 2;
      carrierPath += `L ${x} ${-r} `;
    });
    carrierPath += `L ${(displayTeeth.length - 1) * stepWidth} 0 Z`;
    let carrierPathBottom = "M 0 0 ";
    displayTeeth.forEach((teeth, i) => {
      const r = this._getPitchRadius(teeth) - 2;
      const x = i * stepWidth + cogWidth / 2;
      carrierPathBottom += `L ${x} ${r} `;
    });
    carrierPathBottom += `L ${(displayTeeth.length - 1) * stepWidth} 0 Z`;
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" ';
    svg += `viewBox="-10 -${viewHeight} ${totalWidth + 20} ${viewHeight * 2}" `;
    svg += 'style="width: 100%; height: 100%; max-height: 300px; display: block;">';
    svg += `<path d="${carrierPath}" fill="#cbd5e1" opacity="0.6" />`;
    svg += `<path d="${carrierPathBottom}" fill="#cbd5e1" opacity="0.6" />`;
    svg += `<rect x="-1" y="-${freehubRadius}" width="${totalWidth + 2}" `;
    svg += `height="${freehubRadius * 2}" fill="#475569" rx="0.5" />`;
    displayTeeth.forEach((teeth, index) => {
      const trueIndex = sortedTeeth.indexOf(teeth);
      const r = this._getOuterRadius(teeth);
      const height = r * 2;
      const xOffset = index * stepWidth;
      const fill = this._resolveColor(trueIndex, styleConfig);
      const stroke = this._resolveOutline(trueIndex, styleConfig);
      svg += "<g>";
      svg += `<rect x="${xOffset}" y="-${r}" width="${cogWidth}" height="${height}" `;
      svg += `fill="${fill}" stroke="${stroke}" stroke-width="0.3" rx="0.2" />`;
      if (showText) {
        const tx = xOffset + cogWidth / 2;
        const ty = r + 4;
        svg += `<text x="${tx}" y="${ty}" font-size="2.5" fill="${textColor}" `;
        svg += 'font-family="monospace" text-anchor="middle" font-weight="bold" ';
        svg += 'style="pointer-events: none; user-select: none;" ';
        svg += `transform="rotate(90 ${tx} ${ty})">${teeth}T</text>`;
      }
      svg += "</g>";
    });
    const lockringX = direction === "ltr" ? totalWidth - stepWidth + cogWidth + 0.2 : -0.2 - 1;
    svg += `<rect x="${lockringX}" y="-11.8" width="1" height="23.6" fill="#111827" rx="0.2" />`;
    svg += "</svg>";
    return this._minifySvg(svg);
  }
};

// src/chainringSvgGenerator.js
var ChainringSVGGenerator = class {
  constructor(pitch = 10) {
    this.pitch = pitch;
    this.geometry = new SprocketGeometry(pitch);
    this.coordinatePrecision = 3;
  }
  _p2c(radius, angle) {
    return this.geometry.p2c(radius, angle);
  }
  _getPitchRadius(teeth) {
    return this.geometry.getPitchRadius(teeth);
  }
  _getOuterRadius(teeth) {
    return this.geometry.getOuterRadius(teeth);
  }
  _generateChainringPath(teeth) {
    const innerHoleRadius = Math.max(15, this._getPitchRadius(teeth) - this.pitch * 1.5);
    return this.geometry.generateSprocketPath(teeth, innerHoleRadius);
  }
  _formatNumber(value) {
    const multiplier = 10 ** this.coordinatePrecision;
    const rounded = Math.round(Number.parseFloat(value) * multiplier) / multiplier;
    return Object.is(rounded, -0) ? "0" : String(rounded);
  }
  _minifySvg(svg) {
    return svg.replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value)).replace(/\s\/>/g, "/>").replace(/>\s+</g, "><");
  }
  render(teeth, styleConfig = {}) {
    const maxRadius = this._getOuterRadius(teeth);
    const viewSize = Math.ceil(maxRadius + this.pitch);
    const showText = styleConfig.showText !== false;
    const fill = styleConfig.fillColor || "#1e293b";
    const stroke = styleConfig.outlineColor || "#0f172a";
    const textColor = styleConfig.textColor || "#94a3b8";
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" ';
    svg += `viewBox="-${viewSize} -${viewSize} ${viewSize * 2} ${viewSize * 2}" `;
    svg += 'style="width: 100%; height: 100%; display: block;">';
    const pathD = this._generateChainringPath(teeth);
    svg += `<g><path d="${pathD}" fill="${fill}" stroke="${stroke}" `;
    svg += 'stroke-width="0.5" fill-rule="evenodd"/>';
    if (showText) {
      const textRadius = this._getOuterRadius(teeth) - this.pitch * 0.17;
      const step = 2 * Math.PI / teeth;
      const exactAngle = Math.round(-Math.PI / 2 / step) * step;
      const textX = textRadius * Math.cos(exactAngle);
      const textY = textRadius * Math.sin(exactAngle);
      const textRotation = exactAngle * 180 / Math.PI + 90;
      svg += `<text x="${textX}" y="${textY}" font-size="2.4" `;
      svg += 'font-family="monospace" font-weight="bold" text-anchor="middle" ';
      svg += `dominant-baseline="central" fill="${textColor}" opacity="0.9" `;
      svg += 'style="pointer-events: none; user-select: none;" ';
      svg += `transform="rotate(${textRotation}, ${textX}, ${textY})">${teeth}T</text>`;
    }
    svg += "</g></svg>";
    return this._minifySvg(svg);
  }
};

// src/chainSvgGenerator.js
var ChainSVGGenerator = class {
  constructor(config = {}) {
    this.coordinatePrecision = 3;
    this.config = {
      pitch: 100,
      outerRadius: 34,
      outerWaist: 25,
      innerRadius: 32,
      innerWaist: 24,
      rollerRadius: 30,
      pinRadius: 14,
      outerColor: "#cbd5e1",
      innerColor: "#94a3b8",
      pinColor: "#f8fafc",
      rollerColor: "#e2e8f0",
      rollerHoleColor: "#0f172a",
      strokeColor: "#0f172a",
      strokeWidth: 3,
      showPins: true,
      showRollers: false,
      flatTop: false,
      ...config
    };
  }
  getFlatTopPlatePath(radius, waist) {
    const halfPitch = this.config.pitch / 2;
    return [
      `M ${-halfPitch} ${-radius}`,
      `L ${halfPitch} ${-radius}`,
      `A ${radius} ${radius} 0 0 1 ${halfPitch} ${radius}`,
      `C ${this.config.pitch / 3} ${radius}, ${this.config.pitch / 6} ${waist}, 0 ${waist}`,
      `C ${-this.config.pitch / 6} ${waist}, ${-this.config.pitch / 3} ${radius}, ${-halfPitch} ${radius}`,
      `A ${radius} ${radius} 0 0 1 ${-halfPitch} ${-radius}`,
      "Z"
    ].join(" ");
  }
  getPlatePath(radius, waist) {
    const p = this.config.pitch;
    return [
      `M ${-p / 2} ${-radius}`,
      `C ${-p / 3} ${-radius}, ${-p / 6} ${-waist}, 0 ${-waist}`,
      `C ${p / 6} ${-waist}, ${p / 3} ${-radius}, ${p / 2} ${-radius}`,
      `A ${radius} ${radius} 0 0 1 ${p / 2} ${radius}`,
      `C ${p / 3} ${radius}, ${p / 6} ${waist}, 0 ${waist}`,
      `C ${-p / 6} ${waist}, ${-p / 3} ${radius}, ${-p / 2} ${radius}`,
      `A ${radius} ${radius} 0 0 1 ${-p / 2} ${-radius}`,
      "Z"
    ].join(" ");
  }
  getLinkPlatePath(radius, waist) {
    return this.config.flatTop ? this.getFlatTopPlatePath(radius, waist) : this.getPlatePath(radius, waist);
  }
  getInnerLinkSVG(x, y, angleDeg) {
    const {
      innerRadius,
      innerWaist,
      rollerRadius,
      innerColor,
      rollerColor,
      rollerHoleColor,
      strokeColor,
      strokeWidth
    } = this.config;
    const p = this.config.pitch;
    const path = this.getLinkPlatePath(innerRadius, innerWaist);
    let svg = `<g transform="translate(${x}, ${y}) rotate(${angleDeg})">`;
    svg += `<path d="${path}" fill="${innerColor}" stroke="${strokeColor}" `;
    svg += `stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
    if (this.config.showRollers) {
      svg += `<circle cx="${-p / 2}" cy="0" r="${rollerRadius}" `;
      svg += `fill="${rollerColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      svg += `<circle cx="${p / 2}" cy="0" r="${rollerRadius}" `;
      svg += `fill="${rollerColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      svg += `<circle cx="${-p / 2}" cy="0" r="${rollerRadius * 0.4}" fill="${rollerHoleColor}"/>`;
      svg += `<circle cx="${p / 2}" cy="0" r="${rollerRadius * 0.4}" fill="${rollerHoleColor}"/>`;
    }
    svg += "</g>";
    return svg;
  }
  getOuterLinkSVG(x, y, angleDeg) {
    const { outerRadius, outerWaist, outerColor, strokeColor, strokeWidth } = this.config;
    const path = this.getLinkPlatePath(outerRadius, outerWaist);
    let svg = `<g transform="translate(${x}, ${y}) rotate(${angleDeg})">`;
    svg += `<path d="${path}" fill="${outerColor}" stroke="${strokeColor}" `;
    svg += `stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
    svg += "</g>";
    return svg;
  }
  generateAngles(type, linkCount) {
    const angles = [];
    let currentAngle = 0;
    for (let i = 0; i < linkCount; i++) {
      if (type === "straight") {
        currentAngle = 0;
      } else if (type === "curve") {
        currentAngle += 5;
      } else if (type === "wave") {
        currentAngle = Math.sin(i * 0.4) * 45;
      } else if (type === "wrap") {
        if (i > Math.floor(linkCount * 0.2) && i < Math.floor(linkCount * 0.8)) {
          currentAngle += 15;
        }
      } else if (type === "loop") {
        currentAngle += 360 / linkCount;
      }
      angles.push(currentAngle);
    }
    return angles;
  }
  generateStrandSVG(linkAngles, startX = 0, startY = 0, startWithOuter = true) {
    let currentPivotX = startX;
    let currentPivotY = startY;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const innerLinks = [];
    const outerLinks = [];
    const pivotPoints = [{ x: currentPivotX, y: currentPivotY }];
    const updateBounds = (x, y) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };
    for (let i = 0; i < linkAngles.length; i++) {
      const angleDeg = linkAngles[i];
      const angleRad = angleDeg * Math.PI / 180;
      const centerX = currentPivotX + this.config.pitch / 2 * Math.cos(angleRad);
      const centerY = currentPivotY + this.config.pitch / 2 * Math.sin(angleRad);
      const isOuter = startWithOuter ? i % 2 === 0 : i % 2 !== 0;
      updateBounds(currentPivotX, currentPivotY);
      updateBounds(centerX, centerY);
      if (isOuter) {
        outerLinks.push(this.getOuterLinkSVG(centerX, centerY, angleDeg));
      } else {
        innerLinks.push(this.getInnerLinkSVG(centerX, centerY, angleDeg));
      }
      currentPivotX += this.config.pitch * Math.cos(angleRad);
      currentPivotY += this.config.pitch * Math.sin(angleRad);
      updateBounds(currentPivotX, currentPivotY);
      pivotPoints.push({ x: currentPivotX, y: currentPivotY });
    }
    const padding = this.config.outerRadius * 2;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" ';
    svg += `viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" `;
    svg += 'width="100%" height="100%"><g>';
    svg += `<g>${innerLinks.join("")}</g><g>${outerLinks.join("")}</g>`;
    svg += this.getPinsSVG(pivotPoints);
    svg += "</g></svg>";
    return this._minifySvg(svg);
  }
  getPinsSVG(pivotPoints) {
    if (!this.config.showPins) {
      return "";
    }
    const { pinRadius, pinColor, strokeColor, strokeWidth } = this.config;
    const pins = pivotPoints.map((point) => {
      let svg = `<circle cx="${point.x}" cy="${point.y}" r="${pinRadius}" `;
      svg += `fill="${pinColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      return svg;
    });
    return `<g>${pins.join("")}</g>`;
  }
  render(linkCount, pathType = "straight", options = {}) {
    const startWithOuter = options.startLink !== "inner";
    return this.generateStrandSVG(this.generateAngles(pathType, linkCount), 0, 0, startWithOuter);
  }
  _formatNumber(value) {
    const multiplier = 10 ** this.coordinatePrecision;
    const rounded = Math.round(Number.parseFloat(value) * multiplier) / multiplier;
    return Object.is(rounded, -0) ? "0" : String(rounded);
  }
  _minifySvg(svg) {
    return svg.replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value)).replace(/\s\/>/g, "/>").replace(/>\s+</g, "><");
  }
};

// src/drivetrainSvgGenerator.js
var DrivetrainSVGGenerator = class {
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
    svg += "</svg>";
    return this._minifySvg(svg);
  }
  calculateLayout(options) {
    const layout = this._buildLayout(options);
    const animation = options.animation && options.animation.enabled ? this._buildAnimationConfig(layout, options) : null;
    return { ...layout, animation };
  }
  _buildLayout(options) {
    const rearRadius = this.geometry.getPitchRadius(options.selectedCog);
    const frontRadius = this.geometry.getPitchRadius(options.chainring);
    const solution = this._solvePitchLockedLayout(options, rearRadius, frontRadius);
    const rearCenter = { x: 0, y: 0 };
    const frontCenter = { x: solution.centerDistance, y: 0 };
    const rearRotation = solution.rearBottomAngle - 0.5 * this.geometry.getToothAngle(options.selectedCog);
    const frontRotation = solution.frontTopAngle - 0.5 * this.geometry.getToothAngle(options.chainring);
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
    for (let straightLinkCount = Math.max(1, targetStraightLinks - 12); straightLinkCount <= targetStraightLinks + 12; straightLinkCount++) {
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
          const verticalOffset = rearRadius * Math.sin(rearHalf) - frontRadius * Math.sin(frontHalf);
          const horizontalSpan = Math.sqrt(Math.max(0, straightLength ** 2 - verticalOffset ** 2));
          const centerDistance = horizontalSpan - frontRadius * Math.cos(frontHalf) - rearRadius * Math.cos(rearHalf);
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
    const smallWrap = Math.PI - 2 * tangentAngle;
    const largeWrap = Math.PI + 2 * tangentAngle;
    return frontRadius >= rearRadius ? { front: largeWrap, rear: smallWrap } : { front: smallWrap, rear: largeWrap };
  }
  _isWrapCountAllowed(wrapCount, targetWrapCount, sprocketRadius, otherRadius) {
    const overwrapAllowance = sprocketRadius < otherRadius ? 1 : 4;
    return wrapCount <= targetWrapCount + overwrapAllowance;
  }
  _hasEvenLinkCount(straightLinkCount, frontWrapCount, rearWrapCount) {
    return (straightLinkCount * 2 + frontWrapCount + rearWrapCount) % 2 === 0;
  }
  _scoreLayoutCandidate(candidate) {
    const centerError = Math.abs(candidate.centerDistance - candidate.targetCenterDistance);
    const frontWrapError = Math.abs(candidate.frontWrapCount - candidate.targetFrontWrap);
    const rearWrapError = Math.abs(candidate.rearWrapCount - candidate.targetRearWrap);
    const smoothness = Math.abs(candidate.verticalOffset);
    const inwardPenalty = candidate.clearance.maxInward * 800;
    const clearanceReward = Math.min(candidate.clearance.minClearance, this.pitch * 0.75) * 0.6;
    const wrapReward = Math.min(candidate.frontWrapCount, candidate.targetFrontWrap + 2) * 0.35 + Math.min(candidate.rearWrapCount, candidate.targetRearWrap + 2) * 0.35;
    return centerError * 10 + frontWrapError * 6 + rearWrapError * 6 + smoothness * 0.2 + inwardPenalty - clearanceReward - wrapReward;
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
    const outwardVelocity = unit.x * radial.x + unit.y * radial.y;
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
    const lengthSquared = vector.x ** 2 + vector.y ** 2;
    const length = Math.sqrt(lengthSquared);
    if (length === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }
    const rawT = ((point.x - start.x) * vector.x + (point.y - start.y) * vector.y) / lengthSquared;
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
    const frontHalf = frontWrapCount * this.geometry.getToothAngle(options.chainring) / 2;
    const rearHalf = rearWrapCount * this.geometry.getToothAngle(options.selectedCog) / 2;
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
        source: "chainring-wrap"
      });
    }
    this._appendLinePins(pins, frontBottom, rearBottom, config.straightLinkCount, false);
    for (let i = 1; i < config.rearWrapCount; i++) {
      pins.push({
        ...this.geometry.getValleyCenter(config.selectedCog, i, config.rearRotation, config.rearCenter),
        source: "cassette-wrap"
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
        source: "straight"
      });
    }
  }
  _buildStyle(styleConfig) {
    const fills = styleConfig.fillColors || [];
    return {
      cassetteFill: fills[0] || "#cbd5e1",
      cassetteAltFill: fills[1] || "#e2e8f0",
      selectedFill: fills[2] || "#334155",
      chainringFill: fills[2] || fills[0] || "#1e293b",
      outlineColor: styleConfig.outlineColor || "#0f172a",
      textColor: styleConfig.textColor || "#64748b",
      chainOuter: styleConfig.chainOuter || "#cbd5e1",
      chainInner: styleConfig.chainInner || "#94a3b8",
      chainPin: styleConfig.chainPin || "#f8fafc",
      cassetteOpacity: styleConfig.layerOpacity !== void 0 ? styleConfig.layerOpacity : 0.35,
      selectedOpacity: styleConfig.selectedOpacity !== void 0 ? styleConfig.selectedOpacity : 1,
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
    svg += "</svg>";
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
      chainPathId: "drivetrain-chain-path",
      outerLinkId: "drivetrain-link-outer",
      innerLinkId: "drivetrain-link-inner",
      pinId: "drivetrain-chain-pin"
    };
  }
  _renderAnimatedDefs(layout, style, options) {
    let svg = "<defs>";
    svg += `<path id="drivetrain-chain-path" d="${this._buildChainTrackPath(layout)}"/>`;
    svg += this._renderAnimatedLinkDef("drivetrain-link-outer", "outer", style);
    svg += this._renderAnimatedLinkDef("drivetrain-link-inner", "inner", style);
    svg += this._renderAnimatedPinDef("drivetrain-chain-pin", style);
    svg += "</defs>";
    return svg;
  }
  _renderAnimatedLinkDef(id, type, style) {
    const isOuter = type === "outer";
    const radius = this.pitch * (isOuter ? 0.34 : 0.32);
    const waist = this.pitch * (isOuter ? 0.25 : 0.24);
    const fill = isOuter ? style.chainOuter : style.chainInner;
    let svg = `<g id="${id}">`;
    svg += `<path d="${this._getChainPlatePath(radius, waist, style)}" fill="${fill}" stroke="${style.outlineColor}" `;
    svg += 'stroke-width="0.45" stroke-linejoin="round"/>';
    svg += "</g>";
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
    svg += "<g>";
    svg += `<animateTransform attributeName="transform" type="rotate" from="${from}" to="${to}" `;
    svg += `dur="${animation.cassetteDuration}s" repeatCount="indefinite"/>`;
    sortedCogs.forEach((teeth, index) => {
      const isSelected = teeth === options.selectedCog;
      const fill = isSelected ? style.selectedFill : index % 2 === 0 ? style.cassetteFill : style.cassetteAltFill;
      const opacity = isSelected ? style.selectedOpacity : style.cassetteOpacity;
      const path = this.geometry.generateSprocketPath(
        teeth,
        Math.min(11, this.geometry.getPitchRadius(teeth) * 0.45)
      );
      svg += `<path d="${path}" fill="${fill}" stroke="${style.outlineColor}" `;
      svg += `stroke-width="0.55" fill-rule="evenodd" opacity="${opacity}"/>`;
    });
    svg += "</g></g>";
    return svg;
  }
  _renderAnimatedChainring(layout, style, options, animation) {
    const innerHoleRadius = Math.max(18, layout.frontRadius - this.pitch * 1.5);
    const path = this.geometry.generateSprocketPath(options.chainring, innerHoleRadius);
    const from = this._radToDeg(layout.frontRotation);
    const to = from + 360;
    let svg = `<g transform="translate(${layout.frontCenter.x} ${layout.frontCenter.y})">`;
    svg += "<g>";
    svg += `<animateTransform attributeName="transform" type="rotate" from="${from}" to="${to}" `;
    svg += `dur="${animation.frontDuration}s" repeatCount="indefinite"/>`;
    svg += `<path d="${path}" fill="${style.chainringFill}" stroke="${style.outlineColor}" `;
    svg += 'stroke-width="0.7" fill-rule="evenodd"/>';
    svg += "</g></g>";
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
    svg += innerLinks.join("");
    svg += '</g><g id="outer-links">';
    svg += outerLinks.join("");
    svg += '</g><g id="pins">';
    svg += pinsSvg.join("");
    svg += "</g>";
    return svg;
  }
  _renderAnimatedUse(defId, animation, begin, rotate) {
    let svg = "<g>";
    svg += `<use href="#${defId}"/>`;
    svg += `<animateMotion dur="${animation.chainDuration}s" begin="${begin}s" `;
    svg += `repeatCount="indefinite"${rotate ? ' rotate="auto"' : ""}>`;
    svg += `<mpath href="#${animation.chainPathId}"/>`;
    svg += "</animateMotion>";
    svg += "</g>";
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
      "Z"
    ].join(" ");
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
    const normalY = Math.sqrt(Math.max(0, 1 - normalX ** 2));
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
    let svg = "";
    sortedCogs.forEach((teeth, index) => {
      const isSelected = teeth === options.selectedCog;
      const fill = isSelected ? style.selectedFill : index % 2 === 0 ? style.cassetteFill : style.cassetteAltFill;
      const opacity = isSelected ? style.selectedOpacity : style.cassetteOpacity;
      const path = this.geometry.generateSprocketPath(
        teeth,
        Math.min(11, this.geometry.getPitchRadius(teeth) * 0.45)
      );
      svg += `<g transform="translate(${layout.rearCenter.x} ${layout.rearCenter.y}) `;
      svg += `rotate(${this._radToDeg(layout.rearRotation)})">`;
      svg += `<path d="${path}" fill="${fill}" stroke="${style.outlineColor}" `;
      svg += `stroke-width="0.55" fill-rule="evenodd" opacity="${opacity}"/>`;
      svg += "</g>";
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
    svg += "</g>";
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
      const type = i % 2 === 0 ? "outer" : "inner";
      links.push({ type, svg: this._renderLinkPlate(start, end, type, style) });
    }
    links.forEach((link) => {
      if (link.type === "outer") {
        outerLinks.push(link.svg);
      } else {
        innerLinks.push(link.svg);
      }
    });
    let svg = `<g>${innerLinks.join("")}</g><g>${outerLinks.join("")}</g><g>`;
    pins.forEach((point) => {
      svg += this._renderPin(point, style);
    });
    svg += "</g>";
    return svg;
  }
  _renderLabels(layout, style, options) {
    if (!options.showText) {
      return "";
    }
    let svg = "";
    svg += this._renderLabel(layout.rearCenter.x, layout.rearRadius + 22, `${options.selectedCog}T`, style);
    svg += this._renderLabel(layout.frontCenter.x, layout.frontRadius + 24, `${options.chainring}T`, style);
    return svg;
  }
  _renderLinkPlate(start, end, type, style) {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const angle = this._radToDeg(Math.atan2(end.y - start.y, end.x - start.x));
    const isOuter = type === "outer";
    const radius = this.pitch * (isOuter ? 0.34 : 0.32);
    const waist = this.pitch * (isOuter ? 0.25 : 0.24);
    const fill = isOuter ? style.chainOuter : style.chainInner;
    const path = this._getChainPlatePath(radius, waist, style);
    let svg = `<g transform="translate(${centerX} ${centerY}) rotate(${angle})">`;
    svg += `<path d="${path}" fill="${fill}" stroke="${style.outlineColor}" `;
    svg += 'stroke-width="0.45" stroke-linejoin="round"/>';
    svg += "</g>";
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
      "Z"
    ].join(" ");
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
      "Z"
    ].join(" ");
  }
  _getChainPlatePath(radius, waist, style) {
    return style.flatTopChain ? this._getFlatTopPlatePath(radius, waist) : this._getPlatePath(radius, waist);
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
    return Object.is(rounded, -0) ? "0" : String(rounded);
  }
  _minifySvg(svg) {
    return svg.replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value)).replace(/\s\/>/g, "/>").replace(/>\s+</g, "><");
  }
};

// src/presets.js
var stylePresets = {
  classicSteel: {
    fillColors: ["#d7dee8", "#eef2f7", "#3f4652"],
    outlineColor: "#5f6b7a",
    textColor: "#334155",
    chainOuter: "#cfd6df",
    chainInner: "#9aa7b8",
    chainPin: "#f8fafc"
  },
  blackGold: {
    fillColors: ["#eab308", "#fef08a", "#111827"],
    outlineColor: "#ca8a04",
    textColor: "#0f172a",
    chainOuter: "#facc15",
    chainInner: "#a16207",
    chainPin: "#111827"
  },
  oilSlick: {
    fillColors: ["#22d3ee", "#a78bfa", "#f472b6"],
    outlineColor: "#0f172a",
    textColor: "#111827",
    chainOuter: "#67e8f9",
    chainInner: "#c084fc",
    chainPin: "#fef3c7"
  },
  blueprint: {
    fillColors: ["#dbeafe", "#93c5fd", "#1d4ed8"],
    outlineColor: "#1e40af",
    textColor: "#1e3a8a",
    chainOuter: "#bfdbfe",
    chainInner: "#60a5fa",
    chainPin: "#eff6ff"
  },
  raceRed: {
    fillColors: ["#f87171", "#fecaca", "#991b1b"],
    outlineColor: "#7f1d1d",
    textColor: "#450a0a",
    chainOuter: "#fee2e2",
    chainInner: "#ef4444",
    chainPin: "#ffffff"
  },
  ghostStack: {
    fillColors: ["#94a3b8", "#e2e8f0", "#0f172a"],
    outlineColor: "#334155",
    textColor: "#0f172a",
    layerOpacity: 0.28,
    selectedOpacity: 0.88,
    chainOuter: "#cbd5e1",
    chainInner: "#94a3b8",
    chainPin: "#ffffff"
  },
  xrayCassette: {
    fillColors: ["#67e8f9", "#cffafe", "#0e7490"],
    outlineColor: "#155e75",
    textColor: "#164e63",
    layerOpacity: 0.2,
    selectedOpacity: 0.72,
    chainOuter: "#a5f3fc",
    chainInner: "#22d3ee",
    chainPin: "#ecfeff"
  }
};
var drivetrainPresets = {
  compactRoad: {
    chainring: 50,
    cogs: [11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32],
    selectedCog: 17,
    chainstay: 410,
    showText: true
  },
  gravelWideRange: {
    chainring: 40,
    cogs: [10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 45, 51],
    selectedCog: 24,
    chainstay: 430,
    showText: true
  },
  mtbTenFiftyTwo: {
    chainring: 32,
    cogs: [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52],
    selectedCog: 36,
    chainstay: 435,
    showText: true
  },
  trackFixie: {
    chainring: 48,
    cogs: [17],
    selectedCog: 17,
    chainstay: 390,
    showText: true
  },
  touringTripleInspired: {
    chainring: 26,
    cogs: [11, 13, 15, 17, 20, 23, 26, 30, 34, 40],
    selectedCog: 30,
    chainstay: 455,
    showText: true
  }
};
function resolveStylePreset(style) {
  if (!style) return {};
  if (typeof style === "string") return { ...stylePresets[style] || {} };
  return { ...style };
}
function resolveDrivetrainPreset(preset) {
  if (!preset) return {};
  if (typeof preset === "string") return { ...drivetrainPresets[preset] || {} };
  return { ...preset };
}

// src/index.js
function chainringStyle(options = {}) {
  const styleConfig = {
    ...resolveStylePreset(options.style),
    ...options.styleConfig || {}
  };
  const fillColors = styleConfig.fillColors || [];
  return {
    ...styleConfig,
    fillColor: styleConfig.fillColor || fillColors[2] || fillColors[0],
    outlineColor: styleConfig.outlineColor,
    textColor: styleConfig.textColor
  };
}
var BicycleDrivetrainSVG = class {
  constructor(config = {}) {
    this.config = config;
    this.cassetteGenerator = new CassetteSVGGenerator(config.pitch);
    this.chainringGenerator = new ChainringSVGGenerator(config.pitch);
    this.drivetrainGenerator = new DrivetrainSVGGenerator(config);
  }
  cassette(cogs, options = {}) {
    const view = options.view || "front";
    const styleConfig = {
      ...resolveStylePreset(options.style),
      ...options.styleConfig || {}
    };
    return view === "side" ? this.cassetteGenerator.renderSide(cogs, options.direction || "ltr", styleConfig) : this.cassetteGenerator.renderFront(cogs, styleConfig);
  }
  cassetteStack(cogs, options = {}) {
    return this.cassetteGenerator.calculateStack(cogs, options);
  }
  cassetteGroup(cogs, options = {}) {
    const view = options.view || "front";
    const styleConfig = {
      ...resolveStylePreset(options.style),
      ...options.styleConfig || {}
    };
    return view === "side" ? this.cassetteGenerator.renderSideGroup(cogs, options.direction || "ltr", styleConfig) : this.cassetteGenerator.renderFrontGroup(cogs, styleConfig);
  }
  chainring(teeth, options = {}) {
    return this.chainringGenerator.render(teeth, chainringStyle(options));
  }
  chain(linkCount, pathType = "straight", options = {}) {
    const styleConfig = {
      ...resolveStylePreset(options.style),
      ...options.styleConfig || {}
    };
    const chainConfig = {
      outerColor: styleConfig.chainOuter || styleConfig.outerColor,
      innerColor: styleConfig.chainInner || styleConfig.innerColor,
      pinColor: styleConfig.chainPin || styleConfig.pinColor,
      rollerColor: styleConfig.rollerColor,
      rollerHoleColor: styleConfig.rollerHoleColor,
      strokeColor: styleConfig.outlineColor || styleConfig.strokeColor,
      showPins: options.showPins,
      showRollers: options.showRollers,
      flatTop: options.flatTop
    };
    Object.keys(chainConfig).forEach((key) => {
      if (chainConfig[key] === void 0) delete chainConfig[key];
    });
    return new ChainSVGGenerator(chainConfig).render(linkCount, pathType, {
      startLink: options.startLink
    });
  }
  drivetrain(options = {}) {
    const { preset, style, styleConfig, ...rest } = options;
    return this.drivetrainGenerator.render({
      ...resolveDrivetrainPreset(preset),
      ...rest,
      styleConfig: {
        ...resolveStylePreset(style),
        ...styleConfig || {}
      }
    });
  }
  drivetrainLayout(options = {}) {
    const { preset, style, styleConfig, ...rest } = options;
    return this.drivetrainGenerator.calculateLayout({
      ...resolveDrivetrainPreset(preset),
      ...rest,
      styleConfig: {
        ...resolveStylePreset(style),
        ...styleConfig || {}
      }
    });
  }
};
function renderCassetteSvg(cogs, options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).cassette(cogs, options);
}
function renderChainringSvg(teeth, options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).chainring(teeth, options);
}
function renderChainSvg(linkCount, pathType = "straight", options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).chain(linkCount, pathType, options);
}
function renderDrivetrainSvg(options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).drivetrain(options);
}
function calculateCassetteStack(cogs, options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).cassetteStack(cogs, options);
}
function renderCassetteGroup(cogs, options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).cassetteGroup(cogs, options);
}
function calculateDrivetrainLayout(options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).drivetrainLayout(options);
}
var index_default = BicycleDrivetrainSVG;
export {
  BicycleDrivetrainSVG,
  CassetteSVGGenerator,
  ChainSVGGenerator,
  ChainringSVGGenerator,
  DrivetrainSVGGenerator,
  SprocketGeometry,
  calculateCassetteStack,
  calculateDrivetrainLayout,
  index_default as default,
  drivetrainPresets,
  renderCassetteGroup,
  renderCassetteSvg,
  renderChainSvg,
  renderChainringSvg,
  renderDrivetrainSvg,
  stylePresets
};
//# sourceMappingURL=index.mjs.map
