import { useState } from 'react';

import { CatalogSidebar } from './components/CatalogSidebar.js';
import { ConnectionPanel } from './components/ConnectionPanel.js';
import { NodePropPanel } from './components/NodePropPanel.js';
import { WorkbenchCanvas } from './components/WorkbenchCanvas.js';
import type { ConnectionProps } from './controls/defaults.js';
import type { PreviewNodeRole, PreviewScenarioId } from './pack/types.js';
import {
  createDefaultWorkbenchState,
  selectPrimaryNode,
  selectSecondaryNode,
  switchScenario,
  updateConnectionProps,
  updateNodeProps,
} from './state.js';

export function App() {
  const [state, setState] = useState(createDefaultWorkbenchState);

  return (
    <main className="preview-shell">
      <CatalogSidebar
        state={state}
        onPrimaryChange={(componentId) => setState((current) => selectPrimaryNode(current, componentId))}
        onSecondaryChange={(componentId) => setState((current) => selectSecondaryNode(current, componentId))}
        onScenarioChange={(scenario: PreviewScenarioId) => setState((current) => switchScenario(current, scenario))}
      />
      <div className="workbench-column">
        <div className="empty-copy">
          <strong>Select a primary node</strong>
          <span>Pick a node from the built-in pack to start a preview scene.</span>
          <span>Choose a secondary node to inspect connection behavior.</span>
        </div>
        <WorkbenchCanvas state={state} onStateChange={setState} />
      </div>
      <aside className="inspector-panel" aria-label="Inspector">
        <NodePropPanel
          state={state}
          onPropChange={(role: PreviewNodeRole, key, value) => setState((current) => updateNodeProps(current, role, key, value))}
        />
        <ConnectionPanel
          state={state}
          onConnectionChange={(key: keyof ConnectionProps, value) => setState((current) => updateConnectionProps(current, key, value))}
        />
      </aside>
    </main>
  );
}
