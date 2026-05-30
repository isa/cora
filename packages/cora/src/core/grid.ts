export const DEFAULT_GRID_SPACING = 16;
export const DEFAULT_GRID_MAJOR_EVERY = 5;
export const DEFAULT_GRID_ORIGIN = { x: 0, y: 0 } as const;

export interface GridConfig {
  spacing: number;
  majorEvery: number;
  visible: boolean;
}

export function resolveGridConfig(grid?: Partial<GridConfig>): GridConfig {
  const spacing =
    typeof grid?.spacing === 'number' && grid.spacing >= 1 ? grid.spacing : DEFAULT_GRID_SPACING;
  const majorEvery =
    typeof grid?.majorEvery === 'number' && grid.majorEvery >= 1
      ? Math.floor(grid.majorEvery)
      : DEFAULT_GRID_MAJOR_EVERY;
  const visible = grid?.visible !== false;
  return { spacing, majorEvery, visible };
}

export function snapScalar(value: number, spacing: number, origin = 0): number {
  return origin + Math.round((value - origin) / spacing) * spacing;
}

export function snapPoint(
  point: { x: number; y: number },
  config?: GridConfig,
): { x: number; y: number } {
  const { spacing } = resolveGridConfig(config);
  return {
    x: snapScalar(point.x, spacing, DEFAULT_GRID_ORIGIN.x),
    y: snapScalar(point.y, spacing, DEFAULT_GRID_ORIGIN.y),
  };
}

export function snapSize(
  size: { width: number; height: number },
  config?: GridConfig,
): { width: number; height: number } {
  const resolved = resolveGridConfig(config);
  const width = Math.max(resolved.spacing, snapScalar(size.width, resolved.spacing));
  const height = Math.max(resolved.spacing, snapScalar(size.height, resolved.spacing));
  return { width, height };
}
