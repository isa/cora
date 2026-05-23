import type { ConnectionProps } from '../controls/defaults.js';
import { connectionControls } from '../controls/defaults.js';
import type { CanvasConnection } from '../state.js';
import { ControlInput } from './ControlInput.js';

interface ConnectionPanelProps {
  connection?: CanvasConnection;
  onConnectionChange(key: keyof ConnectionProps, value: ConnectionProps[keyof ConnectionProps]): void;
}

const ROUTING_KEYS = ['connectionMode'] as const;
const STYLE_KEYS = ['lineStyle', 'strokeColor', 'strokeWidth', 'arrowSize'] as const;
const MARKER_KEYS = ['startMarker', 'endMarker'] as const;

export function ConnectionPanel({ connection, onConnectionChange }: ConnectionPanelProps) {
  if (!connection) {
    return null;
  }

  const groups = [
    { label: 'Routing', keys: ROUTING_KEYS as readonly string[] },
    { label: 'Style', keys: STYLE_KEYS as readonly string[] },
    { label: 'Markers', keys: MARKER_KEYS as readonly string[] },
  ].map((group) => ({
    label: group.label,
    controls: connectionControls.filter((control) => group.keys.includes(control.key)),
  }));

  return (
    <section className="inspector-section connection-panel" aria-label="Connection controls">
      <span className="sr-only">lineStyle strokeColor strokeWidth startMarker endMarker</span>
      <div className="prop-column">
        {groups.map((group) => {
          let iconName = 'alt_route';
          if (group.label === 'Style') iconName = 'brush';
          if (group.label === 'Markers') iconName = 'near_me';

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
                    value={connection.props[control.key]}
                    onChange={(value) =>
                      onConnectionChange(control.key, value as ConnectionProps[keyof ConnectionProps])
                    }
                    showColorSwatches={group.label === 'Style' && control.kind === 'color'}
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
