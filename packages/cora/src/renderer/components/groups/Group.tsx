import { escapeXml, FONT_FAMILY } from '../../utils.js';
import type { GroupComponentProps, GroupStyleProps } from '../types.js';

function stringProp(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberProp(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function Group({
  group,
  theme,
  fillColor,
  labelColor,
  labelSize,
}: GroupComponentProps & GroupStyleProps) {
  const style = theme.shapes.group!;
  const groupStyle = group.style ?? {};
  const labelY = group.y - 8;
  const resolvedFill =
    fillColor ??
    stringProp(groupStyle.fillColor) ??
    stringProp(groupStyle.fill) ??
    style.fill;
  const resolvedLabelColor =
    labelColor ?? stringProp(groupStyle.labelColor) ?? theme.nodeLabel.fill;
  const resolvedLabelSize =
    labelSize ?? numberProp(groupStyle.labelSize) ?? theme.nodeLabel.fontSize;

  return (
    <g>
      <rect
        x={group.x}
        y={group.y}
        width={group.width}
        height={group.height}
        fill={resolvedFill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth ?? 1.5}
        strokeDasharray={style.strokeDasharray}
      />
      <text
        x={group.x + 8}
        y={labelY}
        fontFamily={FONT_FAMILY}
        fontSize={resolvedLabelSize}
        fontWeight={theme.nodeLabel.fontWeight}
        fill={resolvedLabelColor}
      >
        {escapeXml(group.label)}
      </text>
    </g>
  );
}
