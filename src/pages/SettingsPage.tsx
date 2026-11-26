import React, { useState } from 'react';
import { Save, RotateCcw, Check, Shield } from 'lucide-react';
import { CAR_CATALOG } from '../data/cars';
import { useGame } from '../state/gameStore';
import { AppRoute } from '../types/game';

interface SettingsPageProps {
  onNavigate?: (route: AppRoute) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { profile, updateSettings, resetProgress, saveNow } = useGame();
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSave = async () => {
    await saveNow();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2200);
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await resetProgress();
    setConfirmReset(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <div className="text-xs text-slate-400">Predvoľby zobrazenia, simulácie a uloženia hry</div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
          Nastavenia (Settings)
        </h1>
      </div>

      {/* Units */}
      <section className="rounded-2xl border border-slate-800 bg-[#141922] p-6 space-y-3">
        <h2 className="font-display text-xl font-bold text-white">Jednotky merania</h2>
        <p className="text-xs text-slate-400">
          Celá hra používa výhradne metrickú sústavu bez imperiálnych jednotiek.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="rounded-xl border border-slate-800 bg-[#0E1219] px-4 py-3">
            <div className="text-[11px] text-slate-400">Rýchlosť a zrýchlenie</div>
            <div className="font-mono text-sm font-semibold text-amber-400 mt-0.5">
              km/h · 0–100 km/h
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0E1219] px-4 py-3">
            <div className="text-[11px] text-slate-400">Vzdialenosť tratí</div>
            <div className="font-mono text-sm font-semibold text-amber-400 mt-0.5">
              Metre (m) · Kilometre (km)
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0E1219] px-4 py-3">
            <div className="text-[11px] text-slate-400">Hmotnosť vozidiel</div>
            <div className="font-mono text-sm font-semibold text-amber-400 mt-0.5">
              Kilogramy (kg)
            </div>
          </div>
        </div>
      </section>

      {/* Simulation & Audio */}
      <section className="rounded-2xl border border-slate-800 bg-[#141922] p-6 space-y-5">
        <h2 className="font-display text-xl font-bold text-white">Simulácia pretekov a zvuk</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">Rýchlosť animácie 3D</div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0E1219] border border-slate-800 w-fit">
              <button
                type="button"
                onClick={() => updateSettings({ animSpeed: 1 })}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  profile.settings.animSpeed === 1
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1× Štandard
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ animSpeed: 2 })}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  profile.settings.animSpeed === 2
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2× Zrýchlená
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">Snímková frekvencia (FPS)</div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0E1219] border border-slate-800 w-fit">
              <button
                type="button"
                onClick={() => updateSettings({ fps: 30 })}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  profile.settings.fps === 30
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                30 FPS
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ fps: 60 })}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  profile.settings.fps === 60
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                60 FPS
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">Zvukové efekty</div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0E1219] border border-slate-800 w-fit">
              <button
                type="button"
                onClick={() => updateSettings({ soundEnabled: true })}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  profile.settings.soundEnabled
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Zapnuté
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ soundEnabled: false })}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  !profile.settings.soundEnabled
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Vypnuté
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Save / Reset */}
      <section className="rounded-2xl border border-slate-800 bg-[#141922] p-6 space-y-4">
        <h2 className="font-display text-xl font-bold text-white">Správa singleplayer postupu</h2>
        <p className="text-xs text-slate-400">
          Postup sa automaticky ukladá na server pod tvojím účtom. Môžeš vykonať manuálne uloženie
          alebo resetovať účet do počiatočného stavu (6 štartovacích áut, $5 000 Cash, 1 Plastics Pack).
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
          >
            {savedFeedback ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedFeedback ? 'Uložené' : 'Uložiť postup'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              confirmReset
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {confirmReset ? 'Klikni znova pre potvrdenie resetu' : 'Resetovať postup'}
          </button>
        </div>
      </section>

      {/* Admin Access */}
      <section className="rounded-2xl border border-slate-800 bg-[#141922] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Administrácia vozidiel ({CAR_CATALOG.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pridávanie nových vozidiel s vlastnými fotkami, hromadný CSV/JSON import a MySQL export.
          </p>
        </div>
        <a
          href="/admin.php"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate('/admin.php');
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-sm font-semibold transition-colors whitespace-nowrap"
        >
          <Shield className="w-4 h-4" />
          Otvoriť Admin (admin.php)
        </a>
      </section>
    </div>
  );
};
