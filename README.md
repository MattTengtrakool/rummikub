# Rummikub

An online multiplayer Rummikub game built with TypeScript, Nuxt 3, Vue 3, and Socket.IO.

## Getting Started

### Prerequisites

- Node.js 22+
- Yarn

### Install dependencies

```bash
yarn
```

### Run the dev server (Backend + Frontend + Storybook)

```bash
yarn dev
```

### Build for production

```bash
yarn build
```

### Run tests

```bash
yarn test:unit
```

## Architecture

### Layers

The project uses 4 layers:

- **domain** — Core game rules. Functional, immutable, and pure. No external dependencies.
- **application** — Turn management and entity behavior. OOP-style orchestration that applies domain rules.
- **presenter** — Vue components, composables, and pages. The UI layer.
- **infrastructure** — WebSocket events, local storage, repositories.

### Project Structure

- **app/** — Domain-driven modules (Player, Card, Combination, Game, GameBoard, DrawStack, WebSocket)
  - **[module]/domain/** — Constants, DTOs, and game rules
  - **[module]/application/** — Entities, managers, and utilities
- **pages/** — Nuxt pages (home, game room, rules)
- **components/** — Vue UI components
- **composables/** — Vue composables (game state, username, card ordering, etc.)
- **logic/** — Client-side helpers (socket setup, card dragging)
- **server/** — Nitro server plugins and routes (Socket.IO, game creation)
- **lang/** — i18n translation files
- **assets/** — SVG card graphics, Tailwind CSS

### Tech Stack

- **Nuxt 3** (SPA mode) + **Vue 3**
- **Socket.IO** for real-time multiplayer
- **Nuxt UI** + **Tailwind CSS** for styling
- **Zod** for validation
- **Vitest** for unit tests, **Playwright** for e2e tests
- **Storybook** for component development
