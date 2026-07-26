import { bus, EV } from '../core/events.js';
import { settings } from '../core/settings.js';
import { reg, OWNERS } from '../core/assets.js';
import {
  audioContextClass,
  impulseResponse,
  makeKit,
  noiseBuffer,
  REVERBS,
  SOUNDS,
  LOOPS,
  MUSIC,
  SOUND_IDS,
  LOOP_IDS,
  MUSIC_TRACKS,
  VOICE_SUBTITLES,
} from './synth.js';

export { VOICE_SUBTITLES };

/**
 * AudioSystem — fully procedural WebAudio mixer.
 * Owner: Fable 4 (synthesis) with Opus 1 (integration points).
 *
 * - No AudioContext is created at import time or in the constructor; call
 *   `await audio.unlock()` from a user gesture. Every public method is safe
 *   to call before that (play() returns null, or a subtitle-only handle for
 *   voice lines so captions still work with audio disabled).
 * - Mixer: master <- sfx <- { dry, reverb return }, master <- music.
 *   Reverb is a pair of convolvers (A/B) with procedurally generated
 *   impulses, crossfaded over ~0.4 s on setRoom().
 * - Positional voices use a PannerNode each; at most MAX_VOICES one-shot
 *   voices play simultaneously and the quietest is stolen.
 * - masterVolume / sfxVolume / musicVolume are re-read live every frame.
 */

const MAX_VOICES = 32;
const LOOKAHEAD = 0.35;

/** Every room id in src/map/layout.js -> reverb impulse kind. */
export const ROOM_REVERB = {
  mechanical: 'garage',
  lobby: 'hall',
  vestibule: 'small_hard',
  waiting: 'office',
  northcorr: 'corridor',
  westcorr: 'corridor',
  eastcorr: 'corridor',
  southcorr: 'corridor',
  spine: 'corridor',
  midcorr: 'corridor',
  archive: 'office',
  it: 'office',
  firestair: 'small_hard',
  openplanA: 'office',
  openplanB: 'office',
  conference: 'office',
  breakroom: 'office',
  copy: 'office',
  restroom: 'small_hard',
  janitor: 'small_hard',
  stairwell: 'small_hard',
  server: 'office',
  loading: 'garage',
  garage: 'garage',
  mezz: 'hall',
  execcorr: 'corridor',
  firestairU: 'small_hard',
  boardroom: 'office',
  boardroomW: 'office',
  records2: 'office',
  execspine: 'corridor',
  execante: 'office',
  exec: 'office',
  execgal: 'corridor',
  landing: 'small_hard',
  execlounge: 'office',
  court: 'outdoor',
  westyard: 'outdoor',
  eastyard: 'outdoor',
};

function reverbKindFor(roomId) {
  if (!roomId) return 'office';
  if (ROOM_REVERB[roomId]) return ROOM_REVERB[roomId];
  if (REVERBS[roomId]) return roomId; // callers may pass a kind directly
  return 'office';
}

/** Rotate vector v by quaternion q — avoids importing three here. */
function rotate(q, vx, vy, vz) {
  const { x, y, z, w } = q;
  const ix = w * vx + y * vz - z * vy;
  const iy = w * vy + z * vx - x * vz;
  const iz = w * vz + x * vy - y * vx;
  const iw = -x * vx - y * vy - z * vz;
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
}

const NULL_LOOP = { stop() {}, setVolume() {}, setRate() {} };

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this._voices = [];
    this._loops = new Set();
    this._music = null; // { track, step, next, gain }
    this._pendingMusic = null;
    this._roomId = null;
    this._reverbKind = null;
    this._active = 0; // which convolver slot (0/1) is live
    this._warned = new Set();
    bus.on(EV.UI_SOUND, (p) => {
      const id = typeof p === 'string' ? p : p?.id;
      if (id) this.play(id, typeof p === 'object' ? p : undefined);
    });
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Resume/create the AudioContext after a user gesture. Safe to call twice. */
  async unlock() {
    const AC = audioContextClass();
    if (!AC) return false;
    try {
      if (!this.ctx) {
        this.ctx = new AC();
        this._buildGraph();
      }
      if (this.ctx.state !== 'running') await this.ctx.resume();
      // Prewarm shared buffers so the first shot has no hitch.
      noiseBuffer(this.ctx, 'white');
      noiseBuffer(this.ctx, 'pink');
      impulseResponse(this.ctx, 'office');
      if (!this._reverbKind) this.setRoom(this._roomId ?? 'lobby');
      if (this._pendingMusic !== null) {
        const t = this._pendingMusic;
        this._pendingMusic = null;
        this.setMusic(t);
      }
      return this.ready;
    } catch (err) {
      console.warn('[audio] unlock failed', err);
      return false;
    }
  }

  _buildGraph() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = settings.get('masterVolume') ?? 0.8;
    this.master.connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = settings.get('sfxVolume') ?? 0.9;
    this.sfx.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = settings.get('musicVolume') ?? 0.45;
    this.musicBus.connect(this.master);

    this.sfxDry = ctx.createGain();
    this.sfxDry.connect(this.sfx);

    // A/B convolver pair for crossfaded room switching
    this.reverbIn = ctx.createGain();
    this._conv = [ctx.createConvolver(), ctx.createConvolver()];
    this._convGain = [ctx.createGain(), ctx.createGain()];
    for (let i = 0; i < 2; i++) {
      this.reverbIn.connect(this._conv[i]);
      this._conv[i].connect(this._convGain[i]);
      this._convGain[i].connect(this.sfx);
      this._convGain[i].gain.value = 0;
    }
  }

  /* ------------------------------ voices ------------------------------ */

  _allocVoice(opts, isLoop = false) {
    const ctx = this.ctx;
    const input = ctx.createGain();
    input.gain.value = opts?.volume ?? 1;
    let tail = input;
    let panner = null;
    if (opts?.pos) {
      panner = ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1.2;
      panner.rolloffFactor = 1.1;
      panner.maxDistance = 70;
      const p = opts.pos;
      if (panner.positionX) {
        panner.positionX.value = p.x;
        panner.positionY.value = p.y;
        panner.positionZ.value = p.z;
      } else {
        panner.setPosition(p.x, p.y, p.z);
      }
      input.connect(panner);
      tail = panner;
    }
    const dry = ctx.createGain();
    dry.gain.value = 1;
    tail.connect(dry);
    dry.connect(this.sfxDry);
    const send = ctx.createGain();
    send.gain.value = opts?.reverbSend ?? (opts?.pos ? 0.3 : 0.12);
    tail.connect(send);
    send.connect(this.reverbIn);
    return { input, panner, dry, send, vol: opts?.volume ?? 1, end: Infinity, isLoop };
  }

  _releaseVoice(v) {
    try {
      v.input.disconnect();
      v.panner?.disconnect();
      v.dry.disconnect();
      v.send.disconnect();
    } catch { /* already released */ }
  }

  _stealIfNeeded() {
    const live = this._voices.filter((v) => !v.isLoop);
    if (live.length < MAX_VOICES) return;
    let quietest = live[0];
    for (const v of live) if (v.vol < quietest.vol || (v.vol === quietest.vol && v.end < quietest.end)) quietest = v;
    this._stopVoice(quietest, 0.02);
  }

  _stopVoice(v, fade = 0.03) {
    try {
      const t = this.ctx.currentTime;
      v.input.gain.setTargetAtTime(0.0001, t, fade);
    } catch { /* context closed */ }
    v.end = (this.ctx?.currentTime ?? 0) + fade * 4;
  }

  /**
   * Play a one-shot. opts: { pos, volume, rate, room, delay, variant, surface }.
   * Returns a handle { id, duration, stop(), setVolume(v), subtitle?, speaker? }
   * or null. Voice lines always return a handle carrying subtitle/speaker,
   * even when the context is unavailable, so captions never depend on audio.
   */
  play(id, opts = {}) {
    const def = SOUNDS[id];
    const vs = VOICE_SUBTITLES[id];
    if (!def) {
      if (!this._warned.has(id)) {
        this._warned.add(id);
        console.warn(`[audio] unknown sound id "${id}"`);
      }
      return null;
    }
    if (!this.ready) {
      return vs ? { id, duration: 1, stop() {}, setVolume() {}, ...vs } : null;
    }
    try {
      this._stealIfNeeded();
      const voice = this._allocVoice(opts, false);
      const when = this.ctx.currentTime + Math.max(0, opts.delay ?? 0) + 0.005;
      const kit = makeKit(this.ctx, voice.input, when, opts.rate ?? 1);
      def(kit, opts);
      const duration = Math.max(0.02, kit.end - when);
      voice.end = kit.end + 0.7; // reverb-tail margin before node teardown
      this._voices.push(voice);
      const self = this;
      const handle = {
        id,
        duration,
        stop() { self._stopVoice(voice); },
        setVolume(v) {
          voice.vol = v;
          try { voice.input.gain.setTargetAtTime(v, self.ctx.currentTime, 0.02); } catch { /* closed */ }
        },
      };
      if (vs) {
        handle.subtitle = vs.subtitle;
        handle.speaker = vs.speaker;
      }
      return handle;
    } catch (err) {
      if (!this._warned.has('playfail')) {
        this._warned.add('playfail');
        console.warn('[audio] play failed', err);
      }
      return vs ? { id, duration: 1, stop() {}, setVolume() {}, ...vs } : null;
    }
  }

  /** Start an ambience loop. Returns { stop(), setVolume(v), setRate(r) }. */
  loop(id, opts = {}) {
    const def = LOOPS[id];
    if (!def) {
      if (!this._warned.has(id)) {
        this._warned.add(id);
        console.warn(`[audio] unknown loop id "${id}"`);
      }
      return NULL_LOOP;
    }
    if (!this.ready) return NULL_LOOP;
    try {
      const voice = this._allocVoice({ reverbSend: 0.06, ...opts }, true);
      const inner = def(this.ctx, voice.input);
      this._voices.push(voice);
      const self = this;
      const rec = {
        stop() {
          try { inner.stop(); } catch { /* already stopped */ }
          self._stopVoice(voice, 0.1);
          self._loops.delete(rec);
        },
        setVolume(v) {
          voice.vol = v;
          try { voice.input.gain.setTargetAtTime(v, self.ctx.currentTime, 0.05); } catch { /* closed */ }
        },
        setRate(r) {
          try { inner.setRate(r); } catch { /* no rate control */ }
        },
      };
      this._loops.add(rec);
      return rec;
    } catch (err) {
      console.warn('[audio] loop failed', err);
      return NULL_LOOP;
    }
  }

  stopAll() {
    for (const l of Array.from(this._loops)) l.stop();
    this._loops.clear();
    if (this.ctx) {
      for (const v of this._voices) this._stopVoice(v, 0.02);
    }
    this.setMusic(null);
  }

  /* ------------------------------ reverb ------------------------------ */

  setRoom(roomId) {
    this._roomId = roomId;
    if (!this.ready) return;
    const kind = reverbKindFor(roomId);
    if (kind === this._reverbKind) return;
    this._reverbKind = kind;
    try {
      const next = 1 - this._active;
      this._conv[next].buffer = impulseResponse(this.ctx, kind);
      const t = this.ctx.currentTime;
      const on = this._convGain[next].gain;
      const off = this._convGain[this._active].gain;
      on.cancelScheduledValues(t);
      off.cancelScheduledValues(t);
      on.setValueAtTime(on.value, t);
      off.setValueAtTime(off.value, t);
      on.linearRampToValueAtTime(1, t + 0.4);
      off.linearRampToValueAtTime(0, t + 0.4);
      this._active = next;
    } catch (err) {
      console.warn('[audio] setRoom failed', err);
    }
  }

  /* ------------------------------ music ------------------------------- */

  /** track: 'menu'|'briefing'|'tension'|'combat'|'victory'|'defeat'|null */
  setMusic(track) {
    if (!this.ready) {
      this._pendingMusic = track;
      return;
    }
    if (this._music?.track === track) return;
    const t = this.ctx.currentTime;
    if (this._music) {
      const old = this._music;
      try {
        old.gain.gain.setTargetAtTime(0.0001, t, 0.35);
        setTimeout(() => { try { old.gain.disconnect(); } catch { /* released */ } }, 2000);
      } catch { /* closed */ }
      this._music = null;
    }
    if (!track || !MUSIC[track]) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, t, 0.5);
    gain.connect(this.musicBus);
    this._music = { track, step: 0, next: t + 0.06, gain };
  }

  _scheduleMusic() {
    const m = this._music;
    if (!m) return;
    const def = MUSIC[m.track];
    const stepDur = 60 / (def.bpm * def.div);
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    let guard = 0;
    while (m.next < horizon && guard++ < 64) {
      try {
        def.schedule(makeKit(this.ctx, m.gain, m.next, 1), m.step);
      } catch (err) {
        console.warn('[audio] music step failed', err);
      }
      m.step++;
      m.next += stepDur;
    }
  }

  /* ------------------------------ frame ------------------------------- */

  update(dt, listenerPos, listenerQuat, roomId) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Live volume settings
    this.master.gain.setTargetAtTime(settings.get('masterVolume') ?? 0.8, t, 0.06);
    this.sfx.gain.setTargetAtTime(settings.get('sfxVolume') ?? 0.9, t, 0.06);
    this.musicBus.gain.setTargetAtTime(settings.get('musicVolume') ?? 0.45, t, 0.06);

    // Listener pose
    if (listenerPos) {
      const L = ctx.listener;
      if (L.positionX) {
        L.positionX.setTargetAtTime(listenerPos.x, t, 0.02);
        L.positionY.setTargetAtTime(listenerPos.y, t, 0.02);
        L.positionZ.setTargetAtTime(listenerPos.z, t, 0.02);
      } else if (L.setPosition) {
        L.setPosition(listenerPos.x, listenerPos.y, listenerPos.z);
      }
      if (listenerQuat) {
        const [fx, fy, fz] = rotate(listenerQuat, 0, 0, -1);
        const [ux, uy, uz] = rotate(listenerQuat, 0, 1, 0);
        if (L.forwardX) {
          L.forwardX.setTargetAtTime(fx, t, 0.02);
          L.forwardY.setTargetAtTime(fy, t, 0.02);
          L.forwardZ.setTargetAtTime(fz, t, 0.02);
          L.upX.setTargetAtTime(ux, t, 0.02);
          L.upY.setTargetAtTime(uy, t, 0.02);
          L.upZ.setTargetAtTime(uz, t, 0.02);
        } else if (L.setOrientation) {
          L.setOrientation(fx, fy, fz, ux, uy, uz);
        }
      }
    }

    if (roomId && roomId !== this._roomId) this.setRoom(roomId);

    this._scheduleMusic();

    // Prune finished one-shot voices
    for (let i = this._voices.length - 1; i >= 0; i--) {
      const v = this._voices[i];
      if (!v.isLoop && v.end < t) {
        this._releaseVoice(v);
        this._voices.splice(i, 1);
      }
    }
  }

  get stats() {
    return {
      context: this.ctx?.state ?? 'none',
      voices: this._voices.filter((v) => !v.isLoop).length,
      loops: this._loops.size,
      music: this._music?.track ?? null,
      room: this._roomId,
      reverb: this._reverbKind,
      sounds: SOUND_IDS.length,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Manifest                                                            */
/* ------------------------------------------------------------------ */

export function registerAudioManifest() {
  const base = {
    owner: OWNERS.FABLE4,
    files: ['src/audio/index.js', 'src/audio/synth.js'],
    category: 'audio',
    dimensions: 'n/a (audio)',
    pivot: 'n/a (audio)',
    materials: 'n/a',
    textures: 'n/a',
    collision: 'n/a',
    lod: '32-voice cap, quietest stolen; reverb send per voice',
    status: 'built',
  };
  const pick = (prefix) => SOUND_IDS.filter((i) => i.startsWith(prefix));
  const groups = [
    ['audio.weapons', 'Weapon fire, tails, handling foley', [...pick('wpn.')], 'Five families read distinctly; reloads are timed composites; all synthesised.'],
    ['audio.casings', 'Shell casing drops', [...pick('shell.')], 'Concrete/tile ring, carpet is a dull thud (opts.surface); shotgun hull is plastic.'],
    ['audio.footsteps', 'Footsteps per surface + crouch + land', [...pick('step.')], '8 surfaces, crouch variants quieter/duller, land thump.'],
    ['audio.doors', 'Door and access hardware', [...pick('door.'), 'pushbar', 'shutter.motor', 'shutter.rattle', 'reader.grant', 'reader.deny'], 'Wood/metal/glass open+close distinct; locked rattle; closer hiss; readers beep/buzz.'],
    ['audio.glass', 'Glass tap/crack/shatter/fragments', [...pick('glass.')], 'Shatter layers noise burst + 11 random pings.'],
    ['audio.impacts', 'Bullet impacts per surface + ricochet', [...pick('impact.'), 'ricochet'], '13 surfaces incl. flesh; ricochet whine slide.'],
    ['audio.bodies', 'Body foley', ['cloth.move', 'body.fall', 'hit.flesh', 'hit.armor'], 'Fall is a two-stage thump; armour clanks.'],
    ['audio.voices', 'Synthesised vocalisations + subtitles', [...pick('vo.')], 'Formant-filtered glottal source, per-variant pitch; play() handle carries { subtitle, speaker }; VOICE_SUBTITLES exported.'],
    ['audio.ui', 'Interface sounds', [...pick('ui.')], 'Dry (no reverb send), short, distinct per action.'],
    ['audio.grenades', 'Grenade foley and detonations', [...pick('nade.')], 'Flash is the loudest event in the mix and triggers amb.tinnitus usage by the lead.'],
    ['audio.ambience', 'Ambience loops', [...LOOP_IDS], 'Loop handles expose stop/setVolume/setRate; hvac/fluoro/server/wind/storm/snow/tinnitus.'],
    ['audio.music', 'Generative music', MUSIC_TRACKS.map((tId) => `music.${tId}`), 'Lookahead step scheduler; menu/briefing/tension/combat/victory/defeat.'],
    ['audio.reverb', 'Procedural room reverb', Object.keys(REVERBS).map((r) => `reverb.${r}`), 'A/B convolver crossfade over 0.4 s; every layout room id mapped in ROOM_REVERB.'],
  ];
  for (const [id, name, ids, acceptance] of groups) {
    reg({
      ...base,
      id,
      name,
      usedIn: ['gameplay', 'ui'],
      audio: ids,
      acceptance,
    });
  }
}
