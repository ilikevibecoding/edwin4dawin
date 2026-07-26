import * as THREE from 'three';
import { assets } from '../core/assets.js';
import { bus, EVT } from '../core/events.js';
import { PROP_FACTORIES } from '../props/library.js';
import { MAT } from '../art/materials.js';
import { WEAPONS, buildWeaponModel } from '../characters/weapons-models.js';
import { buildEnemy } from '../characters/enemy-model.js';
import { buildHostage } from '../characters/hostage-model.js';

// ---------------------------------------------------------------------------
// Asset gallery.  (owner: opus4)
//
// A development-only inspection mode. Every record in the asset registry is
// listed, searchable and filterable; selecting one spawns that asset alone on a
// turntable stage in front of a dedicated inspection camera, under either
// neutral studio light or the production lighting values, against a switchable
// background, with orbit, zoom, a wireframe toggle and the full manifest
// read-out beside it.
//
// The gallery does not build a second renderer. It hides the level, drops its
// stage into the same scene and drives the same camera, which is what keeps it
// compatible with the post-processing chain that wraps `engine.render`.
//
// `captureViews(id)` is the contract the screenshot tool uses: it returns the
// four canonical acceptance views and `showView()` puts the camera on any one
// of them deterministically.
// ---------------------------------------------------------------------------

/** The canonical acceptance views, in capture order. */
export const INSPECTION_VIEWS = [
  {
    name: 'neutral',
    lighting: 'neutral',
    background: 'studio',
    distance: 2.2,
    azimuth: Math.PI * 0.28,
    elevation: 0.32,
    wireframe: false,
    description: 'Three-quarter view under neutral studio light: silhouette and proportion.',
  },
  {
    name: 'production',
    lighting: 'production',
    background: 'dark',
    distance: 2.2,
    azimuth: -Math.PI * 0.32,
    elevation: 0.24,
    wireframe: false,
    description: 'The same asset under the shipping lighting values and grade.',
  },
  {
    name: 'close',
    lighting: 'neutral',
    background: 'studio',
    distance: 0.75,
    azimuth: Math.PI * 0.12,
    elevation: 0.12,
    wireframe: false,
    description: 'Close detail pass: edge treatment, material breakup, decals and labels.',
  },
  {
    name: 'gameplay',
    lighting: 'production',
    background: 'dark',
    distance: 3.6,
    azimuth: 0,
    elevation: 0.06,
    wireframe: false,
    description: 'Eye height at typical gameplay distance: does it read at a glance?',
  },
];

const BACKGROUNDS = {
  studio: 0x2a3138,
  dark: 0x0a0f14,
  light: 0xb9c3cb,
  chroma: 0x18705a,
};

const LIGHTING_MODES = ['neutral', 'production'];

/** Registry ids that map onto a material family rather than a mesh. */
const MATERIAL_SAMPLES = {
  'MAT-DRYWALL': 'wallOffice',
  'MAT-PLASTER': 'plaster',
  'MAT-CEILTILE': 'ceiling',
  'MAT-CARPET': 'carpetMain',
  'MAT-VINYL': 'vinyl',
  'MAT-CERAMIC': 'tileWall',
  'MAT-CONCRETE': 'concrete',
  'MAT-WOOD': 'woodDesk',
  'MAT-LAMINATE': 'laminateLight',
  'MAT-PAINTMETAL': 'metalPainted',
  'MAT-BRUSHMETAL': 'steel',
  'MAT-FABRIC': 'fabricChair',
  'MAT-LEATHER': 'leather',
  'MAT-PLASTIC': 'plasticBlack',
  'MAT-PAPER': 'paper',
  'MAT-SNOW': 'snow',
  'MAT-GLASS-CLEAR': 'glassClear',
  'MAT-GLASS-FROST': 'glassFrosted',
  'MAT-GLASS-TINT': 'glassTinted',
};

const CHARACTER_BUILDERS = {
  'CHAR-ENEMY-BREACHER': () => buildEnemy('breacher', { seed: 1 }).group,
  'CHAR-ENEMY-RUNNER': () => buildEnemy('runner', { seed: 2 }).group,
  'CHAR-ENEMY-MARKSMAN': () => buildEnemy('marksman', { seed: 3 }).group,
  'CHAR-HOSTAGE-ANALYST': () => buildHostage('analyst').group,
  'CHAR-HOSTAGE-DIRECTOR': () => buildHostage('director').group,
};

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

export class AssetGallery {
  /** @param {import('../game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.visible = false;

    this.filter = { search: '', category: '', owner: '', status: '' };
    this.selectedId = null;
    this.lightingMode = 'neutral';
    this.background = 'studio';
    this.wireframe = false;
    this.autoRotate = true;

    this.distance = 2.2;
    this.azimuth = Math.PI * 0.28;
    this.elevation = 0.32;
    this.turntable = 0;

    this._dom = null;
    this._stage = null;
    this._model = null;
    this._modelBox = new THREE.Box3();
    this._modelStats = null;
    this._hidden = [];
    this._savedFog = null;
    this._savedBackground = null;
    this._savedCamera = null;
    this._savedViewmodelVisible = null;
    this._transitioning = false;
    this._views = INSPECTION_VIEWS;
    this._currentView = null;
    this._buildErrors = [];

    this._offState = bus.on(EVT.GAME_STATE, ({ state }) => {
      if (state !== 'gallery' && this.visible && !this._transitioning) this.close();
    });
  }

  // ================================================================== records

  /** Every record, newest filter applied, sorted by category then id. */
  records() {
    const f = this.filter;
    const needle = String(f.search || '').trim().toLowerCase();
    return assets
      .list({
        category: f.category || undefined,
        owner: f.owner || undefined,
        status: f.status || undefined,
      })
      .filter((r) => {
        if (!needle) return true;
        return `${r.id} ${r.name} ${r.category} ${r.owner} ${(r.rooms || []).join(' ')}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => (a.category === b.category ? (a.id < b.id ? -1 : 1) : a.category < b.category ? -1 : 1));
  }

  setFilter(opts = {}) {
    this.filter = { ...this.filter, ...opts };
    if (this._dom) {
      this._dom.search.value = this.filter.search || '';
      this._dom.category.value = this.filter.category || '';
      this._dom.owner.value = this.filter.owner || '';
      this._dom.status.value = this.filter.status || '';
      this._renderList();
    }
    return { ok: true, filter: { ...this.filter }, matches: this.records().length };
  }

  // ================================================================== open

  open(id = null) {
    if (this.visible) {
      if (id) this.select(id);
      return this.state();
    }
    this.visible = true;

    this._transitioning = true;
    if (this.game.state !== 'gallery') this.game.setState?.('gallery');
    this._transitioning = false;

    this._ensureDom();
    this._dom?.root.classList.add('visible');

    this._hideWorld();
    this._buildStage();
    this._renderList();

    const first = id || this.selectedId || this.records()[0]?.id || null;
    if (first) this.select(first);
    else this._applyCamera();
    return this.state();
  }

  close() {
    if (!this.visible) return this.state();
    this.visible = false;
    this._dom?.root.classList.remove('visible');
    this._clearModel();
    if (this._stage) {
      this.game.scene?.remove?.(this._stage);
    }
    this._restoreWorld();
    this._transitioning = true;
    if (this.game.state === 'gallery') this.game.setState?.('menu');
    this._transitioning = false;
    return this.state();
  }

  toggle() {
    return this.visible ? this.close() : this.open();
  }

  dispose() {
    this._offState?.();
    this.close();
  }

  // ================================================================== scene

  /**
   * Hide the level rather than build a second scene: the post-processing chain
   * wraps `engine.render` and renders `engine.scene`, so a private scene would
   * never reach the screen.
   */
  _hideWorld() {
    const scene = this.game.scene;
    if (!scene) return;
    this._hidden = [];
    for (const child of scene.children) {
      if (child === this._stage) continue;
      this._hidden.push([child, child.visible]);
      child.visible = false;
    }
    this._savedFog = scene.fog;
    this._savedBackground = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color(BACKGROUNDS[this.background] ?? BACKGROUNDS.studio);

    const camera = this.game.camera;
    if (camera) {
      this._savedCamera = {
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        position: camera.position.clone(),
        rotation: camera.rotation.clone(),
      };
      camera.fov = 42;
      camera.near = 0.01;
      camera.far = 80;
      camera.updateProjectionMatrix();
    }

    // The first-person arms overlay would otherwise draw over the turntable.
    const vm = this.game.viewmodel;
    if (vm?.root) {
      this._savedViewmodelVisible = vm.root.visible;
      vm.root.visible = false;
    }
  }

  _restoreWorld() {
    const scene = this.game.scene;
    if (scene) {
      for (const [child, wasVisible] of this._hidden) child.visible = wasVisible;
      scene.fog = this._savedFog;
      scene.background = this._savedBackground;
    }
    this._hidden = [];

    const camera = this.game.camera;
    if (camera && this._savedCamera) {
      camera.fov = this._savedCamera.fov;
      camera.near = this._savedCamera.near;
      camera.far = this._savedCamera.far;
      camera.position.copy(this._savedCamera.position);
      camera.rotation.copy(this._savedCamera.rotation);
      camera.updateProjectionMatrix();
      this._savedCamera = null;
    }
    this.game.engine?.resize?.();

    const vm = this.game.viewmodel;
    if (vm?.root && this._savedViewmodelVisible !== null) {
      vm.root.visible = this._savedViewmodelVisible;
      this._savedViewmodelVisible = null;
    }
  }

  /** The turntable: a plinth, a backdrop, a scale reference and two rigs. */
  _buildStage() {
    if (this._stage) {
      this._stage.visible = true;
      this.game.scene?.add?.(this._stage);
      return this._stage;
    }
    const stage = new THREE.Group();
    stage.name = 'qa:gallery-stage';

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.7, 0.06, 48),
      new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.85, metalness: 0.05 })
    );
    plinth.position.y = -0.03;
    plinth.receiveShadow = true;
    stage.add(plinth);

    // A one-metre grid on the plinth so scale errors are visible, not implied.
    const grid = new THREE.GridHelper(3, 6, 0x7fd4e8, 0x39454f);
    grid.position.y = 0.002;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    stage.add(grid);

    // 1.78 m human scale reference: a translucent slab, not a character.
    const human = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 1.78, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x7fd4e8, transparent: true, opacity: 0.09, depthWrite: false })
    );
    human.position.set(1.05, 0.89, -0.35);
    human.name = 'qa:gallery-human-ref';
    stage.add(human);
    this._humanRef = human;

    // Rotating cradle: the asset is parented here, the plinth stays still.
    const cradle = new THREE.Group();
    cradle.name = 'qa:gallery-cradle';
    stage.add(cradle);
    this._cradle = cradle;

    // Neutral studio rig.
    const studio = new THREE.Group();
    studio.name = 'qa:gallery-studio';
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(2.4, 3.2, 2.6);
    const fill = new THREE.DirectionalLight(0xcfe0ee, 1.1);
    fill.position.set(-2.8, 1.6, 1.4);
    const rim = new THREE.DirectionalLight(0xffe8c8, 1.4);
    rim.position.set(-1.2, 2.2, -3.0);
    studio.add(key, fill, rim, new THREE.AmbientLight(0xffffff, 0.55));
    studio.add(new THREE.HemisphereLight(0xdfeaf4, 0x3a4048, 0.6));
    stage.add(studio);
    this._studioRig = studio;

    // Production rig: the fluorescent / tungsten values the building ships with.
    const production = new THREE.Group();
    production.name = 'qa:gallery-production';
    const sun = new THREE.DirectionalLight(0xd6e6f4, 1.6);
    sun.position.set(-2.6, 3.4, -3.2);
    const troffer = new THREE.PointLight(0xf2f6ea, 3.2, 8, 1.6);
    troffer.position.set(0, 2.6, 0.2);
    const tungsten = new THREE.PointLight(0xffcf96, 1.8, 6, 1.6);
    tungsten.position.set(1.4, 1.4, 1.2);
    production.add(sun, troffer, tungsten, new THREE.AmbientLight(0x8fa4b8, 0.35));
    production.visible = false;
    stage.add(production);
    this._productionRig = production;

    this._stage = stage;
    this.game.scene?.add?.(stage);
    this._applyLightingMode();
    return stage;
  }

  // ================================================================== model

  _clearModel() {
    if (!this._model) return;
    this._cradle?.remove(this._model);
    this._model.traverse?.((o) => {
      if (o.isMesh && o.userData?.qaGalleryOwned) o.geometry?.dispose?.();
    });
    this._model = null;
    this._modelStats = null;
  }

  /**
   * Instantiate one registry record on its own. Props, weapons, characters and
   * materials all have real builders; anything else (architecture kit pieces,
   * light fixtures, doors) falls back to a dimensioned proxy so the record's
   * declared size is still inspectable and the gap is reported honestly.
   */
  _build(record) {
    const id = record.id;
    if (PROP_FACTORIES[id]) return { object: PROP_FACTORIES[id](), source: 'props/library.js' };

    if (CHARACTER_BUILDERS[id]) return { object: CHARACTER_BUILDERS[id](), source: 'characters/*' };

    const weapon = Object.values(WEAPONS).find((w) => w.id === id);
    if (weapon) return { object: buildWeaponModel(weapon.key, { world: true }), source: 'characters/weapons-models.js' };

    if (MATERIAL_SAMPLES[id]) {
      const group = new THREE.Group();
      const material = MAT[MATERIAL_SAMPLES[id]];
      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.05), material);
      plate.position.set(-0.36, 0.62, 0);
      plate.userData.qaGalleryOwned = true;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 40, 28), material);
      ball.position.set(0.55, 0.3, 0.1);
      ball.userData.qaGalleryOwned = true;
      group.add(plate, ball);
      return { object: group, source: 'art/materials.js' };
    }

    // Dimensioned proxy.
    const [w, h, d] = record.dims && record.dims.length === 3 ? record.dims : [0.5, 0.5, 0.5];
    const group = new THREE.Group();
    const size = [Math.max(0.02, w), Math.max(0.02, h), Math.max(0.02, d)];
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      new THREE.MeshStandardMaterial({
        color: 0x5c6a76, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.55,
      })
    );
    box.position.y = size[1] / 2;
    box.userData.qaGalleryOwned = true;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(box.geometry),
      new THREE.LineBasicMaterial({ color: 0x7fd4e8 })
    );
    edges.position.copy(box.position);
    edges.userData.qaGalleryOwned = true;
    group.add(box, edges);
    return { object: group, source: 'proxy (no standalone builder)', proxy: true };
  }

  select(id) {
    const record = assets.get(id);
    if (!record) return { ok: false, reason: 'unknown-asset', id };
    this.selectedId = id;
    if (!this.visible) return { ok: true, id, deferred: true };

    this._clearModel();
    let built = null;
    try {
      built = this._build(record);
    } catch (err) {
      this._buildErrors.push({ id, error: String(err?.message || err) });
      if (this._buildErrors.length > 30) this._buildErrors.shift();
      console.warn(`[gallery] could not build "${id}"`, err);
      built = null;
    }
    if (!built?.object) {
      this._modelStats = { proxy: true, buildFailed: true, source: 'none' };
      this._renderList();
      this._renderMeta(record);
      return { ok: false, reason: 'build-failed', id };
    }

    const object = built.object;
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.visible = true;
    object.traverse?.((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        o.frustumCulled = false;
      }
    });
    this._cradle.add(object);
    this._model = object;

    // Measure what actually got built so a declared/measured mismatch shows up.
    this._modelBox.setFromObject(object);
    const measured = new THREE.Vector3();
    this._modelBox.getSize(measured);
    let meshes = 0;
    let triangles = 0;
    const materials = new Set();
    const textures = new Set();
    object.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      const geo = o.geometry;
      const count = geo?.index ? geo.index.count : geo?.attributes?.position?.count || 0;
      triangles += Math.floor(count / 3);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m) continue;
        materials.add(m.name || m.type);
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) {
          if (m[key]) textures.add(key);
        }
      }
    });
    this._modelStats = {
      source: built.source,
      proxy: !!built.proxy,
      buildFailed: false,
      measured: [r3(measured.x), r3(measured.y), r3(measured.z)],
      declared: record.dims ? record.dims.slice() : null,
      baseY: r3(this._modelBox.min.y),
      meshes,
      triangles,
      runtimeMaterials: Array.from(materials),
      runtimeTextureSlots: Array.from(textures),
    };

    // Frame the asset: the largest dimension decides the standing distance.
    const span = Math.max(measured.x, measured.y, measured.z, 0.1);
    this._frameDistance = THREE.MathUtils.clamp(span * 2.0 + 0.35, 0.5, 14);
    this.distance = this._frameDistance;
    this.turntable = 0;

    this._applyCamera();
    this._applyWireframe();
    this._renderList();
    this._renderMeta(record);
    return { ok: true, id, stats: this._modelStats };
  }

  // ================================================================== camera

  _target() {
    const centre = new THREE.Vector3();
    if (this._model) this._modelBox.getCenter(centre);
    else centre.set(0, 0.6, 0);
    return centre;
  }

  _applyCamera() {
    const camera = this.game.camera;
    if (!camera) return;
    const target = this._target();
    const d = this.distance;
    const ce = Math.cos(this.elevation);
    camera.position.set(
      target.x + Math.sin(this.azimuth) * ce * d,
      target.y + Math.sin(this.elevation) * d,
      target.z + Math.cos(this.azimuth) * ce * d
    );
    camera.rotation.order = 'YXZ';
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  orbit(dAzimuth = 0, dElevation = 0) {
    this.azimuth += dAzimuth;
    this.elevation = THREE.MathUtils.clamp(this.elevation + dElevation, -1.35, 1.35);
    this._applyCamera();
    return { azimuth: r3(this.azimuth), elevation: r3(this.elevation) };
  }

  zoom(factor = 1) {
    const base = this._frameDistance || 2.2;
    this.distance = THREE.MathUtils.clamp(this.distance * (factor || 1), base * 0.14, base * 6);
    this._applyCamera();
    return { distance: r3(this.distance) };
  }

  setAutoRotate(on = true) {
    this.autoRotate = !!on;
    return { autoRotate: this.autoRotate };
  }

  // ================================================================== looks

  setLighting(mode) {
    if (!LIGHTING_MODES.includes(mode)) return { ok: false, reason: 'unknown-mode', valid: LIGHTING_MODES };
    this.lightingMode = mode;
    this._applyLightingMode();
    this._renderMeta(assets.get(this.selectedId));
    return { ok: true, lighting: this.lightingMode };
  }

  _applyLightingMode() {
    if (this._studioRig) this._studioRig.visible = this.lightingMode === 'neutral';
    if (this._productionRig) this._productionRig.visible = this.lightingMode === 'production';
  }

  setBackground(name) {
    const key = name in BACKGROUNDS ? name : null;
    if (!key) return { ok: false, reason: 'unknown-background', valid: Object.keys(BACKGROUNDS) };
    this.background = key;
    if (this.visible && this.game.scene) {
      this.game.scene.background = new THREE.Color(BACKGROUNDS[key]);
    }
    return { ok: true, background: this.background };
  }

  cycleBackground() {
    const keys = Object.keys(BACKGROUNDS);
    const next = keys[(keys.indexOf(this.background) + 1) % keys.length];
    return this.setBackground(next);
  }

  setWireframe(on = true) {
    this.wireframe = !!on;
    this._applyWireframe();
    return { ok: true, wireframe: this.wireframe };
  }

  _applyWireframe() {
    this._model?.traverse?.((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m && 'wireframe' in m) m.wireframe = this.wireframe;
      }
    });
  }

  // ================================================================== views

  /**
   * Select `id` (when given) and return the canonical acceptance views. The
   * screenshot tool walks the list, calls `showView(i)` and captures a frame.
   */
  captureViews(id = null) {
    if (!this.visible) this.open(id);
    else if (id) this.select(id);
    const record = assets.get(this.selectedId);
    return {
      ok: !!record,
      id: this.selectedId,
      name: record?.name || null,
      category: record?.category || null,
      views: this._views.map((v, index) => ({
        index,
        name: v.name,
        lighting: v.lighting,
        background: v.background,
        wireframe: v.wireframe,
        description: v.description,
        screenshot: `asset-${String(this.selectedId || 'none').toLowerCase()}-${v.name}.png`,
      })),
    };
  }

  /** Put the camera and the rig on one canonical view, deterministically. */
  showView(nameOrIndex) {
    const view = typeof nameOrIndex === 'number'
      ? this._views[nameOrIndex]
      : this._views.find((v) => v.name === nameOrIndex);
    if (!view) return { ok: false, reason: 'unknown-view', valid: this._views.map((v) => v.name) };
    this.autoRotate = false;
    this.turntable = 0;
    if (this._cradle) this._cradle.rotation.y = 0;
    this.setLighting(view.lighting);
    this.setBackground(view.background);
    this.setWireframe(view.wireframe);
    this.azimuth = view.azimuth;
    this.elevation = view.elevation;
    const base = this._frameDistance || 2.2;
    // The view distance is a multiplier on the framed distance so a keyboard
    // and a filing cabinet both fill a comparable share of the frame.
    this.distance = THREE.MathUtils.clamp(base * (view.distance / 2.2), 0.2, 24);
    this._applyCamera();
    this._currentView = view.name;
    this._renderMeta(assets.get(this.selectedId));
    return {
      ok: true,
      view: view.name,
      id: this.selectedId,
      distance: r3(this.distance),
      azimuth: r3(this.azimuth),
      elevation: r3(this.elevation),
      lighting: this.lightingMode,
      background: this.background,
    };
  }

  // ================================================================== frame

  update(dt) {
    if (!this.visible) return;
    const step = Number.isFinite(dt) ? dt : 0;
    if (this.autoRotate && this._cradle) {
      this.turntable += step * 0.42;
      this._cradle.rotation.y = this.turntable;
    }
    this._applyCamera();
  }

  // ================================================================== state

  state() {
    const record = assets.get(this.selectedId);
    return {
      visible: this.visible,
      selected: this.selectedId,
      record: record ? { ...record } : null,
      stats: this._modelStats,
      lighting: this.lightingMode,
      background: this.background,
      wireframe: this.wireframe,
      autoRotate: this.autoRotate,
      view: this._currentView,
      camera: {
        distance: r3(this.distance), azimuth: r3(this.azimuth), elevation: r3(this.elevation),
      },
      filter: { ...this.filter },
      matches: this.records().length,
      total: assets.list().length,
      categories: assets.categories(),
      owners: Array.from(new Set(assets.list().map((r) => r.owner))).sort(),
      statuses: Array.from(new Set(assets.list().map((r) => r.status))).sort(),
      discrepancy: this._discrepancy(record),
      buildErrors: this._buildErrors.slice(),
    };
  }

  /** Declared dims versus what the builder actually produced. */
  _discrepancy(record) {
    const stats = this._modelStats;
    if (!record || !stats || stats.proxy || !stats.measured || !record.dims) return null;
    const [dw, dh, dd] = record.dims;
    const [mw, mh, md] = stats.measured;
    const worst = Math.max(
      Math.abs(mw - dw) / Math.max(0.02, dw),
      Math.abs(mh - dh) / Math.max(0.02, dh),
      Math.abs(md - dd) / Math.max(0.02, dd)
    );
    return {
      declared: [dw, dh, dd],
      measured: [mw, mh, md],
      worstRelativeError: r3(worst),
      baseOffset: stats.baseY,
      restsOnFloor: Math.abs(stats.baseY) < 0.02,
      withinTolerance: worst <= 0.2,
    };
  }

  // ================================================================== DOM

  _ensureDom() {
    if (this._dom) return this._dom;
    if (typeof document === 'undefined') return null;
    const host = document.getElementById('app') || document.body;

    let root = document.getElementById('asset-gallery');
    if (!root) {
      root = document.createElement('div');
      root.id = 'asset-gallery';
      host.appendChild(root);
    }
    root.replaceChildren();
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Asset gallery');

    const head = document.createElement('div');
    head.className = 'gallery-head';

    const title = document.createElement('strong');
    title.textContent = 'ASSET GALLERY';

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'search id / name / room';
    search.id = 'gallery-search';
    search.addEventListener('input', () => this.setFilter({ search: search.value }));

    const select = (id, label, values) => {
      const s = document.createElement('select');
      s.id = id;
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = label;
      s.appendChild(blank);
      for (const v of values) {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = v;
        s.appendChild(o);
      }
      return s;
    };

    const all = assets.list();
    const category = select('gallery-category', 'all categories', assets.categories());
    category.addEventListener('change', () => this.setFilter({ category: category.value }));
    const owner = select('gallery-owner', 'all owners', Array.from(new Set(all.map((r) => r.owner))).sort());
    owner.addEventListener('change', () => this.setFilter({ owner: owner.value }));
    const status = select('gallery-status', 'all statuses', Array.from(new Set(all.map((r) => r.status))).sort());
    status.addEventListener('change', () => this.setFilter({ status: status.value }));

    const buttons = document.createElement('div');
    buttons.className = 'gallery-controls';
    const btn = (label, fn, id) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (id) b.id = id;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      });
      buttons.appendChild(b);
      return b;
    };
    btn('lighting', () => this.setLighting(this.lightingMode === 'neutral' ? 'production' : 'neutral'), 'gallery-lighting');
    btn('background', () => this.cycleBackground(), 'gallery-background');
    btn('wireframe', () => this.setWireframe(!this.wireframe), 'gallery-wireframe');
    btn('spin', () => this.setAutoRotate(!this.autoRotate), 'gallery-spin');
    btn('close', () => this.close(), 'gallery-close');

    head.append(title, search, category, owner, status, buttons);

    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flex = '1';
    body.style.gap = '12px';
    body.style.minHeight = '0';

    const list = document.createElement('div');
    list.className = 'gallery-list';
    list.id = 'gallery-list';

    const meta = document.createElement('pre');
    meta.id = 'gallery-meta';
    meta.style.width = '360px';
    meta.style.flex = '0 0 360px';
    meta.style.overflowY = 'auto';
    meta.style.margin = '0';
    meta.style.font = '11px/1.5 var(--font-mono)';
    meta.style.color = '#b9cdd9';
    meta.style.whiteSpace = 'pre-wrap';

    body.append(list, meta);
    root.append(head, body);

    root.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(e.deltaY > 0 ? 1.12 : 0.89);
    }, { passive: false });

    root.addEventListener('pointerdown', (e) => {
      if (e.target !== root && e.target !== body && e.target !== meta) return;
      this._drag = { x: e.clientX, y: e.clientY };
    });
    root.addEventListener('pointermove', (e) => {
      if (!this._drag) return;
      const dx = e.clientX - this._drag.x;
      const dy = e.clientY - this._drag.y;
      this._drag = { x: e.clientX, y: e.clientY };
      this.autoRotate = false;
      this.orbit(-dx * 0.006, dy * 0.005);
    });
    const endDrag = () => { this._drag = null; };
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointerleave', endDrag);

    this._dom = { root, head, list, meta, search, category, owner, status };
    this._installKeys();
    return this._dom;
  }

  _installKeys() {
    if (this._keysBound) return;
    this._keysBound = true;
    globalThis.addEventListener?.('keydown', (e) => {
      if (!this.visible) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.code) {
        case 'ArrowLeft': this.autoRotate = false; this.orbit(-0.12, 0); break;
        case 'ArrowRight': this.autoRotate = false; this.orbit(0.12, 0); break;
        case 'ArrowUp': this.autoRotate = false; this.orbit(0, 0.08); break;
        case 'ArrowDown': this.autoRotate = false; this.orbit(0, -0.08); break;
        case 'Equal': case 'NumpadAdd': this.zoom(0.85); break;
        case 'Minus': case 'NumpadSubtract': this.zoom(1.18); break;
        case 'KeyW': this.setWireframe(!this.wireframe); break;
        case 'KeyL': this.setLighting(this.lightingMode === 'neutral' ? 'production' : 'neutral'); break;
        case 'KeyB': this.cycleBackground(); break;
        case 'KeyR': this.setAutoRotate(!this.autoRotate); break;
        default: return;
      }
      e.preventDefault();
    }, { passive: false });
  }

  _renderList() {
    const dom = this._dom;
    if (!dom) return;
    const frag = document.createDocumentFragment();
    for (const rec of this.records()) {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.dataset.assetId = rec.id;
      if (rec.id === this.selectedId) card.classList.add('active');
      const gid = document.createElement('div');
      gid.className = 'gid';
      gid.textContent = rec.id;
      const name = document.createElement('div');
      name.className = 'gname';
      name.textContent = rec.name;
      const meta = document.createElement('div');
      meta.className = 'gmeta';
      const dims = (rec.dims || []).map((n) => Number(n).toFixed(2)).join(' × ');
      meta.textContent = `${rec.category} · ${rec.owner} · ${dims} m · ${assets.countInstances(rec.id)}×`;
      const status = document.createElement('div');
      status.className = `gstatus ${rec.status}`;
      status.textContent = rec.status;
      card.append(gid, name, meta, status);
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select(rec.id);
      });
      frag.appendChild(card);
    }
    dom.list.replaceChildren(frag);
  }

  _renderMeta(record) {
    const dom = this._dom;
    if (!dom) return;
    if (!record) {
      dom.meta.textContent = 'No asset selected.';
      return;
    }
    const stats = this._modelStats;
    const disc = this._discrepancy(record);
    const line = (k, v) => `${k.padEnd(13)} ${v}`;
    const out = [
      record.id,
      record.name,
      '',
      line('category', record.category),
      line('owner', record.owner),
      line('status', record.status),
      line('rooms', (record.rooms || []).join(', ') || '—'),
      line('files', (record.files || []).join('\n              ') || '—'),
      '',
      line('dims (m)', (record.dims || []).map((n) => Number(n).toFixed(3)).join(' × ')),
      line('pivot', record.pivot || '—'),
      line('materials', (record.materials || []).join(', ') || '—'),
      line('textures', (record.textures || []).join(', ') || '—'),
      line('collision', record.collision || '—'),
      line('lod', record.lod || '—'),
      line('anims', (record.anims || []).join(', ') || '—'),
      line('audio', (record.audio || []).join(', ') || '—'),
      line('instances', String(assets.countInstances(record.id))),
      '',
      'ACCEPTANCE',
      record.acceptance || '—',
      '',
      'EVIDENCE',
      record.evidence || '—',
      '',
      'DISCREPANCIES',
      record.discrepancies || 'none',
      '',
      'MEASURED',
    ];
    if (!stats) {
      out.push('not built');
    } else if (stats.buildFailed) {
      out.push('BUILD FAILED — see console');
    } else {
      out.push(line('source', stats.source));
      out.push(line('meshes', String(stats.meshes)));
      out.push(line('triangles', String(stats.triangles)));
      out.push(line('bbox (m)', (stats.measured || []).join(' × ')));
      out.push(line('base y', String(stats.baseY)));
      out.push(line('mat slots', (stats.runtimeMaterials || []).join(', ') || '—'));
      out.push(line('tex slots', (stats.runtimeTextureSlots || []).join(', ') || '—'));
      if (stats.proxy) out.push('proxy stand-in: no standalone builder for this record');
    }
    if (disc) {
      out.push('');
      out.push(line('dim error', `${(disc.worstRelativeError * 100).toFixed(1)}% (${disc.withinTolerance ? 'within' : 'OUT OF'} tolerance)`));
      out.push(line('rests on 0', String(disc.restsOnFloor)));
    }
    out.push('');
    out.push(`view: ${this._currentView || 'free'} · ${this.lightingMode} light · ${this.background} bg${this.wireframe ? ' · wireframe' : ''}`);
    out.push('keys: arrows orbit · +/- zoom · W wire · L light · B bg · R spin · Esc close');
    dom.meta.textContent = out.join('\n');
  }
}

export default AssetGallery;
