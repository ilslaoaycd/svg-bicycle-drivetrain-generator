export const stylePresets = {
  classicSteel: {
    fillColors: ['#d7dee8', '#eef2f7', '#3f4652'],
    outlineColor: '#5f6b7a',
    textColor: '#334155',
    chainOuter: '#cfd6df',
    chainInner: '#9aa7b8',
    chainPin: '#f8fafc'
  },
  blackGold: {
    fillColors: ['#eab308', '#fef08a', '#111827'],
    outlineColor: '#ca8a04',
    textColor: '#0f172a',
    chainOuter: '#facc15',
    chainInner: '#a16207',
    chainPin: '#111827'
  },
  oilSlick: {
    fillColors: ['#22d3ee', '#a78bfa', '#f472b6'],
    outlineColor: '#0f172a',
    textColor: '#111827',
    chainOuter: '#67e8f9',
    chainInner: '#c084fc',
    chainPin: '#fef3c7'
  },
  blueprint: {
    fillColors: ['#dbeafe', '#93c5fd', '#1d4ed8'],
    outlineColor: '#1e40af',
    textColor: '#1e3a8a',
    chainOuter: '#bfdbfe',
    chainInner: '#60a5fa',
    chainPin: '#eff6ff'
  },
  raceRed: {
    fillColors: ['#f87171', '#fecaca', '#991b1b'],
    outlineColor: '#7f1d1d',
    textColor: '#450a0a',
    chainOuter: '#fee2e2',
    chainInner: '#ef4444',
    chainPin: '#ffffff'
  },
  ghostStack: {
    fillColors: ['#94a3b8', '#e2e8f0', '#0f172a'],
    outlineColor: '#334155',
    textColor: '#0f172a',
    layerOpacity: 0.28,
    selectedOpacity: 0.88,
    chainOuter: '#cbd5e1',
    chainInner: '#94a3b8',
    chainPin: '#ffffff'
  },
  xrayCassette: {
    fillColors: ['#67e8f9', '#cffafe', '#0e7490'],
    outlineColor: '#155e75',
    textColor: '#164e63',
    layerOpacity: 0.2,
    selectedOpacity: 0.72,
    chainOuter: '#a5f3fc',
    chainInner: '#22d3ee',
    chainPin: '#ecfeff'
  }
};

export const drivetrainPresets = {
  compactRoad: {
    chainring: 50,
    cogs: [11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32],
    selectedCog: 17,
    chainstay: 410,
    showText: true
  },
  gravelWideRange: {
    chainring: 40,
    cogs: [10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 45, 51],
    selectedCog: 24,
    chainstay: 430,
    showText: true
  },
  mtbTenFiftyTwo: {
    chainring: 32,
    cogs: [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52],
    selectedCog: 36,
    chainstay: 435,
    showText: true
  },
  trackFixie: {
    chainring: 48,
    cogs: [17],
    selectedCog: 17,
    chainstay: 390,
    showText: true
  },
  touringTripleInspired: {
    chainring: 26,
    cogs: [11, 13, 15, 17, 20, 23, 26, 30, 34, 40],
    selectedCog: 30,
    chainstay: 455,
    showText: true
  }
};

export function resolveStylePreset(style) {
  if (!style) return {};
  if (typeof style === 'string') return { ...(stylePresets[style] || {}) };
  return { ...style };
}

export function resolveDrivetrainPreset(preset) {
  if (!preset) return {};
  if (typeof preset === 'string') return { ...(drivetrainPresets[preset] || {}) };
  return { ...preset };
}
