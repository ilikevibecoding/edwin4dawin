// Automatic sliding doors. Each door owns a short passage (floor, ceiling, side walls) that spans the
// gap between its two rooms, a frame, two sliding leaves, a status light and a collider that is
// disabled while open. Standard doors open on approach; blast doors are heavier and slower; lift
// doors are driven by the turbolift system.
import * as THREE from "three";
import { Kit } from "./kit.js";
import { ROOM_BY_ID, roomBounds } from "./spec.js";
import { PALETTE } from "./materials.js";
import { impDecalRect, IMP_DECAL } from "./textures_imperial.js";

const SPEEDS = { std: 2.6, blast: 1.1, lift: 2.2 };
const HOLD = 1.1; // seconds a door stays open after the trigger volume empties

export class Door {
  constructor(spec, { materials, audio = null }) {
    this.spec = spec;
    this.id = spec.id;
    this.type = spec.type;
    this.axis = spec.axis;
    this.w = spec.w;
    this.h = spec.h;
    this.pos = new THREE.Vector3(...spec.pos);
    this.openness = 0;
    this.target = 0;
    this.locked = spec.type === "lift";
    this.holdTimer = 0;
    this.audio = audio;
    this.group = new THREE.Group();
    this.group.name = "door:" + spec.id;
    this.group.position.copy(this.pos);
    // the passage runs along `axis`; the leaves slide along `across`
    this.along = this.axis === "z" ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    this.across = this.axis === "z" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    // rotate the group so local +Z is the passage direction
    if (this.axis === "x") this.group.rotation.y = Math.PI / 2;
    this.build(materials);
    this.wasOpen = false;
  }

  /** Passage extent along the axis, from room A's inner wall face to room B's. */
  passageSpan() {
    if (this.spec.span) return this.spec.span;
    const a = roomBounds(ROOM_BY_ID[this.spec.a]);
    const b = roomBounds(ROOM_BY_ID[this.spec.b]);
    const k = this.axis;
    const c = this.pos[k];
    // faces nearest the door on each side
    const candidates = [a.min[k], a.max[k], b.min[k], b.max[k]];
    let lo = -Infinity;
    let hi = Infinity;
    for (const v of candidates) {
      if (v <= c + 0.05 && v > lo) lo = v;
      if (v >= c - 0.05 && v < hi) hi = v;
    }
    if (!isFinite(lo)) lo = c - 0.2;
    if (!isFinite(hi)) hi = c + 0.2;
    if (hi - lo < 0.3) {
      lo = c - 0.2;
      hi = c + 0.2;
    }
    return [lo - c, hi - c]; // relative to the door centre
  }

  build(materials) {
    const kit = new Kit(materials);
    const { w, h } = this;
    const [z0, z1] = this.passageSpan();
    const len = z1 - z0;
    const zc = (z0 + z1) / 2;
    const blast = this.type === "blast";
    const big = w > 6;
    const t = big ? 0.6 : 0.3; // frame thickness
    const wallT = 0.4;
    const trim = big ? 0.5 : 0.22;
    // --- passage shell: floor, ceiling, side walls (only if the passage is longer than a wall)
    kit.boxMM("impDeck", [-w / 2 - trim, -0.14, z0], [w / 2 + trim, 0, z1], { color: PALETTE.impGreyDark, texel: big ? 0.15 : 0.5 });
    kit.boxMM("impTrim", [-w / 2 - trim, h, z0], [w / 2 + trim, h + trim + 0.2, z1], { color: PALETTE.impBlack, texel: 0.5 });
    for (const s of [-1, 1]) {
      const x0 = s * (w / 2);
      const x1 = s * (w / 2 + trim + wallT);
      kit.boxMM(big ? "impMetalRough" : "impPanel1", [Math.min(x0, x1), 0, z0], [Math.max(x0, x1), h + 0.01, z1], { color: big ? PALETTE.impGreyDark : PALETTE.impGrey, uv: "world", texel: big ? 0.25 : 1 });
      kit.collider([Math.min(x0, x1) - 0.02, 0, z0 - 0.02], [Math.max(x0, x1) + 0.02, h + trim, z1 + 0.02], "jamb");
    }
    // threshold plate
    kit.boxMM(blast ? "chevronY" : "impMetal", [-w / 2, -0.005, -0.25], [w / 2, 0.012, 0.25], { color: blast ? 0xffffff : PALETTE.impGreyDark, texel: blast ? 1.2 : 2 });
    // --- frame ring at the door plane, proud on both faces
    // frame depth along the passage: proud of both room faces when the rooms share a wall
    const fd = len < 1.4 ? len + 0.24 : big ? 0.9 : 0.36;
    for (const s of [-1, 1]) {
      kit.boxMM("impTrim", [s > 0 ? w / 2 : -w / 2 - t, 0, -fd / 2], [s > 0 ? w / 2 + t : -w / 2, h + t, fd / 2], { color: PALETTE.impBlack, texel: 1 });
    }
    kit.boxMM("impTrim", [-w / 2 - t, h, -fd / 2], [w / 2 + t, h + t, fd / 2], { color: PALETTE.impBlack, texel: 1 });
    // header light strip (white) + status lamp housing on both faces
    for (const s of [-1, 1]) {
      const zf = s * (fd / 2 + 0.01);
      kit.boxMM("impMetal", [-w / 2 + 0.2, h + t * 0.25, Math.min(zf, zf + s * 0.05)], [w / 2 - 0.2, h + t * 0.75, Math.max(zf, zf + s * 0.05)], { color: PALETTE.impCharcoal, texel: 2 });
      kit.boxMM("emitWhiteSoft", [-w / 2 + 0.3, h + t * 0.35, Math.min(zf + s * 0.05, zf + s * 0.07)], [w / 2 - 0.3, h + t * 0.65, Math.max(zf + s * 0.05, zf + s * 0.07)], { uv: "keep" });
      // door class decal on the frame post
      const g = new THREE.PlaneGeometry(Math.min(0.3, t * 0.9), Math.min(0.3, t * 0.9));
      if (s < 0) g.rotateY(Math.PI);
      kit.add("decalImp", g, { pos: [w / 2 + t / 2, 1.5, zf + s * 0.002], uv: "keep", uvRect: impDecalRect(blast ? IMP_DECAL.hazard : this.type === "lift" ? IMP_DECAL.turbolift : IMP_DECAL.glyphs1) });
      // number plate
      const g2 = new THREE.PlaneGeometry(Math.min(0.3, t * 0.9), Math.min(0.3, t * 0.9));
      if (s < 0) g2.rotateY(Math.PI);
      kit.add("decalImp", g2, { pos: [-w / 2 - t / 2, 1.5, zf + s * 0.002], uv: "keep", uvRect: impDecalRect([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][this.id.length % 3]) });
    }
    if (big) {
      // heavy blast door: hydraulic rams and track housings above the leaves, chevrons on the floor lane
      for (const x of [-w * 0.3, 0, w * 0.3]) {
        kit.cyl("impMetal", x, h + t + 0.5, 0, 0.35, 1.4, "y", { color: PALETTE.impGreyDark, segments: 14 });
        kit.box("impTrim", x, h + t + 1.3, 0, 1.2, 0.5, 1.2, { color: PALETTE.impBlack });
      }
      kit.boxMM("chevronY", [-w / 2, -0.002, -len / 2 - 0.5], [w / 2, 0.006, -0.3], { texel: 0.6 });
      kit.boxMM("chevronY", [-w / 2, -0.002, 0.3], [w / 2, 0.006, len / 2 + 0.5], { texel: 0.6 });
    } else {
      // recessed side lights in the passage walls (blue), like turbolift vestibules
      for (const s of [-1, 1]) {
        kit.boxMM("emitBlue", [s > 0 ? w / 2 - 0.005 : -w / 2 - 0.02, 0.25, z0 + 0.1], [s > 0 ? w / 2 + 0.02 : -w / 2 + 0.005, 0.32, z1 - 0.1]);
      }
    }
    // status lamps: red (closed) and blue (open) — swapped by visibility
    this.lampClosed = new THREE.Group();
    this.lampOpen = new THREE.Group();
    for (const s of [-1, 1]) {
      const zf = s * (fd / 2 + 0.04);
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), materials.emitRedImp);
      r.position.set(w / 2 + t / 2, h + t * 0.5, zf);
      this.lampClosed.add(r);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), materials.emitBlue);
      b.position.set(w / 2 + t / 2, h + t * 0.5, zf);
      this.lampOpen.add(b);
    }
    this.lampOpen.visible = false;
    this.group.add(this.lampClosed, this.lampOpen);

    // --- leaves
    const leafT = big ? 0.5 : blast ? 0.24 : 0.14;
    const leafW = w / 2 + 0.06;
    this.leaves = [];
    for (const s of [-1, 1]) {
      const lk = new Kit(materials);
      const x0 = s > 0 ? 0 : -leafW;
      const x1 = s > 0 ? leafW : 0;
      if (blast) {
        lk.boxMM("impMetalRough", [x0, 0.02, -leafT / 2], [x1, h - 0.02, leafT / 2], { color: PALETTE.impGreyDark, uv: "world", texel: big ? 0.25 : 1 });
        // raised armour bands
        for (const yy of big ? [h * 0.2, h * 0.5, h * 0.8] : [h * 0.3, h * 0.7]) {
          lk.boxMM("impTrim", [x0 + 0.05, yy - (big ? 0.5 : 0.12), -leafT / 2 - 0.03], [x1 - 0.05, yy + (big ? 0.5 : 0.12), leafT / 2 + 0.03], { color: PALETTE.impBlack, texel: 1 });
        }
        lk.boxMM("chevronR", [s > 0 ? x0 : x1 - (big ? 0.6 : 0.18), 0.4, -leafT / 2 - 0.035], [s > 0 ? x0 + (big ? 0.6 : 0.18) : x1, h - 0.4, leafT / 2 + 0.035], { texel: big ? 0.6 : 3 });
        if (big) {
          // warning lamps on the leading edge
          for (const yy of [h * 0.25, h * 0.75]) lk.box("emitAmber", s > 0 ? x0 + 0.3 : x1 - 0.3, yy, -leafT / 2 - 0.06, 0.3, 0.3, 0.06);
        }
      } else {
        lk.boxMM("impPanel", [x0, 0.02, -leafT / 2], [x1, h - 0.02, leafT / 2], { color: PALETTE.impGrey, uv: "world", texel: 1 });
        // recessed dark centre panel with a slim vertical light bar on the leading edge
        lk.boxMM("impTrim", [x0 + 0.12, 0.35, -leafT / 2 - 0.012], [x1 - 0.12, h - 0.35, leafT / 2 + 0.012], { color: PALETTE.impCharcoal, texel: 1 });
        lk.boxMM("impPanel2", [x0 + 0.18, 0.42, -leafT / 2 - 0.02], [x1 - 0.18, h - 0.42, leafT / 2 + 0.02], { color: PALETTE.impWhite, uv: "world", texel: 1 });
        const ex = s > 0 ? x0 + 0.04 : x1 - 0.06;
        lk.boxMM(this.type === "lift" ? "emitWhite" : "emitBlue", [ex, 0.5, -leafT / 2 - 0.022], [ex + 0.02, h - 0.5, leafT / 2 + 0.022]);
        // kick plate
        lk.boxMM("impMetal", [x0, 0.02, -leafT / 2 - 0.01], [x1, 0.3, leafT / 2 + 0.01], { color: PALETTE.impCharcoal, texel: 2 });
      }
      const leaf = new THREE.Group();
      lk.build(leaf);
      leaf.userData.side = s;
      this.group.add(leaf);
      this.leaves.push(leaf);
    }
    kit.build(this.group);
    // world colliders: passage side walls (from the kit, rotated into world) and the leaves
    this.colliders = [];
    const rot = this.group.rotation.y;
    const toWorld = (v) => v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(this.pos);
    for (const c of kit.colliders) {
      const a = toWorld(c.min);
      const b = toWorld(c.max);
      this.colliders.push({ min: new THREE.Vector3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)), max: new THREE.Vector3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)), tag: "door-jamb" });
    }
    const la = toWorld(new THREE.Vector3(-w / 2, 0, -0.2));
    const lb = toWorld(new THREE.Vector3(w / 2, h, 0.2));
    this.leafCollider = { min: new THREE.Vector3(Math.min(la.x, lb.x), Math.min(la.y, lb.y), Math.min(la.z, lb.z)), max: new THREE.Vector3(Math.max(la.x, lb.x), Math.max(la.y, lb.y), Math.max(la.z, lb.z)), tag: "door", disabled: false };
    this.colliders.push(this.leafCollider);
    this.triggerAlong = big ? 9 : blast ? 3.0 : 2.4;
    this.triggerAcross = w / 2 + (big ? 2.5 : 1.0);
  }

  /** True when p (world) is inside the approach volume. */
  inTrigger(p) {
    const d = p.clone().sub(this.pos);
    if (Math.abs(d.y) > 3) return false;
    const along = Math.abs(d.dot(this.along));
    const across = Math.abs(d.dot(this.across));
    return along < this.triggerAlong && across < this.triggerAcross;
  }

  open() {
    this.target = 1;
  }
  close() {
    this.target = 0;
  }

  update(dt, playerPos) {
    if (!this.locked) {
      if (playerPos && this.inTrigger(playerPos)) {
        this.target = 1;
        this.holdTimer = HOLD;
      } else if (this.target === 1) {
        this.holdTimer -= dt;
        if (this.holdTimer <= 0) this.target = 0;
      }
    }
    const speed = SPEEDS[this.type] || 2;
    const prev = this.openness;
    if (this.openness < this.target) this.openness = Math.min(this.target, this.openness + dt * speed);
    else if (this.openness > this.target) this.openness = Math.max(this.target, this.openness - dt * speed);
    if (prev !== this.openness) {
      // ease: fast start, soft stop
      const e = this.openness < 1 ? 1 - Math.pow(1 - this.openness, 2.2) : 1;
      const travel = this.w / 2 + 0.12;
      for (const leaf of this.leaves) leaf.position.x = leaf.userData.side * e * travel;
      this.leafCollider.disabled = this.openness > 0.6;
      const nowOpen = this.openness > 0.5;
      if (nowOpen !== this.wasOpen) {
        this.wasOpen = nowOpen;
        this.lampClosed.visible = !nowOpen;
        this.lampOpen.visible = nowOpen;
      }
      if (this.audio) {
        if (prev === 0 && this.openness > 0) this.audio.play(this.type === "blast" ? "blast_open" : "door_open", this.pos);
        if (this.openness === 0 && prev > 0) this.audio.play(this.type === "blast" ? "blast_close" : "door_close", this.pos);
      }
    }
  }

  updateVisibility(visibleIds) {
    this.group.visible = visibleIds.has(this.spec.a) || visibleIds.has(this.spec.b);
  }

  /** Network-friendly state */
  getState() {
    return { id: this.id, o: +this.openness.toFixed(3), t: this.target };
  }
  setState(s) {
    this.target = s.t;
    this.openness = s.o;
  }
}

/** Build every door in the spec. Returns the Door instances and a group holding them. */
export function buildDoors(doorSpecs, cells, { materials, audio }) {
  const group = new THREE.Group();
  group.name = "doors";
  const list = [];
  for (const spec of doorSpecs) {
    if (!cells.cells.has(spec.a) || !cells.cells.has(spec.b)) continue;
    const d = new Door(spec, { materials, audio });
    group.add(d.group);
    for (const c of d.colliders) cells.addCollider(c);
    cells.doors.set(d.id, d);
    list.push(d);
  }
  return { group, doors: list };
}
