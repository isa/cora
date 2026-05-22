import type { PreviewNodeRole } from '../pack/types.js';
import type { WorkbenchState } from '../state.js';
import type { PreviewNodeProps } from '../controls/defaults.js';
import { ControlInput } from './ControlInput.js';

interface NodePropPanelProps {
  state: WorkbenchState;
  onPropChange(role: PreviewNodeRole, key: string, value: unknown): void;
}

export function NodePropPanel({ state, onPropChange }: NodePropPanelProps) {
  return (
    <section className="node-prop-grid" aria-label="Inspector">
      {(['primary', 'secondary'] as const).map((role) => {
        const node = state[role];
        const definition = state.pack.components.find((component) => component.id === node.componentId)!;
        return (
          <div className="prop-column" key={role}>
            <h2>{role === 'primary' ? 'Primary node' : 'Secondary node'}</h2>
            {definition.controls.map((control) => (
              <ControlInput
                key={control.key}
                control={control}
                value={node.props[control.key as keyof PreviewNodeProps]}
                onChange={(value) => onPropChange(role, control.key, value)}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
