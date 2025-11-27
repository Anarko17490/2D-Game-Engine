

import { GameGenreType, GameViewType, GameObject, GameEvent, Variable } from '../types';

export interface GenrePreset {
  name: string;
  description: string;
  view: GameViewType;
  gridSize: number;
  starterObjects: Partial<GameObject>[];
  starterEvents: Partial<GameEvent>[];
  variables: Partial<Variable>[];
}

export const GENRE_PRESETS: Record<GameGenreType, GenrePreset> = {
  PLATFORMER: {
    name: 'Platformer',
    description: 'Side-scrolling action. Jump, run, and collect items.',
    view: 'SIDE',
    gridSize: 32,
    variables: [
      { name: 'Score', initialValue: 0, scope: 'global' },
      { name: 'Lives', initialValue: 3, scope: 'global' }
    ],
    starterObjects: [
      { name: 'Player', type: 'Player', x: 100, y: 300, width: 32, height: 32, color: '#3b82f6', hasGravity: true, hasCollision: true },
      { name: 'Ground', type: 'Wall', x: 0, y: 500, width: 800, height: 40, color: '#64748b', hasCollision: true },
      { name: 'Platform 1', type: 'Wall', x: 200, y: 400, width: 120, height: 20, color: '#64748b', hasCollision: true },
      { name: 'Platform 2', type: 'Wall', x: 450, y: 300, width: 120, height: 20, color: '#64748b', hasCollision: true },
      { name: 'Enemy', type: 'Enemy', x: 500, y: 268, width: 32, height: 32, color: '#ef4444', hasGravity: true, hasCollision: true, autoMove: { enabled: true, speedX: 2, speedY: 0, loop: true, range: 100 } },
      { name: 'Coin 1', type: 'Coin', x: 250, y: 350, width: 20, height: 20, color: '#eab308' }
    ],
    starterEvents: [
      { condition: { type: 'ALWAYS' }, action: { type: 'GRAVITY', target: 'Player', param: 0.5 } },
      { condition: { type: 'KEY_PRESSED', param: 'ArrowRight' }, action: { type: 'MOVE_X', target: 'Player', param: 5 } },
      { condition: { type: 'KEY_PRESSED', param: 'ArrowLeft' }, action: { type: 'MOVE_X', target: 'Player', param: -5 } },
      { condition: { type: 'KEY_PRESSED', param: 'Space' }, action: { type: 'JUMP', target: 'Player', param: -12 } },
      { condition: { type: 'COLLISION', target: 'Player', param: 'Coin' }, action: { type: 'DESTROY', target: 'OTHER' } },
      { condition: { type: 'COLLISION', target: 'Player', param: 'Coin' }, action: { type: 'VAR_ADD', variableId: 'Score', value: 10, target: 'SELF' } }, 
      { condition: { type: 'COLLISION', target: 'Player', param: 'Enemy' }, action: { type: 'VAR_SUB', variableId: 'Lives', value: 1, target: 'SELF' } }
    ]
  },
  RPG: {
    name: 'RPG Top-Down',
    description: 'Top-down adventure. Move in 4 directions, explore, and talk.',
    view: 'TOP_DOWN',
    gridSize: 32,
    variables: [
       { name: 'Gold', initialValue: 0, scope: 'global' },
       { name: 'HP', initialValue: 100, scope: 'global' }
    ],
    starterObjects: [
      { name: 'Hero', type: 'Player', x: 400, y: 300, width: 32, height: 32, color: '#3b82f6', hasCollision: true },
      { name: 'House', type: 'Wall', x: 100, y: 100, width: 100, height: 100, color: '#64748b', hasCollision: true },
      { name: 'Tree 1', type: 'Wall', x: 600, y: 100, width: 40, height: 40, color: '#22c55e', hasCollision: true },
      { name: 'Tree 2', type: 'Wall', x: 650, y: 150, width: 40, height: 40, color: '#22c55e', hasCollision: true },
      { name: 'Villager', type: 'Sprite', x: 400, y: 200, width: 32, height: 32, color: '#a855f7', hasCollision: true }
    ],
    starterEvents: [
      { condition: { type: 'KEY_PRESSED', param: 'ArrowRight' }, action: { type: 'MOVE_X', target: 'Player', param: 4 } },
      { condition: { type: 'KEY_PRESSED', param: 'ArrowLeft' }, action: { type: 'MOVE_X', target: 'Player', param: -4 } },
      { condition: { type: 'KEY_PRESSED', param: 'ArrowUp' }, action: { type: 'MOVE_Y', target: 'Player', param: -4 } },
      { condition: { type: 'KEY_PRESSED', param: 'ArrowDown' }, action: { type: 'MOVE_Y', target: 'Player', param: 4 } },
    ]
  },
  RACING: {
    name: 'Racing',
    description: 'High speed movement within track boundaries.',
    view: 'TOP_DOWN',
    gridSize: 64,
    variables: [
        { name: 'Lap', initialValue: 1, scope: 'global' }
    ],
    starterObjects: [
        { name: 'Car', type: 'Player', x: 400, y: 500, width: 32, height: 64, color: '#ef4444', hasCollision: true },
        { name: 'Wall L', type: 'Wall', x: 100, y: 0, width: 20, height: 600, color: '#334155', hasCollision: true },
        { name: 'Wall R', type: 'Wall', x: 680, y: 0, width: 20, height: 600, color: '#334155', hasCollision: true },
        { name: 'Obstacle', type: 'Wall', x: 300, y: 300, width: 64, height: 64, color: '#334155', hasCollision: true }
    ],
    starterEvents: [
        { condition: { type: 'KEY_PRESSED', param: 'ArrowRight' }, action: { type: 'MOVE_X', target: 'Player', param: 8 } },
        { condition: { type: 'KEY_PRESSED', param: 'ArrowLeft' }, action: { type: 'MOVE_X', target: 'Player', param: -8 } },
        { condition: { type: 'KEY_PRESSED', param: 'ArrowUp' }, action: { type: 'MOVE_Y', target: 'Player', param: -15 } },
        { condition: { type: 'KEY_PRESSED', param: 'ArrowDown' }, action: { type: 'MOVE_Y', target: 'Player', param: 5 } },
        { condition: { type: 'COLLISION', target: 'Player', param: 'Wall' }, action: { type: 'REVERSE_X', target: 'SELF' } } // Bounce
    ]
  },
  SHOOTER: {
    name: 'Shooter (Top-Down)',
    description: 'Move and dodge enemies. Press X to shoot.',
    view: 'TOP_DOWN',
    gridSize: 32,
    variables: [
        { name: 'Score', initialValue: 0, scope: 'global' }
    ],
    starterObjects: [
        { 
            name: 'Hero', type: 'Player', x: 400, y: 300, width: 32, height: 32, color: '#3b82f6', hasCollision: true,
            variables: { hp: 100 },
            variableProps: { hp: { showInHud: true } }
        },
        // Bullet Prefab (Fast, yellow, moves right automatically)
        { 
            name: 'Bullet', type: 'Sprite', x: 0, y: 0, width: 10, height: 10, color: '#fbbf24', 
            isPrefab: true, hasCollision: true, 
            autoMove: { enabled: true, speedX: 10, speedY: 0, loop: false, range: 800 } 
        },
        // Enemies with HP
        { 
            name: 'Zombie 1', type: 'Enemy', x: 100, y: 100, width: 32, height: 32, color: '#16a34a', 
            hasCollision: true, 
            variables: { hp: 10 },
            variableProps: { hp: { showInHud: true } },
            autoMove: { enabled: true, speedX: 2, speedY: 2, loop: true, range: 150 } 
        },
        {  
            name: 'Zombie 2', type: 'Enemy', x: 700, y: 500, width: 32, height: 32, color: '#16a34a', 
            hasCollision: true, 
            variables: { hp: 10 },
            variableProps: { hp: { showInHud: true } },
            autoMove: { enabled: true, speedX: -2, speedY: -1, loop: true, range: 150 } 
        },
        { name: 'Block', type: 'Wall', x: 200, y: 400, width: 100, height: 100, color: '#475569', hasCollision: true }
    ],
    starterEvents: [
        // Movement
        { condition: { type: 'KEY_PRESSED', param: 'w' }, action: { type: 'MOVE_Y', target: 'Player', param: -5 } },
        { condition: { type: 'KEY_PRESSED', param: 's' }, action: { type: 'MOVE_Y', target: 'Player', param: 5 } },
        { condition: { type: 'KEY_PRESSED', param: 'a' }, action: { type: 'MOVE_X', target: 'Player', param: -5 } },
        { condition: { type: 'KEY_PRESSED', param: 'd' }, action: { type: 'MOVE_X', target: 'Player', param: 5 } },
        
        // Shooting
        { 
            condition: { type: 'KEY_PRESSED', param: 'x' }, 
            action: { type: 'CREATE_OBJECT', prefabId: 'Bullet', target: 'Player', cooldown: 0.2 } 
        },

        // Bullet Impacts Enemy (Damage)
        { 
            condition: { type: 'COLLISION', target: 'Enemy', param: 'Sprite' }, 
            action: { type: 'OBJ_VAR_SUB', target: 'Enemy', variableName: 'hp', value: 5 } 
        },
        // Bullet Impacts Enemy (Destroy Bullet)
        { 
            condition: { type: 'COLLISION', target: 'Enemy', param: 'Sprite' }, 
            action: { type: 'DESTROY', target: 'Sprite' }
        },

        // Enemy Death Logic
        { 
            condition: { type: 'OBJ_VAR_COMPARE', target: 'Enemy', variableName: 'hp', value: 0 }, 
            action: { type: 'DESTROY', target: 'Enemy' } 
        },

        // Player Damaged by Enemy (HP -10)
        { 
            condition: { type: 'COLLISION', target: 'Player', param: 'Enemy' }, 
            action: { type: 'OBJ_VAR_SUB', target: 'Player', variableName: 'hp', value: 10 } 
        },
        
        // Player Death (HP <= 0)
        { 
            condition: { type: 'OBJ_VAR_COMPARE', target: 'Player', variableName: 'hp', value: 0 }, 
            action: { type: 'DESTROY', target: 'Player' } 
        }
    ]
  },
  TOWER_DEFENSE: {
    name: 'Tower Defense',
    description: 'Defend your base from waves of enemies. Place towers to stop them.',
    view: 'TOP_DOWN',
    gridSize: 32,
    variables: [
        { name: 'Money', initialValue: 100, scope: 'global' }
    ],
    starterObjects: [
        { 
            name: 'Base', type: 'Player', x: 700, y: 284, width: 64, height: 64, color: '#3b82f6', hasCollision: true, 
            variables: { hp: 100 }, variableProps: { hp: { showInHud: true } } 
        },
        { name: 'Spawner', type: 'Wall', x: 50, y: 300, width: 32, height: 32, color: '#94a3b8' },
        { name: 'Tower Up', type: 'Wall', x: 250, y: 400, width: 32, height: 32, color: '#22c55e', hasCollision: true },
        { name: 'Tower Down', type: 'Wall', x: 450, y: 200, width: 32, height: 32, color: '#22c55e', hasCollision: true },
        
        // Prefabs
        { 
            name: 'Enemy', type: 'Enemy', x: 0, y: 0, width: 24, height: 24, color: '#ef4444', 
            isPrefab: true, hasCollision: true, 
            variables: { hp: 30 }, variableProps: { hp: { showInHud: false } },
            autoMove: { enabled: true, speedX: 2, speedY: 0, loop: false, range: 1000 } 
        },
        { 
            name: 'BulletD', type: 'Sprite', x: 0, y: 0, width: 8, height: 8, color: '#fbbf24', 
            isPrefab: true, hasCollision: true, 
            autoMove: { enabled: true, speedX: 0, speedY: 8, loop: false, range: 600 } 
        },
        { 
            name: 'BulletU', type: 'Sprite', x: 0, y: 0, width: 8, height: 8, color: '#fbbf24', 
            isPrefab: true, hasCollision: true, 
            autoMove: { enabled: true, speedX: 0, speedY: -8, loop: false, range: 600 } 
        }
    ],
    starterEvents: [
        // Spawn Enemies
        { condition: { type: 'ALWAYS' }, action: { type: 'CREATE_OBJECT', prefabId: 'Enemy', target: 'Spawner', cooldown: 2.0 } },
        
        // Towers Shoot
        { condition: { type: 'ALWAYS' }, action: { type: 'CREATE_OBJECT', prefabId: 'BulletD', target: 'Tower Down', cooldown: 1.0 } },
        { condition: { type: 'ALWAYS' }, action: { type: 'CREATE_OBJECT', prefabId: 'BulletU', target: 'Tower Up', cooldown: 1.0 } },

        // Damage Logic (Bullet hits Enemy)
        { condition: { type: 'COLLISION', target: 'Enemy', param: 'Sprite' }, action: { type: 'OBJ_VAR_SUB', target: 'Enemy', variableName: 'hp', value: 10 } },
        { condition: { type: 'COLLISION', target: 'Enemy', param: 'Sprite' }, action: { type: 'DESTROY', target: 'Sprite' } },
        
        // Enemy Death
        { condition: { type: 'OBJ_VAR_COMPARE', target: 'Enemy', variableName: 'hp', value: 0 }, action: { type: 'DESTROY', target: 'Enemy' } },
        { condition: { type: 'OBJ_VAR_COMPARE', target: 'Enemy', variableName: 'hp', value: 0 }, action: { type: 'VAR_ADD', variableId: 'Money', value: 10, target: 'Player' } },

        // Base Damage (Enemy hits Base)
        { condition: { type: 'COLLISION', target: 'Base', param: 'Enemy' }, action: { type: 'OBJ_VAR_SUB', target: 'Base', variableName: 'hp', value: 20 } },
        { condition: { type: 'COLLISION', target: 'Base', param: 'Enemy' }, action: { type: 'DESTROY', target: 'Enemy' } },
        { condition: { type: 'OBJ_VAR_COMPARE', target: 'Base', variableName: 'hp', value: 0 }, action: { type: 'DESTROY', target: 'Base' } }
    ]
  }
};
