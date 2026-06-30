# Key Components and Flow

This document breaks down the major components, interfaces, and logical flow of the PixelHero game engine. The engine code is primarily contained in `src/game/`.

## Major Interfaces (types.ts)

### `Player`
- **Purpose**: Represents the player character's state, position, and stats.
- **Key Fields**: `x`, `y`, `hp`, `maxHp`, `attackCd`, `dashTime`, `level`, `xp`, `coins`.
- **Usage**: Managed inside the `GameState` ref and updated every frame.

### `Enemy`
- **Purpose**: Represents hostile NPCs (Slimes, Scorpions, Bosses, etc).
- **Key Fields**: `type`, `hp`, `vx`, `vy`, `wander`, `attackCd`.
- **Boss Fields**: State machine timers like `bossChargeState`, `burrowTimer`, `teleportTimer` for specific AI.
- **Usage**: Stored in `gameRef.current.enemies`. We iterate over them to apply custom AI behavior depending on `type`, and then check for collisions.

## Key Functions

### `engine.ts -> updateWorld()`
- **Purpose**: The absolute core of the game loop logic. Calculates physics, handles movement, processes zone transitions, processes enemy AI, and manages the wave system.
- **Usage Example**: Called every frame inside `App.tsx`'s loop.

### `entities.ts -> seedZone(zoneId)`
- **Purpose**: Clears out old entities and populates a specific zone with the correct enemies and drops.
- **Inputs**: `zone` (number 0 through 4).
- **Usage Example**: `seedZone(1); // spawns slimes, bats, herbs for Gloomwood`

### `engine.ts -> doAttack()`
- **Purpose**: Handles the player's attack logic, including hit detection based on facing direction, calculating damage, spawning particles, and resolving knockback.

### `renderer.ts -> renderFrame(ctx, gr)`
- **Purpose**: The core rendering function that draws the entire `GameState` onto the HTML5 Canvas.
- **Lighting**: Contains the `drawLightingEngine` which manages an off-screen canvas. It fills the screen with dark alpha, punches out holes using `destination-out`, and overlays it on the main canvas to create the Gloomwood/Sanctum lighting effect.

### `audio.ts -> AudioEngine`
- **Purpose**: A self-contained Web Audio API synthesizer. No external assets are loaded. It procedurally generates 8-bit sound effects (square waves, noise, exponential ramps) and runs a loop sequencer for procedural zone music.

## Data Flow (The Game Loop)

1. **Initialization**: React mounts `App.tsx`. `useEffect` sets up Keyboard/Touch event listeners and starts the `requestAnimationFrame` loop.
2. **Input Phase**: The `loop` function checks `keysRef` and `touchMoveRef` for player intent (move, attack, dash).
3. **Update Phase (`updateWorld`)**: 
   - Player position and state (cooldowns, iframes) are updated.
   - Enemy AI executes specific logic and calculates pathing/physics.
   - Projectiles update their trajectories.
   - Collisions (attacks, taking damage, picking up items) are resolved.
   - The Wave System checks if new enemies need to spawn.
4. **Render Phase (`renderFrame`)**: Called to draw the updated `GameState` to the canvas.
5. **Repeat**: The loop requests the next animation frame.
