import React, { useMemo, useState } from 'react';
import { Plus, Upload, Trash2, Search, Download, Check, Copy, Pencil, RotateCcw, Save, X, ShieldCheck, Lock } from 'lucide-react';
import { CarCard } from '../components/CarCard';
import {
  BODY_TYPE_LABELS_SK,
  CAR_CATALOG,
  formatAccel0to100,
  formatSpeed,
  RARITY_COLORS,
  RARITY_ORDER,
} from '../data/cars';
import { useGame } from '../state/gameStore';
import {
  BodyType,
  CarSpec,
  CountryCode,
  DriveType,
  GroundClearance,
  RarityTier,
  TyreType,
} from '../types/game';

const COUNTRIES: CountryCode[] = ['USA', 'JPN', 'GER', 'GBR', 'ITA', 'FRA', 'SWE', 'KOR', 'CZE', 'AUS'];
const BODY_TYPES: BodyType[] = ['Hatchback', 'Coupe', 'Sedan', 'Combi', 'Supercar', 'SUV', 'Rally', 'Pickup', 'Track'];
const DRIVE_TYPES: DriveType[] = ['FWD', 'RWD', '4WD'];
const TYRE_TYPES: TyreType[] = ['Slick', 'Performance', 'Standard', 'All-Surface', 'Off-Road'];
const CLEARANCES: GroundClearance[] = ['Low', 'Medium', 'High'];

function suggestRarityFromRq(rq: number): RarityTier {
  if (rq <= 19) return 'Common';
  if (rq <= 29) return 'Uncommon';
  if (rq <= 39) return 'Rare';
  if (rq <= 49) return 'Super Rare';
  if (rq <= 64) return 'Ultra Rare';
  if (rq <= 79) return 'Epic';
  return 'Legendary';
}

export const AdminPage: React.FC = () => {
  const {
    profile,
    authUser,
    adminConfigured,
    claimAdmin,
    unlockAdmin,
    addCustomCar,
    importCustomCars,
    updateCarSpec,
    resetCarOverride,
    deleteCustomCar,
    grantCarToGarage,
  } = useGame();

  const [tab, setTab] = useState<'create' | 'catalog' | 'bulk'>('create');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [adminPass, setAdminPass] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);

  // Form state for new / edited car (metric inputs)
  const [make, setMake] = useState('Škoda');
  const [model, setModel] = useState('Octavia RS Combi 245');
  const [year, setYear] = useState(2023);
  const [rq, setRq] = useState(44);
  const [rarity, setRarity] = useState<RarityTier>('Super Rare');
  const [topSpeedKmh, setTopSpeedKmh] = useState(250);
  const [accel0to100, setAccel0to100] = useState(5.9);
  const [handling, setHandling] = useState(84);
  const [mra, setMra] = useState(76);
  const [weightKg, setWeightKg] = useState(1465);
  const [ola, setOla] = useState(1.03);
  const [driveType, setDriveType] = useState<DriveType>('FWD');
  const [tyreType, setTyreType] = useState<TyreType>('Performance');
  const [groundClearance, setGroundClearance] = useState<GroundClearance>('Medium');
  const [hasAbs, setHasAbs] = useState(true);
  const [hasTc, setHasTc] = useState(true);
  const [country, setCountry] = useState<CountryCode>('CZE');
  const [bodyType, setBodyType] = useState<BodyType>('Combi');
  const [tagsText, setTagsText] = useState('Euro, City');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [imageUrl, setImageUrl] = useState('');
  const [alsoAddToGarage, setAlsoAddToGarage] = useState(true);

  // Catalog search
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogRarity, setCatalogRarity] = useState<string>('ALL');
  const [grantedId, setGrantedId] = useState<string | null>(null);

  // Bulk import / SQL export
  const [bulkInput, setBulkInput] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const customIds = useMemo(
    () => new Set((profile.customCars ?? []).map((c) => c.id)),
    [profile.customCars]
  );

  const overrideMap = profile.carOverrides ?? {};

  const previewCar: CarSpec = {
    id: `custom_${make}_${model}_${year}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, ''),
    make: make.trim() || 'Značka',
    model: model.trim() || 'Model',
    year: Number(year) || 2024,
    rq: Math.max(10, Math.min(120, Number(rq) || 20)),
    rarity,
    topSpeedMph: Number((Math.max(70, Number(topSpeedKmh) || 190) / 1.60934).toFixed(1)),
    accel0to60: Number((Math.max(1.5, Number(accel0to100) || 7.2) / 1.038).toFixed(2)),
    handling: Math.max(30, Math.min(115, Number(handling) || 75)),
    mra: Math.max(20, Math.min(140, Number(mra) || 70)),
    weightLbs: Math.round(Math.max(450, Number(weightKg) || 1350) / 0.453592),
    ola: Math.max(0.6, Math.min(1.4, Number(ola) || 1.0)),
    driveType,
    tyreType,
    groundClearance,
    hasAbs,
    hasTc,
    country,
    bodyType,
    tags: tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    accentColor,
    imageUrl: imageUrl.trim() || undefined,
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const startEditCar = (car: CarSpec) => {
    setEditingCarId(car.id);
    setMake(car.make);
    setModel(car.model);
    setYear(car.year);
    setRq(car.rq);
    setRarity(car.rarity);
    setTopSpeedKmh(Math.round(car.topSpeedMph * 1.60934));
    setAccel0to100(Number((car.accel0to60 * 1.038).toFixed(2)));
    setHandling(car.handling);
    setMra(car.mra);
    setWeightKg(Math.round(car.weightLbs * 0.453592));
    setOla(car.ola);
    setDriveType(car.driveType);
    setTyreType(car.tyreType);
    setGroundClearance(car.groundClearance);
    setHasAbs(car.hasAbs);
    setHasTc(car.hasTc);
    setCountry(car.country);
    setBodyType(car.bodyType);
    setTagsText(car.tags.join(', '));
    setAccentColor(car.accentColor);
    setImageUrl(car.imageUrl ?? '');
    setStatusMsg(null);
    setTab('create');
  };

  const cancelEdit = () => {
    setEditingCarId(null);
  };

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPass.trim()) return;
    setAdminBusy(true);
    setStatusMsg(null);
    const res = adminConfigured
      ? await unlockAdmin(adminPass)
      : await claimAdmin(adminPass);
    setAdminBusy(false);
    if (!res.ok) {
      setStatusMsg({ type: 'err', text: res.error ?? 'Overenie správcu zlyhalo.' });
      return;
    }
    setAdminPass('');
    setStatusMsg({
      type: 'ok',
      text: adminConfigured
        ? 'Režim správcu odomknutý. Všetky úpravy sa ukladajú globálne pre všetkých hráčov.'
        : 'Heslo správcu bolo nastavené a režim správcu je aktívny.',
    });
  };

  const handleCreateCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.isAdmin) {
      setStatusMsg({ type: 'err', text: 'Pre globálnu úpravu katalógu najprv odomkni režim správcu.' });
      return;
    }
    if (!make.trim() || !model.trim()) return;
    if (editingCarId) {
      const updatedCar: CarSpec = {
        ...previewCar,
        id: editingCarId,
      };
      const res = await updateCarSpec(updatedCar);
      if (!res.ok) {
        setStatusMsg({ type: 'err', text: res.error ?? 'Uloženie zlyhalo.' });
        return;
      }
      setStatusMsg({
        type: 'ok',
        text: `Údaje vozidla ${updatedCar.make} ${updatedCar.model} boli globálne uložené.`,
      });
      setEditingCarId(null);
      setTab('catalog');
      return;
    }

    const uniqueCar: CarSpec = {
      ...previewCar,
      id: `${previewCar.id}_${Date.now().toString(36).slice(-4)}`,
    };
    const res = await addCustomCar(uniqueCar, alsoAddToGarage);
    if (!res.ok) {
      setStatusMsg({ type: 'err', text: res.error ?? 'Pridanie vozidla zlyhalo.' });
      return;
    }
    setStatusMsg({
      type: 'ok',
      text: `Vozidlo ${uniqueCar.make} ${uniqueCar.model} bolo pridané do globálneho katalógu${
        alsoAddToGarage ? ' aj do Mojej garáže' : ''
      }.`,
    });
  };

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    return CAR_CATALOG.filter((c) => {
      if (catalogRarity !== 'ALL' && c.rarity !== catalogRarity) return false;
      if (q && !`${c.make} ${c.model} ${c.tags.join(' ')} ${c.country}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    }).sort((a, b) => b.rq - a.rq);
  }, [catalogQuery, catalogRarity, profile.customCars, profile.carOverrides]);

  const rarityCounts = useMemo(() => {
    const map: Record<RarityTier, number> = {
      Common: 0,
      Uncommon: 0,
      Rare: 0,
      'Super Rare': 0,
      'Ultra Rare': 0,
      Epic: 0,
      Legendary: 0,
    };
    CAR_CATALOG.forEach((c) => {
      map[c.rarity] = (map[c.rarity] ?? 0) + 1;
    });
    return map;
  }, [profile.customCars, profile.carOverrides]);

  const handleBulkImport = async () => {
    setStatusMsg(null);
    if (!authUser?.isAdmin) {
      setStatusMsg({ type: 'err', text: 'Pre hromadný import najprv odomkni režim správcu.' });
      return;
    }
    const trimmed = bulkInput.trim();
    if (!trimmed) return;

    try {
      let parsedList: Partial<CarSpec>[] = [];
      if (trimmed.startsWith('[')) {
        parsedList = JSON.parse(trimmed);
      } else {
        // Parse CSV lines (metric): make,model,year,rq,topSpeedKmh,accel0to100,handling,mra,weightKg,driveType,tyreType,groundClearance,country,bodyType
        const lines = trimmed
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const startIdx = lines[0]?.toLowerCase().startsWith('make') ? 1 : 0;
        parsedList = lines.slice(startIdx).map((line) => {
          const cols = line.split(',').map((c) => c.trim());
          const rqNum = Number(cols[3]) || 25;
          const kmh = Number(cols[4]) || 210;
          const sec100 = Number(cols[5]) || 6.8;
          const kg = Number(cols[8]) || 1360;
          return {
            make: cols[0] || 'Custom',
            model: cols[1] || 'Model',
            year: Number(cols[2]) || 2020,
            rq: rqNum,
            rarity: suggestRarityFromRq(rqNum),
            topSpeedMph: Number((kmh / 1.60934).toFixed(1)),
            accel0to60: Number((sec100 / 1.038).toFixed(2)),
            handling: Number(cols[6]) || 78,
            mra: Number(cols[7]) || 70,
            weightLbs: Math.round(kg / 0.453592),
            driveType: (cols[9] as DriveType) || 'RWD',
            tyreType: (cols[10] as TyreType) || 'Performance',
            groundClearance: (cols[11] as GroundClearance) || 'Medium',
            country: (cols[12] as CountryCode) || 'GER',
            bodyType: (cols[13] as BodyType) || 'Coupe',
          };
        });
      }

      const validCars: CarSpec[] = parsedList
        .filter((p) => p.make && p.model)
        .map((p, idx) => {
          const rVal = Number(p.rq) || 25;
          const rawAny = p as Partial<CarSpec> & {
            topSpeedKmh?: number;
            accel0to100?: number;
            weightKg?: number;
          };
          return {
            id:
              p.id ||
              `imp_${p.make}_${p.model}_${Date.now()}_${idx}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_'),
            make: String(p.make),
            model: String(p.model),
            year: Number(p.year) || 2020,
            rq: rVal,
            rarity: p.rarity || suggestRarityFromRq(rVal),
            topSpeedMph:
              p.topSpeedMph ?? (rawAny.topSpeedKmh ? Number((rawAny.topSpeedKmh / 1.60934).toFixed(1)) : 130),
            accel0to60:
              p.accel0to60 ?? (rawAny.accel0to100 ? Number((rawAny.accel0to100 / 1.038).toFixed(2)) : 6.5),
            handling: Number(p.handling) || 78,
            mra: Number(p.mra) || 70,
            weightLbs:
              p.weightLbs ?? (rawAny.weightKg ? Math.round(rawAny.weightKg / 0.453592) : 3000),
            ola: Number(p.ola) || 1.0,
            driveType: p.driveType || 'RWD',
            tyreType: p.tyreType || 'Performance',
            groundClearance: p.groundClearance || 'Medium',
            hasAbs: p.hasAbs ?? true,
            hasTc: p.hasTc ?? true,
            country: p.country || 'GER',
            bodyType: p.bodyType || 'Coupe',
            tags: Array.isArray(p.tags) ? p.tags : ['Custom'],
            accentColor: p.accentColor || '#F59E0B',
            imageUrl: p.imageUrl,
          };
        });

      const res = await importCustomCars(validCars, alsoAddToGarage);
      if (!res.ok) {
        setStatusMsg({ type: 'err', text: res.error ?? 'Import zlyhal.' });
        return;
      }
      setStatusMsg({ type: 'ok', text: `Úspešne globálne naimportovaných ${res.count} vozidiel.` });
      setBulkInput('');
    } catch {
      setStatusMsg({ type: 'err', text: 'Chyba pri spracovaní JSON/CSV vstupu. Skontroluj formát.' });
    }
  };

  const generateMysqlSql = () => {
    const esc = (v: string) => v.replace(/'/g, "''");
    const rows = CAR_CATALOG.map(
      (c) =>
        `('${esc(c.make)}', '${esc(c.model)}', ${c.year}, ${c.rq}, '${c.rarity}', ${Math.round(c.topSpeedMph * 1.60934)}, ${(c.accel0to60 * 1.038).toFixed(2)}, ${c.handling}, ${c.mra}, ${Math.round(c.weightLbs * 0.453592)}, '${c.driveType}', '${c.tyreType}', '${c.groundClearance}', ${c.hasAbs ? 1 : 0}, ${c.hasTc ? 1 : 0}, ${c.imageUrl && !c.imageUrl.startsWith('data:') ? `'${esc(c.imageUrl)}'` : 'NULL'})`
    );
    return `INSERT INTO cars (make, model, year, rq, rarity, top_speed_kmh, accel_0_100, handling, mra, weight_kg, drive_type, tyre_type, ground_clearance, has_abs, has_tc, image_path) VALUES\n${rows.join(',\n')};`;
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(generateMysqlSql()).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    });
  };

  const handleDownloadSql = () => {
    const blob = new Blob([generateMysqlSql()], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cars_catalog_seed.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs text-amber-400 font-medium">
            Správa katalógu · Vstavané + vlastné vozidlá
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
            Admin katalóg vozidiel ({CAR_CATALOG.length})
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-300 tabular-nums">
          {RARITY_ORDER.map((r) => (
            <span key={r}>
              <span className={RARITY_COLORS[r].text}>{r}</span>:{' '}
              <strong className="font-mono">{rarityCounts[r]}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Admin Auth Status / Unlock Banner */}
      {!authUser?.isAdmin ? (
        <form
          onSubmit={handleAdminAuthSubmit}
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white">
                {adminConfigured
                  ? 'Overenie správcu pre globálne úpravy katalógu'
                  : 'Prvotné nastavenie hesla správcu'}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {adminConfigured
                  ? 'Katalóg môžeš prezerať. Na pridávanie alebo úpravu vozidiel pre všetkých hráčov zadaj heslo správcu.'
                  : 'Zatiaľ nie je nastavené heslo správcu. Zadaním hesla (min. 6 znakov) si odomkneš správu globálneho katalógu.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              required
              minLength={6}
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              placeholder={adminConfigured ? 'Heslo správcu...' : 'Nové heslo (min. 6 znakov)'}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-xs text-white placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={adminBusy}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {adminBusy ? 'Overujem...' : adminConfigured ? 'Odomknúť' : 'Nastaviť heslo'}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Overený správca · Všetky úpravy vozidiel a fotiek sa ukladajú globálne pre všetkých hráčov.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#141922] border border-slate-800">
        <button
          type="button"
          onClick={() => setTab('create')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'create' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
          }`}
        >
          {editingCarId ? 'Upraviť vozidlo' : 'Pridať nové vozidlo'}
        </button>
        <button
          type="button"
          onClick={() => setTab('catalog')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'catalog' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
          }`}
        >
          Celý katalóg ({CAR_CATALOG.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('bulk')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'bulk' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
          }`}
        >
          Hromadný Import & MySQL Export
        </button>
      </div>

      {statusMsg && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
            statusMsg.type === 'err'
              ? 'border-rose-500/40 bg-rose-950/35 text-rose-200'
              : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs underline cursor-pointer"
          >
            Skryť
          </button>
        </div>
      )}

      {/* TAB 1: CREATE OR EDIT VEHICLE */}
      {tab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateCar}
            className="lg:col-span-8 rounded-2xl border border-slate-800 bg-[#141922] p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  {editingCarId
                    ? `Úprava vozidla: ${make} ${model}`
                    : 'Parametre nového vozidla'}
                </h2>
                {editingCarId && (
                  <p className="text-xs text-amber-300 mt-0.5">
                    Upravuješ existujúce vozidlo (ID: {editingCarId}) vrátane fotky a parametrov.
                  </p>
                )}
              </div>
              {editingCarId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Zrušiť úpravu
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Značka (Make)</label>
                <input
                  type="text"
                  required
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Model</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rok výroby</label>
                <input
                  type="number"
                  min={1950}
                  max={2027}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">RQ (10–120)</label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={rq}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRq(val);
                    setRarity(suggestRarityFromRq(val));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Raritná trieda</label>
                <select
                  value={rarity}
                  onChange={(e) => setRarity(e.target.value as RarityTier)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                >
                  {RARITY_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max rýchlosť (km/h)</label>
                <input
                  type="number"
                  step="1"
                  min={70}
                  max={560}
                  value={topSpeedKmh}
                  onChange={(e) => setTopSpeedKmh(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">0–100 km/h (s)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1.5}
                  max={32}
                  value={accel0to100}
                  onChange={(e) => setAccel0to100(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Handling</label>
                <input
                  type="number"
                  min={30}
                  max={115}
                  value={handling}
                  onChange={(e) => setHandling(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">MRA (100–160 km/h)</label>
                <input
                  type="number"
                  step="0.5"
                  min={20}
                  max={140}
                  value={mra}
                  onChange={(e) => setMra(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Hmotnosť (kg)</label>
                <input
                  type="number"
                  min={450}
                  max={4800}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">OLA (0–50 km/h koef.)</label>
                <input
                  type="number"
                  step="0.02"
                  min={0.6}
                  max={1.4}
                  value={ola}
                  onChange={(e) => setOla(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pohon</label>
                <select
                  value={driveType}
                  onChange={(e) => setDriveType(e.target.value as DriveType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                >
                  {DRIVE_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pneumatiky</label>
                <select
                  value={tyreType}
                  onChange={(e) => setTyreType(e.target.value as TyreType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                >
                  {TYRE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Svetlá výška</label>
                <select
                  value={groundClearance}
                  onChange={(e) => setGroundClearance(e.target.value as GroundClearance)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                >
                  {CLEARANCES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Krajina</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Karoséria</label>
                <select
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value as BodyType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                >
                  {BODY_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {BODY_TYPE_LABELS_SK[b]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">
                  Tagy (oddelené čiarkou)
                </label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Farba siluety</label>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-700 bg-[#0E1219] p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Image Upload / URL */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-2 border-t border-slate-800">
              <div className="sm:col-span-7">
                <label className="block text-xs text-slate-400 mb-1">
                  Fotka vozidla (voliteľná URL alebo nahraj vlastný súbor)
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... alebo nahraj obrázok z disku"
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white placeholder:text-slate-500"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  Nahrať fotku z PC
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Checkboxes & Submit */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAbs}
                    onChange={(e) => setHasAbs(e.target.checked)}
                    className="accent-amber-500"
                  />
                  ABS
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTc}
                    onChange={(e) => setHasTc(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Traction Control (TC)
                </label>
                {!editingCarId && (
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alsoAddToGarage}
                      onChange={(e) => setAlsoAddToGarage(e.target.checked)}
                      className="accent-amber-500"
                    />
                    Pridať rovno aj do Mojej garáže
                  </label>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
              >
                {editingCarId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingCarId ? 'Uložiť zmeny vozidla' : 'Uložiť vozidlo do hry'}
              </button>
            </div>
          </form>

          {/* Live Card Preview */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-medium text-slate-400">Živý náhľad karty</div>
            <CarCard car={previewCar} settings={profile.settings} />
            <p className="text-xs text-slate-400 leading-relaxed">
              Všetky pridané vozidlá sa okamžite objavia v Obchode (balíčkoch kariet), v tíme
              súperov v Random Race a ak zaškrtneš možnosť nižšie, pribudnú rovno aj do tvojej
              garáže.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: FULL CATALOG */}
      {tab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder={`Hľadať v katalógu (${CAR_CATALOG.length} vozidiel)...`}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-[#141922] text-sm text-white"
              />
            </div>
            <select
              value={catalogRarity}
              onChange={(e) => setCatalogRarity(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-[#141922] text-xs text-white"
            >
              <option value="ALL">Všetky rarity ({CAR_CATALOG.length})</option>
              {RARITY_ORDER.map((r) => (
                <option key={r} value={r}>
                  {r} ({rarityCounts[r]})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#141922] overflow-hidden">
            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#181E2A] border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-medium">Vozidlo</th>
                    <th className="py-3 px-3 font-medium">RQ</th>
                    <th className="py-3 px-3 font-medium">Rarita</th>
                    <th className="py-3 px-3 font-medium">Top</th>
                    <th className="py-3 px-3 font-medium">0–100</th>
                    <th className="py-3 px-3 font-medium">Hdl</th>
                    <th className="py-3 px-3 font-medium">MRA</th>
                    <th className="py-3 px-3 font-medium">Spec</th>
                    <th className="py-3 px-4 font-medium text-right">Akcia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 tabular-nums">
                  {filteredCatalog.map((car) => {
                    const isCustom = customIds.has(car.id);
                    const isOverridden = Boolean(overrideMap[car.id]);
                    const justGranted = grantedId === car.id;
                    return (
                      <tr key={car.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-white">
                            {car.make} {car.model}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {car.year} · {car.country} · {BODY_TYPE_LABELS_SK[car.bodyType]}
                            {isCustom ? ' · Vlastné (Admin)' : ''}
                            {isOverridden ? ' · Upravené' : ''}
                            {car.imageUrl ? ' · Má fotku' : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{car.rq}</td>
                        <td className={`py-2.5 px-3 font-medium ${RARITY_COLORS[car.rarity].text}`}>
                          {car.rarity}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {formatSpeed(car.topSpeedMph)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {formatAccel0to100(car.accel0to60, 1)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{car.handling}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{car.mra}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {car.driveType} · {car.tyreType} · {car.groundClearance}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditCar(car)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-sky-300 font-medium transition-colors cursor-pointer"
                              title="Upraviť obrázok alebo údaje vozidla"
                            >
                              <Pencil className="w-3 h-3" />
                              Upraviť
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                grantCarToGarage(car.id);
                                setGrantedId(car.id);
                                setTimeout(() => setGrantedId(null), 1500);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-medium transition-colors cursor-pointer"
                            >
                              {justGranted ? 'Pridané' : '+ Do garáže'}
                            </button>
                            {isOverridden && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!authUser?.isAdmin) {
                                    setStatusMsg({ type: 'err', text: 'Pre obnovenie údajov najprv odomkni režim správcu.' });
                                    return;
                                  }
                                  const res = await resetCarOverride(car.id);
                                  if (!res.ok) {
                                    setStatusMsg({ type: 'err', text: res.error ?? 'Obnovenie zlyhalo.' });
                                    return;
                                  }
                                  setStatusMsg({
                                    type: 'ok',
                                    text: `Pôvodné údaje pre ${car.make} ${car.model} boli obnovené.`,
                                  });
                                }}
                                className="p-1.5 rounded text-amber-400 hover:bg-amber-950/60 transition-colors cursor-pointer"
                                title="Obnoviť pôvodné parametre"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isCustom && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!authUser?.isAdmin) {
                                    setStatusMsg({ type: 'err', text: 'Pre zmazanie vozidla najprv odomkni režim správcu.' });
                                    return;
                                  }
                                  const res = await deleteCustomCar(car.id);
                                  if (!res.ok) {
                                    setStatusMsg({ type: 'err', text: res.error ?? 'Zmazanie zlyhalo.' });
                                    return;
                                  }
                                  setStatusMsg({
                                    type: 'ok',
                                    text: `Vozidlo ${car.make} ${car.model} bolo odstránené z globálneho katalógu.`,
                                  });
                                }}
                                className="p-1.5 rounded text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                                title="Zmazať vlastné vozidlo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BULK IMPORT & SQL EXPORT */}
      {tab === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#141922] p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold text-white">
              Hromadný Import (CSV alebo JSON)
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vlož pole JSON objektov alebo CSV riadky vo formáte:{' '}
              <code className="font-mono text-amber-300">
                make,model,year,rq,topSpeedKmh,accel0to100,handling,mra,weightKg,driveType,tyreType,groundClearance,country,bodyType
              </code>
            </p>
            <textarea
              rows={8}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={`Škoda,Octavia RS Combi,2022,38,250,6.7,83,74,1470,FWD,Performance,Medium,CZE,Combi\nTatra,603-2,1969,16,160,13.7,64,49,1470,RWD,Standard,Medium,CZE,Sedan`}
              className="w-full p-3 rounded-lg border border-slate-700 bg-[#0E1219] text-xs font-mono text-slate-200"
            />
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoAddToGarage}
                  onChange={(e) => setAlsoAddToGarage(e.target.checked)}
                  className="accent-amber-500"
                />
                Pridať importované autá aj do garáže
              </label>
              <button
                type="button"
                onClick={handleBulkImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Importovať vozidlá
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#141922] p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold text-white">
              Export katalógu pre MySQL / MariaDB
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vygeneruje kompletný SQL <code className="font-mono text-slate-200">INSERT</code>{' '}
              skript pre všetkých <strong className="text-white">{CAR_CATALOG.length}</strong>{' '}
              vozidiel priamo do tvojej tabuľky <code className="font-mono text-slate-200">cars</code>{' '}
              pre PHP backend.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadSql}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Stiahnuť cars_catalog_seed.sql
              </button>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedSql ? 'Skopírované' : 'Kopírovať SQL do schránky'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
