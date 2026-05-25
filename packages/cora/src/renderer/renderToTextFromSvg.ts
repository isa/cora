/**
 * SVG-engine text renderer.
 *
 * Unlike renderToText.ts (which re-invents its own layout from the IR),
 * this module faithfully maps the LayoutedDiagram's pixel coordinates
 * (the same ones used by the SVG renderer) to a character grid.
 *
 * This means:
 *   - Edge routing matches the SVG exactly (uses ELK's points[])
 *   - Node positions match the SVG exactly
 *   - Edge label positions match the SVG exactly
 *   - No second layout engine, no overlap re-resolution
 *
 * Activated via `--ascii-engine svg`.
 */

import type { LayoutedDiagram, LayoutedNode, LayoutedEdge, LayoutedGroup } from '../layout-ir.js';

export type TextCharset = 'unicode' | 'ascii';

export interface SvgTextOptions {
  charset?: TextCharset;
  /** Maximum width in characters. Default 120. */
  maxWidth?: number;
}

// ── Glyph sets ──

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
  // dashed borders for groups
  dashH: string;
  dashV: string;
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
    rightArrow: '→',
    downArrow: '↓',
    leftArrow: '←',
    upArrow: '↑',
    circle: 'O',
    filledCircle: '●',
    dashH: '╌',
    dashV: '╎',
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
    dashH: '-',
    dashV: ':',
  },
};

// ── Grid helpers ──

function createGrid(w: number, h: number): string[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ' '));
}

function inBounds(grid: string[][], x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0);
}

function setChar(grid: string[][], x: number, y: number, ch: string, g: GlyphSet): void {
  if (!inBounds(grid, x, y)) return;
  const existing = grid[y]![x]!;
  // Never overwrite crosses
  if (existing === g.cross) return;
  // Cross detection
  if ((existing === g.horizontal && ch === g.vertical) ||
      (existing === g.vertical && ch === g.horizontal)) {
    grid[y]![x] = g.cross;
    return;
  }
  // Don't overwrite corners with plain lines
  const isCorner = existing === g.topLeft || existing === g.topRight ||
    existing === g.bottomLeft || existing === g.bottomRight;
  if (isCorner && (ch === g.horizontal || ch === g.vertical)) return;
  grid[y]![x] = ch;
}

function setForce(grid: string[][], x: number, y: number, ch: string): void {
  if (!inBounds(grid, x, y)) return;
  grid[y]![x] = ch;
}

function writeText(grid: string[][], x: number, y: number, text: string): void {
  if (!inBounds(grid, x, y)) return;
  const row = grid[y]!;
  for (let i = 0; i < text.length; i++) {
    const col = x + i;
    if (col >= 0 && col < row.length) row[col] = text[i]!;
  }
}

function clearRect(grid: string[][], x: number, y: number, w: number, h: number): void {
  for (let dy = 0; dy < h; dy++) {
    const ry = y + dy;
    if (ry < 0 || ry >= grid.length) continue;
    const row = grid[ry]!;
    for (let dx = 0; dx < w; dx++) {
      const cx = x + dx;
      if (cx >= 0 && cx < row.length) row[cx] = ' ';
    }
  }
}

// ── Coordinate mapping ──

interface CoordMapper {
  toCol(px: number): number;
  toRow(px: number): number;
  gridW: number;
  gridH: number;
}

function deduplicateWithTolerance(values: number[], tolerance = 0.1): number[] {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const result: number[] = [];
  for (const val of sorted) {
    if (result.length === 0 || val - result[result.length - 1]! > tolerance) {
      result.push(val);
    }
  }
  return result;
}

function findClosestIndex(values: number[], val: number): number {
  let minDiff = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < values.length; i++) {
    const diff = Math.abs(values[i]! - val);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function createPiecewiseLinearMapper(pixelCoords: number[], gridCoords: number[]) {
  return (px: number): number => {
    if (pixelCoords.length === 0) return px;
    if (px <= pixelCoords[0]!) return gridCoords[0]!;
    if (px >= pixelCoords[pixelCoords.length - 1]!) return gridCoords[gridCoords.length - 1]!;

    let low = 0;
    let high = pixelCoords.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (pixelCoords[mid]! === px) {
        return gridCoords[mid]!;
      } else if (pixelCoords[mid]! < px) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const x0 = pixelCoords[high]!;
    const x1 = pixelCoords[low]!;
    const y0 = gridCoords[high]!;
    const y1 = gridCoords[low]!;
    if (x1 === x0) return y0;
    return y0 + ((y1 - y0) * (px - x0)) / (x1 - x0);
  };
}

interface Constraint {
  idx1: number;
  idx2: number;
  minGap: number;
}

function buildAxisMapper(
  pixelValues: number[],
  uniqueValues: number[],
  initialScale: number,
  pad: number,
  pxMin: number,
  constraints: Constraint[],
): (px: number) => number {
  if (uniqueValues.length === 0) {
    return (px: number) => px;
  }

  // Initialize grid coords using initialScale
  const gridCoords = uniqueValues.map(
    px => Math.round((px - pxMin) * initialScale) + pad,
  );

  // Relax constraints iteratively
  for (let iter = 0; iter < 200; iter++) {
    let changed = false;

    // 1. Monotonicity & separation constraint
    for (let i = 1; i < gridCoords.length; i++) {
      if (gridCoords[i]! < gridCoords[i - 1]! + 1) {
        gridCoords[i] = gridCoords[i - 1]! + 1;
        changed = true;
      }
    }

    // 2. Custom gap constraints
    for (const c of constraints) {
      const currentGap = gridCoords[c.idx2]! - gridCoords[c.idx1]!;
      if (currentGap < c.minGap) {
        gridCoords[c.idx2] = gridCoords[c.idx1]! + c.minGap;
        changed = true;
      }
    }

    if (!changed) break;
  }

  return createPiecewiseLinearMapper(uniqueValues, gridCoords);
}

function buildMapper(diagram: LayoutedDiagram, maxWidth: number): CoordMapper {
  // Find initial bounds from structural elements (nodes, groups, edge points)
  let structuralMinX = Infinity, structuralMinY = Infinity;
  let structuralMaxX = -Infinity, structuralMaxY = -Infinity;

  for (const n of diagram.nodes) {
    structuralMinX = Math.min(structuralMinX, n.x);
    structuralMinY = Math.min(structuralMinY, n.y);
    structuralMaxX = Math.max(structuralMaxX, n.x + n.measuredWidth);
    structuralMaxY = Math.max(structuralMaxY, n.y + n.measuredHeight);
  }
  for (const g of diagram.groups ?? []) {
    structuralMinX = Math.min(structuralMinX, g.x);
    structuralMinY = Math.min(structuralMinY, g.y);
    structuralMaxX = Math.max(structuralMaxX, g.x + g.width);
    structuralMaxY = Math.max(structuralMaxY, g.y + g.height);
  }
  for (const e of diagram.edges) {
    for (const p of e.points) {
      structuralMinX = Math.min(structuralMinX, p.x);
      structuralMinY = Math.min(structuralMinY, p.y);
      structuralMaxX = Math.max(structuralMaxX, p.x);
      structuralMaxY = Math.max(structuralMaxY, p.y);
    }
  }

  if (!Number.isFinite(structuralMinX)) {
    structuralMinX = 0; structuralMinY = 0; structuralMaxX = 100; structuralMaxY = 100;
  }

  const PAD = 2;
  const usableW = maxWidth - PAD * 2;

  // Solve scaleX and scaleY iteratively to accommodate labels
  let scaleX = usableW / Math.max(structuralMaxX - structuralMinX, 1);
  let scaleY = scaleX * 0.5;

  let pxXs: number[] = [];
  let pxYs: number[] = [];
  let pxMinX = structuralMinX, pxMaxX = structuralMaxX;
  let pxMinY = structuralMinY, pxMaxY = structuralMaxY;

  for (let iter = 0; iter < 5; iter++) {
    pxXs = [structuralMinX, structuralMaxX];
    pxYs = [structuralMinY, structuralMaxY];

    for (const n of diagram.nodes) {
      pxXs.push(n.x, n.x + n.measuredWidth);
      pxYs.push(n.y, n.y + n.measuredHeight);
    }
    for (const g of diagram.groups ?? []) {
      pxXs.push(g.x, g.x + g.width);
      pxYs.push(g.y, g.y + g.height);
      if (g.label) {
        pxXs.push(g.x + g.label.length / scaleX);
      }
    }
    for (const e of diagram.edges) {
      for (const p of e.points) {
        pxXs.push(p.x);
        pxYs.push(p.y);
      }
      if (e.label && e.labelX !== undefined && e.labelY !== undefined) {
        pxXs.push(e.labelX, e.labelX + e.label.length / scaleX);
        pxYs.push(e.labelY, e.labelY + 1 / scaleY);
      }
    }

    pxMinX = Math.min(...pxXs);
    pxMaxX = Math.max(...pxXs);
    pxMinY = Math.min(...pxYs);
    pxMaxY = Math.max(...pxYs);

    scaleX = usableW / Math.max(pxMaxX - pxMinX, 1);
    scaleY = scaleX * 0.5;
  }

  // 3. Deduplicate
  const uniqueXs = deduplicateWithTolerance(pxXs, 0.1);
  const uniqueYs = deduplicateWithTolerance(pxYs, 0.1);

  // 4. Build constraints
  const xConstraints: Constraint[] = [];
  const yConstraints: Constraint[] = [];

  // Node width & height constraints
  for (const n of diagram.nodes) {
    const idx1 = findClosestIndex(uniqueXs, n.x);
    const idx2 = findClosestIndex(uniqueXs, n.x + n.measuredWidth);
    const minGapX = n.label.length + 3; // so grid width is at least label.length + 4
    xConstraints.push({ idx1, idx2, minGap: minGapX });

    const idy1 = findClosestIndex(uniqueYs, n.y);
    const idy2 = findClosestIndex(uniqueYs, n.y + n.measuredHeight);
    const minGapY = 2; // so grid height is at least 3
    yConstraints.push({ idx1: idy1, idx2: idy2, minGap: minGapY });
  }

  // Edge label width constraints
  for (const e of diagram.edges) {
    if (e.label && e.labelX !== undefined && e.labelY !== undefined) {
      const idx1 = findClosestIndex(uniqueXs, e.labelX);
      const idx2 = findClosestIndex(uniqueXs, e.labelX + e.label.length / scaleX);
      xConstraints.push({ idx1, idx2, minGap: e.label.length });
    }
  }

  // Group label width constraints
  for (const g of diagram.groups ?? []) {
    if (g.label) {
      const idx1 = findClosestIndex(uniqueXs, g.x);
      const idx2 = findClosestIndex(uniqueXs, g.x + g.label.length / scaleX);
      xConstraints.push({ idx1, idx2, minGap: g.label.length });
    }
  }

  // Node-node separation constraints to prevent overlaps
  for (let i = 0; i < diagram.nodes.length; i++) {
    for (let j = 0; j < diagram.nodes.length; j++) {
      if (i === j) continue;
      const nA = diagram.nodes[i]!;
      const nB = diagram.nodes[j]!;

      // nA is completely to the left of nB
      if (nA.x + nA.measuredWidth <= nB.x) {
        const idxA = findClosestIndex(uniqueXs, nA.x + nA.measuredWidth);
        const idxB = findClosestIndex(uniqueXs, nB.x);
        xConstraints.push({ idx1: idxA, idx2: idxB, minGap: 2 }); // at least 2 grid units separation
      }

      // nA is completely above nB
      if (nA.y + nA.measuredHeight <= nB.y) {
        const idyA = findClosestIndex(uniqueYs, nA.y + nA.measuredHeight);
        const idyB = findClosestIndex(uniqueYs, nB.y);
        yConstraints.push({ idx1: idyA, idx2: idyB, minGap: 2 }); // at least 2 grid units separation
      }
    }
  }

  // 5. Build monotonic piecewise mappers
  const mapX = buildAxisMapper(
    pxXs,
    uniqueXs,
    scaleX,
    PAD,
    pxMinX,
    xConstraints,
  );
  const mapY = buildAxisMapper(
    pxYs,
    uniqueYs,
    scaleY,
    PAD,
    pxMinY,
    yConstraints,
  );

  const toCol = (px: number) => Math.round(mapX(px));
  const toRow = (py: number) => Math.round(mapY(py));

  const gridW = toCol(pxMaxX) + PAD;
  const gridH = toRow(pxMaxY) + PAD;

  return { toCol, toRow, gridW, gridH };
}

// ── Box drawing ──

function drawBox(
  grid: string[][],
  x0: number, y0: number, w: number, h: number,
  label: string,
  g: GlyphSet,
  dashed: boolean,
): void {
  if (w < 2 || h < 2) return;
  const x1 = x0 + w - 1;
  const y1 = y0 + h - 1;

  const hChar = dashed ? g.dashH : g.horizontal;
  const vChar = dashed ? g.dashV : g.vertical;

  // Corners
  setChar(grid, x0, y0, g.topLeft, g);
  setChar(grid, x1, y0, g.topRight, g);
  setChar(grid, x0, y1, g.bottomLeft, g);
  setChar(grid, x1, y1, g.bottomRight, g);

  // Horizontal borders
  for (let x = x0 + 1; x < x1; x++) {
    setChar(grid, x, y0, hChar, g);
    setChar(grid, x, y1, hChar, g);
  }

  // Vertical borders
  for (let y = y0 + 1; y < y1; y++) {
    setChar(grid, x0, y, vChar, g);
    setChar(grid, x1, y, vChar, g);
  }

  // Fill interior (mask underlying edges)
  for (let y = y0 + 1; y < y1; y++) {
    for (let x = x0 + 1; x < x1; x++) {
      if (inBounds(grid, x, y)) grid[y]![x] = ' ';
    }
  }

  // Center label
  if (label) {
    const interiorW = w - 2;
    const displayLabel = label.length > interiorW
      ? label.slice(0, Math.max(1, interiorW - 1)) + '…'
      : label;
    const pad = Math.floor((interiorW - displayLabel.length) / 2);
    const midY = y0 + Math.floor(h / 2);
    writeText(grid, x0 + 1 + pad, midY, displayLabel);
  }
}

// ── Edge drawing ──

interface BoxBounds {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function adjustEdgeEndpoints(
  pts: Array<{ x: number; y: number }>,
  fromBox: BoxBounds | undefined,
  toBox: BoxBounds | undefined,
): void {
  if (pts.length < 2) return;

  // 1. Adjust start point pts[0] relative to fromBox
  if (fromBox) {
    const p0 = pts[0]!;
    const p1 = pts[1]!;
    // Check if p0 is inside or on the border of fromBox
    if (p0.x >= fromBox.x0 && p0.x <= fromBox.x1 && p0.y >= fromBox.y0 && p0.y <= fromBox.y1) {
      if (p0.y === p1.y) {
        p0.x = p1.x > fromBox.x1 ? fromBox.x1 : fromBox.x0;
      } else if (p0.x === p1.x) {
        p0.y = p1.y > fromBox.y1 ? fromBox.y1 : fromBox.y0;
      } else {
        const distL = Math.abs(p0.x - fromBox.x0);
        const distR = Math.abs(p0.x - fromBox.x1);
        const distT = Math.abs(p0.y - fromBox.y0);
        const distB = Math.abs(p0.y - fromBox.y1);
        const minDist = Math.min(distL, distR, distT, distB);
        if (minDist === distL) p0.x = fromBox.x0;
        else if (minDist === distR) p0.x = fromBox.x1;
        else if (minDist === distT) p0.y = fromBox.y0;
        else p0.y = fromBox.y1;
      }
    }
  }

  // 2. Adjust end point pts[k] relative to toBox
  if (toBox) {
    const pk = pts[pts.length - 1]!;
    const prev = pts[pts.length - 2]!;
    // Check if pk is inside or on the border of toBox
    if (pk.x >= toBox.x0 && pk.x <= toBox.x1 && pk.y >= toBox.y0 && pk.y <= toBox.y1) {
      if (pk.y === prev.y) {
        pk.x = prev.x > toBox.x1 ? toBox.x1 : toBox.x0;
      } else if (pk.x === prev.x) {
        pk.y = prev.y > toBox.y1 ? toBox.y1 : toBox.y0;
      } else {
        const distL = Math.abs(pk.x - toBox.x0);
        const distR = Math.abs(pk.x - toBox.x1);
        const distT = Math.abs(pk.y - toBox.y0);
        const distB = Math.abs(pk.y - toBox.y1);
        const minDist = Math.min(distL, distR, distT, distB);
        if (minDist === distL) pk.x = toBox.x0;
        else if (minDist === distR) pk.x = toBox.x1;
        else if (minDist === distT) pk.y = toBox.y0;
        else pk.y = toBox.y1;
      }
    }
  }
}

function drawEdgePath(
  grid: string[][],
  gridPts: Array<{ x: number; y: number }>,
  g: GlyphSet,
): void {
  if (gridPts.length < 2) return;

  // Draw segments between consecutive points using Bresenham-like approach
  // but prefer orthogonal segments (horizontal then vertical)
  for (let i = 0; i < gridPts.length - 1; i++) {
    const a = gridPts[i]!;
    const b = gridPts[i + 1]!;

    if (a.y === b.y) {
      // Horizontal segment
      const step = a.x < b.x ? 1 : -1;
      for (let x = a.x; x !== b.x; x += step) {
        setChar(grid, x, a.y, g.horizontal, g);
      }
      setChar(grid, b.x, b.y, g.horizontal, g);
    } else if (a.x === b.x) {
      // Vertical segment
      const step = a.y < b.y ? 1 : -1;
      for (let y = a.y; y !== b.y; y += step) {
        setChar(grid, a.x, y, g.vertical, g);
      }
      setChar(grid, b.x, b.y, g.vertical, g);
    } else {
      // Diagonal — route as L-shaped: horizontal then vertical
      const midX = b.x;
      // Horizontal leg
      const hStep = a.x < midX ? 1 : -1;
      for (let x = a.x; x !== midX; x += hStep) {
        setChar(grid, x, a.y, g.horizontal, g);
      }
      // Corner
      const cornerChar = getCornerChar(a, { x: midX, y: a.y }, b, g);
      if (cornerChar) setChar(grid, midX, a.y, cornerChar, g);
      // Vertical leg
      const vStep = a.y < b.y ? 1 : -1;
      for (let y = a.y + vStep; y !== b.y; y += vStep) {
        setChar(grid, midX, y, g.vertical, g);
      }
      setChar(grid, b.x, b.y, g.vertical, g);
    }
  }

  // Draw corners at bend points
  for (let i = 1; i < gridPts.length - 1; i++) {
    const prev = gridPts[i - 1]!;
    const curr = gridPts[i]!;
    const next = gridPts[i + 1]!;
    const corner = getCornerChar(prev, curr, next, g);
    if (corner) setForce(grid, curr.x, curr.y, corner);
  }
}

function getCornerChar(
  prev: { x: number; y: number },
  curr: { x: number; y: number },
  next: { x: number; y: number },
  g: GlyphSet,
): string | null {
  const dx1 = curr.x - prev.x;
  const dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x;
  const dy2 = next.y - curr.y;

  // If collinear, no corner
  if ((dx1 === 0 && dx2 === 0) || (dy1 === 0 && dy2 === 0)) return null;

  if ((dy1 < 0 && dx2 > 0) || (dx1 < 0 && dy2 > 0)) return g.topLeft;
  if ((dy1 < 0 && dx2 < 0) || (dx1 > 0 && dy2 > 0)) return g.topRight;
  if ((dy1 > 0 && dx2 > 0) || (dx1 < 0 && dy2 < 0)) return g.bottomLeft;
  if ((dy1 > 0 && dx2 < 0) || (dx1 > 0 && dy2 < 0)) return g.bottomRight;
  return null;
}

function getArrowChar(
  from: { x: number; y: number },
  to: { x: number; y: number },
  g: GlyphSet,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? g.rightArrow : g.leftArrow;
  }
  return dy >= 0 ? g.downArrow : g.upArrow;
}

// ── Legend ──

function renderLegend(diagram: LayoutedDiagram): string {
  const lines = ['Nodes:'];
  for (const node of diagram.nodes) {
    lines.push(`- ${node.id}: ${node.label}`);
  }
  if ((diagram.groups ?? []).length > 0) {
    lines.push('', 'Groups:');
    for (const group of diagram.groups ?? []) {
      lines.push(`- ${group.id}: ${group.label}`);
    }
  }
  const labeledEdges = diagram.edges.filter(e => e.label);
  if (labeledEdges.length > 0) {
    lines.push('', 'Edges:');
    for (const edge of labeledEdges) {
      lines.push(`- ${edge.from} -> ${edge.to}: ${edge.label}`);
    }
  }
  return lines.join('\n');
}

// ── Main export ──

export function renderToTextFromSvg(
  diagram: LayoutedDiagram,
  options: SvgTextOptions = {},
): string {
  const charset = options.charset ?? 'unicode';
  const maxWidth = options.maxWidth ?? 120;
  const g = GLYPHS[charset];

  const mapper = buildMapper(diagram, maxWidth);
  const grid = createGrid(mapper.gridW, mapper.gridH);

  const nodeBoxes: Map<string, BoxBounds> = new Map();
  for (const node of diagram.nodes) {
    const nx = mapper.toCol(node.x);
    const ny = mapper.toRow(node.y);
    const nw = Math.max(
      node.label.length + 4,
      mapper.toCol(node.x + node.measuredWidth) - nx + 1,
    );
    const nh = Math.max(3, mapper.toRow(node.y + node.measuredHeight) - ny + 1);
    nodeBoxes.set(node.id, { x0: nx, x1: nx + nw - 1, y0: ny, y1: ny + nh - 1 });
  }

  // ── Layer 2: Edge paths (use ELK's routed points directly) ──
  const edgeGridPoints: Map<string, Array<{ x: number; y: number }>> = new Map();

  for (const edge of diagram.edges) {
    if (edge.points.length < 2) continue;

    const gridPts = edge.points.map(p => ({
      x: mapper.toCol(p.x),
      y: mapper.toRow(p.y),
    }));

    const fromBox = nodeBoxes.get(edge.from);
    const toBox = nodeBoxes.get(edge.to);
    adjustEdgeEndpoints(gridPts, fromBox, toBox);

    drawEdgePath(grid, gridPts, g);
    edgeGridPoints.set(`${edge.from}->${edge.to}`, gridPts);
  }

  // ── Layer 3: Node boxes (drawn after edges to mask overlaps) ──
  for (const node of diagram.nodes) {
    const box = nodeBoxes.get(node.id)!;
    drawBox(
      grid,
      box.x0,
      box.y0,
      box.x1 - box.x0 + 1,
      box.y1 - box.y0 + 1,
      node.label,
      g,
      false,
    );
  }

  // ── Layer 4: Edge labels ──
  for (const edge of diagram.edges) {
    if (!edge.label) continue;
    if (edge.labelX === undefined || edge.labelY === undefined) continue;

    const lx = mapper.toCol(edge.labelX);
    const ly = mapper.toRow(edge.labelY);
    const label = edge.label;

    // Clear a background area for the label
    clearRect(grid, lx - 1, ly, label.length + 2, 1);
    writeText(grid, lx, ly, label);
  }

  // ── Layer 5: Edge markers (arrows) ──
  for (const edge of diagram.edges) {
    const pts = edgeGridPoints.get(`${edge.from}->${edge.to}`);
    if (!pts || pts.length < 2) continue;

    // End marker
    const endMarker = edge.endMarker ?? 'arrow';
    if (endMarker !== 'none') {
      const endPt = pts[pts.length - 1]!;
      const prevPt = pts[pts.length - 2]!;
      let ch = '';
      if (endMarker === 'arrow') ch = getArrowChar(prevPt, endPt, g);
      else if (endMarker === 'circle') ch = g.circle;
      else if (endMarker === 'filledCircle') ch = g.filledCircle;
      if (ch) setForce(grid, endPt.x, endPt.y, ch);
    }

    // Start marker
    const startMarker = edge.startMarker ?? 'none';
    if (startMarker !== 'none') {
      const startPt = pts[0]!;
      const nextPt = pts[1]!;
      let ch = '';
      if (startMarker === 'arrow') ch = getArrowChar(nextPt, startPt, g);
      else if (startMarker === 'circle') ch = g.circle;
      else if (startMarker === 'filledCircle') ch = g.filledCircle;
      if (ch) setForce(grid, startPt.x, startPt.y, ch);
    }
  }

  // Trim trailing whitespace per line
  const trimmed = grid
    .map(row => row.join('').replace(/\s+$/u, ''))
    .join('\n')
    .replace(/\s+$/u, '');

  return `${trimmed}\n\n${renderLegend(diagram)}\n`;
}
