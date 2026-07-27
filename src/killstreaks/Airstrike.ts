import * as THREE from 'three';
import type { KsServices } from './KillstreakSystem';
import { StrikeJet, type RunDef, ballistic } from './Aircraft';
import { Ordnance } from './Ordnance';
import { TAU, clamp, lerp, smoothstep } from '../core/MathX';

/**
 * Airstrike.ts — the showpiece. Drives the whole delivery on a single timeline:
 *
 *   callout/inbound → jet flyover → stick release → walking impacts → aftermath
 *
 * The blast itself is delegated to the shared VFX/AI/physics via the `explosion`
 * event (which every system already consumes), so one emit does damage, impulse,
 * particles, sound and tinnitus. This module owns everything *airstrike-specific*:
 * the aircraft, the ballistic stick of bombs, the pulsing ground designator, the
 * rising smoke columns, the lingering dust haze and the danger-close feedback.
 *
 * A capture path (`stage`) poses each timeline moment for the offline review
 * shots so a single grabbed frame lands on flyover / release / impact / aftermath.
 */

const G = 24; // bomb gravity (exaggerated for a snappy fall)
const FALL = 1.6; // seconds from release to impact (drives lead + arc solve)
const BOMBS = 7;
const SPACING = 8.5; // metres between impacts along the heading
const STAGGER = 0.16; // seconds between impacts — reads as a *stick*, not one blast
const ALT = 88; // jet run altitude
const JET_SPEED = 150;
const BLAST_RADIUS = 12;

type Phase = 'idle' | 'inbound' | 'run' | 'impact' | 'aftermath' | 'done';

interface Sched {
  t: number;
  done: boolean;
  fn: () => void;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export class Airstrike {
  phase: Phase = 'idle';

  private clock = 0;
  private schedule: Sched[] = [];
  private jets: StrikeJet[] = [];
  private ordnance: Ordnance;
  private jetGeo: THREE.BufferGeometry[] = [];

  private target = new THREE.Vector3();
  private heading = new THREE.Vector3(1, 0, 0);
  private run!: RunDef;

  // Ground designator (pulsing) + dashed run-in line.
  private designator: THREE.Group | null = null;
  private designatorPulse = 0;

  private columns: SmokeColumn[] = [];
  private haze: THREE.Sprite | null = null;
  private hazeTex: THREE.Texture | null = null;

  private impactsFired = 0;
  private lifetime = 0; // total seconds until full teardown

  constructor(private sv: KsServices) {
    this.ordnance = new Ordnance(sv.mats.bomb, sv.scene, G);
  }

  // -------------------------------------------------------------------------
  // Public control
  // -------------------------------------------------------------------------

  /** Live call-in: full timeline from a designated target + run heading. */
  call(target: THREE.Vector3, heading: THREE.Vector3) {
    this.setup(target, heading);
    this.phase = 'inbound';
    this.lifetime = 34;

    // Callout + audio/HUD reactions.
    const eta = 3.4;
    this.sv.events.emit('airstrike:called', { position: this.target.clone(), heading: this.headingAngle() });
    this.sv.events.emit('airstrike:inbound', { eta });
    this.sv.hud?.notify('AIRSTRIKE INBOUND', 'DANGER CLOSE', 'bad');

    this.spawnJets(-JET_SPEED * 3.4);
    this.buildDesignator();

    // Schedule the stick: releases lead impacts by FALL; impacts walk the line.
    const first = 3.0;
    for (let i = 0; i < BOMBS; i++) {
      const impactAt = first + i * STAGGER;
      const p = this.impactPoint(i);
      this.at(impactAt - FALL, () => this.releaseBomb(p));
    }
    // Aftermath bookkeeping fires shortly after the last impact.
    this.at(first + BOMBS * STAGGER + 0.5, () => {
      this.phase = 'aftermath';
    });
  }

  /** Capture staging: pose a specific timeline moment for the review grab. */
  stage(phase: 'flyover' | 'release' | 'impact' | 'aftermath', target: THREE.Vector3, heading: THREE.Vector3) {
    this.setup(target, heading);
    this.buildDesignator();
    this.sv.events.emit('airstrike:called', { position: this.target.clone(), heading: this.headingAngle() });

    // Capture uses a lower, framed pass (the review camera sits low, so a
    // realistic high-altitude run would be entirely above the frustum). The
    // jets read best crossing the upper frame heading INTO the distance, so
    // the flyover uses a bespoke run independent of the bomb-walk heading.
    const capAlt = 40;
    const capSpeed = 100;
    // Jets run toward the far corner so the two-ship frames dead-centre against
    // the sky over the buildings; `grab` is the along-track distance at capture.
    const jetPass = new THREE.Vector3(-2, 0, 4);
    const jetHeading = new THREE.Vector3(-0.577, 0, -0.816).normalize();
    const jetAlong = (grab: number) => grab - capSpeed * 0.6;

    switch (phase) {
      case 'flyover':
      case 'release': {
        this.phase = 'run';
        this.spawnJetsRun(jetPass, jetHeading, jetAlong(phase === 'release' ? 48 : 39.6), capAlt, capSpeed);
        // A stick raining down toward the walking line, well inside frame.
        const stick = phase === 'release' ? BOMBS : 5;
        for (let i = 0; i < stick; i++) {
          const p = this.impactPoint(i);
          this.spawnRainBomb(p, 11 + i * 2.4, i);
        }
        break;
      }
      case 'impact': {
        this.phase = 'impact';
        // Jets pulling off, small and receding high over the far buildings.
        this.spawnJetsRun(jetPass, jetHeading, jetAlong(60), capAlt + 6, capSpeed);

        // The money shot: a stick of bombs walking across the compound. Blasts
        // are LIFTED so their fireballs and dark smoke rise against the blue sky
        // (contrast) instead of washing out over the bright wall, spread across
        // the frame width, and age-staggered so the grab reads left→right as
        // fresh orange core → churning fireball → towering smoke column.
        const vfx = this.sv.vfx;
        // [x, z, radius, fireAtT] along the compound line, WIDELY separated so
        // each impact reads distinctly: a big fresh fireball on the left grading
        // to a towering, burnt-out smoke column on the right.
        const line: Array<[number, number, number, number]> = [
          [-24, 14, 13, 0.4],
          [2, 16, 10, 0.24],
          [24, 20, 9, 0.12],
        ];
        for (const [x, z, r, t] of line) {
          const gy = this.sv.groundAt(x, z);
          const ground = new THREE.Vector3(x, gy, z);
          this.scorch(ground);
          // Older (earlier-fired) blasts get a taller pre-advanced column.
          this.addColumn(ground, 1.1).advance(0.7 + (0.4 - t) * 3);
          const burst = new THREE.Vector3(x, gy + 5, z);
          this.at(t, () => vfx?.explosion(burst, r, 'bomb'));
        }
        break;
      }
      case 'aftermath': {
        this.phase = 'aftermath';
        this.lifetime = 40;
        // Tall, persistent smoke columns rising against the sky, spread across
        // the compound, each with scorched ground + a glowing fire base. No
        // fresh flash — this reads as the minutes-after, not the blast.
        const spots: Array<[number, number, number]> = [
          [-27, 13, 3.8],
          [7, 17, 3.2],
          [29, 22, 3.5],
        ];
        for (const [x, z, age] of spots) {
          const gy = this.sv.groundAt(x, z);
          const base = new THREE.Vector3(x, gy, z);
          this.scorch(base);
          // Lower strength → narrower puffs so the columns stay distinct rather
          // than merging into one fog bank.
          this.addColumn(base, 0.62).advance(age);
          this.sv.vfx?.addFire(base, 2.4, 40);
        }
        this.spawnHaze();
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  private setup(target: THREE.Vector3, heading: THREE.Vector3) {
    this.target.copy(target);
    this.target.y = this.sv.groundAt(target.x, target.z);
    this.heading.copy(heading).setY(0).normalize();
    if (this.heading.lengthSq() < 1e-4) this.heading.set(1, 0, 0);

    this.run = {
      pass: this.target.clone(),
      heading: this.heading.clone(),
      speed: JET_SPEED,
      altitude: ALT,
      bank: 0.22,
      lateral: 0,
      along0: 0,
    };
  }

  private headingAngle(): number {
    return Math.atan2(this.heading.x, -this.heading.z);
  }

  private impactPoint(i: number): THREE.Vector3 {
    const off = (i - (BOMBS - 1) / 2) * SPACING;
    _v.copy(this.target).addScaledVector(this.heading, off);
    const gy = this.sv.groundAt(_v.x, _v.z);
    return new THREE.Vector3(_v.x, gy, _v.z);
  }

  private spawnJets(along0: number, altitude = ALT, speed = JET_SPEED) {
    this.spawnJetsRun(this.target, this.heading, along0, altitude, speed);
  }

  /** Spawn a two-ship formation down an arbitrary run (used by capture staging
   *  so the jets can cross the sky independently of the bomb heading). */
  private spawnJetsRun(
    pass: THREE.Vector3,
    heading: THREE.Vector3,
    along0: number,
    altitude: number,
    speed: number
  ) {
    const lat = 7;
    for (let k = 0; k < 2; k++) {
      const run: RunDef = {
        pass: pass.clone(),
        heading: heading.clone(),
        speed,
        altitude,
        along0: along0 - k * 18,
        lateral: k === 0 ? -lat : lat,
        bank: (k === 0 ? 1 : 0.82) * 0.24,
      };
      this.jets.push(new StrikeJet(this.sv.mats.jet, run, this.sv.scene, this.jetGeo));
    }
  }

  // -------------------------------------------------------------------------
  // Bombs
  // -------------------------------------------------------------------------

  /** Release a bomb aimed to hit `p` in FALL seconds from the nearest jet. */
  private releaseBomb(p: THREE.Vector3) {
    const jet = this.jets[0];
    const from = jet ? jet.worldPosition(_v2).clone() : p.clone().setY(ALT);
    const vel = this.solveVelocity(from, p, FALL);
    this.ordnance.release(from, vel, p.y, (pos) => this.doImpact(pos, this.impactsFired++));
    this.sv.audio?.playAt('airstrike_whistle', from, { gain: 0.5, refDistance: 60, maxDistance: 1200 });
  }

  /** Capture helper: a bomb suspended mid-fall above impact `p`, framed in view. */
  private spawnRainBomb(p: THREE.Vector3, height: number, i: number) {
    const from = p.clone().addScaledVector(this.heading, -(5 + i * 1.6));
    from.y = p.y + height;
    const t = 1.0 + i * 0.05;
    const vel = this.solveVelocity(from, p, t);
    this.ordnance.release(from, vel, p.y, (hit) => this.doImpact(hit, this.impactsFired++));
  }

  private solveVelocity(from: THREE.Vector3, to: THREE.Vector3, t: number): THREE.Vector3 {
    return new THREE.Vector3(
      (to.x - from.x) / t,
      (to.y - from.y) / t + 0.5 * G * t,
      (to.z - from.z) / t
    );
  }

  // -------------------------------------------------------------------------
  // Impact + feedback
  // -------------------------------------------------------------------------

  private doImpact(pos: THREE.Vector3, index: number, radiusScale = 1) {
    const radius = BLAST_RADIUS * radiusScale;

    // One event fans out to VFX (fireball/debris/scorch), AI (area damage),
    // physics (radial impulse) and audio.
    this.sv.events.emit('explosion', {
      position: pos.clone(),
      radius,
      damage: 220,
      force: 1500,
      kind: 'bomb',
    });

    // Rising smoke column + a little fire + kicked dust.
    this.addColumn(pos, 0.9 + this.sv.rng() * 0.6);
    if (index % 2 === 0) this.sv.vfx?.addFire(pos, 1.4 + this.sv.rng(), 26);
    this.sv.vfx?.dustKickup(pos, 2.2);

    // Camera shake + danger-close feedback scale with proximity to the player.
    // Suppressed under capture: the review shots are free-camera, and a full
    // flashWhite would blow the whole frame out.
    const player = this.sv.player;
    if (player && !this.sv.capture) {
      const d = player.position.distanceTo(pos);
      const near = clamp(1 - d / 55, 0, 1);
      if (near > 0.02) {
        this.sv.events.emit('camera:shake', { amplitude: 0.35 + near * 1.6, duration: 0.4 + near * 0.5, frequency: 26 });
      }
      this.dangerClose(pos, radius, d);
    }

    // First impact announces the chain (audio TTS chain + HUD).
    if (index === 0) {
      this.sv.events.emit('airstrike:impact', { position: this.target.clone() });
      this.sv.hud?.notify('IMPACT', undefined, 'bad');
    }
    this.impactsFired = Math.max(this.impactsFired, index + 1);
    if (this.phase === 'run' || this.phase === 'inbound') this.phase = 'impact';
  }

  /** The essential "danger close" gut-punch when the player is in the blast. */
  private dangerClose(pos: THREE.Vector3, radius: number, dist: number) {
    const player = this.sv.player!;
    if (dist < radius) {
      const f = 1 - dist / radius;
      player.applyDamage({
        amount: 30 + f * 70,
        origin: pos.clone(),
        point: pos.clone(),
        direction: _v.copy(player.position).sub(pos).normalize().clone(),
        weapon: 'airstrike',
        attackerId: -1,
        kind: 'explosion',
      });
    }
    if (dist < radius + 14) {
      const f = clamp(1 - dist / (radius + 14), 0, 1);
      // White concussion flash (rolls off in the grade shader), a violent
      // camera punch, and the audio TTS/tinnitus (auto via the explosion event).
      if (this.sv.render) this.sv.render.grade.flashWhite = Math.max(this.sv.render.grade.flashWhite, 0.35 + f * 0.9);
      player.addViewPunch((this.sv.rng() - 0.3) * f * 0.5, (this.sv.rng() - 0.5) * f * 0.5, (this.sv.rng() - 0.5) * f * 0.4);
      this.sv.audio?.triggerTinnitus(clamp(f, 0.4, 1));
    }
  }

  private scorch(p: THREE.Vector3) {
    // Reuse the VFX scorch/fire by faking a zero-radius blast footprint.
    this.sv.vfx?.explosion(p, 3.2, 'bomb');
  }

  // -------------------------------------------------------------------------
  // Ground designator (pulsing target box + dashed run-in line)
  // -------------------------------------------------------------------------

  private buildDesignator() {
    if (this.designator) return;
    const g = new THREE.Group();
    const mat = this.sv.mats.glowRed;

    // Corner-bracket box on the ground.
    const box = new THREE.Group();
    const arm = 1.4;
    const gap = 4.2;
    const seg = new THREE.BoxGeometry(arm, 0.12, 0.12);
    this.jetGeo.push(seg);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const a = new THREE.Mesh(seg, mat);
        a.position.set(sx * gap, 0.06, sz * (gap - arm / 2));
        box.add(a);
        const b = new THREE.Mesh(seg, mat);
        b.rotation.y = Math.PI / 2;
        b.position.set(sx * (gap - arm / 2), 0.06, sz * gap);
        box.add(b);
      }
    }
    g.add(box);

    // Centre cross.
    const cross = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.16), mat);
    this.jetGeo.push(cross.geometry);
    g.add(cross);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 2.4), mat);
    g.add(cross2);

    // Dashed run-in line showing the attack heading.
    const dash = new THREE.BoxGeometry(2.6, 0.08, 0.35);
    this.jetGeo.push(dash);
    for (let i = 1; i <= 7; i++) {
      const d = new THREE.Mesh(dash, mat);
      d.position.copy(_v.copy(this.heading).multiplyScalar(-(gap + 2 + i * 4)));
      d.position.y = 0.05;
      d.quaternion.setFromUnitVectors(_v2.set(1, 0, 0), this.heading);
      g.add(d);
    }

    g.position.copy(this.target);
    g.position.y = this.target.y + 0.05;
    this.sv.scene.add(g);
    this.designator = g;
  }

  // -------------------------------------------------------------------------
  // Aftermath — rising columns + lingering haze
  // -------------------------------------------------------------------------

  private addColumn(base: THREE.Vector3, strength: number): SmokeColumn {
    const col = new SmokeColumn(this.sv.scene, base, strength, this.sv.rng);
    this.columns.push(col);
    this.sv.vfx?.smokePlume(base, 1.8 * strength, 22);
    return col;
  }

  private spawnHaze() {
    if (this.haze) return;
    this.hazeTex = makePuffTexture(0.5);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.hazeTex,
        color: 0x6b5f4c,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        rotation: 0,
      })
    );
    s.position.copy(this.target);
    // A compact, faint pall sitting high over the smoke — not a frame-wide veil
    // (a big translucent billboard milks the whole shot out).
    s.position.y = this.target.y + 16;
    s.position.z -= 6;
    s.scale.set(46, 20, 1);
    this.sv.scene.add(s);
    this.haze = s;
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update(dt: number) {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.clock += dt;
    this.lifetime -= dt;

    for (const s of this.schedule) {
      if (!s.done && this.clock >= s.t) {
        s.done = true;
        s.fn();
      }
    }

    for (const j of this.jets) j.update(dt, this.clock);
    this.ordnance.update(dt);
    for (const c of this.columns) c.update(dt);

    // Designator pulse.
    if (this.designator) {
      this.designatorPulse += dt * 6;
      const p = 0.5 + 0.5 * Math.sin(this.designatorPulse);
      const s = 1 + p * 0.08;
      this.designator.scale.set(s, 1, s);
      (this.sv.mats.glowRed as THREE.MeshBasicMaterial).opacity = 0.55 + p * 0.45;
      // Fade the designator away once the bombs are down.
      if (this.phase === 'aftermath' || this.phase === 'impact') {
        this.designator.visible = false;
      }
    }

    // Haze slowly drifts up and thins.
    if (this.haze) {
      this.haze.position.y += dt * 0.15;
      const m = this.haze.material as THREE.SpriteMaterial;
      if (this.lifetime < 10) m.opacity = Math.max(0, m.opacity - dt * 0.01);
    }

    // Retire jets once they are far past the target.
    for (const j of this.jets) {
      if (j.along(this.clock) > 900) j.setVisible(false);
    }

    if (this.phase === 'aftermath' && this.lifetime <= 0) this.phase = 'done';
  }

  get finished(): boolean {
    return this.phase === 'done';
  }

  private at(t: number, fn: () => void) {
    this.schedule.push({ t, done: false, fn });
  }

  dispose() {
    for (const j of this.jets) j.dispose(this.sv.scene);
    this.jets.length = 0;
    this.ordnance.dispose();
    for (const c of this.columns) c.dispose();
    this.columns.length = 0;
    for (const g of this.jetGeo) g.dispose();
    this.jetGeo.length = 0;
    if (this.designator) this.sv.scene.remove(this.designator);
    if (this.haze) {
      this.sv.scene.remove(this.haze);
      (this.haze.material as THREE.Material).dispose();
    }
    this.hazeTex?.dispose();
  }
}

// ---------------------------------------------------------------------------
// Rising smoke column (self-contained sprite emitter, fast-forwardable)
// ---------------------------------------------------------------------------

interface Puff {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  size0: number;
  size1: number;
  vy: number;
  drift: THREE.Vector3;
  tintLow: THREE.Color;
}

class SmokeColumn {
  private puffs: Puff[] = [];
  private acc = 0;
  private age = 0;
  private alive = true;
  private tex: THREE.Texture;

  constructor(
    private scene: THREE.Scene,
    private base: THREE.Vector3,
    private strength: number,
    private rng: () => number
  ) {
    this.tex = sharedPuffTexture();
  }

  private emit() {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.tex,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    const spread = 1.6 * this.strength;
    s.position.set(
      this.base.x + (this.rng() - 0.5) * spread,
      this.base.y + 0.4,
      this.base.z + (this.rng() - 0.5) * spread
    );
    this.scene.add(s);
    this.puffs.push({
      sprite: s,
      age: 0,
      life: 6 + this.rng() * 4,
      size0: 2.5 * this.strength,
      size1: (12 + this.rng() * 6) * this.strength,
      vy: 3.5 + this.rng() * 2.2,
      drift: new THREE.Vector3((this.rng() - 0.5) * 1.2, 0, (this.rng() - 0.5) * 1.2),
      tintLow: new THREE.Color().setHSL(0.07, 0.7, 0.28),
    });
  }

  /** Fast-forward the column to `seconds` old (capture staging). */
  advance(seconds: number) {
    const step = 0.12;
    for (let t = 0; t < seconds; t += step) this.update(step);
  }

  update(dt: number) {
    this.age += dt;
    // Emit while young; taper off so the column settles into a drifting plume.
    if (this.alive && this.age < 9) {
      this.acc += dt;
      const rate = 0.09;
      while (this.acc >= rate) {
        this.acc -= rate;
        this.emit();
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        this.scene.remove(p.sprite);
        (p.sprite.material as THREE.Material).dispose();
        this.puffs.splice(i, 1);
        continue;
      }
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.addScaledVector(p.drift, dt);
      p.vy = Math.max(0.6, p.vy - dt * 0.9); // buoyancy fades with height
      const sz = lerp(p.size0, p.size1, smoothstep(t));
      p.sprite.scale.set(sz, sz, 1);
      const m = p.sprite.material as THREE.SpriteMaterial;
      // Fire-lit dark at the base, cooling to grey as it climbs.
      const height = p.sprite.position.y - this.base.y;
      const lit = clamp(1 - height / 10, 0, 1);
      m.color.copy(p.tintLow).lerp(GREY, 1 - lit);
      m.opacity = Math.sin(Math.min(1, t * 4) * Math.PI * 0.5) * (1 - smoothstep(clamp((t - 0.6) / 0.4, 0, 1))) * 0.8;
      p.sprite.material.rotation += dt * 0.2;
    }
  }

  dispose() {
    this.alive = false;
    for (const p of this.puffs) {
      this.scene.remove(p.sprite);
      (p.sprite.material as THREE.Material).dispose();
    }
    this.puffs.length = 0;
  }
}

const GREY = new THREE.Color(0.32, 0.32, 0.34);

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------

let _puffTex: THREE.Texture | null = null;
function sharedPuffTexture(): THREE.Texture {
  if (_puffTex) return _puffTex;
  _puffTex = makePuffTexture(0.62);
  return _puffTex;
}

function makePuffTexture(soft: number): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  // Base soft blob.
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(255,255,255,${0.9 * soft + 0.1})`);
  grad.addColorStop(0.55, `rgba(255,255,255,${0.35 * soft})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  // A few darker lobes for a billowy edge.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    const r = size * (0.18 + Math.random() * 0.16);
    const x = size / 2 + Math.cos(a) * size * 0.22;
    const y = size / 2 + Math.sin(a) * size * 0.22;
    const lg = g.createRadialGradient(x, y, 0, x, y, r);
    lg.addColorStop(0, 'rgba(255,255,255,0.28)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** ballistic is re-exported here so the manager can share fall-time math. */
export { ballistic };
