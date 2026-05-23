import type { ControlDefinition } from '../controls/schema.js';
import { Input, Select, Textarea } from './ui/index.js';

interface ControlInputProps {
  control: ControlDefinition;
  value: unknown;
  onChange(value: unknown): void;
}

export function ControlInput({ control, value, onChange }: ControlInputProps) {
  if (control.kind === 'enum') {
    return (
      <label className="field compact field-enum">
        <span>{control.label}</span>
        <Select value={String(value ?? control.options[0])} onChange={(event) => onChange(event.currentTarget.value)}>
          {control.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </label>
    );
  }

  if (control.kind === 'number') {
    return (
      <label className="field compact field-number">
        <span>{control.label}</span>
        <Input
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
      <label className="field compact color-field field-color">
        <span>{control.label}</span>
        <Input
          type="color"
          className="color-swatch-input"
          value={String(value ?? '#000000')}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
    );
  }

  if (control.kind === 'boolean') {
    return (
      <label className="check-field field-boolean">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="toggle-track" aria-hidden="true" />
        <span>{control.label}</span>
      </label>
    );
  }

  if (control.kind === 'size') {
    return (
      <label className="field compact field-size">
        <span>{control.label}</span>
          <Select value={typeof value === 'string' ? value : 'lg'} onChange={(event) => onChange(event.currentTarget.value)}>
          {control.presets.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
          </Select>
      </label>
    );
  }

  return (
    <label className="field compact field-text">
      <span>{control.label}</span>
      <Textarea
        rows={4}
        value={String(value ?? '')}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
