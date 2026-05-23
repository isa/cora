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
  },
};

const CELL_WIDTH = 16;
const CELL_HEIGHT = 18;
const MIN_BOX_WIDTH = 8;
const BOX_HEIGHT = 3;
const GRID_PADDING = 1;

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

function scalePoint(
  point: { x: number; y: number },
  min: { x: number; y: number },
): GridPoint {
  return {
    x: Math.round((point.x - min.x) / CELL_WIDTH) + GRID_PADDING,
    y: Math.round((point.y - min.y) / CELL_HEIGHT) + GRID_PADDING,
  };
}

function collectBounds(layouted: LayoutedDiagram): {
  min: { x: number; y: number };
  max: { x: number; y: number };
} {
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

  for (const group of layouted.groups ?? []) {
    consider(group.x, group.y);
    consider(group.x + group.width, group.y + group.height);
  }

  for (const node of layouted.nodes) {
    consider(node.x, node.y);
    consider(node.x + node.measuredWidth, node.y + node.measuredHeight);
  }

  for (const edge of layouted.edges) {
    for (const point of edge.points) {
      consider(point.x, point.y);
    }
    if (edge.labelX !== undefined && edge.labelY !== undefined) {
      consider(edge.labelX, edge.labelY);
    }
  }

  if (!Number.isFinite(minX)) {
    return {
      min: { x: 0, y: 0 },
      max: { x: Math.max(layouted.width, 1), y: Math.max(layouted.height, 1) },
    };
  }

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  };
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
): void {
  const maxY = grid.length - 1;
  const maxX = grid[0]?.length ? grid[0].length - 1 : 0;
  const x0 = clamp(topLeft.x, 0, maxX);
  const y0 = clamp(topLeft.y, 0, maxY);
  const x1 = clamp(x0 + Math.max(width, MIN_BOX_WIDTH) - 1, x0, maxX);
  const y1 = clamp(y0 + Math.max(height, BOX_HEIGHT) - 1, y0, maxY);

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

  const labelY = clamp(y0 + 1, y0, y1);
  const labelX = clamp(
    x0 + Math.max(1, Math.floor((x1 - x0 + 1 - textWidth(label)) / 2)),
    x0 + 1,
    Math.max(x0 + 1, x1 - textWidth(label)),
  );
  writeText(grid, labelX, labelY, label.slice(0, Math.max(0, x1 - x0 - 1)));
}

function drawLine(
  grid: string[][],
  from: GridPoint,
  to: GridPoint,
  glyphs: GlyphSet,
): void {
  const horizontalStep = from.x <= to.x ? 1 : -1;
  for (let x = from.x; x !== to.x; x += horizontalStep) {
    setChar(grid, { x, y: from.y }, glyphs.horizontal, glyphs);
  }

  const verticalStep = from.y <= to.y ? 1 : -1;
  for (let y = from.y; y !== to.y; y += verticalStep) {
    setChar(grid, { x: to.x, y }, glyphs.vertical, glyphs);
  }

  const arrow =
    Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
      ? to.x >= from.x
        ? glyphs.rightArrow
        : glyphs.leftArrow
      : to.y >= from.y
        ? glyphs.downArrow
        : glyphs.upArrow;
  setChar(grid, to, arrow, glyphs);
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

export function renderToText(
  layouted: LayoutedDiagram,
  options: RenderToTextOptions = {},
): string {
  const charset = options.charset ?? 'unicode';
  const glyphs = GLYPHS[charset];
  const bounds = collectBounds(layouted);
  const width =
    Math.ceil((bounds.max.x - bounds.min.x) / CELL_WIDTH) + GRID_PADDING * 4 + 24;
  const height =
    Math.ceil((bounds.max.y - bounds.min.y) / CELL_HEIGHT) + GRID_PADDING * 4 + 8;
  const grid = createGrid(Math.max(width, 32), Math.max(height, 8));

  for (const group of layouted.groups ?? []) {
    const point = scalePoint({ x: group.x, y: group.y }, bounds.min);
    const groupWidth = Math.max(
      Math.round(group.width / CELL_WIDTH),
      textWidth(group.label) + 4,
      MIN_BOX_WIDTH,
    );
    const groupHeight = Math.max(Math.round(group.height / CELL_HEIGHT), 5);
    drawBox(grid, point, groupWidth, groupHeight, group.label, glyphs);
  }

  for (const edge of layouted.edges) {
    if (edge.points.length < 2) {
      continue;
    }
    const start = scalePoint(edge.points[0]!, bounds.min);
    const end = scalePoint(edge.points[edge.points.length - 1]!, bounds.min);
    drawLine(grid, start, end, glyphs);

    if (edge.label) {
      const labelPoint = scalePoint(
        {
          x: edge.labelX ?? (edge.points[0]!.x + edge.points[edge.points.length - 1]!.x) / 2,
          y: edge.labelY ?? (edge.points[0]!.y + edge.points[edge.points.length - 1]!.y) / 2,
        },
        bounds.min,
      );
      writeText(grid, labelPoint.x + 1, labelPoint.y, edge.label);
    }
  }

  for (const node of layouted.nodes) {
    const point = scalePoint({ x: node.x, y: node.y }, bounds.min);
    const boxWidth = Math.max(
      Math.round(node.measuredWidth / CELL_WIDTH),
      textWidth(node.label) + 4,
      MIN_BOX_WIDTH,
    );
    drawBox(grid, point, boxWidth, BOX_HEIGHT, node.label, glyphs);
  }

  return `${trimGrid(grid)}\n\n${renderLegend(layouted)}\n`;
}
