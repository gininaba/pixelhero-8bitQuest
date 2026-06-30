# Environment & Configuration

PixelHero is designed to be as simple and lightweight as possible. It is a completely static frontend application (Single Page Application) that runs entirely in the browser. 

Therefore, it **does not require** any environment variables, secrets, or complex `.env` configurations to run the core game.

## Available Scripts (package.json)

- `npm run dev`: Starts the local Vite development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles the TypeScript code and bundles the application. Thanks to `vite-plugin-singlefile`, the output will be one single `index.html` file containing all CSS and JS inline.
- `npm run preview`: Serves the built production version locally to test before deployment.

## Vite Configuration (`vite.config.ts`)

The primary configuration file for the build process is `vite.config.ts`.
It utilizes `@vitejs/plugin-react` for React support and `vite-plugin-singlefile` to ensure all assets are inlined.

Example Configuration:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
```

## Local Storage

The game utilizes the browser's `localStorage` to save High Scores across sessions.
- **Key**: `pixHeroScores`
- **Format**: JSON Array of `{ name: string, score: number, day: string }`
