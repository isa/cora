import type { PackManifest, PreviewComponentDefinition, PreviewNodeRole, PreviewScenarioId } from './pack/types.js';
import { builtInPack } from './pack/builtins.js';
import { connectionDefaults, type ConnectionProps, type PreviewNodeProps } from './controls/defaults.js';
import { isValidControlValue } from './controls/schema.js';

export interface PreviewPosition {
  x: number;
  y: number;
}

export interface SelectedPreviewNode {
  componentId: string;
  props: PreviewNodeProps;
  position: PreviewPosition;
}

export interface WorkbenchState {
  pack: PackManifest;
  scenario: PreviewScenarioId;
  primary: SelectedPreviewNode;
  secondary: SelectedPreviewNode;
  connection: ConnectionProps;
}

const defaultPositions: Record<PreviewNodeRole, PreviewPosition> = {
  primary: { x: 180, y: 170 },
  secondary: { x: 470, y: 170 },
};

function componentById(pack: PackManifest, id: string): PreviewComponentDefinition {
  const found = pack.components.find((component) => component.id === id);
  if (!found) {
    throw new Error(`Unknown preview component "${id}".`);
  }
  return found;
}

function defaultNode(pack: PackManifest, componentId: string, role: PreviewNodeRole): SelectedPreviewNode {
  const definition = componentById(pack, componentId);
  return {
    componentId,
    props: { ...definition.defaultProps },
    position: { ...defaultPositions[role] },
  };
}

export function createDefaultWorkbenchState(pack = builtInPack): WorkbenchState {
  return {
    pack,
    scenario: 'connected',
    primary: defaultNode(pack, 'box', 'primary'),
    secondary: defaultNode(pack, 'page', 'secondary'),
    connection: { ...connectionDefaults },
  };
}

export function selectPrimaryNode(state: WorkbenchState, componentId: string): WorkbenchState {
  return {
    ...state,
    primary: defaultNode(state.pack, componentId, 'primary'),
  };
}

export function selectSecondaryNode(state: WorkbenchState, componentId: string): WorkbenchState {
  return {
    ...state,
    secondary: defaultNode(state.pack, componentId, 'secondary'),
  };
}

export function switchScenario(state: WorkbenchState, scenario: PreviewScenarioId): WorkbenchState {
  return {
    ...state,
    scenario,
    primary: defaultNode(state.pack, state.primary.componentId, 'primary'),
    secondary: defaultNode(state.pack, state.secondary.componentId, 'secondary'),
    connection: { ...connectionDefaults },
  };
}

export function updateNodeProps(
  state: WorkbenchState,
  role: PreviewNodeRole,
  key: string,
  value: unknown,
): WorkbenchState {
  const node = state[role];
  const definition = componentById(state.pack, node.componentId);
  const control = definition.controls.find((item) => item.key === key);

  if (!control || !isValidControlValue(control, value)) {
    return state;
  }

  return {
    ...state,
    [role]: {
      ...node,
      props: {
        ...node.props,
        [key]: value,
      },
    },
  };
}

export function updateConnectionProps(
  state: WorkbenchState,
  key: keyof ConnectionProps,
  value: ConnectionProps[keyof ConnectionProps],
): WorkbenchState {
  return {
    ...state,
    connection: {
      ...state.connection,
      [key]: value,
    },
  };
}
