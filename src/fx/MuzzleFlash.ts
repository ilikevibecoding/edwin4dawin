import * as THREE from 'three';
import { rng } from '../core/MathUtils';
import { Basis } from './Emit';
import { resetDesc, type ParticleGroup } from './ParticleSystem';
import { GLOW } from './Textures';
import type { FXDeps } from './Shared';

const STAR_CELLS = [GLOW.STAR_A, GLOW.STAR_B, GLOW.STAR_C, GLOW.STAR_D, GLOW.STAR_E];

/**
 * How far back to date the ignition, in seconds.
 *
 * A particle's envelope is zero at the instant it is born, and a flash is born
 * and buried inside two or three frames — so the frame that spawns it would draw
 * nothing, and on a frame long enough the flash would never be drawn at all. The
 * primer really does fire somewhere between frames, so starting the flash a few
 * milliseconds in the past is both cheap and closer to the truth: the spawn frame
 * catches it near its peak instead of at zero.
 *
 * Sized to the layers' fade-in and no larger. Overshooting it is worse than
 * having none: the glow group's envelope falls off steeply from the moment it
 * peaks, so a lead of twelve milliseconds against a twenty-millisecond core
 * hands the very first frame a flash that is already two thirds spent, and the
 * player sees a dim orange smudge instead of the thing going off.
 */
const IGNITION_LEAD = 0.005;

/** Beyond this, a muzzle flash's own pool of light is not visible to anyone. */
const LIGHT_RANGE_SQ = 42 * 42;

/**
 * The muzzle flash.
 *
 * Five layers fired together, all of them gone inside 60 ms except the smoke:
 * a multi-lobed star picked from five baked variants at a random roll, a
 * white-hot core inside it, a short cone of burning propellant gas pushed down
 * the bore axis, unburnt powder thrown forward as stretched sparks, and a puff
 * of smoke that lingers and drifts.
 *
 * The first-person flash is authored in view space and added to the viewmodel
 * scene, so it survives the near clip plane at 5 mm; the world flash is the same
 * recipe plus the dynamic light that makes the surroundings jump.
 */
export class MuzzleFlashEffects {
  private readonly basis = new Basis();
  private readonly dir = new THREE.Vector3();
  private readonly point = new THREE.Vector3();

  /** Scales layer counts with the quality tier's particle budget. */
  density = 1;

  constructor(private readonly deps: FXDeps) {}

  flash(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    scale: number,
    suppressed: boolean,
    inViewmodelScene: boolean,
  ): void {
    const groups = this.deps.groups;
    const now = this.deps.now - IGNITION_LEAD;
    const glow = inViewmodelScene ? groups.vGlow : groups.glow;
    const smokeGroup = inViewmodelScene ? groups.vSmoke : groups.dust;
    const sparkGroup = inViewmodelScene ? groups.vSpark : groups.spark;

    this.point.copy(position);
    this.basis.set(direction);

    // A rifle flash is roughly a 20 cm ball of burning gas. Suppressors trap
    // most of it, leaving a small bloom and a lot more gas out of the can.
    //
    // The first-person flash gets a quarter more: it is the one effect in the
    // game the player sees on every single trigger pull, it is a metre from the
    // lens where the shape can actually be read, and at true scale it is a small
    // bright dot behind the front sight with a bloom around it.
    const size = 0.2 * scale * (suppressed ? 0.34 : 1) * (inViewmodelScene ? 1.25 : 1);
    const heat = suppressed ? 0.34 : 1;

    // Per-shot variation. Real flashes are not a sprite stamped at a fixed
    // brightness: the charge burns differently every round, and a burst where
    // every flash is identical reads as a looping animation.
    const shot = rng.range(0.78, 1.3);

    this.star(glow, now, size * shot, heat * shot, 0);
    // A second, smaller lobe thrown off-axis. Five star variants at a random
    // roll are still five *symmetrical* stars; the asymmetry has to come from
    // something being off-centre, and a real flash is lopsided because the gas
    // leaves through whatever the muzzle device lets it out of.
    if (!suppressed && rng.bool(0.72)) {
      this.star(glow, now, size * rng.range(0.4, 0.7), heat * rng.range(0.5, 0.85), 0.35);
    }
    this.core(glow, now, size * shot, heat * shot);
    this.gas(glow, now, size, heat, suppressed);
    this.powder(sparkGroup, now, size, heat, suppressed);
    this.smoke(smokeGroup, now, size, suppressed, inViewmodelScene);

    // Weapons already lights the world for the local player's shot, so only
    // world-space flashes — every AI weapon, and the chopper's minigun — request
    // one here. Past its own falloff distance a muzzle light contributes nothing
    // the player can see and only occupies a pool slot an explosion wants, so a
    // firefight across the map does not spend the budget on itself.
    //
    // Rate limited rather than unconditional. The AI already lights its own
    // shots, so every hostile rifle round would otherwise put two lights in a
    // pool of a handful, and a squad firing together evicts the explosion light
    // that the player actually needs to see. The chopper's minigun has no such
    // light of its own and is the reason this stays here at all; gated, it still
    // gets one on most rounds, which at that rate of fire is a continuous glow.
    if (!inViewmodelScene && !suppressed && this.deps.distanceSqTo(position) < LIGHT_RANGE_SQ) {
      this.deps.requestSmallLight(position, 0xffcb8c, 18 + scale * 34, 5 + scale * 5, 0.06);
    }
  }

  /** The silhouette: a random petal variant at a random roll. */
  private star(
    group: ParticleGroup,
    now: number,
    size: number,
    heat: number,
    offset: number,
  ): void {
    const d = resetDesc();
    if (offset > 0) {
      this.basis.cone(1.4, this.dir);
      d.px = this.point.x + this.basis.axis.x * size * 0.5 + this.dir.x * size * offset;
      d.py = this.point.y + this.basis.axis.y * size * 0.5 + this.dir.y * size * offset;
      d.pz = this.point.z + this.basis.axis.z * size * 0.5 + this.dir.z * size * offset;
    } else {
      d.px = this.point.x;
      d.py = this.point.y;
      d.pz = this.point.z;
    }
    // A shade over two frames at 60 Hz, and the second of them is nearly gone:
    // the group's fade exponent is well above one, so by two thirds of the way
    // through only a tenth of the flash is left. Any shorter and which frame
    // catches it becomes a coin toss — the shot lands somewhere in the sixteen
    // milliseconds between frames, so the life has to cover that gap or the
    // flash is missing from perhaps a third of the rounds fired. Longer, and it
    // tracks with the weapon through the recoil and reads as a lamp bolted to
    // the barrel rather than as something igniting.
    d.life = rng.range(0.038, 0.05);
    // Barely grows. The gas ball is fully formed by the time anything can see
    // it; a flash that visibly expands looks like a small explosion.
    d.size0 = size * 1.0;
    d.size1 = size * 1.22;
    d.roll = rng.range(0, Math.PI * 2);
    d.rollRate = rng.range(-2.5, 2.5);
    // Bright enough to blow out and bloom, not so bright that the petals of the
    // star clip into one white disc. Past about three the tone map has taken the
    // whole sprite to white and the shape the generator worked for is gone; the
    // hot core below is what carries the blown-out centre.
    d.r0 = 3.0 * heat;
    d.g0 = 2.1 * heat;
    d.b0 = 1.0 * heat;
    d.r1 = 1.3 * heat;
    d.g1 = 0.42 * heat;
    d.b1 = 0.09 * heat;
    d.alpha = 1;
    d.additive = 1;
    d.cell = STAR_CELLS[(rng.next() * STAR_CELLS.length) | 0];
    d.fadeIn = 0.12;
    d.priority = 245;
    group.spawn(now, d);
  }

  private core(group: ParticleGroup, now: number, size: number, heat: number): void {
    const d = resetDesc();
    // Sunk slightly into the bore so the core reads as coming out of the barrel.
    d.px = this.point.x - this.basis.axis.x * size * 0.12;
    d.py = this.point.y - this.basis.axis.y * size * 0.12;
    d.pz = this.point.z - this.basis.axis.z * size * 0.12;
    d.life = rng.range(0.028, 0.038);
    d.size0 = size * 0.34;
    d.size1 = size * 0.6;
    d.r0 = 9 * heat;
    d.g0 = 7.4 * heat;
    d.b0 = 5.2 * heat;
    d.r1 = 2.4 * heat;
    d.g1 = 1.0 * heat;
    d.b1 = 0.3 * heat;
    d.alpha = 1;
    d.additive = 1;
    d.cell = GLOW.HOT_CORE;
    d.fadeIn = 0.1;
    d.priority = 250;
    group.spawn(now, d);
  }

  /**
   * Burning propellant leaving the bore: a stack of shrinking puffs pushed along
   * the axis, which reads as a cone without needing the sprite to be oriented.
   */
  private gas(
    group: ParticleGroup,
    now: number,
    size: number,
    heat: number,
    suppressed: boolean,
  ): void {
    const count = suppressed ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      const t = i / count;
      const along = size * (0.28 + t * 1.5);
      this.basis.cone(0.35, this.dir);
      d.px = this.point.x + this.basis.axis.x * along + this.dir.x * size * 0.08;
      d.py = this.point.y + this.basis.axis.y * along + this.dir.y * size * 0.08;
      d.pz = this.point.z + this.basis.axis.z * along + this.dir.z * size * 0.08;
      const speed = (suppressed ? 5.5 : 3.4) * (1 - t * 0.5);
      d.vx = this.basis.axis.x * speed + this.dir.x * 0.5;
      d.vy = this.basis.axis.y * speed + this.dir.y * 0.5;
      d.vz = this.basis.axis.z * speed + this.dir.z * 0.5;
      d.life = rng.range(0.04, 0.095) * (suppressed ? 2.4 : 1);
      d.size0 = size * (0.32 - t * 0.08);
      d.size1 = size * (0.75 + t * 0.6);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-3, 3);
      const g = heat * (1 - t * 0.55);
      d.r0 = 1.5 * g;
      d.g0 = 1.0 * g;
      d.b0 = 0.52 * g;
      d.r1 = 0.26 * g;
      d.g1 = 0.19 * g;
      d.b1 = 0.15 * g;
      d.alpha = suppressed ? 0.7 : 0.5;
      d.additive = suppressed ? 0.45 : 0.8;
      d.drag = 5.5;
      // Radial puffs, never the directional cone sprite. These are camera-facing
      // billboards at a random roll, so a sprite whose shape points somewhere
      // points somewhere arbitrary on screen — a wedge of flame leaving the
      // barrel sideways or straight up. The cone has to come from where the
      // puffs are placed along the bore, which is what the loop above does.
      d.cell = GLOW.SOFT;
      d.fadeIn = 0.15;
      d.priority = 210;
      group.spawn(now, d);
    }
  }

  /** Unburnt powder: hot grains thrown forward that die out in a few frames. */
  private powder(
    group: ParticleGroup,
    now: number,
    size: number,
    heat: number,
    suppressed: boolean,
  ): void {
    const count = Math.max(1, Math.round((suppressed ? 3 : 9) * this.density));
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      this.basis.cone(0.3, this.dir);
      const speed = rng.range(6, 17) * (suppressed ? 0.5 : 1);
      d.px = this.point.x;
      d.py = this.point.y;
      d.pz = this.point.z;
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.06, 0.24);
      d.size0 = size * rng.range(0.035, 0.08);
      d.size1 = d.size0 * 0.5;
      d.r0 = 3.6 * heat;
      d.g0 = 2.3 * heat;
      d.b0 = 0.8 * heat;
      d.r1 = 0.9 * heat;
      d.g1 = 0.11 * heat;
      d.b1 = 0.02;
      d.alpha = 1;
      d.additive = 1;
      d.gravity = 8;
      d.drag = 1.4;
      d.stretch = 0.5;
      d.fadeIn = 0.05;
      d.priority = 175;
      group.spawn(now, d);
    }
  }

  /**
   * The residue. Suppressed weapons dump most of the gas as smoke, which is the
   * main visual tell that a weapon is running a can.
   */
  private smoke(
    group: ParticleGroup,
    now: number,
    size: number,
    suppressed: boolean,
    inViewmodelScene: boolean,
  ): void {
    const count = Math.max(1, Math.round((suppressed ? 5 : 2) * this.density));
    // World-space muzzle smoke lands in the dust group, which is sun-lit; a
    // rifle fired from inside a doorway must not puff a brightly lit wisp.
    const sun = inViewmodelScene ? 1 : this.deps.sunVisibility(this.point);
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      this.basis.cone(0.5, this.dir);
      // Pushed out ahead of the muzzle: in first person this puff is half a
      // metre from the lens, and it has to be a wisp crossing the frame rather
      // than a wall in front of the sight.
      const along = size * rng.range(0.6, 2.2);
      d.px = this.point.x + this.basis.axis.x * along;
      d.py = this.point.y + this.basis.axis.y * along;
      d.pz = this.point.z + this.basis.axis.z * along;
      const speed = rng.range(0.5, 1.8) * (suppressed ? 1.7 : 1);
      d.vx = this.dir.x * speed + this.basis.axis.x * 1.2;
      d.vy = this.dir.y * speed + this.basis.axis.y * 1.2 + 0.35;
      d.vz = this.dir.z * speed + this.basis.axis.z * 1.2;
      d.life = rng.range(0.5, 1.15) * (suppressed ? 1.5 : 1);
      d.size0 = size * 0.35;
      d.size1 = size * rng.range(1.8, 3.0);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-0.9, 0.9);
      d.r0 = 0.3;
      d.g0 = 0.29;
      d.b0 = 0.28;
      d.r1 = 0.2;
      d.g1 = 0.2;
      d.b1 = 0.21;
      d.alpha =
        rng.range(0.1, 0.2) * (suppressed ? 1.7 : 1) * (inViewmodelScene ? 0.65 : 1);
      // Hot gas rises.
      d.gravity = -0.5;
      d.drag = 2.2;
      d.turbulence = 0.35;
      d.cell = (rng.next() * 4) | 0;
      d.fadeIn = 0.2;
      d.softness = 0.35;
      d.sunVisibility = sun;
      d.priority = 120;
      group.spawn(now, d);
    }
  }
}
