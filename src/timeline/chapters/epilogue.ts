import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { customShot } from '../../camera/CameraDirector';
import { clamp01, lerp, ramp, smootherstep } from '../../core/math';
import { destroyerPositionAt, orbitAngle, podPositionAt, runnerPositionAt } from '../flight';
import { LAUNCH_T } from './escape';

export const EPILOGUE_START = 388;
export const EPILOGUE_DURATION = 24;

export const EPILOGUE_CARD =
  'The fate of a galaxy now travels inside an unarmed droid, falling toward a desert that has never heard its name.';

/**
 * Chapter 8 — Epilogue.
 *
 * The pod becomes a point of light entering the atmosphere while the destroyer
 * and its prize hold station overhead. Ends on an original closing line and
 * hands control to Explore mode.
 */
export function epilogueChapter(): Chapter<ShowContext> {
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  return {
    id: 'epilogue',
    title: 'Epilogue',
    synopsis: 'A bright point enters the atmosphere. The fleet does not follow.',
    start: EPILOGUE_START,
    duration: EPILOGUE_DURATION,

    beats: [
      {
        t: 0.2,
        id: 'settle',
        fire(ctx) {
          ctx.music.setCue('descent', true);
          ctx.stage.setLocation('space');
          ctx.stage.pod.root.visible = true;
        },
      },
      {
        t: 6,
        id: 'entry-burn',
        fire(ctx) {
          ctx.stage.pod.root.getWorldPosition(tmpA);
          ctx.sfx.bed('reentry', 'reentry', tmpA);
          ctx.sfx.setBedLevel('reentry', 0.12, 3);
          ctx.sfx.setBedLevel('podThruster', 0.02, 3);
        },
      },
      {
        t: 15,
        id: 'closing-line',
        fire(ctx) {
          ctx.music.setCue('epilogue');
        },
      },
      {
        t: EPILOGUE_DURATION - 1.2,
        id: 'hand-over',
        fire(ctx) {
          ctx.sfx.setBedLevel('reentry', 0.02, 2);
        },
      },
    ],

    shots(ctx) {
      const S = EPILOGUE_START;
      const podAt = (t: number): THREE.Vector3 => podPositionAt(t, LAUNCH_T, new THREE.Vector3());
      void ctx;
      return [
        // 1. Behind and above the pod as the atmosphere starts to bite.
        customShot({ id: 'epilogue.entry', start: S, end: S + 11, fov: 40, handheld: 0.5, blend: 1.8 }, (k, t, out) => {
          const p = podAt(t);
          const a = smootherstep(k);
          out.position.set(p.x + lerp(-22, -46, a), p.y + lerp(11, 26, a), p.z + lerp(30, 62, a));
          out.target.copy(p);
          out.fov = lerp(40, 36, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // 2. Pull back to a wide: the fleet above, the spark below.
        customShot({ id: 'epilogue.wide', start: S + 11, end: S + EPILOGUE_DURATION, fov: 38, handheld: 0.3, blend: 2.2 }, (k, t, out) => {
          const p = podAt(t);
          const d = destroyerPositionAt(t, new THREE.Vector3());
          const a = smootherstep(k);
          // Sit level with the fleet and look down the pod's fall so both the
          // ships and the descending spark stay inside the frame.
          const mid = new THREE.Vector3().lerpVectors(p, d, 0.62);
          out.position.set(d.x + lerp(-900, -1750, a), d.y + lerp(120, 210, a), d.z + lerp(1500, 2450, a));
          out.target.copy(mid);
          out.fov = lerp(42, 46, a);
          out.focus = out.position.distanceTo(out.target);
        }),
      ];
    },

    enter(ctx, localTime) {
      const stage = ctx.stage;
      stage.setLocation('space');
      ctx.setCard(localTime >= 15 ? EPILOGUE_CARD : null);
      stage.pod.root.visible = true;
      stage.pod.releaseClamps();
      stage.runner.root.visible = true;
      stage.destroyer.root.visible = true;
      for (const c of stage.allCharacters) c.root.visible = false;
      ctx.music.setCue('descent', true);
      ctx.sfx.bed('capital', 'capitalRumble');
      ctx.sfx.setBedLevel('capital', 0.14, 1.2);
    },

    exit(ctx) {
      ctx.setCard(null);
    },

    update(ctx, localTime, dt) {
      const stage = ctx.stage;
      const t = localTime;
      const abs = EPILOGUE_START + t;
      stage.applyCameraRange(ctx.render.camera);
      ctx.render.dofEnabled = false;
      stage.planetPivot.rotation.z = orbitAngle(abs);

      runnerPositionAt(abs, tmpA);
      stage.runner.root.position.copy(tmpA);
      stage.runner.root.rotation.set(0, Math.PI / 2, 0);
      destroyerPositionAt(abs, tmpB);
      stage.destroyer.root.position.copy(tmpB);
      stage.destroyer.root.rotation.set(0, Math.PI / 2, 0);
      stage.destroyer.standDown();
      stage.runner.engines.throttle = 0.02;

      const pod = stage.pod;
      podPositionAt(abs, LAUNCH_T, tmpA);
      pod.root.position.copy(tmpA);
      podPositionAt(abs + 0.1, LAUNCH_T, tmpB);
      pod.root.lookAt(tmpB);
      pod.engines.throttle = clamp01(0.45 - ramp(t, 4, 12) * 0.4);
      // Atmospheric heating ramps as it drops toward the surface.
      const reentry = ramp(t, 4, 16);
      pod.setReentry(reentry);
      ctx.sfx.setBedPosition('reentry', tmpA);
      ctx.render.bloomBoost = Math.max(ctx.render.bloomBoost, reentry * 0.18);

      if (dt > 0 && reentry > 0.2) {
        stage.fx.puffSmoke({
          origin: tmpA,
          count: 1,
          radius: 1.5,
          speed: 3,
          size0: 2.5,
          size1: 22,
          life: 2.2,
          alpha: 0.2 * reentry,
          color: 0xffb37a,
          color1: 0x6b4a34,
        });
        stage.fx.flash({ origin: tmpA, size: 4 + reentry * 8, color: 0xffb070, life: 0.25 });
      }

      // The closing line is continuous state, not a one-shot: it must appear
      // identically whether the viewer played here or scrubbed here.
      ctx.setCard(t >= 15 ? EPILOGUE_CARD : null);

      // Fade out at the very end so Explore mode opens on a calm frame.
      ctx.render.fade = ramp(t, EPILOGUE_DURATION - 2.5, EPILOGUE_DURATION - 0.2) * 0.55;
    },
  };
}
