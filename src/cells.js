// Cells and portals: every room is a Cell (group + merged kit meshes + colliders + floors + light
// declarations). Only the player's cell, its neighbours through doors, and the second ring through
// *open* doors are rendered. A fixed pool of point / spot lights is re-assigned to the visible cells'
// declared lights by priority, so the shader light count never changes (no recompiles).
import * as THREE from "three";
import { Kit } from "./kit.js";
import { ROOMS, ROOM_BY_ID, DOORS, roomBounds, neighbours } from "./spec.js";

const POOL_POINTS = 16;
const POOL_SPOTS = 3;
const FADE = 0.18; // s, light slot cross-fade

export class Cell {
  constructor(room, materials) {
    this.room = room;
    this.id = room.id;
    this.group = new THREE.Group();
    this.group.name = "cell:" + room.id;
    this.group.position.set(room.origin[0], room.origin[1], room.origin[2]);
    this.group.visible = false; // Object3D defaults to visible; setVisible(false) would early-return
    this.kit = new Kit(materials);
    this.colliders = [];
    this.floors = [];
    this.lights = [];
    this.updaters = [];
    this.interactables = [];
    this.bounds = roomBounds(room);
    this.visible = false;
    this.built = false;
    this.volume = room.size[0] * room.size[1] * room.size[2];
  }

  /** Run the builder in room-local coordinates, then bake everything to world space. */
  build(builder, ctx) {
    const kit = this.kit;
    builder(kit, ctx, this.room);
    // default walkable floor: the whole clear footprint at floor level, unless the builder declares
    // its own floors (pits, multi-level rooms) with kit.skipDefaultFloor = true
    const [w, , d] = this.room.size;
    if (!kit.skipDefaultFloor) kit.floor(-w / 2 - 0.5, -d / 2 - 0.5, w / 2 + 0.5, d / 2 + 0.5, 0, "roomfloor");
    kit.build(this.group);
    const o = this.group.position;
    for (const c of kit.colliders) {
      this.colliders.push({ min: c.min.clone().add(o), max: c.max.clone().add(o), tag: c.tag, walkable: c.walkable || false, cell: this.id });
    }
    for (const f of kit.floors) {
      const wf = { x0: f.x0 + o.x, x1: f.x1 + o.x, z0: f.z0 + o.z, z1: f.z1 + o.z, y: f.y + o.y, tag: f.tag, cell: this.id };
      if (f.ramp) wf.ramp = { axis: f.ramp.axis, from: f.ramp.from + (f.ramp.axis === "x" ? o.x : o.z), to: f.ramp.to + (f.ramp.axis === "x" ? o.x : o.z), y0: f.ramp.y0 + o.y, y1: f.ramp.y1 + o.y };
      this.floors.push(wf);
    }
    for (const l of kit.lights) {
      const wl = { ...l, cell: this.id, pos: new THREE.Vector3(...l.pos).add(o) };
      if (l.target) wl.target = new THREE.Vector3(...l.target).add(o);
      wl.color = new THREE.Color(l.color);
      this.lights.push(wl);
    }
    this.updaters = kit.updaters;
    this.interactables = kit.interactables;
    if (kit.liftAnim) this.liftAnim = kit.liftAnim;
    if (kit.api) this.api = kit.api; // room-specific runtime hooks (e.g. hangar traffic, bridge alerts)
    for (const it of this.interactables) it.cell = this.id;
    this.built = true;
    this.setVisible(false);
  }

  setVisible(v) {
    if (this.visible === v) return;
    this.visible = v;
    this.group.visible = v;
  }

  contains(p, margin = 0.6) {
    const b = this.bounds;
    return p.x > b.min.x - margin && p.x < b.max.x + margin && p.z > b.min.z - margin && p.z < b.max.z + margin && p.y > b.min.y - 1.5 && p.y < b.max.y;
  }
}

export class CellManager {
  constructor({ scene, materials }) {
    this.scene = scene;
    this.materials = materials;
    this.root = new THREE.Group();
    this.root.name = "interior";
    scene.add(this.root);
    this.cells = new Map();
    this.colliders = []; // all world colliders (rooms + doors); the player iterates this array
    this.floors = [];
    this.interactables = [];
    this.current = null;
    this.visibleIds = new Set();
    this.doors = new Map(); // door id -> Door instance (set by doors.js)
    this.fogTarget = 0.03;
    this.onCellChange = null;
    // light pool
    this.pool = { points: [], spots: [] };
    for (let i = 0; i < POOL_POINTS; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      l.name = "pool_point_" + i;
      this.root.add(l);
      this.pool.points.push({ light: l, target: null, current: null, fade: 0, phase: "idle" });
    }
    for (let i = 0; i < POOL_SPOTS; i++) {
      const l = new THREE.SpotLight(0xffffff, 0, 12, 0.8, 0.6, 1.6);
      l.name = "pool_spot_" + i;
      this.root.add(l);
      this.root.add(l.target);
      if (i === 0) {
        l.castShadow = true;
        l.shadow.mapSize.set(1024, 1024);
        l.shadow.bias = -0.0003;
        l.shadow.normalBias = 0.03;
        l.shadow.camera.near = 0.3;
        l.shadow.camera.far = 30;
      }
      this.pool.spots.push({ light: l, target: null, current: null, fade: 0, phase: "idle" });
    }
    this.stats = { visibleCells: 0, activeLights: 0, current: null };
    this.playerPos = new THREE.Vector3();
    this.reassignTimer = 0;
    this.shadowSuspended = false;
  }

  /** Build a room with the given builder. ctx is passed through to the builder. */
  buildRoom(roomId, builder, ctx) {
    const room = ROOM_BY_ID[roomId];
    if (!room) throw new Error("unknown room " + roomId);
    const cell = new Cell(room, this.materials);
    try {
      cell.build(builder, { ...ctx, cells: this });
    } catch (e) {
      console.error(`room ${roomId} failed to build`, e);
      throw e;
    }
    this.root.add(cell.group);
    this.cells.set(roomId, cell);
    this.colliders.push(...cell.colliders);
    this.floors.push(...cell.floors);
    this.interactables.push(...cell.interactables);
    return cell;
  }

  /** Register a pre-built external cell (the Kestrel) with its own world colliders / floors. */
  registerCell(cell) {
    this.cells.set(cell.id, cell);
    this.colliders.push(...cell.colliders);
    this.floors.push(...cell.floors);
    this.interactables.push(...cell.interactables);
  }

  addCollider(c) {
    this.colliders.push(c);
    return c;
  }

  cellAt(p) {
    let best = null;
    for (const c of this.cells.values()) {
      if (!c.contains(p)) continue;
      if (!best || c.volume < best.volume) best = c;
    }
    return best;
  }

  isDoorOpen(a, b) {
    const d = this.doors.get(`${a}__${b}`) || this.doors.get(`${b}__${a}`);
    return d ? d.openness > 0.05 : true;
  }

  /**
   * Compute the visible set for the current cell: neighbours whose door is open (or opening), plus
   * their neighbours through further open doors. Rooms tagged "seeThrough" (windows into the next
   * room, the Kestrel parked inside the hangar) are visible to their neighbours regardless of doors.
   */
  computeVisible(currentId) {
    const vis = new Set([currentId]);
    const seeThrough = (id) => (ROOM_BY_ID[id]?.tags || []).includes("seeThrough");
    for (const n of neighbours(currentId)) {
      const open = this.isDoorOpen(currentId, n);
      if (open || seeThrough(currentId) || seeThrough(n)) vis.add(n);
      if (open) for (const m of neighbours(n)) if (this.isDoorOpen(n, m) || seeThrough(n) || seeThrough(m)) vis.add(m);
    }
    return vis;
  }

  /** Force a cell as current (teleports) */
  setCurrent(roomId) {
    const c = this.cells.get(roomId);
    if (c) this.applyCurrent(c, true);
  }

  applyCurrent(cell, force = false) {
    if (cell === this.current && !force) return;
    const prev = this.current;
    this.current = cell;
    this.visibleIds = this.computeVisible(cell.id);
    for (const c of this.cells.values()) c.setVisible(this.visibleIds.has(c.id));
    for (const d of this.doors.values()) d.updateVisibility(this.visibleIds);
    this.fogTarget = cell.room.fog;
    this.assignLights();
    if (this.onCellChange) this.onCellChange(cell, prev);
  }

  update(playerPos, dt, t) {
    this.playerPos.copy(playerPos);
    const c = this.cellAt(playerPos);
    if (c && c !== this.current) this.applyCurrent(c);
    else if (c && this.current) {
      // door state changes alter the second ring
      const vis = this.computeVisible(this.current.id);
      let changed = vis.size !== this.visibleIds.size;
      if (!changed) for (const id of vis) if (!this.visibleIds.has(id)) changed = true;
      if (changed) {
        this.visibleIds = vis;
        for (const cc of this.cells.values()) cc.setVisible(vis.has(cc.id));
        for (const d of this.doors.values()) d.updateVisibility(vis);
        this.assignLights();
      }
    }
    // per-frame room animations (only visible cells)
    for (const id of this.visibleIds) {
      const cell = this.cells.get(id);
      if (!cell) continue;
      for (const fn of cell.updaters) fn(dt, t);
    }
    // lights nearest the player win inside large cells: re-score a few times a second
    this.reassignTimer -= dt;
    if (this.reassignTimer <= 0) {
      this.reassignTimer = 0.4;
      this.assignLights();
    }
    this.updatePool(dt);
    this.stats.visibleCells = this.visibleIds.size;
    this.stats.current = this.current ? this.current.id : null;
  }

  /** Assign visible cells' declared lights to the pool by priority. */
  assignLights() {
    if (!this.current) return;
    const cur = this.current.id;
    const points = [];
    const spots = [];
    for (const id of this.visibleIds) {
      const cell = this.cells.get(id);
      if (!cell) continue;
      const boost = id === cur ? 1 : neighbours(cur).includes(id) ? 0.35 : 0.0;
      for (const l of cell.lights) {
        const dist = l.pos.distanceTo(this.playerPos);
        const score = l.priority + boost * 2 - dist / 40 + (dist < l.distance ? 0.4 : 0);
        (l.type === "spot" ? spots : points).push({ l, score });
      }
    }
    points.sort((a, b) => b.score - a.score);
    spots.sort((a, b) => b.score - a.score);
    // shadow-casting slot 0 goes to the best shadow-flagged spot of the current cell, if any
    const shadowIdx = spots.findIndex((s) => s.l.shadow && s.l.cell === cur);
    if (shadowIdx > 0) spots.unshift(...spots.splice(shadowIdx, 1));
    this.retarget(this.pool.points, points.slice(0, POOL_POINTS).map((x) => x.l));
    this.retarget(this.pool.spots, spots.slice(0, POOL_SPOTS).map((x) => x.l));
    this.stats.activeLights = Math.min(points.length, POOL_POINTS) + Math.min(spots.length, POOL_SPOTS);
  }

  retarget(slots, wanted) {
    // keep lights that are still wanted in their slot; fill the rest
    const keep = new Set();
    for (const s of slots) if (s.current && wanted.includes(s.current)) keep.add(s.current);
    const queue = wanted.filter((l) => !keep.has(l));
    for (const s of slots) {
      if (s.current && keep.has(s.current)) {
        s.target = s.current;
        continue;
      }
      s.target = queue.shift() || null;
      if (s.target !== s.current) s.phase = s.current ? "out" : "in";
      if (!s.current && s.target) {
        // empty slot: place immediately, fade in
        this.applySpec(s, s.target);
        s.current = s.target;
        s.fade = 0;
        s.phase = "in";
      }
    }
  }

  applySpec(slot, spec) {
    const l = slot.light;
    l.position.copy(spec.pos);
    l.color.copy(spec.color);
    l.distance = spec.distance;
    l.decay = spec.decay ?? 2;
    l.userData.baseIntensity = spec.intensity;
    if (l.isSpotLight) {
      l.angle = spec.angle ?? 0.8;
      l.penumbra = spec.penumbra ?? 0.6;
      if (spec.target) l.target.position.copy(spec.target);
      else l.target.position.copy(spec.pos).add(new THREE.Vector3(0, -1, 0));
      if (l.castShadow) {
        l.shadow.camera.far = Math.max(8, spec.distance * 1.2);
        l.shadow.camera.updateProjectionMatrix();
        if (!this.shadowSuspended) l.shadow.needsUpdate = true;
      }
    }
  }

  updatePool(dt) {
    for (const group of [this.pool.points, this.pool.spots]) {
      for (const s of group) {
        const l = s.light;
        if (s.phase === "out") {
          s.fade = Math.min(1, s.fade + dt / FADE);
          l.intensity = (l.userData.baseIntensity || 0) * (1 - s.fade);
          if (s.fade >= 1) {
            s.current = s.target;
            if (s.current) {
              this.applySpec(s, s.current);
              s.fade = 0;
              s.phase = "in";
            } else {
              l.intensity = 0;
              s.phase = "idle";
            }
          }
        } else if (s.phase === "in") {
          s.fade = Math.min(1, s.fade + dt / FADE);
          l.intensity = (l.userData.baseIntensity || 0) * s.fade * this.dim(s.current);
          if (s.fade >= 1) s.phase = "idle";
        } else if (s.current) {
          l.intensity = (l.userData.baseIntensity || 0) * this.dim(s.current);
        }
        // lights mirrored from a live THREE light (the Kestrel's rest-cycle controller drives those)
        if (s.current && s.current.source && s.phase !== "out") {
          const src = s.current.source;
          l.userData.baseIntensity = src.intensity;
          l.color.copy(src.color);
          if (s.phase === "idle") l.intensity = src.intensity * this.dim(s.current);
        }
      }
    }
  }

  /**
   * Outside the hull the interior key spot's shadow pass has nothing worth rendering: collapse its
   * frustum (no recompile, unlike toggling castShadow) and restore it when the camera comes back in.
   */
  setShadowSuspended(v) {
    if (this.shadowSuspended === v) return;
    this.shadowSuspended = v;
    for (const s of this.pool.spots) {
      const l = s.light;
      if (!l.castShadow) continue;
      // autoUpdate=false skips the shadow pass entirely (a collapsed frustum would still draw every
      // ship-sized instanced mesh whose bounding sphere contains the light)
      l.shadow.autoUpdate = !v;
      l.shadow.needsUpdate = !v;
    }
  }

  /** Hook for per-room light animation (flicker, alert): spec.dim is a function of time or a number. */
  dim(spec) {
    if (!spec) return 0;
    const d = spec.dim;
    if (typeof d === "function") return d(performance.now() * 0.001);
    return d ?? 1;
  }

  /** Room-local spawn pose -> world pose for the player. */
  spawnPose(roomId) {
    const r = ROOM_BY_ID[roomId];
    const s = r.spawn;
    return { x: r.origin[0] + s.x, y: r.origin[1] + (s.y || 0), z: r.origin[2] + s.z, yaw: s.yaw, pitch: s.pitch };
  }

  getStats() {
    return { ...this.stats, cells: this.cells.size, colliders: this.colliders.length, floors: this.floors.length };
  }
}

export { ROOMS, DOORS };
