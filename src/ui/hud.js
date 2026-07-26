import * as THREE from 'three';

/** DOM-based HUD: crosshair, ammo, health, minimap, compass, hitmarkers, killfeed. */
export class HUD {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <style>
        #hud { position: fixed; inset: 0; pointer-events: none; color: #e8e6e0;
               font-family: 'Rajdhani', sans-serif; z-index: 10; opacity: 1; transition: opacity .3s; }
        #hud.hidden { opacity: 0; }
        .xhair { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); }
        .xhair span { position: absolute; background: rgba(255,255,255,.92); box-shadow: 0 0 2px rgba(0,0,0,.8); }
        .xhair .t { width: 2px; height: 7px; left: -1px; top: -13px; }
        .xhair .b { width: 2px; height: 7px; left: -1px; top: 6px; }
        .xhair .l { width: 7px; height: 2px; left: -13px; top: -1px; }
        .xhair .r { width: 7px; height: 2px; left: 6px; top: -1px; }
        .hitmark { position: absolute; left: 50%; top: 50%; width: 26px; height: 26px;
                   transform: translate(-50%,-50%) rotate(45deg); opacity: 0; }
        .hitmark span { position: absolute; background: #fff; }
        .hitmark.head span { background: #ff4a3a; }
        .hitmark .a { width: 2px; height: 8px; left: 0; top: 0; }
        .hitmark .b { width: 2px; height: 8px; right: 0; top: 0; }
        .hitmark .c { width: 2px; height: 8px; left: 0; bottom: 0; }
        .hitmark .d { width: 2px; height: 8px; right: 0; bottom: 0; }
        .ammo { position: absolute; right: 34px; bottom: 26px; text-align: right; }
        .ammo .mag { font-size: 44px; font-weight: 700; line-height: 1; letter-spacing: 1px;
                     text-shadow: 0 1px 3px rgba(0,0,0,.7); }
        .ammo .reserve { font-size: 20px; opacity: .75; font-weight: 600; }
        .ammo .name { font-size: 15px; letter-spacing: 3px; opacity: .8; margin-top: 2px; }
        .ammo .nade { font-size: 14px; margin-top: 4px; opacity: .8; letter-spacing: 2px; }
        .minimap { position: absolute; left: 26px; top: 24px; width: 190px; height: 190px;
                   border-radius: 4px; overflow: hidden; outline: 1px solid rgba(255,255,255,.28);
                   box-shadow: 0 2px 14px rgba(0,0,0,.5); background: rgba(8,10,8,.62); }
        .minimap canvas { width: 100%; height: 100%; }
        .compass { position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
                   width: 380px; height: 26px; overflow: hidden; opacity: .9;
                   -webkit-mask-image: linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent); }
        .compass canvas { width: 100%; height: 100%; }
        .killfeed { position: absolute; right: 26px; top: 24px; text-align: right; font-size: 15px; font-weight: 600; }
        .killfeed div { background: rgba(0,0,0,.45); padding: 3px 10px; margin-bottom: 4px;
                        border-radius: 3px; letter-spacing: .5px; }
        .killfeed .you { color: #ffd166; }
        .msg { position: absolute; left: 50%; top: 32%; transform: translateX(-50%); text-align: center; }
        .msg .big { font-size: 34px; font-weight: 700; letter-spacing: 6px; text-shadow: 0 2px 8px rgba(0,0,0,.8); }
        .msg .sub { font-size: 17px; letter-spacing: 3px; opacity: .85; }
        .streak { position: absolute; right: 34px; bottom: 120px; text-align: right; font-size: 15px;
                  font-weight: 600; letter-spacing: 1.5px; }
        .streak .ready { color: #7fd0ff; text-shadow: 0 0 12px rgba(90,180,255,.6); }
        .dmg { position: absolute; inset: 0; pointer-events: none;
               background: radial-gradient(ellipse at center, transparent 42%, rgba(160,10,5,.55) 100%);
               opacity: 0; }
        .dmgdir { position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; opacity: 0;
                  transform: translate(-50%,-50%); }
        .dmgdir::before { content:''; position: absolute; left: 50%; top: -34px; transform: translateX(-50%);
                  border: 14px solid transparent; border-bottom: 26px solid rgba(255,40,25,.85);
                  filter: blur(1px); }
        .score { position: absolute; left: 26px; top: 226px; font-size: 15px; font-weight: 600;
                 letter-spacing: 1px; opacity: .9; }
        .lowhp { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 30%, rgba(120,0,0,.5) 95%);
                 opacity: 0; }
      </style>
      <div class="dmg"></div>
      <div class="lowhp"></div>
      <div class="dmgdir"></div>
      <div class="xhair"><span class="t"></span><span class="b"></span><span class="l"></span><span class="r"></span></div>
      <div class="hitmark"><span class="a"></span><span class="b"></span><span class="c"></span><span class="d"></span></div>
      <div class="minimap"><canvas width="380" height="380"></canvas></div>
      <div class="compass"><canvas width="760" height="52"></canvas></div>
      <div class="killfeed"></div>
      <div class="ammo">
        <div class="mag">30 <span class="reserve">| 180</span></div>
        <div class="name">M4A1</div>
        <div class="nade">FRAG x4 [G]</div>
      </div>
      <div class="streak"></div>
      <div class="score"></div>
      <div class="msg"><div class="big"></div><div class="sub"></div></div>
    `;
    document.body.appendChild(el);
    this.el = el;
    this.$ = (s) => el.querySelector(s);
    this.mapCtx = this.$('.minimap canvas').getContext('2d');
    this.compassCtx = this.$('.compass canvas').getContext('2d');
    this.hitT = 0;
    this.dmgT = 0;
    this.dmgDirAngle = 0;
    this.msgT = 0;
    this.feed = [];

    const { events } = game;
    events.on('ui:hitmarker', ({ headshot, kill }) => {
      this.hitT = 0.32;
      this.$('.hitmark').classList.toggle('head', !!(headshot || kill));
    });
    events.on('player:damage', ({ direction }) => {
      this.dmgT = 1;
      if (direction) {
        const cam = game.camera;
        const local = direction.clone().applyQuaternion(cam.quaternion.clone().invert());
        this.dmgDirAngle = Math.atan2(local.x, -local.z);
      }
    });
    events.on('enemy:death', ({ headshot, cause }) => {
      const w = cause === 'airstrike' ? 'AIRSTRIKE' : headshot ? 'HEADSHOT' : 'M4A1';
      this.addFeed(`<span class="you">YOU</span> [${w}] HOSTILE`);
    });
    events.on('ui:message', ({ text, sub }) => this.message(text, sub));
    events.on('player:death', () => this.message('K.I.A.', 'RESPAWNING...'));
  }

  addFeed(html) {
    this.feed.push({ html, t: 5.5 });
    if (this.feed.length > 5) this.feed.shift();
    this._renderFeed();
  }
  _renderFeed() {
    this.$('.killfeed').innerHTML = this.feed.map((f) => `<div>${f.html}</div>`).join('');
  }

  message(text, sub = '') {
    this.$('.msg .big').textContent = text;
    this.$('.msg .sub').textContent = sub;
    this.msgT = 3.2;
  }

  hide() { this.el.classList.add('hidden'); }
  show() { this.el.classList.remove('hidden'); }

  update(dt) {
    const { player, weapons, ai, state, camera } = this.game;

    // ammo
    const def = weapons.def, slot = weapons.slot;
    this.$('.ammo .mag').innerHTML = `${slot.reloading > 0 ? '--' : slot.mag} <span class="reserve">| ${slot.reserve}</span>`;
    this.$('.ammo .name').textContent = def.name + (slot.reloading > 0 ? ' — RELOADING' : '');
    this.$('.ammo .nade').textContent = `FRAG x${weapons.grenades} [G]`;

    // hitmarker
    this.hitT = Math.max(0, this.hitT - dt);
    this.$('.hitmark').style.opacity = this.hitT > 0 ? String(Math.min(1, this.hitT / 0.18)) : '0';

    // damage vignette + low hp
    this.dmgT = Math.max(0, this.dmgT - dt * 1.6);
    this.$('.dmg').style.opacity = String(this.dmgT * 0.9);
    const lowHp = player.health < 45 ? 1 - player.health / 45 : 0;
    this.$('.lowhp').style.opacity = String(lowHp * 0.85);
    const dd = this.$('.dmgdir');
    dd.style.opacity = String(this.dmgT);
    dd.style.transform = `translate(-50%,-50%) rotate(${this.dmgDirAngle}rad)`;

    // crosshair spread + hide on ADS
    const spread = 8 + player.moveSpeed01 * 14 + (weapons.cooldown > 0 ? 6 : 0);
    const x = this.$('.xhair');
    x.style.opacity = weapons.ads > 0.6 ? '0' : '1';
    x.querySelector('.t').style.top = `${-spread - 7}px`;
    x.querySelector('.b').style.top = `${spread}px`;
    x.querySelector('.l').style.left = `${-spread - 7}px`;
    x.querySelector('.r').style.left = `${spread}px`;

    // killfeed decay
    let feedDirty = false;
    for (let i = this.feed.length - 1; i >= 0; i--) {
      this.feed[i].t -= dt;
      if (this.feed[i].t <= 0) { this.feed.splice(i, 1); feedDirty = true; }
    }
    if (feedDirty) this._renderFeed();

    // message
    this.msgT -= dt;
    this.$('.msg').style.opacity = this.msgT > 0 ? String(Math.min(1, this.msgT / 0.5)) : '0';

    // score + streak
    this.$('.score').innerHTML = `KILLS ${state.kills} &nbsp;·&nbsp; SCORE ${state.score}`;
    const need = state.airstrikeCost;
    const streakEl = this.$('.streak');
    if (this.game.airstrike.available > 0) {
      streakEl.innerHTML = `<span class="ready">AIRSTRIKE READY [4]</span>`;
    } else {
      streakEl.innerHTML = `AIRSTRIKE ${Math.min(state.streak, need)}/${need}`;
    }

    this._minimap();
    this._compass();
  }

  _minimap() {
    const g = this.mapCtx;
    const { player, ai } = this.game;
    const W = 380, R = 0.55; // world meters -> px scale
    g.clearRect(0, 0, W, W);
    g.save();
    g.translate(W / 2, W / 2);
    g.rotate(player.yaw);

    // world geometry footprint (buildings as blocks from navgrid)
    const grid = this.game.world.navgrid;
    g.fillStyle = 'rgba(190,200,190,0.16)';
    const step = 4;
    for (let iz = 0; iz < grid.n; iz += step) {
      for (let ix = 0; ix < grid.n; ix += step) {
        if (!grid.blocked[grid.idx(ix, iz)]) continue;
        const w = grid.toWorld(ix, iz);
        const dx = (w.x - player.position.x) * R;
        const dz = (w.z - player.position.z) * R;
        if (dx * dx + dz * dz > (W / 2) ** 2) continue;
        g.fillRect(dx - step * R * 0.5, dz - step * R * 0.5, step * R, step * R);
      }
    }
    // enemies
    for (const e of ai.enemies) {
      if (!e.alive) continue;
      const dx = (e.position.x - player.position.x) * R;
      const dz = (e.position.z - player.position.z) * R;
      if (dx * dx + dz * dz > (W / 2 - 8) ** 2) continue;
      g.fillStyle = '#ff3b30';
      g.beginPath();
      g.arc(dx, dz, 5, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // player arrow (always center, pointing up)
    g.save();
    g.translate(W / 2, W / 2);
    g.fillStyle = '#ffd166';
    g.beginPath();
    g.moveTo(0, -9); g.lineTo(6.5, 7); g.lineTo(0, 3.5); g.lineTo(-6.5, 7);
    g.closePath();
    g.fill();
    g.restore();
  }

  _compass() {
    const g = this.compassCtx;
    const W = 760, H = 52;
    g.clearRect(0, 0, W, H);
    const yawDeg = ((-this.game.player.yaw * 180 / Math.PI) % 360 + 360) % 360;
    const pxPerDeg = W / 120; // 120° visible
    g.font = '600 22px Rajdhani';
    g.textAlign = 'center';
    for (let d = -70; d <= 70; d += 5) {
      const deg = ((yawDeg + d) % 360 + 360) % 360;
      const x = W / 2 + d * pxPerDeg;
      if (deg % 45 === 0) {
        const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
        g.fillStyle = 'rgba(255,255,255,.95)';
        g.fillText(names[deg], x, 22);
        g.fillRect(x - 1, 30, 2, 10);
      } else if (deg % 15 === 0) {
        g.fillStyle = 'rgba(255,255,255,.5)';
        g.fillRect(x - 0.5, 32, 1, 8);
      }
    }
    // center marker
    g.fillStyle = '#ffd166';
    g.fillRect(W / 2 - 1.5, 42, 3, 8);
  }
}
