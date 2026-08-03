import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { customShot } from '../../camera/CameraDirector';
import { lerp, ramp, smootherstep } from '../../core/math';
import { orbitAngle } from '../flight';

export const TATOOINE_START = 46;
export const TATOOINE_DURATION = 38;

/**
 * Chapter 2 — Tatooine reveal.
 *
 * A single unbroken drift above the day side. The planet is deliberately given
 * the whole frame and most of the chapter in silence so the destroyer has
 * something to overwhelm later.
 */
export function tatooineChapter(): Chapter<ShowContext> {
  return {
    id: 'tatooine',
    title: 'Tatooine',
    synopsis: 'A desert world turns below. Scale and silence before the chase.',
    start: TATOOINE_START,
    duration: TATOOINE_DURATION,

    beats: [
      {
        t: 0.2,
        id: 'reveal',
        fire(ctx) {
          ctx.music.setCue('wonder');
          ctx.stage.setLocation('space');
          ctx.stage.planetPivot.visible = true;
        },
      },
      {
        t: 26,
        id: 'distant-engines',
        fire(ctx) {
          // The runner is still off-stage, but its drive is already audible.
          ctx.sfx.bed('runner', 'runnerEngine', new THREE.Vector3(-900, 60, 300));
          ctx.sfx.setBedLevel('runner', 0.015, 4);
        },
      },
    ],

    shots(ctx) {
      const centre = ctx.stage.planetPivot.position.clone();
      const radius = ctx.stage.planet.radius;
      /**
       * Place the camera on a sphere around the planet. `azimuth` and
       * `elevation` orbit it; `distance` is measured in planet radii so the
       * framing stays correct if the planet is ever resized.
       */
      const orbit = (
        out: { position: THREE.Vector3; target: THREE.Vector3 },
        azimuth: number,
        elevation: number,
        radii: number,
        aimOffsetY: number,
      ): void => {
        const d = radius * radii;
        const ce = Math.cos(elevation);
        out.position.set(
          centre.x + Math.sin(azimuth) * ce * d,
          centre.y + Math.sin(elevation) * d,
          centre.z + Math.cos(azimuth) * ce * d,
        );
        out.target.set(centre.x, centre.y + aimOffsetY, centre.z);
      };

      return [
        // 1. The whole body in frame: unmistakably a sphere with a terminator.
        customShot(
          { id: 'tatooine.wide', start: TATOOINE_START, end: TATOOINE_START + 21, fov: 44, handheld: 0.3, blend: 0 },
          (k, _t, out) => {
            const a = smootherstep(k);
            orbit(out, lerp(1.24, 1.06, a), lerp(0.34, 0.24, a), lerp(3.75, 2.7, a), lerp(0, 900, a));
            out.fov = lerp(45, 42, a);
            out.focus = out.position.distanceTo(out.target);
          },
        ),
        // 2. Fall toward the day side; the limb opens up and the surface fills
        //    the lower frame, setting up the altitude the chase happens at.
        customShot(
          {
            id: 'tatooine.limb',
            start: TATOOINE_START + 21,
            end: TATOOINE_START + TATOOINE_DURATION,
            fov: 40,
            handheld: 0.32,
            blend: 2.6,
          },
          (k, _t, out) => {
            const a = smootherstep(k);
            orbit(out, lerp(1.02, 0.72, a), lerp(0.22, 0.1, a), lerp(2.62, 1.3, a), lerp(1200, 7200, a));
            out.fov = lerp(42, 46, a);
            out.focus = out.position.distanceTo(out.target);
          },
        ),
      ];
    },

    enter(ctx) {
      ctx.stage.setLocation('space');
      ctx.stage.planetPivot.visible = true;
      ctx.stage.destroyer.root.visible = false;
      ctx.stage.runner.root.visible = false;
      ctx.stage.pod.root.visible = false;
      ctx.crawl.setOpacity(0);
      // The prologue text is finished with: release its texture.
      if (!ctx.crawl.isDisposed) ctx.crawl.dispose();
      ctx.setCard(null);
    },

    update(ctx, localTime) {
      const t = localTime;
      ctx.render.fade = (1 - ramp(t, 0, 2.2)) * 1;
      ctx.stage.planetPivot.rotation.z = orbitAngle(TATOOINE_START + t);
      ctx.stage.applyCameraRange(ctx.render.camera);
      ctx.render.dofEnabled = false;
      // Sunlight is fixed; only the atmosphere shell needs the reminder.
      ctx.stage.planet.setSunDirection(ctx.stage.sunDirection);
    },
  };
}
