import { parseIconReference, type IconReference } from '../core/iconify.js';

const searchCache = new Map<string, Promise<IconReference[]>>();

const PREFIX_RANK = [
  'material-symbols',
  'material-symbols-light',
  'ic',
  'mdi',
  'mdi-light',
  'line-md',
  'solar',
  'tabler',
  'lucide',
  'heroicons',
  'carbon',
  'ph',
  'ri',
  'mingcute',
  'boxicons',
];

const prefixRank = new Map(PREFIX_RANK.map((prefix, index) => [prefix, index]));

function searchScore(iconName: string, terms: string[]): number {
  const normalized = iconName.toLowerCase();
  const baseName = normalized
    .replace(/-(outline|outlined|rounded|round|sharp|filled|fill|solid|bold|light|thin|regular)$/, '')
    .replace(/^(baseline|outline|outlined|round|sharp|twotone)-/, '');
  const parts = baseName.split(/[^a-z0-9]+/).filter(Boolean);
  const matchedPartIndexes = new Set<number>();

  let score = 0;
  for (const term of terms) {
    const partMatches = parts
      .map((part, index) => ({ index, score: part === term ? 120 : part.startsWith(term) ? 75 : part.includes(term) ? 40 : 0 }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);

    if (partMatches[0]) {
      matchedPartIndexes.add(partMatches[0].index);
    }

    if (normalized === term) {
      score += 140;
    } else if (baseName === term) {
      score += 120;
    } else if (normalized.startsWith(term)) {
      score += 80;
    } else if (baseName.startsWith(term)) {
      score += 70;
    } else if (normalized.includes(term)) {
      score += 35;
    } else {
      return 0;
    }
  }

  if (terms.length > 1 && matchedPartIndexes.size >= terms.length) {
    score += 80;
  }
  if (normalized === baseName) {
    score += 14;
  }
  if (normalized.length < 24) {
    score += 4;
  }

  return score;
}

export function searchPreviewIcons(query: string, limit?: number): Promise<IconReference[]> {
  const normalized = query.trim();
  if (!normalized) {
    return Promise.resolve([]);
  }

  const cacheKey = `${normalized}\0${limit ?? 'all'}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const terms = normalized
    .toLowerCase()
    .split(/[\s:_-]+/)
    .filter(Boolean);

  const request = import('./iconIndex.generated.js')
    .then(({ iconSearchIndex }) => Object.entries(iconSearchIndex)
      .flatMap(([prefix, names]) => names
        .map((name) => ({
          fullName: `${prefix}:${name}`,
          name,
          prefix,
          score: searchScore(name, terms),
        }))
        .filter((item) => item.score > 0))
      .sort((a, b) => {
        const rankDiff = (prefixRank.get(a.prefix) ?? 999) - (prefixRank.get(b.prefix) ?? 999);
        return b.score - a.score || rankDiff || a.fullName.localeCompare(b.fullName);
      })
      .slice(0, limit)
      .map((item) => parseIconReference(item.fullName))
      .filter((reference): reference is IconReference => reference !== undefined))
    .catch(() => []);

  searchCache.set(cacheKey, request);
  return request;
}
