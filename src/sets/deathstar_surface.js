import { BrickBuilder, PLATE, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { num, bool, hash2i, q, GREY_PANEL, pickFrom } from './common.js';

/*
 * Battle-station exterior: a 400 x 400 stud slab of greebled grey panelling
 * for an X-wing (30 studs) to skim across.
 *
 * Everything is keyed off a cell grid and every hash is taken modulo the grid
 * width, so the whole plate is periodic: drop two copies edge to edge and the
 * join does not show. Features are clipped inside their own cell for the same
 * reason -- nothing straddles a boundary.
 *
 * Deck top sits at y = 0; the slab hangs below it so a scene can place ships
 * at positive y without arithmetic.
 */

/** Deck tone: broad plateaus of one grey with a scatter of odd plates. */
function deckColor(i, j, N, seed) {
  const h = hash2i(((i / 5) | 0) % N, ((j / 5) | 0) % N, seed + 5);
  const s = hash2i(i % N, j % N, seed + 6);
  if (s < 0.07) return C.darkBluishGray;
  if (s > 0.955) return C.veryLightGray;
  return h < 0.34 ? C.darkBluishGray : (h < 0.78 ? C.lightBluishGray : C.veryLightGray);
}

/** One surface tile: raised panel stack, and now and then a tower or a dish. */
function panelCell(bb, cx, cz, cell, i, j, N, seed, opts) {
  const wrap = (a, b, s) => hash2i(((a % N) + N) % N, ((b % N) + N) % N, s);
  const h0 = wrap(i, j, seed);
  const h1 = wrap(i, j, seed + 17);
  const h2 = wrap(i, j, seed + 41);
  const h3 = wrap(i, j, seed + 73);
  const h4 = wrap(i, j, seed + 131);
  const h5 = wrap(i, j, seed + 211);

  const base = deckColor(i, j, N, seed);
  bb.brick(cx, -PLATE, cz, cell, cell, { h: PLATE, color: base, free: true, studs: false });

  // Channels: every so often a whole cell stays bare, which reads as one of
  // the deep service trenches criss-crossing the station.
  if (h0 > 0.9) return;

  const m = cell * (0.06 + h3 * 0.1);           // margin keeps the panel in-cell
  const w = q(cell - m * 2, 0.1);
  const d = q(cell - m * 2 - (h1 < 0.3 ? cell * 0.3 : 0), 0.1);
  const rise = q(P(1 + Math.floor(h2 * 3)), 0.1);
  const col = pickFrom(GREY_PANEL, h1);
  bb.brick(cx + (h3 - 0.5) * m, 0, cz + (h4 - 0.5) * m, w, d, {
    h: rise, color: col, free: true, studs: false,
  });

  // Second storey.
  if (h2 > 0.32) {
    const w2 = q(w * (0.3 + h4 * 0.42), 0.1);
    const d2 = q(d * (0.32 + h3 * 0.4), 0.1);
    bb.brick(cx + (h1 - 0.5) * (w - w2) * 0.7, rise, cz + (h5 - 0.5) * (d - d2) * 0.7, w2, d2, {
      h: q(P(1 + Math.floor(h5 * 4)), 0.1), color: pickFrom(GREY_PANEL, h4), free: true, studs: false,
    });
  }

  // Ribbed strip: three thin plates in a row, the classic greeble filler.
  if (h3 < 0.22) {
    for (let k = -1; k <= 1; k++) {
      bb.brick(cx + k * cell * 0.24, rise, cz, q(cell * 0.14, 0.1), q(d * 0.8, 0.1), {
        h: P(1), color: C.darkBluishGray, free: true, studs: false,
      });
    }
  }

  if (!opts.detail) return;

  // Sensor tower. Rare, and short enough that a ship at y=10 clears it.
  if (h4 > 0.972) {
    const th = B(2 + Math.floor(h5 * 4));
    bb.brick(cx, rise, cz, q(cell * 0.3, 0.1), q(cell * 0.3, 0.1), {
      h: th, color: C.lightBluishGray, free: true, studs: false,
    });
    bb.brick(cx, rise + th, cz, q(cell * 0.44, 0.1), q(cell * 0.44, 0.1), {
      h: P(2), color: C.darkBluishGray, free: true, studs: false,
    });
    bb.cyl(cx, rise + th + P(2), cz, 0.28, B(1.5), { color: C.flatSilver, finish: FINISH.METAL, seg: 8, stud: false });
  } else if (h5 > 0.966) {
    // Dish emplacement.
    const r = cell * 0.22;
    bb.cyl(cx, rise, cz, q(r * 0.42, 0.1), B(1), { color: C.darkBluishGray, seg: 10, stud: false });
    bb.sphere(cx, rise + B(1), cz, q(r, 0.1), {
      color: C.veryLightGray, dome: true, seg: 12, rings: 4, sy: 0.5,
    });
  } else if (h1 > 0.955) {
    // Vent grille glowing from inside the hull.
    bb.brick(cx, rise, cz, q(cell * 0.3, 0.1), q(cell * 0.18, 0.1), {
      h: P(0.6), color: C.transNeonOrange, finish: FINISH.GLOW, free: true, studs: false,
    });
  }
}

export function buildDeathStarSurface(opts = {}) {
  const size = num(opts, 'size', 400);
  const cell = num(opts, 'cell', 10);
  const seed = Math.round(num(opts, 'seed', 66613));
  const detail = bool(opts, 'detail', true);
  const N = Math.max(1, Math.round(size / cell));
  const half = size / 2;

  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });

  // Hull slab. Only the top matters, but the depth gives the horizon a lip.
  bb.brick(0, -B(4), 0, size, size, { h: B(4) - PLATE, color: C.darkBluishGray, free: true, studs: false });

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      panelCell(bb, -half + (i + 0.5) * cell, -half + (j + 0.5) * cell, cell, i, j, N, seed, { detail });
    }
  }

  // Equator-style seam lines every 8 cells, in both directions. They are what
  // gives the eye a sense of scale when a ship crosses the plate.
  const gap = cell * 8;
  for (let k = 0; k * gap <= size; k++) {
    const a = -half + k * gap;
    if (a > half) break;
    bb.brick(a, 0, 0, 0.9, size, { h: P(1.2), color: C.darkBluishGray, free: true, studs: false });
    bb.brick(0, 0, a, size, 0.9, { h: P(1.2), color: C.darkBluishGray, free: true, studs: false });
  }

  const g = bb.build();
  g.name = 'deathstar_surface';
  g.userData.nodes = bb.nodes;
  g.userData.size = size;
  return g;
}
