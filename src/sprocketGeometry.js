export class SprocketGeometry {
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
    return (2 * Math.PI) / teeth;
  }

  getValleyAngle(teeth, index, rotation = 0) {
    return rotation + ((index + 0.5) * this.getToothAngle(teeth));
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
    return ((index % teeth) + teeth) % teeth;
  }

  getIndexForAngle(teeth, worldAngle, rotation = 0) {
    const toothAngle = this.getToothAngle(teeth);
    return this.normalizeIndex(Math.round(((worldAngle - rotation) / toothAngle) - 0.5), teeth);
  }

  generateSprocketPath(teeth, innerHoleRadius) {
    const rollerRadius = this.pitch * 0.3125;
    const pitchRadius = this.getPitchRadius(teeth);
    const outerRadius = this.getOuterRadius(teeth);
    const toothAngle = this.getToothAngle(teeth);
    const phi = 50 * (Math.PI / 180);
    const flatTopWidth = this.pitch * 0.40;
    const delta = (flatTopWidth / 2) / outerRadius;
    let path = '';

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
    path += 'Z ';

    const segments = 48;
    for (let i = segments; i >= 0; i--) {
      const point = this.p2c(innerHoleRadius, (i / segments) * (2 * Math.PI));
      path += i === segments ? `M ${point.x} ${point.y} ` : `L ${point.x} ${point.y} `;
    }
    path += 'Z';

    return path;
  }
}
