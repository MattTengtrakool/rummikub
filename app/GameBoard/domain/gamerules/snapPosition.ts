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
 * When dropping on an occupied position in a row, shift tiles to the right
 * to open a slot. Mutates the array in-place.
 * Returns true if tiles were shifted.
 *
 * Shifts ALL tiles in the same row at position >= target.x (not just the
 * contiguous chain). This preserves gaps between groups — only shifting the
 * contiguous chain could close a gap and merge two unrelated groups into a
 * single invalid combination on a crowded board.
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

  const toShift = sameRow.filter(
    (t) => t.x >= tx - COLLISION_THRESHOLD,
  );

  for (const tile of toShift) {
    tile.x = Math.round(tile.x) + 1;
  }

  return toShift.length > 0;
}
