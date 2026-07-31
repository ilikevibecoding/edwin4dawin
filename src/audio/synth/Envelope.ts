/**
 * Amplitude envelopes.
 *
 * Every envelope here is a plain function of time in seconds so it can be
 * handed straight to `Signal.envelope`. The exponential shapes matter: a linear
 * decay on a gunshot sounds like a fade, an exponential one sounds like an
 * impact, because that is what physical energy dissipation actually does.
 */

export type Env = (t: number) => number;

/** Exponential decay with a time constant. Reaches -60 dB at about 7 tau. */
export const expDecay =
  (tau: number): Env =>
  (t) =>
    t < 0 ? 0 : Math.exp(-t / Math.max(1e-5, tau));

/**
 * Attack/decay with independently curved segments. `curve` above 1 makes the
 * decay hang before falling; below 1 makes it drop hard then trail.
 */
export function ad(attack: number, decay: number, curve = 1): Env {
  const a = Math.max(1e-5, attack);
  const d = Math.max(1e-5, decay);
  return (t) => {
    if (t < 0) return 0;
    if (t < a) return t / a;
    const x = (t - a) / d;
    if (x >= 1) return 0;
    return Math.pow(1 - x, curve);
  };
}

/** AD with an exponential rather than polynomial tail; the workhorse. */
export function adExp(attack: number, tau: number): Env {
  const a = Math.max(1e-6, attack);
  return (t) => {
    if (t < 0) return 0;
    if (t < a) return t / a;
    return Math.exp(-(t - a) / tau);
  };
}

export function adsr(
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  holdUntil: number,
): Env {
  const a = Math.max(1e-5, attack);
  const d = Math.max(1e-5, decay);
  const r = Math.max(1e-5, release);
  return (t) => {
    if (t < 0) return 0;
    if (t < a) return t / a;
    if (t < a + d) return 1 + (sustain - 1) * ((t - a) / d);
    if (t < holdUntil) return sustain;
    const x = (t - holdUntil) / r;
    return x >= 1 ? 0 : sustain * (1 - x);
  };
}

/** Rectangular window with short raised-cosine edges, to avoid clicks. */
export function gate(start: number, end: number, edge = 0.002): Env {
  return (t) => {
    if (t < start || t > end) return 0;
    const inFade = Math.min(1, (t - start) / edge);
    const outFade = Math.min(1, (end - t) / edge);
    const x = Math.min(inFade, outFade);
    return 0.5 - 0.5 * Math.cos(x * Math.PI);
  };
}

/** Multiply several envelopes together. */
export function combine(...envs: readonly Env[]): Env {
  return (t) => {
    let v = 1;
    for (let i = 0; i < envs.length; i++) v *= envs[i](t);
    return v;
  };
}

/** Sum with weights, for a fast transient riding on a slower body. */
export function layer(...parts: readonly [Env, number][]): Env {
  return (t) => {
    let v = 0;
    for (let i = 0; i < parts.length; i++) v += parts[i][0](t) * parts[i][1];
    return v;
  };
}

/** Delay an envelope so a layer arrives late (the tail of a distant report). */
export function delayed(env: Env, seconds: number): Env {
  return (t) => env(t - seconds);
}

/**
 * The characteristic reverberant swell: silence, then a soft rise, then a long
 * exponential fall. Used for gunshot tails and explosion reverb.
 */
export function swell(rise: number, tau: number): Env {
  const r = Math.max(1e-4, rise);
  return (t) => {
    if (t <= 0) return 0;
    if (t < r) {
      const x = t / r;
      return x * x * Math.exp(-t / tau);
    }
    return Math.exp(-t / tau);
  };
}

/** Linear ramp between two values across `seconds`, then held. */
export function ramp(from: number, to: number, seconds: number): Env {
  const s = Math.max(1e-6, seconds);
  return (t) => (t <= 0 ? from : t >= s ? to : from + (to - from) * (t / s));
}

/** Sine tremolo in 0..1, for helicopter blade slap and fluorescent hum. */
export function tremolo(hz: number, depth: number, phase = 0): Env {
  return (t) => 1 - depth * 0.5 * (1 - Math.cos(2 * Math.PI * hz * t + phase));
}
