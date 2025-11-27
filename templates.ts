import { Scene } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface Template {
  name: string;
  description: string;
  scenes: Scene[];
}

export const TEMPLATES: Template[] = [
  {
    name: 'Empty Project',
    description: 'Start from scratch with a clean slate.',
    scenes: [
      { 
        id: uuidv4(), 
        name: 'Scene 1', 
        objects: [], 
        events: [],
        variables: []
      }
    ]
  },
  {
    name: 'Platformer Starter',
    description: 'A basic side-scrolling setup with gravity, jumping, enemies, and collectibles.',
    scenes: [
      {
        id: uuidv4(),
        name: 'Level 1',
        variables: [],
        objects: [
          // Player with HP initialized
          { id: uuidv4(), name: 'Player', type: 'Player', x: 100, y: 200, width: 32, height: 32, color: '#3b82f6', variables: { hp: 100 } },
          { id: uuidv4(), name: 'Ground', type: 'Wall', x: 0, y: 400, width: 800, height: 40, color: '#64748b' },
          { id: uuidv4(), name: 'Platform', type: 'Wall', x: 300, y: 280, width: 150, height: 20, color: '#64748b' },
          { id: uuidv4(), name: 'Coin 1', type: 'Coin', x: 350, y: 240, width: 20, height: 20, color: '#eab308' },
          { id: uuidv4(), name: 'Coin 2', type: 'Coin', x: 500, y: 350, width: 20, height: 20, color: '#eab308' },
          // Added Enemy
          { id: uuidv4(), name: 'Enemy', type: 'Enemy', x: 600, y: 368, width: 32, height: 32, color: '#ef4444', hasGravity: true, hasCollision: true, autoMove: { enabled: true, speedX: -2, speedY: 0, loop: true, range: 200 } },
        ],
        events: [
          { id: uuidv4(), condition: { type: 'ALWAYS' }, action: { type: 'GRAVITY', target: 'Player', param: 0.5 } },
          { id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowRight' }, action: { type: 'MOVE_X', target: 'Player', param: 5 } },
          { id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowLeft' }, action: { type: 'MOVE_X', target: 'Player', param: -5 } },
          { id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'Space' }, action: { type: 'JUMP', target: 'Player', param: -12 } },
          { id: uuidv4(), condition: { type: 'COLLISION', param: 'Coin' }, action: { type: 'DESTROY', target: 'OTHER' } },
          // Added Damage Event: Enemy touches Player -> Player.hp -= 5
          { 
            id: uuidv4(), 
            condition: { type: 'COLLISION', target: 'Enemy', param: 'Player' }, 
            action: { type: 'OBJ_VAR_SUB', target: 'Player', variableName: 'hp', value: 5 } 
          },
        ]
      }
    ]
  },
  {
    name: 'Top-Down Chase',
    description: 'Movement in all 4 directions with an enemy.',
    scenes: [
        {
            id: uuidv4(),
            name: 'Arena',
            variables: [],
            objects: [
              { id: uuidv4(), name: 'Player', type: 'Player', x: 400, y: 300, width: 32, height: 32, color: '#3b82f6' },
              { id: uuidv4(), name: 'Enemy', type: 'Enemy', x: 100, y: 100, width: 32, height: 32, color: '#ef4444' },
              { id: uuidv4(), name: 'Wall L', type: 'Wall', x: 50, y: 50, width: 20, height: 500, color: '#64748b' },
              { id: uuidv4(), name: 'Wall R', type: 'Wall', x: 730, y: 50, width: 20, height: 500, color: '#64748b' },
            ],
            events: [
              { id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowRight' }, action: { type: 'MOVE_X', target: 'Player', param: 5 } },
              { id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowLeft' }, action: { type: 'MOVE_X', target: 'Player', param: -5 } },
              { id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowUp' }, action: { type: 'MOVE_Y', target: 'Player', param: -5 } },
              { id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowDown' }, action: { type: 'MOVE_Y', target: 'Player', param: 5 } },
              { id: uuidv4(), condition: { type: 'COLLISION', param: 'Enemy' }, action: { type: 'DESTROY', target: 'SELF' } },
            ]
        }
    ]
  }
];