import * as THREE from 'three';
import type { ILevel } from '../core/Contracts';
import type { HudState } from './HudSystem';
import { clamp } from '../core/MathX';

/**
 * Minimap.ts — top-left tactical display on a <canvas>.
 *
 * The map itself is *derived from the real level*: once the level is available
 * we bake an offscreen top-down image by walking `level.sampleGround` on a grid
 * (the playable footprint / streets) and stamping the world AABB of every
 * `level.collidables` mesh (building & cover footprints). At runtime we draw a
 * rotating slice of that bake centred on the player (CoD default), with a view
 * cone, a centred player arrow, enemy blips (only when UAV-revealed or within
 * detection range), an objective marker, range rings and a compass ring.
 *
 * The canvas redraws at a capped ~22Hz rather than every frame.
 */

const REDRAW_HZ = 22;
const VIEW_RADIUS_M = 58; // world metres from centre to edge
const BAKE = 600; // offscreen bake resolution

export class Minimap {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private coordEl: HTMLDivElement;

  private bake: HTMLCanvasElement | null = null;
  private minX = 0;
  private minZ = 0;
  private worldW = 1;
  private worldD = 1;
  private baked = false;

  private acc = 0;
  private dpr = 1;
  private cssSize = 0;
  private _box = new THREE.Box3();
  private _size = new THREE.Vector3();
  private lastCoord = '';

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-map';
    this.el.innerHTML = `
      <div class="hud-map-tag hud-cond hud-cond-l">TACMAP</div>
      <canvas class="hud-map-cv"></canvas>
      <div class="hud-map-coord">X --- Z ---</div>`;
    root.appendChild(this.el);
    this.canvas = this.el.querySelector('canvas')!;
    this.coordEl = this.el.querySelector('.hud-map-coord')!;
    this.g = this.canvas.getContext('2d')!;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const size = Math.max(1, Math.min(rect.width, rect.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssSize = size;
    this.canvas.width = Math.round(size * this.dpr);
    this.canvas.height = Math.round(size * this.dpr);
  }

  private ensureSize() {
    if (this.canvas.width === 0 || this.cssSize === 0) this.resize();
  }

  private buildBake(level: ILevel) {
    const b = level.bounds;
    // Pad slightly so edge geometry isn't clipped.
    this.minX = b.min.x - 2;
    this.minZ = b.min.z - 2;
    this.worldW = b.max.x - b.min.x + 4;
    this.worldD = b.max.z - b.min.z + 4;

    const cv = document.createElement('canvas');
    cv.width = BAKE;
    cv.height = BAKE;
    const c = cv.getContext('2d')!;
    const sx = BAKE / this.worldW;
    const sz = BAKE / this.worldD;
    const toX = (x: number) => (x - this.minX) * sx;
    const toZ = (z: number) => (z - this.minZ) * sz;

    c.clearRect(0, 0, BAKE, BAKE);

    // --- ground footprint from height samples -----------------------------
    const N = 150;
    const cellW = this.worldW / N;
    const cellD = this.worldD / N;
    let gmin = Infinity;
    let gmax = -Infinity;
    const grid = new Float32Array(N * N);
    const mask = new Uint8Array(N * N);
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const wx = this.minX + (ix + 0.5) * cellW;
        const wz = this.minZ + (iz + 0.5) * cellD;
        const h = level.sampleGround(wx, wz);
        if (h !== null) {
          grid[iz * N + ix] = h;
          mask[iz * N + ix] = 1;
          if (h < gmin) gmin = h;
          if (h > gmax) gmax = h;
        }
      }
    }
    const span = Math.max(0.5, gmax - gmin);
    const pw = BAKE / N + 1;
    const pd = BAKE / N + 1;
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        if (!mask[iz * N + ix]) continue;
        const t = clamp((grid[iz * N + ix] - gmin) / span, 0, 1);
        // Dark tactical ground, subtly lifted by elevation.
        const l = 30 + t * 22;
        c.fillStyle = `rgb(${(l * 0.7 + 8) | 0},${(l * 0.82 + 10) | 0},${(l + 14) | 0})`;
        c.fillRect(
          (this.minX + ix * cellW - this.minX) * sx - 0.5,
          (this.minZ + iz * cellD - this.minZ) * sz - 0.5,
          pw,
          pd
        );
      }
    }

    // --- structure footprints from collidable AABBs -----------------------
    const totalArea = this.worldW * this.worldD;
    c.lineWidth = 1;
    for (const obj of level.collidables) {
      this._box.setFromObject(obj);
      if (this._box.isEmpty()) continue;
      this._box.getSize(this._size);
      const fw = this._size.x;
      const fd = this._size.z;
      const fh = this._size.y;
      const area = fw * fd;
      if (area < 0.35 || area > totalArea * 0.34) continue; // skip specks & the ground plane
      if (fh < 0.5) continue; // skip flat decals/roads
      const x = toX(this._box.min.x);
      const z = toZ(this._box.min.z);
      const w = fw * sx;
      const d = fd * sz;
      // Taller = building (lighter), short = cover (dimmer).
      const tall = fh > 2.2;
      c.fillStyle = tall ? 'rgba(120,140,164,0.72)' : 'rgba(92,108,128,0.6)';
      c.fillRect(x, z, w, d);
      c.strokeStyle = tall ? 'rgba(200,222,248,0.7)' : 'rgba(150,172,196,0.5)';
      c.strokeRect(x + 0.5, z + 0.5, w - 1, d - 1);
    }

    this.bake = cv;
    this.baked = true;
  }

  update(s: HudState) {
    this.ensureSize();
    if (!this.baked && s.level) this.buildBake(s.level);

    this.acc += s.dt;
    if (this.acc < 1 / REDRAW_HZ) return;
    this.acc = 0;
    this.draw(s);
  }

  private draw(s: HudState) {
    const g = this.g;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = W / 2;
    const ppm = R / VIEW_RADIUS_M;

    // Player centre + heading (fall back to camera in free-cam captures).
    const p = s.player;
    const px = p ? p.position.x : s.camera.position.x;
    const pz = p ? p.position.z : s.camera.position.z;
    const yaw = p ? p.yaw : Math.atan2(-1, 0);

    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.clip();

    // Backdrop.
    g.fillStyle = '#070b10';
    g.fillRect(0, 0, W, H);

    // Baked map, rotated so the player faces up.
    if (this.bake) {
      g.save();
      g.translate(cx, cy);
      g.scale(ppm, ppm);
      g.rotate(yaw);
      g.translate(-px, -pz);
      g.imageSmoothingEnabled = true;
      g.globalAlpha = 0.96;
      g.drawImage(this.bake, this.minX, this.minZ, this.worldW, this.worldD);
      g.globalAlpha = 1;
      g.restore();
    }

    // Rotate helper: world → screen offset.
    const cosR = Math.cos(yaw);
    const sinR = Math.sin(yaw);
    const project = (wx: number, wz: number): [number, number] => {
      const rx = wx - px;
      const rz = wz - pz;
      return [cx + (rx * cosR - rz * sinR) * ppm, cy + (rx * sinR + rz * cosR) * ppm];
    };

    // Range rings.
    g.strokeStyle = 'rgba(150,180,210,0.10)';
    g.lineWidth = 1 * this.dpr;
    for (const rr of [R * 0.5, R * 0.82]) {
      g.beginPath();
      g.arc(cx, cy, rr, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(cx, cy - R);
    g.lineTo(cx, cy + R);
    g.moveTo(cx - R, cy);
    g.lineTo(cx + R, cy);
    g.strokeStyle = 'rgba(150,180,210,0.06)';
    g.stroke();

    // View cone.
    const coneHalf = 0.42; // ~48° half-angle
    const coneLen = R * 0.9;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, coneLen, -Math.PI / 2 - coneHalf, -Math.PI / 2 + coneHalf);
    g.closePath();
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, coneLen);
    grad.addColorStop(0, 'rgba(255,191,73,0.22)');
    grad.addColorStop(1, 'rgba(255,191,73,0)');
    g.fillStyle = grad;
    g.fill();

    // Objective marker.
    if (s.objectivePos) {
      const [ox, oy] = project(s.objectivePos.x, s.objectivePos.z);
      const cd = Math.hypot(ox - cx, oy - cy);
      const [dx, dy] = cd > R - 8 * this.dpr ? clampToRing(cx, cy, ox, oy, R - 8 * this.dpr) : [ox, oy];
      this.drawObjective(g, dx, dy);
    }

    // Enemy blips.
    if (s.ai) {
      const reveal = s.uavActive ? 999 : 44;
      g.save();
      for (const h of s.ai.hostiles()) {
        const dist = Math.hypot(h.position.x - px, h.position.z - pz);
        if (dist > reveal) continue;
        const [bx, by] = project(h.position.x, h.position.z);
        if (Math.hypot(bx - cx, by - cy) > R - 3 * this.dpr) continue;
        g.beginPath();
        g.arc(bx, by, 3.1 * this.dpr, 0, Math.PI * 2);
        g.fillStyle = '#ff4a3a';
        g.shadowColor = 'rgba(255,60,44,0.9)';
        g.shadowBlur = 6 * this.dpr;
        g.fill();
      }
      g.restore();
    }

    // Player arrow (always centred, pointing up).
    g.save();
    g.translate(cx, cy);
    g.beginPath();
    const a = 6 * this.dpr;
    g.moveTo(0, -a);
    g.lineTo(a * 0.72, a * 0.8);
    g.lineTo(0, a * 0.4);
    g.lineTo(-a * 0.72, a * 0.8);
    g.closePath();
    g.fillStyle = '#eaf2fb';
    g.strokeStyle = '#ffbf49';
    g.lineWidth = 1.4 * this.dpr;
    g.shadowColor = 'rgba(255,191,73,0.6)';
    g.shadowBlur = 5 * this.dpr;
    g.fill();
    g.stroke();
    g.restore();

    g.restore(); // unclip

    // Compass letters around the ring (outside the clip).
    this.drawCompass(g, cx, cy, R, cosR, sinR);

    // Coord readout.
    const coord = `X ${fmt(px)}  Z ${fmt(pz)}`;
    if (coord !== this.lastCoord) {
      this.coordEl.textContent = coord;
      this.lastCoord = coord;
    }
  }

  private drawObjective(g: CanvasRenderingContext2D, x: number, y: number) {
    const s = 4.4 * this.dpr;
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI / 4);
    g.strokeStyle = '#ffbf49';
    g.fillStyle = 'rgba(255,191,73,0.2)';
    g.lineWidth = 1.6 * this.dpr;
    g.shadowColor = 'rgba(255,191,73,0.7)';
    g.shadowBlur = 6 * this.dpr;
    g.beginPath();
    g.rect(-s, -s, s * 2, s * 2);
    g.fill();
    g.stroke();
    g.restore();
  }

  private drawCompass(
    g: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    R: number,
    cosR: number,
    sinR: number
  ) {
    const dirs: [string, number, number][] = [
      ['N', 0, -1],
      ['E', 1, 0],
      ['S', 0, 1],
      ['W', -1, 0],
    ];
    g.font = `${Math.round(9 * this.dpr)}px ui-monospace, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const rr = R - 7 * this.dpr;
    for (const [ch, dx, dz] of dirs) {
      const sx = cx + (dx * cosR - dz * sinR) * rr;
      const sy = cy + (dx * sinR + dz * cosR) * rr;
      g.fillStyle = ch === 'N' ? '#ffbf49' : 'rgba(180,200,220,0.75)';
      g.fillText(ch, sx, sy);
    }
  }

  dispose() {
    this.el.remove();
  }
}

function fmt(v: number): string {
  const s = Math.round(v);
  return (s < 0 ? '-' : '') + String(Math.abs(s)).padStart(3, '0');
}

function clampToRing(cx: number, cy: number, x: number, y: number, r: number): [number, number] {
  const dx = x - cx;
  const dy = y - cy;
  const len = Math.hypot(dx, dy) || 1;
  return [cx + (dx / len) * r, cy + (dy / len) * r];
}
