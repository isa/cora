import type { PreviewScenarioId } from '../pack/types.js';
import type { WorkbenchState } from '../state.js';

interface CatalogSidebarProps {
  state: WorkbenchState;
  onPrimaryChange(componentId: string): void;
  onSecondaryChange(componentId: string): void;
  onScenarioChange(scenario: PreviewScenarioId): void;
}

export function CatalogSidebar({
  state,
  onPrimaryChange,
  onSecondaryChange,
  onScenarioChange,
}: CatalogSidebarProps) {
  return (
    <aside className="catalog-panel" aria-label="Catalog">
      <div className="panel-title">built-ins</div>
      <label className="field">
        <span>Search</span>
        <input type="search" placeholder="Filter components" aria-label="Search components" />
      </label>
      <label className="field">
        <span>Primary node</span>
        <select
          value={state.primary.componentId}
          onChange={(event) => onPrimaryChange(event.currentTarget.value)}
        >
          {state.pack.components.map((component) => (
            <option key={component.id} value={component.id}>
              {component.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Secondary node</span>
        <select
          value={state.secondary.componentId}
          onChange={(event) => onSecondaryChange(event.currentTarget.value)}
        >
          {state.pack.components.map((component) => (
            <option key={component.id} value={component.id}>
              {component.label}
            </option>
          ))}
        </select>
      </label>
      <div className="scenario-list" role="group" aria-label="Scenarios">
        {state.pack.scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            className={scenario.id === state.scenario ? 'scenario-button active' : 'scenario-button'}
            onClick={() => onScenarioChange(scenario.id)}
          >
            {scenario.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
