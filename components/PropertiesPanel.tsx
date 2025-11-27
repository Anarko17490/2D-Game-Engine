
import React, { useState } from 'react';
import { useStore } from '../store';
import { Trash2, Grip, Type, Maximize, Zap, PlayCircle, Film, Plus, Repeat, RotateCw, Lock, Music, Layers, Variable as VarIcon, Eye, EyeOff, Sun, Lightbulb, Copy, Timer, Database, Image as ImageIcon, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Animation, ObjectType } from '../types';
import { snapRotation } from '../utils/grid';

const OBJECT_TYPES: ObjectType[] = ['Player', 'Enemy', 'Wall', 'Coin', 'Sprite'];

export const PropertiesPanel: React.FC = () => {
  const currentScene = useStore(state => state.getCurrentScene());
  const updateScene = useStore(state => state.updateScene);
  const selectedObjectId = useStore((state) => state.selectedObjectId);
  const assets = useStore((state) => state.assets);
  const addAsset = useStore((state) => state.addAsset);
  const updateObject = useStore((state) => state.updateObject);
  const deleteObject = useStore((state) => state.deleteObject);
  const rotationSnap = useStore((state) => state.rotationSnap);
  const setRotationSnap = useStore((state) => state.setRotationSnap);
  
  const addLight = useStore(state => state.addLight);
  const updateLight = useStore(state => state.updateLight);
  const deleteLight = useStore(state => state.deleteLight);
  const updateAmbientLight = useStore(state => state.updateAmbientLight);

  const [editingAnimId, setEditingAnimId] = useState<string | null>(null);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'number' | 'string' | 'boolean'>('number');

  const objects = currentScene ? currentScene.objects : [];
  const selectedObject = objects.find(o => o.id === selectedObjectId);
  const audioClips = assets.filter(a => a.type === 'audio');
  const spriteAssets = assets.filter(a => a.type === 'sprite');

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentScene) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        const newAsset = {
          id: uuidv4(),
          name: file.name.split('.')[0], // Remove extension
          src: base64,
          type: 'sprite' as const
        };
        addAsset(newAsset);
        updateScene(currentScene.id, { backgroundImageId: newAsset.id });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  // --- SCENE PROPERTIES ---
  if (!selectedObject) {
    if (!currentScene) return null;
    return (
      <div className="w-64 bg-slate-800 border-l border-slate-700 p-4 flex flex-col h-full overflow-y-auto">
         <div className="p-4 border-b border-slate-700 mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Scene Settings</h2>
         </div>
         
         <div className="space-y-4">
             <div>
                 <label className="text-xs text-slate-500 block mb-1">Scene Name</label>
                 <input 
                    type="text" 
                    value={currentScene.name}
                    onChange={(e) => updateScene(currentScene.id, { name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
                 />
             </div>
             
             <div>
                 <label className="text-xs text-slate-500 block mb-1">Camera View</label>
                 <select 
                    value={currentScene.view || 'SIDE'}
                    onChange={(e) => updateScene(currentScene.id, { view: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
                 >
                     <option value="SIDE">Side Scroller (Platformer)</option>
                     <option value="TOP_DOWN">Top Down (RPG/Zelda)</option>
                     <option value="ISO">Isometric</option>
                 </select>
             </div>

             <div className="pt-4 border-t border-slate-700">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-3">
                     <ImageIcon size={12} /> Background
                </label>
                <div className="bg-slate-900 p-2 rounded border border-slate-700 space-y-3">
                    <div>
                         <label className="text-[10px] text-slate-500 block mb-1">Color</label>
                         <div className="flex gap-2">
                             <input 
                                type="color" 
                                value={currentScene.backgroundColor || '#0f172a'}
                                onChange={(e) => updateScene(currentScene.id, { backgroundColor: e.target.value })}
                                className="w-6 h-6 bg-transparent border-none p-0 cursor-pointer"
                             />
                             <input 
                                type="text"
                                value={currentScene.backgroundColor || '#0f172a'}
                                onChange={(e) => updateScene(currentScene.id, { backgroundColor: e.target.value })}
                                className="flex-1 bg-slate-800 border border-slate-600 rounded text-xs px-1 text-white"
                             />
                         </div>
                     </div>
                     <div>
                         <label className="text-[10px] text-slate-500 block mb-1">Image</label>
                         <div className="flex gap-2">
                            <select 
                                value={currentScene.backgroundImageId || ''}
                                onChange={(e) => updateScene(currentScene.id, { backgroundImageId: e.target.value || undefined })}
                                className="w-full bg-slate-800 border border-slate-600 rounded text-xs p-1 text-white"
                            >
                                <option value="">None</option>
                                {spriteAssets.map(asset => (
                                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={() => document.getElementById('bg-scene-upload')?.click()}
                                className="p-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-400 hover:text-white transition-colors"
                                title="Upload Background Image"
                            >
                                <Upload size={14} />
                            </button>
                            <input 
                                id="bg-scene-upload"
                                type="file" 
                                onChange={handleBackgroundUpload} 
                                className="hidden" 
                                accept="image/png, image/jpeg, image/webp" 
                            />
                         </div>
                         {spriteAssets.length === 0 && (
                             <div className="text-[9px] text-slate-600 mt-1 italic">Upload sprites or click button to add background.</div>
                         )}
                     </div>
                     <div>
                         <label className="text-[10px] text-slate-500 block mb-1">Image Size</label>
                         <select 
                            value={currentScene.backgroundSize || 'cover'}
                            onChange={(e) => updateScene(currentScene.id, { backgroundSize: e.target.value as any })}
                            className="w-full bg-slate-800 border border-slate-600 rounded text-xs p-1 text-white"
                        >
                            <option value="cover">Cover (Fill)</option>
                            <option value="contain">Contain (Fit)</option>
                            <option value="stretch">Stretch</option>
                        </select>
                     </div>
                </div>
             </div>

             <div className="pt-4 border-t border-slate-700">
                 <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-3">
                     <Sun size={12} /> Lighting
                 </label>
                 
                 <div className="bg-slate-900 p-2 rounded border border-slate-700 space-y-3">
                     <div>
                         <label className="text-[10px] text-slate-500 block mb-1">Ambient Color</label>
                         <div className="flex gap-2">
                             <input 
                                type="color" 
                                value={currentScene.ambientLight?.color || '#ffffff'}
                                onChange={(e) => updateAmbientLight({ color: e.target.value })}
                                className="w-6 h-6 bg-transparent border-none p-0 cursor-pointer"
                             />
                             <input 
                                type="text"
                                value={currentScene.ambientLight?.color || '#ffffff'}
                                onChange={(e) => updateAmbientLight({ color: e.target.value })}
                                className="flex-1 bg-slate-800 border border-slate-600 rounded text-xs px-1 text-white"
                             />
                         </div>
                     </div>
                     <div>
                         <label className="text-[10px] text-slate-500 block mb-1">Intensity</label>
                         <input 
                            type="range"
                            min="0" max="1" step="0.1"
                            value={currentScene.ambientLight?.intensity ?? 1}
                            onChange={(e) => updateAmbientLight({ intensity: parseFloat(e.target.value) })}
                            className="w-full"
                         />
                     </div>
                 </div>

                 <div className="mt-3">
                     <button 
                        onClick={() => addLight({ id: uuidv4(), name: 'New Light', x: 400, y: 300, radius: 100, color: '#ffffff', intensity: 0.8 })}
                        className="w-full py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white flex items-center justify-center gap-1"
                     >
                         <Plus size={12} /> Add Point Light
                     </button>
                 </div>

                 <div className="space-y-2 mt-2">
                     {currentScene.lights?.map(light => (
                         <div key={light.id} className="bg-slate-900 p-2 rounded border border-slate-700">
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-xs font-bold text-yellow-500">Light</span>
                                 <button onClick={() => deleteLight(light.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={10} /></button>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                     <label className="text-[10px] text-slate-500">Radius</label>
                                     <input type="number" value={light.radius} onChange={(e) => updateLight(light.id, { radius: parseInt(e.target.value) })} className="w-full bg-slate-800 border border-slate-600 rounded text-xs p-1" />
                                 </div>
                                 <div>
                                     <label className="text-[10px] text-slate-500">Color</label>
                                     <div className="flex gap-1">
                                         <input type="color" value={light.color} onChange={(e) => updateLight(light.id, { color: e.target.value })} className="w-4 h-full" />
                                     </div>
                                 </div>
                                 <div className="col-span-2">
                                     <label className="text-[10px] text-slate-500">Follow Object ID</label>
                                     <input type="text" value={light.followObjectId || ''} onChange={(e) => updateLight(light.id, { followObjectId: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded text-xs p-1" placeholder="Optional" />
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         </div>
         
         <div className="flex flex-col items-center justify-center text-slate-500 mb-6 mt-8">
             <div className="w-12 h-12 rounded-full bg-slate-700 mb-3 flex items-center justify-center">
               <Layers size={24} />
             </div>
             <p className="text-sm font-medium text-slate-300">No Object Selected</p>
             <p className="text-xs">Select an object to edit properties.</p>
         </div>
      </div>
    );
  }

  const handleChange = (field: keyof typeof selectedObject, value: any) => {
    updateObject(selectedObject.id, { [field]: value });
  };

  const handleRotationChange = (val: number) => {
      updateObject(selectedObject.id, { rotation: val });
  };

  const handleAutoMoveChange = (field: 'enabled' | 'speedX' | 'speedY' | 'loop' | 'range', value: any) => {
    const current = selectedObject.autoMove || { enabled: false, speedX: 0, speedY: 0, loop: false, range: 200 };
    updateObject(selectedObject.id, {
      autoMove: { ...current, [field]: value }
    });
  };

  const handleShadowChange = (field: 'enabled' | 'color' | 'blur' | 'offsetX' | 'offsetY', value: any) => {
      const current = selectedObject.shadow || { enabled: false, color: '#000000', blur: 10, offsetX: 0, offsetY: 5 };
      updateObject(selectedObject.id, {
          shadow: { ...current, [field]: value }
      });
  };

  const handleAddVariable = () => {
    if (!newVarName) return;
    const currentVars = selectedObject.variables || {};
    let initialVal: string | number | boolean = 0;
    if (newVarType === 'string') initialVal = 'text';
    if (newVarType === 'boolean') initialVal = false;

    const currentProps = selectedObject.variableProps || {};

    updateObject(selectedObject.id, {
        variables: { ...currentVars, [newVarName]: initialVal },
        variableProps: { ...currentProps, [newVarName]: { showInHud: false } }
    });
    setNewVarName('');
  };

  const handleUpdateVariable = (key: string, val: string | number | boolean) => {
      const currentVars = selectedObject.variables || {};
      updateObject(selectedObject.id, {
          variables: { ...currentVars, [key]: val }
      });
  };

  const handleToggleHud = (key: string) => {
      const currentProps = selectedObject.variableProps || {};
      const varProp = currentProps[key] || {};
      updateObject(selectedObject.id, {
          variableProps: {
              ...currentProps,
              [key]: { ...varProp, showInHud: !varProp.showInHud }
          }
      });
  };

  const handleDeleteVariable = (key: string) => {
      const currentVars = { ...selectedObject.variables };
      delete currentVars[key];
      const currentProps = { ...selectedObject.variableProps };
      delete currentProps[key];

      updateObject(selectedObject.id, { variables: currentVars, variableProps: currentProps });
  };

  const handleAddAnimation = () => {
    const newAnim: Animation = {
      id: uuidv4(),
      name: `Anim ${selectedObject.animations?.length ? selectedObject.animations.length + 1 : 1}`,
      frameAssetIds: [],
      fps: 10,
      loop: true
    };
    const newAnims = [...(selectedObject.animations || []), newAnim];
    updateObject(selectedObject.id, { animations: newAnims });
    setEditingAnimId(newAnim.id);
  };

  const updateAnimation = (animId: string, updates: Partial<Animation>) => {
    const newAnims = selectedObject.animations?.map(a => a.id === animId ? { ...a, ...updates } : a);
    updateObject(selectedObject.id, { animations: newAnims });
  };

  const deleteAnimation = (animId: string) => {
    const newAnims = selectedObject.animations?.filter(a => a.id !== animId);
    updateObject(selectedObject.id, { animations: newAnims });
    if (editingAnimId === animId) setEditingAnimId(null);
  };

  const toggleFrame = (animId: string, assetId: string) => {
    const anim = selectedObject.animations?.find(a => a.id === animId);
    if (!anim) return;

    let newFrames = [...anim.frameAssetIds];
    if (newFrames.includes(assetId)) {
      newFrames = newFrames.filter(id => id !== assetId);
    } else {
      newFrames.push(assetId);
    }
    updateAnimation(animId, { frameAssetIds: newFrames });
  };

  return (
    <div className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Properties</h2>
        <div className="font-medium text-white truncate">{selectedObject.name}</div>
        <div className="text-xs text-slate-500 font-mono truncate">{selectedObject.id.split('-')[0]}...</div>
      </div>

      <div className="p-4 space-y-6 pb-20">
        {/* Identity Section */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Type size={12} /> Identity
          </label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Type</label>
              <select 
                value={selectedObject.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
              >
                {OBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Name</label>
              <input
                type="text"
                value={selectedObject.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
              />
            </div>
            
            {/* Prefab & Pooling */}
            <div className="flex items-center justify-between mt-2">
               <label className="text-xs text-slate-400 flex items-center gap-1">
                   <Copy size={10} /> Is Prefab?
               </label>
               <input 
                  type="checkbox"
                  checked={selectedObject.isPrefab || false}
                  onChange={(e) => handleChange('isPrefab', e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800"
                  title="If checked, this object won't appear at start but can be spawned via events."
               />
            </div>
            
            {/* Pool Size (Only if Prefab) */}
            {selectedObject.isPrefab && (
                <div className="mt-1 flex items-center gap-2 bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                    <Database size={12} className="text-purple-400" />
                    <label className="text-[10px] text-slate-400 flex-1">Pool Size</label>
                    <input 
                       type="number"
                       min="1" max="100"
                       value={selectedObject.poolSize ?? 10}
                       onChange={(e) => handleChange('poolSize', parseInt(e.target.value))}
                       className="w-12 bg-slate-800 border border-slate-600 rounded text-xs text-white p-0.5 text-center"
                    />
                </div>
            )}

            {/* Spawn Cooldown (For Spawners) */}
            {!selectedObject.isPrefab && (
                <div className="mt-1 flex items-center gap-2 bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                    <Timer size={12} className="text-orange-400" />
                    <label className="text-[10px] text-slate-400 flex-1">Spawn Cooldown (s)</label>
                    <input 
                       type="number"
                       min="0" step="0.1"
                       value={selectedObject.spawnCooldown ?? 0}
                       onChange={(e) => handleChange('spawnCooldown', parseFloat(e.target.value))}
                       className="w-12 bg-slate-800 border border-slate-600 rounded text-xs text-white p-0.5 text-center"
                    />
                </div>
            )}

            <div>
              <label className="text-xs text-slate-500 block mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedObject.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={selectedObject.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Transform Section */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Maximize size={12} /> Transform
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">X</label>
              <input
                type="number"
                value={selectedObject.x}
                onChange={(e) => handleChange('x', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Y</label>
              <input
                type="number"
                value={selectedObject.y}
                onChange={(e) => handleChange('y', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Width</label>
              <input
                type="number"
                value={selectedObject.width}
                onChange={(e) => handleChange('width', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Height</label>
              <input
                type="number"
                value={selectedObject.height}
                onChange={(e) => handleChange('height', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-slate-500 block mb-1">Rotation (°)</label>
              <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={selectedObject.rotation || 0}
                    onChange={(e) => handleRotationChange(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                  />
                  <div className="flex flex-col gap-0.5">
                    <button 
                        onClick={() => handleRotationChange(snapRotation((selectedObject.rotation || 0) + 90, 90))}
                        className="p-1 bg-slate-800 border border-slate-600 rounded text-slate-400 hover:text-white"
                        title="Rotate +90"
                    >
                        <RotateCw size={10} />
                    </button>
                  </div>
              </div>
            </div>

            <div className="flex items-end">
                <button 
                    onClick={() => handleChange('keepAspectRatio', !selectedObject.keepAspectRatio)}
                    className={`w-full p-2 rounded text-xs flex items-center justify-center gap-2 border ${selectedObject.keepAspectRatio ? 'bg-blue-900/50 border-blue-600 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                >
                    <Lock size={12} />
                    {selectedObject.keepAspectRatio ? 'Locked' : 'Unlocked'}
                </button>
            </div>
          </div>
        </div>
        
        {/* Behaviors Section */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Zap size={12} /> Behaviors
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700">
               <span className="text-xs text-slate-300">Gravity</span>
               <div className="flex items-center">
                   <input
                    type="checkbox"
                    checked={selectedObject.hasGravity || false}
                    onChange={(e) => handleChange('hasGravity', e.target.checked)}
                    className="cursor-pointer"
                   />
               </div>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700">
               <span className="text-xs text-slate-300">Solid / Collision</span>
               <div className="flex items-center">
                   <input
                    type="checkbox"
                    checked={selectedObject.hasCollision || false}
                    onChange={(e) => handleChange('hasCollision', e.target.checked)}
                    className="cursor-pointer"
                   />
               </div>
            </div>

            {/* Auto Move */}
            <div className="bg-slate-900 p-2 rounded border border-slate-700 space-y-2">
               <div className="flex items-center justify-between">
                   <span className="text-xs text-slate-300 font-bold">Auto Move</span>
                   <input
                    type="checkbox"
                    checked={selectedObject.autoMove?.enabled || false}
                    onChange={(e) => handleAutoMoveChange('enabled', e.target.checked)}
                    className="cursor-pointer"
                   />
               </div>
               {selectedObject.autoMove?.enabled && (
                   <div className="grid grid-cols-2 gap-2 pt-1">
                       <div>
                           <label className="text-[10px] text-slate-500">Speed X</label>
                           <input type="number" value={selectedObject.autoMove.speedX} onChange={(e) => handleAutoMoveChange('speedX', parseFloat(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-xs text-white" />
                       </div>
                       <div>
                           <label className="text-[10px] text-slate-500">Speed Y</label>
                           <input type="number" value={selectedObject.autoMove.speedY} onChange={(e) => handleAutoMoveChange('speedY', parseFloat(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-xs text-white" />
                       </div>
                       <div>
                           <label className="text-[10px] text-slate-500">Range</label>
                           <input type="number" value={selectedObject.autoMove.range} onChange={(e) => handleAutoMoveChange('range', parseFloat(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-xs text-white" />
                       </div>
                       <div className="flex items-end">
                            <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                                <input type="checkbox" checked={selectedObject.autoMove.loop} onChange={(e) => handleAutoMoveChange('loop', e.target.checked)} /> Loop
                            </label>
                       </div>
                   </div>
               )}
            </div>
          </div>
        </div>

        {/* Animations Section */}
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                    <Film size={12} /> Animations
                </label>
                <button onClick={handleAddAnimation} className="text-blue-400 hover:text-white"><Plus size={14} /></button>
            </div>
            
            {selectedObject.animations?.map(anim => (
                <div key={anim.id} className="bg-slate-900 border border-slate-700 rounded p-2">
                    <div className="flex items-center justify-between mb-2">
                        {editingAnimId === anim.id ? (
                           <input 
                             autoFocus
                             className="bg-slate-800 text-xs text-white p-1 rounded w-24"
                             value={anim.name}
                             onChange={(e) => updateAnimation(anim.id, { name: e.target.value })}
                             onBlur={() => setEditingAnimId(null)}
                           />
                        ) : (
                           <span className="text-xs font-bold text-slate-200 cursor-pointer hover:text-blue-400" onClick={() => setEditingAnimId(anim.id)}>{anim.name}</span>
                        )}
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateAnimation(anim.id, { loop: !anim.loop })} className={`text-[10px] ${anim.loop ? 'text-green-400' : 'text-slate-600'}`} title="Loop"><Repeat size={10} /></button>
                            <button onClick={() => deleteAnimation(anim.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={10} /></button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                         <span className="text-[10px] text-slate-500">FPS:</span>
                         <input type="number" value={anim.fps} onChange={(e) => updateAnimation(anim.id, { fps: parseInt(e.target.value) })} className="w-10 bg-slate-800 text-xs text-white border border-slate-600 rounded p-0.5" />
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                        {assets.filter(a => a.type === 'sprite').map(sprite => (
                            <div 
                                key={sprite.id} 
                                onClick={() => toggleFrame(anim.id, sprite.id)}
                                className={`aspect-square bg-slate-800 rounded flex items-center justify-center cursor-pointer border ${anim.frameAssetIds.includes(sprite.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-transparent hover:border-slate-600'}`}
                            >
                                <img src={sprite.src} className="max-w-full max-h-full object-contain" />
                                {anim.frameAssetIds.includes(sprite.id) && (
                                    <div className="absolute top-0 right-0 bg-blue-500 text-[8px] text-white px-1 rounded-bl">
                                        {anim.frameAssetIds.indexOf(sprite.id) + 1}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* Visual Effects */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
             <Eye size={12} /> Visual Effects
          </label>
          <div className="bg-slate-900 p-2 rounded border border-slate-700">
               <div className="flex items-center justify-between mb-2">
                   <span className="text-xs text-slate-300">Drop Shadow</span>
                   <input type="checkbox" checked={selectedObject.shadow?.enabled || false} onChange={(e) => handleShadowChange('enabled', e.target.checked)} />
               </div>
               {selectedObject.shadow?.enabled && (
                   <div className="space-y-2">
                       <div className="flex gap-2">
                           <input type="color" value={selectedObject.shadow.color} onChange={(e) => handleShadowChange('color', e.target.value)} className="w-6 h-6 bg-transparent border-none p-0 cursor-pointer" />
                           <input type="text" value={selectedObject.shadow.color} onChange={(e) => handleShadowChange('color', e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded text-xs px-1 text-white" />
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                           <div>
                               <label className="text-[10px] text-slate-500">Blur</label>
                               <input type="number" value={selectedObject.shadow.blur} onChange={(e) => handleShadowChange('blur', parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded px-1 text-xs text-white" />
                           </div>
                           <div>
                               <label className="text-[10px] text-slate-500">Off X</label>
                               <input type="number" value={selectedObject.shadow.offsetX} onChange={(e) => handleShadowChange('offsetX', parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded px-1 text-xs text-white" />
                           </div>
                           <div>
                               <label className="text-[10px] text-slate-500">Off Y</label>
                               <input type="number" value={selectedObject.shadow.offsetY} onChange={(e) => handleShadowChange('offsetY', parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded px-1 text-xs text-white" />
                           </div>
                       </div>
                   </div>
               )}
          </div>
        </div>

        {/* Instance Variables */}
        <div className="space-y-3">
           <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                    <VarIcon size={12} /> Variables
                </label>
            </div>
            
            <div className="space-y-2">
                {Object.entries(selectedObject.variables || {}).map(([key, val]) => (
                    <div key={key} className="bg-slate-900 border border-slate-700 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-purple-300">{key}</span>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => handleToggleHud(key)} 
                                    className={`p-1 rounded ${selectedObject.variableProps?.[key]?.showInHud ? 'text-blue-400' : 'text-slate-600'}`}
                                    title="Show in HUD"
                                >
                                    {selectedObject.variableProps?.[key]?.showInHud ? <Eye size={10}/> : <EyeOff size={10}/>}
                                </button>
                                <button onClick={() => handleDeleteVariable(key)} className="text-slate-600 hover:text-red-400"><Trash2 size={10}/></button>
                            </div>
                        </div>
                        <input 
                            type={typeof val === 'number' ? 'number' : 'text'}
                            value={val.toString()}
                            onChange={(e) => handleUpdateVariable(key, typeof val === 'number' ? parseFloat(e.target.value) : e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-xs text-white"
                        />
                    </div>
                ))}

                <div className="flex gap-1">
                    <input 
                        placeholder="New Var Name" 
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded p-1 text-xs text-white"
                    />
                    <select 
                        value={newVarType}
                        onChange={(e: any) => setNewVarType(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded p-1 text-xs text-white w-16"
                    >
                        <option value="number">#</option>
                        <option value="string">txt</option>
                        <option value="boolean">bool</option>
                    </select>
                    <button 
                        onClick={handleAddVariable}
                        disabled={!newVarName}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-1 rounded disabled:opacity-50"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
            <button 
                onClick={() => {
                    if (confirm('Delete object?')) deleteObject(selectedObject.id);
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2 rounded border border-red-900/50 transition-colors text-xs font-bold"
            >
                <Trash2 size={14} /> Delete Object
            </button>
        </div>

      </div>
    </div>
  );
};
