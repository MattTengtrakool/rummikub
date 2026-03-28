import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { LP } from "glpk.js/node";
import { isJoker } from "@/app/Card/domain/gamerules/isJoker";
import { cardCombinationPoints } from "@/app/Combination/domain/gamerules/points";
import { MIN_POINTS_TO_START } from "@/app/Player/domain/constants/player";
import {
  findAllCandidateCombinations,
  buildTilePool,
  type TileWithOrigin,
  type CandidateCombination,
} from "./combinationFinder";
import type { SolverResult, SolverCombination } from "./solver";

const EMPTY_RESULT: SolverResult = {
  combinations: [],
  handTilesUsed: 0,
  pointsAdded: 0,
};

const EPSILON = 1e-6;

type GLPKInstance = {
  solve: (lp: LP, options?: { msglev?: number; tmlim?: number }) => {
    result: { status: number; z: number; vars: Record<string, number> };
  };
  GLP_MAX: number;
  GLP_UP: number;
  GLP_FX: number;
  GLP_LO: number;
  GLP_MSG_OFF: number;
  GLP_OPT: number;
};

let glpkInstance: GLPKInstance | null = null;
let glpkLoading: Promise<GLPKInstance> | null = null;

async function getGLPK(): Promise<GLPKInstance> {
  if (glpkInstance) return glpkInstance;
  if (!glpkLoading) {
    glpkLoading = import("glpk.js/node").then(async (mod) => {
      const factory = mod.default;
      const inst = await factory();
      glpkInstance = inst as unknown as GLPKInstance;
      return glpkInstance;
    });
  }
  return glpkLoading;
}

function tileKey(tile: TileWithOrigin): string {
  return `${tile.fromHand ? "h" : "b"}-${tile.originalIndex}`;
}

export type ILPSolverConstraints = {
  hasStarted: boolean;
  includeBoard: boolean;
};

/**
 * ILP-based Rummikub solver.
 *
 * Formulates the tile placement problem as a Mixed Integer Linear Program:
 * - Binary variable x_i for each candidate combination (1 = selected)
 * - Each tile used in at most one combination (hand) or exactly one (board rearrange)
 * - Maximize hand tiles placed, with small epsilon weight for points as tiebreaker
 */
export async function solveILP(
  handCards: ReadonlyArray<CardDto>,
  boardCards: ReadonlyArray<CardDto>,
  constraints: ILPSolverConstraints,
): Promise<SolverResult> {
  const pool = buildTilePool(
    handCards,
    constraints.includeBoard ? boardCards : undefined,
  );

  const candidates = findAllCandidateCombinations(pool);
  if (candidates.length === 0) return EMPTY_RESULT;

  const hasHandTile = (c: CandidateCombination) =>
    c.tiles.some((t) => t.fromHand);

  const relevantCandidates = constraints.includeBoard
    ? candidates
    : candidates.filter(hasHandTile);

  if (relevantCandidates.length === 0) return EMPTY_RESULT;

  const tileToComboIndices = new Map<string, number[]>();
  for (let i = 0; i < relevantCandidates.length; i++) {
    const seen = new Set<string>();
    for (const tile of relevantCandidates[i].tiles) {
      const key = tileKey(tile);
      if (seen.has(key)) continue;
      seen.add(key);
      const list = tileToComboIndices.get(key) ?? [];
      list.push(i);
      tileToComboIndices.set(key, list);
    }
  }

  if (constraints.includeBoard) {
    for (let i = 0; i < boardCards.length; i++) {
      const key = `b-${i}`;
      if (!tileToComboIndices.has(key)) {
        const c = boardCards[i];
        console.log(`[AI-ILP] board tile ${i} (${c.color[0]}${c.number}d${c.duplicata}) has no candidate combos → full rearrangement impossible`);
        return EMPTY_RESULT;
      }
    }
  }

  const objectiveVars: { name: string; coef: number }[] = [];
  const binaries: string[] = [];

  for (let i = 0; i < relevantCandidates.length; i++) {
    const combo = relevantCandidates[i];
    const handCount = combo.tiles.filter((t) => t.fromHand).length;
    const comboDto = { type: combo.type, cards: combo.tiles.map((t) => t.card) };
    const points = cardCombinationPoints(comboDto);

    const coef = handCount + EPSILON * points;
    const varName = `x${i}`;
    objectiveVars.push({ name: varName, coef });
    binaries.push(varName);
  }

  const subjectTo: LP["subjectTo"] = [];
  let constraintIdx = 0;

  for (const [key, comboIndices] of tileToComboIndices) {
    const isBoard = key.startsWith("b-");
    const vars = comboIndices.map((ci) => ({ name: `x${ci}`, coef: 1.0 }));

    if (constraints.includeBoard && isBoard) {
      subjectTo.push({
        name: `t${constraintIdx++}`,
        vars,
        bnds: { type: 5 /* GLP_FX */, ub: 1.0, lb: 1.0 },
      });
    } else {
      subjectTo.push({
        name: `t${constraintIdx++}`,
        vars,
        bnds: { type: 3 /* GLP_UP */, ub: 1.0, lb: 0.0 },
      });
    }
  }

  if (!constraints.hasStarted) {
    const pointsVars: { name: string; coef: number }[] = [];
    for (let i = 0; i < relevantCandidates.length; i++) {
      const combo = relevantCandidates[i];
      if (!combo.tiles.some((t) => t.fromHand)) continue;
      const comboDto = { type: combo.type, cards: combo.tiles.map((t) => t.card) };
      const points = cardCombinationPoints(comboDto);
      if (points > 0) {
        pointsVars.push({ name: `x${i}`, coef: points });
      }
    }
    if (pointsVars.length > 0) {
      subjectTo.push({
        name: `opening`,
        vars: pointsVars,
        bnds: { type: 2 /* GLP_LO */, ub: 0.0, lb: MIN_POINTS_TO_START },
      });
    } else {
      return EMPTY_RESULT;
    }
  }

  const glpk = await getGLPK();

  const lp: LP = {
    name: "rummikub",
    objective: {
      direction: glpk.GLP_MAX,
      name: "obj",
      vars: objectiveVars,
    },
    subjectTo,
    binaries,
  };

  console.log(`[AI-ILP] pool=${pool.length} tiles (hand=${handCards.length}, board=${boardCards.length}), candidates=${relevantCandidates.length}, constraints=${subjectTo.length}, includeBoard=${constraints.includeBoard}`);

  let result;
  try {
    result = glpk.solve(lp, { msglev: glpk.GLP_MSG_OFF, tmlim: 5 });
  } catch (e) {
    console.log(`[AI-ILP] GLPK threw:`, e);
    return EMPTY_RESULT;
  }

  const status = result.result.status;
  console.log(`[AI-ILP] status=${status} (5=OPT,2=FEAS,4=NOFEAS), z=${result.result.z}`);
  if (status !== 5 /* GLP_OPT */ && status !== 2 /* GLP_FEAS */) {
    console.log(`[AI-ILP] No feasible solution`);
    return EMPTY_RESULT;
  }

  const selectedCombos: SolverCombination[] = [];
  let totalHandTiles = 0;
  let totalPoints = 0;

  for (let i = 0; i < relevantCandidates.length; i++) {
    const val = result.result.vars[`x${i}`] ?? 0;
    if (val < 0.5) continue;

    const combo = relevantCandidates[i];
    const handIndices: number[] = [];
    const boardIndices: number[] = [];

    for (const tile of combo.tiles) {
      if (tile.fromHand) {
        handIndices.push(tile.originalIndex);
      } else {
        boardIndices.push(tile.originalIndex);
      }
    }

    const cardDesc = combo.tiles.map((t) => {
      const c = t.card;
      const src = t.fromHand ? "H" : "B";
      return `${src}:${c.color[0]}${c.number}`;
    }).join(",");
    console.log(`[AI-ILP]   combo ${combo.type}: [${cardDesc}] hand=${handIndices.length} board=${boardIndices.length}`);

    if (handIndices.length > 0) {
      const comboDto = { type: combo.type, cards: combo.tiles.map((t) => t.card) };
      totalPoints += cardCombinationPoints(comboDto);
    }

    totalHandTiles += handIndices.length;

    selectedCombos.push({
      cards: combo.tiles.map((t) => t.card),
      type: combo.type,
      handTileIndices: handIndices,
      boardTileIndices: boardIndices,
    });
  }

  console.log(`[AI-ILP] result: ${selectedCombos.length} combos, ${totalHandTiles} hand tiles, ${totalPoints} pts`);

  if (totalHandTiles === 0) return EMPTY_RESULT;

  if (constraints.includeBoard) {
    const coveredBoardIndices = new Set<number>();
    for (const combo of selectedCombos) {
      for (const idx of combo.boardTileIndices) {
        coveredBoardIndices.add(idx);
      }
    }
    if (coveredBoardIndices.size < boardCards.length) {
      console.log(`[AI-ILP] only ${coveredBoardIndices.size}/${boardCards.length} board tiles covered → orphans would remain, rejecting`);
      return EMPTY_RESULT;
    }
  }

  if (!constraints.hasStarted && totalPoints < MIN_POINTS_TO_START) {
    return EMPTY_RESULT;
  }

  return {
    combinations: selectedCombos,
    handTilesUsed: totalHandTiles,
    pointsAdded: totalPoints,
  };
}
