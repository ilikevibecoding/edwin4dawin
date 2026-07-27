import * as THREE from 'three';
import { Colliders } from './colliders.js';
import { NavGrid } from './navgrid.js';
import { Buckets } from './geo.js';
import { setupMaterials } from './materials.js';
import { buildStreets, L } from './streets.js';
import { buildBuildings } from './buildings.js';
import { buildProps } from './props.js';
import { Atmosphere } from './atmosphere.js';

/**
 * World: war-torn Middle-Eastern urban district at golden hour.
 * Contract for other systems:
 *   world.colliders  — Colliders (capsuleMove/raycast/clearLine)
 *   world.navgrid    — NavGrid (findPath/randomPoint/nearestWalkable/isWalkable)
 *   world.playerSpawns / world.enemySpawns — Vector3[]
 *   world.bounds     — { half: number }
 *   world.update(dt)
 * Registers screenshot poses in game.poses.
 */
export class World {
  constructor(game) {
    this.game = game;
    this.colliders = new Colliders();
    this.navgrid = new NavGrid(80, 1);
    this.playerSpawns = [new THREE.Vector3(0, 0.1, 63)];
    this.enemySpawns = [];
    this.bounds = { half: L.HALF };
    this.group = new THREE.Group();
    game.scene.add(this.group);
  }

  async load() {
    const { assets, scene } = this.game;

    // --- sky + IBL ---------------------------------------------------------
    const hdr = await assets.hdr('/assets/hdri/sunset.hdr');
    scene.environment = hdr;
    scene.background = hdr;
    scene.backgroundIntensity = 1.0;
    scene.environmentIntensity = 0.52;

    // --- sun (matches HDRI) --------------------------------------------------
    const sunDir = new THREE.Vector3(-0.55, 0.32, -0.77).normalize();
    const sun = new THREE.DirectionalLight(0xffbe85, 4.4);
    sun.position.copy(sunDir).multiplyScalar(130);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 340;
    const S = 105;
    sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
    sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.035;
    scene.add(sun, sun.target);
    this.sun = sun;

    // hemisphere: cool sky term over a distinctly WARM sun-baked ground bounce
    // so shadow sides pick up orange fill from below instead of flat blue-gray
    const hemi = new THREE.HemisphereLight(0xa4a2ac, 0x91683e, 0.72);
    scene.add(hemi);
    // warm bounce fill from the opposite side (fakes GI off lit walls) — kept
    // moderate so shaded facades stay a step darker than the hazy sky
    const fill = new THREE.DirectionalLight(0xd8935c, 0.55);
    fill.position.set(-sunDir.x * 80, 22, -sunDir.z * 80);
    scene.add(fill, fill.target);

    // --- fog: warm dust haze ---------------------------------------------------
    scene.fog = new THREE.FogExp2(0xd8a878, 0.0048);

    // --- post tuning -------------------------------------------------------------
    const eng = this.game.engine;
    eng.setExposure(1.12);
    eng.bloom.intensity = 0.62;
    eng.n8ao.configuration.aoRadius = 1.8;
    eng.n8ao.configuration.intensity = 2.4;
    eng.n8ao.configuration.distanceFalloff = 2.2;
    eng.grain.blendMode.opacity.value = 0.045;
    try { eng.colorGrade.saturation = 0.15; } catch { /* accessor may not exist */ }
    try { eng.vignette.darkness = 0.5; } catch { /* accessor may not exist */ }

    // --- build the city -----------------------------------------------------------
    const buckets = new Buckets();
    const tex = setupMaterials(this.game, buckets);

    const ctx = {
      game: this.game,
      group: this.group,
      buckets,
      colliders: this.colliders,
      navgrid: this.navgrid,
      addBoxCollider: (x, y, z, w, h, d, ry = 0, surface = 'concrete') => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
        m.position.set(x, y, z);
        m.rotation.y = ry;
        m.visible = false;
        this.group.add(m);
        this.colliders.add(m, surface);
      },
    };

    buildStreets(ctx);
    const bres = buildBuildings(ctx);
    buildProps(ctx, bres);
    this.atmosphere = new Atmosphere(this.game, tex);

    // outer apron so the horizon floor never shows raw void
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshStandardMaterial({ ...assets.pbr('gravel_concrete', [46, 46]), color: 0xa38f70, roughness: 1 })
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.12;
    apron.receiveShadow = true;
    this.group.add(apron);

    // merge all static geometry
    const meshes = buckets.build(this.group);

    // colliders: ground + concrete details; buildings/props use box proxies
    const surfaceOf = {
      asphalt: 'concrete', sidewalk: 'concrete', plaza: 'concrete', dirt: 'dirt',
      trim: 'concrete', slab: 'concrete', hesco: 'dirt',
    };
    for (const [name, surf] of Object.entries(surfaceOf)) {
      if (meshes[name]) this.colliders.add(meshes[name], surf);
    }

    // boundary walls (invisible)
    const H = L.HALF;
    for (const [x, z, w, d] of [
      [0, -H - 1.2, H * 2 + 10, 2], [0, H + 1.2, H * 2 + 10, 2],
      [-H - 1.2, 0, 2, H * 2 + 10], [H + 1.2, 0, 2, H * 2 + 10],
    ]) {
      ctx.addBoxCollider(x, 15, z, w, 30, d, 0, 'concrete');
      this.navgrid.blockRect(x, z, w + 2, d + 2);
    }

    this.colliders.build();

    // --- spawns --------------------------------------------------------------------
    const P = (x, z) => {
      const w = this.navgrid.nearestWalkable(x, z, 16);
      return new THREE.Vector3(w.x, 0.1, w.z);
    };
    this.playerSpawns = [P(0.5, 63), P(-47, 55), P(47, -55), P(-60, -5)];
    const enemyPts = [
      [0, -32], [4, 16], [-25, 3.5], [25, 3], [47, -25], [-47, -18],
      [-47, 36], [47, 36], [-18, 22], [-30, 47], [25, -46.5], [-25, -47],
      [25.5, -22], [-26, -23], [26, 33], [-33, 24.5], [0, 47], [60, 8],
    ];
    this.enemySpawns = enemyPts.map(([x, z]) => P(x, z).setY(0));

    // --- screenshot poses --------------------------------------------------------------
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    this.game.poses = {
      spawn:      { position: V(0.6, 0.07, 63), yaw: 0.03, pitch: 0.0 },
      street:     { position: V(-5.2, 0.07, 48), yaw: -0.07, pitch: 0.012 },
      crossroads: { position: V(8.2, 0.07, 10.5), yaw: 0.48, pitch: 0.02 },
      alley:      { position: V(12.2, 0.07, 29.3), yaw: -Math.PI / 2 + 0.06, pitch: 0.03 },
      sunward:    { position: V(27, 0.07, 3.6), yaw: 0.62, pitch: 0.055 },
      overview:   { position: V(19.2, 19.36, 40.4), yaw: 0.61, pitch: -0.28 },
      ads:        { position: V(0.6, 0.07, 52), yaw: 0.01, pitch: 0.008, aim: true },
      plaza:      { position: V(-15.8, 0.09, 30.5), yaw: 0.49, pitch: 0.02 },
      rubble:     { position: V(4, 0.07, -4), yaw: -0.93, pitch: 0.12 },
      checkpoint: { position: V(1, 0.07, 20), yaw: Math.PI + 0.12, pitch: 0.015 },
      market:     { position: V(-24.5, 0.09, 20), yaw: -1.5, pitch: 0.01 },
    };
  }

  update(dt) {
    this.atmosphere?.update(dt);
  }
}
