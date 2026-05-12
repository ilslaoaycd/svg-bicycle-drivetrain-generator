import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DrivetrainSVGGenerator } from '../src/index.js';

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function buildRenderOptions(overrides = {}) {
  return {
    chainring: 32,
    cogs: [10, 12, 14, 16, 18, 21, 24, 28, 32, 38, 44, 52, 60],
    selectedCog: 18,
    chainstay: 435,
    showText: true,
    styleConfig: {},
    ...overrides
  };
}

function buildLayout(generator, overrides = {}) {
  return generator._buildLayout(buildRenderOptions(overrides));
}

function assertClose(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not close to ${expected}`);
}

function assertPitchLockedLoop(generator, layout) {
  const pins = layout.chainPins;

  assert.equal(pins.length % 2, 0);
  pins.forEach((pin, index) => {
    const nextPin = pins[(index + 1) % pins.length];
    assertClose(distance(pin, nextPin), generator.pitch, 1e-8);
  });
}

function assertClearStraightRuns(generator, layout) {
  const clearance = generator._measureCandidateClearance(layout);

  assert.equal(clearance.valid, true);
  assert.ok(clearance.minClearance >= -generator.clearanceTolerance);
  assert.ok(clearance.maxInward <= generator.inwardTolerance);
}

describe('DrivetrainSVGGenerator geometry', () => {
  test('builds a closed pitch-locked chain loop', () => {
    const generator = new DrivetrainSVGGenerator();
    assertPitchLockedLoop(generator, buildLayout(generator));
  });

  test('places wrap pins on matching sprocket valley centers', () => {
    const generator = new DrivetrainSVGGenerator();
    const layout = buildLayout(generator);

    layout.chainPins.filter((pin) => pin.source === 'chainring-wrap').forEach((pin) => {
      const valley = generator.geometry.getValleyCenter(32, pin.index, layout.frontRotation, layout.frontCenter);
      assertClose(distance(pin, valley), 0, 1e-12);
    });

    layout.chainPins.filter((pin) => pin.source === 'cassette-wrap').forEach((pin) => {
      const valley = generator.geometry.getValleyCenter(18, pin.index, layout.rearRotation, layout.rearCenter);
      assertClose(distance(pin, valley), 0, 1e-12);
    });
  });

  test('snaps effective center distance near requested chainstay', () => {
    const generator = new DrivetrainSVGGenerator();
    const layout = buildLayout(generator);

    assert.ok(Math.abs(layout.effectiveCenterDistance - 435) < 10);
    assert.notEqual(layout.effectiveCenterDistance, layout.requestedCenterDistance);
  });

  test('keeps straight runs clear for extreme gear ratios', () => {
    const generator = new DrivetrainSVGGenerator();
    const cases = [
      { chainring: 50, selectedCog: 10 },
      { chainring: 16, selectedCog: 60 }
    ];

    cases.forEach((options) => {
      const layout = buildLayout(generator, options);
      assertPitchLockedLoop(generator, layout);
      assertClearStraightRuns(generator, layout);
    });
  });

  test('chooses an even link count for assembled drivetrains', () => {
    const generator = new DrivetrainSVGGenerator();
    const cases = [
      { chainring: 30, selectedCog: 13, chainstay: 415 },
      { chainring: 34, selectedCog: 17, chainstay: 430 },
      { chainring: 42, selectedCog: 21, chainstay: 455 },
      { chainring: 50, selectedCog: 10, chainstay: 435 },
      { chainring: 16, selectedCog: 60, chainstay: 435 }
    ];

    cases.forEach((options) => {
      const layout = buildLayout(generator, options);
      assert.equal(layout.chainPins.length % 2, 0);
      assert.equal(generator._hasEvenLinkCount(
        layout.straightLinkCount,
        layout.frontWrapCount,
        layout.rearWrapCount
      ), true);
    });
  });

  test('renders static and animated SVG with distinct markup', () => {
    const generator = new DrivetrainSVGGenerator();
    const staticSvg = generator.render(buildRenderOptions());
    const animatedSvg = generator.render(buildRenderOptions({
      animation: { enabled: true, rpm: 80 }
    }));

    assert.equal(staticSvg.includes('<defs'), false);
    assert.equal(staticSvg.includes('<animateTransform'), false);
    assert.equal(animatedSvg.includes('<animateTransform'), true);
    assert.equal(animatedSvg.includes('<animateMotion'), true);
    assert.equal(animatedSvg.match(/ A /g).length >= 2, true);
  });

  test('calculates cassette animation rpm from selected gear ratio', () => {
    const generator = new DrivetrainSVGGenerator();
    const options = buildRenderOptions({ animation: { enabled: true, rpm: 80 } });
    const animation = generator._buildAnimationConfig(generator._buildLayout(options), options);

    assertClose(animation.cassetteRpm, 80 * 32 / 18);
    assertClose(animation.frontDuration, 0.75);
    assertClose(animation.cassetteDuration, 60 / (80 * 32 / 18));
  });
});
