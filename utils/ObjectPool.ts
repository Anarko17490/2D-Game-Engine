import { GameObject } from "../types";
import { v4 as uuidv4 } from 'uuid';

export interface RuntimeObject extends GameObject {
  vx: number;
  vy: number;
  isGrounded: boolean;
  animTimer: number;
  animFrameIndex: number;
  startX: number;
  startY: number;
  autoVx: number;
  autoVy: number;
  invincibleTimer: number; 
  maxHp: number; 
  variables: Record<string, string | number | boolean>;
  
  // Runtime specific
  originalPrefabId?: string;
  lastSpawnTime?: number; // Track cooldown for spawners
  active: boolean; // Use this flag for pool tracking
}

export class ObjectPool {
  private pools: Map<string, RuntimeObject[]> = new Map();

  public clear() {
    this.pools.clear();
  }

  public preAllocate(prefab: GameObject, count: number, createFn: (prefab: GameObject) => RuntimeObject) {
    if (!this.pools.has(prefab.id)) {
      this.pools.set(prefab.id, []);
    }
    const pool = this.pools.get(prefab.id)!;
    
    const currentSize = pool.length;
    const needed = count - currentSize;

    for (let i = 0; i < needed; i += 1) {
      const obj = createFn(prefab);
      obj.active = false;
      obj.x = -99999; // Move offscreen
      pool.push(obj);
    }
  }

  public get(prefab: GameObject, createFn: (prefab: GameObject) => RuntimeObject): RuntimeObject {
    if (!this.pools.has(prefab.id)) {
      this.pools.set(prefab.id, []);
    }
    const pool = this.pools.get(prefab.id)!;
    
    const inactiveObj = pool.find(o => !o.active);
    
    if (inactiveObj) {
      this.resetObject(inactiveObj, prefab);
      inactiveObj.active = true;
      return inactiveObj;
    }

    const newObj = createFn(prefab);
    newObj.active = true;
    pool.push(newObj);
    return newObj;
  }

  public returnObject(obj: RuntimeObject) {
    if (obj.originalPrefabId) {
        obj.active = false;
        obj.x = -99999;
        obj.y = -99999;
        obj.vx = 0;
        obj.vy = 0;
    }
  }

  private resetObject(obj: RuntimeObject, prefab: GameObject) {
    // Reset Mutable State to Prefab Defaults
    obj.vx = 0;
    obj.vy = 0;
    obj.isGrounded = false;
    obj.invincibleTimer = 0;
    obj.animTimer = 0;
    obj.animFrameIndex = 0;
    obj.currentAnimation = prefab.currentAnimation;
    
    obj.autoVx = prefab.autoMove?.speedX || 0;
    obj.autoVy = prefab.autoMove?.speedY || 0;

    obj.variables = { ...(prefab.variables || {}) };
    
    let foundMaxHp = 100;
    if (obj.variables && typeof obj.variables['hp'] === 'number') {
        foundMaxHp = obj.variables['hp'];
    }
    obj.maxHp = foundMaxHp;
    
    // Generate new ID for event uniqueness
    obj.id = uuidv4();
  }
}

export const poolManager = new ObjectPool();