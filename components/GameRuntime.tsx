

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { GameObject, LightSource } from '../types';
import { RotateCcw, Heart } from 'lucide-react';
import { audioSystem } from '../utils/AudioSystem';
import { bgmSystem } from '../utils/BgmSystem';
import { toScreenCoords, getZIndex } from '../utils/renderUtils';
import { v4 as uuidv4 } from 'uuid';
import { poolManager, RuntimeObject } from '../utils/ObjectPool';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; 
  maxLife: number; 
  color: string;
  size: number;
}

function checkIntersection(r1: RuntimeObject, r2: RuntimeObject) {
  return !(r2.x > r1.x + r1.width || 
           r2.x + r2.width < r1.x || 
           r2.y > r1.y + r1.height || 
           r2.y + r2.height < r1.y);
}

export const GameRuntime: React.FC = () => {
  const allScenes = useStore((state) => state.scenes);
  const currentEditorSceneId = useStore((state) => state.currentSceneId);
  const globalVariables = useStore((state) => state.variables);
  const assets = useStore((state) => state.assets);
  const tilesets = useStore((state) => state.tilesets);

  const [activeSceneId, setActiveSceneId] = useState<string>(currentEditorSceneId);
  const [renderObjects, setRenderObjects] = useState<RuntimeObject[]>([]);
  
  const variablesRef = useRef<Record<string, number>>({});
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const objectsRef = useRef<RuntimeObject[]>([]);
  const prefabsRef = useRef<Map<string, GameObject>>(new Map());
  const eventCooldownsRef = useRef<Record<string, number>>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const hitStopTimerRef = useRef<number>(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [hudVariables, setHudVariables] = useState<Record<string, number>>({});

  const activeScene = allScenes.find(s => s.id === activeSceneId);
  const viewType = activeScene?.view || 'SIDE';

  const createRuntimeObjectFromPrefab = (prefab: GameObject): RuntimeObject => {
      let foundMaxHp = 100; 
      let hpKey = '';
      if (prefab.variables) {
          hpKey = Object.keys(prefab.variables).find(k => k.toLowerCase() === 'hp') || '';
      }
      if (hpKey && typeof prefab.variables![hpKey] === 'number') {
          foundMaxHp = prefab.variables![hpKey] as number;
      } 

      return {
          ...prefab,
          id: uuidv4(),
          vx: 0,
          vy: 0,
          isGrounded: false,
          animTimer: 0,
          animFrameIndex: 0,
          startX: prefab.x,
          startY: prefab.y,
          autoVx: prefab.autoMove?.speedX || 0,
          autoVy: prefab.autoMove?.speedY || 0,
          invincibleTimer: 0,
          maxHp: foundMaxHp,
          isPrefab: false,
          originalPrefabId: prefab.isPrefab ? prefab.id : undefined,
          lastSpawnTime: 0,
          variables: { ...(prefab.variables || {}) },
          active: true
      };
  }

  const loadScene = (sceneId: string, keepGlobals = true) => {
      const scene = allScenes.find(s => s.id === sceneId);
      if (!scene) return;

      setActiveSceneId(sceneId);
      
      particlesRef.current = [];
      hitStopTimerRef.current = 0;
      prefabsRef.current.clear();
      poolManager.clear();
      eventCooldownsRef.current = {};

      const newVars: Record<string, number> = keepGlobals ? { ...variablesRef.current } : {};
      if (!keepGlobals) {
         globalVariables.forEach(v => newVars[v.id] = v.initialValue);
      }
      scene.variables.forEach(v => {
          newVars[v.id] = v.initialValue;
      });
      
      bgmSystem.unlock(); 
      if (scene.backgroundMusicId) {
          const clip = assets.find(a => a.id === scene.backgroundMusicId);
          if (clip) bgmSystem.play(clip.src, scene.musicVolume ?? 0.5);
          else bgmSystem.stop();
      } else {
          bgmSystem.stop();
      }

      const initialObjects: RuntimeObject[] = [];
      
      scene.objects.forEach(obj => {
          if (obj.isPrefab) {
              prefabsRef.current.set(obj.id, obj);
              if (obj.poolSize && obj.poolSize > 0) {
                  poolManager.preAllocate(obj, obj.poolSize, createRuntimeObjectFromPrefab);
              }
          } else {
              initialObjects.push(createRuntimeObjectFromPrefab(obj));
          }
      });

      setRenderObjects(initialObjects);
      objectsRef.current = initialObjects;
      variablesRef.current = newVars;
      setHudVariables(newVars);
      
      keysPressed.current.clear();
      lastTimeRef.current = performance.now();
  };

  const emitParticles = (x: number, y: number, count: number, options: { color: string, speed?: number, life?: number }) => {
     const speed = options.speed || 150;
     const life = options.life || 0.5;
     for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        particlesRef.current.push({
            x,
            y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: life + Math.random() * 0.2,
            maxLife: life + 0.2,
            color: options.color,
            size: Math.random() * 4 + 2
        });
     }
  };

  const triggerHitStop = (duration: number) => {
      hitStopTimerRef.current = duration;
  };

  const spawnObject = (prefabId: string, x: number, y: number, source?: RuntimeObject) => {
      const prefab = prefabsRef.current.get(prefabId);
      if (!prefab) return;

      const newObj = poolManager.get(prefab, createRuntimeObjectFromPrefab);
      newObj.x = x;
      newObj.y = y;
      
      // Top Down Rotation Inheritance
      if (viewType === 'TOP_DOWN' && source) {
         newObj.rotation = source.rotation;
         
         if (newObj.autoMove?.enabled) {
             const angleRad = (source.rotation || 0) * (Math.PI / 180);
             const cos = Math.cos(angleRad);
             const sin = Math.sin(angleRad);
             
             // Rotate the local velocity (speedX = forward, speedY = strafe)
             const localVx = prefab.autoMove?.speedX || 0;
             const localVy = prefab.autoMove?.speedY || 0;
             
             newObj.autoVx = localVx * cos - localVy * sin;
             newObj.autoVy = localVx * sin + localVy * cos;
             
             // Initial velocity
             newObj.vx = newObj.autoVx;
             newObj.vy = newObj.autoVy;
         }
      } else {
         newObj.startX = x;
         newObj.startY = y;
      }

      return newObj;
  };

  const applyObjectVarChange = (obj: RuntimeObject, type: string, name: string, val: number | string | boolean) => {
      if (obj.variables[name] === undefined) {
          if (type === 'OBJ_VAR_SUB' && name.toLowerCase() === 'hp') obj.variables[name] = obj.maxHp;
          else obj.variables[name] = 0; 
      }
      const curr = obj.variables[name];
      if (type === 'OBJ_VAR_SUB' && name.toLowerCase() === 'hp' && typeof val === 'number') {
          if (obj.invincibleTimer > 0) return; 
          obj.invincibleTimer = 1.5;
          triggerHitStop(0.15);
          const pColor = obj.type === 'Player' ? '#ef4444' : '#ffffff';
          emitParticles(obj.x + obj.width/2, obj.y + obj.height/2, 15, { color: pColor });
          if (typeof curr === 'number') {
              obj.variables[name] = curr - val;
          }
          return;
      }
      if (type === 'OBJ_VAR_SET') {
          obj.variables[name] = val;
      } else if (typeof curr === 'number' && typeof val === 'number') {
          if (type === 'OBJ_VAR_ADD') obj.variables[name] = curr + val;
          if (type === 'OBJ_VAR_SUB') obj.variables[name] = curr - val;
      }
  };

  useEffect(() => {
    const initialVars: Record<string, number> = {};
    globalVariables.forEach(v => initialVars[v.id] = v.initialValue);
    variablesRef.current = initialVars;
    audioSystem.loadClips(assets);
    
    // Preload Tilesets
    tilesets.forEach(ts => {
        getImageFromCache(ts.id, ts.src);
    });

    loadScene(currentEditorSceneId, true);

    const handleKeyDown = (e: KeyboardEvent) => {
        audioSystem.unlock(); 
        bgmSystem.unlock();
        keysPressed.current.add(e.code);
        keysPressed.current.add(e.key);
        keysPressed.current.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current.delete(e.code);
        keysPressed.current.delete(e.key);
        keysPressed.current.delete(e.key.toLowerCase());
    };
    const handleClick = () => {
        audioSystem.unlock();
        bgmSystem.unlock();
    };
    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(requestRef.current);
      bgmSystem.stop(0.2); 
    };
  }, []); 

  const animate = (time: number) => {
    const dtMs = time - lastTimeRef.current;
    const dtSec = dtMs / 1000;
    lastTimeRef.current = time;
    const nowSec = time / 1000;
    
    let effectTimeScale = 1.0;
    if (hitStopTimerRef.current > 0) {
        hitStopTimerRef.current -= dtSec;
        if (hitStopTimerRef.current > 0) effectTimeScale = 0; 
        else { hitStopTimerRef.current = 0; effectTimeScale = 1; }
    }
    const simDt = dtSec * effectTimeScale;
    const physicsScale = Math.min(dtMs / 16.67, 4.0) * effectTimeScale;

    setRenderObjects(prevObjects => {
      const scene = allScenes.find(s => s.id === activeSceneId);
      if (!scene) return prevObjects;

      let nextObjects = prevObjects; 
      
      let vars = variablesRef.current;
      let varsChanged = false;
      let switchSceneId: string | null = null;
      const objectsToRecycle = new Set<string>();
      const newSpawns: RuntimeObject[] = [];

      // 0. Update Timers & Lifetime
      const startPositions = new Map<string, {x: number, y: number}>();

      nextObjects.forEach(obj => {
          startPositions.set(obj.id, { x: obj.x, y: obj.y });

          if (obj.invincibleTimer > 0) {
              obj.invincibleTimer -= simDt;
              if (obj.invincibleTimer < 0) obj.invincibleTimer = 0;
          }
          if (effectTimeScale > 0 && obj.variables['lifetime'] !== undefined && typeof obj.variables['lifetime'] === 'number') {
              const currentLife = obj.variables['lifetime'] as number;
              obj.variables['lifetime'] = currentLife - simDt;
              if (obj.variables['lifetime'] <= 0) {
                  objectsToRecycle.add(obj.id);
              }
          }
      });

      // 1. Process Events
      scene.events.forEach(evt => {
        let conditionMet = false;

        if (evt.condition.type === 'ALWAYS') {
          conditionMet = true;
        } else if (evt.condition.type === 'KEY_PRESSED') {
          if (evt.condition.param && keysPressed.current.has(evt.condition.param)) conditionMet = true;
        } else if (evt.condition.type === 'MOUSE_CLICK') {
             // Placeholder
        } else if (['VAR_EQUALS', 'VAR_GT', 'VAR_LT'].includes(evt.condition.type)) {
           const val = vars[evt.condition.variableId || ''] || 0;
           const target = (evt.condition.value as number) || 0;
           if (evt.condition.type === 'VAR_EQUALS' && val === target) conditionMet = true;
           if (evt.condition.type === 'VAR_GT' && val > target) conditionMet = true;
           if (evt.condition.type === 'VAR_LT' && val < target) conditionMet = true;
        } else if (evt.condition.type === 'OBJ_VAR_COMPARE') {
            const targetType = evt.condition.target || 'Player';
            const varName = evt.condition.variableName;
            const val = evt.condition.value;
            const op = evt.condition.operator || '=';
            
            if (varName && val !== undefined) {
                 const match = nextObjects.find(o => {
                    if (o.type !== targetType && !(targetType === 'Player' && o.type === 'Player')) return false;
                    
                    const objVal = o.variables[varName];
                    if (objVal === undefined) return false;
                    
                    if (op === '=') return objVal == val;
                    if (op === '>') return (objVal as number) > (val as number);
                    if (op === '<') return (objVal as number) < (val as number);
                    if (op === '>=') return (objVal as number) >= (val as number);
                    if (op === '<=') return (objVal as number) <= (val as number);
                    return false;
                 });
                 if (match) conditionMet = true;
            }
        }
        
        if (evt.condition.type === 'COLLISION') return; 

        // COOLDOWN CHECK
        if (conditionMet && evt.action.cooldown && evt.action.cooldown > 0) {
            const lastRun = eventCooldownsRef.current[evt.id] || 0;
            if (nowSec - lastRun < evt.action.cooldown) {
                conditionMet = false;
            }
        }
        
        if (conditionMet) {
          if (evt.action.cooldown && evt.action.cooldown > 0) {
              eventCooldownsRef.current[evt.id] = nowSec;
          }

          if (evt.action.type === 'GOTO_SCENE' && evt.action.sceneId) switchSceneId = evt.action.sceneId;
          
          if (evt.action.type === 'PLAY_SOUND' && evt.action.audioClipId && effectTimeScale > 0) {
             audioSystem.play(evt.action.audioClipId, evt.action.volume ?? 1);
          }

          if (['VAR_SET', 'VAR_ADD', 'VAR_SUB'].includes(evt.action.type) && effectTimeScale > 0) {
             if (evt.action.variableId) {
                const val = (evt.action.value as number) || 0;
                const current = vars[evt.action.variableId] || 0;
                if (evt.action.type === 'VAR_SET') vars[evt.action.variableId] = val;
                if (evt.action.type === 'VAR_ADD') vars[evt.action.variableId] = current + val;
                if (evt.action.type === 'VAR_SUB') vars[evt.action.variableId] = current - val;
                varsChanged = true;
             }
          }

          if (effectTimeScale > 0) {
              if (evt.action.type === 'CREATE_OBJECT' && evt.action.prefabId) {
                  const prefabId = evt.action.prefabId;
                  const targetType = evt.action.target || 'Player';
                  const offsetX = evt.action.offsetX || 0;
                  const offsetY = evt.action.offsetY || 0;

                  const sources = nextObjects.filter(o => o.type === targetType || (targetType === 'Player' && o.type === 'Player'));
                  
                  sources.forEach(source => {
                      // Check Cooldown
                      const now = performance.now() / 1000;
                      if (source.spawnCooldown && source.spawnCooldown > 0) {
                          if (source.lastSpawnTime && (now - source.lastSpawnTime) < source.spawnCooldown) {
                              return; // Skip spawn
                          }
                          source.lastSpawnTime = now;
                      }

                      const spawnX = source.x + source.width / 2 + offsetX;
                      const spawnY = source.y + source.height / 2 + offsetY;
                      
                      const newObj = spawnObject(prefabId, spawnX, spawnY, source);
                      if (newObj) {
                          newObj.x -= newObj.width / 2;
                          newObj.y -= newObj.height / 2;
                          newSpawns.push(newObj);
                      }
                  });
              }

              nextObjects.forEach(obj => {
                let isTarget = false;
                if (evt.action.target === obj.type) isTarget = true;
                if (evt.action.target === 'Player' && obj.type === 'Player') isTarget = true;
                if (evt.action.target === 'SELF') isTarget = true; 
                
                if (evt.condition.type === 'OBJ_VAR_COMPARE') {
                    const cVar = evt.condition.variableName;
                    const cVal = evt.condition.value;
                    const op = evt.condition.operator || '=';
                    
                    if (cVar && cVal !== undefined) {
                        const objVal = obj.variables[cVar];
                        if (objVal === undefined) {
                            isTarget = false;
                        } else {
                            let match = false;
                            if (op === '=') match = objVal == cVal;
                            else if (op === '>') match = (objVal as number) > (cVal as number);
                            else if (op === '<') match = (objVal as number) < (cVal as number);
                            else if (op === '>=') match = (objVal as number) >= (cVal as number);
                            else if (op === '<=') match = (objVal as number) <= (cVal as number);
                            if (!match) isTarget = false;
                        }
                    }
                }
                
                if (isTarget) {
                  const val = evt.action.param || 0;
                  switch (evt.action.type) {
                    case 'MOVE_X': obj.x += val * physicsScale; break;
                    case 'MOVE_Y': obj.y += val * physicsScale; break;
                    case 'GRAVITY': obj.vy += val * physicsScale; break;
                    case 'JUMP': if (obj.isGrounded) { obj.vy = val; obj.isGrounded = false; } break;
                    case 'REVERSE_X': obj.vx = -obj.vx; obj.autoVx = -obj.autoVx; obj.x += (obj.autoVx > 0 ? 1 : -1) * 2; break;
                    case 'REVERSE_Y': obj.vy = -obj.vy; obj.autoVy = -obj.autoVy; obj.y += (obj.autoVy > 0 ? 1 : -1) * 2; break;
                    case 'SET_ANIMATION':
                       if (evt.action.animationName && obj.currentAnimation !== evt.action.animationName) {
                          const hasAnim = obj.animations?.some(a => a.name === evt.action.animationName);
                          if (hasAnim) { obj.currentAnimation = evt.action.animationName; obj.animFrameIndex = 0; obj.animTimer = 0; }
                       }
                       break;
                    case 'DESTROY': objectsToRecycle.add(obj.id); break;
                    case 'OBJ_VAR_SET':
                    case 'OBJ_VAR_ADD':
                    case 'OBJ_VAR_SUB':
                       if (evt.action.variableName) {
                           applyObjectVarChange(obj, evt.action.type, evt.action.variableName!, evt.action.value as (number | string | boolean));
                       }
                       break;
                  }
                }
              });
          }
        }
      });

      if (switchSceneId) {
          setTimeout(() => loadScene(switchSceneId!, true), 0);
          return nextObjects;
      }
      
      // ROTATION UPDATE (Before Physics)
      if (viewType === 'TOP_DOWN') {
          nextObjects.forEach(obj => {
             // Only auto-rotate Player or designated characters
             if (obj.type === 'Player') {
                 const start = startPositions.get(obj.id);
                 if (start) {
                     const dx = obj.x - start.x;
                     const dy = obj.y - start.y;
                     if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                         obj.rotation = Math.atan2(dy, dx) * (180 / Math.PI);
                     }
                 }
             }
          });
      }

      // 2. Physics & Behaviors
      const solids = nextObjects.filter(o => o.hasCollision && !objectsToRecycle.has(o.id));
      
      if (effectTimeScale > 0) {
          nextObjects.forEach(obj => {
            if (objectsToRecycle.has(obj.id)) return; 

            if (obj.hasGravity) obj.vy += 0.5 * physicsScale; 

            if (obj.autoMove?.enabled) {
                obj.x += (obj.autoVx) * physicsScale;
                obj.y += (obj.autoVy) * physicsScale;
                if (obj.autoMove.loop) {
                    const range = obj.autoMove.range || 200;
                    if (obj.autoMove.speedX !== 0) {
                        const dist = obj.x - obj.startX;
                        if (obj.autoVx > 0 && dist > range) obj.autoVx = -Math.abs(obj.autoMove.speedX);
                        else if (obj.autoVx < 0 && dist < 0) obj.autoVx = Math.abs(obj.autoMove.speedX);
                    }
                    if (obj.autoMove.speedY !== 0) {
                        const dist = obj.y - obj.startY;
                        if (obj.autoVy > 0 && dist > range) obj.autoVy = -Math.abs(obj.autoMove.speedY);
                        else if (obj.autoVy < 0 && dist < 0) obj.autoVy = Math.abs(obj.autoMove.speedY);
                    }
                }
            }

            obj.x += obj.vx * physicsScale;
            obj.y += obj.vy * physicsScale;
            
            if (obj.hasGravity) {
                const FLOOR_Y = 400;
                if (obj.y + obj.height > FLOOR_Y) {
                  obj.y = FLOOR_Y - obj.height;
                  obj.vy = 0;
                  obj.isGrounded = true;
                }
            }

            if (obj.hasCollision) {
               solids.forEach(other => {
                  if (obj.id === other.id) return;
                  if (checkIntersection(obj, other)) {
                      const overlapX = (obj.width + other.width) / 2 - Math.abs((obj.x + obj.width/2) - (other.x + other.width/2));
                      const overlapY = (obj.height + other.height) / 2 - Math.abs((obj.y + obj.height/2) - (other.y + other.height/2));
                      if (overlapX < overlapY) {
                         if (obj.x < other.x) obj.x -= overlapX; else obj.x += overlapX;
                         obj.vx = 0;
                      } else {
                         if (obj.y < other.y) { obj.y -= overlapY; obj.isGrounded = true; } else { obj.y += overlapY; }
                         obj.vy = 0;
                      }
                  }
               });
            }
          });
      }

      // 3. Collision Events
      if (effectTimeScale > 0) {
          scene.events.filter(e => e.condition.type === 'COLLISION').forEach(evt => {
            const targetType = evt.condition.param;
            const subjectType = evt.condition.target || 'Player'; 
            const subjects = nextObjects.filter(o => o.type === subjectType || (subjectType === 'Player' && o.type === 'Player'));
            const targets = nextObjects.filter(o => o.type === targetType);

            subjects.forEach(sub => {
              targets.forEach(tgt => {
                if (sub.id === tgt.id) return;
                if (checkIntersection(sub, tgt)) {
                  if (evt.action.type === 'PLAY_SOUND' && evt.action.audioClipId) {
                      audioSystem.play(evt.action.audioClipId, evt.action.volume ?? 1);
                  }
                  const isActionTarget = (obj: RuntimeObject) => {
                     if (evt.action.target === 'OTHER' && obj.id === tgt.id) return true;
                     if (evt.action.target === 'SELF' && obj.id === sub.id) return true;
                     if (evt.action.target === obj.type) return true;
                     return false;
                  };
                  const actionTargets: RuntimeObject[] = [];
                  if (isActionTarget(sub)) actionTargets.push(sub);
                  if (isActionTarget(tgt)) actionTargets.push(tgt);

                  if (evt.action.type === 'DESTROY') actionTargets.forEach(t => objectsToRecycle.add(t.id));
                  else if (evt.action.type === 'REVERSE_X') actionTargets.forEach(t => { t.vx *= -1; t.autoVx *= -1; t.x += (t.autoVx > 0 ? 1 : -1) * 2; });
                  else if (evt.action.type === 'REVERSE_Y') actionTargets.forEach(t => { t.vy *= -1; t.autoVy *= -1; t.y += (t.autoVy > 0 ? 1 : -1) * 2; });
                  else if (evt.action.type === 'GOTO_SCENE' && evt.action.sceneId) switchSceneId = evt.action.sceneId;
                  else if (['VAR_ADD', 'VAR_SUB', 'VAR_SET'].includes(evt.action.type)) {
                      const varId = evt.action.variableId;
                      const val = (evt.action.value as number) || 0;
                      if (varId) {
                          const curr = vars[varId] || 0;
                          if (evt.action.type === 'VAR_SET') vars[varId] = val;
                          else if (evt.action.type === 'VAR_ADD') vars[varId] = curr + val;
                          else if (evt.action.type === 'VAR_SUB') vars[varId] = curr - val;
                          varsChanged = true;
                      }
                  }
                  else if (['OBJ_VAR_SET', 'OBJ_VAR_ADD', 'OBJ_VAR_SUB'].includes(evt.action.type)) {
                       if (evt.action.variableName) actionTargets.forEach(t => applyObjectVarChange(t, evt.action.type, evt.action.variableName!, evt.action.value as any));
                  }
                }
              });
            });
          });
      }
      
      if (switchSceneId) {
          setTimeout(() => loadScene(switchSceneId!, true), 0);
          return nextObjects;
      }
      
      if (varsChanged) setHudVariables({ ...vars });

      // 4. Animation Frame Cycling
      nextObjects.forEach(obj => {
         if (objectsToRecycle.has(obj.id)) return; 
         if (!obj.animations || obj.animations.length === 0) return;
         const isMoving = Math.abs(obj.vx) > 0.1 || (obj.autoMove?.enabled && obj.autoVx !== 0);
         if (isMoving && obj.currentAnimation === 'Idle') {
            const runAnim = obj.animations.find(a => a.name === 'Run' || a.name === 'Walk');
            if (runAnim) { obj.currentAnimation = runAnim.name; obj.animFrameIndex = 0; }
         } else if (!isMoving && (obj.currentAnimation === 'Run' || obj.currentAnimation === 'Walk')) {
             const idleAnim = obj.animations.find(a => a.name === 'Idle');
             if (idleAnim) { obj.currentAnimation = idleAnim.name; obj.animFrameIndex = 0; }
         }
         const currentAnim = obj.animations.find(a => a.name === obj.currentAnimation);
         if (currentAnim && currentAnim.frameAssetIds.length > 0) {
             obj.animTimer += (dtMs * effectTimeScale);
             const msPerFrame = 1000 / currentAnim.fps;
             if (obj.animTimer >= msPerFrame) {
                 obj.animTimer -= msPerFrame;
                 obj.animFrameIndex += 1;
                 if (obj.animFrameIndex >= currentAnim.frameAssetIds.length) {
                     if (currentAnim.loop) obj.animFrameIndex = 0;
                     else obj.animFrameIndex = currentAnim.frameAssetIds.length - 1; 
                 }
             }
         }
      });

      // Filter destroyed (return to pool) and add spawns
      const filtered = nextObjects.filter(o => {
          if (objectsToRecycle.has(o.id)) {
              if (o.originalPrefabId) {
                  poolManager.returnObject(o);
              }
              return false;
          }
          return true;
      }).concat(newSpawns);

      objectsRef.current = filtered; 
      return filtered;
    });

    // --- RENDER PIPELINE ---
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const W = canvasRef.current.width;
            const H = canvasRef.current.height;

            // DRAW BACKGROUND
            const scene = allScenes.find(s => s.id === activeSceneId);
            
            // 1. Color Background
            if (scene?.backgroundColor) {
                ctx.fillStyle = scene.backgroundColor;
                ctx.fillRect(0, 0, W, H);
            } else {
                ctx.clearRect(0, 0, W, H);
            }

            // 2. Image Background (Fixed Size Rendering)
            if (scene?.backgroundImageId) {
                const bgAsset = assets.find(a => a.id === scene.backgroundImageId);
                if (bgAsset) {
                    const img = getImageFromCache(bgAsset.id, bgAsset.src);
                    if (img && img.complete) {
                        const sizeMode = scene.backgroundSize || 'cover';
                        
                        if (sizeMode === 'stretch') {
                            ctx.drawImage(img, 0, 0, W, H);
                        } else {
                            const imgRatio = img.width / img.height;
                            const canvasRatio = W / H;
                            let renderW = W;
                            let renderH = H;

                            if (sizeMode === 'cover') {
                                if (imgRatio > canvasRatio) {
                                    renderH = H;
                                    renderW = H * imgRatio;
                                } else {
                                    renderW = W;
                                    renderH = W / imgRatio;
                                }
                            } else { // contain
                                if (imgRatio > canvasRatio) {
                                    renderW = W;
                                    renderH = W / imgRatio;
                                } else {
                                    renderH = H;
                                    renderW = H * imgRatio;
                                }
                            }

                            const renderX = (W - renderW) / 2;
                            const renderY = (H - renderH) / 2;
                            ctx.drawImage(img, renderX, renderY, renderW, renderH);
                        }
                    }
                }
            }

            
            // Particles
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);
            particlesRef.current.forEach(p => {
                p.x += p.vx * simDt;
                p.y += p.vy * simDt;
                p.vy += 300 * simDt;
                p.life -= simDt;
                const { x, y } = toScreenCoords(p.x, p.y, viewType);
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(x, y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            });

            // A. Draw Game Objects
            objectsRef.current.forEach(obj => {
                const { x, y } = toScreenCoords(obj.x, obj.y, viewType);
                
                // Shadow Pass
                if (obj.shadow?.enabled) {
                    ctx.save();
                    ctx.fillStyle = obj.shadow.color || 'black';
                    ctx.shadowColor = obj.shadow.color || 'black';
                    ctx.shadowBlur = obj.shadow.blur || 10;
                    ctx.shadowOffsetX = obj.shadow.offsetX;
                    ctx.shadowOffsetY = obj.shadow.offsetY;
                    ctx.restore();
                }
            });

            // B. LIGHTING PASS
            const ambient = activeScene?.ambientLight || { color: '#ffffff', intensity: 1 };
            const lights = activeScene?.lights || [];

            if (ambient.intensity < 1 || lights.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = ambient.color;
                ctx.globalAlpha = 1; 
                ctx.fillRect(0, 0, W, H);
                ctx.globalCompositeOperation = 'screen'; 
                
                lights.forEach(light => {
                    let lx = light.x;
                    let ly = light.y;
                    if (light.followObjectId) {
                        const target = objectsRef.current.find(o => o.id === light.followObjectId);
                        if (target) {
                            lx = target.x + target.width/2;
                            ly = target.y + target.height/2;
                        }
                    }
                    const { x, y } = toScreenCoords(lx, ly, viewType);
                    const g = ctx.createRadialGradient(x, y, 0, x, y, light.radius);
                    const r = parseInt(light.color.slice(1, 3), 16);
                    const g_val = parseInt(light.color.slice(3, 5), 16);
                    const b = parseInt(light.color.slice(5, 7), 16);
                    g.addColorStop(0, `rgba(${r},${g_val},${b},${light.intensity})`);
                    g.addColorStop(1, `rgba(${r},${g_val},${b},0)`);
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(x, y, light.radius, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }

            // C. PARTICLES
            ctx.globalCompositeOperation = 'screen'; 
            particlesRef.current.forEach(p => {
                const { x, y } = toScreenCoords(p.x, p.y, viewType);
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color; 
                ctx.beginPath();
                ctx.arc(x, y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            
            // D. RENDER OBJECTS (Main Pass)
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.globalAlpha = 1; 
            
            // Sort by Z Index
            const sortedObjects = [...objectsRef.current].sort((a, b) => {
                 const zA = getZIndex(a.y, a.height, viewType);
                 const zB = getZIndex(b.y, b.height, viewType);
                 return zA - zB;
            });

            sortedObjects.forEach(obj => {
                 const { x, y } = toScreenCoords(obj.x, obj.y, viewType);
                 const isInvincible = obj.invincibleTimer > 0;
                 const opacity = isInvincible && (Math.floor(Date.now() / 100) % 2 === 0) ? 0.4 : 1;
                 
                 ctx.save();
                 ctx.globalAlpha = opacity;
                 
                 // Transformations (Rotate & Flip)
                 const cx = x + obj.width / 2;
                 const cy = y + obj.height / 2;
                 ctx.translate(cx, cy);
                 ctx.rotate((obj.rotation || 0) * Math.PI / 180);
                 if (obj.vx < 0 || (obj.autoVx && obj.autoVx < 0)) {
                     ctx.scale(-1, 1);
                 }
                 ctx.translate(-cx, -cy);

                 // Draw Logic
                 let drawn = false;

                 // 1. Tile Data
                 if (obj.tileData) {
                     const tileset = tilesets.find(t => t.id === obj.tileData!.tilesetId);
                     if (tileset) {
                         const img = getImageFromCache(tileset.id, tileset.src);
                         if (img && img.complete) {
                             const tsSize = tileset.tileSize;
                             ctx.drawImage(
                                 img,
                                 obj.tileData.tileX * tsSize,
                                 obj.tileData.tileY * tsSize,
                                 tsSize,
                                 tsSize,
                                 x,
                                 y,
                                 obj.width,
                                 obj.height
                             );
                             drawn = true;
                         }
                     }
                 }

                 // 2. Sprite Animation
                 if (!drawn && obj.currentAnimation && obj.animations) {
                     const anim = obj.animations.find(a => a.name === obj.currentAnimation);
                     if (anim && anim.frameAssetIds.length > 0) {
                         const frameId = anim.frameAssetIds[obj.animFrameIndex];
                         const asset = assets.find(a => a.id === frameId);
                         if (asset) {
                             const img = getImageFromCache(asset.id, asset.src);
                             if (img && img.complete) {
                                ctx.drawImage(img, x, y, obj.width, obj.height);
                                drawn = true;
                             }
                         }
                     }
                 }

                 // 3. Static Image
                 if (!drawn && obj.imageBase64) {
                     const img = getImageFromCache(obj.id + '_base', obj.imageBase64);
                     if (img && img.complete) {
                        ctx.drawImage(img, x, y, obj.width, obj.height);
                        drawn = true;
                     }
                 }

                 // 4. Fallback Box
                 if (!drawn) {
                    if (obj.type === 'Tile') {
                        // Invisible in runtime if no image, or draw debug
                    } else {
                        ctx.fillStyle = obj.color;
                        ctx.fillRect(x, y, obj.width, obj.height);
                        // Text label
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(obj.type === 'Coin' ? '$' : obj.name, x + obj.width/2, y + obj.height/2);
                    }
                 }

                 ctx.restore();
            });

        }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  const getObjectHp = (obj: RuntimeObject) => {
    if (obj.variables) {
        const hpKey = Object.keys(obj.variables).find(k => k.toLowerCase() === 'hp');
        if (hpKey && typeof obj.variables[hpKey] === 'number') return obj.variables[hpKey] as number;
    }
    const hp = hudVariables[`${obj.id}.hp`];
    return hp !== undefined ? hp : obj.maxHp; 
  };

  const playerObj = renderObjects.find(o => o.type === 'Player');
  const playerHp = playerObj ? getObjectHp(playerObj) : 0;
  const playerMaxHp = playerObj ? playerObj.maxHp : 100;

  return (
    <div className="w-full h-full bg-black relative overflow-hidden border-4 border-yellow-500 rounded-lg select-none">
       <canvas ref={canvasRef} width={800} height={600} className="absolute inset-0 z-[80]" />
       
       {/* UI OVERLAY */}
       {playerObj && (
         <div className="absolute top-4 left-4 z-[90] flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700 shadow-lg">
                <Heart size={20} className="text-red-500 fill-red-500" />
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Player HP</span>
                    <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                        <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100))}%` }} />
                    </div>
                </div>
                <span className="text-sm font-mono text-white ml-1">{playerHp}/{playerMaxHp}</span>
            </div>
         </div>
       )}
       <div className="absolute top-[70px] left-4 z-[90] flex flex-col gap-1 pointer-events-none">
           {globalVariables.filter(v => v.showInHud).map(v => (
               <div key={v.id} className="text-xs font-bold font-mono text-yellow-400 drop-shadow-md bg-black/50 px-2 py-1 rounded">
                   {v.name}: {variablesRef.current[v.id] ?? v.initialValue}
               </div>
           ))}
       </div>
       <div className="absolute top-4 right-4 flex gap-2 z-[90]">
         <button onClick={() => loadScene(activeSceneId, true)} className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 border border-slate-600 shadow-lg" title="Restart Level"><RotateCcw size={16} /></button>
         <div className="bg-yellow-600 text-black px-3 py-2 rounded font-mono text-xs font-bold flex items-center">PLAY MODE ({viewType})</div>
       </div>
    </div>
  );
};

// Simple Image Cache
const _imageCache = new Map<string, HTMLImageElement>();
function getImageFromCache(id: string, src: string): HTMLImageElement {
    if (_imageCache.has(id)) return _imageCache.get(id)!;
    const img = new Image();
    img.src = src;
    _imageCache.set(id, img);
    return img;
}