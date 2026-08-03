import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { clampToBox, customShot } from '../../camera/CameraDirector';
import { clamp, clamp01, lerp, ramp, smootherstep } from '../../core/math';
import { freshRng } from '../../core/Random';

export const PLANS_START = 288;
export const PLANS_DURATION = 46;

const CAM_MIN = new THREE.Vector3(-8.6, 0.35, -4.55);
const CAM_MAX = new THREE.Vector3(40, 2.85, 1.35);

/** Alcove geography (matches `Corridor`'s alcove definition). */
const ALCOVE_X = 22;
const CONSOLE_Z = -4.25;
/** Inside faces of the alcove side walls, with clearance for the near plane. */
const ALCOVE_CAM_X0 = 20.4;
const ALCOVE_CAM_X1 = 23.6;

/**
 * Staging for the alcove (x 20..24, z -1.7..-5.1, console on the back wall).
 *
 * The alcove is only 4 m by 3.4 m, which is not enough room to put a camera
 * inside it and still hold two figures plus a metre-wide projection. So the
 * camera works from the corridor, square to the opening and looking straight
 * down -Z; the frame's horizontal axis is then world X, and the marks below
 * are simply spread across it so nothing overlaps.
 */
const LEIA_POST = new THREE.Vector3(22.4, 0, -3.9);
const LEIA_KNEEL = new THREE.Vector3(22.25, 0, -3.5);
const R2_POST = new THREE.Vector3(21.5, 0, -2.55);
const THREEPIO_POST = new THREE.Vector3(23.35, 0, -2.9);
/** Where the schematic hangs: left of frame, against the bare back corner. */
const HOLO_POST = new THREE.Vector3(20.95, 1.45, -3.4);
/** She turns out of the console toward the opening once the readout is up. */
const LEIA_FACE = new THREE.Vector3(22.5, 0, 0);

/**
 * The corridor clamp box is a single rectangle, but past the alcove mouth the
 * camera also has to stay between the alcove's side walls or it ends up inside
 * one of them. Applied after the box clamp so both constraints hold.
 */
function keepInAlcove(p: THREE.Vector3): void {
  if (p.z >= -1.4) return;
  const t = clamp01((-1.4 - p.z) / 0.5);
  p.x = lerp(p.x, clamp(p.x, ALCOVE_CAM_X0, ALCOVE_CAM_X1), t);
}

/**
 * Chapter 6 — Leia and the plans.
 *
 * A quiet, close chapter: the readouts come out of the ship's memory as a
 * rotating schematic, shrink into the astromech's data core, and the corridor
 * behind her fills with white armour while she finishes.
 */
export function plansChapter(): Chapter<ShowContext> {
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  // Look-at targets are held by reference until the character updates, so they
  // need their own storage rather than the per-frame scratch vectors.
  const leiaLook = new THREE.Vector3();
  const threepioLook = new THREE.Vector3();
  const rng = freshRng('plans');
  const fired = new Set<number>();

  return {
    id: 'plans',
    title: 'The Plans',
    synopsis: 'The stolen readouts go into a droid nobody will think to search.',
    start: PLANS_START,
    duration: PLANS_DURATION,

    beats: [
      {
        t: 0.2,
        id: 'setup',
        fire(ctx) {
          ctx.music.setCue('resolve', true);
          ctx.sfx.setBedLevel('alarm', 0.02, 2);
          ctx.sfx.setBedLevel('respirator', 0.02, 3);
        },
      },
      {
        t: 4.5,
        id: 'projector-on',
        fire(ctx) {
          ctx.stage.dataProjection.setVisible(1);
          ctx.sfx.droidChirp('query', { position: R2_POST, gain: 0.16 });
          ctx.sfx.servo({ position: R2_POST, gain: 0.1 });
        },
      },
      {
        t: 17,
        id: 'card-out',
        fire(ctx) {
          ctx.stage.characters.leia.setHoldingData(true);
          ctx.sfx.sparks({ position: LEIA_POST, gain: 0.07, count: 2 });
        },
      },
      {
        t: 24.5,
        id: 'transfer',
        fire(ctx) {
          ctx.stage.dataProjection.stutter();
          ctx.sfx.droidChirp('affirm', { position: R2_POST, gain: 0.2 });
          ctx.render.bloomBoost = 0.22;
        },
      },
      {
        t: 30,
        id: 'stored',
        fire(ctx) {
          ctx.stage.characters.leia.setHoldingData(false);
          ctx.stage.dataProjection.setVisible(0);
          ctx.sfx.droidChirp('alarm', { position: R2_POST, gain: 0.18 });
        },
      },
      {
        t: 34,
        id: 'imperials-close',
        fire(ctx) {
          ctx.music.setCue('dread');
          ctx.sfx.setBedLevel('respirator', 0.055, 2);
        },
      },
    ],

    shots(ctx) {
      const stage = ctx.stage;
      const S = PLANS_START;
      const clampCam = (out: { position: THREE.Vector3 }): void => {
        clampToBox(out.position, CAM_MIN, CAM_MAX, 0.2);
        keepInAlcove(out.position);
      };

      return [
        // 1. Find her: down the corridor, then round into the alcove mouth. The
        //    lateral move is held back until the camera is past the opening, so
        //    it never cuts the corner through the corridor wall.
        customShot({ id: 'plans.find', start: S, end: S + 9, fov: 46, handheld: 0.55, blend: 1.6 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(27.2, 22.05, a), lerp(1.72, 1.62, a), lerp(1.0, 0.45, a));
          out.target.set(lerp(22.7, 22.15, a), lerp(1.5, 1.36, a), lerp(-1.9, -3.85, a));
          out.fov = lerp(48, 40, a);
          out.focus = out.position.distanceTo(out.target);
          clampCam(out);
        }),

        // 2. Two-shot from the corridor: she turns out of the console on the
        //    right of frame, the schematic hangs on the left.
        customShot({ id: 'plans.leia', start: S + 9, end: S + 19, fov: 38, handheld: 0.4, blend: 1.1 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(22.1, lerp(1.6, 1.54, a), lerp(0.15, -0.55, a));
          out.target.set(lerp(21.95, 21.9, a), lerp(1.34, 1.3, a), -3.72);
          out.fov = lerp(38, 35, a);
          out.focus = out.position.distanceTo(out.target);
          clampCam(out);
        }),

        // 3. The schematic itself, held long enough to read. Lined up on the
        //    bare back-left corner: an additive hologram laid over the
        //    console's own lit screens is simply not legible.
        customShot({ id: 'plans.hologram', start: S + 19, end: S + 26, fov: 38, handheld: 0.3, blend: 1.0 }, (k, _t, out) => {
          const a = smootherstep(k);
          const c = stage.dataProjection.root.position;
          out.position.set(lerp(21.3, 21.1, a), lerp(1.5, 1.47, a), lerp(-0.35, -1.0, a));
          out.target.set(c.x, c.y + lerp(0.05, 0.0, a), c.z);
          out.fov = lerp(38, 33, a);
          out.focus = out.position.distanceTo(out.target);
          clampCam(out);
        }),

        // 4. The transfer: the droid anchors the left foreground, she kneels
        //    into the right of frame with her face still to camera.
        customShot({ id: 'plans.transfer', start: S + 26, end: S + 34, fov: 44, handheld: 0.45, blend: 0.9 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(22.1, 22.0, a), lerp(1.1, 0.92, a), lerp(-0.35, -1.05, a));
          out.target.set(22.1, lerp(0.9, 0.8, a), -3.45);
          out.fov = lerp(46, 43, a);
          out.focus = out.position.distanceTo(out.target);
          clampCam(out);
        }),

        // 5. What is coming down the corridor behind her.
        customShot({ id: 'plans.approach', start: S + 34, end: S + PLANS_DURATION, fov: 46, handheld: 0.65, blend: 1.2 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(22.4, 23.6, a), lerp(1.5, 1.62, a), lerp(-0.6, 0.25, a));
          out.target.set(lerp(15, 4, a), 1.45, lerp(-0.7, 0, a));
          out.fov = lerp(46, 50, a);
          out.focus = lerp(8, 16, a);
          clampCam(out);
        }),
      ];
    },

    enter(ctx, localTime, scrubbed) {
      const stage = ctx.stage;
      stage.setLocation('interior');
      ctx.setCard(null);
      if (scrubbed) {
        fired.clear();
        stage.fx.reset();
      }
      rng.reset();

      const { leia, r2, threepio, vader, troopers, rebels, officer } = stage.characters;
      leia.root.visible = true;
      leia.setPosition(LEIA_POST.x, 0, LEIA_POST.z);
      leia.clearPath();
      leia.setHeading(Math.PI);
      r2.root.visible = true;
      r2.setPosition(R2_POST.x, 0, R2_POST.z);
      r2.clearPath();
      r2.setHeading(Math.PI * 1.12);
      threepio.root.visible = true;
      threepio.setPosition(THREEPIO_POST.x, 0, THREEPIO_POST.z);
      threepio.clearPath();
      threepio.setHeading(Math.PI * 0.72);
      threepio.setAnxiety(0.85);

      // The fight is over: casualties stay down, the boarders hold the corridor.
      for (const r of rebels) {
        r.root.visible = true;
        r.setState('down');
        r.aimTarget = null;
        r.clearPath();
      }
      officer.root.visible = true;
      officer.setState('down');
      officer.clearPath();
      for (let i = 0; i < troopers.length; i++) {
        troopers[i].root.visible = true;
        troopers[i].clearPath();
        troopers[i].setHeading(Math.PI / 2);
      }
      vader.root.visible = true;
      vader.setHeading(Math.PI / 2);

      stage.dataProjection.root.position.copy(HOLO_POST);
      stage.dataProjection.setVisible(localTime > 4.5 && localTime < 30 ? 1 : 0);
      leia.setHoldingData(localTime > 17 && localTime < 30);
      stage.corridor.setAlarm(0.3);
      ctx.music.setCue(localTime > 34 ? 'dread' : 'resolve', scrubbed);
      ctx.sfx.bed('room', 'roomTone');
      ctx.sfx.setBedLevel('room', 0.05, 0.8);
      ctx.sfx.bed('alarm', 'alarm');
      ctx.sfx.setBedLevel('alarm', 0.02, 0.8);
      ctx.sfx.bed('respirator', 'respirator');
      ctx.sfx.setBedLevel('respirator', localTime > 34 ? 0.055 : 0.02, 0.8);
    },

    update(ctx, localTime, dt) {
      const stage = ctx.stage;
      const t = localTime;
      stage.setLocation('interior');
      stage.applyCameraRange(ctx.render.camera);
      ctx.render.fade = 0;
      ctx.render.dofEnabled = true;
      ctx.render.dofRange = 6.5;
      ctx.render.dofStrength = 0.6;
      // The corridor dims while the readout is up: a blue additive hologram
      // projected onto a fully lit white wall is simply not legible.
      const dim = ramp(t, 3, 6.5) * (1 - ramp(t, 29, 33));
      stage.corridor.setPowerLevel(lerp(1, 0.3, dim));
      stage.interiorAmbient.intensity = lerp(0.4, 0.2, dim);

      const { leia, r2, threepio, vader, troopers } = stage.characters;

      // --- Leia at the console ------------------------------------------------
      // She works the console, turns out of it to read the schematic, then
      // steps across and kneels beside the droid.
      const across = smootherstep(clamp01((t - 18) / 2.4)) * (1 - smootherstep(clamp01((t - 31) / 2)));
      leia.root.position.set(
        lerp(LEIA_POST.x, LEIA_KNEEL.x, across),
        0,
        lerp(LEIA_POST.z, LEIA_KNEEL.z, across),
      );
      if (t < 7.5) {
        leia.setState('interact');
        leia.faceTowards(tmpA.set(LEIA_POST.x, 0, CONSOLE_Z - 0.4));
        leiaLook.set(LEIA_POST.x, 1.5, CONSOLE_Z - 0.4);
      } else if (t < 18) {
        // Turned out of the console so the schematic lights her face rather
        // than the back of her head.
        leia.setState('idle');
        leia.faceTowards(LEIA_FACE);
        leiaLook.copy(stage.dataProjection.root.position);
      } else if (t < 31) {
        leia.setState('kneel');
        leia.faceTowards(tmpA.set(R2_POST.x, 0, R2_POST.z));
        leiaLook.set(R2_POST.x, 0.98, R2_POST.z);
      } else {
        leia.setState('idle');
        leia.faceTowards(tmpA.set(23.6, 0, -1.6));
        leiaLook.set(ALCOVE_X + 6, 1.5, 0);
      }
      leia.lookTarget = leiaLook;

      // --- the schematic ------------------------------------------------------
      const proj = stage.dataProjection;
      const up = ramp(t, 4.5, 7);
      const shrink = ramp(t, 25, 29.5);
      proj.setVisible(t > 4.4 && t < 30 ? 1 : 0);
      const projY = lerp(HOLO_POST.y, 0.95, shrink);
      const projX = lerp(HOLO_POST.x, R2_POST.x, shrink);
      const projZ = lerp(HOLO_POST.z, R2_POST.z + 0.02, shrink);
      proj.root.position.set(projX, projY, projZ);
      proj.setScale(lerp(1, 0.18, shrink) * (0.4 + 0.6 * up));

      if (dt > 0 && t > 25 && t < 30 && rng.next() < dt * 12) {
        tmpA.set(projX + rng.spread(0.3), projY + rng.spread(0.3), projZ + rng.spread(0.3));
        stage.fx.flash({ origin: tmpA, size: 0.1, color: 0x76d9ff, life: 0.4 });
      }

      // --- the droids ---------------------------------------------------------
      r2.setState('idle');
      if (t > 30) r2.lookDomeAt(tmpB.set(R2_POST.x + 4, 1.2, 0));
      else if (t > 18) r2.lookDomeAt(tmpA.copy(leia.root.position).setY(1.1));
      else r2.lookDomeAt(tmpA.set(projX, projY, projZ));
      threepio.setState('idle');
      threepio.setAnxiety(0.6 + 0.35 * ramp(t, 30, 40));
      threepio.lookTarget = threepioLook.set(
        t > 26 ? THREEPIO_POST.x + 5 : leia.root.position.x,
        1.5,
        t > 26 ? 0.4 : leia.root.position.z,
      );
      if (dt > 0 && rng.next() < dt * 0.4) {
        ctx.sfx.servo({ position: r2.root.position, gain: 0.05 });
      }
      if (dt > 0 && t > 32 && rng.next() < dt * 0.22) {
        ctx.sfx.droidFret({ position: threepio.root.position, gain: 0.08 });
      }

      // --- imperial pressure down the corridor --------------------------------
      const advance = clamp01((t - 30) / 16);
      for (let i = 0; i < troopers.length; i++) {
        const lane = [-0.95, 0.95, -0.5, 0.55, -1.15, 1.15][i];
        const x = lerp(-2 + i * 1.6, 8.5 + i * 1.4, smootherstep(advance));
        troopers[i].root.position.set(x, 0, lane);
        troopers[i].speed = advance > 0.02 && advance < 0.98 ? 1.6 : 0;
        troopers[i].setState(troopers[i].speed > 0.05 ? 'walk' : 'aim');
        troopers[i].setHeading(Math.PI / 2);
        troopers[i].aimTarget = tmpB.set(x + 8, 1.3, lane * 0.4);
        if (dt > 0 && troopers[i].speed > 0.05) {
          const step = Math.floor((t - 30) / 0.42) * 10 + i;
          if (!fired.has(step)) {
            fired.add(step);
            if (i < 3) ctx.sfx.footstep({ position: troopers[i].root.position, gain: 0.11, refDistance: 6 });
          }
        }
      }
      const vaderX = lerp(9.5, 15.5, smootherstep(clamp01((t - 32) / 14)));
      vader.root.position.set(vaderX, 0, 0);
      vader.speed = t > 32 && t < 46 ? 0.55 : 0;
      vader.setState(vader.speed > 0.05 ? 'walk' : 'idle');
      vader.setHeading(Math.PI / 2);
      vader.lookTarget = tmpB.set(vaderX + 8, 1.55, 0);
      stage.corridor.setVaderPresence(0.6 + 0.4 * ramp(t, 32, 44), vaderX);
      stage.corridor.setAlarm(0.3);
    },
  };
}
