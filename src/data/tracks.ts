import { SurfaceType, Track, TrackArchetype, TrackCategory, TrackSector } from '../types/game';

interface ArchetypeBlueprint {
  archetype: TrackArchetype;
  displayName?: string;
  category: TrackCategory;
  distanceMeters: number;
  weightSpeed: number;
  weightHandling: number;
  hasSpeedBumps: boolean;
  isSteepClimb: boolean;
  isDeepTerrain: boolean;
  allowedSurfaces: SurfaceType[];
  sectors: TrackSector[];
}

export const ARCHETYPE_BLUEPRINTS: ArchetypeBlueprint[] = [
  // Drag (4)
  {
    archetype: '1/4 Mile Drag',
    displayName: '400 m Drag',
    category: 'Drag',
    distanceMeters: 400,
    weightSpeed: 0.96,
    weightHandling: 0.04,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Gravel', 'Snow', 'Ice'],
    sectors: [
      { name: 'Štart 0–50 km/h', kind: 'launch', lengthFraction: 0.25, speedWeight: 0.9, handlingWeight: 0.1 },
      { name: 'Rovinka 0–100 km/h', kind: 'straight', lengthFraction: 0.35, speedWeight: 0.95, handlingWeight: 0.05 },
      { name: 'MRA Šprint', kind: 'straight', lengthFraction: 0.4, speedWeight: 1.0, handlingWeight: 0.0 },
    ],
  },
  {
    archetype: '1/2 Mile Drag',
    displayName: '800 m Drag',
    category: 'Drag',
    distanceMeters: 800,
    weightSpeed: 0.98,
    weightHandling: 0.02,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Gravel', 'Snow'],
    sectors: [
      { name: 'Štart', kind: 'launch', lengthFraction: 0.18, speedWeight: 0.9, handlingWeight: 0.1 },
      { name: 'Zrýchlenie MRA', kind: 'straight', lengthFraction: 0.42, speedWeight: 0.98, handlingWeight: 0.02 },
      { name: 'Maximálna rýchlosť', kind: 'straight', lengthFraction: 0.4, speedWeight: 1.0, handlingWeight: 0.0 },
    ],
  },
  {
    archetype: '1 Mile Drag',
    displayName: '1,6 km Drag',
    category: 'Drag',
    distanceMeters: 1600,
    weightSpeed: 0.99,
    weightHandling: 0.01,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Snow'],
    sectors: [
      { name: 'Štart', kind: 'launch', lengthFraction: 0.12, speedWeight: 0.9, handlingWeight: 0.1 },
      { name: 'Stredné pásmo', kind: 'straight', lengthFraction: 0.38, speedWeight: 0.98, handlingWeight: 0.02 },
      { name: 'Koncová rovinka', kind: 'straight', lengthFraction: 0.5, speedWeight: 1.0, handlingWeight: 0.0 },
    ],
  },
  {
    archetype: 'Test Bowl',
    category: 'Drag',
    distanceMeters: 2200,
    weightSpeed: 0.94,
    weightHandling: 0.06,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Ice'],
    sectors: [
      { name: 'Rozbeh na ovál', kind: 'launch', lengthFraction: 0.15, speedWeight: 0.92, handlingWeight: 0.08 },
      { name: 'Klopený oblúk 1', kind: 'straight', lengthFraction: 0.35, speedWeight: 0.94, handlingWeight: 0.06 },
      { name: 'Klopený oblúk 2', kind: 'straight', lengthFraction: 0.5, speedWeight: 0.96, handlingWeight: 0.04 },
    ],
  },

  // Twisty (4)
  {
    archetype: 'Slalom Test',
    category: 'Twisty',
    distanceMeters: 540,
    weightSpeed: 0.24,
    weightHandling: 0.76,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Gravel', 'Snow', 'Ice'],
    sectors: [
      { name: 'Štart na letisku', kind: 'launch', lengthFraction: 0.14, speedWeight: 0.55, handlingWeight: 0.45 },
      { name: 'Slalom (6 kužeľov)', kind: 'slalom', lengthFraction: 0.44, speedWeight: 0.14, handlingWeight: 0.86 },
      { name: 'Otočka 180° (U-Turn)', kind: 'corner', lengthFraction: 0.16, speedWeight: 0.12, handlingWeight: 0.88 },
      { name: 'Cieľový šprint späť', kind: 'straight', lengthFraction: 0.26, speedWeight: 0.85, handlingWeight: 0.15 },
    ],
  },
  {
    archetype: 'G-Force Test',
    category: 'Twisty',
    distanceMeters: 480,
    weightSpeed: 0.14,
    weightHandling: 0.86,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Snow', 'Ice'],
    sectors: [
      { name: 'Nájazd', kind: 'launch', lengthFraction: 0.16, speedWeight: 0.4, handlingWeight: 0.6 },
      { name: 'Kruhové preťaženie', kind: 'corner', lengthFraction: 0.54, speedWeight: 0.1, handlingWeight: 0.9 },
      { name: 'Výjazd', kind: 'corner', lengthFraction: 0.3, speedWeight: 0.25, handlingWeight: 0.75 },
    ],
  },
  {
    archetype: 'Karting Circuit',
    category: 'Twisty',
    distanceMeters: 740,
    weightSpeed: 0.22,
    weightHandling: 0.78,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Gravel'],
    sectors: [
      { name: 'Štart', kind: 'launch', lengthFraction: 0.15, speedWeight: 0.5, handlingWeight: 0.5 },
      { name: 'Technické esíčko', kind: 'slalom', lengthFraction: 0.35, speedWeight: 0.2, handlingWeight: 0.8 },
      { name: 'Vracák', kind: 'corner', lengthFraction: 0.28, speedWeight: 0.15, handlingWeight: 0.85 },
      { name: 'Cieľová rovinka', kind: 'straight', lengthFraction: 0.22, speedWeight: 0.65, handlingWeight: 0.35 },
    ],
  },
  {
    archetype: 'Twisty Road',
    category: 'Twisty',
    distanceMeters: 1150,
    weightSpeed: 0.34,
    weightHandling: 0.66,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Gravel', 'Mud', 'Snow'],
    sectors: [
      { name: 'Štart', kind: 'launch', lengthFraction: 0.15, speedWeight: 0.6, handlingWeight: 0.4 },
      { name: 'Kľukaté zákruty', kind: 'corner', lengthFraction: 0.35, speedWeight: 0.25, handlingWeight: 0.75 },
      { name: 'Krátka rovinka', kind: 'straight', lengthFraction: 0.2, speedWeight: 0.75, handlingWeight: 0.25 },
      { name: 'Horská séria', kind: 'slalom', lengthFraction: 0.3, speedWeight: 0.25, handlingWeight: 0.75 },
    ],
  },

  // Circuit (3)
  {
    archetype: 'Fast Circuit',
    category: 'Circuit',
    distanceMeters: 1580,
    weightSpeed: 0.64,
    weightHandling: 0.36,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Snow'],
    sectors: [
      { name: 'Štart', kind: 'launch', lengthFraction: 0.14, speedWeight: 0.75, handlingWeight: 0.25 },
      { name: 'Tiahla rovinka', kind: 'straight', lengthFraction: 0.34, speedWeight: 0.9, handlingWeight: 0.1 },
      { name: 'Rýchla šikana', kind: 'corner', lengthFraction: 0.27, speedWeight: 0.4, handlingWeight: 0.6 },
      { name: 'Cieľový šprint', kind: 'straight', lengthFraction: 0.25, speedWeight: 0.85, handlingWeight: 0.15 },
    ],
  },
  {
    archetype: 'Tokyo Loop',
    category: 'Circuit',
    distanceMeters: 1720,
    weightSpeed: 0.68,
    weightHandling: 0.32,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt'],
    sectors: [
      { name: 'Nájazd na diaľnicu', kind: 'launch', lengthFraction: 0.14, speedWeight: 0.8, handlingWeight: 0.2 },
      { name: 'Mestská rovinka', kind: 'straight', lengthFraction: 0.36, speedWeight: 0.92, handlingWeight: 0.08 },
      { name: 'Tiahly zjazd', kind: 'corner', lengthFraction: 0.28, speedWeight: 0.45, handlingWeight: 0.55 },
      { name: 'Tunelový šprint', kind: 'straight', lengthFraction: 0.22, speedWeight: 0.9, handlingWeight: 0.1 },
    ],
  },
  {
    archetype: 'Forest Road',
    category: 'Circuit',
    distanceMeters: 1320,
    weightSpeed: 0.48,
    weightHandling: 0.52,
    hasSpeedBumps: false,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Gravel', 'Mud', 'Snow'],
    sectors: [
      { name: 'Štart', kind: 'launch', lengthFraction: 0.15, speedWeight: 0.65, handlingWeight: 0.35 },
      { name: 'Lesná rovinka', kind: 'straight', lengthFraction: 0.28, speedWeight: 0.78, handlingWeight: 0.22 },
      { name: 'Úzke zákruty', kind: 'corner', lengthFraction: 0.35, speedWeight: 0.3, handlingWeight: 0.7 },
      { name: 'Výjazd z lesa', kind: 'straight', lengthFraction: 0.22, speedWeight: 0.7, handlingWeight: 0.3 },
    ],
  },

  // Special & Offroad (3)
  {
    archetype: 'City Streets',
    category: 'City',
    distanceMeters: 1080,
    weightSpeed: 0.46,
    weightHandling: 0.54,
    hasSpeedBumps: true,
    isSteepClimb: false,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Snow'],
    sectors: [
      { name: 'Mestský štart', kind: 'launch', lengthFraction: 0.16, speedWeight: 0.65, handlingWeight: 0.35 },
      { name: 'Spomaľovač', kind: 'bump', lengthFraction: 0.22, speedWeight: 0.5, handlingWeight: 0.5 },
      { name: '90° križovatka', kind: 'corner', lengthFraction: 0.32, speedWeight: 0.25, handlingWeight: 0.75 },
      { name: 'Bulvár', kind: 'straight', lengthFraction: 0.3, speedWeight: 0.8, handlingWeight: 0.2 },
    ],
  },
  {
    archetype: 'Hill Climb',
    category: 'Offroad',
    distanceMeters: 1080,
    weightSpeed: 0.62,
    weightHandling: 0.38,
    hasSpeedBumps: false,
    isSteepClimb: true,
    isDeepTerrain: false,
    allowedSurfaces: ['Dry Asphalt', 'Wet Asphalt', 'Gravel', 'Mud', 'Snow', 'Ice'],
    sectors: [
      { name: 'Štart do strmého kopca', kind: 'launch', lengthFraction: 0.22, speedWeight: 0.72, handlingWeight: 0.28 },
      { name: 'Prudké stúpanie', kind: 'climb', lengthFraction: 0.48, speedWeight: 0.65, handlingWeight: 0.35 },
      { name: 'Vrcholový výjazd', kind: 'climb', lengthFraction: 0.30, speedWeight: 0.75, handlingWeight: 0.25 },
    ],
  },
  {
    archetype: 'Motocross Track',
    category: 'Offroad',
    distanceMeters: 960,
    weightSpeed: 0.38,
    weightHandling: 0.62,
    hasSpeedBumps: true,
    isSteepClimb: false,
    isDeepTerrain: true,
    allowedSurfaces: ['Gravel', 'Mud', 'Snow'],
    sectors: [
      { name: 'Terénny štart', kind: 'launch', lengthFraction: 0.18, speedWeight: 0.5, handlingWeight: 0.5 },
      { name: 'Skoky a nerovnosti', kind: 'offroad', lengthFraction: 0.42, speedWeight: 0.4, handlingWeight: 0.6 },
      { name: 'Blatistá zákruta', kind: 'corner', lengthFraction: 0.4, speedWeight: 0.25, handlingWeight: 0.75 },
    ],
  },
];

export const SURFACE_LABELS_SK: Record<SurfaceType, string> = {
  'Dry Asphalt': 'Suchý asfalt',
  'Wet Asphalt': 'Mokrý asfalt',
  Gravel: 'Štrk a hlina',
  Mud: 'Tráva a blato',
  Snow: 'Sneh',
  Ice: 'Ľad',
};

export const SURFACE_THEME: Record<
  SurfaceType,
  { roadHex: string; bgHex: string; stripeHex: string; accentText: string }
> = {
  'Dry Asphalt': {
    roadHex: '#2A303C',
    bgHex: '#12161E',
    stripeHex: '#94A3B8',
    accentText: 'text-slate-300',
  },
  'Wet Asphalt': {
    roadHex: '#1F2A3A',
    bgHex: '#0E1520',
    stripeHex: '#38BDF8',
    accentText: 'text-sky-400',
  },
  Gravel: {
    roadHex: '#5C4A3A',
    bgHex: '#201A14',
    stripeHex: '#D97706',
    accentText: 'text-amber-400',
  },
  Mud: {
    roadHex: '#433424',
    bgHex: '#1A1811',
    stripeHex: '#84CC16',
    accentText: 'text-lime-400',
  },
  Snow: {
    roadHex: '#94A3B8',
    bgHex: '#1E293B',
    stripeHex: '#E2E8F0',
    accentText: 'text-slate-100',
  },
  Ice: {
    roadHex: '#67E8F9',
    bgHex: '#0B1D26',
    stripeHex: '#CFFAFE',
    accentText: 'text-cyan-300',
  },
};

function slugifyId(archetype: TrackArchetype, surface: SurfaceType): string {
  return `${archetype}_${surface}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export const TRACK_CATALOG: Track[] = ARCHETYPE_BLUEPRINTS.flatMap((bp) =>
  bp.allowedSurfaces.map((surface) => ({
    id: slugifyId(bp.archetype, surface),
    name: bp.displayName ?? `${bp.archetype}`,
    archetype: bp.archetype,
    category: bp.category,
    surface,
    hasSpeedBumps: bp.hasSpeedBumps,
    isSteepClimb: bp.isSteepClimb,
    isDeepTerrain: bp.isDeepTerrain,
    distanceMeters: bp.distanceMeters,
    weightSpeed: bp.weightSpeed,
    weightHandling: bp.weightHandling,
    sectors: bp.sectors,
  }))
);

export const TRACK_BY_ID: Record<string, Track> = Object.fromEntries(
  TRACK_CATALOG.map((t) => [t.id, t])
);
