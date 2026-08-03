import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { customShot } from '../../camera/CameraDirector';
import { TractorBeam } from '../../fx/TractorBeam';
import { lerp, ramp, smootherstep } from '../../core/math';
import {
  destroyerPositionAt,
  orbitAngle,
  orientShip,
  runnerPositionAt,
  sampleFlight,
  type FlightState,
} from '../flight';

export const CAPTURE_START = 176;
export const CAPTURE_DURATION = 38;

/**
 * Offset from the destroyer's origin to its ventral tractor array, in the
 * stage frame. The wedge holds station on a fixed heading through this
 * chapter, so the shots can use it as a constant rather than needing the live
 * scene graph.
 */
const TRACTOR_OFFSET = new THREE.Vector3(288, -95, 0);

/**
 * Chapter 4 — Capture and docking.
 *
 * Establishes the two ships' relative positions in one unbroken wide shot, then
 * pushes in along the boarding tube. The transition to the interior is a
 * deliberate whiteout match cut: the camera reaches the airlock, the frame
 * blows out, and the next chapter opens on the inside of the same door.
 */
export function captureChapter(): Chapter<ShowContext> {
  const runnerState: FlightState = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    acceleration: new THREE.Vector3(),
  };
  const destroyerState: FlightState = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    acceleration: new THREE.Vector3(),
  };
  const tmp = new THREE.Vector3();
  let beam: TractorBeam | null = null;

  const posRunner = (t: number, out: THREE.Vector3): THREE.Vector3 =>
    runnerPositionAt(CAPTURE_START + t, out);
  const posDestroyer = (t: number, out: THREE.Vector3): THREE.Vector3 =>
    destroyerPositionAt(CAPTURE_START + t, out);

  function ensureBeam(ctx: ShowContext): TractorBeam {
    if (beam) return beam;
    beam = new TractorBeam(26, 74, 0x8fd8ff);
    ctx.stage.spaceRoot.add(beam.mesh);
    return beam;
  }

  return {
    id: 'capture',
    title: 'Capture',
    synopsis: 'A tractor beam takes hold. Boarding tubes lock onto the hull.',
    start: CAPTURE_START,
    duration: CAPTURE_DURATION,

    beats: [
      {
        t: 0.2,
        id: 'setup',
        fire(ctx) {
          ctx.stage.setLocation('space');
          ctx.stage.runner.root.visible = true;
          ctx.stage.destroyer.root.visible = true;
          ctx.music.setCue('capture', true);
        },
      },
      {
        t: 3.5,
        id: 'beam-on',
        fire(ctx) {
          ctx.sfx.shield({ gain: 0.34, pitch: 0.5 });
          ctx.sfx.bed('tractor', 'reentry');
          ctx.sfx.setBedLevel('tractor', 0.09, 2);
        },
      },
      {
        t: 24,
        id: 'contact',
        fire(ctx) {
          ctx.sfx.clamps({ gain: 0.42 });
          ctx.director.impulse(0.5);
          ctx.sfx.setBedLevel('tractor', 0.03, 3);
        },
      },
      {
        t: 28,
        id: 'alarm',
        fire(ctx) {
          ctx.music.setCue('boarding');
          ctx.sfx.bed('alarm', 'alarm');
          ctx.sfx.setBedLevel('alarm', 0.055, 1.5);
        },
      },
      {
        t: CAPTURE_DURATION - 2.6,
        id: 'match-cut',
        fire(ctx) {
          // The whiteout that carries us through the hull.
          ctx.render.fadeColor.setHex(0xdfe6f2);
          ctx.sfx.impact(1.8, { gain: 0.36 });
        },
      },
    ],

    shots(ctx) {
      void ctx;
      const S = CAPTURE_START;
      const runnerAt = (t: number): THREE.Vector3 => runnerPositionAt(t, new THREE.Vector3());
      const destroyerAt = (t: number): THREE.Vector3 => destroyerPositionAt(t, new THREE.Vector3());

      const projectorAt = (t: number): THREE.Vector3 =>
        destroyerAt(t).add(TRACTOR_OFFSET);

      return [
        // Wide two-shot. The camera sits below the destroyer's belly line and
        // above the corvette, so the beam crosses the gap in clean profile
        // instead of hiding behind a kilometre and a half of armour.
        customShot({ id: 'capture.wide', start: S, end: S + 16, fov: 38, handheld: 0.3, blend: 1.4 }, (k, t, out) => {
          const r = runnerAt(t);
          const p = projectorAt(t);
          const mid = new THREE.Vector3().lerpVectors(r, p, 0.5);
          const a = smootherstep(k);
          out.position.set(
            mid.x - lerp(520, 300, a),
            r.y + lerp(-96, -34, a),
            mid.z + lerp(1420, 1010, a),
          );
          out.target.set(mid.x + lerp(90, 40, a), mid.y + lerp(28, 8, a), mid.z - 40);
          out.fov = lerp(42, 38, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // Riding up the beam: the corvette in the lower frame, the ventral
        // hangar mouth opening above it.
        customShot({ id: 'capture.beam', start: S + 16, end: S + 27, fov: 46, handheld: 0.45, blend: 1.3 }, (k, t, out) => {
          const r = runnerAt(t);
          const p = projectorAt(t);
          const a = smootherstep(k);
          out.position.set(
            r.x + lerp(-210, -110, a),
            r.y + lerp(-56, -14, a),
            r.z + lerp(340, 218, a),
          );
          out.target.set(
            lerp(r.x, p.x - 40, a),
            lerp(r.y + 24, p.y - 30, a),
            lerp(r.z, p.z, a),
          );
          out.fov = lerp(50, 45, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // Push in on the corvette's flank airlock until the frame whites out.
        customShot({ id: 'capture.airlock', start: S + 27, end: S + CAPTURE_DURATION, fov: 42, handheld: 0.7, blend: 1.0 }, (k, t, out) => {
          const r = runnerAt(t);
          const a = smootherstep(k);
          const target = new THREE.Vector3(r.x - 20, r.y + 3, r.z + 11);
          out.position.set(
            lerp(r.x - 132, target.x - 14, a),
            lerp(r.y + 26, target.y + 6, a),
            lerp(r.z + 118, target.z + 18, a),
          );
          out.target.copy(target);
          out.fov = lerp(44, 34, a);
          out.focus = out.position.distanceTo(out.target);
        }),
      ];
    },

    enter(ctx, localTime) {
      const stage = ctx.stage;
      stage.setLocation('space');
      stage.runner.root.visible = true;
      stage.destroyer.root.visible = true;
      stage.pod.root.visible = false;
      stage.runnerShield.setStrength(0);
      stage.runner.setDamage(0.72);
      ctx.setCard(null);
      ctx.render.fadeColor.setHex(localTime > CAPTURE_DURATION - 2.6 ? 0xdfe6f2 : 0x000000);
      ensureBeam(ctx);
      ctx.music.setCue(localTime > 28 ? 'boarding' : 'capture', true);
      ctx.sfx.bed('capital', 'capitalRumble');
      ctx.sfx.setBedLevel('capital', 0.42, 0.8);
      ctx.sfx.setBedLevel('runner', 0.02, 0.8);
      if (localTime > 28) {
        ctx.sfx.bed('alarm', 'alarm');
        ctx.sfx.setBedLevel('alarm', 0.055, 0.8);
      }
    },

    exit(ctx) {
      beam?.setStrength(0);
      ctx.render.fadeColor.setHex(0x000000);
      ctx.sfx.stopBed('tractor', 0.6);
    },

    update(ctx, localTime, _dt) {
      const stage = ctx.stage;
      const t = localTime;
      stage.applyCameraRange(ctx.render.camera);
      stage.planetPivot.rotation.z = orbitAngle(CAPTURE_START + t);

      sampleFlight(posRunner, t, runnerState);
      stage.runner.root.position.copy(runnerState.position);
      orientShip(stage.runner.root, runnerState, { lateralGain: 0.02, bankGain: 0.01, maxBank: 0.25 });
      // Dead ship: a slow residual tumble that settles as the beam takes hold.
      const settle = 1 - ramp(t, 4, 22);
      stage.runner.root.rotateZ(Math.sin(t * 0.5) * 0.06 * settle);
      stage.runner.root.rotateX(Math.sin(t * 0.37 + 1) * 0.04 * settle);

      sampleFlight(posDestroyer, t, destroyerState);
      stage.destroyer.root.position.copy(destroyerState.position);
      orientShip(stage.destroyer.root, destroyerState, { lateralGain: 0.01, bankGain: 0.002, maxBank: 0.05 });

      stage.runner.engines.throttle = 0.04;
      stage.runner.setCockpitLights(0.3 + 0.12 * Math.sin(t * 7));
      stage.runner.setDamage(0.72);
      stage.destroyer.standDown();
      // Holding station: the main drives idle down rather than blazing.
      stage.destroyer.engines.throttle = lerp(0.55, 0.16, ramp(t, 0, 12));

      // --- tractor beam ------------------------------------------------------
      const b = ensureBeam(ctx);
      const strength = ramp(t, 3.2, 7) * (1 - ramp(t, 30, 36));
      stage.destroyer.setTractorGlow(strength);
      b.setStrength(strength);
      b.update(CAPTURE_START + t);
      if (strength > 0.01) {
        stage.destroyer.anchors.tractor.getWorldPosition(tmp);
        b.aim(tmp, stage.runner.root.position);
      }

      // --- whiteout into the interior ---------------------------------------
      const whiteout = ramp(t, CAPTURE_DURATION - 2.6, CAPTURE_DURATION - 0.1);
      ctx.render.fade = whiteout;
      if (whiteout > 0.001) ctx.render.fadeColor.setHex(0xdfe6f2);
      ctx.render.bloomBoost = whiteout * 0.5;

      stage.runner.root.getWorldPosition(tmp);
      ctx.sfx.setBedPosition('runner', tmp);
      ctx.render.dofEnabled = false;
    },
  };
}
