import {
  DEFAULT_THEME_ID,
  findDiagramTheme,
  listInstalledThemeIds,
  normalizeDiagramThemeName,
  resolveDiagramTheme,
  resolveThemeNameInput,
} from '../renderer/themes/registry.js';
import type { Diagram, DiagramNode, MeasuredNode, ResolvedStyle, ThemeTokens } from './types.js';

function normalizeNodeStyle(
  style: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!style) {
    return {};
  }

  const normalized: Record<string, unknown> = { ...style };

  if (normalized.backgroundColor !== undefined && normalized.fill === undefined) {
    normalized.fill = normalized.backgroundColor;
  }
  if (normalized.fillColor !== undefined && normalized.fill === undefined) {
    normalized.fill = normalized.fillColor;
  }
  if (normalized.borderColor !== undefined && normalized.stroke === undefined) {
    normalized.stroke = normalized.borderColor;
  }
  if (normalized.textColor !== undefined && normalized.labelFill === undefined) {
    normalized.labelFill = normalized.textColor;
  }
  if (normalized.titleColor !== undefined && normalized.labelFill === undefined) {
    normalized.labelFill = normalized.titleColor;
  }
  if (normalized.labelColor !== undefined && normalized.labelFill === undefined) {
    normalized.labelFill = normalized.labelColor;
  }
  if (normalized.borderWidth !== undefined && normalized.strokeWidth === undefined) {
    normalized.strokeWidth = normalized.borderWidth;
  }

  return normalized;
}

function resolveNodeStyle(
  node: DiagramNode,
  theme: ThemeTokens,
): ResolvedStyle {
  const key = node.component ?? 'box';
  const base = theme.shapes[key] ?? theme.shapes.box!;
  const overrides = normalizeNodeStyle(node.style);

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
    iconColor:
      typeof overrides.iconColor === 'string'
        ? overrides.iconColor
        : base.iconColor,
    skeletonColor:
      typeof overrides.skeletonColor === 'string'
        ? overrides.skeletonColor
        : base.skeletonColor,
  };
}

export function resolveTheme(
  diagram: Diagram,
  _defaultTheme?: ThemeTokens,
): { diagram: Diagram; theme: ThemeTokens; nodeStyles: Map<string, ResolvedStyle> } {
  const themeName = diagram.theme ?? DEFAULT_THEME_ID;
  const normalized = normalizeDiagramThemeName(themeName);
  const resolvedId = resolveThemeNameInput(normalized) ?? normalized;

  if (!findDiagramTheme(resolvedId)) {
    const supported = listInstalledThemeIds().join(', ');
    throw new Error(
      `Unknown theme: ${themeName}. Supported themes: ${supported}.`,
    );
  }

  const theme = resolveDiagramTheme(resolvedId);
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

export {
  DEFAULT_THEME_ID,
  findDiagramTheme,
  listInstalledThemeIds,
  normalizeDiagramThemeName,
  resolveThemeNameInput,
};
