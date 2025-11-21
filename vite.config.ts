import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    // When building for GitHub Pages project site, assets should be served
    // from the repository subpath, e.g. https://deadronos.github.io/VanIdleProbes/
    base: isBuild ? '/VanIdleProbes/' : '/',
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
  };
});
