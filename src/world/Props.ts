import * as THREE from 'three';
import type { LevelSystem } from './Level';
import { ROAD_HALF, PAVE_W, CROSS_Z, CROSS_HALF, FRONT_X, POLE_X, AWNING_MAT, groundY } from './Level';
import { scaleBoxUV, applyCylinderUV } from './Level';
import type { MaterialKey } from '../render/Materials';
import type { RNG } from '../render/Noise';
import { clothPanel, sagCable, cyl, ring, bagGeometry, prism } from './GeoKit';

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

function box(key: MaterialKey, w: number, h: number, d: number, tile: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  scaleBoxUV(geo as THREE.BoxGeometry, w, h, d, tile);
  void key;
  return geo;
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
  return 0.0;
}

export function buildProps(level: LevelSystem, rng: RNG): void {
  buildSandbags(level, rng);
  buildBarriers(level, rng);
  buildCrates(level, rng);
  buildBarrels(level, rng);
  buildMarketStalls(level, rng);
  buildPavementGoods(level, rng);
  buildProduceFronts(level, rng);
  buildVehicles(level, rng);
  buildHandcarts(level, rng);
  buildBicycles(level, rng);
  buildTyres(level, rng);
  buildFurnitureDumps(level, rng);
  buildPalms(level, rng);
  buildDebris(level, rng);
  buildStreetFurniture(level, rng);
  buildUtilityPoles(level, rng);
}

// ------------------------------------------------------------- sandbags ----

function buildSandbags(level: LevelSystem, rng: RNG): void {
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

function buildBarriers(level: LevelSystem, rng: RNG): void {
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
  const LIFT = 1.02;
  const boomLen = 7.0;
  // One continuous pole, with the pale bands as sleeves over it.
  //
  // Built as alternating segments instead, the pole disappeared: the pale bands
  // are the same value as the arch wall it is silhouetted against, so what came
  // back was a row of unconnected red dashes climbing the frame. A hazard boom has
  // to read as one object first and as striped second, so the red runs the whole
  // length and the white is a slightly fatter collar every metre.
  const dirX = Math.cos(LIFT) * 0.24;
  const at = (t: number): THREE.Vector3 =>
    p.set(PX + Math.cos(LIFT) * t, gy + 1.44 + Math.sin(LIFT) * t, PZ + dirX * t * 0.1);
  const lie = (): void => {
    q.setFromAxisAngle(zAxis, Math.PI / 2 - LIFT);
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(yAxis, 0.1));
  };
  {
    const pole = cyl(0.07, 0.07, boomLen, 6, 0.6);
    lie();
    m.compose(at(boomLen / 2), q, s);
    level.push('paintedMetalRed', pole, m);
    pole.dispose();
  }
  for (let i = 0; i < 4; i++) {
    const collar = cyl(0.085, 0.085, 0.85, 6, 0.5);
    lie();
    m.compose(at(0.9 + i * 1.75), q, s);
    level.push('concrete', collar, m);
    collar.dispose();
  }
  // Counterweight on the short tail, which is what holds it up.
  for (let i = 0; i < 3; i++) {
    m.makeTranslation(PX - 0.62, gy + 0.5 + i * 0.17, PZ);
    level.box('concrete', 0.42, 0.16, 0.4, m, 0.9);
  }
  const tail = cyl(0.05, 0.05, 0.8, 6, 0.5);
  q.setFromAxisAngle(zAxis, Math.PI / 2 - LIFT + Math.PI);
  m.compose(p.set(PX - 0.34, gy + 1.16, PZ), q, s);
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

function buildCrates(level: LevelSystem, rng: RNG): void {
  const clusters: Array<[number, number]> = [
    [-9.8, -8], [9.8, -6], [-16, 20], [17, 22], [-30, 30], [30, -30],
    [4, -40], [-9.4, 6], [-36, -16], [36, 16], [2.4, 4], [-24, 44],
    [-9.9, 36], [9.9, 43], [-9.6, 54], [6.2, 34], [-12.6, -24], [12.6, 30],
  ];

  for (const [cx, cz] of clusters) {
    const count = rng.int(2, 6);
    const stack: Array<[number, number, number]> = [];
    const baseY = streetY(cx, cz);
    for (let i = 0; i < count; i++) {
      const size = rng.range(0.55, 1.0);
      let x = cx + rng.range(-1.4, 1.4);
      let z = cz + rng.range(-1.4, 1.4);
      let y = baseY + size / 2;
      if (i > 0 && rng.next() < 0.45) {
        const base = stack[rng.int(0, stack.length - 1)];
        x = base[0] + rng.range(-0.15, 0.15);
        z = base[2] + rng.range(-0.15, 0.15);
        y = base[1] + size;
      }
      stack.push([x, y, z]);

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

function buildBarrels(level: LevelSystem, rng: RNG): void {
  const spots: Array<[number, number]> = [
    [-10.4, 2], [10.4, 8], [-19, -26], [19, -28], [-28, 12], [28, 18],
    [2, 30], [-6, -22], [7, -12], [-40, 4], [40, -2], [10.8, 42],
    [-6.4, 41.6], [-10.6, 30], [10.6, 52], [-3.4, 18],
  ];

  const geo = cyl(0.29, 0.29, 0.88, 16, 1.2);
  const hoop = ring(0.295, 0.022, 16, 5, 0.4);
  hoop.rotateX(Math.PI / 2);

  for (const [cx, cz] of spots) {
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
function buildMarketStalls(level: LevelSystem, rng: RNG): void {
  const sabatZ = 48;
  for (const side of [-1, 1]) {
    let z = -50 + rng.range(0, 4);
    while (z < 56) {
      const gap = rng.range(4.6, 9.5);
      const nearSabat = Math.abs(z - sabatZ) < 3.5;
      const nearCross = Math.abs(z - CROSS_Z) < CROSS_HALF + 2.5;
      if (!nearSabat && !nearCross && rng.next() < 0.78) {
        // Alternate between the pavement line and the kerbside.
        const onPavement = rng.next() < 0.6;
        const x = side * (onPavement ? rng.range(9.0, 10.1) : rng.range(5.6, 6.6));
        buildStall(level, x, z, side > 0 ? Math.PI : 0, rng);
      }
      z += gap;
    }
  }
  // A cluster of stalls in the middle of the carriageway, forcing the player to
  // weave: cover that has to be walked around is worth more than cover you can
  // shoot past.
  for (const [x, z, rot] of [[-2.2, 22, 0.4], [2.6, 15, -0.5], [-1.4, -4, 0.2]] as Array<[number, number, number]>) {
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
    buildStall(level, x, z, rot, rng);
  }
}

function buildStall(level: LevelSystem, x: number, z: number, rot: number, rng: RNG): void {
  const w = rng.range(2.1, 3.2);
  const d = rng.range(1.5, 2.1);
  const hgt = rng.range(2.15, 2.45);
  const y0 = streetY(x, z);
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const local = (ox: number, oz: number): [number, number] => [x + ox * c - oz * sn, z + ox * sn + oz * c];

  // Posts, leaning very slightly — nothing in a market is plumb.
  for (const [ox, oz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    const post = cyl(0.045, 0.055, hgt, 6, 0.8);
    const [px, pz] = local(ox, oz);
    q.setFromAxisAngle(yAxis, rot);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, rng.range(-0.03, 0.03)));
    m.compose(p.set(px, y0 + hgt / 2, pz), q, s);
    level.push('wood', post, m);
    post.dispose();
  }
  // Head rails tie the posts together.
  for (const oz of [-d / 2, d / 2]) {
    const rail = box('wood', w, 0.07, 0.07, 1.0);
    const [px, pz] = local(0, oz);
    place(level, 'wood', rail, px, y0 + hgt - 0.05, pz, rot);
    rail.dispose();
  }

  // Canopy. Pitched to a ridge rather than laid flat: a stall roof is looked
  // down on from standing height more often than it is looked up at, and a
  // single horizontal sheet at 2.4 m is a bare quad filling the middle of the
  // frame. A ridge gives it two tones, a silhouette break and a shadow line.
  const ridge = rng.range(0.3, 0.48);
  const pitch = 0.32;
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
      const slope = clothPanel(w + 0.6, d / 2 + 0.42, {
        fold: 0.1, folds: 5, tile: 2.4, segsX: 11, segsY: 5,
      });
      // Turn the sheet flat, then drop the eave edge to make the pitch: the
      // panel hangs along -Y, so a turn of (pitch - 90 deg) about X lays it out
      // horizontally with a fall of sin(pitch) along its length.
      const cq = new THREE.Quaternion().setFromAxisAngle(yAxis, rot + (sd > 0 ? Math.PI : 0));
      cq.multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, -Math.PI / 2 + pitch));
      m.compose(p.set(x, y0 + hgt + 0.06 + ridge, z), cq, s);
      level.push('fabricTarp', slope, m, { variant: 'awning', material: AWNING_MAT });
      slope.dispose();
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
    // Overhanging valance on the customer side.
    const valance = clothPanel(w + 0.6, rng.range(0.25, 0.5), { fold: 0.05, folds: 4, tile: 1.6, segsX: 7, segsY: 3 });
    const [vx, vz] = local(0, d / 2 + 0.4);
    q.setFromAxisAngle(yAxis, rot);
    m.compose(p.set(vx, y0 + hgt + 0.06, vz), q, s);
    level.push('fabricTarp', valance, m, { variant: 'awning', material: AWNING_MAT });
    valance.dispose();
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
      level.push('wood', batten, m);
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

  // Goods: produce in shallow trays, sacks, or hanging stock.
  const kind = rng.next();
  if (kind < 0.45) {
    const trays = rng.int(2, 4);
    for (let i = 0; i < trays; i++) {
      const tw = w / trays - 0.1;
      const [tx, tz] = local(-w / 2 + (w * (i + 0.5)) / trays, rng.range(-0.1, 0.1));
      const tray = box('woodCrate', tw, 0.11, d * 0.5, 1.0);
      place(level, 'woodCrate', tray, tx, y0 + 1.02, tz, rot);
      tray.dispose();
      // Heaped produce as a squashed dome.
      const heap = bagGeometry(tw * 0.44, 0.09, d * 0.24);
      place(level, rng.next() < 0.5 ? 'paintedMetalRed' : 'paintedMetalGreen', heap, tx, y0 + 1.13, tz, rot);
      heap.dispose();
    }
  } else if (kind < 0.75) {
    const bag = bagGeometry(0.3, 0.2, 0.24);
    for (let i = 0; i < rng.int(3, 6); i++) {
      const [bx, bz] = local(rng.range(-w / 2 + 0.3, w / 2 - 0.3), rng.range(-0.2, 0.2));
      place(level, 'fabricSandbag', bag, bx, y0 + 1.09, bz, rng.range(0, 3));
    }
    bag.dispose();
  } else {
    // Hanging stock on the head rail.
    for (let i = 0; i < rng.int(3, 6); i++) {
      const cw = rng.range(0.2, 0.42);
      const ch = rng.range(0.4, 0.8);
      const cloth = clothPanel(cw, ch, { fold: 0.04, folds: 2, tile: 1.2, segsX: 4, segsY: 3 });
      const [hx, hz] = local(rng.range(-w / 2 + 0.2, w / 2 - 0.2), -d / 2 + 0.06);
      q.setFromAxisAngle(yAxis, rot);
      m.compose(p.set(hx, y0 + hgt - 0.12, hz), q, s);
      level.push('fabricTarp', cloth, m);
      cloth.dispose();
    }
    const tray = box('woodCrate', w * 0.7, 0.11, d * 0.4, 1.0);
    place(level, 'woodCrate', tray, x, y0 + 1.02, z, rot);
    tray.dispose();
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
function buildPavementGoods(level: LevelSystem, rng: RNG): void {
  const zAx = new THREE.Vector3(0, 0, 1);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 26; i++) {
      const z = -50 + i * 4.1 + rng.range(-1.2, 1.2);
      if (Math.abs(z - CROSS_Z) < CROSS_HALF + 1.5) continue;
      if (rng.next() < 0.26) continue;
      // Back half of the pavement, off the kerb.
      const x = side * rng.range(ROAD_HALF + 1.5, ROAD_HALF + PAVE_W - 0.5);
      const y0 = 0.16;
      const rot = rng.range(0, Math.PI * 2);
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

function buildVehicles(level: LevelSystem, rng: RNG): void {
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
    if (kind === 0) buildBurntCar(level, x, z, rot, rng);
    else buildTruck(level, x, z, rot, rng);
  }
}

function buildBurntCar(level: LevelSystem, x: number, z: number, rot: number, rng: RNG): void {
  const y0 = streetY(x, z);
  const parts: Array<[number, number, number, number, number, number]> = [
    [1.72, 0.5, 4.0, 0, 0.52, 0],
    [1.6, 0.44, 1.9, 0, 0.98, -0.15],
    [1.68, 0.12, 1.1, 0, 0.82, 1.6],
    [1.68, 0.12, 0.9, 0, 0.82, -1.75],
  ];
  for (const [w, h, d, ox, oy, oz] of parts) {
    const g = box('paintedMetalRed', w, h, d, 1.8);
    place(level, 'paintedMetalRed', g, x + ox, y0 + oy, z + oz, rot);
    g.dispose();
  }
  // Sills, bumpers and a stub of screen pillar break the slab silhouette.
  for (const sx of [-1, 1]) {
    const sill = box('paintedMetalRed', 0.12, 0.2, 3.2, 1.4);
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    const ox = sx * 0.88;
    place(level, 'paintedMetalRed', sill, x + ox * c, y0 + 0.34, z + ox * sn, rot);
    sill.dispose();
    const pillar = box('paintedMetalRed', 0.1, 0.42, 0.1, 0.8);
    place(level, 'paintedMetalRed', pillar, x + (ox * 0.9) * c - 0.75 * sn, y0 + 1.2, z + (ox * 0.9) * sn + 0.75 * c, rot);
    pillar.dispose();
  }
  for (const oz of [2.02, -2.15]) {
    const bar = box('corrugated', 1.7, 0.16, 0.14, 1.2);
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    place(level, 'corrugated', bar, x - oz * sn, y0 + 0.42, z + oz * c, rot);
    bar.dispose();
  }

  // Wheels; a burnt car usually has at least one gone, sitting on the rim.
  const wheel = cyl(0.32, 0.32, 0.22, 12, 0.9);
  wheel.rotateZ(Math.PI / 2);
  const rim = cyl(0.19, 0.19, 0.24, 10, 0.6);
  rim.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.82, 1.3], [0.82, 1.3], [-0.82, -1.3], [0.82, -1.3]]) {
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    q.setFromAxisAngle(yAxis, rot);
    const gone = rng.next() < 0.3;
    m.compose(p.set(x + wx * c - wz * sn, y0 + (gone ? 0.19 : 0.3), z + wx * sn + wz * c), q, s);
    level.push(gone ? 'gunmetal' : 'polymerBlack', gone ? rim : wheel, m);
  }
  wheel.dispose();
  rim.dispose();
}

function buildTruck(level: LevelSystem, x: number, z: number, rot: number, rng: RNG): void {
  const y0 = streetY(x, z);
  const parts: Array<[MaterialKey, number, number, number, number, number, number]> = [
    ['paintedMetalTan', 2.2, 0.7, 5.6, 0, 0.85, 0],
    ['paintedMetalTan', 2.1, 1.4, 1.9, 0, 1.6, 1.9],
    ['corrugated', 2.3, 1.9, 3.4, 0, 1.9, -1.1],
    ['paintedMetalTan', 2.3, 0.18, 3.4, 0, 2.9, -1.1],
  ];
  for (const [key, w, h, d, ox, oy, oz] of parts) {
    const g = box(key, w, h, d, 2.2);
    place(level, key, g, x + ox, y0 + oy, z + oz, rot);
    g.dispose();
  }
  // Cab detail: screen surround, mirrors, bumper, exhaust stack.
  const screen = box('gunmetal', 1.8, 0.9, 0.08, 1.2);
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  place(level, 'gunmetal', screen, x + 2.8 * -sn, y0 + 1.85, z + 2.8 * c, rot);
  screen.dispose();
  for (const sx of [-1, 1]) {
    const arm = box('corrugated', 0.35, 0.05, 0.05, 0.5);
    place(level, 'corrugated', arm, x + (sx * 1.2) * c - 2.5 * sn, y0 + 2.1, z + (sx * 1.2) * sn + 2.5 * c, rot);
    arm.dispose();
    const mirror = box('gunmetal', 0.1, 0.28, 0.06, 0.4);
    place(level, 'gunmetal', mirror, x + (sx * 1.4) * c - 2.5 * sn, y0 + 2.0, z + (sx * 1.4) * sn + 2.5 * c, rot);
    mirror.dispose();
  }
  const stack = cyl(0.06, 0.07, 1.9, 6, 0.6);
  m.makeTranslation(x + 1.0 * c - 1.0 * sn, y0 + 2.4, z + 1.0 * sn + 1.0 * c);
  level.push('corrugated', stack, m);
  stack.dispose();
  // Side rails on the load bed.
  for (const sx of [-1, 1]) {
    const rail = box('wood', 0.09, 0.6, 3.3, 1.6);
    place(level, 'wood', rail, x + (sx * 1.16) * c + 1.1 * sn, y0 + 3.2, z + (sx * 1.16) * sn - 1.1 * c, rot);
    rail.dispose();
  }
  // Load under a tarp.
  if (rng.next() < 0.6) {
    const tarp = clothPanel(2.4, 2.6, { fold: 0.1, folds: 3, hem: 0.12, tile: 2.4, segsX: 7, segsY: 5 });
    q.setFromAxisAngle(xAxis, 1.4);
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(yAxis, rot));
    m.compose(p.set(x - 1.1 * -sn, y0 + 3.4, z - 1.1 * c), q, s);
    level.push('fabricTarp', tarp, m);
    tarp.dispose();
  }

  const wheel = cyl(0.48, 0.48, 0.3, 14, 1.0);
  wheel.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-1.05, 1.7], [1.05, 1.7], [-1.05, -1.4], [1.05, -1.4]]) {
    q.setFromAxisAngle(yAxis, rot);
    m.compose(p.set(x + wx * c - wz * sn, y0 + 0.46, z + wx * sn + wz * c), q, s);
    level.push('polymerBlack', wheel, m);
  }
  wheel.dispose();
}

// -------------------------------------------------------------- handcart ---

/** Two-wheeled barrow, the workhorse of every market street. */
function buildHandcarts(level: LevelSystem, rng: RNG): void {
  const spots: Array<[number, number, number]> = [
    [-6.4, 30, 0.3], [6.6, 5, 2.9], [-6.2, -2, 1.5], [6.4, 38, 0.1],
    [-10.2, 20, 1.2], [3.0, 47, 2.0], [-9.9, -30, 0.6],
  ];
  for (const [x, z, rot] of spots) {
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
    // Wheels.
    const tyre = ring(0.34, 0.06, 14, 5, 0.5);
    const hub = cyl(0.05, 0.05, 0.16, 6, 0.4);
    hub.rotateZ(Math.PI / 2);
    for (const sx of [-1, 1]) {
      q.setFromAxisAngle(yAxis, rot + Math.PI / 2);
      m.compose(p.set(x + sx * 0.62 * c, y0 + 0.36, z + sx * 0.62 * sn), q, s);
      level.push('polymerBlack', tyre, m);
      q.setFromAxisAngle(yAxis, rot);
      m.compose(p.set(x + sx * 0.62 * c, y0 + 0.36, z + sx * 0.62 * sn), q, s);
      level.push('gunmetal', hub, m);
    }
    tyre.dispose();
    hub.dispose();
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
    for (const oz of [-0.52, 0.52]) {
      q.setFromAxisAngle(yAxis, rot + Math.PI / 2);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(yAxis, 0));
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(zAxis, lean * (rot === 0 ? 1 : -1)));
      m.compose(p.set(x - oz * sn + 0.1 * c, y0 + 0.34, z + oz * c + 0.1 * sn), q, s);
      level.push('polymerBlack', tyre, m);
    }
    tyre.dispose();
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
    [-33, 8], [34, -14], [7.0, 28], [-12.2, 34],
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
        level.push('polymerBlack', tyre, m);
      }
    }
  }
  tyre.dispose();
}

/** Dumped furniture: the strongest single cue that people left in a hurry. */
function buildFurnitureDumps(level: LevelSystem, rng: RNG): void {
  const spots: Array<[number, number]> = [
    [-10.6, 16], [10.4, -10], [-10.9, -36], [10.9, 46], [-4.0, -30], [-30, 44],
  ];
  for (const [cx, cz] of spots) {
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

function buildPalms(level: LevelSystem, rng: RNG): void {
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

    const crownY = h;
    const crownX = x + lean * h;
    const fronds = rng.int(11, 16);
    for (let i = 0; i < fronds; i++) {
      const ang = (i / fronds) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const len = rng.range(1.6, 2.8);
      const droop = rng.range(0.4, 1.3);

      const frond = new THREE.BufferGeometry();
      const w0 = 0.15;
      const segments = 5;
      const verts: number[] = [];
      const norms: number[] = [];
      const uvs: number[] = [];
      const idx: number[] = [];
      for (let k = 0; k <= segments; k++) {
        const t = k / segments;
        const wl = w0 * (1 - t * 0.85);
        const px = Math.cos(ang) * len * t;
        const pz = Math.sin(ang) * len * t;
        const py = -droop * t * t;
        verts.push(px - Math.sin(ang) * wl, py, pz + Math.cos(ang) * wl);
        verts.push(px + Math.sin(ang) * wl, py, pz - Math.cos(ang) * wl);
        norms.push(0, 1, 0, 0, 1, 0);
        uvs.push(0, t * 2, 1, t * 2);
        if (k < segments) {
          const b = k * 2;
          idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }
      frond.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      frond.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
      frond.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      frond.setIndex(idx);
      frond.computeVertexNormals();

      m.compose(p.set(crownX, crownY, z), new THREE.Quaternion(), s);
      level.push('fabricTarp', frond, m);
      frond.dispose();
    }
    // Dead fronds hanging below the crown.
    for (let i = 0; i < rng.int(2, 5); i++) {
      const skirt = clothPanel(0.4, rng.range(0.6, 1.1), { fold: 0.06, folds: 2, tile: 1.2, segsX: 4, segsY: 3 });
      q.setFromAxisAngle(yAxis, rng.range(0, 6.28));
      m.compose(p.set(crownX + rng.range(-0.2, 0.2), crownY - 0.1, z + rng.range(-0.2, 0.2)), q, s);
      level.push('wood', skirt, m);
      skirt.dispose();
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
        const cable = sagCable(
          new THREE.Vector3(x0, y0, z0 + off),
          new THREE.Vector3(x1, y1, z1 + off),
          1.15, 0.021, 10,
        );
        m.identity();
        level.push('polymerBlack', cable, m);
        cable.dispose();
      }
      // Lower service pair, sagging further.
      const svc = sagCable(
        new THREE.Vector3(x0, y0 - 0.85, z0),
        new THREE.Vector3(x1, y1 - 0.85, z1),
        1.5, 0.018, 10,
      );
      m.identity();
      level.push('polymerBlack', svc, m);
      svc.dispose();
    }
  }
  void FRONT_X;
}
