# React Game Maker - Development Roadmap

## A. Core Data Models

**GameObject**
```typescript
interface GameObject {
  id: string;
  type: 'Player' | 'Enemy' | 'Coin' | 'Wall';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}
```

**GameEvent**
```typescript
interface GameEvent {
  id: string;
  condition: {
    type: 'KEY_DOWN' | 'COLLISION' | 'ALWAYS';
    param?: string; // e.g., 'Space', or 'Enemy' (for collision)
  };
  action: {
    type: 'MOVE' | 'DESTROY' | 'JUMP' | 'RESET';
    target: 'SELF' | 'OTHER' | 'Player'; // Who is affected
    param?: number; // e.g., speed
  };
}
```

## B. Project Structure

*   `src/components/` - UI components (Editor, Panel, Runtime).
*   `src/store/` - Zustand store for global game state.
*   `src/types.ts` - Shared interfaces.
*   `src/utils/` - Collision detection and math helpers.

## C. UI Components

1.  **AssetPanel**: Sidebar with draggable templates (Box, Player, Enemy).
2.  **CanvasEditor**: Drop target. Handles absolute positioning and selection.
3.  **EventSheetEditor**: List of logical rules.
4.  **GameRuntime**: The "Play Mode" engine. Handles the game loop (RAF).
5.  **Toolbar**: Play/Stop buttons, Save/Load.

## D. Drag-and-Drop Implementation

*   **Library**: `@dnd-kit/core` & `@dnd-kit/modifiers`.
*   **Asset to Canvas**: Use a `Draggable` overlay in the panel. The Canvas is a `Droppable`. On `dragEnd`, create a new GameObject in the store.
*   **Canvas Movement**: Objects on canvas are also `Draggable`. On `dragEnd`, update their `x, y` coordinates in the store.

## E. Event System Design

**Example Conditions:**
1.  `KEY_DOWN (Space)`
2.  `KEY_DOWN (ArrowRight)`
3.  `COLLISION (Player, Coin)`
4.  `ALWAYS` (Runs every frame)

**Example Actions:**
1.  `MOVE_X (5)`
2.  `JUMP (-10)`
3.  `DESTROY (Target)`
4.  `RESTART_SCENE`

**Runtime Interpretation:**
The `GameRuntime` component uses `requestAnimationFrame`. Inside the loop:
1.  Apply inputs (Keyboard state).
2.  Run "Always" events.
3.  Check "Collision" events (AABB check).
4.  Apply physics (velocity, gravity).
5.  Render.

## F. Play Mode vs Edit Mode

*   **Toggle**: A boolean `isPlaying` in the Zustand store.
*   **Data Sharing**: `GameRuntime` initializes its local state by deep-cloning the `editorObjects` from the store. This ensures the editor state remains pristine while the game state mutates.

## G. Recommended Libraries

*   **Rendering**: HTML/CSS (DOM) for this prototype.
    *   *Why?* Simplest integration with standard React DnD libraries. PixiJS is better for performance (1000+ sprites), but DOM is fine for a < 100 object prototype and easier to style.
*   **State**: `Zustand`. Minimal boilerplate, easy access outside components if needed.
*   **Build**: Vite (implied by environment).

## H. Development Order

1.  **Scaffolding**: Setup Layout (Sidebar, Main Area).
2.  **State Definition**: Create Zustand store for Objects.
3.  **Drag & Drop**: Implement dragging assets to the "Scene".
4.  **Properties**: Allow moving objects on the Scene.
5.  **Event Data**: Create the data structure for the Event Sheet.
6.  **Event UI**: Build the visual editor for events.
7.  **Runtime Engine**: Build the `GameLoop` hook and Renderer.
8.  **Integration**: Connect the Event System to the Runtime Engine.
