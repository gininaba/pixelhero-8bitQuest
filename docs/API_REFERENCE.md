# Internal API Reference

*Note: PixelHero is a frontend-only HTML5 Canvas game. It does not possess a REST API, GraphQL endpoint, or OpenAPI schema. The following documents the internal game interfaces and utility functions.*

## Core Data Structures

### `interface GameState` (Stored in `gameRef.current`)
The global state object holding all current game information.
- `phase: GamePhase`: Current UI phase (`menu`, `playing`, `paused`, `gameover`, etc.)
- `zone: ZoneId`: Current map zone.
- `player: Player | null`: The player's data.
- `enemies: Enemy[]`: Active enemies on the map.
- `drops: Drop[]`: Loot currently on the ground.
- `particles: Particle[]`: Visual effects particles.

## Utility Methods

### `clamp(v: number, a: number, b: number) -> number`
Restricts a value `v` to be between `a` and `b`.

### `dist(a: Vec, b: Vec) -> number`
Calculates the Euclidean distance between two vectors/points.

### `rand(a: number, b: number) -> number`
Returns a random float between `a` and `b`.

### `nextId() -> number`
Returns a unique incrementing integer for entity identification.

## Action Functions

### `burstParticles(gr: GameState, x: number, y: number, n: number, color: string)`
Spawns `n` particles of `color` at coordinate `(x, y)` that scatter outward.
- **Example**: `burstParticles(gr, 100, 150, 10, '#ff0000')` (creates a blood splatter effect)

### `spawnFloater(gr: GameState, props)`
Adds floating text (e.g., damage numbers, XP gains) at a coordinate.
- **Example**: `spawnFloater(gr, {x: player.x, y: player.y, text: '+10 XP', color: '#ffffff', life: 56, vy: -0.62})`

### `completeQuestProgress(gr: GameState, questId: string, amt?: number)`
Increments the progress of a given quest by `amt`. Handles quest completion logic and rewards automatically.
- **Example**: `completeQuestProgress(gr, 'slimes', 1)`
