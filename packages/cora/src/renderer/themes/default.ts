import type { ThemeTokens } from '../../layout-ir.js';
import {
  DEFAULT_THEME_ID,
  getDefaultThemeTokens,
  resolveDiagramTheme,
} from './registry.js';

/** Default built-in theme tokens (`folio-light`). */
export function getDefaultTheme(): ThemeTokens {
  return getDefaultThemeTokens();
}

export const defaultTheme: ThemeTokens = getDefaultTheme();

export function resolveNodeStyle(
  component: string | undefined,
): ThemeTokens['shapes'][string] {
  const key = component ?? 'box';
  return resolveDiagramTheme(DEFAULT_THEME_ID).shapes[key] ??
    resolveDiagramTheme(DEFAULT_THEME_ID).shapes.box!;
}
