import * as THREE from 'three';
import { Rng } from '../core/MathUtils';
import { Groups } from '../core/GameContext';
import type { Batcher } from './Batcher';
import { GeoBuf, addBox, addCylinder, addQuad, groundGeometry, makeGeometry, type RGB } from './Geo';
import { windVariant } from './Wind';

/**
 * Vegetation.
 *
 * Four things grow here and each does a different job. Date palms are the
 * skyline element and the framing device — a frond across the top corner of a
 * shot is worth more than any amount of extra detail in the middle of it. Dry
 * scrub breaks the base of walls. Weeds in pavement cracks say nobody has swept
 * this street in two years. Potted plants on balconies say somebody still
 * lives here.
 *
 * Leaflets and blades are real geometry rather than alpha cards wherever they
 * are seen close up, because a cut-out card at a grazing angle is the most
 * recognisable tell in a game environment.
 */

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();

export const FROND_MAT = 'veg_frond';
export const SCRUB_MAT = 'veg_scrub';
export const WEED_MAT = 'veg_weed';
export const CLOTH_MAT = 'cloth_wind';

export function registerVegetationMaterials(batch: Batcher): void {
  // Palm leaflets are modelled, so the library's leaf cut-out would eat them.
  windVariant(batch, FROND_MAT, 'foliage', {
    amplitude: 0.075,
    flexBase: 1.4,
    flexScale: 0.16,
    radial: 0.5,
    rate: 1,
  }, (m) => {
    m.alphaTest = 0;
    m.transparent = false;
    m.side = THREE.DoubleSide;
  });

  windVariant(batch, SCRUB_MAT, 'foliage', {
    amplitude: 0.035,
    flexBase: 0.05,
    flexScale: 1.6,
    rate: 1.7,
  }, (m) => {
    m.alphaTest = 0.42;
    m.side = THREE.DoubleSide;
  });

  windVariant(batch, WEED_MAT, 'foliage', {
    amplitude: 0.022,
    flexBase: 0,
    flexScale: 3.2,
    rate: 2.3,
  }, (m) => {
    m.alphaTest = 0.4;
    m.side = THREE.DoubleSide;
  });

  // Hanging laundry: flex runs downward from the line.
  windVariant(batch, CLOTH_MAT, 'fabric_canvas', {
    amplitude: 0.05,
    flexBase: 0,
    flexScale: -1.1,
    rate: 1.3,
  }, (m) => {
    m.side = THREE.DoubleSide;
  });
}

/* -------------------------------- palm ---------------------------------- */

/**
 * Date palm trunk: stacked frusta with the diamond leaf-scar collar of a
 * pruned Phoenix dactylifera, leaning slightly off vertical.
 */
function palmTrunk(buf: GeoBuf, rng: Rng, height: number): void {
  /*
   * The leaf-base scars of a date palm form a tight diamond lattice, and they
   * are shallow — two or three centimetres. Modelling them as one proud collar
   * per ring, alternating light and dark, gives a stack of cups on a totem pole,
   * which is what this used to be. Instead the rings are barely proud and each
   * is rotated half a facet against the one below, so consecutive facets
   * interlock and the lattice appears without a single extra triangle.
   */
  const rings = 18;
  const segments = 9;
  const half = Math.PI / segments;
  const lean = rng.range(-0.05, 0.05);
  const leanDir = rng.range(0, Math.PI * 2);
  for (let i = 0; i < rings; i++) {
    const t0 = i / rings;
    const t1 = (i + 1) / rings;
    const y0 = t0 * height;
    const y1 = t1 * height;
    const r0 = 0.3 - 0.13 * t0 + (i === 0 ? 0.07 : 0);
    const r1 = 0.3 - 0.13 * t1;
    const off0 = lean * y0 * y0 * 0.25;
    const off1 = lean * y1 * y1 * 0.25;
    /*
     * Warm mid brown, and deliberately darker than the material gives on its
     * own.
     *
     * The library's bark is a temperate grey-brown with grey-green lichen on the
     * plate faces, and under a low sun at near unity that resolves to a pale
     * neutral column — every palm on the map was reading as a concrete post, in
     * three of the four hero shots at once. A date palm is one of the warmest and
     * darkest things in a bleached street, and getting there means multiplying red
     * up, blue down, and the whole thing down.
     */
    const shade = (0.9 + 0.07 * (i % 2)) * (0.93 + 0.14 * t0);
    addCylinder(buf, Math.cos(leanDir) * off0, y0, Math.sin(leanDir) * off0, r0, y1 - y0, {
      segments,
      topRadius: r1,
      caps: false,
      rotY: (i % 2) * half,
      color: [shade * 1.16, shade * 0.86, shade * 0.6],
      smooth: false,
    });
    /*
     * The scar course itself: a couple of centimetres proud, and paler where the
     * cut face of the old frond base has bleached.
     *
     * The step between course and collar has to be visible. It was pushed down to
     * three per cent to stop the trunk reading as a stack of cups, which worked
     * and then left nothing at all — a smooth pole with faint banding. Twelve per
     * cent plus the half-facet rotation gives back the diamond lattice that is the
     * one thing everyone recognises a date palm by.
     */
    if (i < rings - 1) {
      addCylinder(buf, Math.cos(leanDir) * off1, y1 - 0.035, Math.sin(leanDir) * off1, r1 + 0.032, 0.075, {
        segments,
        topRadius: r1 + 0.005,
        caps: false,
        rotY: (i % 2) * half,
        color: [shade * 1.42, shade * 1.06, shade * 0.72],
        smooth: false,
      });
    }
  }
}

/**
 * One arching frond with two ranks of leaflets.
 *
 * A date palm reads by its leaflet mass, not by its rachis: sparse leaflets
 * turn the crown into a radial asterisk, which is the classic tell of a
 * placeholder tree. Leaflets are therefore dense, overlapping, and folded into
 * a shallow V along their length so they catch the sun on one face and stay in
 * shadow on the other even under a single directional light.
 */
function palmFrond(
  buf: GeoBuf,
  rng: Rng,
  originY: number,
  angle: number,
  length: number,
  droop: number,
  tint: RGB,
  pairs: number,
): void {
  const steps = 6;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  // Perpendicular to the frond in plan; leaflets fan out along it.
  const px = -sa;
  const pz = ca;
  /*
   * A date palm frond is a shallow arch, not a hanging strand: it lifts for
   * roughly its first third and only the last quarter turns down. Getting this
   * curve wrong is what turns a palm into a willow.
   *
   * Every surface here is single-sided. The frond material is DoubleSide, so
   * authoring back faces as well — which this used to do — doubled the triangle
   * count for no visible change. That budget goes into leaflet count instead,
   * and leaflet count is the only thing that makes a palm read as a palm.
   */
  const pt = (t: number, out: THREE.Vector3): THREE.Vector3 => {
    const r = t * length * (1 - 0.05 * t * t);
    const y = originY
      + Math.sin(Math.min(1, t * 1.3) * 1.42) * length * 0.27
      - droop * Math.pow(t, 3.0) * length * 0.44;
    return out.set(ca * r, y, sa * r);
  };

  // Rachis: a tapering strap, canted so it is not a zero-thickness ribbon.
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    pt(t0, _a);
    pt(t1, _b);
    const w0 = 0.045 * (1 - t0 * 0.8);
    const w1 = 0.045 * (1 - t1 * 0.8);
    _c.set(_b.x + px * w1, _b.y, _b.z + pz * w1);
    _d.set(_a.x + px * w0, _a.y, _a.z + pz * w0);
    _a.set(_a.x - px * w0, _a.y, _a.z - pz * w0);
    _b.set(_b.x - px * w1, _b.y, _b.z - pz * w1);
    addQuad(buf, _a, _b, _c, _d,
      [0, t0 * length, 0, t1 * length, w1 * 2, t1 * length, w0 * 2, t0 * length],
      [tint[0] * 0.9, tint[1] * 0.9, tint[2] * 0.86]);
  }

  // Leaflets, in opposed pairs, longest at mid-span and shortening to the tip.
  // The base fifth of a pruned date palm carries spines rather than leaves.
  const n = new THREE.Vector3();
  const along = new THREE.Vector3();
  const across = new THREE.Vector3();
  for (let i = 0; i < pairs; i++) {
    const t = 0.18 + (i / (pairs - 1)) * 0.82;
    pt(t, _a);
    const bx = _a.x;
    const by = _a.y;
    const bz = _a.z;
    const leafLen = length * 0.15 * Math.sin(Math.min(1, t * 1.06) * Math.PI * 0.82) + 0.1;
    // Leaflets alternate up and down the rachis, which is what gives a date
    // palm its ragged, feathered edge rather than a flat blade.
    const rank = i % 2 === 0 ? 1 : -1;
    for (const side of [-1, 1]) {
      /*
       * Swept hard toward the tip. A leaflet set perpendicular to the rachis
       * gives a fishbone; the real angle is nearer 40 degrees off perpendicular,
       * and that sweep is what makes the frond read as one tapering blade
       * instead of a row of separate leaves.
       */
      const spread = rng.range(0.82, 1.06);
      const drop = rng.range(0.1, 0.34) - rank * 0.12;
      const sweep = rng.range(0.5, 0.82);
      const tipX = bx + px * side * leafLen * spread + ca * leafLen * sweep;
      const tipZ = bz + pz * side * leafLen * spread + sa * leafLen * sweep;
      const tipY = by - leafLen * drop;
      // Mid-rib point lifted off the chord: the fold that catches the light.
      const foldX = (bx + tipX) * 0.5 + px * side * 0.02;
      const foldZ = (bz + tipZ) * 0.5 + pz * side * 0.02;
      const foldY = (by + tipY) * 0.5 + leafLen * 0.1 + rank * 0.02;
      const w = 0.05;
      const shade = 0.84 + rng.range(0, 0.3);
      const r = tint[0] * shade;
      const g = tint[1] * shade;
      const b = tint[2] * shade;

      along.set(tipX - bx, tipY - by, tipZ - bz);
      across.set(px * side, 0, pz * side);
      n.copy(across).cross(along).normalize();
      if (n.y < 0) n.negate();

      // Base edge, folded midpoint, tip: a quad and a closing triangle.
      const b0 = buf.vert(bx + ca * w, by + 0.02 * rank, bz + sa * w, n.x, n.y, n.z, 0, 0, r, g, b);
      buf.vert(bx - ca * w, by - 0.02 * rank, bz - sa * w, n.x, n.y, n.z, 0.09, 0, r, g, b);
      buf.vert(foldX - ca * w * 0.6, foldY - 0.012 * rank, foldZ - sa * w * 0.6,
        n.x, n.y, n.z, 0.08, leafLen * 0.5, r, g, b);
      buf.vert(foldX + ca * w * 0.6, foldY + 0.012 * rank, foldZ + sa * w * 0.6,
        n.x, n.y, n.z, 0.01, leafLen * 0.5, r, g, b);
      buf.vert(tipX, tipY, tipZ, n.x, n.y, n.z, 0.045, leafLen, r, g, b);
      buf.quad(b0, b0 + 1, b0 + 2, b0 + 3);
      buf.tri(b0 + 3, b0 + 2, b0 + 4);
    }
  }
}

/** The crown: dead skirt, living fronds, and a hanging bunch of dates. */
function palmCrown(
  buf: GeoBuf,
  rng: Rng,
  height: number,
  fronds: number,
  pairs: number,
  skirt: boolean,
): void {
  if (skirt) {
    // Dead skirt of cut fronds under the living crown.
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + rng.range(-0.2, 0.2);
      addBox(buf, Math.cos(a) * 0.27, height - 0.3, Math.sin(a) * 0.27, 0.54, 0.6, 0.12, {
        rotY: -a, color: [0.6, 0.48, 0.3],
      });
    }
  }
  // Three tiers: old fronds hanging low, mature fronds arching out, new
  // spears standing near-vertical out of the heart.
  for (let i = 0; i < fronds; i++) {
    const tier = i / fronds;
    const a = i * 2.399963 + rng.range(-0.12, 0.12);
    let len: number;
    let droop: number;
    let lift: number;
    if (tier < 0.38) {
      // Old fronds, past horizontal and on their way to the skirt. Capped well
      // short of vertical: a frond whose tip falls two metres below the heart
      // reads as a hanging vine, and a crown full of them reads as a willow.
      len = rng.range(2.9, 3.8);
      droop = rng.range(0.6, 0.85);
      lift = rng.range(-0.3, -0.08);
    } else if (tier < 0.8) {
      len = rng.range(3.0, 4.1);
      droop = rng.range(0.3, 0.55);
      lift = rng.range(0.0, 0.3);
    } else {
      // New spears out of the heart, still nearly upright.
      len = rng.range(1.3, 2.3);
      droop = rng.range(-0.45, -0.12);
      lift = rng.range(0.3, 0.6);
    }
    const dry = rng.next() < 0.16;
    const tint: RGB = dry
      ? [1.5, 1.24, 0.58]
      : [0.8 + rng.range(0, 0.32), 1.0, 0.74 + rng.range(0, 0.24)];
    palmFrond(buf, rng, height + lift, a, len, droop, tint, pairs);
  }
  // A bunch of dates on a stalk, hanging out of the heart on one side.
  if (skirt && rng.next() < 0.6) {
    const a = rng.range(0, Math.PI * 2);
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const r = 0.45 + t * 0.55;
      const spread = rng.range(0, 0.34);
      addBox(buf,
        Math.cos(a + rng.range(-0.5, 0.5)) * (r * 0.5 + spread),
        height - 0.16 - t * 0.72,
        Math.sin(a + rng.range(-0.5, 0.5)) * (r * 0.5 + spread),
        0.1, 0.16, 0.1,
        { rotY: rng.range(0, 3.14), color: [1.45, 0.86, 0.4] });
    }
  }
}

/* ----------------------------- registration ------------------------------ */

export function registerVegetation(batch: Batcher, density: number): void {
  registerVegetationMaterials(batch);

  const q = Math.min(1.15, 0.72 + density * 0.4);
  const frondCount = Math.max(16, Math.round(27 * q));
  // Roughly a leaflet every five centimetres along the rachis. Single-sided
  // leaflets cost half what the old doubled ones did, so this is affordable and
  // it is the difference between a feather and a fishbone.
  const leafPairs = Math.max(18, Math.round(30 * q));

  // Four palm silhouettes, so a row of them is not a row of one tree.
  for (let v = 0; v < 4; v++) {
    const rng = new Rng(0x9a11 + v * 977);
    const height = [6.6, 8.4, 5.4, 10.2][v];
    batch.defineProp({
      id: `palm_trunk_${v}`,
      material: 'bark',
      geometry: groundGeometry(makeGeometry((buf) => palmTrunk(buf, rng, height))),
      lodGeometry: groundGeometry(makeGeometry((buf) => {
        addCylinder(buf, 0, 0, 0, 0.28, height, { segments: 6, topRadius: 0.17, color: [1.05, 0.8, 0.56] });
      })),
      lodDistance: 80,
      castShadow: true,
      collide: true,
      hit: { group: Groups.PROP },
    });

    batch.defineProp({
      id: `palm_crown_${v}`,
      material: FROND_MAT,
      geometry: makeGeometry((buf) =>
        palmCrown(buf, new Rng(0x4c11 + v * 331), height, frondCount, leafPairs, true)),
      // The far crown keeps the same frond arcs at a third of the leaflets,
      // so the silhouette does not pop when it swaps.
      lodGeometry: makeGeometry((buf) =>
        palmCrown(buf, new Rng(0x4c11 + v * 331), height, Math.round(frondCount * 0.6), 11, false)),
      lodDistance: 62,
      castShadow: true,
      collide: false,
    });
  }

  /* --- dry scrub ---------------------------------------------------------- */

  for (let v = 0; v < 2; v++) {
    const rng = new Rng(0x5c2b + v * 613);
    batch.defineProp({
      id: `scrub_${v}`,
      material: SCRUB_MAT,
      /*
       * Open and twiggy, not a dome.
       *
       * The first pass stacked wide overlapping cards on a tight radius, and the
       * union of that is a solid blob: in shade it read as a dark green boulder
       * with a rounded top, which is the single most recognisable placeholder
       * shape in any environment. What makes a dead bush read is the gaps — a
       * sparse spray of narrow blades on a wide radius, with woody stems standing
       * clear of the mass and sky visible through the middle of it.
       */
      geometry: groundGeometry(makeGeometry((buf) => {
        const sprays = 7 + v * 3;
        for (let i = 0; i < sprays; i++) {
          const a = rng.range(0, Math.PI * 2);
          const d = rng.range(0.04, 0.4);
          const h = rng.range(0.26, 0.62);
          const w = rng.range(0.16, 0.38);
          const shade = rng.range(0.8, 1.3);
          /*
           * Straw, and it takes a very lopsided multiplier to get there. The
           * library's foliage is a healthy mid-green whose green channel is two to
           * three times its red, so a tint that merely dims green still resolves
           * green — the "dead" scrub was reading as bright living shrubbery, and at
           * the base of a courtyard wall it read as green glass. Red has to come up
           * several times over before the bush looks like it died two summers ago.
           */
          const col: RGB = [5.0 * shade, 1.9 * shade, 2.1 * shade];
          addBox(buf, Math.cos(a) * d, h * 0.5 + 0.03, Math.sin(a) * d, w, h, 0.008, {
            rotY: a + rng.range(-0.5, 0.5), color: col,
          });
        }
        // Woody stems standing clear of the leaf mass.
        for (let i = 0; i < 7; i++) {
          const a = rng.range(0, Math.PI * 2);
          const lean = rng.range(0.06, 0.22);
          const h = rng.range(0.35, 0.8);
          addBox(buf, Math.cos(a) * lean, h * 0.5, Math.sin(a) * lean,
            0.022, h, 0.022,
            { rotY: a, color: [0.9, 0.7, 0.4] });
        }
      })),
      lodDistance: 26,
      cullDistance: 62,
      castShadow: true,
      collide: false,
    });
  }

  /* --- weeds in cracks ----------------------------------------------------- */

  const weedRng = new Rng(0x77ee);
  batch.defineProp({
    id: 'weed',
    material: WEED_MAT,
    geometry: groundGeometry(makeGeometry((buf) => {
      for (let i = 0; i < 4; i++) {
        const a = weedRng.range(0, Math.PI);
        const h = weedRng.range(0.14, 0.34);
        const shade = weedRng.range(0.8, 1.2);
        addBox(buf, weedRng.range(-0.06, 0.06), h * 0.5, weedRng.range(-0.06, 0.06),
          weedRng.range(0.16, 0.3), h, 0.008,
          // Olive rather than green: still alive in the crack, but not a lawn.
          { rotY: a, color: [3.2 * shade, 1.7 * shade, 1.5 * shade] });
      }
    })),
    lodDistance: 16,
    /*
     * Culled early on purpose. A 20 cm blade is well under a pixel wide past
     * about thirty metres, so it survives only as an aliased speck that pops
     * with the camera; better to have the crack empty than stippled with dots.
     */
    cullDistance: 27,
    castShadow: false,
    collide: false,
  });

  /* --- potted plant -------------------------------------------------------- */

  const potRng = new Rng(0x1207);
  batch.defineProp({
    id: 'pot_plant',
    material: SCRUB_MAT,
    /*
     * A geranium in a pot: narrow blades radiating from a crown, not a ball.
     * Wide cards on a short radius made a dark green lump hovering above the
     * clay pot it is placed with, which is exactly how it read from knee height
     * in the souk.
     */
    geometry: groundGeometry(makeGeometry((buf) => {
      for (let i = 0; i < 11; i++) {
        const a = potRng.range(0, Math.PI * 2);
        const d = potRng.range(0.02, 0.16);
        const h = potRng.range(0.22, 0.48);
        const shade = potRng.range(0.85, 1.15);
        addBox(buf, Math.cos(a) * (d + 0.06), 0.28 + h * 0.5, Math.sin(a) * (d + 0.06),
          potRng.range(0.12, 0.26), h, 0.008, {
            rotY: a, color: [1.15 * shade, 1.75 * shade, 0.72 * shade],
          });
      }
      // A couple of flower heads, which is the whole reason anyone keeps one.
      for (let i = 0; i < 3; i++) {
        const a = potRng.range(0, Math.PI * 2);
        addBox(buf, Math.cos(a) * 0.12, potRng.range(0.5, 0.68), Math.sin(a) * 0.12,
          0.09, 0.09, 0.02, { rotY: a, color: [2.2, 0.9, 0.75] });
      }
    })),
    lodDistance: 24,
    cullDistance: 55,
    castShadow: true,
    collide: false,
  });
}
