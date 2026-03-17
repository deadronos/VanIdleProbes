import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    // When building for GitHub Pages project site, assets should be served
    // from the repository subpath, e.g. https://deadronos.github.io/VanIdleProbes/
    base: isBuild ? '/VanIdleProbes/' : '/',
    plugins: [
      react(),
      !process.env.VITEST &&
        (babel as any)({
          plugins: [['babel-plugin-react-compiler']],
        }),
    ].filter(Boolean),
    optimizeDeps: {
      include: ['src/game/config.ts', 'src/game/engine.ts', 'src/game/save.ts'],
    },
    ssr: {
      noExternal: [/src\/game\/.*/],
    },
  };
});
