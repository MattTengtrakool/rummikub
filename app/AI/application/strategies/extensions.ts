import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { BoardPosition, PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AIMove } from "@/app/AI/domain/types";
import { isJoker } from "@/app/Card/domain/gamerules/isJoker";
import { isValidCardSuite } from "@/app/Combination/domain/gamerules/isValidCardSuite";
import { isValidCardSerie } from "@/app/Combination/domain/gamerules/isValidCardSerie";
import { cardCombinationPoints } from "@/app/Combination/domain/gamerules/points";
import {
  detectCombinations,
} from "@/app/GameBoard/domain/gamerules/detectCombinations";

const ADJACENCY_THRESHOLD = 1.15;
const ROW_TOLERANCE = 0.5;

type Extension = {
  handIndex: number;
  card: CardDto;
  position: BoardPosition;
  points: number;
};

/**
 * Check if placing at `pos` would accidentally merge with a tile from
 * a different combination (i.e. a non-combo-member tile is adjacent).
 */
function wouldMergeWithNeighbor(
  pos: BoardPosition,
  comboTiles: ReadonlyArray<PlacedTileDto>,
  allTiles: ReadonlyArray<PlacedTileDto>,
): boolean {
  const comboKeys = new Set(
    comboTiles.map((t) => `${Math.round(t.x)},${Math.round(t.y)}`),
  );

  const sameRow = allTiles.filter(
    (t) => Math.abs(t.y - pos.y) < ROW_TOLERANCE,
  );

  for (const t of sameRow) {
    if (comboKeys.has(`${Math.round(t.x)},${Math.round(t.y)}`)) continue;
    if (Math.abs(t.x - pos.x) <= ADJACENCY_THRESHOLD) return true;
  }

  return false;
}

function findExtensionCandidates(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
): Extension[] {
  const extensions: Extension[] = [];
  const combinations = detectCombinations(boardTiles);

  for (const combo of combinations) {
    if (combo.type === "invalid") continue;

    const sortedTiles = [...combo.tiles].sort((a, b) => a.x - b.x);
    const cards = sortedTiles.map((t) => t.card);

    if (combo.type === "suite" && cards.length < 13) {
      const nonJokerCards = cards.filter((c) => !isJoker(c));
      if (nonJokerCards.length === 0) continue;
      const color = nonJokerCards[0].color;

      const firstNonJokerIdx = cards.findIndex((c) => !isJoker(c));
      const inferredStart = nonJokerCards[0].number - firstNonJokerIdx;
      const inferredEnd = inferredStart + cards.length - 1;

      const leftPos: BoardPosition = { x: sortedTiles[0].x - 1, y: sortedTiles[0].y };
      const rightPos: BoardPosition = { x: sortedTiles[sortedTiles.length - 1].x + 1, y: sortedTiles[sortedTiles.length - 1].y };

      if (inferredStart > 1) {
        const neededNum = inferredStart - 1;
        const canPlaceLeft = !wouldMergeWithNeighbor(leftPos, combo.tiles, boardTiles);

        if (canPlaceLeft) {
          for (let i = 0; i < handCards.length; i++) {
            const card = handCards[i];
            if (
              (!isJoker(card) && card.color === color && card.number === neededNum) ||
              isJoker(card)
            ) {
              const extended = [card, ...cards];
              if (isValidCardSuite(extended)) {
                const pts = cardCombinationPoints({ type: "suite", cards: extended }) -
                  cardCombinationPoints({ type: "suite", cards });
                extensions.push({ handIndex: i, card, position: leftPos, points: pts });
              }
            }
          }
        }
      }

      if (inferredEnd < 13) {
        const neededNum = inferredEnd + 1;
        const canPlaceRight = !wouldMergeWithNeighbor(rightPos, combo.tiles, boardTiles);

        if (canPlaceRight) {
          for (let i = 0; i < handCards.length; i++) {
            const card = handCards[i];
            if (
              (!isJoker(card) && card.color === color && card.number === neededNum) ||
              isJoker(card)
            ) {
              const extended = [...cards, card];
              if (isValidCardSuite(extended)) {
                const pts = cardCombinationPoints({ type: "suite", cards: extended }) -
                  cardCombinationPoints({ type: "suite", cards });
                extensions.push({ handIndex: i, card, position: rightPos, points: pts });
              }
            }
          }
        }
      }
    }

    if (combo.type === "serie" && cards.length < 4) {
      const nonJokerColors = new Set(
        cards.filter((c) => !isJoker(c)).map((c) => c.color),
      );
      const number = cards.find((c) => !isJoker(c))?.number;
      if (number === undefined) continue;

      const rightPos: BoardPosition = { x: sortedTiles[sortedTiles.length - 1].x + 1, y: sortedTiles[0].y };
      const canPlaceRight = !wouldMergeWithNeighbor(rightPos, combo.tiles, boardTiles);

      if (!canPlaceRight) continue;

      for (let i = 0; i < handCards.length; i++) {
        const card = handCards[i];
        if (isJoker(card)) {
          const extended = [...cards, card];
          if (isValidCardSerie(extended)) {
            const pts = cardCombinationPoints({ type: "serie", cards: extended }) -
              cardCombinationPoints({ type: "serie", cards });
            extensions.push({ handIndex: i, card, position: rightPos, points: pts });
          }
        } else if (card.number === number && !nonJokerColors.has(card.color)) {
          const extended = [...cards, card];
          if (isValidCardSerie(extended)) {
            const pts = cardCombinationPoints({ type: "serie", cards: extended }) -
              cardCombinationPoints({ type: "serie", cards });
            extensions.push({ handIndex: i, card, position: rightPos, points: pts });
          }
        }
      }
    }
  }

  return extensions;
}

/**
 * Find extensions to existing board combinations and return them as moves.
 * Excludes hand indices already used by a prior solver pass.
 * Prevents placing two tiles at the same position (double-extending).
 */
export function findExtensions(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  excludeHandIndices: Set<number> = new Set(),
): { moves: AIMove[] } {
  const candidates = findExtensionCandidates(handCards, boardTiles);
  const usedIndices = new Set(excludeHandIndices);
  const usedPositions = new Set<string>();
  const moves: AIMove[] = [];

  const posKey = (p: BoardPosition) => `${p.x},${p.y}`;

  const sorted = candidates
    .filter((ext) => !usedIndices.has(ext.handIndex))
    .sort((a, b) => b.points - a.points);

  for (const ext of sorted) {
    if (usedIndices.has(ext.handIndex)) continue;
    if (usedPositions.has(posKey(ext.position))) continue;

    const adjustedIndex = ext.handIndex -
      [...usedIndices].filter((i) => i < ext.handIndex).length;

    console.log(`[AI-EXT] extend: ${ext.card.color[0]}${ext.card.number} handIdx=${ext.handIndex}(adj=${adjustedIndex}) → (${ext.position.x},${ext.position.y}) pts=${ext.points}`);
    moves.push({
      type: "placeCard",
      cardIndex: adjustedIndex,
      position: ext.position,
    });
    usedIndices.add(ext.handIndex);
    usedPositions.add(posKey(ext.position));
  }

  if (moves.length > 0) {
    console.log(`[AI-EXT] total extensions: ${moves.length}`);
  }
  return { moves };
}
