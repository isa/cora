interface GridPoint { x: number; y: number }

function cleanSpikesAndCollinear(points: GridPoint[]): GridPoint[] {
  if (points.length < 2) return points;
  let cleaned: GridPoint[] = [];
  
  for (const pt of points) {
    if (cleaned.length > 0) {
      const last = cleaned[cleaned.length - 1]!;
      if (last.x === pt.x && last.y === pt.y) continue;
    }
    
    // We might need to check if the new point makes the LAST TWO collinear.
    // If we pop, we might create a NEW collinear set. So we should use a while loop!
    while (cleaned.length >= 2) {
      const prev = cleaned[cleaned.length - 2]!;
      const curr = cleaned[cleaned.length - 1]!;
      
      if ((prev.x === curr.x && curr.x === pt.x) || (prev.y === curr.y && curr.y === pt.y)) {
        cleaned.pop(); // remove curr
      } else {
        break;
      }
    }
    
    // After popping collinear, if pt is the same as the new last, skip it
    if (cleaned.length > 0) {
      const last = cleaned[cleaned.length - 1]!;
      if (last.x === pt.x && last.y === pt.y) continue;
    }
    
    cleaned.push(pt);
  }
  
  return cleaned;
}

const pts = [
  { "x": 59, "y": 4 },
  { "x": 48, "y": 4 },
  { "x": 48, "y": 4 },
  { "x": 48, "y": 3 },
  { "x": 22, "y": 3 },
  { "x": 22, "y": 4 },
  { "x": 22, "y": 3 },
  { "x": 15, "y": 3 }
];

console.log(cleanSpikesAndCollinear(pts));
