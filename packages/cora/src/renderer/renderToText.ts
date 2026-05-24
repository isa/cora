import type { LayoutedDiagram } from '../layout-ir.js';

export type TextCharset = 'unicode' | 'ascii';

export interface RenderToTextOptions {
  charset?: TextCharset;
}

interface GlyphSet {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  cross: string;
  rightArrow: string;
  downArrow: string;
  leftArrow: string;
  upArrow: string;
  circle: string;
  filledCircle: string;
  portDown: string;
  portUp: string;
  portRight: string;
  portLeft: string;
}

const GLYPHS: Record<TextCharset, GlyphSet> = {
  unicode: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    rightArrow: '▶',
    downArrow: '▼',
    leftArrow: '◀',
    upArrow: '▲',
    circle: 'O',
    filledCircle: '●',
    portDown: '╷',
    portUp: '╵',
    portRight: '╶',
    portLeft: '╴',
  },
  ascii: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    horizontal: '-',
    vertical: '|',
    cross: '+',
    rightArrow: '>',
    downArrow: 'v',
    leftArrow: '<',
    upArrow: '^',
    circle: 'O',
    filledCircle: '*',
    portDown: '|',
    portUp: '|',
    portRight: '-',
    portLeft: '-',
  },
};

const MIN_BOX_WIDTH = 8;
const BOX_HEIGHT = 3;
const GRID_PADDING = 2;
const NODE_SPACING_X = 3;
const NODE_SPACING_Y = 2;

interface GridPoint {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function textWidth(text: string): number {
  return Math.max(...text.split('\n').map((line) => [...line].length));
}

function createGrid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => ' '));
}

function setChar(
  grid: string[][],
  point: GridPoint,
  char: string,
  glyphs: GlyphSet,
): void {
  const row = grid[point.y];
  if (!row || point.x < 0 || point.x >= row.length) {
    return;
  }

  const existing = row[point.x] ?? ' ';

  // If existing is already a cross, never overwrite it with a line or corner
  if (existing === glyphs.cross) {
    return;
  }

  const isExistingComplex =
    existing === glyphs.topLeft ||
    existing === glyphs.topRight ||
    existing === glyphs.bottomLeft ||
    existing === glyphs.bottomRight;

  // If existing is a corner, and new char is horizontal or vertical, it already has both, so keep the corner
  if (isExistingComplex && (char === glyphs.horizontal || char === glyphs.vertical)) {
    return;
  }

  // Crossing detection: if horizontal and vertical meet, make it a cross
  if (
    (existing === glyphs.horizontal && char === glyphs.vertical) ||
    (existing === glyphs.vertical && char === glyphs.horizontal)
  ) {
    row[point.x] = glyphs.cross;
    return;
  }

  row[point.x] = char;
}

function writeText(grid: string[][], x: number, y: number, text: string): void {
  const row = grid[y];
  if (!row) {
    return;
  }
  [...text].forEach((char, index) => {
    const col = x + index;
    if (col >= 0 && col < row.length) {
      row[col] = char;
    }
  });
}

function drawBox(
  grid: string[][],
  topLeft: GridPoint,
  width: number,
  height: number,
  label: string,
  glyphs: GlyphSet,
  fillInterior = false,
): void {
  const maxY = grid.length - 1;
  const maxX = grid[0]?.length ? grid[0].length - 1 : 0;
  const x0 = clamp(topLeft.x, 0, maxX);
  const y0 = clamp(topLeft.y, 0, maxY);
  const x1 = clamp(x0 + Math.max(width, MIN_BOX_WIDTH) - 1, x0, maxX);
  const y1 = clamp(y0 + Math.max(height, BOX_HEIGHT) - 1, y0, maxY);

  if (fillInterior) {
    for (let y = y0 + 1; y < y1; y++) {
      for (let x = x0 + 1; x < x1; x++) {
        const row = grid[y];
        if (row && x >= 0 && x < row.length) {
          row[x] = ' ';
        }
      }
    }
  }

  setChar(grid, { x: x0, y: y0 }, glyphs.topLeft, glyphs);
  setChar(grid, { x: x1, y: y0 }, glyphs.topRight, glyphs);
  setChar(grid, { x: x0, y: y1 }, glyphs.bottomLeft, glyphs);
  setChar(grid, { x: x1, y: y1 }, glyphs.bottomRight, glyphs);

  for (let x = x0 + 1; x < x1; x++) {
    setChar(grid, { x, y: y0 }, glyphs.horizontal, glyphs);
    setChar(grid, { x, y: y1 }, glyphs.horizontal, glyphs);
  }

  for (let y = y0 + 1; y < y1; y++) {
    setChar(grid, { x: x0, y }, glyphs.vertical, glyphs);
    setChar(grid, { x: x1, y }, glyphs.vertical, glyphs);
  }

  if (label) {
    const labelY = clamp(y0 + 1, y0, y1);
    const labelX = clamp(
      x0 + Math.max(1, Math.floor((x1 - x0 + 1 - textWidth(label)) / 2)),
      x0 + 1,
      Math.max(x0 + 1, x1 - textWidth(label)),
    );
    writeText(grid, labelX, labelY, label.slice(0, Math.max(0, x1 - x0 - 1)));
  }
}

function drawSegment(
  grid: string[][],
  from: GridPoint,
  to: GridPoint,
  glyphs: GlyphSet,
): void {
  if (from.x === to.x && from.y === to.y) {
    return;
  }

  if (from.y === to.y) {
    const step = from.x <= to.x ? 1 : -1;
    for (let x = from.x; x !== to.x; x += step) {
      setChar(grid, { x, y: from.y }, glyphs.horizontal, glyphs);
    }
  } else if (from.x === to.x) {
    const step = from.y <= to.y ? 1 : -1;
    for (let y = from.y; y !== to.y; y += step) {
      setChar(grid, { x: from.x, y }, glyphs.vertical, glyphs);
    }
  } else {
    // L-shaped fallback: horizontal first, then vertical
    const stepX = from.x <= to.x ? 1 : -1;
    for (let x = from.x; x !== to.x; x += stepX) {
      setChar(grid, { x, y: from.y }, glyphs.horizontal, glyphs);
    }
    const stepY = from.y <= to.y ? 1 : -1;
    for (let y = from.y; y !== to.y; y += stepY) {
      setChar(grid, { x: to.x, y }, glyphs.vertical, glyphs);
    }
  }
}

function getArrowGlyph(from: GridPoint, to: GridPoint, glyphs: GlyphSet): string {
  if (from.x === to.x) {
    return to.y >= from.y ? glyphs.downArrow : glyphs.upArrow;
  }
  if (from.y === to.y) {
    return to.x >= from.x ? glyphs.rightArrow : glyphs.leftArrow;
  }
  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
    ? to.x >= from.x
      ? glyphs.rightArrow
      : glyphs.leftArrow
    : to.y >= from.y
      ? glyphs.downArrow
      : glyphs.upArrow;
}

function getCornerGlyph(
  prev: GridPoint,
  curr: GridPoint,
  next: GridPoint,
  glyphs: GlyphSet,
): string | null {
  const dx1 = curr.x - prev.x;
  const dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x;
  const dy2 = next.y - curr.y;

  // Corner 1: top-left ┌
  if ((dy1 < 0 && dx2 > 0) || (dx1 < 0 && dy2 > 0)) {
    return glyphs.topLeft;
  }
  // Corner 2: top-right ┐
  if ((dy1 < 0 && dx2 < 0) || (dx1 > 0 && dy2 > 0)) {
    return glyphs.topRight;
  }
  // Corner 3: bottom-left └
  if ((dy1 > 0 && dx2 > 0) || (dx1 < 0 && dy2 < 0)) {
    return glyphs.bottomLeft;
  }
  // Corner 4: bottom-right ┘
  if ((dy1 > 0 && dx2 < 0) || (dx1 > 0 && dy2 < 0)) {
    return glyphs.bottomRight;
  }

  return null;
}

function isColumnFree(
  x: number,
  minY: number,
  maxY: number,
  gridNodes: Map<string, GridNode>,
  gridGroups: Map<string, GridGroup>,
  srcId: string,
  tgtId: string,
): boolean {
  if (x < 0) return false;

  for (const node of gridNodes.values()) {
    if (node.id === srcId || node.id === tgtId) {
      continue;
    }
    const overlapY = minY < node.y + node.height && maxY > node.y;
    // Stay at least 1 cell away from node borders
    const insideX = x >= node.x - 1 && x <= node.x + node.width;
    if (overlapY && insideX) {
      return false;
    }
  }

  for (const group of gridGroups.values()) {
    const overlapY = minY < group.y + group.height && maxY > group.y;
    const onBorderX = x === group.x || x === group.x + group.width - 1;
    if (overlapY && onBorderX) {
      return false;
    }

    if (group.label) {
      const gX0 = group.x;
      const gY0 = group.y;
      const gX1 = group.x + group.width - 1;
      const gY1 = group.y + group.height - 1;
      const labelY = clamp(gY0 + 1, gY0, gY1);
      const L = textWidth(group.label);
      const labelX = clamp(
        gX0 + 2,
        gX0 + 1,
        Math.max(gX0 + 1, gX1 - L - 1),
      );

      const labelOverlapY = minY <= labelY && maxY >= labelY;
      const insideLabelX = x >= labelX - 1 && x <= labelX + L;
      if (labelOverlapY && insideLabelX) {
        return false;
      }
    }
  }

  return true;
}

function isRowFree(
  y: number,
  minX: number,
  maxX: number,
  gridNodes: Map<string, GridNode>,
  gridGroups: Map<string, GridGroup>,
  srcId: string,
  tgtId: string,
): boolean {
  if (y < 0) return false;

  for (const node of gridNodes.values()) {
    if (node.id === srcId || node.id === tgtId) {
      continue;
    }
    const overlapX = minX < node.x + node.width && maxX > node.x;
    // Stay at least 1 cell away from node borders
    const insideY = y >= node.y - 1 && y <= node.y + node.height;
    if (overlapX && insideY) {
      return false;
    }
  }

  for (const group of gridGroups.values()) {
    const overlapX = minX < group.x + group.width && maxX > group.x;
    const onBorderY = y === group.y || y === group.y + group.height - 1;
    if (overlapX && onBorderY) {
      return false;
    }

    if (group.label) {
      const gX0 = group.x;
      const gY0 = group.y;
      const gX1 = group.x + group.width - 1;
      const gY1 = group.y + group.height - 1;
      const labelY = clamp(gY0 + 1, gY0, gY1);
      const L = textWidth(group.label);
      const labelX = clamp(
        gX0 + 2,
        gX0 + 1,
        Math.max(gX0 + 1, gX1 - L - 1),
      );

      if (y === labelY) {
        const labelOverlapX = minX <= labelX + L && maxX >= labelX - 1;
        if (labelOverlapX) {
          return false;
        }
      }
    }
  }

  return true;
}

function findFreeConnectorRow(
  preferredY: number,
  minX: number,
  maxX: number,
  gridNodes: Map<string, GridNode>,
  gridGroups: Map<string, GridGroup>,
  srcId: string,
  tgtId: string,
  direction: number,
): number {
  if (isRowFree(preferredY, minX, maxX, gridNodes, gridGroups, srcId, tgtId)) {
    return preferredY;
  }

  const primaryStep = direction >= 0 ? 1 : -1;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const primary = preferredY + primaryStep * attempt;
    if (isRowFree(primary, minX, maxX, gridNodes, gridGroups, srcId, tgtId)) {
      return primary;
    }

    const fallback = preferredY - primaryStep * attempt;
    if (isRowFree(fallback, minX, maxX, gridNodes, gridGroups, srcId, tgtId)) {
      return fallback;
    }
  }

  return preferredY;
}

function findFreeConnectorColumn(
  preferredX: number,
  minY: number,
  maxY: number,
  gridNodes: Map<string, GridNode>,
  gridGroups: Map<string, GridGroup>,
  srcId: string,
  tgtId: string,
  direction: number,
): number {
  if (isColumnFree(preferredX, minY, maxY, gridNodes, gridGroups, srcId, tgtId)) {
    return preferredX;
  }

  const primaryStep = direction >= 0 ? 1 : -1;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const primary = preferredX + primaryStep * attempt;
    if (isColumnFree(primary, minY, maxY, gridNodes, gridGroups, srcId, tgtId)) {
      return primary;
    }

    const fallback = preferredX - primaryStep * attempt;
    if (isColumnFree(fallback, minY, maxY, gridNodes, gridGroups, srcId, tgtId)) {
      return fallback;
    }
  }

  return preferredX;
}

function resolveNodeCrossings(
  points: GridPoint[],
  gridNodes: Map<string, GridNode>,
  gridGroups: Map<string, GridGroup>,
  srcNodeId: string,
  tgtNodeId: string,
  layouted: LayoutedDiagram,
): GridPoint[] {
  if (points.length < 2) {
    return points;
  }

  const result: GridPoint[] = [];
  result.push({ ...points[0]! });

  const origSrc = layouted.nodes.find(n => n.id === srcNodeId)!;
  const origTgt = layouted.nodes.find(n => n.id === tgtNodeId)!;
  const elkEdge = layouted.edges.find(e => e.from === srcNodeId && e.to === tgtNodeId);

  // If there are no ELK edge points for some reason, just return the grid points as is
  if (!elkEdge || elkEdge.points.length < 2) {
    return points;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;

    if (p1.x === p2.x) {
      // Vertical segment
      let shiftedX = p1.x;
      let crossed = false;
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);

      // Check if it's already free
      if (!isColumnFree(shiftedX, minY, maxY, gridNodes, gridGroups, srcNodeId, tgtNodeId)) {
        crossed = true;
        // Find which side it was on in ELK space
        let isRight = true;
        const elkX = (elkEdge.points[0].x + elkEdge.points[elkEdge.points.length - 1].x) / 2;
        
        // Find the node it crossed to decide direction
        for (const node of gridNodes.values()) {
          if (node.id === srcNodeId || node.id === tgtNodeId) {
            continue;
          }
          const insideX = shiftedX >= node.x && shiftedX < node.x + node.width;
          const overlapY = minY < node.y + node.height && maxY > node.y;
          if (insideX && overlapY) {
            const origNode = layouted.nodes.find(n => n.id === node.id)!;
            const origNodeCenter = origNode.x + origNode.measuredWidth / 2;
            isRight = elkX >= origNodeCenter;
            break;
          }
        }

        // Search for a free column
        let found = false;
        const step = isRight ? 1 : -1;
        let candidateX = shiftedX + step;
        
        // Try up to 20 columns outwards
        for (let attempt = 0; attempt < 20; attempt++) {
          if (isColumnFree(candidateX, minY, maxY, gridNodes, gridGroups, srcNodeId, tgtNodeId)) {
            shiftedX = candidateX;
            found = true;
            break;
          }
          candidateX += step;
        }

        if (!found) {
          // If we couldn't find a free column in preferred direction, try the other direction
          candidateX = shiftedX - step;
          for (let attempt = 0; attempt < 20; attempt++) {
            if (isColumnFree(candidateX, minY, maxY, gridNodes, gridGroups, srcNodeId, tgtNodeId)) {
              shiftedX = candidateX;
              found = true;
              break;
            }
            candidateX -= step;
          }
        }
      }

      if (crossed && shiftedX !== p1.x) {
        let last = result[result.length - 1]!;
        const connectorY = findFreeConnectorRow(
          last.y,
          Math.min(last.x, shiftedX),
          Math.max(last.x, shiftedX),
          gridNodes,
          gridGroups,
          srcNodeId,
          tgtNodeId,
          p2.y - p1.y,
        );
        if (connectorY !== last.y && last.x === p1.x && last.y === p1.y && result.length > 1) {
          result.pop();
          last = result[result.length - 1]!;
        }
        if (last.y !== connectorY) {
          result.push({ x: last.x, y: connectorY });
        }
        if (last.x !== shiftedX) {
          result.push({ x: shiftedX, y: connectorY });
        }
        result.push({ x: shiftedX, y: p2.y });
      } else {
        result.push({ ...p2 });
      }
    } else if (p1.y === p2.y) {
      // Horizontal segment
      let shiftedY = p1.y;
      let crossed = false;
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);

      if (!isRowFree(shiftedY, minX, maxX, gridNodes, gridGroups, srcNodeId, tgtNodeId)) {
        crossed = true;
        let isDown = true;
        const elkY = (elkEdge.points[0].y + elkEdge.points[elkEdge.points.length - 1].y) / 2;

        for (const node of gridNodes.values()) {
          if (node.id === srcNodeId || node.id === tgtNodeId) {
            continue;
          }
          const insideY = shiftedY >= node.y && shiftedY < node.y + node.height;
          const overlapX = minX < node.x + node.width && maxX > node.x;
          if (insideY && overlapX) {
            const origNode = layouted.nodes.find(n => n.id === node.id)!;
            const origNodeCenterY = origNode.y + origNode.measuredHeight / 2;
            isDown = elkY >= origNodeCenterY;
            break;
          }
        }

        let found = false;
        const step = isDown ? 1 : -1;
        let candidateY = shiftedY + step;

        for (let attempt = 0; attempt < 10; attempt++) {
          if (isRowFree(candidateY, minX, maxX, gridNodes, gridGroups, srcNodeId, tgtNodeId)) {
            shiftedY = candidateY;
            found = true;
            break;
          }
          candidateY += step;
        }

        if (!found) {
          candidateY = shiftedY - step;
          for (let attempt = 0; attempt < 10; attempt++) {
            if (isRowFree(candidateY, minX, maxX, gridNodes, gridGroups, srcNodeId, tgtNodeId)) {
              shiftedY = candidateY;
              found = true;
              break;
            }
            candidateY -= step;
          }
        }
      }

      if (crossed && shiftedY !== p1.y) {
        let last = result[result.length - 1]!;
        const connectorX = findFreeConnectorColumn(
          last.x,
          Math.min(last.y, shiftedY),
          Math.max(last.y, shiftedY),
          gridNodes,
          gridGroups,
          srcNodeId,
          tgtNodeId,
          p2.x - p1.x,
        );
        if (connectorX !== last.x && last.x === p1.x && last.y === p1.y && result.length > 1) {
          result.pop();
          last = result[result.length - 1]!;
        }
        if (last.x !== connectorX) {
          result.push({ x: connectorX, y: last.y });
        }
        if (last.y !== shiftedY) {
          result.push({ x: connectorX, y: shiftedY });
        }
        result.push({ x: p2.x, y: shiftedY });
      } else {
        result.push({ ...p2 });
      }
    } else {
      result.push({ ...p2 });
    }
  }

  const finalPoints: GridPoint[] = [];
  for (const pt of result) {
    if (finalPoints.length === 0) {
      finalPoints.push(pt);
    } else {
      const last = finalPoints[finalPoints.length - 1]!;
      if (last.x !== pt.x || last.y !== pt.y) {
        finalPoints.push(pt);
      }
    }
  }

  return finalPoints;
}

function trimGrid(grid: string[][]): string {
  return grid
    .map((row) => row.join('').replace(/\s+$/u, ''))
    .join('\n')
    .replace(/\s+$/u, '');
}

function renderLegend(layouted: LayoutedDiagram): string {
  const lines = ['Nodes:'];
  for (const node of layouted.nodes) {
    lines.push(`- ${node.id}: ${node.label}`);
  }

  if ((layouted.groups ?? []).length > 0) {
    lines.push('', 'Groups:');
    for (const group of layouted.groups ?? []) {
      lines.push(`- ${group.id}: ${group.label}`);
    }
  }

  const labeledEdges = layouted.edges.filter((edge) => edge.label);
  if (labeledEdges.length > 0) {
    lines.push('', 'Edges:');
    for (const edge of labeledEdges) {
      lines.push(`- ${edge.from} -> ${edge.to}: ${edge.label}`);
    }
  }

  return lines.join('\n');
}

// ── Grid node/group types ──

interface GridNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GridGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  contains: string[];
}

function nodePortGlyph(
  point: GridPoint,
  node: GridNode,
  glyphs: GlyphSet,
): string | null {
  const top = node.y;
  const bottom = node.y + node.height - 1;
  const left = node.x;
  const right = node.x + node.width - 1;

  if (point.y === bottom && point.x > left && point.x < right) {
    return glyphs.portDown;
  }
  if (point.y === top && point.x > left && point.x < right) {
    return glyphs.portUp;
  }
  if (point.x === right && point.y > top && point.y < bottom) {
    return glyphs.portRight;
  }
  if (point.x === left && point.y > top && point.y < bottom) {
    return glyphs.portLeft;
  }

  return null;
}

// ── Coordinate system ──
// All layout coordinates from ELK are in continuous pixel space.
// We normalize to a unit grid by dividing by average cell dimensions,
// then place elements using direct grid coordinates from the
// relative positions of ELK nodes. Edges are routed directly
// between the final grid positions of their source/target nodes.

function computeNodeCenter(node: GridNode): GridPoint {
  return {
    x: node.x + Math.floor(node.width / 2),
    y: node.y + Math.floor(node.height / 2),
  };
}

/** Compute the exit point from a node for an edge going to target. */
function computeExitPoint(node: GridNode, target: GridNode): GridPoint {
  const nc = computeNodeCenter(node);
  const tc = computeNodeCenter(target);
  const dx = Math.abs(tc.x - nc.x);
  const dy = Math.abs(tc.y - nc.y);

  if (dy >= dx) {
    // Primarily vertical
    if (tc.y > nc.y) {
      // Exit from bottom
      return { x: nc.x, y: node.y + node.height };
    } else {
      // Exit from top
      return { x: nc.x, y: node.y - 1 };
    }
  } else {
    // Primarily horizontal
    if (tc.x > nc.x) {
      // Exit from right
      return { x: node.x + node.width, y: nc.y };
    } else {
      // Exit from left
      return { x: node.x - 1, y: nc.y };
    }
  }
}

/** Compute the entry point into a node for an edge coming from source. */
function computeEntryPoint(node: GridNode, source: GridNode): GridPoint {
  const nc = computeNodeCenter(node);
  const sc = computeNodeCenter(source);
  const dx = Math.abs(sc.x - nc.x);
  const dy = Math.abs(sc.y - nc.y);

  if (dy >= dx) {
    // Primarily vertical
    if (sc.y < nc.y) {
      // Enter from top
      return { x: nc.x, y: node.y };
    } else {
      // Enter from bottom
      return { x: nc.x, y: node.y + node.height - 1 };
    }
  } else {
    // Primarily horizontal
    if (sc.x < nc.x) {
      // Enter from left
      return { x: node.x, y: nc.y };
    } else {
      // Enter from right
      return { x: node.x + node.width - 1, y: nc.y };
    }
  }
}

/** Route an orthogonal path between two points. */
function routeOrthogonal(from: GridPoint, to: GridPoint, preferVerticalFirst: boolean): GridPoint[] {
  if (from.x === to.x || from.y === to.y) {
    // Already aligned - single segment
    return [from, to];
  }

  if (preferVerticalFirst) {
    // Go vertical first, then horizontal
    const mid: GridPoint = { x: from.x, y: to.y };
    return [from, mid, to];
  } else {
    // Go horizontal first, then vertical
    const mid: GridPoint = { x: to.x, y: from.y };
    return [from, mid, to];
  }
}

// ── Main export ──

export function renderToText(
  layouted: LayoutedDiagram,
  options: RenderToTextOptions = {},
): string {
  const charset = options.charset ?? 'unicode';
  const glyphs = GLYPHS[charset];

  // Find bounds of all elements in ELK pixel space
  let minX = Infinity, minY = Infinity;
  for (const node of layouted.nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
  }
  for (const group of layouted.groups ?? []) {
    minX = Math.min(minX, group.x);
    minY = Math.min(minY, group.y);
  }
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; }

  // Find the smallest ELK cell dimensions to use as our scale factor.
  // We want to preserve relative positions, so we use a consistent scale.
  const SCALE_X = 16; // pixels per grid column
  const SCALE_Y = 18; // pixels per grid row

  // Scale a pixel coordinate to grid space
  const toGridX = (px: number) => Math.round((px - minX) / SCALE_X) + GRID_PADDING;
  const toGridY = (px: number) => Math.round((px - minY) / SCALE_Y) + GRID_PADDING;

  // 1. Create grid nodes at their scaled positions
  const gridNodes: Map<string, GridNode> = new Map();
  for (const node of layouted.nodes) {
    const boxWidth = Math.max(
      textWidth(node.label) + 4,
      MIN_BOX_WIDTH,
    );
    gridNodes.set(node.id, {
      id: node.id,
      label: node.label,
      x: toGridX(node.x),
      y: toGridY(node.y),
      width: boxWidth,
      height: BOX_HEIGHT,
    });
  }

  // 2. Create grid groups
  const gridGroups: Map<string, GridGroup> = new Map();
  for (const group of layouted.groups ?? []) {
    gridGroups.set(group.id, {
      id: group.id,
      label: group.label,
      x: toGridX(group.x),
      y: toGridY(group.y),
      width: Math.max(Math.round(group.width / SCALE_X), textWidth(group.label) + 5, MIN_BOX_WIDTH),
      height: Math.max(Math.round(group.height / SCALE_Y), 6),
      contains: group.contains ?? [],
    });
  }

  // 3. Overlap resolution and containment constraints (multiple iterations)
  const nodes = Array.from(gridNodes.values());

  for (let iteration = 0; iteration < 6; iteration++) {
    // Phase A: Resolve node-node overlaps
    for (let pass = 0; pass < 10; pass++) {
      let resolvedAny = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;

          const overlapX = a.x < b.x + b.width + NODE_SPACING_X && b.x < a.x + a.width + NODE_SPACING_X;
          const overlapY = a.y < b.y + b.height && b.y < a.y + a.height;

          if (overlapX && overlapY) {
            const origA = layouted.nodes.find(n => n.id === a.id)!;
            const origB = layouted.nodes.find(n => n.id === b.id)!;
            const dx = Math.abs(origA.x - origB.x);
            const dy = Math.abs(origA.y - origB.y);

            if (dx >= dy) {
              // Separate horizontally
              if (origA.x <= origB.x) {
                b.x = a.x + a.width + NODE_SPACING_X;
              } else {
                a.x = b.x + b.width + NODE_SPACING_X;
              }
            } else {
              // Separate vertically
              if (origA.y <= origB.y) {
                b.y = a.y + a.height + NODE_SPACING_Y;
              } else {
                a.y = b.y + b.height + NODE_SPACING_Y;
              }
            }
            resolvedAny = true;
          }
        }
      }
      if (!resolvedAny) break;
    }

    // Phase C: Resolve group-group overlaps/adjacency to ensure at least 1 blank row in between
    if (gridGroups.size > 1) {
      const groupsList = Array.from(gridGroups.values());
      for (let pass = 0; pass < 10; pass++) {
        let resolvedAny = false;
        for (let i = 0; i < groupsList.length; i++) {
          for (let j = i + 1; j < groupsList.length; j++) {
            const a = groupsList[i]!;
            const b = groupsList[j]!;

            const overlapX = a.x < b.x + b.width && b.x < a.x + a.width;
            const overlapY = a.y < b.y + b.height + 1 && b.y < a.y + a.height + 1;

            if (overlapX && overlapY) {
              const origA = layouted.groups?.find(g => g.id === a.id);
              const origB = layouted.groups?.find(g => g.id === b.id);
              const ay = origA ? origA.y : a.y;
              const by = origB ? origB.y : b.y;

              if (ay <= by) {
                const dy = (a.y + a.height + 1) - b.y;
                b.y += dy;
                for (const nodeId of b.contains) {
                  const n = gridNodes.get(nodeId);
                  if (n) {
                    n.y += dy;
                  }
                }
              } else {
                const dy = (b.y + b.height + 1) - a.y;
                a.y += dy;
                for (const nodeId of a.contains) {
                  const n = gridNodes.get(nodeId);
                  if (n) {
                    n.y += dy;
                  }
                }
              }
              resolvedAny = true;
            }
          }
        }
        if (!resolvedAny) break;
      }
    }

    // Phase B: Containment constraints - ensure nodes are inside their groups
    for (const group of gridGroups.values()) {
      let gX0 = group.x;
      let gY0 = group.y;
      let gX1 = gX0 + group.width - 1;
      let gY1 = gY0 + group.height - 1;

      for (const nodeId of group.contains) {
        const node = gridNodes.get(nodeId);
        if (!node) continue;

        // Ensure node is inside the group with padding
        const leftPad = group.label ? 3 : 2;
        const topPad = group.label ? 3 : 2;
        const rightPad = 2;
        const bottomPad = 2;

        if (node.x < gX0 + leftPad) {
          node.x = gX0 + leftPad;
        }
        if (node.y < gY0 + topPad) {
          node.y = gY0 + topPad;
        }
        if (node.x + node.width + rightPad > gX1) {
          group.width = Math.max(group.width, node.x + node.width + rightPad - gX0);
          gX1 = gX0 + group.width - 1;
        }
        if (node.y + node.height + bottomPad > gY1) {
          group.height = Math.max(group.height, node.y + node.height + bottomPad - gY0);
          gY1 = gY0 + group.height - 1;
        }
      }
    }
  }

  // 4. Compute edge routes using final grid positions
  interface EdgeRoute {
    from: string;
    to: string;
    label?: string;
    points: GridPoint[];
    labelPoint: GridPoint;
    labelIsHorizontal: boolean;
    startMarker?: 'none' | 'arrow' | 'circle' | 'filledCircle';
    endMarker?: 'none' | 'arrow' | 'circle' | 'filledCircle';
  }

  const edgeRoutes: EdgeRoute[] = [];

  // Determine which edges connect to each port direction for each node
  // to assign distinct x-columns for multiple vertical edges from the same node
  const nodeEdgeInfo = new Map<string, { outEdges: string[]; inEdges: string[] }>();
  for (const node of layouted.nodes) {
    nodeEdgeInfo.set(node.id, { outEdges: [], inEdges: [] });
  }
  for (const edge of layouted.edges) {
    nodeEdgeInfo.get(edge.from)?.outEdges.push(edge.to);
    nodeEdgeInfo.get(edge.to)?.inEdges.push(edge.from);
  }

  // Track placed label positions for label-label collision detection
  const placedLabels: Array<{ x: number; y: number; length: number }> = [];

  for (const edge of layouted.edges) {
    const srcNode = gridNodes.get(edge.from);
    const tgtNode = gridNodes.get(edge.to);
    if (!srcNode || !tgtNode) continue;

    const srcCenter = computeNodeCenter(srcNode);
    const tgtCenter = computeNodeCenter(tgtNode);
    const dx = Math.abs(tgtCenter.x - srcCenter.x);
    const dy = Math.abs(tgtCenter.y - srcCenter.y);
    const isVertical = dy >= dx;

    // Determine port positions based on edge topology from ELK
    const elkEdge = layouted.edges.find(e => e.from === edge.from && e.to === edge.to)!;
    const startPt = elkEdge.points[0];
    const endPt = elkEdge.points[elkEdge.points.length - 1];
    const origSrc = layouted.nodes.find(n => n.id === edge.from)!;
    const origTgt = layouted.nodes.find(n => n.id === edge.to)!;

    // Map the ELK port position proportionally onto the grid node
    let exitPoint: GridPoint;
    let entryPoint: GridPoint;

    if (isVertical && tgtCenter.y > srcCenter.y) {
      // Going down
      const srcPortFraction = (startPt.x - origSrc.x) / origSrc.measuredWidth;
      const tgtPortFraction = (endPt.x - origTgt.x) / origTgt.measuredWidth;
      exitPoint = {
        x: srcNode.x + Math.round(srcPortFraction * srcNode.width),
        y: srcNode.y + srcNode.height,
      };
      entryPoint = {
        x: tgtNode.x + Math.round(tgtPortFraction * tgtNode.width),
        y: tgtNode.y,
      };
    } else if (isVertical && tgtCenter.y <= srcCenter.y) {
      // Going up
      const srcPortFraction = (startPt.x - origSrc.x) / origSrc.measuredWidth;
      const tgtPortFraction = (endPt.x - origTgt.x) / origTgt.measuredWidth;
      exitPoint = {
        x: srcNode.x + Math.round(srcPortFraction * srcNode.width),
        y: srcNode.y - 1,
      };
      entryPoint = {
        x: tgtNode.x + Math.round(tgtPortFraction * tgtNode.width),
        y: tgtNode.y + tgtNode.height - 1,
      };
    } else if (tgtCenter.x > srcCenter.x) {
      // Going right
      const srcPortFraction = (startPt.y - origSrc.y) / origSrc.measuredHeight;
      const tgtPortFraction = (endPt.y - origTgt.y) / origTgt.measuredHeight;
      exitPoint = {
        x: srcNode.x + srcNode.width,
        y: srcNode.y + Math.round(srcPortFraction * srcNode.height),
      };
      entryPoint = {
        x: tgtNode.x,
        y: tgtNode.y + Math.round(tgtPortFraction * tgtNode.height),
      };
    } else {
      // Going left
      const srcPortFraction = (startPt.y - origSrc.y) / origSrc.measuredHeight;
      const tgtPortFraction = (endPt.y - origTgt.y) / origTgt.measuredHeight;
      exitPoint = {
        x: srcNode.x - 1,
        y: srcNode.y + Math.round(srcPortFraction * srcNode.height),
      };
      entryPoint = {
        x: tgtNode.x + tgtNode.width - 1,
        y: tgtNode.y + Math.round(tgtPortFraction * tgtNode.height),
      };
    }

    // If the edge was perfectly vertical or horizontal in ELK space,
    // try to preserve its straightness in grid space.
    const isElkStraightVertical = elkEdge.points.every(p => p.x === startPt.x);
    const isElkStraightHorizontal = elkEdge.points.every(p => p.y === startPt.y);

    if (isElkStraightVertical) {
      const minOverlapX = Math.max(srcNode.x + 1, tgtNode.x + 1);
      const maxOverlapX = Math.min(srcNode.x + srcNode.width - 2, tgtNode.x + tgtNode.width - 2);
      if (minOverlapX <= maxOverlapX) {
        const x = clamp(Math.round((exitPoint.x + entryPoint.x) / 2), minOverlapX, maxOverlapX);
        exitPoint.x = x;
        entryPoint.x = x;
      }
    } else if (isElkStraightHorizontal) {
      const minOverlapY = Math.max(srcNode.y + 1, tgtNode.y + 1);
      const maxOverlapY = Math.min(srcNode.y + srcNode.height - 2, tgtNode.y + tgtNode.height - 2);
      if (minOverlapY <= maxOverlapY) {
        const y = clamp(Math.round((exitPoint.y + entryPoint.y) / 2), minOverlapY, maxOverlapY);
        exitPoint.y = y;
        entryPoint.y = y;
      }
    }

    // Route the edge
    let points: GridPoint[];

    if (elkEdge.points.length === 2) {
      // Simple direct edge - just connect exit to entry
      points = routeOrthogonal(exitPoint, entryPoint, isVertical);
    } else {
      // Multi-segment edge: use the ELK routing topology but in grid coords
      // Scale the intermediate points, keeping exit/entry anchored to nodes
      points = [exitPoint];

      for (let i = 1; i < elkEdge.points.length - 1; i++) {
        const pt = elkEdge.points[i];
        points.push({ x: toGridX(pt.x), y: toGridY(pt.y) });
      }

      points.push(entryPoint);

      // Enforce orthogonality on consecutive point pairs
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]!;
        const p2 = points[i + 1]!;
        if (p1.x !== p2.x && p1.y !== p2.y) {
          // Need to make it orthogonal - check original orientation
          const origP1 = elkEdge.points[i];
          const origP2 = elkEdge.points[i + 1];
          if (origP1 && origP2) {
            const oDx = Math.abs(origP2.x - origP1.x);
            const oDy = Math.abs(origP2.y - origP1.y);
            if (oDy > oDx) {
              // Was vertical - align x
              p2.x = p1.x;
            } else {
              // Was horizontal - align y
              p2.y = p1.y;
            }
          }
        }
      }
    }

    points = resolveNodeCrossings(points, gridNodes, gridGroups, edge.from, edge.to, layouted);

    if (points.length >= 1) {
      const p0 = points[0]!;
      let borderPoint: GridPoint;
      if (isVertical && tgtCenter.y > srcCenter.y) {
        borderPoint = { x: p0.x, y: p0.y - 1 };
      } else if (isVertical && tgtCenter.y <= srcCenter.y) {
        borderPoint = { x: p0.x, y: p0.y + 1 };
      } else if (tgtCenter.x > srcCenter.x) {
        borderPoint = { x: p0.x - 1, y: p0.y };
      } else {
        borderPoint = { x: p0.x + 1, y: p0.y };
      }
      points = [borderPoint, ...points];
    }

    // Find the best segment for the label and place it avoiding collisions
    let labelPoint: GridPoint = { x: points[0].x, y: points[0].y };
    let labelIsHorizontal = true;

    if (edge.label && points.length >= 2) {
      const L = edge.label.length;
      let longestLength = -1;
      let bestIdx = 0;
      let bestIsH = true;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]!;
        const p2 = points[i + 1]!;
        const lenX = Math.abs(p2.x - p1.x);
        const lenY = Math.abs(p2.y - p1.y);
        if (lenX > longestLength && lenX >= lenY) {
          longestLength = lenX;
          bestIdx = i;
          bestIsH = true;
        }
        if (lenY > longestLength && lenY > lenX) {
          longestLength = lenY;
          bestIdx = i;
          bestIsH = false;
        }
      }

      const p1 = points[bestIdx]!;
      const p2 = points[bestIdx + 1]!;
      labelIsHorizontal = bestIsH;

      if (bestIsH) {
        const midX = Math.round((p1.x + p2.x) / 2);
        labelPoint = { x: midX - Math.floor(L / 2), y: p1.y };
      } else {
        const midY = Math.round((p1.y + p2.y) / 2);
        labelPoint = { x: p1.x + 1, y: midY };
      }

      // Clamp label x to be non-negative
      if (labelPoint.x < 0) {
        labelPoint.x = 0;
      }

      // Check if label collides with any node or previously-placed label
      const labelCollides = (lp: GridPoint): boolean => {
        if (lp.x < 0) return true;
        const lx0 = lp.x;
        const lx1 = lp.x + L - 1;
        const ly = lp.y;

        // Check against nodes
        for (const n of gridNodes.values()) {
          if (ly >= n.y && ly < n.y + n.height) {
            if (lx1 >= n.x && lx0 < n.x + n.width) {
              return true;
            }
          }
        }

        // Check against previously placed labels
        for (const prev of placedLabels) {
          if (ly === prev.y) {
            if (lx1 >= prev.x && lx0 < prev.x + prev.length) {
              return true;
            }
          }
        }

        return false;
      };

      if (labelCollides(labelPoint)) {
        let placed = false;

        if (bestIsH) {
          const minSX = Math.min(p1.x, p2.x);
          const maxSX = Math.max(p1.x, p2.x);
          for (const candidate of [
            { x: maxSX + 1, y: p1.y },
            { x: minSX - L - 1, y: p1.y },
            { x: labelPoint.x, y: labelPoint.y - 1 },
            { x: labelPoint.x, y: labelPoint.y + 1 },
            { x: maxSX + 1, y: p1.y - 1 },
            { x: maxSX + 1, y: p1.y + 1 },
          ]) {
            if (candidate.x >= 0 && !labelCollides(candidate)) {
              labelPoint = candidate;
              placed = true;
              break;
            }
          }
        } else {
          const minSY = Math.min(p1.y, p2.y);
          const maxSY = Math.max(p1.y, p2.y);
          const midY = Math.round((p1.y + p2.y) / 2);
          const candidatesY: number[] = [];
          for (let y = minSY; y <= maxSY; y++) {
            candidatesY.push(y);
          }
          candidatesY.sort((a, b) => Math.abs(a - midY) - Math.abs(b - midY));

          for (const tryY of candidatesY) {
            for (const xOff of [1, 2, -L, -L - 1]) {
              const candidate = { x: Math.max(0, p1.x + xOff), y: tryY };
              if (!labelCollides(candidate)) {
                labelPoint = candidate;
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
        }
      }

      // Track this label for future collision checks
      placedLabels.push({ x: labelPoint.x, y: labelPoint.y, length: L });
    }

    edgeRoutes.push({
      from: edge.from,
      to: edge.to,
      label: edge.label,
      points,
      labelPoint,
      labelIsHorizontal,
      startMarker: edge.startMarker,
      endMarker: edge.endMarker,
    });
  }

  // 5. Compute grid dimensions
  let maxGridX = 0;
  let maxGridY = 0;

  const updateMax = (x: number, y: number) => {
    if (x > maxGridX) maxGridX = x;
    if (y > maxGridY) maxGridY = y;
  };

  for (const group of gridGroups.values()) {
    updateMax(group.x + group.width, group.y + group.height);
  }

  for (const node of gridNodes.values()) {
    updateMax(node.x + node.width, node.y + node.height);
  }

  for (const route of edgeRoutes) {
    for (const pt of route.points) {
      updateMax(pt.x + 1, pt.y + 1);
    }
    if (route.label) {
      updateMax(route.labelPoint.x + route.label.length + 1, route.labelPoint.y + 1);
    }
  }

  const gridWidth = Math.max(maxGridX + GRID_PADDING * 2, 32);
  const gridHeight = Math.max(maxGridY + GRID_PADDING * 2, 8);
  const grid = createGrid(gridWidth, gridHeight);

  // 6. Layered rendering
  const setCharForce = (point: GridPoint, char: string): void => {
    const row = grid[point.y];
    if (row && point.x >= 0 && point.x < row.length) {
      row[point.x] = char;
    }
  };

  // Step A: Draw group boundaries
  for (const group of gridGroups.values()) {
    drawBox(grid, { x: group.x, y: group.y }, group.width, group.height, '', glyphs, false);
  }

  // Step B: Draw nodes (borders + fill + labels)
  for (const node of gridNodes.values()) {
    drawBox(grid, { x: node.x, y: node.y }, node.width, node.height, node.label, glyphs, true);
  }

  // Step C: Draw edge lines
  for (const route of edgeRoutes) {
    if (route.points.length < 2) continue;

    for (let i = 0; i < route.points.length - 1; i++) {
      drawSegment(grid, route.points[i]!, route.points[i + 1]!, glyphs);
    }
  }

  // Draw corners/elbows for all edge lines
  for (const route of edgeRoutes) {
    if (route.points.length < 3) continue;

    for (let i = 1; i < route.points.length - 1; i++) {
      const corner = getCornerGlyph(
        route.points[i - 1]!,
        route.points[i]!,
        route.points[i + 1]!,
        glyphs,
      );
      if (corner) {
        setChar(grid, route.points[i]!, corner, glyphs);
      }
    }
  }

  for (const route of edgeRoutes) {
    const srcNode = gridNodes.get(route.from);
    const tgtNode = gridNodes.get(route.to);
    const startPoint = route.points[0];
    const endPoint = route.points[route.points.length - 1];

    if (srcNode && startPoint && (route.startMarker ?? 'none') === 'none') {
      const glyph = nodePortGlyph(startPoint, srcNode, glyphs);
      if (glyph) {
        setCharForce(startPoint, glyph);
      }
    }

    if (tgtNode && endPoint && (route.endMarker ?? 'arrow') === 'none') {
      const glyph = nodePortGlyph(endPoint, tgtNode, glyphs);
      if (glyph) {
        setCharForce(endPoint, glyph);
      }
    }
  }

  // Draw edge start and end markers
  for (const route of edgeRoutes) {
    if (route.points.length < 2) continue;

    const startMarker = route.startMarker ?? 'none';
    const endMarker = route.endMarker ?? 'arrow';

    // Start marker
    if (startMarker !== 'none') {
      const firstPoint = route.points[0]!;
      let dirTarget = route.points[1]!;
      for (let i = 1; i < route.points.length; i++) {
        const pt = route.points[i]!;
        if (pt.x !== firstPoint.x || pt.y !== firstPoint.y) {
          dirTarget = pt;
          break;
        }
      }

      let char = '';
      if (startMarker === 'arrow') {
        char = getArrowGlyph(dirTarget, firstPoint, glyphs);
      } else if (startMarker === 'circle') {
        char = glyphs.circle;
      } else if (startMarker === 'filledCircle') {
        char = glyphs.filledCircle;
      }

      if (char) {
        setCharForce(firstPoint, char);
      }
    }

    // End marker
    if (endMarker !== 'none') {
      const lastPoint = route.points[route.points.length - 1]!;
      let dirSource = route.points[route.points.length - 2]!;
      for (let i = route.points.length - 2; i >= 0; i--) {
        const pt = route.points[i]!;
        if (pt.x !== lastPoint.x || pt.y !== lastPoint.y) {
          dirSource = pt;
          break;
        }
      }

      let char = '';
      if (endMarker === 'arrow') {
        char = getArrowGlyph(dirSource, lastPoint, glyphs);
      } else if (endMarker === 'circle') {
        char = glyphs.circle;
      } else if (endMarker === 'filledCircle') {
        char = glyphs.filledCircle;
      }

      if (char) {
        setCharForce(lastPoint, char);
      }
    }
  }

  // Step D: Draw group labels
  for (const group of gridGroups.values()) {
    if (!group.label) continue;
    const gX0 = group.x;
    const gY0 = group.y;
    const gX1 = group.x + group.width - 1;
    const gY1 = group.y + group.height - 1;
    const labelY = clamp(gY0 + 1, gY0, gY1);
    const labelX = clamp(
      gX0 + 2,
      gX0 + 1,
      Math.max(gX0 + 1, gX1 - textWidth(group.label) - 1),
    );
    writeText(grid, labelX, labelY, group.label.slice(0, Math.max(0, gX1 - gX0 - 1)));
  }

  // Step E: Draw edge labels
  for (const route of edgeRoutes) {
    if (route.label) {
      writeText(grid, route.labelPoint.x, route.labelPoint.y, route.label);
    }
  }

  return `${trimGrid(grid)}\n\n${renderLegend(layouted)}\n`;
}
