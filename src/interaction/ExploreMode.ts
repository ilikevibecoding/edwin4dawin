import * as THREE from 'three';
import type { RenderSystem } from '../core/RenderSystem';
import type { PickableInfo, Stage } from '../show/Stage';
import { clamp, damp } from '../core/MathX';

/**
 * Free-look inspection mode.
 *
 * Orbit with the mouse, fly with WASD, click anything important. The camera
 * is tethered: it can never travel further than `maxRadius` from the subject
 * it was released at, so a viewer cannot get lost in empty space.
 */

export type ExploreAction = 'follow' | 'inspect' | 'return';

export interface Selection {
  info: PickableInfo;
  worldPosition: THREE.Vector3;
}

const _v = new THREE.Vector3();
const _box = new THREE.Box3();

export class ExploreMode {
  active = false;
  followTarget: THREE.Object3D | null = null;
  selection: Selection | null = null;
  hovered: PickableInfo | null = null;

  private render: RenderSystem;
  private stage: Stage;
  private canvas: HTMLCanvasElement;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerPixel = new THREE.Vector2();
  private keys = new Set<string>();
  private dragging = false;
  private yaw = 0;
  private pitch = 0;
  private distance = 40;
  private targetDistance = 40;
  private center = new THREE.Vector3();
  private smoothCenter = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private anchor = new THREE.Vector3();
  private maxRadius = 4000;
  private moveScale = 1;
  private onSelectionChanged: ((s: Selection | null) => void) | null = null;
  private onHoverChanged: ((info: PickableInfo | null, x: number, y: number) => void) | null = null;

  constructor(render: RenderSystem, stage: Stage, canvas: HTMLCanvasElement) {
    this.render = render;
    this.stage = stage;
    this.canvas = canvas;
    this.bind();
  }

  onSelection(fn: (s: Selection | null) => void): void {
    this.onSelectionChanged = fn;
  }

  onHover(fn: (info: PickableInfo | null, x: number, y: number) => void): void {
    this.onHoverChanged = fn;
  }

  private bind(): void {
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this.dragging = true;
      this.canvas.setPointerCapture(e.pointerId);
      this.pointerPixel.set(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', (e) => {
      if (!this.active) return;
      if (this.dragging) {
        const moved = Math.hypot(e.clientX - this.pointerPixel.x, e.clientY - this.pointerPixel.y);
        if (moved < 5) this.pick(e.clientX, e.clientY);
      }
      this.dragging = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      if (this.dragging) {
        const dx = e.clientX - this.pointerPixel.x;
        const dy = e.clientY - this.pointerPixel.y;
        this.yaw -= dx * 0.0042;
        this.pitch = clamp(this.pitch - dy * 0.0042, -1.45, 1.45);
        this.pointerPixel.set(e.clientX, e.clientY);
      } else {
        this.hover(e.clientX, e.clientY);
      }
    });
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.active) return;
        e.preventDefault();
        this.targetDistance = clamp(
          this.targetDistance * Math.pow(1.0016, e.deltaY),
          this.moveScale * 1.2,
          this.maxRadius,
        );
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Enter explore mode from the current cinematic camera pose. */
  enter(): void {
    this.active = true;
    const cam = this.render.camera;
    const interior = this.stage.interior.visible && !this.stage.space.visible;
    this.moveScale = interior ? 1 : 60;
    this.maxRadius = interior ? 60 : 9000;
    this.distance = this.targetDistance = interior ? 6 : 700;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    this.center.copy(cam.position).addScaledVector(forward, this.distance);
    this.smoothCenter.copy(this.center);
    this.anchor.copy(this.center);
    this.yaw = Math.atan2(forward.x, forward.z) + Math.PI;
    this.pitch = Math.asin(clamp(-forward.y, -1, 1));
    this.velocity.set(0, 0, 0);
  }

  exit(): void {
    this.active = false;
    this.followTarget = null;
    this.keys.clear();
    this.dragging = false;
  }

  private candidates(): PickableInfo[] {
    return this.stage.pickables.filter((p) => {
      let o: THREE.Object3D | null = p.object;
      while (o) {
        if (!o.visible) return false;
        o = o.parent;
      }
      return true;
    });
  }

  private raycast(clientX: number, clientY: number): PickableInfo | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.render.camera);
    this.raycaster.far = this.render.camera.far;
    const list = this.candidates();
    const objects = list.map((p) => p.object);
    const hits = this.raycaster.intersectObjects(objects, true);
    if (hits.length === 0) return null;
    let node: THREE.Object3D | null = hits[0].object;
    while (node) {
      const match = list.find((p) => p.object === node);
      if (match) return match;
      node = node.parent;
    }
    return null;
  }

  private hover(x: number, y: number): void {
    const hit = this.raycast(x, y);
    if (hit !== this.hovered) {
      this.hovered = hit;
      this.onHoverChanged?.(hit, x, y);
    } else if (hit) {
      this.onHoverChanged?.(hit, x, y);
    }
  }

  private pick(x: number, y: number): void {
    const hit = this.raycast(x, y);
    if (!hit) {
      this.selection = null;
      this.onSelectionChanged?.(null);
      return;
    }
    hit.object.getWorldPosition(_v);
    this.selection = { info: hit, worldPosition: _v.clone() };
    this.onSelectionChanged?.(this.selection);
  }

  act(action: ExploreAction): void {
    if (action === 'return') {
      this.exit();
      return;
    }
    if (!this.selection) return;
    if (action === 'follow') {
      this.followTarget = this.selection.info.object;
    } else {
      this.followTarget = null;
      _box.setFromObject(this.selection.info.object);
      if (!_box.isEmpty()) {
        _box.getCenter(this.center);
        this.targetDistance = clamp(
          _box.getSize(_v).length() * 0.85,
          this.moveScale * 1.2,
          this.maxRadius,
        );
      } else {
        this.center.copy(this.selection.worldPosition);
        this.targetDistance = this.selection.info.radius * 3;
      }
      this.anchor.copy(this.center);
    }
  }

  update(dt: number): void {
    if (!this.active) return;
    const cam = this.render.camera;

    if (this.followTarget) {
      this.followTarget.getWorldPosition(_v);
      this.center.lerp(_v, 1 - Math.exp(-4 * dt));
      this.anchor.copy(_v);
    }

    // WASD / QE fly, relative to the current view.
    const speed = this.moveScale * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 9 : 3);
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).negate();
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW')) move.add(forward);
    if (this.keys.has('KeyS')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);
    if (this.keys.has('KeyE') || this.keys.has('Space')) move.y += 1;
    if (this.keys.has('KeyQ')) move.y -= 1;
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      this.followTarget = null;
    }
    this.velocity.lerp(move, 1 - Math.exp(-9 * dt));
    this.center.addScaledVector(this.velocity, dt);

    // Tether: never wander more than maxRadius from the last anchor.
    _v.copy(this.center).sub(this.anchor);
    const len = _v.length();
    if (len > this.maxRadius) {
      this.center.copy(this.anchor).addScaledVector(_v.multiplyScalar(1 / len), this.maxRadius);
    }

    this.distance = damp(this.distance, this.targetDistance, 6, dt);
    this.smoothCenter.lerp(this.center, 1 - Math.exp(-12 * dt));

    const cp = Math.cos(this.pitch);
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * cp,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cp,
    ).multiplyScalar(this.distance);
    cam.position.copy(this.smoothCenter).add(offset);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.smoothCenter);
    cam.fov = damp(cam.fov, 46, 8, dt);
    const interior = this.stage.interior.visible && !this.stage.space.visible;
    cam.near = interior ? 0.05 : 1;
    cam.far = interior ? 400 : 40000;
    cam.updateProjectionMatrix();
  }

  /** Screen position of the hovered object, for the floating label. */
  projectHover(): { x: number; y: number } | null {
    if (!this.hovered) return null;
    this.hovered.object.getWorldPosition(_v);
    _v.project(this.render.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + ((_v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - _v.y) / 2) * rect.height,
    };
  }
}
