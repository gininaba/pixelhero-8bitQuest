<div align="center">
  <img src="public/pixelquest_logo.png" alt="PixelHero Logo" width="128" height="128" />
  <h1>PixelHero</h1>
  <p><strong>An action-packed 2D top-down RPG built entirely in React 19, TypeScript, and HTML5 Canvas.</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React-19.2-blue.svg?style=for-the-badge&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-7.3-646CFF.svg?style=for-the-badge&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind-4.1-38B2AC.svg?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS v4" />
  </p>
</div>

---

Embark on an epic quest in a retro-inspired world, battle dangerous creatures, collect powerful upgrades, and defeat the Shadow Warden. PixelHero is a complete game engine running entirely on the web, bypassing standard DOM nodes in favor of a highly-optimized requestAnimationFrame Canvas renderer.

## Features

- **Action RPG Combat**: Real-time hack-and-slash combat with dashing, attacking, invincibility frames, hit-stun mechanics, and a fast-paced combo scoring system.
- **Infinite Dungeon Mode**: Descend into a procedurally seeded dungeon with infinite floors. Features automatic difficulty scaling, cycling visual themes, boss encounters every 5 floors, and infinitely looping quests with scaling targets.
- **Procedural Merchant NPC**: Spawns next to the stairs portal on every boss floor allowing full shop interactions and upgrade purchases deep in the dungeon to prepare for the boss fight.
- **Skill Powerup Perks**: Unlocks powerful spells during leveling:
  - **Flame Blessing**: Launches piercing fireballs with sword attacks.
  - **Thunder Spell**: Calls down zigzag lightning bolts to strike and stun random nearby enemies, accompanied by dynamic screen flashes.
  - **Shield Aura**: Summons a spinning blue energy sphere orbiting the player that damages and knocks back contacting enemies.
- **Dynamic Entities**: 9 unique enemy types including slimes, bats, goblins, scorpions, wraiths, skeletal knights, and 3 distinct bosses (Gruk, Sand Wyrm, Shadow Warden) with custom AI.
- **Quest System**: A structured quest system featuring infinitely scaling auto-rollover quests tracking floors cleared, monsters slain, and gold collected.
- **Loot and Leveling**: Gain XP, level up your stats with a balanced scaling curve, visit the merchant, and collect coins, hearts, and relics.
- **New Game Plus**: Replay with scaled difficulty after conquering Floor 15, while retaining your perks and upgrades.
- **Procedural Audio**: 3 distinct, procedural MIDI-like music themes (Desert, Dungeon, Sanctum) and synthesized sound effects for combat and UI.
- **Modern Tech Stack**: React 19, Vite 7, TailwindCSS v4, and TypeScript.
- **Self-Contained Single-File Build**: Bundles all scripts, CSS, and structural configurations directly into a single lightweight HTML index using vite-plugin-singlefile for instant page loads.

## Premium UI/UX Features

- **Non-Scrollable Viewport Lock**: The entire page is locked to the screen heights. The layout operates as a cohesive, scrollbar-free retro cabinet console.
- **Curved Glass CRT Monitor Simulation**: The canvas container simulates a retro glass monitor utilizing horizontal scanlines, vignetting, custom RGB subgrids, and high-frequency phosphor flicker.
- **3D Moving Horizon Menu Grid**: An animated retro-wave perspective grid moving dynamically under the main menu.
- **Tabbed Dashboard Console and Mobile Compass Drawer**: All sidebar statistics, maps, active tasks, and high scores are consolidated into modular tabs:
  - **QST (Quests)**: Check active quest details and task completion meters.
  - **MAP (World Map)**: Shows active zone and combat status.
  - **STS (Stats)**: Shows player stats alongside integrated controls reference.
  - **HOF (Hall of Heroes)**: Display leaderboard entries.
  - On mobile viewports, these tabs are accessible via a sliding fullscreen compass overlay drawer.
- **Universal Pointer Joystick (Gamepad)**: Joysticks are integrated with PointerEvents rather than touch-events. Includes Pointer Capture to track dragging outside the joystick circle smoothly, and works out-of-the-box for touch screens, styluses, and mouse drag inputs.
- **Adaptive Screen Configurations**:
  - Landscape Mode: Maximizes the canvas inside the screen, floating controls transparently on left/right screen margins.
  - Portrait Mode: Stacks the canvas at the top and allocates the lower half as a tactile, dedicated gamepad panel to keep fingers off the screen.

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd PixelHero
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Navigate to http://localhost:5173 to play the game.

5. **Build for Production**:
   Build the self-contained single file build:
   ```bash
   npm run build
   ```
   The output is built at `dist/index.html`.

## Usage and Controls

### Keyboard controls (Desktop)
- **Movement**: W, A, S, D or Arrow Keys
- **Attack**: Space, J, or K
- **Dash**: Shift or L
- **Interact / Talk / Next Dialog**: E, F, or Enter
- **Pause Game**: Escape or P
- **Quest Log**: Q
- **Instant Restart**: R

### Gamepad controls (Mobile / Touch Devices)
- **Movement**: Touch/click and drag the virtual Joystick knob (labeled MOVE).
- **Attack**: Tap the red ATK button.
- **Dash**: Tap the blue DSH button.
- **Interact / Talk**: Tap the yellow USE button.

## Documentation

For detailed insights into the project, check out the docs folder:

- Project Structure
- Architecture and Flow
- Key Components
- Internal API Reference
- Onboarding
- Environment Configuration

## Contribution Guidelines

We welcome contributions. Please see our CONTRIBUTING.md for details on how to get started. Whether it is adding a new enemy, zone, or fixing a bug, your help is appreciated.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
