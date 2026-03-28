import type { CardDto, CardColor } from "@/app/Card/domain/dtos/card";
import { CARD_COLORS, CARD_NUMBERS } from "@/app/Card/domain/constants/card";
import { isJoker } from "@/app/Card/domain/gamerules/isJoker";
import { isValidCardSuite } from "@/app/Combination/domain/gamerules/isValidCardSuite";
import { isValidCardSerie } from "@/app/Combination/domain/gamerules/isValidCardSerie";

export type TileWithOrigin = {
  card: CardDto;
  fromHand: boolean;
  originalIndex: number;
};

export type CandidateCombination = {
  tiles: TileWithOrigin[];
  type: "suite" | "serie";
};

function cardKey(card: CardDto): string {
  return `${card.color}-${card.number}-${card.duplicata}`;
}

function buildAvailabilityMap(tiles: TileWithOrigin[]): Map<string, TileWithOrigin[]> {
  const map = new Map<string, TileWithOrigin[]>();
  for (const tile of tiles) {
    const key = cardKey(tile.card);
    const existing = map.get(key) ?? [];
    existing.push(tile);
    map.set(key, existing);
  }
  return map;
}

/**
 * Find all valid suites (runs) from the available tiles.
 * A suite is 3-13 cards of the same color with consecutive numbers.
 */
function findSuites(tiles: TileWithOrigin[]): CandidateCombination[] {
  const results: CandidateCombination[] = [];
  const jokers = tiles.filter((t) => isJoker(t.card));

  for (const color of CARD_COLORS) {
    const colorTiles = tiles.filter(
      (t) => !isJoker(t.card) && t.card.color === color,
    );

    const byNumber = new Map<number, TileWithOrigin[]>();
    for (const tile of colorTiles) {
      const existing = byNumber.get(tile.card.number) ?? [];
      existing.push(tile);
      byNumber.set(tile.card.number, existing);
    }

    for (let start = 1; start <= 11; start++) {
      for (let end = start + 2; end <= 13; end++) {
        const combo: TileWithOrigin[] = [];
        let jokersUsed = 0;
        let valid = true;

        for (let num = start; num <= end; num++) {
          const available = byNumber.get(num);
          if (available && available.length > 0) {
            const tile = available.find(
              (t) => !combo.some((c) => c === t),
            );
            if (tile) {
              combo.push(tile);
              continue;
            }
          }
          if (jokersUsed < jokers.length) {
            combo.push(jokers[jokersUsed]);
            jokersUsed++;
          } else {
            valid = false;
            break;
          }
        }

        if (valid && combo.length >= 3) {
          const cards = combo.map((t) => t.card);
          if (isValidCardSuite(cards)) {
            results.push({ tiles: [...combo], type: "suite" });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Find all valid series (groups) from the available tiles.
 * A serie is 3-4 cards of the same number with different colors.
 */
function findSeries(tiles: TileWithOrigin[]): CandidateCombination[] {
  const results: CandidateCombination[] = [];
  const jokers = tiles.filter((t) => isJoker(t.card));

  for (const number of CARD_NUMBERS) {
    const numberTiles: TileWithOrigin[] = [];
    const usedColors = new Set<CardColor>();

    for (const tile of tiles) {
      if (!isJoker(tile.card) && tile.card.number === number) {
        if (!usedColors.has(tile.card.color)) {
          numberTiles.push(tile);
          usedColors.add(tile.card.color);
        }
      }
    }

    const generateSubsets = (
      arr: TileWithOrigin[],
      minSize: number,
      maxSize: number,
    ): TileWithOrigin[][] => {
      const subsets: TileWithOrigin[][] = [];
      const n = arr.length;
      for (let mask = 0; mask < (1 << n); mask++) {
        const subset: TileWithOrigin[] = [];
        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) subset.push(arr[i]);
        }
        if (subset.length >= minSize && subset.length <= maxSize) {
          subsets.push(subset);
        }
      }
      return subsets;
    };

    const subsets = generateSubsets(numberTiles, 1, 4);

    for (const subset of subsets) {
      for (let jokerCount = 0; jokerCount <= Math.min(jokers.length, 4 - subset.length); jokerCount++) {
        const combo = [...subset, ...jokers.slice(0, jokerCount)];
        if (combo.length >= 3 && combo.length <= 4) {
          const cards = combo.map((t) => t.card);
          if (isValidCardSerie(cards)) {
            results.push({ tiles: [...combo], type: "serie" });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Find all valid candidate combinations from the given tiles.
 */
export function findAllCandidateCombinations(
  tiles: TileWithOrigin[],
): CandidateCombination[] {
  return [...findSuites(tiles), ...findSeries(tiles)];
}

/**
 * Build TileWithOrigin arrays from hand cards and board cards.
 */
export function buildTilePool(
  handCards: ReadonlyArray<CardDto>,
  boardCards?: ReadonlyArray<CardDto>,
): TileWithOrigin[] {
  const tiles: TileWithOrigin[] = handCards.map((card, index) => ({
    card,
    fromHand: true,
    originalIndex: index,
  }));

  if (boardCards) {
    boardCards.forEach((card, index) => {
      tiles.push({
        card,
        fromHand: false,
        originalIndex: index,
      });
    });
  }

  return tiles;
}
