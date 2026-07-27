/**
 * Collider wireframe overlay, toggled with F4.
 *
 * `world.debugRender()` returns one flat line-segment soup for every collider
 * in the world — around 40k segments once the map is registered — so the buffer
 * is rebuilt on a slow cadence and the attributes are grown rather than
 * reallocated. This is the fastest way to confirm the physics representation
 * actually lines up with what the renderer draws.
 */
import * as THREE from 'three';
import type { World } from '@dimforge/rapier3d-compat';
import { PHYS } from './Tuning';

export class DebugRenderer {
  private lines: THREE.LineSegments | null = null;
  private positions: THREE.BufferAttribute | null = null;
  private colors: THREE.BufferAttribute | null = null;
  private capacity = 0;
  private frame = 0;
  private scene: THREE.Scene | null = null;

  enabled = false;
  /** Number of line segments in the last rebuild. */
  segments = 0;

  setEnabled(on: boolean, scene: THREE.Scene): void {
    if (this.enabled === on) return;
    this.enabled = on;
    this.scene = scene;
    if (on) {
      this.ensure(scene);
      this.frame = 0;
    } else if (this.lines) {
      scene.remove(this.lines);
    }
  }

  update(world: World): void {
    if (!this.enabled || !this.lines) return;
    if (this.frame++ % PHYS.debugRebuildInterval !== 0) return;

    const buffers = world.debugRender();
    const vertexCount = buffers.vertices.length / 3;
    if (vertexCount === 0) {
      this.lines.geometry.setDrawRange(0, 0);
      this.segments = 0;
      return;
    }
    if (vertexCount > this.capacity) this.grow(vertexCount);

    const positions = this.positions;
    const colors = this.colors;
    if (!positions || !colors) return;

    (positions.array as Float32Array).set(buffers.vertices);
    (colors.array as Float32Array).set(buffers.colors);
    positions.addUpdateRange(0, buffers.vertices.length);
    colors.addUpdateRange(0, buffers.colors.length);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, vertexCount);
    this.segments = vertexCount / 2;
  }

  dispose(): void {
    if (this.lines) {
      this.scene?.remove(this.lines);
      this.lines.geometry.dispose();
      (this.lines.material as THREE.Material).dispose();
      this.lines = null;
    }
    this.positions = null;
    this.colors = null;
    this.capacity = 0;
    this.enabled = false;
  }

  private ensure(scene: THREE.Scene): void {
    if (!this.lines) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        toneMapped: false,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
      });
      this.lines = new THREE.LineSegments(geometry, material);
      this.lines.name = 'PhysicsDebug';
      this.lines.frustumCulled = false;
      this.lines.renderOrder = 10000;
      this.grow(4096);
    }
    scene.add(this.lines);
  }

  private grow(vertexCount: number): void {
    const capacity = Math.max(4096, 1 << Math.ceil(Math.log2(vertexCount)));
    const positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    const colors = new THREE.BufferAttribute(new Float32Array(capacity * 4), 4);
    positions.setUsage(THREE.DynamicDrawUsage);
    colors.setUsage(THREE.DynamicDrawUsage);

    const geometry = this.lines?.geometry;
    if (geometry) {
      geometry.setAttribute('position', positions);
      geometry.setAttribute('color', colors);
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    }
    this.positions = positions;
    this.colors = colors;
    this.capacity = capacity;
  }
}
