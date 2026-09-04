// Private corridor dressing: heavy recessed doorways with fixed leaves (open into the pocket or closed
// with a status lamp), atlas nameplates, amber bar lamps, intercoms, clean door-adjacent plates, ribs,
// ceiling bay ribs, cable trays, service hatches / fire stations and the end-wall display.
import { FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";
import { mount, plate, junctionBox, amberBar, display, cleanPlate } from "./lib.js";

const black = { color: IMP.black, texel: 1 };
const dark = { color: IMP.dark, texel: 1 };
const midM = { color: IMP.mid, texel: 2 };
// impPanel tints for surfaces that used to be paintedMetal: the worn-metal chip map reads as stains on anything
// bigger than ~0.5 m² above knee height (critic round 2), and impPanel's base is ~2.1× brighter, so × 0.47 keeps the albedo
const CLEAN = 0.47;
const clean = (c, texel = 1) => ({ color: c.clone().multiplyScalar(CLEAN), texel });
const cleanBlack = clean(IMP.black);
const cleanDark = clean(IMP.dark);
const cleanMid = clean(IMP.mid);

/**
 * One corridor doorway. wallX = partition centre; face = corridor-side visible face x; n = normal into the
 * corridor ("+x" for the west wall, "-x" for the east wall); z0..z1 = gap.
 * opts: { closed, plateName, pocket, plateColor, lamp }
 */
export function doorway(kit, { wallX, face, n, z0, z1, h = 2.2, closed = false, plateName = "plate0", status = true, pocket = -1, plateColor = IMP.grey, lamp = true, ceilY = FLOOR + 3.2 }) {
  const zc = (z0 + z1) / 2;
  const w = z1 - z0;
  const y = (v) => FLOOR + v;
  // clean plates over the door-adjacent panels (the shared panel texture's dot clusters read as pitting)
  cleanPlate(kit, [face, y(1.15), z0 - 0.79], n, 0.92, 1.66, { color: plateColor });
  cleanPlate(kit, [face, y(1.15), z1 + 0.79], n, 0.92, 1.66, { color: plateColor });
  mount(kit, "impPanel", [face, (y(2.77) + ceilY - 0.03) / 2, zc], n, w + 0.6, ceilY - 0.03 - y(2.77), 0, 0.02, cleanDark);
  // stepped heavy frame: outer band 0.3 wide / 0.12 proud, inner lip 0.1 wide / 0.2 proud, header with a light slot
  // (clean panel material on the big frame faces; wear stays on the kick plates and lips below knee height)
  mount(kit, "impPanel", [face, y(h / 2 + 0.1), z0 - 0.15], n, 0.3, h + 0.2, 0, 0.12, cleanDark);
  mount(kit, "impPanel", [face, y(h / 2 + 0.1), z1 + 0.15], n, 0.3, h + 0.2, 0, 0.12, cleanDark);
  mount(kit, "impPanel", [face, y(h + 0.32), zc], n, w + 0.6, 0.45, 0, 0.12, cleanDark);
  mount(kit, "impPanel", [face, y(h / 2), z0 - 0.05], n, 0.1, h, 0.12, 0.2, cleanBlack);
  mount(kit, "impPanel", [face, y(h / 2), z1 + 0.05], n, 0.1, h, 0.12, 0.2, cleanBlack);
  mount(kit, "impPanel", [face, y(h + 0.1), zc], n, w + 0.2, 0.2, 0.12, 0.2, cleanBlack);
  mount(kit, "emitWarmSoft", [face, y(h + 0.01), zc], n, w - 0.1, 0.012, 0.13, 0.19);
  // kick plates and a threshold across the wall thickness
  mount(kit, "metal", [face, y(0.08), z0 - 0.15], n, 0.3, 0.16, 0.12, 0.13, midM);
  mount(kit, "metal", [face, y(0.08), z1 + 0.15], n, 0.3, 0.16, 0.12, 0.13, midM);
  kit.boxMM("metal", [wallX - 0.17, FLOOR, z0], [wallX + 0.17, FLOOR + 0.012, z1], midM);
  // leaf: closed = full leaf centred in the wall; open = slid into the pocket, only its leading edge shows
  const lx0 = wallX - 0.03;
  const lx1 = wallX + 0.03;
  if (closed) {
    kit.boxMM("impPanel", [lx0, FLOOR + 0.01, z0 + 0.01], [lx1, FLOOR + h - 0.01, z1 - 0.01], cleanMid);
    // scuffed kick band on the leaf (wear below knee height only)
    kit.boxMM("paintedMetal", [lx0 - 0.004, FLOOR + 0.02, z0 + 0.03], [lx1 + 0.004, FLOOR + 0.3, z1 - 0.03], dark);
    for (const sx of [lx0 - 0.01, lx1]) {
      kit.boxMM("paintedMetal", [sx, FLOOR + 0.3, z0 + 0.12], [sx + 0.01, FLOOR + h - 0.3, z1 - 0.12], dark);
      kit.boxMM("paintedMetal", [sx - 0.002, FLOOR + 1.15, z0 + 0.1], [sx + 0.012, FLOOR + 1.19, z1 - 0.1], black);
      kit.boxMM("metal", [sx - 0.02, FLOOR + 0.95, zc - 0.25], [sx + 0.012, FLOOR + 0.99, zc + 0.25], midM);
    }
    kit.collider([lx0 - 0.02, FLOOR, z0], [lx1 + 0.02, FLOOR + h, z1], "door-closed");
  } else {
    const ez0 = pocket < 0 ? z0 : z1 - 0.1;
    kit.boxMM("impPanel", [lx0, FLOOR + 0.01, ez0], [lx1, FLOOR + h - 0.01, ez0 + 0.1], cleanMid);
    kit.boxMM("impPanel", [lx0 - 0.005, FLOOR + 0.02, pocket < 0 ? ez0 + 0.09 : ez0], [lx1 + 0.005, FLOOR + h - 0.02, pocket < 0 ? ez0 + 0.1 : ez0 + 0.01], cleanBlack);
  }
  // status lamp on the header, nameplate + intercom beside the door, amber bar on the other side
  if (status) {
    mount(kit, "paintedMetal", [face, y(h + 0.42), zc], n, 0.24, 0.1, 0.12, 0.17, black);
    mount(kit, closed ? "emitRedImp" : "emitBlue", [face, y(h + 0.42), zc], n, 0.16, 0.05, 0.17, 0.18);
  }
  const pz = z1 + 0.66;
  display(kit, [face, y(1.5), pz], n, plateName, 0.32, { bezel: 0.02, depth: 0.045 });
  mount(kit, "paintedMetal", [face, y(1.2), pz], n, 0.16, 0.26, 0.025, 0.065, black);
  for (let i = 0; i < 4; i++) mount(kit, "metal", [face, y(1.27 - i * 0.03), pz], n, 0.1, 0.012, 0.065, 0.07, midM);
  mount(kit, "emitBlue", [face, y(1.11), pz - 0.03], n, 0.03, 0.02, 0.065, 0.072);
  mount(kit, "emitRedImp", [face, y(1.11), pz + 0.03], n, 0.03, 0.02, 0.065, 0.072);
  mount(kit, "metal", [face, y(1.1), pz], n, 0.16, 0.012, 0.025, 0.075, midM);
  if (lamp) amberBar(kit, [face, y(1.6), z0 - 0.62], n);
}

// Clean wall bands on a corridor face between the doorways: light plates with corner bolts at eye level
// (0.32..1.98), dark panelling above the strip channel (2.3..ceiling). ≤ 2.4 m segments with 2 cm seams.
export function wallBands(kit, face, n, from, to, doors, ceilY, color) {
  const sorted = [...doors].sort((p, q) => p[0] - q[0]);
  const gaps = (margin) => {
    const out = [];
    let a = from + 0.02;
    for (const [z0, z1] of sorted) {
      out.push([a, z0 - margin]);
      a = z1 + margin;
    }
    out.push([a, to - 0.02]);
    return out;
  };
  const seg = (lo, hi, y0, y1, opts) => {
    if (hi - lo < 0.3) return;
    const count = Math.ceil((hi - lo) / 2.4);
    const w = (hi - lo - 0.02 * (count - 1)) / count;
    for (let i = 0; i < count; i++) cleanPlate(kit, [face, (y0 + y1) / 2, lo + i * (w + 0.02) + w / 2], n, w, y1 - y0, opts);
  };
  for (const [lo, hi] of gaps(1.27)) seg(lo, hi, FLOOR + 0.32, FLOOR + 1.98, { color, bolts: true });
  // large texel: the worn-metal spots would otherwise read as dots under the ceiling pools
  for (const [lo, hi] of gaps(0.32)) seg(lo, hi, FLOOR + 2.3, ceilY - 0.03, { color: IMP.dark, bolts: false, proud: 0.02, texel: 3 });
}

// Notice screen: atlas display with a title bar and an indicator row
export function noticeScreen(kit, p, n, name = "notice", w = 0.9) {
  const [fw, fh] = display(kit, p, n, name, w, { bezel: 0.05, depth: 0.05 });
  mount(kit, "metal", [p[0], p[1] + fh / 2 + 0.03, p[2]], n, fw, 0.015, 0.05, 0.055, midM);
  const alongZ = n === "+x" || n === "-x";
  for (let i = 0; i < 4; i++) {
    const o = -fw / 2 + 0.06 + i * 0.07;
    const q = alongZ ? [p[0], p[1] - fh / 2 - 0.03, p[2] + o] : [p[0] + o, p[1] - fh / 2 - 0.03, p[2]];
    mount(kit, i % 2 ? "emitRedImp" : "emitAmber", q, n, 0.04, 0.015, 0.05, 0.056);
  }
  return [fw, fh];
}

// Ribs (frame around the section) at explicit z stations, the corridorDressing() look, warm line
export function ribs(kit, x0, x1, floorY, ceilY, stations) {
  const rib = 0.18;
  const depth = 0.16;
  for (const a of stations) {
    kit.boxMM("impPanel", [x0, floorY, a - rib / 2], [x0 + depth, ceilY, a + rib / 2], cleanDark);
    kit.boxMM("impPanel", [x1 - depth, floorY, a - rib / 2], [x1, ceilY, a + rib / 2], cleanDark);
    kit.boxMM("impPanel", [x0, ceilY - depth, a - rib / 2], [x1, ceilY, a + rib / 2], cleanDark);
    kit.boxMM("emitWarmSoft", [x0 + depth, ceilY - 0.08, a - 0.02], [x1 - depth, ceilY - 0.06, a + 0.02]);
    kit.boxMM("metal", [x0, floorY + 1.0, a - rib / 2 - 0.01], [x0 + depth + 0.01, floorY + 1.04, a + rib / 2 + 0.01], midM);
    kit.boxMM("metal", [x1 - depth - 0.01, floorY + 1.0, a - rib / 2 - 0.01], [x1, floorY + 1.04, a + rib / 2 + 0.01], midM);
  }
}

// Ceiling-only bay ribs: 0.2 m dark band across the ceiling breaking the light channel every 4 m bay
export function ceilingRibs(kit, x0, x1, ceilY, stations) {
  for (const a of stations) {
    kit.boxMM("impPanel", [x0, ceilY - 0.1, a - 0.1], [x1, ceilY, a + 0.1], cleanBlack);
    kit.boxMM("metal", [x0 + 0.3, ceilY - 0.11, a - 0.03], [x1 - 0.3, ceilY - 0.1, a + 0.03], midM);
  }
}

// Two ceiling cable trays running the corridor length with hangers and a cable bundle each
export function cableTrays(kit, ceilY, z0, z1, xs) {
  for (const x of xs) {
    const yb = ceilY - 0.36;
    kit.boxMM("metalRough", [x - 0.16, yb, z0], [x + 0.16, yb + 0.02, z1], midM);
    kit.boxMM("metalRough", [x - 0.16, yb, z0], [x - 0.14, yb + 0.08, z1], midM);
    kit.boxMM("metalRough", [x + 0.14, yb, z0], [x + 0.16, yb + 0.08, z1], midM);
    // cable bundles + hangers in clean panel (the 53 m worn-metal runs under the ceiling read as a chipped seam)
    kit.boxMM("impPanel", [x - 0.1, yb + 0.02, z0 + 0.5], [x + 0.02, yb + 0.06, z1 - 0.5], cleanBlack);
    kit.boxMM("impPanel", [x + 0.03, yb + 0.02, z0 + 0.3], [x + 0.11, yb + 0.05, z1 - 0.3], cleanDark);
    for (let z = z0 + 1.5; z < z1 - 0.5; z += 3) {
      kit.boxMM("impPanel", [x - 0.02, yb + 0.08, z - 0.015], [x + 0.02, ceilY, z + 0.015], cleanBlack);
      kit.boxMM("impPanel", [x - 0.18, yb + 0.08, z - 0.02], [x + 0.18, yb + 0.11, z + 0.02], cleanBlack);
    }
  }
}

// Service hatch: framed 0.8 × 1.2 access panel with grooves, handle, status dot and label
export function serviceHatch(kit, p, n) {
  const alongZ = n === "+x" || n === "-x";
  mount(kit, "impPanel", p, n, 0.94, 1.34, 0, 0.06, cleanBlack);
  mount(kit, "impPanel", p, n, 0.8, 1.2, 0.06, 0.085, cleanMid);
  for (const dy of [-0.3, 0.3]) mount(kit, "impPanel", [p[0], p[1] + dy, p[2]], n, 0.7, 0.02, 0.085, 0.09, cleanBlack);
  const hq = alongZ ? [p[0], p[1], p[2] + 0.3] : [p[0] + 0.3, p[1], p[2]];
  mount(kit, "metal", hq, n, 0.04, 0.24, 0.085, 0.12, midM);
  mount(kit, "emitAmber", alongZ ? [p[0], p[1] + 0.5, p[2] - 0.3] : [p[0] - 0.3, p[1] + 0.5, p[2]], n, 0.05, 0.02, 0.085, 0.092);
  display(kit, [p[0], p[1] + 0.78, p[2]], n, "lblService", 0.3, { bezel: 0.01, depth: 0.02 });
}

// Fire-suppression station: red-banded cabinet with a beacon and label
export function fireStation(kit, p, n) {
  mount(kit, "impPanel", p, n, 0.4, 0.6, 0, 0.14, cleanDark);
  mount(kit, "paintedMetal", [p[0], p[1] + 0.12, p[2]], n, 0.4, 0.08, 0.14, 0.145, { color: IMP.red, texel: 1 });
  mount(kit, "paintedMetal", [p[0], p[1] - 0.12, p[2]], n, 0.4, 0.08, 0.14, 0.145, { color: IMP.red, texel: 1 });
  mount(kit, "metal", [p[0], p[1] - 0.02, p[2]], n, 0.03, 0.16, 0.14, 0.17, midM);
  mount(kit, "paintedMetal", [p[0], p[1] + 0.36, p[2]], n, 0.12, 0.1, 0.02, 0.1, black);
  mount(kit, "emitRedImp", [p[0], p[1] + 0.36, p[2]], n, 0.08, 0.05, 0.1, 0.11);
  display(kit, [p[0], p[1] - 0.4, p[2]], n, "lblFire", 0.3, { bezel: 0.01, depth: 0.02 });
  plate(kit, [p[0], p[1] - 0.6, p[2]], n, 0.18, 0.18, 1);
}

/**
 * Centre floor strip in the corridor-kit look, with the blue edge lines recessed in a groove: a 1.5 cm emitter
 * (half the shared kit's 3 cm bar) set 4 mm below two black lips, so only its top face shows and it disappears
 * at grazing angles instead of converging into two white lines (critic round 2: "floor edge strips clip white").
 * Long thin boxes are split into ≤ 6 m pieces (depth precision under software GL).
 */
export function floorStrip(kit, xc, z0, z1, { segment = 6 } = {}) {
  const n = Math.max(1, Math.ceil((z1 - z0) / segment));
  const run = (lo, hi, place) => {
    for (let i = 0; i < n; i++) place(lo + ((hi - lo) * i) / n, lo + ((hi - lo) * (i + 1) / n));
  };
  run(z0, z1, (a, b) => kit.boxMM("blackGloss", [xc - 0.5, FLOOR, a], [xc + 0.5, FLOOR + 0.012, b], { color: IMP.black }));
  for (const s of [-1, 1]) {
    const gx0 = xc + s * 0.5;
    const gx1 = xc + s * 0.56;
    const lo = Math.min(gx0, gx1);
    const hi = Math.max(gx0, gx1);
    // groove floor + outer lip; the inner lip is the centre strip's own edge
    run(z0, z1, (a, b) => kit.boxMM("paintedMetal", [lo, FLOOR, a], [hi, FLOOR + 0.004, b], black));
    run(z0, z1, (a, b) => kit.boxMM("paintedMetal", [s > 0 ? hi - 0.025 : lo, FLOOR + 0.004, a], [s > 0 ? hi : lo + 0.025, FLOOR + 0.012, b], black));
    const ex0 = xc + s * 0.512;
    const ex1 = xc + s * 0.527;
    run(z0 + 0.4, z1 - 0.4, (a, b) => kit.boxMM("emitBlue", [Math.min(ex0, ex1), FLOOR + 0.004, a], [Math.max(ex0, ex1), FLOOR + 0.008, b]));
  }
}

// Floor scuffs along the centre path / thresholds: a few thin dark patches beside the strip
export function floorScuffs(kit, xc, zs) {
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i];
    const side = i % 2 ? 1 : -1;
    const x = xc + side * (0.78 + (i % 3) * 0.12);
    kit.boxMM("paintedMetal", [x - 0.18, FLOOR, z - 0.3 - (i % 2) * 0.2], [x + 0.18, FLOOR + 0.002, z + 0.3], black);
    kit.boxMM("paintedMetal", [x + 0.25 * side - 0.08, FLOOR, z + 0.35], [x + 0.25 * side + 0.08, FLOOR + 0.002, z + 0.9], black);
  }
}

// Corridor end wall display (focal point for the long view) + a bench below
export function endWall(kit, z, xc, n) {
  const [fw, fh] = noticeScreen(kit, [xc, FLOOR + 1.85, z], n, "status", 1.2);
  mount(kit, "darkGloss", [xc, FLOOR + 1.85 + fh / 2 + 0.3, z], n, fw + 0.6, 0.24, 0, 0.02);
  mount(kit, "emitWarmSoft", [xc, FLOOR + 1.85 + fh / 2 + 0.3, z], n, fw, 0.03, 0.02, 0.03);
  amberBar(kit, [xc - fw / 2 - 0.45, FLOOR + 1.7, z], n);
  amberBar(kit, [xc + fw / 2 + 0.45, FLOOR + 1.7, z], n);
  junctionBox(kit, [xc - 1.35, FLOOR + 0.9 + 0.35, z], n, "emitRedImp");
  junctionBox(kit, [xc + 1.35, FLOOR + 0.9 + 0.35, z], n, "emitBlue");
  mount(kit, "paintedMetal", [xc, FLOOR + 0.55, z], n, 2.0, 0.45, 0, 0.35, dark);
  mount(kit, "fabric", [xc, FLOOR + 0.8, z], n, 1.9, 0.06, 0.02, 0.34, { color: IMP.dark, texel: 2 });
  if (n === "+z") kit.collider([xc - 1.0, FLOOR, z], [xc + 1.0, FLOOR + 0.85, z + 0.36], "bench");
  else kit.collider([xc - 1.0, FLOOR, z - 0.36], [xc + 1.0, FLOOR + 0.85, z], "bench");
}
