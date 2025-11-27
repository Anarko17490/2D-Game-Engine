

import React, { useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ObjectType, UploadedAsset, Tileset } from '../types';
import { Box, Circle, User, Ghost, Upload, Image as ImageIcon, Trash2, Music, Play, Volume2, Grid, MousePointer2 } from 'lucide-react';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

const DraggableItem = ({ id, type, icon: Icon, color, image, name }: { id: string, type: ObjectType; icon?: any; color?: string; image?: string; name?: string }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: { type, isNew: true, imageBase64: image, name }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  if (type === 'Sprite' && image) {
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="group relative flex flex-col items-center bg-slate-700 rounded-lg cursor-grab hover:bg-slate-600 transition-colors mb-2 z-50 shadow-sm overflow-hidden"
            title={name}
        >
            <div className="w-full h-16 bg-slate-900/50 flex items-center justify-center overflow-hidden">
                <img src={image} alt={name} className="max-w-full max-h-full object-contain pointer-events-none" />
            </div>
            <div className="w-full px-2 py-1 flex justify-between items-center text-xs text-slate-200">
                <span className="truncate max-w-[100px]">{name}</span>
            </div>
        </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-grab hover:bg-slate-600 transition-colors mb-2 z-50 shadow-sm"
    >
      <div className={`p-2 rounded`} style={{ backgroundColor: color }}>
        {Icon && <Icon size={20} className="text-white" />}
      </div>
      <span className="font-medium text-sm">{type}</span>
    </div>
  );
};

const AudioItem = ({ asset, onDelete }: { asset: UploadedAsset; onDelete: () => void }) => {
    const playAudio = () => {
        const audio = new Audio(asset.src);
        audio.play().catch(e => console.error(e));
    };

    return (
        <div className="flex items-center justify-between p-2 bg-slate-700 rounded-lg mb-2 group">
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-purple-400">
                    <Music size={14} />
                </div>
                <span className="text-xs text-slate-200 truncate max-w-[90px]" title={asset.name}>{asset.name}</span>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={playAudio} className="p-1 hover:bg-slate-600 rounded text-slate-300 hover:text-white" title="Preview">
                    <Play size={12} />
                </button>
                <button onClick={onDelete} className="p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400" title="Delete">
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
};

export const AssetPanel: React.FC = () => {
  const assets = useStore(s => s.assets);
  const tilesets = useStore(s => s.tilesets);
  const addAsset = useStore(s => s.addAsset);
  const deleteAsset = useStore(s => s.deleteAsset);
  const addTileset = useStore(s => s.addTileset);
  const deleteTileset = useStore(s => s.deleteTileset);
  const activeTileBrush = useStore(s => s.activeTileBrush);
  const setActiveTileBrush = useStore(s => s.setActiveTileBrush);
  const gridSize = useStore(s => s.gridSize);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const tilesetInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'sprite' | 'audio') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          const newAsset: UploadedAsset = {
            id: uuidv4(),
            name: file.name.split('.')[0], // Remove extension
            src: base64,
            type: type
          };
          addAsset(newAsset);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (type === 'sprite' && fileInputRef.current) fileInputRef.current.value = '';
    if (type === 'audio' && audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleTilesetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                  const img = new Image();
                  img.onload = () => {
                      const tileSize = 32; // Default, could be configurable
                      const newTileset: Tileset = {
                          id: uuidv4(),
                          name: file.name.split('.')[0],
                          src: base64,
                          tileSize: tileSize,
                          width: img.width,
                          height: img.height,
                          columns: Math.floor(img.width / tileSize),
                          rows: Math.floor(img.height / tileSize)
                      };
                      addTileset(newTileset);
                  };
                  img.src = base64;
              }
          };
          reader.readAsDataURL(file);
      });
      if (tilesetInputRef.current) tilesetInputRef.current.value = '';
  };

  const sprites = assets.filter(a => a.type === 'sprite');
  const audioClips = assets.filter(a => a.type === 'audio');

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col h-full overflow-y-auto">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Core Assets</h2>
      
      <DraggableItem id="asset-player" type="Player" icon={User} color="#3b82f6" />
      <DraggableItem id="asset-enemy" type="Enemy" icon={Ghost} color="#ef4444" />
      <DraggableItem id="asset-coin" type="Coin" icon={Circle} color="#eab308" />
      <DraggableItem id="asset-wall" type="Wall" icon={Box} color="#64748b" />

      <div className="my-6 border-t border-slate-700"></div>

      {/* TILESETS SECTION */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tilesets</h2>
        <button 
           onClick={() => tilesetInputRef.current?.click()}
           className="text-green-400 hover:text-green-300 transition-colors"
           title="Upload Tileset"
        >
            <Upload size={14} />
        </button>
        <input 
            type="file" 
            ref={tilesetInputRef} 
            onChange={handleTilesetUpload} 
            className="hidden" 
            multiple 
            accept="image/png, image/jpeg" 
        />
      </div>

      {activeTileBrush && (
         <div className="mb-4 bg-slate-700 p-2 rounded flex items-center justify-between border border-blue-500">
             <span className="text-xs text-blue-300 font-bold flex items-center gap-2"><Grid size={12}/> Brush Active</span>
             <button onClick={() => setActiveTileBrush(null)} className="text-[10px] bg-slate-600 px-2 py-1 rounded hover:bg-slate-500">Cancel</button>
         </div>
      )}

      {tilesets.length === 0 ? (
          <div className="text-center p-4 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 text-xs mb-6">
            <Grid size={24} className="mx-auto mb-2 opacity-50" />
            <p>Upload Tileset</p>
            <p className="mt-1 opacity-50 text-[10px]">Auto-splits to 32px</p>
          </div>
      ) : (
          <div className="space-y-4 mb-6">
              {tilesets.map(ts => (
                  <div key={ts.id} className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700">
                          <span className="text-xs font-bold text-slate-300 truncate">{ts.name}</span>
                          <button onClick={() => deleteTileset(ts.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={10} /></button>
                      </div>
                      <div className="p-2 overflow-x-auto">
                          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ts.columns}, 32px)` }}>
                              {Array.from({ length: ts.rows * ts.columns }).map((_, idx) => {
                                  const col = idx % ts.columns;
                                  const row = Math.floor(idx / ts.columns);
                                  const isSelected = activeTileBrush?.tilesetId === ts.id && activeTileBrush?.tileX === col && activeTileBrush?.tileY === row;
                                  
                                  return (
                                      <div 
                                        key={idx}
                                        onClick={() => setActiveTileBrush({ tilesetId: ts.id, tileX: col, tileY: row })}
                                        className={`w-8 h-8 cursor-pointer border hover:border-white transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-500 z-10' : 'border-slate-700'}`}
                                        style={{
                                            backgroundImage: `url(${ts.src})`,
                                            backgroundPosition: `-${col * ts.tileSize}px -${row * ts.tileSize}px`,
                                            backgroundSize: `${ts.width}px ${ts.height}px`
                                        }}
                                        title={`Tile ${col},${row}`}
                                      />
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}

      <div className="my-6 border-t border-slate-700"></div>

      {/* SPRITES SECTION */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Sprites</h2>
        <button 
           onClick={() => fileInputRef.current?.click()}
           className="text-blue-400 hover:text-blue-300 transition-colors"
           title="Upload Images"
        >
            <Upload size={14} />
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileUpload(e, 'sprite')} 
            className="hidden" 
            multiple 
            accept="image/png, image/jpeg, image/webp" 
        />
      </div>

      {sprites.length === 0 ? (
        <div className="text-center p-4 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 text-xs mb-6">
          <ImageIcon size={24} className="mx-auto mb-2 opacity-50" />
          <p>Upload sprites</p>
          <p className="mt-1 opacity-50 text-[10px]">PNG, JPG</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
            {sprites.map(asset => (
                <div key={asset.id} className="relative group/item">
                    <DraggableItem 
                        id={`sprite-${asset.id}`} 
                        type="Sprite" 
                        image={asset.src} 
                        name={asset.name} 
                    />
                    <button 
                        onClick={() => deleteAsset(asset.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded text-white opacity-0 group-hover/item:opacity-100 transition-opacity"
                        title="Delete Asset"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            ))}
        </div>
      )}

      {/* AUDIO SECTION */}
      <div className="flex items-center justify-between mb-4 border-t border-slate-700 pt-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audio Clips</h2>
        <button 
           onClick={() => audioInputRef.current?.click()}
           className="text-purple-400 hover:text-purple-300 transition-colors"
           title="Upload Audio"
        >
            <Upload size={14} />
        </button>
        <input 
            type="file" 
            ref={audioInputRef} 
            onChange={(e) => handleFileUpload(e, 'audio')} 
            className="hidden" 
            multiple 
            accept="audio/mpeg, audio/wav, audio/ogg" 
        />
      </div>

      {audioClips.length === 0 ? (
        <div className="text-center p-4 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 text-xs">
          <Volume2 size={24} className="mx-auto mb-2 opacity-50" />
          <p>Upload Audio</p>
          <p className="mt-1 opacity-50 text-[10px]">MP3, WAV</p>
        </div>
      ) : (
        <div>
            {audioClips.map(asset => (
                <AudioItem key={asset.id} asset={asset} onDelete={() => deleteAsset(asset.id)} />
            ))}
        </div>
      )}
      
    </div>
  );
};