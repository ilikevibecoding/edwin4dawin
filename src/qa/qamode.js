import * as THREE from 'three';
import { assets } from '../core/assets.js';
import { settings, QUALITY_PRESETS } from '../core/settings.js';
import { bus, EVT } from '../core/events.js';
import { CHECKPOINTS, EXTRACTION, HOSTAGE_POINTS, roomAt, floorForY } from '../map/layout.js';
import { LIGHT_SCENARIOS } from '../map/lighting.js';
import { WEAPON_DEFS, WEAPON_KEYS, SLOT_ORDER, resolveKey } from '../weapons/defs.js';
import { OBJECTIVE_CHAIN, OBJECTIVE_STATE } from '../mission/objectives.js';

// ---------------------------------------------------------------------------
// QA mode.  (owner: opus4)
//
// One object owns every development affordance: the backtick panel, the F3
// perf overlay, the asset-id label under the crosshair, the collision and
// navigation wireframes, and the `window.__NORTHSTAR_QA__` scripting surface
// that the Playwright suite and the capture tools drive the game through.
//
// It is deliberately development-only. `enabled` is false in a production
// build unless the player explicitly asks for it with `?qa=1` or the
// `northstar.qa` storage key, and while it is false nothing is appended to the
// DOM, no keys are bound and every mutating API call refuses.
//
// Everything here is written to be safe at any point in the game's life: the
// constructor runs before the level exists, so every accessor is guarded.
// ---------------------------------------------------------------------------

/** Vite replaces `import.meta.env` at build time; guard for other loaders. */
const IS_DEV = (() => {
  try {
    return !!import.meta.env?.DEV;
  } catch {
    return false;
  }
})();

const QA_STORAGE_KEY = 'northstar.qa';

/**
 * Manifest fields every record must carry, whatever it is: provenance,
 * ownership and the acceptance trail.
 */
export const REQUIRED_ASSET_FIELDS = [
  'id', 'name', 'category', 'owner', 'files', 'status', 'acceptance',
  'evidence', 'discrepancies',
];

/**
 * Fields that only mean something for a thing with geometry. A gunshot sample
 * has no dimensions, materials or textures, so demanding them of the 167 audio
 * records would be a false positive rather than a finding.
 */
export const GEOMETRY_ASSET_FIELDS = ['rooms', 'dims', 'pivot', 'materials', 'textures', 'collision', 'lod'];

/** Categories whose records describe something other than a mesh. */
const NON_GEOMETRY_CATEGORIES = ['audio', 'ui', 'material', 'vfx'];

/** Categories that legitimately never appear in the scene graph. */
const NON_INSTANCED_CATEGORIES = ['ui', 'audio', 'vfx', 'material', 'decal'];

/**
 * The fields a given record is actually accountable for. Animation clips are
 * filed under `character` but describe motion rather than a mesh, and say so
 * with zero dimensions, so they are held to the same bar as a sound.
 */
export function requiredFieldsFor(record) {
  const dims = record?.dims;
  const sizeless = Array.isArray(dims) && dims.length === 3 && dims.every((n) => !n);
  const geometry = !NON_GEOMETRY_CATEGORIES.includes(record?.category) && !sizeless;
  return geometry ? [...REQUIRED_ASSET_FIELDS, ...GEOMETRY_ASSET_FIELDS] : REQUIRED_ASSET_FIELDS;
}

const PANEL_REFRESH = 0.25;
const PERF_REFRESH = 0.2;
const LABEL_REFRESH = 0.12;

function detectEnabled() {
  if (IS_DEV) return true;
  try {
    const params = new URLSearchParams(globalThis.location?.search || '');
    if (params.get('qa') === '1') return true;
  } catch {
    /* no location (worker / test double) */
  }
  try {
    if (globalThis.localStorage?.getItem(QA_STORAGE_KEY) === '1') return true;
  } catch {
    /* storage blocked */
  }
  return false;
}

/** FNV-1a over a string: stable across runs and platforms, cheap. */
export function digestOf(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, '0')}:${str.length.toString(16)}`;
}

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

function refused(what) {
  return { ok: false, reason: 'qa-disabled', action: what };
}

/**
 * One level of an event payload, reduced to JSON-safe values. Vectors become
 * `[x, y, z]`; entities are replaced by their id so a recorded event can never
 * hold a reference to a live object (or blow up `structuredClone`).
 */
function flattenPayload(payload) {
  if (payload === null || payload === undefined) return null;
  const t = typeof payload;
  if (t === 'number' || t === 'string' || t === 'boolean') return payload;
  if (Array.isArray(payload)) return payload.length <= 8 ? payload.map(flattenValue) : { length: payload.length };
  if (t !== 'object') return String(payload);
  const out = {};
  for (const [k, v] of Object.entries(payload)) out[k] = flattenValue(v);
  return out;
}

function flattenValue(v) {
  if (v === null || v === undefined) return null;
  const t = typeof v;
  if (t === 'number') return r3(v);
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'function') return '[fn]';
  if (v.isVector3) return [r2(v.x), r2(v.y), r2(v.z)];
  if (Array.isArray(v)) return v.length <= 8 ? v.map((x) => (typeof x === 'number' ? r3(x) : flattenValue(x))) : { length: v.length };
  if (t === 'object') {
    // Entities and Object3Ds: keep the handful of fields tests care about.
    const out = {};
    for (const k of ['id', 'kind', 'variant', 'state', 'alive', 'health', 'name', 'key', 'label', 'locked', 'surface', 'material']) {
      if (v[k] !== undefined && typeof v[k] !== 'object') out[k] = v[k];
    }
    return Object.keys(out).length ? out : '[object]';
  }
  return String(v);
}

export class QAMode {
  /** @param {import('../game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.enabled = detectEnabled();

    /** Read by `Game.stepAI`: when true no hostile or hostage thinks. */
    this.aiFrozen = false;

    this.panelVisible = false;
    this.perfVisible = false;
    this.assetIdsVisible = false;
    this.collisionVisible = false;
    this.navVisible = false;

    this._time = 0;
    this._panelTimer = 0;
    this._perfTimer = 0;
    this._labelTimer = 0;
    this._dom = null;
    this._collisionMesh = null;
    this._collisionSignature = '';
    this._navMesh = null;
    this._raycaster = new THREE.Raycaster();
    this._lastAssetId = null;
    this._pointerLockSuppressed = false;
    this._originalRequestPointerLock = null;
    this._log = [];

    /** Bus recorder: see `recordEvents` / `takeEvents`. */
    this._recording = new Map();
    this._recorded = [];

    this.api = this._buildApi();

    if (this.enabled) this._bindKeys();
  }

  // ================================================================== enable

  /** Turn QA affordances on for the rest of the session (and remember it). */
  enable(persist = false) {
    if (!this.enabled) {
      this.enabled = true;
      this._bindKeys();
    }
    if (persist) {
      try {
        globalThis.localStorage?.setItem(QA_STORAGE_KEY, '1');
      } catch {
        /* storage blocked */
      }
    }
    return this.enabled;
  }

  // ================================================================== frame

  /**
   * Registered by `Game._installSystems` as a frame system, so it runs on every
   * rendered frame regardless of game state (including while paused, which is
   * what lets the panel and the gallery work from a menu).
   */
  update(dt) {
    const step = Number.isFinite(dt) ? dt : 0;
    this._time += step;

    // The gallery is not a frame system of its own; QA drives it.
    const gallery = this.game.gallery;
    if (gallery?.visible) {
      try {
        gallery.update(step);
      } catch (err) {
        this._note('gallery update failed', err);
      }
    }

    if (!this.enabled) return;

    if (this.panelVisible) {
      this._panelTimer -= step;
      if (this._panelTimer <= 0) {
        this._panelTimer = PANEL_REFRESH;
        this._refreshPanel();
      }
    }
    if (this.perfVisible) {
      this._perfTimer -= step;
      if (this._perfTimer <= 0) {
        this._perfTimer = PERF_REFRESH;
        this._refreshPerfOverlay();
      }
    }
    if (this.assetIdsVisible) {
      this._labelTimer -= step;
      if (this._labelTimer <= 0) {
        this._labelTimer = LABEL_REFRESH;
        this._refreshAssetLabel();
      }
    }
    if (this.collisionVisible) this._syncCollisionMesh();
  }

  // ================================================================== keys

  _bindKeys() {
    if (this._keysBound) return;
    this._keysBound = true;
    this._onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Backquote') {
        e.preventDefault();
        this.togglePanel();
      } else if (e.code === 'F3') {
        e.preventDefault();
        this.togglePerf();
      } else if (e.code === 'F4') {
        e.preventDefault();
        this.showAssetIds(!this.assetIdsVisible);
      }
    };
    globalThis.addEventListener?.('keydown', this._onKeyDown, { passive: false });
  }

  // ================================================================== DOM

  _host() {
    return document.getElementById('app') || document.body;
  }

  /** Create the three dev DOM nodes on demand. Never called when disabled. */
  _ensureDom() {
    if (this._dom || !this.enabled) return this._dom;
    if (typeof document === 'undefined') return null;
    const host = this._host();
    if (!host) return null;

    const make = (id, tag = 'div') => {
      let node = document.getElementById(id);
      if (!node) {
        node = document.createElement(tag);
        node.id = id;
        host.appendChild(node);
      }
      return node;
    };

    const panel = make('qa-panel');
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'QA panel');
    const readout = document.createElement('pre');
    readout.className = 'qa-readout';
    readout.style.margin = '0 0 6px';
    readout.style.whiteSpace = 'pre-wrap';
    readout.style.font = 'inherit';
    panel.replaceChildren();
    const title = document.createElement('h4');
    title.textContent = 'QA — ` to close';
    panel.append(title, readout);
    this._panelReadout = readout;
    this._buildPanelSections(panel);

    const perf = make('perf-overlay');
    perf.setAttribute('aria-hidden', 'true');

    const label = make('asset-label');
    label.setAttribute('aria-hidden', 'true');

    this._dom = { panel, perf, label, readout };
    return this._dom;
  }

  _buildPanelSections(panel) {
    const section = (heading, entries) => {
      const h = document.createElement('h4');
      h.textContent = heading;
      const grid = document.createElement('div');
      grid.className = 'qa-grid';
      for (const [text, fn, titleText] of entries) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = text;
        if (titleText) b.title = titleText;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          try {
            fn();
          } catch (err) {
            this._note(`panel action "${text}" failed`, err);
          }
          this._refreshPanel();
        });
        grid.appendChild(b);
      }
      panel.append(h, grid);
    };

    section('Teleport', Object.keys(CHECKPOINTS).map((name) => [name, () => this.teleport(name)]));

    section('Weapons', [
      ...WEAPON_KEYS.filter((k) => WEAPON_DEFS[k].isFirearm).map((k) => [k, () => this.giveWeapon(k)]),
      ['ammo', () => this.refillAmmo()],
    ]);

    section('Hostiles', [
      ['spawn', () => this.spawnEnemy('runner')],
      ['spawn x3', () => { for (let i = 0; i < 3; i++) this.spawnEnemy('breacher'); }],
      ['freeze', () => this.freezeAI(!this.aiFrozen)],
      ['kill all', () => this.killAllEnemies()],
    ]);

    section('Lighting', Object.keys(LIGHT_SCENARIOS).map((name) => [name, () => this.setLighting(name)]));

    section('Overlays', [
      ['asset ids', () => this.showAssetIds(!this.assetIdsVisible)],
      ['collision', () => this.showCollision(!this.collisionVisible)],
      ['nav', () => this.showNav(!this.navVisible)],
      ['perf', () => this.togglePerf()],
      ['gallery', () => this.openGallery()],
    ]);

    section('Mission', [
      ...OBJECTIVE_CHAIN.map((o) => [o.id.replace(/^(locate|secure)-hostage-/, '$1-'), () => this.jumpToObjective(o.id), o.text]),
      ['reset', () => this.resetMission()],
    ]);

    section('Player', [
      ['god', () => this.godMode(!(this.game.player?.godMode))],
      ['noclip', () => this.noclip(!(this.game.player?.noclip))],
      ['hurt 25', () => this.damagePlayer(25)],
      ['heal', () => this.healPlayer()],
    ]);

    section('Quality', [
      ...Object.keys(QUALITY_PRESETS).map((q) => [q, () => this.setQuality(q)]),
      ['scale 50%', () => this.setResolutionScale(0.5)],
      ['scale 100%', () => this.setResolutionScale(1)],
    ]);
  }

  // ================================================================== toggles

  togglePanel(force) {
    if (!this.enabled) return refused('togglePanel');
    const dom = this._ensureDom();
    this.panelVisible = force === undefined ? !this.panelVisible : !!force;
    dom?.panel.classList.toggle('visible', this.panelVisible);
    if (this.panelVisible) this._refreshPanel();
    return this.panelVisible;
  }

  togglePerf(force) {
    if (!this.enabled) return refused('togglePerf');
    const dom = this._ensureDom();
    this.perfVisible = force === undefined ? !this.perfVisible : !!force;
    dom?.perf.classList.toggle('visible', this.perfVisible);
    if (this.perfVisible) this._refreshPerfOverlay();
    return this.perfVisible;
  }

  /** Label whatever is under the crosshair with its registered asset id. */
  showAssetIds(on = true) {
    if (!this.enabled) return refused('showAssetIds');
    const dom = this._ensureDom();
    this.assetIdsVisible = !!on;
    if (!this.assetIdsVisible) {
      dom?.label.classList.remove('visible');
      this._lastAssetId = null;
    } else {
      this._labelTimer = 0;
      this._refreshAssetLabel();
    }
    return this.assetIdsVisible;
  }

  showCollision(on = true) {
    if (!this.enabled) return refused('showCollision');
    this.collisionVisible = !!on;
    if (this.collisionVisible) {
      this._buildCollisionMesh();
      if (this._collisionMesh) this._collisionMesh.visible = true;
    } else if (this._collisionMesh) {
      this._collisionMesh.visible = false;
    }
    return this.collisionVisible;
  }

  showNav(on = true) {
    if (!this.enabled) return refused('showNav');
    this.navVisible = !!on;
    if (!this._navMesh) {
      try {
        this._navMesh = this.game.nav?.debugMesh?.() || null;
        if (this._navMesh) this.game.scene?.add?.(this._navMesh);
      } catch (err) {
        this._note('nav debug mesh failed', err);
      }
    }
    if (this._navMesh) this._navMesh.visible = this.navVisible;
    return this.navVisible && !!this._navMesh;
  }

  // ---------------------------------------------------------------- overlays

  _collisionSig() {
    const c = this.game.collision;
    if (!c) return '';
    return `${c.colliders.size}`;
  }

  _buildCollisionMesh() {
    const collision = this.game.collision;
    const scene = this.game.scene;
    if (!collision || !scene) return null;

    if (this._collisionMesh) {
      scene.remove(this._collisionMesh);
      this._collisionMesh.geometry?.dispose?.();
      this._collisionMesh.material?.dispose?.();
      this._collisionMesh = null;
    }

    const pos = [];
    const col = [];
    // 0 static solid, 1 door (dynamic), 2 character, 3 non-sight-blocking
    const tint = (c) => {
      const tag = c.tag || '';
      if (tag.startsWith('character')) return [1.0, 0.32, 0.42];
      if (tag.startsWith('door')) return [1.0, 0.78, 0.2];
      if (!c.blocksSight) return [0.4, 1.0, 0.55];
      return [0.35, 0.72, 1.0];
    };
    const edge = (ax, ay, az, bx, by, bz, t) => {
      pos.push(ax, ay, az, bx, by, bz);
      col.push(t[0], t[1], t[2], t[0], t[1], t[2]);
    };

    for (const c of collision.colliders.values()) {
      if (!c.enabled) continue;
      const t = tint(c);
      const { min, max } = c;
      const xs = [min.x, max.x];
      const ys = [min.y, max.y];
      const zs = [min.z, max.z];
      // 4 verticals
      for (const x of xs) for (const z of zs) edge(x, ys[0], z, x, ys[1], z, t);
      // 4 along X, 4 along Z
      for (const y of ys) for (const z of zs) edge(xs[0], y, z, xs[1], y, z, t);
      for (const y of ys) for (const x of xs) edge(x, y, zs[0], x, y, zs[1], t);
    }

    if (!pos.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false,
    }));
    mesh.name = 'qa:collision';
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    this._collisionMesh = mesh;
    this._collisionSignature = this._collisionSig();
    return mesh;
  }

  /** Doors move and characters spawn, so rebuild when the population changes. */
  _syncCollisionMesh() {
    if (!this.collisionVisible) return;
    const sig = this._collisionSig();
    if (sig === this._collisionSignature && this._collisionMesh) return;
    this._buildCollisionMesh();
    if (this._collisionMesh) this._collisionMesh.visible = true;
  }

  _refreshAssetLabel() {
    const dom = this._dom || this._ensureDom();
    if (!dom) return null;
    const camera = this.game.camera;
    const scene = this.game.scene;
    if (!camera || !scene) return null;

    this._raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    this._raycaster.far = 60;
    let hits = [];
    try {
      hits = this._raycaster.intersectObject(scene, true);
    } catch (err) {
      this._note('asset-id raycast failed', err);
      return null;
    }

    let found = null;
    for (const hit of hits) {
      if (hit.object?.name?.startsWith('qa:')) continue;
      if (hit.object?.name?.startsWith('nav:')) continue;
      let node = hit.object;
      while (node) {
        const id = node.userData?.assetId;
        if (id) {
          found = { id, distance: hit.distance, object: node };
          break;
        }
        node = node.parent;
      }
      if (found) break;
    }

    this._lastAssetId = found?.id || null;
    if (!found) {
      dom.label.classList.remove('visible');
      dom.label.textContent = '';
      return null;
    }
    const rec = assets.get(found.id);
    dom.label.textContent = rec
      ? `${found.id} · ${rec.name} · ${rec.owner} · ${rec.status} · ${found.distance.toFixed(1)} m`
      : `${found.id} · UNREGISTERED · ${found.distance.toFixed(1)} m`;
    dom.label.classList.toggle('unregistered', !rec);
    dom.label.classList.add('visible');
    return { id: found.id, registered: !!rec, distance: r2(found.distance) };
  }

  _refreshPerfOverlay() {
    const dom = this._dom || this._ensureDom();
    if (!dom) return;
    const p = this.perf();
    dom.perf.textContent = [
      `fps    ${p.fps.toFixed(1)}  cpu ${p.cpuMs.toFixed(2)}ms`,
      `draws  ${p.drawCalls}  tris ${p.triangles}`,
      `res    ${p.resolution[0]}x${p.resolution[1]} @${p.pixelRatio}`,
      `qual   ${p.quality} x${p.resolutionScale}`,
      `geo    ${p.geometries}  tex ${p.textures}  prog ${p.programs}`,
      `objs   ${p.sceneObjects}  colliders ${p.colliders}`,
      `assets ${p.assets.registered} reg / ${p.assets.instantiated} inst`,
      `ai     ${p.enemies.alive}/${p.enemies.count} alive${this.aiFrozen ? ' (FROZEN)' : ''}`,
      `sim    ${p.simTime.toFixed(2)}s frame ${p.frame}`,
    ].join('\n');
  }

  _refreshPanel() {
    if (!this._dom) return;
    const g = this.game;
    const p = g.player;
    const room = p ? roomAt(p.position.x, p.position.z, floorForY(p.position.y)) : null;
    const w = g.weapons?.current;
    const lines = [
      `state   ${g.state}${g.levelReady ? '' : ' (loading)'}`,
      p ? `pos     ${p.position.x.toFixed(2)} ${p.position.y.toFixed(2)} ${p.position.z.toFixed(2)}` : 'pos     —',
      `room    ${room ? room.id : '—'}`,
      p ? `vitals  ${Math.round(p.health)} hp / ${Math.round(p.armor)} ar` : 'vitals  —',
      w ? `weapon  ${w.key} ${w.ammo}/${w.reserve}` : 'weapon  —',
      `flags   ai${this.aiFrozen ? '=frozen' : '=live'} god=${!!p?.godMode} noclip=${!!p?.noclip}`,
      `light   ${g.lighting?.scenario || '—'}`,
      `mission ${g.director?.activeObjective?.id || '—'}`,
    ];
    this._panelReadout.textContent = lines.join('\n');
  }

  // ================================================================== world

  teleport(checkpointName) {
    if (!this.enabled) return refused('teleport');
    const game = this.game;
    if (!game.levelReady || !game.player) return { ok: false, reason: 'level-not-ready' };
    if (!CHECKPOINTS[checkpointName]) {
      return { ok: false, reason: 'unknown-checkpoint', checkpoint: checkpointName };
    }
    const ok = game.teleport(checkpointName);
    const room = game.currentRoom();
    return {
      ok: !!ok,
      checkpoint: checkpointName,
      expectedRoom: CHECKPOINTS[checkpointName].room,
      room: room ? room.id : null,
      position: game.player.position.toArray().map(r2),
    };
  }

  listCheckpoints() {
    return Object.entries(CHECKPOINTS).map(([name, cp]) => ({
      name, room: cp.room, position: cp.pos.slice(), yaw: r3(cp.yaw),
    }));
  }

  currentRoom() {
    const room = this.game.currentRoom?.();
    return room ? { id: room.id, name: room.name, floor: room.floor, zone: room.zone } : null;
  }

  // ================================================================== weapons

  listWeapons() {
    return WEAPON_KEYS.map((key) => {
      const def = WEAPON_DEFS[key];
      return {
        key, id: def.id, name: def.name, family: def.family, slot: def.slot,
        slotIndex: def.slotIndex, magazine: def.loadedMax ?? 0, reserve: def.reserve ?? 0,
        firearm: !!def.isFirearm, melee: !!def.isMelee, gadget: !!def.isGadget,
      };
    });
  }

  /**
   * Put a weapon in the player's hands immediately. The slot comes from the
   * weapon definition, and the draw transition is skipped so a test does not
   * have to wait out an animation before the first shot.
   */
  giveWeapon(id) {
    if (!this.enabled) return refused('giveWeapon');
    const weapons = this.game.weapons;
    if (!weapons) return { ok: false, reason: 'no-weapon-system' };
    const key = resolveKey(id, null) || (WEAPON_DEFS[id] ? id : null);
    const def = key ? WEAPON_DEFS[key] : null;
    if (!def) return { ok: false, reason: 'unknown-weapon', requested: id };

    const slotName = def.slot;
    try {
      weapons._makeSlot(slotName, key);
    } catch (err) {
      this._note('giveWeapon slot build failed', err);
      return { ok: false, reason: 'slot-build-failed', requested: id };
    }
    weapons.activeSlot = slotName;
    weapons.previousSlot = slotName === 'primary' ? 'secondary' : 'primary';
    weapons.phase = 'ready';
    weapons.phaseTimer = 0;
    weapons.phaseDuration = 0;
    weapons.pendingSlot = null;
    weapons.reloadState = null;
    weapons.cooldown = 0;
    weapons.bloom = 0;
    weapons.shotsThisTrigger = 0;
    weapons.triggerHeld = false;
    return { ok: true, weapon: key, slot: slotName, slotIndex: def.slotIndex, state: weapons.toJSON() };
  }

  selectWeapon(slot) {
    if (!this.enabled) return refused('selectWeapon');
    const weapons = this.game.weapons;
    if (!weapons) return { ok: false, reason: 'no-weapon-system' };
    const ok = weapons.select(slot);
    return { ok: !!ok, requested: slot, activeSlot: weapons.activeSlot, phase: weapons.phase };
  }

  refillAmmo() {
    if (!this.enabled) return refused('refillAmmo');
    const weapons = this.game.weapons;
    if (!weapons) return { ok: false, reason: 'no-weapon-system' };
    weapons.refillReserve();
    // Top the magazines up too: `refillReserve` only reloads an empty gun.
    for (const name of SLOT_ORDER) {
      const s = weapons.slots[name];
      if (!s?.def?.isFirearm) continue;
      s.ammo = s.def.loadedMax;
      s.chambered = true;
      s.reserve = s.def.reserve;
    }
    weapons.reloadState = null;
    return { ok: true, weapon: weapons.toJSON() };
  }

  // ================================================================== hostiles

  /**
   * `spawnEnemy('breacher')`, `spawnEnemy([x,y,z])` and
   * `spawnEnemy('breacher', [x,y,z])` all work. With no position the hostile
   * appears four metres in front of the player.
   */
  spawnEnemy(variantOrPos, maybePos) {
    if (!this.enabled) return refused('spawnEnemy');
    const enemies = this.game.enemies;
    const player = this.game.player;
    if (!enemies) return { ok: false, reason: 'no-enemy-manager' };

    let variant = 'runner';
    let pos = null;
    if (typeof variantOrPos === 'string') variant = variantOrPos;
    else if (variantOrPos) pos = variantOrPos;
    if (maybePos) pos = maybePos;

    let target;
    if (pos) {
      target = Array.isArray(pos)
        ? new THREE.Vector3(pos[0], pos[1], pos[2])
        : new THREE.Vector3(pos.x, pos.y, pos.z);
    } else if (player) {
      const fwd = player.forward.clone().setY(0);
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
      fwd.normalize();
      target = player.position.clone().addScaledVector(fwd, 4);
    } else {
      target = new THREE.Vector3(0, 0, 0);
    }

    let enemy = null;
    try {
      enemy = enemies.spawnAt(target, variant);
    } catch (err) {
      this._note('spawnEnemy failed', err);
      return { ok: false, reason: 'spawn-threw', message: String(err?.message || err) };
    }
    if (!enemy) return { ok: false, reason: 'spawn-returned-nothing' };
    // Hit regions are placed on the AI step, and a test that spawns a hostile
    // with the AI frozen would otherwise be shooting at boxes still parked at
    // the world origin. Place them now so the hostile is shootable on the spot.
    try {
      enemies._updateRegions?.(enemy);
    } catch (err) {
      this._note('spawnEnemy region init failed', err);
    }
    return {
      ok: true,
      id: enemy.id,
      regions: (enemy.hitRegions || []).map((r) => ({ name: r.name, center: r.center.toArray().map(r2) })),
      variant: enemy.variant,
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      position: enemy.position.toArray().map(r2),
      requested: target.toArray().map(r2),
      count: enemies.list.length,
    };
  }

  freezeAI(on = true) {
    if (!this.enabled) return refused('freezeAI');
    this.aiFrozen = !!on;
    return { ok: true, aiFrozen: this.aiFrozen };
  }

  killAllEnemies() {
    if (!this.enabled) return refused('killAllEnemies');
    const enemies = this.game.enemies;
    if (!enemies) return { ok: false, reason: 'no-enemy-manager' };
    const from = this.game.player?.eyePosition || null;
    let killed = 0;
    for (const e of enemies.list.slice()) {
      if (!e.alive) continue;
      try {
        e.applyDamage(1e6, 'chest', from);
      } catch (err) {
        this._note('killAllEnemies damage failed', err);
      }
      if (!e.alive) killed++;
    }
    return { ok: true, killed, remaining: enemies.list.filter((e) => e.alive).length };
  }

  /** Mark every hostile visible through geometry for a while (debug aid). */
  revealEnemies(seconds = 8) {
    if (!this.enabled) return refused('revealEnemies');
    const until = this.game.enemies?.revealAll?.(seconds);
    return { ok: until !== undefined, until };
  }

  // ================================================================== lighting

  setLighting(scenarioName) {
    if (!this.enabled) return refused('setLighting');
    if (!LIGHT_SCENARIOS[scenarioName]) {
      return { ok: false, reason: 'unknown-scenario', requested: scenarioName };
    }
    const lighting = this.game.lighting;
    if (!lighting) return { ok: false, reason: 'no-lighting-rig' };
    const ok = lighting.setScenario(scenarioName);
    return { ok: !!ok, scenario: lighting.scenario };
  }

  /**
   * `name` is the key `setLighting()` accepts; the scenario's own `name` field
   * is a display string, so it is surfaced as `label` to keep the two apart.
   */
  listLightingScenarios() {
    return Object.entries(LIGHT_SCENARIOS).map(([id, s]) => ({
      ...s, id, name: id, label: s.name,
    }));
  }

  // ================================================================== gallery

  openGallery() {
    if (!this.enabled) return refused('openGallery');
    const gallery = this.game.gallery;
    if (!gallery) return { ok: false, reason: 'no-gallery' };
    try {
      gallery.open();
    } catch (err) {
      this._note('gallery open failed', err);
      return { ok: false, reason: 'open-threw', message: String(err?.message || err) };
    }
    return { ok: true, visible: !!gallery.visible, count: assets.list().length };
  }

  closeGallery() {
    if (!this.enabled) return refused('closeGallery');
    const gallery = this.game.gallery;
    if (!gallery) return { ok: false, reason: 'no-gallery' };
    try {
      gallery.close();
    } catch (err) {
      this._note('gallery close failed', err);
    }
    return { ok: true, visible: !!gallery.visible };
  }

  // ================================================================== mission

  resetMission() {
    if (!this.enabled) return refused('resetMission');
    const game = this.game;
    if (!game.levelReady) return { ok: false, reason: 'level-not-ready' };
    try {
      game.resetMission();
    } catch (err) {
      this._note('resetMission failed', err);
      return { ok: false, reason: 'reset-threw', message: String(err?.message || err) };
    }
    return { ok: true, digest: this.screenshotState().digest };
  }

  listObjectives() {
    const director = this.game.director;
    if (!director) return OBJECTIVE_CHAIN.map((o) => ({ id: o.id, text: o.text, state: 'unknown' }));
    return director.objectives.map((o) => ({ id: o.id, index: o.index, text: o.text, state: o.state }));
  }

  /**
   * Force one objective's latched state. `_evaluate()` only ever promotes an
   * objective, so a state written here survives unless the world itself
   * satisfies a later beat.
   */
  setObjectiveState(objectiveId, state) {
    if (!this.enabled) return refused('setObjectiveState');
    const director = this.game.director;
    if (!director) return { ok: false, reason: 'no-director' };
    const valid = Object.values(OBJECTIVE_STATE);
    if (!valid.includes(state)) return { ok: false, reason: 'unknown-state', valid };
    const o = director.objectives.find((x) => x.id === objectiveId);
    if (!o) return { ok: false, reason: 'unknown-objective', objectiveId };

    o.state = state;
    if (state === OBJECTIVE_STATE.DONE) o.completedAt = r2(director.elapsed);
    if (state === OBJECTIVE_STATE.FAILED) o.failedAt = r2(director.elapsed);
    bus.emit(EVT.OBJECTIVE_UPDATE, {
      id: o.id, state: o.state, text: o.text, tone: state === 'failed' ? 'alert' : 'good',
      position: o.marker.slice(), qa: true,
    });
    director._activate?.();
    return { ok: true, objective: o.id, state: o.state, active: director.activeObjective?.id || null };
  }

  /**
   * Drive the world into the state where `id` is the beat in play, by
   * performing the real actions for every earlier beat (teleporting, freeing
   * hostages, raising the shutter) rather than only flipping flags.
   */
  jumpToObjective(id) {
    if (!this.enabled) return refused('jumpToObjective');
    const game = this.game;
    const director = game.director;
    if (!director || !game.levelReady) return { ok: false, reason: 'level-not-ready' };
    const index = OBJECTIVE_CHAIN.findIndex((o) => o.id === id);
    if (index < 0) return { ok: false, reason: 'unknown-objective', objectiveId: id, chain: OBJECTIVE_CHAIN.map((o) => o.id) };

    const done = [];
    for (let i = 0; i < index; i++) {
      const step = OBJECTIVE_CHAIN[i].id;
      this._satisfy(step);
      done.push(step);
    }
    // Put the player where this beat happens.
    this._stageFor(id);

    // Latch the earlier beats so the chain reads correctly on the very next
    // frame instead of waiting for the director's own re-evaluation.
    for (const step of done) {
      const o = director.objectives.find((x) => x.id === step);
      if (o && o.state !== OBJECTIVE_STATE.FAILED) {
        o.state = OBJECTIVE_STATE.DONE;
        if (o.completedAt === null) o.completedAt = r2(director.elapsed);
      }
    }
    director._activate?.();
    return {
      ok: true,
      target: id,
      satisfied: done,
      active: director.activeObjective?.id || null,
      objectives: this.listObjectives(),
    };
  }

  /** The real-world action that completes one beat. */
  _satisfy(objectiveId) {
    const game = this.game;
    switch (objectiveId) {
      case 'infiltrate':
        game.teleport('vestibule');
        break;
      case 'locate-hostage-a':
      case 'locate-hostage-b': {
        const which = objectiveId.endsWith('-a') ? 0 : 1;
        const h = game.hostages?.list?.[which];
        if (h) h.revealed = true;
        break;
      }
      case 'secure-hostage-a':
        this.secureHostage(HOSTAGE_POINTS[0]?.id || 'hostage-a');
        break;
      case 'secure-hostage-b':
        this.secureHostage(HOSTAGE_POINTS[1]?.id || 'hostage-b');
        break;
      case 'open-garage':
        this.openGarage();
        break;
      case 'escort-hostages':
        this.extractHostages();
        break;
      default:
        break;
    }
  }

  /** Move the player somewhere sensible for the beat we are jumping to. */
  _stageFor(objectiveId) {
    const map = {
      infiltrate: 'insertion',
      'locate-hostage-a': 'openoffice',
      'secure-hostage-a': 'conference',
      'locate-hostage-b': 'execcorr',
      'secure-hostage-b': 'execoffice',
      'open-garage': 'garage',
      'escort-hostages': 'loading',
      'hold-extraction': 'extraction',
    };
    const cp = map[objectiveId];
    if (cp && CHECKPOINTS[cp]) this.game.teleport(cp);
  }

  secureHostage(id) {
    if (!this.enabled) return refused('secureHostage');
    const hostages = this.game.hostages;
    if (!hostages) return { ok: false, reason: 'no-hostage-manager' };
    const target = id || hostages.list[0]?.id;
    const ok = hostages.secure(target);
    const h = hostages.list.find((x) => x.id === target);
    return {
      ok: !!ok,
      id: target,
      state: h?.state || null,
      secured: !!h?.secured,
      securedCount: hostages.securedCount,
    };
  }

  /**
   * Secure both hostages, raise the shutter, place everyone in the bay and call
   * the pickup: the whole extraction sequence in one call.
   */
  extractHostages() {
    if (!this.enabled) return refused('extractHostages');
    const game = this.game;
    const hostages = game.hostages;
    if (!hostages) return { ok: false, reason: 'no-hostage-manager' };

    for (const h of hostages.list) {
      if (h.alive && !h.secured) hostages.secure(h.id);
    }
    this.openGarage();

    // Stand each living hostage inside the extraction volume so the director's
    // staging condition is met without walking them across the building.
    const c = EXTRACTION.center;
    hostages.list.forEach((h, i) => {
      if (!h.alive) return;
      const side = i % 2 === 0 ? -1 : 1;
      const spot = new THREE.Vector3(c[0] - 0.9, c[1], c[2] + side * 1.1);
      const snapped = game.nav?.nearestWalkable?.(spot, 3) || spot;
      h.position.copy(snapped);
      h.velocity.set(0, 0, 0);
      h.path = null;
      h.coverPos = null;
    });
    hostages.beginExtraction?.();
    game.teleport('extraction');
    game.director?.callPickup?.();

    return {
      ok: true,
      secured: hostages.securedCount,
      inExtraction: hostages.countInExtraction(),
      garageOpen: !!game.director?.garageOpen,
      holding: !!game.director?.holding,
    };
  }

  /** Raise the vehicle bay shutter, all the way, immediately. */
  openGarage() {
    if (!this.enabled) return refused('openGarage');
    const director = this.game.director;
    if (!director) return { ok: false, reason: 'no-director' };
    director.openGarage();
    const shutter = director.shutter || this.game.doors?.get?.('DOOR-GARAGE');
    if (shutter) {
      shutter.targetAmount = 1;
      shutter.openAmount = 1;
      shutter.state = 'open';
      shutter._buildMesh?.();
      shutter._applyCollision?.();
      this.game.nav?.invalidate?.();
    }
    return { ok: true, garageOpen: !!director.garageOpen, amount: r2(shutter?.openAmount ?? 0) };
  }

  /** Give the player the security keycard (unlocks the security doors). */
  giveKeycard(on = true) {
    if (!this.enabled) return refused('giveKeycard');
    const combat = this.game.combat;
    if (!combat) return { ok: false, reason: 'no-combat-system' };
    combat.hasKeycard = !!on;
    return { ok: true, hasKeycard: !!combat.hasKeycard };
  }

  // ================================================================== player

  damagePlayer(amount = 10, kind = 'bullet') {
    if (!this.enabled) return refused('damagePlayer');
    const p = this.game.player;
    if (!p) return { ok: false, reason: 'no-player' };
    const applied = p.applyDamage(Math.max(0, Number(amount) || 0), null, kind);
    return {
      ok: true, applied, health: Math.round(p.health), armor: Math.round(p.armor), alive: p.alive,
    };
  }

  healPlayer(full = true) {
    if (!this.enabled) return refused('healPlayer');
    const p = this.game.player;
    if (!p) return { ok: false, reason: 'no-player' };
    p.health = p.maxHealth;
    if (full) p.armor = p.maxArmor;
    p.alive = true;
    p.deathTime = 0;
    return { ok: true, health: Math.round(p.health), armor: Math.round(p.armor), alive: p.alive };
  }

  godMode(on = true) {
    if (!this.enabled) return refused('godMode');
    const p = this.game.player;
    if (!p) return { ok: false, reason: 'no-player' };
    p.godMode = !!on;
    return { ok: true, godMode: p.godMode };
  }

  noclip(on = true) {
    if (!this.enabled) return refused('noclip');
    const p = this.game.player;
    if (!p) return { ok: false, reason: 'no-player' };
    p.noclip = !!on;
    if (!p.noclip) p.velocity.set(0, 0, 0);
    return { ok: true, noclip: p.noclip };
  }

  // ================================================================== render

  setQuality(preset) {
    if (!this.enabled) return refused('setQuality');
    if (!QUALITY_PRESETS[preset]) {
      return { ok: false, reason: 'unknown-preset', valid: Object.keys(QUALITY_PRESETS) };
    }
    settings.set('quality', preset);
    return { ok: true, quality: settings.get('quality'), pixelRatio: r2(this.game.engine?.pixelRatioTarget) };
  }

  setResolutionScale(n) {
    if (!this.enabled) return refused('setResolutionScale');
    const value = Math.max(0.25, Math.min(2, Number(n) || 1));
    settings.set('resolutionScale', value);
    return { ok: true, resolutionScale: settings.get('resolutionScale'), pixelRatio: r2(this.game.engine?.pixelRatioTarget) };
  }

  setSetting(key, value) {
    if (!this.enabled) return refused('setSetting');
    if (!(key in settings.values)) return { ok: false, reason: 'unknown-setting', key };
    settings.set(key, value);
    return { ok: true, key, value: settings.get(key) };
  }

  getSettings() {
    return { ...settings.values };
  }

  /** Back to shipped defaults, so one scenario cannot colour the next. */
  resetSettings() {
    if (!this.enabled) return refused('resetSettings');
    settings.reset();
    return { ok: true, values: { ...settings.values } };
  }

  // ================================================================== flow

  /**
   * Skip the menu chain and start playing on the next frame. Used by the test
   * harness and the capture tools; the real menu flow is exercised separately.
   */
  forcePlay({ difficulty, loadout, checkpoint } = {}) {
    if (!this.enabled) return refused('forcePlay');
    const game = this.game;
    if (!game.levelReady) return { ok: false, reason: 'level-not-ready' };
    if (difficulty) {
      game.difficulty = difficulty;
      settings.set('difficulty', difficulty);
    }
    if (loadout) game.loadout = { ...game.loadout, ...loadout };
    game._pendingStart = false;
    game.resetMission();
    game.setState('playing');
    if (checkpoint) game.teleport(checkpoint);
    return {
      ok: true,
      state: game.state,
      difficulty: game.difficulty,
      loadout: { ...game.loadout },
      checkpoint: checkpoint || null,
    };
  }

  /**
   * Hand the clock to the caller. With the requestAnimationFrame loop stopped,
   * the only frames drawn are the ones `window.advanceTime()` asks for, which
   * under software rendering makes a screenshot roughly ten times cheaper (the
   * capture no longer competes with a render that costs most of a frame) and
   * makes every measurement reproducible. The loop must be left alone until the
   * level is built — parts of the load sequence depend on real frames.
   */
  setLoop(on = true) {
    if (!this.enabled) return refused('setLoop');
    const engine = this.game.engine;
    if (!engine) return { ok: false, reason: 'no-engine' };
    if (on) engine.start();
    else engine.stop();
    return { ok: true, running: !!engine._running };
  }

  /**
   * Put the game back to a known, quiet baseline without paying for another
   * level build: release every input, drop debug overlays, close the gallery,
   * clear the recorded events, restore the mission and return to the menu. The
   * shared-page test harness calls this between scenarios.
   */
  softReset({ state = 'menu' } = {}) {
    if (!this.enabled) return refused('softReset');
    const game = this.game;
    this.stopRecording();
    this.showCollision(false);
    this.showNav(false);
    this.showAssetIds(false);
    if (this.game.gallery?.visible) this.closeGallery();
    if (this.panelVisible) this.togglePanel();
    if (this.perfVisible) this.togglePerf();
    this.aiFrozen = false;
    if (game.player) {
      game.player.godMode = false;
      game.player.noclip = false;
    }
    game.input?.releaseAll?.();
    game.input?.consumeLook?.();
    game._pendingStart = false;
    if (game.levelReady) {
      game.resetMission();
      game.engine?.resetClock?.();
    }
    if (state && game.state !== state) game.setState(state);
    return { ok: true, state: game.state, simTime: r3(game.engine?.simTime ?? 0) };
  }

  /**
   * Pointer lock cannot be granted without a user gesture in an automated
   * browser, and a failed request pauses the game. Suppressing the request
   * keeps automated play in the PLAYING state.
   */
  setPointerLock(on = true) {
    const input = this.game.input;
    if (!input) return { ok: false, reason: 'no-input' };
    if (!on && !this._pointerLockSuppressed) {
      this._originalRequestPointerLock = input.requestPointerLock;
      input.requestPointerLock = async () => false;
      this._pointerLockSuppressed = true;
    } else if (on && this._pointerLockSuppressed) {
      input.requestPointerLock = this._originalRequestPointerLock;
      this._originalRequestPointerLock = null;
      this._pointerLockSuppressed = false;
    }
    return { ok: true, suppressed: this._pointerLockSuppressed };
  }

  // ================================================================== reports

  /**
   * Raycast a grid across the frustum and report what the player can actually
   * see from where they stand. `misses` counts rays that hit nothing at all,
   * which is how the room audit finds holes in the geometry, and `untagged`
   * counts surfaces with no `assetId` behind them.
   *
   * Identity has to be resolved two ways, because most of the building is no
   * longer its own object: `StaticBatcher` merges the level, props and light
   * fixtures into a handful of meshes and deletes the originals, so walking the
   * parent chain for `userData.assetId` finds nothing at all for exactly the
   * geometry that makes up a room. It keeps the source bounds in a side table
   * for this purpose, so the batch lookup is consulted whenever the hit object
   * itself is untagged, and only a point that neither route can name counts as
   * untagged. Without this the audit reports 70-90% untagged rays everywhere
   * and calls a fully dressed room empty.
   *
   * Only depth-writing meshes count, and that is not a detail. Two things sit
   * between the camera and the room and answer rays at nearly zero distance: the
   * snow field, which is a `Points` cloud centred on the camera and so matches
   * *every* ray outdoors, and an unlit 44x9 m scrim plane in the courtyard that
   * the insertion checkpoint stands inside. Neither is visible in the frame —
   * both have `depthWrite: false`, which is what makes them a wash rather than a
   * surface — but counted as hits they reported the courtyard and the extraction
   * garage as 100% untagged geometry with nothing visible, which reads as a
   * missing-content defect that does not exist. So the rule is the same one the
   * depth buffer uses: if it does not write depth, the player is not looking at
   * it, they are looking through it.
   */
  probeView({ cols = 9, rows = 5, far = 40, inset = 0.86 } = {}) {
    if (!this.enabled) return refused('probeView');
    const camera = this.game.camera;
    const scene = this.game.scene;
    if (!camera || !scene) return { ok: false, reason: 'no-camera' };

    const seen = new Map();
    const ndc = new THREE.Vector2();
    let rays = 0;
    let misses = 0;
    let untagged = 0;
    let nearest = Infinity;
    let farthest = 0;
    let overlayHits = 0;

    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        rays++;
        ndc.set(
          (cols === 1 ? 0 : (ix / (cols - 1)) * 2 - 1) * inset,
          (rows === 1 ? 0 : (iy / (rows - 1)) * 2 - 1) * inset
        );
        this._raycaster.setFromCamera(ndc, camera);
        this._raycaster.far = far;
        let hits = [];
        try {
          hits = this._raycaster.intersectObject(scene, true);
        } catch (err) {
          this._note('probeView raycast failed', err);
          return { ok: false, reason: 'raycast-failed' };
        }
        const solid = (h) => {
          const o = h.object;
          if (!o || !o.isMesh || o.isPoints || o.isSprite) return false;
          const mat = Array.isArray(o.material) ? o.material[0] : o.material;
          if (mat && mat.depthWrite === false) return false;
          return !/^(qa|nav|gallery):/.test(o.name || '');
        };
        if (hits.length && !solid(hits[0])) overlayHits++;
        const hit = hits.find(solid);
        if (!hit) {
          misses++;
          continue;
        }
        if (hit.distance < nearest) nearest = hit.distance;
        if (hit.distance > farthest) farthest = hit.distance;

        let id = null;
        let source = 'object';
        for (let node = hit.object; node; node = node.parent) {
          if (node.userData?.assetId) {
            id = node.userData.assetId;
            break;
          }
        }
        if (!id && hit.point) {
          // Merged into a static batch: the original object is gone, but its
          // bounds and asset ID are still in the batcher's side table.
          id = this.game.batcher?.assetIdAt?.(hit.point, 0.25) ?? null;
          if (id) source = 'batch';
        }
        if (!id) {
          untagged++;
          continue;
        }
        const entry = seen.get(id)
          || { id, registered: assets.has(id), rays: 0, nearest: Infinity, via: source };
        entry.rays++;
        entry.nearest = Math.min(entry.nearest, hit.distance);
        seen.set(id, entry);
      }
    }

    const visible = Array.from(seen.values())
      .map((e) => ({ ...e, nearest: r2(e.nearest) }))
      .sort((a, b) => b.rays - a.rays);
    return {
      ok: true,
      rays,
      misses,
      untagged,
      hits: rays - misses,
      // How many rays passed through a particle or scrim on the way to a
      // surface. Only diagnostic: if a future change starts counting those as
      // hits again, this is where the sudden "everything is untagged" will be
      // explained.
      overlayHits,
      nearest: Number.isFinite(nearest) ? r2(nearest) : null,
      farthest: r2(farthest),
      visible,
      unregistered: visible.filter((v) => !v.registered).map((v) => v.id),
    };
  }

  perf() {
    const engine = this.game.engine;
    const p = engine?.perf || {};
    const info = engine?.renderer?.info;
    let sceneObjects = 0;
    let taggedObjects = 0;
    this.game.scene?.traverse?.((o) => {
      sceneObjects++;
      if (o.userData?.assetId) taggedObjects++;
    });
    let instantiated = 0;
    for (const rec of assets.list()) if (assets.countInstances(rec.id) > 0) instantiated++;
    const enemies = this.game.enemies?.list || [];

    return {
      fps: r2(p.fps),
      frameMs: r3(p.frameMs),
      cpuMs: r3(p.cpuMs),
      drawCalls: p.drawCalls || 0,
      triangles: p.triangles || 0,
      programs: p.programs || 0,
      geometries: info?.memory?.geometries ?? 0,
      textures: info?.memory?.textures ?? 0,
      resolution: [engine?.viewportWidth ?? 0, engine?.viewportHeight ?? 0],
      pixelRatio: r2(engine?.renderer?.getPixelRatio?.() ?? 1),
      quality: settings.get('quality'),
      resolutionScale: settings.get('resolutionScale'),
      sceneObjects,
      taggedObjects,
      colliders: this.game.collision?.colliders?.size ?? 0,
      navCells: this.game.nav?.stats?.walkable ?? null,
      assets: {
        registered: assets.list().length,
        instantiated,
        categories: assets.categories().length,
      },
      enemies: { count: enemies.length, alive: enemies.filter((e) => e.alive).length },
      hostages: {
        count: this.game.hostages?.list?.length ?? 0,
        secured: this.game.hostages?.securedCount ?? 0,
      },
      simTime: r3(engine?.simTime ?? 0),
      frame: engine?.frame ?? 0,
      aiFrozen: this.aiFrozen,
    };
  }

  /**
   * Manifest audit: field completeness, records that were never instantiated,
   * and any `assetId` in the live scene graph that has no record behind it.
   */
  assetReport() {
    const records = assets.list();
    const missingFields = [];
    for (const rec of records) {
      const missing = requiredFieldsFor(rec).filter((f) => {
        const v = rec[f];
        if (v === undefined || v === null) return true;
        if (typeof v === 'string') return v.trim() === '';
        // An explicitly empty list is an answer — an animation clip really does
        // have no materials of its own — so only `dims` is checked for shape.
        if (Array.isArray(v)) return f === 'dims' ? v.length !== 3 : false;
        return false;
      });
      if (missing.length) missingFields.push({ id: rec.id, owner: rec.owner, category: rec.category, missing });
    }

    const sceneIds = new Map();
    this.game.scene?.traverse?.((o) => {
      const id = o.userData?.assetId;
      if (!id) return;
      const entry = sceneIds.get(id) || { count: 0, names: [] };
      entry.count++;
      if (entry.names.length < 3 && o.name) entry.names.push(o.name);
      sceneIds.set(id, entry);
    });
    const unregistered = [];
    for (const [id, entry] of sceneIds) {
      if (!assets.has(id)) unregistered.push({ assetId: id, occurrences: entry.count, sampleNames: entry.names });
    }

    const neverInstantiated = records
      .filter((r) => !NON_INSTANCED_CATEGORIES.includes(r.category) && assets.countInstances(r.id) === 0)
      .map((r) => ({ id: r.id, name: r.name, category: r.category, owner: r.owner, status: r.status }));

    const inScene = records
      .filter((r) => !NON_INSTANCED_CATEGORIES.includes(r.category) && !sceneIds.has(r.id) && assets.countInstances(r.id) > 0)
      .map((r) => r.id);

    return {
      summary: assets.summary(),
      categories: assets.categories(),
      requiredFields: REQUIRED_ASSET_FIELDS,
      geometryFields: GEOMETRY_ASSET_FIELDS,
      nonGeometryCategories: NON_GEOMETRY_CATEGORIES,
      missingFields,
      unregisteredInScene: unregistered,
      neverInstantiated,
      taggedButNotInScene: inScene,
      unusedRecords: assets.unusedRecords().map((r) => r.id),
      instanceCounts: Object.fromEntries(records.map((r) => [r.id, assets.countInstances(r.id)])),
      sceneAssetIds: sceneIds.size,
    };
  }

  /**
   * A compact, deterministic fingerprint of everything that should be identical
   * between two runs given identical inputs. Frame timings, fps and anything
   * wall-clock derived are deliberately excluded.
   */
  screenshotState() {
    const g = this.game;
    const p = g.player;
    const out = {
      schema: 'northstar.qa.digest/1',
      state: g.state,
      levelReady: !!g.levelReady,
      difficulty: g.difficulty,
      simTime: r3(g.engine?.simTime ?? 0),
    };
    if (p) {
      out.player = {
        pos: [r2(p.position.x), r2(p.position.y), r2(p.position.z)],
        yaw: r3(p.yaw),
        pitch: r3(p.pitch),
        vel: [r2(p.velocity.x), r2(p.velocity.y), r2(p.velocity.z)],
        health: Math.round(p.health),
        armor: Math.round(p.armor),
        alive: !!p.alive,
        move: p.moveState,
        grounded: !!p.grounded,
        crouched: p.crouchBlend > 0.5,
        room: g.currentRoom?.()?.id ?? null,
      };
    }
    const w = g.weapons;
    if (w) {
      out.weapon = {
        active: w.activeSlot,
        slots: SLOT_ORDER.map((name) => {
          const s = w.slots[name];
          if (!s) return null;
          return { name, key: s.key, ammo: s.ammo, reserve: s.reserve, count: s.count, shots: s.shotsFired };
        }).filter(Boolean),
        reloading: !!w.reloadState,
        ads: r2(w.adsFactor),
        phase: w.phase,
      };
    }
    if (g.enemies) {
      out.enemies = g.enemies.list.map((e) => ({
        id: e.id, variant: e.variant, state: e.state, alive: !!e.alive,
        health: Math.round(e.health), pos: [r2(e.position.x), r2(e.position.y), r2(e.position.z)],
      }));
    }
    if (g.hostages) {
      out.hostages = g.hostages.list.map((h) => ({
        id: h.id, state: h.state, alive: !!h.alive, secured: !!h.secured,
        health: Math.round(h.health), pos: [r2(h.position.x), r2(h.position.y), r2(h.position.z)],
        progress: r2(h.secureProgress),
      }));
    }
    if (g.doors) {
      out.doors = Array.from(g.doors.doors?.values?.() || [])
        .map((d) => ({ id: d.id, state: d.state, open: r2(d.openAmount), locked: !!d.locked }))
        .sort((a, b) => (a.id < b.id ? -1 : 1));
    }
    if (g.director) {
      out.mission = {
        outcome: g.director.outcome,
        reason: g.director.endReason,
        active: g.director.activeObjective?.id || null,
        timeRemaining: r2(g.director.timeRemaining),
        holdRemaining: r2(g.director.holdRemaining),
        garage: r2(g.director.shutter?.openAmount ?? 0),
        objectives: g.director.objectives.map((o) => [o.id, o.state]),
      };
    }
    out.colliders = g.collision?.colliders?.size ?? 0;
    out.digest = digestOf(out);
    return out;
  }

  // ================================================================== events

  /**
   * Subscribe to bus events and buffer them so a test can assert on the exact
   * chain of causes a single input produced ("one trigger pull emitted one
   * WEAPON_FIRE and one IMPACT"). Payloads are flattened to plain JSON because
   * most of them carry live `THREE.Vector3` and entity references.
   */
  recordEvents(types = null) {
    const list = Array.isArray(types) && types.length ? types : Object.values(EVT);
    for (const type of list) {
      if (this._recording.has(type)) continue;
      const off = bus.on(type, (payload) => {
        if (this._recorded.length > 4000) return;
        this._recorded.push({
          type,
          simTime: r3(this.game.engine?.simTime ?? 0),
          frame: this.game.engine?.frame ?? 0,
          payload: flattenPayload(payload),
        });
      });
      this._recording.set(type, off);
    }
    return { ok: true, recording: Array.from(this._recording.keys()) };
  }

  /** Drain the buffer, optionally filtered by type. */
  takeEvents(type = null) {
    const all = this._recorded;
    if (!type) {
      this._recorded = [];
      return all;
    }
    const wanted = Array.isArray(type) ? type : [type];
    const keep = [];
    const out = [];
    for (const e of all) (wanted.includes(e.type) ? out : keep).push(e);
    this._recorded = keep;
    return out;
  }

  stopRecording() {
    for (const off of this._recording.values()) off();
    this._recording.clear();
    this._recorded = [];
    return { ok: true };
  }

  /** Anything QA swallowed rather than letting it break the frame. */
  log() {
    return this._log.slice();
  }

  _note(message, err) {
    const entry = { message, error: err ? String(err?.message || err) : null, simTime: r3(this.game.engine?.simTime ?? 0) };
    this._log.push(entry);
    if (this._log.length > 50) this._log.shift();
    console.warn(`[qa] ${message}`, err || '');
    return entry;
  }

  // ================================================================== api

  /**
   * The object the lead exposes as `window.__NORTHSTAR_QA__`. Methods are bound
   * so callers can destructure them.
   */
  _buildApi() {
    const self = this;
    const bind = (fn) => fn.bind(this);
    const api = {
      version: 'northstar.qa/1',
      get enabled() {
        return self.enabled;
      },
      get aiFrozen() {
        return self.aiFrozen;
      },

      // world
      teleport: bind(this.teleport),
      listCheckpoints: bind(this.listCheckpoints),
      currentRoom: bind(this.currentRoom),

      // weapons
      giveWeapon: bind(this.giveWeapon),
      selectWeapon: bind(this.selectWeapon),
      refillAmmo: bind(this.refillAmmo),
      listWeapons: bind(this.listWeapons),

      // hostiles
      spawnEnemy: bind(this.spawnEnemy),
      freezeAI: bind(this.freezeAI),
      killAllEnemies: bind(this.killAllEnemies),
      revealEnemies: bind(this.revealEnemies),

      // lighting
      setLighting: bind(this.setLighting),
      listLightingScenarios: bind(this.listLightingScenarios),

      // overlays
      showAssetIds: bind(this.showAssetIds),
      showCollision: bind(this.showCollision),
      showNav: bind(this.showNav),
      togglePanel: bind(this.togglePanel),
      togglePerf: bind(this.togglePerf),

      // gallery
      openGallery: bind(this.openGallery),
      closeGallery: bind(this.closeGallery),
      galleryState: () => this.game.gallery?.state?.() ?? null,
      gallerySelect: (id) => this.game.gallery?.select?.(id) ?? null,
      galleryFilter: (opts) => this.game.gallery?.setFilter?.(opts) ?? null,
      captureViews: (id) => this.game.gallery?.captureViews?.(id) ?? null,
      showView: (nameOrIndex) => this.game.gallery?.showView?.(nameOrIndex) ?? null,

      // mission
      resetMission: bind(this.resetMission),
      listObjectives: bind(this.listObjectives),
      setObjectiveState: bind(this.setObjectiveState),
      jumpToObjective: bind(this.jumpToObjective),
      secureHostage: bind(this.secureHostage),
      extractHostages: bind(this.extractHostages),
      openGarage: bind(this.openGarage),
      giveKeycard: bind(this.giveKeycard),

      // player
      damagePlayer: bind(this.damagePlayer),
      healPlayer: bind(this.healPlayer),
      godMode: bind(this.godMode),
      noclip: bind(this.noclip),

      // render / settings
      setQuality: bind(this.setQuality),
      setResolutionScale: bind(this.setResolutionScale),
      setSetting: bind(this.setSetting),
      getSettings: bind(this.getSettings),
      resetSettings: bind(this.resetSettings),

      // flow
      forcePlay: bind(this.forcePlay),
      setPointerLock: bind(this.setPointerLock),
      setLoop: bind(this.setLoop),
      softReset: bind(this.softReset),

      // reporting
      perf: bind(this.perf),
      probeView: bind(this.probeView),
      assetReport: bind(this.assetReport),
      screenshotState: bind(this.screenshotState),
      state: () => this.game.renderToText(),
      hudState: () => this.game.ui?.hudState?.() ?? null,
      recordEvents: bind(this.recordEvents),
      takeEvents: bind(this.takeEvents),
      stopRecording: bind(this.stopRecording),
      eventTypes: () => ({ ...EVT }),
      log: bind(this.log),
      enable: bind(this.enable),
    };
    return api;
  }
}

export default QAMode;
