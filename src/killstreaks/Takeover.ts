/**
 * Modal control takeover, shared by the targeting tablet and the chopper gunner.
 *
 * Both of those need the same awkward thing: the player's look, movement and
 * weapon must stop dead, but the mouse must keep working — for something else.
 * `Input` is a single shared latch consumed by the player controller at order 200,
 * long before this module runs at 550, so there is no way to read the mouse from
 * here without the player having already turned with it. Setting `input.enabled`
 * false stops the player in one move, and this class then listens to the device
 * directly for the duration.
 *
 * It also owns the save-and-restore of everything a takeover disturbs — input
 * enable, viewmodel visibility, camera field of view, weapon input — so that
 * ending a takeover cannot leave the player holding an invisible rifle they are
 * not allowed to fire.
 */
import type { EngineContext } from '../core/System';
import { clamp } from '../core/MathUtils';
import type { KillstreakDeps } from './Deps';

export interface TakeoverOptions {
  /** Hide the first-person viewmodel scene. */
  hideViewmodel?: boolean;
  /** Field of view to hold while active. */
  fov?: number;
}

export class Takeover {
  active = false;

  /** Accumulated pointer motion in device pixels, cleared by `consumeMotion`. */
  private motionX = 0;
  private motionY = 0;
  private wheelNotches = 0;

  primaryDown = false;
  secondaryDown = false;
  primaryPressed = false;
  secondaryPressed = false;
  confirmPressed = false;
  cancelPressed = false;
  /** Signed nudges from Q/E, for players without a wheel. */
  private keyNudge = 0;

  private ctx: EngineContext | null = null;
  private readonly detachers: Array<() => void> = [];
  private savedInputEnabled = true;
  private savedViewSceneVisible = true;
  private savedFov = 0;
  private restoreFov = false;

  constructor(private readonly deps: KillstreakDeps) {}

  begin(ctx: EngineContext, options: TakeoverOptions = {}): void {
    if (this.active) return;
    this.active = true;
    this.ctx = ctx;
    this.motionX = 0;
    this.motionY = 0;
    this.wheelNotches = 0;
    this.keyNudge = 0;
    this.primaryDown = false;
    this.secondaryDown = false;
    this.primaryPressed = false;
    this.secondaryPressed = false;
    this.confirmPressed = false;
    this.cancelPressed = false;

    this.savedInputEnabled = ctx.input.enabled;
    this.savedViewSceneVisible = ctx.viewScene.visible;
    this.savedFov = ctx.camera.fov;
    this.restoreFov = options.fov !== undefined;

    ctx.input.enabled = false;
    if (options.hideViewmodel) ctx.viewScene.visible = false;
    if (options.fov !== undefined) {
      ctx.camera.fov = options.fov;
      ctx.camera.updateProjectionMatrix();
    }
    this.deps.setWeaponInput(false);
    this.attach();
  }

  end(): void {
    if (!this.active) return;
    this.active = false;
    this.detach();
    const ctx = this.ctx;
    this.ctx = null;
    if (!ctx) return;
    ctx.input.enabled = this.savedInputEnabled;
    ctx.viewScene.visible = this.savedViewSceneVisible;
    if (this.restoreFov) {
      ctx.camera.fov = this.savedFov;
      ctx.camera.updateProjectionMatrix();
    }
    // Motion accumulated behind a modal view must not snap the player's aim the
    // instant they get it back.
    ctx.input.clearAll();
    this.deps.setWeaponInput(true);
  }

  private attach(): void {
    const add = <K extends keyof WindowEventMap>(
      type: K,
      fn: (event: WindowEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ): void => {
      window.addEventListener(type, fn as EventListener, options);
      this.detachers.push(() => window.removeEventListener(type, fn as EventListener, options));
    };

    add('mousemove', (event: MouseEvent) => {
      // Same clamp the engine's own latch uses: some drivers spike movementX.
      this.motionX += clamp(event.movementX ?? 0, -400, 400);
      this.motionY += clamp(event.movementY ?? 0, -400, 400);
    });
    add(
      'wheel',
      (event: WheelEvent) => {
        this.wheelNotches += Math.sign(event.deltaY);
      },
      { passive: true },
    );
    add('mousedown', (event: MouseEvent) => {
      if (event.button === 0) {
        this.primaryDown = true;
        this.primaryPressed = true;
      } else if (event.button === 2) {
        this.secondaryDown = true;
        this.secondaryPressed = true;
      }
    });
    add('mouseup', (event: MouseEvent) => {
      if (event.button === 0) this.primaryDown = false;
      else if (event.button === 2) this.secondaryDown = false;
    });
    add('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      switch (event.code) {
        case 'Escape':
          this.cancelPressed = true;
          break;
        case 'Enter':
        case 'Space':
          this.confirmPressed = true;
          break;
        case 'KeyQ':
          this.keyNudge -= 1;
          break;
        case 'KeyE':
          this.keyNudge += 1;
          break;
        default:
          break;
      }
    });
    add('blur', () => {
      this.primaryDown = false;
      this.secondaryDown = false;
    });
  }

  private detach(): void {
    for (const off of this.detachers) off();
    this.detachers.length = 0;
  }

  /** Pointer motion since the last call, in device pixels, then zeroed. */
  consumeMotion(out: { x: number; y: number }): { x: number; y: number } {
    out.x = this.motionX;
    out.y = this.motionY;
    this.motionX = 0;
    this.motionY = 0;
    return out;
  }

  /** Wheel notches plus keyboard nudges since the last call. */
  consumeWheel(): number {
    const total = this.wheelNotches + this.keyNudge;
    this.wheelNotches = 0;
    this.keyNudge = 0;
    return total;
  }

  /** Clears the one-frame press edges. Call at the end of each update. */
  endFrame(): void {
    this.primaryPressed = false;
    this.secondaryPressed = false;
    this.confirmPressed = false;
    this.cancelPressed = false;
  }
}
