export class ChainSVGGenerator {
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
      outerColor: '#cbd5e1',
      innerColor: '#94a3b8',
      pinColor: '#f8fafc',
      rollerColor: '#e2e8f0',
      rollerHoleColor: '#0f172a',
      strokeColor: '#0f172a',
      strokeWidth: 3,
      showPins: true,
      showRollers: false,
      flatTop: false,
      ...config
    };
  }

  getFlatTopPlatePath(radius) {
    const halfPitch = this.config.pitch / 2;

    return [
      `M ${-halfPitch} ${-radius}`,
      `L ${halfPitch} ${-radius}`,
      `A ${radius} ${radius} 0 0 1 ${halfPitch} ${radius}`,
      `L ${-halfPitch} ${radius}`,
      `A ${radius} ${radius} 0 0 1 ${-halfPitch} ${-radius}`,
      'Z'
    ].join(' ');
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
      'Z'
    ].join(' ');
  }

  getLinkPlatePath(radius, waist) {
    return this.config.flatTop
      ? this.getFlatTopPlatePath(radius)
      : this.getPlatePath(radius, waist);
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

    svg += '</g>';
    return svg;
  }

  getOuterLinkSVG(x, y, angleDeg) {
    const { outerRadius, outerWaist, outerColor, strokeColor, strokeWidth } = this.config;
    const path = this.getLinkPlatePath(outerRadius, outerWaist);

    let svg = `<g transform="translate(${x}, ${y}) rotate(${angleDeg})">`;
    svg += `<path d="${path}" fill="${outerColor}" stroke="${strokeColor}" `;
    svg += `stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
    svg += '</g>';
    return svg;
  }

  generateAngles(type, linkCount) {
    const angles = [];
    let currentAngle = 0;

    for (let i = 0; i < linkCount; i++) {
      if (type === 'straight') {
        currentAngle = 0;
      } else if (type === 'curve') {
        currentAngle += 5;
      } else if (type === 'wave') {
        currentAngle = Math.sin(i * 0.4) * 45;
      } else if (type === 'wrap') {
        if (i > Math.floor(linkCount * 0.2) && i < Math.floor(linkCount * 0.8)) {
          currentAngle += 15;
        }
      } else if (type === 'loop') {
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
      const centerX = currentPivotX + (this.config.pitch / 2) * Math.cos(angleRad);
      const centerY = currentPivotY + (this.config.pitch / 2) * Math.sin(angleRad);
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
    svg += `<g>${innerLinks.join('')}</g><g>${outerLinks.join('')}</g>`;
    svg += this.getPinsSVG(pivotPoints);
    svg += '</g></svg>';

    return this._minifySvg(svg);
  }

  getPinsSVG(pivotPoints) {
    if (!this.config.showPins) {
      return '';
    }

    const { pinRadius, pinColor, strokeColor, strokeWidth } = this.config;
    const pins = pivotPoints.map((point) => {
      let svg = `<circle cx="${point.x}" cy="${point.y}" r="${pinRadius}" `;
      svg += `fill="${pinColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      return svg;
    });

    return `<g>${pins.join('')}</g>`;
  }

  render(linkCount, pathType = 'straight', options = {}) {
    const startWithOuter = options.startLink !== 'inner';
    return this.generateStrandSVG(this.generateAngles(pathType, linkCount), 0, 0, startWithOuter);
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
