/* eslint-disable @typescript-eslint/no-explicit-any */
// Tests: vitest-ssr-helper-setup.ts
// Purpose: Ensure Vitest/Vite test runtime provides the SSR export helper
// that SSR-transformed modules reference (e.g. __vite_ssr_exportName__).
// This is a test-only shim to unblock unit tests while a durable fix is applied.

// Provide a global fallback so bare identifier usage may resolve to something
;(function ensureGlobalHelper() {
  try {
    const g = globalThis as any;
    g.__vite_ssr_exports__ = g.__vite_ssr_exports__ ?? {};
    if (!g.__vite_ssr_exportName__) {
      g.__vite_ssr_exportName__ = function (name: string, getter: () => any) {
        Object.defineProperty(g.__vite_ssr_exports__, name, {
          enumerable: true,
          configurable: true,
          get: getter,
        });
      };
    }
  } catch {
    // ignore
  }
})()

// Try to monkeypatch the vite-node runner context so SSR helpers are present
// when Vitest evaluates SSR-transformed modules. This is tolerant if the
// internal module path or runner signature differs across versions.
;(async function tryPatchViteNode() {
  try {
    // dynamic import wrapped in an async IIFE to avoid top-level await
    const mod = await import('vite-node/client').catch(() => null);
    if (mod && mod.ViteNodeRunner) {
      const ViteNodeRunner = (mod as any).ViteNodeRunner;
      const orig = ViteNodeRunner.prototype.prepareContext;
      ViteNodeRunner.prototype.prepareContext = function (ctx: any) {
        ctx = ctx || {};
        ctx.__vite_ssr_exports__ = ctx.__vite_ssr_exports__ ?? {};
        if (!ctx.__vite_ssr_exportName__) {
          ctx.__vite_ssr_exportName__ = function (name: string, getter: () => any) {
            Object.defineProperty(ctx.__vite_ssr_exports__, name, {
              enumerable: true,
              configurable: true,
              get: getter,
            });
          };
        }
        if (!ctx.__vite_ssr_import__) {
          ctx.__vite_ssr_import__ = (p: string) => import(p);
        }
        return orig ? orig.call(this, ctx) : ctx;
      };
    }
  } catch {
    // best-effort shim — ignore failures to avoid interfering with unrelated setups
  }
})();

export {};
