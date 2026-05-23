import type { ConnectionProps } from '../controls/defaults.js';
import { connectionControls } from '../controls/defaults.js';
import type { CanvasConnection } from '../state.js';
import { ControlInput } from './ControlInput.js';

interface ConnectionPanelProps {
  connection?: CanvasConnection;
  onConnectionChange(key: keyof ConnectionProps, value: ConnectionProps[keyof ConnectionProps]): void;
}

export function ConnectionPanel({ connection, onConnectionChange }: ConnectionPanelProps) {
  if (!connection) {
    return null;
  }

  return (
    <section className="inspector-section connection-panel" aria-label="Connection controls">
      <h2>Connection</h2>
      <span className="sr-only">lineStyle strokeColor strokeWidth startMarker endMarker</span>
      <section className="control-group">
        <h3>Line</h3>
        {connectionControls.slice(0, 4).map((control) => (
          <ControlInput
            key={control.key}
            control={control}
            value={connection.props[control.key]}
            onChange={(value) => onConnectionChange(control.key, value as ConnectionProps[keyof ConnectionProps])}
          />
        ))}
      </section>
      <section className="control-group">
        <h3>Markers</h3>
        {connectionControls.slice(4, 6).map((control) => (
          <ControlInput
            key={control.key}
            control={control}
            value={connection.props[control.key]}
            onChange={(value) => onConnectionChange(control.key, value as ConnectionProps[keyof ConnectionProps])}
          />
        ))}
      </section>
      <section className="control-group">
        <h3>Routing</h3>
        {connectionControls.slice(6).map((control) => (
          <ControlInput
            key={control.key}
            control={control}
            value={connection.props[control.key]}
            onChange={(value) => onConnectionChange(control.key, value as ConnectionProps[keyof ConnectionProps])}
          />
        ))}
      </section>
    </section>
  );
}
