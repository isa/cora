import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { CORA_CONFIG_DIR } from '../../cli/paths.js';

import { parse as parseYaml } from 'yaml';

import type { ThemeShapeStyle, ThemeTokens } from '../../layout-ir.js';
import { isDiagramFontFamily } from './diagramFonts.js';
import {
  resolveBuiltinThemesDir,
  resolveThemeContractPath,
} from './paths.js';

export { DEFAULT_THEME_ID, slugifyThemeLabel, THEME_ALIASES } from './themeConstants.js';

interface ThemeTypographySpec {
  fontFamily?: string;
  nodeLabel?: { size?: number; weight?: number; fill?: string };
  edgeLabel?: { size?: number; weight?: number; fill?: string };
  groupLabel?: { size?: number; weight?: number; fill?: string };
}

interface ThemeStrokesSpec {
  node?: number;
  edge?: number;
  group?: number;
}

interface ThemeContractFile {
  typography?: ThemeTypographySpec;
  strokes?: ThemeStrokesSpec;
  canvas?: { background?: string };
  components?: Record<string, Record<string, unknown>>;
  edge?: { stroke?: string; width?: string | number };
  group?: Record<string, unknown>;
}

export interface ThemePaletteFile {
  id: string;
  label: string;
  appearance: 'light' | 'dark';
  palette: Record<string, string>;
  typography?: Pick<ThemeTypographySpec, 'fontFamily'>;
  strokes?: ThemeStrokesSpec;
}

type ResolvedStrokes = { node: number; edge: number; group: number };

let contractCache: ThemeContractFile | undefined;

function readYamlFile<T>(path: string): T {
  return parseYaml(readFileSync(path, 'utf8')) as T;
}

export function loadThemeContract(): ThemeContractFile {
  if (!contractCache) {
    contractCache = readYamlFile<ThemeContractFile>(resolveThemeContractPath());
  }
  return contractCache;
}

function mergeStrokes(
  contract: ThemeStrokesSpec | undefined,
  theme: ThemeStrokesSpec | undefined,
): ResolvedStrokes {
  return {
    node: theme?.node ?? contract?.node ?? 1,
    edge: theme?.edge ?? contract?.edge ?? 2,
    group: theme?.group ?? contract?.group ?? 1,
  };
}

function mergeTypography(
  contract: ThemeTypographySpec | undefined,
  theme: ThemePaletteFile,
): ThemeTypographySpec {
  return {
    fontFamily: theme.typography?.fontFamily ?? contract?.fontFamily ?? 'Poppins',
    nodeLabel: contract?.nodeLabel,
    edgeLabel: contract?.edgeLabel,
    groupLabel: contract?.groupLabel,
  };
}

function resolveToken(
  value: unknown,
  palette: Record<string, string>,
  strokes: ResolvedStrokes,
): unknown {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  if (value === 'none' || value === 'transparent') {
    return value;
  }
  if (value in palette) {
    return palette[value];
  }
  if (value === 'node') {
    return strokes.node;
  }
  if (value === 'edge') {
    return strokes.edge;
  }
  if (value === 'group') {
    return strokes.group;
  }
  return value;
}

function resolveShapeStyle(
  raw: Record<string, unknown>,
  palette: Record<string, string>,
  strokes: ResolvedStrokes,
): ThemeShapeStyle & {
  iconColor?: string;
  skeletonColor?: string;
  windowColor?: string;
  windowBarColor?: string;
  windowAddressBarColor?: string;
} {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    resolved[key] = resolveToken(value, palette, strokes);
  }
  return resolved as ThemeShapeStyle & {
    iconColor?: string;
    skeletonColor?: string;
    windowColor?: string;
    windowBarColor?: string;
    windowAddressBarColor?: string;
  };
}

function resolveLabelStyle(
  spec: { size?: number; weight?: number; fill?: string } | undefined,
  palette: Record<string, string>,
  strokes: ResolvedStrokes,
  fontFamily: string,
) {
  return {
    fontSize: spec?.size ?? 12,
    fontWeight: spec?.weight ?? 400,
    fill: String(resolveToken(spec?.fill ?? 'text', palette, strokes)),
    fontFamily,
  };
}

export function compileThemePaletteFile(themeFile: ThemePaletteFile): ThemeTokens {
  const contract = loadThemeContract();
  const strokes = mergeStrokes(contract.strokes, themeFile.strokes);
  const typography = mergeTypography(contract.typography, themeFile);
  const fontFamily = typography.fontFamily ?? 'Poppins';

  if (!isDiagramFontFamily(fontFamily)) {
    throw new Error(
      `Theme "${themeFile.id}" uses unsupported fontFamily "${fontFamily}".`,
    );
  }

  const palette = themeFile.palette;
  const background = String(
    resolveToken(contract.canvas?.background ?? 'bg', palette, strokes),
  );

  const shapes: Record<
    string,
    ThemeShapeStyle & { iconColor?: string; skeletonColor?: string }
  > = {};

  for (const [componentId, raw] of Object.entries(contract.components ?? {})) {
    shapes[componentId] = resolveShapeStyle(raw, palette, strokes);
  }

  if (contract.group) {
    shapes.group = resolveShapeStyle(
      contract.group as Record<string, unknown>,
      palette,
      strokes,
    );
  }

  const edgeStroke = String(
    resolveToken(contract.edge?.stroke ?? 'muted', palette, strokes),
  );
  const edgeWidth = Number(
    resolveToken(contract.edge?.width ?? 'edge', palette, strokes),
  );

  return {
    background,
    fontFamily,
    strokes,
    shapes,
    edge: {
      stroke: edgeStroke,
      strokeWidth: edgeWidth,
    },
    nodeLabel: resolveLabelStyle(
      typography.nodeLabel,
      palette,
      strokes,
      fontFamily,
    ),
    edgeLabel: resolveLabelStyle(
      typography.edgeLabel,
      palette,
      strokes,
      fontFamily,
    ),
    groupLabel: resolveLabelStyle(
      typography.groupLabel,
      palette,
      strokes,
      fontFamily,
    ),
    shadowOffset: { x: 0, y: 0 },
    shadowBlur: 0,
  };
}

function loadThemeFile(path: string): ThemePaletteFile {
  const parsed = readYamlFile<ThemePaletteFile>(path);
  if (!parsed.id || !parsed.label || !parsed.appearance || !parsed.palette) {
    throw new Error(`Invalid theme file (missing id/label/appearance/palette): ${path}`);
  }
  return parsed;
}

function extensionThemeDirectories(): string[] {
  const extensionsRoot = join(CORA_CONFIG_DIR, 'extensions');
  if (!existsSync(extensionsRoot)) {
    return [];
  }

  const dirs: string[] = [];
  for (const entry of readdirSync(extensionsRoot)) {
    const themesDir = join(extensionsRoot, entry, 'themes');
    if (existsSync(themesDir) && statSync(themesDir).isDirectory()) {
      dirs.push(themesDir);
    }
  }
  return dirs;
}

export function discoverThemePaletteFiles(): ThemePaletteFile[] {
  const files: ThemePaletteFile[] = [];

  const builtinDir = resolveBuiltinThemesDir();
  for (const name of readdirSync(builtinDir).sort()) {
    if (!name.endsWith('.theme.yaml')) {
      continue;
    }
    files.push(loadThemeFile(join(builtinDir, name)));
  }

  return files;
}

export function discoverExtensionThemePaletteFiles(): ThemePaletteFile[] {
  const files: ThemePaletteFile[] = [];

  for (const dir of extensionThemeDirectories()) {
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith('.theme.yaml')) {
        continue;
      }
      files.push(loadThemeFile(join(dir, name)));
    }
  }

  return files;
}