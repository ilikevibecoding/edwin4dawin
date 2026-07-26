import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import { QUALITY } from '../core/Config';
import type { PlayerSystem } from '../player/Player';
import type { PhysicsSystem } from '../physics/Physics';
import type { LevelSystem } from '../world/Level';
import type { LightingSystem } from '../render/Lighting';
import type { AISystem } from '../ai/AISystem';
import { buildJet, type JetModel } from './Jet';

type Phase = 'idle' | 'targeting' | 'inbound' | 'running' | 'egress';

interface Bomb {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  mesh: THREE.Mesh;
  armed: boolean;
  fuseTime: number;
}

interface Jet {
  model: JetModel;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Distance along the attack run at which this jet releases. */
  releaseAt: number;
  released: boolean;
  bombsLeft: number;
  releaseTimer: number;
  bankTarget: number;
  bank: number;
  /** Seconds until the jet enters the map. */
  delay: number;
  active: boolean;
}

/**
 * Airstrike killstreak.
 *
 * Flow: the player designates a point on the map, then drags to set the
 * attack heading. A flight of two aircraft ingresses from over the horizon on
 * that bearing, releases a stick of retarded bombs along the axis, and egresses
 * with a climbing break turn.
 *
 * The details that make it land:
 *  - The aircraft are audible and visible before anything explodes, so the
 *    player (and the AI) get a beat of anticipation.
 *  - Bombs are physical objects with drag and ballute retardation, released in
 *    a timed stick, so the impacts walk across the target rather than all
 *    landing on one point.
 *  - Sound is deliberately desynchronised from light: the flash arrives
 *    instantly, the report at 343 m/s. At 60 m that is a fifth of a second,
 *    and the brain reads it immediately as scale.
 */
export class AirstrikeSystem implements System {
  readonly name = 'airstrike';
  readonly order = 35;

  phase: Phase = 'idle';
  /** True while the player is choosing a target. */
  get targeting(): boolean {
    return this.phase === 'targeting';
  }

  /** Confirmed target point and attack heading, in radians. */
  readonly target = new THREE.Vector3();
  heading = 0;
  /** 0..1 progress while the strike is inbound, for the HUD. */
  inboundProgress = 0;
  inboundSeconds = 0;

  private ctx!: EngineContext;
  private player!: PlayerSystem;
  private physics!: PhysicsSystem;
  private level!: LevelSystem;
  private lighting!: LightingSystem;
  private ai!: AISystem;

  private readonly group = new THREE.Group();
  private readonly jets: Jet[] = [];
  private readonly bombs: Bomb[] = [];
  private bombGeometry!: THREE.BufferGeometry;
  private bombMaterial!: THREE.MeshStandardMaterial;

  private markerGroup!: THREE.Group;
  private markerRing!: THREE.Mesh;
  private markerArrow!: THREE.Mesh;
  private markerBeam!: THREE.Mesh;
  private markerValid = false;

  private headingLocked = false;
  private timer = 0;
  private strikeCentre = new THREE.Vector3();

  private readonly _v = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _q = new THREE.Quaternion();

  /** Damage profile of one bomb. */
  private readonly bombRadius = 13.5;
  private readonly bombDamage = 340;

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.player = ctx.get<PlayerSystem>('player')!;
    this.physics = ctx.get<PhysicsSystem>('physics')!;
    this.level = ctx.get<LevelSystem>('level')!;
    this.lighting = ctx.get<LightingSystem>('lighting')!;
    this.ai = ctx.get<AISystem>('ai')!;

    this.group.name = 'airstrike';
    ctx.scene.add(this.group);

    this.buildBombAssets();
    this.buildMarker();

    for (let i = 0; i < 2; i++) {
      const model = buildJet(this.level.materials);
      model.group.visible = false;
      this.group.add(model.group);
      this.jets.push({
        model,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        releaseAt: 0,
        released: false,
        bombsLeft: 5,
        releaseTimer: 0,
        bankTarget: 0,
        bank: 0,
        delay: i * 1.35,
        active: false,
      });
    }

    Signals.on('killstreak:armed', ({ id }) => {
      if (id === 'airstrike') this.beginTargeting();
    });
    Signals.on('killstreak:cancelled', ({ id }) => {
      if (id === 'airstrike') this.cancelTargeting();
    });
  }

  private buildBombAssets(): void {
    // Mk-82 style: cylindrical body, ogive nose, boxed retarder fins.
    const parts: THREE.BufferGeometry[] = [];
    const body = new THREE.CylinderGeometry(0.14, 0.14, 1.5, 12);
    body.rotateX(Math.PI / 2);
    parts.push(body);
    const nose = new THREE.ConeGeometry(0.14, 0.42, 12);
    nose.rotateX(-Math.PI / 2);
    nose.translate(0, 0, -0.96);
    parts.push(nose);
    const tail = new THREE.CylinderGeometry(0.1, 0.14, 0.3, 12);
    tail.rotateX(Math.PI / 2);
    tail.translate(0, 0, 0.9);
    parts.push(tail);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.BoxGeometry(0.02, 0.34, 0.34);
      fin.translate(0, 0.2, 0.86);
      fin.rotateZ((i / 4) * Math.PI * 2);
      parts.push(fin);
    }

    const merged = new THREE.BufferGeometry();
    // Simple concat: all parts are non-indexed after toNonIndexed.
    const flat = parts.map((g) => g.toNonIndexed());
    let total = 0;
    for (const g of flat) total += (g.getAttribute('position') as THREE.BufferAttribute).count;
    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const uv = new Float32Array(total * 2);
    let o = 0;
    for (const g of flat) {
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      const n = g.getAttribute('normal') as THREE.BufferAttribute;
      pos.set(p.array as Float32Array, o * 3);
      nor.set(n.array as Float32Array, o * 3);
      const u = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
      if (u) uv.set(u.array as Float32Array, o * 2);
      o += p.count;
      g.dispose();
    }
    for (const g of parts) g.dispose();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.bombGeometry = merged;

    this.bombMaterial = this.level.materials.get('paintedMetalGreen', {
      scale: 0.5,
      color: 0x9aa08e,
      roughness: 0.62,
      metalness: 0.85,
    });
  }

  private buildMarker(): void {
    this.markerGroup = new THREE.Group();
    this.markerGroup.visible = false;
    this.ctx.scene.add(this.markerGroup);

    // Ground ring showing the blast footprint.
    const ringGeo = new THREE.RingGeometry(1, 1.06, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0.15, 1.0, 0.55) },
        uTime: { value: 0 },
        uValid: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uValid;
        void main() {
          // Dashed, rotating ring — reads as a targeting overlay rather than
          // a decal painted on the ground.
          float dash = step(0.42, fract(vUv.x * 48.0 + uTime * 0.35));
          vec3 c = mix(vec3(1.0, 0.25, 0.16), uColor, uValid);
          float pulse = 0.7 + 0.3 * sin(uTime * 6.0);
          gl_FragColor = vec4(c * 2.4 * pulse, dash * 0.9);
        }
      `,
    });
    this.markerRing = new THREE.Mesh(ringGeo, ringMat);
    this.markerRing.renderOrder = 900;
    this.markerGroup.add(this.markerRing);

    // Heading arrow showing the attack axis.
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 3.2);
    arrowShape.lineTo(-1.1, 1.4);
    arrowShape.lineTo(-0.4, 1.4);
    arrowShape.lineTo(-0.4, -3.4);
    arrowShape.lineTo(0.4, -3.4);
    arrowShape.lineTo(0.4, 1.4);
    arrowShape.lineTo(1.1, 1.4);
    arrowShape.closePath();
    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    arrowGeo.rotateX(-Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0x2effa0,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.markerArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.markerArrow.position.y = 0.06;
    this.markerArrow.renderOrder = 901;
    this.markerGroup.add(this.markerArrow);

    // Vertical beam so the marker is visible from behind cover.
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 40, 8, 1, true);
    beamGeo.translate(0, 20, 0);
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0.15, 1.0, 0.55) }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        void main() {
          float fade = pow(1.0 - vUv.y, 2.2);
          float scan = 0.5 + 0.5 * sin(vUv.y * 60.0 - uTime * 8.0);
          gl_FragColor = vec4(uColor * (0.6 + scan * 0.5), fade * 0.4);
        }
      `,
    });
    this.markerBeam = new THREE.Mesh(beamGeo, beamMat);
    this.markerGroup.add(this.markerBeam);
  }

  // ------------------------------------------------------------ targeting --

  beginTargeting(): void {
    if (this.phase !== 'idle') return;
    this.phase = 'targeting';
    this.headingLocked = false;
    this.markerGroup.visible = true;
    Signals.emit('ui:notify', {
      title: 'AIRSTRIKE',
      subtitle: 'DESIGNATE TARGET — [FIRE] CONFIRM  ·  [AIM] CANCEL',
      tone: 'good',
    });
    Signals.emit('audio:oneshot', { id: 'ks_arm', volume: 0.8 });
  }

  cancelTargeting(): void {
    if (this.phase !== 'targeting') return;
    this.phase = 'idle';
    this.markerGroup.visible = false;
    Signals.emit('ui:notify', { title: 'STRIKE ABORTED', tone: 'bad' });
  }

  private updateTargeting(dt: number, ctx: EngineContext): void {
    const cam = ctx.camera;
    const dir = this._v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const hit = this.physics.trace(cam.position, dir, 300);

    this.markerValid = hit.hit && hit.normal.y > 0.45 && this.level.bounds.containsPoint(hit.point);

    if (hit.hit) {
      if (!this.headingLocked) {
        this.target.copy(hit.point);
        this.strikeCentre.copy(hit.point);
      }
      this.markerGroup.position.copy(this.target).add(new THREE.Vector3(0, 0.08, 0));
    }

    const time = ctx.time.elapsed;
    (this.markerRing.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    (this.markerRing.material as THREE.ShaderMaterial).uniforms.uValid.value = this.markerValid ? 1 : 0;
    (this.markerBeam.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    this.markerRing.scale.setScalar(this.bombRadius * 1.6);

    if (this.headingLocked) {
      // Second stage: the player sweeps the aim point to set the attack axis.
      const to = this._v2.copy(hit.point).sub(this.target);
      if (to.lengthSq() > 1) this.heading = Math.atan2(to.x, to.z);
      this.markerArrow.rotation.y = this.heading;
      this.markerArrow.visible = true;
      this.markerArrow.scale.setScalar(this.bombRadius * 0.42);
    } else {
      this.markerArrow.visible = false;
    }

    const input = ctx.input;
    if (input.pressed('ads')) {
      this.cancelTargeting();
      return;
    }
    if (input.pressed('fire')) {
      if (!this.markerValid) {
        Signals.emit('audio:oneshot', { id: 'ui_error', volume: 0.6 });
        Signals.emit('ui:notify', { title: 'INVALID TARGET', tone: 'bad' });
        return;
      }
      if (!this.headingLocked) {
        this.headingLocked = true;
        Signals.emit('ui:notify', {
          title: 'SET ATTACK HEADING',
          subtitle: 'SWEEP TO AIM  ·  [FIRE] CONFIRM',
          tone: 'neutral',
        });
        Signals.emit('audio:oneshot', { id: 'ui_confirm', volume: 0.7 });
      } else {
        this.launch();
      }
    }
    void dt;
  }

  // --------------------------------------------------------------- launch --

  launch(): void {
    this.phase = 'inbound';
    this.timer = 0;
    this.inboundSeconds = 4.6;
    this.markerGroup.visible = false;

    const heading = this.heading;
    const dirX = Math.sin(heading);
    const dirZ = Math.cos(heading);

    for (let i = 0; i < this.jets.length; i++) {
      const jet = this.jets[i];
      jet.active = false;
      jet.released = false;
      jet.bombsLeft = 5;
      jet.releaseTimer = 0;
      jet.delay = i * 1.15;
      jet.bank = 0;
      jet.bankTarget = 0;

      // Lateral offset so the two aircraft fly in a loose echelon and their
      // sticks of bombs cover a wider footprint.
      const lateral = (i - 0.5) * 26;
      const startDist = 420;
      const altitude = 118 + i * 14;
      jet.position.set(
        this.target.x - dirX * startDist - dirZ * lateral,
        altitude,
        this.target.z - dirZ * startDist + dirX * lateral,
      );
      // 240 m/s ≈ 470 kt: fast enough to feel like a strike aircraft, slow
      // enough that the player can actually watch it cross the sky.
      jet.velocity.set(dirX * 240, 0, dirZ * 240);
      jet.model.group.visible = false;

      // Release early enough that a stick of retarded bombs walks onto the
      // target rather than overflying it.
      jet.releaseAt = startDist - 190 + i * 18;
    }

    Signals.emit('killstreak:called', { id: 'airstrike', target: this.target.clone(), heading });
    Signals.emit('airstrike:inbound', {
      seconds: this.inboundSeconds,
      target: this.target.clone(),
      heading,
    });
    Signals.emit('ui:notify', {
      title: 'AIRSTRIKE INBOUND',
      subtitle: 'STAND CLEAR',
      tone: 'good',
    });
    Signals.emit('audio:oneshot', { id: 'radio_airstrike', volume: 1 });
    Signals.emit('audio:music', { cue: 'danger' });
  }

  // --------------------------------------------------------------- update --

  update(dt: number, ctx: EngineContext): void {
    switch (this.phase) {
      case 'targeting':
        this.updateTargeting(dt, ctx);
        break;
      case 'inbound':
      case 'running':
      case 'egress':
        this.updateStrike(dt, ctx);
        break;
      default:
        break;
    }
    this.updateBombs(dt);
  }

  private updateStrike(dt: number, ctx: EngineContext): void {
    this.timer += dt;
    this.inboundProgress = THREE.MathUtils.clamp(this.timer / this.inboundSeconds, 0, 1);

    let anyActive = false;
    const camPos = ctx.camera.position;

    for (const jet of this.jets) {
      if (jet.delay > 0) {
        jet.delay -= dt;
        anyActive = true;
        continue;
      }
      if (!jet.active && jet.bombsLeft > 0) {
        jet.active = true;
        jet.model.group.visible = true;
      }
      if (!jet.active) continue;

      jet.position.addScaledVector(jet.velocity, dt);

      const toTarget = this._v.copy(this.target).sub(jet.position);
      const alongTrack = -toTarget.dot(this._v2.copy(jet.velocity).normalize());
      const distToTarget = toTarget.length();

      // ---- release ----
      if (!jet.released && alongTrack > -190) {
        jet.released = true;
      }
      if (jet.released && jet.bombsLeft > 0) {
        jet.releaseTimer -= dt;
        if (jet.releaseTimer <= 0) {
          // 0.18 s spacing at 240 m/s walks the impacts ~43 m apart before
          // drag; the stick straddles the marked point.
          jet.releaseTimer = 0.18;
          this.releaseBomb(jet);
          jet.bombsLeft--;
          if (jet.bombsLeft === 0) {
            // Break turn and climb out.
            jet.bankTarget = (jet === this.jets[0] ? 1 : -1) * 1.15;
          }
        }
      }

      if (jet.bombsLeft === 0) {
        // Egress: bank, climb, and accelerate away.
        const turn = jet.bank * 0.34 * dt;
        const c = Math.cos(turn);
        const s = Math.sin(turn);
        const vx = jet.velocity.x * c - jet.velocity.z * s;
        const vz = jet.velocity.x * s + jet.velocity.z * c;
        jet.velocity.x = vx;
        jet.velocity.z = vz;
        jet.velocity.y = THREE.MathUtils.damp(jet.velocity.y, 34, 1.4, dt);
        jet.model.setAfterburner(1);
      } else {
        jet.model.setAfterburner(0.35);
      }

      jet.bank = THREE.MathUtils.damp(jet.bank, jet.bankTarget, 2.2, dt);

      // Orient along the velocity vector with bank roll.
      const forward = this._v.copy(jet.velocity).normalize();
      const up = this._v2.set(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();
      const realUp = new THREE.Vector3().crossVectors(right, forward).normalize();
      realUp.applyAxisAngle(forward, -jet.bank);
      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3().crossVectors(realUp, forward).normalize(),
        realUp,
        forward.clone().negate(),
      );
      this._q.setFromRotationMatrix(basis);
      jet.model.group.position.copy(jet.position);
      jet.model.group.quaternion.copy(this._q);
      jet.model.update(dt, jet.position, jet.velocity);

      // ---- flyby audio and shake ----
      const distToPlayer = jet.position.distanceTo(camPos);
      if (distToPlayer < 220) {
        const near = 1 - distToPlayer / 220;
        ctx.engine.pipeline.concussion = Math.max(
          ctx.engine.pipeline.concussion,
          near * near * 0.28,
        );
        if (distToPlayer < 130 && !jet.model.flybyPlayed) {
          jet.model.flybyPlayed = true;
          Signals.emit('audio:oneshot', {
            id: 'jet_flyby',
            position: jet.position.clone(),
            volume: 1,
          });
          Signals.emit('camera:shake', { amplitude: 0.05 * near, duration: 1.6, frequency: 9 });
        }
      }
      Signals.emit('airstrike:flyby', {
        position: jet.position.clone(),
        velocity: jet.velocity.clone(),
      });

      // Despawn once well past the map.
      if (jet.position.distanceTo(this.target) > 700 || jet.position.y > 400) {
        jet.active = false;
        jet.model.group.visible = false;
        jet.model.flybyPlayed = false;
      } else {
        anyActive = true;
      }
      void distToTarget;
    }

    if (!anyActive && this.bombs.length === 0) {
      this.phase = 'idle';
      this.inboundProgress = 0;
      Signals.emit('audio:music', { cue: 'combat' });
    } else if (this.bombs.length > 0) {
      this.phase = 'running';
    }
  }

  private releaseBomb(jet: Jet): void {
    const mesh = new THREE.Mesh(this.bombGeometry, this.bombMaterial);
    mesh.castShadow = false;
    this.group.add(mesh);

    const bomb: Bomb = {
      position: jet.position.clone().add(new THREE.Vector3(0, -1.4, 0)),
      velocity: jet.velocity.clone(),
      quaternion: new THREE.Quaternion(),
      mesh,
      armed: false,
      fuseTime: 0.35,
    };
    this.bombs.push(bomb);

    Signals.emit('audio:oneshot', {
      id: 'bomb_release',
      position: bomb.position.clone(),
      volume: 0.35,
    });
  }

  private updateBombs(dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];

      b.fuseTime -= dt;
      if (b.fuseTime <= 0) b.armed = true;

      // Retarded fall: high drag after the ballute deploys slows the forward
      // component so the bombs land in a tight, walking pattern.
      const dragCoeff = b.armed ? 0.055 : 0.008;
      const speed = b.velocity.length();
      this._v.copy(b.velocity).normalize().multiplyScalar(-dragCoeff * speed * speed * dt);
      b.velocity.add(this._v);
      b.velocity.y -= 9.81 * dt;

      const step = this._v2.copy(b.velocity).multiplyScalar(dt);
      const len = step.length();
      const dir = this._v.copy(step).divideScalar(Math.max(len, 1e-5));
      const hit = this.physics.trace(b.position, dir, len + 0.6);

      if (hit.hit) {
        this.detonate(hit.point.clone());
        this.group.remove(b.mesh);
        this.bombs.splice(i, 1);
        continue;
      }

      b.position.add(step);
      if (b.position.y < -12) {
        this.detonate(b.position.clone().setY(0));
        this.group.remove(b.mesh);
        this.bombs.splice(i, 1);
        continue;
      }

      // Nose into the airflow.
      const forward = this._v.copy(b.velocity).normalize();
      const up = Math.abs(forward.y) > 0.98 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();
      const realUp = new THREE.Vector3().crossVectors(right, forward).normalize();
      const basis = new THREE.Matrix4().makeBasis(right, realUp, forward.clone().negate());
      b.quaternion.setFromRotationMatrix(basis);
      b.mesh.position.copy(b.position);
      b.mesh.quaternion.copy(b.quaternion);
    }
  }

  private detonate(point: THREE.Vector3): void {
    const scale = 2.6;

    Signals.emit('explosion:spawn', {
      position: point,
      radius: this.bombRadius,
      damage: this.bombDamage,
      cause: 'airstrike',
      scale,
    });

    this.ai.applyAreaDamage(point, this.bombRadius, this.bombDamage);

    // A very bright, very short light: the flash should overexpose the frame
    // for two frames and then be gone, which is what a real detonation does
    // to a camera.
    this.lighting.spawnLight(
      point.clone().add(new THREE.Vector3(0, 3, 0)),
      0xffc078,
      420,
      this.bombRadius * 6,
      0.72,
      'flicker',
    );

    const camDist = point.distanceTo(this.ctx.camera.position);
    const near = THREE.MathUtils.clamp(1 - camDist / 90, 0, 1);

    Signals.emit('camera:shake', {
      amplitude: 0.02 + near * 0.16,
      duration: 0.9 + near * 0.8,
      frequency: 14,
    });

    const pipeline = this.ctx.engine.pipeline;
    // Auto-exposure ducks hard, then recovers — the classic "my eyes" moment.
    pipeline.exposureTarget = Math.max(0.4, pipeline.exposureTarget - near * 0.55);
    pipeline.concussion = Math.min(1, pipeline.concussion + near * 0.9);

    // Sound travels at 343 m/s; delaying the report by the real transit time
    // is one of the cheapest and most effective scale cues available.
    const delay = (camDist / 343) * 1000;
    window.setTimeout(() => {
      Signals.emit('audio:oneshot', {
        id: 'explosion_large',
        position: point.clone(),
        volume: 1,
      });
    }, Math.min(delay, 2500));

    if (QUALITY.tier !== 'low') {
      // Secondary sympathetic detonations for a bigger, less uniform event.
      window.setTimeout(() => {
        Signals.emit('explosion:spawn', {
          position: point.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 6, 0.5, (Math.random() - 0.5) * 6,
          )),
          radius: this.bombRadius * 0.4,
          damage: 0,
          cause: 'airstrike',
          scale: 0.8,
        });
      }, 90 + Math.random() * 140);
    }
  }

  dispose(): void {
    for (const j of this.jets) j.model.dispose();
    this.bombGeometry.dispose();
  }
}
