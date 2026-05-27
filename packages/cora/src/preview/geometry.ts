import {
  resolveComponentSize,
  resolveWebsiteComponentSize,
  resolveAppComponentSize,
  resolveDocumentComponentSize,
  resolveLabelIconComponentSize,
  APP_SIZE_PRESETS,
  DOCUMENT_SIZE_PRESETS,
  WEBSITE_SIZE_PRESETS,
  LABEL_ICON_SIZE_PRESETS,
} from '../renderer/components/styles.js';
import type { ConnectionProps } from './controls/defaults.js';
import type { SizePreset } from '../renderer/components/types.js';
import type { CanvasConnection, CanvasNode, WorkbenchState } from './state.js';

export type Side = 'top' | 'right' | 'bottom' | 'left';

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


export function previewNodeSize(node: CanvasNode): { width: number; height: number } {
  const base = node.componentId === 'app'
    ? resolveAppComponentSize(node.props.size, APP_SIZE_PRESETS.lg)
    : node.componentId === 'document'
      ? resolveDocumentComponentSize(node.props.size, DOCUMENT_SIZE_PRESETS.lg)
      : node.componentId === 'website'
        ? resolveWebsiteComponentSize(node.props.size, WEBSITE_SIZE_PRESETS.lg)
        : resolveComponentSize(node.props.size, { width: 140, height: 56 });
  const title = node.props.title ?? node.props.text ?? '';
  const subtitle = node.props.subtitle ?? '';
  const lines = title.split(/\r?\n/);
  const subtitleLines = subtitle ? subtitle.split(/\r?\n/) : [];
  const longestLine = Math.max(...lines.map((line) => line.length), 1);
  const longestSubtitle = Math.max(...subtitleLines.map((line) => line.length), 0);
  const titleFontSize = node.props.titleFontSize ?? 13;
  const subtitleFontSize = node.props.subtitleFontSize ?? Math.max(8, titleFontSize - 2);
  const textWidth = Math.ceil(Math.max(longestLine * titleFontSize * 0.56, longestSubtitle * subtitleFontSize * 0.56) + 16);
  const textHeight = Math.ceil(16 + Math.max(1, lines.length) * titleFontSize * 1.25 + subtitleLines.length * subtitleFontSize * 1.25);
  if (node.componentId === 'label') {
    return {
      width: Math.max(48, textWidth),
      height: Math.max(28, textHeight),
    };
  }
  if (node.componentId === 'icon' || node.componentId === 'labelIcon') {
    return previewIconSize(node);
  }

  return {
    width: Math.max(base.width, textWidth),
    height: Math.max(base.height, textHeight),
  };
}

function previewIconSize(node: CanvasNode): { width: number; height: number } {
  if (node.componentId === 'icon') {
    return resolveAppComponentSize(node.props.size, { width: 160, height: 128 });
  }
  return resolveLabelIconComponentSize(node.props.size, { width: 40, height: 40 });
}

export function computeNodeBox(state: WorkbenchState, nodeId: string): PreviewBox | undefined {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return undefined;
  }
  const size = previewNodeSize(node);
  const attachedCenter = node.attachedConnectionId
    ? node.componentId === 'labelIcon'
      ? computeConnectionLabelIconCenter(state, node.attachedConnectionId, size, {
          x: node.position.x + size.width / 2,
          y: node.position.y + size.height / 2,
        })
      : computeConnectionCenter(state, node.attachedConnectionId)
    : undefined;
  let position = node.position;
  if (attachedCenter) {
    if (node.componentId === 'labelIcon') {
      const ratio = size.width / 40;
      const hasText = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
      const iconSize = node.props.iconType ? Math.min(size.width, size.height) * 0.62 : 24 * ratio;
      const iconYOffset = node.props.iconType
        ? (size.height - iconSize) / 2
        : hasText
        ? 2 * ratio
        : (size.height - iconSize) / 2;
      const iconCenterYOffset = iconYOffset + iconSize / 2;
      position = {
        x: attachedCenter.x - size.width / 2,
        y: attachedCenter.y - iconCenterYOffset,
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
    const ratio = box.width / 160;
    const iconSize = 87 * ratio;
    const hasText = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
    const iconY = box.y + (hasText ? 9 * ratio : (box.height - iconSize) / 2);
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
    const ratio = box.width / 160;
    const ARTBOARD = 24;
    const scale = 3.875 * ratio;
    const artSize = ARTBOARD * scale;

    const hasLabel = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
    const titleFontSize = (node.props.titleFontSize ?? 12) * ratio;
    const subtitleFontSize = (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio;
    const titleLines = (node.props.title ?? node.props.text) ? String(node.props.title ?? node.props.text).split(/\r?\n/) : [];
    const subtitleLines = node.props.subtitle ? String(node.props.subtitle).split(/\r?\n/) : [];
    const textHeight = hasLabel
      ? titleLines.length * titleFontSize * 1.25 +
        (subtitleLines.length > 0 ? 3 * ratio + subtitleLines.length * subtitleFontSize * 1.25 : 0)
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

export function chooseConnectionSides(source: PreviewBox, target: PreviewBox): { sourceSide: Side; targetSide: Side } {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  const dx = tx - sx;
  const dy = ty - sy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceSide: 'right', targetSide: 'left' }
      : { sourceSide: 'left', targetSide: 'right' };
  }

  return dy >= 0
    ? { sourceSide: 'bottom', targetSide: 'top' }
    : { sourceSide: 'top', targetSide: 'bottom' };
}

export function sidePoint(box: PreviewBox, side: Side, offsetRatio = 0.5): { x: number; y: number } {
  if (side === 'top') {
    return { x: box.x + box.width * offsetRatio, y: box.y };
  }
  if (side === 'bottom') {
    return { x: box.x + box.width * offsetRatio, y: box.y + box.height };
  }
  if (side === 'left') {
    return { x: box.x, y: box.y + box.height * offsetRatio };
  }
  return { x: box.x + box.width, y: box.y + box.height * offsetRatio };
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
  const start = sidePoint(source, sourceSide, ratios.sourceRatio);
  const end = sidePoint(target, targetSide, ratios.targetRatio);
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
  const size = Math.max(4, markerSize);
  const circleRadius = Math.max(2, size * 0.36);
  const markerStrokeWidth = 1.5;
  const squareSize = Math.max(3, size * 0.72);

  if (marker === 'arrow') {
    return size;
  }
  if (marker === 'circle') {
    return circleRadius + markerStrokeWidth / 2;
  }
  if (marker === 'filledCircle') {
    return circleRadius;
  }
  if (marker === 'diamond') {
    return size / 2 + markerStrokeWidth / 2;
  }
  if (marker === 'filledDiamond') {
    return size / 2;
  }
  if (marker === 'square') {
    return squareSize / 2 + markerStrokeWidth / 2;
  }
  if (marker === 'filledSquare') {
    return squareSize / 2;
  }
  return 0;
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
  const endpointGroups = new Map<string, Array<{ connectionId: string; role: 'source' | 'target' }>>();

  for (const connection of state.connections) {
    const source = iconVisualBox(state, connection.fromNodeId);
    const target = iconVisualBox(state, connection.toNodeId);
    if (!source || !target) {
      continue;
    }
    const { sourceSide, targetSide } = chooseConnectionSides(source, target);
    const endpoints = [
      { nodeId: connection.fromNodeId, side: sourceSide, role: 'source' as const },
      { nodeId: connection.toNodeId, side: targetSide, role: 'target' as const },
    ];

    for (const endpoint of endpoints) {
      const key = `${endpoint.nodeId}:${endpoint.side}`;
      const group = endpointGroups.get(key) ?? [];
      group.push({ connectionId: connection.id, role: endpoint.role });
      endpointGroups.set(key, group);
    }
  }

  let sourceRatio = 0.5;
  let targetRatio = 0.5;
  for (const group of endpointGroups.values()) {
    group.sort((a, b) => a.connectionId.localeCompare(b.connectionId) || a.role.localeCompare(b.role));
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

export function computeConnectionLabelIconCenter(
  state: WorkbenchState,
  connectionId: string,
  size: { width: number; height: number } = { width: 40, height: 40 },
  preferredPoint?: { x: number; y: number },
): { x: number; y: number } | undefined {
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return undefined;
  }
  const points = computeConnectionPoints(state, connection);
  const distance = Math.max(24, Math.min(size.width, size.height) * 0.85);
  if (preferredPoint && points.length > 1) {
    const source = points[0]!;
    const target = points[points.length - 1]!;
    const sourceDistance = Math.hypot(preferredPoint.x - source.x, preferredPoint.y - source.y);
    const targetDistance = Math.hypot(preferredPoint.x - target.x, preferredPoint.y - target.y);
    return targetDistance < sourceDistance
      ? pointAlongPath([...points].reverse(), distance)
      : pointAlongPath(points, distance);
  }

  return pointAlongPath(points, distance);
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
    for (const endpoint of [
      { box: source, side: sourceSide },
      { box: target, side: targetSide },
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
