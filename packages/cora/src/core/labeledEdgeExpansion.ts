import {
  edgePathLength,
  edgeShaftMidpoint,
  edgeShaftPoints,
} from './edgeGeometry.js';
import { measureLabel } from './measureText.js';
import type { Diagram, LayoutedEdge, LayoutedNode } from './types.js';

export const LABELED_EDGE_LABEL_PADDING = 3;
export const MIN_LABELED_EDGE_STUB = 7;

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

export function expandLayoutForLabeledEdges(
  nodes: LayoutedNode[],
  edges: LayoutedEdge[],
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
}
