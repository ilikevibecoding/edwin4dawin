import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import { mulberry32 } from '../engine/rng.js';
import {
  recentre, engineNozzle, greebleField, glowRig, sym,
  PLATE, BRICK, P, C, FINISH, OPAQUE,
} from './_util.js';

/*
 * Imperial-class Star Destroyer. 320 studs stem to stern, which is far too big
 * for studs or bevels on the hull -- the bulk is a stack of eight stepped
 * "wedge plate" layers built with { studs: false, bevel: false }. The command
 * superstructure is a separate, studded assembly because that is the only part
 * of the ship the camera ever gets close to.
 *
 * The camera flies UNDER this thing in the film, so the belly gets the greeble
 * budget: a ventral trench, a hangar mouth and a few hundred scattered tiles.
 */

const NOSE = 160, STERN = -160;
const TOP = 0;                       // dorsal deck sits at y = 0

/*
 * Eight hull layers. Each is a triangle: its apex recedes from the nose and its
 * stern half-width shrinks, so the stack forms the classic dagger -- flat wide
 * deck on top, a much smaller belly, knife-thin at the prow.
 */
const LAYERS = [
  { yTop: 0.0, h: 2.6, nose: 160, hwStern: 88, color: C.lightBluishGray },
  { yTop: -2.6, h: 2.6, nose: 153, hwStern: 86, color: C.lightBluishGray },
  { yTop: -5.2, h: 2.6, nose: 145, hwStern: 83.5, color: C.darkBluishGray },
  { yTop: -7.8, h: 3.0, nose: 136, hwStern: 80.5, color: C.lightBluishGray },
  { yTop: -10.8, h: 3.0, nose: 126, hwStern: 77, color: C.darkBluishGray },
  { yTop: -13.8, h: 3.4, nose: 114, hwStern: 72.5, color: C.lightBluishGray },
  { yTop: -17.2, h: 3.4, nose: 100, hwStern: 67, color: C.darkBluishGray },
  // The bottom layer is the one the camera flies past, so it stays light: the
  // belly greebles are all dark tiles and they vanish against a dark base.
  { yTop: -20.6, h: 3.4, nose: 82, hwStern: 60, color: C.lightBluishGray },
];
const BOTTOM = LAYERS[7].yTop - LAYERS[7].h;   // -24

// Dorsal trench: 16 studs wide, opening into a pit before the superstructure.
const TRENCH_Z0 = -104, TRENCH_Z1 = 44, TRENCH_HW = 8;
const PIT_Z0 = -104, PIT_Z1 = -84, PIT_HW = 21;
function dorsalGap(z) {
  if (z < PIT_Z1 && z > PIT_Z0) return PIT_HW;
  if (z < TRENCH_Z1 && z > TRENCH_Z0) return TRENCH_HW;
  return 0;
}

// Ventral channel with the main hangar mouth punched through it.
const HANGAR_Z0 = -102, HANGAR_Z1 = -56, HANGAR_HW = 24;
function ventralGap(z) {
  if (z < HANGAR_Z1 && z > HANGAR_Z0) return HANGAR_HW;
  if (z < 24 && z > -150) return 7;
  return 0;
}

const SUP_Z0 = -152, SUP_Z1 = -98;   // superstructure footprint

/** Half-width of a hull layer at z, quantised onto whole studs. */
function layerHw(L, z, grid = 1) {
  const k = L.hwStern / (L.nose - STERN);
  return Math.max(1, Math.round((L.nose - z) * k / grid) * grid);
}

/**
 * One hull layer: rectangular plates in Z bands with wedge plates filling each
 * step, optionally split around a centre gap (trench / hangar).
 */
function hullLayer(bb, L, gapOf, step = 8) {
  const bands = Math.ceil((L.nose - STERN) / step);
  const y = L.yTop - L.h;
  for (let i = 0; i < bands; i++) {
    const za = L.nose - i * step;
    const zb = Math.max(STERN, za - step);
    if (zb >= za - 0.01) continue;
    const zc = (za + zb) / 2;
    const hwA = layerHw(L, za), hwB = layerHw(L, zb);
    const lo = Math.min(hwA, hwB), hi = Math.max(hwA, hwB);
    const gap = gapOf ? gapOf(zc) : 0;
    const d = za - zb;

    if (gap > 0 && lo - gap > 1) {
      const w = lo - gap;
      sym(bb, (b, sg) => b.brick(sg * (gap + w / 2), y, zc, w, d, {
        h: L.h, color: L.color, studs: false, free: true,
      }));
    } else {
      bb.brick(0, y, zc, lo * 2, d, { h: L.h, color: L.color, studs: false, free: true });
    }
    if (hi - lo > 0.4) {
      const zWide = hwA > hwB ? za : zb;
      const zThin = hwA > hwB ? zb : za;
      sym(bb, (b, sg) => b.prism([[sg * lo, zThin], [sg * lo, zWide], [sg * hi, zWide]], L.h, {
        rx: Math.PI / 2, y: y + L.h / 2, color: L.color,
      }));
    }
  }
}

/**
 * Dorsal deck detail. The trick here is to build the plating out of *height*
 * rather than colour: raised slabs in the same grey as the hull read as armour
 * panels, whereas a patchwork of light and dark tiles reads as a chessboard.
 * Colour is spent only on the recessed panel grooves.
 */
function dorsalDetail(bb, rand) {
  const L0 = LAYERS[0];
  const GROOVE = C.darkBluishGray;

  // Grooves running parallel to each leading edge, stepping with the hull.
  for (let z = 152; z > -156; z -= 8) {
    const hw = layerHw(L0, z - 4);
    for (const off of [5, 13, 27]) {
      if (hw - off < 5) continue;
      sym(bb, (b, sg) => b.brick(sg * (hw - off), TOP, z - 4, 2.2, 8, {
        h: PLATE, color: GROOVE, tile: true, studs: false, free: true,
      }));
    }
  }
  // Transverse grooves out from the trench to the edge.
  for (let z = 148; z > -150; z -= 26) {
    const hw = layerHw(L0, z);
    const gap = Math.max(dorsalGap(z), 3);
    if (hw - gap < 10) continue;
    sym(bb, (b, sg) => b.brick(sg * (gap + (hw - gap) / 2), TOP, z, hw - gap, 2.2, {
      h: PLATE, color: GROOVE, tile: true, studs: false, free: true,
    }));
  }
  // Deep "wing" recesses either side of the trench.
  for (let z = 130; z > -150; z -= 10) {
    const hw = layerHw(L0, z - 5);
    if (hw < 30) continue;
    sym(bb, (b, sg) => b.brick(sg * hw * 0.62, TOP - PLATE, z - 5, 5, 10, {
      h: PLATE, color: C.darkGray, tile: true, studs: false, free: true,
    }));
  }
  // Armour panels: same grey, raised, so only the shading changes.
  for (let z = 150; z > -152; z -= 24) {
    const hw = layerHw(L0, z - 11);
    const gap = Math.max(dorsalGap(z - 11), 4);
    if (hw - gap < 12) continue;
    const lanes = Math.floor((hw - gap - 6) / 15);
    for (let j = 0; j < lanes; j++) {
      const x = gap + 6 + j * 15;
      const col = rand() < 0.18 ? C.veryLightGray : C.lightBluishGray;
      sym(bb, (b, sg) => b.brick(sg * x, TOP, z - 11, 11, 19, {
        h: P(2), color: col, studs: false, free: true,
      }));
      if (rand() < 0.5) {
        sym(bb, (b, sg) => b.brick(sg * x, TOP + P(2), z - 11, 6, 11, {
          h: PLATE, color: GROOVE, tile: true, studs: false, free: true,
        }));
      }
    }
  }
  // Edge rail plus blisters along the outer edge.
  for (let z = 150; z > -156; z -= 6) {
    const hw = layerHw(L0, z - 3);
    if (hw < 5) continue;
    sym(bb, (b, sg) => b.brick(sg * (hw - 1.2), TOP, z - 3, 2.4, 5.4, {
      h: P(2), color: C.lightBluishGray, studs: false, free: true,
    }));
    if (rand() < 0.35 && hw > 14) {
      sym(bb, (b, sg) => b.brick(sg * (hw - 4.5), TOP + P(2), z - 3, 3.5, 4, {
        h: P(4), color: GROOVE, studs: false, free: true,
      }));
    }
  }
  // Prow detail: the forward hull is narrow, so it gets its own finer pass.
  for (let z = 152; z > 40; z -= 7) {
    const hw = layerHw(L0, z - 3.5);
    if (hw < 4) continue;
    sym(bb, (b, sg) => b.brick(sg * (hw - 4), TOP, z - 3.5, 3.4, 6, {
      h: P(2), color: (z / 7) % 2 < 1 ? C.veryLightGray : C.lightBluishGray,
      studs: false, free: true,
    }));
    if (hw > 12) {
      bb.brick(0, TOP, z - 3.5, Math.min(10, hw - 8), 5, {
        h: PLATE, color: GROOVE, tile: true, studs: false, free: true,
      });
    }
  }
  // Blocky structures flanking the superstructure.
  for (const z of [SUP_Z0 + 6, SUP_Z0 + 22, SUP_Z0 + 38]) {
    sym(bb, (b, sg) => {
      b.brick(sg * 46, TOP, z, 18, 12, { h: P(6), color: C.lightBluishGray, studs: false, free: true });
      b.brick(sg * 46, TOP + P(6), z, 12, 8, { h: P(4), color: GROOVE, studs: false, free: true });
    });
  }
  // Turbolaser batteries: static stubs, cheap enough to scatter.
  for (let z = 128; z > -140; z -= 24) {
    const hw = layerHw(L0, z);
    if (hw < 24) continue;
    turretStub(bb, hw - 20, TOP + P(2), z, 1);
    turretStub(bb, -(hw - 20), TOP + P(2), z, 1);
  }
  // Trench-wall turrets: these are what the corvette gets shot at from.
  for (let z = 34; z > TRENCH_Z0 + 10; z -= 20) {
    turretStub(bb, TRENCH_HW + 3.6, TOP, z, 0.8);
    turretStub(bb, -(TRENCH_HW + 3.6), TOP, z, 0.8);
  }
}

/** Baked-in turret: five boxes, no studs. Reads as a gun at fly-by distance. */
function turretStub(bb, x, y, z, s = 1) {
  bb.cyl(x, y, z, 1.9 * s, P(2) * s, { color: C.darkBluishGray, seg: 10, stud: false });
  bb.brick(x, y + P(2) * s, z, 3 * s, 3 * s, { h: P(3) * s, color: C.lightBluishGray, studs: false, free: true });
  bb.brick(x, y + P(5) * s, z - 0.4 * s, 2 * s, 2 * s, { h: P(3) * s, color: C.darkBluishGray, studs: false, free: true });
  for (const sx of [-1, 1]) {
    bb.cyl(x + sx * 0.6 * s, y + P(6) * s, z + 2.4 * s, 0.24 * s, 4 * s, {
      axis: 'z', color: C.darkGray, seg: 6, stud: false,
    });
  }
}

/** Trench floor, walls and the pit that opens in front of the bridge. */
function trench(bb, rand) {
  const floorY = LAYERS[3].yTop;      // three layers were skipped above
  for (let z = TRENCH_Z1; z > TRENCH_Z0; z -= 8) {
    const hw = dorsalGap(z - 4);
    if (!hw) continue;
    bb.brick(0, floorY, z - 4, hw * 2 - 1, 8, {
      h: PLATE, color: C.darkGray, studs: false, free: true,
    });
    bb.brick(0, floorY + PLATE, z - 4, 3, 6, {
      h: PLATE, color: C.black, tile: true, studs: false, free: true,
    });
    sym(bb, (b, sg) => {
      // dark wall lining so the channel reads as a canyon, not a groove
      b.brick(sg * (hw - 0.6), floorY, z - 4, 1.2, 8, {
        h: TOP - floorY, color: C.black, studs: false, free: true,
      });
      // conduit ribs and a strip light every other band
      b.brick(sg * (hw - 1.9), floorY, z - 4, 1.6, 2.6, {
        h: P(9), color: C.darkBluishGray, studs: false, free: true,
      });
      if (Math.round(z / 8) % 2 === 0) {
        b.brick(sg * (hw - 1.4), floorY + P(11), z - 4, 0.5, 5, {
          h: P(1.5), color: C.transYellow, finish: FINISH.GLOW, studs: false, free: true,
        });
      }
      // lip capping the trench edge
      b.brick(sg * (hw + 1.2), TOP, z - 4, 3.2, 8, {
        h: P(2), color: C.lightBluishGray, studs: false, free: true,
      });
    });
  }
  greebleField(bb, rand, {
    x0: -PIT_HW + 3, x1: PIT_HW - 3, z0: PIT_Z0 + 3, z1: PIT_Z1 - 3, y: floorY + PLATE,
    count: 60, maxW: 4, maxD: 4,
    colors: [C.darkBluishGray, C.darkGray, C.black, C.lightBluishGray],
  });
}

/** Belly: hangar mouth, ventral channel detail and a lot of scattered junk. */
function underside(bb, rand) {
  const yb = BOTTOM;

  // --- hangar mouth: recessed bay with a lit floor and a glowing lip -------
  const hzc = (HANGAR_Z0 + HANGAR_Z1) / 2;
  const hzd = HANGAR_Z1 - HANGAR_Z0;
  const ceil = LAYERS[6].yTop;        // two layers were skipped above
  bb.brick(0, ceil, hzc, HANGAR_HW * 2, hzd, {
    h: PLATE, color: C.black, studs: false, free: true,
  });
  bb.brick(0, ceil - P(2), hzc, HANGAR_HW * 2 - 8, hzd - 8, {
    h: P(2), color: C.transLightBlue, finish: FINISH.GLOW, studs: false, free: true,
  });
  sym(bb, (b, sg) => {
    b.brick(sg * (HANGAR_HW - 1), yb, hzc, 2, hzd, { h: P(2), color: C.transNeonOrange, finish: FINISH.GLOW, studs: false, free: true });
    b.brick(sg * (HANGAR_HW - 3), ceil - P(1), hzc, 3, hzd - 2, { h: P(6), color: C.darkBluishGray, studs: false, free: true });
  });
  for (const z of [HANGAR_Z0 + 1, HANGAR_Z1 - 1]) {
    bb.brick(0, yb, z, HANGAR_HW * 2, 2, { h: P(2), color: C.transNeonOrange, finish: FINISH.GLOW, studs: false, free: true });
  }
  bb.node('hangarMouth', 0, yb - 0.5, hzc);

  // --- ventral channel ----------------------------------------------------
  const chY = LAYERS[6].yTop;
  for (let z = 20; z > -148; z -= 12) {
    if (z < HANGAR_Z1 && z > HANGAR_Z0) continue;
    if (!ventralGap(z - 6)) continue;
    bb.brick(0, chY, z - 6, 13, 12, { h: PLATE, color: C.darkGray, studs: false, free: true });
    bb.brick(0, chY - PLATE, z - 6, 4, 8, { h: PLATE, color: C.black, tile: true, studs: false, free: true });
  }

  // --- greeble the whole belly -------------------------------------------
  const L7 = LAYERS[7];
  const keepBelly = (x, z) => {
    if (z > HANGAR_Z0 - 3 && z < HANGAR_Z1 + 3 && Math.abs(x) < HANGAR_HW + 3) return false;
    if (Math.abs(x) < 8 && ventralGap(z)) return false;
    return Math.abs(x) < layerHw(L7, z) - 4;
  };
  // Two passes at different depths so the belly has relief, not just a texture.
  greebleField(bb, rand, {
    x0: -58, x1: 58, z0: -156, z1: 78, y: yb, down: true, count: 700,
    maxW: 8, maxD: 10, keep: keepBelly,
    colors: [C.darkBluishGray, C.darkGray, C.black, C.flatSilver, C.lightBluishGray],
  });
  greebleField(bb, rand, {
    x0: -54, x1: 54, z0: -152, z1: 70, y: yb - P(2), down: true, count: 340,
    maxW: 4, maxD: 4, keep: keepBelly,
    colors: [C.black, C.darkGray, C.flatSilver],
  });
  // Big ventral plates so the greebles read as detail on structure.
  for (let z = 70; z > -156; z -= 22) {
    const hw = layerHw(L7, z);
    if (hw < 16) continue;
    sym(bb, (b, sg) => {
      b.brick(sg * hw * 0.55, yb, z - 11, hw * 0.6, 18, {
        h: P(2), color: C.darkBluishGray, studs: false, free: true,
      });
      b.brick(sg * (hw - 2.5), yb - P(2), z - 11, 5, 20, {
        h: P(2), color: C.darkGray, studs: false, free: true,
      });
    });
  }
  // Tractor-beam / sensor domes on the belly.
  for (const [x, z] of [[0, 30], [-30, -34], [30, -34], [0, -126]]) {
    bb.cyl(x, yb - P(3), z, 3.2, P(3), { color: C.darkBluishGray, seg: 12, stud: false });
    bb.sphere(x, yb - P(3), z, 2.6, { color: C.darkGray, dome: true, seg: 12, rings: 5, rx: Math.PI });
    bb.cyl(x, yb - P(4), z, 1.1, P(1), {
      color: C.transLightBlue, finish: FINISH.GLOW, seg: 10, stud: false,
    });
  }
  // Running lights down the belly: with the camera flying underneath, these
  // are most of what sells the scale of the ship.
  const L7b = LAYERS[7];
  for (let z = 70; z > -156; z -= 13) {
    const hw = layerHw(L7b, z);
    if (hw < 8) continue;
    sym(bb, (b, sg) => b.brick(sg * (hw - 2), yb - PLATE, z, 0.9, 1.8, {
      h: P(1.5), color: C.transYellow, finish: FINISH.GLOW, studs: false, free: true,
    }));
  }
  for (let z = 40; z > -150; z -= 34) {
    if (z < HANGAR_Z1 + 6 && z > HANGAR_Z0 - 6) continue;
    sym(bb, (b, sg) => b.brick(sg * 12, yb - PLATE, z, 1.2, 2.6, {
      h: P(1.5), color: C.transLightBlue, finish: FINISH.GLOW, studs: false, free: true,
    }));
  }
}

/** Stern transom: three huge engine bells plus four outboard ones. */
function stern(bb) {
  const yMid = (TOP + BOTTOM) / 2;
  const hwS = LAYERS[0].hwStern;
  // transom wall, stepped like the hull layers
  for (const L of LAYERS) {
    bb.brick(0, L.yTop - L.h, STERN + 0.6, L.hwStern * 2, 1.2, {
      h: L.h, color: C.darkBluishGray, studs: false, free: true,
    });
  }
  bb.brick(0, TOP, STERN + 6, hwS * 2 - 14, 12, {
    h: P(6), color: C.lightBluishGray, studs: false, free: true,
  });
  bb.brick(0, TOP + P(6), STERN + 8, hwS * 2 - 40, 8, {
    h: P(5), color: C.darkBluishGray, studs: false, free: true,
  });

  // Three main bells.
  const big = [['engineC', 0], ['engineL', -27], ['engineR', 27]];
  for (const [name, x] of big) {
    bb.cyl(x, yMid, STERN + 1.5, 11.6, 3.4, { axis: 'z', color: C.darkBluishGray, seg: 24, stud: false });
    bb.cyl(x, yMid, STERN - 0.6, 11, 2.2, { axis: 'z', color: C.darkGray, seg: 24, stud: false });
    bb.cyl(x, yMid, STERN - 1.4, 10, 1.2, {
      axis: 'z', color: C.transLightBlue, finish: FINISH.GLOW, seg: 24, stud: false,
    });
    bb.cyl(x, yMid, STERN - 1.9, 6, 0.9, {
      axis: 'z', color: C.white, finish: FINISH.GLOW, seg: 20, stud: false,
    });
    bb.node(name, x, yMid, STERN - 2.6);
    // stiffening ribs round the bell
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      bb.brick(x + Math.cos(a) * 12.2, yMid + Math.sin(a) * 12.2 - 1, STERN + 2, 2, 3, {
        h: P(5), color: C.darkGray, studs: false, free: true,
      });
    }
  }
  // Four outboard bells.
  let i = 0;
  for (const x of [-52, -40, 40, 52]) {
    bb.cyl(x, yMid + 1, STERN + 1.5, 5.4, 3.2, { axis: 'z', color: C.darkBluishGray, seg: 14, stud: false });
    engineNozzle(bb, `engineAux${i++}`, x, yMid + 1, STERN - 0.8, 4.8, { depth: 2.4, seg: 14 });
  }
}

/** Command superstructure: the only studded part of the ship. */
function superstructure() {
  const bb = new BrickBuilder({ studs: true, studSeg: 8, bevel: true, cullStuds: true });
  const GRAY = C.lightBluishGray, DARK = C.darkBluishGray;
  const tiers = [
    { y: 0, h: 3.2, w: 68, z0: SUP_Z0, z1: SUP_Z1, color: DARK },
    { y: 3.2, h: 4.8, w: 52, z0: SUP_Z0 + 4, z1: SUP_Z1 - 6, color: GRAY },
    { y: 8.0, h: 5.0, w: 38, z0: SUP_Z0 + 8, z1: SUP_Z1 - 11, color: DARK },
    { y: 13.0, h: 8.0, w: 26, z0: SUP_Z0 + 12, z1: SUP_Z1 - 17, color: GRAY },
    { y: 21.0, h: 6.0, w: 31, z0: SUP_Z0 + 13, z1: SUP_Z1 - 18, color: DARK },
    { y: 27.0, h: 3.6, w: 23, z0: SUP_Z0 + 16, z1: SUP_Z1 - 22, color: GRAY, studs: true },
  ];
  for (const t of tiers) {
    const zc = (t.z0 + t.z1) / 2, zd = t.z1 - t.z0;
    bb.brick(0, t.y, zc, t.w, zd, { h: t.h, color: t.color, studs: t.studs ?? false });
    // ledge tiles so each tier reads as a separate stack of plates
    sym(bb, (b, sg) => b.brick(sg * (t.w / 2 - 1), t.y + t.h - PLATE, zc, 2, zd, {
      h: PLATE, color: C.veryLightGray, tile: true, studs: false, free: true,
    }));
  }

  // Bridge window band across the front of the command deck.
  const bz = SUP_Z0 + 13;
  bb.brick(0, 22.6, bz - 0.2, 27, 1.2, { h: P(6), color: C.transLightBlue, finish: FINISH.TRANS, studs: false });
  bb.brick(0, 22.6, bz + 0.9, 28, 1.2, { h: P(1), color: DARK, studs: false, free: true });
  sym(bb, (b, sg) => {
    b.brick(sg * 14.9, 21.0, bz + 2.2, 1.2, 5, { h: P(15), color: GRAY, studs: false });
    b.brick(sg * 13.1, 22.6, bz + 0.1, 1.4, 1.4, { h: P(6), color: DARK, studs: false, free: true });
  });
  bb.node('bridge', 0, 24.4, bz - 1.4);

  // Deflector-shield globes on their gimbal necks.
  sym(bb, (b, sg) => {
    b.cyl(sg * 9.0, 30.6, SUP_Z0 + 26, 1.8, P(5), { color: DARK, seg: 10, stud: false });
    b.sphere(sg * 9.0, 36.4, SUP_Z0 + 26, 4.0, { color: C.lightBluishGray, seg: 14, rings: 10 });
    b.cyl(sg * 9.0, 36.4, SUP_Z0 + 26, 4.15, P(1), { color: C.darkGray, seg: 14, stud: false });
  });
  // Central comms spire between the globes.
  bb.cyl(0, 30.6, SUP_Z0 + 26, 1.4, P(6), { color: GRAY, seg: 10 });
  bb.cyl(0, 33.0, SUP_Z0 + 26, 0.6, 6.0, { color: DARK, seg: 8, stud: false });
  bb.cone(0, 39.0, SUP_Z0 + 26, 0.85, 1.8, { color: C.flatSilver, finish: FINISH.METAL, seg: 8 });

  // Lit windows down the tower flanks + red running lights.
  sym(bb, (b, sg) => {
    for (let z = SUP_Z0 + 14; z < SUP_Z1 - 18; z += 3) {
      b.brick(sg * 19.05, 10.5, z, 0.4, 1.6, { h: P(4), color: C.transYellow, finish: FINISH.GLOW, studs: false, free: true });
      b.brick(sg * 13.05, 15.0, z, 0.4, 1.6, { h: P(4), color: C.transYellow, finish: FINISH.GLOW, studs: false, free: true });
      b.brick(sg * 13.05, 18.4, z, 0.4, 1.6, { h: P(4), color: C.transYellow, finish: FINISH.GLOW, studs: false, free: true });
    }
    b.brick(sg * 26, 3.2, SUP_Z0 + 5, 2, 2, { h: P(2), color: C.red, finish: OPAQUE, studs: false, free: true });
  });
  // Docking bays and greebles on tier 0.
  const rand = mulberry32(4242);
  greebleField(bb, rand, {
    x0: -32, x1: 32, z0: SUP_Z0 + 2, z1: SUP_Z1 - 2, y: 3.2, count: 90, maxW: 4, maxD: 4,
    colors: [DARK, C.darkGray, C.black, C.veryLightGray],
    keep: (x, z) => Math.abs(x) > 26 || z > SUP_Z1 - 8 || z < SUP_Z0 + 4,
  });
  return bb.build();
}

function buildStarDestroyer() {
  const rand = mulberry32(19770525);
  // Bulk hull: no studs, no bevels. 320 studs of ship has to stay cheap.
  const bb = new BrickBuilder({
    studs: false, bevel: false, cullStuds: false, seams: true, vertexColors: true,
  });
  LAYERS.forEach((L, i) => {
    const gap = i < 3 ? dorsalGap : i >= 6 ? ventralGap : null;
    hullLayer(bb, L, gap, 8);
  });
  dorsalDetail(bb, rand);
  trench(bb, rand);
  underside(bb, rand);
  stern(bb);
  const hull = bb.build();

  const sup = superstructure();

  const inner = new THREE.Group();
  inner.add(hull, sup);
  inner.userData.nodes = { ...hull.userData.nodes, ...sup.userData.nodes };

  const model = recentre(inner, { y: 'centre' });
  const glow = glowRig(hull, sup);
  model.userData.update = (t) => {
    glow.set(0.9 + Math.sin(t * 1.7) * 0.06 + Math.sin(t * 4.3) * 0.04);
  };
  return model;
}

register('stardestroyer', () => buildStarDestroyer(), {
  notes: 'Imperial-class Star Destroyer, 320 studs long; nodes engineL/C/R, engineAux0..3, bridge, hangarMouth',
});
