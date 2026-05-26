import { useState } from 'react';

import { CatalogSidebar } from './components/CatalogSidebar.js';
import { ConnectionPanel } from './components/ConnectionPanel.js';
import { GroupPanel } from './components/GroupPanel.js';
import { NodePropPanel, visibleComponentLabel } from './components/NodePropPanel.js';
import { Select } from './components/ui/select.js';
import { WorkbenchCanvas } from './components/WorkbenchCanvas.js';
import type { ConnectionProps } from './controls/defaults.js';
import {
  clearCanvas,
  createDefaultWorkbenchState,
  deleteSelected,
  duplicateSelected,
  selectCanvasItem,
  updateGroup,
  updateConnectionProps,
  updateNodeProps,
} from './state.js';

function getContrastColor(hex: string): string {
  if (!hex || hex.startsWith('var')) return '#18181b';
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  if (color.length !== 6) return '#18181b';
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq > 180 ? '#854d0e' : hex;
}

export function App() {
  const [state, setState] = useState(createDefaultWorkbenchState);
  const [isCatalogOpen, setIsCatalogOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [componentSearch, setComponentSearch] = useState('');
  const [activeTheme, setActiveTheme] = useState<'default' | 'monochrome' | 'without-shadow'>('default');

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
    <div className="preview-app">
      <header className="preview-topbar">
        <label className="preview-search">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            type="search"
            value={componentSearch}
            placeholder="Search components..."
            onChange={(event) => {
              setComponentSearch(event.currentTarget.value);
              setIsCatalogOpen(true);
            }}
          />
        </label>
        <div className="preview-theme-selector">
          <span className="material-symbols-outlined" aria-hidden="true">
            palette
          </span>
          <Select
            value={activeTheme}
            onChange={(event) => setActiveTheme(event.currentTarget.value as any)}
            aria-label="Theme Selection"
          >
            <option value="default">Default Theme</option>
            <option value="monochrome">Monochrome</option>
            <option value="without-shadow">No Shadows</option>
          </Select>
        </div>
      </header>
      <WorkbenchCanvas
        state={state}
        onStateChange={setState}
        onClear={() => setState((current) => clearCanvas(current))}
        activeTheme={activeTheme}
      />
      <CatalogSidebar
        state={state}
        searchQuery={componentSearch}
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectItem={(selection) => {
          if (selection) {
            setState((current) => selectCanvasItem(current, selection));
          }
        }}
      />
      <aside
        className={`inspector-panel ${!isInspectorOpen ? 'collapsed' : ''}`}
        style={{
          '--inspector-theme-color': selectedNode?.props?.backgroundColor || selectedConnection?.props?.strokeColor || '#18181b',
          '--inspector-accent-color': getContrastColor(selectedNode?.props?.backgroundColor || selectedConnection?.props?.strokeColor || '#18181b'),
        } as React.CSSProperties}
        aria-label="Inspector"
      >
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={() => setIsInspectorOpen(false)}
          aria-label="Collapse Inspector"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="inspector-header">
          <div className="inspector-identity">
            <span className="inspector-icon-tile" aria-hidden="true">
              {selectedNode
                ? (state.pack.components.find((comp) => comp.id === selectedNode.componentId)?.label.charAt(0) ?? 'N')
                : selectedConnection
                ? '↔'
                : selectedGroup
                ? '□'
                : '∅'}
            </span>
            <div className="inspector-title-block">
              <p>Design</p>
              <div className="inspector-title-row">
                <h2>
                  {selectedNode
                    ? visibleComponentLabel(state.pack.components.find((comp) => comp.id === selectedNode.componentId)?.label ?? '')
                    : selectedConnection
                    ? 'Connection'
                    : selectedGroup
                    ? 'Group'
                    : 'No selection'}
                </h2>
                {hasSelection && (
                  <span className="inspector-pill">
                    {selectedNode ? 'Node' : selectedConnection ? 'Edge' : 'Group'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {!hasSelection ? (
          <section className="inspector-section inspector-empty" aria-label="Inspector">
            <p className="inspector-empty-hint">
              Pick a canvas item to edit its Content, Style, and Layout.
            </p>
          </section>
        ) : null}
        {selectedConnection ? (
          <ConnectionPanel
            connection={selectedConnection}
            onConnectionChange={(key: keyof ConnectionProps, value) =>
              setState((current) =>
                updateConnectionProps(current, selectedConnection.id, key, value),
              )
            }
          />
        ) : selectedGroup ? (
          <GroupPanel
            group={selectedGroup}
            onGroupChange={(patch) =>
              setState((current) => updateGroup(current, selectedGroup.id, patch))
            }
          />
        ) : selectedNode ? (
          <NodePropPanel
            state={state}
            nodeId={selectedNode.id}
            onPropChange={(nodeId, key, value) =>
              setState((current) => updateNodeProps(current, nodeId, key, value))
            }
          />
        ) : null}
      </aside>

      <div className={`canvas-actions-panel ${hasSelection ? 'visible' : ''} ${!isInspectorOpen ? 'inspector-collapsed' : ''}`}>
        <button
          type="button"
          className="preview-btn preview-btn-icon"
          disabled={!hasSelection}
          onClick={() => setState((current) => duplicateSelected(current))}
          title="Duplicate selected item"
          aria-label="Duplicate"
        >
          <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
        </button>
        <button
          type="button"
          className="preview-btn preview-btn-icon preview-btn-danger"
          disabled={!hasSelection}
          onClick={() => setState((current) => deleteSelected(current))}
          title="Delete selected item"
          aria-label="Delete"
        >
          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
        </button>
      </div>

      <button
        type="button"
        className={`sidebar-toggle-trigger left-trigger ${!isCatalogOpen ? 'visible' : ''}`}
        onClick={() => setIsCatalogOpen(true)}
        aria-label="Open Library"
      >
        <span className="material-symbols-outlined">widgets</span>
      </button>

      <button
        type="button"
        className={`sidebar-toggle-trigger right-trigger ${!isInspectorOpen ? 'visible' : ''}`}
        onClick={() => setIsInspectorOpen(true)}
        aria-label="Open Inspector"
      >
        <span className="material-symbols-outlined">tune</span>
      </button>
    </div>
  );
}
