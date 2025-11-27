
import { GameViewType } from '../types';

export const toScreenCoords = (x: number, y: number, view: GameViewType = 'SIDE'): { x: number, y: number } => {
  if (view === 'ISO') {
    // Simple Isometric projection
    // To center it somewhat on screen, we might need offsets, but raw projection is:
    // ScreenX = X - Y
    // ScreenY = (X + Y) / 2
    // We add an offset (e.g. 400) to X to keep positive coordinates visible in center
    return {
      x: 400 + (x - y),
      y: (x + y) / 2
    };
  }
  return { x, y };
};

export const getZIndex = (y: number, height: number, view: GameViewType = 'SIDE'): number => {
  if (view === 'TOP_DOWN' || view === 'ISO') {
    // Depth sorting: Objects lower on screen (higher Y) draw on top
    return Math.floor(y + height); 
  }
  return 10; // Default flat z-index
};
