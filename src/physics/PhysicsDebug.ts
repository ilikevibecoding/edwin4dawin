import * as THREE from 'three';
import { Layers } from '../core/GameContext';

/**
 * Wireframe overlay for the physics state, toggled with the `debug:toggle`
 * event and a payload of `'physics'`.
 *
 * Everything draws into preallocated buffers with a moving draw range, so
 * turning it on costs a few draw calls and no allocation per frame. Colliders,
 * rigid bodies, the character capsule and live contact points are all visible
 * at once, which is the difference between seeing a bug and guessing at it.
 *
 * Level and body wireframes are depth tested, so they read as edges on the
 * geometry they belong to instead of a hairball. The character capsule and
 * contact points are not: those are the things being debugged, and they are
 * almost always inside the mesh or the wall that is causing the trouble.
 *
 * Contacts are drawn as line crosses rather than `THREE.Points`, because a
 * point sprite is at the mercy of the driver's `gl_PointSize` support and comes
 * out as a single invisible pixel on some software rasterisers.
 */

const MAX_LINE_VERTS = 24576;
const MAX_OVERLAY_VERTS = 4096;
/** Arm length of a contact cross, in metres. */
const CONTACT_SIZE = 0.09;

const COLOR_STATIC = [0.35, 0.7, 1.0];
const COLOR_AWAKE = [0.3, 0.95, 0.45];
const COLOR_ASLEEP = [0.35, 0.4, 0.55];
/** Cyan, to stay legible over the warm tones player meshes tend to use. */
const COLOR_CAPSULE = [0.15, 1.0, 0.9];
/** Magenta: the one hue nothing else in a grey-and-warm level uses. */
const COLOR_CONTACT = [1.0, 0.1, 0.9];

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export class PhysicsDebug {
  readonly group = new THREE.Group();
  enabled = false;

  private linePos = new Float32Array(MAX_LINE_VERTS * 3);
  private lineCol = new Float32Array(MAX_LINE_VERTS * 3);
  private overlayPos = new Float32Array(MAX_OVERLAY_VERTS * 3);
  private overlayCol = new Float32Array(MAX_OVERLAY_VERTS * 3);
  private lineCount = 0;
  private overlayCount = 0;
  /** When set, `segment` writes to the no-depth-test overlay buffer. */
  private toOverlay = false;
  private lines: THREE.LineSegments;
  private overlay: THREE.LineSegments;

  constructor() {
    this.group.name = 'PhysicsDebug';
    this.group.visible = false;
    this.group.frustumCulled = false;

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(this.lineCol, 3));
    lineGeo.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }),
    );
    this.lines.frustumCulled = false;
    this.lines.layers.set(Layers.DEFAULT);
    this.lines.layers.enable(Layers.NO_SHADOW);
    this.group.add(this.lines);

    const overlayGeo = new THREE.BufferGeometry();
    overlayGeo.setAttribute('position', new THREE.BufferAttribute(this.overlayPos, 3));
    overlayGeo.setAttribute('color', new THREE.BufferAttribute(this.overlayCol, 3));
    overlayGeo.setDrawRange(0, 0);
    this.overlay = new THREE.LineSegments(
      overlayGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false }),
    );
    this.overlay.frustumCulled = false;
    this.overlay.renderOrder = 9;
    this.overlay.layers.set(Layers.DEFAULT);
    this.overlay.layers.enable(Layers.NO_SHADOW);
    this.group.add(this.overlay);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.group.visible = on;
    if (!on) {
      this.lines.geometry.setDrawRange(0, 0);
      this.overlay.geometry.setDrawRange(0, 0);
    }
  }

  begin(): void {
    this.lineCount = 0;
    this.overlayCount = 0;
    this.toOverlay = false;
  }

  end(): void {
    flush(this.lines, this.lineCount);
    flush(this.overlay, this.overlayCount);
  }

  private segment(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    c: number[],
  ): void {
    const overlay = this.toOverlay;
    const count = overlay ? this.overlayCount : this.lineCount;
    if (count + 2 > (overlay ? MAX_OVERLAY_VERTS : MAX_LINE_VERTS)) return;
    const pos = overlay ? this.overlayPos : this.linePos;
    const col = overlay ? this.overlayCol : this.lineCol;
    const i = count * 3;
    pos[i] = ax;
    pos[i + 1] = ay;
    pos[i + 2] = az;
    pos[i + 3] = bx;
    pos[i + 4] = by;
    pos[i + 5] = bz;
    for (let k = 0; k < 2; k++) {
      col[i + k * 3] = c[0];
      col[i + k * 3 + 1] = c[1];
      col[i + k * 3 + 2] = c[2];
    }
    if (overlay) this.overlayCount += 2;
    else this.lineCount += 2;
  }

  addAabb(box: THREE.Box3, color = COLOR_STATIC): void {
    const { min, max } = box;
    this.segment(min.x, min.y, min.z, max.x, min.y, min.z, color);
    this.segment(max.x, min.y, min.z, max.x, min.y, max.z, color);
    this.segment(max.x, min.y, max.z, min.x, min.y, max.z, color);
    this.segment(min.x, min.y, max.z, min.x, min.y, min.z, color);
    this.segment(min.x, max.y, min.z, max.x, max.y, min.z, color);
    this.segment(max.x, max.y, min.z, max.x, max.y, max.z, color);
    this.segment(max.x, max.y, max.z, min.x, max.y, max.z, color);
    this.segment(min.x, max.y, max.z, min.x, max.y, min.z, color);
    this.segment(min.x, min.y, min.z, min.x, max.y, min.z, color);
    this.segment(max.x, min.y, min.z, max.x, max.y, min.z, color);
    this.segment(max.x, min.y, max.z, max.x, max.y, max.z, color);
    this.segment(min.x, min.y, max.z, min.x, max.y, max.z, color);
  }

  addBox(
    center: THREE.Vector3,
    half: THREE.Vector3,
    quat: THREE.Quaternion,
    sleeping: boolean,
  ): void {
    const color = sleeping ? COLOR_ASLEEP : COLOR_AWAKE;
    for (let e = 0; e < 12; e++) {
      const i0 = BOX_EDGES[e * 2];
      const i1 = BOX_EDGES[e * 2 + 1];
      corner(i0, half, quat, center, _a);
      corner(i1, half, quat, center, _b);
      this.segment(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, color);
    }
  }

  addSphere(center: THREE.Vector3, radius: number, sleeping: boolean): void {
    const color = sleeping ? COLOR_ASLEEP : COLOR_AWAKE;
    this.ring(center, radius, 0, color);
    this.ring(center, radius, 1, color);
    this.ring(center, radius, 2, color);
  }

  addCapsuleBody(
    center: THREE.Vector3,
    radius: number,
    halfHeight: number,
    quat: THREE.Quaternion,
    sleeping: boolean,
  ): void {
    const color = sleeping ? COLOR_ASLEEP : COLOR_AWAKE;
    _a.set(0, halfHeight, 0).applyQuaternion(quat).add(center);
    _b.set(0, -halfHeight, 0).applyQuaternion(quat).add(center);
    this.ring(_a, radius, 1, color);
    this.ring(_b, radius, 1, color);
    this.segment(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, color);
  }

  /**
   * The character capsule: end rings, a footprint ring and vertical outlines.
   * Drawn as an overlay, since it lives inside the player mesh.
   */
  addCharacterCapsule(feet: THREE.Vector3, radius: number, height: number): void {
    const color = COLOR_CAPSULE;
    this.toOverlay = true;
    _a.set(feet.x, feet.y + radius, feet.z);
    _b.set(feet.x, feet.y + Math.max(height - radius, radius), feet.z);
    this.ring(_a, radius, 1, color);
    this.ring(_b, radius, 1, color);
    this.ring(feet, radius * 0.98, 1, color);
    this.ring(_a, radius, 0, color);
    this.ring(_a, radius, 2, color);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const ox = Math.cos(ang) * radius;
      const oz = Math.sin(ang) * radius;
      this.segment(_a.x + ox, _a.y, _a.z + oz, _b.x + ox, _b.y, _b.z + oz, color);
    }
    this.toOverlay = false;
  }

  private ring(center: THREE.Vector3, radius: number, axis: number, color: number[]): void {
    const steps = 20;
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const c = Math.cos(t) * radius;
      const s = Math.sin(t) * radius;
      const x = center.x + (axis === 0 ? 0 : c);
      const y = center.y + (axis === 0 ? c : axis === 1 ? 0 : s);
      const z = center.z + (axis === 2 ? 0 : s);
      if (i > 0) this.segment(px, py, pz, x, y, z, color);
      px = x;
      py = y;
      pz = z;
    }
  }

  /** A three-axis cross on a contact point, drawn over everything. */
  addContact(p: THREE.Vector3): void {
    const s = CONTACT_SIZE;
    this.toOverlay = true;
    this.segment(p.x - s, p.y, p.z, p.x + s, p.y, p.z, COLOR_CONTACT);
    this.segment(p.x, p.y - s, p.z, p.x, p.y + s, p.z, COLOR_CONTACT);
    this.segment(p.x, p.y, p.z - s, p.x, p.y, p.z + s, COLOR_CONTACT);
    this.toOverlay = false;
  }

  dispose(): void {
    for (const obj of [this.lines, this.overlay]) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
    this.group.removeFromParent();
  }
}

/**
 * Publishes this frame's vertex count and re-uploads only the range that was
 * written. The buffers are sized for the worst case, so uploading all of them
 * would push a few hundred kilobytes per frame to draw a handful of boxes.
 */
function flush(obj: THREE.LineSegments, count: number): void {
  obj.geometry.setDrawRange(0, count);
  if (count === 0) return; // an empty range means "upload everything" to three
  for (const name of ['position', 'color']) {
    const attr = obj.geometry.getAttribute(name) as THREE.BufferAttribute;
    attr.clearUpdateRanges();
    attr.addUpdateRange(0, count * 3);
    attr.needsUpdate = true;
  }
}

const BOX_EDGES = new Uint8Array([
  0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 4, 1, 5, 2, 6, 3, 7,
]);

function corner(
  index: number,
  half: THREE.Vector3,
  quat: THREE.Quaternion,
  center: THREE.Vector3,
  out: THREE.Vector3,
): void {
  out.set(
    index & 1 ? half.x : -half.x,
    index & 2 ? half.y : -half.y,
    index & 4 ? half.z : -half.z,
  );
  out.applyQuaternion(quat).add(center);
}
