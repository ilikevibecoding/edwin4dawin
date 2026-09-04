// Doors: angular Imperial frames in the wall gap between two rooms, with animated slabs (rising slide doors,
// splitting blast doors, secured doors), proximity triggers, colliders that switch off as they open, and
// door-portal visibility for the RoomManager. State is snapshot-able for network sync.
import * as THREE from "three";
import { Kit } from "../core/kit.js";
import { Placer, doorFrame } from "../core/props.js";
import { IMP } from "../core/palette.js";
import { DOORS, ROOM_BY_ID, WALL_T } from "../core/layout.js";
import { DECAL } from "../textures.js";

const KIND = {
  slide: { speed: 1.4, thick: 0.14, accent: "emitBlue" },
  blast: { speed: 0.7, thick: 0.34, accent: "emitAmber" },
  secure: { speed: 1.0, thick: 0.18, accent: "emitRed" },
  arch: { speed: 0, thick: 0, accent: "emitWhite" },
  open: { speed: 0, thick: 0, accent: null },
  glass: { speed: 0, thick: 0, accent: null },
};

export class DoorSystem {
  constructor({ scene, materials, audio = null, onStatus = null }) {
    this.scene = scene;
    this.materials = materials;
    this.audio = audio;
    this.onStatus = onStatus;
    this.group = new THREE.Group();
    this.group.name = "doors";
    scene.add(this.group);
    this.doors = new Map(); // id -> record
    for (const d of DOORS) this.doors.set(d.id, { spec: d, built: false, openness: 0, target: 0, closeTimer: 0, group: null, slabs: [], colliders: [], forceOpen: false, locked: false, lastNear: false });
    this.dirty = false;
    this.manager = null;
    this._tmp = new THREE.Vector3();
    this.handlers = new Map();
  }

  /** Event bus: 'door_open' | 'door_close' | 'door_locked' → fn({ id, kind, position }) */
  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(fn);
  }

  /** Lock / unlock a door (a locked door never opens for proximity; forceOpen still overrides). */
  setLocked(id, on) {
    const r = this.doors.get(id);
    if (!r) return false;
    r.locked = !!on;
    if (on && r.target === 1) {
      r.target = 0;
      this.emit("door_close", r);
    }
    this.emit("door_locked", r);
    return true;
  }

  /** Pose slabs + colliders from the record's openness (used by the animation, buildDoor and apply). */
  pose(r) {
    const e = easeInOut(r.openness);
    for (const s of r.slabs) s.group.position.copy(s.base).addScaledVector(s.dir, e * s.travel);
    for (const c of r.colliders) c.enabled = r.openness < 0.8;
  }

  attach(manager) {
    this.manager = manager;
  }

  isOpen(spec) {
    const k = spec.kind;
    if (k === "arch" || k === "open" || k === "glass") return true;
    const r = this.doors.get(spec.id);
    return r ? r.openness > 0.02 : false;
  }

  /** World-space geometry of a door: centre (floor point), yaw, width, height. */
  place(spec) {
    const a = ROOM_BY_ID[spec.a];
    const b = ROOM_BY_ID[spec.b];
    const y = spec.y !== undefined ? spec.y : Math.max(a.floor, b.floor);
    const w = spec.to - spec.from;
    const mid = (spec.from + spec.to) / 2;
    if (spec.axis === "z") return { pos: [mid, y, spec.at], yaw: 0, w, h: spec.h, y };
    return { pos: [spec.at, y, mid], yaw: Math.PI / 2, w, h: spec.h, y };
  }

  roomBuilt(roomId) {
    for (const r of this.doors.values()) {
      if (r.built) continue;
      if (r.spec.a !== roomId && r.spec.b !== roomId) continue;
      this.buildDoor(r);
    }
  }

  roomReleased(roomId) {
    for (const r of this.doors.values()) {
      if (!r.built) continue;
      if (r.spec.a !== roomId && r.spec.b !== roomId) continue;
      const other = r.spec.a === roomId ? r.spec.b : r.spec.a;
      if (this.manager.rooms.get(other).built) continue;
      this.disposeDoor(r);
    }
  }

  buildDoor(r) {
    const spec = r.spec;
    const kind = KIND[spec.kind] || KIND.slide;
    const { pos, yaw, w, h } = this.place(spec);
    r.group = new THREE.Group();
    r.group.name = "door_" + spec.id;
    r.group.visible = false;
    if (spec.kind !== "open" && spec.kind !== "glass") {
      const kit = new Kit(this.materials);
      doorFrame(kit, { pos, yaw, w, h, d: WALL_T, accent: kind.accent || "emitWhite", wide: spec.kind === "arch" || spec.kind === "blast" });
      kit.build(r.group);
      r.frameColliders = kit.colliders;
    } else {
      r.frameColliders = [];
    }
    r.slabs = [];
    r.colliders = [];
    if (kind.thick > 0) {
      const P = new Placer(null, pos, yaw);
      const halves = spec.kind === "blast" ? 2 : 1;
      for (let i = 0; i < halves; i++) {
        const sk = new Kit(this.materials);
        const sg = new THREE.Group();
        const sw = halves === 2 ? w / 2 : w;
        const cx = halves === 2 ? (i === 0 ? -w / 4 : w / 4) : 0;
        buildSlab(sk, sw, h, kind.thick, spec.kind, i, cx);
        sk.build(sg);
        sg.position.copy(P.world(0, 0, 0));
        sg.quaternion.copy(P.q);
        r.group.add(sg);
        // motion: slide/secure rise; blast halves part sideways
        const dir = spec.kind === "blast" ? new THREE.Vector3(i === 0 ? -1 : 1, 0, 0).applyQuaternion(P.q) : new THREE.Vector3(0, 1, 0);
        const travel = spec.kind === "blast" ? w / 2 + 0.2 : h + 0.1;
        r.slabs.push({ group: sg, base: sg.position.clone(), dir, travel });
      }
      // one collider for the whole closed doorway (thin box in the wall gap)
      const c = new Placer(null, pos, yaw);
      const lo = c.world(-w / 2, 0, -0.25);
      const hi = c.world(w / 2, h, 0.25);
      const min = new THREE.Vector3(Math.min(lo.x, hi.x), Math.min(lo.y, hi.y), Math.min(lo.z, hi.z));
      const max = new THREE.Vector3(Math.max(lo.x, hi.x), Math.max(lo.y, hi.y), Math.max(lo.z, hi.z));
      r.colliders.push({ min, max, tag: "door:" + spec.id, enabled: true });
    }
    // trigger volume
    r.center = new THREE.Vector3(pos[0], pos[1], pos[2]);
    r.q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    r.qInv = r.q.clone().invert();
    r.w = w;
    r.h = h;
    r.kind = kind;
    this.group.add(r.group);
    r.built = true;
    this.pose(r);
  }

  disposeDoor(r) {
    if (!r.group) return;
    r.group.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    this.group.remove(r.group);
    r.group = null;
    r.slabs = [];
    r.colliders = [];
    r.built = false;
  }

  refreshVisibility(visibleIds, activeColliders) {
    for (const r of this.doors.values()) {
      if (!r.built) continue;
      const v = visibleIds.has(r.spec.a) || visibleIds.has(r.spec.b);
      r.group.visible = v;
      if (v) {
        activeColliders.push(...r.frameColliders);
        for (const c of r.colliders) activeColliders.push(c);
      }
    }
  }

  /** Per-frame: proximity triggers + slab animation. */
  update(dt, playerPos) {
    for (const r of this.doors.values()) {
      if (!r.built || r.kind.speed === 0) continue;
      if (!r.group.visible) continue;
      // local-space distance to the door plane
      this._tmp.copy(playerPos).sub(r.center).applyQuaternion(r.qInv);
      // slow, heavy doors start opening earlier so a running crew member never bumps a closed slab
      const reach = 3.2 * (1.4 / r.kind.speed) + (r.spec.kind === "blast" ? 1.5 : 0);
      const near = Math.abs(this._tmp.z) < reach && Math.abs(this._tmp.x) < r.w / 2 + 1.2 && this._tmp.y > -1.5 && this._tmp.y < r.h + 1;
      const want = r.forceOpen || (near && !r.locked);
      if (want) {
        r.closeTimer = 1.2;
        if (r.target !== 1) {
          r.target = 1;
          this.emit("door_open", r);
          if (r.spec.kind === "secure" && this.onStatus && !r.lastNear) this.onStatus(`Clearance accepted — ${ROOM_BY_ID[r.spec.a].title} / ${ROOM_BY_ID[r.spec.b].title}`);
        }
      } else if (r.target === 1) {
        r.closeTimer -= dt;
        if (r.closeTimer <= 0) {
          r.target = 0;
          this.emit("door_close", r);
        }
      }
      r.lastNear = near;
      const prev = r.openness;
      const step = r.kind.speed * dt;
      if (r.openness < r.target) r.openness = Math.min(r.target, r.openness + step);
      else if (r.openness > r.target) r.openness = Math.max(r.target, r.openness - step);
      if (r.openness !== prev) {
        this.pose(r);
        if ((prev <= 0.02) !== (r.openness <= 0.02)) this.dirty = true;
      }
    }
  }

  emit(name, r) {
    const data = { position: r.center, kind: r.spec.kind, id: r.spec.id };
    if (this.audio && this.audio.event) this.audio.event(name, data);
    for (const fn of this.handlers.get(name) || []) fn(data);
  }

  /** Force a door (e.g. for vehicles) open/closed regardless of proximity. */
  setForceOpen(id, on) {
    const r = this.doors.get(id);
    if (r) r.forceOpen = on;
  }

  snapshot() {
    const out = {};
    for (const [id, r] of this.doors) {
      if (r.openness > 0 || r.target > 0 || r.locked || r.forceOpen) out[id] = { o: +r.openness.toFixed(3), t: r.target, l: r.locked ? 1 : 0, f: r.forceOpen ? 1 : 0 };
    }
    return out;
  }

  apply(snap) {
    for (const [id, s] of Object.entries(snap)) {
      const r = this.doors.get(id);
      if (!r) continue;
      r.openness = s.o;
      r.target = s.t;
      r.locked = !!s.l;
      r.forceOpen = !!s.f;
      if (r.target === 1) r.closeTimer = Math.max(r.closeTimer, 1.2);
      if (r.built) this.pose(r);
      this.dirty = true;
    }
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Slab geometry in the door's local frame (x across, y up, z through), centred at cx. */
function buildSlab(kit, w, h, thick, kind, half, cx) {
  const P = new Placer(kit, [0, 0, 0], 0);
  const big = h > 6;
  const col = kind === "blast" ? IMP.plateDark : IMP.plate;
  P.box("paintedMetal", cx, h / 2, 0, w - 0.02, h - 0.02, thick - 0.02, { color: IMP.black, texel: 1 });
  P.box("plate", cx, h / 2, 0, w - 0.06, h - 0.06, thick, { color: col, uv: "world", texel: big ? 0.35 : 1 });
  // horizontal grooves
  const grooves = big ? 4 : 2;
  for (let g = 1; g <= grooves; g++) {
    const y = (h * g) / (grooves + 1);
    P.box("paintedMetal", cx, y, 0, w - 0.1, big ? 0.16 : 0.05, thick + 0.05, { color: IMP.black });
  }
  if (kind === "blast") {
    // heavy ribs + hazard chevrons on the meeting edge
    const edge = half === 0 ? cx + w / 2 - 0.01 : cx - w / 2 + 0.01;
    P.box("hazard", edge + (half === 0 ? -0.2 : 0.2), h / 2, 0, 0.4, h - 0.1, thick + 0.06, { texel: big ? 0.5 : 2 });
    const ribs = big ? 3 : 2;
    for (let i = 0; i < ribs; i++) {
      const x = cx - w / 2 + ((i + 0.5) / ribs) * w;
      P.box("paintedMetal", x, h / 2, 0, big ? 0.5 : 0.16, h - 0.2, thick + 0.12, { color: IMP.plateDark, texel: 1 });
    }
    for (const s of [-1, 1]) P.box("emitAmber", cx, h - (big ? 1.2 : 0.3), s * (thick / 2 + 0.07), big ? 1.2 : 0.3, big ? 0.2 : 0.06, 0.01);
  } else {
    for (const s of [-1, 1]) {
      P.box("darkGloss", cx + w * 0.3, h * 0.55, s * (thick / 2 + 0.006), 0.18, 0.26, 0.01);
      P.box(kind === "secure" ? "emitRed" : "emitBlue", cx + w * 0.3, h * 0.62, s * (thick / 2 + 0.012), 0.08, 0.04, 0.005);
      if (kind === "secure") P.decal(cx, h * 0.72, s * (thick / 2 + 0.02), 0.6, 0.6, DECAL.RESTRICTED, { rot: [0, s > 0 ? 0 : Math.PI, 0] });
      else P.decal(cx - w * 0.28, h * 0.62, s * (thick / 2 + 0.02), 0.3, 0.3, DECAL.NUMBER0 + (half % 4), { rot: [0, s > 0 ? 0 : Math.PI, 0] });
    }
    P.box("hazard", cx, 0.06, 0, w - 0.1, 0.1, thick + 0.04, { texel: 3 });
  }
}
