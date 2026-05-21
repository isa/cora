import { renderToStaticMarkup } from 'react-dom/server';

import type { LayoutedDiagram } from '../layout-ir.js';
import { Diagram } from './Diagram.js';

export function renderToSVG(layouted: LayoutedDiagram): string {
  let svg = renderToStaticMarkup(<Diagram diagram={layouted} />);

  if (!svg.includes('xmlns=')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return svg;
}

export { Diagram } from './Diagram.js';
export { defaultTheme, resolveNodeStyle } from './themes/default.js';
