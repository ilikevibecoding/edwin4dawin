import * as THREE from 'three';
import type { LevelSystem } from './Level';
import {
  ROAD_HALF, PAVE_W, CROSS_Z, CROSS_HALF, FRONT_X, POLE_X, CANOPY, LETTER_LIGHT,
  groundY, terrainY, nearVantage, FLAT, PALM,
} from './Level';
import { scaleBoxUV, applyCylinderUV } from './Level';
import type { MaterialKey } from '../render/Materials';
import type { RNG } from '../render/Noise';
import {
  clothPanel, sagCable, slackCable, cyl, ring, bagGeometry, prism, corrugatedPanel, bladeSpray, frond,
  produceHeap, sackOpen, scriptRun,
} from './GeoKit';

/**
 * Set dressing and cover props.
 *
 * Everything here is placed against the authored street layout rather than
 * scattered randomly: sandbag emplacements sit at the ends of long sightlines,
 * market stalls break the carriageway into fightable pockets, and burnt-out
 * vehicles provide the hard cover that anchors each engagement.
 *
 * Density is deliberately graded. The market street between the pavements is
 * the busiest part of the map because it is where the player spends their time
 * and where they look; the dirt lanes behind the blocks get a fraction of it.
 * Uniform density everywhere costs triangles in places nobody looks and, worse,
 * makes the whole map read at one note.
 */

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3(1, 1, 1);
const p = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);
const xAxis = new THREE.Vector3(1, 0, 0);
const zAxis = new THREE.Vector3(0, 0, 1);

function place(
  level: LevelSystem,
  key: MaterialKey,
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rot = 0,
): void {
  q.setFromAxisAngle(yAxis, rot);
  m.compose(p.set(x, y, z), q, s);
  level.push(key, geo, m);
}

/** `place`, with a material override so a prop can carry its own colour. */
function placeMat(
  level: LevelSystem,
  key: MaterialKey,
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rot: number,
  opts: { variant?: string; material?: Record<string, unknown> },
): void {
  q.setFromAxisAngle(yAxis, rot);
  m.compose(p.set(x, y, z), q, s);
  level.push(key, geo, m, opts as never);
}

function box(key: MaterialKey, w: number, h: number, d: number, tile: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  scaleBoxUV(geo as THREE.BoxGeometry, w, h, d, tile);
  void key;
  return geo;
}

/**
 * Ground-plan occupancy, so two clusters cannot be built in the same place.
 *
 * Every cluster here is placed by walking a line and rolling for a spot, and
 * several of them walk the same line — stalls, goods pitches, handcarts and
 * barrels all want the footway. Independently they each look reasonable and
 * together they interpenetrate: the review captures had stall frames growing
 * through goods and crates sunk into each other, which is the single most
 * obvious tell that nobody placed any of it.
 *
 * A disc per cluster is enough. These are all roughly as wide as they are deep,
 * and the cost of being slightly conservative is a gap, which a market can
 * always have.
 */
class Occupancy {
  private readonly discs: Array<{ x: number; z: number; r: number }> = [];

  /** Reserves a disc, or returns false if it would overlap one already taken. */
  claim(x: number, z: number, r: number): boolean {
    if (nearVantage(x, z, r * 0.5)) return false;
    for (const d of this.discs) {
      const rr = d.r + r;
      if ((x - d.x) * (x - d.x) + (z - d.z) * (z - d.z) < rr * rr) return false;
    }
    this.discs.push({ x, z, r });
    return true;
  }

  /** Reserves without testing — for authored positions that must be built. */
  force(x: number, z: number, r: number): void {
    this.discs.push({ x, z, r });
  }
}

/**
 * Surface height of the made ground at a point, so props sit on the road
 * camber, the kerb or the sand rather than hovering above one of them.
 */
function streetY(x: number, z: number): number {
  const ax = Math.abs(x);
  // Delegates to the level's own road profile, which knows about the earth apron
  // laid over the tarmac through the souk. Duplicating the camber here is how
  // every prop north of z = 25 came to be planted 55 mm into the ground.
  if (ax <= ROAD_HALF && z > -54 && z < 54) return groundY(x, z);
  if (ax <= ROAD_HALF + PAVE_W && z > -54 && z < 54) return 0.16;
  if (z > CROSS_Z - CROSS_HALF && z < CROSS_Z + CROSS_HALF && ax < 52) {
    const t = (z - CROSS_Z) / CROSS_HALF;
    return 0.02 + 0.06 * (1 - t * t);
  }
  // Off the made ground it is the desert heightfield, not zero. Returning zero
  // here is what left every prop in the back lanes floating or half-buried by up
  // to 60 mm — the review's "everything hovers about 2 cm above its support".
  return terrainY(x, z);
}

export function buildProps(level: LevelSystem, rng: RNG): void {
  // One occupancy map for everything that competes for floor space. Order is
  // significant: the authored cover — sandbags, barriers, vehicles — claims its
  // ground first, then the market fills in around it.
  const occ = new Occupancy();
  buildSandbags(level, rng, occ);
  buildBarriers(level, rng, occ);
  buildVehicles(level, rng, occ);
  buildMarketStalls(level, rng, occ);
  buildCrates(level, rng, occ);
  buildBarrels(level, rng, occ);
  buildHandcarts(level, rng, occ);
  buildPavementGoods(level, rng, occ);
  buildProduceFronts(level, rng);
  buildBicycles(level, rng);
  buildTyres(level, rng);
  buildFurnitureDumps(level, rng, occ);
  buildPalms(level, rng, occ);
  buildDebris(level, rng);
  buildStreetFurniture(level, rng);
  buildUtilityPoles(level, rng);
}

// ------------------------------------------------------------- sandbags ----

function buildSandbags(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const emplacements: Array<[number, number, number, number]> = [
    [-9.5, -18, 0, 6],
    [9.5, -18, 0, 6],
    [0, -34, Math.PI / 2, 5],
    [-9.4, 12, Math.PI / 2, 4],
    [9.4, 18, Math.PI / 2, 4],
    [0, 26, 0, 7],
    [-32, -2, 0, 4],
    [32, 6, 0, 4],
    [-5.4, 40, 0, 5],
    [5.6, 51, Math.PI / 2, 4],
  ];

  const bag = bagGeometry(0.46, 0.17, 0.26);

  for (const [x, z, rot, len] of emplacements) {
    // Authored cover: it is built wherever it says, and the market works round it.
    occ.force(x, z, Math.max(1.1, (len * 0.52) / 2 + 0.5));
    const rows = 4;
    const baseY = streetY(x, z);
    for (let r = 0; r < rows; r++) {
      const y = baseY + 0.16 + r * 0.28;
      const inset = r * 0.05;
      const count = len - Math.floor(r * 0.4);
      for (let i = 0; i < count; i++) {
        const off = (i - (count - 1) / 2) * 0.52 + (r % 2) * 0.26;
        const lx = Math.cos(rot) * off;
        const lz = -Math.sin(rot) * off;
        const jitterRot = rot + rng.range(-0.12, 0.12);
        q.setFromAxisAngle(yAxis, jitterRot);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, rng.range(-0.08, 0.08)));
        m.compose(
          p.set(x + lx + rng.range(-0.03, 0.03), y, z + lz + inset * Math.sin(rot)),
          q,
          s.set(rng.range(0.92, 1.08), 1, rng.range(0.92, 1.08)),
        );
        level.push('fabricSandbag', bag, m);
      }
    }
    s.set(1, 1, 1);
    // A plank walkway and an ammo crate behind the parapet.
    const g = box('wood', 1.2, 0.06, 0.5, 1.6);
    place(level, 'woodCrate', g, x + Math.sin(rot) * 0.9, baseY + 0.18, z + Math.cos(rot) * 0.9, rot);
    g.dispose();
  }
  bag.dispose();
}

// ------------------------------------------------------------- barriers ----

function buildBarriers(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  // Jersey barriers: trapezoid profile extruded along the road.
  const shape: Array<[number, number]> = [
    [-0.3, 0], [0.3, 0], [0.19, 0.24], [0.11, 0.95], [-0.11, 0.95], [-0.19, 0.24],
  ];
  const geo = prism(shape, 2.0, 1.5, 'z');

  // [x, z, yaw, count]. The pair at z = 41 forms a staggered chicane rather
  // than a straight wall: it still stops a vehicle, it gives both sides of the
  // street hard cover, and it leaves the long sightline down the road open.
  const rows: Array<[number, number, number, number]> = [
    [-6.6, -30, 0, 4],
    [6.6, -30, 0, 4],
    [-4.6, 41.2, Math.PI / 2, 3],
    [5.2, 43.6, Math.PI / 2, 2],
    [-20, -14, 0, 3],
    [20, -14, 0, 3],
    [-3.2, 8, Math.PI / 2, 2],
  ];

  for (const [x, z, rot, count] of rows) {
    occ.force(x, z, count * 1.0);
    for (let i = 0; i < count; i++) {
      // Barriers are laid end to end, so the chain runs along each unit's own
      // length axis — local +Z carried through the yaw. Stepping along the
      // perpendicular instead leaves a 1.5 m gap between every pair and the run
      // reads as scattered blocks rather than a closed line.
      const off = (i - (count - 1) / 2) * 2.03;
      const lx = Math.sin(rot) * off;
      const lz = Math.cos(rot) * off;
      const knocked = rng.next() < 0.16;
      q.setFromAxisAngle(yAxis, rot + rng.range(-0.05, 0.05));
      if (knocked) q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, rng.range(0.9, 1.4)));
      const bx = x + lx;
      const bz = z + lz;
      m.compose(p.set(bx, streetY(bx, bz) + (knocked ? 0.3 : 0.0), bz), q, s);
      level.push('concrete', geo, m);
    }
  }
  geo.dispose();

  // ---- the checkpoint at the north end ----
  //
  // The boom stands raised, not lowered across the road. Lowered it was a
  // uniform 100 mm rod eight metres long at 1.15 m, held at one end only, and
  // from the street camera that is a single dead-straight red line ruled across
  // the whole frame at the exact height the eye is drawn to — it cut the shot in
  // two and read as a rendering artefact rather than as a barrier. Raised it
  // becomes a seven-metre diagonal against the sky and a piece of vertical
  // silhouette in a street that had none, and the checkpoint still reads as a
  // checkpoint because the pivot, the counterweight and the chicane in front of
  // it are all still there.
  const PX = -6.4;
  const PZ = 41.4;
  const gy = streetY(PX, PZ);
  // Pivot stand: ballast block, steel post, bearing housing.
  m.makeTranslation(PX, gy + 0.14, PZ);
  level.box('concrete', 1.0, 0.28, 0.9, m, 1.4);
  const stand = box('corrugated', 0.16, 1.15, 0.16, 0.6);
  place(level, 'corrugated', stand, PX, gy + 0.86, PZ, 0);
  stand.dispose();
  const hub = cyl(0.13, 0.13, 0.3, 8, 0.5);
  q.setFromAxisAngle(zAxis, Math.PI / 2);
  m.compose(p.set(PX, gy + 1.44, PZ), q, s);
  level.push('gunmetal', hub, m);
  hub.dispose();

  // The pole itself, banded. A hazard boom is painted in half-metre bands and
  // that banding is the whole reason it reads as a boom at forty metres instead
  // of as a line; a single-material cylinder cannot say it however long it is.
  const LIFT = 1.08;
  const boomLen = 6.0;
  // One continuous pole, with the pale bands as sleeves over it.
  //
  // Built as alternating segments instead, the pole disappeared: the pale bands
  // are the same value as the arch wall it is silhouetted against, so what came
  // back was a row of unconnected red dashes climbing the frame. A hazard boom has
  // to read as one object first and as striped second, so the red runs the whole
  // length and the white is a slightly fatter collar every metre.
  //
  // Axis derived once, and every part placed along that same axis. Rotating a
  // Y-up cylinder by +(pi/2 - LIFT) about Z sends it along -X while stepping by
  // (cos LIFT, sin LIFT) walks +X, so pole and sleeves were built on mirrored
  // lines: the boom hung six metres over the road touching nothing, and its four
  // white bands floated free beside it. That is the stray primitive the review
  // caught. One vector, no trigonometry duplicated, and the heel lands on the
  // bearing by construction.
  const axis = new THREE.Vector3(Math.cos(LIFT), Math.sin(LIFT), -0.12).normalize();
  const heel = new THREE.Vector3(PX, gy + 1.44, PZ);
  const at = (t: number): THREE.Vector3 => p.copy(heel).addScaledVector(axis, t);
  const lie = (): void => {
    q.setFromUnitVectors(yAxis, axis);
  };
  {
    const pole = cyl(0.07, 0.07, boomLen, 6, 0.6);
    lie();
    m.compose(at(boomLen / 2), q, s);
    level.push('paintedMetalRed', pole, m);
    pole.dispose();
  }
  // Hazard bands, in a paint white rather than in concrete.
  //
  // As `concrete` sleeves these did not read at all — the street capture came
  // back with a plain uniform red diagonal seven metres long and no banding on
  // it anywhere, which is exactly the "stray primitive" reading this element is
  // most at risk of. A boom is identifiable *because* it is striped; unstriped it
  // is a red stick. Wider sleeves, a real white, and a reflector plate at the
  // nose so the far end terminates in something rather than just stopping.
  for (let i = 0; i < 4; i++) {
    const collar = cyl(0.093, 0.093, 0.8, 8, 0.5);
    lie();
    m.compose(at(0.8 + i * 1.46), q, s);
    level.push('paintedMetalTan', collar, m, BOOM_WHITE as never);
    collar.dispose();
  }
  {
    const plate = box('paintedMetalTan', 0.02, 0.3, 0.24, 0.4);
    lie();
    m.compose(at(boomLen - 0.12), q, s);
    level.push('paintedMetalTan', plate, m, BOOM_WHITE as never);
    plate.dispose();
  }
  // Counterweight on the short tail, which is what holds it up.
  for (let i = 0; i < 3; i++) {
    m.makeTranslation(PX - 0.62, gy + 0.5 + i * 0.17, PZ);
    level.box('concrete', 0.42, 0.16, 0.4, m, 0.9);
  }
  const tail = cyl(0.05, 0.05, 0.9, 6, 0.5);
  q.setFromUnitVectors(yAxis, axis.clone().negate());
  m.compose(p.copy(heel).addScaledVector(axis, -0.45), q, s);
  level.push('corrugated', tail, m);
  tail.dispose();

  // The one that snapped off, lying where it fell in the gutter. A checkpoint
  // with two stands and one pole says the place has been fought over.
  const brokeLen = 3.4;
  for (let i = 0; i < 6; i++) {
    const t = -brokeLen / 2 + ((i + 0.5) / 6) * brokeLen;
    const seg = cyl(0.055, 0.055, brokeLen / 6 + 0.01, 6, 0.5);
    q.setFromAxisAngle(zAxis, Math.PI / 2);
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(yAxis, 1.24));
    m.compose(p.set(5.6 + Math.cos(1.24) * t * 0, gy + 0.07, 44.4 + t), q, s);
    level.push(i % 2 === 0 ? 'paintedMetalRed' : 'concrete', seg, m);
    seg.dispose();
  }
  const stump = box('corrugated', 0.16, 0.5, 0.16, 0.5);
  place(level, 'corrugated', stump, 6.5, gy + 0.25, 43.0, 0);
  stump.dispose();
  m.makeTranslation(6.5, gy + 0.12, 43.0);
  level.box('concrete', 0.9, 0.24, 0.8, m, 1.2);

  // Chevron board on the pavement edge, banded the same way as the pole.
  for (let i = 0; i < 4; i++) {
    const boardGeo = box('paintedMetalRed', 1.42, 0.21, 0.07, 1.0);
    place(
      level, i % 2 === 0 ? 'paintedMetalRed' : 'concrete', boardGeo,
      4.9, gy + 0.72 + i * 0.22, 41.7, 0.24,
    );
    boardGeo.dispose();
  }
  const legs = cyl(0.05, 0.05, 0.8, 6, 0.5);
  for (const lx of [4.28, 5.52]) {
    m.makeTranslation(lx, gy + 0.4, 41.85);
    level.push('corrugated', legs, m);
  }
  legs.dispose();

  // Sentry position beside the pivot: three courses of bags and an oil drum
  // brazier. Knee height, so it dresses the middle distance without blocking it.
  for (let course = 0; course < 3; course++) {
    const n = 4 - course;
    for (let i = 0; i < n; i++) {
      const bag = bagGeometry(0.22, 0.085, 0.14);
      q.setFromAxisAngle(yAxis, 0.1 + rng.range(-0.13, 0.13));
      m.compose(
        p.set(
          PX - 1.5 + (i - (n - 1) / 2) * 0.43,
          gy + 0.09 + course * 0.155,
          PZ - 0.9 + rng.range(-0.04, 0.04),
        ),
        q, s,
      );
      level.push('fabricSandbag', bag, m);
      bag.dispose();
    }
  }
}

// --------------------------------------------------------------- crates ----

function buildCrates(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const clusters: Array<[number, number]> = [
    [-9.8, -8], [9.8, -6], [-16, 20], [17, 22], [-30, 30], [30, -30],
    [4, -40], [-9.4, 6], [-36, -16], [36, 16], [2.4, 4], [-24, 44],
    [-9.9, 36], [9.9, 43], [-9.6, 54], [6.2, 34], [-12.6, -24], [12.6, 30],
  ];

  for (const [cx, cz] of clusters) {
    if (!occ.claim(cx, cz, 1.8)) continue;
    const count = rng.int(2, 6);
    // Top face height is tracked per crate, not centre height.
    //
    // Stacking used to set the upper crate's centre to the lower crate's centre
    // plus its own size, which is only correct when the two happen to be the
    // same size. Crates here vary from 550 to 1000 mm, so on average every
    // stacked crate was 110 mm out — hovering over a small base, buried in a
    // large one — and that is the interpenetration visible all over the street.
    const stack: Array<{ x: number; z: number; top: number; half: number }> = [];
    const baseY = streetY(cx, cz);
    for (let i = 0; i < count; i++) {
      const size = rng.range(0.55, 1.0);
      let x = cx + rng.range(-1.4, 1.4);
      let z = cz + rng.range(-1.4, 1.4);
      let y = baseY + size / 2;
      if (i > 0 && rng.next() < 0.45) {
        const base = stack[rng.int(0, stack.length - 1)];
        // Only where it would actually balance: a 1 m crate on a 550 mm one
        // overhangs by 225 mm a side and belongs on the ground.
        if (size <= base.half * 2 + 0.12) {
          x = base.x + rng.range(-0.12, 0.12) * (base.half * 2 - size + 0.2);
          z = base.z + rng.range(-0.12, 0.12) * (base.half * 2 - size + 0.2);
          y = base.top + size / 2;
        }
      }
      stack.push({ x, z, top: y + size / 2, half: size / 2 });

      const geo = new THREE.BoxGeometry(size, size, size);
      scaleBoxUV(geo, size, size, size, 1.1);
      place(level, rng.next() < 0.75 ? 'woodCrate' : 'paintedMetalGreen', geo, x, y, z, rng.range(0, Math.PI * 2));
      geo.dispose();

      // Batten frame on wooden crates.
      if (rng.next() < 0.6) {
        const t = 0.05;
        for (const oy of [size / 2 - t / 2, -size / 2 + t / 2]) {
          const b = new THREE.BoxGeometry(size + 0.01, t, size + 0.01);
          scaleBoxUV(b, size + 0.01, t, size + 0.01, 1.1);
          place(level, 'wood', b, x, y + oy, z);
          b.dispose();
        }
      }
    }
  }
}

// -------------------------------------------------------------- barrels ----

function buildBarrels(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const spots: Array<[number, number]> = [
    [-10.4, 2], [10.4, 8], [-19, -26], [19, -28], [-28, 12], [28, 18],
    [2, 30], [-6, -22], [7, -12], [-40, 4], [40, -2], [10.8, 42],
    [-6.4, 41.6], [-10.6, 30], [10.6, 52], [-3.4, 18],
  ];

  const geo = cyl(0.29, 0.29, 0.88, 16, 1.2);
  const hoop = ring(0.295, 0.022, 16, 5, 0.4);
  hoop.rotateX(Math.PI / 2);

  for (const [cx, cz] of spots) {
    if (!occ.claim(cx, cz, 1.3)) continue;
    const count = rng.int(1, 4);
    for (let i = 0; i < count; i++) {
      const x = cx + rng.range(-0.9, 0.9);
      const z = cz + rng.range(-0.9, 0.9);
      const gy = streetY(x, z);
      const tipped = rng.next() < 0.2;
      const key: MaterialKey = rng.next() < 0.45 ? 'paintedMetalRed' : rng.next() < 0.6 ? 'paintedMetalGreen' : 'paintedMetalTan';
      if (tipped) {
        q.setFromAxisAngle(xAxis, Math.PI / 2);
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(yAxis, rng.range(0, Math.PI * 2)));
        m.compose(p.set(x, gy + 0.29, z), q, s);
      } else {
        q.setFromAxisAngle(yAxis, rng.range(0, Math.PI * 2));
        m.compose(p.set(x, gy + 0.44, z), q, s);
      }
      level.push(key, geo, m);
      for (const hy of [-0.22, 0.22]) {
        const hm = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, hy, 0));
        level.push(key, hoop, hm);
      }
    }
  }
  geo.dispose();
  hoop.dispose();
}

// -------------------------------------------------------- market stalls ----

/**
 * The market itself.
 *
 * Stalls are laid along both pavements at an irregular rhythm, alternating
 * between a canopied trestle and an open ground display, and the goods on top
 * differ per stall. Repeating one stall model down a street is the single most
 * obvious generated-content tell there is, so every stall varies in width,
 * canopy sag, cloth colour and what is on the counter.
 */
function buildMarketStalls(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const sabatZ = 48;
  for (const side of [-1, 1]) {
    let z = -50 + rng.range(0, 4);
    while (z < 56) {
      const gap = rng.range(4.6, 9.5);
      const nearSabat = Math.abs(z - sabatZ) < 3.5;
      const nearCross = Math.abs(z - CROSS_Z) < CROSS_HALF + 2.5;
      if (!nearSabat && !nearCross && rng.next() < 0.78) {
        // Either just inside the kerb on the footway, or out in the gutter.
        //
        // Never mid-footway. The canopy stands on posts at 8.15 m and 11.5 m and
        // a stall pitched between them blocks the only route down the pavement,
        // which is both unplayable and how the west footway came to be a solid
        // 4 m of clutter for its whole length. Against the kerb the stall shares
        // the outer post line's ground and the 2 m behind it stays walkable.
        const inGutter = rng.next() < 0.4;
        const x = side * (inGutter ? rng.range(5.6, 6.6) : rng.range(8.6, 9.4));
        if (occ.claim(x, z, 2.0)) buildStall(level, x, z, side > 0 ? Math.PI : 0, rng);
      }
      z += gap;
    }
  }
  // A cluster of stalls in the middle of the carriageway, forcing the player to
  // weave: cover that has to be walked around is worth more than cover you can
  // shoot past.
  for (const [x, z, rot] of [[-2.2, 22, 0.4], [2.6, 15, -0.5], [-1.4, -4, 0.2]] as Array<[number, number, number]>) {
    occ.force(x, z, 2.0);
    buildStall(level, x, z, rot, rng);
  }
  // The stretch of carriageway between z = 36 and the sabat.
  //
  // This is the deepest shadow on the map — the arch is 13 m tall and the sun is
  // behind it, so everything from the arch back to about z = 21 is backlit. Bare
  // tarmac there has nothing to give: it is the darkest material in the library
  // on an unlit surface, and it collapsed the bottom half of the street shot
  // into one black field. Stalls fix it by silhouetting against the sunlit strip
  // under the arch and by putting pale canopies where skylight can still reach
  // them. Kept to the sides of the crown so the sightline stays open.
  // Held off the crown and set back from z = 39, so the twelve metres of road
  // nearest the camera stays clear. Filling that foreground with stalls put a
  // wall of unlit canopy across the bottom of the frame and hid the one thing
  // down there that does have tone in it, which is the painted kerb line.
  for (const [x, z, rot] of [
    [-6.8, 39.6, 0.12], [7.0, 41.4, Math.PI - 0.15], [-6.4, 44.4, -0.1],
    [6.5, 45.0, Math.PI + 0.14],
  ] as Array<[number, number, number]>) {
    occ.force(x, z, 2.0);
    buildStall(level, x, z, rot, rng);
  }
}

/**
 * What is actually on the trays.
 *
 * The review's sharpest single line was that "a market is *defined* by its
 * goods", and the goods were tan. This is the fix, and it is a palette rather
 * than a random hue because real produce sits in a narrow band of saturated
 * warm colours with two or three cool outliers, and randomising hue lands most
 * of the draws in the yellow-greens nothing edible actually is.
 *
 * Sizes matter as much as colour: what tells the eye it is looking at dates
 * rather than melons is that the bumps on the heap are 8 mm and not 90.
 */
const PRODUCE: ReadonlyArray<{ key: MaterialKey; r: number; opts: { variant: string; material: Record<string, unknown> } }> = [
  { key: 'paintedMetalRed', r: 0.036, opts: { variant: 'tomato', material: { color: new THREE.Color(2.0, 0.62, 0.42), roughness: 0.42 } } },
  { key: 'paintedMetalTan', r: 0.04, opts: { variant: 'orange', material: { color: new THREE.Color(2.1, 1.15, 0.34), roughness: 0.55 } } },
  { key: 'paintedMetalGreen', r: 0.055, opts: { variant: 'melon', material: { color: new THREE.Color(0.9, 1.5, 0.6), roughness: 0.5 } } },
  { key: 'paintedMetalRed', r: 0.028, opts: { variant: 'aubergine', material: { color: new THREE.Color(0.6, 0.4, 0.85), roughness: 0.38 } } },
  { key: 'woodCrate', r: 0.014, opts: { variant: 'dates', material: { color: new THREE.Color(0.95, 0.66, 0.42), roughness: 0.62 } } },
  // Spice shares the orange's batch. Two warm oranges 100 mm apart on a stall,
  // separated only by the roughness, is not a distinction the frame can carry,
  // and the size difference is what says spice rather than fruit anyway.
  { key: 'paintedMetalTan', r: 0.024, opts: { variant: 'orange', material: { color: new THREE.Color(2.1, 1.15, 0.34), roughness: 0.55 } } },
];
/** Sacking: hessian, and the off-white cotton a flour sack is made of. */
const SACKING: ReadonlyArray<{ key: MaterialKey; opts: { variant: string; material: Record<string, unknown> } }> = [
  { key: 'fabricSandbag', opts: { variant: 'hessian', material: { color: new THREE.Color(1.35, 1.12, 0.8), roughness: 0.94 } } },
  { key: 'fabricSandbag', opts: { variant: 'flourSack', material: { color: new THREE.Color(1.9, 1.86, 1.7), roughness: 0.9 } } },
];
/**
 * Timber tone, chosen per stall.
 *
 * One stall's frame is all cut from one batch, so the members match each other —
 * but the stall next to it was built five years earlier out of something else,
 * and that is the variation the street was missing. Silvered driftwood-grey
 * through to a fresh red-brown covers what actually stands in a souk.
 */
const TIMBER: ReadonlyArray<{ variant: string; material: Record<string, unknown> }> = [
  { variant: 'timberSilver', material: { color: new THREE.Color(1.3, 1.24, 1.14), roughness: 0.95 } },
  { variant: 'timberRed', material: { color: new THREE.Color(1.08, 0.76, 0.56), roughness: 0.88 } },
  { variant: 'timberDark', material: { color: new THREE.Color(0.74, 0.65, 0.53), roughness: 0.92 } },
];
/** Galvanised scaffold tube, for the stalls built out of site leftovers. */
const SCAFFOLD = { variant: 'scaffold', material: { color: new THREE.Color(1.5, 1.55, 1.6), roughness: 0.6 } };
/** Hazard white, for the bands on the checkpoint boom. */
const BOOM_WHITE = { variant: 'boomWhite', material: { color: new THREE.Color(2.6, 2.55, 2.4), roughness: 0.6 } };
/** Dyed cloth, for the bolts hung off a draper's rail. */
const SIGN_CLOTH: ReadonlyArray<{ variant: string; material: Record<string, unknown> }> = [
  // The indigo and the red are the awning dyes, exactly: one dyer supplies the
  // whole street, so the bolt on the draper's rail and the cloth stretched over
  // the stall next door are the same cloth. Two fewer batches for a difference
  // of about a tenth of a stop, which is not a trade — it is free.
  //
  // Written out rather than referenced from `CANOPY`, which lives in `Level` and
  // therefore is not initialised yet when this module's body runs: `Level`
  // imports `Props`, so `Props` evaluates first and any top-level dereference of
  // a `Level` binding throws before the page has drawn a frame. The batch key
  // hashes the override *values*, so a duplicated literal still lands in the
  // same batch — but the two copies have to stay identical to do so.
  { variant: 'awnIndigo', material: { color: new THREE.Color(0.78, 1.02, 1.5), roughness: 0.94 } },
  { variant: 'clothSaffron', material: { color: new THREE.Color(1.85, 1.3, 0.5), roughness: 0.84 } },
  { variant: 'awnRed', material: { color: new THREE.Color(1.6, 0.91, 0.8), roughness: 0.94 } },
];
/** Painted crate ends — the crates a wholesaler stencils and gets back. */
const CRATE_PAINT: ReadonlyArray<{ variant: string; material: Record<string, unknown> }> = [
  { variant: 'crateBlue', material: { color: new THREE.Color(0.7, 1.05, 1.5), roughness: 0.72 } },
  { variant: 'crateGreen', material: { color: new THREE.Color(0.72, 1.3, 0.78), roughness: 0.74 } },
  { variant: 'crateRed', material: { color: new THREE.Color(1.5, 0.72, 0.6), roughness: 0.76 } },
];

function buildStall(level: LevelSystem, x: number, z: number, rot: number, rng: RNG): void {
  const w = rng.range(2.1, 3.2);
  const d = rng.range(1.5, 2.1);
  const hgt = rng.range(2.15, 2.45);
  const y0 = streetY(x, z);
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const local = (ox: number, oz: number): [number, number] => [x + ox * c - oz * sn, z + ox * sn + oz * c];

  // ---- frame ----
  //
  // A stall is not a kit. It is whatever its owner had: some are round poles cut
  // from a palm, some are sawn scantling, some are scaffold tube off a building
  // site — and the tone of the timber differs stall to stall because each was
  // bought at a different time and has weathered for a different number of years.
  // The review's complaint was that every member on the street was the same
  // square section in the same tan at the same angle, and the fix is to choose
  // per stall and then vary *within* the choice, which is how a real one is built.
  const build = rng.next();
  const round = build < 0.45;
  const tube = build > 0.82;
  const postR = rng.range(0.038, 0.062);
  const tone = TIMBER[rng.int(0, TIMBER.length - 1)];
  const frameKey: MaterialKey = tube ? 'corrugated' : 'wood';
  const frameOpts = tube ? SCAFFOLD : tone;

  const corners: Array<[number, number]> = [
    [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2],
  ];
  const postTop: number[] = [];
  for (const [ox, oz] of corners) {
    // Uneven lengths: the back pair carries the ridge and stands taller, and no
    // two are cut to the same mark.
    const ph = hgt + (oz < 0 ? 0 : rng.range(-0.05, 0.02)) + rng.range(-0.03, 0.03);
    postTop.push(ph);
    const r = postR * rng.range(0.88, 1.14);
    const post = round || tube
      ? cyl(r * (tube ? 0.82 : 0.9), r * (tube ? 0.82 : 1.14), ph, tube ? 8 : 6, 0.8)
      : box('wood', r * 1.8, ph, r * 1.7, 0.8);
    const [px, pz] = local(ox, oz);
    q.setFromAxisAngle(yAxis, rot + rng.range(-0.06, 0.06));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, rng.range(-0.045, 0.045)));
    m.compose(p.set(px, y0 + ph / 2, pz), q, s);
    level.push(frameKey, post, m, frameOpts as never);
    post.dispose();
    // Packing stone under the foot, where the ground is not where the post ends.
    if (rng.next() < 0.45) {
      const shim = box('rubble', r * 3, 0.05, r * 3, 0.4);
      place(level, 'rubble', shim, px, y0 + 0.025, pz, rng.range(0, 3));
      shim.dispose();
    }
  }
  // Head rails, a section down from the posts because they carry less.
  for (let i = 0; i < 2; i++) {
    const oz = i === 0 ? -d / 2 : d / 2;
    const rh = postR * rng.range(1.0, 1.35);
    const rail = round && !tube
      ? cyl(rh * 0.5, rh * 0.55, w + 0.12, 6, 0.8)
      : box('wood', w + 0.12, rh, rh * 0.95, 1.0);
    const [px, pz] = local(0, oz);
    q.setFromAxisAngle(yAxis, rot);
    if (round && !tube) q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI / 2));
    // Rails sit *on* the posts rather than through them, and slope with the
    // uneven post tops instead of being dead level.
    const ry = y0 + (postTop[i * 2] + postTop[i * 2 + 1]) / 2 - postR * 0.6;
    q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, rng.range(-0.02, 0.02)));
    m.compose(p.set(px, ry, pz), q, s);
    level.push(frameKey, rail, m, frameOpts as never);
    rail.dispose();
  }
  // ---- joinery ----
  //
  // The cheapest and highest-value part of this pass. A lashing is a 25 mm torus
  // and it converts an interpenetration into a joint: the eye reads the binding,
  // not the fact that two cylinders happen to overlap inside it.
  for (let i = 0; i < 4; i++) {
    const [ox, oz] = corners[i];
    const [px, pz] = local(ox, oz);
    const jy = y0 + postTop[i] - postR * 0.6;
    if (tube) {
      // Scaffold: a right-angle coupler, which is a pair of forged half-shells.
      const clamp = box('gunmetal', postR * 2.6, postR * 2.2, postR * 2.6, 0.3);
      place(level, 'gunmetal', clamp, px, jy, pz, rot + 0.4);
      clamp.dispose();
    } else {
      const turns = rng.int(2, 3);
      for (let k = 0; k < turns; k++) {
        const lash = ring(postR * 1.35, 0.008, 7, 4, 0.3);
        q.setFromAxisAngle(xAxis, Math.PI / 2 + rng.range(-0.12, 0.12));
        q.multiply(new THREE.Quaternion().setFromAxisAngle(yAxis, rng.range(0, 1)));
        m.compose(p.set(px, jy + (k - turns / 2) * 0.024, pz), q, s);
        level.push('fabricSandbag', lash, m,
          { variant: 'rope', material: { color: new THREE.Color(1.3, 1.15, 0.85), roughness: 0.95 } } as never);
        lash.dispose();
      }
      // A nailed-on cleat under the rail, taking the load the lashing does not.
      const cleat = box('wood', postR * 1.4, 0.09, postR * 3.4, 0.5);
      place(level, 'wood', cleat, px, jy - 0.09, pz, rot);
      cleat.dispose();
    }
  }
  // Diagonal braces in the end frames — the member that stops a stall racking,
  // and the one that breaks the grid of verticals and horizontals.
  for (const sd of [-1, 1]) {
    if (rng.next() < 0.35) continue;
    const run = Math.hypot(d, hgt * 0.55);
    const brace = round && !tube
      ? cyl(postR * 0.5, postR * 0.55, run, 5, 0.8)
      : box('wood', postR * 1.3, run, postR * 1.1, 0.9);
    const [bx, bz] = local(sd * (w / 2), 0);
    q.setFromAxisAngle(yAxis, rot);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, Math.atan2(d, hgt * 0.55) * (sd > 0 ? 1 : -1)));
    if (round && !tube) {
      // A cylinder is authored along Y already; a box needs no extra turn.
    }
    m.compose(p.set(bx, y0 + hgt * 0.72, bz), q, s);
    level.push(frameKey, brace, m, frameOpts as never);
    brace.dispose();
  }

  // Canopy. Pitched to a ridge rather than laid flat: a stall roof is looked
  // down on from standing height more often than it is looked up at, and a
  // single horizontal sheet at 2.4 m is a bare quad filling the middle of the
  // frame. A ridge gives it two tones, a silhouette break and a shadow line.
  const ridge = rng.range(0.3, 0.48);
  const pitch = 0.32;
  const stripe = CANOPY[rng.int(0, CANOPY.length - 1)];
  if (rng.next() < 0.72) {
    for (const sd of [-1, 1]) {
      // Folds twice as deep, and more of them.
      //
      // This sheet is three metres by one and a half, and in the alley shot one
      // of them ends up three metres from the lens: at 75 mm over a 1.1 m
      // wavelength the surface only turns through seven degrees, which under a
      // single sun is no shading at all, so the whole thing came back as one
      // uniform pale board filling a quarter of the frame. At 150 mm over 0.6 m
      // it turns through twenty-odd, and the sheet gets the run of light and shade
      // across it that is the only thing distinguishing cloth from card.
      // Striped, in geometry rather than in texture.
      //
      // The awning was one sheet of one over-bright mauve, and in both the street
      // and alley captures it came back as a blank white plate with hard straight
      // edges — the single largest fake surface in the frame, and the review
      // called it exactly that. A market awning is *striped*, and there is no
      // stripe in the texture set to reach for, so the stripe is built: the slope
      // is cut into bands and the bands alternate between two dyes. That costs
      // nothing but a few extra pushes into batches that already exist, it gives
      // the sheet a run of hard colour edges that describe its curvature as it
      // sags, and it is the strongest single hit against the monochrome.
      const bands = Math.max(4, Math.round((w + 0.6) / 0.34));
      const bw = (w + 0.6) / bands;
      // Turn the sheet flat, then drop the eave edge to make the pitch: the
      // panel hangs along -Y, so a turn of (pitch - 90 deg) about X lays it out
      // horizontally with a fall of sin(pitch) along its length.
      const cq = new THREE.Quaternion().setFromAxisAngle(yAxis, rot + (sd > 0 ? Math.PI : 0));
      cq.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, -Math.PI / 2 + pitch));
      for (let b = 0; b < bands; b++) {
        // Overlapped by a millimetre so the bands cannot crack apart along the
        // sag, and given their own fold phase so the surface is not ruled.
        const slope = clothPanel(bw + 0.004, d / 2 + 0.42, {
          sag: 0.05, fold: 0.055, folds: 2, tile: 2.4, segsX: 3, segsY: 5,
        });
        slope.translate(-(w + 0.6) / 2 + bw * (b + 0.5), 0, 0);
        m.compose(p.set(x, y0 + hgt + 0.06 + ridge, z), cq, s);
        level.push('fabricTarp', slope, m, (b % 2 === 0 ? stripe.a : stripe.b) as never);
        slope.dispose();
      }
    }
    // Ridge pole and its props.
    const pole = cyl(0.035, 0.035, w + 0.5, 6, 0.6);
    q.setFromAxisAngle(yAxis, rot);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI / 2));
    m.compose(p.set(x, y0 + hgt + 0.07 + ridge, z), q, s);
    level.push('wood', pole, m);
    pole.dispose();
    for (const ox of [-w / 2 + 0.1, w / 2 - 0.1]) {
      const prop = box('wood', 0.05, ridge, 0.05, 0.5);
      const [ax, az] = local(ox, 0);
      place(level, 'wood', prop, ax, y0 + hgt + ridge / 2, az, rot);
      prop.dispose();
    }
    // Overhanging valance on the customer side, carrying the same stripe down.
    // Scalloped: each band gets its own drop, so the bottom edge is a row of
    // shallow points rather than one ruled line across the frame.
    {
      const bands = Math.max(4, Math.round((w + 0.6) / 0.34));
      const bw = (w + 0.6) / bands;
      const [vx, vz] = local(0, d / 2 + 0.4);
      for (let b = 0; b < bands; b++) {
        const drop = rng.range(0.3, 0.42);
        // A shallow scallop. At a tenth of the drop the arc cut a deep notch
        // between every pair of bands and the valance read as a row of separate
        // pennants rather than as one hanging edge.
        const valance = clothPanel(bw + 0.006, drop, {
          hem: 0.022, fold: 0.03, folds: 2, tile: 1.6, segsX: 3, segsY: 3,
        });
        valance.translate(-(w + 0.6) / 2 + bw * (b + 0.5), 0, 0);
        q.setFromAxisAngle(yAxis, rot);
        m.compose(p.set(vx, y0 + hgt + 0.06, vz), q, s);
        level.push('fabricTarp', valance, m, (b % 2 === 0 ? stripe.a : stripe.b) as never);
        valance.dispose();
      }
    }
  } else {
    // Corrugated instead: two pitches, with a stone holding one down.
    const sl = d / 2 + 0.45;
    for (const sd of [-1, 1]) {
      const sheet = box('corrugated', w + 0.5, 0.05, sl, 2.4);
      sheet.translate(0, 0, sl / 2);
      const cq = new THREE.Quaternion().setFromAxisAngle(yAxis, rot + (sd > 0 ? Math.PI : 0));
      cq.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, pitch));
      m.compose(p.set(x, y0 + hgt + 0.06 + ridge, z), cq, s);
      level.push('corrugated', sheet, m);
      sheet.dispose();
    }
    const stone = box('rubble', 0.28, 0.16, 0.24, 0.8);
    const [wx, wz] = local(rng.range(-w / 3, w / 3), -d / 4);
    place(level, 'rubble', stone, wx, y0 + hgt + ridge - 0.1, wz, rng.range(0, 3));
    stone.dispose();
  }
  // Battens over the covering, which is what a market roof is actually held
  // together by, and the strongest thing on it when seen from above. Spaced at
  // about 700 mm and standing proud of the sheet, so each one lays a shadow
  // across it: on a roof this is the cheapest relief there is, and the roof is
  // what a player standing next to a stall actually sees of it.
  const battens = Math.max(3, Math.round(w / 0.7));
  const slopeLen = d / 2 + 0.42;
  for (let i = 0; i < battens; i++) {
    const bo = -w / 2 + (w * (i + 0.5)) / battens;
    for (const sd of [-1, 1]) {
      // One per slope, tilted to follow it: a single batten spanning the ridge
      // would bridge the V and sit in mid-air over the eaves.
      const batten = box('wood', 0.055, 0.05, slopeLen, 0.6);
      batten.translate(0, 0, sd * slopeLen / 2);
      const [bx, bz] = local(bo, 0);
      q.setFromAxisAngle(yAxis, rot);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, -sd * pitch));
      m.compose(p.set(bx, y0 + hgt + 0.19 + ridge, bz), q, s);
      // In the stall's own timber tone. Left as bare `wood` these came out as a
      // row of blown-out white sticks lying across the canopy, which is the
      // brightest thing in the street frame and the least interesting.
      level.push('wood', batten, m, tone as never);
      batten.dispose();
    }
  }
  // Fascia boards nailed round the eaves.
  //
  // A stall is looked down on from standing height, so what the player sees of it
  // is its roof, and a canopy made of sheet has no thickness at all from above —
  // in review it read as a pale saucer balanced on sticks. A 120 mm board along
  // each eaves gives the roof an edge, a shadow under that edge, and a dark line
  // separating it from the ground behind, which is all it takes for the shape to
  // become a solid object.
  for (const oz of [-(d / 2 + 0.28), d / 2 + 0.28]) {
    const fascia = box('wood', w + 0.62, 0.13, 0.05, 1.4);
    const [fx, fz] = local(0, oz);
    place(level, 'wood', fascia, fx, y0 + hgt + 0.02 - 0.04, fz, rot);
    fascia.dispose();
  }
  for (const ox of [-(w / 2 + 0.3), w / 2 + 0.3]) {
    const rake = box('wood', 0.05, 0.13, d + 0.61, 1.4);
    const [fx, fz] = local(ox, 0);
    place(level, 'wood', rake, fx, y0 + hgt + ridge * 0.5, fz, rot);
    rake.dispose();
  }

  // Counter and its skirt board.
  const counter = box('wood', w, 0.08, d * 0.72, 2.2);
  place(level, 'wood', counter, x, y0 + 0.92, z, rot);
  counter.dispose();
  const skirt = box('wood', w, 0.86, 0.06, 2.2);
  const [sx2, sz2] = local(0, d * 0.36);
  place(level, 'wood', skirt, sx2, y0 + 0.45, sz2, rot);
  skirt.dispose();
  for (const ox of [-w / 2 + 0.1, w / 2 - 0.1]) {
    const leg = box('wood', 0.07, 0.9, d * 0.7, 1.4);
    const [lx, lz] = local(ox, 0);
    place(level, 'wood', leg, lx, y0 + 0.46, lz, rot);
    leg.dispose();
  }

  // ---- goods ----
  //
  // The counter is the part of a stall a player is closest to and the part the
  // review called out hardest, so it gets the density. Every branch below puts
  // *individual* objects on the board rather than one heap primitive: what makes
  // a market read is a hundred small bodies at a known size catching a hundred
  // small highlights, and no amount of texture on a single dome substitutes.
  const kind = rng.next();
  if (kind < 0.5) {
    const trays = rng.int(2, 4);
    for (let i = 0; i < trays; i++) {
      const tw = w / trays - 0.1;
      const [tx, tz] = local(-w / 2 + (w * (i + 0.5)) / trays, rng.range(-0.1, 0.1));
      const td = d * 0.5;
      // A tray is four boards and a floor, tilted toward the customer the way a
      // trader angles it so the stock is on show rather than edge-on.
      const tilt = rng.range(0.1, 0.2);
      const paint = CRATE_PAINT[rng.int(0, CRATE_PAINT.length - 1)];
      q.setFromAxisAngle(yAxis, rot);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, -tilt));
      const trayFloor = box('woodCrate', tw, 0.03, td, 1.0);
      m.compose(p.set(tx, y0 + 1.0, tz), q, s);
      level.push('woodCrate', trayFloor, m);
      trayFloor.dispose();
      for (const [ow, oh, od, oy, oz] of [
        [tw, 0.1, 0.025, 0.05, td / 2], [tw, 0.06, 0.025, 0.03, -td / 2],
      ] as Array<[number, number, number, number, number]>) {
        const side = box('woodCrate', ow, oh, od, 1.0);
        side.translate(0, oy, oz);
        m.compose(p.set(tx, y0 + 1.0, tz), q, s);
        level.push('woodCrate', side, m, paint as never);
        side.dispose();
      }
      for (const sx of [-tw / 2, tw / 2]) {
        const end = box('woodCrate', 0.025, 0.09, td, 1.0);
        end.translate(sx, 0.045, 0);
        m.compose(p.set(tx, y0 + 1.0, tz), q, s);
        level.push('woodCrate', end, m, paint as never);
        end.dispose();
      }
      const pr = PRODUCE[rng.int(0, PRODUCE.length - 1)];
      const heap = produceHeap(
        tw - 0.05, td - 0.04, 0.05,
        Math.min(26, Math.round((tw * td) / (pr.r * pr.r * 5.4))),
        pr.r, () => rng.next(),
      );
      m.compose(p.set(tx, y0 + 1.02, tz), q, s);
      level.push(pr.key, heap, m, pr.opts as never);
      heap.dispose();
    }
  } else if (kind < 0.78) {
    // Open sacks along the front, each with its scoop and its own grain.
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      const sr = rng.range(0.15, 0.21);
      const sh = rng.range(0.24, 0.34);
      const [bx, bz] = local(-w / 2 + (w * (i + 0.5)) / n, rng.range(-0.12, 0.06));
      const sk = SACKING[rng.int(0, SACKING.length - 1)];
      const sack = sackOpen(sr, sh, () => rng.next());
      placeMat(level, sk.key, sack, bx, y0 + 1.0, bz, rng.range(0, 3), sk.opts);
      sack.dispose();
      // Rolled collar, and the goods showing above it.
      const collar = ring(sr * 0.92, sr * 0.19, 9, 4, 0.5);
      q.setFromAxisAngle(xAxis, Math.PI / 2);
      m.compose(p.set(bx, y0 + 1.0 + sh * 0.88, bz), q, s);
      level.push(sk.key, collar, m, sk.opts as never);
      collar.dispose();
      const pr = PRODUCE[rng.int(0, PRODUCE.length - 1)];
      const fill = produceHeap(sr * 1.5, sr * 1.5, 0.035,
        Math.min(16, Math.round((sr * sr * 2.2) / (pr.r * pr.r))), pr.r, () => rng.next());
      placeMat(level, pr.key, fill, bx, y0 + 1.0 + sh * 0.84, bz, 0, pr.opts);
      fill.dispose();
      if (rng.next() < 0.4) {
        const scoop = cyl(0.045, 0.05, 0.1, 6, 0.3);
        q.setFromAxisAngle(zAxis, rng.range(0.5, 1.0));
        m.compose(p.set(bx + rng.range(-0.05, 0.05), y0 + 1.0 + sh * 0.96, bz), q, s);
        level.push('gunmetal', scoop, m);
        scoop.dispose();
      }
    }
  } else {
    // Hanging stock on the head rail: cloth bolts, and strung bunches.
    for (let i = 0; i < rng.int(3, 6); i++) {
      const cw = rng.range(0.2, 0.42);
      const ch = rng.range(0.4, 0.8);
      const cloth = clothPanel(cw, ch, { fold: 0.04, folds: 2, tile: 1.2, segsX: 4, segsY: 3 });
      const [hx, hz] = local(rng.range(-w / 2 + 0.2, w / 2 - 0.2), -d / 2 + 0.06);
      q.setFromAxisAngle(yAxis, rot);
      m.compose(p.set(hx, y0 + hgt - 0.12, hz), q, s);
      const dye = SIGN_CLOTH[rng.int(0, SIGN_CLOTH.length - 1)];
      level.push('fabricTarp', cloth, m, dye as never);
      cloth.dispose();
    }
    // Strings of onions and chillies hung off the rail — the silhouette that
    // says souk more than anything else on the stall.
    for (let i = 0; i < rng.int(2, 4); i++) {
      const pr = PRODUCE[rng.int(0, PRODUCE.length - 1)];
      const [hx, hz] = local(rng.range(-w / 2 + 0.2, w / 2 - 0.2), -d / 2 + 0.02);
      const len = rng.range(0.35, 0.6);
      const cord = cyl(0.008, 0.008, len, 4, 0.3);
      place(level, 'fabricSandbag', cord, hx, y0 + hgt - 0.1 - len / 2, hz, 0);
      cord.dispose();
      const bunch = produceHeap(pr.r * 3, pr.r * 3, len * 0.7, 10, pr.r, () => rng.next());
      placeMat(level, pr.key, bunch, hx, y0 + hgt - 0.14 - len, hz, 0, pr.opts);
      bunch.dispose();
    }
    const tray = box('woodCrate', w * 0.7, 0.11, d * 0.4, 1.0);
    place(level, 'woodCrate', tray, x, y0 + 1.02, z, rot);
    tray.dispose();
    const pr = PRODUCE[rng.int(0, PRODUCE.length - 1)];
    const heap = produceHeap(w * 0.66, d * 0.36, 0.05, 22, pr.r, () => rng.next());
    placeMat(level, pr.key, heap, x, y0 + 1.06, z, rot, pr.opts);
    heap.dispose();
  }

  // ---- the trader's nameboard, on the front rail ----
  //
  // Where the stall says what it sells. This replaced a 130 mm price card that
  // was under two pixels tall from anywhere a player stands — at 600 mm on the
  // rail it is actually legible as script, and it puts a band of saturated paint
  // at chest height on the side of the stall the customer walks up to, which is
  // the one part of a stall that faces the street down its whole length.
  if (rng.next() < 0.62) {
    const bw = Math.min(w * 0.62, 0.95);
    const bh = 0.2;
    const paint = CRATE_PAINT[rng.int(0, CRATE_PAINT.length - 1)];
    const [nx2, nz2] = local(rng.range(-w * 0.15, w * 0.15), d * 0.36 + 0.05);
    const board = box('woodCrate', bw, bh, 0.025, 0.8);
    placeMat(level, 'woodCrate', board, nx2, y0 + 0.74, nz2, rot, paint);
    board.dispose();
    const txt = scriptRun(bw - 0.08, bh * 0.6, 0.008, () => rng.next());
    q.setFromAxisAngle(yAxis, rot);
    m.compose(p.set(nx2, y0 + 0.74, nz2), q, s);
    level.push('corrugated', txt, m, LETTER_LIGHT as never);
    txt.dispose();
  }

  // A pan balance on the end of the counter. Small, but it is the object that
  // says this is a place of trade rather than a table with fruit on it.
  if (rng.next() < 0.45) {
    const [bx, bz] = local(rng.range(w / 4, w / 2 - 0.2), -d * 0.1);
    const post = cyl(0.012, 0.016, 0.3, 5, 0.3);
    place(level, 'gunmetal', post, bx, y0 + 1.11, bz, 0);
    post.dispose();
    const beam = box('gunmetal', 0.34, 0.012, 0.012, 0.3);
    place(level, 'gunmetal', beam, bx, y0 + 1.26, bz, rot);
    beam.dispose();
    for (const sd of [-1, 1]) {
      const pan = cyl(0.075, 0.06, 0.016, 8, 0.3);
      const [px2, pz2] = local(bx - x + sd * 0.16, bz - z);
      place(level, 'gunmetal', pan, px2, y0 + 1.18, pz2, 0);
      pan.dispose();
    }
  }

  // Stock in reserve under the counter, and a stool.
  for (let i = 0; i < rng.int(1, 3); i++) {
    const bs = rng.range(0.35, 0.55);
    const [ux, uz] = local(rng.range(-w / 2 + 0.3, w / 2 - 0.3), rng.range(-0.2, 0.2));
    const g = box('woodCrate', bs, bs * 0.8, bs, 1.1);
    place(level, rng.next() < 0.5 ? 'woodCrate' : 'fabricSandbag', g, ux, y0 + bs * 0.4, uz, rng.range(0, 3));
    g.dispose();
  }
  if (rng.next() < 0.5) {
    const [stx, stz] = local(rng.range(-w / 3, w / 3), -d / 2 - 0.45);
    const top = box('wood', 0.34, 0.05, 0.34, 0.8);
    place(level, 'wood', top, stx, y0 + 0.42, stz, rng.range(0, 3));
    top.dispose();
    for (const [lx, lz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
      const leg = box('wood', 0.04, 0.4, 0.04, 0.5);
      place(level, 'wood', leg, stx + lx, y0 + 0.2, stz + lz, 0);
      leg.dispose();
    }
  }
}

/**
 * Goods laid out on the ground the way a souk actually trades.
 *
 * The pavements were the last large flat surface left on the map, and the alley
 * camera looks straight down two of them: its eye is 3.34 m up and the near
 * pavement runs from two metres to eight in front of it, so a 4.2 m wide unbroken
 * concrete plane took a fifth of that frame. Kerbs, flag joints and drift all
 * helped and none of it fixed the problem, because the problem is not that the
 * surface lacks detail — it is that in a market the surface is not visible. A
 * trader with no stall lays a mat down and builds his stock on it, and that is
 * both the correct fix and the cheapest: mats, heaps, baskets and bundles are
 * knee-high, so they fill the plane with objects that have tops and shadows
 * without closing a single sightline or blocking the pavement to walk down.
 *
 * Concentrated under the shade bays, which is where a trader would set up, and
 * pushed to the back half of the pavement so the kerb edge stays walkable.
 */
function buildPavementGoods(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const zAx = new THREE.Vector3(0, 0, 1);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 26; i++) {
      const z = -50 + i * 4.1 + rng.range(-1.2, 1.2);
      if (Math.abs(z - CROSS_Z) < CROSS_HALF + 1.5) continue;
      if (rng.next() < 0.26) continue;
      // Against the shopfronts, or tucked in at the foot of the canopy's back
      // post line — the two places on a footway a pitch can go without standing
      // in the way. The middle of the pavement is the route down it.
      const atWall = rng.next() < 0.45;
      const x = side * (atWall
        ? rng.range(FRONT_X - 1.9, FRONT_X - 0.9)
        : rng.range(ROAD_HALF + 3.7, ROAD_HALF + 4.25));
      if (!occ.claim(x, z, 1.1)) continue;
      const y0 = 0.16;
      // Squared up to the street rather than spun freely: a mat laid at
      // forty-five degrees across a 4 m footway is a mat nobody could get past,
      // and the random headings were most of why this run read as spillage.
      const rot = (side > 0 ? Math.PI : 0) + rng.range(-0.3, 0.3);
      const c = Math.cos(rot);
      const sn = Math.sin(rot);

      // The mat, with a rolled edge so it is not a painted rectangle.
      const mw = rng.range(1.1, 1.9);
      const md = rng.range(0.8, 1.3);
      const mat = box(rng.next() < 0.5 ? 'fabricSandbag' : 'fabricTarp', mw, 0.03, md, 1.2);
      place(level, rng.next() < 0.5 ? 'fabricSandbag' : 'fabricTarp', mat, x, y0 + 0.015, z, rot);
      mat.dispose();
      for (const sd of [-1, 1]) {
        const roll = cyl(0.045, 0.045, mw * 0.96, 5, 0.5);
        q.setFromAxisAngle(yAxis, rot);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(zAx, Math.PI / 2));
        p.set(x - sd * (md / 2) * sn, y0 + 0.04, z + sd * (md / 2) * c);
        m.compose(p, q, s);
        level.push('fabricSandbag', roll, m);
        roll.dispose();
      }

      // Stock. Deliberately a mix of forms — a heap, a basket, a bundle — because
      // the thing that makes a market read is that no two pitches sell the same
      // shape of thing.
      const pitches = rng.int(3, 6);
      for (let k = 0; k < pitches; k++) {
        const lu = rng.range(-mw / 2 + 0.2, mw / 2 - 0.2);
        const lv = rng.range(-md / 2 + 0.18, md / 2 - 0.18);
        const px = x + lu * c - lv * sn;
        const pz = z + lu * sn + lv * c;
        const kind = rng.next();
        if (kind < 0.36) {
          // Conical heap of grain or dates, which is how it is sold.
          const hr = rng.range(0.16, 0.3);
          const cone = cyl(0.02, hr, hr * rng.range(1.0, 1.5), 8, 0.7);
          m.makeTranslation(px, y0 + 0.03 + (hr * 1.2) / 2, pz);
          level.push(rng.next() < 0.5 ? 'paintedMetalTan' : 'woodCrate', cone, m);
          cone.dispose();
        } else if (kind < 0.62) {
          // Shallow basket, with the goods mounded over the rim.
          const br = rng.range(0.17, 0.28);
          const bowl = cyl(br, br * 0.72, 0.16, 9, 0.6);
          m.makeTranslation(px, y0 + 0.11, pz);
          level.push('woodCrate', bowl, m);
          bowl.dispose();
          const mound = bagGeometry(br * 0.95, 0.07, br * 0.95);
          m.makeTranslation(px, y0 + 0.2, pz);
          level.push(rng.next() < 0.5 ? 'paintedMetalRed' : 'paintedMetalTan', mound, m);
          mound.dispose();
        } else if (kind < 0.82) {
          // Sack, open, with its neck rolled down.
          const sr = rng.range(0.16, 0.24);
          const sack = bagGeometry(sr, rng.range(0.2, 0.3), sr * 0.9);
          place(level, 'fabricSandbag', sack, px, y0 + 0.26, pz, rng.range(0, 3));
          sack.dispose();
          const neck = ring(sr * 0.8, 0.045, 8, 5, 0.4);
          m.makeRotationX(Math.PI / 2).setPosition(px, y0 + 0.46, pz);
          level.push('fabricSandbag', neck, m);
          neck.dispose();
        } else {
          // Bundle of stalks or cane, tied, laid on its side.
          const bl = rng.range(0.6, 1.0);
          for (let b = 0; b < 4; b++) {
            const stick = cyl(0.035, 0.035, bl, 4, 0.5);
            q.setFromAxisAngle(yAxis, rot + rng.range(-0.12, 0.12));
            q.multiply(new THREE.Quaternion().setFromAxisAngle(zAx, Math.PI / 2));
            p.set(
              px + (b % 2) * 0.07 - 0.035,
              y0 + 0.06 + Math.floor(b / 2) * 0.065,
              pz + (b % 2) * 0.05,
            );
            m.compose(p, q, s);
            level.push('wood', stick, m);
            stick.dispose();
          }
        }
      }

      // The trader's own stool and scales, which is what turns a pile of stock
      // into somebody's pitch.
      if (rng.next() < 0.6) {
        const stool = box('wood', 0.26, 0.3, 0.26, 0.7);
        place(level, 'wood', stool, x + (mw / 2 + 0.3) * c, y0 + 0.15, z + (mw / 2 + 0.3) * sn, rot);
        stool.dispose();
      }
      if (rng.next() < 0.35) {
        const post = cyl(0.02, 0.02, 0.55, 5, 0.4);
        const bx = x - (mw / 2 + 0.2) * c;
        const bz = z - (mw / 2 + 0.2) * sn;
        m.makeTranslation(bx, y0 + 0.28, bz);
        level.push('gunmetal', post, m);
        post.dispose();
        const beam = box('gunmetal', 0.42, 0.02, 0.02, 0.3);
        place(level, 'gunmetal', beam, bx, y0 + 0.56, bz, rot);
        beam.dispose();
        for (const sd of [-1, 1]) {
          const pan = cyl(0.11, 0.09, 0.03, 8, 0.4);
          m.makeTranslation(bx + sd * 0.19 * c, y0 + 0.46, bz + sd * 0.19 * sn);
          level.push('gunmetal', pan, m);
          pan.dispose();
        }
      }
    }
  }
}

/** Produce and stock spilling out of the shopfronts onto the pavement. */
function buildProduceFronts(level: LevelSystem, rng: RNG): void {
  for (const side of [-1, 1]) {
    for (let i = 0; i < 22; i++) {
      const z = -52 + i * 5 + rng.range(-1.5, 1.5);
      if (Math.abs(z - 45) < 3.5) continue;
      if (rng.next() < 0.45) continue;
      const x = side * rng.range(11.0, 13.4);
      const y0 = streetY(x, z);
      const kind = rng.next();
      if (kind < 0.4) {
        // Stacked shallow crates.
        const cols = rng.int(1, 3);
        for (let c = 0; c < cols; c++) {
          const rows = rng.int(2, 4);
          for (let r = 0; r < rows; r++) {
            const cw = rng.range(0.5, 0.72);
            const g = box('woodCrate', cw, 0.22, cw * 0.7, 1.0);
            place(level, 'woodCrate', g, x + rng.range(-0.1, 0.1), y0 + 0.11 + r * 0.23,
              z + c * 0.8 + rng.range(-0.08, 0.08), rng.range(-0.2, 0.2));
            g.dispose();
          }
        }
      } else if (kind < 0.68) {
        // Sacks slumped against the wall.
        const bag = bagGeometry(0.34, 0.3, 0.28);
        for (let b = 0; b < rng.int(2, 5); b++) {
          place(level, 'fabricSandbag', bag, x + rng.range(-0.25, 0.25), y0 + 0.3,
            z + b * 0.6 + rng.range(-0.15, 0.15), rng.range(0, 3));
        }
        bag.dispose();
      } else if (kind < 0.84) {
        // Rolled carpets and matting stood on end.
        for (let r = 0; r < rng.int(2, 4); r++) {
          const rh = rng.range(1.3, 1.9);
          const roll = cyl(rng.range(0.09, 0.15), rng.range(0.09, 0.15), rh, 7, 1.2);
          q.setFromAxisAngle(zAxis, rng.range(-0.16, 0.16) * side);
          m.compose(p.set(x + rng.range(-0.15, 0.15), y0 + rh / 2, z + r * 0.28), q, s);
          level.push('fabricTarp', roll, m);
          roll.dispose();
        }
      } else {
        // Jerrycans and a water butt.
        for (let c = 0; c < rng.int(2, 5); c++) {
          const g = box('polymerTan', 0.24, 0.36, 0.16, 0.6);
          place(level, rng.next() < 0.5 ? 'paintedMetalGreen' : 'paintedMetalTan', g,
            x + rng.range(-0.2, 0.2), y0 + 0.18, z + c * 0.3, rng.range(0, 3));
          g.dispose();
        }
      }
    }
  }
}

// ------------------------------------------------------------- vehicles ----

function buildVehicles(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const spots: Array<[number, number, number, number]> = [
    [-4.5, -8, 0.2, 0],
    [5.2, 20, 3.0, 1],
    [-30, -34, 1.2, 0],
    [33, 36, 2.1, 1],
    [-3.4, 36, 0.28, 0],
    [4.4, 52, 2.9, 1],
    [-38, 30, 0.5, 0],
    // Across the carriageway opposite the alley camera. That view looks east
    // over 15 m of road from a first-floor eye height, and with nothing standing
    // on it the middle fifth of the frame was one flat plane of tarmac — the
    // "empty street" defect, seen from the one place on the map where the road
    // fills the frame. A vehicle is the most efficient fix available: it is 2 m
    // tall and 5 m long, so it reads at that range, its silhouette is the least
    // box-like thing in the library, and abandoned across a lane it explains why
    // the market moved onto the pavements.
    [1.6, 9.5, 1.42, 1],
    [-3.2, 16.0, 0.62, 0],
  ];

  for (const [x, z, rot, kind] of spots) {
    occ.force(x, z, kind === 0 ? 2.6 : 3.2);
    if (kind === 0) buildBurntCar(level, x, z, rot, rng);
    else buildTruck(level, x, z, rot, rng);
  }
}

/**
 * A road wheel: tyre, sidewall shoulder, dished rim, hub and nuts.
 *
 * A bare torus in `polymerBlack` is a black ring with a highlight on it, which
 * off a bicycle or a handcart is the "floating dark torus" three reviews have
 * picked out of the frame. What makes a wheel read is the *disc* in the middle
 * of the hoop and the fact that the hoop has a tread band with square shoulders.
 * `RUBBER` lifts it out of the pure black that gives it no shading at all.
 */
function roadWheel(
  level: LevelSystem,
  wx: number,
  wy: number,
  wz: number,
  axisYaw: number,
  r: number,
  width: number,
  opts: { flat?: boolean; rimOnly?: boolean; spokes?: number } = {},
): void {
  const flat = opts.flat ?? false;
  const squash = flat ? 0.78 : 1;
  q.setFromAxisAngle(yAxis, axisYaw);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI / 2));
  const wheelS = new THREE.Vector3(1, 1, squash);

  if (!opts.rimOnly) {
    // Tread band, then a shoulder each side so the tyre is not one cylinder.
    const tread = cyl(r, r, width, 12, 0.55);
    m.compose(p.set(wx, wy, wz), q, wheelS);
    level.push('polymerBlack', tread, m, RUBBER);
    tread.dispose();
    for (const sd of [-1, 1]) {
      const wall = cyl(r * 0.93, r * 0.72, width * 0.22, 12, 0.5);
      m.compose(
        p.set(wx + Math.cos(axisYaw) * sd * width * 0.58, wy, wz + Math.sin(axisYaw) * sd * width * 0.58),
        q, wheelS,
      );
      level.push('polymerBlack', wall, m, RUBBER);
      wall.dispose();
    }
  }
  // Rim disc, inset, plus a hub cap and studs. This is what stops the wheel
  // reading as a hoop with a hole in it.
  const rimR = opts.rimOnly ? r * 0.92 : r * 0.66;
  const disc = cyl(rimR, rimR, width * 0.5, 10, 0.5);
  m.compose(p.set(wx, wy, wz), q, wheelS);
  level.push('gunmetal', disc, m);
  disc.dispose();
  for (const sd of [-1, 1]) {
    const cap = cyl(rimR * 0.42, rimR * 0.5, width * 0.16, 8, 0.4);
    m.compose(
      p.set(wx + Math.cos(axisYaw) * sd * width * 0.3, wy, wz + Math.sin(axisYaw) * sd * width * 0.3),
      q, wheelS,
    );
    level.push('gunmetal', cap, m);
    cap.dispose();
  }
}

/**
 * Weathered rubber. Pure `polymerBlack` has so little albedo that a tyre
 * against a shaded road is a hole in the image with a specular rim, which is
 * exactly how the handcart wheel came back from review as "a black torus
 * floating in mid-air".
 */
/**
 * Tyre rubber, lifted well clear of black and pulled warm.
 *
 * The review's "3.6 %-luminance black lump on the floor with no albedo, no
 * texture and no form-reading shading — a hole in the world" is a stack of these
 * indoors, and at 2.6x over `polymerBlack` it was still that. Perished rubber
 * that has stood in this sun is a warm charcoal, not a black, and the point of
 * the lift is not accuracy: it is that a surface with no shading gradient across
 * it cannot describe its own shape, and an object that cannot describe its shape
 * is read as a gap in the geometry.
 */
const RUBBER = { variant: 'rubber', material: { color: new THREE.Color(4.4, 4.2, 4.0), roughness: 0.9 } };

/** Dusty, sun-bleached body colours. Nothing in a desert town is pillar-box red. */
const CAR_PAINT: Array<{ key: MaterialKey; opts: { variant: string; material: Record<string, unknown> } }> = [
  { key: 'paintedMetalTan', opts: { variant: 'carSand', material: { color: new THREE.Color(1.25, 1.18, 1.0), roughness: 0.68 } } },
  { key: 'paintedMetalGreen', opts: { variant: 'carOlive', material: { color: new THREE.Color(0.92, 0.98, 0.86), roughness: 0.7 } } },
  { key: 'paintedMetalRed', opts: { variant: 'carOxide', material: { color: new THREE.Color(0.74, 0.6, 0.55), roughness: 0.74 } } },
  { key: 'paintedMetalTan', opts: { variant: 'carWhite', material: { color: new THREE.Color(1.5, 1.5, 1.5), roughness: 0.62 } } },
];

/**
 * A saloon that has been sitting in the street since the fighting.
 *
 * Built from the outside in: the thing that makes a car legible at twenty
 * metres is the *greenhouse* — the glass box on top of the body, set in from
 * the body sides, with a windscreen raked one way and a backlight the other —
 * and the wheel arches, which are the only curves on it. Three stacked boxes
 * have neither, which is why the review called it a blockout.
 */
function buildBurntCar(level: LevelSystem, x: number, z: number, rot: number, rng: RNG): void {
  const y0 = streetY(x, z);
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  /** Body-local (right, up, forward) to world. */
  const at = (ox: number, oz: number): [number, number] => [x + ox * c - oz * sn, z + ox * sn + oz * c];
  const paint = CAR_PAINT[rng.int(0, CAR_PAINT.length - 1)];
  const put = (
    key: MaterialKey, w: number, h: number, d: number, ox: number, oy: number, oz: number,
    spin = 0, opts?: { variant: string; material: Record<string, unknown> },
  ): void => {
    const g = box(key, w, h, d, 1.8);
    const [px, pz] = at(ox, oz);
    if (spin !== 0) {
      q.setFromAxisAngle(yAxis, rot);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, spin));
      m.compose(p.set(px, y0 + oy, pz), q, s);
      level.push(key, g, m, opts as never);
    } else {
      q.setFromAxisAngle(yAxis, rot);
      m.compose(p.set(px, y0 + oy, pz), q, s);
      level.push(key, g, m, opts as never);
    }
    g.dispose();
  };
  const body = (w: number, h: number, d: number, ox: number, oy: number, oz: number, spin = 0): void =>
    put(paint.key, w, h, d, ox, oy, oz, spin, paint.opts);

  // ---- lower body: sill, floor pan, and the tub between the arches ----
  body(1.66, 0.34, 4.02, 0, 0.50, 0);
  body(1.74, 0.16, 2.5, 0, 0.40, 0);
  // Bonnet and boot, both falling away from the screen line.
  body(1.6, 0.14, 1.34, 0, 0.79, 1.32, -0.05);
  body(1.58, 0.14, 0.98, 0, 0.80, -1.55, 0.05);
  // Front and rear wings, standing proud of the sill so the flank has a crease.
  for (const sx of [-1, 1]) {
    body(0.16, 0.42, 3.5, sx * 0.79, 0.66, 0);
    // Wheel arch: four short chords round the top of the wheel, which is the
    // cheapest curve that still reads as one.
    for (const oz of [1.34, -1.34]) {
      for (const [aa, ar] of [[-0.9, 0.44], [-0.32, 0.5], [0.32, 0.5], [0.9, 0.44]] as Array<[number, number]>) {
        const g = box(paint.key, 0.2, 0.1, 0.3, 0.9);
        const [px, pz] = at(sx * 0.84, oz + Math.sin(aa) * ar);
        q.setFromAxisAngle(yAxis, rot);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, -aa));
        m.compose(p.set(px, y0 + 0.36 + Math.cos(aa) * ar, pz), q, s);
        level.push(paint.key, g, m, paint.opts as never);
        g.dispose();
      }
    }
  }
  // ---- greenhouse: set in from the body sides, glazed, with real pillars ----
  const roofY = 1.42;
  body(1.34, 0.09, 1.72, 0, roofY, -0.18);
  // A-pillars raked forward, C-pillars raked back.
  for (const sx of [-1, 1]) {
    put(paint.key, 0.09, 0.66, 0.12, sx * 0.62, 1.1, 0.66, -0.5, paint.opts);
    put(paint.key, 0.09, 0.62, 0.14, sx * 0.62, 1.11, -1.0, 0.42, paint.opts);
    // B-pillar and the door shut lines either side of it.
    put(paint.key, 0.07, 0.6, 0.07, sx * 0.66, 1.1, -0.16, 0, paint.opts);
    for (const oz of [0.52, -0.78]) put('gunmetal', 0.03, 0.5, 0.03, sx * 0.85, 0.66, oz);
    // Door handles and a mirror.
    put('gunmetal', 0.05, 0.05, 0.2, sx * 0.87, 0.82, 0.16);
    put('gunmetal', 0.06, 0.13, 0.16, sx * 0.9, 1.06, 0.72);
  }
  // Glass: windscreen, backlight and side lights, all inboard of the pillars.
  const glass = (w: number, h: number, d: number, ox: number, oy: number, oz: number, spin: number): void => {
    const g = box('tile', w, h, d, 1.6);
    const [px, pz] = at(ox, oz);
    q.setFromAxisAngle(yAxis, rot);
    if (spin !== 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, spin));
    m.compose(p.set(px, y0 + oy, pz), q, s);
    level.push('tile', g, m, CAR_GLASS);
    g.dispose();
  };
  const smashed = rng.next() < 0.45;
  if (!smashed) glass(1.28, 0.6, 0.05, 0, 1.12, 0.7, -0.5);
  glass(1.22, 0.56, 0.05, 0, 1.13, -1.02, 0.42);
  for (const sx of [-1, 1]) glass(0.05, 0.46, 1.5, sx * 0.6, 1.13, -0.2, 0);

  // ---- ends: bumpers, grille, lamps ----
  for (const [oz, sgn] of [[2.05, 1], [-2.08, -1]] as Array<[number, number]>) {
    put('gunmetal', 1.62, 0.17, 0.13, 0, 0.44, oz);
    put('gunmetal', 1.3, 0.22, 0.07, 0, 0.68, oz - sgn * 0.04);
    for (const sx of [-1, 1]) {
      put(sgn > 0 ? 'tile' : 'paintedMetalRed', 0.3, 0.16, 0.07, sx * 0.6, 0.7, oz - sgn * 0.03,
        0, sgn > 0 ? CAR_GLASS : undefined);
    }
  }
  // Number plate and an exhaust stub.
  put('gunmetal', 0.4, 0.11, 0.03, 0, 0.55, -2.13);
  put('gunmetal', 0.06, 0.06, 0.3, 0.5, 0.34, -2.05);

  // ---- damage: this car did not park itself here ----
  if (rng.next() < 0.6) {
    // Bonnet up, engine bay open.
    put(paint.key, 1.5, 0.1, 1.2, 0, 1.16, 1.44, -0.85, paint.opts);
    put('gunmetal', 1.2, 0.42, 0.8, 0, 0.82, 1.3);
  }
  for (let i = 0; i < rng.int(2, 5); i++) {
    const g = box('rubble', rng.range(0.1, 0.3), 0.03, rng.range(0.1, 0.3), 0.5);
    place(level, 'tile', g, x + rng.range(-1.6, 1.6), y0 + 0.02, z + rng.range(-2.4, 2.4), rng.range(0, 3));
    g.dispose();
  }

  // ---- wheels, one usually flat ----
  for (const [wx, wz] of [[-0.82, 1.34], [0.82, 1.34], [-0.82, -1.34], [0.82, -1.34]]) {
    const [px, pz] = at(wx, wz);
    const state = rng.next();
    const flat = state < 0.3;
    const gone = state > 0.88;
    roadWheel(level, px, y0 + (gone ? 0.2 : flat ? 0.26 : 0.32), pz, rot, gone ? 0.2 : 0.32, 0.22,
      { flat, rimOnly: gone });
  }
}

/**
 * Dirty, near-opaque automotive glass — the same batch the buildings glaze with.
 *
 * A vehicle's glass and a window's glass are the same thing, and a separate
 * variant for it bought a second batch and a draw call per shadow cascade for a
 * difference nothing in the frame can see. Spelled out rather than imported from
 * `Building` — the override set is hashed with its keys sorted, so identical
 * values land in the same batch, and importing it the other way round would
 * close a cycle through `Level`.
 */
const CAR_GLASS = {
  variant: 'glass',
  material: { roughness: 0.075, metalness: 0.0, color: 0x181e25, normalScale: 0.3 },
};

/**
 * A dropside lorry: chassis, cab, and a timber body on the back.
 *
 * The old one was a 2.3 x 1.9 x 3.4 m box of `corrugated` sitting on four
 * cylinders. Seen from across the street the box was the only part with any
 * area, and because the wheels underneath it are near-black and the chassis was
 * not modelled at all, what it read as was a grey rectangle hanging a metre
 * above the road — which is what the alley review reported as a stray floating
 * quad. The fix is not more detail on the box, it is a *chassis*: rails, axles
 * and a visible gap under the bed, so the mass is carried on something.
 */
function buildTruck(level: LevelSystem, x: number, z: number, rot: number, rng: RNG): void {
  const y0 = streetY(x, z);
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const at = (ox: number, oz: number): [number, number] => [x + ox * c - oz * sn, z + ox * sn + oz * c];
  const put = (
    key: MaterialKey, w: number, h: number, d: number, ox: number, oy: number, oz: number,
    spin = 0, opts?: { variant: string; material: Record<string, unknown> },
  ): void => {
    const g = box(key, w, h, d, 2.0);
    const [px, pz] = at(ox, oz);
    q.setFromAxisAngle(yAxis, rot);
    if (spin !== 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, spin));
    m.compose(p.set(px, y0 + oy, pz), q, s);
    level.push(key, g, m, opts as never);
    g.dispose();
  };
  const paint = CAR_PAINT[rng.int(0, 1)];
  const cab = (w: number, h: number, d: number, ox: number, oy: number, oz: number, spin = 0): void =>
    put(paint.key, w, h, d, ox, oy, oz, spin, paint.opts);

  // ---- chassis: two rails on the axles, everything else sits on them ----
  for (const sx of [-1, 1]) put('gunmetal', 0.11, 0.22, 5.5, sx * 0.72, 0.66, 0);
  for (const oz of [1.7, -1.4]) {
    put('gunmetal', 1.9, 0.15, 0.17, 0, 0.48, oz);
    put('gunmetal', 0.4, 0.4, 0.4, 0, 0.48, oz);
  }
  // Leaf springs, which are what a lorry's stance is read from.
  for (const sx of [-1, 1]) {
    for (const oz of [1.7, -1.4]) put('gunmetal', 0.09, 0.07, 1.1, sx * 0.74, 0.55, oz);
  }
  put('gunmetal', 0.13, 0.13, 2.6, 0.1, 0.42, 0.2);

  // ---- cab ----
  cab(2.06, 0.72, 1.9, 0, 1.12, 2.0);
  cab(1.98, 0.78, 1.62, 0, 1.86, 1.86);
  cab(2.04, 0.1, 1.74, 0, 2.28, 1.9);
  // Bonnet, wings and grille out in front of the screen.
  cab(1.72, 0.5, 0.95, 0, 1.28, 3.2);
  put('gunmetal', 1.3, 0.62, 0.12, 0, 1.24, 3.66);
  for (const sx of [-1, 1]) {
    cab(0.2, 0.5, 1.0, sx * 0.86, 1.3, 3.15);
    put('tile', 0.3, 0.24, 0.1, sx * 0.62, 1.32, 3.66, 0, CAR_GLASS);
    // Mirror on an arm, and a step under the door.
    put('gunmetal', 0.4, 0.04, 0.04, sx * 1.2, 2.0, 2.7);
    put('gunmetal', 0.05, 0.3, 0.14, sx * 1.36, 1.9, 2.72);
    put('gunmetal', 0.34, 0.05, 0.5, sx * 1.02, 0.62, 2.1);
    put('gunmetal', 0.03, 0.56, 0.03, sx * 0.98, 1.86, 2.62);
    // The door itself. Everything above was on the front and the roof, and the
    // side — which is the elevation you actually stand next to — was two stacked
    // boxes with nothing on them: a two-metre flat panel with a rust decal, and
    // the review read the whole vehicle as a blockout largely off this face. A
    // dropped window, a shut line, a handle and a rocker are four boxes and they
    // are the entire difference between a cab and a crate.
    put('tile', 0.06, 0.42, 0.8, sx * 1.0, 1.97, 2.0, 0, CAR_GLASS);
    put('gunmetal', 0.03, 0.7, 0.022, sx * 1.045, 1.72, 1.35);
    put('gunmetal', 0.05, 0.045, 0.15, sx * 1.06, 1.56, 2.36);
    cab(0.07, 0.13, 1.66, sx * 1.05, 0.86, 1.98);
    cab(0.34, 0.09, 1.06, sx * 0.94, 1.0, 1.72);
  }
  put('tile', 1.66, 0.6, 0.09, 0, 1.9, 2.66, -0.14, CAR_GLASS);
  put('gunmetal', 1.9, 0.16, 0.14, 0, 0.74, 3.78);
  // Exhaust stack up the back of the cab.
  {
    const stack = cyl(0.055, 0.065, 2.0, 6, 0.6);
    const [sxp, szp] = at(0.98, 1.05);
    m.makeTranslation(sxp, y0 + 1.9, szp);
    level.push('gunmetal', stack, m);
    stack.dispose();
  }

  // ---- timber dropside body, sat on the rails with daylight under it ----
  const bedY = 0.92;
  put('wood', 2.2, 0.11, 3.5, 0, bedY, -1.1);
  for (const sx of [-1, 1]) {
    // Dropside: three boards with a gap between each, on stakes.
    for (let i = 0; i < 3; i++) {
      put('wood', 0.07, 0.21, 3.44, sx * 1.06, bedY + 0.2 + i * 0.25, -1.1);
    }
    for (const oz of [0.45, -1.1, -2.7]) put('wood', 0.1, 0.86, 0.11, sx * 1.1, bedY + 0.45, oz);
  }
  // Headboard and tailgate.
  put('wood', 2.2, 0.9, 0.09, 0, bedY + 0.47, 0.6);
  if (rng.next() < 0.5) {
    put('wood', 2.16, 0.72, 0.08, 0, bedY - 0.3, -2.9, 1.2);
  } else {
    put('wood', 2.16, 0.66, 0.08, 0, bedY + 0.35, -2.84);
  }
  // Hoops and a tarp over about half of them: an open bay at the back is what
  // gives the load volume rather than a lid.
  if (rng.next() < 0.65) {
    for (let i = 0; i < 4; i++) {
      const oz = 0.3 - i * 0.95;
      for (const sx of [-1, 1]) put('gunmetal', 0.05, 0.7, 0.05, sx * 1.02, bedY + 1.2, oz);
      put('gunmetal', 2.05, 0.05, 0.05, 0, bedY + 1.55, oz);
    }
    const tarp = clothPanel(2.3, 2.2, { fold: 0.11, folds: 4, hem: 0.16, tile: 2.4, segsX: 8, segsY: 5 });
    q.setFromAxisAngle(xAxis, Math.PI / 2 - 0.1);
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(yAxis, rot));
    const [tx, tz] = at(0, 0.5);
    m.compose(p.set(tx, y0 + bedY + 1.6, tz), q, s);
    level.push('fabricTarp', tarp, m);
    tarp.dispose();
    // The loose end, hanging down the side.
    const flap = clothPanel(1.9, 1.0, { fold: 0.09, folds: 3, hem: 0.2, tile: 2.0, segsX: 6, segsY: 4 });
    const [fx, fz] = at(1.06, -1.4);
    q.setFromAxisAngle(yAxis, rot + Math.PI / 2);
    m.compose(p.set(fx, y0 + bedY + 1.5, fz), q, s);
    level.push('fabricTarp', flap, m);
    flap.dispose();
  }
  // Load: sacks and drums showing over the sides.
  {
    const sack = bagGeometry(0.36, 0.22, 0.3);
    for (let i = 0; i < rng.int(3, 6); i++) {
      const [lx, lz] = at(rng.range(-0.8, 0.8), rng.range(-2.4, 0.2));
      place(level, 'fabricSandbag', sack, lx, y0 + bedY + 0.2, lz, rng.range(0, 3));
    }
    sack.dispose();
  }

  // ---- wheels: twinned on the back axle, which is the lorry read ----
  for (const [wx, wz, twin] of [[-1.0, 1.7, 0], [1.0, 1.7, 0], [-0.98, -1.4, 1], [0.98, -1.4, 1]] as Array<
    [number, number, number]
  >) {
    const [px, pz] = at(wx, wz);
    roadWheel(level, px, y0 + 0.48, pz, rot, 0.48, 0.28);
    if (twin) {
      const [tx2, tz2] = at(wx * 0.78, wz);
      roadWheel(level, tx2, y0 + 0.48, tz2, rot, 0.48, 0.26);
    }
  }
}

// -------------------------------------------------------------- handcart ---

/** Two-wheeled barrow, the workhorse of every market street. */
function buildHandcarts(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const spots: Array<[number, number, number]> = [
    [-6.4, 30, 0.3], [6.6, 5, 2.9], [-6.2, -2, 1.5], [6.4, 38, 0.1],
    [-10.2, 20, 1.2], [3.0, 47, 2.0], [-9.9, -30, 0.6],
  ];
  for (const [x, z, rot] of spots) {
    if (!occ.claim(x, z, 1.9)) continue;
    const y0 = streetY(x, z);
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    const bed = box('wood', 1.15, 0.07, 1.85, 1.6);
    place(level, 'wood', bed, x, y0 + 0.62, z, rot);
    bed.dispose();
    for (const sx of [-1, 1]) {
      const side = box('wood', 0.06, 0.3, 1.85, 1.4);
      place(level, 'wood', side, x + sx * 0.56 * c, y0 + 0.78, z + sx * 0.56 * sn, rot);
      side.dispose();
    }
    const tail = box('wood', 1.15, 0.3, 0.06, 1.4);
    place(level, 'wood', tail, x + 0.92 * sn, y0 + 0.78, z - 0.92 * c, rot);
    tail.dispose();
    // Handles and prop leg.
    for (const sx of [-1, 1]) {
      const h = cyl(0.032, 0.032, 1.5, 5, 0.5);
      q.setFromAxisAngle(yAxis, rot);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, Math.PI / 2 - 0.16));
      m.compose(p.set(x + sx * 0.5 * c - 1.5 * sn, y0 + 0.75, z + sx * 0.5 * sn + 1.5 * c), q, s);
      level.push('wood', h, m);
      h.dispose();
    }
    const leg = cyl(0.03, 0.03, 0.62, 5, 0.5);
    m.makeTranslation(x - 1.0 * sn, y0 + 0.31, z + 1.0 * c);
    level.push('wood', leg, m);
    leg.dispose();
    // Wheels: a spoked cartwheel, not a bare hoop. A torus alone at this size
    // is a dark ring with nothing inside it, and against a shaded road that is
    // an object with no support — the "black torus" of the alley review.
    for (const sx of [-1, 1]) {
      const wx2 = x + sx * 0.62 * c;
      const wz2 = z + sx * 0.62 * sn;
      const tyre = ring(0.34, 0.05, 14, 5, 0.5);
      q.setFromAxisAngle(yAxis, rot + Math.PI / 2);
      m.compose(p.set(wx2, y0 + 0.36, wz2), q, s);
      level.push('polymerBlack', tyre, m, RUBBER);
      tyre.dispose();
      const felloe = cyl(0.3, 0.3, 0.045, 12, 0.5);
      q.setFromAxisAngle(yAxis, rot);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI / 2));
      m.compose(p.set(wx2, y0 + 0.36, wz2), q, s);
      level.push('wood', felloe, m);
      felloe.dispose();
      for (let sp = 0; sp < 6; sp++) {
        const a = (sp / 6) * Math.PI;
        const spoke = box('wood', 0.026, 0.58, 0.03, 0.4);
        q.setFromAxisAngle(yAxis, rot);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, a));
        m.compose(p.set(wx2, y0 + 0.36, wz2), q, s);
        level.push('wood', spoke, m);
        spoke.dispose();
      }
      const hub = cyl(0.055, 0.055, 0.17, 6, 0.4);
      q.setFromAxisAngle(yAxis, rot);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI / 2));
      m.compose(p.set(wx2, y0 + 0.36, wz2), q, s);
      level.push('gunmetal', hub, m);
      hub.dispose();
    }
    // Load.
    for (let i = 0; i < rng.int(2, 5); i++) {
      const bs = rng.range(0.3, 0.48);
      const g = box('woodCrate', bs, bs * 0.75, bs, 1.0);
      place(level, rng.next() < 0.6 ? 'woodCrate' : 'fabricSandbag', g,
        x + rng.range(-0.35, 0.35), y0 + 0.66 + bs * 0.38, z + rng.range(-0.7, 0.7), rng.range(0, 3));
      g.dispose();
    }
  }
}

/** Bicycles leaning on walls; small, but instantly legible as habitation. */
function buildBicycles(level: LevelSystem, rng: RNG): void {
  const spots: Array<[number, number, number]> = [
    [-13.4, 4, 0], [13.4, 26, Math.PI], [-13.4, 28, 0], [13.4, -20, Math.PI],
    [-13.4, 48, 0], [10.6, 12, Math.PI * 0.5],
  ];
  for (const [x, z, rot] of spots) {
    const y0 = streetY(x, z);
    const lean = 0.22;
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    const tyre = ring(0.33, 0.028, 16, 5, 0.4);
    const rim = ring(0.29, 0.016, 14, 4, 0.4);
    for (const oz of [-0.52, 0.52]) {
      const wx2 = x - oz * sn + 0.1 * c;
      const wz2 = z + oz * c + 0.1 * sn;
      q.setFromAxisAngle(yAxis, rot + Math.PI / 2);
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(zAxis, lean * (rot === 0 ? 1 : -1)));
      m.compose(p.set(wx2, y0 + 0.34, wz2), q, s);
      level.push('polymerBlack', tyre, m, RUBBER);
      level.push('gunmetal', rim, m);
      // A dozen spokes and a hub: without them the wheel is a hoop, and a hoop
      // seen at range against shade is a torus floating in mid-air.
      for (let sp = 0; sp < 6; sp++) {
        const a = (sp / 6) * Math.PI;
        const spoke = box('gunmetal', 0.008, 0.58, 0.008, 0.3);
        q.setFromAxisAngle(yAxis, rot);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, a));
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(zAxis, lean * (rot === 0 ? 1 : -1)));
        m.compose(p.set(wx2, y0 + 0.34, wz2), q, s);
        level.push('gunmetal', spoke, m);
        spoke.dispose();
      }
      const hub = cyl(0.03, 0.03, 0.1, 6, 0.3);
      q.setFromAxisAngle(yAxis, rot);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI / 2));
      m.compose(p.set(wx2, y0 + 0.34, wz2), q, s);
      level.push('gunmetal', hub, m);
      hub.dispose();
    }
    tyre.dispose();
    rim.dispose();
    // Frame: down tube, seat tube, top tube, forks.
    const bars: Array<[number, number, number, number, number]> = [
      [0.0, 0.55, 0.0, 1.0, 0.5],
      [-0.28, 0.42, 0.36, 0.8, 1.1],
      [0.3, 0.5, 0.35, 0.75, -1.0],
    ];
    for (const [ox, oy, oz, len, tilt] of bars) {
      const bar = cyl(0.022, 0.022, len, 5, 0.4);
      q.setFromAxisAngle(yAxis, rot);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, tilt));
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(zAxis, lean * (rot === 0 ? 1 : -1)));
      m.compose(p.set(x + ox * c - oz * sn, y0 + oy, z + ox * sn + oz * c), q, s);
      level.push('gunmetal', bar, m);
      bar.dispose();
    }
    const seat = box('polymerBlack', 0.1, 0.05, 0.24, 0.3);
    place(level, 'polymerBlack', seat, x - 0.38 * sn, y0 + 0.86, z + 0.38 * c, rot);
    seat.dispose();
    const handle = cyl(0.018, 0.018, 0.46, 5, 0.3);
    q.setFromAxisAngle(yAxis, rot + Math.PI / 2);
    m.compose(p.set(x + 0.42 * sn, y0 + 0.94, z - 0.42 * c), q, s);
    level.push('gunmetal', handle, m);
    handle.dispose();
    void rng;
  }
}

/** Tyre stacks: cheap, reads instantly, and doubles as low cover. */
function buildTyres(level: LevelSystem, rng: RNG): void {
  const spots: Array<[number, number]> = [
    [-10.8, -12], [10.8, 34], [-10.4, 44], [11.0, -34], [-6.8, 44],
    // Two spots removed from the back lots. Both landed inside a building —
    // (-33, 8) is on the floor of the courtyard house the interior shot is taken
    // in, and a stack of lying tyres there is a dark rounded mass on a dim floor
    // with no bore visible and nothing to explain it: the review's "black lump
    // with no albedo and no form-reading shading". Tyres are a street prop and
    // belong on a kerb where a shopfront can justify them.
    [-12.4, 6], [12.2, -20], [7.0, 28], [-12.2, 34],
    // On the apron a few metres up the road from the market street camera.
    // Contre-jour down a street needs something solid and near to read the
    // depth off: without a foreground object the near half of the frame is one
    // continuous plane running away from you and the eye has nothing to fix on.
    [-3.1, 37.4],
  ];
  const tyre = ring(0.34, 0.115, 14, 6, 0.6);
  for (const [cx, cz] of spots) {
    const stacks = rng.int(1, 3);
    for (let s2 = 0; s2 < stacks; s2++) {
      const x = cx + rng.range(-0.7, 0.7);
      const z = cz + rng.range(-0.7, 0.7);
      const y0 = streetY(x, z);
      const n = rng.int(2, 5);
      const lying = rng.next() < 0.75;
      for (let i = 0; i < n; i++) {
        if (lying) {
          q.setFromAxisAngle(xAxis, Math.PI / 2);
          q.premultiply(new THREE.Quaternion().setFromAxisAngle(yAxis, rng.range(0, 3)));
          m.compose(p.set(x + rng.range(-0.05, 0.05), y0 + 0.115 + i * 0.23, z + rng.range(-0.05, 0.05)), q, s);
        } else {
          q.setFromAxisAngle(yAxis, rng.range(0, 3));
          m.compose(p.set(x + i * 0.16, y0 + 0.34, z + rng.range(-0.1, 0.1)), q, s);
        }
        level.push('polymerBlack', tyre, m, RUBBER);
      }
    }
  }
  tyre.dispose();
}

/** Dumped furniture: the strongest single cue that people left in a hurry. */
function buildFurnitureDumps(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const spots: Array<[number, number]> = [
    [-10.6, 16], [10.4, -10], [-10.9, -36], [10.9, 46], [-4.0, -30], [-30, 44],
  ];
  for (const [cx, cz] of spots) {
    if (!occ.claim(cx, cz, 1.6)) continue;
    const y0 = streetY(cx, cz);
    // A table on its side.
    const tw = rng.range(0.9, 1.4);
    const top = box('wood', tw, 0.06, 0.8, 1.8);
    q.setFromAxisAngle(yAxis, rng.range(0, 3));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI / 2 + rng.range(-0.2, 0.2)));
    m.compose(p.set(cx, y0 + 0.42, cz), q, s);
    level.push('wood', top, m);
    top.dispose();
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = box('wood', 0.06, 0.7, 0.06, 0.8);
      q.setFromAxisAngle(zAxis, Math.PI / 2);
      m.compose(p.set(cx + 0.36, y0 + 0.42 + lx * 0.3, cz + lz * 0.32), q, s);
      level.push('wood', leg, m);
      leg.dispose();
    }
    // Stacked chairs and a rolled mattress.
    for (let i = 0; i < rng.int(1, 3); i++) {
      const seat = box('wood', 0.42, 0.05, 0.42, 1.0);
      place(level, 'wood', seat, cx + rng.range(-1.1, 1.1), y0 + 0.42 + i * 0.14, cz + rng.range(-1.1, 1.1), rng.range(0, 3));
      seat.dispose();
      const back = box('wood', 0.42, 0.46, 0.05, 1.0);
      place(level, 'wood', back, cx + rng.range(-1.1, 1.1), y0 + 0.66 + i * 0.14, cz + rng.range(-1.1, 1.1), rng.range(0, 3));
      back.dispose();
    }
    const mattress = box('fabricSandbag', 0.8, 0.22, 1.8, 1.8);
    place(level, 'fabricSandbag', mattress, cx + rng.range(-1.4, 1.4), y0 + 0.12, cz + rng.range(-1.4, 1.4), rng.range(0, 3));
    mattress.dispose();
    // Bundled cloth.
    const bundle = bagGeometry(0.45, 0.28, 0.4);
    for (let i = 0; i < rng.int(1, 3); i++) {
      place(level, 'fabricTarp', bundle, cx + rng.range(-1.5, 1.5), y0 + 0.28, cz + rng.range(-1.5, 1.5), rng.range(0, 3));
    }
    bundle.dispose();
  }
}

// ---------------------------------------------------------------- palms ----

function buildPalms(level: LevelSystem, rng: RNG, occ: Occupancy): void {
  const spots: Array<[number, number]> = [
    [-11.9, 32], [11.9, 36], [-11.9, -2], [11.9, 2], [-11.9, 48],
    [11.9, 50], [-42, 28], [42, 32], [-44, -24], [44, -20],
    [-11.9, 16], [11.9, 20], [-11.9, -40], [11.9, -44],
    // On the axis of the sabat arch, beyond it and beyond the gate.
    //
    // The arch frames the longest sightline in the level and the cone through its
    // opening is only nine metres wide at the gate, so nothing in the existing
    // row — all of it out at the building line — lands in it. What was in the
    // opening was fifty metres of aerial perspective on flat pale boxes. A palm
    // is the one thing in the library that is a dark irregular silhouette, which
    // is precisely what the far end of a hazy vista has nothing of, and a
    // staggered line of them going away gives the distance a scale.
    [-7.2, 54], [7.6, 57], [-5.4, 67], [5.8, 73], [-9.6, 81],
  ];

  for (const [x, z] of spots) {
    // A tree is planted, not dumped: it claims its ground and everything else
    // works round the trunk.
    occ.force(x, z, 1.0);
    const h = rng.range(4.8, 8.0);
    const lean = rng.range(-0.09, 0.09);
    const segs = 7;

    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const r0 = 0.22 * (1 - t0 * 0.45);
      const r1 = 0.22 * (1 - t1 * 0.45);
      const segH = h / segs;
      const g = new THREE.CylinderGeometry(r1, r0, segH, 9, 1);
      applyCylinderUV(g, r0, segH, 0.7);
      const bend = lean * t0 * t0 * h;
      q.setFromAxisAngle(zAxis, lean * t0 * 1.4);
      m.compose(p.set(x + bend, segH * (i + 0.5), z), q, s);
      level.push('wood', g, m);
      g.dispose();
      // Leaf-base collar, which is what gives a palm trunk its texture.
      if (i < segs - 1) {
        const collar = new THREE.BoxGeometry(r1 * 2.5, 0.1, r1 * 2.5);
        scaleBoxUV(collar, r1 * 2.5, 0.1, r1 * 2.5, 0.5);
        q.setFromAxisAngle(yAxis, rng.range(0, 3));
        m.compose(p.set(x + bend, segH * (i + 1), z), q, s);
        level.push('wood', collar, m);
        collar.dispose();
      }
    }

    // ---- crown ----
    //
    // Each frond is a rachis carrying leaflets down both sides, rather than a
    // flat tapered quad. A quad has one plane, so half the crown vanishes as
    // soon as the camera is off-axis to it, and what is left is the "spray of
    // flat quads radiating from a point" the review named as the worst asset in
    // the golden frame. A frond with leaflets keeps a broken outline from every
    // direction, which is the whole job of foliage in a silhouette.
    const crownY = h;
    const crownX = x + lean * h;
    // Crown boot: the stub ends of last year's fronds, which is the fat collar
    // every date palm has under the living crown.
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rng.range(-0.15, 0.15);
      const stub = box('wood', 0.15, 0.3, 0.19, 0.4);
      q.setFromAxisAngle(yAxis, a);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, 0.5));
      m.compose(p.set(crownX + Math.cos(a) * 0.2, crownY - 0.28, z + Math.sin(a) * 0.2), q, s);
      level.push('wood', stub, m);
      stub.dispose();
    }
    const fronds = rng.int(12, 17);
    for (let i = 0; i < fronds; i++) {
      const ang = (i / fronds) * Math.PI * 2 + rng.range(-0.22, 0.22);
      // Outer fronds arch right over; inner ones stand up. Uniform droop is
      // what makes a procedural crown look like an umbrella.
      const ring2 = i % 3;
      const len = ring2 === 0 ? rng.range(2.5, 3.2) : ring2 === 1 ? rng.range(1.9, 2.6) : rng.range(1.3, 1.9);
      const rise = ring2 === 0 ? rng.range(-0.15, 0.15) : ring2 === 1 ? rng.range(0.3, 0.6) : rng.range(0.7, 1.05);
      const leaf = frond(len, rng.range(0.28, 0.42), rng.range(0.5, 0.95), () => rng.next());
      q.setFromAxisAngle(yAxis, -ang);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, rise));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, rng.range(-0.4, 0.4)));
      m.compose(p.set(crownX, crownY - 0.1, z), q, s);
      level.push('fabricTarp', leaf, m, PALM);
      leaf.dispose();
    }
    // Dead fronds hanging in a skirt below the crown.
    for (let i = 0; i < rng.int(3, 6); i++) {
      const ang = rng.range(0, 6.28);
      const dead = frond(rng.range(1.1, 1.8), 0.24, 0.2, () => rng.next());
      q.setFromAxisAngle(yAxis, -ang);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, -rng.range(0.9, 1.35)));
      m.compose(p.set(crownX, crownY - 0.3, z), q, s);
      level.push('wood', dead, m);
      dead.dispose();
    }
    // Date bunches on about half of them.
    if (rng.next() < 0.5) {
      for (let i = 0; i < rng.int(1, 3); i++) {
        const a = rng.range(0, 6.28);
        const bunch = bagGeometry(0.24, 0.3, 0.2);
        place(level, 'paintedMetalTan', bunch,
          crownX + Math.cos(a) * 0.55, crownY - 0.55, z + Math.sin(a) * 0.55, a);
        bunch.dispose();
      }
    }
    // Ring of stones or a kerbed planter around the base.
    if (Math.abs(x) < 13) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const g = box('concrete', 0.3, 0.22, 0.3, 1.0);
        place(level, 'concrete', g, x + Math.cos(a) * 0.62, 0.1, z + Math.sin(a) * 0.62, a);
        g.dispose();
      }
    }
  }
}

const SCRUB = { variant: 'scrub', material: { color: new THREE.Color(1.15, 1.2, 0.82), roughness: 0.9 } };

/**
 * Desert scrub: a woody base, a few whippy branches, and blades that break the
 * outline.
 *
 * The three "flat-shaded olive ovoids in the foreground" the review called the
 * worst assets in the golden frame were squashed spheres. A sphere has no
 * silhouette to read — its outline is a circle from every angle, and no shading
 * or texture recovers from that. The blades are cheap (six triangles each) and
 * they are the entire fix, because what the eye identifies a plant by is the
 * ragged edge against whatever is behind it.
 */
function buildScrub(level: LevelSystem, x: number, z: number, scale: number, rng: RNG): void {
  const y0 = streetY(x, z);
  // Woody stems fanning out of a common root, each one visible under the mass.
  const stems = rng.int(3, 5);
  for (let i = 0; i < stems; i++) {
    const a = (i / stems) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const l = scale * rng.range(0.5, 0.85);
    const stem = cyl(0.012 * scale, 0.03 * scale, l, 4, 0.4);
    q.setFromAxisAngle(yAxis, a);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, rng.range(0.25, 0.55)));
    m.compose(p.set(x + Math.cos(a) * l * 0.15, y0 + l * 0.42, z + Math.sin(a) * l * 0.15), q, s);
    level.push('wood', stem, m);
    stem.dispose();
  }
  // Two or three clumps of foliage at different heights, not one blob.
  const clumps = rng.int(2, 4);
  for (let i = 0; i < clumps; i++) {
    const a = rng.range(0, 6.28);
    const rr = scale * rng.range(0.05, 0.3);
    const spray = bladeSpray(
      rng.int(9, 14), scale * rng.range(0.3, 0.5), scale * 0.075,
      rng.range(0.7, 1.3), scale * 0.22, () => rng.next(),
    );
    q.setFromAxisAngle(yAxis, rng.range(0, 6.28));
    m.compose(p.set(x + Math.cos(a) * rr, y0 + scale * rng.range(0.22, 0.5), z + Math.sin(a) * rr), q, s);
    level.push('fabricTarp', spray, m, SCRUB);
    spray.dispose();
  }
  // Litter caught in the base, and a scatter of stones: nothing in a desert
  // town grows out of clean ground.
  for (let i = 0; i < rng.int(2, 4); i++) {
    const a = rng.range(0, 6.28);
    const rr = scale * rng.range(0.3, 0.6);
    const g = box('rubble', rng.range(0.08, 0.2), rng.range(0.05, 0.12), rng.range(0.08, 0.2), 0.5);
    place(level, 'rubble', g, x + Math.cos(a) * rr, y0 + 0.04, z + Math.sin(a) * rr, rng.range(0, 3));
    g.dispose();
  }
}

// --------------------------------------------------------------- debris ----

function buildDebris(level: LevelSystem, rng: RNG): void {
  const piles: Array<[number, number, number]> = [
    [-14, -30, 2.6], [15, -32, 2.0], [-33, 20, 2.4], [34, 8, 1.8],
    [0, -12, 1.6], [-8, 44, 2.2], [9, -46, 2.0], [-46, -30, 2.8],
    [12.6, 43, 1.8], [-12.4, 39, 1.6],
  ];

  for (const [cx, cz, radius] of piles) {
    const count = Math.floor(radius * 9);
    for (let i = 0; i < count; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = Math.sqrt(rng.next()) * radius;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const sz = rng.range(0.12, 0.45) * (1 - (r / radius) * 0.5);
      const g = new THREE.BoxGeometry(sz * rng.range(0.7, 1.6), sz * rng.range(0.4, 1.0), sz * rng.range(0.7, 1.6));
      scaleBoxUV(g, sz, sz, sz, 0.9);
      q.setFromEuler(new THREE.Euler(rng.range(-0.5, 0.5), rng.range(0, 6.28), rng.range(-0.5, 0.5)));
      m.compose(p.set(x, streetY(x, z) + sz * 0.35 + (1 - r / radius) * 0.3, z), q, s);
      level.push(rng.next() < 0.6 ? 'rubble' : 'concrete', g, m);
      g.dispose();
    }
    // Bent reinforcement poking out of the pile.
    for (let i = 0; i < Math.round(radius * 1.6); i++) {
      const bar = cyl(0.012, 0.012, rng.range(0.6, 1.6), 4, 0.4);
      q.setFromEuler(new THREE.Euler(rng.range(-1.2, 1.2), rng.range(0, 6.28), rng.range(-1.2, 1.2)));
      m.compose(p.set(cx + rng.range(-radius, radius), 0.4, cz + rng.range(-radius, radius)), q, s);
      level.push('corrugated', bar, m);
      bar.dispose();
    }
  }

  // Loose bricks, boards and litter across the streets.
  for (let i = 0; i < 340; i++) {
    const x = rng.range(-52, 52);
    const z = rng.range(-52, 52);
    if (Math.abs(x) > 48 || Math.abs(z) > 48) continue;
    const r = rng.next();
    let g: THREE.BufferGeometry;
    let key: MaterialKey;
    if (r < 0.28) {
      g = new THREE.BoxGeometry(rng.range(0.6, 1.5), 0.035, rng.range(0.1, 0.2));
      key = 'wood';
    } else if (r < 0.42) {
      // Flattened card and paper.
      g = new THREE.BoxGeometry(rng.range(0.3, 0.7), 0.012, rng.range(0.25, 0.5));
      key = 'woodCrate';
    } else if (r < 0.52) {
      g = new THREE.BoxGeometry(rng.range(0.2, 0.5), 0.02, rng.range(0.2, 0.45));
      key = 'corrugated';
    } else {
      g = new THREE.BoxGeometry(0.2, 0.09, 0.1);
      key = 'brick';
    }
    q.setFromEuler(new THREE.Euler(0, rng.range(0, 6.28), 0));
    m.compose(p.set(x, streetY(x, z) + 0.03, z), q, s);
    level.push(key, g, m);
    g.dispose();
  }
}

// ----------------------------------------------------- street furniture ----

function buildStreetFurniture(level: LevelSystem, rng: RNG): void {
  // Lamp columns on the pavement, on a plinth, with a doubled bracket arm.
  for (let i = -4; i <= 5; i++) {
    for (const sx of [-1, 1]) {
      const z = i * 11 + (sx > 0 ? 5.5 : 0);
      if (Math.abs(z - 45) < 3.0) continue;
      const x = sx * (ROAD_HALF + 0.85);
      const y0 = streetY(x, z);

      const plinth = box('concrete', 0.42, 0.3, 0.42, 1.2);
      place(level, 'concrete', plinth, x, y0 + 0.15, z, 0);
      plinth.dispose();

      const pole = cyl(0.06, 0.085, 5.4, 8, 1.2);
      m.makeTranslation(x, y0 + 0.3 + 2.7, z);
      level.push('paintedMetalGreen', pole, m);
      pole.dispose();

      const arm = box('paintedMetalGreen', 1.1, 0.07, 0.07, 0.8);
      place(level, 'paintedMetalGreen', arm, x - sx * 0.55, y0 + 5.55, z, 0);
      arm.dispose();
      const stay = cyl(0.028, 0.028, 0.8, 5, 0.4);
      q.setFromAxisAngle(zAxis, sx * 0.85);
      m.compose(p.set(x - sx * 0.3, y0 + 5.15, z), q, s);
      level.push('paintedMetalGreen', stay, m);
      stay.dispose();

      const head = box('paintedMetalGreen', 0.44, 0.13, 0.26, 0.5);
      place(level, 'paintedMetalGreen', head, x - sx * 1.1, y0 + 5.44, z, 0);
      head.dispose();
      const lens = box('tile', 0.34, 0.06, 0.2, 0.4);
      place(level, 'tile', lens, x - sx * 1.1, y0 + 5.35, z, 0);
      lens.dispose();

      // Fly-posting and a cable coil, at the height a person can reach.
      if (rng.next() < 0.4) {
        const poster = box('woodCrate', 0.02, 0.5, 0.36, 0.6);
        place(level, 'woodCrate', poster, x + sx * 0.07, y0 + 1.55, z, 0);
        poster.dispose();
      }
    }
  }

  // Standpipe and trough — a reason for people to gather here.
  const pipe = cyl(0.07, 0.07, 1.3, 8, 0.7);
  m.makeTranslation(-10.4, 0.81, 24);
  level.push('corrugated', pipe, m);
  pipe.dispose();
  const spout = cyl(0.035, 0.035, 0.34, 6, 0.4);
  q.setFromAxisAngle(zAxis, Math.PI / 2);
  m.compose(p.set(-10.15, 1.4, 24), q, s);
  level.push('corrugated', spout, m);
  spout.dispose();
  const trough = box('concrete', 1.5, 0.52, 0.8, 1.6);
  place(level, 'concrete', trough, -10.4, 0.42, 25.1, 0);
  trough.dispose();

  // Street signs and a notice board at the junction.
  for (const [sx, sz, rot] of [[-1, 1, 0.3], [1, -1, -2.9]] as Array<[number, number, number]>) {
    const x = sx * (ROAD_HALF + 1.2);
    const z = CROSS_Z + sz * (CROSS_HALF + 1.4);
    const y0 = streetY(x, z);
    const post = cyl(0.045, 0.05, 2.6, 6, 0.6);
    m.makeTranslation(x, y0 + 1.3, z);
    level.push('corrugated', post, m);
    post.dispose();
    for (let i = 0; i < 2; i++) {
      const plate = box('paintedMetalGreen', 0.9, 0.22, 0.03, 1.0);
      place(level, i === 0 ? 'paintedMetalGreen' : 'paintedMetalRed', plate,
        x + Math.cos(rot) * 0.4, y0 + 2.2 - i * 0.3, z + Math.sin(rot) * 0.4, rot + i * 1.4);
      plate.dispose();
    }
  }

  // Bollards protecting the pavement corners.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x = sx * (ROAD_HALF + 0.35);
        const z = CROSS_Z + sz * (CROSS_HALF + 0.9 + i * 1.1);
        const bol = cyl(0.09, 0.11, 0.72, 7, 0.6);
        m.makeTranslation(x, streetY(x, z) + 0.36, z);
        level.push('concrete', bol, m);
        bol.dispose();
      }
    }
  }

  // Cooking brazier with a stool and a stack of charcoal sacks.
  for (const [bx, bz] of [[-9.6, 10], [9.6, -26]] as Array<[number, number]>) {
    const y0 = streetY(bx, bz);
    const drum = cyl(0.28, 0.3, 0.5, 10, 0.8);
    m.makeTranslation(bx, y0 + 0.25, bz);
    level.push('paintedMetalRed', drum, m);
    drum.dispose();
    const grill = box('corrugated', 0.66, 0.04, 0.66, 0.5);
    place(level, 'corrugated', grill, bx, y0 + 0.52, bz, 0.3);
    grill.dispose();
    const bag = bagGeometry(0.3, 0.24, 0.26);
    for (let i = 0; i < 3; i++) {
      place(level, 'fabricSandbag', bag, bx + 0.75 + i * 0.1, y0 + 0.24 + i * 0.22, bz + 0.3, rng.range(0, 3));
    }
    bag.dispose();
  }
}

/**
 * The pole line.
 *
 * Poles both sides of the street, with cross-arms, insulators, transformer cans
 * and slack runs between them. The sag lines are the cheapest large-scale depth
 * cue available — they cross the frame at a known height, so the eye can read
 * distance off them all the way down the street.
 */
function buildUtilityPoles(level: LevelSystem, rng: RNG): void {
  const anchors: Array<[number, number, number]> = [];
  for (const sx of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      const z = i * 16 + (sx > 0 ? 8 : 0);
      const x = sx * POLE_X;
      const h = rng.range(8.0, 9.2);
      const y0 = streetY(x, z);

      const pole = cyl(0.1, 0.15, h, 8, 1.0);
      m.makeTranslation(x, y0 + h / 2, z);
      level.push('wood', pole, m);
      pole.dispose();

      // Two cross-arms with insulator pins.
      for (let a = 0; a < 2; a++) {
        const ay = y0 + h - 0.5 - a * 0.85;
        const cross = box('wood', 0.12, 0.11, 1.9, 0.9);
        place(level, 'wood', cross, x, ay, z, 0);
        cross.dispose();
        // Diagonal brace.
        const brace = cyl(0.03, 0.03, 0.8, 4, 0.4);
        q.setFromAxisAngle(xAxis, 0.75);
        m.compose(p.set(x, ay - 0.28, z + 0.3), q, s);
        level.push('wood', brace, m);
        brace.dispose();
        for (const t of [-0.8, 0, 0.8]) {
          const pin = cyl(0.035, 0.045, 0.16, 6, 0.3);
          m.makeTranslation(x, ay + 0.13, z + t);
          level.push('tile', pin, m);
          pin.dispose();
        }
      }
      // Transformer can on the taller poles.
      if (rng.next() < 0.35) {
        const can = cyl(0.24, 0.24, 0.6, 9, 0.7);
        m.makeTranslation(x - sx * 0.3, y0 + h - 2.1, z);
        level.push('paintedMetalGreen', can, m);
        can.dispose();
      }
      // Stapled-on cable coil and a step bolt or two.
      const coil = ring(0.2, 0.03, 12, 4, 0.4);
      q.setFromAxisAngle(xAxis, Math.PI / 2);
      m.compose(p.set(x - sx * 0.18, y0 + 2.4, z), q, s);
      level.push('polymerBlack', coil, m);
      coil.dispose();

      anchors.push([x, y0 + h - 0.37, z]);
    }
  }

  // Runs along each side of the street.
  for (const sx of [-1, 1]) {
    const side = anchors.filter(([x]) => Math.sign(x) === sx).sort((a, b) => a[2] - b[2]);
    for (let i = 0; i + 1 < side.length; i++) {
      const [x0, y0, z0] = side[i];
      const [x1, y1, z1] = side[i + 1];
      for (const off of [-0.8, 0, 0.8]) {
        // Sag proportional to span. These poles are 16 m apart, so a fixed
        // 1.15 m gave a 7 % curve here and a dead-straight line anywhere the
        // spacing was longer — the inconsistency is what reads as wrong.
        const cable = slackCable(
          new THREE.Vector3(x0, y0, z0 + off),
          new THREE.Vector3(x1, y1, z1 + off),
          0.075, 0.021, 10,
        );
        m.identity();
        level.push('polymerBlack', cable, m, FLAT);
        cable.dispose();
      }
      // Lower service pair, sagging further.
      const svc = slackCable(
        new THREE.Vector3(x0, y0 - 0.85, z0),
        new THREE.Vector3(x1, y1 - 0.85, z1),
        0.1, 0.018, 10,
      );
      m.identity();
      level.push('polymerBlack', svc, m, FLAT);
      svc.dispose();
    }
  }
  void FRONT_X;
}
