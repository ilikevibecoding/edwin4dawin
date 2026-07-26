// Lighting rig: cold winter sun + sky hemisphere + pooled interior lights
// repositioned to the fixtures nearest the player (constant light count so
// shaders never recompile mid-game). Quality presets set the pool size.
import * as THREE from 'three';
import { settings } from '../core/settings.js';

const STYLE_LIGHT = {
  lobby: { color: 0xdfe8f2, intensity: 26, dist: 12 },
  office: { color: 0xe8f0e9, intensity: 18, dist: 9 },
  conference: { color: 0xeaf0ea, intensity: 18, dist: 9 },
  exec: { color: 0xf5dfc0, intensity: 16, dist: 9 },
  kitchen: { color: 0xf0ecdf, intensity: 18, dist: 9 },
  corridor: { color: 0xdfe8e4, intensity: 12, dist: 8 },
  restroom: { color: 0xe4ecf0, intensity: 14, dist: 7 },
  archive: { color: 0xdfe4d9, intensity: 14, dist: 9 },
  server: { color: 0x9fc4e8, intensity: 14, dist: 9 },
  security: { color: 0xdfe8f0, intensity: 15, dist: 8 },
  service: { color: 0xe8d9b8, intensity: 12, dist: 8 },
  garage: { color: 0xe8dfc8, intensity: 22, dist: 12 },
  utility: { color: 0xe8d9b8, intensity: 10, dist: 7 },
  stairwell: { color: 0xdfe8e4, intensity: 14, dist: 9 },
};

export class Lighting {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.rig = new THREE.Group();
    this.rig.name = 'lighting';
    this.pool = [];
    this.fixtures = [];
    this.scenario = 'default';
    this._reassignT = 0;
    this._build();
  }

  _build() {
    const q = settings.quality();

    // cold daylight from the north-west, low winter angle
    this.sun = new THREE.DirectionalLight(0xcfe0f2, 2.6);
    this.sun.position.set(-46, 34, -38);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = q.shadows;
    this.sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    this.sun.shadow.camera.left = -65;
    this.sun.shadow.camera.right = 65;
    this.sun.shadow.camera.top = 65;
    this.sun.shadow.camera.bottom = -65;
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.06;
    this.rig.add(this.sun, this.sun.target);

    // snow-sky ambience
    this.hemi = new THREE.HemisphereLight(0xb9cde2, 0x3f4347, 0.85);
    this.rig.add(this.hemi);

    this.scene.add(this.rig);
    this.scene.fog = new THREE.Fog(0xa9bccc, 60, 220);
    this.scene.background = new THREE.Color(0xa9bccc);

    this._buildPool();
  }

  _buildPool() {
    for (const l of this.pool) this.rig.remove(l);
    this.pool = [];
    const q = settings.quality();
    for (let i = 0; i < q.maxDynamicLights; i++) {
      const p = new THREE.PointLight(0xffffff, 0, 9, 2);
      p.castShadow = false;
      this.rig.add(p);
      this.pool.push(p);
    }
    this._reassignT = 0;
  }

  setFixtures(list) {
    this.fixtures = list || [];
    this._reassignT = 0;
  }

  setScenario(name) {
    this.scenario = name;
    if (name === 'night') {
      this.sun.intensity = 0.25;
      this.hemi.intensity = 0.25;
      this.scene.background = new THREE.Color(0x1c2733);
    } else if (name === 'neutral') {
      this.sun.intensity = 1.4;
      this.hemi.intensity = 1.5;
    } else {
      this.sun.intensity = 2.6;
      this.hemi.intensity = 0.85;
      this.scene.background = new THREE.Color(0xa9bccc);
    }
  }

  update(dt) {
    this._reassignT -= dt;
    if (this._reassignT > 0) return;
    this._reassignT = 0.5;
    const p = this.game.player;
    if (!p || !this.fixtures.length) return;
    const px = p.pos.x, py = p.pos.y, pz = p.pos.z;
    const scored = this.fixtures
      .map((f) => ({ f, d: (f.x - px) ** 2 + (f.z - pz) ** 2 + (f.y - py) ** 2 * 0.6 }))
      .sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.pool.length; i++) {
      const light = this.pool[i];
      const s = scored[i];
      if (!s) { light.intensity = 0; continue; }
      const st = STYLE_LIGHT[s.f.style] || STYLE_LIGHT.office;
      light.position.set(s.f.x, s.f.y - 0.15, s.f.z);
      light.color.setHex(st.color);
      light.intensity = st.intensity;
      light.distance = st.dist;
    }
  }

  applyQuality() {
    const q = settings.quality();
    this.sun.castShadow = q.shadows;
    this.sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this._buildPool();
  }
}
