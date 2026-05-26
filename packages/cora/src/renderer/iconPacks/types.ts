export interface IconPackManifest {
  id: string;
  version: string;
  label: string;
  license: { name: string; url?: string };
  categories: Array<{ id: string; label: string; icons: string[] }>;
  icons: Record<
    string,
    {
      file: string;
      label?: string;
      aliases?: string[];
      tags?: string[];
    }
  >;
}

export interface IconCatalogEntry {
  provider: string;
  service: string;
  packLabel: string;
  categoryIds: string[];
  categoryLabels: string[];
  label?: string;
  tags?: string[];
  aliases?: string[];
}

export interface InstalledIconPack {
  manifest: IconPackManifest;
  rootPath: string;
}
