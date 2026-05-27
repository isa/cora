import type { ReactNode } from 'react';

import type { CanvasNode, WorkbenchState } from '../state.js';
import type { PreviewNodeProps } from '../controls/defaults.js';
import type { ControlDefinition } from '../controls/schema.js';
import { displayNameForComponentLabel } from '../pack/displayNames.js';
import { ControlInput } from './ControlInput.js';

interface NodePropPanelProps {
  state: WorkbenchState;
  nodeId?: string;
  onPropChange(nodeId: string, key: string, value: unknown): void;
}

export function NodePropPanel({ state, nodeId, onPropChange }: NodePropPanelProps) {
  const node = nodeId ? state.nodes.find((item) => item.id === nodeId) : undefined;

  if (!nodeId || !node) {
    return (
      <section className="inspector-empty" aria-label="Inspector">
        <p className="inspector-empty-hint">Select a component to edit its attributes.</p>
      </section>
    );
  }

  const definition = state.pack.components.find((component) => component.id === node.componentId)!;
  const groups = groupControls(definition.controls as Array<ControlDefinition<PreviewNodeProps>>);

  return (
    <section className="inspector-section" aria-label="Inspector controls">
      <div className="prop-column">
        {groups.length === 0 ? (
          <p className="inspector-tab-empty">No controls for this component.</p>
        ) : null}
        {groups.map((group) => {
          let iconName = 'edit';
          if (group.label === 'Style') iconName = 'palette';
          else if (group.label === 'Layout') iconName = 'grid_view';

          return (
            <details key={group.label} open className="control-group-details">
              <summary className="control-group-summary">
                <div className="summary-title-row">
                  <span className="material-symbols-outlined group-icon" aria-hidden="true">
                    {iconName}
                  </span>
                  <h3>{group.label}</h3>
                </div>
                <span className="material-symbols-outlined chevron-icon" aria-hidden="true">
                  expand_more
                </span>
              </summary>
              <div className="control-group-content">
                {group.controls.map((control) => (
                  <ControlInput
                    key={control.key}
                    control={control}
                    value={node.props[control.key as keyof PreviewNodeProps]}
                    onChange={(value) => onPropChange(nodeId, control.key, value)}
                    showColorSwatches={control.kind === 'color'}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

export function visibleComponentLabel(label: string): string {
  return displayNameForComponentLabel(label);
}

const CONTENT_KEYS = ['iconName', 'iconColor', 'title', 'subtitle', 'text', 'iconType', 'type', 'icon'];
const LAYOUT_KEYS = ['size', 'radius', 'borderStyle', 'borderWidth', 'borderColor'];
const STYLE_KEYS = [
  'backgroundColor',
  'textColor',
  'subtitleColor',
  'skeletonColor',
  'titleFontSize',
  'subtitleFontSize',
  'shadow',
  'shadowColor',
  'skeletonColorDark',
  'skeletonColorLight',
];

function groupControls(controls: Array<ControlDefinition<PreviewNodeProps>>) {
  const pick = (keys: string[]) => {
    const matched = controls.filter((control) => keys.includes(control.key));
    return matched.sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
  };
  return [
    { label: 'Content', controls: pick(CONTENT_KEYS) },
    { label: 'Layout', controls: pick(LAYOUT_KEYS) },
    { label: 'Style', controls: pick(STYLE_KEYS) },
  ].filter((group) => group.controls.length > 0);
}
