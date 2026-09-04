// Interior registry: builds every room and corridor from the spec into per-space groups, wires doors
// and lifts, and streams zones (tower / engineering / hangar). Also provides portal-style culling
// (only the current space and spaces within two doorways are rendered), the light-fixture lists for the
// LightPool, camera presets per room, and the exterior-visibility hint for the current room.
import * as THREE from "three";
import { Kit } from "../kit.js";
import { buildShip as buildLegacyWing } from "../ship.js";
import { ROOMS, CORRIDORS, DECKS, ZONES, LEGACY_WING, LIFTS, roomFloorY } from "../config/shipSpec.js";
import { ROOM_BUILDERS } from "./rooms/index.js";
import { roomShell, IMPERIAL_STYLES, IMPERIAL_PAINTS, DARK_PAINTS, wallLightBar, wallConsole, doorOpening, roomWalls } from "./shell.js";
import { buildCorridorBox } from "./corridor.js";
import { DoorSystem } from "./doors.js";
import { LiftSystem } from "./lifts.js";
import * as lib from "./lib.js";
import { PALETTE } from "../materials.js";
import { makeLabel } from "../textures.js";

const LIB = { ...lib, roomShell, IMPERIAL_STYLES, IMPERIAL_PAINTS, DARK_PAINTS, wallLightBar, wallConsole, doorOpening, roomWalls, PALETTE };

function boxOf(space) {
  return { x0: space.x0, x1: space.x1, z0: space.z0, z1: space.z1 };
}

export function buildInterior({ scene, materials }) {
  const root = new THREE.Group();
  root.name = "interior";
  scene.add(root);
  const mats = { ...materials };
  materials.screens.forEach((m, i) => (mats["screen" + i] = m));
  mats.screens = materials.screens[0];

  const doors = new DoorSystem(mats);
  const lifts = new LiftSystem(mats, doors);

  const zones = {};
  for (const [id, z] of Object.entries(ZONES)) {
    const group = new THREE.Group();
    group.name = "zone:" + id;
    group.visible = false;
    root.add(group);
    zones[id] = { id, spec: z, group, colliders: [], floors: [], fixtures: [], spotFixtures: [], spaces: [], built: false };
  }

  const spaces = {}; // id -> { id, kind: 'room'|'corridor', spec, deck, zone, group, neighbors:Set, interactables, windows }
  const doorLinks = new Map(); // "a|b" -> door record, for door-state-aware culling
  const linkKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
  const signs = [];
  const labelCache = new Map();
  function labelMaterial(name, accent) {
    const key = name + "|" + accent;
    if (!labelCache.has(key)) {
      const col = /red/.test(accent || "") ? "#ff5a4a" : /amber|warm/.test(accent || "") ? "#ffb347" : "#6fb4ff";
      labelCache.set(key, new THREE.MeshBasicMaterial({ map: makeLabel(name, 512, 128, col), fog: false }));
    }
    return labelCache.get(key);
  }
  const interactables = [];
  const stats = { buildMs: {} };

  function registerSpace(kind, spec, zone, group, kit, ctx) {
    const sp = {
      id: spec.id,
      kind,
      spec,
      deck: spec.deck,
      zone: zone.id,
      group,
      dynamic: [],
      markers: [], // seats / stations / idle points for future crew systems
      neighbors: new Set(),
      windows: spec.windows || [],
      floorY: kind === "room" ? roomFloorY(spec) : DECKS[spec.deck].floorY,
      height: kind === "room" ? spec.height : 3.0,
    };
    spaces[spec.id] = sp;
    zone.spaces.push(sp);
    if (kit) {
      zone.colliders.push(...kit.colliders);
      zone.floors.push(...kit.floors);
      if (kit.markers) for (const m of kit.markers) sp.markers.push({ ...m, space: spec.id });
    }
    if (ctx) {
      for (const fam of ["warm", "cool", "teal"]) for (const l of ctx.lights[fam]) {
        l.userData.baseIntensity = l.intensity;
        l.userData.baseColor = l.color.clone();
        l.userData.space = spec.id;
        l.userData.family = fam;
        l.visible = false;
        group.add(l);
        zone.fixtures.push(l);
      }
      for (const s of ctx.lights.spots) {
        s.visible = false;
        group.add(s);
        group.add(s.target);
        zone.spotFixtures.push(s);
      }
      for (const it of ctx.interactables) {
        it.space = spec.id;
        interactables.push(it);
      }
    }
    return sp;
  }

  // ------------------------------------------------------------------ doors
  // Find the space on the far side of a room door so the leaf sits centred in the wall gap.
  function neighborAcross(deck, x, z, facing, exclude) {
    const probe = { x: x + (facing === "+x" ? 0.6 : facing === "-x" ? -0.6 : 0), z: z + (facing === "+z" ? 0.6 : facing === "-z" ? -0.6 : 0) };
    const all = [...CORRIDORS.filter((c) => c.deck === deck), ...ROOMS.filter((r) => r.deck === deck && r.id !== exclude)];
    return all.find((b) => probe.x >= b.x0 - 0.05 && probe.x <= b.x1 + 0.05 && probe.z >= b.z0 - 0.05 && probe.z <= b.z1 + 0.05) || null;
  }

  function addRoomDoors(kit, room, zone) {
    const y = roomFloorY(room);
    for (let i = 0; i < (room.doors || []).length; i++) {
      const [dx, dz, w, facing, h] = room.doors[i];
      const nb = neighborAcross(room.deck, dx, dz, facing, room.id);
      let cx = dx;
      let cz = dz;
      let depth = lib.WALL_T * 2 + 0.02;
      if (nb) {
        if (facing === "+x") (cx = (room.x1 + nb.x0) / 2), (depth = Math.max(depth, nb.x0 - room.x1 + lib.WALL_T * 2));
        if (facing === "-x") (cx = (room.x0 + nb.x1) / 2), (depth = Math.max(depth, room.x0 - nb.x1 + lib.WALL_T * 2));
        if (facing === "+z") (cz = (room.z1 + nb.z0) / 2), (depth = Math.max(depth, nb.z0 - room.z1 + lib.WALL_T * 2));
        if (facing === "-z") (cz = (room.z0 + nb.z1) / 2), (depth = Math.max(depth, room.z0 - nb.z1 + lib.WALL_T * 2));
        spaces[room.id] && nb.id && (spaces[room.id].neighbors.add(nb.id), spaces[nb.id] && spaces[nb.id].neighbors.add(room.id));
      } else {
        // no neighbour: the wall body is on the room's outside; centre the leaf on it
        const off = lib.WALL_T;
        if (facing === "+x") cx += off;
        if (facing === "-x") cx -= off;
        if (facing === "+z") cz += off;
        if (facing === "-z") cz -= off;
      }
      const axis = facing === "+z" || facing === "-z" ? "x" : "z";
      const big = w >= 5;
      const doorH = Math.min(room.height - 0.1, h || lib.DOOR_H);
      const door = doors.add(kit, { id: `${room.id}-${i}`, x: cx, z: cz, y, width: w, height: doorH, axis, depth, zone: zone.id, blast: big, locked: !!room.restricted && false });
      if (nb && nb.id) doorLinks.set(linkKey(room.id, nb.id), door);
      // wayfinding: the room's name on a sign above the door, read from the far side of the doorway
      if (nb && nb.id && !room.legacy) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.6, w * 0.6), 0.24), labelMaterial(room.name, room.accent));
        const out = depth / 2 + 0.03;
        const yS = y + doorH + (big ? 0.6 : 0.34);
        if (facing === "+x") sign.position.set(cx + out, yS, cz), sign.rotation.y = Math.PI / 2;
        else if (facing === "-x") sign.position.set(cx - out, yS, cz), sign.rotation.y = -Math.PI / 2;
        else if (facing === "+z") sign.position.set(cx, yS, cz + out);
        else sign.position.set(cx, yS, cz - out), sign.rotation.y = Math.PI;
        sign.name = "sign:" + room.id;
        signs.push(sign);
      }
    }
  }

  // ------------------------------------------------------------------ zone build
  function buildZone(zoneId) {
    const zone = zones[zoneId];
    if (zone.built) return zone;
    const t0 = performance.now();
    zone.built = true;
    for (const deckId of zone.spec.decks) {
      for (const cor of CORRIDORS.filter((c) => c.deck === deckId)) {
        const kit = new Kit(mats);
        const ctx = { lights: { warm: [], cool: [], teal: [], spots: [] }, interactables: [], materials: mats, lib: LIB };
        const g = new THREE.Group();
        g.name = "space:" + cor.id;
        buildCorridorBox(kit, ctx, cor);
        kit.build(g);
        zone.group.add(g);
        registerSpace("corridor", cor, zone, g, kit, ctx);
      }
      for (const room of ROOMS.filter((r) => r.deck === deckId)) {
        const g = new THREE.Group();
        g.name = "space:" + room.id;
        if (room.legacy === "kestrel") {
          g.position.set(LEGACY_WING.x, LEGACY_WING.y, LEGACY_WING.z);
          const wing = buildLegacyWing(g, materials, { aftOpen: true, shutterPortholes: true });
          const off = new THREE.Vector3(LEGACY_WING.x, LEGACY_WING.y, LEGACY_WING.z);
          for (const c of wing.colliders) {
            c.min.add(off);
            c.max.add(off);
          }
          for (const f of wing.floors) {
            f.x0 += off.x;
            f.x1 += off.x;
            f.z0 += off.z;
            f.z1 += off.z;
            f.y += off.y;
          }
          zone.group.add(g);
          const sp = registerSpace("room", room, zone, g, { colliders: wing.colliders, floors: wing.floors }, null);
          for (const fam of ["warm", "cool", "teal"]) for (const l of wing.lights[fam]) {
            l.userData.space = room.id;
            l.userData.family = fam;
            zone.fixtures.push(l);
          }
          for (const s of wing.lights.spots) zone.spotFixtures.push(s);
          for (const it of wing.interactables) {
            it.space = room.id;
            interactables.push(it);
          }
          // the wing's aft doorway leaf comes from the door system like every other door
          const dk = new Kit(mats);
          addRoomDoors(dk, room, zone);
          dk.build(g.parent);
          zone.colliders.push(...dk.colliders);
          sp.legacy = wing;
          continue;
        }
        const kit = new Kit(mats);
        const ctx = { lights: { warm: [], cool: [], teal: [], spots: [] }, interactables: [], materials: mats, lib: LIB, doors, lifts, group: g, dynamic: [] };
        const builder = ROOM_BUILDERS[room.id];
        if (builder) builder(kit, ctx, room, LIB);
        else roomShell(kit, ctx, room, {});
        registerSpace("room", room, zone, g, null, null); // neighbours need the space entry first
        signs.length = 0;
        addRoomDoors(kit, room, zone);
        for (const sgn of signs) g.add(sgn);
        signs.length = 0;
        kit.build(g);
        zone.group.add(g);
        const sp = spaces[room.id];
        zone.colliders.push(...kit.colliders);
        zone.floors.push(...kit.floors);
        for (const m of kit.markers) sp.markers.push({ ...m, space: room.id });
        for (const fam of ["warm", "cool", "teal"]) for (const l of ctx.lights[fam]) {
          l.userData.baseIntensity = l.intensity;
          l.userData.baseColor = l.color.clone();
          l.userData.space = room.id;
          l.userData.family = fam;
          l.visible = false;
          g.add(l);
          zone.fixtures.push(l);
        }
        for (const s of ctx.lights.spots) {
          s.visible = false;
          g.add(s);
          g.add(s.target);
          zone.spotFixtures.push(s);
        }
        for (const it of ctx.interactables) {
          it.space = room.id;
          interactables.push(it);
        }
        for (const dyn of ctx.dynamic) {
          if (dyn.object && !dyn.object.parent) g.add(dyn.object);
          sp.dynamic.push(dyn);
        }
        sp.ctx = ctx;
      }
    }
    // corridor <-> corridor adjacency (junctions) and corridor <-> lift landings
    const cors = zone.spaces.filter((s) => s.kind === "corridor");
    for (const a of cors) for (const b of cors) {
      if (a === b || a.deck !== b.deck) continue;
      const A = a.spec;
      const B = b.spec;
      if (A.x0 <= B.x1 + 0.5 && A.x1 >= B.x0 - 0.5 && A.z0 <= B.z1 + 0.5 && A.z1 >= B.z0 - 0.5) {
        a.neighbors.add(b.id);
        b.neighbors.add(a.id);
      }
    }
    stats.buildMs[zoneId] = +(performance.now() - t0).toFixed(0);
    if (doors.mesh) doors.rebuild();
    return zone;
  }

  // ------------------------------------------------------------------ lifts + doors (always resident)
  lifts.build(root);
  const startZone = "tower";
  buildZone(startZone);
  doors.build(root);
  doors.rebuild = () => {
    root.remove(doors.mesh);
    root.remove(doors.lamps);
    doors.mesh.dispose();
    doors.lamps.dispose();
    doors.build(root);
  };
  for (const it of lifts.interactables) interactables.push(it);

  // ------------------------------------------------------------------ streaming / state
  const state = { zone: null, space: null, visible: new Set() };

  function setActiveZone(zoneId) {
    if (state.zone === zoneId) return;
    buildZone(zoneId);
    for (const z of Object.values(zones)) z.group.visible = z.id === zoneId;
    state.zone = zoneId;
    state.space = null;
    state.visible = new Set();
    for (const sp of zones[zoneId].spaces) sp.group.visible = true; // until the first update resolves a space
    if (api.onZoneChange) api.onZoneChange(zoneId);
  }

  // Exterior "portal" view: show one zone's listed spaces (e.g. the hangar through the belly well) while
  // another zone stays the active one. unpeek() restores the streamed state.
  let peeked = null;
  function peek(zoneId, spaceIds) {
    const zone = buildZone(zoneId);
    if (peeked && peeked.zone === zoneId) return;
    peeked = { zone: zoneId, spaces: spaceIds };
    root.visible = true;
    for (const z of Object.values(zones)) z.group.visible = z.id === zoneId;
    for (const sp of zone.spaces) sp.group.visible = spaceIds.includes(sp.id);
    lifts.group.visible = false;
  }
  function unpeek(rootVisible = root.visible) {
    if (!peeked) return;
    const zone = zones[peeked.zone];
    for (const sp of zone.spaces) sp.group.visible = true;
    peeked = null;
    for (const z of Object.values(zones)) z.group.visible = z.id === state.zone;
    applyVisibility(state.visible);
    lifts.group.visible = true;
    root.visible = rootVisible;
  }

  function spaceAt(pos) {
    const zone = zones[state.zone];
    if (!zone) return null;
    let best = null;
    for (const sp of zone.spaces) {
      const b = sp.spec;
      if (pos.x < b.x0 - 0.3 || pos.x > b.x1 + 0.3 || pos.z < b.z0 - 0.3 || pos.z > b.z1 + 0.3) continue;
      // pits and lower galleries sit up to ~2.5 m under the nominal floor; lift shafts are excluded by x/z
      if (pos.y < sp.floorY - 2.6 || pos.y > sp.floorY + sp.height + 1) continue;
      if (!best || sp.kind === "room") best = sp; // rooms win over corridors on the overlap strip
    }
    return best;
  }

  // Portal culling. Closed doors block sight: a space draws itself, its direct neighbours (their doors
  // open as the player approaches) and the corridors joined to its corridors (junctions are open), but
  // never the rooms behind a second door.
  // A neighbour behind a door is only drawn while that door is not fully closed.
  function throughOpenDoor(a, b) {
    const door = doorLinks.get(linkKey(a, b));
    return !door || door.open > 0.001 || door.target > 0;
  }
  function computeVisible(sp) {
    const vis = new Set();
    if (!sp) return vis;
    vis.add(sp.id);
    for (const n of sp.neighbors) {
      if (!throughOpenDoor(sp.id, n)) continue;
      vis.add(n);
      const ns = spaces[n];
      if (!ns || ns.kind !== "corridor") continue;
      for (const m of ns.neighbors) {
        const ms = spaces[m];
        if (ms && ms.kind === "corridor") vis.add(m);
      }
    }
    return vis;
  }

  function applyVisibility(vis) {
    const zone = zones[state.zone];
    if (!zone) return;
    for (const sp of zone.spaces) sp.group.visible = vis.has(sp.id);
  }

  // Nearest space to a point in the active zone (by AABB distance): used while the player is in a lift
  // shaft or otherwise between spaces so culling never falls back to "draw everything".
  function nearestSpace(pos) {
    const zone = zones[state.zone];
    if (!zone) return null;
    let best = null;
    let bestD = Infinity;
    for (const sp of zone.spaces) {
      const b = sp.spec;
      const dx = Math.max(b.x0 - pos.x, 0, pos.x - b.x1);
      const dz = Math.max(b.z0 - pos.z, 0, pos.z - b.z1);
      const dy = Math.max(sp.floorY - pos.y, 0, pos.y - (sp.floorY + sp.height));
      const d = dx * dx + dz * dz + dy * dy * 0.25;
      if (d < bestD) {
        bestD = d;
        best = sp;
      }
    }
    return best;
  }

  const api = {
    root,
    zones,
    spaces,
    doors,
    lifts,
    interactables,
    stats,
    state,
    onZoneChange: null,
    onSpaceChange: null,
    setActiveZone,
    buildZone,
    spaceAt,
    get activeZone() {
      return zones[state.zone];
    },
    // collider / floor arrays the player should use right now
    colliders() {
      const z = zones[state.zone];
      return z ? [...z.colliders, ...lifts.colliders] : [...lifts.colliders];
    },
    floors() {
      const z = zones[state.zone];
      return z ? [...z.floors, ...lifts.floors] : [...lifts.floors];
    },
    fixtures() {
      const z = zones[state.zone];
      const own = z ? [...z.fixtures, ...lifts.fixtures] : [...lifts.fixtures];
      if (peeked && peeked.zone !== state.zone) own.push(...zones[peeked.zone].fixtures);
      return own;
    },
    peek,
    unpeek,
    get peeking() {
      return peeked ? peeked.zone : null;
    },
    spotFixtures() {
      const z = zones[state.zone];
      return z ? z.spotFixtures : [];
    },
    // every built fixture grouped by family, for the rest-cycle controller
    fixturesByFamily() {
      const out = { warm: [], cool: [], teal: [] };
      for (const z of Object.values(zones)) for (const l of z.fixtures) out[l.userData.family || "cool"].push(l);
      for (const l of lifts.fixtures) out.cool.push(l);
      return out;
    },
    // which exterior chunks the current room can see ("forward", "belly", ... or none)
    exteriorWindows() {
      return state.space ? spaces[state.space].windows : [];
    },
    currentSpace() {
      return state.space ? spaces[state.space] : null;
    },
    update(dt, player) {
      doors.update(dt, player.position, state.zone);
      lifts.update(dt);
      const zone = zones[state.zone];
      if (zone) for (const sp of zone.spaces) if (sp.group.visible) for (const dyn of sp.dynamic) dyn.update && dyn.update(dt);
      if (peeked && peeked.zone !== state.zone) for (const sp of zones[peeked.zone].spaces) if (sp.group.visible) for (const dyn of sp.dynamic) dyn.update && dyn.update(dt);
      const sp = spaceAt(player.position);
      const id = sp ? sp.id : null;
      // recomputed every frame: door states change what can be seen (cheap: a few neighbour lookups)
      const vis = computeVisible(sp || nearestSpace(player.position));
      let changed = vis.size !== state.visible.size;
      if (!changed) for (const v of vis) if (!state.visible.has(v)) {
        changed = true;
        break;
      }
      if (changed) {
        state.visible = vis;
        if (!peeked) applyVisibility(vis);
      }
      if (id !== state.space) {
        state.space = id;
        if (api.onSpaceChange) api.onSpaceChange(sp);
      }
    },
    // Camera preset inside a room: just inside its first door, looking at the room centre.
    viewFor(roomId) {
      const r = ROOMS.find((x) => x.id === roomId) || CORRIDORS.find((x) => x.id === roomId);
      if (!r) return null;
      const y = roomFloorY(r);
      const cx = (r.x0 + r.x1) / 2;
      const cz = (r.z0 + r.z1) / 2;
      let x = cx;
      let z = cz;
      if (r.doors && r.doors.length) {
        const [dx, dz, , facing] = r.doors[0];
        x = dx + (facing === "+x" ? -1.4 : facing === "-x" ? 1.4 : 0);
        z = dz + (facing === "+z" ? -1.4 : facing === "-z" ? 1.4 : 0);
      } else {
        // corridors: stand near one end and look down the long axis (dead ends face their lift portal)
        const longX = r.x1 - r.x0 >= r.z1 - r.z0;
        if (longX) x = r.x1 - 1.2;
        else z = r.z1 - 1.2;
      }
      const yaw = THREE.MathUtils.radToDeg(Math.atan2(-(cx - x), -(cz - z)));
      return { x, z, y, yaw, pitch: -4, zone: DECKS[r.deck].zone, space: r.id };
    },
    // Navigation / crew data for future phases: walkable floors and colliders per zone, markers per space
    navData(zoneId = state.zone) {
      const z = zones[zoneId];
      if (!z) return null;
      return { floors: z.floors, colliders: z.colliders, markers: z.spaces.flatMap((sp) => sp.markers) };
    },
    roomIds: ROOMS.map((r) => r.id),
    corridorIds: CORRIDORS.map((c) => c.id),
    // Walkability graph check: every space must be reachable from the bridge through doors, junctions
    // and lift landings. Builds all zones. Returns { reachable, unreachable, edges }.
    connectivity(from = "bridge") {
      for (const id of Object.keys(zones)) buildZone(id);
      const adj = new Map(Object.keys(spaces).map((id) => [id, new Set(spaces[id].neighbors)]));
      // lifts connect the space in front of each landing door
      for (const l of Object.values(LIFTS)) {
        const cx = (l.x0 + l.x1) / 2;
        const cz = (l.z0 + l.z1) / 2;
        const probe = { x: cx + (l.doorSide === "+x" ? 2.2 : l.doorSide === "-x" ? -2.2 : 0), z: cz + (l.doorSide === "+z" ? 2.2 : l.doorSide === "-z" ? -2.2 : 0) };
        const landings = [];
        for (const deck of l.decks) {
          const hit = Object.values(spaces).find((sp) => sp.deck === deck && probe.x >= sp.spec.x0 - 0.05 && probe.x <= sp.spec.x1 + 0.05 && probe.z >= sp.spec.z0 - 0.05 && probe.z <= sp.spec.z1 + 0.05);
          if (hit) landings.push(hit.id);
        }
        for (const a of landings) for (const b of landings) if (a !== b) adj.get(a).add(b);
      }
      const seen = new Set([from]);
      const queue = [from];
      while (queue.length) {
        const id = queue.shift();
        for (const n of adj.get(id) || []) if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
      const unreachable = Object.keys(spaces).filter((id) => !seen.has(id));
      return { reachable: [...seen], unreachable, edges: [...adj].map(([k, v]) => [k, [...v]]) };
    },
  };

  // lifts build the destination zone while their doors close and switch zones halfway through a ride
  lifts.onPrepareZone = (zoneId) => buildZone(zoneId);
  lifts.onZoneChange = (zoneId) => setActiveZone(zoneId);
  setActiveZone(startZone);
  return api;
}

export { LIFTS };
