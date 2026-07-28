import * as THREE from 'three';
import type { EngineContext } from '../core/System';
import { SHOT_MODE } from '../core/Config';
import type { LevelSystem } from '../world/Level';
import type { PhysicsSystem } from '../physics/Physics';
import { animateSoldier, buildSoldier, collapseSoldier, type SoldierRig } from '../ai/Soldier';

/**
 * Development-only staging rig for reviewing combat VFX in a capture.
 *
 * The screenshot harness freezes the world a fixed number of ticks after the
 * scenario starts, which is the only way to compare two builds, but it also
 * means an effect is only ever seen at one age: a muzzle flash lasting 35 ms
 * is never in frame at all, and a detonation with a four-second smoke tail is
 * only ever photographed in its first fifth of a second.
 *
 * So this plants a controlled arrangement in front of the camera and *ages*
 * the effect system between spawns rather than waiting for wall-clock ticks —
 * a single review frame then holds a detonation at 40 ms, one at 400 ms and
 * one at two and a half seconds, side by side and at the same scale.
 *
 * Off unless asked for: append `&stage=1` to the harness URL. Keeping it on a
 * flag rather than a constant means the same build produces both the staged
 * review frame and the honest scenario frame, which is the only way to be sure
 * a fix that reads well on the rig also reads well in the game.
 */
export function stageRequested(): boolean {
  if (typeof location === 'undefined') return false;
  const v = new URLSearchParams(location.search).get('stage');
  return v !== null && v !== '' && v !== '0';
}

interface Effects {
  explosion(position: THREE.Vector3, radius: number, scale: number): void;
  muzzle(position: THREE.Vector3, direction: THREE.Vector3): void;
  impact(point: THREE.Vector3, normal: THREE.Vector3, dir: THREE.Vector3, surface: string): void;
  /** Steps the particle simulation forward without rendering. */
  advance(seconds: number): void;
  /** Live particles and analytic fog volumes, for the review log. */
  census(): string;
}

/** The tick the stage plants everything on. */
const ARM_TICK = 2;

/** The harness drives a fixed 60 Hz. */
const HZ = 60;

/**
 * The tick the harness photographs, read from the same query parameter it
 * reads. Everything staged is dated backwards from here.
 *
 * Getting this from the URL rather than assuming it is why the muzzle flash is
 * in the picture at all. Ageing effects at arm time and then letting the
 * harness run its remaining warm-up adds that warm-up to every age: a flash
 * planted "fourteen milliseconds old" was 214 ms old by the time the shutter
 * opened, which is six times its entire lifetime, so the one effect the rig
 * exists to review was never once in a frame of it.
 */
function captureTick(): number {
  if (typeof location === 'undefined') return 60;
  const v = Number(new URLSearchParams(location.search).get('warmup') ?? NaN);
  return Number.isFinite(v) ? v : 60;
}

export class DebugStage {
  private armed = false;
  private clock = 0;
  private tick = 0;
  /** Events still waiting for their tick, newest age last. */
  private pending: Array<{ tick: number; run: () => void }> = [];
  private readonly soldiers: Array<{
    rig: SoldierRig;
    mode: 'walk' | 'aim' | 'die';
    phase: number;
    death: number;
  }> = [];
  /** Labelled world anchors, logged as pixels so a review can crop to them. */
  private readonly marks: Array<[string, THREE.Vector3]> = [];

  constructor(private readonly effects: Effects) {}

  static enabled(): boolean {
    return SHOT_MODE && stageRequested();
  }

  update(dt: number, ctx: EngineContext): void {
    this.clock += dt;
    this.tick++;
    if (!this.armed && this.tick >= ARM_TICK) this.arm(ctx);
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i].tick > this.tick) continue;
      this.pending[i].run();
      this.pending.splice(i, 1);
    }
    // Whatever is wrong with a review frame, the first question is always
    // whether the thing being blamed is even in it.
    if (this.armed && this.tick % 6 === 0) {
      console.info(`[stage] t${this.tick} ${this.effects.census()}`);
    }

    for (const s of this.soldiers) {
      s.phase += dt * 7;
      if (s.mode === 'die') {
        s.death = Math.min(1, s.death + dt * 1.15);
        collapseSoldier(s.rig, s.death, 1);
      } else {
        animateSoldier(s.rig, {
          speed: s.mode === 'walk' ? 3.4 : 0,
          phase: s.phase,
          strafe: 0,
          aimYaw: s.mode === 'aim' ? 0.12 : 0,
          aimPitch: s.mode === 'aim' ? -0.05 : 0,
          crouch: 0,
          aiming: s.mode === 'aim' ? 1 : 0,
          recoil: s.mode === 'aim' ? 0.02 : 9,
          flinch: 0,
          elapsed: this.clock,
        });
      }
    }
  }

  private arm(ctx: EngineContext): void {
    this.armed = true;
    const cam = ctx.camera;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).setY(0).normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const eye = cam.position.clone();
    const physics = ctx.get<PhysicsSystem>('physics');

    // The view model is a metre from the lens and covers a third of the frame,
    // which is correct in play and useless in review. Hidden for the staged
    // frame only; the honest scenario captures still carry it.
    const held = ctx.viewScene.getObjectByName('viewmodel');
    if (held) held.visible = false;

    // The deck the camera itself is standing on. Everything staged sits on
    // this plane unless the world genuinely steps up or down under it, which
    // is the only way to tell a street from the roof of a market awning that
    // happens to be between the two.
    const under = physics?.trace(eye.clone(), DOWN, 12);
    const deck = under?.hit ? under.point.y : eye.y - 1.65;

    const floorAt = (x: number, z: number): number => {
      const hit = physics?.trace(new THREE.Vector3(x, deck + 2.4, z), DOWN, 10);
      if (hit?.hit && Math.abs(hit.point.y - deck) < 2.0) return hit.point.y;
      return deck;
    };

    /**
     * A seat, in metres forward and sideways of the lens.
     *
     * Deliberately not in screen fractions. At twenty metres this camera's
     * frame is forty metres wide, so asking for two thirds of the way across
     * it puts a prop thirteen metres off the centreline — through the shop
     * fronts and out the far side of the block. The street is about eight
     * metres of clear floor, and that, not the frustum, is what the layout has
     * to fit inside.
     */
    const seat = (lateral: number, dist: number, lift: number): THREE.Vector3 => {
      const p = eye.clone()
        .addScaledVector(fwd, dist)
        .addScaledVector(right, lateral);
      p.y = floorAt(p.x, p.z) + lift;
      return p;
    };
    /**
     * A seat the lens can actually see. The street is full of jersey barriers
     * and market stalls, and a soldier planted on a nominal mark spends the
     * review behind one of them — three captures were spent concluding that a
     * death pose "read as a green blob" when four fifths of it was behind a
     * concrete block. Walks the mark outward until the chest is visible.
     */
    const clearSeat = (lateral: number, dist: number): THREE.Vector3 => {
      let best = seat(lateral, dist, 0);
      for (let step = 0; step <= 8; step++) {
        const p = seat(lateral, dist + step * 0.9, 0);
        const to = p.clone().setY(p.y + 1.1).sub(eye);
        const len = to.length();
        const hit = physics?.trace(eye.clone(), to.normalize(), len - 0.4);
        if (!hit?.hit) return p;
        if (step === 0) best = p;
      }
      return best;
    };

    // Pixels, not normalised coordinates. Every review of this rig ends in a
    // crop, and converting a frustum fraction into a rectangle by hand each
    // time is both tedious and the source of several crops of empty street
    // that were read as "the effect is missing".
    const onScreen = (p: THREE.Vector3): string => {
      const q = p.clone().project(cam);
      const w = typeof window === 'undefined' ? 960 : window.innerWidth;
      const h = typeof window === 'undefined' ? 540 : window.innerHeight;
      return `${Math.round((q.x * 0.5 + 0.5) * w)}px,${Math.round((0.5 - q.y * 0.5) * h)}px`;
    };

    // Every event is authored as "how old should this be in the captured
    // frame". Anything younger than the warm-up still to run is scheduled on a
    // future tick and left to the simulation; anything older than that is
    // planted now and the field is aged forward to make up the difference.
    const shutter = captureTick();
    const live = Math.max(0, (shutter - ARM_TICK) / HZ);
    const script: Array<{ age: number; run: () => void }> = [];
    const plan = (age: number, run: () => void): void => {
      if (age <= live) {
        this.pending.push({ tick: Math.max(this.tick, Math.round(shutter - age * HZ)), run });
      } else {
        script.push({ age: age - live, run });
      }
    };

    // One detonation, held at whichever moment the review is about.
    //
    // Three of them side by side was the wrong instrument. This camera's
    // horizontal half-angle puts a metre of lateral offset at thirty metres
    // barely two per cent of the way across the frame, and the street is eight
    // metres of clear floor: every arrangement that fits in the world lands
    // three blasts on top of each other around the centre of the picture, and
    // what gets reviewed is the sum of them rather than any one. `stage=2` and
    // `stage=3` hold the same blast at half a second and at two seconds.
    //
    // `stage=4` is the character rig on its own and `stage=5` the small-arms
    // set on its own, because a detonation eighteen metres away sets the auto
    // exposure and throws bloom over everything else in the frame — every
    // judgement about a muzzle flash or a uniform made in front of one is a
    // judgement about the explosion.
    const phase = Number(new URLSearchParams(location.search).get('stage') ?? 1);
    const wantsBlast = phase <= 3;
    const wantsArms = phase !== 4;
    const age = phase >= 3 ? 2.2 : phase === 2 ? 0.55 : 0.10;
    if (wantsBlast) {
      // Right of the centreline. On the left at seventeen metres the blast
      // sits behind a market shack and two reviews were spent judging a
      // detonation through a corrugated roof.
      const seat0 = seat(2.2, 15, 0.5);
      this.marks.push(['boom', seat0.clone().setY(seat0.y + 2.5)]);
      plan(age, () => this.effects.explosion(seat0.clone(), 6, 1.15));
    }

    // A muzzle flash caught mid-burn, plus the powder smoke of the shot before.
    // Hung off the *lens* height rather than off the floor: this camera sits
    // three metres up, so a muzzle authored at a shooter's shoulder height
    // above the deck is thirty degrees below the bottom of the frame.
    if (wantsArms) {
      const gun = seat(-1.6, phase === 5 ? 2.6 : 4.0, 0);
      gun.y = eye.y - 0.30;
      this.marks.push(['muzzle', gun.clone()]);
      plan(0.22, () => this.effects.muzzle(gun.clone(), fwd));
      plan(0.014, () => this.effects.muzzle(gun.clone(), fwd));
    }

    // Impacts against whatever is actually downrange, walked back in age.
    if (physics && wantsArms) {
      // `stage=5` walks them across the open road six to nine metres out,
      // where the camera is looking down at the surface from three metres up
      // and a decal is a decal rather than four pixels of edge-on awning. The
      // review phases spread them downrange instead, where they have to
      // compete with everything else in the frame.
      //
      // Aiming these by frustum fraction was the mistake. A fixed set of
      // normalised coordinates lands wherever the street furniture happens to
      // be that build, and three reviews were spent looking at a market stall
      // frame at sixteen metres and concluding the impact system was dead.
      for (let i = 0; i < 6; i++) {
        const dir = phase === 5
          ? fwd.clone().multiplyScalar(6.0 + i * 0.6)
            .addScaledVector(right, -1.5 + i * 0.6)
            .setY(deck - eye.y).normalize()
          : new THREE.Vector3(-0.5 + i * 0.2, -0.12 + (i % 2) * 0.14, 0.5)
            .unproject(cam).sub(eye).normalize();
        const hit = physics.trace(eye.clone(), dir, phase === 5 ? 14 : 40);
        if (!hit.hit) continue;
        if (i === 0) this.marks.push(['impact', hit.point.clone()]);
        const point = hit.point.clone();
        const normal = hit.normal.clone();
        const surface = hit.surface;
        plan(0.03 + i * 0.05, () => this.effects.impact(point, normal, dir, surface));
      }
      // And a flesh hit, so the gore is reviewable. Placed at the lens height
      // for the same reason the muzzle is.
      const target = seat(1.4, phase === 5 ? 5.0 : 6.5, 0);
      target.y = eye.y - 0.25;
      this.marks.push(['blood', target.clone()]);
      plan(0.10, () => this.effects.impact(target, fwd.clone().negate(), fwd.clone(), 'flesh'));
    }

    script.sort((a, b) => b.age - a.age);
    let now = script.length > 0 ? script[0].age : 0;
    for (const step of script) {
      const wait = now - step.age;
      if (wait > 0) this.effects.advance(wait);
      now = step.age;
      step.run();
    }
    if (now > 0) this.effects.advance(now);

    // Soldiers close enough to judge silhouette, gear and animation.
    //
    // Distance is the whole difficulty. The lens is three metres up, so a man
    // staged at four metres is seen from above his own helmet with his boots
    // off the bottom of the frame — which is the one part of a walk cycle
    // worth looking at. Seven metres and out puts the full figure inside the
    // picture at a plausible engagement angle, and the yaws are chosen so the
    // set shows a front, a three-quarter and a profile rather than three backs.
    // The rig faces its own local +Z and the camera looks along `fwd`, so a
    // yaw of zero puts a soldier's back to the lens. Which is what the last
    // arrangement did to all three of them, and then the review concluded the
    // arms were missing — they were on the far side of the plate carrier. Half
    // a turn is face-on; the offsets from it are what set the three-quarter.
    const away = Math.atan2(fwd.x, fwd.z);
    const level = ctx.get<LevelSystem>('level');
    if (level) {
      const poses: Array<['walk' | 'aim' | 'die', number, number, number, number]> = [
        // Three-quarter rather than face-on for the shooter. A rifle held
        // toward the lens is 0.86 m of geometry foreshortened into about four
        // pixels, and two reviews were spent concluding the weapon was "too
        // short" when it was simply pointing at the camera.
        ['aim', -2.4, 7.5, Math.PI * 1.34, 0],
        ['walk', 0.6, 9.5, Math.PI * 0.55, 0],
        ['die', 2.6, 6.8, Math.PI * 1.30, 1.0],
      ];
      for (let i = 0; i < poses.length; i++) {
        const [mode, lateral, dist, yaw, death] = poses[i];
        const rig = buildSoldier(level.materials, i);
        rig.root.position.copy(clearSeat(lateral, dist));
        rig.root.rotation.y = away + yaw;
        ctx.scene.add(rig.root);
        this.soldiers.push({ rig, mode, phase: i * 1.7, death });
        this.marks.push([mode, rig.root.position.clone().setY(rig.root.position.y + 0.9)]);
      }
    }
    const fmt = (v: THREE.Vector3): string =>
      `(${v.x.toFixed(1)},${v.y.toFixed(1)},${v.z.toFixed(1)})`;
    console.info(
      `[stage] armed ${script.length} aged + ${this.pending.length} scheduled,` +
      ` ${this.soldiers.length} soldiers; shutter=t${shutter} live=${live.toFixed(2)}s` +
      ` eye=${fmt(eye)} deck=${deck.toFixed(2)} fwd=${fmt(fwd)}` +
      ` phase=${phase} age=${age}` +
      ` marks=[${this.marks.map(([k, p]) => `${k}@${onScreen(p)}`).join(' ')}]`,
    );
  }
}

const DOWN = new THREE.Vector3(0, -1, 0);
