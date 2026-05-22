import type { BoxStyleProps } from '../types.js';
import { CatalogFrame, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface LabelNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

export function LabelNode(props: LabelNodeProps) {
  const frame = resolvedCatalogFrame({
    backgroundColor: 'transparent',
    borderStyle: 'none',
    size: 'md',
    ...props,
  });

  return (
    <CatalogFrame {...props} backgroundColor={props.backgroundColor ?? 'transparent'} borderStyle={props.borderStyle ?? 'none'}>
      <CatalogText
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        text={frame.text}
        color={frame.textColor}
      />
    </CatalogFrame>
  );
}
