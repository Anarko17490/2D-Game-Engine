

import React from 'react';
import { useStore } from '../store';
import { Trash2, Plus, ArrowRight, Copy } from 'lucide-react';
import { ConditionType, ActionType, ObjectType } from '../types';

const CONDITIONS: ConditionType[] = ['KEY_PRESSED', 'COLLISION', 'ALWAYS', 'VAR_EQUALS', 'VAR_GT', 'VAR_LT', 'OBJ_VAR_COMPARE', 'MOUSE_CLICK'];

const MAIN_ACTIONS: { value: ActionType, label: string }[] = [
    { value: 'MOVE_X', label: 'Move X' },
    { value: 'MOVE_Y', label: 'Move Y' },
    { value: 'JUMP', label: 'Jump' },
    { value: 'GRAVITY', label: 'Apply Gravity' },
    { value: 'REVERSE_X', label: 'Reverse Horizontal' },
    { value: 'REVERSE_Y', label: 'Reverse Vertical' },
    { value: 'DESTROY', label: 'Destroy Object' },
    { value: 'CREATE_OBJECT', label: 'Create Object (Spawn)' },
    { value: 'VAR_SET', label: 'Set Variable' }, 
    { value: 'VAR_ADD', label: 'Add to Variable' },
    { value: 'VAR_SUB', label: 'Subtract Variable' },
    { value: 'SET_ANIMATION', label: 'Set Animation' },
    { value: 'GOTO_SCENE', label: 'Go to Scene' },
    { value: 'PLAY_SOUND', label: 'Play Sound' },
];

const OBJECTS: ObjectType[] = ['Player', 'Enemy', 'Coin', 'Wall', 'Sprite'];

export const EventSheet: React.FC = () => {
  const currentScene = useStore((state) => state.getCurrentScene());
  const allScenes = useStore(state => state.scenes);
  const globalVariables = useStore((state) => state.variables);
  const assets = useStore(state => state.assets);
  
  const events = currentScene?.events || [];
  const objects = currentScene?.objects || [];
  const variables = [...globalVariables, ...(currentScene?.variables || [])];
  const audioClips = assets.filter(a => a.type === 'audio');
  
  // Filter Prefabs for spawning list
  const prefabObjects = objects.filter(o => o.isPrefab);

  const addEvent = useStore((state) => state.addEvent);
  const duplicateEvent = useStore((state) => state.duplicateEvent);
  const updateEvent = useStore((state) => state.updateEvent);
  const deleteEvent = useStore((state) => state.deleteEvent);

  if (!currentScene) return <div className="p-4 text-slate-500">No scene selected</div>;

  const isVariableCondition = (type: ConditionType) => ['VAR_EQUALS', 'VAR_GT', 'VAR_LT'].includes(type);
  
  const isAnyVarAction = (type: ActionType) => {
      return ['VAR_SET', 'VAR_ADD', 'VAR_SUB', 'OBJ_VAR_SET', 'OBJ_VAR_ADD', 'OBJ_VAR_SUB'].includes(type);
  };

  const mapToMainAction = (type: ActionType): ActionType => {
      if (type === 'OBJ_VAR_SET') return 'VAR_SET';
      if (type === 'OBJ_VAR_ADD') return 'VAR_ADD';
      if (type === 'OBJ_VAR_SUB') return 'VAR_SUB';
      return type;
  };

  const getVarActionState = (type: ActionType) => {
      if (['VAR_SET', 'VAR_ADD', 'VAR_SUB'].includes(type)) return { scope: 'GLOBAL', op: type.split('_')[1] }; 
      if (['OBJ_VAR_SET', 'OBJ_VAR_ADD', 'OBJ_VAR_SUB'].includes(type)) return { scope: 'OBJECT', op: type.split('_')[2] }; 
      return { scope: 'GLOBAL', op: 'SET' };
  };

  const constructVarActionType = (scope: string, op: string): ActionType => {
      if (scope === 'GLOBAL') return `VAR_${op}` as ActionType;
      return `OBJ_VAR_${op}` as ActionType;
  };

  const getAnimationsForTarget = (targetType: string) => {
    const representative = objects.find(o => o.type === targetType);
    return representative?.animations || [];
  };

  return (
    <div className="h-64 bg-slate-900 border-t border-slate-700 flex flex-col">
      <div className="p-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-sm text-slate-200 pl-2">Event Sheet ({currentScene.name})</h3>
        <button
          onClick={addEvent}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium"
        >
          <Plus size={14} /> Add Event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {events.length === 0 && (
          <div className="text-center text-slate-500 mt-8 text-sm italic">
            No events defined for this scene.
          </div>
        )}
        
        {events.map((evt, index) => (
          <div key={evt.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700 group">
            <span className="text-slate-500 text-xs w-6 font-mono text-center">{index + 1}</span>
            
            {/* Condition Block */}
            <div className="flex-1 flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-700/50">
              <span className="text-xs text-yellow-500 font-bold uppercase">WHEN</span>
              <select
                value={evt.condition.type}
                onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, type: e.target.value as ConditionType } })}
                className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 focus:border-blue-500 outline-none"
              >
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {evt.condition.type === 'KEY_PRESSED' && (
                <input
                  type="text"
                  placeholder="Key"
                  value={evt.condition.param || ''}
                  onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, param: e.target.value } })}
                  className="bg-slate-800 text-white text-xs p-1 w-24 rounded border border-slate-600 outline-none"
                />
              )}
              
              {evt.condition.type === 'COLLISION' && (
                <>
                  <select
                    value={evt.condition.target || 'Player'}
                    onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, target: e.target.value } })}
                    className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none text-blue-300 font-bold"
                  >
                    {OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>

                  <span className="text-xs text-slate-400">touches</span>
                  
                  <select
                    value={evt.condition.param || 'Enemy'}
                    onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, param: e.target.value } })}
                    className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none text-red-300 font-bold"
                  >
                    {OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </>
              )}

              {evt.condition.type === 'OBJ_VAR_COMPARE' && (
                 <>
                  <select
                    value={evt.condition.target || 'Player'}
                    onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, target: e.target.value } })}
                    className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none"
                  >
                    {OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span className="text-xs text-slate-400">var</span>
                  <input
                    type="text"
                    placeholder="Var Name"
                    value={evt.condition.variableName || ''}
                    onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, variableName: e.target.value } })}
                    className="bg-slate-800 text-white text-xs p-1 w-20 rounded border border-slate-600 outline-none font-mono"
                  />
                  
                  <select
                    value={evt.condition.operator || '='}
                    onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, operator: e.target.value } })}
                    className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none w-10 text-center font-mono"
                  >
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&ge;</option>
                    <option value="<=">&le;</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Val"
                    value={(evt.condition.value as number) ?? 0}
                    onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, value: parseFloat(e.target.value) } })}
                    className="bg-slate-800 text-white text-xs p-1 w-12 rounded border border-slate-600 outline-none"
                  />
                 </>
              )}

              {isVariableCondition(evt.condition.type) && (
                <>
                  <select
                    value={evt.condition.variableId || ''}
                    onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, variableId: e.target.value } })}
                    className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none min-w-[80px]"
                  >
                    <option value="" disabled>Select Var</option>
                    {variables.map(v => <option key={v.id} value={v.id}>{v.name} ({v.scope})</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Val"
                    value={(evt.condition.value as number) ?? 0}
                    onChange={(e) => updateEvent(evt.id, { condition: { ...evt.condition, value: parseFloat(e.target.value) } })}
                    className="bg-slate-800 text-white text-xs p-1 w-16 rounded border border-slate-600 outline-none"
                  />
                </>
              )}
            </div>

            <ArrowRight size={16} className="text-slate-600" />

            {/* Action Block */}
            <div className="flex-1 flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-700/50">
              <span className="text-xs text-green-500 font-bold uppercase">THEN</span>
              
              {/* Main Action Selector */}
              <select
                value={mapToMainAction(evt.action.type)}
                onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, type: e.target.value as ActionType } })}
                className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 focus:border-blue-500 outline-none"
              >
                {MAIN_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>

              {/* Create Object UI */}
              {evt.action.type === 'CREATE_OBJECT' && (
                  <>
                    <select
                        value={evt.action.prefabId || ''}
                        onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, prefabId: e.target.value } })}
                        className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none min-w-[100px]"
                    >
                        <option value="" disabled>Select Prefab</option>
                        {prefabObjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        {prefabObjects.length === 0 && <option disabled>No Prefabs!</option>}
                    </select>
                    <span className="text-xs text-slate-400">at</span>
                    <select
                        value={evt.action.target}
                        onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, target: e.target.value as any } })}
                        className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none"
                    >
                        <option value="Player">Player</option>
                        <option value="SELF">Self</option>
                        <option value="OTHER">Other</option>
                        <optgroup label="Specific Types">
                        {OBJECTS.filter(o => o !== 'Player').map(o => <option key={o} value={o}>{o}</option>)}
                        </optgroup>
                    </select>
                    <span className="text-xs text-slate-400">offset</span>
                    <input
                        type="number"
                        placeholder="X"
                        value={evt.action.offsetX ?? 0}
                        onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, offsetX: parseFloat(e.target.value) } })}
                        className="bg-slate-800 text-white text-xs p-1 w-10 rounded border border-slate-600 outline-none"
                        title="Offset X"
                    />
                    <input
                        type="number"
                        placeholder="Y"
                        value={evt.action.offsetY ?? 0}
                        onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, offsetY: parseFloat(e.target.value) } })}
                        className="bg-slate-800 text-white text-xs p-1 w-10 rounded border border-slate-600 outline-none"
                        title="Offset Y"
                    />
                    <span className="text-xs text-slate-400">cd</span>
                    <input
                        type="number"
                        step="0.1"
                        placeholder="0s"
                        value={evt.action.cooldown ?? 0}
                        onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, cooldown: parseFloat(e.target.value) } })}
                        className="bg-slate-800 text-white text-xs p-1 w-10 rounded border border-slate-600 outline-none"
                        title="Cooldown (seconds)"
                    />
                  </>
              )}

              {/* Unified Variable Action UI */}
              {isAnyVarAction(evt.action.type) && (
                  <>
                    <select
                       value={getVarActionState(evt.action.type).scope}
                       onChange={(e) => {
                           const currentState = getVarActionState(evt.action.type);
                           const newType = constructVarActionType(e.target.value, currentState.op);
                           updateEvent(evt.id, { action: { ...evt.action, type: newType } });
                       }}
                       className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none w-20"
                    >
                        <option value="GLOBAL">Global</option>
                        <option value="OBJECT">Object</option>
                    </select>

                    <select
                       value={getVarActionState(evt.action.type).op}
                       onChange={(e) => {
                           const currentState = getVarActionState(evt.action.type);
                           const newType = constructVarActionType(currentState.scope, e.target.value);
                           updateEvent(evt.id, { action: { ...evt.action, type: newType } });
                       }}
                       className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none w-24"
                    >
                        <option value="SET">Set (=)</option>
                        <option value="ADD">Add (+)</option>
                        <option value="SUB">Subtract (-)</option>
                    </select>

                    {getVarActionState(evt.action.type).scope === 'GLOBAL' ? (
                        <select
                            value={evt.action.variableId || ''}
                            onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, variableId: e.target.value } })}
                            className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none min-w-[80px]"
                        >
                            <option value="" disabled>Select Var</option>
                            {variables.map(v => <option key={v.id} value={v.id}>{v.name} ({v.scope})</option>)}
                        </select>
                    ) : (
                        <>
                            <span className="text-xs text-slate-400">on</span>
                            <select
                                value={evt.action.target}
                                onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, target: e.target.value as any } })}
                                className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none"
                            >
                                <option value="Player">Player</option>
                                <option value="SELF">Self</option>
                                <option value="OTHER">Other</option>
                                <optgroup label="Specific Types">
                                {OBJECTS.filter(o => o !== 'Player').map(o => <option key={o} value={o}>{o}</option>)}
                                </optgroup>
                            </select>
                            <input
                                type="text"
                                placeholder="var name"
                                value={evt.action.variableName || ''}
                                onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, variableName: e.target.value } })}
                                className="bg-slate-800 text-white text-xs p-1 w-20 rounded border border-slate-600 outline-none font-mono"
                            />
                        </>
                    )}

                    <input
                        type="number"
                        placeholder="Val"
                        value={(evt.action.value as number) ?? 0}
                        onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, value: parseFloat(e.target.value) } })}
                        className="bg-slate-800 text-white text-xs p-1 w-12 rounded border border-slate-600 outline-none"
                    />
                  </>
              )}

              {/* Standard Movement/Behavior Actions */}
              {!isAnyVarAction(evt.action.type) && evt.action.type !== 'GOTO_SCENE' && evt.action.type !== 'PLAY_SOUND' && evt.action.type !== 'SET_ANIMATION' && evt.action.type !== 'CREATE_OBJECT' && (
                <>
                  <span className="text-xs text-slate-400">on</span>
                  <select
                    value={evt.action.target}
                    onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, target: e.target.value as any } })}
                    className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none"
                  >
                    <option value="Player">Player</option>
                    <option value="SELF">Self</option>
                    <option value="OTHER">Other (Collision)</option>
                    <optgroup label="Specific Types">
                       {OBJECTS.filter(o => o !== 'Player').map(o => <option key={o} value={o}>{o}</option>)}
                    </optgroup>
                  </select>
                </>
              )}

              {evt.action.type === 'GOTO_SCENE' && (
                  <select
                    value={evt.action.sceneId || ''}
                    onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, sceneId: e.target.value } })}
                    className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none min-w-[100px]"
                  >
                      <option value="" disabled>Select Scene</option>
                      {allScenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              )}

              {evt.action.type === 'PLAY_SOUND' && (
                  <>
                      <select
                        value={evt.action.audioClipId || ''}
                        onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, audioClipId: e.target.value } })}
                        className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none min-w-[100px]"
                      >
                          <option value="" disabled>Select Clip</option>
                          {audioClips.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">Vol</span>
                          <input 
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={evt.action.volume ?? 1}
                              onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, volume: parseFloat(e.target.value) } })}
                              className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                          />
                      </div>
                  </>
              )}

              {evt.action.type === 'SET_ANIMATION' && (
                <>
                   <span className="text-xs text-slate-400">on</span>
                   <select
                    value={evt.action.target}
                    onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, target: e.target.value as any } })}
                    className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none"
                  >
                    <option value="Player">Player</option>
                    <option value="SELF">Self</option>
                    <option value="OTHER">Other</option>
                    <optgroup label="Specific Types">
                       {OBJECTS.filter(o => o !== 'Player').map(o => <option key={o} value={o}>{o}</option>)}
                    </optgroup>
                  </select>
                   <span className="text-xs text-slate-400">to</span>
                   <select
                      value={evt.action.animationName || ''}
                      onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, animationName: e.target.value } })}
                      className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none min-w-[80px]"
                   >
                      <option value="">Select Animation</option>
                      {getAnimationsForTarget(evt.action.target).map(anim => (
                        <option key={anim.id} value={anim.name}>{anim.name}</option>
                      ))}
                      <option value="Idle">Idle</option>
                      <option value="Run">Run</option>
                   </select>
                </>
              )}

              {['MOVE_X', 'MOVE_Y', 'JUMP', 'GRAVITY'].includes(evt.action.type) && (
                <input
                  type="number"
                  placeholder="Val"
                  value={evt.action.param ?? 0}
                  onChange={(e) => updateEvent(evt.id, { action: { ...evt.action, param: parseFloat(e.target.value) } })}
                  className="bg-slate-800 text-white text-xs p-1 w-16 rounded border border-slate-600 outline-none"
                />
              )}
            </div>

            <button
              onClick={() => duplicateEvent(evt.id)}
              className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
              title="Duplicate Event"
            >
              <Copy size={16} />
            </button>

            <button
              onClick={() => deleteEvent(evt.id)}
              className="p-2 text-slate-600 hover:text-red-400 transition-colors"
              title="Delete Event"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
