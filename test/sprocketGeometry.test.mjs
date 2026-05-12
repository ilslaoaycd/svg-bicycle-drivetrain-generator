import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SprocketGeometry } from '../src/index.js';

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('SprocketGeometry', () => {
  test('places valley centers one tooth angle apart', () => {
    const geometry = new SprocketGeometry(12.7);
    const valleys = geometry.getValleyCenters(32);
    const toothAngle = geometry.getToothAngle(32);

    for (let i = 1; i < valleys.length; i++) {
      assert.ok(Math.abs((valleys[i].angle - valleys[i - 1].angle) - toothAngle) < 1e-12);
    }
  });

  test('uses pitch-radius valley centers one chain pitch apart as chords', () => {
    const pitch = 12.7;
    const geometry = new SprocketGeometry(pitch);
    const valleys = geometry.getValleyCenters(18);

    assert.ok(Math.abs(distance(valleys[0], valleys[1]) - pitch) < 1e-12);
  });

  test('keeps pitch radius consistent with the sprocket formula', () => {
    const pitch = 12.7;
    const teeth = 44;
    const geometry = new SprocketGeometry(pitch);
    const expectedRadius = pitch / (2 * Math.sin(Math.PI / teeth));

    assert.ok(Math.abs(geometry.getPitchRadius(teeth) - expectedRadius) < 1e-12);
  });

  test('generates sprocket paths from pitch-radius valley centers', () => {
    const pitch = 12.7;
    const geometry = new SprocketGeometry(pitch);
    const path = geometry.generateSprocketPath(18, 9.5);
    const firstValley = geometry.getValleyCenter(18, -1);
    const rollerRadius = pitch * 0.3125;
    const phi = 50 * (Math.PI / 180);
    const expectedStartX = firstValley.x + rollerRadius * Math.cos(firstValley.angle + Math.PI - phi);
    const expectedStartY = firstValley.y + rollerRadius * Math.sin(firstValley.angle + Math.PI - phi);

    assert.ok(path.includes(`M ${expectedStartX} ${expectedStartY}`));
  });
});
