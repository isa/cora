import type { PackManifest, PreviewComponentDefinition } from './pack/types.js';
import { builtInPack } from './pack/builtins.js';
import { connectionControls, connectionDefaults, type ConnectionProps, type PreviewNodeProps } from './controls/defaults.js';
import { isValidControlValue } from './controls/schema.js';

export interface PreviewPosition {
  x: number;
  y: number;
}

export interface CanvasNode {
  id: string;
  componentId: string;
  props: PreviewNodeProps;
  position: PreviewPosition;
  attachedConnectionId?: string;
}

export interface CanvasGroup {
  id: string;
  label: string;
  position: PreviewPosition;
  size: { width: number; height: number };
}

export interface CanvasConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  props: ConnectionProps;
}

export type CanvasSelection =
  | { kind: 'node'; id: string }
  | { kind: 'connection'; id: string }
  | { kind: 'group'; id: string };

export interface WorkbenchState {
  pack: PackManifest;
  nodes: CanvasNode[];
  groups: CanvasGroup[];
  connections: CanvasConnection[];
  selected?: CanvasSelection;
  nextId: number;
}

function componentById(pack: PackManifest, id: string): PreviewComponentDefinition {
  const found = pack.components.find((component) => component.id === id);
  if (!found) {
    throw new Error(`Unknown preview component "${id}".`);
  }
  return found;
}

function nextItemId(state: WorkbenchState, prefix: string): string {
  return `${prefix}-${state.nextId}`;
}

export function createDefaultWorkbenchState(pack = builtInPack): WorkbenchState {
  return {
    pack,
    nodes: [],
    groups: [],
    connections: [],
    nextId: 1,
  };
}

export function addCatalogItemToCanvas(
  state: WorkbenchState,
  componentId: string,
  position: PreviewPosition,
): WorkbenchState {
  if (componentId === 'group') {
    const id = nextItemId(state, 'group');
    return {
      ...state,
      groups: [
        ...state.groups,
        {
          id,
          label: 'Group',
          position,
          size: { width: 280, height: 160 },
        },
      ],
      selected: { kind: 'group', id },
      nextId: state.nextId + 1,
    };
  }

  const definition = componentById(state.pack, componentId);
  const id = nextItemId(state, 'node');
  const attachesToConnection = componentId === 'label' || componentId === 'labelIcon';
  const attachedConnectionId =
    attachesToConnection && state.selected?.kind === 'connection'
      ? state.selected.id
      : undefined;
  const nextNode: CanvasNode = {
    id,
    componentId,
    props: { ...definition.defaultProps },
    position,
    attachedConnectionId,
  };
  const sourceNode =
    attachesToConnection || attachedConnectionId
      ? undefined
      : state.selected?.kind === 'node'
        ? state.nodes.find((node) => node.id === state.selected?.id && node.componentId !== 'label' && node.componentId !== 'labelIcon')
        : [...state.nodes].reverse().find((node) => node.componentId !== 'label' && node.componentId !== 'labelIcon');
  const connection =
    sourceNode && sourceNode.id !== id
      ? [{
          id: nextItemId({ ...state, nextId: state.nextId + 1 }, 'connection'),
          fromNodeId: sourceNode.id,
          toNodeId: id,
          props: { ...connectionDefaults },
        }]
      : [];

  return {
    ...state,
    nodes: [...state.nodes, nextNode],
    connections: [...state.connections, ...connection],
    selected: { kind: 'node', id },
    nextId: state.nextId + 1 + connection.length,
  };
}

export const addNodeToCanvas = addCatalogItemToCanvas;

export function selectCanvasItem(state: WorkbenchState, selected: CanvasSelection): WorkbenchState {
  return { ...state, selected };
}

export function clearSelection(state: WorkbenchState): WorkbenchState {
  return { ...state, selected: undefined };
}

export function updateNodeProps(
  state: WorkbenchState,
  nodeId: string,
  key: string,
  value: unknown,
): WorkbenchState {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return state;
  }
  const definition = componentById(state.pack, node.componentId);
  const control = definition.controls.find((item) => item.key === key);

  if (!control || !isValidControlValue(control, value)) {
    return state;
  }

  return {
    ...state,
    nodes: state.nodes.map((item) =>
      item.id === nodeId
        ? { ...item, props: { ...item.props, [key]: value } }
        : item,
    ),
  };
}

export function updateConnectionProps(
  state: WorkbenchState,
  connectionId: string,
  key: keyof ConnectionProps,
  value: ConnectionProps[keyof ConnectionProps],
): WorkbenchState {
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return state;
  }
  const control = connectionControls.find((item) => item.key === key);

  if (!control || !isValidControlValue(control, value)) {
    return state;
  }

  return {
    ...state,
    connections: state.connections.map((connection) =>
      connection.id === connectionId
        ? { ...connection, props: { ...connection.props, [key]: value } }
        : connection,
    ),
  };
}

export function updateGroup(
  state: WorkbenchState,
  groupId: string,
  patch: Partial<Pick<CanvasGroup, 'label' | 'position' | 'size'>>,
): WorkbenchState {
  return {
    ...state,
    groups: state.groups.map((group) =>
      group.id === groupId ? { ...group, ...patch } : group,
    ),
  };
}

export function setNodePosition(
  state: WorkbenchState,
  nodeId: string,
  position: PreviewPosition,
): WorkbenchState {
  return {
    ...state,
    nodes: state.nodes.map((node) => node.id === nodeId ? { ...node, position } : node),
  };
}

export function setGroupPosition(
  state: WorkbenchState,
  groupId: string,
  position: PreviewPosition,
): WorkbenchState {
  return updateGroup(state, groupId, { position });
}

export function setGroupSize(
  state: WorkbenchState,
  groupId: string,
  size: { width: number; height: number },
): WorkbenchState {
  return updateGroup(state, groupId, { size });
}

export function duplicateSelected(state: WorkbenchState): WorkbenchState {
  if (!state.selected) {
    return state;
  }
  if (state.selected.kind === 'node') {
    const node = state.nodes.find((item) => item.id === state.selected?.id);
    if (!node) {
      return state;
    }
    const id = nextItemId(state, 'node');
    const attachesToConnection = node.componentId === 'label' || node.componentId === 'labelIcon';
    const connection =
      !attachesToConnection
        ? [{
            id: nextItemId({ ...state, nextId: state.nextId + 1 }, 'connection'),
            fromNodeId: node.id,
            toNodeId: id,
            props: { ...connectionDefaults },
          }]
        : [];
    return {
      ...state,
      nodes: [
        ...state.nodes,
        {
          ...node,
          id,
          position: { x: node.position.x + 28, y: node.position.y + 28 },
          attachedConnectionId: attachesToConnection ? node.attachedConnectionId : undefined,
        },
      ],
      connections: [...state.connections, ...connection],
      selected: { kind: 'node', id },
      nextId: state.nextId + 1 + connection.length,
    };
  }
  if (state.selected.kind === 'group') {
    const group = state.groups.find((item) => item.id === state.selected?.id);
    if (!group) {
      return state;
    }
    const id = nextItemId(state, 'group');
    return {
      ...state,
      groups: [
        ...state.groups,
        {
          ...group,
          id,
          label: `${group.label} Copy`,
          position: { x: group.position.x + 28, y: group.position.y + 28 },
        },
      ],
      selected: { kind: 'group', id },
      nextId: state.nextId + 1,
    };
  }
  return state;
}

export function deleteSelected(state: WorkbenchState): WorkbenchState {
  if (!state.selected) {
    return state;
  }
  if (state.selected.kind === 'node') {
    const id = state.selected.id;
    const removedConnectionIds = new Set(
      state.connections
        .filter((connection) => connection.fromNodeId === id || connection.toNodeId === id)
        .map((connection) => connection.id),
    );
    return {
      ...state,
      connections: state.connections.filter((connection) => connection.fromNodeId !== id && connection.toNodeId !== id),
      nodes: state.nodes.filter((node) => node.id !== id && !removedConnectionIds.has(node.attachedConnectionId ?? '')),
      selected: undefined,
    };
  }
  if (state.selected.kind === 'connection') {
    return {
      ...state,
      connections: state.connections.filter((connection) => connection.id !== state.selected?.id),
      nodes: state.nodes.filter((node) => node.attachedConnectionId !== state.selected?.id),
      selected: undefined,
    };
  }
  return {
    ...state,
    groups: state.groups.filter((group) => group.id !== state.selected?.id),
    selected: undefined,
  };
}

export function clearCanvas(state: WorkbenchState): WorkbenchState {
  return {
    ...state,
    nodes: [],
    groups: [],
    connections: [],
    selected: undefined,
  };
}
