import React, { useState } from 'react';
import { Lock, ArrowRight, Trophy, Flag, Shuffle } from 'lucide-react';
import { CAR_CATALOG } from '../data/cars';
import { computeDeckRqSample, getLevelProgress } from '../engine/progression';
import { useGame } from '../state/gameStore';
import { AppRoute } from '../types/game';

interface MainMenuPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const MainMenuPage: React.FC<MainMenuPageProps> = ({ onNavigate }) => {
  const { profile, randomRaceUnlocked } = useGame();
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const lvlInfo = getLevelProgress(profile.xp ?? 0);
  const deckRqSample = computeDeckRqSample(profile.garage, profile.rqLevel);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, route: AppRoute) => {
    e.preventDefault();
    onNavigate(route);
  };

  const progressToUnlock = Math.min(10, profile.matchesPlayed);

  return (
    <div className="space-y-8">
      {/* Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-[#141922] p-7 sm:p-9 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="text-xs font-medium text-amber-400">
              Taktická automobilová simulácia · 5-kolové duely
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.02] text-balance">
              Zostav tím pod RQ limit a ovládni trať správnou stratégiou
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Každý zápas tvorí 5 samostatných súbojov 1v1. Sleduj povrch trate, dážď, sneh aj
              spomaľovače v meste, priraď vhodné autá zo svojej garáže a dolaď výkon lineárnym
              tuningom motora, hmotnosti a podvozku.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="/campaign.php"
              onClick={(e) => handleLink(e, '/campaign.php')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Spustiť Kampaň
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/garage.php"
              onClick={(e) => handleLink(e, '/garage.php')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              Otvoriť Garáž ({profile.garage.length})
            </a>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-[#10141C] overflow-hidden min-h-[280px] relative">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/hero_paddock_garage_1795615863310.jpg"
              alt="Motorsport paddock garáž so športovým kupé"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[280px] bg-gradient-to-br from-slate-900 via-[#18202E] to-amber-950/30 flex items-center justify-center p-6">
              <span className="font-display text-3xl font-bold text-slate-400">Top Drivers Paddock</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />
          <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-end justify-between gap-2 text-xs text-slate-200">
            <span>{CAR_CATALOG.length} vozidiel v katalógu · 14 archetypov tratí</span>
            <span className="font-mono text-amber-400">3D fyzikálna simulácia</span>
          </div>
        </div>
      </section>

      {/* 4-Column Player Progression Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="rounded-xl border border-slate-800 bg-[#141922] p-4">
          <div className="text-xs text-slate-400">Herná mena (Cash)</div>
          <div className="font-mono text-2xl font-bold text-amber-400 mt-1">
            ${profile.cash.toLocaleString('sk-SK')}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#141922] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Level {lvlInfo.level} · RQ Strop</span>
            {!lvlInfo.isMaxRq && (
              <span className="font-mono text-[11px] text-sky-400">
                → {lvlInfo.nextLevelRqLimit} RQ
              </span>
            )}
          </div>
          <div className="font-mono text-2xl font-bold text-white mt-1">
            {deckRqSample} / {profile.rqLevel} <span className="text-sm text-slate-400">RQ</span>
          </div>
          {!lvlInfo.isMaxRq && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all"
                  style={{ width: `${lvlInfo.progressPct}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                XP: {lvlInfo.currentLevelXp} / {lvlInfo.nextLevelXp}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#141922] p-4">
          <div className="text-xs text-slate-400">Odohraté zápasy (Random Race)</div>
          <div className="font-mono text-2xl font-bold text-white mt-1">
            {randomRaceUnlocked ? (
              <span className="text-emerald-400">{profile.matchesPlayed} · Odomknuté</span>
            ) : (
              <span>{progressToUnlock} / 10</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#141922] p-4">
          <div className="text-xs text-slate-400">Vozidlá v garáži</div>
          <div className="font-mono text-2xl font-bold text-white mt-1">
            {profile.garage.length} áut
          </div>
        </div>
      </section>

      {/* Game Modes Selection Grid */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold text-white">Výber herného režimu</h2>
          <span className="text-xs text-slate-400">
            Dokončená kampaň: {profile.completedCampaignIds.length} / 15 etáp
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Campaign Card */}
          <a
            href="/campaign.php"
            onClick={(e) => handleLink(e, '/campaign.php')}
            className="group rounded-2xl border border-slate-800 hover:border-amber-400/70 bg-[#141922] p-6 flex flex-col justify-between gap-5 transition-colors"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Základný singleplayer</span>
                <Flag className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
                Kampaň (USA · Európa · Ázia)
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                15 postupných etáp cez 3 svetové regióny. Získavaj Cash a prvé balíčky kariet za
                víťazstvo v každom regióne.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-semibold text-amber-400">
              <span>{profile.completedCampaignIds.length} / 15 dokončených</span>
              <span>Vstúpiť →</span>
            </div>
          </a>

          {/* Thematic Challenges Card */}
          <a
            href="/challenges.php"
            onClick={(e) => handleLink(e, '/challenges.php')}
            className="group rounded-2xl border border-slate-800 hover:border-sky-400/70 bg-[#141922] p-6 flex flex-col justify-between gap-5 transition-colors"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Špeciálne série</span>
                <Trophy className="w-4 h-4 text-sky-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white group-hover:text-sky-300 transition-colors">
                Tematické výzvy
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Súboje s prísnymi vstupnými podmienkami: 90s JDM Legendy, Expedícia 4x4, Mušia váha
                či Mestský šprint.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-semibold text-sky-400">
              <span>{profile.completedChallengeIds.length} / 4 splnených</span>
              <span>Vstúpiť →</span>
            </div>
          </a>

          {/* Random Race Card (Locked until 10 matches) */}
          <a
            href="/random_race.php"
            onClick={(e) => handleLink(e, '/random_race.php')}
            className={`group rounded-2xl border p-6 flex flex-col justify-between gap-5 transition-colors ${
              randomRaceUnlocked
                ? 'border-emerald-500/50 hover:border-emerald-400 bg-[#131C1A]'
                : 'border-slate-800 bg-[#12151C] opacity-80 hover:border-slate-700'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className={randomRaceUnlocked ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {randomRaceUnlocked ? 'Režim odomknutý' : `Zamknuté (${progressToUnlock}/10 zápasov)`}
                </span>
                {randomRaceUnlocked ? (
                  <Shuffle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                Náhodný závod (Random Race)
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                5 úrovní obtiažnosti (Peaceful až Impossible). Algoritmicky vygenerovaných 5 tratí a
                súper prispôsobený tvojmu RQ.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              {!randomRaceUnlocked ? (
                <>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${progressToUnlock * 10}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400">
                    Odohraj ešte {10 - progressToUnlock} zápasov v Kampani alebo Výzvach
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span>{profile.randomRaceWins} výhier v Random Race</span>
                  <span>Generovať závod →</span>
                </div>
              )}
            </div>
          </a>
        </div>
      </section>
    </div>
  );
};
