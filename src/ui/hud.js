/** DOM-based HUD controller: compass, minimap, ammo, health, killfeed,
 *  hitmarkers, damage indicators, killstreak widget, banners. */
export class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    this.compassTape = document.getElementById('compass-tape');
    this.mmCanvas = document.getElementById('minimap-canvas');
    this.mmCtx = this.mmCanvas.getContext('2d');
    this.crosshair = document.getElementById('crosshair');
    this.hitmarker = document.getElementById('hitmarker');
    this.ammoMag = document.getElementById('ammo-mag');
    this.ammoReserve = document.getElementById('ammo-reserve');
    this.weaponName = document.getElementById('weapon-name');
    this.fireMode = document.getElementById('fire-mode');
    this.reloadHint = document.getElementById('reload-hint');
    this.healthFill = document.getElementById('health-fill');
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

    this._hmTimer = null;
    this._msgTimer = null;
    this._waveTimer = null;
    this._buildCompass();
    this._initStreakPips();
    this.mapImage = null;
    this.mapScale = 1;
    this.halfSize = 70;
    this.uavActive = false;
    this.strikeMarker = null;
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); }

  /* ------------------------------ compass ------------------------------ */
  _buildCompass() {
    const marks = [];
    const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    // 3 copies for wrapping
    for (let rep = -1; rep <= 1; rep++) {
      for (let deg = 0; deg < 360; deg += 15) {
        const total = rep * 360 + deg;
        if (labels[deg] !== undefined) {
          marks.push(`<span class="c-mark" data-deg="${total}" style="left:0">${labels[deg]}</span>`);
        } else {
          marks.push(`<span class="c-tick" data-deg="${total}" style="left:0"></span>`);
        }
      }
    }
    this.compassTape.innerHTML = marks.join('');
    this._compassMarks = [...this.compassTape.children];
  }

  updateCompass(yaw) {
    const degPerPx = 2.4;
    const heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
    const cx = 170; // half of 340 container
    for (const m of this._compassMarks) {
      const deg = parseFloat(m.dataset.deg);
      let rel = deg - heading;
      while (rel > 180 + 360) rel -= 360 * 3;
      const x = cx + rel * degPerPx;
      m.style.transform = `translateX(${x.toFixed(1)}px)`;
      m.style.left = '0px';
    }
  }

  /* ------------------------------ minimap ------------------------------ */
  buildMinimap(shapes, halfSize) {
    this.halfSize = halfSize;
    const size = 560;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#232e33';
    ctx.fillRect(0, 0, size, size);
    const S = halfSize;
    const toX = (x) => ((x + S) / (2 * S)) * size;
    const toY = (z) => ((z + S) / (2 * S)) * size;
    for (const s of shapes) {
      if (s.type !== 'road') continue;
      ctx.fillStyle = '#39464d';
      ctx.fillRect(toX(s.x - s.w / 2), toY(s.z - s.d / 2), (s.w / (2 * S)) * size, (s.d / (2 * S)) * size);
    }
    for (const s of shapes) {
      if (s.type === 'road') continue;
      ctx.fillStyle = s.type === 'b' ? '#5d6f78' : '#4a5a62';
      ctx.fillRect(toX(s.x - s.w / 2), toY(s.z - s.d / 2), Math.max(3, (s.w / (2 * S)) * size), Math.max(3, (s.d / (2 * S)) * size));
    }
    this.mapImage = c;
    this.mapScale = size / (2 * S);
  }

  updateMinimap(playerPos, yaw, enemies) {
    const ctx = this.mmCtx;
    const W = this.mmCanvas.width, H = this.mmCanvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!this.mapImage) return;
    const zoom = 1.15; // display zoom
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(yaw); // rotate map so the facing direction points up
    ctx.scale(zoom, zoom);
    const px = (playerPos.x + this.halfSize) * this.mapScale;
    const py = (playerPos.z + this.halfSize) * this.mapScale;
    ctx.drawImage(this.mapImage, -px, -py);

    // Enemy blips
    for (const e of enemies) {
      if (!e.alive) continue;
      const show = this.uavActive || (performance.now() * 0.001 - (e.lastShotTime ?? -10) < 2.2);
      if (!show) continue;
      const ex = (e.pos.x + this.halfSize) * this.mapScale - px;
      const ey = (e.pos.z + this.halfSize) * this.mapScale - py;
      ctx.fillStyle = '#ff5040';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.6, 0, 7);
      ctx.fill();
    }
    // Airstrike marker
    if (this.strikeMarker) {
      const sx = (this.strikeMarker.x + this.halfSize) * this.mapScale - px;
      const sy = (this.strikeMarker.z + this.halfSize) * this.mapScale - py;
      ctx.strokeStyle = '#ff5040';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy); ctx.lineTo(sx + 7, sy);
      ctx.moveTo(sx, sy - 7); ctx.lineTo(sx, sy + 7);
      ctx.stroke();
    }
    ctx.restore();

    // Player arrow (always centered, pointing up)
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.fillStyle = '#e8f0f2';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // UAV sweep flourish
    if (this.uavActive) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
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

  /* ------------------------------ combat ------------------------------- */
  setAmmo(mag, reserve) {
    this.ammoMag.textContent = mag;
    this.ammoReserve.textContent = reserve;
    this.ammoMag.classList.toggle('low', mag <= 6);
  }
  setWeaponName(name, mode) {
    this.weaponName.textContent = name;
    this.fireMode.textContent = mode;
  }
  setSpread(spreadRad) {
    const px = 6 + spreadRad * 950;
    this.crosshair.style.setProperty('--gap', `${px.toFixed(1)}px`);
  }
  setAds(on) { this.crosshair.classList.toggle('ads', on); }
  flashReloadHint(show) { this.reloadHint.classList.toggle('hidden', !show); }

  showHitmarker(kill) {
    this.hitmarker.classList.remove('fade');
    this.hitmarker.classList.toggle('kill', kill);
    this.hitmarker.classList.add('show');
    clearTimeout(this._hmTimer);
    this._hmTimer = setTimeout(() => {
      this.hitmarker.classList.remove('show');
      this.hitmarker.classList.add('fade');
    }, kill ? 190 : 90);
  }

  setHealth(frac) {
    this.healthFill.style.width = `${Math.max(0, frac * 100).toFixed(1)}%`;
    this.healthFill.classList.toggle('hurt', frac < 0.45);
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
    row.innerHTML = system
      ? `<span class="kf-a">${a}</span><span class="kf-w">//</span><span>${b}</span>`
      : `<span class="kf-a">${a}</span><span class="kf-w">[${weapon}]</span><span class="kf-b">${b}</span>`;
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

  setObjective(text) { this.objectiveText.textContent = text; }

  /* ---------------------------- killstreaks ---------------------------- */
  _initStreakPips() {
    for (const el of [this.streakUav, this.streakAir]) {
      const pips = el.querySelector('.streak-pips');
      const need = parseInt(pips.dataset.need, 10);
      pips.innerHTML = Array.from({ length: need }, () => '<i></i>').join('');
    }
  }
  setStreaks(kills, uavReady, airReady) {
    const fill = (el, ready) => {
      const pips = el.querySelector('.streak-pips');
      const need = parseInt(pips.dataset.need, 10);
      [...pips.children].forEach((pip, i) => pip.classList.toggle('on', ready || i < (kills % 100) && i < kills));
      el.classList.toggle('ready', ready);
    };
    // For pips: show progress toward each
    const uavPips = this.streakUav.querySelector('.streak-pips');
    [...uavPips.children].forEach((pip, i) => pip.classList.toggle('on', uavReady || i < kills));
    this.streakUav.classList.toggle('ready', uavReady);
    const airPips = this.streakAir.querySelector('.streak-pips');
    [...airPips.children].forEach((pip, i) => pip.classList.toggle('on', airReady || i < kills));
    this.streakAir.classList.toggle('ready', airReady);
    void fill;
  }
}
