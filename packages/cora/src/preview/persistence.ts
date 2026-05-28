import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';

import type {
  Diagram,
  DiagramFile,
  DiagramGroup,
  DiagramNode,
  StructuredError,
} from '../core/types.js';
import { iconReferenceForNode } from '../core/iconify.js';
import { applyNodeStyles, resolveTheme } from '../core/themeResolver.js';
import { validateDocument } from '../core/validator.js';
import { measureNodes } from '../core/measureText.js';
import { defaultTheme } from '../renderer/themes/default.js';
import { builtInPack } from './pack/builtins.js';
import type { PreviewNodeProps } from './controls/defaults.js';
import {
  createDefaultWorkbenchState,
  type CanvasConnection,
  type CanvasGroup,
  type CanvasNode,
  type WorkbenchState,
} from './state.js';

type NodeStyle = Record<string, unknown>;
type GroupStyle = Record<string, unknown>;

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function borderStyleValue(value: unknown): PreviewNodeProps['borderStyle'] {
  return value === 'none' || value === 'solid' || value === 'dashed' || value === 'dotted'
    ? value
    : undefined;
}

function shadowValue(value: unknown): PreviewNodeProps['shadow'] {
  return value === 'none' || value === 'cast' || value === 'radial' ? value : undefined;
}

function sizeValue(value: unknown): PreviewNodeProps['size'] {
  if (value === 'sm' || value === 'md' || value === 'lg' || value === 'xl' || value === 'xxl') {
    return value;
  }
  if (isObjectRecord(value) && typeof value.width === 'number' && typeof value.height === 'number') {
    return { width: value.width, height: value.height };
  }
  return undefined;
}

function iconTypeValue(value: unknown): PreviewNodeProps['iconType'] {
  return value === 'ok' || value === 'nok' || value === 'question-mark' ? value : undefined;
}

function parseDocumentContent(sourceName: string, content: string): unknown {
  const format = sourceName.toLowerCase().endsWith('.json') ? 'json' : 'yaml';

  try {
    return format === 'json' ? JSON.parse(content) : parseYaml(content);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [
      {
        code: 'PARSE_ERROR',
        path: '',
        message: `Failed to parse ${format.toUpperCase()}: ${detail}`,
      },
    ] satisfies StructuredError[];
  }
}

function isErrorList(value: unknown): value is StructuredError[] {
  return Array.isArray(value);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function cloneStyle(style: unknown): Record<string, unknown> {
  return isObjectRecord(style) ? { ...style } : {};
}

function previewNodePropsFromDiagramNode(node: DiagramNode): PreviewNodeProps {
  const defaults = (
    builtInPack.components.find((component) => component.id === (node.component ?? 'box'))?.defaultProps ??
    builtInPack.components.find((component) => component.id === 'box')!.defaultProps
  ) as PreviewNodeProps;
  const style = cloneStyle(node.style);
  const borderStyle =
    typeof style.borderStyle === 'string'
      ? style.borderStyle
      : style.strokeDasharray
        ? 'dashed'
        : style.stroke === 'none' || style.strokeWidth === 0
          ? 'none'
          : defaults.borderStyle;
  const title = typeof style.title === 'string'
    ? style.title
    : typeof style.text === 'string'
      ? style.text
      : node.label;

  return {
    ...defaults,
    title,
    text: stringValue(style.text) ?? title,
    subtitle: stringValue(style.subtitle) ?? defaults.subtitle,
    backgroundColor: stringValue(style.backgroundColor) ?? stringValue(style.fill) ?? defaults.backgroundColor,
    radius: numberValue(style.radius) ?? defaults.radius,
    borderStyle: borderStyleValue(borderStyle) ?? defaults.borderStyle,
    borderColor: stringValue(style.borderColor) ?? stringValue(style.stroke) ?? defaults.borderColor,
    borderWidth: numberValue(style.borderWidth) ?? numberValue(style.strokeWidth) ?? defaults.borderWidth,
    textColor: stringValue(style.textColor) ?? stringValue(style.titleColor) ?? stringValue(style.labelFill) ?? defaults.textColor,
    subtitleColor: stringValue(style.subtitleColor) ?? defaults.subtitleColor,
    skeletonColor: stringValue(style.skeletonColor) ?? defaults.skeletonColor,
    titleFontSize: numberValue(style.titleFontSize) ?? numberValue(style.titleSize) ?? defaults.titleFontSize,
    subtitleFontSize: numberValue(style.subtitleFontSize) ?? defaults.subtitleFontSize,
    titleBold: typeof style.titleBold === 'boolean' ? style.titleBold : defaults.titleBold,
    subtitleBold: typeof style.subtitleBold === 'boolean' ? style.subtitleBold : defaults.subtitleBold,
    shadow: shadowValue(style.shadow) ?? defaults.shadow,
    shadowColor: stringValue(style.shadowColor) ?? defaults.shadowColor,
    size: sizeValue(style.size) ?? defaults.size,
    iconColor: stringValue(style.iconColor) ?? defaults.iconColor,
    iconName: stringValue(style.iconName) ?? iconReferenceForNode(node) ?? defaults.iconName,
    iconType: iconTypeValue(style.iconType) ?? defaults.iconType,
    strokeColor: stringValue(style.strokeColor) ?? defaults.strokeColor,
  };
}

function previewGroupFromDiagramGroup(group: DiagramGroup, index: number): CanvasGroup {
  const style = cloneStyle(group.style);
  const position = isObjectRecord(style.position) &&
    typeof style.position.x === 'number' &&
    typeof style.position.y === 'number'
    ? { x: Math.round(style.position.x), y: Math.round(style.position.y) }
    : { x: 48 + index * 24, y: 48 + index * 24 };
  const size = isObjectRecord(style.size) &&
    typeof style.size.width === 'number' &&
    typeof style.size.height === 'number'
    ? { width: Math.round(style.size.width), height: Math.round(style.size.height) }
    : { width: 280, height: 160 };

  return {
    id: group.id,
    label: group.label,
    position,
    size,
    fillColor:
      typeof style.fillColor === 'string'
        ? style.fillColor
        : typeof style.backgroundColor === 'string'
          ? style.backgroundColor
          : 'none',
    labelColor:
      typeof style.labelColor === 'string'
        ? style.labelColor
        : typeof style.titleColor === 'string'
          ? style.titleColor
          : '#0f172a',
    labelSize:
      typeof style.labelSize === 'number'
        ? style.labelSize
        : typeof style.titleSize === 'number'
          ? style.titleSize
          : 12,
  };
}

async function layoutDiagramForPreview(diagram: Diagram) {
  if ((diagram.layout ?? 'auto') === 'preserve' && diagram.nodes.every((node) => node.position)) {
    return undefined;
  }

  const { computeLayout } = await import('../core/layout.js');
  const { nodeStyles, theme } = resolveTheme(diagram, defaultTheme);
  return computeLayout({
    diagram,
    measuredNodes: applyNodeStyles(measureNodes(diagram.nodes), nodeStyles),
    theme,
  });
}

function nextPreviewId(nodes: CanvasNode[], groups: CanvasGroup[], connections: CanvasConnection[]): number {
  const ids = [
    ...nodes.map((node) => node.id),
    ...groups.map((group) => group.id),
    ...connections.map((connection) => connection.id),
  ];
  const max = ids.reduce((highest, id) => {
    const match = /^(?:node|group|connection)-(\d+)$/.exec(id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return max + 1;
}

function pickConnectionId(edgeIndex: number): string {
  return `connection-${edgeIndex + 1}`;
}

export async function deserializeWorkbenchState(
  sourceName: string,
  content: string,
): Promise<{ state: WorkbenchState } | { errors: StructuredError[] }> {
  const parsed = parseDocumentContent(sourceName, content);
  if (isErrorList(parsed)) {
    return { errors: parsed };
  }

  const errors = validateDocument(parsed);
  if (errors.length > 0) {
    return { errors };
  }

  const document = parsed as DiagramFile;
  const layouted = await layoutDiagramForPreview(document.diagram);
  const connections = document.diagram.edges.map((edge, index) => ({
    id: pickConnectionId(index),
    fromNodeId: edge.from,
    toNodeId: edge.to,
    label: edge.label,
    props: {
      lineStyle: 'solid' as const,
      strokeColor: defaultTheme.edge.stroke,
      strokeWidth: defaultTheme.edge.strokeWidth,
      arrowSize: 8,
      startMarker: edge.startMarker ?? 'none',
      endMarker: edge.endMarker ?? 'arrow',
      connectionMode: 'auto-side' as const,
    },
  }));
  const connectionIdByIndex = new Map(connections.map((connection, index) => [index, connection.id]));

  const nodes = document.diagram.nodes.map((node) => {
    const style = cloneStyle(node.style);
    const attachedEdgeIndex =
      typeof style.attachedEdgeIndex === 'number' ? style.attachedEdgeIndex : undefined;
    const layoutedNode = layouted?.nodes.find((item) => item.id === node.id);

    return {
      id: node.id,
      componentId: node.component ?? 'box',
      props: previewNodePropsFromDiagramNode(node),
      position: {
        x: Math.round(layoutedNode?.x ?? node.position?.x ?? 0),
        y: Math.round(layoutedNode?.y ?? node.position?.y ?? 0),
      },
      attachedConnectionId:
        typeof attachedEdgeIndex === 'number'
          ? connectionIdByIndex.get(attachedEdgeIndex)
          : undefined,
    };
  });

  const groups = (document.diagram.groups ?? []).map((group, index) => {
    const previewGroup = previewGroupFromDiagramGroup(group, index);
    const layoutedGroup = layouted?.groups?.find((item) => item.id === group.id);
    if (!layoutedGroup || isObjectRecord(group.style) && isObjectRecord(group.style.position) && isObjectRecord(group.style.size)) {
      return previewGroup;
    }
    return {
      ...previewGroup,
      position: { x: Math.round(layoutedGroup.x), y: Math.round(layoutedGroup.y) },
      size: { width: Math.round(layoutedGroup.width), height: Math.round(layoutedGroup.height) },
    };
  });

  return {
    state: {
      ...createDefaultWorkbenchState(),
      diagramKind: document.diagram.kind,
      diagramTheme: document.diagram.theme,
      diagramDirection: document.diagram.direction,
      sourceName,
      nodes,
      groups,
      connections,
      nextId: nextPreviewId(nodes, groups, connections),
    },
  };
}

function componentDefaultsFor(state: WorkbenchState, componentId: string): PreviewNodeProps {
  return (
    state.pack.components.find((component) => component.id === componentId)?.defaultProps ??
    builtInPack.components.find((component) => component.id === componentId)?.defaultProps ??
    builtInPack.components.find((component) => component.id === 'box')!.defaultProps
  ) as PreviewNodeProps;
}

function styleValueChanged(current: unknown, baseline: unknown): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

function nodeStyleFromPreviewNode(state: WorkbenchState, node: CanvasNode, attachedEdgeIndex?: number): NodeStyle | undefined {
  const defaults = componentDefaultsFor(state, node.componentId);
  const style: NodeStyle = {};
  const props = node.props;

  const assignIfChanged = (key: keyof PreviewNodeProps | 'attachedEdgeIndex', value: unknown, baseline?: unknown) => {
    if (value === undefined) {
      return;
    }
    if (baseline !== undefined && !styleValueChanged(value, baseline)) {
      return;
    }
    style[key] = value;
  };

  assignIfChanged('title', props.title, defaults.title);
  assignIfChanged('text', props.text, defaults.text);
  assignIfChanged('subtitle', props.subtitle, defaults.subtitle);
  assignIfChanged('backgroundColor', props.backgroundColor, defaults.backgroundColor);
  assignIfChanged('radius', props.radius, defaults.radius);
  assignIfChanged('borderStyle', props.borderStyle, defaults.borderStyle);
  assignIfChanged('borderColor', props.borderColor, defaults.borderColor);
  assignIfChanged('borderWidth', props.borderWidth, defaults.borderWidth);
  assignIfChanged('textColor', props.textColor, defaults.textColor);
  assignIfChanged('subtitleColor', props.subtitleColor, defaults.subtitleColor);
  assignIfChanged('skeletonColor', props.skeletonColor, defaults.skeletonColor);
  assignIfChanged('titleFontSize', props.titleFontSize, defaults.titleFontSize);
  assignIfChanged('subtitleFontSize', props.subtitleFontSize, defaults.subtitleFontSize);
  assignIfChanged('titleBold', props.titleBold, defaults.titleBold);
  assignIfChanged('subtitleBold', props.subtitleBold, defaults.subtitleBold);
  assignIfChanged('shadow', props.shadow, defaults.shadow);
  assignIfChanged('shadowColor', props.shadowColor, defaults.shadowColor);
  assignIfChanged('size', props.size, defaults.size);
  assignIfChanged('iconColor', props.iconColor, defaults.iconColor);
  assignIfChanged('iconType', props.iconType, defaults.iconType);
  assignIfChanged('strokeColor', props.strokeColor, defaults.strokeColor);

  const iconName = props.iconName;
  if (typeof iconName === 'string' && iconName.trim() && iconName !== defaults.iconName) {
    style.iconName = iconName;
  }

  if (attachedEdgeIndex !== undefined) {
    style.attachedEdgeIndex = attachedEdgeIndex;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function groupStyleFromPreviewGroup(group: CanvasGroup): GroupStyle {
  const style: GroupStyle = {
    position: group.position,
    size: group.size,
  };

  if (group.fillColor !== 'none') {
    style.fillColor = group.fillColor;
  }
  if (group.labelColor !== '#0f172a') {
    style.labelColor = group.labelColor;
  }
  if (group.labelSize !== 12) {
    style.labelSize = group.labelSize;
  }

  return style;
}

function groupContainsNode(group: CanvasGroup, node: CanvasNode): boolean {
  const defaults = builtInPack.components.find((component) => component.id === node.componentId)?.defaultProps;
  const size = node.props.size;
  const width =
    typeof size === 'string'
      ? undefined
      : isObjectRecord(size) && typeof size.width === 'number'
        ? size.width
        : undefined;
  const height =
    typeof size === 'string'
      ? undefined
      : isObjectRecord(size) && typeof size.height === 'number'
        ? size.height
        : undefined;
  const centerX = node.position.x + (width ?? (typeof defaults?.size === 'object' && defaults.size ? (defaults.size as { width: number }).width : 128)) / 2;
  const centerY = node.position.y + (height ?? (typeof defaults?.size === 'object' && defaults.size ? (defaults.size as { height: number }).height : 56)) / 2;
  return (
    centerX >= group.position.x &&
    centerX <= group.position.x + group.size.width &&
    centerY >= group.position.y &&
    centerY <= group.position.y + group.size.height
  );
}

export function serializeWorkbenchDocument(state: WorkbenchState): DiagramFile {
  const edgeIndexByConnectionId = new Map(state.connections.map((connection, index) => [connection.id, index]));
  const nodes = state.nodes.map((node): DiagramNode => ({
    id: node.id,
    label: node.props.title ?? node.props.text ?? '',
    component: node.componentId as DiagramNode['component'],
    position: { x: node.position.x, y: node.position.y },
    icon: node.props.iconName?.trim() ? node.props.iconName : undefined,
    style: nodeStyleFromPreviewNode(
      state,
      node,
      node.attachedConnectionId ? edgeIndexByConnectionId.get(node.attachedConnectionId) : undefined,
    ),
  }));
  const groups = state.groups.map((group): DiagramGroup => ({
    id: group.id,
    label: group.label,
    contains: state.nodes.filter((node) => groupContainsNode(group, node)).map((node) => node.id),
    style: groupStyleFromPreviewGroup(group),
  }));

  return {
    version: 1,
    diagram: {
      kind: state.diagramKind,
      layout: 'preserve',
      theme: state.diagramTheme,
      direction: state.diagramDirection,
      nodes,
      edges: state.connections.map((connection) => ({
        from: connection.fromNodeId,
        to: connection.toNodeId,
        label: connection.label,
        startMarker: connection.props.startMarker,
        endMarker: connection.props.endMarker,
      })),
      groups,
    },
  };
}

export function serializeWorkbenchYaml(state: WorkbenchState): string {
  return stringifyYaml(serializeWorkbenchDocument(state), {
    defaultStringType: 'PLAIN',
    lineWidth: 0,
  });
}
