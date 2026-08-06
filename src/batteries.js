// Three fictional interceptor batteries. Each has a distinct silhouette,
// animated launcher hardware (azimuth turntable, elevating erector, hydraulic
// rams, canister covers), status lighting and its own launch signature.
//
// All performance figures are invented for gameplay balance and do not
// represent any real system.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mats } from './core/materials.js';
import * as T from './core/textures.js';
import * as K from './core/kit.js';
import { mergeStatic, markDynamic } from './core/merge.js';

export const BATTERY_SPECS = {
  patriot: {
    id: 'patriot',
    name: 'PALISADE PAC-T',
    role: 'TERMINAL',
    blurb: 'Patriot-inspired terminal battery. Fast to respond, short engagement window, hard manoeuvring close to the base.',
    tubes: 4,
    ammo: 8,
    prepTime: 1.2,
    reloadTime: 5.5,
    salvoDelay: 1.6,
    elevationRange: [0.58, 0.98],   // radians, ~33 to 56 degrees
    azimuthRange: 2.0,
    stowElevation: 0.62,
    interceptor: 'palisade',
    idealAltitude: [900, 7000],
    plumeScale: 1.0,
    accent: 0x4bd07a,
  },
  thaad: {
    id: 'thaad',
    name: 'HALBERD HA-2',
    role: 'HIGH ALTITUDE',
    blurb: 'THAAD-inspired high-altitude battery. Slower to prepare, wide engagement window, long dramatic contrails.',
    tubes: 8,
    ammo: 8,
    prepTime: 3.4,
    reloadTime: 8.5,
    salvoDelay: 2.4,
    elevationRange: [1.0, 1.4],     // ~57 to 80 degrees
    azimuthRange: 2.4,
    stowElevation: 1.05,
    interceptor: 'halberd',
    idealAltitude: [5000, 26000],
    plumeScale: 1.35,
    accent: 0x49b8ff,
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL LR-1',
    role: 'LONG RANGE TEST',
    blurb: 'Entirely fictional long-range test article. Very limited rounds, longest flight, largest launch plume.',
    tubes: 2,
    ammo: 3,
    prepTime: 4.8,
    reloadTime: 14,
    salvoDelay: 4.0,
    elevationRange: [1.25, 1.52],   // ~72 to 87 degrees
    azimuthRange: 1.6,
    stowElevation: 1.4,
    interceptor: 'sentinel',
    idealAltitude: [12000, 60000],
    plumeScale: 2.0,
    accent: 0xffb029,
  },
};

const _wp = new THREE.Vector3();
const _wd = new THREE.Vector3();
const _q = new THREE.Quaternion();

export class Battery {
  constructor(spec, position, heading, rng, collision) {
    this.spec = spec;
    this.id = spec.id;
    this.rng = rng;
    this.collision = collision;
    this.group = new THREE.Group();
    this.group.name = `battery-${spec.id}`;
    this.group.position.copy(position);
    this.group.rotation.y = heading;
    this.heading = heading;

    this.ammo = spec.ammo;
    this.maxAmmo = spec.ammo;
    this.loaded = spec.tubes;
    this.status = 'READY';
    this.prepTimer = 0;
    this.reloadTimer = 0;
    this.cooldown = 0;
    this.selected = false;
    this.armed = false;

    this.azimuth = 0;
    this.elevation = spec.stowElevation;
    this.targetAzimuth = 0;
    this.targetElevation = spec.stowElevation;
    this.slewRate = 0.75;
    this.elevRate = 0.45;
    this.tubes = [];
    this.statusLeds = [];
    this.beacons = [];
    this.time = 0;
  }

  get worldPosition() {
    return this.group.position;
  }

  /** Aim the launcher toward a world point (azimuth + elevation, clamped). */
  aimAt(point) {
    const dx = point.x - this.group.position.x;
    const dz = point.z - this.group.position.z;
    let az = Math.atan2(dx, dz) - this.heading;
    // wrap into -PI..PI then clamp to the traverse limit
    while (az > Math.PI) az -= Math.PI * 2;
    while (az < -Math.PI) az += Math.PI * 2;
    const lim = this.spec.azimuthRange / 2 + 0.6;
    this.targetAzimuth = Math.max(-lim, Math.min(lim, az));
    const horiz = Math.hypot(dx, dz);
    const el = Math.atan2(Math.max(20, point.y - this.group.position.y), Math.max(20, horiz));
    const [lo, hi] = this.spec.elevationRange;
    this.targetElevation = Math.max(lo, Math.min(hi, el * 0.55 + (lo + hi) / 2 * 0.45));
  }

  stow() {
    this.targetAzimuth = 0;
    this.targetElevation = this.spec.stowElevation;
    this.armed = false;
  }

  get aimError() {
    return Math.abs(this.azimuth - this.targetAzimuth) + Math.abs(this.elevation - this.targetElevation);
  }

  get canFire() {
    return this.status === 'READY' && this.loaded > 0 && this.cooldown <= 0;
  }

  /** Begin the preparation sequence (covers, gyros, hydraulics). */
  prepare() {
    if (this.status === 'READY' && this.loaded > 0) {
      this.status = 'PREPARING';
      this.prepTimer = this.spec.prepTime;
      this.armed = true;
      return true;
    }
    return false;
  }

  /** Consume a round; returns muzzle transform for the interceptor spawn. */
  fire() {
    const tube = this.tubes.find((t) => t.loaded);
    if (!tube) return null;
    tube.loaded = false;
    tube.firedAt = this.time;
    this.loaded--;
    this.ammo--;
    this.cooldown = this.spec.salvoDelay;
    if (tube.cover) tube.cover.visible = false;
    if (tube.missile) tube.missile.visible = false;
    const out = this.getTubeTransform(tube);
    if (this.loaded === 0) {
      this.status = this.ammo > 0 ? 'RELOADING' : 'EMPTY';
      this.reloadTimer = this.spec.reloadTime;
    }
    return out;
  }

  getTubeTransform(tube) {
    const node = tube.muzzle;
    node.updateWorldMatrix(true, false);
    node.getWorldPosition(_wp);
    node.getWorldQuaternion(_q);
    _wd.set(0, 0, 1).applyQuaternion(_q).normalize();
    return { position: _wp.clone(), direction: _wd.clone(), tube, spec: this.spec };
  }

  /** Muzzle transform of the next tube that would fire (used for cueing). */
  peekTransform() {
    const tube = this.tubes.find((t) => t.loaded);
    return tube ? this.getTubeTransform(tube) : null;
  }

  update(dt) {
    this.time += dt;
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.status === 'PREPARING') {
      this.prepTimer -= dt;
      if (this.prepTimer <= 0) this.status = 'READY';
    } else if (this.status === 'RELOADING') {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const reload = Math.min(this.spec.tubes, this.ammo);
        this.loaded = reload;
        for (let i = 0; i < this.tubes.length; i++) {
          const t = this.tubes[i];
          t.loaded = i < reload;
          if (t.cover) t.cover.visible = t.loaded;
          if (t.missile) t.missile.visible = false;
        }
        this.status = reload > 0 ? 'READY' : 'EMPTY';
      }
    }

    // smooth slew (critically damped feel, no snapping)
    const azErr = this.targetAzimuth - this.azimuth;
    const elErr = this.targetElevation - this.elevation;
    this.azimuth += Math.sign(azErr) * Math.min(Math.abs(azErr), this.slewRate * dt);
    this.elevation += Math.sign(elErr) * Math.min(Math.abs(elErr), this.elevRate * dt);
    if (this.turntable) this.turntable.rotation.y = this.azimuth;
    if (this.erector) this.erector.rotation.x = -this.elevation;

    // hydraulic rams follow the erector angle
    if (this.rams) {
      const t = (this.elevation - this.spec.elevationRange[0]) /
        Math.max(0.001, this.spec.elevationRange[1] - this.spec.elevationRange[0]);
      for (const ram of this.rams) {
        const rod = ram.userData.rod;
        if (rod) {
          const L = ram.userData.length;
          rod.scale.y = 0.75 + t * 0.5;
          rod.position.y = L * 0.62 * rod.scale.y;
        }
      }
    }

    this._updateLights(dt);
  }

  _updateLights(dt) {
    const M = mats();
    const blink = Math.sin(this.time * 7) > 0;
    const slowBlink = Math.sin(this.time * 2.4) > 0;
    let mat;
    switch (this.status) {
      case 'READY': mat = this.armed ? (blink ? M.ledRed : M.ledOff) : M.ledGreen; break;
      case 'PREPARING': mat = blink ? M.ledAmber : M.ledOff; break;
      case 'RELOADING': mat = slowBlink ? M.ledAmber : M.ledOff; break;
      default: mat = M.ledRed; break;
    }
    for (const led of this.statusLeds) led.material = mat;
    for (const b of this.beacons) {
      const on = this.armed || this.status === 'PREPARING';
      b.userData.dome.emissiveIntensity = on ? (blink ? 6 : 0.4) : 0.15;
      if (b.userData.rotor) b.userData.rotor.rotation.y += dt * (on ? 12 : 1.5);
    }
    // selection highlight strip
    if (this.selectionStrip) {
      this.selectionStrip.material.emissiveIntensity = this.selected ? 3.4 : 0.25;
    }
  }
}

// ---------------------------------------------------------------------------
// Launcher paint library
//
// core/materials.js covers structure and bare metal. The launchers also need
// painted coachwork that is clearly darker than the canisters riding on it,
// otherwise the whole vehicle reads as one pale grey slab. Everything here is
// built once and shared by all three batteries so the static merge keeps
// collapsing the kit-bash into a handful of draw calls.
// ---------------------------------------------------------------------------

const _paint = { built: false };

function LM() {
  if (_paint.built) return _paint;
  _paint.built = true;
  const nrm = T.panelNormal('batPanelNrm', 67);
  const wear = T.wearRoughness(23);

  const coach = (key, base, dark, light, seed, roughness, metalness) => new THREE.MeshStandardMaterial({
    map: T.militaryPanel({ key, base, dark, light, seed }),
    normalMap: nrm,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: wear,
    roughness,
    metalness,
  });

  // Olive drab: PALISADE coachwork and the HALBERD launch pod.
  _paint.hullGreen = coach('batGreen', '#4a543b', '#2b3121', '#616c4c', 63, 0.88, 0.16);
  // Dark sand: HALBERD transporter coachwork.
  _paint.hullTan = coach('batTan', '#7a6b42', '#4e422a', '#96835c', 71, 0.86, 0.18);
  // Cold slate: SENTINEL gantry and erector spine. Kept mid-value rather than
  // near-black so the shaded side of the structure still shows its panelling.
  _paint.hullSlate = coach('batSlate', '#565f68', '#333a41', '#737d87', 79, 0.8, 0.32);
  // Pale bone canister skin - the value contrast that makes tubes read at
  // range. Kept off-white rather than white so full sun does not blow it out.
  _paint.canSkin = coach('batBone', '#b6af90', '#8a8468', '#d2cbaf', 83, 0.72, 0.1);
  // Frangible closure discs, a shade brighter again.
  _paint.coverSkin = coach('batCover', '#cdc6ab', '#9a947c', '#e6e0c6', 89, 0.62, 0.1);

  // Flat soot for blast-scarred faces: deliberately non-metallic so it stays
  // dark next to the iridescent heatSteel map.
  _paint.soot = new THREE.MeshStandardMaterial({ color: 0x1c1b19, roughness: 0.98, metalness: 0.06 });
  // Deep tube cavity - has to read as a hole, not a dark surface.
  _paint.cavity = new THREE.MeshStandardMaterial({ color: 0x090a0b, roughness: 0.92, metalness: 0.12 });
  return _paint;
}

const _accents = new Map();

/**
 * One emissive accent material per battery colour. Sharing it means the
 * selection highlight lights every accent strip on the vehicle at once.
 */
function accentMat(color) {
  let m = _accents.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.5),
      emissive: color,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0.1,
    });
    _accents.set(color, m);
  }
  return m;
}

/** Weathered stencil decal, shared per text so the merge can batch them. */
function stencilMat(text, color = '#20241c') {
  return K.decalMaterial(text, {
    color, w: 512, h: 96, font: 'bold 44px "Arial Narrow", Impact, sans-serif',
  });
}

// ---------------------------------------------------------------------------
// Mechanical detailing helpers
//
// These deliberately emit plain meshes rather than InstancedMesh: plain meshes
// are absorbed by mergeStatic into the surrounding material bucket and cost no
// extra draw calls, while every InstancedMesh is a draw call of its own.
// ---------------------------------------------------------------------------

/** Bolt heads spread along a straight run. `axis` is the shaft direction. */
function boltRun(parent, count, from, to, material, { r = 0.021, h = 0.028, axis = 'z' } = {}) {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const b = K.cyl(r, r * 1.15, h, 6, material);
    b.position.lerpVectors(from, to, t);
    if (axis === 'x') b.rotation.z = Math.PI / 2;
    else if (axis === 'z') b.rotation.x = Math.PI / 2;
    parent.add(b);
  }
}

/** Bolt heads around a circular flange. */
function boltCircle(parent, count, radius, material, { x = 0, y = 0, z = 0, r = 0.022, h = 0.03, axis = 'z' } = {}) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const b = K.cyl(r, r * 1.15, h, 6, material);
    if (axis === 'y') {
      b.position.set(x + Math.cos(a) * radius, y, z + Math.sin(a) * radius);
    } else if (axis === 'z') {
      b.position.set(x + Math.cos(a) * radius, y + Math.sin(a) * radius, z);
      b.rotation.x = Math.PI / 2;
    } else {
      b.position.set(x, y + Math.sin(a) * radius, z + Math.cos(a) * radius);
      b.rotation.z = Math.PI / 2;
    }
    parent.add(b);
  }
}

/** Bolt heads around a rectangular flange in the XY plane (shafts on +Z). */
function boltRect(parent, w, h, perSide, material, { x = 0, y = 0, z = 0, r = 0.02 } = {}) {
  const hw = w / 2;
  const hh = h / 2;
  const o = { r, h: 0.028, axis: 'z' };
  const inset = h / Math.max(1, perSide - 1);
  boltRun(parent, perSide, new THREE.Vector3(x - hw, y - hh, z), new THREE.Vector3(x + hw, y - hh, z), material, o);
  boltRun(parent, perSide, new THREE.Vector3(x - hw, y + hh, z), new THREE.Vector3(x + hw, y + hh, z), material, o);
  if (perSide > 2) {
    boltRun(parent, perSide - 2, new THREE.Vector3(x - hw, y - hh + inset, z),
      new THREE.Vector3(x - hw, y + hh - inset, z), material, o);
    boltRun(parent, perSide - 2, new THREE.Vector3(x + hw, y - hh + inset, z),
      new THREE.Vector3(x + hw, y + hh - inset, z), material, o);
  }
}

/** Raised weld bead run. */
function weld(len, material, { x = 0, y = 0, z = 0, axis = 'z', r = 0.016 } = {}) {
  const m = K.cyl(r, r, len, 5, material, x, y, z);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  else if (axis === 'z') m.rotation.x = Math.PI / 2;
  return m;
}

/** U-shaped grab handle standing proud of a surface along +Z. */
function grabHandle(parent, x, y, z, { len = 0.2, out = 0.075, material = null, rotY = 0 } = {}) {
  const mat = material || mats().steel;
  const g = new THREE.Group();
  const bar = K.cyl(0.014, 0.014, len, 5, mat, 0, 0, out);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (const s of [-1, 1]) {
    const leg = K.cyl(0.014, 0.014, out, 5, mat, s * len / 2, 0, out / 2);
    leg.rotation.x = Math.PI / 2;
    g.add(leg);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

/** Ladder whose rungs are plain meshes, so the whole thing merges away. */
function ladderRun(height, width = 0.42, material = null) {
  const mat = material || mats().galvanised;
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(K.box(0.045, height, 0.05, mat, s * width * 0.5, height / 2, 0));
  const rungs = Math.max(2, Math.floor(height / 0.3));
  for (let i = 0; i < rungs; i++) {
    const r = K.cyl(0.017, 0.017, width, 5, mat, 0, 0.2 + i * 0.3, 0);
    r.rotation.z = Math.PI / 2;
    g.add(r);
  }
  for (const y of [0.25, height - 0.25]) {
    for (const s of [-1, 1]) g.add(K.box(0.05, 0.06, 0.16, mat, s * width * 0.5, y, -0.1));
  }
  return g;
}

/** Chequer-plate walkway: one slab plus raised tread strips and kick rails. */
function walkway(w, d, material = null) {
  const M = mats();
  const g = new THREE.Group();
  g.add(K.box(w, 0.05, d, material || M.darkMetal, 0, 0, 0));
  const n = Math.max(2, Math.round(d / 0.34));
  for (let i = 0; i < n; i++) {
    g.add(K.box(w * 0.94, 0.022, 0.05, M.galvanised, 0, 0.035, (i / (n - 1) - 0.5) * (d - 0.16)));
  }
  for (const s of [-1, 1]) g.add(K.box(0.04, 0.1, d, M.galvanised, s * (w / 2 - 0.02), 0.045, 0));
  return g;
}

/** Hydraulic ram. Everything except the sliding rod is one dark bucket. */
function ram(length, barrelR = 0.085) {
  const M = mats();
  const g = new THREE.Group();
  g.add(K.cyl(barrelR, barrelR, length * 0.62, 12, M.darkMetal, 0, length * 0.31, 0));
  g.add(K.cyl(barrelR * 1.22, barrelR * 1.22, 0.07, 12, M.darkMetal, 0, length * 0.62 - 0.035, 0));
  g.add(K.cyl(barrelR * 1.25, barrelR * 1.25, 0.08, 12, M.darkMetal, 0, 0.04, 0));
  for (const y of [0.0, length * 0.92]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(barrelR * 0.95, barrelR * 0.42, 6, 10), M.darkMetal);
    eye.rotation.y = Math.PI / 2;
    eye.position.y = y;
    g.add(eye);
  }
  // feed and return ports
  for (const y of [length * 0.12, length * 0.48]) {
    g.add(K.cyl(0.028, 0.028, 0.11, 6, M.darkMetal, barrelR + 0.04, y, 0).rotateZ(Math.PI / 2));
    g.add(K.cyl(0.038, 0.038, 0.035, 6, M.darkMetal, barrelR + 0.09, y, 0).rotateZ(Math.PI / 2));
  }
  const rod = K.cyl(barrelR * 0.55, barrelR * 0.55, length * 0.6, 10, M.hydraulic, 0, length * 0.62, 0);
  markDynamic(rod);
  g.add(rod);
  g.userData.rod = rod;
  g.userData.length = length;
  return g;
}

/**
 * Status lamp cluster baked into a single mesh: the Battery swaps the material
 * on the whole strip, so there is no reason to pay a draw call per lamp.
 */
function statusCluster(count, spacing, material, r = 0.038) {
  const geos = [];
  for (let i = 0; i < count; i++) {
    const gg = new THREE.CylinderGeometry(r, r, 0.035, 10);
    gg.rotateX(Math.PI / 2);
    gg.translate((i - (count - 1) / 2) * spacing, 0, 0);
    geos.push(gg);
  }
  const geo = mergeGeometries(geos, false);
  for (const gg of geos) gg.dispose();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = false;
  return m;
}

/** Bezelled status panel; returns the (dynamic) lamp strip. */
function statusPanel(parent, count, {
  spacing = 0.17, label = null, position = [0, 0, 0], rotation = [0, 0, 0],
} = {}) {
  const M = mats();
  const holder = new THREE.Group();
  holder.position.set(position[0], position[1], position[2]);
  holder.rotation.set(rotation[0], rotation[1], rotation[2]);
  parent.add(holder);

  const w = count * spacing + 0.2;
  holder.add(K.box(w + 0.08, 0.34, 0.03, M.darkMetal, 0, 0, -0.015));
  holder.add(K.box(w, 0.26, 0.05, M.blackMetal, 0, 0, 0.01));
  boltRect(holder, w + 0.02, 0.26, 2, M.steel, { z: 0.02, r: 0.014 });
  const lamps = statusCluster(count, spacing, M.ledGreen);
  lamps.position.z = 0.045;
  markDynamic(lamps);
  holder.add(lamps);
  if (label) {
    const l = K.labelPlate(label, w * 0.86, 0.1);
    l.position.set(0, -0.24, 0.02);
    holder.add(l);
  }
  return lamps;
}

/**
 * Rotating warning beacon head. The mounting post is left to the caller so it
 * merges with the surrounding structure instead of costing its own draw call.
 */
function beaconHead(domeMat, color) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), domeMat);
  dome.position.y = 0.02;
  g.add(dome);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.11), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  inner.position.y = 0.075;
  g.add(inner);
  g.userData.dome = domeMat;
  g.userData.rotor = inner;
  return g;
}

/** Mount a pair of beacons on short posts and register them with the battery. */
function addBeacons(battery, parent, color, positions) {
  const M = mats();
  // one dome material per battery so both heads blink in step
  const domeMat = new THREE.MeshPhysicalMaterial({
    color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.62, roughness: 0.22,
  });
  for (const [x, y, z] of positions) {
    parent.add(K.cyl(0.035, 0.045, 0.26, 6, M.galvanised, x, y - 0.13, z));
    parent.add(K.cyl(0.1, 0.115, 0.07, 10, M.darkMetal, x, y + 0.01, z));
    const head = beaconHead(domeMat, color);
    head.position.set(x, y + 0.05, z);
    markDynamic(head);
    parent.add(head);
    battery.beacons.push(head);
  }
}

// ---------------------------------------------------------------------------
// Shared launcher sub-assemblies
// ---------------------------------------------------------------------------

/**
 * Transporter chassis: painted coachwork over a bare-metal ladder frame, with
 * running gear, mudguards, deployed outriggers, stowage and the usual crust of
 * bolts and weld beads. `drop` is the distance from the chassis origin down to
 * whatever surface the outrigger pads land on.
 */
function buildChassis(len, wid, {
  axles = 2, wheelR = 0.6, drawbar = true, paint = null, outrigger = 0.95, wheelBase = 0.5, drop = 1.05,
} = {}) {
  const M = mats();
  const P = LM();
  const body = paint || P.hullGreen;
  const g = new THREE.Group();
  const hw = wid / 2;

  // painted deck slab over a bare-metal ladder frame
  g.add(K.box(wid, 0.3, len, body, 0, 0.14, 0));
  g.add(K.box(wid - 0.1, 0.12, len - 0.1, M.darkMetal, 0, -0.06, 0));
  for (const s of [-1, 1]) {
    g.add(K.box(0.2, 0.58, len - 0.24, M.darkMetal, s * (hw - 0.15), -0.16, 0));
    g.add(K.box(0.07, 0.46, len - 0.5, body, s * (hw + 0.02), -0.02, 0));
    boltRun(g, Math.round(len / 0.6), new THREE.Vector3(s * (hw + 0.06), 0.16, -len / 2 + 0.4),
      new THREE.Vector3(s * (hw + 0.06), 0.16, len / 2 - 0.4), M.steel, { r: 0.018, axis: 'x' });
    g.add(weld(len - 0.5, M.galvanised, { x: s * (hw + 0.055), y: -0.24, axis: 'z', r: 0.014 }));
    // deck edge rail + tie-down cleats
    g.add(K.box(0.09, 0.11, len - 0.3, M.galvanised, s * (hw - 0.05), 0.34, 0));
    for (let i = 0; i < 5; i++) {
      g.add(K.box(0.1, 0.07, 0.14, M.steel, s * (hw - 0.05), 0.43, (i / 4 - 0.5) * (len - 1.6)));
    }
  }
  const cross = Math.floor(len / 1.15);
  for (let i = 0; i < cross; i++) {
    const z = (i / (cross - 1) - 0.5) * (len - 1.0);
    g.add(K.box(wid - 0.45, 0.16, 0.14, M.darkMetal, 0, -0.24, z));
    g.add(K.box(wid - 0.7, 0.1, 0.1, M.galvanised, 0, -0.36, z));
  }

  // running gear
  const tyre = new THREE.CylinderGeometry(wheelR, wheelR, 0.46, 16);
  const tread = new THREE.CylinderGeometry(wheelR * 1.02, wheelR * 1.02, 0.1, 16);
  const wheelY = 0.18 - wheelR;
  for (let a = 0; a < axles; a++) {
    const z = axles === 1 ? 0 : (a / (axles - 1) - 0.5) * (len * wheelBase);
    g.add(K.cyl(0.09, 0.09, wid + 0.3, 8, M.darkMetal, 0, wheelY + 0.1, z).rotateZ(Math.PI / 2));
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(tyre, M.rubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(s * (hw + 0.06), wheelY, z);
      g.add(w);
      for (const o of [-0.14, 0.14]) {
        const t = new THREE.Mesh(tread, M.blackMetal);
        t.rotation.z = Math.PI / 2;
        t.position.set(w.position.x + o, wheelY, z);
        g.add(t);
      }
      g.add(K.cyl(0.24, 0.24, 0.48, 10, M.steel, s * (hw + 0.12), wheelY, z).rotateZ(Math.PI / 2));
      g.add(K.cyl(0.1, 0.1, 0.56, 8, M.hydraulic, s * (hw + 0.16), wheelY, z).rotateZ(Math.PI / 2));
      boltCircle(g, 6, 0.14, M.steel, { x: s * (hw + 0.3), y: wheelY, z, r: 0.02, axis: 'x' });
      // mudguard + flap
      g.add(K.box(0.56, 0.09, wheelR * 2.5, body, s * (hw + 0.1), 0.02, z));
      g.add(K.box(0.06, 0.34, wheelR * 2.5, body, s * (hw + 0.36), -0.14, z));
      g.add(K.box(0.5, 0.32, 0.03, M.rubber, s * (hw + 0.1), -0.24, z - wheelR * 1.2));
    }
  }

  // deployed outriggers with jacks and ground pads
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const ox = sx * (hw + outrigger * 0.5);
    const oz = sz * (len / 2 - 0.8);
    g.add(K.box(outrigger + 0.3, 0.22, 0.3, M.galvanised, ox, -0.06, oz));
    g.add(K.box(outrigger + 0.34, 0.06, 0.36, M.darkMetal, ox, -0.19, oz));
    const jx = sx * (hw + outrigger);
    const rodLen = Math.max(0.3, drop - 0.55);
    g.add(K.cyl(0.12, 0.12, 0.5, 10, M.darkMetal, jx, -0.3, oz));
    g.add(K.cyl(0.07, 0.07, rodLen, 8, M.hydraulic, jx, -0.52 - rodLen / 2, oz));
    g.add(K.cyl(0.3, 0.34, 0.12, 12, M.darkMetal, jx, -drop + 0.15, oz));
    g.add(K.box(0.84, 0.08, 0.84, M.concreteDark, jx, -drop + 0.06, oz));
    boltCircle(g, 8, 0.16, M.steel, { x: jx, y: -0.04, z: oz, r: 0.018, axis: 'y' });
    const brace = K.cyl(0.05, 0.05, outrigger * 1.2, 6, M.galvanised, sx * (hw + outrigger * 0.45), -0.4, oz);
    brace.rotation.z = sx * 1.05;
    g.add(brace);
  }

  // stowage: toolboxes, hose reel, extinguisher
  for (const s of [-1, 1]) {
    g.add(K.chamferBox(0.5, 0.4, 0.9, body, 0.04).translateX(s * (hw + 0.3)).translateY(0.2)
      .translateZ(-len * 0.16));
    g.add(K.box(0.53, 0.03, 0.93, M.darkMetal, s * (hw + 0.3), 0.41, -len * 0.16));
    boltRun(g, 4, new THREE.Vector3(s * (hw + 0.3), 0.43, -len * 0.16 - 0.36),
      new THREE.Vector3(s * (hw + 0.3), 0.43, -len * 0.16 + 0.36), M.steel, { r: 0.016, axis: 'y' });
  }
  g.add(K.cyl(0.22, 0.22, 0.3, 12, M.rubber, -(hw + 0.3), 0.28, len * 0.2).rotateZ(Math.PI / 2));
  g.add(K.cyl(0.26, 0.26, 0.05, 12, M.galvanised, -(hw + 0.45), 0.28, len * 0.2).rotateZ(Math.PI / 2));
  g.add(K.cyl(0.08, 0.08, 0.36, 8, M.rusted, hw + 0.3, 0.36, len * 0.2));
  g.add(K.box(0.14, 0.1, 0.14, M.galvanised, hw + 0.3, 0.16, len * 0.2));

  if (drawbar) {
    g.add(K.box(0.3, 0.3, 2.3, M.darkMetal, 0, -0.12, len / 2 + 1.0));
    g.add(K.box(0.5, 0.16, 0.5, M.darkMetal, 0, -0.12, len / 2 + 2.05));
    g.add(K.cyl(0.17, 0.17, 0.24, 10, M.steel, 0, -0.12, len / 2 + 2.2).rotateX(Math.PI / 2));
    g.add(K.cyl(0.08, 0.08, drop - 0.5, 8, M.galvanised, 0, -0.15 - (drop - 0.5) / 2, len / 2 + 1.55));
    g.add(K.cyl(0.17, 0.17, 0.08, 10, M.darkMetal, 0, -drop + 0.1, len / 2 + 1.55));
    boltCircle(g, 6, 0.11, M.steel, { y: -0.12, z: len / 2 + 2.32, r: 0.018 });
  }
  return g;
}

/**
 * Rectangular launch canister - the PALISADE signature. A pale composite skin
 * over dark corner rails and girth bands, so a block of four still reads as
 * four boxed tubes from across the pad.
 */
function buildRectCanister(len, size, index, accentColor, {
  dynamicCover = true, detail = 'high', stencilText = 'PALISADE PAC-T',
} = {}) {
  const M = mats();
  const P = LM();
  const g = new THREE.Group();
  const h = size / 2;

  g.add(K.box(size, size, len, P.canSkin, 0, 0, 0));

  // corner rails: the hard dark edge that defines the box at any distance
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      g.add(K.box(0.1, 0.1, len + 0.04, M.darkMetal, sx * h, sy * h, 0));
    }
  }
  // girth bands, deliberately chunky - at 40 m these are what break the block
  // of four into four separate tubes
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const z = (i / (bands - 1) - 0.5) * (len - 0.9);
    g.add(K.box(size + 0.15, size + 0.15, 0.16, M.darkMetal, 0, 0, z));
    g.add(K.box(size + 0.19, size + 0.19, 0.05, M.galvanised, 0, 0, z));
    if (detail === 'high') {
      g.add(weld(size + 0.02, M.galvanised, { y: h + 0.008, z: z + 0.11, axis: 'x', r: 0.014 }));
      for (const sx of [-1, 1]) {
        g.add(K.box(0.13, 0.13, 0.2, M.steel, sx * (h + 0.07), h + 0.07, z));
        g.add(K.box(0.13, 0.13, 0.2, M.steel, sx * (h + 0.07), -h - 0.07, z));
      }
    }
  }
  // longitudinal stiffener ribs on the flat faces
  for (const s of [-1, 1]) {
    g.add(K.box(0.05, 0.035, len - 0.4, M.galvanised, s * size * 0.24, h + 0.015, 0));
    g.add(K.box(0.035, 0.05, len - 0.4, M.galvanised, s * (h + 0.015), size * 0.24, 0));
  }

  // muzzle collar, recessed cavity and frangible closure
  g.add(K.box(size + 0.16, size + 0.16, 0.24, M.darkMetal, 0, 0, len / 2 - 0.07));
  g.add(K.box(size * 0.84, size * 0.84, 0.16, P.cavity, 0, 0, len / 2 - 0.02));
  if (detail === 'high') boltRect(g, size + 0.06, size + 0.06, 4, M.steel, { z: len / 2 + 0.06 });

  const plate = new THREE.BoxGeometry(size * 0.86, size * 0.86, 0.05);
  const pyr = new THREE.ConeGeometry(size * 0.62, 0.13, 4, 1);
  pyr.rotateY(Math.PI / 4);
  pyr.rotateX(Math.PI / 2);
  pyr.translate(0, 0, 0.09);
  const coverGeo = mergeGeometries([plate, pyr], false);
  plate.dispose();
  pyr.dispose();
  const cover = new THREE.Mesh(coverGeo, P.coverSkin);
  cover.position.z = len / 2 + 0.07;
  g.add(cover);

  // aft closure: heat-stained plate, sooted vents, bolt flange
  g.add(K.box(size + 0.08, size + 0.08, 0.32, M.heatSteel, 0, 0, -len / 2 - 0.11));
  g.add(K.box(size * 0.92, size * 0.92, 0.05, P.soot, 0, 0, -len / 2 - 0.28));
  for (let i = 0; i < 3; i++) {
    g.add(K.box(size * 0.72, 0.05, 0.08, P.soot, 0, (i - 1) * size * 0.25, -len / 2 - 0.3));
  }
  if (detail === 'high') boltRect(g, size + 0.04, size + 0.04, 4, M.steel, { z: -len / 2 - 0.28, r: 0.018 });

  // markings
  g.add(K.box(size + 0.13, size + 0.13, 0.34, M.hazard, 0, 0, len * 0.28));
  for (const s of [-1, 1]) {
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.42, size * 0.38), stencilMat(stencilText));
    dec.position.set(s * (h + 0.006), size * 0.12, -len * 0.1);
    dec.rotation.y = s * Math.PI / 2;
    g.add(dec);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.36, size * 0.3),
      stencilMat(`${index + 1}`, '#1a1d17'));
    num.position.set(s * (h + 0.006), -size * 0.2, len * 0.06);
    num.rotation.y = s * Math.PI / 2;
    g.add(num);
  }
  const strip = K.box(0.055, 0.055, len * 0.6, accentMat(accentColor), -h + 0.02, h + 0.035, -len * 0.05);
  g.add(strip);

  if (detail === 'high') {
    for (const s of [-1, 1]) {
      g.add(K.box(0.1, 0.14, 0.11, M.steel, 0, h + 0.1, s * len * 0.3));
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 5, 9), M.steel);
      eye.position.set(0, h + 0.18, s * len * 0.3);
      g.add(eye);
      grabHandle(g, h + 0.01, 0, s * len * 0.22, { len: 0.18, out: 0.06, rotY: Math.PI / 2 });
    }
    // umbilical socket on the aft quarter
    g.add(K.cyl(0.06, 0.06, 0.09, 8, M.brass, h + 0.03, -size * 0.22, -len * 0.34).rotateZ(Math.PI / 2));
    g.add(K.box(0.14, 0.14, 0.05, M.darkMetal, h + 0.015, -size * 0.22, -len * 0.34));
  }

  g.userData.cover = dynamicCover ? markDynamic(cover) : cover;
  g.userData.strip = strip;
  return g;
}

/** Round launch canister for the long-range launcher and the spares racks. */
function buildRoundCanister(len, radius, index, accentColor, tint = null, {
  dynamicCover = true, detail = 'high', stencilText = 'SENTINEL LR-1',
} = {}) {
  const M = mats();
  const P = LM();
  const g = new THREE.Group();
  const skin = tint || P.canSkin;

  const body = K.cyl(radius, radius, len, 18, skin);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  const bands = detail === 'high' ? 6 : 4;
  for (let i = 0; i < bands; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.025, 0.042, 6, 18), M.darkMetal);
    band.position.z = (i / (bands - 1) - 0.5) * (len - 0.8);
    g.add(band);
  }
  // cable raceway and stiffener down two sides
  g.add(K.box(0.11, 0.09, len - 0.5, M.darkMetal, 0, radius + 0.02, 0));
  g.add(K.box(0.09, 0.06, len - 1.2, M.galvanised, 0, -radius - 0.01, 0));

  // muzzle collar + cavity + frangible dome
  const collar = K.cyl(radius * 1.12, radius * 1.12, 0.22, 18, M.darkMetal);
  collar.rotation.x = Math.PI / 2;
  collar.position.z = len / 2 - 0.06;
  g.add(collar);
  const cavity = K.cyl(radius * 0.86, radius * 0.86, 0.18, 16, P.cavity);
  cavity.rotation.x = Math.PI / 2;
  cavity.position.z = len / 2 - 0.02;
  g.add(cavity);
  if (detail === 'high') boltCircle(g, 14, radius * 1.0, M.steel, { z: len / 2 + 0.06, r: 0.018 });

  const cover = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.88, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
    P.coverSkin,
  );
  cover.rotation.x = Math.PI / 2;
  cover.scale.set(1, 1, 0.5);
  cover.position.z = len / 2 + 0.05;
  g.add(cover);
  // retaining ring at the base of the closure, so it reads as a frangible
  // disc clamped into the muzzle rather than as a nose cone
  const clamp = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.9, 0.035, 5, 18), M.steel);
  clamp.position.z = len / 2 + 0.05;
  g.add(clamp);

  // aft closure with heat staining
  const aft = K.cyl(radius * 1.08, radius * 1.08, 0.34, 18, M.heatSteel);
  aft.rotation.x = Math.PI / 2;
  aft.position.z = -len / 2 - 0.13;
  g.add(aft);
  const sootDisc = K.cyl(radius * 0.96, radius * 0.96, 0.05, 16, P.soot);
  sootDisc.rotation.x = Math.PI / 2;
  sootDisc.position.z = -len / 2 - 0.31;
  g.add(sootDisc);
  if (detail === 'high') boltCircle(g, 12, radius * 1.0, M.steel, { z: -len / 2 - 0.31, r: 0.018 });

  // markings
  const haz = K.cyl(radius + 0.025, radius + 0.025, 0.2, 18, M.hazard);
  haz.rotation.x = Math.PI / 2;
  haz.position.z = len * 0.3;
  g.add(haz);
  const dec = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.36, radius * 0.62), stencilMat(stencilText));
  dec.position.set(radius + 0.008, 0, -len * 0.08);
  dec.rotation.y = Math.PI / 2;
  g.add(dec);

  const strip = K.box(0.055, 0.055, len * 0.58, accentMat(accentColor), 0, radius + 0.1, 0);
  g.add(strip);

  if (detail === 'high') {
    for (const s of [-1, 1]) {
      g.add(K.box(0.11, 0.14, 0.11, M.steel, 0, radius + 0.12, s * len * 0.28));
      grabHandle(g, radius + 0.01, 0, s * len * 0.18, { len: 0.2, out: 0.07, rotY: Math.PI / 2 });
    }
  }

  g.userData.cover = dynamicCover ? markDynamic(cover) : cover;
  g.userData.strip = strip;
  return g;
}

/**
 * Mouth of a pod tube. Only the front of a HALBERD tube is ever visible, so
 * only the front gets built: a dark bore behind a rimmed opening plus the
 * frangible closure that pops when the round leaves.
 */
function buildPodTube(radius, frontZ) {
  const P = LM();
  const g = new THREE.Group();
  // The stub barrel around this is solid, so the bore only has to be a dark
  // disc sitting a hair proud of the mouth. It becomes the visible hole once
  // the closure is blown off.
  const bore = K.cyl(radius * 0.94, radius * 0.94, 0.16, 14, P.cavity, 0, 0, frontZ - 0.07);
  bore.rotation.x = Math.PI / 2;
  g.add(bore);
  // shallow disc, not a nose cone: this is a burst closure sitting in the bore
  const cover = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.94, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
    P.coverSkin,
  );
  cover.rotation.x = Math.PI / 2;
  cover.scale.set(1, 1, 0.24);
  cover.position.z = frontZ - 0.03;
  g.add(cover);
  g.userData.cover = markDynamic(cover);
  return g;
}

/** Crew cabin used on the launcher vehicles. */
function buildCab(w, h, d, paint) {
  const M = mats();
  const g = new THREE.Group();
  g.add(K.chamferBox(w, h, d, paint, 0.04));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, h * 0.44), M.darkGlass);
  glass.position.set(0, h * 0.2, d / 2 + 0.012);
  glass.rotation.x = -0.14;
  g.add(glass);
  g.add(K.box(w * 0.84, 0.06, 0.06, M.darkMetal, 0, h * 0.43, d / 2 + 0.03));
  g.add(K.box(w * 0.84, 0.06, 0.06, M.darkMetal, 0, -h * 0.03, d / 2 + 0.06));
  g.add(K.box(w * 0.94, 0.07, 0.36, paint, 0, h / 2 - 0.02, d / 2 + 0.13));
  for (const s of [-1, 1]) {
    g.add(K.cyl(0.012, 0.012, w * 0.32, 4, M.blackMetal, s * w * 0.2, h * 0.02, d / 2 + 0.05).rotateZ(1.2));
    const side = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.38, h * 0.32), M.darkGlass);
    side.position.set(s * (w / 2 + 0.012), h * 0.16, d * 0.1);
    side.rotation.y = s * Math.PI / 2;
    g.add(side);
    g.add(K.cyl(0.016, 0.016, 0.44, 4, M.blackMetal, s * (w / 2 + 0.22), h * 0.3, d / 2 - 0.05).rotateZ(Math.PI / 2));
    g.add(K.box(0.05, 0.36, 0.18, M.blackMetal, s * (w / 2 + 0.42), h * 0.3, d / 2 - 0.05));
    g.add(K.box(0.36, 0.3, 0.08, M.darkMetal, s * w * 0.33, -h * 0.14, d / 2 + 0.04));
    g.add(K.cyl(0.12, 0.12, 0.09, 12, M.lampGlassOff, s * w * 0.33, -h * 0.14, d / 2 + 0.09).rotateX(Math.PI / 2));
    g.add(K.cyl(0.035, 0.035, h * 0.66, 6, M.galvanised, s * w * 0.3, -h * 0.14, d / 2 + 0.27));
    g.add(K.box(0.34, 0.05, 0.22, M.galvanised, s * (w / 2 + 0.09), -h / 2 - 0.18, d * 0.05));
  }
  // brush guard, bumper and grille
  g.add(K.box(w + 0.12, 0.26, 0.26, M.darkMetal, 0, -h / 2 + 0.1, d / 2 + 0.15));
  g.add(K.cyl(0.03, 0.03, w * 0.72, 6, M.galvanised, 0, h * 0.16, d / 2 + 0.27).rotateZ(Math.PI / 2));
  g.add(K.box(w * 0.64, h * 0.24, 0.07, M.blackMetal, 0, -h * 0.15, d / 2 + 0.05));
  for (let i = 0; i < 5; i++) {
    g.add(K.box(w * 0.62, 0.025, 0.09, M.galvanised, 0, -h * 0.15 + (i - 2) * h * 0.045, d / 2 + 0.07));
  }
  // roof hatch, aerial base and grab rails
  g.add(K.box(w * 0.4, 0.07, d * 0.34, M.darkMetal, 0, h / 2 + 0.035, -d * 0.1));
  boltRect(g, w * 0.36, d * 0.3, 3, M.steel, { y: h / 2 + 0.075, z: -d * 0.1, r: 0.016 });
  grabHandle(g, 0, h * 0.36, d / 2 + 0.03, { len: 0.4, out: 0.09 });
  return g;
}

/** Pad furniture shared by every battery site. */
function buildPadSupport(battery, rng, {
  crewShelter = true, shelterAt = [-11.5, 4.5], scorchY = 0.06, kerbs = true, rackZ = -11.0,
} = {}) {
  const M = mats();
  const g = new THREE.Group();

  const gen = K.generator(rng, { scale: 1.0 });
  gen.position.set(-8.5, 0, 8.2);
  gen.rotation.y = 0.7;
  g.add(gen);
  battery.padGenerator = gen;

  // power + data umbilicals from the generator to the launcher
  g.add(K.cable(new THREE.Vector3(-7.4, 0.7, 7.6), new THREE.Vector3(-2.0, 0.5, 2.0), { sag: 0.55, radius: 0.05 }));
  g.add(K.cable(new THREE.Vector3(-7.4, 0.55, 8.0), new THREE.Vector3(-2.0, 0.42, 2.6), { sag: 0.6, radius: 0.038 }));
  g.add(K.cableCoil(0.6, 4).translateX(-6.0).translateZ(5.6));

  if (crewShelter) {
    const shelter = new THREE.Group();
    shelter.position.set(shelterAt[0], 0, shelterAt[1]);
    shelter.rotation.y = 0.9;
    shelter.add(K.box(3.4, 2.5, 2.6, M.corrugated, 0, 1.25, 0));
    shelter.add(K.box(3.8, 0.16, 3.0, M.panelOlive, 0, 2.6, 0));
    shelter.add(K.box(0.9, 1.9, 0.08, M.panelGrey, 0.9, 0.95, 1.32));
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), M.darkGlass);
    win.position.set(-0.7, 1.5, 1.32);
    shelter.add(win);
    shelter.add(K.box(0.7, 0.5, 0.4, M.panelGrey, -1.1, 1.7, -1.35));
    shelter.add(K.labelPlate(battery.spec.name, 1.2, 0.24).translateY(2.15).translateZ(1.35));
    g.add(shelter);
    const ch = Math.cos(battery.heading);
    const sh = Math.sin(battery.heading);
    battery.collision?.addBox(
      new THREE.Vector3(
        battery.group.position.x + shelterAt[0] * ch + shelterAt[1] * sh,
        1.25,
        battery.group.position.z - shelterAt[0] * sh + shelterAt[1] * ch,
      ),
      new THREE.Vector3(4.2, 2.5, 3.6), 'shelter',
    );
  }

  // spare canister rack, sized to the rounds the battery actually carries
  const id = battery.spec.id;
  const rackLen = id === 'sentinel' ? 7.4 : id === 'thaad' ? 6.0 : 5.6;
  const rackHalf = id === 'sentinel' ? 1.5 : 1.3;
  const rack = new THREE.Group();
  rack.position.set(0, 0, rackZ);
  for (const s of [-1, 1]) {
    rack.add(K.box(0.3, 1.1, rackLen, M.galvanised, s * rackHalf, 0.55, 0));
    rack.add(K.box(rackHalf * 2.2, 0.2, 0.3, M.galvanised, 0, 1.05, s * (rackLen / 2 - 0.3)));
    for (const z of [-1, 1]) {
      rack.add(K.box(0.5, 0.1, 0.5, M.concreteDark, s * rackHalf, 0.05, z * (rackLen / 2 - 0.3)));
    }
  }
  const spareCount = id === 'sentinel' ? 1 : 2;
  for (let i = 0; i < spareCount; i++) {
    let spare;
    if (id === 'patriot') {
      spare = buildRectCanister(5.7, 0.86, i, battery.spec.accent, { dynamicCover: false, detail: 'low' });
      spare.position.set((i - (spareCount - 1) / 2) * 1.02, 1.58, 0);
    } else {
      const r = id === 'sentinel' ? 0.8 : 0.4;
      spare = buildRoundCanister(id === 'sentinel' ? 9.8 : 6.6, r, i, battery.spec.accent, null, {
        dynamicCover: false, detail: 'low', stencilText: battery.spec.name,
      });
      spare.position.set((i - (spareCount - 1) / 2) * (r * 2.5), 1.3 + r, 0);
    }
    rack.add(spare);
  }
  const tarp = K.box(rackHalf * 2.3, 0.1, 1.9, M.canvasTarp, 0, 1.3 + (id === 'sentinel' ? 1.7 : 0.9), -1.7);
  tarp.rotation.x = 0.05;
  rack.add(tarp);
  g.add(rack);

  // clutter + barriers
  for (let i = 0; i < 4; i++) {
    const b = K.jerseyBarrier(3);
    b.position.set(-13.5, 0, -6 + i * 3.2);
    g.add(b);
    battery.collision?.addBox(
      new THREE.Vector3(battery.group.position.x - 13.5, 0.5, battery.group.position.z - 6 + i * 3.2),
      new THREE.Vector3(0.7, 1.0, 3.1), 'barrier',
    );
  }
  for (let i = 0; i < 5; i++) {
    const p = rng.float() < 0.5 ? K.crateStack(rng) : K.equipmentCase(0.85, 0.45, 0.6);
    p.position.set(rng.range(7, 12), 0, rng.range(-10, -3));
    p.rotation.y = rng.range(0, 6.28);
    g.add(p);
  }
  const mast = K.floodlightMast(6.4);
  mast.position.set(12.5, 0, -8.5);
  mast.rotation.y = 2.4;
  g.add(mast);
  battery.padFloodlight = mast;

  // ground scorch under the launcher
  const scorch = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), mats().scorch.clone());
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.set(0, scorchY, -2.0);
  scorch.material.opacity = 0.55;
  g.add(scorch);
  battery.scorchDecal = markDynamic(scorch);

  // painted hazard kerb marking out the launcher footprint
  if (kerbs) {
    for (const s of [-1, 1]) g.add(K.box(0.5, 0.1, 11.5, M.hazard, s * 5.6, 0.06, -1.5));
  }
  return g;
}

// ---------------------------------------------------------------------------
// Battery builders
// ---------------------------------------------------------------------------

function buildPatriot(battery, rng) {
  const M = mats();
  const P = LM();
  const spec = battery.spec;
  const g = battery.group;
  const accent = accentMat(spec.accent);

  const chassis = buildChassis(8.4, 2.62, { axles: 2, wheelR: 0.62, paint: P.hullGreen, outrigger: 1.0, drop: 1.05 });
  chassis.position.y = 1.05;
  g.add(chassis);

  // forward equipment bay: launcher electronics, cooling set, status panel
  g.add(K.chamferBox(2.24, 1.2, 1.6, P.hullGreen, 0.04).translateY(1.94).translateZ(3.1));
  g.add(K.box(2.36, 0.1, 1.72, M.darkMetal, 0, 2.59, 3.1));
  boltRun(g, 9, new THREE.Vector3(-1.05, 2.57, 2.36), new THREE.Vector3(1.05, 2.57, 2.36), M.steel, { r: 0.02, axis: 'y' });
  boltRun(g, 9, new THREE.Vector3(-1.05, 2.57, 3.84), new THREE.Vector3(1.05, 2.57, 3.84), M.steel, { r: 0.02, axis: 'y' });
  g.add(K.box(1.5, 0.66, 0.09, M.blackMetal, 0, 1.9, 3.9));
  for (let i = 0; i < 8; i++) g.add(K.box(1.44, 0.035, 0.11, M.galvanised, 0, 1.63 + i * 0.08, 3.93));
  g.add(K.cyl(0.34, 0.34, 0.52, 12, M.galvanised, -0.76, 2.9, 3.1));
  g.add(K.cyl(0.39, 0.39, 0.06, 12, M.darkMetal, -0.76, 3.18, 3.1));
  boltCircle(g, 12, 0.3, M.steel, { x: -0.76, y: 3.22, z: 3.1, r: 0.018, axis: 'y' });
  g.add(K.chamferBox(0.92, 0.52, 0.72, M.panelGrey, 0.04).translateX(0.64).translateY(2.86).translateZ(3.1));
  g.add(K.conduit([
    new THREE.Vector3(1.1, 2.6, 3.6),
    new THREE.Vector3(1.24, 2.0, 2.4),
    new THREE.Vector3(1.24, 1.5, 0.6),
  ], 0.055, M.galvanised));

  battery.statusLeds = [statusPanel(g, 5, {
    spacing: 0.19, label: 'LAUNCHER STATUS', position: [0, 2.32, 3.92],
  })];
  g.add(K.labelPlate(spec.name, 1.3, 0.24).translateY(1.36).translateZ(3.92));
  g.add(K.box(1.5, 0.2, 0.04, M.hazard, 0, 1.14, 3.92));

  // access ladder, rear step deck, handrail
  const lad = ladderRun(1.5);
  lad.position.set(1.46, 0.3, 2.2);
  lad.rotation.y = Math.PI / 2;
  g.add(lad);
  const deck = walkway(1.4, 1.6);
  deck.position.set(0, 1.34, -3.5);
  g.add(deck);
  const rail = K.handrail(1.7, 0.95);
  rail.position.set(0, 1.37, -4.25);
  g.add(rail);
  grabHandle(g, 1.36, 1.7, 2.9, { len: 0.5, out: 0.1, rotY: Math.PI / 2 });

  // azimuth turntable on the trailer deck
  const turntable = new THREE.Group();
  turntable.position.set(0, 1.34, -0.55);
  g.add(turntable);
  battery.turntable = markDynamic(turntable);

  turntable.add(K.cyl(1.18, 1.32, 0.34, 22, P.hullGreen, 0, 0.17, 0));
  turntable.add(K.cyl(1.24, 1.24, 0.1, 22, M.darkMetal, 0, 0.3, 0));
  boltCircle(turntable, 24, 1.12, M.steel, { y: 0.36, r: 0.026, axis: 'y' });
  // exposed turntable deck is scorched by every launch
  turntable.add(K.cyl(0.92, 0.92, 0.12, 16, M.heatSteel, 0, 0.42, 0));
  turntable.add(K.chamferBox(0.66, 0.42, 0.54, M.darkMetal, 0.04).translateY(0.6).translateZ(-0.88));
  for (const s of [-1, 1]) {
    turntable.add(K.cable(new THREE.Vector3(s * 0.24, 0.62, -0.72), new THREE.Vector3(s * 1.12, 0.3, 0.45),
      { sag: 0.22, radius: 0.032, material: M.rubber }));
    // trunnion bearing blocks
    turntable.add(K.chamferBox(0.32, 0.74, 0.62, M.darkMetal, 0.04).translateX(s * 1.14).translateY(0.6));
    boltCircle(turntable, 8, 0.18, M.steel, { x: s * 1.31, y: 0.6, z: 0, r: 0.022, axis: 'x' });
    turntable.add(K.cyl(0.15, 0.15, 0.38, 12, M.steel, s * 1.16, 0.78, 0).rotateZ(Math.PI / 2));
  }

  // erector frame - kept low and narrow so the canister block owns the profile
  const erector = new THREE.Group();
  erector.position.set(0, 0.78, 0);
  turntable.add(erector);
  battery.erector = markDynamic(erector);

  const canLen = 5.7;
  const size = 0.86;
  const pitch = size + 0.045;
  const blockZ = 2.55;
  const rowY = [0.62, 0.62 + pitch];
  const colX = [-pitch / 2, pitch / 2];

  // Side rails are rolled I-section rather than solid boxes: the pale flanges
  // catch light and stop the frame reading as a black bar under the block.
  for (const s of [-1, 1]) {
    erector.add(K.box(0.24, 0.13, canLen + 0.7, M.galvanised, s * 1.02, 0.34, blockZ - 0.1));
    erector.add(K.box(0.12, 0.42, canLen + 0.7, M.darkMetal, s * 1.02, 0.07, blockZ - 0.1));
    erector.add(K.box(0.28, 0.14, canLen + 0.7, M.galvanised, s * 1.02, -0.14, blockZ - 0.1));
    boltRun(erector, 11, new THREE.Vector3(s * 1.15, 0.34, blockZ - canLen / 2),
      new THREE.Vector3(s * 1.15, 0.34, blockZ + canLen / 2), M.steel, { r: 0.019, axis: 'x' });
    // web stiffeners between the flanges
    for (let i = 0; i < 8; i++) {
      const z = blockZ - 0.1 + (i / 7 - 0.5) * (canLen + 0.2);
      erector.add(K.box(0.2, 0.4, 0.09, M.galvanised, s * 1.02, 0.07, z));
    }
  }
  erector.add(K.box(2.24, 0.26, 0.72, M.darkMetal, 0, 0.0, blockZ - canLen / 2 - 0.1));
  erector.add(K.box(2.24, 0.26, 0.6, M.darkMetal, 0, 0.0, blockZ + canLen / 2 - 0.2));
  // blast deflector doubles as the rear bulkhead, so it always clears the deck
  const deflZ = blockZ - canLen / 2 - 0.48;
  erector.add(K.box(2.32, 2.0, 0.24, M.heatSteel, 0, 1.0, deflZ));
  // blast face (soot) points forward at the canister tails; the rear side is
  // stiffened plate, which is the side the site actually looks at
  erector.add(K.box(2.1, 1.78, 0.05, P.soot, 0, 1.0, deflZ + 0.14));
  for (const s of [-1, 0, 1]) {
    erector.add(K.box(0.16, 1.96, 0.22, M.galvanised, s * 0.96, 1.0, deflZ - 0.2));
    boltRun(erector, 7, new THREE.Vector3(s * 0.96, 0.12, deflZ - 0.32),
      new THREE.Vector3(s * 0.96, 1.88, deflZ - 0.32), M.steel, { r: 0.019, axis: 'z' });
  }
  for (const y of [0.24, 1.0, 1.76]) {
    erector.add(K.box(2.24, 0.14, 0.18, M.galvanised, 0, y, deflZ - 0.18));
  }
  boltRect(erector, 2.1, 1.82, 5, M.steel, { y: 1.0, z: deflZ - 0.14, r: 0.02 });
  erector.add(K.box(2.38, 0.16, 0.4, M.darkMetal, 0, 2.06, deflZ - 0.04));
  erector.add(K.box(1.5, 0.22, 0.05, M.hazard, 0, 1.9, deflZ - 0.33));
  erector.add(K.box(0.4, 0.4, 0.22, M.panelGrey, -0.74, 1.66, deflZ - 0.34));
  boltRect(erector, 0.36, 0.36, 2, M.steel, { x: -0.74, y: 1.66, z: deflZ - 0.46, r: 0.015 });
  erector.add(K.conduit([
    new THREE.Vector3(-0.74, 1.44, deflZ - 0.4),
    new THREE.Vector3(-1.0, 0.6, deflZ - 0.1),
    new THREE.Vector3(-1.04, 0.52, blockZ - canLen * 0.4),
  ], 0.05, M.galvanised));

  // 2x2 canister block
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const can = buildRectCanister(canLen, size, i, spec.accent);
    can.position.set(colX[col], rowY[row], blockZ);
    erector.add(can);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(colX[col], rowY[row], blockZ + canLen / 2 + 0.16);
    erector.add(muzzle);
    battery.tubes.push({ index: i, loaded: true, cover: can.userData.cover, muzzle, canister: can });
  }

  // strap-down yokes: thin posts at two stations only, so the block stays open
  for (const z of [blockZ - canLen * 0.32, blockZ + canLen * 0.3]) {
    erector.add(K.box(2.12, 0.16, 0.26, M.galvanised, 0, rowY[0] - size / 2 - 0.1, z));
    erector.add(K.box(2.12, 0.14, 0.24, M.galvanised, 0, rowY[1] + size / 2 + 0.11, z));
    for (const s of [-1, 1]) {
      erector.add(K.box(0.11, pitch + size + 0.2, 0.24, M.galvanised, s * 1.02, rowY[0] + pitch / 2, z));
      erector.add(K.cyl(0.045, 0.045, 0.32, 6, M.hydraulic, s * 1.02, rowY[1] + size / 2 + 0.24, z));
      erector.add(K.box(0.15, 0.11, 0.28, M.steel, s * 1.02, rowY[1] + size / 2 + 0.4, z));
    }
  }

  // umbilical trunk feeding the four canisters
  erector.add(K.box(0.24, 0.24, canLen * 0.8, M.darkMetal, -1.04, 0.52, blockZ));
  for (let i = 0; i < 4; i++) {
    const z = blockZ - canLen * 0.3 + i * canLen * 0.2;
    erector.add(K.cable(
      new THREE.Vector3(-1.0, 0.58, z),
      new THREE.Vector3(-size * 0.62, rowY[i % 2] - 0.14, z + 0.22),
      { sag: 0.08, radius: 0.026, material: M.rubber },
    ));
  }

  // elevation rams
  battery.rams = [];
  for (const s of [-1, 1]) {
    const rm = ram(2.1, 0.095);
    rm.position.set(s * 1.3, 0.16, 0.85);
    rm.rotation.x = -0.55;
    markDynamic(rm);
    turntable.add(rm);
    battery.rams.push(rm);
    // supply hoses stay with the (static) turntable so they merge for free
    turntable.add(K.cable(new THREE.Vector3(s * 1.32, 0.26, 0.8), new THREE.Vector3(s * 0.36, 0.5, -0.7),
      { sag: 0.14, radius: 0.028, material: M.rubber }));
    turntable.add(K.cable(new THREE.Vector3(s * 1.26, 0.18, 0.95), new THREE.Vector3(s * 0.3, 0.44, -0.62),
      { sag: 0.2, radius: 0.022, material: M.rubber }));
  }

  // selection strips along both trailer skirts
  const strip = K.box(0.08, 0.08, 7.0, accent, 1.44, 0.94, 0);
  g.add(strip);
  g.add(K.box(0.08, 0.08, 7.0, accent, -1.44, 0.94, 0));
  battery.selectionStrip = strip;

  addBeacons(battery, g, 0xffb029, [[-1.26, 1.5, -4.0], [1.26, 1.5, -4.0]]);

  g.add(buildPadSupport(battery, rng, { shelterAt: [-11.5, 4.5] }));

  battery.collision?.addBox(
    new THREE.Vector3(battery.group.position.x, 1.5, battery.group.position.z),
    new THREE.Vector3(3.8, 3.0, 9.0), 'launcher',
  );
  battery.launchOrigin = new THREE.Vector3(0, 2.4, 0);
}

function buildThaad(battery, rng) {
  const M = mats();
  const P = LM();
  const spec = battery.spec;
  const g = battery.group;
  const accent = accentMat(spec.accent);

  // heavy 3-axle transporter with a forward cab
  const chassis = buildChassis(11.0, 2.8, {
    axles: 3, wheelR: 0.74, drawbar: false, paint: P.hullTan, outrigger: 1.15, wheelBase: 0.58, drop: 1.3,
  });
  chassis.position.y = 1.3;
  g.add(chassis);
  const cab = buildCab(2.72, 2.15, 2.6, P.hullTan);
  cab.position.set(0, 2.67, 4.9);
  g.add(cab);
  // exhaust stack, whip antenna, under-deck tanks
  g.add(K.cyl(0.08, 0.09, 1.8, 8, M.heatSteel, 1.52, 3.5, 3.5));
  g.add(K.cyl(0.11, 0.11, 0.06, 8, M.darkMetal, 1.52, 4.42, 3.5));
  for (let i = 0; i < 4; i++) g.add(K.cyl(0.1, 0.1, 0.05, 8, M.galvanised, 1.52, 2.85 + i * 0.42, 3.5));
  g.add(K.cyl(0.014, 0.018, 2.6, 4, M.blackMetal, -1.44, 5.05, 3.6));
  g.add(K.cyl(0.05, 0.05, 0.3, 6, M.darkMetal, -1.44, 3.85, 3.6));
  g.add(K.cyl(0.4, 0.4, 1.9, 14, M.galvanised, -1.66, 1.02, 1.3).rotateZ(Math.PI / 2));
  for (const z of [0.55, 2.05]) g.add(K.box(0.14, 0.92, 0.09, M.darkMetal, -1.66, 1.02, z));
  g.add(K.chamferBox(0.6, 0.5, 0.9, M.darkMetal, 0.04).translateX(1.66).translateY(1.05).translateZ(1.4));

  // load bed between cab and pallet: reload gear rather than bare deck
  g.add(K.box(2.5, 0.06, 3.0, M.galvanised, 0, 1.62, 2.4));
  for (let i = 0; i < 7; i++) g.add(K.box(2.4, 0.03, 0.07, M.darkMetal, 0, 1.66, 1.1 + i * 0.44));
  g.add(K.chamferBox(1.15, 0.82, 1.35, P.hullTan, 0.04).translateX(-0.62).translateY(2.06).translateZ(1.72));
  g.add(K.box(1.22, 0.06, 1.42, M.darkMetal, -0.62, 2.5, 1.72));
  boltRect(g, 1.06, 1.26, 3, M.steel, { x: -0.62, y: 2.06, z: 2.41, r: 0.018 });
  grabHandle(g, -0.62, 2.14, 2.42, { len: 0.3, out: 0.08 });
  // hose drums on their cradles
  for (const [dx, dz] of [[0.72, 1.5], [0.72, 2.55]]) {
    g.add(K.cyl(0.36, 0.36, 0.56, 14, M.rubber, dx, 2.02, dz).rotateZ(Math.PI / 2));
    for (const o of [-0.3, 0.3]) {
      g.add(K.cyl(0.44, 0.44, 0.05, 14, M.galvanised, dx + o, 2.02, dz).rotateZ(Math.PI / 2));
    }
    g.add(K.box(0.78, 0.36, 0.14, M.galvanised, dx, 1.83, dz));
    boltRun(g, 4, new THREE.Vector3(dx - 0.3, 1.68, dz - 0.06), new THREE.Vector3(dx + 0.3, 1.68, dz - 0.06),
      M.steel, { r: 0.018, axis: 'y' });
  }
  // stowed lifting davit for canister handling
  g.add(K.cyl(0.16, 0.19, 1.5, 10, P.hullTan, -1.0, 2.4, 3.5));
  g.add(K.cyl(0.24, 0.24, 0.1, 12, M.darkMetal, -1.0, 1.68, 3.5));
  boltCircle(g, 8, 0.2, M.steel, { x: -1.0, y: 1.75, z: 3.5, r: 0.02, axis: 'y' });
  const jib = K.box(0.16, 0.16, 2.1, M.galvanised, -1.0, 3.08, 2.6);
  jib.rotation.x = 0.18;
  g.add(jib);
  g.add(K.cyl(0.06, 0.06, 0.9, 6, M.hydraulic, -1.0, 2.72, 3.06).rotateX(0.9));
  g.add(K.cyl(0.02, 0.02, 0.75, 4, M.blackMetal, -1.0, 2.9, 1.62));
  g.add(K.box(0.12, 0.16, 0.1, M.steel, -1.0, 2.5, 1.62));
  // spare wheel slung under the frame rail
  g.add(K.cyl(0.74, 0.74, 0.4, 16, M.rubber, -1.72, 0.98, 2.9).rotateZ(Math.PI / 2));
  g.add(K.cyl(0.3, 0.3, 0.42, 12, M.steel, -1.72, 0.98, 2.9).rotateZ(Math.PI / 2));
  g.add(K.box(0.12, 0.9, 0.1, M.galvanised, -1.6, 1.28, 2.9));
  // tie-down chains across the bed
  for (const z of [1.3, 3.3]) {
    g.add(K.cable(new THREE.Vector3(-1.22, 1.66, z), new THREE.Vector3(1.22, 1.66, z),
      { sag: 0.12, radius: 0.022, material: M.steel }));
  }

  // pallet + azimuth ring behind the cab
  const turntable = new THREE.Group();
  turntable.position.set(0, 1.62, -1.6);
  g.add(turntable);
  battery.turntable = markDynamic(turntable);

  turntable.add(K.cyl(1.52, 1.74, 0.42, 26, P.hullTan, 0, 0.21, 0));
  turntable.add(K.cyl(1.6, 1.6, 0.12, 26, M.darkMetal, 0, 0.38, 0));
  boltCircle(turntable, 30, 1.46, M.steel, { y: 0.45, r: 0.026, axis: 'y' });
  turntable.add(K.cyl(1.12, 1.12, 0.14, 18, M.galvanised, 0, 0.5, 0));
  turntable.add(K.chamferBox(0.84, 0.52, 0.62, M.darkMetal, 0.04).translateY(0.74).translateZ(-1.16));
  // trunnion towers: tall enough that the pod tail swings clear of the ring
  for (const s of [-1, 1]) {
    turntable.add(K.chamferBox(0.44, 1.8, 0.94, P.hullTan, 0.04).translateX(s * 1.42).translateY(1.12));
    turntable.add(K.box(0.5, 0.16, 1.0, M.darkMetal, s * 1.42, 2.06, 0));
    turntable.add(K.box(0.56, 0.14, 1.06, M.darkMetal, s * 1.42, 0.28, 0));
    for (const y of [0.6, 1.62]) {
      turntable.add(K.box(0.5, 0.1, 1.0, M.galvanised, s * 1.42, y, 0));
      boltRun(turntable, 5, new THREE.Vector3(s * 1.65, y, -0.42), new THREE.Vector3(s * 1.65, y, 0.42),
        M.steel, { r: 0.02, axis: 'x' });
    }
    boltCircle(turntable, 12, 0.3, M.steel, { x: s * 1.65, y: 2.0, z: 0, r: 0.024, axis: 'x' });
    turntable.add(K.cyl(0.2, 0.2, 0.5, 12, M.steel, s * 1.46, 2.0, 0).rotateZ(Math.PI / 2));
    turntable.add(K.cyl(0.28, 0.28, 0.12, 12, M.darkMetal, s * 1.66, 2.0, 0).rotateZ(Math.PI / 2));
    // knee brace back to the pallet
    const knee = K.cyl(0.09, 0.09, 1.7, 6, M.galvanised, s * 1.42, 1.1, 0.72);
    knee.rotation.x = -0.6;
    turntable.add(knee);
    turntable.add(K.cable(new THREE.Vector3(s * 1.5, 0.6, 1.5), new THREE.Vector3(s * 0.42, 0.74, -1.0),
      { sag: 0.2, radius: 0.03, material: M.rubber }));
    turntable.add(K.conduit([
      new THREE.Vector3(s * 1.24, 0.55, 0.5),
      new THREE.Vector3(s * 1.22, 1.5, 0.32),
      new THREE.Vector3(s * 1.26, 1.94, 0.1),
    ], 0.06, M.galvanised));
  }
  // scorched blast apron on the turntable deck, under the pod tail
  turntable.add(K.box(3.2, 0.1, 2.4, M.heatSteel, 0, 0.03, -1.5));
  turntable.add(K.box(2.9, 0.03, 2.1, P.soot, 0, 0.09, -1.5));
  for (const s of [-1, 1]) turntable.add(K.box(0.14, 0.16, 2.5, M.darkMetal, s * 1.6, 0.05, -1.5));

  const erector = new THREE.Group();
  erector.position.set(0, 2.0, 0);
  turntable.add(erector);
  battery.erector = markDynamic(erector);

  // launch pod: a short, deliberately boxy frame carrying 8 tubes, 2 across
  // and 4 deep. Stubby proportions keep the muzzle low enough that the tube
  // mouths are still readable from the ground.
  const podLen = 7.6;
  const r = 0.4;
  const colX = [-0.5, 0.5];
  const rowY = [-1.5, -0.5, 0.5, 1.5];
  const podW = 1.26;
  const podH = 2.1;
  const pod = new THREE.Group();
  pod.position.set(0, 0.9, podLen / 2 - 0.6);
  erector.add(pod);

  pod.add(K.box(podW * 2, podH * 2, podLen, P.hullGreen, 0, 0, 0));
  // transverse frames in bright galvanised: strong banding rhythm on the flank
  for (let i = 0; i < 6; i++) {
    const z = (i / 5 - 0.5) * (podLen - 0.7);
    pod.add(K.box(podW * 2 + 0.12, podH * 2 + 0.12, 0.16, M.galvanised, 0, 0, z));
    pod.add(K.box(podW * 2 + 0.16, podH * 2 + 0.16, 0.05, M.darkMetal, 0, 0, z));
    for (const sx of [-1, 1]) {
      boltRun(pod, 5, new THREE.Vector3(sx * (podW + 0.07), -podH + 0.3, z),
        new THREE.Vector3(sx * (podW + 0.07), podH - 0.3, z), M.steel, { r: 0.02, axis: 'x' });
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      pod.add(K.box(0.16, 0.16, podLen + 0.06, M.darkMetal, sx * podW, sy * podH, 0));
    }
    for (const y of [-1.05, 0, 1.05]) {
      pod.add(K.box(0.06, 0.09, podLen - 0.5, M.galvanised, sx * (podW + 0.02), y, 0));
    }
    for (const y of [-1.75, -0.6, 0.6, 1.75]) {
      pod.add(weld(podLen - 0.6, M.galvanised, { x: sx * (podW + 0.012), y, axis: 'z', r: 0.012 }));
    }
    // inspection hatches down the flank
    for (const z of [-podLen * 0.28, podLen * 0.06]) {
      pod.add(K.box(0.05, 0.7, 0.62, M.panelGrey, sx * (podW + 0.02), -0.95, z));
      boltRect(pod, 0.58, 0.5, 3, M.steel, { x: sx * (podW + 0.05), y: -0.95, z, r: 0.016 });
    }
  }

  // front face plate with 8 visible tube openings, kept bright so the business
  // end still reads when the pod is seen at a grazing angle from the ground
  const faceZ = podLen / 2 + 0.12;
  pod.add(K.box(podW * 2 + 0.1, podH * 2 + 0.1, 0.28, M.galvanised, 0, 0, podLen / 2 + 0.06));
  pod.add(K.box(podW * 2 + 0.16, podH * 2 + 0.16, 0.07, M.darkMetal, 0, 0, podLen / 2 - 0.02));
  boltRect(pod, podW * 2 - 0.06, podH * 2 - 0.02, 8, M.steel, { z: faceZ + 0.09, r: 0.022 });
  for (let i = 0; i < 8; i++) {
    const x = colX[i % 2];
    const y = rowY[Math.floor(i / 2)];
    // Each mouth is a stub barrel standing proud of the face plate. Once the
    // pod is elevated the plate itself is edge-on from the ground, so it is
    // the eight protruding rims that have to sell "8 tubes".
    const stub = 0.54;
    pod.add(K.cyl(r * 1.0, r * 1.08, stub, 16, M.galvanised, x, y, faceZ + stub / 2).rotateX(Math.PI / 2));
    pod.add(K.cyl(r * 1.22, r * 1.22, 0.14, 16, M.darkMetal, x, y, faceZ + 0.08).rotateX(Math.PI / 2));
    pod.add(K.cyl(r * 1.16, r * 1.16, 0.1, 16, M.hazard, x, y, faceZ + stub - 0.16).rotateX(Math.PI / 2));
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, 0.05, 6, 18), M.steel);
    lip.position.set(x, y, faceZ + stub);
    pod.add(lip);
    boltCircle(pod, 10, r * 1.14, M.steel, { x, y, z: faceZ + 0.16, r: 0.016 });
    const tube = buildPodTube(r, faceZ + stub);
    tube.position.set(x, y, 0);
    pod.add(tube);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(x, y, faceZ + stub + 0.16);
    pod.add(muzzle);
    battery.tubes.push({ index: i, loaded: true, cover: tube.userData.cover, muzzle, canister: tube });
  }
  // aft face: sooted blast plate with eight vent throats
  pod.add(K.box(podW * 2 + 0.08, podH * 2 + 0.08, 0.26, M.heatSteel, 0, 0, -podLen / 2 - 0.11));
  for (let i = 0; i < 8; i++) {
    pod.add(K.cyl(r * 0.86, r * 0.86, 0.1, 14, P.soot, colX[i % 2], rowY[Math.floor(i / 2)], -podLen / 2 - 0.25)
      .rotateX(Math.PI / 2));
  }
  pod.add(K.box(podW * 2 + 0.1, podH * 2 + 0.1, 0.04, P.soot, 0, 0, -podLen / 2 - 0.245));

  // pod exterior: walkway, handrail, ladder, cable tray, lifting eyes, markings
  const wk = walkway(0.62, podLen * 0.7);
  wk.position.set(podW + 0.35, -podH + 0.12, 0);
  pod.add(wk);
  const rail = K.handrail(podLen * 0.7, 0.95);
  rail.rotation.y = Math.PI / 2;
  rail.position.set(podW + 0.63, -podH + 0.15, 0);
  pod.add(rail);
  for (const z of [-podLen * 0.3, podLen * 0.3]) {
    pod.add(K.box(0.72, 0.09, 0.14, M.galvanised, podW + 0.36, -podH + 0.07, z));
  }
  const lad = ladderRun(2.4, 0.4);
  lad.rotation.x = Math.PI / 2;
  lad.position.set(podW + 0.12, -podH - 0.06, -podLen * 0.36);
  pod.add(lad);
  pod.add(K.conduit([
    new THREE.Vector3(-podW - 0.12, -1.6, -podLen / 2 + 0.4),
    new THREE.Vector3(-podW - 0.18, -0.4, 0),
    new THREE.Vector3(-podW - 0.12, 0.9, podLen / 2 - 0.6),
  ], 0.07, M.darkMetal));
  for (let i = 0; i < 5; i++) {
    pod.add(K.box(0.18, 0.18, 0.1, M.galvanised, -podW - 0.08, -1.6 + i * 0.64, -podLen * 0.36 + i * podLen * 0.18));
  }
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pod.add(K.box(0.18, 0.22, 0.18, M.steel, 0, sy * (podH + 0.1), sz * podLen * 0.34));
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.024, 5, 9), M.steel);
      eye.position.set(0, sy * (podH + 0.24), sz * podLen * 0.34);
      pod.add(eye);
    }
  }
  grabHandle(pod, 0, -podH - 0.03, podLen * 0.18, { len: 0.26, out: 0.08 });

  // Name board sits outboard of the transverse frames, otherwise the frames
  // chop the lettering up and it stops reading from the pad.
  for (const s of [-1, 1]) {
    const board = K.box(0.06, 0.9, 3.9, M.panelGrey, s * (podW + 0.16), 1.2, -0.9);
    pod.add(board);
    boltRect(pod, 0.8, 3.7, 3, M.steel, { x: s * (podW + 0.2), y: 1.2, z: -0.9, r: 0.018 });
    const podLabel = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.74), K.decalMaterial('HALBERD HA-2', {
      color: '#eef2e6', w: 1024, h: 200,
    }));
    podLabel.position.set(s * (podW + 0.2), 1.2, -0.9);
    podLabel.rotation.y = s * Math.PI / 2;
    pod.add(podLabel);
    const tubeMark = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.44), K.decalMaterial('8 x HA-2', {
      color: '#ffd88a', w: 512, h: 150,
    }));
    tubeMark.position.set(s * (podW + 0.04), -0.2, podLen * 0.24);
    tubeMark.rotation.y = s * Math.PI / 2;
    pod.add(tubeMark);
  }
  pod.add(K.box(podW * 2 + 0.1, 0.34, 0.07, M.hazard, 0, -podH + 0.02, podLen * 0.33));
  pod.add(K.box(podW * 2 + 0.1, 0.34, 0.07, M.hazard, 0, podH - 0.02, podLen * 0.33));
  for (const s of [-1, 1]) {
    pod.add(K.box(0.07, 0.07, podLen * 0.74, accent, s * (podW + 0.07), podH - 0.24, 0));
  }

  battery.statusLeds = [statusPanel(pod, 4, {
    spacing: 0.17, position: [podW + 0.18, -podH + 0.5, podLen * 0.28], rotation: [0, Math.PI / 2, 0],
  })];

  // heavy elevation rams
  battery.rams = [];
  for (const s of [-1, 1]) {
    const rm = ram(3.6, 0.13);
    rm.position.set(s * 1.6, 0.15, 2.4);
    rm.rotation.x = -0.24;
    markDynamic(rm);
    turntable.add(rm);
    battery.rams.push(rm);
    turntable.add(K.cable(new THREE.Vector3(s * 1.52, 0.26, 1.5), new THREE.Vector3(s * 0.44, 0.74, -1.0),
      { sag: 0.2, radius: 0.032, material: M.rubber }));
    turntable.add(K.cable(new THREE.Vector3(s * 1.44, 0.16, 1.72), new THREE.Vector3(s * 0.38, 0.66, -0.9),
      { sag: 0.26, radius: 0.024, material: M.rubber }));
  }

  // erector cradle: side plates clamped to the lower rear of the pod
  for (const s of [-1, 1]) {
    erector.add(K.box(0.3, 2.3, 3.4, M.darkMetal, s * 1.42, 0.0, 1.3));
    erector.add(K.box(0.16, 0.24, 3.2, M.galvanised, s * 1.58, 0.9, 1.3));
    boltRect(erector, 1.1, 1.9, 4, M.steel, { x: s * 1.42, y: 0.0, z: 3.02, r: 0.02 });
    erector.add(K.cyl(0.2, 0.2, 0.5, 12, M.steel, s * 1.5, 0, 0).rotateZ(Math.PI / 2));
  }
  erector.add(K.box(3.0, 0.44, 1.0, M.darkMetal, 0, -1.36, 0.6));
  erector.add(K.box(2.7, 0.2, 0.44, M.galvanised, 0, -1.06, 0.6));

  // electronics container on the chassis tail
  g.add(K.box(2.5, 1.7, 2.3, M.corrugated, 0, 2.35, -4.7));
  g.add(K.box(2.68, 0.12, 2.48, P.hullTan, 0, 3.26, -4.7));
  boltRun(g, 9, new THREE.Vector3(-1.2, 3.24, -3.6), new THREE.Vector3(1.2, 3.24, -3.6), M.steel, { r: 0.02, axis: 'y' });
  g.add(K.box(1.0, 1.5, 0.07, M.panelGrey, -0.6, 2.3, -3.56));
  boltRect(g, 0.92, 1.42, 4, M.steel, { x: -0.6, y: 2.3, z: -3.6, r: 0.016 });
  g.add(K.chamferBox(0.84, 0.62, 0.42, M.panelGrey, 0.04).translateX(0.7).translateY(2.94).translateZ(-3.56));
  for (let i = 0; i < 6; i++) g.add(K.box(0.76, 0.03, 0.1, M.galvanised, 0.7, 2.74 + i * 0.07, -3.6));
  battery.statusLeds.push(statusPanel(g, 4, {
    spacing: 0.17, label: 'POD', position: [0.7, 2.4, -3.6], rotation: [0, Math.PI, 0],
  }));
  g.add(K.labelPlate(spec.name, 1.6, 0.28).translateY(1.94).translateZ(-3.57).rotateY(Math.PI));
  g.add(K.box(2.3, 0.22, 0.05, M.hazard, 0, 1.64, -3.57));

  const lad2 = ladderRun(2.2);
  lad2.position.set(1.48, 1.1, -4.7);
  lad2.rotation.y = Math.PI / 2;
  g.add(lad2);
  const tailDeck = walkway(1.5, 1.0);
  tailDeck.position.set(0, 1.44, -5.9);
  g.add(tailDeck);
  const tailRail = K.handrail(1.7, 0.95);
  tailRail.position.set(0, 1.47, -6.35);
  g.add(tailRail);

  const strip = K.box(0.09, 0.09, 9.6, accent, 1.6, 1.16, -0.4);
  g.add(strip);
  g.add(K.box(0.09, 0.09, 9.6, accent, -1.6, 1.16, -0.4));
  battery.selectionStrip = strip;

  addBeacons(battery, g, 0xffb029, [[-1.34, 3.34, -4.7], [1.34, 3.34, -4.7]]);

  g.add(buildPadSupport(battery, rng, { shelterAt: [-12.0, 5.0] }));
  battery.collision?.addBox(
    new THREE.Vector3(battery.group.position.x, 2.0, battery.group.position.z),
    new THREE.Vector3(4.2, 4.0, 12.4), 'launcher',
  );
  battery.launchOrigin = new THREE.Vector3(0, 3.4, 0);
}

function buildSentinel(battery, rng) {
  const M = mats();
  const P = LM();
  const spec = battery.spec;
  const g = battery.group;
  const accent = accentMat(spec.accent);

  // ---- concrete emplacement -------------------------------------------------
  const padZ = -1.5;
  const padW = 13.0;
  const padL = 16.0;
  g.add(K.box(padW, 0.85, padL, M.concrete, 0, 0.43, padZ));
  g.add(K.box(padW + 0.6, 0.26, padL + 0.6, M.concreteDark, 0, 0.13, padZ));
  g.add(K.box(padW + 0.12, 0.1, padL + 0.12, M.concreteDark, 0, 0.8, padZ));
  // rustication grooves and form-tie plugs break up the retaining walls
  for (let i = 0; i < 9; i++) {
    const z = padZ + (i / 8 - 0.5) * (padL - 1.2);
    for (const s of [-1, 1]) {
      g.add(K.box(0.1, 0.62, 0.12, M.concreteDark, s * (padW / 2 + 0.02), 0.48, z));
      for (const y of [0.32, 0.66]) {
        g.add(K.cyl(0.045, 0.045, 0.05, 6, M.concreteDark, s * (padW / 2 + 0.03), y, z + 0.42)
          .rotateZ(Math.PI / 2));
      }
    }
  }
  for (let i = 0; i < 7; i++) {
    const x = (i / 6 - 0.5) * (padW - 1.2);
    for (const s of [-1, 1]) {
      g.add(K.box(0.12, 0.62, 0.1, M.concreteDark, x, 0.48, padZ + s * (padL / 2 + 0.02)));
    }
  }
  // drainage scuppers along the downhill edge
  for (const x of [-3.6, 0, 3.6]) {
    g.add(K.box(0.4, 0.16, 0.1, P.cavity, x, 0.24, padZ + padL / 2 + 0.02));
    g.add(K.box(0.5, 0.06, 0.14, M.galvanised, x, 0.34, padZ + padL / 2 + 0.03));
  }
  // kerb rails, hazard paint applied as dashes rather than one long stripe
  for (const s of [-1, 1]) {
    g.add(K.box(0.42, 0.5, padL, M.concrete, s * 6.3, 1.1, padZ));
    for (let i = 0; i < 9; i++) {
      g.add(K.box(0.46, 0.1, 1.0, M.hazard, s * 6.3, 1.4, padZ + (i / 8 - 0.5) * (padL - 1.4)));
    }
  }
  // expansion joints across the slab
  for (let i = 0; i < 5; i++) {
    g.add(K.box(padW - 0.1, 0.02, 0.09, P.soot, 0, 0.87, padZ - 6.4 + i * 3.2));
  }

  // flame pit under the erector aft: kerb, dark throat, steel deflector, soot
  const pitZ = -4.0;
  const pitW = 5.4;
  const pitD = 4.6;
  g.add(K.box(pitW, 0.9, pitD, P.cavity, 0, 0.47, pitZ));
  const wedge = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.35, 4, 1), M.heatSteel);
  wedge.rotation.y = Math.PI / 4;
  wedge.position.set(0, 0.5, pitZ);
  g.add(wedge);
  const wedgeSoot = new THREE.Mesh(new THREE.ConeGeometry(2.12, 1.2, 4, 1), P.soot);
  wedgeSoot.rotation.y = Math.PI / 4;
  wedgeSoot.position.set(0, 0.52, pitZ);
  g.add(wedgeSoot);
  for (const s of [-1, 1]) {
    g.add(K.box(pitW + 0.9, 0.34, 0.44, M.concrete, 0, 1.02, pitZ + s * (pitD / 2 + 0.2)));
    g.add(K.box(0.44, 0.34, pitD + 0.9, M.concrete, s * (pitW / 2 + 0.22), 1.02, pitZ));
    g.add(K.box(pitW + 0.9, 0.06, 0.46, M.heatSteel, 0, 1.2, pitZ + s * (pitD / 2 + 0.2)));
    g.add(K.box(0.46, 0.06, pitD + 0.9, M.heatSteel, s * (pitW / 2 + 0.22), 1.2, pitZ));
    // grating over the pit shoulders
    for (let i = 0; i < 14; i++) {
      g.add(K.box(0.06, 0.09, 0.62, M.galvanised, (i / 13 - 0.5) * (pitW - 0.4), 1.0, pitZ + s * (pitD / 2 - 0.42)));
    }
  }
  g.add(K.box(9.2, 0.02, 8.4, P.soot, 0, 0.88, pitZ));

  // ---- heavy launch gantry over the pit ------------------------------------
  const deckY = 3.1;
  const legX = 2.95;
  const legZ = [1.0, -6.6];
  for (const lx of [-legX, legX]) {
    for (const lz of legZ) {
      g.add(K.box(0.72, deckY - 0.85, 0.72, P.hullSlate, lx, 0.85 + (deckY - 0.85) / 2, lz));
      g.add(K.box(0.86, 0.14, 0.86, M.darkMetal, lx, 0.94, lz));
      g.add(K.box(1.1, 0.1, 1.1, M.darkMetal, lx, 0.9, lz));
      boltCircle(g, 12, 0.44, M.steel, { x: lx, y: 0.98, z: lz, r: 0.028, axis: 'y' });
      g.add(K.box(0.86, 0.12, 0.86, M.darkMetal, lx, deckY - 0.12, lz));
      for (const s of [-1, 1]) {
        g.add(K.box(0.16, 0.5, 0.16, M.galvanised, lx + s * 0.44, 1.4, lz));
      }
    }
    // X braces along the sides
    for (let i = 0; i < 2; i++) {
      const br = K.box(0.16, 0.16, 8.0, M.galvanised, lx, 2.0, (legZ[0] + legZ[1]) / 2);
      br.rotation.x = i ? 0.3 : -0.3;
      g.add(br);
    }
    g.add(K.box(0.2, 0.24, 7.6, M.darkMetal, lx, 2.86, (legZ[0] + legZ[1]) / 2));
  }
  for (const lz of legZ) {
    for (let i = 0; i < 2; i++) {
      const br = K.box(6.0, 0.16, 0.16, M.galvanised, 0, 2.0, lz);
      br.rotation.z = i ? 0.35 : -0.35;
      g.add(br);
    }
    g.add(K.box(6.1, 0.24, 0.2, M.darkMetal, 0, 2.86, lz));
  }
  // gantry deck, built as four slabs around the exhaust throat
  const deckZ = -2.8;
  const cutZ = [-6.1, -1.0];
  const cutX = 2.25;
  g.add(K.box(6.9, 0.24, 2.6, P.hullSlate, 0, deckY - 0.12, 0.3));
  g.add(K.box(6.9, 0.24, 1.3, P.hullSlate, 0, deckY - 0.12, -6.75));
  for (const s of [-1, 1]) {
    g.add(K.box(1.2, 0.24, 5.1, P.hullSlate, s * 2.85, deckY - 0.12, -3.55));
    g.add(K.box(1.3, 0.1, 5.2, M.darkMetal, s * 2.85, deckY - 0.26, -3.55));
    g.add(K.box(0.36, 0.2, 5.2, M.heatSteel, s * cutX, deckY - 0.02, -3.55));
  }
  g.add(K.box(7.1, 0.1, 2.7, M.darkMetal, 0, deckY - 0.26, 0.3));
  g.add(K.box(7.1, 0.1, 1.4, M.darkMetal, 0, deckY - 0.26, -6.75));
  for (const z of cutZ) g.add(K.box(5.0, 0.2, 0.36, M.heatSteel, 0, deckY - 0.02, z));
  boltRun(g, 12, new THREE.Vector3(-3.3, deckY + 0.02, -6.9), new THREE.Vector3(-3.3, deckY + 0.02, 1.3), M.steel,
    { r: 0.024, axis: 'y' });
  boltRun(g, 12, new THREE.Vector3(3.3, deckY + 0.02, -6.9), new THREE.Vector3(3.3, deckY + 0.02, 1.3), M.steel,
    { r: 0.024, axis: 'y' });
  // walkway and handrail around the deck edge
  for (const s of [-1, 1]) {
    const wkSide = walkway(0.9, 8.2);
    wkSide.position.set(s * 3.85, deckY + 0.02, deckZ);
    g.add(wkSide);
    const railSide = K.handrail(8.2, 1.05);
    railSide.rotation.y = Math.PI / 2;
    railSide.position.set(s * 4.28, deckY + 0.05, deckZ);
    g.add(railSide);
    for (let i = 0; i < 4; i++) {
      g.add(K.box(0.9, 0.12, 0.16, M.galvanised, s * 3.85, deckY - 0.1, -6.0 + i * 2.2));
    }
  }
  const wkRear = walkway(7.6, 0.9);
  wkRear.position.set(0, deckY + 0.02, -7.3);
  g.add(wkRear);
  const railRear = K.handrail(7.6, 1.05);
  railRear.position.set(0, deckY + 0.05, -7.72);
  g.add(railRear);
  const gLad = ladderRun(deckY - 0.8);
  gLad.position.set(3.9, 0.85, -7.2);
  gLad.rotation.y = -Math.PI / 2;
  g.add(gLad);
  // hydraulic power pack and cable trays slung under the deck
  g.add(K.chamferBox(2.0, 1.1, 1.4, M.panelGrey, 0.04).translateX(-1.6).translateY(2.0).translateZ(0.2));
  g.add(K.box(2.1, 0.1, 1.5, M.darkMetal, -1.6, 2.58, 0.2));
  g.add(K.cyl(0.3, 0.3, 1.2, 12, M.galvanised, 0.9, 2.05, 0.3).rotateZ(Math.PI / 2));
  g.add(K.conduit([
    new THREE.Vector3(-2.6, 1.0, 1.2),
    new THREE.Vector3(-2.6, 2.1, 0.4),
    new THREE.Vector3(-1.0, 2.6, -1.0),
  ], 0.08, M.galvanised));
  for (const s of [-1, 1]) {
    g.add(K.cable(new THREE.Vector3(s * 2.6, 2.7, -0.4), new THREE.Vector3(s * 1.4, 2.9, -2.2),
      { sag: 0.3, radius: 0.05, material: M.rubber }));
  }

  // ---- turntable ------------------------------------------------------------
  const turntable = new THREE.Group();
  turntable.position.set(0, deckY, -2.5);
  g.add(turntable);
  battery.turntable = markDynamic(turntable);

  turntable.add(K.cyl(1.95, 2.3, 0.55, 30, P.hullSlate, 0, 0.27, 0));
  turntable.add(K.cyl(2.08, 2.08, 0.14, 30, M.darkMetal, 0, 0.5, 0));
  boltCircle(turntable, 36, 1.92, M.steel, { y: 0.58, r: 0.03, axis: 'y' });
  turntable.add(K.cyl(1.42, 1.42, 0.16, 20, M.galvanised, 0, 0.63, 0));
  turntable.add(K.chamferBox(1.06, 0.62, 0.74, M.darkMetal, 0.04).translateY(0.92).translateZ(-1.55));
  for (const s of [-1, 1]) {
    turntable.add(K.chamferBox(0.46, 1.55, 1.05, M.darkMetal, 0.04).translateX(s * 1.72).translateY(1.12));
    boltCircle(turntable, 12, 0.32, M.steel, { x: s * 1.96, y: 1.16, z: 0, r: 0.026, axis: 'x' });
    turntable.add(K.cyl(0.23, 0.23, 0.52, 12, M.steel, s * 1.74, 1.52, 0).rotateZ(Math.PI / 2));
    turntable.add(K.box(0.38, 0.52, 1.7, M.darkMetal, s * 1.72, 0.58, 0.75));
    boltRun(turntable, 6, new THREE.Vector3(s * 1.94, 0.58, 0.05), new THREE.Vector3(s * 1.94, 0.58, 1.5),
      M.steel, { r: 0.022, axis: 'x' });
    // stowed locking struts
    const strut = K.cyl(0.1, 0.1, 2.3, 8, M.galvanised, s * 1.95, 1.25, 1.8);
    strut.rotation.x = 0.7;
    turntable.add(strut);
    turntable.add(K.cable(new THREE.Vector3(s * 0.55, 0.88, -1.45), new THREE.Vector3(s * 1.95, 0.42, 0.95),
      { sag: 0.3, radius: 0.045, material: M.rubber }));
  }
  // blast shield across the rear of the turntable
  const shield = K.box(4.0, 2.0, 0.2, M.heatSteel, 0, 1.35, -2.15);
  shield.rotation.x = 0.5;
  turntable.add(shield);
  const shieldSoot = K.box(3.7, 1.7, 0.05, P.soot, 0, 1.4, -2.02);
  shieldSoot.rotation.x = 0.5;
  turntable.add(shieldSoot);
  for (const s of [-1.5, -0.5, 0.5, 1.5]) {
    const rib = K.box(0.16, 1.95, 0.2, M.darkMetal, s * 1.15, 1.35, -2.24);
    rib.rotation.x = 0.5;
    turntable.add(rib);
  }

  // ---- erector --------------------------------------------------------------
  const erector = new THREE.Group();
  erector.position.set(0, 1.5, 0);
  turntable.add(erector);
  battery.erector = markDynamic(erector);

  const canLen = 11.4;
  const r = 0.8;
  const beamZ = 4.6;
  const canX = 1.36;
  // Narrow box-girder spine: the canisters have to overhang it on both sides,
  // otherwise a near-vertical erector hides them behind its own underside.
  const spineZ = beamZ - 1.5;
  const spineLen = canLen - 1.4;
  erector.add(K.box(1.5, 0.95, spineLen, P.hullSlate, 0, -0.85, spineZ));
  erector.add(K.box(1.62, 0.14, spineLen - 0.2, M.darkMetal, 0, -0.34, spineZ));

  // Underside of the beam. Once the erector is near vertical this is the face
  // the whole site looks at, so it gets the plumbing treatment rather than
  // being left as one flat plate.
  const uy = -1.36;
  erector.add(K.box(1.66, 0.12, spineLen - 0.2, P.hullSlate, 0, uy, spineZ));
  for (const s of [-1, 1]) {
    erector.add(K.box(0.14, 0.16, spineLen - 0.3, M.galvanised, s * 0.66, uy - 0.11, spineZ));
    boltRun(erector, 18, new THREE.Vector3(s * 0.78, uy - 0.02, spineZ - spineLen / 2 + 0.4),
      new THREE.Vector3(s * 0.78, uy - 0.02, spineZ + spineLen / 2 - 0.4), M.steel, { r: 0.02, axis: 'x' });
  }
  for (let i = 0; i < 9; i++) {
    const z = spineZ + (i / 8 - 0.5) * (spineLen - 0.8);
    erector.add(K.box(1.74, 0.14, 0.14, M.galvanised, 0, uy - 0.08, z));
    erector.add(K.box(1.78, 0.05, 0.05, M.darkMetal, 0, uy - 0.16, z));
  }
  // cable trunk and hydraulic pair running the length of the underside
  erector.add(K.box(0.3, 0.22, spineLen - 1.0, M.darkMetal, 0.36, uy - 0.18, spineZ));
  erector.add(K.box(0.34, 0.05, spineLen - 1.2, M.galvanised, 0.36, uy - 0.3, spineZ));
  for (const o of [-0.34, -0.5]) {
    erector.add(K.cyl(0.055, 0.055, spineLen - 1.4, 6, M.hydraulic, o, uy - 0.18, spineZ)
      .rotateX(Math.PI / 2));
  }
  for (let i = 0; i < 4; i++) {
    const z = spineZ + (i / 3 - 0.5) * (spineLen - 2.4);
    erector.add(K.box(0.62, 0.05, 0.62, M.panelGrey, -0.1, uy - 0.09, z));
    boltRect(erector, 0.54, 0.54, 3, M.steel, { x: -0.1, y: uy - 0.12, z, r: 0.015 });
  }
  erector.add(K.box(1.5, 0.05, 0.5, M.hazard, 0, uy - 0.09, spineZ + spineLen / 2 - 0.5));
  // aft third is scorched by the exhaust wash coming off the canister bases
  erector.add(K.box(1.6, 0.06, 2.6, M.heatSteel, 0, uy - 0.08, spineZ - spineLen / 2 + 1.3));
  erector.add(K.box(1.4, 0.03, 2.2, P.soot, 0, uy - 0.13, spineZ - spineLen / 2 + 1.3));

  for (const s of [-1, 1]) {
    erector.add(K.box(0.12, 0.2, spineLen - 0.3, M.galvanised, s * 0.79, -0.42, spineZ));
    boltRun(erector, 16, new THREE.Vector3(s * 0.78, -0.85, spineZ - spineLen / 2 + 0.4),
      new THREE.Vector3(s * 0.78, -0.85, spineZ + spineLen / 2 - 0.4), M.steel, { r: 0.024, axis: 'x' });
    // open truss shoulders carrying the canister cradles
    for (let i = 0; i < 7; i++) {
      const z = spineZ - spineLen / 2 + 0.5 + i * ((spineLen - 1.0) / 6);
      const d = K.cyl(0.085, 0.085, 1.5, 6, M.galvanised, s * 1.0, -0.2, z);
      d.rotation.set(i % 2 ? 0.8 : -0.8, 0, s * 0.5);
      erector.add(d);
    }
    erector.add(K.box(0.14, 0.14, spineLen - 0.4, M.galvanised, s * 1.16, 0.36, spineZ));
    erector.add(K.box(0.09, 0.09, spineLen - 0.6, accent, s * 0.86, -0.28, spineZ));
  }
  // trunnion yoke and rear closure
  erector.add(K.box(2.9, 0.5, 1.1, M.darkMetal, 0, -0.6, 0));
  erector.add(K.box(1.7, 1.6, 0.34, P.hullSlate, 0, -0.5, spineZ - spineLen / 2 - 0.2));
  boltRect(erector, 1.44, 1.3, 5, M.steel, { y: -0.5, z: spineZ - spineLen / 2 - 0.38, r: 0.022 });
  erector.add(K.box(1.9, 0.28, 0.06, M.hazard, 0, 0.44, spineZ - spineLen / 2 - 0.24));

  // two very large canisters, overhanging the spine to left and right
  for (let i = 0; i < 2; i++) {
    const x = (i - 0.5) * canX * 2;
    const can = buildRoundCanister(canLen, r, i, spec.accent);
    can.position.set(x, 0.42, beamZ);
    erector.add(can);
    for (const z of [beamZ - canLen * 0.36, beamZ - canLen * 0.02, beamZ + canLen * 0.32]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.14, 0.1, 6, 20), M.darkMetal);
      ring.position.set(x, 0.42, z);
      erector.add(ring);
      // cradle saddle down to the spine
      erector.add(K.box(0.4, 0.8, 0.34, M.darkMetal, x * 0.62, -0.28, z));
      erector.add(K.box(0.34, 0.2, 0.34, M.steel, x, 1.3, z));
      erector.add(K.cyl(0.065, 0.065, 0.46, 6, M.hydraulic, x, 1.56, z));
      boltRun(erector, 4, new THREE.Vector3(x - 0.15, 1.3, z - 0.17), new THREE.Vector3(x + 0.15, 1.3, z - 0.17),
        M.steel, { r: 0.018, axis: 'y' });
    }
    const muzzle = new THREE.Object3D();
    muzzle.position.set(x, 0.42, beamZ + canLen / 2 + 0.22);
    erector.add(muzzle);
    battery.tubes.push({ index: i, loaded: true, cover: can.userData.cover, muzzle, canister: can });
  }

  // umbilical trunk running up the channel between the two canisters
  const umbilical = new THREE.Group();
  umbilical.position.set(0, 1.05, beamZ - 2.0);
  erector.add(umbilical);
  umbilical.add(K.box(0.34, 0.34, 8.0, M.darkMetal, 0, 0, 3.6));
  umbilical.add(K.box(0.4, 0.06, 7.8, M.galvanised, 0, 0.2, 3.6));
  for (let i = 0; i < 5; i++) {
    const z = 0.5 + i * 1.7;
    for (const s of [-1, 1]) {
      umbilical.add(K.box(0.5, 0.13, 0.15, M.galvanised, s * 0.32, 0.14, z));
      umbilical.add(K.cable(new THREE.Vector3(s * 0.1, 0.1, z), new THREE.Vector3(s * 0.62, -0.4, z + 0.35),
        { sag: 0.1, radius: 0.032, material: M.rubber }));
    }
  }
  umbilical.add(K.conduit([
    new THREE.Vector3(0.16, -0.2, -0.6),
    new THREE.Vector3(0.2, 0.0, 3.6),
    new THREE.Vector3(0.16, 0.0, 7.3),
  ], 0.06, M.galvanised));

  // service walkway outboard of the port canister
  const wk = walkway(0.72, canLen * 0.66, M.galvanised);
  wk.position.set(-2.86, -0.2, beamZ);
  erector.add(wk);
  const rail = K.handrail(canLen * 0.66, 1.0);
  rail.rotation.y = Math.PI / 2;
  rail.position.set(-3.18, -0.17, beamZ);
  erector.add(rail);
  for (const z of [beamZ - canLen * 0.3, beamZ, beamZ + canLen * 0.3]) {
    erector.add(K.box(1.9, 0.13, 0.18, M.galvanised, -1.95, -0.3, z));
    erector.add(K.cyl(0.055, 0.055, 1.1, 6, M.galvanised, -2.62, -0.66, z).rotateZ(0.7));
  }
  const beamLad = ladderRun(2.6, 0.4);
  beamLad.rotation.x = Math.PI / 2;
  beamLad.position.set(-2.86, -0.16, beamZ - canLen * 0.4);
  erector.add(beamLad);

  // very heavy erection rams
  battery.rams = [];
  for (const s of [-1, 1]) {
    const rm = ram(4.5, 0.17);
    rm.position.set(s * 2.0, 0.0, 2.6);
    rm.rotation.x = -0.8;
    markDynamic(rm);
    turntable.add(rm);
    battery.rams.push(rm);
    turntable.add(K.cable(new THREE.Vector3(s * 2.02, 0.32, 2.4), new THREE.Vector3(s * 0.62, 0.9, -1.3),
      { sag: 0.3, radius: 0.045, material: M.rubber }));
    turntable.add(K.cable(new THREE.Vector3(s * 1.92, 0.16, 2.72), new THREE.Vector3(s * 0.52, 0.82, -1.2),
      { sag: 0.38, radius: 0.034, material: M.rubber }));
  }

  // ---- range control container beside the gantry ---------------------------
  const cx = 4.95;
  const cz = -8.3;
  g.add(K.box(2.8, 2.2, 3.0, M.corrugated, cx, 1.95, cz));
  g.add(K.box(3.0, 0.14, 3.2, P.hullSlate, cx, 3.12, cz));
  g.add(K.box(1.1, 1.8, 0.07, M.panelGrey, cx - 0.72, 1.9, cz + 1.54));
  boltRect(g, 1.02, 1.7, 4, M.steel, { x: cx - 0.72, y: 1.9, z: cz + 1.58, r: 0.018 });
  g.add(K.chamferBox(1.0, 0.72, 0.46, M.panelGrey, 0.04).translateX(cx + 0.68).translateY(2.6)
    .translateZ(cz + 1.54));
  for (let i = 0; i < 7; i++) g.add(K.box(0.9, 0.035, 0.11, M.galvanised, cx + 0.68, 2.36 + i * 0.07, cz + 1.58));
  battery.statusLeds = [statusPanel(g, 6, {
    spacing: 0.19, label: 'RANGE SAFETY', position: [cx + 0.68, 2.0, cz + 1.58],
  })];
  g.add(K.labelPlate('SENTINEL LR-1', 1.9, 0.32).translateX(cx).translateY(1.44).translateZ(cz + 1.55));
  g.add(K.labelPlate('TEST ARTICLE - RANGE USE ONLY', 2.3, 0.2, '#ffd88a').translateX(cx).translateY(1.12)
    .translateZ(cz + 1.55));
  g.add(K.box(2.6, 0.24, 0.05, M.hazard, cx, 0.84, cz + 1.55));
  const cLad = ladderRun(2.4);
  cLad.position.set(cx - 1.5, 0.85, cz);
  cLad.rotation.y = -Math.PI / 2;
  g.add(cLad);
  g.add(K.cable(new THREE.Vector3(cx - 1.4, 2.4, cz + 0.6), new THREE.Vector3(3.6, 2.9, -6.4),
    { sag: 0.4, radius: 0.05, material: M.rubber }));

  const strip = K.box(0.11, 0.11, 15.4, accent, 6.3, 1.52, padZ);
  g.add(strip);
  g.add(K.box(0.11, 0.11, 15.4, accent, -6.3, 1.52, padZ));
  battery.selectionStrip = strip;

  addBeacons(battery, g, 0xff3a2a, [[-3.32, deckY + 0.14, -6.9], [3.32, deckY + 0.14, -6.9]]);
  for (const lx of [-legX, legX]) {
    g.add(K.box(0.74, 0.9, 0.06, M.hazard, lx, 1.5, legZ[0] + 0.4));
  }

  // heavy barrier ring: this is the noisy end of the site
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = K.jerseyBarrier(3);
    b.position.set(Math.cos(a) * 14, 0, Math.sin(a) * 14);
    b.rotation.y = -a;
    g.add(b);
    battery.collision?.addBox(
      new THREE.Vector3(battery.group.position.x + Math.cos(a) * 14, 0.5, battery.group.position.z + Math.sin(a) * 14),
      new THREE.Vector3(2.4, 1.0, 2.4), 'barrier',
    );
  }

  g.add(buildPadSupport(battery, rng, {
    crewShelter: true, shelterAt: [-13.0, 6.0], scorchY: 0.9, kerbs: false, rackZ: -13.0,
  }));
  battery.collision?.addBox(
    new THREE.Vector3(battery.group.position.x, 2.6, battery.group.position.z),
    new THREE.Vector3(7.4, 5.2, 15.0), 'launcher',
  );
  battery.launchOrigin = new THREE.Vector3(0, 4.2, 0);
}

export function createBattery(type, position, heading, rng, collision) {
  const spec = BATTERY_SPECS[type];
  const b = new Battery(spec, position, heading, rng, collision);
  if (type === 'patriot') buildPatriot(b, rng);
  else if (type === 'thaad') buildThaad(b, rng);
  else buildSentinel(b, rng);
  b.group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  b.mergeStats = mergeStatic(b.group, { tag: `bat-${type}` });
  return b;
}
