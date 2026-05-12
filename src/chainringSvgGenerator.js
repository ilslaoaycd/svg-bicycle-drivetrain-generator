import { SprocketGeometry } from './sprocketGeometry.js';

export class ChainringSVGGenerator {
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
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }

  _minifySvg(svg) {
    return svg
      .replace(/-?\d+\.\d+/g, (value) => this._formatNumber(value))
      .replace(/\s\/>/g, '/>')
      .replace(/>\s+</g, '><');
  }

  render(teeth, styleConfig = {}) {
    const maxRadius = this._getOuterRadius(teeth);
    const viewSize = Math.ceil(maxRadius + this.pitch);
    const showText = styleConfig.showText !== false;
    const fill = styleConfig.fillColor || '#1e293b';
    const stroke = styleConfig.outlineColor || '#0f172a';
    const textColor = styleConfig.textColor || '#94a3b8';

    let svg = '<svg xmlns="http://www.w3.org/2000/svg" ';
    svg += `viewBox="-${viewSize} -${viewSize} ${viewSize * 2} ${viewSize * 2}" `;
    svg += 'style="width: 100%; height: 100%; display: block;">';

    const pathD = this._generateChainringPath(teeth);
    svg += `<g><path d="${pathD}" fill="${fill}" stroke="${stroke}" `;
    svg += 'stroke-width="0.5" fill-rule="evenodd"/>';

    if (showText) {
      const textRadius = this._getOuterRadius(teeth) - this.pitch * 0.17;
      const step = (2 * Math.PI) / teeth;
      const exactAngle = Math.round((-Math.PI / 2) / step) * step;
      const textX = textRadius * Math.cos(exactAngle);
      const textY = textRadius * Math.sin(exactAngle);
      const textRotation = (exactAngle * 180 / Math.PI) + 90;

      svg += `<text x="${textX}" y="${textY}" font-size="2.4" `;
      svg += 'font-family="monospace" font-weight="bold" text-anchor="middle" ';
      svg += `dominant-baseline="central" fill="${textColor}" opacity="0.9" `;
      svg += 'style="pointer-events: none; user-select: none;" ';
      svg += `transform="rotate(${textRotation}, ${textX}, ${textY})">${teeth}T</text>`;
    }
    svg += '</g></svg>';

    return this._minifySvg(svg);
  }
}
