import type { LayoutedDiagram } from '../layout-ir.js';
import { edgeLabelRenderPosition } from './components/index.js';

const VIEWBOX_PADDING = 24;

export function computeViewBox(diagram: LayoutedDiagram): string {
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

  for (const node of diagram.nodes) {
    consider(node.x, node.y);
    consider(node.x + node.measuredWidth, node.y + node.measuredHeight);
  }

  for (const group of diagram.groups ?? []) {
    consider(group.x, group.y);
    consider(group.x + group.width, group.y + group.height);
  }

  for (const edge of diagram.edges) {
    for (const point of edge.points) {
      consider(point.x, point.y);
    }
    if (edge.labelPlacement) {
      const renderPosition = edgeLabelRenderPosition(edge.labelPlacement);
      const { width, height } = edge.labelPlacement;
      if (renderPosition.textAnchor === 'end') {
        consider(renderPosition.x - width, renderPosition.y - height / 2);
        consider(renderPosition.x, renderPosition.y + height / 2);
      } else {
        consider(renderPosition.x - width / 2, renderPosition.y - height / 2);
        consider(renderPosition.x + width / 2, renderPosition.y + height / 2);
      }
    } else if (edge.labelX !== undefined && edge.labelY !== undefined) {
      consider(edge.labelX - 20, edge.labelY - 10);
      consider(edge.labelX + 20, edge.labelY + 10);
    }
  }

  if (!Number.isFinite(minX)) {
    return `0 0 ${diagram.width} ${diagram.height}`;
  }

  const x = minX - VIEWBOX_PADDING;
  const y = minY - VIEWBOX_PADDING;
  const width = maxX - minX + VIEWBOX_PADDING * 2;
  const height = maxY - minY + VIEWBOX_PADDING * 2;

  return `${x} ${y} ${width} ${height}`;
}
