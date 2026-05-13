import { CassetteSVGGenerator } from './cassetteSvgGenerator.js';
import { ChainringSVGGenerator } from './chainringSvgGenerator.js';
import { ChainSVGGenerator } from './chainSvgGenerator.js';
import { DrivetrainSVGGenerator } from './drivetrainSvgGenerator.js';
import { SprocketGeometry } from './sprocketGeometry.js';
import {
  drivetrainPresets,
  resolveDrivetrainPreset,
  resolveStylePreset,
  stylePresets
} from './presets.js';

function chainringStyle(options = {}) {
  const styleConfig = {
    ...resolveStylePreset(options.style),
    ...(options.styleConfig || {})
  };
  const fillColors = styleConfig.fillColors || [];

  return {
    ...styleConfig,
    fillColor: styleConfig.fillColor || fillColors[2] || fillColors[0],
    outlineColor: styleConfig.outlineColor,
    textColor: styleConfig.textColor
  };
}

export class BicycleDrivetrainSVG {
  constructor(config = {}) {
    this.config = config;
    this.cassetteGenerator = new CassetteSVGGenerator(config.pitch);
    this.chainringGenerator = new ChainringSVGGenerator(config.pitch);
    this.drivetrainGenerator = new DrivetrainSVGGenerator(config);
  }

  cassette(cogs, options = {}) {
    const view = options.view || 'front';
    const styleConfig = {
      ...resolveStylePreset(options.style),
      ...(options.styleConfig || {})
    };

    return view === 'side'
      ? this.cassetteGenerator.renderSide(cogs, options.direction || 'ltr', styleConfig)
      : this.cassetteGenerator.renderFront(cogs, styleConfig);
  }

  chainring(teeth, options = {}) {
    return this.chainringGenerator.render(teeth, chainringStyle(options));
  }

  chain(linkCount, pathType = 'straight', options = {}) {
    const styleConfig = {
      ...resolveStylePreset(options.style),
      ...(options.styleConfig || {})
    };
    const chainConfig = {
      outerColor: styleConfig.chainOuter || styleConfig.outerColor,
      innerColor: styleConfig.chainInner || styleConfig.innerColor,
      pinColor: styleConfig.chainPin || styleConfig.pinColor,
      rollerColor: styleConfig.rollerColor,
      rollerHoleColor: styleConfig.rollerHoleColor,
      strokeColor: styleConfig.outlineColor || styleConfig.strokeColor,
      showPins: options.showPins,
      showRollers: options.showRollers,
      flatTop: options.flatTop
    };

    Object.keys(chainConfig).forEach((key) => {
      if (chainConfig[key] === undefined) delete chainConfig[key];
    });

    return new ChainSVGGenerator(chainConfig).render(linkCount, pathType, {
      startLink: options.startLink
    });
  }

  drivetrain(options = {}) {
    const { preset, style, styleConfig, ...rest } = options;
    return this.drivetrainGenerator.render({
      ...resolveDrivetrainPreset(preset),
      ...rest,
      styleConfig: {
        ...resolveStylePreset(style),
        ...(styleConfig || {})
      }
    });
  }
}

export function renderCassetteSvg(cogs, options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).cassette(cogs, options);
}

export function renderChainringSvg(teeth, options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).chainring(teeth, options);
}

export function renderChainSvg(linkCount, pathType = 'straight', options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).chain(linkCount, pathType, options);
}

export function renderDrivetrainSvg(options = {}) {
  return new BicycleDrivetrainSVG(options.generatorConfig).drivetrain(options);
}

export {
  CassetteSVGGenerator,
  ChainringSVGGenerator,
  ChainSVGGenerator,
  DrivetrainSVGGenerator,
  SprocketGeometry,
  drivetrainPresets,
  stylePresets
};

export default BicycleDrivetrainSVG;
