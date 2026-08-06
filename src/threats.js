// Incoming ballistic threats and decoys, plus the three compact scenarios.
// Every figure here is invented for gameplay pacing.
import * as THREE from 'three';
import { Pool } from './core/pool.js';
import { mats } from './core/materials.js';
import * as K from './core/kit.js';
import * as T from './core/textures.js';
import { integrate, orientToVelocity, ballisticLaunchVelocity, densityRatio } from './physics.js';

export const SCENARIOS = {
  single: {
    id: 'single',
    name: 'SINGLE TRACK',
    blurb: 'One clearly visible inbound. Ideal for learning the engagement sequence.',
    waves: [{ at: 3.0, count: 1, decoys: 0 }],
    duration: 75,
    timeOfDayHint: null,
  },
  saturation: {
    id: 'saturation',
    name: 'SATURATION',
    blurb: 'Five inbounds on separate arcs inside a short interval.',
    waves: [
      { at: 2.5, count: 2, decoys: 0 },
      { at: 7.0, count: 2, decoys: 0 },
      { at: 12.0, count: 1, decoys: 0 },
    ],
    duration: 85,
    timeOfDayHint: null,
  },
  night: {
    id: 'night',
    name: 'NIGHT RAID',
    blurb: 'Multiple inbounds with occasional harmless decoys under searchlights.',
    waves: [
      { at: 2.0, count: 2, decoys: 1 },
      { at: 7.5, count: 2, decoys: 1 },
      { at: 12.5, count: 1, decoys: 0 },
    ],
    duration: 95,
    timeOfDayHint: 'night',
  },
};

const _v = new THREE.Vector3();
const _acc = new THREE.Vector3();

let trackCounter = 0;

/** Procedural reentry body: heat-stained cylinder, conical nose, fins. */
function buildThreatMesh(isDecoy) {
  const M = mats();
  const g = new THREE.Group();
  const len = isDecoy ? 3.4 : 9.2;
  const r = isDecoy ? 0.38 : 0.72;

  const bodyMat = new THREE.MeshStandardMaterial({
    map: T.heatSteel(), color: isDecoy ? 0x9aa0a6 : 0x8b8478, roughness: 0.62, metalness: 0.65,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r, len * 0.72, 16), bodyMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.86, len * 0.34, 16), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = len * 0.53;
  g.add(nose);

  // ablative nose tip glows during reentry
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x30231c, emissive: 0xff5a1e, emissiveIntensity: 0.0, roughness: 0.5,
  });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, len * 0.16, 14), tipMat);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = len * 0.7;
  g.add(tip);

  // aft skirt + nozzle throat
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 0.94, len * 0.1, 16), M.heatSteel);
  skirt.rotation.x = Math.PI / 2;
  skirt.position.z = -len * 0.38;
  g.add(skirt);
  const throat = new THREE.Mesh(new THREE.ConeGeometry(r * 0.8, r * 1.1, 14, 1, true), M.blackMetal);
  throat.rotation.x = -Math.PI / 2;
  throat.position.z = -len * 0.44;
  g.add(throat);

  // stabiliser fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(len * 0.16, -len * 0.06);
  finShape.lineTo(len * 0.16, len * 0.1);
  finShape.lineTo(0, len * 0.16);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.04, bevelEnabled: false });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, bodyMat);
    fin.rotation.z = (i / 4) * Math.PI * 2;
    fin.position.set(0, 0, -len * 0.42);
    const holder = new THREE.Group();
    holder.add(fin);
    fin.position.set(0, 0, 0);
    fin.rotation.set(0, 0, 0);
    holder.rotation.z = (i / 4) * Math.PI * 2;
    holder.position.z = -len * 0.4;
    const f = new THREE.Mesh(finGeo, bodyMat);
    f.rotation.y = Math.PI / 2;
    f.position.set(r * 0.9, 0, 0);
    holder.add(f);
    holder.remove(fin);
    g.add(holder);
  }

  // painted band + stencil so the body reads as manufactured hardware
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, len * 0.08, 16), M.panelWhite);
  band.rotation.x = Math.PI / 2;
  band.position.z = len * 0.12;
  g.add(band);

  g.userData.tipMat = tipMat;
  g.userData.length = len;
  return g;
}

export class Threat {
  constructor(index) {
    this.index = index;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.group = new THREE.Group();
    this.group.visible = false;

    this.mesh = buildThreatMesh(false);
    this.decoyMesh = buildThreatMesh(true);
    this.decoyMesh.visible = false;
    this.group.add(this.mesh, this.decoyMesh);

    // constant-screen-size marker so a distant body stays readable
    const glowMat = new THREE.SpriteMaterial({
      map: T.flare(),
      color: 0xffbb77,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: false,
      depthTest: false,
    });
    this.glow = new THREE.Sprite(glowMat);
    this.glow.scale.set(0.05, 0.05, 1);
    this.glow.renderOrder = 20;
    this.group.add(this.glow);

    this.alive = false;
    this.trail = null;
    this.trackId = '';
    this.isDecoy = false;
    this.classified = 0;
    this.age = 0;
    this.spin = new THREE.Vector3();
  }

  reset() {
    this.alive = false;
    this.group.visible = false;
    this.trail = null;
  }
}

export class ThreatManager {
  constructor(scene, rng, effects, audio) {
    this.scene = scene;
    this.rng = rng;
    this.effects = effects;
    this.audio = audio;
    this.group = new THREE.Group();
    this.group.name = 'threats';
    scene.add(this.group);

    this.pool = new Pool(10, (i) => {
      const t = new Threat(i);
      this.group.add(t.group);
      return t;
    }, (t) => t.reset());

    this.active = [];
    this.pendingWaves = [];
    this.time = 0;
    this.stats = { spawned: 0, intercepted: 0, impacted: 0, decoys: 0, leaked: 0 };
    this.onImpact = null;
    this.onSpawn = null;
    this.targetCentre = new THREE.Vector3(0, 0, -10);
  }

  reset() {
    for (const t of this.pool.active.slice()) {
      if (t.trail) this.effects.releaseTrail(t.trail);
      this.pool.release(t);
    }
    this.active.length = 0;
    this.pendingWaves.length = 0;
    this.time = 0;
    this.stats = { spawned: 0, intercepted: 0, impacted: 0, decoys: 0, leaked: 0 };
    trackCounter = 0;
  }

  /** Queue up a scenario's waves with slight run-to-run variation. */
  startScenario(scenario) {
    this.reset();
    this.scenario = scenario;
    this.totalExpected = scenario.waves.reduce((a, w) => a + w.count + w.decoys, 0);
    for (const w of scenario.waves) {
      this.pendingWaves.push({
        at: w.at + this.rng.range(-0.6, 0.9),
        count: w.count,
        decoys: w.decoys,
      });
    }
    this.pendingWaves.sort((a, b) => a.at - b.at);
  }

  spawnThreat({ decoy = false } = {}) {
    const t = this.pool.acquire();
    if (!t) return null;
    const rng = this.rng;

    // spawn on a high arc, well downrange, on a varying bearing
    const bearing = rng.range(-0.85, 0.85) + Math.PI; // arriving broadly from the north
    const range = rng.range(52000, 68000);
    const alt = rng.range(26000, 34000);
    const aimSpread = decoy ? 900 : 420;
    const aim = new THREE.Vector3(
      this.targetCentre.x + rng.gauss(0, aimSpread * 0.4, 2),
      0,
      this.targetCentre.z + rng.gauss(0, aimSpread * 0.4, 2),
    );
    t.pos.set(
      aim.x + Math.sin(bearing) * range,
      alt,
      aim.z + Math.cos(bearing) * range,
    );
    const flightTime = rng.range(56, 72) * (decoy ? 1.05 : 1);
    ballisticLaunchVelocity(t.vel, t.pos, aim, flightTime, 1.0);
    // the solve gives the whole arc; we join it already descending
    t.vel.y = Math.min(t.vel.y, -120);

    t.aimPoint = aim;
    t.alive = true;
    t.age = 0;
    t.isDecoy = decoy;
    t.classified = 0;
    t.trackId = `TK-${String(++trackCounter).padStart(2, '0')}`;
    t.group.visible = true;
    t.mesh.visible = !decoy;
    t.decoyMesh.visible = decoy;
    t.assignedTo = null;
    t.engagedBy = null;
    t.result = null;
    t.detected = false;
    t.detectTimer = rng.range(0.6, 1.8);
    t.ballisticCoeff = decoy ? 2600 : 14000;
    t.spin.set(rng.range(-2, 2), rng.range(-2, 2), rng.range(-2, 2));
    t.flareTimer = decoy ? rng.range(2, 5) : 1e9;

    t.trail = this.effects.acquireTrail({
      color: decoy ? 0xd9d2c4 : 0xe8e4dc,
      alpha: decoy ? 0.5 : 0.78,
      persistence: 7,
      minSpacing: 90,
      baseWidth: decoy ? 26 : 52,
    });
    t.trail?.push(t.pos.x, t.pos.y, t.pos.z);

    this.active.push(t);
    this.stats.spawned++;
    if (decoy) this.stats.decoys++;
    this.onSpawn?.(t);
    return t;
  }

  update(dt, camera, groundHeightAt) {
    this.time += dt;
    while (this.pendingWaves.length && this.pendingWaves[0].at <= this.time) {
      const w = this.pendingWaves.shift();
      for (let i = 0; i < w.count; i++) {
        // stagger arrivals inside a wave so tracks stay readable
        setTimeoutLike(this, i * this.rng.range(1.4, 3.0), () => this.spawnThreat({ decoy: false }));
      }
      for (let i = 0; i < w.decoys; i++) {
        setTimeoutLike(this, 1.0 + i * this.rng.range(1.6, 3.4), () => this.spawnThreat({ decoy: true }));
      }
    }
    runTimers(this, dt);

    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.age += dt;
      _acc.set(0, 0, 0);
      integrate(t.pos, t.vel, _acc, dt, t.ballisticCoeff);
      t.group.position.copy(t.pos);

      const speed = t.vel.length();
      if (t.isDecoy) {
        // decoys tumble instead of flying nose-first
        t.mesh.visible = false;
        t.decoyMesh.rotation.x += t.spin.x * dt;
        t.decoyMesh.rotation.y += t.spin.y * dt;
        t.decoyMesh.rotation.z += t.spin.z * dt;
        t.flareTimer -= dt;
        if (t.flareTimer <= 0) {
          t.flareTimer = this.rng.range(1.4, 3.2);
          this.effects.emitFlare(t.pos, t.vel);
        }
      } else {
        orientToVelocity(t.mesh, t.vel, 0, 1);
      }

      // reentry heating ramps up in denser air
      const dens = densityRatio(t.pos.y);
      const heat = Math.min(1, dens * 9 * (speed / 1400));
      const mesh = t.isDecoy ? t.decoyMesh : t.mesh;
      if (mesh.userData.tipMat) mesh.userData.tipMat.emissiveIntensity = heat * 7;
      t.glow.material.color.setRGB(1, 0.62 + heat * 0.3, 0.3 + heat * 0.35);
      const screen = 0.012 + heat * 0.02;
      t.glow.scale.set(screen, screen, 1);

      // reentry plasma trail + smoke
      if (t.trail) {
        t.trail.push(t.pos.x, t.pos.y, t.pos.z);
        t.trail.color.setRGB(0.9 + heat * 0.1, 0.88 - heat * 0.1, 0.86 - heat * 0.22);
      }
      if (heat > 0.12) {
        this.effects.emitExhaust(t.pos, _v.copy(t.vel).normalize(), dt, {
          scale: 3.2 * (t.isDecoy ? 0.4 : 1),
          hot: heat > 0.35,
          rate: 26,
          spread: 0.05,
          speed: 30,
          sooty: 0.7,
        });
      }

      if (!t.detected) {
        t.detectTimer -= dt;
        if (t.detectTimer <= 0) t.detected = true;
      }
      if (t.detected && t.isDecoy) {
        t.classified = Math.min(1, t.classified + dt / 6);
      }

      // ground impact
      const ground = groundHeightAt(t.pos.x, t.pos.z);
      if (t.pos.y <= ground + 1) {
        t.pos.y = ground;
        this.kill(t, t.isDecoy ? 'DECOY_LOST' : 'IMPACT');
      } else if (t.age > 140) {
        this.kill(t, 'LOST');
      }
    }
  }

  kill(t, result) {
    t.result = result;
    t.alive = false;
    if (result === 'IMPACT') {
      this.stats.impacted++;
      this.effects.emitGroundImpact(t.pos, { scale: 1.35 });
      this.onImpact?.(t);
    } else if (result === 'INTERCEPTED') {
      this.stats.intercepted++;
    }
    if (t.trail) {
      this.effects.releaseTrail(t.trail);
      t.trail = null;
    }
    t.group.visible = false;
    const idx = this.active.indexOf(t);
    if (idx >= 0) this.active.splice(idx, 1);
    this.pool.release(t);
  }

  get remainingToSpawn() {
    let n = 0;
    for (const w of this.pendingWaves) n += w.count + w.decoys;
    for (const timer of this._timers || []) n += 1;
    return n;
  }

  get allSpawned() {
    return this.pendingWaves.length === 0 && (!this._timers || this._timers.length === 0);
  }
}

// tiny deterministic timer helper (avoids real setTimeout so the sim can be
// stepped at fixed dt inside tests)
function setTimeoutLike(host, delay, fn) {
  host._timers = host._timers || [];
  host._timers.push({ t: delay, fn });
}

function runTimers(host, dt) {
  const timers = host._timers;
  if (!timers || !timers.length) return;
  for (let i = timers.length - 1; i >= 0; i--) {
    timers[i].t -= dt;
    if (timers[i].t <= 0) {
      const fn = timers[i].fn;
      timers.splice(i, 1);
      fn();
    }
  }
}
