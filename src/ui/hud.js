import * as THREE from 'three';

/** Inline SVG silhouettes for the killstreak rows (18x18, currentColor). */
const STREAK_ICONS = {
  // Top-down surveillance drone: slim fuselage with a pointed nose, one
  // straight full-span main wing, twin tail booms into a flat stabilizer
  // (reads as an aircraft, not a crucifix).
  uav: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 0.8 L9.9 2.4 L9.9 10.8 L8.1 10.8 L8.1 2.4 Z M0.9 4.5 L17.1 4.5 L17.1 6.3 L0.9 6.3 Z M4.5 6.3 L5.4 6.3 L5.4 13.2 L4.5 13.2 Z M12.6 6.3 L13.5 6.3 L13.5 13.2 L12.6 13.2 Z M3.6 13.2 L14.4 13.2 L14.4 14.6 L3.6 14.6 Z"/></svg>',
  // Side-profile strike jet: tail fin left, canopy mid, nose right.
  jet: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M1 11.4 L2.2 6.6 L3.7 6.6 L4.5 9.1 L7.2 8.4 L8 7.1 L9.9 7.1 L10.5 8.3 L16.9 9.3 L16.9 10.1 L11.2 11.1 L8.7 13.2 L7.1 13.2 L7.9 11.3 L3.4 11.9 L2.9 12.8 L1.6 12.8 Z"/></svg>',
};

/** Killfeed weapon glyph (30x12, currentColor): carbine side profile facing
 *  the victim — stock, receiver + top rail, grip, canted mag, barrel with
 *  front-sight post and muzzle device. */
const KF_GUN_ICON =
  '<svg viewBox="0 0 30 12" aria-hidden="true"><path d="M0.4 3.2 L3.8 3.5 L3.8 6.2 L0.4 6.9 Z ' +
  'M3.8 4.1 L5.4 4.1 L5.4 5.7 L3.8 5.7 Z M6.4 2.1 L12.4 2.1 L12.4 3.2 L6.4 3.2 Z ' +
  'M5.4 3.2 L16 3.2 L16 6.3 L5.4 6.3 Z M6.9 6.3 L8.7 6.3 L8 9.4 L6.4 9.4 Z ' +
  'M10.6 6.3 L13.3 6.3 L14 9.9 L11.3 9.9 Z M16 3.6 L22.6 3.9 L22.6 5.5 L16 5.9 Z ' +
  'M22.6 4.2 L26.8 4.3 L26.8 5.1 L22.6 5.2 Z M23.2 2.5 L24.1 2.5 L24.4 3.9 L23 3.9 Z ' +
  'M26.8 3.9 L29.2 4 L29.2 5.3 L26.8 5.3 Z"/></svg>';

/** DOM-based HUD controller: compass, minimap, ammo, health, killfeed,
 *  hitmarkers, damage indicators, killstreak widget, spot diamonds, banners.
 *  `camera` (optional) enables world→screen projection for enemy spots. */
export class HUD {
  constructor(camera = null) {
    this.camera = camera;
    this.el = document.getElementById('hud');
    this.compassEl = document.getElementById('compass');
    this.compassTape = document.getElementById('compass-tape');
    this.bearingEl = document.getElementById('compass-bearing');
    this.mmCanvas = document.getElementById('minimap-canvas');
    this.mmCtx = this.mmCanvas.getContext('2d');
    // Render the minimap at device resolution so it stays crisp.
    this.mmSize = 190;
    this.mmDpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.mmCanvas.width = Math.round(this.mmSize * this.mmDpr);
    this.mmCanvas.height = Math.round(this.mmSize * this.mmDpr);
    this.crosshair = document.getElementById('crosshair');
    this.hitmarker = document.getElementById('hitmarker');
    this.ammoMag = document.getElementById('ammo-mag');
    this.ammoReserve = document.getElementById('ammo-reserve');
    this.weaponName = document.getElementById('weapon-name');
    this.fireMode = document.getElementById('fire-mode');
    // index.html ships legacy pip markup; normalise to microcopy immediately.
    this.fireMode.textContent = this.fireMode.getAttribute('data-mode') || 'AUTO';
    this.reloadHint = document.getElementById('reload-hint');
    this.healthFill = document.getElementById('health-fill');
    this.healthFlash = document.getElementById('health-flash');
    this.killfeedEl = document.getElementById('killfeed');
    this.scorePopups = document.getElementById('score-popups');
    this.centerMsg = document.getElementById('center-msg');
    this.waveBannerEl = document.getElementById('wave-banner');
    this.waveTitle = document.getElementById('wave-title');
    this.waveSub = document.getElementById('wave-sub');
    this.dmgVignette = document.getElementById('damage-vignette');
    this.dmgIndicators = document.getElementById('damage-indicators');
    this.objectiveText = document.getElementById('objective-text');
    this.streakUav = document.getElementById('streak-uav');
    this.streakAir = document.getElementById('streak-airstrike');
    this.flashOverlay = document.getElementById('flash-overlay');

    this._lastHealthFrac = 1;
    this._lastBearing = '';
    this._hmTimer = null;
    this._msgTimer = null;
    this._waveTimer = null;
    this._buildCompass();
    this._initStreakPips();
    this._buildSpotLayer();
    this.lastYaw = 0;
    this.mapImage = null;
    this.mapScale = 1;
    this.halfSize = 70;
    this.uavActive = false;
    this.strikeMarker = null;
    this._spotV = new THREE.Vector3();
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); }

  /* ------------------------------ compass ------------------------------ */
  _buildCompass() {
    const marks = [];
    const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    // 3 copies for wrapping. ONE tick row, one draw pass per mark: a 1x8px
    // tick every 5° at uniform alpha, a taller 1x12px tick at the 45° label
    // points (under the letters). No major/minor alpha tiers, no shadows.
    for (let rep = -1; rep <= 1; rep++) {
      for (let deg = 0; deg < 360; deg += 5) {
        const total = rep * 360 + deg;
        if (labels[deg] !== undefined) {
          const inter = deg % 90 !== 0 ? ' inter' : '';
          marks.push(`<span class="c-mark${inter}" data-deg="${total}">${labels[deg]}</span>`);
          marks.push(`<span class="c-tick cardinal" data-deg="${total}"></span>`);
        } else {
          marks.push(`<span class="c-tick" data-deg="${total}"></span>`);
        }
      }
    }
    this.compassTape.innerHTML = marks.join('');
    this._compassMarks = [...this.compassTape.children];
    // Cache which marks are ticks: they take the integer-snapped transform
    // path in updateCompass (keeps the per-frame loop classList-free).
    for (const m of this._compassMarks) m._tick = m.classList.contains('c-tick');
    // World-anchored waypoint pip (airstrike designation) riding the tape.
    this.strikePip = document.createElement('div');
    this.strikePip.className = 'c-pip';
    this.compassEl.appendChild(this.strikePip);
  }

  /** Airstrike designation point (Vector3 or null). Timestamped on assignment
   *  so the compass waypoint pip expires after the run is called in. */
  get strikeMarker() { return this._strikeMarker; }
  set strikeMarker(v) {
    this._strikeMarker = v ?? null;
    this._strikeSetT = performance.now() * 0.001;
  }

  updateCompass(yaw) {
    this.lastYaw = yaw; // published for consumers without a player ref (tablet)
    const degPerPx = 2.4;
    const heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
    const cx = 170; // half of 340 container
    for (const m of this._compassMarks) {
      const deg = parseFloat(m.dataset.deg);
      let rel = deg - heading;
      while (rel > 180 + 360) rel -= 360 * 3;
      const x = cx + rel * degPerPx;
      // Ticks snap to whole pixels with NO -50% centring shift: a 1px-wide
      // mark translated by half its width always straddles a pixel boundary
      // and antialiases into two soft columns (the old double-tick artifact).
      // 5° spacing is exactly 12px, so snapping keeps the rhythm uniform.
      m.style.transform = m._tick
        ? `translateX(${Math.round(x)}px)`
        : `translateX(${x.toFixed(1)}px) translateX(-50%)`;
    }
    // Live numeric bearing under the caret, e.g. "092"
    const b = String(Math.round(heading) % 360).padStart(3, '0');
    if (b !== this._lastBearing) {
      this._lastBearing = b;
      this.bearingEl.textContent = b;
    }
    // Waypoint pip: rides the tape at the target's world bearing, clamps to
    // the strip ends when off-axis, expires 20 s after designation.
    const t = this.strikeMarker;
    const live = t && this._pipPos && performance.now() * 0.001 - this._strikeSetT < 20;
    if (live) {
      const bearing = Math.atan2(t.x - this._pipPos.x, -(t.z - this._pipPos.z)) * 180 / Math.PI;
      let rel = ((bearing - heading) % 360 + 360) % 360;
      if (rel > 180) rel -= 360;
      const raw = cx + rel * degPerPx;
      const x = Math.max(60, Math.min(280, raw));
      this.strikePip.style.transform = `translateX(${x.toFixed(1)}px) translateX(-50%) rotate(45deg)`;
      this.strikePip.classList.add('on');
      this.strikePip.classList.toggle('clamped', raw < 60 || raw > 280);
    } else {
      this.strikePip.classList.remove('on');
    }
  }

  /* ------------------------------ minimap ------------------------------ */
  buildMinimap(shapes, halfSize) {
    this.halfSize = halfSize;
    const size = 560;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    // Warm desert palette: dust ground, lighter roads, pale building blocks.
    ctx.fillStyle = '#3a3d36';
    ctx.fillRect(0, 0, size, size);
    const S = halfSize;
    const toX = (x) => ((x + S) / (2 * S)) * size;
    const toY = (z) => ((z + S) / (2 * S)) * size;
    const px = (m) => (m / (2 * S)) * size; // metres → map px
    const rect = (s) => [toX(s.x - s.w / 2), toY(s.z - s.d / 2), Math.max(3, px(s.w)), Math.max(3, px(s.d))];
    // Roads two-tone: pale sidewalk aprons first (each road rect grown ~2.2 m
    // across its narrow axis), then the darker asphalt slab. Each tone goes
    // through a single path so overlaps paint once (no bright bands).
    const walks = new Path2D();
    const roads = new Path2D();
    for (const s of shapes) {
      if (s.type !== 'road') continue;
      const gw = s.w > s.d ? 0 : 2.2; // grow across the narrow axis only
      const gd = s.w > s.d ? 2.2 : 0;
      walks.rect(toX(s.x - s.w / 2 - gw), toY(s.z - s.d / 2 - gd), px(s.w + gw * 2), px(s.d + gd * 2));
      roads.rect(toX(s.x - s.w / 2), toY(s.z - s.d / 2), px(s.w), px(s.d));
    }
    ctx.fillStyle = '#7d7f72'; // concrete sidewalk
    ctx.fill(walks);
    ctx.fillStyle = '#565952'; // asphalt
    ctx.fill(roads);
    // Boundary walls: thin dark strokes only (must not read as buildings).
    for (const s of shapes) {
      if (s.type !== 'w') continue;
      const [x, y, w, h] = rect(s);
      ctx.fillStyle = '#2e2f29';
      ctx.fillRect(x, y, w, h);
    }
    // Buildings only ('p' props like the wrecked bus are NOT painted): 2px
    // south-east drop shadow first, then a ~70% grey block, then a 1px
    // darker outline so footprints read as structures, not blobs.
    ctx.lineWidth = 1;
    for (const s of shapes) {
      if (s.type !== 'b') continue;
      const [x, y, w, h] = rect(s);
      ctx.fillStyle = 'rgba(30, 31, 27, 0.55)';
      ctx.fillRect(x + 2, y + 2, w, h);
    }
    for (const s of shapes) {
      if (s.type !== 'b') continue;
      const [x, y, w, h] = rect(s);
      ctx.fillStyle = '#b3b3ab';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#6c6d64';
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
    }
    this.mapImage = c;
    this.mapScale = size / (2 * S);
  }

  /** 45° hatch pattern (~6 px period, 4% white) filling everything beyond
   *  the painted map bounds so tile edges never read as void. Lazy-built. */
  _hatchPattern(ctx) {
    if (!this._hatchPat) {
      const t = document.createElement('canvas');
      t.width = t.height = 8;
      const g = t.getContext('2d');
      g.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-2, 10); g.lineTo(10, -2); // main diagonal
      g.moveTo(-2, 2); g.lineTo(2, -2);   // corner wrap
      g.moveTo(6, 10); g.lineTo(10, 6);   // corner wrap
      g.stroke();
      this._hatchPat = ctx.createPattern(t, 'repeat');
    }
    return this._hatchPat;
  }

  updateMinimap(playerPos, yaw, enemies) {
    this._pipPos = playerPos; // read by updateCompass for waypoint bearings
    const ctx = this.mmCtx;
    const W = this.mmSize, H = this.mmSize;
    ctx.setTransform(this.mmDpr, 0, 0, this.mmDpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    this._updateSpots(playerPos, enemies);
    if (!this.mapImage) return;
    // Warm base + hatch beyond the painted map bounds (the opaque map tile
    // covers the in-bounds area when drawn below).
    ctx.fillStyle = '#3a3d36';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = this._hatchPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    const zoom = 0.55; // ~85 m view across the tile
    // Forward-up view bias: the player pivot sits ~35% up from the bottom,
    // spending most of the tile on what's ahead instead of behind.
    const cy = H * 0.65;
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(yaw); // rotate map so the facing direction points up
    ctx.scale(zoom, zoom);
    const px = (playerPos.x + this.halfSize) * this.mapScale;
    const py = (playerPos.z + this.halfSize) * this.mapScale;
    ctx.drawImage(this.mapImage, -px, -py);

    // 25 m range rings centred on the player (rotation-invariant, drawn in
    // map space so they sit under the blips).
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1 / zoom;
    for (let m = 25; m * this.mapScale * zoom < 150; m += 25) {
      ctx.beginPath();
      ctx.arc(0, 0, m * this.mapScale, 0, 7);
      ctx.stroke();
    }

    // Enemy blips (sizes divided by zoom so they hold screen size): each
    // gunshot pops the dot + an expanding ping ring; contacts without UAV
    // coverage decay out over the tail of their 2.2 s memory.
    const nowS = performance.now() * 0.001;
    for (const e of enemies) {
      if (!e.alive) continue;
      const age = nowS - (e.lastShotTime ?? -10);
      const contact = age < 2.2;
      if (!this.uavActive && !contact) continue;
      const ex = (e.pos.x + this.halfSize) * this.mapScale - px;
      const ey = (e.pos.z + this.halfSize) * this.mapScale - py;
      const alpha = this.uavActive ? 1 : Math.max(0, Math.min(1, (2.2 - age) / 0.8));
      const pulse = contact ? Math.max(0, 1 - age / 0.35) : 0;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff5040';
      ctx.beginPath();
      ctx.arc(ex, ey, (2.6 + 1.8 * pulse) / zoom, 0, 7);
      ctx.fill();
      if (contact && age < 0.55) {
        ctx.globalAlpha = alpha * (1 - age / 0.55) * 0.7;
        ctx.strokeStyle = '#ff6a55';
        ctx.lineWidth = 1.2 / zoom;
        ctx.beginPath();
        ctx.arc(ex, ey, (3 + age * 22) / zoom, 0, 7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Airstrike marker
    if (this.strikeMarker) {
      const sx = (this.strikeMarker.x + this.halfSize) * this.mapScale - px;
      const sy = (this.strikeMarker.z + this.halfSize) * this.mapScale - py;
      ctx.strokeStyle = '#ff5040';
      ctx.lineWidth = 1.4 / zoom;
      ctx.beginPath();
      ctx.arc(sx, sy, 5 / zoom, 0, 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 7 / zoom, sy); ctx.lineTo(sx + 7 / zoom, sy);
      ctx.moveTo(sx, sy - 7 / zoom); ctx.lineTo(sx, sy + 7 / zoom);
      ctx.stroke();
    }
    ctx.restore();

    // 55° view cone under the player arrow (facing is always up)
    ctx.save();
    ctx.translate(W / 2, cy);
    const coneHalf = (55 / 2) * (Math.PI / 180);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 68, -Math.PI / 2 - coneHalf, -Math.PI / 2 + coneHalf);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Player arrow (fixed at the biased pivot, pointing up)
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.fillStyle = '#e8f0f2';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Gold "N" stamped at the map's north edge (counter-rotates with yaw)
    const nR = W / 2 - 11;
    const nx = W / 2 + Math.sin(yaw) * nR;
    const ny = H / 2 - Math.cos(yaw) * nR;
    ctx.fillStyle = 'rgba(5, 8, 10, 0.72)';
    ctx.beginPath();
    ctx.arc(nx, ny, 6.5, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#ffc94d';
    ctx.font = "700 9px 'Bahnschrift SemiCondensed', 'Arial Narrow', Inter, Arial, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny + 0.5);

    // UAV sweep flourish (centred on the player pivot)
    if (this.uavActive) {
      ctx.save();
      ctx.translate(W / 2, cy);
      const a = (performance.now() * 0.002) % (Math.PI * 2);
      const grd = ctx.createConicGradient ? ctx.createConicGradient(a, 0, 0) : null;
      if (grd) {
        grd.addColorStop(0, 'rgba(130, 240, 180, 0.22)');
        grd.addColorStop(0.12, 'rgba(130, 240, 180, 0)');
        grd.addColorStop(1, 'rgba(130, 240, 180, 0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* --------------------------- spot diamonds --------------------------- */
  _buildSpotLayer() {
    this.spotLayer = document.createElement('div');
    this.spotLayer.id = 'spot-layer';
    this.el.appendChild(this.spotLayer);
    this._spotEls = [];
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('div');
      d.className = 'spot-diamond';
      d._e = null;
      this.spotLayer.appendChild(d);
      this._spotEls.push(d);
    }
  }

  /** Red diamond over enemies within 60 m near the screen centre. Solid only
   *  with REAL line of sight (enemies.js publishes a raycast hasLOS every
   *  ~100 ms — never painted through cover); targets seen within the last 4 s
   *  but occluded now fade to a 25%-alpha hollow outline instead of popping.
   *  Called per frame from updateMinimap (same cadence, same enemy list). */
  _updateSpots(playerPos, enemies) {
    if (!this.camera) return;
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    const v = this._spotV;
    const now = performance.now() * 0.001;
    const claimed = new Set();
    for (const e of enemies) {
      if (!e.alive) continue;
      const occluded = !e.hasLOS;
      if (occluded && now - (e.spottedT ?? -10) > 4) continue;
      if (e.pos.distanceTo(playerPos) > 60) continue;
      // Anchor at projected head-top + 0.35 m (the CSS margin lifts the box by
      // its own extent so the diamond's BOTTOM TIP sits on this point, clear
      // of the face); skip anything behind the near plane.
      v.set(e.pos.x, e.pos.y + 2.25 - (e.crouch || 0) * 0.45, e.pos.z);
      v.applyMatrix4(this.camera.matrixWorldInverse);
      if (v.z > -0.5) continue;
      v.applyMatrix4(this.camera.projectionMatrix);
      if (Math.abs(v.x) > 0.2 || Math.abs(v.y) > 0.28) continue; // centre window
      let el = this._spotEls.find((d) => d._e === e) ?? this._spotEls.find((d) => !d._e);
      if (!el) continue;
      el._e = e;
      el.style.left = `${((v.x * 0.5 + 0.5) * 100).toFixed(2)}%`;
      el.style.top = `${((-v.y * 0.5 + 0.5) * 100).toFixed(2)}%`;
      el.classList.add('on');
      el.classList.toggle('occ', occluded);
      claimed.add(el);
    }
    for (const el of this._spotEls) {
      if (claimed.has(el)) continue;
      el.classList.remove('on'); // fades in place over 0.15 s
      el.classList.remove('occ');
      el._e = null;
    }
  }

  /* ------------------------------ combat ------------------------------- */
  setAmmo(mag, reserve) {
    this.ammoMag.textContent = mag;
    this.ammoReserve.textContent = reserve;
    this.ammoMag.classList.toggle('low', mag <= 6);
  }
  setWeaponName(name, mode) {
    this.weaponName.textContent = name;
    // Selector microcopy ('AUTO' / 'BURST' / 'SEMI') — glyph pips read as an
    // ellipsis at HUD scale.
    this.fireMode.textContent = mode;
    this.fireMode.setAttribute('data-mode', mode);
    this.fireMode.setAttribute('aria-label', `fire mode: ${mode}`);
  }
  setSpread(spreadRad) {
    // MWII hip cross: 8px gap at rest (rifle hip spread 0.024 rad), hard
    // 24px cap under full move+bloom so a mid-burst cross still reads as
    // a cross instead of four stray ticks.
    const px = Math.min(24, Math.max(3, spreadRad * 500 - 4));
    this.crosshair.style.setProperty('--gap', `${px.toFixed(1)}px`);
  }
  setAds(on) { this.crosshair.classList.toggle('ads', on); }
  flashReloadHint(show) { this.reloadHint.classList.toggle('hidden', !show); }

  showHitmarker(kill, headshot = false) {
    this.hitmarker.classList.remove('fade');
    this.hitmarker.classList.toggle('kill', kill);
    this.hitmarker.classList.add('show');
    clearTimeout(this._hmTimer);
    // ~90 ms hold (kills linger a beat longer), then the CSS fast-fade.
    this._hmTimer = setTimeout(() => {
      this.hitmarker.classList.remove('show');
      this.hitmarker.classList.add('fade');
    }, kill ? 170 : 90);
  }

  /** Persistent bar (visible whenever the HUD is): fill width + low-HP tint,
   *  plus a white flash on the segment the health edge currently sits in. */
  setHealth(frac) {
    const f = Math.max(0, Math.min(1, frac));
    this.healthFill.style.width = `${(f * 100).toFixed(1)}%`;
    this.healthFill.classList.toggle('hurt', f < 0.45);
    // Damage: flash the segment the health edge currently sits in white.
    if (f < this._lastHealthFrac - 0.001 && this.healthFlash) {
      this.healthFlash.style.left = `${Math.min(3, Math.floor(f * 4)) * 25}%`;
      if (this.healthFlash.animate) {
        this.healthFlash.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 240, easing: 'ease-out' });
      }
    }
    this._lastHealthFrac = f;
  }
  setDamageVignette(frac) {
    this.dmgVignette.style.opacity = Math.min(1, frac * 1.35).toFixed(2);
  }
  damageIndicator(angle) {
    const arc = document.createElement('div');
    arc.className = 'dmg-arc';
    arc.style.transform = `rotate(${(angle * 180 / Math.PI).toFixed(1)}deg)`;
    this.dmgIndicators.appendChild(arc);
    setTimeout(() => arc.remove(), 850);
  }
  flashScreen(opacity = 0.5, dur = 300) {
    this.flashOverlay.style.transition = 'none';
    this.flashOverlay.style.opacity = opacity;
    requestAnimationFrame(() => {
      this.flashOverlay.style.transition = `opacity ${dur}ms ease-out`;
      this.flashOverlay.style.opacity = 0;
    });
  }

  killfeed(a, b, system = false, weapon = 'M4A1') {
    const row = document.createElement('div');
    row.className = 'kf-row';
    // Kill rows: killer, small weapon glyph (name kept as tooltip/label),
    // victim. System rows keep the // separator.
    row.innerHTML = system
      ? `<span class="kf-a">${a}</span><span class="kf-w">//</span><span>${b}</span>`
      : `<span class="kf-a">${a}</span><span class="kf-gun" role="img" aria-label="${weapon}" title="${weapon}">${KF_GUN_ICON}</span><span class="kf-b">${b}</span>`;
    this.killfeedEl.prepend(row);
    while (this.killfeedEl.children.length > 5) this.killfeedEl.lastChild.remove();
    setTimeout(() => row.classList.add('fade'), 4200);
    setTimeout(() => row.remove(), 5000);
  }

  scorePopup(points, label = null) {
    const el = document.createElement('div');
    el.className = 'score-pop';
    el.innerHTML = `+${points}${label ? `<span class="sp-label">${label}</span>` : ''}`;
    this.scorePopups.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  centerMessage(text, dur = 2) {
    this.centerMsg.textContent = text;
    this.centerMsg.classList.remove('hidden');
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => this.centerMsg.classList.add('hidden'), dur * 1000);
  }

  waveBanner(title, sub, dur = 2.6) {
    this.waveTitle.textContent = title;
    this.waveSub.textContent = sub;
    this.waveBannerEl.classList.remove('hidden');
    clearTimeout(this._waveTimer);
    this._waveTimer = setTimeout(() => this.waveBannerEl.classList.add('hidden'), dur * 1000);
  }

  setObjective(text) {
    // Split "WAVE n — ..." into a dim wave label + white line, numerals in gold.
    const accent = (s) => s.replace(/(\d+)/g, '<b class="obj-num">$1</b>');
    const m = /^WAVE\s+(\d+)\s*—\s*(.+)$/.exec(text);
    this.objectiveText.innerHTML = m
      ? `<span class="obj-wave">WAVE ${m[1]}</span><span class="obj-main">${accent(m[2])}</span>`
      : `<span class="obj-main">${accent(text)}</span>`;
  }

  /* ---------------------------- killstreaks ---------------------------- */
  _initStreakPips() {
    // Silhouette icon + 36x3 segmented progress bar per row (DOM injected
    // here so index.html stays untouched).
    for (const [el, icon] of [[this.streakUav, 'uav'], [this.streakAir, 'jet']]) {
      const svgWrap = document.createElement('span');
      svgWrap.className = 'streak-svg';
      svgWrap.innerHTML = STREAK_ICONS[icon];
      el.insertBefore(svgWrap, el.querySelector('.streak-icon'));
      const pips = el.querySelector('.streak-pips');
      const need = parseInt(pips.dataset.need, 10);
      pips.innerHTML = Array.from({ length: need }, () => '<i></i>').join('');
    }
  }
  /** Both rows are driven from the same kill counter. A GRANTED/ready streak
   *  snaps its bar full and lights the row gold regardless of the counter
   *  (photo deploys grant an airstrike charge with zero kills); counting rows
   *  show neutral white kills/need segments instead, so the two states can't
   *  be confused (colour split lives in styles.css). A granted airstrike
   *  implies the lower UAV threshold was passed on the same counter, so the
   *  UAV row keeps its earned segments filled (white) rather than reading
   *  0/4 beside a full gold bar. */
  setStreaks(kills, uavReady, airReady) {
    const apply = (el, ready, count) => {
      const pips = el.querySelector('.streak-pips');
      const need = parseInt(pips.dataset.need, 10);
      const fill = ready ? need : Math.min(count, need);
      [...pips.children].forEach((seg, i) => seg.classList.toggle('on', i < fill));
      el.classList.toggle('ready', ready);
    };
    apply(this.streakUav, uavReady, airReady ? Infinity : kills);
    apply(this.streakAir, airReady, kills);
  }
}
