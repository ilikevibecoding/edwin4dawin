import * as THREE from 'three';
import { settings } from '../core/settings.js';
import { generateImageTexture } from '../art/texgen.js';

// ---------------------------------------------------------------------------
// Weather.  (owner: fable4)
//
// A winter storm outside the Northstar Administrative Center:
//   * snow that falls ONLY in exterior volumes (courtyard, east apron) and
//     drifts a short way through open exterior doorways,
//   * wind-driven streaks near the garage shutter and the entrance,
//   * breath vapour from the player and characters in cold zones,
//   * a slow-scrolling storm-haze layer seen through the glazing.
// Everything is a single Points draw or a handful of sprites — cheap enough
// for software rendering.
// ---------------------------------------------------------------------------

/** Exterior ground rectangles (from map/layout.js, kept literal so this file
 *  has no hard dependency on level internals). */
const EXTERIOR_RECTS = [
  { x0: -20, z0: -30, x1: 20, z1: -16, ground: 0 }, // north courtyard
  { x0: 27, z0: 5, x1: 36, z1: 20, ground: 0 },     // east service apron
];

/** Doorway bands snow can drift through when the door / shutter is open. */
const DRIFT_SITES = [
  { door: 'DOOR-EXT-ENTRY', x0: -1.8, z0: -16.6, x1: 1.8, z1: -14.6, wind: [0, 0, 1] },
  { door: 'DOOR-GARAGE', x0: 25.6, z0: 10.2, x1: 27.6, z1: 14.8, wind: [-1, 0, 0] },
];

function flakeTex() {
  return generateImageTexture('wx:flake', 32, 32, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 14);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(240,246,252,0.55)');
    g.addColorStop(1, 'rgba(240,246,252,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function streakTex() {
  return generateImageTexture('wx:streak', 64, 16, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 8, 64, 8);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 5, w, 6);
  });
}

function hazeTex() {
  return generateImageTexture('wx:haze', 256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % w;
      const y = (i * 53) % h;
      const r = 30 + (i * 29) % 50;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, 'rgba(220,230,240,0.10)');
      g.addColorStop(1, 'rgba(220,230,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }, { wrap: THREE.RepeatWrapping });
}

export class Weather {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.time = 0;
    this._breathTimer = 1.5;
    this._charBreathTimer = 2.5;

    const ps = settings.quality.particleScale;

    // ---- snow ---------------------------------------------------------------
    this.snowCount = Math.max(120, Math.round(520 * ps));
    const pos = new Float32Array(this.snowCount * 3);
    this.snowMeta = new Float32Array(this.snowCount * 3); // speed, swayPhase, drift(0/1)
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snowPos = pos;
    this.snow = new THREE.Points(geo, new THREE.PointsMaterial({
      map: flakeTex(), size: 0.05, sizeAttenuation: true, transparent: true,
      opacity: 0.85, depthWrite: false, color: 0xf2f7fc,
    }));
    this.snow.frustumCulled = false;
    this.snow.renderOrder = 18;
    this.scene.add(this.snow);
    for (let i = 0; i < this.snowCount; i++) this._respawnFlake(i, null, true);

    // ---- wind streaks -------------------------------------------------------
    this.streakCount = Math.max(16, Math.round(48 * ps));
    const spos = new Float32Array(this.streakCount * 3);
    this.streakMeta = new Float32Array(this.streakCount * 2); // site, life
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    this.streakPos = spos;
    this.streaks = new THREE.Points(sgeo, new THREE.PointsMaterial({
      map: streakTex(), size: 0.55, sizeAttenuation: true, transparent: true,
      opacity: 0.32, depthWrite: false, color: 0xe8f0f8, blending: THREE.AdditiveBlending,
    }));
    this.streaks.frustumCulled = false;
    this.streaks.renderOrder = 18;
    this.scene.add(this.streaks);
    for (let i = 0; i < this.streakCount; i++) this._respawnStreak(i);

    // ---- breath vapour ------------------------------------------------------
    this.breathSprites = [];
    const bmat = () => new THREE.SpriteMaterial({
      map: flakeTex(), transparent: true, opacity: 0, depthWrite: false, color: 0xdfe8f0,
    });
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(bmat());
      s.visible = false;
      s.renderOrder = 20;
      this.scene.add(s);
      this.breathSprites.push({ sprite: s, age: 1e9, life: 1, vel: new THREE.Vector3() });
    }
    this._breathCursor = 0;

    // ---- storm haze ---------------------------------------------------------
    this.hazePlanes = [];
    const hcfg = [
      { pos: [0, 3.2, -21], rot: 0, w: 44, h: 9 },       // beyond the north glazing
      { pos: [31.5, 2.6, 12.5], rot: -Math.PI / 2, w: 18, h: 7 }, // east apron
      { pos: [-23.5, 3.0, -4], rot: Math.PI / 2, w: 16, h: 7 },   // west windows
    ];
    for (const c of hcfg) {
      const tex = hazeTex();
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(c.w, c.h),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, opacity: 0.5, depthWrite: false,
          side: THREE.DoubleSide, color: 0xaebfce,
        })
      );
      m.position.set(c.pos[0], c.pos[1], c.pos[2]);
      m.rotation.y = c.rot;
      m.renderOrder = 2;
      this.scene.add(m);
      this.hazePlanes.push(m);
    }
  }

  // ------------------------------------------------------------- helpers --

  _isExterior(x, z) {
    for (const r of EXTERIOR_RECTS) {
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
    }
    return false;
  }

  _coldZone(x, z) {
    if (this._isExterior(x, z)) return true;
    for (const s of DRIFT_SITES) {
      if (x >= s.x0 - 1.5 && x <= s.x1 + 1.5 && z >= s.z0 - 1.5 && z <= s.z1 + 1.5) return true;
    }
    return false;
  }

  _siteOpen(site) {
    const door = this.game.doors?.get?.(site.door);
    if (!door) return site.door === 'DOOR-EXT-ENTRY'; // entry porch is open air
    return !!(door.isOpen || (door.userData && door.userData.open > 0.2) || door.openAmount > 0.2);
  }

  _respawnFlake(i, cameraPos, anywhere = false) {
    const cam = cameraPos || this.game.camera?.position || { x: 0, z: -20 };
    // Occasionally seed a drift site if its door is open.
    if (!anywhere && Math.random() < 0.08) {
      for (const s of DRIFT_SITES) {
        if (!this._siteOpen(s)) continue;
        this.snowPos[i * 3] = s.x0 + Math.random() * (s.x1 - s.x0);
        this.snowPos[i * 3 + 1] = 1.6 + Math.random() * 1.6;
        this.snowPos[i * 3 + 2] = s.z0 + Math.random() * (s.z1 - s.z0);
        this.snowMeta[i * 3] = 0.5 + Math.random() * 0.5;
        this.snowMeta[i * 3 + 1] = Math.random() * Math.PI * 2;
        this.snowMeta[i * 3 + 2] = 1;
        return;
      }
    }
    // Pick the exterior rect nearest the camera, clamp a window around it.
    let best = EXTERIOR_RECTS[0];
    let bestD = Infinity;
    for (const r of EXTERIOR_RECTS) {
      const dx = Math.max(r.x0 - cam.x, 0, cam.x - r.x1);
      const dz = Math.max(r.z0 - cam.z, 0, cam.z - r.z1);
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = r; }
    }
    const x0 = Math.max(best.x0, cam.x - 16);
    const x1 = Math.min(best.x1, cam.x + 16);
    const z0 = Math.max(best.z0, cam.z - 16);
    const z1 = Math.min(best.z1, cam.z + 16);
    this.snowPos[i * 3] = (x1 > x0 ? x0 + Math.random() * (x1 - x0) : best.x0 + Math.random() * (best.x1 - best.x0));
    this.snowPos[i * 3 + 1] = 2.5 + Math.random() * 6.5;
    this.snowPos[i * 3 + 2] = (z1 > z0 ? z0 + Math.random() * (z1 - z0) : best.z0 + Math.random() * (best.z1 - best.z0));
    this.snowMeta[i * 3] = 0.7 + Math.random() * 0.9;       // fall speed
    this.snowMeta[i * 3 + 1] = Math.random() * Math.PI * 2; // sway phase
    this.snowMeta[i * 3 + 2] = 0;
  }

  _respawnStreak(i) {
    const site = Math.random() < 0.5 ? 0 : 1;
    const s = DRIFT_SITES[site];
    this.streakMeta[i * 2] = site;
    this.streakMeta[i * 2 + 1] = Math.random(); // phase
    this.streakPos[i * 3] = s.x0 - 2 + Math.random() * (s.x1 - s.x0 + 4);
    this.streakPos[i * 3 + 1] = 0.4 + Math.random() * 2.6;
    this.streakPos[i * 3 + 2] = s.z0 - 2 + Math.random() * (s.z1 - s.z0 + 4);
  }

  _puffBreath(pos, vel, size = 0.16) {
    const b = this.breathSprites[this._breathCursor];
    this._breathCursor = (this._breathCursor + 1) % this.breathSprites.length;
    b.sprite.position.copy(pos);
    b.vel.copy(vel);
    b.age = 0;
    b.life = 1.1 + Math.random() * 0.5;
    b.size = size;
    b.sprite.visible = true;
  }

  // --------------------------------------------------------------- update --

  update(dt, cameraPos) {
    this.time += dt;
    const cam = cameraPos || this.game.camera.position;
    const gustA = 0.6 + Math.sin(this.time * 0.5) * 0.35 + Math.sin(this.time * 1.9) * 0.15;

    // --- snow ---------------------------------------------------------------
    // Skip almost all work when the player is deep inside the building.
    const nearExterior = this._coldZone(cam.x, cam.z)
      || EXTERIOR_RECTS.some((r) =>
        cam.x > r.x0 - 24 && cam.x < r.x1 + 24 && cam.z > r.z0 - 24 && cam.z < r.z1 + 24);
    this.snow.visible = nearExterior;
    if (nearExterior) {
      const wind = new THREE.Vector3(Math.sin(this.time * 0.23) * 0.5, 0, 0.35 * gustA);
      for (let i = 0; i < this.snowCount; i++) {
        const speed = this.snowMeta[i * 3];
        const phase = this.snowMeta[i * 3 + 1];
        const drifting = this.snowMeta[i * 3 + 2] > 0.5;
        let x = this.snowPos[i * 3];
        let y = this.snowPos[i * 3 + 1];
        let z = this.snowPos[i * 3 + 2];
        y -= speed * dt;
        x += (Math.sin(this.time * 1.3 + phase) * 0.35 + wind.x * gustA) * dt;
        z += (Math.cos(this.time * 0.9 + phase) * 0.3 + wind.z) * dt;
        // Drift flakes get pushed along the doorway wind vector.
        if (drifting) {
          const s = DRIFT_SITES[x > 12 ? 1 : 0];
          x += s.wind[0] * 0.9 * dt;
          z += s.wind[2] * 0.9 * dt;
        }
        const dead = y < 0.02
          || (!drifting && !this._isExterior(x, z))
          || (drifting && !this._coldZone(x, z));
        if (dead) {
          this._respawnFlake(i, cam);
        } else {
          this.snowPos[i * 3] = x;
          this.snowPos[i * 3 + 1] = y;
          this.snowPos[i * 3 + 2] = z;
        }
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
    }

    // --- wind streaks near the shutter + entrance ----------------------------
    const showStreaks = nearExterior && (
      Math.hypot(cam.x - 0, cam.z + 15.5) < 20 || Math.hypot(cam.x - 26.5, cam.z - 12.5) < 20);
    this.streaks.visible = showStreaks;
    if (showStreaks) {
      for (let i = 0; i < this.streakCount; i++) {
        const site = DRIFT_SITES[this.streakMeta[i * 2] | 0];
        const sp = 7 + gustA * 5;
        this.streakPos[i * 3] += site.wind[0] * sp * dt + Math.sin(this.time * 2 + i) * 0.4 * dt;
        this.streakPos[i * 3 + 2] += site.wind[2] * sp * dt;
        const x = this.streakPos[i * 3];
        const z = this.streakPos[i * 3 + 2];
        if (x < site.x0 - 6 || x > site.x1 + 6 || z < site.z0 - 6 || z > site.z1 + 6) {
          this._respawnStreak(i);
        }
      }
      this.streaks.geometry.attributes.position.needsUpdate = true;
      this.streaks.material.opacity = 0.18 + gustA * 0.16;
    }

    // --- breath vapour --------------------------------------------------------
    for (const b of this.breathSprites) {
      if (b.age >= b.life) { if (b.sprite.visible) b.sprite.visible = false; continue; }
      b.age += dt;
      const k = b.age / b.life;
      b.sprite.position.addScaledVector(b.vel, dt);
      const s = b.size * (0.5 + k * 1.6);
      b.sprite.scale.set(s, s, 1);
      b.sprite.material.opacity = 0.42 * (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8);
    }
    const player = this.game.player;
    if (player && this._coldZone(player.position.x, player.position.z)) {
      this._breathTimer -= dt;
      if (this._breathTimer <= 0) {
        this._breathTimer = 2.6 + Math.random() * 1.2;
        const eye = player.eyePosition;
        const fwd = player.forward;
        this._puffBreath(
          new THREE.Vector3(eye.x + fwd.x * 0.22, eye.y - 0.08, eye.z + fwd.z * 0.22),
          new THREE.Vector3(fwd.x * 0.25, 0.16, fwd.z * 0.25), 0.14
        );
      }
    }
    // Characters breathe too (only the few standing in cold zones).
    this._charBreathTimer -= dt;
    if (this._charBreathTimer <= 0) {
      this._charBreathTimer = 3.2;
      const lists = [this.game.enemies?.list, this.game.hostages?.list];
      for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const ent of list) {
          const g = ent?.group || ent?.model?.group || ent;
          const p = g?.position || ent?.position;
          if (!p || ent?.dead || ent?.alive === false) continue;
          if (!this._coldZone(p.x, p.z)) continue;
          if (Math.random() > 0.6) continue;
          this._puffBreath(
            new THREE.Vector3(p.x, (p.y || 0) + 1.58, p.z),
            new THREE.Vector3(0, 0.14, 0), 0.12
          );
        }
      }
    }

    // --- haze scroll -----------------------------------------------------------
    for (let i = 0; i < this.hazePlanes.length; i++) {
      const m = this.hazePlanes[i];
      m.material.map.offset.x = (this.time * 0.008 * (i + 1)) % 1;
      m.material.opacity = 0.38 + gustA * 0.14;
    }
  }
}
