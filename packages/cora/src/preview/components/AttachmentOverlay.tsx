import { useState } from 'react';

import type { AttachmentSlot, PreviewBox } from '../geometry.js';

interface AttachmentOverlayProps {
  slots: AttachmentSlot[];
  boxes: PreviewBox[];
}

export function AttachmentOverlay({ slots, boxes }: AttachmentOverlayProps) {
  const [showLabels, setShowLabels] = useState(true);

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
        <g key={`${slot.role}-${slot.label}`}>
          <circle cx={slot.x} cy={slot.y} r="4" className="slot-dot" />
          {showLabels ? (
            <text x={slot.x + 8} y={slot.y - 8} className="slot-label">
              {slot.label}
            </text>
          ) : null}
        </g>
      ))}
      <foreignObject x="20" y="20" width="140" height="38">
        <button className="overlay-toggle" type="button" onClick={() => setShowLabels((value) => !value)}>
          Toggle labels
        </button>
      </foreignObject>
      <text x="-9999" y="-9999">top-1</text>
    </g>
  );
}
