import type { BoardPosition, PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";

const COLLISION_THRESHOLD = 0.5;

export function snapPosition(
  drop: BoardPosition,
  existingTiles: ReadonlyArray<PlacedTileDto>,
): BoardPosition {
  return { x: Math.round(drop.x), y: Math.round(drop.y) };
}

export function hasCollision(
  position: BoardPosition,
  existingTiles: ReadonlyArray<PlacedTileDto>,
): boolean {
  return existingTiles.some(
    (t) =>
      Math.abs(t.x - position.x) < COLLISION_THRESHOLD &&
      Math.abs(t.y - position.y) < COLLISION_THRESHOLD,
  );
}

/**
 * When dropping on an occupied position in a row, shift the contiguous chain
 * of tiles to the right to open a slot. Mutates the array in-place.
 * Returns true if tiles were shifted.
 */
export function shiftTilesForInsertion(
  target: BoardPosition,
  tiles: PlacedTileDto[],
): boolean {
  const tx = Math.round(target.x);

  const sameRow = tiles.filter(
    (t) => Math.abs(t.y - target.y) < COLLISION_THRESHOLD,
  );

  if (!sameRow.some((t) => Math.abs(t.x - tx) < COLLISION_THRESHOLD)) {
    return false;
  }

  const rightChain: PlacedTileDto[] = [];
  let cx = tx;
  while (true) {
    const tile = sameRow.find(
      (t) => Math.abs(t.x - cx) < COLLISION_THRESHOLD,
    );
    if (tile) {
      rightChain.push(tile);
      cx++;
    } else {
      break;
    }
  }

  if (rightChain.length > 0) {
    for (const tile of rightChain) {
      tile.x = Math.round(tile.x) + 1;
    }
    return true;
  }

  return false;
}
