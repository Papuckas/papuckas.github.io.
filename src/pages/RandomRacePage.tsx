import React, { useState } from 'react';
import { Lock, Shuffle, Play, AlertCircle } from 'lucide-react';
import { RaceMatchFlow } from '../components/RaceMatchFlow';
import { DIFFICULTY_CONFIGS } from '../engine/randomizer';
import { useGame } from '../state/gameStore';
import { AppRoute, DifficultyLevel, RaceScenario } from '../types/game';

interface RandomRacePageProps {
  onNavigate: (route: AppRoute) => void;
}

export const RandomRacePage: React.FC<RandomRacePageProps> = ({ onNavigate }) => {
  const { profile, randomRaceUnlocked, startRandomRace } = useGame();
  const [activeScenario, setActiveScenario] = useState<RaceScenario | null>(
    () => profile.activeRandomScenario
  );

  const handleLaunchDifficulty = (diff: DifficultyLevel) => {
    const scenario = startRandomRace(diff);
    setActiveScenario(scenario);
  };

  if (!randomRaceUnlocked) {
    const remaining = Math.max(0, 10 - profile.matchesPlayed);
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-[#141922] p-8 text-center space-y-5 mt-6">
        <div className="w-12 h-12 rounded-xl border border-slate-700 bg-slate-800/80 flex items-center justify-center mx-auto text-amber-400">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <div className="text-xs font-mono text-amber-400">
            Progres odomknutia: {profile.matchesPlayed} / 10 zápasov
          </div>
          <h1 className="font-display text-3xl font-bold text-white">
            Režim Random Race je zatiaľ uzamknutý
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Aby si mal v garáži dostatok vozidiel rôznych typov a povrchov, Random Race sa odomkne
            po odohratí minimálne 10 zápasov v základnom singleplayeri (Kampaň alebo Výzvy).
            Zostáva ti ešte <strong className="text-white">{remaining}</strong> zápasov.
          </p>
        </div>

        <div className="h-2.5 w-full max-w-md mx-auto rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-amber-500"
            style={{ width: `${Math.min(100, profile.matchesPlayed * 10)}%` }}
          />
        </div>

        <div className="pt-2">
          <a
            href="/campaign.php"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/campaign.php');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors"
          >
            Prejsť do Kampane a Výziev
          </a>
        </div>
      </div>
    );
  }

  if (activeScenario) {
    return (
      <RaceMatchFlow
        scenario={activeScenario}
        onExit={() => setActiveScenario(null)}
        onPlayAgain={() => {
          const next = startRandomRace(activeScenario.difficulty ?? 'Medium');
          setActiveScenario(next);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs text-emerald-400 font-medium">
            Režim odomknutý · Výhier: {profile.randomRaceWins}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
            Náhodný závod (Random Race)
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Vyber jednu z 5 obtiažností. Generátor náhodne zostaví 5 rôznych tratí s premenlivým
            počasím a vyvážený tím súpera podľa RQ limitu a zvolenej náročnosti.
          </p>
        </div>
      </div>

      {profile.activeRandomScenario && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              Máš rozohratý vygenerovaný scenár:{' '}
              <strong className="text-white">{profile.activeRandomScenario.title}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveScenario(profile.activeRandomScenario)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Pokračovať v závode
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {DIFFICULTY_CONFIGS.map((cfg, idx) => (
          <div
            key={cfg.level}
            className="rounded-2xl border border-slate-800 bg-[#141922] p-6 flex flex-col justify-between gap-5"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-amber-400 font-semibold">
                  Úroveň {idx + 1} · {cfg.level}
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  Odmena {cfg.cashMultiplier}× Cash
                </span>
              </div>

              <h2 className="font-display text-2xl font-bold text-white">{cfg.labelSk}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{cfg.description}</p>

              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-300 space-y-1 tabular-nums">
                <div>
                  Tuning súpera: <strong className="font-mono">Náhodný (prevažne séria / 1–3 úpravy)</strong>
                </div>
                <div>
                  Šanca na extrémne počasie:{' '}
                  <strong className="font-mono">{Math.round(cfg.extremeSurfaceChance * 100)}%</strong>
                </div>
                {cfg.bonusPackId && (
                  <div className="text-emerald-400">
                    Šanca na bonusový balíček: {Math.round(cfg.bonusPackChance * 100)}%
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleLaunchDifficulty(cfg.level)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              Vygenerovať a pretekať
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
