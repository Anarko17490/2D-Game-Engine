
import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, X, Edit2, Check } from 'lucide-react';

export const SceneTabs: React.FC = () => {
  const scenes = useStore(s => s.scenes);
  const currentSceneId = useStore(s => s.currentSceneId);
  const setCurrentScene = useStore(s => s.setCurrentScene);
  const addScene = useStore(s => s.addScene);
  const deleteScene = useStore(s => s.deleteScene);
  const renameScene = useStore(s => s.renameScene);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = () => {
    if (editingId) {
      renameScene(editingId, editName);
      setEditingId(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this scene?')) {
        deleteScene(id);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-slate-950 px-2 pt-2 border-b border-slate-800 overflow-x-auto no-scrollbar">
      {scenes.map(scene => (
        <div 
          key={scene.id}
          onClick={() => setCurrentScene(scene.id)}
          className={`group flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer transition-colors border-t border-x ${
            currentSceneId === scene.id 
              ? 'bg-slate-900 border-slate-700 text-blue-400' 
              : 'bg-slate-900/50 border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          {editingId === scene.id ? (
             <div className="flex items-center gap-1">
                <input 
                   autoFocus
                   value={editName}
                   onChange={(e) => setEditName(e.target.value)}
                   onBlur={saveEdit}
                   onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                   className="bg-slate-800 text-white px-1 py-0.5 rounded outline-none border border-blue-500 w-24"
                   onClick={(e) => e.stopPropagation()}
                />
                <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="text-green-500 hover:text-green-400">
                    <Check size={12} />
                </button>
             </div>
          ) : (
             <span onDoubleClick={() => startEdit(scene.id, scene.name)}>{scene.name}</span>
          )}
          
          <div className={`flex items-center gap-1 ${currentSceneId === scene.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <button 
                onClick={(e) => { e.stopPropagation(); startEdit(scene.id, scene.name); }}
                className="text-slate-500 hover:text-white"
              >
                  <Edit2 size={10} />
              </button>
              {scenes.length > 1 && (
                  <button 
                    onClick={(e) => handleDelete(e, scene.id)}
                    className="text-slate-500 hover:text-red-400"
                  >
                      <X size={12} />
                  </button>
              )}
          </div>
        </div>
      ))}
      
      <button 
        onClick={addScene}
        className="ml-1 p-1.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
        title="Add Scene"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};
