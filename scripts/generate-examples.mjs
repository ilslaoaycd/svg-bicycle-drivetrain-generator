import { mkdir, writeFile } from 'node:fs/promises';
import {
  renderCassetteSvg,
  renderChainSvg,
  renderChainringSvg,
  renderDrivetrainSvg
} from '../src/index.js';

await mkdir('examples/svg', { recursive: true });

const sramEagle = [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52];
const shimanoXt = [10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 45, 51];
const sramGxEagle = [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52];
const shimano105 = [11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30, 34];
const campagnoloEkar = [9, 10, 11, 12, 13, 14, 16, 18, 21, 25, 30, 36, 42];

const brushedSteel = {
  fillColors: ['#d8dde3', '#f2f4f7', '#59616c'],
  outlineColor: '#6b7280',
  textColor: '#303946',
  chainOuter: '#d7dce2',
  chainInner: '#a8b0bb',
  chainPin: '#f8fafc'
};

const sramGold = {
  fillColors: ['#d7a924', '#f5d76a', '#2f2410'],
  outlineColor: '#8a6410',
  textColor: '#1f1607',
  layerOpacity: 0.34,
  selectedOpacity: 0.92,
  chainOuter: '#d8dde3',
  chainInner: '#a8b0bb',
  chainPin: '#f8fafc'
};

const darkNickel = {
  fillColors: ['#6b7280', '#b8c0ca', '#1f2937'],
  outlineColor: '#374151',
  textColor: '#111827',
  layerOpacity: 0.32,
  selectedOpacity: 0.85,
  chainOuter: '#b9c0c8',
  chainInner: '#737d89',
  chainPin: '#eef2f7'
};

const blackChrome = {
  fillColors: ['#111827', '#4b5563', '#d1d5db'],
  outlineColor: '#020617',
  textColor: '#111827',
  layerOpacity: 0.3,
  selectedOpacity: 0.88,
  chainOuter: '#2f3742',
  chainInner: '#6b7280',
  chainPin: '#e5e7eb'
};

const warmAlloy = {
  fillColors: ['#c9c0b3', '#eee6d9', '#4b4037'],
  outlineColor: '#7c6f64',
  textColor: '#302821',
  layerOpacity: 0.34,
  selectedOpacity: 0.88,
  chainOuter: '#d7d0c7',
  chainInner: '#a79d93',
  chainPin: '#f8f4ed'
};

const silverChainDarkRingDrivetrain = {
  fillColors: ['#111827', '#cbd5e1', '#2f3742'],
  outlineColor: '#1f2937',
  textColor: '#334155',
  layerOpacity: 0.3,
  selectedOpacity: 0.72,
  chainOuter: '#e5e7eb',
  chainInner: '#aeb7c2',
  chainPin: '#ffffff'
};

const singleSpeedCandy = {
  fillColors: ['#f97316', '#facc15', '#7c3aed'],
  outlineColor: '#312e81',
  textColor: '#312e81',
  layerOpacity: 1,
  selectedOpacity: 1,
  chainOuter: '#67e8f9',
  chainInner: '#f0abfc',
  chainPin: '#fff7ed',
  flatTopChain: true
};

const examples = {
  'cassette-front.svg': renderCassetteSvg(
    shimanoXt,
    { styleConfig: brushedSteel }
  ),
  'cassette-sram-xx1-eagle-10-52-gold.svg': renderCassetteSvg(sramEagle, {
    styleConfig: sramGold
  }),
  'cassette-shimano-xt-m8100-10-51.svg': renderCassetteSvg(shimanoXt, {
    styleConfig: brushedSteel
  }),
  'cassette-sram-gx-eagle-10-52.svg': renderCassetteSvg(sramGxEagle, {
    styleConfig: darkNickel
  }),
  'cassette-shimano-105-r7100-11-34.svg': renderCassetteSvg(shimano105, {
    styleConfig: blackChrome
  }),
  'cassette-campagnolo-ekar-9-42.svg': renderCassetteSvg(campagnoloEkar, {
    styleConfig: warmAlloy
  }),
  'cassette-side.svg': renderCassetteSvg(
    sramEagle,
    { view: 'side', direction: 'ltr', styleConfig: darkNickel }
  ),
  'cassette-transparent-stack.svg': renderCassetteSvg(
    sramEagle,
    { styleConfig: sramGold }
  ),
  'chainring.svg': renderChainringSvg(30, { styleConfig: brushedSteel }),
  'chainring-30t-silver.svg': renderChainringSvg(30, { styleConfig: brushedSteel }),
  'chainring-34t-black.svg': renderChainringSvg(34, { styleConfig: blackChrome }),
  'chainring-40t-alloy.svg': renderChainringSvg(40, { styleConfig: warmAlloy }),
  'chain-wave.svg': renderChainSvg(18, 'wave', {
    styleConfig: {
      chainOuter: '#d7dce2',
      chainInner: '#9aa3ae',
      chainPin: '#f8fafc',
      outlineColor: '#4b5563',
      rollerColor: '#eef2f7',
      rollerHoleColor: '#1f2937'
    },
    showRollers: true
  }),
  'chain-straight-silver.svg': renderChainSvg(16, 'straight', {
    styleConfig: {
      chainOuter: '#e5e7eb',
      chainInner: '#9ca3af',
      chainPin: '#ffffff',
      outlineColor: '#4b5563',
      rollerColor: '#d1d5db',
      rollerHoleColor: '#374151'
    },
    showRollers: true
  }),
  'chain-flattop-silver.svg': renderChainSvg(16, 'straight', {
    styleConfig: {
      chainOuter: '#d9dde2',
      chainInner: '#b4bac2',
      chainPin: '#f8fafc',
      outlineColor: '#6b7280',
      rollerColor: '#e5e7eb',
      rollerHoleColor: '#374151'
    },
    flatTop: true,
    showRollers: true
  }),
  'chain-wrap-black.svg': renderChainSvg(20, 'wrap', {
    styleConfig: {
      chainOuter: '#1f2937',
      chainInner: '#6b7280',
      chainPin: '#e5e7eb',
      outlineColor: '#020617',
      rollerColor: '#9ca3af',
      rollerHoleColor: '#111827'
    },
    showRollers: true
  }),
  'chain-loop-gold.svg': renderChainSvg(22, 'loop', {
    styleConfig: {
      chainOuter: '#d6a21e',
      chainInner: '#806017',
      chainPin: '#fff7d6',
      outlineColor: '#4a3410',
      rollerColor: '#f3d36b',
      rollerHoleColor: '#2b2110'
    },
    showRollers: true
  }),
  'drivetrain-static.svg': renderDrivetrainSvg({
    chainring: 30,
    cogs: sramEagle,
    selectedCog: 36,
    chainstay: 435,
    showText: true,
    styleConfig: silverChainDarkRingDrivetrain
  }),
  'drivetrain-animated.svg': renderDrivetrainSvg({
    chainring: 30,
    cogs: sramEagle,
    selectedCog: 36,
    chainstay: 435,
    showText: true,
    styleConfig: silverChainDarkRingDrivetrain,
    animation: {
      enabled: true,
      rpm: 8
    }
  }),
  'single-speed-animated.svg': renderDrivetrainSvg({
    chainring: 38,
    cogs: [18],
    selectedCog: 18,
    chainstay: 405,
    showText: true,
    styleConfig: singleSpeedCandy,
    animation: {
      enabled: true,
      rpm: 12
    }
  })
};

await Promise.all(
  Object.entries(examples).map(([filename, svg]) => {
    return writeFile(`examples/svg/${filename}`, `${svg}\n`, 'utf8');
  })
);
