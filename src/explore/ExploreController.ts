import * as THREE from 'three';
import type { Stage, SelectableInfo } from '../stage/Stage';
import { clamp, damp, dampVec } from '../core/math';
import { Signal } from '../core/Signals';

/**
 * Free camera and object picking for Explore mode.
 *
 * Movement is a damped orbit/fly hybrid with an anchor point: dragging orbits
 * the anchor, WASD moves the anchor, and the wheel dollies. The anchor is
 * always clamped to a generous but finite volume around the action, so the
 * viewer cannot end up lost in empty space with nothing on screen — and
 * "Return to cinematic camera" is always one click away.
 */

export type ExploreFocusMode = 'free' | 'follow' | 'inspect';

interface Bounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

const SPACE_BOUNDS: Bounds = {
  min: new THREE.Vector3(-3200, -1400, -2600),
  max: new THREE.Vector3(3200, 1900, 2600),
};
const INTERIOR_BOUNDS: Bounds = {
  min: new THREE.Vector3(-12, 0.35, -6),
  max: new THREE.Vector3(42, 2.9, 21),
};

export class ExploreController {
  readonly onSelect = new Signal<SelectableInfo | null>();
  readonly onHover = new Signal<{ info: SelectableInfo; x: number; y: number } | null>();

  enabled = false;
  focusMode: ExploreFocusMode = 'free';
  selected: SelectableInfo | null = null;

  private stage: Stage;
  private camera: THREE.PerspectiveCamera;
  private dom: HTMLElement;

  private anchor = new THREE.Vector3();
  private anchorTarget = new THREE.Vector3();
  private yaw = 0;
  private pitch = -0.12;
  private targetYaw = 0;
  private targetPitch = -0.12;
  private distance = 40;
  private targetDistance = 40;

  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private keys = new Set<string>();
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private pointerScreen = { x: 0, y: 0 };
  private hovered: SelectableInfo | null = null;
  private highlight: THREE.Mesh;
  private followOffset = new THREE.Vector3();
  private hasPointer = false;

  constructor(stage: Stage, camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.stage = stage;
    this.camera = camera;
    this.dom = dom;

    this.highlight = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 12),
      new THREE.MeshBasicMaterial({
        color: 0xf3c46a,
        transparent: true,
        opacity: 0.1,
        wireframe: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.highlight.visible = false;
    this.highlight.renderOrder = 30;
    this.stage.scene.add(this.highlight);

    this.attach();
  }

  private attach(): void {
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
    this.highlight.geometry.dispose();
    (this.highlight.material as THREE.Material).dispose();
  }

  /** Adopt the current cinematic camera so entering Explore never jump-cuts. */
  enter(): void {
    this.enabled = true;
    this.focusMode = 'free';
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const scale = this.stage.location === 'space' ? 220 : 6;
    this.distance = this.targetDistance = scale;
    this.anchor.copy(this.camera.position).addScaledVector(dir, scale);
    this.anchorTarget.copy(this.anchor);
    this.yaw = this.targetYaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = this.targetPitch = Math.asin(clamp(-dir.y, -0.99, 0.99));
    this.clampAnchor();
  }

  exit(): void {
    this.enabled = false;
    this.keys.clear();
    this.dragging = false;
    this.highlight.visible = false;
    this.hovered = null;
    this.onHover.emit(null);
  }

  select(info: SelectableInfo | null): void {
    this.selected = info;
    this.focusMode = info ? this.focusMode : 'free';
    this.onSelect.emit(info);
    if (!info) this.highlight.visible = false;
  }

  follow(): void {
    if (!this.selected) return;
    this.focusMode = 'follow';
    const p = new THREE.Vector3();
    this.selected.object.getWorldPosition(p);
    this.followOffset.copy(this.camera.position).sub(p);
    const want = this.selected.radius * 3.2;
    if (this.followOffset.length() < want * 0.4 || this.followOffset.length() > want * 4) {
      this.followOffset.set(want * 0.8, want * 0.45, want * 0.9);
    }
  }

  inspect(): void {
    if (!this.selected) return;
    this.focusMode = 'inspect';
    const p = new THREE.Vector3();
    this.selected.object.getWorldPosition(p);
    this.anchorTarget.copy(p);
    this.targetDistance = Math.max(this.selected.radius * 2.4, this.stage.location === 'space' ? 12 : 1.4);
    this.targetPitch = -0.1;
  }

  private bounds(): Bounds {
    return this.stage.location === 'space' ? SPACE_BOUNDS : INTERIOR_BOUNDS;
  }

  private clampAnchor(): void {
    const b = this.bounds();
    this.anchorTarget.x = clamp(this.anchorTarget.x, b.min.x, b.max.x);
    this.anchorTarget.y = clamp(this.anchorTarget.y, b.min.y, b.max.y);
    this.anchorTarget.z = clamp(this.anchorTarget.z, b.min.z, b.max.z);
  }

  private onPointerDown = (ev: PointerEvent): void => {
    if (!this.enabled || ev.button !== 0) return;
    this.dragging = true;
    this.lastPointer.x = ev.clientX;
    this.lastPointer.y = ev.clientY;
    this.dragStart = { x: ev.clientX, y: ev.clientY };
  };
  private dragStart = { x: 0, y: 0 };

  private onPointerMove = (ev: PointerEvent): void => {
    this.pointerScreen.x = ev.clientX;
    this.pointerScreen.y = ev.clientY;
    this.hasPointer = true;
    if (!this.enabled) return;
    const rect = this.dom.getBoundingClientRect();
    this.pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    if (!this.dragging) return;
    const dx = ev.clientX - this.lastPointer.x;
    const dy = ev.clientY - this.lastPointer.y;
    this.lastPointer.x = ev.clientX;
    this.lastPointer.y = ev.clientY;
    this.targetYaw -= dx * 0.0042;
    this.targetPitch = clamp(this.targetPitch - dy * 0.0038, -1.3, 1.3);
    if (this.focusMode === 'inspect') this.focusMode = 'free';
  };

  private onPointerUp = (ev: PointerEvent): void => {
    if (!this.enabled) {
      this.dragging = false;
      return;
    }
    const moved = Math.hypot(ev.clientX - this.dragStart.x, ev.clientY - this.dragStart.y);
    this.dragging = false;
    // A click (not a drag) over a subject selects it.
    if (moved < 5 && ev.button === 0) {
      const hit = this.pick();
      this.select(hit);
    }
  };

  private onWheel = (ev: WheelEvent): void => {
    if (!this.enabled) return;
    ev.preventDefault();
    const factor = Math.exp(ev.deltaY * 0.0013);
    const b = this.stage.location === 'space' ? [6, 2600] : [0.35, 40];
    this.targetDistance = clamp(this.targetDistance * factor, b[0], b[1]);
    if (this.focusMode === 'inspect') this.focusMode = 'free';
  };

  private onKeyDown = (ev: KeyboardEvent): void => {
    if (!this.enabled) return;
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    this.keys.add(ev.key.toLowerCase());
  };

  private onKeyUp = (ev: KeyboardEvent): void => {
    this.keys.delete(ev.key.toLowerCase());
  };

  private pick(): SelectableInfo | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const candidates = this.stage.selectables.filter(
      (s) => s.location === this.stage.location && s.object.visible && isTreeVisible(s.object),
    );
    let best: { info: SelectableInfo; dist: number } | null = null;
    for (const info of candidates) {
      const hits = this.raycaster.intersectObject(info.object, true);
      if (hits.length === 0) continue;
      if (!best || hits[0].distance < best.dist) best = { info, dist: hits[0].distance };
    }
    return best?.info ?? null;
  }

  update(dt: number): void {
    if (!this.enabled) return;

    // --- keyboard movement ---------------------------------------------------
    const fast = this.keys.has('shift');
    const base = this.stage.location === 'space' ? 160 : 3.2;
    const speed = base * (fast ? 3.4 : 1) * dt;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    let moved = false;
    if (this.keys.has('w')) {
      this.anchorTarget.addScaledVector(forward, speed);
      moved = true;
    }
    if (this.keys.has('s')) {
      this.anchorTarget.addScaledVector(forward, -speed);
      moved = true;
    }
    if (this.keys.has('a')) {
      this.anchorTarget.addScaledVector(right, -speed);
      moved = true;
    }
    if (this.keys.has('d')) {
      this.anchorTarget.addScaledVector(right, speed);
      moved = true;
    }
    if (this.keys.has('z') || this.keys.has(' ')) {
      this.anchorTarget.y += speed;
      moved = true;
    }
    if (this.keys.has('q')) {
      this.anchorTarget.y -= speed;
      moved = true;
    }
    if (moved && this.focusMode !== 'free') this.focusMode = 'free';

    // --- follow --------------------------------------------------------------
    if (this.focusMode === 'follow' && this.selected) {
      const p = new THREE.Vector3();
      this.selected.object.getWorldPosition(p);
      this.anchorTarget.copy(p);
    }
    if (this.focusMode === 'inspect' && this.selected) {
      const p = new THREE.Vector3();
      this.selected.object.getWorldPosition(p);
      this.anchorTarget.copy(p);
      this.targetYaw += dt * 0.16;
    }

    this.clampAnchor();
    dampVec(this.anchor, this.anchorTarget, 0.13, dt);
    this.yaw = damp(this.yaw, this.targetYaw, 0.1, dt);
    this.pitch = damp(this.pitch, this.targetPitch, 0.1, dt);
    this.distance = damp(this.distance, this.targetDistance, 0.14, dt);

    const cp = Math.cos(this.pitch);
    this.camera.position.set(
      this.anchor.x + Math.sin(this.yaw) * cp * this.distance,
      this.anchor.y + Math.sin(this.pitch) * this.distance,
      this.anchor.z + Math.cos(this.yaw) * cp * this.distance,
    );
    // Never let the interior camera pass through the deck or the ceiling.
    if (this.stage.location === 'interior') {
      const b = INTERIOR_BOUNDS;
      this.camera.position.x = clamp(this.camera.position.x, b.min.x, b.max.x);
      this.camera.position.y = clamp(this.camera.position.y, b.min.y, b.max.y);
      this.camera.position.z = clamp(this.camera.position.z, b.min.z - 1, b.max.z);
    }
    this.camera.lookAt(this.anchor);

    // --- hover highlight -----------------------------------------------------
    if (this.hasPointer && !this.dragging) {
      const hit = this.pick();
      if (hit !== this.hovered) {
        this.hovered = hit;
        this.onHover.emit(hit ? { info: hit, x: this.pointerScreen.x, y: this.pointerScreen.y } : null);
        this.dom.style.cursor = hit ? 'pointer' : '';
      } else if (hit) {
        this.onHover.emit({ info: hit, x: this.pointerScreen.x, y: this.pointerScreen.y });
      }
    }

    const marker = this.hovered ?? this.selected;
    if (marker) {
      const p = new THREE.Vector3();
      marker.object.getWorldPosition(p);
      this.highlight.position.copy(p);
      this.highlight.scale.setScalar(marker.radius * 1.12);
      const mat = this.highlight.material as THREE.MeshBasicMaterial;
      mat.opacity = marker === this.selected ? 0.16 : 0.09;
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }
}

function isTreeVisible(obj: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = obj;
  while (node) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}
