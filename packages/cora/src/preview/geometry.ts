import {
  resolveComponentSize,
  resolveWebsiteComponentSize,
  resolveAppComponentSize,
  resolveApiComponentSize,
  resolveDatabaseComponentSize,
  resolveDocumentComponentSize,
  resolveLabelIconComponentSize,
  APP_SIZE_PRESETS,
  API_SIZE_PRESETS,
  DATABASE_SIZE_PRESETS,
  DOCUMENT_SIZE_PRESETS,
  WEBSITE_SIZE_PRESETS,
  LABEL_ICON_SIZE_PRESETS,
  ICON_NODE_ART_SIZE,
  iconNodeScale,
} from '../renderer/components/styles.js';
import { resolveCatalogTextLayout } from '../core/catalogTextLayout.js';
import {
  chooseConnectionSides,
  connectionAnchorBox,
  sidePoint,
  type AnchorNode,
  type Side,
} from '../core/connectionAnchors.js';
import { markerShaftTrim } from '../core/edgeMarkers.js';
import type { ConnectionProps } from './controls/defaults.js';
import type { CanvasConnection, CanvasNode, WorkbenchState } from './state.js';

export { chooseConnectionSides, sidePoint };
export type { Side };

export interface PreviewBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttachmentSlot {
  nodeId: string;
  side: Side;
  index: number;
  label: string;
  x: number;
  y: number;
}

function nodeText(node: CanvasNode): string {
  return String(node.props.title ?? node.props.text ?? '');
}

function nodeSubtitle(node: CanvasNode): string {
  return String(node.props.subtitle ?? '');
}

function nodeTitleFontSize(node: CanvasNode, fallback = 12): number {
  return node.props.titleFontSize ?? fallback;
}

function nodeSubtitleFontSize(node: CanvasNode, fallback = 13): number {
  return node.props.subtitleFontSize ?? Math.max(8, nodeTitleFontSize(node, fallback) - 2);
}

function wrappedTextHeight(
  node: CanvasNode,
  width: number,
  titleFontSize: number,
  subtitleFontSize: number,
): number {
  return resolveCatalogTextLayout({
    text: nodeText(node),
    subtitle: nodeSubtitle(node),
    width,
    fontSize: titleFontSize,
    subtitleFontSize,
  }).totalHeight;
}

function previewBaseSize(node: CanvasNode): { width: number; height: number } {
  return node.componentId === 'app'
    ? resolveAppComponentSize(node.props.size, APP_SIZE_PRESETS.lg)
    : node.componentId === 'api'
      ? resolveApiComponentSize(node.props.size, API_SIZE_PRESETS.lg)
      : node.componentId === 'database'
        ? resolveDatabaseComponentSize(node.props.size, DATABASE_SIZE_PRESETS.lg)
        : node.componentId === 'document'
          ? resolveDocumentComponentSize(node.props.size, DOCUMENT_SIZE_PRESETS.lg)
          : node.componentId === 'website'
            ? resolveWebsiteComponentSize(node.props.size, WEBSITE_SIZE_PRESETS.lg)
            : node.componentId === 'labelIcon'
              ? resolveLabelIconComponentSize(node.props.size, LABEL_ICON_SIZE_PRESETS.lg)
              : node.componentId === 'icon'
                ? resolveAppComponentSize(node.props.size, APP_SIZE_PRESETS.lg)
                : resolveComponentSize(node.props.size, { width: 140, height: 56 });
}

export function previewNodeSize(node: CanvasNode): { width: number; height: number } {
  const base = previewBaseSize(node);
  const title = nodeText(node);
  const subtitle = nodeSubtitle(node);
  const titleFontSize = nodeTitleFontSize(node);
  const subtitleFontSize = nodeSubtitleFontSize(node);
  const hasText = Boolean(title || subtitle);

  if (node.componentId === 'box') {
    const lines = title ? title.split(/\r?\n/) : [];
    const subtitleLines = subtitle ? subtitle.split(/\r?\n/) : [];
    const longestLine = Math.max(...lines.map((line) => line.length), 1);
    const longestSubtitle = Math.max(...subtitleLines.map((line) => line.length), 0);
    const textWidth = Math.ceil(Math.max(longestLine * titleFontSize * 0.56, longestSubtitle * subtitleFontSize * 0.56) + 16);
    const textHeight = Math.ceil(
      16 +
      lines.length * titleFontSize * 1.25 +
      (lines.length > 0 && subtitleLines.length > 0 ? 3 : 0) +
      subtitleLines.length * subtitleFontSize * 1.25,
    );
    return {
      width: Math.max(base.width, textWidth),
      height: Math.max(base.height, textHeight),
    };
  }

  if (node.componentId === 'label') {
    const textHeight = Math.ceil(wrappedTextHeight(node, base.width, titleFontSize, subtitleFontSize) + 16);
    return {
      width: base.width,
      height: Math.max(28, base.height, textHeight),
    };
  }

  if (node.componentId === 'icon') {
    const ratio = iconNodeScale(base);
    const iconSize = ICON_NODE_ART_SIZE * ratio;
    const textHeight = hasText
      ? wrappedTextHeight(node, base.width - 16, titleFontSize * ratio, subtitleFontSize * ratio)
      : 0;
    const requiredHeight = hasText ? 6 * ratio + iconSize + 6 * ratio + textHeight : base.height;
    return { width: base.width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  if (node.componentId === 'labelIcon') {
    if (node.props.iconType) {
      return base;
    }
    return {
      width: base.width,
      height: Math.max(base.height, previewLabelIconContentHeight(node)),
    };
  }

  if (node.componentId === 'app' || node.componentId === 'database') {
    const ratio = iconNodeScale(base);
    const artSize = ICON_NODE_ART_SIZE * ratio;
    const textHeight = hasText
      ? wrappedTextHeight(node, base.width, titleFontSize * ratio, subtitleFontSize * ratio)
      : 0;
    const requiredHeight = hasText
      ? 6 * ratio + artSize + 8 * ratio + textHeight + 6 * ratio
      : base.height;
    return { width: base.width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  if (node.componentId === 'api') {
    const ratio = base.width / API_SIZE_PRESETS.lg.width;
    const artSize = ICON_NODE_ART_SIZE * ratio;
    const textHeight = hasText
      ? wrappedTextHeight(node, base.width, titleFontSize * ratio, subtitleFontSize * ratio)
      : 0;
    const requiredHeight = hasText
      ? 6 * ratio + artSize + 8 * ratio + textHeight + 6 * ratio
      : base.height;
    return { width: base.width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  if (node.componentId === 'document') {
    const ratio = base.width / DOCUMENT_SIZE_PRESETS.lg.width;
    const artSize = ICON_NODE_ART_SIZE * ratio;
    const textHeight = hasText
      ? wrappedTextHeight(node, base.width, titleFontSize * ratio, subtitleFontSize * ratio)
      : 0;
    const requiredHeight = hasText
      ? 12 * ratio + artSize + 8 * ratio + textHeight + 8 * ratio
      : base.height;
    return { width: base.width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  if (node.componentId === 'website') {
    const width = hasText ? Math.max(base.width, 64) : base.width;
    const titleSize = node.props.titleFontSize ?? 12;
    const subtitleSize = node.props.subtitleFontSize ?? Math.max(8, titleSize - 2);
    const textHeight = hasText
      ? wrappedTextHeight(node, width, titleSize, subtitleSize)
      : 0;
    const requiredHeight = hasText
      ? 6 + 24 + 8 + textHeight + 6
      : base.height;
    return { width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  return base;
}

/**
 * Intrinsic height of an icon-label node's *visible* content (icon + text below
 * it), top-aligned within the node box. The node box height is clamped up to the
 * size-preset minimum, which can leave dead space below the content; gapping the
 * connection line should track this tight content height, not the padded box.
 */
export function previewLabelIconContentHeight(node: CanvasNode): number {
  const base = previewBaseSize(node);
  if (node.props.iconType) {
    return base.height;
  }
  const ratio = iconNodeScale(base);
  const iconSize = ICON_NODE_ART_SIZE * ratio;
  const hasText = Boolean(nodeText(node) || nodeSubtitle(node));
  if (!hasText) {
    return base.height;
  }
  const textWidth = Math.max(120, base.width * 2.5);
  const textHeight = wrappedTextHeight(
    node,
    textWidth,
    nodeTitleFontSize(node) * ratio,
    nodeSubtitleFontSize(node) * ratio,
  );
  return Math.ceil(2 * ratio + iconSize + 4 * ratio + textHeight);
}

/**
 * Rendered size of a label node's text (longest wrapped line + wrapped height),
 * as opposed to its fixed box width. Used to tightly gap the connection line
 * around the visible text rather than the whole node box.
 */
export function previewLabelContentSize(node: CanvasNode): { width: number; height: number } {
  const base = previewBaseSize(node);
  const layout = resolveCatalogTextLayout({
    text: nodeText(node),
    subtitle: nodeSubtitle(node),
    width: base.width,
    fontSize: nodeTitleFontSize(node),
    subtitleFontSize: nodeSubtitleFontSize(node),
  });
  return { width: layout.contentWidth, height: layout.totalHeight };
}

export function computeNodeBox(state: WorkbenchState, nodeId: string): PreviewBox | undefined {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return undefined;
  }
  const size = previewNodeSize(node);
  // For an attached icon-label, where the icon centre sits on the line and how
  // far the content reaches around it (icon above, text below) — fed to the
  // anchor maths so the content always clears the line ending.
  const labelIconLayout = node.componentId === 'labelIcon'
    ? (() => {
        const ratio = iconNodeScale(size);
        const hasText = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
        const iconSize = node.props.iconType ? Math.min(size.width, size.height) * 0.62 : ICON_NODE_ART_SIZE * ratio;
        const iconYOffset = node.props.iconType
          ? (size.height - iconSize) / 2
          : hasText
          ? 2 * ratio
          : (size.height - iconSize) / 2;
        const iconCenterYOffset = iconYOffset + iconSize / 2;
        const contentHeight = node.props.iconType ? size.height : previewLabelIconContentHeight(node);
        return {
          iconCenterYOffset,
          extents: {
            halfWidth: size.width / 2,
            up: iconCenterYOffset,
            down: Math.max(0, contentHeight - iconCenterYOffset),
          },
        };
      })()
    : undefined;
  const attachedCenter = node.attachedConnectionId
    ? node.componentId === 'labelIcon'
      ? computeConnectionLabelIconCenter(state, node.attachedConnectionId, size, {
          x: node.position.x + size.width / 2,
          y: node.position.y + size.height / 2,
        }, node.attachedEnd, labelIconLayout!.extents)
      : computeConnectionCenter(state, node.attachedConnectionId)
    : undefined;
  let position = node.position;
  if (attachedCenter) {
    if (node.componentId === 'labelIcon') {
      position = {
        x: attachedCenter.x - size.width / 2,
        y: attachedCenter.y - labelIconLayout!.iconCenterYOffset,
      };
    } else {
      position = {
        x: attachedCenter.x - size.width / 2,
        y: attachedCenter.y - size.height / 2,
      };
    }
  }

  return {
    id: node.id,
    ...position,
    ...size,
  };
}

function iconVisualBox(state: WorkbenchState, nodeId: string): PreviewBox | undefined {
  const node = state.nodes.find((item) => item.id === nodeId);
  const box = computeNodeBox(state, nodeId);
  if (!node || !box) {
    return box;
  }

  // IconNode: horizontally narrowed to the icon artwork; vertically extends
  // to the full node bottom so that bottom-exiting lines clear title/subtitle.
  if (node.componentId === 'icon') {
    const ratio = iconNodeScale(box);
    const iconSize = ICON_NODE_ART_SIZE * ratio;
    const hasText = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
    const iconY = box.y + (hasText ? 6 * ratio : (box.height - iconSize) / 2);
    const bottomEdge = box.y + box.height;

    return {
      id: box.id,
      x: box.x + (box.width - iconSize) / 2,
      y: iconY,
      width: iconSize,
      height: bottomEdge - iconY,
    };
  }

  // AppNode: horizontally narrowed to the phone artwork; vertically extends
  // to the full node bottom so that bottom-exiting lines clear title/subtitle.
  if (node.componentId === 'app') {
    const ratio = iconNodeScale(box);
    const ARTBOARD = 24;
    const scale = (ICON_NODE_ART_SIZE / ARTBOARD) * ratio;
    const artSize = ARTBOARD * scale;

    const hasLabel = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
    const textHeight = hasLabel
      ? wrappedTextHeight(
          node,
          box.width,
          (node.props.titleFontSize ?? 12) * ratio,
          (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio,
        )
      : 0;
    const labelGap = (hasLabel ? 8 : 0) * ratio;
    const topPadding = (hasLabel ? 6 : 0) * ratio;
    const bottomPadding = (hasLabel ? 6 : 0) * ratio;
    const offsetY = box.y + topPadding + (box.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;
    const bottomEdge = box.y + box.height;

    return {
      id: box.id,
      x: box.x + (box.width - artSize) / 2,
      y: offsetY,
      width: artSize,
      height: bottomEdge - offsetY,
    };
  }

  return box;
}

function previewAnchorNode(state: WorkbenchState, nodeId: string): AnchorNode | undefined {
  const node = state.nodes.find((item) => item.id === nodeId);
  const box = computeNodeBox(state, nodeId);
  if (!node || !box) {
    return undefined;
  }

  return {
    ...box,
    component: node.componentId as AnchorNode['component'],
    text: node.props.title ?? node.props.text,
    subtitle: node.props.subtitle,
    titleFontSize: node.props.titleFontSize,
    subtitleFontSize: node.props.subtitleFontSize,
    iconType: node.props.iconType,
  };
}

export function computeConnectionPointsForBoxes(
  source: PreviewBox,
  target: PreviewBox,
): Array<{ x: number; y: number }> {
  const { sourceSide, targetSide } = chooseConnectionSides(source, target);
  const start = sidePoint(source, sourceSide);
  const end = sidePoint(target, targetSide);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  if (sourceSide === 'left' || sourceSide === 'right') {
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}

export function computeConnectionPoints(
  state: WorkbenchState,
  connection: CanvasConnection,
): Array<{ x: number; y: number }> {
  const source = iconVisualBox(state, connection.fromNodeId);
  const target = iconVisualBox(state, connection.toNodeId);
  if (!source || !target) {
    return [];
  }
  const { sourceSide, targetSide } = chooseConnectionSides(source, target);
  const ratios = computeConnectionAnchorRatios(state, connection.id);
  const sourceAnchorNode = previewAnchorNode(state, connection.fromNodeId);
  const targetAnchorNode = previewAnchorNode(state, connection.toNodeId);
  const sourceAnchorBox = sourceAnchorNode ? connectionAnchorBox(sourceAnchorNode, sourceSide) : source;
  const targetAnchorBox = targetAnchorNode ? connectionAnchorBox(targetAnchorNode, targetSide) : target;
  const start = sidePoint(sourceAnchorBox, sourceSide, ratios.sourceRatio);
  const end = sidePoint(targetAnchorBox, targetSide, ratios.targetRatio);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  if (sourceSide === 'left' || sourceSide === 'right') {
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}

export function applyConnectionMarkerInsets(
  points: Array<{ x: number; y: number }>,
  props: Pick<ConnectionProps, 'startMarker' | 'endMarker' | 'arrowSize'>,
): Array<{ x: number; y: number }> {
  if (points.length < 2) {
    return points;
  }
  const next = points.map((point) => ({ ...point }));
  const endInset = previewMarkerInset(props.endMarker, props.arrowSize);
  const startInset = previewMarkerInset(props.startMarker, props.arrowSize);
  if (endInset > 0) {
    next[next.length - 1] = offsetPointToward(
      next[next.length - 1]!,
      next[next.length - 2]!,
      endInset,
    );
  }
  if (startInset > 0) {
    next[0] = offsetPointToward(next[0]!, next[1]!, startInset);
  }
  return next;
}

function previewMarkerInset(marker: ConnectionProps['startMarker'], markerSize: number): number {
  return markerShaftTrim(marker, markerSize);
}

function offsetPointToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0 || distance <= 0) {
    return from;
  }
  const ratio = Math.min(distance / length, 0.5);
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

export function computeConnectionAnchorRatios(
  state: WorkbenchState,
  connectionId: string,
): { sourceRatio: number; targetRatio: number } {
  const endpointGroups = new Map<string, Array<{ connectionId: string; role: 'source' | 'target'; sortCoord: number }>>();

  for (const connection of state.connections) {
    const source = iconVisualBox(state, connection.fromNodeId);
    const target = iconVisualBox(state, connection.toNodeId);
    if (!source || !target) {
      continue;
    }
    const { sourceSide, targetSide } = chooseConnectionSides(source, target);
    const sourceAnchorNode = previewAnchorNode(state, connection.fromNodeId);
    const targetAnchorNode = previewAnchorNode(state, connection.toNodeId);
    const sourceAnchorBox = sourceAnchorNode ? connectionAnchorBox(sourceAnchorNode, sourceSide) : source;
    const targetAnchorBox = targetAnchorNode ? connectionAnchorBox(targetAnchorNode, targetSide) : target;
    const sourceSortCoord = sourceSide === 'left' || sourceSide === 'right'
      ? target.y + target.height / 2
      : target.x + target.width / 2;
    const targetSortCoord = targetSide === 'left' || targetSide === 'right'
      ? source.y + source.height / 2
      : source.x + source.width / 2;
    const endpoints = [
      { nodeId: sourceAnchorBox.id, side: sourceSide, role: 'source' as const, sortCoord: sourceSortCoord },
      { nodeId: targetAnchorBox.id, side: targetSide, role: 'target' as const, sortCoord: targetSortCoord },
    ];

    for (const endpoint of endpoints) {
      const key = `${endpoint.nodeId}:${endpoint.side}`;
      const group = endpointGroups.get(key) ?? [];
      group.push({
        connectionId: connection.id,
        role: endpoint.role,
        sortCoord: endpoint.sortCoord,
      });
      endpointGroups.set(key, group);
    }
  }

  let sourceRatio = 0.5;
  let targetRatio = 0.5;
  for (const group of endpointGroups.values()) {
    group.sort((a, b) =>
      a.sortCoord - b.sortCoord ||
      a.connectionId.localeCompare(b.connectionId) ||
      a.role.localeCompare(b.role)
    );
    group.forEach((endpoint, index) => {
      if (endpoint.connectionId !== connectionId) {
        return;
      }
      const ratio = (index + 1) / (group.length + 1);
      if (endpoint.role === 'source') {
        sourceRatio = ratio;
      } else {
        targetRatio = ratio;
      }
    });
  }

  return { sourceRatio, targetRatio };
}

export function connectionCenter(points: Array<{ x: number; y: number }>): { x: number; y: number } | undefined {
  if (points.length === 0) {
    return undefined;
  }
  if (points.length === 1) {
    return points[0];
  }

  const lengths = points.slice(1).map((point, index) => {
    const previous = points[index]!;
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  const midpoint = totalLength / 2;
  let cursor = 0;

  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!;
    if (cursor + length >= midpoint) {
      const start = points[index]!;
      const end = points[index + 1]!;
      const ratio = length === 0 ? 0 : (midpoint - cursor) / length;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    cursor += length;
  }

  return points.at(-1);
}

export function computeConnectionCenter(
  state: WorkbenchState,
  connectionId: string,
): { x: number; y: number } | undefined {
  const connection = state.connections.find((item) => item.id === connectionId);
  return connection ? connectionCenter(computeConnectionPoints(state, connection)) : undefined;
}

// Fixed distance an on-line icon sits from the nearer node, independent of its
// own size, so resizing scales it in place rather than sliding it.
const LABEL_ICON_LINE_OFFSET = 40;

// Decide which end of a connection a point is nearer to. Used once when an icon
// is placed/dragged; the result is persisted so later box moves can't flip it.
export function connectionLabelIconEnd(
  state: WorkbenchState,
  connectionId: string,
  point: { x: number; y: number },
): 'source' | 'target' | undefined {
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return undefined;
  }
  const points = computeConnectionPoints(state, connection);
  if (points.length < 2) {
    return 'source';
  }
  const source = points[0]!;
  const target = points[points.length - 1]!;
  const sourceDistance = Math.hypot(point.x - source.x, point.y - source.y);
  const targetDistance = Math.hypot(point.x - target.x, point.y - target.y);
  return targetDistance < sourceDistance ? 'target' : 'source';
}

// Room reserved between the node's content and the line ending so the shaft and
// its arrow head always stay visible past the label/icon.
const LABEL_ICON_END_CLEARANCE = 18;

// How far the node's content reaches from the icon centre toward `dir` (a unit
// vector along the terminal segment, pointing at the endpoint). The icon sits at
// the top of the box and the text below it, so the up/down reach differ.
function contentReachTowardEndpoint(
  dir: { x: number; y: number },
  extents: { halfWidth: number; up: number; down: number },
): number {
  const vertical = dir.y >= 0 ? extents.down : extents.up;
  return Math.abs(dir.x) * extents.halfWidth + Math.abs(dir.y) * vertical;
}

export function computeConnectionLabelIconCenter(
  state: WorkbenchState,
  connectionId: string,
  size: { width: number; height: number } = { width: 40, height: 40 },
  preferredPoint?: { x: number; y: number },
  end?: 'source' | 'target',
  // The node's content reach from the icon centre: half its width, and how far
  // the content extends above (icon) and below (text) the icon centre.
  extents?: { halfWidth: number; up: number; down: number },
): { x: number; y: number } | undefined {
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return undefined;
  }
  const points = computeConnectionPoints(state, connection);
  void size;
  // A persisted end wins: it keeps the icon on the same side no matter how the
  // connected boxes are moved. Fall back to the nearest-end heuristic only when
  // no end has been recorded yet (e.g. legacy diagrams).
  const resolvedEnd = end
    ?? (preferredPoint && points.length > 1
      ? connectionLabelIconEnd(state, connectionId, preferredPoint)
      : undefined);
  const walk = resolvedEnd === 'target' ? [...points].reverse() : points;

  // Anchor a fixed distance from the chosen end, but push the icon further in if
  // its content (icon + text below) would otherwise reach the endpoint — so the
  // shaft and arrow head always have room, regardless of size or orientation.
  let distance = LABEL_ICON_LINE_OFFSET;
  if (extents && walk.length > 1) {
    const dx = walk[0]!.x - walk[1]!.x;
    const dy = walk[0]!.y - walk[1]!.y;
    const len = Math.hypot(dx, dy) || 1;
    const reach = contentReachTowardEndpoint({ x: dx / len, y: dy / len }, extents);
    distance = Math.max(distance, reach + LABEL_ICON_END_CLEARANCE);
  }

  return pointAlongPath(walk, distance);
}

function pointAlongPath(
  points: Array<{ x: number; y: number }>,
  distance: number,
): { x: number; y: number } | undefined {
  if (points.length === 0) {
    return undefined;
  }
  if (points.length === 1 || distance <= 0) {
    return points[0];
  }

  let remaining = distance;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1]!;
    const end = points[index]!;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (remaining <= length) {
      const ratio = length === 0 ? 0 : remaining / length;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    remaining -= length;
  }

  return points.at(-1);
}

export function computeAttachmentSlots(
  box: PreviewBox,
  side: Side,
  count: number,
): AttachmentSlot[] {
  return Array.from({ length: count }, (_, index) => {
    const ratio = (index + 1) / (count + 1);
    const point = sidePoint(box, side, ratio);
    return {
      nodeId: box.id,
      side,
      index: index + 1,
      label: `${side}-${index + 1}`,
      ...point,
    };
  });
}

export function computeSceneAttachmentSlots(state: WorkbenchState): AttachmentSlot[] {
  const groups = new Map<string, { box: PreviewBox; side: Side; count: number }>();
  for (const connection of state.connections) {
    const source = iconVisualBox(state, connection.fromNodeId);
    const target = iconVisualBox(state, connection.toNodeId);
    if (!source || !target) {
      continue;
    }
    const { sourceSide, targetSide } = chooseConnectionSides(source, target);
    const sourceAnchorNode = previewAnchorNode(state, connection.fromNodeId);
    const targetAnchorNode = previewAnchorNode(state, connection.toNodeId);
    for (const endpoint of [
      {
        box: sourceAnchorNode ? connectionAnchorBox(sourceAnchorNode, sourceSide) : source,
        side: sourceSide,
      },
      {
        box: targetAnchorNode ? connectionAnchorBox(targetAnchorNode, targetSide) : target,
        side: targetSide,
      },
    ]) {
      const key = `${endpoint.box.id}:${endpoint.side}`;
      const existing = groups.get(key);
      groups.set(key, {
        box: endpoint.box,
        side: endpoint.side,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }
  return [...groups.values()].flatMap((group) =>
    computeAttachmentSlots(group.box, group.side, group.count),
  );
}
