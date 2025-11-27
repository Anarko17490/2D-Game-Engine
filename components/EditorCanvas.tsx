

import React, { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useStore } from '../store';
import { GameObject } from '../types';
import { snapToGrid } from '../utils/grid';

type HandleType = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const DraggableObject = ({ obj }: { obj: GameObject }) => {
  const selectObject = useStore(s => s.selectObject);
  const updateObject = useStore(s => s.updateObject);
  const selectedId = useStore(s => s.selectedObjectId);
  const gridSize = useStore(s => s.gridSize);
  const isSnapping = useStore(s => s.isSnapping);
  const tilesets = useStore(s => s.tilesets);
  
  const [isResizing, setIsResizing] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: obj.id,
    data: { id: obj.id, isNew: false },
    disabled: isResizing 
  });

  let ghostX = obj.x;
  let ghostY = obj.y;

  if (transform && isDragging) {
    const rawX = obj.x + transform.x;
    const rawY = obj.y + transform.y;
    
    if (isSnapping) {
      ghostX = snapToGrid(rawX, gridSize);
      ghostY = snapToGrid(rawY, gridSize);
    } else {
      ghostX = rawX;
      ghostY = rawY;
    }
  }

  const isPrefab = obj.isPrefab;
  
  // Resolve Tile Image
  let tileStyle: React.CSSProperties = {};
  if (obj.tileData) {
      const tileset = tilesets.find(t => t.id === obj.tileData!.tilesetId);
      if (tileset) {
          tileStyle = {
              backgroundImage: `url(${tileset.src})`,
              backgroundPosition: `-${obj.tileData.tileX * tileset.tileSize}px -${obj.tileData.tileY * tileset.tileSize}px`,
              backgroundSize: `${tileset.width}px ${tileset.height}px`,
              backgroundRepeat: 'no-repeat'
          };
      }
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    backgroundColor: obj.imageBase64 ? 'transparent' : (obj.tileData ? 'transparent' : obj.color),
    transform: transform 
        ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${obj.rotation || 0}deg)` 
        : `rotate(${obj.rotation || 0}deg)`,
    border: selectedId === obj.id 
        ? '2px solid white' 
        : (isPrefab ? '2px dashed rgba(255, 255, 255, 0.5)' : 'none'),
    boxShadow: selectedId === obj.id ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
    zIndex: isDragging || isResizing || selectedId === obj.id ? 100 : 10,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : (isPrefab ? 0.6 : 1), 
    transformOrigin: 'center center',
    userSelect: 'none',
    ...tileStyle
  };

  const handleResizeStart = (e: React.MouseEvent, type: HandleType) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startObjX = obj.x;
    const startObjY = obj.y;
    const startW = obj.width;
    const startH = obj.height;
    const rotationRad = (obj.rotation || 0) * (Math.PI / 180);

    const onMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const currentY = moveEvent.clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;

      const localDx = dx * Math.cos(-rotationRad) - dy * Math.sin(-rotationRad);
      const localDy = dx * Math.sin(-rotationRad) + dy * Math.cos(-rotationRad);

      let newW = startW;
      let newH = startH;
      let newX = startObjX;
      let newY = startObjY;

      if (type.includes('e')) newW = startW + localDx;
      if (type.includes('w')) {
          newW = startW - localDx;
          newX += localDx * Math.cos(rotationRad);
          newY += localDx * Math.sin(rotationRad);
      }
      if (type.includes('s')) newH = startH + localDy;
      if (type.includes('n')) {
          newH = startH - localDy;
          newX -= localDy * Math.sin(rotationRad);
          newY += localDy * Math.cos(rotationRad);
      }

      if (obj.keepAspectRatio) {
          const ratio = startW / startH;
          if (type === 'e' || type === 'w') {
             newH = newW / ratio;
          } else if (type === 'n' || type === 's') {
             newW = newH * ratio;
          } else {
             newH = newW / ratio;
          }
      }

      if (newW < 32) newW = 32;
      if (newH < 32) newH = 32;

      if (isSnapping) {
          newW = snapToGrid(newW, gridSize);
          newH = snapToGrid(newH, gridSize);
          if (newW < 32) newW = gridSize || 32;
          if (newH < 32) newH = gridSize || 32;
      }

      updateObject(obj.id, { x: newX, y: newY, width: newW, height: newH });
    };

    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const isSelected = selectedId === obj.id;

  const renderHandle = (type: HandleType) => {
    const size = 8;
    const posStyle: React.CSSProperties = {};
    
    if (type.includes('n')) posStyle.top = -size/2;
    if (type.includes('s')) posStyle.bottom = -size/2;
    if (type.includes('w')) posStyle.left = -size/2;
    if (type.includes('e')) posStyle.right = -size/2;
    
    if (!type.includes('n') && !type.includes('s')) {
        posStyle.top = '50%';
        posStyle.marginTop = -size/2;
    }
    if (!type.includes('w') && !type.includes('e')) {
        posStyle.left = '50%';
        posStyle.marginLeft = -size/2;
    }

    let cursor = 'move';
    if (type === 'nw' || type === 'se') cursor = 'nwse-resize';
    if (type === 'ne' || type === 'sw') cursor = 'nesw-resize';
    if (type === 'n' || type === 's') cursor = 'ns-resize';
    if (type === 'e' || type === 'w') cursor = 'ew-resize';

    return (
        <div
            key={type}
            onMouseDown={(e) => handleResizeStart(e, type)}
            style={{
                ...posStyle,
                position: 'absolute',
                width: size,
                height: size,
                backgroundColor: 'white',
                border: '1px solid #3b82f6',
                cursor,
                zIndex: 200,
                pointerEvents: 'auto'
            }}
        />
    );
  };

  return (
    <>
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            left: ghostX,
            top: ghostY,
            width: obj.width,
            height: obj.height,
            border: '2px dashed rgba(255,255,255,0.8)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            zIndex: 90,
            pointerEvents: 'none',
            transform: `rotate(${obj.rotation || 0}deg)`,
            transformOrigin: 'center center'
          }}
        />
      )}

      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onMouseDown={(e) => {
          e.stopPropagation(); 
          selectObject(obj.id);
        }}
        onClick={(e) => {
            e.stopPropagation();
        }}
        className="rounded-sm flex flex-col items-center justify-center select-none"
        title={isPrefab ? `${obj.name} (Prefab)` : obj.name}
      >
        <div className="w-full h-full overflow-hidden flex items-center justify-center">
            {obj.imageBase64 ? (
            <img 
                src={obj.imageBase64} 
                alt={obj.name} 
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
            />
            ) : (
                !obj.tileData && (
                    <>
                        <div className="text-[10px] font-bold text-white/50">{obj.type.substring(0, 1)}</div>
                        {obj.width > 40 && obj.height > 30 && (
                            <div className="text-[8px] text-white/80 truncate px-1">{obj.name}</div>
                        )}
                    </>
                )
            )}
        </div>

        {isSelected && !isDragging && (
           <>
              {renderHandle('nw')}
              {renderHandle('n')}
              {renderHandle('ne')}
              {renderHandle('e')}
              {renderHandle('se')}
              {renderHandle('s')}
              {renderHandle('sw')}
              {renderHandle('w')}
              
              <div 
                className="absolute w-px h-4 bg-white top-0 left-1/2 -translate-x-1/2 -translate-y-full origin-bottom"
                style={{ height: 20 }}
              >
                  <div className="w-2 h-2 bg-white rounded-full absolute -top-1 -left-1 border border-blue-500"></div>
              </div>
           </>
        )}
      </div>
    </>
  );
};

export const EditorCanvas: React.FC = () => {
  const { setNodeRef } = useDroppable({ id: 'canvas' });
  const currentScene = useStore(state => state.getCurrentScene());
  const selectObject = useStore(state => state.selectObject);
  const showGrid = useStore(state => state.showGrid);
  const gridSize = useStore(state => state.gridSize);
  const assets = useStore(state => state.assets);
  const activeTileBrush = useStore(state => state.activeTileBrush);
  const addObject = useStore(state => state.addObject);
  const tilesets = useStore(state => state.tilesets);

  // Default values if scene not loaded
  if (!currentScene) return <div className="flex-1 bg-slate-900" />;

  const objects = currentScene.objects;

  // Background Grid Style
  const bgSize = `${gridSize}px ${gridSize}px`;
  const gridGradient = `linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`;
  
  // Resolve Background Image
  let bgImageUrl = '';
  if (currentScene.backgroundImageId) {
      const asset = assets.find(a => a.id === currentScene.backgroundImageId);
      if (asset) bgImageUrl = asset.src;
  }

  // Construct compound background
  let backgroundImage = 'none';
  let backgroundSize = 'auto';
  let cssBgSize = 'cover';
  const sizeMode = currentScene.backgroundSize || 'cover';
  if (sizeMode === 'stretch') cssBgSize = '100% 100%';
  else cssBgSize = sizeMode;

  if (showGrid) {
      if (bgImageUrl) {
        backgroundImage = `${gridGradient}, url(${bgImageUrl})`;
        backgroundSize = `${bgSize}, ${cssBgSize}`;
      } else {
        backgroundImage = gridGradient;
        backgroundSize = bgSize;
      }
  } else if (bgImageUrl) {
      backgroundImage = `url(${bgImageUrl})`;
      backgroundSize = cssBgSize;
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
      // If brush is active, place tile
      if (activeTileBrush) {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          
          const snappedX = snapToGrid(clickX, gridSize);
          const snappedY = snapToGrid(clickY, gridSize);
          
          const tileset = tilesets.find(t => t.id === activeTileBrush.tilesetId);
          const tsSize = tileset ? tileset.tileSize : 32;

          addObject('Tile', snappedX, snappedY, {
              width: tsSize,
              height: tsSize,
              tileData: {
                  tilesetId: activeTileBrush.tilesetId,
                  tileX: activeTileBrush.tileX,
                  tileY: activeTileBrush.tileY
              }
          });
      } else {
          selectObject(null);
      }
  };

  return (
    <div
      ref={setNodeRef}
      className="flex-1 relative overflow-hidden select-none"
      onClick={handleCanvasClick}
      style={{
        backgroundColor: currentScene.backgroundColor || '#0f172a',
        backgroundImage: backgroundImage,
        backgroundSize: backgroundSize,
        backgroundPosition: 'center',
        backgroundRepeat: showGrid ? 'repeat, no-repeat' : 'no-repeat',
        cursor: activeTileBrush ? 'crosshair' : 'default'
      }}
    >
      {objects.map(obj => (
        <DraggableObject key={obj.id} obj={obj} />
      ))}
      {activeTileBrush && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full shadow-lg text-sm font-bold z-50 pointer-events-none opacity-80">
              Paint Mode: Click to place tiles
          </div>
      )}
    </div>
  );
};