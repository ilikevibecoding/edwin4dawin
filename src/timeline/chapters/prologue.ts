import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { customShot } from '../../camera/CameraDirector';
import { CRAWL_CAMERA } from '../../stage/TitleCrawl';
import { clamp01, ramp, smootherstep } from '../../core/math';

export const PROLOGUE_START = 0;
export const PROLOGUE_DURATION = 46;

/**
 * Chapter 1 — Prologue.
 *
 * Opens in true darkness, brings up the original golden prologue text receding
 * into space, then lets the text pass the vanishing point and hands off to a
 * bare starfield ready for the planet reveal.
 */
export function prologueChapter(): Chapter<ShowContext> {
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  return {
    id: 'prologue',
    title: 'Prologue',
    synopsis: 'Darkness, then an original prologue receding into the stars.',
    start: PROLOGUE_START,
    duration: PROLOGUE_DURATION,

    beats: [
      {
        t: 0.2,
        id: 'lights-out',
        fire(ctx) {
          ctx.music.setCue('silence', true);
          ctx.stage.setLocation('space');
        },
      },
      {
        t: 2.4,
        id: 'score-in',
        fire(ctx) {
          ctx.music.setCue('prologue', true);
        },
      },
      {
        t: 4.0,
        id: 'stars',
        fire(ctx) {
          ctx.sfx.bed('void', 'roomTone');
          ctx.sfx.setBedLevel('void', 0.05, 3);
        },
      },
    ],

    shots(ctx) {
      void ctx;
      return [
        customShot({ id: 'prologue.crawl', start: 0, end: PROLOGUE_DURATION, fov: CRAWL_CAMERA.fov, handheld: 0.1 }, (k, _t, out) => {
          // Almost locked off: a sub-degree drift keeps the frame alive without
          // breaking the framing the crawl geometry was authored against.
          const drift = smootherstep(k);
          out.position.set(CRAWL_CAMERA.position[0], CRAWL_CAMERA.position[1] + drift * 1.2, CRAWL_CAMERA.position[2]);
          out.target.set(CRAWL_CAMERA.target[0], CRAWL_CAMERA.target[1] + drift * 2.4, CRAWL_CAMERA.target[2]);
          out.fov = CRAWL_CAMERA.fov;
          out.focus = 140;
        }),
      ];
    },

    enter(ctx, localTime) {
      ctx.stage.setLocation('space');
      ctx.stage.starfield.setOpacity(clamp01((localTime - 3) / 6));
      ctx.stage.planetPivot.visible = false;
      ctx.stage.destroyer.root.visible = false;
      ctx.stage.runner.root.visible = false;
      ctx.stage.pod.root.visible = false;
      if (!ctx.crawl.isDisposed) {
        ctx.stage.spaceRoot.add(ctx.crawl.root);
      }
      ctx.setCard(null);
    },

    exit(ctx) {
      ctx.crawl.setOpacity(0);
      ctx.stage.planetPivot.visible = true;
    },

    update(ctx, localTime) {
      const t = localTime;
      // Fade up from black, hold, and dip out as the last line recedes.
      ctx.render.fade = 1 - ramp(t, 0.4, 3.4);
      ctx.stage.starfield.setOpacity(clamp01((t - 2.5) / 7) * 0.95);

      if (!ctx.crawl.isDisposed) {
        const textIn = ramp(t, 3.0, 5.5);
        const textOut = 1 - ramp(t, PROLOGUE_DURATION - 5.5, PROLOGUE_DURATION - 1.5);
        ctx.crawl.setOpacity(textIn * textOut);
        ctx.crawl.setProgress(clamp01((t - 3.0) / (PROLOGUE_DURATION - 7.5)));
      }

      // The camera lives in empty space here; keep the shot data honest.
      ctx.stage.applyCameraRange(ctx.render.camera);
      void camPos;
      void camTarget;
    },
  };
}
