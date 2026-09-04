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
  const listeners = { sector: [], deckBuilt: [] };

  // --- fixed light pool (constant shader light counts → no program recompiles between rooms)
  const POOL_POINTS = 14;
  const POOL_SPOTS = 2;
  const pool = { points: [], spots: [], assigned: [], timer: 0, held: new Set() };
  for (let i = 0; i < POOL_POINTS; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 1, 2);
    l.name = "pool_point_" + i;
    group.add(l);
    pool.points.push(l);
  }
  for (let i = 0; i < POOL_SPOTS; i++) {
    const l = new THREE.SpotLight(0xffffff, 0, 1, 0.5, 0.5, 1.5);
    l.name = "pool_spot_" + i;
    if (i === 0) {
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.0003;
      l.shadow.normalBias = 0.03;
      l.shadow.camera.near = 0.3;
      l.shadow.camera.far = 40;
      // the map is only rendered when a source is assigned (see assignPool); an idle slot would
      // otherwise re-render the whole visible interior into a 1024² map every frame
      l.shadow.autoUpdate = false;
      l.shadow.needsUpdate = true; // one render at start so the shadow sampler always has a real map bound
    }
    group.add(l);
    group.add(l.target);
    pool.spots.push(l);
  }
  const _wp = new THREE.Vector3();
  // --- ship-wide alert state (red alert): pool lights and white strips shift to red and pulse
  const alert = { level: 0, target: 0, t: 0, alarmTimer: 0 };
  const ALERT_RED = new THREE.Color("#ff2a1a");
  const _tmpC = new THREE.Color();
  const alertMats = () => ["emitWhite", "emitWhiteSoft", "emitBlue"].map((k) => materials[k]).filter(Boolean);
  for (const m of alertMats()) m.userData.baseEmissive = m.emissive.clone();
  function applyAlert(dt) {
    const dir = Math.sign(alert.target - alert.level);
    if (dir) {
      alert.level = THREE.MathUtils.clamp(alert.level + dir * dt * 1.5, 0, 1);
      if ((dir > 0 && alert.level > alert.target) || (dir < 0 && alert.level < alert.target)) alert.level = alert.target;
    }
    alert.t += dt;
    if (alert.level <= 0) {
      for (const m of alertMats()) if (m.userData.baseEmissive) m.emissive.copy(m.userData.baseEmissive);
      return;
    }
    const pulse = 0.55 + 0.45 * Math.sin(alert.t * 4.5);
    for (const m of alertMats()) {
      if (!m.userData.baseEmissive) continue;
      m.emissive.copy(m.userData.baseEmissive).lerp(ALERT_RED, alert.level * (0.6 + 0.4 * pulse));
    }
    alert.alarmTimer += dt;
    if (alert.alarmTimer > 1.6 && alert.target > 0) {
      alert.alarmTimer = 0;
      if (audio) audio.event("alarm", player.position);
    }
  }
  const worldPos = (light, out) => {
    const o = light.userData.sector.deck.origin;
    return out.set(light.position.x + o[0], light.position.y + o[1], light.position.z + o[2]);
  };
  function assignPool() {
    const pts = [];
    const sps = [];
    // in exterior view only the rooms seen through real openings (hangar bay, bridge, observation
    // gallery) need real lights
    const ids = api.exteriorView ? EXTERIOR_VISIBLE.filter((id) => sectors.get(id).built && sectors.get(id).group.visible) : visibleSet;
    const ref = api.exteriorView ? player.camera.position : player.position;
    for (const id of ids) {
      for (const l of sectors.get(id).lights) {
        const d = worldPos(l, _wp).distanceTo(ref);
        // priority: bright lights that can actually reach the player; the current sector's own
        // lights win over neighbours' lights behind the player (they are its designed lighting)
        const own = currentSector && l.userData.sector === currentSector ? 12 : 0;
        // hysteresis: a light already in the pool keeps its place unless beaten by > 3 m (no popping)
        const held = pool.held.has(l) ? 3 : 0;
        const score = d - l.distance * 0.5 - own - held;
        (l.isSpotLight ? sps : pts).push({ l, score });
      }
    }
    pts.sort((a, b) => a.score - b.score);
    sps.sort((a, b) => (b.l.castShadow ? 1 : 0) - (a.l.castShadow ? 1 : 0) || a.score - b.score);
    pool.assigned = [];
    pool.held.clear();
    pool.points.forEach((slot, i) => {
      const src = pts[i] ? pts[i].l : null;
      slot.userData.src = src;
      if (!src) slot.intensity = 0;
      else pool.held.add(src);
    });
    pool.spots.forEach((slot, i) => {
      const src = sps[i] ? sps[i].l : null;
      slot.userData.src = src;
      if (!src) slot.intensity = 0;
      else pool.held.add(src);
      // shadow map refreshed on each re-rank (twice a second) while a source is assigned; static rooms
      // need nothing more, and door leaves only lag by half a second
      if (slot.castShadow && src) slot.shadow.needsUpdate = true;
    });
    pool.overflow = Math.max(0, pts.length - POOL_POINTS) + Math.max(0, sps.length - POOL_SPOTS);
    syncPool();
  }
  function syncPool() {
    const pulse = 0.5 + 0.5 * Math.sin(alert.t * 4.5);
    const tint = (slot, src) => {
      if (alert.level > 0) {
        slot.color.copy(src.color).lerp(ALERT_RED, alert.level * 0.85);
        slot.intensity = src.intensity * (1 - alert.level * 0.55 + alert.level * 0.7 * pulse);
      } else {
        slot.color.copy(src.color);
        slot.intensity = src.intensity;
      }
    };
    for (const slot of pool.points) {
      const src = slot.userData.src;
      if (!src) continue;
      worldPos(src, slot.position);
      tint(slot, src);
      slot.distance = src.distance;
      slot.decay = src.decay;
    }
    for (const slot of pool.spots) {
      const src = slot.userData.src;
      if (!src) continue;
      worldPos(src, slot.position);
      const o = src.userData.sector.deck.origin;
      slot.target.position.set(src.target.position.x + o[0], src.target.position.y + o[1], src.target.position.z + o[2]);
      tint(slot, src);
      slot.distance = src.distance;
      slot.decay = src.decay;
      slot.angle = src.angle;
      slot.penumbra = src.penumbra;
    }
  }

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
    unloadDeck,
    /** Unload every built deck at least 'keep' deck-indices away from the current one. */
    trimDecks(keep = 2) {
      if (!currentDeck) return [];
      const dropped = [];
      for (const deck of decks) if (deck.built && Math.abs(deck.def.index - currentDeck.def.index) >= keep && unloadDeck(deck.id)) dropped.push(deck.id);
      return dropped;
    },
    teleport,
    forceSector,
    onSectorChange(fn) {
      listeners.sector.push(fn);
    },
    /** Fires (deck) when a deck finishes building (synchronously or streamed). */
    onDeckBuilt(fn) {
      listeners.deckBuilt.push(fn);
    },
    /** Door by name ("door_<a>_<b>") or by its two sector ids in either order. */
    door(a, b) {
      for (const deck of decks) for (const d of deck.doors) if (d.group.name === a || (d.def.a === a && d.def.b === b) || (d.def.a === b && d.def.b === a)) return d;
      return null;
    },
    /** NPC / gameplay markers registered by room builders (kind: "stand" | "seat" | "patrol" | ...). */
    markers(kind = null, sectorId = null) {
      const out = [];
      for (const s of sectors.values()) {
        if (sectorId && s.id !== sectorId) continue;
        for (const m of s.markers) if (!kind || m.kind === kind) out.push({ ...m, sector: s.id, world: s.markerWorld(m.id) });
      }
      return out;
    },
    /** Network-friendly interior state: doors, lift, alert. */
    snapshot() {
      const doors = [];
      for (const deck of decks) for (const d of deck.doors) doors.push({ n: d.group.name, o: +d.openness.toFixed(3), t: d.target, l: d.locked ? 1 : 0, h: d.holdState === null ? -1 : d.holdState ? 1 : 0 });
      return { t: Date.now(), doors, lift: api.lift ? api.lift.snapshot() : null, alert: alert.target };
    },
    applySnapshot(snap) {
      for (const s of snap.doors || []) {
        const d = api.door(s.n);
        if (!d) continue;
        d.locked = !!s.l;
        d.holdState = s.h < 0 ? null : !!s.h;
        d.target = s.t;
        if (Math.abs(d.openness - s.o) > 0.25) d.openness = s.o; // snap on large drift, else let the local anim converge
      }
      if (snap.lift && api.lift) api.lift.applySnapshot(snap.lift);
      if (snap.alert !== undefined && snap.alert !== alert.target) api.setAlert(!!snap.alert);
    },
    lift: null,
    lightPool: pool,
    alert,
    setAlert(on) {
      alert.target = on ? 1 : 0;
      if (on) alert.alarmTimer = 10;
      if (hud) hud.setStatus(on ? "RED ALERT — all hands to battle stations." : "Alert cancelled. Resume normal operations.");
      document.body.classList.toggle("alert", !!on);
      return alert.target;
    },
    /** Number of pool lights carrying a source light, plus how many visible lights had no slot. */
    lightUsage() {
      const used = pool.points.filter((l) => l.userData.src).length + pool.spots.filter((l) => l.userData.src).length;
      return { used, overflow: pool.overflow || 0 };
    },
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
        const cam = player.camera.position;
        for (const id of EXTERIOR_VISIBLE) {
          const sec = sectors.get(id);
          if (!sec || !sec.built) continue;
          // the bay shows from below the hull, the bridge / gallery from above and within ~700 m of the tower
          sec.group.visible = id === "d5_hangar" ? cam.y < 40 : cam.y > -20 && cam.distanceTo(sec.worldCenter) < 700;
        }
        if (!api.exteriorView) {
          api.exteriorView = true;
          assignPool();
        }
      } else if (api.exteriorView) {
        api.exteriorView = false;
        for (const s of sectors.values()) if (s.built) s.group.visible = s.visible;
        for (const deck of decks) deck.doorGroup.visible = deck.sectors.some((s) => visibleSet.has(s.id));
        assignPool();
      }
    },
    update(dt, t) {
      if (!currentSector) return;
      const s = locate(player.position);
      if (s && s !== currentSector) setCurrent(s);
      else {
        // door proximity / state changes alter the visible set without a sector change
        const vis = computeVisible(currentSector);
        if (!sameSet(vis, visibleSet)) applyVisibility();
      }
      if (collidersDirty) rebuildColliders();
      // light pool: re-rank by distance twice a second, sync animated values every frame
      pool.timer += dt;
      applyAlert(dt);
      if (pool.timer > 0.5) {
        pool.timer = 0;
        assignPool();
      } else syncPool();
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
    for (const fn of listeners.deckBuilt) fn(deck);
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
      for (const fn of listeners.deckBuilt) fn(deck);
    }
    return deck.built;
  }

  function deckBuilt(id) {
    return deckById(id).built;
  }

  /**
   * Free a deck's sector geometry (the current deck is never unloaded; doors are kept, they are
   * small). Returns true when something was released.
   */
  function unloadDeck(id) {
    const deck = deckById(id);
    if (!deck || !deck.built || deck === currentDeck) return false;
    for (const s of deck.sectors) s.dispose();
    deck.built = false;
    deck.pending = [];
    deck.streaming = false;
    deck.doorGroup.visible = false;
    assignPool(); // drop pool sources that pointed into the released sectors
    return true;
  }

  // A sector behind a door is only visible while that door is not fully closed or the player is
  // close enough that it is about to open (pre-warm), so a corridor lined with shut doors renders
  // only itself. Open portals (style "open") are always co-visible, transitively.
  const DOOR_PREWARM = 9;
  // sectors kept visible from outside: they sit behind real holes in the hull
  const EXTERIOR_VISIBLE = ["d5_hangar", "d1_bridge", "d2_observation"];
  function computeVisible(sector) {
    const vis = new Set();
    const closure = (id) => {
      if (vis.has(id)) return;
      vis.add(id);
      for (const l of sectors.get(id).links) closure(l);
    };
    closure(sector.id);
    const p = player.position;
    for (const id of [...vis]) {
      const s = sectors.get(id);
      if (!s.doors.length) {
        // deck doors not built yet: fall back to the plain graph
        for (const n of s.neighbors) closure(n);
        continue;
      }
      for (const d of s.doors) {
        if (d.def.style === "open") continue;
        const other = d.def.a === id ? d.def.b : d.def.a;
        if (vis.has(other)) continue;
        const near = Math.hypot(p.x - d.worldCenter.x, p.z - d.worldCenter.z) < DOOR_PREWARM && Math.abs(p.y - (d.worldCenter.y - d.def.h / 2)) < 3;
        if (d.openness > 0.001 || near) closure(other);
      }
    }
    return vis;
  }
  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    for (const x of a) if (!b.has(x)) return false;
    return true;
  }

  function applyVisibility() {
    const vis = computeVisible(currentSector);
    for (const id of visibleSet) if (!vis.has(id)) sectors.get(id).setVisible(false);
    for (const id of vis) sectors.get(id).setVisible(true);
    visibleSet = vis;
    // door groups: a deck's doors show when any of its sectors is visible
    for (const deck of decks) deck.doorGroup.visible = deck.sectors.some((s) => vis.has(s.id));
    collidersDirty = true;
    assignPool();
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
