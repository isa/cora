import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GRID_MAJOR_EVERY,
  DEFAULT_GRID_SPACING,
  resolveGridConfig,
  snapPoint,
  snapScalar,
  snapSize,
} from '../../../src/core/grid.js';

describe('grid', () => {
  it('resolveGridConfig applies defaults', () => {
    expect(resolveGridConfig()).toEqual({
      spacing: 16,
      majorEvery: 5,
      visible: true,
    });
  });

  it('resolveGridConfig merges partial overrides', () => {
    expect(resolveGridConfig({ spacing: 8, visible: false })).toEqual({
      spacing: 8,
      majorEvery: DEFAULT_GRID_MAJOR_EVERY,
      visible: false,
    });
  });

  it('snapScalar rounds to cell boundaries from origin 0', () => {
    expect(snapScalar(7, 16)).toBe(0);
    expect(snapScalar(9, 16)).toBe(16);
    expect(snapScalar(0, 16)).toBe(0);
    expect(snapScalar(8, 16)).toBe(16);
    expect(snapScalar(-7, 16)).toBe(0);
    expect(snapScalar(-9, 16)).toBe(-16);
  });

  it('snapPoint snaps both axes', () => {
    expect(snapPoint({ x: 10, y: 25 }, resolveGridConfig())).toEqual({ x: 16, y: 32 });
    expect(snapPoint({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('snapSize never returns zero dimensions when input is at least 1', () => {
    expect(snapSize({ width: 1, height: 1 })).toEqual({ width: 16, height: 16 });
    expect(snapSize({ width: 20, height: 30 })).toEqual({ width: 16, height: 32 });
  });

  it('exports canonical spacing constant', () => {
    expect(DEFAULT_GRID_SPACING).toBe(16);
  });
});
