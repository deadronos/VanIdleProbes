# Von Idle Probes

**Von Idle Probes** is an incremental clicker/idle game built with React, TypeScript, and Vite. You act as the origin node of a self-replicating Von Neumann probe swarm, tasked with exploring the galaxy, gathering resources, and ensuring the survival of your lineage against entropy.

## Features

- **Incremental Progression**: Gather resources (Metal, Energy, Data, Probes) to build units.
- **Unit Management**: Construct Harvesters, Foundries, Fabricators, and more to automate production.
- **Upgrades**: Unlock powerful technologies like Autonomy Firmware and Dyson Sheaths to boost efficiency.
- **Prestige Mechanics**:
  - **Cycle Reboot**: Reset for "Stored Knowledge" and permanent bonuses.
  - **Continuum Fork**: A higher-tier reset that resets cycles but grants "Prime Archives" and massive boosts.
- **Offline Progress**: Simulation continues even when the tab is closed, calculating gains upon return.
- **Save System**: Autosave, manual save, and export/import functionality (JSON).
- **Responsive UI**: A clean, dark-themed cosmic interface with real-time feedback.

## Project Structure

The codebase is organized as follows:

- **`src/`**: Source code root.
  - **`main.tsx`**: Entry point.
  - **`App.tsx`**: Main game component and UI logic.
  - **`game/`**: Core game logic (agnostic of UI).
    - **`config.ts`**: Type definitions, constants, and balancing configuration.
    - **`engine.ts`**: Production calculations and offline simulation logic.
    - **`save.ts`**: Save file schema, migration logic, and storage handling.
  - **`assets/`**: Static assets (if any).
- **`scripts/`**: Utility scripts for build/test environment patching.
- **`public/`**: Static public files.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/deadronos/VanIdleProbes.git
    cd VanIdleProbes
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

To start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open your browser to the URL shown (usually `http://localhost:5173`).

### Building

To build the project for production:

```bash
npm run build
```

The output will be in the `dist/` directory.

### Preview

To preview the production build locally:

```bash
npm run preview
```

### Testing

Run the test suite using Vitest:

```bash
npm test
```

### Linting

Lint the codebase using ESLint:

```bash
npm run lint
```

## Gameplay Guide

1.  **Start**: You begin with a small cache of resources.
2.  **Build**: Purchase **Harvester Drones** to get Metal, then **Foundries** for Energy.
3.  **Expand**: Build **Autofabricators** to create Probes and explore distance.
4.  **Research**: Use **Archive Spires** to generate Data and unlock upgrades.
5.  **Survive**: Watch your Entropy! If it gets too high, production slows. Build **Entropy Dampers** or pay for manual stabilization.
6.  **Prestige**:
    - Reach distance and data milestones to **Reboot the Cycle**.
    - After several cycles, perform a **Continuum Fork** for massive multipliers.

## License

[MIT](LICENSE) (or whichever license applies)
