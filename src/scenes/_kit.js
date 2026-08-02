/**
 * Shared scene toolkit.
 *
 * THE ONE RULE: a scene's `update(t)` must be a pure function of t.
 * The film is rendered by seeking to arbitrary frames, possibly out of order and
 * across several browsers at once, so nothing may accumulate state between
 * frames. Every effect here is therefore declarative: you hand it a list of
 * events with absolute times, and it computes the exact state at time t.
 */
import * as THREE from 'three';
import { glow, rng } from '../lego/bricks.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smoothstep = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
/** Progress through a beat: 0 before t0, 1 after t1. */
export const beat = (t, t0, t1) => clamp((t - t0) / Math.max(t1 - t0, 1e-6));
export const pulse = (t, t0, dur) => { const k = (t - t0) / dur; return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI); };

/** Deterministic 1D value noise, for drift and wobble. */
export function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const h = (n) => { const s = Math.sin((n * 127.1 + seed * 311.7) * 43758.5453); return s - Math.floor(s); };
  const u = f * f * (3 - 2 * f);
  return (h(i) + (h(i + 1) - h(i)) * u) * 2 - 1;
}

/* ------------------------------------------------------------------ */
/* lighting                                                            */
/* ------------------------------------------------------------------ */

const RIGS = {
  // hard sun, deep shadow, cold bounce — open space
  space: { key: [0xfff2dc, 3.2, [220, 160, 120]], fill: [0x2f4a7a, 0.55, [-180, -60, -140]], rim: [0x9fc8ff, 1.5, [-60, 40, -220]], amb: [0x0b1220, 0.35], fog: null },
  // shipboard fluorescents
  interior: { key: [0xf3f7ff, 2.1, [8, 26, 14]], fill: [0x7f93b8, 0.85, [-14, 10, -8]], rim: [0xdce8ff, 1.2, [0, 8, -26]], amb: [0x2a3242, 0.85], fog: [0x0d1118, 40, 190] },
  // twin suns, blown-out sky
  desert: { key: [0xffd9a0, 3.6, [120, 90, 60]], fill: [0xffa15a, 0.9, [-90, 30, 40]], rim: [0xfff0d8, 1.1, [-40, 20, -120]], amb: [0x503a28, 0.9], fog: [0xd9a86a, 260, 900] },
  // battle station: grey, contrasty, one hard source
  battle: { key: [0xe6f0ff, 2.6, [-140, 180, 80]], fill: [0x35507a, 0.6, [120, -40, -60]], rim: [0xbcd4ff, 1.6, [40, 30, -200]], amb: [0x121a26, 0.5], fog: [0x0a0e14, 300, 1600] },
  // inside the trench: light from a slot far above
  trench: { key: [0xdfe9ff, 2.4, [30, 220, 40]], fill: [0x2a3d5c, 0.75, [-60, 40, -20]], rim: [0x8fb4e8, 1.1, [0, 20, -140]], amb: [0x0d141e, 0.75], fog: [0x0b1017, 60, 700] },
};

export function lightRig(scene, preset = 'space', o = {}) {
  const r = RIGS[preset] || RIGS.space;
  const out = {};
  const mk = (spec, castShadow) => {
    const l = new THREE.DirectionalLight(spec[0], spec[1] * (o.intensity ?? 1));
    l.position.set(...spec[2]);
    if (castShadow && o.shadows !== false) {
      l.castShadow = true;
      l.shadow.mapSize.set(o.shadowMap || 2048, o.shadowMap || 2048);
      const s = o.shadowExtent || 60;
      l.shadow.camera.left = -s; l.shadow.camera.right = s;
      l.shadow.camera.top = s; l.shadow.camera.bottom = -s;
      l.shadow.camera.near = 0.5; l.shadow.camera.far = o.shadowFar || 900;
      l.shadow.bias = -0.0012;
      l.shadow.normalBias = 0.035;
    }
    scene.add(l);
    scene.add(l.target);
    return l;
  };
  out.key = mk(r.key, true);
  out.fill = mk(r.fill, false);
  out.rim = mk(r.rim, false);
  out.amb = new THREE.AmbientLight(r.amb[0], r.amb[1] * (o.intensity ?? 1));
  scene.add(out.amb);
  if (r.fog && o.fog !== false) scene.fog = new THREE.Fog(r.fog[0], r.fog[1], r.fog[2]);
  if (o.background !== undefined) scene.background = new THREE.Color(o.background);
  return out;
}

/* ------------------------------------------------------------------ */
/* laser fire                                                          */
/* ------------------------------------------------------------------ */

/**
 * Declarative laser volleys.
 *
 * Each shot is {t0, from:[x,y,z], to:[x,y,z], speed, color, len, thick, life}.
 * At time t the bolt sits at from + dir * speed * (t - t0), and disappears when
 * it reaches `to` (or after `life` seconds).
 */
export class Bolts {
  constructor(parent, shots, o = {}) {
    this.shots = shots.map((s) => {
      const from = new THREE.Vector3(...s.from);
      const to = new THREE.Vector3(...s.to);
      const dir = to.clone().sub(from);
      const dist = dir.length();
      dir.normalize();
      const speed = s.speed ?? o.speed ?? 260;
      return { ...s, from, to, dir, dist, speed, life: s.life ?? dist / speed };
    });
    this.group = new THREE.Group();
    this.meshes = this.shots.map((s) => {
      const len = s.len ?? o.len ?? 7;
      const thick = s.thick ?? o.thick ?? 0.22;
      const color = s.color ?? o.color ?? 0xff2b12;
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, len, 6), glow(0xfff3e0));
      core.rotation.x = Math.PI / 2;
      const sheath = new THREE.Mesh(
        new THREE.CylinderGeometry(thick * 2.6, thick * 2.6, len * 1.06, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      );
      sheath.rotation.x = Math.PI / 2;
      g.add(core, sheath);
      g.visible = false;
      this.group.add(g);
      return g;
    });
    if (parent) parent.add(this.group);
  }

  update(t) {
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      const m = this.meshes[i];
      const age = t - s.t0;
      if (age < 0 || age > s.life) { m.visible = false; continue; }
      m.visible = true;
      m.position.copy(s.from).addScaledVector(s.dir, s.speed * age);
      m.lookAt(m.position.clone().add(s.dir));
    }
  }

  /** Impact times, so a scene can hang sparks and sounds off each hit. */
  impacts() {
    return this.shots.map((s) => ({ t: s.t0 + s.life, pos: s.to.clone(), color: s.color }));
  }
}

/** Build a burst of shots from one muzzle toward a target, with spread. */
export function volley(o) {
  const r = rng(o.seed ?? 7);
  const out = [];
  const from = o.from, to = o.to;
  for (let i = 0; i < (o.count ?? 6); i++) {
    const j = o.spread ?? 0;
    out.push({
      t0: o.t0 + i * (o.interval ?? 0.16) + (o.jitter ? (r() - 0.5) * o.jitter : 0),
      from: [from[0] + (r() - 0.5) * (o.fromSpread ?? 0), from[1] + (r() - 0.5) * (o.fromSpread ?? 0), from[2]],
      to: [to[0] + (r() - 0.5) * j, to[1] + (r() - 0.5) * j, to[2] + (r() - 0.5) * j * 0.3],
      speed: o.speed, color: o.color, len: o.len, thick: o.thick,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* impacts, sparks and debris                                          */
/* ------------------------------------------------------------------ */

/** Declarative point-flash impacts: [{t, pos:[x,y,z], size, color}] */
export class Impacts {
  constructor(parent, list, o = {}) {
    this.list = list;
    this.dur = o.dur ?? 0.42;
    this.sprites = list.map((h) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 8),
        new THREE.MeshBasicMaterial({ color: h.color ?? o.color ?? 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      );
      m.visible = false;
      parent.add(m);
      return m;
    });
  }
  update(t) {
    for (let i = 0; i < this.list.length; i++) {
      const h = this.list[i], m = this.sprites[i];
      const k = (t - h.t) / this.dur;
      if (k < 0 || k > 1) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(h.pos[0] ?? h.pos.x, h.pos[1] ?? h.pos.y, h.pos[2] ?? h.pos.z);
      const s = (h.size ?? 1.4) * (0.4 + k * 2.2);
      m.scale.setScalar(s);
      m.material.opacity = Math.pow(1 - k, 1.6);
    }
  }
}

/**
 * A shower of LEGO bricks flung from a point — the house style of explosion.
 * Purely analytic: position = p0 + v*age + gravity, spin = age * rate.
 */
export class BrickBurst {
  constructor(parent, o = {}) {
    const r = rng(o.seed ?? 11);
    const n = o.count ?? 26;
    this.t0 = o.t0 ?? 0;
    this.life = o.life ?? 2.4;
    this.g = o.gravity ?? -9;
    this.origin = new THREE.Vector3(...(o.origin ?? [0, 0, 0]));
    this.pieces = [];
    this.group = new THREE.Group();
    const colors = o.colors ?? [0xf2f3f2, 0xa3a2a4, 0x545955, 0xc91a09];
    for (let i = 0; i < n; i++) {
      const s = (o.size ?? 0.5) * (0.5 + r() * 1.1);
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(s * (1 + r()), s, s * (1 + r() * 2)),
        new THREE.MeshStandardMaterial({ color: colors[(r() * colors.length) | 0], roughness: 0.5 })
      );
      const dir = new THREE.Vector3(r() * 2 - 1, r() * 1.4 + 0.1, r() * 2 - 1).normalize();
      this.pieces.push({
        mesh: m,
        v: dir.multiplyScalar((o.speed ?? 12) * (0.4 + r() * 1.2)),
        spin: new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).multiplyScalar(6 * (0.3 + r())),
        delay: r() * (o.stagger ?? 0.08),
      });
      m.castShadow = true;
      this.group.add(m);
    }
    if (parent) parent.add(this.group);
  }
  update(t) {
    const base = t - this.t0;
    for (const p of this.pieces) {
      const age = base - p.delay;
      if (age < 0 || age > this.life) { p.mesh.visible = false; continue; }
      p.mesh.visible = true;
      p.mesh.position.copy(this.origin)
        .addScaledVector(p.v, age)
        .add(new THREE.Vector3(0, 0.5 * this.g * age * age, 0));
      p.mesh.rotation.set(p.spin.x * age, p.spin.y * age, p.spin.z * age);
      const fade = 1 - Math.pow(age / this.life, 3);
      p.mesh.scale.setScalar(Math.max(0.01, fade));
    }
  }
}

/** Expanding fireball + shock ring, driven analytically. */
export class Fireball {
  constructor(parent, o = {}) {
    this.t0 = o.t0 ?? 0;
    this.dur = o.dur ?? 1.5;
    this.size = o.size ?? 8;
    this.pos = new THREE.Vector3(...(o.pos ?? [0, 0, 0]));
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshBasicMaterial({ color: o.color ?? 0xffce6a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    this.shell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshBasicMaterial({ color: o.color2 ?? 0xff5a12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.045, 6, 44),
      new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    this.ring.rotation.x = o.ringTilt ?? Math.PI / 2;
    this.ring.visible = o.ring !== false;
    this.hasRing = o.ring !== false;
    this.group.add(this.core, this.shell, this.ring);
    this.group.visible = false;
    if (parent) parent.add(this.group);
    this.bricks = o.bricks === false ? null : new BrickBurst(this.group, {
      t0: 0, origin: [0, 0, 0], count: o.brickCount ?? 22, speed: this.size * 1.5,
      size: this.size * 0.06, seed: o.seed ?? 5, life: this.dur * 1.6, gravity: o.gravity ?? 0,
    });
  }
  update(t) {
    const k = (t - this.t0) / this.dur;
    if (k < 0 || k > 1.7) { this.group.visible = false; return; }
    this.group.visible = true;
    const e = 1 - Math.pow(1 - clamp(k), 2.6);
    this.core.scale.setScalar(this.size * (0.12 + e * 0.7));
    this.core.material.opacity = clamp(1 - k * 1.5);
    this.shell.scale.setScalar(this.size * (0.2 + e * 1.25));
    this.shell.material.opacity = clamp(0.85 - k * 0.95);
    if (this.hasRing) {
      this.ring.scale.setScalar(this.size * (0.3 + e * 3.2));
      this.ring.material.opacity = clamp(0.9 - k * 1.15);
    }
    if (this.bricks) this.bricks.update(t - this.t0);
  }
}

/* ------------------------------------------------------------------ */
/* atmosphere                                                          */
/* ------------------------------------------------------------------ */

/** Soft additive smoke billboards that drift and fade on a schedule. */
export class Smoke {
  constructor(parent, o = {}) {
    const r = rng(o.seed ?? 3);
    const n = o.count ?? 18;
    const tex = smokeTexture();
    this.puffs = [];
    this.group = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: o.color ?? 0x9aa4ad, transparent: true, opacity: 0,
        depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }));
      this.group.add(m);
      this.puffs.push({
        m,
        t0: (o.t0 ?? 0) + r() * (o.spawnWindow ?? 1.2),
        life: (o.life ?? 3) * (0.6 + r() * 0.8),
        p: new THREE.Vector3(...(o.origin ?? [0, 0, 0])).add(new THREE.Vector3((r() - 0.5) * (o.spread ?? 4), (r() - 0.5) * (o.spread ?? 4) * 0.4, (r() - 0.5) * (o.spread ?? 4))),
        v: new THREE.Vector3((r() - 0.5) * 1.2, (o.rise ?? 0.8) * (0.5 + r()), (r() - 0.5) * 1.2),
        s0: (o.size ?? 3) * (0.5 + r() * 0.8),
        peak: (o.opacity ?? 0.5) * (0.6 + r() * 0.6),
      });
    }
    if (parent) parent.add(this.group);
  }
  update(t) {
    for (const p of this.puffs) {
      const age = t - p.t0;
      if (age < 0 || age > p.life) { p.m.visible = false; continue; }
      p.m.visible = true;
      const k = age / p.life;
      p.m.position.copy(p.p).addScaledVector(p.v, age);
      p.m.scale.setScalar(p.s0 * (0.5 + k * 1.9));
      p.m.material.opacity = p.peak * Math.sin(Math.pow(k, 0.55) * Math.PI);
    }
  }
}

let _smokeTex = null;
function smokeTexture() {
  if (_smokeTex) return _smokeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = rng(21);
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.42)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 90; i++) {
    g.beginPath();
    g.arc(r() * 128, r() * 128, 2 + r() * 11, 0, 7);
    g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`;
    g.fill();
  }
  _smokeTex = new THREE.CanvasTexture(c);
  return _smokeTex;
}

/** Fast starfield for scenes that don't want the full environments module. */
export function stars(scene, o = {}) {
  const r = rng(o.seed ?? 5);
  const n = o.count ?? 3500;
  const pos = new Float32Array(n * 3);
  const R = o.radius ?? 2600;
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(R * (0.7 + r() * 0.3));
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: o.size ?? 3.2, sizeAttenuation: true, transparent: true, depthWrite: false }));
  p.frustumCulled = false;
  scene.add(p);
  return p;
}

/* ------------------------------------------------------------------ */
/* misc                                                                */
/* ------------------------------------------------------------------ */

/** Bank a ship into its turn and let it breathe. */
export function flyAlong(obj, t, path, o = {}) {
  const p = path(t);
  const ahead = path(t + 0.05);
  obj.position.copy(p);
  obj.lookAt(ahead);
  if (o.bank) {
    const p2 = path(t + 0.25);
    const turn = new THREE.Vector3().subVectors(p2, ahead).normalize()
      .cross(new THREE.Vector3().subVectors(ahead, p).normalize()).y;
    obj.rotateZ(clamp(turn * (o.bank ?? 3), -1.1, 1.1));
  }
  if (o.wobble) {
    obj.rotateZ(noise(t * 0.7, 3) * o.wobble);
    obj.rotateX(noise(t * 0.6, 4) * o.wobble * 0.5);
  }
  return obj;
}

/** Full-screen colour flash through the film pass (explosions, hyperspace). */
export function flash(stage, t, events) {
  let v = 0;
  let color = null;
  for (const e of events) {
    const k = (t - e.t) / (e.dur ?? 0.3);
    if (k < 0 || k > 1) continue;
    const a = (e.amount ?? 1) * Math.pow(1 - k, e.pow ?? 2.2);
    if (a > v) { v = a; color = e.color; }
  }
  if (stage?.film) {
    stage.film.uniforms.uFlash.value = v;
    if (color != null) stage.film.uniforms.uFlashColor.value.set(color);
  }
}

/** Radial chromatic stretch, for the jump to lightspeed. */
export function chroma(stage, amount) {
  if (stage?.film) stage.film.uniforms.uChroma.value = amount;
}
