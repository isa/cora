import { describe, expect, it } from 'vitest';

import {
  PAGE_SIZES,
  computePageGeometry,
  extractSvgDimensions,
  scaleSvgToPage,
} from '../../src/renderer/pdf/pageSize.js';

describe('PAGE_SIZES', () => {
  it('A4 portrait dimensions match ISO 216 (within 0.01pt)', () => {
    const [w, h] = PAGE_SIZES['a4-portrait'];
    expect(w).toBeCloseTo(595.28, 2);
    expect(h).toBeCloseTo(841.89, 2);
  });

  it('letter (landscape) is 792 x 612', () => {
    expect(PAGE_SIZES['letter']).toEqual([792, 612]);
  });

  it('has all four expected page keys', () => {
    expect(Object.keys(PAGE_SIZES).sort()).toEqual(
      ['a4', 'a4-portrait', 'letter', 'letter-portrait'].sort(),
    );
  });

  it('a4-portrait swaps width/height vs a4', () => {
    const [aw, ah] = PAGE_SIZES['a4'];
    const [pw, ph] = PAGE_SIZES['a4-portrait'];
    expect(pw).toBeCloseTo(ah, 2);
    expect(ph).toBeCloseTo(aw, 2);
  });
});

describe('computePageGeometry', () => {
  it('fit-to-content returns bbox + 2*margin (default 24)', () => {
    const g = computePageGeometry({ width: 100, height: 100 }, {});
    expect(g.pageW).toBe(148);
    expect(g.pageH).toBe(148);
    expect(g.scale).toBe(1);
    expect(g.offsetX).toBe(24);
    expect(g.offsetY).toBe(24);
  });

  it('--page=a4 with oversized diagram returns scale<1 and centered offset', () => {
    const g = computePageGeometry(
      { width: 2000, height: 1000 },
      { page: 'a4' },
    );
    expect(g.scale).toBeLessThan(1);
    // a4 landscape: 841.89 x 595.28
    expect(g.pageW).toBeCloseTo(841.89, 2);
    expect(g.pageH).toBeCloseTo(595.28, 2);
    const scaledW = 2000 * g.scale;
    const scaledH = 1000 * g.scale;
    expect(g.offsetX).toBeCloseTo((g.pageW - scaledW) / 2, 4);
    expect(g.offsetY).toBeCloseTo((g.pageH - scaledH) / 2, 4);
    // diagram fits within usable area
    expect(scaledW).toBeLessThanOrEqual(g.pageW - 2 * 24 + 0.0001);
    expect(scaledH).toBeLessThanOrEqual(g.pageH - 2 * 24 + 0.0001);
  });

  it('a4-portrait swaps width/height (pageW < pageH)', () => {
    const g = computePageGeometry(
      { width: 100, height: 100 },
      { page: 'a4-portrait' },
    );
    expect(g.pageW).toBeCloseTo(595.28, 2);
    expect(g.pageH).toBeCloseTo(841.89, 2);
  });

  it('honors custom margin', () => {
    const g = computePageGeometry({ width: 100, height: 50 }, { margin: 10 });
    expect(g.pageW).toBe(120);
    expect(g.pageH).toBe(70);
    expect(g.offsetX).toBe(10);
    expect(g.offsetY).toBe(10);
  });
});

describe('scaleSvgToPage', () => {
  it('injects width/height attributes when only viewBox is present', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect/></svg>';
    const out = scaleSvgToPage(svg, 2);
    expect(out).toMatch(/width="200"/);
    expect(out).toMatch(/height="100"/);
  });

  it('replaces existing width/height attributes', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50"><rect/></svg>';
    const out = scaleSvgToPage(svg, 3);
    expect(out).toMatch(/width="300"/);
    expect(out).toMatch(/height="150"/);
  });
});

describe('extractSvgDimensions', () => {
  it('returns width/height from viewBox', () => {
    const svg = '<svg viewBox="0 0 200 100"><g/></svg>';
    expect(extractSvgDimensions(svg)).toEqual({ width: 200, height: 100 });
  });

  it('returns width/height from explicit attrs when no viewBox', () => {
    const svg = '<svg width="320" height="240"><g/></svg>';
    expect(extractSvgDimensions(svg)).toEqual({ width: 320, height: 240 });
  });

  it('throws on malformed input with neither viewBox nor width/height', () => {
    expect(() => extractSvgDimensions('<svg><g/></svg>')).toThrow();
  });
});
