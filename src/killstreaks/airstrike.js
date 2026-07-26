import * as THREE from 'three';
import { getMaterialLib } from '../world/textures.js';

/**
 * CAS-9 air strike: targeting tablet → marker smoke → 3-jet flyby →
 * bomb release → walking stick of heavy detonations across the target line.
 */

function buildJet() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x5a636b, roughness: 0.38, metalness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3237, roughness: 0.4, metalness: 0.6 });

  // Fuselage
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 9.5, 12), body);
  fus.rotation.x = Math.PI / 2;
  g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 12), body);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -6;
  g.add(nose);
  // Canopy
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshStandardMaterial({ color: 0x161c22, roughness: 0.06, metalness: 0.9 }));
  can.scale.set(0.72, 0.55, 1.7);
  can.position.set(0, 0.5, -3.4);
  g.add(can);
  // Wings (swept)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.lineTo(4.6, -2.6); wingShape.lineTo(4.6, -3.6); wingShape.lineTo(0, -2.4); wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: false });
  for (const s of [1, -1]) {
    const wing = new THREE.Mesh(wingGeo, body);
    wing.rotation.x = Math.PI / 2;
    wing.scale.x = s;
    wing.position.set(s * 0.4, 0, 1.2);
    g.add(wing);
  }
  // Tail fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(1.4, -0.5); finShape.lineTo(1.4, -1.1); finShape.lineTo(0, -1.6); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.09, bevelEnabled: false });
  for (const s of [1, -1]) {
    const vfin = new THREE.Mesh(finGeo, dark);
    vfin.rotation.z = Math.PI / 2 - s * 0.35;
    vfin.rotation.x = 0;
    vfin.position.set(s * 0.5, 0.35, 3.6);
    vfin.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0);
    vfin.rotation.y = Math.PI / 2;
    g.add(vfin);
    const hfin = new THREE.Mesh(finGeo, body);
    hfin.rotation.x = Math.PI / 2;
    hfin.scale.x = s;
    hfin.position.set(s * 0.4, -0.05, 3.4);
    g.add(hfin);
  }
  // Engine nozzles + glow
  for (const s of [0.32, -0.32]) {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.8, 10), dark);
    noz.rotation.x = Math.PI / 2;
    noz.position.set(s, 0, 4.9);
    g.add(noz);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 10), new THREE.MeshBasicMaterial({ color: 0xff8830, toneMapped: false }));
    glow.position.set(s, 0, 5.32);
    g.add(glow);
  }
  // Underwing ordnance
  for (const s of [1.6, -1.6, 2.8, -2.8]) {
    const bomb = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.9, 4, 8), dark);
    bomb.rotation.x = Math.PI / 2;
    bomb.position.set(s, -0.5, 1.1);
    g.add(bomb);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export class AirstrikeSystem {
  constructor({ scene, fx, explosions, decals, audio, enemies, hud, getPlayerPos, onPlayerDamage, minimapShapes, halfSize }) {
    this.scene = scene;
    this.fx = fx;
    this.explosions = explosions;
    this.decals = decals;
    this.audio = audio;
    this.enemies = enemies;
    this.hud = hud;
    this.getPlayerPos = getPlayerPos;
    this.onPlayerDamage = onPlayerDamage;
    this.minimapShapes = minimapShapes;
    this.halfSize = halfSize;
    this.onKillsScored = null;

    this.state = 'idle';   // idle | targeting | inbound
    this.charges = 1;
    this.timeline = 0;
    this.target = new THREE.Vector3();
    this.jets = [];
    this.bombs = [];
    this.bombsDropped = false;
    this.explosionsFired = 0;
    this.trailAcc = 0;

    this.tablet = document.getElementById('tablet');
    this.tabletMap = document.getElementById('tablet-map');
    // Uniform px-per-metre on BOTH axes. The canvas is 858x586 but the world
    // is square: normalising z by canvas height stretched every N-S feature
    // ~46% too wide (the 'vertical road smear'). X spans the full map width;
    // Z shows a ±zHalf crop at the same scale.
    this.zHalf = this.halfSize * (this.tabletMap.height / this.tabletMap.width);
    this.reticle = document.getElementById('tablet-reticle');
    this.coordEl = document.getElementById('tablet-coord');
    this.coordEl.textContent = this._gridRef(0, 0); // map center until the cursor moves
    this.onClose = null;
    this._buildDeviceChrome();
    this._buildRoadMask();
    this._buildSatUnderlay();
    this._buildNoise();

    this.tabletMap.parentElement.addEventListener('mousemove', (e) => {
      if (this.state !== 'targeting') return;
      const rect = this.tabletMap.getBoundingClientRect();
      const wx = ((e.clientX - rect.left) / rect.width - 0.5) * this.halfSize * 2;
      const wz = ((e.clientY - rect.top) / rect.height - 0.5) * this.zHalf * 2;
      this.coordEl.textContent = this._gridRef(wx, wz);
      this.reticle.classList.remove('hidden');
      this.reticle.style.left = `${e.clientX - rect.left}px`;
      this.reticle.style.top = `${e.clientY - rect.top}px`;
    });
    this.tabletMap.parentElement.addEventListener('mousedown', (e) => {
      if (this.state !== 'targeting' || e.button !== 0) return;
      const rect = this.tabletMap.getBoundingClientRect();
      const wx = ((e.clientX - rect.left) / rect.width - 0.5) * this.halfSize * 2;
      const wz = ((e.clientY - rect.top) / rect.height - 0.5) * this.zHalf * 2;
      this.confirmTarget(new THREE.Vector3(wx, 0, wz));
    });
  }

  get ready() { return this.charges > 0 && this.state === 'idle'; }

  /** Format world coords as a 4+4 grid reference, e.g. "GRID 0421 0863". */
  _gridRef(wx, wz) {
    const S = this.halfSize;
    const g = (v) => String(Math.max(0, Math.min(9999, Math.round(((v + S) / (2 * S)) * 9999)))).padStart(4, '0');
    return `GRID ${g(wx)} ${g(wz)}`;
  }

  /** Wrap the stock #tablet-frame markup in a physical device: the existing
   *  head/map/foot move into a #tablet-screen pane, and the frame becomes a
   *  22px bezel with corner screws + an etched model label (all DOM built
   *  here so index.html stays untouched; styling lives in styles.css). */
  _buildDeviceChrome() {
    const frame = document.getElementById('tablet-frame');
    if (!frame || document.getElementById('tablet-screen')) return;
    const screen = document.createElement('div');
    screen.id = 'tablet-screen';
    while (frame.firstChild) screen.appendChild(frame.firstChild);
    frame.appendChild(screen);
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      const s = document.createElement('div');
      s.className = `t-screw t-screw-${corner}`;
      frame.appendChild(s);
    }
    const etch = document.createElement('div');
    etch.className = 't-etch';
    etch.textContent = 'CAS-9';
    frame.appendChild(etch);
  }

  /** All roads flattened into ONE offscreen mask (solid phosphor pixels on
   *  transparent), baked once. drawTabletMap composites it in a single
   *  drawImage at ~0.07 alpha, so crossing roads can never double-blend
   *  into a bright band. */
  _buildRoadMask() {
    const W = this.tabletMap.width, H = this.tabletMap.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const S = this.halfSize, ZH = this.zHalf;
    g.fillStyle = 'rgb(140, 235, 180)';
    for (const s of this.minimapShapes) {
      if (s.type !== 'road') continue;
      g.fillRect(((s.x - s.w / 2 + S) / (S * 2)) * W, ((s.z - s.d / 2 + ZH) / (ZH * 2)) * H,
        (s.w / (S * 2)) * W, (s.d / (ZH * 2)) * H);
    }
    this.roadMask = c;
  }

  /** Procedural satellite-style underlay baked once from minimapShapes:
   *  dusty ground, lighter road slab, building footprints as noisy blocks
   *  with SE-offset soft shadows, vehicles as dark blobs, fine grain, then
   *  a green multiply pass. NOT a live render — pure canvas paint. */
  _buildSatUnderlay() {
    const W = this.tabletMap.width, H = this.tabletMap.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const S = this.halfSize, ZH = this.zHalf;
    const toX = (x) => ((x + S) / (S * 2)) * W;
    const toY = (z) => ((z + ZH) / (ZH * 2)) * H;
    let seed = 137;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // Ground: dark dusty base broken by large soft patches.
    g.fillStyle = '#1c2418';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(${(34 + rand() * 30) | 0}, ${(44 + rand() * 26) | 0}, ${(28 + rand() * 16) | 0}, 0.14)`;
      const pw = 40 + rand() * 180, ph = 30 + rand() * 140;
      g.beginPath();
      g.ellipse(rand() * W, rand() * H, pw / 2, ph / 2, rand() * 3.14, 0, 7);
      g.fill();
    }
    // Roads slightly lighter — flattened road mask, composited once.
    g.save();
    g.globalAlpha = 0.14;
    g.drawImage(this.roadMask, 0, 0);
    g.restore();
    // Vehicles / street props: small dark blobs, like a real sat photo.
    for (const s of this.minimapShapes) {
      if (s.type !== 'p') continue;
      const x = toX(s.x - s.w / 2), y = toY(s.z - s.d / 2);
      const w = (s.w / (S * 2)) * W, h = (s.d / (ZH * 2)) * H;
      g.fillStyle = 'rgba(6, 10, 6, 0.55)';
      g.fillRect(x + 1.5, y + 1.5, w, h);
      g.fillStyle = 'rgba(70, 82, 60, 0.8)';
      g.fillRect(x, y, w, h);
    }
    // Building shadows first (soft, offset SE), then the blocks.
    g.save();
    if ('filter' in g) g.filter = 'blur(3px)';
    g.fillStyle = 'rgba(0, 0, 0, 0.42)';
    for (const s of this.minimapShapes) {
      if (s.type !== 'b') continue;
      g.fillRect(toX(s.x - s.w / 2) + 5, toY(s.z - s.d / 2) + 5, (s.w / (S * 2)) * W, (s.d / (ZH * 2)) * H);
    }
    g.restore();
    for (const s of this.minimapShapes) {
      if (s.type !== 'b' && s.type !== 'w') continue;
      const x = toX(s.x - s.w / 2), y = toY(s.z - s.d / 2);
      const w = Math.max(2, (s.w / (S * 2)) * W), h = Math.max(2, (s.d / (ZH * 2)) * H);
      if (s.type === 'w') { // boundary walls: thin pale lines
        g.fillStyle = 'rgba(96, 106, 82, 0.5)';
        g.fillRect(x, y, w, h);
        continue;
      }
      const v = 0.72 + rand() * 0.56; // per-building value variation
      g.fillStyle = `rgb(${(54 * v) | 0}, ${(66 * v) | 0}, ${(48 * v) | 0})`;
      g.fillRect(x, y, w, h);
      // Rooftop clutter: a few lighter/darker patches inside the footprint.
      const n = 3 + (rand() * 4) | 0;
      for (let k = 0; k < n; k++) {
        g.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(190,205,165,0.13)';
        const rw = 2 + rand() * w * 0.4, rh = 2 + rand() * h * 0.4;
        g.fillRect(x + rand() * (w - rw), y + rand() * (h - rh), rw, rh);
      }
      // Sun-facing NW edges catch a sliver of light.
      g.fillStyle = 'rgba(215, 228, 190, 0.14)';
      g.fillRect(x, y, w, 1.5);
      g.fillRect(x, y, 1.5, h);
    }
    // Fine grain scatter.
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(190,210,170,0.05)';
      g.fillRect(rand() * W, rand() * H, 1 + rand(), 1 + rand());
    }
    // Green phosphor multiply over everything.
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgb(104, 158, 112)';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    this.satCanvas = c;
  }

  /** 128px green noise tile, redrawn each frame at a random offset for the
   *  ~1.5% animated grain over the feed. */
  _buildNoise() {
    const n = document.createElement('canvas');
    n.width = n.height = 128;
    const g = n.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = v * 0.45;
      img.data[i + 1] = v;
      img.data[i + 2] = v * 0.55;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.noiseCanvas = n;
  }

  openTargeting() {
    if (!this.ready) return false;
    this.state = 'targeting';
    this.tablet.classList.remove('hidden');
    this.drawTabletMap();
    this.audio.uiClick();
    this.audio.radio();
    return true;
  }

  cancelTargeting() {
    if (this.state !== 'targeting') return;
    this.state = 'idle';
    this.tablet.classList.add('hidden');
    if (this.onClose) this.onClose(false);
  }

  confirmTarget(worldPos) {
    this.charges--;
    this.state = 'inbound';
    this.timeline = 0;
    this.target.copy(worldPos);
    this.tablet.classList.add('hidden');
    this.audio.uiClick(true);
    this.audio.radio();
    this.hud.centerMessage('AIR STRIKE INBOUND — DANGER CLOSE', 2.6);
    this.hud.killfeed('OVERLORD', 'CAS-9 STRIKE PACKAGE EN ROUTE', true);
    this.bombsDropped = false;
    this.explosionsFired = 0;
    this.bombs = [];
    if (this.onClose) this.onClose(true);

    // Red marker smoke at target
    this.markerT = 0;
  }

  drawTabletMap() {
    const c = this.tabletMap.getContext('2d');
    const W = this.tabletMap.width, H = this.tabletMap.height;
    const S = this.halfSize, ZH = this.zHalf;
    const toX = (x) => ((x + S) / (S * 2)) * W;
    const toY = (z) => ((z + ZH) / (ZH * 2)) * H;
    const now = performance.now() * 0.001;
    const MONO = "Consolas, Menlo, 'DejaVu Sans Mono', 'Liberation Mono', monospace";

    // Satellite underlay (baked once), phosphor instrument layers on top.
    c.drawImage(this.satCanvas, 0, 0);

    // Grid: every 4th line heavier, 9px mono numerals along both axes.
    c.lineWidth = 1;
    c.font = `9px ${MONO}`;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    for (let i = 0; i <= 14; i++) {
      const heavy = i % 4 === 0;
      c.strokeStyle = heavy ? 'rgba(110, 220, 160, 0.22)' : 'rgba(110, 220, 160, 0.09)';
      const gx = Math.round((i / 14) * W) + 0.5;
      const gy = Math.round((i / 14) * H) + 0.5;
      c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, H); c.stroke();
      c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
      if (i > 0 && i < 14) {
        const lbl = String(Math.round((i / 14) * 99)).padStart(2, '0');
        c.fillStyle = 'rgba(140, 235, 180, 0.4)';
        c.fillText(lbl, gx + 3, 11);       // eastings along the top
        c.fillText(lbl, 4, gy - 3);        // northings down the left
      }
    }

    // Roads: pre-flattened offscreen mask composited ONCE at 0.07 alpha —
    // no additive double-blend where roads cross — plus 1px phosphor centre
    // dashes on both axes.
    c.save();
    c.globalAlpha = 0.07;
    c.drawImage(this.roadMask, 0, 0);
    c.restore();
    c.strokeStyle = 'rgba(170, 250, 200, 0.3)';
    c.lineWidth = 1;
    c.setLineDash([7, 9]);
    for (const s of this.minimapShapes) {
      if (s.type !== 'road') continue;
      c.beginPath();
      if (s.w >= s.d) { c.moveTo(toX(s.x - s.w / 2), toY(s.z)); c.lineTo(toX(s.x + s.w / 2), toY(s.z)); }
      else { c.moveTo(toX(s.x), toY(s.z - s.d / 2)); c.lineTo(toX(s.x), toY(s.z + s.d / 2)); }
      c.stroke();
    }
    c.setLineDash([]);

    // Buildings: faint fill + phosphor outline; walls outline only.
    for (const s of this.minimapShapes) {
      if (s.type === 'road' || s.type === 'p') continue;
      const x = Math.round(toX(s.x - s.w / 2));
      const y = Math.round(toY(s.z - s.d / 2));
      const w = Math.max(2, Math.round((s.w / (S * 2)) * W));
      const h = Math.max(2, Math.round((s.d / (ZH * 2)) * H));
      if (s.type === 'b') {
        c.fillStyle = 'rgba(120, 230, 170, 0.05)';
        c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(140, 255, 190, 0.5)';
      } else {
        c.strokeStyle = 'rgba(140, 255, 190, 0.22)';
      }
      c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    // Corner brackets.
    c.strokeStyle = 'rgba(160, 255, 200, 0.55)';
    c.lineWidth = 2;
    const B = 18, M = 10;
    for (const [cx, cy, sx, sy] of [[M, M, 1, 1], [W - M, M, -1, 1], [M, H - M, 1, -1], [W - M, H - M, -1, -1]]) {
      c.beginPath();
      c.moveTo(cx + sx * B, cy);
      c.lineTo(cx, cy);
      c.lineTo(cx, cy + sy * B);
      c.stroke();
    }

    // Hostiles: 5px pulsing rotated squares.
    let hi = 0;
    for (const e of this.enemies.enemies) {
      if (!e.alive) continue;
      const pulse = 0.7 + 0.3 * Math.sin(now * 5 + hi * 1.7);
      const size = 5 + pulse * 1.6;
      c.save();
      c.translate(toX(e.pos.x), toY(e.pos.z));
      c.rotate(Math.PI / 4);
      c.globalAlpha = 0.65 + pulse * 0.35;
      c.fillStyle = '#ff5040';
      c.fillRect(-size / 2, -size / 2, size, size);
      c.restore();
      hi++;
    }

    // Player: heading chevron (yaw published by the HUD compass).
    const p = this.getPlayerPos();
    const yaw = this.hud && this.hud.lastYaw ? this.hud.lastYaw : 0;
    c.save();
    c.translate(toX(p.x), toY(p.z));
    c.rotate(-yaw);
    c.fillStyle = '#8af0b8';
    c.beginPath();
    c.moveTo(0, -8);
    c.lineTo(5.5, 6);
    c.lineTo(0, 3);
    c.lineTo(-5.5, 6);
    c.closePath();
    c.fill();
    c.restore();

    // Labels
    c.fillStyle = 'rgba(150, 240, 190, 0.6)';
    c.font = `700 11px ${MONO}`;
    c.fillText('MAIN ST', toX(-40), toY(0) - 10);
    c.fillText('N', 12, 30);

    // Animated green noise (~1.5%): random tile offset each frame.
    c.save();
    c.globalAlpha = 0.03;
    const pat = c.createPattern(this.noiseCanvas, 'repeat');
    c.translate(-((Math.random() * 128) | 0), -((Math.random() * 128) | 0));
    c.fillStyle = pat;
    c.fillRect(0, 0, W + 128, H + 128);
    c.restore();
  }

  _spawnJets() {
    const dir = new THREE.Vector3(1, 0, 0); // strike run west→east
    this.strikeDir = dir;
    const startX = this.target.x - 420;
    for (let i = 0; i < 3; i++) {
      const jet = buildJet();
      jet.scale.setScalar(1.45);
      const off = i === 0 ? 0 : i === 1 ? -19 : 19;
      const lag = i === 0 ? 0 : 30;
      jet.position.set(startX - lag, 46 + i * 2.5, this.target.z + off);
      jet.rotation.y = -Math.PI / 2; // nose toward +X
      this.scene.add(jet);
      this.jets.push({ mesh: jet, speed: 170, dropped: i !== 0 });
      // Only lead jet drops in a strafe line; wingmen escort
    }
    this.audio.jetFlyby(4.2);
  }

  _dropBombs(jet) {
    for (let i = 0; i < 7; i++) {
      this.bombs.push({
        mesh: null,
        jet,
        delay: i * 0.085,
        pos: null,
        vel: null,
        exploded: false,
        idx: i,
      });
    }
    this.audio.bombWhistle(1.9);
  }

  _activateBomb(b) {
    b.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x30363b, roughness: 0.4, metalness: 0.6 })
    );
    b.mesh.rotation.z = Math.PI / 2;
    this.scene.add(b.mesh);
    b.pos = b.jet.mesh.position.clone();
    b.pos.y -= 1.4;
    b.vel = new THREE.Vector3(b.jet.speed * 0.5, -10, 0);
  }

  update(dt) {
    if (this.state === 'targeting') {
      this.drawTabletMap();
      return;
    }
    if (this.state !== 'inbound') return;

    const prevT = this.timeline;
    this.timeline += dt;
    const t = this.timeline;

    // Marker smoke (red) rising at target
    if (t < 4.2) {
      this.markerT -= dt;
      if (this.markerT <= 0) {
        this.markerT = 0.08;
        this.fx.smoke.spawn({
          pos: this.target.clone().add(new THREE.Vector3(Math.random() - 0.5, 0.3, Math.random() - 0.5)),
          vel: new THREE.Vector3(0.5, 3.2 + Math.random() * 1.5, 0.2),
          life: 2.6, size0: 0.5, size1: 2.6,
          color0: new THREE.Color(0.75, 0.1, 0.08), color1: new THREE.Color(0.5, 0.12, 0.1),
          alpha0: 0.6, alpha1: 0, fadeIn: 0.1,
        });
      }
      if (prevT === 0) {
        this.fx.lights.flash(this.target.clone().add(new THREE.Vector3(0, 1, 0)), { color: 0xff3020, intensity: 30, life: 3.5, distance: 14 });
      }
    }

    // Jets in at t=2
    if (prevT < 2 && t >= 2) this._spawnJets();

    // Move jets + contrails
    for (const j of this.jets) {
      j.mesh.position.x += j.speed * dt;
      // Bomb release ~184m short of target (ballistic lead for the stick)
      if (!j.dropped && j.mesh.position.x > this.target.x - 184) {
        j.dropped = true;
        this._dropBombs(j);
      }
      // Wingtip contrails — sub-stepped along the flight segment: at 170 m/s
      // an interval timer left ~5m dashes, so instead emit overlapping
      // velocity-stretched ribbon segments every 2.4m of travel (carry kept
      // per jet so spacing survives frame boundaries).
      if (j.trailCarry === undefined) j.trailCarry = 0;
      j.trailCarry += j.speed * dt;
      while (j.trailCarry >= 2.4) {
        j.trailCarry -= 2.4;
        const tx = j.mesh.position.x - 1.5 - j.trailCarry;
        for (const s of [-4.7, 4.7]) {
          this.fx.contrail.spawn({
            pos: new THREE.Vector3(tx, j.mesh.position.y + (Math.random() - 0.5) * 0.15, j.mesh.position.z + s),
            vel: new THREE.Vector3(0.4, 0.05, 0), // stretch axis ~ flight path, near-zero drift
            life: 4 + Math.random() * 2,
            size0: 0.25, size1: 0.6, stretch: 11,
            color0: new THREE.Color(0.96, 0.96, 0.98), color1: new THREE.Color(0.9, 0.9, 0.94),
            alpha0: 0.25, alpha1: 0, fadeIn: 0.06,
          });
        }
      }
    }

    // Bombs fall
    for (const b of this.bombs) {
      if (b.exploded) continue;
      if (!b.mesh) {
        b.delay -= dt;
        if (b.delay <= 0) this._activateBomb(b);
        continue;
      }
      b.vel.y -= 22 * dt;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.z = Math.atan2(-b.vel.y, b.vel.x);
      // Bomb trail — grey puffs sub-stepped every 0.4m along the fall
      // segment so the ~50 m/s drop reads as a continuous ribbon, not dots.
      if (b.trailCarry === undefined) b.trailCarry = 0;
      const segLen = b.vel.length() * dt;
      b.trailCarry += segLen;
      while (b.trailCarry >= 0.4) {
        b.trailCarry -= 0.4;
        const p = b.pos.clone();
        if (segLen > 1e-6) p.addScaledVector(b.vel, -(b.trailCarry / segLen) * dt);
        this.fx.contrail.spawn({
          pos: p,
          vel: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.3, (Math.random() - 0.5) * 0.2),
          life: 1.1 + Math.random() * 0.5,
          size0: 0.28, size1: 0.95,
          color0: new THREE.Color(0.52, 0.5, 0.48), color1: new THREE.Color(0.58, 0.56, 0.54),
          alpha0: 0.32, alpha1: 0, drag: 0.6, fadeIn: 0.02,
        });
      }
      if (b.pos.y <= 0.4) {
        b.exploded = true;
        this.scene.remove(b.mesh);
        const ep = new THREE.Vector3(b.pos.x, 0, this.target.z + (Math.random() - 0.5) * 9);
        this.explosions.spawn(ep, { radius: 9, big: true });
        const playerPos = this.getPlayerPos();
        const distToPlayer = ep.distanceTo(playerPos);
        this.audio.explosion({ dist: distToPlayer, big: true });
        const kills = this.enemies.damageInRadius(ep, 11, 320, true, 'CAS-9');
        if (kills > 0 && this.onKillsScored) this.onKillsScored(kills);
        if (distToPlayer < 12 && this.onPlayerDamage) {
          this.onPlayerDamage(Math.max(10, 90 - distToPlayer * 7), ep);
        }
        this.explosionsFired++;
      }
    }

    // Cleanup
    if (t > 6) {
      for (const j of this.jets) {
        if (j.mesh.position.x > this.target.x + 480) {
          this.scene.remove(j.mesh);
        }
      }
    }
    if (t > 11) {
      for (const j of this.jets) this.scene.remove(j.mesh);
      this.jets = [];
      for (const b of this.bombs) if (!b.exploded) this.scene.remove(b.mesh);
      this.bombs = [];
      this.state = 'idle';
    }
  }
}
