// VFX system (Fable 4 domain): muzzle flashes, tracers, impacts, casings, smoke volumes,
// glass bursts, blood (reducible), snowfall. Pooled sprites/meshes, deterministic-friendly
// (cosmetic RNG only).
import * as THREE from 'three';
import { cosmeticRng } from '../core/rng.js';
import { settings } from '../core/settings.js';
import { audio } from '../core/audio.js';

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

const IMPACT_COLORS = {
  concrete: '#b7b3ab', drywall: '#d8d2c4', wood: '#9a7a52', metal: '#ffd27a',
  glass: '#cfe8f2', carpet: '#8a8578', tile: '#c9c6bd', snow: '#eef4f8', flesh: '#7d1f1a',
};

export class VfxSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'vfx';
    scene.add(this.group);
    this.puffTex = softCircleTexture(0.3);
    this.glowTex = softCircleTexture(0.12);
    this.items = []; // {obj, life, ttl, update}
    this.smokes = []; // active smoke volumes {pos, radius, ttl}
    this.casingMat = new THREE.MeshStandardMaterial({ color: 0xc8a34a, roughness: 0.35, metalness: 0.9 });
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.85 });
    this.flashLight = new THREE.PointLight(0xffca7a, 0, 7, 2);
    this.group.add(this.flashLight);
    this.flashT = 0;
    this._initSnow();
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
    this.flashT = Math.max(0, this.flashT - dt * 14);
    this.flashLight.intensity = this.flashT * 26;
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      this.smokes[i].ttl -= dt;
      if (this.smokes[i].ttl <= 0) this.smokes.splice(i, 1);
    }
    this._updateSnow(dt, camera);
  }

  clear() {
    for (const it of this.items) this.group.remove(it.obj);
    this.items.length = 0;
    this.smokes.length = 0;
  }

  // ---------- weapon effects ----------
  muzzleFlash(pos, dir, scale = 1) {
    const q = settings.get('quality') === 'low' ? 0.6 : 1;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffd9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(pos);
    s.scale.setScalar(0.22 * scale * (0.8 + cosmeticRng.next() * 0.5));
    this._spawn(s, 0.05, (it, k) => { it.obj.material.opacity = 1 - k; });
    this.flashLight.position.copy(pos);
    this.flashT = Math.max(this.flashT, 0.9 * scale * q);
    // brief smoke wisp
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, color: 0x9aa0a4, transparent: true, opacity: 0.32, depthWrite: false }));
    smoke.position.copy(pos).addScaledVector(dir, 0.12);
    smoke.scale.setScalar(0.14);
    this._spawn(smoke, 0.5, (it, k) => {
      it.obj.material.opacity = 0.32 * (1 - k);
      it.obj.scale.setScalar(0.14 + k * 0.5);
      it.obj.position.y += 0.2 * k * 0.016;
    });
  }

  tracer(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 1.2) return;
    dir.normalize();
    const seg = Math.min(2.4, len * 0.35);
    const geo = new THREE.BoxGeometry(0.008, 0.008, seg);
    const m = new THREE.Mesh(geo, this.tracerMat.clone());
    m.position.copy(from).addScaledVector(dir, seg / 2 + 0.4);
    m.lookAt(to.x, to.y, to.z);
    const speed = 160;
    this._spawn(m, Math.min(0.2, (len - seg) / speed), (it, k, dtl) => {
      it.obj.position.addScaledVector(dir, speed * dtl);
      it.obj.material.opacity = 0.85 * (1 - k * 0.6);
    });
  }

  impact(point, normal, material) {
    const colorHex = IMPACT_COLORS[material] || '#b7b3ab';
    if (material === 'flesh' && settings.get('reducedBlood')) return;
    const n = new THREE.Vector3(normal.x, normal.y, normal.z);
    const p = new THREE.Vector3(point.x, point.y, point.z).addScaledVector(n, 0.02);
    // dust puff
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, color: new THREE.Color(colorHex), transparent: true, opacity: 0.7, depthWrite: false }));
    puff.position.copy(p);
    puff.scale.setScalar(0.1);
    this._spawn(puff, 0.42, (it, k) => {
      it.obj.material.opacity = 0.7 * (1 - k);
      it.obj.scale.setScalar(0.1 + k * (material === 'flesh' ? 0.3 : 0.42));
      it.obj.position.addScaledVector(n, k * 0.01);
    });
    // sparks for metal, debris chips otherwise
    const chips = material === 'metal' ? 5 : 3;
    for (let i = 0; i < chips; i++) {
      const isSpark = material === 'metal';
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(0.014, 0.014, isSpark ? 0.05 : 0.02),
        new THREE.MeshBasicMaterial({ color: isSpark ? 0xffcf7a : colorHex }),
      );
      chip.position.copy(p);
      const vel = new THREE.Vector3(
        n.x + (cosmeticRng.next() - 0.5) * 1.4,
        n.y + cosmeticRng.next() * 1.2,
        n.z + (cosmeticRng.next() - 0.5) * 1.4,
      ).multiplyScalar(isSpark ? 3.4 : 1.7);
      this._spawn(chip, 0.4 + cosmeticRng.next() * 0.25, (it, k, dtl) => {
        vel.y -= 9.8 * dtl;
        it.obj.position.addScaledVector(vel, dtl);
        it.obj.rotation.x += dtl * 12;
      });
    }
  }

  casing(pos, rightDir) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.022, 6), this.casingMat);
    m.position.copy(pos);
    const vel = new THREE.Vector3(rightDir.x, 0.6 + cosmeticRng.next() * 0.5, rightDir.z).multiplyScalar(1.4);
    let bounced = false;
    const floorY = pos.y - 1.42;
    this._spawn(m, 2.2, (it, k, dtl) => {
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
      }
      if (k > 0.8) it.obj.material = this.casingMat;
    });
  }

  glassBurst(pos, w = 1, h = 1) {
    const n = Math.min(26, Math.floor(10 + w * 8));
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
      const spin = cosmeticRng.next() * 16;
      this._spawn(shard, 0.9 + cosmeticRng.next() * 0.5, (it, k, dtl) => {
        vel.y -= 9.8 * dtl;
        it.obj.position.addScaledVector(vel, dtl);
        it.obj.rotation.x += dtl * spin;
        it.obj.material.opacity = 0.85 * (1 - k * 0.7);
      });
    }
  }

  bloodPuff(pos) {
    if (settings.get('reducedBlood')) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, color: 0x6e1512, transparent: true, opacity: 0.85, depthWrite: false }));
    s.position.set(pos.x, pos.y, pos.z);
    s.scale.setScalar(0.16);
    this._spawn(s, 0.5, (it, k) => {
      it.obj.material.opacity = 0.85 * (1 - k);
      it.obj.scale.setScalar(0.16 + k * 0.4);
      it.obj.position.y -= k * 0.01;
    });
  }

  // ---------- devices ----------
  smokeVolume(pos, radius, durationSec) {
    const cluster = new THREE.Group();
    const n = 10;
    const sprites = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.puffTex, color: 0xbfc7cc, transparent: true, opacity: 0, depthWrite: false,
      }));
      const a = (i / n) * Math.PI * 2;
      const r = radius * (0.25 + cosmeticRng.next() * 0.55);
      s.position.set(pos.x + Math.cos(a) * r, pos.y + 0.5 + cosmeticRng.next() * radius * 0.5, pos.z + Math.sin(a) * r);
      s.scale.setScalar(radius * 1.1);
      s.userData.phase = cosmeticRng.next() * Math.PI * 2;
      cluster.add(s);
      sprites.push(s);
    }
    const vol = { pos: new THREE.Vector3().copy(pos), radius, ttl: durationSec };
    this.smokes.push(vol);
    this._spawn(cluster, durationSec, (it, k, dtl) => {
      const fade = k < 0.06 ? k / 0.06 : k > 0.85 ? (1 - k) / 0.15 : 1;
      for (const s of sprites) {
        s.material.opacity = 0.5 * fade;
        s.material.rotation += dtl * 0.12;
        s.position.y += dtl * 0.03;
      }
    });
    audio.explosionish('smoke', pos);
    return vol;
  }

  flashBurst(pos) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(pos);
    s.scale.setScalar(1);
    this._spawn(s, 0.3, (it, k) => {
      it.obj.material.opacity = 1 - k;
      it.obj.scale.setScalar(1 + k * 8);
    });
    this.flashLight.position.copy(pos);
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

function segmentSphere(a, b, c, r) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (acx * abx + acy * aby + acz * abz) / len2)) : 0;
  const px = a.x + abx * t - c.x, py = a.y + aby * t - c.y, pz = a.z + abz * t - c.z;
  return px * px + py * py + pz * pz <= r * r;
}
