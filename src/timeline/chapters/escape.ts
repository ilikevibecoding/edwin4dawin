import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { clampToBox, customShot } from '../../camera/CameraDirector';
import { clamp01, lerp, ramp, smootherstep } from '../../core/math';
import { freshRng } from '../../core/Random';
import {
  DOCK,
  destroyerPositionAt,
  orbitAngle,
  podPositionAt,
  runnerPositionAt,
} from '../flight';

export const ESCAPE_START = 334;
export const ESCAPE_DURATION = 54;

/** Absolute time the pod separates from the hull. */
export const LAUNCH_T = ESCAPE_START + 27;
const INTERIOR_END = 22;

const CAM_MIN = new THREE.Vector3(-8.6, 0.35, -4.6);
const CAM_MAX = new THREE.Vector3(40, 2.85, 20);

const BAY_X = 32;
const BAY_Z = 17.6;

/**
 * Chapter 7 — Escape pod.
 *
 * Two contrasting walks down the branch corridor, a hatch, and then the pod
 * itself: clamps, a shove clear of the hull, and a long fall toward the desert
 * while the two ships hold station overhead.
 */
export function escapeChapter(): Chapter<ShowContext> {
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const rng = freshRng('escape');
  const fired = new Set<number>();

  const r2Path: Array<[number, number, number]> = [
    [24.5, 0, -2.2],
    [27.5, 0, -0.6],
    [BAY_X, 0, 0.4],
    [BAY_X, 0, 8],
    [BAY_X, 0, BAY_Z - 1.6],
  ];
  const threepioPath: Array<[number, number, number]> = [
    [23.5, 0, -1.6],
    [27, 0, -0.2],
    [BAY_X - 0.9, 0, 1.2],
    [BAY_X - 0.9, 0, 8.5],
    [BAY_X - 0.9, 0, BAY_Z - 2.2],
  ];

  /** Distance travelled along a polyline path at a given fraction. */
  function pathPoint(path: Array<[number, number, number]>, k: number, out: THREE.Vector3): THREE.Vector3 {
    const total = path.length - 1;
    const f = clamp01(k) * total;
    const i = Math.min(total - 1, Math.floor(f));
    const local = f - i;
    const a = path[i];
    const b = path[i + 1];
    return out.set(
      lerp(a[0], b[0], local),
      lerp(a[1], b[1], local),
      lerp(a[2], b[2], local),
    );
  }

  return {
    id: 'escape',
    title: 'Escape Pod',
    synopsis: 'Two droids, one launch rail, and nobody willing to waste a shot.',
    start: ESCAPE_START,
    duration: ESCAPE_DURATION,

    beats: [
      {
        t: 0.2,
        id: 'run',
        fire(ctx) {
          ctx.music.setCue('escape', true);
          ctx.sfx.droidChirp('alarm', { position: new THREE.Vector3(25, 0.8, -2), gain: 0.18 });
        },
      },
      {
        t: 16,
        id: 'hatch',
        fire(ctx) {
          ctx.stage.corridor.openPodHatch(true);
          ctx.sfx.clamps({ position: new THREE.Vector3(BAY_X, 1.4, BAY_Z + 2.9), gain: 0.3 });
        },
      },
      {
        t: INTERIOR_END,
        id: 'to-space',
        fire(ctx) {
          ctx.stage.setLocation('space');
          ctx.stage.pod.root.visible = true;
          ctx.sfx.stopBed('alarm', 0.6);
          ctx.sfx.stopBed('room', 0.6);
          ctx.sfx.stopBed('respirator', 0.8);
          ctx.sfx.bed('capital', 'capitalRumble');
          ctx.sfx.setBedLevel('capital', 0.24, 2);
        },
      },
      {
        t: 26.2,
        id: 'clamps',
        fire(ctx) {
          ctx.stage.pod.root.getWorldPosition(tmpA);
          ctx.sfx.clamps({ position: tmpA, gain: 0.4, refDistance: 12 });
        },
      },
      {
        t: 27,
        id: 'launch',
        fire(ctx) {
          const stage = ctx.stage;
          stage.pod.releaseClamps();
          stage.pod.engines.throttle = 1;
          stage.pod.root.getWorldPosition(tmpA);
          ctx.sfx.podLaunch({ position: tmpA, gain: 0.5, refDistance: 14 });
          ctx.sfx.bed('podThruster', 'podThruster', tmpA);
          ctx.sfx.setBedLevel('podThruster', 0.12, 1.2);
          ctx.director.impulse(0.55);
          stage.fx.puffSmoke({
            origin: tmpA,
            count: 16,
            radius: 2,
            speed: 9,
            size0: 2,
            size1: 12,
            life: 2.4,
            alpha: 0.4,
            color: 0xb8bcc2,
            color1: 0x50555c,
          });
        },
      },
    ],

    shots(ctx) {
      const stage = ctx.stage;
      const S = ESCAPE_START;
      const clampCam = (out: { position: THREE.Vector3 }): void => clampToBox(out.position, CAM_MIN, CAM_MAX, 0.2);
      const podAt = (t: number): THREE.Vector3 => podPositionAt(t, LAUNCH_T, new THREE.Vector3());

      return [
        // 1. The droids leave the alcove — contrasting gaits, one frame.
        customShot({ id: 'escape.leave', start: S, end: S + 8, fov: 46, handheld: 0.7, blend: 1.4 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(26.5, 29.5, a), lerp(1.05, 0.95, a), lerp(-1.9, -0.4, a));
          out.target.set(lerp(24.5, 30.5, a), 0.75, lerp(-2.1, 0.6, a));
          out.fov = 46;
          out.focus = 3.2;
          clampCam(out);
        }),

        // 2. Down the branch toward the bay.
        customShot({ id: 'escape.branch', start: S + 8, end: S + 16, fov: 48, handheld: 0.8, blend: 1.0 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(BAY_X + lerp(1.3, 0.4, a), lerp(1.35, 1.15, a), lerp(3.4, 9.5, a));
          out.target.set(BAY_X, 0.85, lerp(8, BAY_Z, a));
          out.fov = 48;
          out.focus = 5;
          clampCam(out);
        }),

        // 3. Boarding.
        customShot({ id: 'escape.board', start: S + 16, end: S + INTERIOR_END, fov: 44, handheld: 0.6, blend: 0.9 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(BAY_X + lerp(2.3, 1.6, a), lerp(1.5, 1.25, a), lerp(13.2, 14.6, a));
          out.target.set(BAY_X + lerp(0, 0.1, a), lerp(1.3, 1.4, a), BAY_Z + 2.4);
          out.fov = 44;
          out.focus = 4;
          clampCam(out);
        }),

        // 4. Exterior: the runner clamped under the destroyer, pod still attached.
        customShot({ id: 'escape.exterior', start: S + INTERIOR_END, end: S + 30, fov: 42, handheld: 0.4, blend: 0 }, (k, t, out) => {
          const r = runnerPositionAt(t, new THREE.Vector3());
          const a = smootherstep(k);
          out.position.set(r.x + lerp(122, 78, a), r.y + lerp(-26, -14, a), r.z + lerp(148, 104, a));
          out.target.set(r.x + 4, r.y - 4, r.z + 8);
          out.fov = lerp(44, 40, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // 5. Launch: hold on the pod as it separates and clears the hull.
        customShot({ id: 'escape.launch', start: S + 30, end: S + 40, fov: 46, handheld: 0.75, blend: 0.8 }, (k, t, out) => {
          const p = podAt(t);
          const r = runnerPositionAt(t, new THREE.Vector3());
          const a = smootherstep(k);
          out.position.set(r.x + lerp(64, 96, a), r.y + lerp(-18, -46, a), r.z + lerp(92, 132, a));
          out.target.copy(p);
          out.fov = lerp(44, 38, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // 6. Following the pod down, with the fleet shrinking behind it.
        customShot({ id: 'escape.descend', start: S + 40, end: S + ESCAPE_DURATION, fov: 40, handheld: 0.45, blend: 1.4 }, (k, t, out) => {
          const p = podAt(t);
          const d = destroyerPositionAt(t, new THREE.Vector3());
          const a = smootherstep(k);
          // Trail the pod and let the fleet drift up out of frame behind it.
          out.position.set(p.x + lerp(-40, -78, a), p.y + lerp(26, 62, a), p.z + lerp(54, 118, a));
          // Aim just above the pod so the destroyer stays visible at the top.
          out.target.set(p.x, p.y + lerp(6, 34, a), p.z);
          out.fov = lerp(42, 40, a);
          out.focus = out.position.distanceTo(out.target);
          void d;
          void stage;
        }),
      ];
    },

    enter(ctx, localTime, scrubbed) {
      const stage = ctx.stage;
      const interior = localTime < INTERIOR_END;
      stage.setLocation(interior ? 'interior' : 'space');
      ctx.setCard(null);
      if (scrubbed) {
        fired.clear();
        stage.fx.reset();
      }
      rng.reset();

      const { r2, threepio, leia, vader, troopers, rebels, officer } = stage.characters;
      r2.root.visible = interior;
      threepio.root.visible = interior;
      leia.root.visible = interior;
      vader.root.visible = interior;
      for (const t of troopers) t.root.visible = interior;
      for (const r of rebels) {
        r.root.visible = interior;
        r.setState('down');
      }
      officer.root.visible = interior;
      officer.setState('down');
      leia.setPosition(22, 0, -3.35);
      leia.setHeading(Math.PI / 2);
      leia.setState('idle');
      threepio.setAnxiety(1);
      stage.dataProjection.setVisible(0);
      stage.corridor.openPodHatch(localTime > 16);

      stage.pod.root.visible = !interior;
      stage.pod.engines.throttle = localTime >= 27 ? 1 : 0;
      if (localTime >= 27) stage.pod.releaseClamps();
      else stage.pod.attachClamps();
      stage.runner.root.visible = !interior;
      stage.destroyer.root.visible = !interior;
      stage.runner.setDamage(0.72);
      stage.runner.engines.throttle = 0.02;

      ctx.music.setCue('escape', scrubbed);
      if (interior) {
        ctx.sfx.bed('room', 'roomTone');
        ctx.sfx.setBedLevel('room', 0.05, 0.8);
        ctx.sfx.bed('alarm', 'alarm');
        ctx.sfx.setBedLevel('alarm', 0.02, 0.8);
      } else {
        ctx.sfx.stopBed('room', 0.3);
        ctx.sfx.stopBed('alarm', 0.3);
        ctx.sfx.bed('capital', 'capitalRumble');
        ctx.sfx.setBedLevel('capital', 0.24, 0.8);
        if (localTime >= 27) {
          ctx.sfx.bed('podThruster', 'podThruster');
          ctx.sfx.setBedLevel('podThruster', 0.12, 0.8);
        }
      }
    },

    exit(ctx) {
      void ctx;
    },

    update(ctx, localTime, dt) {
      const stage = ctx.stage;
      const t = localTime;
      const abs = ESCAPE_START + t;
      const interior = t < INTERIOR_END;
      stage.setLocation(interior ? 'interior' : 'space');
      stage.applyCameraRange(ctx.render.camera);
      ctx.render.fade = (1 - ramp(t, 0, 1.2)) * 0;
      ctx.render.dofEnabled = interior;
      ctx.render.dofRange = 4;
      ctx.render.dofStrength = 0.9;

      if (interior) {
        const { r2, threepio } = stage.characters;
        // R2 moves steadily; the protocol droid keeps hesitating and catching up.
        const r2k = clamp01((t - 0.6) / 15);
        pathPoint(r2Path, smootherstep(r2k) * 0.999, tmpA);
        const r2Ahead = pathPoint(r2Path, Math.min(0.999, smootherstep(r2k) + 0.02), tmpB.clone());
        r2.root.position.copy(tmpA);
        r2.speed = r2k > 0 && r2k < 1 ? 1.5 : 0;
        r2.setState('walk');
        if (r2.speed > 0.05) r2.faceTowards(r2Ahead);
        r2.lookDomeAt(tmpB.set(BAY_X, 1.4, BAY_Z + 2));

        // Reluctance: a stop-start profile riding on top of the same path.
        const hesitate = 0.5 - 0.5 * Math.cos(t * 1.6);
        const pk = clamp01((t - 1.6) / 15.5);
        const pkEased = smootherstep(pk) * (0.86 + 0.14 * hesitate);
        pathPoint(threepioPath, Math.min(0.999, pkEased), tmpA);
        const pAhead = pathPoint(threepioPath, Math.min(0.999, pkEased + 0.02), tmpB.clone());
        threepio.root.position.copy(tmpA);
        threepio.speed = pk > 0 && pk < 1 ? 1.0 * (0.55 + 0.45 * hesitate) : 0;
        threepio.setState('walk');
        if (threepio.speed > 0.05) threepio.faceTowards(pAhead);
        threepio.setAnxiety(0.9);

        if (dt > 0) {
          const step = Math.floor(t / 0.46);
          if (!fired.has(step) && threepio.speed > 0.1) {
            fired.add(step);
            ctx.sfx.footstep({ position: threepio.root.position, gain: 0.09, refDistance: 5 });
          }
          const servoStep = Math.floor(t / 0.85);
          if (!fired.has(50000 + servoStep) && r2.speed > 0.1) {
            fired.add(50000 + servoStep);
            ctx.sfx.servo({ position: r2.root.position, gain: 0.07, refDistance: 5 });
          }
          if (rng.next() < dt * 0.35) ctx.sfx.droidFret({ position: threepio.root.position, gain: 0.09 });
          if (rng.next() < dt * 0.22) ctx.sfx.droidChirp('query', { position: r2.root.position, gain: 0.12 });
        }

        // Board: fade them behind the hatch in the last second.
        if (t > INTERIOR_END - 1.5) {
          const k = ramp(t, INTERIOR_END - 1.5, INTERIOR_END - 0.1);
          r2.root.visible = k < 0.6;
          threepio.root.visible = k < 0.9;
        }
        stage.corridor.openPodHatch(t > 16);
        stage.corridor.setAlarm(0.3);
        stage.interiorAmbient.intensity = 0.62;
        return;
      }

      // --- exterior -----------------------------------------------------------
      stage.planetPivot.rotation.z = orbitAngle(abs);
      runnerPositionAt(abs, tmpA);
      stage.runner.root.position.copy(tmpA);
      stage.runner.root.rotation.set(0, Math.PI / 2, 0);
      stage.runner.root.rotateZ(Math.sin(abs * 0.11) * 0.02);
      destroyerPositionAt(abs, tmpB);
      stage.destroyer.root.position.copy(tmpB);
      stage.destroyer.root.rotation.set(0, Math.PI / 2, 0);
      stage.destroyer.standDown();
      stage.runner.engines.throttle = 0.02;
      stage.runner.setCockpitLights(0.3);

      const pod = stage.pod;
      pod.root.visible = true;
      if (abs < LAUNCH_T) {
        // Still clamped to the bay on the runner's flank.
        pod.root.position.set(DOCK.x + 6, DOCK.y - 9, DOCK.z + 12);
        pod.root.rotation.set(0, Math.PI * 0.62, 0.2);
        pod.engines.throttle = 0;
        pod.attachClamps();
      } else {
        podPositionAt(abs, LAUNCH_T, tmpA);
        pod.root.position.copy(tmpA);
        podPositionAt(abs + 0.1, LAUNCH_T, tmpB);
        pod.root.lookAt(tmpB);
        pod.engines.throttle = clamp01((abs - LAUNCH_T) / 1.4);
        pod.releaseClamps();
        ctx.sfx.setBedPosition('podThruster', tmpA);
        if (dt > 0 && rng.next() < dt * 6) {
          stage.fx.puffSmoke({
            origin: tmpA,
            count: 1,
            radius: 1,
            speed: 2,
            size0: 1.2,
            size1: 6,
            life: 1.6,
            alpha: 0.16,
            color: 0xa8adb4,
            color1: 0x40454a,
          });
        }
      }
      pod.setReentry(0);
    },
  };
}
