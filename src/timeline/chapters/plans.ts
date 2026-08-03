import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { clampToBox, customShot } from '../../camera/CameraDirector';
import { clamp01, lerp, ramp, smootherstep } from '../../core/math';
import { freshRng } from '../../core/Random';

export const PLANS_START = 288;
export const PLANS_DURATION = 46;

const CAM_MIN = new THREE.Vector3(-8.6, 0.35, -4.6);
const CAM_MAX = new THREE.Vector3(40, 2.85, 1.35);

/** Alcove geography (matches `Corridor`'s alcove definition). */
const ALCOVE_X = 22;
const CONSOLE_Z = -4.25;
const LEIA_POST = new THREE.Vector3(ALCOVE_X, 0, -3.35);
const R2_POST = new THREE.Vector3(ALCOVE_X + 1.15, 0, -2.7);
const THREEPIO_POST = new THREE.Vector3(ALCOVE_X - 1.25, 0, -2.4);

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
      const clampCam = (out: { position: THREE.Vector3 }): void => clampToBox(out.position, CAM_MIN, CAM_MAX, 0.2);

      return [
        // 1. Find her: the corridor, then round into the alcove.
        customShot({ id: 'plans.find', start: S, end: S + 9, fov: 46, handheld: 0.55, blend: 1.6 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(28.5, 24.4, a), lerp(1.75, 1.6, a), lerp(0.9, -1.1, a));
          out.target.set(lerp(24, ALCOVE_X, a), lerp(1.6, 1.35, a), lerp(-1.2, -3.3, a));
          out.fov = lerp(48, 44, a);
          out.focus = 5;
          clampCam(out);
        }),

        // 2. Close on Leia and the schematic.
        customShot({ id: 'plans.leia', start: S + 9, end: S + 19, fov: 40, handheld: 0.4, blend: 1.1 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(ALCOVE_X + lerp(1.9, 1.2, a), lerp(1.62, 1.5, a), lerp(-1.5, -2.15, a));
          out.target.set(ALCOVE_X + lerp(-0.1, 0.1, a), lerp(1.45, 1.3, a), CONSOLE_Z + 0.5);
          out.fov = 40;
          out.focus = 2.4;
          clampCam(out);
        }),

        // 3. The schematic itself, held long enough to read. Shot from below so
        //    the background is the unlit alcove ceiling: an additive hologram
        //    against a lit white wall disappears.
        customShot({ id: 'plans.hologram', start: S + 19, end: S + 26, fov: 34, handheld: 0.3, blend: 1.0 }, (k, _t, out) => {
          const a = smootherstep(k);
          const c = stage.dataProjection.root.position;
          out.position.set(c.x + lerp(1.5, 1.02, a), c.y + lerp(-0.52, -0.3, a), c.z + lerp(1.5, 1.12, a));
          out.target.set(c.x, c.y + 0.14, c.z);
          out.fov = lerp(38, 33, a);
          out.focus = out.position.distanceTo(out.target);
          clampCam(out);
        }),

        // 4. The transfer, low and close on the droid.
        customShot({ id: 'plans.transfer', start: S + 26, end: S + 34, fov: 42, handheld: 0.45, blend: 0.9 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(R2_POST.x + lerp(1.45, 1.0, a), lerp(0.95, 0.72, a), R2_POST.z + lerp(1.5, 1.05, a));
          out.target.set(R2_POST.x - 0.1, lerp(0.8, 0.66, a), R2_POST.z - 0.1);
          out.fov = 42;
          out.focus = 1.8;
          clampCam(out);
        }),

        // 5. What is coming down the corridor behind her.
        customShot({ id: 'plans.approach', start: S + 34, end: S + PLANS_DURATION, fov: 46, handheld: 0.65, blend: 1.2 }, (k, _t, out) => {
          const a = smootherstep(k);
          out.position.set(lerp(21.5, 20.4, a), lerp(1.5, 1.62, a), lerp(-2.4, -1.15, a));
          out.target.set(lerp(14, 4, a), 1.45, lerp(-1.2, 0, a));
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
      r2.setHeading(Math.PI * 0.85);
      threepio.root.visible = true;
      threepio.setPosition(THREEPIO_POST.x, 0, THREEPIO_POST.z);
      threepio.clearPath();
      threepio.setHeading(Math.PI * 0.6);
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

      stage.dataProjection.root.position.set(ALCOVE_X, 1.62, CONSOLE_Z + 0.55);
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
      if (t < 16) {
        leia.setState('interact');
        leia.faceTowards(tmpA.set(ALCOVE_X, 1.4, CONSOLE_Z));
        leia.lookTarget = tmpA.set(ALCOVE_X, 1.5, CONSOLE_Z);
      } else if (t < 20) {
        leia.setState('idle');
        leia.lookTarget = tmpA.copy(stage.dataProjection.root.position);
      } else if (t < 31) {
        // Kneel beside the droid and hand the data across.
        leia.setState('kneel');
        leia.faceTowards(tmpA.set(R2_POST.x, 0, R2_POST.z));
        leia.lookTarget = tmpA.set(R2_POST.x, 0.95, R2_POST.z);
      } else {
        leia.setState('idle');
        leia.faceTowards(tmpA.set(ALCOVE_X + 3, 1.4, 0));
        leia.lookTarget = tmpA.set(ALCOVE_X + 6, 1.5, 0);
      }

      // --- the schematic ------------------------------------------------------
      const proj = stage.dataProjection;
      const up = ramp(t, 4.5, 7);
      const shrink = ramp(t, 25, 29.5);
      proj.setVisible(t > 4.4 && t < 30 ? 1 : 0);
      const projY = lerp(1.62, 0.86, shrink);
      const projX = lerp(ALCOVE_X, R2_POST.x, shrink);
      const projZ = lerp(CONSOLE_Z + 0.55, R2_POST.z + 0.05, shrink);
      proj.root.position.set(projX, projY, projZ);
      proj.setScale(lerp(1, 0.18, shrink) * (0.4 + 0.6 * up));

      if (dt > 0 && t > 25 && t < 30 && rng.next() < dt * 12) {
        tmpA.set(projX + rng.spread(0.3), projY + rng.spread(0.3), projZ + rng.spread(0.3));
        stage.fx.flash({ origin: tmpA, size: 0.1, color: 0x76d9ff, life: 0.4 });
      }

      // --- the droids ---------------------------------------------------------
      r2.setState('idle');
      r2.lookDomeAt(tmpA.set(projX, projY, projZ));
      if (t > 30) r2.lookDomeAt(tmpB.set(R2_POST.x + 4, 1.2, 0));
      threepio.setState('idle');
      threepio.setAnxiety(0.6 + 0.35 * ramp(t, 30, 40));
      threepio.lookTarget = tmpB.set(THREEPIO_POST.x + 4, 1.5, 0.4);
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
