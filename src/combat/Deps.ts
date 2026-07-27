import type { EngineContext } from '../core/System';
import type {
  AISystem,
  AudioSystem,
  FXSystem,
  KillstreakSystem,
  PhysicsSystem,
  PlayerSystem,
  RenderSystem,
  UISystem,
  WorldSystem,
} from '../core/Contracts';

/**
 * Handles to everything combat talks to.
 *
 * Combat sits at `ORDER.COMBAT` (400) and is therefore initialised before world,
 * fx, audio, ui and render, so the references are resolved on demand instead of
 * captured in `init`. Anything still missing is retried once per frame and any
 * module that never appears simply degrades to a no-op — which is what keeps the
 * ballistics testable against a bare engine.
 */
export class CombatDeps {
  physics: PhysicsSystem | null = null;
  world: WorldSystem | null = null;
  fx: FXSystem | null = null;
  audio: AudioSystem | null = null;
  ui: UISystem | null = null;
  ai: AISystem | null = null;
  render: RenderSystem | null = null;
  player: PlayerSystem | null = null;
  killstreaks: KillstreakSystem | null = null;

  private ctx: EngineContext | null = null;

  attach(ctx: EngineContext): void {
    this.ctx = ctx;
    this.resolve();
  }

  get context(): EngineContext | null {
    return this.ctx;
  }

  /** True once the physics system exists and has finished booting Rapier. */
  get physicsReady(): boolean {
    const physics = this.physics;
    return physics !== null && physics.ready;
  }

  resolve(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.physics ??= ctx.tryGet<PhysicsSystem>('physics') ?? null;
    this.world ??= ctx.tryGet<WorldSystem>('world') ?? null;
    this.fx ??= ctx.tryGet<FXSystem>('fx') ?? null;
    this.audio ??= ctx.tryGet<AudioSystem>('audio') ?? null;
    this.ui ??= ctx.tryGet<UISystem>('ui') ?? null;
    this.ai ??= ctx.tryGet<AISystem>('ai') ?? null;
    this.render ??= ctx.tryGet<RenderSystem>('render') ?? null;
    this.player ??= ctx.tryGet<PlayerSystem>('player') ?? null;
    this.killstreaks ??= ctx.tryGet<KillstreakSystem>('killstreaks') ?? null;
  }

  /** Seconds since engine start; 0 before the engine is wired up. */
  now(): number {
    return this.ctx?.time.elapsed ?? 0;
  }

  emit<T>(type: string, payload: T): void {
    this.ctx?.events.emit(type, payload);
  }

  detach(): void {
    this.ctx = null;
    this.physics = null;
    this.world = null;
    this.fx = null;
    this.audio = null;
    this.ui = null;
    this.ai = null;
    this.render = null;
    this.player = null;
    this.killstreaks = null;
  }
}
