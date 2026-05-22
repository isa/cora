import { escapeXml, FONT_FAMILY } from '../../utils.js';
import type { GroupComponentProps } from '../types.js';

export function Group({ group, theme }: GroupComponentProps) {
  const style = theme.shapes.group!;
  const labelY = group.y - 8;

  return (
    <g>
      <rect
        x={group.x}
        y={group.y}
        width={group.width}
        height={group.height}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth ?? 1.5}
        strokeDasharray={style.strokeDasharray}
      />
      <text
        x={group.x + 8}
        y={labelY}
        fontFamily={FONT_FAMILY}
        fontSize={theme.nodeLabel.fontSize}
        fontWeight={theme.nodeLabel.fontWeight}
        fill={theme.nodeLabel.fill}
      >
        {escapeXml(group.label)}
      </text>
    </g>
  );
}
