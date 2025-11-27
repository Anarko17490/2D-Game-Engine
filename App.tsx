

import React, { useCallback, useState, useEffect } from 'react';
import { AssetPanel } from './components/AssetPanel';
import { EditorCanvas } from './components/EditorCanvas';
import { EventSheet } from './components/EventSheet';
import { GameRuntime } from './components/GameRuntime';
import { PropertiesPanel } from './components/PropertiesPanel';
import { VariablesPanel } from './components/VariablesPanel';
import { SceneTabs } from './components/SceneTabs';
import { useStore } from './store';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Play, Square, Save, Download, Grid, FilePlus, Globe, Box, Layers, Monitor, Gamepad2, Flag, Crosshair, Map as MapIcon, BookmarkPlus, Trash2, LayoutTemplate, Bot, Wand2, Shield } from 'lucide-react';
import { ObjectType, GameViewType, GameGenreType, CustomTemplate } from './types';
import { TEMPLATES } from './templates';
import { v4 as uuidv4 } from 'uuid';
import { exportToHtml } from './utils/exportGame';
import { snapToGrid } from './utils/grid';
import { GAME_VIEW_PRESETS } from './utils/viewPresets';
import { GENRE_PRESETS } from './utils/genrePresets';
import { getTemplatesFromStorage, deleteTemplateFromStorage } from './utils/templateStorage';
import { generateGameFromPrompt } from './utils/aiGenerator';

function App() {
  const mode = useStore(s => s.mode);
  const setMode = useStore(s => s.setMode);
  const addObject = useStore(s => s.addObject);
  const updateObject = useStore(s => s.updateObject);
  const loadProject = useStore(s => s.loadProject);
  const createProjectFromGenre = useStore(s => s.createProjectFromGenre);
  const createProjectFromCustomTemplate = useStore(s => s.createProjectFromCustomTemplate);
  const saveProjectAsTemplate = useStore(s => s.saveProjectAsTemplate);

  const currentScene = useStore(s => s.getCurrentScene());
  const objects = currentScene ? currentScene.objects : [];
  const assets = useStore(s => s.assets);
  const gridSize = useStore(s => s.gridSize);
  const isSnapping = useStore(s => s.isSnapping);

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  
  // New Project State
  const [newProjectTab, setNewProjectTab] = useState<'GENRES' | 'CUSTOM' | 'AI'>('GENRES');
  const [selectedGenre, setSelectedGenre] = useState<GameGenreType | null>(null);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Save Template State
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Load custom templates when switching tabs
  useEffect(() => {
    if (showNewProjectModal && newProjectTab === 'CUSTOM') {
        setCustomTemplates(getTemplatesFromStorage());
    }
  }, [showNewProjectModal, newProjectTab]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;
    if (!over) return;

    const calculatePos = (currentVal: number, deltaVal: number) => {
        const raw = currentVal + deltaVal;
        return isSnapping ? snapToGrid(raw, gridSize) : raw;
    };

    if (active.data.current?.isNew) {
      if (over.id === 'canvas') {
        const type = active.data.current.type as ObjectType;
        const extraProps = active.data.current.type === 'Sprite' 
            ? { 
                imageBase64: active.data.current.imageBase64, 
                name: active.data.current.name || 'Sprite',
                color: 'transparent'
              } 
            : {};
        const defaultX = 100;
        const defaultY = 100;

        addObject(
            type, 
            isSnapping ? snapToGrid(defaultX, gridSize) : defaultX, 
            isSnapping ? snapToGrid(defaultY, gridSize) : defaultY, 
            extraProps
        );
      }
    } else {
      const objId = active.id as string;
      const currentObj = objects.find(o => o.id === objId);
      if (currentObj) {
        updateObject(objId, {
          x: calculatePos(currentObj.x, delta.x),
          y: calculatePos(currentObj.y, delta.y)
        });
      }
    }
  }, [objects, addObject, updateObject, gridSize, isSnapping]);

  const handleSave = () => {
    const state = useStore.getState();
    const data = JSON.stringify({ 
        scenes: state.scenes, 
        currentSceneId: state.currentSceneId,
        assets: state.assets, 
        variables: state.variables 
    });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-game.json';
    a.click();
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          loadProject(json);
        } catch (err) {
          alert("Invalid project file");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportWeb = () => {
    const state = useStore.getState();
    const html = exportToHtml(state.scenes, state.variables);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game.html';
    a.click();
  };

  const handleCreateProject = () => {
      if (newProjectTab === 'GENRES' && selectedGenre) {
          createProjectFromGenre(selectedGenre);
          setShowNewProjectModal(false);
          setSelectedGenre(null);
      } else if (newProjectTab === 'CUSTOM' && selectedTemplate) {
          createProjectFromCustomTemplate(selectedTemplate);
          setShowNewProjectModal(false);
          setSelectedTemplate(null);
      } else if (newProjectTab === 'AI' && aiPrompt) {
          setIsGenerating(true);
          // Simulate network delay for effect
          setTimeout(() => {
              const generatedTemplate = generateGameFromPrompt(aiPrompt);
              createProjectFromCustomTemplate(generatedTemplate);
              setIsGenerating(false);
              setShowNewProjectModal(false);
              setAiPrompt('');
          }, 1000);
      }
  };
  
  const handleSaveTemplate = () => {
      if (templateName) {
          saveProjectAsTemplate(templateName, templateDesc);
          setShowSaveTemplateModal(false);
          setTemplateName('');
          setTemplateDesc('');
      }
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this template?")) {
          deleteTemplateFromStorage(id);
          setCustomTemplates(prev => prev.filter(t => t.id !== id));
          if (selectedTemplate?.id === id) setSelectedTemplate(null);
      }
  };

  const getGenreIcon = (genre: GameGenreType) => {
      switch(genre) {
          case 'PLATFORMER': return <Gamepad2 size={24} className="text-blue-400" />;
          case 'RPG': return <MapIcon size={24} className="text-green-400" />;
          case 'RACING': return <Flag size={24} className="text-red-400" />;
          case 'SHOOTER': return <Crosshair size={24} className="text-yellow-400" />;
          case 'TOWER_DEFENSE': return <Shield size={24} className="text-purple-400" />;
      }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
        
        {/* Toolbar */}
        <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">GM</div>
            <span className="font-bold text-lg">GameMaker</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowNewProjectModal(true)}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
              title="New Project"
            >
              <FilePlus size={16} /> New
            </button>
            <div className="w-px h-6 bg-slate-700 mx-2"></div>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
            >
              <Save size={16} /> Save
            </button>
            <label className="flex items-center gap-2 text-slate-400 hover:text-white text-sm cursor-pointer">
              <Download size={16} /> Load
              <input type="file" className="hidden" onChange={handleLoad} accept=".json" />
            </label>
            <button 
              onClick={() => setShowSaveTemplateModal(true)}
              className="flex items-center gap-2 text-slate-400 hover:text-purple-400 text-sm"
            >
              <BookmarkPlus size={16} /> Save Template
            </button>
            <button 
              onClick={handleExportWeb}
              className="flex items-center gap-2 text-slate-400 hover:text-blue-400 text-sm"
            >
              <Globe size={16} /> Export Web
            </button>
            <div className="w-px h-6 bg-slate-700 mx-2"></div>
            {mode === 'EDIT' ? (
              <button 
                onClick={() => setMode('PLAY')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-1.5 rounded-full font-bold transition-all"
              >
                <Play size={18} fill="currentColor" /> Play
              </button>
            ) : (
              <button 
                onClick={() => setMode('EDIT')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-1.5 rounded-full font-bold transition-all"
              >
                <Square size={18} fill="currentColor" /> Stop
              </button>
            )}
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {mode === 'EDIT' ? (
            <>
              <AssetPanel />
              <div className="flex-1 flex flex-col min-w-0">
                <SceneTabs />
                <div id="canvas-container" className="flex-1 flex flex-col relative">
                   <EditorCanvas />
                </div>
                <EventSheet />
              </div>
              <div className="flex flex-col">
                  {/* Adjusted Heights for better visibility */}
                  <div className="h-[65%] overflow-hidden border-b border-slate-700">
                    <PropertiesPanel />
                  </div>
                  <div className="h-[35%] overflow-hidden">
                    <VariablesPanel />
                  </div>
              </div>
            </>
          ) : (
            <div className="flex-1 p-8 flex items-center justify-center bg-slate-900">
              <div className="w-[800px] h-[600px] shadow-2xl">
                 <GameRuntime />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
           <div className="bg-slate-800 p-8 rounded-lg max-w-4xl w-full border border-slate-700 shadow-2xl flex flex-col gap-6 h-[80vh]">
              
              <div className="flex items-center justify-between">
                  <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Create New Project</h2>
                      <p className="text-slate-400">Select a genre, template, or use AI to start.</p>
                  </div>
                  
                  <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                      <button 
                          onClick={() => setNewProjectTab('GENRES')}
                          className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all ${newProjectTab === 'GENRES' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                          <Gamepad2 size={16} /> Genres
                      </button>
                      <button 
                          onClick={() => setNewProjectTab('CUSTOM')}
                          className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all ${newProjectTab === 'CUSTOM' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                          <LayoutTemplate size={16} /> My Templates
                      </button>
                      <button 
                          onClick={() => setNewProjectTab('AI')}
                          className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all ${newProjectTab === 'AI' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                          <Bot size={16} /> AI Generator
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                 {newProjectTab === 'GENRES' && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(Object.keys(GENRE_PRESETS) as GameGenreType[]).map(genre => (
                            <button
                                key={genre}
                                onClick={() => setSelectedGenre(genre)}
                                className={`flex flex-col gap-3 p-4 rounded-xl border-2 transition-all text-left group hover:scale-[1.02] ${
                                    selectedGenre === genre 
                                    ? 'bg-blue-900/30 border-blue-500 shadow-blue-500/20 shadow-lg' 
                                    : 'bg-slate-700/50 border-slate-700 hover:bg-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <div className={`p-3 rounded-lg w-fit ${selectedGenre === genre ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>
                                    {getGenreIcon(genre)}
                                </div>
                                <div>
                                    <div className="font-bold text-lg text-white mb-1">{GENRE_PRESETS[genre].name}</div>
                                    <div className="text-xs text-slate-400 leading-relaxed">{GENRE_PRESETS[genre].description}</div>
                                </div>
                            </button>
                        ))}
                     </div>
                 )}
                 
                 {newProjectTab === 'CUSTOM' && (
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {customTemplates.length === 0 && (
                            <div className="col-span-full text-center text-slate-500 py-10 italic">
                                You haven't saved any templates yet. <br/> Open a project and click "Save Template" to create one!
                            </div>
                        )}
                        {customTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template)}
                                className={`flex flex-col gap-3 p-4 rounded-xl border-2 transition-all text-left group relative ${
                                    selectedTemplate?.id === template.id 
                                    ? 'bg-purple-900/30 border-purple-500 shadow-purple-500/20 shadow-lg' 
                                    : 'bg-slate-700/50 border-slate-700 hover:bg-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <div className="absolute top-2 right-2">
                                    <div 
                                        onClick={(e) => handleDeleteTemplate(e, template.id)}
                                        className="p-2 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </div>
                                </div>
                                
                                <div className={`p-3 rounded-lg w-fit ${selectedTemplate?.id === template.id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>
                                    <BookmarkPlus size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-lg text-white mb-1 truncate pr-6">{template.name}</div>
                                    <div className="text-xs text-slate-400 line-clamp-2 min-h-[2.5em]">{template.description || "No description"}</div>
                                    <div className="mt-2 text-[10px] text-slate-500 font-mono">
                                        {new Date(template.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </button>
                        ))}
                     </div>
                 )}

                 {newProjectTab === 'AI' && (
                     <div className="flex flex-col h-full gap-4">
                         <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex-1 flex flex-col">
                             <label className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                 <Wand2 className="text-purple-400" /> Describe your game
                             </label>
                             <p className="text-sm text-slate-400 mb-4">
                                 Tell the AI what kind of game you want. Mention genre, enemies, coins, health, etc.
                             </p>
                             <textarea 
                                 value={aiPrompt}
                                 onChange={(e) => setAiPrompt(e.target.value)}
                                 className="flex-1 w-full bg-slate-800 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 outline-none focus:border-purple-500 resize-none text-lg leading-relaxed"
                                 placeholder="Example: A side-scrolling platformer where the player collects coins and loses health when touching red enemies."
                             />
                         </div>
                     </div>
                 )}
              </div>
              
              <div className="flex justify-end gap-3 mt-4 border-t border-slate-700 pt-6">
                  <button 
                      onClick={() => setShowNewProjectModal(false)} 
                      className="px-6 py-2 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors"
                  >
                      Cancel
                  </button>
                  <button 
                      onClick={handleCreateProject} 
                      disabled={(newProjectTab === 'GENRES' && !selectedGenre) || (newProjectTab === 'CUSTOM' && !selectedTemplate) || (newProjectTab === 'AI' && (!aiPrompt || isGenerating))}
                      className={`px-8 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                          (newProjectTab === 'GENRES' && selectedGenre) || (newProjectTab === 'CUSTOM' && selectedTemplate) || (newProjectTab === 'AI' && aiPrompt && !isGenerating)
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' 
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                  >
                      {isGenerating ? (
                          <>Generating...</>
                      ) : (
                          <>
                             {newProjectTab === 'AI' ? <Wand2 size={18} /> : <FilePlus size={18} />} 
                             {newProjectTab === 'AI' ? 'Generate Project' : 'Create Project'}
                          </>
                      )}
                  </button>
              </div>
              
           </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
             <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full border border-slate-700 shadow-2xl space-y-4">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                     <BookmarkPlus size={20} className="text-purple-400" /> Save as Template
                 </h2>
                 <p className="text-sm text-slate-400">Save the current scene as a reusable starter template.</p>
                 
                 <div className="space-y-3">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template Name</label>
                         <input 
                             type="text" 
                             value={templateName}
                             onChange={(e) => setTemplateName(e.target.value)}
                             className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-purple-500"
                             placeholder="My Awesome Level"
                             autoFocus
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                         <textarea 
                             value={templateDesc}
                             onChange={(e) => setTemplateDesc(e.target.value)}
                             className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-purple-500 h-24 resize-none"
                             placeholder="A short description of this template..."
                         />
                     </div>
                 </div>

                 <div className="flex justify-end gap-2 pt-2">
                     <button 
                         onClick={() => setShowSaveTemplateModal(false)}
                         className="px-4 py-2 hover:bg-slate-700 rounded text-slate-300 text-sm"
                     >
                         Cancel
                     </button>
                     <button 
                         onClick={handleSaveTemplate}
                         disabled={!templateName}
                         className={`px-4 py-2 rounded text-sm font-bold transition-colors ${
                             templateName ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-700 text-slate-500'
                         }`}
                     >
                         Save Template
                     </button>
                 </div>
             </div>
          </div>
      )}

      <DragOverlay>
         <div className="w-10 h-10 bg-blue-500 rounded opacity-50 cursor-grabbing"></div>
      </DragOverlay>
    </DndContext>
  );
}

export default App;