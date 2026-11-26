import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  CAR_BY_ID,
  CAR_CATALOG,
  getCarSellValue,
  getUpgradeCost,
  MAX_BRANCH_LEVEL,
  MAX_TOTAL_UPGRADES,
  syncCustomCars,
} from '../data/cars';
import { PACK_BY_ID, rollPackCards, STARTER_GARAGE_CAR_IDS } from '../data/campaign';
import { getLevelProgress } from '../engine/progression';
import { generateRandomRaceScenario } from '../engine/randomizer';
import {
  claimAdminPasscode,
  fetchAdminStatus,
  fetchCurrentSession,
  fetchGlobalCatalog,
  loginAccount,
  loginAdminPasscode,
  logoutAccount,
  registerAccount,
  resetProfileOnServer,
  saveGlobalCatalog,
  saveProfileToServer,
} from '../lib/api';
import {
  AuthUser,
  CarSpec,
  DifficultyLevel,
  MatchSimulationResult,
  PlayerCar,
  PlayerProfile,
  PlayerSettings,
  RaceScenario,
} from '../types/game';

function makeInstanceId(carId: string): string {
  return `${carId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createInitialProfile(username = 'Jazdec'): PlayerProfile {
  return {
    username,
    cash: 5000,
    rqLevel: 175,
    xp: 0,
    level: 1,
    matchesPlayed: 0,
    randomRaceWins: 0,
    completedCampaignIds: [],
    completedChallengeIds: [],
    unopenedPacks: ['plastics'],
    garage: STARTER_GARAGE_CAR_IDS.map((carId) => ({
      instanceId: makeInstanceId(carId),
      carId,
      engineLvl: 0,
      weightLvl: 0,
      chassisLvl: 0,
      acquiredAt: Date.now(),
    })),
    customCars: [],
    carOverrides: {},
    activeRandomScenario: null,
    settings: {
      speedUnit: 'kmh',
      weightUnit: 'kg',
      animSpeed: 1,
      fps: 60,
      soundEnabled: true,
    },
  };
}

function normalizeLoadedProfile(
  raw: Partial<PlayerProfile> | null | undefined,
  globalCustomCars: CarSpec[],
  globalCarOverrides: Record<string, CarSpec>,
  fallbackUsername = 'Jazdec'
): PlayerProfile {
  const base = createInitialProfile(fallbackUsername);
  if (!raw || !Array.isArray(raw.garage) || raw.garage.length === 0) {
    return {
      ...base,
      customCars: globalCustomCars,
      carOverrides: globalCarOverrides,
    };
  }

  const existingXp =
    typeof raw.xp === 'number' && raw.xp >= 0
      ? raw.xp
      : Math.max(0, (raw.matchesPlayed ?? 0) * 65);
  const lvlInfo = getLevelProgress(existingXp);

  return {
    ...base,
    ...raw,
    username: raw.username || fallbackUsername,
    xp: existingXp,
    level: lvlInfo.level,
    rqLevel: Math.max(175, lvlInfo.rqLimit),
    unopenedPacks: Array.isArray(raw.unopenedPacks) ? raw.unopenedPacks : [],
    customCars: globalCustomCars,
    carOverrides: globalCarOverrides,
    settings: {
      ...base.settings,
      ...(raw.settings ?? {}),
      speedUnit: 'kmh',
      weightUnit: 'kg',
    },
  };
}

interface GameContextValue {
  profile: PlayerProfile;
  authUser: AuthUser | null;
  authLoading: boolean;
  adminConfigured: boolean;
  randomRaceUnlocked: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  claimAdmin: (passcode: string) => Promise<{ ok: boolean; error?: string }>;
  unlockAdmin: (passcode: string) => Promise<{ ok: boolean; error?: string }>;
  upgradeCar: (instanceId: string, branch: 'engineLvl' | 'weightLvl' | 'chassisLvl') => boolean;
  sellCar: (instanceId: string) => boolean;
  buyPack: (packId: string) => { ok: boolean; cars: CarSpec[]; error?: string };
  openRewardPack: (packId: string) => CarSpec[];
  openUnopenedPack: (packIndex: number) => { packId: string; cars: CarSpec[] } | null;
  recordMatchResult: (result: MatchSimulationResult, sourceId: string) => void;
  startRandomRace: (difficulty: DifficultyLevel) => RaceScenario;
  clearActiveRandomRace: () => void;
  updateSettings: (patch: Partial<PlayerSettings>) => void;
  addCustomCar: (car: CarSpec, alsoAddToGarage: boolean) => Promise<{ ok: boolean; error?: string }>;
  importCustomCars: (
    cars: CarSpec[],
    alsoAddToGarage: boolean
  ) => Promise<{ ok: boolean; count: number; error?: string }>;
  updateCarSpec: (car: CarSpec) => Promise<{ ok: boolean; error?: string }>;
  resetCarOverride: (carId: string) => Promise<{ ok: boolean; error?: string }>;
  deleteCustomCar: (carId: string) => Promise<{ ok: boolean; error?: string }>;
  grantCarToGarage: (carId: string) => void;
  resetProgress: () => Promise<void>;
  saveNow: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [adminConfigured, setAdminConfigured] = useState<boolean>(false);
  const [globalCatalog, setGlobalCatalog] = useState<{
    customCars: CarSpec[];
    carOverrides: Record<string, CarSpec>;
  }>({ customCars: [], carOverrides: {} });

  const [profile, setProfile] = useState<PlayerProfile>(() => createInitialProfile());
  const skipNextAutoSaveRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      let loadedCustom: CarSpec[] = [];
      let loadedOverrides: Record<string, CarSpec> = {};
      try {
        const cat = await fetchGlobalCatalog();
        loadedCustom = Array.isArray(cat.customCars) ? cat.customCars : [];
        loadedOverrides =
          cat.carOverrides && typeof cat.carOverrides === 'object' ? cat.carOverrides : {};
      } catch {
        // Fallback to empty global catalog
      }

      if (cancelled) return;
      syncCustomCars(loadedCustom, loadedOverrides);
      setGlobalCatalog({ customCars: loadedCustom, carOverrides: loadedOverrides });

      try {
        const adm = await fetchAdminStatus();
        if (!cancelled) setAdminConfigured(adm.configured);
      } catch {
        // Ignore
      }

      const session = await fetchCurrentSession();
      if (cancelled) return;
      if (session) {
        skipNextAutoSaveRef.current = true;
        setAuthUser(session.user);
        setProfile(
          normalizeLoadedProfile(
            session.profile,
            loadedCustom,
            loadedOverrides,
            session.user.username
          )
        );
      }
      setAuthLoading(false);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    syncCustomCars(globalCatalog.customCars, globalCatalog.carOverrides);
  }, [globalCatalog]);

  // Debounced server save for authenticated user profile
  useEffect(() => {
    if (!authUser) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveProfileToServer(profile).catch(() => {
        // Silent retry on next mutation
      });
    }, 400);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [profile, authUser]);

  const randomRaceUnlocked = profile.matchesPlayed >= 10;

  const login = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cat = await fetchGlobalCatalog().catch(() => globalCatalog);
      syncCustomCars(cat.customCars ?? [], cat.carOverrides ?? {});
      setGlobalCatalog({
        customCars: cat.customCars ?? [],
        carOverrides: cat.carOverrides ?? {},
      });

      const res = await loginAccount(username, password);
      skipNextAutoSaveRef.current = true;
      setAuthUser(res.user);
      setProfile(
        normalizeLoadedProfile(
          res.profile,
          cat.customCars ?? [],
          cat.carOverrides ?? {},
          res.user.username
        )
      );
      const adm = await fetchAdminStatus().catch(() => ({ configured: adminConfigured, isAdmin: false }));
      setAdminConfigured(adm.configured);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Prihlásenie zlyhalo.' };
    }
  };

  const register = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cat = await fetchGlobalCatalog().catch(() => globalCatalog);
      syncCustomCars(cat.customCars ?? [], cat.carOverrides ?? {});
      setGlobalCatalog({
        customCars: cat.customCars ?? [],
        carOverrides: cat.carOverrides ?? {},
      });

      const res = await registerAccount(username, password);
      skipNextAutoSaveRef.current = true;
      setAuthUser(res.user);
      setProfile(
        normalizeLoadedProfile(
          res.profile,
          cat.customCars ?? [],
          cat.carOverrides ?? {},
          res.user.username
        )
      );
      const adm = await fetchAdminStatus().catch(() => ({ configured: adminConfigured, isAdmin: false }));
      setAdminConfigured(adm.configured);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Registrácia zlyhala.' };
    }
  };

  const logout = async () => {
    if (authUser) {
      await saveProfileToServer(profile).catch(() => {});
    }
    await logoutAccount();
    setAuthUser(null);
    skipNextAutoSaveRef.current = true;
    setProfile(createInitialProfile());
  };

  const claimAdmin = async (passcode: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      await claimAdminPasscode(passcode);
      setAdminConfigured(true);
      setAuthUser((prev) => (prev ? { ...prev, isAdmin: true } : prev));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Nepodarilo sa nastaviť heslo.' };
    }
  };

  const unlockAdmin = async (passcode: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      await loginAdminPasscode(passcode);
      setAuthUser((prev) => (prev ? { ...prev, isAdmin: true } : prev));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Nesprávne heslo správcu.' };
    }
  };

  const upgradeCar = (
    instanceId: string,
    branch: 'engineLvl' | 'weightLvl' | 'chassisLvl'
  ): boolean => {
    let success = false;
    setProfile((prev) => {
      const idx = prev.garage.findIndex((g) => g.instanceId === instanceId);
      if (idx === -1) return prev;
      const item = prev.garage[idx];
      const spec = CAR_BY_ID[item.carId];
      if (!spec) return prev;

      const total = item.engineLvl + item.weightLvl + item.chassisLvl;
      const currentVal = item[branch];
      if (currentVal >= MAX_BRANCH_LEVEL || total >= MAX_TOTAL_UPGRADES) return prev;

      const cost = getUpgradeCost(spec, currentVal);
      if (prev.cash < cost) return prev;

      success = true;
      const nextGarage = [...prev.garage];
      nextGarage[idx] = { ...item, [branch]: currentVal + 1 };
      return {
        ...prev,
        cash: prev.cash - cost,
        garage: nextGarage,
      };
    });
    return success;
  };

  const sellCar = (instanceId: string): boolean => {
    let sold = false;
    setProfile((prev) => {
      if (prev.garage.length <= 5) return prev;
      const item = prev.garage.find((g) => g.instanceId === instanceId);
      if (!item) return prev;
      const spec = CAR_BY_ID[item.carId];
      if (!spec) return prev;
      const value = getCarSellValue(spec, item);
      sold = true;
      return {
        ...prev,
        cash: prev.cash + value,
        garage: prev.garage.filter((g) => g.instanceId !== instanceId),
      };
    });
    return sold;
  };

  const buyPack = (packId: string): { ok: boolean; cars: CarSpec[]; error?: string } => {
    const pack = PACK_BY_ID[packId];
    if (!pack) return { ok: false, cars: [], error: 'Balíček neexistuje.' };
    if (profile.cash < pack.price) {
      return { ok: false, cars: [], error: 'Nedostatok financií (Cash).' };
    }

    const cars = rollPackCards(packId, CAR_CATALOG);
    const newItems: PlayerCar[] = cars.map((car) => ({
      instanceId: makeInstanceId(car.id),
      carId: car.id,
      engineLvl: 0,
      weightLvl: 0,
      chassisLvl: 0,
      acquiredAt: Date.now(),
    }));

    setProfile((prev) => ({
      ...prev,
      cash: prev.cash - pack.price,
      garage: [...newItems, ...prev.garage],
    }));

    return { ok: true, cars };
  };

  const openRewardPack = (packId: string): CarSpec[] => {
    const cars = rollPackCards(packId, CAR_CATALOG);
    if (cars.length === 0) return [];
    const newItems: PlayerCar[] = cars.map((car) => ({
      instanceId: makeInstanceId(car.id),
      carId: car.id,
      engineLvl: 0,
      weightLvl: 0,
      chassisLvl: 0,
      acquiredAt: Date.now(),
    }));
    setProfile((prev) => {
      const nextUnopened = [...(prev.unopenedPacks ?? [])];
      const removeIdx = nextUnopened.lastIndexOf(packId);
      if (removeIdx !== -1) nextUnopened.splice(removeIdx, 1);
      return {
        ...prev,
        unopenedPacks: nextUnopened,
        garage: [...newItems, ...prev.garage],
      };
    });
    return cars;
  };

  const openUnopenedPack = (packIndex: number): { packId: string; cars: CarSpec[] } | null => {
    const list = profile.unopenedPacks ?? [];
    if (packIndex < 0 || packIndex >= list.length) return null;
    const packId = list[packIndex];
    const cars = rollPackCards(packId, CAR_CATALOG);
    if (cars.length === 0) return null;
    const newItems: PlayerCar[] = cars.map((car) => ({
      instanceId: makeInstanceId(car.id),
      carId: car.id,
      engineLvl: 0,
      weightLvl: 0,
      chassisLvl: 0,
      acquiredAt: Date.now(),
    }));
    setProfile((prev) => {
      const nextUnopened = [...(prev.unopenedPacks ?? [])];
      nextUnopened.splice(packIndex, 1);
      return {
        ...prev,
        unopenedPacks: nextUnopened,
        garage: [...newItems, ...prev.garage],
      };
    });
    return { packId, cars };
  };

  const recordMatchResult = (result: MatchSimulationResult, sourceId: string) => {
    setProfile((prev) => {
      const nextMatches = prev.matchesPlayed + 1;
      const nextXp = (prev.xp ?? 0) + (result.xpEarned ?? 50);
      const lvlInfo = getLevelProgress(nextXp);
      const completedCampaignIds =
        result.mode === 'campaign' &&
        result.playerWon &&
        !prev.completedCampaignIds.includes(sourceId)
          ? [...prev.completedCampaignIds, sourceId]
          : prev.completedCampaignIds;

      const completedChallengeIds =
        result.mode === 'challenge' &&
        result.playerWon &&
        !prev.completedChallengeIds.includes(sourceId)
          ? [...prev.completedChallengeIds, sourceId]
          : prev.completedChallengeIds;

      const nextUnopened =
        result.playerWon && result.bonusPackId
          ? [...(prev.unopenedPacks ?? []), result.bonusPackId]
          : prev.unopenedPacks ?? [];

      return {
        ...prev,
        cash: prev.cash + result.cashEarned,
        matchesPlayed: nextMatches,
        xp: nextXp,
        level: lvlInfo.level,
        rqLevel: lvlInfo.rqLimit,
        completedCampaignIds,
        completedChallengeIds,
        unopenedPacks: nextUnopened,
        randomRaceWins:
          result.mode === 'random_race' && result.playerWon
            ? prev.randomRaceWins + 1
            : prev.randomRaceWins,
        activeRandomScenario:
          result.mode === 'random_race' ? null : prev.activeRandomScenario,
      };
    });
  };

  const startRandomRace = (difficulty: DifficultyLevel): RaceScenario => {
    if (profile.activeRandomScenario && profile.activeRandomScenario.difficulty === difficulty) {
      return profile.activeRandomScenario;
    }
    const scenario = generateRandomRaceScenario(difficulty, profile.garage, profile.rqLevel);
    setProfile((prev) => ({
      ...prev,
      activeRandomScenario: scenario,
    }));
    return scenario;
  };

  const clearActiveRandomRace = () => {
    setProfile((prev) => ({
      ...prev,
      activeRandomScenario: null,
    }));
  };

  const updateSettings = (patch: Partial<PlayerSettings>) => {
    setProfile((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
      },
    }));
  };

  const persistGlobalCatalogState = async (
    nextCustom: CarSpec[],
    nextOverrides: Record<string, CarSpec>
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      await saveGlobalCatalog({ customCars: nextCustom, carOverrides: nextOverrides });
      syncCustomCars(nextCustom, nextOverrides);
      setGlobalCatalog({ customCars: nextCustom, carOverrides: nextOverrides });
      setProfile((prev) => ({
        ...prev,
        customCars: nextCustom,
        carOverrides: nextOverrides,
      }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Uloženie katalógu zlyhalo.' };
    }
  };

  const addCustomCar = async (
    car: CarSpec,
    alsoAddToGarage: boolean
  ): Promise<{ ok: boolean; error?: string }> => {
    const nextCustom = [car, ...globalCatalog.customCars.filter((c) => c.id !== car.id)];
    const res = await persistGlobalCatalogState(nextCustom, globalCatalog.carOverrides);
    if (!res.ok) return res;
    if (alsoAddToGarage) {
      setProfile((prev) => ({
        ...prev,
        garage: [
          {
            instanceId: makeInstanceId(car.id),
            carId: car.id,
            engineLvl: 0,
            weightLvl: 0,
            chassisLvl: 0,
            acquiredAt: Date.now(),
          },
          ...prev.garage,
        ],
      }));
    }
    return { ok: true };
  };

  const importCustomCars = async (
    cars: CarSpec[],
    alsoAddToGarage: boolean
  ): Promise<{ ok: boolean; count: number; error?: string }> => {
    if (cars.length === 0) return { ok: true, count: 0 };
    const incomingIds = new Set(cars.map((c) => c.id));
    const nextCustom = [...cars, ...globalCatalog.customCars.filter((c) => !incomingIds.has(c.id))];
    const res = await persistGlobalCatalogState(nextCustom, globalCatalog.carOverrides);
    if (!res.ok) return { ok: false, count: 0, error: res.error };

    if (alsoAddToGarage) {
      setProfile((prev) => ({
        ...prev,
        garage: [
          ...cars.map((car) => ({
            instanceId: makeInstanceId(car.id),
            carId: car.id,
            engineLvl: 0,
            weightLvl: 0,
            chassisLvl: 0,
            acquiredAt: Date.now(),
          })),
          ...prev.garage,
        ],
      }));
    }
    return { ok: true, count: cars.length };
  };

  const updateCarSpec = async (car: CarSpec): Promise<{ ok: boolean; error?: string }> => {
    const isCustom = globalCatalog.customCars.some((c) => c.id === car.id);
    if (isCustom) {
      const nextCustom = globalCatalog.customCars.map((c) => (c.id === car.id ? car : c));
      const nextOverrides = { ...globalCatalog.carOverrides };
      delete nextOverrides[car.id];
      return persistGlobalCatalogState(nextCustom, nextOverrides);
    }
    const nextOverrides = {
      ...globalCatalog.carOverrides,
      [car.id]: car,
    };
    return persistGlobalCatalogState(globalCatalog.customCars, nextOverrides);
  };

  const resetCarOverride = async (carId: string): Promise<{ ok: boolean; error?: string }> => {
    const nextOverrides = { ...globalCatalog.carOverrides };
    delete nextOverrides[carId];
    return persistGlobalCatalogState(globalCatalog.customCars, nextOverrides);
  };

  const deleteCustomCar = async (carId: string): Promise<{ ok: boolean; error?: string }> => {
    const nextCustom = globalCatalog.customCars.filter((c) => c.id !== carId);
    const nextOverrides = { ...globalCatalog.carOverrides };
    delete nextOverrides[carId];
    const res = await persistGlobalCatalogState(nextCustom, nextOverrides);
    if (!res.ok) return res;

    setProfile((prev) => {
      const filteredGarage = prev.garage.filter((g) => g.carId !== carId);
      return {
        ...prev,
        garage: filteredGarage.length >= 5 ? filteredGarage : prev.garage,
      };
    });
    return { ok: true };
  };

  const grantCarToGarage = (carId: string) => {
    if (!CAR_BY_ID[carId]) return;
    setProfile((prev) => ({
      ...prev,
      garage: [
        {
          instanceId: makeInstanceId(carId),
          carId,
          engineLvl: 0,
          weightLvl: 0,
          chassisLvl: 0,
          acquiredAt: Date.now(),
        },
        ...prev.garage,
      ],
    }));
  };

  const resetProgress = async () => {
    if (authUser) {
      try {
        const fresh = await resetProfileOnServer();
        skipNextAutoSaveRef.current = true;
        setProfile(
          normalizeLoadedProfile(
            fresh,
            globalCatalog.customCars,
            globalCatalog.carOverrides,
            authUser.username
          )
        );
        return;
      } catch {
        // Fallback below
      }
    }
    skipNextAutoSaveRef.current = true;
    setProfile(
      normalizeLoadedProfile(
        createInitialProfile(authUser?.username ?? 'Jazdec'),
        globalCatalog.customCars,
        globalCatalog.carOverrides,
        authUser?.username ?? 'Jazdec'
      )
    );
  };

  const saveNow = async () => {
    if (!authUser) return;
    await saveProfileToServer(profile).catch(() => {});
  };

  return (
    <GameContext.Provider
      value={{
        profile,
        authUser,
        authLoading,
        adminConfigured,
        randomRaceUnlocked,
        login,
        register,
        logout,
        claimAdmin,
        unlockAdmin,
        upgradeCar,
        sellCar,
        buyPack,
        openRewardPack,
        openUnopenedPack,
        recordMatchResult,
        startRandomRace,
        clearActiveRandomRace,
        updateSettings,
        addCustomCar,
        importCustomCars,
        updateCarSpec,
        resetCarOverride,
        deleteCustomCar,
        grantCarToGarage,
        resetProgress,
        saveNow,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
