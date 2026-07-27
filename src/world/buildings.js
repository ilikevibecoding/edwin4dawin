import * as THREE from 'three';
import { mat4, chunkGeo } from './geo.js';
import { wallDecal, groundDecal, groundHeight } from './streets.js';
import { rand, randRange, randInt, randPick } from '../core/rand.js';

/**
 * Modular war-torn buildings: real inset window openings, boarded/broken/
 * glazed variants, balconies, shop fronts with shutters/awnings/signs,
 * rooftop clutter, and structural collapse damage with exposed floor slabs.
 */

const FH0 = 3.9;   // ground floor height
const FH = 3.05;   // upper floor height
const T = 0.35;    // wall thickness

const SETS = {
  plaster:   { bucket: 'wall_plaster',   tints: [0xd8cdb2, 0xc9b995, 0xd3c3a0, 0xcdb695, 0xc4a98a] },
  plaster2:  { bucket: 'wall_plaster2',  tints: [0xd9d2c2, 0xcec6b4, 0xd6cbb8, 0xc8bda4] },
  concrete:  { bucket: 'wall_concrete',  tints: [0xc2b49c, 0xc9b8a0, 0xb8a890] },
  concrete2: { bucket: 'wall_concrete2', tints: [0xc6b69c, 0xbca990, 0xccbaa0] },
  brick:     { bucket: 'wall_brick',     tints: [0xd6c2a6, 0xc8b394, 0xd0bb9c] },
  brick2:    { bucket: 'wall_brick2',    tints: [0xd3ab8c, 0xc49e7e, 0xba9270] },
};

const FRAME_TINTS = [0x6b5a44, 0x54473a, 0x5f6d6a, 0x726250, 0x4a4f58];
const SHUTTER_TINTS = [0x5c6e66, 0x7a5347, 0x8a7d60, 0x687481, 0x7d7365, 0x566459];
// sun-bleached: any saturated hue here reads as pristine plastic against the
// dusty palette (the old teal awnings rendered as bright turquoise wedges)
const AWNING_TINTS = [0x84503f, 0x6e7a70, 0x8f815c, 0x707a82, 0x8a6a4f];
const BAND_TINTS = [0x6f7a6e, 0x8a6a4f, 0x7d6a52, 0x666e70];

export const LAYOUT = [
  // ---- inner NE block ----
  { x: 17.5, z: -17,  w: 12, d: 15, floors: 4, set: 'plaster',   shops: 'w', damage: { corner: 'sw', r: 7.5 } },
  { x: 17.5, z: -34,  w: 12, d: 14, floors: 3, set: 'brick',     shops: 'w' },
  { x: 32.5, z: -13.5, w: 11, d: 9, floors: 2, set: 'concrete2', shops: 's' },
  { x: 33,   z: -32,  w: 13, d: 12, floors: 5, set: 'concrete' },
  // ---- inner NW block ----
  { x: -17.5, z: -19,  w: 12, d: 18, floors: 5, set: 'plaster2', shops: 'e', balconies: true },
  { x: -17.5, z: -36,  w: 12, d: 10, floors: 2, set: 'brick2',   shops: 'e' },
  { x: -33.5, z: -14.5, w: 12, d: 10, floors: 3, set: 'concrete', shops: 's' },
  { x: -33.5, z: -33,  w: 12, d: 13, floors: 4, set: 'plaster' },
  // ---- inner SE block ----
  { x: 17.5, z: 19.5, w: 12, d: 15, floors: 4, set: 'brick',     shops: 'w', balconies: true },
  { x: 17.5, z: 36,   w: 12, d: 10, floors: 6, set: 'concrete2', damage: { corner: 'nw', r: 8 }, roofKit: true },
  { x: 33.5, z: 14.5, w: 12, d: 10, floors: 3, set: 'plaster',   shops: 'n' },
  { x: 34,   z: 33,   w: 11, d: 12, floors: 4, set: 'plaster2',  balconies: true },
  // ---- inner SW block (plaza) ----
  { x: -33.5, z: 15, w: 12, d: 11, floors: 4, set: 'concrete',  shops: 'n' },
  { x: -17,   z: 36, w: 13, d: 10, floors: 3, set: 'brick2',    shops: 'e' },
  { x: -33.5, z: 35, w: 12, d: 12, floors: 5, set: 'plaster',   shops: 'n', balconies: true },
  // ---- outer ring ----
  { x: 61,    z: -19,   w: 13, d: 15, floors: 3, set: 'brick2',    shops: 'w' },
  { x: 61.5,  z: 24,    w: 14, d: 13, floors: 4, set: 'concrete2' },
  { x: -61,   z: -27,   w: 13, d: 14, floors: 4, set: 'brick' },
  { x: -61.5, z: 18,    w: 13, d: 12, floors: 2, set: 'plaster2',  shops: 'e' },
  { x: -19,   z: -61,   w: 15, d: 12, floors: 3, set: 'plaster',   shops: 's' },
  { x: 16.5,  z: -61.5, w: 13, d: 11, floors: 4, set: 'brick2' },
  { x: 20,    z: 61,    w: 14, d: 12, floors: 3, set: 'concrete',  shops: 'n' },
  { x: -21,   z: 61.5,  w: 13, d: 11, floors: 4, set: 'plaster2' },
];

const CORNERS = { ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };

export function buildBuildings(ctx) {
  const out = { rubbleSpots: [], wireAnchors: [], craterHints: [] };
  for (const spec of LAYOUT) buildOne(ctx, spec, out);
  buildMidRing(ctx);
  return out;
}

/**
 * Simple lit filler blocks between the playable bounds and the far skyline so
 * rooftop vistas don't show an empty plain. No collision — out of reach.
 */
function buildMidRing(ctx) {
  const { buckets } = ctx;
  const wallSets = ['wall_concrete', 'wall_plaster', 'wall_plaster2', 'wall_concrete2'];
  // muted earth tones: fog + haze veils wash these considerably, so they must
  // START well below the sky value or the ring reads as pale cardboard prisms
  const tints = [0xa4967c, 0x998a70, 0x94897a, 0x9c8666, 0x8c7d68, 0x827158, 0x776a56, 0x8a7660];
  for (let a = 0; a < Math.PI * 2; a += randRange(0.17, 0.3)) {
    const r = randRange(96, 122);
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const w = randRange(9, 17), d = randRange(8, 15);
    const fl = randInt(2, 5);
    const h = 3.2 * fl + randRange(0, 1.4);
    const ry = -(a + Math.PI / 2) + randRange(-0.09, 0.09);
    const wb = randPick(wallSets);
    const tc = new THREE.Color(randPick(tints)).offsetHSL(randRange(-0.008, 0.008), randRange(-0.04, 0.02), randRange(-0.05, 0.03));
    buckets.box(wb, w, h, d, mat4(bx, h / 2 - 0.3, bz, 0, ry, 0), { color: tc, uvOffset: [rand() * 4, rand() * 4] });
    buckets.box('slab', w + 0.24, 0.2, d + 0.24, mat4(bx, h - 0.2, bz, 0, ry, 0), { color: 0x968c7a });
    // dark window strips on every face so no side reads as a bare slab
    const fx = Math.sin(ry), fz = Math.cos(ry);
    const sx = Math.cos(ry), sz = -Math.sin(ry); // local +x direction
    for (let f = 1; f < fl; f++) {
      const wy = 1.15 + f * 3.2;
      if (rand() < 0.92) {
        buckets.box('darkIn', w * randRange(0.7, 0.86), randRange(0.85, 1.05), 0.07,
          mat4(bx + fx * (d / 2 + 0.05), wy, bz + fz * (d / 2 + 0.05), 0, ry, 0));
      }
      if (rand() < 0.85) {
        buckets.box('darkIn', w * randRange(0.7, 0.86), randRange(0.85, 1.05), 0.07,
          mat4(bx - fx * (d / 2 + 0.05), wy, bz - fz * (d / 2 + 0.05), 0, ry, 0));
      }
      for (const s of [-1, 1]) {
        if (rand() < 0.78) {
          buckets.box('darkIn', 0.07, randRange(0.85, 1.05), d * randRange(0.68, 0.84),
            mat4(bx + s * sx * (w / 2 + 0.05), wy, bz + s * sz * (w / 2 + 0.05), 0, ry, 0));
        }
      }
    }
    // occasional rooftop mass for silhouette variety
    if (rand() < 0.35) {
      buckets.box(wb, w * 0.34, randRange(1.8, 2.6), d * 0.34,
        mat4(bx + randRange(-w / 5, w / 5), h + 0.8, bz + randRange(-d / 5, d / 5), 0, ry, 0), { color: tc });
    }
    if (rand() < 0.3) {
      buckets.push('rustMetal', new THREE.CylinderGeometry(0.75, 0.75, 1.4, 9),
        mat4(bx + randRange(-w / 5, w / 5), h + 0.55, bz + randRange(-d / 5, d / 5)), { color: 0xffffff });
    }
  }
}

function yBase(f) { return f === 0 ? 0 : FH0 + (f - 1) * FH; }

function buildOne(ctx, spec, out) {
  const { buckets, navgrid, addBoxCollider } = ctx;
  const { x, z, w, d, floors } = spec;
  const set = SETS[spec.set];
  const wallB = set.bucket;
  const tint = new THREE.Color(randPick(set.tints)).offsetHSL(randRange(-0.01, 0.01), randRange(-0.03, 0.03), randRange(-0.03, 0.03));
  const tintDark = tint.clone().multiplyScalar(0.82);
  const trimTint = new THREE.Color(0xffffff).multiplyScalar(randRange(0.82, 1.0));
  const frameTint = new THREE.Color(randPick(FRAME_TINTS));
  const H = yBase(floors - 1) + (floors === 1 ? FH0 : FH);
  const uvOff = [rand() * 4, rand() * 4]; // texture phase per building
  const hasBand = rand() < 0.4;
  const bandTint = new THREE.Color(randPick(BAND_TINTS)).multiplyScalar(randRange(0.8, 1));

  const dmg = spec.damage;
  const dc = dmg ? CORNERS[dmg.corner] : null;
  const dcx = dmg ? dc[0] * w / 2 : 0;
  const dcz = dmg ? dc[1] * d / 2 : 0;
  const damageAt = (lx, ly, lz) => {
    if (!dmg) return false;
    const R = dmg.r * (0.28 + 0.78 * ly / H);
    return Math.hypot(lx - dcx, lz - dcz) < R;
  };
  const nearDamage = (lx, ly, lz, mul = 1.7) => {
    if (!dmg) return false;
    const R = dmg.r * (0.28 + 0.78 * ly / H) * mul;
    return Math.hypot(lx - dcx, lz - dcz) < R;
  };

  const wallBox = (side, u, y0, uw, hh, { thick = T, depth = thick / 2, tintOv = null, rz = 0, dOut = 0 } = {}) => {
    if (uw < 0.025 || hh < 0.025) return;
    const nx = Math.sin(side.angle), nz = Math.cos(side.angle);
    const cx = x + side.ux * u + side.ox + nx * (dOut - depth);
    const cz = z + side.uz * u + side.oz + nz * (dOut - depth);
    const m = mat4(cx, y0 + hh / 2, cz, 0, side.angle, 0).multiply(mat4(0, 0, 0, 0, 0, rz));
    buckets.box(wallB, uw, hh, thick, m, { color: tintOv ?? tint, uvOffset: uvOff });
  };
  // generic piece placed relative to a side (any bucket)
  const sidePiece = (bucket, side, geo, u, cy, depthOut, opts = {}, extraM = null) => {
    const nx = Math.sin(side.angle), nz = Math.cos(side.angle);
    const cx = x + side.ux * u + side.ox + nx * depthOut;
    const cz = z + side.uz * u + side.oz + nz * depthOut;
    let m = mat4(cx, cy, cz, 0, side.angle, 0);
    if (extraM) m = m.multiply(extraM);
    buckets.push(bucket, geo, m, opts);
  };

  const sides = [
    { id: 'n', len: w, angle: Math.PI, ox: 0, oz: -d / 2, ux: 1, uz: 0 },
    { id: 's', len: w, angle: 0, ox: 0, oz: d / 2, ux: 1, uz: 0 },
    { id: 'e', len: d - 0.7, angle: Math.PI / 2, ox: w / 2, oz: 0, ux: 0, uz: 1 },
    { id: 'w', len: d - 0.7, angle: -Math.PI / 2, ox: -w / 2, oz: 0, ux: 0, uz: 1 },
  ];
  // local point on a side (for damage tests): u along side -> (lx, lz)
  const sideLocal = (side, u) => [side.ux * u + side.ox * 1, side.uz * u + side.oz * 1];

  // ---- plinth -------------------------------------------------------------
  buckets.box('trim', w + 0.24, 0.3, d + 0.24, mat4(x, 0.15, z), { color: trimTint.clone().multiplyScalar(0.85) });

  // ---- facades ------------------------------------------------------------
  for (const side of sides) {
    const isEW = side.id === 'e' || side.id === 'w';
    const outerOff = isEW ? -0.012 : 0; // avoid coplanar corner faces
    if (isEW) { side.ox -= Math.sign(side.ox) * 0.012; }
    const nb = Math.max(1, Math.round((side.len - 1.4) / 3.3));
    const bayW = (side.len - 1.4) / nb;
    const isShops = spec.shops === side.id;

    for (let f = 0; f < floors; f++) {
      const y0 = yBase(f);
      const fhF = f === 0 ? FH0 : FH;
      // end margins
      for (const s of [-1, 1]) {
        const mu = s * (side.len / 2 - 0.35);
        const [lx, lz] = sideLocal(side, mu);
        if (!damageAt(lx, y0 + fhF / 2, lz)) {
          wallBox(side, mu, y0, 0.7, fhF);
        } else if (f === 0) {
          wallBox(side, mu, 0, 0.7, randRange(0.5, 1.6), { rz: randRange(-0.06, 0.06), tintOv: tintDark });
        } else if (!damageAt(lx, yBase(f - 1) + (f - 1 === 0 ? FH0 : FH) / 2, lz)) {
          jaggedEdge(side, mu, y0, fhF);
        }
      }
      for (let i = 0; i < nb; i++) {
        const cu = -side.len / 2 + 0.7 + (i + 0.5) * bayW;
        const [lx, lz] = sideLocal(side, cu);
        if (damageAt(lx, y0 + fhF / 2, lz)) {
          // collapsed cell: jagged remnants only where they attach to something
          const [lxL, lzL] = sideLocal(side, cu - bayW);
          const [lxR, lzR] = sideLocal(side, cu + bayW);
          const leftIntact = !damageAt(lxL, y0 + fhF / 2, lzL);
          const rightIntact = !damageAt(lxR, y0 + fhF / 2, lzR);
          const yBelow = f > 0 ? yBase(f - 1) + (f - 1 === 0 ? FH0 : FH) / 2 : 0;
          const belowIntact = f === 0 || !damageAt(lx, yBelow, lz);
          if (leftIntact) jaggedEdge(side, cu - bayW / 2 + 0.22, y0, fhF, 0.25);
          if (rightIntact) jaggedEdge(side, cu + bayW / 2 - 0.22, y0, fhF, 0.25);
          if (f === 0) {
            // broken wall stumps at street level
            for (let k = 0; k < 3; k++) {
              const su = cu + randRange(-bayW / 2 + 0.3, bayW / 2 - 0.3);
              wallBox(side, su, 0, randRange(0.35, 0.8), randRange(0.4, 1.4),
                { rz: randRange(-0.12, 0.12), tintOv: tintDark });
            }
          } else if (belowIntact) {
            // rubble lip sitting on the surviving wall below
            for (let k = 0; k < 2; k++) {
              wallBox(side, cu + randRange(-bayW / 3, bayW / 3), y0 + randRange(0, 0.15),
                randRange(0.3, 0.6), randRange(0.25, 0.55), { rz: randRange(-0.3, 0.3), tintOv: tintDark });
            }
          }
          continue;
        }
        const blast = nearDamage(lx, y0 + fhF / 2, lz);
        buildCell(side, f, i, cu, bayW, y0, fhF, isShops, blast);
      }
    }
    // painted base band
    if (hasBand && !isEW) {
      wallBox(side, 0, 0.28, side.len - 0.1, 1.15, { thick: 0.05, depth: 0.0, dOut: 0.028, tintOv: bandTint });
    }
    // base grime
    wallDecal(buckets, 'decalGrime',
      x + side.ox + Math.sin(side.angle) * 0.045, 0.75, z + side.oz + Math.cos(side.angle) * 0.045,
      side.len - 0.3, 1.5, side.angle, 0xffffff);
    // occasional scorch streak on facade
    if (rand() < 0.3) {
      const su = randRange(-side.len / 3, side.len / 3);
      wallDecal(buckets, 'decalScorch',
        x + side.ux * su + side.ox + Math.sin(side.angle) * 0.05, randRange(1.4, H - 1),
        z + side.uz * su + side.oz + Math.cos(side.angle) * 0.05,
        randRange(1.5, 3), randRange(1.5, 3.5), side.angle, 0xffffff);
    }
  }

  function jaggedEdge(side, cu, y0, fhF, span = 0.25) {
    // broken teeth along a vertical tear line
    const n = randInt(2, 3);
    let yy = y0;
    for (let k = 0; k < n; k++) {
      const uw = randRange(0.25, 0.55), hh = randRange(0.35, 0.85);
      if (yy + hh > y0 + fhF) break;
      wallBox(side, cu + randRange(-span, span), yy, uw, hh,
        { rz: randRange(-0.22, 0.22), tintOv: tintDark });
      yy += hh + randRange(0.1, 0.5);
    }
  }

  // ---- one facade cell ------------------------------------------------------
  function buildCell(side, f, i, cu, bayW, y0, fhF, isShops, blast) {
    const cellSeed = rand();
    // ground-floor shop front
    if (f === 0 && isShops) {
      buildShop(side, cu, bayW);
      return;
    }
    // blank cell (solid wall)
    if (cellSeed < 0.13) { wallBox(side, cu, y0, bayW, fhF); return; }

    const isDoor = f === 0 && cellSeed < 0.3;
    const balc = !isDoor && f > 0 && spec.balconies && rand() < 0.34;
    const wW = balc || isDoor ? 1.15 : Math.min(1.5, bayW - 0.8);
    const wH = balc || isDoor ? 2.2 : (f === 0 ? 1.35 : 1.6);
    const sill = balc || isDoor ? 0.02 : (f === 0 ? 1.7 : 1.0);
    const pier = (bayW - wW) / 2;

    wallBox(side, cu - bayW / 2 + pier / 2, y0, pier, fhF);
    wallBox(side, cu + bayW / 2 - pier / 2, y0, pier, fhF);
    wallBox(side, cu, y0, wW, sill);
    wallBox(side, cu, y0 + sill + wH, wW, fhF - sill - wH);

    // content variant (chosen first: shutters replace frames)
    const v = blast ? randRange(0.36, 0.75) : rand();
    const isShutterVar = v >= 0.78 && v < 0.9 && !isDoor && !balc;

    // frame (1cm sunk into surrounding wall to avoid coplanar faces)
    if (!isShutterVar) {
      const fr = (uOff, yC, fw, fhh) => {
        sidePiece('frame', side, new THREE.BoxGeometry(fw, fhh, 0.07), cu + uOff, yC, -0.16, { color: frameTint });
      };
      fr(-wW / 2 + 0.03, y0 + sill + wH / 2, 0.08, wH + 0.02);
      fr(wW / 2 - 0.03, y0 + sill + wH / 2, 0.08, wH + 0.02);
      fr(0, y0 + sill + wH - 0.03, wW - 0.12, 0.08);
      fr(0, y0 + sill + 0.03, wW - 0.12, 0.08);
    }
    // sill trim
    sidePiece('trim', side, new THREE.BoxGeometry(wW + 0.2, 0.07, 0.16), cu, y0 + sill - 0.045, 0.055, { color: trimTint });

    if (v < 0.36) {
      // glass (sometimes partially broken)
      const panes = rand() < 0.24 && !blast;
      if (panes) {
        // broken: keep 2 of 4 panes
        const pw = (wW - 0.16) / 2, ph = wH / 2;
        const keep = [rand() < 0.7, rand() < 0.7, rand() < 0.5, rand() < 0.5];
        let k = 0;
        for (const px of [-1, 1]) for (const py of [-1, 1]) {
          if (keep[k++]) {
            sidePiece('glass', side, new THREE.PlaneGeometry(pw - 0.02, ph - 0.02),
              cu + px * pw / 2, y0 + sill + wH / 2 + py * ph / 2, -0.2, { color: 0xffffff });
          }
        }
      } else {
        sidePiece('glass', side, new THREE.PlaneGeometry(wW - 0.12, wH - 0.12),
          cu, y0 + sill + wH / 2, -0.2, { color: 0xffffff });
      }
    } else if (v < 0.58) {
      // dark open (interior box shows through)
    } else if (v < 0.78) {
      // boarded with planks
      const n = randInt(3, 4);
      for (let b = 0; b < n; b++) {
        const bt = new THREE.Color(0xffffff).multiplyScalar(randRange(0.55, 0.95));
        sidePiece('woodPale', side, new THREE.BoxGeometry(wW + randRange(0.15, 0.4), 0.21, 0.04),
          cu + randRange(-0.06, 0.06), y0 + sill + (b + 0.5) * (wH / n), -0.1,
          { color: bt }, mat4(0, 0, 0, 0, 0, randRange(-0.13, 0.13)));
      }
    } else if (isShutterVar) {
      // closed metal shutter
      const st = new THREE.Color(randPick(SHUTTER_TINTS)).multiplyScalar(randRange(0.8, 1.05));
      sidePiece('shutter2', side, new THREE.BoxGeometry(wW - 0.06, wH - 0.06, 0.045), cu, y0 + sill + wH / 2, -0.13, { color: st });
    } else if (isDoor) {
      const dt = new THREE.Color(randPick(FRAME_TINTS)).multiplyScalar(randRange(0.75, 1));
      sidePiece('woodDark', side, new THREE.BoxGeometry(wW - 0.1, wH - 0.08, 0.06), cu, y0 + wH / 2 - 0.02, -0.19, { color: dt });
      // door step
      sidePiece('trim', side, new THREE.BoxGeometry(wW + 0.4, 0.18, 0.5), cu, 0.09, 0.28, { color: trimTint });
    }

    // balcony
    if (balc) {
      const bw = Math.min(bayW - 0.5, 2.4);
      sidePiece('trim', side, new THREE.BoxGeometry(bw, 0.12, 1.05), cu, y0 + 0.06, 0.525, { color: trimTint });
      const railTint = new THREE.Color(0x2e2b28);
      const rail = (uu, yy, ww, hh, dd, dOut) => {
        sidePiece('metalDark', side, new THREE.BoxGeometry(ww, hh, dd), cu + uu, yy, dOut, { color: railTint });
      };
      rail(0, y0 + 1.02, bw, 0.05, 0.05, 1.02);        // front top rail
      rail(0, y0 + 0.55, bw, 0.035, 0.035, 1.02);      // front mid rail
      rail(-bw / 2 + 0.02, y0 + 1.02, 0.05, 0.05, 1.0, 0.52);
      rail(bw / 2 - 0.02, y0 + 1.02, 0.05, 0.05, 1.0, 0.52);
      const nBars = Math.floor(bw / 0.24);
      for (let b = 0; b <= nBars; b++) {
        const uu = -bw / 2 + b * (bw / nBars);
        if (rand() < 0.06) continue; // missing bar
        rail(uu, y0 + 0.56, 0.025, 0.92, 0.025, 1.0);
      }
      // side bars
      for (const s of [-1, 1]) for (let b = 1; b < 4; b++) {
        rail(s * (bw / 2 - 0.02), y0 + 0.56, 0.025, 0.92, 0.025, 0.13 + b * 0.26);
      }
    }

    // AC unit
    if (!balc && !isDoor && f > 0 && rand() < 0.17) {
      const acTint = new THREE.Color(0xd6d1c4).multiplyScalar(randRange(0.7, 0.98));
      const acU = cu + randRange(-0.2, 0.2);
      sidePiece('rustMetal', side, new THREE.BoxGeometry(0.74, 0.52, 0.44),
        acU, y0 + sill - 0.3, 0.24, { color: acTint }, mat4(0, 0, 0, 0, 0, randRange(-0.03, 0.03)));
      sidePiece('metalDark', side, new THREE.BoxGeometry(0.6, 0.38, 0.05),
        acU, y0 + sill - 0.3, 0.47, { color: 0x4c473f });
      // rust streak under it
      wallDecal(buckets, 'decalGrime',
        x + side.ux * cu + side.ox + Math.sin(side.angle) * 0.04,
        y0 + sill - 1.05,
        z + side.uz * cu + side.oz + Math.cos(side.angle) * 0.04,
        0.6, 1.1, side.angle, 0xffffff);
    }
    // scorch above some dark openings
    if (v >= 0.36 && v < 0.58 && rand() < (blast ? 0.75 : 0.2)) {
      wallDecal(buckets, 'decalScorch',
        x + side.ux * cu + side.ox + Math.sin(side.angle) * 0.05,
        y0 + sill + wH + 0.3,
        z + side.uz * cu + side.oz + Math.cos(side.angle) * 0.05,
        wW + randRange(0.3, 0.9), randRange(1.0, 1.6), side.angle, 0xffffff);
    }
  }

  // ---- shop front cell -------------------------------------------------------
  function buildShop(side, cu, bayW) {
    const ow = bayW - 0.9, oh = 2.95;
    const pier = (bayW - ow) / 2;
    wallBox(side, cu - bayW / 2 + pier / 2, 0, pier, FH0, { tintOv: tintDark });
    wallBox(side, cu + bayW / 2 - pier / 2, 0, pier, FH0, { tintOv: tintDark });
    wallBox(side, cu, oh, ow, FH0 - oh); // header
    const roll = rand();
    if (roll < 0.5) {
      // shutter fully closed
      const st = new THREE.Color(randPick(SHUTTER_TINTS)).multiplyScalar(randRange(0.75, 1.05));
      sidePiece('shutter', side, new THREE.BoxGeometry(ow - 0.04, oh - 0.1, 0.06), cu, oh / 2 - 0.02, -0.16, { color: st });
    } else if (roll < 0.72) {
      // half open — dark below
      const st = new THREE.Color(randPick(SHUTTER_TINTS)).multiplyScalar(randRange(0.75, 1.05));
      sidePiece('shutter', side, new THREE.BoxGeometry(ow - 0.04, oh * 0.55, 0.06), cu, oh - oh * 0.275, -0.16, { color: st });
    }
    // sign board (atlas strip q: v from 1-(q+1)*0.25 to 1-q*0.25 with flipY)
    if (rand() < 0.8) {
      const q = randInt(0, 3);
      const v0 = 1 - (q + 1) * 0.25;
      const roll2 = rand();
      const hang = roll2 < 0.22;            // mount failed on one side — crooked
      const broken = !hang && roll2 < 0.36; // part of the panel torn away
      const rz = hang ? (rand() < 0.5 ? 1 : -1) * randRange(0.06, 0.14) : randRange(-0.012, 0.012);
      const yD = hang ? -randRange(0.04, 0.1) : 0;
      const tilt = mat4(0, 0, 0, 0, 0, rz);
      // grime shadow the box casts down the wall — grounds the sign visually
      wallDecal(buckets, 'decalGrime',
        x + side.ux * cu + side.ox + Math.sin(side.angle) * 0.03,
        FH0 - 1.0,
        z + side.uz * cu + side.oz + Math.cos(side.angle) * 0.03,
        ow * 0.9, 0.8, side.angle, 0x35302a);
      const fw = ow + 0.3; // mounting box always full width; torn panels expose it
      sidePiece('frame', side, new THREE.BoxGeometry(fw, 0.66, 0.09), cu, FH0 - 0.52 + yD, 0.05,
        { color: new THREE.Color(0x2c2a26) }, tilt);
      // drip-edge lip over the face gives the box a beveled top shadow line
      sidePiece('frame', side, new THREE.BoxGeometry(fw + 0.06, 0.05, 0.14), cu, FH0 - 0.52 + yD + 0.33, 0.07,
        { color: new THREE.Color(0x1f1d1a) }, tilt);
      const sw = broken ? (ow + 0.24) * 0.62 : ow + 0.24;
      const su = broken ? cu - (ow + 0.24) * 0.18 : cu;
      sidePiece('sign', side, new THREE.PlaneGeometry(sw, 0.6), su, FH0 - 0.52 + yD, 0.10,
        { color: new THREE.Color(0xffffff).multiplyScalar(randRange(0.6, 0.92)),
          uvRegion: [0.01, v0 + 0.005, broken ? 0.62 : 0.99, v0 + 0.245] }, tilt);
    }
    // awning
    if (rand() < 0.62) {
      const at = new THREE.Color(randPick(AWNING_TINTS)).offsetHSL(0, randRange(-0.1, 0), randRange(-0.06, 0.02));
      const droop = randRange(0.45, 0.62);
      const aw = ow + randRange(0.1, 0.5);
      const geo = new THREE.PlaneGeometry(aw, 1.5, 6, 3);
      // slight cloth sag
      const p = geo.attributes.position;
      for (let vi = 0; vi < p.count; vi++) {
        const px = p.getX(vi) / aw, py = p.getY(vi) / 1.5;
        p.setZ(vi, -Math.sin((px + 0.5) * Math.PI) * 0.09 * (0.5 - py));
      }
      sidePiece('fabric', side, geo, cu, FH0 - 0.95, 0.72, { color: at },
        mat4(0, 0, 0, -Math.PI / 2 + droop, 0, 0));
      // support struts
      for (const s of [-1, 1]) {
        sidePiece('metalDark', side, new THREE.BoxGeometry(0.04, 0.04, 1.45), cu + s * (aw / 2 - 0.1),
          FH0 - 1.0 - 0.35, 0.7, { color: 0x333029 }, mat4(0, 0, 0, droop * 0.55, 0, 0));
      }
    }
  }

  // ---- interior dark shell (0.45m behind facades for window parallax) --------
  // Damaged buildings get an L-shaped shell that leaves the gutted corner
  // quadrant open so the exposed floor slabs read instead of a black wall.
  const qw = dmg ? Math.min(w - 2.6, dmg.r + 1.2) : 0;
  const qd = dmg ? Math.min(d - 2.6, dmg.r + 1.2) : 0;
  if (dmg) {
    const Wi = w - 0.9, Di = d - 0.9;
    buckets.box('darkIn', Wi - qw, H - 0.4, Di, mat4(x - dc[0] * qw / 2, H / 2 - 0.05, z), { color: 0xffffff });
    buckets.box('darkIn', qw, H - 0.4, Di - qd,
      mat4(x + dc[0] * (Wi - qw) / 2, H / 2 - 0.05, z - dc[1] * qd / 2), { color: 0xffffff });
  } else {
    buckets.box('darkIn', w - 0.9, H - 0.4, d - 0.9, mat4(x, H / 2 - 0.05, z), { color: 0xffffff });
  }

  // ---- roof -------------------------------------------------------------------
  const parTint = tint.clone().multiplyScalar(0.94);
  if (dmg) {
    const WR = w - 0.15, DR = d - 0.15;
    buckets.box('slab', WR - qw, 0.2, DR, mat4(x - dc[0] * qw / 2, H + 0.1, z), { color: 0xffffff, uvOffset: uvOff });
    buckets.box('slab', qw, 0.2, DR - qd,
      mat4(x + dc[0] * (WR - qw) / 2, H + 0.1, z - dc[1] * qd / 2), { color: 0xffffff, uvOffset: uvOff });
  } else {
    buckets.box('slab', w - 0.15, 0.2, d - 0.15, mat4(x, H + 0.1, z), { color: 0xffffff, uvOffset: uvOff });
  }
  // parapet with damage-aware gaps
  const parapet = (side) => {
    const segs = 4;
    const segLen = side.len / segs;
    for (let i = 0; i < segs; i++) {
      const u = -side.len / 2 + (i + 0.5) * segLen;
      const [lx, lz] = sideLocal(side, u);
      if (damageAt(lx, H, lz)) continue;
      const nx = Math.sin(side.angle), nz = Math.cos(side.angle);
      const cx = x + side.ux * u + side.ox + nx * (-T / 2);
      const cz = z + side.uz * u + side.oz + nz * (-T / 2);
      const hh = rand() < 0.06 ? randRange(0.25, 0.5) : 0.72; // occasional broken low run
      buckets.box(wallB, segLen - 0.02, hh, 0.24, mat4(cx, H + 0.2 + hh / 2, cz, 0, side.angle, 0), { color: parTint, uvOffset: uvOff });
      if (hh > 0.6) {
        buckets.box('trim', segLen - 0.02, 0.07, 0.32, mat4(cx, H + 0.2 + hh + 0.035, cz, 0, side.angle, 0), { color: trimTint });
      }
    }
  };
  for (const side of sides) parapet(side);

  // rooftop clutter
  const roofY = H + 0.2;
  const rr = () => randRange(-0.5, 0.5);
  // random roof point kept out of the collapsed quadrant
  const rpos = (rw, rd) => {
    let px = x + randRange(-rw, rw), pz = z + randRange(-rd, rd);
    if (dmg && Math.sign(px - x) === dc[0] && Math.sign(pz - z) === dc[1]) px = x - (px - x);
    return [px, pz];
  };
  const kit = spec.roofKit;
  if (rand() < 0.55 || kit) {
    // stair bulkhead (kept clear of the collapsed corner on damaged buildings)
    const sx3 = dmg ? -dc[0] : Math.sign(rr() || 0.3);
    const sz3 = dmg ? -dc[1] : Math.sign(rr() || 0.3);
    const bx = x + (w / 2 - 1.7) * sx3, bz = z + (d / 2 - 1.9) * sz3;
    buckets.box(wallB, 2.4, 2.5, 2.8, mat4(bx, roofY + 1.25, bz), { color: tint, uvOffset: uvOff });
    buckets.box('slab', 2.7, 0.14, 3.1, mat4(bx, roofY + 2.55, bz), { color: 0xffffff });
    buckets.box('frame', 0.9, 1.9, 0.06, mat4(bx, roofY + 0.95, bz + (sz3 > 0 ? -1.42 : 1.42)), { color: frameTint });
  }
  if (rand() < 0.6 || kit) {
    // water tank on legs
    const [tx, tz] = rpos(w / 4, d / 4);
    const tankB = rand() < 0.5 ? 'rustMetal' : 'metalPainted';
    const tTint = tankB === 'metalPainted' ? new THREE.Color(0xd8d4c8) : new THREE.Color(0xffffff);
    const r = randRange(0.7, 1.0);
    buckets.push(tankB, new THREE.CylinderGeometry(r, r, 1.5, 12), mat4(tx, roofY + 1.45, tz), { color: tTint });
    buckets.push(tankB, new THREE.CylinderGeometry(r * 0.4, r, 0.3, 12), mat4(tx, roofY + 2.35, tz), { color: tTint });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      buckets.box('metalDark', 0.08, 0.7, 0.08, mat4(tx + sx * r * 0.6, roofY + 0.35, tz + sz * r * 0.6), { color: 0x3a352e });
    }
  }
  if (rand() < 0.5 || kit) {
    // AC unit: plain weathered sheet body + dark grille inset
    const [ax, az] = rpos(w / 3, d / 3);
    const ry2 = rand() * Math.PI;
    buckets.box('rustMetal', 1.3, 0.75, 0.85, mat4(ax, roofY + 0.375, az, 0, ry2, 0), { color: 0xc9c4b6 });
    buckets.box('metalDark', 1.06, 0.5, 0.06, mat4(ax, roofY + 0.38, az, 0, ry2, 0).multiply(mat4(0, 0, 0.41)), { color: 0x4c473f });
  }
  // bitumen repair patches breaking up the roof plane
  const nPatch = randInt(1, 3);
  for (let p = 0; p < nPatch; p++) {
    const [px2, pz2] = rpos(w / 3, d / 3);
    buckets.box('slab', randRange(1.5, 3.4), 0.025, randRange(1.3, 3),
      mat4(px2, roofY + 0.013, pz2, 0, rand() * Math.PI, 0),
      { color: new THREE.Color(0x6f695f).offsetHSL(0, 0, randRange(-0.05, 0.04)) });
  }
  // pipe run + vent stack
  if ((rand() < 0.65 || kit) && !dmg) {
    const alongX = rand() < 0.5;
    const plen = (alongX ? w : d) - randRange(2.5, 4.5);
    const [ppx, ppz] = rpos(alongX ? 0.01 : w / 3.2, alongX ? d / 3.2 : 0.01);
    buckets.push('rustMetal', new THREE.CylinderGeometry(0.055, 0.055, plen, 6),
      mat4(ppx, roofY + 0.07, ppz, alongX ? 0 : Math.PI / 2, 0, alongX ? Math.PI / 2 : 0), { color: 0xffffff });
  }
  if (rand() < 0.6 || kit) {
    const [vx, vz] = rpos(w / 3, d / 3);
    buckets.push('rustMetal', new THREE.CylinderGeometry(0.09, 0.1, 0.75, 7), mat4(vx, roofY + 0.375, vz), { color: 0xffffff });
    buckets.push('metalDark', new THREE.CylinderGeometry(0.17, 0.12, 0.12, 7), mat4(vx, roofY + 0.78, vz), { color: 0x3f3a33 });
  }
  // plank junk pile
  if (rand() < 0.45 || kit) {
    const [jx, jz] = rpos(w / 3.4, d / 3.4);
    const nPl = randInt(2, 4);
    for (let k = 0; k < nPl; k++) {
      buckets.box('woodDark', randRange(0.9, 1.7), 0.05, randRange(0.12, 0.22),
        mat4(jx + randRange(-0.35, 0.35), roofY + 0.028 + k * 0.052, jz + randRange(-0.3, 0.3), 0, rand() * Math.PI, 0),
        { color: new THREE.Color(0x8a7458).offsetHSL(randRange(-0.01, 0.01), randRange(-0.04, 0.04), randRange(-0.1, 0.06)) });
    }
  }
  // antennas
  const nAnt = randInt(1, 3);
  for (let a = 0; a < nAnt; a++) {
    const [ax, az] = rpos(w / 2.4, d / 2.4);
    const ah = randRange(1.8, 4.2);
    buckets.push('metalDark', new THREE.CylinderGeometry(0.022, 0.03, ah, 5), mat4(ax, roofY + ah / 2, az, randRange(-0.04, 0.04), 0, randRange(-0.04, 0.04)), { color: 0x2e2b28 });
    if (rand() < 0.6) buckets.box('metalDark', 0.5, 0.02, 0.02, mat4(ax, roofY + ah * 0.8, az, 0, rand() * Math.PI, 0), { color: 0x2e2b28 });
  }
  if (rand() < 0.5 || kit) {
    // satellite dish: shallow sphere-cap on a short mast, aimed at the sky
    const [sx2, sz2] = rpos(w / 3, d / 3);
    const cap = new THREE.SphereGeometry(0.55, 10, 5, 0, Math.PI * 2, 0, 0.62);
    cap.translate(0, -0.42, 0);
    buckets.push('metalPainted', cap,
      mat4(sx2, roofY + 0.8, sz2, randRange(1.7, 2.1), rand() * Math.PI * 2, 0), { color: 0xd5d0c2 });
    buckets.box('metalDark', 0.05, 0.62, 0.05, mat4(sx2, roofY + 0.31, sz2), { color: 0x3a352e });
  }
  // clothesline with cloth
  if (rand() < 0.32 && !dmg) {
    const ly = roofY + 1.15;
    const lx0 = x - w / 4, lx1 = x + w / 4, lz0 = z + randRange(-d / 4, d / 4);
    for (const px of [lx0, lx1]) buckets.box('metalDark', 0.04, 1.3, 0.04, mat4(px, roofY + 0.65, lz0), { color: 0x3a352e });
    buckets.box('wire', lx1 - lx0, 0.015, 0.015, mat4((lx0 + lx1) / 2, ly, lz0), { color: 0x1a1815 });
    const nCloth = randInt(2, 4);
    for (let c = 0; c < nCloth; c++) {
      const cx2 = lx0 + (c + 0.7) * (lx1 - lx0) / (nCloth + 0.5);
      const ct = new THREE.Color(randPick([0xc9c2b2, 0x8a9aa5, 0xb59a8a, 0xd0c8b0]));
      buckets.push('fabricSolid', new THREE.PlaneGeometry(randRange(0.5, 0.8), randRange(0.6, 0.9)),
        mat4(cx2, ly - 0.36, lz0, 0, 0, randRange(-0.05, 0.05)), { color: ct });
    }
  }

  // ---- damage extras -----------------------------------------------------------
  if (dmg) {
    const cwx = x + dcx, cwz = z + dcz; // world corner
    // floor slabs spanning the whole gutted quadrant, flush with the facades
    const sw = qw + 0.4, sd = qd + 0.4;
    const scx = x + dc[0] * (w - 0.5 - qw) / 2;
    const scz = z + dc[1] * (d - 0.5 - qd) / 2;
    for (let f = 1; f <= floors; f++) {
      const sy = f === floors ? H : yBase(f);
      buckets.box('slab', sw, 0.17, sd, mat4(scx, sy - 0.085, scz), { color: f === floors ? 0xcdc5b5 : 0xbfb6a6 });
      // jagged chunks along the interior break lines of the slab
      for (let k = 0; k < 5; k++) {
        const alongX = rand() < 0.5;
        buckets.box('slab', randRange(0.4, 1.0), 0.17, randRange(0.4, 0.9),
          mat4(
            alongX ? scx + randRange(-sw / 2, sw / 2) : scx - dc[0] * (sw / 2 + 0.08),
            sy - 0.085 + randRange(-0.02, 0.02),
            alongX ? scz - dc[1] * (sd / 2 + 0.08) : scz + randRange(-sd / 2, sd / 2),
            0, rand() * 0.6, 0), { color: 0xcfc8ba });
      }
      // debris scattered on each exposed slab
      const nDeb = randInt(2, 4);
      for (let k = 0; k < nDeb; k++) {
        const s2 = randRange(0.14, 0.34);
        buckets.push('slab', chunkGeo(rand),
          mat4(scx + randRange(-sw / 2 + 0.4, sw / 2 - 0.4), sy + s2 * 0.3,
            scz + randRange(-sd / 2 + 0.4, sd / 2 - 0.4), rand() * 3, rand() * 3, rand() * 3, s2, s2 * 0.7, s2),
          { color: new THREE.Color(0xa8a091).offsetHSL(0, 0, randRange(-0.06, 0.04)) });
      }
      // hanging rebar off the slab edges
      for (let k = 0; k < 3; k++) {
        const rl = randRange(0.5, 1.2);
        buckets.push('metalDark', new THREE.CylinderGeometry(0.014, 0.014, rl, 4),
          mat4(scx + randRange(-sw / 2, sw / 2), sy - rl / 2 + 0.05, scz - dc[1] * (sd / 2) + randRange(-0.15, 0.15),
            randRange(-0.5, 0.5), 0, randRange(0.9, 1.6)), { color: 0x453d32 });
      }
    }
    // interior columns left standing in the gutted zone
    for (let k = 0; k < 2; k++) {
      const px2 = x + dc[0] * (w / 2 - 1.4 - k * 2.4);
      const pz2 = z + dc[1] * (d / 2 - 1.5 - k * 1.9);
      buckets.box('trim', 0.34, H - 0.4, 0.34, mat4(px2, (H - 0.4) / 2, pz2), { color: 0xb5ac9c });
    }
    // scorch streaks on the interior back walls of the gutted zone
    const Wi2 = (w - 0.9) / 2, Di2 = (d - 0.9) / 2;
    wallDecal(buckets, 'decalScorch',
      x + dc[0] * (Wi2 - qw), randRange(3, Math.max(4, H - 4)), z + dc[1] * (Di2 - qd / 2),
      randRange(3, 4.5), randRange(3, 4.5), dc[0] > 0 ? Math.PI / 2 : -Math.PI / 2, 0xffffff, 0.04);
    wallDecal(buckets, 'decalScorch',
      x + dc[0] * (Wi2 - qw / 2), randRange(3, Math.max(4, H - 4)), z + dc[1] * (Di2 - qd),
      randRange(3, 4.5), randRange(3, 4.5), dc[1] > 0 ? 0 : Math.PI, 0xffffff, 0.04);
    // scorch on ground + remaining walls near collapse
    const gsx = cwx + dc[0] * 2.5, gsz = cwz + dc[1] * 2.5;
    groundDecal(buckets, 'decalScorch', gsx, gsz, 7, 7, rand() * Math.PI, 0xffffff, groundHeight(gsx, gsz) + 0.01);
    // rubble spill spot for props
    out.rubbleSpots.push({
      x: cwx + dc[0] * 2.6, z: cwz + dc[1] * 2.6,
      r: Math.min(6, dmg.r * 0.62), h: randRange(1.6, 2.3), major: true,
    });
  }

  // ---- collision + nav -----------------------------------------------------------
  addBoxCollider(x, H / 2, z, w, H, d, 0, 'concrete');
  navgrid.blockRect(x, z, w, d);

  // wire anchors on boulevard-facing facades
  const innerX = x - Math.sign(x) * w / 2;
  if (Math.abs(innerX) < 14 && Math.abs(z) < 70) {
    out.wireAnchors.push({ x: innerX, y: Math.min(H - 0.8, 6.6), z });
  }
}
