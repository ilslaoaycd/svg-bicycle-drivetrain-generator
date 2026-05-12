import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import {
  BicycleDrivetrainSVG,
  CassetteSVGGenerator,
  ChainSVGGenerator,
  ChainringSVGGenerator,
  DrivetrainSVGGenerator,
  SprocketGeometry,
  drivetrainPresets,
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
    const stack = await readFile('examples/svg/cassette-transparent-stack.svg', 'utf8');

    assert.match(animated, /<animateMotion/);
    assert.match(animated, /dur="4s"/);
    assert.match(stack, /fill="#d7a924"/);
    assert.match(stack, /opacity="0\.34"/);
  });
});
