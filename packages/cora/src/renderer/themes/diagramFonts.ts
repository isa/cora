/** Default diagram text face — bundled for PDF/SVG export. */
export const DEFAULT_DIAGRAM_FONT = 'Poppins';

/** Popular Google Fonts for architecture diagrams and SVG labels. */
export const DIAGRAM_FONT_OPTIONS = [
  'Poppins',
  'Roboto',
  'Open Sans',
  'Lato',
  'Inter',
  'Montserrat',
  'Noto Sans',
  'Source Sans 3',
  'Raleway',
  'Oswald',
] as const;

export type DiagramFontFamily = (typeof DIAGRAM_FONT_OPTIONS)[number];

export function resolveSvgFontFamily(fontFamily?: string): string {
  const family = fontFamily?.trim() || DEFAULT_DIAGRAM_FONT;
  return `'${family}', sans-serif`;
}

export function isDiagramFontFamily(value: string): value is DiagramFontFamily {
  return (DIAGRAM_FONT_OPTIONS as readonly string[]).includes(value);
}
