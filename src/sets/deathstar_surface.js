import * as THREE from 'three';
import { BrickBuilder, PLATE, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { num, bool, hash2i, q, GREY_PANEL, pickFrom } from './common.js';

/*
 * Battle-station exterior: a square of greebled grey panelling for an X-wing
 * (30 studs) to skim across.
 *
 * Everything is keyed off a cell grid and every hash is taken modulo the grid
 * width, so the whole plate is periodic: drop two copies edge to edge and the
 * join does not show. Features are clipped inside their own cell for the same
 * reason -- nothing straddles a boundary.
 *
 * Deck top sits at y = 0; the plating hangs below it so a scene can place ships
 * at positive y without arithmetic.
 *
 * Scale is a moon, and a flat plate always ends somewhere, so the plate can be
 * built as the cap of a sphere instead: `curve` is that sphere's radius and
 * every cell drops by r^2 / 2R, which lets the surface fall away over its own
 * horizon before the rim of the plate is ever in shot. `flatR` holds the middle
 * level so a trench or a landing deck built on the flat can sit in the cap
 * without drooping. Detail cost is controlled with `cell`, so a scene can ring
 * one fine plate with a coarse curved one and pay for the horizon once.
 */

/** Deck tone: broad plateaus of one grey with a scatter of odd plates. */
function deckColor(i, j, N, seed) {
  const h = hash2i(((i / 5) | 0) % N, ((j / 5) | 0) % N, seed + 5);
  const s = hash2i(i % N, j % N, seed + 6);
  if (s < 0.05) return C.darkBluishGray;
  if (s > 0.94) return C.veryLightGray;
  return h < 0.22 ? C.darkBluishGray : (h < 0.66 ? C.lightBluishGray : C.veryLightGray);
}

/**
 * One surface tile: raised panel stack, and now and then a tower or a dish.
 *
 * `y0` is the cell's height on the curve, `skirt` how far its plating hangs
 * below the deck (deep enough to close the step down to the next cell out) and
 * `fs` the feature scale, which keeps a 50-stud cell looking like the same
 * design as a 10-stud one rather than the same greebles spread thinner.
 */
function panelCell(bb, cx, cz, cell, i, j, N, seed, opts) {
  const { detail, y0, skirt, fs } = opts;
  const wrap = (a, b, s) => hash2i(((a % N) + N) % N, ((b % N) + N) % N, s);
  const h0 = wrap(i, j, seed);
  const h1 = wrap(i, j, seed + 17);
  const h2 = wrap(i, j, seed + 41);
  const h3 = wrap(i, j, seed + 73);
  const h4 = wrap(i, j, seed + 131);
  const h5 = wrap(i, j, seed + 211);

  // Macro relief: 4x4-cell blocks step up or down together, which is what
  // stops 1600 identical-scale greebles from reading as noise. The block hash
  // wraps on N/4 so the plate still tiles.
  const NB = Math.max(1, N >> 2);
  const blk = hash2i(((i >> 2) % NB + NB) % NB, ((j >> 2) % NB + NB) % NB, seed + 907);
  const lvl = (blk > 0.74 ? B(1) : (blk < 0.14 ? -P(3) : 0)) * fs;

  // Service channels running the full width every 10 cells.
  const channel = (i % 10 === 3) || (j % 10 === 7);

  const base = deckColor(i, j, N, seed);
  const deckY = channel ? -B(1.2) * fs : lvl - PLATE * fs;
  // The deck tile carries the hull depth with it: on a curved plate each cell
  // sits lower than the one inside it, and a tile that only went down a plate
  // would leave a slot you could see space through.
  bb.brick(cx, y0 + deckY - skirt, cz, cell, cell, {
    h: PLATE * fs + skirt, color: channel ? C.darkGray : base, free: true, studs: false,
  });
  if (lvl > 0 && !channel) {
    bb.brick(cx, y0 - PLATE * fs, cz, cell, cell, { h: lvl, color: C.darkBluishGray, free: true, studs: false });
  }

  // Equator-style seam lines every 8 cells, in both directions. They are what
  // gives the eye a sense of scale when a ship crosses the plate. Only the low
  // edge of the cell is drawn, so the seam is not doubled by its neighbour.
  if (i % 8 === 0) {
    bb.brick(cx - cell / 2, y0 + B(1) * fs, cz, 0.9 * fs, cell, {
      h: P(1.2) * fs, color: C.darkBluishGray, free: true, studs: false,
    });
  }
  if (j % 8 === 0) {
    bb.brick(cx, y0 + B(1) * fs, cz - cell / 2, cell, 0.9 * fs, {
      h: P(1.2) * fs, color: C.darkBluishGray, free: true, studs: false,
    });
  }

  if (channel) {
    // Pipes and conduit running along the bottom of the channel.
    const along = (i % 10 === 3);
    for (let k = -1; k <= 1; k++) {
      const off = k * cell * 0.24;
      const c = k === 0 ? C.flatSilver : C.darkBluishGray;
      if (along) bb.brick(cx + off, y0 + deckY + PLATE * fs, cz, 1.1 * fs, cell, { h: 1.0 * fs, color: c, free: true, studs: false });
      else bb.brick(cx, y0 + deckY + PLATE * fs, cz + off, cell, 1.1 * fs, { h: 1.0 * fs, color: c, free: true, studs: false });
    }
    return;
  }

  // Every so often a cell stays bare, which breaks up the grid.
  if (h0 > 0.9) return;

  const m = cell * (0.06 + h3 * 0.1);           // margin keeps the panel in-cell
  const w = q(cell - m * 2, 0.1);
  const d = q(cell - m * 2 - (h1 < 0.3 ? cell * 0.3 : 0), 0.1);
  const rise = q(P(1 + Math.floor(h2 * 3)) * fs, 0.1);
  const col = pickFrom(GREY_PANEL, h1);
  bb.brick(cx + (h3 - 0.5) * m, y0 + lvl, cz + (h4 - 0.5) * m, w, d, {
    h: rise, color: col, free: true, studs: false,
  });

  // Second storey.
  if (h2 > 0.32) {
    const w2 = q(w * (0.3 + h4 * 0.42), 0.1);
    const d2 = q(d * (0.32 + h3 * 0.4), 0.1);
    bb.brick(cx + (h1 - 0.5) * (w - w2) * 0.7, y0 + lvl + rise, cz + (h5 - 0.5) * (d - d2) * 0.7, w2, d2, {
      h: q(P(1 + Math.floor(h5 * 4)) * fs, 0.1), color: pickFrom(GREY_PANEL, h4), free: true, studs: false,
    });
  }

  // Ribbed strip: three thin plates in a row, the classic greeble filler.
  if (h3 < 0.22) {
    for (let k = -1; k <= 1; k++) {
      bb.brick(cx + k * cell * 0.24, y0 + lvl + rise, cz, q(cell * 0.14, 0.1), q(d * 0.8, 0.1), {
        h: P(1) * fs, color: C.darkBluishGray, free: true, studs: false,
      });
    }
  }

  if (!opts.detail) return;
  const y = y0 + lvl + rise;

  // Sensor tower. Rare, and short enough that a ship at y = 10 clears it.
  if (h4 > 0.972) {
    const th = B(2 + Math.floor(h5 * 4)) * fs;
    bb.brick(cx, y, cz, q(cell * 0.3, 0.1), q(cell * 0.3, 0.1), {
      h: th, color: C.lightBluishGray, free: true, studs: false,
    });
    bb.brick(cx, y + th, cz, q(cell * 0.44, 0.1), q(cell * 0.44, 0.1), {
      h: P(2) * fs, color: C.darkBluishGray, free: true, studs: false,
    });
    bb.cyl(cx, y + th + P(2) * fs, cz, 0.28 * fs, B(1.5) * fs, { color: C.flatSilver, finish: FINISH.METAL, seg: 8, stud: false });
  } else if (h5 > 0.966) {
    // Dish emplacement.
    const r = cell * 0.22;
    bb.cyl(cx, y, cz, q(r * 0.42, 0.1), B(1) * fs, { color: C.darkBluishGray, seg: 10, stud: false });
    bb.sphere(cx, y + B(1) * fs, cz, q(r, 0.1), {
      color: C.veryLightGray, dome: true, seg: 12, rings: 4, sy: 0.5,
    });
  } else if (h1 > 0.955) {
    // Vent grille glowing from inside the hull.
    bb.brick(cx, y, cz, q(cell * 0.3, 0.1), q(cell * 0.18, 0.1), {
      h: P(0.6) * fs, color: C.transNeonOrange, finish: FINISH.GLOW, free: true, studs: false,
      matOpts: { intensity: 1.8 },
    });
  }
}

export function buildDeathStarSurface(opts = {}) {
  const size = num(opts, 'size', 400);
  const cell = num(opts, 'cell', 10);
  const seed = Math.round(num(opts, 'seed', 66613));
  const detail = bool(opts, 'detail', true);
  // Sphere radius the plate is bent over, so it drops below its own horizon
  // before the rim is in shot. 0 keeps the old flat plate.
  const curve = num(opts, 'curve', 0);
  const flatR = num(opts, 'flatR', 0);
  // Square hole through the middle: lets a coarse plate ring a fine one
  // without paying for the detail twice or z-fighting over the overlap.
  const hollow = num(opts, 'hollow', 0);
  // Corridor left open along Z for a trench to drop through.
  const slot = num(opts, 'slot', 0);
  const N = Math.max(1, Math.round(size / cell));
  const half = size / 2;
  const fs = cell / 10;                 // feature scale: same design, bigger bricks
  const baseSkirt = num(opts, 'skirt', B(2) * fs);

  // How far this cell has fallen off the flat, and how far it falls again
  // between here and its neighbour one cell further out.
  const dropAt = (x, z) => {
    if (curve <= 0) return 0;
    const d = Math.max(0, Math.hypot(x, z) - flatR);
    return -(d * d) / (2 * curve);
  };
  const stepAt = (x, z) => {
    if (curve <= 0) return 0;
    const d = Math.max(0, Math.hypot(x, z) - flatR);
    return (d / curve) * cell;
  };

  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const cx = -half + (i + 0.5) * cell;
      const cz = -half + (j + 0.5) * cell;
      if (hollow > 0 && Math.abs(cx) < hollow && Math.abs(cz) < hollow) continue;
      if (slot > 0 && Math.abs(cx) < slot) continue;
      panelCell(bb, cx, cz, cell, i, j, N, seed, {
        detail, fs,
        y0: dropAt(cx, cz),
        skirt: Math.max(baseSkirt, stepAt(cx, cz) * 1.6),
      });
    }
  }

  // No shadow pass: at 400 studs across, every rig's shadow camera covers a
  // fraction of the plate, so shadows would only appear in one corner.
  const g = bb.build({ castShadow: false, receiveShadow: false });
  g.name = 'deathstar_surface';
  g.userData.nodes = bb.nodes;
  g.userData.size = size;

  // The plate carries its own sun, the way `trench` does. Every rig in the kit
  // is dialled for a model a few tens of studs across lit from a metre away;
  // point one at 400 studs of grey deck and the deck comes out near black.
  // Pass lights=0 when dropping this into a scene that already has a star.
  if (bool(opts, 'lights', true)) {
    const sun = new THREE.DirectionalLight(new THREE.Color(0xe8f0ff).convertSRGBToLinear(), 2.0);
    sun.position.set(-size * 0.5, size * 1.1, size * 0.8);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = false;
    g.add(sun, sun.target);
    // Reflected light off the rest of the hull: without it the side of every
    // greeble facing away from the sun crushes and the plate reads as a
    // silhouette rather than as panelling.
    const bounce = new THREE.DirectionalLight(new THREE.Color(0x7d94bd).convertSRGBToLinear(), 0.85);
    bounce.position.set(size * 0.7, size * 0.25, -size * 0.5);
    bounce.target.position.set(0, 0, 0);
    bounce.castShadow = false;
    g.add(bounce, bounce.target);
    g.add(new THREE.HemisphereLight(
      new THREE.Color(0x8ea4c6).convertSRGBToLinear(),
      new THREE.Color(0x1c222e).convertSRGBToLinear(), 1.15,
    ));
  }
  return g;
}
