import type { ReactNode } from 'react';

import type { CanvasNode, WorkbenchState } from '../state.js';
import type { PreviewNodeProps } from '../controls/defaults.js';
import type { ControlDefinition } from '../controls/schema.js';
import { ControlInput } from './ControlInput.js';

interface NodePropPanelProps {
  state: WorkbenchState;
  nodeId?: string;
  onPropChange(nodeId: string, key: string, value: unknown): void;
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
  const groups = groupControls(definition.controls as Array<ControlDefinition<PreviewNodeProps>>);

  return (
    <section className="inspector-section" aria-label="Inspector controls">
      <div className="prop-column">
        {groups.length === 0 ? (
          <p className="inspector-tab-empty">No controls for this component.</p>
        ) : null}
        {groups.map((group) => {
          let iconName = 'edit';
          if (group.label === 'Style') iconName = 'palette';

          return (
            <details key={group.label} open className="control-group-details">
              <summary className="control-group-summary">
                <div className="summary-title-row">
                  <span className="material-symbols-outlined group-icon" aria-hidden="true">
                    {iconName}
                  </span>
                  <h3>{group.label}</h3>
                </div>
                <span className="material-symbols-outlined chevron-icon" aria-hidden="true">
                  expand_more
                </span>
              </summary>
              {group.label === 'Content' ? (
                <ContentGroupBody
                  controls={group.controls}
                  node={node}
                  nodeId={nodeId}
                  onPropChange={onPropChange}
                />
              ) : (
                <div className="control-group-content">
                  {group.controls.map((control) => (
                    <ControlInput
                      key={control.key}
                      control={control}
                      value={node.props[control.key as keyof PreviewNodeProps]}
                      onChange={(value) => onPropChange(nodeId, control.key, value)}
                      showColorSwatches={group.label === 'Style' && control.kind === 'color'}
                    />
                  ))}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}

export function visibleComponentLabel(label: string): string {
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

const CONTENT_KEYS = ['title', 'subtitle', 'text', 'iconType', 'type', 'icon', 'size'];
const STYLE_KEYS = [
  'backgroundColor',
  'radius',
  'borderStyle',
  'borderColor',
  'borderWidth',
  'textColor',
  'subtitleColor',
  'titleFontSize',
  'subtitleFontSize',
  'shadow',
  'iconColor',
  'skeletonColorDark',
  'skeletonColorLight',
];

function groupControls(controls: Array<ControlDefinition<PreviewNodeProps>>) {
  const pick = (keys: string[]) => controls.filter((control) => keys.includes(control.key));
  return [
    { label: 'Content', controls: pick(CONTENT_KEYS) },
    { label: 'Style', controls: pick(STYLE_KEYS) },
  ].filter((group) => group.controls.length > 0);
}

interface ContentGroupBodyProps {
  controls: Array<ControlDefinition<PreviewNodeProps>>;
  node: CanvasNode;
  nodeId: string;
  onPropChange(nodeId: string, key: string, value: unknown): void;
}

function ContentGroupBody({ controls, node, nodeId, onPropChange }: ContentGroupBodyProps) {
  const controlByKey = new Map(controls.map((control) => [control.key, control]));
  const hasSubtitle = controlByKey.has('subtitle');
  const hasSize = controlByKey.has('size');
  const rendered = new Set<string>();
  const items: ReactNode[] = [];

  for (const key of CONTENT_KEYS) {
    if (rendered.has(key)) {
      continue;
    }

    const control = controlByKey.get(key);
    if (!control) {
      continue;
    }

    if (key === 'subtitle' && hasSize) {
      items.push(
        <div key="subtitle-size-row" className="content-subtitle-size-row">
          <ControlInput
            control={controlByKey.get('subtitle')!}
            value={node.props.subtitle}
            onChange={(value) => onPropChange(nodeId, 'subtitle', value)}
          />
          <ControlInput
            control={controlByKey.get('size')!}
            value={node.props.size}
            onChange={(value) => onPropChange(nodeId, 'size', value)}
          />
        </div>,
      );
      rendered.add('subtitle');
      rendered.add('size');
      continue;
    }

    if (key === 'size') {
      if (hasSize && !hasSubtitle) {
        items.push(
          <div key="size-only" className="content-size-only">
            <ControlInput
              control={control}
              value={node.props.size}
              onChange={(value) => onPropChange(nodeId, 'size', value)}
            />
          </div>,
        );
        rendered.add('size');
      }
      continue;
    }

    items.push(
      <ControlInput
        key={control.key}
        control={control}
        value={node.props[control.key as keyof PreviewNodeProps]}
        onChange={(value) => onPropChange(nodeId, control.key, value)}
      />,
    );
    rendered.add(key);
  }

  return <div className="control-group-content">{items}</div>;
}
