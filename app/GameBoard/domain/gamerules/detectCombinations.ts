import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { CombinationType } from "@/app/Combination/domain/dtos/combination";
import { isValidCardSerie } from "@/app/Combination/domain/gamerules/isValidCardSerie";
import { isValidCardSuite } from "@/app/Combination/domain/gamerules/isValidCardSuite";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";

const Y_TOLERANCE = 0.4;
const X_GAP_TOLERANCE = 1.15;

export type DetectedCombination = {
  type: CombinationType;
  tiles: PlacedTileDto[];
};

function classifyCards(cards: ReadonlyArray<CardDto>): CombinationType {
  if (isValidCardSuite(cards)) return "suite";
  if (isValidCardSerie(cards)) return "serie";
  return "invalid";
}

export function detectCombinations(
  tiles: ReadonlyArray<PlacedTileDto>,
): DetectedCombination[] {
  if (tiles.length === 0) return [];

  const sorted = [...tiles].sort((a, b) => a.y - b.y);

  const rows: PlacedTileDto[][] = [];
  let currentRow: PlacedTileDto[] = [sorted[0]];
  let rowY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const tile = sorted[i];
    if (Math.abs(tile.y - rowY) <= Y_TOLERANCE) {
      currentRow.push(tile);
    } else {
      rows.push(currentRow);
      currentRow = [tile];
      rowY = tile.y;
    }
  }
  rows.push(currentRow);

  const combinations: DetectedCombination[] = [];

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);

    let run: PlacedTileDto[] = [row[0]];

    for (let i = 1; i < row.length; i++) {
      const gap = row[i].x - row[i - 1].x;
      if (gap <= X_GAP_TOLERANCE) {
        run.push(row[i]);
      } else {
        combinations.push({
          type: classifyCards(run.map((t) => t.card)),
          tiles: run,
        });
        run = [row[i]];
      }
    }
    combinations.push({
      type: classifyCards(run.map((t) => t.card)),
      tiles: run,
    });
  }

  return combinations;
}
