/**
 * Explore mode.
 *
 * A free camera with mouse-look, WASD movement and click-to-inspect. It takes
 * over the camera from the director but leaves the timeline alone, so the
 * viewer can pause mid-shot, walk around the frame, and resume exactly where
 * they left off.
 *
 * Three safeguards keep the viewer from getting lost:
 *   · movement is clamped to a generous bounding sphere around the action;
 *   · "Return to cinematic camera" always snaps back to the directed pose;
 *   · the camera is nudged out of solid geometry if it ends up inside the
 *     corridor's walls.
 */

import * as THREE from 'three';
import { clamp, damp } from '../core/math';
import type { World, Selectable } from '../show/world';
import { INTERIOR_ORIGIN } from '../show/world';
import { CORRIDOR_WIDTH, CORRIDOR_HEIGHT, SECTION_LENGTH } from '../interior/corridor';
import { CORRIDOR_SECTIONS } from '../show/world';
import { outlineMaterial } from '../assets/materials';

export type ExploreAction = 'follow' | 'inspect' | 'return';

export interface ExploreCallbacks {
  onHover(s: Selectable | null, screenX: number, screenY: number): void;
  onSelect(s: Selectable | null): void;
}

export class ExploreMode {
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private dom: HTMLElement;
  private cb: ExploreCallbacks;

  active = false;

  private yaw = 0;
  private pitch = 0;
  private velocity = new THREE.Vector3();
  private keys = new Set<string>();
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private pointerNdc = new THREE.Vector2(2, 2);
  private raycaster = new THREE.Raycaster();
  private hovered: Selectable | null = null;
  private selected: Selectable | null = null;
  private highlight: THREE.Mesh | null = null;
  private following: Selectable | null = null;
  private followOffset = new THREE.Vector3();
  private inspectTarget: { position: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private speedScale = 1;
  private pointerMoved = false;
  private pointerDownAt = 0;

  constructor(camera: THREE.PerspectiveCamera, world: World, dom: HTMLElement, cb: ExploreCallbacks) {
    this.camera = camera;
    this.world = world;
    this.dom = dom;
    this.cb = cb;
    this.bind();
  }

  private bind(): void {
    this.dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.dom.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.dom.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.clearHighlight();
  }

  /** Adopt the current directed camera pose so entering the mode is seamless. */
  enter(): void {
    this.active = true;
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = e.y;
    this.pitch = e.x;
    this.velocity.set(0, 0, 0);
    this.following = null;
    this.inspectTarget = null;
  }

  exit(): void {
    this.active = false;
    this.keys.clear();
    this.dragging = false;
    this.following = null;
    this.inspectTarget = null;
    this.setHovered(null);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.active) return;
    const target = e.target as HTMLElement | null;
    if (target && /input|select|textarea/i.test(target.tagName)) return;
    this.keys.add(e.code);
    if (e.code === 'KeyR') this.act('return');
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (!this.active || e.button !== 0) return;
    this.dragging = true;
    this.pointerMoved = false;
    this.pointerDownAt = performance.now();
    this.lastPointer = { x: e.clientX, y: e.clientY };
    document.getElementById('app')?.classList.add('dragging');
  };

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.dom.getBoundingClientRect();
    this.pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    if (!this.active) return;
    if (this.dragging) {
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.pointerMoved = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.yaw -= dx * 0.0026;
      this.pitch = clamp(this.pitch - dy * 0.0026, -1.45, 1.45);
      // Any manual look breaks a follow lock.
      if (this.pointerMoved) this.following = null;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.active) {
      this.dragging = false;
      return;
    }
    const wasClick = !this.pointerMoved && performance.now() - this.pointerDownAt < 400;
    this.dragging = false;
    document.getElementById('app')?.classList.remove('dragging');
    if (wasClick && e.button === 0) {
      this.cb.onSelect(this.hovered);
      this.selected = this.hovered;
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.active) return;
    e.preventDefault();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.camera.position.addScaledVector(forward, -Math.sign(e.deltaY) * this.moveSpeed() * 0.55);
    this.inspectTarget = null;
  };

  private moveSpeed(): number {
    const base = this.world.currentRegion === 'interior' ? 3.2 : 190;
    return base * this.speedScale * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 4 : 1);
  }

  act(action: ExploreAction): void {
    if (action === 'return') {
      this.following = null;
      this.inspectTarget = null;
      this.exit();
      return;
    }
    if (!this.selected) return;
    if (action === 'follow') {
      this.following = this.selected;
      const p = new THREE.Vector3();
      this.selected.object.getWorldPosition(p);
      this.followOffset.copy(this.camera.position).sub(p);
      const min = this.selected.radius * 1.5;
      if (this.followOffset.length() < min) this.followOffset.setLength(min);
      this.inspectTarget = null;
    } else if (action === 'inspect') {
      const p = new THREE.Vector3();
      this.selected.object.getWorldPosition(p);
      const dir = new THREE.Vector3(0.62, 0.34, 0.7).normalize();
      const dist = Math.max(2.2, this.selected.radius * 2.6);
      this.inspectTarget = { position: p.clone().addScaledVector(dir, dist), look: p.clone() };
      this.following = null;
    }
  }

  get selection(): Selectable | null {
    return this.selected;
  }

  setSelection(s: Selectable | null): void {
    this.selected = s;
  }

  /** Called every frame while the mode is active. */
  update(dt: number): void {
    if (!this.active) return;

    if (this.inspectTarget) {
      // Ease into the framing rather than snapping.
      this.camera.position.lerp(this.inspectTarget.position, 1 - Math.pow(0.0025, dt));
      const q = new THREE.Quaternion();
      const m = new THREE.Matrix4().lookAt(this.camera.position, this.inspectTarget.look, new THREE.Vector3(0, 1, 0));
      q.setFromRotationMatrix(m);
      this.camera.quaternion.slerp(q, 1 - Math.pow(0.0025, dt));
      const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
      this.yaw = e.y;
      this.pitch = e.x;
      if (this.camera.position.distanceTo(this.inspectTarget.position) < 0.4) this.inspectTarget = null;
    } else {
      const speed = this.moveSpeed();
      const dir = new THREE.Vector3();
      if (this.keys.has('KeyW')) dir.z -= 1;
      if (this.keys.has('KeyS')) dir.z += 1;
      if (this.keys.has('KeyA')) dir.x -= 1;
      if (this.keys.has('KeyD')) dir.x += 1;
      if (this.keys.has('KeyE') || this.keys.has('Space')) dir.y += 1;
      if (this.keys.has('KeyQ')) dir.y -= 1;
      if (dir.lengthSq() > 0) {
        dir.normalize().applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
        if (this.keys.has('KeyW') || this.keys.has('KeyS')) {
          // Pitch affects forward/back so looking down flies you downward.
          const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
          const sign = this.keys.has('KeyW') ? 1 : -1;
          dir.y += fwd.y * sign;
        }
        this.velocity.addScaledVector(dir.normalize(), speed * dt * 5.5);
      }
      this.velocity.multiplyScalar(Math.pow(0.0016, dt));
      this.camera.position.addScaledVector(this.velocity, dt);

      if (this.following) {
        const p = new THREE.Vector3();
        this.following.object.getWorldPosition(p);
        this.camera.position.copy(p).add(this.followOffset);
        const m = new THREE.Matrix4().lookAt(this.camera.position, p, new THREE.Vector3(0, 1, 0));
        const q = new THREE.Quaternion().setFromRotationMatrix(m);
        this.camera.quaternion.slerp(q, 1 - Math.pow(0.002, dt));
        const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        this.yaw = damp(this.yaw, e.y, 0.001, dt);
        this.pitch = damp(this.pitch, e.x, 0.001, dt);
      } else {
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      }
    }

    this.constrain();
    this.pick();
  }

  /** Keep the viewer inside a sane volume and out of solid geometry. */
  private constrain(): void {
    const p = this.camera.position;
    if (this.world.currentRegion === 'interior') {
      const local = p.clone().sub(INTERIOR_ORIGIN);
      const bayZ = CORRIDOR_SECTIONS * SECTION_LENGTH + 3.1;
      const inBay = local.z > bayZ - 3.1;
      const halfW = inBay ? 3.5 : CORRIDOR_WIDTH / 2 - 0.22;
      const maxY = (inBay ? CORRIDOR_HEIGHT + 0.5 : CORRIDOR_HEIGHT) - 0.18;
      local.x = clamp(local.x, -halfW, halfW);
      local.y = clamp(local.y, 0.22, maxY);
      local.z = clamp(local.z, 0.4, bayZ + 2.6);
      p.copy(local).add(INTERIOR_ORIGIN);
    } else {
      // A generous sphere centred on the corvette.
      const centre = this.world.runner.group.position;
      const offset = p.clone().sub(centre);
      const max = 9000;
      if (offset.length() > max) {
        offset.setLength(max);
        p.copy(centre).add(offset);
      }
    }
  }

  private pick(): void {
    if (this.pointerNdc.x < -1 || this.pointerNdc.x > 1) return;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const candidates = this.world.activeSelectables();
    let best: Selectable | null = null;
    let bestDist = Infinity;
    for (const s of candidates) {
      // The planet is a sky-scene object and cannot be ray-tested here.
      if (s.id === 'planet') continue;
      const hits = this.raycaster.intersectObject(s.object, true);
      if (hits.length && hits[0].distance < bestDist) {
        bestDist = hits[0].distance;
        best = s;
      }
    }
    this.setHovered(best);
  }

  private setHovered(s: Selectable | null): void {
    if (this.hovered === s) return;
    this.hovered = s;
    this.clearHighlight();
    if (s) this.applyHighlight(s);
    const rect = this.dom.getBoundingClientRect();
    this.cb.onHover(
      s,
      ((this.pointerNdc.x + 1) / 2) * rect.width,
      ((1 - this.pointerNdc.y) / 2) * rect.height,
    );
    document.getElementById('app')?.classList.toggle('over-target', !!s);
  }

  /** A subtly inflated back-face shell around the hovered subject. */
  private applyHighlight(s: Selectable): void {
    const box = new THREE.Box3().setFromObject(s.object);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.x) || size.length() === 0) return;
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, outlineMaterial());
    mesh.position.copy(centre);
    mesh.scale.multiplyScalar(1.03);
    mesh.renderOrder = 5;
    (mesh.material as THREE.Material).opacity = 0.16;
    this.highlight = mesh;
    s.object.parent?.add(mesh);
  }

  private clearHighlight(): void {
    if (!this.highlight) return;
    this.highlight.removeFromParent();
    this.highlight.geometry.dispose();
    this.highlight = null;
  }

  get hoveredSelectable(): Selectable | null {
    return this.hovered;
  }
}
