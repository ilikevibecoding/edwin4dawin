// Hinged door entities. Visual leaf rotates smoothly; the physics collider
// snaps between "closed" (across the doorway) and "open" (leaf against its
// swing side) once the leaf is mostly through, but never while an entity
// stands inside the target volume (no one gets door-trapped).

import * as THREE from 'three';
import { getMaterial, getGlassMaterial } from '../world/materials.js';
import { aabb } from '../world/worldRuntime.js';
import { roomAt, LEVELS } from '../world/map.js';
import { emit } from '../core/events.js';
import { sfx } from '../core/audio.js';

const LEAF_T = 0.055;
const OPEN_ANGLE = Math.PI * 0.58; // ~105°

const KIND_STYLE = {
  'office':       { mat: 'door_office', frame: 'frame_metal', glassPanel: false, handle: 'lever' },
  'restroom':     { mat: 'door_office', frame: 'frame_metal', glassPanel: false, handle: 'lever' },
  'exec':         { mat: 'door_exec', frame: 'frame_metal', glassPanel: false, handle: 'lever' },
  'metal':        { mat: 'door_metal', frame: 'frame_metal', glassPanel: false, handle: 'lever' },
  'fire':         { mat: 'door_fire', frame: 'frame_metal', glassPanel: false, handle: 'push' },
  'security':     { mat: 'door_metal', frame: 'frame_metal', glassPanel: false, handle: 'keypad' },
  'glass':        { mat: 'mullion', frame: 'frame_metal', glassPanel: true, handle: 'pull' },
  'double-glass': { mat: 'mullion', frame: 'frame_metal', glassPanel: true, handle: 'pull', double: true },
  'fire-double':  { mat: 'door_fire', frame: 'frame_metal', glassPanel: false, handle: 'push', double: true },
  'metal-double': { mat: 'door_metal', frame: 'frame_metal', glassPanel: false, handle: 'push', double: true },
};

function buildLeaf(width, height, style) {
  const g = new THREE.Group();
  if (style.glassPanel) {
    // aluminum stile frame + big glass panel
    const rail = 0.09;
    const frameMat = getMaterial(style.mat);
    const mk = (w, h, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, LEAF_T), frameMat);
      m.position.set(x, y, 0); m.castShadow = true; g.add(m);
    };
    mk(width, rail, width / 2, height - rail / 2);
    mk(width, rail * 2.6, width / 2, rail * 1.3);
    mk(rail, height, rail / 2, height / 2);
    mk(rail, height, width - rail / 2, height / 2);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(width - rail * 2, height - rail * 3.6, 0.012), getGlassMaterial('clear'));
    glass.position.set(width / 2, (height - rail * 3.6) / 2 + rail * 2.6, 0);
    glass.renderOrder = 5;
    g.add(glass);
  } else {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(width, height, LEAF_T), getMaterial(style.mat));
    leaf.position.set(width / 2, height / 2, 0);
    leaf.castShadow = true; leaf.receiveShadow = true;
    g.add(leaf);
    // inset panels for wooden doors
    if (style.mat === 'door_office' || style.mat === 'door_exec') {
      for (const [py, ph] of [[height * 0.68, height * 0.42], [height * 0.22, height * 0.3]]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, ph, 0.015), getMaterial('wood_dark'));
        panel.position.set(width / 2, py, LEAF_T / 2 + 0.004);
        g.add(panel);
        const panel2 = panel.clone(); panel2.position.z = -LEAF_T / 2 - 0.004; g.add(panel2);
      }
    }
  }
  // handles / push bars on both faces
  const handleMat = getMaterial('metal_brushed');
  if (style.handle === 'push') {
    for (const zs of [1, -1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.05, 0.05), handleMat);
      bar.position.set(width / 2, 1.02, zs * (LEAF_T / 2 + 0.05));
      g.add(bar);
    }
  } else {
    for (const zs of [1, -1]) {
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), handleMat);
      lever.position.set(width - 0.12, 1.02, zs * (LEAF_T / 2 + 0.035));
      g.add(lever);
      const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 12), handleMat);
      rose.rotation.x = Math.PI / 2;
      rose.position.set(width - 0.18, 1.02, zs * (LEAF_T / 2 + 0.012));
      g.add(rose);
    }
  }
  return g;
}

export function createDoor(world, def, floorY, head) {
  const style = KIND_STYLE[def.kind] || KIND_STYLE.office;
  const group = new THREE.Group();
  group.name = `door_${def.id}`;
  const spanLen = def.span[1] - def.span[0];
  const height = head - floorY - 0.03 > 0 ? head - 0.04 : 2.0; // leaf height
  const leafH = head - 0.05;

  // world-space helpers: wall along X (dir 'x', line=z) or along Z (dir 'z', line=x)
  const along = (t) => def.dir === 'x'
    ? new THREE.Vector3(t, 0, def.line)
    : new THREE.Vector3(def.line, 0, t);

  // frame: jambs + header
  const frameMat = getMaterial(style.frame);
  const jamb = (t) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(
      def.dir === 'x' ? 0.09 : 0.22, leafH + 0.09, def.dir === 'x' ? 0.22 : 0.09), frameMat);
    const p = along(t);
    m.position.set(p.x, floorY + (leafH + 0.09) / 2, p.z);
    m.castShadow = true;
    group.add(m);
  };
  jamb(def.span[0] - 0.015);
  jamb(def.span[1] + 0.015);
  const header = new THREE.Mesh(new THREE.BoxGeometry(
    def.dir === 'x' ? spanLen + 0.12 : 0.22, 0.1, def.dir === 'x' ? 0.22 : spanLen + 0.12), frameMat);
  const hc = along((def.span[0] + def.span[1]) / 2);
  header.position.set(hc.x, floorY + leafH + 0.05, hc.z);
  group.add(header);

  // swing direction: door opens toward def.rooms[0]
  const probeA = def.dir === 'x' ? { x: hc.x, z: def.line + 0.6 } : { x: def.line + 0.6, z: hc.z };
  const roomPlus = roomAt(probeA.x, probeA.z, floorY + 0.5);
  const swingSign = roomPlus && roomPlus.id === def.rooms[0] ? 1 : -1;

  const leaves = [];
  const nLeaves = style.double ? 2 : 1;
  const leafW = spanLen / nLeaves - 0.012;
  for (let i = 0; i < nLeaves; i++) {
    const pivot = new THREE.Group();
    // hinge at outer edge of each leaf
    const hingeT = i === 0 ? def.span[0] + 0.01 : def.span[1] - 0.01;
    const hp = along(hingeT);
    pivot.position.set(hp.x, floorY, hp.z);
    const leafGroup = buildLeaf(leafW, leafH, style);
    // orient leaf along wall: for second leaf extend backwards
    const dirSign = i === 0 ? 1 : -1;
    if (def.dir === 'x') leafGroup.rotation.y = dirSign === 1 ? 0 : Math.PI;
    else leafGroup.rotation.y = dirSign === 1 ? -Math.PI / 2 : Math.PI / 2;
    pivot.add(leafGroup);
    group.add(pivot);
    leaves.push({ pivot, dirSign, hingeT });
  }

  const centerPos = along((def.span[0] + def.span[1]) / 2);
  centerPos.y = floorY + 1.0;

  const isGlassKind = style.glassPanel;
  const door = {
    id: def.id, def, group, kind: def.kind, label: def.label || 'Door',
    locked: !!def.locked, keyId: def.keyId || null,
    state: def.startOpen ? 'open' : 'closed',
    angle: def.startOpen ? 1 : 0, target: def.startOpen ? 1 : 0,
    swingSign, leaves, floorY, leafH, spanLen, center: centerPos, level: def.level,
    closedCollider: null, openColliders: [], _pendingSwap: null,
    moving: false,

    _closedAabb() {
      const a = along(def.span[0]), b = along(def.span[1]);
      const th = 0.09;
      return aabb(
        Math.min(a.x, b.x) - (def.dir === 'x' ? 0 : th), floorY, Math.min(a.z, b.z) - (def.dir === 'x' ? th : 0),
        Math.max(a.x, b.x) + (def.dir === 'x' ? 0 : th), floorY + leafH, Math.max(a.z, b.z) + (def.dir === 'x' ? th : 0),
        { kind: 'door', surface: isGlassKind ? 'glass' : 'wood', door, blocksSight: !isGlassKind, glassSoft: isGlassKind, noStand: true },
      );
    },
    _openAabbs() {
      // each leaf parallel to the perpendicular axis on the swing side
      return leaves.map(({ hingeT }) => {
        const hp = along(hingeT);
        const th = 0.09;
        const zExt = swingSign * leafW;
        if (def.dir === 'x') {
          return aabb(hp.x - th, floorY, hp.z, hp.x + th, floorY + leafH, hp.z + zExt,
            { kind: 'door', surface: isGlassKind ? 'glass' : 'wood', door, blocksSight: false, noStand: true });
        }
        return aabb(hp.x, floorY, hp.z - th, hp.x + zExt, floorY + leafH, hp.z + th,
          { kind: 'door', surface: isGlassKind ? 'glass' : 'wood', door, blocksSight: false, noStand: true });
      });
    },

    setColliders(mode) {
      if (this.closedCollider) { world.removeCollider(this.closedCollider); this.closedCollider = null; }
      for (const c of this.openColliders) world.removeCollider(c);
      this.openColliders = [];
      if (mode === 'closed') this.closedCollider = world.addCollider(this._closedAabb());
      else this.openColliders = this._openAabbs().map((c) => world.addCollider(c));
    },

    interact(actor = 'player') {
      if (this.locked) {
        sfx('door_locked', { pos: this.center, vol: 0.7 });
        return { ok: false, reason: 'locked' };
      }
      if (this.state === 'opening' || this.state === 'closing') return { ok: false, reason: 'moving' };
      if (this.state === 'closed') this.setOpen(true, actor);
      else this.setOpen(false, actor);
      return { ok: true };
    },

    setOpen(open, actor = 'script') {
      if (this.locked && open) return;
      this.target = open ? 1 : 0;
      if (open && this.state !== 'open') {
        this.state = 'opening';
        sfx('door_open', { pos: this.center, vol: 0.8, rateJitter: 0.06 });
        emit('noise', { pos: this.center, radius: 9, type: 'door', source: actor });
      } else if (!open && this.state !== 'closed') {
        this.state = 'closing';
        sfx('door_close', { pos: this.center, vol: 0.7, rateJitter: 0.06 });
        emit('noise', { pos: this.center, radius: 7, type: 'door', source: actor });
      }
      emit('door', { door: this, state: this.state });
    },

    unlock() {
      if (!this.locked) return;
      this.locked = false;
      sfx('door_unlock', { pos: this.center, vol: 0.8 });
    },

    update(dt) {
      const speed = 1.9;
      if (Math.abs(this.angle - this.target) > 1e-4) {
        this.moving = true;
        const dir = Math.sign(this.target - this.angle);
        this.angle = Math.max(0, Math.min(1, this.angle + dir * speed * dt));
        const eased = this.angle * this.angle * (3 - 2 * this.angle);
        for (const { pivot, dirSign } of this.leaves) {
          pivot.rotation.y = eased * OPEN_ANGLE * this.swingSign * (def.dir === 'x' ? -dirSign : -dirSign);
        }
        // collider swap thresholds with clearance checks
        if (this.target === 1 && this.angle > 0.42 && this.closedCollider) {
          const wanted = this._openAabbs();
          if (!world.entityBlockCheck || !wanted.some((c) => world.entityBlockCheck(c))) this.setColliders('open');
        }
        if (this.target === 0 && this.angle < 0.5 && !this.closedCollider) {
          const wanted = this._closedAabb();
          if (!world.entityBlockCheck || !world.entityBlockCheck(wanted)) this.setColliders('closed');
          else { this.target = 1; this.state = 'opening'; } // someone in the doorway: reopen
        }
      } else if (this.moving) {
        this.moving = false;
        this.state = this.target === 1 ? 'open' : 'closed';
        if (this.state === 'closed' && !this.closedCollider) this.setColliders('closed');
        emit('door', { door: this, state: this.state });
      }
    },
  };

  door.setColliders(door.state === 'open' ? 'open' : 'closed');
  if (def.startOpen) for (const { pivot, dirSign } of leaves) pivot.rotation.y = OPEN_ANGLE * swingSign * (def.dir === 'x' ? -dirSign : -dirSign);
  return door;
}
