import { useState, type ReactNode } from 'react';

import type { WorkbenchState } from '../state.js';
import { selectCanvasItem } from '../state.js';
import { displayNameForComponent, displayNameForComponentLabel } from '../pack/displayNames.js';
import {
  displayNameForWorkspaceDiagram,
  folderPathForWorkspaceDiagram,
  groupWorkspaceDiagramsByFolder,
} from '../previewDevSave.js';

export interface CatalogItem {
  id: string;
  label: string;
  family: string;
}

interface CatalogSidebarProps {
  state: WorkbenchState;
  searchQuery?: string;
  sourceName?: string;
  activeDiagramPath?: string;
  fileMessage?: string;
  isSaving?: boolean;
  isWorkspacePickerOpen?: boolean;
  workspaceDiagrams?: string[];
  onWorkspaceDiagramPick?(path: string): void;
  onWorkspacePickerClose?(): void;
  onLoadClick?(): void;
  onSaveClick?(): void;
  onSelectItem?(selection: WorkbenchState['selected']): void;
  isOpen: boolean;
  onClose(): void;
}

export function catalogItems(state: WorkbenchState): CatalogItem[] {
  return [
    ...state.pack.components
      .filter((component) => component.id !== 'icon' && component.id !== 'labelIcon')
      .map((component) => ({
        id: component.id,
        label: displayNameForComponent(component.id),
        family: state.pack.families.find((item) => item.id === component.family)?.label ?? component.family,
      })),
    { id: 'group', label: displayNameForComponent('group'), family: 'Layout' },
  ];
}

export function filterComponents(state: WorkbenchState, query: string) {
  const needle = query.trim().toLowerCase();
  const items = catalogItems(state);
  if (!needle) {
    return items;
  }
  return items.filter((component) =>
    `${component.label} ${component.id} ${component.family}`.toLowerCase().includes(needle),
  );
}

export function CatalogSidebar({
  state,
  searchQuery = '',
  sourceName,
  activeDiagramPath,
  fileMessage,
  isSaving = false,
  isWorkspacePickerOpen = false,
  workspaceDiagrams = [],
  onWorkspaceDiagramPick,
  onWorkspacePickerClose,
  onLoadClick,
  onSaveClick,
  onSelectItem,
  isOpen,
  onClose,
}: CatalogSidebarProps) {
  const components = filterComponents(state, searchQuery);
  const [areLayersOpen, setAreLayersOpen] = useState(false);
  const [areComponentsOpen, setAreComponentsOpen] = useState(true);
  const diagramGroups = groupWorkspaceDiagramsByFolder(workspaceDiagrams);
  const activeFileName = sourceName ? displayNameForWorkspaceDiagram(sourceName) : null;
  const activeFolderPath = sourceName ? folderPathForWorkspaceDiagram(sourceName) : null;

  return (
    <aside className={`catalog-panel ${!isOpen ? 'collapsed' : ''}`} aria-label="Catalog">
      <header className="catalog-file-bar" aria-live="polite">
        <div
          className={`catalog-doc-strip${sourceName ? '' : ' catalog-doc-strip-unsaved'}${isWorkspacePickerOpen ? ' catalog-doc-strip-open' : ''}`}
        >
          <button
            type="button"
            className="catalog-doc-selector"
            onClick={onLoadClick}
            aria-label={sourceName ? `Open diagram, current: ${sourceName}` : 'Open diagram'}
            aria-expanded={isWorkspacePickerOpen}
            title={sourceName ?? 'Open diagram'}
          >
            <span className="material-symbols-outlined catalog-doc-icon" aria-hidden="true">
              {sourceName ? 'description' : 'note_add'}
            </span>
            <span className="catalog-doc-text">
              <span className="catalog-doc-name">
                {activeFileName ?? 'Unsaved canvas'}
              </span>
              {activeFolderPath ? (
                <span className="catalog-doc-folder">{activeFolderPath}</span>
              ) : null}
            </span>
            <span className="material-symbols-outlined catalog-doc-chevron" aria-hidden="true">
              expand_more
            </span>
          </button>
          <div className="catalog-doc-actions" role="toolbar" aria-label="Document actions">
            {isSaving ? (
              <span
                className="catalog-file-save-spinner"
                role="status"
                aria-label="Saving"
                title="Saving"
              />
            ) : null}
            <button
              type="button"
              className="catalog-doc-action"
              onClick={() => onSaveClick?.()}
              aria-label="Save YAML"
              title="Save YAML"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                save
              </span>
            </button>
            <span className="catalog-doc-actions-divider" aria-hidden="true" />
            <button
              type="button"
              className="catalog-doc-action"
              onClick={onClose}
              aria-label="Collapse Library"
              title="Collapse Library"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </div>
        {fileMessage ? <p className="catalog-file-status">{fileMessage}</p> : null}
        {isWorkspacePickerOpen ? (
          <div className="workspace-diagram-picker" role="dialog" aria-label="Open workspace diagram">
            <div className="workspace-diagram-picker-header">
              <span>Open diagram</span>
              <button
                type="button"
                className="catalog-doc-action"
                onClick={onWorkspacePickerClose}
                aria-label="Close diagram list"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            {workspaceDiagrams.length === 0 ? (
              <p className="catalog-empty">No YAML diagrams found in examples/.</p>
            ) : (
              <div className="workspace-diagram-groups">
                {diagramGroups.map((group) => (
                  <section key={group.folder || '__root'} className="workspace-diagram-group">
                    {group.folder ? (
                      <h3 className="workspace-diagram-group-label">{group.folder}</h3>
                    ) : null}
                    <ul className="workspace-diagram-list">
                      {group.paths.map((path) => {
                        const fileName = displayNameForWorkspaceDiagram(path);
                        const isActive = path === activeDiagramPath;
                        return (
                          <li key={path}>
                            <button
                              type="button"
                              className={
                                isActive
                                  ? 'workspace-diagram-item workspace-diagram-item-active'
                                  : 'workspace-diagram-item'
                              }
                              onClick={() => onWorkspaceDiagramPick?.(path)}
                              aria-current={isActive ? 'true' : undefined}
                              title={path}
                            >
                              <span className="workspace-diagram-item-icon" aria-hidden="true">
                                <span className="material-symbols-outlined">description</span>
                              </span>
                              <span className="workspace-diagram-item-copy">
                                <span className="workspace-diagram-item-name">{fileName}</span>
                              </span>
                              {isActive ? (
                                <span className="material-symbols-outlined workspace-diagram-item-check" aria-hidden="true">
                                  check
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </header>
      <section className={`sidebar-section layers-section ${!areLayersOpen ? 'collapsed' : ''}`} aria-label="Canvas layers">
        <button
          type="button"
          className="sidebar-section-header sidebar-section-toggle"
          aria-expanded={areLayersOpen}
          onClick={() => setAreLayersOpen((current) => !current)}
        >
          <span className="section-heading-main">
            <span className="material-symbols-outlined section-chevron" aria-hidden="true">
              expand_more
            </span>
            <h2>Layers</h2>
            <span className="count-circle">{state.nodes.length + state.groups.length}</span>
          </span>
        </button>
        {areLayersOpen ? (
          <div className="component-list layers-list" role="list" aria-label="Canvas nodes">
            {state.nodes.length === 0 && state.groups.length === 0 ? (
              <p className="catalog-empty">Drop components onto the canvas.</p>
            ) : null}
            {state.nodes.map((node) => {
              const definition = state.pack.components.find((component) => component.id === node.componentId);
              const label = displayNameForComponentLabel(definition?.label ?? node.componentId);
              const selected = state.selected?.kind === 'node' && state.selected.id === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={selected ? 'component-tile component-tile-selected' : 'component-tile'}
                  onClick={() => onSelectItem?.(selectCanvasItem(state, { kind: 'node', id: node.id }).selected)}
                >
                  <span className="material-symbols-outlined layer-chevron" aria-hidden="true">chevron_right</span>
                  <span className="component-icon" aria-hidden="true">{componentIcon(node.componentId)}</span>
                  <span className="component-copy">
                    <strong>{String(node.props.title ?? node.props.text ?? label)}</strong>
                  </span>
                </button>
              );
            })}
            {state.groups.map((group) => {
              const selected = state.selected?.kind === 'group' && state.selected.id === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  className={selected ? 'component-tile component-tile-selected' : 'component-tile'}
                  onClick={() => onSelectItem?.(selectCanvasItem(state, { kind: 'group', id: group.id }).selected)}
                >
                  <span className="material-symbols-outlined layer-chevron" aria-hidden="true">chevron_right</span>
                  <span className="component-icon" aria-hidden="true">{componentIcon('group')}</span>
                  <span className="component-copy">
                    <strong>{group.label}</strong>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
      <section className={`sidebar-section catalog-body ${!areComponentsOpen ? 'collapsed' : ''}`}>
        <button
          type="button"
          className="sidebar-section-header sidebar-section-toggle"
          aria-expanded={areComponentsOpen}
          onClick={() => setAreComponentsOpen((current) => !current)}
        >
          <span className="section-heading-main">
            <span className="material-symbols-outlined section-chevron" aria-hidden="true">
              expand_more
            </span>
            <h2>Components</h2>
            <span className="count-circle">{components.length}</span>
          </span>
        </button>
        {areComponentsOpen ? (
          <div className="component-grid" role="list" aria-label="Components">
            {components.length === 0 ? (
              <p className="catalog-empty">No matching components.</p>
            ) : null}
            {components.map((component) => (
              <button
                key={component.id}
                type="button"
                className="component-tile"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/x-cora-component', component.id);
                  event.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <span className="component-icon" aria-hidden="true">{componentIcon(component.id)}</span>
                <span className="component-copy">
                  <strong>{component.label}</strong>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </aside>
  );
}

function componentIcon(id: string): ReactNode {
  const icons: Record<string, string> = {
    analytics: 'monitoring',
    configuration: 'settings',
    cloud: 'cloud',
    archive: 'inventory_2',
    artificialIntelligence: 'psychology',
    multimedia: 'video_library',
    person: 'person',
    people: 'groups',
    api: 'deployed_code',
    app: 'apps',
    box: 'check_box_outline_blank',
    database: 'database',
    decision: 'call_split',
    document: 'description',
    group: 'workspaces',
    icon: 'category',
    label: 'title',
    labelIcon: 'label',
    website: 'web',
  };
  return <span className="material-symbols-outlined component-material-icon">{icons[id] ?? 'widgets'}</span>;
}
