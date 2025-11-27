

export type ObjectType = 'Player' | 'Enemy' | 'Coin' | 'Wall' | 'Sprite' | 'Tile';

export type GameViewType = 'SIDE' | 'TOP_DOWN' | 'ISO';

export type GameGenreType = 'PLATFORMER' | 'RPG' | 'RACING' | 'SHOOTER' | 'TOWER_DEFENSE';

export interface Animation {
  id: string;
  name: string;
  frameAssetIds: string[]; 
  fps: number;
  loop: boolean;
}

export interface LightSource {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string; 
  intensity: number; 
  followObjectId?: string; 
}

export interface Tileset {
  id: string;
  name: string;
  src: string; // base64
  tileSize: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
}

export interface GameObject {
  id: string;
  name: string; 
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation?: number; 
  keepAspectRatio?: boolean;
  imageBase64?: string; 
  isPrefab?: boolean; 
  
  // Tile Specific Data
  tileData?: {
    tilesetId: string;
    tileX: number; // Grid column index
    tileY: number; // Grid row index
  };
  
  // Pooling & Spawning
  poolSize?: number; 
  spawnCooldown?: number; 

  // Instance Variables
  variables?: Record<string, string | number | boolean>;
  variableProps?: Record<string, { showInHud?: boolean }>;

  // Animation State
  animations?: Animation[];
  currentAnimation?: string; 

  // Visual Effects
  shadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };

  // Behaviors
  hasCollision?: boolean;
  hasGravity?: boolean;
  autoMove?: {
    enabled: boolean;
    speedX: number;
    speedY: number;
    loop: boolean; 
    range: number; 
  };
}

export interface Variable {
  id: string;
  name: string;
  initialValue: number;
  scope: 'global' | 'scene';
  showInHud?: boolean; 
}

export interface Scene {
  id: string;
  name: string;
  view?: GameViewType; 
  objects: GameObject[];
  events: GameEvent[];
  variables: Variable[];
  backgroundMusicId?: string;
  musicVolume?: number; 
  
  // Lighting
  lights?: LightSource[];
  ambientLight?: {
    color: string; 
    intensity: number; 
  };

  // Background
  backgroundColor?: string;
  backgroundImageId?: string;
  backgroundSize?: 'cover' | 'contain' | 'stretch';
}

export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  view: GameViewType;
  gridSize: number;
  objects: Partial<GameObject>[];
  events: Partial<GameEvent>[];
  variables: Variable[];
}

export type ConditionType = 
  | 'KEY_PRESSED' 
  | 'COLLISION' 
  | 'ALWAYS' 
  | 'VAR_EQUALS' 
  | 'VAR_GT' 
  | 'VAR_LT'
  | 'OBJ_VAR_COMPARE'
  | 'MOUSE_CLICK';

export type ActionType = 
  | 'MOVE_X' 
  | 'MOVE_Y' 
  | 'JUMP' 
  | 'DESTROY' 
  | 'GRAVITY' 
  | 'REVERSE_X'
  | 'REVERSE_Y'
  | 'VAR_SET' 
  | 'VAR_ADD' 
  | 'VAR_SUB'
  | 'OBJ_VAR_SET' 
  | 'OBJ_VAR_ADD' 
  | 'OBJ_VAR_SUB'
  | 'SET_ANIMATION'
  | 'GOTO_SCENE'
  | 'PLAY_SOUND'
  | 'CREATE_OBJECT';

export interface GameEvent {
  id: string;
  condition: {
    type: ConditionType;
    param?: string; 
    variableId?: string; 
    variableName?: string; 
    value?: number | string | boolean; 
    target?: string; 
    operator?: string; 
  };
  action: {
    type: ActionType;
    target: 'SELF' | 'OTHER' | string; 
    param?: number; 
    variableId?: string; 
    variableName?: string; 
    value?: number | string | boolean; 
    animationName?: string; 
    sceneId?: string; 
    audioClipId?: string; 
    volume?: number;
    // Spawning
    prefabId?: string; 
    offsetX?: number;
    offsetY?: number; 
    cooldown?: number;
  };
}

export interface GameState {
  currentSceneId: string;
  scenes: Scene[];
  globalVariables: Record<string, number>;
}

export interface UploadedAsset {
  id: string;
  name: string;
  src: string; 
  type: 'sprite' | 'audio';
}