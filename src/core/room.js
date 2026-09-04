// Room contract + RoomManager: lazy per-cluster construction (streaming), door-portal visibility culling,
// per-room lights / colliders / animators, teleports and current-room tracking.
import * as THREE from "three";
import { Kit, rng } from "./kit.js";
import { Frame, wallFrame, ceilingFrame, panelGrid, imperialCeiling, imperialRows, UP } from "./frame.js";
import * as props from "./props.js";
import { IMP, ACCENT } from "./palette.js";
import { ROOMS, ROOM_BY_ID, DOORS, WALL_T, roomsInCluster } from "./layout.js";
import { decalRect, DECAL } from "../textures.js";

const LIGHT_SCALE = 0.8;

/** Everything a room builder needs. */
export class BuildContext {
  constructor(manager, def) {
    this.manager = manager;
    this.def = def;
    this.id = def.id;
    this.materials = manager.materials;
    this.kit = new Kit(manager.materials);
    this.props = props;
    this.IMP = IMP;
    this.accent = ACCENT[def.accent] || ACCENT.corridor;
    this.floor = def.floor;
    this.h = def.h;
    this.ceil = def.floor + def.h;
    const [x0, x1, z0, z1] = def.box;
    this.box = { x0, x1, z0, z1 };
    const t = WALL_T / 2;
    this.inner = { x0: x0 + t, x1: x1 - t, z0: z0 + t, z1: z1 - t };
    this.lights = [];
    this.interactables = [];
    this.animators = [];
    this.group = new THREE.Group();
    this.group.name = "room_" + def.id;
    this.doors = manager.doorsOf(def.id); // [{ door, side, u0, u1, v0, v1 }]
    this.rand = rng(hashId(def.id));
  }

  /** Wall frame for one side: 'zmin'|'zmax'|'xmin'|'xmax'. U runs left→right as seen from inside. */
  wall(side) {
    const { x0, x1, z0, z1 } = this.inner;
    let from, to;
    if (side === "zmin") [from, to] = [[x0, z0], [x1, z0]];
    else if (side === "zmax") [from, to] = [[x1, z1], [x0, z1]];
    else if (side === "xmin") [from, to] = [[x0, z1], [x0, z0]];
    else [from, to] = [[x1, z0], [x1, z1]];
    const { frame, length } = wallFrame(this.kit, from, to, this.floor);
    const openings = this.doors.filter((d) => d.side === side).map((d) => ({ type: d.type, u0: d.u0, u1: d.u1, v0: d.v0, v1: d.v1 }));
    return { frame, length, height: this.h, openings, side };
  }

  /** Ceiling frame over the whole inner box (faces down). */
  ceilingFrame() {
    return { frame: ceilingFrame(this.kit, this.inner.x0, this.inner.z0, this.ceil), w: this.inner.x1 - this.inner.x0, d: this.inner.z1 - this.inner.z0 };
  }

  /**
   * Standard shell: floor slab + collider, ceiling panels with light channels, four panelled walls with the
   * door openings carved. opts: { floorMat, floorColor, walls: {zmin:{...}, ...} (panelGrid opts per side,
   * false to skip), ceiling: opts|false, skipFloor, stripSpacing, pilasterEvery, seed }
   */
  shell(opts = {}) {
    const { floorMat = "deckGrey", floorColor = IMP.plateDark, walls = {}, ceiling = {}, skipFloor = false, stripSpacing = 4, pilasterEvery = 0, seed = 1, wallStyles = null, stripMat = "emitWhiteSoft" } = opts;
    const { x0, x1, z0, z1 } = this.box;
    if (!skipFloor) {
      if (this.def.well) this.floorWithWell(floorMat, floorColor);
      else {
        this.kit.boxMM(floorMat, [x0, this.floor - 0.3, z0], [x1, this.floor, z1], { color: floorColor, texel: 0.5 });
        this.kit.collider([x0, this.floor - 0.6, z0], [x1, this.floor, z1], "floor");
      }
    }
    // ceiling slab (dark, so gaps never show space) + panels
    this.kit.boxMM("paintedMetal", [x0, this.ceil, z0], [x1, this.ceil + 0.3, z1], { color: IMP.black, texel: 0.3 });
    if (ceiling !== false) {
      const { frame, w, d } = this.ceilingFrame();
      imperialCeiling(frame, w, d, { seed: seed * 7 + 1, stripSpacing, stripMat, ...ceiling });
    }
    let i = 0;
    for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
      const wo = walls[side];
      if (wo === false) continue;
      const { frame, length, height, openings } = this.wall(side);
      panelGrid(frame, length, height, { openings, seed: seed * 13 + i * 31, pilasterEvery, tag: this.id + ":" + side, accent: accentMat(this.accent.key), styles: wallStyles || undefined, ...(wo || {}) });
      i++;
    }
  }

  /** Deck around a floor well (hangar bays): four slabs + colliders, hazard rim, railing with gaps at the ends. */
  floorWithWell(floorMat = "deckGrey", floorColor = IMP.plateDark, { railing = true } = {}) {
    const { x0, x1, z0, z1 } = this.box;
    const w = this.def.well;
    const y = this.floor;
    const slabs = [
      [x0, z0, x1, w.z0],
      [x0, w.z1, x1, z1],
      [x0, w.z0, w.x0, w.z1],
      [w.x1, w.z0, x1, w.z1],
    ];
    for (const [a, b, c, d] of slabs) {
      this.kit.boxMM(floorMat, [a, y - 0.4, b], [c, y, d], { color: floorColor, texel: 0.5 });
      this.kit.collider([a, y - 0.6, b], [c, y, d], "floor");
    }
    // hazard rim + lip around the well mouth
    this.kit.boxMM("hazard", [w.x0 - 1.2, y + 0.005, w.z0 - 1.2], [w.x1 + 1.2, y + 0.012, w.z0], { texel: 1 });
    this.kit.boxMM("hazard", [w.x0 - 1.2, y + 0.005, w.z1], [w.x1 + 1.2, y + 0.012, w.z1 + 1.2], { texel: 1 });
    this.kit.boxMM("hazard", [w.x0 - 1.2, y + 0.005, w.z0], [w.x0, y + 0.012, w.z1], { texel: 1 });
    this.kit.boxMM("hazard", [w.x1, y + 0.005, w.z0], [w.x1 + 1.2, y + 0.012, w.z1], { texel: 1 });
    this.kit.boxMM("paintedMetal", [w.x0 - 0.3, y - 0.6, w.z0 - 0.3], [w.x1 + 0.3, y + 0.15, w.z0], { color: IMP.black, texel: 1 });
    this.kit.boxMM("paintedMetal", [w.x0 - 0.3, y - 0.6, w.z1], [w.x1 + 0.3, y + 0.15, w.z1 + 0.3], { color: IMP.black, texel: 1 });
    this.kit.boxMM("paintedMetal", [w.x0 - 0.3, y - 0.6, w.z0], [w.x0, y + 0.15, w.z1], { color: IMP.black, texel: 1 });
    this.kit.boxMM("paintedMetal", [w.x1, y - 0.6, w.z0], [w.x1 + 0.3, y + 0.15, w.z1], { color: IMP.black, texel: 1 });
    if (railing) {
      const r = 1.6;
      props.railing(this.kit, { from: [w.x0 - r, w.z0 - r], to: [w.x1 + r, w.z0 - r], y });
      props.railing(this.kit, { from: [w.x1 + r, w.z1 + r], to: [w.x0 - r, w.z1 + r], y });
      props.railing(this.kit, { from: [w.x0 - r, w.z1 + r], to: [w.x0 - r, w.z0 - r], y });
      props.railing(this.kit, { from: [w.x1 + r, w.z0 - r], to: [w.x1 + r, w.z1 + r], y });
    }
    // an invisible safety collider keeps the player from walking into the well (until the hangar owner
    // decides otherwise — remove by passing railing:false and adding your own colliders)
    if (railing) this.kit.collider([w.x0 - 1.4, y - 0.6, w.z0 - 1.4], [w.x1 + 1.4, y + 1.2, w.z1 + 1.4], "well");
  }

  /** Point light (added to the room group; culled with the room). */
  light(color, intensity, distance, pos, { decay = 2, shadow = false } = {}) {
    const l = new THREE.PointLight(color, intensity * LIGHT_SCALE, distance, decay);
    l.position.set(pos[0], pos[1], pos[2]);
    l.castShadow = shadow;
    if (shadow) {
      l.shadow.mapSize.set(512, 512);
      l.shadow.bias = -0.0005;
    }
    this.group.add(l);
    this.lights.push(l);
    return l;
  }

  spot(color, intensity, distance, angle, pos, target, { penumbra = 0.6, decay = 1.6, shadow = false, mapSize = 1024 } = {}) {
    const s = new THREE.SpotLight(color, intensity * LIGHT_SCALE, distance, angle, penumbra, decay);
    s.position.set(pos[0], pos[1], pos[2]);
    s.target.position.set(target[0], target[1], target[2]);
    s.castShadow = shadow;
    if (shadow) {
      s.shadow.mapSize.set(mapSize, mapSize);
      s.shadow.bias = -0.0003;
      s.shadow.normalBias = 0.03;
      s.shadow.camera.near = 0.5;
      s.shadow.camera.far = distance;
    }
    this.group.add(s);
    this.group.add(s.target);
    this.lights.push(s);
    return s;
  }

  collider(min, max, tag = "") {
    return this.kit.collider(min, max, tag);
  }

  /** Register an interactable: { object (added to the room group), material, id, label, key, action(ctx) } */
  interactable(it) {
    this.group.add(it.object);
    this.interactables.push(it);
    return it;
  }

  /** Per-frame updater while the room is visible: fn(dt, t) */
  animate(fn) {
    this.animators.push(fn);
  }

  /** Add an arbitrary object to the room group (animated meshes, shader effects…). */
  add(obj) {
    this.group.add(obj);
    return obj;
  }

  /** Room label stencil on a wall (debug / grey-box aid). */
  label(side, u, v, text) {
    const { frame } = this.wall(side);
    frame.box("paintedMetal", u, v, 0.02, 2.2, 0.5, 0.04, { color: IMP.black });
    frame.decal(u, v, 0.045, 0.45, 0.45, DECAL.EMBLEM);
    return text;
  }
}

function accentMat(color) {
  if (color === IMP.red) return "emitRed";
  if (color === IMP.amber) return "emitAmber";
  if (color === IMP.cyan) return "emitCyan";
  if (color === IMP.violet) return "emitViolet";
  if (color === IMP.green) return "emitGreen";
  if (color === IMP.white) return "emitWhite";
  return "emitBlue";
}

function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------------------------------------------------------------------------------------------------
export class RoomManager {
  /**
   * @param {object} o { scene, materials, builders: {id: {build(ctx)}}, doorSystem, onRoomChange }
   */
  constructor({ scene, materials, builders, doorSystem, onRoomChange = null }) {
    this.scene = scene;
    this.materials = materials;
    this.builders = builders;
    this.doorSystem = doorSystem;
    this.onRoomChange = onRoomChange;
    this.group = new THREE.Group();
    this.group.name = "interior";
    scene.add(this.group);
    this.rooms = new Map(); // id -> { def, ctx, built, visible }
    for (const def of ROOMS) this.rooms.set(def.id, { def, ctx: null, built: false, visible: false, cluster: def.cluster });
    this.current = null;
    this.peek = false; // exterior mode: show the glazed tower rooms so the bridge is lit behind its windows
    this.visibleIds = new Set();
    this.activeColliders = [];
    this.builtClusters = new Set();
    this.clusterVisit = new Map();
    this.buildQueue = [];
    this.buildTimes = {};
    this.interactables = [];
    this.interactablesVersion = 0;
    this.extras = []; // systems that own geometry tied to rooms (lifts …): roomBuilt / roomReleased / refreshVisibility
    doorSystem.attach(this);
  }

  /** Door records touching a room, in that room's wall coordinates. */
  doorsOf(id) {
    const def = ROOM_BY_ID[id];
    const t = WALL_T / 2;
    const x0 = def.box[0] + t,
      x1 = def.box[1] - t,
      z0 = def.box[2] + t,
      z1 = def.box[3] - t;
    const out = [];
    for (const d of DOORS) {
      if (d.a !== id && d.b !== id) continue;
      const other = ROOM_BY_ID[d.a === id ? d.b : d.a];
      const y = d.y !== undefined ? d.y : Math.max(def.floor, other.floor);
      const v0 = y - def.floor;
      const v1 = v0 + d.h;
      let side, u0, u1;
      if (d.axis === "z") {
        // wall perpendicular to z at z = at
        side = Math.abs(d.at - def.box[2]) < 1e-6 ? "zmin" : "zmax";
        if (side === "zmin") [u0, u1] = [d.from - x0, d.to - x0];
        else [u0, u1] = [x1 - d.to, x1 - d.from];
      } else {
        side = Math.abs(d.at - def.box[0]) < 1e-6 ? "xmin" : "xmax";
        if (side === "xmin") [u0, u1] = [z1 - d.to, z1 - d.from];
        else [u0, u1] = [d.from - z0, d.to - z0];
      }
      const type = d.kind === "glass" ? "window" : d.kind === "arch" || d.kind === "open" ? "arch" : "door";
      out.push({ door: d, other: other.id, side, u0, u1, v0, v1, type });
    }
    // windows declared on the room (glazing built by the wall grid; the exterior tower carries the outer pane)
    if (def.windows) {
      for (const w of def.windows) {
        let u0, u1;
        if (w.side === "zmin") [u0, u1] = [w.x0 - x0, w.x1 - x0];
        else if (w.side === "zmax") [u0, u1] = [x1 - w.x1, x1 - w.x0];
        else if (w.side === "xmin") [u0, u1] = [z1 - w.z1, z1 - w.z0];
        else [u0, u1] = [w.z0 - z0, w.z1 - z0];
        out.push({ door: { id: "win:" + def.id, kind: "window" }, other: null, side: w.side, u0, u1, v0: w.v0, v1: w.v1, type: "window" });
      }
    }
    // turbolift cab openings on the lobby wall (no partner room; the lift system owns the cab)
    if (def.lift) {
      for (const c of def.lift.cabs) {
        const mid = (c.x0 + c.x1) / 2;
        const w = 2.6;
        const side = def.lift.wall;
        const [u0, u1] = side === "zmin" ? [mid - w / 2 - x0, mid + w / 2 - x0] : [x1 - (mid + w / 2), x1 - (mid - w / 2)];
        out.push({ door: { id: "lift:" + def.id + ":" + mid, kind: "lift" }, other: null, side, u0, u1, v0: 0, v1: 2.6, type: "door" });
      }
    }
    return out;
  }

  // ---- construction --------------------------------------------------------------------------------
  ensureCluster(cluster) {
    if (this.builtClusters.has(cluster)) return;
    const t0 = performance.now();
    for (const def of roomsInCluster(cluster)) this.buildRoom(def.id);
    this.builtClusters.add(cluster);
    this.buildTimes[cluster] = +(performance.now() - t0).toFixed(1);
  }

  /** Queue a cluster for incremental construction (one room per call to `step`). */
  prefetch(cluster) {
    if (this.builtClusters.has(cluster)) return;
    for (const def of roomsInCluster(cluster)) if (!this.rooms.get(def.id).built && !this.buildQueue.includes(def.id)) this.buildQueue.push(def.id);
  }

  /** Build at most one queued room (call once per frame). Returns true if something was built. */
  step() {
    while (this.buildQueue.length) {
      const id = this.buildQueue.shift();
      const r = this.rooms.get(id);
      if (r.built) continue;
      this.buildRoom(id);
      const cluster = r.cluster;
      if (roomsInCluster(cluster).every((d) => this.rooms.get(d.id).built)) this.builtClusters.add(cluster);
      return true;
    }
    return false;
  }

  buildRoom(id) {
    const r = this.rooms.get(id);
    if (r.built) return r;
    const t0 = performance.now();
    const ctx = new BuildContext(this, r.def);
    const builder = this.builders[id];
    if (builder && builder.build) builder.build(ctx);
    else greybox(ctx);
    ctx.kit.build(ctx.group);
    ctx.group.visible = false;
    this.group.add(ctx.group);
    r.ctx = ctx;
    r.built = true;
    r.triangles = ctx.kit.triangles;
    r.buildMs = +(performance.now() - t0).toFixed(1);
    this.interactables.push(...ctx.interactables);
    this.interactablesVersion++;
    this.doorSystem.roomBuilt(id);
    for (const e of this.extras) if (e.roomBuilt) e.roomBuilt(id);
    if ((this.current && this.current.id === id) || this.peek) this.refreshVisibility(true);
    return r;
  }

  /** Exterior peek: render only the rooms that have windows (they are visible from outside). */
  setExteriorPeek(on) {
    this.peek = on;
    this.refreshVisibility(true);
  }

  releaseCluster(cluster) {
    for (const def of roomsInCluster(cluster)) {
      const r = this.rooms.get(def.id);
      if (!r.built) continue;
      r.ctx.kit.dispose();
      for (const l of r.ctx.lights) if (l.dispose) l.dispose();
      this.group.remove(r.ctx.group);
      this.interactables = this.interactables.filter((it) => !r.ctx.interactables.includes(it));
      r.ctx = null;
      r.built = false;
      r.visible = false;
      this.interactablesVersion++;
      this.doorSystem.roomReleased(def.id);
      for (const e of this.extras) if (e.roomReleased) e.roomReleased(def.id);
    }
    this.builtClusters.delete(cluster);
  }

  /** Keep memory bounded: drop clusters not visited recently (never the current one). */
  trimClusters(keep = 2) {
    const visited = [...this.clusterVisit.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
    for (const c of [...this.builtClusters]) {
      if (this.current && c === this.current.cluster) continue;
      if (visited.indexOf(c) >= keep) this.releaseCluster(c);
    }
  }

  // ---- location -------------------------------------------------------------------------------------
  roomAt(pos, prefer = null) {
    const test = (def, pad) => {
      const [x0, x1, z0, z1] = def.box;
      return pos.x >= x0 - pad && pos.x <= x1 + pad && pos.z >= z0 - pad && pos.z <= z1 + pad && pos.y >= def.floor - 1.0 && pos.y <= def.floor + def.h + 0.5;
    };
    if (prefer && test(prefer, 0.4)) return prefer;
    for (const def of ROOMS) if (test(def, 0.0)) return def;
    // door tunnels: nearest room within the wall gap
    for (const def of ROOMS) if (test(def, WALL_T)) return def;
    return prefer;
  }

  /** Jump to a world position: builds the cluster synchronously and sets the current room. */
  teleport(pos) {
    const def = this.roomAt(pos, null) || nearestRoom(pos);
    this.ensureCluster(def.cluster);
    this.setCurrent(def);
    this.refreshVisibility(true);
    return def;
  }

  setCurrent(def) {
    if (this.current === def) return;
    const prev = this.current;
    this.current = def;
    this.clusterVisit.set(def.cluster, performance.now());
    if (this.onRoomChange) this.onRoomChange(def, prev);
  }

  /** Per-frame: track the player, cull by door portals, run animators. */
  update(dt, t, playerPos) {
    const def = this.roomAt(playerPos, this.current);
    if (def && def !== this.current) {
      if (!this.builtClusters.has(def.cluster)) this.ensureCluster(def.cluster);
      this.setCurrent(def);
      this.refreshVisibility();
    } else if (this.doorSystem.dirty) {
      this.refreshVisibility();
    }
    this.updateAnimators(dt, t);
  }

  /** Run the per-frame animators of every visible room (screens, machinery, holograms). */
  updateAnimators(dt, t) {
    for (const id of this.visibleIds) {
      const r = this.rooms.get(id);
      if (!r.built) continue;
      for (const fn of r.ctx.animators) fn(dt, t);
    }
  }

  /** Recompute the visible room set from the current room through open doors (depth 2 via arches). */
  refreshVisibility(force = false) {
    this.doorSystem.dirty = false;
    const vis = new Set();
    if (this.peek) {
      for (const [id, r] of this.rooms) if (r.built && r.def.windows) vis.add(id);
    } else if (this.current) {
      vis.add(this.current.id);
      for (const d of this.doorsOf(this.current.id)) {
        if (!d.other) continue;
        if (!this.doorSystem.isOpen(d.door)) continue;
        vis.add(d.other);
        for (const d2 of this.doorsOf(d.other)) {
          if (!d2.other) continue;
          if (d2.door.kind === "arch" || d2.door.kind === "open" || d2.door.kind === "glass") vis.add(d2.other);
        }
      }
    }
    if (!force && setEq(vis, this.visibleIds)) return;
    this.visibleIds = vis;
    this.activeColliders.length = 0;
    for (const [id, r] of this.rooms) {
      const v = vis.has(id) && r.built;
      r.visible = v;
      if (r.ctx) r.ctx.group.visible = v;
      if (v) this.activeColliders.push(...r.ctx.kit.colliders);
    }
    this.doorSystem.refreshVisibility(vis, this.activeColliders);
    for (const e of this.extras) if (e.refreshVisibility) e.refreshVisibility(vis, this.activeColliders);
  }

  get visibleRooms() {
    return [...this.visibleIds].map((id) => this.rooms.get(id));
  }

  stats() {
    let tris = 0;
    let built = 0;
    for (const r of this.rooms.values()) {
      if (!r.built) continue;
      built++;
      tris += r.triangles || 0;
    }
    return { built, total: this.rooms.size, triangles: tris, clusters: [...this.builtClusters], visible: [...this.visibleIds], current: this.current ? this.current.id : null, buildTimes: this.buildTimes };
  }
}

function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function nearestRoom(pos) {
  let best = null;
  let bd = Infinity;
  for (const def of ROOMS) {
    const [x0, x1, z0, z1] = def.box;
    const dx = Math.max(x0 - pos.x, 0, pos.x - x1);
    const dz = Math.max(z0 - pos.z, 0, pos.z - z1);
    const dy = Math.max(def.floor - pos.y, 0, pos.y - def.floor - def.h);
    const d = dx * dx + dz * dz + dy * dy;
    if (d < bd) {
      bd = d;
      best = def;
    }
  }
  return best;
}

/** Grey-box room: shell + a centre light + room label; used until a room has its own builder. */
export function greybox(ctx) {
  const { x0, x1, z0, z1 } = ctx.inner;
  const big = ctx.h > 8;
  ctx.shell({ pilasterEvery: big ? 8 : 4.8, stripSpacing: big ? 8 : 4, seed: hashId(ctx.id) % 1000 });
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const n = Math.max(1, Math.round((x1 - x0) / 8)) * Math.max(1, Math.round((z1 - z0) / 8));
  const nx = Math.max(1, Math.round((x1 - x0) / 8));
  const nz = Math.max(1, Math.round((z1 - z0) / 8));
  if (n <= 12) {
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) ctx.light(0xdfe8ff, big ? 60 : 16, big ? 60 : 18, [x0 + ((i + 0.5) / nx) * (x1 - x0), ctx.ceil - (big ? 2 : 0.6), z0 + ((j + 0.5) / nz) * (z1 - z0)]);
  } else {
    // large hall: a coarse grid of strong work lights hung mid-height so walls and floor both read
    const gx = Math.max(2, Math.round((x1 - x0) / 26));
    const gz = Math.max(2, Math.round((z1 - z0) / 26));
    for (let i = 0; i < gx; i++) for (let j = 0; j < gz; j++) ctx.light(0xdfe8ff, 140, 70, [x0 + ((i + 0.5) / gx) * (x1 - x0), ctx.floor + Math.min(ctx.h - 1, 12), z0 + ((j + 0.5) / gz) * (z1 - z0)]);
    void cx;
    void cz;
  }
}

export { Frame, UP, wallFrame, ceilingFrame, panelGrid, imperialCeiling, imperialRows, decalRect };
