// d4-hangar walls + ceiling: giant Imperial panelling (4 m light-grey panels with black recessed seams,
// one darker row per 12 m bay, recessed structural channels with steel lips every 12 m, frame ribs every
// 20 m hugging wall + ceiling with housed red beacons at y -45 and y -20), a service gallery ring at
// y -60 (bow/aft walls and the side walls outside the rack zone), a maintenance catwalk ring at 36 m
// with rails and caged ladders, housed wall floods, cable trays at 2.6 m with detailed junction boxes,
// human-scale dressing along the wall bases (consoles, lockers, hose reels, maintenance hatches, a crew
// hatch + console/locker group beside every bay door), giant wall stencils, door holes cut exactly with
// doorOpening() (bay doors: plain steel surround; blast doors: a 7 m portal), the control-tower window
// bezel + sign + tower base, the balcony with lit rail, fascia and soffit, fire stations, and a ceiling
// of faintly self-lit cells, long dark light channels with diffuser segments, louvred fixtures and the
// four flood fixtures that the light plan's spot descriptors shine from.
import * as THREE from "three";
import { Batcher, PX, NX, PY, NY, PZ, NZ, ALL, sharedBox } from "./batch.js";
import { doorOpening, FRAME_W } from "../../systems/doors/helper.js";
import { rng } from "../../kit.js";
import { FLOOR, CEIL, WALL_T, HALL, DOORS, DOOR_LABELS, WINDOW, BALCONY, RACK, STAIRS, LADDER_Z, CATWALK, GALLERY, GALLERY_SPANS, FLOODS, RIB_Z, RIB_X, RIB_W, RIB_D, PANEL_W, SEAM, HG, EM } from "./layout.js";
import { LABELS } from "./materials.js";
import { label, railRun, ladder, housedLamp, redBeacon, hazardBlocks, shadowGrad, litChannel } from "./util.js";

const H = CEIL - FLOOR; // 60
const P0 = WALL_T; // panel back (on the black backing)
const P1 = WALL_T + 0.12; // panel front
const CAT_T = 0.12; // catwalk / gallery plate thickness
const CAT_V = CATWALK.y - FLOOR; // plate top, wall-local v (36.54)
const GAL_V = GALLERY.y - FLOOR; // gallery plate top, wall-local v (12)
const END_LADDER_X = { bow: 50, aft: -50 }; // deck -> catwalk ladders on the end walls
const BEACON_V = [27, 52]; // housed red beacons on every rib (y -45 and y -20)
const CORNICE_V = 58.6; // cornice beam from here to the ceiling (1.4 m)
const TOWER_HW = 3.6; // buttress tower half width (flanking both blast portals)
const TOWER_D = 4.0; // tower depth: the balcony's fascia girder runs 14 cm proud of the tower fronts (the towers carry the balcony ends)
const DOWN = [0, -1, 0];

// rows of the 60 m wall: [v0, v1, type]
const ROWS = [];
for (let k = 0; k < 5; k++) {
  const b = k * 12;
  if (k === 0) ROWS.push([0, 0.9, "kick"], [0.9, 6.2, "panelLow"], [6.2, 11.6, "panel"]);
  else if (k < 4) ROWS.push([b + 0.4, b + 6.0, "panel"], [b + 6.0, b + 11.6, "panel"]);
  else ROWS.push([b + 0.4, b + 6.0, "panel"], [b + 6.0, CORNICE_V, "panel"]);
  if (k < 4) ROWS.push([b + 11.6, b + 12.4, "band"]);
  else ROWS.push([CORNICE_V, H, "cornice"]);
}
// the one darker panel row (10 % of the field): the row above the first band, all four walls
const DARK_ROW = [12.4, 18.0];
// baked light falloff: the hall is lit from the deck, so the panel tone darkens with height - the base
// storey lifted to a light grey (0.65 albedo: it is the storey the deck fixtures reach, and the one the
// rib shadows fall on), the second to the plain panel grey, then two stops down to the cornice. The
// albedo steps alone measured 25 -> 21 sRGB base -> 42 m in the aft-wall frame (the panels' 4 %
// dielectric specular of the environment is a floor the tint cannot get under), so wallFalloff() lays a
// black gradient decal over the upper wall on top of them: together the upper third sits at a quarter
// of the base's value on a half-size frame (36 -> 9), and the 3 m rib flanks have a lit panel to be dark
// against - at a 25 base the whole wall sat within a few values of the black flank and nothing read
const HEIGHT_TINT = [
  [48, 0.3],
  [36, 0.38],
  [24, 0.55],
  [12, 1.1],
  [0, 2.4],
];
const FALLOFF_V0 = 18; // the baked falloff decal starts fading in here and is at full strength at the cornice
const _tints = new Map();
function tinted(color, k) {
  const key = color.getHex() * 1000 + Math.round(k * 100);
  let c = _tints.get(key);
  if (!c) {
    c = color.clone().multiplyScalar(k);
    _tints.set(key, c);
  }
  return c;
}
function heightTint(color, v0) {
  for (const [v, k] of HEIGHT_TINT) if (v0 >= v) return tinted(color, k);
  return color;
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
/** wall-local v of a bay door's giant stencil centre: 4 m letters standing 0.6 m over the header's lamps */
function bayStencilV(h) {
  return h.v1 + FRAME_W + 1.1 + 1.4 + 0.6 + 2.0;
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
    this.frontBit = plane === "x" ? (inward > 0 ? PX : NX) : inward > 0 ? PZ : NZ;
    this.faces = ALL & ~this.backBit;
    this.facesHigh = this.frontBit | NY; // panels above the base storey: only the front and the underside can be seen from the deck
    this.N = plane === "x" ? new THREE.Vector3(inward, 0, 0) : new THREE.Vector3(0, 0, inward);
    this.uDir = plane === "x" ? [0, 0, 1] : [1, 0, 0]; // world direction of local +u
    // the hall's light is imagined as one big source over its centre: everything standing off a wall
    // casts its baked shadow away from the centre (u of the hall centre in this wall's coordinates)
    this.uCentre = plane === "x" ? this.u(50) : this.u(0);
    this.holes = []; // exact holes {u0,u1,v0,v1,door?,mu,mv}
    this.extraCuts = []; // panels/bands keep out of these (balcony slot, tower base, hatches)
    this.trayCuts = []; // cable trays keep out of these (stairs, ladders, hatches)
    this.baseCuts = []; // wall-base dressing keeps out of these (fire stations, rack columns)
    this.dressCuts = []; // footprints of the dressing that was placed (the cable trench breaks round them)
    this.plainRects = []; // panels here get no greebles (racks / platforms hang in front)
    this.levels = [[FLOOR, CEIL]];
    this.gallery = (GALLERY_SPANS[name] || []).map(([a, b]) => [this.u(a), this.u(b)]); // u spans of the gallery
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
    // a box whose back sits in or on the panel skin has no visible back face (it is against the backing
    // or inside the panel) unless it stands in a hole; an explicit face mask always wins
    if (opts.faces === undefined && d0 <= P1 + 1e-6 && !this.holes.some((h) => u0 < h.u1 && u1 > h.u0 && v0 < h.v1 && v1 > h.v0)) opts = { ...opts, faces: this.faces };
    this.B.boxMM(mat, color, mn, mx, opts);
  }
  /** local u for a world across-axis coordinate */
  u(worldAcross) {
    return worldAcross - this.uw0;
  }
  /**
   * Baked shadow on the panel face: a gradient `len` metres long fading along the wall from the edge
   * (u | v) of an occluder. dir "u+" / "u-" = sideways from a rib flank, "down" = under a ledge. Spans
   * uSpan (across a ledge) or vSpan (down a rib flank); clipped to the wall; skipped when nothing is left.
   */
  grad(dir, u, v, len, span, tone, alpha = 1, d = P1 + 0.02) {
    let cu, cv, worldDir, sp;
    if (dir === "down") {
      cu = u;
      cv = v - len / 2;
      worldDir = DOWN;
      sp = span;
      if (cv - len / 2 < 0) return;
    } else if (dir === "up") {
      cu = u;
      cv = v + len / 2;
      worldDir = [0, 1, 0];
      sp = span;
    } else {
      const s = dir === "u+" ? 1 : -1;
      const u0 = Math.max(0.05, u + (s > 0 ? 0 : -len)), u1 = Math.min(this.L - 0.05, u + (s > 0 ? len : 0));
      if (u1 - u0 < 0.2) return;
      cu = (u0 + u1) / 2;
      len = u1 - u0;
      cv = v;
      worldDir = [this.uDir[0] * s, 0, this.uDir[2] * s];
      sp = span;
    }
    shadowGrad(this.kit, this.pos(cu, cv, d), this.N.toArray(), worldDir, len, sp, { tone: tone || HG.shadow, alpha });
  }
  /**
   * Baked light falloff over the upper wall: one black gradient decal per wall from FALLOFF_V0 (clear)
   * to the cornice (60 % black), 2 cm in front of the panels and behind everything proud of them (ribs,
   * bands, walkways, fixtures keep their own values). With the tint steps this puts the upper third at
   * about a third of the base storey's value in the frame, which is what reads as "lit from the deck".
   */
  wallFalloff() {
    const len = CORNICE_V - FALLOFF_V0;
    // GRAD is opaque at its u = 0 end: put that end at the cornice, fading downward, at 60 % alpha
    shadowGrad(this.kit, this.pos(this.L / 2, FALLOFF_V0 + len / 2, P1 + 0.02), this.N.toArray(), DOWN, len, this.L - 0.1, { alpha: 0.6 });
  }
  /** +1 / -1: the side of local u that faces away from the hall centre (where the baked shadows fall) */
  shadeSide(u) {
    return u >= this.uCentre ? 1 : -1;
  }
  /** is local u inside one of this wall's gallery spans */
  inGallery(u) {
    return this.gallery.some(([a, b]) => u > a && u < b);
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
    const allCuts = [...this.cuts(), ...this.ribRects(), ...this.extraCuts];
    const nCols = Math.round(this.L / PANEL_W);
    for (const [v0, v1, type] of ROWS) {
      // only the cuts that reach this row (a third of them per row: the rest is tested 2000 times for nothing)
      const cuts = allCuts.filter((c) => c.v1 > v0 && c.v0 < v1);
      if (type === "band" || type === "kick" || type === "cornice") {
        for (const r of subtract({ u0: 0, u1: this.L, v0, v1 }, cuts)) {
          if (type === "band") {
            // structural channel in dark steel (a clearly darker value than the panels, not the same
            // grey): gunmetal body 4 cm proud of the panels, light steel lips top and bottom standing
            // further proud, dark bolt blocks on the two lower bands (the ones 36 m and 48 m up are too
            // far for a 20 cm block to read); a baked shadow band 0.9 m deep under the channel
            this.box("paintedMetal", HG.gunmetal, r.u0, r.u1, v0 + 0.1, v1 - 0.1, P0, P1 + 0.04, { faces: this.frontBit, texel: 0.5 });
            this.box("metal", HG.steel, r.u0, r.u1, v0, v0 + 0.12, P0, P1 + 0.14);
            this.box("metal", HG.steel, r.u0, r.u1, v1 - 0.12, v1, P0, P1 + 0.14);
            if (v0 < 30) for (let u = r.u0 + 2; u < r.u1 - 1; u += 4) this.box("metal", this.P.impBlack, u - 0.1, u + 0.1, v0 + 0.24, v1 - 0.24, P1 + 0.04, P1 + 0.12);
            this.grad("down", (r.u0 + r.u1) / 2, v0, 0.9, r.u1 - r.u0);
            continue;
          }
          if (type === "cornice") {
            // where the wall meets the ceiling: a 1.4 m black cornice beam 1.0 m deep with a steel lip
            // along its bottom edge and a baked shadow under it (the top of every wall reads as a dark
            // rib run, not as one more panel row fading into the roof)
            this.box("paintedMetal", this.P.impBlack, r.u0, r.u1, r.v0, r.v1, 0.02, 1.0, { faces: ALL & ~this.backBit & ~PY, texel: 0.5 });
            this.box("paintedMetal", this.P.impDark, r.u0, r.u1, r.v0 + 0.3, r.v1 - 0.3, 1.0, 1.06, { faces: this.frontBit, texel: 0.5 });
            this.box("metal", HG.gunmetal, r.u0, r.u1, r.v0, r.v0 + 0.1, 0.02, 1.08);
            this.grad("down", (r.u0 + r.u1) / 2, r.v0, 1.1, r.u1 - r.u0);
            continue;
          }
          // wall / deck junction: the dark plinth, a light steel kick plate along its foot (the line
          // where the wall meets the deck, 70 m away), and the waist-height light strip above it as a
          // housed, segmented channel (4 m lenses on the channel level, mid-grey joints, end caps)
          this.box("paintedMetal", this.P.impDark, r.u0, r.u1, r.v0, r.v1, P0, 0.34, { texel: 0.5 });
          this.box("metal", HG.steel, r.u0, r.u1, 0.06, 0.4, 0.34, 0.37, { faces: this.frontBit | PY });
          if (r.u1 - r.u0 > 1.2) litChannel(this.B, this.P, this.pos(r.u0 + 0.25, 1.05, P1 + 0.12), this.pos(r.u1 - 0.25, 1.05, P1 + 0.12), this.N.toArray(), { w: 0.2, depth: 0.12, lensW: 0.1, level: EM.channel, seg: 4, gap: 0.2, cap: 0.3, off: 0.05, seed: Math.round(r.u0) });
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
    const color = heightTint(dark ? this.P.impMid : this.P.impGrey, r.v0);
    const faces = r.v0 >= 12 ? this.facesHigh : this.faces;
    let style = "plain";
    const plain = this.plainRects.some((p) => intersects(r, p));
    if (full && w > 1.5 && h > 2) {
      const s = this.rand();
      if (plain) style = s < 0.3 ? "seam" : "plain";
      else if (dark) style = s < 0.24 ? "vent" : s < 0.5 ? "seam" : "plain"; // the dark row is the service row: lit vents
      else if (detailed) {
        // hatches and greebles only where a person can reach them; higher up they read as black
        // rectangles from the deck, so the upper storeys get lit vents instead
        if (s < 0.04) style = "vent";
        else if (s < 0.08) style = r.v0 < 12 ? "greeble" : "vent";
        else if (s < 0.23) style = "seam";
        else if (s < 0.27) style = r.v0 < 12 ? "hatch" : "plain";
      } else if (r.v0 < 36 && s < 0.14) style = "seam"; // upper storeys: a few grooves; above 36 m plain sheets (nobody sees bolts there)
    }
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    if (style === "vent" || style === "hatch") {
      // a real opening: the panel becomes a frame round a recess that goes back to the backing
      const gw = style === "vent" ? Math.min(w - 1.0, 2.6) : Math.min(w - 1.2, 2.2), gh = style === "vent" ? h - 1.2 : Math.min(h - 1.0, 3.0);
      const ou0 = cu - gw / 2, ou1 = cu + gw / 2, ov0 = style === "vent" ? cv - gh / 2 : v0 + 0.5, ov1 = ov0 + gh;
      this.box("impPanel", color, u0, ou0, v0, v1, P0, P1, { faces, fit: true });
      this.box("impPanel", color, ou1, u1, v0, v1, P0, P1, { faces, fit: true });
      this.box("impPanel", color, ou0, ou1, v0, ov0, P0, P1, { faces, fit: true });
      this.box("impPanel", color, ou0, ou1, ov1, v1, P0, P1, { faces, fit: true });
      // steel frame lip proud of the panel
      this.box("metal", HG.steel, ou0 - 0.1, ou1 + 0.1, ov0 - 0.1, ov0, P1 - 0.02, P1 + 0.08);
      this.box("metal", HG.steel, ou0 - 0.1, ou1 + 0.1, ov1, ov1 + 0.1, P1 - 0.02, P1 + 0.08);
      this.box("metal", HG.steel, ou0 - 0.1, ou0, ov0, ov1, P1 - 0.02, P1 + 0.08);
      this.box("metal", HG.steel, ou1, ou1 + 0.1, ov0, ov1, P1 - 0.02, P1 + 0.08);
      if (style === "vent") {
        // lit from inside: an amber glow plate at the back of the recess behind mid-grey louvre slats,
        // so from the deck the vent reads as a warm slatted opening, never a flat black decal
        this.box("hgEmit", EM.amberGlow, ou0, ou1, ov0, ov1, P0 - 0.01, P0 + 0.01, { faces: this.frontBit });
        const n = Math.floor(gh / 0.34);
        for (let i = 0; i < n; i++) {
          const y = ov0 + 0.17 + i * 0.34;
          this.box("paintedMetal", this.P.impMid, ou0 + 0.05, ou1 - 0.05, y - 0.085, y + 0.085, P0 + 0.02, P0 + 0.11, { texel: 0.5 });
        }
      } else {
        // recessed service hatch: dark leaf set 6 cm into the opening, a blue-lit seam across the top
        // of the recess, handle, housed amber lamp on the lip
        this.box("paintedMetal", this.P.impBlack, ou0, ou1, ov0, ov1, P0 - 0.01, P0 + 0.01, { faces: this.frontBit });
        this.box("paintedMetal", this.P.impDark, ou0 + 0.05, ou1 - 0.05, ov0 + 0.05, ov1 - 0.2, P0 + 0.01, P0 + 0.06, { texel: 0.5 });
        this.box("hgEmit", EM.blueGlow, ou0 + 0.1, ou1 - 0.1, ov1 - 0.16, ov1 - 0.08, P0 + 0.02, P0 + 0.03);
        this.box("metal", HG.steel, cu + 0.45, cu + 0.55, ov0 + 0.9, ov0 + 1.3, P0 + 0.06, P0 + 0.1);
        housedLamp(this.B, "emitAmber", this.pos(cu, ov1 + 0.3, P1 + 0.08), this.N.toArray(), [0.4, 0.12, 0.16], { inset: 0.04 });
      }
      return;
    }
    this.box("impPanel", color, u0, u1, v0, v1, P0, P1, { faces, fit: true });
    switch (style) {
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
        this.box("paintedMetal", this.P.impBlack, u0 + 0.25, u1 - 0.25, gy - 0.035, gy + 0.035, P1, P1 + 0.02, { faces: this.frontBit });
        if (r.v0 < 12) {
          for (const [su, sv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const bu = cu + su * (w / 2 - 0.35), bv = cv + sv * (h / 2 - 0.35);
            this.box("metal", HG.steel, bu - 0.06, bu + 0.06, bv - 0.06, bv + 0.06, P1, P1 + 0.04);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  // ---- frame ribs (wall part). Interrupted by doors (restart above the header), by the gallery and by
  // the catwalk (2.8 m openings with a lintel where the walkway passes through the rib). Housed red
  // beacons on the rib front at y -45 and y -20.
  ribsBuild() {
    const D = P0 + RIB_D;
    const openings = [[CAT_V - CAT_T - 0.02, CAT_V + CATWALK.openingH]];
    for (const u of this.ribs) {
      let vStart = 0;
      for (const h of this.holes) if (h.door && h.u1 + 2.5 > u - RIB_W / 2 && h.u0 - 2.5 < u + RIB_W / 2 && h.v0 < 1) vStart = Math.max(vStart, h.v1 + 3.6);
      const ops = this.inGallery(u) ? [[GAL_V - CAT_T - 0.02, GAL_V + GALLERY.openingH], ...openings] : openings;
      const segs = [];
      let a = vStart;
      for (const [o0, o1] of ops) {
        if (o0 > a) segs.push([a, o0]);
        a = Math.max(a, o1);
      }
      segs.push([a, H]);
      const shade = this.shadeSide(u);
      for (const [s0, s1] of segs) {
        if (s1 - s0 < 0.5) continue;
        this.box("paintedMetal", this.P.impDark, u - RIB_W / 2, u + RIB_W / 2, s0, s1, 0.02, D, { texel: 0.5 });
        this.box("impPanel", this.P.impMid, u - RIB_W / 2 + 0.2, u + RIB_W / 2 - 0.2, s0 + 0.4, s1 - 0.4, D, D + 0.06, { texel: 0.5 });
        // side flanges (lighter) so the rib reads as a profile, not a slab
        for (const s of [-1, 1]) this.box("paintedMetal", this.P.impMid, u + s * (RIB_W / 2 + 0.12) - 0.12, u + s * (RIB_W / 2 + 0.12) + 0.12, s0, s1, P1, D - 0.3, { texel: 0.5 });
        // baked shadow: a 3 m black gradient on the panels along the rib's shaded flank (10 px on a
        // half-size aft-wall frame: a dark flank a squint reads as shadow) and a 1 m occlusion flank on
        // the lit side, so every rib stands as a dark-edged pilaster
        this.grad(shade > 0 ? "u+" : "u-", u + shade * (RIB_W / 2 + 0.24), (s0 + s1) / 2, 3.0, s1 - s0);
        this.grad(shade > 0 ? "u-" : "u+", u - shade * (RIB_W / 2 + 0.24), (s0 + s1) / 2, 1.0, s1 - s0, null, 0.6);
      }
      // opening lintels + a housed lamp under each lighting the walkway
      for (const [, o1] of ops) {
        if (o1 < vStart) continue;
        this.box("paintedMetal", this.P.impMid, u - RIB_W / 2 - 0.3, u + RIB_W / 2 + 0.3, o1, o1 + 0.4, 0.02, D + 0.1, { texel: 0.5 });
        housedLamp(this.B, "emitWhite", this.pos(u, o1 - 0.001, P1 + 0.6), [0, -1, 0], [0.5, 0.14, 0.3], { inset: 0.04 });
      }
      // housed red beacons on the rib front (pulsing), a steel ledge under each
      for (const v of BEACON_V) {
        if (v < vStart + 1) continue;
        this.box("metal", HG.steel, u - 0.5, u + 0.5, v - 0.42, v - 0.36, D, D + 0.4);
        redBeacon(this.B, this.pos(u, v, D + 0.24), this.N.toArray(), 0.7);
      }
      if (vStart === 0) {
        // foot block with a steel toe strip (no hazard paint: that is reserved for the doors and the aperture lip)
        this.box("paintedMetal", this.P.impDark, u - RIB_W / 2 - 0.35, u + RIB_W / 2 + 0.35, 0, 1.6, 0.02, D + 0.3, { texel: 0.5 });
        this.box("metal", HG.steel, u - RIB_W / 2 - 0.35, u + RIB_W / 2 + 0.35, 0.05, 0.15, D + 0.3, D + 0.32);
        const [mn, mx] = this.aabb(u - RIB_W / 2 - 0.35, u + RIB_W / 2 + 0.35, 0, 4, 0, D + 0.3);
        this.kit.collider(mn, mx, "rib");
      } else {
        this.box("paintedMetal", this.P.impDark, u - RIB_W / 2 - 0.3, u + RIB_W / 2 + 0.3, vStart - 0.3, vStart + 0.5, 0.02, D + 0.2, { texel: 0.5 });
      }
    }
  }

  // ---- the slot row: recessed grilles 4.4 m under the cornice, one every 8 m between the wall floods
  // (2.4 x 1.2 m: 15 x 7 px on a half-size aft-wall frame). The recess goes back to the backing behind
  // three mid-grey louvre slats with a steel lip round it; 55 % glow dim blue-white behind the slats,
  // 15 % amber, the rest are dark slots. grilleCuts() registers the recesses before the panels are built.
  grilleV() {
    return [CORNICE_V - 3.6, CORNICE_V - 2.4];
  }
  grillePositions() {
    // holes and the registered features (light columns, shutter mass ...) push a grille away; the
    // grilles' own recesses (grilleCuts) do not
    const cuts = [...this.cuts(), ...this.extraCuts.filter((c) => !c.grille)];
    const [v0, v1] = this.grilleV();
    const out = [];
    for (let u = 8; u < this.L - 2; u += 8) {
      if (this.ribs.some((r) => Math.abs(r - u) < 2.4)) continue;
      if (cuts.some((c) => u + 1.4 > c.u0 && u - 1.4 < c.u1 && v1 > c.v0 && v0 < c.v1)) continue;
      out.push(u);
    }
    return out;
  }
  grilleCuts() {
    const [v0, v1] = this.grilleV();
    for (const u of this.grillePositions()) this.extraCuts.push({ u0: u - 1.2, u1: u + 1.2, v0, v1, grille: true });
  }
  grilles() {
    const [v0, v1] = this.grilleV();
    let k = this.name.length;
    for (const u of this.grillePositions()) {
      k = (k * 1103515245 + 12345) >>> 0;
      const pick = (k >>> 8) % 100;
      const glow = pick < 55 ? EM.blueGrille : pick < 70 ? EM.amberGrille : null;
      // glow plate on the backing, three slats across the recess, steel lips top and bottom, dark cheeks
      if (glow) this.box("hgEmit", glow, u - 1.15, u + 1.15, v0 + 0.05, v1 - 0.05, P0 - 0.01, P0 + 0.01, { faces: this.frontBit });
      for (let i = 0; i < 3; i++) {
        const y = v0 + 0.3 + i * 0.3;
        this.box("paintedMetal", this.P.impMid, u - 1.15, u + 1.15, y - 0.06, y + 0.06, P0 + 0.03, P0 + 0.1, { faces: this.frontBit | PY | NY, texel: 0.5 });
      }
      this.box("metal", HG.steel, u - 1.3, u + 1.3, v0 - 0.1, v0, P0, P1 + 0.1, { faces: ALL & ~this.backBit & ~NY });
      this.box("metal", HG.steel, u - 1.3, u + 1.3, v1, v1 + 0.1, P0, P1 + 0.1, { faces: ALL & ~this.backBit & ~PY });
      for (const s of [-1, 1]) this.box("paintedMetal", this.P.impDark, u + s * 1.25 - 0.05, u + s * 1.25 + 0.05, v0, v1, P0, P1 + 0.06, { faces: this.frontBit | (s > 0 ? this.uMinusBit() : this.uPlusBit()), texel: 0.5 });
    }
  }
  /** face bits of a local box toward +u / -u */
  uPlusBit() {
    return this.plane === "x" ? PZ : PX;
  }
  uMinusBit() {
    return this.plane === "x" ? NZ : NX;
  }

  // ---- wall floods at y -20: a louvred flood every 16 m, a smaller housed lamp between, skipping ribs and holes
  floods() {
    const cuts = [...this.cuts(), ...this.extraCuts];
    const v = H - 8;
    let k = 0;
    for (let u = 4; u < this.L - 1; u += 8, k++) {
      if (this.ribs.some((r) => Math.abs(r - u) < 2.2)) continue;
      if (cuts.some((c) => u + 1.2 > c.u0 && u - 1.2 < c.u1 && v + 0.6 > c.v0 && v - 0.6 < c.v1)) continue;
      if (k % 2 === 0) this.flood(u, v);
      else {
        this.box("paintedMetal", this.P.impDark, u - 0.2, u + 0.2, v - 0.5, v + 0.1, P1, P1 + 0.3, { texel: 0.5 });
        housedLamp(this.B, "hgEmit", this.pos(u, v - 0.5, P1 + 0.3), [0, -1, 0], [0.9, 0.16, 0.3], { inset: 0.04, lampColor: EM.lens });
      }
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
    this.B.geo("hgEmit", EM.lens, sharedBox(1.7, 0.42, 0.03), c.clone().addScaledVector(fr, -0.1).toArray(), q);
    for (const k of [-0.15, 0, 0.15]) this.B.geo("paintedMetal", this.P.impMid, sharedBox(1.8, 0.04, 0.12), c.clone().addScaledVector(up, k).addScaledVector(fr, 0.2).toArray(), q);
    this.B.tube("metal", HG.gunmetal, this.pos(u, v, 0.95), c.clone().addScaledVector(fr, -0.55).toArray(), 0.09, 8);
  }

  // ---- cable trays + pipes at v 2.6 .. 3.5 along hole-free spans (they run into the ribs), with a
  // junction box every 16 m (louvres, cable drop, indicator lamps, stencil)
  trays() {
    const spans = subtract({ u0: 0.6, u1: this.L - 0.6, v0: 2.6, v1: 3.5 }, [...this.cuts(), ...this.trayCuts]);
    const N = this.N.toArray();
    for (const r of spans) {
      if (r.v1 - r.v0 < 0.8) continue;
      this.box("paintedMetal", this.P.impDark, r.u0, r.u1, 2.6, 2.72, P1, P1 + 0.5, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, r.u0, r.u1, 2.6, 2.9, P1 + 0.46, P1 + 0.5, { texel: 0.5 });
      this.B.tube("metal", HG.steel, this.pos(r.u0, 3.12, P1 + 0.28), this.pos(r.u1, 3.12, P1 + 0.28), 0.11, 10);
      this.B.tube("metal", HG.gunmetal, this.pos(r.u0, 3.38, P1 + 0.24), this.pos(r.u1, 3.38, P1 + 0.24), 0.07, 8);
      for (let u = r.u0 + 2; u < r.u1 - 1; u += 4) this.box("metal", HG.gunmetal, u - 0.1, u + 0.1, 3.0, 3.5, P1 + 0.1, P1 + 0.4);
      // a conduit run above the tray the length of the span, dropping into every junction cabinet
      this.B.tube("metal", HG.gunmetal, this.pos(r.u0, 5.7, P1 + 0.16), this.pos(r.u1, 5.7, P1 + 0.16), 0.05, 8);
      for (let u = r.u0 + 6; u < r.u1 - 2; u += 16) {
        if (this.ribs.some((rb) => Math.abs(rb - u) < 1.6)) continue;
        // junction cabinet (1.4 x 1.5 m): louvres, a 0.9 m lit status display and two 0.2 m housed
        // indicator lamps (a 5 px screen and 1 px lamps on a half-size frame from the bay-door camera
        // 20 m out - the old 0.36 m display was under a pixel there), a hooded lamp on the cabinet top
        // lighting its face, the conduit drop from above, cable drops into the tray, stencil
        this.box("paintedMetal", this.P.impDark, u - 0.7, u + 0.7, 3.7, 5.2, P1, P1 + 0.4, { texel: 0.5 });
        this.box("metal", HG.steel, u - 0.72, u + 0.72, 5.2, 5.26, P1, P1 + 0.42);
        for (let i = 0; i < 3; i++) this.box("metal", HG.gunmetal, u - 0.55, u + 0.55, 3.82 + i * 0.14, 3.86 + i * 0.14, P1 + 0.4, P1 + 0.44);
        this.box("paintedMetal", this.P.impBlack, u - 0.62, u + 0.62, 4.36, 5.06, P1 + 0.4, P1 + 0.42);
        this.box("screenImp1", 0xffffff, u - 0.58, u + 0.32, 4.42, 5.0, P1 + 0.42, P1 + 0.43, { fit: true });
        housedLamp(this.B, "emitGreen", this.pos(u + 0.47, 4.86, P1 + 0.42), N, [0.2, 0.06, 0.2], { inset: 0.03 });
        housedLamp(this.B, "emitRedImp", this.pos(u + 0.47, 4.56, P1 + 0.42), N, [0.2, 0.06, 0.2], { inset: 0.03 });
        // hood: a plate standing off the cabinet top with a housed lens under it, on the flood-lens level
        this.box("paintedMetal", this.P.impDark, u - 0.5, u + 0.5, 5.5, 5.56, P1 + 0.1, P1 + 0.75, { texel: 0.5 });
        this.box("paintedMetal", this.P.impDark, u - 0.06, u + 0.06, 5.26, 5.5, P1 + 0.1, P1 + 0.16, { texel: 0.5 });
        housedLamp(this.B, "hgEmit", this.pos(u, 5.499, P1 + 0.55), DOWN, [0.7, 0.1, 0.24], { inset: 0.03, lampColor: EM.lens });
        this.B.tube("metal", HG.gunmetal, this.pos(u, 5.7, P1 + 0.16), this.pos(u, 5.26, P1 + 0.16), 0.05, 8);
        this.B.tube("rubber", HG.rubber, this.pos(u + 0.3, 3.7, P1 + 0.2), this.pos(u + 0.4, 2.95, P1 + 0.3), 0.04, 8);
        this.B.tube("metal", HG.steel, this.pos(u - 0.3, 3.7, P1 + 0.18), this.pos(u - 0.3, 2.92, P1 + 0.18), 0.04, 8);
        label(this.kit, "hgDecal", "HIGH VOLTAGE", this.pos(u, 4.24, P1 + 0.405), N, 0.9, { color: HG.yellow });
      }
    }
  }

  // ---- door surrounds. Bay doors: plain steel surround (the leaves the doors system hangs carry the
  // hazard band). Blast doors: a 7 m portal (1.4 m columns, lintel with the name plate, threshold blocks).
  // Both get housed red lamps and lit jamb strips.
  doorSurround(h) {
    const kind = h.door.kind;
    if (kind !== "bay" && kind !== "blast") return;
    const m = FRAME_W; // reveal the doors system needs
    const N = this.N.toArray();
    const txt = DOOR_LABELS[h.door.id];
    const red = h.door.to === null;
    if (kind === "bay") {
      const bw = 0.6;
      const hv0 = h.v1 + m + 1.1, hv1 = hv0 + 1.4;
      this.box("paintedMetal", this.P.impDark, h.u0 - m - bw, h.u0 - m, 0, h.v1 + m + bw, P0, P0 + 0.3, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, h.u1 + m, h.u1 + m + bw, 0, h.v1 + m + bw, P0, P0 + 0.3, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, h.u0 - m, h.u1 + m, h.v1 + m, h.v1 + m + bw, P0, P0 + 0.3, { texel: 0.5 });
      this.box("metal", HG.steel, h.u0 - m - 0.08, h.u0 - m, 0, h.v1 + m + 0.08, P0 + 0.3, P0 + 0.36);
      this.box("metal", HG.steel, h.u1 + m, h.u1 + m + 0.08, 0, h.v1 + m + 0.08, P0 + 0.3, P0 + 0.36);
      this.box("metal", HG.steel, h.u0 - m, h.u1 + m, h.v1 + m, h.v1 + m + 0.08, P0 + 0.3, P0 + 0.36);
      // header plate (recessed name panel) + housed red lamps standing on it
      this.box("paintedMetal", this.P.impDark, h.u0 - 2.2, h.u1 + 2.2, hv0, hv1, 0.02, 0.9, { texel: 0.5 });
      this.box("paintedMetal", this.P.impBlack, h.u0 - 1.6, h.u1 + 1.6, hv0 + 0.2, hv1 - 0.2, 0.9, 0.92, { texel: 0.5 });
      for (const u of [h.u0 - 1.9, h.u1 + 1.9]) {
        this.box("paintedMetal", this.P.impDark, u - 0.25, u + 0.25, hv1, hv1 + 0.12, 0.3, 0.7);
        redBeacon(this.B, this.pos(u, hv1 + 0.3, 0.7), N, 0.44);
      }
      if (txt) label(this.kit, "hgSign", txt, this.pos((h.u0 + h.u1) / 2, (hv0 + hv1) / 2, 0.925), N, Math.min(0.8 * LABELS[txt].aspect, h.u1 - h.u0 + 3.0));
      // jamb columns either side of the surround, each with a caged light slot: the strip sits 10 cm
      // back in a black channel between two dark cheeks, behind steel cage bars, at 40 % of the bare
      // emitter level - a housed fixture with a glow, not a clipped white bar
      for (const [a, b] of [[h.u0 - m - bw - 0.9, h.u0 - m - bw - 0.15], [h.u1 + m + bw + 0.15, h.u1 + m + bw + 0.9]]) {
        this.cagedStrip(a, b, 0.4, hv0 - 0.4, 0.9);
        const [mn, mx] = this.aabb(a, b, 0, 4, 0, 0.9);
        this.kit.collider(mn, mx, "jamb");
      }
      // giant bay stencil above the header (reads from the deck; the 10 m door gets its scale from it):
      // 4 m letters with their bottom 0.6 m over the header's red lamps, on the plain panel zone
      // registered in buildWalls() - from the bay-door camera 20 m out the frame's top edge is at v 18.5,
      // so the 4.6 m stencil at v 18.4 showed only its bottom half
      if (txt) label(this.kit, "hgDecal", txt, this.pos((h.u0 + h.u1) / 2, bayStencilV(h), P1 + 0.015), N, 4.0 * LABELS[txt].aspect, { color: HG.white });
      return;
    }
    // blast door: inner surround (1.0 m, steel lip), then the portal: 1.4 m columns 1.1 m deep up to the
    // lintel (v 6.0 .. 7.4) carrying the name plate, red lamps on top, lit strips down the column insides
    const bw = 1.0, cw = 1.4, pd = 1.1;
    this.box("paintedMetal", this.P.impDark, h.u0 - m - bw, h.u0 - m, 0, h.v1 + m + bw, P0, P0 + 0.5, { texel: 0.5 });
    this.box("paintedMetal", this.P.impDark, h.u1 + m, h.u1 + m + bw, 0, h.v1 + m + bw, P0, P0 + 0.5, { texel: 0.5 });
    this.box("paintedMetal", this.P.impDark, h.u0 - m, h.u1 + m, h.v1 + m, h.v1 + m + bw, P0, P0 + 0.5, { texel: 0.5 });
    this.box("metal", HG.steel, h.u0 - m - 0.08, h.u0 - m, 0, h.v1 + m + 0.08, P0 + 0.5, P0 + 0.56);
    this.box("metal", HG.steel, h.u1 + m, h.u1 + m + 0.08, 0, h.v1 + m + 0.08, P0 + 0.5, P0 + 0.56);
    this.box("metal", HG.steel, h.u0 - m, h.u1 + m, h.v1 + m, h.v1 + m + 0.08, P0 + 0.5, P0 + 0.56);
    const c0 = h.u0 - m - bw - cw, c1 = h.u1 + m + bw + cw; // portal outer edges
    const lv0 = h.v1 + m + bw + 0.3, lv1 = lv0 + 1.4; // lintel
    for (const [a, b] of [[c0, c0 + cw], [c1 - cw, c1]]) {
      // column core (no front face) and a front layer split round the recessed strip channel on the
      // inner edge: the channel is a 20 cm black slot 10 cm deep with the strip at its back, on the
      // housed level (a lit reveal down the portal, not a bare bar)
      const inner = a === c0 ? b : a, dir = a === c0 ? -1 : 1;
      const s0 = Math.min(inner + dir * 0.02, inner + dir * 0.22), s1 = Math.max(inner + dir * 0.02, inner + dir * 0.22);
      this.box("paintedMetal", this.P.impDark, a, b, 0, lv0, 0.02, pd - 0.1, { faces: ALL & ~this.backBit & ~this.frontBit, texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, a, s0, 0, lv0, pd - 0.1, pd, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, s1, b, 0, lv0, pd - 0.1, pd, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, s0, s1, 0, 0.5, pd - 0.1, pd, { texel: 0.5 });
      this.box("paintedMetal", this.P.impDark, s0, s1, lv0 - 0.5, lv0, pd - 0.1, pd, { texel: 0.5 });
      this.box("paintedMetal", this.P.impBlack, s0, s1, 0.5, lv0 - 0.5, pd - 0.1, pd - 0.09, { faces: this.frontBit });
      this.box("hgEmit", EM.jamb, s0 + 0.04, s1 - 0.04, 0.6, lv0 - 0.6, pd - 0.09, pd - 0.08);
      // recessed-look mid-grey face panel on the outer part of the column, clear of the channel
      if (a === c0) this.box("paintedMetal", this.P.impMid, a + 0.2, s0 - 0.15, 0.4, lv0 - 0.4, pd, pd + 0.06, { texel: 0.5 });
      else this.box("paintedMetal", this.P.impMid, s1 + 0.15, b - 0.2, 0.4, lv0 - 0.4, pd, pd + 0.06, { texel: 0.5 });
      this.box("metal", HG.steel, a, b, 0.05, 0.2, pd, pd + 0.03);
      const [mn, mx] = this.aabb(a, b, 0, 4, 0, pd);
      this.kit.collider(mn, mx, "jamb");
    }
    this.box("paintedMetal", this.P.impDark, c0, c1, lv0, lv1, 0.02, pd, { texel: 0.5 });
    this.box("paintedMetal", this.P.impBlack, h.u0 - 1.8, h.u1 + 1.8, lv0 + 0.2, lv1 - 0.2, pd, pd + 0.02, { texel: 0.5 });
    this.box("metal", HG.steel, c0, c1, lv1, lv1 + 0.12, 0.02, pd + 0.1);
    for (const u of [c0 + cw / 2, c1 - cw / 2]) redBeacon(this.B, this.pos(u, lv1 + 0.45, pd - 0.3), N, 0.5);
    if (txt) {
      label(this.kit, red ? "hgSignRed" : "hgSign", txt, this.pos((h.u0 + h.u1) / 2, (lv0 + lv1) / 2, pd + 0.025), N, Math.min(0.8 * LABELS[txt].aspect, h.u1 - h.u0 + 3.4));
      if (red) label(this.kit, "hgSignRed", "SEALED", this.pos((h.u0 + h.u1) / 2, h.v1 + m + 0.5, P0 + 0.565), N, 2.4);
    }
    // threshold: black/yellow blocks across the portal on the deck
    if (h.v0 === 0) {
      const [mn, mx] = this.aabb(h.u0 - 0.8, h.u1 + 0.8, 0, 0.02, pd, pd + 1.2);
      hazardBlocks(this.B, mn, mx, this.plane === "x" ? "z" : "x", { block: 0.4, faces: PY });
    }
  }

  /**
   * Jamb column (u a..b, deck to v1 + 0.4, `depth` deep) with a caged light slot: black channel 10 cm
   * deep between two dark cheeks, the strip at the back on the housed level, steel cage bars across the
   * slot every 0.5 m.
   */
  cagedStrip(a, b, v0, v1, depth) {
    const c = (a + b) / 2, P = this.P, nf = ALL & ~this.backBit & ~this.frontBit;
    // core behind the slot (no front face), then the front layer in pieces round the open slot
    this.box("paintedMetal", P.impDark, a, b, 0, v1 + 0.4, 0.02, depth - 0.1, { faces: nf, texel: 0.5 });
    this.box("paintedMetal", P.impDark, a, c - 0.12, 0, v1 + 0.4, depth - 0.1, depth, { texel: 0.5 });
    this.box("paintedMetal", P.impDark, c + 0.12, b, 0, v1 + 0.4, depth - 0.1, depth, { texel: 0.5 });
    this.box("paintedMetal", P.impDark, c - 0.12, c + 0.12, 0, v0, depth - 0.1, depth, { texel: 0.5 });
    this.box("paintedMetal", P.impDark, c - 0.12, c + 0.12, v1, v1 + 0.4, depth - 0.1, depth, { texel: 0.5 });
    // slot: black back plate, the strip on the housed level, cheeks proud of the face, steel cage bars
    this.box("paintedMetal", P.impBlack, c - 0.12, c + 0.12, v0, v1, depth - 0.1, depth - 0.09, { faces: this.frontBit });
    for (const s of [-1, 1]) this.box("paintedMetal", P.impDark, c + s * 0.16 - 0.04, c + s * 0.16 + 0.04, v0, v1, depth - 0.02, depth + 0.06, { texel: 0.5 });
    this.box("hgEmit", EM.jamb, c - 0.05, c + 0.05, v0 + 0.1, v1 - 0.1, depth - 0.09, depth - 0.08);
    for (let v = v0 + 0.3; v < v1 - 0.1; v += 0.5) this.box("metal", HG.steel, c - 0.13, c + 0.13, v - 0.015, v + 0.015, depth, depth + 0.03);
  }

  /**
   * Buttress tower flanking a blast portal: a dark block from the deck to `top` (the balcony / gallery
   * underside), TOWER_D deep, that carries the walkway ends; recessed mid-grey face panel, a lit blue-
   * white window band (lift / stair tower) up the front, steel edge trims, black plinth and cap, a
   * housed lamp under the cap, and baked shadow on the wall along its shaded flank. Blocks the player.
   */
  tower(uc, top, { beacon = true, faceTop = top - 0.6 } = {}) {
    const P = this.P, u0 = uc - TOWER_HW, u1 = uc + TOWER_HW, D = TOWER_D;
    // body: a core without a front face, and the front layer in four pieces round the open window channel
    this.box("paintedMetal", P.impDark, u0, u1, 0.9, top - 0.3, 0.02, D - 0.12, { faces: ALL & ~this.backBit & ~PY & ~this.frontBit, texel: 0.5 });
    const fo = { faces: ALL & ~this.backBit & ~PY, texel: 0.5 };
    this.box("paintedMetal", P.impDark, u0, uc - 0.5, 0.9, top - 0.3, D - 0.12, D, fo);
    this.box("paintedMetal", P.impDark, uc + 0.5, u1, 0.9, top - 0.3, D - 0.12, D, fo);
    this.box("paintedMetal", P.impDark, uc - 0.5, uc + 0.5, 0.9, 1.4, D - 0.12, D, fo);
    this.box("paintedMetal", P.impDark, uc - 0.5, uc + 0.5, faceTop, top - 0.3, D - 0.12, D, fo);
    this.box("paintedMetal", P.impBlack, u0 - 0.1, u1 + 0.1, 0, 0.9, 0.02, D + 0.1, { faces: ALL & ~this.backBit, texel: 0.5 });
    this.box("paintedMetal", P.impBlack, u0 - 0.1, u1 + 0.1, top - 0.3, top, 0.02, D + 0.1, { faces: ALL & ~this.backBit, texel: 0.5 });
    // recessed face panels (mid grey) either side of the window band, steel trims on the vertical edges
    for (const [a, b] of [[u0 + 0.35, uc - 0.75], [uc + 0.75, u1 - 0.35]]) this.box("impPanel", P.impMid, a, b, 1.3, faceTop - 0.1, D, D + 0.05, { faces: this.frontBit, fit: true });
    for (const s of [-1, 1]) this.box("metal", HG.steel, uc + s * TOWER_HW - 0.06, uc + s * TOWER_HW + 0.06, 0.9, top - 0.3, D, D + 0.08);
    // window band: black channel with the lit band recessed in it, dark mullions every 1.2 m
    this.box("paintedMetal", P.impBlack, uc - 0.5, uc + 0.5, 1.4, faceTop, D - 0.12, D - 0.11, { faces: this.frontBit });
    this.box("hgEmit", EM.tower, uc - 0.4, uc + 0.4, 1.5, faceTop - 0.1, D - 0.11, D - 0.1);
    for (const s of [-1, 1]) this.box("paintedMetal", P.impDark, uc + s * 0.5 - 0.04, uc + s * 0.5 + 0.04, 1.4, faceTop, D - 0.12, D + 0.04, { texel: 0.5 });
    for (let v = 2.6; v < faceTop - 0.2; v += 1.2) this.box("paintedMetal", P.impDark, uc - 0.5, uc + 0.5, v - 0.04, v + 0.04, D - 0.12, D + 0.02, { texel: 0.5 });
    // two housed lamps high on the front face flanking the band, a red beacon on the cap edge
    for (const s of [-1, 1]) housedLamp(this.B, "hgEmit", this.pos(uc + s * 2.2, faceTop, D + 0.05), this.N.toArray(), [0.9, 0.16, 0.24], { inset: 0.04, lampColor: EM.lens });
    if (beacon) redBeacon(this.B, this.pos(uc + TOWER_HW - 0.6, top + 0.25, D - 0.3), this.N.toArray(), 0.34);
    // baked shadow along the shaded flank
    const shade = this.shadeSide(uc);
    this.grad(shade > 0 ? "u+" : "u-", uc + shade * (TOWER_HW + 0.1), top / 2, 1.2, top);
    const [mn, mx] = this.aabb(u0 - 0.1, u1 + 0.1, 0, 4, 0, D + 0.1);
    this.kit.collider(mn, mx, "tower");
  }
  /** keeps panels, trays, dressing and the gallery clear of a tower's footprint (call before building) */
  towerCut(uc, top) {
    const u0 = uc - TOWER_HW - 0.3, u1 = uc + TOWER_HW + 0.3;
    this.extraCuts.push({ u0, u1, v0: 0, v1: top + 0.3 });
    this.trayCuts.push({ u0, u1, v0: 0, v1: H });
    this.baseCuts.push({ u0: u0 - 1.2, u1: u1 + 1.2, v0: 0, v1: 3.3 });
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
  // ---- wall / deck junction: a covered cable trench along the plinth foot - a 0.8 m grate cover flush
  // with the plating between the kick plate and a light steel edge angle, with a cover joint every 4 m,
  // broken where something stands at the wall (doors and their surrounds, ribs, towers, stairs, ladders,
  // hatches, fire stations, the base dressing) and along the rack zone (the tier columns and their
  // shadow band). With the dark plinth and the light kick plate over it and the deck's baked occlusion
  // band running out from its edge angle, the foot of every wall is a dark - light - dark - light -
  // dark sequence a squint reads as a junction, not a plane meeting a plane (8 px of a half-size frame
  // from the aperture rail 70 m out). Call after the dressing has been placed.
  trench() {
    const cuts = [...this.cuts(), ...this.ribRects().map((r) => expand(r, 0.25, 0)), ...this.extraCuts, ...this.trayCuts, ...this.baseCuts, ...this.dressCuts].filter((c) => c.v0 < 0.1);
    const spans = subtract({ u0: 0.6, u1: this.L - 0.6, v0: 0, v1: 0.1 }, cuts, 0.05).filter((r) => r.v0 === 0 && r.u1 - r.u0 >= 2.5);
    const d0 = 0.38, d1 = 1.18; // plinth kick plate .. edge angle
    for (const r of spans) {
      const a = r.u0 + 0.1, b = r.u1 - 0.1;
      this.box("grate", 0xffffff, a, b, 0, 0.025, d0, d1, { faces: PY, texel: 0.8 });
      this.box("metal", HG.steel, a, b, 0, 0.04, d1, d1 + 0.14, { faces: PY | this.frontBit });
      for (const [e0, e1] of [[a - 0.06, a], [b, b + 0.06]]) this.box("metal", HG.steel, e0, e1, 0, 0.04, d0, d1 + 0.14, { faces: ALL & ~NY & ~this.backBit });
      for (let u = Math.ceil((a + 1) / 4) * 4; u < b - 0.5; u += 4) this.box("metal", HG.gunmetal, u - 0.03, u + 0.03, 0, 0.03, d0, d1, { faces: PY });
    }
  }

  dress(kind, u, text = null) {
    const P = this.P, N = this.N.toArray();
    this.dressCuts.push({ u0: u - (kind === "lockers" ? 1.6 : kind === "hatch" ? 1.7 : 1.2), u1: u + (kind === "lockers" ? 1.6 : kind === "hatch" ? 1.7 : 1.2), v0: 0, v1: 3.3 });
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
        // standard-door-sized hatch (2.4 x 3.0), decorative: heavy frame, two dark leaves with a centre
        // seam, a housed blue lamp on the header, stencil; a lit strip down both jambs so it reads at night
        this.box("paintedMetal", P.impDark, u - 1.5, u + 1.5, 0, 3.3, P0, P0 + 0.3, { texel: 0.5 });
        this.box("paintedMetal", P.impBlack, u - 1.2, u + 1.2, 0.04, 3.0, P0, P0 + 0.31, { texel: 0.5 });
        for (const [a, b] of [[u - 1.17, u - 0.03], [u + 0.03, u + 1.17]]) this.box("paintedMetal", P.impMid, a, b, 0.1, 2.94, P0 + 0.31, P0 + 0.37, { texel: 0.5 });
        this.box("metal", HG.steel, u - 1.24, u + 1.24, 3.0, 3.06, P0 + 0.3, P0 + 0.36);
        this.box("metal", HG.steel, u - 0.2, u - 0.14, 1.0, 1.25, P0 + 0.37, P0 + 0.41);
        this.box("metal", HG.steel, u + 0.14, u + 0.2, 1.0, 1.25, P0 + 0.37, P0 + 0.41);
        for (const s of [-1, 1]) this.box("hgEmit", EM.strip, u + s * 1.33 - 0.02, u + s * 1.33 + 0.02, 0.3, 2.9, P0 + 0.3, P0 + 0.315);
        housedLamp(this.B, "emitBlue", this.pos(u, 3.45, P0 + 0.3), N, [0.36, 0.14, 0.18], { inset: 0.04 });
        label(this.kit, "hgDecal", text || "MAINT ACCESS", this.pos(u, 3.17, P0 + 0.305), N, 1.9, { color: HG.white });
        label(this.kit, "hgDecal", "AUTHORISED ONLY", this.pos(u, 2.7, P0 + 0.375), N, 1.6, { color: HG.yellow });
        break;
      }
      default:
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Ceiling: backing, the 20 m rib grid with 10 m purlins between (a dark truss grid reading in the
// environment fill), dark faintly self-lit cell panels (crane bays darker), 96 long housed light runs
// under the longitudinal purlins (one per 20 m bay, three lenses each, per-bay levels, a tenth of the
// lenses dead: an uneven field of jointed lit lines converging on the bow wall), and the four louvred
// flood fixtures of the light plan
// ---------------------------------------------------------------------------
const PURLIN_Z = RIB_Z.slice(0, -1).map((z, i) => (z + RIB_Z[i + 1]) / 2); // between the transverse ribs
const PURLIN_X = [-70, -50, -30, -10, 10, 30, 50, 70]; // between the longitudinal ribs (the 40 m centre bay split in three)
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
  for (const x of RIB_X) B.boxMM("paintedMetal", PALETTE.impDark, [x - w / 2, yB - ribD + 0.16, HALL.z0 + P1], [x + w / 2, yB, HALL.z1 - P1], { faces: ALL & ~PY, texel: 0.5 });
  // purlins: a 10 m secondary grid of shallower dark beams with a lighter bottom flange, so the cells
  // between the ribs read as a structured truss ceiling rather than one flat plane
  for (const z of PURLIN_Z) {
    B.boxMM("paintedMetal", PALETTE.impDark, [HALL.x0 + P1, yB - 0.7, z - 0.25], [HALL.x1 - P1, yB, z + 0.25], { faces: ALL & ~PY, texel: 0.5 });
    B.boxMM("paintedMetal", PALETTE.impMid, [HALL.x0 + P1 + 0.5, yB - 0.74, z - 0.32], [HALL.x1 - P1 - 0.5, yB - 0.7, z + 0.32], { texel: 0.5 });
  }
  for (const x of PURLIN_X) {
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.2, yB - 0.5, HALL.z0 + P1], [x + 0.2, yB, HALL.z1 - P1], { faces: ALL & ~PY, texel: 0.5 });
    B.boxMM("paintedMetal", PALETTE.impMid, [x - 0.26, yB - 0.54, HALL.z0 + P1 + 0.5], [x + 0.26, yB - 0.5, HALL.z1 - P1 - 0.5], { texel: 0.5 });
  }
  // cell panels between the ribs: dark, very faintly self-lit (hgCeil), the outer cells (crane bays) darker
  const xEdges = [HALL.x0 + P1, ...RIB_X.flatMap((x) => [x - w / 2, x + w / 2]), HALL.x1 - P1];
  const zEdges = [HALL.z0 + P1, ...RIB_Z.flatMap((z) => [z - w / 2, z + w / 2]), HALL.z1 - P1];
  const cellTone = tinted(PALETTE.impGrey, 0.5), craneTone = tinted(PALETTE.impGrey, 0.36);
  for (let i = 0; i < xEdges.length - 1; i += 2) {
    const x0 = xEdges[i], x1 = xEdges[i + 1];
    const craneBay = x0 < HALL.x0 + 1 || x1 > HALL.x1 - 1;
    for (let j = 0; j < zEdges.length - 1; j += 2) {
      const z0 = zEdges[j], z1 = zEdges[j + 1];
      const nx = Math.max(1, Math.round((x1 - x0) / 5)), nz = Math.max(1, Math.round((z1 - z0) / 5));
      const px = (x1 - x0) / nx, pz = (z1 - z0) / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          const ax0 = x0 + a * px + 0.1, ax1 = x0 + (a + 1) * px - 0.1;
          const az0 = z0 + b * pz + 0.1, az1 = z0 + (b + 1) * pz - 0.1;
          // 60 m up only the underside is ever seen: the 12 cm edges are dropped (the black backing in the gaps is the seam)
          B.boxMM("hgCeil", craneBay ? craneTone : cellTone, [ax0, yB - 0.12, az0], [ax1, yB, az1], { faces: NY });
        }
      }
    }
  }
  // louvred flood fixture: dark housing (top plate, four side slabs, open bottom) on a stem and yoke,
  // the lens 0.3 m up inside on the housed level, three slats across the mouth
  const fixture = (x, z, big, lensY = null) => {
    const W = big ? 3.2 : 2.2, D = big ? 2.0 : 1.4, Hh = big ? 1.0 : 0.7;
    const top = yB - ribD;
    const y1 = lensY === null ? top - 0.75 : lensY + Hh - 0.3, y0 = y1 - Hh;
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.22, y1 + 0.15, z - 0.22], [x + 0.22, top, z + 0.22], { faces: ALL & ~PY, texel: 0.5 });
    B.boxMM("paintedMetal", PALETTE.impMid, [x - W / 2 - 0.1, y1, z - 0.2], [x + W / 2 + 0.1, y1 + 0.15, z + 0.2], { texel: 0.5 });
    B.boxMM("paintedMetal", PALETTE.impDark, [x - W / 2, y1 - 0.08, z - D / 2], [x + W / 2, y1, z + D / 2], { faces: ALL & ~PY, texel: 0.5 });
    for (const s of [-1, 1]) {
      B.boxMM("paintedMetal", PALETTE.impDark, [x + s * W / 2 - 0.04, y0, z - D / 2], [x + s * W / 2 + 0.04, y1, z + D / 2], { faces: ALL & ~PY, texel: 0.5 });
      B.boxMM("paintedMetal", PALETTE.impDark, [x - W / 2, y0, z + s * D / 2 - 0.04], [x + W / 2, y1, z + s * D / 2 + 0.04], { faces: ALL & ~PY, texel: 0.5 });
    }
    B.boxMM("hgEmit", EM.lens, [x - W / 2 + 0.12, y0 + 0.3, z - D / 2 + 0.12], [x + W / 2 - 0.12, y0 + 0.36, z + D / 2 - 0.12], { faces: NY | PX | NX | PZ | NZ });
    for (const k of [-1, 0, 1]) B.boxMM("paintedMetal", PALETTE.impMid, [x - W / 2, y0, z + k * D * 0.3 - 0.025], [x + W / 2, y0 + 0.14, z + k * D * 0.3 + 0.025], { faces: ALL & ~PY, texel: 0.5 });
  };
  // the light runs: one long housed channel under every longitudinal purlin (x +-10 .. +-70) in every
  // 20 m bay between the transverse ribs - 96 runs of ~18 m, each in two 8.6 m lenses with a joint and
  // end caps (long runs aligned to the beams, not a field of short dashes), the housing on the faint
  // self-lit level so it reads as a grey body round the lens. The level is set per bay (hash of the
  // bay): half the bays full, 30 % at 45 %, 20 % at 20 % (the two outer runs over the crane bays always
  // dim), and 15 % of the lenses are dead (dark lens, housing kept). Full against 45 % is a stop and a
  // sixth: the difference survives the tone curve on a half-size frame, where full against 60 % did
  // not. From the spawn the eight runs converge on the bow wall as jointed lit lines of uneven
  // brightness, not a grid of dots; the crane's light-grey bridge crosses them. Runs skip the bay over
  // a light-plan flood's arm.
  const bayHash = (i, j) => {
    let h = (i * 40503 + j * 9973 + 11) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
    return (h % 100) / 100;
  };
  const bayLevel = (i, j) => {
    if (i === 0 || i === PURLIN_X.length - 1) return 0.35;
    const u = bayHash(i, j);
    return u < 0.5 ? 1 : u < 0.8 ? 0.45 : 0.2;
  };
  // a sixth of the full bays are relamped with warm tubes (a colour step as well as a value step, so
  // the field reads as maintained lighting of mixed age, not a grid)
  const bayTone = (i, j) => (bayHash(i, j) < 0.5 && bayHash(j + 3, i + 5) < 0.33 ? EM.ceilWarm : EM.ceil);
  const chanBody = { mat: "hgEmit", color: EM.housing }, chanCap = { mat: "hgEmit", color: EM.housingCap };
  const zBays = [HALL.z0 + P1 + 0.6, ...RIB_Z, HALL.z1 - P1 - 0.6];
  PURLIN_X.forEach((x, i) => {
    for (let j = 0; j < zBays.length - 1; j++) {
      const z0 = zBays[j] + (j === 0 ? 0 : w / 2 + 0.5), z1 = zBays[j + 1] - (j === zBays.length - 2 ? 0 : w / 2 + 0.5);
      if (z1 - z0 < 4) continue;
      if (FLOODS.some((f) => Math.abs(f.pos[0] - x) < 3 && f.pos[2] > z0 - 1 && f.pos[2] < z1 + 1)) continue;
      const y = yB - 0.54 - 0.42; // channel face under the purlin's bottom flange
      litChannel(B, PALETTE, [x, y, z0], [x, y, z1], DOWN, { w: 1.0, depth: 0.42, lensW: 0.5, level: bayTone(i, j), seg: 8.6, gap: 0.4, cap: 0.5, off: 0.15, seed: i * 7 + j, body: chanBody, capStyle: chanCap, dim: bayLevel(i, j) });
    }
  });
  // the light plan's four floods: real fixtures at the spot positions. Nearly vertical ones are big
  // louvred boxes on a long stem off a cross-arm from the nearest longitudinal rib; tilted ones (the rack
  // key lights) are a housing aimed along the spot axis with the lens in its mouth.
  for (const f of FLOODS) {
    const [x, y, z] = f.pos;
    const dir = new THREE.Vector3(f.target[0] - x, f.target[1] - y, f.target[2] - z).normalize();
    const ribX = RIB_X.reduce((best, r) => (Math.abs(r - x) < Math.abs(best - x) ? r : best), RIB_X[0]);
    const armY = yB - ribD - 0.2;
    B.boxMM("paintedMetal", PALETTE.impDark, [Math.min(x, ribX) - 0.2, armY - 0.4, z - 0.25], [Math.max(x, ribX) + 0.2, armY, z + 0.25], { texel: 0.5 });
    if (dir.y < -0.9) {
      fixture(x, z, true, y);
      continue;
    }
    // tilted housing: local +z along the spot axis
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    const c = new THREE.Vector3(x, y, z);
    const up = new THREE.Vector3(0, 1, 0).sub(dir.clone().multiplyScalar(dir.y)).normalize(); // housing "up" (perpendicular to the axis)
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.2, y + 0.8, z - 0.2], [x + 0.2, armY - 0.4, z + 0.2], { texel: 0.5 });
    B.geo("paintedMetal", PALETTE.impMid, sharedBox(0.9, 0.5, 0.9), [x, y + 0.75, z], null);
    B.geo("paintedMetal", PALETTE.impDark, sharedBox(2.4, 1.6, 1.1), c.clone().addScaledVector(dir, -0.4).toArray(), q);
    for (const s of [-1, 1]) B.geo("paintedMetal", PALETTE.impDark, sharedBox(2.4, 0.08, 0.7), c.clone().addScaledVector(up, s * 0.84).addScaledVector(dir, 0.45).toArray(), q);
    B.geo("hgEmit", EM.lens, sharedBox(2.1, 1.3, 0.04), c.clone().addScaledVector(dir, 0.17).toArray(), q);
    for (const k of [-0.45, 0, 0.45]) B.geo("paintedMetal", PALETTE.impMid, sharedBox(2.3, 0.05, 0.3), c.clone().addScaledVector(up, k).addScaledVector(dir, 0.6).toArray(), q);
    B.geo("paintedMetal", PALETTE.impMid, sharedBox(0.3, 0.3, 1.2), c.clone().addScaledVector(up, 0.95).addScaledVector(dir, -0.2).toArray(), q);
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
  W.baseCuts.push({ u0: u - 1.6, u1: u + 1.9, v0: 0, v1: 3.3 });
}

// ---------------------------------------------------------------------------
// Balcony for the control-tower hatch (y -60): grate plate into the wall slot, lit rails on the three
// open sides, a fascia beam with a lit front strip and a recessed lit soffit, three heavy brackets (arm +
// wall plate + box strut), a small standing console. Reached only through the hatch (no stair).
// ---------------------------------------------------------------------------
function buildBalcony(ctx, B) {
  const { kit, PALETTE } = ctx;
  const { x0, x1, z0, y } = BALCONY;
  const zWall = HALL.z1 - WALL_T; // backing front
  const T = 0.3;
  B.boxMM("grate", 0xffffff, [x0, y - T, z0], [x1, y, zWall], { texel: 0.8 });
  // edge trim (sides), a hair proud of the plate; a deep fascia girder (1.1 m) along the front so the
  // balcony reads as a real cantilever from the deck, with a steel edge and the soffit under it
  for (const [a, b] of [[x0 - 0.14, x0], [x1, x1 + 0.14]]) B.boxMM("paintedMetal", PALETTE.impDark, [a, y - T - 0.06, z0], [b, y + 0.02, zWall], { texel: 0.5 });
  const gB = y - T - 0.8; // girder bottom
  B.boxMM("paintedMetal", PALETTE.impDark, [x0 - 0.14, gB, z0 - 0.14], [x1 + 0.14, y + 0.02, z0 + 0.3], { texel: 0.5 });
  B.boxMM("metal", HG.steel, [x0 - 0.14, y - T - 0.2, z0 - 0.16], [x1 + 0.14, y - T - 0.14, z0 - 0.14]);
  B.boxMM("metal", HG.steel, [x0 - 0.14, gB, z0 - 0.16], [x1 + 0.14, gB + 0.06, z0 - 0.14]);
  // lit fascia strip (6 cm, in a black channel on the front face), a soft lit strip along the soffit's
  // inner edge and four housed soffit lamps underneath (a thin line and a row of lamps read as a lit
  // balcony from 70 m; one solid bar would just bloom)
  B.boxMM("paintedMetal", PALETTE.impBlack, [x0 + 0.4, y - T - 0.56, z0 - 0.2], [x1 - 0.4, y - T - 0.4, z0 - 0.14]);
  B.boxMM("emitWhite", 0xffffff, [x0 + 0.5, y - T - 0.51, z0 - 0.21], [x1 - 0.5, y - T - 0.45, z0 - 0.2]);
  // (the soffit between the two buttress towers, x +-5.2, is the only part seen from below)
  B.boxMM("hgEmit", EM.strip, [-4.9, gB - 0.01, z0 + 0.34], [4.9, gB, z0 + 0.4], { faces: NY });
  for (const x of [-1.7, 1.7]) housedLamp(B, "hgEmit", [x, gB - 0.001, z0 + 0.08], [0, -1, 0], [2.4, 0.16, 0.26], { inset: 0.05, lampColor: EM.lens });
  // three heavy brackets between the towers (which carry the ends): arm under the plate, wall plate,
  // square-section knee strut, gusset plate over the girder
  for (const x of [-3.4, 0, 3.4]) {
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.3, y - T - 0.7, z0 + 0.3], [x + 0.3, y - T - 0.06, zWall], { texel: 0.5 });
    B.boxMM("paintedMetal", PALETTE.impDark, [x - 0.4, y - 4.6, zWall - 0.4], [x + 0.4, y - T - 0.06, zWall], { texel: 0.5 });
    B.boxMM("paintedMetal", PALETTE.impMid, [x - 0.36, gB - 0.3, z0 - 0.2], [x + 0.36, y - T - 0.06, z0 + 0.36], { texel: 0.5 });
    const a = new THREE.Vector3(x, gB - 0.1, z0 + 0.6), b = new THREE.Vector3(x, y - 4.2, zWall - 0.3);
    const L = a.distanceTo(b);
    const ang = Math.atan2(b.y - a.y, b.z - a.z); // rotation about x taking +z onto the strut
    kit.add("paintedMetal", new THREE.BoxGeometry(0.34, 0.34, L), { pos: a.clone().add(b).multiplyScalar(0.5).toArray(), rot: [-ang, 0, 0], color: PALETTE.impDark, texel: 0.5 });
  }
  // rails (1.02 m, blocking, lit): round light-grey handrail on thin posts, dark mid rail and kick plate,
  // the lit strip under the handrail on the housed level (it is 1.5 m from the eye in the balcony view,
  // so it must not smear); no post cap lenses on the front rail (they bloom into blobs that close)
  railRun(B, kit, [x0, z0], [x1, z0], y, { tag: "balcony-rail", lit: true, soft: true, caps: false, postEvery: 2.2, postW: 0.14 });
  railRun(B, kit, [x0, z0], [x0, zWall - 0.1], y, { tag: "balcony-rail", lit: true, soft: true, caps: false });
  railRun(B, kit, [x1, z0], [x1, zWall - 0.1], y, { tag: "balcony-rail", lit: true, soft: true, caps: false });
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
// Walkway ring helper (catwalk at 36 m, service gallery at 12 m): grate plate on a structural band along
// a wall span, edge trim, brackets, housed downlights, a rail on the inner edge (lit for the gallery), a
// continuous lit strip under the inner edge, holes for the ladders that pass through.
// ---------------------------------------------------------------------------
function walkway(ctx, B, W, u0, u1, y, w, { lit = false, ladders = [], endRails = false, downlights = true } = {}) {
  const { kit, PALETTE } = ctx;
  const plate = (a, b, d0, d1) => {
    const [mn, mx] = W.aabb(a, b, y - FLOOR - CAT_T, y - FLOOR, d0, d1);
    B.boxMM("grate", 0xffffff, mn, mx, { texel: 0.8 });
  };
  const wallD = P1 + 0.01, edgeD = wallD + w;
  // inner 0.3 m continuous, wall-side pieces round the ladder holes
  plate(u0, u1, edgeD - 0.3, edgeD);
  let cursor = u0;
  for (const lu of [...ladders].sort((a, b) => a - b)) {
    if (lu - 0.6 > cursor) plate(cursor, lu - 0.6, wallD, edgeD - 0.3);
    cursor = lu + 0.6;
  }
  if (u1 > cursor) plate(cursor, u1, wallD, edgeD - 0.3);
  // edge trim + a segmented lit channel under it (the gallery's lit edge: 4 m lenses on the channel
  // level between mid-grey joints, end caps, a few dead) + the baked shadow the walkway throws on the
  // wall under itself (2.5 m under the catwalk, 1.6 m under the lit gallery)
  W.box("paintedMetal", PALETTE.impDark, u0, u1, y - FLOOR - CAT_T - 0.05, y - FLOOR + 0.02, edgeD - 0.12, edgeD, { texel: 0.5 });
  if (lit) litChannel(B, PALETTE, W.pos(u0 + 0.2, y - FLOOR - CAT_T - 0.12, edgeD - 0.06), W.pos(u1 - 0.2, y - FLOOR - CAT_T - 0.12, edgeD - 0.06), DOWN, { w: 0.14, depth: 0.1, lensW: 0.07, level: EM.channel, seg: 4, gap: 0.2, cap: 0.25, off: 0.06, seed: Math.round(u0) + 5 });
  W.grad("down", (u0 + u1) / 2, y - FLOOR - CAT_T - 0.06, lit ? 1.6 : 2.5, u1 - u0);
  // brackets + downlights
  for (let u = Math.ceil(u0 / 4) * 4 + 1; u < u1 - 1; u += 4) {
    if (W.ribs.some((r) => Math.abs(r - u) < 1.6) || ladders.some((l) => Math.abs(l - u) < 1.0)) continue;
    W.box("paintedMetal", PALETTE.impMid, u - 0.12, u + 0.12, y - FLOOR - CAT_T - 0.32, y - FLOOR - CAT_T, wallD, edgeD, { texel: 0.5 });
    if (downlights && Math.round(u / 4) % 2 === 0) housedLamp(B, "emitWhite", W.pos(u, y - FLOOR - CAT_T - 0.16, edgeD - 0.5), [0, -1, 0], [0.5, 0.16, 0.36], { inset: 0.04 });
  }
  // rail along the inner edge (+ end rails across the plate)
  const p = (u, d) => {
    const q = W.pos(u, 0, d);
    return [q[0], q[2]];
  };
  railRun(B, kit, p(u0 + 0.05, edgeD - 0.05), p(u1 - 0.05, edgeD - 0.05), y, { collide: false, foot: false, postEvery: 3, lit });
  if (endRails) for (const u of [u0 + 0.05, u1 - 0.05]) railRun(B, kit, p(u, wallD + 0.05), p(u, edgeD - 0.1), y, { collide: false, foot: false, lit });
}

// ---------------------------------------------------------------------------
// Maintenance catwalk ring at y -35.5 round all four walls (on the third structural band) with caged
// ladders from the deck (side walls: the rack ladders continue up; end walls: one each), and the service
// gallery at y -60 on the first band (bow + aft walls either side of the balcony, side walls outside the
// rack zone and the bay-door surrounds).
// ---------------------------------------------------------------------------
function buildWalkways(ctx, B, byName) {
  const { kit } = ctx;
  const inX = HALL.x1 - P1 - 0.01; // wall panel fronts
  for (const W of Object.values(byName)) {
    const end = W.plane === "z";
    const ladders = end ? [W.u(END_LADDER_X[W.name])] : LADDER_Z.map((z) => W.u(z));
    // catwalk: the side walls run the full length; the end walls stop short of the side plates
    const margin = end ? CATWALK.w : 0;
    walkway(ctx, B, W, margin + 0.02, W.L - margin - 0.02, CATWALK.y, CATWALK.w, { ladders });
    for (const [a, b] of W.gallery) walkway(ctx, B, W, a, b, GALLERY.y, GALLERY.w, { lit: true, ladders: ladders.filter((l) => l > a && l < b), endRails: true, downlights: false });
  }
  // ladders: side walls from the tier-2 platform up to the catwalk (the rack ladders continue), end walls from the deck
  for (const s of [-1, 1]) for (const z of LADDER_Z) ladder(B, kit, s * inX, z, RACK.tiers[1].platformY, CATWALK.y, -s, { cage: true, collide: false });
  ladder(B, kit, HALL.z0 + P1 + 0.02, END_LADDER_X.bow, FLOOR, CATWALK.y, 1, { cage: true, plane: "z" });
  ladder(B, kit, HALL.z1 - P1 - 0.02, END_LADDER_X.aft, FLOOR, CATWALK.y, -1, { cage: true, plane: "z" });
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

  // door holes (exact) on their faces; panels keep clear of the surround (bay: jambs 2.1 m, header + lamps
  // 3.4 m; blast: the 7 m portal)
  for (const d of DOORS) {
    const o = doorOpening(d);
    const wall = d.dir[0] > 0 ? byName.starboard : d.dir[0] < 0 ? byName.port : d.dir[2] > 0 ? byName.aft : byName.bow;
    const hatch = d.kind === "hatch", blast = d.kind === "blast";
    const hole = { u0: wall.u(o.u0), u1: wall.u(o.u1), v0: o.v0 - FLOOR, v1: o.v1 - FLOOR, door: d, mu: hatch ? 0.3 : blast ? 3.0 : 2.5, mv: hatch ? 0.3 : blast ? 4.3 : 3.7 };
    wall.addHole(hole);
    // the panels under a bay door's giant stencil stay plain (no vent glowing through the letters)
    if (d.kind === "bay" && DOOR_LABELS[d.id]) {
      const hw = 2.0 * LABELS[DOOR_LABELS[d.id]].aspect + 0.6, cu = (hole.u0 + hole.u1) / 2, cv = bayStencilV(hole);
      wall.plainRects.push({ u0: cu - hw, u1: cu + hw, v0: cv - 2.6, v1: cv + 2.6 });
    }
  }
  // control window (aft wall): bezel is 0.6 wide, panels stay 0.3 beyond it
  const aft = byName.aft;
  aft.addHole({ u0: aft.u(WINDOW.x0), u1: aft.u(WINDOW.x1), v0: WINDOW.y0 - FLOOR, v1: WINDOW.y1 - FLOOR, window: true, mu: 0.9, mv: 0.9 });
  aft.levels = [[FLOOR, BALCONY.y - 0.6], [BALCONY.y, CEIL]];
  // the balcony plate meets the wall: keep the band/panels out of its slot; the bracket field (dark
  // recess between the blast-door portal lintel and the balcony, between the two buttress towers) has
  // its own cut
  const towerV0 = 4 + FRAME_W + 1.0 + 0.3 + 1.4 + 0.9, towerV1 = BALCONY.y - FLOOR - 0.5;
  aft.extraCuts = [
    { u0: aft.u(BALCONY.x0 - 0.3), u1: aft.u(BALCONY.x1 + 0.3), v0: BALCONY.y - FLOOR - 0.5, v1: BALCONY.y - FLOOR + 0.5 },
    { u0: aft.u(-5.0), u1: aft.u(5.0), v0: towerV0, v1: towerV1 },
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
  // buttress towers flanking both blast-door portals (x +-5.2 .. +-12.4): on the aft wall up to the
  // balcony underside (they carry its ends and the gallery ends), on the bow wall up to the gallery
  const TOWER_X = 8.8;
  const towerTops = { aft: BALCONY.y - FLOOR - 0.3 - 0.02, bow: GAL_V - CAT_T - 0.02 };
  for (const W of [byName.aft, byName.bow]) for (const s of [-1, 1]) W.towerCut(W.u(s * TOWER_X), towerTops[W.name]);
  // fire stations: two per side wall, two on the aft wall, one on the bow wall (between ribs, clear of the towers)
  fireStation(byName.starboard, byName.starboard.u(78));
  fireStation(byName.starboard, byName.starboard.u(-56));
  fireStation(byName.port, byName.port.u(78));
  fireStation(byName.port, byName.port.u(-56));
  fireStation(byName.aft, byName.aft.u(16.5));
  fireStation(byName.aft, byName.aft.u(-30));
  fireStation(byName.bow, byName.bow.u(16.5));
  // maintenance hatches (decorative, standard door size): two per side wall, one per end wall
  const hatches = { starboard: [-40, 150], port: [-40, 150], aft: [-52, 40], bow: [-40, 30] };
  const hatchCut = (W, u) => {
    W.extraCuts.push({ u0: u - 1.55, u1: u + 1.55, v0: 0, v1: 3.35 });
    W.trayCuts.push({ u0: u - 1.7, u1: u + 1.7, v0: 0, v1: H });
    W.baseCuts.push({ u0: u - 2.6, u1: u + 2.6, v0: 0, v1: 3.3 });
  };
  for (const w of walls) for (const a of hatches[w.name]) hatchCut(w, w.u(a));
  // scale cues beside every bay door: a lit crew hatch, a console and a locker row within 6 m of the jamb
  // (on the bow side of the z-15 doors, the aft side of the z-120 doors: the rack zone and the stairs
  // take the other sides)
  const bayGroups = [];
  for (const W of [byName.starboard, byName.port]) {
    for (const h of W.holes) {
      if (!h.door || h.door.kind !== "bay") continue;
      const dir = h.door.pos[2] < 60 ? -1 : 1;
      const jamb = dir < 0 ? h.u0 - FRAME_W - 0.6 - 1.05 : h.u1 + FRAME_W + 0.6 + 1.05;
      const hatchU = jamb + dir * 1.9, consoleU = jamb + dir * 4.7, lockersU = jamb + dir * 6.9;
      hatchCut(W, hatchU);
      W.baseCuts.push({ u0: Math.min(consoleU, lockersU) - 1.4, u1: Math.max(consoleU, lockersU) + 1.4, v0: 0, v1: 3.3 });
      bayGroups.push([W, hatchU, consoleU, lockersU]);
    }
  }

  // panels under the giant stencils, the designation bands and the bow signage band stay plain (no vent
  // frames or hatch lips poking through the plates)
  for (const W of [byName.bow, byName.aft]) for (const s of [-1, 1]) W.plainRects.push({ u0: W.u(s * 50) - 9.1, u1: W.u(s * 50) + 9.1, v0: 24.4, v1: 35.6 });
  byName.bow.plainRects.push({ u0: byName.bow.u(-19.2), u1: byName.bow.u(19.2), v0: 24.4, v1: 30.2 });
  // the panels over the control window band / HANGAR CONTROL sign: no vent glowing above the sign
  aft.plainRects.push({ u0: aft.u(-19.5), u1: aft.u(19.5), v0: 16, v1: 24.4 });

  // the bow wall's blast-shutter mass (between the +-20 m ribs over the gallery, under the signage
  // band): the panels stay out of its rect; buildShutter() fills it
  const SHUTTER = { u0: byName.bow.u(-18.9), u1: byName.bow.u(18.9), v0: GAL_V + 0.6, v1: 23.4 };
  byName.bow.extraCuts.push(SHUTTER);
  // the widened control-level window band on the aft wall (fake glazing either side of the real window,
  // x +-10.6 .. +-18.8, stopping short of the +-20 m ribs): panels keep out of it, and out of the two
  // vertical light columns flanking it at x +-24 (built at the end of buildWalls)
  const BAND = { v0: WINDOW.y0 - FLOOR - 0.5, v1: WINDOW.y1 - FLOOR + 0.5, x1: 18.8 };
  const COLUMN_X = 24;
  for (const s of [-1, 1]) {
    aft.extraCuts.push({ u0: aft.u(Math.min(s * 10.6, s * BAND.x1)), u1: aft.u(Math.max(s * 10.6, s * BAND.x1)), v0: BAND.v0, v1: BAND.v1 });
    aft.extraCuts.push({ u0: aft.u(s * COLUMN_X) - 0.55, u1: aft.u(s * COLUMN_X) + 0.55, v0: GAL_V + 0.5, v1: CORNICE_V - 0.3 });
  }

  for (const w of walls) w.grilleCuts();
  for (const w of walls) {
    w.backing();
    w.panels();
    w.wallFalloff();
    w.grilles();
    w.ribsBuild();
    w.floods();
    w.trays();
    for (const h of w.holes) if (h.door) w.doorSurround(h);
    for (const a of hatches[w.name]) w.dress("hatch", w.u(a));
    w.dressBase(w.plane === "x" ? ["lockers", "console", "reel", "console", "lockers", "reel"] : ["console", "lockers", "reel"]);
  }
  for (const [W, hatchU, consoleU, lockersU] of bayGroups) {
    W.dress("hatch", hatchU, "CREW ACCESS");
    W.dress("console", consoleU);
    W.dress("lockers", lockersU);
  }
  // the covered cable trench along every wall foot (side walls: outside the rack zone)
  for (const w of [byName.starboard, byName.port]) w.dressCuts.push({ u0: w.u(RACK.zoneZ0) - 0.5, u1: w.u(RACK.zoneZ1) + 0.5, v0: 0, v1: 0.1 });
  for (const w of walls) w.trench();

  // giant wall stencils: a designation panel on the bow and aft walls filling each 40-60 m bay between
  // the 24 m and 36 m bands - a 17.8 x 10.6 m black plate with steel lips carrying a worn "DECK" (15 m,
  // 3 m letters) over a worn "4" (4 m glyph) in Imperial light grey - and the side letter over the
  // forward bay of each side wall (between the rib at z -5 and the bay door surround)
  for (const W of [byName.bow, byName.aft]) {
    const N = W.N.toArray();
    for (const s of [-1, 1]) {
      const b0 = W.u(s * 50) - 8.9, b1 = W.u(s * 50) + 8.9;
      W.box("paintedMetal", PALETTE.impBlack, b0, b1, 24.7, 35.3, P1, P1 + 0.03, { faces: W.frontBit, texel: 0.5 });
      W.box("metal", HG.gunmetal, b0 - 0.1, b1 + 0.1, 24.6, 24.7, P1, P1 + 0.12);
      W.box("metal", HG.gunmetal, b0 - 0.1, b1 + 0.1, 35.3, 35.4, P1, P1 + 0.12);
      for (const u of [b0, b1]) W.box("metal", HG.gunmetal, u - 0.05, u + 0.05, 24.6, 35.4, P1, P1 + 0.12);
      label(kit, "hgDecal", "DECK", W.pos(W.u(s * 50), 32.7, P1 + 0.045), N, 15.0, { color: HG.white });
      label(kit, "hgDecal", "4", W.pos(W.u(s * 50), 27.8, P1 + 0.045), N, 5.6, { color: HG.white });
    }
  }
  label(kit, "hgDecal", "P", byName.port.pos(byName.port.u(0.3), 19.2, P1 + 0.015), byName.port.N.toArray(), 6.2, { color: HG.white });
  label(kit, "hgDecal", "S", byName.starboard.pos(byName.starboard.u(0.3), 19.2, P1 + 0.015), byName.starboard.N.toArray(), 6.2, { color: HG.white });

  // the control level's window band: one 0.6 m bezel (0.76 m deep) across x +-19.4 framing the real
  // window in the middle and a run of fake glazing either side of it (x +-10.6 .. +-18.2, the bezel's
  // side bars becoming the two main mullions), the sign over the middle, the tower bases under the
  // ends. The fake glazing is a dark blue-grey glass plate with what a viewer on the deck sees through
  // a window into a lit room 12 m up: the room's ceiling light runs as a bright line along the top,
  // console screens as small blue and amber blocks, dark mullions every 1.9 m. On a half-size frame
  // from the aperture rail the control level is then a 38 m glazed band with a lit sill line, not the
  // 20 m window of a two-storey kiosk.
  {
    const W = aft;
    const u0 = W.u(WINDOW.x0), u1 = W.u(WINDOW.x1), v0 = WINDOW.y0 - FLOOR, v1 = WINDOW.y1 - FLOOR;
    const t = 0.6, D = 0.76;
    const b0 = W.u(-BAND.x1) - t, b1 = W.u(BAND.x1) + t; // bezel outer ends
    W.box("paintedMetal", PALETTE.impDark, b0, b1, v1, v1 + t, 0.02, D, { texel: 0.5 });
    for (const [a, b] of [[b0, b0 + t], [u0 - t, u0], [u1, u1 + t], [b1 - t, b1]]) W.box("paintedMetal", PALETTE.impDark, a, b, v0 - t, v1 + t, 0.02, D, { texel: 0.5 });
    // sill split around the control-gantry hatch (its hole overlaps the window band's bottom)
    const hatch = W.holes.find((h) => h.door && h.door.kind === "hatch");
    const gap0 = hatch.u0 - FRAME_W, gap1 = hatch.u1 + FRAME_W;
    W.box("paintedMetal", PALETTE.impDark, b0, gap0, v0 - t, v0, 0.02, D, { texel: 0.5 });
    W.box("paintedMetal", PALETTE.impDark, gap1, b1, v0 - t, v0, 0.02, D, { texel: 0.5 });
    // fake glazing either side of the real window
    let k = 3;
    for (const [a, b] of [[b0 + t, u0 - t], [u1 + t, b1 - t]]) {
      W.box("hgEmit", EM.glass, a, b, v0, v1, P0, P0 + 0.01, { faces: W.frontBit });
      W.box("hgEmit", EM.window, a + 0.15, b - 0.15, v1 - 0.62, v1 - 0.34, P0 + 0.01, P0 + 0.02, { faces: W.frontBit });
      const n = Math.round((b - a) / 1.9);
      for (let i = 1; i < n; i++) W.box("paintedMetal", PALETTE.impDark, a + (i * (b - a)) / n - 0.07, a + (i * (b - a)) / n + 0.07, v0, v1, 0.02, P1 + 0.3, { texel: 0.5 });
      for (let i = 0; i < n; i++) {
        k = (k * 1103515245 + 12345) >>> 0;
        const pick = (k >>> 8) % 10;
        if (pick < 4) continue;
        const cu = a + ((i + 0.5) * (b - a)) / n + (((k >>> 16) % 7) - 3) * 0.12;
        W.box(pick < 8 ? "emitBlue" : "emitAmber", 0xffffff, cu - 0.32, cu + 0.32, v0 + 0.55, v0 + 0.92, P0 + 0.01, P0 + 0.02, { faces: W.frontBit });
      }
    }
    // bezel lip + bolt row along the top, housed blue status lights under the sill, the whole band long
    W.box("metal", HG.gunmetal, b0 + 0.5, b1 - 0.5, v1 + 0.02, v1 + 0.12, D, D + 0.05);
    for (let u = b0 + 0.9; u <= b1 - 0.9; u += 1.0) W.box("metal", HG.steel, u - 0.06, u + 0.06, v1 + 0.3, v1 + 0.42, D, D + 0.05);
    for (let u = gap1 + 0.8; u < b1 - 0.9; u += 2.5) housedLamp(B, "emitBlue", W.pos(u, v0 - 0.35, D), W.N.toArray(), [0.4, 0.1, 0.16], { inset: 0.04 });
    for (let u = b0 + 0.9; u < gap0 - 0.4; u += 2.5) housedLamp(B, "emitBlue", W.pos(u, v0 - 0.35, D), W.N.toArray(), [0.4, 0.1, 0.16], { inset: 0.04 });
    // sign "HANGAR CONTROL": tracked letters on a framed black plate, flanked by two housed light bars
    const sv = v1 + t + 1.2;
    W.box("paintedMetal", PALETTE.impBlack, u0 - 0.4, u1 + 0.4, sv - 0.75, sv + 0.75, P1, P1 + 0.015, { texel: 0.5 });
    W.box("metal", HG.steel, u0 - 0.46, u1 + 0.46, sv - 0.81, sv - 0.75, P1, P1 + 0.04);
    W.box("metal", HG.steel, u0 - 0.46, u1 + 0.46, sv + 0.75, sv + 0.81, P1, P1 + 0.04);
    label(kit, "hgSign", "HANGAR CONTROL", W.pos((u0 + u1) / 2, sv, P1 + 0.03), W.N.toArray(), 10);
    for (const u of [u0 - 1.0, u1 + 1.0]) {
      W.box("paintedMetal", PALETTE.impDark, u - 0.12, u + 0.12, sv - 0.85, sv + 0.85, P1, P1 + 0.1);
      W.box("hgEmit", EM.strip, u - 0.04, u + 0.04, sv - 0.75, sv + 0.75, P1 + 0.1, P1 + 0.11);
    }
    // bracket field between the buttress towers: dark recess over the portal lintel up to the balcony,
    // two fins between the three bracket wall plates, dark rails top and bottom
    const tu0 = W.u(-5.0), tu1 = W.u(5.0);
    W.box("paintedMetal", PALETTE.impBlack, tu0, tu1, towerV0, towerV1, P0, P0 + 0.04, { texel: 0.5 });
    for (const x of [-1.7, 1.7]) W.box("paintedMetal", PALETTE.impDark, W.u(x) - 0.14, W.u(x) + 0.14, towerV0, towerV1, P0, P0 + 0.5, { texel: 0.5 });
    W.box("paintedMetal", PALETTE.impDark, tu0, tu1, towerV0, towerV0 + 0.25, P0, P0 + 0.55, { texel: 0.5 });
    W.box("paintedMetal", PALETTE.impDark, tu0, tu1, towerV1 - 0.25, towerV1, P0, P0 + 0.55, { texel: 0.5 });
  }

  // buttress towers: aft wall up to the balcony plate (the fascia girder runs across their fronts, so
  // the lamps and the window band stop under it), bow wall up to the gallery plate
  {
    const gB = BALCONY.y - 0.3 - 0.8 - FLOOR; // girder bottom, wall-local v
    for (const s of [-1, 1]) {
      aft.tower(aft.u(s * TOWER_X), towerTops.aft, { beacon: false, faceTop: gB - 0.25 });
      byName.bow.tower(byName.bow.u(s * TOWER_X), towerTops.bow);
    }
  }

  // bow wall: a wide lit signage band between the +-20 m ribs at 25-30 m (the vanishing point of the
  // deck view gets a lit feature 240 m away, not a dim plane): black plate with steel lips, a housed-
  // level strip along its top and bottom edges, the forward-sections legend lit white and SEALED in red
  {
    const W = byName.bow, N = W.N.toArray();
    const u0 = W.u(-18.9), u1 = W.u(18.9), v0 = 24.7, v1 = 29.9;
    W.box("paintedMetal", PALETTE.impBlack, u0, u1, v0, v1, P1, P1 + 0.05, { faces: W.faces, texel: 0.5 });
    W.box("metal", HG.steel, u0 - 0.1, u1 + 0.1, v0 - 0.12, v0, P1, P1 + 0.14);
    W.box("metal", HG.steel, u0 - 0.1, u1 + 0.1, v1, v1 + 0.12, P1, P1 + 0.14);
    W.box("hgEmit", EM.strip, u0 + 0.3, u1 - 0.3, v0 + 0.25, v0 + 0.37, P1 + 0.05, P1 + 0.06);
    W.box("hgEmit", EM.strip, u0 + 0.3, u1 - 0.3, v1 - 0.37, v1 - 0.25, P1 + 0.05, P1 + 0.06);
    label(kit, "hgSign", "FORWARD SECTIONS", W.pos(W.u(0), 28.1, P1 + 0.065), N, 19.2);
    label(kit, "hgSignRed", "SEALED", W.pos(W.u(0), 25.9, P1 + 0.065), N, 6.0);
    for (const s of [-1, 1]) {
      W.box("paintedMetal", PALETTE.impDark, W.u(s * 14) - 0.3, W.u(s * 14) + 0.3, v0 + 0.6, v1 - 0.6, P1 + 0.05, P1 + 0.25, { texel: 0.5 });
      redBeacon(B, W.pos(W.u(s * 14), (v0 + v1) / 2, P1 + 0.25), N, 0.7);
    }
  }

  // bow wall: the blast-shutter mass under the signage band - a sealed 37.8 x 10.8 m shutter of five
  // 2 m leaves in a black surround between two guide columns, each leaf a dark slab with a light steel
  // lip along its bottom edge and a mid-grey wear band, the bottom leaf carrying a hazard stripe and
  // a "SEALED" plate, red beacons on the columns. Between tile scale and stencil scale: from the spawn
  // 230 m away it is a banded dark mass over the bow portal that the FORWARD SECTIONS legend sits on.
  {
    const W = byName.bow, N = W.N.toArray();
    const { u0, u1, v0, v1 } = SHUTTER;
    W.box("paintedMetal", PALETTE.impBlack, u0, u1, v0, v1, P0, P0 + 0.06, { faces: W.frontBit, texel: 0.5 });
    const leafN = 5, lh = (v1 - v0 - 0.8) / leafN, lu0 = u0 + 1.5, lu1 = u1 - 1.5;
    for (let i = 0; i < leafN; i++) {
      const a = v0 + 0.4 + i * lh, b = a + lh;
      W.box("paintedMetal", PALETTE.impDark, lu0, lu1, a + 0.08, b - 0.02, P0 + 0.06, P0 + 0.62, { faces: W.frontBit | PY | NY, texel: 0.5 });
      W.box("metal", HG.steel, lu0, lu1, a, a + 0.1, P0 + 0.06, P0 + 0.7, { faces: ALL & ~W.backBit });
      W.box("paintedMetal", PALETTE.impMid, lu0 + 0.3, lu1 - 0.3, b - 0.5, b - 0.14, P0 + 0.62, P0 + 0.64, { faces: W.frontBit, texel: 0.5 });
      // stiffener ribs across each leaf every 6 m
      for (let u = lu0 + 3; u < lu1 - 1; u += 6) W.box("paintedMetal", PALETTE.impDark, u - 0.12, u + 0.12, a + 0.1, b - 0.02, P0 + 0.62, P0 + 0.7, { faces: ALL & ~W.backBit, texel: 0.5 });
    }
    const [hm, hx] = W.aabb(lu0 + 0.2, lu1 - 0.2, v0 + 0.42, v0 + 0.72, P0 + 0.64, P0 + 0.66);
    B.boxMM("hazard", 0xffffff, hm, hx, { faces: W.frontBit, texel: 1 });
    label(kit, "hgSignRed", "SEALED", W.pos(W.u(0), v0 + 1.6, P0 + 0.65), N, 5.0);
    for (const [a, b] of [[u0, lu0], [lu1, u1]]) {
      // guide columns: dark body proud of the leaves, steel edge trims, a red beacon at the top
      W.box("paintedMetal", PALETTE.impDark, a, b, v0, v1, P0, P0 + 0.9, { faces: ALL & ~W.backBit, texel: 0.5 });
      W.box("metal", HG.steel, a + 0.15, b - 0.15, v0 + 0.2, v1 - 0.2, P0 + 0.9, P0 + 0.94, { faces: W.frontBit });
      redBeacon(B, W.pos((a + b) / 2, v1 - 0.9, P0 + 0.94), N, 0.6);
    }
    // header beam over the shutter with a housed lamp row lighting the leaves
    W.box("paintedMetal", PALETTE.impDark, u0 - 0.2, u1 + 0.2, v1 - 0.4, v1, P0, P0 + 1.1, { faces: ALL & ~W.backBit & ~PY, texel: 0.5 });
    for (let u = u0 + 4; u < u1 - 2; u += 6) housedLamp(B, "hgEmit", W.pos(u, v1 - 0.401, P0 + 0.85), DOWN, [1.2, 0.16, 0.3], { inset: 0.04, lampColor: EM.lens });
    W.grad("down", (u0 + u1) / 2, v0 - 0.02, 1.4, u1 - u0);
  }

  // aft wall: two vertical light columns flanking the control level's window band (x +-24, outside the
  // +-20 m ribs, from over the gallery to under the cornice, broken for the catwalk plate) - 0.5 m housed
  // channels with 4 m lenses on the column level, joints and caps: the balcony's end wall gets a 45 m
  // tall lit feature either side of the control level, which reads from the aperture rail 70 m away as
  // a pair of dotted vertical lines
  {
    const W = aft, N = W.N.toArray();
    const catV0 = CAT_V - CAT_T - 0.3, catV1 = CAT_V + 0.3;
    for (const s of [-1, 1]) {
      const u = W.u(s * COLUMN_X);
      for (const [a, b] of [[GAL_V + 0.6, catV0], [catV1, CORNICE_V - 0.4]]) {
        W.box("paintedMetal", PALETTE.impDark, u - 0.45, u + 0.45, a, b, P0, P1 + 0.2, { faces: ALL & ~W.backBit, texel: 0.5 });
        litChannel(B, PALETTE, W.pos(u, a + 0.1, P1 + 0.42), W.pos(u, b - 0.1, P1 + 0.42), N, { w: 0.5, depth: 0.22, lensW: 0.24, level: EM.column, seg: 4, gap: 0.3, cap: 0.4, off: 0.08, seed: s + 9 });
      }
      W.grad("u+", u + 0.45, (GAL_V + CORNICE_V) / 2, 1.0, CORNICE_V - GAL_V - 1, null, 0.6);
      W.grad("u-", u - 0.45, (GAL_V + CORNICE_V) / 2, 1.0, CORNICE_V - GAL_V - 1, null, 0.6);
    }
  }

  buildBalcony(ctx, B);
  buildWalkways(ctx, B, byName);
  buildCeiling(ctx, B);
  B.flush();
  return walls;
}
