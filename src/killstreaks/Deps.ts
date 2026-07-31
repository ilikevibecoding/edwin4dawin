/**
 * Lazy dependency resolution.
 *
 * Killstreaks sit downstream of nearly every other system, and two of them —
 * audio and ui — are optional from this module's point of view: a strike must
 * still fly if the HUD is not registered. So nothing is resolved in `init`
 * (registration order is not guaranteed to have reached everyone yet) and every
 * optional call goes through a guard. UI in particular is called across a module
 * boundary that is under active development; a throw from `announce` must not be
 * able to abort a strike mid-air, so those calls are wrapped.
 */
import * as THREE from 'three';
import type {
  AISystem,
  AudioSystem,
  CombatSystem,
  FXSystem,
  PhysicsSystem,
  PlayerSystem,
  ProcgenSystem,
  RenderSystem,
  UISystem,
  WeaponSystem,
  WorldSystem,
} from '../core/Contracts';
import type { Damageable } from '../core/GameTypes';
import type { EngineContext } from '../core/System';

export class KillstreakDeps {
  context: EngineContext | null = null;

  combat: CombatSystem | null = null;
  fx: FXSystem | null = null;
  world: WorldSystem | null = null;
  ai: AISystem | null = null;
  player: PlayerSystem | null = null;
  render: RenderSystem | null = null;
  physics: PhysicsSystem | null = null;
  procgen: ProcgenSystem | null = null;
  audio: AudioSystem | null = null;
  ui: UISystem | null = null;
  weapons: WeaponSystem | null = null;

  private uiFailed = false;

  attach(ctx: EngineContext): void {
    this.context = ctx;
    this.resolve();
  }

  /** Cheap enough to call every frame; each slot is only looked up once. */
  resolve(): void {
    const ctx = this.context;
    if (!ctx) return;
    this.combat ??= ctx.tryGet<CombatSystem>('combat') ?? null;
    this.fx ??= ctx.tryGet<FXSystem>('fx') ?? null;
    this.world ??= ctx.tryGet<WorldSystem>('world') ?? null;
    this.ai ??= ctx.tryGet<AISystem>('ai') ?? null;
    this.player ??= ctx.tryGet<PlayerSystem>('player') ?? null;
    this.render ??= ctx.tryGet<RenderSystem>('render') ?? null;
    this.physics ??= ctx.tryGet<PhysicsSystem>('physics') ?? null;
    this.procgen ??= ctx.tryGet<ProcgenSystem>('procgen') ?? null;
    this.weapons ??= ctx.tryGet<WeaponSystem>('weapons') ?? null;
    this.audio ??= ctx.tryGet<AudioSystem>('audio') ?? null;
    this.ui ??= ctx.tryGet<UISystem>('ui') ?? null;
  }

  detach(): void {
    this.context = null;
    this.combat = null;
    this.fx = null;
    this.world = null;
    this.ai = null;
    this.player = null;
    this.render = null;
    this.physics = null;
    this.procgen = null;
    this.audio = null;
    this.ui = null;
    this.weapons = null;
  }

  get scene(): THREE.Scene | null {
    return this.context?.scene ?? null;
  }

  get now(): number {
    return this.context?.time.elapsed ?? 0;
  }

  /** The local player as a damage source, so a strike can kill its own caller. */
  get playerEntity(): Damageable | null {
    return this.player?.entity ?? null;
  }

  emit<T>(type: string, payload: T): void {
    this.context?.events.emit(type, payload);
  }

  /** Ground height at an XZ, falling back to a supplied default off-mesh. */
  groundAt(x: number, z: number, fallback = 0): number {
    const h = this.world?.sampleGround(x, z);
    return h === null || h === undefined ? fallback : h;
  }

  playerPosition(out: THREE.Vector3): THREE.Vector3 {
    const player = this.player;
    if (player) return out.copy(player.position);
    const camera = this.context?.camera;
    if (camera) return camera.getWorldPosition(out);
    return out.set(0, 0, 0);
  }

  playerEye(out: THREE.Vector3): THREE.Vector3 {
    const player = this.player;
    if (player) return player.getEyePosition(out);
    return this.playerPosition(out).setY(out.y + 1.6);
  }

  // -------------------------------------------------------------------------
  // Guarded optional calls
  // -------------------------------------------------------------------------

  announce(text: string, sub?: string, duration?: number): void {
    this.callUI((ui) => ui.announce(text, sub, duration));
  }

  notify(text: string, sub?: string, kind?: 'info' | 'warn' | 'reward'): void {
    this.callUI((ui) => ui.notify(text, sub, kind));
  }

  marker(id: string, position: THREE.Vector3 | null, label?: string): void {
    this.callUI((ui) => ui.setObjectiveMarker(id, position, label));
  }

  scopeOverlay(kind: 'none' | 'holo' | 'acog' | 'sniper' | 'thermal', amount: number): void {
    this.callUI((ui) => ui.setScopeOverlay(kind, amount));
  }

  killstreakSelection(open: boolean): void {
    this.callUI((ui) => ui.setKillstreakSelectionOpen(open));
  }

  private callUI(fn: (ui: UISystem) => void): void {
    const ui = this.ui;
    if (!ui || this.uiFailed) return;
    try {
      fn(ui);
    } catch (err) {
      // One warning, then stop trying: a HUD that throws must not be able to
      // take the ordnance down with it.
      this.uiFailed = true;
      console.warn('[killstreaks] ui call failed; HUD integration disabled', err);
    }
  }

  play(id: string, position?: THREE.Vector3, opts?: AudioOptions): void {
    this.audio?.play(id, position, opts);
  }

  play2D(id: string, opts?: { volume?: number; pitch?: number }): void {
    this.audio?.play2D(id, opts);
  }

  setWeaponInput(enabled: boolean): void {
    this.weapons?.setInputEnabled(enabled);
  }

  deafen(amount: number, duration: number): void {
    this.audio?.setDeafen(amount, duration);
  }
}

export interface AudioOptions {
  volume?: number;
  pitch?: number;
  refDistance?: number;
  maxDistance?: number;
}
