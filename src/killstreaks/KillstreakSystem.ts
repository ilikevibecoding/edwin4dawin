import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { EventBus } from '../core/Events';
import type {
  IAiDirector,
  IHud,
  IKillstreaks,
  ILevel,
  IPhysics,
  IPlayer,
  IVfx,
  IWeapons,
} from '../core/Contracts';
import type { Rng } from '../core/MathX';
import { makeRng } from '../core/MathX';
import { makeJetMaterials, type JetMaterials } from './Aircraft';
import type { OrdnanceMaterials } from './Ordnance';
import { Airstrike } from './Airstrike';
import { TargetingTablet } from './TargetingTablet';
import { UavSweep } from './UavSweep';
import { CarePackage } from './CarePackage';
import { AttackHelicopter } from './AttackHelicopter';

/** Minimal structural views of services we only poke a couple of methods on. */
export interface AudioLike {
  play(id: string, opts?: Record<string, unknown>): { id: number } | null;
  playAt(id: string, position: THREE.Vector3, opts?: Record<string, unknown>): { id: number } | null;
  triggerTinnitus(intensity?: number): void;
}
export interface RenderLike {
  grade: { flashWhite: number };
}

/** Shared materials, built once and disposed with the system. */
export class KsMaterials {
  jet: JetMaterials;
  bomb: OrdnanceMaterials;
  heliBody: THREE.Material;
  heliDark: THREE.Material;
  rotorDisc: THREE.Material;
  glass: THREE.Material;
  crate: THREE.Material;
  crateTrim: THREE.Material;
  chute: THREE.Material;
  cord: THREE.Material;
  glowOrange: THREE.Material;
  glowBlue: THREE.Material;
  glowRed: THREE.Material;
  overlay: THREE.Material;
  droneBody: THREE.Material;
  private all: THREE.Material[] = [];

  constructor() {
    const jet = makeJetMaterials();
    this.jet = jet;
    this.all.push(...jet.all);

    const std = (color: number, rough: number, metal: number, emissive = 0x000000, ei = 0) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity: ei });
      this.all.push(m);
      return m;
    };
    const glow = (color: number) => {
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.all.push(m);
      return m;
    };

    this.bomb = { body: std(0x33382c, 0.6, 0.55), fin: std(0x24281f, 0.65, 0.5) };
    this.heliBody = std(0x3b432f, 0.62, 0.35);
    this.heliDark = std(0x1c1f18, 0.7, 0.4);
    this.rotorDisc = new THREE.MeshBasicMaterial({ color: 0x0a0c0a, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    this.all.push(this.rotorDisc);
    this.glass = std(0x0b1622, 0.15, 0.9, 0x0a1a26, 0.4);
    this.crate = std(0x6f5a34, 0.75, 0.15);
    this.crateTrim = std(0x2a2b2e, 0.55, 0.6);
    this.chute = std(0xd9662a, 0.85, 0.0);
    this.cord = std(0x14150f, 0.9, 0.0);
    this.glowOrange = glow(0xffb060);
    this.glowBlue = glow(0x66ccff);
    this.glowRed = glow(0xff4030);
    this.overlay = glow(0x66ff9a);
    this.droneBody = std(0x2b3138, 0.55, 0.5);
  }

  dispose() {
    for (const m of this.all) m.dispose();
    this.all.length = 0;
  }
}

/** The service bundle every streak module receives. */
export interface KsServices {
  ctx: EngineContext;
  scene: THREE.Scene;
  viewScene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  viewCamera: THREE.PerspectiveCamera;
  events: EventBus;
  rng: Rng;
  mats: KsMaterials;
  level: ILevel | null;
  vfx: IVfx | null;
  ai: IAiDirector | null;
  physics: IPhysics | null;
  player: IPlayer | null;
  weapons: IWeapons | null;
  hud: IHud | null;
  audio: AudioLike | null;
  render: RenderLike | null;
  capture: boolean;
  groundAt(x: number, z: number): number;
}

interface StreakDef {
  id: string;
  name: string;
  at: number;
}

const STREAKS: StreakDef[] = [
  { id: 'uav', name: 'UAV RECON', at: 3 },
  { id: 'airstrike', name: 'AIRSTRIKE', at: 5 },
  { id: 'carepackage', name: 'CARE PACKAGE', at: 7 },
  { id: 'attackheli', name: 'ATTACK HELICOPTER', at: 9 },
];

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _to = new THREE.Vector3();

/**
 * KillstreakSystem — CoD-style killstreak progression and the airstrike device.
 *
 * Kills (counted from `enemy:death`) unlock streaks at 3/5/7/9 and reset on
 * `player:death`. The `killstreak` action raises the tactical tablet; the wheel
 * cycles which earned streak to deploy, the tablet designates the target, and
 * LMB commits. Everything degrades gracefully when a service is absent.
 *
 * Public API for the HUD (beyond {@link IKillstreaks}):
 *  - `revealedEnemies: THREE.Vector3[]` — live UAV-revealed hostile positions.
 *  - `uavActive: boolean`
 *  - `streakState` — `{ kills, available, selected, targeting, nextAt }`.
 */
export class KillstreakSystem implements Subsystem, IKillstreaks {
  readonly name = 'killstreaks';
  readonly order = 60;

  private ctx!: EngineContext;
  private sv!: KsServices;
  private mats!: KsMaterials;
  private tablet!: TargetingTablet;
  private rng: Rng = makeRng(0x57121b);

  private kills = 0;
  private unlocked = new Set<string>();
  private availableIds: string[] = [];
  private selectedIndex = 0;

  private airstrikes: Airstrike[] = [];
  private carePackages: CarePackage[] = [];
  private uav: UavSweep | null = null;
  private attackHeli: AttackHelicopter | null = null;

  private capturePhase: string | null = null;
  private captureFired = false;
  private progressPushed = false;
  private unsub: Array<() => void> = [];

  // -------------------------------------------------------------------------
  // IKillstreaks
  // -------------------------------------------------------------------------

  get available(): string[] {
    return this.availableIds;
  }

  get targeting(): boolean {
    return this.tablet?.open ?? false;
  }

  arm(id: string): boolean {
    if (!this.availableIds.includes(id)) return false;
    if (id === 'airstrike') {
      this.selectedIndex = this.availableIds.indexOf(id);
      this.raiseTablet();
      return true;
    }
    this.deploy(id, this.defaultTarget(), _fwd.set(0, 0, -1).clone());
    return true;
  }

  cancel(): void {
    if (this.tablet?.open) {
      this.tablet.lower();
      this.ctx.events.emit('killstreak:cancel', { id: this.availableIds[this.selectedIndex] ?? 'airstrike' });
    }
  }

  addKill(): void {
    this.kills++;
    for (const s of STREAKS) {
      if (this.kills >= s.at && !this.unlocked.has(s.id)) {
        this.unlocked.add(s.id);
        this.availableIds.push(s.id);
        this.availableIds.sort((a, b) => tier(a) - tier(b));
        this.ctx.events.emit('killstreak:earned', { id: s.id, name: s.name });
        this.ctx.events.emit('ui:notify', { text: `${s.name} READY`, sub: `PRESS Z`, tone: 'good' });
      }
    }
    this.pushProgress();
  }

  // -------------------------------------------------------------------------
  // Subsystem
  // -------------------------------------------------------------------------

  init(ctx: EngineContext) {
    this.ctx = ctx;
    this.mats = new KsMaterials();
    const get = <T>(k: string): T | null => (ctx.has(k) ? ctx.get<T>(k) : null);

    this.sv = {
      ctx,
      scene: ctx.scene,
      viewScene: ctx.viewScene,
      camera: ctx.camera,
      viewCamera: ctx.viewCamera,
      events: ctx.events,
      rng: this.rng,
      mats: this.mats,
      level: get<ILevel>('level'),
      vfx: get<IVfx>('vfx'),
      ai: get<IAiDirector>('ai'),
      physics: get<IPhysics>('physics'),
      player: get<IPlayer>('player'),
      weapons: get<IWeapons>('weapons'),
      hud: get<IHud>('hud'),
      audio: get<AudioLike>('audio'),
      render: get<RenderLike>('render'),
      capture: ctx.capture,
      groundAt: (x, z) => this.groundAt(x, z),
    };

    this.tablet = new TargetingTablet(this.sv);

    this.unsub.push(ctx.events.on('enemy:death', () => this.addKill()));
    this.unsub.push(ctx.events.on('player:death', () => this.onPlayerDeath()));

    // Capture / manual review hook: ?strike=<phase>.
    const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
    const strike = q.get('strike');
    if (strike) this.capturePhase = strike === 'true' || strike === '1' ? 'impact' : strike;
  }

  update(dt: number, ctx: EngineContext) {
    if (!this.progressPushed) {
      this.progressPushed = true;
      this.pushProgress();
    }
    if (this.capturePhase && !this.captureFired) {
      this.captureFired = true;
      this.startCapture(this.capturePhase);
    }

    this.handleInput(ctx);

    // Drive the tablet interaction.
    if (this.tablet.open) {
      const action = this.tablet.update(dt, this.etaForSelected());
      if (action === 'confirm') this.confirmTablet();
      else if (action === 'cancel') this.cancel();
    }

    // Advance and prune active streaks.
    for (const a of this.airstrikes) a.update(dt);
    this.prune(this.airstrikes);
    for (const c of this.carePackages) c.update(dt);
    this.prune(this.carePackages);
    if (this.uav) {
      this.uav.update(dt);
      if (this.uav.finished) {
        this.uav.dispose();
        this.uav = null;
      }
    }
    if (this.attackHeli) {
      this.updateGunshipDamage(dt);
      this.attackHeli.update(dt);
      if (this.attackHeli.finished) {
        this.attackHeli.dispose();
        this.attackHeli = null;
      }
    }
  }

  lateUpdate() {
    // Position the tablet viewmodel after the camera has been assembled.
    if (this.tablet.open) this.tablet.positionViewmodel();
  }

  private prune(list: { finished: boolean; dispose: () => void }[]) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].finished) {
        list[i].dispose();
        list.splice(i, 1);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Input + deployment
  // -------------------------------------------------------------------------

  private handleInput(ctx: EngineContext) {
    const input = ctx.input;
    if (!this.tablet.open) {
      if (input.pressed('killstreak') && this.availableIds.length > 0) {
        this.selectedIndex = this.availableIds.length - 1; // highest tier
        this.raiseTablet();
      }
      return;
    }
    // While the tablet is up, the wheel cycles which streak to deploy.
    if (this.availableIds.length > 1 && input.wheel !== 0) {
      const n = this.availableIds.length;
      this.selectedIndex = (this.selectedIndex + input.wheel + n * 2) % n;
      this.tablet.setSelected(this.selectedName());
    }
  }

  private raiseTablet() {
    this.tablet.raise(this.selectedName(), this.defaultTarget(), 0);
    this.ctx.events.emit('killstreak:armed', { id: this.selectedId() });
  }

  private confirmTablet() {
    const id = this.selectedId();
    const target = this.tablet.target.clone();
    const heading = this.tablet.heading().clone();
    this.tablet.lower();
    this.deploy(id, target, heading);
  }

  private deploy(id: string, target: THREE.Vector3, heading: THREE.Vector3) {
    switch (id) {
      case 'airstrike': {
        const a = new Airstrike(this.sv);
        a.call(target, heading);
        this.airstrikes.push(a);
        break;
      }
      case 'uav': {
        this.uav?.dispose();
        this.uav = new UavSweep(this.sv);
        break;
      }
      case 'carepackage': {
        const cp = new CarePackage(this.sv);
        cp.call(target);
        this.carePackages.push(cp);
        break;
      }
      case 'attackheli': {
        this.attackHeli?.dispose();
        this.attackHeli = new AttackHelicopter(this.sv);
        break;
      }
    }
    // Consume the streak.
    const idx = this.availableIds.indexOf(id);
    if (idx >= 0) this.availableIds.splice(idx, 1);
    this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, this.availableIds.length - 1));
    this.ctx.events.emit('killstreak:armed', { id });
    this.pushProgress();
  }

  /** Cheap "shoot it down": chip the gunship when the player aims + fires at it. */
  private updateGunshipDamage(dt: number) {
    if (!this.attackHeli || !this.attackHeli.alive || this.sv.capture) return;
    const player = this.sv.player;
    const input = this.ctx.input;
    if (!player || !input.isDown('fire')) return;
    _to.copy(this.attackHeli.worldPosition);
    _v.copy(_to).sub(player.eye);
    const dist = _v.length();
    if (dist < 6) return;
    _v.multiplyScalar(1 / dist);
    _fwd.set(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    if (_fwd.dot(_v) > 0.994) this.attackHeli.damage(70 * dt);
  }

  // -------------------------------------------------------------------------
  // Capture staging
  // -------------------------------------------------------------------------

  private startCapture(phase: string) {
    switch (phase) {
      case 'flyover':
      case 'release':
      case 'impact':
      case 'aftermath': {
        // Target sits on the open foreground deck, centred in the review frame
        // at a close depth (~26m) so the stick walks across the empty apron
        // instead of into the far buildings.
        const target = new THREE.Vector3(10, 0, 12);
        target.y = this.groundAt(target.x, target.z);
        // Heading aligned with the review camera's screen-right axis so the
        // stick of bombs walks left→right ACROSS the frame at roughly constant
        // depth (readable as a stick) rather than foreshortened into one blob.
        const heading = _v.set(0.83, 0, -0.554).normalize().clone();
        const a = new Airstrike(this.sv);
        a.stage(phase, target, heading);
        this.airstrikes.push(a);
        break;
      }
      case 'tablet': {
        this.kills = 5;
        this.unlocked.add('airstrike');
        this.availableIds = ['airstrike'];
        const target = new THREE.Vector3(-3, 0, -10);
        target.y = this.groundAt(target.x, target.z);
        this.tablet.raise('AIRSTRIKE', target, 0);
        break;
      }
      case 'uav':
        this.uav = new UavSweep(this.sv);
        break;
      case 'carepackage': {
        const cp = new CarePackage(this.sv);
        cp.call(new THREE.Vector3(-3, 0, -10));
        this.carePackages.push(cp);
        break;
      }
      case 'attackheli':
        this.attackHeli = new AttackHelicopter(this.sv);
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private groundAt(x: number, z: number): number {
    const g = this.sv?.level?.sampleGround(x, z);
    return g === null || g === undefined ? 0 : g;
  }

  private defaultTarget(): THREE.Vector3 {
    const p = this.sv.player;
    if (!p) return new THREE.Vector3(0, this.groundAt(0, 0), 0);
    _fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    _v.copy(p.eye).addScaledVector(_fwd, 40);
    _v.y = this.groundAt(_v.x, _v.z);
    return _v.clone();
  }

  private selectedId(): string {
    return this.availableIds[this.selectedIndex] ?? 'airstrike';
  }

  private selectedName(): string {
    const id = this.selectedId();
    return STREAKS.find((s) => s.id === id)?.name ?? id.toUpperCase();
  }

  private etaForSelected(): number {
    return this.selectedId() === 'airstrike' ? 3.4 : 6.0;
  }

  private onPlayerDeath() {
    this.kills = 0;
    this.unlocked.clear();
    this.availableIds.length = 0;
    this.selectedIndex = 0;
    if (this.tablet.open) this.tablet.lower();
    this.pushProgress();
  }

  private pushProgress() {
    const next = STREAKS.find((s) => this.kills < s.at) ?? null;
    try {
      this.sv?.hud?.setKillstreakProgress(this.kills, next ? { name: next.name, at: next.at } : null);
    } catch {
      /* HUD (owned by another agent) may still be mid-build; ignore. */
    }
  }

  // -------------------------------------------------------------------------
  // Public HUD-facing API
  // -------------------------------------------------------------------------

  /** Live positions of hostiles currently revealed by a UAV (empty if none). */
  get revealedEnemies(): THREE.Vector3[] {
    return this.uav?.revealed ?? [];
  }

  get uavActive(): boolean {
    return this.uav?.active ?? false;
  }

  get streakState() {
    return {
      kills: this.kills,
      available: this.availableIds.slice(),
      selected: this.tablet?.open ? this.selectedId() : null,
      targeting: this.targeting,
      nextAt: (STREAKS.find((s) => this.kills < s.at) ?? null)?.at ?? null,
    };
  }

  dispose() {
    for (const u of this.unsub) u();
    this.unsub.length = 0;
    for (const a of this.airstrikes) a.dispose();
    for (const c of this.carePackages) c.dispose();
    this.airstrikes.length = 0;
    this.carePackages.length = 0;
    this.uav?.dispose();
    this.attackHeli?.dispose();
    this.tablet?.dispose();
    this.mats?.dispose();
  }
}

function tier(id: string): number {
  return STREAKS.findIndex((s) => s.id === id);
}
