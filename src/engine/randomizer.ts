import { CAR_BY_ID, CAR_CATALOG } from '../data/cars';
import { TRACK_CATALOG } from '../data/tracks';
import {
  CarSpec,
  DifficultyLevel,
  PlayerCar,
  RaceRoundSetup,
  RaceScenario,
  SurfaceType,
  Track,
  TuningLevels,
} from '../types/game';

export interface DifficultyConfig {
  level: DifficultyLevel;
  labelSk: string;
  description: string;
  rqOffsetMin: number;
  rqOffsetMax: number;
  aiUpgradeBudget: number;
  aiSmartAssign: number; // 0 = poor/random, 1 = optimal specialist
  extremeSurfaceChance: number;
  cashMultiplier: number;
  bonusPackChance: number;
  bonusPackId?: string;
}

export const DIFFICULTY_CONFIGS: DifficultyConfig[] = [
  {
    level: 'Peaceful',
    labelSk: 'Pokojná',
    description: 'Slabšie autá s nižším RQ a taktickými chybami súpera. Minimum extrémneho počasia.',
    rqOffsetMin: -12,
    rqOffsetMax: -4,
    aiUpgradeBudget: 0,
    aiSmartAssign: 0.15,
    extremeSurfaceChance: 0.1,
    cashMultiplier: 0.75,
    bonusPackChance: 0,
  },
  {
    level: 'Easy',
    labelSk: 'Ľahká',
    description: 'Približne rovnaké RQ ako tvoja garáž, zväčša sériové autá a občasný dážď či štrk.',
    rqOffsetMin: -6,
    rqOffsetMax: 2,
    aiUpgradeBudget: 1,
    aiSmartAssign: 0.4,
    extremeSurfaceChance: 0.25,
    cashMultiplier: 1.0,
    bonusPackChance: 0.1,
    bonusPackId: 'plastics',
  },
  {
    level: 'Medium',
    labelSk: 'Stredná',
    description: 'Vyrovnané RQ, rozumné priradenie áut na trate a pestrý mix povrchov.',
    rqOffsetMin: -2,
    rqOffsetMax: 6,
    aiUpgradeBudget: 2,
    aiSmartAssign: 0.72,
    extremeSurfaceChance: 0.45,
    cashMultiplier: 1.35,
    bonusPackChance: 0.25,
    bonusPackId: 'steel',
  },
  {
    level: 'Extreme',
    labelSk: 'Extrémna',
    description: 'Silnejší výber áut, cielené nasadenie špecialistov a častý sneh či blato.',
    rqOffsetMin: 3,
    rqOffsetMax: 12,
    aiUpgradeBudget: 3,
    aiSmartAssign: 0.9,
    extremeSurfaceChance: 0.68,
    cashMultiplier: 1.85,
    bonusPackChance: 0.45,
    bonusPackId: 'aluminum',
  },
  {
    level: 'Impossible',
    labelSk: 'Nemožná',
    description: 'Špičkoví súperi s občasným silnejším tuningom na ľade, snehu aj dlhých rovinkách.',
    rqOffsetMin: 8,
    rqOffsetMax: 20,
    aiUpgradeBudget: 4,
    aiSmartAssign: 1.0,
    extremeSurfaceChance: 0.85,
    cashMultiplier: 2.6,
    bonusPackChance: 0.65,
    bonusPackId: 'ceramic',
  },
];

function scoreCarSuitability(car: CarSpec, track: Track): number {
  let score = car.rq;

  // Surface compatibility
  if (track.surface === 'Ice' || track.surface === 'Snow' || track.surface === 'Mud') {
    if (car.tyreType === 'Slick') score -= 120;
    if (car.tyreType === 'Off-Road') score += 45;
    if (car.tyreType === 'All-Surface') score += 32;
    if (car.tyreType === 'Performance') score -= 25;
    if (car.driveType === '4WD') score += 28;
  } else if (track.surface === 'Gravel') {
    if (car.tyreType === 'Off-Road' || car.tyreType === 'All-Surface') score += 28;
    if (car.tyreType === 'Slick') score -= 60;
    if (car.driveType === '4WD') score += 16;
  } else if (track.surface === 'Wet Asphalt') {
    if (car.tyreType === 'Standard') score += 18;
    if (car.tyreType === 'Slick') score -= 50;
    if (car.driveType === '4WD') score += 14;
  } else {
    if (car.tyreType === 'Slick') score += 18;
    if (car.tyreType === 'Performance') score += 12;
  }

  // Track category affinity
  if (track.category === 'Drag') {
    score += car.topSpeedMph * 0.2 + car.mra * 0.35 - car.accel0to60 * 3;
  } else if (track.category === 'Twisty') {
    score += car.handling * 0.8 - (car.weightLbs / 1000) * 5;
  }
  if (track.hasSpeedBumps && car.groundClearance === 'Low') {
    score -= 22;
  }

  return score;
}

function distributeTuning(budget: number, track: Track): TuningLevels {
  if (budget <= 0) return { engineLvl: 0, weightLvl: 0, chassisLvl: 0 };
  let e = 0;
  let w = 0;
  let c = 0;
  let rem = Math.min(24, budget);

  // Assign according to track type
  while (rem > 0) {
    if (track.category === 'Drag') {
      if (e < 9) { e++; rem--; continue; }
      if (w < 9) { w++; rem--; continue; }
      if (c < 9) { c++; rem--; continue; }
    } else if (track.category === 'Twisty') {
      if (c < 9) { c++; rem--; continue; }
      if (w < 9) { w++; rem--; continue; }
      if (e < 9) { e++; rem--; continue; }
    } else {
      if (e < 8 && e <= c && e <= w) { e++; rem--; continue; }
      if (c < 8 && c <= w) { c++; rem--; continue; }
      if (w < 8) { w++; rem--; continue; }
      if (e < 9) { e++; rem--; continue; }
    }
    break;
  }
  return { engineLvl: e, weightLvl: w, chassisLvl: c };
}

function rollRandomOpponentUpgradeBudget(difficulty: DifficultyLevel): number {
  const r = Math.random();
  // Global strict probabilities:
  // <= 2% fully maxed (24/24)
  // ~13% heavy upgrade (>3..23 upgrades) -> combined >3 upgrades <= 15%
  // ~85% stock (0) or light 1-3 upgrades
  if (r < 0.02) return 24;
  if (r < 0.15) {
    if (difficulty === 'Peaceful') return 4 + Math.floor(Math.random() * 4);
    if (difficulty === 'Easy') return 4 + Math.floor(Math.random() * 6);
    if (difficulty === 'Medium') return 5 + Math.floor(Math.random() * 9);
    if (difficulty === 'Extreme') return 6 + Math.floor(Math.random() * 14);
    return 9 + Math.floor(Math.random() * 14);
  }
  // 85% bucket: mostly stock on Peaceful/Easy, light 1-3 upgrades otherwise
  const stockChance =
    difficulty === 'Peaceful'
      ? 0.72
      : difficulty === 'Easy'
      ? 0.56
      : difficulty === 'Medium'
      ? 0.44
      : 0.34;
  if (Math.random() < stockChance) return 0;
  return 1 + Math.floor(Math.random() * 3); // 1, 2, or 3 upgrades
}

export function generateRandomRaceScenario(
  difficulty: DifficultyLevel,
  garage: PlayerCar[],
  playerRqLimit = 175
): RaceScenario {
  const cfg = DIFFICULTY_CONFIGS.find((d) => d.level === difficulty) ?? DIFFICULTY_CONFIGS[2];

  const rqLimit = Math.max(125, Math.min(500, playerRqLimit));
  const maxAvgForLimit = Math.floor(rqLimit / 5);

  // Compute player's top-5 average RQ capped cleanly under player's current RQ Limit
  const sortedRqs = garage
    .map((g) => CAR_BY_ID[g.carId]?.rq ?? 20)
    .sort((a, b) => b - a);
  const top5 = sortedRqs.slice(0, 5);
  const avgTopRq = top5.length > 0 ? top5.reduce((s, v) => s + v, 0) / top5.length : 25;
  const effectiveAvgRq = Math.min(avgTopRq, maxAvgForLimit);

  // 1. Select 5 distinct track archetypes with difficulty-driven surface selection
  const extremeSurfaces: SurfaceType[] = ['Snow', 'Ice', 'Mud', 'Gravel'];
  const mildSurfaces: SurfaceType[] = ['Dry Asphalt', 'Wet Asphalt'];

  const usedArchetypes = new Set<string>();
  const chosenTracks: Track[] = [];

  for (let i = 0; i < 5; i++) {
    const wantExtreme = Math.random() < cfg.extremeSurfaceChance;
    const pool = TRACK_CATALOG.filter(
      (t) =>
        !usedArchetypes.has(t.archetype) &&
        (wantExtreme ? extremeSurfaces.includes(t.surface) : mildSurfaces.includes(t.surface))
    );
    const fallbackPool = TRACK_CATALOG.filter((t) => !usedArchetypes.has(t.archetype));
    const candidates = pool.length > 0 ? pool : fallbackPool;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    usedArchetypes.add(picked.archetype);
    chosenTracks.push(picked);
  }

  // 2. Select 5 opponent cars within fair RQ window bounded by player's RQ ceiling
  const minTargetRq = Math.max(10, Math.round(effectiveAvgRq + cfg.rqOffsetMin));
  const rawMaxTarget = Math.round(effectiveAvgRq + cfg.rqOffsetMax);
  const hardCeilingRq = Math.min(100, maxAvgForLimit + (difficulty === 'Impossible' ? 14 : difficulty === 'Extreme' ? 8 : 4));
  const maxTargetRq = Math.min(
    hardCeilingRq,
    Math.max(minTargetRq + 6, rawMaxTarget)
  );

  const candidateCars = CAR_CATALOG.filter(
    (c) => c.rq >= minTargetRq && c.rq <= maxTargetRq
  );
  const fallbackUnderCeiling = CAR_CATALOG.filter((c) => c.rq <= maxTargetRq + 4);
  const poolCars =
    candidateCars.length >= 5
      ? candidateCars
      : fallbackUnderCeiling.length >= 5
      ? fallbackUnderCeiling
      : CAR_CATALOG;

  const pickedAiCars: CarSpec[] = [];
  const usedIds = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const track = chosenTracks[i];
    const available = poolCars.filter((c) => !usedIds.has(c.id));
    const source = available.length > 0 ? available : poolCars;

    // Sort by track suitability
    const ranked = [...source].sort(
      (a, b) => scoreCarSuitability(b, track) - scoreCarSuitability(a, track)
    );

    let chosen: CarSpec;
    if (Math.random() < cfg.aiSmartAssign) {
      const topSlice = ranked.slice(0, Math.min(4, ranked.length));
      chosen = topSlice[Math.floor(Math.random() * topSlice.length)];
    } else {
      // Tactical mistake on lower difficulties: pick from middle/bottom
      const lowSlice = ranked.slice(Math.floor(ranked.length * 0.4));
      chosen = lowSlice[Math.floor(Math.random() * lowSlice.length)] ?? ranked[0];
    }

    usedIds.add(chosen.id);
    pickedAiCars.push(chosen);
  }

  const rounds: RaceRoundSetup[] = chosenTracks.map((track, idx) => ({
    roundNumber: idx + 1,
    trackId: track.id,
    aiCarId: pickedAiCars[idx].id,
    aiTuning: distributeTuning(rollRandomOpponentUpgradeBudget(difficulty), track),
  }));

  const cashRewardBase = Math.round((2400 + effectiveAvgRq * 65) * cfg.cashMultiplier);
  const bonusPackId =
    cfg.bonusPackId && Math.random() < cfg.bonusPackChance ? cfg.bonusPackId : undefined;

  return {
    id: `rnd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    mode: 'random_race',
    title: `Náhodný závod · ${cfg.labelSk}`,
    subtitle: `${cfg.level} obtiažnosť · 5 náhodných tratí · Limit ${rqLimit} RQ`,
    sourceId: difficulty,
    difficulty,
    rqLimit,
    cashRewardBase,
    bonusPackId,
    rounds,
  };
}
