const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

const crossMatchV = `      if (crossed && shiftedX !== p1.x) {
        let last = result[result.length - 1]!;
        const connectorY = findFreeConnectorRow(
          last.y,
          Math.min(last.x, shiftedX),
          Math.max(last.x, shiftedX),
          gridNodes,
          gridGroups,
          srcNodeId,
          tgtNodeId,
          p2.y - p1.y,
        );
        if (connectorY !== last.y && last.x === p1.x && last.y === p1.y && result.length > 1) {
          result.pop();
          last = result[result.length - 1]!;
        }
        if (last.y !== connectorY) {
          result.push({ x: last.x, y: connectorY });
        }
        if (last.x !== shiftedX) {
          result.push({ x: shiftedX, y: connectorY });
        }
        result.push({ x: shiftedX, y: p2.y });
      } else {
        result.push({ ...p2 });
      }`;

const crossReplaceV = `      if (crossed && shiftedX !== p1.x) {
        let last = result[result.length - 1]!;
        const connectorY = findFreeConnectorRow(
          last.y,
          Math.min(last.x, shiftedX),
          Math.max(last.x, shiftedX),
          gridNodes,
          gridGroups,
          srcNodeId,
          tgtNodeId,
          p2.y - p1.y,
        );
        if (connectorY !== last.y && last.x === p1.x && last.y === p1.y && result.length > 1) {
          result.pop();
          last = result[result.length - 1]!;
        }
        if (last.y !== connectorY) {
          result.push({ x: last.x, y: connectorY });
        }
        if (last.x !== shiftedX) {
          result.push({ x: shiftedX, y: connectorY });
        }
        const isPreserveInfra = layouted.kind === 'infra';
        const isLastSegment = (i === points.length - 2);
        if (!isPreserveInfra && isLastSegment && shiftedX !== p2.x) {
           const returnY = p2.y + (p1.y <= p2.y ? -1 : 1);
           result.push({ x: shiftedX, y: returnY });
           result.push({ x: p2.x, y: returnY });
           result.push({ ...p2 });
        } else {
           result.push({ x: shiftedX, y: p2.y });
        }
      } else {
        result.push({ ...p2 });
      }`;

code = code.replace(crossMatchV, crossReplaceV);

const crossMatchH = `      if (crossed && shiftedY !== p1.y) {
        let last = result[result.length - 1]!;
        const connectorX = findFreeConnectorColumn(
          last.x,
          Math.min(last.y, shiftedY),
          Math.max(last.y, shiftedY),
          gridNodes,
          gridGroups,
          srcNodeId,
          tgtNodeId,
          p2.x - p1.x,
        );
        if (connectorX !== last.x && last.x === p1.x && last.y === p1.y && result.length > 1) {
          result.pop();
          last = result[result.length - 1]!;
        }
        if (last.x !== connectorX) {
          result.push({ x: connectorX, y: last.y });
        }
        if (last.y !== shiftedY) {
          result.push({ x: connectorX, y: shiftedY });
        }
        result.push({ x: p2.x, y: shiftedY });
      } else {
        result.push({ ...p2 });
      }`;

const crossReplaceH = `      if (crossed && shiftedY !== p1.y) {
        let last = result[result.length - 1]!;
        const connectorX = findFreeConnectorColumn(
          last.x,
          Math.min(last.y, shiftedY),
          Math.max(last.y, shiftedY),
          gridNodes,
          gridGroups,
          srcNodeId,
          tgtNodeId,
          p2.x - p1.x,
        );
        if (connectorX !== last.x && last.x === p1.x && last.y === p1.y && result.length > 1) {
          result.pop();
          last = result[result.length - 1]!;
        }
        if (last.x !== connectorX) {
          result.push({ x: connectorX, y: last.y });
        }
        if (last.y !== shiftedY) {
          result.push({ x: connectorX, y: shiftedY });
        }
        const isPreserveInfra = layouted.kind === 'infra';
        const isLastSegment = (i === points.length - 2);
        if (!isPreserveInfra && isLastSegment && shiftedY !== p2.y) {
           const returnX = p2.x + (p1.x <= p2.x ? -1 : 1);
           result.push({ x: returnX, y: shiftedY });
           result.push({ x: returnX, y: p2.y });
           result.push({ ...p2 });
        } else {
           result.push({ x: p2.x, y: shiftedY });
        }
      } else {
        result.push({ ...p2 });
      }`;

code = code.replace(crossMatchH, crossReplaceH);
fs.writeFileSync(path, code);
