// VFX system (Fable 4 domain — art pass): family-styled muzzle flashes, per-material impact
// debris, per-family shell casings, subtle tracers, dense held-shape smoke volumes, flash
// bursts with lingering sparkle, restrained blood + floor decals (respects reducedBlood),
// sunbeam dust motes and ambient snowfall. Pooled sprites/meshes, cosmetic RNG only, scaled
// by the renderer profile's particle quality scalar.
import * as THREE from 'three';
import { cosmeticRng } from '../core/rng.js';
import { settings } from '../core/settings.js';
import { audio } from '../core/audio.js';
import { registerAsset } from '../core/assets.js';
import { getFireFamily } from './firecontext.js';

// mirror of the renderer quality profiles' `particles` scalar
const PARTICLE_SCALE = { low: 0.4, medium: 0.7, high: 1.0, ultra: 1.3 };
const qScale = () => PARTICLE_SCALE[settings.get('quality')] ?? 1.0;

// ---------------------------------------------------------------------------
function softCircleTexture(inner = 0.2, rgb = '255,255,255') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(inner, `rgba(${rgb},0.55)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// spiky star flash (rifle) / cross flash (pistol) textures
function starTexture(points, innerR = 4, outerR = 30, rot = 0) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  g.rotate(rot);
  const grad = g.createRadialGradient(0, 0, 1, 0, 0, outerR);
  grad.addColorStop(0, 'rgba(255,246,224,1)');
  grad.addColorStop(0.35, 'rgba(255,214,150,0.9)');
  grad.addColorStop(1, 'rgba(255,160,60,0)');
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (points * 2)) * Math.PI * 2;
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  // hot core
  const core = g.createRadialGradient(0, 0, 0, 0, 0, innerR * 2.4);
  core.addColorStop(0, 'rgba(255,255,244,1)');
  core.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = core;
  g.fillRect(-32, -32, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function sparkleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.translate(16, 16);
  g.fillStyle = 'rgba(255,255,255,0.95)';
  for (const rot of [0, Math.PI / 4]) {
    g.save();
    g.rotate(rot);
    g.beginPath();
    g.moveTo(0, -14); g.lineTo(2, -2); g.lineTo(14, 0); g.lineTo(2, 2);
    g.lineTo(0, 14); g.lineTo(-2, 2); g.lineTo(-14, 0); g.lineTo(-2, -2);
    g.closePath();
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.6)';
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// impact debris palette + behavior per surface material
const IMPACTS = {
  concrete: { color: '#b7b3ab', dust: 0.62, dustScale: 0.4, chips: 4, chipColor: '#8f8b83', gravity: 9.8 },
  tile:     { color: '#c9c6bd', dust: 0.5, dustScale: 0.34, chips: 3, chipColor: '#a5a29a', gravity: 9.8 },
  drywall:  { color: '#e2dccd', dust: 0.8, dustScale: 0.55, chips: 2, chipColor: '#cfc8b6', gravity: 7 },
  wood:     { color: '#9a7a52', dust: 0.4, dustScale: 0.3, chips: 5, chipColor: '#7a5b3e', gravity: 9.8, splinter: true },
  metal:    { color: '#ffd27a', dust: 0.22, dustScale: 0.2, chips: 6, chipColor: '#ffcf7a', gravity: 6, spark: true },
  glass:    { color: '#cfe8f2', dust: 0.3, dustScale: 0.24, chips: 5, chipColor: '#dff2fa', gravity: 9.8, glitter: true },
  carpet:   { color: '#8a8578', dust: 0.55, dustScale: 0.3, chips: 3, chipColor: '#6f6a5e', gravity: 4.5, fluff: true },
  snow:     { color: '#eef4f8', dust: 0.85, dustScale: 0.55, chips: 3, chipColor: '#ffffff', gravity: 5, fluff: true },
  flesh:    { color: '#5e1512', dust: 0.6, dustScale: 0.24, chips: 0, chipColor: '#5e1512', gravity: 9.8 },
};

// per-family casing dimensions [radius, length] + tint
const CASINGS = {
  pistol:  { r: 0.0052, len: 0.018, color: 0xc8a34a },
  smg:     { r: 0.0055, len: 0.02, color: 0xc8a34a },
  rifle:   { r: 0.0062, len: 0.029, color: 0xcaa64e },
  sniper:  { r: 0.0075, len: 0.04, color: 0xcaa64e },
  shotgun: { r: 0.0098, len: 0.032, color: 0x3d5a45, brassBase: true },
};

export class VfxSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'vfx';
    scene.add(this.group);
    this.puffTex = softCircleTexture(0.3);
    this.glowTex = softCircleTexture(0.12);
    this.starTex = starTexture(6, 4, 30);
    this.crossTex = starTexture(4, 3, 26, Math.PI / 4);
    this.wideTex = starTexture(8, 8, 30);
    this.sparkTex = sparkleTexture();
    this.items = []; // {obj, life, ttl, update}
    this.smokes = []; // active smoke volumes {pos, radius, ttl}
    this.decals = []; // pooled floor decals (oldest recycled)
    this.casingMats = new Map();
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.6 });
    this.flashLight = new THREE.PointLight(0xffca7a, 0, 7, 2);
    this.group.add(this.flashLight);
    this.flashT = 0;
    this.flashDecay = 14; // per-effect: muzzle pops die in a frame or two, flashbangs linger
    this.flashPower = 26; // per-effect intensity scale (muzzle pops need more punch to read)
    this._initSnow();
    this._initDust();
  }

  _spawn(obj, ttl, update) {
    this.group.add(obj);
    this.items.push({ obj, life: 0, ttl, update });
  }

  update(dt, camera) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life += dt;
      const k = it.life / it.ttl;
      if (k >= 1) {
        this.group.remove(it.obj);
        it.obj.traverse?.((o) => { o.geometry?.dispose?.(); });
        this.items.splice(i, 1);
      } else {
        it.update?.(it, k, dt);
      }
    }
    this.flashT = Math.max(0, this.flashT - dt * this.flashDecay);
    this.flashLight.intensity = this.flashT * this.flashPower;
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      this.smokes[i].ttl -= dt;
      if (this.smokes[i].ttl <= 0) this.smokes.splice(i, 1);
    }
    this._updateSnow(dt, camera);
    this._updateDust(dt, camera);
  }

  clear() {
    for (const it of this.items) this.group.remove(it.obj);
    this.items.length = 0;
    this.smokes.length = 0;
    for (const d of this.decals) this.group.remove(d.mesh);
    this.decals.length = 0;
  }

  // ---------- weapon effects ----------
  muzzleFlash(pos, dir, scale = 1) {
    const q = qScale();
    const family = getFireFamily();
    let tex = this.starTex, size = 0.28, smoke = 0.32;
    if (family === 'pistol') { tex = this.crossTex; size = 0.17; smoke = 0.24; }
    else if (family === 'smg') { tex = this.starTex; size = 0.22; smoke = 0.28; }
    else if (family === 'shotgun') { tex = this.wideTex; size = 0.4; smoke = 0.45; }
    else if (family === 'sniper') { tex = this.starTex; size = 0.42; smoke = 0.4; }
    const roll = cosmeticRng.next() * Math.PI * 2;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xffe6bc, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, rotation: roll,
    }));
    s.position.copy(pos).addScaledVector(dir, 0.02);
    s.scale.setScalar(size * scale * (0.85 + cosmeticRng.next() * 0.4));
    this._spawn(s, 0.055, (it, k) => { it.obj.material.opacity = 1 - k * k; });
    // hot core
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: 0xfff4dc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    core.position.copy(pos);
    core.scale.setScalar(size * 0.45 * scale);
    this._spawn(core, 0.04, (it, k) => { it.obj.material.opacity = 1 - k; });
    // forward spike for long guns
    if (family !== 'pistol' && q > 0.5) {
      const spike = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTex, color: 0xffd9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      spike.position.copy(pos).addScaledVector(dir, size * 0.5);
      spike.scale.setScalar(size * 0.55);
      this._spawn(spike, 0.05, (it, k) => { it.obj.material.opacity = 0.8 * (1 - k); });
    }
    this.flashLight.position.copy(pos);
    // single-frame flicker: fast decay + per-shot intensity jitter so bursts strobe;
    // high power so the pop visibly licks nearby walls/enemies in dark zones
    this.flashDecay = 34;
    this.flashPower = 110;
    this.flashT = Math.max(this.flashT,
      (family === 'shotgun' ? 1.2 : 0.9) * scale * (0.8 + cosmeticRng.next() * 0.45) * Math.min(1, q + 0.3));
    // brief barrel smoke wisp
    const wisp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.puffTex, color: 0x9aa0a4, transparent: true, opacity: smoke, depthWrite: false,
    }));
    wisp.position.copy(pos).addScaledVector(dir, 0.14);
    wisp.scale.setScalar(0.12);
    const drift = dir.clone().multiplyScalar(0.35);
    this._spawn(wisp, 0.55, (it, k, dtl) => {
      it.obj.material.opacity = smoke * (1 - k);
      it.obj.scale.setScalar(0.12 + k * 0.5);
      it.obj.position.addScaledVector(drift, dtl);
      it.obj.position.y += dtl * 0.22;
    });
  }

  tracer(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 1.2) return;
    dir.normalize();
    const seg = Math.min(2.2, len * 0.32);
    const geo = new THREE.BoxGeometry(0.005, 0.005, seg);
    const m = new THREE.Mesh(geo, this.tracerMat.clone());
    m.position.copy(from).addScaledVector(dir, seg / 2 + 0.4);
    m.lookAt(to.x, to.y, to.z);
    const speed = 170;
    this._spawn(m, Math.min(0.18, (len - seg) / speed), (it, k, dtl) => {
      it.obj.position.addScaledVector(dir, speed * dtl);
      it.obj.material.opacity = 0.6 * (1 - k * 0.7);
    });
  }

  impact(point, normal, material) {
    const conf = IMPACTS[material] || IMPACTS.concrete;
    if (material === 'flesh' && settings.get('reducedBlood')) return;
    const q = qScale();
    const n = new THREE.Vector3(normal.x, normal.y, normal.z);
    const p = new THREE.Vector3(point.x, point.y, point.z).addScaledVector(n, 0.02);
    // per-hit value jitter keeps debris matched to the shaded surface instead of a flat swatch
    const tint = 0.86 + cosmeticRng.next() * 0.24;
    // dust / powder puff
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.puffTex, color: new THREE.Color(conf.color).multiplyScalar(tint), transparent: true, opacity: conf.dust, depthWrite: false,
    }));
    puff.position.copy(p);
    puff.scale.setScalar(0.09);
    this._spawn(puff, material === 'drywall' ? 0.55 : 0.42, (it, k) => {
      it.obj.material.opacity = conf.dust * (1 - k);
      it.obj.scale.setScalar(0.09 + k * conf.dustScale);
      it.obj.position.addScaledVector(n, k * 0.012);
      it.obj.position.y += k * 0.008;
    });
    // metal: spark ring flash
    if (conf.spark) {
      const ring = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.sparkTex, color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      ring.position.copy(p);
      ring.scale.setScalar(0.1);
      this._spawn(ring, 0.12, (it, k) => {
        it.obj.material.opacity = 1 - k;
        it.obj.scale.setScalar(0.1 + k * 0.22);
      });
    }
    // debris chips / sparks / splinters / glitter / fluff
    const chips = Math.round(conf.chips * Math.max(0.4, q));
    for (let i = 0; i < chips; i++) {
      let geo, matl, speed, spin = 10 + cosmeticRng.next() * 10, ttl = 0.4 + cosmeticRng.next() * 0.25;
      if (conf.spark) {
        geo = new THREE.BoxGeometry(0.008, 0.008, 0.05 + cosmeticRng.next() * 0.04);
        matl = new THREE.MeshBasicMaterial({ color: 0xffcf7a });
        speed = 3.2 + cosmeticRng.next() * 1.6;
        ttl = 0.25 + cosmeticRng.next() * 0.2;
      } else if (conf.splinter) {
        geo = new THREE.BoxGeometry(0.006, 0.006, 0.03 + cosmeticRng.next() * 0.045);
        matl = new THREE.MeshBasicMaterial({ color: new THREE.Color(conf.chipColor).multiplyScalar(tint) });
        speed = 1.9;
      } else if (conf.glitter) {
        geo = new THREE.BoxGeometry(0.012, 0.012, 0.004);
        matl = new THREE.MeshBasicMaterial({ color: conf.chipColor, transparent: true, opacity: 0.9 });
        speed = 1.6;
      } else if (conf.fluff) {
        geo = new THREE.BoxGeometry(0.014, 0.014, 0.014);
        matl = new THREE.MeshBasicMaterial({ color: conf.chipColor, transparent: true, opacity: 0.8 });
        speed = 0.9;
        ttl = 0.5 + cosmeticRng.next() * 0.3;
      } else {
        geo = new THREE.BoxGeometry(0.013, 0.013, 0.018);
        matl = new THREE.MeshBasicMaterial({ color: new THREE.Color(conf.chipColor).multiplyScalar(tint * (0.85 + cosmeticRng.next() * 0.3)) });
        speed = 1.7;
      }
      const chip = new THREE.Mesh(geo, matl);
      chip.position.copy(p);
      const vel = new THREE.Vector3(
        n.x + (cosmeticRng.next() - 0.5) * 1.4,
        n.y + cosmeticRng.next() * 1.2,
        n.z + (cosmeticRng.next() - 0.5) * 1.4,
      ).multiplyScalar(speed);
      const grav = conf.gravity;
      this._spawn(chip, ttl, (it, k, dtl) => {
        vel.y -= grav * dtl;
        it.obj.position.addScaledVector(vel, dtl);
        it.obj.rotation.x += dtl * spin;
        it.obj.rotation.y += dtl * spin * 0.6;
        if (it.obj.material.transparent) it.obj.material.opacity = (1 - k) * 0.9;
      });
    }
  }

  casing(pos, rightDir) {
    const conf = CASINGS[getFireFamily()] || CASINGS.rifle;
    let key = getFireFamily();
    let m = this.casingMats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: conf.color, roughness: conf.brassBase ? 0.6 : 0.35, metalness: conf.brassBase ? 0.2 : 0.9 });
      this.casingMats.set(key, m);
    }
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(conf.r, conf.r, conf.len, 6), m);
    mesh.position.copy(pos);
    const vel = new THREE.Vector3(rightDir.x, 0.6 + cosmeticRng.next() * 0.5, rightDir.z).multiplyScalar(1.5);
    let bounced = false;
    const floorY = pos.y - 1.42;
    this._spawn(mesh, 2.2, (it, k, dtl) => {
      vel.y -= 9.8 * dtl;
      it.obj.position.addScaledVector(vel, dtl);
      it.obj.rotation.x += dtl * 20;
      it.obj.rotation.z += dtl * 14;
      if (!bounced && it.obj.position.y < floorY + 0.02) {
        bounced = true;
        vel.y = Math.abs(vel.y) * 0.3;
        vel.x *= 0.4; vel.z *= 0.4;
        audio.mech('casing', it.obj.position);
      }
      if (bounced && it.obj.position.y < floorY + 0.01) {
        it.obj.position.y = floorY + 0.01;
        vel.set(0, 0, 0);
        it.obj.rotation.x = Math.PI / 2;
      }
    });
  }

  glassBurst(pos, w = 1, h = 1) {
    const n = Math.min(26, Math.floor((10 + w * 8) * Math.max(0.5, qScale())));
    // shards fall under gravity and settle on the slab under the break, then fade out
    const floorY = pos.y >= 3.5 ? 3.625 : 0.025;
    for (let i = 0; i < n; i++) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.014 + cosmeticRng.next() * 0.02, 0.05 + cosmeticRng.next() * 0.07, 3),
        new THREE.MeshStandardMaterial({ color: 0xd7ecf5, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }),
      );
      shard.position.set(
        pos.x + (cosmeticRng.next() - 0.5) * w * 0.8,
        pos.y + (cosmeticRng.next() - 0.5) * h * 0.8,
        pos.z + (cosmeticRng.next() - 0.5) * 0.2,
      );
      const vel = new THREE.Vector3((cosmeticRng.next() - 0.5) * 1.6, -0.5 - cosmeticRng.next(), (cosmeticRng.next() - 0.5) * 1.6);
      let spin = cosmeticRng.next() * 16;
      this._spawn(shard, 0.9 + cosmeticRng.next() * 0.5, (it, k, dtl) => {
        vel.y -= 9.8 * dtl;
        it.obj.position.addScaledVector(vel, dtl);
        it.obj.rotation.x += dtl * spin;
        if (it.obj.position.y < floorY) { // rest on the floor
          it.obj.position.y = floorY;
          vel.set(0, 0, 0);
          spin = 0;
          it.obj.rotation.x = Math.PI / 2 + (it.obj.rotation.x % 0.5);
        }
        it.obj.material.opacity = 0.85 * (1 - k * k);
      });
    }
    // glitter twinkle at the break
    for (let i = 0; i < 4; i++) {
      const tw = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.sparkTex, color: 0xdff4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      tw.position.set(pos.x + (cosmeticRng.next() - 0.5) * w * 0.6, pos.y + (cosmeticRng.next() - 0.5) * h * 0.6, pos.z);
      tw.scale.setScalar(0.05 + cosmeticRng.next() * 0.05);
      this._spawn(tw, 0.25 + cosmeticRng.next() * 0.2, (it, k) => { it.obj.material.opacity = 1 - k; });
    }
  }

  bloodPuff(pos) {
    if (settings.get('reducedBlood')) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.puffTex, color: 0x54100d, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    s.position.set(pos.x, pos.y, pos.z);
    s.scale.setScalar(0.13);
    this._spawn(s, 0.45, (it, k) => {
      it.obj.material.opacity = 0.7 * (1 - k);
      it.obj.scale.setScalar(0.13 + k * 0.3);
      it.obj.position.y -= k * 0.012;
    });
    // small dark floor decal (pooled, restrained)
    this._floorDecal(pos);
  }

  _floorDecal(pos) {
    // guess the floor plane under the hit (slab levels: 0 / 3.6)
    const floorY = pos.y >= 3.5 ? 3.605 : 0.005;
    if (pos.y - floorY > 2.2) return;
    if (this.decals.length >= 12) {
      const old = this.decals.shift();
      this.group.remove(old.mesh);
      old.mesh.geometry.dispose();
    }
    const r = 0.07 + cosmeticRng.next() * 0.08;
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(r, 10),
      new THREE.MeshBasicMaterial({ color: 0x3a0d0a, transparent: true, opacity: 0, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x + (cosmeticRng.next() - 0.5) * 0.2, floorY, pos.z + (cosmeticRng.next() - 0.5) * 0.2);
    const entry = { mesh };
    this.decals.push(entry);
    this._spawn(mesh, 14, (it, k) => {
      it.obj.material.opacity = k < 0.04 ? (k / 0.04) * 0.5 : k > 0.75 ? 0.5 * (1 - (k - 0.75) / 0.25) : 0.5;
      if (k >= 0.999) {
        const idx = this.decals.indexOf(entry);
        if (idx >= 0) this.decals.splice(idx, 1);
      }
    });
  }

  // ---------- devices ----------
  smokeVolume(pos, radius, durationSec) {
    const cluster = new THREE.Group();
    const n = Math.round(14 * Math.max(0.55, qScale()));
    const sprites = [];
    for (let i = 0; i < n; i++) {
      const inner = i < n * 0.5;
      const a = (i / n) * Math.PI * 2 + cosmeticRng.next();
      const r = radius * (inner ? 0.15 + cosmeticRng.next() * 0.3 : 0.45 + cosmeticRng.next() * 0.45);
      const y = 0.35 + cosmeticRng.next() * radius * (inner ? 0.5 : 0.8);
      // fake soft lighting: billows near the top read brighter, shaded core below
      const lightK = THREE.MathUtils.clamp(y / (radius * 0.9), 0, 1);
      const col = new THREE.Color().lerpColors(new THREE.Color(0x767f86), new THREE.Color(0xe3e9ee), lightK * 0.85 + cosmeticRng.next() * 0.15);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.puffTex, color: col, transparent: true, opacity: 0, depthWrite: false, rotation: cosmeticRng.next() * Math.PI * 2,
      }));
      s.position.set(pos.x + Math.cos(a) * r, pos.y + y, pos.z + Math.sin(a) * r);
      // smaller overlapping billows keep readable lobes instead of one merged blur
      s.scale.setScalar(radius * (inner ? 0.85 : 0.62) * (0.85 + cosmeticRng.next() * 0.3));
      s.userData.phase = cosmeticRng.next() * Math.PI * 2;
      s.userData.spin = (cosmeticRng.next() - 0.5) * 0.14;
      s.userData.base = s.scale.x;
      s.userData.maxOp = inner ? 0.85 : 0.55;
      cluster.add(s);
      sprites.push(s);
    }
    const vol = { pos: new THREE.Vector3().copy(pos), radius, ttl: durationSec };
    this.smokes.push(vol);
    let t = 0;
    this._spawn(cluster, durationSec, (it, k, dtl) => {
      t += dtl;
      // soft edges: eased bloom-in (billows grow from small) and eased dissolve-out
      const fadeIn = THREE.MathUtils.smoothstep(k, 0, 0.07);
      const fadeOut = 1 - THREE.MathUtils.smoothstep(k, 0.8, 1);
      for (const s of sprites) {
        s.material.opacity = s.userData.maxOp * fadeIn * fadeOut;
        s.material.rotation += dtl * s.userData.spin;
        s.position.y += dtl * 0.014;
        const puls = 1 + Math.sin(t * 0.5 + s.userData.phase) * 0.045 + k * 0.18;
        s.scale.setScalar(s.userData.base * puls * (0.5 + 0.5 * fadeIn) * (1 + (1 - fadeOut) * 0.3));
      }
    });
    audio.explosionish('smoke', pos);
    return vol;
  }

  flashBurst(pos) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    s.position.copy(pos);
    s.scale.setScalar(1);
    this._spawn(s, 0.32, (it, k) => {
      it.obj.material.opacity = 1 - k;
      it.obj.scale.setScalar(1 + k * 9);
    });
    // lingering sparkle cloud
    const nSpark = Math.round(7 * Math.max(0.5, qScale()));
    for (let i = 0; i < nSpark; i++) {
      const tw = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.sparkTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      tw.position.set(
        pos.x + (cosmeticRng.next() - 0.5) * 1.4,
        pos.y + (cosmeticRng.next() - 0.2) * 1.0,
        pos.z + (cosmeticRng.next() - 0.5) * 1.4,
      );
      tw.scale.setScalar(0.08 + cosmeticRng.next() * 0.1);
      const ph = cosmeticRng.next() * 9;
      this._spawn(tw, 0.9 + cosmeticRng.next() * 0.5, (it, k) => {
        it.obj.material.opacity = (1 - k) * (0.5 + 0.5 * Math.abs(Math.sin(k * 22 + ph)));
        it.obj.position.y += 0.003;
      });
    }
    this.flashLight.position.copy(pos);
    this.flashDecay = 6; // flashbang light lingers ~0.6 s (vs single-frame muzzle pops)
    this.flashPower = 40;
    this.flashT = 3.4;
    audio.explosionish('flash', pos);
  }

  isSmoked(a, b) {
    // does segment a-b pass through any smoke volume?
    for (const s of this.smokes) {
      if (segmentSphere(a, b, s.pos, s.radius * 0.85)) return true;
    }
    return false;
  }

  // ---------- sunbeam dust motes (lobby/wait curtain-wall beams) ----------
  _initDust() {
    // volumes hugging the daylight side of the atrium + waiting lounge
    this.dustZones = [
      { x: 10, y: 1.5, z: 30.2, w: 7, h: 2.6, d: 3.2 },
      { x: 27, y: 1.5, z: 33.2, w: 12, h: 2.6, d: 2.8 },
      { x: 41, y: 1.4, z: 31.5, w: 9, h: 2.4, d: 4 },
    ];
    const N = 132;
    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(N * 3);
    this.dustSeeds = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      this.dustSeeds[i * 4] = cosmeticRng.next();
      this.dustSeeds[i * 4 + 1] = cosmeticRng.next();
      this.dustSeeds[i * 4 + 2] = cosmeticRng.next();
      this.dustSeeds[i * 4 + 3] = cosmeticRng.next() * Math.PI * 2;
      posArr[i * 3 + 1] = -60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const dm = new THREE.PointsMaterial({
      color: 0xfff4dc, size: 0.014, transparent: true, opacity: 0.5, map: this.puffTex,
      sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.dust = new THREE.Points(geo, dm);
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
    this.dustTime = 0;
  }

  _updateDust(dt, camera) {
    if (!this.dust || !camera) return;
    this.dustTime += dt;
    const q = qScale();
    if (q <= 0.4) { this.dust.visible = false; return; }
    this.dust.visible = true;
    const attr = this.dust.geometry.getAttribute('position');
    const N = attr.count;
    const active = Math.floor(N * Math.min(1, q));
    const zn = this.dustZones.length;
    const perZone = Math.floor(active / zn);
    for (let i = 0; i < N; i++) {
      if (i >= active) { attr.setY(i, -60); continue; }
      const zone = this.dustZones[Math.min(zn - 1, Math.floor(i / perZone))];
      const s0 = this.dustSeeds[i * 4], s1 = this.dustSeeds[i * 4 + 1], s2 = this.dustSeeds[i * 4 + 2], ph = this.dustSeeds[i * 4 + 3];
      const t = this.dustTime;
      const x = zone.x + (s0 - 0.5) * zone.w + Math.sin(t * 0.24 + ph) * 0.3;
      const y = zone.y + (s1 - 0.5) * zone.h + Math.sin(t * 0.17 + ph * 2.1) * 0.22 - ((t * 0.014 + s2) % 1) * 0.4;
      const z = zone.z + (s2 - 0.5) * zone.d + Math.cos(t * 0.2 + ph) * 0.25;
      attr.setXYZ(i, x, y, z);
    }
    attr.needsUpdate = true;
  }

  // ---------- ambient snowfall ----------
  _initSnow() {
    const N = 900;
    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(N * 3);
    this.snowSeeds = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      posArr[i * 3] = 0; posArr[i * 3 + 1] = -50; posArr[i * 3 + 2] = 0;
      this.snowSeeds[i * 2] = cosmeticRng.next();
      this.snowSeeds[i * 2 + 1] = cosmeticRng.next();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xe8f2fa, size: 0.05, transparent: true, opacity: 0.85, sizeAttenuation: true, depthWrite: false,
      map: this.puffTex, alphaTest: 0.01, // soft round flakes (no near-camera squares)
    });
    this.snow = new THREE.Points(geo, mat);
    this.snow.frustumCulled = false;
    this.group.add(this.snow);
    this.snowActive = true;
    this.snowTime = 0;
  }

  _updateSnow(dt, camera) {
    if (!this.snow || !camera) return;
    this.snowTime += dt;
    const q = settings.get('quality');
    const density = q === 'low' ? 0.4 : q === 'medium' ? 0.7 : 1;
    const attr = this.snow.geometry.getAttribute('position');
    const N = attr.count;
    const active = Math.floor(N * density);
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    // Snow only outdoors: cheap check — above roof or outside footprint (interior snow prevented by ceilings visually anyway, so gate by region)
    for (let i = 0; i < N; i++) {
      if (i >= active) { attr.setY(i, -60); continue; }
      const sx = this.snowSeeds[i * 2], sz = this.snowSeeds[i * 2 + 1];
      const range = 26;
      const fall = ((this.snowTime * (0.55 + sx * 0.5) + sz * 20) % 20);
      let x = cx + (sx - 0.5) * range * 2 + Math.sin(this.snowTime * 0.7 + i) * 0.4;
      let z = cz + (sz - 0.5) * range * 2 + Math.cos(this.snowTime * 0.5 + i * 1.7) * 0.4;
      let y = cy + 11 - fall;
      // don't render inside the building envelope (x 0..48, z 0..36, y<6.4)
      if (x > -0.4 && x < 48.4 && z > -0.4 && z < 36.4 && y < 6.6) { attr.setY(i, -60); continue; }
      attr.setXYZ(i, x, y, z);
    }
    attr.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
const VFX_ASSETS = {
  'VFX-MUZZLE': 'Muzzle flash set (pistol cross / rifle star / shotgun bloom + wisp)',
  'VFX-IMPACTS': 'Surface impact set (concrete/drywall/wood/metal/glass/carpet/snow)',
  'VFX-TRACER': 'Tracer streak',
  'VFX-CASINGS': 'Ejected casings (per-family sizes, shotgun hulls)',
  'VFX-GLASS': 'Glass burst shards + glitter',
  'VFX-BLOOD': 'Blood puff + pooled floor decal (respects reducedBlood)',
  'VFX-SMOKE': 'SG-2 smoke volume (dense lit billows, ~16 s hold)',
  'VFX-FLASH': 'FB-3 flash burst + lingering sparkle',
  'VFX-SNOW': 'Ambient exterior snowfall',
  'VFX-DUST': 'Sunbeam dust motes (atrium/lounge)',
  'VFX-BREATH': 'Cold-air breath vapor (character rigs, exterior)',
};
for (const [id, name] of Object.entries(VFX_ASSETS)) {
  registerAsset(id, { name, category: 'vfx', agent: 'Fable 4', files: ['src/vfx/particles.js'] });
}

function segmentSphere(a, b, c, r) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (acx * abx + acy * aby + acz * abz) / len2)) : 0;
  const px = a.x + abx * t - c.x, py = a.y + aby * t - c.y, pz = a.z + abz * t - c.z;
  return px * px + py * py + pz * pz <= r * r;
}
