import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMergedCatalogJson } from '../src/renderer/iconPacks/catalogIndex.js';
import { listIconPacks, resetIconPackCache } from '../src/renderer/iconPacks/registry.js';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const materialDir = join(pkgRoot, 'src/renderer/assets/icons/material-design');
const fluentDir = join(pkgRoot, 'src/renderer/assets/icons/fluent');
const streamlineDir = join(pkgRoot, 'src/renderer/assets/icons/streamline');
const rulesFile = join(pkgRoot, 'src/renderer/assets/icons/icon-category-rules.json');
const overridesFile = join(pkgRoot, 'src/renderer/assets/icons/icon-category-overrides.json');
const outDir = join(pkgRoot, 'src/renderer/assets/icon-packs/default');

const STYLE_SUFFIXES = [
  '-outline-rounded',
  '-outline-sharp',
  '-outline',
  '-rounded',
  '-sharp',
] as const;

const BUILTIN_ALIASES: Record<string, string> = {
  server: 'dns',
  network: 'lan',
  user: 'person',
  bug: 'bug-report',
};

const MIN_ICON_COUNT = 3000;
const STREAMLINE_MIN_ICON_COUNT = 1000;

interface CategoryRule {
  id: string;
  label: string;
  keywords: string[];
}

function baseName(filename: string): string {
  let name = filename.replace(/\.svg$/i, '');
  for (const suffix of STYLE_SUFFIXES) {
    if (name.endsWith(suffix)) {
      return name.slice(0, -suffix.length);
    }
  }
  return name;
}

function fluentBaseName(filename: string): string {
  return filename.replace(/\.svg$/i, '').replace(/-\d+-(?:filled|regular|light)$/i, '');
}

function pickCanonicalFluentFile(base: string, files: string[]): string | undefined {
  const preferences = [
    `${base}-24-filled.svg`,
    `${base}-20-filled.svg`,
    `${base}-32-filled.svg`,
    `${base}-28-filled.svg`,
    `${base}-48-filled.svg`,
    `${base}-16-filled.svg`,
    `${base}-24-regular.svg`,
    `${base}-20-regular.svg`,
  ];
  for (const preferred of preferences) {
    if (files.includes(preferred)) {
      return preferred;
    }
  }
  const filled = files.filter((file) => file.includes('-filled'));
  if (filled.length > 0) {
    return filled.sort()[0];
  }
  return files.sort()[0];
}

function pickCanonicalFile(base: string, files: string[]): string | undefined {
  const exact = `${base}.svg`;
  if (files.includes(exact)) {
    return exact;
  }
  const nonOutline = files.filter(
    (file) => file.startsWith(`${base}.`) && !file.includes('-outline'),
  );
  if (nonOutline.length > 0) {
    return nonOutline.sort()[0];
  }
  const prefixed = files.filter((file) => file.startsWith(`${base}`));
  return prefixed.sort()[0];
}

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function categorize(
  slug: string,
  rules: CategoryRule[],
  overrides: Record<string, string>,
): string {
  if (overrides[slug]) {
    return overrides[slug]!;
  }
  const lower = slug.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return rule.id;
    }
  }
  return 'other';
}

async function main(): Promise<void> {
  if (!existsSync(materialDir)) {
    throw new Error(
      `Missing ${materialDir}. Add Material Symbols SVGs under material-design/ before build.`,
    );
  }

  const rules = JSON.parse(await readFile(rulesFile, 'utf8')) as CategoryRule[];
  const overrides = existsSync(overridesFile)
    ? (JSON.parse(await readFile(overridesFile, 'utf8')) as Record<string, string>)
    : {};

  const materialIconCount = await buildMaterialPack(rules, overrides);
  const streamlineIconCount = existsSync(streamlineDir)
    ? await buildStreamlinePack(rules, overrides)
    : 0;

  const packsRoot = join(pkgRoot, 'src/renderer/assets/icon-packs');
  resetIconPackCache();
  const catalog = buildMergedCatalogJson(listIconPacks(true));
  await writeFile(
    join(packsRoot, 'catalog.json'),
    `${JSON.stringify(catalog, null, 2)}\n`,
    'utf8',
  );

  console.log(`Built default icon pack: ${materialIconCount} icons → ${outDir}`);
  if (streamlineIconCount > 0) {
    console.log(`Built Streamline icon pack: ${streamlineIconCount} icons → ${join(pkgRoot, 'src/renderer/assets/icon-packs/streamline')}`);
  }
}

async function buildMaterialPack(
  rules: CategoryRule[],
  overrides: Record<string, string>,
): Promise<number> {
  const iconsOut = join(outDir, 'icons');
  const allFiles = (await readdir(materialDir)).filter((name) => name.endsWith('.svg'));
  const byBase = new Map<string, string[]>();
  for (const file of allFiles) {
    const base = baseName(file);
    const list = byBase.get(base) ?? [];
    list.push(file);
    byBase.set(base, list);
  }

  await mkdir(iconsOut, { recursive: true });

  const icons: Record<
    string,
    { file: string; label?: string; aliases?: string[]; tags?: string[] }
  > = {};
  const categoryBuckets = new Map<string, string[]>();
  for (const rule of rules) {
    categoryBuckets.set(rule.id, []);
  }

  const sortedBases = [...byBase.keys()].sort();
  for (const base of sortedBases) {
    const picked = pickCanonicalFile(base, byBase.get(base)!);
    if (!picked) {
      continue;
    }
    const raw = await readFile(join(materialDir, picked), 'utf8');
    await writeFile(join(iconsOut, `${base}.svg`), raw, 'utf8');

    const categoryId = categorize(base, rules, overrides);
    categoryBuckets.get(categoryId)?.push(base);
    if (!categoryBuckets.has(categoryId)) {
      categoryBuckets.set(categoryId, [base]);
    }

    const aliasEntries = Object.entries(BUILTIN_ALIASES).filter(([, target]) => target === base);
    icons[base] = {
      file: `${base}.svg`,
      label: humanize(base),
      ...(aliasEntries.length > 0
        ? { aliases: aliasEntries.map(([alias]) => alias) }
        : {}),
      tags: [categoryId],
    };
  }

  for (const [alias, target] of Object.entries(BUILTIN_ALIASES)) {
    if (!icons[target]) {
      throw new Error(`Alias target missing: ${alias} -> ${target}`);
    }
    const entry = icons[target]!;
    const aliases = new Set(entry.aliases ?? []);
    aliases.add(alias);
    entry.aliases = [...aliases];
  }

  const fluentIconCount = existsSync(fluentDir)
    ? await mergeFluentIcons(icons, categoryBuckets, rules, overrides, iconsOut)
    : 0;

  const iconCount = Object.keys(icons).length;
  if (iconCount < MIN_ICON_COUNT) {
    throw new Error(`Expected at least ${MIN_ICON_COUNT} icons, got ${iconCount}`);
  }

  const categories = rules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    icons: (categoryBuckets.get(rule.id) ?? []).sort(),
  }));

  const version = createHash('sha256')
    .update(String(iconCount))
    .update(sortedBases.join(','))
    .update(String(fluentIconCount))
    .digest('hex')
    .slice(0, 12);

  const manifest = {
    id: 'default',
    version,
    label: 'Default (Material + Fluent)',
    license: {
      name: 'Apache-2.0 / MIT (Fluent UI)',
      url: 'https://www.apache.org/licenses/LICENSE-2.0',
    },
    categories,
    icons,
  };

  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const agentsManifest = {
    id: 'default',
    version,
    label: manifest.label,
    count: iconCount,
    aliases: BUILTIN_ALIASES,
    categories: categories.map((category) => ({
      id: category.id,
      label: category.label,
      description: rules.find((rule) => rule.id === category.id)?.label ?? category.label,
      examples: category.icons.slice(0, 12),
    })),
  };

  await writeFile(
    join(outDir, 'manifest.agents.json'),
    `${JSON.stringify(agentsManifest, null, 2)}\n`,
    'utf8',
  );

  return iconCount;
}

async function mergeFluentIcons(
  icons: Record<
    string,
    { file: string; label?: string; aliases?: string[]; tags?: string[] }
  >,
  categoryBuckets: Map<string, string[]>,
  rules: CategoryRule[],
  overrides: Record<string, string>,
  iconsOut: string,
): Promise<number> {
  const allFiles = (await readdir(fluentDir)).filter((name) => name.endsWith('.svg'));
  const byBase = new Map<string, string[]>();
  for (const file of allFiles) {
    const base = fluentBaseName(file);
    const list = byBase.get(base) ?? [];
    list.push(file);
    byBase.set(base, list);
  }

  let added = 0;
  for (const base of [...byBase.keys()].sort()) {
    if (icons[base]) {
      continue;
    }

    const picked = pickCanonicalFluentFile(base, byBase.get(base)!);
    if (!picked) {
      continue;
    }

    const raw = await readFile(join(fluentDir, picked), 'utf8');
    await writeFile(join(iconsOut, `${base}.svg`), raw, 'utf8');

    const categoryId = categorize(base, rules, overrides);
    categoryBuckets.get(categoryId)?.push(base);
    if (!categoryBuckets.has(categoryId)) {
      categoryBuckets.set(categoryId, [base]);
    }

    icons[base] = {
      file: `${base}.svg`,
      label: humanize(base),
      aliases: fluentAliases(base),
      tags: [categoryId, 'fluent'],
    };
    added += 1;
  }

  return added;
}

function fluentAliases(slug: string): string[] | undefined {
  const aliases = new Set<string>();
  for (const token of slug.split('-')) {
    if (token.length >= 4) {
      aliases.add(token);
    }
  }
  return aliases.size > 0 ? [...aliases].slice(0, 12) : undefined;
}

async function buildStreamlinePack(
  rules: CategoryRule[],
  overrides: Record<string, string>,
): Promise<number> {
  const streamlineOutDir = join(pkgRoot, 'src/renderer/assets/icon-packs/streamline');
  const iconsOut = join(streamlineOutDir, 'icons');
  const files = (await readdir(streamlineDir)).filter((name) => name.endsWith('.svg')).sort();
  const icons: Record<
    string,
    { file: string; label?: string; aliases?: string[]; tags?: string[] }
  > = {};
  const categoryBuckets = new Map<string, string[]>();
  for (const rule of rules) {
    categoryBuckets.set(rule.id, []);
  }

  await mkdir(iconsOut, { recursive: true });

  for (const file of files) {
    const slug = file.replace(/\.svg$/i, '');
    const raw = await readFile(join(streamlineDir, file), 'utf8');
    await writeFile(join(iconsOut, file), raw, 'utf8');

    const categoryId = categorize(slug, rules, overrides);
    categoryBuckets.get(categoryId)?.push(slug);
    if (!categoryBuckets.has(categoryId)) {
      categoryBuckets.set(categoryId, [slug]);
    }

    icons[slug] = {
      file,
      label: humanize(slug),
      aliases: streamlineAliases(slug),
      tags: [categoryId],
    };
  }

  const iconCount = Object.keys(icons).length;
  if (iconCount < STREAMLINE_MIN_ICON_COUNT) {
    throw new Error(`Expected at least ${STREAMLINE_MIN_ICON_COUNT} Streamline icons, got ${iconCount}`);
  }

  const categories = rules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    icons: (categoryBuckets.get(rule.id) ?? []).sort(),
  }));

  const version = createHash('sha256')
    .update(String(iconCount))
    .update(files.join(','))
    .digest('hex')
    .slice(0, 12);

  const manifest = {
    id: 'streamline',
    version,
    label: 'Streamline',
    license: {
      name: 'Streamline',
      url: 'https://www.streamlinehq.com/',
    },
    categories,
    icons,
  };

  await writeFile(join(streamlineOutDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const agentsManifest = {
    id: 'streamline',
    version,
    label: manifest.label,
    count: iconCount,
    aliases: {},
    categories: categories.map((category) => ({
      id: category.id,
      label: category.label,
      description: rules.find((rule) => rule.id === category.id)?.label ?? category.label,
      examples: category.icons.slice(0, 12),
    })),
  };

  await writeFile(
    join(streamlineOutDir, 'manifest.agents.json'),
    `${JSON.stringify(agentsManifest, null, 2)}\n`,
    'utf8',
  );

  return iconCount;
}

function streamlineAliases(slug: string): string[] | undefined {
  const aliases = new Set<string>();
  const stripped = slug
    .replace(/-(solid|remix)$/i, '')
    .replace(/^interface-/i, '')
    .replace(/^programming-/i, '')
    .replace(/^computer-/i, '')
    .replace(/^layout-/i, '');
  if (stripped !== slug) {
    aliases.add(stripped);
  }

  for (const token of slug.split('-')) {
    if (token.length >= 4) {
      aliases.add(token);
    }
  }

  return aliases.size > 0 ? [...aliases].slice(0, 12) : undefined;
}

await main();
