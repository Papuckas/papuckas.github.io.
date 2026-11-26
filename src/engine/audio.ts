import { BodyType, SurfaceType } from '../types/game';

interface RaceVoiceNodes {
  master: GainNode;
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  engineFilter: BiquadFilterNode;
  engineGain: GainNode;
  tireSource: AudioBufferSourceNode;
  tireFilter: BiquadFilterNode;
  tireGain: GainNode;
  brakeFilter: BiquadFilterNode;
  brakeGain: GainNode;
  isEv: boolean;
  basePitch: number;
  lastGear: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private raceNodes: RaceVoiceNodes | null = null;

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  playTone(freq: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.05) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }

  playUpgrade(enabled: boolean) {
    if (!enabled) return;
    this.playTone(520, 70, 'triangle', 0.04);
    setTimeout(() => this.playTone(780, 90, 'triangle', 0.04), 55);
  }

  playRaceStart(enabled: boolean) {
    if (!enabled) return;
    this.playTone(440, 110, 'triangle', 0.035);
    setTimeout(() => this.playTone(660, 160, 'triangle', 0.045), 115);
  }

  playVictory(enabled: boolean) {
    if (!enabled) return;
    this.playTone(523.25, 110, 'triangle', 0.05);
    setTimeout(() => this.playTone(659.25, 110, 'triangle', 0.05), 100);
    setTimeout(() => this.playTone(783.99, 220, 'triangle', 0.06), 200);
  }

  playDefeat(enabled: boolean) {
    if (!enabled) return;
    this.playTone(330, 140, 'sawtooth', 0.03);
    setTimeout(() => this.playTone(247, 220, 'sawtooth', 0.03), 130);
  }

  playPackReveal(enabled: boolean) {
    if (!enabled) return;
    this.playTone(392, 90, 'sine', 0.04);
    setTimeout(() => this.playTone(587.33, 120, 'sine', 0.05), 80);
    setTimeout(() => this.playTone(880, 180, 'triangle', 0.05), 170);
  }

  startRaceAudio(enabled: boolean, bodyType: BodyType, isEv: boolean) {
    this.stopRaceAudio();
    if (!enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.setTargetAtTime(0.24, now, 0.06);
      master.connect(ctx.destination);

      // Engine voice (dual oscillator + lowpass exhaust filter)
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const engineFilter = ctx.createBiquadFilter();
      const engineGain = ctx.createGain();

      oscA.type = isEv ? 'sine' : 'sawtooth';
      oscB.type = isEv ? 'triangle' : 'triangle';

      const basePitch = isEv
        ? 110
        : bodyType === 'Supercar' || bodyType === 'Track'
        ? 56
        : bodyType === 'SUV' || bodyType === 'Pickup'
        ? 38
        : 46;

      oscA.frequency.setValueAtTime(basePitch, now);
      oscB.frequency.setValueAtTime(basePitch * (isEv ? 2.0 : 1.5), now);

      engineFilter.type = 'lowpass';
      engineFilter.frequency.setValueAtTime(isEv ? 950 : 280, now);
      engineFilter.Q.setValueAtTime(isEv ? 1.8 : 2.6, now);

      engineGain.gain.setValueAtTime(0.06, now);

      oscA.connect(engineFilter);
      oscB.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);

      oscA.start(now);
      oscB.start(now);

      // Continuous tire skid / surface noise loop
      const noiseBuf = this.getNoiseBuffer(ctx);
      const tireSource = ctx.createBufferSource();
      tireSource.buffer = noiseBuf;
      tireSource.loop = true;

      const tireFilter = ctx.createBiquadFilter();
      tireFilter.type = 'bandpass';
      tireFilter.frequency.setValueAtTime(1250, now);
      tireFilter.Q.setValueAtTime(3.4, now);

      const tireGain = ctx.createGain();
      tireGain.gain.setValueAtTime(0.0001, now);

      // Brake pad friction hiss
      const brakeFilter = ctx.createBiquadFilter();
      brakeFilter.type = 'highpass';
      brakeFilter.frequency.setValueAtTime(2200, now);

      const brakeGain = ctx.createGain();
      brakeGain.gain.setValueAtTime(0.0001, now);

      tireSource.connect(tireFilter);
      tireFilter.connect(tireGain);
      tireGain.connect(master);

      tireSource.connect(brakeFilter);
      brakeFilter.connect(brakeGain);
      brakeGain.connect(master);

      tireSource.start(now);

      this.raceNodes = {
        master,
        oscA,
        oscB,
        engineFilter,
        engineGain,
        tireSource,
        tireFilter,
        tireGain,
        brakeFilter,
        brakeGain,
        isEv,
        basePitch,
        lastGear: 1,
      };
    } catch {
      this.raceNodes = null;
    }
  }

  updateRaceAudio(params: {
    enabled: boolean;
    playing: boolean;
    finished: boolean;
    speedMs: number;
    maxSpeedMs: number;
    longG: number;
    latG: number;
    braking: boolean;
    handbrake: boolean;
    surface: SurfaceType;
    speedMult: 1 | 2;
  }) {
    if (!params.enabled) {
      if (this.raceNodes) this.stopRaceAudio();
      return;
    }
    const nodes = this.raceNodes;
    const ctx = this.ctx;
    if (!nodes || !ctx) return;

    try {
      const now = ctx.currentTime;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (!params.playing || params.finished) {
        nodes.master.gain.setTargetAtTime(0.0001, now, 0.05);
        return;
      }

      nodes.master.gain.setTargetAtTime(params.speedMult === 2 ? 0.18 : 0.24, now, 0.05);

      const speedRatio = Math.max(0, Math.min(1.08, params.speedMs / Math.max(25, params.maxSpeedMs)));

      if (nodes.isEv) {
        const evFreq = nodes.basePitch + speedRatio * 340;
        nodes.oscA.frequency.setTargetAtTime(evFreq, now, 0.04);
        nodes.oscB.frequency.setTargetAtTime(evFreq * 2.02, now, 0.04);
        nodes.engineFilter.frequency.setTargetAtTime(520 + speedRatio * 1400, now, 0.05);
        nodes.engineGain.gain.setTargetAtTime(0.04 + speedRatio * 0.06, now, 0.05);
      } else {
        // 6-speed virtual gearbox curve
        const gearThresholds = [0, 0.16, 0.32, 0.50, 0.69, 0.86, 1.15];
        let gear = 1;
        for (let g = 1; g <= 6; g++) {
          if (speedRatio >= gearThresholds[g - 1]) gear = g;
        }
        const gLow = gearThresholds[gear - 1];
        const gHigh = gearThresholds[gear];
        const gearFrac = Math.max(0, Math.min(1, (speedRatio - gLow) / Math.max(0.08, gHigh - gLow)));
        // RPM moves smoothly from 0.35 -> 1.0 within gear (dips on upshift!)
        const rpmNorm = 0.25 + gearFrac * 0.75;
        const shiftBurp = gear !== nodes.lastGear ? 0.88 : 1.0;
        nodes.lastGear = gear;

        const pitchMult = (1 + rpmNorm * 2.15) * shiftBurp * (params.speedMult === 2 ? 1.12 : 1.0);
        const engineFreq = nodes.basePitch * pitchMult;

        nodes.oscA.frequency.setTargetAtTime(engineFreq, now, 0.035);
        nodes.oscB.frequency.setTargetAtTime(engineFreq * 1.505, now, 0.035);
        nodes.engineFilter.frequency.setTargetAtTime(
          210 + rpmNorm * 680 + (params.longG > 0.2 ? 220 : 0),
          now,
          0.04
        );
        const loadVol = 0.065 + (params.longG > 0.1 ? 0.05 : 0.015) + rpmNorm * 0.045;
        nodes.engineGain.gain.setTargetAtTime(loadVol, now, 0.04);
      }

      // Surface-aware tire screech / gravel crunch / wet spray sound
      const cornerSlip = Math.max(0, Math.abs(params.latG) - 0.38) * 0.9;
      const launchSlip = params.speedMs < 14 && params.longG > 0.42 ? (params.longG - 0.35) * 0.8 : 0;
      const brakeSlip = params.braking && params.longG < -0.35 ? (-params.longG - 0.25) * 0.7 : 0;
      const handbrakeSlip = params.handbrake ? 0.95 : 0;
      const totalSlip =
        params.speedMs > 1.5
          ? Math.min(1, Math.max(cornerSlip, launchSlip, brakeSlip, handbrakeSlip))
          : 0;

      const isWet = params.surface === 'Wet Asphalt';
      const isLoose =
        params.surface === 'Gravel' ||
        params.surface === 'Mud' ||
        params.surface === 'Snow' ||
        params.surface === 'Ice';

      if (isLoose) {
        nodes.tireFilter.frequency.setTargetAtTime(480 + speedRatio * 340, now, 0.05);
        nodes.tireFilter.Q.setTargetAtTime(1.1, now, 0.05);
        const looseRoll = params.speedMs > 2 ? 0.03 + speedRatio * 0.045 : 0;
        nodes.tireGain.gain.setTargetAtTime(looseRoll + totalSlip * 0.085, now, 0.04);
      } else if (isWet) {
        nodes.tireFilter.frequency.setTargetAtTime(1650 + speedRatio * 450, now, 0.05);
        nodes.tireFilter.Q.setTargetAtTime(1.8, now, 0.05);
        const wetRoll = params.speedMs > 3 ? 0.018 + speedRatio * 0.035 : 0;
        nodes.tireGain.gain.setTargetAtTime(wetRoll + totalSlip * 0.075, now, 0.04);
      } else {
        // Dry asphalt rubber screech
        nodes.tireFilter.frequency.setTargetAtTime(1180 + totalSlip * 420, now, 0.04);
        nodes.tireFilter.Q.setTargetAtTime(4.2, now, 0.04);
        nodes.tireGain.gain.setTargetAtTime(totalSlip * 0.085, now, 0.035);
      }

      // Brake pad friction hiss / squeal during braking
      const brakeLevel =
        (params.braking || params.handbrake) && params.speedMs > 2.5
          ? params.handbrake
            ? 0.065
            : Math.min(0.05, Math.abs(params.longG) * 0.045 + 0.012)
          : 0.0001;
      nodes.brakeGain.gain.setTargetAtTime(brakeLevel, now, 0.04);
    } catch {
      // Ignore transient Web Audio update errors
    }
  }

  stopRaceAudio() {
    const nodes = this.raceNodes;
    this.raceNodes = null;
    if (!nodes) return;
    try {
      const ctx = this.ctx;
      if (ctx) {
        nodes.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
      }
      setTimeout(() => {
        try {
          nodes.oscA.stop();
          nodes.oscB.stop();
          nodes.tireSource.stop();
          nodes.master.disconnect();
        } catch {
          // Already stopped
        }
      }, 60);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export const soundEngine = new SoundEngine();
