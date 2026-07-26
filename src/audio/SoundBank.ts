/**
 * SoundBank — offline synthesis of every sound the game uses.
 *
 * `buildSoundBank` spins up one short-lived `OfflineAudioContext` per buffer,
 * schedules a layered node graph with SynthLab primitives, and renders it to an
 * `AudioBuffer`. All renders are kicked off and awaited together (chunked to
 * bound memory) so the whole bank builds in well under a couple of seconds. Each
 * "family" id carries several baked variants so repeated shots never sound
 * identical.
 */
import {
  mulberry32,
  gauss,
  randRange,
  randInt,
  crack,
  thump,
  resoNoise,
  blast,
  ping,
  clatter,
  noiseBuffer,
  makeSaturator,
  equalPowerLoopFade,
  normalize,
  setPerc,
  setAHR,
  type Rng,
  type NoiseColor,
} from './SynthLab';

export type OfflineCtor = new (
  channels: number,
  length: number,
  sampleRate: number
) => OfflineAudioContext;

interface SoundDef {
  id: string;
  variants: number;
  seconds: number;
  channels?: number;
  loop?: boolean;
  loopFade?: number;
  normalizeTo?: number;
  render: (ctx: OfflineAudioContext, rng: Rng, variant: number) => void;
}

export interface BankBuildResult {
  bank: Map<string, AudioBuffer[]>;
  ids: string[];
  buildMs: number;
  variantCount: number;
  totalSamples: number;
  totalBytes: number;
  silent: string[];
}

export interface BankBuildOptions {
  OfflineCtor: OfflineCtor;
  sampleRate: number;
  timeoutMs?: number;
  concurrency?: number;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gain node feeding destination plus a shared soft-clip saturator bus. */
function busChain(
  ctx: OfflineAudioContext,
  drive: number,
  outGain = 0.9,
  kind: 'tanh' | 'fuzz' = 'tanh'
): { out: GainNode; sat: WaveShaperNode } {
  const out = ctx.createGain();
  out.gain.value = outGain;
  out.connect(ctx.destination);
  const sat = makeSaturator(ctx, drive, kind);
  sat.connect(out);
  return { out, sat };
}

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------

interface WeaponProfile {
  crackFreq: number;
  crackGain: number;
  crackDecay: number;
  thumpHi: number;
  thumpLo: number;
  thumpDur: number;
  thumpGain: number;
  resoFreq: number;
  resoTo: number;
  resoQ: number;
  resoDur: number;
  resoGain: number;
  blastHi: number;
  blastLo: number;
  blastDur: number;
  blastGain: number;
  blastColor: NoiseColor;
  drive: number;
  mechGain: number;
  outGain: number;
}

const WEAPONS: Record<string, WeaponProfile> = {
  assault_rifle: {
    crackFreq: 4600, crackGain: 0.92, crackDecay: 0.006,
    thumpHi: 155, thumpLo: 55, thumpDur: 0.11, thumpGain: 0.95,
    resoFreq: 900, resoTo: 380, resoQ: 6, resoDur: 0.09, resoGain: 0.8,
    blastHi: 8200, blastLo: 700, blastDur: 0.16, blastGain: 0.72, blastColor: 'white',
    drive: 2.5, mechGain: 0.12, outGain: 0.85,
  },
  smg: {
    crackFreq: 5200, crackGain: 0.85, crackDecay: 0.004,
    thumpHi: 135, thumpLo: 62, thumpDur: 0.07, thumpGain: 0.62,
    resoFreq: 1250, resoTo: 520, resoQ: 7, resoDur: 0.06, resoGain: 0.72,
    blastHi: 9200, blastLo: 950, blastDur: 0.1, blastGain: 0.6, blastColor: 'white',
    drive: 2.2, mechGain: 0.14, outGain: 0.82,
  },
  sniper: {
    crackFreq: 3800, crackGain: 1.0, crackDecay: 0.009,
    thumpHi: 110, thumpLo: 40, thumpDur: 0.3, thumpGain: 1.15,
    resoFreq: 650, resoTo: 250, resoQ: 5, resoDur: 0.2, resoGain: 0.92,
    blastHi: 7200, blastLo: 380, blastDur: 0.55, blastGain: 0.9, blastColor: 'white',
    drive: 3.0, mechGain: 0.16, outGain: 0.92,
  },
  shotgun: {
    crackFreq: 3400, crackGain: 0.82, crackDecay: 0.007,
    thumpHi: 118, thumpLo: 42, thumpDur: 0.22, thumpGain: 1.08,
    resoFreq: 500, resoTo: 210, resoQ: 3, resoDur: 0.16, resoGain: 0.7,
    blastHi: 6000, blastLo: 480, blastDur: 0.4, blastGain: 0.92, blastColor: 'pink',
    drive: 2.6, mechGain: 0.13, outGain: 0.9,
  },
  pistol: {
    crackFreq: 4900, crackGain: 0.86, crackDecay: 0.005,
    thumpHi: 175, thumpLo: 82, thumpDur: 0.05, thumpGain: 0.5,
    resoFreq: 1050, resoTo: 520, resoQ: 6, resoDur: 0.05, resoGain: 0.6,
    blastHi: 8200, blastLo: 1200, blastDur: 0.08, blastGain: 0.52, blastColor: 'white',
    drive: 2.0, mechGain: 0.11, outGain: 0.8,
  },
  lmg: {
    crackFreq: 4000, crackGain: 0.96, crackDecay: 0.008,
    thumpHi: 130, thumpLo: 45, thumpDur: 0.17, thumpGain: 1.08,
    resoFreq: 760, resoTo: 300, resoQ: 5, resoDur: 0.13, resoGain: 0.86,
    blastHi: 7600, blastLo: 560, blastDur: 0.24, blastGain: 0.8, blastColor: 'white',
    drive: 2.8, mechGain: 0.15, outGain: 0.88,
  },
};

function renderWeapon(ctx: OfflineAudioContext, rng: Rng, p: WeaponProfile): void {
  const { out, sat } = busChain(ctx, p.drive, p.outGain);
  const j = (x: number, amt: number) => x * (1 + amt * gauss(rng));
  crack(ctx, sat, 0, { gain: j(p.crackGain, 0.08), freq: j(p.crackFreq, 0.06), decay: p.crackDecay, rng });
  thump(ctx, sat, 0.0006, {
    startFreq: j(p.thumpHi, 0.08),
    endFreq: j(p.thumpLo, 0.06),
    dur: j(p.thumpDur, 0.06),
    gain: j(p.thumpGain, 0.06),
  });
  resoNoise(ctx, sat, 0.0009, {
    freq: j(p.resoFreq, 0.07),
    q: p.resoQ,
    sweepTo: p.resoTo,
    dur: p.resoDur,
    gain: j(p.resoGain, 0.06),
    rng,
  });
  blast(ctx, sat, 0.0012, {
    cutoff0: j(p.blastHi, 0.05),
    cutoff1: p.blastLo,
    dur: j(p.blastDur, 0.08),
    gain: j(p.blastGain, 0.06),
    color: p.blastColor,
    rng,
  });
  // Mechanical action clatter, slightly delayed and quieter.
  clatter(ctx, out, randRange(rng, 0.018, 0.05), { gain: p.mechGain, dur: 0.08, rng });
  // Baked environment slap-back / distant crack echo.
  blast(ctx, out, randRange(rng, 0.05, 0.1), {
    cutoff0: 3200,
    cutoff1: 500,
    dur: p.blastDur * 1.3,
    gain: p.blastGain * 0.16,
    color: 'pink',
    rng,
  });
}

// ---------------------------------------------------------------------------
// Weapon mechanics
// ---------------------------------------------------------------------------

function metalClick(ctx: OfflineAudioContext, dest: AudioNode, t: number, freq: number, gain: number, rng: Rng): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.05, 'white', rng);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = randRange(rng, 5, 11);
  const g = ctx.createGain();
  g.gain.value = 0;
  setPerc(g.gain, t, gain, 0.0004, randRange(rng, 0.01, 0.03));
  src.connect(bp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + 0.06);
}

const MECHANICS: SoundDef[] = [
  {
    id: 'mag_release', variants: 2, seconds: 0.2,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.5, 0.9);
      metalClick(ctx, out, 0, randRange(rng, 1800, 2400), 0.5, rng);
      ping(ctx, out, 0.01, { freq: 1400, dur: 0.06, gain: 0.18, partials: 2, detune: 0.02, rng });
    },
  },
  {
    id: 'mag_out', variants: 3, seconds: 0.45,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.4, 0.9);
      metalClick(ctx, out, 0, 2000, 0.4, rng);
      // Rattle of the magazine leaving.
      clatter(ctx, out, 0.02, { gain: 0.3, dur: 0.28, clicks: randInt(rng, 5, 8), freq: 1600, rng });
    },
  },
  {
    id: 'mag_in', variants: 3, seconds: 0.25,
    render: (ctx, rng) => {
      const { out, sat } = busChain(ctx, 2.0, 0.95);
      // Solid seat clack: a short body + bright click.
      thump(ctx, sat, 0.0, { startFreq: 240, endFreq: 90, dur: 0.05, gain: 0.5 });
      metalClick(ctx, out, 0.004, randRange(rng, 2200, 2800), 0.7, rng);
      metalClick(ctx, out, 0.02, randRange(rng, 1500, 1900), 0.3, rng);
    },
  },
  {
    id: 'bolt_pull', variants: 2, seconds: 0.28,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.5, 0.9);
      // Scrape then catch.
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 0.14, 'white', rng);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1200, 0);
      bp.frequency.linearRampToValueAtTime(2600, 0.12);
      bp.Q.value = 3;
      const g = ctx.createGain();
      g.gain.value = 0;
      setAHR(g.gain, 0, 0.28, 0.01, 0.08, 0.05);
      src.connect(bp).connect(g).connect(out);
      src.start(0);
      src.stop(0.16);
      metalClick(ctx, out, 0.13, 2400, 0.5, rng);
    },
  },
  {
    id: 'bolt_release', variants: 2, seconds: 0.2,
    render: (ctx, rng) => {
      const { out, sat } = busChain(ctx, 2.2, 0.95);
      thump(ctx, sat, 0, { startFreq: 300, endFreq: 120, dur: 0.04, gain: 0.4 });
      metalClick(ctx, out, 0, 2600, 0.8, rng);
      metalClick(ctx, out, 0.012, 1700, 0.35, rng);
    },
  },
  {
    id: 'fire_select', variants: 2, seconds: 0.12,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.4, 0.85);
      metalClick(ctx, out, 0, randRange(rng, 3000, 3600), 0.5, rng);
    },
  },
  {
    id: 'dryfire', variants: 3, seconds: 0.12,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.6, 0.9);
      // Light metallic click, no boom.
      metalClick(ctx, out, 0, randRange(rng, 2600, 3400), 0.6, rng);
      ping(ctx, out, 0.001, { freq: randRange(rng, 2000, 2600), dur: 0.03, gain: 0.12, partials: 2, detune: 0.03, rng });
    },
  },
  {
    id: 'weapon_raise', variants: 2, seconds: 0.35,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.3, 0.85);
      // Cloth swish + a couple of metal shifts.
      fabricSwish(ctx, out, 0, 0.22, 0.22, rng);
      metalClick(ctx, out, 0.08, 1900, 0.22, rng);
      metalClick(ctx, out, 0.2, 1500, 0.16, rng);
    },
  },
  {
    id: 'weapon_lower', variants: 2, seconds: 0.35,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.3, 0.85);
      fabricSwish(ctx, out, 0, 0.24, 0.2, rng);
      metalClick(ctx, out, 0.12, 1600, 0.16, rng);
    },
  },
  {
    id: 'ads_in', variants: 2, seconds: 0.22,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.3, 0.85);
      fabricSwish(ctx, out, 0, 0.14, 0.18, rng);
      metalClick(ctx, out, 0.06, 2200, 0.14, rng);
    },
  },
  {
    id: 'ads_out', variants: 2, seconds: 0.22,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.3, 0.85);
      fabricSwish(ctx, out, 0, 0.14, 0.16, rng);
      metalClick(ctx, out, 0.05, 1900, 0.12, rng);
    },
  },
];

function fabricSwish(ctx: OfflineAudioContext, dest: AudioNode, t: number, dur: number, gain: number, rng: Rng): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + 0.02, 'pink', rng);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1600, t);
  bp.frequency.linearRampToValueAtTime(3200, t + dur);
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.value = 0;
  setAHR(g.gain, t, gain, dur * 0.4, 0.0, dur * 0.6);
  src.connect(bp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + dur + 0.02);
}

// ---------------------------------------------------------------------------
// Surface impacts
// ---------------------------------------------------------------------------

function renderImpactConcrete(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 2.0, 0.9);
  crack(ctx, sat, 0, { gain: 0.7, freq: randRange(rng, 3200, 4200), decay: 0.004, rng });
  resoNoise(ctx, sat, 0.001, { freq: randRange(rng, 900, 1400), q: 3, sweepTo: 400, dur: 0.05, gain: 0.5, rng });
  // Dust puff.
  blast(ctx, out, 0.004, { cutoff0: 2200, cutoff1: 400, dur: 0.12, gain: 0.22, color: 'pink', rng });
}

function renderImpactMetal(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 1.8, 0.9);
  crack(ctx, sat, 0, { gain: 0.5, freq: 5000, decay: 0.003, rng });
  ping(ctx, out, 0.0006, {
    freq: randRange(rng, 1600, 3200),
    dur: randRange(rng, 0.14, 0.28),
    gain: 0.6,
    partials: 4,
    detune: 0.03,
    rng,
  });
}

function renderImpactWood(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 1.8, 0.9);
  thump(ctx, sat, 0, { startFreq: randRange(rng, 220, 320), endFreq: 90, dur: 0.08, gain: 0.6, type: 'triangle' });
  resoNoise(ctx, sat, 0.002, { freq: randRange(rng, 500, 800), q: 4, sweepTo: 250, dur: 0.05, gain: 0.35, rng });
  // Splinter.
  clatter(ctx, out, 0.004, { gain: 0.14, dur: 0.06, clicks: 4, freq: 3200, rng });
}

function renderImpactSoft(ctx: OfflineAudioContext, rng: Rng, color: NoiseColor, cutoff: number): void {
  // dirt / sand — muffled puff, no sharp transient.
  const { out } = busChain(ctx, 1.3, 0.9);
  blast(ctx, out, 0, { cutoff0: cutoff, cutoff1: cutoff * 0.3, dur: 0.13, gain: 0.4, color, attack: 0.003, rng });
  thump(ctx, out, 0.002, { startFreq: 160, endFreq: 70, dur: 0.05, gain: 0.18 });
}

function renderImpactGlass(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 1.6, 0.9);
  crack(ctx, sat, 0, { gain: 0.5, freq: 6000, decay: 0.003, rng });
  // Shatter: scatter of bright tinkling pings.
  const shards = randInt(rng, 7, 12);
  for (let i = 0; i < shards; i++) {
    const t = randRange(rng, 0, 0.22);
    ping(ctx, out, t, {
      freq: randRange(rng, 2600, 6500),
      dur: randRange(rng, 0.05, 0.16),
      gain: randRange(rng, 0.06, 0.18),
      partials: 2,
      detune: 0.05,
      rng,
    });
  }
}

function renderImpactWater(ctx: OfflineAudioContext, rng: Rng): void {
  const { out } = busChain(ctx, 1.4, 0.9);
  // Plunk: quick descending sine blip.
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(randRange(rng, 700, 1000), 0);
  osc.frequency.exponentialRampToValueAtTime(180, 0.08);
  const g = ctx.createGain();
  g.gain.value = 0;
  setPerc(g.gain, 0, 0.5, 0.001, 0.09);
  osc.connect(g).connect(out);
  osc.start(0);
  osc.stop(0.14);
  // Splash.
  blast(ctx, out, 0.0, { cutoff0: 4000, cutoff1: 900, dur: 0.1, gain: 0.18, color: 'white', rng });
}

function renderImpactFlesh(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 1.8, 0.9, 'fuzz');
  // Wet thud — low body, lowpassed, plus a short slap.
  thump(ctx, sat, 0, { startFreq: randRange(rng, 190, 260), endFreq: 70, dur: 0.09, gain: 0.7 });
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.08, 'brown', rng);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = randRange(rng, 900, 1400);
  const g = ctx.createGain();
  g.gain.value = 0;
  setPerc(g.gain, 0.001, 0.35, 0.001, 0.06);
  src.connect(lp).connect(g).connect(out);
  src.start(0);
  src.stop(0.1);
}

function renderImpactSandbag(ctx: OfflineAudioContext, rng: Rng): void {
  const { out } = busChain(ctx, 1.3, 0.9);
  blast(ctx, out, 0, { cutoff0: 1400, cutoff1: 300, dur: 0.14, gain: 0.42, color: 'brown', attack: 0.002, rng });
  thump(ctx, out, 0.001, { startFreq: 150, endFreq: 65, dur: 0.06, gain: 0.28 });
}

const IMPACTS: SoundDef[] = [
  { id: 'impact_concrete', variants: 3, seconds: 0.2, render: (c, r) => renderImpactConcrete(c, r) },
  { id: 'impact_metal', variants: 3, seconds: 0.35, render: (c, r) => renderImpactMetal(c, r) },
  { id: 'impact_wood', variants: 3, seconds: 0.18, render: (c, r) => renderImpactWood(c, r) },
  { id: 'impact_dirt', variants: 3, seconds: 0.2, render: (c, r) => renderImpactSoft(c, r, 'brown', 1200) },
  { id: 'impact_sand', variants: 3, seconds: 0.2, render: (c, r) => renderImpactSoft(c, r, 'pink', 1700) },
  { id: 'impact_glass', variants: 3, seconds: 0.4, render: (c, r) => renderImpactGlass(c, r) },
  { id: 'impact_water', variants: 3, seconds: 0.2, render: (c, r) => renderImpactWater(c, r) },
  { id: 'impact_flesh', variants: 3, seconds: 0.2, render: (c, r) => renderImpactFlesh(c, r) },
  { id: 'impact_sandbag', variants: 3, seconds: 0.22, render: (c, r) => renderImpactSandbag(c, r) },
];

// ---------------------------------------------------------------------------
// Whizz-by & ricochet
// ---------------------------------------------------------------------------

function renderWhizzby(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 1.6, 0.9);
  // Sharp snap.
  crack(ctx, sat, 0, { gain: 0.6, freq: randRange(rng, 4000, 5200), decay: 0.003, rng });
  // Doppler pass: bandpassed noise sweeping up then down quickly.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.16, 'white', rng);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  const peak = randRange(rng, 2600, 3600);
  bp.frequency.setValueAtTime(peak * 0.6, 0);
  bp.frequency.linearRampToValueAtTime(peak, 0.04);
  bp.frequency.exponentialRampToValueAtTime(peak * 0.4, 0.15);
  bp.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.value = 0;
  setPerc(g.gain, 0, 0.45, 0.02, 0.13);
  src.connect(bp).connect(g).connect(out);
  src.start(0);
  src.stop(0.18);
}

function renderRicochet(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 1.5, 0.9);
  crack(ctx, sat, 0, { gain: 0.4, freq: 5200, decay: 0.003, rng });
  // Classic descending whine with vibrato.
  const dur = randRange(rng, 0.28, 0.5);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const f0 = randRange(rng, 2400, 3400);
  osc.frequency.setValueAtTime(f0, 0.004);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.28, 0.004 + dur);
  const vib = ctx.createOscillator();
  vib.type = 'sine';
  vib.frequency.value = randRange(rng, 30, 55);
  const vibGain = ctx.createGain();
  vibGain.gain.value = f0 * 0.03;
  vib.connect(vibGain).connect(osc.frequency);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200;
  bp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.value = 0;
  setPerc(g.gain, 0.004, 0.4, 0.006, dur);
  osc.connect(bp).connect(g).connect(out);
  osc.start(0.004);
  osc.stop(0.01 + dur);
  vib.start(0.004);
  vib.stop(0.01 + dur);
}

// ---------------------------------------------------------------------------
// Explosions & flashbang
// ---------------------------------------------------------------------------

function renderExplosion(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 2.4, 0.92, 'fuzz');
  // Initial crack.
  crack(ctx, sat, 0, { gain: 0.7, freq: 2600, decay: 0.006, rng });
  // Sub-bass boom.
  thump(ctx, sat, 0.002, { startFreq: randRange(rng, 62, 78), endFreq: 26, dur: randRange(rng, 1.0, 1.4), gain: 1.1 });
  thump(ctx, sat, 0.01, { startFreq: 110, endFreq: 40, dur: 0.5, gain: 0.7, type: 'triangle' });
  // Body — saturated noise burst with lowpass sweep.
  blast(ctx, sat, 0.0, { cutoff0: 2600, cutoff1: 130, dur: randRange(rng, 0.7, 0.95), gain: 0.9, color: 'brown', rng });
  blast(ctx, sat, 0.0, { cutoff0: 6000, cutoff1: 800, dur: 0.2, gain: 0.55, color: 'white', rng });
  // Debris / shrapnel scatter.
  const debris = randInt(rng, 8, 14);
  for (let i = 0; i < debris; i++) {
    const t = randRange(rng, 0.05, 0.7);
    ping(ctx, out, t, {
      freq: randRange(rng, 900, 3800),
      dur: randRange(rng, 0.04, 0.12),
      gain: randRange(rng, 0.03, 0.1),
      partials: 2,
      detune: 0.05,
      rng,
    });
  }
  // Long low rumble tail.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 1.3, 'brown', rng);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, 0.1);
  lp.frequency.exponentialRampToValueAtTime(90, 1.3);
  const g = ctx.createGain();
  g.gain.value = 0;
  setAHR(g.gain, 0.06, 0.4, 0.08, 0.2, 1.0);
  src.connect(lp).connect(g).connect(out);
  src.start(0.06);
  src.stop(1.4);
}

function renderFlashbang(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 2.0, 0.92);
  crack(ctx, sat, 0, { gain: 0.9, freq: 3000, decay: 0.008, rng });
  thump(ctx, sat, 0.001, { startFreq: 90, endFreq: 40, dur: 0.35, gain: 0.7 });
  // Piercing high whine.
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(4200, 0.005);
  osc.frequency.linearRampToValueAtTime(5200, 0.4);
  const g = ctx.createGain();
  g.gain.value = 0;
  setAHR(g.gain, 0.005, 0.25, 0.02, 0.1, 0.6);
  osc.connect(g).connect(out);
  osc.start(0.005);
  osc.stop(0.75);
}

// ---------------------------------------------------------------------------
// Airstrike
// ---------------------------------------------------------------------------

function renderJet(ctx: OfflineAudioContext, rng: Rng): void {
  const { out } = busChain(ctx, 1.4, 0.85);
  const dur = 3.0;
  // Turbine roar: brown noise through a moving bandpass (doppler pass).
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + 0.1, 'brown', rng, 2);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(300, 0);
  bp.frequency.linearRampToValueAtTime(820, dur * 0.5);
  bp.frequency.exponentialRampToValueAtTime(190, dur);
  bp.Q.value = 2.2;
  const g = ctx.createGain();
  g.gain.value = 0;
  setAHR(g.gain, 0, 0.5, dur * 0.45, 0.05, dur * 0.5);
  src.connect(bp).connect(g).connect(out);
  src.start(0);
  src.stop(dur + 0.1);
  // Harmonic whine of the engine.
  for (const ratio of [1, 1.5, 2.02]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120 * ratio, 0);
    osc.frequency.linearRampToValueAtTime(210 * ratio, dur * 0.5);
    osc.frequency.exponentialRampToValueAtTime(70 * ratio, dur);
    const og = ctx.createGain();
    og.gain.value = 0;
    setAHR(og.gain, 0, 0.06 / ratio, dur * 0.45, 0.02, dur * 0.5);
    osc.connect(og).connect(out);
    osc.start(0);
    osc.stop(dur + 0.05);
  }
}

function renderWhistle(ctx: OfflineAudioContext, rng: Rng): void {
  const { out } = busChain(ctx, 1.3, 0.85);
  const dur = 1.4;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2000, 0);
  osc.frequency.exponentialRampToValueAtTime(320, dur);
  const g = ctx.createGain();
  g.gain.value = 0;
  setAHR(g.gain, 0, 0.35, 0.15, 0.4, dur - 0.55);
  osc.connect(g).connect(out);
  osc.start(0);
  osc.stop(dur + 0.05);
  // Airy noise following the pitch.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + 0.05, 'white', rng);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(2200, 0);
  bp.frequency.exponentialRampToValueAtTime(400, dur);
  bp.Q.value = 4;
  const ng = ctx.createGain();
  ng.gain.value = 0;
  setAHR(ng.gain, 0, 0.12, 0.15, 0.4, dur - 0.55);
  src.connect(bp).connect(ng).connect(out);
  src.start(0);
  src.stop(dur + 0.05);
}

function renderRumble(ctx: OfflineAudioContext, rng: Rng): void {
  const { out } = busChain(ctx, 1.5, 0.85, 'fuzz');
  const dur = 2.6;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + 0.1, 'brown', rng, 2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 110;
  const g = ctx.createGain();
  g.gain.value = 0;
  setAHR(g.gain, 0, 0.55, 0.6, 0.4, dur - 1.0);
  src.connect(lp).connect(g).connect(out);
  src.start(0);
  src.stop(dur + 0.1);
}

// ---------------------------------------------------------------------------
// Footsteps
// ---------------------------------------------------------------------------

interface StepProfile {
  color: NoiseColor;
  cutoff: number;
  q: number;
  dur: number;
  gain: number;
  transient: number;
  crunch: number;
  bodyFreq: number;
}

const STEP_SURFACES: Record<string, StepProfile> = {
  concrete: { color: 'white', cutoff: 2600, q: 1.2, dur: 0.06, gain: 0.5, transient: 0.35, crunch: 0, bodyFreq: 240 },
  sand: { color: 'brown', cutoff: 900, q: 0.7, dur: 0.09, gain: 0.4, transient: 0, crunch: 0, bodyFreq: 130 },
  gravel: { color: 'white', cutoff: 3200, q: 1.0, dur: 0.08, gain: 0.42, transient: 0.15, crunch: 0.5, bodyFreq: 200 },
  metal: { color: 'white', cutoff: 3800, q: 2.5, dur: 0.1, gain: 0.42, transient: 0.4, crunch: 0.2, bodyFreq: 420 },
  wood: { color: 'pink', cutoff: 1400, q: 1.5, dur: 0.07, gain: 0.46, transient: 0.2, crunch: 0, bodyFreq: 190 },
  water: { color: 'white', cutoff: 2000, q: 0.8, dur: 0.11, gain: 0.4, transient: 0.1, crunch: 0.3, bodyFreq: 160 },
  grass: { color: 'pink', cutoff: 3400, q: 0.6, dur: 0.08, gain: 0.32, transient: 0, crunch: 0.15, bodyFreq: 150 },
};

function renderFootstep(ctx: OfflineAudioContext, rng: Rng, p: StepProfile, variant: number): void {
  const { out, sat } = busChain(ctx, 1.4, 0.9);
  // Subtle left/right asymmetry by nudging pitch/timing on odd variants.
  const side = variant % 2 === 0 ? 1 : 1.06;
  if (p.transient > 0) crack(ctx, sat, 0, { gain: p.transient, freq: randRange(rng, 2600, 3600), decay: 0.003, rng });
  thump(ctx, sat, 0.001, { startFreq: p.bodyFreq * side, endFreq: p.bodyFreq * 0.45, dur: p.dur, gain: 0.35, type: 'triangle' });
  blast(ctx, out, 0.0, {
    cutoff0: p.cutoff * side,
    cutoff1: p.cutoff * 0.3,
    dur: p.dur * randRange(rng, 0.9, 1.2),
    gain: p.gain,
    color: p.color,
    attack: 0.002,
    rng,
  });
  if (p.crunch > 0) clatter(ctx, out, 0.0, { gain: p.crunch * 0.3, dur: p.dur, clicks: randInt(rng, 3, 6), freq: p.cutoff, rng });
}

// ---------------------------------------------------------------------------
// Player body / vox
// ---------------------------------------------------------------------------

function renderJump(ctx: OfflineAudioContext, rng: Rng): void {
  const { out } = busChain(ctx, 1.3, 0.85);
  fabricSwish(ctx, out, 0, 0.18, 0.2, rng);
  // Short effort exhale.
  breathBurst(ctx, out, 0.0, 0.16, 0.16, 900, false, rng);
}

function renderLand(ctx: OfflineAudioContext, rng: Rng, heavy: boolean): void {
  const { out, sat } = busChain(ctx, 1.6, 0.9);
  const g = heavy ? 1 : 0.55;
  thump(ctx, sat, 0, { startFreq: heavy ? 130 : 170, endFreq: 55, dur: heavy ? 0.14 : 0.08, gain: 0.8 * g });
  blast(ctx, out, 0.001, { cutoff0: heavy ? 1600 : 2200, cutoff1: 300, dur: 0.1, gain: 0.4 * g, color: 'brown', attack: 0.002, rng });
  fabricSwish(ctx, out, 0.01, 0.16, 0.14 * g, rng);
  if (heavy) breathBurst(ctx, out, 0.02, 0.2, 0.14, 700, false, rng);
}

function breathBurst(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  t: number,
  dur: number,
  gain: number,
  cutoff: number,
  inhale: boolean,
  rng: Rng
): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + 0.02, 'pink', rng);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(inhale ? cutoff * 0.6 : cutoff, t);
  bp.frequency.linearRampToValueAtTime(inhale ? cutoff : cutoff * 0.5, t + dur);
  bp.Q.value = 1.1;
  const g = ctx.createGain();
  g.gain.value = 0;
  setAHR(g.gain, t, gain, dur * (inhale ? 0.6 : 0.3), 0.02, dur * (inhale ? 0.4 : 0.7));
  src.connect(bp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function renderBreathing(ctx: OfflineAudioContext, rng: Rng, style: 'calm' | 'heavy' | 'exhausted'): void {
  const { out } = busChain(ctx, 1.2, 0.85);
  const dur = ctx.length / ctx.sampleRate;
  const inhaleT = dur * 0.1;
  const exhaleT = dur * 0.55;
  const g = style === 'calm' ? 0.14 : style === 'heavy' ? 0.26 : 0.34;
  const cut = style === 'calm' ? 800 : style === 'heavy' ? 1100 : 1300;
  breathBurst(ctx, out, inhaleT, dur * 0.4, g, cut, true, rng);
  breathBurst(ctx, out, exhaleT, dur * 0.42, g * 0.9, cut * 0.8, false, rng);
  if (style === 'exhausted') {
    // Raspy tonal edge.
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = randRange(rng, 90, 130);
    const og = ctx.createGain();
    og.gain.value = 0;
    setAHR(og.gain, exhaleT, 0.05, 0.05, 0.1, dur * 0.3);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    osc.connect(lp).connect(og).connect(out);
    osc.start(inhaleT);
    osc.stop(dur);
  }
}

function renderPain(ctx: OfflineAudioContext, rng: Rng): void {
  const { out } = busChain(ctx, 1.6, 0.85, 'fuzz');
  const dur = randRange(rng, 0.22, 0.38);
  const base = randRange(rng, 130, 220);
  // Two formant-ish oscillators + noise for a grunt.
  for (const [ratio, gain] of [[1, 0.4], [2.4, 0.16], [3.8, 0.08]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * ratio * randRange(rng, 0.98, 1.02), 0);
    osc.frequency.exponentialRampToValueAtTime(base * ratio * 0.7, dur);
    const g = ctx.createGain();
    g.gain.value = 0;
    setAHR(g.gain, 0, gain, 0.02, dur * 0.3, dur * 0.6);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = base * ratio * 2;
    bp.Q.value = 1.5;
    osc.connect(bp).connect(g).connect(out);
    osc.start(0);
    osc.stop(dur + 0.05);
  }
  breathBurst(ctx, out, 0.0, dur * 0.8, 0.12, 1000, false, rng);
}

function renderHeartbeat(ctx: OfflineAudioContext, rng: Rng): void {
  const { out, sat } = busChain(ctx, 1.6, 0.9);
  const dur = ctx.length / ctx.sampleRate;
  // lub-dub near the start of the loop.
  thump(ctx, sat, dur * 0.02, { startFreq: 90, endFreq: 42, dur: 0.14, gain: 0.7 });
  thump(ctx, sat, dur * 0.18, { startFreq: 80, endFreq: 38, dur: 0.16, gain: 0.55 });
  void rng;
}

function renderCloth(ctx: OfflineAudioContext, rng: Rng): void {
  const { out } = busChain(ctx, 1.2, 0.85);
  fabricSwish(ctx, out, 0, randRange(rng, 0.12, 0.22), 0.2, rng);
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function uiTick(ctx: OfflineAudioContext, dest: AudioNode, t: number, freq: number, gain: number, dur: number, rng: Rng): void {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = 0;
  setPerc(g.gain, t, gain, 0.0006, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq * 1.5;
  bp.Q.value = 1.5;
  osc.connect(bp).connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  void rng;
}

function uiTone(ctx: OfflineAudioContext, dest: AudioNode, t: number, freq: number, gain: number, dur: number, type: OscillatorType = 'sine'): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = 0;
  setPerc(g.gain, t, gain, 0.004, dur);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const UI: SoundDef[] = [
  {
    id: 'ui_hitmarker', variants: 2, seconds: 0.06,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.3, 0.85);
      uiTick(ctx, out, 0, 3200, 0.5, 0.03, rng);
    },
  },
  {
    id: 'ui_hitmarker_head', variants: 1, seconds: 0.12,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.3, 0.85);
      uiTick(ctx, out, 0, 3600, 0.5, 0.03, rng);
      uiTick(ctx, out, 0.035, 4600, 0.45, 0.035, rng);
    },
  },
  {
    id: 'ui_kill', variants: 1, seconds: 0.28,
    render: (ctx) => {
      const { out } = busChain(ctx, 1.3, 0.85);
      uiTone(ctx, out, 0, 620, 0.3, 0.1, 'triangle');
      uiTone(ctx, out, 0.08, 930, 0.32, 0.16, 'triangle');
    },
  },
  {
    id: 'ui_killstreak', variants: 1, seconds: 0.8,
    render: (ctx) => {
      const { out } = busChain(ctx, 1.4, 0.85);
      // Rising heroic stinger.
      uiTone(ctx, out, 0, 330, 0.22, 0.3, 'sawtooth');
      uiTone(ctx, out, 0.12, 440, 0.24, 0.35, 'sawtooth');
      uiTone(ctx, out, 0.26, 660, 0.26, 0.5, 'sawtooth');
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = 110;
      const g = ctx.createGain();
      g.gain.value = 0;
      setAHR(g.gain, 0, 0.4, 0.02, 0.3, 0.4);
      sub.connect(g).connect(out);
      sub.start(0);
      sub.stop(0.8);
    },
  },
  {
    id: 'ui_notify', variants: 1, seconds: 0.2,
    render: (ctx) => {
      const { out } = busChain(ctx, 1.2, 0.85);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, 0);
      osc.frequency.linearRampToValueAtTime(990, 0.08);
      const g = ctx.createGain();
      g.gain.value = 0;
      setPerc(g.gain, 0, 0.28, 0.005, 0.14);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(0.2);
    },
  },
  {
    id: 'ui_hover', variants: 1, seconds: 0.05,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.1, 0.75);
      uiTick(ctx, out, 0, 2200, 0.22, 0.02, rng);
    },
  },
  {
    id: 'ui_click', variants: 1, seconds: 0.08,
    render: (ctx, rng) => {
      const { out } = busChain(ctx, 1.2, 0.8);
      uiTick(ctx, out, 0, 1500, 0.4, 0.03, rng);
      uiTone(ctx, out, 0.006, 900, 0.14, 0.04, 'square');
    },
  },
  {
    id: 'ui_objective', variants: 1, seconds: 0.5,
    render: (ctx) => {
      const { out } = busChain(ctx, 1.2, 0.85);
      uiTone(ctx, out, 0, 1320, 0.24, 0.12, 'sine');
      uiTone(ctx, out, 0.12, 1760, 0.2, 0.3, 'sine');
    },
  },
  {
    id: 'ui_danger', variants: 1, seconds: 0.6,
    render: (ctx) => {
      const { out } = busChain(ctx, 1.4, 0.85);
      // Low pulsing two-tone warning.
      for (let i = 0; i < 2; i++) {
        uiTone(ctx, out, i * 0.28, 320, 0.3, 0.16, 'sawtooth');
        uiTone(ctx, out, i * 0.28 + 0.03, 240, 0.24, 0.18, 'sawtooth');
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Ambience & music
// ---------------------------------------------------------------------------

function slowLfoFilter(
  ctx: OfflineAudioContext,
  filter: BiquadFilterNode,
  base: number,
  depth: number,
  rate: number
): void {
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = rate;
  const d = ctx.createGain();
  d.gain.value = depth;
  filter.frequency.value = base;
  lfo.connect(d).connect(filter.frequency);
  lfo.start(0);
  lfo.stop(ctx.length / ctx.sampleRate);
}

function renderAmbience(ctx: OfflineAudioContext, rng: Rng): void {
  const dur = ctx.length / ctx.sampleRate;
  const out = ctx.createGain();
  out.gain.value = 0.85;
  out.connect(ctx.destination);
  // Wind bed: brown noise through an LFO-swept lowpass.
  const wind = ctx.createBufferSource();
  wind.buffer = noiseBuffer(ctx, dur + 0.5, 'brown', rng, 2);
  wind.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  slowLfoFilter(ctx, lp, 520, 260, 0.06);
  const wg = ctx.createGain();
  wg.gain.value = 0.5;
  wind.connect(lp).connect(wg).connect(out);
  wind.start(0);
  wind.stop(dur + 0.1);
  // Faint high hiss.
  const hiss = ctx.createBufferSource();
  hiss.buffer = noiseBuffer(ctx, dur + 0.5, 'pink', rng, 2);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 4000;
  const hg = ctx.createGain();
  hg.gain.value = 0.04;
  hiss.connect(hp).connect(hg).connect(out);
  hiss.start(0);
  hiss.stop(dur + 0.1);
  // Distant sporadic gunfire — heavily lowpassed & quiet.
  const shots = randInt(rng, 6, 10);
  for (let i = 0; i < shots; i++) {
    const t = randRange(rng, 0.2, dur - 0.4);
    blast(ctx, out, t, { cutoff0: 700, cutoff1: 180, dur: randRange(rng, 0.1, 0.22), gain: randRange(rng, 0.05, 0.1), color: 'pink', rng });
  }
  // A couple of distant explosions.
  const booms = randInt(rng, 1, 2);
  for (let i = 0; i < booms; i++) {
    const t = randRange(rng, 0.5, dur - 1.0);
    thump(ctx, out, t, { startFreq: 70, endFreq: 30, dur: 0.7, gain: 0.14 });
  }
}

function renderMusic(ctx: OfflineAudioContext, rng: Rng, combat: boolean): void {
  const dur = ctx.length / ctx.sampleRate;
  const out = ctx.createGain();
  out.gain.value = 0.85;
  out.connect(ctx.destination);
  const root = 55; // A1
  const voices: Array<[number, OscillatorType, number]> = combat
    ? [
        [root, 'sawtooth', 0.18],
        [root * 1.5, 'sawtooth', 0.12],
        [root * 2, 'triangle', 0.1],
        [root * 3, 'sawtooth', 0.06],
      ]
    : [
        [root, 'triangle', 0.16],
        [root * 1.5, 'triangle', 0.1],
        [root * 2, 'sine', 0.08],
      ];
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  slowLfoFilter(ctx, lp, combat ? 700 : 380, combat ? 400 : 180, combat ? 0.14 : 0.06);
  lp.connect(out);
  for (const [freq, type, gain] of voices) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * randRange(rng, 0.996, 1.004);
    const g = ctx.createGain();
    // Slow swell so the loop breathes.
    setAHR(g.gain, 0, gain, dur * 0.4, 0.0, dur * 0.6);
    osc.connect(g).connect(lp);
    osc.start(0);
    osc.stop(dur + 0.1);
  }
  if (combat) {
    // Tense rhythmic pulse.
    const pulseHz = 2;
    const pulses = Math.floor(dur * pulseHz);
    for (let i = 0; i < pulses; i++) {
      thump(ctx, out, i / pulseHz, { startFreq: root * 2, endFreq: root, dur: 0.16, gain: 0.12, type: 'triangle' });
    }
  }
}

// ---------------------------------------------------------------------------
// Bank assembly
// ---------------------------------------------------------------------------

function buildDefs(): SoundDef[] {
  const defs: SoundDef[] = [];

  for (const [name, profile] of Object.entries(WEAPONS)) {
    defs.push({
      id: `weapon_${name}`,
      variants: 4,
      seconds: profile.thumpDur + profile.blastDur + 0.5,
      render: (ctx, rng) => renderWeapon(ctx, rng, profile),
    });
  }

  defs.push(...MECHANICS);
  defs.push(...IMPACTS);

  defs.push({ id: 'whizzby', variants: 4, seconds: 0.24, render: (c, r) => renderWhizzby(c, r) });
  defs.push({ id: 'ricochet', variants: 4, seconds: 0.6, render: (c, r) => renderRicochet(c, r) });

  defs.push({ id: 'explosion', variants: 3, seconds: 1.6, render: (c, r) => renderExplosion(c, r) });
  defs.push({ id: 'flashbang', variants: 2, seconds: 0.9, render: (c, r) => renderFlashbang(c, r) });

  defs.push({ id: 'airstrike_jet', variants: 1, seconds: 3.2, channels: 2, render: (c, r) => renderJet(c, r) });
  defs.push({ id: 'airstrike_whistle', variants: 1, seconds: 1.5, render: (c, r) => renderWhistle(c, r) });
  defs.push({ id: 'airstrike_rumble', variants: 1, seconds: 2.8, channels: 2, render: (c, r) => renderRumble(c, r) });

  for (const [name, profile] of Object.entries(STEP_SURFACES)) {
    defs.push({
      id: `footstep_${name}`,
      variants: 4,
      seconds: 0.24,
      render: (ctx, rng, v) => renderFootstep(ctx, rng, profile, v),
    });
  }

  defs.push({ id: 'jump', variants: 2, seconds: 0.3, render: (c, r) => renderJump(c, r) });
  defs.push({ id: 'land_soft', variants: 2, seconds: 0.3, render: (c, r) => renderLand(c, r, false) });
  defs.push({ id: 'land_hard', variants: 2, seconds: 0.35, render: (c, r) => renderLand(c, r, true) });
  defs.push({ id: 'cloth', variants: 3, seconds: 0.28, render: (c, r) => renderCloth(c, r) });

  defs.push({ id: 'breath_calm', variants: 1, seconds: 4.0, loop: true, loopFade: 0.4, render: (c, r) => renderBreathing(c, r, 'calm') });
  defs.push({ id: 'breath_heavy', variants: 1, seconds: 2.4, loop: true, loopFade: 0.3, render: (c, r) => renderBreathing(c, r, 'heavy') });
  defs.push({ id: 'breath_exhausted', variants: 1, seconds: 1.9, loop: true, loopFade: 0.25, render: (c, r) => renderBreathing(c, r, 'exhausted') });
  defs.push({ id: 'pain', variants: 3, seconds: 0.45, render: (c, r) => renderPain(c, r) });
  defs.push({ id: 'heartbeat', variants: 1, seconds: 0.85, loop: true, loopFade: 0.1, render: (c, r) => renderHeartbeat(c, r) });

  defs.push(...UI);

  defs.push({ id: 'ambience', variants: 1, seconds: 9.0, channels: 2, loop: true, loopFade: 1.0, normalizeTo: 0.5, render: (c, r) => renderAmbience(c, r) });
  defs.push({ id: 'music_calm', variants: 1, seconds: 12.0, channels: 2, loop: true, loopFade: 2.0, normalizeTo: 0.5, render: (c, r) => renderMusic(c, r, false) });
  defs.push({ id: 'music_combat', variants: 1, seconds: 12.0, channels: 2, loop: true, loopFade: 2.0, normalizeTo: 0.55, render: (c, r) => renderMusic(c, r, true) });

  return defs;
}

/** All family ids that will exist in a fully-built bank. */
export function bankSoundIds(): string[] {
  return buildDefs().map((d) => d.id);
}

function silentBuffer(sr: number, channels: number, len: number): AudioBuffer {
  return new AudioBuffer({ length: Math.max(1, len), sampleRate: sr, numberOfChannels: channels });
}

async function renderOne(def: SoundDef, variant: number, opts: BankBuildOptions): Promise<AudioBuffer> {
  const channels = def.channels ?? 1;
  const len = Math.max(1, Math.ceil(def.seconds * opts.sampleRate));
  const timeoutMs = opts.timeoutMs ?? 6000;
  let ctx: OfflineAudioContext;
  try {
    ctx = new opts.OfflineCtor(channels, len, opts.sampleRate);
  } catch {
    return silentBuffer(opts.sampleRate, channels, len);
  }
  const seed = (hashStr(def.id) + variant * 0x9e3779b1) >>> 0;
  const rng = mulberry32(seed || 1);
  try {
    def.render(ctx, rng, variant);
  } catch {
    return silentBuffer(opts.sampleRate, channels, len);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AudioBuffer>((resolve) => {
    timer = setTimeout(() => resolve(silentBuffer(opts.sampleRate, channels, len)), timeoutMs);
  });
  let buffer: AudioBuffer;
  try {
    buffer = await Promise.race([ctx.startRendering(), timeout]);
  } catch {
    buffer = silentBuffer(opts.sampleRate, channels, len);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (def.loop) equalPowerLoopFade(buffer, def.loopFade ?? 0.25);
  if (def.normalizeTo) normalize(buffer, def.normalizeTo);
  return buffer;
}

/**
 * Build the whole bank offline. Renders are chunked to bound peak memory while
 * still awaiting each chunk's `startRendering()` promises together.
 */
export async function buildSoundBank(opts: BankBuildOptions): Promise<BankBuildResult> {
  const t0 =
    typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  const defs = buildDefs();
  const bank = new Map<string, AudioBuffer[]>();
  const concurrency = Math.max(1, opts.concurrency ?? 24);

  const jobs: Array<{ def: SoundDef; variant: number }> = [];
  for (const def of defs) {
    for (let v = 0; v < def.variants; v++) jobs.push({ def, variant: v });
    bank.set(def.id, new Array(def.variants));
  }

  for (let i = 0; i < jobs.length; i += concurrency) {
    const slice = jobs.slice(i, i + concurrency);
    const rendered = await Promise.all(slice.map((j) => renderOne(j.def, j.variant, opts)));
    for (let k = 0; k < slice.length; k++) {
      bank.get(slice[k].def.id)![slice[k].variant] = rendered[k];
    }
  }

  let totalSamples = 0;
  const silent: string[] = [];
  for (const [id, variants] of bank) {
    for (let v = 0; v < variants.length; v++) {
      const b = variants[v];
      totalSamples += b.length * b.numberOfChannels;
      let peak = 0;
      for (let c = 0; c < b.numberOfChannels; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < d.length; i += 8) {
          const a = Math.abs(d[i]);
          if (a > peak) peak = a;
        }
      }
      if (peak < 1e-5) silent.push(`${id}#${v}`);
    }
  }

  const t1 =
    typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  return {
    bank,
    ids: defs.map((d) => d.id),
    buildMs: t1 - t0,
    variantCount: jobs.length,
    totalSamples,
    totalBytes: totalSamples * 4,
    silent,
  };
}
