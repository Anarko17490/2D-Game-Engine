
import { GameViewType } from '../types';

interface ViewPreset {
  label: string;
  description: string;
  gridSize: number;
  gravity: boolean; // Default for new objects
  defaultBehaviors: {
    hasGravity: boolean;
    hasCollision: boolean;
  };
}

export const GAME_VIEW_PRESETS: Record<GameViewType, ViewPreset> = {
  SIDE: {
    label: 'Side-Scroller',
    description: 'Classic platformer. Gravity enabled by default.',
    gridSize: 32,
    gravity: true,
    defaultBehaviors: { hasGravity: true, hasCollision: true },
  },
  TOP_DOWN: {
    label: 'Top-Down',
    description: 'RPG/Zelda style. X/Y movement. No gravity.',
    gridSize: 32,
    gravity: false,
    defaultBehaviors: { hasGravity: false, hasCollision: true },
  },
  ISO: {
    label: 'Isometric',
    description: '2.5D projection. Depth sorting enabled.',
    gridSize: 32, 
    gravity: false,
    defaultBehaviors: { hasGravity: false, hasCollision: true },
  }
};
