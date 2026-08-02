import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { customShot } from '../../camera/CameraDirector';
import { clamp01, lerp, ramp, smootherstep } from '../../core/math';
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
      const stage = ctx.stage;
      return [
        customShot(
          { id: 'tatooine.wide', start: TATOOINE_START, end: TATOOINE_START + 21, fov: 44, handheld: 0.35, blend: 0 },
          (k, _t, out) => {
            // High, slow drift with the limb across the lower third.
            const a = smootherstep(k);
            out.position.set(lerp(-520, 260, a), lerp(430, 300, a), lerp(2150, 1580, a));
            out.target.set(lerp(0, 120, a), lerp(-620, -520, a), lerp(-500, -900, a));
            out.fov = lerp(46, 41, a);
            out.focus = 2000;
          },
        ),
        customShot(
          {
            id: 'tatooine.limb',
            start: TATOOINE_START + 21,
            end: TATOOINE_START + TATOOINE_DURATION,
            fov: 40,
            handheld: 0.3,
            blend: 2.4,
          },
          (k, _t, out) => {
            const a = smootherstep(k);
            const centre = stage.planetPivot.position;
            // Skim the terminator so the atmosphere reads as a bright arc.
            out.position.set(lerp(900, 1500, a), lerp(180, 90, a), lerp(1250, 900, a));
            out.target.set(centre.x + lerp(-1400, -2200, a), centre.y + 12600, centre.z - 2600);
            out.fov = lerp(42, 38, a);
            out.focus = 2400;
          },
        ),
      ];
    },

    enter(ctx) {
      ctx.stage.setLocation('space');
      ctx.stage.planetPivot.visible = true;
      ctx.stage.starfield.setOpacity(0.95);
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
      ctx.stage.starfield.setOpacity(clamp01(0.95 - 0.25 * ramp(t, 18, 30)));
    },
  };
}
