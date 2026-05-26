import { useState, type ReactNode } from 'react';

import { displayNameForComponent, layerNodeTitle } from '../pack/displayNames.js';
import { catalogItems } from '../pack/catalogItems.js';
import type { WorkbenchState } from '../state.js';

interface CatalogSidebarProps {
  state: WorkbenchState;
  onSelectItem?(selection: WorkbenchState['selected']): void;
  isOpen: boolean;
  onClose(): void;
}

export function CatalogSidebar({
  state,
  onSelectItem,
  isOpen,
  onClose,
}: CatalogSidebarProps) {
  const [areLayersOpen, setAreLayersOpen] = useState(true);
  const [areComponentsOpen, setAreComponentsOpen] = useState(true);
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
              const selected = state.selected?.kind === 'node' && state.selected.id === node.id;
              const title = layerNodeTitle(node.componentId, node.props);
              return (
                <button
                  key={node.id}
                  type="button"
                  role="listitem"
                  className={selected ? 'component-tile component-tile-selected' : 'component-tile'}
                  onClick={() => onSelectItem?.({ kind: 'node', id: node.id })}
                >
                  <span className="component-icon" aria-hidden="true">
                    {componentIcon(node.componentId)}
                  </span>
                  <span className="component-copy">
                    <strong>{title}</strong>
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
                  role="listitem"
                  className={selected ? 'component-tile component-tile-selected' : 'component-tile'}
                  onClick={() => onSelectItem?.({ kind: 'group', id: group.id })}
                >
                  <span className="component-icon" aria-hidden="true">
                    {componentIcon('group')}
                  </span>
                  <span className="component-copy">
                    <strong>{group.label?.trim() || 'Group'}</strong>
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
            {components.map((component) => (
              <button
                key={component.id}
                type="button"
                className="component-tile"
                draggable
                onDragStart={(event) => {
                  if (component.provider && component.service) {
                    event.dataTransfer.setData(
                      'application/x-cora-icon',
                      JSON.stringify({ provider: component.provider, service: component.service }),
                    );
                  } else {
                    event.dataTransfer.setData('application/x-cora-component', component.id);
                  }
                  event.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <span className="component-icon" aria-hidden="true">
                  {component.provider && component.service ? (
                    <img
                      src={`/icon-packs/${component.provider}/icons/${component.service}.svg`}
                      alt=""
                      className="component-icon-img"
                      loading="lazy"
                    />
                  ) : componentIcon(component.id)}
                </span>
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
  const icon = componentLibraryIcon(id);
  if (icon) {
    return (
      <img
        src={`/icon-packs/${icon.provider}/icons/${icon.service}.svg`}
        alt=""
        className="component-library-icon-img"
        loading="lazy"
      />
    );
  }

  return <span className="catalog-icon-shape catalog-icon-box" />;
}

function componentLibraryIcon(id: string): { provider: string; service: string } | undefined {
  const icons: Record<string, { provider: string; service: string }> = {
    box: { provider: 'default', service: 'check-box-outline-blank' },
    label: { provider: 'default', service: 'title' },
    icon: { provider: 'default', service: 'category' },
    labelIcon: { provider: 'default', service: 'label' },
    website: { provider: 'default', service: 'web' },
    page: { provider: 'default', service: 'article' },
    app: { provider: 'default', service: 'apps' },
    group: { provider: 'default', service: 'workspaces' },
  };
  return icons[id];
}
