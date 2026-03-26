# Rummikub Online — Free Multiplayer Tile Game

[![CI](https://github.com/MattTengtrakool/rummikub/actions/workflows/deploy.yml/badge.svg)](https://github.com/MattTengtrakool/rummikub/actions/workflows/deploy.yml)

Play the classic [Rummikub](https://en.wikipedia.org/wiki/Rummikub) board game online with friends — for free, in real time, right in the browser. No sign-up, no download. Create a room, share the code, and start playing.

Built with **Nuxt 3**, **Vue 3**, **Socket.IO**, and **Tailwind CSS**.

<!-- TODO: Add a screenshot or GIF demo of the game board here -->
<!-- ![Rummikub game board screenshot](docs/screenshot.png) -->

## Features

- **Real-time multiplayer** — play with 2–4 players over WebSockets
- **Instant rooms** — create a game and share a short room code to invite friends
- **No account required** — just pick a username and play
- **Drag-and-drop tiles** — rearrange tiles on your rack and the game board
- **Full rule enforcement** — valid runs, groups, initial meld threshold, and turn validation
- **Mobile-friendly** — responsive design that works on phones, tablets, and desktops
- **Internationalized** — i18n-ready with translation support

## How It Works

1. One player creates a new game room
2. Other players join using the short room code
3. Each player draws tiles and takes turns placing valid runs and groups on the board
4. The first player to place all their tiles wins

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

```
app/                  Domain-driven modules (Player, Card, Combination, Game, …)
  [module]/domain/    Constants, DTOs, and game rules
  [module]/application/ Entities, managers, and utilities
pages/                Nuxt pages (home, game room, rules)
components/           Vue UI components
composables/          Vue composables (game state, username, card ordering, …)
logic/                Client-side helpers (socket setup, card dragging)
server/               Nitro server plugins and routes (Socket.IO, game creation)
lang/                 i18n translation files
assets/               SVG card graphics, Tailwind CSS
```

### Tech Stack

| Category | Technology |
|---|---|
| Framework | **Nuxt 3** (SPA mode) + **Vue 3** |
| Real-time | **Socket.IO** |
| Styling | **Nuxt UI** + **Tailwind CSS** |
| Validation | **Zod** |
| Unit tests | **Vitest** |
| E2E tests | **Playwright** |
| Components | **Storybook** |
