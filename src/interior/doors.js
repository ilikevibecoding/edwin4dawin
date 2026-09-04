// Imperial doors: frame + sliding panels in the shared wall plane between two rooms. Doors open
// automatically when the player steps into the approach zone (like the films) and close a moment
// after it leaves. Locked doors need an "Authorize" interaction on their keypad first.
// Door state is small and serialisable (see core/sync.js) so it can be replicated over a network.
import * as THREE from "three";
import { IMP } from "../materials/imperial.js";
import { impDecalRect } from "../materials/imperialTextures.js";
import { STD, doorSize } from "../config/layout.js";
import { Kit } from "../kit.js";
import { NO_SHADOW_KEYS } from "../materials/imperial.js";

const OPEN_SPEED = 1.6; // fraction per second (split doors)
const BLAST_SPEED = 0.55;
const CLOSE_DELAY = 1.4;

export class Door {
  /**
   * @param spec layout door: { id, axis, at, c, kind, locked? }
   * @param floorY floor height of the shared plane
   * @param mats material library
   */
  constructor(spec, floorY, mats, { hangar = false } = {}) {
    this.spec = spec;
    this.id = spec.id;
    this.floorY = floorY;
    const size = doorSize(spec);
    this.w = size.w;
    this.h = size.h;
    this.style = size.style;
    this.locked = !!spec.locked;
    this.lockLabel = spec.locked || null;
    this.state = "closed"; // closed | opening | open | closing
    this.progress = 0; // 0 closed .. 1 open
    this.closeTimer = 0;
    this.occupied = false;
    this.forceClosed = false;
    this.mats = mats;
    this.group = new THREE.Group();
    this.group.name = "door_" + spec.id;
    this.rooms = [spec.a, spec.b];
    this.listeners = [];
    this.build(mats, hangar);
  }

  // world-space transforms: local x runs along the wall, local z is the wall normal
  build(mats, hangar) {
    const { axis, at, c } = this.spec;
    const thick = STD.wallT * 2 + 0.02; // spans both rooms' walls
    const g = this.group;
    if (axis === "z") g.position.set(c, this.floorY, at);
    else {
      g.position.set(at, this.floorY, c);
      g.rotation.y = Math.PI / 2;
    }
    g.updateMatrixWorld(true);
    const w = this.w;
    const h = this.h;
    const heavy = this.style === "blast";
    const jamb = heavy ? 0.5 : 0.28;
    const frameD = thick + (heavy ? 0.5 : 0.24);
    this.dims = { w, h, heavy, jamb, frameD };

    // status lights: both faces in one mesh with the door's own material (colour changes with state)
    this.lightMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: this.locked ? IMP.red : IMP.blue, emissiveIntensity: 2.2, roughness: 0.4 });
    {
      const a = new THREE.BoxGeometry(Math.min(0.9, w * 0.4), 0.06, 0.012).translate(0, h + 0.1 + jamb * 0.5, frameD / 2 + 0.05);
      const b = new THREE.BoxGeometry(Math.min(0.9, w * 0.4), 0.06, 0.012).translate(0, h + 0.1 + jamb * 0.5, -(frameD / 2 + 0.05));
      const pos = new Float32Array([...a.attributes.position.array, ...b.attributes.position.array]);
      const nor = new Float32Array([...a.attributes.normal.array, ...b.attributes.normal.array]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      const idx = [];
      const n = a.attributes.position.count;
      for (let i = 0; i < a.index.count; i++) idx.push(a.index.array[i]);
      for (let i = 0; i < b.index.count; i++) idx.push(b.index.array[i] + n);
      geo.setIndex(idx);
      const lights = new THREE.Mesh(geo, this.lightMat);
      lights.name = "doorLights";
      g.add(lights);
    }

    // moving panels: ONE material each (impPanel, vertex-coloured) so a door costs two draw calls
    const pt = heavy ? 0.36 : 0.12;
    const panelMesh = (pw, ph, tone, seam = null) => {
      const k = new Kit(mats);
      const cx = 0;
      const cy = ph / 2;
      k.box("impPanel", cx, cy, 0, pw, ph, pt, { color: tone, uv: "world", texel: 0.8 });
      for (const s of [-1, 1]) {
        const zf = s * (pt / 2 + 0.004);
        // recessed dark field, raised centre plate, two horizontal bands
        k.box("impPanel", cx, cy, zf, pw * 0.72, ph * 0.52, 0.008, { color: IMP.wallDark, uv: "world", texel: 1 });
        k.box("impPanel", cx, cy, zf + 0.006 * s, pw * 0.5, ph * 0.3, 0.008, { color: tone, uv: "world", texel: 1 });
        k.box("impPanel", cx, cy + ph * 0.34, zf, pw * 0.86, 0.03, 0.008, { color: IMP.trim, uv: "world", texel: 1 });
        k.box("impPanel", cx, cy - ph * 0.34, zf, pw * 0.86, 0.03, 0.008, { color: IMP.trim, uv: "world", texel: 1 });
        k.box("impPanel", cx, cy, zf + 0.008 * s, pw * 0.5, 0.02, 0.006, { color: IMP.steel, uv: "world", texel: 1 });
        // lit strip along the leaf's meeting edge so a closed door reads as a machine even in a dim lobby
        if (seam === "left" || seam === "right") k.box("emitBlue", cx + (seam === "left" ? -1 : 1) * (pw / 2 - 0.06), cy, zf + 0.004 * s, 0.025, ph * 0.7, 0.004);
        else if (seam === "bottom") k.box("emitBlue", cx, cy - ph / 2 + 0.34, zf + 0.004 * s, pw * 0.7, 0.025, 0.004);
        else if (seam === "top") k.box("emitBlue", cx, cy + ph / 2 - 0.1, zf + 0.004 * s, pw * 0.7, 0.025, 0.004);
        if (heavy) {
          // hazard chevrons as alternating vertex-coloured blocks along the bottom edge
          const n = Math.max(4, Math.round(pw / 0.5));
          for (let i = 0; i < n; i++) k.box("impPanel", -pw / 2 + (i + 0.5) * (pw / n), 0.25, zf + 0.002 * s, pw / n, 0.2, 0.006, { color: i % 2 ? IMP.trim : IMP.hazardYellow, uv: "world", texel: 1 });
        }
      }
      const grp = new THREE.Group();
      k.build(grp, { noShadow: NO_SHADOW_KEYS });
      g.add(grp);
      return grp;
    };
    this.panels = [];
    if (this.style === "split") {
      const pw = w / 2 + 0.05;
      for (const s of [-1, 1]) {
        const p = panelMesh(pw, h + 0.04, IMP.wallLight, s > 0 ? "left" : "right");
        p.position.x = s * (pw / 2 - 0.05);
        p.userData.dir = s;
        this.panels.push(p);
      }
    } else {
      const upper = panelMesh(w + 0.1, h * 0.62 + 0.04, IMP.wallMid, "bottom");
      upper.position.y = h * 0.38;
      upper.userData.dir = 1;
      const lower = panelMesh(w + 0.1, h * 0.38 + 0.04, IMP.wallMid, "top");
      lower.userData.dir = -1;
      this.panels.push(upper, lower);
    }
    // colliders: blocking slab in the opening (disabled once mostly open) + fixed jambs
    const half = (axis) => (axis === "z" ? [w / 2 + jamb, frameD / 2] : [frameD / 2, w / 2 + jamb]);
    const [hx, hz] = half(axis);
    const cx = axis === "z" ? c : at;
    const cz = axis === "z" ? at : c;
    this.blocker = { min: new THREE.Vector3(cx - hx, this.floorY, cz - hz), max: new THREE.Vector3(cx + hx, this.floorY + h, cz + hz), tag: "door:" + this.id, disabled: false };
    const [jx, jz] = axis === "z" ? [jamb / 2 + 0.02, frameD / 2] : [frameD / 2, jamb / 2 + 0.02];
    const off = w / 2 + jamb / 2;
    const j1 = axis === "z" ? [cx - off, cz] : [cx, cz - off];
    const j2 = axis === "z" ? [cx + off, cz] : [cx, cz + off];
    this.jambColliders = [
      { min: new THREE.Vector3(j1[0] - jx, this.floorY, j1[1] - jz), max: new THREE.Vector3(j1[0] + jx, this.floorY + h + 0.5, j1[1] + jz), tag: "jamb" },
      { min: new THREE.Vector3(j2[0] - jx, this.floorY, j2[1] - jz), max: new THREE.Vector3(j2[0] + jx, this.floorY + h + 0.5, j2[1] + jz), tag: "jamb" },
    ];
    // approach trigger: the opening footprint extended into both rooms
    const reach = heavy ? 4.5 : 2.4;
    const [tx, tz] = axis === "z" ? [w / 2 + 0.6, reach] : [reach, w / 2 + 0.6];
    this.trigger = { min: new THREE.Vector3(cx - tx, this.floorY - 0.5, cz - tz), max: new THREE.Vector3(cx + tx, this.floorY + 2.5, cz + tz) };
    // keypad interactable anchors (world) for locked doors
    this.keypads = [-1, 1].map((side) => {
      const local = new THREE.Vector3(side * (w / 2 + jamb / 2), 1.25, side * (frameD / 2 + 0.02));
      return local.applyEuler(g.rotation).add(g.position);
    });
    this.apply();
  }

  // Static frame geometry into a shared kit (world space). Called by the zone manager, which merges
  // every door frame of a cluster into one mesh set.
  buildStatic(kit) {
    const { w, h, heavy, jamb, frameD } = this.dims;
    const trim = IMP.trim;
    const M = this.group.matrixWorld;
    const q = new THREE.Quaternion().setFromRotationMatrix(M);
    const place = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
    const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
      const p = place(x, y, z);
      return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
    };
    box("impPanel", -w / 2 - jamb / 2, h / 2 + 0.1, 0, jamb, h + 0.2, frameD, { color: trim, uv: "world", texel: 0.8 });
    box("impPanel", w / 2 + jamb / 2, h / 2 + 0.1, 0, jamb, h + 0.2, frameD, { color: trim, uv: "world", texel: 0.8 });
    box("impPanel", 0, h + 0.1 + jamb / 2, 0, w + jamb * 2, jamb, frameD, { color: trim, uv: "world", texel: 0.8 });
    box("impDeck", 0, -0.006, 0, w + jamb * 2, 0.012, frameD, { color: IMP.wallDark, texel: 1 });
    for (const s of [-1, 1]) {
      const cb = new THREE.BoxGeometry(jamb * 1.4, jamb * 1.4, frameD + 0.02);
      cb.rotateZ(Math.PI / 4);
      const p = place(s * (w / 2 + jamb * 0.2), h + 0.1 + jamb * 0.2, 0);
      kit.add("impPanel", cb, { pos: [p.x, p.y, p.z], quat: q, color: trim, texel: 1 });
    }
    for (const side of [-1, 1]) {
      const zf = side * (frameD / 2 + 0.004);
      box("impMetal", -w / 2 - jamb / 2, h / 2 + 0.1, zf, 0.04, h - 0.2, 0.008, { color: IMP.steel });
      box("impMetal", w / 2 + jamb / 2, h / 2 + 0.1, zf, 0.04, h - 0.2, 0.008, { color: IMP.steel });
      box("impPanel", 0, h + 0.1 + jamb * 0.5, zf + 0.02 * side, Math.min(1.2, w * 0.5), jamb * 0.5, 0.05, { color: IMP.consoleDark, uv: "world", texel: 0.8 });
      box("impPanel", side * (w / 2 + jamb / 2), 1.25, zf + 0.02 * side, 0.16, 0.24, 0.05, { color: IMP.consoleDark, uv: "world", texel: 0.8 });
      box("blinkSparse", side * (w / 2 + jamb / 2), 1.3, zf + 0.05 * side, 0.12, 0.1, 0.006, { uv: "keep" });
      const dg = new THREE.PlaneGeometry(0.22, 0.22);
      if (side < 0) dg.rotateY(Math.PI);
      const dp = place(-side * (w / 2 + jamb / 2), h - 0.3, zf + 0.003 * side);
      kit.add("impDecal", dg, { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect(this.locked ? 5 : heavy ? 1 : 0) });
    }
    if (heavy) {
      box("hazard", 0, h + 0.1 + jamb / 2, frameD / 2 + 0.006, w * 0.9, jamb * 0.4, 0.01, { uv: "scale", uvScale: [w, 0.3] });
      box("hazard", 0, h + 0.1 + jamb / 2, -(frameD / 2 + 0.006), w * 0.9, jamb * 0.4, 0.01, { uv: "scale", uvScale: [w, 0.3] });
      box("hazard", 0, 0.008, 0, w, 0.008, frameD * 0.8, { uv: "scale", uvScale: [w, 0.5] });
    }
  }

  get colliders() {
    return [this.blocker, ...this.jambColliders];
  }

  apply() {
    const p = this.progress;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    for (const panel of this.panels) {
      if (this.style === "split") panel.position.x = panel.userData.dir * ((this.w / 2 + 0.05) / 2 - 0.05 + e * (this.w / 2 + 0.3));
      else if (panel.userData.dir > 0) panel.position.y = this.h * 0.38 + e * (this.h * 0.64);
      else panel.position.y = -e * (this.h * 0.42);
    }
    this.blocker.disabled = p > 0.72;
    for (const panel of this.panels) panel.visible = p < 0.999 || this.style !== "split";
  }

  // playerPos: THREE.Vector3 (feet). Returns true when the door changed state.
  update(dt, playerPos) {
    const t = this.trigger;
    const inside = playerPos && playerPos.x > t.min.x && playerPos.x < t.max.x && playerPos.z > t.min.z && playerPos.z < t.max.z && playerPos.y > t.min.y && playerPos.y < t.max.y;
    this.occupied = !!inside;
    let changed = false;
    if (inside && !this.locked && !this.forceClosed && (this.state === "closed" || this.state === "closing")) {
      this.setState("opening");
      changed = true;
    }
    if ((!inside || this.forceClosed) && this.state === "open") {
      this.closeTimer += dt;
      if (this.closeTimer > CLOSE_DELAY) {
        this.setState("closing");
        changed = true;
      }
    } else this.closeTimer = 0;
    const speed = this.style === "blast" ? BLAST_SPEED : OPEN_SPEED;
    if (this.state === "opening") {
      this.progress = Math.min(1, this.progress + dt * speed);
      if (this.progress >= 1) this.setState("open");
    } else if (this.state === "closing") {
      // never close on the player (unless a turbolift is sealing its cab)
      if (inside && !this.forceClosed) this.setState("opening");
      else {
        this.progress = Math.max(0, this.progress - dt * speed);
        if (this.progress <= 0) this.setState("closed");
      }
    }
    this.apply();
    return changed;
  }

  setState(s) {
    if (this.state === s) return;
    const prev = this.state;
    this.state = s;
    if (s === "opening") this.lightMat.emissive.copy(IMP.coolWhite);
    else if (s === "open") this.lightMat.emissive.copy(IMP.green);
    else if (s === "closing") this.lightMat.emissive.copy(IMP.amber);
    else this.lightMat.emissive.copy(this.locked ? IMP.red : IMP.blue);
    for (const cb of this.listeners) cb(this, s, prev);
  }

  unlock() {
    if (!this.locked) return false;
    this.locked = false;
    this.lightMat.emissive.copy(IMP.blue);
    for (const cb of this.listeners) cb(this, "unlocked", "locked");
    return true;
  }

  onChange(cb) {
    this.listeners.push(cb);
  }

  // network-friendly snapshot
  getState() {
    return { id: this.id, s: this.state, p: +this.progress.toFixed(3), l: this.locked };
  }
  applyState(st) {
    this.locked = st.l;
    this.progress = st.p;
    if (st.s !== this.state) this.setState(st.s); // status light + listeners follow the replicated state
    this.apply();
  }
}

// Builds every door in the layout for one floor map. rooms: id -> { floorY }
export function buildDoors(specs, floorYOf, mats) {
  const doors = [];
  for (const spec of specs) {
    const floorY = floorYOf(spec.a);
    doors.push(new Door(spec, floorY, mats));
  }
  return doors;
}
