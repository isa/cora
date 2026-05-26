import type { IconCatalogEntry } from '../../renderer/iconPacks/types.js';
import type { PackManifest } from '../pack/types.js';

export function filterComponents(
  pack: PackManifest,
  query: string,
): Array<{ id: string; label: string; family: string }> {
  const needle = query.trim().toLowerCase();
  const items = [
    ...pack.components.map((component) => ({
      id: component.id,
      label: component.label,
      family: pack.families.find((item) => item.id === component.family)?.label ?? component.family,
    })),
    { id: 'group', label: 'Group', family: 'Layout' },
  ];

  if (!needle) {
    return items;
  }

  return items.filter((item) =>
    `${item.label} ${item.id} ${item.family}`.toLowerCase().includes(needle),
  );
}

export function filterItems(
  entries: IconCatalogEntry[],
  query: string,
  activeCategoryKey?: string,
): IconCatalogEntry[] {
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const dedupeKey = `${entry.provider}:${entry.service}`;
    if (seen.has(dedupeKey)) {
      return false;
    }

    if (activeCategoryKey) {
      const [provider, categoryId] = activeCategoryKey.split(':');
      if (entry.provider !== provider || !entry.categoryIds.includes(categoryId!)) {
        return false;
      }
    }

    if (!needle) {
      seen.add(dedupeKey);
      return true;
    }

    const haystack = [
      entry.service,
      entry.provider,
      entry.packLabel,
      entry.label,
      ...(entry.aliases ?? []),
      ...(entry.tags ?? []),
      ...entry.categoryIds,
      ...entry.categoryLabels,
      `${entry.provider}:${entry.service}`,
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(needle)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}
