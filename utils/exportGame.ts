
import { Scene, Variable } from '../types';

export const exportToHtml = (scenes: Scene[], globalVariables: Variable[]) => {
  const gameData = JSON.stringify({ scenes, globalVariables });

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Game Maker Project</title>
    <style>
        body { margin: 0; background: #0f172a; overflow: hidden; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
        #game-container { position: relative; width: 800px; height: 600px; background: #000; border: 4px solid #eab308; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .game-object { position: absolute; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: rgba(255,255,255,0.8); user-select: none; }
        .game-object img { width: 100%; height: 100%; object-fit: contain; }
        .floor { position: absolute; bottom: 0; left: 0; right: 0; height: 200px; background: #1e293b; border-top: 1px solid #475569; opacity: 0.5; pointer-events: none; }
        .hud { position: absolute; top: 10px; right: 10px; z-index: 10; pointer-events: none; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .var-badge { background: rgba(15, 23, 42, 0.8); color: white; padding: 2px 8px; border-radius: 4px; border: 1px solid #334155; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <div id="game-container">
        <div id="hud" class="hud"></div>
        <div class="floor" style="top: 400px; height: calc(100% - 400px);"></div>
    </div>
    <script>
        const DATA = ${gameData};
        const container = document.getElementById('game-container');
        const hud = document.getElementById('hud');
        
        let keysPressed = new Set();
        let runtimeObjects = [];
        let globalVars = {};
        let sceneVars = {};
        let currentScene = null;
        let animationFrameId;

        // Init Globals
        DATA.globalVariables.forEach(v => globalVars[v.id] = v.initialValue);

        function loadScene(sceneId) {
            // Cleanup
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            const oldObjs = document.querySelectorAll('.game-object');
            oldObjs.forEach(el => el.remove());
            
            const scene = DATA.scenes.find(s => s.id === sceneId);
            if (!scene) return;
            currentScene = scene;

            // Init Scene Vars
            sceneVars = {};
            scene.variables.forEach(v => sceneVars[v.id] = v.initialValue);

            // Init Objects
            runtimeObjects = scene.objects.map(obj => ({
                ...obj,
                vx: 0,
                vy: 0,
                isGrounded: false,
                startX: obj.x,
                startY: obj.y,
                autoVx: obj.autoMove?.speedX || 0,
                autoVy: obj.autoMove?.speedY || 0,
                el: createObjectElement(obj)
            }));
            
            loop();
        }

        function createObjectElement(obj) {
            const el = document.createElement('div');
            el.className = 'game-object';
            el.style.width = obj.width + 'px';
            el.style.height = obj.height + 'px';
            updateElementTransform(el, obj);
            
            if (obj.imageBase64) {
                 const img = document.createElement('img');
                 img.src = obj.imageBase64;
                 el.appendChild(img);
            } else {
                 el.style.backgroundColor = obj.color;
                 el.textContent = obj.type === 'Coin' ? '$' : obj.name;
            }
            container.appendChild(el);
            return el;
        }
        
        function updateElementTransform(el, obj) {
            el.style.left = obj.x + 'px';
            el.style.top = obj.y + 'px';
            const flip = (obj.vx < 0 || (obj.autoVx && obj.autoVx < 0)) ? -1 : 1;
            el.style.transform = \`rotate(\${obj.rotation || 0}deg) scaleX(\${flip})\`;
        }

        window.addEventListener('keydown', e => keysPressed.add(e.code));
        window.addEventListener('keyup', e => keysPressed.delete(e.code));

        function loop() {
            let nextSceneId = null;
            let varsChanged = false;
            
            // Helper to get var value
            const getVar = (id) => globalVars[id] !== undefined ? globalVars[id] : sceneVars[id];
            const setVar = (id, val) => {
                if (globalVars[id] !== undefined) globalVars[id] = val;
                else if (sceneVars[id] !== undefined) sceneVars[id] = val;
                varsChanged = true;
            };

            // 1. Events
            currentScene.events.forEach(evt => {
                let conditionMet = false;
                if (evt.condition.type === 'ALWAYS') conditionMet = true;
                else if (evt.condition.type === 'KEY_PRESSED') {
                    if (keysPressed.has(evt.condition.param)) conditionMet = true;
                }
                else if (['VAR_EQUALS', 'VAR_GT', 'VAR_LT'].includes(evt.condition.type)) {
                    const val = getVar(evt.condition.variableId) || 0;
                    const target = evt.condition.value || 0;
                    if (evt.condition.type === 'VAR_EQUALS' && val === target) conditionMet = true;
                    if (evt.condition.type === 'VAR_GT' && val > target) conditionMet = true;
                    if (evt.condition.type === 'VAR_LT' && val < target) conditionMet = true;
                }

                if (conditionMet) {
                    // System Actions
                    if (evt.action.type === 'GOTO_SCENE') nextSceneId = evt.action.sceneId;

                    // Var Actions
                    if (['VAR_SET', 'VAR_ADD', 'VAR_SUB'].includes(evt.action.type)) {
                        const curr = getVar(evt.action.variableId) || 0;
                        const val = evt.action.value || 0;
                        if (evt.action.type === 'VAR_SET') setVar(evt.action.variableId, val);
                        if (evt.action.type === 'VAR_ADD') setVar(evt.action.variableId, curr + val);
                        if (evt.action.type === 'VAR_SUB') setVar(evt.action.variableId, curr - val);
                    }

                    // Object Actions
                    runtimeObjects.forEach(obj => {
                        let isTarget = false;
                        if (evt.action.target === obj.type) isTarget = true;
                        if (evt.action.target === 'Player' && obj.type === 'Player') isTarget = true;
                        if (evt.action.target === 'SELF') isTarget = true;

                        if (isTarget) {
                            const val = evt.action.param || 0;
                            if (evt.action.type === 'MOVE_X') obj.x += val;
                            if (evt.action.type === 'MOVE_Y') obj.y += val;
                            if (evt.action.type === 'GRAVITY') obj.vy += val;
                            if (evt.action.type === 'JUMP' && obj.isGrounded) {
                                obj.vy = val;
                                obj.isGrounded = false;
                            }
                            if (evt.action.type === 'REVERSE_X') {
                                obj.vx = -obj.vx; obj.autoVx = -obj.autoVx; obj.x += (obj.autoVx > 0 ? 1 : -1) * 2;
                            }
                            if (evt.action.type === 'REVERSE_Y') {
                                obj.vy = -obj.vy; obj.autoVy = -obj.autoVy; obj.y += (obj.autoVy > 0 ? 1 : -1) * 2;
                            }
                        }
                    });
                }
            });

            if (nextSceneId) {
                loadScene(nextSceneId);
                return;
            }

            // 2. Physics & Behaviors
            const FLOOR_Y = 400;
            const solids = runtimeObjects.filter(o => o.hasCollision);
            
            runtimeObjects.forEach(obj => {
                // Gravity
                if (obj.hasGravity) obj.vy += 0.5;

                // Auto Move
                if (obj.autoMove?.enabled) {
                    obj.x += obj.autoVx;
                    obj.y += obj.autoVy;
                    if (obj.autoMove.loop) {
                        const range = obj.autoMove.range || 200;
                        if (obj.autoMove.speedX !== 0) {
                            const dist = obj.x - obj.startX;
                            if (obj.autoVx > 0 && dist > range) obj.autoVx = -Math.abs(obj.autoMove.speedX);
                            else if (obj.autoVx < 0 && dist < 0) obj.autoVx = Math.abs(obj.autoMove.speedX);
                        }
                    }
                }

                obj.x += obj.vx;
                obj.y += obj.vy;

                // Floor
                if (obj.hasGravity && obj.y + obj.height > FLOOR_Y) {
                    obj.y = FLOOR_Y - obj.height;
                    obj.vy = 0;
                    obj.isGrounded = true;
                }

                // Solids
                if (obj.hasCollision) {
                   solids.forEach(other => {
                      if (obj.id === other.id) return;
                      if (rectIntersect(obj, other)) {
                          // Simple resolve
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

            // 3. Collisions Triggers
            const idsToDestroy = new Set();
            currentScene.events.filter(e => e.condition.type === 'COLLISION').forEach(evt => {
                 const subjectType = evt.condition.target || 'Player';
                 const targetType = evt.condition.param;
                 
                 const subjects = runtimeObjects.filter(o => o.type === subjectType || (subjectType === 'Player' && o.type === 'Player'));
                 const targets = runtimeObjects.filter(o => o.type === targetType);
                 
                 subjects.forEach(sub => {
                     targets.forEach(tgt => {
                         if (sub.id !== tgt.id && rectIntersect(sub, tgt)) {
                             // Check for DESTROY
                             if (evt.action.type === 'DESTROY') {
                                 if (evt.action.target === 'OTHER' || evt.action.target === tgt.type) idsToDestroy.add(tgt.id);
                                 if (evt.action.target === 'SELF' || evt.action.target === sub.type) idsToDestroy.add(sub.id);
                             }
                             // REVERSE
                             if (evt.action.type === 'REVERSE_X') {
                                 if (evt.action.target === 'OTHER' || evt.action.target === tgt.type) { tgt.vx *= -1; tgt.autoVx *= -1; }
                                 if (evt.action.target === 'SELF' || evt.action.target === sub.type) { sub.vx *= -1; sub.autoVx *= -1; }
                             }
                             // GOTO SCENE
                             if (evt.action.type === 'GOTO_SCENE') nextSceneId = evt.action.sceneId;
                         }
                     });
                 });
            });

            if (nextSceneId) {
                loadScene(nextSceneId);
                return;
            }

            // Remove destroyed
            runtimeObjects = runtimeObjects.filter(obj => {
                if (idsToDestroy.has(obj.id)) {
                    obj.el.remove();
                    return false;
                }
                return true;
            });

            // 4. Render
            runtimeObjects.forEach(obj => {
                updateElementTransform(obj.el, obj);
            });
            
            // HUD
            updateHud();

            animationFrameId = requestAnimationFrame(loop);
        }
        
        function updateHud() {
             hud.innerHTML = '';
             // Global
             DATA.globalVariables.forEach(v => {
                 const el = document.createElement('div');
                 el.className = 'var-badge';
                 el.style.borderColor = '#a855f7'; // Purple
                 el.textContent = \`\${v.name}: \${globalVars[v.id]}\`;
                 hud.appendChild(el);
             });
             // Scene
             currentScene.variables.forEach(v => {
                 const el = document.createElement('div');
                 el.className = 'var-badge';
                 el.style.borderColor = '#4ade80'; // Green
                 el.textContent = \`\${v.name}: \${sceneVars[v.id]}\`;
                 hud.appendChild(el);
             });
        }

        function rectIntersect(r1, r2) {
            return !(r2.x > r1.x + r1.width || 
                     r2.x + r2.width < r1.x || 
                     r2.y > r1.y + r1.height || 
                     r2.y + r2.height < r1.y);
        }

        loadScene(DATA.scenes[0].id);
    </script>
</body>
</html>`;
}
