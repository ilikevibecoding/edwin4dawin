// Three fictional interceptor batteries. Each has a distinct silhouette,
// animated launcher hardware (azimuth turntable, elevating erector, hydraulic
// rams, canister covers), status lighting and its own launch signature.
//
// All performance figures are invented for gameplay balance and do not
// represent any real system.
import * as THREE from 'three';
import { mats } from './core/materials.js';
import * as T from './core/textures.js';
import * as K from './core/kit.js';

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
    elevationRange: [1.05, 1.42],   // ~60 to 81 degrees
    azimuthRange: 2.4,
    stowElevation: 1.12,
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
// Shared launcher sub-assemblies
// ---------------------------------------------------------------------------

/** Trailer / transporter chassis with outriggers, wheels and drawbar. */
function buildChassis(len, wid, { axles = 2, wheelR = 0.6, drawbar = true } = {}) {
  const M = mats();
  const g = new THREE.Group();
  g.add(K.box(wid, 0.4, len, M.darkMetal, 0, 0, 0));
  for (const s of [-1, 1]) g.add(K.box(0.24, 0.55, len - 0.4, M.galvanised, s * (wid / 2 - 0.18), 0.08, 0));
  // cross members
  const n = Math.floor(len / 1.2);
  for (let i = 0; i < n; i++) {
    g.add(K.box(wid - 0.5, 0.18, 0.16, M.darkMetal, 0, -0.12, (i / (n - 1) - 0.5) * (len - 1.0)));
  }
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.44, 16);
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.46, 10);
  for (let a = 0; a < axles; a++) {
    const z = (a / Math.max(1, axles - 1) - 0.5) * (len * 0.5);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, M.rubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(s * (wid / 2 + 0.02), -0.2 - wheelR + 0.4, z);
      w.castShadow = true;
      g.add(w);
      const h = new THREE.Mesh(hubGeo, M.steel);
      h.rotation.z = Math.PI / 2;
      h.position.set(s * (wid / 2 + 0.06), w.position.y, z);
      g.add(h);
    }
  }
  // outriggers (deployed)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const arm = K.box(1.0, 0.18, 0.28, M.galvanised, sx * (wid / 2 + 0.45), -0.05, sz * (len / 2 - 0.7));
    g.add(arm);
    const jack = K.cyl(0.08, 0.08, 0.9, 8, M.hydraulic, sx * (wid / 2 + 0.9), -0.5, sz * (len / 2 - 0.7));
    g.add(jack);
    const foot = K.box(0.55, 0.1, 0.55, M.darkMetal, sx * (wid / 2 + 0.9), -0.95, sz * (len / 2 - 0.7));
    g.add(foot);
    const pad = K.box(0.75, 0.06, 0.75, M.concreteDark, sx * (wid / 2 + 0.9), -1.0, sz * (len / 2 - 0.7));
    g.add(pad);
  }
  if (drawbar) {
    const bar = K.box(0.24, 0.24, 2.2, M.darkMetal, 0, -0.1, len / 2 + 1.0);
    g.add(bar);
    g.add(K.cyl(0.16, 0.16, 0.2, 10, M.steel, 0, -0.1, len / 2 + 2.1));
    const stand = K.cyl(0.07, 0.07, 0.9, 8, M.galvanised, 0, -0.55, len / 2 + 1.6);
    g.add(stand);
  }
  return g;
}

/**
 * Rectangular launch canister with a frangible front cover, lifting lugs,
 * stencils and heat-stained aft venting - the Patriot-style silhouette.
 */
function buildRectCanister(len, size, index, accentColor) {
  const M = mats();
  const g = new THREE.Group();
  const body = K.box(size, size, len, M.panelOlive, 0, 0, 0);
  g.add(body);
  // reinforcement bands
  for (let i = 0; i < 5; i++) {
    const z = (i / 4 - 0.5) * (len - 0.5);
    g.add(K.box(size + 0.05, size + 0.05, 0.1, M.darkMetal, 0, 0, z));
  }
  // lifting lugs
  for (const s of [-1, 1]) {
    const lug = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 5, 10), M.steel);
    lug.rotation.y = Math.PI / 2;
    lug.position.set(0, size / 2 + 0.05, s * len * 0.3);
    g.add(lug);
  }
  // frangible front cover, slightly domed
  const cover = new THREE.Mesh(new THREE.SphereGeometry(size * 0.72, 12, 8, 0, Math.PI * 2, 0, 0.42), M.panelWhite);
  cover.rotation.x = -Math.PI / 2;
  cover.position.z = len / 2 + 0.02;
  cover.scale.set(1, 1, 0.5);
  g.add(cover);
  const coverRing = K.box(size + 0.06, size + 0.06, 0.08, M.darkMetal, 0, 0, len / 2 - 0.02);
  g.add(coverRing);
  // aft closure with heat staining
  const aft = K.box(size + 0.02, size + 0.02, 0.22, M.heatSteel, 0, 0, -len / 2 - 0.05);
  g.add(aft);
  // stencils
  const dec = new THREE.Mesh(
    new THREE.PlaneGeometry(len * 0.5, size * 0.4),
    new THREE.MeshStandardMaterial({
      map: T.stencil(`MIM-PT ${index + 1}`, { w: 512, h: 128, color: '#d8d5c4' }),
      transparent: true, roughness: 0.85,
    }),
  );
  dec.position.set(size / 2 + 0.005, 0, 0);
  dec.rotation.y = Math.PI / 2;
  g.add(dec);
  const haz = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 0.9, 0.16),
    new THREE.MeshStandardMaterial({ map: T.hazardStripes(256, 32), roughness: 0.85 }),
  );
  haz.position.set(0, size / 2 + 0.005, -len * 0.3);
  haz.rotation.x = -Math.PI / 2;
  g.add(haz);
  // accent status strip
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, len * 0.7),
    new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.3, roughness: 0.4 }),
  );
  strip.position.set(-size / 2 - 0.02, size * 0.25, 0);
  g.add(strip);
  g.userData.cover = cover;
  g.userData.strip = strip;
  return g;
}

/** Round launch tube for the high-altitude and long-range launchers. */
function buildRoundCanister(len, radius, index, accentColor, tint = null) {
  const M = mats();
  const g = new THREE.Group();
  const body = K.cyl(radius, radius, len, 20, tint || M.panelSand);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  for (let i = 0; i < 6; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.015, 0.028, 6, 20), M.darkMetal);
    band.position.z = (i / 5 - 0.5) * (len - 0.6);
    g.add(band);
  }
  const cover = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 10, 0, Math.PI * 2, 0, 0.5), M.panelWhite);
  cover.rotation.x = -Math.PI / 2;
  cover.scale.set(1, 1, 0.55);
  cover.position.z = len / 2 + 0.01;
  g.add(cover);
  const aft = K.cyl(radius * 1.02, radius * 1.02, 0.28, 20, M.heatSteel);
  aft.rotation.x = Math.PI / 2;
  aft.position.z = -len / 2 - 0.1;
  g.add(aft);
  g.add(K.boltRing(radius * 0.86, 16, M.steel).translateZ(len / 2 - 0.05));
  const dec = new THREE.Mesh(
    new THREE.PlaneGeometry(len * 0.42, radius * 0.9),
    new THREE.MeshStandardMaterial({
      map: T.stencil(`RD-${index + 1}`, { w: 512, h: 160, color: '#cfd4cc' }),
      transparent: true, roughness: 0.85,
    }),
  );
  dec.position.set(radius + 0.004, 0, len * 0.1);
  dec.rotation.y = Math.PI / 2;
  g.add(dec);
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, len * 0.6),
    new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.3, roughness: 0.4 }),
  );
  strip.position.set(0, radius + 0.02, 0);
  g.add(strip);
  g.userData.cover = cover;
  g.userData.strip = strip;
  return g;
}

/** Small crew cabin used on the launcher vehicles. */
function buildCab(w, h, d, paint) {
  const M = mats();
  const g = new THREE.Group();
  const body = K.chamferBox(w, h, d, paint, 0.04);
  g.add(body);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, h * 0.5), M.darkGlass);
  glass.position.set(0, h * 0.18, d / 2 + 0.01);
  glass.rotation.x = -0.14;
  g.add(glass);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.42, h * 0.36), M.darkGlass);
    side.position.set(s * (w / 2 + 0.01), h * 0.16, d * 0.12);
    side.rotation.y = s * Math.PI / 2;
    g.add(side);
  }
  g.add(K.box(w + 0.1, 0.22, 0.22, M.darkMetal, 0, -h / 2 + 0.1, d / 2 + 0.12));
  const grille = K.box(w * 0.7, h * 0.3, 0.08, M.blackMetal, 0, -h * 0.1, d / 2 + 0.06);
  g.add(grille);
  for (const s of [-1, 1]) {
    const lamp = K.cyl(0.14, 0.14, 0.09, 12, M.lampGlassOff, s * w * 0.36, -h * 0.05, d / 2 + 0.08);
    lamp.rotation.x = Math.PI / 2;
    g.add(lamp);
  }
  return g;
}

/** Pad furniture shared by every battery site. */
function buildPadSupport(battery, rng, { crewShelter = true } = {}) {
  const M = mats();
  const g = new THREE.Group();

  const gen = K.generator(rng, { scale: 1.0 });
  gen.position.set(-8.5, 0, 6.0);
  gen.rotation.y = 0.7;
  g.add(gen);
  battery.padGenerator = gen;

  // power + data umbilicals from the generator to the launcher
  g.add(K.cable(new THREE.Vector3(-7.4, 0.7, 5.4), new THREE.Vector3(-1.6, 0.5, 1.4), { sag: 0.55, radius: 0.05 }));
  g.add(K.cable(new THREE.Vector3(-7.4, 0.55, 5.8), new THREE.Vector3(-1.6, 0.42, 2.0), { sag: 0.6, radius: 0.038 }));
  g.add(K.cableCoil(0.6, 4).translateX(-6.0).translateZ(3.4));

  if (crewShelter) {
    const shelter = new THREE.Group();
    shelter.position.set(9.0, 0, 6.4);
    shelter.rotation.y = -0.5;
    shelter.add(K.box(3.4, 2.5, 2.6, M.corrugated, 0, 1.25, 0));
    shelter.add(K.box(3.8, 0.16, 3.0, M.panelOlive, 0, 2.6, 0));
    const door = K.box(0.9, 1.9, 0.08, M.panelGrey, 0.9, 0.95, 1.32);
    shelter.add(door);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), M.darkGlass);
    win.position.set(-0.7, 1.5, 1.32);
    shelter.add(win);
    const ac = K.box(0.7, 0.5, 0.4, M.panelGrey, -1.1, 1.7, -1.35);
    shelter.add(ac);
    shelter.add(K.labelPlate(battery.spec.name, 1.2, 0.24).translateY(2.15).translateZ(1.35));
    g.add(shelter);
    battery.collision?.addBox(
      new THREE.Vector3(battery.group.position.x + 9.0, 1.25, battery.group.position.z + 6.4),
      new THREE.Vector3(4.2, 2.5, 3.6), 'shelter',
    );
  }

  // spare canister rack
  const rack = new THREE.Group();
  rack.position.set(0, 0, -9.5);
  for (const s of [-1, 1]) {
    rack.add(K.box(0.3, 1.1, 5.4, M.galvanised, s * 1.3, 0.55, 0));
    rack.add(K.box(2.9, 0.2, 0.3, M.galvanised, 0, 1.05, s * 2.4));
  }
  const spareCount = battery.spec.id === 'sentinel' ? 1 : 2;
  for (let i = 0; i < spareCount; i++) {
    let spare;
    if (battery.spec.id === 'patriot') {
      spare = buildRectCanister(5.2, 0.62, i, battery.spec.accent);
      spare.position.set((i - (spareCount - 1) / 2) * 0.85, 1.35, 0);
    } else {
      const r = battery.spec.id === 'sentinel' ? 0.68 : 0.42;
      spare = buildRoundCanister(battery.spec.id === 'sentinel' ? 9.5 : 6.6, r, i, battery.spec.accent);
      spare.position.set((i - (spareCount - 1) / 2) * (r * 2.4), 1.3 + r, 0);
    }
    rack.add(spare);
  }
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
    p.position.set(rng.range(5, 12), 0, rng.range(-8, 2));
    p.rotation.y = rng.range(0, 6.28);
    g.add(p);
  }
  // pad floodlight
  const mast = K.floodlightMast(6.4);
  mast.position.set(12.5, 0, -6.5);
  mast.rotation.y = 2.4;
  g.add(mast);
  battery.padFloodlight = mast;

  // ground scorch under the launcher
  const scorch = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), mats().scorch);
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.set(0, 0.06, -1.5);
  scorch.material = mats().scorch.clone();
  scorch.material.opacity = 0.55;
  g.add(scorch);
  battery.scorchDecal = scorch;

  return g;
}

// ---------------------------------------------------------------------------
// Battery builders
// ---------------------------------------------------------------------------

function buildPatriot(battery, rng) {
  const M = mats();
  const spec = battery.spec;
  const g = battery.group;

  const chassis = buildChassis(7.6, 2.5, { axles: 2, wheelR: 0.6 });
  chassis.position.y = 1.02;
  g.add(chassis);

  // azimuth turntable on the trailer deck
  const turntable = new THREE.Group();
  turntable.position.set(0, 1.32, -0.4);
  g.add(turntable);
  turntable.add(K.cyl(1.0, 1.15, 0.34, 20, M.panelGrey, 0, 0.17, 0));
  turntable.add(K.boltRing(1.02, 20, M.steel).translateY(0.02).rotateX(-Math.PI / 2));
  battery.turntable = turntable;

  // erector frame
  const erector = new THREE.Group();
  erector.position.set(0, 0.4, 0);
  turntable.add(erector);
  battery.erector = erector;

  // trunnion + frame rails
  for (const s of [-1, 1]) {
    erector.add(K.box(0.16, 0.5, 5.6, M.galvanised, s * 1.05, 0.0, 2.4));
  }
  erector.add(K.box(2.3, 0.22, 0.4, M.galvanised, 0, 0, 0.2));
  erector.add(K.box(2.3, 0.22, 0.4, M.galvanised, 0, 0, 4.6));
  // blast deflector at the base of the frame
  const deflector = K.box(2.6, 1.5, 0.14, M.heatSteel, 0, 0.5, -0.6);
  deflector.rotation.x = 0.42;
  erector.add(deflector);

  // 2x2 canister block
  const canisterLen = 5.3;
  const size = 0.62;
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const can = buildRectCanister(canisterLen, size, i, spec.accent);
    can.position.set((col - 0.5) * (size + 0.1), 0.42 + row * (size + 0.1), 2.55);
    erector.add(can);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(can.position.x, can.position.y, can.position.z + canisterLen / 2);
    erector.add(muzzle);
    battery.tubes.push({ index: i, loaded: true, cover: can.userData.cover, muzzle, canister: can });
  }
  // separator rails between the canisters read the block as four tubes
  for (const [dx, dy, w, h] of [[0, 0.42, 0.05, 1.5], [0, 0.42 + (size + 0.1) / 2, 1.5, 0.05]]) {
    erector.add(K.box(w, h, canisterLen * 0.98, M.blackMetal, dx, dy, 2.55));
  }
  // strap-down clamps over the canister block
  for (const z of [1.2, 3.9]) {
    erector.add(K.box(1.6, 0.12, 0.2, M.darkMetal, 0, 1.28, z));
    for (const s of [-1, 1]) erector.add(K.box(0.12, 1.3, 0.2, M.darkMetal, s * 0.78, 0.64, z));
  }

  // elevation rams
  battery.rams = [];
  for (const s of [-1, 1]) {
    const ram = K.hydraulicRam(2.0);
    ram.position.set(s * 1.25, 0.1, 0.7);
    ram.rotation.x = -0.55;
    turntable.add(ram);
    battery.rams.push(ram);
  }
  // hydraulic lines
  turntable.add(K.cable(new THREE.Vector3(-1.25, 0.1, 0.6), new THREE.Vector3(-0.6, -0.1, -0.8), { sag: 0.12, radius: 0.026, material: M.rubber }));
  turntable.add(K.cable(new THREE.Vector3(1.25, 0.1, 0.6), new THREE.Vector3(0.6, -0.1, -0.8), { sag: 0.12, radius: 0.026, material: M.rubber }));

  // control box + status panel at the front of the trailer
  const box = K.box(1.3, 0.9, 0.9, M.panelGrey, 0, 1.62, 2.9);
  g.add(box);
  const leds = [];
  for (let i = 0; i < 4; i++) {
    const led = K.cyl(0.035, 0.035, 0.03, 10, M.ledGreen, -0.45 + i * 0.3, 1.85, 3.37);
    led.rotation.x = Math.PI / 2;
    g.add(led);
    leds.push(led);
  }
  battery.statusLeds = leds;
  g.add(K.labelPlate(spec.name, 0.95, 0.2).translateY(1.5).translateZ(3.37));

  // selection strip along the trailer skirt
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 6.6),
    new THREE.MeshStandardMaterial({ color: spec.accent, emissive: spec.accent, emissiveIntensity: 0.25, roughness: 0.4 }),
  );
  strip.position.set(1.4, 0.86, 0);
  g.add(strip);
  battery.selectionStrip = strip;

  // warning beacons
  for (const s of [-1, 1]) {
    const b = K.warningBeacon(0xffb029);
    b.position.set(s * 1.2, 1.9, -3.3);
    g.add(b);
    battery.beacons.push(b);
  }

  g.add(buildPadSupport(battery, rng));

  battery.collision?.addBox(
    new THREE.Vector3(battery.group.position.x, 1.5, battery.group.position.z),
    new THREE.Vector3(3.6, 3.0, 8.4), 'launcher',
  );
  battery.launchOrigin = new THREE.Vector3(0, 2.4, 0);
}

function buildThaad(battery, rng) {
  const M = mats();
  const spec = battery.spec;
  const g = battery.group;

  // heavy 3-axle transporter with a forward cab
  const chassis = buildChassis(10.6, 2.7, { axles: 3, wheelR: 0.72, drawbar: false });
  chassis.position.y = 1.22;
  g.add(chassis);
  const cab = buildCab(2.7, 2.1, 2.6, M.panelSand);
  cab.position.set(0, 2.5, 4.6);
  g.add(cab);
  g.add(K.cyl(0.07, 0.08, 1.6, 8, M.heatSteel, 1.5, 3.2, 3.4));
  g.add(K.cyl(0.012, 0.016, 2.4, 4, M.blackMetal, -1.4, 4.0, 3.6));

  // pallet + azimuth ring behind the cab
  const turntable = new THREE.Group();
  turntable.position.set(0, 1.55, -1.4);
  g.add(turntable);
  turntable.add(K.cyl(1.35, 1.55, 0.4, 24, M.panelGrey, 0, 0.2, 0));
  turntable.add(K.boltRing(1.4, 26, M.steel).translateY(0.02).rotateX(-Math.PI / 2));
  battery.turntable = turntable;

  const erector = new THREE.Group();
  erector.position.set(0, 0.45, 0);
  turntable.add(erector);
  battery.erector = erector;

  // launch pod: a boxy frame containing 8 round tubes (2 x 4)
  const podLen = 8.0;
  const r = 0.42;
  const pod = new THREE.Group();
  pod.position.set(0, 0.9, podLen / 2 - 1.2);
  erector.add(pod);
  pod.add(K.box(2.1, 1.95, podLen, M.panelSand, 0, 0, 0));
  for (let i = 0; i < 5; i++) {
    pod.add(K.box(2.2, 2.05, 0.12, M.darkMetal, 0, 0, (i / 4 - 0.5) * (podLen - 0.6)));
  }
  // front face plate with 8 tube openings
  const face = K.box(2.16, 2.0, 0.16, M.darkMetal, 0, 0, podLen / 2 + 0.02);
  pod.add(face);
  for (let i = 0; i < 8; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = (col - 0.5) * 0.94;
    const y = (row - 1.5) * 0.46;
    const tube = buildRoundCanister(podLen - 0.3, r, i, spec.accent, M.panelGrey);
    tube.position.set(x, y, 0);
    tube.scale.set(0.98, 0.98, 1);
    pod.add(tube);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(x, y, podLen / 2 + 0.2);
    pod.add(muzzle);
    battery.tubes.push({ index: i, loaded: true, cover: tube.userData.cover, muzzle, canister: tube });
  }
  // pod exterior detail: walkway, handrail, cable trays, stencils
  pod.add(K.grating(0.5, podLen * 0.8).translateX(1.32).translateY(-0.9));
  const rail = K.handrail(podLen * 0.8, 0.9);
  rail.rotation.y = Math.PI / 2;
  rail.position.set(1.6, -0.9, 0);
  pod.add(rail);
  pod.add(K.conduit([
    new THREE.Vector3(-1.1, -0.6, -podLen / 2 + 0.4),
    new THREE.Vector3(-1.16, -0.2, 0),
    new THREE.Vector3(-1.1, 0.3, podLen / 2 - 0.6),
  ], 0.06));
  const podLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.6),
    new THREE.MeshStandardMaterial({
      map: T.stencil('HALBERD HA-2', { w: 1024, h: 200, color: '#d9ddd2' }),
      transparent: true, roughness: 0.85,
    }),
  );
  podLabel.position.set(-1.06, 0.4, -1.4);
  podLabel.rotation.y = -Math.PI / 2;
  pod.add(podLabel);

  // heavy elevation rams
  battery.rams = [];
  for (const s of [-1, 1]) {
    const ram = K.hydraulicRam(3.0);
    ram.position.set(s * 1.45, 0.05, 1.4);
    ram.rotation.x = -0.75;
    turntable.add(ram);
    battery.rams.push(ram);
  }
  // blast deflector plate that folds down behind the pod
  const deflector = K.box(3.2, 2.2, 0.16, M.heatSteel, 0, 0.6, -1.6);
  deflector.rotation.x = 0.5;
  erector.add(deflector);

  // electronics container on the chassis tail
  const container = K.box(2.4, 1.6, 2.2, M.corrugated, 0, 2.2, -4.4);
  g.add(container);
  const leds = [];
  for (let i = 0; i < 4; i++) {
    const led = K.cyl(0.035, 0.035, 0.03, 10, M.ledGreen, -0.5 + i * 0.32, 2.6, -3.28);
    led.rotation.x = Math.PI / 2;
    g.add(led);
    leds.push(led);
  }
  battery.statusLeds = leds;
  g.add(K.labelPlate(spec.name, 1.4, 0.28).translateY(2.15).translateZ(-3.28).rotateY(Math.PI));
  g.add(K.ladder(2.0).translateX(1.5).translateY(1.0).translateZ(-4.4).rotateY(Math.PI / 2));

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.09, 9.4),
    new THREE.MeshStandardMaterial({ color: spec.accent, emissive: spec.accent, emissiveIntensity: 0.25, roughness: 0.4 }),
  );
  strip.position.set(1.52, 1.05, -0.4);
  g.add(strip);
  battery.selectionStrip = strip;

  for (const s of [-1, 1]) {
    const b = K.warningBeacon(0xffb029);
    b.position.set(s * 1.3, 3.05, -4.4);
    g.add(b);
    battery.beacons.push(b);
  }

  g.add(buildPadSupport(battery, rng));
  battery.collision?.addBox(
    new THREE.Vector3(battery.group.position.x, 2.0, battery.group.position.z),
    new THREE.Vector3(4.0, 4.0, 12.0), 'launcher',
  );
  battery.launchOrigin = new THREE.Vector3(0, 3.4, 0);
}

function buildSentinel(battery, rng) {
  const M = mats();
  const spec = battery.spec;
  const g = battery.group;

  // massive test-article transporter-erector on a concrete pedestal
  const pedestalBase = K.box(9.0, 0.9, 12.0, M.concreteDark, 0, 0.45, 0);
  g.add(pedestalBase);
  const flame = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 1.2, 24), M.heatSteel);
  flame.position.set(0, 0.9, -2.0);
  g.add(flame);
  const flameHole = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.4, 24), M.blackMetal);
  flameHole.position.set(0, 0.95, -2.0);
  g.add(flameHole);

  const chassis = buildChassis(12.4, 3.1, { axles: 3, wheelR: 0.8, drawbar: false });
  chassis.position.y = 1.9;
  g.add(chassis);
  const cab = buildCab(3.0, 2.2, 2.8, M.panelGrey);
  cab.position.set(0, 3.3, 5.4);
  g.add(cab);

  const turntable = new THREE.Group();
  turntable.position.set(0, 2.3, -2.0);
  g.add(turntable);
  turntable.add(K.cyl(1.8, 2.1, 0.5, 28, M.panelGrey, 0, 0.25, 0));
  turntable.add(K.boltRing(1.86, 32, M.steel).translateY(0.03).rotateX(-Math.PI / 2));
  battery.turntable = turntable;

  const erector = new THREE.Group();
  erector.position.set(0, 0.55, 0);
  turntable.add(erector);
  battery.erector = erector;

  // erector beam
  erector.add(K.box(2.6, 0.6, 11.0, M.panelGrey, 0, 0, 4.4));
  for (const s of [-1, 1]) erector.add(K.box(0.2, 1.2, 10.6, M.galvanised, s * 1.35, 0.3, 4.4));

  const canLen = 10.4;
  const r = 0.68;
  for (let i = 0; i < 2; i++) {
    const x = (i - 0.5) * 1.62;
    const can = buildRoundCanister(canLen, r, i, spec.accent, M.panelWhite);
    can.position.set(x, 1.0, 4.6);
    erector.add(can);
    // canister cradle rings
    for (const z of [1.4, 4.6, 7.8]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.09, 0.07, 6, 20), M.galvanised);
      ring.position.set(x, 1.0, z);
      erector.add(ring);
    }
    const muzzle = new THREE.Object3D();
    muzzle.position.set(x, 1.0, 4.6 + canLen / 2);
    erector.add(muzzle);
    battery.tubes.push({ index: i, loaded: true, cover: can.userData.cover, muzzle, canister: can });
  }
  // umbilical mast alongside the canisters
  const umbilical = new THREE.Group();
  umbilical.position.set(1.7, 0.6, 3.0);
  erector.add(umbilical);
  umbilical.add(K.box(0.4, 0.4, 6.0, M.panelGrey, 0, 0, 2.6));
  for (let i = 0; i < 4; i++) {
    umbilical.add(K.cable(
      new THREE.Vector3(0, 0, i * 1.5),
      new THREE.Vector3(-0.85, 0.4, i * 1.5 + 0.4),
      { sag: 0.1, radius: 0.03 },
    ));
  }

  // very heavy erection rams
  battery.rams = [];
  for (const s of [-1, 1]) {
    const ram = K.hydraulicRam(4.4);
    ram.position.set(s * 1.7, 0.0, 2.2);
    ram.rotation.x = -0.8;
    turntable.add(ram);
    battery.rams.push(ram);
  }

  // control container + generator group at the rear
  const container = K.box(2.8, 2.0, 3.0, M.corrugated, 0, 3.0, -5.4);
  g.add(container);
  const leds = [];
  for (let i = 0; i < 5; i++) {
    const led = K.cyl(0.04, 0.04, 0.03, 10, M.ledGreen, -0.7 + i * 0.35, 3.5, -3.88);
    led.rotation.x = Math.PI / 2;
    g.add(led);
    leds.push(led);
  }
  battery.statusLeds = leds;
  g.add(K.labelPlate('SENTINEL LR-1', 1.8, 0.34).translateY(2.9).translateZ(-3.88).rotateY(Math.PI));
  g.add(K.labelPlate('TEST ARTICLE - RANGE USE ONLY', 2.2, 0.2, '#ffd88a').translateY(2.45).translateZ(-3.88).rotateY(Math.PI));
  g.add(K.ladder(3.0).translateX(1.6).translateY(1.4).translateZ(-5.4).rotateY(Math.PI / 2));

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 11.0),
    new THREE.MeshStandardMaterial({ color: spec.accent, emissive: spec.accent, emissiveIntensity: 0.25, roughness: 0.4 }),
  );
  strip.position.set(1.72, 1.7, 0);
  g.add(strip);
  battery.selectionStrip = strip;

  for (const s of [-1, 1]) {
    const b = K.warningBeacon(0xff3a2a);
    b.position.set(s * 1.5, 4.05, -5.4);
    g.add(b);
    battery.beacons.push(b);
  }

  // heavy barrier ring: this is the noisy end of the site
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = K.jerseyBarrier(3);
    b.position.set(Math.cos(a) * 13, 0, Math.sin(a) * 13);
    b.rotation.y = -a;
    g.add(b);
    battery.collision?.addBox(
      new THREE.Vector3(battery.group.position.x + Math.cos(a) * 13, 0.5, battery.group.position.z + Math.sin(a) * 13),
      new THREE.Vector3(2.4, 1.0, 2.4), 'barrier',
    );
  }

  g.add(buildPadSupport(battery, rng, { crewShelter: true }));
  battery.collision?.addBox(
    new THREE.Vector3(battery.group.position.x, 2.6, battery.group.position.z),
    new THREE.Vector3(5.0, 5.2, 14.0), 'launcher',
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
  return b;
}
