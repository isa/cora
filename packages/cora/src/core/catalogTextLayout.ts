const AVG_GLYPH_WIDTH = 0.56;
export const CATALOG_TEXT_LINE_HEIGHT = 1.25;
export const CATALOG_TEXT_SUBTITLE_GAP = 3;

export interface CatalogTextLayoutOptions {
  text?: string;
  subtitle?: string;
  width: number;
  fontSize: number;
  subtitleFontSize?: number;
  paddingX?: number;
  minFontSize?: number;
  wrapText?: boolean;
}

export interface CatalogTextLayout {
  titleLines: string[];
  subtitleLines: string[];
  titleFontSize: number;
  subtitleFontSize: number;
  lineHeight: number;
  subtitleLineHeight: number;
  totalHeight: number;
  maxTextWidth: number;
  /** Width of the longest rendered line (title or subtitle), in px. */
  contentWidth: number;
  stillTooWide: boolean;
}

function estimatedLineWidth(text: string, fontSize: number): number {
  return text.length * fontSize * AVG_GLYPH_WIDTH;
}

function splitLongWord(word: string, maxChars: number): string[] {
  if (word.length <= maxChars) {
    return [word];
  }

  const chunks: string[] = [];
  for (let index = 0; index < word.length; index += maxChars) {
    chunks.push(word.slice(index, index + maxChars));
  }
  return chunks;
}

function wrapLine(line: string, maxChars: number): string[] {
  if (!line) {
    return [''];
  }

  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }

  const wrapped: string[] = [];
  let current = '';

  const pushWord = (word: string) => {
    if (!current) {
      current = word;
      return;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }

    wrapped.push(current);
    current = word;
  };

  for (const word of words) {
    const chunks = splitLongWord(word, maxChars);
    for (const chunk of chunks) {
      pushWord(chunk);
    }
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped.length > 0 ? wrapped : [''];
}

function wrapTextBlock(text: string | undefined, maxWidth: number, fontSize: number): string[] {
  if (!text) {
    return [];
  }

  const maxChars = Math.max(1, Math.floor(maxWidth / Math.max(fontSize * AVG_GLYPH_WIDTH, 1)));
  return text
    .split(/\r?\n/)
    .flatMap((line) => wrapLine(line, maxChars));
}

export function resolveCatalogTextLayout({
  text,
  subtitle,
  width,
  fontSize,
  subtitleFontSize,
  paddingX = 4,
  minFontSize = 9,
  wrapText = true,
}: CatalogTextLayoutOptions): CatalogTextLayout {
  const maxTextWidth = Math.max(1, width - paddingX * 2);
  const rawTitleLines = text ? text.split(/\r?\n/) : [];
  const longestTitleLine = rawTitleLines.reduce(
    (longest, line) => estimatedLineWidth(line, fontSize) > estimatedLineWidth(longest, fontSize) ? line : longest,
    '',
  );
  const fittedTitleFontSize = wrapText
    ? fontSize
    : estimatedLineWidth(longestTitleLine, fontSize) > maxTextWidth
      ? Math.max(minFontSize, maxTextWidth / Math.max(longestTitleLine.length * AVG_GLYPH_WIDTH, 1))
      : fontSize;
  const resolvedSubtitleFontSize = subtitleFontSize ?? Math.max(8, fittedTitleFontSize - 2);
  const titleLines = wrapText
    ? wrapTextBlock(text, maxTextWidth, fittedTitleFontSize)
    : rawTitleLines;
  const subtitleLines = wrapText
    ? wrapTextBlock(subtitle, maxTextWidth, resolvedSubtitleFontSize)
    : subtitle
      ? subtitle.split(/\r?\n/)
      : [];
  const lineHeight = fittedTitleFontSize * CATALOG_TEXT_LINE_HEIGHT;
  const subtitleLineHeight = resolvedSubtitleFontSize * CATALOG_TEXT_LINE_HEIGHT;
  const hasTitle = titleLines.length > 0;
  const hasSubtitle = subtitleLines.length > 0;
  const totalHeight =
    titleLines.length * lineHeight +
    (hasTitle && hasSubtitle ? CATALOG_TEXT_SUBTITLE_GAP : 0) +
    subtitleLines.length * subtitleLineHeight;
  const stillTooWide = !wrapText && estimatedLineWidth(longestTitleLine, fittedTitleFontSize) > maxTextWidth;
  const contentWidth = Math.max(
    0,
    ...titleLines.map((line) => estimatedLineWidth(line, fittedTitleFontSize)),
    ...subtitleLines.map((line) => estimatedLineWidth(line, resolvedSubtitleFontSize)),
  );

  return {
    titleLines,
    subtitleLines,
    titleFontSize: fittedTitleFontSize,
    subtitleFontSize: resolvedSubtitleFontSize,
    lineHeight,
    subtitleLineHeight,
    totalHeight,
    maxTextWidth,
    contentWidth,
    stillTooWide,
  };
}
