import * as THREE from 'three';
import { SurfaceType, Track, TrackArchetype } from '../../types/game';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export interface TimeOfDayLighting {
  skyHex: number;
  fogHex: number;
  sunHex: number;
  sunIntensity: number;
  sunElevation: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  envIntensity: number;
  exposure: number;
}

export function getTimeOfDayLighting(
  mode: TimeOfDay,
  surface: SurfaceType
): TimeOfDayLighting {
  const isWetOrSnow = surface === 'Wet Asphalt' || surface === 'Snow' || surface === 'Ice';

  if (mode === 'sunset') {
    return {
      skyHex: isWetOrSnow ? 0x5c4f70 : 0xc97b5d,
      fogHex: isWetOrSnow ? 0x564866 : 0xbd7154,
      sunHex: 0xffb36b,
      sunIntensity: 2.15,
      sunElevation: 26,
      hemiSkyHex: 0xfdba74,
      hemiGroundHex: 0x334155,
      hemiIntensity: 1.0,
      envIntensity: 0.92,
      exposure: 1.08,
    };
  }

  if (mode === 'night') {
    return {
      skyHex: 0x080f1d,
      fogHex: 0x0a1324,
      sunHex: 0x93c5fd,
      sunIntensity: 0.95,
      sunElevation: 65,
      hemiSkyHex: 0x3b5998,
      hemiGroundHex: 0x111827,
      hemiIntensity: 0.72,
      envIntensity: 0.58,
      exposure: 1.0,
    };
  }

  return {
    skyHex: isWetOrSnow ? 0x9cb3c9 : 0x7bc2f0,
    fogHex: isWetOrSnow ? 0xa3b8cc : 0x9ad0f5,
    sunHex: 0xfff8eb,
    sunIntensity: 2.7,
    sunElevation: 95,
    hemiSkyHex: 0xe0f2fe,
    hemiGroundHex: 0x475569,
    hemiIntensity: 1.28,
    envIntensity: 1.18,
    exposure: 1.12,
  };
}

export interface TrackSample {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  side: THREE.Vector3;
  signedCurvature: number;
}

export interface WeatherSystem {
  points: THREE.Points;
  kind: 'rain' | 'snow' | 'dust';
  velocities: Float32Array;
  update: (dt: number, anchorX: number, anchorZ: number) => void;
}

export interface BuiltTrack3D {
  group: THREE.Group;
  samples: TrackSample[];
  closed: boolean;
  totalLength: number;
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  overviewCenter: THREE.Vector3;
  overviewRadius: number;
  weather: WeatherSystem | null;
  sampleAtProgress: (
    progress: number,
    laneOffset: number,
    outPos: THREE.Vector3,
    outQuat: THREE.Quaternion,
    outForward?: THREE.Vector3
  ) => void;
  getCurvatureAtProgress: (progress: number) => number;
  stampTireMark: (pos: THREE.Vector3, quat: THREE.Quaternion, lengthScale?: number) => void;
  clearTireMarks: () => void;
  emitWheelSpray: (pos: THREE.Vector3, backDir: THREE.Vector3) => void;
  updateEffects: (dt: number) => void;
  setTimeOfDay: (mode: TimeOfDay) => void;
  dispose: () => void;
}

interface SurfacePalette3D {
  roadColor: number;
  roadRoughness: number;
  roadMetalness: number;
  shoulderColor: number;
  terrainColor: number;
  skyColor: number;
  stripeColor: string;
  tireMarkColor: number;
  tireMarkOpacity: number;
  sprayColor: number;
}

const SURFACE_PALETTES: Record<SurfaceType, SurfacePalette3D> = {
  'Dry Asphalt': {
    roadColor: 0x353e4e,
    roadRoughness: 0.76,
    roadMetalness: 0.06,
    shoulderColor: 0xd9480f,
    terrainColor: 0x3f6b38,
    skyColor: 0x7bc2f0,
    stripeColor: '#F1F5F9',
    tireMarkColor: 0x0f172a,
    tireMarkOpacity: 0.74,
    sprayColor: 0x94a3b8,
  },
  'Wet Asphalt': {
    roadColor: 0x243245,
    roadRoughness: 0.18,
    roadMetalness: 0.28,
    shoulderColor: 0x38bdf8,
    terrainColor: 0x2c4a38,
    skyColor: 0x9cb3c9,
    stripeColor: '#7DD3FC',
    tireMarkColor: 0x08101c,
    tireMarkOpacity: 0.58,
    sprayColor: 0xbae6fd,
  },
  Gravel: {
    roadColor: 0x8b6e55,
    roadRoughness: 0.92,
    roadMetalness: 0.02,
    shoulderColor: 0xb08f6e,
    terrainColor: 0x62613f,
    skyColor: 0x7bc2f0,
    stripeColor: '#FDE68A',
    tireMarkColor: 0x463424,
    tireMarkOpacity: 0.76,
    sprayColor: 0xd6b88d,
  },
  Mud: {
    roadColor: 0x57402c,
    roadRoughness: 0.65,
    roadMetalness: 0.08,
    shoulderColor: 0x485d2a,
    terrainColor: 0x364721,
    skyColor: 0x8aa8bd,
    stripeColor: '#BEF264',
    tireMarkColor: 0x26180e,
    tireMarkOpacity: 0.86,
    sprayColor: 0x6d4c31,
  },
  Snow: {
    roadColor: 0xe2e8f0,
    roadRoughness: 0.76,
    roadMetalness: 0.04,
    shoulderColor: 0x94a3b8,
    terrainColor: 0xf1f5f9,
    skyColor: 0xa3b8cc,
    stripeColor: '#475569',
    tireMarkColor: 0x7c90a6,
    tireMarkOpacity: 0.78,
    sprayColor: 0xf8fafc,
  },
  Ice: {
    roadColor: 0x7dd3fc,
    roadRoughness: 0.14,
    roadMetalness: 0.18,
    shoulderColor: 0xe0f2fe,
    terrainColor: 0xcbeaf7,
    skyColor: 0xa3b8cc,
    stripeColor: '#FFFFFF',
    tireMarkColor: 0xe0f2fe,
    tireMarkOpacity: 0.68,
    sprayColor: 0xe0f2fe,
  },
};

function getArchetypeControlPoints(archetype: TrackArchetype): {
  points: THREE.Vector3[];
  closed: boolean;
} {
  switch (archetype) {
    case '1/4 Mile Drag':
      return {
        closed: false,
        points: [
          new THREE.Vector3(0, 0.08, -75),
          new THREE.Vector3(0, 0.08, -25),
          new THREE.Vector3(0, 0.08, 25),
          new THREE.Vector3(0, 0.08, 75),
        ],
      };
    case '1/2 Mile Drag':
      return {
        closed: false,
        points: [
          new THREE.Vector3(0, 0.08, -100),
          new THREE.Vector3(0, 0.08, -33),
          new THREE.Vector3(0, 0.08, 33),
          new THREE.Vector3(0, 0.08, 100),
        ],
      };
    case '1 Mile Drag':
      return {
        closed: false,
        points: [
          new THREE.Vector3(0, 0.08, -135),
          new THREE.Vector3(0, 0.08, -45),
          new THREE.Vector3(0, 0.08, 45),
          new THREE.Vector3(0, 0.08, 135),
        ],
      };
    case 'Test Bowl':
      return {
        closed: true,
        points: [
          new THREE.Vector3(-42, 0.2, -55),
          new THREE.Vector3(42, 0.2, -55),
          new THREE.Vector3(74, 1.5, 0),
          new THREE.Vector3(42, 0.2, 55),
          new THREE.Vector3(-42, 0.2, 55),
          new THREE.Vector3(-74, 1.5, 0),
        ],
      };
    case 'Slalom Test':
      return {
        closed: false,
        points: [
          new THREE.Vector3(0, 0.08, -86),
          new THREE.Vector3(0, 0.08, -28),
          new THREE.Vector3(0, 0.08, 28),
          new THREE.Vector3(0, 0.08, 86),
        ],
      };
    case 'G-Force Test':
      return {
        closed: false,
        points: [
          new THREE.Vector3(-82, 0.08, 50),
          new THREE.Vector3(-28, 0.08, 50),
          new THREE.Vector3(24, 0.08, 36),
          new THREE.Vector3(44, 0.08, 0),
          new THREE.Vector3(14, 0.08, -44),
          new THREE.Vector3(-28, 0.08, -34),
          new THREE.Vector3(-22, 0.08, 16),
          new THREE.Vector3(32, 0.08, 46),
          new THREE.Vector3(88, 0.08, 46),
        ],
      };
    case 'Karting Circuit':
      return {
        closed: true,
        points: [
          new THREE.Vector3(-56, 0.08, 46),
          new THREE.Vector3(16, 0.08, 48),
          new THREE.Vector3(58, 0.08, 36),
          new THREE.Vector3(64, 0.08, -12),
          new THREE.Vector3(32, 0.08, -44),
          new THREE.Vector3(8, 0.08, -6),
          new THREE.Vector3(-24, 0.08, -48),
          new THREE.Vector3(-60, 0.08, -22),
        ],
      };
    case 'Twisty Road':
      return {
        closed: false,
        points: [
          new THREE.Vector3(-88, 0.2, 58),
          new THREE.Vector3(-50, 1.5, 24),
          new THREE.Vector3(-60, 2.8, -26),
          new THREE.Vector3(-14, 4.2, -48),
          new THREE.Vector3(18, 2.2, 8),
          new THREE.Vector3(48, 3.6, -38),
          new THREE.Vector3(72, 1.8, 14),
          new THREE.Vector3(92, 0.5, 56),
        ],
      };
    case 'Fast Circuit':
      return {
        closed: true,
        points: [
          new THREE.Vector3(-68, 0.1, 52),
          new THREE.Vector3(54, 0.1, 52),
          new THREE.Vector3(78, 0.3, 4),
          new THREE.Vector3(42, 0.2, -48),
          new THREE.Vector3(-4, 0.2, -24),
          new THREE.Vector3(-54, 0.2, -46),
          new THREE.Vector3(-82, 0.1, 8),
        ],
      };
    case 'Tokyo Loop':
      // Open point-to-point Wangan expressway stage (starts downtown, ends across bay viaduct!)
      return {
        closed: false,
        points: [
          new THREE.Vector3(-105, 3.6, 56),
          new THREE.Vector3(-42, 3.6, 54),
          new THREE.Vector3(18, 4.4, 34),
          new THREE.Vector3(48, 4.6, -18),
          new THREE.Vector3(12, 4.0, -56),
          new THREE.Vector3(-46, 3.8, -42),
          new THREE.Vector3(-92, 3.6, -72),
        ],
      };
    case 'Forest Road':
      return {
        closed: false,
        points: [
          new THREE.Vector3(-88, 0.2, -44),
          new THREE.Vector3(-36, 1.0, -48),
          new THREE.Vector3(-4, 1.9, 2),
          new THREE.Vector3(-40, 1.5, 48),
          new THREE.Vector3(26, 2.4, 54),
          new THREE.Vector3(58, 1.3, -14),
          new THREE.Vector3(92, 0.6, -30),
        ],
      };
    case 'City Streets':
      // Open point-to-point urban avenue & downtown chicane sprint
      return {
        closed: false,
        points: [
          new THREE.Vector3(-94, 0.08, 48),
          new THREE.Vector3(-28, 0.08, 48),
          new THREE.Vector3(-12, 0.08, 12),
          new THREE.Vector3(34, 0.08, 12),
          new THREE.Vector3(44, 0.08, -32),
          new THREE.Vector3(96, 0.08, -36),
        ],
      };
    case 'Hill Climb':
      return {
        closed: false,
        points: [
          new THREE.Vector3(0, 0.2, -96),
          new THREE.Vector3(0, 11.4, -32),
          new THREE.Vector3(0, 23.0, 32),
          new THREE.Vector3(0, 34.5, 96),
        ],
      };
    case 'Motocross Track':
    default:
      return {
        closed: true,
        points: [
          new THREE.Vector3(-64, 0.2, 42),
          new THREE.Vector3(-8, 2.5, 52),
          new THREE.Vector3(58, 0.4, 38),
          new THREE.Vector3(64, 2.7, -18),
          new THREE.Vector3(14, 0.5, -48),
          new THREE.Vector3(-22, 2.2, -8),
          new THREE.Vector3(-62, 0.6, -34),
        ],
      };
  }
}

function drawSkyGradient(
  canvas: HTMLCanvasElement,
  mode: TimeOfDay,
  surface: SurfaceType
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const isWetOrSnow = surface === 'Wet Asphalt' || surface === 'Snow' || surface === 'Ice';

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (mode === 'night') {
    grad.addColorStop(0, '#040814');
    grad.addColorStop(0.55, '#0b1528');
    grad.addColorStop(1, '#162542');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle procedural stars
    ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
    for (let i = 0; i < 160; i++) {
      const sx = (i * 197 + 31) % w;
      const sy = (i * 113 + 17) % Math.floor(h * 0.58);
      const sz = i % 5 === 0 ? 2 : 1;
      ctx.fillRect(sx, sy, sz, sz);
    }
  } else if (mode === 'sunset') {
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.38, '#7c3f58');
    grad.addColorStop(0.72, '#d97757');
    grad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    grad.addColorStop(0, isWetOrSnow ? '#5c7c99' : '#2563eb');
    grad.addColorStop(0.5, isWetOrSnow ? '#88a4bd' : '#60a5fa');
    grad.addColorStop(1, isWetOrSnow ? '#b8cadb' : '#bae6fd');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Soft distant clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let i = 0; i < 14; i++) {
      const cx = ((i * 93) % (w - 40)) + 20;
      const cy = Math.floor(h * (0.28 + (i % 4) * 0.06));
      ctx.beginPath();
      ctx.ellipse(cx, cy, 42 + (i % 3) * 16, 10 + (i % 2) * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function createRoadStripeTexture(stripeColor: string, surface: SurfaceType): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    const isPaved = surface === 'Dry Asphalt' || surface === 'Wet Asphalt';
    ctx.fillStyle = isPaved ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.09)';
    for (let i = 0; i < 480; i++) {
      const gx = (i * 73) % 256;
      const gy = (i * 139) % 256;
      ctx.fillRect(gx, gy, 2, 2);
    }

    if (surface === 'Wet Asphalt' || surface === 'Ice') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(46, 0, 48, 256);
      ctx.fillRect(162, 0, 48, 256);
    }

    ctx.fillStyle = stripeColor;
    ctx.globalAlpha = 0.78;
    ctx.fillRect(8, 0, 7, 256);
    ctx.fillRect(241, 0, 7, 256);

    ctx.globalAlpha = surface === 'Gravel' || surface === 'Mud' ? 0.38 : 0.88;
    ctx.fillRect(125, 16, 6, 96);
    ctx.fillRect(125, 144, 6, 96);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function createCheckeredTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cell = 16;
    for (let y = 0; y < 64; y += cell) {
      for (let x = 0; x < 256; x += cell) {
        const dark = (x / cell + y / cell) % 2 === 0;
        ctx.fillStyle = dark ? '#0F172A' : '#F8FAFC';
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createBillboardTexture(title: string, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 256, 10);
    ctx.fillRect(0, 86, 256, 10);
    ctx.font = '800 32px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(title, 128, 48);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createRibbonGeometry(
  samples: TrackSample[],
  closed: boolean,
  halfWidth: number,
  yOffset: number,
  uvRepeatPerMeter = 0.09
): THREE.BufferGeometry {
  const count = samples.length;
  const vertCount = count * 2;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint32Array((count - 1) * 6);

  let accumDist = 0;
  for (let i = 0; i < count; i++) {
    const s = samples[i];
    if (i > 0) accumDist += s.position.distanceTo(samples[i - 1].position);

    const lx = s.position.x + s.side.x * halfWidth;
    const ly = s.position.y + yOffset + s.side.y * halfWidth;
    const lz = s.position.z + s.side.z * halfWidth;

    const rx = s.position.x - s.side.x * halfWidth;
    const ry = s.position.y + yOffset - s.side.y * halfWidth;
    const rz = s.position.z - s.side.z * halfWidth;

    const vIdx = i * 2;
    positions[vIdx * 3] = rx;
    positions[vIdx * 3 + 1] = ry;
    positions[vIdx * 3 + 2] = rz;
    positions[(vIdx + 1) * 3] = lx;
    positions[(vIdx + 1) * 3 + 1] = ly;
    positions[(vIdx + 1) * 3 + 2] = lz;

    normals[vIdx * 3] = s.normal.x;
    normals[vIdx * 3 + 1] = s.normal.y;
    normals[vIdx * 3 + 2] = s.normal.z;
    normals[(vIdx + 1) * 3] = s.normal.x;
    normals[(vIdx + 1) * 3 + 1] = s.normal.y;
    normals[(vIdx + 1) * 3 + 2] = s.normal.z;

    const vCoord = accumDist * uvRepeatPerMeter;
    uvs[vIdx * 2] = 0;
    uvs[vIdx * 2 + 1] = vCoord;
    uvs[(vIdx + 1) * 2] = 1;
    uvs[(vIdx + 1) * 2 + 1] = vCoord;

    if (i < count - 1) {
      const a = vIdx;
      const b = vIdx + 1;
      const c = vIdx + 2;
      const d = vIdx + 3;
      const tri = i * 6;
      indices[tri] = a;
      indices[tri + 1] = c;
      indices[tri + 2] = b;
      indices[tri + 3] = b;
      indices[tri + 4] = c;
      indices[tri + 5] = d;
    }
  }

  void closed;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

function createShoulderGeometry(
  samples: TrackSample[],
  innerHalfWidth: number,
  outerHalfWidth: number,
  sideSign: 1 | -1,
  yOffset: number
): THREE.BufferGeometry {
  const count = samples.length;
  const positions = new Float32Array(count * 2 * 3);
  const normals = new Float32Array(count * 2 * 3);
  const indices = new Uint32Array((count - 1) * 6);

  for (let i = 0; i < count; i++) {
    const s = samples[i];
    const pInnerX = s.position.x + s.side.x * innerHalfWidth * sideSign;
    const pInnerY = s.position.y + yOffset;
    const pInnerZ = s.position.z + s.side.z * innerHalfWidth * sideSign;

    const pOuterX = s.position.x + s.side.x * outerHalfWidth * sideSign;
    const pOuterY = s.position.y + yOffset + 0.05;
    const pOuterZ = s.position.z + s.side.z * outerHalfWidth * sideSign;

    const v = i * 2;
    if (sideSign > 0) {
      positions[v * 3] = pInnerX;
      positions[v * 3 + 1] = pInnerY;
      positions[v * 3 + 2] = pInnerZ;
      positions[(v + 1) * 3] = pOuterX;
      positions[(v + 1) * 3 + 1] = pOuterY;
      positions[(v + 1) * 3 + 2] = pOuterZ;
    } else {
      positions[v * 3] = pOuterX;
      positions[v * 3 + 1] = pOuterY;
      positions[v * 3 + 2] = pOuterZ;
      positions[(v + 1) * 3] = pInnerX;
      positions[(v + 1) * 3 + 1] = pInnerY;
      positions[(v + 1) * 3 + 2] = pInnerZ;
    }

    normals[v * 3] = 0;
    normals[v * 3 + 1] = 1;
    normals[v * 3 + 2] = 0;
    normals[(v + 1) * 3] = 0;
    normals[(v + 1) * 3 + 1] = 1;
    normals[(v + 1) * 3 + 2] = 0;

    if (i < count - 1) {
      const a = v;
      const b = v + 1;
      const c = v + 2;
      const d = v + 3;
      const tri = i * 6;
      indices[tri] = a;
      indices[tri + 1] = c;
      indices[tri + 2] = b;
      indices[tri + 3] = b;
      indices[tri + 4] = c;
      indices[tri + 5] = d;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildTrack3D(track: Track): BuiltTrack3D {
  const group = new THREE.Group();
  const palette = SURFACE_PALETTES[track.surface];

  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const disposableTexs: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposableTexs.push(t);
    return t;
  };

  const { points, closed } = getArchetypeControlPoints(track.archetype);
  const curve = new THREE.CatmullRomCurve3(
    points,
    closed,
    track.archetype === 'City Streets' ? 'centripetal' : 'catmullrom',
    track.archetype === 'City Streets' ? 0.25 : 0.5
  );

  const sampleCount = 340;
  const spacedPts = curve.getSpacedPoints(sampleCount - 1);
  const samples: TrackSample[] = [];
  const worldUp = new THREE.Vector3(0, 1, 0);

  let totalLength = 0;
  for (let i = 0; i < spacedPts.length; i++) {
    const pos = spacedPts[i].clone();
    if (i > 0) totalLength += pos.distanceTo(spacedPts[i - 1]);

    const prev = spacedPts[closed ? (i - 1 + spacedPts.length) % spacedPts.length : Math.max(0, i - 1)];
    const next = spacedPts[closed ? (i + 1) % spacedPts.length : Math.min(spacedPts.length - 1, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();

    const side = new THREE.Vector3().crossVectors(worldUp, tangent);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    else side.normalize();

    const normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
    if (normal.y < 0) normal.negate();

    samples.push({ position: pos, tangent, normal, side, signedCurvature: 0 });
  }

  const segLen = totalLength / Math.max(1, samples.length - 1);
  const _dT = new THREE.Vector3();
  for (let i = 0; i < samples.length; i++) {
    const prevIdx = closed ? (i - 2 + samples.length) % samples.length : Math.max(0, i - 2);
    const nextIdx = closed ? (i + 2) % samples.length : Math.min(samples.length - 1, i + 2);
    const span = closed ? 4 * segLen : Math.max(1, nextIdx - prevIdx) * segLen;
    _dT.subVectors(samples[nextIdx].tangent, samples[prevIdx].tangent);
    samples[i].signedCurvature = _dT.dot(samples[i].side) / Math.max(0.25, span);
  }

  const bbox = new THREE.Box3();
  samples.forEach((s) => bbox.expandByPoint(s.position));
  const overviewCenter = new THREE.Vector3();
  bbox.getCenter(overviewCenter);
  const sizeVec = new THREE.Vector3();
  bbox.getSize(sizeVec);
  const overviewRadius = Math.max(sizeVec.x, sizeVec.z) * 0.55;

  // 0. Procedural Sky Dome (updated with TimeOfDay)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 256;
  drawSkyGradient(skyCanvas, 'day', track.surface);
  const skyTex = trackTex(new THREE.CanvasTexture(skyCanvas));
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(390, 24, 16)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: skyTex,
        side: THREE.BackSide,
        fog: false,
      })
    )
  );
  skyDome.position.copy(overviewCenter);
  group.add(skyDome);

  // 1. Extended Terrain Floor
  const terrainGeo = trackGeo(new THREE.PlaneGeometry(660, 660, 60, 60));
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);

    let minDist = Infinity;
    let nearestY = 0;
    for (let s = 0; s < samples.length; s += 8) {
      const sp = samples[s].position;
      const dx = vx - sp.x;
      const dz = vz - sp.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minDist) {
        minDist = d2;
        nearestY = sp.y;
      }
    }
    const dist = Math.sqrt(minDist);
    const blend = Math.min(1, Math.max(0, (dist - 12) / 30));
    let hill =
      Math.sin(vx * 0.035) * Math.cos(vz * 0.035) * 2.4 +
      Math.sin(vx * 0.08 + vz * 0.06) * 0.9;

    if (track.archetype === 'Hill Climb') {
      const zSlope = Math.max(0, (vz + 96) * 0.178);
      const ridgeBoost = Math.min(18, Math.max(0, Math.abs(vx) - 8) * 0.32);
      const baseSlopeY = zSlope + ridgeBoost;
      posAttr.setY(i, baseSlopeY + hill * 0.45 * blend - 0.18);
      continue;
    } else if (track.archetype === 'Tokyo Loop' || track.archetype === 'Slalom Test') {
      hill = 0;
    }

    const baseTerrainY =
      track.archetype === 'Tokyo Loop' || track.archetype === 'Slalom Test'
        ? -0.15
        : nearestY - 0.14;
    posAttr.setY(i, baseTerrainY * (1 - blend * 0.65) + hill * blend - 0.16);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: palette.terrainColor,
      roughness: 0.94,
      metalness: 0.02,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Distant Mountain Ridge Silhouettes on the horizon
  const mountainGeo = trackGeo(new THREE.ConeGeometry(28, 34, 6));
  const mountainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: track.surface === 'Snow' || track.surface === 'Ice' ? 0xcbd5e1 : 0x334155,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  const mtnCount = 26;
  const mountains = new THREE.InstancedMesh(mountainGeo, mountainMat, mtnCount);
  const mDummy = new THREE.Object3D();
  for (let i = 0; i < mtnCount; i++) {
    const angle = (i / mtnCount) * Math.PI * 2;
    const rad = 215 + (i % 3) * 24;
    const scaleY = 0.8 + ((i * 7) % 5) * 0.35;
    const scaleXZ = 1.0 + ((i * 3) % 4) * 0.25;
    mDummy.position.set(
      overviewCenter.x + Math.cos(angle) * rad,
      14 * scaleY - 4,
      overviewCenter.z + Math.sin(angle) * rad
    );
    mDummy.rotation.set(0, angle, 0);
    mDummy.scale.set(scaleXZ, scaleY, scaleXZ);
    mDummy.updateMatrix();
    mountains.setMatrixAt(i, mDummy.matrix);
  }
  mountains.instanceMatrix.needsUpdate = true;
  mountains.computeBoundingSphere();
  group.add(mountains);

  // 2. Twin-Lane Road Ribbon + Kerbs/Shoulders
  const roadHalfWidth = track.archetype === 'Slalom Test' ? 7.2 : 5.2; // Separate wide lanes on Slalom Test (+3.5 / -3.5)
  const roadTex = trackTex(createRoadStripeTexture(palette.stripeColor, track.surface));
  const roadGeo = trackGeo(createRibbonGeometry(samples, closed, roadHalfWidth, 0.08));
  const roadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: palette.roadColor,
      map: roadTex,
      roughness: palette.roadRoughness,
      metalness: palette.roadMetalness,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  const shoulderMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: palette.shoulderColor,
      roughness: 0.84,
      metalness: 0.05,
    })
  );
  const leftShoulder = new THREE.Mesh(
    trackGeo(createShoulderGeometry(samples, roadHalfWidth, roadHalfWidth + 0.95, 1, 0.06)),
    shoulderMat
  );
  leftShoulder.receiveShadow = true;
  const rightShoulder = new THREE.Mesh(
    trackGeo(createShoulderGeometry(samples, roadHalfWidth, roadHalfWidth + 0.95, -1, 0.06)),
    shoulderMat
  );
  rightShoulder.receiveShadow = true;
  group.add(leftShoulder, rightShoulder);

  // Elevated viaduct deck, guardrails & pillars on Tokyo Loop
  if (track.archetype === 'Tokyo Loop') {
    const pillarGeo = trackGeo(new THREE.BoxGeometry(2.3, 4.4, 2.3));
    const deckUnderGeo = trackGeo(createRibbonGeometry(samples, closed, roadHalfWidth + 1.05, -0.34));
    const concreteMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.12 })
    );
    const deckUnderMesh = new THREE.Mesh(deckUnderGeo, concreteMat);
    group.add(deckUnderMesh);

    const railLeftGeo = trackGeo(createShoulderGeometry(samples, roadHalfWidth + 0.8, roadHalfWidth + 1.05, 1, 0.55));
    const railRightGeo = trackGeo(createShoulderGeometry(samples, roadHalfWidth + 0.8, roadHalfWidth + 1.05, -1, 0.55));
    const railMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.55 })
    );
    group.add(new THREE.Mesh(railLeftGeo, railMat), new THREE.Mesh(railRightGeo, railMat));

    const pillarCount = 22;
    const pillars = new THREE.InstancedMesh(pillarGeo, concreteMat, pillarCount);
    const m = new THREE.Matrix4();
    for (let i = 0; i < pillarCount; i++) {
      const s = samples[Math.floor((i / pillarCount) * (samples.length - 1))];
      m.makeTranslation(s.position.x, s.position.y * 0.5 - 0.1, s.position.z);
      pillars.setMatrixAt(i, m);
    }
    pillars.instanceMatrix.needsUpdate = true;
    pillars.computeBoundingSphere();
    group.add(pillars);
  }

  // 3. Start Gantry (+ Drag Christmas Tree) & Finish Arch
  const checkerTex = trackTex(createCheckeredTexture());
  const finishMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: checkerTex,
      roughness: 0.55,
      metalness: 0.1,
    })
  );
  const gantryMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.68 })
  );
  const startLightMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x10b981 }));
  const amberTreeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  const finishBannerMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: checkerTex,
      roughness: 0.35,
      metalness: 0.15,
    })
  );

  const placeGate = (sampleIdx: number, isFinish: boolean) => {
    const s = samples[sampleIdx];
    const gate = new THREE.Group();
    gate.position.copy(s.position);

    const basis = new THREE.Matrix4().makeBasis(s.side, s.normal, s.tangent);
    gate.quaternion.setFromRotationMatrix(basis);

    const stripGeo = trackGeo(new THREE.BoxGeometry(roadHalfWidth * 2, 0.06, 2.0));
    const strip = new THREE.Mesh(stripGeo, finishMat);
    strip.position.y = 0.11;
    gate.add(strip);

    const postGeo = trackGeo(new THREE.BoxGeometry(0.5, 5.6, 0.5));
    const leftPost = new THREE.Mesh(postGeo, gantryMat);
    leftPost.position.set(roadHalfWidth + 0.75, 2.8, 0);
    const rightPost = new THREE.Mesh(postGeo, gantryMat);
    rightPost.position.set(-(roadHalfWidth + 0.75), 2.8, 0);
    const beamGeo = trackGeo(new THREE.BoxGeometry((roadHalfWidth + 1.0) * 2, 1.05, 0.62));
    const beam = new THREE.Mesh(beamGeo, isFinish ? finishBannerMat : gantryMat);
    beam.position.set(0, 5.4, 0);
    gate.add(leftPost, rightPost, beam);

    if (!isFinish) {
      const lampGeo = trackGeo(new THREE.BoxGeometry(3.2, 0.28, 0.68));
      const lamp = new THREE.Mesh(lampGeo, startLightMat);
      lamp.position.set(0, 5.1, 0);
      gate.add(lamp);

      // Drag Christmas Tree center light pole on Drag strips
      if (track.category === 'Drag') {
        const treePost = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.24, 2.6, 0.24)),
          gantryMat
        );
        treePost.position.set(0, 1.3, 4.2);
        const bulbA = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 10, 8)), amberTreeMat);
        bulbA.position.set(0, 2.1, 4.2);
        const bulbB = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.18, 10, 8)), startLightMat);
        bulbB.position.set(0, 1.65, 4.2);
        gate.add(treePost, bulbA, bulbB);
      }
    }

    group.add(gate);
  };

  if (track.archetype === 'Slalom Test') {
    // Combined Start/Finish gate at z = -80 (cars weave out through 6 cones, handbrake U-turn, and return to Start/Finish)
    const startIdx = Math.max(2, Math.floor((6 / 172) * (samples.length - 1)));
    placeGate(startIdx, true);
  } else {
    placeGate(2, false);
    if (!closed) {
      placeGate(samples.length - 4, true);
    }
  }

  // 4. Speed Bumps
  if (track.hasSpeedBumps) {
    const bumpMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.48, metalness: 0.15 })
    );
    const bumpGeo = trackGeo(new THREE.BoxGeometry(roadHalfWidth * 1.9, 0.22, 0.75));
    const bumpFracs = [0.22, 0.44, 0.68];
    bumpFracs.forEach((f) => {
      const idx = Math.floor(f * (samples.length - 1));
      const s = samples[idx];
      const bump = new THREE.Mesh(bumpGeo, bumpMat);
      bump.position.copy(s.position).addScaledVector(s.normal, 0.16);
      const basis = new THREE.Matrix4().makeBasis(s.side, s.normal, s.tangent);
      bump.quaternion.setFromRotationMatrix(basis);
      group.add(bump);
    });
  }

  // 5. Slalom Cones (6 cones per lane: Player +3.5, Opponent -3.5; out & back through same cones + handbrake U-turn box)
  if (track.archetype === 'Slalom Test') {
    const coneGeo = trackGeo(new THREE.ConeGeometry(0.42, 1.25, 12));
    const coneMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42, metalness: 0.05 })
    );
    const collarGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.31, 0.24, 12));
    const collarMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    const coneZPositions = [-52, -32, -12, 8, 28, 48];
    const laneCenters = [3.5, -3.5];
    const totalCones = coneZPositions.length * laneCenters.length;
    const cones = new THREE.InstancedMesh(coneGeo, coneMat, totalCones);
    const collars = new THREE.InstancedMesh(collarGeo, collarMat, totalCones);
    const m = new THREE.Matrix4();
    const tmpQuat = new THREE.Quaternion();
    let idx = 0;

    for (const laneCenter of laneCenters) {
      for (const coneZ of coneZPositions) {
        tmpQuat.identity();
        m.compose(
          new THREE.Vector3(laneCenter, 0.08 + 0.64, coneZ),
          tmpQuat,
          new THREE.Vector3(1, 1, 1)
        );
        cones.setMatrixAt(idx, m);
        m.compose(
          new THREE.Vector3(laneCenter, 0.08 + 0.70, coneZ),
          tmpQuat,
          new THREE.Vector3(1, 1, 1)
        );
        collars.setMatrixAt(idx, m);
        idx++;
      }
    }
    cones.instanceMatrix.needsUpdate = true;
    collars.instanceMatrix.needsUpdate = true;
    cones.computeBoundingSphere();
    collars.computeBoundingSphere();
    group.add(cones, collars);

    // Painted handbrake turnaround box & skidpad arcs at far end (z = +64 .. +76)
    const turnLineMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    const turnStopLine = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(roadHalfWidth * 1.9, 0.04, 0.6)),
      turnLineMat
    );
    turnStopLine.position.set(0, 0.105, 62);
    const turnEndLine = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(roadHalfWidth * 1.9, 0.04, 0.6)),
      turnLineMat
    );
    turnEndLine.position.set(0, 0.105, 76);
    group.add(turnStopLine, turnEndLine);

    const ringGeo = trackGeo(new THREE.RingGeometry(1.5, 2.0, 24, 1, 0, Math.PI));
    for (const laneCenter of laneCenters) {
      const arc = new THREE.Mesh(ringGeo, turnLineMat);
      arc.rotation.x = -Math.PI / 2;
      arc.position.set(laneCenter, 0.108, 69);
      group.add(arc);
    }
  }

  // 6. Rich Environment Scenery (Buildings, Pit Garages, Control Tower, Light Poles, Billboards, Trees)
  const rand = mulberry32(track.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 17));

  const isAirport = track.archetype === 'Slalom Test';
  const isUrban =
    track.archetype === 'City Streets' || track.archetype === 'Tokyo Loop';
  const isCircuitOrDrag =
    track.category === 'Drag' ||
    track.archetype === 'Fast Circuit' ||
    track.archetype === 'Karting Circuit' ||
    track.archetype === 'Test Bowl' ||
    track.archetype === 'G-Force Test';

  // Lamp bulb material dynamically brightens at sunset/night
  const streetLampMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  const windowGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: track.archetype === 'Tokyo Loop' ? 0x38bdf8 : 0xfde68a,
    })
  );

  if (isAirport) {
    // Airport Runway Apron, Markings, Control Tower, Aircraft Hangar & Windsock
    const tarmacMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.85, metalness: 0.05 })
    );
    const tarmacApron = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(108, 0.14, 212)), tarmacMat);
    tarmacApron.position.set(0, 0.01, 0);
    tarmacApron.receiveShadow = true;
    group.add(tarmacApron);

    const stripeWhiteMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
    );
    // Runway centerline dashes & threshold piano keys
    for (let d = -82; d <= 86; d += 12) {
      const dash = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.03, 5.4)), stripeWhiteMat);
      dash.position.set(0, 0.095, d);
      group.add(dash);
    }
    for (let k = -26; k <= 26; k += 4.2) {
      const key = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.03, 8.5)), stripeWhiteMat);
      key.position.set(k, 0.09, -92);
      group.add(key);
    }

    const metalWallMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.35 })
    );
    const hangarRoofMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.45 })
    );
    const accentAmberMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );

    // Airport Control Tower
    const towerBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.5, 19, 7.5)), metalWallMat);
    towerBase.position.set(-28, 9.5, 12);
    towerBase.castShadow = true;
    const towerCab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.5, 3.6, 11.5)), windowGlowMat);
    towerCab.position.set(-28, 20.4, 12);
    const towerRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(12.8, 0.8, 12.8)), accentAmberMat);
    towerRoof.position.set(-28, 22.6, 12);
    const antenna = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.18, 6.5, 6)), metalWallMat);
    antenna.position.set(-28, 26, 12);
    group.add(towerBase, towerCab, towerRoof, antenna);

    // Wide Aircraft Hangar
    const hangarBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(24, 10, 38)), metalWallMat);
    hangarBody.position.set(40, 5, -18);
    hangarBody.castShadow = true;
    const hangarArch = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(12, 12, 38, 16, 1, false, 0, Math.PI)),
      hangarRoofMat
    );
    hangarArch.rotation.z = Math.PI / 2;
    hangarArch.rotation.y = Math.PI / 2;
    hangarArch.position.set(40, 10, -18);
    group.add(hangarBody, hangarArch);

    // Windsock mast
    const sockMast = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.15, 0.2, 8.5, 8)), metalWallMat);
    sockMast.position.set(-22, 4.25, -42);
    const sockCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.55, 2.8, 10)), accentAmberMat);
    sockCone.rotation.z = -Math.PI / 2.2;
    sockCone.position.set(-20.6, 8.1, -42);
    group.add(sockMast, sockCone);
  } else if (isUrban) {
    // Richer Urban Cityscape: multi-tier towers + street-level shopfronts + glowing bands
    const bldgGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
    const bldgMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: track.archetype === 'Tokyo Loop' ? 0x1e293b : 0x334155,
        roughness: 0.5,
        metalness: 0.38,
      })
    );

    const bldgCount = 72;
    const buildings = new THREE.InstancedMesh(bldgGeo, bldgMat, bldgCount);
    const roofStrips = new THREE.InstancedMesh(bldgGeo, windowGlowMat, bldgCount);
    const midStrips = new THREE.InstancedMesh(bldgGeo, windowGlowMat, bldgCount);
    const dummy = new THREE.Object3D();

    let placed = 0;
    let attempts = 0;
    while (placed < bldgCount && attempts < 600) {
      attempts++;
      const angle = rand() * Math.PI * 2;
      const radius = 24 + rand() * 125;
      const bx = overviewCenter.x + Math.cos(angle) * radius;
      const bz = overviewCenter.z + Math.sin(angle) * radius;

      let tooClose = false;
      for (let s = 0; s < samples.length; s += 6) {
        const sp = samples[s].position;
        if ((bx - sp.x) ** 2 + (bz - sp.z) ** 2 < 15.5 * 15.5) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const bw = 7 + rand() * 10;
      const bd = 7 + rand() * 10;
      const bh = track.archetype === 'Tokyo Loop' ? 16 + rand() * 38 : 10 + rand() * 22;
      dummy.position.set(bx, bh * 0.5 - 0.1, bz);
      dummy.rotation.set(0, rand() * 0.25, 0);
      dummy.scale.set(bw, bh, bd);
      dummy.updateMatrix();
      buildings.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(bx, bh - 0.55, bz);
      dummy.scale.set(bw + 0.18, 0.55, bd + 0.18);
      dummy.updateMatrix();
      roofStrips.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(bx, bh * 0.56, bz);
      dummy.scale.set(bw + 0.14, 0.38, bd + 0.14);
      dummy.updateMatrix();
      midStrips.setMatrixAt(placed, dummy.matrix);

      placed++;
    }
    buildings.count = placed;
    roofStrips.count = placed;
    midStrips.count = placed;
    buildings.instanceMatrix.needsUpdate = true;
    roofStrips.instanceMatrix.needsUpdate = true;
    midStrips.instanceMatrix.needsUpdate = true;
    buildings.computeBoundingSphere();
    roofStrips.computeBoundingSphere();
    midStrips.computeBoundingSphere();
    buildings.castShadow = true;
    buildings.receiveShadow = true;
    group.add(buildings, roofStrips, midStrips);
  } else {
    // Two-tier Alpine Pine Trees + Trackside Boulders
    const treeCount =
      track.archetype === 'Forest Road'
        ? 125
        : track.archetype === 'Hill Climb' || track.archetype === 'Twisty Road'
        ? 95
        : track.archetype === 'Motocross Track'
        ? 60
        : 52;

    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.38, 2.4, 6));
    const trunkMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x452c1e, roughness: 0.9 })
    );
    const foliageGeo = trackGeo(new THREE.ConeGeometry(1.85, 4.6, 7));
    const foliageTopGeo = trackGeo(new THREE.ConeGeometry(1.3, 3.6, 7));
    const foliageColor =
      track.surface === 'Snow' || track.surface === 'Ice' ? 0x4a6f69 : 0x1e5631;
    const foliageMat = trackMat(
      new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.85 })
    );

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const conesLower = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
    const conesUpper = new THREE.InstancedMesh(foliageTopGeo, foliageMat, treeCount);
    const dummy = new THREE.Object3D();

    let placed = 0;
    let attempts = 0;
    while (placed < treeCount && attempts < 750) {
      attempts++;
      const refSample = samples[Math.floor(rand() * samples.length)];
      const sideSign = rand() > 0.5 ? 1 : -1;
      const lateral = (11.5 + rand() * 48) * sideSign;
      const tx = refSample.position.x + refSample.side.x * lateral + (rand() - 0.5) * 10;
      const tz = refSample.position.z + refSample.side.z * lateral + (rand() - 0.5) * 10;

      let tooClose = false;
      for (let s = 0; s < samples.length; s += 8) {
        const sp = samples[s].position;
        if ((tx - sp.x) ** 2 + (tz - sp.z) ** 2 < 10.5 * 10.5) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const scale = 0.85 + rand() * 0.85;
      const baseY = refSample.position.y - 0.25;

      dummy.position.set(tx, baseY + 1.15 * scale, tz);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(tx, baseY + 3.6 * scale, tz);
      dummy.updateMatrix();
      conesLower.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(tx, baseY + 5.7 * scale, tz);
      dummy.updateMatrix();
      conesUpper.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    trunks.count = placed;
    conesLower.count = placed;
    conesUpper.count = placed;
    trunks.instanceMatrix.needsUpdate = true;
    conesLower.instanceMatrix.needsUpdate = true;
    conesUpper.instanceMatrix.needsUpdate = true;
    trunks.computeBoundingSphere();
    conesLower.computeBoundingSphere();
    conesUpper.computeBoundingSphere();
    conesLower.castShadow = true;
    conesUpper.castShadow = true;
    group.add(trunks, conesLower, conesUpper);

    // Offroad / Mountain Boulders
    if (track.category === 'Offroad' || track.archetype === 'Twisty Road' || track.archetype === 'Forest Road') {
      const rockGeo = trackGeo(new THREE.DodecahedronGeometry(1.4, 0));
      const rockMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92, metalness: 0.05 })
      );
      const rockCount = 34;
      const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
      let rPlaced = 0;
      let rAttempts = 0;
      while (rPlaced < rockCount && rAttempts < 240) {
        rAttempts++;
        const refSample = samples[Math.floor(rand() * samples.length)];
        const sideSign = rand() > 0.5 ? 1 : -1;
        const lat = (9.5 + rand() * 24) * sideSign;
        const rx = refSample.position.x + refSample.side.x * lat;
        const rz = refSample.position.z + refSample.side.z * lat;
        let close = false;
        for (let s = 0; s < samples.length; s += 8) {
          const sp = samples[s].position;
          if ((rx - sp.x) ** 2 + (rz - sp.z) ** 2 < 8.5 * 8.5) {
            close = true;
            break;
          }
        }
        if (close) continue;
        const rs = 0.65 + rand() * 1.1;
        dummy.position.set(rx, refSample.position.y + 0.35 * rs, rz);
        dummy.rotation.set(rand(), rand(), rand());
        dummy.scale.set(rs * 1.2, rs * 0.75, rs);
        dummy.updateMatrix();
        rocks.setMatrixAt(rPlaced, dummy.matrix);
        rPlaced++;
      }
      rocks.count = rPlaced;
      rocks.instanceMatrix.needsUpdate = true;
      rocks.computeBoundingSphere();
      group.add(rocks);
    }
  }

  // Trackside Streetlights / Floodlight Poles along paved, urban, and circuit tracks
  if (isUrban || isCircuitOrDrag) {
    const poleGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 6.2, 6));
    const poleMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 })
    );
    const armGeo = trackGeo(new THREE.BoxGeometry(1.8, 0.14, 0.18));
    const bulbGeo = trackGeo(new THREE.BoxGeometry(0.9, 0.16, 0.32));

    const poleCount = 16;
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, poleCount);
    const arms = new THREE.InstancedMesh(armGeo, poleMat, poleCount);
    const bulbs = new THREE.InstancedMesh(bulbGeo, streetLampMat, poleCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < poleCount; i++) {
      const f = 0.04 + (i / poleCount) * 0.9;
      const s = samples[Math.floor(f * (samples.length - 1))];
      const sideSign = i % 2 === 0 ? 1 : -1;
      const px = s.position.x + s.side.x * sideSign * (roadHalfWidth + 1.8);
      const pz = s.position.z + s.side.z * sideSign * (roadHalfWidth + 1.8);
      const py = s.position.y;
      const yaw = Math.atan2(s.side.x, s.side.z) + (sideSign > 0 ? Math.PI : 0);

      dummy.position.set(px, py + 3.1, pz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);

      dummy.position.set(
        px - s.side.x * sideSign * 0.75,
        py + 6.1,
        pz - s.side.z * sideSign * 0.75
      );
      dummy.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z), 0);
      dummy.updateMatrix();
      arms.setMatrixAt(i, dummy.matrix);

      dummy.position.set(
        px - s.side.x * sideSign * 1.15,
        py + 5.95,
        pz - s.side.z * sideSign * 1.15
      );
      dummy.updateMatrix();
      bulbs.setMatrixAt(i, dummy.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
    arms.computeBoundingSphere();
    bulbs.computeBoundingSphere();
    group.add(poles, arms, bulbs);
  }

  // Pit Lane Garages, Race Control Tower & Tiered Grandstands on Circuits & Drag Strips
  if (isCircuitOrDrag) {
    const standMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.25 })
    );
    const tierMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75, metalness: 0.15 })
    );
    const roofMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.42, metalness: 0.28 })
    );
    const garageDoorMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.4 })
    );

    const standGeo = trackGeo(new THREE.BoxGeometry(18, 2.2, 6.2));
    const tier1Geo = trackGeo(new THREE.BoxGeometry(17.6, 1.4, 4.4));
    const tier2Geo = trackGeo(new THREE.BoxGeometry(17.6, 1.4, 2.4));
    const roofGeo = trackGeo(new THREE.BoxGeometry(18.6, 0.45, 7.2));

    const standIdxs = [
      Math.floor(samples.length * 0.09),
      Math.floor(samples.length * 0.22),
      Math.floor(samples.length * 0.82),
    ];
    standIdxs.forEach((idx, i) => {
      const s = samples[idx];
      const stand = new THREE.Group();
      const sideSign = i % 2 === 0 ? 1 : -1;
      stand.position
        .copy(s.position)
        .addScaledVector(s.side, sideSign * (roadHalfWidth + 8.5));
      const basis = new THREE.Matrix4().makeBasis(s.side, worldUp, s.tangent);
      stand.quaternion.setFromRotationMatrix(basis);
      if (sideSign < 0) stand.rotateY(Math.PI);
      stand.rotateY(Math.PI / 2);

      const base = new THREE.Mesh(standGeo, standMat);
      base.position.y = 1.1;
      const t1 = new THREE.Mesh(tier1Geo, tierMat);
      t1.position.set(0, 2.8, 0.7);
      const t2 = new THREE.Mesh(tier2Geo, tierMat);
      t2.position.set(0, 4.1, 1.6);
      const canopy = new THREE.Mesh(roofGeo, roofMat);
      canopy.position.y = 5.4;
      stand.add(base, t1, t2, canopy);
      group.add(stand);
    });

    // Race Control Tower + Pit Garage Complex opposite the start straight
    const towerSample = samples[Math.floor(samples.length * 0.05)];
    const complex = new THREE.Group();
    complex.position
      .copy(towerSample.position)
      .addScaledVector(towerSample.side, -(roadHalfWidth + 11.5));
    const cBasis = new THREE.Matrix4().makeBasis(towerSample.side, worldUp, towerSample.tangent);
    complex.quaternion.setFromRotationMatrix(cBasis);

    const pitBox = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(8, 3.8, 22)),
      standMat
    );
    pitBox.position.set(0, 1.9, 0);
    pitBox.castShadow = true;
    complex.add(pitBox);

    // 4 Pit Garage shutter doors facing track
    for (let g = 0; g < 4; g++) {
      const door = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.2, 2.6, 3.8)),
        garageDoorMat
      );
      door.position.set(4.05, 1.3, -7.5 + g * 5);
      complex.add(door);
    }

    // Tall Race Control Tower
    const towerCore = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.5, 12, 5.5)),
      standMat
    );
    towerCore.position.set(-1.5, 6.0, -14);
    towerCore.castShadow = true;
    const towerDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.2, 2.2, 7.2)),
      windowGlowMat
    );
    towerDeck.position.set(-1.5, 11.2, -14);
    const towerCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.8, 0.5, 7.8)),
      roofMat
    );
    towerCap.position.set(-1.5, 12.5, -14);
    complex.add(towerCore, towerDeck, towerCap);
    group.add(complex);
  }

  // Sponsor Billboards along track
  const billboardTex = trackTex(createBillboardTexture('TOP DRIVERS', '#F59E0B'));
  const billboardMat = trackMat(
    new THREE.MeshStandardMaterial({ map: billboardTex, roughness: 0.45, metalness: 0.1 })
  );
  const boardGeo = trackGeo(new THREE.BoxGeometry(7.2, 2.6, 0.3));
  const boardPostGeo = trackGeo(new THREE.BoxGeometry(0.25, 2.8, 0.25));
  const boardPostMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
  );

  [0.16, 0.48, 0.78].forEach((frac, i) => {
    const s = samples[Math.floor(frac * (samples.length - 1))];
    const sideSign = i % 2 === 0 ? -1 : 1;
    const bGroup = new THREE.Group();
    bGroup.position
      .copy(s.position)
      .addScaledVector(s.side, sideSign * (roadHalfWidth + 4.4));
    const basis = new THREE.Matrix4().makeBasis(s.side, worldUp, s.tangent);
    bGroup.quaternion.setFromRotationMatrix(basis);
    bGroup.rotateY(sideSign > 0 ? -Math.PI / 2.6 : Math.PI / 2.6);

    const p1 = new THREE.Mesh(boardPostGeo, boardPostMat);
    p1.position.set(-2.4, 1.4, 0);
    const p2 = new THREE.Mesh(boardPostGeo, boardPostMat);
    p2.position.set(2.4, 1.4, 0);
    const panel = new THREE.Mesh(boardGeo, billboardMat);
    panel.position.set(0, 2.7, 0);
    bGroup.add(p1, p2, panel);
    group.add(bGroup);
  });

  // 7. Dynamic Weather Particles
  let weather: WeatherSystem | null = null;
  if (
    track.surface === 'Wet Asphalt' ||
    track.surface === 'Snow' ||
    track.surface === 'Gravel' ||
    track.surface === 'Mud'
  ) {
    const kind: WeatherSystem['kind'] =
      track.surface === 'Wet Asphalt'
        ? 'rain'
        : track.surface === 'Snow'
        ? 'snow'
        : 'dust';

    const pCount = 160;
    const pPos = new Float32Array(pCount * 3);
    const velocities = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (rand() - 0.5) * 90;
      pPos[i * 3 + 1] = 1 + rand() * 24;
      pPos[i * 3 + 2] = (rand() - 0.5) * 90;
      velocities[i] =
        kind === 'rain' ? 24 + rand() * 10 : kind === 'snow' ? 4 + rand() * 3 : 1.5 + rand() * 1.5;
    }

    const pGeo = trackGeo(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = trackMat(
      new THREE.PointsMaterial({
        color: kind === 'rain' ? 0x7dd3fc : kind === 'snow' ? 0xf8fafc : 0xd6b88d,
        size: kind === 'rain' ? 0.32 : kind === 'snow' ? 0.45 : 0.4,
        transparent: true,
        opacity: kind === 'dust' ? 0.4 : 0.72,
        depthWrite: false,
      })
    );
    const pointsMesh = new THREE.Points(pGeo, pMat);
    group.add(pointsMesh);

    weather = {
      points: pointsMesh,
      kind,
      velocities,
      update: (dt: number, anchorX: number, anchorZ: number) => {
        pointsMesh.position.set(anchorX, 0, anchorZ);
        const attr = pGeo.attributes.position as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let i = 0; i < pCount; i++) {
          const idx = i * 3 + 1;
          if (kind === 'dust') {
            arr[idx] += velocities[i] * dt * 0.4;
            if (arr[idx] > 7) arr[idx] = 0.2;
          } else {
            arr[idx] -= velocities[i] * dt;
            if (arr[idx] < 0.2) arr[idx] = 24;
          }
        }
        attr.needsUpdate = true;
      },
    };
  }

  // 8. Tire Track / Skidmark Ring Buffer
  const MAX_TIRE_MARKS = 520;
  const markGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.025, 1.0));
  const markMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: palette.tireMarkColor,
      transparent: true,
      opacity: palette.tireMarkOpacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  const tireMarkMesh = new THREE.InstancedMesh(markGeo, markMat, MAX_TIRE_MARKS);
  tireMarkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tireMarkMesh.count = 0;
  tireMarkMesh.frustumCulled = false;
  group.add(tireMarkMesh);

  let markCursor = 0;
  let markTotalPlaced = 0;
  const _markMatrix = new THREE.Matrix4();
  const _markScale = new THREE.Vector3(1, 1, 1);

  const stampTireMark = (pos: THREE.Vector3, quat: THREE.Quaternion, lengthScale = 1.0) => {
    _markScale.set(1, 1, Math.max(0.45, Math.min(2.6, lengthScale)));
    _markMatrix.compose(pos, quat, _markScale);
    tireMarkMesh.setMatrixAt(markCursor, _markMatrix);
    markCursor = (markCursor + 1) % MAX_TIRE_MARKS;
    if (markTotalPlaced < MAX_TIRE_MARKS) {
      markTotalPlaced++;
      tireMarkMesh.count = markTotalPlaced;
    }
    tireMarkMesh.instanceMatrix.needsUpdate = true;
  };

  const clearTireMarks = () => {
    markCursor = 0;
    markTotalPlaced = 0;
    tireMarkMesh.count = 0;
    tireMarkMesh.instanceMatrix.needsUpdate = true;
  };

  // 9. Rear Wheel Spray Pool
  const MAX_SPRAY = 96;
  const sprayPositions = new Float32Array(MAX_SPRAY * 3);
  const sprayVels = new Float32Array(MAX_SPRAY * 3);
  const sprayAges = new Float32Array(MAX_SPRAY);
  for (let i = 0; i < MAX_SPRAY; i++) {
    sprayAges[i] = 99;
    sprayPositions[i * 3 + 1] = -999;
  }
  const sprayGeo = trackGeo(new THREE.BufferGeometry());
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));
  const sprayMat = trackMat(
    new THREE.PointsMaterial({
      color: palette.sprayColor,
      size: track.surface === 'Mud' || track.surface === 'Snow' ? 0.58 : 0.44,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
  );
  const sprayPoints = new THREE.Points(sprayGeo, sprayMat);
  sprayPoints.frustumCulled = false;
  group.add(sprayPoints);

  let sprayCursor = 0;
  const emitWheelSpray = (pos: THREE.Vector3, backDir: THREE.Vector3) => {
    const idx = sprayCursor;
    sprayCursor = (sprayCursor + 1) % MAX_SPRAY;
    sprayPositions[idx * 3] = pos.x + (Math.random() - 0.5) * 0.25;
    sprayPositions[idx * 3 + 1] = pos.y + 0.16;
    sprayPositions[idx * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.25;

    sprayVels[idx * 3] = backDir.x * (2.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 1.4;
    sprayVels[idx * 3 + 1] = 1.6 + Math.random() * 2.1;
    sprayVels[idx * 3 + 2] = backDir.z * (2.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 1.4;
    sprayAges[idx] = 0;
  };

  const updateEffects = (dt: number) => {
    let dirty = false;
    for (let i = 0; i < MAX_SPRAY; i++) {
      if (sprayAges[i] > 0.65) {
        if (sprayPositions[i * 3 + 1] > -500) {
          sprayPositions[i * 3 + 1] = -999;
          dirty = true;
        }
        continue;
      }
      sprayAges[i] += dt;
      sprayVels[i * 3 + 1] -= 9.5 * dt;
      sprayPositions[i * 3] += sprayVels[i * 3] * dt;
      sprayPositions[i * 3 + 1] += sprayVels[i * 3 + 1] * dt;
      sprayPositions[i * 3 + 2] += sprayVels[i * 3 + 2] * dt;
      dirty = true;
    }
    if (dirty) {
      (sprayGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  };

  const setTimeOfDay = (mode: TimeOfDay) => {
    drawSkyGradient(skyCanvas, mode, track.surface);
    skyTex.needsUpdate = true;
    streetLampMat.color.setHex(mode === 'night' ? 0xfef9c3 : mode === 'sunset' ? 0xfdba74 : 0xcbd5e1);
    windowGlowMat.color.setHex(
      mode === 'night'
        ? track.archetype === 'Tokyo Loop'
          ? 0x38bdf8
          : 0xfef08a
        : mode === 'sunset'
        ? 0xfdba74
        : 0x94a3b8
    );
  };

  // Zero-allocation spline sampler
  const _basis = new THREE.Matrix4();
  const sampleAtProgress = (
    progress: number,
    laneOffset: number,
    outPos: THREE.Vector3,
    outQuat: THREE.Quaternion,
    outForward?: THREE.Vector3
  ) => {
    const clamped = Math.max(0, Math.min(1, progress));
    const fIdx = clamped * (samples.length - 1);
    const idx = Math.floor(fIdx);
    const nextIdx = Math.min(samples.length - 1, idx + 1);
    const frac = fIdx - idx;

    const a = samples[idx];
    const b = samples[nextIdx];

    outPos.lerpVectors(a.position, b.position, frac);

    const tx = a.tangent.x + (b.tangent.x - a.tangent.x) * frac;
    const ty = a.tangent.y + (b.tangent.y - a.tangent.y) * frac;
    const tz = a.tangent.z + (b.tangent.z - a.tangent.z) * frac;
    const tLen = Math.hypot(tx, ty, tz) || 1;

    const nx = a.normal.x + (b.normal.x - a.normal.x) * frac;
    const ny = a.normal.y + (b.normal.y - a.normal.y) * frac;
    const nz = a.normal.z + (b.normal.z - a.normal.z) * frac;
    const nLen = Math.hypot(nx, ny, nz) || 1;

    const sx = a.side.x + (b.side.x - a.side.x) * frac;
    const sy = a.side.y + (b.side.y - a.side.y) * frac;
    const sz = a.side.z + (b.side.z - a.side.z) * frac;
    const sLen = Math.hypot(sx, sy, sz) || 1;

    outPos.x += (sx / sLen) * laneOffset;
    outPos.y += (sy / sLen) * laneOffset + 0.08;
    outPos.z += (sz / sLen) * laneOffset;

    const te = _basis.elements;
    te[0] = sx / sLen;
    te[1] = sy / sLen;
    te[2] = sz / sLen;
    te[3] = 0;
    te[4] = nx / nLen;
    te[5] = ny / nLen;
    te[6] = nz / nLen;
    te[7] = 0;
    te[8] = tx / tLen;
    te[9] = ty / tLen;
    te[10] = tz / tLen;
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;

    outQuat.setFromRotationMatrix(_basis);
    if (outForward) {
      outForward.set(tx / tLen, ty / tLen, tz / tLen);
    }
  };

  const getCurvatureAtProgress = (progress: number): number => {
    const clamped = Math.max(0, Math.min(1, progress));
    const fIdx = clamped * (samples.length - 1);
    const idx = Math.floor(fIdx);
    const nextIdx = Math.min(samples.length - 1, idx + 1);
    const frac = fIdx - idx;
    const a = samples[idx].signedCurvature;
    const b = samples[nextIdx].signedCurvature;
    return a + (b - a) * frac;
  };

  const dispose = () => {
    disposableGeos.forEach((g) => g.dispose());
    disposableMats.forEach((m) => m.dispose());
    disposableTexs.forEach((t) => t.dispose());
  };

  return {
    group,
    samples,
    closed,
    totalLength: track.archetype === 'Slalom Test' ? 312 : totalLength,
    skyColor: new THREE.Color(palette.skyColor),
    fogColor: new THREE.Color(palette.skyColor),
    overviewCenter,
    overviewRadius,
    weather,
    sampleAtProgress,
    getCurvatureAtProgress,
    stampTireMark,
    clearTireMarks,
    emitWheelSpray,
    updateEffects,
    setTimeOfDay,
    dispose,
  };
}
