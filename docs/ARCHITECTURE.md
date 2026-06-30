# Architecture Overview

Below is a high-level overview of the PixelHero architecture. It demonstrates how React and the modular HTML5 Canvas engine interact within this project.

```mermaid
graph TD
    A[index.html] --> B[main.tsx]
    B --> C[App.tsx (Main Component)]
    
    C -->|Renders UI Overlays| D[Tailwind UI/React DOM]
    D --> D1[Main Menu / HUD]
    D --> D2[Quest Log / Shop]
    D --> D3[Dialog Overlay]
    D --> D4[Game Over / Victory]
    
    C -->|Uses Canvas Ref| E[HTML5 Canvas]
    E -->|requestAnimationFrame| F[Game Loop 'loop()']
    
    F --> G1[Input Handling 'keysRef' & 'touchMoveRef']
    F --> G2[Update Engine 'engine.ts -> updateWorld()']
    F --> G3[Render Engine 'renderer.ts -> renderFrame()']
    
    G2 --> I1[Player Physics & Combat]
    G2 --> I2[Enemy AI & Collisions]
    G2 --> I3[Wave Management & Zone Triggers]
    
    G3 --> J1[Draw Base & Sprites]
    G3 --> J2[Lighting Engine Masking]
```

## Explanation

1. **Entry Point**: The app launches from `index.html` via `main.tsx`, wrapping everything in React.
2. **UI vs Game Loop**: React handles the static UI overlays (Main Menu, HUD, Dialogs, Shop) using standard JSX and Tailwind. This ensures the UI is responsive and accessible, without needing to reinvent a UI system in Canvas.
3. **The Game Engine**: The actual game logic bypasses React completely. A `useRef` holds the `GameState`.
4. **The Loop**: Triggered on mount, a standard `requestAnimationFrame` loop continually reads inputs, passes the mutable `gameRef` to `engine.ts`'s `updateWorld()` function to handle logic, and immediately passes it to `renderer.ts`'s `renderFrame()` to draw to the Canvas.
5. **Input**: Event listeners for keys and touch interfaces push changes to non-reactive refs (`keysRef`, `touchMoveRef`). This decoupling ensures React doesn't trigger re-renders just because the player is pressing a key, preventing huge performance bottlenecks.
