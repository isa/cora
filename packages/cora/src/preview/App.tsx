import { useState } from 'react';

import { CatalogSidebar } from './components/CatalogSidebar.js';
import { ConnectionPanel } from './components/ConnectionPanel.js';
import { GroupPanel } from './components/GroupPanel.js';
import { NodePropPanel } from './components/NodePropPanel.js';
import { WorkbenchCanvas } from './components/WorkbenchCanvas.js';
import type { ConnectionProps } from './controls/defaults.js';
import {
  createDefaultWorkbenchState,
  updateGroup,
  updateConnectionProps,
  updateNodeProps,
} from './state.js';

export function App() {
  const [state, setState] = useState(createDefaultWorkbenchState);
  const selectedNode =
    state.selected?.kind === 'node'
      ? state.nodes.find((node) => node.id === state.selected?.id)
      : undefined;
  const selectedConnection =
    state.selected?.kind === 'connection'
      ? state.connections.find((connection) => connection.id === state.selected?.id)
      : undefined;
  const selectedGroup =
    state.selected?.kind === 'group'
      ? state.groups.find((group) => group.id === state.selected?.id)
      : undefined;
  const hasSelection = Boolean(selectedNode || selectedConnection || selectedGroup);

  return (
    <main className="preview-shell">
      <CatalogSidebar state={state} />
      <div className="workbench-column">
        <div className="empty-copy">
          <span>Drag components here</span>
        </div>
        <WorkbenchCanvas state={state} onStateChange={setState} />
      </div>
      <aside className="inspector-panel" aria-label="Inspector">
        {!hasSelection ? (
          <>
            <header className="sidebar-header inspector-header">
              <div>
                <p>Inspector / Attributes</p>
                <h1>No Selection</h1>
              </div>
            </header>
            <div className="inspector-tabs" aria-label="Inspector sections">
              <span className="inspector-tab active">Inspector</span>
              <span className="inspector-tab">Style</span>
            </div>
          </>
        ) : null}
        {selectedConnection ? (
          <ConnectionPanel
            connection={selectedConnection}
            onConnectionChange={(key: keyof ConnectionProps, value) =>
              setState((current) => updateConnectionProps(current, selectedConnection.id, key, value))
            }
          />
        ) : selectedGroup ? (
          <GroupPanel
            group={selectedGroup}
            onGroupChange={(patch) =>
              setState((current) => updateGroup(current, selectedGroup.id, patch))
            }
          />
        ) : (
          <NodePropPanel
            state={state}
            nodeId={selectedNode?.id}
            onPropChange={(nodeId, key, value) =>
              setState((current) => updateNodeProps(current, nodeId, key, value))
            }
          />
        )}
      </aside>
    </main>
  );
}
