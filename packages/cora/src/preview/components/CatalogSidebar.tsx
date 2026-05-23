import { type ReactNode } from 'react';

import type { WorkbenchState } from '../state.js';

export interface CatalogItem {
  id: string;
  label: string;
  family: string;
}

interface CatalogSidebarProps {
  state: WorkbenchState;
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

export function CatalogSidebar({ state }: CatalogSidebarProps) {
  const components = catalogItems(state);

  return (
    <aside className="catalog-panel" aria-label="Catalog">
      <header className="sidebar-header">
        <div>
          <h1>Cora</h1>
          <p>Library / Components</p>
        </div>
      </header>
      <div className="catalog-segments" aria-label="Catalog views">
        <span className="catalog-segment active">Lib</span>
        <span className="catalog-segment">Nodes</span>
      </div>
      <section className="sidebar-section">
        <h2>Diagram Elements</h2>
        <div className="component-list" role="list" aria-label="Components">
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
                <small>{component.family}</small>
              </span>
            </button>
          ))}
        </div>
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
  if (id === 'labelIcon' || id === 'icon') {
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
