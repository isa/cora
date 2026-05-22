import type { BoxStyleProps } from '../types.js';
import { CatalogFrame, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface AppNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

export function AppNode(props: AppNodeProps) {
  const frame = resolvedCatalogFrame(props);
  const headerHeight = Math.min(20, frame.height * 0.32);
  const contentY = frame.y + headerHeight;

  return (
    <CatalogFrame {...props}>
      <rect x={frame.x} y={frame.y} width={frame.width} height={headerHeight} rx={frame.radius} ry={frame.radius} fill={frame.borderColor ?? '#cbd5e1'} opacity="0.35" />
      <circle cx={frame.x + 12} cy={frame.y + headerHeight / 2} r="2" fill={frame.borderColor ?? '#94a3b8'} />
      <circle cx={frame.x + 20} cy={frame.y + headerHeight / 2} r="2" fill={frame.borderColor ?? '#94a3b8'} />
      <CatalogText
        x={frame.x}
        y={contentY}
        width={frame.width}
        height={frame.height - headerHeight}
        text={frame.text}
        color={frame.textColor}
      />
    </CatalogFrame>
  );
}
