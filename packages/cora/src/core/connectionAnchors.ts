import type { DiagramComponent, LayoutedEdge, LayoutedNode } from '../layout-ir.js';
import {
  ICON_NODE_ART_SIZE,
  iconNodeScale,
} from '../renderer/components/styles.js';

export type Side = 'top' | 'right' | 'bottom' | 'left';
type Orientation = 'horizontal' | 'vertical';

const EPSILON = 0.001;
const MIN_SIDE_GAP = 22;

export interface AnchorBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnchorNode extends AnchorBox {
  component?: DiagramComponent;
  text?: unknown;
  subtitle?: unknown;
  titleFontSize?: number;
  subtitleFontSize?: number;
  iconType?: 'ok' | 'nok' | 'question-mark';
}

const DEFAULT_NODE_TITLE_SIZE = 12;

function hasNodeText(node: AnchorNode): boolean {
  return Boolean(node.text || node.subtitle);
}

function lineCount(value: unknown): number {
  return value ? String(value).split(/\r?\n/).length : 0;
}

function textHeightForNode(node: AnchorNode, ratio: number, defaultTitleSize = DEFAULT_NODE_TITLE_SIZE): number {
  if (!hasNodeText(node)) {
    return 0;
  }

  const titleFontSize = (node.titleFontSize ?? defaultTitleSize) * ratio;
  const subtitleFontSize = (node.subtitleFontSize ?? Math.max(8, (node.titleFontSize ?? defaultTitleSize) - 2)) * ratio;
  const titleLines = lineCount(node.text);
  const subtitleLines = lineCount(node.subtitle);

  return titleLines * titleFontSize * 1.25 +
    (subtitleLines > 0 ? 3 * ratio + subtitleLines * subtitleFontSize * 1.25 : 0);
}

function centeredArtworkBox(node: AnchorNode, artSize: number, artY: number): AnchorBox {
  return {
    id: node.id,
    x: node.x + (node.width - artSize) / 2,
    y: artY,
    width: artSize,
    height: artSize,
  };
}

function artworkAndBottomTextBox(node: AnchorNode, artwork: AnchorBox): AnchorBox {
  return {
    ...artwork,
    height: node.y + node.height - artwork.y,
  };
}

function iconArtworkBox(node: AnchorNode): AnchorBox {
  const ratio = iconNodeScale(node);
  const iconSize = ICON_NODE_ART_SIZE * ratio;
  const iconY = node.y + (hasNodeText(node) ? 6 * ratio : (node.height - iconSize) / 2);
  return centeredArtworkBox(node, iconSize, iconY);
}

function labelIconArtworkBox(node: AnchorNode): AnchorBox {
  const ratio = iconNodeScale(node);
  const iconSize = node.iconType
    ? Math.min(node.width, node.height) * 0.62
    : ICON_NODE_ART_SIZE * ratio;
  const iconY = node.y + (hasNodeText(node) ? 2 * ratio : (node.height - iconSize) / 2);
  return centeredArtworkBox(node, iconSize, iconY);
}

function stackedArtworkBox(node: AnchorNode, artSize: number, ratio: number): AnchorBox {
  const textHeight = textHeightForNode(node, ratio);
  const labelGap = (hasNodeText(node) ? 8 : 0) * ratio;
  const topPadding = (hasNodeText(node) ? 6 : 0) * ratio;
  const bottomPadding = (hasNodeText(node) ? 6 : 0) * ratio;
  const artY = node.y + topPadding +
    (node.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;

  return centeredArtworkBox(node, artSize, artY);
}

function documentArtworkBox(node: AnchorNode): AnchorBox {
  const ratio = node.width / 192;
  const artSize = 24 * 6 * ratio;
  const textHeight = textHeightForNode(node, ratio);
  const labelGap = (hasNodeText(node) ? 8 : 0) * ratio;
  const topPadding = 12 * ratio;
  const bottomPadding = (hasNodeText(node) ? 8 : 12) * ratio;
  const artY = node.y + topPadding +
    (node.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;

  return centeredArtworkBox(node, artSize, artY);
}

function artworkBox(node: AnchorNode): AnchorBox | undefined {
  switch (node.component) {
    case 'icon':
      return iconArtworkBox(node);
    case 'labelIcon':
      return labelIconArtworkBox(node);
    case 'app': {
      const ratio = iconNodeScale(node);
      return stackedArtworkBox(node, ICON_NODE_ART_SIZE * ratio, ratio);
    }
    case 'api': {
      const ratio = node.width / 160;
      return stackedArtworkBox(node, 84 * ratio, ratio);
    }
    case 'database': {
      const ratio = iconNodeScale(node);
      return stackedArtworkBox(node, ICON_NODE_ART_SIZE * ratio, ratio);
    }
    case 'document':
      return documentArtworkBox(node);
    default:
      return undefined;
  }
}

export function connectionAnchorBox(node: AnchorNode, side: Side): AnchorBox {
  const artwork = artworkBox(node);
  if (!artwork) {
    return node;
  }

  return side === 'bottom'
    ? artworkAndBottomTextBox(node, artwork)
    : artwork;
}

export function chooseConnectionSides(source: AnchorBox, target: AnchorBox): { sourceSide: Side; targetSide: Side } {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const horizontal = dx >= 0
    ? { sourceSide: 'right' as const, targetSide: 'left' as const }
    : { sourceSide: 'left' as const, targetSide: 'right' as const };
  const vertical = dy >= 0
    ? { sourceSide: 'bottom' as const, targetSide: 'top' as const }
    : { sourceSide: 'top' as const, targetSide: 'bottom' as const };
  const horizontalGap = dx >= 0
    ? target.x - (source.x + source.width)
    : source.x - (target.x + target.width);
  const verticalGap = dy >= 0
    ? target.y - (source.y + source.height)
    : source.y - (target.y + target.height);

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (horizontalGap < MIN_SIDE_GAP && verticalGap > horizontalGap + EPSILON) {
      return vertical;
    }
    return horizontal;
  }

  if (verticalGap < MIN_SIDE_GAP && horizontalGap > verticalGap + EPSILON) {
    return horizontal;
  }
  return vertical;
}

export function sidePoint(box: AnchorBox, side: Side, offsetRatio = 0.5): { x: number; y: number } {
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

function nodeAnchorInput(node: LayoutedNode): AnchorNode {
  return {
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.measuredWidth,
    height: node.measuredHeight,
    component: node.component,
    text: node.label,
  };
}

function sideFromEndpoint(node: AnchorBox, endpoint: { x: number; y: number }): Side {
  const distances: Array<[Side, number]> = [
    ['left', Math.abs(endpoint.x - node.x)],
    ['right', Math.abs(endpoint.x - (node.x + node.width))],
    ['top', Math.abs(endpoint.y - node.y)],
    ['bottom', Math.abs(endpoint.y - (node.y + node.height))],
  ];
  distances.sort((a, b) => a[1] - b[1]);
  return distances[0]![0];
}

function sideFromSegment(
  endpoint: { x: number; y: number },
  neighbor: { x: number; y: number },
  _role: 'source' | 'target',
): Side | undefined {
  const dx = neighbor.x - endpoint.x;
  const dy = neighbor.y - endpoint.y;
  if (Math.hypot(dx, dy) < 0.001) {
    return undefined;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }

  return dy >= 0 ? 'bottom' : 'top';
}

function orientationForSide(side: Side): Orientation {
  return side === 'left' || side === 'right' ? 'horizontal' : 'vertical';
}

function samePoint(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

function isBoxLikeNode(node: AnchorNode): boolean {
  return !node.component || node.component === 'box';
}

function segmentOrientation(
  a: { x: number; y: number },
  b: { x: number; y: number },
): Orientation | undefined {
  if (Math.abs(a.y - b.y) < EPSILON) {
    return 'horizontal';
  }
  if (Math.abs(a.x - b.x) < EPSILON) {
    return 'vertical';
  }
  return undefined;
}

function segmentCrossesBoxInterior(
  a: { x: number; y: number },
  b: { x: number; y: number },
  box: AnchorBox,
): boolean {
  const orientation = segmentOrientation(a, b);
  if (!orientation) {
    return true;
  }

  if (orientation === 'vertical') {
    if (a.x <= box.x + EPSILON || a.x >= box.x + box.width - EPSILON) {
      return false;
    }
    const overlap = Math.min(Math.max(a.y, b.y), box.y + box.height) -
      Math.max(Math.min(a.y, b.y), box.y);
    return overlap > EPSILON;
  }

  if (a.y <= box.y + EPSILON || a.y >= box.y + box.height - EPSILON) {
    return false;
  }
  const overlap = Math.min(Math.max(a.x, b.x), box.x + box.width) -
    Math.max(Math.min(a.x, b.x), box.x);
  return overlap > EPSILON;
}

function pushDistinct(points: Array<{ x: number; y: number }>, point: { x: number; y: number }): void {
  const previous = points.at(-1);
  if (!previous || !samePoint(previous, point)) {
    points.push(point);
  }
}

function cleanOrthogonalPoints(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const distinct: Array<{ x: number; y: number }> = [];
  for (const point of points) {
    pushDistinct(distinct, point);
  }

  const cleaned: Array<{ x: number; y: number }> = [];
  for (const point of distinct) {
    const previous = cleaned.at(-1);
    const beforePrevious = cleaned.at(-2);
    if (
      previous &&
      beforePrevious &&
      segmentOrientation(beforePrevious, previous) &&
      segmentOrientation(previous, point) &&
      segmentOrientation(beforePrevious, previous) === segmentOrientation(previous, point)
    ) {
      cleaned[cleaned.length - 1] = point;
    } else {
      cleaned.push(point);
    }
  }

  return cleaned;
}

function orthogonalRouteBetween(
  start: { x: number; y: number },
  end: { x: number; y: number },
  sourceSide: Side,
  targetSide: Side,
): Array<{ x: number; y: number }> {
  if (segmentOrientation(start, end)) {
    return [start, end];
  }

  const sourceOrientation = orientationForSide(sourceSide);
  const targetOrientation = orientationForSide(targetSide);

  if (sourceOrientation === 'horizontal' && targetOrientation === 'horizontal') {
    const midX = (start.x + end.x) / 2;
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  if (sourceOrientation === 'vertical' && targetOrientation === 'vertical') {
    const midY = (start.y + end.y) / 2;
    return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
  }

  return sourceOrientation === 'horizontal'
    ? [start, { x: end.x, y: start.y }, end]
    : [start, { x: start.x, y: end.y }, end];
}

export function orthogonalizeConnectionPoints(
  points: Array<{ x: number; y: number }>,
  sourceSide: Side,
  targetSide: Side,
): Array<{ x: number; y: number }> {
  if (points.length < 2) {
    return points;
  }

  if (points.length === 2) {
    return cleanOrthogonalPoints(orthogonalRouteBetween(points[0]!, points[1]!, sourceSide, targetSide));
  }

  const orthogonal: Array<{ x: number; y: number }> = [points[0]!];
  const sourceOrientation = orientationForSide(sourceSide);
  const targetOrientation = orientationForSide(targetSide);

  for (let index = 1; index < points.length; index++) {
    const start = orthogonal.at(-1)!;
    const end = points[index]!;

    if (segmentOrientation(start, end)) {
      pushDistinct(orthogonal, end);
      continue;
    }

    const previous = orthogonal.at(-2);
    const incoming = previous ? segmentOrientation(previous, start) : undefined;
    const firstOrientation = index === points.length - 1
      ? targetOrientation === 'horizontal'
        ? 'vertical'
        : 'horizontal'
      : incoming
        ? incoming === 'horizontal'
          ? 'vertical'
          : 'horizontal'
        : sourceOrientation;
    const elbow = firstOrientation === 'horizontal'
      ? { x: end.x, y: start.y }
      : { x: start.x, y: end.y };

    pushDistinct(orthogonal, elbow);
    pushDistinct(orthogonal, end);
  }

  return cleanOrthogonalPoints(orthogonal);
}

function inferredEndpointSides(
  edge: LayoutedEdge,
  from: LayoutedNode,
  to: LayoutedNode,
): { sourceSide: Side; targetSide: Side } {
  const fromInput = nodeAnchorInput(from);
  const toInput = nodeAnchorInput(to);
  const fallback = chooseConnectionSides(fromInput, toInput);
  const first = edge.points[0];
  const second = edge.points[1];
  const last = edge.points.at(-1);
  const beforeLast = edge.points.at(-2);
  const sourceCrossesOwnNode = Boolean(
    first &&
    second &&
    isBoxLikeNode(fromInput) &&
    segmentCrossesBoxInterior(first, second, fromInput),
  );
  const targetCrossesOwnNode = Boolean(
    last &&
    beforeLast &&
    isBoxLikeNode(toInput) &&
    segmentCrossesBoxInterior(beforeLast, last, toInput),
  );

  return {
    sourceSide: first && second && !sourceCrossesOwnNode
      ? sideFromSegment(first, second, 'source') ?? sideFromEndpoint(fromInput, first)
      : fallback.sourceSide,
    targetSide: last && beforeLast && !targetCrossesOwnNode
      ? sideFromSegment(last, beforeLast, 'target') ?? sideFromEndpoint(toInput, last)
      : fallback.targetSide,
  };
}

function setEndpoint(
  points: Array<{ x: number; y: number }>,
  role: 'source' | 'target',
  side: Side,
  point: { x: number; y: number },
): void {
  const index = role === 'source' ? 0 : points.length - 1;
  const neighborIndex = role === 'source' ? 1 : points.length - 2;
  points[index] = point;

  if (points.length <= 2) {
    return;
  }

  const neighbor = points[neighborIndex];
  if (!neighbor) {
    return;
  }

  if (side === 'left' || side === 'right') {
    neighbor.y = point.y;
  } else {
    neighbor.x = point.x;
  }
}

export function applyBalancedConnectionAnchors(
  edges: LayoutedEdge[],
  nodeById: Map<string, LayoutedNode>,
): void {
  const endpointGroups = new Map<string, Array<{ edgeIndex: number; role: 'source' | 'target'; sortCoord: number }>>();
  const endpointSides = new Map<string, { sourceSide: Side; targetSide: Side }>();

  edges.forEach((edge, edgeIndex) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to || edge.points.length < 2) {
      return;
    }

    const sides = inferredEndpointSides(edge, from, to);
    endpointSides.set(String(edgeIndex), sides);
    const fromBox = nodeAnchorInput(from);
    const toBox = nodeAnchorInput(to);
    const fromCenterY = fromBox.y + fromBox.height / 2;
    const toCenterY = toBox.y + toBox.height / 2;
    const isVerticalBackRoute =
      (sides.sourceSide === 'bottom' && toCenterY < fromCenterY) ||
      (sides.sourceSide === 'top' && toCenterY > fromCenterY);
    const sourceSortCoord = sides.sourceSide === 'left' || sides.sourceSide === 'right'
      ? toCenterY
      : toBox.x + toBox.width / 2 + (isVerticalBackRoute ? 1_000_000 : 0);
    const targetSortCoord = sides.targetSide === 'left' || sides.targetSide === 'right'
      ? fromBox.y + fromBox.height / 2
      : fromBox.x + fromBox.width / 2;

    for (const endpoint of [
      { nodeId: edge.from, side: sides.sourceSide, role: 'source' as const, sortCoord: sourceSortCoord },
      { nodeId: edge.to, side: sides.targetSide, role: 'target' as const, sortCoord: targetSortCoord },
    ]) {
      const key = `${endpoint.nodeId}:${endpoint.side}`;
      const group = endpointGroups.get(key) ?? [];
      group.push({ edgeIndex, role: endpoint.role, sortCoord: endpoint.sortCoord });
      endpointGroups.set(key, group);
    }
  });

  const ratios = new Map<string, number>();
  for (const group of endpointGroups.values()) {
    group.sort((a, b) =>
      a.sortCoord - b.sortCoord ||
      a.edgeIndex - b.edgeIndex ||
      a.role.localeCompare(b.role)
    );
    group.forEach((endpoint, index) => {
      ratios.set(`${endpoint.edgeIndex}:${endpoint.role}`, (index + 1) / (group.length + 1));
    });
  }

  edges.forEach((edge, edgeIndex) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const sides = endpointSides.get(String(edgeIndex));
    if (!from || !to || !sides || edge.points.length < 2) {
      return;
    }

    const sourceBox = connectionAnchorBox(nodeAnchorInput(from), sides.sourceSide);
    const targetBox = connectionAnchorBox(nodeAnchorInput(to), sides.targetSide);
    const sourcePoint = sidePoint(sourceBox, sides.sourceSide, ratios.get(`${edgeIndex}:source`) ?? 0.5);
    const targetPoint = sidePoint(targetBox, sides.targetSide, ratios.get(`${edgeIndex}:target`) ?? 0.5);

    // Tiny-zigzag elimination: when source and target sit on opposite parallel
    // sides and the perpendicular delta is small, snap both endpoints to a
    // shared column/row so the path collapses to one straight segment. Only
    // applied when this edge is alone on each side (otherwise the snap would
    // disturb the balanced fan-out ratios above).
    const sourceGroupSize =
      endpointGroups.get(`${edge.from}:${sides.sourceSide}`)?.length ?? 0;
    const targetGroupSize =
      endpointGroups.get(`${edge.to}:${sides.targetSide}`)?.length ?? 0;
    const parallel =
      orientationForSide(sides.sourceSide) === orientationForSide(sides.targetSide);
    if (parallel && sourceGroupSize === 1 && targetGroupSize === 1) {
      const STRAIGHT_SNAP_THRESHOLD = 6;
      if (orientationForSide(sides.sourceSide) === 'vertical') {
        const dx = targetPoint.x - sourcePoint.x;
        if (Math.abs(dx) > EPSILON && Math.abs(dx) <= STRAIGHT_SNAP_THRESHOLD) {
          const overlapMin = Math.max(sourceBox.x, targetBox.x);
          const overlapMax = Math.min(
            sourceBox.x + sourceBox.width,
            targetBox.x + targetBox.width,
          );
          if (overlapMax - overlapMin > EPSILON) {
            const sharedX = Math.min(
              Math.max((sourcePoint.x + targetPoint.x) / 2, overlapMin),
              overlapMax,
            );
            sourcePoint.x = sharedX;
            targetPoint.x = sharedX;
          }
        }
      } else {
        const dy = targetPoint.y - sourcePoint.y;
        if (Math.abs(dy) > EPSILON && Math.abs(dy) <= STRAIGHT_SNAP_THRESHOLD) {
          const overlapMin = Math.max(sourceBox.y, targetBox.y);
          const overlapMax = Math.min(
            sourceBox.y + sourceBox.height,
            targetBox.y + targetBox.height,
          );
          if (overlapMax - overlapMin > EPSILON) {
            const sharedY = Math.min(
              Math.max((sourcePoint.y + targetPoint.y) / 2, overlapMin),
              overlapMax,
            );
            sourcePoint.y = sharedY;
            targetPoint.y = sharedY;
          }
        }
      }
    }

    setEndpoint(edge.points, 'source', sides.sourceSide, sourcePoint);
    setEndpoint(edge.points, 'target', sides.targetSide, targetPoint);
    const orthogonalPoints = orthogonalizeConnectionPoints(
      edge.points,
      sides.sourceSide,
      sides.targetSide,
    );
    edge.points.splice(0, edge.points.length, ...orthogonalPoints);
  });
}
