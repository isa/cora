import type { SvgIconComponent } from '../icons.js';
import type { BoxStyleProps } from '../types.js';
import { CatalogFrame, CatalogIconSlot, CatalogText, resolvedCatalogFrame } from './shared.js';
import { resolveLabelIconComponentSize } from '../styles.js';

export interface LabelIconNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  icon: SvgIconComponent;
  iconColor?: string;
  iconType?: 'ok' | 'nok' | 'question-mark';
}

function StatusIcon({
  type,
  x,
  y,
  size,
  color,
}: {
  type: NonNullable<LabelIconNodeProps['iconType']>;
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  if (type === 'ok') {
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle cx={size / 2} cy={size / 2} r={size * 0.36} fill="none" stroke={color} strokeWidth="1.8" />
        <path d={`M ${size * 0.3} ${size * 0.52} L ${size * 0.45} ${size * 0.66} L ${size * 0.72} ${size * 0.36}`} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </g>
    );
  }

  if (type === 'nok') {
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle cx={size / 2} cy={size / 2} r={size * 0.36} fill="none" stroke={color} strokeWidth="1.8" />
        <path d={`M ${size * 0.35} ${size * 0.35} L ${size * 0.65} ${size * 0.65}`} stroke={color} strokeLinecap="round" strokeWidth="2" />
        <path d={`M ${size * 0.65} ${size * 0.35} L ${size * 0.35} ${size * 0.65}`} stroke={color} strokeLinecap="round" strokeWidth="2" />
      </g>
    );
  }

  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.36} fill="none" stroke={color} strokeWidth="1.8" />
      <path d={`M ${size * 0.38} ${size * 0.4} C ${size * 0.42} ${size * 0.28} ${size * 0.62} ${size * 0.3} ${size * 0.62} ${size * 0.45} C ${size * 0.62} ${size * 0.55} ${size * 0.5} ${size * 0.56} ${size * 0.5} ${size * 0.66}`} fill="none" stroke={color} strokeLinecap="round" strokeWidth="2" />
      <circle cx={size / 2} cy={size * 0.76} r={size * 0.035} fill={color} />
    </g>
  );
}

export function LabelIconNode(props: LabelIconNodeProps) {
  const resolvedSize = resolveLabelIconComponentSize(props.size, { width: 40, height: 40 });
  const frame = resolvedCatalogFrame({
    ...props,
    size: resolvedSize,
  });
  const ratio = frame.width / 40;
  const iconSize = props.iconType ? Math.min(frame.width, frame.height) * 0.62 : 24 * ratio;
  const iconColor = props.iconColor ?? frame.textColor;
  const filledBackground = props.backgroundColor && props.backgroundColor !== 'transparent'
    ? props.backgroundColor
    : undefined;
  const titleFontSize = (frame.titleFontSize ?? 11) * ratio;
  const subtitleFontSize = (frame.subtitleFontSize ?? Math.max(8, (frame.titleFontSize ?? 11) - 2)) * ratio;

  if (props.iconType) {
    return (
      <g>
        {filledBackground ? (
          <circle
            cx={frame.x + frame.width / 2}
            cy={frame.y + frame.height / 2}
            r={Math.min(frame.width, frame.height) / 2}
            fill={filledBackground}
          />
        ) : null}
        <StatusIcon
          type={props.iconType}
          x={frame.x + (frame.width - iconSize) / 2}
          y={frame.y + (frame.height - iconSize) / 2}
          size={iconSize}
          color={iconColor}
        />
      </g>
    );
  }

  const hasText = Boolean(frame.text || frame.subtitle);
  const titleLines = frame.text ? String(frame.text).split(/\r?\n/) : [];
  const subtitleLines = frame.subtitle ? String(frame.subtitle).split(/\r?\n/) : [];
  const textHeight = hasText
    ? titleLines.length * titleFontSize * 1.25 +
      (subtitleLines.length > 0 ? 3 * ratio + subtitleLines.length * subtitleFontSize * 1.25 : 0)
    : 0;
  const iconGap = (hasText ? 4 : 0) * ratio;
  const iconY = frame.y + (hasText ? 2 * ratio : (frame.height - iconSize) / 2);
  const textY = iconY + iconSize + iconGap;
  const remainingTextHeight = Math.max(textHeight, frame.y + frame.height - textY);

  const textWidth = Math.max(120, frame.width * 2.5);
  const textX = frame.x + frame.width / 2 - textWidth / 2;

  return (
    <CatalogFrame {...props} shadow={undefined}>
      <circle
        cx={frame.x + frame.width / 2}
        cy={iconY + iconSize / 2}
        r={iconSize / 2}
        fill="#FFFFFF"
      />
      <CatalogIconSlot
        icon={props.icon}
        x={frame.x + (frame.width - iconSize) / 2}
        y={iconY}
        size={iconSize}
        color={iconColor}
      />
      {hasText ? (
        <CatalogText
          x={textX}
          y={textY}
          width={textWidth}
          height={remainingTextHeight}
          text={frame.text}
          subtitle={frame.subtitle}
          color={frame.textColor}
          subtitleColor={frame.subtitleColor}
          fontSize={titleFontSize}
          subtitleFontSize={subtitleFontSize}
          fontWeight={frame.subtitle ? 600 : 400}
        />
      ) : null}
    </CatalogFrame>
  );
}
