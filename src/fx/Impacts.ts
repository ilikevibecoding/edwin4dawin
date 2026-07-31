import * as THREE from 'three';
import { SURFACE_PROPERTIES, type SurfaceType } from '../core/GameTypes';
import { rng, saturate } from '../core/MathUtils';
import { Basis, fxScratch, hexColor } from './Emit';
import { PD, resetDesc } from './ParticleSystem';
import { CHIP, GLOW, BLOOD } from './Textures';
import { familyOf, type FXDeps } from './Shared';

/** Distance beyond which impact detail is thinned out; nobody can see it. */
const NEAR_DETAIL_SQ = 26 * 26;
const FAR_DETAIL_SQ = 60 * 60;

/**
 * How dust coverage is surrendered when a lot of rounds are landing nearby.
 *
 * A single bullet hole puffs about a third of a metre of dust, which is nothing.
 * Four rifles firing on the player for five seconds is several hundred of them,
 * and the overlap of that many translucent sprites is opaque even though not one
 * of them is — which is how a firefight ends up shot through a milky veil.
 * Authoring every puff for the worst case would leave the single hit invisible,
 * so the recipe stays honest and coverage is surrendered only under fire.
 *
 * The measure is the rate of nearby impacts, not how full the dust group is: the
 * group holds thousands of slots and a screen-filling veil is a couple of
 * hundred sprites, so group occupancy never notices the problem it is supposed
 * to be guarding against.
 */
const DUST_RATE_WINDOW = 0.45;
const DUST_RATE_FREE = 7;
const DUST_RATE_FALLOFF = 0.055;
const DUST_RATE_FLOOR = 0.3;
/** Beyond this, an impact is not contributing to what the player sees. */
const DUST_RATE_RANGE_SQ = 38 * 38;

/**
 * Surface-specific impact response.
 *
 * Each family gets its own authored recipe: a dust puff shaped along the normal
 * with a lingering cloud behind it, ejecta with the right mass and colour, and
 * the extras that identify the material — sparks and a light flicker on metal,
 * splinters running with the grain on wood, a glint and falling shards on glass,
 * a column and ripples on water. Colours come from `SURFACE_PROPERTIES` so the
 * dust matches what the world module actually built the wall out of.
 */
export class ImpactEffects {
  private readonly basis = new Basis();
  private readonly dir = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private readonly dustColor = new THREE.Color();
  private readonly dustColorDark = new THREE.Color();

  /** Sun reaching this impact, probed once per hit and shared by every layer. */
  private sun = 1;
  /** Ground height under this impact, so chips and sparks land on it. */
  private floor = 0;
  /** Multiplier applied to dust opacity while rounds are landing in numbers. */
  private pressure = 1;
  /** Decaying estimate of nearby impacts per second. */
  private nearRate = 0;
  private rateTime = -1;

  constructor(private readonly deps: FXDeps) {}

  impact(point: THREE.Vector3, normal: THREE.Vector3, surface: SurfaceType, energy: number): void {
    const e = saturate(energy);
    const props = SURFACE_PROPERTIES[surface] ?? SURFACE_PROPERTIES.concrete;
    this.point.copy(point);
    this.basis.set(normal);
    this.sun = this.deps.sunVisibility(point);
    // Probed from clear of the surface: the hit point sits exactly on the
    // collider, and a downward ray started inside a wall can report the wall
    // itself at zero distance, which would leave chips bouncing off thin air
    // half a metre up the brickwork.
    fxScratch.a.copy(point).addScaledVector(normal, 0.06);
    this.floor = this.deps.groundAt(fxScratch.a.x, fxScratch.a.z, fxScratch.a.y);
    // Effect density falls off with distance; the shape of the effect does not.
    const distanceSq = this.deps.distanceSqTo(point);
    this.pressure = this.dustPressure(distanceSq);

    hexColor(props.dustColor, this.dustColor);
    // Chips and grit are pieces of the surface, not shadows of it: they are the
    // same material seen edge-on, a shade darker than the pulverised dust because
    // they are not powdered. Taking them much below this — and then letting the
    // lit shader darken the thick middle on top — turns every impact into a
    // scatter of black specks.
    this.dustColorDark.copy(this.dustColor).multiplyScalar(0.68);

    const detail =
      distanceSq < NEAR_DETAIL_SQ ? 1 : distanceSq < FAR_DETAIL_SQ ? 0.6 : 0.32;

    switch (familyOf(surface)) {
      case 'masonry':
        this.masonry(e, detail);
        break;
      case 'metal':
        this.metal(e, detail);
        break;
      case 'wood':
        this.wood(e, detail);
        break;
      case 'loose':
        this.loose(e, detail, props.hardness);
        break;
      case 'glass':
        this.glass(e, detail);
        break;
      case 'water':
        this.water(e, detail);
        break;
      case 'foliage':
        this.foliage(e, detail);
        break;
      case 'flesh':
        // Combat routes flesh through bloodSpray; this is the fallback for a
        // stray impact reported as flesh with no direction.
        this.bloodSpray(point, this.basis.axis, 0.5 + e * 0.6);
        break;
      default:
        this.softMaterial(e, detail);
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Families
  // -------------------------------------------------------------------------

  private masonry(e: number, detail: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;

    // Fast pale puff driven out along the normal. Spawned a good handspan clear
    // of the wall: an impact puff has its own depth extent, and one authored
    // flush with the surface spends the first half of its life fading against
    // the very geometry it was thrown off.
    const puffs = Math.max(2, Math.round((3 + e * 4) * detail));
    for (let i = 0; i < puffs; i++) {
      const d = resetDesc();
      this.basis.cone(0.5, this.dir);
      const speed = rng.range(1.3, 2.8) * (0.6 + e * 0.7);
      this.spawnPoint(d, rng.range(0.05, 0.12));
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 0.4;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.42, 0.78);
      d.size0 = rng.range(0.055, 0.1) * (0.7 + e * 0.6);
      // A 5.56 hole throws a puff you could cover with two hands, not one the
      // size of a car door. The old reach put a metre of pale dust on the wall
      // for every round fired.
      d.size1 = d.size0 * rng.range(3.0, 4.6);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-1.4, 1.4);
      // Just under the wall's own albedo. Pulverised material does scatter more
      // light than the solid it came off, but the lit term already peaks above
      // one, so authoring the dust *brighter* than the wall as well stacks two
      // gains on the one thing in the frame that gets the most coverage — which
      // is how a burst of dust ends up several times brighter than the pavement
      // it was knocked out of.
      this.tint(d, this.dustColor, 0.95, this.dustColor, 0.6);
      // Under 1 on purpose. A dust cloud is many translucent puffs whose
      // overlaps build the density; puffs that are individually opaque cannot
      // overlap into anything, they just tile the wall with discs.
      d.alpha = rng.range(0.4, 0.6) * (0.6 + e * 0.45) * this.pressure;
      d.gravity = 0.5;
      d.drag = 3.2;
      d.turbulence = 0.22;
      d.cell = (rng.next() * 4) | 0;
      d.fadeIn = 0.05;
      // Wide enough to actually fade: the band has to be a decent fraction of
      // the sprite's own radius or the quad still cuts a visible straight edge
      // where it crosses the brickwork.
      d.softness = 0.32;
      d.sunVisibility = this.sun;
      d.priority = 90;
      groups.dust.spawn(now, d);
    }

    // The cloud that hangs behind the puff is what makes concrete read as
    // pulverised rather than as a single grey ball.
    if (detail > 0.5) {
      const d = resetDesc();
      this.spawnPoint(d, 0.14);
      this.basis.cone(0.7, this.dir);
      d.vx = this.dir.x * 0.5;
      d.vy = this.dir.y * 0.5 + 0.25;
      d.vz = this.dir.z * 0.5;
      d.life = rng.range(1.0, 1.7);
      d.size0 = 0.16 * (0.7 + e);
      d.size1 = d.size0 * rng.range(3.4, 5);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-0.5, 0.5);
      this.tint(d, this.dustColor, 0.82, this.dustColor, 0.5);
      d.alpha = (0.16 + e * 0.14) * this.pressure;
      d.gravity = 0.25;
      d.drag = 1.1;
      d.turbulence = 0.4;
      d.cell = (rng.next() * 4) | 0;
      d.fadeIn = 0.25;
      d.softness = 0.6;
      d.sunVisibility = this.sun;
      d.priority = 70;
      groups.dust.spawn(now, d);
    }

    this.chips(
      Math.round((5 + e * 9) * detail),
      rng.range(2.6, 4.2),
      0.022,
      0.05,
      STONE_CELLS,
      this.dustColorDark,
      e,
    );
    this.impactSpark(e * 0.35, 0.9, 0xffd7a0);
  }

  private metal(e: number, detail: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;

    // Hot-to-cool spark shower. The colour curve does the work: white through
    // yellow and orange to a dull red just before it dies.
    //
    // The spread of speeds matters as much as the count. Sparks all launched at
    // one speed from one point draw a symmetrical star — a firework, not a
    // ricochet — so a few are thrown four times as far as the rest and live long
    // enough for gravity to bend them into a falling shower.
    const count = Math.max(5, Math.round((14 + e * 28) * detail));
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      this.basis.cone(1.15, this.dir);
      const runner = rng.bool(0.22);
      const speed = rng.range(2.5, runner ? 26 : 10) * (0.55 + e * 0.7);
      // Slid out along its own line rather than launched from the hit point, so
      // the streaks do not share an apex. A common origin is what draws the
      // firework: thirty stretched sprites radiating from one pixel is the shape
      // the eye recognises, and it survives every amount of speed variance.
      const lead = rng.range(0, 0.14) * (0.4 + e);
      this.spawnPoint(d, 0.01);
      d.px += this.dir.x * lead;
      d.py += this.dir.y * lead;
      d.pz += this.dir.z * lead;
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 0.6;
      d.vz = this.dir.z * speed;
      d.life = runner ? rng.range(0.6, 1.25) : rng.range(0.14, 0.5);
      d.size0 = rng.range(0.012, 0.03);
      d.size1 = d.size0 * 0.5;
      // Little blue even at the hot end. A spark is only white for the first few
      // milliseconds and spends the rest of its life cooling, so the blue put in
      // to sell that instant is what the eye actually sees for most of the
      // shower — and a half-cooled spark carrying it comes out pale straw, which
      // reads as a wood splinter rather than as hot steel.
      d.r0 = 3.6;
      d.g0 = 2.2;
      d.b0 = 0.85;
      d.r1 = 0.9;
      d.g1 = 0.12;
      d.b1 = 0.02;
      d.alpha = 1;
      d.additive = 1;
      d.gravity = 11;
      d.drag = 1.1;
      d.stretch = rng.range(0.5, 0.95);
      d.fadeIn = 0.02;
      // The long runners live long enough to reach the ground, and a spark that
      // strikes concrete skips off it. Letting them sink through the pavement
      // instead is the difference between hot metal and orange confetti.
      d.floorY = this.floor;
      d.bounce = 0.42;
      d.priority = 150;
      groups.spark.spawn(now + rng.range(0, 0.02), d);
    }

    // Second generation, skittering along the surface a beat later. Sparks off
    // steel do not fly once and stop: they hit whatever is nearby and go again,
    // dimmer and slower, and that second scatter is most of what makes a burst
    // read as hot metal rather than as a firework.
    const bounces = Math.max(2, Math.round((4 + e * 8) * detail));
    for (let i = 0; i < bounces; i++) {
      const d = resetDesc();
      this.basis.tangent(this.dir);
      const speed = rng.range(1.2, 4.5) * (0.5 + e * 0.6);
      this.spawnPoint(d, 0.02);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + rng.range(0.4, 1.6);
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.12, 0.4);
      d.size0 = rng.range(0.01, 0.02);
      d.size1 = d.size0 * 0.4;
      d.r0 = 1.6;
      d.g0 = 0.9;
      d.b0 = 0.3;
      d.r1 = 0.5;
      d.g1 = 0.05;
      d.b1 = 0.01;
      d.alpha = 1;
      d.additive = 1;
      d.gravity = 12;
      d.drag = 1.6;
      d.stretch = 0.7;
      d.fadeIn = 0.02;
      d.floorY = this.floor;
      d.bounce = 0.3;
      d.priority = 120;
      groups.spark.spawn(now + rng.range(0.03, 0.14), d);
    }

    // The instant of contact: a hot point of light, and a glare streak across it
    // at a random angle.
    //
    // Not a radial spike burst. A many-spoked star centred on the hit is the most
    // recognisable firework shape there is, and the eye reads it as one no matter
    // how briefly it is on screen — the spokes of the *sparks* are the shape
    // here, and the flash's only job is to be too bright to look at.
    const burst = resetDesc();
    this.spawnPoint(burst, 0.015);
    burst.life = 0.06;
    burst.size0 = 0.08 + e * 0.12;
    burst.size1 = burst.size0 * 2.2;
    burst.r0 = 5;
    burst.g0 = 4.2;
    burst.b0 = 2.8;
    burst.r1 = 2.4;
    burst.g1 = 1.1;
    burst.b1 = 0.35;
    burst.alpha = 1;
    burst.additive = 1;
    burst.cell = GLOW.HOT_CORE;
    burst.fadeIn = 0.08;
    burst.priority = 200;
    groups.glow.spawn(now, burst);

    if (detail > 0.5) {
      const glare = resetDesc();
      this.spawnPoint(glare, 0.02);
      glare.life = 0.075;
      glare.size0 = 0.14 + e * 0.2;
      glare.size1 = glare.size0 * 1.5;
      glare.r0 = 2.2;
      glare.g0 = 1.5;
      glare.b0 = 0.7;
      glare.r1 = 0.6;
      glare.g1 = 0.2;
      glare.b1 = 0.05;
      glare.alpha = 0.8;
      glare.additive = 1;
      glare.cell = GLOW.LENS_STREAK;
      glare.roll = rng.range(0, Math.PI * 2);
      glare.rollRate = rng.range(-3, 3);
      glare.fadeIn = 0.1;
      glare.priority = 195;
      groups.glow.spawn(now, glare);
    }

    for (let i = 0; i < Math.max(2, Math.round(3 * detail)); i++) {
      const d = resetDesc();
      this.basis.cone(0.8, this.dir);
      this.spawnPoint(d, rng.range(0.03, 0.08));
      const speed = rng.range(0.8, 1.8);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.22, 0.4);
      d.size0 = 0.05;
      d.size1 = 0.22;
      this.tint(d, this.dustColor, 0.85, this.dustColor, 0.5);
      d.alpha = 0.32 * this.pressure;
      d.drag = 4.5;
      d.gravity = 0.4;
      d.cell = (rng.next() * 4) | 0;
      d.softness = 0.2;
      d.sunVisibility = this.sun;
      d.priority = 60;
      groups.dust.spawn(now, d);
    }

    this.deps.requestSmallLight(
      this.point,
      0xffcf90,
      4 + e * 9,
      1.6 + e * 1.4,
      0.075,
    );
  }

  private wood(e: number, detail: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;

    for (let i = 0; i < Math.max(2, Math.round((3 + e * 3) * detail)); i++) {
      const d = resetDesc();
      this.basis.cone(0.5, this.dir);
      const speed = rng.range(0.8, 1.7);
      this.spawnPoint(d, rng.range(0.03, 0.09));
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 0.2;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.45, 0.85);
      d.size0 = rng.range(0.045, 0.085);
      d.size1 = d.size0 * rng.range(2.4, 3.6);
      this.tint(d, this.dustColor, 1.1, this.dustColor, 0.66);
      d.alpha = rng.range(0.42, 0.6) * (0.55 + e * 0.5) * this.pressure;
      d.gravity = 0.7;
      d.drag = 3.6;
      d.turbulence = 0.18;
      d.cell = (rng.next() * 4) | 0;
      d.softness = 0.26;
      d.sunVisibility = this.sun;
      d.priority = 85;
      groups.dust.spawn(now, d);
    }

    // Splinters: long, light, and they tumble hard.
    const count = Math.max(2, Math.round((4 + e * 8) * detail));
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      this.basis.cone(0.85, this.dir);
      const speed = rng.range(1.4, 5.2) * (0.6 + e * 0.6);
      this.spawnPoint(d, 0.01);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 0.9;
      d.vz = this.dir.z * speed;
      d.life = rng.range(1.3, 2.4);
      // The generator draws the sliver a fifth of the sprite wide, so a splinter
      // authored at its true few centimetres is a sub-pixel hair at any distance
      // the player actually shoots from. Sized off what has to be legible.
      d.size0 = rng.range(0.05, 0.12);
      d.size1 = d.size0;
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-14, 14);
      // Brighter than the surface, not darker: a splinter is the inside of the
      // plank, and the inside of a plank is pale next to weathered board. Only
      // just brighter, though — the lit term peaks well above one on top of
      // this, and a warm-brown board pushed through both gains comes out a
      // saturated orange that reads as an ember, not as timber.
      this.tint(d, this.dustColor, 1.08, this.dustColor, 0.66);
      d.alpha = 1;
      d.gravity = 9.4;
      d.drag = 0.9;
      d.cell = SPLINTER_CELLS[(rng.next() * SPLINTER_CELLS.length) | 0];
      d.fadeIn = 0.02;
      d.floorY = this.floor;
      d.bounce = 0.22;
      d.priority = 110;
      groups.debris.spawn(now, d);
    }
  }

  /**
   * Loose ground: dirt, gravel, grass and sand.
   *
   * `hardness` separates them. Sand is the softest thing in the table and
   * behaves completely differently from gravel: the round buries itself, so
   * almost nothing comes back out as solid grains and what does come out is a
   * slow, low, wide bloom of fines. Gravel is the opposite — a hard scatter of
   * stones and very little airborne dust.
   */
  private loose(e: number, detail: number, hardness: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;
    // 0 for sand, 1 for gravel.
    const hard = saturate((hardness - 0.15) / 0.4);

    const puffs = Math.max(3, Math.round((4 + e * 5) * detail));
    for (let i = 0; i < puffs; i++) {
      const d = resetDesc();
      this.basis.cone(0.95, this.dir);
      const speed = rng.range(0.8, 2.1) * (0.6 + e * 0.6) * (0.62 + hard * 0.5);
      this.spawnPoint(d, rng.range(0.05, 0.14));
      this.basis.discOffset(rng.range(0, 0.11), fxScratch.a);
      d.px += fxScratch.a.x;
      d.py += fxScratch.a.y;
      d.pz += fxScratch.a.z;
      d.vx = this.dir.x * speed;
      d.vy = Math.abs(this.dir.y) * speed * 0.8 + 0.35 + hard * 0.5;
      d.vz = this.dir.z * speed;
      // Fines hang; stone dust drops out of the air almost at once.
      d.life = rng.range(0.7, 1.4) * (1.5 - hard * 0.6);
      d.size0 = rng.range(0.085, 0.15) * (0.7 + e * 0.6);
      d.size1 = d.size0 * rng.range(3.2, 4.8) * (1.25 - hard * 0.35);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-1, 1);
      this.tint(d, this.dustColor, 1.0, this.dustColor, 0.62);
      d.alpha = rng.range(0.42, 0.6) * (0.6 + e * 0.45) * (1.15 - hard * 0.3) * this.pressure;
      d.gravity = 0.5 + hard * 0.9;
      d.drag = 2.2 + hard * 1.2;
      d.turbulence = 0.3;
      d.cell = (rng.next() * 4) | 0;
      d.fadeIn = 0.07;
      d.softness = 0.3;
      d.sunVisibility = this.sun;
      d.priority = 90;
      groups.dust.spawn(now, d);
    }

    // Sand throws grains, gravel throws stones. Same emitter, and the shape of
    // the fragment is most of what separates the two once the puff has gone.
    this.chips(
      Math.round((2 + e * 4 + hard * (4 + e * 6)) * detail),
      rng.range(2.2, 4.6) * (0.55 + hard * 0.7),
      0.02,
      0.04 + hard * 0.03,
      hard < 0.4 ? GRIT_CELLS : STONE_CELLS,
      this.dustColorDark,
      e,
    );
  }

  private glass(e: number, detail: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;

    // Shards spray out and fall; they catch the light as they tumble.
    const count = Math.max(3, Math.round((6 + e * 10) * detail));
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      this.basis.cone(1.0, this.dir);
      const speed = rng.range(1.8, 6.5) * (0.55 + e * 0.7);
      this.spawnPoint(d, 0.01);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 0.5;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.9, 1.7);
      d.size0 = rng.range(0.018, 0.05);
      d.size1 = d.size0;
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-18, 18);
      d.r0 = 1.5;
      d.g0 = 1.7;
      d.b0 = 1.8;
      d.r1 = 0.9;
      d.g1 = 1.05;
      d.b1 = 1.15;
      d.alpha = 0.85;
      d.additive = 0.3;
      d.gravity = 10.5;
      d.drag = 0.5;
      d.cell = CHIP.GLASS;
      d.fadeIn = 0.02;
      // Glass skips further than stone and keeps catching the light as it goes.
      d.floorY = this.floor;
      d.bounce = 0.35;
      d.priority = 120;
      groups.debris.spawn(now, d);
    }

    // Specular glint off the fracture face.
    const glint = resetDesc();
    this.spawnPoint(glint, 0.02);
    glint.life = 0.1;
    glint.size0 = 0.12;
    glint.size1 = 0.45 + e * 0.3;
    glint.r0 = 3.4;
    glint.g0 = 3.8;
    glint.b0 = 4.4;
    glint.r1 = 0.8;
    glint.g1 = 1.0;
    glint.b1 = 1.3;
    glint.alpha = 1;
    glint.additive = 1;
    glint.cell = GLOW.LENS_STREAK;
    glint.roll = rng.range(0, Math.PI * 2);
    glint.fadeIn = 0.06;
    glint.priority = 190;
    groups.glow.spawn(now, glint);

    for (let i = 0; i < Math.max(2, Math.round(3 * detail)); i++) {
      const d = resetDesc();
      this.basis.cone(0.6, this.dir);
      this.spawnPoint(d, rng.range(0.03, 0.08));
      const speed = rng.range(0.7, 1.6);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.3, 0.55);
      d.size0 = 0.055;
      d.size1 = 0.24;
      d.r0 = 0.72;
      d.g0 = 0.78;
      d.b0 = 0.82;
      d.r1 = 0.42;
      d.g1 = 0.47;
      d.b1 = 0.5;
      d.alpha = 0.34 * this.pressure;
      d.drag = 4;
      d.gravity = 0.6;
      d.cell = (rng.next() * 4) | 0;
      d.softness = 0.2;
      d.sunVisibility = this.sun;
      d.priority = 60;
      groups.dust.spawn(now, d);
    }
  }

  private water(e: number, detail: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;

    // Column: two stacked sprites so it reads as a plume rather than a decal.
    for (let i = 0; i < 2; i++) {
      const d = resetDesc();
      this.spawnPoint(d, 0.02);
      d.py += i * 0.05;
      d.vy = rng.range(1.4, 2.6) * (0.6 + e * 0.6);
      d.life = rng.range(0.3, 0.5);
      d.size0 = (0.12 + i * 0.06) * (0.7 + e * 0.6);
      d.size1 = d.size0 * rng.range(2.4, 3.6);
      d.r0 = 1.3;
      d.g0 = 1.45;
      d.b0 = 1.5;
      d.r1 = 0.7;
      d.g1 = 0.82;
      d.b1 = 0.88;
      d.alpha = 0.7;
      d.additive = 0.2;
      d.gravity = 8;
      d.drag = 1.4;
      d.cell = GLOW.SPLASH;
      d.fadeIn = 0.1;
      d.priority = 130;
      groups.glow.spawn(now, d);
    }

    // Droplets fall back and land.
    const drops = Math.max(3, Math.round((7 + e * 10) * detail));
    for (let i = 0; i < drops; i++) {
      const d = resetDesc();
      this.basis.cone(0.75, this.dir);
      const speed = rng.range(1.6, 5.5) * (0.6 + e * 0.6);
      this.spawnPoint(d, 0.01);
      d.vx = this.dir.x * speed;
      d.vy = Math.abs(this.dir.y) * speed + 1.2;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.45, 0.95);
      d.size0 = rng.range(0.012, 0.032);
      d.size1 = d.size0;
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-6, 6);
      d.r0 = 1.25;
      d.g0 = 1.4;
      d.b0 = 1.45;
      d.r1 = 0.85;
      d.g1 = 0.95;
      d.b1 = 1.0;
      d.alpha = 0.85;
      d.additive = 0.15;
      d.gravity = 12;
      d.drag = 0.2;
      d.cell = CHIP.DROPLET;
      d.fadeIn = 0.03;
      d.sunVisibility = this.sun;
      d.priority = 100;
      groups.debris.spawn(now, d);
    }

    // Expanding ripple rings, flat on the surface.
    for (let i = 0; i < 2; i++) {
      const d = resetDesc();
      this.spawnPoint(d, 0.01);
      d.life = 0.6 + i * 0.35;
      d.size0 = 0.1;
      d.size1 = (0.7 + e * 0.9) * (1 + i * 0.9);
      d.r0 = 1.1;
      d.g0 = 1.25;
      d.b0 = 1.3;
      d.r1 = 0.6;
      d.g1 = 0.7;
      d.b1 = 0.76;
      d.alpha = 0.85 - i * 0.2;
      d.additive = 0.5;
      d.cell = GLOW.RIPPLE_RING;
      d.roll = rng.range(0, Math.PI * 2);
      d.fadeIn = 0.05;
      d.softness = 0.3;
      d.priority = 80;
      groups.ring.spawn(now, d);
    }
  }

  private foliage(e: number, detail: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;

    const count = Math.max(3, Math.round((5 + e * 8) * detail));
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      this.basis.cone(1.3, this.dir);
      const speed = rng.range(0.9, 3.4);
      this.spawnPoint(d, 0.02);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 0.4;
      d.vz = this.dir.z * speed;
      d.life = rng.range(1.2, 2.4);
      d.size0 = rng.range(0.03, 0.075);
      d.size1 = d.size0;
      d.roll = rng.range(0, Math.PI * 2);
      // Leaves flutter, so a high roll rate with heavy drag reads correctly.
      d.rollRate = rng.range(-9, 9);
      d.r0 = 1;
      d.g0 = 1;
      d.b0 = 1;
      d.r1 = 0.8;
      d.g1 = 0.8;
      d.b1 = 0.8;
      d.alpha = 1;
      // A leaf's slow fall has to be expressed as weak gravity, not as heavy
      // drag: the bouncing groups solve the vertical axis without drag so the
      // impact time stays closed-form, so drag here would only slow the
      // sideways drift and the leaf would drop like a stone.
      d.gravity = 1.5;
      d.drag = 2.2;
      d.cell = CHIP.LEAF;
      d.fadeIn = 0.03;
      d.floorY = this.floor;
      d.bounce = 0.05;
      d.sunVisibility = this.sun;
      d.priority = 95;
      groups.debris.spawn(now, d);
    }
  }

  private softMaterial(e: number, detail: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;
    for (let i = 0; i < Math.max(2, Math.round(2 * detail)); i++) {
      const d = resetDesc();
      this.basis.cone(0.6, this.dir);
      const speed = rng.range(0.5, 1.3);
      this.spawnPoint(d, rng.range(0.03, 0.07));
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 0.15;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.3, 0.55);
      d.size0 = 0.06;
      d.size1 = 0.26 * (0.7 + e);
      this.tint(d, this.dustColor, 1.05, this.dustColor, 0.62);
      d.alpha = 0.36 * (0.55 + e * 0.5) * this.pressure;
      d.gravity = 0.4;
      d.drag = 4;
      d.cell = (rng.next() * 4) | 0;
      d.softness = 0.22;
      d.sunVisibility = this.sun;
      d.priority = 70;
      groups.dust.spawn(now, d);
    }
  }

  /**
   * How much opacity impact dust is allowed, given how much is already landing.
   *
   * Nothing here caps the *count* — a thinner puff still tells the player the
   * round landed — so the effect degrades by getting fainter rather than by
   * disappearing, which is much harder to notice.
   */
  private dustPressure(distanceSq: number): number {
    const now = this.deps.now;
    // A time-decayed count rather than a per-frame one, so the concession is the
    // same at 30 fps as at 144 and does not flicker with the frame rate.
    const gap = this.rateTime < 0 ? DUST_RATE_WINDOW * 8 : Math.max(0, now - this.rateTime);
    this.rateTime = now;
    this.nearRate *= Math.exp(-gap / DUST_RATE_WINDOW);
    if (distanceSq < DUST_RATE_RANGE_SQ) this.nearRate += 1 / DUST_RATE_WINDOW;
    const over = this.nearRate - DUST_RATE_FREE;
    if (over <= 0) return 1;
    return Math.max(DUST_RATE_FLOOR, 1 - over * DUST_RATE_FALLOFF);
  }

  // -------------------------------------------------------------------------
  // Blood
  // -------------------------------------------------------------------------

  /**
   * A directional mist cone in the travel direction plus heavier droplets that
   * fall under gravity and leave decals where they land. Dark and desaturated:
   * bright primary red reads as a cartoon.
   */
  bloodSpray(point: THREE.Vector3, direction: THREE.Vector3, amount: number): void {
    const groups = this.deps.groups;
    const now = this.deps.now;
    const a = saturate(amount * 0.65);
    this.point.copy(point);
    this.basis.set(direction);
    this.sun = this.deps.sunVisibility(point);
    this.floor = this.deps.groundAt(point.x, point.z, point.y);

    const distanceSq = this.deps.distanceSqTo(point);
    const detail = distanceSq < NEAR_DETAIL_SQ ? 1 : distanceSq < FAR_DETAIL_SQ ? 0.6 : 0.3;

    // Fine mist, thrown along the wound channel.
    const mist = Math.max(2, Math.round((5 + a * 9) * detail));
    for (let i = 0; i < mist; i++) {
      const d = resetDesc();
      this.basis.cone(0.35, this.dir);
      const speed = rng.range(1.4, 5.5) * (0.5 + a * 0.8);
      this.spawnPoint(d, 0.01);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 0.3;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.28, 0.6);
      d.size0 = rng.range(0.04, 0.1) * (0.7 + a * 0.7);
      d.size1 = d.size0 * rng.range(2.2, 3.6);
      d.r0 = 0.34;
      d.g0 = 0.045;
      d.b0 = 0.035;
      d.r1 = 0.14;
      d.g1 = 0.022;
      d.b1 = 0.02;
      d.alpha = rng.range(0.62, 0.92);
      d.gravity = 5.5;
      d.drag = 3.4;
      d.cell = BLOOD.MIST;
      d.fadeIn = 0.04;
      d.sunVisibility = this.sun;
      d.priority = 120;
      groups.blood.spawn(now, d);
    }

    // A short thick gout right at the wound.
    const gout = resetDesc();
    this.spawnPoint(gout, 0.02);
    this.basis.cone(0.15, this.dir);
    gout.vx = this.dir.x * 1.6;
    gout.vy = this.dir.y * 1.6;
    gout.vz = this.dir.z * 1.6;
    gout.life = 0.22;
    gout.size0 = 0.07 * (0.7 + a);
    gout.size1 = gout.size0 * 2.4;
    gout.r0 = 0.28;
    gout.g0 = 0.035;
    gout.b0 = 0.03;
    gout.r1 = 0.1;
    gout.g1 = 0.015;
    gout.b1 = 0.014;
    gout.alpha = 0.9;
    gout.gravity = 6;
    gout.drag = 4;
    gout.cell = BLOOD.GOUT;
    gout.roll = rng.range(0, Math.PI * 2);
    gout.fadeIn = 0.05;
    gout.sunVisibility = this.sun;
    gout.priority = 140;
    groups.blood.spawn(now, gout);

    // Heavy droplets: these are the ones that land and stain.
    const drops = Math.max(2, Math.round((4 + a * 8) * detail));
    for (let i = 0; i < drops; i++) {
      const d = resetDesc();
      this.basis.cone(0.7, this.dir);
      const speed = rng.range(1.5, 4.5) * (0.6 + a * 0.7);
      this.spawnPoint(d, 0.01);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + 1.4;
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.5, 1.0);
      d.size0 = rng.range(0.016, 0.04);
      d.size1 = d.size0 * 1.3;
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-4, 4);
      d.r0 = 0.3;
      d.g0 = 0.032;
      d.b0 = 0.028;
      d.r1 = 0.16;
      d.g1 = 0.02;
      d.b1 = 0.018;
      d.alpha = 1;
      d.gravity = 12.5;
      d.drag = 0.35;
      d.cell = rng.bool(0.6) ? BLOOD.DROP : BLOOD.STRAND;
      d.fadeIn = 0.03;
      d.sunVisibility = this.sun;
      d.priority = 110;
      groups.blood.spawn(now, d);
    }

    this.splatterNearby(point, direction, a);
  }

  /**
   * Stain the surfaces around a hit. One ray per spray, so a firefight builds a
   * pattern over time without a burst of raycasts on a single frame.
   */
  private splatterNearby(point: THREE.Vector3, direction: THREE.Vector3, amount: number): void {
    const physics = this.deps.physics;
    if (!physics || !physics.ready || amount < 0.25) return;

    this.basis.set(direction);
    this.basis.cone(0.55, this.dir);
    // Blood is thrown forward and down.
    this.dir.y -= 0.55;
    if (this.dir.lengthSq() < 1e-6) return;
    this.dir.normalize();

    RAY_OPTIONS.maxDistance = 2.4 + amount * 2.2;
    const hit = physics.raycast(point, this.dir, RAY_OPTIONS);
    if (!hit) return;
    // Physics hands back records from a ring buffer, so copy before using them.
    SPLAT_POINT.copy(hit.point);
    SPLAT_NORMAL.copy(hit.normal);
    this.deps.decals.place({
      point: SPLAT_POINT,
      normal: SPLAT_NORMAL,
      size: rng.range(0.16, 0.4) * (0.6 + amount),
      kind: 'blood',
      surface: hit.surface,
      opacity: rng.range(0.55, 0.9),
    });
  }

  // -------------------------------------------------------------------------
  // Debris
  // -------------------------------------------------------------------------

  /** Bulk ejecta, simulated on the GPU. Hero chunks are handled by DebrisField. */
  debrisBurst(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    count: number,
    surface: SurfaceType,
  ): void {
    const props = SURFACE_PROPERTIES[surface] ?? SURFACE_PROPERTIES.concrete;
    this.point.copy(position);
    this.basis.set(normal);
    this.sun = this.deps.sunVisibility(position);
    fxScratch.a.copy(position).addScaledVector(normal, 0.06);
    this.floor = this.deps.groundAt(fxScratch.a.x, fxScratch.a.z, fxScratch.a.y);
    hexColor(props.dustColor, this.dustColor);
    this.dustColorDark.copy(this.dustColor).multiplyScalar(0.4);
    const cells =
      surface === 'glass'
        ? GLASS_CELLS
        : surface === 'foliage' || surface === 'grass'
          ? LEAF_CELLS
          : surface === 'wood'
            ? SPLINTER_CELLS
            : STONE_CELLS;
    this.chips(count, rng.range(4, 9), 0.03, 0.09, cells, this.dustColorDark, 1);
  }

  // -------------------------------------------------------------------------
  // Shared emission
  // -------------------------------------------------------------------------

  private chips(
    count: number,
    speedBase: number,
    minSize: number,
    maxSize: number,
    cells: readonly number[],
    color: THREE.Color,
    energy: number,
  ): void {
    if (count <= 0) return;
    const groups = this.deps.groups;
    const now = this.deps.now;
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      const cell = cells.length === 1 ? cells[0] : cells[(rng.next() * cells.length) | 0];
      this.basis.cone(0.9, this.dir);
      const speed = speedBase * rng.range(0.4, 1.5) * (0.55 + energy * 0.7);
      this.spawnPoint(d, 0.01);
      d.vx = this.dir.x * speed;
      d.vy = this.dir.y * speed + rng.range(0.6, 2.2);
      d.vz = this.dir.z * speed;
      // Long enough to complete the arc and then lie there. A chip thrown off a
      // wall at chest height is airborne for the better part of a second, so a
      // shorter life than this deletes it at the top of its trajectory — which is
      // the single most obvious way for debris to look like sprites.
      d.life = rng.range(1.5, 2.8);
      d.size0 = rng.range(minSize, maxSize);
      d.size1 = d.size0;
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-16, 16);
      d.r0 = color.r;
      d.g0 = color.g;
      d.b0 = color.b;
      d.r1 = color.r * 0.7;
      d.g1 = color.g * 0.7;
      d.b1 = color.b * 0.7;
      d.alpha = 1;
      d.gravity = 10.5;
      d.drag = 0.55;
      d.cell = cell;
      d.fadeIn = 0.02;
      d.floorY = this.floor;
      d.bounce = 0.24;
      d.sunVisibility = this.sun;
      d.priority = 105;
      groups.debris.spawn(now, d);
    }
  }

  /** A brief warm flash where the round struck; sells the kinetic energy. */
  private impactSpark(strength: number, size: number, colorHex: number): void {
    if (strength <= 0.05) return;
    const d = resetDesc();
    this.spawnPoint(d, 0.015);
    hexColor(colorHex, fxScratch.color);
    d.life = 0.055;
    d.size0 = 0.05 * size;
    d.size1 = 0.16 * size;
    d.r0 = fxScratch.color.r * 2.6 * strength;
    d.g0 = fxScratch.color.g * 2.2 * strength;
    d.b0 = fxScratch.color.b * 1.6 * strength;
    d.r1 = d.r0 * 0.2;
    d.g1 = d.g0 * 0.12;
    d.b1 = d.b0 * 0.05;
    d.alpha = 1;
    d.additive = 1;
    d.cell = GLOW.HOT_CORE;
    d.fadeIn = 0.1;
    d.priority = 170;
    this.deps.groups.glow.spawn(this.deps.now, d);
  }

  private spawnPoint(d: typeof PD, lift: number): void {
    d.px = this.point.x + this.basis.axis.x * lift;
    d.py = this.point.y + this.basis.axis.y * lift;
    d.pz = this.point.z + this.basis.axis.z * lift;
  }

  private tint(
    d: typeof PD,
    from: THREE.Color,
    fromScale: number,
    to: THREE.Color,
    toScale: number,
  ): void {
    d.r0 = from.r * fromScale;
    d.g0 = from.g * fromScale;
    d.b0 = from.b * fromScale;
    d.r1 = to.r * toScale;
    d.g1 = to.g * toScale;
    d.b1 = to.b * toScale;
  }
}

/**
 * Fragment silhouettes per material. Stone gets three so a burst of chips is not
 * the same outline repeated a dozen times, which at these sizes is one of the few
 * things about a chip the eye can actually resolve.
 */
const STONE_CELLS = [CHIP.CHIP, CHIP.CHIP_B, CHIP.CHIP_C] as const;
const SPLINTER_CELLS = [CHIP.SPLINTER_A, CHIP.SPLINTER_B] as const;
const GRIT_CELLS = [CHIP.GRIT] as const;
const GLASS_CELLS = [CHIP.GLASS] as const;
const LEAF_CELLS = [CHIP.LEAF] as const;

const RAY_OPTIONS = { maxDistance: 3 };
const SPLAT_POINT = /* @__PURE__ */ new THREE.Vector3();
const SPLAT_NORMAL = /* @__PURE__ */ new THREE.Vector3();
