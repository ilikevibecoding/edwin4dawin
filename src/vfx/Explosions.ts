import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import type { ILevel } from '../core/Contracts';
import { makeRng, TAU, clamp } from '../core/MathX';
import { ParticleEngine, VFX_LAYER } from './ParticleEngine';
import { ADD, ALP, ATLAS_COLS } from './ParticleTextures';
import type { Sparks } from './Sparks';
import type { Smoke } from './Smoke';
import type { Debris } from './Debris';

const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();

interface Ring {
  mesh: THREE.Mesh;
  active: boolean;
  t: number;
  dur: number;
  startR: number;
  maxR: number;
  y: number;
  intensity: number;
}

interface KindTune {
  fire: number;
  dust: number;
  frag: number;
  smokeDur: number;
  fireDur: number;
  sparks: number;
}

const KINDS: Record<string, KindTune> = {
  grenade: { fire: 0.7, dust: 1.0, frag: 1.4, smokeDur: 5, fireDur: 1.5, sparks: 1.4 },
  bomb: { fire: 1.5, dust: 1.6, frag: 1.2, smokeDur: 11, fireDur: 4, sparks: 1.0 },
  rocket: { fire: 1.1, dust: 1.0, frag: 1.1, smokeDur: 7, fireDur: 3, sparks: 1.1 },
  barrel: { fire: 1.6, dust: 0.8, frag: 0.8, smokeDur: 9, fireDur: 8, sparks: 0.7 },
};

/** Time-sequenced explosion: flash + light, fireball, ground shockwave ring,
 *  rolling dust wave, ballistic debris, rising smoke column, lingering fire. */
export class Explosions {
  private rng = makeRng(0x3f10a);
  private level: ILevel | null;
  private rings: Ring[] = [];
  private ringGeom: THREE.PlaneGeometry;
  private ringMat: THREE.MeshBasicMaterial;

  constructor(
    private engine: ParticleEngine,
    private ctx: EngineContext,
    private sparks: Sparks,
    private smoke: Smoke,
    private debris: Debris
  ) {
    this.level = ctx.has('level') ? ctx.get<ILevel>('level') : null;

    const tex = engine.textures.additive.clone();
    tex.needsUpdate = true;
    const col = ADD.RING % ATLAS_COLS;
    const row = Math.floor(ADD.RING / ATLAS_COLS);
    tex.repeat.set(1 / ATLAS_COLS, 1 / ATLAS_COLS);
    tex.offset.set(col / ATLAS_COLS, row / ATLAS_COLS);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.ringMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true,
      side: THREE.DoubleSide,
    });
    this.ringGeom = new THREE.PlaneGeometry(1, 1);

    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(this.ringGeom, this.ringMat.clone());
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.frustumCulled = false;
      m.layers.set(VFX_LAYER);
      m.renderOrder = 5;
      this.ctx.scene.add(m);
      this.rings.push({ mesh: m, active: false, t: 0, dur: 1, startR: 0.5, maxR: 4, y: 0, intensity: 1 });
    }
  }

  private groundY(x: number, z: number, fallback: number): number {
    const g = this.level?.sampleGround(x, z);
    return g === null || g === undefined ? fallback : g;
  }

  explode(position: THREE.Vector3, radius: number, kind: string) {
    const k = KINDS[kind] ?? KINDS.grenade;
    const r = radius;
    const gy = this.groundY(position.x, position.z, position.y);
    const rng = this.rng;

    // --- 1. white-hot core flash + dynamic light ---------------------------
    _pos.copy(position);
    this.engine.flashLight(_pos, WHITE_HOT, 16 * r * k.fire, r * 6, 0.14);
    this.coreFlash(position, r);

    // --- 2a. fireball BODY (alpha, opaque) ---------------------------------
    // Opaque, churning puffs coloured hot orange -> deep red -> black smoke.
    // Being alpha-blended they occlude the background and each other, which is
    // what gives a fireball readable volume instead of an additive white blur.
    const body = Math.round(9 + r * k.fire * 4);
    for (let i = 0; i < body; i++) {
      const d = this.engine.desc.reset();
      const off = r * 0.5;
      const up = rng();
      d.px = position.x + (rng() - 0.5) * off;
      d.py = position.y + up * off * 0.7;
      d.pz = position.z + (rng() - 0.5) * off;
      d.vx = (rng() - 0.5) * r * 1.6;
      d.vy = r * (0.5 + up * 1.4);
      d.vz = (rng() - 0.5) * r * 1.6;
      // hot -> cooled: mildly HDR so the core blooms but keeps its orange.
      // Cools to a dim ember-orange (not black) so the whole ball reads as
      // glowing fire; the dedicated grey smoke puffs supply the sooty top.
      const heat = 2.6 + rng() * 1.8;
      d.r0 = heat; d.g0 = heat * 0.4; d.b0 = heat * 0.09;
      d.r1 = 0.5; d.g1 = 0.14; d.b1 = 0.04;
      d.life = 0.9 + rng() * 0.8 + r * 0.05;
      d.size0 = r * (0.55 + rng() * 0.45);
      d.size1 = r * (1.7 + rng() * 1.0);
      d.gravity = 3.0;
      d.drag = 1.0;
      d.cell = ALP.SMK0; d.frames = 8; d.fadeMode = 6; // fireball envelope
      d.turb = true; d.turbAmt = 0.35;
      d.rot = rng() * TAU; d.rotSpeed = (rng() - 0.5) * 1.4;
      d.opacity = 1;
      d.soft = true;
      d.delay = rng() * 0.05;
      this.engine.alpha.spawn(d);
    }
    this.engine.markSoft(1.9 + r * 0.05);

    // --- 2b. fireball HIGHLIGHTS (additive) --------------------------------
    // A few short licks that ride on top of the body for the incandescent core
    // and bloom, then burn out to reveal the cooler orange body beneath. Kept
    // deliberately modest so the additive glow doesn't wash out to flat white.
    const licks = Math.round(4 + r * k.fire * 1.4);
    for (let i = 0; i < licks; i++) {
      const d = this.engine.desc.reset();
      const off = r * 0.3;
      d.px = position.x + (rng() - 0.5) * off;
      d.py = position.y + (rng() - 0.1) * off * 0.6;
      d.pz = position.z + (rng() - 0.5) * off;
      d.vx = (rng() - 0.5) * r * 1.4;
      d.vy = r * (0.7 + rng() * 1.0);
      d.vz = (rng() - 0.5) * r * 1.4;
      const heat = 2.2 + rng() * 2.0;
      d.r0 = heat; d.g0 = heat * 0.42; d.b0 = heat * 0.05;
      d.r1 = 0.8; d.g1 = 0.18; d.b1 = 0.04;
      d.life = 0.3 + rng() * 0.35;
      d.size0 = r * (0.35 + rng() * 0.35);
      d.size1 = r * (0.8 + rng() * 0.5);
      d.gravity = 3.0;
      d.drag = 1.0;
      d.cell = ADD.FIRE0; d.frames = 8; d.fadeMode = 5;
      d.turb = true; d.turbAmt = 0.3;
      d.rot = rng() * TAU; d.rotSpeed = (rng() - 0.5);
      d.opacity = 1;
      d.delay = rng() * 0.05;
      this.engine.additive.spawn(d);
    }

    // --- 2c. immediate rising smoke (reads even during a short warmup) ------
    // Persistent emitters take time to build a column; seed a few big dark
    // puffs up front so smoke has volume the instant the fireball forms.
    const puffs = Math.round(3 + r * 0.8);
    for (let i = 0; i < puffs; i++) {
      const d = this.engine.desc.reset();
      const a = rng() * TAU;
      const rr = rng() * r * 0.5;
      d.px = position.x + Math.cos(a) * rr;
      d.py = position.y + r * (0.4 + rng() * 0.8);
      d.pz = position.z + Math.sin(a) * rr;
      d.vx = Math.cos(a) * r * 0.4;
      d.vy = r * (0.6 + rng() * 0.6);
      d.vz = Math.sin(a) * r * 0.4;
      const tn = 0.16 + rng() * 0.06;
      d.r0 = tn * 1.4; d.g0 = tn * 1.1; d.b0 = tn * 0.9; // warm, lit by fire below
      d.r1 = tn * 0.5; d.g1 = tn * 0.5; d.b1 = tn * 0.5;
      d.life = 2.2 + rng() * 1.8 + r * 0.1;
      d.size0 = r * (0.7 + rng() * 0.4);
      d.size1 = r * (2.2 + rng() * 1.2);
      d.gravity = 0.6;
      d.drag = 0.5;
      d.cell = ALP.SMK0; d.frames = 8; d.fadeMode = 0;
      d.turb = true; d.turbAmt = 0.5;
      d.rot = rng() * TAU; d.rotSpeed = (rng() - 0.5) * 0.4;
      d.opacity = 0.9;
      d.lit = true; d.soft = true;
      d.delay = 0.05 + rng() * 0.25;
      this.engine.alpha.spawn(d);
    }
    this.engine.markSoft(4.5);

    // --- 3. shockwave: ground ring + air ring ------------------------------
    this.spawnRing(position.x, gy + 0.05, position.z, r * 3.2, 0.5 * k.fire + 0.6);
    {
      const d = this.engine.desc.reset();
      d.px = position.x; d.py = position.y; d.pz = position.z;
      d.r0 = 6; d.g0 = 4; d.b0 = 2; d.r1 = 1; d.g1 = 0.4; d.b1 = 0.15;
      d.life = 0.32;
      d.size0 = r * 0.6; d.size1 = r * 4.5;
      d.cell = ADD.RING; d.fadeMode = 2;
      d.opacity = 0.9;
      this.engine.additive.spawn(d);
    }

    // --- 4. rolling dust wave along the ground -----------------------------
    const spokes = Math.round(10 + r * 2.5);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * TAU + rng() * 0.35;
      _dir.set(Math.cos(a), 0.12, Math.sin(a));
      _pos.set(position.x + Math.cos(a) * r * 0.5, gy + 0.25, position.z + Math.sin(a) * r * 0.5);
      this.smoke.dust(_pos, r * 0.55 * k.dust, _dir, DUST_TINT, 3, r * 2.2, 0.02 + rng() * 0.06);
    }

    // --- 5. ballistic debris + dirt clods ----------------------------------
    _dir.set(0, 1, 0);
    this.debris.chunks(_pos.copy(position).setY(gy + 0.2), _dir, {
      count: Math.round(8 + r * 2 * k.frag),
      spread: 0.9,
      speedMin: r * 1.5,
      speedMax: r * 4,
      sizeMin: 0.08,
      sizeMax: 0.28,
      life: 1.6,
      gravity: -18,
      r: 0.32, g: 0.27, b: 0.2,
      trails: true,
    });
    // fine dirt spray
    this.smoke.dust(_pos.copy(position).setY(gy + 0.15), r * 0.5, null, DUST_TINT, Math.round(6 + r * 2), r * 0.6, 0.02);

    // --- 6. hot sparks (frag) ----------------------------------------------
    this.sparks.burst(position, UP, {
      count: Math.round(18 * k.sparks + r * 4),
      spread: 1.1,
      speedMin: r * 2,
      speedMax: r * 7,
      lifeMin: 0.3,
      lifeMax: 0.9,
      gravity: -16,
      sizeMin: 0.06,
      sizeMax: 0.16,
      stretch: 0.04,
      embers: Math.round(8 * k.sparks),
    });

    // --- 7. rising smoke column + lingering ground fire --------------------
    this.smoke.startPlume(_pos.copy(position).setY(gy + r * 0.3), r * 0.6, k.smokeDur, 1 + r * 0.1);
    this.smoke.startFire(_pos.copy(position).setY(gy + 0.05), r * 0.4, k.fireDur);
    this.engine.fireLight(_pos.copy(position).setY(gy + r * 0.3), FIRE_COLOR, 2.5 * r, r * 3.5, k.fireDur);
  }

  private coreFlash(position: THREE.Vector3, r: number) {
    const d = this.engine.desc.reset();
    d.px = position.x; d.py = position.y; d.pz = position.z;
    d.r0 = 16; d.g0 = 13; d.b0 = 9;
    d.r1 = 6; d.g1 = 2.4; d.b1 = 0.8;
    d.life = 0.12;
    d.size0 = r * 1.0; d.size1 = r * 1.8;
    d.cell = ADD.CORE; d.fadeMode = 2;
    d.opacity = 1;
    this.engine.additive.spawn(d);
  }

  private spawnRing(x: number, y: number, z: number, maxR: number, intensity: number) {
    let e = this.rings.find((rr) => !rr.active);
    if (!e) { e = this.rings[0]; for (const rr of this.rings) if (rr.t / rr.dur > e.t / e.dur) e = rr; }
    e.active = true;
    e.t = 0;
    e.dur = 0.6;
    e.startR = maxR * 0.15;
    e.maxR = maxR;
    e.y = y;
    e.intensity = intensity;
    e.mesh.visible = true;
    e.mesh.position.set(x, y, z);
    const m = e.mesh.material as THREE.MeshBasicMaterial;
    m.color.setRGB(intensity, intensity * 0.7, intensity * 0.4);
    m.opacity = 1;
  }

  update(dt: number) {
    for (const e of this.rings) {
      if (!e.active) continue;
      e.t += dt;
      const t = e.t / e.dur;
      if (t >= 1) {
        e.active = false;
        e.mesh.visible = false;
        continue;
      }
      const r = e.startR + (e.maxR - e.startR) * clamp(Math.sqrt(t), 0, 1);
      e.mesh.scale.set(r * 2, r * 2, r * 2);
      const m = e.mesh.material as THREE.MeshBasicMaterial;
      m.opacity = (1 - t) * (1 - t);
    }
  }

  dispose() {
    for (const e of this.rings) {
      this.ctx.scene.remove(e.mesh);
      (e.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    (this.ringMat.map as THREE.Texture)?.dispose();
    this.ringMat.dispose();
    this.ringGeom.dispose();
  }
}

const WHITE_HOT = new THREE.Color(1.0, 0.95, 0.85);
const FIRE_COLOR = new THREE.Color(1.0, 0.55, 0.2);
const UP = new THREE.Vector3(0, 1, 0);
const DUST_TINT: [number, number, number] = [0.52, 0.47, 0.38];
