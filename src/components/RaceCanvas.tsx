import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Camera,
  Compass,
  Eye,
  EyeOff,
  FastForward,
  Gauge,
  Moon,
  Play,
  RotateCcw,
  SkipForward,
  Sun,
  Sunset,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatAccel0to100, formatSpeed, RARITY_COLORS } from '../data/cars';
import { SURFACE_LABELS_SK } from '../data/tracks';
import { soundEngine } from '../engine/audio';
import { CarRig3D, createCarModel3D } from '../engine/race3d/carModels';
import {
  BuiltTrack3D,
  buildTrack3D,
  getTimeOfDayLighting,
  TimeOfDay,
} from '../engine/race3d/trackBuilder';
import { PlayerSettings, RoundSimulationResult } from '../types/game';
import { CarIllustration } from './CarIllustration';

type CameraMode = 'chase' | 'tv' | 'top' | 'overview';

interface TelemetrySnapshot {
  playerSpeedKmh: number;
  aiSpeedKmh: number;
  playerG: number;
  playerLatG: number;
  aiG: number;
  aiLatG: number;
  absActive: boolean;
  espActive: boolean;
  aiAbsActive: boolean;
  aiEspActive: boolean;
  playerBraking: boolean;
  playerFinished: boolean;
  aiFinished: boolean;
  tallyFactor: number; // 0..1 rolling count-up once first car finishes
}

interface RaceCanvasProps {
  round: RoundSimulationResult;
  settings: PlayerSettings;
  autoPlay: boolean;
  onRoundComplete?: () => void;
  onTallyUpdate?: (roundNumber: number, playerPts: number, aiPts: number) => void;
}

const CAMERA_MODES: { id: CameraMode; label: string; icon: React.ReactNode }[] = [
  { id: 'chase', label: 'Za autom', icon: <Video className="w-3.5 h-3.5" /> },
  { id: 'tv', label: 'TV Kamera', icon: <Camera className="w-3.5 h-3.5" /> },
  { id: 'top', label: 'Zhora', icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'overview', label: 'Celá mapa', icon: <Compass className="w-3.5 h-3.5" /> },
];

const TIME_MODES: { id: TimeOfDay; label: string; icon: React.ReactNode }[] = [
  { id: 'day', label: 'Deň', icon: <Sun className="w-3.5 h-3.5" /> },
  { id: 'sunset', label: 'Západ', icon: <Sunset className="w-3.5 h-3.5" /> },
  { id: 'night', label: 'Noc', icon: <Moon className="w-3.5 h-3.5" /> },
];

// Pre-allocated scratch math objects (zero GC allocations inside render loop)
const _pPos = new THREE.Vector3();
const _pQuat = new THREE.Quaternion();
const _pFwd = new THREE.Vector3();
const _aPos = new THREE.Vector3();
const _aQuat = new THREE.Quaternion();
const _aFwd = new THREE.Vector3();
const _midPos = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _sideVec = new THREE.Vector3();
const _tirePos = new THREE.Vector3();
const _tireSide = new THREE.Vector3();
const _backDir = new THREE.Vector3();
const _steerQuat = new THREE.Quaternion();

const _slalomStateP = { curv: 0, handbrake: false };
const _slalomStateA = { curv: 0, handbrake: false };

function smoothStep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Out-and-back Slalom Test course:
 * - 6 cones per lane at z = [-52, -32, -12, 8, 28, 48] along laneCenter = ±3.5
 * - Outbound (0..0.445): z = -80 -> +64 weaving cleanly past all 6 cones
 * - Handbrake J-Turn (0.445..0.555): compact 180-degree spin-turn at z = +64..+73.5 inside own lane
 * - Return (0.555..1): z = +64 -> -80 weaving back through the exact same 6 cones to Start/Finish gate at z = -80
 */
function sampleSlalomCourse(
  prog: number,
  laneSign: 1 | -1,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion,
  outFwd: THREE.Vector3,
  outState: { curv: number; handbrake: boolean }
): void {
  const p = Math.max(0, Math.min(1, prog));
  const laneCenter = laneSign * 3.5;
  const amp = 1.62;
  const k = Math.PI / 20; // cones spaced every 20m (-52, -32, -12, 8, 28, 48)
  const pTurnStart = 0.445;
  const pTurnEnd = 0.555;

  let x = laneCenter;
  let z = -80;
  let yaw = 0;

  if (p <= pTurnStart) {
    const u = p / pTurnStart;
    z = -80 + u * 144; // -80 -> +64
    const rampIn = smoothStep((z - -70) / 14);
    const rampOut = smoothStep((62 - z) / 10);
    const ramp = Math.min(rampIn, rampOut);
    const phase = (z + 62) * k;
    x = laneCenter + Math.sin(phase) * amp * ramp;
    const dxDz = Math.cos(phase) * k * amp * ramp;
    yaw = Math.atan2(dxDz, 1);
    outFwd.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    outState.curv = -Math.sin(phase) * k * k * amp * ramp;
    outState.handbrake = false;
  } else if (p < pTurnEnd) {
    const u = (p - pTurnStart) / (pTurnEnd - pTurnStart);
    const swing = Math.sin(u * Math.PI);
    z = 64 + swing * 9.5; // stays inside turnaround box (64..73.5)
    x = laneCenter + laneSign * swing * 1.45; // swings outward, never crossing x = 0
    // Car pivots 180 deg with realistic handbrake oversteer tail-out slip
    const baseTurn = smoothStep(u) * Math.PI;
    const slipAngle = 0.56 * swing;
    yaw = -laneSign * (baseTurn + slipAngle);
    outFwd.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    outState.curv = laneSign * 0.21;
    outState.handbrake = true;
  } else {
    const u = (p - pTurnEnd) / (1 - pTurnEnd);
    z = 64 - u * 144; // +64 -> -80 (back across Start/Finish gate!)
    const rampIn = smoothStep((62 - z) / 10);
    const rampOut = smoothStep((z - -70) / 14);
    const ramp = Math.min(rampIn, rampOut);
    const phase = (z + 62) * k;
    // Opposite side of each cone on the return pass
    x = laneCenter - Math.sin(phase) * amp * ramp;
    // Moving in -Z direction: dx/ds = (dx/dz)*(-1) = +cos(phase)*k*amp*ramp
    const dxDs = Math.cos(phase) * k * amp * ramp;
    yaw = Math.atan2(dxDs, -1);
    outFwd.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    outState.curv = Math.sin(phase) * k * k * amp * ramp;
    outState.handbrake = false;
  }

  outPos.set(x, 0.16, z);
  outQuat.setFromAxisAngle(_worldUp, yaw);
}

function interpolateTimeline(
  timeline: RoundSimulationResult['timeline'],
  tNorm: number
): { playerProg: number; aiProg: number; playerSpeedMs: number; aiSpeedMs: number } {
  if (timeline.length === 0) {
    return { playerProg: 0, aiProg: 0, playerSpeedMs: 0, aiSpeedMs: 0 };
  }
  const clamped = Math.max(0, Math.min(1, tNorm));
  const scaled = clamped * (timeline.length - 1);
  const idx = Math.floor(scaled);
  const next = Math.min(timeline.length - 1, idx + 1);
  const frac = scaled - idx;

  const a = timeline[idx];
  const b = timeline[next];
  return {
    playerProg: a.playerProgress + (b.playerProgress - a.playerProgress) * frac,
    aiProg: a.aiProgress + (b.aiProgress - a.aiProgress) * frac,
    playerSpeedMs: a.playerSpeedMs + (b.playerSpeedMs - a.playerSpeedMs) * frac,
    aiSpeedMs: a.aiSpeedMs + (b.aiSpeedMs - a.aiSpeedMs) * frac,
  };
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '') : '';
    const isSoft = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return isSoft;
  } catch {
    return false;
  }
}

export const RaceCanvas: React.FC<RaceCanvasProps> = ({
  round,
  settings,
  autoPlay,
  onRoundComplete,
  onTallyUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [uiTNorm, setUiTNorm] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMult, setSpeedMult] = useState<1 | 2>(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>('tv');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [localSoundEnabled, setLocalSoundEnabled] = useState<boolean>(settings.soundEnabled);
  const [hudHidden, setHudHidden] = useState<boolean>(false);
  const [playerImgFailed, setPlayerImgFailed] = useState(false);
  const [aiImgFailed, setAiImgFailed] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    playerSpeedKmh: 0,
    aiSpeedKmh: 0,
    playerG: 0,
    playerLatG: 0,
    aiG: 0,
    aiLatG: 0,
    absActive: false,
    espActive: false,
    aiAbsActive: false,
    aiEspActive: false,
    playerBraking: false,
    playerFinished: false,
    aiFinished: false,
    tallyFactor: 0,
  });

  // Mutable live state ref read directly by the Three.js loop
  const liveRef = useRef({
    round,
    settings,
    autoPlay,
    onRoundComplete,
    onTallyUpdate,
    tNorm: 0,
    isPlaying: true,
    speedMult: 1 as 1 | 2,
    cameraMode: 'tv' as CameraMode,
    timeOfDay: 'day' as TimeOfDay,
    hasNotifiedFinish: false,
    snapCamera: true,
    orbitYawOffset: 0.45,
    orbitPitchOffset: 0.65,
    orbitZoom: 1,
    prevPlayerProg: 0,
    prevAiProg: 0,
    pSpeedMs: 0,
    aSpeedMs: 0,
    pLongG: 0,
    pLatG: 0,
    aLongG: 0,
    aLatG: 0,
    pMarkAccum: 0,
    aMarkAccum: 0,
    tallyActive: false,
    tallyElapsed: 0,
    lastReportedP: -1,
    lastReportedA: -1,
    elapsedTime: 0,
    lastUiSyncMs: 0,
  });

  liveRef.current.settings = { ...settings, soundEnabled: localSoundEnabled };
  liveRef.current.autoPlay = autoPlay;
  liveRef.current.onRoundComplete = onRoundComplete;
  liveRef.current.onTallyUpdate = onTallyUpdate;
  liveRef.current.speedMult = speedMult;

  useEffect(() => {
    setLocalSoundEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Active Three.js scene entity holders
  const sceneObjectsRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    track3D: BuiltTrack3D | null;
    playerCar: CarRig3D | null;
    aiCar: CarRig3D | null;
  } | null>(null);

  const applySceneTimeOfDay = (mode: TimeOfDay, surface = liveRef.current.round.track.surface) => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;
    const { renderer, scene, sunLight, hemiLight, track3D, playerCar, aiCar } = objs;
    const preset = getTimeOfDayLighting(mode, surface);

    scene.background = new THREE.Color(preset.skyHex);
    scene.fog = new THREE.Fog(preset.fogHex, 130, 360);
    scene.environmentIntensity = preset.envIntensity;
    renderer.toneMappingExposure = preset.exposure;

    hemiLight.color.setHex(preset.hemiSkyHex);
    hemiLight.groundColor.setHex(preset.hemiGroundHex);
    hemiLight.intensity = preset.hemiIntensity;

    sunLight.color.setHex(preset.sunHex);
    sunLight.intensity = preset.sunIntensity;
    const center = track3D ? track3D.overviewCenter : _worldUp;
    sunLight.position.set(
      center.x + (mode === 'sunset' ? -88 : 65),
      center.y + preset.sunElevation,
      center.z + 52
    );

    const isNight = mode === 'night';
    track3D?.setTimeOfDay(mode);
    playerCar?.setNightMode(isNight);
    aiCar?.setNightMode(isNight);
  };

  const handleSelectCamera = (mode: CameraMode) => {
    setCameraMode(mode);
    liveRef.current.cameraMode = mode;
    liveRef.current.snapCamera = true;
  };

  const handleSelectTimeOfDay = (mode: TimeOfDay) => {
    setTimeOfDay(mode);
    liveRef.current.timeOfDay = mode;
    applySceneTimeOfDay(mode, liveRef.current.round.track.surface);
  };

  // Initialize Three.js Renderer, Lighting & Render Loop once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initW = Math.max(container.clientWidth, 320);
    const initH = Math.max(container.clientHeight, 240);
    const camera = new THREE.PerspectiveCamera(48, initW / initH, 0.4, 520);
    renderer.setSize(initW, initH, false);

    // Procedural Studio / Outdoor PMREM Environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x475569, 1.25);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff8eb, 2.65);
    sunLight.position.set(65, 95, 52);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 280;
      sunLight.shadow.camera.left = -110;
      sunLight.shadow.camera.right = 110;
      sunLight.shadow.camera.top = 110;
      sunLight.shadow.camera.bottom = -110;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);
    scene.add(sunLight.target);

    sceneObjectsRef.current = {
      renderer,
      scene,
      camera,
      sunLight,
      hemiLight,
      track3D: null,
      playerCar: null,
      aiCar: null,
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(1, Math.floor(entry.contentRect.width));
        const h = Math.max(1, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    ro.observe(container);

    // Pointer drag & wheel for interactive map orbit
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      liveRef.current.orbitYawOffset -= dx * 0.008;
      liveRef.current.orbitPitchOffset = Math.max(
        0.25,
        Math.min(1.25, liveRef.current.orbitPitchOffset + dy * 0.006)
      );
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      liveRef.current.orbitZoom = Math.max(
        0.55,
        Math.min(1.75, liveRef.current.orbitZoom + e.deltaY * 0.0008)
      );
    };
    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    const gl = renderer.getContext() as WebGL2RenderingContext;
    const hasSync =
      isSoftwareGl &&
      typeof gl.fenceSync === 'function' &&
      typeof gl.clientWaitSync === 'function';

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let autoAdvanceTimerId = 0;
    let lastNow = performance.now();

    const afterDraw = (cb: () => void) => {
      if (!isSoftwareGl) {
        rafId = requestAnimationFrame(cb);
        return;
      }
      if (!hasSync) {
        timerId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        timerId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const res = gl.clientWaitSync(sync, 0, 0);
        if (
          res === gl.WAIT_FAILED ||
          res === gl.ALREADY_SIGNALED ||
          res === gl.CONDITION_SATISFIED
        ) {
          gl.deleteSync(sync);
          timerId = window.setTimeout(cb, 80);
        } else {
          timerId = window.setTimeout(poll, 10);
        }
      };
      timerId = window.setTimeout(poll, 10);
    };

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;

      const state = liveRef.current;
      state.elapsedTime += dt;

      // Slower readable default pace (~11.5s at 1x, ~5.75s at 2x)
      const durationSec = 11.5 / (state.settings.animSpeed * state.speedMult);

      // Advance simulation progress
      if (state.isPlaying && state.tNorm < 1) {
        state.tNorm = Math.min(1, state.tNorm + dt / durationSec);

        if (state.tNorm >= 1) {
          state.isPlaying = false;
          setIsPlaying(false);
          setUiTNorm(1);
          if (!state.hasNotifiedFinish) {
            state.hasNotifiedFinish = true;
            if (state.round.winner === 'player') {
              soundEngine.playVictory(state.settings.soundEnabled);
            } else if (state.round.winner === 'ai') {
              soundEngine.playDefeat(state.settings.soundEnabled);
            }
            if (state.autoPlay && state.onRoundComplete) {
              autoAdvanceTimerId = window.setTimeout(() => {
                if (!disposed) state.onRoundComplete?.();
              }, 1450);
            }
          }
        }
      }

      // Advance live rolling score tally once started (keeps running smoothly even after tNorm=1)
      if (state.tallyActive && state.tallyElapsed < 0.85) {
        state.tallyElapsed = Math.min(0.85, state.tallyElapsed + dt);
      }

      const objs = sceneObjectsRef.current;
      if (objs && objs.track3D && objs.playerCar && objs.aiCar) {
        const { track3D, playerCar, aiCar } = objs;
        const { playerProg, aiProg, playerSpeedMs, aiSpeedMs } = interpolateTimeline(
          state.round.timeline,
          state.tNorm
        );

        // Trigger live score tally as soon as the FIRST car crosses the finish line (or race ends on DNF)
        const pReachedFinish = !state.round.playerDnf && playerProg >= 0.998;
        const aReachedFinish = !state.round.aiDnf && aiProg >= 0.998;
        if (!state.tallyActive && (pReachedFinish || aReachedFinish || state.tNorm >= 0.999)) {
          state.tallyActive = true;
          state.tallyElapsed = 0;
        }

        // Physical race duration for accurate live G telemetry
        const maxRaceSec = Math.max(
          state.round.playerDnf ? state.round.aiTime : state.round.playerTime,
          state.round.aiDnf ? state.round.playerTime : state.round.aiTime,
          4
        );

        const targetPSpeedMs = state.isPlaying && !pReachedFinish ? Math.max(0, playerSpeedMs) : 0;
        const targetASpeedMs = state.isPlaying && !aReachedFinish ? Math.max(0, aiSpeedMs) : 0;

        state.pSpeedMs = THREE.MathUtils.damp(state.pSpeedMs, targetPSpeedMs, 14, dt);
        state.aSpeedMs = THREE.MathUtils.damp(state.aSpeedMs, targetASpeedMs, 14, dt);

        // Longitudinal acceleration from physical simulation timeline lookahead
        const eps = 0.008;
        const sPrev = interpolateTimeline(state.round.timeline, Math.max(0, state.tNorm - eps));
        const sNext = interpolateTimeline(state.round.timeline, Math.min(1, state.tNorm + eps));
        const dTNorm = Math.max(0.002, Math.min(1, state.tNorm + eps) - Math.max(0, state.tNorm - eps));
        const dtSimSec = Math.max(0.02, dTNorm * maxRaceSec);

        const isSlalom = state.round.track.archetype === 'Slalom Test';
        if (isSlalom) {
          sampleSlalomCourse(playerProg, 1, _pPos, _pQuat, _pFwd, _slalomStateP);
          sampleSlalomCourse(aiProg, -1, _aPos, _aQuat, _aFwd, _slalomStateA);
        } else {
          _slalomStateP.curv = 0;
          _slalomStateP.handbrake = false;
          _slalomStateA.curv = 0;
          _slalomStateA.handbrake = false;
          track3D.sampleAtProgress(playerProg, 2.2, _pPos, _pQuat, _pFwd);
          track3D.sampleAtProgress(aiProg, -2.2, _aPos, _aQuat, _aFwd);
        }

        // Curvature & G-Forces (including slalom weave & handbrake U-turn lateral acceleration)
        const pCurv3d = isSlalom ? _slalomStateP.curv : track3D.getCurvatureAtProgress(playerProg);
        const aCurv3d = isSlalom ? _slalomStateA.curv : track3D.getCurvatureAtProgress(aiProg);
        const realScale = track3D.totalLength / Math.max(100, state.round.track.distanceMeters);
        const pCurvReal = pCurv3d * realScale;
        const aCurvReal = aCurv3d * realScale;

        const rawPLongG =
          state.isPlaying && !pReachedFinish
            ? (sNext.playerSpeedMs - sPrev.playerSpeedMs) / (dtSimSec * 9.81)
            : 0;
        const rawALongG =
          state.isPlaying && !aReachedFinish
            ? (sNext.aiSpeedMs - sPrev.aiSpeedMs) / (dtSimSec * 9.81)
            : 0;
        const rawPLatG = (state.pSpeedMs * state.pSpeedMs * pCurvReal) / 9.81;
        const rawALatG = (state.aSpeedMs * state.aSpeedMs * aCurvReal) / 9.81;

        state.pLongG = THREE.MathUtils.damp(state.pLongG, Math.max(-1.8, Math.min(1.6, rawPLongG)), 10, dt);
        state.pLatG = THREE.MathUtils.damp(state.pLatG, Math.max(-2.1, Math.min(2.1, rawPLatG)), 10, dt);
        state.aLongG = THREE.MathUtils.damp(state.aLongG, Math.max(-1.8, Math.min(1.6, rawALongG)), 10, dt);
        state.aLatG = THREE.MathUtils.damp(state.aLatG, Math.max(-2.1, Math.min(2.1, rawALatG)), 10, dt);

        const pBraking =
          state.isPlaying &&
          !pReachedFinish &&
          (state.pLongG < -0.16 || _slalomStateP.handbrake);
        const aBraking =
          state.isPlaying &&
          !aReachedFinish &&
          (state.aLongG < -0.16 || _slalomStateA.handbrake);
        playerCar.setBraking(pBraking || (state.tNorm > 0.96 && state.pSpeedMs > 1));
        aiCar.setBraking(aBraking || (state.tNorm > 0.96 && state.aSpeedMs > 1));

        // Subtle chassis squat/dive (X) and cornering body roll (Z)
        playerCar.chassisGroup.rotation.x = THREE.MathUtils.clamp(-state.pLongG * 0.045, -0.065, 0.065);
        playerCar.chassisGroup.rotation.z = THREE.MathUtils.clamp(-state.pLatG * 0.055, -0.09, 0.09);
        aiCar.chassisGroup.rotation.x = THREE.MathUtils.clamp(-state.aLongG * 0.045, -0.065, 0.065);
        aiCar.chassisGroup.rotation.z = THREE.MathUtils.clamp(-state.aLatG * 0.055, -0.09, 0.09);

        playerCar.root.position.copy(_pPos);
        playerCar.root.quaternion.copy(_pQuat);
        aiCar.root.position.copy(_aPos);
        aiCar.root.quaternion.copy(_aQuat);

        // Spin wheels based on distance delta
        const pDelta = Math.max(0, playerProg - state.prevPlayerProg);
        const aDelta = Math.max(0, aiProg - state.prevAiProg);
        state.prevPlayerProg = playerProg;
        state.prevAiProg = aiProg;

        const pDistMoved = pDelta * track3D.totalLength;
        const aDistMoved = aDelta * track3D.totalLength;
        const pSpin = pDistMoved / Math.max(0.25, playerCar.wheelRadius);
        const aSpin = aDistMoved / Math.max(0.25, aiCar.wheelRadius);
        for (let i = 0; i < playerCar.wheels.length; i++) {
          playerCar.wheels[i].rotation.x += pSpin;
        }
        for (let i = 0; i < aiCar.wheels.length; i++) {
          aiCar.wheels[i].rotation.x += aSpin;
        }

        // Tire tracks (braking, hard cornering, handbrake turn, launch, or Mud/Gravel/Snow/Ice) & rear wheel spray
        const surface = state.round.track.surface;
        const softSurface =
          surface === 'Mud' ||
          surface === 'Gravel' ||
          surface === 'Snow' ||
          surface === 'Ice';

        // Update continuous Web Audio engine, tire screech & braking soundscape
        soundEngine.updateRaceAudio({
          enabled: state.settings.soundEnabled,
          playing: state.isPlaying,
          finished: state.tNorm >= 0.998 || pReachedFinish,
          speedMs: state.pSpeedMs,
          maxSpeedMs: Math.max(30, state.round.playerStats.topSpeedMph * 0.44704),
          longG: state.pLongG,
          latG: state.pLatG,
          braking: pBraking,
          handbrake: _slalomStateP.handbrake,
          surface,
          speedMult: state.speedMult,
        });

        const pShouldLeaveMarks =
          state.isPlaying &&
          pDistMoved > 0.005 &&
          (pBraking ||
            _slalomStateP.handbrake ||
            Math.abs(state.pLatG) > 0.36 ||
            playerProg < 0.08 ||
            softSurface);

        if (pShouldLeaveMarks) {
          state.pMarkAccum += pDistMoved;
          if (state.pMarkAccum >= 0.72) {
            state.pMarkAccum = 0;
            _tireSide.crossVectors(_worldUp, _pFwd).normalize();
            _backDir.copy(_pFwd).negate();

            // Left rear tire contact
            _tirePos
              .copy(_pPos)
              .addScaledVector(_pFwd, playerCar.rearWheelZ)
              .addScaledVector(_tireSide, -playerCar.rearWheelX);
            _tirePos.y += 0.035;
            track3D.stampTireMark(_tirePos, _pQuat, 0.95);
            if (softSurface || surface === 'Wet Asphalt' || pBraking) {
              track3D.emitWheelSpray(_tirePos, _backDir);
            }

            // Right rear tire contact
            _tirePos
              .copy(_pPos)
              .addScaledVector(_pFwd, playerCar.rearWheelZ)
              .addScaledVector(_tireSide, playerCar.rearWheelX);
            _tirePos.y += 0.035;
            track3D.stampTireMark(_tirePos, _pQuat, 0.95);
            if (softSurface || surface === 'Wet Asphalt' || pBraking) {
              track3D.emitWheelSpray(_tirePos, _backDir);
            }
          }
        }

        const aShouldLeaveMarks =
          state.isPlaying &&
          aDistMoved > 0.005 &&
          (aBraking ||
            _slalomStateA.handbrake ||
            Math.abs(state.aLatG) > 0.36 ||
            aiProg < 0.08 ||
            softSurface);

        if (aShouldLeaveMarks) {
          state.aMarkAccum += aDistMoved;
          if (state.aMarkAccum >= 0.72) {
            state.aMarkAccum = 0;
            _tireSide.crossVectors(_worldUp, _aFwd).normalize();
            _backDir.copy(_aFwd).negate();

            _tirePos
              .copy(_aPos)
              .addScaledVector(_aFwd, aiCar.rearWheelZ)
              .addScaledVector(_tireSide, -aiCar.rearWheelX);
            _tirePos.y += 0.035;
            track3D.stampTireMark(_tirePos, _aQuat, 0.95);
            if (softSurface || surface === 'Wet Asphalt' || aBraking) {
              track3D.emitWheelSpray(_tirePos, _backDir);
            }

            _tirePos
              .copy(_aPos)
              .addScaledVector(_aFwd, aiCar.rearWheelZ)
              .addScaledVector(_tireSide, aiCar.rearWheelX);
            _tirePos.y += 0.035;
            track3D.stampTireMark(_tirePos, _aQuat, 0.95);
            if (softSurface || surface === 'Wet Asphalt' || aBraking) {
              track3D.emitWheelSpray(_tirePos, _backDir);
            }
          }
        }

        track3D.updateEffects(dt);

        // Animate glowing blue dot & floating YOU badge above player's roof
        if (playerCar.markerGroup && playerCar.haloMesh) {
          const baseRoofY =
            state.round.playerCar.bodyType === 'SUV' ||
            state.round.playerCar.bodyType === 'Pickup'
              ? 2.55
              : 2.2;
          playerCar.markerGroup.position.y =
            baseRoofY + Math.sin(state.elapsedTime * 3.4) * 0.14;
          const haloScale = 1 + Math.sin(state.elapsedTime * 4.2) * 0.16;
          playerCar.haloMesh.scale.setScalar(haloScale);
        }

        // DNF visual warning state
        const pIsDnf =
          state.round.playerDnf && playerProg >= state.round.playerDnfAtProgress - 0.01;
        const aIsDnf =
          state.round.aiDnf && aiProg >= state.round.aiDnfAtProgress - 0.01;

        if (playerCar.dnfBeacon) {
          playerCar.dnfBeacon.visible = pIsDnf;
          if (pIsDnf) playerCar.dnfBeacon.rotation.y += dt * 3;
        }
        if (aiCar.dnfBeacon) {
          aiCar.dnfBeacon.visible = aIsDnf;
          if (aIsDnf) aiCar.dnfBeacon.rotation.y += dt * 3;
        }

        // Anchor midpoint tightly to the player's car if the opponent falls far behind/ahead
        const carGap = _pPos.distanceTo(_aPos);
        _midPos.lerpVectors(_pPos, _aPos, carGap < 22 ? 0.35 : 0.08);
        if (track3D.weather) {
          track3D.weather.update(dt, _pPos.x, _pPos.z);
        }

        // Compute target camera position & look-at (primarily anchored on Player's car!)
        const zoom = state.orbitZoom;
        if (state.cameraMode === 'chase') {
          _sideVec.crossVectors(_worldUp, _pFwd).normalize();
          _desiredCamPos
            .copy(_pPos)
            .addScaledVector(_pFwd, -15.5 * zoom)
            .addScaledVector(_sideVec, -1.8)
            .addScaledVector(_worldUp, 6.8 * zoom);
          _desiredLookAt
            .copy(_pPos)
            .addScaledVector(_pFwd, 8.5)
            .addScaledVector(_worldUp, 1.3);
        } else if (state.cameraMode === 'tv') {
          _sideVec.crossVectors(_worldUp, _pFwd).normalize();
          _desiredCamPos
            .copy(_pPos)
            .addScaledVector(_sideVec, 34 * zoom)
            .addScaledVector(_pFwd, 15 * zoom)
            .addScaledVector(_worldUp, 17 * zoom);
          _desiredLookAt
            .copy(_pPos)
            .addScaledVector(_pFwd, 4.5)
            .addScaledVector(_worldUp, 1.1);
        } else if (state.cameraMode === 'top') {
          _desiredCamPos
            .copy(_pPos)
            .addScaledVector(_worldUp, 44 * zoom)
            .addScaledVector(_pFwd, -5);
          _desiredLookAt.copy(_pPos);
        } else {
          const dist = Math.max(75, track3D.overviewRadius * 1.65) * zoom;
          const yaw = state.orbitYawOffset;
          const pitch = state.orbitPitchOffset;
          _desiredCamPos.set(
            track3D.overviewCenter.x + Math.cos(yaw) * Math.cos(pitch) * dist,
            track3D.overviewCenter.y + Math.sin(pitch) * dist,
            track3D.overviewCenter.z + Math.sin(yaw) * Math.cos(pitch) * dist
          );
          _desiredLookAt.copy(track3D.overviewCenter);
        }

        if (state.snapCamera) {
          camera.position.copy(_desiredCamPos);
          _currentLookAt.copy(_desiredLookAt);
          state.snapCamera = false;
        } else {
          const dampLambda = state.cameraMode === 'overview' ? 8 : 6.5;
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            _desiredCamPos.x,
            dampLambda,
            dt
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            _desiredCamPos.y,
            dampLambda,
            dt
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            _desiredCamPos.z,
            dampLambda,
            dt
          );

          _currentLookAt.x = THREE.MathUtils.damp(_currentLookAt.x, _desiredLookAt.x, 8, dt);
          _currentLookAt.y = THREE.MathUtils.damp(_currentLookAt.y, _desiredLookAt.y, 8, dt);
          _currentLookAt.z = THREE.MathUtils.damp(_currentLookAt.z, _desiredLookAt.z, 8, dt);
        }
        camera.lookAt(_currentLookAt);

        // Throttled React HUD sync (~20fps)
        const uiMinMs = 1000 / Math.min(24, state.settings.fps);
        if (now - state.lastUiSyncMs >= uiMinMs) {
          state.lastUiSyncMs = now;
          const totalPlayerG = Math.hypot(state.pLongG, state.pLatG);
          const totalAiG = Math.hypot(state.aLongG, state.aLatG);
          const gripFactor = surface === 'Dry Asphalt' ? 1.0 : surface === 'Wet Asphalt' ? 0.68 : 0.48;
          const absActive =
            state.round.playerCar.hasAbs &&
            pBraking &&
            (state.pLongG < -0.22 || surface !== 'Dry Asphalt');
          const espActive =
            state.round.playerCar.hasTc &&
            state.isPlaying &&
            ((Math.abs(state.pLatG) > 0.52 * gripFactor && state.pSpeedMs > 8) ||
              (playerProg < 0.08 && surface !== 'Dry Asphalt' && state.pSpeedMs > 2));

          const aiAbsActive =
            state.round.aiCar.hasAbs &&
            aBraking &&
            (state.aLongG < -0.22 || surface !== 'Dry Asphalt');
          const aiEspActive =
            state.round.aiCar.hasTc &&
            state.isPlaying &&
            ((Math.abs(state.aLatG) > 0.52 * gripFactor && state.aSpeedMs > 8) ||
              (aiProg < 0.08 && surface !== 'Dry Asphalt' && state.aSpeedMs > 2));

          const tallyFactor = state.tallyActive ? Math.min(1, state.tallyElapsed / 0.85) : 0;
          const liveP = Math.round(state.round.playerPoints * tallyFactor);
          const liveA = Math.round(state.round.aiPoints * tallyFactor);
          if (liveP !== state.lastReportedP || liveA !== state.lastReportedA) {
            state.lastReportedP = liveP;
            state.lastReportedA = liveA;
            state.onTallyUpdate?.(state.round.roundNumber, liveP, liveA);
          }

          setUiTNorm(state.tNorm);
          setTelemetry({
            playerSpeedKmh: Math.round(state.pSpeedMs * 3.6),
            aiSpeedKmh: Math.round(state.aSpeedMs * 3.6),
            playerG: Number(totalPlayerG.toFixed(2)),
            playerLatG: Number(state.pLatG.toFixed(2)),
            aiG: Number(totalAiG.toFixed(2)),
            aiLatG: Number(state.aLatG.toFixed(2)),
            absActive,
            espActive,
            aiAbsActive,
            aiEspActive,
            playerBraking: pBraking,
            playerFinished: pReachedFinish,
            aiFinished: aReachedFinish,
            tallyFactor,
          });
        }
      }

      renderer.render(scene, camera);
      afterDraw(tick);
    };

    afterDraw(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      clearTimeout(autoAdvanceTimerId);
      ro.disconnect();

      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);

      if (sceneObjectsRef.current) {
        sceneObjectsRef.current.track3D?.dispose();
        sceneObjectsRef.current.playerCar?.dispose();
        sceneObjectsRef.current.aiCar?.dispose();
      }
      envRT.dispose();
      renderer.dispose();
      soundEngine.stopRaceAudio();
      if (domEl.parentElement === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  // Build / swap the 3D Track + BodyType cars whenever round changes
  useEffect(() => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;
    const { scene, sunLight } = objs;

    if (objs.track3D) {
      scene.remove(objs.track3D.group);
      objs.track3D.dispose();
    }
    if (objs.playerCar) {
      scene.remove(objs.playerCar.root);
      objs.playerCar.dispose();
    }
    if (objs.aiCar) {
      scene.remove(objs.aiCar.root);
      objs.aiCar.dispose();
    }

    const track3D = buildTrack3D(round.track);
    const playerCar = createCarModel3D(
      round.playerCar.bodyType,
      round.playerCar.accentColor,
      round.playerCar.groundClearance,
      true
    );
    const aiCar = createCarModel3D(
      round.aiCar.bodyType,
      round.aiCar.accentColor,
      round.aiCar.groundClearance,
      false
    );

    scene.add(track3D.group);
    scene.add(playerCar.root);
    scene.add(aiCar.root);

    objs.track3D = track3D;
    objs.playerCar = playerCar;
    objs.aiCar = aiCar;

    sunLight.target.position.copy(track3D.overviewCenter);
    sunLight.target.updateMatrixWorld();

    // Reset race playback state
    liveRef.current.round = round;
    liveRef.current.tNorm = 0;
    liveRef.current.isPlaying = true;
    liveRef.current.hasNotifiedFinish = false;
    liveRef.current.snapCamera = true;
    liveRef.current.prevPlayerProg = 0;
    liveRef.current.prevAiProg = 0;
    liveRef.current.pSpeedMs = 0;
    liveRef.current.aSpeedMs = 0;
    liveRef.current.pLongG = 0;
    liveRef.current.pLatG = 0;
    liveRef.current.aLongG = 0;
    liveRef.current.aLatG = 0;
    liveRef.current.pMarkAccum = 0;
    liveRef.current.aMarkAccum = 0;
    liveRef.current.tallyActive = false;
    liveRef.current.tallyElapsed = 0;
    liveRef.current.lastReportedP = -1;
    liveRef.current.lastReportedA = -1;

    applySceneTimeOfDay(liveRef.current.timeOfDay, round.track.surface);

    setUiTNorm(0);
    setIsPlaying(true);
    setPlayerImgFailed(false);
    setAiImgFailed(false);
    setTelemetry({
      playerSpeedKmh: 0,
      aiSpeedKmh: 0,
      playerG: 0,
      playerLatG: 0,
      aiG: 0,
      aiLatG: 0,
      absActive: false,
      espActive: false,
      aiAbsActive: false,
      aiEspActive: false,
      playerBraking: false,
      playerFinished: false,
      aiFinished: false,
      tallyFactor: 0,
    });
    const soundOn = liveRef.current.settings.soundEnabled;
    soundEngine.playRaceStart(soundOn);
    soundEngine.startRaceAudio(
      soundOn,
      round.playerCar.bodyType,
      round.playerCar.tags.includes('EV')
    );
    return () => {
      soundEngine.stopRaceAudio();
    };
  }, [round]);

  const finished = uiTNorm >= 0.999;

  const handleReplay = () => {
    sceneObjectsRef.current?.track3D?.clearTireMarks();
    liveRef.current.tNorm = 0;
    liveRef.current.prevPlayerProg = 0;
    liveRef.current.prevAiProg = 0;
    liveRef.current.pSpeedMs = 0;
    liveRef.current.aSpeedMs = 0;
    liveRef.current.pMarkAccum = 0;
    liveRef.current.aMarkAccum = 0;
    liveRef.current.tallyActive = false;
    liveRef.current.tallyElapsed = 0;
    liveRef.current.lastReportedP = 0;
    liveRef.current.lastReportedA = 0;
    liveRef.current.hasNotifiedFinish = false;
    liveRef.current.isPlaying = true;
    liveRef.current.snapCamera = true;
    onTallyUpdate?.(round.roundNumber, 0, 0);
    setUiTNorm(0);
    setIsPlaying(true);
    soundEngine.playRaceStart(localSoundEnabled);
    soundEngine.startRaceAudio(
      localSoundEnabled,
      round.playerCar.bodyType,
      round.playerCar.tags.includes('EV')
    );
  };

  const handleSkipToEnd = () => {
    soundEngine.stopRaceAudio();
    liveRef.current.tNorm = 1;
    liveRef.current.isPlaying = false;
    liveRef.current.hasNotifiedFinish = true;
    liveRef.current.tallyActive = true;
    liveRef.current.tallyElapsed = 0.85;
    liveRef.current.lastReportedP = round.playerPoints;
    liveRef.current.lastReportedA = round.aiPoints;
    onTallyUpdate?.(round.roundNumber, round.playerPoints, round.aiPoints);
    setTelemetry((prev) => ({
      ...prev,
      playerFinished: true,
      aiFinished: true,
      tallyFactor: 1,
    }));
    setUiTNorm(1);
    setIsPlaying(false);
  };

  const handleResume = () => {
    liveRef.current.isPlaying = true;
    setIsPlaying(true);
  };

  const handleToggleSpeed = () => {
    setSpeedMult((prev) => (prev === 1 ? 2 : 1));
  };

  const handleToggleSound = () => {
    setLocalSoundEnabled((prev) => {
      const next = !prev;
      if (!next) {
        soundEngine.stopRaceAudio();
      } else if (!finished) {
        soundEngine.startRaceAudio(
          true,
          round.playerCar.bodyType,
          round.playerCar.tags.includes('EV')
        );
      }
      return next;
    });
  };

  const handleCycleCamera = () => {
    const idx = CAMERA_MODES.findIndex((m) => m.id === cameraMode);
    const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
    handleSelectCamera(next.id);
  };

  const handleCycleTime = () => {
    const idx = TIME_MODES.findIndex((t) => t.id === timeOfDay);
    const next = TIME_MODES[(idx + 1) % TIME_MODES.length];
    handleSelectTimeOfDay(next.id);
  };

  const { playerProg, aiProg } = interpolateTimeline(round.timeline, uiTNorm);

  // Rolling score counter as soon as first car finishes
  const showTally = telemetry.tallyFactor > 0 || finished;
  const rollingPlayerPts = Math.round(round.playerPoints * telemetry.tallyFactor);
  const rollingAiPts = Math.round(round.aiPoints * telemetry.tallyFactor);

  const displaySpeedPlayer = `${telemetry.playerSpeedKmh} km/h`;
  const displaySpeedAi = `${telemetry.aiSpeedKmh} km/h`;
  const currentCamMeta = CAMERA_MODES.find((m) => m.id === cameraMode) ?? CAMERA_MODES[1];
  const currentTimeMeta = TIME_MODES.find((t) => t.id === timeOfDay) ?? TIME_MODES[0];

  return (
    <div className="relative w-full h-full bg-[#0B0E14] overflow-hidden select-none">
      {/* Unobstructed Fullscreen 3D WebGL Viewport */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* TOP-LEFT HUD: Track Metadata & Rolling Points */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex flex-col gap-1.5 max-w-[240px] sm:max-w-[340px] pointer-events-auto">
        <div className="race-top-pill rounded-xl border border-slate-700/80 bg-[#0E1420]/95 px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 shadow-xl">
          <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
            Kolo {round.roundNumber}/5 · {SURFACE_LABELS_SK[round.track.surface]} ·{' '}
            {round.track.distanceMeters} m
            {round.track.hasSpeedBumps ? ' · Spomaľovače' : ''}
            {round.track.isSteepClimb ? ' · Stúpanie' : ''}
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-3 mt-0.5">
            <h3 className="font-display text-base sm:text-xl font-bold text-slate-100 leading-tight truncate">
              {round.track.name}
            </h3>
            {showTally && (
              <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-700 bg-slate-900 font-mono text-[11px] sm:text-xs font-bold tabular-nums shrink-0">
                {round.winner === 'player' ? (
                  <span className="text-emerald-400">+{rollingPlayerPts} b</span>
                ) : round.winner === 'ai' ? (
                  <span className="text-rose-400">Súper +{rollingAiPts} b</span>
                ) : (
                  <span className="text-slate-300">+{rollingPlayerPts} b</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DNF Live Alert Banner */}
        {finished && (round.playerDnf || round.aiDnf) && !hudHidden && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-950/95 px-3 py-1.5 text-[11px] sm:text-xs text-rose-200 space-y-0.5 shadow-lg">
            {round.playerDnf && <div>Tvoje auto (DNF): {round.playerDnfReason}</div>}
            {round.aiDnf && <div>Súper (DNF): {round.aiDnfReason}</div>}
          </div>
        )}
      </div>

      {/* TOP-RIGHT HUD: Camera, Time-of-Day, 2x Speed, Skip & HUD Toggle */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 rounded-xl border border-slate-700/80 bg-[#0E1420]/95 p-1 sm:p-1.5 shadow-xl">
          {/* Quick Audio Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              localSoundEnabled
                ? 'bg-slate-800 text-sky-300 hover:bg-slate-700'
                : 'bg-slate-900 text-slate-500 hover:text-slate-300'
            }`}
            title={localSoundEnabled ? 'Stlmiť zvuk preteku' : 'Zapnúť zvuk preteku'}
          >
            {localSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Compact Mobile Camera & Time Cycle Buttons (< md) */}
          <button
            type="button"
            onClick={handleCycleCamera}
            className="md:hidden inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 text-sky-300 hover:bg-slate-700 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
            title="Prepnúť kameru"
          >
            {currentCamMeta.icon}
            <span className="hidden sm:inline">{currentCamMeta.label}</span>
          </button>

          <button
            type="button"
            onClick={handleCycleTime}
            className="md:hidden inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 text-amber-300 hover:bg-slate-700 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
            title="Prepnúť dennú dobu"
          >
            {currentTimeMeta.icon}
            <span className="hidden sm:inline">{currentTimeMeta.label}</span>
          </button>

          {/* Speed Toggle (1x / 2x) */}
          <button
            type="button"
            onClick={handleToggleSpeed}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              speedMult === 2
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title="Prepnúť rýchlosť simulácie 1× / 2×"
          >
            <FastForward className="w-3.5 h-3.5" />
            {speedMult}×
          </button>

          {/* Skip / Replay / Play */}
          {!finished ? (
            <button
              type="button"
              onClick={handleSkipToEnd}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              title="Preskočiť na koniec kola"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReplay}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Znova
            </button>
          )}

          {!isPlaying && !finished && (
            <button
              type="button"
              onClick={handleResume}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              Spustiť
            </button>
          )}

          {/* HUD Card Visibility Toggle */}
          <button
            type="button"
            onClick={() => setHudHidden((h) => !h)}
            className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            title={hudHidden ? 'Zobraziť karty vozidiel' : 'Skryť karty vozidiel'}
          >
            {hudHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Full Desktop Camera & Time-of-Day Strip */}
        <div className="hidden md:flex flex-wrap items-center justify-end gap-1.5 rounded-xl border border-slate-700/80 bg-[#0E1420]/95 p-1.5 shadow-xl">
          {CAMERA_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectCamera(m.id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                cameraMode === m.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
          <span className="h-4 w-px bg-slate-700 mx-0.5" />
          {TIME_MODES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTimeOfDay(t.id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                timeOfDay === t.id
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM-LEFT HUD: Player Garage-Matched Card (Blue Outer Border + Rarity Header) */}
      {!hudHidden && (
        <div className="race-hud-card absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-20 w-[205px] sm:w-[276px] lg:w-[320px] rounded-xl border-2 border-sky-500 bg-[#121722]/95 shadow-2xl overflow-hidden pointer-events-auto">
          <div
            className={`flex items-center justify-between px-2.5 py-1 border-b border-slate-800/80 ${
              RARITY_COLORS[round.playerCar.rarity].headerBg
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 font-mono text-[10px] font-bold">
                TY
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold truncate ${
                  RARITY_COLORS[round.playerCar.rarity].text
                }`}
              >
                {round.playerCar.rarity}
              </span>
              <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap truncate">
                · {round.playerStats.totalUpgrades > 0 ? round.playerStats.buildCode : 'Séria'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-[10px] text-slate-300">RQ</span>
              <span className="font-display text-sm sm:text-base font-bold text-white leading-none tabular-nums">
                {round.playerCar.rq}
              </span>
            </div>
          </div>

          <div className="race-hud-card-body p-2 sm:p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="race-hud-thumb relative w-16 sm:w-24 aspect-[16/10] rounded-lg border border-slate-700 bg-[#0E131B] overflow-hidden shrink-0 flex items-center justify-center">
                {round.playerCar.imageUrl && !playerImgFailed ? (
                  <img
                    src={round.playerCar.imageUrl}
                    alt={`${round.playerCar.make} ${round.playerCar.model}`}
                    referrerPolicy="no-referrer"
                    onError={() => setPlayerImgFailed(true)}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <div className="w-full h-full p-1">
                    <CarIllustration
                      bodyType={round.playerCar.bodyType}
                      accentColor={round.playerCar.accentColor}
                    />
                  </div>
                )}
                <div className="absolute top-0.5 right-0.5 text-[8px] sm:text-[9px] font-mono text-slate-200 bg-black/70 px-1 rounded tabular-nums">
                  {round.playerCar.year}·{round.playerCar.country}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                  <span className="truncate">{round.playerCar.make}</span>
                  <span className="font-mono text-slate-200 tabular-nums shrink-0">
                    {finished || telemetry.playerFinished
                      ? round.playerDnf
                        ? 'DNF'
                        : `${round.playerTime.toFixed(2)}s`
                      : `${Math.round(playerProg * 100)}%`}
                  </span>
                </div>
                <div className="font-display text-sm sm:text-base font-bold text-white truncate leading-tight">
                  {round.playerCar.model}
                </div>
                <div className="flex items-baseline justify-between gap-1.5 mt-0.5 tabular-nums">
                  <span className="font-mono text-sm sm:text-lg font-bold text-white leading-none">
                    {displaySpeedPlayer}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-mono text-[10px] sm:text-xs font-semibold text-sky-300">
                    <Gauge className="w-3 h-3" />
                    {telemetry.playerG.toFixed(2)}G
                  </span>
                </div>
              </div>
            </div>

            {/* Garage Base/Tuned Performance Metrics */}
            <div className="race-hud-specs grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/80 tabular-nums">
              <div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 leading-none">Max rýchl.</div>
                <div className="font-mono text-[10px] sm:text-xs font-semibold text-slate-100 mt-0.5">
                  {formatSpeed(round.playerStats.topSpeedMph, settings)}
                </div>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 leading-none">0–100 km/h</div>
                <div className="font-mono text-[10px] sm:text-xs font-semibold text-slate-100 mt-0.5">
                  {formatAccel0to100(round.playerStats.accel0to60)}
                </div>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 leading-none">Handling</div>
                <div className="font-mono text-[10px] sm:text-xs font-semibold text-slate-100 mt-0.5">
                  {round.playerStats.handling}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80 text-[9px] sm:text-[10px]">
              <span className="font-mono text-slate-300 truncate">
                {round.playerCar.tyreType} ·{' '}
                {round.playerCar.driveType === '4WD' ? '4x4' : round.playerCar.driveType} ·{' '}
                {round.playerCar.groundClearance.toUpperCase()}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`px-1 py-0.5 rounded font-mono font-bold border ${
                    !round.playerCar.hasAbs
                      ? 'border-slate-800 bg-slate-900 text-slate-600'
                      : telemetry.absActive
                      ? 'border-amber-400 bg-amber-500 text-slate-950'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}
                >
                  {round.playerCar.hasAbs ? 'ABS' : 'NO ABS'}
                </span>
                <span
                  className={`px-1 py-0.5 rounded font-mono font-bold border ${
                    !round.playerCar.hasTc
                      ? 'border-slate-800 bg-slate-900 text-slate-600'
                      : telemetry.espActive
                      ? 'border-amber-400 bg-amber-500 text-slate-950'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}
                >
                  {round.playerCar.hasTc ? 'ESP' : 'NO ESP'}
                </span>
              </div>
            </div>

            {(finished || telemetry.playerFinished) && (
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded">
                <span>Max v kole:</span>
                <strong>{Math.round(round.playerPeakSpeedMs * 3.6)} km/h</strong>
              </div>
            )}

            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-none ${
                  round.playerDnf && playerProg >= round.playerDnfAtProgress - 0.01
                    ? 'bg-rose-500'
                    : 'bg-sky-400'
                }`}
                style={{ width: `${Math.round(playerProg * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT HUD: Opponent Garage-Matched Card (Orange Outer Border + Rarity Header) */}
      {!hudHidden && (
        <div className="race-hud-card absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-20 w-[205px] sm:w-[276px] lg:w-[320px] rounded-xl border-2 border-amber-500 bg-[#121722]/95 shadow-2xl overflow-hidden pointer-events-auto">
          <div
            className={`flex items-center justify-between px-2.5 py-1 border-b border-slate-800/80 ${
              RARITY_COLORS[round.aiCar.rarity].headerBg
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-bold">
                SÚPER
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold truncate ${
                  RARITY_COLORS[round.aiCar.rarity].text
                }`}
              >
                {round.aiCar.rarity}
              </span>
              <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap truncate">
                · {round.aiStats.totalUpgrades > 0 ? round.aiStats.buildCode : 'Séria'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-[10px] text-slate-300">RQ</span>
              <span className="font-display text-sm sm:text-base font-bold text-white leading-none tabular-nums">
                {round.aiCar.rq}
              </span>
            </div>
          </div>

          <div className="race-hud-card-body p-2 sm:p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="race-hud-thumb relative w-16 sm:w-24 aspect-[16/10] rounded-lg border border-slate-700 bg-[#0E131B] overflow-hidden shrink-0 flex items-center justify-center">
                {round.aiCar.imageUrl && !aiImgFailed ? (
                  <img
                    src={round.aiCar.imageUrl}
                    alt={`${round.aiCar.make} ${round.aiCar.model}`}
                    referrerPolicy="no-referrer"
                    onError={() => setAiImgFailed(true)}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <div className="w-full h-full p-1">
                    <CarIllustration
                      bodyType={round.aiCar.bodyType}
                      accentColor={round.aiCar.accentColor}
                    />
                  </div>
                )}
                <div className="absolute top-0.5 right-0.5 text-[8px] sm:text-[9px] font-mono text-slate-200 bg-black/70 px-1 rounded tabular-nums">
                  {round.aiCar.year}·{round.aiCar.country}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                  <span className="truncate">{round.aiCar.make}</span>
                  <span className="font-mono text-slate-200 tabular-nums shrink-0">
                    {finished || telemetry.aiFinished
                      ? round.aiDnf
                        ? 'DNF'
                        : `${round.aiTime.toFixed(2)}s`
                      : `${Math.round(aiProg * 100)}%`}
                  </span>
                </div>
                <div className="font-display text-sm sm:text-base font-bold text-white truncate leading-tight">
                  {round.aiCar.model}
                </div>
                <div className="flex items-baseline justify-between gap-1.5 mt-0.5 tabular-nums">
                  <span className="font-mono text-sm sm:text-lg font-bold text-white leading-none">
                    {displaySpeedAi}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-mono text-[10px] sm:text-xs font-semibold text-amber-300">
                    <Gauge className="w-3 h-3" />
                    {telemetry.aiG.toFixed(2)}G
                  </span>
                </div>
              </div>
            </div>

            {/* Garage Base/Tuned Performance Metrics */}
            <div className="race-hud-specs grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/80 tabular-nums">
              <div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 leading-none">Max rýchl.</div>
                <div className="font-mono text-[10px] sm:text-xs font-semibold text-slate-100 mt-0.5">
                  {formatSpeed(round.aiStats.topSpeedMph, settings)}
                </div>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 leading-none">0–100 km/h</div>
                <div className="font-mono text-[10px] sm:text-xs font-semibold text-slate-100 mt-0.5">
                  {formatAccel0to100(round.aiStats.accel0to60)}
                </div>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 leading-none">Handling</div>
                <div className="font-mono text-[10px] sm:text-xs font-semibold text-slate-100 mt-0.5">
                  {round.aiStats.handling}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80 text-[9px] sm:text-[10px]">
              <span className="font-mono text-slate-300 truncate">
                {round.aiCar.tyreType} ·{' '}
                {round.aiCar.driveType === '4WD' ? '4x4' : round.aiCar.driveType} ·{' '}
                {round.aiCar.groundClearance.toUpperCase()}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`px-1 py-0.5 rounded font-mono font-bold border ${
                    !round.aiCar.hasAbs
                      ? 'border-slate-800 bg-slate-900 text-slate-600'
                      : telemetry.aiAbsActive
                      ? 'border-amber-400 bg-amber-500 text-slate-950'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}
                >
                  {round.aiCar.hasAbs ? 'ABS' : 'NO ABS'}
                </span>
                <span
                  className={`px-1 py-0.5 rounded font-mono font-bold border ${
                    !round.aiCar.hasTc
                      ? 'border-slate-800 bg-slate-900 text-slate-600'
                      : telemetry.aiEspActive
                      ? 'border-amber-400 bg-amber-500 text-slate-950'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}
                >
                  {round.aiCar.hasTc ? 'ESP' : 'NO ESP'}
                </span>
              </div>
            </div>

            {(finished || telemetry.aiFinished) && (
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-amber-300 bg-amber-950/35 px-2 py-0.5 rounded">
                <span>Max v kole:</span>
                <strong>{Math.round(round.aiPeakSpeedMs * 3.6)} km/h</strong>
              </div>
            )}

            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-none ${
                  round.aiDnf && aiProg >= round.aiDnfAtProgress - 0.01
                    ? 'bg-rose-500'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${Math.round(aiProg * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* RESULT SUMMARY & NEXT-ROUND ACTION (Accessible on ALL viewports) */}
      {finished && (
        <div className="flex absolute top-14 lg:top-auto lg:bottom-3 left-1/2 -translate-x-1/2 z-30 items-center gap-2.5 sm:gap-4 rounded-xl border border-slate-700 bg-[#0E1420]/95 px-3 py-1.5 sm:px-4 sm:py-2.5 shadow-2xl pointer-events-auto max-w-[95vw] overflow-x-auto no-scrollbar">
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 tabular-nums">
            {round.sectors.map((sec) => (
              <span key={sec.name} className="whitespace-nowrap">
                {sec.name}:{' '}
                <strong
                  className={
                    sec.playerTime <= sec.aiTime
                      ? 'text-emerald-400 font-mono'
                      : 'text-rose-400 font-mono'
                  }
                >
                  {sec.playerTime.toFixed(2)}s
                </strong>
                /<span className="font-mono text-slate-300">{sec.aiTime.toFixed(2)}s</span>
              </span>
            ))}
          </div>
          <div className="hidden lg:block h-4 w-px bg-slate-700" />
          <div className="font-mono text-xs font-bold tabular-nums whitespace-nowrap">
            {round.winner === 'player' ? (
              <span className="text-emerald-400">+{round.playerPoints} b (Výhra)</span>
            ) : round.winner === 'ai' ? (
              <span className="text-rose-400">Súper +{round.aiPoints} b (Prehra)</span>
            ) : (
              <span className="text-slate-300">Remíza</span>
            )}
          </div>
          {!autoPlay && onRoundComplete && (
            <button
              type="button"
              onClick={onRoundComplete}
              className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {round.roundNumber < 5 ? 'Ďalšie kolo' : 'Súhrn zápasu'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
