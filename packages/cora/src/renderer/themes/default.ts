import type { ThemeTokens } from '../../layout-ir.js';
import { EDGE_FONT_SIZE, NODE_FONT_SIZE } from './fontTokens.js';

const STROKE_WIDTH = 0.75;
const LABEL = '#1A1A1A';
const EDGE = '#37474F';

export const defaultTheme: ThemeTokens = {
  background: '#F4F9FB',
  shapes: {
    rectangle: {
      fill: '#C9B3FF',
      stroke: '#9470DB',
      shadow: '#7050B8',
      strokeWidth: STROKE_WIDTH,
    },
    rounded: {
      fill: '#80CFFF',
      stroke: '#3DAAF0',
      shadow: '#2888CC',
      strokeWidth: STROKE_WIDTH,
    },
    diamond: {
      fill: '#FFB366',
      stroke: '#E89040',
      shadow: '#C87020',
      strokeWidth: STROKE_WIDTH,
    },
    cylinder: {
      fill: '#80E0E0',
      stroke: '#40B8B8',
      shadow: '#289898',
      strokeWidth: STROKE_WIDTH,
    },
    cloud: {
      fill: '#FFF0B3',
      stroke: '#D4BE70',
      shadow: '#B0A040',
      strokeWidth: STROKE_WIDTH,
    },
    hexagon: {
      fill: '#FFE082',
      stroke: '#E8C040',
      shadow: '#C8A020',
      strokeWidth: STROKE_WIDTH,
    },
    group: {
      fill: 'none',
      stroke: '#94A3B8',
      strokeWidth: STROKE_WIDTH,
      strokeDasharray: '4 4',
    },
  },
  edge: { stroke: EDGE, strokeWidth: STROKE_WIDTH },
  nodeLabel: { fontSize: NODE_FONT_SIZE, fontWeight: 600, fill: LABEL },
  edgeLabel: {
    fontSize: EDGE_FONT_SIZE,
    fontWeight: 400,
    fill: LABEL,
  },
  shadowOffset: { x: 0.5, y: 0.5 },
  shadowBlur: 1,
};

export function resolveNodeStyle(
  shape: string | undefined,
): ThemeTokens['shapes'][string] {
  const key = shape ?? 'rectangle';
  return defaultTheme.shapes[key] ?? defaultTheme.shapes.rectangle!;
}
