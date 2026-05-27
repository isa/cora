import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';

import {
  expandLayoutForLabeledEdges,
  updateLabeledEdgePlacements,
} from './labeledEdgeExpansion.js';
import { edgeBridgeMap, edgePathMidpoint, edgeShaftMidpoint } from './edgeGeometry.js';
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
const NODE_GAP = 24;
const NODE_BETWEEN_LAYERS_GAP = 36;
const EDGE_NODE_BETWEEN_LAYERS_GAP = 18;

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
    'elk.layered.spacing.nodeNodeBetweenLayers': String(
      NODE_BETWEEN_LAYERS_GAP,
    ),
    'elk.layered.spacing.edgeNodeBetweenLayers': String(
      EDGE_NODE_BETWEEN_LAYERS_GAP,
    ),
    'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': String(
      NODE_BETWEEN_LAYERS_GAP,
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

  return edges.map((edge, index) => {
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

    const mid = edge.label
      ? edgeShaftMidpoint(points)
      : edgePathMidpoint(points);
    const labelSize = edge.label ? measureLabel(edge.label, 'edge') : undefined;
    return {
      ...edge,
      points,
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
