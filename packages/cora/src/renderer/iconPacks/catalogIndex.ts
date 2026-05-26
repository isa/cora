import type { IconCatalogEntry, InstalledIconPack } from './types.js';
import { resolveServiceSlug } from './registry.js';

export function buildIconCatalogIndex(packs: InstalledIconPack[]): IconCatalogEntry[] {
  const entries: IconCatalogEntry[] = [];

  for (const pack of packs) {
    const { manifest } = pack;
    const categoryLabelById = new Map(
      manifest.categories.map((category) => [category.id, category.label]),
    );
    const categoryIdsByIcon = new Map<string, string[]>();
    for (const category of manifest.categories) {
      for (const icon of category.icons) {
        const list = categoryIdsByIcon.get(icon) ?? [];
        list.push(category.id);
        categoryIdsByIcon.set(icon, list);
      }
    }

    for (const [slug, icon] of Object.entries(manifest.icons)) {
      const categoryIds = categoryIdsByIcon.get(slug) ?? icon.tags ?? ['other'];
      entries.push({
        provider: manifest.id,
        service: slug,
        packLabel: manifest.label,
        categoryIds,
        categoryLabels: categoryIds.map((id) => categoryLabelById.get(id) ?? id),
        label: icon.label,
        tags: icon.tags,
        aliases: icon.aliases,
      });
    }
  }

  return entries;
}

export function buildMergedCatalogJson(packs: InstalledIconPack[]): {
  packs: Array<{ id: string; label: string; version: string }>;
  entries: IconCatalogEntry[];
  categories: Array<{ key: string; provider: string; categoryId: string; label: string }>;
} {
  const entries = buildIconCatalogIndex(packs);
  const categories: Array<{ key: string; provider: string; categoryId: string; label: string }> = [];

  for (const pack of packs) {
    for (const category of pack.manifest.categories) {
      categories.push({
        key: `${pack.manifest.id}:${category.id}`,
        provider: pack.manifest.id,
        categoryId: category.id,
        label: category.label,
      });
    }
  }

  return {
    packs: packs.map((pack) => ({
      id: pack.manifest.id,
      label: pack.manifest.label,
      version: pack.manifest.version,
    })),
    entries,
    categories,
  };
}

export function lookupCatalogEntry(
  entries: IconCatalogEntry[],
  provider: string | undefined,
  service: string | undefined,
): IconCatalogEntry | undefined {
  if (!service) {
    return undefined;
  }
  const pack = provider ?? 'default';
  return entries.find(
    (entry) =>
      entry.provider === pack &&
      (entry.service === service || entry.aliases?.includes(service)),
  );
}

export { resolveServiceSlug };
