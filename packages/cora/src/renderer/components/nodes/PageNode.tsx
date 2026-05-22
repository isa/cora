import type { PageNodeProps as BasePageNodeProps } from '../types.js';
import { CatalogFrame, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface PageNodeProps extends BasePageNodeProps {
  x?: number;
  y?: number;
}

const TYPE_BANDS: Record<BasePageNodeProps['type'], number> = {
  landing: 0.36,
  form: 0.24,
  content: 0.18,
  profile: 0.3,
  settings: 0.22,
};

export function PageNode(props: PageNodeProps) {
  const frame = resolvedCatalogFrame({ size: 'lg', ...props });
  const skeletonColorDark = props.skeletonColorDark ?? '#94a3b8';
  const skeletonColorLight = props.skeletonColorLight ?? '#e2e8f0';
  const bandHeight = frame.height * TYPE_BANDS[props.type];
  const left = frame.x + 14;
  const width = frame.width - 28;

  return (
    <CatalogFrame {...props} size={props.size ?? 'lg'}>
      <rect x={left} y={frame.y + 12} width={width} height={bandHeight} rx="4" fill={skeletonColorLight} />
      <rect x={left} y={frame.y + 20} width={width * 0.55} height="6" rx="3" fill={skeletonColorDark} />
      <rect x={left} y={frame.y + bandHeight + 20} width={width * 0.8} height="5" rx="2.5" fill={skeletonColorLight} />
      <rect x={left} y={frame.y + bandHeight + 32} width={width * 0.62} height="5" rx="2.5" fill={skeletonColorLight} />
      <CatalogText
        x={frame.x}
        y={frame.y + frame.height - 26}
        width={frame.width}
        height={22}
        text={frame.text}
        color={frame.textColor}
        fontSize={12}
      />
    </CatalogFrame>
  );
}
