import { CAR_BY_ID, computeEffectiveCarStats } from '../data/cars';
import { TRACK_BY_ID } from '../data/tracks';
import {
  CarSpec,
  DriveType,
  EffectiveCarStats,
  MatchSimulationResult,
  PlayerCar,
  ProgressSample,
  RaceScenario,
  RoundSimulationResult,
  SectorKind,
  SectorResult,
  SurfaceType,
  Track,
  TuningLevels,
  TyreType,
} from '../types/game';
import { computeMatchXp } from './progression';

const TYRE_SURFACE_MATRIX: Record<TyreType, Record<SurfaceType, number>> = {
  Slick: {
    'Dry Asphalt': 1.08,
    'Wet Asphalt': 0.56,
    Gravel: 0.44,
    Mud: 0.25,
    Snow: 0.2,
    Ice: 0.14,
  },
  Performance: {
    'Dry Asphalt': 1.0,
    'Wet Asphalt': 0.78,
    Gravel: 0.62,
    Mud: 0.41,
    Snow: 0.36,
    Ice: 0.28,
  },
  Standard: {
    'Dry Asphalt': 0.94,
    'Wet Asphalt': 0.91,
    Gravel: 0.72,
    Mud: 0.52,
    Snow: 0.52,
    Ice: 0.42,
  },
  'All-Surface': {
    'Dry Asphalt': 0.9,
    'Wet Asphalt': 0.87,
    Gravel: 0.94,
    Mud: 0.84,
    Snow: 0.82,
    Ice: 0.68,
  },
  'Off-Road': {
    'Dry Asphalt': 0.82,
    'Wet Asphalt': 0.8,
    Gravel: 1.0,
    Mud: 1.02,
    Snow: 0.98,
    Ice: 0.84,
  },
};

const DRIVE_SURFACE_MOD: Record<DriveType, Record<SurfaceType, number>> = {
  FWD: {
    'Dry Asphalt': 0.985,
    'Wet Asphalt': 0.98,
    Gravel: 0.93,
    Mud: 0.86,
    Snow: 0.89,
    Ice: 0.84,
  },
  RWD: {
    'Dry Asphalt': 1.0,
    'Wet Asphalt': 0.94,
    Gravel: 0.9,
    Mud: 0.81,
    Snow: 0.8,
    Ice: 0.74,
  },
  '4WD': {
    'Dry Asphalt': 1.01,
    'Wet Asphalt': 1.03,
    Gravel: 1.05,
    Mud: 1.07,
    Snow: 1.07,
    Ice: 1.05,
  },
};

function checkDnf(
  car: CarSpec,
  track: Track
): { dnf: boolean; reason?: string; progress: number } {
  const surface = track.surface;

  if (car.tyreType === 'Slick') {
    if (surface === 'Ice') {
      return { dnf: true, reason: 'Slick pneumatiky stratili priľnavosť na ľade', progress: 0.24 };
    }
    if (surface === 'Snow') {
      return { dnf: true, reason: 'Slick pneumatiky uviazli v snehu', progress: 0.31 };
    }
    if (surface === 'Mud') {
      return { dnf: true, reason: 'Slick pneumatiky zapadli v blate', progress: 0.28 };
    }
    if (track.isSteepClimb && surface === 'Gravel') {
      return { dnf: true, reason: 'Slick pneumatiky nezvládli štrkové stúpanie', progress: 0.42 };
    }
  }

  if (track.isSteepClimb) {
    if (car.driveType === 'FWD' && car.groundClearance !== 'High') {
      return {
        dnf: true,
        reason: 'Predný pohon (FWD) s nízkym/stredným podvozkom nevyšiel strmý kopec',
        progress: 0.44,
      };
    }
    if (
      (surface === 'Snow' || surface === 'Ice' || surface === 'Mud') &&
      car.tyreType === 'Performance' &&
      car.driveType !== '4WD'
    ) {
      return {
        dnf: true,
        reason: `${car.driveType} na športových pneumatikách nevyšlo klzký kopec`,
        progress: 0.48,
      };
    }
  }

  if (track.isDeepTerrain && (surface === 'Mud' || surface === 'Snow')) {
    if (car.groundClearance === 'Low' && car.tyreType !== 'Off-Road' && car.tyreType !== 'All-Surface') {
      return {
        dnf: true,
        reason: 'Nízky podvozok uviazol v hlbokom teréne',
        progress: 0.37,
      };
    }
  }

  return { dnf: false, progress: 1 };
}

function computeGripFactor(car: CarSpec, stats: EffectiveCarStats, track: Track): number {
  const tyreCoeff = TYRE_SURFACE_MATRIX[car.tyreType][track.surface];
  const driveCoeff = DRIVE_SURFACE_MOD[car.driveType][track.surface];

  let assistBonus = 1.0;
  if (track.surface !== 'Dry Asphalt') {
    if (car.hasAbs) assistBonus += 0.018;
    if (car.hasTc) assistBonus += 0.018;
  }

  let weightSlipPenalty = 1.0;
  if (track.surface === 'Snow' || track.surface === 'Ice' || track.surface === 'Mud') {
    const excessLbs = Math.max(0, stats.weightLbs - 2400);
    weightSlipPenalty = Math.max(0.84, 1 - (excessLbs / 1000) * 0.028);
  }

  let clearanceTerrainFactor = 1.0;
  if (track.isDeepTerrain || track.surface === 'Mud' || track.surface === 'Snow') {
    if (car.groundClearance === 'High') clearanceTerrainFactor = 1.06;
    else if (car.groundClearance === 'Low') clearanceTerrainFactor = 0.88;
  }

  return Math.max(
    0.16,
    tyreCoeff * driveCoeff * assistBonus * weightSlipPenalty * clearanceTerrainFactor
  );
}

interface CarRunSample {
  t: number;
  dist: number;
  prog: number;
  speedMs: number;
}

interface CarKinematicsRun {
  totalTime: number;
  peakSpeedMs: number;
  sectorTimes: number[];
  samples: CarRunSample[];
}

function computeSectorTargetSpeedMs(
  kind: SectorKind,
  speedWeight: number,
  handlingWeight: number,
  car: CarSpec,
  stats: EffectiveCarStats,
  track: Track,
  grip: number,
  maxSurfaceSpeedMs: number
): number {
  const topSpeedMs = stats.topSpeedMph * 0.44704;
  const accelScore = Math.max(0.3, 10.5 / (stats.accel0to60 + 2.0));
  const handlingScore = Math.max(0.42, stats.handling / 82);
  const weightAgility = Math.max(0.76, 1.15 - (stats.weightLbs / 1000) * 0.062);

  if (kind === 'launch' || kind === 'straight') {
    return maxSurfaceSpeedMs;
  }

  if (kind === 'corner') {
    const apexMs = 23.5 * handlingScore * weightAgility * Math.pow(grip, 0.78);
    const sweepBonus = topSpeedMs * 0.16 * speedWeight * Math.pow(grip, 0.35);
    return Math.min(maxSurfaceSpeedMs, Math.max(10, apexMs * (0.65 + handlingWeight * 0.45) + sweepBonus));
  }

  if (kind === 'slalom') {
    const slalomAgility = Math.pow(weightAgility, 1.38) * Math.pow(handlingScore, 1.18);
    return Math.min(maxSurfaceSpeedMs, Math.max(9.5, 22.8 * slalomAgility * Math.pow(grip, 0.8)));
  }

  if (kind === 'bump') {
    let baseBump =
      (21.5 * handlingScore * speedWeight + 23.5 * accelScore * (1 - speedWeight)) *
      Math.pow(grip, 0.55);
    if (track.hasSpeedBumps) {
      if (car.groundClearance === 'Low') baseBump *= 0.62;
      else if (car.groundClearance === 'Medium') baseBump *= 0.89;
      else baseBump *= 1.03;
    }
    return Math.min(maxSurfaceSpeedMs, Math.max(8, baseBump));
  }

  if (kind === 'climb') {
    const clearanceClimb =
      car.groundClearance === 'High'
        ? 1.18
        : car.groundClearance === 'Medium'
        ? car.driveType === '4WD'
          ? 0.90
          : 0.76
        : 0.68;
    const driveClimb =
      car.driveType === '4WD' ? 1.16 : car.driveType === 'RWD' ? 0.94 : 0.85;
    const tyreClimb =
      track.surface === 'Dry Asphalt' || track.surface === 'Wet Asphalt'
        ? 1.0
        : car.tyreType === 'Off-Road'
        ? 1.12
        : car.tyreType === 'All-Surface'
        ? 1.05
        : 0.86;
    const climbCap =
      (topSpeedMs * 0.44 + accelScore * 17.5) *
      Math.pow(grip, 0.85) *
      clearanceClimb *
      driveClimb *
      tyreClimb;
    return Math.min(maxSurfaceSpeedMs * 0.88, Math.max(7.5, climbCap));
  }

  // 'offroad'
  let offroadSpeed =
    (19.5 * handlingScore * weightAgility + accelScore * 10.5) * Math.pow(grip, 0.88);
  if (track.isDeepTerrain) {
    if (car.groundClearance === 'Low') offroadSpeed *= 0.64;
    else if (car.groundClearance === 'Medium') offroadSpeed *= 0.87;
    else offroadSpeed *= 1.05;
  }
  return Math.min(maxSurfaceSpeedMs, Math.max(7.5, offroadSpeed));
}

function simulateCarKinematics(
  car: CarSpec,
  stats: EffectiveCarStats,
  track: Track,
  grip: number,
  dnfInfo: { dnf: boolean; progress: number }
): CarKinematicsRun {
  const dt = 0.04;
  const totalDist = track.distanceMeters;
  const t0to100 = Math.max(1.6, stats.accel0to60 * 1.038);
  const topSpeedMs = stats.topSpeedMph * 0.44704;

  // Max sustainable speed on this surface
  const surfaceTopFactor =
    track.surface === 'Dry Asphalt'
      ? 1.0
      : track.surface === 'Wet Asphalt'
      ? 0.86 + Math.min(0.1, grip * 0.08)
      : Math.max(0.46, Math.min(0.88, 0.44 + grip * 0.44));
  const maxSurfaceSpeedMs = topSpeedMs * surfaceTopFactor;

  // Physical acceleration curve calibrated to 0-100 km/h (27.78 m/s), OLA, MRA, and surface grip
  const launchAccelBase = (27.78 / t0to100) * (0.88 + (stats.ola - 0.92) * 0.58);
  const tractionCap = grip * (car.driveType === '4WD' ? 12.2 : 10.4) * (car.hasTc ? 1.03 : 0.97);
  const effectiveLaunchAccel = Math.min(tractionCap, launchAccelBase * Math.pow(grip, 0.62));
  const mraFactor = 0.62 + (stats.mra / 100) * 0.56;
  const handlingScore = Math.max(0.42, stats.handling / 82);
  const brakeDecel =
    (8.6 + (car.hasAbs ? 1.35 : 0) + handlingScore * 1.65) * Math.pow(grip, 0.78);

  // Build sector distance ranges & target speeds
  const sectorRanges: {
    startDist: number;
    endDist: number;
    kind: SectorKind;
    targetSpeedMs: number;
  }[] = [];
  let cursor = 0;
  track.sectors.forEach((sec, idx) => {
    const len = totalDist * sec.lengthFraction;
    const end = idx === track.sectors.length - 1 ? totalDist : cursor + len;
    sectorRanges.push({
      startDist: cursor,
      endDist: end,
      kind: sec.kind,
      targetSpeedMs: computeSectorTargetSpeedMs(
        sec.kind,
        sec.speedWeight,
        sec.handlingWeight,
        car,
        stats,
        track,
        grip,
        maxSurfaceSpeedMs
      ),
    });
    cursor = end;
  });

  const sectorCrossingTimes: number[] = new Array(sectorRanges.length).fill(0);
  let nextSectorBoundaryIdx = 0;

  const dnfDist = dnfInfo.dnf ? totalDist * dnfInfo.progress : totalDist + 1000;
  const samples: CarRunSample[] = [{ t: 0, dist: 0, prog: 0, speedMs: 0 }];

  let t = 0;
  let dist = 0;
  let v = 0; // Standing start: 0 km/h!
  let peakSpeedMs = 0;
  let reachedGoal = false;
  const maxSimTime = 140;

  while (t < maxSimTime) {
    t += dt;

    // Identify current sector
    let curSecIdx = sectorRanges.length - 1;
    for (let i = 0; i < sectorRanges.length; i++) {
      if (dist <= sectorRanges[i].endDist) {
        curSecIdx = i;
        break;
      }
    }
    const curSec = sectorRanges[curSecIdx];

    if (dnfInfo.dnf && dist >= dnfDist) {
      // Car stalls / loses traction cleanly to 0 km/h
      v = Math.max(0, v - brakeDecel * 0.85 * dt);
      dist = Math.min(dnfDist + 2, dist + v * dt);
      samples.push({
        t,
        dist,
        prog: Math.min(dnfInfo.progress, dist / totalDist),
        speedMs: v,
      });
      if (v <= 0.15) {
        reachedGoal = true;
        break;
      }
      continue;
    }

    // Lookahead braking for upcoming slower sector (corner / slalom / bump / offroad)
    let targetSpeed = curSec.targetSpeedMs;
    let shouldBrakeForAhead = false;
    if (curSecIdx < sectorRanges.length - 1) {
      const nextSec = sectorRanges[curSecIdx + 1];
      if (nextSec.targetSpeedMs < v - 0.8) {
        const distToNext = Math.max(0, nextSec.startDist - dist);
        const brakingDist = (v * v - nextSec.targetSpeedMs * nextSec.targetSpeedMs) / (2 * brakeDecel * 0.92);
        if (distToNext <= brakingDist + 3.5) {
          shouldBrakeForAhead = true;
          targetSpeed = nextSec.targetSpeedMs;
        }
      }
    }

    // Also smoothly vary corner/slalom apex rhythm slightly inside technical sectors
    if (curSec.kind === 'slalom' || curSec.kind === 'corner') {
      const secProg =
        (dist - curSec.startDist) / Math.max(1, curSec.endDist - curSec.startDist);
      const rhythm = curSec.kind === 'slalom' ? Math.sin(secProg * Math.PI * 4) * 0.08 : -Math.sin(secProg * Math.PI) * 0.06;
      targetSpeed *= 1 + rhythm;
    }

    let accel = 0;
    if (shouldBrakeForAhead || v > targetSpeed + 0.6) {
      accel = -brakeDecel;
    } else {
      // Smooth continuous acceleration curve:
      // 0..28 m/s (0-100 km/h) governed by OLA + 0-100 time + grip
      // >28 m/s blends smoothly into MRA mid-range torque & aero drag curve up to maxSurfaceSpeedMs
      const speedRatio = Math.min(0.995, v / Math.max(10, maxSurfaceSpeedMs));
      const aeroRollFactor = Math.max(0.03, 1 - Math.pow(speedRatio, 1.78));
      const highSpeedBlend = Math.min(1, Math.max(0, (v - 18) / 20));
      const basePull =
        effectiveLaunchAccel * (1 - highSpeedBlend) +
        effectiveLaunchAccel * mraFactor * 0.72 * highSpeedBlend;

      const gradePenalty = curSec.kind === 'climb' ? 1.15 : 0;
      accel = Math.max(0.25, basePull * aeroRollFactor - gradePenalty);
    }

    const prevDist = dist;
    v = Math.max(0, v + accel * dt);
    if (!shouldBrakeForAhead && v > targetSpeed && curSec.kind !== 'straight' && curSec.kind !== 'launch') {
      v = Math.max(targetSpeed, v - brakeDecel * 0.45 * dt);
    }
    v = Math.min(maxSurfaceSpeedMs, v);
    if (v > peakSpeedMs) peakSpeedMs = v;

    dist += v * dt;

    // Record exact sector split crossings
    while (
      nextSectorBoundaryIdx < sectorRanges.length &&
      dist >= sectorRanges[nextSectorBoundaryIdx].endDist
    ) {
      const boundary = sectorRanges[nextSectorBoundaryIdx].endDist;
      const frac = (boundary - prevDist) / Math.max(0.001, dist - prevDist);
      sectorCrossingTimes[nextSectorBoundaryIdx] = t - dt + dt * Math.min(1, Math.max(0, frac));
      nextSectorBoundaryIdx++;
    }

    if (dist >= totalDist) {
      const overshoot = dist - totalDist;
      const stepDist = Math.max(0.001, dist - prevDist);
      const exactFinishT = t - dt * (overshoot / stepDist);
      samples.push({ t: exactFinishT, dist: totalDist, prog: 1, speedMs: v });
      reachedGoal = true;
      break;
    }

    samples.push({
      t,
      dist,
      prog: Math.min(1, dist / totalDist),
      speedMs: v,
    });
  }

  if (!reachedGoal) {
    samples.push({ t, dist, prog: Math.min(1, dist / totalDist), speedMs: v });
  }

  const totalTime = Number(samples[samples.length - 1].t.toFixed(2));
  const sectorTimes: number[] = [];
  let prevBoundaryT = 0;
  for (let i = 0; i < sectorRanges.length; i++) {
    const endT =
      i === sectorRanges.length - 1
        ? totalTime
        : sectorCrossingTimes[i] > 0
        ? sectorCrossingTimes[i]
        : totalTime;
    sectorTimes.push(Number(Math.max(0.05, endT - prevBoundaryT).toFixed(3)));
    prevBoundaryT = endT;
  }

  return {
    totalTime,
    peakSpeedMs: Number(peakSpeedMs.toFixed(2)),
    sectorTimes,
    samples,
  };
}

function sampleKinematicsAtTime(
  samples: CarRunSample[],
  simTime: number
): { prog: number; speedMs: number } {
  if (samples.length === 0) return { prog: 0, speedMs: 0 };
  if (simTime <= 0) return { prog: 0, speedMs: 0 };
  const last = samples[samples.length - 1];
  if (simTime >= last.t) return { prog: last.prog, speedMs: 0 };

  // Binary search for bracketing samples
  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= simTime) lo = mid;
    else hi = mid;
  }

  const a = samples[lo];
  const b = samples[hi];
  const span = Math.max(0.0001, b.t - a.t);
  const f = (simTime - a.t) / span;
  return {
    prog: a.prog + (b.prog - a.prog) * f,
    speedMs: a.speedMs + (b.speedMs - a.speedMs) * f,
  };
}

export function simulateRound(
  roundNumber: number,
  track: Track,
  playerCar: CarSpec,
  playerTuning: TuningLevels,
  aiCar: CarSpec,
  aiTuning: TuningLevels
): RoundSimulationResult {
  const playerStats = computeEffectiveCarStats(playerCar, playerTuning);
  const aiStats = computeEffectiveCarStats(aiCar, aiTuning);

  const playerDnfCheck = checkDnf(playerCar, track);
  const aiDnfCheck = checkDnf(aiCar, track);

  const playerGrip = computeGripFactor(playerCar, playerStats, track);
  const aiGrip = computeGripFactor(aiCar, aiStats, track);

  const playerRun = simulateCarKinematics(
    playerCar,
    playerStats,
    track,
    playerGrip,
    playerDnfCheck
  );
  const aiRun = simulateCarKinematics(
    aiCar,
    aiStats,
    track,
    aiGrip,
    aiDnfCheck
  );

  const sectors: SectorResult[] = track.sectors.map((sec, i) => ({
    name: sec.name,
    kind: sec.kind,
    playerTime: playerRun.sectorTimes[i] ?? 0,
    aiTime: aiRun.sectorTimes[i] ?? 0,
  }));

  const playerTotalRaw = playerRun.totalTime;
  const aiTotalRaw = aiRun.totalTime;

  const sampleCount = 120;
  const maxRaceTime = Math.max(
    playerDnfCheck.dnf ? aiTotalRaw : playerTotalRaw,
    aiDnfCheck.dnf ? playerTotalRaw : aiTotalRaw,
    4
  );

  const timeline: ProgressSample[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    const tNorm = i / sampleCount;
    const simT = tNorm * maxRaceTime;
    const p = sampleKinematicsAtTime(playerRun.samples, simT);
    const a = sampleKinematicsAtTime(aiRun.samples, simT);
    timeline.push({
      tNorm,
      playerProgress: p.prog,
      aiProgress: a.prog,
      playerSpeedMs: p.speedMs,
      aiSpeedMs: a.speedMs,
    });
  }

  let playerPoints = 0;
  let aiPoints = 0;
  let winner: 'player' | 'ai' | 'draw' = 'draw';

  if (playerDnfCheck.dnf && aiDnfCheck.dnf) {
    winner = 'draw';
    playerPoints = 0;
    aiPoints = 0;
  } else if (playerDnfCheck.dnf) {
    winner = 'ai';
    aiPoints = 250;
  } else if (aiDnfCheck.dnf) {
    winner = 'player';
    playerPoints = 250;
  } else {
    const diff = Math.abs(playerTotalRaw - aiTotalRaw);
    if (diff < 0.02) {
      winner = 'draw';
      playerPoints = 50;
      aiPoints = 50;
    } else {
      const avgTime = (playerTotalRaw + aiTotalRaw) / 2;
      const bonus = Math.round(
        Math.min(950, diff * 18 + (diff / Math.max(1, avgTime)) * 240)
      );
      if (playerTotalRaw < aiTotalRaw) {
        winner = 'player';
        playerPoints = 50 + bonus;
      } else {
        winner = 'ai';
        aiPoints = 50 + bonus;
      }
    }
  }

  return {
    roundNumber,
    track,
    playerCar,
    playerTuning,
    playerStats,
    aiCar,
    aiTuning,
    aiStats,
    playerTime: playerTotalRaw,
    aiTime: aiTotalRaw,
    playerPeakSpeedMs: playerRun.peakSpeedMs,
    aiPeakSpeedMs: aiRun.peakSpeedMs,
    playerDnf: playerDnfCheck.dnf,
    aiDnf: aiDnfCheck.dnf,
    playerDnfReason: playerDnfCheck.reason,
    aiDnfReason: aiDnfCheck.reason,
    playerDnfAtProgress: playerDnfCheck.progress,
    aiDnfAtProgress: aiDnfCheck.progress,
    playerPoints,
    aiPoints,
    winner,
    sectors,
    timeline,
  };
}

export function simulateMatch(
  scenario: RaceScenario,
  selectedPlayerCars: PlayerCar[]
): MatchSimulationResult {
  const rounds: RoundSimulationResult[] = scenario.rounds.map((r, idx) => {
    const track = TRACK_BY_ID[r.trackId];
    const pInst = selectedPlayerCars[idx];
    const pSpec = CAR_BY_ID[pInst.carId];
    const aiSpec = CAR_BY_ID[r.aiCarId];

    return simulateRound(
      r.roundNumber,
      track,
      pSpec,
      {
        engineLvl: pInst.engineLvl,
        weightLvl: pInst.weightLvl,
        chassisLvl: pInst.chassisLvl,
      },
      aiSpec,
      r.aiTuning
    );
  });

  const playerTotalScore = rounds.reduce((s, r) => s + r.playerPoints, 0);
  const aiTotalScore = rounds.reduce((s, r) => s + r.aiPoints, 0);
  const playerWon = playerTotalScore > aiTotalScore;

  // Cash earned: full reward on win, zero cash reward on loss/draw
  const cashEarned = playerWon ? scenario.cashRewardBase : 0;

  const partialResult: MatchSimulationResult = {
    scenarioId: scenario.id,
    mode: scenario.mode,
    title: scenario.title,
    rounds,
    playerTotalScore,
    aiTotalScore,
    playerWon,
    cashEarned,
    xpEarned: 0,
    bonusPackId: playerWon ? scenario.bonusPackId : undefined,
  };
  partialResult.xpEarned = computeMatchXp(partialResult);

  return partialResult;
}
