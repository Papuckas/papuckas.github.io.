import React, { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { PackOpeningModal } from '../components/PackOpeningModal';
import { CARD_PACKS } from '../data/campaign';
import { soundEngine } from '../engine/audio';
import { useGame } from '../state/gameStore';
import { CarSpec } from '../types/game';

export const ShopPage: React.FC = () => {
  const { profile, buyPack } = useGame();
  const [openedPack, setOpenedPack] = useState<{ name: string; cards: CarSpec[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [packImgFailed, setPackImgFailed] = useState(false);

  const handleBuy = (packId: string, packName: string) => {
    setErrorMsg(null);
    const res = buyPack(packId);
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Nákup zlyhal.');
      return;
    }
    soundEngine.playPackReveal(profile.settings.soundEnabled);
    setOpenedPack({ name: packName, cards: res.cars });
  };

  return (
    <div className="space-y-8">
      {/* Shop Header Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#141922] p-6 sm:p-8 flex flex-col justify-between gap-4">
          <div>
            <div className="text-xs text-amber-400 font-medium">
              Zberateľské balíčky kariet · Transparentné šance
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
              Obchod s balíčkami (Card Packs)
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              Rozšír svoju garáž o špecialistov na sneh, blato, drag či okruhy. Každý balíček obsahuje
              5 kariet ťahaných so stúpajúcim RQ a garantovanou minimálnou triedou pre poslednú kartu.
            </p>
          </div>
          <div className="font-mono text-lg text-slate-200 tabular-nums">
            Dostupný Cash:{' '}
            <strong className="text-amber-400">${profile.cash.toLocaleString('sk-SK')}</strong>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#10141C] overflow-hidden min-h-[200px]">
          {!packImgFailed ? (
            <img
              src="/src/assets/images/pack_carbon_fiber_1795615865325.jpg"
              alt="Carbon Fiber zberateľský balíček kariet"
              referrerPolicy="no-referrer"
              onError={() => setPackImgFailed(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[200px] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
              <span className="font-display text-2xl text-slate-400">Carbon Fiber Collection</span>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {errorMsg}
        </div>
      )}

      {/* Pack Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {CARD_PACKS.map((pack) => {
          const canAfford = profile.cash >= pack.price;
          return (
            <div
              key={pack.id}
              className="rounded-2xl border border-slate-800 bg-[#141922] p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: pack.accentColor }}
                  >
                    {pack.cardCount} kariet · Min. {pack.guaranteedMinRarity}
                  </span>
                  <span className="font-mono text-lg font-bold text-white tabular-nums">
                    ${pack.price.toLocaleString('sk-SK')}
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-white">{pack.name}</h2>
                  <p className="text-xs text-slate-400 mt-1">{pack.subtitle}</p>
                  {typeof pack.maxLegendaries === 'number' && pack.maxLegendaries > 0 && (
                    <div className="text-[11px] font-mono text-amber-300 mt-1">
                      Max. {pack.maxLegendaries}× Legendary v jednom balíčku
                    </div>
                  )}
                </div>

                {/* Drop Odds Table */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Celková šanca padnutia tried:
                  </div>
                  <div className="space-y-1 tabular-nums">
                    {Object.entries(pack.odds).map(([rarity, pct]) => (
                      <div key={rarity} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{rarity}</span>
                        <span className="font-mono text-slate-200">{pct}%</span>
                      </div>
                    ))}
                  </div>

                  {pack.slotOdds && pack.slotOdds.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 space-y-1">
                      <div className="text-[10px] text-slate-400 font-medium">
                        Rozpis kariet 1 → 5 (vzostupné RQ):
                      </div>
                      <div className="space-y-1 text-[10px] font-mono text-slate-300 tabular-nums">
                        {pack.slotOdds.map((slot, sIdx) => (
                          <div key={sIdx} className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 shrink-0">K{sIdx + 1}:</span>
                            <span className="text-right">
                              {Object.entries(slot)
                                .map(([r, p]) => `${r} ${p}%`)
                                .join(' · ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={!canAfford}
                onClick={() => handleBuy(pack.id, pack.name)}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  canAfford
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <PackageOpen className="w-4 h-4" />
                {canAfford ? 'Kúpiť a otvoriť balíček' : 'Nedostatok Cash'}
              </button>
            </div>
          );
        })}
      </div>

      {openedPack && (
        <PackOpeningModal
          packName={openedPack.name}
          cards={openedPack.cards}
          settings={profile.settings}
          onClose={() => setOpenedPack(null)}
        />
      )}
    </div>
  );
};
