import type { LayoutedDiagram } from '../layout-ir.js';

export type TextCharset = 'unicode' | 'ascii';

export interface RenderToTextOptions {
  charset?: TextCharset;
}

// ── Glyph definitions ──

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

// ── Constants ──

const GRID_PADDING = 2;
const MIN_BOX_WIDTH = 12;
const MIN_BOX_HEIGHT = 3;
const NODE_GAP_X = 6;  // Min columns between nodes for routing channels
const NODE_GAP_Y = 4;  // Min rows between nodes
const RUNWAY_LEN = 2;  // Min runway cells from box to first bend

// ── Types ──

interface Pt { x: number; y: number; }
type Side = 'top' | 'bottom' | 'left' | 'right';

interface GridNode {
  id: string;
  label: string;
  lines: string[];     // wrapped text lines
  x: number;           // top-left grid x
  y: number;           // top-left grid y
  w: number;           // width
  h: number;           // height
  anchors: Map<string, Pt>;  // edgeKey → anchor point ON the border
}

interface GridGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  contains: string[];
}

interface EdgeRoute {
  from: string;
  to: string;
  label?: string;
  labelLines: string[];
  points: Pt[];            // full path including anchors
  labelPt: Pt;
  labelIsH: boolean;
  startMarker: string;
  endMarker: string;
}

// ── Utility functions ──

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Wrap label text according to rules 2a/2b. */
function wrapLabel(text: string, totalBoxes: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text.trim()];

  const shouldWrap = totalBoxes > 7 || words.length > 3;
  if (!shouldWrap) return [words.join(' ')];

  // Wrap to roughly half width
  const full = words.join(' ');
  const longest = Math.max(...words.map(w => w.length));
  let maxW = Math.max(longest, Math.ceil(full.length / 2));

  while (maxW < full.length) {
    const lines: string[] = [];
    let cur: string[] = [];
    let len = 0;
    for (const w of words) {
      if (cur.length === 0) {
        cur.push(w); len = w.length;
      } else if (len + 1 + w.length <= maxW) {
        cur.push(w); len += 1 + w.length;
      } else {
        lines.push(cur.join(' '));
        cur = [w]; len = w.length;
      }
    }
    if (cur.length > 0) lines.push(cur.join(' '));
    if (lines.length > 1) return lines;
    maxW--;
  }
  return [full];
}

/** Determine which side of srcNode faces tgtNode. */
function facingSide(src: GridNode, tgt: GridNode): Side {
  const scx = src.x + src.w / 2, scy = src.y + src.h / 2;
  const tcx = tgt.x + tgt.w / 2, tcy = tgt.y + tgt.h / 2;
  const dx = Math.abs(tcx - scx), dy = Math.abs(tcy - scy);
  if (dy >= dx) {
    return tcy > scy ? 'bottom' : 'top';
  } else {
    return tcx > scx ? 'right' : 'left';
  }
}

/** Compute the edge length (interior cells) of a side. */
function sideLen(node: GridNode, side: Side): number {
  return side === 'top' || side === 'bottom' ? node.w - 2 : node.h - 2;
}

/** Distribute K anchors evenly across I interior cells (0-indexed positions). 
 *  Returns 0-based offsets within the interior. */
function distributeAnchors(K: number, I: number): number[] {
  if (K === 0) return [];
  if (K === 1) return [Math.floor(I / 2)];
  // Even distribution: padding on each side, equal spacing between
  const positions: number[] = [];
  const gap = (I - 1) / (K + 1);
  for (let i = 0; i < K; i++) {
    positions.push(Math.round(gap * (i + 1)));
  }
  return positions;
}

/** Make a unique key for an edge to track anchor assignment. */
function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

// ── Grid drawing ──

function createGrid(w: number, h: number): string[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ' '));
}

function setChar(grid: string[][], p: Pt, ch: string, g: GlyphSet): void {
  const row = grid[p.y];
  if (!row || p.x < 0 || p.x >= row.length) return;
  const existing = row[p.x] ?? ' ';
  // Never overwrite cross
  if (existing === g.cross) return;
  // Don't overwrite corners with plain lines
  const isCorner = existing === g.topLeft || existing === g.topRight ||
    existing === g.bottomLeft || existing === g.bottomRight;
  if (isCorner && (ch === g.horizontal || ch === g.vertical)) return;
  // Cross detection
  if ((existing === g.horizontal && ch === g.vertical) ||
    (existing === g.vertical && ch === g.horizontal)) {
    row[p.x] = g.cross;
    return;
  }
  row[p.x] = ch;
}

function setForce(grid: string[][], p: Pt, ch: string): void {
  const row = grid[p.y];
  if (row && p.x >= 0 && p.x < row.length) row[p.x] = ch;
}

function writeText(grid: string[][], x: number, y: number, text: string): void {
  const row = grid[y];
  if (!row) return;
  [...text].forEach((ch, i) => {
    const col = x + i;
    if (col >= 0 && col < row.length) row[col] = ch;
  });
}

function clearRect(grid: string[][], x: number, y: number, w: number, h: number): void {
  for (let dy = 0; dy < h; dy++) {
    const row = grid[y + dy];
    if (!row) continue;
    for (let dx = 0; dx < w; dx++) {
      const col = x + dx;
      if (col >= 0 && col < row.length) row[col] = ' ';
    }
  }
}

function drawBox(
  grid: string[][],
  x0: number, y0: number, w: number, h: number,
  lines: string[],
  g: GlyphSet,
  fill: boolean,
): void {
  const x1 = x0 + w - 1;
  const y1 = y0 + h - 1;
  const maxY = grid.length - 1;
  const maxX = (grid[0]?.length ?? 1) - 1;
  if (x0 > maxX || y0 > maxY) return;

  // Fill interior
  if (fill) {
    for (let y = Math.max(0, y0 + 1); y < Math.min(y1, maxY + 1); y++) {
      for (let x = Math.max(0, x0 + 1); x < Math.min(x1, maxX + 1); x++) {
        const row = grid[y];
        if (row) row[x] = ' ';
      }
    }
  }

  // Corners
  setChar(grid, { x: x0, y: y0 }, g.topLeft, g);
  setChar(grid, { x: x1, y: y0 }, g.topRight, g);
  setChar(grid, { x: x0, y: y1 }, g.bottomLeft, g);
  setChar(grid, { x: x1, y: y1 }, g.bottomRight, g);

  // Horizontal borders
  for (let x = x0 + 1; x < x1; x++) {
    setChar(grid, { x, y: y0 }, g.horizontal, g);
    setChar(grid, { x, y: y1 }, g.horizontal, g);
  }

  // Vertical borders
  for (let y = y0 + 1; y < y1; y++) {
    setChar(grid, { x: x0, y }, g.vertical, g);
    setChar(grid, { x: x1, y }, g.vertical, g);
  }

  // Center text vertically and horizontally (Rule 1)
  if (lines.length > 0) {
    const interiorH = h - 2;
    const yStart = y0 + 1 + Math.floor((interiorH - lines.length) / 2);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ly = yStart + i;
      if (ly <= y0 || ly >= y1) continue;
      const interiorW = w - 2;
      const pad = Math.floor((interiorW - line.length) / 2);
      const lx = x0 + 1 + pad;
      writeText(grid, lx, ly, line);
    }
  }
}

function drawSegment(grid: string[][], a: Pt, b: Pt, g: GlyphSet, exclusiveEnd = false): void {
  if (a.x === b.x && a.y === b.y) return;
  if (a.y === b.y) {
    const step = a.x < b.x ? 1 : -1;
    for (let x = a.x; x !== b.x; x += step) {
      setChar(grid, { x, y: a.y }, g.horizontal, g);
    }
    if (!exclusiveEnd) setChar(grid, { x: b.x, y: b.y }, g.horizontal, g);
  } else if (a.x === b.x) {
    const step = a.y < b.y ? 1 : -1;
    for (let y = a.y; y !== b.y; y += step) {
      setChar(grid, { x: a.x, y }, g.vertical, g);
    }
    if (!exclusiveEnd) setChar(grid, { x: b.x, y: b.y }, g.vertical, g);
  }
}

function getCornerGlyph(prev: Pt, curr: Pt, next: Pt, g: GlyphSet): string | null {
  const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
  if ((dy1 < 0 && dx2 > 0) || (dx1 < 0 && dy2 > 0)) return g.topLeft;     // ┌
  if ((dy1 < 0 && dx2 < 0) || (dx1 > 0 && dy2 > 0)) return g.topRight;    // ┐
  if ((dy1 > 0 && dx2 > 0) || (dx1 < 0 && dy2 < 0)) return g.bottomLeft;  // └
  if ((dy1 > 0 && dx2 < 0) || (dx1 > 0 && dy2 < 0)) return g.bottomRight; // ┘
  return null;
}

function getArrowGlyph(from: Pt, to: Pt, g: GlyphSet): string {
  if (from.x === to.x) return to.y >= from.y ? g.downArrow : g.upArrow;
  if (from.y === to.y) return to.x >= from.x ? g.rightArrow : g.leftArrow;
  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
    ? (to.x >= from.x ? g.rightArrow : g.leftArrow)
    : (to.y >= from.y ? g.downArrow : g.upArrow);
}

function getPortGlyph(p: Pt, node: GridNode, g: GlyphSet): string | null {
  const top = node.y, bot = node.y + node.h - 1;
  const left = node.x, right = node.x + node.w - 1;
  if (p.y === bot && p.x > left && p.x < right) return g.portDown;
  if (p.y === top && p.x > left && p.x < right) return g.portUp;
  if (p.x === right && p.y > top && p.y < bot) return g.portRight;
  if (p.x === left && p.y > top && p.y < bot) return g.portLeft;
  return null;
}

// ── Occupancy tracker for Rule 3 ──

interface OccSegment {
  val: number;   // column (for vertical) or row (for horizontal)
  min: number;
  max: number;
  edgeKey: string;
}

class OccupancyTracker {
  private hSegs: OccSegment[] = [];
  private vSegs: OccSegment[] = [];

  addH(row: number, x1: number, x2: number, ek: string): void {
    this.hSegs.push({ val: row, min: Math.min(x1, x2), max: Math.max(x1, x2), edgeKey: ek });
  }

  addV(col: number, y1: number, y2: number, ek: string): void {
    this.vSegs.push({ val: col, min: Math.min(y1, y2), max: Math.max(y1, y2), edgeKey: ek });
  }

  /** Check if a horizontal segment at row, from minX to maxX, is free. */
  isRowFree(row: number, minX: number, maxX: number): boolean {
    for (const s of this.hSegs) {
      if (s.val === row && Math.max(minX, s.min) <= Math.min(maxX, s.max)) {
        return false;
      }
    }
    return true;
  }

  /** Check if a vertical segment at col, from minY to maxY, is free. */
  isColFree(col: number, minY: number, maxY: number): boolean {
    for (const s of this.vSegs) {
      if (s.val === col && Math.max(minY, s.min) <= Math.min(maxY, s.max)) {
        return false;
      }
    }
    return true;
  }
}

// ── Clean collinear and duplicate points ──

function cleanPath(pts: Pt[]): Pt[] {
  if (pts.length < 2) return pts;
  const out: Pt[] = [];
  for (const pt of pts) {
    if (out.length > 0) {
      const last = out[out.length - 1]!;
      if (last.x === pt.x && last.y === pt.y) continue;
    }
    // Remove collinear midpoints
    while (out.length >= 2) {
      const prev = out[out.length - 2]!;
      const curr = out[out.length - 1]!;
      if ((prev.x === curr.x && curr.x === pt.x) ||
        (prev.y === curr.y && curr.y === pt.y)) {
        out.pop();
      } else {
        break;
      }
    }
    out.push(pt);
  }
  return out;
}

// ── Legend ──

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
  const labeledEdges = layouted.edges.filter(e => e.label);
  if (labeledEdges.length > 0) {
    lines.push('', 'Edges:');
    for (const edge of labeledEdges) {
      lines.push(`- ${edge.from} -> ${edge.to}: ${edge.label}`);
    }
  }
  return lines.join('\n');
}

// ── Main export ──

export function renderToText(
  layouted: LayoutedDiagram,
  options: RenderToTextOptions = {},
): string {
  const charset = options.charset ?? 'unicode';
  const glyphs = GLYPHS[charset];
  const totalBoxes = layouted.nodes.length;

  // ════════════════════════════════════════════
  // PHASE 1: Grid Placement
  // ════════════════════════════════════════════

  // Find ELK pixel bounds
  let minX = Infinity, minY = Infinity;
  for (const n of layouted.nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
  }
  for (const g of layouted.groups ?? []) {
    minX = Math.min(minX, g.x);
    minY = Math.min(minY, g.y);
  }
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; }

  const SCALE_X = 10;
  const SCALE_Y = 18;
  const toGX = (px: number) => Math.round((px - minX) / SCALE_X) + GRID_PADDING;
  const toGY = (px: number) => Math.round((px - minY) / SCALE_Y) + GRID_PADDING;

  // Create GridNodes with proper sizing for text centering (Rule 1)
  const gridNodes = new Map<string, GridNode>();

  for (const n of layouted.nodes) {
    const lines = wrapLabel(n.label, totalBoxes);
    const maxTextW = Math.max(...lines.map(l => l.length));
    const textH = lines.length;

    // Compute min size from ELK
    const elkW = Math.max(Math.round(n.measuredWidth / SCALE_X), MIN_BOX_WIDTH);
    const elkH = MIN_BOX_HEIGHT;

    // Width: text + 2 border + enough for centering (must be even diff with text)
    let w = Math.max(elkW, maxTextW + 4);
    // Ensure (w - 2 - maxTextW) is even for perfect centering
    if ((w - 2 - maxTextW) % 2 !== 0) w++;
    w = Math.max(w, MIN_BOX_WIDTH);

    // Height: text + 2 border + centering
    let h = Math.max(elkH, textH + 2);
    if ((h - 2 - textH) % 2 !== 0) h++;
    h = Math.max(h, MIN_BOX_HEIGHT);

    const gx = toGX(n.x);
    const gy = toGY(n.y);
    // Center the box around the ELK center point
    const elkCX = toGX(n.x + n.measuredWidth / 2);
    const shiftX = Math.max(0, elkCX - Math.floor(w / 2));

    gridNodes.set(n.id, {
      id: n.id,
      label: n.label,
      lines,
      x: shiftX,
      y: gy,
      w,
      h,
      anchors: new Map(),
    });
  }

  // Create GridGroups
  const gridGroups = new Map<string, GridGroup>();
  for (const g of layouted.groups ?? []) {
    const elkW = Math.max(Math.round(g.width / SCALE_X), MIN_BOX_WIDTH);
    const elkH = Math.max(Math.round(g.height / SCALE_Y), 5);
    let w = Math.max(elkW, g.label.length + 6);
    gridGroups.set(g.id, {
      id: g.id,
      label: g.label,
      x: toGX(g.x),
      y: toGY(g.y),
      w,
      h: elkH,
      contains: g.contains ?? [],
    });
  }

  // Overlap resolution
  const nodeArr = Array.from(gridNodes.values());

  for (let iter = 0; iter < 8; iter++) {
    // Node-node overlap
    for (let pass = 0; pass < 15; pass++) {
      let resolved = false;
      for (let i = 0; i < nodeArr.length; i++) {
        for (let j = i + 1; j < nodeArr.length; j++) {
          const a = nodeArr[i]!, b = nodeArr[j]!;
          const ox = a.x < b.x + b.w + NODE_GAP_X && b.x < a.x + a.w + NODE_GAP_X;
          const oy = a.y < b.y + b.h + NODE_GAP_Y && b.y < a.y + a.h + NODE_GAP_Y;
          if (ox && oy) {
            const origA = layouted.nodes.find(n => n.id === a.id)!;
            const origB = layouted.nodes.find(n => n.id === b.id)!;
            const edx = Math.abs(origA.x - origB.x);
            const edy = Math.abs(origA.y - origB.y);
            if (edx >= edy) {
              if (origA.x <= origB.x) b.x = a.x + a.w + NODE_GAP_X;
              else a.x = b.x + b.w + NODE_GAP_X;
            } else {
              if (origA.y <= origB.y) b.y = a.y + a.h + NODE_GAP_Y;
              else a.y = b.y + b.h + NODE_GAP_Y;
            }
            resolved = true;
          }
        }
      }
      if (!resolved) break;
    }

    // Group-group overlap
    if (gridGroups.size > 1) {
      const gArr = Array.from(gridGroups.values());
      for (let pass = 0; pass < 10; pass++) {
        let resolved = false;
        for (let i = 0; i < gArr.length; i++) {
          for (let j = i + 1; j < gArr.length; j++) {
            const a = gArr[i]!, b = gArr[j]!;
            const ox = a.x < b.x + b.w && b.x < a.x + a.w;
            const oy = a.y < b.y + b.h + 2 && b.y < a.y + a.h + 2;
            if (ox && oy) {
              const origA = layouted.groups?.find(g => g.id === a.id);
              const origB = layouted.groups?.find(g => g.id === b.id);
              const ay = origA ? origA.y : a.y;
              const by = origB ? origB.y : b.y;
              if (ay <= by) {
                const dy = (a.y + a.h + 2) - b.y;
                b.y += dy;
                for (const nid of b.contains) {
                  const n = gridNodes.get(nid);
                  if (n) n.y += dy;
                }
              } else {
                const dy = (b.y + b.h + 2) - a.y;
                a.y += dy;
                for (const nid of a.contains) {
                  const n = gridNodes.get(nid);
                  if (n) n.y += dy;
                }
              }
              resolved = true;
            }
          }
        }
        if (!resolved) break;
      }
    }

    // Containment: nodes must be inside their groups
    for (const group of gridGroups.values()) {
      const leftPad = group.label ? 3 : 2;
      const topPad = group.label ? 3 : 2;
      const rightPad = 3;
      const bottomPad = 2;

      for (const nid of group.contains) {
        const node = gridNodes.get(nid);
        if (!node) continue;
        if (node.x < group.x + leftPad) node.x = group.x + leftPad;
        if (node.y < group.y + topPad) node.y = group.y + topPad;
        if (node.x + node.w + rightPad > group.x + group.w) {
          group.w = node.x + node.w + rightPad - group.x;
        }
        if (node.y + node.h + bottomPad > group.y + group.h) {
          group.h = node.y + node.h + bottomPad - group.y;
        }
      }
    }
  }

  // ════════════════════════════════════════════
  // PHASE 2: Anchor Assignment (Rules 4a, 4b)
  // ════════════════════════════════════════════

  // Collect edges per node per side
  interface SideInfo {
    ek: string;         // edge key
    otherNodeId: string;
    isSource: boolean;
  }

  const nodeSides = new Map<string, { top: SideInfo[]; bottom: SideInfo[]; left: SideInfo[]; right: SideInfo[] }>();
  for (const n of layouted.nodes) {
    nodeSides.set(n.id, { top: [], bottom: [], left: [], right: [] });
  }

  for (const edge of layouted.edges) {
    const src = gridNodes.get(edge.from);
    const tgt = gridNodes.get(edge.to);
    if (!src || !tgt) continue;

    const srcSide = facingSide(src, tgt);
    const tgtSide = facingSide(tgt, src);
    const ek = edgeKey(edge.from, edge.to);

    nodeSides.get(edge.from)![srcSide].push({ ek, otherNodeId: edge.to, isSource: true });
    nodeSides.get(edge.to)![tgtSide].push({ ek, otherNodeId: edge.from, isSource: false });
  }

  // Sort edges on each side by other node's position for consistent layout
  for (const [nodeId, sides] of nodeSides.entries()) {
    const node = gridNodes.get(nodeId)!;
    // Top/bottom: sort by other node's center X
    for (const side of ['top', 'bottom'] as const) {
      sides[side].sort((a, b) => {
        const na = gridNodes.get(a.otherNodeId)!;
        const nb = gridNodes.get(b.otherNodeId)!;
        return (na.x + na.w / 2) - (nb.x + nb.w / 2);
      });
    }
    // Left/right: sort by other node's center Y
    for (const side of ['left', 'right'] as const) {
      sides[side].sort((a, b) => {
        const na = gridNodes.get(a.otherNodeId)!;
        const nb = gridNodes.get(b.otherNodeId)!;
        return (na.y + na.h / 2) - (nb.y + nb.h / 2);
      });
    }
  }

  // Grow boxes if needed to accommodate anchors, then assign anchors (Rule 4b)
  for (const [nodeId, sides] of nodeSides.entries()) {
    const node = gridNodes.get(nodeId)!;

    // Check if box needs to grow for horizontal sides
    const maxHAnchors = Math.max(sides.top.length, sides.bottom.length);
    const minInteriorW = maxHAnchors * 2 + 1;
    if (node.w - 2 < minInteriorW) {
      const oldW = node.w;
      node.w = minInteriorW + 2;
      // Re-check centering
      const maxTextW = Math.max(...node.lines.map(l => l.length));
      if ((node.w - 2 - maxTextW) % 2 !== 0) node.w++;
      // Re-center
      node.x -= Math.floor((node.w - oldW) / 2);
      if (node.x < 0) node.x = 0;
    }

    // Check vertical sides
    const maxVAnchors = Math.max(sides.left.length, sides.right.length);
    const minInteriorH = maxVAnchors * 2 + 1;
    if (node.h - 2 < minInteriorH) {
      const oldH = node.h;
      node.h = minInteriorH + 2;
      const textH = node.lines.length;
      if ((node.h - 2 - textH) % 2 !== 0) node.h++;
    }

    // Now assign anchor positions
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      const conns = sides[side];
      if (conns.length === 0) continue;

      const interior = sideLen(node, side);
      const positions = distributeAnchors(conns.length, interior);

      for (let i = 0; i < conns.length; i++) {
        const offset = positions[i] ?? 0;
        let anchor: Pt;
        switch (side) {
          case 'top':
            anchor = { x: node.x + 1 + offset, y: node.y };
            break;
          case 'bottom':
            anchor = { x: node.x + 1 + offset, y: node.y + node.h - 1 };
            break;
          case 'left':
            anchor = { x: node.x, y: node.y + 1 + offset };
            break;
          case 'right':
            anchor = { x: node.x + node.w - 1, y: node.y + 1 + offset };
            break;
        }
        node.anchors.set(conns[i].ek, anchor);
      }
    }
  }

  // ════════════════════════════════════════════
  // PHASE 3: Edge Routing (Rules 3, 4e, 5, 6)
  // ════════════════════════════════════════════

  const occ = new OccupancyTracker();
  
  // Register group borders as occupied segments so lines don't route ON them
  for (const g of gridGroups.values()) {
    occ.addH(g.y, g.x, g.x + g.w - 1, 'group-border');
    occ.addH(g.y + g.h - 1, g.x, g.x + g.w - 1, 'group-border');
    occ.addV(g.x, g.y, g.y + g.h - 1, 'group-border');
    occ.addV(g.x + g.w - 1, g.y, g.y + g.h - 1, 'group-border');
  }

  const edgeRoutes: EdgeRoute[] = [];
  const placedLabels: Array<{ x: number; y: number; w: number; h: number }> = [];

  /** Check if a point is inside any node's bounding box (excluding source/target). */
  function pointInsideNode(p: Pt, excludeIds: string[]): boolean {
    for (const n of gridNodes.values()) {
      if (excludeIds.includes(n.id)) continue;
      if (p.x >= n.x && p.x < n.x + n.w && p.y >= n.y && p.y < n.y + n.h) {
        return true;
      }
    }
    return false;
  }

  /** Check if a point is on a group border. */
  function pointOnGroupBorder(p: Pt): boolean {
    for (const g of gridGroups.values()) {
      const onHBorder = (p.y === g.y || p.y === g.y + g.h - 1) && p.x >= g.x && p.x <= g.x + g.w - 1;
      const onVBorder = (p.x === g.x || p.x === g.x + g.w - 1) && p.y >= g.y && p.y <= g.y + g.h - 1;
      if (onHBorder || onVBorder) return true;
    }
    return false;
  }

  /** Find a free column near preferredX for a vertical segment from minY to maxY. */
  function findFreeCol(preferredX: number, minY: number, maxY: number, ek: string): number {
    if (occ.isColFree(preferredX, minY, maxY) &&
      !pathBlockedByNode(preferredX, preferredX, minY, maxY, true, [])) {
      return preferredX;
    }
    for (let d = 1; d <= 30; d++) {
      for (const sign of [1, -1]) {
        const x = preferredX + d * sign;
        if (x < 0) continue;
        if (occ.isColFree(x, minY, maxY) &&
          !pathBlockedByNode(x, x, minY, maxY, true, [])) {
          return x;
        }
      }
    }
    return preferredX;
  }

  /** Find a free row near preferredY for a horizontal segment from minX to maxX. */
  function findFreeRow(preferredY: number, minX: number, maxX: number, ek: string): number {
    if (occ.isRowFree(preferredY, minX, maxX) &&
      !pathBlockedByNode(minX, maxX, preferredY, preferredY, false, [])) {
      return preferredY;
    }
    for (let d = 1; d <= 30; d++) {
      for (const sign of [1, -1]) {
        const y = preferredY + d * sign;
        if (y < 0) continue;
        if (occ.isRowFree(y, minX, maxX) &&
          !pathBlockedByNode(minX, maxX, y, y, false, [])) {
          return y;
        }
      }
    }
    return preferredY;
  }

  /** Check if a straight path goes through any node (other than excluded). */
  function pathBlockedByNode(
    x1: number, x2: number, y1: number, y2: number,
    isVertical: boolean, excludeIds: string[],
  ): boolean {
    for (const n of gridNodes.values()) {
      if (excludeIds.includes(n.id)) continue;
      if (isVertical) {
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        if (x1 >= n.x && x1 < n.x + n.w && maxY >= n.y && minY < n.y + n.h) {
          return true;
        }
      } else {
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        if (y1 >= n.y && y1 < n.y + n.h && maxX >= n.x && minX < n.x + n.w) {
          return true;
        }
      }
    }
    return false;
  }

  for (const edge of layouted.edges) {
    const srcNode = gridNodes.get(edge.from);
    const tgtNode = gridNodes.get(edge.to);
    if (!srcNode || !tgtNode) continue;

    const ek = edgeKey(edge.from, edge.to);
    const srcAnchor = srcNode.anchors.get(ek);
    const tgtAnchor = tgtNode.anchors.get(ek);
    if (!srcAnchor || !tgtAnchor) continue;

    const excludeIds = [edge.from, edge.to];

    // Determine exit direction from anchor position
    const srcSide = facingSide(srcNode, tgtNode);
    const tgtSide = facingSide(tgtNode, srcNode);

    // Build the runway points (Rule 5: min 2 chars runway, but don't pierce nodes)
    function getRunway(anchor: Pt, side: Side, maxLen: number, excludeId: string): Pt {
      let pt: Pt = { ...anchor };
      for (let d = 1; d <= maxLen; d++) {
        let testPt: Pt;
        switch (side) {
          case 'top': testPt = { x: anchor.x, y: anchor.y - d }; break;
          case 'bottom': testPt = { x: anchor.x, y: anchor.y + d }; break;
          case 'left': testPt = { x: anchor.x - d, y: anchor.y }; break;
          case 'right': testPt = { x: anchor.x + d, y: anchor.y }; break;
        }
        let inside = false;
        for (const n of gridNodes.values()) {
          if (n.id === excludeId) continue;
          if (testPt.x >= n.x && testPt.x < n.x + n.w && testPt.y >= n.y && testPt.y < n.y + n.h) {
            inside = true;
            break;
          }
        }
        if (inside) break;
        pt = testPt;
      }
      return pt;
    }

    const srcRunway = getRunway(srcAnchor, srcSide, RUNWAY_LEN, edge.from);
    const tgtRunway = getRunway(tgtAnchor, tgtSide, RUNWAY_LEN, edge.to);

    // Route between srcRunway and tgtRunway
    let midPoints: Pt[] = [];

    const isVerticalPrimary = srcSide === 'top' || srcSide === 'bottom';
    const isSameAxis = (srcSide === 'top' || srcSide === 'bottom') ===
      (tgtSide === 'top' || tgtSide === 'bottom');

    if (srcRunway.x === tgtRunway.x) {
      // Straight vertical connection
      const col = findFreeCol(srcRunway.x, Math.min(srcRunway.y, tgtRunway.y),
        Math.max(srcRunway.y, tgtRunway.y), ek);
      if (col !== srcRunway.x) {
        midPoints = [
          { x: srcRunway.x, y: srcRunway.y },
          { x: col, y: srcRunway.y },
          { x: col, y: tgtRunway.y },
          { x: tgtRunway.x, y: tgtRunway.y },
        ];
      } else {
        midPoints = [srcRunway, tgtRunway];
      }
    } else if (srcRunway.y === tgtRunway.y) {
      // Straight horizontal connection
      const row = findFreeRow(srcRunway.y, Math.min(srcRunway.x, tgtRunway.x),
        Math.max(srcRunway.x, tgtRunway.x), ek);
      if (row !== srcRunway.y) {
        midPoints = [
          { x: srcRunway.x, y: srcRunway.y },
          { x: srcRunway.x, y: row },
          { x: tgtRunway.x, y: row },
          { x: tgtRunway.x, y: tgtRunway.y },
        ];
      } else {
        midPoints = [srcRunway, tgtRunway];
      }
    } else if (isVerticalPrimary) {
      // Vertical first, then horizontal
      const midY = Math.round((srcRunway.y + tgtRunway.y) / 2);
      const freeRow = findFreeRow(midY, Math.min(srcRunway.x, tgtRunway.x),
        Math.max(srcRunway.x, tgtRunway.x), ek);
      const freeCol1 = findFreeCol(srcRunway.x, Math.min(srcRunway.y, freeRow),
        Math.max(srcRunway.y, freeRow), ek);
      const freeCol2 = findFreeCol(tgtRunway.x, Math.min(tgtRunway.y, freeRow),
        Math.max(tgtRunway.y, freeRow), ek);

      midPoints = [
        srcRunway,
        { x: freeCol1, y: srcRunway.y },
        { x: freeCol1, y: freeRow },
        { x: freeCol2, y: freeRow },
        { x: freeCol2, y: tgtRunway.y },
        tgtRunway,
      ];

      // Simplify if columns align
      if (freeCol1 === srcRunway.x && freeCol2 === tgtRunway.x) {
        midPoints = [
          srcRunway,
          { x: srcRunway.x, y: freeRow },
          { x: tgtRunway.x, y: freeRow },
          tgtRunway,
        ];
      }
    } else {
      // Horizontal first, then vertical
      const midX = Math.round((srcRunway.x + tgtRunway.x) / 2);
      const freeCol = findFreeCol(midX, Math.min(srcRunway.y, tgtRunway.y),
        Math.max(srcRunway.y, tgtRunway.y), ek);
      const freeRow1 = findFreeRow(srcRunway.y, Math.min(srcRunway.x, freeCol),
        Math.max(srcRunway.x, freeCol), ek);
      const freeRow2 = findFreeRow(tgtRunway.y, Math.min(tgtRunway.x, freeCol),
        Math.max(tgtRunway.x, freeCol), ek);

      midPoints = [
        srcRunway,
        { x: srcRunway.x, y: freeRow1 },
        { x: freeCol, y: freeRow1 },
        { x: freeCol, y: freeRow2 },
        { x: tgtRunway.x, y: freeRow2 },
        tgtRunway,
      ];

      if (freeRow1 === srcRunway.y && freeRow2 === tgtRunway.y) {
        midPoints = [
          srcRunway,
          { x: freeCol, y: srcRunway.y },
          { x: freeCol, y: tgtRunway.y },
          tgtRunway,
        ];
      }
    }

    // Build complete path: anchor → runway → mid → runway → anchor
    let fullPath = cleanPath([srcAnchor, ...midPoints, tgtAnchor]);

    // Register occupied segments
    for (let i = 0; i < fullPath.length - 1; i++) {
      const a = fullPath[i]!, b = fullPath[i + 1]!;
      if (a.x === b.x) {
        occ.addV(a.x, a.y, b.y, ek);
      } else if (a.y === b.y) {
        occ.addH(a.y, a.x, b.x, ek);
      }
    }

    // Label placement (Rule 4d)
    const labelLines = edge.label ? wrapLabel(edge.label, totalBoxes) : [];
    let labelPt: Pt = { x: 0, y: 0 };
    let labelIsH = true;

    if (labelLines.length > 0 && fullPath.length >= 2) {
      const maxLabelW = Math.max(...labelLines.map(l => l.length));
      const labelH = labelLines.length;

      // Find longest segment
      let bestLen = -1;
      let bestIdx = 0;
      let bestIsH = true;

      for (let i = 0; i < fullPath.length - 1; i++) {
        const a = fullPath[i]!, b = fullPath[i + 1]!;
        const lenX = Math.abs(b.x - a.x);
        const lenY = Math.abs(b.y - a.y);
        if (lenX >= lenY && lenX > bestLen) {
          bestLen = lenX; bestIdx = i; bestIsH = true;
        } else if (lenY > lenX && lenY > bestLen) {
          bestLen = lenY; bestIdx = i; bestIsH = false;
        }
      }

      const p1 = fullPath[bestIdx]!, p2 = fullPath[bestIdx + 1]!;
      labelIsH = bestIsH;

      if (bestIsH) {
        const midX = Math.round((p1.x + p2.x) / 2);
        labelPt = {
          x: midX - Math.floor(maxLabelW / 2),
          y: p1.y - labelH, // above the line
        };
      } else {
        const midY = Math.round((p1.y + p2.y) / 2);
        labelPt = {
          x: p1.x + 2,
          y: midY - Math.floor(labelH / 2),
        };
      }

      if (labelPt.x < 0) labelPt.x = 0;
      if (labelPt.y < 0) labelPt.y = 0;

      // Collision check and resolution (Rule 4d3)
      const labelCollides = (lp: Pt): boolean => {
        if (lp.x < 0 || lp.y < 0) return true;
        const lx0 = lp.x, lx1 = lp.x + maxLabelW - 1;
        const ly0 = lp.y, ly1 = lp.y + labelH - 1;

        for (const n of gridNodes.values()) {
          if (ly1 >= n.y && ly0 < n.y + n.h && lx1 >= n.x && lx0 < n.x + n.w) return true;
        }
        for (const g of gridGroups.values()) {
          // Check group borders
          const gy0 = g.y, gy1 = g.y + g.h - 1, gx0 = g.x, gx1 = g.x + g.w - 1;
          if (((ly0 <= gy0 && ly1 >= gy0) || (ly0 <= gy1 && ly1 >= gy1)) && lx1 >= gx0 && lx0 <= gx1) return true;
          if (((lx0 <= gx0 && lx1 >= gx0) || (lx0 <= gx1 && lx1 >= gx1)) && ly1 >= gy0 && ly0 <= gy1) return true;
        }
        for (const prev of placedLabels) {
          if (ly1 >= prev.y && ly0 < prev.y + prev.h && lx1 >= prev.x - 1 && lx0 <= prev.x + prev.w) return true;
        }
        return false;
      };

      if (labelCollides(labelPt)) {
        // Try alternative positions
        let found = false;
        const candidates: Pt[] = [];

        if (bestIsH) {
          // Try below the line
          candidates.push({ x: labelPt.x, y: p1.y + 1 });
          // Try at segment ends
          const minSX = Math.min(p1.x, p2.x);
          const maxSX = Math.max(p1.x, p2.x);
          candidates.push({ x: maxSX + 2, y: p1.y - Math.floor(labelH / 2) });
          candidates.push({ x: minSX - maxLabelW - 2, y: p1.y - Math.floor(labelH / 2) });
          candidates.push({ x: labelPt.x, y: labelPt.y - 1 });
          candidates.push({ x: labelPt.x, y: labelPt.y + labelH + 1 });
        } else {
          // Try left of line
          candidates.push({ x: p1.x - maxLabelW - 1, y: labelPt.y });
          candidates.push({ x: p1.x + 2, y: labelPt.y - 1 });
          candidates.push({ x: p1.x + 2, y: labelPt.y + 1 });
          // Scan along segment
          const minSY = Math.min(p1.y, p2.y);
          const maxSY = Math.max(p1.y, p2.y);
          for (let y = minSY; y <= maxSY; y++) {
            candidates.push({ x: p1.x + 2, y: y - Math.floor(labelH / 2) });
            candidates.push({ x: p1.x - maxLabelW - 1, y: y - Math.floor(labelH / 2) });
          }
        }

        for (const c of candidates) {
          if (c.x >= 0 && c.y >= 0 && !labelCollides(c)) {
            labelPt = c;
            found = true;
            break;
          }
        }

        if (!found) {
          // Spiral search
          for (let r = 1; r <= 12 && !found; r++) {
            for (let dx = -r; dx <= r && !found; dx++) {
              for (const dy of [-r, r]) {
                const c = { x: labelPt.x + dx, y: labelPt.y + dy };
                if (c.x >= 0 && c.y >= 0 && !labelCollides(c)) {
                  labelPt = c; found = true; break;
                }
              }
            }
            for (let dy = -r + 1; dy < r && !found; dy++) {
              for (const dx of [-r, r]) {
                const c = { x: labelPt.x + dx, y: labelPt.y + dy };
                if (c.x >= 0 && c.y >= 0 && !labelCollides(c)) {
                  labelPt = c; found = true; break;
                }
              }
            }
          }
        }
      }

      placedLabels.push({ x: labelPt.x, y: labelPt.y, w: maxLabelW, h: labelH });
    }

    edgeRoutes.push({
      from: edge.from,
      to: edge.to,
      label: edge.label,
      labelLines,
      points: fullPath,
      labelPt,
      labelIsH,
      startMarker: edge.startMarker ?? 'none',
      endMarker: edge.endMarker ?? 'arrow',
    });
  }

  // ════════════════════════════════════════════
  // PHASE 4: Drawing
  // ════════════════════════════════════════════

  // Compute grid dimensions
  let maxGX = 0, maxGY = 0;
  const updateMax = (x: number, y: number) => { if (x > maxGX) maxGX = x; if (y > maxGY) maxGY = y; };

  for (const g of gridGroups.values()) updateMax(g.x + g.w, g.y + g.h);
  for (const n of gridNodes.values()) updateMax(n.x + n.w, n.y + n.h);
  for (const r of edgeRoutes) {
    for (const p of r.points) updateMax(p.x + 1, p.y + 1);
    if (r.labelLines.length > 0) {
      const maxL = Math.max(...r.labelLines.map(l => l.length));
      updateMax(r.labelPt.x + maxL + 1, r.labelPt.y + r.labelLines.length + 1);
    }
  }

  const gridW = Math.max(maxGX + GRID_PADDING * 2, 32);
  const gridH = Math.max(maxGY + GRID_PADDING * 2, 8);
  const grid = createGrid(gridW, gridH);

  // Layer 1: Group borders
  for (const g of gridGroups.values()) {
    drawBox(grid, g.x, g.y, g.w, g.h, [], glyphs, false);
  }

  // Layer 2: Edge line segments
  for (const route of edgeRoutes) {
    if (route.points.length < 2) continue;
    for (let i = 0; i < route.points.length - 1; i++) {
      const isLast = i === route.points.length - 2;
      drawSegment(grid, route.points[i]!, route.points[i + 1]!, glyphs, !isLast);
    }
  }

  // Layer 3: Edge corners
  for (const route of edgeRoutes) {
    if (route.points.length < 3) continue;
    for (let i = 1; i < route.points.length - 1; i++) {
      const corner = getCornerGlyph(route.points[i - 1]!, route.points[i]!, route.points[i + 1]!, glyphs);
      if (corner) setChar(grid, route.points[i]!, corner, glyphs);
    }
  }

  // Layer 4: Node boxes (fill interior to mask underlying edges)
  for (const node of gridNodes.values()) {
    drawBox(grid, node.x, node.y, node.w, node.h, node.lines, glyphs, true);
  }

  // Layer 5: Edge labels
  for (const route of edgeRoutes) {
    if (route.labelLines.length === 0) continue;
    const maxL = Math.max(...route.labelLines.map(l => l.length));
    for (let j = 0; j < route.labelLines.length; j++) {
      const line = route.labelLines[j];
      const lx = route.labelPt.x + Math.floor((maxL - line.length) / 2);
      const ly = route.labelPt.y + j;
      // Clear background
      clearRect(grid, lx - (route.labelIsH ? 1 : 0), ly,
        line.length + (route.labelIsH ? 2 : 0), 1);
      writeText(grid, lx, ly, line);
    }
  }

  // Layer 6: Port glyphs on box borders
  for (const route of edgeRoutes) {
    const srcNode = gridNodes.get(route.from);
    const tgtNode = gridNodes.get(route.to);
    const startPt = route.points[0];
    const endPt = route.points[route.points.length - 1];

    if (srcNode && startPt && route.startMarker === 'none') {
      const pg = getPortGlyph(startPt, srcNode, glyphs);
      if (pg) setForce(grid, startPt, pg);
    }
    if (tgtNode && endPt && route.endMarker === 'none') {
      const pg = getPortGlyph(endPt, tgtNode, glyphs);
      if (pg) setForce(grid, endPt, pg);
    }
  }

  // Layer 7: Markers (arrows, circles) — Rule 4c
  for (const route of edgeRoutes) {
    if (route.points.length < 2) continue;

    // Start marker
    if (route.startMarker !== 'none') {
      const pt = route.points[0]!;
      let dirPt = route.points[1]!;
      for (let i = 1; i < route.points.length; i++) {
        if (route.points[i]!.x !== pt.x || route.points[i]!.y !== pt.y) {
          dirPt = route.points[i]!; break;
        }
      }
      let ch = '';
      if (route.startMarker === 'arrow') ch = getArrowGlyph(dirPt, pt, glyphs);
      else if (route.startMarker === 'circle') ch = glyphs.circle;
      else if (route.startMarker === 'filledCircle') ch = glyphs.filledCircle;
      if (ch) setForce(grid, pt, ch);
    }

    // End marker
    if (route.endMarker !== 'none') {
      const pt = route.points[route.points.length - 1]!;
      let dirPt = route.points[route.points.length - 2]!;
      for (let i = route.points.length - 2; i >= 0; i--) {
        if (route.points[i]!.x !== pt.x || route.points[i]!.y !== pt.y) {
          dirPt = route.points[i]!; break;
        }
      }
      let ch = '';
      if (route.endMarker === 'arrow') ch = getArrowGlyph(dirPt, pt, glyphs);
      else if (route.endMarker === 'circle') ch = glyphs.circle;
      else if (route.endMarker === 'filledCircle') ch = glyphs.filledCircle;
      if (ch) setForce(grid, pt, ch);
    }
  }

  // Layer 8: Group labels
  for (const g of gridGroups.values()) {
    if (!g.label) continue;
    const labelY = Math.min(g.y + 1, g.y + g.h - 1);
    const labelX = g.x + 2;
    const maxLen = Math.max(0, g.w - 3);
    writeText(grid, labelX, labelY, g.label.slice(0, maxLen));
  }

  // Trim and output
  const trimmed = grid
    .map(row => row.join('').replace(/\s+$/u, ''))
    .join('\n')
    .replace(/\s+$/u, '');

  return `${trimmed}\n\n${renderLegend(layouted)}\n`;
}
