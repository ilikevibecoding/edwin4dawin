/**
 * The measurement bridge.
 *
 * Nobody can listen to CI, so the only way to know whether a gunshot is sharp
 * or a tunnel rings longer than a room is to render the thing and measure it.
 * This module exposes that ability on `window.__AUDIO__` for
 * `tools/audio-test.mjs`: it builds a throwaway `OfflineAudioContext`, mirrors
 * the real signal chain onto it, renders one sound, and returns the figures.
 *
 * The chain really is the same chain — same `Mixer`, same `VoicePool`, same
 * `ShotEngine`, same baked clips — because a test against a simplified copy of
 * the graph would only prove that the copy works. The baked `Clip`s are plain
 * `Float32Array`s and so are shared with the live engine for free.
 *
 * It is loaded by dynamic `import()` so that a production build tree-shakes it
 * out of the initial chunk, and every entry point returns a value rather than
 * throwing, since the harness must not be able to hang the page.
 */

import { AudioCore } from './Core';
import type AudioSystem from './AudioSystem';
import {
  attackTimeHf,
  bandEnergy,
  centroidOf,
  envelopeDb,
  peak,
  rms,
  rt60,
  spectrum,
  statsOf,
} from './dsp/Analysis';
import type { Clip } from './dsp/Kernel';
import { Bakery } from './bake/Bakery';
import { GUNS, GUN_IDS, gunVoice } from './bake/Weapons';
import { ZONES, ZONE_NAMES, type ZoneName, buildZoneIR } from './dsp/Zones';
import { BUS_NAMES, type BusName } from './graph/Mixer';
import { DISTANCE, type DistanceModel } from './graph/Voices';
import { GAIN, ShotEngine, type ShotLayer } from './live/Shot';
import { REGISTRY, type DistanceFamily, knownIds, resolve } from './Registry';

/** Everything the harness asserts on, for one rendered signal. */
export interface Measurement {
  ok: boolean;
  error?: string;
  sampleRate: number;
  duration: number;
  channels: number;
  peak: number;
  rms: number;
  /** Peak / RMS. A transient has a high crest factor; a drone does not. */
  crest: number;
  /** Seconds from audible to peak, on the full signal. */
  attack: number;
  /** Seconds from audible to peak of the transient band; the shock front. */
  attackHf: number;
  /** Seconds from the start of the signal to its loudest sample. */
  peakAt: number;
  centroid: number;
  /** Energy below 700 Hz over energy above it. */
  tilt: number;
  decay: number;
  rt60: number;
  clipped: boolean;
  /** True when any sample exceeds full scale, which must never happen. */
  over: boolean;
  /** 24 log-spaced band magnitudes in dB, for the spectrogram dump. */
  bands: number[];
  /** 64-bucket peak envelope in dBFS, for the waveform dump. */
  envelope: number[];
  /** Set for a shot render: how the layers were actually mixed. */
  layers?: Record<string, number>;
}

/** What to render. Fields are read per `kind`; the rest are ignored. */
export interface RenderSpec {
  kind: 'baked' | 'sound' | 'shot' | 'ir' | 'burst';
  /** Baked clip name, registered sound id, gun id, or zone name. */
  id?: string;
  /** Explicit variant, for a reproducible comparison between variants. */
  index?: number;
  seconds?: number;
  /** Metres from the listener. */
  distance?: number;
  suppressed?: boolean;
  firstPerson?: boolean;
  zone?: ZoneName;
  /** Simultaneous sources, for the limiter test. */
  count?: number;
  /** Measure the direct path only, with the reverb send muted. */
  dry?: boolean;
  /**
   * Source volume. Turning it well down puts the whole master chain in its
   * linear region, which is the only way to compare what two sounds actually
   * leave their graph at rather than what the compressors let through.
   */
  volume?: number;
  /** Render one gunshot layer alone, for calibrating the layer sum. */
  layer?: ShotLayer;
  /**
   * Measures somewhere other than the destination: `'sum'` at the shot graph's
   * summing node, before the saturator, `'out'` after it, and `'bus'` at the
   * weapon bus's input. The only way to read what a layer actually contributes
   * without inverting every nonlinearity downstream of it, and the only way to
   * find out which stage of the mix is responsible when the arithmetic and the
   * measurement disagree.
   */
  tap?: 'sum' | 'out' | 'bus';
  seed?: number;
}

const BANDS = 24;

/**
 * Silence rendered before the sound being measured, and discarded afterwards.
 *
 * Long enough for every `DynamicsCompressorNode` in the mirrored chain to open
 * from its cold state to unity; see `AudioCore.timeOffset` for what happens
 * without it. Measured to be complete by 200 ms, so this is 50 per cent margin,
 * and it costs nothing that matters — a render is a few hundred milliseconds of
 * audio and offline rendering runs far faster than real time.
 */
const LEAD = 0.3;
const FAMILY: Record<DistanceFamily, DistanceModel> = {
  weapon: DISTANCE.weapon,
  world: DISTANCE.world,
  footstep: DISTANCE.footstep,
  explosion: DISTANCE.explosion,
  aircraft: DISTANCE.aircraft,
  flat: DISTANCE.world,
};

/* ----------------------------- measurement ------------------------------ */

function fail(error: string): Measurement {
  return {
    ok: false,
    error,
    sampleRate: 0,
    duration: 0,
    channels: 0,
    peak: 0,
    rms: 0,
    crest: 0,
    attack: 0,
    attackHf: 0,
    peakAt: 0,
    centroid: 0,
    tilt: 0,
    decay: 0,
    rt60: 0,
    clipped: false,
    over: false,
    bands: [],
    envelope: [],
  };
}

/**
 * Reduces one or two channels of samples to the report. Stereo is measured on
 * the mid signal, since that is what the spectral assertions are about, but the
 * peak is taken across both channels because a limiter has to hold every
 * channel down, not their average.
 */
function measure(channels: Float32Array[], sampleRate: number): Measurement {
  const n = channels[0]?.length ?? 0;
  if (n === 0) return fail('empty render');

  let mono: Float32Array;
  if (channels.length === 1) {
    mono = channels[0];
  } else {
    mono = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (const ch of channels) s += ch[i];
      mono[i] = s / channels.length;
    }
  }

  let hardPeak = 0;
  for (const ch of channels) {
    const p = peak(ch);
    if (p > hardPeak) hardPeak = p;
  }

  const s = statsOf(mono, sampleRate);
  const spec = spectrum(mono, sampleRate, 96);
  const lo = bandEnergy(spec.freqs, spec.mags, 40, 700);
  const hi = bandEnergy(spec.freqs, spec.mags, 700, sampleRate * 0.47);
  const r = rms(mono);

  /* Coarse log-spaced bands for the text spectrogram. */
  const bands: number[] = [];
  const edges = BANDS;
  const lowHz = 40;
  const highHz = Math.min(16000, sampleRate * 0.45);
  const step = Math.pow(highHz / lowHz, 1 / edges);
  let ref = 0;
  const raw: number[] = [];
  for (let b = 0; b < edges; b++) {
    const f0 = lowHz * Math.pow(step, b);
    const f1 = f0 * step;
    const e = bandEnergy(spec.freqs, spec.mags, f0, f1);
    raw.push(e);
    if (e > ref) ref = e;
  }
  for (const e of raw) bands.push(round(20 * Math.log10(Math.max(1e-7, e / Math.max(1e-20, ref))), 1));

  return {
    ok: true,
    sampleRate,
    duration: round(s.duration, 4),
    channels: channels.length,
    peak: round(hardPeak, 5),
    rms: round(r, 6),
    crest: round(r > 1e-9 ? hardPeak / r : 0, 2),
    attack: round(s.attack, 6),
    attackHf: round(attackTimeHf(mono, sampleRate), 6),
    peakAt: round(s.peakAt, 6),
    centroid: round(centroidOf(spec.freqs, spec.mags), 1),
    tilt: round(hi > 1e-20 ? lo / hi : 999, 3),
    decay: round(s.decay, 4),
    rt60: round(rt60(mono, sampleRate), 4),
    clipped: hardPeak >= 0.9999,
    over: hardPeak > 1.0001,
    bands,
    envelope: Array.from(envelopeDb(mono, 64), (v) => round(v, 1)),
  };
}

function round(v: number, places: number): number {
  if (!Number.isFinite(v)) return 0;
  const m = Math.pow(10, places);
  return Math.round(v * m) / m;
}

function measureClip(c: Clip): Measurement {
  return measure(c.channels, c.sampleRate);
}

/* ------------------------------ the bridge ------------------------------ */

export interface AudioBridge {
  /** Live engine state; see `AudioSystem.stats`. */
  stats(): Record<string, unknown>;
  /** Forces every deferred bake so a render is not racing the trickle. */
  bakeAll(): { clips: number; bytes: number; failures: string[] };
  /** Registered sound ids, baked clip names, guns, zones and buses. */
  info(): {
    sampleRate: number;
    ids: string[];
    clips: string[];
    guns: string[];
    zones: string[];
    buses: string[];
    variants: Record<string, number>;
    /** Sample memory per name, so the harness can rank what costs the most. */
    bytes: Record<string, number>;
  };
  /** Renders one spec offline and measures it. */
  render(spec: RenderSpec): Promise<Measurement>;
  /** Measures a baked clip directly, with no graph in the way. */
  measureBaked(name: string, index?: number): Measurement;
}

/**
 * The store the measurements come from: the live one when the engine got a
 * context, otherwise a standalone bake at a rate an `OfflineAudioContext` will
 * accept. Cached, because baking the whole design takes a moment.
 */
let fallbackBakery: Bakery | null = null;

function storeFor(system: AudioSystem): Bakery | null {
  const live = system.internals.bakery;
  if (live) {
    system.finishBaking();
    return live;
  }
  if (!fallbackBakery) {
    try {
      fallbackBakery = system.bakeStandalone(48000, 1);
    } catch {
      return null;
    }
  }
  return fallbackBakery;
}

export function installAudioBridge(system: AudioSystem): void {
  if (typeof window === 'undefined') return;

  const bridge: AudioBridge = {
    stats: () => {
      try {
        return system.stats();
      } catch (err) {
        return { error: String(err) };
      }
    },

    bakeAll: () => {
      try {
        const b = storeFor(system);
        return { clips: b?.clipCount ?? 0, bytes: b?.bytes ?? 0, failures: b?.failures ?? [] };
      } catch (err) {
        return { clips: 0, bytes: 0, failures: [String(err)] };
      }
    },

    info: () => {
      const b = storeFor(system);
      const variants: Record<string, number> = {};
      const bytes: Record<string, number> = {};
      const clips = b ? b.names() : [];
      for (const n of clips) {
        variants[n] = b?.list(n)?.length ?? 0;
        bytes[n] = b?.bytesOf(n) ?? 0;
      }
      return {
        sampleRate: b?.sampleRate ?? 0,
        ids: knownIds(),
        clips,
        guns: GUN_IDS.slice(),
        zones: ZONE_NAMES.slice(),
        buses: BUS_NAMES.slice(),
        variants,
        bytes,
      };
    },

    measureBaked: (name, index = 0) => {
      try {
        const b = storeFor(system);
        if (!b) return fail('no bakery');
        const c = b.at(name, index);
        if (!c) return fail(`no baked clip "${name}"`);
        return measureClip(c);
      } catch (err) {
        return fail(String(err));
      }
    },

    render: (spec) => renderSpec(system, spec),
  };

  (window as unknown as Record<string, unknown>).__AUDIO__ = bridge;
}

/* ------------------------------ offline render --------------------------- */

/**
 * Builds an offline context and a full mirror of the live graph on it, runs
 * `body` to schedule sources, then renders. The mirror is thrown away
 * afterwards; a render is a few hundred milliseconds of audio, so building one
 * per measurement is far cheaper than trying to reset a shared one between
 * tests and getting it subtly wrong.
 */
async function offline(
  bakery: Bakery,
  seconds: number,
  zone: ZoneName,
  quality: number,
  dry: boolean,
  body: (core: AudioCore, ctx: OfflineAudioContext) => void,
): Promise<Measurement> {
  if (typeof OfflineAudioContext !== 'function') return fail('no OfflineAudioContext');
  const sr = bakery.sampleRate;
  const lead = Math.round(LEAD * sr);
  const length = Math.max(128, Math.ceil(seconds * sr) + lead);
  let ctx: OfflineAudioContext;
  try {
    ctx = new OfflineAudioContext(2, length, sr);
  } catch (err) {
    return fail(`OfflineAudioContext(${sr}): ${String(err)}`);
  }

  // The pool is generous here so that a measurement is never distorted by
  // culling that the live budget would apply; the culling itself is tested
  // separately through the live pool's own counters.
  const core = new AudioCore(ctx, bakery, ctx.destination, 48, 24, false, quality);
  core.timeOffset = lead / sr;
  const ir = dry ? null : buildZoneIR(ZONES[zone], sr, 0xa11ce, quality);
  core.setZone(zone, ir, 0);
  if (dry) core.mixer.reverbInput.gain.value = 0;

  try {
    body(core, ctx);
  } catch (err) {
    core.dispose();
    return fail(`schedule: ${String(err)}`);
  }

  try {
    const rendered = await ctx.startRendering();
    const chans: Float32Array[] = [];
    for (let c = 0; c < rendered.numberOfChannels; c++) {
      chans.push(rendered.getChannelData(c).subarray(lead));
    }
    const m = measure(chans, sr);
    core.dispose();
    return m;
  } catch (err) {
    core.dispose();
    return fail(`render: ${String(err)}`);
  }
}

async function renderSpec(system: AudioSystem, spec: RenderSpec): Promise<Measurement> {
  let bakery: Bakery | null = null;
  try {
    bakery = storeFor(system);
  } catch (err) {
    return fail(`bake: ${String(err)}`);
  }
  if (!bakery) return fail('no baked sound available');

  const zone: ZoneName = spec.zone && ZONES[spec.zone] ? spec.zone : 'street';
  const dry = spec.dry ?? false;
  const quality = bakery.quality;

  switch (spec.kind) {
    case 'ir': {
      /* No graph at all: the IR is the thing being measured. */
      const z = ZONES[(spec.id as ZoneName) ?? zone] ?? ZONES[zone];
      try {
        return measureClip(buildZoneIR(z, bakery.sampleRate, spec.seed ?? 0xa11ce, quality));
      } catch (err) {
        return fail(String(err));
      }
    }

    case 'baked': {
      const name = spec.id ?? '';
      const c = bakery.at(name, spec.index ?? 0);
      if (!c) return fail(`no baked clip "${name}"`);
      return measureClip(c);
    }

    case 'sound': {
      const id = spec.id ?? '';
      const d = REGISTRY[id] ?? resolve(id);
      if (!d) return fail(`unknown sound id "${id}"`);
      if (d.clip.startsWith('@')) {
        // A directive is live-synthesised; route the gunshot forms to the shot
        // renderer so `render({kind:'sound', id:'rifle_fire'})` still works.
        const m = /^@shot(_sup)?:(.+)$/.exec(d.clip);
        if (m) {
          return renderShot(bakery, {
            ...spec,
            kind: 'shot',
            id: m[2],
            suppressed: spec.suppressed ?? m[1] !== undefined,
          });
        }
        return fail(`"${id}" is the live directive ${d.clip}; render it directly`);
      }
      const distance = spec.distance ?? 0;
      const seconds = spec.seconds ?? clipSeconds(bakery, d.clip, 0.6);
      return offline(bakery, seconds, zone, quality, dry, (core) => {
        core.listenerX = 0;
        core.listenerY = 0;
        core.listenerZ = 0;
        core.emit(d.clip, {
          bus: d.bus,
          volume: d.volume,
          priority: d.priority,
          model: FAMILY[d.model],
          wet: d.wet,
          index: spec.index,
          positional: distance > 0,
          x: 0,
          y: 0,
          z: distance,
        });
      });
    }

    case 'shot':
      return renderShot(bakery, spec);

    case 'burst': {
      /*
       * The limiter test. Every explosion the bus can hold, all at the same
       * instant, at point-blank range and full volume — the worst case the game
       * can produce. The master chain has to keep the sum inside full scale.
       */
      const count = Math.max(1, Math.min(64, spec.count ?? 20));
      const name = spec.id ?? 'blast:grenade';
      const seconds = spec.seconds ?? clipSeconds(bakery, name, 3) + 0.4;
      return offline(bakery, seconds, zone, quality, dry, (core) => {
        core.listenerX = 0;
        core.listenerY = 0;
        core.listenerZ = 0;
        for (let i = 0; i < count; i++) {
          core.emit(name, {
            bus: 'explosions',
            volume: 1,
            priority: 1,
            model: DISTANCE.explosion,
            index: i,
            positional: true,
            x: 0,
            y: 0,
            z: 1.5,
          });
        }
      });
    }

    default:
      return fail(`unknown render kind "${String(spec.kind)}"`);
  }
}

async function renderShot(bakery: Bakery, spec: RenderSpec): Promise<Measurement> {
  const gun = gunVoice(spec.id ?? 'rifle');
  if (!GUNS[spec.id ?? 'rifle'] && spec.id) {
    // Not an error — `gunVoice` falls back deliberately — but the harness
    // should not silently compare a typo against the carbine five times.
    return fail(`unknown gun "${spec.id}"`);
  }
  const zone: ZoneName = spec.zone && ZONES[spec.zone] ? spec.zone : 'street';
  const distance = spec.distance ?? 0;
  const firstPerson = spec.firstPerson ?? distance <= 0.01;
  const seconds = spec.seconds ?? (spec.dry ? 0.6 : 0.5 + ZONES[zone].gunTail + distance / 343);
  let breakdown: Record<string, number> | undefined;

  return offline(bakery, seconds, zone, bakery.quality, spec.dry ?? false, (core, ctx) => {
    core.listenerX = 0;
    core.listenerY = 0;
    core.listenerZ = 0;
    if (spec.seed !== undefined) core.rng.reseed(spec.seed);
    const shots = new ShotEngine(core, 4, 2048);
    shots.fire({
      gun,
      distance,
      suppressed: spec.suppressed ?? false,
      firstPerson,
      zone: ZONES[zone],
      x: 0,
      y: 0,
      z: distance,
      volume: spec.volume ?? 1,
      pan: 0,
      only: spec.layer,
    });
    if (spec.tap) {
      // Silence the mixer and listen to one node of the shot graph directly, so
      // what comes back is the stack itself rather than the mix's view of it.
      const node =
        spec.tap === 'bus'
          ? core.mixer.busInput('weapons')
          : spec.tap === 'out'
            ? shots.lastOut
            : shots.lastSum;
      if (node) {
        core.mixer.setMasterVolume(0);
        node.connect(ctx.destination);
      }
    }
    const L = shots.last;
    breakdown = {
      /* Envelope targets, not levels: what the calibration probe compares
       * the measured per-layer peak against. */
      crack: round(L.crack * GAIN.crack, 4),
      body: round(L.body * GAIN.body, 4),
      res: round(L.res * GAIN.res, 4),
      sub: round(L.sub * GAIN.sub, 4),
      mech: round(L.mech * GAIN.mech, 4),
      ring: round(L.ring * GAIN.ring, 4),
      far: round(L.far, 4),
      tail: round(L.tail, 4),
      tailDelay: round(L.tailDelay, 4),
      airHz: round(L.airHz, 0),
      stack: round(L.stack, 4),
      sumGain: round(L.sumGain, 4),
    };
    // Not disposed: the nodes must stay connected until rendering completes,
    // and the whole context is discarded immediately afterwards.
  }).then((m) => (m.ok ? { ...m, layers: breakdown } : m));
}

/** Longest variant of a baked name, in seconds, plus room for a tail. */
function clipSeconds(bakery: Bakery, name: string, fallback: number): number {
  const list = bakery.list(name);
  if (!list || list.length === 0) return fallback;
  let longest = 0;
  for (const c of list) longest = Math.max(longest, c.duration);
  return longest + 0.35;
}

/** Re-exported so the harness's type expectations live in one place. */
export type { BusName, ZoneName };
