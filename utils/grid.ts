
export const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapRotation = (angle: number, snapAngle: number): number => {
  if (snapAngle <= 0) return angle;
  return Math.round(angle / snapAngle) * snapAngle;
};
