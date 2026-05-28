import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';

import {
  expandLayoutForLabeledEdges,
  updateLabeledEdgePlacements,
} from './labeledEdgeExpansion.js';
import { applyBalancedConnectionAnchors, connectionObstacleBox } from './connectionAnchors.js';
import {
  edgeBridgeMap,
  edgePathMidpoint,
  edgeSegments,
  edgeShaftMidpoint,
  type EdgeSegment,
} from './edgeGeometry.js';
import {
  effectiveEndMarker,
  effectiveStartMarker,
  markerVisibleTrim,
} from './edgeMarkers.js';
import { runElkLayout } from './layoutWorker.js';
import { measureLabel } from './measureText.js';
import type {
  Diagram,
  DiagramEdge,
  DiagramGroup,
  DiagramGroupStyle,
  LayoutedDiagram,
  LayoutedEdge,
  LayoutedGroup,
  LayoutedNode,
  MeasuredNode,
  ThemeTokens,
} from './types.js';

const VIEWBOX_PADDING = 24;
const NODE_GAP = 40;
const NODE_BETWEEN_LAYERS_GAP = 48;
const EDGE_NODE_BETWEEN_LAYERS_GAP = 22;
const GROUP_NODE_PADDING = 24;
const EDGE_UNSHARE_OFFSET = 22;
const EDGE_UNSHARE_PADDING = 8;
const EDGE_UNSHARE_MAX_PASSES = 64;
const MIN_PARALLEL_SEGMENT_CLEARANCE = 14;
const EDGE_OBSTACLE_CLEARANCE = 14;
const GROUP_BORDER_MERGE_TOLERANCE = 6;
const MIN_EDGE_SHAFT_LENGTH = 22;
const MIN_VISIBLE_ENDPOINT_RUNWAY = 11;
const EDGE_ENDPOINT_CLEARANCE = 2;
const EPSILON = 0.001;

export class LayoutError extends Error {
  readonly code = 'LAYOUT_ERROR' as const;
  readonly missingNodeIds: string[];

  constructor(message: string, missingNodeIds: string[] = []) {
    super(message);
    this.name = 'LayoutError';
    this.missingNodeIds = missingNodeIds;
  }
}

function elkDirection(diagram: Diagram): string {
  return diagram.direction === 'LR' ? 'RIGHT' : 'DOWN';
}

function baseLayoutOptions(diagram: Diagram): Record<string, string> {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': elkDirection(diagram),
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.edgeRouting': 'ORTHOGONAL',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.spacing.nodeNode': String(NODE_GAP),
    'elk.spacing.edgeEdge': String(EDGE_UNSHARE_OFFSET),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(
      NODE_BETWEEN_LAYERS_GAP,
    ),
    'elk.layered.spacing.edgeEdgeBetweenLayers': String(EDGE_UNSHARE_OFFSET),
    'elk.layered.spacing.edgeNodeBetweenLayers': String(
      EDGE_NODE_BETWEEN_LAYERS_GAP,
    ),
    'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': String(
      NODE_BETWEEN_LAYERS_GAP,
    ),
    'org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers': String(
      EDGE_UNSHARE_OFFSET,
    ),
    'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': String(
      EDGE_NODE_BETWEEN_LAYERS_GAP,
    ),
  };
}

function edgePoints(section: {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  bendPoints?: Array<{ x: number; y: number }>;
}): Array<{ x: number; y: number }> {
  const points = [section.startPoint];
  if (section.bendPoints) {
    points.push(...section.bendPoints);
  }
  points.push(section.endPoint);
  return points;
}

function straightEdgePoints(
  from: LayoutedNode,
  to: LayoutedNode,
): Array<{ x: number; y: number }> {
  return [
    {
      x: from.x + from.measuredWidth / 2,
      y: from.y + from.measuredHeight / 2,
    },
    {
      x: to.x + to.measuredWidth / 2,
      y: to.y + to.measuredHeight / 2,
    },
  ];
}

interface ElkContext {
  edges: Map<string, ElkExtendedEdge>;
  ancestors: Map<string, string[]>;
  containerOffset: Map<string, { x: number; y: number }>;
}

function collectElkContext(
  elkNode: ElkNode,
  ctx: ElkContext,
  ancestry: string[] = [],
  offsetX = 0,
  offsetY = 0,
): void {
  const isRoot = elkNode.id === 'root';
  const absX = isRoot ? 0 : (elkNode.x ?? 0) + offsetX;
  const absY = isRoot ? 0 : (elkNode.y ?? 0) + offsetY;
  const nextAncestry = elkNode.id ? [...ancestry, elkNode.id] : ancestry;

  if (elkNode.id) {
    ctx.ancestors.set(elkNode.id, nextAncestry);
    ctx.containerOffset.set(elkNode.id, { x: absX, y: absY });
  }

  for (const edge of elkNode.edges ?? []) {
    if (edge.id) {
      ctx.edges.set(edge.id, edge);
    }
  }
  for (const child of elkNode.children ?? []) {
    collectElkContext(child, ctx, nextAncestry, absX, absY);
  }
}

function lcaContainerOffset(
  ctx: ElkContext,
  fromId: string,
  toId: string,
): { x: number; y: number } {
  const a = ctx.ancestors.get(fromId) ?? [];
  const b = ctx.ancestors.get(toId) ?? [];
  let lca = 'root';
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) break;
    // Skip leaf ids — only containers (which have offsets recorded) count.
    // Containers are everything except the leaf node itself (the last entry).
    if (i < a.length - 1 && i < b.length - 1) {
      lca = a[i]!;
    }
  }
  return ctx.containerOffset.get(lca) ?? { x: 0, y: 0 };
}

function buildLayoutedEdges(
  edges: DiagramEdge[],
  nodeById: Map<string, LayoutedNode>,
  elkRoot: ElkNode | undefined,
): LayoutedEdge[] {
  const ctx: ElkContext = {
    edges: new Map(),
    ancestors: new Map(),
    containerOffset: new Map(),
  };
  if (elkRoot) {
    collectElkContext(elkRoot, ctx);
  }

  const layoutedEdges = edges.map((edge, index) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const elkEdge =
      ctx.edges.get(`e-${index}`) ?? ctx.edges.get(edge.from + '->' + edge.to);

    let points: Array<{ x: number; y: number }> = [];
    if (elkEdge?.sections?.[0]) {
      const offset = lcaContainerOffset(ctx, edge.from, edge.to);
      points = edgePoints(elkEdge.sections[0]).map((p) => ({
        x: p.x + offset.x,
        y: p.y + offset.y,
      }));
    } else if (from && to) {
      points = straightEdgePoints(from, to);
    }

    return {
      ...edge,
      points,
    };
  });

  applyBalancedConnectionAnchors(layoutedEdges, nodeById);

  return layoutedEdges.map((edge) => {
    const mid = edge.label
      ? edgeShaftMidpoint(edge.points)
      : edgePathMidpoint(edge.points);
    const labelSize = edge.label ? measureLabel(edge.label, 'edge') : undefined;
    return {
      ...edge,
      labelX: mid.x,
      labelY: mid.y,
      labelPlacement: labelSize
        ? {
            x: mid.x,
            y: mid.y,
            width: labelSize.width,
            height: labelSize.height,
            segmentIndex: mid.segmentIndex,
            orientation: mid.orientation,
          }
        : undefined,
    };
  });
}

function computeBounds(
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
  edges: LayoutedEdge[],
): { width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const consider = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const node of nodes) {
    consider(node.x, node.y);
    consider(node.x + node.measuredWidth, node.y + node.measuredHeight);
  }

  for (const group of groups) {
    consider(group.x, group.y);
    consider(group.x + group.width, group.y + group.height);
  }

  for (const edge of edges) {
    for (const point of edge.points) {
      consider(point.x, point.y);
    }
    if (edge.labelX !== undefined && edge.labelY !== undefined) {
      consider(edge.labelX, edge.labelY);
    }
  }

  if (!Number.isFinite(minX)) {
    return { width: 200, height: 200 };
  }

  return {
    width: maxX - minX + VIEWBOX_PADDING * 2,
    height: maxY - minY + VIEWBOX_PADDING * 2,
  };
}

function minimumEndpointSegmentLength(
  edge: LayoutedEdge,
  role: 'source' | 'target',
): number {
  const marker = role === 'source'
    ? effectiveStartMarker(edge.startMarker)
    : effectiveEndMarker(edge.endMarker);
  return EDGE_ENDPOINT_CLEARANCE + markerVisibleTrim(marker) + MIN_VISIBLE_ENDPOINT_RUNWAY;
}

function shiftLeadingRun(
  points: Array<{ x: number; y: number }>,
  orientation: EdgeSegment['orientation'],
  delta: number,
): void {
  if (points.length < 2 || Math.abs(delta) <= EPSILON) {
    return;
  }

  if (orientation === 'horizontal') {
    const x = points[1]!.x;
    for (let index = 1; index < points.length && Math.abs(points[index]!.x - x) < EPSILON; index++) {
      points[index]!.x += delta;
    }
    return;
  }

  const y = points[1]!.y;
  for (let index = 1; index < points.length && Math.abs(points[index]!.y - y) < EPSILON; index++) {
    points[index]!.y += delta;
  }
}

function shiftTrailingRun(
  points: Array<{ x: number; y: number }>,
  orientation: EdgeSegment['orientation'],
  delta: number,
): void {
  if (points.length < 3 || Math.abs(delta) <= EPSILON) {
    return;
  }

  if (orientation === 'horizontal') {
    const x = points[points.length - 2]!.x;
    for (let index = points.length - 2; index >= 0 && Math.abs(points[index]!.x - x) < EPSILON; index--) {
      points[index]!.x += delta;
    }
    return;
  }

  const y = points[points.length - 2]!.y;
  for (let index = points.length - 2; index >= 0 && Math.abs(points[index]!.y - y) < EPSILON; index--) {
    points[index]!.y += delta;
  }
}

function ensureEndpointRunway(edges: LayoutedEdge[]): void {
  for (const edge of edges) {
    if (edge.points.length < 2) {
      continue;
    }

    const first = edge.points[0]!;
    const second = edge.points[1]!;
    const firstOrientation = segmentOrientation(first, second);
    if (firstOrientation) {
      const firstLength = Math.hypot(second.x - first.x, second.y - first.y);
      const minimum = minimumEndpointSegmentLength(edge, 'source');
      if (firstLength + EPSILON < minimum) {
        const delta = firstOrientation === 'horizontal'
          ? Math.sign(second.x - first.x) * (minimum - firstLength)
          : Math.sign(second.y - first.y) * (minimum - firstLength);
        shiftLeadingRun(edge.points, firstOrientation, delta);
      }
    }

    const penultimate = edge.points.at(-2);
    const last = edge.points.at(-1);
    if (!penultimate || !last) {
      continue;
    }
    const lastOrientation = segmentOrientation(penultimate, last);
    if (!lastOrientation) {
      continue;
    }
    const lastLength = Math.hypot(last.x - penultimate.x, last.y - penultimate.y);
    const minimum = minimumEndpointSegmentLength(edge, 'target');
    if (lastLength + EPSILON >= minimum) {
      continue;
    }
    const delta = lastOrientation === 'horizontal'
      ? Math.sign(penultimate.x - last.x) * (minimum - lastLength)
      : Math.sign(penultimate.y - last.y) * (minimum - lastLength);
    shiftTrailingRun(edge.points, lastOrientation, delta);
  }
}

function assertOrthogonalEdges(edges: LayoutedEdge[]): void {
  for (const edge of edges) {
    for (let i = 0; i < edge.points.length - 1; i++) {
      const a = edge.points[i]!;
      const b = edge.points[i + 1]!;
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx > EPSILON && dy > EPSILON) {
        if (dx < dy) {
          b.x = a.x;
        } else {
          b.y = a.y;
        }
      }
    }
  }
}

function offsetDiagram(
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
  edges: LayoutedEdge[],
): void {
  let minX = Infinity;
  let minY = Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
  }

  for (const group of groups) {
    minX = Math.min(minX, group.x);
    minY = Math.min(minY, group.y);
  }

  const dx = VIEWBOX_PADDING - (Number.isFinite(minX) ? minX : 0);
  const dy = VIEWBOX_PADDING - (Number.isFinite(minY) ? minY : 0);

  for (const node of nodes) {
    node.x += dx;
    node.y += dy;
  }

  for (const group of groups) {
    group.x += dx;
    group.y += dy;
  }

  for (const edge of edges) {
    for (const point of edge.points) {
      point.x += dx;
      point.y += dy;
    }
    if (edge.labelX !== undefined) edge.labelX += dx;
    if (edge.labelY !== undefined) edge.labelY += dy;
    if (edge.labelPlacement) {
      edge.labelPlacement.x += dx;
      edge.labelPlacement.y += dy;
    }
  }
}

function applyEdgeBridges(edges: LayoutedEdge[]): void {
  const bridgesByEdge = edgeBridgeMap(edges);

  for (const [index, edge] of edges.entries()) {
    edge.bridges = bridgesByEdge.get(index) ?? [];
  }
}

function samePoint(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

function pushDistinctPoint(
  points: Array<{ x: number; y: number }>,
  point: { x: number; y: number },
): void {
  const previous = points.at(-1);
  if (!previous || !samePoint(previous, point)) {
    points.push(point);
  }
}

function segmentOrientation(
  a: { x: number; y: number },
  b: { x: number; y: number },
): EdgeSegment['orientation'] | undefined {
  if (Math.abs(a.x - b.x) < EPSILON) {
    return 'vertical';
  }
  if (Math.abs(a.y - b.y) < EPSILON) {
    return 'horizontal';
  }
  return undefined;
}

function cleanEdgePoints(
  edge: LayoutedEdge,
  nodes?: LayoutedNode[],
  groups?: LayoutedGroup[],
): void {
  const distinct: Array<{ x: number; y: number }> = [];
  for (const point of edge.points) {
    pushDistinctPoint(distinct, point);
  }

  for (let index = 0; index < distinct.length; index++) {
    const firstIndex = distinct.findIndex((point, candidateIndex) =>
      candidateIndex < index && samePoint(point, distinct[index]!)
    );
    if (firstIndex >= 0) {
      distinct.splice(firstIndex + 1, index - firstIndex);
      index = firstIndex;
    }
  }

  const orthogonalized: Array<{ x: number; y: number }> = [];
  for (const point of distinct) {
    const previous = orthogonalized.at(-1);
    if (!previous) {
      pushDistinctPoint(orthogonalized, point);
      continue;
    }

    const orient = segmentOrientation(previous, point);
    if (orient) {
      pushDistinctPoint(orthogonalized, point);
      continue;
    }

    const beforePrevious = orthogonalized.at(-2);
    const incoming = beforePrevious ? segmentOrientation(beforePrevious, previous) : undefined;

    if (incoming === 'vertical') {
      pushDistinctPoint(orthogonalized, { x: previous.x, y: point.y });
    } else if (incoming === 'horizontal') {
      pushDistinctPoint(orthogonalized, { x: point.x, y: previous.y });
    } else {
      const dx = Math.abs(point.x - previous.x);
      const dy = Math.abs(point.y - previous.y);
      if (dx >= dy) {
        pushDistinctPoint(orthogonalized, { x: point.x, y: previous.y });
      } else {
        pushDistinctPoint(orthogonalized, { x: previous.x, y: point.y });
      }
    }
    pushDistinctPoint(orthogonalized, point);
  }

  let cleaned = [...orthogonalized];

  // 0. Remove instant backtracks like A-B-A that create tiny notches.
  cleaned = removeImmediateBacktracks(cleaned);

  // 1. Merge collinear segments
  cleaned = mergeCollinearSegments(cleaned);

  // 2. Simplify zigzags/overshoots
  cleaned = simplifyOrthogonalZigzags(cleaned, edge, nodes, groups);

  // 3. Merge collinear segments again
  cleaned = mergeCollinearSegments(cleaned);

  edge.points.splice(0, edge.points.length, ...cleaned);
}

function removeImmediateBacktracks(
  points: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  const cleaned = [...points];
  let changed = true;

  while (changed) {
    changed = false;
    for (let index = 0; index < cleaned.length - 2; index++) {
      if (!samePoint(cleaned[index]!, cleaned[index + 2]!)) {
        continue;
      }
      cleaned.splice(index + 1, 2);
      changed = true;
      break;
    }
  }

  return cleaned;
}

function mergeCollinearSegments(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const cleaned = [...points];
  let simplified = true;
  while (simplified) {
    simplified = false;
    for (let i = 1; i < cleaned.length - 1; i++) {
      const prev = cleaned[i - 1]!;
      const curr = cleaned[i]!;
      const next = cleaned[i + 1]!;

      const orient1 = segmentOrientation(prev, curr);
      const orient2 = segmentOrientation(curr, next);

      if (orient1 && orient2 && orient1 === orient2) {
        cleaned.splice(i, 1);
        simplified = true;
        break;
      }
    }
  }
  return cleaned;
}

const ZIGZAG_TOLERANCE = 6;

function polylineLength(points: Array<{ x: number; y: number }>): number {
  let total = 0;
  for (let index = 0; index < points.length - 1; index++) {
    const a = points[index]!;
    const b = points[index + 1]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

function simplifyOrthogonalZigzags(
  points: Array<{ x: number; y: number }>,
  edge: LayoutedEdge,
  nodes?: LayoutedNode[],
  groups?: LayoutedGroup[],
): Array<{ x: number; y: number }> {
  let cleaned = [...points];
  let changed = true;

  while (changed) {
    changed = false;

    // Pass 0: collapse three-segment detours into a single elbow when the
    // direct orthogonal alternative is still obstacle-free.
    for (let i = 0; i < cleaned.length - 3; i++) {
      const a = cleaned[i]!;
      const b = cleaned[i + 1]!;
      const c = cleaned[i + 2]!;
      const d = cleaned[i + 3]!;
      const orientAB = segmentOrientation(a, b);
      const orientBC = segmentOrientation(b, c);
      const orientCD = segmentOrientation(c, d);

      if (
        !orientAB ||
        !orientBC ||
        !orientCD ||
        orientAB !== orientCD ||
        orientAB === orientBC
      ) {
        continue;
      }

      const originalLength = polylineLength([a, b, c, d]);
      const shortSegment = Math.min(
        Math.hypot(b.x - a.x, b.y - a.y),
        Math.hypot(c.x - b.x, c.y - b.y),
        Math.hypot(d.x - c.x, d.y - c.y),
      ) < MIN_EDGE_SHAFT_LENGTH;
      const candidates = [
        [...cleaned.slice(0, i + 1), { x: d.x, y: a.y }, ...cleaned.slice(i + 3)],
        [...cleaned.slice(0, i + 1), { x: a.x, y: d.y }, ...cleaned.slice(i + 3)],
      ]
        .map((candidate) => mergeCollinearSegments(candidate))
        .filter((candidate) => candidate.length < cleaned.length)
        .filter((candidate) => shortSegment || polylineLength(candidate) <= originalLength + EPSILON)
        .filter((candidate) => {
          if (!nodes || !groups) {
            return true;
          }
          return routeClearOfObstacles(edge, candidate, nodes, groups);
        })
        .sort((first, second) =>
          first.length - second.length ||
          polylineLength(first) - polylineLength(second)
        );

      const candidate = candidates[0];
      if (!candidate) {
        continue;
      }

      cleaned = candidate;
      changed = true;
      break;
    }

    if (changed) continue;

    // Pass 1: 4-point zigzag simplification (A-B-C-D)
    for (let i = 0; i < cleaned.length - 3; i++) {
      const a = cleaned[i]!;
      const b = cleaned[i + 1]!;
      const c = cleaned[i + 2]!;
      const d = cleaned[i + 3]!;

      const orientAB = segmentOrientation(a, b);
      const orientBC = segmentOrientation(b, c);
      const orientCD = segmentOrientation(c, d);

      if (
        orientAB &&
        orientBC &&
        orientCD &&
        orientAB !== orientBC &&
        orientBC !== orientCD
      ) {
        let p: { x: number; y: number } | undefined;

        if (orientAB === 'horizontal') {
          const minX = Math.min(a.x, b.x) - ZIGZAG_TOLERANCE;
          const maxX = Math.max(a.x, b.x) + ZIGZAG_TOLERANCE;
          if (d.x >= minX - EPSILON && d.x <= maxX + EPSILON) {
            p = { x: d.x, y: a.y };
          }
        } else {
          const minY = Math.min(a.y, b.y) - ZIGZAG_TOLERANCE;
          const maxY = Math.max(a.y, b.y) + ZIGZAG_TOLERANCE;
          if (d.y >= minY - EPSILON && d.y <= maxY + EPSILON) {
            p = { x: a.x, y: d.y };
          }
        }

        if (p) {
          const candidate = [
            ...cleaned.slice(0, i + 1),
            p,
            ...cleaned.slice(i + 3),
          ];

          if (nodes && groups) {
            if (!routeClearOfObstacles(edge, candidate, nodes, groups)) {
              continue;
            }
          }

          cleaned = candidate;
          changed = true;
          break;
        }
      }
    }

    if (changed) continue;

    // Pass 2: 5-point stair-step simplification (A-B-C-D-E)
    for (let i = 0; i < cleaned.length - 4; i++) {
      const a = cleaned[i]!;
      const b = cleaned[i + 1]!;
      const c = cleaned[i + 2]!;
      const d = cleaned[i + 3]!;
      const e = cleaned[i + 4]!;

      const orientAB = segmentOrientation(a, b);
      const orientBC = segmentOrientation(b, c);
      const orientCD = segmentOrientation(c, d);
      const orientDE = segmentOrientation(d, e);

      if (
        !orientAB || !orientBC || !orientCD || !orientDE ||
        orientAB === orientBC || orientBC === orientCD || orientCD === orientDE ||
        orientAB !== orientDE
      ) {
        continue;
      }

      let candidate: Array<{ x: number; y: number }>;
      if (orientAB === 'horizontal') {
        if (Math.abs(e.y - a.y) > ZIGZAG_TOLERANCE) continue;
        if (Math.abs(e.y - a.y) < EPSILON) {
          candidate = [...cleaned.slice(0, i + 1), { x: e.x, y: a.y }, ...cleaned.slice(i + 4)];
        } else {
          candidate = [...cleaned.slice(0, i + 1), { x: e.x, y: a.y }, { x: e.x, y: e.y }, ...cleaned.slice(i + 4)];
        }
      } else {
        if (Math.abs(e.x - a.x) > ZIGZAG_TOLERANCE) continue;
        if (Math.abs(e.x - a.x) < EPSILON) {
          candidate = [...cleaned.slice(0, i + 1), { x: a.x, y: e.y }, ...cleaned.slice(i + 4)];
        } else {
          candidate = [...cleaned.slice(0, i + 1), { x: a.x, y: e.y }, { x: e.x, y: e.y }, ...cleaned.slice(i + 4)];
        }
      }

      if (nodes && groups) {
        if (!routeClearOfObstacles(edge, candidate, nodes, groups)) {
          continue;
        }
      }

      cleaned = candidate;
      changed = true;
      break;
    }
  }

  return cleaned;
}

export function cleanAllEdgePoints(
  edges: LayoutedEdge[],
  nodes?: LayoutedNode[],
  groups?: LayoutedGroup[],
): void {
  for (const edge of edges) {
    cleanEdgePoints(edge, nodes, groups);
  }
}

type EndpointSide = 'top' | 'right' | 'bottom' | 'left';
const ENDPOINT_SIDES: EndpointSide[] = ['top', 'right', 'bottom', 'left'];

function nodeCenter(node: LayoutedNode): { x: number; y: number } {
  return {
    x: node.x + node.measuredWidth / 2,
    y: node.y + node.measuredHeight / 2,
  };
}

function endpointSidesForNodes(
  from: LayoutedNode,
  to: LayoutedNode,
): { sourceSide: EndpointSide; targetSide: EndpointSide } {
  const source = nodeCenter(from);
  const target = nodeCenter(to);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const horizontal = dx >= 0
    ? { sourceSide: 'right' as const, targetSide: 'left' as const }
    : { sourceSide: 'left' as const, targetSide: 'right' as const };
  const vertical = dy >= 0
    ? { sourceSide: 'bottom' as const, targetSide: 'top' as const }
    : { sourceSide: 'top' as const, targetSide: 'bottom' as const };
  const horizontalGap = dx >= 0
    ? to.x - (from.x + from.measuredWidth)
    : from.x - (to.x + to.measuredWidth);
  const verticalGap = dy >= 0
    ? to.y - (from.y + from.measuredHeight)
    : from.y - (to.y + to.measuredHeight);

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (horizontalGap < MIN_EDGE_SHAFT_LENGTH && verticalGap > horizontalGap + EPSILON) {
      return vertical;
    }
    return horizontal;
  }

  if (verticalGap < MIN_EDGE_SHAFT_LENGTH && horizontalGap > verticalGap + EPSILON) {
    return horizontal;
  }
  return vertical;
}

function clampRatio(value: number): number {
  return Math.max(0.15, Math.min(0.85, value));
}

function pointOnNodeSide(
  node: LayoutedNode,
  side: EndpointSide,
  current: { x: number; y: number },
): { x: number; y: number } {
  if (side === 'top' || side === 'bottom') {
    const ratio = clampRatio((current.x - node.x) / node.measuredWidth);
    return {
      x: node.x + node.measuredWidth * ratio,
      y: side === 'top' ? node.y : node.y + node.measuredHeight,
    };
  }

  const ratio = clampRatio((current.y - node.y) / node.measuredHeight);
  return {
    x: side === 'left' ? node.x : node.x + node.measuredWidth,
    y: node.y + node.measuredHeight * ratio,
  };
}

function endpointSideForPoint(
  node: LayoutedNode,
  point: { x: number; y: number },
): EndpointSide {
  const distances: Array<[EndpointSide, number]> = [
    ['top', Math.abs(point.y - node.y)],
    ['right', Math.abs(point.x - (node.x + node.measuredWidth))],
    ['bottom', Math.abs(point.y - (node.y + node.measuredHeight))],
    ['left', Math.abs(point.x - node.x)],
  ];
  distances.sort((a, b) => a[1] - b[1]);
  return distances[0]![0];
}

function pointInsideNode(
  point: { x: number; y: number },
  node: LayoutedNode,
): boolean {
  return point.x > node.x - EPSILON &&
    point.x < node.x + node.measuredWidth + EPSILON &&
    point.y > node.y - EPSILON &&
    point.y < node.y + node.measuredHeight + EPSILON;
}

function trimEndpointInteriorPoints(
  points: Array<{ x: number; y: number }>,
  role: 'source' | 'target',
  node: LayoutedNode,
): void {
  if (points.length <= 2) {
    return;
  }

  if (role === 'source') {
    let firstOutsideIndex = 1;
    while (
      firstOutsideIndex < points.length - 1 &&
      pointInsideNode(points[firstOutsideIndex]!, node)
    ) {
      firstOutsideIndex++;
    }
    if (firstOutsideIndex > 1) {
      points.splice(1, firstOutsideIndex - 1);
    }
    return;
  }

  let lastOutsideIndex = points.length - 2;
  while (lastOutsideIndex > 0 && pointInsideNode(points[lastOutsideIndex]!, node)) {
    lastOutsideIndex--;
  }
  if (lastOutsideIndex < points.length - 2) {
    points.splice(lastOutsideIndex + 1, points.length - 2 - lastOutsideIndex);
  }
}

function pointOutsideNodeSide(
  point: { x: number; y: number },
  side: EndpointSide,
): { x: number; y: number } {
  const clearance = Math.max(EDGE_NODE_BETWEEN_LAYERS_GAP, EDGE_UNSHARE_OFFSET);
  switch (side) {
    case 'top':
      return { x: point.x, y: point.y - clearance };
    case 'right':
      return { x: point.x + clearance, y: point.y };
    case 'bottom':
      return { x: point.x, y: point.y + clearance };
    case 'left':
      return { x: point.x - clearance, y: point.y };
  }
}

function candidateRoutesForSides(
  from: LayoutedNode,
  to: LayoutedNode,
  sourceSide: EndpointSide,
  targetSide: EndpointSide,
): Array<Array<{ x: number; y: number }>> {
  const start = pointOnNodeSide(from, sourceSide, nodeCenter(to));
  const end = pointOnNodeSide(to, targetSide, nodeCenter(from));
  const startOutside = pointOutsideNodeSide(start, sourceSide);
  const endOutside = pointOutsideNodeSide(end, targetSide);

  if (
    Math.abs(startOutside.x - endOutside.x) <= EPSILON ||
    Math.abs(startOutside.y - endOutside.y) <= EPSILON
  ) {
    return [[start, startOutside, endOutside, end]];
  }

  return [
    [
      start,
      startOutside,
      { x: startOutside.x, y: endOutside.y },
      endOutside,
      end,
    ],
    [
      start,
      startOutside,
      { x: endOutside.x, y: startOutside.y },
      endOutside,
      end,
    ],
  ];
}

function rerouteCrowdedEdgesViaAlternateSides(
  edges: LayoutedEdge[],
  nodeById: Map<string, LayoutedNode>,
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): void {
  for (let pass = 0; pass < EDGE_UNSHARE_MAX_PASSES; pass++) {
    let changed = false;

    for (let firstIndex = 0; firstIndex < edges.length && !changed; firstIndex++) {
      const firstSegments = edgeSegments(edges[firstIndex]!.points);
      for (let secondIndex = firstIndex + 1; secondIndex < edges.length && !changed; secondIndex++) {
        const secondSegments = edgeSegments(edges[secondIndex]!.points);
        let crowded = false;

        for (const firstSegment of firstSegments) {
          if (crowded) {
            break;
          }

          for (const secondSegment of secondSegments) {
            if (crowdedParallelAxisRange(firstSegment, secondSegment)) {
              crowded = true;
              break;
            }
          }
        }

        if (!crowded) {
          continue;
        }

        const candidates = [firstIndex, secondIndex];
        for (const edgeIndex of candidates) {
          const edge = edges[edgeIndex]!;
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to || !shouldRepairEndpointNode(from) || !shouldRepairEndpointNode(to)) {
            continue;
          }

          const original = edge.points.map((point) => ({ ...point }));
          const baselineScore = edgeCrowdingScore(edges, edgeIndex);
          let best:
            | {
                points: Array<{ x: number; y: number }>;
                score: number;
                pathLength: number;
              }
            | undefined;

          for (const sourceSide of ENDPOINT_SIDES) {
            for (const targetSide of ENDPOINT_SIDES) {
              for (const candidatePoints of candidateRoutesForSides(from, to, sourceSide, targetSide)) {
                const candidateEdge: LayoutedEdge = {
                  ...edge,
                  points: candidatePoints.map((point) => ({ ...point })),
                };

                cleanEdgePoints(candidateEdge, nodes, groups);
                ensureEndpointRunway([candidateEdge]);
                cleanEdgePoints(candidateEdge, nodes, groups);

                if (!routeClearOfObstacles(edge, candidateEdge.points, nodes, groups)) {
                  continue;
                }

                edge.points.splice(0, edge.points.length, ...candidateEdge.points);
                const candidateScore = edgeCrowdingScore(edges, edgeIndex);
                const candidatePathLength = edgePathLength(edge);

                if (
                  candidateScore + EPSILON < baselineScore &&
                  (
                    !best ||
                    candidateScore < best.score - EPSILON ||
                    (
                      Math.abs(candidateScore - best.score) <= EPSILON &&
                      candidatePathLength < best.pathLength - EPSILON
                    )
                  )
                ) {
                  best = {
                    points: edge.points.map((point) => ({ ...point })),
                    score: candidateScore,
                    pathLength: candidatePathLength,
                  };
                }
              }
            }
          }

          edge.points.splice(0, edge.points.length, ...original);

          if (!best) {
            continue;
          }

          edge.points.splice(0, edge.points.length, ...best.points);
          changed = true;
          break;
        }
      }
    }

    if (!changed) {
      return;
    }
  }
}

function addOrthogonalConnector(
  points: Array<{ x: number; y: number }>,
  from: { x: number; y: number },
  to: { x: number; y: number },
  side: EndpointSide,
  node?: LayoutedNode,
): void {
  const segmentCrossesNode = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): boolean => {
    if (!node) {
      return false;
    }
    const orientation = Math.abs(a.x - b.x) < EPSILON ? 'vertical' : 'horizontal';
    return segmentRectOverlap(
      {
        a,
        b,
        index: 0,
        length: Math.hypot(b.x - a.x, b.y - a.y),
        orientation,
      },
      {
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.measuredWidth,
        height: node.measuredHeight,
      },
    ) !== undefined;
  };
  const pushOutsideDetour = () => {
    if (!node) {
      return;
    }
    if (side === 'top' || side === 'bottom') {
      const nodeMidX = node.x + node.measuredWidth / 2;
      const detourX = to.x < nodeMidX
        ? node.x - EDGE_OBSTACLE_CLEARANCE
        : node.x + node.measuredWidth + EDGE_OBSTACLE_CLEARANCE;
      pushDistinctPoint(points, { x: detourX, y: from.y });
      pushDistinctPoint(points, { x: detourX, y: to.y });
      pushDistinctPoint(points, to);
      return;
    }

    const nodeMidY = node.y + node.measuredHeight / 2;
    const detourY = to.y < nodeMidY
      ? node.y - EDGE_OBSTACLE_CLEARANCE
      : node.y + node.measuredHeight + EDGE_OBSTACLE_CLEARANCE;
    pushDistinctPoint(points, { x: from.x, y: detourY });
    pushDistinctPoint(points, { x: to.x, y: detourY });
    pushDistinctPoint(points, to);
  };

  if (Math.abs(from.x - to.x) < EPSILON || Math.abs(from.y - to.y) < EPSILON) {
    if (segmentCrossesNode(from, to)) {
      pushOutsideDetour();
      return;
    }

    pushDistinctPoint(points, to);
    return;
  }

  const elbow =
    side === 'top' || side === 'bottom'
      ? { x: to.x, y: from.y }
      : { x: from.x, y: to.y };
  if (segmentCrossesNode(from, elbow) || segmentCrossesNode(elbow, to)) {
    pushOutsideDetour();
    return;
  }

  pushDistinctPoint(points, elbow);
  pushDistinctPoint(points, to);
}

function setEndpointOnSide(
  points: Array<{ x: number; y: number }>,
  role: 'source' | 'target',
  side: EndpointSide,
  point: { x: number; y: number },
  node?: LayoutedNode,
): void {
  if (points.length < 2) {
    return;
  }

  const outside = pointOutsideNodeSide(point, side);

  if (role === 'source') {
    const rest = node
      ? points.slice(1).filter((item) => !pointInsideNode(item, node))
      : points.slice(1);
    const next: Array<{ x: number; y: number }> = [point];
    pushDistinctPoint(next, outside);
    const firstRest = rest[0];
    if (firstRest) {
      addOrthogonalConnector(next, outside, firstRest, side, node);
      for (const restPoint of rest.slice(1)) {
        pushDistinctPoint(next, restPoint);
      }
    }
    points.splice(0, points.length, ...next);
    return;
  }

  const prefix = node
    ? points.slice(0, -1).filter((item) => !pointInsideNode(item, node))
    : points.slice(0, -1);
  const next: Array<{ x: number; y: number }> = [];
  for (const prefixPoint of prefix.slice(0, -1)) {
    pushDistinctPoint(next, prefixPoint);
  }

  const lastPrefix = prefix.at(-1);
  if (lastPrefix) {
    pushDistinctPoint(next, lastPrefix);
    addOrthogonalConnector(next, lastPrefix, outside, side, node);
  }
  pushDistinctPoint(next, point);
  points.splice(0, points.length, ...next);
}

function shouldRepairEndpointNode(node: LayoutedNode): boolean {
  return !node.component || node.component === 'box';
}

function repairEndpointNodeCrossings(
  edges: LayoutedEdge[],
  nodeById: Map<string, LayoutedNode>,
  groups?: LayoutedGroup[],
): void {
  for (const edge of edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to || edge.points.length < 2) {
      continue;
    }

    const sides = endpointSidesForNodes(from, to);
    const segments = edgeSegments(edge.points);
    const sourceCrossing = segments.some((segment) =>
      segmentViolatesRectBodyOrSide(segment, nodeRect(from))
    );
    const currentSourceSide = endpointSideForPoint(from, edge.points[0]!);
    if (
      shouldRepairEndpointNode(from) &&
      (currentSourceSide !== sides.sourceSide || sourceCrossing)
    ) {
      trimEndpointInteriorPoints(edge.points, 'source', from);
      setEndpointOnSide(
        edge.points,
        'source',
        sides.sourceSide,
        pointOnNodeSide(from, sides.sourceSide, edge.points[0]!),
        from,
      );
    }

    const repairedSegments = edgeSegments(edge.points);
    const targetCrossing = repairedSegments.some((segment) =>
      segmentViolatesRectBodyOrSide(segment, nodeRect(to))
    );
    const currentTargetSide = endpointSideForPoint(to, edge.points.at(-1)!);
    if (
      shouldRepairEndpointNode(to) &&
      (currentTargetSide !== sides.targetSide || targetCrossing)
    ) {
      trimEndpointInteriorPoints(edge.points, 'target', to);
      setEndpointOnSide(
        edge.points,
        'target',
        sides.targetSide,
        pointOnNodeSide(to, sides.targetSide, edge.points.at(-1)!),
        to,
      );
    }

    cleanEdgePoints(edge, Array.from(nodeById.values()), groups);
  }
}

function lineCoordinate(
  segment: EdgeSegment,
): number {
  return segment.orientation === 'horizontal' ? segment.a.y : segment.a.x;
}

function axisStart(segment: EdgeSegment): number {
  return segment.orientation === 'horizontal' ? segment.a.x : segment.a.y;
}

function axisEnd(segment: EdgeSegment): number {
  return segment.orientation === 'horizontal' ? segment.b.x : segment.b.y;
}

function pointAtAxis(
  segment: EdgeSegment,
  scalar: number,
): { x: number; y: number } {
  return segment.orientation === 'horizontal'
    ? { x: scalar, y: segment.a.y }
    : { x: segment.a.x, y: scalar };
}

function shiftedPoint(
  point: { x: number; y: number },
  orientation: EdgeSegment['orientation'],
  offset: number,
): { x: number; y: number } {
  return orientation === 'horizontal'
    ? { x: point.x, y: point.y + offset }
    : { x: point.x + offset, y: point.y };
}

function overlappingAxisRange(
  a: EdgeSegment,
  b: EdgeSegment,
): { min: number; max: number } | undefined {
  if (a.orientation !== b.orientation) {
    return undefined;
  }
  if (Math.abs(lineCoordinate(a) - lineCoordinate(b)) > EPSILON) {
    return undefined;
  }

  return overlappingAxisSpan(a, b);
}

function overlappingAxisSpan(
  a: EdgeSegment,
  b: EdgeSegment,
): { min: number; max: number } | undefined {
  const aMin = Math.min(axisStart(a), axisEnd(a));
  const aMax = Math.max(axisStart(a), axisEnd(a));
  const bMin = Math.min(axisStart(b), axisEnd(b));
  const bMax = Math.max(axisStart(b), axisEnd(b));
  const min = Math.max(aMin, bMin);
  const max = Math.min(aMax, bMax);

  return max - min > EPSILON ? { min, max } : undefined;
}

function crowdedParallelAxisRange(
  a: EdgeSegment,
  b: EdgeSegment,
): { min: number; max: number } | undefined {
  if (a.orientation !== b.orientation) {
    return undefined;
  }

  const lineDistance = Math.abs(lineCoordinate(a) - lineCoordinate(b));
  if (
    lineDistance <= EPSILON ||
    lineDistance >= MIN_PARALLEL_SEGMENT_CLEARANCE
  ) {
    return undefined;
  }

  const overlap = overlappingAxisSpan(a, b);
  if (!overlap) {
    return undefined;
  }

  const overlapLength = overlap.max - overlap.min;
  if (overlapLength > EDGE_UNSHARE_PADDING * 2) {
    return overlap;
  }

  const aMin = Math.min(axisStart(a), axisEnd(a));
  const aMax = Math.max(axisStart(a), axisEnd(a));
  const bMin = Math.min(axisStart(b), axisEnd(b));
  const bMax = Math.max(axisStart(b), axisEnd(b));
  const touchesBoundary =
    Math.abs(overlap.min - aMin) <= EPSILON ||
    Math.abs(aMax - overlap.max) <= EPSILON ||
    Math.abs(overlap.min - bMin) <= EPSILON ||
    Math.abs(bMax - overlap.max) <= EPSILON;

  return touchesBoundary ? overlap : undefined;
}

function edgeCrowdingScore(
  edges: LayoutedEdge[],
  edgeIndex: number,
): number {
  const edge = edges[edgeIndex];
  if (!edge) {
    return Number.POSITIVE_INFINITY;
  }

  const segments = edgeSegments(edge.points);
  let score = 0;

  for (let otherIndex = 0; otherIndex < edges.length; otherIndex++) {
    if (otherIndex === edgeIndex) {
      continue;
    }

    const other = edges[otherIndex];
    if (!other) {
      continue;
    }

    for (const segment of segments) {
      for (const otherSegment of edgeSegments(other.points)) {
        const shared = overlappingAxisRange(segment, otherSegment);
        if (shared) {
          score += 1_000 + (shared.max - shared.min);
          continue;
        }

        const crowded = crowdedParallelAxisRange(segment, otherSegment);
        if (crowded) {
          score += 100 + (crowded.max - crowded.min);
        }
      }
    }
  }

  return score;
}

function detourSegmentToLineCoordinate(
  edge: LayoutedEdge,
  segmentIndex: number,
  overlap: { min: number; max: number },
  line: number,
): void {
  const segments = edgeSegments(edge.points);
  const segment = segments.find((item) => item.index === segmentIndex);
  if (!segment) {
    return;
  }

  const start = axisStart(segment);
  const end = axisEnd(segment);
  const direction = end >= start ? 1 : -1;
  const segmentMin = Math.min(start, end);
  const segmentMax = Math.max(start, end);
  const enterScalar = direction > 0
    ? Math.max(segmentMin, overlap.min - EDGE_UNSHARE_PADDING)
    : Math.min(segmentMax, overlap.max + EDGE_UNSHARE_PADDING);
  const exitScalar = direction > 0
    ? Math.min(segmentMax, overlap.max + EDGE_UNSHARE_PADDING)
    : Math.max(segmentMin, overlap.min - EDGE_UNSHARE_PADDING);
  const snappedEnterScalar = Math.abs(enterScalar - segmentMin) <= EDGE_OBSTACLE_CLEARANCE
    ? segmentMin
    : enterScalar;
  const snappedExitScalar = Math.abs(segmentMax - exitScalar) <= EDGE_OBSTACLE_CLEARANCE
    ? segmentMax
    : exitScalar;
  const enter = pointAtAxis(segment, snappedEnterScalar);
  const exit = pointAtAxis(segment, snappedExitScalar);
  const perpendicularOffset = line - lineCoordinate(segment);
  const replacement = [
    enter,
    shiftedPoint(enter, segment.orientation, perpendicularOffset),
    shiftedPoint(exit, segment.orientation, perpendicularOffset),
    exit,
  ];

  const next: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < edge.points.length; index++) {
    pushDistinctPoint(next, edge.points[index]!);
    if (index === segmentIndex) {
      for (const point of replacement) {
        pushDistinctPoint(next, point);
      }
    }
  }

  edge.points.splice(0, edge.points.length, ...next);
}

function shiftSegmentToLineCoordinate(
  edge: LayoutedEdge,
  segmentIndex: number,
  line: number,
): void {
  const segments = edgeSegments(edge.points);
  const segment = segments.find((item) => item.index === segmentIndex);
  if (!segment) {
    return;
  }

  const start = edge.points[segmentIndex];
  const end = edge.points[segmentIndex + 1];
  if (!start || !end) {
    return;
  }

  const delta = line - lineCoordinate(segment);
  if (Math.abs(delta) <= EPSILON) {
    return;
  }

  if (segment.orientation === 'horizontal') {
    start.y += delta;
    end.y += delta;
    return;
  }

  start.x += delta;
  end.x += delta;
}

function detourSharedSegment(
  edges: LayoutedEdge[],
  edgeIndex: number,
  edge: LayoutedEdge,
  segmentIndex: number,
  overlap: { min: number; max: number },
  offset: number,
  nodes?: LayoutedNode[],
  groups?: LayoutedGroup[],
): boolean {
  const segment = edgeSegments(edge.points).find((item) => item.index === segmentIndex);
  if (!segment) {
    return false;
  }

  const original = edge.points.map((point) => ({ ...point }));
  const baselineScore = edgeCrowdingScore(edges, edgeIndex);
  const segmentMin = Math.min(axisStart(segment), axisEnd(segment));
  const segmentMax = Math.max(axisStart(segment), axisEnd(segment));
  const touchesSegmentBoundary =
    Math.abs(overlap.min - segmentMin) <= EDGE_OBSTACLE_CLEARANCE ||
    Math.abs(segmentMax - overlap.max) <= EDGE_OBSTACLE_CLEARANCE;
  let best:
    | {
        points: Array<{ x: number; y: number }>;
        score: number;
        pathLength: number;
      }
    | undefined;
  const preferredOffsets = Array.from(
    { length: 4 },
    (_, index) => offset * (index + 1),
  );
  const offsets = [
    ...preferredOffsets,
    ...preferredOffsets.map((candidateOffset) => -candidateOffset),
  ];
  for (const candidateOffset of offsets) {
    const candidateLine = lineCoordinate(segment) + candidateOffset;
    const attempts = touchesSegmentBoundary
      ? [
          () => shiftSegmentToLineCoordinate(edge, segmentIndex, candidateLine),
          () => detourSegmentToLineCoordinate(edge, segmentIndex, overlap, candidateLine),
        ]
      : [
          () => detourSegmentToLineCoordinate(edge, segmentIndex, overlap, candidateLine),
        ];

    for (const attempt of attempts) {
      edge.points.splice(0, edge.points.length, ...original.map((point) => ({ ...point })));
      attempt();
      cleanEdgePoints(edge, nodes, groups);
      ensureEndpointRunway([edge]);
      cleanEdgePoints(edge, nodes, groups);

      if (nodes && groups && !routeClearOfHardObstacles(edge, edge.points, nodes, groups)) {
        continue;
      }

      const candidateScore = edgeCrowdingScore(edges, edgeIndex);
      if (candidateScore + EPSILON >= baselineScore) {
        continue;
      }

      const candidatePathLength = edgePathLength(edge);
      if (
        !best ||
        candidateScore < best.score - EPSILON ||
        (
          Math.abs(candidateScore - best.score) <= EPSILON &&
          candidatePathLength < best.pathLength - EPSILON
        )
      ) {
        best = {
          points: edge.points.map((point) => ({ ...point })),
          score: candidateScore,
          pathLength: candidatePathLength,
        };
      }
    }
  }

  if (best) {
    edge.points.splice(0, edge.points.length, ...best.points);
    return true;
  }

  edge.points.splice(0, edge.points.length, ...original);
  return false;
}

function isTerminalSegment(edge: LayoutedEdge, segment: EdgeSegment): boolean {
  return segment.index === 0 || segment.index >= edge.points.length - 2;
}

function unshareOverlappingEdgeSegments(
  edges: LayoutedEdge[],
  nodes?: LayoutedNode[],
  groups?: LayoutedGroup[],
): void {
  for (let pass = 0; pass < EDGE_UNSHARE_MAX_PASSES; pass++) {
    let changed = false;

    for (let firstIndex = 0; firstIndex < edges.length && !changed; firstIndex++) {
      const firstSegments = edgeSegments(edges[firstIndex]!.points);
      for (let secondIndex = firstIndex + 1; secondIndex < edges.length && !changed; secondIndex++) {
        const secondSegments = edgeSegments(edges[secondIndex]!.points);
        for (const firstSegment of firstSegments) {
          for (const secondSegment of secondSegments) {
            const overlap =
              overlappingAxisRange(firstSegment, secondSegment) ??
              crowdedParallelAxisRange(firstSegment, secondSegment);
            if (!overlap) {
              continue;
            }

            const firstIsTerminal = isTerminalSegment(edges[firstIndex]!, firstSegment);
            const secondIsTerminal = isTerminalSegment(edges[secondIndex]!, secondSegment);
            const candidates = [
              { edgeIndex: firstIndex, segment: firstSegment, isTerminal: firstIsTerminal },
              { edgeIndex: secondIndex, segment: secondSegment, isTerminal: secondIsTerminal },
            ].sort((a, b) => {
              const aPriority = a.segment.length + (a.isTerminal ? EDGE_UNSHARE_OFFSET : 0);
              const bPriority = b.segment.length + (b.isTerminal ? EDGE_UNSHARE_OFFSET : 0);
              return aPriority - bPriority || a.edgeIndex - b.edgeIndex;
            });

            for (const candidate of candidates) {
              const otherSegment = candidate.edgeIndex === firstIndex ? secondSegment : firstSegment;
              const candidateLine = lineCoordinate(candidate.segment);
              const otherLine = lineCoordinate(otherSegment);
              const lineDistance = Math.abs(candidateLine - otherLine);
              const offsetDirection = Math.abs(candidateLine - otherLine) <= EPSILON
                ? ((candidate.edgeIndex + candidate.segment.index) % 2 === 0 ? 1 : -1)
                : (candidateLine < otherLine ? -1 : 1);
              const offsetMagnitude = lineDistance <= EPSILON
                ? EDGE_UNSHARE_OFFSET
                : Math.max(1, MIN_PARALLEL_SEGMENT_CLEARANCE - lineDistance);
              const offset = offsetDirection * offsetMagnitude;
              if (
                detourSharedSegment(
                  edges,
                  candidate.edgeIndex,
                  edges[candidate.edgeIndex]!,
                  candidate.segment.index,
                  overlap,
                  offset,
                  nodes,
                  groups,
                )
              ) {
                changed = true;
                break;
              }
            }
            if (changed) {
              break;
            }
          }
          if (changed) {
            break;
          }
        }
      }
    }

    if (!changed) {
      return;
    }
  }
}

interface RectObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function inflatedNodeRect(node: LayoutedNode): RectObstacle {
  const rect = nodeRect(node);
  return {
    id: rect.id,
    x: rect.x - EDGE_OBSTACLE_CLEARANCE,
    y: rect.y - EDGE_OBSTACLE_CLEARANCE,
    width: rect.width + EDGE_OBSTACLE_CLEARANCE * 2,
    height: rect.height + EDGE_OBSTACLE_CLEARANCE * 2,
  };
}

function chooseClearLine(current: number, low: number, high: number): number {
  const before = low - EDGE_OBSTACLE_CLEARANCE;
  const after = high + EDGE_OBSTACLE_CLEARANCE;
  return Math.abs(current - before) <= Math.abs(current - after) ? before : after;
}

function segmentRectOverlap(
  segment: EdgeSegment,
  rect: RectObstacle,
): { overlap: { min: number; max: number }; clearLine: number } | undefined {
  const coord = lineCoordinate(segment);

  if (segment.orientation === 'vertical') {
    if (coord < rect.x - EPSILON || coord > rect.x + rect.width + EPSILON) {
      return undefined;
    }
    const min = Math.max(Math.min(segment.a.y, segment.b.y), rect.y);
    const max = Math.min(Math.max(segment.a.y, segment.b.y), rect.y + rect.height);
    if (max - min <= EPSILON) {
      return undefined;
    }
    return {
      overlap: { min, max },
      clearLine: chooseClearLine(coord, rect.x, rect.x + rect.width),
    };
  }

  if (coord < rect.y - EPSILON || coord > rect.y + rect.height + EPSILON) {
    return undefined;
  }
  const min = Math.max(Math.min(segment.a.x, segment.b.x), rect.x);
  const max = Math.min(Math.max(segment.a.x, segment.b.x), rect.x + rect.width);
  if (max - min <= EPSILON) {
    return undefined;
  }

  return {
    overlap: { min, max },
    clearLine: chooseClearLine(coord, rect.y, rect.y + rect.height),
  };
}

function segmentCrossesRectInterior(
  segment: EdgeSegment,
  rect: RectObstacle,
): boolean {
  const coord = lineCoordinate(segment);

  if (segment.orientation === 'vertical') {
    if (coord <= rect.x + EPSILON || coord >= rect.x + rect.width - EPSILON) {
      return false;
    }

    const min = Math.max(Math.min(segment.a.y, segment.b.y), rect.y);
    const max = Math.min(Math.max(segment.a.y, segment.b.y), rect.y + rect.height);
    return max - min > EPSILON;
  }

  if (coord <= rect.y + EPSILON || coord >= rect.y + rect.height - EPSILON) {
    return false;
  }

  const min = Math.max(Math.min(segment.a.x, segment.b.x), rect.x);
  const max = Math.min(Math.max(segment.a.x, segment.b.x), rect.x + rect.width);
  return max - min > EPSILON;
}

function segmentMergesWithRectSide(
  segment: EdgeSegment,
  rect: RectObstacle,
): boolean {
  const coord = lineCoordinate(segment);

  if (segment.orientation === 'vertical') {
    if (
      Math.abs(coord - rect.x) > EPSILON &&
      Math.abs(coord - (rect.x + rect.width)) > EPSILON
    ) {
      return false;
    }

    const min = Math.max(Math.min(segment.a.y, segment.b.y), rect.y);
    const max = Math.min(Math.max(segment.a.y, segment.b.y), rect.y + rect.height);
    return max - min > EPSILON;
  }

  if (
    Math.abs(coord - rect.y) > EPSILON &&
    Math.abs(coord - (rect.y + rect.height)) > EPSILON
  ) {
    return false;
  }

  const min = Math.max(Math.min(segment.a.x, segment.b.x), rect.x);
  const max = Math.min(Math.max(segment.a.x, segment.b.x), rect.x + rect.width);
  return max - min > EPSILON;
}

function segmentViolatesRectBodyOrSide(
  segment: EdgeSegment,
  rect: RectObstacle,
): boolean {
  return segmentCrossesRectInterior(segment, rect) ||
    segmentMergesWithRectSide(segment, rect);
}

function nodeRect(node: LayoutedNode): RectObstacle {
  const obstacle = connectionObstacleBox(node);
  return {
    id: obstacle.id,
    x: obstacle.x,
    y: obstacle.y,
    width: obstacle.width,
    height: obstacle.height,
  };
}

function routeViolatesAnyNodeBodyOrSide(
  points: Array<{ x: number; y: number }>,
  nodes: LayoutedNode[],
): boolean {
  return edgeSegments(points).some((segment) =>
    nodes.some((node) => segmentViolatesRectBodyOrSide(segment, nodeRect(node)))
  );
}

function repairNodeBodyAndSideViolations(
  edges: LayoutedEdge[],
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): void {
  for (let pass = 0; pass < EDGE_UNSHARE_MAX_PASSES * 4; pass++) {
    let changed = false;

    for (const edge of edges) {
      if (changed) {
        break;
      }

      for (const segment of edgeSegments(edge.points)) {
        if (changed) {
          break;
        }

        for (const node of nodes) {
          const rect = nodeRect(node);
          if (!segmentViolatesRectBodyOrSide(segment, rect)) {
            continue;
          }

          const collision = segmentRectOverlap(segment, rect);
          if (!collision) {
            continue;
          }

          detourSegmentToLineCoordinate(edge, segment.index, collision.overlap, collision.clearLine);
          cleanEdgePoints(edge, nodes, groups);
          changed = true;
          break;
        }
      }
    }

    if (!changed) {
      return;
    }
  }
}

function avoidNodeBodies(
  edges: LayoutedEdge[],
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): boolean {
  for (const edge of edges) {
    const obstacles = nodes.filter((node) => node.id !== edge.from && node.id !== edge.to);
    for (const segment of edgeSegments(edge.points)) {
      for (const node of obstacles) {
        const collision = segmentRectOverlap(segment, inflatedNodeRect(node));
        if (!collision) {
          continue;
        }

        const exactCollision = segmentRectOverlap(segment, nodeRect(node));
        if (exactCollision) {
          detourSegmentToLineCoordinate(edge, segment.index, exactCollision.overlap, exactCollision.clearLine);
          cleanEdgePoints(edge, nodes, groups);
          return true;
        }

        if (optimizeVerticalLaneRoute(edge, nodes, groups, true)) {
          return true;
        }
      }
    }
  }

  return false;
}

function groupBorderOverlaps(
  segment: EdgeSegment,
  group: LayoutedGroup,
): Array<{ overlap: { min: number; max: number }; clearLine: number }> {
  const overlaps: Array<{ overlap: { min: number; max: number }; clearLine: number }> = [];
  const coord = lineCoordinate(segment);

  if (segment.orientation === 'vertical') {
    for (const side of [group.x, group.x + group.width]) {
      if (Math.abs(coord - side) > GROUP_BORDER_MERGE_TOLERANCE) {
        continue;
      }
      const min = Math.max(Math.min(segment.a.y, segment.b.y), group.y);
      const max = Math.min(Math.max(segment.a.y, segment.b.y), group.y + group.height);
      if (max - min > EPSILON) {
        const outward = Math.abs(side - group.x) < EPSILON
          ? group.x - EDGE_UNSHARE_OFFSET
          : group.x + group.width + EDGE_UNSHARE_OFFSET;
        overlaps.push({ overlap: { min, max }, clearLine: outward });
      }
    }
    return overlaps;
  }

  for (const side of [group.y, group.y + group.height]) {
    if (Math.abs(coord - side) > GROUP_BORDER_MERGE_TOLERANCE) {
      continue;
    }
    const min = Math.max(Math.min(segment.a.x, segment.b.x), group.x);
    const max = Math.min(Math.max(segment.a.x, segment.b.x), group.x + group.width);
    if (max - min > EPSILON) {
      const outward = Math.abs(side - group.y) < EPSILON
        ? group.y - EDGE_UNSHARE_OFFSET
        : group.y + group.height + EDGE_UNSHARE_OFFSET;
      overlaps.push({ overlap: { min, max }, clearLine: outward });
    }
  }

  return overlaps;
}

function avoidGroupBorders(edges: LayoutedEdge[], groups: LayoutedGroup[]): boolean {
  for (const edge of edges) {
    for (const segment of edgeSegments(edge.points)) {
      for (const group of groups) {
        const overlaps = groupBorderOverlaps(segment, group);
        const overlap = overlaps[0];
        if (!overlap) {
          continue;
        }

        detourSegmentToLineCoordinate(edge, segment.index, overlap.overlap, overlap.clearLine);
        return true;
      }
    }
  }

  return false;
}

function edgeMayUseGroup(edge: LayoutedEdge, group: LayoutedGroup): boolean {
  return (group.contains ?? []).includes(edge.from) || (group.contains ?? []).includes(edge.to);
}

function avoidGroupBodies(edges: LayoutedEdge[], groups: LayoutedGroup[]): boolean {
  for (const edge of edges) {
    const obstacles = groups.filter((group) => !edgeMayUseGroup(edge, group));
    for (const segment of edgeSegments(edge.points)) {
      for (const group of obstacles) {
        const collision = segmentRectOverlap(segment, {
          id: group.id,
          x: group.x,
          y: group.y,
          width: group.width,
          height: group.height,
        });
        if (!collision) {
          continue;
        }

        detourSegmentToLineCoordinate(edge, segment.index, collision.overlap, collision.clearLine);
        return true;
      }
    }
  }

  return false;
}

function avoidObstacles(
  edges: LayoutedEdge[],
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): void {
  for (let pass = 0; pass < EDGE_UNSHARE_MAX_PASSES; pass++) {
    if (avoidNodeBodies(edges, nodes, groups) || avoidGroupBodies(edges, groups) || avoidGroupBorders(edges, groups)) {
      continue;
    }
    return;
  }
}

function avoidBodies(
  edges: LayoutedEdge[],
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): void {
  for (let pass = 0; pass < EDGE_UNSHARE_MAX_PASSES; pass++) {
    if (avoidNodeBodies(edges, nodes, groups) || avoidGroupBodies(edges, groups)) {
      continue;
    }
    return;
  }
}

function edgePathLength(edge: LayoutedEdge): number {
  return edgeSegments(edge.points).reduce((total, segment) => total + segment.length, 0);
}

function routeHitsNode(
  points: Array<{ x: number; y: number }>,
  node: LayoutedNode,
): boolean {
  return edgeSegments(points).some((segment) =>
    segmentRectOverlap(segment, inflatedNodeRect(node)) !== undefined
  );
}

function routeMergesWithGroupBorder(
  points: Array<{ x: number; y: number }>,
  groups: LayoutedGroup[],
): boolean {
  return edgeSegments(points).some((segment) =>
    groups.some((group) => groupBorderOverlaps(segment, group).length > 0)
  );
}

function routeHitsGroupBody(
  edge: LayoutedEdge,
  points: Array<{ x: number; y: number }>,
  groups: LayoutedGroup[],
): boolean {
  return edgeSegments(points).some((segment) =>
    groups.some((group) =>
      !edgeMayUseGroup(edge, group) &&
      segmentRectOverlap(segment, {
        id: group.id,
        x: group.x,
        y: group.y,
        width: group.width,
        height: group.height,
      }) !== undefined
    )
  );
}

function routeClearOfObstacles(
  edge: LayoutedEdge,
  points: Array<{ x: number; y: number }>,
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): boolean {
  return !routeViolatesAnyNodeBodyOrSide(points, nodes) &&
    !nodes.some((node) => node.id !== edge.from && node.id !== edge.to && routeHitsNode(points, node)) &&
    !routeHitsGroupBody(edge, points, groups) &&
    !routeMergesWithGroupBorder(points, groups);
}

function routeClearOfHardObstacles(
  edge: LayoutedEdge,
  points: Array<{ x: number; y: number }>,
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): boolean {
  return !routeViolatesAnyNodeBodyOrSide(points, nodes) &&
    !routeHitsGroupBody(edge, points, groups) &&
    !routeMergesWithGroupBorder(points, groups);
}

function candidateLaneXs(nodes: LayoutedNode[], minY: number, maxY: number): number[] {
  const active = nodes
    .filter((node) => node.y + node.measuredHeight >= minY && node.y <= maxY)
    .map((node) => ({
      min: node.x - EDGE_OBSTACLE_CLEARANCE,
      max: node.x + node.measuredWidth + EDGE_OBSTACLE_CLEARANCE,
    }))
    .sort((a, b) => a.min - b.min || a.max - b.max);
  const candidates: number[] = [];

  for (const item of active) {
    candidates.push(item.min - EDGE_OBSTACLE_CLEARANCE);
    candidates.push(item.max + EDGE_OBSTACLE_CLEARANCE);
  }

  for (let index = 0; index < active.length - 1; index++) {
    const left = active[index]!;
    const right = active[index + 1]!;
    const gap = right.min - left.max;
    if (gap >= EDGE_OBSTACLE_CLEARANCE * 2) {
      candidates.push(left.max + gap / 2);
    }
  }

  return candidates;
}

function optimizeVerticalLaneRoute(
  edge: LayoutedEdge,
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
  force = false,
): boolean {
  const start = edge.points[0];
  const end = edge.points.at(-1);
  if (!start || !end || Math.abs(end.y - start.y) <= EDGE_NODE_BETWEEN_LAYERS_GAP * 3) {
    return false;
  }

  const startsVertically = edge.points.length <= 2 ||
    Math.abs(edge.points[1]!.x - start.x) < EPSILON;
  const endsVertically = edge.points.length <= 2 ||
    Math.abs(edge.points.at(-2)!.x - end.x) < EPSILON;
  if (!startsVertically || !endsVertically) {
    return false;
  }

  const direction = end.y >= start.y ? 1 : -1;
  const sourceExitY = start.y + EDGE_NODE_BETWEEN_LAYERS_GAP * direction;
  const targetEntryY = end.y - EDGE_NODE_BETWEEN_LAYERS_GAP * direction;
  if (
    (direction > 0 && targetEntryY <= sourceExitY) ||
    (direction < 0 && targetEntryY >= sourceExitY)
  ) {
    return false;
  }

  const preferred = (start.x + end.x) / 2;
  const lanes = [
    preferred,
    ...candidateLaneXs(
      nodes.filter((node) => node.id !== edge.from && node.id !== edge.to),
      start.y,
      end.y,
    ),
    start.x,
    end.x,
  ].sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred));
  const currentLength = edgePathLength(edge);
  const currentIsClear = routeClearOfObstacles(edge, edge.points, nodes, groups);

  for (const laneX of lanes) {
    const candidate = [
      start,
      { x: start.x, y: sourceExitY },
      { x: laneX, y: sourceExitY },
      { x: laneX, y: targetEntryY },
      { x: end.x, y: targetEntryY },
      end,
    ];
    const candidateEdge = { ...edge, points: candidate };
    cleanEdgePoints(candidateEdge, nodes, groups);
    if (
      !force &&
      currentIsClear &&
      edgePathLength(candidateEdge) + EDGE_OBSTACLE_CLEARANCE >= currentLength
    ) {
      continue;
    }
    if (!routeClearOfObstacles(edge, candidateEdge.points, nodes, groups)) {
      continue;
    }

    edge.points.splice(0, edge.points.length, ...candidateEdge.points);
    return true;
  }

  return false;
}

function optimizeVerticalLaneRoutes(
  edges: LayoutedEdge[],
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): void {
  for (const edge of edges) {
    optimizeVerticalLaneRoute(edge, nodes, groups);
  }
}

function optimizeDirtyVerticalLaneRoutes(
  edges: LayoutedEdge[],
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): void {
  for (const edge of edges) {
    if (!routeClearOfObstacles(edge, edge.points, nodes, groups)) {
      optimizeVerticalLaneRoute(edge, nodes, groups, true);
    }
  }
}

function finalizeEdgeGeometry(
  edges: LayoutedEdge[],
  nodeById: Map<string, LayoutedNode>,
  nodes: LayoutedNode[],
  groups: LayoutedGroup[],
): void {
  // Balance/centre endpoints on every node side, for all node types. Non-box
  // nodes are anchored to their artwork box (with the bottom side reserving
  // room for the title/subtitle) via connectionAnchorBox.
  applyBalancedConnectionAnchors(edges, nodeById);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  ensureEndpointRunway(edges);
  cleanAllEdgePoints(edges, nodes, groups);
  repairNodeBodyAndSideViolations(edges, nodes, groups);
  avoidObstacles(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  repairNodeBodyAndSideViolations(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  avoidObstacles(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  repairNodeBodyAndSideViolations(edges, nodes, groups);
  ensureEndpointRunway(edges);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  repairNodeBodyAndSideViolations(edges, nodes, groups);
  ensureEndpointRunway(edges);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  repairNodeBodyAndSideViolations(edges, nodes, groups);
  ensureEndpointRunway(edges);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  ensureEndpointRunway(edges);
  rerouteCrowdedEdgesViaAlternateSides(edges, nodeById, nodes, groups);
  ensureEndpointRunway(edges);
  cleanAllEdgePoints(edges, nodes, groups);
}

function updateGroupBoundsFromContainedNodes(
  groups: LayoutedGroup[],
  nodeById: Map<string, LayoutedNode>,
): void {
  for (const group of groups) {
    const children = (group.contains ?? [])
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is LayoutedNode => node !== undefined);
    if (children.length === 0) {
      continue;
    }

    const minX = Math.min(...children.map((node) => node.x));
    const minY = Math.min(...children.map((node) => node.y));
    const maxX = Math.max(...children.map((node) => node.x + node.measuredWidth));
    const maxY = Math.max(...children.map((node) => node.y + node.measuredHeight));

    group.x = minX - GROUP_NODE_PADDING;
    group.y = minY - GROUP_NODE_PADDING;
    group.width = maxX - minX + GROUP_NODE_PADDING * 2;
    group.height = maxY - minY + GROUP_NODE_PADDING * 2;
  }
}

function buildElkNode(
  node: MeasuredNode,
  layoutMode: Diagram['layout'],
): ElkNode {
  const elkNode: ElkNode = {
    id: node.id,
    width: node.measuredWidth,
    height: node.measuredHeight,
    layoutOptions: {},
  };

  const isPinned =
    node.pinned === true &&
    node.position?.x !== undefined &&
    node.position?.y !== undefined;

  if (isPinned && (layoutMode === 'auto' || layoutMode === 'hybrid' || !layoutMode)) {
    elkNode.x = node.position!.x;
    elkNode.y = node.position!.y;
    elkNode.layoutOptions = { 'org.eclipse.elk.fixed': 'true' };
  }

  return elkNode;
}

function buildElkGraph(
  diagram: Diagram,
  measuredNodes: MeasuredNode[],
): ElkNode {
  const measuredById = new Map(measuredNodes.map((node) => [node.id, node]));
  const groupedNodeIds = new Set<string>();
  const groups = diagram.groups ?? [];

  for (const group of groups) {
    for (const nodeId of group.contains ?? []) {
      groupedNodeIds.add(nodeId);
    }
  }

  const rootChildren: ElkNode[] = [];

  for (const group of groups) {
    rootChildren.push(buildGroupElkNode(group, measuredById, diagram));
  }

  for (const node of measuredNodes) {
    if (!groupedNodeIds.has(node.id)) {
      rootChildren.push(buildElkNode(node, diagram.layout));
    }
  }

  return {
    id: 'root',
    layoutOptions: baseLayoutOptions(diagram),
    children: rootChildren,
    edges: diagram.edges.map((edge, index) => ({
      id: `e-${index}`,
      sources: [edge.from],
      targets: [edge.to],
    })),
  };
}

function buildGroupElkNode(
  group: DiagramGroup,
  measuredById: Map<string, MeasuredNode>,
  diagram: Diagram,
): ElkNode {
  const children = (group.contains ?? [])
    .map((nodeId) => measuredById.get(nodeId))
    .filter((node): node is MeasuredNode => node !== undefined)
    .map((node) => buildElkNode(node, diagram.layout));

  return {
    id: group.id,
    layoutOptions: {
      ...baseLayoutOptions(diagram),
      'elk.padding': '[60,60,60,60]',
    },
    children,
  };
}

function flattenElkNodes(
  elkNode: ElkNode,
  acc: Map<string, ElkNode>,
  offsetX = 0,
  offsetY = 0,
): void {
  const absX = (elkNode.x ?? 0) + offsetX;
  const absY = (elkNode.y ?? 0) + offsetY;
  if (elkNode.id && elkNode.id !== 'root') {
    acc.set(elkNode.id, { ...elkNode, x: absX, y: absY });
  }
  const childOffsetX = elkNode.id === 'root' ? 0 : absX;
  const childOffsetY = elkNode.id === 'root' ? 0 : absY;
  for (const child of elkNode.children ?? []) {
    flattenElkNodes(child, acc, childOffsetX, childOffsetY);
  }
}

function buildGroupsFromElk(
  diagram: Diagram,
  elkRoot: ElkNode,
): LayoutedGroup[] {
  const groups = diagram.groups ?? [];
  const elkById = new Map<string, ElkNode>();
  flattenElkNodes(elkRoot, elkById);

  return groups.map((group) => {
    const elkGroup = elkById.get(group.id);
    return {
      id: group.id,
      label: group.label,
      x: elkGroup?.x ?? 0,
      y: elkGroup?.y ?? 0,
      width: elkGroup?.width ?? 0,
      height: elkGroup?.height ?? 0,
      contains: group.contains,
      style: group.style as DiagramGroupStyle | undefined,
    };
  });
}

function layoutPreserve(
  diagram: Diagram,
  measuredNodes: MeasuredNode[],
  theme: ThemeTokens,
  options?: { offset?: boolean },
): LayoutedDiagram {
  const missing = measuredNodes
    .filter(
      (node) =>
        node.position?.x === undefined || node.position?.y === undefined,
    )
    .map((node) => node.id);

  if (missing.length > 0) {
    throw new LayoutError(
      `layout: preserve requires position on every node. Missing: ${missing.join(', ')}`,
      missing,
    );
  }

  const nodes: LayoutedNode[] = measuredNodes.map((node) => ({
    ...node,
    x: node.position!.x,
    y: node.position!.y,
  }));

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = buildLayoutedEdges(diagram.edges, nodeById, undefined);
  updateLabeledEdgePlacements(nodes, edges);
  const groups: LayoutedGroup[] = (diagram.groups ?? []).map((group) => ({
    id: group.id,
    label: group.label,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    contains: group.contains,
    style: group.style as DiagramGroupStyle | undefined,
  }));

  updateGroupBoundsFromContainedNodes(groups, nodeById);
  optimizeVerticalLaneRoutes(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  avoidObstacles(edges, nodes, groups);
  optimizeDirtyVerticalLaneRoutes(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  optimizeDirtyVerticalLaneRoutes(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  avoidBodies(edges, nodes, groups);
  optimizeDirtyVerticalLaneRoutes(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  avoidGroupBorders(edges, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  avoidBodies(edges, nodes, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  avoidObstacles(edges, nodes, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  finalizeEdgeGeometry(edges, nodeById, nodes, groups);
  updateLabeledEdgePlacements(nodes, edges);
  assertOrthogonalEdges(edges);
  if (options?.offset !== false) {
    offsetDiagram(nodes, groups, edges);
  }
  applyEdgeBridges(edges);
  const { width, height } = computeBounds(nodes, groups, edges);

  return {
    kind: diagram.kind,
    nodes,
    edges,
    groups: groups.length > 0 ? groups : undefined,
    width,
    height,
    theme,
  };
}

export function computePreservedLayout(input: {
  diagram: Diagram;
  measuredNodes: MeasuredNode[];
  theme: ThemeTokens;
  offset?: boolean;
}): LayoutedDiagram {
  return layoutPreserve(input.diagram, input.measuredNodes, input.theme, {
    offset: input.offset,
  });
}

export async function computeLayout(input: {
  diagram: Diagram;
  measuredNodes: MeasuredNode[];
  theme: ThemeTokens;
}): Promise<LayoutedDiagram> {
  const { diagram, measuredNodes, theme } = input;
  const layoutMode = diagram.layout ?? 'auto';

  if (layoutMode === 'preserve') {
    return layoutPreserve(diagram, measuredNodes, theme);
  }

  const elkGraph = buildElkGraph(diagram, measuredNodes);
  const laidOut = await runElkLayout(elkGraph);
  const elkById = new Map<string, ElkNode>();
  flattenElkNodes(laidOut, elkById);

  const nodes: LayoutedNode[] = measuredNodes.map((node) => {
    const elkNode = elkById.get(node.id);
    return {
      ...node,
      x: elkNode?.x ?? 0,
      y: elkNode?.y ?? 0,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = buildLayoutedEdges(diagram.edges, nodeById, laidOut);
  const groups = buildGroupsFromElk(diagram, laidOut);
  expandLayoutForLabeledEdges(nodes, edges, groups, diagram.direction);
  updateGroupBoundsFromContainedNodes(groups, nodeById);
  optimizeVerticalLaneRoutes(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  avoidObstacles(edges, nodes, groups);
  optimizeDirtyVerticalLaneRoutes(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  optimizeDirtyVerticalLaneRoutes(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  avoidBodies(edges, nodes, groups);
  optimizeDirtyVerticalLaneRoutes(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  avoidGroupBorders(edges, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  avoidBodies(edges, nodes, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  unshareOverlappingEdgeSegments(edges, nodes, groups);
  avoidObstacles(edges, nodes, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  repairEndpointNodeCrossings(edges, nodeById, groups);
  cleanAllEdgePoints(edges, nodes, groups);
  finalizeEdgeGeometry(edges, nodeById, nodes, groups);
  updateLabeledEdgePlacements(nodes, edges);
  assertOrthogonalEdges(edges);

  offsetDiagram(nodes, groups, edges);
  applyEdgeBridges(edges);
  const { width, height } = computeBounds(nodes, groups, edges);

  return {
    kind: diagram.kind,
    nodes,
    edges,
    groups: groups.length > 0 ? groups : undefined,
    width,
    height,
    theme,
  };
}
