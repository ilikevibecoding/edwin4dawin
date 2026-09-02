import { HALF, MAP_SIZE, WEAPONS, CONSUMABLES, TOTAL_PLAYERS, MATERIALS } from './config.js';
import { clamp } from './utils.js';
import { drawTownLabels } from './world.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = {
      hud: $('hud'),
      health: $('health-fill'),
      healthText: $('health-text'),
      shield: $('shield-fill'),
      shieldText: $('shield-text'),
      wood: $('mat-wood'),
      brick: $('mat-brick'),
      metal: $('mat-metal'),
      weaponName: $('weapon-name'),
      ammoMag: $('ammo-mag'),
      ammoReserve: $('ammo-reserve'),
      ammoCount: $('ammo-count'),
      inventory: $('inventory'),
      players: $('players-left'),
      kills: $('kills'),
      storm: $('storm-status'),
      minimap: $('minimap'),
      bigmap: $('bigmap'),
      bigmapCanvas: $('bigmap-canvas'),
      killfeed: $('killfeed'),
      announce: $('announce'),
      prompt: $('prompt'),
      action: $('action-status'),
      actionLabel: $('action-label'),
      actionFill: $('action-fill'),
      buildPanel: $('build-panel'),
      buildMat: $('build-mat'),
      crosshair: $('crosshair'),
      dmgOverlay: $('damage-overlay'),
      stormOverlay: $('storm-overlay'),
      dropInfo: $('drop-info'),
      altitude: $('altitude'),
      menu: $('menu'),
      pause: $('pause'),
      gameover: $('gameover'),
      resultTitle: $('result-title'),
      resultSub: $('result-sub'),
      resultStats: $('result-stats'),
      dropMap: $('drop-map'),
    };
    this.mm = this.el.minimap.getContext('2d', { willReadFrequently: true });
    this.bm = this.el.bigmapCanvas.getContext('2d', { willReadFrequently: true });
    this.slotEls = [];
    for (let i = -1; i < 5; i++) {
      const s = document.createElement('div');
      s.className = 'slot';
      s.innerHTML = `<span class="key">${i + 2}</span><div class="body"></div>`;
      this.el.inventory.appendChild(s);
      this.slotEls.push(s);
    }
    this.lastInvVersion = -1;
    this.lastActive = null;
    this.announceTimer = 0;
    this.toastTimer = 0;
    this.feedItems = [];
    this.matPulse = { wood: 0, brick: 0, metal: 0 };
    this.mapVisible = false;
    this.dropPoint = null;
    this._sigCache = '';
  }

  show() {
    this.el.hud.classList.remove('hidden');
  }

  hide() {
    this.el.hud.classList.add('hidden');
  }

  // ---------- messages ----------

  killFeed(text, cls = '') {
    const item = document.createElement('div');
    item.className = `feed-item ${cls}`;
    item.textContent = text;
    this.el.killfeed.appendChild(item);
    this.feedItems.push({ el: item, t: 6 });
    while (this.feedItems.length > 6) this.feedItems.shift().el.remove();
  }

  announce(text, sub = '', duration = 2.5) {
    this.el.announce.innerHTML = `${text}${sub ? `<span class="sub">${sub}</span>` : ''}`;
    this.el.announce.classList.add('show');
    this.announceTimer = duration;
  }

  toast(text) {
    this.el.prompt.innerHTML = text;
    this.el.prompt.classList.remove('hidden');
    this.toastTimer = 1.2;
  }

  flashDamage() {
    this.el.dmgOverlay.style.opacity = '1';
    clearTimeout(this._dmgTimer);
    this._dmgTimer = setTimeout(() => {
      this.el.dmgOverlay.style.opacity = '0';
    }, 120);
  }

  pulseMat(m) {
    this.matPulse[m] = 0.3;
  }

  // ---------- per-frame ----------

  update(dt) {
    const game = this.game;
    const p = game.player;
    const e = this.el;

    e.health.style.width = `${clamp(p.hp, 0, 100)}%`;
    e.healthText.textContent = Math.ceil(p.hp);
    e.shield.style.width = `${clamp(p.shield, 0, 100)}%`;
    e.shieldText.textContent = Math.ceil(p.shield);

    for (const m of ['wood', 'brick', 'metal']) {
      e[m].textContent = p.mats[m];
      if (this.matPulse[m] > 0) {
        this.matPulse[m] -= dt;
        e[m].parentElement.style.transform = `scale(${1 + this.matPulse[m] * 0.8})`;
      } else {
        e[m].parentElement.style.transform = '';
      }
    }

    e.players.textContent = game.bots.aliveCount + (p.alive ? 1 : 0);
    e.kills.textContent = p.kills;
    e.storm.textContent = game.storm.statusText();
    e.storm.classList.toggle('warn', game.storm.shrinking || p.inStorm);
    e.stormOverlay.style.opacity = p.inStorm ? '1' : '0';

    // weapon / ammo
    const item = p.activeItem;
    if (p.mode === 'build') {
      e.weaponName.textContent = `BUILD: ${p.buildPiece.toUpperCase()}`;
      e.ammoMag.textContent = p.mats[p.buildMat];
      e.ammoReserve.textContent = '10';
    } else if (!item) {
      e.weaponName.textContent = 'PICKAXE';
      e.ammoMag.textContent = '-';
      e.ammoReserve.textContent = '-';
    } else if (item.kind === 'weapon') {
      const def = WEAPONS[item.type];
      e.weaponName.textContent = `${item.rarity.toUpperCase()} ${def.name.toUpperCase()}`;
      e.ammoMag.textContent = item.mag;
      e.ammoReserve.textContent = p.ammo[def.ammo];
    } else {
      e.weaponName.textContent = CONSUMABLES[item.type].name.toUpperCase();
      e.ammoMag.textContent = item.count;
      e.ammoReserve.textContent = CONSUMABLES[item.type].stack;
    }

    // inventory slots
    const sig = `${p.inventoryVersion}|${p.active}|${p.mode}`;
    if (sig !== this._sigCache) {
      this._sigCache = sig;
      this.renderSlots(p);
    }

    // build panel
    const building = p.mode === 'build';
    e.buildPanel.classList.toggle('hidden', !building);
    e.crosshair.classList.toggle('build', building);
    if (building) {
      for (const pieceEl of e.buildPanel.querySelectorAll('.piece')) {
        pieceEl.classList.toggle('active', pieceEl.dataset.piece === p.buildPiece);
      }
      e.buildMat.textContent = MATERIALS[p.buildMat].name.toUpperCase();
      const matEl = e.buildPanel.querySelector('.mat');
      matEl.className = `mat ${p.buildMat}`;
    }

    // action bar (reload / consumable)
    if (p.reload) {
      e.action.classList.remove('hidden');
      e.actionLabel.textContent = 'RELOADING';
      e.actionFill.style.width = `${(p.reload.timer / p.reload.duration) * 100}%`;
    } else if (p.using) {
      e.action.classList.remove('hidden');
      e.actionLabel.textContent = `USING ${CONSUMABLES[p.using.item.type].name.toUpperCase()}`;
      e.actionFill.style.width = `${(p.using.timer / p.using.duration) * 100}%`;
    } else {
      e.action.classList.add('hidden');
    }

    // interaction prompt
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) e.prompt.classList.add('hidden');
    } else if (p.alive && p.phase === 'ground' && p.mode !== 'build') {
      const c = game.loot.nearestContainer(p.pos);
      if (c) {
        e.prompt.innerHTML = `<b>E</b> Open ${c.kind === 'chest' ? 'Chest' : 'Ammo Box'}`;
        e.prompt.classList.remove('hidden');
      } else {
        const pk = game.loot.nearestWeaponPickup(p.pos);
        if (pk && p.slots.indexOf(null) < 0) {
          const cur = p.activeItem;
          e.prompt.innerHTML = `<b>E</b> Swap ${cur ? cur.name : 'slot'} for ${pk.item.rarity} ${pk.item.name}`;
          e.prompt.classList.remove('hidden');
        } else {
          e.prompt.classList.add('hidden');
        }
      }
    } else {
      e.prompt.classList.add('hidden');
    }

    // announcements
    if (this.announceTimer > 0) {
      this.announceTimer -= dt;
      if (this.announceTimer <= 0) e.announce.classList.remove('show');
    }
    for (let i = this.feedItems.length - 1; i >= 0; i--) {
      const f = this.feedItems[i];
      f.t -= dt;
      if (f.t <= 0) {
        f.el.remove();
        this.feedItems.splice(i, 1);
      } else if (f.t < 1) {
        f.el.style.opacity = `${f.t}`;
      }
    }

    // drop info
    const dropping = p.phase !== 'ground';
    e.dropInfo.classList.toggle('hidden', !dropping);
    if (dropping) {
      const ground = game.world.heightAt(p.pos.x, p.pos.z);
      e.altitude.textContent = Math.max(0, Math.round(p.pos.y - ground));
    }

    this.drawMinimap();
    if (this.mapVisible) this.drawBigMap();
  }

  renderSlots(p) {
    for (let i = 0; i < 6; i++) {
      const idx = i - 1;
      const el = this.slotEls[i];
      const body = el.querySelector('.body');
      el.className = 'slot';
      if (idx === p.active && p.mode !== 'build') el.classList.add('active');
      if (idx === -1) {
        body.innerHTML = '<div class="icon pickaxe"></div><div>PICKAXE</div>';
        continue;
      }
      const item = p.slots[idx];
      if (!item) {
        body.innerHTML = '';
        continue;
      }
      if (item.kind === 'weapon') {
        el.classList.add(`r-${item.rarity}`);
        body.innerHTML = `<div class="icon ${item.type}"></div><div>${WEAPONS[item.type].name}</div><span class="count">${item.mag}</span>`;
      } else {
        el.classList.add(`r-${item.rarity}`);
        const def = CONSUMABLES[item.type];
        const color = `#${def.color.toString(16).padStart(6, '0')}`;
        body.innerHTML = `<div class="icon consumable" style="background:${color}"></div><div>${def.name}</div><span class="count">x${item.count}</span>`;
      }
    }
  }

  // ---------- maps ----------

  drawStormOn(ctx, toX, toY, scale, storm, lineWidth = 2) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(toX(storm.center.x), toY(storm.center.y), Math.max(0.1, storm.radius * scale), 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(150, 60, 220, 0.45)';
    ctx.fill('evenodd');
    ctx.restore();
    ctx.beginPath();
    ctx.arc(toX(storm.center.x), toY(storm.center.y), Math.max(0.1, storm.radius * scale), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(220, 150, 255, 0.95)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    if (!storm.finished) {
      ctx.beginPath();
      ctx.arc(toX(storm.nextCenter.x), toY(storm.nextCenter.y), Math.max(0.1, storm.nextRadius * scale), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  drawPlayerArrow(ctx, x, y, yaw, size = 7) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-yaw);
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.4);
    ctx.lineTo(size, size);
    ctx.lineTo(0, size * 0.4);
    ctx.lineTo(-size, size);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawMinimap() {
    const game = this.game;
    const p = game.player;
    const ctx = this.mm;
    const size = this.el.minimap.width;
    const range = p.phase !== 'ground' ? 260 : 110; // world units shown across half the minimap
    const scale = size / 2 / range;
    const img = game.mapImage;
    const imgScale = img.width / MAP_SIZE;
    ctx.fillStyle = '#123';
    ctx.fillRect(0, 0, size, size);
    const sx = (p.pos.x + HALF - range) * imgScale;
    const sy = (p.pos.z + HALF - range) * imgScale;
    const sw = range * 2 * imgScale;
    ctx.drawImage(img, sx, sy, sw, sw, 0, 0, size, size);
    const toX = (x) => (x - p.pos.x) * scale + size / 2;
    const toY = (z) => (z - p.pos.z) * scale + size / 2;
    drawTownLabels(ctx, game.towns, toX, toY, 10, -30 * scale);
    this.drawStormOn(ctx, toX, toY, scale, game.storm);
    if (this.dropPoint && p.phase !== 'ground') {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(toX(this.dropPoint.x), toY(this.dropPoint.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of game.bots.recentShooters(game.time)) {
      const x = toX(b.pos.x);
      const y = toY(b.pos.z);
      if (x < 0 || y < 0 || x > size || y > size) continue;
      ctx.fillStyle = 'rgba(255,70,70,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawPlayerArrow(ctx, size / 2, size / 2, p.yaw);
    // compass N
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', size / 2, 12);
  }

  drawBigMap() {
    const game = this.game;
    const p = game.player;
    const ctx = this.bm;
    const size = this.el.bigmapCanvas.width;
    const scale = size / MAP_SIZE;
    ctx.drawImage(game.mapImage, 0, 0, size, size);
    const toX = (x) => (x + HALF) * scale;
    const toY = (z) => (z + HALF) * scale;
    drawTownLabels(ctx, game.towns, toX, toY, 13, -50 * scale);
    this.drawStormOn(ctx, toX, toY, scale, game.storm, 3.5);
    if (this.dropPoint && p.phase !== 'ground') {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(toX(this.dropPoint.x), toY(this.dropPoint.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawPlayerArrow(ctx, toX(p.pos.x), toY(p.pos.z), p.yaw, 6);
  }

  toggleBigMap(force) {
    this.mapVisible = force !== undefined ? force : !this.mapVisible;
    this.el.bigmap.classList.toggle('hidden', !this.mapVisible);
    if (this.mapVisible) this.drawBigMap();
  }

  /** Menu map used to choose the drop point. */
  setupDropMap(onPick) {
    const c = this.el.dropMap;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const draw = () => {
      ctx.drawImage(this.game.mapImage, 0, 0, c.width, c.height);
      const s = c.width / MAP_SIZE;
      drawTownLabels(ctx, this.game.towns, (x) => (x + HALF) * s, (z) => (z + HALF) * s, 10, -50 * s);
      if (this.dropPoint) {
        const x = ((this.dropPoint.x + HALF) / MAP_SIZE) * c.width;
        const y = ((this.dropPoint.z + HALF) / MAP_SIZE) * c.height;
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 14, y);
        ctx.lineTo(x + 14, y);
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x, y + 14);
        ctx.stroke();
      }
    };
    c.addEventListener('click', (ev) => {
      const r = c.getBoundingClientRect();
      const u = (ev.clientX - r.left) / r.width;
      const v = (ev.clientY - r.top) / r.height;
      this.dropPoint = { x: clamp(u * MAP_SIZE - HALF, -HALF + 20, HALF - 20), z: clamp(v * MAP_SIZE - HALF, -HALF + 20, HALF - 20) };
      draw();
      if (onPick) onPick(this.dropPoint);
    });
    draw();
    this.redrawDropMap = draw;
  }

  showGameOver(victory, placement, stats) {
    const e = this.el;
    e.gameover.classList.remove('hidden');
    e.resultTitle.textContent = victory ? 'VICTORY' : 'ELIMINATED';
    e.resultTitle.classList.toggle('defeat', !victory);
    e.resultSub.textContent = victory
      ? `You are the last one standing out of ${TOTAL_PLAYERS} players.`
      : `You placed #${placement} of ${TOTAL_PLAYERS}${stats.killer ? ` — eliminated by ${stats.killer}` : ''}`;
    e.resultStats.innerHTML = `
      <div class="stat"><span class="label">ELIMS</span><span>${stats.kills}</span></div>
      <div class="stat"><span class="label">DAMAGE</span><span>${Math.round(stats.damage)}</span></div>
      <div class="stat"><span class="label">BUILT</span><span>${stats.built}</span></div>
      <div class="stat"><span class="label">SURVIVED</span><span>${stats.time}</span></div>`;
  }
}
