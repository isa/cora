import type { ControlDefinition } from '../controls/schema.js';

interface ControlInputProps {
  control: ControlDefinition;
  value: unknown;
  onChange(value: unknown): void;
}

export function ControlInput({ control, value, onChange }: ControlInputProps) {
  if (control.kind === 'enum') {
    return (
      <label className="field compact">
        <span>{control.label}</span>
        <select value={String(value ?? control.options[0])} onChange={(event) => onChange(event.currentTarget.value)}>
          {control.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (control.kind === 'number') {
    return (
      <label className="field compact">
        <span>{control.label}</span>
        <input
          type="number"
          min={control.min}
          max={control.max}
          step={control.step}
          value={Number(value ?? control.min)}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
      </label>
    );
  }

  if (control.kind === 'color') {
    return (
      <label className="field compact color-field">
        <span>{control.label}</span>
        <input
          type="color"
          value={String(value ?? '#000000')}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
    );
  }

  if (control.kind === 'boolean') {
    return (
      <label className="check-field">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span>{control.label}</span>
      </label>
    );
  }

  if (control.kind === 'size') {
    return (
      <label className="field compact">
        <span>{control.label}</span>
        <select value={typeof value === 'string' ? value : 'lg'} onChange={(event) => onChange(event.currentTarget.value)}>
          {control.presets.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field compact">
      <span>{control.label}</span>
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
