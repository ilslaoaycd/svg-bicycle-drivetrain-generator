import { SprocketGeometry } from './sprocketGeometry.js';

export class CassetteSVGGenerator {
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
    const notchHalfWidth = 1.0;

    let path = '';
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (2 * Math.PI);
      const pt = this._p2c(outerRadius, angle);
      if (i === 0) {
        path += `M ${pt.x} ${pt.y} `;
      } else {
        path += `L ${pt.x} ${pt.y} `;
      }
    }
    path += 'Z ';

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
      const defaults = ['#e2e8f0', '#cbd5e1'];
      return index === 0 ? '#334155' : defaults[index % 2];
    }

    const fills = styleConfig.fillColors;
    if (fills.length === 1) return fills[0];
    if (fills.length === 2) return fills[index % 2];
    if (index === 0) return fills[2];
    return fills[(index - 1) % 2];
  }

  _resolveOutline(index, styleConfig) {
    if (styleConfig && styleConfig.outlineColor) return styleConfig.outlineColor;
    return index === 0 ? '#1e293b' : '#94a3b8';
  }

  _resolveOpacity(index, styleConfig) {
    if (styleConfig && styleConfig.layerOpacities && styleConfig.layerOpacities[index] !== undefined) {
      return styleConfig.layerOpacities[index];
    }
    if (styleConfig && styleConfig.layerOpacity !== undefined) {
      return index === 0 && styleConfig.selectedOpacity !== undefined
        ? styleConfig.selectedOpacity
        : styleConfig.layerOpacity;
    }
    return 1;
  }

  _formatNumber(value) {
    const multiplier = 10 ** this.coordinatePrecision;
    const rounded = Math.round(Number.parseFloat(value) * multiplier) / multiplier;
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }

  _minifySvg(svg) {
    return svg
      .replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value))
      .replace(/\sclass="[^"]*"/g, '')
      .replace(/\s\/>/g, '/>')
      .replace(/>\s+</g, '><');
  }

  _minifyFragment(svg) {
    return svg
      .replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value))
      .replace(/\s\/>/g, '/>')
      .replace(/>\s+</g, '><');
  }

  calculateStack(teethArray, options = {}) {
    const sortedTeeth = [...teethArray].sort((a, b) => b - a);
    const cogWidth = options.cogWidth ?? 1.2;
    const cogPitch = options.cogPitch ?? 3;
    const stackWidth = sortedTeeth.length === 0 ? 0 : ((sortedTeeth.length - 1) * cogPitch) + cogWidth;
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
        centerX: (index * cogPitch) + (cogWidth / 2),
        width: cogWidth,
        pitchRadius: this._getPitchRadius(teeth),
        outerRadius: this._getOuterRadius(teeth)
      }))
    };
  }

  renderFrontGroup(teethArray, styleConfig = {}) {
    const sortedTeeth = [...teethArray].sort((a, b) => b - a);
    if (sortedTeeth.length === 0) return '';
    const showText = styleConfig.showText !== false;
    const textColor = styleConfig.textColor || null;
    const textAngles = new Array(sortedTeeth.length);
    const smallestTeeth = sortedTeeth[sortedTeeth.length - 1];
    const firstStep = (2 * Math.PI) / smallestTeeth;
    let prevAngle = Math.round((-Math.PI / 2) / firstStep) * firstStep;
    textAngles[sortedTeeth.length - 1] = prevAngle;
    const minGap = 2 * (Math.PI / 180);

    for (let i = sortedTeeth.length - 2; i >= 0; i--) {
      const teeth = sortedTeeth[i];
      const step = (2 * Math.PI) / teeth;
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
        computedTextColor = isDefaultLargestCog ? '#94a3b8' : '#64748b';
      }
      svg += '<g class="cog-layer">';
      svg += `<path d="${this._generateCogPath(teeth)}" fill="${fill}" stroke="${stroke}" `;
      svg += `stroke-width="0.5" fill-rule="evenodd" opacity="${opacity}"/>`;
      if (showText) {
        const textRadius = this._getOuterRadius(teeth) - this.pitch * 0.19;
        const exactAngle = textAngles[index];
        const textX = textRadius * Math.cos(exactAngle);
        const textY = textRadius * Math.sin(exactAngle);
        let textRotation = (exactAngle * 180 / Math.PI) + 90;
        const normalizedAngle = ((exactAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (normalizedAngle > Math.PI / 3 && normalizedAngle < 4 * Math.PI / 3) textRotation += 180;
        const styleStr = !textColor ? 'mix-blend-mode: difference; fill: white;' : `fill: ${computedTextColor};`;
        svg += `<text x="${textX}" y="${textY}" font-size="2.4" `;
        svg += 'font-family="monospace" font-weight="bold" text-anchor="middle" ';
        svg += 'dominant-baseline="central" opacity="0.9" ';
        svg += `style="pointer-events: none; user-select: none; ${styleStr}" `;
        svg += `transform="rotate(${textRotation}, ${textX}, ${textY})">${teeth}T</text>`;
      }
      svg += '</g>';
    });
    svg += '<g class="lockring-group">';
    svg += `<path d="${this._generateLockringPath()}" fill="#111827" stroke="#374151" `;
    svg += 'stroke-width="0.5" fill-rule="evenodd"/>';
    svg += '</g></g>';
    return this._minifyFragment(svg);
  }

  renderSideGroup(teethArray, direction = 'ltr', styleConfig = {}) {
    const stack = this.calculateStack(teethArray, styleConfig);
    if (stack.sortedCogs.length === 0) return '';
    const displayCogs = direction === 'ltr' ? stack.cogs : [...stack.cogs].reverse();
    const maxRadius = stack.largestRadius;
    const freehubRadius = styleConfig.freehubRadius ?? 9.5;
    const showText = styleConfig.showText !== false;
    const textColor = styleConfig.textColor || '#64748b';
    let svg = '<g class="cassette-side-group">';
    svg += `<rect x="-1" y="-${freehubRadius}" width="${stack.stackWidth + 2}" `;
    svg += `height="${freehubRadius * 2}" fill="#475569" rx="0.5"/>`;
    displayCogs.forEach((cog, displayIndex) => {
      const trueIndex = stack.sortedCogs.indexOf(cog.teeth);
      const xOffset = direction === 'ltr'
        ? cog.x
        : displayIndex * stack.cogPitch;
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
      svg += '</g>';
    });
    const lockringX = direction === 'ltr' ? stack.lockringX : -1.2;
    svg += `<rect class="cassette-lockring-side" x="${lockringX}" y="-11.8" width="${stack.lockringWidth}" height="23.6" fill="#111827" rx="0.2"/>`;
    svg += '</g>';
    return this._minifyFragment(svg);
  }

  renderFront(teethArray, styleConfig = {}) {
    const sortedTeeth = [...teethArray].sort((a, b) => b - a);
    if (sortedTeeth.length === 0) return '';

    const maxRadius = this._getOuterRadius(sortedTeeth[0]);
    const viewSize = Math.ceil(maxRadius + this.pitch);
    const showText = styleConfig.showText !== false;
    const textColor = styleConfig.textColor || null;

    const textAngles = new Array(sortedTeeth.length);
    const smallestTeeth = sortedTeeth[sortedTeeth.length - 1];
    const firstStep = (2 * Math.PI) / smallestTeeth;
    let prevAngle = Math.round((-Math.PI / 2) / firstStep) * firstStep;
    textAngles[sortedTeeth.length - 1] = prevAngle;
    const minGap = 2 * (Math.PI / 180);

    for (let i = sortedTeeth.length - 2; i >= 0; i--) {
      const teeth = sortedTeeth[i];
      const step = (2 * Math.PI) / teeth;
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
        computedTextColor = isDefaultLargestCog ? '#94a3b8' : '#64748b';
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

        let textRotation = (exactAngle * 180 / Math.PI) + 90;
        const normalizedAngle = ((exactAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (normalizedAngle > Math.PI / 3 && normalizedAngle < 4 * Math.PI / 3) {
          textRotation += 180;
        }

        const styleStr = !textColor ? 'mix-blend-mode: difference; fill: white;' : `fill: ${computedTextColor};`;
        svg += `<text x="${textX}" y="${textY}" font-size="2.4" `;
        svg += 'font-family="monospace" font-weight="bold" text-anchor="middle" ';
        svg += 'dominant-baseline="central" opacity="0.9" ';
        svg += `style="pointer-events: none; user-select: none; ${styleStr}" `;
        svg += `transform="rotate(${textRotation}, ${textX}, ${textY})">${teeth}T</text>`;
      }
      svg += '</g>';
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
    svg += '</g></svg>';

    return this._minifySvg(svg);
  }

  renderSide(teethArray, direction = 'ltr', styleConfig = {}) {
    const sortedTeeth = [...teethArray].sort((a, b) => b - a);
    if (sortedTeeth.length === 0) return '';

    const displayTeeth = direction === 'ltr' ? sortedTeeth : [...sortedTeeth].reverse();
    const cogWidth = 1.2;
    const stepWidth = 3;
    const totalWidth = displayTeeth.length * stepWidth;
    const maxRadius = this._getOuterRadius(sortedTeeth[0]);
    const viewHeight = Math.ceil(maxRadius + this.pitch);
    const freehubRadius = 9.5;
    const showText = styleConfig.showText !== false;
    const textColor = styleConfig.textColor || '#64748b';

    let carrierPath = 'M 0 0 ';
    displayTeeth.forEach((teeth, i) => {
      const r = this._getPitchRadius(teeth) - 2;
      const x = i * stepWidth + (cogWidth / 2);
      carrierPath += `L ${x} ${-r} `;
    });
    carrierPath += `L ${(displayTeeth.length - 1) * stepWidth} 0 Z`;

    let carrierPathBottom = 'M 0 0 ';
    displayTeeth.forEach((teeth, i) => {
      const r = this._getPitchRadius(teeth) - 2;
      const x = i * stepWidth + (cogWidth / 2);
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

      svg += '<g>';
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
      svg += '</g>';
    });

    const lockringX = direction === 'ltr' ? (totalWidth - stepWidth + cogWidth + 0.2) : (-0.2 - 1);
    svg += `<rect x="${lockringX}" y="-11.8" width="1" height="23.6" fill="#111827" rx="0.2" />`;
    svg += '</svg>';

    return this._minifySvg(svg);
  }
}
