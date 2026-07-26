import * as THREE from 'three';
import { Colliders } from './colliders.js';
import { NavGrid } from './navgrid.js';
import { rand, randRange, randPick } from '../core/rand.js';

/**
 * World: level geometry, lighting, sky, collision, navigation.
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
    this.navgrid = new NavGrid(90, 1);
    this.playerSpawns = [new THREE.Vector3(0, 0, 38)];
    this.enemySpawns = [];
    this.bounds = { half: 88 };
    this.group = new THREE.Group();
    game.scene.add(this.group);
  }

  async load() {
    const { assets, scene, camera } = this.game;

    // --- sky + IBL ---------------------------------------------------------
    const hdr = await assets.hdr('/assets/hdri/sunset.hdr');
    scene.environment = hdr;
    scene.background = hdr;
    scene.backgroundIntensity = 1.0;
    scene.environmentIntensity = 0.55;

    // --- sun ---------------------------------------------------------------
    const sunDir = new THREE.Vector3(-0.55, 0.32, -0.77).normalize(); // matches HDRI sun
    const sun = new THREE.DirectionalLight(0xffd9ad, 3.4);
    sun.position.copy(sunDir).multiplyScalar(120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 320;
    const S = 95;
    sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
    sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    this.sun = sun;

    const hemi = new THREE.HemisphereLight(0x8fa3bf, 0x51443a, 0.5);
    scene.add(hemi);

    // --- fog ---------------------------------------------------------------
    scene.fog = new THREE.FogExp2(0xc7a97f, 0.0045);

    // --- ground -------------------------------------------------------------
    const asphalt = assets.pbr('asphalt', [26, 26]);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220, 1, 1),
      new THREE.MeshStandardMaterial({ ...asphalt, roughness: 1.0, color: 0xb0aca6 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.surface = 'concrete';
    this.group.add(ground);
    this.colliders.add(ground, 'concrete');

    // --- buildings -----------------------------------------------------------
    const wallSets = [
      { pbr: assets.pbr('concrete_wall', [3, 2]), color: 0xcfc9bd },
      { pbr: assets.pbr('plaster_painted', [3, 2]), color: 0xd8cfb8 },
      { pbr: assets.pbr('brick', [4, 2.6]), color: 0xc9b8a4 },
      { pbr: assets.pbr('concrete_wall_2', [3, 2]), color: 0xbfb9ae },
    ];

    const lots = [];
    const streetHalf = 7;
    const block = 26;
    for (let bx = -2; bx <= 2; bx++) {
      for (let bz = -2; bz <= 2; bz++) {
        if (bx === 0 || bz === 0) continue; // streets on axes
        if (Math.abs(bx) === 2 && Math.abs(bz) === 2 && rand() < 0.4) continue;
        lots.push([bx, bz]);
      }
    }
    for (const [bx, bz] of lots) {
      const cx = Math.sign(bx) * (streetHalf + block / 2) + (Math.abs(bx) - 1) * Math.sign(bx) * (block + 5);
      const cz = Math.sign(bz) * (streetHalf + block / 2) + (Math.abs(bz) - 1) * Math.sign(bz) * (block + 5);
      const w = randRange(14, block - 3);
      const d = randRange(14, block - 3);
      const floors = Math.round(randRange(2, 5));
      const h = floors * 3.2 + randRange(0, 1);
      const set = randPick(wallSets);
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ ...set.pbr, color: set.color, roughness: 0.95 })
      );
      b.position.set(cx, h / 2, cz);
      b.castShadow = b.receiveShadow = true;
      this.group.add(b);
      this.colliders.add(b, 'concrete');
      this.navgrid.blockRect(cx, cz, w, d);
    }

    // --- props: containers + barriers ---------------------------------------
    const metal = assets.pbr('corrugated', [2, 1]);
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(6.06, 2.59, 2.44),
        new THREE.MeshStandardMaterial({ ...metal, color: randPick([0x7d3a2b, 0x2e4d5c, 0x5a5f4a, 0x84683a]), roughness: 0.8, metalness: 0.25 })
      );
      const onX = rand() < 0.5;
      const along = randRange(-70, 70);
      const off = randRange(-4.5, 4.5);
      c.position.set(onX ? along : off, 1.295, onX ? off : along);
      c.rotation.y = (onX ? 0 : Math.PI / 2) + randRange(-0.12, 0.12);
      c.castShadow = c.receiveShadow = true;
      this.group.add(c);
      this.colliders.add(c, 'metal');
      this.navgrid.blockRect(c.position.x, c.position.z, onX ? 6.4 : 2.8, onX ? 2.8 : 6.4);
    }
    const concrete = assets.pbr('concrete_floor', [1, 0.5]);
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.1, 0.5),
        new THREE.MeshStandardMaterial({ ...concrete, color: 0xd0cdc7, roughness: 1 })
      );
      const onX = rand() < 0.5;
      const along = randRange(-60, 60);
      const off = randRange(-5, 5);
      b.position.set(onX ? along : off, 0.55, onX ? off : along);
      b.rotation.y = onX ? randRange(-0.2, 0.2) : Math.PI / 2 + randRange(-0.2, 0.2);
      b.castShadow = b.receiveShadow = true;
      this.group.add(b);
      this.colliders.add(b, 'concrete');
      this.navgrid.blockRect(b.position.x, b.position.z, onX ? 2.6 : 0.8, onX ? 0.8 : 2.6);
    }

    this.colliders.build();

    // --- spawns --------------------------------------------------------------
    this.playerSpawns = [
      new THREE.Vector3(0, 0, 55),
      new THREE.Vector3(3, 0, -55),
      new THREE.Vector3(55, 0, 2),
    ];
    for (let i = 0; i < 12; i++) this.enemySpawns.push(this.navgrid.randomPoint(0, 0, 70));

    // --- screenshot poses ------------------------------------------------------
    this.game.poses = {
      spawn:    { position: new THREE.Vector3(0, 0, 55), yaw: Math.PI, pitch: 0 },
      street:   { position: new THREE.Vector3(0, 0, 40), yaw: Math.PI, pitch: 0.02 },
      crossroads: { position: new THREE.Vector3(2, 0, 4), yaw: -Math.PI * 0.75, pitch: 0 },
      alley:    { position: new THREE.Vector3(34, 0, 18), yaw: Math.PI / 2, pitch: 0.05 },
      sunward:  { position: new THREE.Vector3(10, 0, 10), yaw: Math.PI * 0.42, pitch: -0.02 },
      overview: { position: new THREE.Vector3(-40, 24, 46), yaw: -Math.PI / 4, pitch: -0.35 },
      ads:      { position: new THREE.Vector3(0, 0, 40), yaw: Math.PI, pitch: 0.01, aim: true },
    };
  }

  update(dt) {}
}
