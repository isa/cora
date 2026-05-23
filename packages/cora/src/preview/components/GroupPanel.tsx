import type { CanvasGroup } from '../state.js';
import { Input } from './ui/index.js';

interface GroupPanelProps {
  group?: CanvasGroup;
  onGroupChange(patch: Partial<Pick<CanvasGroup, 'label' | 'size'>>): void;
}

export function GroupPanel({ group, onGroupChange }: GroupPanelProps) {
  if (!group) {
    return null;
  }

  return (
    <section className="inspector-section" aria-label="Inspector">
      <div className="prop-column">
        <h2>Group</h2>
        <p className="role-label">{group.id}</p>
        <section className="control-group">
          <h3>Content</h3>
          <label className="field compact">
            <span>Label</span>
            <Input
              type="text"
              value={group.label}
              onChange={(event) => onGroupChange({ label: event.currentTarget.value })}
            />
          </label>
        </section>
        <section className="control-group">
          <h3>Size</h3>
          <label className="field compact">
            <span>Width</span>
            <Input
              type="number"
              min={120}
              max={760}
              value={group.size.width}
              onChange={(event) => onGroupChange({ size: { ...group.size, width: Number(event.currentTarget.value) } })}
            />
          </label>
          <label className="field compact">
            <span>Height</span>
            <Input
              type="number"
              min={80}
              max={520}
              value={group.size.height}
              onChange={(event) => onGroupChange({ size: { ...group.size, height: Number(event.currentTarget.value) } })}
            />
          </label>
        </section>
      </div>
    </section>
  );
}
