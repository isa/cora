import {
  isKnownDiagramTheme,
  listDiagramThemes,
  resolveDiagramTheme,
} from '../renderer/themes/registry.js';
import type { Diagram, DiagramNode, MeasuredNode, ResolvedStyle, ThemeTokens } from './types.js';

function resolveNodeStyle(
  node: DiagramNode,
  theme: ThemeTokens,
): ResolvedStyle {
  const key = node.component ?? 'box';
  const base = theme.shapes[key] ?? theme.shapes.box!;
  const overrides = node.style ?? {};

  return {
    fill: typeof overrides.fill === 'string' ? overrides.fill : base.fill,
    stroke:
      typeof overrides.stroke === 'string' ? overrides.stroke : base.stroke,
    shadow:
      typeof overrides.shadow === 'string' ? overrides.shadow : base.shadow,
    labelFill:
      typeof overrides.labelFill === 'string'
        ? overrides.labelFill
        : base.labelFill,
    strokeWidth:
      typeof overrides.strokeWidth === 'number'
        ? overrides.strokeWidth
        : base.strokeWidth,
    strokeDasharray:
      typeof overrides.strokeDasharray === 'string'
        ? overrides.strokeDasharray
        : base.strokeDasharray,
  };
}

export function resolveTheme(
  diagram: Diagram,
  _defaultTheme: ThemeTokens,
): { diagram: Diagram; theme: ThemeTokens; nodeStyles: Map<string, ResolvedStyle> } {
  const themeName = diagram.theme ?? 'default';
  if (!isKnownDiagramTheme(themeName)) {
    const supported = [...listDiagramThemes().map((theme) => theme.id), 'default'].join(', ');
    throw new Error(`Unknown theme: ${themeName}. Supported themes: ${supported}.`);
  }

  const theme = resolveDiagramTheme(themeName);
  const nodeStyles = new Map<string, ResolvedStyle>();
  for (const node of diagram.nodes) {
    nodeStyles.set(node.id, resolveNodeStyle(node, theme));
  }

  return { diagram, theme, nodeStyles };
}

export function applyNodeStyles(
  measuredNodes: MeasuredNode[],
  nodeStyles: Map<string, ResolvedStyle>,
): MeasuredNode[] {
  return measuredNodes.map((node) => ({
    ...node,
    resolvedStyle: nodeStyles.get(node.id),
  }));
}
