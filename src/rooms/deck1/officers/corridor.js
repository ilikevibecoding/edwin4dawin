// Private corridor dressing: heavy recessed doorways with fixed leaves (open into the pocket or closed
// with a status lamp), number/rank plates, intercoms, notice screens, ribs and ceiling cable trays.
import { FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";
import { mount, plate, junctionBox } from "./lib.js";

const black = { color: IMP.black, texel: 1 };
const dark = { color: IMP.dark, texel: 1 };
const midM = { color: IMP.mid, texel: 2 };

/**
 * One corridor doorway. wallX = partition centre; face = corridor-side visible face x; n = normal into the
 * corridor ("+x" for the west wall, "-x" for the east wall); z0..z1 = gap; opts: { closed, cell, rankCell, label }
 */
export function doorway(kit, { wallX, face, n, z0, z1, h = 2.2, closed = false, cell = 14, rankCell = 9, status = true, pocket = -1 }) {
  const zc = (z0 + z1) / 2;
  const w = z1 - z0;
  const dir = n === "+x" ? 1 : -1;
  const y = (v) => FLOOR + v;
  // stepped heavy frame: outer band 0.3 wide / 0.12 proud, inner lip 0.1 wide / 0.2 proud, header with a light slot
  mount(kit, "paintedMetal", [face, y(h / 2 + 0.1), z0 - 0.15], n, 0.3, h + 0.2, 0, 0.12, dark);
  mount(kit, "paintedMetal", [face, y(h / 2 + 0.1), z1 + 0.15], n, 0.3, h + 0.2, 0, 0.12, dark);
  mount(kit, "paintedMetal", [face, y(h + 0.32), zc], n, w + 0.6, 0.45, 0, 0.12, dark);
  mount(kit, "paintedMetal", [face, y(h / 2), z0 - 0.05], n, 0.1, h, 0.12, 0.2, black);
  mount(kit, "paintedMetal", [face, y(h / 2), z1 + 0.05], n, 0.1, h, 0.12, 0.2, black);
  mount(kit, "paintedMetal", [face, y(h + 0.1), zc], n, w + 0.2, 0.2, 0.12, 0.2, black);
  mount(kit, "emitWhite", [face, y(h + 0.01), zc], n, w - 0.1, 0.012, 0.13, 0.19);
  // kick plates and a threshold across the wall thickness
  mount(kit, "metal", [face, y(0.08), z0 - 0.15], n, 0.3, 0.16, 0.12, 0.13, midM);
  mount(kit, "metal", [face, y(0.08), z1 + 0.15], n, 0.3, 0.16, 0.12, 0.13, midM);
  kit.boxMM("metal", [wallX - 0.17, FLOOR, z0], [wallX + 0.17, FLOOR + 0.012, z1], midM);
  // leaf: closed = full leaf centred in the wall; open = slid into the pocket, only its leading edge shows
  const lx0 = wallX - 0.03;
  const lx1 = wallX + 0.03;
  if (closed) {
    kit.boxMM("paintedMetal", [lx0, FLOOR + 0.01, z0 + 0.01], [lx1, FLOOR + h - 0.01, z1 - 0.01], { color: IMP.mid, texel: 1 });
    for (const sx of [lx0 - 0.01, lx1]) {
      kit.boxMM("paintedMetal", [sx, FLOOR + 0.3, z0 + 0.12], [sx + 0.01, FLOOR + h - 0.3, z1 - 0.12], dark);
      kit.boxMM("paintedMetal", [sx - 0.002, FLOOR + 1.15, z0 + 0.1], [sx + 0.012, FLOOR + 1.19, z1 - 0.1], black);
      kit.boxMM("metal", [sx - 0.02, FLOOR + 0.95, zc - 0.25], [sx + 0.012, FLOOR + 0.99, zc + 0.25], midM);
    }
    kit.collider([lx0 - 0.02, FLOOR, z0], [lx1 + 0.02, FLOOR + h, z1], "door-closed");
  } else {
    const ez0 = pocket < 0 ? z0 : z1 - 0.1;
    kit.boxMM("paintedMetal", [lx0, FLOOR + 0.01, ez0], [lx1, FLOOR + h - 0.01, ez0 + 0.1], { color: IMP.mid, texel: 1 });
    kit.boxMM("paintedMetal", [lx0 - 0.005, FLOOR + 0.02, pocket < 0 ? ez0 + 0.09 : ez0], [lx1 + 0.005, FLOOR + h - 0.02, pocket < 0 ? ez0 + 0.1 : ez0 + 0.01], black);
  }
  // status lamp on the header, number + rank plates and an intercom beside the door
  if (status) {
    mount(kit, "paintedMetal", [face, y(h + 0.42), zc], n, 0.24, 0.1, 0.12, 0.17, black);
    mount(kit, closed ? "emitRedImp" : "emitBlue", [face, y(h + 0.42), zc], n, 0.16, 0.05, 0.17, 0.18);
  }
  const pz = z1 + 0.62;
  mount(kit, "darkGloss", [face, y(1.78), pz], n, 0.34, 0.6, 0.0, 0.015);
  plate(kit, [face, y(1.92), pz], n, 0.26, 0.26, cell, 0.015);
  plate(kit, [face, y(1.62), pz], n, 0.26, 0.26, rankCell, 0.015);
  mount(kit, "paintedMetal", [face, y(1.2), pz], n, 0.16, 0.26, 0.0, 0.04, black);
  for (let i = 0; i < 4; i++) mount(kit, "metal", [face, y(1.27 - i * 0.03), pz], n, 0.1, 0.012, 0.04, 0.045, midM);
  mount(kit, "emitBlue", [face, y(1.11), pz - 0.03], n, 0.03, 0.02, 0.04, 0.047);
  mount(kit, "emitRedImp", [face, y(1.11), pz + 0.03], n, 0.03, 0.02, 0.04, 0.047);
  mount(kit, "metal", [face, y(1.1), pz], n, 0.16, 0.012, 0.0, 0.05, midM);
}

// Notice screen in a black housing with a title bar and indicator row
export function noticeScreen(kit, p, n, w = 1.3, h = 0.72, screen = "screenImp0") {
  mount(kit, "paintedMetal", p, n, w + 0.12, h + 0.16, 0, 0.06, black);
  mount(kit, screen, p, n, w, h, 0.06, 0.065, { uv: "keep" });
  mount(kit, "metal", [p[0], p[1] + h / 2 + 0.05, p[2]], n, w, 0.02, 0.06, 0.065, midM);
  const alongZ = n === "+x" || n === "-x";
  for (let i = 0; i < 5; i++) {
    const o = -w / 2 + 0.1 + i * 0.08;
    const q = alongZ ? [p[0], p[1] - h / 2 - 0.05, p[2] + o] : [p[0] + o, p[1] - h / 2 - 0.05, p[2]];
    mount(kit, i % 2 ? "emitRedImp" : "emitBlue", q, n, 0.04, 0.02, 0.06, 0.066);
  }
}

// Ribs (frame around the section) at explicit z stations, the corridorDressing() look
export function ribs(kit, x0, x1, floorY, ceilY, stations) {
  const rib = 0.18;
  const depth = 0.16;
  for (const a of stations) {
    kit.boxMM("paintedMetal", [x0, floorY, a - rib / 2], [x0 + depth, ceilY, a + rib / 2], dark);
    kit.boxMM("paintedMetal", [x1 - depth, floorY, a - rib / 2], [x1, ceilY, a + rib / 2], dark);
    kit.boxMM("paintedMetal", [x0, ceilY - depth, a - rib / 2], [x1, ceilY, a + rib / 2], dark);
    kit.boxMM("emitWhite", [x0 + depth, ceilY - 0.08, a - 0.03], [x1 - depth, ceilY - 0.05, a + 0.03]);
    kit.boxMM("metal", [x0, floorY + 1.0, a - rib / 2 - 0.01], [x0 + depth + 0.01, floorY + 1.04, a + rib / 2 + 0.01], midM);
    kit.boxMM("metal", [x1 - depth - 0.01, floorY + 1.0, a - rib / 2 - 0.01], [x1, floorY + 1.04, a + rib / 2 + 0.01], midM);
  }
}

// Two ceiling cable trays running the corridor length with hangers and a cable bundle each
export function cableTrays(kit, ceilY, z0, z1, xs) {
  for (const x of xs) {
    const yb = ceilY - 0.36;
    kit.boxMM("metalRough", [x - 0.16, yb, z0], [x + 0.16, yb + 0.02, z1], midM);
    kit.boxMM("metalRough", [x - 0.16, yb, z0], [x - 0.14, yb + 0.08, z1], midM);
    kit.boxMM("metalRough", [x + 0.14, yb, z0], [x + 0.16, yb + 0.08, z1], midM);
    kit.boxMM("paintedMetal", [x - 0.1, yb + 0.02, z0 + 0.5], [x + 0.02, yb + 0.06, z1 - 0.5], black);
    kit.boxMM("paintedMetal", [x + 0.03, yb + 0.02, z0 + 0.3], [x + 0.11, yb + 0.05, z1 - 0.3], dark);
    for (let z = z0 + 1.5; z < z1 - 0.5; z += 3) {
      kit.boxMM("paintedMetal", [x - 0.02, yb + 0.08, z - 0.015], [x + 0.02, ceilY, z + 0.015], black);
      kit.boxMM("paintedMetal", [x - 0.18, yb + 0.08, z - 0.02], [x + 0.18, yb + 0.11, z + 0.02], black);
    }
  }
}

// Corridor end wall display (focal point for the long view) + a panel of junction boxes
export function endWall(kit, z, xc, n) {
  noticeScreen(kit, [xc, FLOOR + 1.75, z], n, 1.6, 0.9, "screenImp3");
  mount(kit, "darkGloss", [xc, FLOOR + 2.55, z], n, 1.9, 0.3, 0, 0.02);
  plate(kit, [xc - 0.7, FLOOR + 2.55, z], n, 0.26, 0.26, 0, 0.02);
  plate(kit, [xc + 0.7, FLOOR + 2.55, z], n, 0.26, 0.26, 14, 0.02);
  mount(kit, "emitWhite", [xc, FLOOR + 2.55, z], n, 1.0, 0.04, 0.02, 0.03);
  junctionBox(kit, [xc - 1.3, FLOOR + 1.5, z], n, "emitRedImp");
  junctionBox(kit, [xc + 1.3, FLOOR + 1.5, z], n, "emitBlue");
  mount(kit, "paintedMetal", [xc, FLOOR + 0.6, z], n, 2.0, 0.5, 0, 0.35, dark);
  mount(kit, "metal", [xc, FLOOR + 0.86, z], n, 2.0, 0.02, 0, 0.36, midM);
  if (n === "+z") kit.collider([xc - 1.0, FLOOR, z], [xc + 1.0, FLOOR + 0.87, z + 0.36], "bench");
  else kit.collider([xc - 1.0, FLOOR, z - 0.36], [xc + 1.0, FLOOR + 0.87, z], "bench");
}
