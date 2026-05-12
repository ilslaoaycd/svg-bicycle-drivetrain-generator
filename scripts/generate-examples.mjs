import { mkdir, writeFile } from 'node:fs/promises';
import {
  renderCassetteSvg,
  renderChainSvg,
  renderChainringSvg,
  renderDrivetrainSvg
} from '../src/index.js';

await mkdir('examples/svg', { recursive: true });

const examples = {
  'cassette-front.svg': renderCassetteSvg(
    [10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 45, 51],
    { style: 'classicSteel' }
  ),
  'cassette-side.svg': renderCassetteSvg(
    [11, 13, 15, 17, 20, 23, 26, 30, 34],
    { view: 'side', direction: 'ltr', style: 'blackGold' }
  ),
  'cassette-transparent-stack.svg': renderCassetteSvg(
    [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52],
    { style: 'xrayCassette' }
  ),
  'chainring.svg': renderChainringSvg(42, { style: 'oilSlick' }),
  'chain-wave.svg': renderChainSvg(18, 'wave', {
    style: 'raceRed',
    showRollers: true
  }),
  'drivetrain-static.svg': renderDrivetrainSvg({
    preset: 'gravelWideRange',
    selectedCog: 33,
    style: 'classicSteel'
  }),
  'drivetrain-animated.svg': renderDrivetrainSvg({
    preset: 'mtbTenFiftyTwo',
    selectedCog: 42,
    style: 'ghostStack',
    animation: {
      enabled: true,
      rpm: 70
    }
  })
};

await Promise.all(
  Object.entries(examples).map(([filename, svg]) => {
    return writeFile(`examples/svg/${filename}`, `${svg}\n`, 'utf8');
  })
);
