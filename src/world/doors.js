// Door entities: hinged singles/doubles, roll-up shutters. Each door owns its
// collision boxes, animates open/close, supports lock/keycard, auto-close for
// fire/security doors, and reports state for AI navigation + test hooks.
import * as THREE from 'three';
import { bus } from '../core/events.js';
import { boxGeo } from '../assets/geo.js';
import { getMaterial } from '../assets/materials.js';

const DOOR_H = 2.05;

const TYPE_STYLE = {
  door: { mat: 'door', metal: false, autoClose: 0, speed: 4.0 },
  restroomdoor: { mat: 'door', metal: false, autoClose: 4, speed: 4.0 },
  glassdoor: { mat: 'door_glass', metal: false, autoClose: 0, speed: 4.0, glass: true },
  firedoor: { mat: 'door_fire', metal: true, autoClose: 5, speed: 3.4 },
  securitydoor: { mat: 'door_security', metal: true, autoClose: 5, speed: 3.4 },
  double: { mat: 'door', metal: false, autoClose: 0, speed: 3.6, double: true },
  shutter: { mat: 'shutter', metal: true, autoClose: 0, speed: 0.9, shutter: true },
};

let doorCounter = 0;

export class Door {
  // edge: {dir:'v'|'h', coord, lo, hi}; at: absolute center along edge; w: width
  // outward: +1/-1, which side of the wall the door opens toward
  constructor(game, spec) {
    this.game = game;
    this.id = spec.id || 'door_' + (++doorCounter);
    this.name = spec.name || 'Door';
    this.type = spec.type;
    this.style = TYPE_STYLE[spec.type] || TYPE_STYLE.door;
    this.edge = spec.edge;
    this.at = spec.at;
    this.w = spec.w;
    this.h = spec.h || DOOR_H;
    this.floorY = spec.floorY;
    this.thickness = 0.05;
    this.locked = !!spec.startLocked;
    this.keycard = spec.keycard || null;
    this.angle = 0;              // 0 closed, +/- openAngle
    this.targetAngle = 0;
    this.openAngle = 1.75;       // ~100 deg
    this.lift = 0;               // shutters: 0 closed .. 1 open
    this.targetLift = 0;
    this.state = this.locked ? 'locked' : 'closed';
    this.autoCloseT = 0;
    this.moving = false;
    this.group = new THREE.Group();
    this.colliders = [];
    this._build();
    this._updateColliders(true);
  }

  center() {
    const e = this.edge;
    return e.dir === 'v'
      ? { x: e.coord, y: this.floorY + this.h / 2, z: this.at }
      : { x: this.at, y: this.floorY + this.h / 2, z: e.coord };
  }

  _build() {
    const s = this.style;
    const mat = getMaterial(s.mat);
    const along = this.edge.dir === 'v' ? 'z' : 'x'; // slab runs along this axis

    if (s.shutter) {
      // segmented roll shutter: one slab that slides up
      const slabW = this.w;
      const geo = boxGeo(along === 'x' ? slabW : 0.09, this.h, along === 'x' ? 0.09 : slabW, 1);
      this.slab = new THREE.Mesh(geo, mat);
      this.slab.castShadow = true;
      this.slab.receiveShadow = true;
      const c = this.center();
      this.group.position.set(c.x, this.floorY, c.z);
      this.slab.position.y = this.h / 2;
      this.group.add(this.slab);
      return;
    }

    const leafW = s.double ? this.w / 2 - 0.01 : this.w - 0.02;
    const makeLeaf = (hingeSign) => {
      // hingeSign +1: pivot at the low end of the opening, slab extends +x.
      const pivot = new THREE.Group();
      const geo = boxGeo(leafW - 0.01, this.h - 0.05, this.thickness, 1);
      const slab = new THREE.Mesh(geo, s.glass ? getMaterial('glass') : mat);
      slab.castShadow = !s.glass;
      slab.receiveShadow = true;
      slab.position.set((leafW / 2) * hingeSign, 0, 0);
      pivot.add(slab);
      // handle
      const handle = new THREE.Mesh(boxGeo(0.14, 0.04, 0.05, 1), getMaterial('frame'));
      handle.position.set(hingeSign * (leafW - 0.15), -0.06, 0.05);
      pivot.add(handle);
      const handle2 = handle.clone();
      handle2.position.z = -0.05;
      pivot.add(handle2);
      if (s.glass) {
        const rail = new THREE.Mesh(boxGeo(leafW - 0.01, 0.12, this.thickness + 0.02, 1), getMaterial('frame'));
        rail.position.set((leafW / 2) * hingeSign, -this.h / 2 + 0.1, 0);
        pivot.add(rail);
        const rail2 = rail.clone(); rail2.position.y = this.h / 2 - 0.1;
        pivot.add(rail2);
      }
      return pivot;
    };

    const c = this.center();
    this.group.position.set(c.x, this.floorY + this.h / 2 + 0.01, c.z);
    if (this.edge.dir === 'v') this.group.rotation.y = Math.PI / 2; // slab along z

    if (s.double) {
      this.leafA = makeLeaf(1);  // hinge at -w/2 side
      this.leafA.position.x = -this.w / 2;
      this.leafB = makeLeaf(-1); // hinge at +w/2 side
      this.leafB.position.x = this.w / 2;
      this.group.add(this.leafA, this.leafB);
    } else {
      this.leafA = makeLeaf(1);
      this.leafA.position.x = -this.w / 2;
      this.group.add(this.leafA);
    }
  }

  _leafBoxes() {
    // compute world AABBs of leaves for collision
    const e = this.edge;
    const boxes = [];
    const t = this.thickness + 0.04;
    const y0 = this.floorY, y1 = this.floorY + this.h;
    const leaves = this.style.double
      ? [{ hinge: this.at - this.w / 2, sign: 1 }, { hinge: this.at + this.w / 2, sign: -1 }]
      : [{ hinge: this.at - this.w / 2, sign: 1 }];
    for (const leaf of leaves) {
      const len = this.style.double ? this.w / 2 : this.w;
      const ang = this.angle * leaf.sign;
      // direction along wall when closed; rotates toward outward normal
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // endpoint offset in (along, normal) space
      const dAlong = len * ca * leaf.sign;
      const dNorm = len * sa;
      let minA = Math.min(leaf.hinge, leaf.hinge + dAlong) - t / 2;
      let maxA = Math.max(leaf.hinge, leaf.hinge + dAlong) + t / 2;
      let minN = Math.min(0, dNorm) - t / 2;
      let maxN = Math.max(0, dNorm) + t / 2;
      if (e.dir === 'v') {
        boxes.push({ min: { x: e.coord + minN, y: y0, z: minA }, max: { x: e.coord + maxN, y: y1, z: maxA } });
      } else {
        boxes.push({ min: { x: minA, y: y0, z: e.coord + minN }, max: { x: maxA, y: y1, z: e.coord + maxN } });
      }
    }
    return boxes;
  }

  _shutterBox() {
    const e = this.edge;
    const opening = this.h * this.lift;
    const y0 = this.floorY + opening, y1 = this.floorY + this.h + 0.1;
    const t = 0.1;
    if (e.dir === 'v') {
      return [{ min: { x: e.coord - t, y: y0, z: this.at - this.w / 2 }, max: { x: e.coord + t, y: y1, z: this.at + this.w / 2 } }];
    }
    return [{ min: { x: this.at - this.w / 2, y: y0, z: e.coord - t }, max: { x: this.at + this.w / 2, y: y1, z: e.coord + t } }];
  }

  _updateColliders(first = false) {
    const world = this.game.world.collision;
    const boxes = this.style.shutter ? this._shutterBox() : this._leafBoxes();
    if (first) {
      for (const b of boxes) {
        const cb = world.addBox(b.min, b.max, {
          tag: 'door', material: this.style.metal ? 'metal' : 'wood',
          penetrable: !this.style.metal, ref: this,
        });
        this.colliders.push(cb);
      }
    } else {
      boxes.forEach((b, i) => { if (this.colliders[i]) world.updateBox(this.colliders[i], b.min, b.max); });
    }
  }

  get isOpen() { return this.style.shutter ? this.lift > 0.85 : Math.abs(this.angle) > this.openAngle * 0.8; }
  get isClosed() { return this.style.shutter ? this.lift < 0.02 : Math.abs(this.angle) < 0.03; }
  get isMoving() { return this.moving; }

  // side: +1|-1 relative to wall normal; opens away from the requester
  open(side = 1) {
    if (this.locked) { bus.emit('door-locked', this); return false; }
    if (this.style.shutter) this.targetLift = 1;
    else this.targetAngle = this.openAngle * (side >= 0 ? 1 : -1);
    if (this.style.autoClose > 0) this.autoCloseT = this.style.autoClose;
    bus.emit('door-opening', this);
    return true;
  }

  close() {
    if (this.style.shutter) this.targetLift = 0;
    else this.targetAngle = 0;
    bus.emit('door-closing', this);
    return true;
  }

  toggle(fromPos) {
    if (this.locked) { bus.emit('door-locked', this); return false; }
    if (!this.isClosed) return this.close();
    // open away from the interactor
    let side = 1;
    if (fromPos) {
      const c = this.center();
      const d = this.edge.dir === 'v' ? fromPos.x - c.x : fromPos.z - c.z;
      side = d > 0 ? -1 : 1;
    }
    return this.open(side);
  }

  unlock() {
    if (!this.locked) return;
    this.locked = false;
    if (this.state === 'locked') this.state = 'closed';
    bus.emit('door-unlocked', this);
  }

  update(dt) {
    const s = this.style;
    let moved = false;
    if (s.shutter) {
      const prev = this.lift;
      this.lift += Math.sign(this.targetLift - this.lift) * Math.min(Math.abs(this.targetLift - this.lift), s.speed * dt * 0.45);
      if (Math.abs(this.lift - prev) > 1e-5) {
        moved = true;
        this.slab.position.y = this.h / 2 + this.lift * (this.h - 0.15);
        this.slab.scale.y = Math.max(0.06, 1 - this.lift * 0.94);
        this.slab.position.y = this.floorY - this.group.position.y + this.lift * this.h + (this.h * this.slab.scale.y) / 2;
      }
    } else {
      const prev = this.angle;
      const diff = this.targetAngle - this.angle;
      if (Math.abs(diff) > 1e-4) {
        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), s.speed * dt);
        moved = true;
        // visual rotation is opposite-signed vs the collision model's normal
        this.leafA.rotation.y = -this.angle;
        if (this.leafB) this.leafB.rotation.y = this.angle;
      }
      if (this.autoCloseT > 0 && this.targetAngle !== 0) {
        this.autoCloseT -= dt;
        if (this.autoCloseT <= 0) this.close();
      }
    }
    if (moved) {
      this._updateColliders();
      this.moving = true;
    } else if (this.moving) {
      this.moving = false;
      if (this.isOpen) { this.state = 'open'; bus.emit('door-opened', this); }
      else if (this.isClosed) { this.state = this.locked ? 'locked' : 'closed'; bus.emit('door-closed', this); }
    }
  }

  interactPrompt() {
    if (this.locked) return `${this.name} — Locked${this.keycard ? ' (requires keycard)' : ''}`;
    return `${this.isClosed ? 'Open' : 'Close'} ${this.name}`;
  }

  stateInfo() {
    const c = this.center();
    return {
      id: this.id, name: this.name, type: this.type,
      state: this.moving ? (this.targetAngle !== 0 || this.targetLift > 0 ? 'opening' : 'closing') : this.state,
      locked: this.locked,
      pos: [round2(c.x), round2(this.floorY), round2(c.z)],
    };
  }
}

function round2(v) { return Math.round(v * 100) / 100; }
