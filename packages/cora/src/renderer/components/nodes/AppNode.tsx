import type { BoxStyleProps } from '../types.js';
import { CatalogFrame, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface AppNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

export function AppNode(props: AppNodeProps) {
  const frame = resolvedCatalogFrame(props);
  const headerHeight = Math.min(20, frame.height * 0.32);

  return (
    <CatalogFrame {...props}>
      <rect x={frame.x} y={frame.y} width={frame.width} height={headerHeight} rx={frame.radius} ry={frame.radius} fill={frame.borderColor ?? '#cbd5e1'} opacity="0.35" />
      <circle cx={frame.x + 12} cy={frame.y + headerHeight / 2} r="2" fill={frame.borderColor ?? '#94a3b8'} />
      <circle cx={frame.x + 20} cy={frame.y + headerHeight / 2} r="2" fill={frame.borderColor ?? '#94a3b8'} />
      <rect x={frame.x + 12} y={frame.y + headerHeight + 10} width={frame.width * 0.28} height={frame.height - headerHeight - 20} rx="3" fill={frame.borderColor ?? '#94a3b8'} opacity="0.18" />
      <CatalogText
        x={frame.x + frame.width * 0.28}
        y={frame.y + headerHeight}
        width={frame.width * 0.72}
        height={frame.height - headerHeight}
        text={frame.text}
        color={frame.textColor}
      />
    </CatalogFrame>
  );
}
