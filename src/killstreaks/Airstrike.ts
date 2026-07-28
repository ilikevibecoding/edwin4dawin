import * as THREE from 'three';
import type { AirstrikeEvent, ExplosionEvent } from '../core/Events';
import type { GameContext } from '../core/GameContext';
import { JetFlight, RUN_SPEED, runInPoint } from './Aircraft';
import { type Budget, type Deps, headingToDir, headingToRight, UP } from './Common';
import type { DistortionField } from './Exhaust';
import type { DustHaze, GroundFire, SmokeColumns } from './Ground';
import { BombKind, type BombKindId } from './models/Bomb';
import type { OrdnanceField, OrdnanceHit } from './Ordnance';

/**
 * The airstrike, from confirm to the last fire going out.
 *
 * ## Why the aircraft flies at 88 m/s
 *
 * Two numbers had to be reconciled and only one degree of freedom connects
 * them. A stick released at a fixed interval from an aircraft in straight and
 * level flight lands at a spacing of `speed × interval` and detonates at that
 * same interval — the fall time is common to every store in the stick, so it
 * cancels. Wanting sixteen metres between craters *and* wanting the ripple slow
 * enough that the eye resolves it as a walk therefore fixes the speed at
 * roughly ninety metres a second, and nothing else in the sequence can pay for
 * it.
 *
 * That is 170 knots: slow for a fast jet, about right for one that is heavily
 * laden and being flown deliberately. It also happens to be the speed at which
 * a seventeen-metre airframe passing eighty-five metres overhead is on screen
 * long enough to be looked at, which is the whole point of modelling it, so the
 * compromise pays for itself twice.
 *
 * ## The timeline, measured from the confirm
 *
 * ```
 *   0.00  confirm; airstrike:begin; the camera starts back down to first person
 *   0.00  the flight appears 790 m out, 70 m up, on the run-in heading
 *   0.75  first person restored, control returned to the player
 *   5.10  bomb 0 leaves the pylon 320 m short of the first crater
 *   5.10 … 6.12   the rest of the stick, one every 170 ms
 *   7.22  the lead pulls up and breaks; full reheat, vortices off the tips
 *   9.00  first detonation — 3.9 s of fall, and the lead is long gone
 *   9.00 … 10.02  the walking line, 15 m and 170 ms apart
 *  10.02  last detonation; the concussion, the radial blur, the duck
 *  10.0 … 35+     the aftermath: fires, columns, and dust that will not clear
 * ```
 *
 * `precision` fires one 2000 lb store on the same geometry. `cluster` releases
 * two dispensers 160 ms apart that open at ninety metres and scatter thirty-six
 * bomblets over a forty-metre pattern, all of which arrive within half a second
 * of each other. `napalm` flies the run at forty metres, lays two tanks, and
 * leaves a wall of fire that spreads for the best part of a minute.
 *
 * ## Determinism
 *
 * Everything advances through `step`, which the owner only ever calls with a
 * fixed sixtieth of a second. The showcase fast-forwards by calling it more
 * often rather than by calling it with a bigger number, so a frame photographed
 * at t = 9.1 s is the same frame every time and the ballistics that put the
 * craters where they are were genuinely integrated to get there.
 */

export type StrikeKind = AirstrikeEvent['kind'];

export const PHASE = {
  IDLE: 0,
  INBOUND: 1,
  IMPACT: 2,
  AFTERMATH: 3,
} as const;

interface Variant {
  /** Stores in the stick. */
  count: number;
  kind: BombKindId;
  /** Seconds between releases. */
  interval: number;
  /** Gameplay blast radius, metres. */
  radius: number;
  damage: number;
  /**
   * Visual multiplier on the gameplay radius.
   *
   * The two are separated because they answer different questions. The
   * gameplay radius is how far the bomb kills, and it is small — a 500 lb
   * bomb is lethal over about twenty metres and no further. The fireball is
   * how big the bomb *looks*, and a strike whose fireball matches its lethal
   * radius photographs as a large grenade. Real ordnance throws a ball of
   * flame that dwarfs the ground it sterilises, and the whole reason to call
   * one of these in is to watch that happen.
   */
  blast: number;
  /** Run-in height above the target, metres. */
  altitude: number;
  /** How many aircraft fly the run. */
  jets: number;
  /** Half-length and half-width of the targeting footprint. */
  footLength: number;
  footWidth: number;
  /** Circular footprint, for the strikes that do not walk. */
  round: boolean;
  /** Seconds the aftermath is held before the sequence ends. */
  aftermath: number;
  label: string;
}

export const VARIANTS: Record<StrikeKind, Variant> = {
  precision: {
    count: 1,
    kind: BombKind.HEAVY,
    interval: 0,
    radius: 28,
    damage: 460,
    blast: 1.85,
    altitude: 90,
    jets: 2,
    footLength: 20,
    footWidth: 20,
    round: true,
    aftermath: 22,
    label: 'PRECISION AIRSTRIKE',
  },
  carpet: {
    // Seven, not nine, and fifteen metres apart rather than eighteen. Al-Rashid
    // Crossing is ninety-six metres wide and a hundred and thirty long, and a
    // stick sized without reference to that walks off the end of the map: the
    // first version put three craters in the desert past the north wall and the
    // photograph of the walking line had a forty-metre hole in the middle of
    // it. Seven at fifteen is ninety metres, which is the longest straight
    // stretch of street the town actually has.
    count: 7,
    kind: BombKind.LIGHT,
    interval: 0.17,
    radius: 21,
    damage: 260,
    // A shade under the precision round's, and deliberately. A 500 lb burst
    // rendered at this profile is a fireball thirty-one metres across landing
    // fifteen metres from the last one, so at 1.5 the seven of them summed
    // into a single opaque slab of cooling red ninety metres long with no
    // internal structure at all. Backed off to 1.44 the balls still stand
    // twice the height of everything they are standing between — a bomb has
    // to dwarf a building or the whole set-piece is a firework — but each one
    // keeps its own crown, and the line reads as seven events.
    blast: 1.44,
    altitude: 70,
    jets: 3,
    footLength: 46,
    footWidth: 13,
    round: false,
    aftermath: 26,
    label: 'CARPET BOMB',
  },
  cluster: {
    count: 2,
    kind: BombKind.CANISTER,
    // Not half a second. The aircraft is doing eighty-eight metres a second,
    // so half a second put the two dispensers forty-four metres apart before
    // either of them had opened, and the two sixty-metre patterns they threw
    // barely touched: the strike photographed as a hundred metres of desert
    // with a few sparks in it. At 0.16 they open fourteen metres apart and
    // the patterns lie on top of one another.
    interval: 0.16,
    radius: 9,
    damage: 130,
    blast: 1.15,
    altitude: 105,
    jets: 2,
    footLength: 40,
    footWidth: 30,
    round: true,
    aftermath: 18,
    label: 'CLUSTER STRIKE',
  },
  napalm: {
    count: 4,
    kind: BombKind.TANK,
    interval: 0.34,
    radius: 15,
    damage: 190,
    blast: 1.6,
    altitude: 42,
    jets: 2,
    footLength: 48,
    footWidth: 16,
    round: false,
    aftermath: 40,
    label: 'NAPALM STRIKE',
  },
};

/**
 * A step that walks `0 … n-1` in a low-discrepancy order and visits every one.
 *
 * Near the golden fraction of `n` so successive steps land far apart, and
 * nudged upwards until it is coprime with `n`, without which it would cycle
 * early and hand the same few slots out repeatedly.
 */
function orderStride(n: number): number {
  let stride = Math.max(1, Math.round(n * 0.6180339887));
  for (let guard = 0; guard < n; guard++) {
    let a = stride;
    let b = n;
    while (b !== 0) {
      const t = a % b;
      a = b;
      b = t;
    }
    if (a === 1) return stride;
    stride = (stride % n) + 1;
  }
  return 1;
}

const GRAVITY = 9.81;
/** Downward push an ejector rack gives a store so it clears the wing, m/s. */
const EJECT_SPEED = 2.6;
/** How far under the aircraft's reference point the pylons hang, metres. */
const PYLON_DROP = 0.95;
/**
 * Seconds from confirm to the first detonation.
 *
 * It also fixes where the aircraft start: the lead is over the first crater at
 * exactly this moment, so it begins the run `LEAD_TIME × speed` — a little
 * under eight hundred metres — short of it, which is far enough to come out of
 * the haze as a speck and near enough that the countdown means something.
 */
const LEAD_TIME = 9;

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _target = new THREE.Vector3();

const _explosion: ExplosionEvent = {
  position: new THREE.Vector3(),
  radius: 20,
  damage: 250,
  scale: 1,
  source: 'airstrike',
  normal: new THREE.Vector3(0, 1, 0),
};
const _shake = {
  amplitude: 0,
  duration: 0,
  frequency: 16,
  position: new THREE.Vector3(),
  radius: 120,
};
const _audio = { id: '', position: new THREE.Vector3(), volume: 1, rate: 1 };
const _impactEvt = { position: new THREE.Vector3(), index: 0, total: 1 };
const _releaseEvt = { position: new THREE.Vector3(), index: 0, total: 1 };
const _flybyEvt = { position: new THREE.Vector3(), velocity: new THREE.Vector3(), index: 0 };
const _phaseEvt = {
  kind: 'carpet' as StrikeKind,
  phase: 'inbound' as 'targeting' | 'inbound' | 'impact' | 'aftermath',
  secondsRemaining: 0,
};
const _aircraftEvt = {
  id: 'jet',
  kind: 'jet' as 'jet' | 'helicopter' | 'gunship',
  position: new THREE.Vector3(),
  active: true,
};
const _beginEvt: AirstrikeEvent = {
  target: new THREE.Vector3(),
  heading: 0,
  kind: 'carpet',
};
const _damage = {
  amount: 0,
  kind: 'explosion' as const,
  from: undefined as THREE.Vector3 | undefined,
  attacker: 'player' as const,
};

interface Round {
  handle: number;
  jet: number;
  station: number;
  releaseAt: number;
  released: boolean;
  landed: boolean;
}

export class AirstrikeDirector {
  phase: number = PHASE.IDLE;
  kind: StrikeKind = 'carpet';
  /** Seconds since the confirm. */
  clock = 0;

  readonly target = new THREE.Vector3();
  heading = 0;

  private readonly rounds: Round[] = [];
  private variant = VARIANTS.carpet;
  private releaseOrigin = new THREE.Vector3();
  private fallTime = 4;
  private landed = 0;
  private total = 1;
  private ended = false;
  private flybyDone = false;
  private groundY = 0;
  private aftermathUntil = 0;
  private heatHaze = 0;
  private radialBlur = 0;
  private postHeld = false;
  private smokeAt = 0;
  private smokeIndex = 0;
  private clusterTag = 1000;

  constructor(
    private readonly ctx: GameContext,
    private readonly deps: Deps,
    private readonly budget: Budget,
    private readonly flight: JetFlight,
    private readonly ordnance: OrdnanceField,
    private readonly fire: GroundFire,
    private readonly haze: DustHaze,
    private readonly smoke: SmokeColumns,
    private readonly distortion: DistortionField | null,
  ) {
    this.ordnance.onImpact = (hit) => this.detonate(hit);
    this.ordnance.onOpen = (_tag, x, y, z, vx, vy, vz) => this.openCanister(x, y, z, vx, vy, vz);
  }

  get active(): boolean {
    return this.phase !== PHASE.IDLE;
  }

  /** Seconds until the first detonation, or 0 once they have started. */
  get secondsToImpact(): number {
    return Math.max(0, LEAD_TIME - this.clock);
  }

  /** Seconds from a confirm to the first crater. Fixed, and the same for all. */
  static get leadTime(): number {
    return LEAD_TIME;
  }

  /** Where the lead aircraft is, for a camera that wants to look at it. */
  leadPosition(out: THREE.Vector3): boolean {
    const lead = this.flight.jets[0];
    if (!lead?.active) return false;
    out.copy(lead.position);
    return true;
  }

  /** The first store still in the air, for the shot of a bomb mid-fall. */
  storePosition(out: THREE.Vector3): boolean {
    for (const round of this.rounds) {
      if (!round.released) continue;
      if (this.ordnance.positionOf(round.handle, out)) return true;
    }
    return false;
  }

  /** Half-length of the walk along the heading, for framing and for the HUD. */
  get walkHalfLength(): number {
    return ((this.variant.count - 1) * RUN_SPEED * this.variant.interval) / 2;
  }

  /**
   * The lateral offset, in metres right of the track, that each round of a
   * stick of `count` is released from.
   *
   * A ripple empties the wings outboard-inward and alternating, so a stick is
   * a zigzag nine metres wide rather than a line, and the showcase has to know
   * that when it decides whether a street is wide enough to bomb.
   */
  stationOffsets(count: number, out: number[] = []): number[] {
    out.length = 0;
    const jet = this.flight.jets[0];
    const stations = Math.max(1, jet?.hardpointCount ?? 1);
    for (let i = 0; i < count; i++) out.push(jet?.stationOffset(i % stations) ?? 0);
    return out;
  }

  /**
   * How high a store of this variant is `back` metres short of its aim point.
   *
   * The showcase uses it to check that the run-in it has chosen does not fly
   * the stick through the side of a gatehouse on the way in. Sampled from the
   * real integration rather than from a slope, because the trajectory is
   * convex and a straight line through it is wrong in both directions.
   */
  approachHeight(kind: StrikeKind, back: number): number {
    const variant = VARIANTS[kind];
    return this.ordnance.approachHeight(
      variant.kind,
      RUN_SPEED,
      variant.altitude - PYLON_DROP,
      EJECT_SPEED,
      back,
    );
  }

  /** Craters written so far. */
  get impactCount(): number {
    return this.landed;
  }

  /* ------------------------------- launch -------------------------------- */

  begin(kind: StrikeKind, target: THREE.Vector3, heading: number): void {
    this.abortOrdnance();
    this.kind = kind;
    this.variant = VARIANTS[kind];
    this.phase = PHASE.INBOUND;
    this.clock = 0;
    this.landed = 0;
    this.ended = false;
    this.flybyDone = false;
    this.smokeAt = 0;
    this.smokeIndex = 0;
    this.target.copy(target);
    this.heading = heading;
    this.groundY = this.deps.groundAt(target.x, target.z, target.y + 40);
    this.target.y = this.groundY;

    const variant = this.variant;
    this.total = variant.count;

    // The stick is centred on the target, so the marker the player put down is
    // the middle of the walk rather than its leading edge.
    const spacing = RUN_SPEED * variant.interval;
    const back = ((variant.count - 1) * spacing) / 2;
    headingToDir(heading, _fwd);
    _target.copy(this.target).addScaledVector(_fwd, -back);

    // Ballistics, backwards. The fall is integrated rather than solved in
    // closed form — see `OrdnanceField.solve` — so the release point accounts
    // for drag and the stick straddles the reticle instead of landing a
    // quarter of the map short of it.
    //
    // The two corrections below are small and both were worth seventeen metres
    // of aim error, which on a ninety-metre stick is more than a crater's
    // spacing. The rack throws the store *down* at 2.6 m/s and the solver has
    // to be told so, and the store leaves a pylon that hangs a metre under the
    // wing rather than the aircraft's own reference point.
    const altitude = variant.altitude;
    const solution = this.ordnance.solve(
      variant.kind,
      RUN_SPEED,
      altitude - PYLON_DROP,
      EJECT_SPEED,
    );
    this.fallTime = solution[0];
    const throwDistance = solution[1];
    this.releaseOrigin
      .copy(_target)
      .addScaledVector(_fwd, -throwDistance)
      .setY(this.groundY + altitude);

    const releaseAt = LEAD_TIME - this.fallTime;

    // The lead starts wherever it has to be to reach the release point on time,
    // which — because the store keeps the aircraft's horizontal speed — always
    // works out to `LEAD_TIME × speed` short of the first crater.
    runInPoint(
      heading,
      _target,
      this.groundY + altitude,
      throwDistance + RUN_SPEED * releaseAt,
      _v,
    );
    const jets = Math.min(variant.jets, this.flight.jets.length);
    const lastRelease = releaseAt + (variant.count - 1) * variant.interval;
    for (let i = 0; i < jets; i++) {
      this.flight.jets[i].launch({
        x: _v.x,
        y: _v.y,
        z: _v.z,
        heading,
        speed: RUN_SPEED,
        // The lead holds the run until its last store is away and then breaks
        // hard; the wingmen, carrying nothing, break a moment earlier and the
        // other way, which is what makes three aircraft read as a formation
        // rather than as one aircraft drawn three times.
        pullUpAt: lastRelease + (i === 0 ? 1.1 : 0.45),
        breakDir: i === 1 ? -1 : 1,
        // Tight, and tighter than a real combat spread would be. Ninety-four
        // metres wing to wing is correct doctrine and it is useless to look
        // at: any camera near enough to the leader to see that it is a modelled
        // aeroplane rather than a dart has both wingmen outside the frame, and
        // any camera far enough back to hold all three has none of them. Fifty
        // four metres across and thirty deep is a formation that fits in a
        // single photograph with the aircraft still large in it.
        formationRight: i === 0 ? 0 : i === 1 ? -27 : 26,
        formationUp: i === 0 ? 0 : 5,
        formationBack: i === 0 ? 0 : 30,
        contrail: this.budget.contrails,
      });
    }

    // Hang the stick on the lead's pylons, outboard stations first.
    this.rounds.length = 0;
    for (let i = 0; i < variant.count; i++) {
      const handle = this.ordnance.arm(variant.kind, i);
      this.rounds.push({
        handle,
        jet: 0,
        station: i % Math.max(1, this.flight.jets[0].hardpointCount),
        releaseAt: releaseAt + i * variant.interval,
        released: false,
        landed: false,
      });
    }

    _beginEvt.target.copy(this.target);
    _beginEvt.heading = heading;
    _beginEvt.kind = kind;
    this.ctx.events.emit('airstrike:begin', _beginEvt);
    this.sound('airstrike_approach', undefined, 1, 1);
    this.emitPhase('inbound', LEAD_TIME);
  }

  /* -------------------------------- frame -------------------------------- */

  /** One fixed step. Never called with anything but a sixtieth. */
  step(dt: number, time: number): void {
    if (this.phase === PHASE.IDLE) return;
    this.clock += dt;

    this.flight.update(dt, time, this.distortion);
    this.carryAndRelease();
    this.ordnance.update(dt);
    this.flyby();
    this.decayPost(dt);
    this.countdown();

    if (this.phase === PHASE.INBOUND && this.landed > 0) {
      this.phase = PHASE.IMPACT;
      this.emitPhase('impact', this.variant.interval * this.total);
    }
    if (this.phase === PHASE.IMPACT && this.landed >= this.total && this.ordnance.liveCount === 0) {
      this.phase = PHASE.AFTERMATH;
      this.aftermathUntil = this.clock + this.variant.aftermath;
      this.emitPhase('aftermath', this.variant.aftermath);
      this.finalConcussion();
    }
    if (this.phase === PHASE.AFTERMATH) {
      this.smoulder();
      if (this.clock >= this.aftermathUntil && !this.ended) this.end();
    }

    // A strike that somehow loses its ordnance still has to give the game back.
    if (!this.ended && this.clock > LEAD_TIME + 30 && this.phase !== PHASE.AFTERMATH) {
      this.phase = PHASE.AFTERMATH;
      this.aftermathUntil = this.clock + 2;
    }
  }

  /* ------------------------------ ordnance ------------------------------- */

  private carryAndRelease(): void {
    const lead = this.flight.jets[0];
    if (!lead) return;
    for (let i = 0; i < this.rounds.length; i++) {
      const round = this.rounds[i];
      if (round.released || round.handle < 0) continue;
      if (this.clock < round.releaseAt) {
        if (lead.hardpoint(round.station, _mat)) this.ordnance.carry(round.handle, _mat);
        continue;
      }
      round.released = true;
      if (lead.hardpoint(round.station, _mat)) {
        this.ordnance.carry(round.handle, _mat);
        _v.setFromMatrixPosition(_mat);
      } else {
        _v.copy(lead.position);
      }
      // Ejector racks push a store *down* off the pylon so it clears the wing.
      this.ordnance.release(
        round.handle,
        lead.velocity.x,
        lead.velocity.y - EJECT_SPEED,
        lead.velocity.z,
        this.variant.kind === BombKind.TANK ? 1.6 : 0.85,
        this.variant.kind === BombKind.CANISTER ? this.canisterFuze() : -1,
        i * 7 + 3,
        this.variant.kind !== BombKind.LIGHT || i % 2 === 0,
      );
      _releaseEvt.position.copy(_v);
      _releaseEvt.index = i;
      _releaseEvt.total = this.total;
      this.ctx.events.emit('airstrike:release', _releaseEvt);
      if (i === 0) this.sound('airstrike_release', _v, 0.7, 1);
    }
  }

  /** Seconds after release the dispenser splits, sized to open at ~90 m AGL. */
  private canisterFuze(): number {
    const openAt = 90;
    const drop = Math.max(6, this.variant.altitude - openAt);
    return Math.sqrt((2 * drop) / GRAVITY);
  }

  private openCanister(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
  ): void {
    const count = Math.max(9, Math.round(this.budget.bomblets / 2));
    // A dispenser opens by blowing its skin off, so the bomblets leave with a
    // radial velocity and the pattern grows the whole way down. Laid out on a
    // deterministic spiral rather than at random: the same strike has to
    // photograph the same way twice.
    //
    // The radial figure is a *velocity*, and the bomblets carry it for the
    // four and a quarter seconds it takes them to fall ninety metres. Thirteen
    // metres a second is therefore a fifty-five metre throw and a hundred and
    // ten metre circle, not the sixty this was supposed to be; at 6.5 the
    // pattern comes out the size it was drawn.
    //
    // Nothing here spreads the *arrival* times, and that is deliberate. It is
    // the obvious way to make the pattern crackle rather than slam, and it
    // does not work: the bomblets are carrying the aircraft's eighty-eight
    // metres a second downrange, so six hundred milliseconds of arrival spread
    // is fifty-five metres of downrange smear, and the tidy forty-metre
    // pattern comes out as a seventy-metre streak. Time and space are the same
    // axis here. They arrive together.
    const stride = orderStride(count);
    for (let i = 0; i < count; i++) {
      // Position comes from a permuted index, and this is the whole trick that
      // makes the pattern read.
      //
      // Only about fifteen bomblet blasts fit in the shared fire particle ring
      // at medium, and it evicts oldest-first — so of thirty-six arriving
      // together, the fifteen actually drawn are the last fifteen spawned.
      // Straight down the spiral, later index means larger radius, so those
      // fifteen were all on the outer edge and the pattern photographed as a
      // ring with a hole in the middle. Walking the spiral in strides of
      // roughly the golden fraction of its length visits it in a
      // low-discrepancy order instead, so any tail end of the sequence is
      // spread evenly over the whole disc: whichever fifteen survive, they
      // survive uniformly.
      const j = (i * stride) % count;
      const golden = j * 2.39996323;
      const r = Math.sqrt((j + 0.5) / count) * 6.5;
      this.ordnance.scatter(
        this.clusterTag + i,
        x,
        y,
        z,
        vx + Math.cos(golden) * r,
        vy + 1.5 + (i % 3) * 0.6,
        vz + Math.sin(golden) * r,
        i * 5 + 1,
      );
    }
    _v.set(x, y, z);
    this.sound('airstrike_cluster_open', _v, 0.85, 1);
    this.deps.lighting?.flashLight?.(_v, 0xfff0c0, 220, 40, 0.1);
    this.clusterTag += count;
    // The dispenser is gone and every bomblet is now its own impact.
    this.total += count - 1;
  }

  /* ------------------------------ detonation ------------------------------ */

  private detonate(hit: OrdnanceHit): void {
    const variant = this.variant;
    const bomblet = hit.kind === BombKind.BOMBLET;
    const napalm = hit.kind === BombKind.TANK;
    const radius = bomblet ? 7 : variant.radius;
    const damage = bomblet ? 90 : variant.damage;

    _v.set(hit.x, hit.y + (napalm ? 0.6 : 0.4), hit.z);

    if (napalm) {
      this.layFire(hit.x, hit.z);
    } else {
      _explosion.position.copy(_v);
      _explosion.radius = radius;
      _explosion.damage = damage;
      _explosion.scale = bomblet ? 2 : variant.blast;
      // Bombs are `airstrike`; bomblets are `grenade`, and the distinction is
      // what makes a dispenser pattern legible at all.
      //
      // Two reasons, and the second is the one that actually decides it. The
      // airstrike profile rings its dust out to 1.9 R at 2.6x density, which is
      // right for one 500 lb crater and catastrophic for thirty-six of them
      // forty metres apart: every ring overlaps every other and the strike
      // photographs as a single dome of beige. But the harder limit is the
      // particle ring. The shared FIRE batch is twelve per cent of the frame
      // budget — seven hundred slots at medium — and it evicts oldest-first, so
      // a blast that asks for a hundred fire particles guarantees that only the
      // last seven blasts of a pattern are still alight. The grenade profile
      // asks for about forty-five, runs the hottest core of any of them
      // (3400 K against the airstrike's 3200) and the least soot, so three
      // times as many bomblets are on screen at once and each is brighter.
      // It is also simply the correct physics: a bomblet is a grenade.
      _explosion.source = bomblet ? 'grenade' : 'airstrike';
      (_explosion.normal as THREE.Vector3).set(0, 1, 0);
      this.ctx.events.emit('fx:explosion', _explosion);
    }

    // A bomblet leaves a small fire, and unlike everything else in this method
    // that is free: ground fire is one instanced quad out of this package's own
    // pool, not a draw on the shared particle ring. It is what stops a cluster
    // strike from evaporating. The bursts themselves are bright for a third of
    // a second each and then the pattern is simply gone, whereas thirty-odd
    // small fires burning in the streets for a quarter of a minute is both what
    // submunitions actually do and the only aftermath that distinguishes this
    // variant from a very brief carpet. No spread — generation 0 — because
    // these are scattered over the whole pattern already and a spreading grid
    // of thirty-six would swallow the map.
    if (bomblet) {
      this.fire.ignite(hit.x, hit.z, 3.2, 16, 0.75, 0);
    }

    // Damage and force. The physics system applies its own impulse from the
    // explosion event, so only the AI and the player are settled here.
    this.deps.ai?.damageRadius?.(_v, radius, damage, 'airstrike');
    this.deps.physics?.applyExplosionForce?.(_v, radius * 1.4, damage * 7);
    this.hurtPlayer(_v, radius, damage);

    // Shake, attenuated by distance by the camera system itself.
    _shake.amplitude = Math.min(1.1, napalm ? 0.28 : 0.16 * Math.sqrt(radius) * 1.5);
    _shake.duration = napalm ? 0.5 : 0.85;
    _shake.frequency = 15;
    _shake.position.copy(_v);
    _shake.radius = radius * 8;
    this.ctx.events.emit('camera:shake', _shake);

    const distance = this.ctx.camera.position.distanceTo(_v);
    const near = Math.max(0, 1 - distance / (radius * 4 + 20));
    this.heatHaze = Math.min(1, Math.max(this.heatHaze, near * 0.55));
    this.radialBlur = Math.min(1, Math.max(this.radialBlur, near * near * 0.85));

    // Dust that will still be hanging there in twenty seconds. Only every other
    // crater seeds one; a cell per bomb is more volume than the map can carry.
    //
    // Kept low and kept small. These are billboards, so a cell of radius thirty
    // planted seven metres up reaches thirty-seven metres into the sky and the
    // aftermath photographs as weather rather than as a bombed street — which
    // is precisely what the first pass did. Dust from a ground burst hangs at
    // roof height and below; the thing above roof height is the column.
    if (!bomblet && this.landed % 2 === 0) {
      this.haze.add(hit.x, hit.y + 2.5, hit.z, 9 + radius * 0.34, 30, 0.5, 1.3);
    }
    // Every ninth bomblet rather than every sixth: the pattern is half the
    // width it used to be, so the same number of cells over it is twice the
    // depth of dust to see the bursts through.
    if (bomblet && this.landed % 9 === 0) {
      this.haze.add(hit.x, hit.y + 1.6, hit.z, 7, 18, 0.34, 0.9);
    }

    // And the column. Planted the instant the bomb lands rather than at the end
    // of the sequence, because the first crater has to already be smoking while
    // the last one is still a fireball — that stagger is most of what makes the
    // walking line read as a line rather than as one large event.
    if (!bomblet) {
      const dwell = variant.aftermath * (napalm ? 1.15 : 0.86);
      this.smoke.plant(hit.x, hit.y + 0.5, hit.z, radius * 0.36, dwell, napalm ? 3.4 : 2.6);
      // A crater is a hole full of burning fuel, pulverised masonry and
      // whatever the building was made of. It smoulders, and the fire is what
      // puts the light under the root of the column — a smoke plume with no
      // fire beneath it reads as a chimney rather than as a bombed street.
      this.fire.ignite(hit.x, hit.z, radius * 0.42, dwell * 0.85, napalm ? 1 : 0.85, 1);
    } else if (this.landed % 3 === 0) {
      this.smoke.plant(hit.x, hit.y + 0.4, hit.z, 2.4, 14, 2);
    }

    // The light. A blast this size is briefly the brightest thing on the map
    // and the single cheapest way to make it read as enormous is to let it put
    // its own colour on the buildings around it — without this the fireball is
    // a bright shape pasted over a street that has not noticed it.
    if (!napalm) {
      this.deps.lighting?.flashLight?.(
        _v,
        bomblet ? 0xffd6a0 : 0xffb45a,
        bomblet ? 260 : 3400 * variant.blast,
        bomblet ? 26 : radius * 4.5,
        bomblet ? 0.12 : 0.42,
      );
    }

    _impactEvt.position.copy(_v);
    _impactEvt.index = this.landed;
    _impactEvt.total = this.total;
    this.ctx.events.emit('airstrike:impact', _impactEvt);
    this.landed++;
  }

  /**
   * The player is not exempt.
   *
   * A killstreak the caller cannot be killed by is a cutscene, and the moment a
   * player learns they can walk into their own carpet is the moment the strike
   * becomes a decision rather than a button. Falloff is quadratic from the rim
   * so standing at the edge is survivable and standing on it is not.
   */
  private hurtPlayer(at: THREE.Vector3, radius: number, damage: number): void {
    const player = this.deps.player;
    if (!player?.alive) return;
    const distance = player.position.distanceTo(at);
    if (distance > radius) return;
    const falloff = 1 - distance / radius;
    _damage.amount = damage * falloff * falloff;
    _damage.from = at;
    player.damage(_damage);
  }

  private layFire(x: number, z: number): void {
    // A tank does not explode, it splits and throws burning fuel forward along
    // the aircraft's track. Three seed patches, and the spread does the rest.
    headingToDir(this.heading, _fwd);
    headingToRight(this.heading, _right);
    const scale = Math.max(0.5, this.budget.scale);
    for (let i = 0; i < 3; i++) {
      const along = (i - 1) * 9;
      const across = ((i % 2) - 0.5) * 4;
      this.fire.ignite(
        x + _fwd.x * along + _right.x * across,
        z + _fwd.z * along + _right.z * across,
        6.5,
        34 + i * 3,
        1,
        Math.round(2 + scale),
      );
    }
    _v.set(x, this.deps.groundAt(x, z, x + 30) + 1.2, z);
    this.deps.lighting?.flashLight?.(_v, 0xff7a20, 900, 50, 0.9);
    this.sound('napalm_burst', _v, 1, 1);
    // A tank going off throws a low, wide, very sooty fireball rather than a
    // column, so the blast profile is dialled down and the fire carries it.
    _explosion.position.copy(_v);
    _explosion.radius = 12;
    _explosion.damage = 120;
    _explosion.scale = 1.5;
    _explosion.source = 'barrel';
    this.ctx.events.emit('fx:explosion', _explosion);
    this.haze.add(x, _v.y + 4, z, 24, 34, 0.55, 1.2);
  }

  /* ------------------------------ aftermath ------------------------------- */

  /**
   * What is still happening a quarter of a minute later.
   *
   * The columns and the burning craters are planted at detonation and look
   * after themselves, so all this has to do is keep topping up the debris in
   * the air between them: a few puffs low down and off to the side of the walk,
   * which is dust being kicked back up off collapsing masonry rather than
   * anything still burning, and which stops the gap between two columns
   * reading as clean air.
   */
  private smoulder(): void {
    if (this.clock < this.smokeAt) return;
    this.smokeAt = this.clock + 1.6;
    const since = this.clock - LEAD_TIME;
    if (since > this.variant.aftermath * 0.8) return;
    headingToDir(this.heading, _fwd);
    headingToRight(this.heading, _right);
    const spread = ((this.total - 1) * RUN_SPEED * this.variant.interval) / 2;
    const fade = 1 - since / Math.max(1, this.variant.aftermath);
    for (let i = 0; i < 2; i++) {
      // A five-step walk along the stick that never repeats a position twice
      // running, so the fill wanders down the line rather than pulsing.
      const u = (((this.smokeIndex * 2 + i) % 5) / 4) * 2 - 1;
      const across = (((this.smokeIndex + i) % 3) - 1) * 7;
      const x = this.target.x + _fwd.x * u * spread + _right.x * across;
      const z = this.target.z + _fwd.z * u * spread + _right.z * across;
      const y = this.deps.groundAt(x, z, this.groundY + 30);
      this.smoke.emit(x, y + 2.4, z, 4.5, 9, 0.3 * fade);
    }
    this.smokeIndex++;
  }

  /**
   * The moment the last one lands.
   *
   * Everything a blast does to the *viewer* rather than to the world happens
   * here and once: the ears, the pull toward the centre of frame, and the
   * shimmer that says the air over the street is a different temperature now.
   */
  private finalConcussion(): void {
    const distance = this.ctx.camera.position.distanceTo(this.target);
    const near = Math.max(0, 1 - distance / 220);
    this.ctx.events.emit('audio:duck', { amount: 0.75 * near + 0.15, duration: 3.2 });
    this.sound('airstrike_rumble', this.target, 1, 0.85);
    this.radialBlur = Math.max(this.radialBlur, 0.5 * near);
    this.heatHaze = Math.max(this.heatHaze, 0.45 * near);
    // The whole area goes a stop down and the colour of the ground for half a
    // minute. This is the single most important part of the aftermath.
    //
    // Many small cells laid along the street rather than a few large ones over
    // it. The two look identical in a plan view and nothing alike from the
    // ground: large cells are billboards tens of metres tall, so they stand
    // above the roofline and read as fog, while a chain of ten-metre cells at
    // waist height reads as a street full of dust with the buildings still
    // standing out of it.
    const cells = Math.max(8, Math.round(9 + this.budget.scale * 5));
    headingToDir(this.heading, _fwd);
    headingToRight(this.heading, _right);
    const spread = ((this.total - 1) * RUN_SPEED * this.variant.interval) / 2 + 14;
    for (let i = 0; i < cells; i++) {
      const u = (i / Math.max(1, cells - 1)) * 2 - 1;
      // Alternating either side of the walk rather than strung along it, so
      // the dust covers a *band* and the buildings beside the street are in it
      // too. A single file of cells down the centreline photographs as a wall.
      const across = (i % 2 === 0 ? 1 : -1) * 8;
      const x = this.target.x + _fwd.x * u * spread + _right.x * across;
      const z = this.target.z + _fwd.z * u * spread + _right.z * across;
      this.haze.add(
        x,
        this.deps.groundAt(x, z, this.groundY + 30) + 3.5,
        z,
        13,
        this.variant.aftermath + 8,
        0.6,
        0.5,
      );
    }
  }

  private decayPost(dt: number): void {
    const pipeline = this.deps.pipeline;
    if (!pipeline) return;
    // Napalm keeps the shimmer up for as long as it burns; a blast does not.
    const burning = this.fire.count > 0 ? Math.min(0.5, this.fire.count * 0.035) : 0;
    this.heatHaze = Math.max(burning, this.heatHaze - dt * 0.55);
    this.radialBlur = Math.max(0, this.radialBlur - dt * 1.6);
    if (this.heatHaze > 0.004 || this.radialBlur > 0.004) {
      pipeline.setHeatHaze(this.heatHaze);
      pipeline.setRadialBlur(this.radialBlur);
      this.postHeld = true;
    } else if (this.postHeld) {
      this.postHeld = false;
      pipeline.setHeatHaze(0);
      pipeline.setRadialBlur(0);
    }
  }

  /* -------------------------------- events -------------------------------- */

  private countdown(): void {
    if (this.phase !== PHASE.INBOUND) return;
    const seconds = this.secondsToImpact;
    this.ctx.events.emit('airstrike:inbound', { secondsToImpact: seconds });
    const lead = this.flight.jets[0];
    if (lead?.active) {
      _aircraftEvt.id = 'airstrike-lead';
      _aircraftEvt.kind = 'jet';
      _aircraftEvt.position.copy(lead.position);
      _aircraftEvt.active = true;
      this.ctx.events.emit('killstreak:aircraft', _aircraftEvt);
    }
  }

  private flyby(): void {
    if (this.flybyDone) return;
    const lead = this.flight.jets[0];
    if (!lead?.active) return;
    // Closest approach to the camera, detected by the sign change of the
    // range rate rather than by a distance threshold, so it fires once and at
    // the right instant however far away the player is standing.
    _v.copy(lead.position).sub(this.ctx.camera.position);
    const closing = _v.dot(lead.velocity);
    if (closing < 0) return;
    this.flybyDone = true;
    _flybyEvt.position.copy(lead.position);
    _flybyEvt.velocity.copy(lead.velocity);
    _flybyEvt.index = 0;
    this.ctx.events.emit('airstrike:flyby', _flybyEvt);
    this.sound('jet_pass', lead.position, 1, 1);
  }

  private emitPhase(
    phase: 'targeting' | 'inbound' | 'impact' | 'aftermath',
    remaining: number,
  ): void {
    _phaseEvt.kind = this.kind;
    _phaseEvt.phase = phase;
    _phaseEvt.secondsRemaining = remaining;
    this.ctx.events.emit('airstrike:phase', _phaseEvt);
  }

  private sound(id: string, at: THREE.Vector3 | undefined, volume: number, rate: number): void {
    _audio.id = id;
    _audio.volume = volume;
    _audio.rate = rate;
    _audio.position!.copy(at ?? this.ctx.camera.position);
    this.ctx.events.emit('audio:play', _audio);
  }

  /* ------------------------------ lifecycle ------------------------------- */

  private abortOrdnance(): void {
    for (const round of this.rounds) this.ordnance.retire(round.handle);
    this.rounds.length = 0;
  }

  /**
   * Ends the sequence and gives everything back.
   *
   * `hard` cuts the ordnance out of the air as well, which only a cancel or a
   * restart does; a skip lets what is already falling land, because a bomb that
   * evaporates because the player pressed escape is worse than the cinematic
   * they were trying to skip.
   */
  end(hard = false): void {
    if (hard) this.abortOrdnance();
    this.rounds.length = 0;
    this.flight.clear();
    this.phase = PHASE.IDLE;
    if (this.postHeld) {
      this.postHeld = false;
      this.deps.pipeline?.setHeatHaze(0);
      this.deps.pipeline?.setRadialBlur(0);
    }
    if (!this.ended) {
      this.ended = true;
      _aircraftEvt.id = 'airstrike-lead';
      _aircraftEvt.kind = 'jet';
      _aircraftEvt.position.copy(this.target);
      _aircraftEvt.active = false;
      this.ctx.events.emit('killstreak:aircraft', _aircraftEvt);
      this.ctx.events.emit('airstrike:end');
    }
  }

  /** Ends the cinematic but leaves whatever is in the air to land. */
  skip(): void {
    if (this.phase === PHASE.IDLE) return;
    if (this.phase === PHASE.AFTERMATH) {
      this.end();
      return;
    }
    this.aftermathUntil = Math.min(this.aftermathUntil, this.clock + 1.5);
  }

  clear(): void {
    this.abortOrdnance();
    this.flight.clear();
    this.phase = PHASE.IDLE;
    this.ended = true;
    if (this.postHeld) {
      this.postHeld = false;
      this.deps.pipeline?.setHeatHaze(0);
      this.deps.pipeline?.setRadialBlur(0);
    }
  }
}
