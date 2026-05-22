import type { PointerEvent } from 'react';

import { Group } from '../../renderer/components/groups/Group.js';
import { Line } from '../../renderer/components/lines/Line.js';
import { LineMarkerDefs } from '../../renderer/components/lines/markers.js';
import { defaultTheme } from '../../renderer/themes/default.js';
import { previewIcon } from '../pack/builtins.js';
import { setNodePosition } from '../drag.js';
import {
  computeConnectionPoints,
  computeNodeBox,
  computeSceneAttachmentSlots,
} from '../geometry.js';
import { isConnectedScenario, isGroupedScenario } from '../scenarios.js';
import type { PreviewNodeRole } from '../pack/types.js';
import type { WorkbenchState } from '../state.js';
import { AttachmentOverlay } from './AttachmentOverlay.js';

interface WorkbenchCanvasProps {
  state: WorkbenchState;
  onStateChange(state: WorkbenchState): void;
}

function renderNode(state: WorkbenchState, role: PreviewNodeRole) {
  const node = state[role];
  const definition = state.pack.components.find((component) => component.id === node.componentId)!;
  const Component = definition.component;
  const iconProps =
    node.componentId === 'icon' || node.componentId === 'labelIcon'
      ? { icon: previewIcon }
      : {};
  const props = {
    ...node.props,
    x: node.position.x,
    y: node.position.y,
    ...iconProps,
  };

  return (
    <g key={role} className="preview-node" data-role={role}>
      <Component {...props} />
    </g>
  );
}

export function WorkbenchCanvas({ state, onStateChange }: WorkbenchCanvasProps) {
  const primaryBox = computeNodeBox(state, 'primary');
  const secondaryBox = computeNodeBox(state, 'secondary');
  const slots = computeSceneAttachmentSlots(state);
  const points = computeConnectionPoints(state);

  const onPointerMove = (event: PointerEvent<SVGGElement>, role: PreviewNodeRole) => {
    if (event.buttons !== 1) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    onStateChange(setNodePosition(state, role, {
      x: event.clientX - rect.left - (role === 'primary' ? primaryBox.width : secondaryBox.width) / 2,
      y: event.clientY - rect.top - (role === 'primary' ? primaryBox.height : secondaryBox.height) / 2,
    }));
  };

  return (
    <section className="canvas-region" aria-label="Canvas">
      <svg className="preview-canvas" viewBox="0 0 760 520" role="img">
        <defs>
          <LineMarkerDefs color={state.connection.strokeColor} />
        </defs>
        {isGroupedScenario(state.scenario) ? (
          <Group
            group={{
              id: 'preview-group',
              label: 'Group context',
              x: primaryBox.x - 36,
              y: primaryBox.y - 44,
              width: primaryBox.width + 72,
              height: primaryBox.height + 88,
            }}
            theme={defaultTheme}
          />
        ) : null}
        {isConnectedScenario(state.scenario) ? (
          <Line
            points={points}
            lineStyle={state.connection.lineStyle}
            strokeColor={state.connection.strokeColor}
            strokeWidth={state.connection.strokeWidth}
            startMarker={state.connection.startMarker}
            endMarker={state.connection.endMarker}
          />
        ) : null}
        <g onPointerMove={(event) => onPointerMove(event, 'primary')}>
          {renderNode(state, 'primary')}
        </g>
        {isConnectedScenario(state.scenario) ? (
          <g onPointerMove={(event) => onPointerMove(event, 'secondary')}>
            {renderNode(state, 'secondary')}
          </g>
        ) : null}
        <AttachmentOverlay slots={slots} boxes={[primaryBox, secondaryBox]} />
      </svg>
    </section>
  );
}
