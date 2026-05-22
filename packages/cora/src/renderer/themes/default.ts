import type { ThemeTokens } from '../../layout-ir.js';
import { EDGE_FONT_SIZE, NODE_FONT_SIZE } from './fontTokens.js';

const STROKE_WIDTH = 0.75;
const LABEL = '#1A1A1A';
const EDGE = '#37474F';

export const defaultTheme: ThemeTokens = {
  background: '#F4F9FB',
  shapes: {
    box: {
      fill: '#C9B3FF',
      stroke: '#9470DB',
      shadow: '#7050B8',
      strokeWidth: STROKE_WIDTH,
    },
    label: {
      fill: 'none',
      stroke: 'none',
      labelFill: LABEL,
      strokeWidth: 0,
    },
    icon: {
      fill: 'none',
      stroke: EDGE,
      labelFill: EDGE,
      strokeWidth: STROKE_WIDTH,
    },
    labelIcon: {
      fill: '#80CFFF',
      stroke: '#3DAAF0',
      shadow: '#2888CC',
      strokeWidth: STROKE_WIDTH,
    },
    website: {
      fill: '#FFF0B3',
      stroke: '#D4BE70',
      shadow: '#B0A040',
      strokeWidth: STROKE_WIDTH,
    },
    page: {
      fill: '#E3F2FD',
      stroke: '#64A5D8',
      shadow: '#3E7EAA',
      strokeWidth: STROKE_WIDTH,
    },
    app: {
      fill: '#FFF0B3',
      stroke: '#D4BE70',
      shadow: '#B0A040',
      strokeWidth: STROKE_WIDTH,
    },
    decision: {
      fill: '#FFB366',
      stroke: '#E89040',
      shadow: '#C87020',
      strokeWidth: STROKE_WIDTH,
    },
    issue: {
      fill: '#FFE4E6',
      stroke: '#F43F5E',
      shadow: '#BE123C',
      strokeWidth: STROKE_WIDTH,
    },
    shape: {
      fill: '#80E0E0',
      stroke: '#40B8B8',
      shadow: '#289898',
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
  component: string | undefined,
): ThemeTokens['shapes'][string] {
  const key = component ?? 'box';
  return defaultTheme.shapes[key] ?? defaultTheme.shapes.box!;
}
