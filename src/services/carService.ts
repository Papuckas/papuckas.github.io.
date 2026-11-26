import { BASE_CAR_CATALOG } from '../data/cars';
import {
  BodyType,
  CarSpec,
  CountryCode,
  DriveType,
  GroundClearance,
  RarityTier,
  TyreType,
} from '../types/game';

export interface CarFilterCriteria {
  query?: string;
  rarity?: RarityTier | 'ALL';
  minRq?: number;
  maxRq?: number;
  driveType?: DriveType | 'ALL';
  tyreType?: TyreType | 'ALL';
  groundClearance?: GroundClearance | 'ALL';
  country?: CountryCode | 'ALL';
  bodyType?: BodyType | 'ALL';
  minYear?: number;
  maxYear?: number;
  tag?: string;
  hasAbs?: boolean;
  hasTc?: boolean;
  sortBy?: 'rq' | 'topSpeedMph' | 'accel0to60' | 'handling' | 'mra' | 'weightLbs' | 'year';
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface CarCatalogStats {
  total: number;
  byRarity: Record<RarityTier, number>;
}

interface TrimVariantProfile {
  suffix: string;
  yearDelta: number;
  rqDelta: number;
  topSpeedDelta: number;
  accelDelta: number;
  handlingDelta: number;
  mraDelta: number;
  weightDelta: number;
  olaDelta: number;
  tyreOverride?: TyreType;
  clearanceOverride?: GroundClearance;
  extraTag?: string;
}

const TRIM_VARIANTS: TrimVariantProfile[] = [
  {
    suffix: 'Sport Line',
    yearDelta: 1,
    rqDelta: 2,
    topSpeedDelta: 4,
    accelDelta: -0.3,
    handlingDelta: 2,
    mraDelta: 2,
    weightDelta: -45,
    olaDelta: 0.02,
    extraTag: 'Sport',
  },
  {
    suffix: 'Track Edition',
    yearDelta: 2,
    rqDelta: 4,
    topSpeedDelta: 6,
    accelDelta: -0.5,
    handlingDelta: 4,
    mraDelta: 3,
    weightDelta: -110,
    olaDelta: 0.04,
    tyreOverride: 'Performance',
    clearanceOverride: 'Low',
    extraTag: 'Track',
  },
  {
    suffix: 'Touring',
    yearDelta: -1,
    rqDelta: -2,
    topSpeedDelta: -3,
    accelDelta: 0.4,
    handlingDelta: -2,
    mraDelta: -2,
    weightDelta: 85,
    olaDelta: -0.02,
    tyreOverride: 'Standard',
    extraTag: 'City',
  },
  {
    suffix: 'Rally Spec',
    yearDelta: 0,
    rqDelta: 1,
    topSpeedDelta: -8,
    accelDelta: -0.2,
    handlingDelta: 1,
    mraDelta: -3,
    weightDelta: 40,
    olaDelta: 0.05,
    tyreOverride: 'All-Surface',
    clearanceOverride: 'High',
    extraTag: 'Rally',
  },
  {
    suffix: 'Clubsport',
    yearDelta: 3,
    rqDelta: 5,
    topSpeedDelta: 8,
    accelDelta: -0.6,
    handlingDelta: 5,
    mraDelta: 4,
    weightDelta: -150,
    olaDelta: 0.05,
    tyreOverride: 'Slick',
    clearanceOverride: 'Low',
    extraTag: 'Slick',
  },
];

function computeRarityForRq(rq: number): RarityTier {
  if (rq <= 19) return 'Common';
  if (rq <= 29) return 'Uncommon';
  if (rq <= 39) return 'Rare';
  if (rq <= 49) return 'Super Rare';
  if (rq <= 64) return 'Ultra Rare';
  if (rq <= 79) return 'Epic';
  return 'Legendary';
}

function buildInitialMockJson(targetCount = 1050): CarSpec[] {
  const entries: CarSpec[] = BASE_CAR_CATALOG.map((car) => ({
    ...car,
    tags: [...car.tags],
  }));

  let variantIdx = 0;
  while (entries.length < targetCount) {
    const base = BASE_CAR_CATALOG[variantIdx % BASE_CAR_CATALOG.length];
    const trim = TRIM_VARIANTS[Math.floor(variantIdx / BASE_CAR_CATALOG.length) % TRIM_VARIANTS.length];
    const editionCycle = Math.floor(
      variantIdx / (BASE_CAR_CATALOG.length * TRIM_VARIANTS.length)
    );
    const editionLabel = editionCycle > 0 ? ` Mk${editionCycle + 1}` : '';

    const nextRq = Math.max(10, Math.min(115, base.rq + trim.rqDelta + editionCycle));
    const nextYear = Math.max(1960, Math.min(2026, base.year + trim.yearDelta + editionCycle));
    const nextTopSpeed = Math.max(65, Number((base.topSpeedMph + trim.topSpeedDelta).toFixed(1)));
    const nextAccel = Math.max(1.6, Number((base.accel0to60 + trim.accelDelta).toFixed(2)));
    const nextHandling = Math.max(45, Math.min(110, base.handling + trim.handlingDelta));
    const nextMra = Math.max(30, Math.min(135, Number((base.mra + trim.mraDelta).toFixed(1))));
    const nextWeight = Math.max(1050, base.weightLbs + trim.weightDelta);
    const nextOla = Math.max(0.75, Math.min(1.35, Number((base.ola + trim.olaDelta).toFixed(3))));

    const tags = Array.from(
      new Set(trim.extraTag ? [...base.tags, trim.extraTag] : [...base.tags])
    );

    entries.push({
      ...base,
      id: `${base.id}_v${variantIdx + 1}`,
      model: `${base.model} ${trim.suffix}${editionLabel}`,
      year: nextYear,
      rq: nextRq,
      rarity: computeRarityForRq(nextRq),
      topSpeedMph: nextTopSpeed,
      accel0to60: nextAccel,
      handling: nextHandling,
      mra: nextMra,
      weightLbs: nextWeight,
      ola: nextOla,
      tyreType: trim.tyreOverride ?? base.tyreType,
      groundClearance: trim.clearanceOverride ?? base.groundClearance,
      tags,
    });

    variantIdx++;
  }

  return entries;
}

// Mock JSON structure containing 1,050 initial vehicle entries
const INITIAL_MOCK_CARS_JSON: CarSpec[] = buildInitialMockJson(1050);

// Mutable in-memory mock JSON database store
let mockCarDatabase: CarSpec[] = INITIAL_MOCK_CARS_JSON.map((car) => ({
  ...car,
  tags: [...car.tags],
}));

/**
 * Retrieve all vehicles currently stored in the mock JSON catalog.
 */
export function getAllCars(): CarSpec[] {
  return mockCarDatabase.map((car) => ({ ...car, tags: [...car.tags] }));
}

/**
 * Retrieve a single vehicle by its unique ID.
 */
export function getCarById(id: string): CarSpec | undefined {
  const found = mockCarDatabase.find((car) => car.id === id);
  return found ? { ...found, tags: [...found.tags] } : undefined;
}

/**
 * Add a new vehicle entry into the mock JSON catalog.
 */
export function addCar(input: Omit<CarSpec, 'id'> & { id?: string }): CarSpec {
  const baseSlug = `${input.make}_${input.model}_${input.year}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  let id = input.id?.trim() || baseSlug || `car_${Date.now()}`;

  if (mockCarDatabase.some((c) => c.id === id)) {
    id = `${id}_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(2, 5)}`;
  }

  const normalizedRq = Math.max(10, Math.min(120, Math.round(input.rq)));
  const newCar: CarSpec = {
    ...input,
    id,
    rq: normalizedRq,
    rarity: input.rarity || computeRarityForRq(normalizedRq),
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
  };

  mockCarDatabase = [newCar, ...mockCarDatabase];
  return { ...newCar, tags: [...newCar.tags] };
}

/**
 * Add multiple vehicles at once into the mock JSON catalog.
 */
export function addCarsBulk(inputs: (Omit<CarSpec, 'id'> & { id?: string })[]): CarSpec[] {
  return inputs.map((item) => addCar(item));
}

/**
 * Update an existing vehicle in the mock JSON catalog by ID.
 */
export function updateCar(id: string, patch: Partial<CarSpec>): CarSpec | undefined {
  const idx = mockCarDatabase.findIndex((car) => car.id === id);
  if (idx === -1) return undefined;

  const updated: CarSpec = {
    ...mockCarDatabase[idx],
    ...patch,
    id,
    tags: patch.tags ? [...patch.tags] : [...mockCarDatabase[idx].tags],
  };
  mockCarDatabase[idx] = updated;
  return { ...updated, tags: [...updated.tags] };
}

/**
 * Delete a vehicle from the mock JSON catalog by ID.
 */
export function deleteCar(id: string): boolean {
  const prevLen = mockCarDatabase.length;
  mockCarDatabase = mockCarDatabase.filter((car) => car.id !== id);
  return mockCarDatabase.length < prevLen;
}

/**
 * Filter and sort vehicles from the mock JSON catalog using flexible multi-criteria queries.
 */
export function filterCars(criteria: CarFilterCriteria = {}): CarSpec[] {
  const q = criteria.query?.trim().toLowerCase() ?? '';
  const tagQ = criteria.tag?.trim().toLowerCase() ?? '';

  const filtered = mockCarDatabase.filter((car) => {
    if (
      q &&
      !`${car.make} ${car.model} ${car.year} ${car.country} ${car.tags.join(' ')}`
        .toLowerCase()
        .includes(q)
    ) {
      return false;
    }
    if (criteria.rarity && criteria.rarity !== 'ALL' && car.rarity !== criteria.rarity) {
      return false;
    }
    if (typeof criteria.minRq === 'number' && car.rq < criteria.minRq) {
      return false;
    }
    if (typeof criteria.maxRq === 'number' && car.rq > criteria.maxRq) {
      return false;
    }
    if (criteria.driveType && criteria.driveType !== 'ALL' && car.driveType !== criteria.driveType) {
      return false;
    }
    if (criteria.tyreType && criteria.tyreType !== 'ALL' && car.tyreType !== criteria.tyreType) {
      return false;
    }
    if (
      criteria.groundClearance &&
      criteria.groundClearance !== 'ALL' &&
      car.groundClearance !== criteria.groundClearance
    ) {
      return false;
    }
    if (criteria.country && criteria.country !== 'ALL' && car.country !== criteria.country) {
      return false;
    }
    if (criteria.bodyType && criteria.bodyType !== 'ALL' && car.bodyType !== criteria.bodyType) {
      return false;
    }
    if (typeof criteria.minYear === 'number' && car.year < criteria.minYear) {
      return false;
    }
    if (typeof criteria.maxYear === 'number' && car.year > criteria.maxYear) {
      return false;
    }
    if (tagQ && !car.tags.some((t) => t.toLowerCase().includes(tagQ))) {
      return false;
    }
    if (typeof criteria.hasAbs === 'boolean' && car.hasAbs !== criteria.hasAbs) {
      return false;
    }
    if (typeof criteria.hasTc === 'boolean' && car.hasTc !== criteria.hasTc) {
      return false;
    }
    return true;
  });

  const sortBy = criteria.sortBy ?? 'rq';
  const defaultOrder = sortBy === 'accel0to60' || sortBy === 'weightLbs' ? 'asc' : 'desc';
  const sortOrder = criteria.sortOrder ?? defaultOrder;
  const dir = sortOrder === 'asc' ? 1 : -1;

  filtered.sort((a, b) => (a[sortBy] - b[sortBy]) * dir);

  const offset = Math.max(0, criteria.offset ?? 0);
  const limit = criteria.limit;
  const sliced = typeof limit === 'number' ? filtered.slice(offset, offset + limit) : filtered.slice(offset);

  return sliced.map((car) => ({ ...car, tags: [...car.tags] }));
}

/**
 * Get summary counts of all vehicles currently in the mock JSON catalog.
 */
export function getCatalogStats(): CarCatalogStats {
  const byRarity: Record<RarityTier, number> = {
    Common: 0,
    Uncommon: 0,
    Rare: 0,
    'Super Rare': 0,
    'Ultra Rare': 0,
    Epic: 0,
    Legendary: 0,
  };

  for (const car of mockCarDatabase) {
    byRarity[car.rarity] = (byRarity[car.rarity] ?? 0) + 1;
  }

  return {
    total: mockCarDatabase.length,
    byRarity,
  };
}

/**
 * Export the current mock vehicle catalog as a formatted JSON string.
 */
export function exportCarsAsJson(): string {
  return JSON.stringify(mockCarDatabase, null, 2);
}

/**
 * Reset the mock JSON store back to the 1,050 initial vehicle entries.
 */
export function resetMockCatalog(): void {
  mockCarDatabase = INITIAL_MOCK_CARS_JSON.map((car) => ({
    ...car,
    tags: [...car.tags],
  }));
}
