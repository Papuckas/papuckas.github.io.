import React, { useState } from 'react';
import { CheckCircle2, Play, Trophy } from 'lucide-react';
import { RaceMatchFlow } from '../components/RaceMatchFlow';
import { CAMPAIGN_STAGES, PACK_BY_ID, THEMATIC_CHALLENGES } from '../data/campaign';
import { SURFACE_LABELS_SK, TRACK_BY_ID } from '../data/tracks';
import { useGame } from '../state/gameStore';
import {
  CampaignRegion,
  CampaignStage,
  CarSpec,
  ChallengeSpec,
  RaceScenario,
} from '../types/game';

interface CampaignPageProps {
  initialTab?: 'campaign' | 'challenges';
}

export const CampaignPage: React.FC<CampaignPageProps> = ({ initialTab = 'campaign' }) => {
  const { profile } = useGame();
  const [tab, setTab] = useState<'campaign' | 'challenges'>(initialTab);
  const [region, setRegion] = useState<CampaignRegion>('USA');
  const [activeScenario, setActiveScenario] = useState<{
    scenario: RaceScenario;
    filterCheck?: (car: CarSpec) => boolean;
    filterLabel?: string;
  } | null>(null);
  const [bannerImgFailed, setBannerImgFailed] = useState(false);

  const regions: CampaignRegion[] = ['USA', 'Európa', 'Ázia'];

  const startStage = (stage: CampaignStage) => {
    const alreadyCleared = profile.completedCampaignIds.includes(stage.id);
    const scenario: RaceScenario = {
      id: `camp_${stage.id}_${Date.now()}`,
      mode: 'campaign',
      title: `${stage.region} · Etapa ${stage.stageNumber}: ${stage.title}`,
      subtitle: `Limit ${stage.rqLimit} RQ · ${stage.subtitle}`,
      sourceId: stage.id,
      rqLimit: stage.rqLimit,
      cashRewardBase: stage.cashReward,
      bonusPackId: !alreadyCleared ? stage.firstClearPackId : undefined,
      rounds: stage.trackIds.map((trackId, idx) => ({
        roundNumber: idx + 1,
        trackId,
        aiCarId: stage.aiCarIds[idx],
        aiTuning: {
          engineLvl: Math.min(6, stage.stageNumber - 1),
          weightLvl: Math.min(6, stage.stageNumber - 1),
          chassisLvl: Math.min(6, stage.stageNumber - 1),
        },
      })),
    };
    setActiveScenario({ scenario });
  };

  const startChallenge = (chal: ChallengeSpec) => {
    const alreadyCleared = profile.completedChallengeIds.includes(chal.id);
    const scenario: RaceScenario = {
      id: `chal_${chal.id}_${Date.now()}`,
      mode: 'challenge',
      title: `Výzva: ${chal.title}`,
      subtitle: chal.ruleSummary,
      sourceId: chal.id,
      rqLimit: chal.rqLimit,
      cashRewardBase: chal.cashReward,
      bonusPackId: !alreadyCleared ? chal.bonusPackId : undefined,
      rounds: chal.trackIds.map((trackId, idx) => ({
        roundNumber: idx + 1,
        trackId,
        aiCarId: chal.aiCarIds[idx],
        aiTuning: { engineLvl: 3, weightLvl: 3, chassisLvl: 3 },
      })),
    };
    setActiveScenario({
      scenario,
      filterCheck: chal.filterCheck,
      filterLabel: chal.ruleSummary,
    });
  };

  if (activeScenario) {
    return (
      <RaceMatchFlow
        scenario={activeScenario.scenario}
        filterCheck={activeScenario.filterCheck}
        filterLabel={activeScenario.filterLabel}
        onExit={() => setActiveScenario(null)}
      />
    );
  }

  const stagesInRegion = CAMPAIGN_STAGES.filter((s) => s.region === region);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#141922] p-6 sm:p-8 flex flex-col justify-between gap-4">
          <div>
            <div className="text-xs text-amber-400 font-medium">
              Singleplayer progresia · Odohratých zápasov: {profile.matchesPlayed}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
              {tab === 'campaign' ? 'Svetová kampaň' : 'Tematické výzvy'}
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              {tab === 'campaign'
                ? 'Porážaj tímy súperov v USA, Európe a Ázii. Prvé víťazstvo v každej etape ti odomkne bonusový balíček kariet a každá jazda sa počíta do odomknutia Random Race.'
                : 'Špecializované série s pevnými obmedzeniami na pôvod, dekádu, pohon alebo hmotnosť vozidla.'}
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0E1219] border border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => setTab('campaign')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'campaign'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Kampaň (15 etáp)
            </button>
            <button
              type="button"
              onClick={() => setTab('challenges')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'challenges'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tematické výzvy (4)
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#10141C] overflow-hidden min-h-[190px]">
          {!bannerImgFailed ? (
            <img
              src="/src/assets/images/track_aerial_circuit_1795615865105.jpg"
              alt="Letecký pohľad na alpský okruh"
              referrerPolicy="no-referrer"
              onError={() => setBannerImgFailed(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[190px] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
              <span className="font-display text-2xl text-slate-400">Championship Circuits</span>
            </div>
          )}
        </div>
      </div>

      {tab === 'campaign' ? (
        <div className="space-y-5">
          {/* Region Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {regions.map((r) => {
              const cleared = CAMPAIGN_STAGES.filter(
                (s) => s.region === r && profile.completedCampaignIds.includes(s.id)
              ).length;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    region === r
                      ? 'bg-amber-500 text-slate-950'
                      : 'border border-slate-800 bg-[#141922] text-slate-300 hover:text-white'
                  }`}
                >
                  {r} ({cleared}/5)
                </button>
              );
            })}
          </div>

          {/* Stages List */}
          <div className="grid grid-cols-1 gap-4">
            {stagesInRegion.map((stage) => {
              const cleared = profile.completedCampaignIds.includes(stage.id);
              const firstPack = stage.firstClearPackId ? PACK_BY_ID[stage.firstClearPackId] : null;

              return (
                <div
                  key={stage.id}
                  className="rounded-xl border border-slate-800 bg-[#141922] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-amber-400 font-semibold">
                        Etapa {stage.stageNumber} / 5
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-slate-300">
                        Limit {Math.min(profile.rqLevel, stage.rqLimit)} RQ
                      </span>
                      {profile.rqLevel < stage.rqLimit && (
                        <span className="font-mono text-[11px] text-amber-400">
                          (etapa max {stage.rqLimit}, tvoj strop {profile.rqLevel})
                        </span>
                      )}
                      {cleared && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Dokončené
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="font-display text-2xl font-bold text-white">{stage.title}</h2>
                    <p className="text-xs text-slate-400">{stage.subtitle}</p>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-1">
                      {stage.trackIds.map((tid, idx) => {
                        const tr = TRACK_BY_ID[tid];
                        if (!tr) return null;
                        return (
                          <span key={`${tid}-${idx}`}>
                            {idx + 1}. {tr.name} ({SURFACE_LABELS_SK[tr.surface]})
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 shrink-0">
                    <div className="text-left lg:text-right tabular-nums">
                      <div className="font-mono text-sm font-bold text-amber-400">
                        +${stage.cashReward.toLocaleString('sk-SK')}
                      </div>
                      {firstPack && !cleared && (
                        <div className="text-[11px] text-emerald-400">
                          1. výhra: +{firstPack.name}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => startStage(stage)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-4 h-4" />
                      Pretekať
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {THEMATIC_CHALLENGES.map((chal) => {
            const cleared = profile.completedChallengeIds.includes(chal.id);
            const bonusPack = chal.bonusPackId ? PACK_BY_ID[chal.bonusPackId] : null;
            return (
              <div
                key={chal.id}
                className="rounded-2xl border border-slate-800 bg-[#141922] p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-sky-400 font-medium inline-flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      Špeciálna výzva
                    </span>
                    {cleared && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Splnené
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">{chal.title}</h2>
                  <p className="text-sm text-slate-300">{chal.subtitle}</p>
                  <div className="text-xs font-mono text-amber-300 pt-1">{chal.ruleSummary}</div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                  <div className="text-xs tabular-nums">
                    <span className="font-mono font-bold text-amber-400">
                      +${chal.cashReward.toLocaleString('sk-SK')}
                    </span>
                    {bonusPack && !cleared && (
                      <span className="text-emerald-400"> · +{bonusPack.name}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startChallenge(chal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Vstúpiť do výzvy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
