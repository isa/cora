export function shouldSnap(snapEnabled: boolean, shiftDown: boolean): boolean {
  return snapEnabled ? !shiftDown : shiftDown;
}
