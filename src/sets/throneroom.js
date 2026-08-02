import * as THREE from 'three';
import { BrickBuilder, PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { svgExtrude } from '../lego/svg.js';
import { num, bool, hash2i, practical, fixWinding } from './common.js';

/*
 * The medal ceremony hall.
 *
 * A wide white brick hall running along Z with the stepped dais at the far
 * (-Z) end, columns down both sides and a huge emblem on the back wall. The
 * camera shoots down the aisle from +Z, so the whole thing is composed for
 * one-point perspective: everything is mirrored about x = 0 and the emblem
 * sits dead centre above the dais.
 */

/**
 * The Alliance starbird, authored as one SVG so it can be extruded into real
 * relief on the back wall. Drawn on a 512 grid, centred, pointing up.
 */
export const EMBLEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="#000" d="
    M256 26
    C 236 96 226 150 224 206
    C 206 176 190 146 178 112
    C 156 168 148 224 154 276
    C 132 250 114 220 100 186
    C 86 252 96 318 130 372
    C 106 366 82 352 60 330
    C 92 414 166 470 256 486
    C 346 470 420 414 452 330
    C 430 352 406 366 382 372
    C 416 318 426 252 412 186
    C 398 220 380 250 358 276
    C 364 224 356 168 334 112
    C 322 146 306 176 288 206
    C 286 150 276 96 256 26
    Z" />
  <path fill="#000" d="
    M256 300
    c -26 34 -40 76 -42 122
    c 16 -20 30 -34 42 -42
    c 12 8 26 22 42 42
    c -2 -46 -16 -88 -42 -122
    Z" />
</svg>`;

/** Ring of laurel dots around the starbird -- reads as an official seal. */
export const RING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="240" fill="none" stroke="#000" stroke-width="14"/>
  <circle cx="256" cy="256" r="212" fill="none" stroke="#000" stroke-width="6"/>
</svg>`;

// ------------------------------------------------------------------ parts

/** Fluted column: a stack of round bricks with a square base and capital. */
function column(bb, x, z, h, opts = {}) {
  const r = opts.r ?? 1.9;
  const col = opts.color ?? C.white;
  bb.brick(x, 0, z, r * 2.6, r * 2.6, { h: P(2), color: C.lightBluishGray, free: true, studs: false });
  bb.brick(x, P(2), z, r * 2.2, r * 2.2, { h: P(2), color: col, free: true, studs: false });
  const shaft = h - P(4) - B(1) - P(2);
  bb.cyl(x, P(4), z, r, shaft, { color: col, seg: 12, stud: false });
  // Flutes: four thin bars set into the shaft.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.26;
    bb.bar(x + Math.cos(a) * r, P(4) + shaft / 2, z + Math.sin(a) * r, 0.14, shaft, {
      color: C.lightBluishGray,
    });
  }
  bb.cyl(x, P(4) + shaft, z, r * 1.18, P(2), { color: col, seg: 12, stud: false });
  bb.brick(x, P(6) + shaft, z, r * 2.6, r * 2.6, { h: B(1), color: col, free: true, studs: false });
}

/** Rank of floor tiles: a chequer of two greys with a runner down the aisle. */
function floorTiles(bb, w, len, z0, aisle) {
  const cell = 4;
  const nx = Math.round(w / cell), nz = Math.round(len / cell);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = -w / 2 + (i + 0.5) * cell;
      const z = z0 - len + (j + 0.5) * cell;
      const inAisle = Math.abs(x) < aisle / 2;
      const chk = (i + j) % 2 === 0;
      const h = hash2i(i, j, 5150);
      let color = inAisle
        ? (chk ? C.veryLightGray : C.white)
        : (chk ? C.white : C.lightBluishGray);
      if (!inAisle && h > 0.965) color = C.darkBluishGray;
      bb.brick(x, -PLATE, z, cell - 0.12, cell - 0.12, { h: PLATE, color, free: true, studs: false });
    }
  }
  // Aisle border lines.
  for (const s of [-1, 1]) {
    bb.brick(s * aisle / 2, 0, z0 - len / 2, 0.6, len, {
      h: P(0.4), color: C.darkBluishGray, free: true, studs: false,
    });
  }
}

// ----------------------------------------------------------------- build

export function buildThroneRoom(opts = {}) {
  const w = num(opts, 'width', 88);          // clear floor width
  const len = num(opts, 'length', 150);      // near lip (+Z) to back wall (-Z)
  const h = num(opts, 'height', 46);
  const aisle = num(opts, 'aisle', 26);
  const zBack = -len;

  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });
  const hw = w / 2;

  // ------------------------------------------------------------- floor
  floorTiles(bb, w, len, 0, aisle);

  // -------------------------------------------------------- side walls
  for (const side of [-1, 1]) {
    const x = side * (hw + 2);
    bb.brick(x, 0, zBack + len / 2, 4, len, { h, color: C.white, free: true, studs: false });
    // Tall recessed bays between the columns.
    const bays = 7;
    for (let k = 0; k < bays; k++) {
      const z = zBack + (k + 0.5) * (len / bays);
      bb.brick(side * hw, B(2), z, 0.9, len / bays - 7, {
        h: h - B(8), color: C.lightBluishGray, free: true, studs: false,
      });
      bb.brick(side * hw, h - B(7), z, 1.3, len / bays - 9, {
        h: P(2), color: C.veryLightGray, free: true, studs: false,
      });
    }
    // Skirting and a cornice band.
    bb.brick(side * (hw - 0.4), 0, zBack + len / 2, 1.6, len, {
      h: B(2), color: C.lightBluishGray, free: true, studs: false,
    });
    bb.brick(side * (hw - 0.6), h - B(4), zBack + len / 2, 2, len, {
      h: B(1), color: C.lightBluishGray, free: true, studs: false,
    });
    bb.brick(side * (hw - 1.4), h - B(3), zBack + len / 2, 3.6, len, {
      h: P(2), color: C.veryLightGray, free: true, studs: false,
    });
  }

  // ----------------------------------------------------------- columns
  const cols = 7;
  for (let k = 0; k < cols; k++) {
    const z = zBack + 10 + k * ((len - 18) / (cols - 1));
    for (const side of [-1, 1]) column(bb, side * (hw - 4.5), z, h - B(3));
  }

  // --------------------------------------------------------- back wall
  bb.brick(0, 0, zBack - 2, w + 8, 4, { h, color: C.white, free: true, studs: false });
  // Pilaster frame around the emblem.
  for (const side of [-1, 1]) {
    bb.brick(side * 22, 0, zBack + 0.6, 3.2, 2.4, { h: h - B(4), color: C.lightBluishGray, free: true, studs: false });
  }
  bb.brick(0, h - B(6), zBack + 0.6, 52, 2.4, { h: B(1.4), color: C.lightBluishGray, free: true, studs: false });
  // Deep header courses so the wall is not a blank slab.
  for (let k = 0; k < 5; k++) {
    bb.brick(0, B(2) + k * B(3), zBack + 0.3, w + 4, 1.2, {
      h: P(1), color: C.lightBluishGray, free: true, studs: false,
    });
  }

  // --------------------------------------------------------------- dais
  const steps = 5;
  const daisW = 46, daisD = 20;
  for (let k = 0; k < steps; k++) {
    const t = k / steps;
    bb.brick(0, k * P(3), zBack + 3 + t * 3.4, daisW - k * 5, daisD - k * 3.2, {
      h: P(3), color: k % 2 ? C.veryLightGray : C.white, free: true, studs: false,
    });
  }
  const daisTop = steps * P(3);
  // Tile the top of the dais and edge it in grey.
  bb.brick(0, daisTop, zBack + 3 + 3.4, daisW - steps * 5 - 0.6, daisD - steps * 3.2 - 0.6, {
    h: P(0.6), color: C.veryLightGray, free: true, studs: false,
  });

  // A lectern, because a ceremony needs something to stand behind.
  bb.brick(0, daisTop, zBack + 8, 6, 3, { h: B(2.4), color: C.lightBluishGray, free: true, studs: false });
  bb.slope(0, daisTop + B(2.4), zBack + 8, 3, 6.4, { h: P(2), color: C.veryLightGray, rot: Math.PI / 2, free: true });

  // ------------------------------------------------------------ banners
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const z = zBack + 22 + k * 34;
      bb.brick(side * (hw - 1.2), h - B(9), z, 0.5, 9, {
        h: 16, color: k % 2 ? C.darkRed : C.darkBlue, free: true, studs: false,
      });
      bb.brick(side * (hw - 1.3), h - B(9), z, 0.7, 9.8, {
        h: P(1.5), color: C.pearlGold, finish: FINISH.METAL, free: true, studs: false,
      });
    }
  }

  // ----------------------------------------------------- ceiling lights
  for (let k = 0; k < 6; k++) {
    const z = zBack + 12 + k * ((len - 20) / 5);
    bb.brick(0, h - B(2), z, 30, 3.4, { h: P(2), color: C.lightBluishGray, free: true, studs: false });
    bb.brick(0, h - B(2) - P(1), z, 26, 2.4, {
      h: P(1), color: C.transClear, finish: FINISH.GLOW, free: true, studs: false,
    });
  }

  const g = bb.build();
  g.name = 'throneroom';

  // ------------------------------------------------------------ emblem
  // Extruded relief rather than a printed tile: at 40 studs across it catches
  // the key light and reads from the far end of the aisle.
  const emblemSize = num(opts, 'emblem', 40);
  const emblemY = h - B(13);
  {
    const bb2 = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });
    // Backing disc, recessed a touch so the relief sits proud of it.
    bb2.cyl(0, 0, zBack + 0.9, emblemSize * 0.78, 0.8, {
      color: C.lightBluishGray, seg: 40, axis: 'z', stud: false,
    });
    const g2 = bb2.build();
    g2.position.set(0, emblemY, 0);
    g.add(g2);

    const star = fixWinding(svgExtrude(EMBLEM_SVG, { depth: 0.7, size: emblemSize, bevel: 0.04, curveSegments: 6 }));
    const ring = fixWinding(svgExtrude(RING_SVG, { depth: 0.5, size: emblemSize * 1.3, bevel: 0.03, curveSegments: 8 }));
    const gold = new THREE.MeshStandardMaterial({
      color: new THREE.Color(C.pearlGold).convertSRGBToLinear(), metalness: 0.75, roughness: 0.34,
    });
    for (const geom of [star, ring]) {
      const m = new THREE.Mesh(geom, gold);
      m.position.set(0, emblemY, zBack + 1.2);
      g.add(m);
    }
  }

  g.userData.nodes = bb.nodes;
  const dais = new THREE.Object3D();
  dais.position.set(0, daisTop, zBack + 10);
  g.add(dais);
  g.userData.nodes.dais = dais;

  if (bool(opts, 'lights', true)) {
    practical(g, 0, h - 8, zBack + 26, 0xfff4e2, 900, 150);
    practical(g, 0, h - 10, zBack + 90, 0xe8f0ff, 700, 150);
    practical(g, 0, 14, zBack + 12, 0xffe8c8, 260, 70);
  }
  return g;
}
