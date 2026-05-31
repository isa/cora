import type { ThemeTokens } from '../../layout-ir.js';
import { BUILTIN_THEME_DEFINITIONS } from './generated/builtinThemes.js';
import {
  DEFAULT_THEME_ID,
  getThemeFamily,
  slugifyThemeLabel,
  THEME_ALIASES,
} from './themeConstants.js';

export interface DiagramThemeDefinition {
  id: string;
  label: string;
  appearance: 'light' | 'dark';
  tokens: ThemeTokens;
}

export { DEFAULT_THEME_ID, getThemeFamily, slugifyThemeLabel, THEME_ALIASES } from './themeConstants.js';

let registryCache: DiagramThemeDefinition[] | undefined;
let registryById: Map<string, DiagramThemeDefinition> | undefined;
let registryBySlug: Map<string, DiagramThemeDefinition> | undefined;

function installRegistry(themes: DiagramThemeDefinition[]): void {
  if (!themes.some((theme) => theme.id === DEFAULT_THEME_ID)) {
    throw new Error(`Built-in default theme "${DEFAULT_THEME_ID}" is missing.`);
  }
  registryCache = themes;
  registryById = new Map(themes.map((theme) => [theme.id, theme]));
  registryBySlug = new Map(
    themes.map((theme) => [slugifyThemeLabel(theme.label), theme]),
  );
}

function ensureRegistry(): void {
  if (registryCache && registryById && registryBySlug) {
    return;
  }
  installRegistry(BUILTIN_THEME_DEFINITIONS);
}

/** Node-only: replace registry with themes loaded from YAML on disk. */
export function installThemeRegistryFromDisk(themes: DiagramThemeDefinition[]): void {
  installRegistry(themes);
}

export function normalizeDiagramThemeName(name?: string): string {
  if (!name) {
    return DEFAULT_THEME_ID;
  }
  if (name in THEME_ALIASES) {
    return THEME_ALIASES[name]!;
  }
  return name;
}

export function resolveThemeNameInput(input: string): string | undefined {
  ensureRegistry();
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  const aliased = THEME_ALIASES[trimmed] ?? trimmed;
  if (registryById!.has(aliased)) {
    return aliased;
  }

  const slug = slugifyThemeLabel(trimmed);
  const bySlug = registryBySlug!.get(slug);
  if (bySlug) {
    return bySlug.id;
  }

  return undefined;
}

export function listDiagramThemes(): readonly DiagramThemeDefinition[] {
  ensureRegistry();
  return registryCache!;
}

export function findDiagramTheme(id?: string): DiagramThemeDefinition | undefined {
  ensureRegistry();
  const normalized = normalizeDiagramThemeName(id);
  return registryById!.get(normalized);
}

export function isKnownDiagramTheme(name?: string): boolean {
  if (!name) {
    return true;
  }
  if (name in THEME_ALIASES) {
    return true;
  }
  ensureRegistry();
  const normalized = normalizeDiagramThemeName(name);
  if (registryById!.has(normalized)) {
    return true;
  }
  return resolveThemeNameInput(name) !== undefined;
}

export function resolveDiagramTheme(name?: string): ThemeTokens {
  ensureRegistry();
  const normalized = normalizeDiagramThemeName(name);
  const resolvedId = resolveThemeNameInput(normalized) ?? normalized;
  return registryById!.get(resolvedId)?.tokens ?? registryById!.get(DEFAULT_THEME_ID)!.tokens;
}

export function getDefaultThemeTokens(): ThemeTokens {
  return resolveDiagramTheme(DEFAULT_THEME_ID);
}

export function isDarkDiagramTheme(name?: string): boolean {
  const theme = findDiagramTheme(name);
  return theme?.appearance === 'dark';
}

export function listInstalledThemeIds(): string[] {
  return listDiagramThemes().map((theme) => theme.id);
}

export function resetThemeRegistryForTests(): void {
  registryCache = undefined;
  registryById = undefined;
  registryBySlug = undefined;
}

export function resolveThemeIdForAppearance(
  themeId: string | undefined,
  appearance: 'light' | 'dark',
): string {
  ensureRegistry();
  const normalized = normalizeDiagramThemeName(themeId);
  const family = getThemeFamily(normalized);
  const candidate = `${family}-${appearance}`;
  if (registryById!.has(candidate)) {
    return candidate;
  }
  return normalized;
}

export interface ThemeFamilyOption {
  family: string;
  label: string;
}

/** One entry per theme personality (uses the light variant label when available). */
export function listThemeFamilies(): ThemeFamilyOption[] {
  ensureRegistry();
  const families = new Map<string, DiagramThemeDefinition>();
  for (const theme of registryCache!) {
    const family = getThemeFamily(theme.id);
    const existing = families.get(family);
    if (!existing || theme.appearance === 'light') {
      families.set(family, theme);
    }
  }
  return [...families.entries()]
    .map(([family, theme]) => ({ family, label: theme.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
