import { icons as materialSymbolsIcons } from '@iconify-json/material-symbols';
import type { IconifyIcon, IconifyJSON } from '@iconify/types';
import { getIconData } from '@iconify/utils/lib/icon-set/get-icon';

import type { DiagramNode } from './types.js';

export const DEFAULT_ICON_PREFIX = 'material-symbols';

const ICON_SETS: Record<string, IconifyJSON> = {
  [DEFAULT_ICON_PREFIX]: materialSymbolsIcons,
  default: materialSymbolsIcons,
};

const PROVIDER_ALIASES: Record<string, string> = {
  default: DEFAULT_ICON_PREFIX,
  material: DEFAULT_ICON_PREFIX,
  'material-design': DEFAULT_ICON_PREFIX,
  'material-symbols': DEFAULT_ICON_PREFIX,
};

export interface IconReference {
  prefix: string;
  name: string;
  fullName: string;
}

export function parseIconReference(value: string): IconReference | undefined {
  const trimmed = value.trim();
  const separator = trimmed.indexOf(':');

  if (separator <= 0 || separator === trimmed.length - 1) {
    return undefined;
  }

  const prefix = trimmed.slice(0, separator);
  const name = trimmed.slice(separator + 1);

  return {
    prefix,
    name,
    fullName: `${prefix}:${name}`,
  };
}

export function iconPrefixForProvider(provider: string): string | undefined {
  return PROVIDER_ALIASES[provider] ?? provider;
}

export function iconReferenceForNode(node: Pick<DiagramNode, 'icon' | 'provider' | 'service'>): string | undefined {
  if (node.icon?.trim()) {
    return node.icon.trim();
  }

  if (!node.provider || !node.service) {
    return undefined;
  }

  const prefix = iconPrefixForProvider(node.provider);
  return prefix ? `${prefix}:${node.service}` : undefined;
}

export function iconSetForPrefix(prefix: string): IconifyJSON | undefined {
  return ICON_SETS[prefix];
}

export function resolveIconData(iconName: string): IconifyIcon | undefined {
  const reference = parseIconReference(iconName);
  if (!reference) {
    return undefined;
  }

  const iconSet = iconSetForPrefix(reference.prefix);
  if (!iconSet) {
    return undefined;
  }

  return getIconData(iconSet, reference.name) ?? undefined;
}

export function hasIconReference(iconName: string): boolean {
  return resolveIconData(iconName) !== undefined;
}

function searchScore(iconName: string, terms: string[]): number {
  const normalized = iconName.toLowerCase();
  const baseName = normalized
    .replace(/-(outline|rounded|sharp)$/, '')
    .replace(/-(fill|filled)$/, '');

  let score = 0;
  for (const term of terms) {
    if (normalized === term) {
      score += 120;
    } else if (baseName === term) {
      score += 100;
    } else if (normalized.startsWith(term)) {
      score += 70;
    } else if (normalized.includes(term)) {
      score += 35;
    } else {
      return 0;
    }
  }

  if (normalized === baseName) {
    score += 12;
  }
  if (normalized.endsWith('-rounded')) {
    score += 8;
  }
  if (normalized.length < 24) {
    score += 4;
  }

  return score;
}

export function searchIconReferences(query: string, limit = 24): IconReference[] {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/[\s:_-]+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return [];
  }

  return Object.keys(materialSymbolsIcons.icons)
    .map((name) => ({ name, score: searchScore(name, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ name }) => ({
      prefix: DEFAULT_ICON_PREFIX,
      name,
      fullName: `${DEFAULT_ICON_PREFIX}:${name}`,
    }));
}
