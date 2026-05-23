import { useState, type ReactNode } from 'react';

import type { WorkbenchState } from '../state.js';
import { selectCanvasItem } from '../state.js';

export interface CatalogItem {
  id: string;
  label: string;
  family: string;
}

interface CatalogSidebarProps {
  state: WorkbenchState;
  onSelectItem?(selection: WorkbenchState['selected']): void;
  isOpen: boolean;
  onClose(): void;
}

export function catalogItems(state: WorkbenchState): CatalogItem[] {
  return [
    ...state.pack.components
      .filter((component) => component.id !== 'shape')
      .map((component) => ({
        id: component.id,
        label: component.label,
        family: state.pack.families.find((item) => item.id === component.family)?.label ?? component.family,
      })),
    { id: 'group', label: 'Group', family: 'Layout' },
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

type CatalogView = 'lib' | 'nodes';

export function CatalogSidebar({ state, onSelectItem, isOpen, onClose }: CatalogSidebarProps) {
  const [view, setView] = useState<CatalogView>('lib');
  const components = catalogItems(state);

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
      <header className="sidebar-header">
        <div>
          <h1>Cora</h1>
          <p>Library / Components</p>
        </div>
      </header>
      <div className="sidebar-tabbar" role="tablist" aria-label="Catalog views">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'lib'}
          className={view === 'lib' ? 'sidebar-tab active' : 'sidebar-tab'}
          onClick={() => setView('lib')}
        >
          <span className="sidebar-tab-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="8" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          Lib
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'nodes'}
          className={view === 'nodes' ? 'sidebar-tab active' : 'sidebar-tab'}
          onClick={() => setView('nodes')}
        >
          <span className="sidebar-tab-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="3.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="10.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 7h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          Nodes
        </button>
      </div>
      <section className="sidebar-section catalog-body">
        {view === 'lib' ? (
          <details open className="control-group-details">
            <summary className="control-group-summary">
              <div className="summary-title-row">
                <span className="material-symbols-outlined group-icon" aria-hidden="true">
                  category
                </span>
                <h3>Diagram Elements</h3>
              </div>
              <span className="material-symbols-outlined chevron-icon" aria-hidden="true">
                expand_more
              </span>
            </summary>
            <div style={{ padding: '8px 0' }}>
              <div className="component-grid" role="list" aria-label="Components">
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
                      <strong>{visibleComponentLabel(component.label)}</strong>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </details>
        ) : (
          <details open className="control-group-details">
            <summary className="control-group-summary">
              <div className="summary-title-row">
                <span className="material-symbols-outlined group-icon" aria-hidden="true">
                  layers
                </span>
                <h3>Canvas Nodes</h3>
              </div>
              <span className="material-symbols-outlined chevron-icon" aria-hidden="true">
                expand_more
              </span>
            </summary>
            <div style={{ padding: '8px 0' }}>
              <div className="component-list" role="list" aria-label="Canvas nodes">
                {state.nodes.length === 0 && state.groups.length === 0 ? (
                  <p className="catalog-empty">No nodes on canvas yet.</p>
                ) : null}
                {state.nodes.map((node) => {
                  const definition = state.pack.components.find((component) => component.id === node.componentId);
                  const label = visibleComponentLabel(definition?.label ?? node.componentId);
                  const selected = state.selected?.kind === 'node' && state.selected.id === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={selected ? 'component-tile component-tile-selected' : 'component-tile'}
                      onClick={() => onSelectItem?.(selectCanvasItem(state, { kind: 'node', id: node.id }).selected)}
                    >
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
                      <span className="component-icon" aria-hidden="true">{componentIcon('group')}</span>
                      <span className="component-copy">
                        <strong>{group.label}</strong>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </details>
        )}
      </section>
    </aside>
  );
}

function visibleComponentLabel(label: string): string {
  const labels: Record<string, string> = {
    BoxNode: 'Process Box',
    LabelNode: 'Text Label',
    IconNode: 'Start/End Terminal',
    LabelIconNode: 'Data Input',
    DecisionNode: 'Decision Diamond',
    Group: 'Subroutine',
  };
  return labels[label] ?? (label.endsWith('Node') ? label.slice(0, -4) : label);
}

function componentIcon(id: string): ReactNode {
  if (id === 'group') {
    return <span className="catalog-icon-shape catalog-icon-group" />;
  }
  if (id === 'decision') {
    return <span className="catalog-icon-shape catalog-icon-diamond" />;
  }
  if (id === 'labelIcon') {
    return <span className="catalog-icon-shape catalog-icon-brackets">{'{ }'}</span>;
  }
  if (id === 'icon') {
    return <span className="catalog-icon-shape catalog-icon-circle" />;
  }
  if (id === 'website' || id === 'page' || id === 'app') {
    return <span className="catalog-icon-shape catalog-icon-window" />;
  }
  if (id === 'label') {
    return <span className="catalog-icon-shape catalog-icon-label">T</span>;
  }
  if (id === 'issue') {
    return <span className="catalog-icon-shape catalog-icon-issue">!</span>;
  }
  return <span className="catalog-icon-shape catalog-icon-box" />;
}
