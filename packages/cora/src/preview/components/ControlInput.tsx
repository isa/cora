import { useEffect, useRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import type { ControlDefinition } from '../controls/schema.js';
import { Input, Select, Textarea } from './ui/index.js';

function AutoGrowingTextarea({
  value,
  onChange,
  className,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  value: string;
  onChange(value: string): void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={`ui-textarea auto-grow ${className || ''}`}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      style={{ overflowY: 'hidden', resize: 'none' }}
      {...props}
    />
  );
}

const COLOR_PRESETS = [
  { value: '#0A0A0A', light: false },
  { value: '#6B7280', light: false },
  { value: '#FFFFFF', light: true },
  { value: '#7B3FE4', light: false },
  { value: '#EF4444', light: false },
] as const;

interface ControlInputProps {
  control: ControlDefinition;
  value: unknown;
  onChange(value: unknown): void;
  showColorSwatches?: boolean;
}

export function ControlInput({ control, value, onChange, showColorSwatches = false }: ControlInputProps) {
  if (control.kind === 'enum') {
    const current = String(value ?? control.options[0]);
    return (
      <div className="field compact field-enum">
        <span>{control.label}</span>
        <div className="segmented-control">
          {control.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`segment-btn ${current === option ? 'active' : ''}`}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
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
    const current = String(value ?? '#000000');
    return (
      <div className="field compact color-field field-color">
        <span>{control.label}</span>
        {showColorSwatches ? (
          <div className="color-swatch-row">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={[
                  'color-swatch',
                  preset.light ? 'color-swatch-light' : '',
                  current.toLowerCase() === preset.value.toLowerCase() ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ backgroundColor: preset.value }}
                aria-label={`Set ${control.label} to ${preset.value}`}
                onClick={() => onChange(preset.value)}
              />
            ))}
            <label className="color-swatch color-swatch-picker" aria-label={`Custom ${control.label}`}>
              <span className="material-symbols-outlined color-swatch-picker-icon" aria-hidden="true">
                palette
              </span>
              <Input
                type="color"
                className="color-swatch-input"
                value={current}
                onChange={(event) => onChange(event.currentTarget.value)}
              />
            </label>
          </div>
        ) : (
          <Input
            type="color"
            className="color-swatch-input"
            value={current}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
        )}
      </div>
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
    const current = typeof value === 'string' ? value : 'lg';
    return (
      <div className="field compact field-size">
        <span>{control.label}</span>
        <div className="segmented-control">
          {control.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`segment-btn ${current === preset ? 'active' : ''}`}
              onClick={() => onChange(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isTitleOrSubtitle = control.key === 'title' || control.key === 'subtitle';
  return (
    <label className={`field compact field-text ${isTitleOrSubtitle ? 'field-title-subtitle' : ''}`}>
      <span>{control.label}</span>
      <AutoGrowingTextarea
        value={String(value ?? '')}
        onChange={(val) => onChange(val)}
        className={isTitleOrSubtitle ? 'input-title-subtitle' : ''}
      />
    </label>
  );
}
