import {
  edgePathLength,
  edgeShaftMidpoint,
  edgeShaftPoints,
} from './edgeGeometry.js';
import { measureLabel } from './measureText.js';
import type { Diagram, LayoutedEdge, LayoutedNode, LayoutedGroup } from './types.js';

export const LABELED_EDGE_LABEL_PADDING = 3;
export const MIN_LABELED_EDGE_STUB = 18;
const LABEL_NODE_CLEARANCE = 4;

function labeledGapHalfSpan(label: string, direction: Diagram['direction']): number {
  const { width, height } = measureLabel(label, 'edge');
  const along = direction === 'LR' ? width : height;
  return along / 2 + LABELED_EDGE_LABEL_PADDING;
}

export function minimumLabeledShaftLength(
  label: string,
  direction: Diagram['direction'],
): number {
  return 2 * MIN_LABELED_EDGE_STUB + 2 * labeledGapHalfSpan(label, direction);
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function paddedNodeRect(node: LayoutedNode): Rect {
  return {
    left: node.x - LABEL_NODE_CLEARANCE,
    right: node.x + node.measuredWidth + LABEL_NODE_CLEARANCE,
    top: node.y - LABEL_NODE_CLEARANCE,
    bottom: node.y + node.measuredHeight + LABEL_NODE_CLEARANCE,
  };
}

function labelRect(
  x: number,
  y: number,
  orientation: 'horizontal' | 'vertical',
  width: number,
  height: number,
): Rect {
  const boxWidth = width + LABELED_EDGE_LABEL_PADDING * 2;
  const boxHeight = height + LABELED_EDGE_LABEL_PADDING;
  const renderY = orientation === 'horizontal' ? y - 1 : y;

  return {
    left: x - boxWidth / 2,
    right: x + boxWidth / 2,
    top: renderY - boxHeight / 2,
    bottom: renderY + boxHeight / 2,
  };
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function totalNodeOverlap(rect: Rect, nodes: LayoutedNode[]): number {
  return nodes.reduce((total, node) => total + overlapArea(rect, paddedNodeRect(node)), 0);
}

function labelBoxSize(
  orientation: 'horizontal' | 'vertical',
  width: number,
  height: number,
): { width: number; height: number; renderYOffset: number } {
  const boxWidth = width + LABELED_EDGE_LABEL_PADDING * 2;
  const boxHeight = height + LABELED_EDGE_LABEL_PADDING;
  return {
    width: boxWidth,
    height: boxHeight,
    renderYOffset: orientation === 'horizontal' ? -1 : 0,
  };
}

function candidateSegmentShift(
  edge: LayoutedEdge,
  nodes: LayoutedNode[],
): { axis: 'x' | 'y'; delta: number } | undefined {
  if (!edge.label || edge.points.length < 3) {
    return undefined;
  }

  const mid = edgeShaftMidpoint(edge.points);
  if (mid.segmentIndex <= 0 || mid.segmentIndex >= edge.points.length - 2) {
    return undefined;
  }

  const labelSize = measureLabel(edge.label, 'edge');
  const baseRect = labelRect(
    mid.x,
    mid.y,
    mid.orientation,
    labelSize.width,
    labelSize.height,
  );
  if (totalNodeOverlap(baseRect, nodes) === 0) {
    return undefined;
  }

  const size = labelBoxSize(mid.orientation, labelSize.width, labelSize.height);
  const candidates: Array<{ axis: 'x' | 'y'; delta: number }> = [];

  for (const node of nodes) {
    const rect = paddedNodeRect(node);
    if (overlapArea(baseRect, rect) === 0) {
      continue;
    }

    if (mid.orientation === 'vertical') {
      candidates.push(
        { axis: 'x', delta: rect.left - size.width / 2 - mid.x },
        { axis: 'x', delta: rect.right + size.width / 2 - mid.x },
      );
    } else {
      const renderY = mid.y + size.renderYOffset;
      candidates.push(
        { axis: 'y', delta: rect.top - size.height / 2 - renderY },
        { axis: 'y', delta: rect.bottom + size.height / 2 - renderY },
      );
    }
  }

  return candidates
    .filter((candidate) => Math.abs(candidate.delta) > 0)
    .map((candidate) => {
      const shiftedRect = candidate.axis === 'x'
        ? labelRect(
            mid.x + candidate.delta,
            mid.y,
            mid.orientation,
            labelSize.width,
            labelSize.height,
          )
        : labelRect(
            mid.x,
            mid.y + candidate.delta,
            mid.orientation,
            labelSize.width,
            labelSize.height,
          );
      return {
        ...candidate,
        score: totalNodeOverlap(shiftedRect, nodes) * 1000 + Math.abs(candidate.delta),
      };
    })
    .sort((a, b) => a.score - b.score)[0];
}

function shiftLabelSegment(edge: LayoutedEdge, axis: 'x' | 'y', delta: number): void {
  const mid = edgeShaftMidpoint(edge.points);
  const start = edge.points[mid.segmentIndex];
  const end = edge.points[mid.segmentIndex + 1];
  if (!start || !end) {
    return;
  }

  start[axis] += delta;
  end[axis] += delta;
}

function rerouteLabeledEdgesAroundNodes(
  nodes: LayoutedNode[],
  edges: LayoutedEdge[],
  
): void {
  for (const edge of edges) {
    const shift = candidateSegmentShift(edge, nodes);
    if (!shift) {
      continue;
    }
    shiftLabelSegment(edge, shift.axis, shift.delta);
  }
}

function updateEdgeLabelPlacement(edge: LayoutedEdge): void {
  if (!edge.label) {
    return;
  }

  const mid = edgeShaftMidpoint(edge.points);
  const labelSize = measureLabel(edge.label, 'edge');
  edge.labelX = mid.x;
  edge.labelY = mid.y;
  edge.labelPlacement = {
    x: mid.x,
    y: mid.y,
    width: labelSize.width,
    height: labelSize.height,
    segmentIndex: mid.segmentIndex,
    orientation: mid.orientation,
  };
}

function refreshShiftedEdgeLabels(
  edges: LayoutedEdge[],
  
  shiftedNodeIds: Set<string>,
): void {
  for (const edge of edges) {
    if (!edge.label) continue;
    if (!shiftedNodeIds.has(edge.from) && !shiftedNodeIds.has(edge.to)) continue;
    updateEdgeLabelPlacement(edge);
  }
}

export function updateLabeledEdgePlacements(
  nodes: LayoutedNode[],
  edges: LayoutedEdge[],
  
): void {
  rerouteLabeledEdgesAroundNodes(nodes, edges);
  for (const edge of edges) {
    updateEdgeLabelPlacement(edge);
  }
}

export function expandLayoutForLabeledEdges(
  nodes: LayoutedNode[],
  edges: LayoutedEdge[],
  
  groups: LayoutedGroup[],
  direction: Diagram['direction'],
): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const axis: 'x' | 'y' = direction === 'LR' ? 'x' : 'y';

  const labeledEdges = edges
    .filter((edge) => edge.label)
    .sort((a, b) => (nodeById.get(a.to)?.[axis] ?? 0) - (nodeById.get(b.to)?.[axis] ?? 0));

  for (const edge of labeledEdges) {
    const minShaft = minimumLabeledShaftLength(edge.label!, direction);
    const shaftLength = edgePathLength(edgeShaftPoints(edge.points));
    if (shaftLength >= minShaft) {
      continue;
    }

    const delta = minShaft - shaftLength;
    const toNode = nodeById.get(edge.to);
    if (!toNode) {
      continue;
    }

    const threshold = toNode[axis];
    const shiftedNodeIds = new Set<string>();

    for (const node of nodes) {
      if (node[axis] >= threshold) {
        node[axis] += delta;
        shiftedNodeIds.add(node.id);
      }
    }

    for (const group of groups) {
      if (group[axis] >= threshold) {
        group[axis] += delta;
      }
    }

    for (const layoutedEdge of edges) {
      for (const point of layoutedEdge.points) {
        if (point[axis] >= threshold) {
          point[axis] += delta;
        }
      }
      if (layoutedEdge.labelPlacement && layoutedEdge.labelPlacement[axis] >= threshold) {
        layoutedEdge.labelPlacement[axis] += delta;
      }
      const labelCoord = axis === 'x' ? layoutedEdge.labelX : layoutedEdge.labelY;
      if (labelCoord !== undefined && labelCoord >= threshold) {
        if (axis === 'x') {
          layoutedEdge.labelX = labelCoord + delta;
        } else {
          layoutedEdge.labelY = labelCoord + delta;
        }
      }
    }

    refreshShiftedEdgeLabels(edges, shiftedNodeIds);
    updateEdgeLabelPlacement(edge);
  }

  updateLabeledEdgePlacements(nodes, edges);
}
