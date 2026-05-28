import { useEffect, useRef, useState } from 'react';

import './registerElkWorker.js';
import { CatalogSidebar } from './components/CatalogSidebar.js';
import { ConnectionPanel } from './components/ConnectionPanel.js';
import { GroupPanel } from './components/GroupPanel.js';
import { IconSearchDropdown } from './components/IconSearchDropdown.js';
import { MultiNodePanel, NodePropPanel, visibleComponentLabel } from './components/NodePropPanel.js';
import { Select } from './components/ui/select.js';
import { WorkbenchCanvas } from './components/WorkbenchCanvas.js';
import type { ConnectionProps } from './controls/defaults.js';
import {
  clearCanvas,
  clearSelection,
  createDefaultWorkbenchState,
  deleteSelected,
  duplicateSelected,
  selectCanvasItem,
  updateGroup,
  updateConnectionProps,
  updateNodeProps,
  updateNodesProps,
} from './state.js';
import {
  deserializeWorkbenchState,
  serializeWorkbenchYaml,
} from './persistence.js';

type SaveFilePickerHandle = {
  name?: string;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
};

type WindowWithSavePicker = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFilePickerHandle>;
};

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

export function shouldFocusSearchFromShortcut(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'target'>): boolean {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }

  const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
  const tagName = target?.tagName?.toLowerCase();
  return !(tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target?.isContentEditable);
}

export function App() {
  const [state, setState] = useState(createDefaultWorkbenchState);
  const [isCatalogOpen, setIsCatalogOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [componentSearch, setComponentSearch] = useState('');
  const [isIconSearchLoading, setIsIconSearchLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState<'default' | 'monochrome' | 'without-shadow'>('default');
  const [fileMessage, setFileMessage] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (componentSearch.trim()) {
          event.preventDefault();
          setComponentSearch('');
          setIsIconSearchLoading(false);
          return;
        }
        if (state.selected) {
          event.preventDefault();
          setState((current) => clearSelection(current));
          return;
        }
      }

      if (!shouldFocusSearchFromShortcut(event)) {
        return;
      }
      event.preventDefault();
      setIsCatalogOpen(true);
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [componentSearch, state.selected]);

  useEffect(() => {
    if (!fileMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setFileMessage(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [fileMessage]);

  const handleLoadFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const result = await deserializeWorkbenchState(file.name, content);
      if ('errors' in result) {
        const first = result.errors[0];
        setFileMessage(first ? `${first.code}: ${first.message}` : 'Could not load file.');
        return;
      }

      setState(result.state);
      setFileMessage(`Loaded ${file.name}`);
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : 'Could not load file.');
    }
  };

  const handleSave = async () => {
    const yaml = serializeWorkbenchYaml(state);
    const suggestedName = state.sourceName?.replace(/\.(json|yaml|yml)$/i, '.yml') || 'diagram.yml';

    try {
      const pickerWindow = window as WindowWithSavePicker;
      if (typeof pickerWindow.showSaveFilePicker === 'function') {
        const handle = await pickerWindow.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'YAML diagram',
              accept: { 'application/x-yaml': ['.yml', '.yaml'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(yaml);
        await writable.close();
        const savedName = handle.name ?? suggestedName;
        setState((current) => ({ ...current, sourceName: savedName }));
        setFileMessage(`Saved ${savedName}`);
        return;
      }

      const blob = new Blob([yaml], { type: 'application/x-yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = suggestedName;
      anchor.click();
      URL.revokeObjectURL(url);
      setState((current) => ({ ...current, sourceName: suggestedName }));
      setFileMessage(`Downloaded ${suggestedName}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setFileMessage(error instanceof Error ? error.message : 'Could not save file.');
    }
  };

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
  const selectedItemCount =
    state.selectedNodeIds.length + state.selectedConnectionIds.length + state.selectedGroupIds.length;
  const isMultiSelect = selectedItemCount > 1;
  const isMultiNodesOnly =
    isMultiSelect && state.selectedConnectionIds.length === 0 && state.selectedGroupIds.length === 0;
  const hasSelection = selectedItemCount > 0;

  return (
    <div className="preview-app">
      <header className="preview-topbar">
        <label className="preview-search">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            ref={searchInputRef}
            type="search"
            value={componentSearch}
            placeholder="Search components and icons..."
            onChange={(event) => {
              const nextSearch = event.currentTarget.value;
              setComponentSearch(nextSearch);
              setIsIconSearchLoading(nextSearch.trim().length > 0);
              setIsCatalogOpen(true);
            }}
          />
          {isIconSearchLoading ? <span className="preview-search-spinner" aria-hidden="true" /> : null}
          <IconSearchDropdown
            query={componentSearch}
            visible={componentSearch.trim().length > 0}
            onLoadingChange={setIsIconSearchLoading}
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
        <button
          type="button"
          className="preview-header-action"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">folder_open</span>
          Load YML
        </button>
        <button
          type="button"
          className="preview-header-action"
          onClick={() => void handleSave()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">save</span>
          Save YML
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yml,.yaml,.json,application/x-yaml,application/json"
          hidden
          onChange={(event) => {
            void handleLoadFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <div className="preview-theme-selector" aria-live="polite">
          <span className="material-symbols-outlined" aria-hidden="true">description</span>
          <span>{state.sourceName ?? 'Unsaved canvas'}</span>
          {fileMessage ? <span className="preview-file-message">{fileMessage}</span> : null}
        </div>
      </header>
      <WorkbenchCanvas
        state={state}
        onStateChange={setState}
        onClear={() => setState((current) => clearCanvas(current))}
        onIconDrop={() => {
          setComponentSearch('');
          setIsIconSearchLoading(false);
        }}
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
        {isMultiSelect ? (
          isMultiNodesOnly ? (
            <MultiNodePanel
              state={state}
              nodeIds={state.selectedNodeIds}
              onPropChange={(key, value) =>
                setState((current) => updateNodesProps(current, current.selectedNodeIds, key, value))
              }
            />
          ) : (
            <section className="inspector-section" aria-label="Inspector controls">
              <p className="inspector-multi-hint">{selectedItemCount} items selected</p>
              <p className="inspector-tab-empty">No shared attributes.</p>
            </section>
          )
        ) : selectedConnection ? (
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
