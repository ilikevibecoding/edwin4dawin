import * as THREE from 'three';
import { events } from '../core/events';
import { settings } from '../core/settings';
import { makeCanvas, toTexture } from '../assets/textures/gen';
import { hash2 } from '../core/rng';
import type { SurfaceKind } from '../game/types';
import type { CollisionWorld } from '../world/collision';
import { registerAsset } from '../assets/registry';

registerAsset({
  id: 'vfx.core',
  name: 'VFX suite (impacts, sparks, dust, debris, tracers, casings, muzzle, smoke, flash, blood)',
  category: 'vfx',
  agent: 'Fable 4',
  files: 'src/fx/fx.ts',
  where: 'all gameplay',
  dims: 'n/a',
  materials: 'additive sparks, alpha smoke, instanced debris',
  textures: 'procedural sprites',
  collision: 'none',
  lod: 'particle budget scales with quality',
  anim: 'simulated per fixed step',
  audio: 'paired by audio system',
  status: 'integrated',
  accept: 'every impact/f ire/break visibly communicated; no view-covering spam; reduced-blood honored',
});

const MAX_SPARKS = 480;
const MAX_SMOKE = 240;
const MAX_DEBRIS = 96;
const MAX_CASINGS = 90;
const MAX_TRACERS = 40;
const MAX_DECALS = 96;

interface P {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  grow: number;
  color: THREE.Color;
  gravity: number;
  damp: number;
}

function mkPool(n: number): P[] {
  return Array.from({ length: n }, () => ({
    alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    life: 0, maxLife: 1, size: 0.05, grow: 0, color: new THREE.Color(1, 1, 1),
    gravity: 0, damp: 0,
  }));
}

function dotTexture(soft: boolean): THREE.Texture {
  const { canvas, ctx } = makeCanvas(64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(soft ? 0.35 : 0.7, soft ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(canvas, { repeat: false });
}

class PointCloud {
  pool: P[];
  points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private posAttr: THREE.BufferAttribute;
  private colAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;

  constructor(max: number, additive: boolean, soft: boolean, baseSize: number) {
    this.pool = mkPool(max);
    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(max * 3), 3);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(max * 4), 4);
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(max), 1);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('pcolor', this.colAttr);
    this.geo.setAttribute('psize', this.sizeAttr);
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(28, 3, 20), 400);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: dotTexture(soft) },
        uScale: { value: 780 * baseSize },
      },
      vertexShader: `
        attribute vec4 pcolor;
        attribute float psize;
        varying vec4 vColor;
        uniform float uScale;
        void main() {
          vColor = pcolor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(psize * uScale / max(0.4, -mv.z), 0.5, 220.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec4 vColor;
        void main() {
          vec4 tex = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(vColor.rgb * tex.rgb, vColor.a * tex.a);
          if (gl_FragColor.a < 0.004) discard;
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
  }

  spawn(pos: THREE.Vector3, vel: THREE.Vector3, life: number, size: number, color: THREE.Color, gravity: number, damp: number, grow = 0): void {
    const p = this.pool.find((q) => !q.alive);
    if (!p) return;
    p.alive = true;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.life = 0;
    p.maxLife = life;
    p.size = size;
    p.grow = grow;
    p.color.copy(color);
    p.gravity = gravity;
    p.damp = damp;
  }

  step(dt: number): void {
    let i = 0;
    for (const p of this.pool) {
      if (p.alive) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.alive = false;
        } else {
          p.vel.y -= p.gravity * dt;
          if (p.damp > 0) {
            const k = Math.exp(-p.damp * dt);
            p.vel.multiplyScalar(k);
          }
          p.pos.addScaledVector(p.vel, dt);
          p.size += p.grow * dt;
        }
      }
      const t = p.alive ? 1 - p.life / p.maxLife : 0;
      this.posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      this.colAttr.setXYZW(i, p.color.r, p.color.g, p.color.b, p.alive ? t : 0);
      this.sizeAttr.setX(i, p.size);
      i++;
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
  }
}

interface Casing {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  rotVel: THREE.Vector3;
  life: number;
}

interface TracerSeg {
  alive: boolean;
  a: THREE.Vector3;
  b: THREE.Vector3;
  life: number;
}

const SURFACE_FX: Record<string, { color: number; sparks: boolean; dust: number }> = {
  concrete: { color: 0xb9b6ae, sparks: false, dust: 1 },
  drywall: { color: 0xe4e0d6, sparks: false, dust: 1.2 },
  wood: { color: 0xa87c4f, sparks: false, dust: 0.8 },
  metal: { color: 0xffd27a, sparks: true, dust: 0.25 },
  glass: { color: 0xd6ecf2, sparks: false, dust: 0.4 },
  carpet: { color: 0x8b8f96, sparks: false, dust: 0.9 },
  tile: { color: 0xd8d5cc, sparks: false, dust: 0.8 },
  vinyl: { color: 0xcfc8b8, sparks: false, dust: 0.7 },
  snow: { color: 0xeef4fa, sparks: false, dust: 1.3 },
  plastic: { color: 0xc8c8c8, sparks: false, dust: 0.5 },
  paper: { color: 0xf0ead8, sparks: false, dust: 1 },
  fabric: { color: 0x9a9aa2, sparks: false, dust: 0.8 },
  flesh: { color: 0xa03028, sparks: false, dust: 0.5 },
  ice: { color: 0xd8ecf8, sparks: false, dust: 0.6 },
};

export class FxSystem {
  readonly group = new THREE.Group();
  private sparks: PointCloud;
  private smoke: PointCloud;
  private debris: THREE.InstancedMesh;
  private debrisData: P[];
  private casings: THREE.InstancedMesh;
  private casingData: Casing[];
  private tracerMesh: THREE.InstancedMesh;
  private tracers: TracerSeg[];
  private decals: THREE.Mesh[];
  private decalIdx = 0;
  private bloodPools: THREE.Mesh[] = [];
  private bloodPoolIdx = 0;
  private muzzleLight: THREE.PointLight;
  private muzzleT = 0;
  private col: CollisionWorld;
  private rand = 1;
  particleScale = 1;
  /** smoke volumes blocking AI vision */
  visionBlockers: { center: THREE.Vector3; r: number; until: number }[] = [];
  private timeNow = 0;

  constructor(col: CollisionWorld) {
    this.col = col;
    this.group.name = 'fx';
    this.sparks = new PointCloud(MAX_SPARKS, true, false, 0.045);
    this.smoke = new PointCloud(MAX_SMOKE, false, true, 0.6);
    this.group.add(this.sparks.points, this.smoke.points);

    this.debrisData = mkPool(MAX_DEBRIS);
    this.debris = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
      MAX_DEBRIS,
    );
    this.debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debris.frustumCulled = false;
    this.group.add(this.debris);

    this.casingData = Array.from({ length: MAX_CASINGS }, () => ({
      alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      rot: new THREE.Euler(), rotVel: new THREE.Vector3(), life: 0,
    }));
    this.casings = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.024, 6),
      new THREE.MeshStandardMaterial({ color: 0xc8a44a, roughness: 0.3, metalness: 0.9 }),
      MAX_CASINGS,
    );
    this.casings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.casings.frustumCulled = false;
    this.group.add(this.casings);

    this.tracers = Array.from({ length: MAX_TRACERS }, () => ({
      alive: false, a: new THREE.Vector3(), b: new THREE.Vector3(), life: 0,
    }));
    this.tracerMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.012, 0.012, 1),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
      MAX_TRACERS,
    );
    this.tracerMesh.frustumCulled = false;
    this.tracerMesh.renderOrder = 21;
    this.group.add(this.tracerMesh);

    // bullet-hole decal pool
    this.decals = [];
    const holeTex = bulletHoleTexture();
    for (let i = 0; i < MAX_DECALS; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.09, 0.09),
        new THREE.MeshBasicMaterial({
          map: holeTex, transparent: true, depthWrite: false,
          polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
        }),
      );
      m.visible = false;
      m.renderOrder = 12;
      this.decals.push(m);
      this.group.add(m);
    }

    // blood pool decals under fallen enemies (reduced-blood honored)
    const bloodTexture = bloodPoolTexture();
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({
          map: bloodTexture, transparent: true, depthWrite: false, roughness: 0.35,
          polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        }),
      );
      m.visible = false;
      m.renderOrder = 5;
      this.bloodPools.push(m);
      this.group.add(m);
    }

    this.muzzleLight = new THREE.PointLight(0xffc878, 0, 9, 2);
    this.group.add(this.muzzleLight);

    events.on('impact', ({ surface, pos, normal }) => {
      this.impact(surface as SurfaceKind, new THREE.Vector3(...pos), new THREE.Vector3(...normal));
    });
    events.on('glass:broken', ({ id }) => {
      if (id.endsWith(':crack')) return;
    });
  }

  private rnd(): number {
    this.rand = (this.rand * 16807) % 2147483647;
    return (this.rand & 0xfffff) / 0xfffff;
  }

  impact(surface: SurfaceKind, pos: THREE.Vector3, normal: THREE.Vector3): void {
    const fx = SURFACE_FX[surface] ?? SURFACE_FX.concrete;
    const color = new THREE.Color(fx.color);
    const isBlood = surface === 'flesh';
    const reduced = settings.get('reducedBlood');
    if (isBlood && reduced) return;
    const n = Math.round((isBlood ? 7 : 6) * this.particleScale);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(
        normal.x + (this.rnd() - 0.5) * 1.6,
        normal.y + (this.rnd() - 0.5) * 1.6 + 0.5,
        normal.z + (this.rnd() - 0.5) * 1.6,
      ).multiplyScalar(isBlood ? 1.6 : 2.4);
      this.sparks.spawn(pos, v, 0.22 + this.rnd() * 0.2, isBlood ? 0.05 : 0.035, color, 7, 2.5);
    }
    if (fx.sparks) {
      for (let i = 0; i < 5 * this.particleScale; i++) {
        const v = new THREE.Vector3((this.rnd() - 0.5), this.rnd() * 0.8 + 0.3, (this.rnd() - 0.5)).multiplyScalar(5);
        this.sparks.spawn(pos, v, 0.3 + this.rnd() * 0.25, 0.02, new THREE.Color(0xffe9a0), 10, 1);
      }
    }
    // dust puff
    for (let i = 0; i < Math.round(2 * fx.dust * this.particleScale); i++) {
      const v = normal.clone().multiplyScalar(0.7).add(new THREE.Vector3((this.rnd() - 0.5) * 0.5, 0.3, (this.rnd() - 0.5) * 0.5));
      this.smoke.spawn(pos, v, 0.5 + this.rnd() * 0.4, 0.14, color.clone().multiplyScalar(0.9), -0.2, 1.6, 0.5);
    }
    // debris chunks
    if (!isBlood) {
      for (let i = 0; i < 2 * this.particleScale; i++) {
        const p = this.debrisData.find((q) => !q.alive);
        if (!p) break;
        p.alive = true;
        p.pos.copy(pos);
        p.vel.set(normal.x * 2 + (this.rnd() - 0.5) * 2.4, 1.6 + this.rnd() * 1.6, normal.z * 2 + (this.rnd() - 0.5) * 2.4);
        p.life = 0;
        p.maxLife = 0.9 + this.rnd() * 0.5;
        p.color.copy(color);
        p.gravity = 11;
        p.size = 0.5 + this.rnd();
      }
    }
    // decal on static surfaces (walls/floors)
    if (!isBlood && surface !== 'glass' && surface !== 'snow') {
      this.placeDecal(pos, normal);
    }
  }

  private placeDecal(pos: THREE.Vector3, normal: THREE.Vector3): void {
    const m = this.decals[this.decalIdx];
    this.decalIdx = (this.decalIdx + 1) % MAX_DECALS;
    m.visible = true;
    m.position.copy(pos).addScaledVector(normal, 0.006);
    const target = pos.clone().add(normal);
    m.lookAt(target);
    m.rotation.z = this.rnd() * Math.PI * 2;
  }

  clearDecals(): void {
    for (const d of this.decals) d.visible = false;
  }

  muzzleFlash(worldPos: THREE.Vector3, big: boolean): void {
    this.muzzleLight.position.copy(worldPos);
    this.muzzleLight.intensity = big ? 26 : 14;
    this.muzzleT = 0.05;
    for (let i = 0; i < 3; i++) {
      const v = new THREE.Vector3((this.rnd() - 0.5), (this.rnd() - 0.3), (this.rnd() - 0.5)).multiplyScalar(1.2);
      this.smoke.spawn(worldPos, v, 0.4 + this.rnd() * 0.3, 0.08, new THREE.Color(0xbcbcc0), -0.4, 2, 0.35);
    }
  }

  tracer(a: THREE.Vector3, b: THREE.Vector3): void {
    const t = this.tracers.find((q) => !q.alive);
    if (!t) return;
    t.alive = true;
    t.a.copy(a);
    t.b.copy(b);
    t.life = 0;
  }

  ejectCasing(pos: THREE.Vector3, rightDir: THREE.Vector3): void {
    const c = this.casingData.find((q) => !q.alive);
    if (!c) return;
    c.alive = true;
    c.pos.copy(pos);
    c.vel.copy(rightDir).multiplyScalar(1.4 + this.rnd()).add(new THREE.Vector3(0, 1.8 + this.rnd(), 0));
    c.rotVel.set(this.rnd() * 14, this.rnd() * 14, this.rnd() * 14);
    c.life = 0;
  }

  bloodBurst(pos: THREE.Vector3, dir: THREE.Vector3): void {
    if (settings.get('reducedBlood')) return;
    const color = new THREE.Color(0x8a1f18);
    for (let i = 0; i < 8 * this.particleScale; i++) {
      const v = dir.clone().multiplyScalar(1.2).add(new THREE.Vector3((this.rnd() - 0.5) * 2, this.rnd() * 1.4, (this.rnd() - 0.5) * 2));
      this.sparks.spawn(pos, v, 0.3 + this.rnd() * 0.2, 0.045, color, 8, 2);
    }
  }

  /** floor blood pool under a fallen character */
  bloodPool(pos: THREE.Vector3): void {
    if (settings.get('reducedBlood')) return;
    const floor = this.col.floorHeight(pos.x, pos.z, pos.y + 0.5, -1);
    if (floor === null) return;
    const m = this.bloodPools[this.bloodPoolIdx];
    this.bloodPoolIdx = (this.bloodPoolIdx + 1) % this.bloodPools.length;
    m.visible = true;
    m.position.set(pos.x + (this.rnd() - 0.5) * 0.3, floor + 0.008, pos.z + (this.rnd() - 0.5) * 0.3);
    m.rotation.y = this.rnd() * Math.PI * 2;
    const s = 0.7 + this.rnd() * 0.5;
    m.scale.set(s, 1, s);
  }

  smokeVolume(pos: THREE.Vector3, until: number): void {
    this.visionBlockers.push({ center: pos.clone().add(new THREE.Vector3(0, 0.9, 0)), r: 2.6, until });
    for (let i = 0; i < 26 * this.particleScale; i++) {
      const a = this.rnd() * Math.PI * 2;
      const r = this.rnd() * 1.4;
      const p = pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0.2 + this.rnd() * 1.6, Math.sin(a) * r));
      const v = new THREE.Vector3((this.rnd() - 0.5) * 0.3, 0.12 + this.rnd() * 0.18, (this.rnd() - 0.5) * 0.3);
      this.smoke.spawn(p, v, 9 + this.rnd() * 4, 0.8 + this.rnd() * 0.8, new THREE.Color(0xd8dce0), -0.02, 0.4, 0.16);
    }
  }

  flashBurst(pos: THREE.Vector3): void {
    this.muzzleLight.position.copy(pos);
    this.muzzleLight.intensity = 300;
    this.muzzleLight.distance = 24;
    this.muzzleT = 0.22;
    for (let i = 0; i < 16; i++) {
      const v = new THREE.Vector3((this.rnd() - 0.5), (this.rnd() - 0.2), (this.rnd() - 0.5)).multiplyScalar(6);
      this.sparks.spawn(pos, v, 0.3, 0.08, new THREE.Color(0xffffff), 4, 2);
    }
  }

  step(dt: number, time: number): void {
    this.timeNow = time;
    this.sparks.step(dt);
    this.smoke.step(dt);
    // debris
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    let i = 0;
    for (const p of this.debrisData) {
      if (p.alive) {
        p.life += dt;
        if (p.life >= p.maxLife) p.alive = false;
        p.vel.y -= p.gravity * dt;
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y < 0.02) {
          p.pos.y = 0.02;
          p.vel.y *= -0.3;
          p.vel.x *= 0.7;
          p.vel.z *= 0.7;
        }
      }
      q.setFromEuler(new THREE.Euler(p.life * 6, p.life * 5, 0));
      s.setScalar(p.alive ? p.size : 0.0001);
      m4.compose(p.pos, q, s);
      this.debris.setMatrixAt(i, m4);
      if (p.alive) this.debris.setColorAt(i, p.color);
      i++;
    }
    this.debris.instanceMatrix.needsUpdate = true;
    if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;

    // casings
    i = 0;
    for (const c of this.casingData) {
      if (c.alive) {
        c.life += dt;
        if (c.life > 7) c.alive = false;
        c.vel.y -= 12 * dt;
        c.pos.addScaledVector(c.vel, dt);
        c.rot.x += c.rotVel.x * dt;
        c.rot.z += c.rotVel.z * dt;
        const floor = this.col.floorHeight(c.pos.x, c.pos.z, c.pos.y + 0.2, -1);
        if (floor !== null && c.pos.y < floor + 0.012) {
          c.pos.y = floor + 0.012;
          if (Math.abs(c.vel.y) > 0.4) {
            c.vel.y *= -0.35;
            c.vel.x *= 0.6;
            c.vel.z *= 0.6;
            events.emit('noise', { pos: [c.pos.x, c.pos.y, c.pos.z], radius: 1.2, kind: 'casing' });
          } else {
            c.vel.set(0, 0, 0);
            c.rotVel.set(0, 0, 0);
            c.rot.x = Math.PI / 2;
          }
        }
      }
      q.setFromEuler(c.rot);
      s.setScalar(c.alive ? 1 : 0.0001);
      m4.compose(c.pos, q, s);
      this.casings.setMatrixAt(i, m4);
      i++;
    }
    this.casings.instanceMatrix.needsUpdate = true;

    // tracers
    i = 0;
    const dir = new THREE.Vector3();
    for (const t of this.tracers) {
      if (t.alive) {
        t.life += dt;
        if (t.life > 0.08) t.alive = false;
      }
      if (t.alive) {
        dir.subVectors(t.b, t.a);
        const len = dir.length();
        const mid = t.a.clone().addScaledVector(dir, 0.5);
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
        s.set(1, 1, len);
        m4.compose(mid, q, s);
      } else {
        s.setScalar(0.0001);
        m4.compose(new THREE.Vector3(0, -50, 0), q.identity(), s);
      }
      this.tracerMesh.setMatrixAt(i, m4);
      i++;
    }
    this.tracerMesh.instanceMatrix.needsUpdate = true;

    // muzzle light decay
    if (this.muzzleT > 0) {
      this.muzzleT -= dt;
      if (this.muzzleT <= 0) {
        this.muzzleLight.intensity = 0;
        this.muzzleLight.distance = 9;
      }
    }
    // cull expired vision blockers
    this.visionBlockers = this.visionBlockers.filter((b) => b.until > time);
  }

  reset(): void {
    for (const p of this.sparks.pool) p.alive = false;
    for (const p of this.smoke.pool) p.alive = false;
    for (const p of this.debrisData) p.alive = false;
    for (const c of this.casingData) c.alive = false;
    for (const t of this.tracers) t.alive = false;
    for (const b of this.bloodPools) b.visible = false;
    this.visionBlockers = [];
    this.clearDecals();
    this.muzzleLight.intensity = 0;
  }
}

function bloodPoolTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(88,16,10,0.75)';
  ctx.beginPath();
  for (let a = 0; a <= 40; a++) {
    const ang = (a / 40) * Math.PI * 2;
    const r = 36 * (0.7 + hash2(a, 33) * 0.5);
    const x = 64 + Math.cos(ang) * r;
    const y = 64 + Math.sin(ang) * r;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(64 + Math.cos(ang - 0.08) * r * 1.08, 64 + Math.sin(ang - 0.08) * r * 1.08, x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(70,12,8,0.5)';
  ctx.beginPath();
  ctx.arc(64, 64, 20, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = `rgba(88,16,10,${0.4 + hash2(i, 44) * 0.3})`;
    ctx.beginPath();
    ctx.arc(64 + (hash2(i, 45) - 0.5) * 100, 64 + (hash2(i, 46) - 0.5) * 100, 2 + hash2(i, 47) * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, { repeat: false });
}

function bulletHoleTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(64);
  ctx.clearRect(0, 0, 64, 64);
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(12,10,8,0.95)');
  g.addColorStop(0.28, 'rgba(30,26,22,0.8)');
  g.addColorStop(0.6, 'rgba(60,54,46,0.28)');
  g.addColorStop(1, 'rgba(60,54,46,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  // chips
  for (let i = 0; i < 8; i++) {
    const a = hash2(i, 5) * Math.PI * 2;
    const r = 8 + hash2(i, 6) * 14;
    ctx.fillStyle = `rgba(20,18,14,${0.5 - hash2(i, 7) * 0.3})`;
    ctx.beginPath();
    ctx.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 1.5 + hash2(i, 8) * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, { repeat: false });
}
