import type { SvgIconComponent } from '../icons.js';
import type { BoxStyleProps } from '../types.js';
import { CatalogFrame, CatalogIconSlot, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface LabelIconNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  icon: SvgIconComponent;
  iconColor?: string;
}

export function LabelIconNode(props: LabelIconNodeProps) {
  const frame = resolvedCatalogFrame(props);
  const iconSize = Math.min(22, frame.height * 0.45);
  const iconX = frame.x + 12;
  const labelX = frame.x + iconSize + 18;

  return (
    <CatalogFrame {...props}>
      <CatalogIconSlot
        icon={props.icon}
        x={iconX}
        y={frame.y + (frame.height - iconSize) / 2}
        size={iconSize}
        color={props.iconColor ?? frame.textColor}
      />
      <CatalogText
        x={labelX}
        y={frame.y}
        width={frame.width - iconSize - 24}
        height={frame.height}
        text={frame.text}
        color={frame.textColor}
      />
    </CatalogFrame>
  );
}
