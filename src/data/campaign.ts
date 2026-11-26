import { CampaignStage, CardPack, CarSpec, ChallengeSpec, RarityTier } from '../types/game';

const RARITY_RANK: Record<RarityTier, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  'Super Rare': 3,
  'Ultra Rare': 4,
  Epic: 5,
  Legendary: 6,
};

export const CARD_PACKS: CardPack[] = [
  {
    id: 'plastics',
    name: 'Plastics Pack',
    subtitle: '5 kariet · stúpajúce RQ od Common po garantované Uncommon / Rare',
    price: 3200,
    cardCount: 5,
    guaranteedMinRarity: 'Uncommon',
    odds: {
      Common: 62.8,
      Uncommon: 34.0,
      Rare: 3.2,
    },
    slotOdds: [
      { Common: 100 },
      { Common: 88, Uncommon: 12 },
      { Common: 74, Uncommon: 26 },
      { Common: 52, Uncommon: 44, Rare: 4 },
      { Uncommon: 88, Rare: 12 },
    ],
    maxLegendaries: 0,
    accentColor: '#94A3B8',
  },
  {
    id: 'steel',
    name: 'Steel Pack',
    subtitle: '5 kariet · od Common/Uncommon až po garantované Rare / Super Rare',
    price: 7500,
    cardCount: 5,
    guaranteedMinRarity: 'Rare',
    odds: {
      Common: 32.0,
      Uncommon: 40.8,
      Rare: 24.4,
      'Super Rare': 2.8,
    },
    slotOdds: [
      { Common: 75, Uncommon: 25 },
      { Common: 55, Uncommon: 45 },
      { Common: 30, Uncommon: 62, Rare: 8 },
      { Uncommon: 72, Rare: 28 },
      { Rare: 86, 'Super Rare': 14 },
    ],
    maxLegendaries: 0,
    accentColor: '#10B981',
  },
  {
    id: 'aluminum',
    name: 'Aluminum Pack',
    subtitle: '5 kariet · silný základ s garanciou Rare a šancou na Ultra Rare',
    price: 14000,
    cardCount: 5,
    guaranteedMinRarity: 'Rare',
    odds: {
      Common: 10,
      Uncommon: 38,
      Rare: 38,
      'Super Rare': 12.8,
      'Ultra Rare': 1.2,
    },
    slotOdds: [
      { Common: 50, Uncommon: 50 },
      { Uncommon: 82, Rare: 18 },
      { Uncommon: 58, Rare: 42 },
      { Rare: 78, 'Super Rare': 22 },
      { Rare: 52, 'Super Rare': 42, 'Ultra Rare': 6 },
    ],
    maxLegendaries: 0,
    accentColor: '#38BDF8',
  },
  {
    id: 'ceramic',
    name: 'Ceramic Pack',
    subtitle: '5 kariet · od Uncommon cez Super Rare až po šancu na Epic a Legendary',
    price: 32000,
    cardCount: 5,
    guaranteedMinRarity: 'Super Rare',
    odds: {
      Uncommon: 29,
      Rare: 32.6,
      'Super Rare': 31.2,
      'Ultra Rare': 6.2,
      Epic: 0.9,
      Legendary: 0.1,
    },
    slotOdds: [
      { Uncommon: 100 },
      { Uncommon: 45, Rare: 55 },
      { Rare: 76, 'Super Rare': 24 },
      { Rare: 32, 'Super Rare': 58, 'Ultra Rare': 10 },
      { 'Super Rare': 74, 'Ultra Rare': 21, Epic: 4.5, Legendary: 0.5 },
    ],
    maxLegendaries: 1,
    accentColor: '#F59E0B',
  },
  {
    id: 'carbon_fiber',
    name: 'Carbon Fiber Pack',
    subtitle: '5 kariet · prémiový balíček s garanciou Ultra Rare alebo vyššou',
    price: 54000,
    cardCount: 5,
    guaranteedMinRarity: 'Ultra Rare',
    odds: {
      Rare: 29.6,
      'Super Rare': 26.4,
      'Ultra Rare': 36.7,
      Epic: 6.64,
      Legendary: 0.66,
    },
    slotOdds: [
      { Rare: 100 },
      { Rare: 48, 'Super Rare': 52 },
      { 'Super Rare': 62, 'Ultra Rare': 38 },
      { 'Super Rare': 18, 'Ultra Rare': 66, Epic: 15.2, Legendary: 0.8 },
      { 'Ultra Rare': 79.5, Epic: 18, Legendary: 2.5 },
    ],
    maxLegendaries: 3,
    accentColor: '#A78BFA',
  },
];

export const PACK_BY_ID: Record<string, CardPack> = Object.fromEntries(
  CARD_PACKS.map((p) => [p.id, p])
);

export const CAMPAIGN_STAGES: CampaignStage[] = [
  // ================= USA =================
  {
    id: 'usa_1',
    region: 'USA',
    stageNumber: 1,
    title: 'Detroit Boulevard',
    subtitle: 'Úvodný mestský duel na suchom aj mokrom asfalte',
    rqLimit: 165,
    trackIds: [
      '1_4_mile_drag_dry_asphalt',
      'city_streets_dry_asphalt',
      'slalom_test_dry_asphalt',
      'fast_circuit_wet_asphalt',
      '1_2_mile_drag_dry_asphalt',
    ],
    aiCarIds: [
      'ford_crown_vic',
      'honda_civic_eg',
      'vw_golf_mk3_tdi',
      'subaru_gl_wagon',
      'fiat_panda_4x4',
    ],
    cashReward: 2400,
    firstClearPackId: 'plastics',
  },
  {
    id: 'usa_2',
    region: 'USA',
    stageNumber: 2,
    title: 'Route 66 Muscle',
    subtitle: 'Dlhé rovinky a štrkové okresky juhozápadu',
    rqLimit: 175,
    trackIds: [
      '1_mile_drag_dry_asphalt',
      'twisty_road_gravel',
      'test_bowl_dry_asphalt',
      'city_streets_wet_asphalt',
      'g_force_test_dry_asphalt',
    ],
    aiCarIds: [
      'chevy_camaro_z28',
      'ford_f150_svt',
      'dodge_charger_rt',
      'bmw_e30_325is',
      'mazda_miata_na',
    ],
    cashReward: 2600,
    firstClearPackId: 'steel',
  },
  {
    id: 'usa_3',
    region: 'USA',
    stageNumber: 3,
    title: 'Moab Canyon Trail',
    subtitle: 'Náročný terén, blato a prudké stúpania',
    rqLimit: 175,
    trackIds: [
      'motocross_track_mud',
      'hill_climb_gravel',
      '1_4_mile_drag_dry_asphalt',
      'forest_road_gravel',
      'city_streets_dry_asphalt',
    ],
    aiCarIds: [
      'jeep_grand_cherokee_59',
      'ford_f150_raptor',
      'chevy_camaro_z28',
      'toyota_hilux_arctic',
      'renault_clio_cup',
    ],
    cashReward: 3800,
    firstClearPackId: 'aluminum',
  },
  {
    id: 'usa_4',
    region: 'USA',
    stageNumber: 4,
    title: 'Bonneville & Laguna',
    subtitle: 'Súboj maximálnej rýchlosti a okruhovej presnosti',
    rqLimit: 245,
    trackIds: [
      'test_bowl_dry_asphalt',
      'fast_circuit_dry_asphalt',
      '1_mile_drag_dry_asphalt',
      'karting_circuit_dry_asphalt',
      'city_streets_wet_asphalt',
    ],
    aiCarIds: [
      'dodge_challenger_hellcat',
      'caterham_r500',
      'ford_mustang_mach1',
      'bmw_m3_e46',
      'volvo_v60_polestar',
    ],
    cashReward: 5600,
    firstClearPackId: 'ceramic',
  },
  {
    id: 'usa_5',
    region: 'USA',
    stageNumber: 5,
    title: 'Amerika Finále: Pikes Peak',
    subtitle: 'Elitná skúška cez asfalt, sneh a rekordné rovinky',
    rqLimit: 325,
    trackIds: [
      'hill_climb_snow',
      '1_mile_drag_dry_asphalt',
      'fast_circuit_dry_asphalt',
      'motocross_track_gravel',
      'city_streets_dry_asphalt',
    ],
    aiCarIds: [
      'ram_trx',
      'hennessey_venom_f5',
      'ford_gt_race',
      'ford_f150_raptor',
      'ford_mustang_mach1',
    ],
    cashReward: 9500,
    firstClearPackId: 'carbon_fiber',
  },

  // ================= EURÓPA =================
  {
    id: 'eur_1',
    region: 'Európa',
    stageNumber: 1,
    title: 'Alpský štart',
    subtitle: 'Úvod do európskych zákrut a premávkových ulíc',
    rqLimit: 165,
    trackIds: [
      'karting_circuit_dry_asphalt',
      'city_streets_dry_asphalt',
      'forest_road_wet_asphalt',
      '1_4_mile_drag_dry_asphalt',
      'slalom_test_wet_asphalt',
    ],
    aiCarIds: [
      'peugeot_205_gti',
      'vw_golf_mk3_tdi',
      'fiat_panda_4x4',
      'bmw_e30_325is',
      'land_rover_defender',
    ],
    cashReward: 2100,
    firstClearPackId: 'plastics',
  },
  {
    id: 'eur_2',
    region: 'Európa',
    stageNumber: 2,
    title: 'Britský dážď',
    subtitle: 'Klzké asfaltové okruhy a lesné šotoliny',
    rqLimit: 175,
    trackIds: [
      'twisty_road_wet_asphalt',
      'g_force_test_wet_asphalt',
      'forest_road_gravel',
      '1_2_mile_drag_wet_asphalt',
      'karting_circuit_dry_asphalt',
    ],
    aiCarIds: [
      'renault_clio_cup',
      'lotus_elise_s1',
      'ford_escort_rs_cosworth',
      'land_rover_defender',
      'subaru_forester_xt',
    ],
    cashReward: 3200,
    firstClearPackId: 'steel',
  },
  {
    id: 'eur_3',
    region: 'Európa',
    stageNumber: 3,
    title: 'Škandinávsky ľad',
    subtitle: 'Snehové a ľadové pasáže preveria 4WD aj hmotnosť',
    rqLimit: 205,
    trackIds: [
      'forest_road_snow',
      'slalom_test_ice',
      'hill_climb_snow',
      'city_streets_snow',
      '1_4_mile_drag_snow',
    ],
    aiCarIds: [
      'audi_quattro_ur',
      'volvo_v60_polestar',
      'lancia_delta_s4',
      'toyota_hilux_arctic',
      'fiat_panda_4x4',
    ],
    cashReward: 4600,
    firstClearPackId: 'aluminum',
  },
  {
    id: 'eur_4',
    region: 'Európa',
    stageNumber: 4,
    title: 'Nürburgring & Autobahny',
    subtitle: 'Technické okruhy a vysokorýchlostné prejazdy',
    rqLimit: 270,
    trackIds: [
      'fast_circuit_dry_asphalt',
      'test_bowl_dry_asphalt',
      'slalom_test_dry_asphalt',
      'twisty_road_wet_asphalt',
      'city_streets_dry_asphalt',
    ],
    aiCarIds: [
      'porsche_911_gt3_997',
      'bmw_m3_e46',
      'audi_rs4_b9',
      'ariel_atom_v8',
      'lotus_elise_s1',
    ],
    cashReward: 6800,
    firstClearPackId: 'ceramic',
  },
  {
    id: 'eur_5',
    region: 'Európa',
    stageNumber: 5,
    title: 'Európa Finále: Le Mans & Dakar',
    subtitle: 'Hyperšporty na okruhu a rally monštrá v blate',
    rqLimit: 360,
    trackIds: [
      '1_mile_drag_dry_asphalt',
      'fast_circuit_dry_asphalt',
      'motocross_track_mud',
      'g_force_test_dry_asphalt',
      'hill_climb_gravel',
    ],
    aiCarIds: [
      'mclaren_720s',
      'porsche_718_gt4_rs',
      'porsche_959_dakar',
      'ariel_atom_v8',
      'ford_fiesta_wrc',
    ],
    cashReward: 11500,
    firstClearPackId: 'carbon_fiber',
  },

  // ================= ÁZIA =================
  {
    id: 'asia_1',
    region: 'Ázia',
    stageNumber: 1,
    title: 'Osaka Kanjo',
    subtitle: 'Ľahké japonské hatchbacky v uliciach mesta',
    rqLimit: 170,
    trackIds: [
      'tokyo_loop_dry_asphalt',
      'city_streets_dry_asphalt',
      'karting_circuit_dry_asphalt',
      '1_4_mile_drag_dry_asphalt',
      'slalom_test_dry_asphalt',
    ],
    aiCarIds: [
      'honda_civic_eg',
      'honda_crx_vtec',
      'mazda_miata_na',
      'suzuki_jimny',
      'subaru_gl_wagon',
    ],
    cashReward: 2300,
    firstClearPackId: 'plastics',
  },
  {
    id: 'asia_2',
    region: 'Ázia',
    stageNumber: 2,
    title: 'Hakone Touge',
    subtitle: 'Nočné horské zákruty na suchom i mokrom povrchu',
    rqLimit: 175,
    trackIds: [
      'twisty_road_dry_asphalt',
      'twisty_road_wet_asphalt',
      'hill_climb_dry_asphalt',
      'g_force_test_dry_asphalt',
      'tokyo_loop_wet_asphalt',
    ],
    aiCarIds: [
      'honda_integra_type_r',
      'mazda_miata_na',
      'honda_crx_vtec',
      'subaru_forester_xt',
      'toyota_supra_mk4',
    ],
    cashReward: 3600,
    firstClearPackId: 'steel',
  },
  {
    id: 'asia_3',
    region: 'Ázia',
    stageNumber: 3,
    title: 'Hokkaido Rally',
    subtitle: 'Sneh, štrk a horský les v severnom Japonsku',
    rqLimit: 225,
    trackIds: [
      'forest_road_gravel',
      'hill_climb_snow',
      'motocross_track_snow',
      '1_4_mile_drag_wet_asphalt',
      'city_streets_snow',
    ],
    aiCarIds: [
      'subaru_impreza_22b',
      'mitsubishi_evo_vi',
      'toyota_hilux_arctic',
      'suzuki_jimny',
      'subaru_forester_xt',
    ],
    cashReward: 5200,
    firstClearPackId: 'aluminum',
  },
  {
    id: 'asia_4',
    region: 'Ázia',
    stageNumber: 4,
    title: 'Wangan Midnight',
    subtitle: 'Vysokorýchlostná mestská diaľnica a šprint na 1,6 km',
    rqLimit: 280,
    trackIds: [
      'tokyo_loop_dry_asphalt',
      '1_mile_drag_dry_asphalt',
      'fast_circuit_wet_asphalt',
      '1_2_mile_drag_dry_asphalt',
      'city_streets_dry_asphalt',
    ],
    aiCarIds: [
      'nissan_skyline_r34',
      'toyota_supra_mk4',
      'honda_nsx_r',
      'nissan_gtr_nismo',
      'mitsubishi_evo_vi',
    ],
    cashReward: 7500,
    firstClearPackId: 'ceramic',
  },
  {
    id: 'asia_5',
    region: 'Ázia',
    stageNumber: 5,
    title: 'Ázia Finále: Suzuka Masters',
    subtitle: 'Vrcholná kombinácia japonských legiend a prototypov',
    rqLimit: 350,
    trackIds: [
      'fast_circuit_dry_asphalt',
      'tokyo_loop_wet_asphalt',
      '1_2_mile_drag_dry_asphalt',
      'hill_climb_mud',
      'slalom_test_dry_asphalt',
    ],
    aiCarIds: [
      'mazda_787b',
      'nissan_gtr_nismo',
      'subaru_impreza_22b',
      'toyota_hilux_arctic',
      'honda_nsx_r',
    ],
    cashReward: 11000,
    firstClearPackId: 'carbon_fiber',
  },
];

export const THEMATIC_CHALLENGES: ChallengeSpec[] = [
  {
    id: 'chal_90s_jdm',
    title: '90s JDM Legendy',
    subtitle: 'Iba japonské vozidlá z rokov 1990–1999',
    ruleSummary: 'Krajina: JPN · Rok výroby: 1990–1999 · Limit 210 RQ',
    rqLimit: 210,
    trackIds: [
      'tokyo_loop_dry_asphalt',
      'twisty_road_wet_asphalt',
      '1_4_mile_drag_dry_asphalt',
      'karting_circuit_dry_asphalt',
      'hill_climb_dry_asphalt',
    ],
    aiCarIds: [
      'nissan_skyline_r34',
      'mitsubishi_evo_vi',
      'honda_integra_type_r',
      'honda_crx_vtec',
      'mazda_miata_na',
    ],
    cashReward: 5500,
    bonusPackId: 'aluminum',
    filterCheck: (car) => car.country === 'JPN' && car.year >= 1990 && car.year <= 1999,
  },
  {
    id: 'chal_4wd_expedition',
    title: 'Expedícia 4x4',
    subtitle: 'Náročný terén, sneh a ľad pre pohon všetkých kolies',
    ruleSummary: 'Pohon: iba 4WD · Limit 230 RQ',
    rqLimit: 230,
    trackIds: [
      'motocross_track_mud',
      'hill_climb_snow',
      'slalom_test_ice',
      'forest_road_gravel',
      'city_streets_snow',
    ],
    aiCarIds: [
      'audi_quattro_ur',
      'jeep_wrangler_rubicon',
      'toyota_hilux_arctic',
      'subaru_forester_xt',
      'fiat_panda_4x4',
    ],
    cashReward: 6200,
    bonusPackId: 'ceramic',
    filterCheck: (car) => car.driveType === '4WD',
  },
  {
    id: 'chal_featherweight',
    title: 'Mušia váha',
    subtitle: 'Technické trate pre extrémne ľahké vozidlá',
    ruleSummary: 'Hmotnosť (séria): pod 1 180 kg · Limit 190 RQ',
    rqLimit: 190,
    trackIds: [
      'slalom_test_dry_asphalt',
      'g_force_test_dry_asphalt',
      'karting_circuit_dry_asphalt',
      'twisty_road_dry_asphalt',
      '1_4_mile_drag_dry_asphalt',
    ],
    aiCarIds: [
      'caterham_r500',
      'lotus_elise_s1',
      'honda_integra_type_r',
      'peugeot_205_gti',
      'mazda_miata_na',
    ],
    cashReward: 5800,
    bonusPackId: 'aluminum',
    filterCheck: (car) => car.weightLbs <= 2600,
  },
  {
    id: 'chal_city_sprint',
    title: 'Mestský šprint',
    subtitle: 'Spomaľovače a mokré ulice bez áut s nízkou svetlou výškou',
    ruleSummary: 'Svetlá výška: Medium alebo High · Limit 200 RQ',
    rqLimit: 200,
    trackIds: [
      'city_streets_dry_asphalt',
      'city_streets_wet_asphalt',
      'city_streets_snow',
      '1_4_mile_drag_wet_asphalt',
      'karting_circuit_wet_asphalt',
    ],
    aiCarIds: [
      'volvo_v60_polestar',
      'ford_escort_rs_cosworth',
      'subaru_impreza_22b',
      'renault_clio_cup',
      'vw_golf_mk3_tdi',
    ],
    cashReward: 5400,
    bonusPackId: 'steel',
    filterCheck: (car) => car.groundClearance !== 'Low',
  },
];

export const STARTER_GARAGE_CAR_IDS = [
  'honda_civic_eg',
  'mazda_miata_na',
  'fiat_panda_4x4',
  'ford_crown_vic',
  'peugeot_205_gti',
  'subaru_forester_xt',
];

export function rollRarityFromWeights(
  weights: Partial<Record<RarityTier, number>>,
  fallback: RarityTier
): RarityTier {
  const entries = (Object.entries(weights) as [RarityTier, number][]).filter(([, w]) => w > 0);
  if (entries.length === 0) return fallback;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return entries[entries.length - 1][0];
}

export function rollRarityFromPack(pack: CardPack, forceMinGuaranteed: boolean): RarityTier {
  const order: RarityTier[] = [
    'Common',
    'Uncommon',
    'Rare',
    'Super Rare',
    'Ultra Rare',
    'Epic',
    'Legendary',
  ];
  const minIdx = order.indexOf(pack.guaranteedMinRarity);

  if (forceMinGuaranteed) {
    const eligible = order
      .slice(minIdx)
      .map((r) => ({ r, w: pack.odds[r] ?? (r === pack.guaranteedMinRarity ? 40 : 0) }));
    const total = eligible.reduce((s, e) => s + e.w, 0);
    let roll = Math.random() * total;
    for (const item of eligible) {
      roll -= item.w;
      if (roll <= 0) return item.r;
    }
    return pack.guaranteedMinRarity;
  }

  return rollRarityFromWeights(pack.odds, pack.guaranteedMinRarity);
}

/**
 * Rolls 5 distinct cards using each pack's exact slotOdds, strictly respecting the pack's
 * allowed rarity tiers (NEVER promoting a rolled Common/Uncommon/Rare above its rolled rarity),
 * reserving RQ headroom within repeated rarities so cards ascend cleanly in RQ,
 * and returning the revealed pack sorted rarest/highest RQ first.
 */
export function rollPackCards(packId: string, catalog: CarSpec[]): CarSpec[] {
  const pack = PACK_BY_ID[packId];
  if (!pack || catalog.length === 0) return [];

  const maxLeg = pack.maxLegendaries ?? 3;
  const count = pack.cardCount;
  const minGuaranteedRank = RARITY_RANK[pack.guaranteedMinRarity];

  // Determine the highest rarity tier this pack is ever allowed to drop
  const allowedRarities = new Set<RarityTier>();
  for (const [r, w] of Object.entries(pack.odds) as [RarityTier, number][]) {
    if (w > 0) allowedRarities.add(r);
  }
  if (pack.slotOdds) {
    for (const slot of pack.slotOdds) {
      for (const [r, w] of Object.entries(slot) as [RarityTier, number][]) {
        if (w > 0) allowedRarities.add(r);
      }
    }
  }
  const maxAllowedRank = Math.max(
    minGuaranteedRank,
    ...[...allowedRarities].map((r) => RARITY_RANK[r])
  );

  // 1) Roll the exact rarity for each slot 1..5 first
  const rolledRarities: RarityTier[] = [];
  let legendaryCount = 0;

  for (let slot = 0; slot < count; slot++) {
    const slotWeights = pack.slotOdds?.[slot];
    let r: RarityTier = slotWeights
      ? rollRarityFromWeights(slotWeights, pack.guaranteedMinRarity)
      : rollRarityFromPack(pack, slot === count - 1);

    if (slot === count - 1 && RARITY_RANK[r] < minGuaranteedRank) {
      r = pack.guaranteedMinRarity;
    }
    if (RARITY_RANK[r] > maxAllowedRank) {
      r = pack.guaranteedMinRarity;
    }
    if (r === 'Legendary' && legendaryCount >= maxLeg) {
      r = 'Epic';
    }
    if (r === 'Legendary') {
      legendaryCount++;
    }
    rolledRarities.push(r);
  }

  // Sort rolled rarities ascending so RQ progression never collides across tiers
  rolledRarities.sort((a, b) => RARITY_RANK[a] - RARITY_RANK[b]);

  // 2) Draw distinct cars strictly matching each rolled rarity with ascending RQ
  const pulled: CarSpec[] = [];
  const usedIds = new Set<string>();
  let prevRq = 0;

  for (let slot = 0; slot < count; slot++) {
    const targetRarity = rolledRarities[slot];

    // Count how many consecutive remaining slots share this exact same rarity
    let sameTierLeft = 0;
    for (let j = slot + 1; j < count; j++) {
      if (rolledRarities[j] === targetRarity) sameTierLeft++;
    }

    const tierPool = catalog.filter(
      (c) => !usedIds.has(c.id) && c.rarity === targetRarity
    );
    const tierMaxRq =
      tierPool.length > 0 ? Math.max(...tierPool.map((c) => c.rq)) : 100;
    const headroomCap = tierMaxRq - sameTierLeft;

    let candidates = tierPool.filter(
      (c) => c.rq > prevRq && c.rq <= headroomCap
    );
    if (candidates.length === 0) {
      candidates = tierPool.filter((c) => c.rq >= prevRq && c.rq <= headroomCap);
    }
    if (candidates.length === 0) {
      candidates = tierPool.filter((c) => c.rq > prevRq);
    }
    if (candidates.length === 0) {
      candidates = tierPool.filter((c) => c.rq >= prevRq);
    }
    if (candidates.length === 0) {
      // Still stay strictly inside targetRarity (never leak into a higher rarity!)
      candidates = tierPool;
    }
    if (candidates.length === 0) {
      // Ultimate fallback only if catalog itself lacks this rarity entirely
      candidates = catalog.filter(
        (c) => !usedIds.has(c.id) && RARITY_RANK[c.rarity] <= maxAllowedRank
      );
    }
    if (candidates.length === 0) {
      candidates = catalog;
    }

    const sorted = [...candidates].sort((a, b) => a.rq - b.rq);
    // Keep early repeated slots in the lower-to-mid band so later slots ascend smoothly
    const sliceLimit =
      sameTierLeft > 0
        ? Math.max(1, Math.ceil(sorted.length * 0.65))
        : sorted.length;
    const picked = sorted[Math.floor(Math.random() * sliceLimit)];

    pulled.push(picked);
    usedIds.add(picked.id);
    prevRq = Math.max(prevRq, picked.rq);
  }

  // Present opened cards from rarest / highest RQ down to commonest / lowest RQ
  return [...pulled].sort((a, b) => {
    const rankDiff = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
    if (rankDiff !== 0) return rankDiff;
    return b.rq - a.rq;
  });
}
