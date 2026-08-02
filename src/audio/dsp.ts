/**
 * Small DSP helpers shared by the score and the sound-effect library.
 * Everything here is generated at runtime - there are no sampled recordings in
 * this project.
 */

export function createNoiseBuffer(ctx: BaseAudioContext, seconds = 2, stereo = true): AudioBuffer {
  const channels = stereo ? 2 : 1;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(channels, length, ctx.sampleRate);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Light low-pass keeps the noise from sounding like pure hiss.
      last = last * 0.55 + white * 0.45;
      data[i] = last;
    }
  }
  return buffer;
}

/** Brown-ish noise, the backbone of engine rumble and atmospheric entry. */
export function createRumbleBuffer(ctx: BaseAudioContext, seconds = 4): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    // Cross-fade the tail into the head so the loop is seamless.
    const fade = Math.min(4096, Math.floor(length / 8));
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      data[i] = data[i] * k + data[length - fade + i] * (1 - k);
    }
  }
  return buffer;
}

/**
 * Procedural impulse response for the convolution reverb: exponentially
 * decaying noise with a slightly darker tail. Two presets - a tight metal room
 * for the corridor and a long, cold hall for space.
 */
export function createImpulseResponse(ctx: BaseAudioContext, seconds: number, decay: number, damp = 0.5): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      const white = Math.random() * 2 - 1;
      lp += (white - lp) * (1 - damp * t);
      data[i] = lp * env;
    }
  }
  return buffer;
}

/** Soft-clip curve used to give synthesised brass some bite. */
export function createSaturationCurve(amount = 6, samples = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

export interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** Apply an ADSR to a gain parameter starting at `t0`. */
export function applyEnvelope(
  param: AudioParam,
  t0: number,
  duration: number,
  peak: number,
  env: Envelope,
): number {
  const a = Math.max(0.001, env.attack);
  const d = Math.max(0.001, env.decay);
  const s = Math.max(0.0001, env.sustain);
  const r = Math.max(0.01, env.release);
  const hold = Math.max(0.001, duration);
  param.cancelScheduledValues(t0);
  param.setValueAtTime(0.0001, t0);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), t0 + a + d);
  param.setValueAtTime(Math.max(0.0002, peak * s), t0 + hold);
  param.exponentialRampToValueAtTime(0.0001, t0 + hold + r);
  return t0 + hold + r;
}

/** Equal-tempered frequency for a MIDI note number. */
export function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Note-name helper, e.g. n('D3'). Used to keep the score readable. */
const NOTE_OFFSETS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

export function note(name: string): number {
  const m = name.match(/^([A-G][#b]?)(-?\d)$/);
  if (!m) throw new Error(`Unrecognised note name: ${name}`);
  const semitone = NOTE_OFFSETS[m[1]];
  const octave = parseInt(m[2], 10);
  return mtof(12 * (octave + 1) + semitone);
}
