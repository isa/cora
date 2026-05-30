import type { CanvasGroup } from '../state.js';
import type { ControlDefinition } from '../controls/schema.js';
import { fontFamilyControl } from '../controls/defaults.js';
import { ControlInput } from './ControlInput.js';
import { Input } from './ui/index.js';

interface GroupPanelProps {
  group?: CanvasGroup;
  onGroupChange(patch: Partial<Pick<CanvasGroup, 'label' | 'size' | 'fillColor' | 'labelColor' | 'labelSize' | 'fontFamily'>>): void;
}

type GroupStyleControlKey = 'fillColor' | 'labelColor' | 'labelSize';

const groupStyleControls: Array<ControlDefinition<Record<GroupStyleControlKey, unknown>>> = [
  { kind: 'color', key: 'fillColor', label: 'Background color' },
  { kind: 'color', key: 'labelColor', label: 'Title color' },
  { kind: 'number', key: 'labelSize', label: 'Title size', min: 8, max: 32, step: 1 },
];

export function GroupPanel({ group, onGroupChange }: GroupPanelProps) {
  if (!group) {
    return null;
  }

  return (
    <section className="inspector-section" aria-label="Group controls">
      <div className="prop-column">
        <details open className="control-group-details">
          <summary className="control-group-summary">
            <div className="summary-title-row">
              <span className="material-symbols-outlined group-icon" aria-hidden="true">
                edit
              </span>
              <h3>Content</h3>
            </div>
            <span className="material-symbols-outlined chevron-icon" aria-hidden="true">
              expand_more
            </span>
          </summary>
          <div className="control-group-content">
            <ControlInput
              control={fontFamilyControl as ControlDefinition<Record<'fontFamily', unknown>>}
              value={group.fontFamily}
              onChange={(value) => onGroupChange({ fontFamily: value as string })}
            />
            <label className="field compact field-text">
              <span>Title</span>
              <Input
                type="text"
                value={group.label}
                onChange={(event) => onGroupChange({ label: event.currentTarget.value })}
              />
            </label>
          </div>
        </details>

        <details open className="control-group-details">
          <summary className="control-group-summary">
            <div className="summary-title-row">
              <span className="material-symbols-outlined group-icon" aria-hidden="true">
                palette
              </span>
              <h3>Style</h3>
            </div>
            <span className="material-symbols-outlined chevron-icon" aria-hidden="true">
              expand_more
            </span>
          </summary>
          <div className="control-group-content">
            {groupStyleControls.map((control) => (
              <ControlInput
                key={control.key}
                control={control}
                value={group[control.key]}
                onChange={(value) => onGroupChange({ [control.key]: value })}
                showColorSwatches={control.kind === 'color'}
              />
            ))}
          </div>
        </details>

        <details open className="control-group-details">
          <summary className="control-group-summary">
            <div className="summary-title-row">
              <span className="material-symbols-outlined group-icon" aria-hidden="true">
                aspect_ratio
              </span>
              <h3>Size</h3>
            </div>
            <span className="material-symbols-outlined chevron-icon" aria-hidden="true">
              expand_more
            </span>
          </summary>
          <div className="control-group-content">
            <label className="field compact field-number">
              <span>Width</span>
              <Input
                type="number"
                min={120}
                max={760}
                step={10}
                value={group.size.width}
                onChange={(event) =>
                  onGroupChange({ size: { ...group.size, width: Math.round(Number(event.currentTarget.value)) } })
                }
              />
            </label>
            <label className="field compact field-number">
              <span>Height</span>
              <Input
                type="number"
                min={80}
                max={520}
                step={10}
                value={group.size.height}
                onChange={(event) =>
                  onGroupChange({
                    size: { ...group.size, height: Math.round(Number(event.currentTarget.value)) },
                  })
                }
              />
            </label>
          </div>
        </details>
      </div>
    </section>
  );
}
