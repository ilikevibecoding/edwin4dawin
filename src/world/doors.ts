import * as THREE from 'three';
import type { DoorKind, DoorState, SurfaceKind } from '../game/types';
import type { CollisionWorld } from './collision';
import { events } from '../core/events';
import { plainMat, getMaterial } from '../assets/materials';
import { bevelBoxGeo } from './kit/geo';
import { registerAsset } from '../assets/registry';

registerAsset({
  id: 'arch.door.family',
  name: 'Door family (office/glass/fire/security/restroom/server/loading)',
  category: 'door',
  agent: 'Fable 2',
  files: 'src/world/doors.ts',
  where: 'all rooms',
  dims: '0.95–2.0 × 2.06 × 0.05 m',
  pivot: 'hinge edge, +local-X toward latch',
  materials: 'wood-veneer | painted steel | aluminum+glass',
  textures: 'material library + hardware plain PBR',
  collision: 'dynamic',
  lod: 'none',
  anim: 'closed/opening/open/closing (0–105°), ajar',
  audio: 'door-open, door-close, door-creak',
  status: 'integrated',
  accept: 'correct pivot/collision/interaction/nav; visible hardware; per-kind visual identity',
});

export interface DoorSpawn {
  id: string;
  kind: DoorKind;
  /** hinge world position (floor level) */
  hinge: THREE.Vector3;
  /** unit vector along wall from hinge toward latch */
  along: THREE.Vector3;
  /** wall normal (opening swing direction) */
  normal: THREE.Vector3;
  width: number;
  height: number;
  double?: boolean;
  ajar?: number;
  locked?: boolean;
}

const SWING = Math.PI * 0.58; // ~105°
const SPEED = 2.6;            // rad/s

export class Door {
  readonly id: string;
  readonly kind: DoorKind;
  state: DoorState = 'closed';
  angle = 0;
  target = 0;
  locked: boolean;
  readonly group = new THREE.Group();
  private leafs: { pivot: THREE.Group; sign: number; width: number }[] = [];
  private spawn: DoorSpawn;
  private colWorld: CollisionWorld;
  private lastColAngle = -1;
  /** center of the doorway for interaction/nav */
  readonly center: THREE.Vector3;

  constructor(spawn: DoorSpawn, colWorld: CollisionWorld) {
    this.id = spawn.id;
    this.kind = spawn.kind;
    this.spawn = spawn;
    this.colWorld = colWorld;
    this.locked = !!spawn.locked;
    this.center = spawn.hinge.clone().addScaledVector(spawn.along, spawn.width / 2).add(new THREE.Vector3(0, spawn.height / 2, 0));

    const leafW = spawn.double ? spawn.width / 2 : spawn.width;
    const mk = (hingePos: THREE.Vector3, along: THREE.Vector3, sign: number): void => {
      const pivot = new THREE.Group();
      pivot.position.copy(hingePos);
      const leaf = buildLeaf(this.kind, leafW, spawn.height);
      // leaf built along +X; orient +X to `along`
      pivot.rotation.y = Math.atan2(-along.z, along.x);
      pivot.add(leaf);
      this.group.add(pivot);
      this.leafs.push({ pivot, sign, width: leafW });
    };
    if (spawn.double) {
      mk(spawn.hinge, spawn.along, 1);
      const hinge2 = spawn.hinge.clone().addScaledVector(spawn.along, spawn.width);
      mk(hinge2, spawn.along.clone().negate(), -1);
    } else {
      mk(spawn.hinge, spawn.along, 1);
    }
    if (spawn.ajar) {
      this.angle = SWING * spawn.ajar;
      this.target = this.angle;
      this.state = 'open';
    }
    this.applyAngle();
    this.updateCollider(true);
  }

  /** swing sign so the door opens away from `from` position (feels natural). */
  toggle(fromPos?: THREE.Vector3): void {
    if (this.locked) {
      events.emit('door:state', { id: this.id, state: 'locked' });
      return;
    }
    if (this.target > 0.01) {
      this.target = 0;
      this.state = 'closing';
    } else {
      this.target = SWING;
      this.state = 'opening';
    }
    events.emit('door:state', { id: this.id, state: this.state });
  }

  open(): void {
    if (this.locked || this.target === SWING) return;
    this.target = SWING;
    this.state = 'opening';
    events.emit('door:state', { id: this.id, state: 'opening' });
  }

  get isOpen(): boolean {
    return this.angle > SWING * 0.55;
  }

  get isFullyClosed(): boolean {
    return this.angle < 0.03;
  }

  step(dt: number): void {
    if (Math.abs(this.angle - this.target) > 1e-3) {
      const dir = Math.sign(this.target - this.angle);
      this.angle += dir * SPEED * dt;
      if (dir > 0 && this.angle >= this.target) {
        this.angle = this.target;
        this.state = 'open';
        events.emit('door:state', { id: this.id, state: 'open' });
      } else if (dir < 0 && this.angle <= this.target) {
        this.angle = this.target;
        this.state = 'closed';
        events.emit('door:state', { id: this.id, state: 'closed' });
      }
      this.applyAngle();
      this.updateCollider();
    }
  }

  private applyAngle(): void {
    // swing toward +normal side
    const s = this.spawn;
    const openSign = (s.along.x * s.normal.z - s.along.z * s.normal.x) > 0 ? 1 : -1;
    for (const l of this.leafs) {
      l.pivot.rotation.y = Math.atan2(-((l.sign === 1) ? s.along.z : -s.along.z), (l.sign === 1) ? s.along.x : -s.along.x)
        + this.angle * openSign * l.sign;
    }
  }

  private updateCollider(force = false): void {
    if (!force && Math.abs(this.angle - this.lastColAngle) < 0.02) return;
    this.lastColAngle = this.angle;
    const s = this.spawn;
    // conservative AABB over each leaf's swept footprint
    const min = new THREE.Vector3(Infinity, s.hinge.y, Infinity);
    const max = new THREE.Vector3(-Infinity, s.hinge.y + s.height, -Infinity);
    const openSign = (s.along.x * s.normal.z - s.along.z * s.normal.x) > 0 ? 1 : -1;
    for (const l of this.leafs) {
      const hinge = l.pivot.position;
      const baseAngle = Math.atan2(-((l.sign === 1) ? s.along.z : -s.along.z), (l.sign === 1) ? s.along.x : -s.along.x);
      const a = baseAngle + this.angle * openSign * l.sign;
      const end = new THREE.Vector3(hinge.x + Math.cos(a) * l.width, hinge.y, hinge.z - Math.sin(a) * l.width);
      min.x = Math.min(min.x, hinge.x - 0.04, end.x - 0.04);
      min.z = Math.min(min.z, hinge.z - 0.04, end.z - 0.04);
      max.x = Math.max(max.x, hinge.x + 0.04, end.x + 0.04);
      max.z = Math.max(max.z, hinge.z + 0.04, end.z + 0.04);
    }
    const surface: SurfaceKind = this.kind === 'glass' ? 'glass' : (this.kind === 'office' || this.kind === 'restroom') ? 'wood' : 'metal';
    this.colWorld.setDynamic({
      id: `door:${this.id}`,
      min, max,
      surface,
      transparent: this.kind === 'glass',
      tag: this.id,
    });
  }

  reset(): void {
    this.angle = this.spawn.ajar ? SWING * this.spawn.ajar : 0;
    this.target = this.angle;
    this.state = this.spawn.ajar ? 'open' : 'closed';
    this.applyAngle();
    this.updateCollider(true);
  }
}

// ---------------------------------------------------------------------------
// Leaf construction per kind (+X from hinge, thickness along Z, origin at floor)
// ---------------------------------------------------------------------------

function buildLeaf(kind: DoorKind, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const t = 0.048;
  const wood = getMaterial('wood-veneer').mat;
  const steel = plainMat(0x8b98a3, 0.45, 0.6);
  const steelDark = plainMat(0x4c565e, 0.5, 0.55);
  const alu = plainMat(0xb8bec4, 0.35, 0.85);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdfeef2, transparent: true, opacity: 0.18, roughness: 0.06, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false,
  });

  const slab = (mat: THREE.Material): THREE.Mesh => {
    const m = new THREE.Mesh(bevelBoxGeo(w - 0.02, h - 0.02, t, 0.006), mat);
    m.position.set(w / 2, h / 2, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const box = (mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  };

  const addLeverHandles = (mat: THREE.Material): void => {
    for (const side of [1, -1]) {
      const base = box(mat, w - 0.09, 1.02, side * (t / 2 + 0.012), 0.05, 0.05, 0.02);
      const lever = box(mat, w - 0.14, 1.02, side * (t / 2 + 0.03), 0.13, 0.022, 0.022);
      g.add(base, lever);
    }
  };

  switch (kind) {
    case 'office':
    case 'restroom': {
      g.add(slab(wood));
      // inset panels
      for (const side of [1, -1]) {
        g.add(box(plainMat(0x9c7c54, 0.5, 0), w / 2, h * 0.3, side * (t / 2 + 0.002), w * 0.7, h * 0.42, 0.004));
        g.add(box(plainMat(0x9c7c54, 0.5, 0), w / 2, h * 0.75, side * (t / 2 + 0.002), w * 0.7, h * 0.28, 0.004));
      }
      addLeverHandles(alu);
      break;
    }
    case 'glass': {
      // aluminum stile frame + full glass
      const fw = 0.09;
      g.add(box(alu, fw / 2, h / 2, 0, fw, h, t));
      g.add(box(alu, w - fw / 2, h / 2, 0, fw, h, t));
      g.add(box(alu, w / 2, h - fw / 2, 0, w - 2 * fw, fw, t));
      g.add(box(alu, w / 2, 0.18, 0, w - 2 * fw, 0.36, t));
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * fw, h - 0.36 - fw, 0.012), glassMat);
      pane.position.set(w / 2, (h - fw + 0.36) / 2, 0);
      g.add(pane);
      // pull bars
      for (const side of [1, -1]) {
        g.add(box(alu, w - 0.16, 1.05, side * (t / 2 + 0.035), 0.03, 0.62, 0.03));
        g.add(box(alu, w - 0.16, 1.32, side * (t / 2 + 0.02), 0.03, 0.03, 0.045));
        g.add(box(alu, w - 0.16, 0.78, side * (t / 2 + 0.02), 0.03, 0.03, 0.045));
      }
      break;
    }
    case 'fire': {
      g.add(slab(steelDark));
      // vision glass
      const vg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, t + 0.006), glassMat);
      vg.position.set(w - 0.28, 1.45, 0);
      g.add(vg);
      // push bar
      g.add(box(plainMat(0xc23b2e, 0.4, 0.3), w / 2, 1.0, t / 2 + 0.045, w * 0.8, 0.06, 0.05));
      g.add(box(alu, w - 0.09, 1.02, -(t / 2 + 0.02), 0.05, 0.05, 0.02));
      // kick plate
      g.add(box(alu, w / 2, 0.14, t / 2 + 0.004, w - 0.06, 0.24, 0.006));
      break;
    }
    case 'security':
    case 'server': {
      g.add(slab(steel));
      addLeverHandles(steelDark);
      // louver vent (server)
      if (kind === 'server') {
        for (let i = 0; i < 6; i++) {
          g.add(box(steelDark, w / 2, 0.3 + i * 0.05, t / 2 + 0.004, w * 0.5, 0.018, 0.008));
        }
      }
      // hinges
      for (const y of [0.25, h / 2, h - 0.25]) {
        g.add(box(steelDark, 0.015, y, 0, 0.03, 0.09, t + 0.014));
      }
      break;
    }
    case 'loading': {
      g.add(slab(steelDark));
      g.add(box(alu, w / 2, 0.22, t / 2 + 0.004, w - 0.06, 0.4, 0.006));
      g.add(box(alu, w / 2, 0.22, -(t / 2 + 0.004), w - 0.06, 0.4, 0.006));
      const vg2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, t + 0.006), glassMat);
      vg2.position.set(w - 0.3, 1.5, 0);
      g.add(vg2);
      g.add(box(plainMat(0xc23b2e, 0.4, 0.3), w / 2, 1.0, t / 2 + 0.045, w * 0.8, 0.06, 0.05));
      break;
    }
    case 'double': {
      g.add(slab(wood));
      addLeverHandles(alu);
      break;
    }
  }
  return g;
}
