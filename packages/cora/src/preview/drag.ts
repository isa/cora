import type { WorkbenchState } from './state.js';
import { setGroupPosition, setNodePosition } from './state.js';

export function moveNode(
  state: WorkbenchState,
  nodeId: string,
  delta: { x: number; y: number },
): WorkbenchState {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return state;
  }
  return setNodePosition(state, nodeId, {
    x: node.position.x + delta.x,
    y: node.position.y + delta.y,
  });
}

export function moveGroup(
  state: WorkbenchState,
  groupId: string,
  delta: { x: number; y: number },
): WorkbenchState {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) {
    return state;
  }
  return setGroupPosition(state, groupId, {
    x: group.position.x + delta.x,
    y: group.position.y + delta.y,
  });
}
