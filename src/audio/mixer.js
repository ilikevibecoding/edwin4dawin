/*
 * The mixdown.
 *
 * Binds the synthesized score and sound effects to the film's cue sheet. The
 * entire soundtrack — music, effects and narration — is scheduled up front
 * against absolute AudioContext times, which is what lets the offline renderer
 * produce a mix that lines up with the video frame for frame.
 */

let MODS = null;

export async function loadAudioModules() {
  if (MODS) return MODS;
  const [engine, score, sfx] = await Promise.all([
    import('./engine.js').catch((e) => (console.warn('[audio] engine.js unavailable', e), null)),
    import('./score.js').catch((e) => (console.warn('[audio] score.js unavailable', e), null)),
    import('./sfx.js').catch((e) => (console.warn('[audio] sfx.js unavailable', e), null)),
  ]);
  MODS = { engine, score, sfx, ok: !!(engine && engine.createAudioEngine) };
  return MODS;
}

export function audioAvailable() { return !!(MODS && MODS.ok); }

/** Build the bus graph for a live or offline context. */
export function createMixer(ctx, opts = {}) {
  if (MODS && MODS.ok) {
    const a = MODS.engine.createAudioEngine(ctx, opts);
    a.ctx = a.ctx || ctx;
    return a;
  }
  // Silent fallback so the picture still plays if the score fails to load.
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const bus = () => { const g = ctx.createGain(); g.connect(master); return g; };
  return { ctx, master, music: bus(), sfx: bus(), vo: bus(), duck: () => {}, setMasterGain: () => {} };
}

/**
 * Schedule the whole soundtrack.
 * cues: [{ t, kind: 'cue'|'sfx'|'vo'|'duck'|'stop', ... }]
 */
export function scheduleTrack(audio, cues, t0, narration, opts = {}) {
  const log = [];
  for (const c of cues) {
    const when = t0 + c.t;
    try {
      switch (c.kind) {
        case 'cue':
          if (MODS?.score?.scheduleCue) {
            const d = MODS.score.scheduleCue(audio, c.name, when, c.opts || {});
            log.push({ t: c.t, kind: 'cue', name: c.name, duration: d });
          }
          break;
        case 'stop':
          MODS?.score?.stopCue?.(audio, c.name, when, c.fade ?? 1.2);
          break;
        case 'sfx':
          if (MODS?.sfx?.playSfx) MODS.sfx.playSfx(audio, c.name, when, c.opts || {});
          break;
        case 'vo':
          narration?.schedule(audio, c.id, when, c.opts || {});
          break;
        case 'duck':
          audio.duck?.(when, c.duration ?? 2, c.amount ?? 0.4);
          break;
        default:
          break;
      }
    } catch (e) {
      console.warn('[audio] cue failed', c, e);
    }
  }
  if (opts.verbose) console.table(log);
  return log;
}

/**
 * Automatic ducking: pull the music down under every narration line so the
 * voice sits on top without having to hand-mix each cue.
 */
export function autoDuck(cues, narration, { pre = 0.3, post = 0.5, amount = 0.42 } = {}) {
  const out = [];
  for (const c of cues) {
    if (c.kind !== 'vo') continue;
    const d = narration?.duration(c.id) ?? 0;
    out.push({ t: Math.max(0, c.t - pre), kind: 'duck', duration: d + pre + post, amount });
  }
  return out;
}
