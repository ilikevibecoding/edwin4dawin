// Sliding doors between sectors: frame (jambs / lintel / sill through the wall gap), animated leaves,
// proximity auto-open with hysteresis, dynamic colliders, and audio / anim hooks. Also the visibility
// edge between its two sectors. Turbolift doors are driven by the lift instead of by proximity.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { Kit } from "../kit.js";
import { decalRect } from "../textures.js";
import { JAMB } from "./imperial.js";

const STYLE = {
  single: { leaves: 2, thick: 0.1, speed: 1.4, radius: 2.6, color: PALETTE.impLight, lamp: "emitBlue" },
  double: { leaves: 2, thick: 0.12, speed: 1.1, radius: 3.0, color: PALETTE.impLight, lamp: "emitBlue" },
  blast: { leaves: 2, thick: 0.3, speed: 0.55, radius: 4.2, color: PALETTE.impMid, lamp: "emitRed", hazard: true },
  secure: { leaves: 2, thick: 0.14, speed: 1.0, radius: 2.6, color: PALETTE.impGrey, lamp: "emitRed", keypad: true },
  lift: { leaves: 2, thick: 0.1, speed: 1.3, radius: 0, color: PALETTE.impLight, lamp: "emitAmber", manual: true },
  open: { leaves: 0, thick: 0, speed: 0, radius: 0, color: PALETTE.impLight, lamp: "emitWhite" },
};

export class Door {
  /**
   * @param def layout door def
   * @param deck layout deck
   * @param boundsA / boundsB local bounds of the two sectors
   * @param frameKit shared kit for the static frame geometry (deck-local coordinates)
   * @param materials material dictionary
   */
  constructor(def, deck, boundsA, boundsB, frameKit, materials) {
    this.def = def;
    this.deck = deck;
    this.style = STYLE[def.style] || STYLE.single;
    this.materials = materials;
    this.openness = 0;
    this.target = 0;
    this.state = "closed";
    this.manual = !!this.style.manual;
    this.locked = false; // locked doors close and ignore proximity (security / gameplay)
    this.holdState = null; // true = held open, false = held shut, null = normal
    this.leaves = [];
    this.group = new THREE.Group();
    this.group.name = "door_" + def.a + "_" + def.b;
    this.colliders = [];
    this.onEvent = null; // (name, worldPos) => void
    const [px, pz] = def.pos;
    const along = def.wall; // leaves slide along this axis
    // gap between the two sectors along the crossing axis
    const cross = along === "x" ? 2 : 0;
    const vals = [boundsA[0][cross], boundsA[1][cross], boundsB[0][cross], boundsB[1][cross]];
    const c = along === "x" ? pz : px;
    const lo = Math.max(...vals.filter((v) => v <= c + 1e-6), c - 0.2);
    const hi = Math.min(...vals.filter((v) => v >= c - 1e-6), c + 0.2);
    this.depth = Math.max(0.3, hi - lo);
    this.center = new THREE.Vector3(px, def.h / 2, pz);
    this.worldCenter = this.center.clone().add(new THREE.Vector3(...deck.origin));
    this.buildFrame(frameKit, lo, hi);
    this.buildLeaves();
  }

  // local (u along the wall, n across the wall) -> deck-local xz
  place(u, n) {
    const [px, pz] = this.def.pos;
    return this.def.wall === "x" ? [px + u, pz + n] : [px + n, pz + u];
  }

  boxUN(kit, mat, u0, u1, y0, y1, n0, n1, opts = {}) {
    const [ax, az] = this.place(u0, n0);
    const [bx, bz] = this.place(u1, n1);
    kit.boxMM(mat, [Math.min(ax, bx), y0, Math.min(az, bz)], [Math.max(ax, bx), y1, Math.max(az, bz)], opts);
  }

  buildFrame(kit, lo, hi) {
    const { w, h } = this.def;
    const c = this.def.wall === "x" ? this.def.pos[1] : this.def.pos[0];
    const n0 = lo - c - 0.03;
    const n1 = hi - c + 0.03;
    const st = this.style;
    const dark = PALETTE.impDark;
    // jambs + lintel through the whole gap
    this.boxUN(kit, "paintedMetal", -w / 2 - JAMB, -w / 2, 0, h + JAMB, n0, n1, { color: dark, texel: 1.2 });
    this.boxUN(kit, "paintedMetal", w / 2, w / 2 + JAMB, 0, h + JAMB, n0, n1, { color: dark, texel: 1.2 });
    this.boxUN(kit, "paintedMetal", -w / 2 - JAMB, w / 2 + JAMB, h, h + JAMB, n0, n1, { color: dark, texel: 1.2 });
    // inner bevel strips (lighter) on both faces
    for (const n of [n0, n1]) {
      const nn = n < 0 ? [n, n + 0.05] : [n - 0.05, n];
      this.boxUN(kit, "impPanel", -w / 2 - JAMB - 0.04, -w / 2 - JAMB, 0, h + JAMB + 0.04, nn[0], nn[1], { color: PALETTE.impGrey, uv: "keep" });
      this.boxUN(kit, "impPanel", w / 2 + JAMB, w / 2 + JAMB + 0.04, 0, h + JAMB + 0.04, nn[0], nn[1], { color: PALETTE.impGrey, uv: "keep" });
      this.boxUN(kit, "impPanel", -w / 2 - JAMB - 0.04, w / 2 + JAMB + 0.04, h + JAMB, h + JAMB + 0.04, nn[0], nn[1], { color: PALETTE.impGrey, uv: "keep" });
      // lintel lamp on each face
      const lampN = n < 0 ? [n - 0.012, n] : [n, n + 0.012];
      this.boxUN(kit, st.lamp, -Math.min(0.5, w * 0.3), Math.min(0.5, w * 0.3), h + JAMB * 0.35, h + JAMB * 0.35 + 0.05, lampN[0], lampN[1]);
      if (st.keypad) {
        // keypad box beside the door on each face
        this.boxUN(kit, "paintedMetal", w / 2 + JAMB + 0.1, w / 2 + JAMB + 0.34, 1.15, 1.5, n < 0 ? n - 0.08 : n, n < 0 ? n : n + 0.08, { color: dark, texel: 2 });
        this.boxUN(kit, "impScreen3", w / 2 + JAMB + 0.13, w / 2 + JAMB + 0.31, 1.3, 1.46, n < 0 ? n - 0.086 : n + 0.08, n < 0 ? n - 0.08 : n + 0.086, { uv: "keep" });
        this.boxUN(kit, "emitRed", w / 2 + JAMB + 0.13, w / 2 + JAMB + 0.31, 1.18, 1.24, n < 0 ? n - 0.086 : n + 0.08, n < 0 ? n - 0.08 : n + 0.086);
      }
    }
    // sill: dark plate with a hazard edge on the floor through the gap
    this.boxUN(kit, "paintedMetal", -w / 2, w / 2, -0.01, 0.012, n0, n1, { color: PALETTE.impBlack, texel: 2 });
    if (st.hazard || st.leaves === 0) this.boxUN(kit, "hazard", -w / 2, w / 2, 0.012, 0.018, n0 + 0.05, n1 - 0.05, { texel: 3 });
    // recessed track light in the lintel underside (white) so the doorway reads from both rooms
    this.boxUN(kit, "emitWhite", -w / 2 + 0.2, w / 2 - 0.2, h - 0.02, h, (n0 + n1) / 2 - 0.03, (n0 + n1) / 2 + 0.03);
    // jamb colliders (deck-local; the interior offsets them to world)
    const [ax, az] = this.place(-w / 2 - JAMB, n0);
    const [bx, bz] = this.place(-w / 2, n1);
    this.frameColliders = [
      { min: [Math.min(ax, bx), 0, Math.min(az, bz)], max: [Math.max(ax, bx), h + JAMB, Math.max(az, bz)] },
    ];
    const [cx, cz] = this.place(w / 2, n0);
    const [dx, dz] = this.place(w / 2 + JAMB, n1);
    this.frameColliders.push({ min: [Math.min(cx, dx), 0, Math.min(cz, dz)], max: [Math.max(cx, dx), h + JAMB, Math.max(cz, dz)] });
  }

  buildLeaves() {
    const st = this.style;
    if (!st.leaves) return;
    const { w, h } = this.def;
    const kitMats = this.materials;
    const leafW = w / 2 + 0.02;
    for (const s of [-1, 1]) {
      const kit = new Kit(kitMats);
      // leaf slab with a bevelled inner edge, a recessed panel, a vertical light bar near the seam
      const u0 = s < 0 ? -leafW : 0.0;
      const u1 = s < 0 ? 0.0 : leafW;
      const t = st.thick;
      const mid = (u0 + u1) / 2;
      const mk = (mat, a, b, y0, y1, n0, n1, opts = {}) => {
        const [ax, az] = this.place(a, n0);
        const [bx, bz] = this.place(b, n1);
        kit.boxMM(mat, [Math.min(ax, bx), y0, Math.min(az, bz)], [Math.max(ax, bx), y1, Math.max(az, bz)], opts);
      };
      mk("impPanel1", u0, u1, 0.02, h - 0.02, -t / 2, t / 2, { color: st.color, uv: "keep" });
      // seam edge (dark) and recessed centre plate on both faces
      mk("paintedMetal", s < 0 ? -0.06 : 0.0, s < 0 ? 0.0 : 0.06, 0.02, h - 0.02, -t / 2 - 0.004, t / 2 + 0.004, { color: PALETTE.impBlack, texel: 2 });
      for (const f of [-1, 1]) {
        const n = f * (t / 2 + 0.01);
        mk("impPanel", mid + (s < 0 ? 0.03 : -0.03) - (leafW - 0.3) / 2, mid + (s < 0 ? 0.03 : -0.03) + (leafW - 0.3) / 2, 0.35, h - 0.45, Math.min(n, n - f * 0.012), Math.max(n, n - f * 0.012), { color: PALETTE.impGrey, uv: "keep" });
        mk("paintedMetal", mid - (leafW - 0.3) / 2, mid + (leafW - 0.3) / 2, 0.02, 0.3, Math.min(n, n - f * 0.008), Math.max(n, n - f * 0.008), { color: PALETTE.impDark, texel: 2 });
        if (st.hazard) mk("hazard", s < 0 ? -0.5 : 0.14, s < 0 ? -0.14 : 0.5, h * 0.42, h * 0.58, Math.min(n, n - f * 0.004), Math.max(n, n - f * 0.004), { texel: 3 });
        // full-height seam lamp: blue when idle, red on blast / secure doors — the leaves must read
        // as leaves from either side even in a dim corridor
        mk(st.lamp, s < 0 ? -0.14 : 0.09, s < 0 ? -0.09 : 0.14, 0.15, h - 0.2, Math.min(n, n - f * 0.006), Math.max(n, n - f * 0.006));
        if (st.hazard) mk("hazard", u0 + 0.08, u1 - 0.08, h - 0.32, h - 0.12, Math.min(n, n - f * 0.004), Math.max(n, n - f * 0.004), { texel: 3 });
        if (st.keypad || st.hazard) {
          const g = new THREE.PlaneGeometry(0.3, 0.3);
          const [gx, gz] = this.place(mid, n - f * 0.002);
          g.rotateY(this.def.wall === "x" ? (f > 0 ? 0 : Math.PI) : f > 0 ? Math.PI / 2 : -Math.PI / 2);
          kit.add("decal", g, { pos: [gx, h * 0.72, gz], uv: "keep", uvRect: decalRect(st.hazard ? 4 : 10) });
        }
      }
      const meshes = kit.build(this.group, { castShadow: true, receiveShadow: true });
      const leaf = new THREE.Group();
      for (const m of meshes) leaf.add(m);
      this.group.add(leaf);
      this.leaves.push({ group: leaf, side: s });
    }
    // closed-door collider (deck-local)
    const [ax, az] = this.place(-w / 2, -st.thick / 2 - 0.05);
    const [bx, bz] = this.place(w / 2, st.thick / 2 + 0.05);
    this.leafCollider = { min: [Math.min(ax, bx), 0, Math.min(az, bz)], max: [Math.max(ax, bx), h, Math.max(az, bz)], enabled: true, tag: "door" };
  }

  /** One-shot request; proximity logic takes over again next frame unless the door is manual / held. */
  setOpen(open) {
    this.target = open ? 1 : 0;
  }
  /** Lock (and by default close) the door: it stays shut until unlock(). Emits "door_locked". */
  lock(close = true) {
    this.locked = true;
    if (close) this.target = 0;
    if (this.onEvent) this.onEvent("door_locked", this.worldCenter);
  }
  unlock() {
    this.locked = false;
    if (this.onEvent) this.onEvent("door_unlocked", this.worldCenter);
  }
  /** Hold the door open (true) or shut (false) regardless of the player; null releases the hold. */
  hold(open) {
    this.holdState = open === null || open === undefined ? null : !!open;
    if (this.holdState !== null) this.target = this.holdState ? 1 : 0;
  }

  get isOpen() {
    return this.openness > 0.95;
  }

  get isClosed() {
    return this.openness < 0.02;
  }

  /** @param playerPos world position (feet). `active` false when neither sector is visible. */
  update(dt, playerPos, active) {
    if (!this.style.leaves) return;
    if (this.holdState !== null) this.target = this.holdState ? 1 : 0;
    else if (this.locked) this.target = 0;
    else if (!this.manual && active) {
      const dx = playerPos.x - this.worldCenter.x;
      const dz = playerPos.z - this.worldCenter.z;
      const dy = playerPos.y - (this.worldCenter.y - this.def.h / 2);
      const d = Math.hypot(dx, dz);
      const r = this.style.radius;
      if (Math.abs(dy) < 2.5) {
        if (d < r) this.target = 1;
        else if (d > r + 1.2) this.target = 0;
      } else this.target = 0;
    } else if (!this.manual && !active) this.target = 0;
    if (Math.abs(this.openness - this.target) > 1e-4) {
      const dir = Math.sign(this.target - this.openness);
      const prev = this.state;
      this.state = dir > 0 ? "opening" : "closing";
      if (prev !== this.state && this.onEvent) this.onEvent(dir > 0 ? "door_open" : "door_close", this.worldCenter);
      this.openness = THREE.MathUtils.clamp(this.openness + dir * dt * this.style.speed, 0, 1);
      if (Math.abs(this.openness - this.target) < 1e-6) this.openness = this.target; // land exactly so the state settles
      // ease: fast start, soft stop
      const e = this.openness < 0.5 ? 2 * this.openness * this.openness : 1 - Math.pow(-2 * this.openness + 2, 2) / 2;
      const travel = (this.def.w / 2 + 0.06) * e;
      for (const leaf of this.leaves) {
        const off = leaf.side * travel;
        if (this.def.wall === "x") leaf.group.position.set(off, 0, 0);
        else leaf.group.position.set(0, 0, off);
      }
      if (this.openness === this.target) {
        this.state = this.target > 0 ? "open" : "closed";
        if (this.onEvent) this.onEvent(this.state === "open" ? "door_opened" : "door_closed", this.worldCenter);
      }
    }
    if (this.leafCollider) this.leafCollider.enabled = this.openness < 0.85;
  }
}
