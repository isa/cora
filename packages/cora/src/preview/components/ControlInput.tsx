import { useEffect, useRef, useState } from 'react';
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

const THEME_COLORS = [
  ['#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
  ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
  ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'],
  ['#fce7f3', '#fbcfe8', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724', '#2d0015'],
  ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#062f14'],
];

const DEFAULT_CUSTOM_COLORS = [
  '#475569', '#334155', '#2563eb', '#3b82f6', '#6366f1', '#06b6d4', '#ec4899', '#22c55e', '#14b8a6', '#f59e0b'
];

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
    const [showPopover, setShowPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [customColors, setCustomColors] = useState<string[]>(() => {
      try {
        const saved = localStorage.getItem('cora-custom-colors');
        return saved ? JSON.parse(saved) : DEFAULT_CUSTOM_COLORS;
      } catch {
        return DEFAULT_CUSTOM_COLORS;
      }
    });

    const [hexInputValue, setHexInputValue] = useState(current.replace('#', ''));

    useEffect(() => {
      setHexInputValue(current.replace('#', ''));
    }, [current]);

    useEffect(() => {
      if (!showPopover) return;

      const handleOutsideClick = (event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
          setShowPopover(false);
        }
      };

      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }, [showPopover]);

    const handleHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      let val = event.currentTarget.value.trim();
      setHexInputValue(val);
      if (val.startsWith('#')) {
        val = val.substring(1);
      }
      if (val.length === 3 || val.length === 6) {
        onChange(`#${val}`);
      }
    };

    const addCustomColor = (color: string) => {
      const formatted = color.toLowerCase();
      if (!customColors.some((c) => c.toLowerCase() === formatted)) {
        const updated = [color, ...customColors.slice(0, 19)];
        setCustomColors(updated);
        try {
          localStorage.setItem('cora-custom-colors', JSON.stringify(updated));
        } catch (_) {}
      }
    };

    const eyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

    const handleEyeDropper = async () => {
      if (!eyeDropperSupported) return;
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          onChange(result.sRGBHex);
        }
      } catch (err) {
        console.error('EyeDropper failed:', err);
      }
    };

    return (
      <div className="field compact color-field field-color">
        <span>{control.label}</span>
        <div ref={popoverRef} className="color-picker-trigger-row">
          <button
            type="button"
            className="color-picker-trigger"
            onClick={() => setShowPopover(!showPopover)}
            aria-label={`Open ${control.label} color picker. Current color is ${current}`}
          >
            <span
              className="color-picker-trigger-swatch"
              style={{ backgroundColor: current }}
            />
            <span className="color-picker-trigger-hex">{current.toUpperCase()}</span>
          </button>
          {eyeDropperSupported && (
            <button
              type="button"
              className="color-picker-eyedropper-btn"
              title="Pick color from screen"
              onClick={handleEyeDropper}
              aria-label="Pick color from screen"
            >
              <span className="material-symbols-outlined">colorize</span>
            </button>
          )}

          {showPopover && (
            <>
              <div className="color-picker-popover" role="dialog" aria-label="Color Picker">
                <div className="color-picker-popover-header">
                  <span className="color-picker-popover-title">Color Picker</span>
                  <button
                    type="button"
                    className="color-picker-popover-close"
                    onClick={() => setShowPopover(false)}
                    aria-label="Close color picker"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="color-picker-popover-section">
                  <div className="color-picker-section-title-row">
                    <span>Theme color</span>
                  </div>
                  <div className="theme-colors-grid">
                    {THEME_COLORS.map((row, rIdx) => (
                      <div key={rIdx} className="theme-colors-row">
                        {row.map((color) => {
                          const isLight = ['#ffffff', '#f1f5f9', '#e2e8f0', '#fef3c7', '#fde68a', '#dcfce7'].includes(color.toLowerCase());
                          return (
                            <button
                              key={color}
                              type="button"
                              className={`color-swatch-mini ${isLight ? 'color-swatch-light' : ''} ${current.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => onChange(color)}
                              aria-label={`Set color to ${color}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="color-picker-popover-section">
                  <div className="color-picker-section-title-row">
                    <span>My color</span>
                    <button
                      type="button"
                      className="add-color-btn"
                      onClick={() => addCustomColor(current)}
                    >
                      + Add
                    </button>
                  </div>
                  <div className="custom-colors-grid">
                    {customColors.map((color, idx) => {
                      const isLight = ['#ffffff', '#f1f5f9', '#e2e8f0', '#fef3c7', '#fde68a', '#dcfce7'].includes(color.toLowerCase());
                      return (
                        <button
                          key={`${color}-${idx}`}
                          type="button"
                          className={`color-swatch-circle ${isLight ? 'color-swatch-light' : ''} ${current.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => onChange(color)}
                          aria-label={`Set color to ${color}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="color-picker-popover-footer">
                  <div className="color-picker-hex-input-wrapper">
                    <span className="color-picker-hex-hash">#</span>
                    <input
                      type="text"
                      className="color-picker-hex-input"
                      value={hexInputValue}
                      onChange={handleHexInputChange}
                      placeholder="000000"
                    />
                  </div>
                  {eyeDropperSupported && (
                    <button
                      type="button"
                      className="color-picker-eyedropper-btn-mini"
                      title="Pick color from screen"
                      onClick={handleEyeDropper}
                      aria-label="Pick color from screen"
                    >
                      <span className="material-symbols-outlined">colorize</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
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
