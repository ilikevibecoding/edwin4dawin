// Door entities: hinged leaves + sliding shutter. Correct pivots, dynamic collision, interaction,
// AI open requests, audio, and text-state output. Owned by Fable 2 (geometry) + Opus 3 (nav hooks).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { getMaterial } from '../materials/index.js';

export const DOOR_STYLES = {
  standard: { mat: 'doorPaint', glassLite: false, thickness: 0.045, closer: true },
  wide: { mat: 'doorPaint', glassLite: true, thickness: 0.045, closer: true },
  restroom: { mat: 'doorPaint', glassLite: false, thickness: 0.045, closer: true, sign: true },
  fire: { mat: 'doorFire', glassLite: false, thickness: 0.05, pushbar: true, closer: true },
  security: { mat: 'doorSecurity', glassLite: 'slit', thickness: 0.055, cardReader: true, closer: true },
  glass: { mat: 'glassClear', frame: 'aluminum', thickness: 0.03, glassDoor: true },
  glassDouble: { mat: 'glassClear', frame: 'aluminum', thickness: 0.03, glassDoor: true, double: true },
  wood: { mat: 'doorWood', glassLite: false, thickness: 0.045 },
  woodDouble: { mat: 'doorWood', glassLite: false, thickness: 0.045, double: true },
};

const DOOR_H = 2.05;

export class Door {
  /**
   * @param opts { id, kind, cx, cy, cz, axis: 'x'|'z' (wall runs along axis), width, world, scene, locked }
   * Leaf(s) hinge at the jamb(s). axis 'x' => wall along x, door swings in ±z.
   */
  constructor(opts) {
    this.id = opts.id;
    this.kind = opts.kind;
    this.axis = opts.axis;
    this.width = opts.width;
    this.center = new THREE.Vector3(opts.cx, opts.cy, opts.cz);
    this.world = opts.world;
    this.locked = !!opts.locked;
    this.state = this.locked ? 'locked' : 'closed'; // closed|opening|open|closing|locked
    this.angle = 0;            // 0 closed, ±maxAngle open
    this.maxAngle = Math.PI * 0.56;
    this.speed = 2.6;          // rad/s
    this.style = DOOR_STYLES[opts.kind] || DOOR_STYLES.standard;
    this.group = new THREE.Group();
    this.group.position.copy(this.center);
    if (this.axis === 'z') this.group.rotation.y = Math.PI / 2; // local +x runs along wall
    this.leaves = [];
    this._buildLeaves(opts.buildLeafMesh);
    opts.scene.add(this.group);
    // Dynamic collider spanning the doorway; updated with angle.
    this.collider = this.world.add({
      min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 },
      material: this.style.glassDoor ? 'glass' : 'wood',
      tag: 'door', dynamic: true, ref: this,
      blockSight: !this.style.glassDoor,
    });
    this._updateCollider();
  }

  _buildLeaves(buildLeafMesh) {
    const t = this.style.thickness;
    const leafDefs = this.style.double
      ? [{ hinge: -this.width / 2, w: this.width / 2 - 0.006, dir: 1 }, { hinge: this.width / 2, w: this.width / 2 - 0.006, dir: -1 }]
      : [{ hinge: -this.width / 2, w: this.width - 0.008, dir: 1 }];
    for (const def of leafDefs) {
      const pivot = new THREE.Group();
      pivot.position.set(def.hinge, 0, 0);
      const mesh = buildLeafMesh
        ? buildLeafMesh(this, def)
        : defaultLeaf(def.w, DOOR_H, t, this.style);
      mesh.position.x = (def.w / 2) * def.dir;
      pivot.add(mesh);
      this.group.add(pivot);
      this.leaves.push({ pivot, dir: def.dir, w: def.w });
    }
  }

  get isOpen() { return this.state === 'open' || (this.state === 'opening' && this.angle > this.maxAngle * 0.55); }
  get blocksPath() { return this.state === 'closed' || this.state === 'locked' || (this.state !== 'open' && this.angle < this.maxAngle * 0.4); }

  interact(byPlayer = true) {
    if (this.state === 'locked') {
      if (byPlayer) { audio.door('locked', this.center); bus.emit('subtitle', { text: 'Locked.', ms: 1200 }); }
      return false;
    }
    if (this.state === 'closed' || this.state === 'closing') this.open();
    else if (this.state === 'open' || this.state === 'opening') this.close();
    return true;
  }
  open() {
    if (this.state === 'locked' || this.state === 'open' || this.state === 'opening') return;
    this.state = 'opening';
    audio.door('open', this.center);
    bus.emit('door-state', { id: this.id, state: this.state });
    bus.emit('noise', { pos: this.center, radius: 9, type: 'door' });
  }
  close() {
    if (this.state === 'closed' || this.state === 'closing') return;
    this.state = 'closing';
    bus.emit('door-state', { id: this.id, state: this.state });
  }
  unlock() { if (this.state === 'locked') { this.state = 'closed'; } }

  update(dt) {
    if (this.state === 'opening') {
      this.angle = Math.min(this.maxAngle, this.angle + this.speed * dt);
      if (this.angle >= this.maxAngle) { this.state = 'open'; bus.emit('door-state', { id: this.id, state: 'open' }); }
      this._apply();
    } else if (this.state === 'closing') {
      this.angle = Math.max(0, this.angle - this.speed * dt);
      if (this.angle <= 0) {
        this.state = 'closed';
        audio.door('close', this.center);
        bus.emit('door-state', { id: this.id, state: 'closed' });
      }
      this._apply();
    }
  }

  _apply() {
    for (const leaf of this.leaves) leaf.pivot.rotation.y = -this.angle * leaf.dir;
    this._updateCollider();
  }

  _updateCollider() {
    // Approximate the leaves with one AABB. Closed: thin slab across the doorway. Open: hugging the jamb.
    const t = 0.09;
    const hw = this.width / 2;
    const openFrac = this.angle / this.maxAngle;
    let min, max;
    if (openFrac < 0.55) {
      // treat as blocking the doorway (conservative while moving)
      const depth = t + Math.sin(this.angle) * this.width * 0.55;
      if (this.axis === 'x') {
        min = { x: this.center.x - hw, y: this.center.y, z: this.center.z - depth / 2 };
        max = { x: this.center.x + hw, y: this.center.y + DOOR_H, z: this.center.z + depth / 2 };
      } else {
        min = { x: this.center.x - depth / 2, y: this.center.y, z: this.center.z - hw };
        max = { x: this.center.x + depth / 2, y: this.center.y + DOOR_H, z: this.center.z + hw };
      }
    } else {
      // swung open: leaf parallel to doorway sides, hugging jamb(s)
      const lw = this.leaves[0].w;
      const depth = lw * Math.sin(Math.min(this.angle, Math.PI / 2)) + 0.05;
      if (this.axis === 'x') {
        min = { x: this.center.x - hw, y: this.center.y, z: this.center.z };
        max = { x: this.center.x - hw + t, y: this.center.y + DOOR_H, z: this.center.z + depth };
        if (this.style.double) max.x = this.center.x + hw; // both jambs; thin slabs approximated as edges
      } else {
        min = { x: this.center.x, y: this.center.y, z: this.center.z - hw };
        max = { x: this.center.x + depth, y: this.center.y + DOOR_H, z: this.center.z - hw + t };
        if (this.style.double) max.z = this.center.z + hw;
      }
      // open doors do not block sight/shots through the doorway
    }
    this.collider.blockSight = openFrac < 0.55 && !this.style.glassDoor;
    this.collider.blockShot = openFrac < 0.55;
    this.collider.blockMove = openFrac < 0.55;
    this.world.updateBounds(this.collider, min, max);
  }

  reset() {
    this.angle = 0;
    this.state = this.locked ? 'locked' : 'closed';
    this._apply();
  }

  textState() {
    return { id: this.id, kind: this.kind, state: this.state, pos: [+this.center.x.toFixed(1), +this.center.y.toFixed(1), +this.center.z.toFixed(1)] };
  }
}

function defaultLeaf(w, h, t, style) {
  const g = new THREE.Group();
  const mat = getMaterial(style.glassDoor ? 'glassClear' : style.mat);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  if (style.glassDoor) {
    const rail = getMaterial('aluminum');
    for (const y of [0.06, h - 0.06]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, t + 0.02), rail);
      bar.position.y = y;
      g.add(bar);
    }
    const stile = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, t + 0.02), rail);
    stile.position.set(-w / 2 + 0.03, h / 2, 0);
    g.add(stile.clone(), stile);
    g.children[g.children.length - 1].position.x = w / 2 - 0.03;
  } else {
    // handle both sides
    const handleMat = getMaterial('brushedMetal');
    for (const s of [1, -1]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), handleMat);
      handle.position.set(w / 2 - 0.12, 1.02, s * (t / 2 + 0.012));
      g.add(handle);
    }
    if (style.glassLite) {
      const lite = new THREE.Mesh(
        new THREE.BoxGeometry(style.glassLite === 'slit' ? 0.12 : 0.3, style.glassLite === 'slit' ? 0.5 : 0.6, t + 0.004),
        getMaterial('glassClear'),
      );
      lite.position.set(w / 2 - 0.3, 1.55, 0);
      g.add(lite);
    }
    if (style.pushbar) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.05, 0.05), getMaterial('brushedMetal'));
      bar.position.set(0, 1.0, t / 2 + 0.03);
      g.add(bar);
    }
  }
  return g;
}

// Vertical roll-up shutter (garage / dock).
export class Shutter {
  constructor({ id, cx, cy, cz, axis, width, height, world, scene, buildMesh }) {
    this.id = id;
    this.kind = 'shutter';
    this.axis = axis;
    this.width = width;
    this.height = height;
    this.center = new THREE.Vector3(cx, cy, cz);
    this.world = world;
    this.state = 'closed'; // closed|opening|open
    this.lift = 0;
    this.group = new THREE.Group();
    this.group.position.copy(this.center);
    if (axis === 'z') this.group.rotation.y = Math.PI / 2;
    this.panel = buildMesh ? buildMesh(this) : defaultShutterPanel(width, height);
    this.group.add(this.panel);
    scene.add(this.group);
    this.collider = world.add({
      min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 },
      material: 'metal', tag: 'door', dynamic: true, ref: this, blockSight: true,
    });
    this._updateCollider();
  }
  open() {
    if (this.state !== 'closed') return;
    this.state = 'opening';
    audio.door('shutter', this.center);
    bus.emit('door-state', { id: this.id, state: 'opening' });
  }
  interact() { return false; } // not manually operable
  get blocksPath() { return this.state !== 'open'; }
  update(dt) {
    if (this.state === 'opening') {
      this.lift = Math.min(this.height - 0.15, this.lift + dt * 0.9);
      this.panel.position.y = this.lift;
      this.panel.scale.y = Math.max(0.04, 1 - this.lift / this.height);
      this.panel.position.y = this.lift * 0.98;
      if (this.lift >= this.height - 0.16) { this.state = 'open'; bus.emit('door-state', { id: this.id, state: 'open' }); }
      this._updateCollider();
    }
  }
  _updateCollider() {
    const hw = this.width / 2, t = 0.06;
    const bottom = this.center.y + this.lift;
    let min, max;
    if (this.axis === 'x') {
      min = { x: this.center.x - hw, y: bottom, z: this.center.z - t };
      max = { x: this.center.x + hw, y: this.center.y + this.height + 0.3, z: this.center.z + t };
    } else {
      min = { x: this.center.x - t, y: bottom, z: this.center.z - hw };
      max = { x: this.center.x + t, y: this.center.y + this.height + 0.3, z: this.center.z + hw };
    }
    this.collider.blockMove = this.lift < 1.9;
    this.collider.blockShot = this.lift < 1.9;
    this.collider.blockSight = this.lift < 1.6;
    this.world.updateBounds(this.collider, min, max);
  }
  reset() {
    this.state = 'closed';
    this.lift = 0;
    this.panel.position.y = 0;
    this.panel.scale.y = 1;
    this._updateCollider();
  }
  textState() {
    return { id: this.id, kind: 'shutter', state: this.state, pos: [+this.center.x.toFixed(1), +this.center.y.toFixed(1), +this.center.z.toFixed(1)] };
  }
}

function defaultShutterPanel(w, h) {
  const g = new THREE.Group();
  const mat = getMaterial('paintedMetal');
  const slats = Math.floor(h / 0.28);
  for (let i = 0; i < slats; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.26, 0.05), mat);
    slat.position.y = i * 0.28 + 0.14;
    slat.castShadow = true;
    g.add(slat);
  }
  return g;
}
