# Changelog

All notable changes to the **PixelHero** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete Action RPG core gameplay loop in a single React component (`App.tsx`).
- HTML5 Canvas rendering for 60 FPS performance without React overhead.
- Entities: Player, Slime, Bat, Goblin, Boss.
- Quest System with tracking and rewards.
- Zone transitions (Emberwick, Gloomwood, Hollow Depth).
- Dynamic HUD with floating text and particle effects.
- Keyboard and on-screen touch joystick controls.

### Fixed
- Stabilized `gameRef` to prevent React re-renders during the game loop.
- Bound player and enemies to map limits.

## [0.1.0] - 2026-06-30
### Added
- Initial project scaffold using Vite, React, TailwindCSS, and TypeScript.
- `vite-plugin-singlefile` implemented for standalone HTML bundling.
