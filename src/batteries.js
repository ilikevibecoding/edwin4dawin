// Three fictionalized interceptor batteries with distinct silhouettes,
// animated launcher components, status lighting, decals and launch states.
// RAMPART  — Patriot-inspired canted box-canister trailer (fast, terminal)
// ZENITH   — THAAD-inspired erecting tube rack on a heavy truck (high alt)
// SENTINEL — fictional twin-silo long-range test article (max spectacle)
//
// Detail philosophy: every repeated small part (ribs, clamps, rails, bolts,
// chocks…) is baked into a handful of merged-geometry meshes per battery so
// close-up greeble stays within a ~25 draw-call budget per battery.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { BATTERIES } from './constants.js';
import { panelTexture, metalTexture, hazardStripesTexture, stencilTexture, concreteTexture } from './textures.js';
import { mulberry32 } from './rng.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);

/** wrap an angle difference into (-π, π] so slews take the short way round */
function wrapPI(a) {
  return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

export const BSTATE = {
  READY: 'READY',
  PREP: 'PREP',
  RELOAD: 'RELOAD',
  EMPTY: 'EMPTY',
};

// --------------------------------------------------------- local textures --
// Small canvas helpers kept local to this module (see textures.js for the
// shared library). All deterministic — no Math.random anywhere.
const _texCache = new Map();
function localTex(key, w, h, draw, { srgb = true, repeat = null } = {}) {
  if (_texCache.has(key)) return _texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat[0], repeat[1]); }
  _texCache.set(key, tex);
  return tex;
}

/** tire tread: dark rubber with lug grooves wrapping the cylinder wall */
function treadTexture() {
  return localTex('tread', 128, 64, (g, w, h) => {
    g.fillStyle = '#17191a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = '#0c0e0f'; g.fillRect(x, 0, 7, h);
      g.fillStyle = '#212425'; g.fillRect(x + 7, 0, 2, h);
    }
    // sidewall smudge rows
    g.fillStyle = 'rgba(46,48,48,0.5)';
    g.fillRect(0, 2, w, 3); g.fillRect(0, h - 5, w, 3);
  }, { repeat: [6, 1] });
}

/** small orange EXPLOSIVE hazard diamond placard */
function placardTexture() {
  return localTex('placard', 64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#e07a20';
    g.beginPath();
    g.moveTo(w / 2, 3); g.lineTo(w - 3, h / 2); g.lineTo(w / 2, h - 3); g.lineTo(3, h / 2);
    g.closePath(); g.fill();
    g.strokeStyle = '#1a1a17'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(w / 2, 8); g.lineTo(w - 8, h / 2); g.lineTo(w / 2, h - 8); g.lineTo(8, h / 2);
    g.closePath(); g.stroke();
    g.fillStyle = '#1a1a17';
    g.font = 'bold 17px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('1.1', w / 2, h / 2 - 4);
    g.font = 'bold 9px Arial';
    g.fillText('EXPL', w / 2, h / 2 + 10);
  });
}

/** orange/white photogrammetry checker (SENTINEL test-article theme) */
function checkerTexture() {
  return localTex('checker', 128, 32, (g, w, h) => {
    const cw = w / 8, chh = h / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 8; c++) {
        g.fillStyle = (r + c) % 2 ? '#e2662a' : '#e9e4d6';
        g.fillRect(c * cw, r * chh, cw, chh);
      }
    }
    // grime pass
    const rnd = mulberry32(91);
    g.globalAlpha = 0.1;
    for (let i = 0; i < 60; i++) {
      g.fillStyle = '#3a352c';
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 5, 1 + rnd() * 2);
    }
    g.globalAlpha = 1;
  });
}

/** truck radiator grille with slats */
function grilleTexture() {
  return localTex('grille', 96, 64, (g, w, h) => {
    g.fillStyle = '#101416'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 4; y += 9) {
      g.fillStyle = '#2c3336'; g.fillRect(5, y, w - 10, 3);
    }
    g.strokeStyle = '#1e2426'; g.lineWidth = 5;
    g.strokeRect(2, 2, w - 4, h - 4);
  });
}

/** phased-array face: grid of radiating elements */
function arrayTexture() {
  return localTex('array', 128, 128, (g, w, h) => {
    g.fillStyle = '#20261f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#39443a';
    for (let y = 10; y < h - 6; y += 11) {
      for (let x = 10; x < w - 6; x += 11) {
        g.beginPath(); g.arc(x, y, 2.8, 0, 7); g.fill();
      }
    }
    g.strokeStyle = '#161a15'; g.lineWidth = 6;
    g.strokeRect(1, 1, w - 2, h - 2);
  });
}

/** warm radial glow for open silo mouths */
function glowTexture() {
  return localTex('glow', 64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,240,220,1)');
    gr.addColorStop(0.4, 'rgba(255,170,90,0.7)');
    gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.clearRect(0, 0, w, h);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: false });
}

/** row of stenciled labels; used with Kit.cell() to merge numbered decals */
function stripTexture(labels, { cw = 96, ch = 64, size = 44, color = '#dfdaca' } = {}) {
  const key = 'strip:' + labels.join('|') + ':' + cw + ':' + size + color;
  return localTex(key, cw * labels.length, ch, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = `bold ${size}px "Courier New", monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color;
    labels.forEach((t, i) => g.fillText(t, cw * i + cw / 2, h / 2 + 2));
  });
}

// -------------------------------------------------------- shared materials --
const _matCache = new Map();
function sharedMat(key, make) {
  if (!_matCache.has(key)) _matCache.set(key, make());
  return _matCache.get(key);
}
const matTire = () => sharedMat('tire', () => new THREE.MeshStandardMaterial({ map: treadTexture(), roughness: 0.95 }));
const matHub = () => sharedMat('hub', () => new THREE.MeshStandardMaterial({ map: metalTexture('#4c514d', 71), roughness: 0.5, metalness: 0.55 }));
const matDark = () => sharedMat('dark', () => new THREE.MeshStandardMaterial({ color: 0x1e211d, roughness: 0.85, metalness: 0.15 }));
const matSteel = () => sharedMat('steel', () => new THREE.MeshStandardMaterial({ map: metalTexture('#79807c', 33), roughness: 0.42, metalness: 0.8 }));
const matChrome = () => sharedMat('chrome', () => new THREE.MeshStandardMaterial({ map: metalTexture('#9aa3a1', 34), roughness: 0.3, metalness: 0.95 }));
const matRib = () => sharedMat('rib', () => new THREE.MeshStandardMaterial({ color: 0x49513f, roughness: 0.72, metalness: 0.2 }));
const matGlass = () => sharedMat('glass', () => new THREE.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.25, metalness: 0.6 }));
const matGrille = () => sharedMat('grille', () => new THREE.MeshStandardMaterial({ map: grilleTexture(), roughness: 0.6, metalness: 0.3 }));
const matArray = () => sharedMat('array', () => new THREE.MeshStandardMaterial({ map: arrayTexture(), roughness: 0.55 }));
const matChecker = () => sharedMat('checker', () => new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.6 }));
const matPlacard = () => sharedMat('placard', () => new THREE.MeshBasicMaterial({ map: placardTexture(), transparent: true }));
const matExtinguisher = () => sharedMat('ext', () => new THREE.MeshStandardMaterial({
  map: stencilTexture('FIRE', { bg: '#a3271e', color: '#efe9dc', w: 128, h: 128, size: 34 }), roughness: 0.55,
}));

// --------------------------------------------------------------- geo batch --
/** Accumulates transformed primitive geometries, merges to ONE mesh/draw. */
class Kit {
  constructor() { this.geos = []; }
  add(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    if (rz) geo.rotateZ(rz);
    if (rx) geo.rotateX(rx);
    if (ry) geo.rotateY(ry);
    geo.translate(x, y, z);
    this.geos.push(geo);
    return this;
  }
  box(w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz); }
  cyl(rt, rb, h, seg, x, y, z, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, ry, rz); }
  torus(r, t, seg, x, y, z, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2) { return this.add(new THREE.TorusGeometry(r, t, 6, seg, arc), x, y, z, rx, ry, rz); }
  plane(w, h, x, y, z, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.PlaneGeometry(w, h), x, y, z, rx, ry, rz); }
  circle(r, seg, x, y, z, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CircleGeometry(r, seg), x, y, z, rx, ry, rz); }
  tube(pts, r) {
    const curve = new THREE.CatmullRomCurve3(pts);
    this.geos.push(new THREE.TubeGeometry(curve, 10, r, 6));
    return this;
  }
  /** plane that shows cell `i` of an `n`-cell strip texture */
  cell(w, h, i, n, x, y, z, rx = 0, ry = 0, rz = 0) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / n);
    return this.add(g, x, y, z, rx, ry, rz);
  }
  /** fills a solid vertex color — for merged emissive marker lights */
  tint(hex) {
    const g = this.geos[this.geos.length - 1];
    const c = new THREE.Color(hex);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return this;
  }
  build(mat, shadow = false) {
    const merged = BufferGeometryUtils.mergeGeometries(this.geos);
    this.geos = [];
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = shadow;
    return mesh;
  }
}

/** tire + rim/hubcap pairs merged into two meshes for the whole vehicle */
function buildWheels(parent, spots, r, w) {
  const tires = new Kit();
  const hubs = new Kit();
  for (const [x, y, z] of spots) {
    tires.cyl(r, r, w, 18, x, y, z, 0, 0, Math.PI / 2);
    hubs.cyl(r * 0.58, r * 0.58, w * 1.08, 12, x, y, z, 0, 0, Math.PI / 2);
    hubs.cyl(r * 0.2, r * 0.26, w * 1.3, 8, x, y, z, 0, 0, Math.PI / 2);
  }
  parent.add(tires.build(matTire()), hubs.build(matHub()));
}

/** wheel chock wedge (triangular prism lying on its side) */
function addChock(kit, x, z, ry = 0) {
  kit.cyl(0.16, 0.16, 0.34, 3, x, 0.14, z, 0, ry, Math.PI / 2);
}

class Battery {
  constructor(def, group, ctx) {
    this.def = def;
    this.id = def.id;
    this.group = group;
    this.ctx = ctx;
    this.state = BSTATE.READY;
    this.ammo = def.ammo;
    this.timer = 0;
    this.heat = 0;
    this.pendingTrack = null;
    this.tubeIndex = 0;
    // set by subclass builders:
    this.elevGroup = null;      // rotating/elevating part
    this.yawGroup = null;       // slewing part
    this.muzzles = [];          // Object3D muzzle anchors in launcher space
    this.statusLampMat = null;
    this.targetElev = 0;
    this.currentElev = 0;
    this.targetYaw = 0;
    this.currentYaw = 0;
    this.restElev = 0;
    this.restYaw = 0;
    this.time = 0;
    this.scorchMats = [];
  }

  get ready() { return this.state === BSTATE.READY && this.ammo > 0; }

  statusColor() {
    if (this.state === BSTATE.READY) return 0x3dff6e;
    if (this.state === BSTATE.PREP) return 0xffd23e;
    if (this.state === BSTATE.RELOAD) return 0xffa02e;
    return 0xff3a2e;
  }

  /** point launcher toward a world position (visual slew) */
  slewToward(worldPos) {
    _v.copy(worldPos).sub(this.group.position);
    const yaw = Math.atan2(_v.x, _v.z) - this.group.rotation.y;
    this.targetYaw = this.currentYaw + wrapPI(yaw - this.currentYaw);
    this.targetElev = this.maxElev;
  }

  /**
   * Begin launch sequence against a track. Returns {ok, reason}.
   * After def.prepTime the interceptor actually leaves the rail.
   */
  requestLaunch(track) {
    if (this.ammo <= 0) return { ok: false, reason: `${this.def.name} magazine empty` };
    if (this.state !== BSTATE.READY) return { ok: false, reason: `${this.def.name} not ready (${this.state})` };
    this.state = BSTATE.PREP;
    this.timer = this.def.prepTime;
    this.pendingTrack = track;
    if (track?.threat) this.slewToward(track.threat.pos);
    this.ctx.events.emit('battery-prep', { battery: this });
    return { ok: true };
  }

  cancelPending(reason = 'launch canceled') {
    if (this.state === BSTATE.PREP) {
      this.state = this.ammo > 0 ? BSTATE.READY : BSTATE.EMPTY;
      this.pendingTrack = null;
      this.ctx.events.emit('battery-abort', { battery: this, reason });
    }
  }

  muzzleWorld(out = new THREE.Vector3()) {
    const muzzle = this.muzzles[this.tubeIndex % this.muzzles.length];
    return muzzle.getWorldPosition(out);
  }
  muzzleDirWorld(out = new THREE.Vector3()) {
    const muzzle = this.muzzles[this.tubeIndex % this.muzzles.length];
    muzzle.getWorldDirection(out);
    return out;
  }

  _fire() {
    const track = this.pendingTrack;
    this.pendingTrack = null;
    this.tubeIndex++;
    this.ammo--;
    this.heat = 1;
    this.state = this.ammo > 0 ? BSTATE.RELOAD : BSTATE.EMPTY;
    this.timer = this.def.reloadTime;
    const muzzle = this.muzzleWorld(new THREE.Vector3());
    const dir = this.muzzleDirWorld(new THREE.Vector3());
    this.ctx.interceptors.launch(this, track, muzzle, dir);
    this.ctx.effects.launchBlast(new THREE.Vector3(this.group.position.x, 0.3, this.group.position.z), this.def.plumeScale);
    this.ctx.events.emit('battery-fired', { battery: this, track });
  }

  update(dt) {
    this.time += dt;
    // state machine
    if (this.state === BSTATE.PREP) {
      this.timer -= dt;
      // wait for slew to be roughly aligned before firing
      const aligned = Math.abs(wrapPI(this.currentYaw - this.targetYaw)) < 0.12 && Math.abs(this.currentElev - this.targetElev) < 0.1;
      if (this.timer <= 0 && (aligned || this.fixedVertical)) this._fire();
    } else if (this.state === BSTATE.RELOAD) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = this.ammo > 0 ? BSTATE.READY : BSTATE.EMPTY;
        this.ctx.events.emit('battery-ready', { battery: this });
      }
    }
    // return to rest pose when idle
    if (this.state === BSTATE.READY || this.state === BSTATE.EMPTY) {
      this.targetYaw = this.restYaw;
      this.targetElev = this.restElev;
    }
    // animate slew/elevation
    const slewRate = this.slewRate ?? 0.7;
    const dy = wrapPI(this.targetYaw - this.currentYaw);
    this.currentYaw += THREE.MathUtils.clamp(dy, -slewRate * dt, slewRate * dt);
    const de = this.targetElev - this.currentElev;
    this.currentElev += THREE.MathUtils.clamp(de, -(this.elevRate ?? 0.35) * dt, (this.elevRate ?? 0.35) * dt);
    if (this.yawGroup) this.yawGroup.rotation.y = this.currentYaw;
    if (this.elevGroup) this.elevGroup.rotation.x = -this.currentElev;
    // status lamp pulse
    if (this.statusLampMat) {
      const c = this.statusColor();
      const pulse = this.state === BSTATE.PREP ? (Math.sin(this.time * 14) > 0 ? 1 : 0.15) : (0.72 + 0.28 * Math.sin(this.time * 2.2));
      this.statusLampMat.color.set(c).multiplyScalar(pulse);
    }
    // heat discoloration cool-down
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - dt / 26);
      for (const m of this.scorchMats) {
        m.opacity = 0.32 + this.heat * 0.6;
      }
    }
    this._updateExtra?.(dt);
  }
}

// ---------------------------------------------------------------------------
export class Batteries {
  constructor(ctx) {
    // ctx: {scene, events, rng, base, effects, interceptors(assigned later)}
    this.ctx = ctx;
    this.list = [];
    this.map = new Map();
    const pads = ctx.base.pads;
    this._buildRampart(pads.rampart);
    this._buildZenith(pads.zenith);
    this._buildSentinel(pads.sentinel);
    for (const b of this.list) this.map.set(b.id, b);
  }

  get(id) { return this.map.get(id); }

  /** true while any launcher is visibly slewing/elevating (shadow cadence) */
  get anyMoving() {
    for (const b of this.list) {
      if (Math.abs(wrapPI(b.currentYaw - b.targetYaw)) > 0.01) return true;
      if (Math.abs(b.currentElev - b.targetElev) > 0.01) return true;
    }
    return false;
  }

  resetAll() {
    for (const b of this.list) {
      b.state = BSTATE.READY;
      b.ammo = b.def.ammo;
      b.timer = 0;
      b.pendingTrack = null;
      b.tubeIndex = 0;
      b._onReset?.();
    }
  }

  update(dt) { for (const b of this.list) b.update(dt); }

  // ------------------------------------------------------------- helpers --
  /** status beacon in a caged housing on a short mast */
  _mkStatusLamp(parent, x, y, z) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x3dff6e, toneMapped: false });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), mat);
    lamp.position.set(x, y, z);
    parent.add(lamp);
    const k = new Kit();
    k.cyl(0.028, 0.034, 0.44, 6, x, y - 0.3, z);        // mast
    k.cyl(0.125, 0.15, 0.12, 10, x, y - 0.13, z);       // housing base
    k.cyl(0.1, 0.115, 0.03, 10, x, y + 0.135, z);       // cap
    for (let i = 0; i < 4; i++) {                       // protective cage bars
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      k.box(0.018, 0.27, 0.018, x + Math.cos(a) * 0.105, y, z + Math.sin(a) * 0.105);
    }
    k.torus(0.108, 0.011, 12, x, y + 0.06, z, Math.PI / 2);
    k.torus(0.108, 0.011, 12, x, y - 0.06, z, Math.PI / 2);
    parent.add(k.build(matDark()));
    return mat;
  }

  _mkScorch(parent, x, y, z, size, normal = 'z') {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x181512, transparent: true, opacity: 0.32, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2,
    });
    const s = new THREE.Mesh(new THREE.CircleGeometry(size, 16), mat);
    s.position.set(x, y, z);
    if (normal === 'z') s.rotation.set(0, 0, 0);
    else if (normal === 'y') s.rotation.set(-Math.PI / 2, 0, 0);
    parent.add(s);
    return mat;
  }

  _hydraulic(parent, from, to, r = 0.07) {
    // two nested cylinders that stretch between anchors; re-posed in update
    const mat = matChrome();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), mat);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 1, 8), mat);
    parent.add(outer, inner);
    return { outer, inner, from: from.clone(), to };
  }
  _poseHydraulic(h, elevGroup) {
    // `to` is in elev space — transform to parent space (no allocations)
    _v.copy(h.to).applyMatrix4(elevGroup.matrix);
    _v2.copy(h.from);
    _dir.subVectors(_v, _v2);
    const len = _dir.length();
    _dir.normalize();
    h.outer.position.lerpVectors(_v2, _v, 0.25);
    h.outer.scale.set(1, len * 0.55, 1);
    h.outer.quaternion.setFromUnitVectors(_UP, _dir);
    h.inner.position.lerpVectors(_v2, _v, 0.75);
    h.inner.scale.set(1, len * 0.55, 1);
    h.inner.quaternion.copy(h.outer.quaternion);
  }

  /** shared per-pad ground kit: chocks are per-vehicle, this adds the rest */
  _groundKit(g, darkKit, { chest, ext, umbilical, junction }) {
    darkKit.box(1.15, 0.55, 0.52, chest[0], 0.285, chest[1], 0, chest[2] ?? 0);          // tool chest
    darkKit.box(1.19, 0.05, 0.56, chest[0], 0.56, chest[1], 0, chest[2] ?? 0);           // chest lid
    // generator umbilical: base.js runs a cable to the pad center — this is
    // the last meter rising into the vehicle's power junction.
    darkKit.tube(umbilical.map(p => new THREE.Vector3(...p)), 0.045);
    darkKit.box(0.3, 0.26, 0.2, junction[0], junction[1], junction[2]);
    const extMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.28), matExtinguisher());
    extMesh.position.set(ext[0], 0.36, ext[1]);
    if (ext[2]) extMesh.rotation.y = ext[2];
    g.add(extMesh);
  }

  // ------------------------------------------------------------- RAMPART --
  _buildRampart(pad) {
    const def = BATTERIES.rampart;
    const g = new THREE.Group();
    g.position.copy(pad.pos);
    g.rotation.y = pad.yaw;
    this.ctx.scene.add(g);
    const bat = new Battery(def, g, this.ctx);
    // Patriot-style geometry: pivot high near the canister rear so the tail
    // clears the deck at full elevation (~39°) instead of stabbing it.
    bat.maxElev = 0.68;
    bat.restElev = 0.25;
    bat.slewRate = 1.1;
    bat.elevRate = 0.5;

    const body = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#68715c', seed: 101 }), roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: 0.9 });

    // ---- trailer
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 6.4), body);
    bed.position.y = 1.05;
    bed.castShadow = true;
    g.add(bed);
    buildWheels(g, [
      [-1.2, 0.52, -1.9], [1.2, 0.52, -1.9], [-1.2, 0.52, -0.7], [1.2, 0.52, -0.7],
      [-1.2, 0.52, 2.2], [1.2, 0.52, 2.2],
      // illuminator trailer wheels share the same merged meshes
      [-5.5, 0.45, 3.4], [-3.7, 0.45, 3.4],
    ], 0.52, 0.4);
    // outriggers
    for (const [ox, oz] of [[-1.6, -2.6], [1.6, -2.6], [-1.6, 2.6], [1.6, 2.6]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.16), body);
      arm.position.set(ox * 0.72, 0.86, oz);
      arm.rotation.y = ox > 0 ? 0 : Math.PI;
      g.add(arm);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 8), dark);
      foot.position.set(ox, 0.42, oz);
      g.add(foot);
    }

    // ---- trailer detail kits (each merges to a single draw call)
    const bodyKit = new Kit();
    // drawbar A-frame + step + rails
    bodyKit.box(0.09, 0.09, 1.5, 0.29, 0.88, 3.87, -0.08, 0.42);
    bodyKit.box(0.09, 0.09, 1.5, -0.29, 0.88, 3.87, -0.08, -0.42);
    bodyKit.box(0.7, 0.08, 0.1, 0, 0.92, 3.45);
    bodyKit.box(0.55, 0.05, 0.32, 1.52, 0.52, 2.5);
    bodyKit.box(0.55, 0.05, 0.32, 1.62, 0.88, 2.5);
    bodyKit.box(0.05, 0.5, 0.05, 1.78, 1.1, 2.36);
    bodyKit.box(0.05, 0.5, 0.05, 1.78, 1.1, 2.64);
    // deck grab rails (front deck walkway)
    for (const sx of [-1.28, 1.28]) {
      bodyKit.cyl(0.026, 0.026, 2.4, 6, sx, 1.66, 1.9, Math.PI / 2);
      for (const rz of [0.8, 1.9, 3.0]) bodyKit.cyl(0.02, 0.024, 0.36, 6, sx, 1.48, rz);
    }
    g.add(bodyKit.build(body));

    const darkKit = new Kit();
    // mud flaps + rear rub rail + hitch ring + jack stand
    for (const sx of [-1.2, 1.2]) {
      darkKit.box(0.42, 0.5, 0.05, sx, 0.52, -2.48);
      darkKit.box(0.42, 0.5, 0.05, sx, 0.52, 2.78);
    }
    darkKit.box(2.75, 0.14, 0.1, 0, 0.92, -3.28);
    darkKit.torus(0.11, 0.028, 12, 0, 0.8, 4.52, Math.PI / 2);
    darkKit.cyl(0.045, 0.045, 0.55, 6, 0.35, 0.42, 4.1);
    darkKit.cyl(0.11, 0.13, 0.05, 8, 0.35, 0.14, 4.1);
    // static slew-ring collar + bolts around the turntable base
    darkKit.cyl(1.24, 1.3, 0.12, 20, 0, 1.34, -2.3);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      darkKit.cyl(0.032, 0.032, 0.07, 6, Math.cos(a) * 1.18, 1.42, -2.3 + Math.sin(a) * 1.18);
    }
    // junction boxes on the bed sides
    darkKit.box(0.22, 0.32, 0.3, 1.36, 1.1, 0.2);
    darkKit.box(0.22, 0.28, 0.26, -1.36, 1.08, -0.6);
    // wheel chocks
    addChock(darkKit, 1.2, 2.72, 0.2);
    addChock(darkKit, -1.2, -1.36, -0.15);
    // illuminator trailer jacks + ground cable to the launcher
    darkKit.cyl(0.05, 0.07, 0.62, 6, -4.0, 0.32, 2.45);
    darkKit.cyl(0.05, 0.07, 0.62, 6, -5.2, 0.32, 4.35);
    darkKit.tube([new THREE.Vector3(-3.9, 0.07, 3.1), new THREE.Vector3(-2.2, 0.04, 2.2), new THREE.Vector3(-0.6, 0.06, 0.2), new THREE.Vector3(0.55, 0.5, -0.9)], 0.05);
    this._groundKit(g, darkKit, {
      chest: [-2.7, 1.5, 0.35],
      ext: [-2.75, 0.55, 0.35],
      umbilical: [[0.15, 0.05, 0.4], [0.55, 0.35, 0.85], [0.78, 0.85, 1.28]],
      junction: [0.8, 0.98, 1.32],
    });
    g.add(darkKit.build(matDark()));

    const steelKit = new Kit();
    // hydraulic reservoir on the front deck + straps + filler
    steelKit.cyl(0.26, 0.26, 0.95, 12, -0.9, 1.58, 1.9, Math.PI / 2);
    steelKit.box(0.58, 0.06, 0.06, -0.9, 1.75, 1.62);
    steelKit.box(0.58, 0.06, 0.06, -0.9, 1.75, 2.18);
    steelKit.cyl(0.06, 0.06, 0.1, 8, -0.9, 1.88, 1.9);
    // lifting eyes at the bed corners
    for (const [ex, ez] of [[-1.22, -3.05], [1.22, -3.05], [-1.22, 3.05], [1.22, 3.05]]) {
      steelKit.torus(0.07, 0.022, 10, ex, 1.38, ez);
    }
    g.add(steelKit.build(matSteel()));

    // ---- yaw turntable + high rear pivot frame + elevating canister block
    bat.yawGroup = new THREE.Group();
    bat.yawGroup.position.set(0, 1.36, -2.3);
    g.add(bat.yawGroup);
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.26, 16), dark);
    bat.yawGroup.add(turntable);
    bat.elevGroup = new THREE.Group();
    bat.elevGroup.position.set(0, 0.94, 0.1);
    bat.yawGroup.add(bat.elevGroup);

    // A-frame trunnion supports + bearings + elevation drive (slews with yaw)
    const yawKit = new Kit();
    for (const sx of [-1.26, 1.26]) {
      yawKit.box(0.13, 1.0, 0.19, sx, 0.53, 0.32, -0.5);
      yawKit.box(0.13, 1.0, 0.19, sx, 0.53, -0.12, 0.5);
      yawKit.box(0.3, 0.16, 0.5, sx, 0.13, 0.1);
      yawKit.cyl(0.17, 0.17, 0.22, 10, sx, 0.94, 0.1, 0, 0, Math.PI / 2);
      yawKit.cyl(0.21, 0.21, 0.06, 10, sx * 1.09, 0.94, 0.1, 0, 0, Math.PI / 2);
    }
    yawKit.box(0.34, 0.3, 0.44, 1.05, 0.42, 0.62); // elevation drive motor
    bat.yawGroup.add(yawKit.build(matSteel()));
    const yawDark = new Kit();
    yawDark.tube([new THREE.Vector3(0.5, 0.1, 0.8), new THREE.Vector3(0.85, 0.5, 0.42), new THREE.Vector3(0.95, 0.9, 0.12)], 0.035);
    yawDark.tube([new THREE.Vector3(-0.5, 0.1, 0.8), new THREE.Vector3(-0.85, 0.5, 0.42), new THREE.Vector3(-0.95, 0.9, 0.12)], 0.035);
    yawDark.box(0.3, 0.24, 0.24, 0.55, 0.24, 0.85);
    bat.yawGroup.add(yawDark.build(matDark()));

    const canTex = panelTexture({ base: '#747e66', seed: 103, label: 'RMP-4' });
    const canMat = new THREE.MeshStandardMaterial({ map: canTex, roughness: 0.66 });
    const capMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#525a48', seed: 104, rivets: false }), roughness: 0.8 });
    const CAN_Z = 1.4; // canister center ahead of pivot → short tail overhang
    bat.canisters = [];
    bat._capOpen = [0, 0, 0, 0];
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const can = new THREE.Group();
        can.position.set((cx - 0.5) * 1.24, (cy - 0.5) * 1.06 + 0.62, CAN_Z);
        bat.elevGroup.add(can);
        const tube = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.96, 4.6), canMat);
        tube.castShadow = true;
        can.add(tube);
        // hinged front cap — swings open when this tube fires
        const hinge = new THREE.Group();
        hinge.position.set(0, 0.44, 2.34);
        can.add(hinge);
        const capKit = new Kit();
        capKit.box(1.04, 0.88, 0.09, 0, -0.44, 0);
        capKit.cyl(0.1, 0.12, 0.06, 8, 0, -0.44, 0.06);           // center boss
        capKit.box(0.16, 0.05, 0.06, -0.38, -0.8, 0.05);          // latch handles
        capKit.box(0.16, 0.05, 0.06, 0.38, -0.8, 0.05);
        capKit.box(0.16, 0.05, 0.06, -0.38, -0.08, 0.05);
        capKit.box(0.16, 0.05, 0.06, 0.38, -0.08, 0.05);
        const cap = capKit.build(capMat.clone());
        hinge.add(cap);
        bat.scorchMats.push(this._mkScorch(can, 0, 0, 2.36, 0.42));
        const muzzle = new THREE.Object3D();
        muzzle.position.set(0, 0, 2.4);
        can.add(muzzle);
        bat.muzzles.push(muzzle);
        bat.canisters.push({ can, cap, hinge });
      }
    }
    // dark tube interiors revealed when caps open (merged, elev space)
    const interiorKit = new Kit();
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        interiorKit.circle(0.44, 14, (cx - 0.5) * 1.24, (cy - 0.5) * 1.06 + 0.62, CAN_Z + 2.28);
      }
    }
    bat.elevGroup.add(interiorKit.build(new THREE.MeshStandardMaterial({ color: 0x0b0c0b, roughness: 0.95 })));

    // canister rib frames + block end-frames (all merged: 1 draw call)
    const ribKit = new Kit();
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const px = (cx - 0.5) * 1.24, py = (cy - 0.5) * 1.06 + 0.62;
        for (const rz of [-0.15, 1.25, 2.65]) {
          ribKit.box(1.22, 0.05, 0.09, px, py + 0.51, rz);
          ribKit.box(1.22, 0.05, 0.09, px, py - 0.51, rz);
          ribKit.box(0.05, 1.06, 0.09, px + 0.6, py, rz);
          ribKit.box(0.05, 1.06, 0.09, px - 0.6, py, rz);
        }
      }
    }
    for (const fz of [3.62, -0.86]) { // block end frames w/ cross members
      ribKit.box(2.64, 0.09, 0.12, 0, 1.7, fz);
      ribKit.box(2.64, 0.09, 0.12, 0, -0.45, fz);
      ribKit.box(0.09, 2.24, 0.12, -1.28, 0.62, fz);
      ribKit.box(0.09, 2.24, 0.12, 1.28, 0.62, fz);
      ribKit.box(0.09, 2.15, 0.12, 0, 0.62, fz);
      ribKit.box(2.5, 0.09, 0.12, 0, 0.62, fz);
    }
    // elevation gear arc under the block (meshes with the drive pinion)
    ribKit.add(new THREE.CylinderGeometry(0.66, 0.66, 0.07, 16, 1, false, Math.PI * 0.95, Math.PI * 0.6), 1.19, 0, 0, 0, 0, Math.PI / 2);
    bat.elevGroup.add(ribKit.build(matRib()));

    // cable runs from the pivot axis into the canister block + junctions
    const elevDark = new Kit();
    elevDark.tube([new THREE.Vector3(0.95, 0, 0), new THREE.Vector3(1.3, 0.28, -0.5), new THREE.Vector3(0.74, 0.55, -1.0)], 0.035);
    elevDark.tube([new THREE.Vector3(-0.95, 0, 0), new THREE.Vector3(-1.3, 0.2, -0.45), new THREE.Vector3(-0.74, 0.1, -1.0)], 0.035);
    elevDark.box(0.3, 0.26, 0.14, 0.74, 0.55, -0.95);
    elevDark.box(0.3, 0.26, 0.14, -0.74, 0.1, -0.95);
    bat.elevGroup.add(elevDark.build(matDark()));

    // tactical numbers (one strip texture, merged planes on outer flanks)
    const numTex = stripTexture(['01', '02', '03', '04']);
    const numKit = new Kit();
    let mi = 0;
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const px = (cx - 0.5) * 1.24, py = (cy - 0.5) * 1.06 + 0.62;
        const side = cx === 0 ? -1 : 1;
        numKit.cell(0.5, 0.3, mi, 4, px + side * 0.575, py, CAN_Z + 0.6, 0, side * Math.PI / 2);
        mi++;
      }
    }
    bat.elevGroup.add(numKit.build(new THREE.MeshBasicMaterial({ map: numTex, transparent: true })));

    // hazard placards on the block
    const placKit = new Kit();
    placKit.plane(0.24, 0.24, 1.3, -0.15, 1.8, 0, Math.PI / 2);
    placKit.plane(0.24, 0.24, -1.3, -0.15, 1.8, 0, -Math.PI / 2);
    placKit.plane(0.24, 0.24, 0, 0.3, -0.94, 0, Math.PI);
    bat.elevGroup.add(placKit.build(matPlacard()));

    // unit stencil on both bed flanks
    const btryTex = stencilTexture('BTRY A-2', { w: 256, h: 56, size: 36 });
    const btryKit = new Kit();
    btryKit.plane(1.15, 0.26, 1.36, 1.06, 1.4, 0, Math.PI / 2);
    btryKit.plane(1.15, 0.26, -1.36, 1.06, 1.4, 0, -Math.PI / 2);
    g.add(btryKit.build(new THREE.MeshBasicMaterial({ map: btryTex, transparent: true })));

    // marker lights (dim, emissive — read at night)
    const markKit = new Kit();
    markKit.box(0.07, 0.07, 0.05, -1.28, 1.32, 3.16).tint(0xd88a28);
    markKit.box(0.07, 0.07, 0.05, 1.28, 1.32, 3.16).tint(0xd88a28);
    markKit.box(0.07, 0.07, 0.05, -1.28, 1.32, -3.16).tint(0xc23524);
    markKit.box(0.07, 0.07, 0.05, 1.28, 1.32, -3.16).tint(0xc23524);
    markKit.box(0.06, 0.06, 0.05, -4.6, 1.22, 2.32).tint(0xd88a28);
    g.add(markKit.build(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));

    // hydraulics: turntable → canister block underside
    bat._hyd = [
      this._hydraulic(bat.yawGroup, new THREE.Vector3(-0.85, 0.02, 0.3), new THREE.Vector3(-0.8, -0.44, 1.15)),
      this._hydraulic(bat.yawGroup, new THREE.Vector3(0.85, 0.02, 0.3), new THREE.Vector3(0.8, -0.44, 1.15)),
    ];

    bat.statusLampMat = this._mkStatusLamp(g, 1.25, 1.62, 2.9);

    // ---- separate illuminator radar trailer
    const illumBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), body);
    illumBase.position.set(-4.6, 0.65, 3.4);
    illumBase.castShadow = true;
    g.add(illumBase);
    const illum = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.35, 0.16),
      new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#7d876f', seed: 105, label: 'ILM-2' }), roughness: 0.6 }),
    );
    illum.position.set(-4.6, 1.9, 3.4);
    illum.rotation.x = -0.3;
    illum.castShadow = true;
    g.add(illum);
    // phased-array face + feed horn + pedestal detail riding on the panel
    const illumKit = new Kit();
    illumKit.plane(1.5, 1.16, 0, 0.02, 0.085);
    illumKit.box(0.1, 0.1, 0.55, 0, -0.5, 0.3, -0.5);
    illumKit.cyl(0.06, 0.09, 0.16, 8, 0, -0.66, 0.52);
    const illumFace = illumKit.build(matArray());
    illum.add(illumFace);

    // hazard stripes on trailer edge
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.18),
      new THREE.MeshBasicMaterial({ map: hazardStripesTexture([2, 1]) }),
    );
    stripe.position.set(0, 0.82, 3.22);
    g.add(stripe);

    // open fired caps; reset closes them again
    this.ctx.events.on('battery-fired', ({ battery }) => {
      if (battery !== bat) return;
      bat._capOpen[bat.tubeIndex % bat.canisters.length] = 1;
    });
    bat._onReset = () => {
      bat._capOpen.fill(0);
      for (const c of bat.canisters) c.hinge.rotation.x = 0;
    };

    bat._updateExtra = (dt) => {
      for (const h of bat._hyd) this._poseHydraulic(h, bat.elevGroup);
      // illuminator wobble
      illum.rotation.y = Math.sin(bat.time * 0.6) * 0.5 + 0.3;
      // blown caps swing up and stay open until reload/reset
      for (let i = 0; i < bat.canisters.length; i++) {
        const hinge = bat.canisters[i].hinge;
        const want = bat._capOpen[i] * -2.3;
        hinge.rotation.x += (want - hinge.rotation.x) * Math.min(1, dt * 7);
      }
    };

    this.ctx.base.boxCollider(pad.pos.x, pad.pos.z, 5.5, 8.5, 3);
    this.ctx.base.boxCollider(
      pad.pos.x + Math.sin(pad.yaw + Math.PI / 2) * -4.6,
      pad.pos.z + Math.cos(pad.yaw + Math.PI / 2) * -4.6, 2.5, 3, 2.4,
    );
    this.list.push(bat);
  }

  // -------------------------------------------------------------- ZENITH --
  _buildZenith(pad) {
    const def = BATTERIES.zenith;
    const g = new THREE.Group();
    g.position.copy(pad.pos);
    g.rotation.y = pad.yaw;
    this.ctx.scene.add(g);
    const bat = new Battery(def, g, this.ctx);
    // THAAD-style: pivot on a pedestal just behind the cab, muzzles stowed
    // high over the rear; erection swings the muzzle end up-rearward and the
    // short stub end clears the chassis at full 70° elevation.
    bat.maxElev = 1.22;
    bat.restElev = 0.18;
    bat.slewRate = 0.55;
    bat.elevRate = 0.3;
    bat.restYaw = Math.PI;      // rest pose points the rack over the tail
    bat.currentYaw = Math.PI;
    bat.targetYaw = Math.PI;

    const body = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#746e58', seed: 111 }), roughness: 0.78 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x26241d, roughness: 0.9 });

    // ---- heavy truck: cab + long chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.7, 9.6), body);
    chassis.position.y = 1.25;
    chassis.castShadow = true;
    g.add(chassis);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.7, 2.0), body);
    cab.position.set(0, 2.15, 4.6);
    cab.castShadow = true;
    g.add(cab);
    // glazing: windshield + door glass merged into one mesh
    const glassKit = new Kit();
    glassKit.box(2.64, 0.6, 0.05, 0, 2.52, 5.62);
    glassKit.box(0.05, 0.55, 1.15, -1.47, 2.5, 4.75);
    glassKit.box(0.05, 0.55, 1.15, 1.47, 2.5, 4.75);
    g.add(glassKit.build(matGlass()));
    // radiator grille
    const grille = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 0.62), matGrille());
    grille.position.set(0, 1.78, 5.615);
    g.add(grille);

    buildWheels(g, [
      [-1.35, 0.68, 3.6], [1.35, 0.68, 3.6], [-1.35, 0.68, 1.85], [1.35, 0.68, 1.85],
      [-1.35, 0.68, 0.1], [1.35, 0.68, 0.1], [-1.35, 0.68, -1.65], [1.35, 0.68, -1.65],
      [-1.35, 0.68, -3.4], [1.35, 0.68, -3.4],
    ], 0.68, 0.5);

    const bodyKit = new Kit();
    // roof visor + intake snorkel + cab steps
    bodyKit.box(2.86, 0.07, 0.5, 0, 3.06, 5.42, -0.12);
    bodyKit.box(0.26, 0.85, 0.26, 1.24, 2.72, 3.72);
    bodyKit.box(0.32, 0.22, 0.34, 1.24, 3.22, 3.72);
    for (const sx of [-1.5, 1.5]) {
      bodyKit.box(0.55, 0.05, 0.35, sx, 1.0, 4.5);
      bodyKit.box(0.55, 0.05, 0.35, sx, 0.62, 4.5);
    }
    // pivot pedestal behind the cab + rest cradle mid-chassis
    bodyKit.box(1.9, 0.62, 1.9, 0, 1.9, 2.0);
    bodyKit.box(0.14, 1.4, 0.14, -0.75, 2.25, -0.6, 0, 0, 0.22);
    bodyKit.box(0.14, 1.4, 0.14, 0.75, 2.25, -0.6, 0, 0, -0.22);
    bodyKit.box(2.0, 0.14, 0.42, 0, 2.92, -0.6);
    // side storage box behind the cab
    bodyKit.box(1.3, 0.62, 0.5, -1.1, 1.95, 3.15);
    g.add(bodyKit.build(body));

    const darkKit = new Kit();
    // bumper + tow pins + mirrors + grab rails + mud flaps + driveline
    darkKit.box(3.0, 0.34, 0.26, 0, 1.12, 5.74);
    darkKit.cyl(0.05, 0.05, 0.3, 6, -0.5, 1.05, 5.85, Math.PI / 2);
    darkKit.cyl(0.05, 0.05, 0.3, 6, 0.5, 1.05, 5.85, Math.PI / 2);
    for (const sx of [-1, 1]) {
      darkKit.cyl(0.02, 0.02, 0.5, 5, sx * 1.55, 2.92, 5.42, 0, 0, sx * 1.2);
      darkKit.box(0.05, 0.36, 0.2, sx * 1.76, 2.72, 5.5);
      darkKit.cyl(0.024, 0.024, 1.15, 5, sx * 1.48, 2.05, 3.72);
      darkKit.box(0.42, 0.6, 0.05, sx * 1.35, 0.62, -4.12);
      darkKit.box(0.42, 0.6, 0.05, sx * 1.35, 0.62, 1.1);
    }
    darkKit.cyl(0.06, 0.06, 6.6, 6, 0, 0.78, 0.4, Math.PI / 2);
    for (const az of [0.1, -1.65, -3.4]) darkKit.box(0.42, 0.36, 0.42, 0, 0.7, az);
    // rear leveling jacks (deployed under the overhanging rack)
    for (const sx of [-1.25, 1.25]) {
      darkKit.box(0.2, 0.95, 0.2, sx, 0.72, -4.5);
      darkKit.cyl(0.2, 0.24, 0.08, 8, sx, 0.22, -4.5);
    }
    // chassis junction boxes + chocks
    darkKit.box(0.16, 0.36, 0.32, 1.51, 1.08, 1.0);
    darkKit.box(0.16, 0.3, 0.28, -1.51, 1.05, -0.4);
    addChock(darkKit, 1.35, 4.45, 0.1);
    addChock(darkKit, -1.35, 4.45, -0.1);
    addChock(darkKit, 1.35, -4.22, 0.25);
    this._groundKit(g, darkKit, {
      chest: [-2.9, 2.2, -0.25],
      ext: [-2.9, 1.15, -0.25],
      umbilical: [[0.2, 0.05, 0.3], [0.7, 0.35, 0.7], [1.3, 0.9, 1.0]],
      junction: [1.42, 1.02, 1.0],
    });
    g.add(darkKit.build(matDark()));

    const steelKit = new Kit();
    // fuel tank + exhaust stack + hydraulic reservoir
    steelKit.cyl(0.38, 0.38, 1.5, 12, 1.62, 1.05, 2.5, Math.PI / 2);
    steelKit.box(0.82, 0.07, 0.06, 1.62, 1.42, 2.2);
    steelKit.box(0.82, 0.07, 0.06, 1.62, 1.42, 2.8);
    steelKit.cyl(0.09, 0.09, 1.7, 8, -1.42, 2.45, 3.48);
    steelKit.cyl(0.12, 0.12, 0.2, 8, -1.42, 3.35, 3.48);
    steelKit.cyl(0.05, 0.09, 0.14, 6, -1.42, 3.52, 3.48);
    steelKit.cyl(0.3, 0.3, 0.9, 10, 0.85, 1.85, -2.2, 0, 0, Math.PI / 2);
    g.add(steelKit.build(matSteel()));

    // ---- erecting tube rack (2×3 round tubes) on a pedestal turntable.
    // Rest yaw is π, so the rack's local +z (muzzles) points over the tail.
    bat.yawGroup = new THREE.Group();
    bat.yawGroup.position.set(0, 2.15, 2.0);
    bat.yawGroup.rotation.y = Math.PI;
    g.add(bat.yawGroup);
    bat.elevGroup = new THREE.Group();
    bat.yawGroup.add(bat.elevGroup);
    // visual settle group: tubes lag a touch behind the rack during erection
    const tubesGroup = new THREE.Group();
    bat.elevGroup.add(tubesGroup);

    const yawKit = new Kit();
    yawKit.cyl(1.05, 1.2, 0.22, 20, 0, -0.08, 0);
    for (const sx of [-1.44, 1.44]) {
      yawKit.cyl(0.2, 0.2, 0.24, 10, sx, 0, 0, 0, 0, Math.PI / 2);
      yawKit.box(0.3, 0.34, 0.46, sx, -0.14, 0);
    }
    yawKit.box(0.32, 0.32, 0.5, 1.28, -0.3, 0.62); // elevation drive
    // clevis lugs where the erection cylinders foot onto the turntable rim
    yawKit.box(0.2, 0.26, 0.3, -1.0, -0.25, 1.0);
    yawKit.box(0.2, 0.26, 0.3, 1.0, -0.25, 1.0);
    bat.yawGroup.add(yawKit.build(matSteel()));

    const RACK_Z = 2.7; // rack center ahead of pivot; stub ends 0.6 m behind
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.35, 6.6), body);
    rack.position.set(0, 0.55, RACK_Z);
    rack.castShadow = true;
    bat.elevGroup.add(rack);
    const tubeMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#858e77', seed: 113 }), roughness: 0.6 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x3d4434, roughness: 0.75 });
    const tubeGeo = new THREE.CylinderGeometry(0.44, 0.44, 6.4, 14);
    tubeGeo.rotateX(Math.PI / 2);
    for (let cx = 0; cx < 3; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set((cx - 1) * 0.95, 1.06 + cy * 0.92, RACK_Z);
        tube.castShadow = true;
        tubesGroup.add(tube);
        const cap = new THREE.Mesh(new THREE.CircleGeometry(0.41, 14), capMat.clone());
        cap.position.set((cx - 1) * 0.95, 1.06 + cy * 0.92, RACK_Z + 3.22);
        tubesGroup.add(cap);
        bat.scorchMats.push(this._mkScorch(tubesGroup, (cx - 1) * 0.95, 1.06 + cy * 0.92, RACK_Z + 3.24, 0.44));
        const muzzle = new THREE.Object3D();
        muzzle.position.set((cx - 1) * 0.95, 1.06 + cy * 0.92, RACK_Z + 3.3);
        bat.elevGroup.add(muzzle);
        bat.muzzles.push(muzzle);
      }
    }

    // clamp bands + saddles around every tube (single merged mesh)
    const clampKit = new Kit();
    for (let cx = 0; cx < 3; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const px = (cx - 1) * 0.95, py = 1.06 + cy * 0.92;
        for (const cz of [RACK_Z - 2.1, RACK_Z, RACK_Z + 2.1]) {
          clampKit.torus(0.455, 0.035, 18, px, py, cz);
        }
      }
      for (const cz of [RACK_Z - 2.1, RACK_Z + 2.1]) {
        clampKit.box(0.3, 0.34, 0.22, (cx - 1) * 0.95, 0.83, cz);
      }
    }
    tubesGroup.add(clampKit.build(matRib()));

    // rack end frames, side rails, lifting eyes, gear arc
    const frameKit = new Kit();
    for (const fz of [RACK_Z + 3.05, RACK_Z - 3.25]) {
      frameKit.box(3.08, 0.1, 0.14, 0, 2.56, fz);
      frameKit.box(3.08, 0.1, 0.14, 0, 0.5, fz);
      frameKit.box(0.1, 2.16, 0.14, -1.49, 1.53, fz);
      frameKit.box(0.1, 2.16, 0.14, 1.49, 1.53, fz);
      frameKit.box(0.06, 2.0, 0.12, -0.475, 1.53, fz);
      frameKit.box(0.06, 2.0, 0.12, 0.475, 1.53, fz);
      frameKit.box(2.9, 0.06, 0.12, 0, 1.52, fz);
    }
    frameKit.box(0.08, 0.2, 6.6, -1.42, 0.82, RACK_Z);
    frameKit.box(0.08, 0.2, 6.6, 1.42, 0.82, RACK_Z);
    for (const [ex, ez] of [[-1.2, RACK_Z - 3.1], [1.2, RACK_Z - 3.1], [-1.2, RACK_Z + 2.9], [1.2, RACK_Z + 2.9]]) {
      frameKit.torus(0.07, 0.02, 10, ex, 0.8, ez);
    }
    frameKit.add(new THREE.CylinderGeometry(0.7, 0.7, 0.07, 16, 1, false, Math.PI * 0.95, Math.PI * 0.6), 1.32, 0, 0, 0, 0, Math.PI / 2);
    tubesGroup.add(frameKit.build(matRib()));

    // cable conduit along the rack + hose loops across the pivot axis
    const rackDark = new Kit();
    rackDark.box(0.1, 0.14, 5.4, 1.44, 0.62, RACK_Z - 0.2);
    rackDark.box(0.12, 1.9, 0.14, 1.44, 1.5, RACK_Z - 3.15);
    rackDark.tube([new THREE.Vector3(0.95, 0, 0), new THREE.Vector3(1.35, 0.3, 0.7), new THREE.Vector3(1.44, 0.55, 1.4)], 0.04);
    rackDark.tube([new THREE.Vector3(-0.95, 0, 0), new THREE.Vector3(-1.3, 0.25, 0.9), new THREE.Vector3(-1.1, 0.42, 1.6)], 0.04);
    rackDark.box(0.24, 0.3, 0.2, 1.44, 0.55, 1.55);
    bat.elevGroup.add(rackDark.build(matDark()));

    // tube numbers on the caps (merged strip decal)
    const numKit = new Kit();
    let ni = 0;
    for (let cx = 0; cx < 3; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        numKit.cell(0.3, 0.2, ni, 6, (cx - 1) * 0.95, 1.28 + cy * 0.92, RACK_Z + 3.23);
        ni++;
      }
    }
    tubesGroup.add(numKit.build(new THREE.MeshBasicMaterial({ map: stripTexture(['1', '2', '3', '4', '5', '6'], { cw: 64, size: 40 }), transparent: true })));

    // hazard placards on rack flanks + rear frame
    const placKit = new Kit();
    placKit.plane(0.26, 0.26, -1.46, 1.0, RACK_Z + 1.6, 0, -Math.PI / 2);
    placKit.plane(0.26, 0.26, 1.46, 2.1, RACK_Z - 1.4, 0, Math.PI / 2);
    placKit.plane(0.26, 0.26, 0, 1.9, RACK_Z - 3.33, 0, Math.PI);
    bat.elevGroup.add(placKit.build(matPlacard()));

    // big unit label on the rack side
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.5),
      new THREE.MeshBasicMaterial({ map: stencilTexture('ZN-8 ZENITH', { w: 512, h: 96, size: 56 }), transparent: true }),
    );
    label.position.set(1.46, 0.72, RACK_Z + 0.3);
    label.rotation.y = Math.PI / 2;
    bat.elevGroup.add(label);
    // unit stencil on the cab doors
    const btryKit = new Kit();
    btryKit.plane(0.85, 0.22, 1.46, 2.05, 4.35, 0, Math.PI / 2);
    btryKit.plane(0.85, 0.22, -1.46, 2.05, 4.35, 0, -Math.PI / 2);
    g.add(btryKit.build(new THREE.MeshBasicMaterial({ map: stencilTexture('BTRY B-1', { w: 256, h: 56, size: 36 }), transparent: true })));

    // markers: roof ambers, red tails, dim headlights
    const markKit = new Kit();
    for (const mx of [-0.55, 0, 0.55]) markKit.box(0.07, 0.07, 0.05, mx, 3.06, 5.56).tint(0xd88a28);
    markKit.box(0.07, 0.07, 0.05, -1.42, 1.35, -4.78).tint(0xc23524);
    markKit.box(0.07, 0.07, 0.05, 1.42, 1.35, -4.78).tint(0xc23524);
    markKit.box(0.2, 0.12, 0.05, -1.0, 1.42, 5.63).tint(0x9f9576);
    markKit.box(0.2, 0.12, 0.05, 1.0, 1.42, 5.63).tint(0x9f9576);
    g.add(markKit.build(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));

    bat._hyd = [
      this._hydraulic(bat.yawGroup, new THREE.Vector3(-1.0, -0.18, 1.0), new THREE.Vector3(-1.0, 0.4, 2.75)),
      this._hydraulic(bat.yawGroup, new THREE.Vector3(1.0, -0.18, 1.0), new THREE.Vector3(1.0, 0.4, 2.75)),
    ];

    // two-stage erection: fast swing, then a slow final creep while the
    // tubes visually settle (spring-follower on elevation velocity).
    bat._prevElev = 0;
    bat._settle = 0;
    bat._updateExtra = (dt) => {
      for (const h of bat._hyd) this._poseHydraulic(h, bat.elevGroup);
      const rem = bat.targetElev - bat.currentElev;
      bat.elevRate = rem > 0.14 ? 0.5 : (rem > 0.0001 ? 0.1 : 0.3);
      if (dt > 0) {
        const vel = (bat.currentElev - bat._prevElev) / dt;
        bat._prevElev = bat.currentElev;
        bat._settle += (vel * 0.16 - bat._settle) * Math.min(1, dt * 5);
        tubesGroup.rotation.x = bat._settle;
      }
    };
    bat._onReset = () => {
      bat._settle = 0;
      bat._prevElev = bat.currentElev;
      tubesGroup.rotation.x = 0;
    };
    bat.statusLampMat = this._mkStatusLamp(g, 1.45, 3.28, 4.4);

    this.ctx.base.boxCollider(pad.pos.x, pad.pos.z, 6, 11, 3.4);
    this.list.push(bat);
  }

  // ------------------------------------------------------------ SENTINEL --
  _buildSentinel(pad) {
    const def = BATTERIES.sentinel;
    const g = new THREE.Group();
    g.position.copy(pad.pos);
    g.rotation.y = pad.yaw;
    this.ctx.scene.add(g);
    const bat = new Battery(def, g, this.ctx);
    bat.fixedVertical = true;
    bat.maxElev = 0; bat.restElev = 0;

    const steel = new THREE.MeshStandardMaterial({ map: metalTexture('#666d6b', 121), roughness: 0.5, metalness: 0.7 });
    // gantry lattice gets a rougher, less metallic finish so the sun-facing
    // braces don't bloom into a single white mass at close range
    const gantrySteel = new THREE.MeshStandardMaterial({ map: metalTexture('#6d7472', 122), roughness: 0.62, metalness: 0.45 });
    const conc = new THREE.MeshStandardMaterial({ map: concreteTexture([2, 2]), roughness: 0.95 });

    // raised blast pad with deflector wedge
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(11, 1.1, 11), conc);
    plinth.position.y = 0.55;
    plinth.receiveShadow = true;
    g.add(plinth);
    const deflector = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, 1.4, 4), steel);
    deflector.position.set(0, 1.6, -3.4);
    deflector.rotation.y = Math.PI / 4;
    deflector.castShadow = true;
    g.add(deflector);

    // twin silo tubes
    const tubeMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#6d7876', seed: 123, label: 'LR-X' }), roughness: 0.55, metalness: 0.35 });
    bat.hatches = [];
    for (const sx of [-1.9, 1.9]) {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 7.8, 18), tubeMat);
      silo.position.set(sx, 4.6, 0.6);
      silo.castShadow = true;
      g.add(silo);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.4, 18), steel);
      collar.position.set(sx, 8.4, 0.6);
      g.add(collar);
      // hinged hatch with rim, brackets, latch lugs and center boss
      const hinge = new THREE.Group();
      hinge.position.set(sx - 1.08, 8.62, 0.6);
      g.add(hinge);
      const hatchKit = new Kit();
      hatchKit.cyl(1.1, 1.1, 0.14, 18, 1.08, 0, 0);
      hatchKit.torus(0.99, 0.032, 24, 1.08, 0.07, 0, Math.PI / 2);
      hatchKit.cyl(0.18, 0.22, 0.1, 10, 1.08, 0.1, 0);
      hatchKit.box(0.34, 0.14, 0.2, 0.1, 0, -0.4);
      hatchKit.box(0.34, 0.14, 0.2, 0.1, 0, 0.4);
      for (let l = 0; l < 5; l++) {
        const a = -0.9 + l * 0.45;
        hatchKit.box(0.16, 0.06, 0.1, 1.08 + Math.cos(a) * 1.02, -0.06, Math.sin(a) * 1.02, 0, -a);
      }
      const hatch = hatchKit.build(steel);
      hatch.castShadow = true;
      hinge.add(hatch);
      bat.hatches.push(hinge);
      bat.scorchMats.push(this._mkScorch(g, sx, 8.63, 0.6, 0.95, 'y'));
      const muzzle = new THREE.Object3D();
      muzzle.position.set(sx, 8.7, 0.6);
      muzzle.rotation.x = -Math.PI / 2; // world dir = up
      g.add(muzzle);
      bat.muzzles.push(muzzle);
    }

    // warm interior glow visible while the hatches stand open in PREP
    const glowKit = new Kit();
    glowKit.circle(0.92, 18, -1.9, 8.66, 0.6, -Math.PI / 2);
    glowKit.circle(0.92, 18, 1.9, 8.66, 0.6, -Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTexture(), color: 0xffa14e, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const glow = glowKit.build(glowMat);
    glow.visible = false;
    g.add(glow);

    // silo hardware: base flanges, ring stiffeners, access ladder w/ cage,
    // fire-suppression tanks, stair handrail — one merged steel mesh
    const steelKit = new Kit();
    for (const sx of [-1.9, 1.9]) {
      steelKit.cyl(1.3, 1.36, 0.24, 18, sx, 1.32, 0.6);
      for (const ry of [2.6, 4.6, 6.6]) steelKit.torus(1.13, 0.045, 24, sx, ry, 0.6, Math.PI / 2);
    }
    {
      // ladder up the +x silo
      const lx = 1.9 + 1.24;
      steelKit.cyl(0.025, 0.025, 6.4, 6, lx, 4.6, 0.44);
      steelKit.cyl(0.025, 0.025, 6.4, 6, lx, 4.6, 0.76);
      for (let i = 0; i < 14; i++) steelKit.box(0.05, 0.04, 0.4, lx, 1.6 + i * 0.46, 0.6);
      for (let i = 0; i < 4; i++) {
        steelKit.torus(0.4, 0.02, 12, lx - 0.08, 3.4 + i * 1.3, 0.6, Math.PI / 2, 0, 0, Math.PI);
      }
    }
    // umbilical tower gantry: cross braces, collar bands, platforms, rails
    for (const face of [-1, 1]) {
      for (let lvl = 0; lvl < 6; lvl++) {
        const y = 1.7 + lvl * 1.5;
        steelKit.box(0.055, 1.58, 0.055, face * 0.47, y, 3.4, (lvl % 2 ? 0.6 : -0.6));
        steelKit.box(0.055, 1.58, 0.055, 0, y, 3.4 + face * 0.47, 0, 0, (lvl % 2 ? 0.6 : -0.6));
      }
    }
    for (const y of [2.45, 4.95, 7.45, 9.95]) steelKit.box(1.02, 0.09, 1.02, 0, y, 3.4);
    for (const py of [4.75, 7.15]) {
      steelKit.box(1.7, 0.07, 1.5, 0, py, 2.55);
      for (const px of [-0.78, 0.78]) {
        steelKit.cyl(0.02, 0.02, 0.55, 5, px, py + 0.3, 1.85);
        steelKit.box(0.045, 0.045, 1.4, px, py + 0.58, 2.5);
      }
      steelKit.box(1.6, 0.045, 0.045, 0, py + 0.58, 1.83);
    }
    // tower ladder
    steelKit.cyl(0.022, 0.022, 9.2, 5, -0.18, 5.5, 3.92);
    steelKit.cyl(0.022, 0.022, 9.2, 5, 0.18, 5.5, 3.92);
    for (let i = 0; i < 20; i++) steelKit.box(0.36, 0.035, 0.035, 0, 1.3 + i * 0.46, 3.92);
    // fire-suppression tank farm on the plinth
    steelKit.cyl(0.32, 0.32, 1.6, 12, 3.7, 1.95, 2.5);
    steelKit.cyl(0.32, 0.32, 1.6, 12, 4.4, 1.95, 3.3);
    steelKit.cyl(0.05, 0.05, 0.8, 6, 4.05, 2.85, 2.9, 0, 0, Math.PI / 2);
    steelKit.tube([new THREE.Vector3(3.7, 2.8, 2.5), new THREE.Vector3(3.2, 2.4, 1.9), new THREE.Vector3(2.75, 1.5, 1.35)], 0.045);
    // stair handrail
    steelKit.cyl(0.03, 0.03, 1.75, 6, 4.32, 1.05, 6.25, 0.55);
    steelKit.cyl(0.024, 0.024, 0.5, 5, 4.32, 0.62, 6.95);
    steelKit.cyl(0.024, 0.024, 0.5, 5, 4.32, 1.12, 5.6);
    // beacon mast
    steelKit.cyl(0.025, 0.035, 0.5, 6, 0.42, 11.2, 3.0);
    g.add(steelKit.build(gantrySteel));

    // photogrammetry checker theme: silo bands + gantry collar (test article)
    const checkKit = new Kit();
    checkKit.add(new THREE.CylinderGeometry(1.12, 1.12, 0.55, 20, 1, true), -1.9, 7.55, 0.6);
    checkKit.add(new THREE.CylinderGeometry(1.12, 1.12, 0.55, 20, 1, true), 1.9, 7.55, 0.6);
    checkKit.box(1.04, 0.5, 1.04, 0, 10.55, 3.4);
    checkKit.box(1.04, 0.5, 1.04, 0, 1.55, 3.4);
    const checkMesh = checkKit.build(matChecker());
    g.add(checkMesh);

    // umbilical tower core
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.9, 10.4, 0.9), gantrySteel);
    tower.position.set(0, 5.75, 3.4);
    tower.castShadow = true;
    g.add(tower);
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.4), gantrySteel);
      arm.position.set(i % 2 ? -0.9 : 0.9, 3.4 + i * 2.4, 2.2);
      arm.rotation.y = i % 2 ? 0.5 : -0.5;
      g.add(arm);
    }
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xd7d7cf, roughness: 0.5, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), dishMat);
    dish.position.set(0, 11.3, 3.4);
    dish.rotation.x = Math.PI / 2.8;
    g.add(dish);

    // cable trays, droopy umbilical hoses, plinth conduits, tie-down anchors
    const darkKit = new Kit();
    for (const sx of [-1.9, 1.9]) {
      darkKit.tube([new THREE.Vector3(0, 7.6, 3.0), new THREE.Vector3(sx * 0.6, 7.0, 1.8), new THREE.Vector3(sx, 6.4, 0.9)], 0.07);
    }
    // hose loops from the service arms to the silo walls
    darkKit.tube([new THREE.Vector3(1.48, 3.35, 1.15), new THREE.Vector3(1.62, 2.8, 1.05), new THREE.Vector3(1.35, 2.4, 1.35)], 0.05);
    darkKit.tube([new THREE.Vector3(-1.48, 5.75, 1.15), new THREE.Vector3(-1.62, 5.2, 1.0), new THREE.Vector3(-1.4, 4.8, 1.3)], 0.05);
    darkKit.tube([new THREE.Vector3(1.48, 8.15, 1.15), new THREE.Vector3(1.66, 7.5, 1.0), new THREE.Vector3(1.45, 7.1, 1.3)], 0.05);
    // umbilical trunk: plinth edge riser → across the deck → tower cabinet
    darkKit.box(0.34, 1.12, 0.1, 5.46, 0.56, 3.0);
    darkKit.box(4.9, 0.07, 0.3, 3.0, 1.14, 3.1);
    darkKit.box(0.3, 0.07, 0.5, 0.62, 1.14, 3.3);
    darkKit.box(0.2, 0.62, 0.44, 0.56, 1.5, 3.4);
    darkKit.box(0.44, 0.72, 0.2, 1.7, 1.48, 4.2);
    // tie-down anchor loops around the silos (deterministic jitter)
    const rnd = mulberry32(510);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      darkKit.torus(0.09, 0.02, 8, Math.cos(a) * 3.6, 1.11, 0.6 + Math.sin(a) * 3.0, 0, rnd() * 3, 0, Math.PI);
    }
    g.add(darkKit.build(matDark()));

    // access stairs up the plinth face
    const stairKit = new Kit();
    for (let i = 0; i < 5; i++) {
      stairKit.box(1.3, 0.22, 0.34, 3.9, 0.99 - i * 0.22, 5.67 + i * 0.34);
    }
    const stairs = stairKit.build(conc);
    stairs.castShadow = true;
    g.add(stairs);

    // silo IDs + hazard placards
    const numKit = new Kit();
    numKit.cell(1.0, 0.42, 0, 2, -1.9, 5.2, 1.72, 0, 0);
    numKit.cell(1.0, 0.42, 1, 2, 1.9, 5.2, 1.72, 0, 0);
    g.add(numKit.build(new THREE.MeshBasicMaterial({ map: stripTexture(['LR-X 01', 'LR-X 02'], { cw: 160, ch: 64, size: 34 }), transparent: true })));
    const placKit = new Kit();
    placKit.plane(0.3, 0.3, -1.9, 3.4, 1.74);
    placKit.plane(0.3, 0.3, 1.9, 3.4, 1.74);
    placKit.plane(0.26, 0.26, 0.46, 2.6, 3.42, 0, Math.PI / 2);
    g.add(placKit.build(matPlacard()));

    // warning ring
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.5),
      new THREE.MeshBasicMaterial({ map: stencilTexture('SENTINEL LR-X — TEST ARTICLE', { w: 768, h: 80, size: 44, color: '#20221c', bg: '#d9b13b' }) }),
    );
    ring.position.set(0, 2.2, 5.56);
    ring.rotation.y = Math.PI;
    g.add(ring);

    // plinth corner marker lamps (dim amber) + blinking red tower beacon
    const markKit = new Kit();
    for (const [mx, mz] of [[-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2]]) {
      markKit.box(0.09, 0.09, 0.09, mx, 1.2, mz).tint(0xd88a28);
    }
    g.add(markKit.build(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2a20, toneMapped: false });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), beaconMat);
    beacon.position.set(0.42, 11.48, 3.0);
    g.add(beacon);
    // small marker posts under the corner lamps
    const postKit = new Kit();
    for (const [mx, mz] of [[-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2]]) {
      postKit.cyl(0.03, 0.04, 1.15, 6, mx, 0.62, mz);
    }
    g.add(postKit.build(matDark()));

    bat.statusLampMat = this._mkStatusLamp(g, 0, 11.6, 3.4);

    // ground kit lives on the plinth deck (no wheels → no chocks)
    const plinthKit = new Kit();
    plinthKit.box(1.15, 0.55, 0.52, -3.3, 1.38, 4.4, 0, 0.2);
    plinthKit.box(1.19, 0.05, 0.56, -3.3, 1.66, 4.4, 0, 0.2);
    g.add(plinthKit.build(matDark()));
    const ext2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.28), matExtinguisher());
    ext2.position.set(2.75, 1.46, 4.75);
    g.add(ext2);

    // hatch animation during prep + interior glow + beacon blink
    bat._updateExtra = (dt) => {
      const want = bat.state === BSTATE.PREP ? -2.0 : 0;
      let openness = 0;
      for (const hinge of bat.hatches) {
        hinge.rotation.z += (want - hinge.rotation.z) * Math.min(1, dt * 1.6);
        openness = Math.max(openness, hinge.rotation.z / -2.0);
      }
      glow.visible = openness > 0.04;
      glowMat.opacity = openness * (0.62 + 0.2 * Math.sin(bat.time * 7));
      beacon.visible = Math.sin(bat.time * 2.7) > -0.25;
    };
    bat._onReset = () => {
      for (const hinge of bat.hatches) hinge.rotation.z = 0;
      glow.visible = false;
      glowMat.opacity = 0;
    };

    this.ctx.base.boxCollider(pad.pos.x, pad.pos.z, 12, 12, 1.2);
    for (const sx of [-1.9, 1.9]) {
      const wx = pad.pos.x + Math.cos(pad.yaw) * sx;
      const wz = pad.pos.z - Math.sin(pad.yaw) * sx;
      this.ctx.base.cylCollider(wx, wz, 1.5, 9);
    }
    this.list.push(bat);
  }
}
