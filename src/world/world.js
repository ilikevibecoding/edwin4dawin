// World container: owns collision, static map, doors, glass, lights and
// per-mission dynamic rebuild.
import * as THREE from 'three';
import { CollisionWorld } from './collision.js';
import { buildMap } from './mapbuilder.js';
import { buildArchDetails } from '../assets/archkit.js';
import { placeProps } from './props_placement.js';
import { roomAt, CHECKPOINTS } from './layout.js';

export class World {
  constructor(game) {
    this.game = game;
    this.collision = new CollisionWorld();
    this.doors = [];
    this.panes = [];
    this.lights = [];
    this.interactables = [];
    this.group = null;
    this.built = false;
  }

  build() {
    if (this.built) this.dispose();
    const res = buildMap(this.game);
    this.group = res.group;
    this.doors = res.doors;
    this.panes = res.panes;
    this.lights = res.lights;
    this.interactables = res.interactables;

    // architectural finish detail (trim, fixtures, columns, signage)
    const arch = buildArchDetails(this.game);
    this.group.add(arch.group);
    for (const c of arch.colliders || []) {
      this.collision.addBox(c.min, c.max, { tag: 'prop', material: c.material || 'concrete' });
    }
    // full prop set (furniture, electronics, clutter) — must precede nav bake
    const props = placeProps(this.game);
    this.group.add(props.group);

    this.game.scene.add(this.group);
    this.built = true;
  }

  // reset dynamic state without a full rebuild (fast mission restart)
  resetDynamic() {
    for (const d of this.doors) {
      d.targetAngle = 0; d.angle = 0; d.targetLift = 0; d.lift = 0;
      d.moving = false;
      if (d.leafA) d.leafA.rotation.y = 0;
      if (d.leafB) d.leafB.rotation.y = 0;
      if (d.slab) { d.slab.scale.y = 1; d.slab.position.y = d.h / 2; }
      d.locked = !!(d.keycard && (d.keycard === 'mission' || d.id === 'd_server_corr'));
      d.state = d.locked ? 'locked' : 'closed';
      d._updateColliders();
    }
    for (const p of this.panes) p.reset();
  }

  dispose() {
    if (this.group) {
      this.game.scene.remove(this.group);
      this.group.traverse((o) => { o.geometry?.dispose?.(); });
    }
    this.collision.clear();
    this.doors = [];
    this.panes = [];
    this.built = false;
  }

  update(dt) {
    for (const d of this.doors) d.update(dt);
  }

  roomAt(x, z, y) { return roomAt(x, z, y); }
  checkpoint(name) { return CHECKPOINTS[name]; }
  doorById(id) { return this.doors.find((d) => d.id === id); }

  nearbyDoors(pos, r = 6) {
    return this.doors.filter((d) => {
      const c = d.center();
      const dx = c.x - pos.x, dz = c.z - pos.z, dy = c.y - (pos.y + 1);
      return dx * dx + dz * dz + dy * dy < r * r;
    });
  }
}
