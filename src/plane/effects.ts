import * as THREE from 'three';
import { CONTRAIL_MATERIAL, HullStamp, WakeTrail, type WakeBatch } from '../render/wakes';
import type { FlightModel } from './physics';
import type { PlaneModel } from './model';
import { clamp, smoothstep } from '../core/noise';
import { Rng } from '../core/seed';

function spriteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; age: number; size: number; }

class ParticleCloud {
  readonly points: THREE.Points;
  private readonly particles: Particle[] = [];
  private readonly positions: Float32Array;
  private readonly alphas: Float32Array;
  private readonly sizes: Float32Array;
  private readonly geo: THREE.BufferGeometry;

  constructor(readonly capacity: number, color: THREE.Color, tex: THREE.Texture, opacity: number, blending: THREE.Blending) {
    this.positions = new Float32Array(capacity * 3);
    this.alphas = new Float32Array(capacity);
    this.sizes = new Float32Array(capacity);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uColor: { value: color }, uOpacity: { value: opacity }, uScale: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aAlpha; attribute float aSize; varying float vAlpha;
        uniform float uScale;
        void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
        void main() { vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vAlpha * uOpacity); }
      `,
      transparent: true, depthWrite: false, blending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.geo.setDrawRange(0, 0);
  }

  emit(p: Particle): void {
    if (this.particles.length >= this.capacity) this.particles.shift();
    this.particles.push(p);
  }

  clear(): void {
    this.particles.length = 0;
    this.geo.setDrawRange(0, 0);
  }

  update(dt: number, gravity: number, drag: number, scale: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = scale;
    let n = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) { this.particles.splice(i, 1); continue; }
      p.vy -= gravity * dt;
      const d = Math.exp(-drag * dt);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05 && gravity > 0) { p.y = 0.05; p.vy = 0; }
      const k = p.age / p.life;
      this.positions[n * 3] = p.x; this.positions[n * 3 + 1] = p.y; this.positions[n * 3 + 2] = p.z;
      this.alphas[n] = Math.sin(k * Math.PI) * (1 - k * 0.5);
      this.sizes[n] = p.size * (0.6 + k * 1.2);
      n++;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.setDrawRange(0, n);
  }
}

/** Float wakes, bow spray, exhaust smoke and wingtip condensation trails. */
export class PlaneEffects {
  readonly wakeL: WakeTrail;
  readonly wakeR: WakeTrail;
  readonly spray: ParticleCloud;
  readonly exhaust: ParticleCloud;
  readonly vortexL: WakeTrail;
  readonly vortexR: WakeTrail;
  /** static waterline/foam ring under each float while afloat (trails only exist once moving) */
  readonly stampL: HullStamp;
  readonly stampR: HullStamp;
  private readonly tmp = new THREE.Vector3();
  private readonly tmp3 = new THREE.Vector3();
  /** seeded so spray/exhaust are reproducible frame-for-frame in the benchmark clips */
  private rng = new Rng('plane-effects');
  private readonly tmp2 = new THREE.Vector3();
  private sprayAcc = 0;
  private exhaustAcc = 0;

  constructor(wakes: WakeBatch, scene: THREE.Scene) {
    this.wakeL = new WakeTrail(70, 1.6, 14, 1.2, wakes);
    this.wakeR = new WakeTrail(70, 1.6, 14, 1.2, wakes);
    // hull plan of the floats (5.7 m x 0.74 m at the chine), see model.ts floatSections
    this.stampL = new HullStamp(5.6, 0.74, 0.9);
    this.stampR = new HullStamp(5.6, 0.74, 0.9);
    scene.add(this.stampL.mesh, this.stampR.mesh);
    const tex = spriteTexture();
    this.spray = new ParticleCloud(400, new THREE.Color(0.95, 0.98, 1.0), tex, 0.75, THREE.NormalBlending);
    this.exhaust = new ParticleCloud(120, new THREE.Color(0.25, 0.24, 0.23), tex, 0.22, THREE.NormalBlending);
    scene.add(this.spray.points, this.exhaust.points);
    this.vortexL = new WakeTrail(90, 0.5, 2.2, 0.6, CONTRAIL_MATERIAL);
    this.vortexR = new WakeTrail(90, 0.5, 2.2, 0.6, CONTRAIL_MATERIAL);
    scene.add(this.vortexL.mesh!, this.vortexR.mesh!);
  }

  /** Drop every trail, particle and decal (used when the aircraft is re-placed). */
  reset(): void {
    this.wakeL.reset(); this.wakeR.reset(); this.vortexL.reset(); this.vortexR.reset();
    this.spray.clear(); this.exhaust.clear();
    this.stampL.mesh.visible = false; this.stampR.mesh.visible = false;
    this.sprayAcc = 0; this.exhaustAcc = 0;
    this.rng = new Rng('plane-effects');
  }

  update(flight: FlightModel, model: PlaneModel, dt: number, time: number, pixelHeight: number): void {
    const t = flight.telemetry;
    const q = flight.quaternion;
    const speed = t.groundSpeed;
    // float wakes (only while the floats touch the water)
    const sternL = this.tmp.copy(model.floatSternL).applyQuaternion(q).add(flight.position);
    const sternR = this.tmp2.copy(model.floatSternR).applyQuaternion(q).add(flight.position);
    const wet = t.onWater && speed > 1.5;
    this.wakeL.update(sternL.x, sternL.z, time, wet, speed);
    this.wakeR.update(sternR.x, sternR.z, time, wet, speed);
    // hull contact stamps at the float centres; fade out as the trails and spray take over when planing
    const fwdXZ = flight.forward(this.tmp3);
    const fl = Math.hypot(fwdXZ.x, fwdXZ.z) || 1;
    const stampStrength = 0.9 * (1 - smoothstep(6, 18, speed));
    for (const [stamp, bow, stern] of [[this.stampL, model.floatBowL, model.floatSternL], [this.stampR, model.floatBowR, model.floatSternR]] as const) {
      // the hull's plan centre sits 0.1 m behind the midpoint of the bow / stern hardpoints
      const c = this.tmp.copy(bow).add(stern).multiplyScalar(0.5).setX(0.5 * (bow.x + stern.x) - 0.1).applyQuaternion(q).add(flight.position);
      stamp.update(c.x, c.z, fwdXZ.x / fl, fwdXZ.z / fl, t.onWater && stampStrength > 0.02, stampStrength);
    }
    // bow spray: rate grows with speed while on the water, dies once planing cleanly
    if (t.onWater && speed > 4) {
      const rate = 90 * smoothstep(4, 14, speed) * (1 - 0.5 * smoothstep(25, 40, speed));
      this.sprayAcc += rate * dt;
      const fwd = flight.forward(new THREE.Vector3());
      while (this.sprayAcc >= 1) {
        this.sprayAcc -= 1;
        for (const bow of [model.floatBowL, model.floatBowR]) {
          const p = this.tmp.copy(bow).applyQuaternion(q).add(flight.position);
          const side = bow.z > 0 ? 1 : -1;
          const right = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
          this.spray.emit({ x: p.x, y: 0.1, z: p.z, vx: fwd.x * speed * 0.35 + right.x * side * (2 + this.rng.next() * 3) + (this.rng.next() - 0.5) * 2, vy: 2.5 + this.rng.next() * 3.5 + speed * 0.08, vz: fwd.z * speed * 0.35 + right.z * side * (2 + this.rng.next() * 3) + (this.rng.next() - 0.5) * 2, life: 0.7 + this.rng.next() * 0.6, age: 0, size: 0.6 + this.rng.next() * 0.8 });
        }
      }
    }
    this.spray.update(dt, 9.81, 1.2, pixelHeight * 0.9);
    // exhaust: faint dark puffs, more when the throttle is high
    if (t.rpm > 0.2) {
      this.exhaustAcc += (10 + 25 * t.rpm) * dt;
      const fwd = flight.forward(new THREE.Vector3());
      while (this.exhaustAcc >= 1) {
        this.exhaustAcc -= 1;
        const p = this.tmp.copy(model.exhaustPos).applyQuaternion(q).add(flight.position);
        this.exhaust.emit({ x: p.x, y: p.y, z: p.z, vx: flight.velocity.x - fwd.x * 6 + (this.rng.next() - 0.5), vy: flight.velocity.y - 1.5 + this.rng.next() * 1.5, vz: flight.velocity.z - fwd.z * 6 + (this.rng.next() - 0.5), life: 0.35 + this.rng.next() * 0.3, age: 0, size: 0.35 + this.rng.next() * 0.3 });
      }
    }
    this.exhaust.update(dt, -0.3, 2.5, pixelHeight * 0.9);
    // wingtip condensation when pulling hard at speed (humid tropical air)
    const gpull = clamp((t.alpha - 0.13) / 0.12, 0, 1) * smoothstep(35, 55, t.airspeed);
    const tipL = this.tmp.copy(model.wingTipL).applyQuaternion(q).add(flight.position);
    const tipR = this.tmp2.copy(model.wingTipR).applyQuaternion(q).add(flight.position);
    this.vortexL.update(tipL.x, tipL.z, time, gpull > 0.05, t.airspeed);
    this.vortexR.update(tipR.x, tipR.z, time, gpull > 0.05, t.airspeed);
    this.vortexL.mesh!.position.y = tipL.y; this.vortexL.mesh!.updateMatrix();
    this.vortexR.mesh!.position.y = tipR.y; this.vortexR.mesh!.updateMatrix();
    (this.vortexL.mesh!.material as THREE.ShaderMaterial).uniforms.uStrength.value = gpull * 0.7;
    (this.vortexR.mesh!.material as THREE.ShaderMaterial).uniforms.uStrength.value = gpull * 0.7;
  }
}
