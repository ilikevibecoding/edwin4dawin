import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { customShot } from '../../camera/CameraDirector';
import { clamp01, lerp, ramp, smootherstep } from '../../core/math';
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
  let beam: THREE.Mesh | null = null;

  const posRunner = (t: number, out: THREE.Vector3): THREE.Vector3 =>
    runnerPositionAt(CAPTURE_START + t, out);
  const posDestroyer = (t: number, out: THREE.Vector3): THREE.Vector3 =>
    destroyerPositionAt(CAPTURE_START + t, out);

  function ensureBeam(ctx: ShowContext): THREE.Mesh {
    if (beam) return beam;
    const geo = new THREE.CylinderGeometry(26, 60, 1, 24, 1, true);
    geo.translate(0, -0.5, 0);
    const pos = geo.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const f = clamp01(1 + pos.getY(i)) * 0.9 + 0.1;
      col[i * 3] = f;
      col[i * 3 + 1] = f;
      col[i * 3 + 2] = f;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    beam = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: 0x8fd8ff,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    beam.name = 'TractorBeam';
    beam.renderOrder = 4;
    ctx.stage.spaceRoot.add(beam);
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

      return [
        // Wide two-shot: the whole point is the size difference.
        customShot({ id: 'capture.wide', start: S, end: S + 17, fov: 40, handheld: 0.35, blend: 1.4 }, (k, t, out) => {
          const r = runnerAt(t);
          const d = destroyerAt(t);
          const mid = new THREE.Vector3().addVectors(r, d).multiplyScalar(0.5);
          const a = smootherstep(k);
          out.position.set(mid.x - 520 + a * 200, mid.y - 150 + a * 60, mid.z + lerp(1450, 1080, a));
          out.target.copy(mid).add(new THREE.Vector3(a * 60, -30, 0));
          out.fov = lerp(43, 38, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // Rising along the beam to the destroyer's belly.
        customShot({ id: 'capture.beam', start: S + 17, end: S + 27, fov: 46, handheld: 0.45, blend: 1.2 }, (k, t, out) => {
          const r = runnerAt(t);
          const a = smootherstep(k);
          out.position.set(r.x + lerp(230, 120, a), r.y + lerp(-40, 20, a), r.z + lerp(210, 132, a));
          out.target.set(r.x, r.y + lerp(0, 44, a), r.z);
          out.fov = lerp(48, 42, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // Push in on the runner's flank airlock until the frame whites out.
        customShot({ id: 'capture.airlock', start: S + 27, end: S + CAPTURE_DURATION, fov: 42, handheld: 0.7, blend: 1.0 }, (k, t, out) => {
          const r = runnerAt(t);
          const a = smootherstep(k);
          const target = new THREE.Vector3(r.x - 26, r.y - 4, r.z + 13);
          out.position.set(
            lerp(r.x - 120, target.x + 6, a),
            lerp(r.y + 18, target.y + 2, a),
            lerp(r.z + 96, target.z + 14, a),
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
      if (beam) beam.visible = false;
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

      // --- tractor beam ------------------------------------------------------
      const b = ensureBeam(ctx);
      const strength = ramp(t, 3.2, 7) * (1 - ramp(t, 30, 36));
      stage.destroyer.setTractorGlow(strength);
      const mat = b.material as THREE.MeshBasicMaterial;
      mat.opacity = strength * 0.3;
      b.visible = strength > 0.01;
      if (b.visible) {
        stage.destroyer.anchors.tractor.getWorldPosition(tmp);
        const to = stage.runner.root.position;
        b.position.copy(tmp);
        const dir = new THREE.Vector3().subVectors(to, tmp);
        const len = dir.length();
        b.scale.set(1, Math.max(1, len), 1);
        b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
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
