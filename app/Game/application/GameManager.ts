import type { GameId, IGame } from "@/app/Game/application/Game";
import type { IGameRepository } from "@/app/Game/application/GameRepository/IGameRepository";
import type { IPlayer } from "@/app/Player/application/Player";
import { v4 as uuidv4 } from "uuid";

export const RECONNECT_GRACE_SECONDS = 30;

export type UserConnection = {
  gameId: GameId;
  username: string;
  sessionToken?: string;
};

export type GameAndPlayer = {
  game: IGame;
  player: IPlayer;
  sessionToken: string;
  isReconnect: boolean;
};

type GameManagerProps = {
  gameRepository: IGameRepository;
};

export interface IGameManager {
  isConnected(connection: UserConnection): boolean;
  connect(connection: UserConnection): GameAndPlayer;
  disconnect(connection: UserConnection): { game: IGame; gracePeriod: boolean };
  leave(connection: UserConnection): IGame;
  connectedCount(gameId: GameId): number;
  usernames(gameId: GameId): Record<string, boolean>;
  isReconnecting(gameId: GameId, username: string): boolean;
  cancelGraceTimer(gameId: GameId, username: string): void;
  onGraceExpired: ((gameId: GameId, username: string) => void) | null;
}

export class GameManager implements IGameManager {
  private playersInGames: Record<GameId, Set<string>> = {};
  private gameRepository: IGameRepository;
  private graceTimers = new Map<string, NodeJS.Timeout>();
  private sessionTokens = new Map<string, string>();
  onGraceExpired: ((gameId: GameId, username: string) => void) | null = null;

  constructor(props: GameManagerProps) {
    this.gameRepository = props.gameRepository;
  }

  private graceKey(gameId: GameId, username: string) {
    return `${gameId}:${username}`;
  }

  private tokenKey(gameId: GameId, username: string) {
    return `${gameId}:${username}`;
  }

  isConnected(connection: UserConnection) {
    return this.playersInGames[connection.gameId]?.has(connection.username);
  }

  isReconnecting(gameId: GameId, username: string): boolean {
    return this.graceTimers.has(this.graceKey(gameId, username));
  }

  private addConnection(connection: UserConnection) {
    this.playersInGames[connection.gameId] ??= new Set();
    this.playersInGames[connection.gameId].add(connection.username);
  }

  private deleteConnection(connection: UserConnection) {
    this.playersInGames[connection.gameId]?.delete(connection.username);
  }

  cancelGraceTimer(gameId: GameId, username: string) {
    const key = this.graceKey(gameId, username);
    const timer = this.graceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(key);
    }
  }

  private startGraceTimer(connection: UserConnection) {
    const key = this.graceKey(connection.gameId, connection.username);
    this.cancelGraceTimer(connection.gameId, connection.username);

    const timer = setTimeout(() => {
      this.graceTimers.delete(key);
      this.onGraceExpired?.(connection.gameId, connection.username);
    }, RECONNECT_GRACE_SECONDS * 1000);

    this.graceTimers.set(key, timer);
  }

  usernames(gameId: GameId): Record<string, boolean> {
    const game = this.gameRepository.findById(gameId);
    const playerUsernames = game.toDto().players.map((p) => p.username);

    return Object.fromEntries(
      playerUsernames.map((username) => [
        username,
        this.isConnected({ gameId, username }),
      ]),
    );
  }

  connectedCount(gameId: GameId) {
    return this.playersInGames[gameId]?.size ?? 0;
  }

  connect(connection: UserConnection): GameAndPlayer {
    const tKey = this.tokenKey(connection.gameId, connection.username);
    let isReconnect = false;

    if (this.isReconnecting(connection.gameId, connection.username)) {
      this.cancelGraceTimer(connection.gameId, connection.username);
      isReconnect = true;
    } else if (this.isConnected(connection)) {
      const existingToken = this.sessionTokens.get(tKey);
      if (connection.sessionToken && existingToken === connection.sessionToken) {
        this.deleteConnection(connection);
        isReconnect = true;
      } else {
        throw new Error("User already connected");
      }
    }

    const game = this.gameRepository.findOrCreate(connection.gameId);
    const player = game.findOrAddPlayer({ username: connection.username });

    this.addConnection(connection);

    let token = this.sessionTokens.get(tKey);
    if (!token) {
      token = uuidv4();
      this.sessionTokens.set(tKey, token);
    }

    return { game, player, sessionToken: token, isReconnect };
  }

  leave(connection: UserConnection): IGame {
    const game = this.gameRepository.findById(connection.gameId);
    const player = game.findPlayerByUsername(connection.username);
    game.removePlayer(player.id);

    this.cancelGraceTimer(connection.gameId, connection.username);
    this.deleteConnection(connection);
    this.sessionTokens.delete(this.tokenKey(connection.gameId, connection.username));

    if (this.connectedCount(connection.gameId) === 0) {
      this.gameRepository.destroy(connection.gameId);
    }

    return game;
  }

  disconnect(connection: UserConnection): { game: IGame; gracePeriod: boolean } {
    if (!this.isConnected(connection)) {
      const game = this.gameRepository.findById(connection.gameId);
      return { game, gracePeriod: false };
    }

    const game = this.gameRepository.findById(connection.gameId);
    const player = game.findPlayerByUsername(connection.username);

    if (!game.isStarted()) {
      game.removePlayer(player.id);
      this.deleteConnection(connection);
      this.sessionTokens.delete(this.tokenKey(connection.gameId, connection.username));

      if (this.connectedCount(connection.gameId) === 0) {
        this.gameRepository.destroy(connection.gameId);
      }
      return { game, gracePeriod: false };
    }

    this.deleteConnection(connection);

    if (this.connectedCount(connection.gameId) === 0 && !game.isStarted()) {
      this.gameRepository.destroy(connection.gameId);
      return { game, gracePeriod: false };
    }

    this.startGraceTimer(connection);
    return { game, gracePeriod: true };
  }
}
