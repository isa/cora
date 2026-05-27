import { useState, type ReactNode } from 'react';

import type { WorkbenchState } from '../state.js';
import { selectCanvasItem } from '../state.js';
import { displayNameForComponent, displayNameForComponentLabel } from '../pack/displayNames.js';

export interface CatalogItem {
  id: string;
  label: string;
  family: string;
}

interface CatalogSidebarProps {
  state: WorkbenchState;
  searchQuery?: string;
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

export function CatalogSidebar({ state, searchQuery = '', onSelectItem, isOpen, onClose }: CatalogSidebarProps) {
  const components = filterComponents(state, searchQuery);
  const [areLayersOpen, setAreLayersOpen] = useState(false);
  const [areComponentsOpen, setAreComponentsOpen] = useState(true);

  return (
    <aside className={`catalog-panel ${!isOpen ? 'collapsed' : ''}`} aria-label="Catalog">
      <button
        type="button"
        className="sidebar-close-btn"
        onClick={onClose}
        aria-label="Collapse Library"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
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
    app: 'apps',
    box: 'check_box_outline_blank',
    document: 'description',
    group: 'workspaces',
    icon: 'category',
    label: 'title',
    labelIcon: 'label',
    website: 'web',
  };
  return <span className="material-symbols-outlined component-material-icon">{icons[id] ?? 'widgets'}</span>;
}
