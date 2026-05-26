import { useEffect, useState } from 'react';

import type { IconCatalogEntry } from '../../renderer/iconPacks/types.js';

export interface IconCatalogPayload {
  packs: Array<{ id: string; label: string; version: string }>;
  entries: IconCatalogEntry[];
  categories: Array<{ key: string; provider: string; categoryId: string; label: string }>;
}

export function useIconCatalog() {
  const [catalog, setCatalog] = useState<IconCatalogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/icon-packs/catalog.json');
        if (!response.ok) {
          throw new Error(`Failed to load icon catalog (${response.status})`);
        }
        const payload = (await response.json()) as IconCatalogPayload;
        if (!cancelled) {
          setCatalog(payload);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load icons');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, error };
}
