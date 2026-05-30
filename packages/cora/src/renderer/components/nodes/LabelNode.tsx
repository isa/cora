import type { BoxStyleProps } from '../types.js';
import { CatalogFrame, CatalogText, resolvedCatalogFrame } from './shared.js';

import { STANDALONE_LABEL_SIZE, NODE_SUBTITLE_SIZE } from '../../themes/fontTokens.js';

export interface LabelNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

export function LabelNode(props: LabelNodeProps) {
  const frame = resolvedCatalogFrame({
    backgroundColor: 'transparent',
    borderStyle: 'none',
    size: 'md',
    titleFontSize: STANDALONE_LABEL_SIZE,
    subtitleFontSize: NODE_SUBTITLE_SIZE,
    ...props,
  });

  return (
    <CatalogFrame {...props} shadow={undefined} backgroundColor={props.backgroundColor ?? 'transparent'} borderStyle={props.borderStyle ?? 'none'}>
      <CatalogText
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        text={frame.text}
        subtitle={frame.subtitle}
        color={frame.textColor}
        subtitleColor={frame.subtitleColor}
        fontSize={frame.titleFontSize}
        subtitleFontSize={frame.subtitleFontSize}
        fontFamily={frame.fontFamily}
        fontWeight={frame.titleBold ? 700 : 400}
        subtitleFontWeight={frame.subtitleBold ? 700 : 400}
      />
    </CatalogFrame>
  );
}
