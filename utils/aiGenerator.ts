import { v4 as uuidv4 } from 'uuid';
import { CustomTemplate, GameEvent, GameObject, Variable, GameViewType, ConditionType, ActionType } from '../types';
import { snapToGrid } from './grid';

export const generateGameFromPrompt = (prompt: string): CustomTemplate => {
  const p = prompt.toLowerCase();
  
  // 1. Determine View/Genre
  let view: GameViewType = 'SIDE';
  let gridSize = 32;
  
  if (p.includes('top down') || p.includes('rpg') || p.includes('racing') || p.includes('car')) {
    view = 'TOP_DOWN';
  } else if (p.includes('iso') || p.includes('2.5d')) {
    view = 'ISO';
  }

  // 2. Setup Variables
  const variables: Variable[] = [];
  const objects: Partial<GameObject>[] = [];
  const events: Partial<GameEvent>[] = [];

  // Default Player
  const player: Partial<GameObject> = {
    id: uuidv4(),
    name: 'Player',
    type: 'Player',
    x: 100,
    y: 200,
    width: 32,
    height: 32,
    color: '#3b82f6',
    hasCollision: true,
    hasGravity: view === 'SIDE',
    variables: {} // Object scoped vars
  };

  // Movement Logic
  if (view === 'SIDE') {
      events.push({
          id: uuidv4(),
          condition: { type: 'ALWAYS' },
          action: { type: 'GRAVITY', target: 'Player', param: 0.5 }
      });
      events.push({
          id: uuidv4(),
          condition: { type: 'KEY_PRESSED', param: 'ArrowRight' },
          action: { type: 'MOVE_X', target: 'Player', param: 5 }
      });
      events.push({
          id: uuidv4(),
          condition: { type: 'KEY_PRESSED', param: 'ArrowLeft' },
          action: { type: 'MOVE_X', target: 'Player', param: -5 }
      });
      events.push({
          id: uuidv4(),
          condition: { type: 'KEY_PRESSED', param: 'Space' },
          action: { type: 'JUMP', target: 'Player', param: -12 }
      });
      // Floor
      objects.push({
          id: uuidv4(),
          name: 'Ground',
          type: 'Wall',
          x: 0,
          y: 400,
          width: 800,
          height: 40,
          color: '#64748b',
          hasCollision: true
      });
  } else {
      // Top Down Movement
      events.push({ id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowRight' }, action: { type: 'MOVE_X', target: 'Player', param: 5 } });
      events.push({ id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowLeft' }, action: { type: 'MOVE_X', target: 'Player', param: -5 } });
      events.push({ id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowUp' }, action: { type: 'MOVE_Y', target: 'Player', param: -5 } });
      events.push({ id: uuidv4(), condition: { type: 'KEY_PRESSED', param: 'ArrowDown' }, action: { type: 'MOVE_Y', target: 'Player', param: 5 } });
  }

  // 3. Parse Entities & Logic
  
  // HP / Health Logic
  if (p.includes('hp') || p.includes('health') || p.includes('life') || p.includes('lives')) {
      // Add HP variable to Player
      if (player.variables) player.variables['hp'] = 100;
      
      // HUD (Global Var for display mostly, but we are using Object Var)
      // We can also add a global for "Lives" if mentioned
      if (p.includes('lives')) {
          variables.push({ id: uuidv4(), name: 'Lives', initialValue: 3, scope: 'global' });
      }
  }

  // Score
  if (p.includes('score') || p.includes('coin') || p.includes('collect')) {
      variables.push({ id: uuidv4(), name: 'Score', initialValue: 0, scope: 'global' });
  }

  // Enemies
  if (p.includes('enemy') || p.includes('enemies') || p.includes('zombie') || p.includes('monster')) {
      objects.push({
          id: uuidv4(),
          name: 'Enemy',
          type: 'Enemy',
          x: 400,
          y: view === 'SIDE' ? 368 : 100, // Floor aligned if side
          width: 32,
          height: 32,
          color: '#ef4444',
          hasCollision: true,
          hasGravity: view === 'SIDE',
          autoMove: { enabled: true, speedX: 2, speedY: 0, loop: true, range: 150 }
      });

      // Damage Logic
      if (player.variables && player.variables['hp'] !== undefined) {
          // Player touches Enemy -> Sub HP
          events.push({
              id: uuidv4(),
              condition: { type: 'COLLISION', target: 'Player', param: 'Enemy' },
              action: { type: 'OBJ_VAR_SUB', target: 'Player', variableName: 'hp', value: 10 }
          });
      } else {
          // Default destroy or restart
          events.push({
              id: uuidv4(),
              condition: { type: 'COLLISION', target: 'Player', param: 'Enemy' },
              action: { type: 'DESTROY', target: 'Player' } // Or restart scene
          });
      }
  }

  // Coins
  if (p.includes('coin') || p.includes('collect')) {
      objects.push({
          id: uuidv4(),
          name: 'Coin',
          type: 'Coin',
          x: 300,
          y: view === 'SIDE' ? 300 : 200,
          width: 20,
          height: 20,
          color: '#eab308',
          hasCollision: false // Usually triggers but not solid
      });
      
      const scoreVar = variables.find(v => v.name === 'Score');
      if (scoreVar) {
          events.push({
              id: uuidv4(),
              condition: { type: 'COLLISION', target: 'Player', param: 'Coin' },
              action: { type: 'VAR_ADD', variableId: scoreVar.id, value: 10, target: 'SELF' }
          });
          events.push({
              id: uuidv4(),
              condition: { type: 'COLLISION', target: 'Player', param: 'Coin' },
              action: { type: 'DESTROY', target: 'OTHER' }
          });
      }
  }

  objects.push(player);

  return {
    id: uuidv4(),
    name: 'AI Generated Game',
    description: `Generated from prompt: "${prompt}"`,
    createdAt: Date.now(),
    view,
    gridSize,
    objects,
    events,
    variables
  };
};