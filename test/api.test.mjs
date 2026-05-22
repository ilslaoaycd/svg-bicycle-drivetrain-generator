import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import {
  BicycleDrivetrainSVG,
  calculateCassetteStack,
  calculateDrivetrainLayout,
  CassetteSVGGenerator,
  ChainSVGGenerator,
  ChainringSVGGenerator,
  DrivetrainSVGGenerator,
  SprocketGeometry,
  drivetrainPresets,
  renderCassetteGroup,
  renderCassetteSvg,
  renderChainSvg,
  renderChainringSvg,
  renderDrivetrainSvg,
  stylePresets
} from '../src/index.js';

describe('public API', () => {
  test('exports facade, classes, presets, and convenience functions', () => {
    assert.equal(typeof BicycleDrivetrainSVG, 'function');
    assert.equal(typeof CassetteSVGGenerator, 'function');
    assert.equal(typeof ChainringSVGGenerator, 'function');
    assert.equal(typeof ChainSVGGenerator, 'function');
    assert.equal(typeof DrivetrainSVGGenerator, 'function');
    assert.equal(typeof SprocketGeometry, 'function');
    assert.equal(typeof calculateCassetteStack, 'function');
    assert.equal(typeof calculateDrivetrainLayout, 'function');
    assert.equal(typeof renderCassetteGroup, 'function');
    assert.equal(typeof renderCassetteSvg, 'function');
    assert.equal(typeof renderChainringSvg, 'function');
    assert.equal(typeof renderChainSvg, 'function');
    assert.equal(typeof renderDrivetrainSvg, 'function');
    assert.ok(stylePresets.oilSlick);
    assert.ok(stylePresets.ghostStack);
    assert.ok(drivetrainPresets.mtbTenFiftyTwo);
  });

  test('facade renders all part types as SVG strings', () => {
    const generator = new BicycleDrivetrainSVG();

    assert.match(generator.cassette([10, 12, 14, 16], { style: 'xrayCassette' }), /^<svg /);
    assert.match(generator.chainring(38, { style: 'oilSlick' }), /^<svg /);
    assert.match(generator.chain(8, 'wave', { style: 'raceRed' }), /^<svg /);
    assert.match(generator.drivetrain({
      preset: 'gravelWideRange',
      selectedCog: 24,
      style: 'classicSteel'
    }), /^<svg /);
  });

  test('transparent cassette styles affect layer opacity', () => {
    const svg = renderCassetteSvg([10, 12, 14, 16], { style: 'xrayCassette' });
    assert.match(svg, /opacity="0\.2"/);
  });

  test('cassette stack layout and groups support external mounting', () => {
    const stack = calculateCassetteStack([10, 12, 14, 16], { cogPitch: 3, cogWidth: 1.2 });
    const sideGroup = renderCassetteGroup([10, 12, 14, 16], { view: 'side', style: 'classicSteel' });
    const frontGroup = renderCassetteGroup([10, 12, 14, 16], { view: 'front', style: 'classicSteel' });

    assert.deepEqual(stack.sortedCogs, [16, 14, 12, 10]);
    assert.equal(stack.stackWidth, 10.2);
    assert.equal(Number(stack.lockringX.toFixed(6)), 10.4);
    assert.equal(stack.cogs[0].x, 0);
    assert.match(sideGroup, /^<g class="cassette-side-group">/);
    assert.match(frontGroup, /^<g class="cassette-front-group">/);
  });

  test('drivetrain layout exposes rear center, rotation, and cassette animation timing', () => {
    const layout = calculateDrivetrainLayout({
      chainring: 30,
      cogs: [10, 12, 14, 16, 18],
      selectedCog: 16,
      chainstay: 420,
      animation: { enabled: true, rpm: 8 }
    });

    assert.equal(layout.rearCenter.x, 0);
    assert.equal(layout.rearCenter.y, 0);
    assert.equal(typeof layout.rearRotation, 'number');
    assert.equal(layout.animation.frontRpm, 8);
    assert.equal(layout.animation.cassetteRpm, 15);
    assert.equal(layout.animation.cassetteDuration, 4);
  });

  test('flattop chain option removes only the top inward waist curve', () => {
    const standard = renderChainSvg(2, 'straight', { showPins: false });
    const flatTop = renderChainSvg(2, 'straight', { flatTop: true, showPins: false });

    assert.match(standard, /C -33\.333 -34, -16\.667 -25, 0 -25/);
    assert.match(standard, /C -16\.667 25, -33\.333 34, -50 34/);
    assert.doesNotMatch(flatTop, /C -33\.333 -34, -16\.667 -25, 0 -25/);
    assert.match(flatTop, /C -16\.667 25, -33\.333 34, -50 34/);
    assert.match(flatTop, /L 50 -34/);
    assert.match(flatTop, /L 50 -32/);
    assert.doesNotMatch(flatTop, /L -50 34/);
    assert.doesNotMatch(flatTop, /L -50 32/);
  });

  test('facade passes the flattop chain option through', () => {
    const svg = new BicycleDrivetrainSVG().chain(2, 'straight', {
      flatTop: true,
      showPins: false
    });

    assert.match(svg, /L 50 -34/);
    assert.match(svg, /L 50 -32/);
    assert.doesNotMatch(svg, /C -33\.333 -34, -16\.667 -25, 0 -25/);
    assert.match(svg, /C -16\.667 25, -33\.333 34, -50 34/);
  });

  test('full drivetrain can render static and animated flattop chains', () => {
    const options = {
      chainring: 30,
      cogs: [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52],
      selectedCog: 36,
      chainstay: 435,
      styleConfig: {
        flatTopChain: true
      }
    };
    const staticSvg = renderDrivetrainSvg(options);
    const animatedSvg = renderDrivetrainSvg({
      ...options,
      animation: {
        enabled: true,
        rpm: 8
      }
    });

    assert.match(staticSvg, /L 6\.35 -4\.318/);
    assert.match(staticSvg, /C -2\.117 3\.175, -4\.233 4\.318, -6\.35 4\.318/);
    assert.doesNotMatch(staticSvg, /C -4\.233 -4\.318, -2\.117 -3\.175, 0 -3\.175/);
    assert.match(animatedSvg, /<animateMotion/);
    assert.match(animatedSvg, /L 6\.35 -4\.318/);
    assert.match(animatedSvg, /C -2\.117 3\.175, -4\.233 4\.318, -6\.35 4\.318/);
    assert.doesNotMatch(animatedSvg, /C -4\.233 -4\.318, -2\.117 -3\.175, 0 -3\.175/);
  });

  test('CommonJS bundle can be required', () => {
    const require = createRequire(import.meta.url);
    const api = require('../dist/index.cjs');

    assert.equal(typeof api.renderDrivetrainSvg, 'function');
    assert.match(api.renderCassetteSvg([11, 13, 15], { style: 'blackGold' }), /^<svg /);
  });

  test('runtime source avoids Node and DOM globals', async () => {
    const files = [
      'src/index.js',
      'src/presets.js',
      'src/cassetteSvgGenerator.js',
      'src/chainringSvgGenerator.js',
      'src/chainSvgGenerator.js',
      'src/drivetrainSvgGenerator.js',
      'src/sprocketGeometry.js'
    ];
    const forbidden = /(?:from ['"]node:|require\(|module\.exports|process\.|document\.|window\.)/;

    await Promise.all(files.map(async (file) => {
      const content = await readFile(file, 'utf8');
      assert.equal(forbidden.test(content), false, `${file} includes a forbidden runtime global`);
    }));
  });

  test('sample SVG files are present and render demo content', async () => {
    const animated = await readFile('examples/svg/drivetrain-animated.svg', 'utf8');
    const singleSpeed = await readFile('examples/svg/single-speed-animated.svg', 'utf8');
    const stack = await readFile('examples/svg/cassette-transparent-stack.svg', 'utf8');
    const flatTopChain = await readFile('examples/svg/chain-flattop-silver.svg', 'utf8');

    assert.match(animated, /<animateMotion/);
    assert.match(animated, /dur="7\.5s"/);
    assert.match(singleSpeed, /<animateMotion/);
    assert.match(singleSpeed, />38T</);
    assert.match(singleSpeed, />18T</);
    assert.match(singleSpeed, /L 6\.35 -4\.318/);
    assert.match(singleSpeed, /dur="5s"/);
    assert.match(stack, /fill="#d7a924"/);
    assert.match(stack, /opacity="0\.34"/);
    assert.match(flatTopChain, /L 50 -34/);
    assert.doesNotMatch(flatTopChain, /C -33\.333 -34, -16\.667 -25, 0 -25/);
    assert.match(flatTopChain, /C -16\.667 25, -33\.333 34, -50 34/);
  });
});
