#!/usr/bin/env node
/**
 * @fileoverview Patches `vite-node/dist/client.mjs` to ensure SSR helper functions are present.
 * This script is a workaround for issues where `__vite_ssr_exportName__` and other helpers
 * might be missing during SSR or test execution involving `vite-node`.
 *
 * It checks if the patch is already applied and, if not, injects a fallback definition
 * for `__vite_ssr_exportName__` before `debugExecute` is called.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', 'vite-node', 'dist', 'client.mjs');

try {
  if (!fs.existsSync(filePath)) {
    console.warn('[fix-vite-node-ssr] target file not found, skipping:', filePath);
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('Ensure SSR helper functions are available on the execution context')) {
    // Already patched
    console.log('[fix-vite-node-ssr] already applied, nothing to do');
    process.exit(0);
  }

  const needle = '    });\n    debugExecute(__filename);';
  if (!content.includes(needle)) {
    console.warn('[fix-vite-node-ssr] unexpected file layout, skipping');
    process.exit(0);
  }

  const insert = '    });\n\n    // Ensure SSR helper functions are available on the execution context.\n    // Some runtimes or transform pipelines may drop or replace these helpers;\n    // provide a safe fallback so SSR-transformed modules can run in tests.\n    try {\n      if (!context.__vite_ssr_exportName__) {\n        context.__vite_ssr_exports__ = context.__vite_ssr_exports__ ?? exports;\n        context.__vite_ssr_exportName__ = (name, getter) => Object.defineProperty(context.__vite_ssr_exports__, name, {\n          enumerable: true,\n          configurable: true,\n          get: getter\n        });\n      }\n    } catch (e) {\n      // swallow errors to avoid breaking runtime\n    }\n\n    debugExecute(__filename);';

  content = content.replace(needle, insert);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[fix-vite-node-ssr] patch applied');
} catch (err) {
  console.error('[fix-vite-node-ssr] failed to apply patch:', err);
  // don't fail the install
}
