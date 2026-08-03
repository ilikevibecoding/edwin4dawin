import * as THREE from 'three';
import { BrickBuilder, PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { svgExtrude } from '../lego/svg.js';
import { num, bool, hash2i, practical, fixWinding, setGloss } from './common.js';

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

/**
 * Concentric bands around the starbird -- an official seal.
 *
 * Authored as explicit annuli, outer subpath clockwise and inner
 * counter-clockwise, because SVGLoader turns `fill="none" stroke=...` circles
 * into filled discs and would bury the emblem behind a gold plate.
 */
export const RING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="#000" d="
    M 6,256 a 250,250 0 1,0 500,0 a 250,250 0 1,0 -500,0 Z
    M 20,256 a 236,236 0 1,1 472,0 a 236,236 0 1,1 -472,0 Z" />
  <path fill="#000" d="
    M 48,256 a 208,208 0 1,0 416,0 a 208,208 0 1,0 -416,0 Z
    M 56,256 a 200,200 0 1,1 400,0 a 200,200 0 1,1 -400,0 Z" />
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
      // Two near-identical whites, and nothing else. The camera shoots the
      // full length of this floor down a one-point perspective, which stacks
      // the ranks into a dense grid at the far end; any real value difference
      // between alternating tiles becomes a chessboard that pulls the eye off
      // the dais. The floor is read from the tile gaps, not from the colour.
      let color = chk ? C.white : C.veryLightGray;
      if (!inAisle && h > 0.99) color = C.lightBluishGray;
      bb.brick(x, -PLATE, z, cell - 0.12, cell - 0.12, { h: PLATE, color, free: true, studs: false });
    }
  }
  // A darker border course along each wall, in place of a chequer, so the
  // floor still has a rank structure without the alternation.
  for (const s of [-1, 1]) {
    bb.brick(s * (w / 2 - cell / 2), 0, z0 - len / 2, cell - 0.12, len, {
      h: P(0.4), color: C.lightBluishGray, free: true, studs: false,
    });
  }
  // Aisle border inlay. Light, not dark: the strip is a tenth of a stud tall
  // and 150 long, so from the far end of the hall you see its side rather than
  // its top, and a dark side draws two hard black lines straight down the
  // middle of the shot.
  for (const s of [-1, 1]) {
    bb.brick(s * aisle / 2, 0, z0 - len / 2, 0.9, len, {
      h: P(0.4), color: C.lightBluishGray, free: true, studs: false,
    });
  }
}

// ----------------------------------------------------------------- build

export function buildThroneRoom(opts = {}) {
  const w = num(opts, 'width', 88);          // clear floor width
  const len = num(opts, 'length', 150);      // near lip (+Z) to back wall (-Z)
  const h = num(opts, 'height', 52);
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
  // Pilaster frame either side of the emblem.
  for (const side of [-1, 1]) {
    bb.brick(side * 30, 0, zBack + 0.6, 3.2, 2.4, { h: h - B(3), color: C.lightBluishGray, free: true, studs: false });
    bb.brick(side * 38, 0, zBack + 0.6, 2.0, 1.6, { h: h - B(3), color: C.veryLightGray, free: true, studs: false });
  }
  // Deep header courses so the wall is not a blank slab.
  for (let k = 0; k < 3; k++) {
    bb.brick(0, B(1.5) + k * B(2.6), zBack + 0.3, w + 4, 1.2, {
      h: P(1), color: C.lightBluishGray, free: true, studs: false,
    });
  }

  // ----------------------------------------------------- entrance wall
  /*
   * The +Z end of the hall was left open, which is invisible in any shot that
   * faces the dais and fatal in the one that turns round: from the dais the
   * lens looks straight out of the building, and the whole middle of the frame
   * -- above the far end of the floor, below the ceiling -- is the clear
   * colour. Fog does not help, because there is no geometry there to fog.
   *
   * The opening is a recess, not a passage. The nearest camera is a hundred
   * studs away and square on to it, so a panel set back three studs behind a
   * pair of jambs reads as a doorway, and nothing has to exist beyond it.
   */
  const doorW = aisle + 8;
  const doorH = 30;
  const pierW = (w + 8 - doorW) / 2;
  for (const side of [-1, 1]) {
    bb.brick(side * (doorW + pierW) / 2, 0, 1.6, pierW, 3.2, {
      h, color: C.white, free: true, studs: false,
    });
  }
  bb.brick(0, doorH, 1.6, doorW, 3.2, { h: h - doorH, color: C.white, free: true, studs: false });
  bb.brick(0, 0, 4.4, doorW - 0.6, 2.6, { h: doorH, color: C.lightBluishGray, free: true, studs: false });
  // Jambs and a lintel band, so the recess has an edge to catch the light
  // instead of being a grey rectangle painted on a white wall.
  for (const side of [-1, 1]) {
    bb.brick(side * (doorW / 2 - 0.8), 0, 2.6, 1.6, 1.4, {
      h: doorH + 1.2, color: C.veryLightGray, free: true, studs: false,
    });
  }
  bb.brick(0, doorH - 1.2, 2.6, doorW - 0.4, 1.4, {
    h: P(3), color: C.lightBluishGray, free: true, studs: false,
  });
  // Two narrow strips down the jambs. Small and dim on purpose: this sits at
  // the vanishing point of the reverse, and anything brighter becomes the
  // subject of a shot whose subject is the room saluting.
  for (const side of [-1, 1]) {
    bb.brick(side * (doorW / 2 - 1.5), B(2), 3.0, 0.5, 0.4, {
      h: doorH - B(5), color: C.transClear, finish: FINISH.GLOW, free: true, studs: false,
      matOpts: { intensity: 0.85 },
    });
  }

  // --------------------------------------------------------------- dais
  // Deliberately big: from 150 studs down the aisle a low platform vanishes.
  const steps = 6;
  const daisW = 56, daisD = 26;
  for (let k = 0; k < steps; k++) {
    const t = k / steps;
    bb.brick(0, k * P(4), zBack + 3 + t * 4.6, daisW - k * 5.2, daisD - k * 3.6, {
      h: P(4), color: k % 2 ? C.veryLightGray : C.white, free: true, studs: false,
    });
    // Grey nosing on each tread, which is what makes the steps read at range.
    // Stood 0.08 proud of the riser it caps: flush, its front face is coplanar
    // with the step's and the pair z-fight into a dashed line along every
    // tread, which is the first thing you see in any shot facing the dais.
    bb.brick(0, k * P(4) + P(4) - P(0.5), zBack + 3 + t * 4.6 + (daisD - k * 3.6) / 2 - 0.42, daisW - k * 5.2 - 0.1, 1.0, {
      h: P(0.5), color: C.lightBluishGray, free: true, studs: false,
    });
  }
  const daisTop = steps * P(4);
  bb.brick(0, daisTop, zBack + 3 + 4.6, daisW - steps * 5.2 - 0.6, daisD - steps * 3.6 - 0.6, {
    h: P(0.6), color: C.veryLightGray, free: true, studs: false,
  });

  // A lectern, because a ceremony needs something to stand behind.
  bb.brick(0, daisTop, zBack + 9, 7, 3.4, { h: B(2.4), color: C.lightBluishGray, free: true, studs: false });
  bb.slope(0, daisTop + B(2.4), zBack + 9, 3.4, 7.4, { h: P(2), color: C.veryLightGray, rot: Math.PI / 2, free: true });

  // ------------------------------------------------------------ banners
  // Hung from the cornice down the side walls, clear of the wall top.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const z = zBack + 26 + k * 30;
      const top = h - B(5);
      // Full-strength red and blue, not the dark variants: the bays behind
      // them are already shadow, and dark red at 0x720e0f renders as a black
      // rectangle hanging on a white wall.
      bb.brick(side * (hw - 1.0), top - 20, z, 0.5, 9, {
        h: 20, color: k % 2 ? C.red : C.blue, free: true, studs: false,
      });
      bb.brick(side * (hw - 1.1), top - P(1.5), z, 0.7, 9.8, {
        h: P(1.5), color: C.pearlGold, finish: FINISH.METAL, free: true, studs: false,
      });
      // Weighted hem.
      bb.brick(side * (hw - 1.1), top - 20, z, 0.7, 9.8, {
        h: P(1.2), color: C.pearlGold, finish: FINISH.METAL, free: true, studs: false,
      });
    }
  }

  // ------------------------------------------------------------ ceiling
  bb.brick(0, h, zBack + len / 2, w + 12, len + 6, { h: B(2), color: C.veryLightGray, free: true, studs: false });
  for (let k = 0; k < 9; k++) {
    const z = zBack + 8 + k * ((len - 12) / 8);
    bb.brick(0, h - P(2), z, w, 2.6, { h: P(2), color: C.lightBluishGray, free: true, studs: false });
  }

  // ----------------------------------------------------- ceiling lights
  // Kept away from the back wall so nothing crosses the emblem, and narrow
  // enough that they read as coffers rather than as strip lights.
  for (let k = 0; k < 5; k++) {
    const z = zBack + 34 + k * ((len - 46) / 4);
    bb.brick(0, h - B(2), z, 34, 4.4, { h: P(2), color: C.lightBluishGray, free: true, studs: false });
    // Kept under the 1.3 bloom threshold: a full-strength GLOW strip this long
    // smears across half the frame.
    bb.brick(0, h - B(2) - P(0.8), z, 30, 3.2, {
      h: P(0.8), color: C.transClear, finish: FINISH.GLOW, free: true, studs: false,
      matOpts: { intensity: 1.05 },
    });
  }

  const g = setGloss(bb.build());
  g.name = 'throneroom';

  // ------------------------------------------------------------ emblem
  // Extruded relief rather than a printed tile: gold catches the key light and
  // reads from 150 studs down the aisle in a way a flat print never would.
  const emblemSize = num(opts, 'emblem', 26);
  // High enough that the backing disc clears the top of the dais: overlap the
  // two and the shadow between them reads as a hole in the back wall.
  const emblemY = num(opts, 'emblemY', 34);
  {
    const bb2 = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });
    // Dark recessed disc inside a pale surround: the gold needs something to
    // read against, and a bright backing just turns into a moon behind it.
    bb2.cyl(0, 0, zBack + 0.25, emblemSize * 0.82, 0.5, {
      color: C.lightBluishGray, seg: 44, axis: 'z', stud: false,
    });
    bb2.cyl(0, 0, zBack + 0.7, emblemSize * 0.72, 0.5, {
      color: C.darkBluishGray, seg: 44, axis: 'z', stud: false,
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
    // Off the centreline so the emblem gets a raking light instead of a
    // specular hot spot straight back at the camera.
    practical(g, -26, h - 14, zBack + 30, 0xfff4e2, 620, 130);
    practical(g, 26, h - 14, zBack + 30, 0xe8f0ff, 380, 130);
    practical(g, 0, h - 12, zBack + 96, 0xe8f0ff, 620, 150);
    // Hung in front of the entrance wall and reaching nothing else: that wall
    // is 120 studs from the nearest of the other three lamps and would
    // otherwise sit unlit at the exact centre of the reverse.
    practical(g, 0, 24, -9, 0xffe9c8, 420, 62);
    // Three lamps cannot reach 150 studs of ceiling, and the ceiling is what
    // the top of every shot down this aisle is made of: coffers face straight
    // down, so with nothing but point lights the roof above the lens goes to
    // navy while the middle of the hall blows out. The ground half of the
    // hemisphere is standing in for the bounce off all that white floor.
    g.add(new THREE.HemisphereLight(
      new THREE.Color(0xe4ecfa).convertSRGBToLinear(),
      new THREE.Color(0x9aa4b4).convertSRGBToLinear(), 1.5,
    ));
  }
  return g;
}
