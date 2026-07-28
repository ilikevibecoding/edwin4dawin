import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import { QUALITY } from '../core/Config';
import type { PlayerSystem } from '../player/Player';
import type { PhysicsSystem } from '../physics/Physics';
import type { LevelSystem } from '../world/Level';
import { buildJet, JET_STORES, type JetModel } from './Jet';
import { RibbonTrail } from './Trail';
import { DustField } from './Dust';

type Phase = 'idle' | 'targeting' | 'inbound' | 'impact' | 'aftermath';
export type TargetingStage = 'point' | 'heading';

/**
 * Flight profile of the attack run, in metres and seconds.
 *
 * The numbers are chosen so the run is *watchable*. The flight appears 560 m
 * out and takes two full seconds to reach the release point, which is long
 * enough for a player who hears the call to turn round and find it in the sky;
 * it ingresses at 210 m, which at that range sits about 20 degrees up —
 * comfortably inside an 80 degree vertical field of view rather than directly
 * overhead where nobody is looking.
 */
const PROFILE = {
  /**
   * Distance short of the target at which the flight appears.
   *
   * This, with `speed`, is the length of the first act, and it was three times
   * too long. From call-in to the first crater took 4.8 s, of which the first
   * 2.5 s were an aircraft too far away to resolve against a bright sky — the
   * player heard a countdown and watched an empty street. Anticipation is not
   * the same thing as delay: what carries it is the run-in audio and the
   * countdown, both of which start at zero, and 2 s of visible approach is
   * about what a shipped killstreak gives you between the call and the bang.
   *
   * The floor under it is geometric, not aesthetic. A retarded store thrown at
   * 195 m/s carries about 130 m before it is down, so the solution calls for
   * the pickle 130 m short of the mark — and the *first* store has to come off
   * in level flight or it lands on a completely different solution from the
   * three behind it. That happened: released mid-dive the opener flew 80 m and
   * landed on the mark, then the aircraft levelled and the next three flew
   * 130 m each, so the stick came down 15, 64, 87 and 96 m out instead of
   * every 19.5 m. So the descent must be finished before s = -130, and
   * `spawn` has to cover that plus the roll-in and the descent itself.
   *
   * Lengthened again once the run-in was turned around to come from beyond the
   * target. The approach is now dead ahead of a player looking at their own
   * mark instead of behind their shoulder, so the seconds before the release
   * are something to watch rather than something to wait through — and the
   * stick hangs 58 m further up the axis, which eats into the level segment
   * before the pickle unless the aircraft start further out.
   *
   * The last thirty metres of it are there to buy back the level segment the
   * release gate now insists on. With the descent ending at s = -152 and the
   * solution calling for the pickle at about -146, the aircraft levelled off
   * and dropped in the same breath; a fifth of a second of wings-level flight
   * before the rack opens is the difference between an aimed delivery and a
   * fly-past that happens to shed bombs.
   */
  spawn: 352,
  /** Cruise altitude on run-in. High enough to clear the skyline. */
  ingressAlt: 150,
  /**
   * Altitude the aircraft levels off at for the release.
   *
   * Low, both because retarded ordnance is a low-level delivery and because
   * altitude is what decides whether the player ever sees the aeroplane: the
   * overflight happens more or less above their head, and the higher it is the
   * further outside the top of the frame it sits.
   */
  releaseAlt: 42,
  /** Along-track distance held at cruise before the aircraft pushes over. */
  rollIn: 20,
  /**
   * Along-track distance over which the aircraft descends. Sized so the pair
   * level off with a little room in hand before the computed release point,
   * because a wings-level second before the pickle is what reads as an aimed
   * delivery rather than a fly-past that happens to shed bombs.
   */
  descent: 148,
  /** Ground speed through the run, m/s (≈380 kt). */
  speed: 195,
  /**
   * Seconds between stores coming off the rack.
   *
   * This is the single number that decides whether the strike reads as a
   * carpet or as a bang, and it is bounded from *both* sides.
   *
   * Below about 0.06 s all four arrive inside the ear's fusion window and the
   * stick collapses into one indistinct thump. But the upper bound turned out
   * to matter far more: at 0.22 s the craters land 43 m apart, so a stick of
   * four walks 130 m and the pair together cover a 150 m box. On paper that is
   * a textbook ripple. On screen, from the eye height of a man standing fifty
   * metres from the mark, it means one crater in the street and seven behind
   * roofs at the far end of the district — the player hears eight bangs and
   * sees one. The whole event has to fit inside a single field of view.
   *
   * A tenth of a second puts the craters 19.5 m apart: still visibly separate
   * at the ranges involved, still distinctly eight events to the ear, and the
   * four fit in 60 m of street with all of them in frame. It is also exactly
   * six ticks, so the interval the impact preview draws is the interval the
   * player gets rather than one rounded up to the next frame.
   */
  stickInterval: 0.1,
  /**
   * Delay before the wingman's run.
   *
   * The lead's four stores are off the rack inside a third of a second, so
   * without a stagger the eight impacts are one continuous tearing noise and
   * the second aircraft is wasted. A beat and a bit leaves an audible hole in
   * the middle of the barrage, which is what the ear reads as a second
   * aeroplane arriving — the entire reason for sending two.
   */
  wingStagger: 0.95,
  /** Wingman's attack bearing offset — a split attack, not a follow-me. */
  wingHeadingOffset: 0.34,
  /**
   * Lateral offset of each aircraft's line from the designated point.
   *
   * The lead flies straight down it. The player picked that spot and watched a
   * marker sit on it for several seconds, so the round that ends the stick has
   * to be there — offsetting the lead by ten metres was enough, on a street
   * this width, to put it through a roof next door instead. Only the wingman
   * is displaced, which is all that is needed to keep the two lines apart.
   */
  lead: 0,
  wing: 17,
  /**
   * Along-track offset of the wingman's stick from the lead's.
   *
   * Small and negative: his line stops short of the mark rather than running
   * through it, so the second wave lands *on the same ground* as the first
   * instead of extending the carpet a step nearer the player. Nothing in the
   * package is allowed past the point they designated.
   */
  wingAlong: -9,
  /**
   * Metres past the player's eye before the egress breaks away.
   *
   * Far enough that the aircraft has unambiguously gone over the top —
   * anything less and the roll starts while it is still the biggest thing in
   * frame, which reads as flinching away rather than as an overflight — and
   * close enough that the break itself is still in earshot behind them.
   */
  breakPast: 55,
};

/**
 * Along-track offset of the *first* store relative to the designated point.
 *
 * The stick is hung so that the *last* store lands on the mark and every one
 * before it lands further out along the run-in — which, since the flight runs
 * in from the far side, means the line of craters walks *toward* the player
 * and stops on the spot they designated.
 *
 * This is the whole reason the run-in was turned around. Anchored the other
 * way, with the first crater on the mark and the rest receding, the aircraft
 * have to come from the player's own hemisphere to keep the footprint off
 * them — and an aircraft that comes from behind your shoulder at three hundred
 * metres and forty degrees off your line of sight is never once in frame.
 * Measured against the real camera, a player looking at their own mark saw the
 * lead aircraft for nine tenths of a second, on the egress, and the wingman
 * not at all. Half the ordnance in the package arrived from nowhere.
 *
 * Running in from beyond the target inverts every part of that: the flight is
 * dead ahead and descending for the whole approach, the release happens in
 * front of the player, the stick walks toward them and stops on the mark, and
 * the pair go over their head on the way out. The player is no less safe —
 * nothing lands on the near side of the point they chose — but they see all
 * of it.
 */
const stickBase = (): number => -(JET_STORES - 1) * PROFILE.speed * PROFILE.stickInterval;

/**
 * Camera shake budget for the whole event.
 *
 * Gameflow sums every live shake and turns amplitude into camera *rotation* at
 * up to 2.2x — so an amplitude of 0.3 is two thirds of a radian of roll. The
 * rest of the game works in a much smaller register: a rifle shot is about
 * 0.05 for 70 ms, taking a bullet in the chest peaks at 0.06. Eight stores
 * landing inside two seconds, each asking for 0.3, do not read as a heavy
 * barrage; they read as a camera tumbling end over end, and the motion blur
 * resolves the result to grey mush.
 *
 * So the strike gets an allowance rather than a free hand: requests are pooled
 * into one emission per window and clamped against what is still ringing. The
 * player feels one continuous ground roll that each impact tops back up, which
 * is also what standing near artillery actually feels like.
 */
/**
 * Widest run-in bearing, either side of the line running from the target
 * directly away from the player, that still keeps the footprint off them.
 * See `safeHeading`.
 *
 * At the limit the flight crosses the player's line of sight almost square on;
 * at zero it comes straight down the sightline at them. Both are legal and
 * both are in frame, which is the point of measuring the arc from this axis
 * rather than from the reciprocal.
 */
const SAFE_ARC = 1.3;

/**
 * Run-in bearing the heading stage opens on, as an offset from the axis running
 * from the target directly away from the player.
 *
 * Deliberately small, and it took measuring both ends to understand why.
 *
 * A near-sightline run-in is genuinely the worse *presentation*: the airframe is
 * foreshortened to its own cross-section, so the pair are four or five pixels
 * across for the whole ingress; the contrails run away down the view ray and
 * project to a smudge; and the aircraft hold one screen position from spawn to
 * overhead, so nothing appears to move. Opening at 0.75 rad fixes all three —
 * the pair present three-quarters on, both navigation lights show, and they
 * sweep three hundred pixels across the frame on the way in.
 *
 * And it is still the wrong default, because the footprint is not free to rotate
 * with the aircraft. The stick is laid along the ground track, so swinging the
 * run-in forty degrees swings a sixty-metre stick forty degrees with it: the aim
 * points measured out at 43 m to one side of the mark, which on a carriageway
 * this wide is inside the building block. The first store then detonated on a
 * roof half a second before the rest of its own stick, and the walking impacts —
 * the thing the whole delivery exists to show — were happening out of sight
 * behind a parapet.
 *
 * What makes the small offset work is an accident worth keeping on purpose: the
 * player is standing in a street looking down it, so the line from them to the
 * mark is very nearly the line of the street. Following it keeps eight heavy
 * stores in the open where they can be seen. The presentation problem is real
 * but it is cheaper to solve on the aircraft — see `LIGHT_MIN_ANGLE` in `Jet` —
 * than to solve by throwing the footprint into a wall. The player can still
 * sweep anywhere inside `SAFE_ARC` if they want the prettier pass.
 */
const DEFAULT_OFFSET = 0.22;

const SHAKE = {
  /**
   * Ceiling on summed live amplitude.
   *
   * Gameflow multiplies amplitude by 2.2 to get roll, so this is the number
   * that decides how far the horizon tips. At 0.11 it was fourteen degrees,
   * which on a still looks like the camera has come off its mount — and
   * because the shake runs at 19 rad/s the frame-to-frame delta was four
   * degrees, which the motion blur turned into forty pixels of smear across
   * every impact frame in the sequence. Half of it reads as a heavy barrage;
   * all of it read as a broken camera.
   */
  cap: 0.062,
  /**
   * Radians per second of the shake carrier.
   *
   * Slower than the default 26. Eight heavy stores landing across a street is
   * a ground roll, not a buzz, and the low rate also keeps the per-frame delta
   * small enough that motion blur resolves the frame instead of smearing it.
   */
  frequency: 13,
  /** Minimum seconds between emissions, so a stick pools instead of stacking. */
  gap: 0.26,
  /** Assumed bleed-off rate of an emitted shake, per second. */
  recover: 0.17,
  /** Below this the request is not worth an event. */
  floor: 0.008,
};

/** Retarded bomb model. Terminal velocity is sqrt(g / kRetard). */
const BOMB = {
  /**
   * Well above 9.81, and deliberately.
   *
   * A store dropped from forty metres takes 2.9 real seconds to arrive, which
   * on top of the run-in puts five and a half seconds between the call and the
   * first crater — and for most of it there is nothing on screen but four
   * specks getting slowly larger. Weighting gravity keeps the *shape* of the
   * fall (visible separation off the racks, ballutes snapping open, a stick
   * hanging in the air) inside a beat that a player will actually watch.
   */
  gravity: 80,
  /** Drag before the ballute inflates: essentially a clean ballistic arc. */
  kClean: 0.00025,
  /** Drag once retarded. Terminal velocity is sqrt(gravity / this). */
  kRetard: 0.021,
  /** Seconds from release to full ballute inflation. */
  retardDelay: 0.22,
  radius: 15,
  damage: 340,
};

interface Bomb {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Group;
  ballute: THREE.Mesh;
  age: number;
  index: number;
}

type JetPhase = 'hold' | 'run' | 'pull' | 'gone';

interface Jet {
  model: JetModel;
  trail: RibbonTrail;
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  /** Unit vector along this aircraft's attack bearing. */
  readonly axis: THREE.Vector3;
  readonly side: THREE.Vector3;
  /** Origin of the run: the target, shifted by the aircraft's lateral offset. */
  readonly origin: THREE.Vector3;
  /** Signed along-track position; negative is short of the target. */
  s: number;
  bank: number;
  bankTarget: number;
  climb: number;
  climbTarget: number;
  heading: number;
  phase: JetPhase;
  delay: number;
  bombsLeft: number;
  releaseTimer: number;
  aim: number;
  pickled: boolean;
  storeIndex: number;
  /** Seconds since the last store came off; times the break turn. */
  pullTime: number;
  /** Set once the aircraft is past the player and has started the break. */
  broke: boolean;
  /** Seconds since the break began; drives the roll into it. */
  breakTime: number;
  /** 0 approach, 1 near, 2 passing, 3 departed. Gates the flyby one-shots. */
  audioStage: number;
}

interface Shockwave {
  mesh: THREE.Mesh;
  age: number;
  life: number;
  maxRadius: number;
}

/**
 * Airstrike killstreak.
 *
 * Three acts. The player designates a point and an attack bearing; a two-ship
 * ingresses high on that bearing, rolls in, and lays a stick of retarded bombs
 * that *walks* across the target; then the aircraft pull off under g and the
 * player is left standing in the dust with their ears ringing.
 *
 * The details that make it land, in rough order of how much they matter:
 *
 *  - **The impacts walk.** Each aircraft releases four stores on a timer, so
 *    the craters march down the attack axis roughly 36 m and a fifth of a
 *    second apart, and the wingman's stick arrives half a second behind on a
 *    different bearing. Five simultaneous bangs read as one explosion; eight
 *    sequenced ones read as an aircraft doing a job.
 *  - **The release is aimed, not timed.** The aircraft runs a continuously
 *    computed impact point and pickles when the predicted impact crosses its
 *    aim point, exactly as a real bomb-fall line works. That means the stick
 *    lands where it was asked to regardless of how the profile is tuned, and
 *    it cannot silently drift 80 m short the way a fixed release timer does.
 *  - **Sound lags light.** The flash is instantaneous, the report arrives at
 *    343 m/s. At 90 m that is a quarter of a second, and the brain reads it
 *    immediately as distance.
 *  - **The aftermath is a state, not a particle.** Concussion, ear-ring daze
 *    and an exposure duck are held and decayed by this system rather than
 *    poked once, because the gameflow system rewrites the exposure target
 *    every frame and a single write never survives to the pipeline.
 */
export class AirstrikeSystem implements System {
  readonly name = 'airstrike';
  readonly order = 35;

  phase: Phase = 'idle';
  get targeting(): boolean {
    return this.phase === 'targeting';
  }
  /** True from the radio call until the dust has begun to settle. */
  get active(): boolean {
    return this.phase === 'inbound' || this.phase === 'impact' || this.phase === 'aftermath';
  }

  /**
   * Confirmed impact point, and the bearing the flight attacks *from*.
   *
   * Run-in is expressed as the bearing the aircraft appear on rather than the
   * course they steer, because that is the question the player is actually
   * answering when they set it: "where do I want to watch them come in from".
   * A bearing of 0 is +Z, matching the compass.
   */
  readonly target = new THREE.Vector3();
  heading = 0;

  /** Which half of the two-stage designation the player is in. */
  targetingStage: TargetingStage = 'point';
  /** Whether the point currently under the crosshair can be struck. */
  markerValid = false;

  /** 0..1 from the radio call to the first detonation, for the HUD. */
  inboundProgress = 0;
  /** Seconds until the first bomb lands; counts down, 0 once it has. */
  inboundSeconds = 0;
  /** Stores still in the air or on the rack. */
  ordnanceLeft = 0;
  /**
   * Seconds since a store last came off a rack, or -1 before the first.
   *
   * The release is the one beat of the run that the world cannot show. It
   * happens at forty metres and two hundred and thirty out, where the aircraft
   * is eight pixels wide and a 900 kg bomb is less than one, so from the ground
   * the visual difference between an aeroplane that has just pickled and one
   * that has not is nothing at all. The HUD says it instead, which is what the
   * radio is for.
   */
  sinceRelease = -1;
  /** Stores in the whole package, for the HUD's impact tally. */
  readonly ordnanceTotal = JET_STORES * 2;
  /**
   * Seconds since the last store detonated, or -1 before the first.
   *
   * The strike stays `active` while the flight egresses, which is several
   * seconds after the last bang; the HUD uses this to retire the inbound
   * banner once the event is actually over instead of leaving it pinned up
   * while two dots climb out of frame.
   */
  sinceLastImpact = -1;
  /** Where the stick is predicted to land — drawn by the HUD and the marker. */
  readonly aimPoints: THREE.Vector3[] = [];

  private ctx!: EngineContext;
  private player!: PlayerSystem;
  private physics!: PhysicsSystem;
  private level!: LevelSystem;

  private readonly group = new THREE.Group();
  private readonly jets: Jet[] = [];
  private readonly bombs: Bomb[] = [];
  private bombGeometry!: THREE.BufferGeometry;
  private balluteGeometry!: THREE.BufferGeometry;
  private bombMaterial!: THREE.Material;
  private balluteMaterial!: THREE.MeshBasicMaterial;

  private markerGroup!: THREE.Group;
  private markerRing!: THREE.Mesh;
  private markerArrow!: THREE.Mesh;
  private markerBeam!: THREE.Mesh;
  private readonly previewRings: THREE.Mesh[] = [];
  private markerMaterial!: THREE.ShaderMaterial;

  private readonly shockwaves: Shockwave[] = [];
  private shockGeometry!: THREE.BufferGeometry;
  private shockMaterial!: THREE.MeshBasicMaterial;
  // Twenty puffs per detonation and eight stores, so anything under 160 slots
  // means the last aircraft's craters evict the first aircraft's columns and
  // the aftermath thins out exactly as the player turns to look at it. The
  // margin over 160 is for the grenades and vehicle cooks that share the
  // field: eviction is oldest-first, and the one thing that must never be
  // recycled is the column standing over the target.
  private readonly dust = new DustField(240);

  private timer = 0;
  private groundY = 0;
  private detonations = 0;
  private aftermathTimer = 0;
  private warnedClose = false;

  /** Held screen-effect state, applied to the pipeline every late update. */
  private blastConcussion = 0;
  private blastDaze = 0;
  private blastDuck = 0;
  private jetWash = 0;

  /** Pooled shake request, flushed once per window. See `requestShake`. */
  private shakeWant = 0;
  private shakeWantDur = 0;
  /** Estimate of the shake amplitude still ringing out in gameflow. */
  private shakeLive = 0;
  private shakeGap = 0;

  private readonly _v = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _v3 = new THREE.Vector3();
  private readonly _q = new THREE.Quaternion();
  private readonly _m = new THREE.Matrix4();

  // ------------------------------------------------------------------ init --

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.player = ctx.get<PlayerSystem>('player')!;
    this.physics = ctx.get<PhysicsSystem>('physics')!;
    this.level = ctx.get<LevelSystem>('level')!;

    this.group.name = 'airstrike';
    ctx.scene.add(this.group);

    this.buildBombAssets();
    this.buildShockwaves();
    this.buildMarker();
    this.group.add(this.dust.mesh);

    for (let i = 0; i < 2; i++) {
      const model = buildJet(this.level.materials);
      model.group.visible = false;
      this.group.add(model.group);
      // Exhaust smoke, not a contrail. The trail is what the player reads the
      // attack axis off once the aircraft themselves have shrunk to a dot or
      // gone behind a rooftop — but these are running in at seventy metres in
      // a desert, where nothing condenses, and the width has to stay in that
      // register too. A 15 m half-width over six hundred metres of sky is a
      // thirty-metre-wide opaque band: from the ground it stopped reading as a
      // trail at all and became a white sheet hanging over the town.
      //
      // Sampled every six metres rather than every fourteen. Rib spacing only
      // has to be invisible relative to the ribbon's own width, and this one
      // is between half a metre and three and a half wide — so at fourteen the
      // ribs were four to twenty times further apart than the ribbon was
      // thick. At altitude that is a smooth line; during the overflight, with
      // the aircraft forty metres over the player's head, each segment
      // subtended eight degrees and the trail photographed as a chain of
      // separate white lozenges hanging in the sky behind the jet. The
      // capacity goes up to match so the trail keeps its length.
      const trail = new RibbonTrail(110);
      trail.spacing = 6;
      trail.life = 4.5;
      // Sized so the ribbon survives the range it has to be seen at.
      //
      // A 0.6 m half-width is a metre and a bit across, which four hundred
      // metres away is one pixel — and four hundred metres away, with the
      // aircraft themselves five pixels long, the trail is the only thing in the
      // sky with enough screen area to say "there, and coming from there". It
      // was drawn as a hairline for exactly the two seconds it was the whole
      // cue. Two metres reads as a contrail at run-in range and is kept from
      // being a white sheet at the overflight by `density` below, not by width.
      trail.widthStart = 2.2;
      trail.widthEnd = 9;
      // Up from a quarter, because the ribbon now carries its density in the
      // centre line and falls to nothing at both edges: the same number spread
      // over a soft cross-section is roughly half as dense as it was flat.
      trail.opacity = 0.46;
      trail.tint.setRGB(0.80, 0.81, 0.83);
      this.group.add(trail.mesh);
      this.jets.push({
        model,
        trail,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        axis: new THREE.Vector3(0, 0, 1),
        side: new THREE.Vector3(1, 0, 0),
        origin: new THREE.Vector3(),
        s: 0,
        bank: 0,
        bankTarget: 0,
        climb: 0,
        climbTarget: 0,
        heading: 0,
        phase: 'gone',
        delay: 0,
        bombsLeft: 0,
        releaseTimer: 0,
        aim: 0,
        pickled: false,
        storeIndex: 0,
        pullTime: 0,
        broke: false,
        breakTime: 0,
        audioStage: 0,
      });
    }

    Signals.on('killstreak:armed', ({ id }) => {
      if (id === 'airstrike') this.beginTargeting();
    });
    Signals.on('killstreak:cancelled', ({ id }) => {
      if (id === 'airstrike') this.cancelTargeting();
    });
  }

  private buildBombAssets(): void {
    // Mk-82 sized: 2.2 m of body plus an ogive nose and a boxed retarder.
    const parts: THREE.BufferGeometry[] = [];
    const body = new THREE.CylinderGeometry(0.19, 0.19, 1.9, 10);
    body.rotateX(Math.PI / 2);
    parts.push(body);
    const nose = new THREE.ConeGeometry(0.19, 0.62, 10);
    nose.rotateX(-Math.PI / 2);
    nose.translate(0, 0, -1.24);
    parts.push(nose);
    const tail = new THREE.CylinderGeometry(0.13, 0.19, 0.42, 10);
    tail.rotateX(Math.PI / 2);
    tail.translate(0, 0, 1.16);
    parts.push(tail);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.BoxGeometry(0.03, 0.42, 0.44);
      fin.translate(0, 0.26, 1.12);
      fin.rotateZ((i / 4) * Math.PI * 2);
      parts.push(fin);
    }

    const flat = parts.map((g) => g.toNonIndexed());
    let total = 0;
    for (const g of flat) total += (g.getAttribute('position') as THREE.BufferAttribute).count;
    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const uv = new Float32Array(total * 2);
    let o = 0;
    for (const g of flat) {
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      const n = g.getAttribute('normal') as THREE.BufferAttribute;
      pos.set(p.array as Float32Array, o * 3);
      nor.set(n.array as Float32Array, o * 3);
      const u = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
      if (u) uv.set(u.array as Float32Array, o * 2);
      o += p.count;
      g.dispose();
    }
    for (const g of parts) g.dispose();
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.bombGeometry = merged;

    this.bombMaterial = this.level.materials.get('paintedMetalGreen', {
      scale: 0.5,
      color: 0x8b9080,
      roughness: 0.62,
      metalness: 0.85,
    });

    // The ballute. It inflates a fifth of a second after release and is the
    // single clearest signal that ordnance is in the air: a bare bomb at 120 m
    // is three pixels, a bomb with a drogue behind it is a recognisable shape.
    const bal = new THREE.SphereGeometry(0.85, 10, 7);
    bal.scale(1, 1, 1.4);
    bal.translate(0, 0, 1.75);
    this.balluteGeometry = bal;
    this.balluteMaterial = new THREE.MeshBasicMaterial({
      color: 0x1c1f22,
      toneMapped: false,
    });
  }

  /**
   * The ring of dust a ground burst throws out along the deck.
   *
   * Two things this must not be, both learned the hard way. It must not be
   * *additive*: added light over a sunlit desert street can only travel toward
   * white, so a pale annulus rendered that way stops being a dust front and
   * becomes an opaque plate laid across the town. And it must not be *thick* —
   * an annulus whose hole is half its radius reads as a filled disc from any
   * shallow angle, which is every angle a first-person camera ever has.
   *
   * So: a narrow band of translucent tan dust, normal-blended, fading out at
   * both rims, sized at roughly one blast radius rather than five.
   */
  private buildShockwaves(): void {
    const geo = new THREE.RingGeometry(0.82, 1.0, 48, 1);
    geo.rotateX(-Math.PI / 2);
    const p = geo.getAttribute('position') as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i));
      const t = THREE.MathUtils.clamp((r - 0.82) / 0.18, 0, 1);
      // Dirtier and denser at the trailing edge, thinning to nothing at the
      // front, which is how a dust front actually presents.
      col[i * 4 + 0] = THREE.MathUtils.lerp(0.62, 0.78, t);
      col[i * 4 + 1] = THREE.MathUtils.lerp(0.52, 0.68, t);
      col[i * 4 + 2] = THREE.MathUtils.lerp(0.40, 0.55, t);
      col[i * 4 + 3] = Math.sin(t * Math.PI) * 0.9;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    this.shockGeometry = geo;
    this.shockMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      opacity: 1,
    });
  }

  private buildMarker(): void {
    this.markerGroup = new THREE.Group();
    this.markerGroup.visible = false;
    this.ctx.scene.add(this.markerGroup);

    const ringGeo = new THREE.RingGeometry(0.965, 1.035, 64);
    ringGeo.rotateX(-Math.PI / 2);
    // Depth tested. Drawn through the world, a twenty-metre ring laid on the
    // street carries on across the shopfronts either side of it and up the
    // player's own rifle — eight of those stacked along the run-in axis is a
    // solid amber band over half the frame, which is what the overlay looked
    // like for its entire life. Occluded, the same rings read as light thrown
    // on the ground, which is what a designator is.
    // Opaque hazard tape, not a glow.
    //
    // Additive was the wrong tool twice over. Added light can only travel
    // toward white, so on a sunlit street — which is where a designation is
    // most often put and always most needed — an amber mark at half strength
    // arrives as a barely-warmer patch of the same sand; measured off the
    // capture, the ring was within four per cent of the road it was drawn on.
    // Alternating a bright dash with a near-black one instead guarantees the
    // contrast comes from the mark itself rather than from whatever it happens
    // to be lying on, and reads on tarmac, on rubble and in shadow alike.
    this.markerMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        // Amber, not the usual designator green. Every other mark this game
        // draws is amber on near-black, and a lone spring-green reticle in the
        // middle of that is the one element that looks borrowed from a
        // different game.
        uColor: { value: new THREE.Color(1.0, 0.72, 0.26) },
        uTime: { value: 0 },
        uValid: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uValid;
        void main() {
          float dash = step(0.42, fract(vUv.x * 48.0 + uTime * 0.35));
          vec3 c = mix(vec3(1.0, 0.22, 0.14), uColor, uValid);
          float pulse = 0.82 + 0.18 * sin(uTime * 6.0);
          // Scene radiance here runs around two, so the lit dash has to be
          // written well above one to survive the tone curve as *bright*
          // rather than as mid-grey.
          vec3 lit = mix(c * 0.10, c * 3.4 * pulse, dash);
          gl_FragColor = vec4(lit, 0.94);
        }
      `,
    });
    this.markerRing = new THREE.Mesh(ringGeo, this.markerMaterial);
    this.markerRing.renderOrder = 900;
    this.markerGroup.add(this.markerRing);

    // Preview of where the stick is going to walk. Showing the player the
    // footprint before they commit is the difference between "call a strike"
    // and "aim a strike".
    for (let i = 0; i < JET_STORES * 2; i++) {
      const g = new THREE.RingGeometry(1, 1.1, 28);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, this.markerMaterial);
      m.renderOrder = 899;
      m.visible = false;
      this.markerGroup.add(m);
      this.previewRings.push(m);
    }

    // A drawn line with an arrowhead, not a painted taxiway. Seen from eye
    // height the axis is almost edge-on, so every extra centimetre of width
    // becomes a metre of amber smeared along the street; the shaft is kept at
    // roughly a road marking's width and the head does the work of pointing.
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 3.4);
    arrowShape.lineTo(-0.85, 2.0);
    arrowShape.lineTo(-0.22, 2.0);
    arrowShape.lineTo(-0.22, -3.4);
    arrowShape.lineTo(0.22, -3.4);
    arrowShape.lineTo(0.22, 2.0);
    arrowShape.lineTo(0.85, 2.0);
    arrowShape.closePath();
    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    arrowGeo.rotateX(-Math.PI / 2);
    // Depth tested, unlike the beam. It lies flat on the street, and drawn
    // through the world it was a fifty-square-metre additive slab painted over
    // the sandbags, the road and the player's own rifle — the single ugliest
    // thing in the feature, and the first thing anyone sees of it.
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xffb84a,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.markerArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.markerArrow.position.y = 0.06;
    this.markerArrow.renderOrder = 901;
    this.markerGroup.add(this.markerArrow);

    // Vertical beam so the designated point is visible from behind cover.
    const beamGeo = new THREE.CylinderGeometry(0.16, 0.16, 60, 8, 1, true);
    beamGeo.translate(0, 30, 0);
    {
      const p = beamGeo.getAttribute('position') as THREE.BufferAttribute;
      const col = new Float32Array(p.count * 4);
      for (let i = 0; i < p.count; i++) {
        const t = THREE.MathUtils.clamp(p.getY(i) / 60, 0, 1);
        col[i * 4 + 0] = 1.0;
        col[i * 4 + 1] = 0.72;
        col[i * 4 + 2] = 0.26;
        col[i * 4 + 3] = Math.pow(1 - t, 2.2) * 0.45;
      }
      beamGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    }
    this.markerBeam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        // The one part of the marker that is allowed through the world: a
        // designation the player loses the moment they step behind the wall
        // they are sheltering against is not a designation. It is a third of
        // a metre across, so drawn over the street it is a line, not a slab.
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    this.markerBeam.renderOrder = 898;
    this.markerGroup.add(this.markerBeam);
  }

  // ------------------------------------------------------------- targeting --

  beginTargeting(): void {
    if (this.phase !== 'idle') return;
    this.phase = 'targeting';
    this.targetingStage = 'point';
    this.markerGroup.visible = true;
    Signals.emit('ui:notify', {
      title: 'CAS ON STATION',
      subtitle: 'DESIGNATE IMPACT POINT',
      tone: 'good',
    });
    Signals.emit('audio:oneshot', { id: 'ks_arm', volume: 0.8 });
  }

  cancelTargeting(): void {
    if (this.phase !== 'targeting') return;
    this.phase = 'idle';
    this.targetingStage = 'point';
    this.markerGroup.visible = false;
    Signals.emit('ui:notify', { title: 'STRIKE ABORTED', tone: 'bad' });
  }

  private updateTargeting(ctx: EngineContext): void {
    const cam = ctx.camera;
    const dir = this._v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const hit = this.physics.trace(cam.position, dir, 400);

    this.markerValid = hit.hit && hit.normal.y > 0.45 && this.level.bounds.containsPoint(hit.point);

    if (hit.hit && this.targetingStage === 'point') {
      this.target.copy(hit.point);
    }
    this.markerGroup.position.copy(this.target).add(this._v2.set(0, 0.08, 0));

    const time = ctx.time.elapsed;
    this.markerMaterial.uniforms.uTime.value = time;
    this.markerMaterial.uniforms.uValid.value = this.markerValid || this.targetingStage === 'heading' ? 1 : 0;
    // The lethal radius, drawn at life size so "danger close" is a distance
    // the player can see rather than a word the HUD says.
    this.markerRing.scale.setScalar(BOMB.radius);

    if (this.targetingStage === 'heading') {
      if (hit.hit) {
        const to = this._v2.copy(hit.point).sub(this.target);
        if (to.lengthSq() > 4) this.heading = this.safeHeading(Math.atan2(to.x, to.z));
      }
      this.markerArrow.rotation.y = this.heading;
      this.markerArrow.visible = true;
      // A run-in indicator, not a runway. The shape is 6.6 units long, so at
      // the old half-a-blast-radius it came out twenty-five metres nose to
      // tail and swallowed the street it was drawn on.
      this.markerArrow.scale.setScalar(BOMB.radius * 0.2);
      this.refreshAimPoints();
      for (let i = 0; i < this.previewRings.length; i++) {
        const ring = this.previewRings[i];
        const p = this.aimPoints[i];
        if (!p) {
          ring.visible = false;
          continue;
        }
        ring.visible = true;
        ring.position.copy(p).sub(this.target).setY(0.04);
        // Aim points, not blast circles. At the lethal radius the eight of
        // them overlap into one continuous ellipse eighty metres long and the
        // footprint stops being readable as a *sequence*; at a third of it
        // they read as a row of marks walking up the axis, which is the thing
        // the preview exists to show.
        ring.scale.setScalar(BOMB.radius * 0.42);
      }
    } else {
      this.markerArrow.visible = false;
      for (const r of this.previewRings) r.visible = false;
    }

    const input = ctx.input;
    if (input.pressed('ads')) {
      this.cancelTargeting();
      return;
    }
    if (input.pressed('fire')) {
      if (!this.markerValid && this.targetingStage === 'point') {
        Signals.emit('audio:oneshot', { id: 'ui_error', volume: 0.6 });
        Signals.emit('ui:notify', { title: 'NO VALID IMPACT POINT', tone: 'bad' });
        return;
      }
      if (this.targetingStage === 'point') {
        this.targetingStage = 'heading';
        // Open the second stage on a run-in that comes back down the player's
        // own line of sight, canted a fifth of a radian off so the pair pass
        // beside them rather than exactly over their head. That is the most
        // legible delivery there is — the flight is dead ahead and descending
        // the whole way in — and it is already a legal heading, so the player
        // can commit immediately and still get a good pass.
        this.heading = this.safeHeading(
          Math.atan2(
            this.target.x - this.ctx.camera.position.x,
            this.target.z - this.ctx.camera.position.z,
          ) + DEFAULT_OFFSET,
        );
        Signals.emit('ui:notify', {
          title: 'SET ATTACK HEADING',
          subtitle: 'SWEEP TO AIM — CONFIRM TO COMMIT',
          tone: 'neutral',
        });
        Signals.emit('audio:oneshot', { id: 'ui_confirm', volume: 0.7 });
      } else {
        this.launch();
      }
    }
  }

  /**
   * Constrains a run-in bearing so the stick can never walk onto the player.
   *
   * The stick ends on the mark and everything before it lands further up the
   * run-in axis, so the question is which side of the target the flight comes
   * from: come in from the player's own side and the whole footprint is laid
   * out behind the mark, on top of them.
   *
   * Real close air support solves this with a run-in restriction — the FAC
   * gives an attack heading that keeps the aircraft, and therefore the stick,
   * off the friendly axis. Same rule here: the bearing the flight comes *from*
   * is clamped into the hemisphere away from the player, so the craters always
   * walk toward them and stop short. The player still has a hundred and fifty
   * degrees to choose from and never has to know the rule exists, because the
   * only headings it takes away are the ones that would have killed them.
   *
   * Measured against the player body rather than the camera. They are the same
   * place a frame after the player has moved, but `launch` can be called
   * before the transform has ever been written — a capture harness sets a
   * spawn and calls straight into the killstreak — and then the camera is
   * still at the world origin. The same fire mission then came out on a
   * different bearing depending on whether a frame had run yet, which made the
   * safety rule the least predictable thing about the strike.
   */
  private safeHeading(desired: number): number {
    const awayFromPlayer = Math.atan2(
      this.target.x - this.player.position.x,
      this.target.z - this.player.position.z,
    );
    let delta = desired - awayFromPlayer;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return awayFromPlayer + THREE.MathUtils.clamp(delta, -SAFE_ARC, SAFE_ARC);
  }

  /**
   * Course flown by aircraft `index`: the reciprocal of its run-in bearing.
   * Writes into `axis`, and the matching starboard vector into `side`.
   */
  private courseFor(index: number, axis: THREE.Vector3, side: THREE.Vector3): number {
    const bearing = this.heading + (index === 0 ? 0 : PROFILE.wingHeadingOffset);
    axis.set(-Math.sin(bearing), 0, -Math.cos(bearing));
    side.set(axis.z, 0, -axis.x);
    return bearing;
  }

  /** Recomputes the predicted impact footprint for the current heading. */
  private refreshAimPoints(): void {
    this.aimPoints.length = 0;
    const step = PROFILE.speed * PROFILE.stickInterval;
    const axis = this._v2;
    const side = this._v3;
    for (let jetIndex = 0; jetIndex < 2; jetIndex++) {
      this.courseFor(jetIndex, axis, side);
      const aimBase = stickBase() + (jetIndex === 0 ? 0 : PROFILE.wingAlong);
      const lateral = jetIndex === 0 ? PROFILE.lead : PROFILE.wing;
      for (let i = 0; i < JET_STORES; i++) {
        const along = aimBase + i * step;
        this.aimPoints.push(
          new THREE.Vector3(
            this.target.x + axis.x * along + side.x * lateral,
            this.target.y,
            this.target.z + axis.z * along + side.z * lateral,
          ),
        );
      }
    }
  }

  // ---------------------------------------------------------------- launch --

  launch(): void {
    if (this.phase === 'inbound' || this.phase === 'impact') return;
    this.phase = 'inbound';
    this.timer = 0;
    this.detonations = 0;
    this.aftermathTimer = 0;
    this.warnedClose = false;
    this.sinceLastImpact = -1;
    this.sinceRelease = -1;
    this.shakeWant = 0;
    this.shakeWantDur = 0;
    this.shakeLive = 0;
    this.shakeGap = 0;
    this.markerGroup.visible = false;
    this.groundY = this.target.y;
    // Clamped here as well as in the targeting sweep, because the sweep is not
    // the only way in. Anything that sets a bearing and calls `launch` — the
    // capture harness does exactly that — gets whatever run-in it asked for,
    // and a bearing pointed at the player walks the stick over them: measured
    // from the shipped `airstrike` scenario, the opening store landed fourteen
    // metres in front of the caller, well inside a fifteen-metre lethal
    // radius. A fire mission that can kill the man who called it is a bug
    // wherever the bearing came from.
    this.heading = this.safeHeading(this.heading);
    this.refreshAimPoints();

    // Ordnance from a previous run is only possible in the capture harness,
    // which relaunches without tearing the world down — but a stale bomb would
    // detonate under the next strike's countdown, so clear it out.
    for (const b of this.bombs) this.group.remove(b.mesh);
    this.bombs.length = 0;
    for (const w of this.shockwaves) {
      w.age = w.life;
      w.mesh.visible = false;
    }
    this.dust.clear();

    for (let i = 0; i < this.jets.length; i++) {
      const jet = this.jets[i];
      const bearing = this.courseFor(i, jet.axis, jet.side);
      // Course, not bearing: `heading` is where they come from.
      jet.heading = bearing + Math.PI;
      const lateral = i === 0 ? PROFILE.lead : PROFILE.wing;
      jet.origin.copy(this.target).addScaledVector(jet.side, lateral);
      jet.s = -PROFILE.spawn;
      jet.bank = 0;
      jet.bankTarget = 0;
      jet.climb = 0;
      jet.climbTarget = 0;
      jet.phase = 'run';
      jet.delay = i * PROFILE.wingStagger;
      jet.bombsLeft = JET_STORES;
      jet.releaseTimer = 0;
      jet.aim = stickBase() + (i === 0 ? 0 : PROFILE.wingAlong);
      jet.pickled = false;
      jet.storeIndex = i * JET_STORES;
      jet.pullTime = 0;
      jet.broke = false;
      jet.breakTime = 0;
      jet.audioStage = 0;
      jet.model.setStores(JET_STORES);
      jet.model.setAfterburner(0.45);
      jet.model.setLoad(0);
      jet.model.flybyPlayed = false;
      jet.model.group.visible = false;
      jet.trail.clear();
      this.placeJet(jet, 0);
    }

    this.ordnanceLeft = JET_STORES * this.jets.length;
    this.inboundSeconds = this.predictTimeToImpact();
    this.inboundProgress = 0;

    Signals.emit('killstreak:called', {
      id: 'airstrike',
      target: this.target.clone(),
      heading: this.heading,
    });
    Signals.emit('airstrike:inbound', {
      seconds: this.inboundSeconds,
      target: this.target.clone(),
      heading: this.heading,
    });
    // No centre-screen banner for the call.
    //
    // There was one, reading AIRSTRIKE INBOUND / DANGER CLOSE — TAKE COVER,
    // and it was wrong twice over. It said what the inbound strip at the top
    // of the frame already says, less well: the strip carries the countdown
    // and the run-in bearing, and this carried neither. And it was two hundred
    // pixels of black across the middle of the sky for the first two and a
    // half seconds of the event — which is precisely the window in which the
    // aircraft are visible, dead ahead, descending. Photographed at the
    // release, the banner was sitting on the wingman. The one thing the player
    // is supposed to be looking at during the anticipation beat was behind the
    // caption announcing it.
    //
    // The genuine warning still fires, from `detonate`, at the point a store
    // actually lands inside the player's fragmentation envelope.
    Signals.emit('audio:oneshot', { id: 'radio_airstrike', volume: 1 });
    Signals.emit('audio:music', { cue: 'danger' });

    // The approach is audible long before it is visible, which is the whole
    // anticipation beat. Volume is low: this is a jet a third of a kilometre
    // out, not overhead.
    Signals.emit('audio:oneshot', {
      id: 'jet_flyby',
      position: this.jets[0].position.clone(),
      volume: 0.55,
      pitch: 0.82,
    });
  }

  /** Forward-simulates the lead aircraft to time the HUD countdown. */
  private predictTimeToImpact(): number {
    const dt = 1 / 60;
    let s = -PROFILE.spawn;
    for (let i = 0; i < 600; i++) {
      const alt = this.profileAltitude(s);
      const vy = (this.profileAltitude(s + PROFILE.speed * dt) - alt) / dt;
      if (Math.abs(vy) < 6) {
        const solved = this.solveImpact(s, alt, PROFILE.speed, vy);
        if (solved.along >= stickBase()) return i * dt + solved.time;
      }
      s += PROFILE.speed * dt;
    }
    return 4;
  }

  // ---------------------------------------------------------------- update --

  update(dt: number, ctx: EngineContext): void {
    switch (this.phase) {
      case 'targeting':
        this.updateTargeting(ctx);
        break;
      case 'inbound':
      case 'impact':
      case 'aftermath':
        this.updateStrike(dt, ctx);
        break;
      default:
        break;
    }
    this.updateBombs(dt);
    this.updateShockwaves(dt);
    this.fadeTrails(dt, ctx);
    // Outside the phase switch: the columns are the aftermath, and they have
    // to keep standing and drifting long after the strike itself has retired
    // to idle.
    this.dust.update(dt, ctx.camera, ctx.engine.pipeline.sunDirection);
  }

  /**
   * Contrails outlive the aircraft — they are the record of the attack axis,
   * and they are still dissipating long after the flight has left. They are
   * aged here rather than inside the strike update so that a trail hanging in
   * the sky cannot hold the killstreak "active" and pin the HUD banner up for
   * the fifteen seconds it takes to disperse.
   */
  private fadeTrails(dt: number, ctx: EngineContext): void {
    for (const jet of this.jets) {
      if (jet.phase === 'gone' && jet.trail.mesh.visible) {
        jet.trail.update(dt, null, ctx.camera.position, false);
      }
    }
  }

  /**
   * Screen-space consequences are applied here rather than in `update`.
   *
   * The gameflow system rewrites `pipeline.exposureTarget` from the camera
   * pitch every frame at order 99, so anything written during a normal update
   * at order 35 is discarded before it reaches the composite. Late update runs
   * after every system's update and before the render, which is the only place
   * a gameplay-driven exposure duck actually survives.
   */
  lateUpdate(dt: number, ctx: EngineContext): void {
    const pipeline = ctx.engine.pipeline;

    this.flushShake(dt);

    this.blastConcussion = Math.max(0, this.blastConcussion - dt * 1.15);
    // Slow. This is the ringing, and it is the only part of the aftermath the
    // player carries with them once the dust is behind them.
    this.blastDaze = Math.max(0, this.blastDaze - dt * 0.2);
    this.blastDuck = Math.max(0, this.blastDuck - dt * 0.75);
    this.jetWash = Math.max(0, this.jetWash - dt * 1.6);

    const concussion = Math.max(this.blastConcussion, this.jetWash);
    if (concussion > 0.001) {
      pipeline.concussion = Math.max(pipeline.concussion, concussion);
    }
    if (this.blastDaze > 0.001) {
      // Reads as the muffled, tunnelled few seconds after a big detonation.
      pipeline.suppression = Math.max(pipeline.suppression, this.blastDaze);
    }
    if (this.blastDuck > 0.001) {
      pipeline.exposureTarget = Math.max(
        pipeline.exposureMin,
        pipeline.exposureTarget - this.blastDuck,
      );
    }
  }

  /** Ask for shake. See `SHAKE` for why this is pooled rather than emitted. */
  private requestShake(amplitude: number, duration: number): void {
    if (amplitude <= 0) return;
    this.shakeWant = Math.max(this.shakeWant, amplitude);
    this.shakeWantDur = Math.max(this.shakeWantDur, duration);
  }

  private flushShake(dt: number): void {
    this.shakeLive = Math.max(0, this.shakeLive - dt * SHAKE.recover);
    this.shakeGap -= dt;
    if (this.shakeWant <= 0 || this.shakeGap > 0) return;

    const amplitude = Math.min(this.shakeWant, SHAKE.cap - this.shakeLive);
    const duration = this.shakeWantDur;
    this.shakeWant = 0;
    this.shakeWantDur = 0;
    if (amplitude < SHAKE.floor) return;

    Signals.emit('camera:shake', { amplitude, duration, frequency: SHAKE.frequency });
    this.shakeLive += amplitude;
    this.shakeGap = SHAKE.gap;
  }

  // ------------------------------------------------------------ flight path --

  /**
   * Altitude of the run-in profile at along-track position `s`.
   *
   * Three segments: cruise in at height, push over into a visible dive, level
   * off for the delivery. The level segment matters — an aircraft that is
   * still descending when the stores come off reads as a fly-past that
   * happened to drop something.
   */
  /** 0 at the top of the push-over, 1 once levelled off at release altitude. */
  private descentProgress(s: number): number {
    return THREE.MathUtils.clamp(
      (s + PROFILE.spawn - PROFILE.rollIn) / PROFILE.descent, 0, 1,
    );
  }

  private profileAltitude(s: number): number {
    const u = this.descentProgress(s);
    const eased = u * u * (3 - 2 * u);
    return this.groundY + PROFILE.ingressAlt + (PROFILE.releaseAlt - PROFILE.ingressAlt) * eased;
  }

  private placeJet(jet: Jet, dt: number): void {
    const alt = this.profileAltitude(jet.s);
    jet.position.copy(jet.origin).addScaledVector(jet.axis, jet.s).setY(alt);
    const ahead = Math.max(dt, 1 / 120) * PROFILE.speed;
    const vy = (this.profileAltitude(jet.s + ahead) - alt) / Math.max(dt, 1 / 120);
    jet.velocity.copy(jet.axis).multiplyScalar(PROFILE.speed).setY(vy);
  }

  private updateStrike(dt: number, ctx: EngineContext): void {
    this.timer += dt;
    if (this.sinceLastImpact >= 0) this.sinceLastImpact += dt;
    if (this.sinceRelease >= 0) this.sinceRelease += dt;
    const camPos = ctx.camera.position;
    let anyFlying = false;

    for (const jet of this.jets) {
      if (jet.phase === 'gone') continue;
      if (jet.delay > 0) {
        jet.delay -= dt;
        anyFlying = true;
        continue;
      }
      anyFlying = true;
      jet.model.group.visible = true;

      if (jet.phase === 'run') {
        jet.s += PROFILE.speed * dt;
        this.placeJet(jet, dt);

        const diving = jet.velocity.y < -6;
        // Roll into the dive, then wings level well before the release.
        //
        // This used to key off the instantaneous vertical speed, which meant
        // the roll-out was commanded about fifty milliseconds before the first
        // store came off — and with a third-of-a-second roll rate the aircraft
        // was still banked twenty-seven degrees at the pickle. That is exactly
        // the error real deliveries level off to avoid: the pylons are four
        // metres out from the centreline, so a bank turns the alternating
        // left-right rack sequence into an alternating high-low one, the fall
        // times stop matching and the stick lands as a flam instead of a walk.
        //
        // Keying off distance flown through the descent instead puts the
        // roll-out where it belongs — finished with a third of the dive still
        // to run — and the wings are inside four degrees of level at release.
        //
        // Both the angle and the schedule are set by what the release needs
        // rather than by what looks best on its own. The solution calls for
        // the pickle about a hundred and twenty-five metres short of the mark,
        // the wings have to be level before that, and a damped roll takes the
        // better part of a second to bleed off — so the roll-out has to be
        // finished inside the first third of the dive, and the angle has to be
        // small enough that what is left decays in the distance available.
        const u = this.descentProgress(jet.s);
        const roll = THREE.MathUtils.smoothstep(u, 0, 0.1)
          * (1 - THREE.MathUtils.smoothstep(u, 0.14, 0.3));
        jet.bankTarget = (jet === this.jets[0] ? -0.32 : 0.32) * roll;
        // A real CAS aircraft is at military power on the run and the nozzles
        // are dark. But at the ranges the player sees this from, the airframe
        // is thirty pixels of dark grey against a bright sky and the burner is
        // the only part of it that is *emissive* — it is what makes the shape
        // resolve as an aeroplane rather than a bird. Held low enough through
        // the descent that lighting it fully for the break still reads as a
        // change, which is the moment that has to sell.
        jet.model.setAfterburner(diving ? 0.4 : 0.5);
        jet.model.setLoad(roll * 0.4);

        // Pickle on the computed solution, not on a level-off flag.
        //
        // This gate used to be "no longer descending", which sounds like the
        // real procedure and behaves nothing like it. The aircraft finishes
        // levelling off about forty metres *past* the point its own solution
        // calls for, and the trigger fires on the first frame the solution is
        // at or beyond the aim point — so the release was always late and the
        // whole stick landed long. Measured: first crater 44 m past the mark,
        // second 65 m, and the fourth 105 m past it and seventeen metres up
        // the side of a building, which is why the street the player was
        // looking at stayed clean through eight detonations.
        //
        // Two things have to be true at the pickle, and the second one cost a
        // whole review to find.
        //
        // Wings level, because the pylons are four metres out from the
        // centreline and a bank turns the alternating left-right rack sequence
        // into an alternating high-low one.
        //
        // And the descent *finished*. The solver integrates vertical speed, so
        // a store released in the dive is still aimed correctly — which is
        // exactly why this looked fine on paper and was wrong on screen. The
        // opener came off with fifty metres a second of downward velocity on
        // it and was in the ground 0.6 s later; the three behind it left in
        // level flight and took 1.3 s. Measured, the eight detonations arrived
        // at 1.38, then nothing for the best part of a second, then three
        // inside seventy milliseconds. A carpet is a rhythm, and the release
        // interval only becomes that rhythm if every store in the stick has
        // the same time of flight.
        const level = this.descentProgress(jet.s) >= 1;
        if (!jet.pickled && level && Math.abs(jet.bank) < 0.12) {
          const solved = this.solveImpact(jet.s, jet.position.y, PROFILE.speed, jet.velocity.y);
          if (solved.along >= jet.aim) {
            jet.pickled = true;
            jet.releaseTimer = 0;
          }
        }
        if (jet.pickled && jet.bombsLeft > 0) {
          jet.releaseTimer -= dt;
          if (jet.releaseTimer <= 0) {
            jet.releaseTimer = PROFILE.stickInterval;
            this.releaseBomb(jet);
            if (this.detonations === 0 && this.bombs.length === 1) {
              // First store away: the countdown stops being an estimate and
              // becomes the actual time of flight of the round in the air.
              this.inboundSeconds = this.solveImpact(
                jet.s, jet.position.y, PROFILE.speed, jet.velocity.y,
              ).time;
            }
            jet.bombsLeft--;
            jet.model.setStores(jet.bombsLeft);
            if (jet.bombsLeft === 0) {
              jet.phase = 'pull';
              jet.pullTime = 0;
              jet.broke = false;
              jet.breakTime = 0;
              // Almost flat until the overflight is made.
              //
              // The release happens well short of the mark and the player is
              // another forty-odd metres past that, so at the pickle the
              // aircraft still has the best part of two hundred metres to run
              // before it is over their head. Climbing away from the instant
              // the rack is empty puts it at sixty metres and seventy-five
              // degrees of elevation by the time it gets there — directly
              // overhead, outside the top of the frame, and gone. A shallow
              // egress keeps it low and *ahead* of the player, growing in
              // frame, until it actually crosses them.
              jet.climbTarget = 0.05;
              jet.model.setAfterburner(1);
              jet.model.setLoad(0.5);
            }
          }
        }
      } else if (jet.phase === 'pull') {
        // Straight over the player's head, *then* the break. The hold is what
        // turns two separate moments — the stick walking in, and a fast jet
        // going over at forty metres — into one continuous pass.
        jet.pullTime += dt;
        // The break is triggered by geometry, not by a stopwatch. Timing it
        // meant the aircraft turned away wherever it happened to be when the
        // clock ran out: measured, the lead rolled into the break thirteen
        // metres *short* of the player and departed without ever crossing
        // them, which is the single beat the whole egress exists for. Now it
        // holds course until it is genuinely past, however long that takes.
        // The clock survives only as a backstop for a geometry that cannot
        // reach the player at all.
        const past = -this._v3.copy(camPos).sub(jet.position).dot(jet.axis);
        if (!jet.broke && (past > PROFILE.breakPast || jet.pullTime > 2.6)) jet.broke = true;
        if (jet.broke) jet.breakTime += dt;
        jet.bankTarget = (jet === this.jets[0] ? 1 : -1) * 1.05
          * THREE.MathUtils.smoothstep(jet.breakTime, 0, 0.42);
        // Free flight: a hard climbing break turn away from the target. Turn
        // rate follows from the bank angle, so the harder it rolls the tighter
        // it comes round. The 3.4 is the load factor the pilot is pulling —
        // a level 1 g turn at 380 kt takes twelve seconds to come through
        // ninety degrees, which is true and completely unreadable.
        const turn = (Math.tan(jet.bank) * 9.81 * 3.4) / PROFILE.speed;
        jet.heading -= turn * dt;
        jet.axis.set(Math.sin(jet.heading), 0, Math.cos(jet.heading));
        const horizontal = Math.cos(jet.climb) * PROFILE.speed;
        jet.velocity.copy(jet.axis).multiplyScalar(horizontal);
        jet.velocity.y = Math.sin(jet.climb) * PROFILE.speed;
        jet.position.addScaledVector(jet.velocity, dt);
        jet.climbTarget = jet.broke ? 0.3 : 0.05;
        // Vapour bleeds off as the g comes down out of the pull.
        jet.model.setLoad(THREE.MathUtils.clamp(Math.abs(jet.bank) * 0.9, 0, 1));
        if (jet.position.y > this.groundY + 420 || jet.position.distanceTo(this.target) > 900) {
          jet.phase = 'gone';
          jet.model.group.visible = false;
        }
      }

      jet.bank = THREE.MathUtils.damp(jet.bank, jet.bankTarget, 3.4, dt);
      jet.climb = THREE.MathUtils.damp(jet.climb, jet.climbTarget, 1.9, dt);
      this.orientJet(jet);
      jet.model.update(dt, jet.position, jet.velocity, camPos);
      jet.model.exhaustWorld(this._v3);
      // Contrails are an altitude phenomenon, and leaning on that solves a
      // problem that width alone could not: the same ribbon has to be a hard
      // line across the sky at a hundred and fifty metres, where it is the only
      // thing the player can see, and nearly nothing at forty, where the
      // aircraft is about to fill a third of the frame and a band of white
      // hanging off its tail is just something in front of the aeroplane.
      // The band is 44–92 m rather than 48–132 because of where the aircraft
      // actually spend the ingress. They are through 132 m within half a second
      // of spawning and then descend for another second and a half, so a band
      // that only saturates at the spawn altitude has the trail at half strength
      // for the whole of the beat it exists to carry — the pair are five pixels
      // long out there, and the ribbon is the only thing with any length to it.
      // 92 m is above the run-in altitude and below the top of the descent, so
      // the trail is solid while they are coming down and has thinned out by the
      // time they level off for the release.
      jet.trail.density = 0.16 + 0.84 * THREE.MathUtils.smoothstep(
        jet.position.y - this.groundY, 44, 92,
      );
      jet.trail.update(dt, this._v3, camPos, jet.phase !== 'gone');

      // ---- flyby pressure and noise ----
      // Three beats, because that is what a fast jet passing overhead sounds
      // like: a rising rumble ahead of it, the pass itself, and the reheat
      // tearing away afterwards, pitched down as it goes.
      const distToPlayer = jet.position.distanceTo(camPos);
      if (distToPlayer < 300) {
        const near = 1 - distToPlayer / 300;
        this.jetWash = Math.max(this.jetWash, near * near * 0.2);
        if (jet.audioStage === 0 && distToPlayer < 240) {
          jet.audioStage = 1;
          Signals.emit('audio:oneshot', {
            id: 'jet_flyby', position: jet.position.clone(), volume: 0.7, pitch: 1.12,
          });
        } else if (jet.audioStage === 1 && distToPlayer < 110) {
          jet.audioStage = 2;
          Signals.emit('audio:oneshot', {
            id: 'jet_flyby', position: jet.position.clone(), volume: 1, pitch: 1,
          });
          // A low, long rumble rather than a jolt — the airframe passing is
          // pressure on the chest, not an impact.
          this.requestShake(0.026 * near, 1.3);
        }
        Signals.emit('airstrike:flyby', {
          position: jet.position.clone(),
          velocity: jet.velocity.clone(),
        });
      } else if (jet.audioStage === 2) {
        jet.audioStage = 3;
        Signals.emit('audio:oneshot', {
          id: 'jet_flyby', position: jet.position.clone(), volume: 0.8, pitch: 0.78,
        });
      }
    }

    // ---- HUD countdown ----
    if (this.detonations === 0) {
      this.inboundSeconds = Math.max(0, this.inboundSeconds - dt);
      const total = Math.max(0.001, this.timer + this.inboundSeconds);
      this.inboundProgress = THREE.MathUtils.clamp(this.timer / total, 0, 1);
    } else {
      this.inboundSeconds = 0;
      this.inboundProgress = 1;
    }

    if (this.bombs.length > 0) this.phase = 'impact';

    if (!anyFlying && this.bombs.length === 0) {
      this.aftermathTimer += dt;
      this.phase = 'aftermath';
      // The strike is not over when the last bang stops. Holding the state for
      // a few seconds keeps the music, the HUD banner and the ear-ring alive
      // through the part of the event the player actually spends looking at
      // the smoke.
      if (this.aftermathTimer > 5) {
        this.phase = 'idle';
        this.inboundProgress = 0;
        this.inboundSeconds = 0;
        this.ordnanceLeft = 0;
        Signals.emit('audio:music', { cue: 'combat' });
      }
    }
  }

  private orientJet(jet: Jet): void {
    const forward = this._v.copy(jet.velocity);
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
    forward.normalize();
    const worldUp = this._v2.set(0, 1, 0);
    const right = this._v3.crossVectors(forward, worldUp);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    up.applyAxisAngle(forward, -jet.bank);
    right.crossVectors(forward, up).normalize();
    this._m.makeBasis(right, up, forward.clone().negate());
    this._q.setFromRotationMatrix(this._m);
    jet.model.group.position.copy(jet.position);
    jet.model.group.quaternion.copy(this._q);
    jet.model.group.updateMatrixWorld();
  }

  // ----------------------------------------------------------- ordnance ----

  /**
   * Continuously computed impact point.
   *
   * Integrates the same drag model the live bombs use, from a hypothetical
   * release at the given state, and reports where and when it would land.
   * ~90 steps at a sixtieth of a second; two of these per frame is nothing,
   * and it is what makes the stick land where the player asked.
   */
  private solveImpact(
    s: number,
    altitude: number,
    speed: number,
    verticalSpeed: number,
  ): { along: number; time: number } {
    const dt = 1 / 60;
    let along = s;
    let y = altitude;
    let vs = speed;
    let vy = verticalSpeed;
    let t = 0;
    for (let i = 0; i < 480 && y > this.groundY; i++) {
      const k = t < BOMB.retardDelay ? BOMB.kClean : BOMB.kRetard;
      const sp = Math.hypot(vs, vy);
      vs -= k * sp * vs * dt;
      vy -= k * sp * vy * dt;
      vy -= BOMB.gravity * dt;
      along += vs * dt;
      y += vy * dt;
      t += dt;
    }
    return { along, time: t };
  }

  private releaseBomb(jet: Jet): void {
    this.sinceRelease = 0;
    const holder = new THREE.Group();
    const body = new THREE.Mesh(this.bombGeometry, this.bombMaterial);
    body.frustumCulled = false;
    holder.add(body);
    const ballute = new THREE.Mesh(this.balluteGeometry, this.balluteMaterial);
    ballute.frustumCulled = false;
    ballute.scale.setScalar(0.05);
    holder.add(ballute);
    holder.frustumCulled = false;
    this.group.add(holder);

    // Come off an actual pylon rather than the aircraft's centreline.
    const rackSide = jet.bombsLeft % 2 === 0 ? 1 : -1;
    const rackOut = jet.bombsLeft > 2 ? 4.7 : 2.9;
    const local = this._v.set(rackSide * rackOut, -1.05, 1.9);
    local.applyMatrix4(jet.model.group.matrixWorld);

    const bomb: Bomb = {
      position: local.clone(),
      velocity: jet.velocity.clone(),
      mesh: holder,
      ballute,
      age: 0,
      index: jet.storeIndex++,
    };
    this.bombs.push(bomb);

    Signals.emit('audio:oneshot', {
      id: 'bomb_release',
      position: bomb.position.clone(),
      volume: 0.4,
    });
  }

  private updateBombs(dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.age += dt;

      const retard = THREE.MathUtils.clamp((b.age - BOMB.retardDelay) / 0.12, 0, 1);
      b.ballute.scale.setScalar(0.05 + retard * 0.95);

      const k = b.age < BOMB.retardDelay ? BOMB.kClean : BOMB.kRetard;
      const speed = b.velocity.length();
      b.velocity.addScaledVector(this._v.copy(b.velocity).normalize(), -k * speed * speed * dt);
      b.velocity.y -= BOMB.gravity * dt;

      const step = this._v2.copy(b.velocity).multiplyScalar(dt);
      const len = step.length();
      const dir = this._v.copy(step).divideScalar(Math.max(len, 1e-5));
      const hit = this.physics.trace(b.position, dir, len + 0.8);

      if (hit.hit) {
        this.detonate(hit.point.clone(), b.index);
        this.group.remove(b.mesh);
        this.bombs.splice(i, 1);
        continue;
      }

      b.position.add(step);
      if (b.position.y < this.groundY - 14) {
        this.detonate(b.position.clone().setY(this.groundY), b.index);
        this.group.remove(b.mesh);
        this.bombs.splice(i, 1);
        continue;
      }

      // Nose into the airflow.
      const forward = this._v.copy(b.velocity).normalize();
      const worldUp = Math.abs(forward.y) > 0.985
        ? this._v2.set(1, 0, 0)
        : this._v2.set(0, 1, 0);
      const right = this._v3.crossVectors(forward, worldUp).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      this._m.makeBasis(right, up, forward.clone().negate());
      b.mesh.position.copy(b.position);
      b.mesh.quaternion.setFromRotationMatrix(this._m);
    }
  }

  // -------------------------------------------------------------- effects --

  private detonate(point: THREE.Vector3, index: number): void {
    this.detonations++;
    this.sinceLastImpact = 0;
    this.ordnanceLeft = Math.max(0, this.ordnanceLeft - 1);

    // `scale` multiplies particle *size* in the VFX system, against a damage
    // radius that is already 15 m. At 2.9 the fireball came out twenty-two
    // metres across, and eight of them overlapping turned the whole street
    // into one flat brick-red mass with hard edges that was still standing
    // there a second and a half after the last store landed — not a fireball,
    // a wall. Half again over natural size is as far as this can be pushed
    // before the effect stops being an explosion and starts being a colour.
    //
    // This signal is also what applies the damage: `AISystem` hangs
    // `onExplosion` off it, which hurts the enemies *and* the player. Calling
    // `applyAreaDamage` alongside it, as this used to, is the same function
    // again — every store was doing double damage and firing two directional
    // damage flashes.
    Signals.emit('explosion:spawn', {
      position: point,
      radius: BOMB.radius,
      damage: BOMB.damage,
      cause: 'airstrike',
      scale: 2,
    });

    // No light of its own. The VFX system already spawns two per explosion —
    // a two-frame flash and a longer fireball glow sized off the sun — and the
    // dynamic pool holds six. A third light per store, at an intensity several
    // times theirs, did not add anything except evict them.

    this.spawnShockwave(point);
    // Over natural size. Half the footprint lands behind the shopfronts on
    // either side of the street, so what the player actually sees of a
    // detonation eighty metres out is whatever clears a two-storey roofline —
    // and at unity scale most of it did not.
    this.dust.burst(point, 1.3);

    const camDist = point.distanceTo(this.ctx.camera.position);
    // Blast overpressure falls off roughly with distance, not with distance
    // squared, over the range that matters here.
    const near = THREE.MathUtils.clamp(1 - (camDist - 18) / 110, 0, 1);

    this.requestShake(0.012 + near * 0.05, 0.55 + near * 0.55);

    // Topped up rather than summed. Accumulating across a stick pins all three
    // at their ceilings for the whole barrage, and an effect that is always at
    // maximum has stopped being an effect — the warp, the tunnel and the
    // stopped-down exposure all need to breathe between impacts for any
    // individual one to land.
    //
    // Concussion is kept low deliberately. The composite turns it into a
    // radial UV wobble *and* multiplies chromatic aberration by up to seven;
    // past about a third it stops reading as overpressure and starts drawing a
    // visible standing ring across the sky, which looks like a broken shader
    // rather than a shockwave. The exposure duck is where the punch actually
    // comes from — it costs no geometry and the eye reads it as the world
    // being too bright to look at for a moment.
    this.blastConcussion = Math.max(this.blastConcussion, 0.08 + near * 0.2);
    this.blastDaze = Math.max(this.blastDaze, near * 0.34);
    this.blastDuck = Math.max(this.blastDuck, near * 0.44);

    // Danger close. Worth calling out explicitly: the player is inside the
    // fragmentation envelope of their own strike and should be told so, once.
    if (camDist < BOMB.radius * 2.6 && !this.warnedClose) {
      this.warnedClose = true;
      Signals.emit('ui:notify', { title: 'DANGER CLOSE', subtitle: 'GET DOWN', tone: 'bad' });
    }

    // Sound travels at 343 m/s. The audio system already fires a near-field
    // blast off `explosion:spawn`, so what is delayed here is the report
    // rolling back off the buildings — audible as a separate event only when
    // the impact is far enough away for the transit time to be perceptible,
    // which is exactly the cue that makes a distant strike read as distant.
    if (camDist > 70) {
      window.setTimeout(() => {
        Signals.emit('audio:oneshot', {
          id: 'explosion_large',
          position: point.clone(),
          volume: THREE.MathUtils.clamp(camDist / 260, 0.35, 1),
        });
      }, Math.min((camDist / 343) * 1000, 2500));
    }

    // Secondary cook-off on alternate impacts. Every impact spawning one makes
    // the barrage uniform, which is the opposite of what a real one sounds or
    // looks like — and each explosion pushes a volumetric smoke puff into a
    // six-slot list, so doubling up would evict the columns that matter.
    if (QUALITY.tier !== 'low' && index % 2 === 1) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 9,
        0.6,
        (Math.random() - 0.5) * 9,
      );
      window.setTimeout(() => {
        Signals.emit('explosion:spawn', {
          position: point.clone().add(offset),
          radius: BOMB.radius * 0.42,
          damage: 0,
          cause: 'airstrike',
          scale: 1.0,
        });
      }, 140 + Math.random() * 220);
    }
  }

  private spawnShockwave(point: THREE.Vector3): void {
    let wave = this.shockwaves.find((w) => w.age >= w.life);
    if (!wave) {
      if (this.shockwaves.length >= 8) return;
      const mesh = new THREE.Mesh(this.shockGeometry, this.shockMaterial);
      mesh.renderOrder = 4;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      wave = { mesh, age: 0, life: 0.7, maxRadius: 18 };
      this.shockwaves.push(wave);
    }
    wave.age = 0;
    wave.life = 0.7;
    wave.maxRadius = 16 + Math.random() * 5;
    wave.mesh.position.copy(point).setY(point.y + 0.35);
    wave.mesh.visible = true;
    wave.mesh.scale.set(3, 1, 3);
  }

  private updateShockwaves(dt: number): void {
    for (const w of this.shockwaves) {
      if (w.age >= w.life) continue;
      w.age += dt;
      const t = THREE.MathUtils.clamp(w.age / w.life, 0, 1);
      // Fast leading edge that decelerates: a pressure front losing energy.
      const r = 3 + (w.maxRadius - 3) * (1 - Math.pow(1 - t, 2.2));
      w.mesh.scale.set(r, 1, r);
      // Barely lifts. A flat ring that climbs is a flat ring you can see the
      // underside of, and it starts intersecting first-floor windows.
      w.mesh.position.y += dt * 0.5;
      if (t >= 1) w.mesh.visible = false;
    }
    // One material for every ring, so they share a fade. They are spawned
    // within a second of each other during a stick anyway.
    let peak = 0;
    for (const w of this.shockwaves) {
      if (w.age >= w.life) continue;
      peak = Math.max(peak, Math.pow(1 - w.age / w.life, 1.4));
    }
    this.shockMaterial.opacity = peak * 0.5;
  }

  dispose(): void {
    for (const j of this.jets) {
      j.model.dispose();
      j.trail.dispose();
    }
    this.bombGeometry.dispose();
    this.balluteGeometry.dispose();
    this.balluteMaterial.dispose();
    this.dust.dispose();
    this.shockGeometry.dispose();
    this.shockMaterial.dispose();
    this.markerMaterial.dispose();
  }
}
