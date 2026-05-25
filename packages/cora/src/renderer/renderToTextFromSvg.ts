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
  junctionDown: string;
  junctionUp: string;
  junctionLeft: string;
  junctionRight: string;
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
    dashH: '╌',
    dashV: '╎',
    junctionDown: '┬',
    junctionUp: '┴',
    junctionLeft: '┤',
    junctionRight: '├',
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
    junctionDown: '+',
    junctionUp: '+',
    junctionLeft: '+',
    junctionRight: '+',
  },
};

// ── Grid helpers ──

function createGrid(w: number, h: number): string[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ' '));
}

function inBounds(grid: string[][], x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0);
}

function getJunctionChar(
  x: number,
  y: number,
  nodeBoxes: Map<string, BoxBounds>,
  g: GlyphSet,
): string | null {
  for (const box of nodeBoxes.values()) {
    const isCorner =
      (x === box.x0 && y === box.y0) ||
      (x === box.x1 && y === box.y0) ||
      (x === box.x0 && y === box.y1) ||
      (x === box.x1 && y === box.y1);
    if (isCorner) continue;

    if (y === box.y0 && x > box.x0 && x < box.x1) {
      return g.junctionDown;
    }
    if (y === box.y1 && x > box.x0 && x < box.x1) {
      return g.junctionUp;
    }
    if (x === box.x0 && y > box.y0 && y < box.y1) {
      return g.junctionLeft;
    }
    if (x === box.x1 && y > box.y0 && y < box.y1) {
      return g.junctionRight;
    }
  }
  return null;
}

function setChar(
  grid: string[][],
  x: number,
  y: number,
  ch: string,
  g: GlyphSet,
  nodeBoxes?: Map<string, BoxBounds>,
): void {
  if (!inBounds(grid, x, y)) return;
  const existing = grid[y]![x]!;
  if (existing === g.cross) return;

  if (
    (existing === g.horizontal && ch === g.vertical) ||
    (existing === g.vertical && ch === g.horizontal)
  ) {
    if (nodeBoxes) {
      const junc = getJunctionChar(x, y, nodeBoxes, g);
      if (junc) {
        grid[y]![x] = junc;
        return;
      }
    }
    grid[y]![x] = g.cross;
    return;
  }

  const isCornerOrJunction =
    existing === g.topLeft ||
    existing === g.topRight ||
    existing === g.bottomLeft ||
    existing === g.bottomRight ||
    existing === g.junctionDown ||
    existing === g.junctionUp ||
    existing === g.junctionLeft ||
    existing === g.junctionRight ||
    existing === g.cross;

  if (isCornerOrJunction && (ch === g.horizontal || ch === g.vertical)) return;
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
  isEquality?: boolean;
}

function solveConstraints(coords: number[], constraints: Constraint[]): number[] {
  const result = [...coords];
  for (let iter = 0; iter < 200; iter++) {
    let changed = false;

    // 1. Monotonicity & separation constraint
    for (let i = 1; i < result.length; i++) {
      if (result[i]! < result[i - 1]! + 1) {
        result[i] = result[i - 1]! + 1;
        changed = true;
      }
    }

    // 2. Custom gap constraints
    for (const c of constraints) {
      const currentGap = result[c.idx2]! - result[c.idx1]!;
      if (currentGap < c.minGap) {
        result[c.idx2] = result[c.idx1]! + c.minGap;
        changed = true;
      } else if (c.isEquality && currentGap > c.minGap) {
        result[c.idx1] = result[c.idx2]! - c.minGap;
        changed = true;
      }
    }

    if (!changed) break;
  }
  return result;
}

function buildAxisMapper(
  pixelValues: number[],
  uniqueValues: number[],
  initialScale: number,
  pad: number,
  pxMin: number,
  constraints: Constraint[],
  maxWidth?: number,
): (px: number) => number {
  if (uniqueValues.length === 0) {
    return (px: number) => px;
  }

  // 1. Compute relaxed coordinates using initialScale
  const initialScaled = uniqueValues.map(
    px => Math.round((px - pxMin) * initialScale) + pad,
  );
  const relaxedCoords = solveConstraints(initialScaled, constraints);

  let finalCoords = relaxedCoords;

  // 2. If maxWidth is defined and relaxedCoords exceeds it, compress to fit
  if (maxWidth !== undefined && relaxedCoords.length > 0) {
    const relaxedWidth = relaxedCoords[relaxedCoords.length - 1]! + pad;
    if (relaxedWidth > maxWidth) {
      // Compute the most compact coordinates possible
      const compactBase = uniqueValues.map((_, i) => pad + i);
      const minCoords = solveConstraints(compactBase, constraints);

      const minWidth = minCoords[minCoords.length - 1]! + pad;
      if (minWidth <= maxWidth) {
        // Binary search for interpolation parameter t in [0, 1]
        let low = 0;
        let high = 1;
        let bestCoords = minCoords;

        for (let step = 0; step < 10; step++) {
          const t = (low + high) / 2;
          const interpolated = uniqueValues.map((_, i) =>
            Math.round(t * relaxedCoords[i]! + (1 - t) * minCoords[i]!),
          );
          const solved = solveConstraints(interpolated, constraints);
          const solvedWidth = solved[solved.length - 1]! + pad;

          if (solvedWidth <= maxWidth) {
            bestCoords = solved;
            low = t; // try to keep more proportion
          } else {
            high = t; // too wide, compress more
          }
        }
        finalCoords = bestCoords;
      } else {
        // Even the most compact version doesn't fit, use minCoords as the best effort
        finalCoords = minCoords;
      }
    }
  }

  return createPiecewiseLinearMapper(uniqueValues, finalCoords);
}

function buildMapper(diagram: LayoutedDiagram, maxWidth: number): CoordMapper {
  // 1. Collect all original coordinates
  const originalXs: number[] = [];
  const originalYs: number[] = [];

  for (const n of diagram.nodes) {
    originalXs.push(n.x, n.x + n.measuredWidth);
    originalYs.push(n.y, n.y + n.measuredHeight);
  }
  for (const g of diagram.groups ?? []) {
    originalXs.push(g.x, g.x + g.width);
    originalYs.push(g.y, g.y + g.height);
  }
  for (const e of diagram.edges) {
    for (const p of e.points) {
      originalXs.push(p.x);
      originalYs.push(p.y);
    }
    if (e.label && e.labelX !== undefined && e.labelY !== undefined) {
      originalXs.push(e.labelX);
      originalYs.push(e.labelY);
    }
  }

  const structuralMinX = Math.min(...originalXs, 0);
  const structuralMaxX = Math.max(...originalXs, 100);
  const structuralMinY = Math.min(...originalYs, 0);
  const structuralMaxY = Math.max(...originalYs, 100);

  const PAD = 2;
  const usableW = maxWidth - PAD * 2;

  // Initial scales for bounds estimations
  let scaleX = usableW / Math.max(structuralMaxX - structuralMinX, 1);
  scaleX = Math.min(0.07, scaleX); // Cap scaleX to keep small diagrams compact!
  let scaleY = scaleX * 0.5;
  scaleY = Math.min(0.035, scaleY); // Cap scaleY to keep small diagrams compact!

  // Max label extension estimations
  let maxLabelExtendX = 0;
  let maxLabelExtendY = 0;
  for (const e of diagram.edges) {
    if (e.label && e.labelX !== undefined && e.labelY !== undefined) {
      maxLabelExtendX = Math.max(maxLabelExtendX, e.labelX + e.label.length / scaleX);
      maxLabelExtendY = Math.max(maxLabelExtendY, e.labelY + 1 / scaleY);
    }
  }
  for (const g of diagram.groups ?? []) {
    if (g.label) {
      maxLabelExtendX = Math.max(maxLabelExtendX, g.x + g.label.length / scaleX);
    }
  }

  const pxMinX = structuralMinX;
  const pxMaxX = Math.max(structuralMaxX, maxLabelExtendX);
  const pxMinY = structuralMinY;
  const pxMaxY = Math.max(structuralMaxY, maxLabelExtendY);

  // Push final boundaries to make sure they are in the coordinate mappers
  originalXs.push(pxMinX, pxMaxX);
  originalYs.push(pxMinY, pxMaxY);

  // Deduplicate
  const uniqueXs = deduplicateWithTolerance(originalXs, 0.1);
  const uniqueYs = deduplicateWithTolerance(originalYs, 0.1);

  // Build constraints
  const xConstraints: Constraint[] = [];
  const yConstraints: Constraint[] = [];

  // Node width & height constraints (Locked to compact sizes using minimum constraints)
  for (const n of diagram.nodes) {
    const idx1 = findClosestIndex(uniqueXs, n.x);
    const idx2 = findClosestIndex(uniqueXs, n.x + n.measuredWidth);
    const minGapX = n.label.length + 3; // grid width = label.length + 4
    xConstraints.push({ idx1, idx2, minGap: minGapX });

    const idy1 = findClosestIndex(uniqueYs, n.y);
    const idy2 = findClosestIndex(uniqueYs, n.y + n.measuredHeight);
    const minGapY = 2; // grid height = 3
    yConstraints.push({ idx1: idy1, idx2: idy2, minGap: minGapY });
  }

  // Group label width constraints
  for (const g of diagram.groups ?? []) {
    if (g.label) {
      const idx1 = findClosestIndex(uniqueXs, g.x);
      const idx2 = findClosestIndex(uniqueXs, g.x + g.width);
      xConstraints.push({ idx1, idx2, minGap: g.label.length + 2 });
    }
  }

  // Edge label width constraints (push the immediate successor coordinate out of the label text)
  for (const e of diagram.edges) {
    if (e.label && e.labelX !== undefined && e.labelY !== undefined) {
      const idx1 = findClosestIndex(uniqueXs, e.labelX);
      let successorIdx = uniqueXs.length - 1;
      for (let i = 0; i < uniqueXs.length; i++) {
        if (uniqueXs[i]! > e.labelX + 0.1) {
          successorIdx = i;
          break;
        }
      }
      xConstraints.push({ idx1, idx2: successorIdx, minGap: e.label.length + 1 });
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
        if (idxA < idxB) {
          xConstraints.push({ idx1: idxA, idx2: idxB, minGap: 2 });
        }
      }

      // nA is completely above nB
      if (nA.y + nA.measuredHeight <= nB.y) {
        const idyA = findClosestIndex(uniqueYs, nA.y + nA.measuredHeight);
        const idyB = findClosestIndex(uniqueYs, nB.y);
        if (idyA < idyB) {
          yConstraints.push({ idx1: idyA, idx2: idyB, minGap: 2 });
        }
      }
    }
  }

  // Build monotonic piecewise mappers
  const mapX = buildAxisMapper(
    originalXs,
    uniqueXs,
    scaleX,
    PAD,
    pxMinX,
    xConstraints,
    maxWidth,
  );
  const mapY = buildAxisMapper(
    originalYs,
    uniqueYs,
    scaleY,
    PAD,
    pxMinY,
    yConstraints,
    undefined,
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
  nodeBoxes?: Map<string, BoxBounds>,
): void {
  if (w < 2 || h < 2) return;
  const x1 = x0 + w - 1;
  const y1 = y0 + h - 1;

  const hChar = dashed ? g.dashH : g.horizontal;
  const vChar = dashed ? g.dashV : g.vertical;

  // Corners
  setChar(grid, x0, y0, g.topLeft, g, nodeBoxes);
  setChar(grid, x1, y0, g.topRight, g, nodeBoxes);
  setChar(grid, x0, y1, g.bottomLeft, g, nodeBoxes);
  setChar(grid, x1, y1, g.bottomRight, g, nodeBoxes);

  // Horizontal borders
  for (let x = x0 + 1; x < x1; x++) {
    setChar(grid, x, y0, hChar, g, nodeBoxes);
    setChar(grid, x, y1, hChar, g, nodeBoxes);
  }

  // Vertical borders
  for (let y = y0 + 1; y < y1; y++) {
    setChar(grid, x0, y, vChar, g, nodeBoxes);
    setChar(grid, x1, y, vChar, g, nodeBoxes);
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

function getArrowheadGridPt(
  borderPt: { x: number; y: number },
  adjacentPt: { x: number; y: number },
): { x: number; y: number } {
  const dx = adjacentPt.x - borderPt.x;
  const dy = adjacentPt.y - borderPt.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x: borderPt.x + (dx > 0 ? 1 : dx < 0 ? -1 : 0),
      y: borderPt.y,
    };
  } else {
    return {
      x: borderPt.x,
      y: borderPt.y + (dy > 0 ? 1 : dy < 0 ? -1 : 0),
    };
  }
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

function getSafeLabelRow(
  lx: number,
  ly: number,
  len: number,
  gridH: number,
  nodeBoxes: Map<string, BoxBounds>,
  arrowPts: Array<{ x: number; y: number }>,
): number {
  const maxDelta = 5;
  for (let dy = 0; dy <= maxDelta; dy++) {
    for (const sign of [0, -1, 1]) {
      if (dy === 0 && sign !== 0) continue;
      if (dy > 0 && sign === 0) continue;

      const targetY = ly + dy * sign;
      if (targetY < 0 || targetY >= gridH) continue;

      // Check collision with any box
      let collidesWithBox = false;
      for (const box of nodeBoxes.values()) {
        const yOverlap = targetY >= box.y0 && targetY <= box.y1;
        const xOverlap = lx <= box.x1 && lx + len - 1 >= box.x0;
        if (yOverlap && xOverlap) {
          collidesWithBox = true;
          break;
        }
      }
      if (collidesWithBox) continue;

      // Check collision with any arrowhead
      let collidesWithArrow = false;
      for (const pt of arrowPts) {
        if (pt.y === targetY && pt.x >= lx && pt.x <= lx + len - 1) {
          collidesWithArrow = true;
          break;
        }
      }
      if (collidesWithArrow) continue;

      // Found a safe row!
      return targetY;
    }
  }
  return ly; // fallback
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

  // Precompute arrow points to prevent collisions with labels
  const edgeMarkers: Array<{
    edgeId: string;
    endPt?: { x: number; y: number; ch: string };
    startPt?: { x: number; y: number; ch: string };
  }> = [];
  const arrowPts: Array<{ x: number; y: number }> = [];

  for (const edge of diagram.edges) {
    const pts = edgeGridPoints.get(`${edge.from}->${edge.to}`);
    if (!pts || pts.length < 2) continue;

    const markerInfo: any = { edgeId: `${edge.from}->${edge.to}` };

    // End marker
    const endMarker = edge.endMarker ?? 'arrow';
    if (endMarker !== 'none') {
      const endPt = pts[pts.length - 1]!;
      const prevPt = pts[pts.length - 2]!;
      const arrowPt = getArrowheadGridPt(endPt, prevPt);
      let ch = '';
      if (endMarker === 'arrow') ch = getArrowChar(prevPt, endPt, g);
      else if (endMarker === 'circle') ch = g.circle;
      else if (endMarker === 'filledCircle') ch = g.filledCircle;
      if (ch) {
        markerInfo.endPt = { ...arrowPt, ch };
        arrowPts.push(arrowPt);
      }
    }

    // Start marker
    const startMarker = edge.startMarker ?? 'none';
    if (startMarker !== 'none') {
      const startPt = pts[0]!;
      const nextPt = pts[1]!;
      const arrowPt = getArrowheadGridPt(startPt, nextPt);
      let ch = '';
      if (startMarker === 'arrow') ch = getArrowChar(nextPt, startPt, g);
      else if (startMarker === 'circle') ch = g.circle;
      else if (startMarker === 'filledCircle') ch = g.filledCircle;
      if (ch) {
        markerInfo.startPt = { ...arrowPt, ch };
        arrowPts.push(arrowPt);
      }
    }

    edgeMarkers.push(markerInfo);
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
      nodeBoxes,
    );
  }

  // ── Layer 4: Edge labels ──
  for (const edge of diagram.edges) {
    if (!edge.label) continue;
    if (edge.labelX === undefined || edge.labelY === undefined) continue;

    const lx = mapper.toCol(edge.labelX);
    const rawLy = mapper.toRow(edge.labelY);
    const label = edge.label;

    const ly = getSafeLabelRow(lx, rawLy, label.length, mapper.gridH, nodeBoxes, arrowPts);

    // Clear a background area for the label
    clearRect(grid, lx - 1, ly, label.length + 2, 1);
    writeText(grid, lx, ly, label);
  }

  // ── Layer 5: Edge markers (arrows) ──
  for (const info of edgeMarkers) {
    if (info.endPt) {
      setForce(grid, info.endPt.x, info.endPt.y, info.endPt.ch);
    }
    if (info.startPt) {
      setForce(grid, info.startPt.x, info.startPt.y, info.startPt.ch);
    }
  }

  // Trim trailing whitespace per line
  const trimmed = grid
    .map(row => row.join('').replace(/\s+$/u, ''))
    .join('\n')
    .replace(/\s+$/u, '');

  return `${trimmed}\n\n${renderLegend(diagram)}\n`;
}
