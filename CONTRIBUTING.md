# Contributing to PixelHero

First off, thank you for considering contributing to PixelHero! It's people like you that make such retro-inspired projects great.

## How Can I Contribute?

### Reporting Bugs
If you find a bug, please create an issue on our issue tracker. Include:
- A clear descriptive title.
- Exact steps to reproduce the issue.
- Your browser and OS version.

### Suggesting Enhancements
Have an idea for a new enemy, zone, or weapon? Open an issue detailing:
- The concept and mechanics.
- How it fits into the current game flow.

### Pull Requests
1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed game logic, ensure the game still runs at a stable 60 FPS.
4. Ensure your code lints and compiles properly (`npm run build`).
5. Issue that pull request!

## Local Development Setup
See the [Onboarding Document](docs/ONBOARDING.md) for full setup instructions.

## Styleguides

### Code Style
- We use standard TypeScript styling. 
- Try to keep game logic out of React `useState` hooks to avoid performance bottlenecks; use the `gameRef` pattern established in `App.tsx`.
- Use Tailwind classes for all DOM overlays. Do not write custom CSS unless absolutely necessary (e.g., custom animations).
