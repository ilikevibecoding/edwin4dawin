import { mixPose, applyPose } from './rig.js';

// ---------------------------------------------------------------------------
// Keyframe / procedural animation library.  (owner: fable4)
//
// Clips are sampled into plain pose objects ({bone:[rx,ry,rz], hipsPos}) and
// blended by the AnimationController. Locomotion clips are procedural: the
// stride phase is advanced from the character's ACTUAL horizontal speed, so
// feet plant instead of sliding. Static states are keyframed poses with
// procedural sine/spring layers (breathing, scan, tremble) on top.
//
// Rotation conventions (see rig.js): limbs point down -Y; negative X rotation
// swings a limb forward (toward -Z), positive shin X bends the knee back,
// negative forearm X curls the hand up.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ poses --

/** Relaxed unarmed stance. Every other pose is written as a delta over this. */
const BASE = {
  hips: [0, 0, 0], hipsPos: [0, 0, 0],
  spine: [0.03, 0, 0], chest: [0.02, 0, 0], neck: [-0.04, 0, 0], head: [0, 0, 0],
  clavicleL: [0, 0, 0], clavicleR: [0, 0, 0],
  upperArmL: [0.08, 0, 0.10], upperArmR: [0.08, 0, -0.10],
  forearmL: [-0.16, 0, 0], forearmR: [-0.16, 0, 0],
  handL: [0, 0, 0], handR: [0, 0, 0],
  thighL: [-0.02, 0, 0.02], thighR: [-0.02, 0, -0.02],
  shinL: [0.05, 0, 0], shinR: [0.05, 0, 0],
  footL: [-0.03, 0, 0], footR: [-0.03, 0, 0],
};

function P(overrides) {
  const out = {};
  for (const k of Object.keys(BASE)) out[k] = BASE[k].slice();
  for (const [k, v] of Object.entries(overrides)) out[k] = v.slice();
  return out;
}

export const POSES = {
  idle: P({}),

  /** Two-handed weapon carried low across the chest. */
  guard: P({
    chest: [0.05, 0.12, 0],
    upperArmR: [-0.55, 0.10, -0.30], forearmR: [-0.85, 0.25, 0], handR: [0, -0.2, 0],
    upperArmL: [-0.45, -0.15, 0.45], forearmL: [-1.25, 0.55, 0.1], handL: [0, 0.3, 0],
  }),

  /** Weapon shouldered, sights up. */
  aim: P({
    chest: [0.06, 0.30, 0], neck: [-0.05, -0.28, 0],
    clavicleR: [0, 0.1, 0],
    upperArmR: [-1.15, 0.25, -0.55], forearmR: [-0.55, 0.15, 0], handR: [-0.15, -0.15, 0],
    upperArmL: [-1.05, -0.35, 0.55], forearmL: [-0.85, 0.65, 0.15], handL: [0, 0.35, 0],
    spine: [0.05, 0.10, 0],
  }),

  crouch_idle: P({
    hipsPos: [0, -0.34, 0.03],
    spine: [0.22, 0, 0], chest: [0.16, 0.1, 0], neck: [-0.30, 0, 0],
    thighL: [-1.35, 0, 0.12], shinL: [1.85, 0, 0], footL: [-0.55, 0, 0],
    thighR: [-0.85, 0, -0.14], shinR: [1.55, 0, 0], footR: [-0.72, 0, 0],
    upperArmR: [-0.65, 0.1, -0.3], forearmR: [-0.9, 0.25, 0],
    upperArmL: [-0.55, -0.15, 0.45], forearmL: [-1.3, 0.55, 0.1],
  }),

  take_cover: P({
    hipsPos: [0, -0.42, 0.04],
    spine: [0.34, 0.08, 0], chest: [0.22, 0.18, 0], neck: [-0.42, -0.1, 0],
    thighL: [-1.55, 0, 0.14], shinL: [2.0, 0, 0], footL: [-0.5, 0, 0],
    thighR: [-0.95, 0, -0.16], shinR: [1.75, 0, 0], footR: [-0.8, 0, 0],
    upperArmR: [-0.9, 0.15, -0.35], forearmR: [-1.15, 0.3, 0],
    upperArmL: [-0.8, -0.2, 0.5], forearmL: [-1.45, 0.6, 0.1],
  }),

  // ---- deaths (final frames) ---------------------------------------------
  death_forward_end: P({
    hipsPos: [0, -0.90, -0.28], hips: [-1.45, 0, 0.06],
    spine: [-0.15, 0, 0], chest: [-0.1, 0.05, 0], neck: [0.4, 0.2, 0], head: [0.3, 0.3, 0],
    upperArmL: [-1.2, 0, 0.9], upperArmR: [-1.0, 0, -1.1], forearmL: [-0.3, 0, 0], forearmR: [-0.4, 0, 0],
    thighL: [0.25, 0, 0.15], thighR: [0.1, 0, -0.2], shinL: [0.4, 0, 0], shinR: [0.55, 0, 0],
  }),
  death_back_end: P({
    hipsPos: [0, -0.86, 0.30], hips: [1.42, 0, -0.04],
    spine: [0.1, 0, 0], chest: [0.08, -0.06, 0], neck: [0.35, 0, 0], head: [0.25, -0.2, 0],
    upperArmL: [0.5, 0, 1.4], upperArmR: [-0.2, 0, -1.5], forearmL: [-0.3, 0, 0], forearmR: [-0.5, 0, 0],
    thighL: [-0.35, 0, 0.25], thighR: [-0.15, 0, -0.3], shinL: [0.65, 0, 0], shinR: [0.35, 0, 0],
  }),
  death_slump_end: P({
    hipsPos: [0, -0.72, 0.05], hips: [0.15, 0.35, 0.5],
    spine: [0.5, 0.15, 0.15], chest: [0.45, 0.1, 0.1], neck: [0.55, 0.3, 0], head: [0.5, 0.35, 0.15],
    upperArmL: [0.2, 0, 0.75], upperArmR: [0.15, 0, -0.35], forearmL: [-0.2, 0, 0], forearmR: [-0.25, 0, 0],
    thighL: [-1.5, 0.2, 0.35], shinL: [1.35, 0, 0], footL: [-0.4, 0, 0],
    thighR: [-0.5, -0.3, -0.4], shinR: [1.7, 0, 0], footR: [-0.6, 0, 0],
  }),

  // ---- hostages ------------------------------------------------------------
  /** Kneeling, wrists bound behind the back. */
  hostage_idle: P({
    hipsPos: [0, -0.52, 0],
    spine: [0.14, 0, 0], chest: [0.10, 0, 0], neck: [-0.15, 0, 0], head: [-0.12, 0, 0],
    thighL: [-1.5, 0, 0.10], shinL: [2.25, 0, 0], footL: [0.95, 0, 0],
    thighR: [-1.5, 0, -0.10], shinR: [2.25, 0, 0], footR: [0.95, 0, 0],
    upperArmL: [0.45, 0, 0.30], forearmL: [0.95, -0.45, 0], handL: [0, -0.3, 0],
    upperArmR: [0.45, 0, -0.30], forearmR: [0.95, 0.45, 0], handR: [0, 0.3, 0],
  }),
  hostage_stop: P({
    spine: [0.08, 0, 0], neck: [-0.12, 0, 0],
    upperArmL: [-1.0, 0, 0.35], forearmL: [-1.5, 0.2, 0],
    upperArmR: [-1.0, 0, -0.35], forearmR: [-1.5, -0.2, 0],
  }),
  hostage_crouch: P({
    hipsPos: [0, -0.46, 0.02],
    spine: [0.42, 0, 0], chest: [0.3, 0, 0], neck: [-0.5, 0, 0], head: [-0.2, 0, 0],
    thighL: [-1.6, 0, 0.12], shinL: [2.1, 0, 0], footL: [-0.4, 0, 0],
    thighR: [-1.2, 0, -0.14], shinR: [1.9, 0, 0], footR: [-0.6, 0, 0],
    upperArmL: [-1.5, 0, 0.4], forearmL: [-1.4, 0, 0],
    upperArmR: [-1.5, 0, -0.4], forearmR: [-1.4, 0, 0],
  }),
};

// ------------------------------------------------------------------- clips --

/**
 * A clip is {loop, duration, sample(t, ctx, out)} where `t` is clip-local
 * seconds and ctx carries {phase, speed, aiming, crouched, seed, time}.
 */
export const CLIPS = {};

function poseClip(name, pose, { duration = 1, loop = true } = {}) {
  CLIPS[name] = {
    loop, duration,
    sample: (t, ctx, out) => copyPose(pose, out),
  };
}

function timelineClip(name, frames, { loop = false } = {}) {
  const duration = frames[frames.length - 1].t;
  CLIPS[name] = {
    loop, duration,
    sample: (t, ctx, out) => {
      const tt = loop ? t % duration : Math.min(t, duration);
      let i = 0;
      while (i < frames.length - 1 && frames[i + 1].t < tt) i++;
      const a = frames[i];
      const b = frames[Math.min(i + 1, frames.length - 1)];
      const span = Math.max(1e-5, b.t - a.t);
      const k = smooth01(Math.min(1, Math.max(0, (tt - a.t) / span)));
      mixPose(a.pose, b.pose, k, out);
    },
  };
}

function copyPose(src, out) {
  for (const k of Object.keys(src)) {
    if (out[k]) { out[k][0] = src[k][0]; out[k][1] = src[k][1]; out[k][2] = src[k][2]; }
    else out[k] = src[k].slice();
  }
  return out;
}

function smooth01(x) { return x * x * (3 - 2 * x); }

// --- static / keyframed ------------------------------------------------------
poseClip('idle', POSES.idle);
poseClip('guard', POSES.guard);
poseClip('aim', POSES.aim);
poseClip('crouch_idle', POSES.crouch_idle);
poseClip('take_cover', POSES.take_cover);
poseClip('hostage_idle', POSES.hostage_idle);
poseClip('hostage_stop', POSES.hostage_stop);
poseClip('hostage_crouch', POSES.hostage_crouch);

/** breathing is also exposed as a standalone idle clip (subtle chest rise). */
CLIPS.breathing = {
  loop: true, duration: 4,
  sample: (t, ctx, out) => {
    copyPose(POSES.idle, out);
    const b = Math.sin((t / 4) * TAU);
    out.chest[0] += b * 0.015;
    out.clavicleL[0] -= b * 0.01;
    out.clavicleR[0] -= b * 0.01;
  },
};

// --- procedural locomotion ---------------------------------------------------

function makeLocomotion(name, base, { swing, kneeLift, armSwing, bobScale, lean }) {
  CLIPS[name] = {
    loop: true, duration: 1,
    sample: (t, ctx, out) => {
      copyPose(base, out);
      const ph = ctx.phase || 0;
      const s = Math.sin(ph);
      const c = Math.cos(ph);
      // Legs: opposite phase; knee flexes hardest when the leg swings back.
      out.thighL[0] += -s * swing;
      out.thighR[0] += s * swing;
      out.shinL[0] += kneeLift * Math.max(0, -c) + 0.08;
      out.shinR[0] += kneeLift * Math.max(0, c) + 0.08;
      // Ankles compensate so the planted foot stays flat.
      out.footL[0] += s * swing * 0.55 - kneeLift * Math.max(0, -c) * 0.4;
      out.footR[0] += -s * swing * 0.55 - kneeLift * Math.max(0, c) * 0.4;
      // Counter-rotating arm swing only when the arms are free.
      if (!ctx.armsBusy) {
        out.upperArmL[0] += s * armSwing;
        out.upperArmR[0] += -s * armSwing;
      }
      // Pelvis bob (two per cycle) + roll + forward lean with speed.
      out.hipsPos[1] += -Math.abs(c) * 0.028 * bobScale;
      out.hips[2] += s * 0.035;
      out.spine[0] += lean;
      out.chest[1] += s * 0.05;
    },
  };
}

makeLocomotion('walk', POSES.guard, { swing: 0.50, kneeLift: 0.85, armSwing: 0.35, bobScale: 1, lean: 0.03 });
makeLocomotion('run', POSES.guard, { swing: 0.78, kneeLift: 1.25, armSwing: 0.6, bobScale: 1.5, lean: 0.14 });
makeLocomotion('crouch_walk', POSES.crouch_idle, { swing: 0.42, kneeLift: 0.5, armSwing: 0.1, bobScale: 0.7, lean: 0.02 });
makeLocomotion('hostage_follow', POSES.hostage_stop, { swing: 0.5, kneeLift: 0.85, armSwing: 0.15, bobScale: 1, lean: 0.05 });
makeLocomotion('hostage_extract', POSES.hostage_stop, { swing: 0.75, kneeLift: 1.2, armSwing: 0.3, bobScale: 1.4, lean: 0.16 });

// --- turns ---------------------------------------------------------------

function makeTurn(name, dir) {
  CLIPS[name] = {
    loop: false, duration: 0.45,
    sample: (t, ctx, out) => {
      copyPose(POSES.guard, out);
      const k = Math.sin(Math.min(1, t / 0.45) * Math.PI);
      out.hips[1] += dir * 0.22 * k;
      out.chest[1] += -dir * 0.3 * k;
      out.thighL[1] += dir * 0.15 * k;
      out.thighR[1] += dir * 0.15 * k;
      out.hipsPos[1] -= 0.02 * k;
      out.shinL[0] += 0.25 * k * (dir > 0 ? 1 : 0.3);
      out.shinR[0] += 0.25 * k * (dir > 0 ? 0.3 : 1);
    },
  };
}
makeTurn('turn_left', 1);
makeTurn('turn_right', -1);

// --- combat one-shots -----------------------------------------------------

CLIPS.fire = {
  loop: false, duration: 0.16,
  sample: (t, ctx, out) => {
    copyPose(POSES.aim, out);
    const k = Math.exp(-t * 22);
    out.upperArmR[0] += 0.14 * k;
    out.upperArmL[0] += 0.10 * k;
    out.chest[0] += 0.05 * k;
    out.head[0] += 0.03 * k;
  },
};

timelineClip('reload', [
  { t: 0.0, pose: POSES.aim },
  { t: 0.35, pose: P({ // weapon tilts, left hand drops to the mag well
    chest: [0.10, 0.24, 0], neck: [-0.1, -0.2, 0],
    upperArmR: [-0.95, 0.2, -0.5], forearmR: [-0.7, 0.15, 0],
    upperArmL: [-0.55, -0.1, 0.35], forearmL: [-1.1, 0.35, 0.1],
  }) },
  { t: 0.9, pose: P({ // mag out, hand down at the pouch
    chest: [0.12, 0.22, 0], neck: [-0.15, -0.15, 0],
    upperArmR: [-0.9, 0.2, -0.5], forearmR: [-0.65, 0.15, 0],
    upperArmL: [0.15, -0.1, 0.3], forearmL: [-0.55, 0.2, 0],
  }) },
  { t: 1.5, pose: P({ // fresh mag seated
    chest: [0.10, 0.24, 0], neck: [-0.1, -0.2, 0],
    upperArmR: [-0.95, 0.2, -0.5], forearmR: [-0.7, 0.15, 0],
    upperArmL: [-0.6, -0.15, 0.4], forearmL: [-1.2, 0.4, 0.1],
  }) },
  { t: 2.1, pose: POSES.aim },
]);

CLIPS.flinch = {
  loop: false, duration: 0.38,
  sample: (t, ctx, out) => {
    copyPose(POSES.guard, out);
    const k = Math.exp(-t * 9) * Math.cos(t * 26);
    out.chest[0] += 0.22 * k;
    out.chest[2] += 0.12 * k * (ctx.seed % 2 ? 1 : -1);
    out.neck[0] += 0.3 * k;
    out.hipsPos[2] += 0.04 * k;
  },
};

CLIPS.investigate = {
  loop: true, duration: 4.5,
  sample: (t, ctx, out) => {
    copyPose(POSES.guard, out);
    const scan = Math.sin((t / 4.5) * TAU);
    out.head[1] += scan * 0.55;
    out.chest[1] += scan * 0.18;
    out.neck[0] -= 0.06;
  },
};

CLIPS.search = {
  loop: true, duration: 6,
  sample: (t, ctx, out) => {
    copyPose(POSES.aim, out);
    const scan = Math.sin((t / 6) * TAU);
    const tilt = Math.sin((t / 3) * TAU);
    out.head[1] += scan * 0.4;
    out.chest[1] += scan * 0.3;
    out.spine[1] += scan * 0.12;
    out.head[0] += tilt * 0.06;
  },
};

// --- deaths ----------------------------------------------------------------

timelineClip('death_forward', [
  { t: 0, pose: POSES.guard },
  { t: 0.22, pose: P({ hipsPos: [0, -0.15, -0.05], spine: [0.35, 0, 0.1], chest: [0.3, 0, 0], neck: [0.2, 0, 0], thighL: [-0.4, 0, 0.05], shinL: [0.7, 0, 0], thighR: [-0.2, 0, -0.05], shinR: [0.5, 0, 0], upperArmL: [-0.6, 0, 0.5], upperArmR: [-0.5, 0, -0.6] }) },
  { t: 0.55, pose: mixPose(POSES.guard, POSES.death_forward_end, 0.75) },
  { t: 0.85, pose: POSES.death_forward_end },
]);

timelineClip('death_back', [
  { t: 0, pose: POSES.guard },
  { t: 0.18, pose: P({ hipsPos: [0, -0.1, 0.08], spine: [-0.25, 0, 0], chest: [-0.3, 0.1, 0], neck: [-0.3, 0, 0], upperArmL: [-1.4, 0, 0.6], upperArmR: [-1.3, 0, -0.7], thighL: [-0.3, 0, 0.1], thighR: [0.15, 0, -0.1] }) },
  { t: 0.5, pose: mixPose(POSES.guard, POSES.death_back_end, 0.8) },
  { t: 0.8, pose: POSES.death_back_end },
]);

timelineClip('death_slump', [
  { t: 0, pose: POSES.guard },
  { t: 0.3, pose: mixPose(POSES.crouch_idle, POSES.death_slump_end, 0.45) },
  { t: 0.75, pose: mixPose(POSES.crouch_idle, POSES.death_slump_end, 0.85) },
  { t: 1.05, pose: POSES.death_slump_end },
]);

// --- hostage extras ----------------------------------------------------------

CLIPS.hostage_fear = {
  loop: true, duration: 3.2,
  sample: (t, ctx, out) => {
    copyPose(POSES.hostage_idle, out);
    // Trembling + occasionally ducking the head.
    const tremble = Math.sin(t * 31) * 0.015 + Math.sin(t * 47) * 0.008;
    const duck = Math.max(0, Math.sin((t / 3.2) * TAU)) * 0.22;
    out.chest[0] += tremble + duck * 0.4;
    out.head[0] -= duck;
    out.head[2] += tremble * 2;
    out.spine[0] += duck * 0.25;
  },
};

// =========================================================================
// Controller
// =========================================================================

const UPPER_BONES = ['spine', 'chest', 'neck', 'head', 'clavicleL', 'clavicleR',
  'upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'handL', 'handR'];

/**
 * Drives one rig. Owns the stride phase (fed by real speed), the crossfade
 * between clips, an optional upper-body override (aim / fire / reload while
 * the legs keep walking) and additive procedural layers.
 */
export class AnimationController {
  constructor(rig, { strideLength = 0.72, seed = 1 } = {}) {
    this.rig = rig;
    this.strideLength = strideLength;
    this.seed = seed;
    this.time = 0;
    this.phase = 0;

    this.currentName = 'idle';
    this.clipTime = 0;
    this.timeScale = 1;
    this._fadeFrom = null; // snapshot pose
    this._fadeDur = 0;
    this._fadeT = 0;

    this.upperName = null;
    this.upperTime = 0;
    this._upperFade = 0;
    this._upperFadeT = 1;

    /** @type {Array<(time:number, ctx:object, pose:object)=>void>} */
    this.layers = [];
    this.breathe = true;

    this._pose = clonePose(BASE);
    this._scratch = clonePose(BASE);
    this._upperScratch = clonePose(BASE);
    this.finished = false;
  }

  /** Crossfade to a clip. Same-name calls are ignored unless force. */
  play(name, { loop, fade = 0.16, force = false, timeScale = 1 } = {}) {
    if (!CLIPS[name]) return this;
    if (name === this.currentName && !force) return this;
    this._fadeFrom = clonePose(this._pose, this._fadeFrom);
    this._fadeDur = fade;
    this._fadeT = 0;
    this.currentName = name;
    this.clipTime = 0;
    this.timeScale = timeScale;
    this.finished = false;
    if (loop !== undefined) this._loopOverride = loop; else this._loopOverride = null;
    return this;
  }

  /** Layer a clip over the upper body only (fire / reload while moving). */
  playUpper(name, { fade = 0.1 } = {}) {
    if (name === this.upperName) return this;
    this.upperName = name;
    this.upperTime = 0;
    this._upperFade = fade;
    this._upperFadeT = 0;
    return this;
  }

  clearUpper(fade = 0.15) {
    if (!this.upperName) return;
    this._upperClearing = true;
    this._upperFade = fade;
    this._upperFadeT = 0;
  }

  addLayer(fn) {
    this.layers.push(fn);
    return () => { this.layers = this.layers.filter((l) => l !== fn); };
  }

  get isLocomotion() {
    return ['walk', 'run', 'crouch_walk', 'hostage_follow', 'hostage_extract'].includes(this.currentName);
  }

  /**
   * @param {number} dt
   * @param {object} ctx {speed, aiming, crouched, armsBusy}
   */
  update(dt, ctx = {}) {
    this.time += dt;
    const clip = CLIPS[this.currentName] || CLIPS.idle;
    const loop = this._loopOverride != null ? this._loopOverride : clip.loop;
    this.clipTime += dt * this.timeScale;
    if (!loop && this.clipTime >= clip.duration) {
      this.clipTime = clip.duration;
      this.finished = true;
    }

    // Stride phase from real horizontal speed => no foot sliding. When the
    // character stops mid-step, ease the phase to the nearest plant point.
    const speed = ctx.speed || 0;
    if (speed > 0.06) {
      this.phase += (speed / this.strideLength) * Math.PI * dt;
    } else {
      const plant = Math.round(this.phase / Math.PI) * Math.PI;
      this.phase += (plant - this.phase) * Math.min(1, dt * 10);
    }

    const sctx = {
      phase: this.phase, speed,
      aiming: ctx.aiming, crouched: ctx.crouched,
      armsBusy: ctx.armsBusy !== undefined ? ctx.armsBusy : true,
      seed: this.seed, time: this.time,
    };

    // Base sample + crossfade from snapshot.
    const target = this._scratch;
    clip.sample(loop ? this.clipTime % clip.duration : this.clipTime, sctx, target);
    if (this._fadeFrom && this._fadeT < this._fadeDur) {
      this._fadeT += dt;
      const k = smooth01(Math.min(1, this._fadeT / this._fadeDur));
      mixPose(this._fadeFrom, target, k, this._pose);
    } else {
      copyPose(target, this._pose);
    }

    // Upper-body override.
    if (this.upperName) {
      const uc = CLIPS[this.upperName];
      this.upperTime += dt;
      if (uc) {
        const ut = uc.loop ? this.upperTime % uc.duration : Math.min(this.upperTime, uc.duration);
        uc.sample(ut, sctx, this._upperScratch);
        this._upperFadeT = Math.min(1, this._upperFadeT + dt / Math.max(1e-4, this._upperFade));
        let w = smooth01(this._upperFadeT);
        if (this._upperClearing) w = 1 - w;
        for (const b of UPPER_BONES) {
          const dst = this._pose[b];
          const src = this._upperScratch[b];
          if (!dst || !src) continue;
          dst[0] += (src[0] - dst[0]) * w;
          dst[1] += (src[1] - dst[1]) * w;
          dst[2] += (src[2] - dst[2]) * w;
        }
        if (this._upperClearing && this._upperFadeT >= 1) {
          this.upperName = null;
          this._upperClearing = false;
        }
        if (!uc.loop && this.upperTime >= uc.duration + 0.05 && !this._upperClearing) this.clearUpper();
      }
    }

    // Built-in breathing (kept off for corpses).
    if (this.breathe && !this.currentName.startsWith('death')) {
      const b = Math.sin(this.time * 1.6 + this.seed);
      this._pose.chest[0] += b * 0.012;
      this._pose.head[0] -= b * 0.006;
    }

    for (const layer of this.layers) layer(this.time, sctx, this._pose);

    applyPose(this.rig, this._pose, 1);
    return this;
  }
}

function clonePose(src, out) {
  out = out || {};
  for (const k of Object.keys(src)) {
    if (out[k]) { out[k][0] = src[k][0]; out[k][1] = src[k][1]; out[k][2] = src[k][2]; }
    else out[k] = src[k].slice();
  }
  // drop stale keys
  for (const k of Object.keys(out)) if (!src[k]) delete out[k];
  return out;
}

export const ANIMATION_STATES = [
  'idle', 'breathing', 'guard', 'walk', 'run', 'crouch_idle', 'crouch_walk',
  'turn_left', 'turn_right', 'aim', 'fire', 'reload', 'flinch', 'take_cover',
  'investigate', 'search', 'death_forward', 'death_back', 'death_slump',
  'hostage_idle', 'hostage_fear', 'hostage_crouch', 'hostage_follow',
  'hostage_stop', 'hostage_extract',
];
