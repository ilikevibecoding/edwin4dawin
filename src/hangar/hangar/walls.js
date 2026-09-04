// d4-hangar walls + ceiling: giant Imperial panelling (4 m light-grey panels with black recessed seams,
// one darker row per 12 m bay, structural bands every 12 m, frame ribs every 20 m hugging wall +
// ceiling), a maintenance catwalk ring at 36 m with rails and caged ladders, housed wall floods, cable
// trays at 2.6 m, human-scale dressing along the wall bases (consoles, lockers, hose reels, maintenance
// hatches), door holes cut exactly with doorOpening() with one hazard treatment per door, the
// control-tower window bezel + sign + tower base, the balcony with its bracket structure, fire stations,
// and a ceiling of long dark light channels with diffuser segments + louvred flood fixtures.
import * as THREE from "three";
import { Batcher, PX, NX, PY, PZ, NZ, ALL, sharedBox } from "./batch.js";
import { doorOpening, FRAME_W } from "../../systems/doors/helper.js";
import { rng } from "../../kit.js";
import { FLOOR, CEIL, WALL_T, HALL, DOORS, DOOR_LABELS, WINDOW, BALCONY, RACK, STAIRS, LADDER_Z, CATWALK, RIB_Z, RIB_X, RIB_W, RIB_D, PANEL_W, SEAM, HG } from "./layout.js";
import { LABELS } from "./materials.js";
import { label, railRun, ladder, housedLamp, redBeacon } from "./util.js";

const H = CEIL - FLOOR; // 60
const P0 = WALL_T; // panel back (on the black backing)
const P1 = WALL_T + 0.12; // panel front
const CAT_T = 0.12; // catwalk plate thickness
const CAT_V = CATWALK.y - FLOOR; // plate top, wall-local v (36.52)
const END_LADDER_X = { bow: 50, aft: -50 }; // deck -> catwalk ladders on the end walls

// rows of the 60 m wall: [v0, v1, type]
const ROWS = [];
for (let k = 0; k < 5; k++) {
  const b = k * 12;
  if (k === 0) ROWS.push([0, 0.9, "kick"], [0.9, 6.2, "panelLow"], [6.2, 11.6, "panel"]);
  else ROWS.push([b + 0.4, b + 6.0, "panel"], [b + 6.0, b + 11.6, "panel"]);
  if (k < 4) ROWS.push([b + 11.6, b + 12.4, "band"]);
  else ROWS.push([b + 11.6, H, "cornice"]);
}
// the one darker panel row (10 % of the field): the row above the first band, all four walls
const DARK_ROW = [12.4, 18.0];

// rect helpers (u0,u1,v0,v1)
function intersects(a, b) {
  return a.u0 < b.u1 && a.u1 > b.u0 && a.v0 < b.v1 && a.v1 > b.v0;
}
/** rect minus a list of cut rects -> list of rects */
function subtract(rect, cuts, minSize = 0.25) {
  let pieces = null; // allocated on the first cut that actually touches the rect (most cells are untouched)
  for (const c of cuts) {
    if (pieces === null) {
      if (!intersects(rect, c)) continue;
      pieces = [rect];
    }
    const next = [];
    for (const r of pieces) {
      if (!intersects(r, c)) {
        next.push(r);
        continue;
      }
      if (c.u0 > r.u0) next.push({ u0: r.u0, u1: c.u0, v0: r.v0, v1: r.v1 });
      if (c.u1 < r.u1) next.push({ u0: c.u1, u1: r.u1, v0: r.v0, v1: r.v1 });
      const mu0 = Math.max(r.u0, c.u0), mu1 = Math.min(r.u1, c.u1);
      if (c.v0 > r.v0) next.push({ u0: mu0, u1: mu1, v0: r.v0, v1: c.v0 });
      if (c.v1 < r.v1) next.push({ u0: mu0, u1: mu1, v0: c.v1, v1: r.v1 });
    }
    pieces = next;
  }
  if (pieces === null) return rect.u1 - rect.u0 >= minSize && rect.v1 - rect.v0 >= minSize ? [rect] : [];
  return pieces.filter((r) => r.u1 - r.u0 >= minSize && r.v1 - r.v0 >= minSize);
}
function expand(r, mu, mv = mu) {
  return { u0: r.u0 - mu, u1: r.u1 + mu, v0: Math.max(0, r.v0 - mv), v1: r.v1 + mv };
}

// ---------------------------------------------------------------------------
class Wall {
  /**
   * plane "x": wall at x = c, u runs along +z from z = uw0. plane "z": wall at z = c, u along +x.
   * inward: sign of the room-side normal along the plane axis.
   */
  constructor(ctx, B, { name, plane, c, inward, uw0, length, ribs, seed }) {
    this.ctx = ctx;
    this.B = B;
    this.kit = ctx.kit;
    this.P = ctx.PALETTE;
    this.name = name;
    this.plane = plane;
    this.c = c;
    this.inward = inward;
    this.uw0 = uw0;
    this.L = length;
    this.ribs = ribs; // u positions of the wall ribs
    this.rand = rng(seed);
    this.backBit = plane === "x" ? (inward > 0 ? NX : PX) : inward > 0 ? NZ : PZ;
    this.faces = ALL & ~this.backBit;
    this.N = plane === "x" ? new THREE.Vector3(inward, 0, 0) : new THREE.Vector3(0, 0, inward);
    this.holes = []; // exact holes {u0,u1,v0,v1,door?,mu,mv}
    this.extraCuts = []; // panels/bands keep out of these (balcony slot, tower base, hatches)
    this.trayCuts = []; // cable trays keep out of these (stairs, ladders, hatches)
    this.baseCuts = []; // wall-base dressing keeps out of these (fire stations, rack columns)
    this.plainRects = []; // panels here get no greebles (racks / platforms hang in front)
    this.levels = [[FLOOR, CEIL]];
    this.dressSeq = 0;
  }
  pos(u, v, d) {
    return this.plane === "x" ? [this.c + this.inward * d, FLOOR + v, this.uw0 + u] : [this.uw0 + u, FLOOR + v, this.c + this.inward * d];
  }
  /** world AABB of a local box */
  aabb(u0, u1, v0, v1, d0, d1) {
    const a = this.c + this.inward * d0, b = this.c + this.inward * d1;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (this.plane === "x") return [[lo, FLOOR + v0, this.uw0 + u0], [hi, FLOOR + v1, this.uw0 + u1]];
    return [[this.uw0 + u0, FLOOR + v0, lo], [this.uw0 + u1, FLOOR + v1, hi]];
  }
  box(mat, color, u0, u1, v0, v1, d0, d1, opts = {}) {
    const [mn, mx] = this.aabb(u0, u1, v0, v1, d0, d1);
    this.B.boxMM(mat, color, mn, mx, opts);
  }
  /** local u for a world across-axis coordinate */
  u(worldAcross) {
    return worldAcross - this.uw0;
  }
  addHole(rect) {
    this.holes.push(rect);
  }
  /** cuts used for panels/bands: holes grown by their surround margins */
  cuts() {
    return this.holes.map((h) => expand(h, h.mu ?? 0.3, h.mv ?? h.mu ?? 0.3));
  }
  ribRects() {
    return this.ribs.map((u) => ({ u0: u - RIB_W / 2 - 0.3, u1: u + RIB_W / 2 + 0.3, v0: 0, v1: H }));
  }
  /** a quaternion whose local +z is the wall normal tilted up by `tilt` radians (screens, floods) */
  tiltQ(tilt) {
    const N = this.N, up = new THREE.Vector3(0, 1, 0);
    const front = N.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(up, Math.sin(tilt)).normalize();
    const vUp = up.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(N, -Math.sin(tilt)).normalize();
    const right = new THREE.Vector3().crossVectors(vUp, front).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, vUp, front));
  }

  // ---- backing slab (exact holes) + colliders per walkable level
  backing() {
    const full = { u0: 0, u1: this.L, v0: 0, v1: H };
    for (const r of subtract(full, this.holes, 0.01)) this.box("paintedMetal", this.P.impBlack, r.u0, r.u1, r.v0, r.v1, 0, WALL_T, { texel: 0.5 });
    for (const [y0, y1] of this.levels) {
      const lv = y0 - FLOOR;
      // a hole opens the wall for the player only if it starts at (or a step above) their floor and is tall enough
      const passable = this.holes.filter((h) => h.v0 <= lv + 0.5 && h.v1 >= lv + 1.8);
      let spans = [[0, this.L]];
      for (const h of passable) {
        const next = [];
        for (const [a, b] of spans) {
          if (h.u1 <= a || h.u0 >= b) next.push([a, b]);
          else {
            if (h.u0 > a) next.push([a, h.u0]);
            if (h.u1 < b) next.push([h.u1, b]);
          }
        }
        spans = next;
      }
      for (const [a, b] of spans) {
        const [mn, mx] = this.aabb(a, b, lv, y1 - FLOOR, 0, P1);
        this.kit.collider(mn, mx, "wall");
      }
    }
  }

  // ---- panel field
  panels() {
    const cuts = [...this.cuts(), ...this.ribRects(), ...this.extraCuts];
    const nCols = Math.round(this.L / PANEL_W);
    for (const [v0, v1, type] of ROWS) {
      if (type === "band" || type === "kick" || type === "cornice") {
        // continuous, merged across columns
        const depth = type === "band" ? 0.6 : type === "kick" ? 0.34 : 0.5;
        for (const r of subtract({ u0: 0, u1: this.L, v0, v1 }, cuts)) {
          this.box("paintedMetal", this.P.impDark, r.u0, r.u1, r.v0, r.v1, P0, depth, { texel: 0.5 });
          if (type === "band") {
            for (let u = r.u0 + 1; u < r.u1 - 0.5; u += 2) this.box("metal", HG.steel, u - 0.08, u + 0.08, v0 + 0.16, v0 + 0.32, depth, depth + 0.05);
          }
          if (type === "kick") {
            // waist-height light strip in a black channel just above the kick band
            this.box("paintedMetal", this.P.impBlack, r.u0 + 0.25, r.u1 - 0.25, 0.96, 1.14, P1, P1 + 0.08);
            this.box("emitWhite", 0xffffff, r.u0 + 0.3, r.u1 - 0.3, 1.02, 1.08, P1 + 0.08, P1 + 0.09);
          }
        }
        continue;
      }
      for (let ci = 0; ci < nCols; ci++) {
        const cu0 = ci * PANEL_W, cu1 = (ci + 1) * PANEL_W;
        const cell = { u0: cu0, u1: cu1, v0, v1 };
        const pieces = subtract(cell, cuts);
        const full = pieces.length === 1 && pieces[0].u0 === cu0 && pieces[0].u1 === cu1 && pieces[0].v0 === v0 && pieces[0].v1 === v1;
        if (type === "panelLow") {
          // eye-level row: two 2 m panels per column
          for (const r of pieces) {
            if (r.u1 - r.u0 > 2.5) {
              const mid = (r.u0 + r.u1) / 2;
              this.panel({ ...r, u1: mid }, full, true);
              this.panel({ ...r, u0: mid }, full, true);
            } else this.panel(r, false, true);
          }
        } else for (const r of pieces) this.panel(r, full, v0 < 30);
      }
    }
  }

  panel(r, full, detailed) {
    const w = r.u1 - r.u0, h = r.v1 - r.v0;
    const u0 = r.u0 + SEAM / 2, u1 = r.u1 - SEAM / 2, v0 = r.v0 + SEAM / 2, v1 = r.v1 - SEAM / 2;
    if (u1 - u0 < 0.1 || v1 - v0 < 0.1) return;
    // one tone for the field; the darker tone only in its own row (a band, never a checkerboard)
    const dark = r.v0 >= DARK_ROW[0] - 0.05 && r.v1 <= DARK_ROW[1] + 0.05;
    const color = dark ? this.P.impMid : this.P.impGrey;
    let style = "plain";
    const plain = this.plainRects.some((p) => intersects(r, p));
    if (full && w > 1.5 && h > 2) {
      const s = this.rand();
      if (plain) style = s < 0.3 ? "seam" : "plain";
      else if (detailed) {
        if (s < 0.06) style = "vent";
        else if (s < 0.11) style = "greeble";
        else if (s < 0.24) style = "seam";
        else if (s < 0.29) style = "inset";
      } else if (s < 0.05) style = "vent";
    }
    this.box("impPanel", color, u0, u1, v0, v1, P0, P1, { faces: this.faces, fit: true });
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    switch (style) {
      case "vent": {
        const gw = Math.min(w - 1.0, 2.6), gh = h - 1.2;
        this.box("paintedMetal", this.P.impBlack, cu - gw / 2, cu + gw / 2, cv - gh / 2, cv + gh / 2, P1, P1 + 0.02);
        const n = Math.floor(gh / 0.34);
        for (let i = 0; i < n; i++) {
          const y = cv - gh / 2 + 0.17 + i * 0.34;
          this.box("metal", HG.gunmetal, cu - gw / 2 + 0.1, cu + gw / 2 - 0.1, y - 0.06, y + 0.06, P1 + 0.02, P1 + 0.1);
        }
        this.box("metal", HG.gunmetal, cu - gw / 2 - 0.08, cu + gw / 2 + 0.08, cv - gh / 2 - 0.08, cv - gh / 2, P1, P1 + 0.1);
        this.box("metal", HG.gunmetal, cu - gw / 2 - 0.08, cu + gw / 2 + 0.08, cv + gh / 2, cv + gh / 2 + 0.08, P1, P1 + 0.1);
        break;
      }
      case "greeble": {
        this.box("impPanel", color, u0 + 0.5, u1 - 0.5, v0 + 0.5, v1 - 0.5, P1, P1 + 0.06, { faces: this.faces, fit: true });
        const bx = cu - 0.6, by = cv + 0.4;
        this.box("paintedMetal", this.P.impDark, bx - 0.35, bx + 0.35, by - 0.45, by + 0.45, P1 + 0.06, P1 + 0.36);
        this.box("paintedMetal", this.P.impDark, bx + 0.9, bx + 1.5, by - 0.3, by + 0.3, P1 + 0.06, P1 + 0.3);
        this.box("emitBlue", 0xffffff, bx - 0.2, bx - 0.08, by + 0.2, by + 0.3, P1 + 0.36, P1 + 0.38);
        this.box("emitRedImp", 0xffffff, bx + 0.05, bx + 0.17, by + 0.2, by + 0.3, P1 + 0.36, P1 + 0.38);
        this.box("emitAmber", 0xffffff, bx + 1.1, bx + 1.3, by - 0.1, by - 0.02, P1 + 0.3, P1 + 0.32);
        this.B.tube("metal", HG.steel, this.pos(bx, by - 0.45, P1 + 0.2), this.pos(bx, v0 + 0.05, P1 + 0.2), 0.06, 8);
        this.B.tube("metal", HG.gunmetal, this.pos(bx + 1.2, by - 0.3, P1 + 0.16), this.pos(bx + 1.2, v0 + 0.05, P1 + 0.16), 0.045, 8);
        break;
      }
      case "seam": {
        const gy = v0 + h * (0.35 + this.rand() * 0.3);
        this.box("paintedMetal", this.P.impBlack, u0 + 0.25, u1 - 0.25, gy - 0.035, gy + 0.035, P1, P1 + 0.02);
        for (const [su, sv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const bu = cu + su * (w / 2 - 0.35), bv = cv + sv * (h / 2 - 0.35);
          this.box("metal", HG.steel, bu - 0.06, bu + 0.06, bv - 0.06, bv + 0.06, P1, P1 + 0.04);
        }
        break;
      }
      case "inset": {
        this.box("darkGloss", 0x101214, u0 + 0.45, u1 - 0.45, v0 + 0.45, v1 - 0.45, P1, P1 + 0.03);
        this.box("emitAmber", 0xffffff, u1 - 0.9, u1 - 0.6, v0 + 0.55, v0 + 0.62, P1 + 0.03, P1 + 0.05);
        break;
      }
      default:
        break;
    }
  }

  // ---- frame ribs (wall part). Interrupted by doors (restart above the header) and by the catwalk
  // (a 2.8 m opening with a lintel where the walkway passes through the rib).
  ribsBuild() {
    const D = P0 + RIB_D;
    const cv0 = CAT_V - CAT_T - 0.02, cv1 = CAT_V + CATWALK.openingH;
    for (const u of this.ribs) {
      let vStart = 0;
      for (const h of this.holes) if (h.door && h.u1 + 2.5 > u - RIB_W / 2 && h.u0 - 2.5 < u + RIB_W / 2 && h.v0 < 1) vStart = Math.max(vStart, h.v1 + 3.6);
      for (const [a, b] of [[vStart, cv0], [cv1, H]]) {
        this.box("paintedMetal", this.P.impDark, u - RIB_W / 2, u + RIB_W / 2, a, b, 0.02, D, { texel: 0.5 });
        this.box("impPanel", this.P.impMid, u - RIB_W / 2 + 0.2, u + RIB_W / 2 - 0.2, a + 0.4, b - 0.4, D, D + 0.06, { texel: 0.5 });
        // side flanges (lighter) so the rib reads as a profile, not a slab
        for (const s of [-1, 1]) this.box("paintedMetal", this.P.impMid, u + s * (RIB_W / 2 + 0.12) - 0.12, u + s * (RIB_W / 2 + 0.12) + 0.12, a, b, P1, D - 0.3, { texel: 0.5 });
      }
      // catwalk opening lintel + a housed lamp under it lighting the walkway
      this.box("paintedMetal", this.P.impMid, u - RIB_W / 2 - 0.3, u + RIB_W / 2 + 0.3, cv1, cv1 + 0.4, 0.02, D + 0.1, { texel: 0.5 });
      housedLamp(this.B, "emitWhite", this.pos(u, cv1 - 0.001, P1 + 0.6), [0, -1, 0], [0.5, 0.14, 0.3], { inset: 0.04 });
      if (vStart === 0) {
        this.box("paintedMetal", this.P.impDark, u - RIB_W / 2 - 0.35, u + RIB_W / 2 + 0.35, 0, 1.6, 0.02, D + 0.3, { texel: 0.5 });
        this.box("hgHazard", 0xffffff, u - RIB_W / 2 - 0.35, u + RIB_W / 2 + 0.35, 0.05, 0.55, D + 0.3, D + 0.32, { texel: 1 });
        const [mn, mx] = this.aabb(u - RIB_W / 2 - 0.35, u + RIB_W / 2 + 0.35, 0, 4, 0, D + 0.3);
        this.kit.collider(mn, mx, "rib");
      } else {
        this.box("paintedMetal", this.P.impDark, u - RIB_W / 2 - 0.3, u + RIB_W / 2 + 0.3, vStart - 0.3, vStart + 0.5, 0.02, D + 0.2, { texel: 0.5 });
      }
    }
  }

  // ---- wall floods: one row at y -20 (the catwalk downlights take the lower row), skipping ribs and holes
  floods() {
    const cuts = this.cuts();
    const v = H - 8;
    for (let u = 4; u < this.L - 1; u += 8) {
      if (this.ribs.some((r) => Math.abs(r - u) < 2.2)) continue;
      if (cuts.some((c) => u + 1.2 > c.u0 && u - 1.2 < c.u1 && v + 0.6 > c.v0 && v - 0.6 < c.v1)) continue;
      this.flood(u, v);
    }
  }
  /** louvred flood: dark housing tilted 35 deg down, the lens set back behind three slats, on a stem */
  flood(u, v) {
    this.box("paintedMetal", this.P.impDark, u - 0.25, u + 0.25, v - 0.25, v + 0.25, P1, 0.95, { texel: 0.5 });
    if (!this._floodQ) {
      const theta = -0.62; // tilt down
      this._floodQ = this.tiltQ(theta);
      const N = this.N, up = new THREE.Vector3(0, 1, 0);
      this._floodFront = N.clone().multiplyScalar(Math.cos(theta)).addScaledVector(up, Math.sin(theta)).normalize();
      this._floodUp = up.clone().multiplyScalar(Math.cos(theta)).addScaledVector(N, -Math.sin(theta)).normalize();
    }
    const c = new THREE.Vector3(...this.pos(u, v, 1.35));
    const q = this._floodQ, up = this._floodUp, fr = this._floodFront;
    // housing body (behind the lens) + rim slabs round the open front, lens recessed 12 cm, three slats
    this.B.geo("paintedMetal", this.P.impDark, sharedBox(1.9, 0.6, 0.5), c.clone().addScaledVector(fr, -0.35).toArray(), q);
    for (const s of [-1, 1]) this.B.geo("paintedMetal", this.P.impDark, sharedBox(1.9, 0.06, 0.4), c.clone().addScaledVector(up, s * 0.27).addScaledVector(fr, 0.1).toArray(), q);
    this.B.geo("emitWhite", 0xffffff, sharedBox(1.7, 0.42, 0.03), c.clone().addScaledVector(fr, -0.1).toArray(), q);
    for (const k of [-0.15, 0, 0.15]) this.B.geo("paintedMetal", this.P.impMid, sharedBox(1.8, 0.04, 0.12), c.clone().addScaledVector(up, k).addScaledVector(fr, 0.2).toArray(), q);
    this.B.tube("metal", HG.gunmetal, this.pos(u, v, 0.95), c.clone().addScaledVector(fr, -0.55).toArray(), 0.09, 8);
  }

  // ---- cable trays + pipes at v 2.6 .. 3.5 along hole-free spans (they run into the ribs)
  trays() {
    const spans = subtract({ u0: 0.6, u1: this.L - 0.6, v0: 2.6, v1: 3.5 }, [...this.cuts(), ...this.trayCuts]);
    for (const r of spans) {
      if (r.v1 - r.v0 < 0.8) continue;
      this.box("paintedMetal", this.P.impDark, r.u0, r.u1, 2.6, 2.72, P1, P1 + 0.5, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, r.u0, r.u1, 2.6, 2.9, P1 + 0.46, P1 + 0.5, { texel: 0.5 });
      this.B.tube("metal", HG.steel, this.pos(r.u0, 3.12, P1 + 0.28), this.pos(r.u1, 3.12, P1 + 0.28), 0.11, 10);
      this.B.tube("metal", HG.gunmetal, this.pos(r.u0, 3.38, P1 + 0.24), this.pos(r.u1, 3.38, P1 + 0.24), 0.07, 8);
      for (let u = r.u0 + 2; u < r.u1 - 1; u += 4) this.box("metal", HG.gunmetal, u - 0.1, u + 0.1, 3.0, 3.5, P1 + 0.1, P1 + 0.4);
      for (let u = r.u0 + 6; u < r.u1 - 2; u += 16) {
        if (this.ribs.some((rb) => Math.abs(rb - u) < 1.6)) continue;
        this.box("paintedMetal", this.P.impDark, u - 0.4, u + 0.4, 3.7, 4.6, P1, P1 + 0.35, { texel: 0.5 });
        this.box("emitGreen", 0xffffff, u - 0.25, u - 0.15, 4.35, 4.45, P1 + 0.35, P1 + 0.37);
        this.box("emitRedImp", 0xffffff, u - 0.05, u + 0.05, 4.35, 4.45, P1 + 0.35, P1 + 0.37);
      }
    }
  }

  // ---- door surrounds. One hazard treatment per door: bay doors get the chevron border, blast doors
  // get the floor stripes (and a heavy dark surround). Both get a header plate with the name and two
  // housed red lamps, and dark jamb columns with a thin light strip.
  doorSurround(h) {
    const kind = h.door.kind;
    if (kind !== "bay" && kind !== "blast") return;
    const m = FRAME_W; // reveal the doors system needs
    const hv0 = h.v1 + m + 1.1, hv1 = hv0 + 1.4;
    if (kind === "bay") {
      const bw = 0.6;
      this.box("hgHazard", 0xffffff, h.u0 - m - bw, h.u0 - m, 0, h.v1 + m + bw, P0, P0 + 0.08, { texel: 0.5 });
      this.box("hgHazard", 0xffffff, h.u1 + m, h.u1 + m + bw, 0, h.v1 + m + bw, P0, P0 + 0.08, { texel: 0.5 });
      this.box("hgHazard", 0xffffff, h.u0 - m, h.u1 + m, h.v1 + m, h.v1 + m + bw, P0, P0 + 0.08, { texel: 0.5 });
    } else {
      const bw = 1.0;
      this.box("paintedMetal", this.P.impDark, h.u0 - m - bw, h.u0 - m, 0, h.v1 + m + bw, P0, P0 + 0.5, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, h.u1 + m, h.u1 + m + bw, 0, h.v1 + m + bw, P0, P0 + 0.5, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, h.u0 - m, h.u1 + m, h.v1 + m, h.v1 + m + bw, P0, P0 + 0.5, { texel: 0.5 });
      // steel inner lip round the reveal
      this.box("metal", HG.steel, h.u0 - m - 0.08, h.u0 - m, 0, h.v1 + m + 0.08, P0 + 0.5, P0 + 0.56);
      this.box("metal", HG.steel, h.u1 + m, h.u1 + m + 0.08, 0, h.v1 + m + 0.08, P0 + 0.5, P0 + 0.56);
      this.box("metal", HG.steel, h.u0 - m, h.u1 + m, h.v1 + m, h.v1 + m + 0.08, P0 + 0.5, P0 + 0.56);
      // the hazard treatment: floor stripes across the threshold
      if (h.v0 === 0) {
        const [mn, mx] = this.aabb(h.u0 - 1.0, h.u1 + 1.0, 0, 0.02, P1, P1 + 1.4);
        this.B.boxMM("hgHazard", 0xffffff, mn, mx, { texel: 0.5 });
      }
    }
    // header plate (recessed name panel) + housed red lamps standing on it
    this.box("paintedMetal", this.P.impDark, h.u0 - 2.2, h.u1 + 2.2, hv0, hv1, 0.02, 0.9, { texel: 0.5 });
    this.box("paintedMetal", this.P.impBlack, h.u0 - 1.6, h.u1 + 1.6, hv0 + 0.2, hv1 - 0.2, 0.9, 0.92, { texel: 0.5 });
    for (const u of [h.u0 - 1.9, h.u1 + 1.9]) {
      this.box("paintedMetal", this.P.impDark, u - 0.25, u + 0.25, hv1, hv1 + 0.12, 0.3, 0.7);
      redBeacon(this.B, this.pos(u, hv1 + 0.3, 0.7), this.N.toArray(), 0.44);
    }
    const txt = DOOR_LABELS[h.door.id];
    if (txt) {
      const red = h.door.to === null;
      const width = Math.min(0.8 * LABELS[txt].aspect, h.u1 - h.u0 + 3.0);
      label(this.kit, red ? "hgSignRed" : "hgSign", txt, this.pos((h.u0 + h.u1) / 2, (hv0 + hv1) / 2, 0.925), this.N.toArray(), width);
      if (red) label(this.kit, "hgSignRed", "SEALED", this.pos((h.u0 + h.u1) / 2, h.v1 + m + 0.5, P0 + 0.565), this.N.toArray(), 2.4);
    }
    // jamb columns either side of the surround, each with a thin light strip in a black channel
    const bw = kind === "bay" ? 0.6 : 1.0;
    for (const [a, b] of [[h.u0 - m - bw - 0.9, h.u0 - m - bw - 0.15], [h.u1 + m + bw + 0.15, h.u1 + m + bw + 0.9]]) {
      this.box("paintedMetal", this.P.impDark, a, b, 0, hv0, 0.02, 0.9, { texel: 0.5 });
      this.box("paintedMetal", this.P.impBlack, (a + b) / 2 - 0.1, (a + b) / 2 + 0.1, 0.4, hv0 - 0.4, 0.9, 0.96);
      this.box("emitWhite", 0xffffff, (a + b) / 2 - 0.04, (a + b) / 2 + 0.04, 0.5, hv0 - 0.5, 0.96, 0.97);
      const [mn, mx] = this.aabb(a, b, 0, 4, 0, 0.9);
      this.kit.collider(mn, mx, "jamb");
    }
  }

  // ---- human-scale dressing along the wall base: free spans between ribs / doors / stairs / ladders /
  // fire stations get a console, a locker row, a hose-reel station or a maintenance hatch (cycled).
  dressBase(groups) {
    const cuts = [...this.cuts(), ...this.trayCuts, ...this.ribRects(), ...this.baseCuts];
    const spans = subtract({ u0: 1.0, u1: this.L - 1.0, v0: 0, v1: 3.3 }, cuts).filter((r) => r.v0 === 0 && r.v1 >= 3.3 && r.u1 - r.u0 >= 6);
    for (const r of spans) {
      const len = r.u1 - r.u0;
      const n = len >= 15 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const u = r.u0 + (len * (i + 1)) / (n + 1);
        const kind = groups[this.dressSeq++ % groups.length];
        this.dress(kind, u);
      }
    }
  }
  dress(kind, u) {
    const P = this.P, N = this.N.toArray();
    switch (kind) {
      case "console": {
        // 0.9 m standing console: dark cabinet, black top, tilted screen, indicators, a floor cable
        this.box("paintedMetal", P.impDark, u - 0.8, u + 0.8, 0, 0.9, P1, P1 + 0.62, { texel: 1 });
        this.box("paintedMetal", P.impBlack, u - 0.85, u + 0.85, 0.9, 0.96, P1, P1 + 0.68, { texel: 1 });
        this.B.geo("paintedMetal", P.impBlack, sharedBox(1.2, 0.46, 0.05), this.pos(u, 1.18, P1 + 0.42), this.tiltQ(0.5));
        this.B.geo("screenImp1", 0xffffff, sharedBox(1.08, 0.36, 0.02), this.pos(u, 1.18, P1 + 0.46), this.tiltQ(0.5));
        for (let i = 0; i < 5; i++) this.box(i % 3 === 0 ? "emitRedImp" : i % 3 === 1 ? "emitBlue" : "emitGreen", 0xffffff, u - 0.5 + i * 0.14, u - 0.44 + i * 0.14, 0.96, 0.98, P1 + 0.5, P1 + 0.56);
        this.box("metal", HG.gunmetal, u + 0.3, u + 0.7, 0.96, 1.0, P1 + 0.1, P1 + 0.3);
        const [mn, mx] = this.aabb(u - 0.85, u + 0.85, 0, 1.4, 0, P1 + 0.68);
        this.kit.collider(mn, mx, "console");
        break;
      }
      case "lockers": {
        // four 2 m lockers on a plinth: seams, louvre slots, handles, a stencil strip
        const n = 4, w = 0.62;
        const u0 = u - (n * w) / 2;
        this.box("paintedMetal", P.impBlack, u0 - 0.05, u0 + n * w + 0.05, 0, 0.1, P1, P1 + 0.52, { texel: 1 });
        for (let i = 0; i < n; i++) {
          const a = u0 + i * w + 0.015, b = u0 + (i + 1) * w - 0.015;
          this.box("paintedMetal", P.impMid, a, b, 0.1, 2.1, P1, P1 + 0.5, { texel: 1 });
          for (const v of [1.85, 1.95]) this.box("paintedMetal", P.impBlack, a + 0.15, b - 0.15, v - 0.02, v + 0.02, P1 + 0.5, P1 + 0.51);
          this.box("metal", HG.steel, b - 0.12, b - 0.09, 1.0, 1.2, P1 + 0.5, P1 + 0.54);
        }
        this.box("paintedMetal", P.impDark, u0 - 0.05, u0 + n * w + 0.05, 2.1, 2.2, P1, P1 + 0.52, { texel: 1 });
        const [mn, mx] = this.aabb(u0 - 0.05, u0 + n * w + 0.05, 0, 2.2, 0, P1 + 0.54);
        this.kit.collider(mn, mx, "lockers");
        break;
      }
      case "reel": {
        // hose-reel station: bracket, reel (axis into the room), a ground-power socket box, a floor cable
        this.box("paintedMetal", P.impDark, u - 0.8, u + 0.8, 0.5, 2.2, P1, P1 + 0.06, { texel: 1 });
        this.box("metal", HG.gunmetal, u - 0.05, u + 0.05, 0.6, 1.5, P1, P1 + 0.12);
        this.B.tube("metal", HG.gunmetal, this.pos(u, 1.5, P1 + 0.1), this.pos(u, 1.5, P1 + 0.14), 0.5, 20);
        this.B.tube("metal", HG.gunmetal, this.pos(u, 1.5, P1 + 0.4), this.pos(u, 1.5, P1 + 0.44), 0.5, 20);
        this.B.tube("rubber", HG.rubber, this.pos(u, 1.5, P1 + 0.14), this.pos(u, 1.5, P1 + 0.4), 0.42, 20);
        this.B.tube("metal", HG.steel, this.pos(u, 1.5, P1 + 0.05), this.pos(u, 1.5, P1 + 0.5), 0.06, 8);
        this.B.tube("rubber", HG.rubber, this.pos(u + 0.4, 1.12, P1 + 0.3), this.pos(u + 0.9, 0.06, P1 + 0.8), 0.045, 8);
        this.box("paintedMetal", P.impDark, u - 0.7, u - 0.2, 0.7, 1.3, P1 + 0.06, P1 + 0.3, { texel: 1 });
        this.box("emitAmber", 0xffffff, u - 0.6, u - 0.3, 1.2, 1.24, P1 + 0.3, P1 + 0.32);
        this.box("emitGreen", 0xffffff, u - 0.6, u - 0.52, 1.05, 1.13, P1 + 0.3, P1 + 0.32);
        label(this.kit, "hgDecal", "HIGH VOLTAGE", this.pos(u - 0.45, 0.85, P1 + 0.305), N, 0.5, { color: HG.yellow });
        break;
      }
      case "hatch": {
        // standard-door-sized maintenance hatch (2.4 x 3.0), decorative: heavy frame, two dark leaves
        // with a centre seam, a housed blue lamp on the header, stencil
        this.box("paintedMetal", P.impDark, u - 1.5, u + 1.5, 0, 3.3, P0, P0 + 0.3, { texel: 0.5 });
        this.box("paintedMetal", P.impBlack, u - 1.2, u + 1.2, 0.04, 3.0, P0, P0 + 0.31, { texel: 0.5 });
        for (const [a, b] of [[u - 1.17, u - 0.03], [u + 0.03, u + 1.17]]) this.box("paintedMetal", P.impMid, a, b, 0.1, 2.94, P0 + 0.31, P0 + 0.37, { texel: 0.5 });
        this.box("metal", HG.steel, u - 1.24, u + 1.24, 3.0, 3.06, P0 + 0.3, P0 + 0.36);
        this.box("metal", HG.steel, u - 0.2, u - 0.14, 1.0, 1.25, P0 + 0.37, P0 + 0.41);
        this.box("metal", HG.steel, u + 0.14, u + 0.2, 1.0, 1.25, P0 + 0.37, P0 + 0.41);
        housedLamp(this.B, "emitBlue", this.pos(u, 3.45, P0 + 0.3), N, [0.36, 0.14, 0.18], { inset: 0.04 });
        label(this.kit, "hgDecal", "MAINT ACCESS", this.pos(u, 3.17, P0 + 0.305), N, 1.9, { color: HG.white });
        label(this.kit, "hgDecal", "AUTHORISED ONLY", this.pos(u, 2.7, P0 + 0.375), N, 1.6, { color: HG.yellow });
        break;
      }
      default:
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Ceiling: backing, rib grid, panels (crane bays darker), long light channels with diffuser segments,
// louvred flood fixtures (fewer, two sizes)
// ---------------------------------------------------------------------------
function buildCeiling(ctx, B) {
  const { PALETTE } = ctx;
  const yB = CEIL - WALL_T; // -12.16 (panel back)
  B.boxMM("paintedMetal", PALETTE.impBlack, [HALL.x0 + WALL_T, yB, HALL.z0 + WALL_T], [HALL.x1 - WALL_T, CEIL, HALL.z1 - WALL_T], { faces: ALL & ~PY, texel: 0.5 });
  const ribD = RIB_D, w = RIB_W;
  // transverse ribs (along x) at RIB_Z; longitudinal (along z) at RIB_X, slightly shallower
  for (const z of RIB_Z) {
    B.boxMM("paintedMetal", PALETTE.impDark, [HALL.x0 + P1, yB - ribD, z - w / 2], [HALL.x1 - P1, yB, z + w / 2], { faces: ALL & ~PY, texel: 0.5 });
    B.boxMM("impPanel", PALETTE.impMid, [HALL.x0 + P1 + 0.5, yB - ribD - 0.06, z - w / 2 + 0.2], [HALL.x1 - P1 - 0.5, yB - ribD, z + w / 2 - 0.2], { texel: 0.5 });
  }
  const chanOff = w / 2 + 1.0; // channel centre from the rib centre
  const chanW = 1.0, chanD = 0.55;
  for (const x of RIB_X) {
    B.boxMM("paintedMetal", PALETTE.impDark, [x - w / 2, yB - ribD + 0.16, HALL.z0 + P1], [x + w / 2, yB, HALL.z1 - P1], { faces: ALL & ~PY, texel: 0.5 });
    // light channels either side: two dark lips hanging 0.55 m with the black backing as the trough,
    // diffuser segments (3 per rib bay) set back inside
    for (const s of [-1, 1]) {
      const cx = x + s * chanOff;
      for (const t of [-1, 1]) B.boxMM("paintedMetal", PALETTE.impDark, [cx + t * chanW / 2 - 0.06, yB - chanD, HALL.z0 + 1], [cx + t * chanW / 2 + 0.06, yB, HALL.z1 - 1], { faces: ALL & ~PY, texel: 0.5 });
      for (let i = 0; i < RIB_Z.length - 1; i++) {
        const z0 = RIB_Z[i] + w / 2 + 0.6, z1 = RIB_Z[i + 1] - w / 2 - 0.6;
        const seg = (z1 - z0 - 2 * 1.4) / 3;
        for (let k = 0; k < 3; k++) {
          const a = z0 + k * (seg + 1.4);
          B.boxMM("paintedMetal", PALETTE.impBlack, [cx - 0.36, yB - 0.28, a - 0.05], [cx + 0.36, yB - 0.02, a + seg + 0.05]);
          B.boxMM("emitWhite", 0xffffff, [cx - 0.3, yB - 0.34, a], [cx + 0.3, yB - 0.28, a + seg]);
        }
      }
    }
  }
  // panels in the cells between ribs: one light tone, the outer cells (crane bays) dark
  const xEdges = [HALL.x0 + P1, ...RIB_X.flatMap((x) => [x - w / 2, x + w / 2]), HALL.x1 - P1];
  const zEdges = [HALL.z0 + P1, ...RIB_Z.flatMap((z) => [z - w / 2, z + w / 2]), HALL.z1 - P1];
  const chan = RIB_X.flatMap((x) => [x - chanOff, x + chanOff]);
  for (let i = 0; i < xEdges.length - 1; i += 2) {
    const x0 = xEdges[i], x1 = xEdges[i + 1];
    const craneBay = x0 < HALL.x0 + 1 || x1 > HALL.x1 - 1;
    for (let j = 0; j < zEdges.length - 1; j += 2) {
      const z0 = zEdges[j], z1 = zEdges[j + 1];
      const nx = Math.max(1, Math.round((x1 - x0) / 5)), nz = Math.max(1, Math.round((z1 - z0) / 5));
      const px = (x1 - x0) / nx, pz = (z1 - z0) / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          let ax0 = x0 + a * px + 0.1, ax1 = x0 + (a + 1) * px - 0.1;
          const az0 = z0 + b * pz + 0.1, az1 = z0 + (b + 1) * pz - 0.1;
          for (const cx of chan) {
            if (ax0 < cx + chanW / 2 + 0.16 && ax1 > cx - chanW / 2 - 0.16) {
              if (cx - ax0 < ax1 - cx) ax0 = cx + chanW / 2 + 0.16;
              else ax1 = cx - chanW / 2 - 0.16;
            }
          }
          if (ax1 - ax0 < 0.5) continue;
          B.boxMM("impPanel", craneBay ? PALETTE.impDark : PALETTE.impGrey, [ax0, yB - 0.12, az0], [ax1, yB, az1], { faces: ALL & ~PY, fit: true });
        }
      }
    }
  }
  // louvred flood fixtures hanging from the transverse ribs: big ones over the pads/aprons (x +-22),
  // small ones over the taxi lanes every other rib
  const fixture = (x, z, big) => {
    const W = big ? 3.2 : 2.2, D = big ? 2.0 : 1.4, Hh = big ? 1.0 : 0.7;
    const top = yB - ribD;
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.22, top - 0.6, z - 0.22], [x + 0.22, top, z + 0.22], { texel: 0.5 });
    B.boxMM("paintedMetal", PALETTE.impMid, [x - W / 2 - 0.1, top - 0.75, z - 0.2], [x + W / 2 + 0.1, top - 0.6, z + 0.2], { texel: 0.5 });
    const y1 = top - 0.75, y0 = y1 - Hh;
    // top plate + four side slabs (open bottom), lens set 0.3 up inside, three slats across the mouth
    B.boxMM("paintedMetal", PALETTE.impDark, [x - W / 2, y1 - 0.08, z - D / 2], [x + W / 2, y1, z + D / 2], { texel: 0.5 });
    for (const s of [-1, 1]) {
      B.boxMM("paintedMetal", PALETTE.impDark, [x + s * W / 2 - 0.04, y0, z - D / 2], [x + s * W / 2 + 0.04, y1, z + D / 2], { texel: 0.5 });
      B.boxMM("paintedMetal", PALETTE.impDark, [x - W / 2, y0, z + s * D / 2 - 0.04], [x + W / 2, y1, z + s * D / 2 + 0.04], { texel: 0.5 });
    }
    B.boxMM("emitWhite", 0xffffff, [x - W / 2 + 0.12, y0 + 0.3, z - D / 2 + 0.12], [x + W / 2 - 0.12, y0 + 0.36, z + D / 2 - 0.12]);
    for (const k of [-1, 0, 1]) B.boxMM("paintedMetal", PALETTE.impMid, [x - W / 2, y0, z + k * D * 0.3 - 0.025], [x + W / 2, y0 + 0.14, z + k * D * 0.3 + 0.025], { texel: 0.5 });
  };
  RIB_Z.forEach((z, i) => {
    for (const s of [-1, 1]) {
      fixture(s * 22, z, true);
      if (i % 2 === 1) fixture(s * 58, z, false);
    }
  });
}

// ---------------------------------------------------------------------------
// Fire station: red cabinet + hose reel + extinguishers + lamp, on a wall at local u
// ---------------------------------------------------------------------------
function fireStation(W, u) {
  const { kit } = W;
  W.box("paintedMetal", HG.red, u - 0.45, u + 0.45, 0.5, 2.1, P1, P1 + 0.45, { texel: 1 });
  W.box("metal", HG.gunmetal, u - 0.47, u + 0.47, 0.48, 0.52, P1, P1 + 0.47);
  W.box("metal", HG.gunmetal, u - 0.47, u + 0.47, 2.1, 2.14, P1, P1 + 0.47);
  W.box("metal", HG.steel, u + 0.3, u + 0.36, 1.1, 1.5, P1 + 0.45, P1 + 0.5);
  label(kit, "hgDecal", "FIRE", W.pos(u, 1.75, P1 + 0.455), W.N.toArray(), 0.7, { color: HG.white });
  W.box("emitRedImp", 0xffffff, u - 0.15, u + 0.15, 1.92, 2.04, P1 + 0.45, P1 + 0.6);
  // hose reel beside the cabinet (axis into the room): two flanges with the hose wound between
  W.B.tube("metal", HG.gunmetal, W.pos(u + 1.0, 1.5, P1 + 0.02), W.pos(u + 1.0, 1.5, P1 + 0.06), 0.42, 20);
  W.B.tube("metal", HG.gunmetal, W.pos(u + 1.0, 1.5, P1 + 0.28), W.pos(u + 1.0, 1.5, P1 + 0.32), 0.42, 20);
  W.B.tube("rubber", HG.rubber, W.pos(u + 1.0, 1.5, P1 + 0.06), W.pos(u + 1.0, 1.5, P1 + 0.28), 0.36, 20);
  W.box("metal", HG.steel, u + 0.95, u + 1.05, 0.95, 1.5, P1, P1 + 0.08);
  for (const du of [-0.8, -1.05]) {
    W.B.tube("paintedMetal", HG.red, W.pos(u + du, 0.55, P1 + 0.2), W.pos(u + du, 1.15, P1 + 0.2), 0.09, 10);
    W.box("metal", HG.steel, u + du - 0.03, u + du + 0.03, 1.15, 1.28, P1 + 0.17, P1 + 0.23);
  }
  W.box("metal", HG.gunmetal, u - 1.15, u - 0.7, 0.9, 0.96, P1, P1 + 0.3);
  const [mn, mx] = W.aabb(u - 1.2, u + 1.5, 0, 2.2, 0, P1 + 0.5);
  kit.collider(mn, mx, "fire-station");
  W.baseCuts.push({ u0: u - 1.6, u1: u + 1.9, v0: 0, v1: 3.3 });
}

// ---------------------------------------------------------------------------
// Balcony for the control-tower hatch (y -60): grate plate into the wall slot, rails on the three open
// sides, a fascia beam with a recessed lit soffit, three heavy brackets (arm + wall plate + box strut),
// a small standing console. Reached only through the hatch (no stair).
// ---------------------------------------------------------------------------
function buildBalcony(ctx, B) {
  const { kit, PALETTE } = ctx;
  const { x0, x1, z0, y } = BALCONY;
  const zWall = HALL.z1 - WALL_T; // backing front
  const T = 0.3;
  B.boxMM("grate", 0xffffff, [x0, y - T, z0], [x1, y, zWall], { texel: 0.8 });
  // edge trim (sides), a hair proud of the plate; fascia beam along the front with the soffit strip
  for (const [a, b] of [[x0 - 0.14, x0], [x1, x1 + 0.14]]) B.boxMM("paintedMetal", PALETTE.impDark, [a, y - T - 0.06, z0], [b, y + 0.02, zWall], { texel: 0.5 });
  B.boxMM("paintedMetal", PALETTE.impDark, [x0 - 0.14, y - T - 0.55, z0 - 0.14], [x1 + 0.14, y + 0.02, z0 + 0.3], { texel: 0.5 });
  B.boxMM("metal", HG.steel, [x0 - 0.14, y - T - 0.2, z0 - 0.16], [x1 + 0.14, y - T - 0.14, z0 - 0.14]);
  housedLamp(B, "emitWhite", [(x0 + x1) / 2, y - T - 0.551, z0 + 0.08], [0, -1, 0], [x1 - x0 - 1.2, 0.16, 0.26], { inset: 0.05 });
  // three heavy brackets: arm under the plate, wall plate, square-section strut
  for (const x of [-10.5, 0, 10.5]) {
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.25, y - T - 0.5, z0 + 0.3], [x + 0.25, y - T - 0.06, zWall], { texel: 0.5 });
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.35, y - 3.8, zWall - 0.35], [x + 0.35, y - T - 0.06, zWall], { texel: 0.5 });
    const a = new THREE.Vector3(x, y - T - 0.6, z0 + 0.55), b = new THREE.Vector3(x, y - 3.4, zWall - 0.25);
    const L = a.distanceTo(b);
    const ang = Math.atan2(b.y - a.y, b.z - a.z); // rotation about x taking +z onto the strut
    kit.add("paintedMetal", new THREE.BoxGeometry(0.28, 0.28, L), { pos: a.clone().add(b).multiplyScalar(0.5).toArray(), rot: [-ang, 0, 0], color: PALETTE.impDark, texel: 0.5 });
  }
  // rails (1.02 m, blocking)
  railRun(B, kit, [x0, z0], [x1, z0], y, { tag: "balcony-rail" });
  railRun(B, kit, [x0, z0], [x0, zWall - 0.1], y, { tag: "balcony-rail" });
  railRun(B, kit, [x1, z0], [x1, zWall - 0.1], y, { tag: "balcony-rail" });
  // standing console at the rail (0.9 m, matte black, tilted screen + indicators)
  const cx = 6.0, cz = z0 + 0.75;
  B.boxMM("paintedMetal", PALETTE.impBlack, [cx - 0.45, y, cz - 0.25], [cx + 0.45, y + 0.78, cz + 0.25], { texel: 1 });
  B.boxMM("paintedMetal", PALETTE.impDark, [cx - 0.5, y + 0.78, cz - 0.32], [cx + 0.5, y + 0.9, cz + 0.32], { texel: 1 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.9, 0.44, 0.05), { pos: [cx, y + 1.06, cz + 0.06], rot: [-0.55, 0, 0], color: PALETTE.impBlack, texel: 1 });
  kit.add("screenImp1", new THREE.PlaneGeometry(0.8, 0.36), { pos: [cx, y + 1.06, cz + 0.11], rot: [-0.55, 0, 0], uv: "keep" });
  for (let i = 0; i < 6; i++) B.box(i % 3 === 0 ? "emitRedImp" : i % 3 === 1 ? "emitBlue" : "emitAmber", 0xffffff, cx - 0.3 + i * 0.12, y + 0.86, cz - 0.28, 0.06, 0.02, 0.06);
  kit.collider([cx - 0.5, y, cz - 0.32], [cx + 0.5, y + 1.2, cz + 0.32], "console");
}

// ---------------------------------------------------------------------------
// Maintenance catwalk ring at y -35.5 round all four walls: grate plate on the third structural band,
// rails on the inner edge, brackets, housed downlights every 8 m, caged ladders from the deck (side
// walls: the rack ladders continue up; end walls: one each).
// ---------------------------------------------------------------------------
function buildCatwalk(ctx, B) {
  const { kit, PALETTE } = ctx;
  const y = CATWALK.y, w = CATWALK.w;
  const inX = HALL.x1 - P1 - 0.01, inZ0 = HALL.z0 + P1 + 0.01, inZ1 = HALL.z1 - P1 - 0.01; // wall panel fronts
  const edgeX = inX - w, edgeZ0 = inZ0 + w, edgeZ1 = inZ1 - w; // inner (rail) edges
  const grate = (mn, mx) => B.boxMM("grate", 0xffffff, mn, mx, { texel: 0.8 });
  const trim = (mn, mx) => B.boxMM("paintedMetal", PALETTE.impDark, mn, mx, { texel: 0.5 });
  // side walls: plate in pieces round the ladder holes (wall-side 0.7 m), inner 0.3 m continuous
  for (const s of [-1, 1]) {
    const xa = Math.min(s * inX, s * edgeX), xb = Math.max(s * inX, s * edgeX);
    const xi0 = Math.min(s * edgeX, s * (edgeX + 0.3)), xi1 = Math.max(s * edgeX, s * (edgeX + 0.3));
    const xw0 = Math.min(s * (edgeX + 0.3), s * inX), xw1 = Math.max(s * (edgeX + 0.3), s * inX);
    grate([xi0, y - CAT_T, inZ0], [xi1, y, inZ1]);
    let cursor = inZ0;
    for (const lz of [...LADDER_Z].sort((a, b) => a - b)) {
      grate([xw0, y - CAT_T, cursor], [xw1, y, lz - 0.6]);
      cursor = lz + 0.6;
    }
    grate([xw0, y - CAT_T, cursor], [xw1, y, inZ1]);
    trim([Math.min(s * edgeX, s * (edgeX - 0.12)), y - CAT_T - 0.05, inZ0], [Math.max(s * edgeX, s * (edgeX - 0.12)), y + 0.02, inZ1]);
    // brackets + downlights
    for (let z = HALL.z0 + 3; z < HALL.z1 - 2; z += 4) {
      if (RIB_Z.some((r) => Math.abs(r - z) < 1.6) || LADDER_Z.some((l) => Math.abs(l - z) < 1.0)) continue;
      B.boxMM("paintedMetal", PALETTE.impMid, [xa, y - CAT_T - 0.32, z - 0.12], [xb, y - CAT_T, z + 0.12], { texel: 0.5 });
      if (Math.round((z - HALL.z0 - 3) / 4) % 2 === 0) housedLamp(B, "emitWhite", [s * (edgeX + 0.5), y - CAT_T - 0.16, z], [0, -1, 0], [0.5, 0.16, 0.36], { inset: 0.04 });
    }
    // rail along the inner edge
    railRun(B, kit, [s * (edgeX + 0.05), inZ0 + 0.05], [s * (edgeX + 0.05), inZ1 - 0.05], y, { collide: false });
    // the rack ladders continue from the tier-2 platform up to the catwalk
    for (const z of LADDER_Z) ladder(B, kit, s * (HALL.x1 - P1), z, RACK.tiers[1].platformY, y, -s, { cage: true, collide: false });
  }
  // end walls: plate between the side plates, with the ladder hole
  for (const [zIn, zEdge, sgn, name] of [
    [inZ0, edgeZ0, 1, "bow"],
    [inZ1, edgeZ1, -1, "aft"],
  ]) {
    const za = Math.min(zIn, zEdge), zb = Math.max(zIn, zEdge);
    const lx = END_LADDER_X[name];
    const tw = -sgn; // from the inner edge toward the wall
    const zi0 = Math.min(zEdge, zEdge + tw * 0.3), zi1 = Math.max(zEdge, zEdge + tw * 0.3);
    const zw0 = Math.min(zEdge + tw * 0.3, zIn), zw1 = Math.max(zEdge + tw * 0.3, zIn);
    grate([-edgeX + 0.02, y - CAT_T, zi0], [edgeX - 0.02, y, zi1]);
    grate([-edgeX + 0.02, y - CAT_T, zw0], [lx - 0.6, y, zw1]);
    grate([lx + 0.6, y - CAT_T, zw0], [edgeX - 0.02, y, zw1]);
    trim([-edgeX + 0.02, y - CAT_T - 0.05, Math.min(zEdge, zEdge + sgn * 0.12)], [edgeX - 0.02, y + 0.02, Math.max(zEdge, zEdge + sgn * 0.12)]);
    for (let x = HALL.x0 + 3; x < HALL.x1 - 2; x += 4) {
      if (RIB_X.some((r) => Math.abs(r - x) < 1.6) || Math.abs(x - lx) < 1.0) continue;
      B.boxMM("paintedMetal", PALETTE.impMid, [x - 0.12, y - CAT_T - 0.32, za], [x + 0.12, y - CAT_T, zb], { texel: 0.5 });
      if (Math.round((x - HALL.x0 - 3) / 4) % 2 === 0) housedLamp(B, "emitWhite", [x, y - CAT_T - 0.16, zEdge + tw * 0.5], [0, -1, 0], [0.5, 0.16, 0.36], { inset: 0.04 });
    }
    railRun(B, kit, [-edgeX + 0.05, zEdge + sgn * 0.05], [edgeX - 0.05, zEdge + sgn * 0.05], y, { collide: false });
    ladder(B, kit, zIn + sgn * 0.01, lx, FLOOR, y, sgn, { cage: true, plane: "z" });
  }
}

// ---------------------------------------------------------------------------
export function buildWalls(ctx) {
  const { kit, PALETTE } = ctx;
  const B = new Batcher(kit);
  const walls = [
    new Wall(ctx, B, { name: "starboard", plane: "x", c: HALL.x1, inward: -1, uw0: HALL.z0, length: HALL.z1 - HALL.z0, ribs: RIB_Z.map((z) => z - HALL.z0), seed: ctx.seed ^ 11 }),
    new Wall(ctx, B, { name: "port", plane: "x", c: HALL.x0, inward: 1, uw0: HALL.z0, length: HALL.z1 - HALL.z0, ribs: RIB_Z.map((z) => z - HALL.z0), seed: ctx.seed ^ 23 }),
    new Wall(ctx, B, { name: "aft", plane: "z", c: HALL.z1, inward: -1, uw0: HALL.x0, length: HALL.x1 - HALL.x0, ribs: RIB_X.map((x) => x - HALL.x0), seed: ctx.seed ^ 37 }),
    new Wall(ctx, B, { name: "bow", plane: "z", c: HALL.z0, inward: 1, uw0: HALL.x0, length: HALL.x1 - HALL.x0, ribs: RIB_X.map((x) => x - HALL.x0), seed: ctx.seed ^ 41 }),
  ];
  const byName = Object.fromEntries(walls.map((w) => [w.name, w]));

  // door holes (exact) on their faces; panels keep clear of the surround (jambs 2.1 m, header + lamps 3.4 m)
  for (const d of DOORS) {
    const o = doorOpening(d);
    const wall = d.dir[0] > 0 ? byName.starboard : d.dir[0] < 0 ? byName.port : d.dir[2] > 0 ? byName.aft : byName.bow;
    const hatch = d.kind === "hatch";
    wall.addHole({ u0: wall.u(o.u0), u1: wall.u(o.u1), v0: o.v0 - FLOOR, v1: o.v1 - FLOOR, door: d, mu: hatch ? 0.3 : 2.5, mv: hatch ? 0.3 : 3.7 });
  }
  // control window (aft wall): bezel is 0.6 wide, panels stay 0.3 beyond it
  const aft = byName.aft;
  aft.addHole({ u0: aft.u(WINDOW.x0), u1: aft.u(WINDOW.x1), v0: WINDOW.y0 - FLOOR, v1: WINDOW.y1 - FLOOR, window: true, mu: 0.9, mv: 0.9 });
  aft.levels = [[FLOOR, BALCONY.y - 0.6], [BALCONY.y, CEIL]];
  // the balcony plate meets the wall: keep the band/panels out of its slot; the tower base (dark field
  // between the blast-door header and the balcony) has its own cut
  const towerV0 = 4 + FRAME_W + 1.1 + 1.4 + 0.9, towerV1 = BALCONY.y - FLOOR - 0.5;
  aft.extraCuts = [
    { u0: aft.u(BALCONY.x0 - 0.3), u1: aft.u(BALCONY.x1 + 0.3), v0: BALCONY.y - FLOOR - 0.5, v1: BALCONY.y - FLOOR + 0.5 },
    { u0: aft.u(-12.3), u1: aft.u(12.3), v0: towerV0, v1: towerV1 },
  ];
  // end-wall catwalk ladders: trays + dressing keep clear
  for (const w of [byName.bow, byName.aft]) w.trayCuts.push({ u0: w.u(END_LADDER_X[w.name]) - 0.8, u1: w.u(END_LADDER_X[w.name]) + 0.8, v0: 0, v1: H });
  // side walls: trays break for the rack stairs and ladders; panels behind the racks stay plain; the
  // rack columns and stair foot keep the base dressing away
  for (const w of [byName.starboard, byName.port]) {
    const st = STAIRS[w.name];
    w.trayCuts.push({ u0: w.u(Math.min(st.foot, st.top)) - 0.5, u1: w.u(Math.max(st.foot, st.top)) + 0.5, v0: 0, v1: H });
    for (const z of LADDER_Z) w.trayCuts.push({ u0: w.u(z) - 0.8, u1: w.u(z) + 0.8, v0: 0, v1: H });
    w.plainRects.push({ u0: w.u(RACK.zoneZ0) - 1, u1: w.u(RACK.zoneZ1) + 1, v0: 4, v1: RACK.tiers[1].y + 8 - FLOOR });
    for (const z of [RACK.zoneZ0 + 0.4, RACK.zoneZ1 - 0.4]) w.baseCuts.push({ u0: w.u(z) - 0.8, u1: w.u(z) + 0.8, v0: 0, v1: 3.3 });
    // the second structural band would cross the tier-2 platform at chest height: recess it there
    w.extraCuts.push({ u0: w.u(RACK.zoneZ0) - 0.5, u1: w.u(RACK.zoneZ1) + 0.5, v0: 23.6, v1: 24.4 });
  }
  // fire stations: two per side wall, two on the aft wall, one on the bow wall (between ribs)
  fireStation(byName.starboard, byName.starboard.u(78));
  fireStation(byName.starboard, byName.starboard.u(-56));
  fireStation(byName.port, byName.port.u(78));
  fireStation(byName.port, byName.port.u(-56));
  fireStation(byName.aft, byName.aft.u(12));
  fireStation(byName.aft, byName.aft.u(-30));
  fireStation(byName.bow, byName.bow.u(12));
  // maintenance hatches (decorative, standard door size): two per side wall, one per end wall
  const hatches = { starboard: [-40, 150], port: [-40, 150], aft: [-52, 40], bow: [-40, 30] };
  const hatchCut = (W, u) => {
    W.extraCuts.push({ u0: u - 1.55, u1: u + 1.55, v0: 0, v1: 3.35 });
    W.trayCuts.push({ u0: u - 1.7, u1: u + 1.7, v0: 0, v1: H });
    W.baseCuts.push({ u0: u - 2.6, u1: u + 2.6, v0: 0, v1: 3.3 });
  };
  for (const w of walls) for (const a of hatches[w.name]) hatchCut(w, w.u(a));

  for (const w of walls) {
    w.backing();
    w.panels();
    w.ribsBuild();
    w.floods();
    w.trays();
    for (const h of w.holes) if (h.door) w.doorSurround(h);
    for (const a of hatches[w.name]) w.dress("hatch", w.u(a));
    w.dressBase(w.plane === "x" ? ["lockers", "console", "reel", "console", "lockers", "reel"] : ["console", "lockers", "reel"]);
  }

  // window bezel + sign + tower base
  {
    const W = aft;
    const u0 = W.u(WINDOW.x0), u1 = W.u(WINDOW.x1), v0 = WINDOW.y0 - FLOOR, v1 = WINDOW.y1 - FLOOR;
    const t = 0.6, D = 0.76;
    W.box("paintedMetal", PALETTE.impDark, u0 - t, u1 + t, v1, v1 + t, 0.02, D, { texel: 0.5 });
    W.box("paintedMetal", PALETTE.impDark, u0 - t, u0, v0 - t, v1 + t, 0.02, D, { texel: 0.5 });
    W.box("paintedMetal", PALETTE.impDark, u1, u1 + t, v0 - t, v1 + t, 0.02, D, { texel: 0.5 });
    // sill split around the control-gantry hatch (its hole overlaps the window band's bottom)
    const hatch = W.holes.find((h) => h.door && h.door.kind === "hatch");
    const gap0 = hatch.u0 - FRAME_W, gap1 = hatch.u1 + FRAME_W;
    W.box("paintedMetal", PALETTE.impDark, u0 - t, gap0, v0 - t, v0, 0.02, D, { texel: 0.5 });
    W.box("paintedMetal", PALETTE.impDark, gap1, u1 + t, v0 - t, v0, 0.02, D, { texel: 0.5 });
    // bezel lip + bolt row + housed blue status lights under the sill
    W.box("metal", HG.gunmetal, u0 - 0.1, u1 + 0.1, v1 + 0.02, v1 + 0.12, D, D + 0.05);
    for (let u = u0 - 0.3; u <= u1 + 0.3; u += 1.0) W.box("metal", HG.steel, u - 0.06, u + 0.06, v1 + 0.3, v1 + 0.42, D, D + 0.05);
    for (let u = gap1 + 0.8; u < u1; u += 2.5) housedLamp(B, "emitBlue", W.pos(u, v0 - 0.35, D), W.N.toArray(), [0.4, 0.1, 0.16], { inset: 0.04 });
    for (let u = u0 + 0.8; u < gap0 - 0.4; u += 2.5) housedLamp(B, "emitBlue", W.pos(u, v0 - 0.35, D), W.N.toArray(), [0.4, 0.1, 0.16], { inset: 0.04 });
    // sign "HANGAR CONTROL": tracked letters on a framed black plate, flanked by two housed light bars
    const sv = v1 + t + 1.2;
    W.box("paintedMetal", PALETTE.impBlack, u0 - 0.4, u1 + 0.4, sv - 0.75, sv + 0.75, P1, P1 + 0.015, { texel: 0.5 });
    W.box("metal", HG.steel, u0 - 0.46, u1 + 0.46, sv - 0.81, sv - 0.75, P1, P1 + 0.04);
    W.box("metal", HG.steel, u0 - 0.46, u1 + 0.46, sv + 0.75, sv + 0.81, P1, P1 + 0.04);
    label(kit, "hgSign", "HANGAR CONTROL", W.pos((u0 + u1) / 2, sv, P1 + 0.03), W.N.toArray(), 10);
    for (const u of [u0 - 1.0, u1 + 1.0]) {
      W.box("paintedMetal", PALETTE.impDark, u - 0.12, u + 0.12, sv - 0.85, sv + 0.85, P1, P1 + 0.1);
      W.box("emitWhite", 0xffffff, u - 0.04, u + 0.04, sv - 0.75, sv + 0.75, P1 + 0.1, P1 + 0.11);
    }
    // tower base: dark recessed field with vertical fins between the blast-door header and the balcony
    const tu0 = W.u(-12.3), tu1 = W.u(12.3);
    W.box("paintedMetal", PALETTE.impBlack, tu0, tu1, towerV0, towerV1, P0, P0 + 0.04, { texel: 0.5 });
    for (let u = tu0 + 0.6; u < tu1; u += 2.4) W.box("paintedMetal", PALETTE.impDark, u - 0.14, u + 0.14, towerV0, towerV1, P0, P0 + 0.5, { texel: 0.5 });
    W.box("paintedMetal", PALETTE.impDark, tu0, tu1, towerV0, towerV0 + 0.25, P0, P0 + 0.55, { texel: 0.5 });
    W.box("paintedMetal", PALETTE.impDark, tu0, tu1, towerV1 - 0.25, towerV1, P0, P0 + 0.55, { texel: 0.5 });
  }

  buildBalcony(ctx, B);
  buildCatwalk(ctx, B);
  buildCeiling(ctx, B);
  B.flush();
  return walls;
}
