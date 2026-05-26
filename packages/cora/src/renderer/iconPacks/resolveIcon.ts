import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createSvgIconFromAsset } from '../assets/icons/iconFromAsset.js';
import type { SvgIconComponent } from '../components/iconTypes.js';
import { WarningIcon } from '../components/fallbackIcon.js';
import { getIconPack, listIconPacks, resolveServiceSlug } from './registry.js';

const innerCache = new Map<string, string>();
const componentCache = new Map<string, SvgIconComponent>();

function cacheKey(provider: string, service: string): string {
  return `${provider}:${service}`;
}

function extractSvgInner(markup: string): string {
  const match = markup.match(/<svg[\s\S]*?>([\s\S]*)<\/svg>/i);
  return (match?.[1] ?? markup).trim();
}

function loadInnerMarkup(provider: string, slug: string): string | undefined {
  const key = cacheKey(provider, slug);
  if (innerCache.has(key)) {
    return innerCache.get(key);
  }

  const pack = getIconPack(provider);
  if (!pack) {
    return undefined;
  }

  const icon = pack.manifest.icons[slug];
  if (!icon) {
    return undefined;
  }

  const filePath = join(pack.rootPath, 'icons', icon.file);
  const raw = readFileSync(filePath, 'utf8');
  const inner = extractSvgInner(raw);
  innerCache.set(key, inner);
  return inner;
}

export function resolveIcon(
  provider: string | undefined,
  service: string | undefined,
): SvgIconComponent {
  const packId = provider ?? 'default';
  if (!service) {
    return WarningIcon;
  }

  const pack = getIconPack(packId);
  if (!pack) {
    return WarningIcon;
  }

  const slug = resolveServiceSlug(pack.manifest, service);
  if (!slug) {
    return WarningIcon;
  }

  const key = cacheKey(packId, slug);
  if (componentCache.has(key)) {
    return componentCache.get(key)!;
  }

  const inner = loadInnerMarkup(packId, slug);
  if (!inner) {
    return WarningIcon;
  }

  const component = createSvgIconFromAsset(inner);
  componentCache.set(key, component);
  return component;
}

export function preloadDefaultIconPack(): void {
  listIconPacks(true);
}
