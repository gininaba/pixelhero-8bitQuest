# Developer Onboarding

Welcome to the PixelHero development team! This guide will help you get set up and understand our workflow.

## Setup Instructions

1. Ensure you have **Node.js** (v18+) installed.
2. Clone the repository: `git clone <repo-url>`
3. Navigate into the folder: `cd PixelHero`
4. Install NPM packages: `npm install`
5. Start the Vite dev server: `npm run dev`

## Tech Stack Notes
- **React**: We use React for wrapping the canvas and handling UI overlays (Dialogs, Menus, Quests).
- **Canvas API**: All gameplay rendering happens in a 2D Canvas context. We avoid React state for game logic to maintain 60 FPS.
- **Mutable Refs**: Game state is stored in a mutable `useRef` (`gameRef`) rather than `useState`. This prevents React from re-rendering the component on every frame.
- **Tailwind CSS**: Used for styling the DOM overlays (HUD, Start Screen).

## Development Workflow
1. **Branching**: Create a feature branch from `main` (e.g., `feature/add-new-enemy`).
2. **Local Testing**: Run the game locally and test your changes. Ensure 60 FPS is maintained.
3. **Pull Requests**: Open a PR against `main`. Include screenshots or screen recordings if you changed visual elements.
4. **Build Check**: Ensure `npm run build` succeeds (the project builds into a single HTML file).

## FAQ for Beginners

**Q: Why is the game state in a `useRef`?**
A: React `useState` triggers component re-renders. Running a game loop at 60 FPS using `useState` would cause immense performance issues. `useRef` allows us to hold mutable state without triggering renders.

**Q: Where do I add a new enemy type?**
A: Update the `Enemy` type interface in `App.tsx`, then modify the `makeEnemy` and `seedZone` functions to spawn them. Finally, add AI logic in the `loop` and drawing logic in `renderFrame`.

**Q: How do I change the map?**
A: Currently, maps are generated procedurally or statically defined via `seedZone`. To add a new map, add a new zone to the `ZONES` constant array.
