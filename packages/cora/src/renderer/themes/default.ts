import type { ThemeTokens } from '../../layout-ir.js';
import { LOOK } from './lookTokens.js';
import {
  NODE_TITLE_SIZE,
  EDGE_LABEL_SIZE,
} from './fontTokens.js';

export const defaultTheme: ThemeTokens = {
  background: LOOK.surface.diagram, // slate-50
  shapes: {
    box: {
      fill: LOOK.surface.fill, // white
      stroke: LOOK.border.default, // slate-300
      strokeWidth: 1,
    },
    label: {
      fill: 'none',
      stroke: 'none',
      labelFill: LOOK.text.standaloneLabel, // slate-800
      strokeWidth: 0,
    },
    icon: {
      fill: 'none',
      stroke: 'none',
      labelFill: LOOK.text.primary,
      strokeWidth: 0,
    },
    labelIcon: {
      fill: LOOK.components.labelIcon.fill,
      stroke: LOOK.components.labelIcon.stroke,
      strokeWidth: 1,
    },
    website: {
      fill: LOOK.components.website.fill,
      stroke: LOOK.components.website.stroke,
      strokeWidth: 1,
    },
    page: {
      fill: LOOK.components.page.fill,
      stroke: LOOK.components.page.stroke,
      strokeWidth: 1,
    },
    app: {
      fill: LOOK.components.app.fill,
      stroke: LOOK.components.app.stroke,
      strokeWidth: 1,
    },
    decision: {
      fill: LOOK.components.decision.fill,
      stroke: LOOK.components.decision.stroke,
      strokeWidth: 1,
    },
    issue: {
      fill: LOOK.components.issue.fill,
      stroke: LOOK.components.issue.stroke,
      strokeWidth: 1,
    },
    shape: {
      fill: LOOK.components.shape.fill,
      stroke: LOOK.components.shape.stroke,
      strokeWidth: 1,
    },
    group: {
      fill: 'none',
      stroke: LOOK.group.stroke,
      strokeWidth: LOOK.group.strokeWidth,
      strokeDasharray: LOOK.group.strokeDasharray,
    },
  },
  edge: {
    stroke: LOOK.edge.stroke,
    strokeWidth: LOOK.edge.width, // 2
  },
  nodeLabel: {
    fontSize: NODE_TITLE_SIZE, // 12
    fontWeight: 600,
    fill: LOOK.text.primary,
  },
  edgeLabel: {
    fontSize: EDGE_LABEL_SIZE, // 10
    fontWeight: 400,
    fill: LOOK.text.edgeLabel,
  },
  shadowOffset: { x: 0, y: 0 },
  shadowBlur: 0,
};

export function resolveNodeStyle(
  component: string | undefined,
): ThemeTokens['shapes'][string] {
  const key = component ?? 'box';
  return defaultTheme.shapes[key] ?? defaultTheme.shapes.box!;
}
