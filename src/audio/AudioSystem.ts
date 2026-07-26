import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import { WEAPONS } from '../weapons/WeaponDefs';

/**
 * Procedural audio.
 *
 * There are no sound files, so every effect is synthesised with the Web Audio
 * graph. This is not a compromise for gunfire: a real gunshot *is* a noise
 * impulse shaped by a resonant body and a reverberant environment, which maps
 * almost directly onto a filtered noise burst through a convolver.
 *
 * The mix follows the same priorities a shipped shooter uses:
 *  - the player's own weapon is loud, dry, and front-and-centre;
 *  - enemy fire is spatialised and reverberant so its direction is legible;
 *  - a fast-attack compressor ducks everything under explosions;
 *  - a brief low-pass "ear ring" after a nearby detonation.
 */
export class AudioSystem implements System {
  readonly name = 'audio';
  readonly order = 90;

  private ctx!: EngineContext;
  private audio: AudioContext | null = null;

  private master!: GainNode;
  private compressor!: DynamicsCompressorNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private reverbSend!: GainNode;
  private convolver!: ConvolverNode;
  private duckFilter!: BiquadFilterNode;
  private listener!: AudioListener;

  private noiseBuffer: AudioBuffer | null = null;
  private started = false;
  private muted = false;

  masterVolume = 0.75;
  private tinnitus = 0;

  private musicCue: 'calm' | 'combat' | 'danger' | 'victory' | 'defeat' = 'calm';
  private musicNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private musicTimer = 0;

  private readonly _v = new THREE.Vector3();

  init(ctx: EngineContext): void {
    this.ctx = ctx;

    // Browsers require a gesture before audio can start.
    const resume = () => {
      this.ensureContext();
      if (this.audio?.state === 'suspended') void this.audio.resume();
    };
    window.addEventListener('pointerdown', resume, { once: false });
    window.addEventListener('keydown', resume, { once: false });

    Signals.on('weapon:fire', ({ weaponId, muzzleWorld, silenced }) =>
      this.playGunshot(weaponId, muzzleWorld, silenced));
    Signals.on('audio:oneshot', ({ id, position, volume, pitch }) =>
      this.playOneshot(id, position, volume ?? 1, pitch ?? 1));
    Signals.on('player:footstep', ({ surface, sprinting }) =>
      this.playFootstep(surface, sprinting));
    Signals.on('explosion:spawn', ({ position, scale }) => this.playExplosion(position, scale));
    Signals.on('audio:music', ({ cue }) => this.setMusic(cue));
    Signals.on('bullet:whizby', ({ position }) => this.playWhizby(position));
  }

  private ensureContext(): void {
    if (this.audio) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.audio = new Ctor({ latencyHint: 'interactive' });

    const a = this.audio;
    this.listener = a.listener;

    this.master = a.createGain();
    this.master.gain.value = this.masterVolume;

    this.compressor = a.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.22;

    // Temporary hearing loss after a nearby explosion.
    this.duckFilter = a.createBiquadFilter();
    this.duckFilter.type = 'lowpass';
    this.duckFilter.frequency.value = 20000;
    this.duckFilter.Q.value = 0.7;

    this.sfxBus = a.createGain();
    this.musicBus = a.createGain();
    this.musicBus.gain.value = 0.32;

    this.convolver = a.createConvolver();
    this.convolver.buffer = this.buildImpulseResponse(a, 1.9, 2.6);
    this.reverbSend = a.createGain();
    this.reverbSend.gain.value = 0.3;

    this.sfxBus.connect(this.duckFilter);
    this.sfxBus.connect(this.reverbSend);
    this.reverbSend.connect(this.convolver);
    this.convolver.connect(this.duckFilter);
    this.musicBus.connect(this.duckFilter);
    this.duckFilter.connect(this.compressor);
    this.compressor.connect(this.master);
    this.master.connect(a.destination);

    this.noiseBuffer = this.buildNoiseBuffer(a, 2);
    this.started = true;
  }

  /**
   * Synthesises an impulse response for the convolver.
   * Exponentially-decaying noise with a slight early-reflection cluster gives
   * a convincing "narrow street between concrete buildings" character, which
   * is exactly the acoustic the level depicts.
   */
  private buildImpulseResponse(a: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = a.sampleRate;
    const length = Math.floor(rate * seconds);
    const buf = a.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, decay);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      // Early reflections from the facades either side of the street.
      for (const [delayMs, gain] of [[11, 0.6], [19, 0.45], [31, 0.34], [53, 0.24], [79, 0.16]]) {
        const idx = Math.floor((delayMs / 1000) * rate);
        if (idx < length) data[idx] += gain * (ch === 0 ? 1 : -0.85);
      }
    }
    return buf;
  }

  private buildNoiseBuffer(a: AudioContext, seconds: number): AudioBuffer {
    const rate = a.sampleRate;
    const length = Math.floor(rate * seconds);
    const buf = a.createBuffer(1, length, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private now(): number {
    return this.audio?.currentTime ?? 0;
  }

  /** Creates a positioned output node, or a plain gain for 2D sounds. */
  private makeOutput(position?: THREE.Vector3): AudioNode {
    if (!this.audio) throw new Error('no audio context');
    if (!position) {
      const g = this.audio.createGain();
      g.connect(this.sfxBus);
      return g;
    }
    const panner = this.audio.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 6;
    panner.maxDistance = 320;
    panner.rolloffFactor = 1.1;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    panner.connect(this.sfxBus);
    return panner;
  }

  private noiseSource(duration: number, playbackRate = 1): AudioBufferSourceNode | null {
    if (!this.audio || !this.noiseBuffer) return null;
    const src = this.audio.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.playbackRate.value = playbackRate;
    src.start(this.now(), Math.random() * 1.5, duration + 0.05);
    src.stop(this.now() + duration + 0.05);
    return src;
  }

  // ------------------------------------------------------------ gunshots ---

  private playGunshot(weaponId: string, position: THREE.Vector3, silenced: boolean): void {
    this.ensureContext();
    if (!this.audio) return;
    const a = this.audio;
    const t = this.now();

    const isPlayer = weaponId !== 'ai_rifle';
    const def = WEAPONS[weaponId] ?? WEAPONS.m4a1;
    const profile = def.soundProfile;

    const out = isPlayer ? this.makeOutput() : this.makeOutput(position);
    const gain = a.createGain();
    gain.connect(out);
    const level = (isPlayer ? 0.62 : 0.5) * (silenced ? 0.3 : 1);

    // ---- crack: a very short, very bright noise transient ----
    const crackDur = silenced ? 0.05 : 0.11;
    const crack = this.noiseSource(crackDur, 1.6);
    if (crack) {
      const hp = a.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = silenced ? 900 : 1800;
      const bp = a.createBiquadFilter();
      bp.type = 'peaking';
      bp.frequency.value = 3200;
      bp.Q.value = 1.2;
      bp.gain.value = profile.crack * 9;
      const g = a.createGain();
      g.gain.setValueAtTime(level * 1.1, t);
      // Near-instant decay; a longer one immediately reads as a toy gun.
      g.gain.exponentialRampToValueAtTime(0.0008, t + crackDur);
      crack.connect(hp).connect(bp).connect(g).connect(gain);
    }

    // ---- body: the low-frequency thump of the muzzle blast ----
    const bodyOsc = a.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(profile.body * 2.4, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(profile.body * 0.55, t + 0.09);
    const bodyGain = a.createGain();
    bodyGain.gain.setValueAtTime(level * (silenced ? 0.25 : 0.95), t);
    bodyGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
    bodyOsc.connect(bodyGain).connect(gain);
    bodyOsc.start(t);
    bodyOsc.stop(t + 0.16);

    // ---- tail: reverberant decay through the street ----
    if (!silenced) {
      const tailDur = profile.tail;
      const tail = this.noiseSource(tailDur, 0.42);
      if (tail) {
        const lp = a.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2600, t);
        lp.frequency.exponentialRampToValueAtTime(320, t + tailDur);
        const g = a.createGain();
        g.gain.setValueAtTime(level * 0.34, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0006, t + tailDur);
        tail.connect(lp).connect(g).connect(gain);
      }
    }

    // ---- mechanical action ----
    const mech = this.noiseSource(0.05, 2.4);
    if (mech) {
      const bp = a.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 4200;
      bp.Q.value = 2.4;
      const g = a.createGain();
      g.gain.setValueAtTime(level * profile.mech * (silenced ? 1.6 : 0.5), t + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0006, t + 0.07);
      mech.connect(bp).connect(g).connect(gain);
    }
  }

  private playWhizby(position: THREE.Vector3): void {
    this.ensureContext();
    if (!this.audio) return;
    const a = this.audio;
    const t = this.now();
    const out = this.makeOutput(position);

    // A supersonic crack heard from the side: a very short broadband snap
    // with a rapid downward Doppler sweep.
    const src = this.noiseSource(0.09, 2.2);
    if (!src) return;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(4200, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.09);
    bp.Q.value = 1.1;
    const g = a.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.09);
    src.connect(bp).connect(g).connect(out);
  }

  private playExplosion(position: THREE.Vector3, scale: number): void {
    this.ensureContext();
    if (!this.audio) return;
    const a = this.audio;
    const t = this.now();
    const out = this.makeOutput(position);
    const level = Math.min(1.4, 0.7 * scale);

    // Sub-bass thump.
    const sub = a.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(84 * (1 / Math.max(scale, 0.4)), t);
    sub.frequency.exponentialRampToValueAtTime(22, t + 0.7 * scale);
    const subGain = a.createGain();
    subGain.gain.setValueAtTime(level, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1 * scale);
    sub.connect(subGain).connect(out);
    sub.start(t);
    sub.stop(t + 1.2 * scale);

    // Broadband blast.
    const blast = this.noiseSource(1.6 * scale, 0.7);
    if (blast) {
      const lp = a.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(5200, t);
      lp.frequency.exponentialRampToValueAtTime(180, t + 1.4 * scale);
      const g = a.createGain();
      g.gain.setValueAtTime(level * 0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0006, t + 1.5 * scale);
      blast.connect(lp).connect(g).connect(out);
    }

    // Debris rain.
    const debris = this.noiseSource(2.2 * scale, 1.3);
    if (debris) {
      const hp = a.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level * 0.16, t + 0.32);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 2.2 * scale);
      debris.connect(hp).connect(g).connect(out);
    }

    // Ear ringing if close.
    const dist = position.distanceTo(this.ctx.camera.position);
    if (dist < 40) {
      this.tinnitus = Math.max(this.tinnitus, (1 - dist / 40) * scale * 0.9);
    }
  }

  private playFootstep(surface: string, sprinting: boolean): void {
    this.ensureContext();
    if (!this.audio) return;
    const a = this.audio;
    const t = this.now();
    const out = this.makeOutput();

    const soft = surface === 'sand' || surface === 'dirt' || surface === 'fabric';
    const dur = soft ? 0.14 : 0.09;
    const src = this.noiseSource(dur, soft ? 0.7 : 1.5);
    if (!src) return;

    const filter = a.createBiquadFilter();
    filter.type = soft ? 'lowpass' : 'bandpass';
    filter.frequency.value = soft ? 1100 : 2400;
    filter.Q.value = soft ? 0.7 : 1.4;

    const g = a.createGain();
    const level = (sprinting ? 0.13 : 0.075) * (0.85 + Math.random() * 0.3);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(filter).connect(g).connect(out);

    // Gear rattle on the same step.
    const rattle = this.noiseSource(0.06, 3.2);
    if (rattle) {
      const bp = a.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 5200 + Math.random() * 1400;
      bp.Q.value = 3;
      const rg = a.createGain();
      rg.gain.setValueAtTime(level * 0.4, t + 0.01);
      rg.gain.exponentialRampToValueAtTime(0.0004, t + 0.07);
      rattle.connect(bp).connect(rg).connect(out);
    }
  }

  private playOneshot(id: string, position: THREE.Vector3 | undefined, volume: number, pitch: number): void {
    this.ensureContext();
    if (!this.audio) return;
    const a = this.audio;
    const t = this.now();
    const out = this.makeOutput(position);
    const g = a.createGain();
    g.connect(out);

    const tone = (freq: number, dur: number, type: OscillatorType, vol: number, sweep = 1): void => {
      const o = a.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq * pitch, t);
      if (sweep !== 1) o.frequency.exponentialRampToValueAtTime(freq * pitch * sweep, t + dur);
      const og = a.createGain();
      og.gain.setValueAtTime(vol * volume, t);
      og.gain.exponentialRampToValueAtTime(0.0006, t + dur);
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 0.02);
    };

    const burst = (dur: number, freq: number, q: number, vol: number, rate = 1): void => {
      const src = this.noiseSource(dur, rate);
      if (!src) return;
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const bg = a.createGain();
      bg.gain.setValueAtTime(vol * volume, t);
      bg.gain.exponentialRampToValueAtTime(0.0005, t + dur);
      src.connect(f).connect(bg).connect(g);
    };

    switch (id) {
      case 'impact_concrete': burst(0.1, 2200, 1.4, 0.3, 1.5); burst(0.22, 500, 0.8, 0.14, 0.6); break;
      case 'impact_metal': burst(0.06, 5200, 6, 0.34, 2.2); tone(2400, 0.22, 'triangle', 0.1, 0.4); break;
      case 'impact_sand': burst(0.16, 700, 0.6, 0.24, 0.7); break;
      case 'impact_dirt': burst(0.14, 900, 0.7, 0.24, 0.8); break;
      case 'impact_wood': burst(0.1, 1500, 1.8, 0.28, 1.1); tone(320, 0.16, 'triangle', 0.1, 0.6); break;
      case 'impact_glass': burst(0.24, 7000, 4, 0.3, 2.6); break;
      case 'impact_flesh': burst(0.11, 420, 0.9, 0.3, 0.6); break;
      case 'impact_fabric': burst(0.1, 800, 0.7, 0.2, 0.8); break;
      case 'impact_foliage': burst(0.14, 3200, 1.2, 0.18, 1.6); break;
      case 'impact_rubber': burst(0.09, 600, 1.4, 0.22, 0.8); break;
      case 'impact_water': burst(0.3, 1200, 0.8, 0.24, 0.9); break;
      case 'ricochet': {
        const o = a.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(2600 * pitch, t);
        o.frequency.exponentialRampToValueAtTime(420 * pitch, t + 0.4);
        const og = a.createGain();
        og.gain.setValueAtTime(0.16 * volume, t);
        og.gain.exponentialRampToValueAtTime(0.0005, t + 0.45);
        const bp = a.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1800;
        bp.Q.value = 8;
        o.connect(bp).connect(og).connect(g);
        o.start(t);
        o.stop(t + 0.46);
        break;
      }
      case 'casing_hard': burst(0.07, 6400, 8, 0.1, 2.6); tone(3200, 0.1, 'triangle', 0.05, 0.7); break;
      case 'casing_soft': burst(0.05, 2400, 3, 0.05, 1.2); break;
      case 'dryfire': burst(0.035, 4200, 6, 0.22, 2.4); break;
      case 'reload_tac':
      case 'reload_empty': {
        // A short sequence of mechanical clicks rather than one sound.
        const steps = id === 'reload_empty' ? [0, 0.22, 0.9, 1.35, 1.75] : [0, 0.2, 0.85, 1.25];
        for (const s of steps) {
          const src = this.noiseSource(0.05, 2.6);
          if (!src) continue;
          const f = a.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = 3000 + Math.random() * 2600;
          f.Q.value = 5;
          const cg = a.createGain();
          cg.gain.setValueAtTime(0.0001, t);
          cg.gain.setValueAtTime(0.22 * volume, t + s * 0.55);
          cg.gain.exponentialRampToValueAtTime(0.0004, t + s * 0.55 + 0.07);
          src.connect(f).connect(cg).connect(g);
        }
        break;
      }
      case 'weapon_draw': burst(0.12, 2600, 3, 0.16, 1.6); break;
      case 'weapon_holster': burst(0.1, 1800, 2.4, 0.13, 1.2); break;
      case 'firemode': burst(0.03, 5200, 9, 0.18, 3); break;
      case 'ui_confirm': tone(880, 0.09, 'square', 0.08); tone(1320, 0.11, 'square', 0.06); break;
      case 'ui_error': tone(180, 0.16, 'square', 0.1, 0.6); break;
      case 'ks_earned': tone(523, 0.13, 'triangle', 0.1); tone(784, 0.16, 'triangle', 0.09); tone(1046, 0.3, 'triangle', 0.08); break;
      case 'ks_arm': tone(440, 0.1, 'square', 0.07); tone(660, 0.14, 'square', 0.06); break;
      case 'ks_resupply': tone(392, 0.14, 'triangle', 0.09); tone(587, 0.2, 'triangle', 0.08); break;
      case 'kill_headshot': tone(1400, 0.08, 'square', 0.1, 1.4); tone(2100, 0.1, 'square', 0.07); break;
      case 'kill_body': tone(900, 0.06, 'square', 0.07, 1.3); break;
      case 'hitmarker': tone(1800, 0.045, 'square', 0.075, 1.1); break;
      case 'enemy_spot': burst(0.4, 900, 1.1, 0.14, 0.8); tone(220, 0.3, 'sawtooth', 0.04, 1.6); break;
      case 'radio_airstrike':
      case 'radio_uav': {
        // Radio squelch + filtered speech-like formants.
        burst(0.07, 3200, 4, 0.1, 2.2);
        for (let i = 0; i < 7; i++) {
          const o = a.createOscillator();
          o.type = 'sawtooth';
          const base = 120 + Math.random() * 80;
          o.frequency.setValueAtTime(base, t + 0.1 + i * 0.11);
          const f = a.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = 700 + Math.random() * 1400;
          f.Q.value = 4;
          const og = a.createGain();
          og.gain.setValueAtTime(0.0001, t);
          og.gain.setValueAtTime(0.06 * volume, t + 0.1 + i * 0.11);
          og.gain.exponentialRampToValueAtTime(0.0004, t + 0.1 + i * 0.11 + 0.09);
          o.connect(f).connect(og).connect(g);
          o.start(t + 0.1 + i * 0.11);
          o.stop(t + 0.1 + i * 0.11 + 0.11);
        }
        burst(0.06, 3200, 4, 0.08, 2.2);
        break;
      }
      case 'jet_flyby': {
        // A long, Doppler-swept roar.
        const src = this.noiseSource(3.2, 0.5);
        if (src) {
          const lp = a.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(600, t);
          lp.frequency.linearRampToValueAtTime(3600, t + 1.1);
          lp.frequency.exponentialRampToValueAtTime(400, t + 3.0);
          const fg = a.createGain();
          fg.gain.setValueAtTime(0.0001, t);
          fg.gain.linearRampToValueAtTime(0.55 * volume, t + 1.0);
          fg.gain.exponentialRampToValueAtTime(0.0005, t + 3.1);
          src.connect(lp).connect(fg).connect(g);
        }
        const rumble = a.createOscillator();
        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(58, t);
        rumble.frequency.linearRampToValueAtTime(96, t + 1.0);
        rumble.frequency.exponentialRampToValueAtTime(38, t + 3.0);
        const rg = a.createGain();
        rg.gain.setValueAtTime(0.0001, t);
        rg.gain.linearRampToValueAtTime(0.3 * volume, t + 1.0);
        rg.gain.exponentialRampToValueAtTime(0.0005, t + 3.1);
        rumble.connect(rg).connect(g);
        rumble.start(t);
        rumble.stop(t + 3.2);
        break;
      }
      case 'bomb_release': burst(0.18, 1200, 1.2, 0.1, 1.0); break;
      case 'explosion_large': this.playExplosion(position ?? this.ctx.camera.position, 2.4); break;
      default: break;
    }
  }

  // -------------------------------------------------------------- music ----

  private setMusic(cue: 'calm' | 'combat' | 'danger' | 'victory' | 'defeat'): void {
    if (this.musicCue === cue) return;
    this.musicCue = cue;
    this.musicTimer = 0;
  }

  private updateMusic(dt: number): void {
    if (!this.audio) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;

    const a = this.audio;
    const t = this.now();

    // A sparse, tense drone rather than a melody: it supports the action
    // without competing with gunfire for the same frequency band.
    const roots: Record<string, number[]> = {
      calm: [55, 82.4],
      combat: [55, 65.4, 98],
      danger: [49, 58.3, 87.3, 116.5],
      victory: [65.4, 98, 130.8],
      defeat: [49, 58.3],
    };
    const notes = roots[this.musicCue] ?? roots.calm;
    const dur = this.musicCue === 'danger' ? 2.2 : 4.2;
    this.musicTimer = dur * 0.85;

    for (const f of notes) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f * (0.998 + Math.random() * 0.004);
      const lp = a.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(220, t);
      lp.frequency.linearRampToValueAtTime(this.musicCue === 'danger' ? 900 : 460, t + dur * 0.4);
      lp.frequency.linearRampToValueAtTime(200, t + dur);
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.055, t + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
      o.connect(lp).connect(g).connect(this.musicBus);
      o.start(t);
      o.stop(t + dur + 0.1);
      this.musicNodes.push({ osc: o, gain: g });
    }
    if (this.musicNodes.length > 24) this.musicNodes.splice(0, 12);
  }

  // -------------------------------------------------------------- update ---

  update(dt: number, ctx: EngineContext): void {
    if (!this.audio || !this.started) return;

    // Keep the listener glued to the camera so spatialisation is correct.
    const cam = ctx.camera;
    const pos = cam.position;
    const fwd = this._v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);

    const l = this.listener;
    if (l.positionX) {
      l.positionX.value = pos.x;
      l.positionY.value = pos.y;
      l.positionZ.value = pos.z;
      l.forwardX.value = fwd.x;
      l.forwardY.value = fwd.y;
      l.forwardZ.value = fwd.z;
      l.upX.value = up.x;
      l.upY.value = up.y;
      l.upZ.value = up.z;
    } else {
      (l as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(pos.x, pos.y, pos.z);
      (l as unknown as { setOrientation(...a: number[]): void }).setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }

    // Tinnitus: muffle the mix and fade a sine tone back out.
    if (this.tinnitus > 0.001) {
      this.tinnitus = Math.max(0, this.tinnitus - dt * 0.24);
      const cutoff = THREE.MathUtils.lerp(20000, 620, this.tinnitus);
      this.duckFilter.frequency.setTargetAtTime(cutoff, this.now(), 0.05);
    } else {
      this.duckFilter.frequency.setTargetAtTime(20000, this.now(), 0.3);
    }

    this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, this.now(), 0.08);
    this.updateMusic(dt);
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }

  dispose(): void {
    void this.audio?.close();
  }
}
