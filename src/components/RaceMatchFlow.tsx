import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Sparkles,
  AlertTriangle,
  Shuffle,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BODY_TYPE_LABELS_SK,
  CAR_BY_ID,
  computeEffectiveCarStats,
  formatAccel0to100,
  formatSpeed,
  RARITY_COLORS,
  RARITY_ORDER,
} from '../data/cars';
import { PACK_BY_ID } from '../data/campaign';
import { SURFACE_LABELS_SK, SURFACE_THEME, TRACK_BY_ID } from '../data/tracks';
import { simulateMatch } from '../engine/simulation';
import { useGame } from '../state/gameStore';
import {
  BodyType,
  CarSpec,
  MatchSimulationResult,
  PlayerCar,
  RaceScenario,
} from '../types/game';
import { CarCard } from './CarCard';
import { CarIllustration } from './CarIllustration';
import { PackOpeningModal } from './PackOpeningModal';
import { RaceCanvas } from './RaceCanvas';

const BODY_FILTER_OPTIONS: BodyType[] = [
  'Combi',
  'SUV',
  'Supercar',
  'Sedan',
  'Hatchback',
  'Coupe',
  'Rally',
  'Pickup',
  'Track',
];

const CarPreviewVisual: React.FC<{ car: CarSpec; badgeText?: string }> = ({ car, badgeText }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [car.id, car.imageUrl]);

  return (
    <div className="relative w-full aspect-[16/10] max-h-24 rounded-lg bg-gradient-to-b from-[#161D28] to-[#0F141C] border border-slate-800/80 overflow-hidden my-1.5 flex items-center justify-center">
      {car.imageUrl && !imgFailed ? (
        <img
          src={car.imageUrl}
          alt={`${car.make} ${car.model}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <div className="w-full h-full px-3 pt-1.5 pb-1">
          <CarIllustration bodyType={car.bodyType} accentColor={car.accentColor} />
        </div>
      )}
      <div className="absolute top-1 right-1.5 text-[10px] font-mono text-slate-200 bg-black/60 px-1.5 py-0.5 rounded tabular-nums">
        {badgeText ?? `${car.year} · ${BODY_TYPE_LABELS_SK[car.bodyType]}`}
      </div>
    </div>
  );
};

interface RaceMatchFlowProps {
  scenario: RaceScenario;
  filterCheck?: (car: CarSpec) => boolean;
  filterLabel?: string;
  onExit: () => void;
  onPlayAgain?: () => void;
}

type MatchPhase = 'SETUP' | 'RACING' | 'SUMMARY';

export const RaceMatchFlow: React.FC<RaceMatchFlowProps> = ({
  scenario,
  filterCheck,
  filterLabel,
  onExit,
  onPlayAgain,
}) => {
  const { profile, recordMatchResult, openRewardPack } = useGame();

  const [phase, setPhase] = useState<MatchPhase>('SETUP');
  const [assignedIds, setAssignedIds] = useState<(string | null)[]>([null, null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);

  // Full Garage filters in Race Setup
  const [query, setQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState('ALL');
  const [bodyFilter, setBodyFilter] = useState('ALL');
  const [driveFilter, setDriveFilter] = useState<string>('ALL');
  const [tyreFilter, setTyreFilter] = useState<string>('ALL');
  const [clearanceFilter, setClearanceFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [decadeFilter, setDecadeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'rq' | 'speed' | 'accel' | 'handling' | 'weight'>('rq');

  // Simulation state
  const [matchResult, setMatchResult] = useState<MatchSimulationResult | null>(null);
  const [activeRoundIdx, setActiveRoundIdx] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [roundLiveScores, setRoundLiveScores] = useState<Record<number, { player: number; ai: number }>>({});
  const [rewardPackCards, setRewardPackCards] = useState<CarSpec[] | null>(null);
  const [claimedRewardPack, setClaimedRewardPack] = useState(false);

  const effectiveRqLimit = Math.min(profile.rqLevel, scenario.rqLimit);

  const countries = useMemo(() => {
    const specs = profile.garage
      .map((g) => CAR_BY_ID[g.carId])
      .filter((c): c is CarSpec => Boolean(c));
    return Array.from(new Set(specs.map((c) => c.country).filter(Boolean))).sort();
  }, [profile.garage]);

  const assignedCars = useMemo(
    () =>
      assignedIds.map((id) =>
        id ? profile.garage.find((g) => g.instanceId === id) ?? null : null
      ),
    [assignedIds, profile.garage]
  );

  const usedRq = useMemo(
    () =>
      assignedCars.reduce((sum, item) => {
        if (!item) return sum;
        return sum + (CAR_BY_ID[item.carId]?.rq ?? 0);
      }, 0),
    [assignedCars]
  );

  const allSlotsFilled = assignedCars.every((c) => c !== null);
  const withinRqLimit = usedRq <= effectiveRqLimit;
  const canStartRace = allSlotsFilled && withinRqLimit;

  const filteredGarage = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profile.garage
      .filter((item) => {
        const spec = CAR_BY_ID[item.carId];
        if (!spec) return false;
        if (
          q &&
          !`${spec.make} ${spec.model} ${spec.tags.join(' ')} ${spec.country}`
            .toLowerCase()
            .includes(q)
        ) {
          return false;
        }
        if (rarityFilter !== 'ALL' && spec.rarity !== rarityFilter) return false;
        if (bodyFilter !== 'ALL' && spec.bodyType !== bodyFilter) return false;
        if (driveFilter !== 'ALL' && spec.driveType !== driveFilter) return false;
        if (tyreFilter !== 'ALL' && spec.tyreType !== tyreFilter) return false;
        if (clearanceFilter !== 'ALL' && spec.groundClearance !== clearanceFilter) return false;
        if (countryFilter !== 'ALL' && spec.country !== countryFilter) return false;
        if (decadeFilter !== 'ALL') {
          const dec = Math.floor(spec.year / 10) * 10;
          if (`${dec}` !== decadeFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sa = CAR_BY_ID[a.carId];
        const sb = CAR_BY_ID[b.carId];
        if (!sa || !sb) return 0;
        if (sortBy === 'rq') return sb.rq - sa.rq;
        if (sortBy === 'speed') return sb.topSpeedMph - sa.topSpeedMph;
        if (sortBy === 'accel') return sa.accel0to60 - sb.accel0to60;
        if (sortBy === 'handling') return sb.handling - sa.handling;
        return sa.weightLbs - sb.weightLbs;
      });
  }, [
    profile.garage,
    query,
    rarityFilter,
    bodyFilter,
    driveFilter,
    tyreFilter,
    clearanceFilter,
    countryFilter,
    decadeFilter,
    sortBy,
  ]);

  const resetFilters = () => {
    setQuery('');
    setRarityFilter('ALL');
    setBodyFilter('ALL');
    setDriveFilter('ALL');
    setTyreFilter('ALL');
    setClearanceFilter('ALL');
    setCountryFilter('ALL');
    setDecadeFilter('ALL');
  };

  const handleAssignCar = (item: PlayerCar) => {
    const existingIdx = assignedIds.indexOf(item.instanceId);
    const next = [...assignedIds];

    if (existingIdx !== -1) {
      // Unassign if clicked again
      next[existingIdx] = null;
      setAssignedIds(next);
      setActiveSlot(existingIdx);
      return;
    }

    // Place in active slot, or next open slot
    const targetSlot = next[activeSlot] === null ? activeSlot : next.findIndex((x) => x === null);
    const slotToUse = targetSlot !== -1 ? targetSlot : activeSlot;
    next[slotToUse] = item.instanceId;
    setAssignedIds(next);

    const nextEmpty = next.findIndex((x) => x === null);
    if (nextEmpty !== -1) setActiveSlot(nextEmpty);
  };

  const handleAutoAssign = () => {
    const eligible = profile.garage.filter((item) => {
      const spec = CAR_BY_ID[item.carId];
      if (!spec) return false;
      return filterCheck ? filterCheck(spec) : true;
    });

    if (eligible.length < 5) return;

    // Pick 5 cars fitting within RQ limit using greedy suitability per track
    const remaining = [...eligible];
    const picked: (string | null)[] = [null, null, null, null, null];
    let rqRunning = 0;

    // Sort remaining by lowest RQ first as safety fallback if budget is tight
    const minRqPossible = [...eligible]
      .sort((a, b) => (CAR_BY_ID[a.carId]?.rq ?? 0) - (CAR_BY_ID[b.carId]?.rq ?? 0))
      .slice(0, 5)
      .reduce((s, g) => s + (CAR_BY_ID[g.carId]?.rq ?? 0), 0);

    if (minRqPossible > effectiveRqLimit) return;

    scenario.rounds.forEach((round, rIdx) => {
      const track = TRACK_BY_ID[round.trackId];
      const slotsLeftAfter = 4 - rIdx;

      // Reserve enough RQ for remaining slots using cheapest remaining cars
      const sortedCheapest = [...remaining].sort(
        (a, b) => (CAR_BY_ID[a.carId]?.rq ?? 0) - (CAR_BY_ID[b.carId]?.rq ?? 0)
      );
      const minReserve = sortedCheapest
        .slice(0, slotsLeftAfter)
        .reduce((s, g) => s + (CAR_BY_ID[g.carId]?.rq ?? 0), 0);
      const maxAffordable = effectiveRqLimit - rqRunning - minReserve;

      const affordable = remaining.filter(
        (g) => (CAR_BY_ID[g.carId]?.rq ?? 999) <= maxAffordable
      );

      const pool = affordable.length > 0 ? affordable : sortedCheapest;
      pool.sort((a, b) => {
        const ca = CAR_BY_ID[a.carId];
        const cb = CAR_BY_ID[b.carId];
        const score = (c: CarSpec) => {
          let s = c.rq;
          if (track.surface === 'Snow' || track.surface === 'Ice' || track.surface === 'Mud') {
            if (c.tyreType === 'Slick') s -= 150;
            if (c.tyreType === 'Off-Road') s += 45;
            if (c.tyreType === 'All-Surface') s += 30;
            if (c.driveType === '4WD') s += 25;
          } else if (track.surface === 'Wet Asphalt') {
            if (c.tyreType === 'Standard') s += 20;
            if (c.tyreType === 'Slick') s -= 60;
            if (c.driveType === '4WD') s += 14;
          }
          if (track.hasSpeedBumps && c.groundClearance === 'Low') s -= 20;
          if (track.category === 'Drag') s += c.mra * 0.3;
          if (track.category === 'Twisty') s += c.handling * 0.4;
          return s;
        };
        return score(cb) - score(ca);
      });

      const chosen = pool[0];
      if (chosen) {
        picked[rIdx] = chosen.instanceId;
        rqRunning += CAR_BY_ID[chosen.carId]?.rq ?? 0;
        const rmIdx = remaining.findIndex((r) => r.instanceId === chosen.instanceId);
        if (rmIdx !== -1) remaining.splice(rmIdx, 1);
      }
    });

    setAssignedIds(picked);
  };

  const handleTallyUpdate = useCallback(
    (roundNumber: number, playerPts: number, aiPts: number) => {
      setRoundLiveScores((prev) => {
        const cur = prev[roundNumber];
        if (cur && cur.player === playerPts && cur.ai === aiPts) return prev;
        return { ...prev, [roundNumber]: { player: playerPts, ai: aiPts } };
      });
    },
    []
  );

  const handleLaunchSimulation = () => {
    if (!canStartRace) return;
    const validCars = assignedCars as PlayerCar[];
    const result = simulateMatch(scenario, validCars);
    setMatchResult(result);
    setRoundLiveScores({});
    setActiveRoundIdx(0);
    setPhase('RACING');
    recordMatchResult(result, scenario.sourceId);
  };

  const handleRoundCompleted = () => {
    if (!matchResult) return;
    const current = matchResult.rounds[activeRoundIdx];
    if (current) {
      setRoundLiveScores((prev) => ({
        ...prev,
        [current.roundNumber]: {
          player: current.playerPoints,
          ai: current.aiPoints,
        },
      }));
    }
    if (activeRoundIdx < 4) {
      setActiveRoundIdx((i) => i + 1);
    } else {
      setPhase('SUMMARY');
    }
  };

  const handleClaimBonusPack = () => {
    if (!matchResult?.bonusPackId || claimedRewardPack) return;
    const cards = openRewardPack(matchResult.bonusPackId);
    setClaimedRewardPack(true);
    setRewardPackCards(cards);
  };

  // ================= SETUP PHASE =================
  if (phase === 'SETUP') {
    return (
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Späť
            </button>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                {scenario.title}
              </h1>
              <p className="text-xs text-slate-400">
                {scenario.subtitle}
                {filterLabel ? ` · Podmienka: ${filterLabel}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-2 rounded-lg border border-slate-800 bg-[#151A23] text-xs font-mono tabular-nums">
              Rozpočet RQ:{' '}
              <strong className={withinRqLimit ? 'text-emerald-400' : 'text-rose-400'}>
                {usedRq} / {effectiveRqLimit}
              </strong>
              {profile.rqLevel < scenario.rqLimit && (
                <span className="ml-1.5 text-[10px] text-amber-400">
                  (tvoj strop Lvl {profile.level})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAutoAssign}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Rýchly výber
            </button>

            <button
              type="button"
              disabled={!canStartRace}
              onClick={handleLaunchSimulation}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                canStartRace
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4" />
              Štart pretekov
            </button>
          </div>
        </div>

        {/* 5-Column Matchup Board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {scenario.rounds.map((round, idx) => {
            const track = TRACK_BY_ID[round.trackId];
            const aiCar = CAR_BY_ID[round.aiCarId];
            const aiStats = computeEffectiveCarStats(aiCar, round.aiTuning);
            const playerAssigned = assignedCars[idx];
            const playerSpec = playerAssigned ? CAR_BY_ID[playerAssigned.carId] : null;
            const playerStats =
              playerAssigned && playerSpec
                ? computeEffectiveCarStats(playerSpec, playerAssigned)
                : null;
            const isSlotSelected = activeSlot === idx;
            const surfaceTheme = SURFACE_THEME[track.surface];

            return (
              <div
                key={round.roundNumber}
                className={`rounded-xl border bg-[#141923] flex flex-col justify-between overflow-hidden transition-colors ${
                  isSlotSelected ? 'border-amber-400' : 'border-slate-800'
                }`}
              >
                {/* Track Info */}
                <div className="p-3 border-b border-slate-800 bg-[#181E2A]">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Trať {round.roundNumber}</span>
                    <span className={`font-medium ${surfaceTheme.accentText}`}>
                      {SURFACE_LABELS_SK[track.surface]}
                    </span>
                  </div>
                  <div className="font-display text-lg font-bold text-white leading-snug mt-0.5">
                    {track.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                    {track.distanceMeters} m · Rýchlosť {Math.round(track.weightSpeed * 100)}% / Zákruty{' '}
                    {Math.round(track.weightHandling * 100)}%
                  </div>
                  {track.hasSpeedBumps && (
                    <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Spomaľovače (trestá Low)
                    </div>
                  )}
                </div>

                {/* Opponent Preview */}
                <div className="p-3 border-b border-slate-800/80 bg-[#12161E]">
                  <div className="flex items-center justify-between text-[11px] gap-1">
                    <span className="text-amber-400 font-semibold">Súper</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold ${
                          aiStats.totalUpgrades > 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {aiStats.totalUpgrades > 0 ? `Tuning ${aiStats.buildCode}` : 'Séria'}
                      </span>
                      <span className={`font-mono font-semibold tabular-nums ${RARITY_COLORS[aiCar.rarity].text}`}>
                        RQ {aiCar.rq}
                      </span>
                    </div>
                  </div>
                  <CarPreviewVisual key={aiCar.id} car={aiCar} />
                  <div className="text-sm font-semibold text-slate-100 truncate">
                    {aiCar.make} {aiCar.model}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                    {formatSpeed(aiStats.topSpeedMph, profile.settings)} · {formatAccel0to100(aiStats.accel0to60, 1)} · H:{aiStats.handling}
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                    {aiCar.tyreType} · {aiCar.driveType === '4WD' ? '4x4' : aiCar.driveType} · {aiCar.groundClearance.toUpperCase()}
                  </div>
                </div>

                {/* Player Slot */}
                <button
                  type="button"
                  onClick={() => {
                    if (playerAssigned) {
                      const next = [...assignedIds];
                      next[idx] = null;
                      setAssignedIds(next);
                    }
                    setActiveSlot(idx);
                  }}
                  className={`p-3 text-left transition-colors cursor-pointer min-h-[140px] flex flex-col justify-center ${
                    playerSpec && playerStats
                      ? 'bg-sky-500/10 hover:bg-sky-500/15'
                      : isSlotSelected
                        ? 'bg-slate-800/60'
                        : 'hover:bg-slate-800/40'
                  }`}
                >
                  {playerSpec && playerStats ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] gap-1">
                        <span className="text-sky-400 font-semibold truncate">Tvoje auto</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold ${
                              playerStats.totalUpgrades > 0
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {playerStats.totalUpgrades > 0 ? `Tuning ${playerStats.buildCode}` : 'Séria'}
                          </span>
                          <span className={`font-mono font-semibold tabular-nums ${RARITY_COLORS[playerSpec.rarity].text}`}>
                            RQ {playerSpec.rq}
                          </span>
                        </div>
                      </div>
                      <CarPreviewVisual key={playerSpec.id} car={playerSpec} />
                      <div className="text-sm font-semibold text-white truncate">
                        {playerSpec.make} {playerSpec.model}
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 mt-0.5 tabular-nums">
                        {formatSpeed(playerStats.topSpeedMph, profile.settings)} ·{' '}
                        {formatAccel0to100(playerStats.accel0to60, 1)} · H:{playerStats.handling}
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                        {playerSpec.tyreType} · {playerSpec.driveType === '4WD' ? '4x4' : playerSpec.driveType} · {playerSpec.groundClearance.toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <div className="text-xs font-semibold text-slate-300">
                        {isSlotSelected ? 'Vyber auto z garáže nižšie' : `Priradiť na Trať ${round.roundNumber}`}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Kliknutím označíš pozíciu</div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Garage Selection Tray */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-white">
              Výber vozidiel z garáže ({filteredGarage.length})
            </h2>
          </div>

          {/* Complete Garage Filter & Sort Toolbar */}
          <div className="rounded-xl border border-slate-800 bg-[#141922] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Hľadať značku, model, krajinu alebo tag..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  aria-label="Triediť podľa"
                  className="px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
                >
                  <option value="rq">Triediť: RQ (najvyššie)</option>
                  <option value="speed">Triediť: Max rýchlosť (km/h)</option>
                  <option value="accel">Triediť: Zrýchlenie 0–100</option>
                  <option value="handling">Triediť: Handling</option>
                  <option value="weight">Triediť: Najľahšie (kg)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                aria-label="Rarita"
                className="px-2.5 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
              >
                <option value="ALL">Rarita: Všetky</option>
                {RARITY_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={bodyFilter}
                onChange={(e) => setBodyFilter(e.target.value)}
                aria-label="Karoséria"
                className="px-2.5 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
              >
                <option value="ALL">Karoséria: Všetky</option>
                {BODY_FILTER_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {BODY_TYPE_LABELS_SK[b]}
                  </option>
                ))}
              </select>

              <select
                value={driveFilter}
                onChange={(e) => setDriveFilter(e.target.value)}
                aria-label="Filter pohonu"
                className="px-2.5 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
              >
                <option value="ALL">Pohon: Všetky</option>
                <option value="FWD">FWD (Predný)</option>
                <option value="RWD">RWD (Zadný)</option>
                <option value="4WD">4WD / 4x4</option>
              </select>

              <select
                value={tyreFilter}
                onChange={(e) => setTyreFilter(e.target.value)}
                aria-label="Filter pneumatík"
                className="px-2.5 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
              >
                <option value="ALL">Pneu: Všetky</option>
                <option value="Slick">Slick</option>
                <option value="Performance">Performance</option>
                <option value="Standard">Standard</option>
                <option value="All-Surface">All-Surface</option>
                <option value="Off-Road">Off-Road</option>
              </select>

              <select
                value={clearanceFilter}
                onChange={(e) => setClearanceFilter(e.target.value)}
                aria-label="Svetlá výška"
                className="px-2.5 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
              >
                <option value="ALL">Výška: Všetky</option>
                <option value="Low">Low (Nízka)</option>
                <option value="Medium">Medium (Stredná)</option>
                <option value="High">High (Vysoká)</option>
              </select>

              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                aria-label="Krajina"
                className="px-2.5 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
              >
                <option value="ALL">Krajina: Všetky</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={decadeFilter}
                onChange={(e) => setDecadeFilter(e.target.value)}
                aria-label="Dekáda"
                className="px-2.5 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
              >
                <option value="ALL">Dekáda: Všetky</option>
                <option value="1960">1960s</option>
                <option value="1970">1970s</option>
                <option value="1980">1980s</option>
                <option value="1990">1990s</option>
                <option value="2000">2000s</option>
                <option value="2010">2010s</option>
                <option value="2020">2020s</option>
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                Resetovať filtre
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {filteredGarage.map((item) => {
              const spec = CAR_BY_ID[item.carId];
              if (!spec) return null;
              const isSelected = assignedIds.includes(item.instanceId);
              const failsRule = filterCheck ? !filterCheck(spec) : false;
              const currentSlotCar = assignedCars[activeSlot];
              const projectedRq =
                usedRq -
                (currentSlotCar ? CAR_BY_ID[currentSlotCar.carId]?.rq ?? 0 : 0) +
                spec.rq;
              const exceedsRq = !isSelected && assignedIds[activeSlot] === null && usedRq + spec.rq > effectiveRqLimit;
              const disabled = failsRule || (!isSelected && exceedsRq && projectedRq > effectiveRqLimit);

              let reason = '';
              if (failsRule) reason = 'Nesplňuje pravidlá výzvy';
              else if (disabled) reason = `Prekročí limit ${effectiveRqLimit} RQ`;

              return (
                <CarCard
                  key={item.instanceId}
                  car={spec}
                  tuning={item}
                  settings={profile.settings}
                  selected={isSelected}
                  disabled={disabled}
                  disabledReason={reason}
                  compact
                  actionLabel={isSelected ? 'Vybrané' : `Nasadiť #${activeSlot + 1}`}
                  onClick={() => handleAssignCar(item)}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ================= RACING PHASE =================
  if (phase === 'RACING' && matchResult) {
    const activeRound = matchResult.rounds[activeRoundIdx];
    const livePlayerScore = Object.values(roundLiveScores).reduce((s, x) => s + x.player, 0);
    const liveAiScore = Object.values(roundLiveScores).reduce((s, x) => s + x.ai, 0);

    return (
      <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col overflow-hidden">
        {/* Compact Fullscreen Top Control Bar */}
        <div className="bg-[#10151F] border-b border-slate-800 px-2.5 sm:px-5 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-4 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <div className="hidden lg:block min-w-0">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">
                3D Preteky
              </div>
              <div className="font-display text-base font-bold text-white truncate max-w-[180px]">
                {matchResult.title}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {matchResult.rounds.map((r, idx) => (
                <button
                  key={r.roundNumber}
                  type="button"
                  onClick={() => {
                    setAutoPlay(false);
                    setActiveRoundIdx(idx);
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeRoundIdx === idx
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-[#151A23] border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Kolo {r.roundNumber}
                  <span className="hidden md:inline"> · {r.track.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto shrink-0">
            <label className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-slate-300 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="hidden sm:inline">Auto-play kolá</span>
              <span className="sm:hidden">Auto</span>
            </label>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-800 bg-[#151A23] tabular-nums">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-sky-400 font-semibold">TY</span>
                <span className="font-display text-base sm:text-lg font-bold text-white leading-none">
                  {livePlayerScore}
                </span>
              </div>
              <span className="text-slate-600 font-mono text-xs">:</span>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-base sm:text-lg font-bold text-white leading-none">
                  {liveAiScore}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">SÚPER</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPhase('SUMMARY')}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Súhrn zápasu
            </button>
          </div>
        </div>

        {/* Fullscreen 3D Race Engine */}
        <div className="flex-1 min-h-0 relative">
          <RaceCanvas
            round={activeRound}
            settings={profile.settings}
            autoPlay={autoPlay}
            onRoundComplete={handleRoundCompleted}
            onTallyUpdate={handleTallyUpdate}
          />
        </div>
      </div>
    );
  }

  // ================= SUMMARY PHASE =================
  if (phase === 'SUMMARY' && matchResult) {
    const bonusPack = matchResult.bonusPackId ? PACK_BY_ID[matchResult.bonusPackId] : null;

    return (
      <div className="space-y-6">
        {/* Outcome Banner */}
        <div
          className={`rounded-2xl border p-6 flex flex-wrap items-center justify-between gap-6 ${
            matchResult.playerWon
              ? 'border-emerald-500/40 bg-emerald-950/20'
              : 'border-rose-500/40 bg-rose-950/20'
          }`}
        >
          <div>
            <div
              className={`text-xs font-semibold ${
                matchResult.playerWon ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {matchResult.playerWon ? 'Víťazstvo v zápase' : 'Prehra v zápase'}
            </div>
            <h1 className="font-display text-4xl font-bold text-white mt-1">
              {matchResult.playerTotalScore} : {matchResult.aiTotalScore} bodov
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Odmena za zápas:{' '}
              {matchResult.cashEarned > 0 ? (
                <strong className="font-mono text-amber-400">
                  +${matchResult.cashEarned.toLocaleString('sk-SK')}
                </strong>
              ) : (
                <strong className="font-mono text-rose-400">
                  $0 (Prehra — žiadna finančná odmena)
                </strong>
              )}
              {' · '}
              <strong className="font-mono text-sky-400">
                +{matchResult.xpEarned} XP
              </strong>
              <span className="text-slate-400">
                {' '}(Úroveň {profile.level} · Strop {profile.rqLevel} RQ)
              </span>
              {bonusPack && !claimedRewardPack ? ` · Bonusový balíček: ${bonusPack.name}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {bonusPack && !claimedRewardPack && (
              <button
                type="button"
                onClick={handleClaimBonusPack}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Otvoriť {bonusPack.name}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setAutoPlay(false);
                setRoundLiveScores({});
                setActiveRoundIdx(0);
                setPhase('RACING');
              }}
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition-colors cursor-pointer"
            >
              Pozrieť záznam 3D
            </button>

            {onPlayAgain && (
              <button
                type="button"
                onClick={onPlayAgain}
                className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
              >
                Nový závod
              </button>
            )}

            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-700 bg-[#151A23] hover:bg-slate-800 text-sm font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Dokončiť
            </button>
          </div>
        </div>

        {/* Detailed 5-Round Table */}
        <div className="rounded-xl border border-slate-800 bg-[#141923] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#181E2A] border-b border-slate-800 text-xs text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Kolo a trať</th>
                  <th className="py-3 px-4 font-medium">Tvoje vozidlo</th>
                  <th className="py-3 px-4 font-medium">Čas &amp; Max rýchl. (TY)</th>
                  <th className="py-3 px-4 font-medium">Súper</th>
                  <th className="py-3 px-4 font-medium">Čas &amp; Max rýchl. (Súper)</th>
                  <th className="py-3 px-4 font-medium text-right">Body</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 tabular-nums">
                {matchResult.rounds.map((r) => (
                  <tr key={r.roundNumber} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {r.roundNumber}. {r.track.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {SURFACE_LABELS_SK[r.track.surface]}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-100 font-medium">
                        {r.playerCar.make} {r.playerCar.model}
                      </div>
                      <div className={`text-xs ${RARITY_COLORS[r.playerCar.rarity].text}`}>
                        RQ {r.playerCar.rq} · {r.playerCar.tyreType} ·{' '}
                        {r.playerCar.driveType === '4WD' ? '4x4' : r.playerCar.driveType} ·{' '}
                        {r.playerCar.groundClearance.toUpperCase()} ·{' '}
                        <span className="text-sky-300 font-mono">
                          {r.playerStats.totalUpgrades > 0 ? `Tuning ${r.playerStats.buildCode}` : 'Séria'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {r.playerDnf ? (
                        <span className="text-rose-400 font-semibold">DNF</span>
                      ) : (
                        <span className={r.winner === 'player' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                          {r.playerTime.toFixed(2)}s
                        </span>
                      )}
                      <div className="text-[11px] text-slate-400">
                        Max {Math.round(r.playerPeakSpeedMs * 3.6)} km/h
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-100 font-medium">
                        {r.aiCar.make} {r.aiCar.model}
                      </div>
                      <div className={`text-xs ${RARITY_COLORS[r.aiCar.rarity].text}`}>
                        RQ {r.aiCar.rq} · {r.aiCar.tyreType} ·{' '}
                        {r.aiCar.driveType === '4WD' ? '4x4' : r.aiCar.driveType} ·{' '}
                        {r.aiCar.groundClearance.toUpperCase()} ·{' '}
                        <span className="text-amber-300 font-mono">
                          {r.aiStats.totalUpgrades > 0 ? `Tuning ${r.aiStats.buildCode}` : 'Séria'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {r.aiDnf ? (
                        <span className="text-rose-400 font-semibold">DNF</span>
                      ) : (
                        <span className={r.winner === 'ai' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                          {r.aiTime.toFixed(2)}s
                        </span>
                      )}
                      <div className="text-[11px] text-slate-400">
                        Max {Math.round(r.aiPeakSpeedMs * 3.6)} km/h
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          r.winner === 'player'
                            ? 'text-emerald-400'
                            : r.winner === 'ai'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                        }
                      >
                        {r.playerPoints} : {r.aiPoints}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {rewardPackCards && bonusPack && (
          <PackOpeningModal
            packName={bonusPack.name}
            cards={rewardPackCards}
            settings={profile.settings}
            onClose={() => setRewardPackCards(null)}
          />
        )}
      </div>
    );
  }

  return null;
};
