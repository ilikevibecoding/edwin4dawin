// Breakable glass panes: intact -> cracked -> broken, with fragments and state reset.
import * as THREE from 'three';
import { getMaterial } from '../materials/index.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';

export class GlassPane {
  constructor({ id, cx, cz, y0, y1, w, axis, world, scene, kind = 'glassClear', frosted = false }) {
    this.id = id;
    this.axis = axis; // wall axis: 'x' => pane spans z
    this.world = world;
    this.scene = scene;
    this.center = new THREE.Vector3(cx, (y0 + y1) / 2, cz);
    this.w = w;
    this.h = y1 - y0;
    this.state = 'intact'; // intact | cracked | broken
    this.hp = 2;
    const t = 0.024;
    const geo = new THREE.BoxGeometry(axis === 'x' ? t : w, this.h, axis === 'x' ? w : t);
    this.mesh = new THREE.Mesh(geo, getMaterial(kind));
    this.mesh.position.copy(this.center);
    scene.add(this.mesh);
    this.crackSprite = null;
    this.shards = null;
    this.collider = world.add({
      min: { x: cx - (axis === 'x' ? 0.05 : w / 2), y: y0, z: cz - (axis === 'x' ? w / 2 : 0.05) },
      max: { x: cx + (axis === 'x' ? 0.05 : w / 2), y: y1, z: cz + (axis === 'x' ? w / 2 : 0.05) },
      material: 'glass', tag: 'glass', ref: this,
      blockSight: frosted, blockMove: true, blockShot: true, thin: 0.03,
    });
  }

  hit(point) {
    if (this.state === 'broken') return;
    this.hp--;
    if (this.hp === 1) {
      this.state = 'cracked';
      this._showCracks(point);
      audio.impact('glass', this.center);
      bus.emit('glass-state', { id: this.id, state: 'cracked' });
    } else if (this.hp <= 0) {
      this.break_();
    }
  }

  break_() {
    if (this.state === 'broken') return;
    this.state = 'broken';
    this.mesh.visible = false;
    if (this.crackSprite) this.crackSprite.visible = false;
    this._spawnEdgeShards();
    this.collider.blockShot = false;
    this.collider.blockMove = false; // sill/frame colliders still prevent walking through windows
    audio.glassBreak(this.center);
    bus.emit('glass-state', { id: this.id, state: 'broken' });
    bus.emit('glass-broken', { pos: this.center.clone(), axis: this.axis, w: this.w, h: this.h });
    bus.emit('noise', { pos: this.center, radius: 22, type: 'glass' });
  }

  _showCracks(point) {
    if (this.crackSprite) { this.crackSprite.visible = true; return; }
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(235,245,250,0.85)';
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      g.beginPath();
      g.moveTo(128, 128);
      let x = 128, y = 128;
      const segs = 3 + (i % 3);
      for (let s = 0; s < segs; s++) {
        x += Math.cos(a + (Math.random() - 0.5) * 0.7) * (18 + Math.random() * 26);
        y += Math.sin(a + (Math.random() - 0.5) * 0.7) * (18 + Math.random() * 26);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let r = 8; r < 40; r += 10) {
      g.beginPath();
      g.arc(128, 128, r + Math.random() * 4, 0, Math.PI * 2);
      g.globalAlpha = 0.5;
      g.stroke();
      g.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.9 });
    const size = Math.min(this.w, this.h) * 0.9;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    plane.position.copy(this.center);
    if (point) {
      plane.position.y = Math.max(this.center.y - this.h / 2 + size / 2, Math.min(point.y, this.center.y + this.h / 2 - size / 2));
    }
    plane.rotation.y = this.axis === 'x' ? Math.PI / 2 : 0;
    plane.position.add(new THREE.Vector3(this.axis === 'x' ? 0.02 : 0, 0, this.axis === 'x' ? 0 : 0.02));
    this.scene.add(plane);
    this.crackSprite = plane;
  }

  _spawnEdgeShards() {
    if (this.shards) { this.shards.visible = true; return; }
    const group = new THREE.Group();
    const mat = getMaterial('glassClear');
    const n = Math.max(4, Math.floor(this.w * 5));
    for (let i = 0; i < n; i++) {
      const along = -this.w / 2 + (i + 0.5) * (this.w / n);
      const hh = 0.05 + Math.random() * 0.16;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.035, hh, 3), mat);
      const bottom = Math.random() < 0.6;
      shard.position.set(
        this.center.x + (this.axis === 'x' ? 0 : along),
        bottom ? this.center.y - this.h / 2 + hh / 2 : this.center.y + this.h / 2 - hh / 2,
        this.center.z + (this.axis === 'x' ? along : 0),
      );
      if (!bottom) shard.rotation.x = Math.PI;
      group.add(shard);
    }
    this.scene.add(group);
    this.shards = group;
  }

  reset() {
    this.state = 'intact';
    this.hp = 2;
    this.mesh.visible = true;
    if (this.crackSprite) this.crackSprite.visible = false;
    if (this.shards) this.shards.visible = false;
    this.collider.blockShot = true;
    this.collider.blockMove = true;
  }
}
