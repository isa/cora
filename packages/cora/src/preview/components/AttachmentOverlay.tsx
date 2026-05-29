import type { AttachmentSlot, PreviewBox } from '../geometry.js';

interface AttachmentOverlayProps {
  slots: AttachmentSlot[];
  boxes: PreviewBox[];
  showLabels: boolean;
}

export function AttachmentOverlay({ slots, boxes, showLabels }: AttachmentOverlayProps) {
  if (!showLabels) {
    return null;
  }

  return (
    <g className="attachment-overlay" aria-label="Attachment overlay">
      {boxes.map((box, index) => (
        <g key={index} className="side-guides">
          <line x1={box.x} y1={box.y} x2={box.x + box.width} y2={box.y} />
          <line x1={box.x + box.width} y1={box.y} x2={box.x + box.width} y2={box.y + box.height} />
          <line x1={box.x} y1={box.y + box.height} x2={box.x + box.width} y2={box.y + box.height} />
          <line x1={box.x} y1={box.y} x2={box.x} y2={box.y + box.height} />
        </g>
      ))}
      {slots.map((slot) => (
        <g key={`${slot.nodeId}-${slot.label}`}>
          <circle cx={slot.x} cy={slot.y} r="2.75" className="slot-dot" />
          <text x={slot.x + 8} y={slot.y - 8} className="slot-label">
            {slot.label}
          </text>
        </g>
      ))}
    </g>
  );
}
