import type { ComponentDimensions, SizePreset } from '../../renderer/components/types.js';

export type ControlKind = 'text' | 'color' | 'boolean' | 'bold' | 'number' | 'enum' | 'size' | 'icon';

export interface BaseControl<Props extends Record<string, unknown>> {
  key: keyof Props & string;
  label: string;
}

export interface TextControl<Props extends Record<string, unknown>> extends BaseControl<Props> {
  kind: 'text';
}

export interface IconControl<Props extends Record<string, unknown>> extends BaseControl<Props> {
  kind: 'icon';
}

export interface ColorControl<Props extends Record<string, unknown>> extends BaseControl<Props> {
  kind: 'color';
}

export interface BooleanControl<Props extends Record<string, unknown>> extends BaseControl<Props> {
  kind: 'boolean';
}

/** A compact "B" toggle button (bold on/off), rendered inline beside a size. */
export interface BoldControl<Props extends Record<string, unknown>> extends BaseControl<Props> {
  kind: 'bold';
}

export interface NumberControl<Props extends Record<string, unknown>> extends BaseControl<Props> {
  kind: 'number';
  min: number;
  max: number;
  step: number;
}

export interface EnumControl<Props extends Record<string, unknown>> extends BaseControl<Props> {
  kind: 'enum';
  options: string[];
  display?: 'segmented' | 'select';
}

export interface SizeControl<Props extends Record<string, unknown>> extends BaseControl<Props> {
  kind: 'size';
  presets: SizePreset[];
  explicit: ComponentDimensions;
  presetSizes?: Partial<Record<SizePreset, ComponentDimensions>>;
}

export type ControlDefinition<Props extends Record<string, unknown> = Record<string, unknown>> =
  | TextControl<Props>
  | IconControl<Props>
  | ColorControl<Props>
  | BooleanControl<Props>
  | BoldControl<Props>
  | NumberControl<Props>
  | EnumControl<Props>
  | SizeControl<Props>;

export function isValidControlValue(
  control: ControlDefinition,
  value: unknown,
): boolean {
  if (control.kind === 'text' || control.kind === 'color' || control.kind === 'icon') {
    return typeof value === 'string';
  }
  if (control.kind === 'boolean' || control.kind === 'bold') {
    return typeof value === 'boolean';
  }
  if (control.kind === 'number') {
    return typeof value === 'number' && value >= control.min && value <= control.max;
  }
  if (control.kind === 'enum') {
    return typeof value === 'string' && control.options.includes(value);
  }
  if (control.kind === 'size') {
    return (
      typeof value === 'string' && control.presets.includes(value as SizePreset)
    ) || (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as ComponentDimensions).width === 'number' &&
      typeof (value as ComponentDimensions).height === 'number'
    );
  }
  return false;
}
