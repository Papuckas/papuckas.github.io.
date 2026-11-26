import {
  BodyType,
  CarSpec,
  CountryCode,
  DriveType,
  GroundClearance,
  RarityTier,
  TyreType,
} from '../types/game';

type CompactCarRow6 = [
  id: string,
  make: string,
  model: string,
  year: number,
  rq: number,
  rarity: RarityTier,
  topSpeedMph: number,
  accel0to60: number,
  handling: number,
  mra: number,
  weightLbs: number,
  ola: number,
  driveType: DriveType,
  tyreType: TyreType,
  groundClearance: GroundClearance,
  hasAbs: boolean,
  hasTc: boolean,
  country: CountryCode,
  bodyType: BodyType,
  tags: string[],
  accentColor: string,
];

const RAW_BATCH6_CARS: CompactCarRow6[] = [
  // ================= BENCHMARK & EVERYDAY COMMON (RQ 10 - 19) =================
  ['renault_twizy', 'Renault', 'Twizy 80 Urban', 2012, 12, 'Common', 50, 16.5, 73, 33, 1045, 0.93, 'RWD', 'Standard', 'Medium', false, false, 'FRA', 'Hatchback', ['City', 'EV', 'Featherweight'], '#0EA5E9'],
  ['pontiac_trans_am_82', 'Pontiac', 'Firebird SE 2.8 V6', 1983, 18, 'Common', 118, 9.65, 64, 61, 3340, 0.96, 'RWD', 'Standard', 'Medium', false, false, 'USA', 'Coupe', ['Muscle', '80s', 'Classic'], '#0F172A'],
  ['opel_corsa_d_12', 'Opel', 'Corsa 1.2 Enjoy (D)', 2010, 15, 'Common', 85, 13.74, 76, 38, 2425, 0.96, 'FWD', 'Standard', 'Medium', true, false, 'GER', 'Hatchback', ['City', 'Euro'], '#94A3B8'],
  ['ford_focus_mk2_16', 'Ford', 'Focus 1.6 TDCi (Mk2)', 2007, 17, 'Common', 103, 11.27, 70, 48, 2980, 0.93, 'FWD', 'Standard', 'Medium', true, true, 'GBR', 'Hatchback', ['City', 'Euro'], '#3B82F6'],
  ['vw_golf_mk4_16', 'Volkswagen', 'Golf 1.6 16V (Mk4)', 2001, 17, 'Common', 107, 11.46, 70, 54, 2645, 0.94, 'FWD', 'Standard', 'Medium', true, true, 'GER', 'Hatchback', ['City', 'Euro'], '#64748B'],
  ['skoda_fabia_12_htp', 'Škoda', 'Fabia 1.2 HTP Combi', 2008, 14, 'Common', 83, 13.98, 73, 37, 2460, 0.94, 'FWD', 'Standard', 'Medium', true, false, 'CZE', 'Combi', ['City', 'Euro', 'Combi'], '#16A34A'],
  ['peugeot_206_14', 'Peugeot', '206 1.4 XR', 2002, 15, 'Common', 85, 13.72, 75, 38, 2140, 0.96, 'FWD', 'Standard', 'Medium', true, false, 'FRA', 'Hatchback', ['City', 'Featherweight', 'Euro'], '#38BDF8'],
  ['renault_clio_2_12', 'Renault', 'Clio 1.2 16V (Mk2)', 2003, 15, 'Common', 85, 13.42, 75, 40, 2120, 0.94, 'FWD', 'Standard', 'Medium', true, false, 'FRA', 'Hatchback', ['City', 'Featherweight', 'Euro'], '#FACC15'],
  ['fiat_punto_12_mk2', 'Fiat', 'Punto 1.2 Sporting', 2001, 16, 'Common', 89, 12.78, 76, 44, 2050, 0.94, 'FWD', 'Standard', 'Medium', true, false, 'ITA', 'Hatchback', ['City', 'Featherweight', 'Euro'], '#F59E0B'],
  ['kia_ceed_14_crdi', 'Kia', 'Ceed 1.4 CRDi SW', 2016, 16, 'Common', 102, 11.9, 69, 46, 2990, 0.93, 'FWD', 'Standard', 'Medium', true, true, 'KOR', 'Combi', ['City', 'Combi'], '#475569'],
  ['hyundai_i30_14', 'Hyundai', 'i30 1.4 CVVT', 2013, 16, 'Common', 104, 12.14, 70, 50, 2790, 0.95, 'FWD', 'Standard', 'Medium', true, true, 'KOR', 'Hatchback', ['City'], '#E2E8F0'],
  ['toyota_yaris_10', 'Toyota', 'Yaris 1.0 VVT-i', 2004, 14, 'Common', 82, 13.97, 75, 37, 1985, 0.94, 'FWD', 'Standard', 'Medium', true, false, 'JPN', 'Hatchback', ['City', 'Featherweight', 'JDM'], '#EF4444'],
  ['honda_jazz_14', 'Honda', 'Jazz 1.4 i-DSI', 2005, 15, 'Common', 88, 13.55, 74, 38, 2240, 0.95, 'FWD', 'Standard', 'Medium', true, false, 'JPN', 'Hatchback', ['City', 'JDM'], '#0284C7'],
  ['mazda_2_13', 'Mazda', 'Mazda2 1.3 Tamura', 2009, 16, 'Common', 91, 13.17, 75, 43, 2110, 0.96, 'FWD', 'Standard', 'Medium', true, true, 'JPN', 'Hatchback', ['City', 'Featherweight', 'JDM'], '#84CC16'],
  ['nissan_almera_15', 'Nissan', 'Almera 1.5 Visia (N16)', 2003, 15, 'Common', 98, 12.41, 68, 44, 2590, 0.93, 'FWD', 'Standard', 'Medium', true, false, 'JPN', 'Sedan', ['City', 'JDM'], '#CBD5E1'],
  ['seat_ibiza_6l_14', 'SEAT', 'Ibiza 1.4 16V (6L)', 2004, 17, 'Common', 92, 12.65, 76, 43, 2360, 0.97, 'FWD', 'Standard', 'Medium', true, false, 'GER', 'Hatchback', ['City', 'Euro'], '#DC2626'],
  ['citroen_c3_14', 'Citroën', 'C3 1.4i Exclusive', 2005, 15, 'Common', 84, 13.43, 76, 40, 2290, 0.94, 'FWD', 'Standard', 'Medium', true, false, 'FRA', 'Hatchback', ['City', 'Euro'], '#06B6D4'],
  ['dacia_sandero_stepway', 'Dacia', 'Sandero Stepway 0.9 TCe', 2018, 16, 'Common', 87, 12.62, 61, 41, 2450, 0.93, 'FWD', 'All-Surface', 'High', true, true, 'FRA', 'SUV', ['SUV', 'City'], '#EA580C'],

  // ================= BENCHMARK UNCOMMON (RQ 20 - 29) =================
  ['morgan_plus_4', 'Morgan', 'Plus 4 2.0 Roadster', 2014, 20, 'Uncommon', 90, 11.56, 75, 42, 2044, 0.96, 'RWD', 'Standard', 'Low', true, false, 'GBR', 'Coupe', ['Roadster', 'Classic', 'Featherweight'], '#065F46'],
  ['eunos_roadster_18', 'Mazda', 'Eunos Roadster 1.8 S-Special', 1994, 21, 'Uncommon', 95, 11.01, 74, 44, 2183, 0.94, 'RWD', 'Performance', 'Low', false, false, 'JPN', 'Coupe', ['90s JDM', 'Roadster', 'Featherweight'], '#DC2626'],
  ['renault_twizy_f1', 'Renault', 'Twizy F1 Concept', 2013, 20, 'Uncommon', 68, 9.96, 77, 42, 1243, 0.93, 'RWD', 'Slick', 'Low', false, false, 'FRA', 'Track', ['Track', 'Slick', 'EV', 'Featherweight'], '#FACC15'],

  // ================= BENCHMARK RARE (RQ 30 - 39) =================
  ['alpine_a110_1600s', 'Alpine', 'A110 1600S', 1971, 28, 'Uncommon', 113, 7.84, 80, 53, 1554, 0.94, 'RWD', 'Performance', 'Medium', false, false, 'FRA', 'Rally', ['Classic', 'Rally', 'Featherweight'], '#2563EB'],
  ['mazda_mx5_bbr', 'Mazda', 'MX-5 1.8i S (NA)', 1994, 27, 'Uncommon', 110, 9.16, 79, 54, 2140, 0.94, 'RWD', 'Performance', 'Low', false, false, 'JPN', 'Coupe', ['90s JDM', 'Roadster', 'Turbo'], '#B91C1C'],
  ['lotus_elan_sprint', 'Lotus', 'Elan Sprint', 1971, 27, 'Uncommon', 110, 8.39, 78, 55, 1525, 0.96, 'RWD', 'Standard', 'Low', false, false, 'GBR', 'Coupe', ['Classic', 'Featherweight', 'Roadster'], '#FACC15'],
  ['ford_capri_perana', 'Ford', 'Capri 3000GT', 1971, 28, 'Uncommon', 138, 7.26, 67, 72, 2480, 0.96, 'RWD', 'Performance', 'Medium', false, false, 'GBR', 'Coupe', ['Classic', 'Muscle', 'Drag'], '#EA580C'],
  ['citroen_cx_2400_gti_rally', 'Citroën', 'CX 2400 GTi Rally', 1978, 22, 'Uncommon', 112, 9.92, 70, 52, 2890, 0.93, 'FWD', 'All-Surface', 'High', false, false, 'FRA', 'Rally', ['Rally', 'Classic', 'All-Surface'], '#1D4ED8'],

  // ================= BENCHMARK SUPER RARE (RQ 40 - 49) =================
  ['subaru_legacy_s402', 'Subaru', 'Legacy S402 Wagon STI', 2008, 42, 'Super Rare', 142, 6.35, 77, 70, 3370, 1.02, '4WD', 'Performance', 'Medium', true, true, 'JPN', 'Combi', ['4x4', 'JDM', 'Combi'], '#1E40AF'],
  ['bmw_640d_xdrive', 'BMW', '640d xDrive Gran Coupé', 2015, 40, 'Super Rare', 146, 6, 67, 71, 4190, 1.05, '4WD', 'Performance', 'Medium', true, true, 'GER', 'Sedan', ['4x4', 'Euro', 'Diesel'], '#334155'],
  ['porsche_924_carrera_gts', 'Porsche', '924 Carrera GTS', 1981, 41, 'Super Rare', 117, 7.46, 81, 60, 2471, 0.97, 'RWD', 'Performance', 'Low', false, false, 'GER', 'Coupe', ['80s', 'Euro', 'Track'], '#DC2626'],
  ['hummer_h3t_alpha', 'Hummer', 'H3T 3.7 I5 4x4', 2009, 18, 'Common', 84, 11.66, 60, 46, 5140, 1.02, '4WD', 'Off-Road', 'High', true, true, 'USA', 'Pickup', ['4x4', 'Off-Road', 'Pickup'], '#F59E0B'],

  // ================= BENCHMARK ULTRA RARE (RQ 50 - 64) =================
  ['peugeot_306_maxi', 'Peugeot', '306 Maxi Kit Car', 1996, 42, 'Super Rare', 121, 7.17, 85, 60, 2116, 0.96, 'FWD', 'Slick', 'Low', false, false, 'FRA', 'Rally', ['90s', 'Rally', 'Slick', 'Featherweight'], '#2563EB'],
  ['ds3_performance_r5', 'DS', 'DS 3 Performance BRM', 2016, 40, 'Super Rare', 115, 7.53, 81, 54, 2590, 0.95, 'FWD', 'Performance', 'Medium', true, true, 'FRA', 'Hatchback', ['Hot Hatch', 'Euro'], '#F59E0B'],
  ['detomaso_pantera_gt5', 'De Tomaso', 'Pantera GT5', 1982, 50, 'Ultra Rare', 151, 5.54, 77, 69, 3130, 0.92, 'RWD', 'Performance', 'Low', false, false, 'ITA', 'Supercar', ['80s', 'Classic', 'Supercar'], '#DC2626'],

  // ================= BENCHMARK EPIC (RQ 65 - 79) =================
  ['pagani_zonda_c12', 'Maserati', 'GranSport 4.2 V8', 2005, 57, 'Ultra Rare', 165, 5.1, 80, 78, 3480, 0.96, 'RWD', 'Performance', 'Low', true, true, 'ITA', 'Supercar', ['90s', 'Supercar', 'Euro'], '#CBD5E1'],
  ['mazda_furai', 'Mazda', 'Furai Concept', 2008, 73, 'Epic', 161, 3.55, 93, 81, 1488, 0.94, 'RWD', 'Slick', 'Low', false, true, 'JPN', 'Track', ['Track', 'Slick', 'Featherweight'], '#1E293B'],
  ['lotus_2_eleven_gt4', 'Lotus', '2-Eleven GT4 Supersport', 2009, 65, 'Epic', 137, 4.16, 89, 71, 1587, 0.94, 'RWD', 'Slick', 'Low', true, true, 'GBR', 'Track', ['Track', 'Slick', 'Featherweight'], '#15803D'],

  // ================= BENCHMARK LEGENDARY (RQ 80+) =================
  ['porsche_911_gt1_evo', 'Porsche', '911 GT1 Evo', 1997, 92, 'Legendary', 189, 2.69, 94, 93, 2315, 0.96, 'RWD', 'Slick', 'Low', true, false, 'GER', 'Track', ['90s', 'Track', 'Slick'], '#F8FAFC'],
  ['mg_metro_6r4_clubman', 'MG', 'Metro 6R4 Clubman', 1985, 81, 'Legendary', 181, 3.11, 82, 87, 2293, 1.03, '4WD', 'Off-Road', 'High', false, false, 'GBR', 'Rally', ['80s', '4x4', 'Rally', 'Off-Road'], '#2563EB'],
  ['suzuki_pikes_peak_xl7', 'Suzuki', 'Pikes Peak XL7 Hill Climb', 2007, 88, 'Legendary', 173, 2.83, 95, 89, 2425, 1.03, '4WD', 'Slick', 'Low', false, true, 'JPN', 'Track', ['4x4', 'Track', 'Slick'], '#EAB308'],
];

export const BATCH6_CAR_CATALOG: CarSpec[] = RAW_BATCH6_CARS.map(
  ([
    id,
    make,
    model,
    year,
    rq,
    rarity,
    topSpeedMph,
    accel0to60,
    handling,
    mra,
    weightLbs,
    ola,
    driveType,
    tyreType,
    groundClearance,
    hasAbs,
    hasTc,
    country,
    bodyType,
    tags,
    accentColor,
  ]) => ({
    id,
    make,
    model,
    year,
    rq,
    rarity,
    topSpeedMph,
    accel0to60,
    handling,
    mra,
    weightLbs,
    ola,
    driveType,
    tyreType,
    groundClearance,
    hasAbs,
    hasTc,
    country,
    bodyType,
    tags,
    accentColor,
  })
);
