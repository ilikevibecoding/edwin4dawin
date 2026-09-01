import * as THREE from 'three';

/**
 * The level. STUB — the real Seaside plaza map is built in src/world/* by the environment team.
 *
 * Required interface (consumed by other systems):
 *   async load()
 *   getPlayerSpawn()      -> { position: Vector3 (feet), yaw: radians }
 *   getEnemySpawns()      -> [{ position: Vector3, yaw }]   (several, spread around the map edges)
 *   getNavGraph()         -> { nodes: [{ id, position: Vector3, cover: bool }], edges: [[idA, idB], ...] }
 *   getObjective()        -> { name: 'B', position: Vector3, radius: number }
 *   getBounds()           -> THREE.Box3 playable area
 *   getMinimap()          -> { center: Vector3, size: number (meters, square), image: HTMLCanvasElement|null }
 *   getGroundHeight(x, z) -> number
 *   root                  -> THREE.Group containing all static geometry
 *
 * Every static mesh must be registered with physics (game.physics.addStaticMesh / addStaticBox) with a
 * user-data `surface` of: 'stone' | 'plaster' | 'brick' | 'wood' | 'metal' | 'dirt' | 'glass' | 'foliage' | 'water'.
 */
export class World {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    this.root.name = 'World';
    game.scene.add(this.root);
    this.size = 80;
    this._spawns = [];
    this._nav = { nodes: [], edges: [] };
  }

  async load() {
    const { assets, physics } = this.game;
    const s = this.size;

    // Ground
    const groundMat = assets.createPBRMaterial('pavement_01', { repeat: [s / 3, s / 3], roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(s, s, 1, 1), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'Ground';
    this.root.add(ground);
    physics.addStaticBox(new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(s / 2, 0.5, s / 2), null, { surface: 'stone' });

    // Placeholder buildings around the plaza
    const wallMat = assets.createPBRMaterial('painted_plaster_wall', { repeat: [3, 2], roughness: 1 });
    const stoneMat = assets.createPBRMaterial('medieval_blocks_03', { repeat: [2, 2], roughness: 1 });
    const blocks = [
      [-22, 0, -22, 14, 9, 10], [0, 0, -26, 16, 12, 8], [22, 0, -22, 12, 8, 12],
      [-26, 0, 0, 8, 10, 18], [26, 0, 2, 8, 11, 16],
      [-20, 0, 24, 14, 8, 8], [18, 0, 25, 18, 9, 8],
      [6, 0, 4, 2, 2.5, 2], [-6, 0, -4, 2, 2.5, 2],
    ];
    blocks.forEach(([x, y, z, w, h, d], i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i % 3 === 0 ? stoneMat : wallMat);
      mesh.position.set(x, y + h / 2, z);
      mesh.castShadow = mesh.receiveShadow = true;
      this.root.add(mesh);
      physics.addStaticBox(mesh.position, new THREE.Vector3(w / 2, h / 2, d / 2), null, { surface: i % 3 === 0 ? 'stone' : 'plaster' });
    });

    // Spawns & nav
    this._playerSpawn = { position: new THREE.Vector3(0, 0, 18), yaw: 0 };
    this._spawns = [
      { position: new THREE.Vector3(-14, 0, -14), yaw: Math.PI },
      { position: new THREE.Vector3(14, 0, -12), yaw: Math.PI },
      { position: new THREE.Vector3(-18, 0, 8), yaw: Math.PI / 2 },
      { position: new THREE.Vector3(18, 0, 12), yaw: -Math.PI / 2 },
    ];
    const nodes = [];
    for (let x = -18; x <= 18; x += 6) for (let z = -18; z <= 18; z += 6) nodes.push({ id: nodes.length, position: new THREE.Vector3(x, 0, z), cover: false });
    const edges = [];
    const cols = 7;
    for (let i = 0; i < nodes.length; i++) {
      if ((i + 1) % cols !== 0) edges.push([i, i + 1]);
      if (i + cols < nodes.length) edges.push([i, i + cols]);
    }
    this._nav = { nodes, edges };
  }

  getPlayerSpawn() { return this._playerSpawn; }
  getEnemySpawns() { return this._spawns; }
  getNavGraph() { return this._nav; }
  getObjective() { return { name: 'B', position: new THREE.Vector3(0, 0, 0), radius: 5 }; }
  getBounds() { return new THREE.Box3(new THREE.Vector3(-this.size / 2, -1, -this.size / 2), new THREE.Vector3(this.size / 2, 30, this.size / 2)); }
  getMinimap() { return { center: new THREE.Vector3(0, 0, 0), size: this.size, image: null }; }
  getGroundHeight() { return 0; }
}
