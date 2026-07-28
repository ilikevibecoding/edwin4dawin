/**
 * The audio self-test.
 *
 * Four things are checked, all numerically:
 *
 *  1. Every designed sound is rendered and measured — peak, RMS, crest factor,
 *     duration, spectral centroid, 85% rolloff, attack time and a ten-band
 *     spectrum. Category rules then assert what each family of sounds must
 *     actually be: a gunshot with no energy below 250 Hz is a firecracker, an
 *     explosion with no sub-bass is a noise burst, and a UI tick with a 40 Hz
 *     centroid is a thud. None of that is visible in a screenshot.
 *  2. A heavy combat scene is rendered through the real mixer graph in an
 *     `OfflineAudioContext` — voices, panners, buses, convolver, limiter — and
 *     the master output is measured. This is where clipping shows up, and it is
 *     also a direct measurement of DSP cost: wall-clock render time over
 *     rendered duration is the fraction of a core the audio thread would need.
 *  3. The voice pool is hammered with 500 triggers and then checked for leaks.
 *  4. Sound ids used by other modules are resolved, so a rename elsewhere shows
 *     up here as a warning rather than as silence in the shipped game.
 */
import * as THREE from 'three';
import { Rng } from '../../core/MathUtils';
import type { PhysicsSystem } from '../../core/Contracts';
import type { AudioEngine } from '../AudioEngine';
import { MixerGraph } from '../Graph';
import {
  OcclusionField,
  occludedCutoff,
  occludedGain,
  occludedSend,
} from '../Occlusion';
import { Voice, VoicePool, type LiveVoiceInfo } from '../Voice';
import { VOICE_BUDGET } from '../AudioEngine';
import type { SoundSpec } from '../sounds';
import { SPACES, generateImpulseResponse, type SpaceId } from '../synth';
import {
  BAND_LABELS,
  bandEnergy,
  format,
  measure,
  measureDecay,
  type DecayMeasurement,
  type Measurement,
} from './Analysis';
import { EXTERNAL_IDS } from './Expected';
import { CATEGORY_RULES, checkRules } from './Rules';

export interface SceneReport {
  events: number;
  renderedSeconds: number;
  renderMs: number;
  /** Render time over rendered time. 0.01 means 1% of a core. */
  realtimeFactor: number;
  peak: number;
  rms: number;
  clipped: boolean;
  bands: number[];
  peakVoices: number;
  stolen: number;
  rejected: number;
}

export interface LeakReport {
  fired: number;
  capacity: number;
  peakLive: number;
  liveAfter: number;
  idleAfter: number;
  /** Looping voices the running game held before and after; these are not leaks. */
  loopsBefore: number;
  loopsAfter: number;
  /** live + idle === capacity. False means a pool slot was lost. */
  accounted: boolean;
  stolen: number;
  rejected: number;
  /** Main-thread cost of `update()` with the pool saturated, milliseconds. */
  updateMeanMs: number;
  updateMaxMs: number;
  /** Live voices at the moment the update cost was sampled. */
  liveDuringProbe: number;
  /** Non-looping voices still held after the wait. Empty is the healthy answer. */
  stuck: LiveVoiceInfo[];
  ok: boolean;
}

export interface OcclusionReport {
  /** Raycasts the field issued across the probe. */
  raycasts: number;
  cacheHits: number;
  /** Most raycasts any single frame spent; must respect the budget. */
  peakPerFrame: number;
  budget: number;
  reserve: number;
  /** True if a high-priority source still got tested after the budget ran out. */
  reserveHonoured: boolean;
  /** Raycasts spent on sources too near or too far to be worth testing. */
  outOfRangeRaycasts: number;
  clearCutoffHz: number;
  blockedCutoffHz: number;
  blockedLossDb: number;
  blockedSendScale: number;
  /** Milliseconds for the smoother to cover 90% of a clear-to-blocked step. */
  smoothing90Ms: number;
  ok: boolean;
}

export interface SelfTestReport {
  ok: boolean;
  soundCount: number;
  bufferCount: number;
  synthesisMs: number;
  totalSeconds: number;
  megabytes: number;
  failures: string[];
  warnings: string[];
  measurements: Measurement[];
  spaces: SpaceReport[];
  scene: SceneReport | null;
  leak: LeakReport | null;
  occlusion: OcclusionReport | null;
  unresolved: string[];
}

export interface SpaceReport extends DecayMeasurement {
  id: SpaceId;
  /** RT60 the space was specified with, mid band. */
  targetRt60: number;
  seconds: number;
  peak: number;
}

const OFFLINE_RATE = 48000;

/**
 * Run the whole suite. `filter` limits the measured set to ids containing it,
 * which is what you want when iterating on one family of sounds.
 */
export async function runAudioSelfTest(
  engine: AudioEngine,
  filter?: string,
): Promise<SelfTestReport> {
  const library = engine.library;
  const ids = library.ids().filter((id) => !filter || id.includes(filter));

  const failures: string[] = [];
  const warnings: string[] = [];
  const measurements: Measurement[] = [];

  // ---- 1. Render and measure every designed sound ---------------------------
  const started = now();
  let frames = 0;
  let buffers = 0;
  for (const id of ids) {
    const spec = library.get(id);
    if (!spec) {
      failures.push(`${id}: registered but not retrievable`);
      continue;
    }
    // Variant 0 with the same seed the game uses, so these numbers describe the
    // buffers that actually play rather than a fresh roll of the dice.
    let rendered;
    try {
      rendered = spec.render({
        sampleRate: OFFLINE_RATE,
        rng: new Rng(hash(spec.id) ^ 0x0b1ac0),
        variant: 0,
      });
    } catch (err) {
      failures.push(`${id}: render threw ${String(err)}`);
      continue;
    }
    const channels = rendered.channels;
    if (channels.length === 0 || channels[0].length === 0) {
      failures.push(`${id}: rendered an empty buffer`);
      continue;
    }
    frames += channels[0].length * channels.length;
    buffers += spec.variants;
    const m = measure(id, channels, rendered.sampleRate);
    measurements.push(m);
    checkRules(m, spec, CATEGORY_RULES, failures, warnings);
  }
  const synthesisMs = now() - started;

  // ---- 2. Resolution of the ids other modules actually emit -----------------
  for (const id of EXTERNAL_IDS) {
    if (!library.resolve(id)) failures.push(`external id "${id}" resolves to nothing`);
  }
  const unresolved = [...library.unresolved];

  // ---- 3. Impulse responses -------------------------------------------------
  const spaces = measureSpaces(failures, warnings);

  // ---- 4. A heavy combat scene through the real graph -----------------------
  let scene: SceneReport | null = null;
  try {
    scene = await renderCombatScene(library.ids(), (id) => library.get(id) ?? null);
    if (scene.clipped) failures.push('combat scene clipped the master bus');
    if (scene.peak > 1.001) {
      failures.push(`combat scene master peak ${scene.peak.toFixed(3)} exceeds full scale`);
    }
    if (scene.peak < 0.2) {
      warnings.push(`combat scene master peak only ${scene.peak.toFixed(3)}; mix may be too quiet`);
    }
  } catch (err) {
    warnings.push(`offline scene render failed: ${String(err)}`);
  }

  // ---- 5. Occlusion ---------------------------------------------------------
  const occlusion = probeOcclusion(failures, warnings);

  // ---- 6. Voice leaks -------------------------------------------------------
  let leak: LeakReport | null = null;
  try {
    leak = await runLeakTest(engine);
    if (!leak.ok) {
      const why = leak.stuck
        .map(
          (s) =>
            `${s.id}(${s.active ? 'active' : 'never started'}, ` +
            `${s.remaining.toFixed(2)}s left, rate ${s.rate.toFixed(3)})`,
        )
        .join(', ');
      failures.push(
        `voice leak: ${leak.stuck.length} of ${leak.fired} triggered voices still held, ` +
          `${leak.liveAfter} live / ${leak.idleAfter} idle of ${leak.capacity}` +
          `${leak.accounted ? '' : ' — POOL SLOT LOST'}${why ? `: ${why}` : ''}`,
      );
    }
  } catch (err) {
    warnings.push(`leak test failed: ${String(err)}`);
  }

  const report: SelfTestReport = {
    ok: failures.length === 0,
    soundCount: measurements.length,
    bufferCount: buffers,
    synthesisMs: Math.round(synthesisMs),
    totalSeconds: Math.round((frames / OFFLINE_RATE) * 10) / 10,
    megabytes: Math.round((frames * 4) / 1048576),
    failures,
    warnings,
    measurements,
    spaces,
    scene,
    leak,
    occlusion,
    unresolved,
  };

  logReport(report);
  return report;
}

// ---------------------------------------------------------------------------
// Impulse responses
// ---------------------------------------------------------------------------

/**
 * Every convolution space, checked against the room it claims to be. An IR is
 * the strongest cue for where the player is standing, and "noise with a fade"
 * passes a listening test far more easily than it passes this: the measured
 * RT60 has to land near the specification, the early field has to contain
 * countable discrete arrivals from the image-source pass, and the two channels
 * have to be decorrelated or the space collapses to wide mono.
 */
function measureSpaces(failures: string[], warnings: string[]): SpaceReport[] {
  const out: SpaceReport[] = [];
  for (const id of Object.keys(SPACES) as SpaceId[]) {
    const spec = SPACES[id];
    let ir;
    try {
      ir = generateImpulseResponse(id, OFFLINE_RATE);
    } catch (err) {
      failures.push(`ir ${id}: generation threw ${String(err)}`);
      continue;
    }
    const decay = measureDecay(ir.channels, ir.sampleRate);
    const frames = ir.channels[0]?.length ?? 0;
    let peak = 0;
    for (const ch of ir.channels) for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));

    const report: SpaceReport = {
      id,
      targetRt60: spec.rt60[1],
      seconds: frames / ir.sampleRate,
      peak,
      ...decay,
    };
    out.push(report);

    const label = `ir ${id}`;
    if (peak > 1.001) failures.push(`${label}: peak ${peak.toFixed(3)} exceeds full scale`);
    if (peak < 0.05) failures.push(`${label}: peak only ${peak.toFixed(4)}; the IR is near-silent`);
    // Generous: the diffuse field is stochastic and T30 on a synthetic tail is
    // not a precision instrument. This is here to catch a decay that is out by
    // a factor, not one that is out by 10%.
    const ratio = decay.rt60 / Math.max(0.01, spec.rt60[1]);
    if (ratio < 0.5 || ratio > 1.8) {
      failures.push(
        `${label}: measured RT60 ${decay.rt60.toFixed(2)}s against a specified ${spec.rt60[1].toFixed(2)}s`,
      );
    }
    if (decay.earlyReflections < 3) {
      failures.push(
        `${label}: only ${decay.earlyReflections} discrete early reflections; the image-source pass is not contributing`,
      );
    }
    if (decay.correlation > 0.9) {
      failures.push(
        `${label}: channels ${(decay.correlation * 100).toFixed(0)}% correlated; the space will collapse to mono`,
      );
    }
    if (decay.predelay > spec.predelay * 3 + 0.01) {
      warnings.push(
        `${label}: predelay ${(decay.predelay * 1000).toFixed(1)}ms against a specified ${(spec.predelay * 1000).toFixed(1)}ms`,
      );
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Occlusion
// ---------------------------------------------------------------------------

/**
 * Occlusion against a synthetic wall.
 *
 * The live game exercises this only when a physics system happens to be ready
 * and something loud happens to be behind geometry, which makes it exactly the
 * kind of feature that quietly stops working. So it is driven directly here: a
 * stub physics backend reports everything past z = -10 as blocked, and the
 * field is stepped frame by frame. What has to hold is that raycasts are
 * actually issued, that the per-frame budget is respected, that the cache
 * absorbs the repeats, that a high-priority source is not starved by a frame
 * full of casings, and that a blocked source is audibly dulled rather than
 * merely quieter.
 */
function probeOcclusion(failures: string[], warnings: string[]): OcclusionReport {
  const field = new OcclusionField();
  // Only `lineOfSight` and `ready` are reachable from the occlusion path; the
  // rest of PhysicsSystem is irrelevant to it and stubbing it out in full would
  // be pages of noise.
  const physics = {
    name: 'physics',
    ready: true,
    lineOfSight: (_from: THREE.Vector3, to: THREE.Vector3): boolean => to.z > -10,
  } as unknown as PhysicsSystem;
  field.setPhysics(physics);

  const listener = new THREE.Vector3(0, 1.6, 0);
  const dt = 1 / 60;
  let peakPerFrame = 0;

  // Ten sources spread over distinct cells, six of them behind the wall. Held
  // still for half a second of frames so the cache both fills and expires.
  const sources: Array<{ x: number; y: number; z: number; importance: number }> = [];
  for (let i = 0; i < 10; i++) {
    sources.push({ x: -18 + i * 4, y: 1.6, z: i < 6 ? -14 : -6, importance: i % 2 ? 0.95 : 0.5 });
  }

  for (let frame = 0; frame < 30; frame++) {
    const before = field.tests;
    field.beginFrame(dt, listener);
    for (const s of sources) field.query(s.x, s.y, s.z, s.importance);
    peakPerFrame = Math.max(peakPerFrame, field.tests - before);
  }

  const budgetedRaycasts = field.tests;
  const cacheHits = field.cacheHits;

  // A frame swamped by low-priority sources must still leave room for one that
  // matters. Fresh cells every iteration so nothing is answered from the cache.
  field.beginFrame(dt, listener);
  for (let i = 0; i < 24; i++) field.query(200 + i * 4, 1.6, -14, 0.2);
  const beforeImportant = field.tests;
  field.query(-40, 1.6, -14, 0.95);
  const reserveHonoured = field.tests > beforeImportant;

  // Distance gating: in your lap, or far enough that attenuation has already
  // done the job. Neither is worth a raycast.
  field.beginFrame(dt, listener);
  const beforeRange = field.tests;
  field.query(0.5, 1.6, -1, 1);
  field.query(0, 1.6, -400, 1);
  const outOfRangeRaycasts = field.tests - beforeRange;

  // How long the smoother takes to walk a binary raycast up to the target.
  let value = 0;
  let steps = 0;
  while (value < 0.9 && steps < 600) {
    value = field.smooth(value, 1, dt);
    steps++;
  }
  const smoothing90Ms = steps * dt * 1000;

  const clearCutoffHz = occludedCutoff(18000, 0);
  const blockedCutoffHz = occludedCutoff(18000, 1);
  const blockedLossDb = 20 * Math.log10(occludedGain(1));
  const blockedSendScale = occludedSend(0.3, 1) / 0.3;

  const ok =
    budgetedRaycasts > 0 &&
    cacheHits > 0 &&
    peakPerFrame <= field.testsPerFrame + field.reservePerFrame &&
    reserveHonoured &&
    outOfRangeRaycasts === 0 &&
    blockedCutoffHz < 1200 &&
    blockedLossDb <= -6;

  if (budgetedRaycasts === 0) {
    failures.push('occlusion: no raycasts were issued against a blocking physics stub');
  }
  if (peakPerFrame > field.testsPerFrame + field.reservePerFrame) {
    failures.push(
      `occlusion: ${peakPerFrame} raycasts in one frame against a budget of ` +
        `${field.testsPerFrame}+${field.reservePerFrame}`,
    );
  }
  if (!reserveHonoured) {
    failures.push('occlusion: a high-priority source was starved by low-priority ones');
  }
  if (outOfRangeRaycasts > 0) {
    failures.push(`occlusion: ${outOfRangeRaycasts} raycasts spent outside the test range`);
  }
  if (blockedCutoffHz >= 1200) {
    failures.push(
      `occlusion: a fully blocked source still passes ${blockedCutoffHz.toFixed(0)} Hz; ` +
        'it will not read as being through a wall',
    );
  }
  if (blockedLossDb > -6) {
    failures.push(`occlusion: only ${blockedLossDb.toFixed(1)} dB of loss when fully blocked`);
  }
  if (cacheHits === 0) {
    warnings.push('occlusion: the cell cache never answered a query; every frame is raycasting');
  }
  if (smoothing90Ms < 60) {
    warnings.push(`occlusion: ${smoothing90Ms.toFixed(0)}ms to full occlusion will chatter`);
  }
  if (smoothing90Ms > 1200) {
    warnings.push(`occlusion: ${smoothing90Ms.toFixed(0)}ms to full occlusion lags the geometry`);
  }

  return {
    raycasts: budgetedRaycasts,
    cacheHits,
    peakPerFrame,
    budget: field.testsPerFrame,
    reserve: field.reservePerFrame,
    reserveHonoured,
    outOfRangeRaycasts,
    clearCutoffHz,
    blockedCutoffHz,
    blockedLossDb,
    blockedSendScale,
    smoothing90Ms,
    ok,
  };
}

// ---------------------------------------------------------------------------
// Offline scene
// ---------------------------------------------------------------------------

interface SceneEvent {
  id: string;
  at: number;
  position: [number, number, number] | null;
  gain: number;
}

/**
 * A deliberately brutal 6 s of gameplay: a local automatic weapon, two remote
 * shooters, the impacts they generate, four explosions overlapping, casings,
 * bullet cracks and an ambience bed. Roughly what the worst second of a match
 * looks like, sustained.
 */
function buildScene(available: readonly string[]): SceneEvent[] {
  const has = new Set(available);
  const rng = new Rng(0xc0ffee);
  const events: SceneEvent[] = [];
  const push = (id: string, at: number, position: [number, number, number] | null, gain = 1) => {
    if (has.has(id)) events.push({ id, at, position, gain });
  };

  // Local automatic fire at 750 rpm for the whole scene.
  for (let t = 0.15; t < 5.4; t += 60 / 750) {
    push('gun_rifle_556_local', t, null, 1);
    push('gun_tail_outdoor', t + 0.01, [1, 0, -1], 0.5);
    push('impact_concrete', t + 0.06, [rng.range(-8, 8), 1, -22], 0.7);
    if (rng.bool(0.5)) push('shell_bounce_rifle', t + 0.28, [0.4, -1.2, 0.2], 0.4);
  }
  // Two enemies returning fire.
  for (let t = 0.6; t < 5.2; t += 0.14) {
    push('gun_rifle_545_remote', t, [rng.range(-30, -18), 1.6, rng.range(-40, -25)], 0.9);
    push('gun_tail_outdoor', t + 0.02, [-22, 1.6, -30], 0.6);
    if (rng.bool(0.35)) push('bullet_whizz', t + 0.1, [rng.range(-1, 1), 0.2, -1], 0.8);
    if (rng.bool(0.25)) push('bullet_ricochet', t + 0.12, [rng.range(-6, 6), 0.6, -9], 0.6);
  }
  // Four explosions landing on top of each other, which is the case the limiter
  // exists for.
  push('explosion_grenade', 2.0, [6, 0.5, -12], 1);
  push('explosion_rocket', 2.15, [-9, 1, -18], 1);
  push('explosion_airstrike', 2.3, [2, 0.5, -30], 1);
  push('explosion_vehicle', 2.42, [14, 1, -20], 1);
  push('explosion_barrel', 2.55, [-4, 0.5, -8], 1);
  // Movement and interface underneath it all.
  for (let t = 0.3; t < 5.5; t += 0.42) {
    push('footstep_concrete', t, null, 0.8);
  }
  push('ui_hitmarker', 1.1, null, 1);
  push('ui_hitmarker_headshot', 2.9, null, 1);
  push('ui_hitmarker_kill', 3.4, null, 1);
  push('amb_wind', 0, null, 0.5);
  push('mus_drone', 0, null, 0.6);

  return events;
}

async function renderCombatScene(
  available: readonly string[],
  lookup: (id: string) => SoundSpec | null,
): Promise<SceneReport> {
  const seconds = 7;
  const events = buildScene(available);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * OFFLINE_RATE), OFFLINE_RATE);
  const graph = new MixerGraph(ctx);
  graph.setSpace('outdoor', 0.3, 0.01);
  const pool = new VoicePool(graph, VOICE_BUDGET);

  // Buffers are rendered once per distinct id, which is exactly what the live
  // bank does.
  const cache = new Map<string, AudioBuffer>();
  const bufferFor = (spec: SoundSpec): AudioBuffer | null => {
    const hit = cache.get(spec.id);
    if (hit) return hit;
    const rendered = spec.render({
      sampleRate: OFFLINE_RATE,
      rng: new Rng(hash(spec.id) ^ 0x0b1ac0),
      variant: 0,
    });
    if (!rendered.channels.length || !rendered.channels[0].length) return null;
    const buffer = ctx.createBuffer(
      rendered.channels.length,
      rendered.channels[0].length,
      rendered.sampleRate,
    );
    for (let c = 0; c < rendered.channels.length; c++) {
      buffer.copyToChannel(rendered.channels[c], c);
    }
    cache.set(spec.id, buffer);
    return buffer;
  };

  const listener = { x: 0, y: 1.6, z: 0 };
  let started = 0;
  for (const event of events) {
    const spec = lookup(event.id);
    if (!spec) continue;
    const buffer = bufferFor(spec);
    if (!buffer) continue;
    const distance = event.position
      ? Math.hypot(
          event.position[0] - listener.x,
          event.position[1] - listener.y,
          event.position[2] - listener.z,
        )
      : 0;
    const voice: Voice | null = pool.acquire(event.gain * spec.gain);
    if (!voice) continue;
    voice.start({
      spec,
      buffer,
      gain: event.gain * spec.gain,
      playbackRate: 1,
      position: event.position
        ? ({ x: event.position[0], y: event.position[1], z: event.position[2] } as never)
        : null,
      loop: false,
      when: event.at,
      distance,
      airHz: 18000 / (1 + distance * 0.085 * spec.airScale),
      toneDb: 0,
      send: spec.send,
      priority: spec.priority,
      tag: 'scene',
      direct: false,
    });
    started++;
  }

  const wall = now();
  const rendered = await ctx.startRendering();
  const renderMs = now() - wall;

  const channels: Float32Array[] = [];
  for (let c = 0; c < rendered.numberOfChannels; c++) channels.push(rendered.getChannelData(c));
  const m = measure('scene', channels, rendered.sampleRate);

  return {
    events: started,
    renderedSeconds: seconds,
    renderMs: Math.round(renderMs),
    realtimeFactor: Math.round((renderMs / (seconds * 1000)) * 10000) / 10000,
    peak: m.peak,
    rms: m.rms,
    clipped: m.clipped,
    bands: m.bands,
    peakVoices: pool.peakLive,
    stolen: pool.stolen,
    rejected: pool.rejected,
  };
}

// ---------------------------------------------------------------------------
// Voice leak
// ---------------------------------------------------------------------------

/**
 * Fire 500 sounds through the live engine, then wait for them to finish and
 * assert every voice came back. A leaked `AudioBufferSourceNode` is invisible
 * until a firefight has been going for a minute and the tab has quietly
 * acquired ten thousand of them.
 *
 * This runs against the *live* engine while the game is still playing, so the
 * pool is not expected to be empty afterwards: the ambience beds hold looping
 * voices and the music scheduler queues percussion a beat or two ahead of the
 * clock. Both are correct. So the leak assertion is scoped by tag to the voices
 * this test fired, and is backed by a slot-accounting invariant that catches a
 * lost slot no matter who owned it.
 */
async function runLeakTest(engine: AudioEngine): Promise<LeakReport> {
  const pool = engine.pool;
  if (!pool) throw new Error('no voice pool');
  await engine.unlock();
  const loopsBefore = pool.loopCount;

  const ids = [
    'impact_concrete',
    'impact_metal',
    'impact_flesh',
    'footstep_gravel',
    'bullet_whizz',
    'bullet_ricochet',
    'shell_bounce_rifle',
    'ui_hitmarker',
    'gun_rifle_556_remote',
    'weapon_mag_in',
  ].filter((id) => engine.library.has(id));

  const before = {
    stolen: pool.stolen,
    rejected: pool.rejected,
  };
  const position = { x: 3, y: 1, z: -4 } as never;
  const total = 500;
  let peak = 0;
  for (let i = 0; i < total; i++) {
    const id = ids[i % ids.length];
    // Alternate positional and 2D so both routing paths are exercised, and vary
    // the distance so some are culled and some steal.
    const opts = { volume: 0.0008, immediate: true, tag: LEAK_TAG };
    if (i % 3 === 0) engine.play2D(id, opts);
    else engine.play(id, position, opts);
    if (pool.liveCount > peak) peak = pool.liveCount;
  }

  // Main-thread cost with the pool saturated. The offline scene measures DSP
  // load on the audio thread; this is the other half — what the game loop pays
  // per frame to sweep voices, drive the listener and run occlusion, at the
  // moment there are more live voices than there are slots.
  //
  // Timed as a batch rather than per call: a single update is well under the
  // 100 us that `performance.now()` is coarsened to in a non-isolated context,
  // so sampling one at a time reads zero and tells you nothing.
  const liveDuringProbe = pool.liveCount;
  const iterations = 300;
  const batchStart = now();
  for (let i = 0; i < iterations; i++) engine.update(1 / 60);
  const updateMeanMs = (now() - batchStart) / iterations;
  let updateMaxMs = 0;
  for (let i = 0; i < 20; i++) {
    engine.update(1 / 60);
    updateMaxMs = Math.max(updateMaxMs, engine.stats().updateMs);
  }

  // The longest buffer in that set is well under two seconds; three is ample
  // even with the pool's own safety sweep.
  await sleep(3000);
  pool.sweep(engine.now);
  await sleep(120);
  pool.sweep(engine.now);

  const stuck = pool.describeLive(engine.now).filter((v) => v.tag === LEAK_TAG);
  const liveAfter = pool.liveCount;
  const idleAfter = pool.idleCount;
  const loopsAfter = pool.loopCount;
  // Every slot is either in use or available. If this ever fails a voice was
  // dropped on the floor, which is the failure mode that starves the pool.
  const accounted = liveAfter + idleAfter === pool.capacity;
  return {
    fired: total,
    capacity: pool.capacity,
    peakLive: peak,
    liveAfter,
    idleAfter,
    loopsBefore,
    loopsAfter,
    accounted,
    stolen: pool.stolen - before.stolen,
    rejected: pool.rejected - before.rejected,
    updateMeanMs,
    updateMaxMs,
    liveDuringProbe,
    stuck,
    ok: stuck.length === 0 && accounted,
  };
}

/** Owner tag for the voices the leak test fires, so it can assert on its own. */
const LEAK_TAG = 'audiotest-leak';

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function logReport(report: SelfTestReport): void {
  const line = (s: string): void => console.log(`[audiotest] ${s}`);
  line('='.repeat(120));
  line(
    `library: ${report.soundCount} ids, ${report.bufferCount} buffers, ` +
      `${report.totalSeconds}s of audio, ~${report.megabytes} MB, synthesised in ${report.synthesisMs} ms`,
  );
  line(`bands: ${BAND_LABELS.join(' ')} (percent of spectral energy)`);
  line('-'.repeat(120));
  for (const m of report.measurements) line(format(m));
  line('-'.repeat(120));

  for (const s of report.spaces) {
    line(
      `ir ${s.id.padEnd(12)} ` +
        `len ${s.seconds.toFixed(2)}s ` +
        `pk ${s.peak.toFixed(3)} ` +
        `rt60 ${s.rt60.toFixed(2)}s (spec ${s.targetRt60.toFixed(2)}s) ` +
        `predelay ${(s.predelay * 1000).toFixed(1)}ms ` +
        `early ${(s.earlyFraction * 100).toFixed(0)}% ` +
        `reflections ${String(s.earlyReflections).padStart(3)} ` +
        `L/R corr ${s.correlation.toFixed(3)}`,
    );
  }
  line('-'.repeat(120));

  const scene = report.scene;
  if (scene) {
    line(
      `scene: ${scene.events} events over ${scene.renderedSeconds}s, ` +
        `peak ${scene.peak.toFixed(3)} rms ${scene.rms.toFixed(4)} ` +
        `clipped=${scene.clipped} peakVoices=${scene.peakVoices} ` +
        `stolen=${scene.stolen} rejected=${scene.rejected}`,
    );
    line(
      `scene cost: rendered ${scene.renderedSeconds}s of graph in ${scene.renderMs} ms ` +
        `(${(scene.realtimeFactor * 100).toFixed(2)}% of one core)`,
    );
    line(`scene bands: [${scene.bands.map((v) => (v * 100).toFixed(1)).join(' ')}]`);
  }

  const occ = report.occlusion;
  if (occ) {
    line(
      `occlusion: ${occ.raycasts} raycasts, ${occ.cacheHits} cache hits, ` +
        `peak ${occ.peakPerFrame}/frame (budget ${occ.budget}+${occ.reserve} reserve, ` +
        `honoured=${occ.reserveHonoured}), ${occ.outOfRangeRaycasts} out of range, ` +
        `blocked: ${occ.clearCutoffHz.toFixed(0)}Hz -> ${occ.blockedCutoffHz.toFixed(0)}Hz ` +
        `${occ.blockedLossDb.toFixed(1)}dB send x${occ.blockedSendScale.toFixed(2)}, ` +
        `glide ${occ.smoothing90Ms.toFixed(0)}ms => ${occ.ok ? 'OK' : 'BAD'}`,
    );
  }

  const leak = report.leak;
  if (leak) {
    line(
      `leak: fired ${leak.fired}, peakLive ${leak.peakLive}/${leak.capacity}, ` +
        `stolen ${leak.stolen}, rejected ${leak.rejected}, ` +
        `after: live ${leak.liveAfter} (${leak.loopsAfter} held loops, ` +
        `${leak.stuck.length} of ours) idle ${leak.idleAfter}/${leak.capacity}, ` +
        `accounted ${leak.accounted} => ${leak.ok ? 'CLEAN' : 'LEAK'}`,
    );
    line(
      `main thread at ${leak.liveDuringProbe} live voices: update() mean ` +
        `${leak.updateMeanMs.toFixed(3)} ms/frame, worst observed ${leak.updateMaxMs.toFixed(3)} ms ` +
        `(${((leak.updateMeanMs / 16.67) * 100).toFixed(2)}% of a 60 fps frame)`,
    );
  }

  if (report.unresolved.length) {
    line(`fallbacks used: ${report.unresolved.join(', ')}`);
  }
  for (const w of report.warnings) line(`WARN  ${w}`);
  for (const f of report.failures) line(`FAIL  ${f}`);
  line(report.ok ? 'RESULT: PASS' : `RESULT: FAIL (${report.failures.length})`);
  line('='.repeat(120));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Re-exported so a runner can reason about band indices without importing two files. */
export { bandEnergy, BAND_LABELS };
