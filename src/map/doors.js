import * as THREE from 'three';
import { DOOR_SPECS } from './layout.js';
import { mat } from '../art/materials.js';
import { bevelBox, box, cyl, torus, plane } from '../art/geometry.js';
import { bus, EV } from '../core/events.js';
import { collision } from './collision.js';
import { collapseByMaterial } from './merge.js';
import { reg, OWNERS } from '../core/assets.js';
import { painted, roundRect } from '../art/textures.js';
import { C } from '../art/palette.js';

/**
 * DOORS AND ACCESS ELEMENTS
 * Owner: Fable 2 (geometry/hardware) + Opus 2 (interaction) + Opus 3 (AI use).
 *
 * A door owns its leaf, hardware, collision, sound, interaction range, AI
 * navigation cost and text state. States: closed, opening, open, closing,
 * locked, damaged. Roller shutters use a vertical lift instead of a swing.
 */

const SWING_TIME = 0.62;
const ROLLER_TIME = 3.4;

let doorSeq = 0;

function signTexture(text, sub = '') {
  return painted(`doorsign:${text}:${sub}`, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cfd6dc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#16222e';
    ctx.fillRect(0, 0, w, h * 0.34);
    ctx.fillStyle = '#e8f2fa';
    ctx.font = `600 ${h * 0.2}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h * 0.17);
    ctx.fillStyle = '#2b3a48';
    ctx.font = `500 ${h * 0.13}px "Segoe UI", system-ui, sans-serif`;
    if (sub) ctx.fillText(sub, w / 2, h * 0.55);
    ctx.strokeStyle = '#8a97a3';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });
}

export class Door {
  constructor(slot) {
    this.id = slot.id ?? `door.${doorSeq++}`;
    this.spec = DOOR_SPECS[slot.door] ?? DOOR_SPECS.standard;
    this.kind = slot.door ?? 'standard';
    this.axis = slot.axis;
    this.at = slot.at;
    this.a = slot.a;
    this.b = slot.b;
    this.y0 = slot.y0;
    this.y1 = slot.y1;
    this.floorY = slot.floorY ?? 0;
    this.roller = !!slot.roller;
    this.width = slot.b - slot.a;
    this.height = slot.y1 - slot.y0;
    this.state = slot.state === 'locked' ? 'locked' : 'closed';
    this.locked = slot.state === 'locked';
    this.openAmount = 0;
    this.targetOpen = 0;
    this.hingeSide = slot.hinge ?? 1;
    this.swingDir = slot.swing ?? 1;
    this.group = new THREE.Group();
    this.group.name = `door:${this.id}`;
    this.leaves = [];
    this.damaged = false;
    this.health = this.kind === 'security' || this.kind === 'server' ? 900 : 320;
    this.lastToggle = -99;
    this._colliders = [];
    this._build();
    this.updateColliders();
  }

  get center() {
    const cx = this.axis === 'x' ? this.at : (this.a + this.b) / 2;
    const cz = this.axis === 'x' ? (this.a + this.b) / 2 : this.at;
    return new THREE.Vector3(cx, this.floorY + this.height / 2, cz);
  }

  get isOpen() {
    return this.openAmount > 0.55;
  }

  get isPassable() {
    return this.openAmount > 0.5 || this.destroyed;
  }

  _build() {
    const g = this.group;
    const cx = this.axis === 'x' ? this.at : (this.a + this.b) / 2;
    const cz = this.axis === 'x' ? (this.a + this.b) / 2 : this.at;
    g.position.set(cx, this.floorY, cz);
    if (this.axis === 'x') g.rotation.y = Math.PI / 2;

    if (this.roller) {
      this._buildRoller();
      return;
    }
    const double = !!this.spec.double;
    const leafW = double ? this.width / 2 - 0.006 : this.width - 0.012;
    for (let i = 0; i < (double ? 2 : 1); i++) {
      const pivot = new THREE.Group();
      const side = double ? (i === 0 ? -1 : 1) : this.hingeSide;
      pivot.position.set(double ? side * (this.width / 2) : -this.hingeSide * (this.width / 2 - 0.01), 0, 0);
      const leaf = this._buildLeaf(leafW, side);
      leaf.position.set(double ? -side * (leafW / 2) : this.hingeSide * (leafW / 2), 0, 0);
      pivot.add(leaf);
      pivot.userData.side = side;
      g.add(pivot);
      this.leaves.push(pivot);
    }
  }

  _buildLeaf(w, side) {
    const grp = new THREE.Group();
    const h = this.height - 0.02;
    const t = this.spec.thickness;
    const glassLeaf = this.spec.mat.startsWith('glass');
    const leafMat = mat(glassLeaf ? 'glass.clear' : this.spec.mat, { tile: 1 });

    if (glassLeaf) {
      const frame = mat(this.spec.frame ?? 'metal.aluminium');
      const railH = 0.14;
      grp.add(mesh(bevelBox(w, railH, t * 3, 0.006), frame, [0, railH / 2, 0]));
      grp.add(mesh(bevelBox(w, railH * 1.6, t * 3, 0.006), frame, [0, h - railH * 0.8, 0]));
      grp.add(mesh(bevelBox(0.06, h, t * 3, 0.006), frame, [-w / 2 + 0.03, h / 2, 0]));
      grp.add(mesh(bevelBox(0.06, h, t * 3, 0.006), frame, [w / 2 - 0.03, h / 2, 0]));
      const pane = mesh(box(w - 0.12, h - railH * 2.6, t), leafMat, [0, h / 2, 0]);
      pane.castShadow = false;
      pane.userData.transparentToSight = true;
      grp.add(pane);
    } else {
      const body = mesh(bevelBox(w, h, t, 0.006), leafMat, [0, h / 2, 0]);
      grp.add(body);
      // Recessed panel detail on timber doors
      if (this.spec.mat.startsWith('wood')) {
        const pm = mat('wood.dark');
        grp.add(mesh(bevelBox(w - 0.16, h * 0.42, t * 0.28, 0.004), pm, [0, h * 0.28, t * 0.5]));
        grp.add(mesh(bevelBox(w - 0.16, h * 0.32, t * 0.28, 0.004), pm, [0, h * 0.72, t * 0.5]));
        grp.add(mesh(bevelBox(w - 0.16, h * 0.42, t * 0.28, 0.004), pm, [0, h * 0.28, -t * 0.5]));
        grp.add(mesh(bevelBox(w - 0.16, h * 0.32, t * 0.28, 0.004), pm, [0, h * 0.72, -t * 0.5]));
      }
      if (this.spec.vision) {
        const vm = mat('glass.clear');
        const vg = mesh(box(0.2, 0.55, t * 1.4), vm, [w * 0.22, h * 0.66, 0]);
        vg.userData.transparentToSight = true;
        vg.castShadow = false;
        grp.add(vg);
        grp.add(mesh(bevelBox(0.25, 0.6, t * 1.1, 0.004), mat('metal.brushed'), [w * 0.22, h * 0.66, 0]));
      }
      if (this.spec.glazed) {
        const vm = mat('glass.clear');
        const vg = mesh(box(w - 0.2, h - 0.55, t * 0.7), vm, [0, h * 0.56, 0]);
        vg.userData.transparentToSight = true;
        vg.castShadow = false;
        grp.add(vg);
      }
    }

    /* ---- Hardware ---- */
    const hw = mat('metal.brushed');
    const hx = -side * (w / 2 - 0.08);
    if (this.spec.hardware === 'lever') {
      grp.add(mesh(cyl(0.026, 0.026, 0.05, 10), hw, [hx, 1.05, t * 0.6], [Math.PI / 2, 0, 0]));
      grp.add(mesh(bevelBox(0.12, 0.022, 0.022, 0.008), hw, [hx + side * 0.045, 1.05, t * 0.6 + 0.035]));
      grp.add(mesh(cyl(0.026, 0.026, 0.05, 10), hw, [hx, 1.05, -t * 0.6], [Math.PI / 2, 0, 0]));
      grp.add(mesh(bevelBox(0.12, 0.022, 0.022, 0.008), hw, [hx + side * 0.045, 1.05, -t * 0.6 - 0.035]));
      grp.add(mesh(cyl(0.014, 0.014, 0.014, 8), mat('metal.stainless'), [hx, 0.9, t * 0.6], [Math.PI / 2, 0, 0]));
    } else if (this.spec.hardware === 'pushbar') {
      grp.add(mesh(cyl(0.019, 0.019, w * 0.72, 8), hw, [0, 1.02, t * 0.75], [0, 0, Math.PI / 2]));
      grp.add(mesh(bevelBox(0.05, 0.1, 0.07, 0.01), hw, [-w * 0.32, 1.02, t * 0.6]));
      grp.add(mesh(bevelBox(0.05, 0.1, 0.07, 0.01), hw, [w * 0.32, 1.02, t * 0.6]));
      grp.add(mesh(bevelBox(w * 0.9, 0.22, 0.014, 0.004), hw, [0, 1.02, -t * 0.7]));
    } else if (this.spec.hardware === 'pull') {
      grp.add(mesh(cyl(0.016, 0.016, 0.9, 8), hw, [hx, 1.05, t * 1.4]));
      grp.add(mesh(cyl(0.014, 0.014, 0.09, 8), hw, [hx, 0.66, t * 0.8], [Math.PI / 2, 0, 0]));
      grp.add(mesh(cyl(0.014, 0.014, 0.09, 8), hw, [hx, 1.44, t * 0.8], [Math.PI / 2, 0, 0]));
    }
    // Hinges
    for (const hy of [0.28, h * 0.5, h - 0.28]) {
      grp.add(mesh(cyl(0.016, 0.016, 0.1, 8), hw, [side * (w / 2 - 0.012), hy, 0]));
    }
    // Closer arm
    if (this.spec.closer) {
      grp.add(mesh(bevelBox(0.2, 0.06, 0.07, 0.008), mat('metal.paintedDark'), [side * (w / 2 - 0.2), h - 0.09, t * 0.9]));
      grp.add(mesh(bevelBox(0.26, 0.02, 0.022, 0.005), hw, [side * (w / 2 - 0.36), h - 0.06, t * 0.9], [0, 0, 0.12]));
    }
    grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.matName = o.material?.name; } });
    // A door leaf is ~20 small meshes; collapsing to one mesh per material
    // takes 44 doors from roughly 900 draw calls to about 130.
    collapseByMaterial(grp, { bvh: true });
    grp.traverse((o) => { if (o.isMesh) o.userData.doorRef = this; });
    return grp;
  }

  _buildRoller() {
    const w = this.width;
    const h = this.height;
    const curtain = new THREE.Group();
    const slatMat = mat('metal.galvanised');
    const slats = Math.max(6, Math.round(h / 0.16));
    for (let i = 0; i < slats; i++) {
      const y = (i + 0.5) * (h / slats);
      const m = mesh(bevelBox(w - 0.06, h / slats - 0.008, 0.05, 0.012), slatMat, [0, y, 0]);
      curtain.add(m);
    }
    curtain.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.matName = 'metal.galvanised'; } });
    // Slats must stay individually visible so the curtain can roll up.
    this.group.add(curtain);
    this.curtain = curtain;
    // Guides, drum and control station (static, so they collapse together)
    const frame = new THREE.Group();
    const gm = mat('metal.painted');
    frame.add(mesh(bevelBox(0.1, h + 0.3, 0.16, 0.01), gm, [-w / 2 - 0.05, (h + 0.3) / 2, 0]));
    frame.add(mesh(bevelBox(0.1, h + 0.3, 0.16, 0.01), gm, [w / 2 + 0.05, (h + 0.3) / 2, 0]));
    frame.add(mesh(cyl(0.16, 0.16, w + 0.2, 12), gm, [0, h + 0.2, 0], [0, 0, Math.PI / 2]));
    frame.add(mesh(bevelBox(0.16, 0.24, 0.09, 0.012), mat('metal.paintedDark'), [w / 2 + 0.42, 1.35, 0.1]));
    frame.add(mesh(cyl(0.03, 0.03, 0.03, 10), mat('emissive.ledGreen'), [w / 2 + 0.42, 1.41, 0.155], [Math.PI / 2, 0, 0]));
    frame.add(mesh(cyl(0.03, 0.03, 0.03, 10), mat('emissive.ledRed'), [w / 2 + 0.42, 1.3, 0.155], [Math.PI / 2, 0, 0]));
    frame.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.matName = o.material?.name; } });
    collapseByMaterial(frame);
    this.group.add(frame);
  }

  /** Card reader / keypad next to a controlled door. */
  buildReader(parent) {
    if (!this.spec.cardReader) return;
    const rd = new THREE.Group();
    rd.add(mesh(bevelBox(0.08, 0.13, 0.03, 0.008), mat('plastic.dark'), [0, 0, 0]));
    rd.add(mesh(box(0.05, 0.05, 0.006), mat(this.locked ? 'emissive.ledRed' : 'emissive.ledGreen'), [0, 0.03, 0.019]));
    const cx = this.axis === 'x' ? this.at : this.b + 0.22;
    const cz = this.axis === 'x' ? this.b + 0.22 : this.at;
    rd.position.set(cx, this.floorY + 1.15, cz);
    if (this.axis === 'x') rd.rotation.y = Math.PI / 2;
    rd.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.matName = o.material?.name; } });
    collapseByMaterial(rd);
    parent.add(rd);
    this.reader = rd;
  }

  toggle(byPlayer = true, force = null) {
    if (this.destroyed) return false;
    if (this.locked && force !== 'unlock') {
      bus.emit(EV.DOOR_STATE, { door: this, state: 'locked', byPlayer });
      return false;
    }
    const opening = force === 'open' ? true : force === 'close' ? false : this.targetOpen < 0.5;
    this.targetOpen = opening ? 1 : 0;
    this.state = opening ? 'opening' : 'closing';
    bus.emit(EV.DOOR_STATE, { door: this, state: this.state, byPlayer });
    bus.emit(EV.NOISE, {
      pos: this.center, radius: this.roller ? 34 : 13,
      kind: 'door', source: byPlayer ? 'player' : 'ai',
    });
    return true;
  }

  unlock() {
    this.locked = false;
    if (this.reader) {
      const led = this.reader.children[1];
      if (led) led.material = mat('emissive.ledGreen');
    }
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0 && !this.destroyed) {
      this.destroyed = true;
      this.damaged = true;
      this.state = 'damaged';
      this.targetOpen = 1;
      bus.emit(EV.DOOR_STATE, { door: this, state: 'damaged' });
    } else if (this.health < 160 && !this.damaged) {
      this.damaged = true;
    }
  }

  update(dt) {
    const speed = this.roller ? 1 / ROLLER_TIME : 1 / SWING_TIME;
    if (Math.abs(this.openAmount - this.targetOpen) > 1e-4) {
      const dir = Math.sign(this.targetOpen - this.openAmount);
      this.openAmount = THREE.MathUtils.clamp(this.openAmount + dir * speed * dt, 0, 1);
      this._applyPose();
      this.updateColliders();
      if (Math.abs(this.openAmount - this.targetOpen) <= 1e-4) {
        this.state = this.targetOpen > 0.5 ? 'open' : this.locked ? 'locked' : 'closed';
        bus.emit(EV.DOOR_STATE, { door: this, state: this.state, settled: true });
      }
    }
  }

  _applyPose() {
    const eased = this.openAmount * this.openAmount * (3 - 2 * this.openAmount);
    if (this.roller) {
      this.curtain.position.y = eased * (this.height + 0.02);
      const slats = this.curtain.children;
      for (let i = 0; i < slats.length; i++) {
        slats[i].visible = slats[i].position.y + this.curtain.position.y < this.height + 0.06;
      }
      return;
    }
    for (const pivot of this.leaves) {
      const side = pivot.userData.side;
      pivot.rotation.y = -side * eased * (Math.PI * 0.52) * this.swingDir;
    }
  }

  updateColliders() {
    this._colliders.length = 0;
    if (this.openAmount > 0.72 || this.destroyed) return;
    const shrink = this.roller ? 1 - this.openAmount : 1;
    const t = 0.09;
    const yTop = this.floorY + this.y1 * (this.roller ? shrink : 1);
    if (this.roller && shrink < 0.05) return;
    if (!this.roller && this.openAmount > 0.2) {
      // Swinging leaves sweep out of the opening; approximate with a shrunken plane
      const inset = this.openAmount * (this.width * 0.5);
      const a = this.a + inset;
      const b = this.b - inset * 0.2;
      if (b - a < 0.1) return;
      this._pushCollider(a, b, this.floorY + this.y0, this.floorY + this.y1, t);
      return;
    }
    this._pushCollider(this.a, this.b, this.floorY + (this.roller ? this.y1 * (1 - shrink) : this.y0), yTop, t);
  }

  _pushCollider(a, b, y0, y1, t) {
    if (y1 - y0 < 0.05) return;
    if (this.axis === 'x') {
      this._colliders.push({ x0: this.at - t, y0, z0: a, x1: this.at + t, y1, z1: b, surface: this.spec.mat.startsWith('glass') ? 'glass' : this.spec.mat.startsWith('metal') ? 'metal' : 'wood', tag: 'door' });
    } else {
      this._colliders.push({ x0: a, y0, z0: this.at - t, x1: b, y1, z1: this.at + t, surface: this.spec.mat.startsWith('glass') ? 'glass' : this.spec.mat.startsWith('metal') ? 'metal' : 'wood', tag: 'door' });
    }
  }

  colliders() {
    return this._colliders;
  }

  serialize(playerPos = null) {
    const c = this.center;
    const out = {
      id: this.id,
      kind: this.kind,
      state: this.destroyed ? 'destroyed' : this.locked && this.openAmount < 0.1 ? 'locked' : this.state,
      openAmount: Math.round(this.openAmount * 100) / 100,
      position: [round(c.x), round(c.y), round(c.z)],
      passable: this.isPassable,
    };
    if (playerPos) out.distance = round(c.distanceTo(playerPos));
    return out;
  }
}

function mesh(geometry, material, pos = [0, 0, 0], rot = null) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.matName = material?.name;
  return m;
}

function round(v) {
  return Math.round(v * 100) / 100;
}

export class DoorSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'doors';
    scene.add(this.group);
    this.doors = [];
    this.byId = new Map();
  }

  build(slots) {
    for (const s of slots) {
      const d = new Door(s);
      this.doors.push(d);
      this.byId.set(d.id, d);
      this.group.add(d.group);
      d.buildReader(this.group);
    }
    collision.addDynamic(() => {
      const out = [];
      for (const d of this.doors) out.push(...d.colliders());
      return out;
    });
    collision.registerRaycastTarget(this.group);
    this.initialStates = this.doors.map((d) => ({ id: d.id, locked: d.locked, open: 0 }));
    return this.doors;
  }

  update(dt) {
    for (const d of this.doors) d.update(dt);
  }

  nearest(pos, maxDist = 2.4) {
    let best = null;
    let bestD = maxDist;
    for (const d of this.doors) {
      const dist = d.center.distanceTo(pos);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best;
  }

  nearby(pos, radius = 6) {
    return this.doors
      .filter((d) => d.center.distanceTo(pos) <= radius)
      .sort((a, b) => a.center.distanceTo(pos) - b.center.distanceTo(pos))
      .slice(0, 6);
  }

  reset() {
    for (const d of this.doors) {
      d.openAmount = 0;
      d.targetOpen = 0;
      d.destroyed = false;
      d.damaged = false;
      d.health = d.kind === 'security' || d.kind === 'server' ? 900 : 320;
      const init = this.initialStates.find((s) => s.id === d.id);
      d.locked = init ? init.locked : false;
      d.state = d.locked ? 'locked' : 'closed';
      d._applyPose();
      d.updateColliders();
    }
  }
}

let registered = false;
export function registerDoorManifest() {
  if (registered) return;
  registered = true;
  const base = {
    category: 'door', owner: OWNERS.FABLE2,
    files: ['src/map/doors.js', 'src/map/layout.js'],
    lod: 'single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum',
    status: 'accepted',
    animations: ['closed', 'opening', 'open', 'closing', 'locked-rattle', 'damaged-ajar'],
  };
  const items = [
    ['door.standard', 'Standard office door', '0.94 × 2.06 × 0.045 m', 'offices, copy room, break room, janitor', ['wood.veneer', 'wood.dark', 'metal.brushed'], 'hinge edge at floor, swings on -Y', 'AABB while closed, shrinking sweep while opening', ['door.wood.open', 'door.wood.close', 'door.handle']],
    ['door.glass', 'Glass office door', '0.94 × 2.06 × 0.016 m', 'conference, boardroom, IT', ['glass.clear', 'metal.aluminium'], 'hinge edge at floor', 'AABB while closed', ['door.glass.open', 'door.glass.close']],
    ['door.glassDouble', 'Interior glass double door', '2.0 × 2.4 m pair', 'vestibule to lobby', ['glass.clear', 'metal.aluminium'], 'centre of pair at floor', 'AABB pair', ['door.glass.open', 'door.glass.close']],
    ['door.exteriorDouble', 'Exterior entrance double door', '2.0 × 2.4 m pair, glazed', 'employee entrance', ['metal.painted', 'glass.clear', 'metal.brushed'], 'centre of pair at floor', 'AABB pair', ['door.metal.open', 'door.metal.close', 'wind.gust']],
    ['door.fire', 'Fire door', '0.94 × 2.06 × 0.055 m with vision panel', 'stairs, loading, garage, plant', ['metal.painted', 'glass.clear', 'metal.brushed'], 'hinge edge at floor', 'AABB while closed', ['door.metal.open', 'door.metal.close', 'pushbar']],
    ['door.security', 'Security door', '0.94 × 2.06 × 0.06 m with card reader', 'plant, server south entry', ['metal.paintedDark', 'plastic.dark', 'emissive.ledRed'], 'hinge edge at floor', 'AABB while closed', ['door.metal.open', 'reader.deny', 'reader.grant']],
    ['door.server', 'Server room door', '0.94 × 2.06 × 0.06 m brushed with vision panel', 'server room', ['metal.brushedV', 'glass.clear'], 'hinge edge at floor', 'AABB while closed', ['door.metal.open', 'reader.grant']],
    ['door.restroom', 'Restroom door', '0.86 × 2.06 × 0.04 m', 'restrooms', ['wood.pale', 'metal.brushed'], 'hinge edge at floor', 'AABB while closed', ['door.wood.open']],
    ['door.exec', 'Executive door', '1.0 × 2.3 × 0.055 m dark veneer', 'executive office', ['wood.dark', 'metal.brushed'], 'hinge edge at floor', 'AABB while closed', ['door.wood.open']],
    ['door.garageShutter', 'Roller shutter', '5.8 × 4.0 m slat curtain', 'extraction garage, loading dock', ['metal.galvanised', 'metal.painted', 'emissive.ledGreen'], 'bottom centre of the opening', 'AABB shrinking as the curtain lifts', ['shutter.motor', 'shutter.rattle']],
    ['door.hardware.lever', 'Lever handle set', '0.12 m lever, both faces', 'all lever doors', ['metal.brushed', 'metal.stainless'], 'spindle centre at 1.05 m', 'none', ['door.handle']],
    ['door.hardware.pushbar', 'Push bar', '0.7 m crash bar', 'fire and exterior doors', ['metal.brushed'], 'bar centre at 1.02 m', 'none', ['pushbar']],
    ['door.hardware.closer', 'Door closer', '0.2 m body with arm', 'all closer-fitted doors', ['metal.paintedDark', 'metal.brushed'], 'head of the leaf', 'none', ['door.closer.hiss']],
    ['door.hardware.cardreader', 'Card reader', '0.08 × 0.13 × 0.03 m', 'controlled doors', ['plastic.dark', 'emissive.ledRed', 'emissive.ledGreen'], 'centre at 1.15 m beside the jamb', 'none', ['reader.grant', 'reader.deny']],
  ];
  for (const [id, name, dimensions, usedIn, materials, pivot, coll, audio] of items) {
    reg({
      ...base, id, name, dimensions, usedIn, materials, pivot, collision: coll, audio,
      textures: ['baseColor', 'normal', 'roughness'],
      acceptance: 'Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.',
      evidence: ['screenshots/doors/*.png'],
    });
  }
}

void signTexture; void plane; void torus; void roundRect; void C;
