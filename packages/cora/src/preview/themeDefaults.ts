import type { DiagramComponent } from '../layout-ir.js';
import { LOOK } from '../renderer/themes/lookTokens.js';
import { catalogDefaultProps } from '../renderer/themes/componentDefaults.js';
import {
  listDiagramThemes,
  normalizeDiagramThemeName,
  resolveDiagramTheme,
} from '../renderer/themes/registry.js';
import type { PreviewNodeProps } from './controls/defaults.js';
import type { WorkbenchState } from './state.js';

export type ThemeOwnedColorKey =
  | 'backgroundColor'
  | 'borderColor'
  | 'textColor'
  | 'subtitleColor'
  | 'iconColor'
  | 'skeletonColor'
  | 'windowColor'
  | 'windowBarColor'
  | 'windowAddressBarColor';

export function samePreviewColor(
  left: string | undefined,
  right: string | undefined,
): boolean {
  const normalize = (value: string | undefined) => {
    if (value === undefined || value === '' || value === 'none' || value === 'transparent') {
      return 'transparent';
    }
    return value.toLowerCase();
  };

  if (normalize(left) === normalize(right)) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.toLowerCase() === right.toLowerCase();
}

function shapeStyleForComponent(themeTokens: ReturnType<typeof resolveDiagramTheme>, componentId: string) {
  return themeTokens.shapes[componentId] ?? themeTokens.shapes.box!;
}

function themeColorForProperty(
  themeTokens: ReturnType<typeof resolveDiagramTheme>,
  componentId: string,
  property: ThemeOwnedColorKey,
): string | undefined {
  const shape = shapeStyleForComponent(themeTokens, componentId);
  switch (property) {
    case 'backgroundColor':
      return shape.fill;
    case 'borderColor':
      return shape.stroke;
    case 'textColor':
      return shape.labelFill ?? themeTokens.nodeLabel.fill;
    case 'subtitleColor':
      return themeTokens.edgeLabel.fill;
    case 'iconColor':
      return shape.iconColor;
    case 'skeletonColor':
      return shape.skeletonColor;
    case 'windowColor':
      return shape.windowColor;
    case 'windowBarColor':
      return shape.windowBarColor;
    case 'windowAddressBarColor':
      return shape.windowAddressBarColor;
  }
}

export function isThemeOwnedNodeColor(
  value: string | undefined,
  componentId: string,
  property: ThemeOwnedColorKey,
): boolean {
  if (value === undefined || value === '') {
    return true;
  }

  const catalog = catalogDefaultProps(componentId as DiagramComponent);
  const catalogValue = catalog[property] as string | undefined;
  if (catalogValue !== undefined && samePreviewColor(value, catalogValue)) {
    return true;
  }

  for (const theme of listDiagramThemes()) {
    const themeValue = themeColorForProperty(theme.tokens, componentId, property);
    if (themeValue !== undefined && samePreviewColor(value, themeValue)) {
      return true;
    }
  }

  return false;
}

export function isThemeOwnedBorderWidth(
  value: number | undefined,
  componentId: string,
): boolean {
  if (value === undefined) {
    return true;
  }

  const catalog = catalogDefaultProps(componentId as DiagramComponent);
  if (value === catalog.borderWidth) {
    return true;
  }

  for (const theme of listDiagramThemes()) {
    const shape = shapeStyleForComponent(theme.tokens, componentId);
    const width = shape.strokeWidth ?? theme.tokens.strokes.node;
    if (value === width) {
      return true;
    }
  }

  return false;
}

export function isThemeOwnedBorderStyle(
  value: PreviewNodeProps['borderStyle'],
  componentId: string,
): boolean {
  if (value === undefined) {
    return true;
  }

  const catalog = catalogDefaultProps(componentId as DiagramComponent);
  if (value === catalog.borderStyle) {
    return true;
  }

  for (const theme of listDiagramThemes()) {
    const shape = shapeStyleForComponent(theme.tokens, componentId);
    const style = shape.strokeDasharray
      ? 'dashed'
      : shape.stroke === 'none'
        ? 'none'
        : 'solid';
    if (value === style) {
      return true;
    }
  }

  return false;
}

export function isThemeOwnedShadow(
  value: PreviewNodeProps['shadow'],
  componentId: string,
): boolean {
  if (value === undefined) {
    return true;
  }

  const catalog = catalogDefaultProps(componentId as DiagramComponent);
  if (value === catalog.shadow) {
    return true;
  }

  for (const theme of listDiagramThemes()) {
    const shape = shapeStyleForComponent(theme.tokens, componentId);
    const shadow = shape.shadow ? 'cast' : 'none';
    if (value === shadow) {
      return true;
    }
  }

  return false;
}

export function isThemeOwnedFontFamily(value: string | undefined): boolean {
  if (value === undefined || value === '') {
    return true;
  }

  for (const theme of listDiagramThemes()) {
    if (value === theme.tokens.fontFamily) {
      return true;
    }
  }

  return false;
}

export function isThemeOwnedConnectionStroke(value: string | undefined): boolean {
  if (value === undefined || value === '') {
    return true;
  }

  if (samePreviewColor(value, LOOK.edge.stroke)) {
    return true;
  }

  for (const theme of listDiagramThemes()) {
    if (samePreviewColor(value, theme.tokens.edge.stroke)) {
      return true;
    }
  }

  return false;
}

export function previewThemeDefaultsForComponent(
  state: WorkbenchState,
  componentId: string,
): PreviewNodeProps {
  const catalog = catalogDefaultProps(componentId as DiagramComponent);
  const theme = resolveDiagramTheme(normalizeDiagramThemeName(state.diagramTheme));
  const shape = theme.shapes[componentId] ?? theme.shapes.box!;
  const transparentFill = shape.fill === 'none' || shape.fill === 'transparent';

  return {
    ...catalog,
    backgroundColor: transparentFill ? 'transparent' : shape.fill,
    borderColor: shape.stroke === 'none' ? 'transparent' : shape.stroke,
    borderWidth: shape.stroke === 'none' || shape.strokeWidth === 0 ? 0 : (shape.strokeWidth ?? theme.strokes.node),
    borderStyle: shape.stroke === 'none' || shape.strokeWidth === 0 ? 'none' : 'solid',
    textColor: shape.labelFill ?? theme.nodeLabel.fill,
    iconColor: shape.iconColor ?? catalog.iconColor,
    skeletonColor: shape.skeletonColor ?? catalog.skeletonColor,
    windowColor: shape.windowColor ?? catalog.windowColor,
    windowBarColor: shape.windowBarColor ?? catalog.windowBarColor,
    windowAddressBarColor: shape.windowAddressBarColor ?? catalog.windowAddressBarColor,
    fontFamily: theme.fontFamily,
  };
}

export function previewThemeEdgeDefaults(state: WorkbenchState) {
  const theme = resolveDiagramTheme(normalizeDiagramThemeName(state.diagramTheme));
  return {
    strokeColor: theme.edge.stroke,
    strokeWidth: theme.edge.strokeWidth,
  };
}
