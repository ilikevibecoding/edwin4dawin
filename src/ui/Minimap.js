import * as THREE from 'three';
import { clamp } from './dom.js';

const TEAM_BLUE = '#38a8ff';
const TEAM_RED = '#ff4a3d';
const GOLD = '#f5b544';

/**
 * Circular rotating minimap (COD style: up = player facing). Draws every frame onto a 2D canvas.
 *
 * Map source, in order of preference:
 *   1. `world.getMinimap().image` (canvas provided by the environment team)
 *   2. a one-off top-down orthographic snapshot of the scene rendered with the game renderer
 *   3. a dark grid
 * Whatever the source, the image is re-toned into the dark desaturated BO4 palette.
 *
 * Overlays: objective "B" (gold neutral / blue / red by owner), red dots for enemies that fired within
 * `fireMemory` seconds ('enemy:fire'), the player chevron at the center and a rotating "N" on the bezel.
 */
export class Minimap {
  constructor(game, canvas, northEl) {
    this.game = game;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.northEl = northEl;
    this.viewMeters = 64;
    this.fireMemory = 1.5;
    this.recentFire = new Map();
    this.objective = { owner: null, contested: false };

    this._mapInfo = null;
    this._mapInfoFrame = -999;
    this._sourceImage = undefined;
    this._image = null;
    this._snapshotDone = false;
    this._lastNorthDeg = null;

    game.events.on('enemy:fire', (e) => {
      if (e?.enemy) this.recentFire.set(e.enemy.id, { enemy: e.enemy, t: game.time });
    });
    game.events.on('enemy:killed', (e) => {
      if (e?.enemy) this.recentFire.delete(e.enemy.id);
    });
  }

  setObjectiveState(owner, contested) {
    this.objective.owner = owner;
    this.objective.contested = contested;
  }

  /** Called once the whole scene is loaded (game:ready) to grab the fallback top-down snapshot. */
  prepare() {
    const info = this._getMapInfo();
    if (info && !info.image && !this._snapshotDone) {
      this._snapshotDone = true;
      try {
        this._image = this._renderSnapshot(info.center, info.size);
      } catch (err) {
        console.warn('[ui/minimap] top-down snapshot failed, using grid', err);
        this._image = null;
      }
    }
  }

  _getMapInfo() {
    // World may allocate on every call; refresh at a low rate.
    if (this.game.frame - this._mapInfoFrame > 30 || !this._mapInfo) {
      this._mapInfoFrame = this.game.frame;
      try {
        this._mapInfo = this.game.world?.getMinimap?.() || null;
      } catch {
        this._mapInfo = null;
      }
      const src = this._mapInfo?.image || null;
      if (src && src !== this._sourceImage) {
        this._sourceImage = src;
        this._image = this._toneImage(src);
      }
    }
    return this._mapInfo;
  }

  /** Convert any map image into the dark desaturated palette. */
  _toneImage(src) {
    const w = src.width || src.naturalWidth || 512;
    const h = src.height || src.naturalHeight || 512;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
      this._palette(d, i, lum);
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /** Dark blue-grey ramp with lifted mid-tones so streets/walls read at small sizes. */
  _palette(d, i, lum) {
    const l = Math.pow(clamp(lum, 0, 1), 0.9);
    d[i] = 14 + l * 118;
    d[i + 1] = 18 + l * 128;
    d[i + 2] = 26 + l * 146;
    d[i + 3] = 255;
  }

  /**
   * Render a top-down height map of the scene (depth override material, orthographic camera) and bake
   * it into a tactical-map canvas: dark ground, lighter building footprints by height, light outlines.
   */
  _renderSnapshot(center, size) {
    const { render, scene } = this.game;
    const renderer = render?.renderer;
    if (!renderer || !scene) return null;
    const res = 512;
    const camY = 200;
    const near = 1;
    const far = 600;
    const rt = new THREE.WebGLRenderTarget(res, res, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, near, far);
    cam.position.set(center.x, camY, center.z);
    cam.up.set(0, 0, -1);
    cam.lookAt(center.x, 0, center.z);
    cam.layers.set(0);
    cam.updateMatrixWorld(true);
    const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });

    const prevBg = scene.background;
    const prevOverride = scene.overrideMaterial;
    const prevTarget = renderer.getRenderTarget();
    const prevColor = new THREE.Color();
    renderer.getClearColor(prevColor);
    const prevAlpha = renderer.getClearAlpha();
    const prevShadowAuto = renderer.shadowMap.autoUpdate;
    const buf = new Float32Array(res * res * 4);
    try {
      scene.background = null;
      scene.overrideMaterial = depthMat;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, true, false);
      renderer.render(scene, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, res, res, buf);
    } finally {
      scene.background = prevBg;
      scene.overrideMaterial = prevOverride;
      renderer.shadowMap.autoUpdate = prevShadowAuto;
      renderer.setRenderTarget(prevTarget);
      renderer.setClearColor(prevColor, prevAlpha);
      rt.dispose();
      depthMat.dispose();
    }

    // Height field (meters), north at the top (GL rows are bottom-up; camera up is -Z).
    const hgt = new Float32Array(res * res);
    for (let y = 0; y < res; y++) {
      const srcRow = (res - 1 - y) * res * 4;
      for (let x = 0; x < res; x++) {
        const v = buf[srcRow + x * 4]; // BasicDepthPacking stores 1 - fragCoordZ
        const fragZ = 1 - v;
        const dist = near + fragZ * (far - near); // orthographic depth is linear
        hgt[y * res + x] = camY - dist;
      }
    }
    const groundY = this.game.world?.getGroundHeight?.(center.x, center.z) ?? 0;

    const c = document.createElement('canvas');
    c.width = res;
    c.height = res;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(res, res);
    const d = img.data;
    const idx = (x, y) => hgt[clamp(y, 0, res - 1) * res + clamp(x, 0, res - 1)];
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const h = hgt[y * res + x] - groundY;
        const o = (y * res + x) * 4;
        if (h < -30) {
          // void (no geometry)
          d[o] = 9; d[o + 1] = 11; d[o + 2] = 15; d[o + 3] = 255;
          continue;
        }
        // Structures get lighter with height; the ground stays dark.
        const lift = clamp((h - 0.35) / 10, 0, 1);
        const l = h < 0.35 ? 0.1 + clamp(h + 0.6, 0, 0.6) * 0.05 : 0.3 + Math.pow(lift, 0.6) * 0.42;
        this._palette(d, o, l);
        // Outline where the height changes sharply (building edges, walls).
        const gx = Math.abs(idx(x + 1, y) - idx(x - 1, y));
        const gy = Math.abs(idx(x, y + 1) - idx(x, y - 1));
        const edge = clamp((gx + gy - 0.7) / 2.0, 0, 1);
        if (edge > 0) {
          d[o] += (225 - d[o]) * edge * 0.9;
          d[o + 1] += (232 - d[o + 1]) * edge * 0.9;
          d[o + 2] += (240 - d[o + 2]) * edge * 0.9;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  update() {
    const { canvas, ctx, game } = this;
    const cssW = canvas.clientWidth;
    if (cssW < 8) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(cssW * dpr);
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    const info = this._getMapInfo();
    const player = game.player;
    const yaw = player?.yaw || 0;
    const R = px / 2;
    const scale = px / this.viewMeters; // pixels per meter
    const ppos = player?.position || { x: 0, z: 0 };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(0, 0, px, px);

    // World → map: north-up, then rotated by the player yaw so the facing direction points up.
    ctx.translate(R, R);
    ctx.rotate(yaw);
    ctx.translate(-ppos.x * scale, -ppos.z * scale);

    const center = info?.center || { x: 0, z: 0 };
    const size = info?.size || 80;
    if (this._image) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this._image, (center.x - size / 2) * scale, (center.z - size / 2) * scale, size * scale, size * scale);
    } else {
      this._drawGrid(ctx, center, size, scale);
    }
    // Subtle grid over the image for the tactical look + playable bounds outline.
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let m = -size / 2; m <= size / 2; m += 10) {
      ctx.moveTo((center.x + m) * scale, (center.z - size / 2) * scale);
      ctx.lineTo((center.x + m) * scale, (center.z + size / 2) * scale);
      ctx.moveTo((center.x - size / 2) * scale, (center.z + m) * scale);
      ctx.lineTo((center.x + size / 2) * scale, (center.z + m) * scale);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeRect((center.x - size / 2) * scale, (center.z - size / 2) * scale, size * scale, size * scale);

    // Objective zone + marker
    const obj = game.world?.getObjective?.();
    if (obj) {
      const col = this.objective.owner === 'blue' ? TEAM_BLUE : this.objective.owner === 'red' ? TEAM_RED : GOLD;
      const ox = obj.position.x * scale;
      const oz = obj.position.z * scale;
      ctx.beginPath();
      ctx.arc(ox, oz, (obj.radius || 5) * scale, 0, Math.PI * 2);
      ctx.fillStyle = this._rgba(col, 0.16);
      ctx.fill();
      ctx.strokeStyle = this._rgba(col, 0.55);
      ctx.lineWidth = Math.max(1, dpr);
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Upright marker (counter-rotate)
      ctx.save();
      ctx.translate(ox, oz);
      ctx.rotate(-yaw);
      const r = 8.5 * dpr;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
      ctx.fillStyle = '#0b0d10';
      ctx.font = `700 ${10 * dpr}px "Bahnschrift","DIN Alternate","Roboto Condensed","Arial Narrow",Inter,Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.name || 'B', 0, 0.5 * dpr);
      ctx.restore();
    }

    // Enemies that fired recently
    const now = game.time;
    for (const [id, rec] of this.recentFire) {
      const age = now - rec.t;
      if (age > this.fireMemory || !rec.enemy.alive) {
        this.recentFire.delete(id);
        continue;
      }
      const a = 1 - age / this.fireMemory;
      const ex = rec.enemy.position.x * scale;
      const ez = rec.enemy.position.z * scale;
      ctx.beginPath();
      ctx.arc(ex, ez, (3.2 + (1 - a) * 4) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = this._rgba(TEAM_RED, 0.25 * a);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex, ez, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = this._rgba(TEAM_RED, 0.35 + 0.65 * a);
      ctx.fill();
    }

    ctx.restore();

    // Player chevron at the center (screen space, always pointing up)
    ctx.save();
    ctx.translate(R, R);
    ctx.beginPath();
    ctx.moveTo(0, -7 * dpr);
    ctx.lineTo(5.5 * dpr, 5.5 * dpr);
    ctx.lineTo(0, 2.5 * dpr);
    ctx.lineTo(-5.5 * dpr, 5.5 * dpr);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1.2 * dpr;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Inner vignette so the edge of the map fades into the bezel.
    const grad = ctx.createRadialGradient(R, R, R * 0.62, R, R, R);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(R, R, R, 0, Math.PI * 2);
    ctx.fill();

    // "N" on the bezel: rotates with the map.
    if (this.northEl) {
      const deg = Math.round(THREE.MathUtils.radToDeg(yaw) * 2) / 2;
      if (deg !== this._lastNorthDeg) {
        this._lastNorthDeg = deg;
        this.northEl.style.transform = `rotate(${deg}deg) translateY(calc(var(--mm-r) * -1)) rotate(${-deg}deg)`;
      }
    }
  }

  _drawGrid(ctx, center, size, scale) {
    ctx.fillStyle = '#131922';
    ctx.fillRect((center.x - size / 2) * scale, (center.z - size / 2) * scale, size * scale, size * scale);
  }

  _rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
}
