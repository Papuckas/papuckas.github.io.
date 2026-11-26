import React, { useEffect, useState } from 'react';
import { Wrench, X, Trash2 } from 'lucide-react';
import {
  BODY_TYPE_LABELS_SK,
  CAR_BY_ID,
  computeEffectiveCarStats,
  formatAccel0to100,
  formatSpeed,
  formatWeight,
  getCarSellValue,
  getUpgradeCost,
  MAX_BRANCH_LEVEL,
  MAX_TOTAL_UPGRADES,
  RARITY_COLORS,
} from '../data/cars';
import { soundEngine } from '../engine/audio';
import { useGame } from '../state/gameStore';
import { CarSpec, PlayerCar } from '../types/game';
import { CarIllustration } from './CarIllustration';

interface CarDetailModalProps {
  playerCar?: PlayerCar;
  catalogCar?: CarSpec;
  onClose: () => void;
}

export const CarDetailModal: React.FC<CarDetailModalProps> = ({
  playerCar,
  catalogCar,
  onClose,
}) => {
  const { profile, upgradeCar, sellCar } = useGame();
  const [confirmSell, setConfirmSell] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const liveCar = playerCar
    ? profile.garage.find((g) => g.instanceId === playerCar.instanceId) ?? playerCar
    : undefined;
  const spec = liveCar ? CAR_BY_ID[liveCar.carId] : catalogCar;

  useEffect(() => {
    setImgFailed(false);
  }, [spec?.id, spec?.imageUrl]);

  if (!spec) return null;

  const isOwnedInstance = Boolean(liveCar);
  const ownedCount = profile.garage.filter((g) => g.carId === spec.id).length;

  const stats = computeEffectiveCarStats(
    spec,
    liveCar ?? { engineLvl: 0, weightLvl: 0, chassisLvl: 0 }
  );
  const tier = RARITY_COLORS[spec.rarity];
  const sellValue = liveCar ? getCarSellValue(spec, liveCar) : 0;
  const canSell = isOwnedInstance && profile.garage.length > 5;

  const handleUpgrade = (branch: 'engineLvl' | 'weightLvl' | 'chassisLvl') => {
    if (!liveCar) return;
    const ok = upgradeCar(liveCar.instanceId, branch);
    if (ok) {
      soundEngine.playUpgrade(profile.settings.soundEnabled);
    }
  };

  const handleSell = () => {
    if (!liveCar) return;
    if (!confirmSell) {
      setConfirmSell(true);
      return;
    }
    const ok = sellCar(liveCar.instanceId);
    if (ok) {
      onClose();
    }
  };

  const branches: {
    key: 'engineLvl' | 'weightLvl' | 'chassisLvl';
    title: string;
    effect: string;
    level: number;
  }[] = [
    {
      key: 'engineLvl',
      title: 'Motor (Engine)',
      effect: '+Max rýchlosť · −Čas 0–100 · +MRA',
      level: liveCar?.engineLvl ?? 0,
    },
    {
      key: 'weightLvl',
      title: 'Hmotnosť (Weight)',
      effect: '−Váha (kg) · −Čas 0–100 · +Obratnosť',
      level: liveCar?.weightLvl ?? 0,
    },
    {
      key: 'chassisLvl',
      title: 'Podvozok (Chassis)',
      effect: '+Handling · +Priľnavosť v zákrutách',
      level: liveCar?.chassisLvl ?? 0,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${spec.make} ${spec.model}`}
    >
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-[#131822] shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-4 border-b border-slate-800 ${tier.headerBg}`}>
          <div>
            <div className="text-xs text-slate-300">
              <span className={`font-semibold ${tier.text}`}>{spec.rarity}</span> · RQ {spec.rq} ·{' '}
              {spec.year} · {spec.country} · {BODY_TYPE_LABELS_SK[spec.bodyType]}
            </div>
            <h2 className="font-display text-3xl font-bold text-white leading-tight">
              {spec.make} {spec.model}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Zavrieť detail auta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Illustration + Core Stats */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-5 aspect-[16/10] rounded-xl border border-slate-800 bg-[#0E121A] overflow-hidden flex items-center justify-center">
              {spec.imageUrl && !imgFailed ? (
                <img
                  src={spec.imageUrl}
                  alt={`${spec.make} ${spec.model}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-contain p-1.5"
                />
              ) : (
                <div className="w-full h-full p-4">
                  <CarIllustration bodyType={spec.bodyType} accentColor={spec.accentColor} />
                </div>
              )}
            </div>

            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4 tabular-nums">
              <div>
                <div className="text-xs text-slate-400">Max rýchlosť</div>
                <div className="font-mono text-lg font-bold text-white">
                  {formatSpeed(stats.topSpeedMph, profile.settings)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Zrýchlenie 0–100</div>
                <div className="font-mono text-lg font-bold text-white">
                  {formatAccel0to100(stats.accel0to60)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Ovládateľnosť</div>
                <div className="font-mono text-lg font-bold text-white">{stats.handling}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">MRA (100–160 km/h)</div>
                <div className="font-mono text-base font-semibold text-amber-300">
                  {stats.mra.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Hmotnosť</div>
                <div className="font-mono text-base font-semibold text-slate-200">
                  {formatWeight(stats.weightLbs, profile.settings)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">OLA (Štart 0–50 km/h)</div>
                <div className="font-mono text-base font-semibold text-slate-200">
                  {stats.ola.toFixed(2)}×
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specs & Tags */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-800 text-xs text-slate-300">
            <div className="font-mono">
              Pohon: <strong className="text-white">{spec.driveType}</strong> · Pneumatiky:{' '}
              <strong className="text-white">{spec.tyreType}</strong> · Svetlá výška:{' '}
              <strong className="text-white">{spec.groundClearance}</strong> · ABS:{' '}
              <strong className="text-white">{spec.hasAbs ? 'Áno' : 'Nie'}</strong> · TC:{' '}
              <strong className="text-white">{spec.hasTc ? 'Áno' : 'Nie'}</strong>
            </div>
            <div className="text-slate-400">{spec.tags.join(' · ')}</div>
          </div>

          {isOwnedInstance ? (
            /* Linear Tuning System */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Lineárny Tuning vozidla
                  </h3>
                  <p className="text-xs text-slate-400">
                    Vyber si špecializáciu (napr. univerzálne 323, okruh 233 alebo drag 332). Limit:{' '}
                    <span className="font-mono text-amber-300 tabular-nums">
                      {stats.totalUpgrades} / {MAX_TOTAL_UPGRADES}
                    </span>{' '}
                    vylepšení.
                  </p>
                </div>
                <div className="font-mono text-sm text-slate-200 tabular-nums">
                  Zostatok: <strong className="text-amber-400">${profile.cash.toLocaleString('sk-SK')}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {branches.map((br) => {
                  const cost = getUpgradeCost(spec, br.level);
                  const maxedBranch = br.level >= MAX_BRANCH_LEVEL;
                  const maxedTotal = stats.totalUpgrades >= MAX_TOTAL_UPGRADES;
                  const canAfford = profile.cash >= cost;
                  const disabled = maxedBranch || maxedTotal || !canAfford;

                  return (
                    <div
                      key={br.key}
                      className="rounded-xl border border-slate-800 bg-[#171D28] p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">{br.title}</span>
                          <span className="font-mono text-xs text-amber-400 tabular-nums">
                            {br.level} / {MAX_BRANCH_LEVEL}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{br.effect}</p>

                        {/* 9-step level meter */}
                        <div className="grid grid-cols-9 gap-1 mt-3">
                          {Array.from({ length: MAX_BRANCH_LEVEL }, (_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 rounded-sm ${
                                i < br.level ? 'bg-amber-400' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleUpgrade(br.key)}
                        className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          disabled
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        {maxedBranch
                          ? 'Maximum (9/9)'
                          : maxedTotal
                            ? 'Limit 24/24'
                            : `Vylepšiť ($${cost.toLocaleString('sk-SK')})`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#171D28] p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Katalógový náhľad (Sériové hodnoty)</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {ownedCount > 0
                    ? `Toto vozidlo už máš v garáži (${ownedCount}×). Na tuning ho otvor v záložke Moja garáž.`
                    : 'Toto vozidlo zatiaľ nevlastníš. Môžeš ho získať v Obchode v balíčkoch alebo ako odmenu za preteky.'}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  ownedCount > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {ownedCount > 0 ? `Vlastníš (${ownedCount}×)` : 'Nevlastnené'}
              </span>
            </div>
          )}
        </div>

        {/* Footer with Sell option */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-[#161B25]">
          <div className="flex items-center gap-3">
            {isOwnedInstance ? (
              canSell ? (
                <button
                  type="button"
                  onClick={handleSell}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    confirmSell
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'border border-slate-700 text-slate-300 hover:text-rose-300 hover:border-rose-500/50'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {confirmSell
                    ? `Potvrdiť predaj (+$${sellValue.toLocaleString('sk-SK')})`
                    : `Predať auto (+$${sellValue.toLocaleString('sk-SK')})`}
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  V garáži musí zostať minimálne 5 vozidiel na preteky.
                </span>
              )
            ) : (
              <span className="text-xs text-slate-400">
                Sériový model v hernom katalógu
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition-colors cursor-pointer"
          >
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
};
