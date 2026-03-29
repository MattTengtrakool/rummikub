import { GameManager } from "@/app/Game/application/GameManager";
import { InMemoryGameRepository } from "@/app/Game/application/GameRepository/InMemoryGameRepository";
import { loadMocks } from "@/app/mocks";
import { registerGameEvents } from "@/app/WebSocket/infrastructure/gameEvents";
import type { WebSocketServer } from "@/app/WebSocket/infrastructure/types";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const engine = new Engine();
const socketServer: WebSocketServer = new Server();
socketServer.bind(engine);
const gamesNamespace = socketServer.of("/games");

socketServer.on("connection", (socket) => {
  const namespace = socket.nsp;
  console.log(`Connected on ${namespace.name}`);
});

const gameRepository = new InMemoryGameRepository();
const gameManager = new GameManager({
  gameRepository: gameRepository,
});

registerGameEvents({
  io: gamesNamespace,
  gameManager,
});

if (import.meta.dev) {
  loadMocks({
    gameRepository,
    gameManager,
  });
}

const STATS_DIR = resolve(".data");
const STATS_FILE = resolve(STATS_DIR, "stats.json");

function loadStats(): { totalGamesPlayed: number } {
  try {
    const raw = readFileSync(STATS_FILE, "utf-8");
    const data = JSON.parse(raw);
    return { totalGamesPlayed: Number(data.totalGamesPlayed) || 0 };
  } catch {
    return { totalGamesPlayed: 0 };
  }
}

function saveStats(stats: { totalGamesPlayed: number }) {
  try {
    mkdirSync(STATS_DIR, { recursive: true });
    writeFileSync(STATS_FILE, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to persist stats:", e);
  }
}

let totalGamesPlayed = loadStats().totalGamesPlayed;

export const app = {
  engine,
  socketServer,
  gameRepository,
  gameManager,
  get totalGamesPlayed() {
    return totalGamesPlayed;
  },
  incrementGamesPlayed() {
    totalGamesPlayed++;
    saveStats({ totalGamesPlayed });
  },
  setGamesPlayed(value: number) {
    totalGamesPlayed = value;
    saveStats({ totalGamesPlayed });
  },
};
