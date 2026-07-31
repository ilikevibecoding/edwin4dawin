/**
 * Killstreaks: the counter, the queue of what is in hand, and the five
 * sequences those rewards run.
 *
 * This file is deliberately thin. It owns exactly three things — how a kill
 * becomes a reward, how a reward becomes a button press, and how a button press
 * becomes a sequence — and everything else lives in the module it belongs to.
 * The air strike is 700 lines of ballistics and formation geometry; it does not
 * also need to know what a killstreak is.
 *
 * Two contract notes worth knowing from outside:
 *
 * - `addKill` and `resetStreak` are called by the combat module directly rather
 *   than being derived from events here, so the counter cannot drift from the
 *   scoreboard.
 * - `available` is the queue in cost order, and the HUD binds keys 3/4/5 to its
 *   first three entries. Anything that reorders it reorders the player's hotkeys,
 *   so it is only ever inserted into, never sorted after the fact.
 *
 * Earned streaks survive death; the counter does not. That is the one place this
 * departs from the genre convention, and it is deliberate: the air strike is the
 * feature this build exists to show, and losing a banked one to a stray grenade
 * before it has ever been fired is a worse outcome than the small loss of tension.
 */
import * as THREE from 'three';
import type { KillstreakDefinition, KillstreakId, KillstreakSystem } from '../core/Contracts';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import { Acoustics } from './Acoustics';
import { AirStrike, type StrikeKind } from './AirStrike';
import { KillstreakAssets } from './Assets';
import { CarePackage } from './CarePackage';
import { ChopperGunner } from './ChopperGunner';
import { ClusterStrike } from './ClusterStrike';
import { KILLSTREAK_LIST, killstreakDef } from './Definitions';
import { KillstreakDeps } from './Deps';
import { installDebugHooks, removeDebugHooks, updateDebugCamera } from './dev/DebugHooks';
import { normalizeBearing } from './MapMath';
import { Radio } from './Radio';
import { Targeting, type TargetingKind } from './Targeting';
import { SOUNDS } from './Tuning';
import { UAV } from './UAV';

export class KillstreakSystemImpl implements KillstreakSystem, System {
  readonly name = 'killstreaks' as const;
  readonly order = ORDER.KILLSTREAKS;
  readonly dependencies = ['combat', 'fx', 'world'] as const;

  streak = 0;

  private readonly deps = new KillstreakDeps();
  // 28 ribbons is the cluster strike's worst case: one dispenser plus twenty-four
  // bomblets plus the delivery aircraft's two wingtips. Under that the last few
  // submunitions fall without a trail, which is visible.
  private readonly assets = new KillstreakAssets(28);
  private readonly acoustics = new Acoustics(this.deps);
  private readonly radio = new Radio(this.deps);

  private readonly airstrike = new AirStrike(this.deps, this.assets, this.acoustics, this.radio);
  private readonly cluster = new ClusterStrike(this.deps, this.assets, this.acoustics, this.radio);
  private readonly uav = new UAV(this.deps, this.assets, this.acoustics);
  private readonly chopper = new ChopperGunner(this.deps, this.assets, this.acoustics);
  private readonly carePackage = new CarePackage(this.deps, this.assets, this.acoustics);
  private readonly targeting = new Targeting(this.deps);

  private readonly held: KillstreakId[] = [];
  private readonly scratch = new THREE.Vector3();
  private readonly usedPayload = { id: '' };
  private readonly earnedPayload = { id: '', name: '' };
  private ctx: EngineContext | null = null;
  /** The streak consumed to open the tablet, refunded if it is cancelled. */
  private pending: KillstreakId | null = null;

  // -------------------------------------------------------------------------
  // Contract surface
  // -------------------------------------------------------------------------

  get available(): readonly KillstreakId[] {
    return this.held;
  }

  get isTargeting(): boolean {
    return this.targeting.active;
  }

  /** Published for the HUD, which prefers these over its own fallback table. */
  get definitions(): readonly KillstreakDefinition[] {
    return KILLSTREAK_LIST;
  }

  getDefinition(id: string): KillstreakDefinition | undefined {
    return KILLSTREAK_LIST.find((def) => def.id === id);
  }

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.deps.attach(ctx);
    this.assets.init(ctx);
    this.targeting.init(ctx);
    this.chopper.init(ctx);
    this.carePackage.init(ctx);

    this.targeting.onCommit = (target, heading, kind) => this.onCommit(target, heading, kind);
    this.targeting.onAbort = () => this.refund();
    this.carePackage.onGrant = (id) => this.onPackageOpened(id);

    installDebugHooks(this, ctx);
  }

  update(dt: number, ctx: EngineContext): void {
    // Registration order is not guaranteed, so late arrivals are picked up here.
    this.deps.resolve();
    // First frame: the world's lights exist by now, so the strike's programs can
    // be compiled against them rather than in the frame the jets arrive.
    this.assets.warm();
    this.handleInput(ctx);

    if (this.targeting.active) this.targeting.update(dt);
    this.airstrike.update(dt);
    this.cluster.update(dt);
    this.uav.update(dt);
    this.chopper.update(dt);
    this.carePackage.update(dt);
    this.acoustics.update(this.deps.now);
  }

  lateUpdate(dt: number): void {
    // Both of these take the camera over, and both must run after the player has
    // written it. Trails sample world transforms, so they come last of all.
    this.targeting.applyCamera();
    this.chopper.lateUpdate();
    if (!this.targeting.active && !this.chopper.inControl && this.ctx) {
      updateDebugCamera(this.ctx);
    }
    this.assets.trails.update(dt);
  }

  /**
   * Enters targeting or fires immediately. Returns false when the streak is not
   * in hand, which is also what the HUD keys do when nothing is in that slot.
   */
  activate(id: KillstreakId): boolean {
    if (!id) return false;
    if (this.targeting.active) return false;

    const index = this.held.indexOf(id);
    if (index < 0) {
      this.deny('KILLSTREAK UNAVAILABLE', 'NOTHING IN THAT SLOT');
      return false;
    }
    const busy = this.busyReason(id);
    if (busy) {
      this.deny('KILLSTREAK UNAVAILABLE', busy);
      return false;
    }

    const def = killstreakDef(id);
    this.held.splice(index, 1);

    if (def.requiresTargeting) {
      // Consumed up front and refunded on cancel: a player who opens the tablet
      // and backs out has not spent anything, but the queue cannot be double-spent
      // while the tablet is open either.
      this.pending = id;
      this.targeting.enter(targetingKindFor(id));
      return true;
    }

    this.fire(id);
    return true;
  }

  cancelTargeting(): void {
    this.targeting.cancel();
  }

  confirmTarget(): void {
    this.targeting.confirm();
  }

  callAirStrike(
    target: THREE.Vector3,
    heading: number,
    kind: 'precision' | 'cluster' | 'carpet' = 'carpet',
  ): void {
    const bearing = normalizeBearing(heading);
    if (kind === 'cluster') this.cluster.call(target, bearing);
    else this.airstrike.call(target, bearing, kind as StrikeKind);
  }

  addKill(): void {
    this.streak++;
    for (const def of KILLSTREAK_LIST) {
      if (def.cost === this.streak) this.earn(def);
    }
  }

  resetStreak(): void {
    this.streak = 0;
    // Dying with the tablet open refunds the streak and gives the camera back;
    // dying on the door gun hands control back to a corpse, which the player
    // module then respawns normally.
    if (this.targeting.active) this.targeting.cancel();
    this.chopper.abort();
  }

  dispose(): void {
    removeDebugHooks();
    this.targeting.dispose();
    this.airstrike.dispose();
    this.cluster.dispose();
    this.uav.dispose();
    this.chopper.dispose();
    this.carePackage.dispose();
    this.assets.dispose();
    this.acoustics.clear();
    this.held.length = 0;
    this.pending = null;
    this.deps.detach();
    this.ctx = null;
  }

  // -------------------------------------------------------------------------
  // Streak economy
  // -------------------------------------------------------------------------

  /** Awards a streak. `earned` distinguishes a kill reward from a refund. */
  give(id: KillstreakId, earned = true): void {
    const cost = killstreakDef(id).cost;
    // Insert in cost order so the tray, and therefore the hotkeys, stay stable.
    let at = this.held.length;
    for (let i = 0; i < this.held.length; i++) {
      if (killstreakDef(this.held[i]).cost > cost) {
        at = i;
        break;
      }
    }
    this.held.splice(at, 0, id);
    if (earned) {
      const def = killstreakDef(id);
      this.earnedPayload.id = def.id;
      this.earnedPayload.name = def.name;
      // The HUD notifies and the audio module plays the sting off this event, so
      // neither is duplicated here.
      this.deps.emit('killstreak:earned', this.earnedPayload);
    }
  }

  private earn(def: KillstreakDefinition): void {
    this.give(def.id, true);
  }

  private fire(id: KillstreakId): void {
    const def = killstreakDef(id);
    switch (id) {
      case 'uav':
        this.uav.launch(def.duration);
        break;
      case 'care_package':
        this.carePackage.launch();
        break;
      case 'chopper_gunner':
        this.chopper.launch(def.duration);
        break;
      case 'airstrike':
        this.callAirStrike(this.defaultTarget(), this.defaultHeading(), 'carpet');
        break;
      case 'cluster_strike':
        this.callAirStrike(this.defaultTarget(), this.defaultHeading(), 'cluster');
        break;
      default:
        return;
    }
    this.usedPayload.id = id;
    this.deps.emit('killstreak:used', this.usedPayload);
  }

  private onCommit(target: THREE.Vector3, heading: number, kind: TargetingKind): void {
    const id = this.pending;
    this.pending = null;
    if (!id) return;
    if (kind === 'cluster') this.cluster.call(target, heading);
    else this.airstrike.call(target, heading, kind === 'precision' ? 'precision' : 'carpet');
    this.usedPayload.id = id;
    this.deps.emit('killstreak:used', this.usedPayload);
  }

  private refund(): void {
    const id = this.pending;
    this.pending = null;
    if (!id) return;
    this.give(id, false);
  }

  private onPackageOpened(id: KillstreakId | 'ammo'): void {
    if (id === 'ammo') return;
    this.give(id, true);
  }

  /** Why `id` cannot be used right now, or null if it can. */
  private busyReason(id: KillstreakId): string | null {
    switch (id) {
      case 'airstrike':
        return this.airstrike.active ? 'STRIKE ALREADY INBOUND' : null;
      case 'cluster_strike':
        return this.cluster.active ? 'STRIKE ALREADY INBOUND' : null;
      case 'chopper_gunner':
        return this.chopper.active ? 'GUNSHIP ALREADY ON STATION' : null;
      case 'care_package':
        return this.carePackage.active ? 'PACKAGE ALREADY INBOUND' : null;
      default:
        return null;
    }
  }

  private deny(text: string, sub: string): void {
    this.deps.notify(text, sub, 'warn');
    this.deps.play2D(SOUNDS.tabletDeny, { volume: 0.7 });
  }

  private handleInput(ctx: EngineContext): void {
    // The tablet and the door gun own the device while they are up.
    if (this.targeting.active || this.chopper.inControl) return;
    if (this.deps.ui?.isMenuOpen) return;
    if (ctx.input.wasPressed('killstreak1')) this.activateSlot(0);
    else if (ctx.input.wasPressed('killstreak2')) this.activateSlot(1);
    else if (ctx.input.wasPressed('killstreak3')) this.activateSlot(2);
  }

  private activateSlot(slot: number): void {
    const id = this.held[slot];
    if (!id) {
      this.deny('NO KILLSTREAK', `SLOT ${slot + 1} EMPTY`);
      return;
    }
    this.activate(id);
  }

  /** Where an untargeted strike goes: straight out in front of the player. */
  private defaultTarget(): THREE.Vector3 {
    const out = this.scratch;
    this.deps.playerPosition(out);
    const yaw = this.deps.player?.yaw ?? 0;
    out.x -= Math.sin(yaw) * 60;
    out.z -= Math.cos(yaw) * 60;
    out.y = this.deps.groundAt(out.x, out.z, out.y);
    return out;
  }

  private defaultHeading(): number {
    return normalizeBearing((this.deps.player?.yaw ?? 0) + Math.PI);
  }

  // -------------------------------------------------------------------------
  // Diagnostics — read by the dev harness and the screenshot script
  // -------------------------------------------------------------------------

  /**
   * One instance of a named model, parented to nothing. Used by the dev harness
   * to photograph a silhouette; the caller owns the disposal.
   */
  createDebugModel(name: string): { root: THREE.Object3D; dispose: () => void } | null {
    switch (name) {
      case 'jet':
        return this.assets.createJet();
      case 'bomb':
        return this.assets.createBomb();
      case 'canister':
        return this.assets.createCanister();
      case 'bomblet':
        return this.assets.createBomblet();
      case 'drone':
        return this.assets.createDrone();
      case 'gunship':
        return this.assets.createGunship();
      case 'transport':
        return this.assets.createTransport();
      case 'crate':
        return this.assets.createCratePack();
      default:
        return null;
    }
  }

  get diagnostics(): Record<string, unknown> {
    return {
      streak: this.streak,
      held: this.held.slice(),
      targeting: this.targeting.active,
      airstrike: this.airstrike.diagnostics,
      cluster: this.cluster.diagnostics,
      uav: this.uav.diagnostics,
      chopper: this.chopper.diagnostics,
      carePackage: this.carePackage.diagnostics,
      triangles: Object.fromEntries(this.assets.triangles),
    };
  }
}

function targetingKindFor(id: KillstreakId): TargetingKind {
  return id === 'cluster_strike' ? 'cluster' : 'carpet';
}
