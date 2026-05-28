import type { WorkbenchState } from '../state.js';
import type { PreviewNodeProps } from '../controls/defaults.js';
import type { ControlDefinition } from '../controls/schema.js';
import { displayNameForComponentLabel } from '../pack/displayNames.js';
import { ControlInput } from './ControlInput.js';

interface NodePropPanelProps {
  state: WorkbenchState;
  nodeId?: string;
  onPropChange(nodeId: string, key: string, value: unknown): void;
}

type SectionLayout = { label: string; icon: string; rows: string[][] };

// Declarative inspector layout. Each row holds 1-2 control keys; a 2-key row
// renders the controls side-by-side so related attributes (e.g. title text with
// its colour and size) sit together instead of each on its own line. Keys the
// component doesn't expose are dropped; empty rows and empty sections are omitted.
const SECTION_LAYOUT: SectionLayout[] = [
  {
    label: 'Content',
    icon: 'edit',
    rows: [
      ['iconName'],
      ['iconColor'],
      ['title'],
      ['textColor', 'titleFontSize', 'titleBold'],
      ['subtitle'],
      ['subtitleColor', 'subtitleFontSize', 'subtitleBold'],
      ['text'],
      ['iconType'],
    ],
  },
  {
    label: 'Style',
    icon: 'palette',
    rows: [
      ['backgroundColor'],
      ['skeletonColor'],
      ['shadow'],
      ['shadowColor'],
    ],
  },
  {
    label: 'Layout',
    icon: 'grid_view',
    rows: [
      ['radius'],
      ['borderStyle'],
      ['borderColor', 'borderWidth'],
    ],
  },
];

type Control = ControlDefinition<PreviewNodeProps>;
type ControlRow = Control[];

// Column sizing for a paired row: colours need room for the swatch + hex, number
// fields stay snug, and the bold "B" toggle hugs its button.
function columnWidth(control: Control): string {
  if (control.kind === 'bold') return 'auto';
  if (control.kind === 'color') return 'minmax(0, 1.25fr)';
  if (control.kind === 'number') return 'minmax(0, 0.75fr)';
  return 'minmax(0, 1fr)';
}

function buildSections(controls: Control[]) {
  const byKey = new Map<string, Control>(controls.map((control) => [control.key, control]));
  const placed = new Set<string>();

  const sections = SECTION_LAYOUT.map((section) => {
    const rows: ControlRow[] = section.rows
      .map((row) => row.map((key) => byKey.get(key)).filter((control): control is Control => Boolean(control)))
      .filter((row) => row.length > 0);
    rows.flat().forEach((control) => placed.add(control.key));
    return { label: section.label, icon: section.icon, rows };
  });

  // Append any control not covered by the layout so nothing is silently hidden.
  const leftovers = controls.filter((control) => !placed.has(control.key));
  if (leftovers.length > 0) {
    const style = sections.find((section) => section.label === 'Style')!;
    style.rows.push(...leftovers.map((control) => [control]));
  }

  return sections.filter((section) => section.rows.length > 0);
}

interface ControlSectionsProps {
  controls: Control[];
  getValue(key: string): unknown;
  onChange(key: string, value: unknown): void;
}

function ControlSections({ controls, getValue, onChange }: ControlSectionsProps) {
  const sections = buildSections(controls);

  const renderControl = (control: Control) => (
    <ControlInput
      key={control.key}
      control={control}
      value={getValue(control.key)}
      onChange={(value) => onChange(control.key, value)}
      showColorSwatches={control.kind === 'color'}
    />
  );

  return (
    <div className="prop-column">
      {sections.length === 0 ? (
        <p className="inspector-tab-empty">No controls for this component.</p>
      ) : null}
      {sections.map((section) => (
        <details key={section.label} open className="control-group-details">
          <summary className="control-group-summary">
            <div className="summary-title-row">
              <span className="material-symbols-outlined group-icon" aria-hidden="true">
                {section.icon}
              </span>
              <h3>{section.label}</h3>
            </div>
            <span className="material-symbols-outlined chevron-icon" aria-hidden="true">
              expand_more
            </span>
          </summary>
          <div className="control-group-content">
            {section.rows.map((row, index) =>
              row.length > 1 ? (
                <div
                  key={index}
                  className="control-row"
                  style={{ gridTemplateColumns: row.map(columnWidth).join(' ') }}
                >
                  {row.map(renderControl)}
                </div>
              ) : (
                renderControl(row[0]!)
              ),
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

export function NodePropPanel({ state, nodeId, onPropChange }: NodePropPanelProps) {
  const node = nodeId ? state.nodes.find((item) => item.id === nodeId) : undefined;

  if (!nodeId || !node) {
    return (
      <section className="inspector-empty" aria-label="Inspector">
        <p className="inspector-empty-hint">Select a component to edit its attributes.</p>
      </section>
    );
  }

  const definition = state.pack.components.find((component) => component.id === node.componentId)!;

  return (
    <section className="inspector-section" aria-label="Inspector controls">
      <ControlSections
        controls={definition.controls as Control[]}
        getValue={(key) => node.props[key as keyof PreviewNodeProps]}
        onChange={(key, value) => onPropChange(node.id, key, value)}
      />
    </section>
  );
}

interface MultiNodePanelProps {
  state: WorkbenchState;
  nodeIds: string[];
  onPropChange(key: string, value: unknown): void;
}

// Controls common to every selected node, ordered by the first node's controls.
function sharedControls(state: WorkbenchState, nodeIds: string[]): Control[] {
  const controlSets = nodeIds
    .map((id) => state.nodes.find((node) => node.id === id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .map((node) => state.pack.components.find((component) => component.id === node.componentId)?.controls as Control[] | undefined)
    .filter((controls): controls is Control[] => Boolean(controls));

  if (controlSets.length === 0) {
    return [];
  }
  const [first, ...rest] = controlSets;
  return first!.filter((control) => rest.every((set) => set.some((other) => other.key === control.key)));
}

export function MultiNodePanel({ state, nodeIds, onPropChange }: MultiNodePanelProps) {
  const controls = sharedControls(state, nodeIds);

  // A shared value across all nodes, or undefined when they differ ("mixed").
  const sharedValue = (key: string): unknown => {
    const values = nodeIds.map((id) => state.nodes.find((node) => node.id === id)?.props[key as keyof PreviewNodeProps]);
    const [first] = values;
    return values.every((value) => JSON.stringify(value) === JSON.stringify(first)) ? first : undefined;
  };

  return (
    <section className="inspector-section" aria-label="Inspector controls">
      <p className="inspector-multi-hint">{nodeIds.length} components selected</p>
      {controls.length === 0 ? (
        <p className="inspector-tab-empty">No shared attributes.</p>
      ) : (
        <ControlSections controls={controls} getValue={sharedValue} onChange={onPropChange} />
      )}
    </section>
  );
}

export function visibleComponentLabel(label: string): string {
  return displayNameForComponentLabel(label);
}
