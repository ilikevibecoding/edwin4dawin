// Interior assembly: decks → sectors, doors, the visibility graph (current sector + door-connected
// neighbours, transitive over open portals), collider ownership for the player, deck streaming and
// the turbolift. All sector geometry is built lazily per deck.
import * as THREE from "three";
import { DECKS } from "./layout.js";
import { Sector } from "./sector.js";
import { Door } from "./doors.js";
import { Kit } from "../kit.js";
import { buildCorridor, buildLobby } from "./corridor.js";
import { buildLiftCab, Turbolift } from "./turbolift.js";
import { getBuilder } from "./rooms/index.js";

export function createInterior({ scene, materials, player, hud, audio, traffic = null, exterior = null }) {
  const group = new THREE.Group();
  group.name = "interior";
  scene.add(group);

  const sectors = new Map();
  const decks = [];
  const doorDefs = new Map(); // sectorId -> door defs touching it
  let currentSector = null;
  let currentDeck = null;
  let visibleSet = new Set();
  let collidersDirty = true;
  const listeners = { sector: [] };

  const api = {
    group,
    decks,
    sectors,
    materials,
    traffic,
    exterior,
    audio,
    get currentSector() {
      return currentSector;
    },
    get currentDeck() {
      return currentDeck;
    },
    get visibleSectors() {
      return [...visibleSet].map((id) => sectors.get(id));
    },
    deckById,
    doorDefsFor: (id) => doorDefs.get(id) || [],
    runBuilder,
    ensureDeckBuilt,
    streamDeck,
    deckBuilt,
    teleport,
    forceSector,
    onSectorChange(fn) {
      listeners.sector.push(fn);
    },
    lift: null,
    /** Any sector with a view of the exterior currently visible? */
    seesExterior() {
      for (const id of visibleSet) if (sectors.get(id).def.seesExterior) return true;
      return false;
    },
    /**
     * Exterior camera mode: hide every sector (they sit inside the hull) except the hangar bay, which
     * shows through its ventral opening. Turning it off restores the visibility graph.
     */
    setExteriorView(on) {
      if (on) {
        for (const s of sectors.values()) if (s.built) s.group.visible = false;
        for (const deck of decks) deck.doorGroup.visible = false;
        const hangar = sectors.get("d5_hangar");
        if (hangar && hangar.built) hangar.group.visible = true;
        api.exteriorView = true;
      } else if (api.exteriorView) {
        api.exteriorView = false;
        for (const s of sectors.values()) if (s.built) s.group.visible = s.visible;
        for (const deck of decks) deck.doorGroup.visible = deck.sectors.some((s) => visibleSet.has(s.id));
      }
    },
    update(dt, t) {
      if (!currentSector) return;
      const s = locate(player.position);
      if (s && s !== currentSector) setCurrent(s);
      if (collidersDirty) rebuildColliders();
      // doors of visible sectors
      const seen = new Set();
      for (const id of visibleSet) {
        const sec = sectors.get(id);
        for (const d of sec.doors) {
          if (seen.has(d)) continue;
          seen.add(d);
          d.update(dt, player.position, true);
        }
        sec.runAnims(dt, t);
      }
      if (api.lift) api.lift.update(dt);
    },
  };

  for (const def of DECKS) {
    const deck = { def, id: def.id, sectors: [], doors: [], built: false, pending: [], group: new THREE.Group(), doorGroup: new THREE.Group() };
    deck.group.name = "deck_" + def.id;
    deck.doorGroup.name = "doors_" + def.id;
    deck.doorGroup.position.set(...def.origin);
    deck.doorGroup.visible = false;
    group.add(deck.doorGroup);
    for (const s of def.sectors) {
      const sector = new Sector(s, def, api);
      sectors.set(s.id, sector);
      deck.sectors.push(sector);
      doorDefs.set(s.id, []);
    }
    for (const d of def.doors) {
      doorDefs.get(d.a).push(d);
      doorDefs.get(d.b).push(d);
      const a = sectors.get(d.a);
      const b = sectors.get(d.b);
      if (d.style === "open") {
        a.links.add(b.id);
        b.links.add(a.id);
      } else {
        a.neighbors.add(b.id);
        b.neighbors.add(a.id);
      }
    }
    decks.push(deck);
  }


  function deckById(id) {
    return decks.find((d) => d.id === id);
  }

  function runBuilder(sector, ctx) {
    const kind = sector.def.kind;
    if (kind === "corridor") return buildCorridor(ctx.kit, ctx);
    if (kind === "lobby") return buildLobby(ctx.kit, ctx);
    if (kind === "lift") return buildLiftCab(ctx.kit, ctx);
    return getBuilder(sector.def.builder)(ctx.kit, ctx);
  }

  function buildDeckDoors(deck) {
    if (deck.doors.length) return;
    const frameKit = new Kit(materials);
    for (const d of deck.def.doors) {
      const a = sectors.get(d.a);
      const b = sectors.get(d.b);
      const door = new Door(d, deck.def, a.def.bounds, b.def.bounds, frameKit, materials);
      door.onEvent = (name, pos) => audio && audio.event(name, pos);
      deck.doorGroup.add(door.group);
      deck.doors.push(door);
      a.doors.push(door);
      b.doors.push(door);
      // world colliders
      const o = deck.def.origin;
      const toWorld = (c) => ({ ...c, min: new THREE.Vector3(c.min[0] + o[0], c.min[1] + o[1], c.min[2] + o[2]), max: new THREE.Vector3(c.max[0] + o[0], c.max[1] + o[1], c.max[2] + o[2]) });
      door.worldColliders = door.frameColliders.map((c) => toWorld({ ...c, tag: "jamb" }));
      if (door.leafCollider) {
        const wc = toWorld(door.leafCollider);
        door.leafCollider = wc; // update() toggles `enabled` on this object
        door.worldColliders.push(wc);
      }
    }
    frameKit.build(deck.doorGroup, { castShadow: true, receiveShadow: true });
  }

  /** Build a whole deck synchronously. */
  function ensureDeckBuilt(id) {
    const deck = deckById(id);
    if (deck.built) return deck;
    buildDeckDoors(deck);
    for (const s of deck.sectors) s.ensureBuilt();
    deck.built = true;
    deck.pending = [];
    return deck;
  }

  /** Build one pending sector of a deck per call (spread over frames while the lift moves). */
  function streamDeck(id) {
    const deck = deckById(id);
    if (deck.built) return true;
    buildDeckDoors(deck);
    if (!deck.pending.length && !deck.streaming) {
      deck.pending = deck.sectors.filter((s) => !s.built);
      deck.streaming = true;
    }
    const s = deck.pending.shift();
    if (s) s.ensureBuilt();
    if (!deck.pending.length) {
      deck.built = true;
      deck.streaming = false;
    }
    return deck.built;
  }

  function deckBuilt(id) {
    return deckById(id).built;
  }

  function computeVisible(sector) {
    const vis = new Set();
    const closure = (id) => {
      if (vis.has(id)) return;
      vis.add(id);
      for (const l of sectors.get(id).links) closure(l);
    };
    closure(sector.id);
    for (const id of [...vis]) for (const n of sectors.get(id).neighbors) closure(n);
    return vis;
  }

  function applyVisibility() {
    const vis = computeVisible(currentSector);
    for (const id of visibleSet) if (!vis.has(id)) sectors.get(id).setVisible(false);
    for (const id of vis) sectors.get(id).setVisible(true);
    visibleSet = vis;
    // door groups: a deck's doors show when any of its sectors is visible
    for (const deck of decks) deck.doorGroup.visible = deck.sectors.some((s) => vis.has(s.id));
    collidersDirty = true;
  }

  function rebuildColliders() {
    const list = [];
    const seen = new Set();
    for (const id of visibleSet) {
      const s = sectors.get(id);
      for (const c of s.colliders) list.push(c);
      for (const d of s.doors) {
        if (seen.has(d)) continue;
        seen.add(d);
        for (const c of d.worldColliders || []) list.push(c);
      }
    }
    player.colliders = list;
    player.baseFloorY = currentSector.floorY;
    collidersDirty = false;
  }

  function setCurrent(sector) {
    if (sector === currentSector) return;
    const prev = currentSector;
    currentSector = sector;
    currentDeck = deckById(sector.deck.id);
    applyVisibility();
    for (const fn of listeners.sector) fn(sector, prev);
  }

  function locate(p) {
    if (currentSector && currentSector.containsWorld(p)) return currentSector;
    if (currentSector) {
      for (const id of visibleSet) {
        const s = sectors.get(id);
        if (s !== currentSector && s.containsWorld(p, 0)) return s;
      }
      for (const s of currentDeck.sectors) if (s.containsWorld(p, 0.3)) return s;
    }
    let best = null;
    let bestD = Infinity;
    for (const s of sectors.values()) {
      if (s.containsWorld(p, 0.5)) return s;
      const d = s.worldCenter.distanceTo(p);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  function forceSector(sector) {
    ensureDeckBuilt(sector.deck.id);
    setCurrent(sector);
    rebuildColliders();
  }

  /** Teleport the player to a sector's spawn (or explicit local x/z/yaw). */
  function teleport(sectorId, opts = {}) {
    const s = sectors.get(sectorId);
    if (!s) throw new Error("unknown sector " + sectorId);
    ensureDeckBuilt(s.deck.id);
    const sp = s.spawn();
    const o = s.deck.origin;
    const x = opts.x !== undefined ? opts.x + o[0] : sp.x;
    const z = opts.z !== undefined ? opts.z + o[2] : sp.z;
    const y = opts.y !== undefined ? opts.y + o[1] : sp.y;
    setCurrent(s);
    rebuildColliders();
    player.setPose(x, z, opts.yaw !== undefined ? opts.yaw : sp.yaw, opts.pitch !== undefined ? opts.pitch : 0, y);
    // settle onto whatever floor is under the spawn (pits, platforms)
    player.position.y = player.groundAt(x, z, y + 0.4);
    player.updateCamera(0);
    player.camera.updateMatrixWorld(true);
    return s;
  }

  api.lift = new Turbolift({ interior: api, player, hud, audio });
  return api;
}
