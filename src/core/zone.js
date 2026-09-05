// Rooms, clusters and streaming. Every room is built into its own group with its own merged meshes,
// colliders, walkables, light descriptors, interactables and animators. The ZoneManager decides which
// rooms are visible (the current room plus anything reachable through an open door or an open portal;
// in exterior view, whole clusters near the camera), keeps the player's collision set small and feeds
// the light pool. Doors live between rooms and are visible whenever either side is.
import * as THREE from "three";
import { Kit } from "../kit.js";
import { ROOMS, CLUSTERS, DOORS, roomFloorY } from "../config/layout.js";
import { NO_SHADOW_KEYS } from "../materials/imperial.js";
import { Door } from "../interior/doors.js";

export class Room {
  constructor(id, spec, mats) {
    this.id = id;
    this.spec = spec;
    this.cluster = spec.cluster;
    this.floorY = roomFloorY(id);
    this.group = new THREE.Group();
    this.group.name = "room_" + id;
    this.kit = new Kit(mats);
    this.mats = mats;
    this.lights = [];
    this.walkables = [];
    this.interactables = [];
    this.animators = [];
    this.views = {};
    this.portals = new Set(); // always-open connections to other rooms
    this.neighbors = new Set(); // rooms connected via doors
    this.doors = [];
    const [x0, z0, x1, z1] = spec.box;
    const drop = spec.floorDrop || 0;
    this.bounds = new THREE.Box3(new THREE.Vector3(x0 - 0.6, this.floorY - drop - 1, z0 - 0.6), new THREE.Vector3(x1 + 0.6, this.floorY + spec.h + 1, z1 + 0.6));
    this.center = new THREE.Vector3((x0 + x1) / 2, this.floorY + Math.min(spec.h, 3) / 2, (z0 + z1) / 2);
    this.built = false;
    this.visible = true;
    this.colliders = this.kit.colliders;
  }

  // Builder context handed to room modules
  context() {
    const room = this;
    return {
      id: this.id,
      room: this.spec,
      floorY: this.floorY,
      mats: this.mats,
      kit: this.kit,
      lights: this.lights,
      walkables: this.walkables,
      interactables: this.interactables,
      views: this.views,
      animate(fn) {
        room.animators.push(fn);
      },
      add(obj) {
        return room.kit.object(obj);
      },
      portal(otherId) {
        room.portals.add(otherId);
      },
      // grow the room's streaming / current-room bounds (turbolift cabs sit outside the lobby box)
      expandBounds(min, max) {
        room.bounds.expandByPoint(new THREE.Vector3(...min));
        room.bounds.expandByPoint(new THREE.Vector3(...max));
      },
      view(name, x, y, z, yaw, pitch) {
        room.views[name] = { x, y, z, yaw, pitch, room: room.id };
      },
    };
  }

  build(builderFn) {
    const ctx = this.context();
    builderFn(this.kit, ctx);
    this.kit.build(this.group, { noShadow: NO_SHADOW_KEYS });
    this.built = true;
    return this;
  }

  contains(p) {
    return this.bounds.containsPoint(p);
  }

  setVisible(v) {
    if (this.visible === v) return;
    this.visible = v;
    this.group.visible = v;
    // hidden rooms drop out of the per-frame matrix walk entirely
    this.group.matrixWorldAutoUpdate = v;
    if (v) this.group.updateMatrixWorld(true);
  }
}

export class ZoneManager {
  constructor(scene, mats) {
    this.scene = scene;
    this.mats = mats;
    this.rooms = new Map();
    this.doors = [];
    this.root = new THREE.Group();
    this.root.name = "interior";
    scene.add(this.root);
    this.current = null;
    this.currentCluster = null;
    this.visibleSet = new Set();
    this.mode = "interior";
    this.onRoomChange = null;
    this.onClusterChange = null;
    this._lastKey = "";
    this.stats = { visibleRooms: 0, colliders: 0, lightDescs: 0 };
  }

  addRoom(id, builderFn) {
    const spec = ROOMS[id];
    if (!spec) throw new Error("unknown room " + id);
    const room = new Room(id, spec, this.mats);
    const t0 = performance.now();
    room.build(builderFn);
    room.buildMs = performance.now() - t0;
    this.rooms.set(id, room);
    this.root.add(room.group);
    return room;
  }

  // After all rooms exist: doors + adjacency. Door frames are static, so every frame in a cluster is
  // merged into one mesh set; only the sliding panels and status lights stay per-door.
  finalize() {
    for (const spec of DOORS) {
      const a = this.rooms.get(spec.a);
      const b = this.rooms.get(spec.b);
      if (!a || !b) continue;
      const door = new Door(spec, a.floorY, this.mats);
      this.doors.push(door);
      this.root.add(door.group);
      a.doors.push(door);
      b.doors.push(door);
      a.neighbors.add(b.id);
      b.neighbors.add(a.id);
    }
    this.clusterStatic = {};
    const kits = {};
    for (const d of this.doors) {
      const cl = this.rooms.get(d.rooms[0]).cluster;
      if (!kits[cl]) kits[cl] = new Kit(this.mats);
      d.buildStatic(kits[cl]);
    }
    for (const [cl, kit] of Object.entries(kits)) {
      const g = new THREE.Group();
      g.name = "doorFrames_" + cl;
      kit.build(g, { noShadow: NO_SHADOW_KEYS });
      this.root.add(g);
      this.clusterStatic[cl] = g;
    }
    // portals are symmetric
    for (const r of this.rooms.values()) for (const o of r.portals) this.rooms.get(o)?.portals.add(r.id);
    // sub-rooms (e.g. the flight-control booth inside the hangar) are portal-linked to their host
    for (const r of this.rooms.values()) {
      if (r.spec.sub && this.rooms.has(r.spec.sub)) {
        r.portals.add(r.spec.sub);
        this.rooms.get(r.spec.sub).portals.add(r.id);
      }
    }
  }

  // A door that is not part of the layout's room-to-room list (turbolift cab doors)
  addDoor(roomId, door) {
    const room = this.rooms.get(roomId);
    this.doors.push(door);
    this.root.add(door.group);
    if (room) room.doors.push(door);
    return door;
  }

  roomAt(p) {
    // prefer the current room while the point is still inside it (doorways sit in neither box)
    if (this.current && this.current.contains(p)) return this.current;
    let best = null;
    for (const r of this.rooms.values()) {
      if (!r.contains(p)) continue;
      // smallest room wins (booths inside the hangar)
      if (!best || volume(r.bounds) < volume(best.bounds)) best = r;
    }
    return best;
  }

  setCurrent(room) {
    if (room === this.current) return;
    const prev = this.current;
    this.current = room;
    if (this.onRoomChange) this.onRoomChange(room, prev);
    const cl = room ? room.cluster : null;
    if (cl !== this.currentCluster) {
      this.currentCluster = cl;
      if (this.onClusterChange) this.onClusterChange(cl);
    }
  }

  /**
   * @param dt seconds
   * @param playerPos feet position (interior) — may be null in exterior mode
   * @param cameraPos world camera position
   * @param mode 'interior' | 'exterior' | 'transition'
   */
  update(dt, playerPos, cameraPos, mode) {
    this.mode = mode;
    const vis = new Set();
    if (mode === "interior" && playerPos) {
      const here = this.roomAt(playerPos);
      if (here) this.setCurrent(here);
      const cur = this.current;
      if (cur) {
        vis.add(cur);
        for (const pid of cur.portals) vis.add(this.rooms.get(pid));
        for (const d of cur.doors) {
          if (d.progress > 0.001) for (const rid of d.rooms) vis.add(this.rooms.get(rid));
        }
        // one more hop through open doors of portal rooms (booth -> hangar -> open blast door)
        for (const r of [...vis]) {
          for (const pid of r.portals) vis.add(this.rooms.get(pid));
          for (const d of r.doors) if (d.progress > 0.001) for (const rid of d.rooms) vis.add(this.rooms.get(rid));
        }
      }
    } else {
      // exterior / transition: only rooms that can be seen from outside (windows, the hangar well),
      // when the camera is near their cluster
      for (const r of this.rooms.values()) {
        if (this.exteriorVisible && !this.exteriorVisible.has(r.id)) continue;
        const c = CLUSTERS[r.cluster];
        const dx = cameraPos.x - c.center[0];
        const dy = cameraPos.y - c.center[1];
        const dz = cameraPos.z - c.center[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const reach = r.spec.hero ? c.radius * 3.5 : c.radius * 1.6;
        if (dist < reach) vis.add(r);
      }
    }
    vis.delete(undefined);
    for (const r of this.rooms.values()) r.setVisible(vis.has(r));
    if (this.clusterStatic) {
      const live = new Set();
      for (const r of vis) live.add(r.cluster);
      for (const [cl, g] of Object.entries(this.clusterStatic)) g.visible = live.has(cl);
    }
    for (const d of this.doors) {
      const show = vis.has(this.rooms.get(d.rooms[0])) || vis.has(this.rooms.get(d.rooms[1]));
      d.group.visible = show;
      if (show) d.update(dt, playerPos);
    }
    this.visibleSet = vis;
    this.stats.visibleRooms = vis.size;
    // the derived per-frame lists (colliders, lights, interactables) only change with this key
    let key = this.current ? this.current.id : "-";
    for (const r of vis) key += "," + r.id;
    this.visChanged = key !== this._lastKey;
    if (this.visChanged) {
      this._lastKey = key;
      this._cache = null;
    }
    return vis;
  }

  _derived() {
    if (this._cache) return this._cache;
    const colliders = [];
    const walkables = [];
    const lights = [];
    const interactables = [];
    const cur = this.current;
    const set = new Set(this.visibleSet);
    if (cur) {
      set.add(cur);
      for (const n of cur.neighbors) set.add(this.rooms.get(n));
      for (const p of cur.portals) set.add(this.rooms.get(p));
    }
    set.delete(undefined);
    const seen = new Set();
    for (const r of set) {
      for (const c of r.colliders) colliders.push(c);
      for (const w of r.walkables) walkables.push(w);
      // a door belongs to two rooms: push its colliders once (the blocker toggles via its own flag)
      for (const d of r.doors) {
        if (seen.has(d)) continue;
        seen.add(d);
        for (const c of d.colliders) colliders.push(c);
      }
    }
    for (const r of this.visibleSet) {
      for (const l of r.lights) lights.push(l);
      for (const it of r.interactables) interactables.push(it);
    }
    this.stats.colliders = colliders.length;
    this.stats.lightDescs = lights.length;
    this._cache = { sets: { colliders, walkables }, lights, interactables };
    return this._cache;
  }

  // Everything the player can collide with / stand on right now (cached until visibility changes)
  collisionSets() {
    return this._derived().sets;
  }

  lightDescs() {
    return this._derived().lights;
  }

  interactables() {
    return this._derived().interactables;
  }

  runAnimators(dt, t) {
    for (const r of this.visibleSet) for (const fn of r.animators) fn(dt, t);
  }

  allViews() {
    const v = {};
    for (const r of this.rooms.values()) Object.assign(v, r.views);
    return v;
  }

  doorById(id) {
    return this.doors.find((d) => d.id === id);
  }
}

function volume(b) {
  return (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z);
}
