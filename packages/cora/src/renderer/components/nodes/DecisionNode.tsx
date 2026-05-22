import type { BoxStyleProps } from '../types.js';
import { CatalogText, resolvedCatalogFrame } from './shared.js';

export interface DecisionNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

export function DecisionNode(props: DecisionNodeProps) {
  const frame = resolvedCatalogFrame(props);
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  const points = [
    `${cx},${frame.y}`,
    `${frame.x + frame.width},${cy}`,
    `${cx},${frame.y + frame.height}`,
    `${frame.x},${cy}`,
  ].join(' ');

  return (
    <g>
      <polygon
        points={points}
        fill={frame.backgroundColor}
        stroke={frame.borderColor}
        strokeWidth={frame.borderWidth}
        strokeDasharray={frame.borderDasharray}
        strokeLinejoin="round"
      />
      <CatalogText
        x={frame.x + frame.width * 0.18}
        y={frame.y}
        width={frame.width * 0.64}
        height={frame.height}
        text={frame.text}
        color={frame.textColor}
      />
    </g>
  );
}
