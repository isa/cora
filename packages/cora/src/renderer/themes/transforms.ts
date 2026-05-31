import type { ThemeShapeStyle, ThemeTokens } from '../../layout-ir.js';

export function withoutShadow(theme: ThemeTokens): ThemeTokens {
  const shapes: Record<string, ThemeShapeStyle> = {};
  for (const [key, style] of Object.entries(theme.shapes)) {
    const { shadow: _shadow, ...rest } = style;
    shapes[key] = rest;
  }
  return {
    ...theme,
    shapes,
    shadowOffset: { x: 0, y: 0 },
    shadowBlur: 0,
  };
}

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const GREY = '#808080';

const MONO_WHITE: ThemeShapeStyle = {
  fill: WHITE,
  stroke: BLACK,
  shadow: GREY,
  labelFill: BLACK,
  strokeWidth: 0.75,
};

const MONO_BLACK: ThemeShapeStyle = {
  fill: BLACK,
  stroke: BLACK,
  shadow: GREY,
  labelFill: WHITE,
  strokeWidth: 0.75,
};

const MONO_GREY: ThemeShapeStyle = {
  fill: GREY,
  stroke: BLACK,
  shadow: BLACK,
  labelFill: WHITE,
  strokeWidth: 0.75,
};

const MONO_SHAPES: Record<string, ThemeShapeStyle> = {
  rectangle: MONO_BLACK,
  rounded: MONO_BLACK,
  cloud: MONO_BLACK,
  diamond: MONO_WHITE,
  hexagon: MONO_WHITE,
  cylinder: MONO_GREY,
  group: {
    fill: 'none',
    stroke: BLACK,
    strokeWidth: 0.75,
    strokeDasharray: '4 4',
  },
};

export function toMonochrome(theme: ThemeTokens): ThemeTokens {
  const shapes: Record<string, ThemeShapeStyle> = {};
  for (const key of Object.keys(theme.shapes)) {
    shapes[key] = MONO_SHAPES[key] ?? MONO_WHITE;
  }

  return {
    ...theme,
    background: WHITE,
    shapes,
    edge: { ...theme.edge, stroke: BLACK },
    nodeLabel: { ...theme.nodeLabel, fill: BLACK },
    edgeLabel: { ...theme.edgeLabel, fill: BLACK },
    groupLabel: { ...theme.groupLabel, fill: BLACK },
  };
}

const DARK_PRODUCT_SHAPES: Partial<Record<string, { fill: string; stroke: string }>> = {
  app: { fill: '#27272a', stroke: '#71717a' },
  website: { fill: '#27272a', stroke: '#52525b' },
};

export function toDarkTheme(theme: ThemeTokens): ThemeTokens {
  const shapes: Record<string, ThemeShapeStyle> = {};
  for (const [key, style] of Object.entries(theme.shapes)) {
    const isTransparent = style.fill === 'none' || style.fill === 'transparent';
    const productShape = DARK_PRODUCT_SHAPES[key];
    shapes[key] = {
      ...style,
      fill: isTransparent ? style.fill : (productShape?.fill ?? '#18181b'),
      stroke:
        style.stroke === 'none'
          ? 'none'
          : (productShape?.stroke ?? '#3f3f46'),
      labelFill: style.labelFill && style.labelFill !== 'none' ? '#f4f4f5' : style.labelFill,
    };
  }

  return {
    ...theme,
    background: '#09090b', // Zinc 950
    shapes,
    edge: {
      ...theme.edge,
      stroke: '#71717a', // Zinc 500
    },
    nodeLabel: {
      ...theme.nodeLabel,
      fill: '#f4f4f5', // Zinc 100
    },
    edgeLabel: {
      ...theme.edgeLabel,
      fill: '#a1a1aa', // Zinc 400
    },
  };
}
