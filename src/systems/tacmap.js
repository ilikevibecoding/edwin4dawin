import * as THREE from 'three';
import { rand, randRange, randPick } from '../core/rand.js';

const COL = {
  text: '#e8e6e0',
  gold: '#d8b25a',
  red: '#ff4a3a',
  line: 'rgba(255,255,255,.18)',
  lineSoft: 'rgba(255,255,255,.08)',
};

/** Map world x/z to a COD grid reference like "E5". */
export function gridRef(x, z, half) {
  const cx = Math.min(9, Math.max(0, Math.floor(((x + half) / (half * 2)) * 10)));
  const cz = Math.min(9, Math.max(0, Math.floor(((z + half) / (half * 2)) * 10)));
  return String.fromCharCode(65 + cx) + (cz + 1);
}

/**
 * Ingress heading for a strike run: from beyond the target toward the player
 * (rotated by `offset`), so the pass always reads on the player's screen.
 * Shared by the map preview and the actual run so they match exactly.
 */
export function ingressAngle(playerPos, playerYaw, target, offset) {
  const dx = playerPos.x - target.x, dz = playerPos.z - target.z;
  const base = (dx * dx + dz * dz > 25)
    ? Math.atan2(dz, dx)
    : Math.atan2(Math.cos(playerYaw), Math.sin(playerYaw)); // reverse of facing
  return base + offset;
}

const _losPt = new THREE.Vector3();

/**
 * Pick the ingress side whose approach corridor the player can actually see
 * (LOS from the eye to two points along each candidate path). Returns the
 * signed offset, or null when both sides score equally (caller randomizes).
 */
export function planIngress(game, target, mag) {
  const eye = game.player.eyePos();
  const score = (sign) => {
    const a = ingressAngle(game.player.position, game.player.yaw, target, sign * mag);
    let sc = 0;
    // sample where the jets actually fly (high cruise, then the let-down)
    for (const [d, alt] of [[210, 80], [140, 60]]) {
      _losPt.set(target.x - Math.cos(a) * d, alt, target.z - Math.sin(a) * d);
      if (game.world.colliders.clearLine(eye, _losPt)) sc++;
    }
    return sc;
  };
  const right = score(1), left = score(-1);
  if (right === left) return null;
  return (right > left ? 1 : -1) * mag;
}

/**
 * Full-screen tactical map for airstrike targeting.
 *
 * The background is a real satellite snapshot: the level is rendered once
 * top-down into a float render target, tone-mapped and re-graded (desaturate,
 * darken, teal tint) into a canvas. Overlays (grid, scanline, pings, cursor,
 * confirm stamp) are drawn per frame.
 *
 * Dev params:
 *   ?tacmap=1        open the map immediately, cursor frozen at map center
 *   ?tacmap=confirm  open + auto-confirm (shows STRIKE CONFIRMED + ingress arrow)
 *   (with &nobots=1 three demo enemy pings are injected so shots show the full UI)
 */
export class TacMap {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.isOpen = false;
    this.cursor = new THREE.Vector2(0, 0); // world xz
    this.pings = [];        // { x, z, t }
    this.snapshot = null;   // stylized satellite canvas
    this.snapTried = false;
    this.confirmT = null;   // seconds since confirm click (null = not confirming)
    this.strikeDir = null;  // ingress direction of last called strike
    this.strikeTarget = null;
    this.onConfirm = null;  // (worldPos: Vector3) => boolean — set by Airstrike
    this._hudWasHidden = false;

    const q = new URLSearchParams(location.search);
    this.devMode = q.get('tacmap'); // null | '1' | 'confirm'
    this._devDone = false;

    this._buildDOM();
    document.fonts?.load?.('700 21px Rajdhani').catch(() => {});

    game.events.on('enemy:fire', ({ position }) => {
      if (!position) return;
      // refresh a nearby ping instead of stacking duplicates
      for (const p of this.pings) {
        const dx = p.x - position.x, dz = p.z - position.z;
        if (dx * dx + dz * dz < 9) { p.x = position.x; p.z = position.z; p.t = this.time; return; }
      }
      this.pings.push({ x: position.x, z: position.z, t: this.time });
      if (this.pings.length > 32) this.pings.shift();
    });
    game.events.on('airstrike:called', ({ target, dir }) => {
      if (dir) this.strikeDir = dir.clone();
      if (target) this.strikeTarget = target.clone();
    });
    document.addEventListener('pointerlockchange', () => {
      if (this.isOpen && !this.devMode && document.pointerLockElement == null) this.close();
    });
  }

  // ==========================================================================
  // DOM
  // ==========================================================================
  _buildDOM() {
    const el = document.createElement('div');
    el.id = 'strikemap';
    el.innerHTML = `
      <style>
        #strikemap { position: fixed; inset: 0; z-index: 40; display: none;
          background: rgba(5,7,8,.78); align-items: center; justify-content: center;
          font-family: 'Rajdhani', sans-serif; color: ${COL.text}; }
        #strikemap.on { display: flex; }
        #strikemap .frame { border: 1px solid ${COL.line}; background: rgba(9,11,12,.92);
          padding: 12px 16px 10px; box-shadow: 0 24px 90px rgba(0,0,0,.65); }
        #strikemap .head { display: flex; justify-content: space-between; align-items: baseline;
          margin: 2px 2px 10px; }
        #strikemap .title { font-size: 21px; letter-spacing: 6px; font-weight: 700; }
        #strikemap .title::before { content: ''; display: inline-block; width: 8px; height: 8px;
          background: ${COL.red}; margin-right: 12px; transform: translateY(-1px); }
        #strikemap .meta { font-size: 13px; letter-spacing: 2.5px; color: rgba(232,230,224,.55); }
        #strikemap canvas.map { display: block; width: min(68vh, 640px); height: min(68vh, 640px);
          outline: 1px solid ${COL.line}; background: #0b0f0e; }
        #strikemap .foot { display: flex; gap: 22px; align-items: baseline;
          margin: 10px 2px 2px; font-size: 13.5px; letter-spacing: 2px; color: rgba(232,230,224,.62); }
        #strikemap .foot b { color: ${COL.gold}; font-weight: 600; margin-right: 5px; }
        #strikemap .readout { margin-left: auto; color: ${COL.text}; font-weight: 600;
          letter-spacing: 3px; }
        #strikemap .readout span { color: ${COL.red}; }
      </style>
      <div class="frame">
        <div class="head">
          <div class="title">SELECT AIRSTRIKE TARGET</div>
          <div class="meta">CAS PACKAGE — 3× F-16 · MK-82 STICK</div>
        </div>
        <canvas class="map" width="1024" height="1024"></canvas>
        <div class="foot">
          <span><b>MOUSE</b>ADJUST</span>
          <span><b>LMB</b>CONFIRM STRIKE</span>
          <span><b>[4]</b>CANCEL</span>
          <span class="readout">TGT GRID <span>—</span></span>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;
    this.canvas = el.querySelector('canvas.map');
    this.ctx = this.canvas.getContext('2d');
    this.readout = el.querySelector('.readout span');

    // static noise tile for satellite texture grain
    const nz = document.createElement('canvas');
    nz.width = nz.height = 128;
    const ng = nz.getContext('2d');
    const nimg = ng.createImageData(128, 128);
    for (let i = 0; i < nimg.data.length; i += 4) {
      const v = 118 + rand() * 96;
      nimg.data[i] = nimg.data[i + 1] = nimg.data[i + 2] = v;
      nimg.data[i + 3] = 14;
    }
    ng.putImageData(nimg, 0, 0);
    this.noiseTile = nz;
  }

  // ==========================================================================
  // Satellite snapshot (once, after world load)
  // ==========================================================================
  _takeSnapshot() {
    this.snapTried = true;
    const { renderer, scene, world } = this.game;
    const H = world.bounds.half;
    const SIZE = 1024;

    // hide everything except the static world + lights (viewmodel, enemies,
    // atmosphere cards, vfx pools would pollute the imagery)
    const touched = [];
    for (const child of scene.children) {
      if (child === world.group || child.isLight || !child.visible) continue;
      child.visible = false;
      touched.push(child);
    }
    const fog = scene.fog;
    const fogDensity = fog ? fog.density : 0;
    if (fog) fog.density = 1e-6; // ortho height would otherwise wash the frame

    const cam = new THREE.OrthographicCamera(-H, H, H, -H, 1, 300);
    cam.position.set(0, 160, 0);
    cam.up.set(0, 0, -1); // north (-z) = image up
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);

    const prevTarget = renderer.getRenderTarget();
    let buf = null;
    let isFloat = true;
    let rt = null;
    try {
      rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { type: THREE.FloatType, depthBuffer: true });
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      buf = new Float32Array(SIZE * SIZE * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, buf);
    } catch (err) {
      console.warn('[tacmap] float snapshot failed, retrying LDR:', err);
      buf = null;
    }
    if (!buf) {
      try {
        rt?.dispose();
        rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { type: THREE.UnsignedByteType, depthBuffer: true });
        renderer.setRenderTarget(rt);
        renderer.render(scene, cam);
        const u8 = new Uint8Array(SIZE * SIZE * 4);
        renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, u8);
        buf = u8;
        isFloat = false;
      } catch (err2) {
        console.warn('[tacmap] snapshot failed entirely, using vector map:', err2);
        buf = null;
      }
    }
    renderer.setRenderTarget(prevTarget);
    rt?.dispose();
    if (fog) fog.density = fogDensity;
    for (const o of touched) o.visible = true;
    if (!buf) return;

    // --- tone map + stylize: desaturated, darkened, teal-green recon grade ---
    const out = document.createElement('canvas');
    out.width = out.height = SIZE;
    const g = out.getContext('2d');
    const img = g.createImageData(SIZE, SIZE);
    const d = img.data;
    const EXPOSURE = 1.6, SAT = 0.5, CURVE = 0.5;
    const TINT = [0.7, 0.9, 0.86], GAIN = 1.02, LIFT = 12;
    const inv = 1 / 255;
    for (let y = 0; y < SIZE; y++) {
      const srcRow = (SIZE - 1 - y) * SIZE; // GL rows are bottom-up
      for (let x = 0; x < SIZE; x++) {
        const si = (srcRow + x) * 4;
        let r, gr, b;
        if (isFloat) {
          r = buf[si] * EXPOSURE; gr = buf[si + 1] * EXPOSURE; b = buf[si + 2] * EXPOSURE;
          r = r / (1 + r); gr = gr / (1 + gr); b = b / (1 + b); // reinhard
          r = Math.pow(r, 0.4545); gr = Math.pow(gr, 0.4545); b = Math.pow(b, 0.4545);
        } else {
          r = Math.pow(buf[si] * inv, 0.4545); gr = Math.pow(buf[si + 1] * inv, 0.4545); b = Math.pow(buf[si + 2] * inv, 0.4545);
        }
        // contrast S-curve for satellite punch
        r += (r * r * (3 - 2 * r) - r) * CURVE;
        gr += (gr * gr * (3 - 2 * gr) - gr) * CURVE;
        b += (b * b * (3 - 2 * b) - b) * CURVE;
        const l = 0.299 * r + 0.587 * gr + 0.114 * b;
        r = (l + (r - l) * SAT) * TINT[0] * GAIN;
        gr = (l + (gr - l) * SAT) * TINT[1] * GAIN;
        b = (l + (b - l) * SAT) * TINT[2] * GAIN;
        const di = (y * SIZE + x) * 4;
        d[di] = Math.min(255, r * 255 + LIFT);
        d[di + 1] = Math.min(255, gr * 255 + LIFT);
        d[di + 2] = Math.min(255, b * 255 + LIFT);
        d[di + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // satellite grain
    g.globalAlpha = 1;
    for (let ty = 0; ty < SIZE; ty += 128) {
      for (let tx = 0; tx < SIZE; tx += 128) g.drawImage(this.noiseTile, tx, ty);
    }
    this.snapshot = out;
  }

  // ==========================================================================
  // Open / close / confirm
  // ==========================================================================
  open(cursorWorld) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.confirmT = null;
    this.plannedMag = randRange(0.5, 0.85);
    this.plannedOffset = randPick([-1, 1]) * this.plannedMag;
    if (cursorWorld) this.cursor.copy(cursorWorld);
    this.el.classList.add('on');
    this._hudWasHidden = this.game.hud?.el?.classList.contains('hidden') ?? false;
    this.game.hud?.hide();
    this.game.input.enabled = false; // freeze look/fire/movement under the map
    this._draw();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.confirmT = null;
    this.el.classList.remove('on');
    if (!this._hudWasHidden) this.game.hud?.show();
    this.game.input.enabled = true;
  }

  /** Click accepted → run the stamp animation, then auto-close. */
  beginConfirm() {
    this.confirmT = 0;
  }

  // ==========================================================================
  // Frame update
  // ==========================================================================
  update(dt) {
    this.time += dt;

    // one-time satellite snapshot once the world is built
    if (!this.snapTried && this.game.world?.group?.children?.length) this._takeSnapshot();

    // dev auto-open
    if (this.devMode && !this._devDone && this.snapTried) {
      this._devDone = true;
      if (this.game.harness?.noBots) {
        const sp = this.game.world.enemySpawns;
        this._demoPings = (sp?.length >= 8 ? [sp[1], sp[4], sp[7]] : [])
          .map((p, i) => ({ x: p.x, z: p.z, t: 0, age: i * 0.95 + 0.35 }));
        this.pings.push(...this._demoPings);
      }
      this.open(new THREE.Vector2(0, 0));
      if (this.devMode === 'confirm') {
        const ok = this.onConfirm?.(new THREE.Vector3(this.cursor.x, 0, this.cursor.y), { dev: true });
        if (ok !== false) this.beginConfirm();
      }
    }
    // demo pings hold their age so dev screenshots always show them
    if (this._demoPings) for (const p of this._demoPings) p.t = this.time - p.age;

    // prune stale pings
    for (let i = this.pings.length - 1; i >= 0; i--) {
      if (this.time - this.pings[i].t > 3) this.pings.splice(i, 1);
    }

    if (!this.isOpen) return;
    const { input, player, world } = this.game;

    if (!player.alive) { this.close(); return; }

    if (this.confirmT == null && !this.devMode) {
      // cursor follows mouse deltas (pointer stays locked); raw fields because
      // input.enabled is off while the map is up
      this.cursor.x += input.mouseDX * 0.28;
      this.cursor.y += input.mouseDY * 0.28;
      const H = world.bounds.half - 2;
      this.cursor.x = THREE.MathUtils.clamp(this.cursor.x, -H, H);
      this.cursor.y = THREE.MathUtils.clamp(this.cursor.y, -H, H);
      if (input._mouseJustPressed.has(0)) {
        const ok = this.onConfirm?.(new THREE.Vector3(this.cursor.x, 0, this.cursor.y), {});
        if (ok) this.beginConfirm();
      }
    }
    // swallow clicks so weapons never fire through the map
    input.mouseDown.delete(0);
    input._mouseJustPressed.delete(0);

    if (this.confirmT != null) {
      this.confirmT += dt;
      if (this.confirmT >= 0.35 && this.devMode !== 'confirm') this.close();
    }

    this._draw();
  }

  // ==========================================================================
  // Drawing
  // ==========================================================================
  _draw() {
    const g = this.ctx;
    const S = 1024;
    const H = this.game.world.bounds.half;
    const s = S / (H * 2);
    const px = (x) => (x + H) * s;
    const py = (z) => (z + H) * s;
    const t = this.time;

    // --- base imagery ------------------------------------------------------
    if (this.snapshot) {
      g.drawImage(this.snapshot, 0, 0);
    } else {
      this._drawVectorBase(g, S, H, s);
    }

    // edge vignette
    const vg = g.createRadialGradient(S / 2, S / 2, S * 0.32, S / 2, S / 2, S * 0.74);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.52)');
    g.fillStyle = vg;
    g.fillRect(0, 0, S, S);

    // --- grid + coordinates -------------------------------------------------
    g.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const p = (i / 10) * S;
      g.strokeStyle = i === 5 ? 'rgba(255,255,255,.16)' : COL.lineSoft;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
    }
    g.font = '600 26px Rajdhani';
    g.fillStyle = 'rgba(232,230,224,.6)';
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (let i = 0; i < 10; i++) {
      const c = ((i + 0.5) / 10) * S;
      g.fillText(String.fromCharCode(65 + i), c, 32);
      g.textAlign = 'left';
      g.fillText(String(i + 1), 12, c + 9);
      g.textAlign = 'center';
    }

    // --- scan-line sweep ----------------------------------------------------
    const sweep = ((t * 0.062) % 1) * (S + 240) - 120;
    const grad = g.createLinearGradient(0, sweep - 170, 0, sweep);
    grad.addColorStop(0, 'rgba(150,215,185,0)');
    grad.addColorStop(1, 'rgba(150,215,185,.17)');
    g.fillStyle = grad;
    g.fillRect(0, Math.max(0, sweep - 170), S, Math.min(170, sweep));
    g.fillStyle = 'rgba(190,240,210,.3)';
    if (sweep > 0 && sweep < S) g.fillRect(0, sweep, S, 2.5);

    // --- live strike axes (inbound runs) ------------------------------------
    if (this.strikeDir && this.strikeTarget && this._axisVisible()) {
      this._drawStrikeAxis(g, S, px, py);
    }

    // --- enemy pings (fired within last 3s) + UAV live feed ------------------
    for (const p of this.pings) {
      const age = t - p.t;
      const a = Math.max(0, 1 - age / 3);
      const X = px(p.x), Y = py(p.z);
      g.fillStyle = `rgba(255,74,58,${(0.9 * a).toFixed(3)})`;
      g.beginPath(); g.arc(X, Y, 6.5, 0, Math.PI * 2); g.fill();
      const ring = (age % 1.1) / 1.1;
      g.strokeStyle = `rgba(255,74,58,${(0.55 * a * (1 - ring)).toFixed(3)})`;
      g.lineWidth = 2;
      g.beginPath(); g.arc(X, Y, 8 + ring * 30, 0, Math.PI * 2); g.stroke();
    }
    if (this.game.state?.uavActive) {
      g.lineWidth = 2.5;
      for (const e of this.game.ai?.enemies ?? []) {
        if (!e.alive) continue;
        const X = px(e.position.x), Y = py(e.position.z);
        g.strokeStyle = 'rgba(255,74,58,.95)';
        g.beginPath(); g.arc(X, Y, 7, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(255,74,58,.4)';
        g.beginPath(); g.arc(X, Y, 3, 0, Math.PI * 2); g.fill();
      }
    }

    // --- player marker + view wedge -----------------------------------------
    {
      const p = this.game.player.position;
      const X = px(p.x), Y = py(p.z);
      const yaw = this.game.player.yaw;
      const ang = Math.atan2(-Math.cos(yaw), -Math.sin(yaw)); // screen angle of facing
      const wg = g.createRadialGradient(X, Y, 4, X, Y, 92);
      wg.addColorStop(0, 'rgba(216,178,90,.42)');
      wg.addColorStop(1, 'rgba(216,178,90,0)');
      g.fillStyle = wg;
      g.beginPath();
      g.moveTo(X, Y);
      g.arc(X, Y, 92, ang - 0.62, ang + 0.62);
      g.closePath(); g.fill();
      g.save();
      g.translate(X, Y);
      g.rotate(ang + Math.PI / 2);
      g.fillStyle = COL.gold;
      g.strokeStyle = 'rgba(0,0,0,.55)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10);
      g.closePath(); g.stroke(); g.fill();
      g.restore();
    }

    // --- target cursor -------------------------------------------------------
    this._drawCursor(g, S, H, px, py);

    // --- frame furniture: corner brackets + border ---------------------------
    g.strokeStyle = COL.gold;
    g.lineWidth = 3;
    const B = 16, L = 40;
    for (const [cx, cy, sx, sy] of [[B, B, 1, 1], [S - B, B, -1, 1], [B, S - B, 1, -1], [S - B, S - B, -1, -1]]) {
      g.beginPath();
      g.moveTo(cx + sx * L, cy);
      g.lineTo(cx, cy);
      g.lineTo(cx, cy + sy * L);
      g.stroke();
    }
    g.strokeStyle = COL.line;
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, S - 1, S - 1);

    // caption chips
    g.font = '600 20px Rajdhani';
    g.textAlign = 'left';
    g.fillStyle = 'rgba(232,230,224,.5)';
    g.fillText('SAT-04 // LIVE FEED', 34, S - 30);
    g.textAlign = 'right';
    g.fillText(`SECTOR ${gridRef(this.cursor.x, this.cursor.y, H)} · N ${(34.4 - this.cursor.y * 0.0012).toFixed(4)}° E ${(43.1 + this.cursor.x * 0.0012).toFixed(4)}°`, S - 34, S - 30);
    g.textAlign = 'left';
  }

  _axisVisible() {
    // show the ingress axis while a strike is confirmed/being flown
    return this.confirmT != null || (this.game.airstrike?.strikes?.length ?? 0) > 0;
  }

  _drawStrikeAxis(g, S, px, py) {
    const tX = px(this.strikeTarget.x), tY = py(this.strikeTarget.z);
    const dx = this.strikeDir.x, dz = this.strikeDir.z;
    const ex = tX - dx * S, ey = tY - dz * S;   // entry side (far behind target)
    const fx = tX + dx * S, fy = tY + dz * S;   // exit side
    g.save();
    g.setLineDash([14, 12]);
    g.strokeStyle = 'rgba(255,74,58,.5)';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(ex, ey); g.lineTo(fx, fy); g.stroke();
    g.setLineDash([]);
    // ingress arrowheads marching toward target
    const step = ((this.time * 0.9) % 1);
    for (let k = 0; k < 3; k++) {
      const d = 260 - ((k + step) * 78);
      const ax = tX - dx * d, ay = tY - dz * d;
      const a = Math.atan2(dz, dx);
      g.save();
      g.translate(ax, ay);
      g.rotate(a);
      g.strokeStyle = `rgba(255,74,58,${0.85 - k * 0.22})`;
      g.lineWidth = 3.5;
      g.beginPath();
      g.moveTo(-11, -12); g.lineTo(3, 0); g.lineTo(-11, 12);
      g.stroke();
      g.restore();
    }
    // INGRESS label near the entry edge
    const lx = tX - dx * 330, ly = tY - dz * 330;
    if (lx > 40 && lx < S - 40 && ly > 46 && ly < S - 46) {
      g.font = '700 24px Rajdhani';
      g.fillStyle = 'rgba(255,74,58,.8)';
      g.textAlign = 'center';
      g.fillText('INGRESS', lx, ly - 16);
    }
    g.restore();
  }

  _drawCursor(g, S, H, px, py) {
    const X = px(this.cursor.x), Y = py(this.cursor.y);
    const t = this.time;
    const confirming = this.confirmT != null;

    g.strokeStyle = COL.red;
    g.fillStyle = COL.red;

    // crosshair with gaps
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(X - 52, Y); g.lineTo(X - 20, Y);
    g.moveTo(X + 20, Y); g.lineTo(X + 52, Y);
    g.moveTo(X, Y - 52); g.lineTo(X, Y - 20);
    g.moveTo(X, Y + 20); g.lineTo(X, Y + 52);
    g.stroke();
    g.beginPath(); g.arc(X, Y, 3.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(X, Y, 34, 0, Math.PI * 2); g.stroke();

    // expanding targeting ring
    const k = (t % 1.2) / 1.2;
    g.strokeStyle = `rgba(255,74,58,${(0.6 * (1 - k)).toFixed(3)})`;
    g.lineWidth = 2;
    g.beginPath(); g.arc(X, Y, 34 + k * 44, 0, Math.PI * 2); g.stroke();

    // planned bomb stick (90m along the ingress line) while aiming — this is
    // the exact axis the run will fly if confirmed
    if (!confirming) {
      const p = this.game.player;
      // re-plan the visible-side ingress as the cursor moves
      const planned = planIngress(this.game, { x: this.cursor.x, z: this.cursor.y }, this.plannedMag ?? 0.65);
      if (planned != null) this.plannedOffset = planned;
      const a = ingressAngle(p.position, p.yaw, { x: this.cursor.x, z: this.cursor.y }, this.plannedOffset ?? 0.6);
      const dx = Math.cos(a), dz = Math.sin(a);
      const rad = 45 * (S / (H * 2)); // 45m half-length of the stick
      g.save();
      g.strokeStyle = 'rgba(255,74,58,.5)';
      g.setLineDash([9, 9]);
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(X - dx * rad, Y - dz * rad);
      g.lineTo(X + dx * rad, Y + dz * rad);
      g.stroke();
      g.setLineDash([]);
      // arrowhead on the flight direction
      g.translate(X + dx * (rad + 8), Y + dz * (rad + 8));
      g.rotate(Math.atan2(dz, dx));
      g.beginPath();
      g.moveTo(-12, -9); g.lineTo(2, 0); g.lineTo(-12, 9);
      g.stroke();
      g.restore();
    }

    // blinking TGT tag + grid readout
    const blink = Math.floor(t * 2.4) % 2 === 0;
    g.font = '700 23px Rajdhani';
    g.textAlign = 'left';
    if (blink || confirming) g.fillText('TGT', X + 44, Y - 44);
    g.font = '600 21px Rajdhani';
    g.fillStyle = 'rgba(232,230,224,.85)';
    g.fillText(gridRef(this.cursor.x, this.cursor.y, H), X + 44, Y + 58);
    this.readout.textContent = gridRef(this.cursor.x, this.cursor.y, H);

    // --- STRIKE CONFIRMED stamp ---------------------------------------------
    if (confirming) {
      const a = Math.min(1, this.confirmT / 0.08);
      const kk = Math.min(1, this.confirmT / 0.15);
      const scale = 1 + (1 - kk) * (1 - kk) * 1.1;
      const cx = THREE.MathUtils.clamp(X, 300, S - 300);
      const cy = THREE.MathUtils.clamp(Y - 110, 130, S - 130);
      g.save();
      g.translate(cx, cy);
      g.rotate(-0.055);
      g.scale(scale, scale);
      g.globalAlpha = a;
      g.fillStyle = 'rgba(255,74,58,.14)';
      g.strokeStyle = COL.red;
      g.lineWidth = 3.5;
      g.fillRect(-252, -40, 504, 80);
      g.strokeRect(-252, -40, 504, 80);
      g.fillStyle = COL.red;
      g.font = '700 52px Rajdhani';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('STRIKE CONFIRMED', 0, 3);
      g.restore();
      g.globalAlpha = 1;
      g.textBaseline = 'alphabetic';
    }
  }

  /** Vector fallback if the satellite snapshot could not be captured. */
  _drawVectorBase(g, S, H, s) {
    g.fillStyle = '#0d1211';
    g.fillRect(0, 0, S, S);
    const grid = this.game.world.navgrid;
    if (!grid) return;
    g.fillStyle = '#1c2522';
    const step = 2;
    const cell = step * grid.cell * s;
    for (let iz = 0; iz < grid.n; iz += step) {
      for (let ix = 0; ix < grid.n; ix += step) {
        if (!grid.blocked[grid.idx(ix, iz)]) continue;
        const w = grid.toWorld(ix, iz);
        g.fillRect((w.x + H) * s, (w.z + H) * s, cell, cell);
      }
    }
  }
}
