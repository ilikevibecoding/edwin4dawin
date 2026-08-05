import * as THREE from 'three';

/** Player input, or a deterministic stand-in when rendering offline. */
export class Input {
  private down = new Set<string>();
  private pressedThisFrame = new Set<string>();
  readonly move = new THREE.Vector2();
  readonly look = new THREE.Vector2();
  readonly pointer = new THREE.Vector2(0.5, 0.5);
  clicked = false;
  enabled = true;

  constructor(target: HTMLElement | Window = window) {
    const el = target as Window;
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.enabled) return;
      const key = normalise(e.key);
      if (!this.down.has(key)) this.pressedThisFrame.add(key);
      this.down.add(key);
      if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
    });
    el.addEventListener('keyup', (e: KeyboardEvent) => {
      this.down.delete(normalise(e.key));
    });
    el.addEventListener('mousemove', (e: MouseEvent) => {
      this.look.x += e.movementX ?? 0;
      this.look.y += e.movementY ?? 0;
      this.pointer.set(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    });
    el.addEventListener('mousedown', () => {
      if (this.enabled) this.clicked = true;
    });
    el.addEventListener('blur', () => this.down.clear());
  }

  isDown(key: string) {
    return this.down.has(normalise(key));
  }

  wasPressed(key: string) {
    return this.pressedThisFrame.has(normalise(key));
  }

  get anyPressed() {
    return this.pressedThisFrame.size > 0;
  }

  update() {
    this.move.set(0, 0);
    if (this.isDown('w') || this.isDown('arrowup')) this.move.y += 1;
    if (this.isDown('s') || this.isDown('arrowdown')) this.move.y -= 1;
    if (this.isDown('a') || this.isDown('arrowleft')) this.move.x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) this.move.x += 1;
    if (this.move.lengthSq() > 1) this.move.normalize();
  }

  endFrame() {
    this.pressedThisFrame.clear();
    this.clicked = false;
    this.look.set(0, 0);
  }
}

function normalise(key: string) {
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
}

/** Scripted decisions for the offline demo render. */
export interface AutoPlan {
  /** Option index per choice, by order of appearance. */
  choices: number[];
  /** Choice indices (0-based) that should be allowed to time out. */
  timeouts?: number[];
  /** QTE ordinals that should deliberately fail. */
  qteFails?: number[];
  /** Seconds to hover before committing to a choice. */
  choiceDelay?: number;
}
