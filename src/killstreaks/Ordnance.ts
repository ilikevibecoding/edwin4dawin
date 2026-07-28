import * as THREE from 'three';
import { BombAssets, BombKind, type BombKindId } from './models/Bomb';
import { SMOKE_TRAIL, type TrailSystem } from './Trails';

/**
 * Everything the aircraft drop, from the moment it is hanging on a pylon to the
 * moment it stops existing.
 *
 * A bomb is worth simulating rather than animating, and the reason is the fall
 * time. A store released at eighty-five metres is in the air for four and a bit
 * seconds, which is long enough that the eye will happily read a constant-rate
 * descent as an elevator. What it wants to see instead is the thing every
 * released store actually does: it leaves the pylon still travelling at the
 * aircraft's speed, arcs *forward*, tumbles for the first half second because
 * nothing is holding it, and then the tail assembly bites and it swings
 * nose-down and stays there. That whole sequence is two integrations and a
 * slerp, and it is the difference between ordnance and a falling prop.
 *
 * The states, and what drives the transform in each:
 *
 *   CARRIED   the aircraft. The director writes the transform from the
 *             hardpoint's world matrix every frame, so the store banks with the
 *             aeroplane and is visibly *gone* from the pylon after release.
 *   FALLING   ballistics. Gravity, quadratic drag on the frontal area, and an
 *             orientation blending out of the release tumble.
 *   SPENT     nothing; the slot is free.
 *
 * Bomblets are the exception: forty of them would be forty draw calls for a
 * second and a half, so they are one `InstancedMesh` sharing the same integrator.
 */

const GRAVITY = -9.81;
/** Air density at sea level, kg/m³. */
const RHO = 1.225;

const State = { SPENT: 0, CARRIED: 1, FALLING: 2 } as const;

/**
 * Ballistic inputs per kind.
 *
 * `mass` in kg, `dia` the frontal diameter in m, `cd` the drag coefficient.
 * A store with a retarder carries a second, much larger pair that takes over
 * `deploy` seconds after release — see `models/Bomb.ts` for why the carpet
 * stick needs one.
 */
interface Ballistic {
  mass: number;
  dia: number;
  cd: number;
  openDia?: number;
  openCd?: number;
  deploy?: number;
}

const BALLISTICS: Ballistic[] = [];
BALLISTICS[BombKind.HEAVY] = { mass: 925, dia: 0.46, cd: 0.26 };
BALLISTICS[BombKind.LIGHT] = {
  mass: 227,
  dia: 0.27,
  cd: 0.28,
  openDia: 1.5,
  openCd: 1.4,
  deploy: 0.3,
};
BALLISTICS[BombKind.CANISTER] = { mass: 220, dia: 0.4, cd: 0.33 };
BALLISTICS[BombKind.TANK] = { mass: 340, dia: 0.64, cd: 0.62 };
BALLISTICS[BombKind.BOMBLET] = { mass: 1.5, dia: 0.06, cd: 0.55 };

/** Half the drag coefficient times frontal area over mass, m²/kg. */
function betaOf(mass: number, dia: number, cd: number): number {
  return (0.5 * RHO * cd * Math.PI * dia * dia * 0.25) / mass;
}

/** Seconds a brake takes to go from folded to fully out. */
const BRAKE_OPEN = 0.16;

/** Drag coefficient part-way through a deployment, blended over `BRAKE_OPEN`. */
function brakeBeta(slick: number, open: number, deployAt: number, age: number): number {
  if (age <= deployAt) return slick;
  const t = Math.min(1, (age - deployAt) / BRAKE_OPEN);
  // Area goes as the square of the span the plates have swung out to.
  return slick + (open - slick) * t * t;
}

export interface OrdnanceHit {
  kind: BombKindId;
  /** Whatever the caller passed to `arm`, so the director can index its stick. */
  tag: number;
  x: number;
  y: number;
  z: number;
  /** Impact speed, m/s. */
  speed: number;
  /** Downward component of the velocity, for directional crater debris. */
  vy: number;
}

interface Store {
  kind: BombKindId;
  state: number;
  tag: number;
  age: number;
  /** Metres per second. */
  vx: number;
  vy: number;
  vz: number;
  px: number;
  py: number;
  pz: number;
  /** m²/kg: half the drag coefficient times frontal area over mass. */
  beta: number;
  /** The same with the air brake out, and when that happens. -1 for no brake. */
  betaOpen: number;
  deployAt: number;
  /** The brake mesh, scaled open on deployment. */
  brake: THREE.Object3D | null;
  spinX: number;
  spinY: number;
  spinZ: number;
  spinRate: number;
  /** Seconds of tumble before the tail authority wins. */
  settle: number;
  /** Seconds after release the canister opens; -1 when it never does. */
  openAt: number;
  trail: number;
  object: THREE.Object3D | null;
  /** Index into the bomblet instance buffer, or -1. */
  instance: number;
}

const _q = new THREE.Quaternion();
const _qAim = new THREE.Quaternion();
const _qSpin = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _scale = new THREE.Vector3(1, 1, 1);
const _hit: OrdnanceHit = { kind: BombKind.LIGHT, tag: 0, x: 0, y: 0, z: 0, speed: 0, vy: 0 };

export class OrdnanceField {
  private readonly group = new THREE.Group();
  private readonly stores: Store[] = [];
  private readonly bomblets: THREE.InstancedMesh;
  private readonly bombletFree: number[] = [];
  private readonly trails: TrailSystem;
  private bombletDirty = false;

  /**
   * Ground height below a point, given how high the store currently is.
   *
   * The height is passed because "what is the floor here" is a more expensive
   * question than it looks — see `KillstreakSystem.ordnanceGround` — and the
   * expensive part only has to be answered in the last few metres.
   */
  groundAt: (x: number, z: number, y: number) => number = () => 0;
  /**
   * Whether a point is inside the playable area. Supplied by the owner.
   *
   * A store released three hundred metres out at seventy metres is descending
   * for most of its flight over ground the level was never built to be flown
   * across, and the collision geometry out there is not a landscape — it is
   * whatever holds the skybox up. Al-Rashid Crossing has a fourteen-metre slab
   * of it twenty metres past the north wall, and until this test existed every
   * carpet strike run from the north put its first three bombs into that slab:
   * three detonations in mid-air over open desert and a forty-metre hole in
   * the middle of the walking line.
   *
   * Outside the play area a store simply keeps falling, and is retired if it
   * gets far enough below the terrain to be gone for good.
   */
  inPlay: (x: number, z: number) => boolean = () => true;
  /** Called the frame a store reaches the ground. */
  onImpact: ((hit: OrdnanceHit) => void) | null = null;
  /** Called when a canister opens, so the director can scatter its bomblets. */
  onOpen: ((tag: number, x: number, y: number, z: number, vx: number, vy: number, vz: number) => void) | null =
    null;

  constructor(
    scene: THREE.Object3D,
    private readonly assets: BombAssets,
    trails: TrailSystem,
    shadows: boolean,
    bombletCapacity: number,
  ) {
    this.trails = trails;
    this.group.name = 'killstreak.ordnance';
    this.group.matrixAutoUpdate = false;
    scene.add(this.group);

    // One pool per body, sized for the largest stick each variant can throw.
    this.addStores(BombKind.HEAVY, 2, shadows);
    this.addStores(BombKind.LIGHT, 14, shadows);
    this.addStores(BombKind.CANISTER, 2, shadows);
    this.addStores(BombKind.TANK, 4, shadows);

    this.bomblets = new THREE.InstancedMesh(
      assets.bodies[BombKind.BOMBLET],
      assets.shell,
      Math.max(1, bombletCapacity),
    );
    this.bomblets.name = 'killstreak.bomblets';
    this.bomblets.castShadow = false;
    this.bomblets.frustumCulled = false;
    this.bomblets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bomblets.visible = false;
    this.group.add(this.bomblets);
    // Every slot is drawn every frame the mesh is visible, so an unused one has
    // to be parked somewhere the camera will never be rather than skipped.
    _eye.set(0, -4000, 0);
    _m.compose(_eye, _q.identity(), _scale);
    for (let i = bombletCapacity - 1; i >= 0; i--) {
      this.bomblets.setMatrixAt(i, _m);
      this.bombletFree.push(i);
      this.stores.push(this.makeStore(BombKind.BOMBLET, null));
    }
    this.bomblets.count = bombletCapacity;
  }

  private addStores(kind: BombKindId, count: number, shadows: boolean): void {
    for (let i = 0; i < count; i++) {
      const object = this.assets.instantiate(kind, shadows);
      object.visible = false;
      this.group.add(object);
      this.stores.push(this.makeStore(kind, object));
    }
  }

  private makeStore(kind: BombKindId, object: THREE.Object3D | null): Store {
    const b = BALLISTICS[kind];
    const retarded = b.openDia !== undefined && b.openCd !== undefined;
    return {
      kind,
      state: State.SPENT,
      tag: 0,
      age: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      px: 0,
      py: 0,
      pz: 0,
      beta: betaOf(b.mass, b.dia, b.cd),
      betaOpen: retarded ? betaOf(b.mass, b.openDia!, b.openCd!) : -1,
      deployAt: retarded ? (b.deploy ?? 0.3) : Infinity,
      brake: object?.getObjectByName('brake') ?? null,
      spinX: 1,
      spinY: 0,
      spinZ: 0,
      spinRate: 0,
      settle: 0.9,
      openAt: -1,
      trail: -1,
      object,
      instance: -1,
    };
  }

  /**
   * The release solution for a store dropped level at `speed` from `drop`
   * metres above the ground: how long it falls and how far it is thrown.
   *
   * This runs the *same* integrator the store will, at the same fixed step,
   * because the closed-form vacuum answer is not close enough to be useful. A
   * 500 lb bomb from seventy metres at run speed loses about twenty-five
   * metres of throw to drag, and twenty-five metres on a map a hundred metres
   * wide is the difference between the stick straddling the reticle and the
   * stick landing entirely on one side of it. Aiming a bombsight by the vacuum
   * solution is a mistake real bombardiers stopped making in about 1918.
   *
   * Twenty-odd iterations of three multiplies, once per strike, at launch.
   */
  solve(kind: BombKindId, speed: number, drop: number, ejection = 0): [number, number] {
    return this.integrate(kind, speed, drop, ejection, -1);
  }

  /**
   * How high the store is `back` metres short of where it will land.
   *
   * The showcase uses this to check that a run-in it is considering does not
   * fly the stick through the side of a gatehouse on the way to the aim point,
   * which a chord slope cannot answer: the trajectory is convex, so the chord
   * always sits *under* the curve near release and *over* it near impact,
   * which is exactly where the answer matters.
   */
  approachHeight(
    kind: BombKindId,
    speed: number,
    drop: number,
    ejection: number,
    back: number,
  ): number {
    return this.integrate(kind, speed, drop, ejection, back)[1];
  }

  /**
   * The shared integrator.
   *
   * With `sampleBack` negative it returns `[fallTime, throwDistance]`; with a
   * distance it returns `[fallTime, heightThatFarShortOfImpact]`, which costs
   * a second pass and is only ever run at setup.
   */
  private integrate(
    kind: BombKindId,
    speed: number,
    drop: number,
    ejection: number,
    sampleBack: number,
  ): [number, number] {
    const b = BALLISTICS[kind];
    const slick = betaOf(b.mass, b.dia, b.cd);
    const open =
      b.openDia !== undefined && b.openCd !== undefined
        ? betaOf(b.mass, b.openDia, b.openCd)
        : slick;
    const deploy = open === slick ? Infinity : (b.deploy ?? 0.3);
    const dt = 1 / 60;

    // First pass for the range, second — only when asked — for the height at a
    // point measured from the far end of a trajectory not yet known.
    let range = 0;
    for (let pass = 0; pass < 2; pass++) {
      let vx = speed;
      let vy = -ejection;
      let x = 0;
      let y = drop;
      let t = 0;
      for (let i = 0; i < 2400 && y > 0; i++) {
        const beta = brakeBeta(slick, open, deploy, t);
        const v = Math.hypot(vx, vy);
        const k = beta * v;
        vx -= vx * k * dt;
        vy += (-9.81 - vy * k) * dt;
        x += vx * dt;
        y += vy * dt;
        t += dt;
        if (pass === 1 && range - x <= sampleBack) return [t, y];
      }
      if (pass === 0) {
        if (sampleBack < 0) return [t, x];
        range = x;
      }
    }
    return [0, 0];
  }

  /**
   * Claims a store and hangs it on the aircraft. Returns a handle, or -1 when
   * that body's pool is empty — which the director treats as a shorter stick
   * rather than as an error, because a frame hitch mid-run is worse.
   */
  arm(kind: BombKindId, tag: number): number {
    for (let i = 0; i < this.stores.length; i++) {
      const store = this.stores[i];
      if (store.kind !== kind || store.state !== State.SPENT) continue;
      if (kind === BombKind.BOMBLET) {
        const slot = this.bombletFree.pop();
        if (slot === undefined) return -1;
        store.instance = slot;
      }
      store.state = State.CARRIED;
      store.tag = tag;
      store.age = 0;
      store.openAt = -1;
      store.trail = -1;
      if (store.brake) {
        store.brake.scale.set(0.02, 0.02, 1);
        store.brake.updateMatrix();
      }
      if (store.object) store.object.visible = true;
      return i;
    }
    return -1;
  }

  /** Writes a carried store's transform from its hardpoint. */
  carry(handle: number, matrix: THREE.Matrix4): void {
    if (handle < 0) return;
    const store = this.stores[handle];
    if (store.state !== State.CARRIED) return;
    matrix.decompose(_eye, _q, _scale);
    store.px = _eye.x;
    store.py = _eye.y;
    store.pz = _eye.z;
    if (store.object) {
      store.object.position.copy(_eye);
      store.object.quaternion.copy(_q);
      store.object.updateMatrix();
    }
  }

  /**
   * Lets it go.
   *
   * `settle` is how long the store tumbles before the tail takes hold, and
   * `open` is the fuze time for a dispenser. Both are deterministic functions
   * of the caller's own sequence counter rather than of a random source, so a
   * captured frame is the same frame every time.
   */
  release(
    handle: number,
    vx: number,
    vy: number,
    vz: number,
    settle: number,
    open: number,
    tumbleSeed: number,
    withTrail: boolean,
  ): void {
    if (handle < 0) return;
    const store = this.stores[handle];
    if (store.state !== State.CARRIED) return;
    store.state = State.FALLING;
    store.age = 0;
    store.vx = vx;
    store.vy = vy;
    store.vz = vz;
    store.settle = settle;
    store.openAt = open;

    // A store leaves the ejector rack with a nose-down pitch rate and a little
    // roll off whichever shoulder it hung from. Derived from the seed so the
    // whole stick tumbles differently without touching a random generator.
    const a = tumbleSeed * 2.3999632;
    _axis.set(Math.cos(a), Math.sin(a) * 0.35, Math.sin(a * 1.7) * 0.25).normalize();
    store.spinX = _axis.x;
    store.spinY = _axis.y;
    store.spinZ = _axis.z;
    store.spinRate = 2.1 + (tumbleSeed % 5) * 0.55;

    if (withTrail) store.trail = this.trails.acquire(SMOKE_TRAIL);
  }

  /** Frees a store immediately, without an impact. Used by cancel and dispose. */
  retire(handle: number): void {
    if (handle < 0) return;
    this.kill(this.stores[handle]);
  }

  /** Drops a bomblet straight into the falling state at a given point. */
  scatter(
    tag: number,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    seed: number,
  ): number {
    const handle = this.arm(BombKind.BOMBLET, tag);
    if (handle < 0) return -1;
    const store = this.stores[handle];
    store.px = x;
    store.py = y;
    store.pz = z;
    this.release(handle, vx, vy, vz, 0.2, -1, seed, false);
    return handle;
  }

  update(dt: number): void {
    let bomblets = 0;
    for (const store of this.stores) {
      if (store.state !== State.FALLING) continue;
      this.step(store, dt);
      if (store.state === State.FALLING && store.kind === BombKind.BOMBLET) bomblets++;
    }
    if (this.bombletDirty) {
      this.bomblets.instanceMatrix.needsUpdate = true;
      this.bombletDirty = false;
    }
    this.bomblets.visible = bomblets > 0;
  }

  private step(store: Store, dt: number): void {
    store.age += dt;

    // Quadratic drag. A slick bomb barely notices it over a four-second fall,
    // which is correct and is why the arc reads as a clean parabola; a napalm
    // tank has six times the beta and visibly falls short of one, and a
    // retarded store an order of magnitude more again the moment its brake is
    // out — which is the whole reason the brake is there.
    const speed = Math.sqrt(store.vx * store.vx + store.vy * store.vy + store.vz * store.vz);
    const beta =
      store.betaOpen < 0
        ? store.beta
        : brakeBeta(store.beta, store.betaOpen, store.deployAt, store.age);
    const k = beta * speed;
    store.vx -= store.vx * k * dt;
    store.vy += (GRAVITY - store.vy * k) * dt;
    store.vz -= store.vz * k * dt;
    if (store.brake) this.deployBrake(store);

    store.px += store.vx * dt;
    store.py += store.vy * dt;
    store.pz += store.vz * dt;

    if (store.openAt > 0 && store.age >= store.openAt) {
      store.openAt = -1;
      this.onOpen?.(store.tag, store.px, store.py, store.pz, store.vx, store.vy, store.vz);
      this.kill(store);
      return;
    }

    if (!this.inPlay(store.px, store.pz)) {
      // Out of the world. Keep integrating so it re-enters correctly, and bin
      // it once it is unambiguously below anything it could ever hit.
      if (store.py < this.groundAt(store.px, store.pz, store.py) - 40) this.kill(store);
      else this.orient(store, speed);
      if (store.trail >= 0) this.trails.lay(store.trail, store.px, store.py, store.pz);
      return;
    }

    const ground = this.groundAt(store.px, store.pz, store.py);
    if (store.py <= ground + 0.15) {
      _hit.kind = store.kind;
      _hit.tag = store.tag;
      _hit.x = store.px;
      _hit.y = ground;
      _hit.z = store.pz;
      _hit.speed = speed;
      _hit.vy = store.vy;
      this.kill(store);
      this.onImpact?.(_hit);
      return;
    }

    this.orient(store, speed);
    if (store.trail >= 0) this.trails.lay(store.trail, store.px, store.py, store.pz);
  }

  /** Swings the plates out, once, over `BRAKE_OPEN` seconds. */
  private deployBrake(store: Store): void {
    const brake = store.brake!;
    const t = Math.min(1, Math.max(0, (store.age - store.deployAt) / BRAKE_OPEN));
    if (brake.scale.x >= 0.999 && t >= 1) return;
    // Overshoot slightly and settle: plates on a spring, not on a slider.
    const s = 0.02 + (1 - 0.02) * (t < 1 ? Math.sin(t * Math.PI * 0.62) / Math.sin(0.62 * Math.PI) : 1);
    brake.scale.set(s, s, 1);
    brake.updateMatrix();
  }

  /**
   * Tumble, then nose-down.
   *
   * The aimed orientation is simply the velocity: a stabilised store weathercocks
   * into its own airflow, which is why a bomb photographed at two hundred metres
   * is never pointing at where it will land, it is pointing at where it is going
   * *now*. The tumble is a spin about a fixed axis, slerped out over `settle`
   * with a curve that is slow to start — the fins do nothing until there is
   * dynamic pressure across them.
   */
  private orient(store: Store, speed: number): void {
    if (speed < 1e-3) return;
    _eye.set(store.px, store.py, store.pz);
    _at.set(store.px + store.vx, store.py + store.vy, store.pz + store.vz);
    // The model's nose runs down -Z, which is the camera convention, so a
    // lookAt basis points the nose along the velocity with no extra flip.
    _m.lookAt(_eye, _at, _up);
    _qAim.setFromRotationMatrix(_m);

    const settle = store.settle;
    let t = settle <= 1e-3 ? 1 : Math.min(1, store.age / settle);
    t = t * t * (3 - 2 * t);
    if (t < 0.999) {
      _axis.set(store.spinX, store.spinY, store.spinZ);
      _qSpin.setFromAxisAngle(_axis, store.spinRate * store.age * Math.PI);
      _q.copy(_qAim).multiply(_qSpin);
      _qAim.slerp(_q, 1 - t);
    }

    if (store.object) {
      store.object.position.set(store.px, store.py, store.pz);
      store.object.quaternion.copy(_qAim);
      store.object.updateMatrix();
    } else if (store.instance >= 0) {
      _eye.set(store.px, store.py, store.pz);
      _m.compose(_eye, _qAim, _scale);
      this.bomblets.setMatrixAt(store.instance, _m);
      this.bombletDirty = true;
    }
  }

  private kill(store: Store): void {
    if (store.state === State.SPENT) return;
    store.state = State.SPENT;
    if (store.object) store.object.visible = false;
    if (store.instance >= 0) {
      // Parked at the origin under the map; the instance count stays at the
      // high-water mark and hiding one costs a matrix write, not a rebuild.
      _eye.set(0, -4000, 0);
      _m.compose(_eye, _qAim.identity(), _scale);
      this.bomblets.setMatrixAt(store.instance, _m);
      this.bombletDirty = true;
      this.bombletFree.push(store.instance);
      store.instance = -1;
    }
    if (store.trail >= 0) {
      this.trails.release(store.trail);
      store.trail = -1;
    }
  }

  /** World position of a live store, for the camera to chase. */
  positionOf(handle: number, out: THREE.Vector3): boolean {
    if (handle < 0) return false;
    const store = this.stores[handle];
    if (store.state === State.SPENT) return false;
    out.set(store.px, store.py, store.pz);
    return true;
  }

  get liveCount(): number {
    let n = 0;
    for (const store of this.stores) if (store.state !== State.SPENT) n++;
    return n;
  }

  clear(): void {
    for (const store of this.stores) this.kill(store);
    this.bomblets.visible = false;
  }

  dispose(): void {
    this.clear();
    this.bomblets.dispose();
    this.group.removeFromParent();
  }
}
