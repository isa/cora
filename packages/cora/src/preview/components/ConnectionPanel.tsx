import type { ConnectionProps } from '../controls/defaults.js';
import { connectionControls } from '../controls/defaults.js';
import type { WorkbenchState } from '../state.js';
import { isConnectedScenario } from '../scenarios.js';
import { ControlInput } from './ControlInput.js';

interface ConnectionPanelProps {
  state: WorkbenchState;
  onConnectionChange(key: keyof ConnectionProps, value: ConnectionProps[keyof ConnectionProps]): void;
}

export function ConnectionPanel({ state, onConnectionChange }: ConnectionPanelProps) {
  if (!isConnectedScenario(state.scenario)) {
    return null;
  }

  return (
    <section className="connection-panel" aria-label="Connection controls">
      <h2>Connection</h2>
      <span className="sr-only">lineStyle strokeColor strokeWidth startMarker endMarker</span>
      {connectionControls.map((control) => (
        <ControlInput
          key={control.key}
          control={control}
          value={state.connection[control.key]}
          onChange={(value) => onConnectionChange(control.key, value as ConnectionProps[keyof ConnectionProps])}
        />
      ))}
    </section>
  );
}
