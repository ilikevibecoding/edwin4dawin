import * as THREE from 'three';
import { MaterialLib } from './materials.js';
import { Batcher } from './geo.js';
import { buildGround } from './Ground.js';
import { buildBuilding } from './BuildingGenerator.js';
import { buildFountain } from './Fountain.js';
import { buildFences } from './Fences.js';
import { buildProps } from './Props.js';
import { buildTrees } from './Trees.js';
import { buildIvy } from './Ivy.js';
import { buildStringLights } from './StringLights.js';
import { buildBackdrop } from './Backdrop.js';
import { buildNavGraph } from './NavGraph.js';
import { renderMinimap } from './Minimap.js';
import { BUILDINGS, PLAYER_SPAWN, OBJECTIVE, BOUNDS } from './layout.js';
import { makeRng, yawToward } from './util.js';

/**
 * Seaside Strike — the Mediterranean plaza map.
 *
 * Public interface (consumed by other systems):
 *   async load()
 *   getPlayerSpawn()      -> { position: Vector3 (feet), yaw: radians }
 *   getEnemySpawns()      -> [{ position: Vector3, yaw }]
 *   getNavGraph()         -> { nodes: [{ id, position: Vector3, cover: bool }], edges: [[idA, idB], ...] }
 *   getObjective()        -> { name: 'B', position: Vector3, radius: number }
 *   getBounds()           -> THREE.Box3 playable area
 *   getMinimap()          -> { center: Vector3, size: number (meters, square), image: HTMLCanvasElement|null }
 *   getGroundHeight(x, z) -> number
 *   root                  -> THREE.Group containing all static geometry
 *
 * Layout lives in layout.js; each feature has its own builder module. All static geometry is merged per
 * material through the Batcher (one draw call per material); repeated items use InstancedMesh.
 */
export class World {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    this.root.name = 'World';
    game.scene.add(this.root);

    this._playerSpawn = { position: new THREE.Vector3(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z), yaw: PLAYER_SPAWN.yaw };
    this._objective = { name: 'B', position: new THREE.Vector3(OBJECTIVE.x, 0, OBJECTIVE.z), radius: OBJECTIVE.r };
    this._bounds = new THREE.Box3(new THREE.Vector3(BOUNDS.x0, -1, BOUNDS.z0), new THREE.Vector3(BOUNDS.x1, 40, BOUNDS.z1));
    this._spawns = [];
    this._nav = { nodes: [], edges: [] };
    this._minimap = { center: new THREE.Vector3(4, 0, -1), size: 110, image: null };
    this._down = new THREE.Vector3(0, -1, 0);
    this._tmp = new THREE.Vector3();
    this.stats = { colliders: 0, meshes: 0, triangles: 0, navNodes: 0, navEdges: 0 };

    if (game.debug) this._registerViews();
    else game.events.on('game:ready', () => this._registerViews());
  }

  async load() {
    const t0 = performance.now();
    const { game } = this;
    this.mats = new MaterialLib(game);
    this.rng = makeRng(20260901);
    this.batch = new Batcher({ cell: 64 });
    this._colliders = [];

    const ctx = {
      game,
      mats: this.mats,
      rng: this.rng,
      batch: this.batch,
      root: this.root,
      addBoxCollider: (cx, cy, cz, hx, hy, hz, surface = 'stone', quat = null) =>
        this._colliders.push({ center: new THREE.Vector3(cx, cy, cz), half: new THREE.Vector3(hx, hy, hz), quat, surface }),
    };
    this._ctx = ctx;

    this._placeSun();

    // --- Static architecture (batched per material) ------------------------------------------
    buildGround(ctx);
    for (const spec of BUILDINGS) {
      const res = buildBuilding(ctx, spec);
      for (const c of res.colliders) this._colliders.push(c);
    }
    buildFountain(ctx);
    buildFences(ctx);
    buildTrees(ctx);
    buildIvy(ctx);
    buildStringLights(ctx);
    buildBackdrop(ctx);

    // Props: Poly Haven models load async; generated clutter (planters, sandbags, barriers) is batched.
    await buildProps(ctx);

    const meshes = this.batch.build(this.root, { name: 'Static' });
    this.stats.meshes = meshes.length;

    // --- Physics -------------------------------------------------------------------------------
    for (const c of this._colliders) game.physics.addStaticBox(c.center, c.half, c.quat || null, { surface: c.surface });
    this._addBoundaries();
    this.stats.colliders = this._colliders.length;

    this._setupSpawns();
    // Rapier only indexes new colliders for scene queries at the next step; nothing dynamic exists yet,
    // so a single zero-consequence step makes the raycast-validated nav graph (and getGroundHeight) work now.
    game.physics.world?.step?.();
    this._nav = buildNavGraph(game, { step: 4 });
    this.stats.navNodes = this._nav.nodes.length;
    this.stats.navEdges = this._nav.edges.length;

    // --- Rendering registration + minimap -----------------------------------------------------
    await this.mats.ready();
    game.render.setupObject(this.root);
    this.stats.triangles = this._countTriangles();

    try {
      this._minimap = renderMinimap(game, this.root, { center: this._minimap.center, size: this._minimap.size, sunDirection: game.render?.sunDirection });
    } catch (err) {
      console.warn('[world] minimap unavailable:', err);
    }

    console.info(
      `[world] built in ${(performance.now() - t0).toFixed(0)} ms — ${meshes.length} static meshes, ${this.stats.colliders} box colliders, ` +
        `${(this.stats.triangles / 1000).toFixed(0)}k triangles (pre-shadow), nav ${this.stats.navNodes} nodes / ${this.stats.navEdges} edges`,
    );
  }

  _countTriangles() {
    let tris = 0;
    this.root.traverse((o) => {
      if (o.isMesh && o.geometry) {
        const g = o.geometry;
        const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        tris += n * (o.isInstancedMesh ? o.count : 1);
      }
    });
    return tris;
  }

  /**
   * Rotate the sky so the sun sits high behind-left of the player spawn (south-west), lighting the
   * north-row facades that face the camera. Honors an explicit ?skyYaw= override from the render team.
   */
  _placeSun() {
    const { render, settings } = this.game;
    if (!render?.setSkyRotation || settings.params.has('skyYaw')) return;
    const base = render._baseSunDirection || render.sunDirection;
    const targetAz = Math.atan2(-0.62, 0.5); // toward -X (west) and +Z (south)
    const baseAz = Math.atan2(base.x, base.z);
    render.setSkyRotation(targetAz - baseAz);
  }

  /** Invisible volumes that close the streets a few meters past the last facades. */
  _addBoundaries() {
    const { physics } = this.game;
    const wall = (cx, cz, hx, hz) => physics.addStaticBox(new THREE.Vector3(cx, 5, cz), new THREE.Vector3(hx, 5, hz), null, { surface: 'stone', boundary: true });
    // North backline (either side of the NE street; closes the NW alley end), NE street end.
    wall((-60 + 11.4) / 2, -30.5, (11.4 + 60) / 2, 0.3);
    wall((18.4 + 60) / 2, -30.5, (60 - 18.4) / 2, 0.3);
    wall(15, -41.5, 4, 0.3);
    // West backline + W street end.
    wall(-38.5, (-60 - 9.5) / 2, 0.3, (60 - 9.5) / 2);
    wall(-38.5, (-4.3 + 60) / 2, 0.3, (60 + 4.3) / 2);
    wall(-47.5, -6.9, 0.3, 4);
    // South backline + S street end.
    wall((-60 - 4.7) / 2, 36.5, (60 - 4.7) / 2, 0.3);
    wall((4.7 + 60) / 2, 36.5, (60 - 4.7) / 2, 0.3);
    wall(0, 47.5, 4, 0.3);
    // East backline + E street end.
    wall(46.5, (-60 - 1) / 2, 0.3, (60 - 1) / 2);
    wall(46.5, (3.6 + 60) / 2, 0.3, (60 - 3.6) / 2);
    wall(55, 1.3, 0.3, 4);
  }

  /** Enemy spawns around the edges / in the streets, none in the spawn's direct line of sight. */
  _setupSpawns() {
    const pts = [
      [-11.9, -26], // NW alley
      [14.9, -36], // NE street, behind the sandbags at the mouth
      [-38, -6.9], // W street end
      [24, -14], // garden north, behind the fence + shrubs
      [30, 14], // garden south
      [50, 1.3], // E street
      [-22, 21], // SW corner behind the café planters
      [0, 40], // S street
    ];
    this._spawns = pts.map(([x, z]) => ({ position: new THREE.Vector3(x, 0, z), yaw: yawToward(x, z, 0, 0) }));
  }

  _registerViews() {
    const d = this.game.debug;
    if (!d?.registerView) return;
    d.registerView('plaza_wide', { pos: [PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z], yaw: 0, pitch: 3 });
    d.registerView('fountain', { pos: [-3, 0, 6], yaw: 45, pitch: 10 });
    d.registerView('facade_detail', { pos: [6.2, 0.15, -14.2], yaw: 0, pitch: 24 });
    d.registerView('street', { pos: [14.9, 0, -14], yaw: 0, pitch: 2 });
    d.registerView('balcony_view', { pos: [-2.8, 3.46, -17.2], yaw: 180, pitch: -10 }); // between two loggia posts
    d.registerView('skyline', { pos: [-20, 0, 18], yaw: -40, pitch: 12 });
    d.registerView('gate', { pos: [12, 0, -3], yaw: -70, pitch: 4 });
    d.registerView('cafe', { pos: [-18, 0, 4], yaw: 80, pitch: 4 });
    d.registerView('west_street', { pos: [-22, 0, -6.9], yaw: 90, pitch: 2 });
  }

  getPlayerSpawn() {
    return this._playerSpawn;
  }
  getEnemySpawns() {
    return this._spawns;
  }
  getNavGraph() {
    return this._nav;
  }
  getObjective() {
    return this._objective;
  }
  getBounds() {
    return this._bounds;
  }
  getMinimap() {
    return this._minimap;
  }
  getGroundHeight(x, z) {
    const physics = this.game.physics;
    if (!physics) return 0;
    const hit = physics.raycast(this._tmp.set(x, 30, z), this._down, 60);
    return hit && hit.data?.type === 'world' ? hit.point.y : 0;
  }
}
