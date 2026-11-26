import { CAR_BY_ID } from '../data/cars';
import { MatchSimulationResult, PlayerCar } from '../types/game';

export const BASE_RQ_LIMIT = 175;
export const RQ_PER_LEVEL = 15;
export const MAX_RQ_LIMIT = 500;

export function xpRequiredForLevel(level: number): number {
  return 100 + Math.max(0, level - 1) * 45;
}

export function rqLimitForLevel(level: number): number {
  return Math.min(MAX_RQ_LIMIT, BASE_RQ_LIMIT + Math.max(0, level - 1) * RQ_PER_LEVEL);
}

export interface LevelProgressInfo {
  level: number;
  rqLimit: number;
  nextLevelRqLimit: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
  isMaxRq: boolean;
}

export function getLevelProgress(totalXp: number): LevelProgressInfo {
  let xpLeft = Math.max(0, Math.floor(totalXp));
  let level = 1;

  while (level < 60) {
    const needed = xpRequiredForLevel(level);
    if (xpLeft < needed) {
      const rqLimit = rqLimitForLevel(level);
      const nextLevelRqLimit = rqLimitForLevel(level + 1);
      return {
        level,
        rqLimit,
        nextLevelRqLimit,
        currentLevelXp: xpLeft,
        nextLevelXp: needed,
        progressPct: Math.min(100, Math.round((xpLeft / needed) * 100)),
        isMaxRq: rqLimit >= MAX_RQ_LIMIT,
      };
    }
    xpLeft -= needed;
    level++;
  }

  return {
    level,
    rqLimit: MAX_RQ_LIMIT,
    nextLevelRqLimit: MAX_RQ_LIMIT,
    currentLevelXp: xpLeft,
    nextLevelXp: xpRequiredForLevel(level),
    progressPct: 100,
    isMaxRq: true,
  };
}

export function computeMatchXp(result: MatchSimulationResult): number {
  const roundWins = result.rounds.filter((r) => r.winner === 'player').length;
  if (result.playerWon) {
    const scoreMargin = Math.max(0, result.playerTotalScore - result.aiTotalScore);
    const marginBonus = Math.min(45, Math.round(scoreMargin / 25));
    return 80 + roundWins * 8 + marginBonus;
  }
  return 35 + roundWins * 6;
}

/**
 * Computes a realistic best-fitting 5-car deck RQ sum under the player's current RQ limit
 * so menus can display e.g. "145 / 175 RQ".
 */
export function computeDeckRqSample(garage: PlayerCar[], rqLimit: number): number {
  const rqs = garage
    .map((g) => CAR_BY_ID[g.carId]?.rq ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => b - a);
  if (rqs.length === 0) return 0;

  // Greedy pick up to 5 highest cards that still leave room for remaining slots
  const picked: number[] = [];
  const pool = [...rqs];
  let running = 0;

  for (let slot = 0; slot < Math.min(5, rqs.length); slot++) {
    const slotsAfter = Math.min(5, rqs.length) - 1 - slot;
    const cheapestPool = [...pool].sort((a, b) => a - b);
    const reserve = cheapestPool.slice(0, slotsAfter).reduce((s, v) => s + v, 0);
    const maxAllowed = rqLimit - running - reserve;
    const idx = pool.findIndex((v) => v <= maxAllowed);
    if (idx !== -1) {
      running += pool[idx];
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    } else if (cheapestPool.length > 0) {
      const low = cheapestPool[0];
      running += low;
      picked.push(low);
      const rm = pool.indexOf(low);
      if (rm !== -1) pool.splice(rm, 1);
    }
  }
  return running;
}
