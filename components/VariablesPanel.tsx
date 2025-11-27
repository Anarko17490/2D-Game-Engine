import React from 'react';
import { useStore } from '../store';
import { Trash2, Plus, Sigma, Layers, Globe, Eye } from 'lucide-react';
import { Variable } from '../types';

export const VariablesPanel: React.FC = () => {
  const globalVariables = useStore((state) => state.variables);
  const currentScene = useStore(state => state.getCurrentScene());
  const sceneVariables = currentScene ? currentScene.variables : [];

  const addVariable = useStore((state) => state.addVariable);
  const updateVariable = useStore((state) => state.updateVariable);
  const deleteVariable = useStore((state) => state.deleteVariable);

  return (
    <div className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Variables</h2>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Global Vars */}
        <div>
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-xs font-bold text-blue-400 uppercase">
                 <Globe size={12} /> Global
              </div>
              <button onClick={() => addVariable('global')} className="text-blue-400 hover:text-white" title="Add Global Variable"><Plus size={14}/></button>
           </div>
           
           <div className="space-y-2">
              {globalVariables.map(v => (
                 <VariableItem 
                   key={v.id} 
                   variable={v} 
                   onUpdate={(updates) => updateVariable(v.id, updates)} 
                   onDelete={() => deleteVariable(v.id)} 
                 />
              ))}
              {globalVariables.length === 0 && <div className="text-[10px] text-slate-600 italic">No global variables.</div>}
           </div>
        </div>

        {/* Scene Vars */}
        <div>
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-xs font-bold text-green-400 uppercase">
                 <Layers size={12} /> Scene
              </div>
              <button onClick={() => addVariable('scene')} className="text-green-400 hover:text-white" title="Add Scene Variable"><Plus size={14}/></button>
           </div>
           
           <div className="space-y-2">
              {sceneVariables.map(v => (
                 <VariableItem 
                   key={v.id} 
                   variable={v} 
                   onUpdate={(updates) => updateVariable(v.id, updates)} 
                   onDelete={() => deleteVariable(v.id)} 
                 />
              ))}
              {sceneVariables.length === 0 && <div className="text-[10px] text-slate-600 italic">No scene variables.</div>}
           </div>
        </div>

      </div>
      
      <div className="mt-auto p-4 text-[10px] text-slate-500 border-t border-slate-700">
        Global vars persist across scenes. Scene vars reset when the scene reloads. Use 'Show in HUD' to display values during gameplay.
      </div>
    </div>
  );
};

const VariableItem = ({ variable, onUpdate, onDelete }: { variable: Variable, onUpdate: (u: Partial<Variable>) => void, onDelete: () => void }) => {
    return (
        <div className="bg-slate-900 rounded p-2 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Sigma size={14} className="text-slate-500" />
              <input
                type="text"
                value={variable.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="bg-transparent text-sm font-bold text-white w-full outline-none focus:text-blue-400"
                placeholder="Name"
              />
              <button onClick={onDelete} className="text-slate-600 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-slate-500 w-10">Initial:</label>
              <input
                type="number"
                value={variable.initialValue}
                onChange={(e) => onUpdate({ initialValue: parseFloat(e.target.value) || 0 })}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white w-full outline-none focus:border-blue-500"
              />
            </div>

            {variable.scope === 'global' && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <input 
                        type="checkbox" 
                        checked={variable.showInHud || false}
                        onChange={(e) => onUpdate({ showInHud: e.target.checked })}
                        className="rounded border-slate-600 bg-slate-800"
                        id={`hud-${variable.id}`}
                    />
                    <label htmlFor={`hud-${variable.id}`} className="text-[10px] text-slate-400 cursor-pointer flex items-center gap-1">
                        <Eye size={10} /> Show in HUD
                    </label>
                </div>
            )}
        </div>
    );
};