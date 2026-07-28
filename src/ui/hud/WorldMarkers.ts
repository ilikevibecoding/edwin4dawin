/**
 * Objective markers projected into screen space.
 *
 * The trap here is the classic one. `Vector3.applyMatrix4` divides by w, and for
 * a point behind the camera w is negative, so projecting it that way mirrors the
 * marker to the opposite side of the screen and an objective behind your left
 * shoulder points right. This never divides by a negative w: the projection step
 * runs through a `Vector4`, which does not divide at all, and the sign of w is
 * checked before the perspective divide is done by hand. A point behind the
 * camera is instead placed from its camera-space x and y, which is continuous
 * with the in-front case as the point sweeps out through the edge of the frustum
 * and always sends the player the shortest way round.
 */
import * as THREE from 'three';
import { arrowIcon } from '../Icons';
import { div, markup, setClass, setStyle, setText } from '../Dom';
import type { CompassMark, MarkKind } from './Compass';
import type { MapMark } from './Minimap';

interface Marker {
  id: string;
  position: THREE.Vector3;
  label: string;
  kind: MarkKind;
  node: HTMLDivElement;
  labelEl: HTMLElement;
  distEl: HTMLElement;
  arrow: HTMLDivElement;
  lastX: number;
  lastY: number;
  lastDist: number;
  lastAngle: number;
  offscreen: boolean;
  shown: boolean;
}

/** Inset from the viewport edge, as a fraction of half-width/half-height. */
const EDGE_INSET = 0.84;

export class WorldMarkers {
  readonly root: HTMLDivElement;

  private readonly markers = new Map<string, Marker>();
  private readonly camSpace = new THREE.Vector3();
  private readonly clip = new THREE.Vector4();

  constructor(parent: HTMLElement) {
    this.root = div('ob-markers', parent);
  }

  set(id: string, position: THREE.Vector3 | null, label = 'OBJECTIVE'): void {
    if (!position) {
      const existing = this.markers.get(id);
      if (existing) {
        existing.node.remove();
        this.markers.delete(id);
      }
      return;
    }
    const kind = kindOf(id);
    let marker = this.markers.get(id);
    if (!marker) {
      const node = div('ob-marker', this.root);
      const glyph = div('ob-marker-glyph', node);
      const arrow = markup('ob-marker-arrow', arrowIcon(), glyph);
      const labelEl = div('ob-marker-label', node);
      const distEl = div('ob-marker-dist', node);
      marker = {
        id,
        // Copied, never retained: callers hand over pooled vectors.
        position: position.clone(),
        label,
        kind,
        node,
        labelEl,
        distEl,
        arrow,
        lastX: Number.NaN,
        lastY: Number.NaN,
        lastDist: -1,
        lastAngle: Number.NaN,
        offscreen: false,
        shown: true,
      };
      this.markers.set(id, marker);
      applyKind(node, kind);
      setText(labelEl, label.toUpperCase());
      return;
    }
    marker.position.copy(position);
    if (marker.kind !== kind) {
      marker.kind = kind;
      applyKind(marker.node, kind);
    }
    if (marker.label !== label) {
      marker.label = label;
      setText(marker.labelEl, label.toUpperCase());
    }
  }

  clear(): void {
    for (const marker of this.markers.values()) marker.node.remove();
    this.markers.clear();
  }

  update(
    camera: THREE.PerspectiveCamera,
    eye: THREE.Vector3,
    width: number,
    height: number,
    visible: boolean,
  ): void {
    if (this.markers.size === 0) return;
    // THREE.Camera.updateMatrixWorld refreshes matrixWorldInverse as well, which
    // is what makes reading it here safe before the renderer has run.
    camera.updateMatrixWorld();

    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const insetW = halfW * EDGE_INSET;
    const insetH = halfH * EDGE_INSET;

    for (const marker of this.markers.values()) {
      if (!visible) {
        if (marker.shown) {
          marker.shown = false;
          setStyle(marker.node, 'opacity', '0');
        }
        continue;
      }

      const distance = marker.position.distanceTo(eye);
      this.camSpace.copy(marker.position).applyMatrix4(camera.matrixWorldInverse);

      let sx: number;
      let sy: number;
      let offscreen: boolean;

      if (this.camSpace.z < -camera.near) {
        this.clip
          .set(this.camSpace.x, this.camSpace.y, this.camSpace.z, 1)
          .applyMatrix4(camera.projectionMatrix);
        // w is -z in camera space and strictly positive on this branch, so the
        // perspective divide below cannot flip the marker across the screen.
        const w = this.clip.w;
        sx = (this.clip.x / w) * halfW;
        sy = -(this.clip.y / w) * halfH;
        offscreen = Math.abs(sx) > insetW || Math.abs(sy) > insetH;
        if (offscreen) {
          const scale = edgeScale(sx, sy, insetW, insetH);
          sx *= scale;
          sy *= scale;
        }
      } else {
        // Behind the camera. Camera space x is right and y is up, so the screen
        // direction is (x, -y); a point exactly behind falls back to below.
        let dx = this.camSpace.x;
        let dy = -this.camSpace.y;
        if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) {
          dx = 0;
          dy = 1;
        }
        const scale = edgeScale(dx, dy, insetW, insetH);
        sx = dx * scale;
        sy = dy * scale;
        offscreen = true;
      }

      const x = Math.round(halfW + sx);
      const y = Math.round(halfH + sy);
      if (x !== marker.lastX || y !== marker.lastY) {
        marker.lastX = x;
        marker.lastY = y;
        setStyle(
          marker.node,
          'transform',
          `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
        );
      }

      if (offscreen !== marker.offscreen) {
        marker.offscreen = offscreen;
        setClass(marker.node, 'offscreen', offscreen);
      }
      if (offscreen) {
        // Quantised to a degree: the arrow is a chevron, and sub-degree updates
        // are invisible but would cost a style write every frame.
        const angle = Math.round((Math.atan2(sy, sx) * 180) / Math.PI);
        if (angle !== marker.lastAngle) {
          marker.lastAngle = angle;
          // The glyph is rotated 45 degrees by CSS, so the arrow inside it is
          // counter-rotated before being pointed outwards.
          setStyle(marker.arrow, 'transform', `rotate(${angle - 45}deg)`);
        }
      }

      const metres = Math.round(distance);
      if (metres !== marker.lastDist) {
        marker.lastDist = metres;
        setText(marker.distEl, `${metres} M`);
      }
      // Standing on the objective, the marker is in the way rather than useful.
      const shown = distance >= 1.5;
      if (shown !== marker.shown) {
        marker.shown = shown;
        setStyle(marker.node, 'opacity', shown ? '1' : '0');
      }
    }
  }

  /**
   * Bearings for the compass strip, appended into the caller's reused array.
   * Hostiles contribute a tick but no caption: the drone paints four at a time
   * and each is labelled HOSTILE with its range, which across a 104-degree strip
   * is four overlapping captions saying what four red ticks already say.
   */
  compassList(from: THREE.Vector3, into: CompassMark[]): CompassMark[] {
    for (const marker of this.markers.values()) {
      const dx = marker.position.x - from.x;
      const dz = marker.position.z - from.z;
      if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) continue;
      into.push({
        bearing: Math.atan2(dx, -dz),
        kind: marker.kind,
        label: marker.kind === 'hostile' ? undefined : marker.label.toUpperCase(),
      });
    }
    return into;
  }

  /**
   * Blips for the minimap. Hostiles are left out here: they are UAV contacts,
   * and the minimap already draws every one of them straight from the drone's
   * feed with the age fade attached. Adding them again stacks a second, staler
   * mark on top of the four the marker set happens to carry.
   */
  mapList(into: MapMark[]): MapMark[] {
    for (const marker of this.markers.values()) {
      if (marker.kind === 'hostile') continue;
      into.push({ x: marker.position.x, z: marker.position.z, kind: marker.kind });
    }
    return into;
  }
}

/**
 * Marker ids are namespaced by whoever set them. The killstreak module paints
 * UAV contacts under `killstreak:uav:N` and its own strike and package targets
 * under `killstreak:airstrike`, `:cluster` and `:package` — a hostile and a
 * target the player called in are not the same thing and must not look it.
 */
function kindOf(id: string): MarkKind {
  if (id.startsWith('killstreak:uav')) return 'hostile';
  return id.startsWith('killstreak') ? 'streak' : 'objective';
}

function applyKind(node: HTMLElement, kind: MarkKind): void {
  setClass(node, 'streak', kind === 'streak');
  setClass(node, 'hostile', kind === 'hostile');
}

/**
 * Multiplier that pushes a centre-relative offset out to the inset rectangle.
 * Uses whichever axis hits its edge first, which is what keeps a marker gliding
 * along the edge rather than jumping between corners.
 */
function edgeScale(dx: number, dy: number, halfW: number, halfH: number): number {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const sx = ax > 1e-6 ? halfW / ax : Number.POSITIVE_INFINITY;
  const sy = ay > 1e-6 ? halfH / ay : Number.POSITIVE_INFINITY;
  const s = Math.min(sx, sy);
  return Number.isFinite(s) ? s : 1;
}
