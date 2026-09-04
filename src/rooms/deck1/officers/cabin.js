// One officer's cabin, varied by seed (mirrored layout, bedding colours, personal items). The captain's
// suite is the same function with a seating pair, a larger desk, a viewscreen and a sideboard.
import { FLOOR } from "../shared/plan.js";
import { seat } from "../shared/props.js";
import { IMP } from "../shared/palette.js";
import { amberLamp, junctionBox, luminaire, makeFrame, rng, vent, wainscot } from "./lib.js";

const BLANKETS = [IMP.mid, IMP.dark, IMP.grey, IMP.hullDark];

/**
 * faces: { x0, x1, z0, z1 } interior wall faces; side -1 west (door wall at x1) / +1 east (door wall at x0);
 * doorZ: world z of the corridor door centre; opts: { seed, captain, ceilY, plateCell }
 */
export function buildCabin(kit, faces, side, doorZ, { seed = 1, captain = false, ceilY, plateCell = 14 }) {
  const rand = rng(seed * 7919 + 13);
  const flip = !captain && rand() < 0.5;
  const F = makeFrame(faces.x0, faces.x1, faces.z0, faces.z1, side, flip);
  const { U, V } = F;
  const doorU = flip ? faces.z1 - doorZ : doorZ - faces.z0;
  const H = ceilY - FLOOR;
  const blanket = BLANKETS[Math.floor(rand() * BLANKETS.length)];
  const box = (mat, u0, u1, y0, y1, v0, v1, opts) => F.box(kit, mat, u0, u1, y0, y1, v0, v1, opts);
  const col = (u0, u1, y0, y1, v0, v1, tag) => F.col(kit, u0, u1, y0, y1, v0, v1, tag);
  const dark = { color: IMP.dark, texel: 1 };
  const black = { color: IMP.black, texel: 1 };
  const midM = { color: IMP.mid, texel: 2 };

  // --- wall treatment: dark wainscot on all four faces, pelmet over the door wall hides the corridor strip
  const wz = (u0, u1) => [Math.min(F.Z(u0), F.Z(u1)), Math.max(F.Z(u0), F.Z(u1))];
  const wx = (v0, v1) => [Math.min(F.X(v0), F.X(v1)), Math.max(F.X(v0), F.X(v1))];
  wainscot(kit, { axis: "z", at: F.X(0), from: F.Z(0), to: F.Z(U), n: F.nrm("+v"), gaps: [wz(doorU - 0.85, doorU + 0.85), wz(0.35, 1.45)] });
  wainscot(kit, { axis: "z", at: F.X(V), from: F.Z(0), to: F.Z(U), n: F.nrm("-v"), gaps: [] });
  wainscot(kit, { axis: "x", at: F.Z(0), from: F.X(0), to: F.X(V), n: F.nrm("+u"), gaps: [] });
  wainscot(kit, { axis: "x", at: F.Z(U), from: F.X(0), to: F.X(V), n: F.nrm("-u"), gaps: [wx(0.9, 2.0), ...(captain ? [wx(2.7, 4.7)] : [])] });
  box("paintedMetal", 0.02, U - 0.02, 1.98, 2.32, 0, 0.05, dark);
  // inner door frame (heavy, recessed look) + threshold
  box("paintedMetal", doorU - 0.8, doorU - 0.6, 0, 2.5, 0, 0.08, black);
  box("paintedMetal", doorU + 0.6, doorU + 0.8, 0, 2.5, 0, 0.08, black);
  box("paintedMetal", doorU - 0.8, doorU + 0.8, 2.2, 2.5, 0, 0.08, black);
  box("metal", doorU - 0.6, doorU + 0.6, 0, 0.01, 0.03, 0.35, midM);
  // rank plaque + cabin plate inside the door, junction box on the other side
  F.mount(kit, "darkGloss", doorU + 1.3, 1.62, 0, "+v", 0.4, 0.4, 0, 0.02);
  F.plate(kit, doorU + 1.3, 1.62, 0.02, "+v", 0.32, 0.32, captain ? 0 : 9);
  F.plate(kit, doorU + 1.3, 1.22, 0, "+v", 0.24, 0.24, plateCell);
  junctionBox(kit, F.P(doorU - 1.2, 1.5, 0), F.nrm("+v"), rand() < 0.5 ? "emitRedImp" : "emitBlue");

  // --- bunk against the outer wall: drawer base, mattress, layered bedding, overhead cabinet + reading lamp
  const bw = captain ? 1.25 : 1.0;
  box("paintedMetal", 0.45, 2.55, 0.12, 0.45, V - bw, V, black);
  box("paintedMetal", 0.45, 2.55, 0.0, 0.12, V - bw + 0.08, V, black);
  for (const [a, b] of [
    [0.5, 1.45],
    [1.55, 2.5],
  ]) {
    box("paintedMetal", a, b, 0.16, 0.41, V - bw - 0.012, V - bw, dark);
    box("metal", a + 0.3, b - 0.3, 0.27, 0.3, V - bw - 0.03, V - bw - 0.012, midM);
  }
  box("fabric", 0.48, 2.52, 0.45, 0.6, V - bw + 0.03, V - 0.03, { color: IMP.grey, texel: 2 });
  box("fabric", 0.5, 2.5, 0.6, 0.625, V - bw + 0.05, V - 0.05, { color: IMP.white, texel: 2 });
  box("fabric", 1.15, 2.48, 0.6, 0.68, V - bw + 0.04, V - 0.04, { color: blanket, texel: 2 });
  box("fabric", 2.1, 2.48, 0.68, 0.8, V - bw + 0.12, V - 0.12, { color: blanket, texel: 2 });
  box("fabric", 2.14, 2.44, 0.8, 0.86, V - bw + 0.16, V - 0.16, { color: IMP.mid, texel: 2 });
  box("fabric", 0.55, 1.05, 0.6, 0.72, V - bw + 0.1, V - 0.1, { color: IMP.white, texel: 2 });
  col(0.45, 2.55, 0, 0.7, V - bw, V, "bunk");
  box("paintedMetal", 0.45, 2.55, 1.95, 2.45, V - 0.42, V, dark);
  box("paintedMetal", 0.45, 2.55, 1.95, 1.98, V - 0.45, V - 0.42, black);
  box("paintedMetal", 1.5, 1.52, 2.0, 2.4, V - 0.43, V - 0.42, black);
  box("paintedMetal", 1.25, 1.75, 1.87, 1.95, V - 0.38, V - 0.28, black);
  box("emitAmber", 1.28, 1.72, 1.86, 1.87, V - 0.37, V - 0.29);
  // headboard panel on the u=0 wall
  box("paintedMetal", 0, 0.05, 0.45, 1.4, V - bw - 0.15, V - 0.02, dark);
  // nightstand + item
  box("paintedMetal", 2.7, 3.2, 0.0, 0.6, V - 0.55, V, dark);
  box("darkGloss", 2.72, 3.18, 0.6, 0.62, V - 0.53, V - 0.02);
  col(2.7, 3.2, 0, 0.62, V - 0.55, V, "nightstand");
  box("paintedMetal", 2.85, 3.05, 0.62, 0.64, V - 0.4, V - 0.15, black);
  box("emitBlue", 2.88, 3.02, 0.64, 0.645, V - 0.38, V - 0.17);

  // --- desk on the outer wall, chair facing it, wall screen, desk lamp (the cabin's amber reading lamp)
  const d0 = captain ? 4.4 : 4.9;
  const d1 = captain ? 6.9 : 6.7;
  box("paintedMetal", d0, d1, 0.7, 0.72, V - 0.82, V - 0.02, black);
  box("darkGloss", d0 - 0.02, d1 + 0.02, 0.72, 0.755, V - 0.84, V);
  box("paintedMetal", d1 - 0.55, d1 - 0.05, 0.0, 0.7, V - 0.8, V - 0.05, dark);
  box("paintedMetal", d1 - 0.5, d1 - 0.1, 0.12, 0.3, V - 0.812, V - 0.8, black);
  box("paintedMetal", d1 - 0.5, d1 - 0.1, 0.38, 0.56, V - 0.812, V - 0.8, black);
  box("paintedMetal", d0 + 0.05, d1 - 0.55, 0.15, 0.7, V - 0.1, V - 0.03, dark);
  box("paintedMetal", d0 + 0.05, d0 + 0.09, 0.0, 0.7, V - 0.8, V - 0.05, black);
  col(d0, d1, 0, 0.78, V - 0.85, V, "desk");
  const dc = (d0 + d1) / 2;
  box("paintedMetal", dc - 0.25, dc + 0.25, 0.755, 0.77, V - 0.5, V - 0.32, black);
  box("emitBlue", dc - 0.2, dc + 0.2, 0.77, 0.773, V - 0.47, V - 0.44);
  box("darkGloss", dc + 0.45, dc + 0.7, 0.755, 0.765, V - 0.45, V - 0.27);
  F.cyl(kit, "metal", dc - 0.55, 0.805, V - 0.35, 0.04, 0.1, "y", { color: IMP.mid, texel: 2 });
  // desk lamp: post, head, amber lens
  F.cyl(kit, "paintedMetal", d1 - 0.25, 0.975, V - 0.2, 0.015, 0.44, "y", black);
  box("paintedMetal", d1 - 0.25, d1 - 0.19, 1.19, 1.21, V - 0.55, V - 0.2, black);
  box("paintedMetal", d1 - 0.36, d1 - 0.14, 1.15, 1.2, V - 0.62, V - 0.46, black);
  box("emitAmber", d1 - 0.34, d1 - 0.16, 1.14, 1.15, V - 0.6, V - 0.48);
  F.cyl(kit, "paintedMetal", d1 - 0.25, 0.765, V - 0.2, 0.07, 0.02, "y", black);
  // wall screen over the desk
  const sw = captain ? 1.6 : 1.2;
  box("paintedMetal", dc - sw / 2 - 0.05, dc + sw / 2 + 0.05, 1.0, 1.68, V - 0.07, V, black);
  box("screenImp3", dc - sw / 2, dc + sw / 2, 1.06, 1.62, V - 0.075, V - 0.07, { uv: "keep" });
  for (let i = 0; i < 4; i++) box(i % 2 ? "emitRedImp" : "emitBlue", dc + sw / 2 - 0.03, dc + sw / 2, 1.63 - i * 0.03 - 0.02, 1.63 - i * 0.03, V - 0.075, V - 0.07);
  const sp = F.P(dc, 0, V - 1.3);
  seat(kit, sp[0], FLOOR, sp[2], F.facing("+v"));

  // --- locker on the door wall: vents, seam, handle, label
  box("paintedMetal", 0.4, 1.4, 0.0, 2.1, 0.0, 0.6, dark);
  box("paintedMetal", 0.4, 1.4, 2.1, 2.14, 0.0, 0.62, black);
  box("paintedMetal", 0.895, 0.905, 0.05, 2.05, 0.6, 0.61, black);
  for (let i = 0; i < 3; i++) box("metal", 0.5, 0.85, 1.75 + i * 0.08, 1.77 + i * 0.08, 0.6, 0.615, midM);
  for (let i = 0; i < 3; i++) box("metal", 0.95, 1.3, 1.75 + i * 0.08, 1.77 + i * 0.08, 0.6, 0.615, midM);
  box("metal", 0.82, 0.86, 0.95, 1.2, 0.6, 0.64, midM);
  box("metal", 0.94, 0.98, 0.95, 1.2, 0.6, 0.64, midM);
  F.plate(kit, 1.15, 1.45, 0.61, "+v", 0.16, 0.16, 6);
  col(0.4, 1.4, 0, 2.14, 0, 0.62, "locker");

  // --- shelf unit on the u=0 wall with objects
  const shelfN = captain ? 3 : 2 + Math.floor(rand() * 2);
  for (let s = 0; s < shelfN; s++) {
    const y = 1.25 + s * 0.45;
    box("metal", 0, 0.28, y, y + 0.03, 2.0, 4.0, midM);
    box("paintedMetal", 0, 0.26, y - 0.14, y, 2.02, 2.06, black);
    box("paintedMetal", 0, 0.26, y - 0.14, y, 3.94, 3.98, black);
    const n = 2 + Math.floor(rand() * 4);
    let v = 2.15 + rand() * 0.3;
    for (let k = 0; k < n && v < 3.8; k++) {
      const kind = rand();
      if (kind < 0.4) {
        const w = 0.04 + rand() * 0.05;
        box("fabric", 0.04, 0.24, y + 0.03, y + 0.2 + rand() * 0.1, v, v + w, { color: [IMP.dark, IMP.mid, IMP.white, IMP.grey][Math.floor(rand() * 4)], texel: 2 });
        v += w + 0.01;
      } else if (kind < 0.7) {
        box("darkGloss", 0.05, 0.22, y + 0.03, y + 0.12 + rand() * 0.08, v, v + 0.14 + rand() * 0.12);
        v += 0.32;
      } else {
        F.cyl(kit, "metal", 0.14, y + 0.11, v + 0.08, 0.06, 0.16, "y", { color: IMP.mid, texel: 2 });
        v += 0.24;
      }
    }
  }

  // --- fresher hatch on the u=U wall: recessed frame, closed leaf, status dot, label
  box("paintedMetal", U - 0.07, U, 0, 2.08, 0.92, 1.98, black);
  box("paintedMetal", U - 0.11, U - 0.07, 0.02, 2.0, 1.0, 1.9, { color: IMP.mid, texel: 1 });
  box("paintedMetal", U - 0.115, U - 0.11, 0.04, 1.98, 1.44, 1.46, black);
  box("paintedMetal", U - 0.115, U - 0.11, 1.0, 1.02, 1.05, 1.85, black);
  box("metal", U - 0.14, U - 0.11, 0.95, 1.15, 1.08, 1.12, midM);
  box("paintedMetal", U - 0.05, U, 1.55, 1.75, 2.08, 2.2, black);
  box("emitBlue", U - 0.055, U - 0.05, 1.6, 1.7, 2.1, 2.18);
  F.plate(kit, U, 2.3, 1.45, "-u", 0.22, 0.22, 8);
  vent(kit, F.P(U, 2.6, captain ? 6.3 : 4.4), F.nrm("-u"));

  // --- seating: settee + low table (officers) or armchair pair, low table, viewscreen and sideboard (captain)
  if (!captain) {
    box("paintedMetal", U - 0.75, U - 0.05, 0.0, 0.15, 3.05, 4.75, black);
    box("fabric", U - 0.75, U - 0.05, 0.15, 0.45, 3.0, 4.8, { color: blanket, texel: 2 });
    box("fabric", U - 0.2, U - 0.05, 0.45, 0.95, 3.0, 4.8, { color: blanket, texel: 2 });
    box("fabric", U - 0.75, U - 0.2, 0.45, 0.6, 3.0, 3.1, { color: blanket, texel: 2 });
    box("fabric", U - 0.75, U - 0.2, 0.45, 0.6, 4.7, 4.8, { color: blanket, texel: 2 });
    col(U - 0.75, U - 0.05, 0, 0.95, 3.0, 4.8, "settee");
    box("darkGloss", U - 1.75, U - 1.05, 0.4, 0.43, 3.3, 4.5);
    box("paintedMetal", U - 1.55, U - 1.25, 0.0, 0.4, 3.75, 4.05, black);
    box("paintedMetal", U - 1.65, U - 1.15, 0.0, 0.03, 3.5, 4.3, black);
    col(U - 1.75, U - 1.05, 0, 0.43, 3.3, 4.5, "table");
    box("darkGloss", U - 1.5, U - 1.3, 0.43, 0.44, 3.6, 3.85);
    amberLamp(kit, F.P(U, 1.75, 3.9), F.nrm("-u"));
    box("fabric", 2.6, U - 1.9, 0.0, 0.012, 2.0, V - 1.6, { color: IMP.mid, texel: 1 });
  } else {
    const chair = (u0, v0, dir) => {
      // dir +1: back on the +v side, faces -v; dir -1: back on the -v side, faces +v
      box("paintedMetal", u0, u0 + 0.7, 0.0, 0.12, v0, v0 + 0.7, black);
      box("fabric", u0, u0 + 0.7, 0.12, 0.45, v0, v0 + 0.7, { color: IMP.dark, texel: 2 });
      const bv0 = dir > 0 ? v0 + 0.56 : v0;
      box("fabric", u0, u0 + 0.7, 0.45, 1.0, bv0, bv0 + 0.14, { color: IMP.dark, texel: 2 });
      box("fabric", u0, u0 + 0.1, 0.45, 0.65, v0, v0 + 0.7, { color: IMP.dark, texel: 2 });
      box("fabric", u0 + 0.6, u0 + 0.7, 0.45, 0.65, v0, v0 + 0.7, { color: IMP.dark, texel: 2 });
      col(u0, u0 + 0.7, 0, 1.0, v0, v0 + 0.7, "chair");
    };
    chair(5.9, 2.3, -1);
    chair(5.9, 4.5, +1);
    box("darkGloss", 5.5, 7.0, 0.42, 0.45, 3.3, 4.2);
    box("paintedMetal", 5.7, 6.8, 0.0, 0.42, 3.5, 4.0, black);
    col(5.5, 7.0, 0, 0.45, 3.3, 4.2, "table");
    box("darkGloss", 6.0, 6.3, 0.45, 0.46, 3.45, 3.7);
    F.cyl(kit, "metal", 6.6, 0.51, 3.9, 0.05, 0.12, "y", { color: IMP.mid, texel: 2 });
    F.cyl(kit, "metal", 6.6, 0.51, 3.55, 0.05, 0.12, "y", { color: IMP.mid, texel: 2 });
    // viewscreen on the u=U wall facing the seating
    box("darkGloss", U - 0.1, U, 1.1, 2.3, 2.7, 4.7);
    box("screenImp0", U - 0.105, U - 0.1, 1.2, 2.2, 2.8, 4.6, { uv: "keep" });
    box("paintedMetal", U - 0.12, U, 1.0, 1.1, 2.6, 4.8, black);
    for (let i = 0; i < 6; i++) box(i % 3 === 0 ? "emitRedImp" : "emitBlue", U - 0.125, U - 0.12, 1.03, 1.06, 2.75 + i * 0.09, 2.8 + i * 0.09);
    // sideboard with decanter + glasses
    box("paintedMetal", U - 0.5, U - 0.02, 0.0, 0.9, 4.95, 6.55, dark);
    box("darkGloss", U - 0.52, U, 0.9, 0.93, 4.93, 6.57);
    box("paintedMetal", U - 0.51, U - 0.5, 0.1, 0.8, 5.72, 5.78, black);
    box("metal", U - 0.53, U - 0.5, 0.45, 0.5, 5.35, 5.6, midM);
    box("metal", U - 0.53, U - 0.5, 0.45, 0.5, 5.9, 6.15, midM);
    col(U - 0.52, U, 0, 0.93, 4.93, 6.57, "sideboard");
    F.cyl(kit, "darkGloss", U - 0.3, 1.05, 5.2, 0.07, 0.24, "y");
    for (let i = 0; i < 3; i++) F.cyl(kit, "metal", U - 0.28, 0.98, 5.5 + i * 0.18, 0.035, 0.1, "y", { color: IMP.mid, texel: 2 });
    box("darkGloss", U - 0.4, U - 0.15, 0.93, 0.945, 6.1, 6.4);
    amberLamp(kit, F.P(U, 1.9, 5.75), F.nrm("-u"));
    amberLamp(kit, F.P(0, 1.9, 5.5), F.nrm("+u"));
    box("fabric", 2.6, U - 1.0, 0.0, 0.012, 1.6, V - 1.6, { color: IMP.mid, texel: 1 });
    // rank pennants either side of the viewscreen
    for (const v of [2.3, 5.1]) {
      box("fabric", U - 0.04, U, 1.3, 2.6, v - 0.2, v + 0.2, { color: IMP.dark, texel: 2 });
      box("paintedMetal", U - 0.045, U - 0.04, 1.55, 1.65, v - 0.2, v + 0.2, { color: IMP.red, texel: 2 });
      box("paintedMetal", U - 0.045, U - 0.04, 2.0, 2.3, v - 0.15, v + 0.15, { color: IMP.grey, texel: 2 });
    }
  }

  // --- personal items (3–4 per cabin, drawn from a pool)
  const items = [
    () => {
      // footlocker with cargo label
      box("paintedMetal", 0.6, 1.4, 0.0, 0.45, V - bw - 0.75, V - bw - 0.2, { color: IMP.mid, texel: 1 });
      box("paintedMetal", 0.6, 1.4, 0.2, 0.22, V - bw - 0.76, V - bw - 0.2, black);
      F.plate(kit, 1.0, 0.33, V - bw - 0.75, "+v", 0.14, 0.14, 11);
      col(0.6, 1.4, 0, 0.45, V - bw - 0.75, V - bw - 0.2, "footlocker");
    },
    () => {
      // uniform hanging on the locker side
      box("metal", 1.45, 1.75, 1.85, 1.87, 0.15, 0.55, midM);
      box("fabric", 1.5, 1.72, 0.6, 1.84, 0.28, 0.4, { color: IMP.dark, texel: 2 });
      box("fabric", 1.55, 1.67, 1.5, 1.84, 0.4, 0.44, { color: IMP.dark, texel: 2 });
    },
    () => {
      // stack of data pads on the desk
      for (let i = 0; i < 3; i++) box("darkGloss", dc - 0.75 + i * 0.02, dc - 0.5 + i * 0.02, 0.755 + i * 0.012, 0.767 + i * 0.012, V - 0.4 - i * 0.015, V - 0.22 - i * 0.015);
    },
    () => {
      // boots by the bunk
      box("paintedMetal", 0.7, 0.82, 0.0, 0.28, V - bw - 0.35, V - bw - 0.05, black);
      box("paintedMetal", 0.88, 1.0, 0.0, 0.28, V - bw - 0.37, V - bw - 0.07, black);
    },
    () => {
      // bottle on the nightstand
      F.cyl(kit, "metal", 2.95, 0.72, V - 0.18, 0.035, 0.2, "y", { color: IMP.mid, texel: 2 });
    },
    () => {
      // holo frame on the desk
      box("paintedMetal", dc + 0.2, dc + 0.32, 0.755, 0.87, V - 0.7, V - 0.68, black);
      box("emitBlue", dc + 0.22, dc + 0.3, 0.77, 0.86, V - 0.68, V - 0.675);
    },
    () => {
      // wall poster near the locker
      F.plate(kit, 2.1, 1.65, 0, "+v", 0.5, 0.5, 4);
    },
    () => {
      // exercise mat rolled on the floor
      F.cyl(kit, "fabric", 3.6, 0.09, 6.2, 0.09, 1.6, "u", { color: IMP.black, texel: 2 });
    },
    () => {
      // wall clock / chrono display
      box("paintedMetal", 0, 0.03, 2.3, 2.5, 4.5, 4.9, black);
      box("screenImp3", 0.03, 0.035, 2.32, 2.48, 4.52, 4.88, { uv: "keep" });
    },
  ];
  const order = items.map((f, i) => i).sort(() => rand() - 0.5);
  const nItems = captain ? 4 : 3 + Math.floor(rand() * 2);
  for (let i = 0; i < nItems; i++) items[order[i]]();

  // --- ceiling luminaire (the room reads from this + the single real light where it has one)
  const lx = wx(V / 2 - 0.5, V / 2 + 0.5);
  const lz = wz(U / 2 - 0.9, U / 2 + 0.9);
  luminaire(kit, lx[0], lx[1], lz[0], lz[1], ceilY, { drop: 0.06 });
  // cornice board on the u=U wall over the hatch keeps the tall wall from reading bare
  box("paintedMetal", U - 0.04, U, H - 0.32, H - 0.02, 0.05, V - 0.05, dark);
  box("paintedMetal", 0, 0.04, H - 0.32, H - 0.02, 0.05, V - 0.05, dark);

  return { center: F.P(U / 2, 0, V / 2), F };
}
