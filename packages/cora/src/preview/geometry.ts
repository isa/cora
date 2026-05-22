import { resolveComponentSize } from '../renderer/components/styles.js';
import type { PreviewNodeRole } from './pack/types.js';
import type { WorkbenchState } from './state.js';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface PreviewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttachmentSlot {
  role: PreviewNodeRole;
  side: Side;
  index: number;
  label: string;
  x: number;
  y: number;
}

export function computeNodeBox(state: WorkbenchState, role: PreviewNodeRole): PreviewBox {
  const node = state[role];
  const size = resolveComponentSize(node.props.size, { width: 176, height: 72 });
  return {
    ...node.position,
    ...size,
  };
}

export function chooseConnectionSides(source: PreviewBox, target: PreviewBox): { sourceSide: Side; targetSide: Side } {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  const dx = tx - sx;
  const dy = ty - sy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceSide: 'right', targetSide: 'left' }
      : { sourceSide: 'left', targetSide: 'right' };
  }

  return dy >= 0
    ? { sourceSide: 'bottom', targetSide: 'top' }
    : { sourceSide: 'top', targetSide: 'bottom' };
}

export function sidePoint(box: PreviewBox, side: Side, offsetRatio = 0.5): { x: number; y: number } {
  if (side === 'top') {
    return { x: box.x + box.width * offsetRatio, y: box.y };
  }
  if (side === 'bottom') {
    return { x: box.x + box.width * offsetRatio, y: box.y + box.height };
  }
  if (side === 'left') {
    return { x: box.x, y: box.y + box.height * offsetRatio };
  }
  return { x: box.x + box.width, y: box.y + box.height * offsetRatio };
}

export function computeConnectionPoints(state: WorkbenchState): Array<{ x: number; y: number }> {
  const primary = computeNodeBox(state, 'primary');
  const secondary = computeNodeBox(state, 'secondary');
  const { sourceSide, targetSide } = chooseConnectionSides(primary, secondary);
  const start = sidePoint(primary, sourceSide);
  const end = sidePoint(secondary, targetSide);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  if (sourceSide === 'left' || sourceSide === 'right') {
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}

export function computeAttachmentSlots(
  box: PreviewBox,
  role: PreviewNodeRole,
  side: Side,
  count: number,
): AttachmentSlot[] {
  return Array.from({ length: count }, (_, index) => {
    const ratio = (index + 1) / (count + 1);
    const point = sidePoint(box, side, ratio);
    return {
      role,
      side,
      index: index + 1,
      label: `${side}-${index + 1}`,
      ...point,
    };
  });
}

export function computeSceneAttachmentSlots(state: WorkbenchState): AttachmentSlot[] {
  const primary = computeNodeBox(state, 'primary');
  const secondary = computeNodeBox(state, 'secondary');
  const { sourceSide, targetSide } = chooseConnectionSides(primary, secondary);
  return [
    ...computeAttachmentSlots(primary, 'primary', sourceSide, 3),
    ...computeAttachmentSlots(secondary, 'secondary', targetSide, 3),
  ];
}
