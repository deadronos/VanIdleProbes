# Tech Context

**Stack & tools:**
- Node.js + npm (project uses standard Node toolchain)
- Vite (dev server / bundler)
- React + TypeScript

**Key files:**
- `src/App.tsx` — core game loop, configs, and UI
- `vite.config.ts` — Vite + React config
- `package.json` — scripts and dependencies

**Dev commands:**
- `npm run dev` — start dev server (Vite)
- `npm run build` — produce production bundle (`tsc -b` then `vite build`)
- `npm run preview` — preview production build
- `npm run lint` — run linter

**Environment notes:**
- No backend or environment variables required.
- On Windows with `bash.exe` the commands above work from the repository root.

**Notes on testing & formatting:**
- Run `npm run dev` and check the browser console for errors after edits.
- Keep edits small and incremental; prefer small, testable changes.

