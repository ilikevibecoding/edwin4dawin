import * as THREE from 'three';
import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { customShot, followShot } from '../../camera/CameraDirector';
import { clamp, clamp01, lerp, ramp, smootherstep } from '../../core/math';
import {
  destroyerPositionAt,
  orbitAngle,
  orientShip,
  runnerPositionAt,
  sampleFlight,
  type FlightState,
} from '../flight';
import { freshRng } from '../../core/Random';

export const PURSUIT_START = 84;
export const PURSUIT_DURATION = 92;

const FIRE_START = 30;
const FIRE_END = 78;
const SALVO_INTERVAL = 1.35;
const BOLT_SPEED = 1500;

/**
 * Chapter 3 — The pursuit.
 *
 * The runner enters at speed, the destroyer overtakes from behind and above,
 * and the exchange runs on a deterministic salvo schedule: salvo *n* is derived
 * from local time, so scrubbing never double-fires and never desynchronises the
 * damage state from the picture.
 */
export function pursuitChapter(): Chapter<ShowContext> {
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
  const firedSalvos = new Set<number>();
  const rng = freshRng('pursuit-salvos');
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpC = new THREE.Vector3();
  let damage = 0;

  const posRunner = (t: number, out: THREE.Vector3): THREE.Vector3 =>
    runnerPositionAt(PURSUIT_START + t, out);
  const posDestroyer = (t: number, out: THREE.Vector3): THREE.Vector3 =>
    destroyerPositionAt(PURSUIT_START + t, out);

  function applyImpact(ctx: ShowContext, world: THREE.Vector3, strength: number, shielded: boolean): void {
    const stage = ctx.stage;
    if (shielded) {
      stage.runnerShield.setStrength(0.16);
      tmpC.copy(world);
      stage.runner.root.worldToLocal(tmpC);
      stage.runnerShield.strike(tmpC);
      ctx.sfx.shield({ position: world, gain: 0.3 * strength, refDistance: 60, maxDistance: 4000 });
      stage.fx.flash({ origin: world, size: 26 * strength, color: 0x9fd4ff, life: 0.3 });
      stage.fx.burstSparks({
        origin: world,
        count: 14,
        speed: 55 * strength,
        color: 0xa8e0ff,
        life: 0.6,
        gravity: 0,
        width: 0.5,
      });
    } else {
      stage.fx.impact({
        point: world,
        scale: 11 * strength,
        color: 0xffb070,
        smoke: true,
        debris: true,
      });
      ctx.sfx.impact(1.6 * strength, { position: world, gain: 0.5, refDistance: 60, maxDistance: 4000 });
      damage = clamp01(damage + 0.07 * strength);
      stage.runner.setDamage(damage);
    }
    // Shake falls off with distance so nearby hits feel heavier.
    const camDist = ctx.render.camera.position.distanceTo(world);
    ctx.director.impulse(clamp(((shielded ? 0.35 : 0.8) * strength * 260) / (camDist + 120), 0, 1.1));
  }

  function fireSalvo(ctx: ShowContext, index: number): void {
    const stage = ctx.stage;
    if (!stage.destroyer.root.visible) return;
    const r = freshRng(`salvo:${index}`);
    stage.runner.root.getWorldPosition(tmpA);
    const ready = stage.destroyer.trackTarget(tmpA);
    if (ready.length === 0) return;
    const shots = Math.min(ready.length, 1 + (index % 3));
    for (let i = 0; i < shots; i++) {
      const turret = ready[(index + i * 3) % ready.length];
      turret.cooldown = SALVO_INTERVAL * 1.6;
      turret.fire();
      turret.muzzleWorld(i % 2, tmpB);

      // Aim with a lead and a deliberate scatter; roughly one in three lands.
      const hit = r.next() < 0.4;
      const spread = hit ? 6 : r.range(40, 130);
      tmpC
        .copy(tmpA)
        .add(stage.runner.root.getWorldDirection(new THREE.Vector3()).multiplyScalar(r.range(-20, 40)))
        .add(new THREE.Vector3(r.spread(spread), r.spread(spread * 0.7), r.spread(spread)));

      const shielded = damage < 0.62;
      stage.fx.flash({
        origin: tmpB,
        size: 30,
        color: 0x9dff72,
        life: 0.16,
        light: { intensity: 900, distance: 700, color: 0x9dff72 },
      });
      ctx.sfx.turbolaser({ position: tmpB, gain: 0.4, refDistance: 200, maxDistance: 9000 });

      const target = tmpC.clone();
      stage.fx.fireBolt({
        from: tmpB.clone(),
        to: target,
        speed: BOLT_SPEED,
        color: 0x8bff5a,
        length: 46,
        width: 5.2,
        onHit: hit
          ? (p) => applyImpact(ctx, p, 0.75 + r.next() * 0.5, shielded)
          : (p) => {
              // Near miss: a small flash where it passes so it still registers.
              stage.fx.flash({ origin: p, size: 6, color: 0x8bff5a, life: 0.12 });
            },
      });
    }

    // Return fire from the runner's ventral blister, every third salvo.
    if (index % 3 === 1 && damage < 0.8) {
      stage.runner.root.updateWorldMatrix(true, false);
      const from = new THREE.Vector3(0, -stage.runner.radius * 1.1, 5).applyMatrix4(
        stage.runner.root.matrixWorld,
      );
      stage.destroyer.root.getWorldPosition(tmpB);
      tmpB.add(new THREE.Vector3(r.spread(200), r.spread(90), r.spread(200)));
      stage.fx.fireBolt({
        from,
        to: tmpB.clone(),
        speed: BOLT_SPEED * 0.9,
        color: 0xff5a3a,
        length: 24,
        width: 2.6,
        onHit: (p) => {
          stage.fx.flash({ origin: p, size: 18, color: 0xffb070, life: 0.22 });
          stage.fx.burstSparks({ origin: p, count: 10, speed: 40, color: 0xffc07a, gravity: 0, width: 0.4 });
          ctx.sfx.impact(1.1, { position: p, gain: 0.28, refDistance: 200, maxDistance: 8000 });
        },
      });
      ctx.sfx.blaster({ position: from, gain: 0.2, pitch: 0.55, refDistance: 60, maxDistance: 3000 });
    }
  }

  return {
    id: 'pursuit',
    title: 'The Pursuit',
    synopsis: 'A corvette runs. Something a mile long comes over the top of it.',
    start: PURSUIT_START,
    duration: PURSUIT_DURATION,

    beats: [
      {
        t: 0.1,
        id: 'ships-on',
        fire(ctx) {
          ctx.stage.runner.root.visible = true;
          ctx.stage.destroyer.root.visible = true;
          ctx.music.setCue('pursuit', true);
          ctx.sfx.bed('runner', 'runnerEngine');
          ctx.sfx.setBedLevel('runner', 0.22, 1.2);
        },
      },
      {
        t: 15,
        id: 'destroyer-audible',
        fire(ctx) {
          ctx.sfx.bed('capital', 'capitalRumble');
          ctx.sfx.setBedLevel('capital', 0.05, 4);
        },
      },
      {
        t: 26,
        id: 'destroyer-reveal',
        fire(ctx) {
          ctx.music.setCue('empire');
          ctx.sfx.setBedLevel('capital', 0.4, 6);
          ctx.render.bloomBoost = 0.18;
        },
      },
      {
        t: FIRE_START - 0.5,
        id: 'weapons-free',
        fire(ctx) {
          ctx.stage.runnerShield.setStrength(0.1);
        },
      },
      {
        t: 62,
        id: 'shields-fail',
        fire(ctx) {
          ctx.stage.runnerShield.setStrength(0);
          ctx.sfx.shield({ gain: 0.4 });
          ctx.director.impulse(0.5);
        },
      },
      {
        t: 78,
        id: 'engines-die',
        fire(ctx) {
          ctx.sfx.setBedLevel('runner', 0.02, 2.5);
          ctx.sfx.impact(2.2, { gain: 0.5 });
          ctx.director.impulse(0.85);
          ctx.music.setCue('capture');
        },
      },
    ],

    shots(ctx) {
      const stage = ctx.stage;
      const S = PURSUIT_START;
      const runnerAt = (t: number): THREE.Vector3 => runnerPositionAt(t, new THREE.Vector3());
      const destroyerAt = (t: number): THREE.Vector3 => destroyerPositionAt(t, new THREE.Vector3());

      return [
        // 1. Entry: a fixed frame the runner streaks through, then follows.
        customShot({ id: 'pursuit.entry', start: S, end: S + 12, fov: 42, handheld: 0.5, blend: 0 }, (k, t, out) => {
          const p = runnerAt(t);
          const a = smootherstep(clamp01((k - 0.3) / 0.7));
          out.position.set(lerp(-180, p.x - 210, a), lerp(120, p.y + 42, a), lerp(760, p.z + 240, a));
          out.target.copy(p);
          out.fov = lerp(40, 44, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // 2. Tracking three-quarter, planet filling the lower frame.
        followShot({
          id: 'pursuit.track',
          start: S + 12,
          end: S + 26,
          subject: stage.runner.root,
          worldSpaceOffset: true,
          offset: new THREE.Vector3(-190, 46, 205),
          offsetTo: new THREE.Vector3(-96, 24, 158),
          lookOffset: new THREE.Vector3(10, 0, 0),
          fov: 44,
          blend: 1.1,
          handheld: 0.55,
        }),

        // 3. The reveal: low and behind, looking back and up as the bow arrives.
        customShot({ id: 'pursuit.reveal', start: S + 26, end: S + 46, fov: 50, handheld: 0.5, blend: 0 }, (k, t, out) => {
          const r = runnerAt(t);
          const d = destroyerAt(t);
          const a = smootherstep(k);
          out.position.set(r.x - 250 + a * 60, r.y - 56 - a * 14, r.z + 138 - a * 22);
          // Aim drifts from the runner up to the oncoming hull.
          const aim = clamp01((k - 0.12) / 0.55);
          out.target.set(
            lerp(r.x, lerp(r.x, d.x - 380, 0.55), aim),
            lerp(r.y, d.y - 120, aim * 0.85),
            lerp(r.z, d.z + 40, aim * 0.5),
          );
          out.fov = lerp(48, 58, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // 4. Underside: the hull crosses the top of frame, runner tiny below.
        customShot({ id: 'pursuit.belly', start: S + 46, end: S + 58, fov: 62, handheld: 0.62, blend: 1.2 }, (k, t, out) => {
          const r = runnerAt(t);
          const d = destroyerAt(t);
          const a = smootherstep(k);
          out.position.set(r.x - 120 - a * 40, r.y - 76, r.z + 118 + a * 26);
          out.target.set(lerp(d.x - 500, d.x + 260, a), d.y - 210 + a * 40, d.z + 30);
          out.fov = 62;
          out.focus = out.position.distanceTo(out.target);
        }),

        // 5. Battle profile: both ships legible, bolts crossing the gap.
        customShot({ id: 'pursuit.profile', start: S + 58, end: S + 74, fov: 40, handheld: 0.45, blend: 1.4 }, (k, t, out) => {
          const r = runnerAt(t);
          const d = destroyerAt(t);
          const mid = new THREE.Vector3().addVectors(r, d).multiplyScalar(0.5);
          const a = smootherstep(k);
          out.position.set(mid.x + lerp(-260, 240, a), mid.y - 90, mid.z + lerp(1500, 1180, a));
          out.target.copy(mid).add(new THREE.Vector3(0, lerp(-40, 20, a), 0));
          out.fov = lerp(42, 37, a);
          out.focus = out.position.distanceTo(out.target);
        }),

        // 6. Close on the runner as the hits land.
        followShot({
          id: 'pursuit.hits',
          start: S + 74,
          end: S + 86,
          subject: stage.runner.root,
          worldSpaceOffset: true,
          offset: new THREE.Vector3(96, 26, 118),
          offsetTo: new THREE.Vector3(58, 12, 76),
          lookOffset: new THREE.Vector3(0, 2, 0),
          fov: 46,
          blend: 1.0,
          handheld: 0.9,
        }),

        // 7. Dead in space.
        followShot({
          id: 'pursuit.adrift',
          start: S + 86,
          end: S + PURSUIT_DURATION,
          subject: stage.runner.root,
          worldSpaceOffset: true,
          offset: new THREE.Vector3(-130, 20, -140),
          offsetTo: new THREE.Vector3(-176, 34, -186),
          lookOffset: new THREE.Vector3(0, 0, 0),
          fov: 44,
          blend: 1.3,
          handheld: 0.5,
        }),
      ];
    },

    enter(ctx, localTime, scrubbed) {
      const stage = ctx.stage;
      stage.setLocation('space');
      stage.planetPivot.visible = true;
      stage.runner.root.visible = true;
      stage.destroyer.root.visible = localTime > 0.05;
      stage.pod.root.visible = false;
      ctx.setCard(null);
      rng.reset();
      if (scrubbed) {
        // Rebuild the accumulated damage and salvo history deterministically.
        firedSalvos.clear();
        const salvosDone = Math.max(0, Math.floor((localTime - FIRE_START) / SALVO_INTERVAL) + 1);
        for (let i = 0; i < salvosDone; i++) firedSalvos.add(i);
        damage = clamp01(salvosDone * 0.4 * 0.09);
        stage.runner.setDamage(damage);
        stage.fx.reset();
        stage.runnerShield.setStrength(localTime > 62 || localTime < FIRE_START ? 0 : 0.1);
      }
      ctx.music.setCue(localTime > 78 ? 'capture' : localTime > 26 ? 'empire' : 'pursuit', scrubbed);
      ctx.sfx.bed('runner', 'runnerEngine');
      ctx.sfx.setBedLevel('runner', localTime > 78 ? 0.02 : 0.22, 0.6);
      if (localTime > 15) {
        ctx.sfx.bed('capital', 'capitalRumble');
        ctx.sfx.setBedLevel('capital', localTime > 26 ? 0.4 : 0.05, 1.0);
      }
    },

    exit(ctx) {
      ctx.stage.runnerShield.setStrength(0);
    },

    update(ctx, localTime, dt) {
      const stage = ctx.stage;
      const tau = localTime;
      ctx.render.fade = 0;
      ctx.stage.applyCameraRange(ctx.render.camera);
      stage.planetPivot.rotation.z = orbitAngle(PURSUIT_START + tau);

      // --- ship kinematics ---------------------------------------------------
      sampleFlight(posRunner, tau, runnerState);
      stage.runner.root.position.copy(runnerState.position);
      orientShip(stage.runner.root, runnerState, { lateralGain: 0.055, bankGain: 0.05, maxBank: 0.6 });

      sampleFlight(posDestroyer, tau, destroyerState);
      stage.destroyer.root.position.copy(destroyerState.position);
      orientShip(stage.destroyer.root, destroyerState, { lateralGain: 0.012, bankGain: 0.004, maxBank: 0.08 });
      stage.destroyer.root.visible = tau > 0.05;

      // --- power and damage state -------------------------------------------
      const dying = ramp(tau, 76, 84);
      stage.runner.engines.throttle = 1 - dying * 0.94;
      stage.runner.setCockpitLights(1 - dying * 0.75);
      stage.destroyer.engines.throttle = 1;

      // --- turret tracking ---------------------------------------------------
      if (tau > 20 && tau < FIRE_END + 4) {
        stage.runner.root.getWorldPosition(tmpA);
        stage.destroyer.trackTarget(tmpA);
      } else {
        stage.destroyer.standDown();
      }

      // --- deterministic salvo schedule --------------------------------------
      if (tau >= FIRE_START && tau <= FIRE_END && dt > 0) {
        const index = Math.floor((tau - FIRE_START) / SALVO_INTERVAL);
        if (!firedSalvos.has(index)) {
          firedSalvos.add(index);
          fireSalvo(ctx, index);
        }
      }

      // --- venting damage ----------------------------------------------------
      if (dt > 0 && damage > 0.3) {
        const anchors = stage.runner.smokeAnchors;
        for (let i = 0; i < anchors.length; i++) {
          if (rng.next() > dt * (damage * 5)) continue;
          anchors[i].getWorldPosition(tmpA);
          stage.fx.puffSmoke({
            origin: tmpA,
            count: 1,
            radius: 3,
            speed: 12,
            size0: 6,
            size1: 34,
            life: 2.6,
            alpha: 0.35,
            color: 0x6a6f76,
            color1: 0x2b2e33,
          });
          if (rng.bool(0.3)) {
            stage.fx.burstSparks({ origin: tmpA, count: 4, speed: 22, color: 0xffc07a, gravity: 0, width: 0.35 });
          }
        }
      }

      // --- audio placement ---------------------------------------------------
      stage.runner.root.getWorldPosition(tmpA);
      ctx.sfx.setBedPosition('runner', tmpA);
      stage.destroyer.root.getWorldPosition(tmpB);
      ctx.sfx.setBedPosition('capital', tmpB);
      ctx.render.dofEnabled = false;
    },
  };
}
