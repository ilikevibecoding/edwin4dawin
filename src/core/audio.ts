import * as THREE from 'three';
import { settings } from './settings';
import { registerAsset } from '../assets/registry';

registerAsset({
  id: 'audio.suite',
  name: 'Synthesized audio suite (weapons, foley, doors, glass, UI, voice radio, ambience)',
  category: 'audio',
  agent: 'Opus 1',
  files: 'src/core/audio.ts',
  where: 'all states',
  dims: 'n/a',
  materials: 'n/a',
  textures: 'n/a',
  collision: 'none',
  lod: 'none',
  anim: 'n/a',
  audio: 'self',
  status: 'integrated',
  accept: 'every visible action has a sound; positional attenuation; volumes obey settings',
});

type PatchFn = (ac: AudioContext, out: AudioNode, rate: number) => void;

function noiseBuffer(ac: AudioContext, seconds: number, colored = false): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (colored) {
      last = last * 0.94 + w * 0.06;
      d[i] = last * 6;
    } else {
      d[i] = w;
    }
  }
  return buf;
}

function env(ac: AudioContext, node: GainNode, a: number, peak: number, d: number, sustain = 0.0001): void {
  const t = ac.currentTime;
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t + Math.max(a, 0.001));
  node.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
}

export class AudioEngine {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
  private listenerPos = new THREE.Vector3();
  private listenerYaw = 0;
  private ambientNodes: AudioNode[] = [];
  private ambientRoom: string | null = null;
  private musicNodes: AudioNode[] = [];
  private muffleT = 0;

  /** must be called from a user gesture (menu click) */
  init(): void {
    if (this.ac) {
      if (this.ac.state === 'suspended') void this.ac.resume();
      return;
    }
    try {
      this.ac = new AudioContext();
    } catch {
      return;
    }
    this.master = this.ac.createGain();
    this.master.connect(this.ac.destination);
    this.sfx = this.ac.createGain();
    this.sfx.connect(this.master);
    this.music = this.ac.createGain();
    this.music.connect(this.master);
    this.noise = noiseBuffer(this.ac, 2);
    this.brown = noiseBuffer(this.ac, 4, true);
    this.applyVolumes();
  }

  get ready(): boolean {
    return !!this.ac && this.ac.state === 'running';
  }

  applyVolumes(): void {
    if (!this.master || !this.sfx || !this.music) return;
    this.master.gain.value = settings.get('masterVolume');
    this.sfx.gain.value = settings.get('effectsVolume');
    this.music.gain.value = settings.get('musicVolume') * 0.7;
  }

  setListener(pos: THREE.Vector3, yaw: number): void {
    this.listenerPos.copy(pos);
    this.listenerYaw = yaw;
  }

  /** positional play with distance/pan */
  play(patch: string, opts: { pos?: THREE.Vector3; vol?: number; rate?: number; range?: number } = {}): void {
    if (!this.ac || !this.sfx || this.ac.state !== 'running') return;
    const fn = PATCHES[patch];
    if (!fn) return;
    const gain = this.ac.createGain();
    let vol = opts.vol ?? 1;
    let panVal = 0;
    if (opts.pos) {
      const range = opts.range ?? 30;
      const d = opts.pos.distanceTo(this.listenerPos);
      if (d > range) return;
      vol *= Math.pow(Math.max(0, 1 - d / range), 1.35);
      const dx = opts.pos.x - this.listenerPos.x;
      const dz = opts.pos.z - this.listenerPos.z;
      const ang = Math.atan2(-dx, -dz) - this.listenerYaw;
      panVal = THREE.MathUtils.clamp(-Math.sin(ang), -0.85, 0.85);
    }
    if (this.muffleT > 0) vol *= 0.3;
    gain.gain.value = vol;
    const pan = this.ac.createStereoPanner();
    pan.pan.value = panVal;
    gain.connect(pan);
    pan.connect(this.sfx);
    fn(this.ac, gain, opts.rate ?? 1);
  }

  muffle(seconds: number): void {
    this.muffleT = seconds;
  }

  step(dt: number): void {
    if (this.muffleT > 0) this.muffleT -= dt;
  }

  // -------------- ambience --------------
  setAmbience(room: string | null): void {
    if (!this.ac || !this.sfx || room === this.ambientRoom) return;
    this.ambientRoom = room;
    for (const n of this.ambientNodes) {
      try { (n as AudioBufferSourceNode).stop?.(); } catch { /* */ }
      n.disconnect();
    }
    this.ambientNodes = [];
    if (!room || !this.brown) return;
    const ac = this.ac;
    const mk = (freq: number, gainV: number, q = 0.8): void => {
      const src = ac.createBufferSource();
      src.buffer = this.brown;
      src.loop = true;
      const filt = ac.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = freq;
      filt.Q.value = q;
      const g = ac.createGain();
      g.gain.value = 0.0001;
      g.gain.linearRampToValueAtTime(gainV, ac.currentTime + 1.2);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.sfx!);
      src.start();
      this.ambientNodes.push(src, filt, g);
    };
    const hum = (freq: number, gainV: number): void => {
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const filt = ac.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = freq * 3;
      const g = ac.createGain();
      g.gain.value = 0.0001;
      g.gain.linearRampToValueAtTime(gainV, ac.currentTime + 1.5);
      osc.connect(filt);
      filt.connect(g);
      g.connect(this.sfx!);
      osc.start();
      this.ambientNodes.push(osc, filt, g);
    };
    switch (room) {
      case 'wind':
        mk(280, 0.09, 0.5);
        mk(120, 0.07, 0.4);
        break;
      case 'hvac':
        mk(90, 0.05, 0.6);
        hum(120, 0.006);
        break;
      case 'server':
        mk(240, 0.06, 0.7);
        hum(160, 0.012);
        break;
      case 'service':
      case 'mech':
        mk(70, 0.06, 0.5);
        hum(100, 0.01);
        break;
      case 'garage':
        mk(160, 0.05, 0.4);
        mk(60, 0.05, 0.5);
        break;
      case 'stairwell':
        mk(200, 0.03, 0.7);
        break;
      default:
        mk(100, 0.04, 0.5);
    }
  }

  // -------------- music --------------
  playMenuPad(): void {
    if (!this.ac || !this.music) return;
    this.stopMusic();
    const ac = this.ac;
    const chord = [110, 146.83, 164.81, 220, 293.66];
    for (const f of chord) {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const osc2 = ac.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = f * 1.003;
      const g = ac.createGain();
      g.gain.value = 0.0001;
      g.gain.linearRampToValueAtTime(0.028, ac.currentTime + 3.5);
      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.06 + Math.random() * 0.05;
      const lfoG = ac.createGain();
      lfoG.gain.value = 0.012;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      osc.connect(g);
      osc2.connect(g);
      g.connect(this.music);
      osc.start();
      osc2.start();
      lfo.start();
      this.musicNodes.push(osc, osc2, g, lfo, lfoG);
    }
  }

  stopMusic(): void {
    for (const n of this.musicNodes) {
      try { (n as OscillatorNode).stop?.(); } catch { /* */ }
      n.disconnect();
    }
    this.musicNodes = [];
  }

  stinger(kind: 'victory' | 'defeat'): void {
    if (!this.ac || !this.music) return;
    const ac = this.ac;
    const notes = kind === 'victory' ? [261.6, 329.6, 392, 523.3] : [220, 207.7, 196, 185];
    notes.forEach((f, i) => {
      const osc = ac.createOscillator();
      osc.type = kind === 'victory' ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const g = ac.createGain();
      const t = ac.currentTime + i * (kind === 'victory' ? 0.14 : 0.3);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'victory' ? 1.2 : 2));
      osc.connect(g);
      g.connect(this.music!);
      osc.start(t);
      osc.stop(t + 2.4);
    });
  }
}

// ---------------------------------------------------------------------------
// Patches
// ---------------------------------------------------------------------------

const PATCHES: Record<string, PatchFn> = {};

function patch(name: string, fn: PatchFn): void {
  PATCHES[name] = fn;
}

function burst(ac: AudioContext, out: AudioNode, dur: number, filtFreq: number, peak: number, type: BiquadFilterType = 'lowpass', q = 0.8): void {
  const src = ac.createBufferSource();
  src.buffer = sharedNoise(ac);
  const filt = ac.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = filtFreq;
  filt.Q.value = q;
  const g = ac.createGain();
  env(ac, g, 0.002, peak, dur);
  src.connect(filt);
  filt.connect(g);
  g.connect(out);
  src.start();
  src.stop(ac.currentTime + dur + 0.1);
}

function thump(ac: AudioContext, out: AudioNode, f0: number, f1: number, dur: number, peak: number, type: OscillatorType = 'sine'): void {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), ac.currentTime + dur);
  const g = ac.createGain();
  env(ac, g, 0.002, peak, dur);
  osc.connect(g);
  g.connect(out);
  osc.start();
  osc.stop(ac.currentTime + dur + 0.1);
}

function click(ac: AudioContext, out: AudioNode, freq: number, peak: number, dur = 0.03): void {
  burst(ac, out, dur, freq, peak, 'bandpass', 2.5);
}

let sharedNoiseBuf: AudioBuffer | null = null;
function sharedNoise(ac: AudioContext): AudioBuffer {
  if (!sharedNoiseBuf) sharedNoiseBuf = noiseBuffer(ac, 1.2);
  return sharedNoiseBuf;
}

// weapons
patch('fire-pistol', (ac, out) => {
  burst(ac, out, 0.12, 2600, 0.85);
  thump(ac, out, 190, 60, 0.1, 0.5);
  burst(ac, out, 0.32, 900, 0.2);
});
patch('fire-smg', (ac, out) => {
  burst(ac, out, 0.1, 2200, 0.7);
  thump(ac, out, 170, 65, 0.08, 0.45);
  burst(ac, out, 0.26, 800, 0.16);
});
patch('fire-carbine', (ac, out) => {
  burst(ac, out, 0.14, 3000, 0.95);
  thump(ac, out, 150, 50, 0.14, 0.65);
  burst(ac, out, 0.5, 700, 0.22);
});
patch('fire-shotgun', (ac, out) => {
  burst(ac, out, 0.22, 1500, 1.0);
  thump(ac, out, 110, 38, 0.24, 0.9);
  burst(ac, out, 0.6, 500, 0.25);
});
patch('fire-dmr', (ac, out) => {
  burst(ac, out, 0.16, 3400, 1.0);
  thump(ac, out, 140, 42, 0.2, 0.75);
  burst(ac, out, 0.8, 650, 0.24);
});
patch('fire-distant', (ac, out) => {
  thump(ac, out, 120, 45, 0.3, 0.4);
  burst(ac, out, 0.4, 350, 0.25);
});
patch('dryfire', (ac, out) => {
  click(ac, out, 1800, 0.4, 0.025);
  click(ac, out, 900, 0.25, 0.04);
});
patch('knife-swing', (ac, out) => burst(ac, out, 0.12, 900, 0.25, 'highpass'));
patch('knife-hit', (ac, out) => {
  click(ac, out, 700, 0.5, 0.05);
  thump(ac, out, 220, 90, 0.08, 0.3);
});
// reload set
patch('reload-magout', (ac, out) => {
  click(ac, out, 1200, 0.4, 0.04);
  click(ac, out, 500, 0.2, 0.06);
});
patch('reload-magin', (ac, out) => {
  click(ac, out, 800, 0.5, 0.05);
  thump(ac, out, 300, 140, 0.05, 0.2);
});
patch('reload-chamber', (ac, out) => {
  click(ac, out, 1600, 0.5, 0.03);
  click(ac, out, 1000, 0.4, 0.05);
  thump(ac, out, 400, 200, 0.04, 0.15);
});
patch('shell-load', (ac, out) => click(ac, out, 1100, 0.35, 0.05));
// footsteps
patch('step-carpet', (ac, out, rate) => burst(ac, out, 0.07 / rate, 300 * rate, 0.16));
patch('step-tile', (ac, out, rate) => {
  burst(ac, out, 0.05, 900 * rate, 0.2);
  click(ac, out, 1600, 0.06, 0.02);
});
patch('step-concrete', (ac, out, rate) => burst(ac, out, 0.06, 500 * rate, 0.22));
patch('step-vinyl', (ac, out, rate) => burst(ac, out, 0.055, 640 * rate, 0.17));
patch('step-metal', (ac, out) => {
  burst(ac, out, 0.07, 800, 0.2);
  click(ac, out, 2400, 0.1, 0.05);
});
patch('step-wood', (ac, out) => thump(ac, out, 240, 110, 0.07, 0.22, 'triangle'));
patch('step-snow', (ac, out) => {
  burst(ac, out, 0.09, 1800, 0.18, 'highpass');
  burst(ac, out, 0.05, 400, 0.12);
});
patch('step-glass', (ac, out) => {
  burst(ac, out, 0.05, 3000, 0.12, 'highpass');
  click(ac, out, 3400, 0.08, 0.03);
});
// doors
patch('door-open', (ac, out) => {
  click(ac, out, 900, 0.3, 0.04);
  burst(ac, out, 0.3, 300, 0.1);
});
patch('door-close', (ac, out) => {
  thump(ac, out, 180, 70, 0.1, 0.4);
  click(ac, out, 700, 0.25, 0.04);
});
patch('door-locked', (ac, out) => {
  click(ac, out, 500, 0.35, 0.05);
  click(ac, out, 500, 0.25, 0.05);
});
patch('door-metal', (ac, out) => {
  thump(ac, out, 140, 60, 0.16, 0.4);
  burst(ac, out, 0.2, 600, 0.15);
});
// glass
patch('glass-crack', (ac, out) => {
  click(ac, out, 3200, 0.5, 0.04);
  burst(ac, out, 0.14, 2600, 0.3, 'highpass');
});
patch('glass-break', (ac, out) => {
  burst(ac, out, 0.4, 2400, 0.7, 'highpass');
  for (let i = 0; i < 7; i++) {
    setTimeout(() => click(ac, out, 2400 + Math.random() * 2200, 0.2, 0.03), i * 40 + Math.random() * 60);
  }
  thump(ac, out, 300, 120, 0.1, 0.25);
});
// impacts
patch('impact-concrete', (ac, out) => {
  click(ac, out, 900, 0.3, 0.04);
  burst(ac, out, 0.08, 700, 0.2);
});
patch('impact-drywall', (ac, out) => burst(ac, out, 0.09, 500, 0.28));
patch('impact-wood', (ac, out) => thump(ac, out, 300, 130, 0.06, 0.3, 'triangle'));
patch('impact-metal', (ac, out) => {
  click(ac, out, 2000, 0.35, 0.05);
  thump(ac, out, 800, 300, 0.12, 0.15, 'square');
});
patch('impact-soft', (ac, out) => burst(ac, out, 0.07, 350, 0.2));
patch('impact-flesh', (ac, out) => {
  burst(ac, out, 0.08, 300, 0.3);
  thump(ac, out, 150, 70, 0.07, 0.25);
});
patch('ricochet', (ac, out) => {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2800, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.18);
  const g = ac.createGain();
  env(ac, g, 0.004, 0.14, 0.18);
  osc.connect(g);
  g.connect(out);
  osc.start();
  osc.stop(ac.currentTime + 0.3);
});
patch('casing', (ac, out) => click(ac, out, 3200 + Math.random() * 1600, 0.1, 0.025));
// player/enemy feedback
patch('hurt', (ac, out) => {
  thump(ac, out, 220, 90, 0.12, 0.4);
  burst(ac, out, 0.1, 300, 0.25);
});
patch('hitmarker', (ac, out) => click(ac, out, 2600, 0.22, 0.03));
patch('killmarker', (ac, out) => {
  click(ac, out, 2200, 0.25, 0.03);
  click(ac, out, 1400, 0.2, 0.05);
});
patch('radio', (ac, out) => {
  burst(ac, out, 0.1, 1800, 0.12, 'bandpass', 4);
  setTimeout(() => burst(ac, out, 0.08, 2200, 0.1, 'bandpass', 4), 120);
});
patch('voice-relief', (ac, out) => {
  thump(ac, out, 300, 220, 0.2, 0.1, 'triangle');
  setTimeout(() => thump(ac, out, 260, 200, 0.25, 0.08, 'triangle'), 200);
});
// devices
patch('flash-bang', (ac, out) => {
  burst(ac, out, 0.3, 4000, 1.0, 'highpass');
  thump(ac, out, 400, 100, 0.3, 0.7);
  const osc = ac.createOscillator();
  osc.frequency.value = 3400;
  const g = ac.createGain();
  env(ac, g, 0.01, 0.12, 2.2);
  osc.connect(g);
  g.connect(out);
  osc.start();
  osc.stop(ac.currentTime + 2.4);
});
patch('smoke-pop', (ac, out) => {
  thump(ac, out, 200, 80, 0.15, 0.4);
  burst(ac, out, 1.6, 900, 0.12);
});
patch('grenade-bounce', (ac, out) => click(ac, out, 700, 0.25, 0.04));
// UI
patch('ui-move', (ac, out) => click(ac, out, 1400, 0.12, 0.02));
patch('ui-click', (ac, out) => {
  click(ac, out, 1800, 0.2, 0.03);
  click(ac, out, 900, 0.12, 0.04);
});
patch('ui-confirm', (ac, out) => {
  thump(ac, out, 600, 900, 0.08, 0.12, 'triangle');
  click(ac, out, 2000, 0.15, 0.04);
});
patch('objective', (ac, out) => {
  thump(ac, out, 520, 780, 0.12, 0.14, 'sine');
  setTimeout(() => thump(ac, out, 660, 880, 0.14, 0.12, 'sine'), 140);
});
patch('shutter-motor', (ac, out) => {
  burst(ac, out, 3.0, 120, 0.25);
  thump(ac, out, 60, 55, 3.0, 0.2, 'sawtooth');
});
patch('interact', (ac, out) => click(ac, out, 1200, 0.2, 0.04));
patch('zip-cut', (ac, out) => burst(ac, out, 0.14, 2200, 0.25, 'highpass'));

export const audio = new AudioEngine();
