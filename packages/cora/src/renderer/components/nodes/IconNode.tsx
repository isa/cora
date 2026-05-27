import type { SvgIconComponent } from '../icons.js';
import type { BoxStyleProps, ComponentSize } from '../types.js';
import { CatalogFrame, CatalogIconSlot, CatalogText, resolvedCatalogFrame } from './shared.js';
import { resolveAppComponentSize } from '../styles.js';

export interface IconNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  size?: ComponentSize;
  strokeColor?: string;
  iconColor?: string;
  icon: SvgIconComponent;
  title?: string;
  subtitle?: string;
}

export function IconNode({
  icon,
  iconColor,
  strokeColor = 'currentColor',
  ...props
}: IconNodeProps) {
  const resolvedSize = resolveAppComponentSize(props.size, { width: 160, height: 128 });
  const frame = resolvedCatalogFrame({
    ...props,
    size: resolvedSize,
  });
  const ratio = frame.width / 160;

  const hasText = Boolean(frame.text || frame.subtitle);
  const titleFontSize = (frame.titleFontSize ?? 13) * ratio;
  const subtitleFontSize = (frame.subtitleFontSize ?? Math.max(8, (frame.titleFontSize ?? 13) - 2)) * ratio;
  const titleLines = frame.text ? String(frame.text).split(/\r?\n/) : [];
  const subtitleLines = frame.subtitle ? String(frame.subtitle).split(/\r?\n/) : [];
  const textHeight = hasText
    ? titleLines.length * titleFontSize * 1.25 +
      (subtitleLines.length > 0 ? 3 * ratio + subtitleLines.length * subtitleFontSize * 1.25 : 0)
    : 0;
  const iconGap = (hasText ? 8 : 0) * ratio;
  const verticalPadding = 18 * ratio;

  const iconSize = 87 * ratio;
  const iconY = frame.y + (hasText ? 9 * ratio : (frame.height - iconSize) / 2);
  const textY = iconY + iconSize + iconGap;
  const remainingTextHeight = Math.max(textHeight, frame.y + frame.height - textY - 6 * ratio);

  return (
    <CatalogFrame {...props} shadow={undefined}>
      <CatalogIconSlot
        icon={icon}
        x={frame.x + (frame.width - iconSize) / 2}
        y={iconY}
        size={iconSize}
        color={iconColor ?? strokeColor}
        title={frame.text}
      />
      {hasText ? (
        <CatalogText
          x={frame.x + 8}
          y={textY}
          width={frame.width - 16}
          height={remainingTextHeight}
          text={frame.text}
          subtitle={frame.subtitle}
          color={frame.textColor}
          subtitleColor={frame.subtitleColor}
          fontSize={titleFontSize}
          subtitleFontSize={subtitleFontSize}
        />
      ) : null}
    </CatalogFrame>
  );
}
