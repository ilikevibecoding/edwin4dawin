import * as THREE from 'three';
import { settings } from './settings.js';
import { Rng } from './util/rng.js';
import { Pool } from './util/pool.js';
import * as G from './util/geo.js';
import * as M from './materials.js';
import * as T from './util/textures.js';
import { clamp, saturate, lerp, damp } from './util/mathx.js';
import {
  GRAVITY,
  airDensity,
  SEA_LEVEL_DENSITY,
  integrateBody,
  orientToVelocity,
  solveBallisticToTarget,
  timeToAltitude
} from './physics.js';
import { groundHeight } from './base.js';

/**
 * Inbound ballistic threats.
 *
 * Everything here is a gameplay abstraction: arcs, speeds and re-entry
 * behaviour are chosen so the engagement is readable from the ground and
 * finishes inside a 45-90 second scenario.
 */

export const THREAT_PHASES = {
  MIDCOURSE: 'MIDCOURSE',
  REENTRY: 'RE-ENTRY',
  TERMINAL: 'TERMINAL'
};

let nextThreatSerial = 1;

export class Threat {
  constructor(index) {
    this.index = index;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.accel = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.alive = false;
    this.kind = 'rv';
    this.id = '';
    this.serial = 0;
    this.age = 0;
    this.phase = THREAT_PHASES.MIDCOURSE;
    this.trailAcc = { value: 0 };
    this.impactPoint = new THREE.Vector3();
    this.bc = 12000;
    this.spiralPhase = 0;
    this.spiralRate = 0;
    this.spiralAmp = 0;
    this.mesh = null;
    this.glow = null;
    this.hp = 1;
    this.flareTimer = 0;
    this.destroyedBy = null;
    this.timeToImpact = Infinity;
    this.speed = 0;
  }

  get isDecoy() {
    return this.kind === 'decoy';
  }

  get altitude() {
    return this.pos.y;
  }
}

/* ------------------------------------------------------------------ *
 * Scenarios
 * ------------------------------------------------------------------ */

export const SCENARIOS = {
  single: {
    id: 'single',
    name: 'SINGLE TRACK',
    brief: 'One inbound. Clean geometry, plenty of time to work the intercept.',
    preferredSky: null,
    waves: [{ at: 3.0, count: 1, decoys: 0 }],
    spreadDeg: 0,
    baseSpeed: [760, 880],
    baseAltitude: [15500, 17500],
    baseRange: [46000, 52000],
    duration: 90
  },
  saturation: {
    id: 'saturation',
    name: 'SATURATION',
    brief: 'Four to five tracks on separate arcs inside a twenty second window.',
    preferredSky: null,
    waves: [
      { at: 3.0, count: 2, decoys: 0 },
      { at: 13.0, count: 1, decoys: 0 },
      { at: 21.0, count: 2, decoys: 0 }
    ],
    spreadDeg: 46,
    baseSpeed: [790, 960],
    baseAltitude: [14000, 18000],
    baseRange: [42000, 54000],
    duration: 95
  },
  nightraid: {
    id: 'nightraid',
    name: 'NIGHT RAID',
    brief: 'Multiple tracks with harmless decoys mixed in. Low visibility.',
    preferredSky: 'night',
    waves: [
      { at: 3.0, count: 2, decoys: 1 },
      { at: 12.0, count: 2, decoys: 1 },
      { at: 23.0, count: 1, decoys: 1 }
    ],
    spreadDeg: 62,
    baseSpeed: [770, 940],
    baseAltitude: [13500, 17000],
    baseRange: [40000, 52000],
    duration: 100
  }
};

export const SCENARIO_LIST = [SCENARIOS.single, SCENARIOS.saturation, SCENARIOS.nightraid];

/* ------------------------------------------------------------------ *
 * Manager
 * ------------------------------------------------------------------ */

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _col = new THREE.Color();

export class ThreatManager {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.rng = new Rng(settings.seed ^ 0x7411);
    this.group = new THREE.Group();
    this.group.name = 'threats';
    scene.add(this.group);

    this._buildModels();
    this.pool = new Pool((i) => new Threat(i), 16);
    this.active = [];
    this.scenario = SCENARIOS.single;
    this.time = 0;
    this.waveIndex = 0;
    this.running = false;
    this.spawnedCount = 0;
    this.listeners = { impact: [], spawn: [] };
  }

  on(event, fn) {
    this.listeners[event]?.push(fn);
  }

  _emit(event, payload) {
    for (const fn of this.listeners[event] || []) fn(payload);
  }

  /** Re-entry vehicle body: a blunt cone with a scorched heat shield. */
  _buildModels() {
    const rvGeo = [];
    const shield = new THREE.CylinderGeometry(0.02, 0.62, 2.1, 20, 1);
    rvGeo.push(G.xform(shield, [0, -0.2, 0]));
    const body = new THREE.CylinderGeometry(0.62, 0.55, 1.5, 20);
    rvGeo.push(G.xform(body, [0, -1.7, 0]));
    // Aft skirt and stabiliser strakes.
    rvGeo.push(G.xform(new THREE.CylinderGeometry(0.56, 0.62, 0.25, 20), [0, -2.55, 0]));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const fin = new THREE.BoxGeometry(0.05, 1.0, 0.55);
      rvGeo.push(G.xform(fin, [Math.cos(a) * 0.72, -2.2, Math.sin(a) * 0.72], [0, -a, 0]));
    }
    this.rvGeometry = G.merge(rvGeo);
    this.rvMaterial = new THREE.MeshStandardMaterial({
      map: T.heatTemper({ base: '#3a3733' }),
      roughness: 0.55,
      metalness: 0.75,
      emissive: new THREE.Color('#ff5a1e'),
      emissiveIntensity: 0
    });

    // Decoy: a lighter, simpler shape with a reflective skin.
    const decoyGeo = [];
    decoyGeo.push(new THREE.SphereGeometry(0.45, 14, 10));
    decoyGeo.push(G.xform(new THREE.ConeGeometry(0.45, 1.2, 14), [0, 0.7, 0]));
    decoyGeo.push(G.xform(new THREE.ConeGeometry(0.45, 1.0, 14), [0, -0.62, 0], [Math.PI, 0, 0]));
    this.decoyGeometry = G.merge(decoyGeo);
    this.decoyMaterial = new THREE.MeshStandardMaterial({
      color: '#b9c0c6',
      roughness: 0.22,
      metalness: 1.0,
      emissive: new THREE.Color('#8fb8ff'),
      emissiveIntensity: 0.15
    });

    this.glowTexture = T.glowSprite(128, 2.1);
  }

  _acquireMesh(threat) {
    const isDecoy = threat.kind === 'decoy';
    const mesh = new THREE.Mesh(
      isDecoy ? this.decoyGeometry : this.rvGeometry,
      isDecoy ? this.decoyMaterial.clone() : this.rvMaterial.clone()
    );
    mesh.castShadow = false;
    mesh.frustumCulled = false;
    // Threats are tens of kilometres away for most of their flight; a
    // generous scale keeps them readable without looking like toys up close.
    mesh.scale.setScalar(isDecoy ? 2.2 : 2.6);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: isDecoy ? 0xbfd8ff : 0xff9b4a,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    glow.scale.setScalar(24);
    glow.position.y = 0.4;
    mesh.add(glow);
    this.group.add(mesh);
    threat.mesh = mesh;
    threat.glow = glow;
    return mesh;
  }

  _releaseMesh(threat) {
    if (!threat.mesh) return;
    this.group.remove(threat.mesh);
    threat.mesh.material.dispose();
    threat.glow.material.dispose();
    threat.mesh = null;
    threat.glow = null;
  }

  /* -------------------------------------------------- lifecycle */

  start(scenarioId, seedOffset = 0) {
    this.reset();
    this.scenario = SCENARIOS[scenarioId] || SCENARIOS.single;
    this.rng.reseed((settings.seed ^ 0x7411) + seedOffset * 7919);
    this.time = 0;
    this.waveIndex = 0;
    this.running = true;
    this.spawnedCount = 0;
    // Every run gets a slightly different approach axis so no two engagements
    // look the same, while staying inside a cinematic northern sector.
    this.axisBearing = this.rng.range(-28, 28);
    return this.scenario;
  }

  stop() {
    this.running = false;
  }

  reset() {
    for (const t of this.active) {
      t.alive = false;
      this._releaseMesh(t);
      this.pool.release(t);
    }
    this.active.length = 0;
    this.running = false;
    this.time = 0;
    this.waveIndex = 0;
  }

  get totalPlanned() {
    return this.scenario.waves.reduce((s, w) => s + w.count + (w.decoys || 0), 0);
  }

  get liveThreats() {
    return this.active.filter((t) => t.alive && t.kind !== 'decoy').length;
  }

  /* -------------------------------------------------- spawning */

  spawnOne(kind = 'rv', laneIndex = 0, laneCount = 1) {
    const t = this.pool.acquire();
    if (!t) return null;
    const s = this.scenario;

    t.alive = true;
    t.kind = kind;
    t.serial = nextThreatSerial++;
    t.id = `${kind === 'decoy' ? 'D' : 'T'}${String(t.serial).padStart(2, '0')}`;
    t.age = 0;
    t.phase = THREAT_PHASES.MIDCOURSE;
    t.trailAcc.value = 0;
    t.destroyedBy = null;
    t.hp = 1;

    // Lay the approach out on an arc of bearings north of the site.
    const spread = s.spreadDeg;
    const laneT = laneCount <= 1 ? 0 : laneIndex / (laneCount - 1) - 0.5;
    const bearing = THREE.MathUtils.degToRad(this.axisBearing + laneT * spread + this.rng.spread(6));
    const range = this.rng.range(s.baseRange[0], s.baseRange[1]);
    const alt = this.rng.range(s.baseAltitude[0], s.baseAltitude[1]);

    // Aim point: scattered across the site so impacts are visible but varied.
    const aimR = this.rng.range(0, 90);
    const aimA = this.rng.float() * Math.PI * 2;
    t.impactPoint.set(Math.cos(aimA) * aimR, 0, Math.sin(aimA) * aimR);

    t.pos.set(
      t.impactPoint.x + Math.sin(bearing) * range,
      alt,
      t.impactPoint.z - Math.cos(bearing) * range
    );

    // Ballistic solve for a descending arc that actually reaches the aim point.
    const speed = this.rng.range(s.baseSpeed[0], s.baseSpeed[1]) * (kind === 'decoy' ? 0.94 : 1);
    t.bc = kind === 'decoy' ? 2600 : this.rng.range(26000, 44000);
    solveBallisticToTarget(t.pos, t.impactPoint, speed, t.bc, t.vel);
    t.spiralPhase = this.rng.float() * Math.PI * 2;
    t.spiralRate = this.rng.range(0.8, 1.9);
    t.spiralAmp = kind === 'decoy' ? 0 : this.rng.range(6, 22);
    t.flareTimer = kind === 'decoy' ? this.rng.range(2, 5) : 0;

    this._acquireMesh(t);
    t.mesh.position.copy(t.pos);
    orientToVelocity(t.quat, t.vel, null, 1, 1000);
    t.mesh.quaternion.copy(t.quat);

    this.active.push(t);
    this.spawnedCount++;
    this._emit('spawn', t);
    return t;
  }

  /* -------------------------------------------------- update */

  update(dt, ctx) {
    if (this.running) {
      this.time += dt;
      while (this.waveIndex < this.scenario.waves.length && this.time >= this.scenario.waves[this.waveIndex].at) {
        const wave = this.scenario.waves[this.waveIndex];
        const total = wave.count + (wave.decoys || 0);
        const kinds = [];
        for (let i = 0; i < wave.count; i++) kinds.push('rv');
        for (let i = 0; i < (wave.decoys || 0); i++) kinds.push('decoy');
        this.rng.shuffle(kinds);
        for (let i = 0; i < total; i++) {
          this.spawnOne(kinds[i], this.spawnedCount + i, Math.max(3, this.totalPlanned));
        }
        this.waveIndex++;
      }
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      if (!t.alive) {
        this._releaseMesh(t);
        this.pool.release(t);
        this.active.splice(i, 1);
        continue;
      }
      this._updateThreat(t, dt, ctx);
    }
  }

  _updateThreat(t, dt, ctx) {
    t.age += dt;

    // Terminal spiral: a slow, wide corkscrew. It is here to make the last
    // seconds visually interesting and slightly harder, not to model anything.
    let commanded = null;
    if (t.spiralAmp > 0 && t.pos.y < 9000) {
      t.spiralPhase += t.spiralRate * dt;
      const ramp = saturate((9000 - t.pos.y) / 6000);
      _v1.copy(t.vel).normalize();
      _v2.set(0, 1, 0).cross(_v1).normalize();
      _v3.copy(_v1).cross(_v2).normalize();
      commanded = _v2
        .multiplyScalar(Math.cos(t.spiralPhase) * t.spiralAmp * ramp)
        .addScaledVector(_v3, Math.sin(t.spiralPhase) * t.spiralAmp * ramp);
    }

    integrateBody(t, dt, commanded, t.accel);
    t.speed = t.vel.length();

    // Phase classification, used by the HUD and the radar.
    const prevPhase = t.phase;
    t.phase =
      t.pos.y > 9000
        ? THREAT_PHASES.MIDCOURSE
        : t.pos.y > 3000
          ? THREAT_PHASES.REENTRY
          : THREAT_PHASES.TERMINAL;
    if (prevPhase !== t.phase && t.phase === THREAT_PHASES.TERMINAL) {
      ctx?.onThreatTerminal?.(t);
    }

    orientToVelocity(t.quat, t.vel, null, dt, 8);
    t.mesh.position.copy(t.pos);
    t.mesh.quaternion.copy(t.quat);

    // Predicted time to ground, used by the threat list and the radar.
    t.timeToImpact = timeToAltitude(t.pos.y, t.vel.y, 0);

    // Heating: the faster and denser the air, the hotter the shield glows.
    const rho = airDensity(t.pos.y) / SEA_LEVEL_DENSITY;
    const heat = saturate((t.speed / 900) * Math.pow(rho, 0.35) * 1.35);
    const mat = t.mesh.material;
    mat.emissiveIntensity = t.isDecoy ? 0.2 + heat * 0.4 : heat * 3.6;
    const glowScale = t.isDecoy ? 16 + heat * 26 : 20 + heat * 90;
    t.glow.scale.setScalar(glowScale);
    t.glow.material.opacity = t.isDecoy ? 0.55 + heat * 0.35 : 0.35 + heat * 0.65;

    // Trail. Thin air leaves a long persistent contrail, dense air a short
    // shredded plume - handled inside the effects system.
    if (this.effects) {
      _col.setRGB(0.8, 0.79, 0.78);
      this.effects.emitTrail(t.pos, t.vel, dt, {
        rate: t.isDecoy ? 55 : 85,
        widthStart: t.isDecoy ? 3.0 : 5.5,
        widthEnd: t.isDecoy ? 16 : 30,
        alpha: t.isDecoy ? 0.36 : 0.55,
        color: _col,
        hot: t.isDecoy ? 0 : heat * 0.8,
        accumulator: t.trailAcc
      });
    }

    // Decoys periodically pop flares - the "obvious" tell once you learn it.
    if (t.isDecoy) {
      t.flareTimer -= dt;
      if (t.flareTimer <= 0) {
        t.flareTimer = this.rng.range(2.2, 4.5);
        this.effects?.dropFlare(t.pos, t.vel);
      }
    }

    // Ground impact.
    const gy = groundHeight(t.pos.x, t.pos.z);
    if (t.pos.y <= gy + 1) {
      t.pos.y = gy;
      this.kill(t, t.isDecoy ? 'decoy-ground' : 'impact');
    }
  }

  /** Remove a threat and play the appropriate destruction. */
  kill(threat, cause = 'intercept', by = null) {
    if (!threat.alive) return;
    threat.alive = false;
    threat.destroyedBy = by;
    const e = this.effects;
    if (e) {
      if (cause === 'impact') {
        e.groundImpact(threat.pos, { radius: 42, intensity: 1.6 });
      } else if (cause === 'decoy-ground') {
        e.explode(threat.pos, { radius: 12, intensity: 0.6, debrisCount: 10, kind: 'decoy' });
      } else {
        e.explode(threat.pos, {
          radius: threat.isDecoy ? 16 : 30,
          intensity: threat.isDecoy ? 0.8 : 1.35,
          debrisCount: threat.isDecoy ? 12 : 30,
          velocity: threat.vel,
          kind: threat.isDecoy ? 'decoy' : 'intercept'
        });
      }
    }
    this._emit('impact', { threat, cause });
  }

  get done() {
    return this.running && this.waveIndex >= this.scenario.waves.length && this.active.length === 0;
  }
}
