

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameEvent, GameObject, ObjectType, Scene, UploadedAsset, Variable, GameGenreType, CustomTemplate, LightSource, Tileset } from './types';
import { v4 as uuidv4 } from 'uuid';
import { TEMPLATES } from './templates';
import { GAME_VIEW_PRESETS } from './utils/viewPresets';
import { GENRE_PRESETS } from './utils/genrePresets';
import { saveTemplateToStorage } from './utils/templateStorage';

interface EditorState {
  scenes: Scene[];
  currentSceneId: string;
  assets: UploadedAsset[]; // Library of uploaded images
  tilesets: Tileset[];
  variables: Variable[]; // Global variables
  selectedObjectId: string | null;
  activeTileBrush: { tilesetId: string, tileX: number, tileY: number } | null;
  mode: 'EDIT' | 'PLAY';
  
  // Grid Settings
  gridSize: number;
  showGrid: boolean;
  isSnapping: boolean;
  rotationSnap: number;
  
  toggleGrid: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;
  setRotationSnap: (angle: number) => void;

  // Scene Management
  addScene: () => void;
  deleteScene: (id: string) => void;
  setCurrentScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void; // New action

  // Object Actions (Target Current Scene)
  addObject: (type: ObjectType, x: number, y: number, props?: Partial<GameObject>) => void;
  updateObject: (id: string, updates: Partial<GameObject>) => void;
  selectObject: (id: string | null) => void;
  deleteObject: (id: string) => void;
  
  addAsset: (asset: UploadedAsset) => void;
  deleteAsset: (id: string) => void;

  addTileset: (tileset: Tileset) => void;
  deleteTileset: (id: string) => void;
  setActiveTileBrush: (brush: { tilesetId: string, tileX: number, tileY: number } | null) => void;
  
  // Event Actions (Target Current Scene)
  addEvent: () => void;
  duplicateEvent: (id: string) => void;
  updateEvent: (id: string, updates: Partial<GameEvent>) => void;
  deleteEvent: (id: string) => void;

  // Variable Actions
  addVariable: (scope: 'global' | 'scene') => void;
  updateVariable: (id: string, updates: Partial<Variable>) => void;
  deleteVariable: (id: string) => void;
  
  // Lighting Actions
  addLight: (light: LightSource) => void;
  updateLight: (id: string, updates: Partial<LightSource>) => void;
  deleteLight: (id: string) => void;
  updateAmbientLight: (updates: { color?: string; intensity?: number }) => void;

  setMode: (mode: 'EDIT' | 'PLAY') => void;
  loadProject: (data: { scenes?: Scene[], currentSceneId?: string, objects?: GameObject[], events?: GameEvent[], assets?: UploadedAsset[], variables?: Variable[], tilesets?: Tileset[] }) => void;
  loadTemplate: (template: any) => void;
  createProjectFromGenre: (genre: GameGenreType) => void;
  saveProjectAsTemplate: (name: string, description: string) => void;
  createProjectFromCustomTemplate: (template: CustomTemplate) => void;
  
  // Helpers
  getCurrentScene: () => Scene | undefined;
}

// Use Platformer template as the default state
const DEFAULT_TEMPLATE = TEMPLATES.find(t => t.name === 'Platformer Starter') || TEMPLATES[0];

export const useStore = create<EditorState>()(
  persist(
    (set, get) => ({
      scenes: DEFAULT_TEMPLATE.scenes,
      currentSceneId: DEFAULT_TEMPLATE.scenes[0].id,
      assets: [],
      tilesets: [],
      variables: [], // Global variables
      selectedObjectId: null,
      activeTileBrush: null,
      mode: 'EDIT',
      gridSize: 32,
      showGrid: true,
      isSnapping: true,
      rotationSnap: 15,

      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      toggleSnap: () => set((state) => ({ isSnapping: !state.isSnapping })),
      setGridSize: (size) => set({ gridSize: size }),
      setRotationSnap: (angle) => set({ rotationSnap: angle }),

      getCurrentScene: () => {
        const state = get();
        return state.scenes.find(s => s.id === state.currentSceneId);
      },

      // Scene Actions
      addScene: () => set(state => {
        const newScene: Scene = {
          id: uuidv4(),
          name: `Scene ${state.scenes.length + 1}`,
          // Inherit view from current scene if possible, or default to SIDE
          view: state.scenes.find(s => s.id === state.currentSceneId)?.view || 'SIDE',
          objects: [],
          events: [],
          variables: []
        };
        return { 
          scenes: [...state.scenes, newScene],
          currentSceneId: newScene.id
        };
      }),

      deleteScene: (id) => set(state => {
        if (state.scenes.length <= 1) return state; // Prevent deleting last scene
        const newScenes = state.scenes.filter(s => s.id !== id);
        return {
          scenes: newScenes,
          currentSceneId: state.currentSceneId === id ? newScenes[0].id : state.currentSceneId
        };
      }),

      setCurrentScene: (id) => set({ currentSceneId: id, selectedObjectId: null, activeTileBrush: null }),

      renameScene: (id, name) => set(state => ({
        scenes: state.scenes.map(s => s.id === id ? { ...s, name } : s)
      })),

      updateScene: (id, updates) => set(state => ({
        scenes: state.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
      })),

      // Object Actions
      addObject: (type, x, y, props = {}) => set((state) => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;

        const currentScene = state.scenes[sceneIndex];
        const viewPreset = GAME_VIEW_PRESETS[currentScene.view || 'SIDE'];

        const defaults = {
          Player: { w: 32, h: 32, c: '#3b82f6' },
          Enemy: { w: 32, h: 32, c: '#ef4444' },
          Coin: { w: 16, h: 16, c: '#eab308' },
          Wall: { w: 96, h: 32, c: '#64748b' },
          Sprite: { w: 64, h: 64, c: '#ffffff' },
          Tile: { w: 32, h: 32, c: '#ffffff' },
        };
        
        const count = currentScene.objects.filter(o => o.type === type).length;
        const def = defaults[type];
        
        const newObj: GameObject = {
          id: uuidv4(),
          name: `${type} ${count + 1}`,
          type,
          x,
          y,
          width: def.w,
          height: def.h,
          color: def.c,
          rotation: 0,
          keepAspectRatio: false,
          animations: [],
          currentAnimation: undefined,
          // Apply View Defaults
          hasGravity: type === 'Tile' ? false : viewPreset.gravity,
          hasCollision: type === 'Tile' || viewPreset.defaultBehaviors.hasCollision,
          autoMove: {
            enabled: false,
            speedX: 0,
            speedY: 0,
            loop: false,
            range: 200
          },
          ...props
        };

        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = {
          ...currentScene,
          objects: [...currentScene.objects, newObj]
        };

        return { scenes: updatedScenes, selectedObjectId: newObj.id };
      }),

      updateObject: (id, updates) => set((state) => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;

        const currentScene = state.scenes[sceneIndex];
        const updatedObjects = currentScene.objects.map(obj => obj.id === id ? { ...obj, ...updates } : obj);

        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = { ...currentScene, objects: updatedObjects };

        return { scenes: updatedScenes };
      }),

      selectObject: (id) => set({ selectedObjectId: id, activeTileBrush: null }),
      
      deleteObject: (id) => set((state) => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;
        
        const currentScene = state.scenes[sceneIndex];
        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = {
          ...currentScene,
          objects: currentScene.objects.filter(o => o.id !== id)
        };
        
        return {
          scenes: updatedScenes,
          selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId
        };
      }),

      addAsset: (asset) => set((state) => ({
        assets: [...state.assets, asset]
      })),

      deleteAsset: (id) => set((state) => ({
        assets: state.assets.filter(a => a.id !== id)
      })),

      addTileset: (tileset) => set((state) => ({
        tilesets: [...state.tilesets, tileset]
      })),

      deleteTileset: (id) => set((state) => ({
        tilesets: state.tilesets.filter(t => t.id !== id),
        activeTileBrush: state.activeTileBrush?.tilesetId === id ? null : state.activeTileBrush
      })),

      setActiveTileBrush: (brush) => set({ activeTileBrush: brush, selectedObjectId: null }),

      addEvent: () => set((state) => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;

        const currentScene = state.scenes[sceneIndex];
        const newEvent: GameEvent = { 
          id: uuidv4(), 
          condition: { type: 'ALWAYS' }, 
          action: { type: 'MOVE_X', target: 'Player', param: 0 } 
        };

        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = {
          ...currentScene,
          events: [...currentScene.events, newEvent]
        };

        return { scenes: updatedScenes };
      }),

      duplicateEvent: (id) => set((state) => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;

        const currentScene = state.scenes[sceneIndex];
        const eventIndex = currentScene.events.findIndex(e => e.id === id);
        if (eventIndex === -1) return state;

        const originalEvent = currentScene.events[eventIndex];
        const newEvent: GameEvent = {
            ...originalEvent,
            id: uuidv4(),
            // Ensure deep copy of nested objects
            condition: { ...originalEvent.condition },
            action: { ...originalEvent.action }
        };

        const newEvents = [...currentScene.events];
        // Insert duplicated event right after the original
        newEvents.splice(eventIndex + 1, 0, newEvent);

        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = { ...currentScene, events: newEvents };

        return { scenes: updatedScenes };
      }),

      updateEvent: (id, updates) => set((state) => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;

        const currentScene = state.scenes[sceneIndex];
        const updatedEvents = currentScene.events.map(e => e.id === id ? { ...e, ...updates } : e);
        
        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = { ...currentScene, events: updatedEvents };

        return { scenes: updatedScenes };
      }),

      deleteEvent: (id) => set((state) => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;

        const currentScene = state.scenes[sceneIndex];
        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = {
            ...currentScene,
            events: currentScene.events.filter(e => e.id !== id)
        };
        return { scenes: updatedScenes };
      }),

      addVariable: (scope) => set((state) => {
        const newVar: Variable = {
          id: uuidv4(),
          name: 'NewVariable',
          initialValue: 0,
          scope
        };

        if (scope === 'global') {
          return { variables: [...state.variables, newVar] };
        } else {
          const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
          if (sceneIndex === -1) return state;

          const updatedScenes = [...state.scenes];
          updatedScenes[sceneIndex] = {
            ...updatedScenes[sceneIndex],
            variables: [...updatedScenes[sceneIndex].variables, newVar]
          };
          return { scenes: updatedScenes };
        }
      }),

      updateVariable: (id, updates) => set((state) => {
        // Check global vars
        if (state.variables.some(v => v.id === id)) {
          return {
            variables: state.variables.map(v => v.id === id ? { ...v, ...updates } : v)
          };
        }
        
        // Check current scene vars
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex !== -1) {
           const updatedScenes = [...state.scenes];
           updatedScenes[sceneIndex] = {
             ...updatedScenes[sceneIndex],
             variables: updatedScenes[sceneIndex].variables.map(v => v.id === id ? { ...v, ...updates } : v)
           };
           return { scenes: updatedScenes };
        }
        return state;
      }),

      deleteVariable: (id) => set((state) => {
         // Try deleting from global
         const globalFiltered = state.variables.filter(v => v.id !== id);
         if (globalFiltered.length !== state.variables.length) {
             return { variables: globalFiltered };
         }
         
         // Try deleting from scene
         const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
         if (sceneIndex !== -1) {
            const updatedScenes = [...state.scenes];
            updatedScenes[sceneIndex] = {
                ...updatedScenes[sceneIndex],
                variables: updatedScenes[sceneIndex].variables.filter(v => v.id !== id)
            };
            return { scenes: updatedScenes };
         }
         return state;
      }),

      // Lighting Actions
      addLight: (light) => set(state => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;
        const currentScene = state.scenes[sceneIndex];
        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = {
            ...currentScene,
            lights: [...(currentScene.lights || []), light]
        };
        return { scenes: updatedScenes };
      }),

      updateLight: (id, updates) => set(state => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;
        const currentScene = state.scenes[sceneIndex];
        const updatedLights = (currentScene.lights || []).map(l => l.id === id ? { ...l, ...updates } : l);
        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = { ...currentScene, lights: updatedLights };
        return { scenes: updatedScenes };
      }),

      deleteLight: (id) => set(state => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;
        const currentScene = state.scenes[sceneIndex];
        const updatedLights = (currentScene.lights || []).filter(l => l.id !== id);
        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = { ...currentScene, lights: updatedLights };
        return { scenes: updatedScenes };
      }),

      updateAmbientLight: (updates) => set(state => {
        const sceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
        if (sceneIndex === -1) return state;
        const currentScene = state.scenes[sceneIndex];
        const updatedScenes = [...state.scenes];
        updatedScenes[sceneIndex] = {
            ...currentScene,
            ambientLight: { ...(currentScene.ambientLight || { color: '#ffffff', intensity: 1 }), ...updates }
        };
        return { scenes: updatedScenes };
      }),

      setMode: (mode) => set({ mode }),
      
      loadProject: (data) => {
        // Migration logic for old single-scene projects
        let loadedScenes = data.scenes;
        if (!loadedScenes && data.objects) {
          loadedScenes = [{
             id: uuidv4(),
             name: 'Scene 1',
             objects: data.objects,
             events: data.events || [],
             variables: []
          }];
        }

        set({ 
            scenes: loadedScenes,
            currentSceneId: loadedScenes ? loadedScenes[0].id : '', 
            assets: data.assets || [], 
            tilesets: data.tilesets || [],
            variables: data.variables || [], // Global vars
            mode: 'EDIT', 
            selectedObjectId: null 
        });
      },
      
      loadTemplate: (template) => {
          // Clone to avoid reference issues
          const scenes = JSON.parse(JSON.stringify(template.scenes));
          // Regenerate IDs
          scenes.forEach((s: Scene) => {
             s.id = uuidv4();
             // Ensure view is set (handled by App.tsx injection, but safety fallback)
             if (!s.view) s.view = 'SIDE';
             
             s.objects.forEach(o => o.id = uuidv4());
             s.events.forEach(e => e.id = uuidv4());
             s.variables.forEach(v => v.id = uuidv4());
          });

          set({ 
              scenes, 
              currentSceneId: scenes[0].id,
              variables: [], 
              mode: 'EDIT', 
              selectedObjectId: null 
          });
      },

      createProjectFromGenre: (genre) => {
         const preset = GENRE_PRESETS[genre];
         
         // Create Global Vars
         const globalVars: Variable[] = preset.variables
            .filter(v => v.scope === 'global')
            .map(v => ({ id: uuidv4(), name: v.name!, initialValue: v.initialValue!, scope: 'global' }));
         
         const varNameMap: Record<string, string> = {};
         globalVars.forEach(v => varNameMap[v.name] = v.id);

         // Map Name to ID for Prefab linking
         const objNameMap: Record<string, string> = {};

         // Create Objects with IDs
         const objects: GameObject[] = preset.starterObjects.map(obj => {
             const newId = uuidv4();
             if (obj.name) objNameMap[obj.name] = newId;

             return {
                id: newId,
                name: obj.name || 'Object',
                type: obj.type || 'Wall',
                x: obj.x || 0,
                y: obj.y || 0,
                width: obj.width || 32,
                height: obj.height || 32,
                color: obj.color || '#ccc',
                rotation: obj.rotation || 0,
                keepAspectRatio: obj.keepAspectRatio || false,
                hasGravity: obj.hasGravity || false,
                hasCollision: obj.hasCollision || false,
                isPrefab: obj.isPrefab || false,
                variables: obj.variables || {},
                autoMove: obj.autoMove ? { ...obj.autoMove } : { enabled: false, speedX: 0, speedY: 0, loop: false, range: 0 }
             };
         });

         // Create Events and link Vars
         const events: GameEvent[] = preset.starterEvents.map(evt => {
            // Attempt to resolve var ID by name if preset used 'variableId' as name
            let varId = evt.condition?.variableId;
            if (varId && varNameMap[varId]) varId = varNameMap[varId];

            let actVarId = evt.action?.variableId;
            if (actVarId && varNameMap[actVarId]) actVarId = varNameMap[actVarId];

            // Resolve Prefab ID if it is a name
            let prefabId = evt.action?.prefabId;
            if (prefabId && objNameMap[prefabId]) prefabId = objNameMap[prefabId];

            return {
                id: uuidv4(),
                condition: { 
                   type: 'ALWAYS', 
                   ...evt.condition, 
                   variableId: varId 
                },
                action: { 
                   type: 'MOVE_X', 
                   target: 'Player', 
                   param: 0, 
                   ...evt.action,
                   variableId: actVarId,
                   prefabId: prefabId
                }
            } as GameEvent;
         });

         const newScene: Scene = {
             id: uuidv4(),
             name: 'Level 1',
             view: preset.view,
             objects,
             events,
             variables: []
         };

         set({
            scenes: [newScene],
            currentSceneId: newScene.id,
            variables: globalVars,
            assets: [],
            tilesets: [],
            mode: 'EDIT',
            selectedObjectId: null,
            gridSize: preset.gridSize
         });
      },

      saveProjectAsTemplate: (name, description) => {
        const state = get();
        const currentScene = state.getCurrentScene();
        if (!currentScene) return;

        // Snapshot variables (Global + Scene)
        const variables = JSON.parse(JSON.stringify(state.variables));

        // Sanitize Objects (Remove runtime/editor IDs to ensure clean copies later)
        const objects = currentScene.objects.map(o => ({ ...o }));
        const events = currentScene.events.map(e => ({ ...e }));

        const template: CustomTemplate = {
            id: uuidv4(),
            name,
            description,
            createdAt: Date.now(),
            view: currentScene.view || 'SIDE',
            gridSize: state.gridSize,
            objects,
            events,
            variables
        };

        saveTemplateToStorage(template);
      },

      createProjectFromCustomTemplate: (template) => {
         const varIdMap: Record<string, string> = {};
         
         const newVariables: Variable[] = template.variables.map(v => {
             const newId = uuidv4();
             varIdMap[v.id] = newId;
             return { ...v, id: newId };
         });

         const newObjects: GameObject[] = template.objects.map(obj => ({
             ...obj,
             id: uuidv4(),
         } as GameObject));

         const newEvents: GameEvent[] = template.events.map(evt => {
             const newCondition = { ...evt.condition };
             if (newCondition?.variableId && varIdMap[newCondition.variableId]) {
                 newCondition.variableId = varIdMap[newCondition.variableId];
             }

             const newAction = { ...evt.action };
             if (newAction?.variableId && varIdMap[newAction.variableId]) {
                 newAction.variableId = varIdMap[newAction.variableId];
             }

             return {
                 id: uuidv4(),
                 condition: newCondition,
                 action: newAction
             } as GameEvent;
         });

         const newScene: Scene = {
             id: uuidv4(),
             name: 'Level 1',
             view: template.view,
             objects: newObjects,
             events: newEvents,
             variables: []
         };

         set({
            scenes: [newScene],
            currentSceneId: newScene.id,
            variables: newVariables,
            assets: [], 
            mode: 'EDIT',
            selectedObjectId: null,
            gridSize: template.gridSize
         });
      }
    }),
    {
      name: 'react-game-maker-storage-v3', // Changed storage key
      partialize: (state) => ({ 
        scenes: state.scenes,
        assets: state.assets,
        tilesets: state.tilesets,
        variables: state.variables,
        gridSize: state.gridSize,
        showGrid: state.showGrid,
        isSnapping: state.isSnapping,
        rotationSnap: state.rotationSnap
      }),
    }
  )
);
