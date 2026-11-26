import React, { useEffect, useState } from 'react';
import {
  computeEffectiveCarStats,
  formatAccel0to100,
  formatSpeed,
  RARITY_COLORS,
} from '../data/cars';
import { CarSpec, PlayerSettings, TuningLevels } from '../types/game';
import { CarIllustration } from './CarIllustration';

interface CarCardProps {
  car: CarSpec;
  tuning?: TuningLevels;
  settings: PlayerSettings;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  compact?: boolean;
  onClick?: () => void;
  actionLabel?: string;
}

export const CarCard: React.FC<CarCardProps> = ({
  car,
  tuning = { engineLvl: 0, weightLvl: 0, chassisLvl: 0 },
  settings,
  selected = false,
  disabled = false,
  disabledReason,
  compact = false,
  onClick,
  actionLabel,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [car.id, car.imageUrl]);

  const stats = computeEffectiveCarStats(car, tuning);
  const tier = RARITY_COLORS[car.rarity];
  const isUpgraded = stats.totalUpgrades > 0;
  const driveLabel = car.driveType === '4WD' ? '4x4' : car.driveType;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`group relative w-full text-left rounded-xl border transition-all duration-150 overflow-hidden bg-[#151A23] ${
        selected
          ? 'border-amber-400 ring-2 ring-amber-400/30'
          : `${tier.border} hover:border-slate-400/70`
      } ${disabled ? 'opacity-45 cursor-not-allowed' : onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Top Tier Header Bar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 ${tier.headerBg}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-semibold tracking-wide whitespace-nowrap ${tier.text}`}>
            {car.rarity}
          </span>
          {isUpgraded && (
            <span className="text-[11px] font-mono text-amber-300 tabular-nums whitespace-nowrap">
              · {stats.buildCode}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">RQ</span>
          <span className="font-display text-lg font-bold leading-none text-white tabular-nums">
            {car.rq}
          </span>
        </div>
      </div>

      {/* Car Visual (Rectangular Landscape Fit) */}
      <div
        className={`relative w-full aspect-[16/10] ${
          compact ? 'max-h-28' : 'max-h-36'
        } bg-gradient-to-b from-[#161D28] to-[#0F141C] overflow-hidden flex items-center justify-center`}
      >
        {car.imageUrl && !imgFailed ? (
          <img
            src={car.imageUrl}
            alt={`${car.make} ${car.model}`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <div className="w-full h-full px-3 pt-2 pb-1">
            <CarIllustration bodyType={car.bodyType} accentColor={car.accentColor} />
          </div>
        )}
        <div className="absolute top-1.5 right-2 text-[10px] font-mono text-slate-200 bg-black/60 px-1.5 py-0.5 rounded tabular-nums">
          {car.year} · {car.country}
        </div>
      </div>

      {/* Title & Clean Unboxed Specs */}
      <div className="px-3 pt-2 pb-3 space-y-2.5">
        <div>
          <div className="text-[11px] text-slate-400 truncate">{car.make}</div>
          <div className="font-display text-lg font-bold text-slate-100 leading-tight truncate">
            {car.model}
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/90 tabular-nums">
          <div>
            <div className="text-[11px] text-slate-400">Max rýchl.</div>
            <div className="font-mono text-xs font-semibold text-slate-100">
              {formatSpeed(stats.topSpeedMph, settings)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">0–100 km/h</div>
            <div className="font-mono text-xs font-semibold text-slate-100">
              {formatAccel0to100(stats.accel0to60)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Handling</div>
            <div className="font-mono text-xs font-semibold text-slate-100">{stats.handling}</div>
          </div>
        </div>

        {/* Technical Tyre · Drive · Clearance inline metadata */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/70">
          <span className="font-mono text-slate-300 whitespace-nowrap truncate">
            {car.tyreType} · {driveLabel} · {car.groundClearance.toUpperCase()}
          </span>
          {actionLabel && (
            <span className="text-amber-400 font-medium whitespace-nowrap ml-2">
              {actionLabel}
            </span>
          )}
        </div>

        {disabled && disabledReason && (
          <div className="text-[11px] text-rose-400 font-medium pt-1 truncate">
            {disabledReason}
          </div>
        )}
      </div>
    </button>
  );
};
