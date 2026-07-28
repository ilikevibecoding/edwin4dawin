import * as THREE from 'three';

/**
 * Numeric dump of the composed viewmodel pose, installed only under
 * `?vmdebug=1` and reported through `console.warn` so the screenshot harness
 * picks it up in `console.log`.
 *
 * Framing a viewmodel by eye off a 1 fps software-rendered capture is guesswork.
 * The screen-space box of the weapon and the per-layer pose contributions say
 * directly how much of the frame the gun covers and which layer put it there.
 */

const RAD2DEG = 180 / Math.PI;

/** Frames between reports; the pose is quasi-static, so this is plenty. */
const REPORT_INTERVAL = 45;

export const viewDebugRequested = (): boolean => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('vmdebug') === '1';
};

const f = (n: number, digits = 3): string => (Object.is(n, -0) ? 0 : n).toFixed(digits);

const v3 = (v: THREE.Vector3, digits = 3): string =>
  `(${f(v.x, digits)}, ${f(v.y, digits)}, ${f(v.z, digits)})`;

export class ViewDebug {
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly degrees = new THREE.Vector3();
  private readonly corner = new THREE.Vector3();
  private readonly lines: string[] = [];
  private frame = 0;
  private reporting = false;

  /** Call before the layer stack runs; true when this frame will be reported. */
  begin(): boolean {
    this.reporting = ++this.frame % REPORT_INTERVAL === 0;
    if (this.reporting) this.lines.length = 0;
    return this.reporting;
  }

  get active(): boolean {
    return this.reporting;
  }

  add(label: string, text: string): void {
    if (this.reporting) this.lines.push(`    ${label.padEnd(11)} ${text}`);
  }

  layer(name: string, position: THREE.Vector3, rotation: THREE.Vector3): void {
    if (!this.reporting) return;
    const idle = position.lengthSq() < 1e-10 && rotation.lengthSq() < 1e-10;
    this.degrees.copy(rotation).multiplyScalar(RAD2DEG);
    this.add(
      name,
      `${idle ? 'idle' : 'ON  '} pos ${v3(position, 4)} rot ${v3(this.degrees, 2)} deg`,
    );
  }

  pose(label: string, position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    if (!this.reporting) return;
    this.euler.setFromQuaternion(quaternion);
    this.add(
      label,
      `pos ${v3(position, 4)} yaw ${f(this.euler.y * RAD2DEG, 2)} pitch ${f(
        this.euler.x * RAD2DEG,
        2,
      )} roll ${f(this.euler.z * RAD2DEG, 2)} (YXZ deg)`,
    );
  }

  point(label: string, view: THREE.Vector3, camera: THREE.PerspectiveCamera): void {
    if (!this.reporting) return;
    this.corner.copy(view).applyMatrix4(camera.projectionMatrix);
    this.add(label, `view ${v3(view, 4)} ndc (${f(this.corner.x, 3)}, ${f(this.corner.y, 3)})`);
  }

  size(label: string, box: THREE.Box3): void {
    if (this.reporting) this.add(label, `${v3(box.getSize(this.corner), 3)} m`);
  }

  /** NDC extent of a view-space box: the fraction of the frame the gun owns. */
  box(label: string, box: THREE.Box3, camera: THREE.PerspectiveCamera): void {
    if (!this.reporting) return;
    if (box.isEmpty()) return this.add(label, 'empty');
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      this.corner.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
      );
      // Anything at or behind the lens projects to nonsense; clamp it onto the
      // near plane so a buttstock past the eye cannot poison the extent.
      this.corner.z = Math.min(this.corner.z, -0.02);
      this.corner.applyMatrix4(camera.projectionMatrix);
      minX = Math.min(minX, this.corner.x);
      minY = Math.min(minY, this.corner.y);
      maxX = Math.max(maxX, this.corner.x);
      maxY = Math.max(maxY, this.corner.y);
    }
    const area = (((maxX - minX) * (maxY - minY)) / 4) * 100;
    this.add(
      label,
      `ndc x ${f(minX, 2)}..${f(maxX, 2)} y ${f(minY, 2)}..${f(maxY, 2)} area ${f(area, 1)}%`,
    );
  }

  flush(): void {
    if (!this.reporting) return;
    this.reporting = false;
    console.warn(`[vmdebug]\n${this.lines.join('\n')}`);
  }
}
