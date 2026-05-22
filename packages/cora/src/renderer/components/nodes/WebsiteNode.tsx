import type { BoxStyleProps } from '../types.js';
import { CatalogFrame, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface WebsiteNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

export function WebsiteNode(props: WebsiteNodeProps) {
  const frame = resolvedCatalogFrame(props);
  const chromeHeight = Math.min(18, frame.height * 0.28);

  return (
    <CatalogFrame {...props}>
      <line x1={frame.x} y1={frame.y + chromeHeight} x2={frame.x + frame.width} y2={frame.y + chromeHeight} stroke={frame.borderColor ?? '#94a3b8'} strokeWidth="1" />
      <circle cx={frame.x + 10} cy={frame.y + chromeHeight / 2} r="2" fill={frame.borderColor ?? '#94a3b8'} />
      <circle cx={frame.x + 18} cy={frame.y + chromeHeight / 2} r="2" fill={frame.borderColor ?? '#94a3b8'} />
      <rect x={frame.x + 28} y={frame.y + chromeHeight / 2 - 3} width={Math.max(20, frame.width - 42)} height="6" rx="3" fill={frame.backgroundColor} stroke={frame.borderColor ?? '#94a3b8'} strokeWidth="0.75" />
      <CatalogText
        x={frame.x}
        y={frame.y + chromeHeight}
        width={frame.width}
        height={frame.height - chromeHeight}
        text={frame.text}
        color={frame.textColor}
      />
    </CatalogFrame>
  );
}
