import * as THREE from 'three';
import { getTextures } from './textures.js';

const MAX_PARTICLES = 700;
const MAX_TRACERS = 28;

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.time = 0;

    // particles (one Points draw call)
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    this.pVel = new Float32Array(MAX_PARTICLES * 3);
    this.pLife = new Float32Array(MAX_PARTICLES);
    this.pGrav = new Float32Array(MAX_PARTICLES);
    this.pNext = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) this.pPos[i * 3 + 1] = -1000;
    const geo = new THREE.BufferGeometry();
    this.pPosAttr = new THREE.BufferAttribute(this.pPos, 3);
    this.pColAttr = new THREE.BufferAttribute(this.pCol, 3);
    geo.setAttribute('position', this.pPosAttr);
    geo.setAttribute('color', this.pColAttr);
    const mat = new THREE.PointsMaterial({ size: 0.26, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // tracers
    this.tracerGeo = new THREE.BoxGeometry(0.05, 0.05, 1);
    this.tracers = [];
    for (let i = 0; i < MAX_TRACERS; i++) {
      const m = new THREE.Mesh(this.tracerGeo, new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false;
      scene.add(m);
      this.tracers.push({ mesh: m, life: 0, max: 1 });
    }

    // muzzle flash sprite
    const flashMat = new THREE.SpriteMaterial({ map: getTextures().glow, color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.scale.setScalar(0.7);
    this.flash.visible = false;
    this.flashLife = 0;
    scene.add(this.flash);

    this.dmgContainer = document.getElementById('damage-numbers');
    this.hitmarker = document.getElementById('hitmarker');
    this._hmTimer = null;
    this._v = new THREE.Vector3();
    this.shake = 0;
  }

  burst(pos, color, count = 10, speed = 3, gravity = 9, life = 0.6) {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.pNext;
      this.pNext = (this.pNext + 1) % MAX_PARTICLES;
      this.pPos[i * 3] = pos.x;
      this.pPos[i * 3 + 1] = pos.y;
      this.pPos[i * 3 + 2] = pos.z;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.8);
      this.pVel[i * 3] = Math.sin(ph) * Math.cos(th) * s;
      this.pVel[i * 3 + 1] = Math.abs(Math.cos(ph)) * s + speed * 0.3;
      this.pVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * s;
      const shade = 0.7 + Math.random() * 0.5;
      this.pCol[i * 3] = Math.min(1, c.r * shade);
      this.pCol[i * 3 + 1] = Math.min(1, c.g * shade);
      this.pCol[i * 3 + 2] = Math.min(1, c.b * shade);
      this.pLife[i] = life * (0.6 + Math.random() * 0.6);
      this.pGrav[i] = gravity;
    }
  }

  tracer(from, to, color = 0xfff1b0) {
    let t = this.tracers.find((x) => x.life <= 0);
    if (!t) t = this.tracers[0];
    const len = from.distanceTo(to);
    if (len < 0.2) return;
    t.mesh.visible = true;
    t.mesh.position.copy(from).add(to).multiplyScalar(0.5);
    t.mesh.lookAt(to);
    t.mesh.scale.set(1, 1, len);
    t.mesh.material.color.setHex(color);
    t.mesh.material.opacity = 0.85;
    t.life = 0.09;
    t.max = 0.09;
  }

  muzzleFlash(pos) {
    this.flash.position.copy(pos);
    this.flash.visible = true;
    this.flash.material.rotation = Math.random() * Math.PI;
    this.flashLife = 0.045;
  }

  addShake(amount) {
    this.shake = Math.min(1, this.shake + amount);
  }

  damageNumber(worldPos, text, cls = '') {
    this._v.copy(worldPos).project(this.camera);
    if (this._v.z > 1) return;
    const x = (this._v.x * 0.5 + 0.5) * window.innerWidth + (Math.random() - 0.5) * 40;
    const y = (-this._v.y * 0.5 + 0.5) * window.innerHeight + (Math.random() - 0.5) * 20;
    const el = document.createElement('div');
    el.className = `dmg ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.dmgContainer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  hitMarker(head = false) {
    const hm = this.hitmarker;
    hm.classList.add('show');
    hm.classList.toggle('head', head);
    clearTimeout(this._hmTimer);
    this._hmTimer = setTimeout(() => hm.classList.remove('show'), 90);
  }

  update(dt) {
    this.time += dt;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.pLife[i] <= 0) continue;
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) {
        this.pPos[i * 3 + 1] = -1000;
        continue;
      }
      this.pVel[i * 3 + 1] -= this.pGrav[i] * dt;
      this.pPos[i * 3] += this.pVel[i * 3] * dt;
      this.pPos[i * 3 + 1] += this.pVel[i * 3 + 1] * dt;
      this.pPos[i * 3 + 2] += this.pVel[i * 3 + 2] * dt;
    }
    this.pPosAttr.needsUpdate = true;
    this.pColAttr.needsUpdate = true;

    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) t.mesh.visible = false;
      else t.mesh.material.opacity = 0.85 * (t.life / t.max);
    }
    if (this.flashLife > 0) {
      this.flashLife -= dt;
      if (this.flashLife <= 0) this.flash.visible = false;
    }
    this.shake = Math.max(0, this.shake - dt * 3.5);
  }
}
