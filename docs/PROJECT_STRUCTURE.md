# Project Structure

This project uses a standard Vite + React directory layout, with the core game engine completely modularized within the `src/game/` folder.

```text
PixelHero/
├── docs/                      # Documentation files for the project
├── public/                    # Static assets like favicon and raw images
├── src/
│   ├── game/                  # CORE GAME ENGINE
│   │   ├── audio.ts           # Procedural Web Audio synthesizer (SFX and music themes)
│   │   ├── config.ts          # Constants, zone layouts, stats, XP formulas, and wave definitions
│   │   ├── engine.ts          # The game loop updater: movement, physics, AI, damage logic
│   │   ├── entities.ts        # Spawning logic for drops, enemies, zones, and particles
│   │   ├── renderer.ts        # The canvas rendering pipeline, including the offscreen lighting engine
│   │   ├── types.ts           # Shared TypeScript interfaces (GameState, Player, Enemy, etc.)
│   │   └── utils.ts           # Helper functions (math, random, distance calculations)
│   ├── utils/                 # General React utility functions
│   │   └── cn.ts              # Tailwind class merging utility (clsx + tailwind-merge)
│   ├── App.tsx                # React wrapper: provides static UI overlays and triggers the canvas engine
│   ├── index.css              # Global CSS, typically containing Tailwind directives
│   └── main.tsx               # Application entry point, renders App into the DOM
├── package.json               # Dependencies and scripts (dev, build, preview)
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite bundler configuration (uses vite-plugin-singlefile)
└── index.html                 # Main HTML template containing the root div
```

## Main Files

- **`App.tsx`**: The React entry-point for the game. It handles input event listeners, mounts the `<canvas>`, and renders static Tailwind UI overlays (menus, shop, quest log). However, the actual game logic and drawing is delegated to `src/game/*`.
- **`src/game/engine.ts`**: The workhorse. On every animation frame, this updates positions, enemy state machines, wave progression, and physics.
- **`src/game/renderer.ts`**: Takes the updated `GameState` and draws it onto the 2D canvas context, handling sprites, pixel drawing, and offscreen canvas lighting masking.
- **`vite.config.ts`**: Configures the build process. Notably, it uses `vite-plugin-singlefile` to bundle the entire game into a single HTML file for easy distribution without worrying about relative paths.
