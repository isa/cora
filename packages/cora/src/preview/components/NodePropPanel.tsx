import type { WorkbenchState } from '../state.js';
import type { PreviewNodeProps } from '../controls/defaults.js';
import type { ControlDefinition } from '../controls/schema.js';
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
        <p>Select a canvas item to edit its attributes.</p>
      </section>
    );
  }

  const definition = state.pack.components.find((component) => component.id === node.componentId)!;
  const groups = groupControls(definition.controls as Array<ControlDefinition<PreviewNodeProps>>);
  return (
    <section className="inspector-section" aria-label="Inspector">
      <div className="inspector-identity">
        <span className="inspector-icon-tile" aria-hidden="true">{definition.label.charAt(0)}</span>
        <div className="inspector-title-block">
          <p>Inspector / Attributes</p>
          <h2>{visibleComponentLabel(definition.label)}</h2>
          <span className="inspector-pill">Active</span>
        </div>
      </div>
      <div className="inspector-tabs" aria-label="Inspector sections">
        <span className="inspector-tab active">Inspector</span>
        <span className="inspector-tab">Style</span>
      </div>
      <div className="prop-column">
        {groups.map((group) => (
          <section key={group.label} className="control-group">
            <h3>{group.label}</h3>
            {group.controls.map((control) => (
              <ControlInput
                key={control.key}
                control={control}
                value={node.props[control.key as keyof PreviewNodeProps]}
                onChange={(value) => onPropChange(nodeId, control.key, value)}
              />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}

function visibleComponentLabel(label: string): string {
  return label.endsWith('Node') ? label.slice(0, -4) : label;
}

function groupControls(controls: Array<ControlDefinition<PreviewNodeProps>>) {
  const content = controls.filter((control) => ['title', 'subtitle', 'text', 'iconType', 'type', 'icon'].includes(control.key));
  const appearance = controls.filter((control) =>
    ['backgroundColor', 'radius', 'borderStyle', 'borderColor', 'borderWidth', 'textColor', 'subtitleColor', 'titleFontSize', 'subtitleFontSize', 'shadow', 'iconColor', 'skeletonColorDark', 'skeletonColorLight'].includes(control.key),
  );
  const size = controls.filter((control) => control.key === 'size');

  return [
    { label: 'Content', controls: content },
    { label: 'Appearance', controls: appearance },
    { label: 'Size', controls: size },
  ].filter((group) => group.controls.length > 0);
}
