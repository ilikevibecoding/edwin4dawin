import * as THREE from 'three';
import { GROUP } from '../core/Physics.js';

/**
 * Enemy soldiers. STUB — real AI (Soldier.glb, animation, pathing, shooting) lives in src/ai/* (gameplay team).
 *
 * Required interface:
 *   async load()
 *   update(dt)
 *   list -> array of enemy objects: { id, position: Vector3, alive, health, object: Object3D, team }
 *   spawn(spawnPoint) -> enemy
 *   spawnWave(count)
 *   damage(enemy, amount, { point, headshot, source, direction, cause })
 *   aliveCount
 *
 * Each enemy must register physics colliders with user data { type: 'enemy', entity, part: 'head'|'body'|'limb', surface: 'flesh' }
 * using collision membership GROUP.ENEMY so Combat raycasts can resolve hits.
 *
 * Emits: 'enemy:spawned' {enemy}, 'enemy:damaged', 'enemy:killed' (via Combat semantics), 'enemy:fire' { enemy, origin, direction }
 */
export class Enemies {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.list = [];
    this.root = new THREE.Group();
    this.root.name = 'Enemies';
    game.scene.add(this.root);
    this._nextId = 1;
  }

  async load() {}

  get aliveCount() {
    return this.list.filter((e) => e.alive).length;
  }

  spawn(spawnPoint) {
    const { physics } = this.game;
    const pos = spawnPoint.position.clone();
    const object = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.1, 6, 12), new THREE.MeshStandardMaterial({ color: 0x3b3f36, roughness: 0.9 }));
    bodyMesh.position.y = 0.9;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8d6e5a, roughness: 0.8 }));
    headMesh.position.y = 1.68;
    object.add(bodyMesh, headMesh);
    object.position.copy(pos);
    object.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.root.add(object);
    this.game.render.setupObject(object);

    const enemy = { id: this._nextId++, position: pos, alive: true, health: 100, object, team: 'red', colliders: [] };
    const bodyCol = physics.addStaticBox(new THREE.Vector3(pos.x, pos.y + 0.85, pos.z), new THREE.Vector3(0.3, 0.55, 0.3), null, { type: 'enemy', entity: enemy, part: 'body', surface: 'flesh' });
    bodyCol.setCollisionGroups(((GROUP.ENEMY & 0xffff) << 16) | 0xffff);
    const headCol = physics.addStaticBox(new THREE.Vector3(pos.x, pos.y + 1.68, pos.z), new THREE.Vector3(0.14, 0.14, 0.14), null, { type: 'enemy', entity: enemy, part: 'head', surface: 'flesh' });
    headCol.setCollisionGroups(((GROUP.ENEMY & 0xffff) << 16) | 0xffff);
    enemy.colliders.push(bodyCol, headCol);
    this.list.push(enemy);
    this.events.emit('enemy:spawned', { enemy });
    return enemy;
  }

  spawnWave(count = 4) {
    const spawns = this.game.world.getEnemySpawns();
    for (let i = 0; i < count; i++) this.spawn(spawns[i % spawns.length]);
  }

  damage(enemy, amount, { point = null, headshot = false, source = 'player', direction = null, cause = 'bullet' } = {}) {
    if (!enemy.alive) return;
    enemy.health -= amount;
    this.events.emit('enemy:damaged', { enemy, damage: amount, point, headshot, source, direction });
    if (enemy.health <= 0) {
      enemy.alive = false;
      for (const c of enemy.colliders) this.game.physics.removeCollider(c);
      enemy.colliders = [];
      enemy.object.rotation.x = -Math.PI / 2 * 0.9;
      enemy.object.position.y = 0.3;
      this.events.emit('enemy:killed', { enemy, position: enemy.position.clone(), headshot, source, cause });
    }
  }

  update() {}
}
