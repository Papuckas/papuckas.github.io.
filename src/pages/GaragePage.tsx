import React, { useMemo, useState } from 'react';
import { Car, Library, PackageOpen, Search, SlidersHorizontal } from 'lucide-react';
import { CarCard } from '../components/CarCard';
import { CarDetailModal } from '../components/CarDetailModal';
import { PackOpeningModal } from '../components/PackOpeningModal';
import { BODY_TYPE_LABELS_SK, CAR_BY_ID, CAR_CATALOG, RARITY_ORDER } from '../data/cars';
import { PACK_BY_ID } from '../data/campaign';
import { useGame } from '../state/gameStore';
import { BodyType, CarSpec, PlayerCar } from '../types/game';

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

const CATALOG_PAGE_SIZE = 60;

export const GaragePage: React.FC = () => {
  const { profile, openUnopenedPack } = useGame();

  const [viewMode, setViewMode] = useState<'garage' | 'catalog'>('garage');
  const [query, setQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState('ALL');
  const [bodyFilter, setBodyFilter] = useState('ALL');
  const [driveFilter, setDriveFilter] = useState('ALL');
  const [tyreFilter, setTyreFilter] = useState('ALL');
  const [clearanceFilter, setClearanceFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [decadeFilter, setDecadeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'rq' | 'speed' | 'accel' | 'handling' | 'weight'>('rq');
  const [catalogLimit, setCatalogLimit] = useState(CATALOG_PAGE_SIZE);
  const [selectedCar, setSelectedCar] = useState<PlayerCar | null>(null);
  const [selectedCatalogCar, setSelectedCatalogCar] = useState<CarSpec | null>(null);
  const [openedPack, setOpenedPack] = useState<{ name: string; cards: CarSpec[] } | null>(null);

  const handleOpenUnopenedPack = (packIndex: number) => {
    const res = openUnopenedPack(packIndex);
    if (!res) return;
    const packMeta = PACK_BY_ID[res.packId];
    setOpenedPack({
      name: packMeta?.name ?? 'Balíček kariet',
      cards: res.cars,
    });
  };

  const ownedCountByCarId = useMemo(() => {
    const map = new Map<string, number>();
    profile.garage.forEach((g) => {
      map.set(g.carId, (map.get(g.carId) ?? 0) + 1);
    });
    return map;
  }, [profile.garage]);

  const countries = useMemo(() => {
    const sourceSpecs =
      viewMode === 'garage'
        ? profile.garage.map((g) => CAR_BY_ID[g.carId]).filter((c): c is CarSpec => Boolean(c))
        : CAR_CATALOG;
    return Array.from(new Set(sourceSpecs.map((c) => c.country).filter(Boolean))).sort();
  }, [viewMode, profile.garage, profile.customCars, profile.carOverrides]);

  const matchesSpecFilters = (spec: CarSpec, q: string): boolean => {
    if (
      q &&
      !`${spec.make} ${spec.model} ${spec.tags.join(' ')} ${spec.country}`.toLowerCase().includes(q)
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
  };

  const sortSpecs = (sa: CarSpec, sb: CarSpec): number => {
    if (sortBy === 'rq') return sb.rq - sa.rq;
    if (sortBy === 'speed') return sb.topSpeedMph - sa.topSpeedMph;
    if (sortBy === 'accel') return sa.accel0to60 - sb.accel0to60;
    if (sortBy === 'handling') return sb.handling - sa.handling;
    return sa.weightLbs - sb.weightLbs;
  };

  const filteredGarageCars = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profile.garage
      .filter((item) => {
        const spec = CAR_BY_ID[item.carId];
        return spec ? matchesSpecFilters(spec, q) : false;
      })
      .sort((a, b) => {
        const sa = CAR_BY_ID[a.carId];
        const sb = CAR_BY_ID[b.carId];
        if (!sa || !sb) return 0;
        return sortSpecs(sa, sb);
      });
  }, [
    profile.garage,
    profile.carOverrides,
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

  const filteredCatalogCars = useMemo(() => {
    if (viewMode !== 'catalog') return [];
    const q = query.trim().toLowerCase();
    return CAR_CATALOG.filter((spec) => matchesSpecFilters(spec, q)).sort(sortSpecs);
  }, [
    viewMode,
    profile.customCars,
    profile.carOverrides,
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
    setCatalogLimit(CATALOG_PAGE_SIZE);
  };

  const visibleCatalogCars = filteredCatalogCars.slice(0, catalogLimit);
  const activeCount = viewMode === 'garage' ? filteredGarageCars.length : filteredCatalogCars.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs text-slate-400">
            {viewMode === 'garage'
              ? 'Katalóg vlastnených vozidiel a lineárny tuning'
              : `Kompletný herný katalóg · Vlastníš ${ownedCountByCarId.size} z ${CAR_CATALOG.length} modelov`}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
            {viewMode === 'garage'
              ? `Moja garáž (${profile.garage.length})`
              : `Katalóg vozidiel (${CAR_CATALOG.length})`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Mode Toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#141922] border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('garage')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'garage'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Moja garáž ({profile.garage.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('catalog');
                setCatalogLimit(CATALOG_PAGE_SIZE);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'catalog'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              Všetky autá v hre ({CAR_CATALOG.length})
            </button>
          </div>

          <div className="font-mono text-sm text-slate-300 tabular-nums">
            Cash na tuning:{' '}
            <strong className="text-amber-400">${profile.cash.toLocaleString('sk-SK')}</strong>
          </div>
        </div>
      </div>

      {/* Unopened Packs Banner */}
      {(profile.unopenedPacks?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <PackageOpen className="w-4 h-4" />
              <span>Neotvorené balíčky ({profile.unopenedPacks.length})</span>
            </div>
            <span className="text-xs text-slate-300">
              Každý balíček obsahuje 5 kariet s rastúcim RQ.
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {profile.unopenedPacks.map((packId, idx) => {
              const pack = PACK_BY_ID[packId];
              return (
                <button
                  key={`${packId}-${idx}`}
                  type="button"
                  onClick={() => handleOpenUnopenedPack(idx)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <PackageOpen className="w-3.5 h-3.5" />
                  Otvoriť {pack?.name ?? packId}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Sort Toolbar */}
      <div className="rounded-xl border border-slate-800 bg-[#141922] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCatalogLimit(CATALOG_PAGE_SIZE);
              }}
              placeholder="Hľadať značku, model, krajinu alebo tag (napr. 90s JDM)..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Triediť vozidlá"
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
            onChange={(e) => {
              setRarityFilter(e.target.value);
              setCatalogLimit(CATALOG_PAGE_SIZE);
            }}
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
            onChange={(e) => {
              setBodyFilter(e.target.value);
              setCatalogLimit(CATALOG_PAGE_SIZE);
            }}
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
            onChange={(e) => {
              setDriveFilter(e.target.value);
              setCatalogLimit(CATALOG_PAGE_SIZE);
            }}
            aria-label="Pohon"
            className="px-2.5 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-slate-200"
          >
            <option value="ALL">Pohon: Všetky</option>
            <option value="FWD">FWD (Predný)</option>
            <option value="RWD">RWD (Zadný)</option>
            <option value="4WD">4WD / AWD</option>
          </select>

          <select
            value={tyreFilter}
            onChange={(e) => {
              setTyreFilter(e.target.value);
              setCatalogLimit(CATALOG_PAGE_SIZE);
            }}
            aria-label="Pneumatiky"
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
            onChange={(e) => {
              setClearanceFilter(e.target.value);
              setCatalogLimit(CATALOG_PAGE_SIZE);
            }}
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
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setCatalogLimit(CATALOG_PAGE_SIZE);
            }}
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
            onChange={(e) => {
              setDecadeFilter(e.target.value);
              setCatalogLimit(CATALOG_PAGE_SIZE);
            }}
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

      {/* Cards Grid */}
      {activeCount === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#141922] p-10 text-center space-y-2">
          <div className="font-display text-2xl font-bold text-white">
            Žiadne vozidlá nezodpovedajú filtrom
          </div>
          <p className="text-sm text-slate-400">
            Skús upraviť kritériá filtrovania alebo otvor nový balíček v Obchode.
          </p>
        </div>
      ) : viewMode === 'garage' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGarageCars.map((item) => {
            const spec = CAR_BY_ID[item.carId];
            if (!spec) return null;
            return (
              <CarCard
                key={item.instanceId}
                car={spec}
                tuning={item}
                settings={profile.settings}
                actionLabel="Detail & Tuning"
                onClick={() => setSelectedCar(item)}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-400 tabular-nums">
            <span>
              Nájdených <strong className="text-white">{filteredCatalogCars.length}</strong> vozidiel
              v katalógu (zobrazených {visibleCatalogCars.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleCatalogCars.map((spec) => {
              const ownedQty = ownedCountByCarId.get(spec.id) ?? 0;
              return (
                <CarCard
                  key={spec.id}
                  car={spec}
                  settings={profile.settings}
                  selected={ownedQty > 0}
                  actionLabel={ownedQty > 0 ? `Vlastníš (${ownedQty}×)` : 'Katalóg · Detail'}
                  onClick={() => setSelectedCatalogCar(spec)}
                />
              );
            })}
          </div>

          {visibleCatalogCars.length < filteredCatalogCars.length && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCatalogLimit((prev) => prev + CATALOG_PAGE_SIZE)}
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
              >
                Zobraziť ďalších {Math.min(CATALOG_PAGE_SIZE, filteredCatalogCars.length - visibleCatalogCars.length)} áut
              </button>
              <button
                type="button"
                onClick={() => setCatalogLimit(filteredCatalogCars.length)}
                className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Zobraziť všetky ({filteredCatalogCars.length})
              </button>
            </div>
          )}
        </div>
      )}

      {selectedCar && (
        <CarDetailModal playerCar={selectedCar} onClose={() => setSelectedCar(null)} />
      )}
      {selectedCatalogCar && (
        <CarDetailModal catalogCar={selectedCatalogCar} onClose={() => setSelectedCatalogCar(null)} />
      )}
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
