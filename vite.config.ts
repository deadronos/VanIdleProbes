import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(
      process.env.VITEST
        ? {}
        : {
            babel: {
              plugins: [['babel-plugin-react-compiler']],
            },
          },
    ),
  ],
  optimizeDeps: {
    include: ['src/game/config.ts', 'src/game/engine.ts', 'src/game/save.ts'],
  },
  ssr: {
    noExternal: [/src\/game\/.*/],
  },
})
