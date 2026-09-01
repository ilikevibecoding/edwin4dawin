// First-person hand / held block with swing, equip and bobbing animations.
import * as THREE from 'three';
import { BLOCKS } from './blocks.js';
import { tileUV } from './textures.js';
import { makeEntityMaterial, canvasTexture } from './entityMaterial.js';

function makeArmTexture() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c69b74'; ctx.fillRect(0, 0, 16, 16); // skin
  ctx.fillStyle = '#b98a63';
  for (let i = 0; i < 20; i++) ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
  ctx.fillStyle = '#4a6ea8'; ctx.fillRect(0, 0, 16, 7); // sleeve (blue shirt)
  ctx.fillStyle = '#3d5c8c'; ctx.fillRect(0, 5, 16, 2);
  return canvasTexture(c);
}

function blockGeometry(id) {
  const def = BLOCKS[id];
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], nrm = [], idx = [];
  const flat = def.icon === 'flat';
  const h = def.icon === 'slab' ? 0.5 : 1;
  const faces = [
    { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], uv: (x, y, z) => [1 - z, 1 - y] },
    { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], uv: (x, y, z) => [z, 1 - y] },
    { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uv: (x, y, z) => [x, z] },
    { n: [0, -1, 0], v: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]], uv: (x, y, z) => [1 - x, z] },
    { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uv: (x, y, z) => [x, 1 - y] },
    { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uv: (x, y, z) => [1 - x, 1 - y] },
  ];
  if (flat) {
    const [tu, tv, ts] = tileUV(def.tex[0]);
    for (let side = 0; side < 2; side++) {
      const q = [[0, 0, 0.5], [1, 0, 0.5], [1, 1, 0.5], [0, 1, 0.5]];
      const order = side ? [3, 2, 1, 0] : [0, 1, 2, 3];
      const base = pos.length / 3;
      for (const k of order) { const p = q[k]; pos.push(p[0] - 0.5, p[1] - 0.5, 0); nrm.push(0, 0, side ? -1 : 1); uv.push(tu + p[0] * ts, tv + (1 - p[1]) * ts); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  } else {
    for (let d = 0; d < 6; d++) {
      const f = faces[d];
      const [tu, tv, ts] = tileUV(def.tex[d]);
      const base = pos.length / 3;
      for (const vv of f.v) {
        pos.push(vv[0] - 0.5, vv[1] * h - 0.5, vv[2] - 0.5);
        nrm.push(f.n[0], f.n[1], f.n[2]);
        const [u, v] = f.uv(vv[0], vv[1], vv[2]);
        uv.push(tu + u * ts, tv + v * ts);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export class Hand {
  constructor(atlas) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 10);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.blockMat = makeEntityMaterial(atlas);
    this.armMat = makeEntityMaterial(makeArmTexture());
    this.blockMesh = null;
    this.blockId = -1;
    const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    armGeo.translate(0, 0.4, 0);
    this.arm = new THREE.Mesh(armGeo, this.armMat);
    this.armGroup = new THREE.Group();
    this.armGroup.add(this.arm);
    this.root.add(this.armGroup);
    this.swing = 0; // 0..1 progress, 0 = idle
    this.swinging = false;
    this.equip = 1;
    this.lastId = -2;
    this.geoCache = new Map();
  }

  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  startSwing() { if (!this.swinging) { this.swinging = true; this.swing = 0; } }

  setFov(fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }

  update(dt, heldId, light, bob, viewBobbing) {
    if (heldId !== this.lastId) {
      this.lastId = heldId;
      this.equip = 0;
      if (this.blockMesh) { this.root.remove(this.blockMesh); this.blockMesh = null; }
      if (heldId) {
        let g = this.geoCache.get(heldId);
        if (!g) { g = blockGeometry(heldId); this.geoCache.set(heldId, g); }
        this.blockMesh = new THREE.Mesh(g, this.blockMat);
        this.root.add(this.blockMesh);
      }
    }
    this.equip = Math.min(1, this.equip + dt * 3.5);
    if (this.swinging) {
      this.swing += dt * 3.3;
      if (this.swing >= 1) { this.swing = 0; this.swinging = false; }
    }
    this.blockMat.uniforms.uLight.value.set(light[0], light[1]);
    this.armMat.uniforms.uLight.value.set(light[0], light[1]);

    const f = this.swing;
    const f1 = Math.sin(Math.sqrt(f) * Math.PI);
    const f2 = Math.sin(f * Math.PI);
    const eq = 1 - this.equip;
    const bx = viewBobbing ? bob.tx * 1.5 : 0, by = viewBobbing ? bob.ty * 1.5 : 0;
    if (this.blockMesh) {
      this.armGroup.visible = false;
      const m = this.blockMesh;
      const def = BLOCKS[heldId];
      m.position.set(0.56 - 0.4 * f1 + bx, -0.52 + 0.2 * Math.sin(Math.sqrt(f) * Math.PI * 2) - eq * 0.6 + by, -0.72 - 0.2 * f2);
      m.rotation.set(0, Math.PI / 4, 0);
      m.rotateOnAxis(new THREE.Vector3(0, 0, 1), -f1 * 0.6);
      m.rotateOnAxis(new THREE.Vector3(1, 0, 0), -f1 * 0.4);
      const s = def.icon === 'flat' ? 0.45 : 0.4;
      m.scale.set(s, s, s);
      if (def.icon === 'flat') m.rotation.set(0, Math.PI / 4 + 0.3, 0);
    } else {
      this.armGroup.visible = true;
      const g = this.armGroup;
      const base = new THREE.Vector3(0.62 + bx, -0.72 - eq * 0.6 + by, -0.55);
      const tip = new THREE.Vector3(0.28 - 0.35 * f1, -0.28 + 0.15 * f2 - eq * 0.6, -1.0 - 0.1 * f2);
      g.position.copy(base);
      const dir = tip.clone().sub(base).normalize();
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.rotateY(0.6);
    }
  }
}
