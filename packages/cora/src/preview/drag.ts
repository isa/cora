import type { PreviewNodeRole } from './pack/types.js';
import type { WorkbenchState } from './state.js';

export function moveNode(
  state: WorkbenchState,
  role: PreviewNodeRole,
  delta: { x: number; y: number },
): WorkbenchState {
  const node = state[role];
  return {
    ...state,
    [role]: {
      ...node,
      position: {
        x: node.position.x + delta.x,
        y: node.position.y + delta.y,
      },
    },
  };
}

export function movePrimaryNode(
  state: WorkbenchState,
  delta: { x: number; y: number },
): WorkbenchState {
  return moveNode(state, 'primary', delta);
}

export function moveSecondaryNode(
  state: WorkbenchState,
  delta: { x: number; y: number },
): WorkbenchState {
  return moveNode(state, 'secondary', delta);
}

export function setNodePosition(
  state: WorkbenchState,
  role: PreviewNodeRole,
  position: { x: number; y: number },
): WorkbenchState {
  return {
    ...state,
    [role]: {
      ...state[role],
      position,
    },
  };
}
