// DEV ONLY (Agent D). A stand-in for src/core/registry.js that implements COORDINATION.md §7 (module
// manifest), §8 (ctx), §9.4 (light pool) and §9.5 (streaming) closely enough to build, validate and
// screenshot Deck 4 modules before the integrator's scaffold lands. Retired when the real one exists.
import * as THREE from "three";
import { Kit, rng } from "../../kit.js";

// §6.3 deck envelopes (x, z) + floor/ceiling. Hangar floor extended to -85 for the aperture lip (§6.2).
export const ENVELOPES = {
  1: { x: [-88, 88], z: [458, 542], y: [240, 264] },
  2: { x: [-70, 70], z: [300, 470], y: [40, 56] },
  3: { x: [-80, 80], z: [540, 760], y: [12, 110] },
  4: { x: [-150, 150], z: [-80, 270], y: [-85, -10] },
};

// §6.2 apertures the streaming manager knows about
export const APERTURES = {
  bridge: { plane: "z", at: 455, x: [-19, 19], y: [241.2, 245.4] },
  observation: { plane: "z", at: 455, x: [-78, -50], y: [241.5, 244.5] },
  hangar: { plane: "y", at: -85, x: [-36, 36], z: [-30, 94] },
};

export const DOOR_KINDS = { standard: { w: 2.4, h: 3.0 }, blast: { w: 4.0, h: 4.0 }, hatch: { w: 1.2, h: 2.0 } };

const POOL = { points: 12, spots: 4 };

function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Lazy per-module imports so one broken module (syntax error mid-edit) cannot take the page down.
// ?only=id,id and ?skip=id,id restrict which modules are built (six people edit this tree at once).
export async function discoverManifests() {
  const mods = import.meta.glob(["/src/rooms/**/index.js", "/src/hangar/**/index.js", "/src/systems/**/index.js", "/src/exterior/**/index.js"]);
  const params = new URLSearchParams(location.search);
  const only = params.get("only") ? params.get("only").split(",") : null;
  const skip = params.get("skip") ? params.get("skip").split(",") : [];
  const out = [];
  const loadErrors = [];
  for (const [path, loader] of Object.entries(mods)) {
    let mod;
    try {
      mod = await loader();
    } catch (e) {
      console.error(`[registry] ${path} failed to load: ${e && e.message ? e.message : e}`);
      loadErrors.push(`${path}: ${e && e.message ? e.message : e}`);
      continue;
    }
    const m = mod.default;
    if (!m || typeof m !== "object" || !m.id) {
      console.warn(`[registry] ${path}: default export is not a manifest`);
      continue;
    }
    if (only && !only.includes(m.id)) continue;
    if (skip.includes(m.id)) continue;
    m.__path = path;
    out.push(m);
  }
  out.loadErrors = loadErrors;
  return out;
}

function onFace(bounds, p, tol = 0.02) {
  const { min, max } = bounds;
  const inside = (i) => p[i] >= min[i] - tol && p[i] <= max[i] + tol;
  if (!inside(0) || !inside(1) || !inside(2)) return false;
  return [0, 1, 2].some((i) => Math.abs(p[i] - min[i]) < tol || Math.abs(p[i] - max[i]) < tol);
}

export function validate(manifests) {
  const warnings = [];
  const warn = (s) => warnings.push(s);
  const ids = new Map();
  const views = new Map();
  const byId = new Map(manifests.map((m) => [m.id, m]));
  for (const m of manifests) {
    if (ids.has(m.id)) warn(`duplicate id ${m.id} (${m.__path} and ${ids.get(m.id)})`);
    ids.set(m.id, m.__path);
    if (!["room", "system", "exterior"].includes(m.kind)) warn(`${m.id}: kind must be room|system|exterior`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id)) warn(`${m.id}: id must be kebab-case`);
    for (const [name, v] of Object.entries(m.views || {})) {
      if (views.has(name)) warn(`${m.id}: duplicate view name ${name} (also in ${views.get(name)})`);
      views.set(name, m.id);
      if (v.mode === "exterior") {
        if (!v.camPos || !v.lookAt) warn(`${m.id}: exterior view ${name} needs camPos + lookAt`);
      } else if (!v.pos) warn(`${m.id}: view ${name} needs pos`);
    }
    if (m.kind !== "room") continue;
    if (!/^d[1-4]-/.test(m.id)) warn(`${m.id}: room ids must be prefixed d1-..d4-`);
    if (!m.bounds || !m.bounds.min || !m.bounds.max) {
      warn(`${m.id}: missing bounds`);
      continue;
    }
    const env = ENVELOPES[m.deck];
    if (!env) warn(`${m.id}: unknown deck ${m.deck}`);
    else {
      const { min, max } = m.bounds;
      if (min[0] < env.x[0] - 1e-6 || max[0] > env.x[1] + 1e-6 || min[2] < env.z[0] - 1e-6 || max[2] > env.z[1] + 1e-6 || min[1] < env.y[0] - 1e-6 || max[1] > env.y[1] + 1e-6)
        warn(`${m.id}: bounds ${JSON.stringify(m.bounds)} outside deck ${m.deck} envelope`);
    }
    if (!m.spawn || !m.spawn.pos) warn(`${m.id}: missing spawn`);
    else {
      const p = m.spawn.pos;
      const { min, max } = m.bounds;
      if (p[0] < min[0] || p[0] > max[0] || p[1] < min[1] - 0.01 || p[1] > max[1] || p[2] < min[2] || p[2] > max[2]) warn(`${m.id}: spawn outside bounds`);
    }
    for (const d of m.doors || []) {
      if (!d.id || !d.pos || !d.dir) {
        warn(`${m.id}: door needs id, pos, dir`);
        continue;
      }
      if (!onFace(m.bounds, d.pos)) warn(`${m.id}: door ${d.id} pos ${d.pos} is not on a bounds face`);
      if (!DOOR_KINDS[d.kind] && !(d.kind === "bay" && d.w && d.h)) warn(`${m.id}: door ${d.id} kind ${d.kind} invalid (bay needs w,h)`);
      if (d.to) {
        const other = byId.get(d.to);
        if (!other) warn(`${m.id}: door ${d.id} -> ${d.to} (room not found)`);
        else if (!(other.doors || []).some((o) => o.id === d.id)) warn(`${m.id}: door ${d.id} -> ${d.to} does not declare the same door id`);
        else {
          const o = other.doors.find((o) => o.id === d.id);
          if (Math.hypot(o.pos[0] - d.pos[0], o.pos[1] - d.pos[1], o.pos[2] - d.pos[2]) > 0.05) warn(`${m.id}: door ${d.id} pos differs from ${d.to}'s (${d.pos} vs ${o.pos})`);
          if (o.dir[0] * d.dir[0] + o.dir[1] * d.dir[1] + o.dir[2] * d.dir[2] > -0.99) warn(`${m.id}: door ${d.id} dir should be opposite to ${d.to}'s`);
        }
      }
    }
    if (m.lift) {
      if (!m.lift.id || !m.lift.pos || !m.lift.dir) warn(`${m.id}: lift needs id, pos, dir`);
      else if (!onFace(m.bounds, m.lift.pos)) warn(`${m.id}: lift pos not on a bounds face`);
    }
  }
  for (const w of warnings) console.warn("[registry] " + w);
  return warnings;
}

class AudioStub {
  constructor() {
    this.seen = new Set();
    this.events = [];
  }
  _log(kind, name) {
    const key = kind + ":" + name;
    this.events.push(key);
    if (this.seen.has(key)) return;
    this.seen.add(key);
    console.log(`[audio] ${kind} ${name}`);
  }
  play(name, pos) {
    this._log("play", name);
  }
  loop(name, pos) {
    this._log("loop", name);
    return { stop() {}, setGain() {}, setPosition() {} };
  }
  ambient(name, gain) {
    this._log("ambient", name);
  }
}

export async function createWorld({ THREE: T, scene, materials, PALETTE, hud, player, quality = { tier: "high" } }) {
  const manifests = await discoverManifests();
  const warnings = validate(manifests);
  for (const e of manifests.loadErrors || []) warnings.push("load error: " + e);
  const rooms = new Map();
  const systems = [];
  const all = [];
  const audio = new AudioStub();
  const clock = { t: 0 };
  const time = () => clock.t;

  const world = {
    rooms,
    get: (id) => rooms.get(id) || all.find((e) => e.manifest.id === id),
    apertures: APERTURES,
    envelopes: ENVELOPES,
    manifests,
  };

  let teleportImpl = null;
  const teleport = (arg) => teleportImpl && teleportImpl(arg);

  function buildOne(m, isSystem) {
    const t0 = performance.now();
    const mats = { ...materials };
    if (typeof m.materials === "function") Object.assign(mats, m.materials(materials) || {});
    const kit = new Kit(mats);
    const group = new T.Group();
    group.name = m.id;
    const ctx = {
      THREE: T,
      kit,
      materials: mats,
      PALETTE,
      group,
      lights: [],
      interactables: [],
      audio,
      hud,
      player,
      teleport,
      world: isSystem ? world : null,
      seed: hashSeed(m.id),
      quality,
      time,
      rng,
    };
    let result = null;
    try {
      result = m.build(ctx) || {};
    } catch (e) {
      console.error(`[registry] ${m.id} build failed:`, e);
      result = { error: String(e) };
    }
    let tris = 0;
    try {
      kit.build(group);
    } catch (e) {
      console.error(`[registry] ${m.id} kit build failed:`, e);
    }
    group.traverse((o) => {
      if (o.isMesh && o.geometry) {
        const pos = o.geometry.attributes.position;
        const n = o.geometry.index ? o.geometry.index.count : pos ? pos.count : 0;
        tris += (n / 3) * (o.isInstancedMesh ? o.count : 1);
      }
    });
    scene.add(group);
    const buildMs = performance.now() - t0;
    const entry = { manifest: m, group, result, kit, ctx, buildMs, tris, colliders: kit.colliders, lights: ctx.lights, interactables: ctx.interactables };
    if (m.kind === "room") {
      rooms.set(m.id, entry);
      const budget = /d1-bridge|d4-hangar/.test(m.id) ? { tris: 300000, lights: 28, calls: 24 } : { tris: 120000, lights: 14, calls: 16 };
      const calls = kit.meshes.length;
      const over = [];
      if (tris > budget.tris) over.push(`${Math.round(tris / 1000)}k tris > ${budget.tris / 1000}k`);
      if (ctx.lights.length > budget.lights) over.push(`${ctx.lights.length} lights > ${budget.lights}`);
      if (calls > budget.calls) over.push(`${calls} kit meshes > ${budget.calls} calls`);
      if (kit.colliders.length > 400) over.push(`${kit.colliders.length} colliders > 400`);
      if (buildMs > 250) over.push(`build ${buildMs.toFixed(0)} ms > 250`);
      if (over.length) console.warn(`[budget] ${m.id}: ${over.join(", ")}`);
    }
    if (isSystem) systems.push(entry);
    all.push(entry);
    console.log(`[registry] built ${m.id} in ${buildMs.toFixed(0)} ms: ${kit.meshes.length} kit meshes, ${Math.round(tris)} tris, ${ctx.lights.length} light descriptors, ${kit.colliders.length} colliders`);
    return entry;
  }

  const order = [...manifests.filter((m) => m.kind === "room"), ...manifests.filter((m) => m.kind === "exterior"), ...manifests.filter((m) => m.kind === "system")];
  for (const m of order) buildOne(m, m.kind === "system");

  // ---- neighbours via door ids
  const doorIndex = new Map();
  for (const [id, e] of rooms) for (const d of e.manifest.doors || []) (doorIndex.get(d.id) || doorIndex.set(d.id, []).get(d.id)).push(id);
  const neighbours = (id) => {
    const s = new Set();
    const e = rooms.get(id);
    if (!e) return s;
    for (const d of e.manifest.doors || []) for (const other of doorIndex.get(d.id) || []) if (other !== id) s.add(other);
    return s;
  };

  // ---- light pool (§9.4): fixed count of THREE lights; descriptors assigned per frame
  const pool = { points: [], spots: [] };
  for (let i = 0; i < POOL.points; i++) {
    const l = new T.PointLight(0xffffff, 0, 10, 2);
    scene.add(l);
    pool.points.push(l);
  }
  for (let i = 0; i < POOL.spots; i++) {
    const l = new T.SpotLight(0xffffff, 0, 10, 0.5, 0.5, 1.5);
    scene.add(l);
    scene.add(l.target);
    if (i === 0) {
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.0005;
    }
    pool.spots.push(l);
  }
  let poolUsed = 0;
  const _p = new T.Vector3();
  function assignLights(activeEntries, eye, currentRoom) {
    const pts = [];
    const sps = [];
    for (const e of activeEntries) {
      // the room the player stands in keeps its pools; neighbours only get what is left
      const own = e.manifest.id === currentRoom ? 60 : 0;
      for (const d of e.lights) {
        const dist = Math.hypot(d.pos[0] - eye.x, d.pos[1] - eye.y, d.pos[2] - eye.z);
        const score = own + (d.priority ?? 0.5) * 100 - dist * 0.5 + (dist < (d.distance || 10) ? 20 : 0);
        (d.type === "spot" ? sps : pts).push({ d, score });
      }
    }
    pts.sort((a, b) => b.score - a.score);
    sps.sort((a, b) => b.score - a.score);
    poolUsed = 0;
    pool.points.forEach((l, i) => {
      const d = pts[i] && pts[i].d;
      if (!d) {
        l.intensity = 0;
        return;
      }
      poolUsed++;
      l.position.set(d.pos[0], d.pos[1], d.pos[2]);
      l.color.set(d.color ?? 0xffffff);
      l.intensity = d.intensity ?? 1;
      l.distance = d.distance ?? 10;
      l.decay = d.decay ?? 2;
    });
    pool.spots.forEach((l, i) => {
      const d = sps[i] && sps[i].d;
      if (!d) {
        l.intensity = 0;
        return;
      }
      poolUsed++;
      l.position.set(d.pos[0], d.pos[1], d.pos[2]);
      const tgt = d.target || [d.pos[0], d.pos[1] - 1, d.pos[2]];
      l.target.position.set(tgt[0], tgt[1], tgt[2]);
      l.color.set(d.color ?? 0xffffff);
      l.intensity = d.intensity ?? 1;
      l.distance = d.distance ?? 20;
      l.angle = d.angle ?? 0.5;
      l.penumbra = d.penumbra ?? 0.5;
      l.decay = d.decay ?? 1.5;
    });
  }

  // ---- streaming (§9.5)
  const state = { current: null, active: new Set(), mode: "interior" };
  function roomAt(p) {
    let best = null;
    for (const [id, e] of rooms) {
      const { min, max } = e.manifest.bounds;
      if (p.x >= min[0] && p.x <= max[0] && p.z >= min[2] && p.z <= max[2] && p.y >= min[1] - 0.5 && p.y <= max[1]) {
        // prefer the smallest containing volume (control tower over the hangar it overlooks, etc.)
        const vol = (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
        if (!best || vol < best.vol) best = { id, vol };
      }
    }
    return best ? best.id : null;
  }
  function refresh(feet, mode) {
    state.mode = mode;
    const active = new Set();
    if (mode === "interior") {
      const cur = roomAt(feet) || state.current;
      state.current = cur;
      if (cur) {
        active.add(cur);
        for (const n of neighbours(cur)) active.add(n);
        for (const [id, e] of rooms) if (e.manifest.alwaysWithNeighbours && [...active].some((a) => neighbours(a).has(id))) active.add(id);
      }
    } else {
      for (const [id, e] of rooms) if ((e.manifest.apertures || []).length) active.add(id);
    }
    state.active = active;
    for (const [id, e] of rooms) e.group.visible = active.has(id);
    return active;
  }

  function activeEntries() {
    const list = [];
    for (const id of state.active) list.push(rooms.get(id));
    for (const s of systems) list.push(s);
    for (const e of all) if (e.manifest.kind === "exterior") list.push(e);
    return list;
  }

  function update(dt, t, feet, eye, mode = "interior") {
    clock.t = t;
    refresh(feet, mode);
    const act = activeEntries();
    // colliders + interactables of the active set (systems may mutate their arrays in place)
    const colliders = [];
    const interactables = [];
    for (const e of act) {
      const extra = e.result && e.result.colliders;
      for (const c of e.colliders) colliders.push(c);
      if (extra) for (const c of extra) colliders.push(c);
      for (const i of e.interactables) interactables.push(i);
    }
    for (const e of act) if (e.result && typeof e.result.update === "function") e.result.update(dt, t);
    assignLights(act, eye, state.current);
    return { colliders, interactables };
  }

  function stats() {
    return {
      poolLights: poolUsed,
      activeRooms: [...state.active],
      current: state.current,
      modules: all.map((e) => ({
        id: e.manifest.id,
        kind: e.manifest.kind,
        buildMs: +e.buildMs.toFixed(1),
        kitMeshes: e.kit.meshes.length,
        tris: Math.round(e.tris),
        lights: e.lights.length,
        colliders: e.colliders.length + ((e.result && e.result.colliders && e.result.colliders.length) || 0),
        interactables: e.interactables.length,
      })),
    };
  }

  const views = {};
  for (const m of manifests) for (const [name, v] of Object.entries(m.views || {})) views[name] = { ...v, module: m.id };

  return {
    manifests,
    warnings,
    rooms,
    systems,
    all,
    world,
    views,
    audio,
    update,
    refresh,
    stats,
    state,
    setTeleport(fn) {
      teleportImpl = fn;
    },
    api(id) {
      const e = world.get(id);
      return e && e.result && e.result.api;
    },
  };
}
