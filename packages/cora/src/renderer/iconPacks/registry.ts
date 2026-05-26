import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { loadIconPackManifest } from './loadManifest.js';
import { bundledIconPacksRoot, extensionIconPacksRoot, packDir } from './paths.js';
import type { IconPackManifest, InstalledIconPack } from './types.js';

let cachedPacks: InstalledIconPack[] | undefined;

function discoverExtensionPacks(): InstalledIconPack[] {
  const root = extensionIconPacksRoot();
  if (!existsSync(root)) {
    return [];
  }

  const packs: InstalledIconPack[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const providerRoot = join(root, entry.name);
    const manifestPath = join(providerRoot, 'manifest.json');
    if (!existsSync(manifestPath)) {
      continue;
    }
    packs.push({
      manifest: loadIconPackManifest(providerRoot),
      rootPath: providerRoot,
    });
  }
  return packs;
}

function discoverBundledPacks(): InstalledIconPack[] {
  const root = bundledIconPacksRoot();
  const packs: InstalledIconPack[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const providerRoot = packDir(root, entry.name);
    const manifestPath = join(providerRoot, 'manifest.json');
    if (!existsSync(manifestPath)) {
      continue;
    }
    packs.push({
      manifest: loadIconPackManifest(providerRoot),
      rootPath: providerRoot,
    });
  }

  return packs.sort((left, right) => {
    if (left.manifest.id === 'default') return -1;
    if (right.manifest.id === 'default') return 1;
    return left.manifest.id.localeCompare(right.manifest.id);
  });
}

export function listIconPacks(force = false): InstalledIconPack[] {
  if (!force && cachedPacks) {
    return cachedPacks;
  }

  const bundledPacks = discoverBundledPacks();
  const bundledIds = new Set(bundledPacks.map((pack) => pack.manifest.id));
  const packs: InstalledIconPack[] = [
    ...bundledPacks,
    ...discoverExtensionPacks().filter((pack) => !bundledIds.has(pack.manifest.id)),
  ];

  cachedPacks = packs;
  return packs;
}

export function getIconPack(provider: string): InstalledIconPack | undefined {
  return listIconPacks().find((pack) => pack.manifest.id === provider);
}

export function resetIconPackCache(): void {
  cachedPacks = undefined;
}

export function resolveServiceSlug(
  manifest: IconPackManifest,
  service: string,
): string | undefined {
  if (manifest.icons[service]) {
    return service;
  }
  for (const [slug, icon] of Object.entries(manifest.icons)) {
    if (icon.aliases?.includes(service)) {
      return slug;
    }
  }
  return undefined;
}

export function isKnownServiceInPack(provider: string, service: string): boolean {
  const pack = getIconPack(provider);
  if (!pack) {
    return false;
  }
  return resolveServiceSlug(pack.manifest, service) !== undefined;
}
