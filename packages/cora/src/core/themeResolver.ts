import type { Diagram, DiagramNode, MeasuredNode, ResolvedStyle, ThemeTokens } from './types.js';

function shapeKey(node: DiagramNode): string {
  return node.shape ?? 'rectangle';
}

function resolveNodeStyle(
  node: DiagramNode,
  theme: ThemeTokens,
): ResolvedStyle {
  const key = shapeKey(node);
  const base = theme.shapes[key] ?? theme.shapes.rectangle!;
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
  defaultTheme: ThemeTokens,
): { diagram: Diagram; theme: ThemeTokens; nodeStyles: Map<string, ResolvedStyle> } {
  const themeName = diagram.theme ?? 'default';
  if (themeName !== 'default') {
    throw new Error(`Unknown theme: ${themeName}. Only 'default' is supported.`);
  }

  const nodeStyles = new Map<string, ResolvedStyle>();
  for (const node of diagram.nodes) {
    nodeStyles.set(node.id, resolveNodeStyle(node, defaultTheme));
  }

  return { diagram, theme: defaultTheme, nodeStyles };
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
