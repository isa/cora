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
  getThemeFamily,
  listThemeFamilies,
  normalizeDiagramThemeName,
  resolveThemeIdForAppearance,
} from '../renderer/themes/registry.js';
import {
  buildSuggestedSaveName,
  grantWriteAccessAfterOpen,
  pickDiagramFile,
  pickSaveDiagramFile,
  shouldAutosaveWorkbenchYaml,
  writeYamlToFileHandle,
  type FilePickerWindow,
  type WritableFileHandle,
} from './fileAccess.js';
import {
  deserializeWorkbenchState,
  serializeWorkbenchYaml,
} from './persistence.js';
import {
  displayNameForWorkspaceDiagram,
  fetchPreviewServerConfig,
  fetchPreviewServerSource,
  fetchWorkspaceDiagrams,
  getPreviewWorkspace,
  saveYamlViaPreviewServer,
} from './previewDevSave.js';

const AUTOSAVE_DEBOUNCE_MS = 400;
const AUTOSAVE_INTERVAL_MS = 2000;

function getContrastColor(hex: string, isDark: boolean): string {
  if (!hex || hex.startsWith('var')) return isDark ? '#ffffff' : '#18181b';
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  if (color.length !== 6) return isDark ? '#ffffff' : '#18181b';
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  if (isDark) {
    return yiq < 60 ? '#ffffff' : hex;
  }
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
  const [loadTrigger, setLoadTrigger] = useState<number | undefined>(undefined);
  const [isCatalogOpen, setIsCatalogOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [componentSearch, setComponentSearch] = useState('');
  const [isIconSearchLoading, setIsIconSearchLoading] = useState(false);
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('cora-ui-theme') ?? localStorage.getItem('cora-active-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const themeFamilies = listThemeFamilies();
  const activeThemeFamily = getThemeFamily(normalizeDiagramThemeName(state.diagramTheme));

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cora-ui-theme', uiTheme);
    }
    if (typeof document !== 'undefined') {
      if (uiTheme === 'dark') {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
  }, [uiTheme]);

  useEffect(() => {
    setState((current) => {
      const nextTheme = resolveThemeIdForAppearance(current.diagramTheme, uiTheme);
      if (nextTheme === normalizeDiagramThemeName(current.diagramTheme)) {
        return current;
      }
      return { ...current, diagramTheme: nextTheme };
    });
  }, [uiTheme]);

  const [fileMessage, setFileMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isWorkspacePickerOpen, setIsWorkspacePickerOpen] = useState(false);
  const [workspaceDiagrams, setWorkspaceDiagrams] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  const sourceFileHandleRef = useRef<WritableFileHandle | null>(null);
  const usesPreviewServerSaveRef = useRef(Boolean(getPreviewWorkspace()));
  const activeWorkspaceDiagramPathRef = useRef<string | null>(null);
  const lastSavedYamlRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const initialServerLoadDoneRef = useRef(false);

  const hasAutosaveTarget = () => {
    if (usesPreviewServerSaveRef.current) {
      return Boolean(activeWorkspaceDiagramPathRef.current);
    }
    return Boolean(stateRef.current.sourceName && sourceFileHandleRef.current);
  };

  stateRef.current = state;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isWorkspacePickerOpen) {
          event.preventDefault();
          setIsWorkspacePickerOpen(false);
          return;
        }
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
  }, [componentSearch, state.selected, isWorkspacePickerOpen]);

  useEffect(() => {
    if (!fileMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setFileMessage(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [fileMessage]);

  const clearAutosaveTimer = () => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  };

  const bindLoadedDocument = (
    loadedState: typeof state,
    options?: {
      handle?: WritableFileHandle | null;
      usePreviewServerSave?: boolean;
      workspaceDiagramPath?: string | null;
    },
  ) => {
    const yaml = serializeWorkbenchYaml(loadedState);
    lastSavedYamlRef.current = yaml;
    if (options?.usePreviewServerSave !== undefined) {
      usesPreviewServerSaveRef.current = options.usePreviewServerSave;
    } else if (options?.handle !== undefined) {
      usesPreviewServerSaveRef.current = false;
    }
    if (options?.workspaceDiagramPath !== undefined) {
      activeWorkspaceDiagramPathRef.current = options.workspaceDiagramPath;
    }
    sourceFileHandleRef.current = options?.handle ?? null;
    setState(loadedState);
    setLoadTrigger((prev) => (prev ?? 0) + 1);
  };

  const persistYaml = async (
    yaml: string,
    options?: { handle?: WritableFileHandle | null; savedName?: string },
  ): Promise<boolean> => {
    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
      if (usesPreviewServerSaveRef.current) {
        const diagramPath = activeWorkspaceDiagramPathRef.current;
        if (!diagramPath) {
          return false;
        }
        const saved = await saveYamlViaPreviewServer(diagramPath, yaml);
        lastSavedYamlRef.current = yaml;
        const label = saved.path;
        if (label !== stateRef.current.sourceName) {
          setState((current) => ({ ...current, sourceName: label }));
        }
        return true;
      }

      const handle = options?.handle ?? sourceFileHandleRef.current;
      if (!handle) {
        return false;
      }

      await writeYamlToFileHandle(handle, yaml);
      lastSavedYamlRef.current = yaml;
      const savedName = options?.savedName ?? handle.name;
      if (savedName && savedName !== stateRef.current.sourceName) {
        setState((current) => ({ ...current, sourceName: savedName }));
      }
      return true;
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const scheduleAutosave = () => {
    if (!hasAutosaveTarget()) {
      return;
    }

    clearAutosaveTimer();
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void flushAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const flushAutosave = async () => {
    if (!hasAutosaveTarget()) {
      return;
    }

    const yaml = serializeWorkbenchYaml(stateRef.current);
    if (!shouldAutosaveWorkbenchYaml(yaml, lastSavedYamlRef.current)) {
      return;
    }

    if (saveInFlightRef.current) {
      return;
    }

    try {
      await persistYaml(yaml);
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : 'Could not save file.');
      return;
    }

    const latestYaml = serializeWorkbenchYaml(stateRef.current);
    if (shouldAutosaveWorkbenchYaml(latestYaml, lastSavedYamlRef.current)) {
      scheduleAutosave();
    }
  };

  const workbenchDocumentYaml = serializeWorkbenchYaml(state);

  useEffect(() => {
    if (!hasAutosaveTarget()) {
      return;
    }
    if (!shouldAutosaveWorkbenchYaml(workbenchDocumentYaml, lastSavedYamlRef.current)) {
      return;
    }

    scheduleAutosave();
    return clearAutosaveTimer;
  }, [workbenchDocumentYaml, state.sourceName]);

  const loadWorkspaceDiagram = async (diagramPath: string) => {
    const source = await fetchPreviewServerSource(diagramPath);
    const result = await deserializeWorkbenchState(
      displayNameForWorkspaceDiagram(source.path),
      source.content,
    );
    if ('errors' in result) {
      const first = result.errors[0];
      setFileMessage(first ? `${first.code}: ${first.message}` : 'Could not load file.');
      return;
    }

    bindLoadedDocument(
      { ...result.state, sourceName: source.path },
      { usePreviewServerSave: true, workspaceDiagramPath: source.path },
    );
    setIsWorkspacePickerOpen(false);
  };

  useEffect(() => {
    if (initialServerLoadDoneRef.current || !getPreviewWorkspace()) {
      return;
    }
    initialServerLoadDoneRef.current = true;

    void (async () => {
      try {
        const config = await fetchPreviewServerConfig();
        if (!config?.openPath) {
          return;
        }
        await loadWorkspaceDiagram(config.openPath);
      } catch (error) {
        setFileMessage(error instanceof Error ? error.message : 'Could not load file.');
      }
    })();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!hasAutosaveTarget()) {
        return;
      }
      const yaml = serializeWorkbenchYaml(stateRef.current);
      if (!shouldAutosaveWorkbenchYaml(yaml, lastSavedYamlRef.current)) {
        return;
      }
      if (saveInFlightRef.current) {
        return;
      }
      void flushAutosave();
    }, AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => clearAutosaveTimer(), []);

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

      bindLoadedDocument(result.state, {
        handle: null,
        usePreviewServerSave: false,
        workspaceDiagramPath: null,
      });
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : 'Could not load file.');
    }
  };

  const handleLoadClick = async () => {
    if (getPreviewWorkspace()) {
      try {
        const paths = await fetchWorkspaceDiagrams();
        setWorkspaceDiagrams(paths);
        setIsWorkspacePickerOpen(true);
        setIsCatalogOpen(true);
      } catch (error) {
        setFileMessage(error instanceof Error ? error.message : 'Could not list workspace files.');
      }
      return;
    }

    try {
      const pickerWindow = window as FilePickerWindow;
      const picked = await pickDiagramFile(pickerWindow);
      if (picked) {
        const canWrite = await grantWriteAccessAfterOpen(picked.handle);
        const content = await picked.file.text();
        const result = await deserializeWorkbenchState(picked.file.name, content);
        if ('errors' in result) {
          const first = result.errors[0];
          setFileMessage(first ? `${first.code}: ${first.message}` : 'Could not load file.');
          return;
        }

        bindLoadedDocument(result.state, {
          handle: canWrite ? picked.handle : null,
          usePreviewServerSave: false,
          workspaceDiagramPath: null,
        });
        return;
      }

      fileInputRef.current?.click();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setFileMessage(error instanceof Error ? error.message : 'Could not load file.');
    }
  };

  const handleSave = async () => {
    clearAutosaveTimer();
    const yaml = serializeWorkbenchYaml(state);
    const suggestedName = buildSuggestedSaveName(state.sourceName);

    try {
      if (usesPreviewServerSaveRef.current || sourceFileHandleRef.current) {
        await persistYaml(yaml);
        setFileMessage(`Saved ${state.sourceName ?? suggestedName}`);
        return;
      }

      const pickerWindow = window as FilePickerWindow;
      const handle = await pickSaveDiagramFile(pickerWindow, suggestedName);
      if (handle) {
        await persistYaml(yaml, { handle, savedName: handle.name ?? suggestedName });
        sourceFileHandleRef.current = handle;
        setFileMessage(`Saved ${handle.name ?? suggestedName}`);
        return;
      }

      const blob = new Blob([yaml], { type: 'application/x-yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = suggestedName;
      anchor.click();
      URL.revokeObjectURL(url);
      lastSavedYamlRef.current = yaml;
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
        <div className="preview-diagram-theme-selector">
          <span className="material-symbols-outlined" aria-hidden="true">
            palette
          </span>
          <Select
            value={activeThemeFamily}
            onChange={(event) => {
              const family = event.currentTarget.value;
              setState((current) => ({
                ...current,
                diagramTheme: resolveThemeIdForAppearance(`${family}-light`, uiTheme),
              }));
            }}
            aria-label="Diagram theme"
          >
            {themeFamilies.map((theme) => (
              <option key={theme.family} value={theme.family}>
                {theme.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="preview-ui-theme-toggle" role="group" aria-label="Preview appearance">
          <button
            type="button"
            className={`preview-theme-toggle-btn ${uiTheme === 'light' ? 'active' : ''}`}
            aria-label="Light preview UI"
            aria-pressed={uiTheme === 'light'}
            onClick={() => setUiTheme('light')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              light_mode
            </span>
          </button>
          <button
            type="button"
            className={`preview-theme-toggle-btn ${uiTheme === 'dark' ? 'active' : ''}`}
            aria-label="Dark preview UI"
            aria-pressed={uiTheme === 'dark'}
            onClick={() => setUiTheme('dark')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              dark_mode
            </span>
          </button>
        </div>
      </header>
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
      <WorkbenchCanvas
        state={state}
        onStateChange={setState}
        onClear={() => setState((current) => clearCanvas(current))}
        onIconDrop={() => {
          setComponentSearch('');
          setIsIconSearchLoading(false);
        }}
        loadTrigger={loadTrigger}
        isCatalogOpen={isCatalogOpen}
        isInspectorOpen={isInspectorOpen}
      />
      <CatalogSidebar
        state={state}
        searchQuery={componentSearch}
        sourceName={state.sourceName}
        activeDiagramPath={
          state.sourceName?.includes('/') ? state.sourceName : undefined
        }
        fileMessage={fileMessage}
        isSaving={isSaving}
        isWorkspacePickerOpen={isWorkspacePickerOpen}
        workspaceDiagrams={workspaceDiagrams}
        onWorkspaceDiagramPick={(path) => {
          void loadWorkspaceDiagram(path).catch((error) => {
            setFileMessage(error instanceof Error ? error.message : 'Could not load file.');
          });
        }}
        onWorkspacePickerClose={() => setIsWorkspacePickerOpen(false)}
        onLoadClick={() => void handleLoadClick()}
        onSaveClick={() => void handleSave()}
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
          '--inspector-theme-color': selectedNode?.props?.backgroundColor || selectedConnection?.props?.strokeColor || (uiTheme === 'dark' ? '#1f1f23' : '#18181b'),
          '--inspector-accent-color': getContrastColor(selectedNode?.props?.backgroundColor || selectedConnection?.props?.strokeColor || (uiTheme === 'dark' ? '#ffffff' : '#18181b'), uiTheme === 'dark'),
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
