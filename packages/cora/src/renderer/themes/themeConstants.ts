export const DEFAULT_THEME_ID = 'folio-light';

export const THEME_ALIASES: Record<string, string> = {
  default: DEFAULT_THEME_ID,
  light: DEFAULT_THEME_ID,
  dark: 'folio-dark',
};

export function slugifyThemeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Shared personality id (e.g. `folio-light` → `folio`). */
export function getThemeFamily(themeId: string): string {
  const normalized = themeId.trim();
  const match = normalized.match(/^(.+)-(light|dark)$/);
  return match?.[1] ?? normalized;
}
