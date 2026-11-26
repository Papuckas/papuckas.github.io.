import React from 'react';
import { X } from 'lucide-react';
import { CarSpec, PlayerSettings } from '../types/game';
import { CarCard } from './CarCard';

interface PackOpeningModalProps {
  packName: string;
  cards: CarSpec[];
  settings: PlayerSettings;
  onClose: () => void;
}

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({
  packName,
  cards,
  settings,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Otvorenie balíčka ${packName}`}
    >
      <div className="w-full max-w-5xl rounded-2xl border border-slate-700 bg-[#12161E] shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-4 border-b border-slate-800 bg-[#161B25]">
          <div>
            <div className="text-xs text-amber-400 font-medium">Nové prírastky do garáže</div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">{packName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Zavrieť"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto">
          <div className="text-[11px] text-slate-400 mb-2.5">
            Karty zoradené od najvzácnejšej po najbežnejšiu:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
            {cards.map((car, index) => (
              <CarCard
                key={`${car.id}-${index}`}
                car={car}
                settings={settings}
                compact
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-4 border-t border-slate-800 bg-[#161B25]">
          <span className="text-xs text-slate-400">
            Všetky získané vozidlá ({cards.length}) boli automaticky pridané do Mojej garáže.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Pokračovať
          </button>
        </div>
      </div>
    </div>
  );
};
