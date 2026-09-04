// d4-hangar walls + ceiling: giant Imperial panelling (4 m panels, black seams, structural bands every
// 12 m, frame ribs every 20 m hugging wall + ceiling), wall floods, waist-height light strips, cable
// trays, door holes cut exactly with doorOpening(), hazard surrounds + headers + floor stripes at the
// bay/blast doors, the control-tower window bezel + "HANGAR CONTROL" sign, fire stations.
import * as THREE from "three";
import { Batcher, PX, NX, PY, PZ, NZ, ALL, sharedBox } from "./batch.js";
import { doorOpening, FRAME_W } from "../../systems/doors/helper.js";
import { rng } from "../../kit.js";
import { FLOOR, CEIL, WALL_T, HALL, DOORS, DOOR_LABELS, WINDOW, BALCONY, RACK, STAIRS, LADDER_Z, RIB_Z, RIB_X, RIB_W, RIB_D, PANEL_W, SEAM, HG } from "./layout.js";
import { LABELS } from "./materials.js";
import { label, railRun } from "./util.js";

const H = CEIL - FLOOR; // 60
const P0 = WALL_T; // panel back (on the black backing)
const P1 = WALL_T + 0.12; // panel front

// rows of the 60 m wall: [v0, v1, type]
const ROWS = [];
for (let k = 0; k < 5; k++) {
  const b = k * 12;
  if (k === 0) ROWS.push([0, 0.9, "kick"], [0.9, 6.2, "panelLow"], [6.2, 11.6, "panel"]);
  else ROWS.push([b + 0.4, b + 6.0, "panel"], [b + 6.0, b + 11.6, "panel"]);
  if (k < 4) ROWS.push([b + 11.6, b + 12.4, "band"]);
  else ROWS.push([b + 11.6, H, "cornice"]);
}

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
    this.extraCuts = []; // panels/bands keep out of these (balcony slot)
    this.trayCuts = []; // cable trays keep out of these (stairs, ladders)
    this.plainRects = []; // panels here get no greebles (racks / platforms hang in front)
    this.levels = [[FLOOR, CEIL]];
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
            // waist-height blue-white light strip just above the kick band
            this.box("paintedMetal", this.P.impBlack, r.u0 + 0.25, r.u1 - 0.25, 0.98, 1.12, P1, P1 + 0.06);
            this.box("emitCool", 0xffffff, r.u0 + 0.3, r.u1 - 0.3, 1.02, 1.08, P1, P1 + 0.08);
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
    // mostly impGrey with a few lighter panels; dark panels only as vents (three random tones read as a quilt)
    const rnd = this.rand();
    let color = rnd < 0.84 ? this.P.impGrey : this.P.impWhite;
    let style = "plain";
    if (full && w > 1.5 && h > 2 && !this.plainRects.some((p) => intersects(r, p))) {
      const s = this.rand();
      if (detailed) {
        if (s < 0.08) style = "vent";
        else if (s < 0.15) style = "greeble";
        else if (s < 0.22) style = "seam";
        else if (s < 0.27) style = "inset";
      } else if (s < 0.07) style = "vent";
    }
    if (style === "vent") color = this.P.impMid;
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
        this.box("impPanel", this.P.impWhite, u0 + 0.5, u1 - 0.5, v0 + 0.5, v1 - 0.5, P1, P1 + 0.06, { faces: this.faces, fit: true });
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

  // ---- frame ribs (wall part). Interrupted by doors: the rib restarts above the header.
  ribsBuild() {
    const D = P0 + RIB_D;
    for (const u of this.ribs) {
      let vStart = 0;
      for (const h of this.holes) if (h.door && h.u1 + 2.5 > u - RIB_W / 2 && h.u0 - 2.5 < u + RIB_W / 2 && h.v0 < 1) vStart = Math.max(vStart, h.v1 + 3.6);
      this.box("paintedMetal", this.P.impDark, u - RIB_W / 2, u + RIB_W / 2, vStart, H, 0.02, D, { texel: 0.5 });
      this.box("impPanel", this.P.impMid, u - RIB_W / 2 + 0.2, u + RIB_W / 2 - 0.2, vStart + 0.4, H - 0.6, D, D + 0.06, { texel: 0.5 });
      // side flanges (lighter) so the rib reads as a profile, not a slab
      for (const s of [-1, 1]) this.box("paintedMetal", this.P.impMid, u + s * (RIB_W / 2 + 0.12) - 0.12, u + s * (RIB_W / 2 + 0.12) + 0.12, vStart, H, P1, D - 0.3, { texel: 0.5 });
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

  // ---- wall floods (rows at y -20 and -40: the lower row sits just above the tier-2 cradle tops so the
  // fixtures never cut through the rack beams), skipping ribs and holes
  floods() {
    const cuts = this.cuts();
    for (const v of [H - 8, 32]) {
      for (let u = 4; u < this.L - 1; u += 8) {
        if (this.ribs.some((r) => Math.abs(r - u) < 2.2)) continue;
        if (cuts.some((c) => u + 1.2 > c.u0 && u - 1.2 < c.u1 && v + 0.6 > c.v0 && v - 0.6 < c.v1)) continue;
        this.flood(u, v);
      }
    }
  }
  flood(u, v) {
    this.box("paintedMetal", this.P.impDark, u - 0.25, u + 0.25, v - 0.25, v + 0.25, P1, 0.95, { texel: 0.5 });
    if (!this._floodQ) {
      const theta = 0.62; // tilt down
      const N = this.N, up = new THREE.Vector3(0, 1, 0);
      const front = N.clone().multiplyScalar(Math.cos(theta)).addScaledVector(up, -Math.sin(theta)).normalize();
      const vUp = up.clone().multiplyScalar(Math.cos(theta)).addScaledVector(N, Math.sin(theta)).normalize();
      const right = new THREE.Vector3().crossVectors(vUp, front).normalize();
      this._floodQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, vUp, front));
      this._floodUp = vUp;
      this._floodFront = front;
    }
    const c = new THREE.Vector3(...this.pos(u, v, 1.35));
    this.B.geo("paintedMetal", this.P.impDark, sharedBox(1.9, 0.55, 0.9), c.toArray(), this._floodQ);
    this.B.geo("emitWhite", 0xffffff, sharedBox(1.7, 0.06, 0.72), c.clone().addScaledVector(this._floodUp, -0.3).toArray(), this._floodQ);
    this.B.tube("metal", HG.gunmetal, this.pos(u, v, 0.95), c.clone().addScaledVector(this._floodFront, -0.45).toArray(), 0.09, 8);
  }

  // ---- cable trays + pipes at v 2.2 .. 3.1 along hole-free spans (they run into the ribs)
  trays() {
    const spans = subtract({ u0: 0.6, u1: this.L - 0.6, v0: 2.2, v1: 3.1 }, [...this.cuts(), ...this.trayCuts]);
    for (const r of spans) {
      if (r.v1 - r.v0 < 0.8) continue;
      this.box("paintedMetal", this.P.impDark, r.u0, r.u1, 2.2, 2.32, P1, P1 + 0.5, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, r.u0, r.u1, 2.2, 2.5, P1 + 0.46, P1 + 0.5, { texel: 0.5 });
      this.B.tube("metal", HG.steel, this.pos(r.u0, 2.72, P1 + 0.28), this.pos(r.u1, 2.72, P1 + 0.28), 0.11, 10);
      this.B.tube("metal", HG.gunmetal, this.pos(r.u0, 2.98, P1 + 0.24), this.pos(r.u1, 2.98, P1 + 0.24), 0.07, 8);
      for (let u = r.u0 + 2; u < r.u1 - 1; u += 4) this.box("metal", HG.gunmetal, u - 0.1, u + 0.1, 2.6, 3.1, P1 + 0.1, P1 + 0.4);
      for (let u = r.u0 + 6; u < r.u1 - 2; u += 16) {
        if (this.ribs.some((rb) => Math.abs(rb - u) < 1.6)) continue;
        this.box("paintedMetal", this.P.impDark, u - 0.4, u + 0.4, 3.3, 4.2, P1, P1 + 0.35, { texel: 0.5 });
        this.box("emitGreen", 0xffffff, u - 0.25, u - 0.15, 3.95, 4.05, P1 + 0.35, P1 + 0.37);
        this.box("emitRedImp", 0xffffff, u - 0.05, u + 0.05, 3.95, 4.05, P1 + 0.35, P1 + 0.37);
      }
    }
  }

  // ---- door surrounds (bay + blast): hazard border, jamb columns, header with beacons + label, floor stripes
  doorSurround(h) {
    const kind = h.door.kind;
    if (kind !== "bay" && kind !== "blast") return;
    const m = FRAME_W; // reveal the doors system needs
    this.box("hgHazard", 0xffffff, h.u0 - m - 1.0, h.u0 - m, 0, h.v1 + m + 1.0, P0, P0 + 0.08, { texel: 0.5 });
    this.box("hgHazard", 0xffffff, h.u1 + m, h.u1 + m + 1.0, 0, h.v1 + m + 1.0, P0, P0 + 0.08, { texel: 0.5 });
    this.box("hgHazard", 0xffffff, h.u0 - m, h.u1 + m, h.v1 + m, h.v1 + m + 1.0, P0, P0 + 0.08, { texel: 0.5 });
    const hv0 = h.v1 + m + 1.1, hv1 = hv0 + 1.4;
    this.box("paintedMetal", this.P.impDark, h.u0 - 2.2, h.u1 + 2.2, hv0, hv1, 0.02, 0.9, { texel: 0.5 });
    this.box("hgPulse", 0xffffff, h.u0 - 1.6, h.u1 + 1.6, hv0 + 0.25, hv0 + 0.45, 0.9, 0.98);
    for (const u of [h.u0 - 1.9, h.u1 + 1.9]) {
      this.box("metal", HG.gunmetal, u - 0.3, u + 0.3, hv1, hv1 + 0.25, 0.3, 0.9);
      this.box("hgPulse", 0xffffff, u - 0.22, u + 0.22, hv1 + 0.25, hv1 + 0.65, 0.35, 0.85);
    }
    const txt = DOOR_LABELS[h.door.id];
    if (txt) {
      const red = h.door.to === null;
      const width = Math.min(0.8 * LABELS[txt].aspect, h.u1 - h.u0 + 3.6);
      label(this.kit, red ? "hgSignRed" : "hgSign", txt, this.pos((h.u0 + h.u1) / 2, hv0 + 0.9, 0.905), this.N.toArray(), width);
      if (red) label(this.kit, "hgSignRed", "SEALED", this.pos((h.u0 + h.u1) / 2, h.v1 + m + 0.5, P0 + 0.085), this.N.toArray(), 2.4);
    }
    // jamb columns either side of the hazard border
    for (const [a, b] of [[h.u0 - m - 1.9, h.u0 - m - 1.15], [h.u1 + m + 1.15, h.u1 + m + 1.9]]) {
      this.box("paintedMetal", this.P.impDark, a, b, 0, hv0, 0.02, 0.9, { texel: 0.5 });
      this.box("emitCool", 0xffffff, (a + b) / 2 - 0.04, (a + b) / 2 + 0.04, 0.5, hv0 - 0.5, 0.9, 0.94);
      const [mn, mx] = this.aabb(a, b, 0, 4, 0, 0.9);
      this.kit.collider(mn, mx, "jamb");
    }
    // floor stripes across the threshold
    if (h.v0 === 0) {
      const [mn, mx] = this.aabb(h.u0 - 1.0, h.u1 + 1.0, 0, 0.02, P1, P1 + 1.4);
      this.B.boxMM("hgHazard", 0xffffff, mn, mx, { texel: 0.5 });
    }
  }
}

// ---------------------------------------------------------------------------
// Ceiling: backing, coffered rib grid, panels, light channels, flood fixtures
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
  const chanOff = w / 2 + 0.5;
  for (const x of RIB_X) {
    B.boxMM("paintedMetal", PALETTE.impDark, [x - w / 2, yB - ribD + 0.16, HALL.z0 + P1], [x + w / 2, yB, HALL.z1 - P1], { faces: ALL & ~PY, texel: 0.5 });
    // light channels either side: shallow trough + emissive strip
    for (const s of [-1, 1]) {
      const cx = x + s * chanOff;
      B.boxMM("paintedMetal", PALETTE.impBlack, [cx - 0.3, yB - 0.18, HALL.z0 + 1], [cx + 0.3, yB, HALL.z1 - 1], { faces: ALL & ~PY });
      B.boxMM("emitCool", 0xffffff, [cx - 0.16, yB - 0.24, HALL.z0 + 1.2], [cx + 0.16, yB - 0.18, HALL.z1 - 1.2]);
    }
  }
  // panels in the cells between ribs
  const xEdges = [HALL.x0 + P1, ...RIB_X.flatMap((x) => [x - w / 2, x + w / 2]), HALL.x1 - P1];
  const zEdges = [HALL.z0 + P1, ...RIB_Z.flatMap((z) => [z - w / 2, z + w / 2]), HALL.z1 - P1];
  const rand = rng(ctx.seed ^ 0x5eed);
  const chan = RIB_X.flatMap((x) => [x - chanOff, x + chanOff]);
  for (let i = 0; i < xEdges.length - 1; i += 2) {
    const x0 = xEdges[i], x1 = xEdges[i + 1];
    for (let j = 0; j < zEdges.length - 1; j += 2) {
      const z0 = zEdges[j], z1 = zEdges[j + 1];
      const nx = Math.max(1, Math.round((x1 - x0) / 5)), nz = Math.max(1, Math.round((z1 - z0) / 5));
      const px = (x1 - x0) / nx, pz = (z1 - z0) / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          let ax0 = x0 + a * px + 0.1, ax1 = x0 + (a + 1) * px - 0.1;
          const az0 = z0 + b * pz + 0.1, az1 = z0 + (b + 1) * pz - 0.1;
          for (const cx of chan) {
            if (ax0 < cx + 0.4 && ax1 > cx - 0.4) {
              if (cx - ax0 < ax1 - cx) ax0 = cx + 0.4;
              else ax1 = cx - 0.4;
            }
          }
          if (ax1 - ax0 < 0.5) continue;
          const r = rand();
          const col = r < 0.72 ? PALETTE.impGrey : r < 0.9 ? PALETTE.impMid : PALETTE.impDark;
          B.boxMM("impPanel", col, [ax0, yB - 0.12, az0], [ax1, yB, az1], { faces: ALL & ~PY, fit: true });
        }
      }
    }
  }
  // flood fixtures hanging from the transverse ribs
  for (const z of RIB_Z) {
    for (const x of [-30, 30, -58, 58]) {
      B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.2, yB - ribD - 0.7, z - 0.2], [x + 0.2, yB - ribD, z + 0.2], { texel: 0.5 });
      B.boxMM("paintedMetal", PALETTE.impDark, [x - 1.5, yB - ribD - 1.6, z - 1.0], [x + 1.5, yB - ribD - 0.7, z + 1.0], { texel: 0.5 });
      B.boxMM("emitWhite", 0xffffff, [x - 1.3, yB - ribD - 1.64, z - 0.8], [x + 1.3, yB - ribD - 1.58, z + 0.8]);
    }
  }
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
}

// ---------------------------------------------------------------------------
// Balcony for the control-tower hatch (y -60): grate plate into the wall slot, rails on the three open
// sides, under-plate light strip, knee braces to the wall, and a small standing console. Reached only
// through the hatch (no stair).
// ---------------------------------------------------------------------------
function buildBalcony(ctx, B) {
  const { kit, PALETTE } = ctx;
  const { x0, x1, z0, y } = BALCONY;
  const zWall = HALL.z1 - WALL_T; // backing front
  const T = 0.3;
  B.boxMM("grate", 0xffffff, [x0, y - T, z0], [x1, y, zWall], { texel: 0.8 });
  // edge trim (front + sides), a hair proud of the plate all round
  B.boxMM("paintedMetal", PALETTE.impDark, [x0 - 0.14, y - T - 0.06, z0 - 0.14], [x1 + 0.14, y + 0.02, z0], { texel: 0.5 });
  for (const [a, b] of [[x0 - 0.14, x0], [x1, x1 + 0.14]]) B.boxMM("paintedMetal", PALETTE.impDark, [a, y - T - 0.06, z0], [b, y + 0.02, zWall], { texel: 0.5 });
  B.boxMM("emitWhite", 0xffffff, [x0 + 0.4, y - T - 0.1, z0 - 0.1], [x1 - 0.4, y - T - 0.04, z0 - 0.02]);
  // knee braces: arm under the plate, diagonal strut to a wall plate 3.3 m down
  for (const x of [-11, -5.5, 0, 5.5, 11]) {
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.15, y - T - 0.45, z0 + 0.2], [x + 0.15, y - T - 0.06, zWall], { texel: 0.5 });
    B.tube("metal", HG.gunmetal, [x, y - T - 0.5, z0 + 0.45], [x, y - 3.5, zWall - 0.1], 0.11, 10);
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.4, y - 3.9, zWall - 0.2], [x + 0.4, y - 3.2, zWall], { texel: 0.5 });
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
  // the balcony plate meets the wall: keep the band/panels out of its slot
  aft.extraCuts = [{ u0: aft.u(BALCONY.x0 - 0.3), u1: aft.u(BALCONY.x1 + 0.3), v0: BALCONY.y - FLOOR - 0.5, v1: BALCONY.y - FLOOR + 0.5 }];
  // side walls: trays break for the rack stairs and ladders; panels behind the racks stay plain
  for (const w of [byName.starboard, byName.port]) {
    const [s0, s1] = STAIRS[w.name];
    w.trayCuts.push({ u0: w.u(s0) - 0.5, u1: w.u(s1) + 0.5, v0: 0, v1: H });
    for (const z of LADDER_Z) w.trayCuts.push({ u0: w.u(z) - 0.8, u1: w.u(z) + 0.8, v0: 0, v1: H });
    w.plainRects.push({ u0: w.u(RACK.zoneZ0) - 1, u1: w.u(RACK.zoneZ1) + 1, v0: 4, v1: RACK.tiers[1].y + 8 - FLOOR });
  }

  for (const w of walls) {
    w.backing();
    w.panels();
    w.ribsBuild();
    w.floods();
    w.trays();
    for (const h of w.holes) if (h.door) w.doorSurround(h);
  }

  // window bezel + sign + hood
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
    // bezel lip + bolt row + blue status lights under the sill
    W.box("metal", HG.gunmetal, u0 - 0.1, u1 + 0.1, v1 + 0.02, v1 + 0.12, D, D + 0.05);
    for (let u = u0 - 0.3; u <= u1 + 0.3; u += 1.0) W.box("metal", HG.steel, u - 0.06, u + 0.06, v1 + 0.3, v1 + 0.42, D, D + 0.05);
    for (let u = gap1 + 0.6; u < u1; u += 2.0) W.box("emitBlue", 0xffffff, u - 0.12, u + 0.12, v0 - 0.4, v0 - 0.3, D, D + 0.03);
    for (let u = u0 + 0.6; u < gap0 - 0.3; u += 2.0) W.box("emitBlue", 0xffffff, u - 0.12, u + 0.12, v0 - 0.4, v0 - 0.3, D, D + 0.03);
    // sign "HANGAR CONTROL" on a dark plate above the bezel, lit by a hood
    const sv = v1 + t + 1.2;
    W.box("paintedMetal", PALETTE.impBlack, u0 - 0.4, u1 + 0.4, sv - 0.75, sv + 0.75, P1, P1 + 0.015, { texel: 0.5 });
    label(kit, "hgSign", "HANGAR CONTROL", W.pos((u0 + u1) / 2, sv, P1 + 0.03), W.N.toArray(), 10);
    W.box("paintedMetal", PALETTE.impDark, u0 - 1, u1 + 1, sv + 1.2, sv + 1.5, 0.02, 1.2, { texel: 0.5 });
    W.box("emitWhite", 0xffffff, u0 - 0.6, u1 + 0.6, sv + 1.17, sv + 1.21, 0.6, 1.1);
  }

  // fire stations: two per side wall, two on the aft wall, one on the bow wall (between ribs)
  fireStation(byName.starboard, byName.starboard.u(78));
  fireStation(byName.starboard, byName.starboard.u(-56));
  fireStation(byName.port, byName.port.u(78));
  fireStation(byName.port, byName.port.u(-56));
  fireStation(byName.aft, byName.aft.u(12));
  fireStation(byName.aft, byName.aft.u(-30));
  fireStation(byName.bow, byName.bow.u(12));

  buildBalcony(ctx, B);
  buildCeiling(ctx, B);
  B.flush();
  return walls;
}
