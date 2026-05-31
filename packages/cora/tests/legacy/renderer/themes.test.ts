import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';

import { validateDocument } from '../../../src/core/validator.js';
import {
  compileThemePaletteFile,
  loadThemeContract,
} from '../../../src/renderer/themes/loader.js';
import { resolveBuiltinThemesDir } from '../../../src/renderer/themes/paths.js';
import {
  DEFAULT_THEME_ID,
  listDiagramThemes,
  normalizeDiagramThemeName,
  resolveDiagramTheme,
  resolveThemeIdForAppearance,
  resolveThemeNameInput,
  listThemeFamilies,
} from '../../../src/renderer/themes/registry.js';

describe('runtime theme loader', () => {
  it('loads the shared theme contract', () => {
    const contract = loadThemeContract();
    expect(contract.components?.box?.fill).toBe('cyan');
    expect(contract.typography?.fontFamily).toBe('Poppins');
    expect(contract.strokes?.edge).toBe(2);
  });

  it('ships ten built-in themes with ids and labels', () => {
    const themes = listDiagramThemes();
    expect(themes).toHaveLength(10);
    expect(themes.some((theme) => theme.id === DEFAULT_THEME_ID)).toBe(true);
    expect(themes.every((theme) => theme.label.length > 0)).toBe(true);
    expect(themes.filter((theme) => theme.appearance === 'light')).toHaveLength(5);
    expect(themes.filter((theme) => theme.appearance === 'dark')).toHaveLength(5);
  });

  it('resolves legacy theme aliases', () => {
    expect(normalizeDiagramThemeName('default')).toBe('folio-light');
    expect(normalizeDiagramThemeName('light')).toBe('folio-light');
    expect(normalizeDiagramThemeName('dark')).toBe('folio-dark');
  });

  it('resolves label slugs for CLI lookup', () => {
    expect(resolveThemeNameInput('folio-mist')).toBe('folio-light');
    expect(resolveThemeNameInput('ocean-depth')).toBe('ocean-dark');
  });

  it('resolves theme families for light and dark appearance', () => {
    expect(resolveThemeIdForAppearance('folio-light', 'dark')).toBe('folio-dark');
    expect(resolveThemeIdForAppearance('folio-dark', 'light')).toBe('folio-light');
    expect(resolveThemeIdForAppearance('ocean-light', 'dark')).toBe('ocean-dark');
    expect(listThemeFamilies()).toHaveLength(5);
  });

  it('compiles palette files into ThemeTokens with fonts and strokes', () => {
    const folioLight = parseYaml(
      readFileSync(join(resolveBuiltinThemesDir(), 'folio-light.theme.yaml'), 'utf8'),
    );
    const tokens = compileThemePaletteFile(folioLight as Parameters<typeof compileThemePaletteFile>[0]);
    expect(tokens.fontFamily).toBe('Source Sans 3');
    expect(tokens.strokes.edge).toBe(1.5);
    expect(tokens.shapes.box?.fill).toMatch(/^#/);
    expect(tokens.shapes.database?.iconColor).toMatch(/^#/);
    expect(tokens.shapes.website?.windowColor).toBe('#cbd5e1');
    expect(tokens.edge.strokeWidth).toBe(1.5);
    expect(tokens.nodeLabel.fontFamily).toBe('Source Sans 3');
  });

  it('compiles dark website window chrome from palette tokens', () => {
    const folioDark = parseYaml(
      readFileSync(join(resolveBuiltinThemesDir(), 'folio-dark.theme.yaml'), 'utf8'),
    );
    const tokens = compileThemePaletteFile(folioDark as Parameters<typeof compileThemePaletteFile>[0]);
    expect(tokens.shapes.website?.windowColor).toBe('#64748b');
    expect(tokens.shapes.website?.windowBarColor).toBe('#475569');
    expect(tokens.shapes.website?.windowAddressBarColor).toBe('#334155');
  });

  it('defaults omitted diagram theme to folio-light tokens', () => {
    const defaultTokens = resolveDiagramTheme();
    const folioTokens = resolveDiagramTheme('folio-light');
    expect(defaultTokens.background).toBe(folioTokens.background);
    expect(defaultTokens.fontFamily).toBe('Source Sans 3');
  });
});

describe('UNKNOWN_THEME validation', () => {
  it('reports unknown diagram themes during semantic validation', () => {
    const errors = validateDocument({
      version: 1,
      diagram: {
        kind: 'box-arrows',
        theme: 'not-a-real-theme',
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        edges: [{ from: 'a', to: 'b' }],
      },
    });
    expect(errors.some((error) => error.code === 'UNKNOWN_THEME')).toBe(true);
  });
});
