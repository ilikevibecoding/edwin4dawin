import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { clampToBox, customShot } from '../../camera/CameraDirector';
import { clamp, clamp01, lerp, ramp, smootherstep } from '../../core/math';
import { freshRng } from '../../core/Random';
import type { CharacterRig } from '../../assets/characters/CharacterRig';

export const CORRIDOR_START = 214;
export const CORRIDOR_DURATION = 74;

/** Interior volume the camera is never allowed to leave. */
const CAM_MIN = new THREE.Vector3(-8.6, 0.35, -1.35);
const CAM_MAX = new THREE.Vector3(40, 2.85, 1.35);

const DOOR_X = -10.6;
const BREACH_T = 18;
const FIGHT_START = 21.5;
const FIGHT_END = 47;
const EXCHANGE_INTERVAL = 0.34;
const BOLT_SPEED = 78;

/** Where each defender ends up, and how they hold that spot. */
const DEFENCE = [
  { x: 9.6, z: -1.02, state: 'kneel' as const, fallAt: 41.5 },
  { x: 12.8, z: 1.04, state: 'crouch' as const, fallAt: 35.0 },
  { x: 16.2, z: -1.12, state: 'aim' as const, fallAt: 29.5 },
  { x: 19.4, z: 1.1, state: 'aim' as const, fallAt: 44.5 },
];
const OFFICER_POST = { x: 22.6, z: -0.2, fallAt: 46.0 };
/** Analytic path for the dark lord's walk, shared by the camera and the rig. */
function vaderWalkX(rho: number): number {
  return lerp(DOOR_X + 0.6, 11.5, smootherstep(clamp01((rho - 52.2) / 15.5)));
}

/** Where the defenders are standing when the chapter opens. */
const DEFENCE_START_X = 25.5;
const OFFICER_START_X = 33.5;

/**
 * Trooper advance lanes; they enter in pairs and take alternating sides.
 * `posture` staggers the firing line so it does not read as a chorus row.
 */
const TROOPER_LANES = [
  { z: -1.16, stopX: 1.6, delay: 0.0, posture: 'aim' as const },
  { z: 1.16, stopX: 2.9, delay: 0.45, posture: 'kneel' as const },
  { z: -1.2, stopX: -1.8, delay: 1.3, posture: 'aim' as const },
  { z: 1.2, stopX: -0.6, delay: 1.75, posture: 'aim' as const },
  { z: -1.24, stopX: -4.9, delay: 2.7, posture: 'crouch' as const },
  { z: 1.24, stopX: -3.6, delay: 3.1, posture: 'aim' as const },
];
/**
 * After the fight they hold the walls so the entrance stays uncluttered.
 * `face` is an offset from "down the corridor" so the line is not a mirror of
 * itself, and `watch` decides who keeps a weapon up and who stands down.
 */
const TROOPER_HOLD = [
  { x: 1.1, z: -1.3, face: 0.34, watch: true },
  { x: 2.9, z: 1.34, face: -0.16, watch: false },
  { x: -2.1, z: -1.38, face: 0.12, watch: true },
  { x: -0.7, z: 1.26, face: -0.44, watch: false },
  { x: -5.6, z: -1.24, face: 0.46, watch: false },
  { x: -4.1, z: 1.36, face: -0.12, watch: true },
];

/**
 * Chapter 5 — Corridor defence.
 *
 * Every figure has one objective and one path: the defenders fall back to fixed
 * posts and hold them, the boarding party advances lane by lane, and the dark
 * lord only enters once the corridor has gone quiet. The exchange of fire runs
 * on the same deterministic index scheme as the space battle.
 */
export function corridorChapter(): Chapter<ShowContext> {
  const fired = new Set<number>();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const rng = freshRng('corridor');
  let arcStop: (() => void) | null = null;

  function defenders(ctx: ShowContext): CharacterRig[] {
    return ctx.stage.characters.rebels;
  }

  function troopers(ctx: ShowContext): CharacterRig[] {
    return ctx.stage.characters.troopers;
  }

  function trooperTargetX(index: number, rho: number): number {
    const lane = TROOPER_LANES[index];
    const t0 = FIGHT_START + lane.delay;
    const k = clamp01((rho - t0) / 3.6);
    return lerp(DOOR_X + 1.2, lane.stopX, smootherstep(k));
  }

  function exchange(ctx: ShowContext, index: number, rho: number): void {
    const stage = ctx.stage;
    const r = freshRng(`corridor-shot:${index}`);
    const imperial = index % 2 === 0 || rho > 38;

    if (imperial) {
      const active = troopers(ctx).filter((t) => t.root.visible);
      if (active.length === 0) return;
      const shooter = active[index % active.length] as CharacterRig & {
        muzzlePosition(v: THREE.Vector3): THREE.Vector3;
      };
      const liveDefenders = defenders(ctx).filter((d) => d.root.visible && d.state !== 'fall' && d.state !== 'down');
      const targetChar = liveDefenders.length
        ? liveDefenders[r.int(0, liveDefenders.length - 1)]
        : ctx.stage.characters.officer;
      shooter.recoil(1);
      shooter.muzzlePosition(tmpA);
      targetChar.root.getWorldPosition(tmpB);
      tmpB.y += 1.1;
      const hit = r.next() < 0.16;
      tmpB.add(new THREE.Vector3(r.spread(0.5), r.spread(hit ? 0.2 : 0.9), r.spread(hit ? 0.2 : 0.8)));
      ctx.sfx.blaster({ position: tmpA, imperial: true, gain: 0.3, refDistance: 5, maxDistance: 90 });
      stage.fx.fireBolt({
        from: tmpA.clone(),
        to: tmpB.clone(),
        speed: BOLT_SPEED,
        color: 0xff4a2e,
        length: 1.5,
        width: 0.11,
        onHit: (p) => {
          stage.fx.impact({ point: p, scale: 0.42, color: 0xff8a4a, smoke: r.bool(0.4), debris: false });
          ctx.sfx.impact(0.5, { position: p, gain: 0.26, refDistance: 4, maxDistance: 70 });
          ctx.director.impulse(0.1);
          if (hit) targetChar.react(0.9);
          else if (r.bool(0.5)) targetChar.react(0.35);
        },
      });
    } else {
      const live = defenders(ctx).filter((d) => d.root.visible && d.state !== 'fall' && d.state !== 'down');
      const all = live.concat(ctx.stage.characters.officer.root.visible ? [ctx.stage.characters.officer] : []);
      if (all.length === 0) return;
      const shooter = all[index % all.length] as CharacterRig & {
        muzzlePosition(v: THREE.Vector3): THREE.Vector3;
      };
      const activeTroopers = troopers(ctx).filter((t) => t.root.visible);
      if (activeTroopers.length === 0) return;
      const targetChar = activeTroopers[r.int(0, activeTroopers.length - 1)];
      shooter.recoil(1);
      shooter.muzzlePosition(tmpA);
      targetChar.root.getWorldPosition(tmpB);
      tmpB.y += 1.15;
      const hit = r.next() < 0.2;
      tmpB.add(new THREE.Vector3(r.spread(0.6), r.spread(hit ? 0.2 : 1.0), r.spread(hit ? 0.25 : 0.9)));
      ctx.sfx.blaster({ position: tmpA, gain: 0.3, refDistance: 5, maxDistance: 90 });
      stage.fx.fireBolt({
        from: tmpA.clone(),
        to: tmpB.clone(),
        speed: BOLT_SPEED,
        color: 0x7cff5a,
        length: 1.5,
        width: 0.11,
        onHit: (p) => {
          stage.fx.impact({ point: p, scale: 0.4, color: 0x9dff72, smoke: false, debris: false });
          ctx.sfx.impact(0.45, { position: p, gain: 0.24, refDistance: 4, maxDistance: 70 });
          if (hit) targetChar.react(0.9);
        },
      });
    }
  }

  return {
    id: 'corridor',
    title: 'Corridor Defence',
    synopsis: 'The boarding action: a door burns through, and then a shadow walks in.',
    start: CORRIDOR_START,
    duration: CORRIDOR_DURATION,

    beats: [
      {
        t: 0.1,
        id: 'inside',
        fire(ctx) {
          ctx.stage.setLocation('interior');
          ctx.music.setCue('boarding', true);
          ctx.sfx.stopBed('runner', 0.4);
          ctx.sfx.stopBed('capital', 1.2);
          ctx.sfx.bed('alarm', 'alarm');
          ctx.sfx.setBedLevel('alarm', 0.06, 1.2);
          ctx.sfx.bed('room', 'roomTone');
          ctx.sfx.setBedLevel('room', 0.05, 1.5);
        },
      },
      {
        t: 6.0,
        id: 'cutting',
        fire(ctx) {
          ctx.stage.corridor.blastDoor.getCentre(tmpA);
          arcStop?.();
          arcStop = ctx.sfx.cuttingArc(tmpA, 0.16);
        },
      },
      {
        t: BREACH_T,
        id: 'breach',
        fire(ctx) {
          const stage = ctx.stage;
          arcStop?.();
          arcStop = null;
          stage.corridor.blastDoor.getCentre(tmpA);
          ctx.sfx.doorBreach({ position: tmpA, gain: 0.62 });
          ctx.director.impulse(1.3);
          ctx.render.bloomBoost = 0.55;
          stage.fx.flash({ origin: tmpA, size: 4.6, color: 0xffb070, life: 0.35, light: { intensity: 90, distance: 26 } });
          stage.fx.puffSmoke({
            origin: tmpA,
            count: 34,
            radius: 1.6,
            speed: 5.4,
            size0: 1.1,
            size1: 7.5,
            life: 6.5,
            alpha: 0.5,
            color: 0x8a8d92,
            color1: 0x3a3d42,
            bias: new THREE.Vector3(4.2, 0.4, 0),
          });
          stage.fx.spawnDebris({
            origin: tmpA,
            count: 24,
            speed: 7.5,
            size: 0.22,
            life: 3.2,
            gravity: 7.5,
            bias: new THREE.Vector3(5, 1.2, 0),
          });
          stage.fx.burstSparks({ origin: tmpA, count: 40, speed: 8, color: 0xffc07a, gravity: 9, width: 0.02 });
          for (const d of ctx.stage.characters.rebels) d.react(1.1);
        },
      },
      {
        t: FIGHT_START,
        id: 'boarders',
        fire(ctx) {
          for (const t of ctx.stage.characters.troopers) t.root.visible = true;
        },
      },
      {
        t: FIGHT_END + 1,
        id: 'quiet',
        fire(ctx) {
          ctx.music.setCue('dread');
          ctx.sfx.setBedLevel('alarm', 0.025, 3);
        },
      },
      {
        t: 51.5,
        id: 'vader-arrives',
        fire(ctx) {
          ctx.stage.characters.vader.root.visible = true;
          ctx.sfx.bed('respirator', 'respirator');
          ctx.sfx.setBedLevel('respirator', 0.09, 1.4);
          ctx.render.bloomBoost = 0.2;
        },
      },
    ],

    shots(ctx) {
      const stage = ctx.stage;
      const S = CORRIDOR_START;
      const vader = stage.characters.vader;
      const clampCam = (out: { position: THREE.Vector3; target: THREE.Vector3 }): void => {
        clampToBox(out.position, CAM_MIN, CAM_MAX, 0.22);
      };

      return [
        // 1. Establish the geography before anything happens in it. Held aft of
        //    the pod-bay junction so the branch opening never crowds the frame.
        customShot({ id: 'corridor.establish', start: S, end: S + 8.5, fov: 52, handheld: 0.45, blend: 0 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(28.5, 24.5, a), lerp(2.15, 1.95, a), lerp(-0.55, -0.12, a));
          out.target.set(lerp(8, -7, a), 1.5, 0);
          out.fov = lerp(56, 52, a);
          out.focus = 22;
          clampCam(out);
        }),

        // 2. Defenders' eye level.
        customShot({ id: 'corridor.defenders', start: S + 8.5, end: S + 16, fov: 46, handheld: 0.8, blend: 0.9 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(21.5, 19.4, a), 1.62, lerp(-0.85, -0.62, a));
          out.target.set(lerp(2, -8, a), lerp(1.5, 1.65, a), lerp(-0.2, 0.05, a));
          out.fov = 46;
          out.focus = 14;
          clampCam(out);
        }),

        // 3. The door itself.
        customShot({ id: 'corridor.door', start: S + 16, end: S + 21.5, fov: 44, handheld: 0.75, blend: 0.7 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(-1.4, -3.4, a), lerp(1.55, 1.5, a), lerp(-0.6, -0.28, a));
          out.target.set(DOOR_X, 1.5, 0);
          out.fov = lerp(46, 52, a);
          out.focus = 8;
          clampCam(out);
        }),

        // 4. Low angle as the boarders come through the smoke.
        customShot({ id: 'corridor.entry', start: S + 21.5, end: S + 31, fov: 50, handheld: 1.0, blend: 0.5 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(13.5, 11.2, a), lerp(0.72, 0.8, a), lerp(-1.0, -0.66, a));
          out.target.set(lerp(-2, -5, a), 1.3, -0.1);
          out.fov = 50;
          out.focus = 15;
          clampCam(out);
        }),

        // 5. Over the shoulder of a defender.
        customShot({ id: 'corridor.firefight', start: S + 31, end: S + 45, fov: 48, handheld: 1.1, blend: 0.7 }, (k, t, out) => {
          const a = smootherstep(k);
          const sway = Math.sin((t - S) * 0.6) * 0.12;
          out.position.set(lerp(18.6, 15.2, a), 1.58, lerp(-1.05, -0.5, a) + sway);
          out.target.set(lerp(1, -3.5, a), 1.35, lerp(-0.1, 0.15, a));
          out.fov = 48;
          out.focus = 13;
          clampCam(out);
        }),

        // 6. The corridor goes quiet.
        customShot({ id: 'corridor.aftermath', start: S + 45, end: S + 52, fov: 44, handheld: 0.4, blend: 1.2 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(17.5, 13.5, a), lerp(1.7, 1.62, a), lerp(-0.45, -0.18, a));
          out.target.set(lerp(-3, -8.5, a), 1.5, 0);
          out.fov = lerp(46, 42, a);
          out.focus = 16;
          clampCam(out);
        }),

        // 7. Vader's entrance: low, wide, patient, and far enough down the
        //    corridor that the boarding party frames him instead of blocking him.
        customShot({ id: 'corridor.vader', start: S + 52, end: S + 64, fov: 44, handheld: 0.2, blend: 1.6 }, (k, t, out) => {
          const a = smootherstep(k);
          const vx = vaderWalkX(t - S);
          // Low and retreating: the camera gives ground as he advances, and he
          // grows in frame the whole way.
          out.position.set(vx + lerp(13, 4.6, a), lerp(0.5, 0.78, a), lerp(-0.7, -0.12, a));
          out.target.set(vx + lerp(2.2, 0.4, a), lerp(1.3, 1.6, a), 0);
          out.fov = lerp(46, 40, a);
          out.focus = lerp(13, 4.8, a);
          clampCam(out);
        }),

        // 8. Tracking backwards ahead of him.
        customShot({ id: 'corridor.vaderWalk', start: S + 64, end: S + CORRIDOR_DURATION, fov: 42, handheld: 0.3, blend: 1.2 }, (k, _t, out) => {
          vader.root.updateWorldMatrix(true, false);
          const p = vader.root.position;
          const a = smootherstep(k);
          out.position.set(p.x + lerp(6.2, 4.6, a), lerp(1.5, 1.32, a), lerp(-0.66, -0.16, a));
          out.target.set(p.x + 0.4, 1.45, p.z);
          out.fov = 42;
          out.focus = 5.2;
          clampCam(out);
        }),
      ];
    },

    enter(ctx, localTime, scrubbed) {
      const stage = ctx.stage;
      stage.setLocation('interior');
      ctx.setCard(null);
      ctx.render.fadeColor.setHex(0x000000);
      rng.reset();
      if (scrubbed) {
        fired.clear();
        const done = Math.max(0, Math.floor((localTime - FIGHT_START) / EXCHANGE_INTERVAL) + 1);
        for (let i = 0; i < done; i++) fired.add(i);
        stage.fx.reset();
        arcStop?.();
        arcStop = null;
      }

      // Place the cast for this chapter.
      const rebels = stage.characters.rebels;
      for (let i = 0; i < rebels.length; i++) {
        const r = rebels[i];
        r.root.visible = true;
        r.clearPath();
        r.setHeading(-Math.PI / 2);
      }
      const officer = stage.characters.officer;
      officer.root.visible = true;
      officer.clearPath();
      officer.setHeading(-Math.PI / 2);

      for (const t of stage.characters.troopers) {
        t.root.visible = localTime >= FIGHT_START;
        t.clearPath();
        t.setHeading(Math.PI / 2);
      }
      stage.characters.vader.root.visible = localTime >= 51.5;
      stage.characters.vader.setHeading(Math.PI / 2);
      stage.characters.leia.root.visible = false;
      stage.characters.r2.root.visible = false;
      stage.characters.threepio.root.visible = false;
      stage.dataProjection.setVisible(0);

      ctx.music.setCue(localTime > FIGHT_END + 1 ? 'dread' : 'boarding', scrubbed);
      ctx.sfx.bed('alarm', 'alarm');
      ctx.sfx.setBedLevel('alarm', localTime > FIGHT_END ? 0.025 : 0.06, 0.6);
      ctx.sfx.bed('room', 'roomTone');
      ctx.sfx.setBedLevel('room', 0.05, 0.8);
      if (localTime >= 51.5) {
        ctx.sfx.bed('respirator', 'respirator');
        ctx.sfx.setBedLevel('respirator', 0.09, 0.6);
      }
    },

    exit(ctx) {
      arcStop?.();
      arcStop = null;
      void ctx;
    },

    update(ctx, localTime, dt) {
      const stage = ctx.stage;
      const rho = localTime;
      stage.setLocation('interior');
      stage.applyCameraRange(ctx.render.camera);
      ctx.render.fade = 1 - ramp(rho, 0, 1.6);
      ctx.render.dofEnabled = true;
      ctx.render.dofRange = 26;
      ctx.render.dofStrength = 0.32;

      stage.corridor.setAlarm(rho < FIGHT_END ? 1 : 0.35 * (1 - ramp(rho, 49, 55)));
      stage.corridor.setPowerLevel(1 - ramp(rho, BREACH_T, BREACH_T + 6) * 0.35);

      // --- door -------------------------------------------------------------
      const breach = clamp01((rho - 6) / (BREACH_T - 6)) * 0.85 + ramp(rho, BREACH_T, BREACH_T + 0.9) * 0.15;
      stage.corridor.blastDoor.setBreach(clamp01(breach));

      // Sparks running around the cut while the torch works.
      if (dt > 0 && rho > 6.5 && rho < BREACH_T) {
        stage.corridor.blastDoor.getCentre(tmpA);
        const phase = (rho - 6) / (BREACH_T - 6);
        const ang = phase * Math.PI * 2 * 1.05;
        tmpA.y += Math.sin(ang) * 1.1;
        tmpA.z += Math.cos(ang) * 1.15;
        if (rng.next() < dt * 34) {
          stage.fx.burstSparks({
            origin: tmpA,
            count: 3,
            speed: 3.4,
            color: 0xffcf8a,
            life: 0.7,
            gravity: 8,
            width: 0.014,
          });
        }
        if (rng.next() < dt * 2.2) {
          ctx.sfx.sparks({ position: tmpA, gain: 0.1, count: 3 });
        }
      }

      // --- defenders ---------------------------------------------------------
      // Positions are analytic so a scrub lands everyone exactly where a linear
      // playthrough would have put them.
      const rebels = stage.characters.rebels;
      for (let i = 0; i < rebels.length; i++) {
        const r = rebels[i];
        const d = DEFENCE[i];
        const fallBack = smootherstep(clamp01((rho - 0.4 - i * 0.35) / 5.4));
        const postX = lerp(DEFENCE_START_X + i * 1.9, d.x, fallBack);
        const runningIn = fallBack > 0.005 && fallBack < 0.995;
        r.root.position.set(rho < d.fallAt ? postX : d.x, 0, d.z);
        r.speed = rho < d.fallAt && runningIn ? 2.6 : 0;
        if (runningIn && rho < d.fallAt) {
          r.setState('run');
          r.setHeading(-Math.PI / 2);
          r.aimTarget = null;
          r.lookTarget = null;
          continue;
        }
        if (rho >= d.fallAt) {
          if (r.state !== 'fall' && r.state !== 'down') {
            r.clearPath();
            r.setState(rho > d.fallAt + 1.2 ? 'down' : 'fall');
            if (dt > 0) ctx.sfx.impact(0.6, { position: r.root.position, gain: 0.2, refDistance: 4 });
          } else if (rho > d.fallAt + 1.4 && r.state === 'fall') {
            r.setState('down');
          }
          r.aimTarget = null;
          r.lookTarget = null;
          continue;
        }
        r.setState(d.state);
        r.aimTarget = tmpA.set(DOOR_X + 2, rho > BREACH_T - 2 ? 1.25 : 1.4, d.z * 0.4);
        r.setHeading(-Math.PI / 2);
      }

      const officer = stage.characters.officer;
      const officerIn = smootherstep(clamp01((rho - 0.2) / 5.6));
      officer.root.position.set(
        rho < OFFICER_POST.fallAt ? lerp(OFFICER_START_X, OFFICER_POST.x, officerIn) : OFFICER_POST.x,
        0,
        OFFICER_POST.z,
      );
      officer.speed = rho < OFFICER_POST.fallAt && officerIn > 0.005 && officerIn < 0.995 ? 2.4 : 0;
      if (rho >= OFFICER_POST.fallAt) {
        if (officer.state !== 'fall' && officer.state !== 'down') officer.setState('fall');
        else if (rho > OFFICER_POST.fallAt + 1.4) officer.setState('down');
        officer.aimTarget = null;
      } else if (officer.speed > 0.05) {
        officer.setState('run');
        officer.setHeading(-Math.PI / 2);
        officer.aimTarget = null;
      } else {
        officer.setState('aim');
        officer.aimTarget = tmpA.set(DOOR_X + 2, 1.3, 0);
        officer.setHeading(-Math.PI / 2);
      }

      // --- boarders ----------------------------------------------------------
      const troopers = stage.characters.troopers;
      for (let i = 0; i < troopers.length; i++) {
        const t = troopers[i];
        const lane = TROOPER_LANES[i];
        const visible = rho >= FIGHT_START + lane.delay - 0.2;
        t.root.visible = visible;
        if (!visible) continue;
        const advanceX = trooperTargetX(i, rho);
        const moving = Math.abs(advanceX - t.root.position.x) > 0.05 && rho < FIGHT_START + lane.delay + 3.6;
        // After the corridor falls quiet they step aside onto the walls, which
        // clears the centre line for the entrance that follows.
        const hold = TROOPER_HOLD[i];
        const clear = smootherstep(clamp01((rho - FIGHT_END - 1) / 4));
        t.root.position.set(lerp(advanceX, hold.x, clear), 0, lerp(lane.z, hold.z, clear));
        t.speed = moving ? 2.4 : clear > 0.02 && clear < 0.98 ? 0.7 : 0;
        t.setHeading(Math.PI / 2 + hold.face * clear);
        if (moving) {
          t.setState('run');
          t.aimTarget = null;
        } else if (rho < FIGHT_END) {
          t.setState(lane.posture);
          t.aimTarget = tmpB.set(16, 1.2, lane.z * 0.5);
        } else if (clear > 0.02 && clear < 0.98) {
          t.setState('walk');
          t.aimTarget = null;
        } else {
          // Holding the wall: half the squad keeps a weapon up, the rest stand
          // down, so the honour guard does not read as six identical statues.
          t.setState(hold.watch ? 'aim' : 'idle');
          t.aimTarget = hold.watch ? tmpB.set(34, 1.45, hold.z * 0.6) : null;
        }
      }

      // --- exchange of fire ---------------------------------------------------
      if (dt > 0 && rho >= FIGHT_START + 0.8 && rho <= FIGHT_END) {
        const index = Math.floor((rho - FIGHT_START) / EXCHANGE_INTERVAL);
        if (!fired.has(index)) {
          fired.add(index);
          exchange(ctx, index, rho);
        }
      }

      // Drifting smoke and the odd failing conduit after the breach.
      if (dt > 0 && rho > BREACH_T) {
        if (rng.next() < dt * 3.4) {
          tmpA.set(DOOR_X + rng.range(1, 12), rng.range(0.3, 2.6), rng.spread(1.2));
          stage.fx.puffSmoke({
            origin: tmpA,
            count: 1,
            radius: 0.8,
            speed: 0.5,
            size0: 1.4,
            size1: 4.6,
            life: 7,
            alpha: 0.17,
            color: 0x9a9da2,
            color1: 0x4a4d52,
            bias: new THREE.Vector3(0.25, 0.14, 0),
          });
        }
        if (rng.next() < dt * 0.85) {
          stage.corridor.anchors.sparkConduit.getWorldPosition(tmpA);
          stage.fx.burstSparks({ origin: tmpA, count: 8, speed: 2.6, color: 0xbfe2ff, life: 0.5, gravity: 9, width: 0.012 });
          ctx.sfx.sparks({ position: tmpA, gain: 0.12, count: 4 });
        }
      }

      // --- the dark lord ------------------------------------------------------
      const vader = stage.characters.vader;
      if (rho >= 51.5) {
        vader.root.visible = true;
        const walk = clamp01((rho - 52.2) / 15.5);
        const x = vaderWalkX(rho);
        vader.root.position.set(x, 0, 0);
        vader.speed = walk > 0 && walk < 1 ? 1.35 : 0;
        vader.setHeading(Math.PI / 2);
        vader.setState(vader.speed > 0.05 ? 'walk' : 'idle');
        vader.lookTarget = tmpA.set(x + 8, 1.5, 0);
        stage.corridor.setVaderPresence(ramp(rho, 51.5, 56), x);
        // Measured, heavy footfalls locked to the walk cycle.
        if (dt > 0 && vader.speed > 0.05) {
          const step = Math.floor((rho - 52.2) / 0.6);
          if (!fired.has(10000 + step)) {
            fired.add(10000 + step);
            ctx.sfx.footstep({ position: vader.root.position, heavy: true, gain: 0.24, refDistance: 5 });
          }
        }
        // Troopers give ground and turn to face him.
        for (const t of troopers) {
          if (!t.root.visible) continue;
          t.lookTarget = tmpB.copy(vader.root.position).setY(1.6);
        }
      } else {
        vader.root.visible = false;
        stage.corridor.setVaderPresence(0, 0);
      }

      // Cool the corridor down as he approaches.
      const chill = ramp(rho, 50, 58);
      stage.interiorAmbient.intensity = 0.32 - chill * 0.12;
      stage.interiorAmbient.color.setHSL(lerp(0.11, 0.58, chill), 0.1 + chill * 0.08, 0.84);
      stage.interiorKey.intensity = 2.55 - chill * 0.5;
    },
  };
}

export { clamp };
