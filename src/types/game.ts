export type RarityTier =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Super Rare'
  | 'Ultra Rare'
  | 'Epic'
  | 'Legendary';

export type DriveType = 'FWD' | 'RWD' | '4WD';

export type TyreType = 'Slick' | 'Performance' | 'Standard' | 'All-Surface' | 'Off-Road';

export type GroundClearance = 'Low' | 'Medium' | 'High';

export type CountryCode =
  | 'USA'
  | 'JPN'
  | 'GER'
  | 'GBR'
  | 'ITA'
  | 'FRA'
  | 'SWE'
  | 'KOR'
  | 'CZE'
  | 'AUS';

export type BodyType =
  | 'Hatchback'
  | 'Coupe'
  | 'Sedan'
  | 'Combi'
  | 'Supercar'
  | 'SUV'
  | 'Rally'
  | 'Pickup'
  | 'Track';

export interface CarSpec {
  id: string;
  make: string;
  model: string;
  year: number;
  rq: number;
  rarity: RarityTier;
  topSpeedMph: number;
  accel0to60: number;
  handling: number;
  mra: number; // Mid-Range Acceleration (60-100 mph), e.g. 45 - 115
  weightLbs: number;
  ola: number; // Off-the-Line Acceleration (0-30 mph factor), e.g. 0.75 - 1.30
  driveType: DriveType;
  tyreType: TyreType;
  groundClearance: GroundClearance;
  hasAbs: boolean;
  hasTc: boolean;
  country: CountryCode;
  bodyType: BodyType;
  tags: string[];
  accentColor: string;
  imageUrl?: string;
}

export interface TuningLevels {
  engineLvl: number; // 0 to 9
  weightLvl: number; // 0 to 9
  chassisLvl: number; // 0 to 9
}

export interface PlayerCar extends TuningLevels {
  instanceId: string;
  carId: string;
  acquiredAt: number;
}

export interface EffectiveCarStats {
  topSpeedMph: number;
  accel0to60: number;
  handling: number;
  mra: number;
  weightLbs: number;
  ola: number;
  totalUpgrades: number;
  buildCode: string;
}

export type SurfaceType =
  | 'Dry Asphalt'
  | 'Wet Asphalt'
  | 'Gravel'
  | 'Mud'
  | 'Snow'
  | 'Ice';

export type TrackCategory = 'Drag' | 'Twisty' | 'Circuit' | 'City' | 'Offroad';

export type TrackArchetype =
  | '1/4 Mile Drag'
  | '1/2 Mile Drag'
  | '1 Mile Drag'
  | 'Test Bowl'
  | 'Slalom Test'
  | 'G-Force Test'
  | 'Karting Circuit'
  | 'Twisty Road'
  | 'Fast Circuit'
  | 'Tokyo Loop'
  | 'Forest Road'
  | 'City Streets'
  | 'Hill Climb'
  | 'Motocross Track';

export type SectorKind = 'launch' | 'straight' | 'corner' | 'slalom' | 'bump' | 'climb' | 'offroad';

export interface TrackSector {
  name: string;
  kind: SectorKind;
  lengthFraction: number; // sum to 1.0
  speedWeight: number;
  handlingWeight: number;
}

export interface Track {
  id: string;
  name: string;
  archetype: TrackArchetype;
  category: TrackCategory;
  surface: SurfaceType;
  hasSpeedBumps: boolean;
  isSteepClimb: boolean;
  isDeepTerrain: boolean;
  distanceMeters: number;
  weightSpeed: number;
  weightHandling: number;
  sectors: TrackSector[];
}

export type DifficultyLevel = 'Peaceful' | 'Easy' | 'Medium' | 'Extreme' | 'Impossible';

export type CampaignRegion = 'USA' | 'Európa' | 'Ázia';

export interface CampaignStage {
  id: string;
  region: CampaignRegion;
  stageNumber: number;
  title: string;
  subtitle: string;
  rqLimit: number;
  trackIds: string[];
  aiCarIds: string[];
  cashReward: number;
  firstClearPackId?: string;
}

export interface ChallengeSpec {
  id: string;
  title: string;
  subtitle: string;
  ruleSummary: string;
  rqLimit: number;
  trackIds: string[];
  aiCarIds: string[];
  cashReward: number;
  bonusPackId?: string;
  filterCheck: (car: CarSpec) => boolean;
}

export interface RaceRoundSetup {
  roundNumber: number; // 1 to 5
  trackId: string;
  aiCarId: string;
  aiTuning: TuningLevels;
}

export interface RaceScenario {
  id: string;
  mode: 'campaign' | 'challenge' | 'random_race';
  title: string;
  subtitle: string;
  sourceId: string; // stage id, challenge id, or random seed id
  difficulty?: DifficultyLevel;
  rqLimit: number;
  cashRewardBase: number;
  bonusPackId?: string;
  rounds: RaceRoundSetup[];
}

export interface ProgressSample {
  tNorm: number; // 0 to 1 of total round display time
  playerProgress: number; // 0 to 1
  aiProgress: number; // 0 to 1
  playerSpeedMs: number; // instantaneous physical speed in m/s
  aiSpeedMs: number; // instantaneous physical speed in m/s
}

export interface SectorResult {
  name: string;
  kind: SectorKind;
  playerTime: number;
  aiTime: number;
}

export interface RoundSimulationResult {
  roundNumber: number;
  track: Track;
  playerCar: CarSpec;
  playerTuning: TuningLevels;
  playerStats: EffectiveCarStats;
  aiCar: CarSpec;
  aiTuning: TuningLevels;
  aiStats: EffectiveCarStats;
  playerTime: number;
  aiTime: number;
  playerPeakSpeedMs: number;
  aiPeakSpeedMs: number;
  playerDnf: boolean;
  aiDnf: boolean;
  playerDnfReason?: string;
  aiDnfReason?: string;
  playerDnfAtProgress: number; // 0..1
  aiDnfAtProgress: number; // 0..1
  playerPoints: number;
  aiPoints: number;
  winner: 'player' | 'ai' | 'draw';
  sectors: SectorResult[];
  timeline: ProgressSample[];
}

export interface MatchSimulationResult {
  scenarioId: string;
  mode: RaceScenario['mode'];
  title: string;
  rounds: RoundSimulationResult[];
  playerTotalScore: number;
  aiTotalScore: number;
  playerWon: boolean;
  cashEarned: number;
  xpEarned: number;
  bonusPackId?: string;
}

export type PackSlotOdds = Partial<Record<RarityTier, number>>[];

export interface CardPack {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  cardCount: number;
  guaranteedMinRarity: RarityTier;
  odds: Partial<Record<RarityTier, number>>;
  slotOdds?: PackSlotOdds;
  maxLegendaries?: number;
  accentColor: string;
}

export interface PlayerSettings {
  speedUnit: 'mph' | 'kmh';
  weightUnit: 'lbs' | 'kg';
  animSpeed: 1 | 2;
  fps: 30 | 60;
  soundEnabled: boolean;
}

export interface AuthUser {
  username: string;
  isAdmin: boolean;
}

export interface PlayerProfile {
  username: string;
  cash: number;
  rqLevel: number; // Current RQ Limit ceiling (starts at 175)
  xp: number;
  level: number;
  matchesPlayed: number;
  randomRaceWins: number;
  completedCampaignIds: string[];
  completedChallengeIds: string[];
  unopenedPacks: string[];
  garage: PlayerCar[];
  customCars: CarSpec[];
  carOverrides?: Record<string, CarSpec>;
  activeRandomScenario: RaceScenario | null;
  settings: PlayerSettings;
}

export type AppRoute =
  | '/mainmenu.php'
  | '/garage.php'
  | '/shop.php'
  | '/campaign.php'
  | '/challenges.php'
  | '/random_race.php'
  | '/settings.php'
  | '/admin.php';
