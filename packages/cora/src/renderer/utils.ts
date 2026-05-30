export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

import { resolveSvgFontFamily } from './themes/diagramFonts.js';

export const FONT_FAMILY = resolveSvgFontFamily();
