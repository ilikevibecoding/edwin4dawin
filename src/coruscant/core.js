// Vertical circulation core: a 6x6 (plan uv) block holding two 2x2 turbolift shafts and a 2x5 switchback stairwell.
// The planner reserves the block (layout.core) on every level; this paints it once for the whole height.
//
//   v0+5  [wall][ lift B ][wall][ stair k=4 ][ stair k=5 ]
//   v0+4  [wall][ lift B ][wall][    k=3    ][    k=6    ]
//   v0+3  [wall][ service][wall][    k=2    ][    k=7    ]
//   v0+2  [wall][ lift A ][wall][    k=1    ][    k=8    ]
//   v0+1  [wall][ lift A ][wall][    k=0    ][    k=9    ]
//   v0    [wall][ doors  ][wall][   stair door (2 wide)  ]   <- faces the corridor / lift landing
//          u0    u0+1..2  u0+3      u0+4          u0+5
//
// Steps rise half a block per cell (slab, full, slab, ...) so ten cells climb one 5-block floor; each step is only
// its top block ("floating" flights) so the flight above always leaves >= 2 blocks of headroom.
import { B } from '../blocks.js';
import { FORCE_AIR } from './blueprint.js';

const STEP_SLAB = B.STONE_BRICK_SLAB, STEP_FULL = B.DURASTEEL;

// core: { u0, v0 } (plan uv); floors f0..f1 inclusive (walk level of floor f = 5f + 1)
export function buildCore(bp, frame, core, f0, f1, style) {
  const { u0, v0 } = core;
  const wall = style.coreWall || B.DURASTEEL, trim = style.trim || B.CHROME;
  const yBase = 5 * f0, yTop = 5 * (f1 + 1);
  const X = (u, v) => frame.X(u, v), Z = (u, v) => frame.Z(u, v);
  const col = (u, v, ya, yb, id) => { const x = X(u, v), z = Z(u, v); bp.fill(x, ya, z, x, yb, z, id); };
  const put = (u, y, v, id) => bp.set(X(u, v), y, Z(u, v), id);

  // walls + shafts for the full height
  for (let u = u0; u <= u0 + 5; u++) col(u, v0, yBase, yTop, wall);
  for (let v = v0; v <= v0 + 5; v++) { col(u0, v, yBase, yTop, wall); col(u0 + 3, v, yBase, yTop, wall); }
  for (let u = u0 + 1; u <= u0 + 2; u++) {
    for (let v = v0 + 1; v <= v0 + 5; v++) col(u, v, yBase, yTop, v === v0 + 3 ? B.DURASTEEL_DARK : B.PANEL_BLACK);
  }
  // stairwell void
  for (let u = u0 + 4; u <= u0 + 5; u++) for (let v = v0 + 1; v <= v0 + 5; v++) col(u, v, yBase + 1, yTop - 1, FORCE_AIR);

  for (let f = f0; f <= f1; f++) {
    const lvl = 5 * f + 1;
    // stair door (2 wide, 2 high) with a lit lintel, lift doors (chrome) with blue call markers
    for (let k = 4; k <= 5; k++) { put(u0 + k, lvl, v0, FORCE_AIR); put(u0 + k, lvl + 1, v0, FORCE_AIR); put(u0 + k, lvl + 2, v0, trim); }
    put(u0 + 4, lvl + 3, v0, B.GLOW_PANEL);
    for (let k = 1; k <= 2; k++) { put(u0 + k, lvl, v0, B.CHROME); put(u0 + k, lvl + 1, v0, B.CHROME); put(u0 + k, lvl + 2, v0, B.GLOW_PANEL_BLUE); }
    for (let v = v0 + 4; v <= v0 + 5; v++) { put(u0, lvl, v, B.CHROME); put(u0, lvl + 1, v, B.CHROME); put(u0, lvl + 2, v, B.GLOW_PANEL_BLUE); }
    // stairwell light on the partition wall
    put(u0 + 3, lvl + 3, v0 + 3, B.GLOW_PANEL);
    // landing floor under the first four steps (the void carved it)
    if (f > f0) for (let k = 0; k <= 3; k++) put(u0 + 4, lvl - 1, v0 + 1 + k, B.DECK_PLATE);
    if (f === f1) {
      // top landing: no flight up; a railing on the landing's last cell guards the well (k=4 of the flight below)
      put(u0 + 4, lvl, v0 + 4, B.IRON_BARS);
      continue;
    }
    for (let k = 0; k < 10; k++) {
      const su = k < 5 ? u0 + 4 : u0 + 5, sv = k < 5 ? v0 + 1 + k : v0 + 5 - (k - 5);
      if (k & 1) put(su, lvl + (k - 1) / 2, sv, STEP_FULL); else put(su, lvl + k / 2, sv, STEP_SLAB);
    }
    bp.room('stairwell', X(u0 + 4, v0 + 1), lvl, Z(u0 + 4, v0 + 1), X(u0 + 5, v0 + 5), Z(u0 + 5, v0 + 5));
  }
  bp.lift(X(u0 + 1, v0 + 1), Z(u0 + 1, v0 + 1), 5 * f0 + 1, 5 * f1 + 1);
  bp.lift(X(u0 + 1, v0 + 4), Z(u0 + 1, v0 + 4), 5 * f0 + 1, 5 * f1 + 1);
}
