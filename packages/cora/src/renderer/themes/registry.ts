import type { ThemeTokens } from '../../layout-ir.js';
import { darkTheme } from './dark.js';
import { defaultTheme } from './default.js';

export interface DiagramThemeDefinition {
  id: string;
  label: string;
  tokens: ThemeTokens;
}

const BUILT_IN_DIAGRAM_THEMES: DiagramThemeDefinition[] = [
  { id: 'light', label: 'Light', tokens: defaultTheme },
  { id: 'dark', label: 'Dark', tokens: darkTheme },
];

const themeById = new Map(BUILT_IN_DIAGRAM_THEMES.map((theme) => [theme.id, theme] as const));

/** YAML `theme: default` remains supported as an alias for light. */
export function normalizeDiagramThemeName(name?: string): string {
  if (!name || name === 'default') {
    return 'light';
  }
  return name;
}

export function listDiagramThemes(): readonly DiagramThemeDefinition[] {
  return BUILT_IN_DIAGRAM_THEMES;
}

export function isKnownDiagramTheme(name?: string): boolean {
  if (!name || name === 'default') {
    return true;
  }
  return themeById.has(name);
}

export function resolveDiagramTheme(name?: string): ThemeTokens {
  const normalized = normalizeDiagramThemeName(name);
  return themeById.get(normalized)?.tokens ?? defaultTheme;
}

export function isDarkDiagramTheme(name?: string): boolean {
  return normalizeDiagramThemeName(name) === 'dark';
}
