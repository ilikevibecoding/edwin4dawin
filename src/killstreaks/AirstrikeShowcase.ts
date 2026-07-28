import * as THREE from 'three';
import type { GameContext } from '../core/GameContext';
import type { IPhysics, IPlayer, ISky, IWorld } from '../core/Interfaces';
import { registerVantages } from '../core/Vantage';
import { RUN_SPEED } from './Aircraft';
import { AirstrikeDirector, VARIANTS, type StrikeKind } from './Airstrike';
import { headingToDir, headingToRight } from './Common';
import { STATION_SPREAD } from './models/Jet';
import type KillstreakSystem from './KillstreakSystem';

/**
 * The airstrike test range, active on `?showcase=airstrike`.
 *
 * A strike is a ten-second sequence in which everything worth photographing
 * happens in a window a tenth of a second wide, so a screenshot harness that
 * can only say "take a picture now" is useless for judging it. This makes the
 * sequence addressable instead: every shot resets the world, calls the strike
 * from a fixed site on a fixed heading, integrates the whole thing forward to
 * an exact instant, and *then* frames the camera from where the aircraft and
 * the ordnance actually ended up.
 *
 * The integration is real. `advanceTo` runs the same fixed sixtieth-of-a-
 * second step the game runs, driving the effects clock alongside it, so a
 * frame captured at t = 9.35 s contains a fireball that is genuinely 0.35 s
 * old sitting in a crater that was genuinely reached by integrating a bomb's
 * ballistics from the pylon. Nothing is posed.
 *
 * That is also why the framing is computed inside `Vantage.setup` rather than
 * at registration: `setup` runs before the harness reads `position`, so a shot
 * can chase a bomb it has not yet dropped.
 *
 * By hand:
 *
 *   __STRIKE__.call('carpet'); __STRIKE__.at(9.4)
 *   __STRIKE__.at(24)                    // the aftermath, same strike
 *   __STRIKE__.call('napalm'); __STRIKE__.at(12)
 *   __STRIKE__.targeting()               // the tactical interface
 */

declare global {
  interface Window {
    __STRIKE__?: {
      /** Clears the world and puts the player somewhere safe. */
      reset(): void;
      /** Restarts the current kind and integrates to exactly `seconds`. */
      at(seconds: number): void;
      /** Selects the variant. Does not start it; `at` does that. */
      call(kind: StrikeKind, headingDegrees?: number): void;
      /** Releases the hold `at` puts on the clock. */
      play(): void;
      /** Raises the tactical targeting interface over the site. */
      targeting(id?: string): void;
      /** Moves the range. Heading is a compass bearing in degrees. */
      site(x?: number, z?: number, headingDegrees?: number): Record<string, number>;
      /** Puts a streak in the player's pocket and activates it for real. */
      streak(id: string): boolean;
      stats(): Record<string, number | string>;
    };
  }
}

/** Metres between candidate aim points when siting the range. */
const SITE_STEP = 4;
/** Run-in bearings tried at each candidate. */
const SITE_HEADINGS = 16;
/**
 * Points along the walk, in units of half-length, tested for clear ground.
 *
 * Densely: at eight samples across ninety metres the gaps between them are
 * eleven metres wide, which is comfortably enough room for the four-metre
 * awning that swallowed two bombs of the first stick this search approved.
 */
const WALK_PROBES = (() => {
  const list: number[] = [];
  for (let i = 0; i <= 20; i++) list.push(i / 10 - 1);
  return list;
})();
/** Of those, the ones worth the cost of a sky-visibility query. */
const SKY_EVERY = 3;
/** Metres either side of the walk where a building counts as good framing. */
const FLANK = 13;
/** Metres of clearance a walk probe needs inside the map edge. */
const EDGE = 5;
/** Resolution of the obstacle field, in metres. */
const FIELD_STEP = 1.5;
/** Height above terrain at or below which something is kerb, not building. */
const CLUTTER = 1.4;
/** Metres a store must pass over an obstacle by for the approach to count clear. */
const CLEARANCE = 2.5;
/**
 * Distances short of an aim point, in metres, where the descent is checked.
 *
 * The stick arrives on a ballistic path, not out of the sky, so a run-in is
 * only usable if the *approach* to every aim point is clear as well as the
 * point itself. Al-Rashid has a fourteen-metre gatehouse on its south wall
 * and until this test existed the search would happily route the run straight
 * through it and call the resulting two mid-air detonations a walking line.
 *
 * Spaced closely near the aim point and loosely further out, because that is
 * how the margin behaves: sixty metres short a retarded store is forty metres
 * up and nothing in this town reaches it, while six metres short it is at
 * head height and a market awning will take it.
 */
const APPROACH_PROBES = [3, 6, 9, 13, 18, 24, 32, 44, 60];

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _lead = new THREE.Vector3();
const _sun = new THREE.Vector3();
const _lookFrom = new THREE.Vector3();
const _across = new THREE.Vector3();

/** Lateral nudges, in metres, tried when a street camera lands in a palm. */
const STREET_NUDGE = [0, 2.5, -2.5, 5, -5, 7.5, -7.5];

/**
 * How far a blocked camera climbs, and how many times.
 *
 * Capped deliberately low. Twenty-four metres clears the roofline of anything
 * in Al-Rashid, and beyond that a camera is no longer solving the shot — it is
 * abandoning it for a bird's eye, where a fifty-metre fireball and a
 * fifteen-metre building are just two objects on a table.
 */
const LIFT_STEP = 3;
const LIFT_STEPS = 8;

export class AirstrikeShowcase {
  private readonly ctx: GameContext;
  private readonly system: KillstreakSystem;
  private readonly world?: IWorld;
  private readonly physics?: IPhysics;
  private readonly player?: IPlayer;

  /** Height above terrain of whatever is standing on it, on a coarse grid. */
  private field: Float32Array | null = null;
  private fieldX0 = 0;
  private fieldZ0 = 0;
  private fieldW = 0;
  private fieldH = 0;

  /** Where the strike lands. */
  private readonly site = new THREE.Vector3();
  /** Compass bearing the aircraft fly. */
  private heading = 0;
  private kind: StrikeKind = 'carpet';
  /** Somewhere the player can stand and not be killed by the demonstration. */
  private readonly safe = new THREE.Vector3();

  constructor(ctx: GameContext, system: KillstreakSystem) {
    this.ctx = ctx;
    this.system = system;
    this.world = ctx.tryGet<IWorld>('world');
    this.physics = ctx.tryGet<IPhysics>('physics');
    this.player = ctx.tryGet<IPlayer>('player');

    // A low sun. The contrails, the dust and the smoke columns are all
    // forward-scattering media and at noon there is nothing for them to do.
    ctx.tryGet<ISky>('sky')?.applyPreset?.('golden');

    this.findSite();
    this.findSafeSpot();
    this.install();
    this.registerShots();
    console.log(
      `[airstrike] showcase ready — window.__STRIKE__ · site ${this.site.x.toFixed(0)}, ` +
        `${this.site.z.toFixed(0)} heading ${((this.heading * 180) / Math.PI).toFixed(0)}deg`,
    );
  }

  /* ------------------------------- siting -------------------------------- */

  /**
   * Samples what is standing on the ground, once, into a grid.
   *
   * Siting the range honestly means asking "is anything in the way" at a few
   * hundred thousand points, and each of those is a downward raycast against
   * the whole collision world. Doing it live took ten seconds and still had to
   * be rationed down to twenty-one samples along a ninety-metre walk, which is
   * one every four and a half metres — wide enough to miss the market awning
   * that ate two bombs of the first stick this search approved.
   *
   * So the raycasts happen once, on a metre-and-a-half grid, and everything
   * afterwards is an array read. The stored value is height *above terrain*,
   * because terrain is what a bomb is aimed at and a building is what it hits.
   */
  private buildObstacleField(): void {
    const world = this.world;
    if (!world) return;
    const b = world.bounds;
    this.fieldX0 = b.min.x;
    this.fieldZ0 = b.min.z;
    this.fieldW = Math.ceil((b.max.x - b.min.x) / FIELD_STEP) + 1;
    this.fieldH = Math.ceil((b.max.z - b.min.z) / FIELD_STEP) + 1;
    const field = new Float32Array(this.fieldW * this.fieldH);
    for (let iz = 0; iz < this.fieldH; iz++) {
      const z = this.fieldZ0 + iz * FIELD_STEP;
      for (let ix = 0; ix < this.fieldW; ix++) {
        const x = this.fieldX0 + ix * FIELD_STEP;
        field[iz * this.fieldW + ix] = this.groundAt(x, z) - world.terrainHeight(x, z);
      }
    }

    // Erode the isolated cells away. `KillstreakSystem.ordnanceGround` lets a
    // store pass through anything narrow — a palm, a lamp standard, a mast —
    // and a search that disagrees with the simulation about what is solid will
    // reject perfectly good streets because there is a tree beside one of
    // them. Both have to be looking at the same town.
    const eroded = new Float32Array(field.length);
    for (let iz = 0; iz < this.fieldH; iz++) {
      for (let ix = 0; ix < this.fieldW; ix++) {
        const i = iz * this.fieldW + ix;
        const h = field[i];
        if (h < CLUTTER) {
          eroded[i] = h;
          continue;
        }
        let broad = 0;
        if (ix > 0 && field[i - 1] > h * 0.5) broad++;
        if (ix + 1 < this.fieldW && field[i + 1] > h * 0.5) broad++;
        if (iz > 0 && field[i - this.fieldW] > h * 0.5) broad++;
        if (iz + 1 < this.fieldH && field[i + this.fieldW] > h * 0.5) broad++;
        eroded[i] = broad >= 2 ? h : 0;
      }
    }
    this.field = eroded;
  }

  /**
   * How tall the tallest thing near a point is, above terrain.
   *
   * The maximum of the four surrounding cells rather than an interpolation,
   * because the question being asked is "could a bomb hit something here" and
   * the conservative answer is the only useful one.
   */
  private obstacle(x: number, z: number): number {
    const field = this.field;
    if (!field) return 0;
    const fx = (x - this.fieldX0) / FIELD_STEP;
    const fz = (z - this.fieldZ0) / FIELD_STEP;
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    if (ix < 0 || iz < 0 || ix + 1 >= this.fieldW || iz + 1 >= this.fieldH) return 0;
    const row = iz * this.fieldW + ix;
    const next = row + this.fieldW;
    return Math.max(field[row], field[row + 1], field[next], field[next + 1]);
  }

  /**
   * Finds ground a carpet strike can actually walk across.
   *
   * Al-Rashid Crossing is a dense town, and the first version of this search
   * put the range squarely on a rooftop. The mistake was probing sky
   * visibility at `groundHeight`, which on a building *is* the roof: of course
   * the sky is open up there, and of course the strike then walked across
   * seven roofs and photographed as a mess.
   *
   * The datum is therefore `terrainHeight`, which ignores buildings entirely.
   * Beyond that the search asks three questions, in descending order of how
   * badly getting them wrong shows up in a photograph:
   *
   *  1. Does every store in the stick reach the ground? Not the centreline —
   *     the seven points the seven bombs will *actually* land on, offset onto
   *     the pylons they will actually leave from, with the approach to each
   *     one checked against the real integrated trajectory. A store that
   *     detonates against the side of a building leaves a hole in the walking
   *     line, and one hole is enough to ruin the only frame that matters.
   *  2. Is the sky over it open? A strike into an arcade is not a strike.
   *  3. Is there a town either side of it? An airstrike walking across open
   *     sand is a firework display; the same stick walking between two rows of
   *     houses has scale, occlusion and somewhere for the dust to go.
   *
   * The heading is searched jointly with the position rather than afterwards,
   * because a ninety-metre line has one direction through a town that works
   * and fifteen that do not.
   */
  private findSite(): void {
    const world = this.world;
    const centre = _v.set(0, 0, 0);
    if (world) world.bounds.getCenter(centre);
    this.site.set(centre.x, this.groundAt(centre.x, centre.z), centre.z);
    if (!world) return;
    this.buildObstacleField();
    // Ask for a perfect line first; settle for one whose approach is merely
    // survivable if the map has none. A search with one acceptance test and no
    // fallback silently returns its default when the test is too strict, and
    // the default here is the middle of the bounds, which is a rooftop.
    if (!this.search(true)) this.search(false);
  }

  /** One pass of the site search. Returns whether anything qualified. */
  private search(strict: boolean): boolean {
    const world = this.world;
    if (!world) return false;
    const variant = VARIANTS.carpet;
    const bounds = world.bounds;
    const spacing = RUN_SPEED * variant.interval;
    const half = ((variant.count - 1) * spacing) / 2;
    const centreX = (bounds.min.x + bounds.max.x) * 0.5;
    const centreZ = (bounds.min.z + bounds.max.z) * 0.5;
    const reach = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) * 0.5;
    // Height of a store at each approach probe, and the lateral offset of the
    // pylon each round of the stick leaves from. Both fixed, both computed once.
    const approach = APPROACH_PROBES.map((d) => this.system.strike.approachHeight('carpet', d));
    const offsets = this.system.strike.stationOffsets(variant.count);
    let best = -Infinity;

    for (let x = bounds.min.x + SITE_STEP; x < bounds.max.x; x += SITE_STEP) {
      for (let z = bounds.min.z + SITE_STEP; z < bounds.max.z; z += SITE_STEP) {
        _probe.set(x, 0, z);
        if (!world.inBounds(_probe)) continue;
        const terrain = world.terrainHeight(x, z);
        // Standing on something: a roof, a container, the top of a wall.
        if (this.obstacle(x, z) > CLUTTER) continue;

        for (let h = 0; h < SITE_HEADINGS; h++) {
          const heading = (h / SITE_HEADINGS) * Math.PI * 2;
          headingToDir(heading, _fwd);
          headingToRight(heading, _right);
          let usable = true;

          for (let i = 0; i < variant.count && usable; i++) {
            const along = i * spacing - half;
            const side = offsets[i];
            const px = x + _fwd.x * along + _right.x * side;
            const pz = z + _fwd.z * along + _right.z * side;
            if (
              px < bounds.min.x + EDGE ||
              px > bounds.max.x - EDGE ||
              pz < bounds.min.z + EDGE ||
              pz > bounds.max.z - EDGE ||
              this.obstacle(px, pz) > CLUTTER
            ) {
              usable = false;
              break;
            }
            // And the way in to it, along the real descent.
            if (!strict) continue;
            for (let a = 0; a < approach.length; a++) {
              const d = APPROACH_PROBES[a];
              const ax = px - _fwd.x * d;
              const az = pz - _fwd.z * d;
              // Only inside the map. Past the wall the collision geometry is
              // whatever holds the skybox up, and `OrdnanceField.inPlay`
              // already tells stores to ignore it.
              if (ax < bounds.min.x || ax > bounds.max.x) continue;
              if (az < bounds.min.z || az > bounds.max.z) continue;
              if (this.obstacle(ax, az) > approach[a] - CLEARANCE) {
                usable = false;
                break;
              }
            }
          }
          if (!usable) continue;

          // The line is flyable. Now, is it worth photographing?
          let sky = 0;
          let flank = 0;
          let samples = 0;
          for (let p = 0; p < WALK_PROBES.length; p += SKY_EVERY) {
            const u = WALK_PROBES[p];
            const px = x + _fwd.x * u * half;
            const pz = z + _fwd.z * u * half;
            _probe.set(px, world.terrainHeight(px, pz) + 1.5, pz);
            sky += world.skyVisibility(_probe);
            for (const s of [-FLANK, FLANK]) {
              if (this.obstacle(px + _right.x * s, pz + _right.z * s) > 3) flank += 0.5;
            }
            samples++;
          }

          // Centrality carries real weight. Every camera in this file stands
          // off the site by a hundred metres or more, and on a map this size
          // that means a range sited near an edge is photographed from outside
          // the map with the town in the far distance behind it.
          const inward = 1 - Math.min(1, Math.hypot(x - centreX, z - centreZ) / reach);
          const n = Math.max(1, samples);
          const score = (sky / n) * 2.4 + (flank / n) * 3 + inward * 3.2;
          if (score <= best) continue;
          best = score;
          this.site.set(x, terrain, z);
          this.heading = heading;
        }
      }
    }
    return best > -Infinity;
  }

  /** A corner of the map to park the player in, well clear of the blast. */
  private findSafeSpot(): void {
    const bounds = this.world?.bounds;
    if (!bounds) {
      this.safe.set(this.site.x + 220, this.site.y + 2, this.site.z + 220);
      return;
    }
    let far = -1;
    for (let i = 0; i < 4; i++) {
      const x = i < 2 ? bounds.min.x + 6 : bounds.max.x - 6;
      const z = i % 2 === 0 ? bounds.min.z + 6 : bounds.max.z - 6;
      const d = (x - this.site.x) ** 2 + (z - this.site.z) ** 2;
      if (d <= far) continue;
      far = d;
      this.safe.set(x, this.groundAt(x, z) + 1.2, z);
    }
  }

  /** Whether something stands on the ground here that a bomb would catch. */
  private blocked(x: number, z: number): boolean {
    return this.groundAt(x, z) > (this.world?.terrainHeight(x, z) ?? 0) + 1.2;
  }

  private groundAt(x: number, z: number, from = 200): number {
    const hit = this.physics?.groundHeight?.(x, z, from);
    if (hit !== null && hit !== undefined) return hit;
    return this.world?.terrainHeight?.(x, z) ?? 0;
  }

  /* ------------------------------- triggers ------------------------------- */

  private reset(): void {
    this.system.reset();
    // The player is not exempt from their own airstrike, which is a feature
    // everywhere except here, where it would put a death screen over the shot.
    this.player?.setFrozen?.(true);
    this.player?.teleport?.(this.safe);
    this.player?.heal?.(1000);
  }

  /**
   * Restarts the selected variant and integrates to an exact instant.
   *
   * Always from the beginning, never from wherever the last call left off: two
   * captures of t = 9.4 s must be the same picture, and a sequence that could
   * be reached by two different paths is not.
   */
  private at(seconds: number): void {
    this.reset();
    this.system.beginStrike(this.kind, this.site, this.heading);
    this.system.advanceTo(seconds);
  }

  private install(): void {
    window.__STRIKE__ = {
      reset: () => this.reset(),
      at: (seconds: number) => this.at(seconds),
      call: (kind: StrikeKind, headingDegrees?: number) => {
        this.kind = kind;
        if (headingDegrees !== undefined) this.heading = (headingDegrees * Math.PI) / 180;
      },
      play: () => this.system.setFrozen(false),
      targeting: (id = 'carpet') => {
        this.reset();
        this.system.setFrozen(true);
        this.system.showTargeting(id, this.site, this.heading);
      },
      site: (x?: number, z?: number, headingDegrees?: number) => {
        if (x !== undefined && z !== undefined) {
          this.site.set(x, this.groundAt(x, z), z);
          this.findSafeSpot();
        }
        if (headingDegrees !== undefined) this.heading = (headingDegrees * Math.PI) / 180;
        return {
          x: this.site.x,
          y: this.site.y,
          z: this.site.z,
          heading: (this.heading * 180) / Math.PI,
        };
      },
      streak: (id: string) => {
        this.system.grant(id);
        return this.system.activate(id);
      },
      stats: () => ({
        kind: this.kind,
        clock: Number(this.system.strike.clock.toFixed(2)),
        phase: this.system.strike.phase,
        impacts: this.system.strike.impactCount,
        fires: this.system.burning,
        dust: this.system.dustCells,
        preset: this.ctx.quality.preset,
      }),
    };
  }

  /* ------------------------------- framing -------------------------------- */

  /**
   * A camera stood off from a point on a bearing, dropped onto the ground.
   *
   * Al-Rashid Crossing is about a hundred metres across and every one of those
   * metres has a wall in it, so a camera placed by distance alone lands inside
   * a building roughly every other time. Rather than pull the camera *in* when
   * the line of sight is blocked — which is how the first version of this
   * worked, and which is why several shots were photographs of a plaster wall
   * two metres away — it climbs. Anything that blocks the view of a strike is
   * a building, buildings here top out around eighteen metres, and rising over
   * the roofline both clears the shot and improves it: the town becomes a
   * model of itself with a fireball standing out of it.
   */
  private standoff(
    at: THREE.Vector3,
    bearing: number,
    distance: number,
    height: number,
    out: THREE.Vector3,
    subject = 16,
  ): THREE.Vector3 {
    // A compass bearing, the same convention `heading` uses. It was a maths
    // angle here for a while, which silently rotated every camera in this file
    // ninety degrees: the shot meant to be abeam of the run-in was looking
    // straight down the length of it, and eight craters spread over a hundred
    // and twenty metres photographed as one.
    headingToDir(bearing, _dir);
    const x = at.x + _dir.x * distance;
    const z = at.z + _dir.z * distance;

    // The datum is terrain, not whatever the camera happens to be standing in.
    // Palms line the street this range is sited down and their crowns are
    // seven metres across at exactly the height a camera wants to be; a camera
    // placed inside one photographs backlit fronds a hand's breadth from the
    // lens and nothing else. Anything standing at the camera position is
    // climbed over rather than composed around.
    const floor = this.world?.terrainHeight(x, z) ?? this.groundAt(x, z);
    const top = this.groundAt(x, z, at.y + height + 60);
    let lift = Math.max(height, top > floor + 1 ? top - floor + 3.5 : 0);

    const cast = this.physics?.raycast;
    if (cast) {
      // Sight back along the bearing from the candidate to the *subject*,
      // which is a fireball forty metres tall standing over `at` rather than
      // the patch of tarmac at `at` itself. Aiming the clearance ray at ground
      // level is how every shot in this file came to be taken from sixty
      // metres up: a ray that ends on the ground grazes the ground, reports a
      // hit whatever the camera does, and the loop climbs until it runs out of
      // iterations. Aiming it a third of the way up the blast asks the
      // question that was actually meant — can the camera see the explosion —
      // and answers it at eight metres instead of sixty.
      _probe.set(at.x, at.y + subject, at.z);
      for (let i = 0; i < LIFT_STEPS; i++) {
        _v.copy(_probe);
        _v.x -= x;
        _v.y -= floor + lift;
        _v.z -= z;
        const range = _v.length();
        _v.multiplyScalar(1 / Math.max(1e-3, range));
        _lookFrom.set(x, floor + lift, z);
        if (!cast.call(this.physics, _lookFrom, _v, range - 10)) break;
        lift += LIFT_STEP;
      }
    }
    out.set(x, floor + lift, z);
    return out;
  }

  /**
   * A camera standing in the street the strike is walking down.
   *
   * `back` is metres downrange of `at` — that is, ahead of the bombs, in the
   * part of the street the next few are about to arrive in — and `lateral` is
   * an offset across it. Both in metres rather than as a bearing and a
   * distance, because the street is sixteen metres wide and a thirty-degree
   * offset at sixty metres puts the camera thirty metres into a building.
   *
   * This is the framing the whole set-piece was designed for and the one it
   * took three passes to arrive at. Everything worth photographing about a
   * carpet strike happens between two rows of houses, and a street can only be
   * seen along its length: from abeam, every camera in this file was standing
   * behind a building photographing a bright sky over an intact roofline.
   */
  private alongRun(
    at: THREE.Vector3,
    back: number,
    lateral: number,
    height: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    headingToDir(this.heading, _fwd);
    headingToRight(this.heading, _right);
    const cast = this.physics?.raycast;
    // The street ends where the map does, and what is past the map is not more
    // street — it is the boundary slab the skybox hangs off, which a camera
    // placed by arithmetic alone will happily stand underneath. One aftermath
    // frame came back as the inside of it: girders, no sky, no town.
    const room = this.streetRoom(at, back);
    for (const slide of STREET_NUDGE) {
      const x = at.x + _fwd.x * room + _right.x * (lateral + slide);
      const z = at.z + _fwd.z * room + _right.z * (lateral + slide);
      const floor = this.world?.terrainHeight(x, z) ?? this.groundAt(x, z);
      out.set(x, floor + height, z);
      if (!cast) return out;
      // Clear directly overhead — no awning, no palm crown, no first floor.
      if (this.groundAt(x, z, floor + 30) > floor + 1) continue;
      // And clear back up the street, which is where the camera is looking.
      _v.copy(at).sub(out);
      const range = _v.length();
      _v.multiplyScalar(1 / Math.max(1e-3, range));
      if (!cast.call(this.physics, out, _v, range - 12)) return out;
    }
    return out;
  }

  /** How far downrange of `at` the camera can go and still be in the map. */
  private streetRoom(at: THREE.Vector3, want: number): number {
    const bounds = this.world?.bounds;
    if (!bounds) return want;
    let room = want;
    for (let d = want; d > 8; d -= 4) {
      const x = at.x + _fwd.x * d;
      const z = at.z + _fwd.z * d;
      if (
        x > bounds.min.x + EDGE &&
        x < bounds.max.x - EDGE &&
        z > bounds.min.z + EDGE &&
        z < bounds.max.z - EDGE
      ) {
        room = d;
        break;
      }
      room = d;
    }
    return room;
  }

  /**
   * Which side of the run-in to stand on.
   *
   * `offset` is measured off the heading, so ±90° is abeam of the walk, and
   * both signs are scored against two things.
   *
   * The sun dominates, and by a long way. The showcase runs at golden hour
   * with the sun six degrees up, so the wrong side of any shot is not merely
   * dimmer — it is a white disc in frame, a town rendered as a silhouette and
   * a fireball that has to compete with the sky for the brightest thing in the
   * picture. Standing downsun costs nothing and gets modelled buildings, long
   * shadows pointing at the lens and a black smoke column against a lit sky.
   *
   * The tiebreak is standing outside the town looking in, which matters here
   * more than it would on a bigger map: Al-Rashid is a hundred metres of
   * buildings in the middle of an empty plain, and the two sides of a shot are
   * "town behind the fireball" and "nothing behind the fireball".
   */
  private outward(offset: number): number {
    const centre = _v.set(0, 0, 0);
    this.world?.bounds.getCenter(centre);
    let ox = this.site.x - centre.x;
    let oz = this.site.z - centre.z;
    const away = Math.hypot(ox, oz);
    if (away > 1) {
      ox /= away;
      oz /= away;
    } else {
      ox = 0;
      oz = 0;
    }

    // Horizontal bearing of the sun. Standing on it means looking away from it.
    this.sunDir(_fwd);

    let best = -Infinity;
    let chosen = this.heading + offset;
    for (const bearing of [this.heading + offset, this.heading - offset]) {
      headingToDir(bearing, _dir);
      const score = _dir.x * _fwd.x + _dir.z * _fwd.z + 0.4 * (_dir.x * ox + _dir.z * oz);
      if (score <= best) continue;
      best = score;
      chosen = bearing;
    }
    return chosen;
  }

  /** Horizontal unit vector pointing at the sun. */
  private sunDir(out: THREE.Vector3): THREE.Vector3 {
    const sky = this.ctx.tryGet<ISky>('sky');
    return headingToDir(sky?.sunAzimuth ?? this.heading, out);
  }

  /** The first crater of the walk: where the marker was, less half the stick. */
  private firstCrater(out: THREE.Vector3): THREE.Vector3 {
    headingToDir(this.heading, _fwd);
    const back = this.system.strike.walkHalfLength;
    out.copy(this.site).addScaledVector(_fwd, -back);
    out.y = this.groundAt(out.x, out.z);
    return out;
  }

  /**
   * Registers a shot.
   *
   * `position` and `lookAt` are live vectors the setup writes into, because
   * the harness reads them after `setup` has run and several of these shots
   * cannot know where to point until the simulation has been integrated.
   */
  private shot(
    name: string,
    note: string,
    fov: number,
    frame: (position: THREE.Vector3, lookAt: THREE.Vector3) => number | void,
  ): void {
    const position = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const vantage = {
      name,
      position,
      lookAt,
      fov,
      note,
      hideViewmodel: true,
      setup: () => {
        const chosen = frame(position, lookAt);
        if (typeof chosen === 'number') vantage.fov = chosen;
      },
    };
    registerVantages([vantage]);
  }

  private registerShots(): void {
    const strike = this.system.strike;
    const lead = LEAD;

    /* ---- the tactical interface ---- */

    this.shot(
      'as_target',
      'Targeting mode: the tactical plan, the run-in footprint and its validity.',
      50,
      (position, lookAt) => {
        this.reset();
        this.system.setFrozen(true);
        this.system.showTargeting('carpet', this.site, this.heading);
        lookAt.copy(this.site);
        return this.system.tacticalPose(this.site, position);
      },
    );

    /* ---- the run-in ---- */

    this.shot(
      'as_jets',
      'The flight at the release point: three airframes, reheat, stores away.',
      40,
      (position, lookAt) => {
        // Just after the last store leaves the pylon, from under the track.
        this.kind = 'carpet';
        this.at(lead - 3.1);
        if (!strike.leadPosition(_lead)) _lead.copy(this.site).setY(this.site.y + 70);

        // Abeam and slightly below, half a wingspan of clear air around the
        // formation. The first two versions of this shot stood a hundred and
        // twenty metres behind the flight and aimed at a fixed fraction of the
        // range, which put the aircraft twenty degrees above the top of the
        // frame — a photograph of an empty sky with a wingtip in the corner.
        // A chase camera does not guess: it works out where the aeroplane is
        // and points at it, and everything else is composition.
        headingToRight(this.heading, _right);
        headingToDir(this.heading, _fwd);
        const side = _right.dot(this.sunDir(_sun)) >= 0 ? 1 : -1;
        // Outside the near wingman, not between it and the leader. A vic in
        // combat spread is fifty-four metres wide, and a camera parked in the
        // middle of that has one aircraft passing within a wingspan of the
        // lens — which is to say behind it — and photographs a two-ship. From
        // outside the formation the three sit at forty, sixty-six and ninety
        // metres and the depth between them is the composition.
        position
          .copy(_lead)
          .addScaledVector(_right, 66 * side)
          .addScaledVector(_fwd, -46);
        position.y = Math.max(
          this.groundAt(position.x, position.z, _lead.y + 60) + 6,
          _lead.y - 9,
        );
        // Aimed at the middle of the formation rather than at the lead — the
        // wingmen sit forty metres back and fifty out, and a camera that
        // frames the leader alone crops both of them off and photographs one
        // aeroplane in an empty sky.
        lookAt.copy(_lead).addScaledVector(_fwd, -18);
        // Then raised, not dropped. The run-in is seventy metres up over a
        // plain: everything below the horizon within two hundred metres of
        // this camera is bare sand, and aiming under the flight to "get the
        // ground in" only buys a third of a frame of it. Aiming above it pushes
        // the horizon down instead, which is the way round that gains sky.
        //
        // Nine metres, not two, and the arithmetic is worth writing down
        // because eyeballing it went the wrong way twice. The formation is
        // seventy-two metres from the lens, so the horizon sits at
        // 0.5 + 0.5·tan(aim) / tan(fov/2) of the frame height: at two metres of
        // rise that is 8.7 degrees of pitch and the horizon lands at
        // three-quarters height, leaving the bottom quarter of every frame as
        // featureless sand. Nine metres is fourteen degrees and puts it at
        // seven-eighths, which both buys back the sand and drops the flight
        // from the top of the frame into the middle of it.
        lookAt.y += 9;
        return 36;
      },
    );

    this.shot(
      'as_bomb',
      'A store mid-fall: brake out, nose down, the target underneath it.',
      46,
      (position, lookAt) => {
        this.kind = 'carpet';
        this.at(lead - 1.55);
        if (!strike.storePosition(_lead)) this.firstCrater(_lead);
        headingToRight(this.heading, _right);
        headingToDir(this.heading, _fwd);
        const side = _right.dot(this.sunDir(_sun)) >= 0 ? 1 : -1;
        // Above and behind the store, looking down past it at what it is
        // falling into. A bomb photographed against the sky has no scale and
        // no story: it could be a metre long or ten and it could be going
        // anywhere. Put a town under it and it is unmistakably ordnance, and
        // unmistakably about to arrive.
        //
        // Eight metres, not twenty-one. A 500 lb store is two and a half
        // metres long: from twenty-one metres on a long lens it is eighty
        // pixels of olive drab against a rooftop of olive-drab water tanks and
        // it disappears completely, which is what the first two passes of this
        // shot returned. From eight it is a third of the frame, the retarder
        // is legibly open, and the four fins read.
        //
        // Abeam, though — not astern. A stabilised store points along its own
        // velocity vector, so a camera placed behind and above it is looking
        // straight down the tail and photographs a two-and-a-half metre bomb
        // as a thirty-centimetre disc with four blades on it. It came back
        // looking like a ceiling fan hanging over the town. Standing off to
        // the side puts the whole length across the frame: nose down, body,
        // the open retarder, and the angle it is falling at, which is the one
        // fact the shot exists to show.
        //
        // Not square abeam either: swung forty degrees toward the run so the
        // camera is looking down the length of the town as well as across the
        // store. Square abeam costs nothing in foreshortening and buys a
        // background of empty desert, because a store at this point in its
        // fall is still short of the first crater and the town is all in front
        // of it.
        position
          .copy(_lead)
          .addScaledVector(_right, 6.5 * side)
          .addScaledVector(_fwd, -7.5);
        // And a shade *under* it, so it is seen against sky rather than lost
        // in the rooftops it is about to arrive in. The camera is level, which
        // puts the store a fifth of a frame above centre with the town spread
        // across the bottom half underneath it.
        position.y -= 2.6;
        lookAt.copy(_lead);
        lookAt.y = position.y;
        return 50;
      },
    );

    /* ---- the impact ---- */

    this.shot(
      'as_impact',
      'First detonation at +0.6 s, from the street it is standing in.',
      56,
      (position, lookAt) => {
        this.kind = 'carpet';
        // ### The two numbers this shot is pinned between
        //
        // Seventy-eight metres downrange, and six tenths of a second. Both
        // were arrived at the hard way.
        //
        // Nearer does not work, and not for a compositional reason. The
        // craters are fifteen metres apart and the fireball is thirty across,
        // so a camera anywhere *inside* the walk is inside a fireball: at
        // fifty-four metres this frame came back as a uniform sheet of orange
        // with a lamp post in it. The camera has to be past the end of the
        // line looking back along it, and at seventy-eight metres the nearest
        // crater that has gone off is thirty-three metres away, which is the
        // closest this town allows and still leaves the blast room to be a
        // shape.
        //
        // The height is the other half of it, and it is not a compositional
        // choice either. Three stores of the stick are still in the air at
        // this instant, nine, twenty-two and thirty-six metres up the street,
        // and a stabilised bomb coming down the axis of the shot is seen
        // end-on as a dark cross — five passes of this frame came back with
        // what looked like a ceiling fan hanging in the fireball. They cannot
        // be timed away: the walk is ninety metres long down a street a
        // hundred and thirty metres long, so every position along it has
        // ordnance arriving somewhere in front of it. But they are all *low* —
        // three, eight and eleven metres — because they are seconds from the
        // ground. Lifting the lens to thirteen metres, over the parapets and
        // looking slightly down the street, puts every one of them below the
        // bottom of the frame, and puts the camera at the height the fireball
        // is widest at.
        this.at(lead + 0.6);
        this.firstCrater(lookAt);
        this.alongRun(lookAt, 78, 4, 13, position);
        lookAt.y += 15;
      },
    );

    this.shot(
      'as_close',
      'The same blast from fifty metres. Danger close.',
      78,
      (position, lookAt) => {
        this.kind = 'carpet';
        // Fifty metres and four tenths of a second, which is as near as this
        // shot can be taken and still be *of* something. Forty metres at nine
        // tenths puts the lens inside the dust ring — the frame comes back a
        // uniform orange, which is an honest depiction of being forty metres
        // from a 500 lb bomb and a completely useless photograph of one.
        this.at(lead + 0.4);
        this.firstCrater(lookAt);
        this.alongRun(lookAt, 50, 3, 1.9, position);
        lookAt.y += 16;
      },
    );

    this.shot(
      'as_walking',
      'All seven down, a third of a second apart: a chain receding up the run-in.',
      50,
      (position, lookAt) => {
        this.kind = 'carpet';
        // ### Why this is photographed *after* the stick, not during it
        //
        // A 500 lb burst on this profile is a fireball thirty metres across
        // and the map only has room for craters fifteen apart, so at any
        // instant while the stick is still arriving the live fireballs are
        // touching and the frame is one continuous wall of orange — which is
        // exactly what the first three versions of this shot returned, and
        // exactly the failure the brief warns about. Widening the spacing is
        // not available: Al-Rashid is a hundred and thirty metres long and the
        // walk already uses ninety of them.
        //
        // What separates them is not distance, it is *age*. A third of a
        // second after the last store lands, the seven craters are at seven
        // different points of the same two-second animation: the near one is
        // still a white ball, the next is orange, the next has gone dark red
        // and started to lift, and the far end is already a brown column
        // standing over a fire. Nothing overlaps because nothing else is
        // still the same brightness, and the eye reads the gradient along the
        // line as the direction the aircraft flew.
        this.at(lead + 6 * VARIANTS.carpet.interval + 0.34);
        headingToDir(this.heading, _fwd);
        // Aimed at the middle of the chain and well up it, so the near
        // fireball is inside the frame rather than clipped against the edge of
        // it and the far end has somewhere to recede to.
        lookAt.copy(this.site).addScaledVector(_fwd, strike.walkHalfLength * 0.12);
        lookAt.y = this.groundAt(lookAt.x, lookAt.z) + 19;
        // Standing off the *downrange* end at a shallow angle to the run, so
        // the chain is compressed along the line of sight and the seven are
        // separated by depth rather than by frame position. Abeam at ninety
        // degrees — which is where this camera used to be — is the one bearing
        // from which a line of anything reads as a wall of it.
        this.standoff(this.site, this.outward(Math.PI * 0.23), 86, 20, position, 24);
      },
    );

    /* ---- context and aftermath ---- */

    this.shot(
      'as_wide',
      'The whole strike in the context of the map, from a hundred metres up.',
      44,
      (position, lookAt) => {
        this.kind = 'carpet';
        this.at(lead + 1.05);
        lookAt.copy(this.site);
        lookAt.y = this.groundAt(this.site.x, this.site.z) + 26;
        // Far enough back for the whole town, low enough that the horizon is
        // in the frame. Pulled in twice: from two hundred and seventy metres
        // and eighty-four up, then from two hundred and five and fifty-eight,
        // both of which cleared the map so comprehensively that the picture
        // was mostly the flat sand the map is standing on.
        this.standoff(this.site, this.outward(Math.PI * 0.68), 156, 44, position, 30);
      },
    );

    this.shot(
      'as_aftermath',
      'Fifteen seconds after the last bomb: columns, fires, and dust that will not clear.',
      50,
      (position, lookAt) => {
        this.kind = 'carpet';
        this.at(lead + 15);
        // The same three-quarter view the wide shot uses, and for the same
        // reason: from street level the aftermath is seven smudges over an
        // apparently untouched roofline, because the craters that made them
        // are down a street the camera cannot see into. From up here the
        // columns are seen standing out of the holes they came from, with the
        // fires still lit at their roots and the dust lying in the street.
        lookAt.copy(this.site);
        lookAt.y = this.groundAt(this.site.x, this.site.z) + 18;
        this.standoff(this.site, this.outward(Math.PI * 0.6), 122, 34, position, 30);
      },
    );

    /* ---- the other three variants ---- */

    this.shot(
      'as_precision',
      'One two-thousand pounder at +0.4 s. A single crater, and a very big one.',
      62,
      (position, lookAt) => {
        this.kind = 'precision';
        this.at(lead + 0.4);
        lookAt.copy(this.site);
        this.standoff(this.site, this.outward(Math.PI * 0.6), 84, 9, position);
        lookAt.y += 30;
      },
    );

    this.shot(
      'as_cluster',
      'A dispenser pattern at the instant it is all alight: thirty-six bomblets across forty metres.',
      48,
      (position, lookAt) => {
        this.kind = 'cluster';
        // Half a second, and the half-second matters more here than anywhere
        // else in the file. The pattern lands over a window of exactly 0.5 s —
        // the first bomblet at +0.0 and the last at +0.5 — and a bomblet burst
        // is bright for about a third of one. So +0.5 is the one moment at
        // which the whole pattern is simultaneously alight, and it is the only
        // moment worth photographing: at +0.9, where this shot used to sit,
        // nearly all of them have collapsed to smoke and the picture is a town
        // with one spark in it.
        this.at(lead + 0.5);
        lookAt.copy(this.site);
        // Twenty-six metres up and looking down the depression into the
        // streets, which is the only way this variant photographs. The pattern
        // is forty metres wide and lands across courtyards, alleys and roofs,
        // so from the street-level standoff the other shots use, the front rank
        // of houses hides two thirds of it. Going all the way up to a plan view
        // loses the sky and the town reads as a diorama; this is the height at
        // which the horizon is still in the top of frame.
        this.standoff(this.site, this.outward(Math.PI * 0.55), 74, 26, position);
        lookAt.y += 9;
      },
    );

    this.shot(
      'as_napalm',
      'Napalm ten seconds in: a wall of fire spreading, heavy black smoke.',
      52,
      (position, lookAt) => {
        this.kind = 'napalm';
        this.at(lead + 10);
        lookAt.copy(this.site);
        this.standoff(this.site, this.outward(Math.PI * 0.52), 92, 11, position);
        lookAt.y += 12;
      },
    );
  }

  dispose(): void {
    if (window.__STRIKE__) delete window.__STRIKE__;
  }
}

/** Seconds from a confirm to the first crater; the spine of every shot here. */
const LEAD = AirstrikeDirector.leadTime;
