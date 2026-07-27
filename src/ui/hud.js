import * as THREE from 'three';
import { ensureStyles } from './styles.js';
import { icons } from './icons.js';
import { Minimap } from './minimap.js';

/** Thin radial ring for a killstreak slot: faint track + optional gold progress arc. */
const KS_C = Math.round(2 * Math.PI * 17.5 * 10) / 10; // circumference for r=17.5
function ksRing(withProgress) {
  return `<svg class="ring" width="38" height="38" viewBox="0 0 38 38">
    <circle class="track" cx="19" cy="19" r="17.5" fill="none" stroke-width="1.5"/>
    ${withProgress ? `<circle class="prog" cx="19" cy="19" r="17.5" fill="none" stroke-width="2"
      stroke-dasharray="${KS_C}" stroke-dashoffset="${KS_C}" stroke-linecap="round"
      transform="rotate(-90 19 19)"/>` : ''}
  </svg>`;
}

/**
 * MW2019-style DOM/canvas HUD.
 * Public contract (used by main.js / airstrike.js): hide(), show(), update(dt), message(text, sub).
 *
 * Dev/demo:  ?uidemo=hud-<state> forces HUD states for screenshots (pair with a harness pose):
 *   hud-combat | hud-damage | hud-reload | hud-scoreboard | hud-kia | hud-streak | hud-sprint | hud-objective
 */
export class HUD {
  constructor(game) {
    this.game = game;
    ensureStyles();

    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="desat"></div>
      <div class="dmgvig"></div>
      <div class="lowvig"><i></i></div>
      <div class="sprintfx"><i class="l"></i><i class="r"></i></div>
      <canvas class="dmgring" width="760" height="760"></canvas>

      <div class="xhair"><span class="t"></span><span class="b"></span><span class="l"></span><span class="r"></span><span class="dot"></span></div>
      <div class="hitwrap"></div>
      <div class="pops"></div>

      <div class="mm">
        <div class="frame"><canvas width="452" height="308"></canvas></div>
        <div class="foot"><span>GRID <b class="gref">--</b></span></div>
      </div>

      <div class="compass"><canvas width="960" height="116"></canvas></div>
      <div class="objective"><span class="t">ELIMINATE HOSTILE FORCES</span><span class="s">WEAPONS FREE</span></div>
      <div class="killfeed"></div>

      <div class="msg"><div class="inner"><div class="rule"></div><div class="big"></div><div class="sub"></div></div></div>

      <div class="hp">
        <div class="stance">${icons.stand(15, 'st-stand', 22)}${icons.crouch(20, 'st-crouch', 22)}${icons.slide(24, 'st-slide', 22)}</div>
        <div class="segs">${'<i><b></b></i>'.repeat(12)}</div>
      </div>

      <div class="ammo">
        <div class="ks">
          <div class="slot" data-ks="uav">${icons.uav(19, 'icon')}${ksRing(false)}<span class="lockb">${icons.lock(7)}</span></div>
          <div class="slot armed" data-ks="strike">${icons.jet(20, 'icon')}${ksRing(true)}<span class="badge">1</span><span class="khint">4</span></div>
          <div class="slot" data-ks="heli">${icons.heli(20, 'icon')}${ksRing(false)}<span class="lockb">${icons.lock(7)}</span></div>
        </div>
        <div class="wline"><span class="fmode">AUTO</span><span class="wname">M4A1</span></div>
        <div class="arow">
          <div class="nades">${icons.frag(13)}<span class="cnt">4</span><span class="key">G</span></div>
          <div class="magrow"><span class="mag num">30</span><span class="div"></span><span class="reserve num">180</span></div>
        </div>
        <div class="reload"><span class="lbl">RELOADING</span><span class="track"></span><span class="fill"></span></div>
      </div>

      <div class="sb">
        <div class="head"><span class="t">OPERATION BLACKSITE</span><span class="m">TEAM DEATHMATCH · <b class="tm">00:00</b></span></div>
        <table>
          <tr><th>OPERATOR</th><th>KILLS</th><th>DEATHS</th><th>K/D</th><th>STREAK</th><th>SCORE</th></tr>
          <tr><td>YOU</td><td class="v-k">0</td><td class="v-d">0</td><td class="v-kd">0.0</td><td class="v-st">0</td><td class="v-sc">0</td></tr>
        </table>
        <div class="foot"><span>URBAN SECTOR // BLACKSITE</span><span>HOLD [TAB]</span></div>
      </div>

      <div class="kia"><div class="flash"></div><div class="big">K.I.A.</div><div class="sub">REDEPLOY IN <b class="cnt">3.0</b></div></div>
      <div class="blackfade"></div>
    `;
    document.body.appendChild(el);
    this.el = el;
    this.$ = (s) => el.querySelector(s);

    this.minimap = new Minimap(game, this.$('.mm canvas'));
    this.compassCtx = this.$('.compass canvas').getContext('2d');
    this.ringCtx = this.$('.dmgring').getContext('2d');

    // state
    this.dmgT = 0;
    this.arcs = [];           // { dir: Vector3|null, t }
    this.msgT = 0;
    this.feed = [];           // { el, t }
    this.objT = 0;
    this.popSlot = 0;
    this.hpShowT = 0;
    this._lastHealth = 100;
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();

    const q = new URLSearchParams(location.search);
    const ud = q.get('uidemo') || '';
    this.demo = ud.startsWith('hud-') ? ud.slice(4) : null;
    this._demoInit = false;

    // ---- events -------------------------------------------------------------
    const { events } = game;
    events.on('ui:hitmarker', ({ headshot, kill }) => this.spawnHit(!!(headshot || kill)));
    events.on('kill', ({ headshot, cause }) => {
      let pts = headshot ? 150 : 100;
      if (cause === 'airstrike') pts += 25;
      const suffix = headshot ? 'HEADSHOT' : cause === 'airstrike' ? 'AIRSTRIKE' : '';
      this.spawnPop(`+${pts}`, suffix, !!suffix);
    });
    events.on('enemy:death', ({ headshot, cause }) => this.addFeed(cause, headshot));
    events.on('enemy:fire', ({ position }) => this.minimap.ping(position));
    events.on('player:damage', ({ amount, direction }) => {
      this.dmgT = Math.min(1, this.dmgT + (amount ?? 20) / 55);
      this.arcs.push({ dir: direction ? direction.clone().normalize() : null, t: 1 });
      if (this.arcs.length > 8) this.arcs.shift();
    });
    events.on('player:death', () => this._kia(true));
    events.on('player:respawn', () => { this._kia(false); this._respawnFade(); });
    events.on('ui:message', ({ text, sub }) => this.message(text, sub));
    events.on('game:start', () => { this.objT = 6.5; });
    events.on('weapon:switch', () => {
      const w = this.$('.wline .wname');
      w.classList.remove('switch'); void w.offsetWidth; w.classList.add('switch');
    });
  }

  // ---------------- feed / popups / hitmarkers ----------------
  addFeed(cause, headshot) {
    const weaponIcon =
      cause === 'airstrike' ? icons.jet(17) :
      cause === 'grenade' ? icons.frag(11) :
      this.game.weapons.def.type === 'pistol' ? icons.pistol(22) : icons.rifle(30);
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="you">YOU</span>${weaponIcon}${headshot ? icons.skull(14, 'hs') : ''}<span class="them">HOSTILE</span>`;
    const holder = this.$('.killfeed');
    holder.prepend(row);
    this.feed.unshift({ el: row, t: 5 });
    while (this.feed.length > 5) this.feed.pop().el.remove();
  }

  spawnHit(red, freezeAt = 0) {
    const d = document.createElement('div');
    d.className = 'hm' + (red ? ' red' : '');
    d.style.setProperty('--jit', `${(Math.random() * 16 - 8).toFixed(1)}deg`);
    d.innerHTML = '<span class="a"></span><span class="b"></span><span class="c"></span><span class="d"></span>';
    if (freezeAt > 0) {
      d.style.animationDelay = `-${freezeAt}s`;
      d.style.animationPlayState = 'paused';
    } else {
      d.addEventListener('animationend', () => d.remove());
      setTimeout(() => d.remove(), 500);
    }
    this.$('.hitwrap').appendChild(d);
    return d;
  }

  spawnPop(text, suffix = '', gold = false, freezeAt = 0) {
    const p = document.createElement('div');
    p.className = 'pop' + (gold ? ' gold' : '');
    p.textContent = text;
    if (suffix) p.innerHTML = `${text}<small>${suffix}</small>`;
    p.style.top = `${(this.popSlot++ % 3) * 22}px`;
    if (freezeAt > 0) {
      p.style.animationDelay = `-${freezeAt}s`;
      p.style.animationPlayState = 'paused';
    } else {
      p.addEventListener('animationend', () => p.remove());
      setTimeout(() => p.remove(), 1000);
    }
    this.$('.pops').appendChild(p);
    return p;
  }

  message(text, sub = '') {
    const gold = /AIRSTRIKE|READY|VICTORY/i.test(text);
    const big = this.$('.msg .big');
    big.textContent = text;
    big.style.color = gold ? 'var(--gold)' : 'var(--txt)';
    this.$('.msg .sub').textContent = sub;
    const inner = this.$('.msg .inner');
    inner.classList.remove('on'); void inner.offsetWidth; inner.classList.add('on');
    this.msgT = 2.9;
  }

  _kia(on) {
    this.$('.kia').classList.toggle('on', on);
  }

  _respawnFade() {
    const f = this.$('.blackfade');
    f.classList.remove('fading');
    f.style.opacity = '1';
    void f.offsetWidth;
    f.classList.add('fading');
    f.style.opacity = '0';
    setTimeout(() => f.classList.remove('fading'), 700);
  }

  hide() { this.el.classList.add('hidden'); }
  show() { this.el.classList.remove('hidden'); }

  // ---------------- frame update ----------------
  update(dt) {
    const { player, weapons, state, input, airstrike } = this.game;

    // view-model: everything the DOM shows, so demo mode can override cleanly
    const v = {
      health: player.health, maxHealth: player.maxHealth, alive: player.alive,
      mag: weapons.slot.mag, reserve: weapons.slot.reserve,
      reloading: weapons.slot.reloading, reloadTime: weapons.def.reloadTime,
      wname: weapons.def.name, auto: weapons.def.auto, grenades: weapons.grenades,
      kills: state.kills, deaths: state.deaths, score: state.score,
      streak: state.streak, cost: state.airstrikeCost, available: airstrike.available,
      time: this.game.time, respawnT: Math.max(0, state.respawnT),
      sprint: (player.sprinting || player.sliding) && player.moveSpeed01 > 0.4,
      scoreboard: input.down('Tab') && player.alive,
      stance: player.sliding ? 'slide' : player.crouching ? 'crouch' : 'stand',
    };
    if (this.demo) this._applyDemo(v, dt);
    this.el.classList.toggle('dead', !v.alive);

    // timers
    this.dmgT = Math.max(0, this.dmgT - dt * 1.4);
    this.msgT = Math.max(0, this.msgT - dt);
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].t -= dt * 1.1;
      if (this.arcs[i].t <= 0) this.arcs.splice(i, 1);
    }
    let dirty = false;
    for (let i = this.feed.length - 1; i >= 0; i--) {
      const f = this.feed[i];
      f.t -= dt;
      if (f.t < 0.35) f.el.classList.add('dying');
      if (f.t <= 0) { f.el.remove(); this.feed.splice(i, 1); dirty = true; }
    }

    // ---- ammo cluster ----
    this.$('.magrow .mag').textContent = v.mag;
    this.$('.magrow .mag').classList.toggle('empty', v.mag === 0);
    this.$('.magrow .reserve').textContent = v.reserve;
    this.$('.wline .wname').textContent = v.wname;
    this.$('.wline .fmode').textContent = v.auto ? 'AUTO' : 'SEMI';
    this.$('.nades .cnt').textContent = `\u00d7${v.grenades}`;
    const rl = this.$('.reload');
    if (v.reloading > 0) {
      rl.classList.add('on');
      const p = 1 - v.reloading / v.reloadTime;
      rl.querySelector('.fill').style.width = `${(p * 168).toFixed(1)}px`;
    } else rl.classList.remove('on');

    // ---- killstreak slots ----
    const slot = this.$('.ks .slot[data-ks="strike"]');
    const ring = slot.querySelector('.ring .prog');
    const p = Math.min(1, v.streak / v.cost);
    ring.style.strokeDashoffset = (KS_C * (1 - (v.available > 0 ? 1 : p))).toFixed(1);
    slot.classList.toggle('ready', v.available > 0);
    slot.querySelector('.badge').textContent = v.available;

    // ---- health ----
    const hp = this.$('.hp');
    if (v.health < this._lastHealth - 0.01) this.hpShowT = 4;
    this._lastHealth = v.health;
    this.hpShowT = Math.max(0, this.hpShowT - dt);
    const hpVisible = v.alive && (v.health < v.maxHealth - 0.5 || this.hpShowT > 0);
    hp.classList.toggle('show', hpVisible);
    hp.classList.toggle('low', v.health < 40);
    const frac = Math.max(0, v.health / v.maxHealth) * 12;
    const segs = hp.querySelectorAll('.segs b');
    for (let i = 0; i < 12; i++) {
      const f = Math.max(0, Math.min(1, frac - i));
      segs[i].style.transform = `scaleX(${f.toFixed(3)})`;
    }
    this.$('.hp .st-stand').classList.toggle('on', v.stance === 'stand');
    this.$('.hp .st-crouch').classList.toggle('on', v.stance === 'crouch');
    this.$('.hp .st-slide').classList.toggle('on', v.stance === 'slide');

    // ---- overlays ----
    this.$('.dmgvig').style.opacity = (this.dmgT * 0.95).toFixed(3);
    const low = v.alive && v.health < 45 ? 1 - v.health / 45 : 0;
    this.$('.lowvig').style.opacity = (low * 0.95).toFixed(3);
    this.$('.desat').style.opacity = (low * 0.5).toFixed(3);
    this.$('.sprintfx').style.opacity = v.sprint ? '1' : '0';

    // ---- crosshair ----
    const spread = 7 + player.moveSpeed01 * 13 + (weapons.cooldown > 0 ? 5 : 0);
    const x = this.$('.xhair');
    x.style.opacity = weapons.ads > 0.6 || !v.alive ? '0' : '1';
    x.querySelector('.t').style.top = `${-spread - 6}px`;
    x.querySelector('.b').style.top = `${spread}px`;
    x.querySelector('.l').style.left = `${-spread - 6}px`;
    x.querySelector('.r').style.left = `${spread}px`;

    // ---- message ----
    this.$('.msg').style.opacity = this.msgT > 0 ? String(Math.min(1, this.msgT / 0.4)) : '0';

    // ---- objective banner ----
    const ob = this.$('.objective');
    if (this.objT > 0) {
      this.objT -= dt;
      if (!ob.classList.contains('on')) { ob.classList.remove('off'); ob.classList.add('on'); }
      if (this.objT <= 0) { ob.classList.remove('on'); ob.classList.add('off'); }
    }

    // ---- minimap footer (grid ref only) ----
    const bh = this.game.world.bounds.half;
    const gx = Math.max(0, Math.min(7, Math.floor((player.position.x + bh) / (bh * 2) * 8)));
    const gz = Math.max(0, Math.min(7, Math.floor((player.position.z + bh) / (bh * 2) * 8)));
    this.$('.mm .gref').textContent = `${'ABCDEFGH'[gx]}${gz + 1}`;

    // ---- scoreboard ----
    const sb = this.$('.sb');
    sb.classList.toggle('on', !!v.scoreboard);
    if (v.scoreboard) {
      sb.querySelector('.v-k').textContent = v.kills;
      sb.querySelector('.v-d').textContent = v.deaths;
      sb.querySelector('.v-kd').textContent = (v.kills / Math.max(1, v.deaths)).toFixed(1);
      sb.querySelector('.v-st').textContent = v.streak;
      sb.querySelector('.v-sc').textContent = v.score;
      sb.querySelector('.tm').textContent = this._fmtTime(v.time);
    }

    // ---- KIA countdown ----
    if (!v.alive || (this.demo === 'kia')) {
      this.$('.kia .cnt').textContent = v.respawnT.toFixed(1);
    }

    this.minimap.draw(dt);
    this._compass();
    this._damageRing();
  }

  _fmtTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ---------------- compass strip ----------------
  _compass() {
    const g = this.compassCtx;
    const W = 960, H = 116;
    g.clearRect(0, 0, W, H);

    // soft scrim band so ticks survive bright skies (masked at the edges by CSS)
    const band = g.createLinearGradient(0, 0, 0, 64);
    band.addColorStop(0, 'rgba(5,7,9,0)');
    band.addColorStop(0.25, 'rgba(5,7,9,.34)');
    band.addColorStop(0.72, 'rgba(5,7,9,.34)');
    band.addColorStop(1, 'rgba(5,7,9,0)');
    g.fillStyle = band;
    g.fillRect(0, 0, W, 64);

    const yawDeg = ((-this.game.player.yaw * 180 / Math.PI) % 360 + 360) % 360;
    const pxPerDeg = W / 100;
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.shadowColor = 'rgba(0,0,0,.85)';
    g.shadowBlur = 5;
    g.shadowOffsetY = 1;

    const start = Math.ceil((yawDeg - 52) / 5) * 5;
    for (let deg = start; deg <= yawDeg + 52; deg += 5) {
      const d = deg - yawDeg;
      const x = W / 2 + d * pxPerDeg;
      const m = ((deg % 360) + 360) % 360;
      if (m % 45 === 0) {
        const cardinal = m % 90 === 0;
        g.fillStyle = cardinal ? 'rgba(244,242,236,1)' : 'rgba(244,242,236,.85)';
        g.font = cardinal ? '700 31px Rajdhani' : '600 24px Rajdhani';
        g.fillText(names[m], x, 30);
        g.fillRect(x - 1, 40, 2, 13);
      } else if (m % 15 === 0) {
        g.fillStyle = 'rgba(244,242,236,.72)';
        g.font = '600 18px Rajdhani';
        g.fillText(String(m), x, 27);
        g.fillRect(x - 0.5, 40, 1, 10);
      } else {
        g.fillStyle = 'rgba(244,242,236,.45)';
        g.fillRect(x - 0.5, 40, 1, 7);
      }
    }
    g.shadowColor = 'transparent';

    // center caret + heading readout
    g.fillStyle = '#d8b25a';
    g.fillRect(W / 2 - 1.5, 36, 3, 20);
    const hdg = String(Math.round(yawDeg) % 360).padStart(3, '0');
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.lineWidth = 1;
    g.fillStyle = 'rgba(7,9,11,.55)';
    const bw = 66, bh = 30, bx = W / 2 - bw / 2, by = 64;
    g.beginPath();
    if (g.roundRect) g.roundRect(bx, by, bw, bh, 3);
    else g.rect(bx, by, bw, bh);
    g.fill(); g.stroke();
    g.fillStyle = 'rgba(240,238,232,.95)';
    g.font = '400 21px Oswald';
    g.textBaseline = 'middle';
    g.fillText(hdg, W / 2, by + bh / 2 + 1);
  }

  // ---------------- directional damage arcs ----------------
  _damageRing() {
    const g = this.ringCtx;
    const S = 760, c = S / 2;
    g.clearRect(0, 0, S, S);
    if (!this.arcs.length) return;
    const cam = this.game.camera;
    this._q.copy(cam.quaternion).invert();
    g.lineCap = 'butt';
    for (const a of this.arcs) {
      if (!a.dir) continue;
      this._v.copy(a.dir).applyQuaternion(this._q);
      const ang = Math.atan2(this._v.x, -this._v.z) - Math.PI / 2; // 0 rad = screen up
      const alpha = Math.min(1, a.t / 0.7) * 0.9;
      const span = 0.5; // half-span (~57 deg total)
      const R = 206, N = 14;
      // tapered crescent: segments thin + fade toward the tips
      for (let i = 0; i < N; i++) {
        const u0 = -1 + (2 * i) / N, u1 = -1 + (2 * (i + 1)) / N + 0.02;
        const mid = (u0 + u1) / 2;
        const k = Math.cos((mid * Math.PI) / 2);
        g.strokeStyle = `rgba(255,62,46,${(alpha * (0.25 + 0.75 * k)).toFixed(3)})`;
        g.lineWidth = 2 + Math.pow(k, 0.85) * 15;
        g.beginPath();
        g.arc(c, c, R, ang + u0 * span, ang + u1 * span);
        g.stroke();
      }
    }
  }

  // ---------------- demo state forcing (screenshots only) ----------------
  _applyDemo(v, dt) {
    const d = this.demo;
    if (!this._demoInit) {
      this._demoInit = true;
      if (d === 'combat') {
        this.addFeed('gun', false);
        this.addFeed('grenade', false);
        this.addFeed('gun', true);
        this.spawnHit(true, 0.05);
        this.spawnPop('+100', '', false, 0.30);
        this.spawnPop('+150', 'HEADSHOT', true, 0.18);
      }
      if (d === 'streak') this.message('AIRSTRIKE READY', 'PRESS [4] TO CALL IT IN');
      if (d === 'kia') this._kia(true);
    }
    switch (d) {
      case 'combat':
        for (const f of this.feed) f.t = 5;
        this.dmgT = 0.3;
        if (!this.arcs.length) this.arcs.push({ dir: new THREE.Vector3(-0.85, 0, 0.35).normalize(), t: 1 });
        this.arcs.forEach((a) => (a.t = 0.75));
        break;
      case 'damage': {
        this.dmgT = 0.8;
        if (this.arcs.length < 2) {
          this.arcs.length = 0;
          const yaw = this.game.player.yaw;
          const mk = (a) => new THREE.Vector3(Math.sin(yaw + a), 0, -Math.cos(yaw + a));
          this.arcs.push({ dir: mk(-0.6), t: 1 }, { dir: mk(2.4), t: 1 });
        }
        this.arcs.forEach((a) => (a.t = 1));
        v.health = 28; this.hpShowT = 2; v.alive = true;
        break;
      }
      case 'reload':
        v.reloading = 0.8; v.reloadTime = 2.1; v.mag = 0;
        break;
      case 'scoreboard':
        v.scoreboard = true; v.kills = 8; v.deaths = 2; v.score = 1150; v.streak = 3; v.time = 277;
        break;
      case 'kia':
        v.respawnT = 2.4; v.alive = false;
        break;
      case 'streak':
        v.available = 1; v.streak = 5; this.msgT = Math.max(this.msgT, 0.9);
        v.kills = 5; v.score = 625;
        break;
      case 'sprint':
        v.sprint = true;
        break;
      case 'objective':
        this.objT = Math.max(this.objT, 3);
        break;
    }
  }
}
