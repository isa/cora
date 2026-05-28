import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, TextareaHTMLAttributes } from 'react';
import type { ControlDefinition } from '../controls/schema.js';
import type { ComponentDimensions, SizePreset } from '../../renderer/components/types.js';
import { searchPreviewIcons } from '../iconSearch.js';
import { Input, Select, Textarea } from './ui/index.js';

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

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
    resizeTextarea(ref.current);
  }, [value]);

  return (
    <Textarea
      ref={ref}
      className={`ui-textarea auto-grow ${className || ''}`}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      onInput={(event) => resizeTextarea(event.currentTarget)}
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

function isNoColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'none' || normalized === 'transparent';
}

function hexInputFromColor(value: string): string {
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value) ? value.replace('#', '') : '';
}

function colorLabel(value: string): string {
  return isNoColor(value) ? 'No color' : value.toUpperCase();
}

function colorSwatchStyle(value: string): CSSProperties | undefined {
  return isNoColor(value) ? undefined : { backgroundColor: value };
}

interface ControlInputProps {
  control: ControlDefinition;
  value: unknown;
  onChange(value: unknown): void;
  showColorSwatches?: boolean;
}

export function ControlInput({ control, value, onChange, showColorSwatches = false }: ControlInputProps) {
  if (control.kind === 'icon') {
    const current = String(value ?? '');
    const [query, setQuery] = useState(current);
    const [results, setResults] = useState<Awaited<ReturnType<typeof searchPreviewIcons>>>([]);

    useEffect(() => {
      setQuery(current);
    }, [current]);

    useEffect(() => {
      let cancelled = false;

      if (!query.trim() || query === current) {
        setResults([]);
        return () => {
          cancelled = true;
        };
      }

      void searchPreviewIcons(query, 12).then((nextResults) => {
        if (!cancelled) {
          setResults(nextResults);
        }
      });

      return () => {
        cancelled = true;
      };
    }, [query]);

    return (
      <div className="field compact field-icon-search">
        <span>{control.label}</span>
        <Input
          type="search"
          value={query}
          placeholder="material-symbols:database"
          onChange={(event) => {
            const next = event.currentTarget.value;
            setQuery(next);
            if (next.includes(':')) {
              onChange(next);
            }
          }}
          onBlur={() => {
            if (query.trim()) {
              onChange(query.trim());
            }
          }}
        />
        {results.length > 0 ? (
          <div className="icon-search-results" role="listbox">
            {results.map((result) => (
              <button
                key={result.fullName}
                type="button"
                className={`icon-search-result ${current === result.fullName ? 'active' : ''}`}
                onClick={() => {
                  onChange(result.fullName);
                  setQuery(result.fullName);
                }}
              >
                {result.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (control.kind === 'enum') {
    const current = String(value ?? control.options[0]);
    const display = control.display ?? 'segmented';

    if (display === 'select') {
      return (
        <label className={`field compact field-enum field-enum-select field-enum-${String(control.key)}`}>
          <span>{control.label}</span>
          <Select
            value={current}
            onChange={(event) => onChange(event.currentTarget.value)}
            aria-label={control.label}
          >
            {control.options.map((option) => (
              <option key={option} value={option}>
                {enumOptionLabel(option)}
              </option>
            ))}
          </Select>
        </label>
      );
    }

    return (
      <div className={`field compact field-enum field-enum-${String(control.key)}`}>
        <span>{control.label}</span>
        <div className="segmented-control">
          {control.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`segment-btn ${current === option ? 'active' : ''}`}
              onClick={() => onChange(option)}
              aria-label={`${control.label}: ${enumOptionLabel(option)}`}
              title={enumOptionLabel(option)}
            >
              {enumOptionLabel(option)}
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

    const [hexInputValue, setHexInputValue] = useState(hexInputFromColor(current));

    useEffect(() => {
      setHexInputValue(hexInputFromColor(current));
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

    const selectColor = (color: string) => {
      onChange(color);
      setShowPopover(false);
    };

    const handleHexInputChange = (event: ChangeEvent<HTMLInputElement>) => {
      let val = event.currentTarget.value.trim();
      setHexInputValue(val);
      if (val.startsWith('#')) {
        val = val.substring(1);
      }
      if (val.length === 3 || val.length === 6) {
        selectColor(`#${val}`);
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
          selectColor(result.sRGBHex);
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
              className={`color-picker-trigger-swatch ${isNoColor(current) ? 'color-swatch-none' : ''}`}
              style={colorSwatchStyle(current)}
            />
            <span className="color-picker-trigger-hex">{colorLabel(current)}</span>
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
                  <button
                    type="button"
                    className={`color-none-option ${isNoColor(current) ? 'active' : ''}`}
                    onClick={() => selectColor('none')}
                    aria-label="Set no color"
                  >
                    <span className="color-none-option-swatch color-swatch-none" aria-hidden="true" />
                    <span>No color</span>
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
                              onClick={() => selectColor(color)}
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
                          onClick={() => selectColor(color)}
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
    const current = typeof value === 'string'
      ? value
      : matchingSizePreset(value, control.presetSizes) ?? 'md';
    return (
      <div className="field compact field-size">
        <span>{control.label}</span>
        <div className="segmented-control">
          {control.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`segment-btn ${current === preset ? 'active' : ''}`}
              onClick={() => onChange(control.presetSizes?.[preset] ?? preset)}
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

function enumOptionLabel(option: string): string {
  const labels: Record<string, string> = {
    arrow: 'Arrowhead',
    circle: 'Circle',
    filledCircle: 'Filled Circle',
    diamond: 'Diamond',
    filledDiamond: 'Filled Diamond',
    square: 'Square',
    filledSquare: 'Filled Square',
    none: 'None',
    autoSide: 'Auto',
    'auto-side': 'Auto',
  };
  return labels[option] ?? option;
}

function matchingSizePreset(
  value: unknown,
  presets: Partial<Record<SizePreset, ComponentDimensions>> | undefined,
): string | undefined {
  if (!presets || typeof value !== 'object' || value === null) {
    return undefined;
  }

  const dimensions = value as { width?: unknown; height?: unknown };
  if (typeof dimensions.width !== 'number' || typeof dimensions.height !== 'number') {
    return undefined;
  }

  return Object.entries(presets).find(([, size]) =>
    size?.width === dimensions.width && size.height === dimensions.height,
  )?.[0];
}
