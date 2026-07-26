import { clamp } from '../core/utils.js';

// ===========================================================================
// HUD — DOM overlay styled after modern COD: minimal, crisp, high-contrast.
// ===========================================================================

const CSS = /* css */`
#hud, #hud * { box-sizing: border-box; margin: 0; padding: 0; }
#hud {
  position: fixed; inset: 0; pointer-events: none; overflow: hidden;
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  color: #e8e6e0; z-index: 10;
  --amber: #ffb648; --red: #ff3b30;
}
.hud-cond { font-stretch: condensed; letter-spacing: 0.08em; }

/* ---- Crosshair ---- */
#crosshair { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
#crosshair .line { position: absolute; background: rgba(255,255,255,0.92); box-shadow: 0 0 3px rgba(0,0,0,0.9); }
#crosshair .t { width: 2px; height: 9px; left: -1px; }
#crosshair .b { width: 2px; height: 9px; left: -1px; }
#crosshair .l { height: 2px; width: 9px; top: -1px; }
#crosshair .r { height: 2px; width: 9px; top: -1px; }
#crosshair .dot { position: absolute; width: 2px; height: 2px; left: -1px; top: -1px; background: rgba(255,255,255,0.95); }
#crosshair.hidden { opacity: 0; }

/* ---- Hitmarker ---- */
#hitmarker { position: absolute; left: 50%; top: 50%; width: 0; height: 0; opacity: 0; }
#hitmarker .hm { position: absolute; width: 2.5px; height: 10px; background: #fff; box-shadow: 0 0 4px rgba(0,0,0,0.8); }
#hitmarker.kill .hm { background: var(--red); }
#hitmarker .hm1 { transform: translate(-7px,-13px) rotate(45deg); }
#hitmarker .hm2 { transform: translate(5px,-13px) rotate(-45deg); }
#hitmarker .hm3 { transform: translate(-7px,3px) rotate(-45deg); }
#hitmarker .hm4 { transform: translate(5px,3px) rotate(45deg); }
#hitmarker.show { animation: hmpop 0.28s ease-out; }
@keyframes hmpop { 0% { opacity: 1; transform: scale(1.25);} 70% { opacity: 1; } 100% { opacity: 0; transform: scale(0.95);} }

/* ---- Bottom right: ammo ---- */
#ammoBlock {
  position: absolute; right: 42px; bottom: 34px; text-align: right;
  text-shadow: 0 1px 3px rgba(0,0,0,0.85);
}
#weaponName { font-size: 13px; letter-spacing: 0.22em; color: #b9b5ac; font-weight: 600; }
#ammoRow { display: flex; align-items: baseline; justify-content: flex-end; gap: 8px; }
#ammoMag { font-size: 46px; font-weight: 800; line-height: 1; letter-spacing: 0.02em; }
#ammoMag.low { color: var(--red); }
#ammoReserve { font-size: 18px; font-weight: 600; color: #a7a29a; }
#fireMode { font-size: 10px; letter-spacing: 0.3em; color: #8f8a82; margin-top: 3px; }

/* ---- Killstreak widget ---- */
#streak {
  position: absolute; right: 42px; bottom: 128px; text-align: right;
  text-shadow: 0 1px 3px rgba(0,0,0,0.85);
}
#streak .row { display: flex; align-items: center; justify-content: flex-end; gap: 9px; }
#streakIcon { width: 34px; height: 34px; opacity: 0.5; }
#streakIcon svg { width: 100%; height: 100%; fill: #cfcbc2; }
#streak.ready #streakIcon { opacity: 1; filter: drop-shadow(0 0 6px rgba(255,182,72,0.9)); }
#streak.ready #streakIcon svg { fill: var(--amber); }
#streakLabel { font-size: 11px; letter-spacing: 0.18em; color: #9a958c; font-weight: 600; }
#streak.ready #streakLabel { color: var(--amber); }
#streakBar { width: 120px; height: 3px; background: rgba(255,255,255,0.16); margin-top: 5px; margin-left: auto; }
#streakFill { height: 100%; width: 0%; background: #cfcbc2; transition: width 0.25s ease; }
#streak.ready #streakFill { background: var(--amber); }

/* ---- Bottom left: health ---- */
#healthBlock { position: absolute; left: 42px; bottom: 34px; width: 220px; }
#healthLabel { font-size: 11px; letter-spacing: 0.25em; color: #9a958c; font-weight: 700; margin-bottom: 6px; text-shadow: 0 1px 3px rgba(0,0,0,0.9); }
#healthBar { width: 100%; height: 6px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.18); }
#healthFill { height: 100%; width: 100%; background: #d8d5cd; transition: width 0.15s ease-out, background 0.3s; }
#healthFill.hurt { background: var(--red); }

/* ---- Compass ---- */
#compass {
  position: absolute; top: 26px; left: 50%; transform: translateX(-50%);
  width: 380px; height: 34px; overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
}
#compassTape { position: absolute; top: 0; height: 100%; white-space: nowrap; }
.cmark { position: absolute; top: 0; text-align: center; transform: translateX(-50%); }
.cmark .lbl { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: #e8e6e0; text-shadow: 0 1px 3px #000; }
.cmark .tick { width: 1.5px; height: 7px; background: rgba(255,255,255,0.75); margin: 2px auto 0; }
.cmark.minor .lbl { font-size: 9px; color: #a29d94; }
#compassCaret { position: absolute; top: 58px; left: 50%; transform: translateX(-50%); width: 0; height: 0;
  border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #e8e6e0; opacity: 0.9; }

/* ---- Kill feed ---- */
#killfeed { position: absolute; top: 88px; right: 42px; text-align: right; }
.feedItem {
  font-size: 12.5px; font-weight: 600; letter-spacing: 0.06em; margin-bottom: 5px;
  color: #dad6cd; text-shadow: 0 1px 3px #000;
  background: rgba(8,8,10,0.42); padding: 4px 10px; border-right: 2px solid var(--amber);
  animation: feedIn 0.2s ease-out;
}
.feedItem .you { color: var(--amber); }
.feedItem .skull { color: var(--red); font-weight: 800; }
@keyframes feedIn { from { transform: translateX(18px); opacity: 0; } }

/* ---- Score ---- */
#scoreBlock { position: absolute; top: 26px; left: 42px; text-shadow: 0 1px 3px #000; }
#scoreBlock .k { font-size: 26px; font-weight: 800; }
#scoreBlock .lbl { font-size: 10px; letter-spacing: 0.3em; color: #9a958c; font-weight: 700; }

/* ---- Damage overlays ---- */
#damageVignette {
  position: absolute; inset: 0; opacity: 0; transition: opacity 0.18s;
  background: radial-gradient(ellipse at center, transparent 42%, rgba(140,0,0,0.55) 100%);
}
#lowHealth {
  position: absolute; inset: 0; opacity: 0;
  background: radial-gradient(ellipse at center, transparent 34%, rgba(120,0,0,0.7) 100%);
}
.dmgArc {
  position: absolute; left: 50%; top: 50%; width: 130px; height: 130px;
  margin: -65px 0 0 -65px; opacity: 0; pointer-events: none;
}
.dmgArc::before {
  content: ''; position: absolute; left: 50%; top: -28px; transform: translateX(-50%);
  width: 60px; height: 18px;
  background: radial-gradient(ellipse at 50% 100%, rgba(255,40,30,0.85), transparent 70%);
  clip-path: polygon(15% 100%, 50% 0%, 85% 100%);
}

/* ---- Banners ---- */
#banner {
  position: absolute; top: 24%; left: 50%; transform: translateX(-50%);
  font-size: 26px; font-weight: 800; letter-spacing: 0.34em; text-align: center;
  color: var(--amber); text-shadow: 0 0 18px rgba(255,182,72,0.5), 0 2px 4px #000;
  opacity: 0; transition: opacity 0.25s;
}
#subBanner {
  position: absolute; top: calc(24% + 36px); left: 50%; transform: translateX(-50%);
  font-size: 12px; font-weight: 600; letter-spacing: 0.28em; color: #cfcbc2;
  text-shadow: 0 1px 3px #000; opacity: 0; transition: opacity 0.25s;
}

/* ---- Start / death screens ---- */
#startScreen, #deathScreen {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: auto;
  background: radial-gradient(ellipse at center, rgba(10,12,14,0.55) 0%, rgba(4,5,6,0.92) 100%);
  transition: opacity 0.4s;
}
#startScreen h1 {
  font-size: 64px; font-weight: 900; letter-spacing: 0.22em; color: #efece4;
  text-shadow: 0 0 40px rgba(255,182,72,0.25), 0 3px 8px #000;
}
#startScreen .tag { font-size: 12px; letter-spacing: 0.5em; color: var(--amber); margin-top: 4px; font-weight: 700; }
#startScreen .cta { margin-top: 54px; font-size: 17px; letter-spacing: 0.3em; font-weight: 700; color: #fff; animation: pulse 1.6s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
#startScreen .controls { margin-top: 40px; font-size: 12px; color: #97928a; line-height: 2; letter-spacing: 0.12em; text-align: center; }
#startScreen .controls b { color: #d8d4cb; font-weight: 700; }
#deathScreen { opacity: 0; pointer-events: none; }
#deathScreen h1 { font-size: 54px; font-weight: 900; letter-spacing: 0.3em; color: var(--red); text-shadow: 0 0 30px rgba(255,59,48,0.4); }
#deathScreen .cta { margin-top: 30px; font-size: 14px; letter-spacing: 0.25em; color: #d8d4cb; animation: pulse 1.6s infinite; }
.hidden { display: none !important; }
`;

const AIRSTRIKE_SVG = `<svg viewBox="0 0 24 24"><path d="M21.5 15.2v-1.6l-8-4.5V4.2c0-.8-.6-1.7-1.5-1.7s-1.5.9-1.5 1.7v4.9l-8 4.5v1.6l8-2.2v4.6l-2.3 1.6v1.3l3.8-1 3.8 1v-1.3L13.5 18v-4.6l8 1.8z"/></svg>`;

export class HUD {
  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div id="damageVignette"></div>
      <div id="lowHealth"></div>
      <div id="crosshair">
        <div class="line t"></div><div class="line b"></div>
        <div class="line l"></div><div class="line r"></div>
        <div class="dot"></div>
      </div>
      <div id="hitmarker">
        <div class="hm hm1"></div><div class="hm hm2"></div>
        <div class="hm hm3"></div><div class="hm hm4"></div>
      </div>
      <div id="compass"><div id="compassTape"></div></div>
      <div id="compassCaret"></div>
      <div id="scoreBlock"><div class="k" id="killCount">0</div><div class="lbl">ELIMINATIONS</div></div>
      <div id="killfeed"></div>
      <div id="banner"></div>
      <div id="subBanner"></div>
      <div id="ammoBlock">
        <div id="weaponName" class="hud-cond">AX-4 CARBINE</div>
        <div id="ammoRow"><span id="ammoMag">30</span><span id="ammoReserve">210</span></div>
        <div id="fireMode">FULL AUTO</div>
      </div>
      <div id="streak">
        <div class="row">
          <div><div id="streakLabel">AIRSTRIKE — 4 KILLS</div><div id="streakBar"><div id="streakFill"></div></div></div>
          <div id="streakIcon">${AIRSTRIKE_SVG}</div>
        </div>
      </div>
      <div id="healthBlock">
        <div id="healthLabel">HP</div>
        <div id="healthBar"><div id="healthFill"></div></div>
      </div>
      <div class="dmgArc" id="dmgArc"></div>
      <div id="startScreen">
        <h1>ASHFALL</h1>
        <div class="tag">P R O T O C O L</div>
        <div class="cta">[ CLICK TO DEPLOY ]</div>
        <div class="controls">
          <b>WASD</b> MOVE &nbsp;·&nbsp; <b>SHIFT</b> SPRINT &nbsp;·&nbsp; <b>C</b> CROUCH / SLIDE &nbsp;·&nbsp; <b>SPACE</b> JUMP<br/>
          <b>MOUSE</b> AIM &nbsp;·&nbsp; <b>LMB</b> FIRE &nbsp;·&nbsp; <b>RMB</b> ADS &nbsp;·&nbsp; <b>R</b> RELOAD &nbsp;·&nbsp; <b>4</b> AIRSTRIKE
        </div>
      </div>
      <div id="deathScreen"><h1>K.I.A.</h1><div class="cta">[ SPACE ] REDEPLOY</div></div>
    `;
    document.body.appendChild(this.root);

    this.el = {};
    for (const id of ['crosshair', 'hitmarker', 'compassTape', 'killCount', 'killfeed', 'banner', 'subBanner',
      'ammoMag', 'ammoReserve', 'streak', 'streakLabel', 'streakFill', 'healthFill', 'damageVignette',
      'lowHealth', 'dmgArc', 'startScreen', 'deathScreen', 'streakIcon']) {
      this.el[id] = this.root.querySelector('#' + id);
    }

    this.buildCompass();
    this._hmTimeout = null;
    this._bannerTimeout = null;
    this.damageFlash = 0;
  }

  buildCompass() {
    // Tape spans 720° so wrapping is seamless
    const marks = [];
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    for (let a = -360; a <= 720; a += 15) {
      const norm = ((a % 360) + 360) % 360;
      const major = norm % 45 === 0;
      const label = major ? names[norm] : String(norm).padStart(3, '0');
      marks.push(`<div class="cmark ${major ? '' : 'minor'}" data-deg="${a}"><div class="lbl">${label}</div><div class="tick"></div></div>`);
    }
    this.el.compassTape.innerHTML = marks.join('');
    this.compassMarks = [...this.el.compassTape.children];
  }

  hideStart() { this.el.startScreen.style.opacity = '0'; setTimeout(() => this.el.startScreen.classList.add('hidden'), 450); }
  showStart() { this.el.startScreen.classList.remove('hidden'); this.el.startScreen.style.opacity = '1'; }

  showDeath(v) {
    this.el.deathScreen.style.opacity = v ? '1' : '0';
    this.el.deathScreen.style.pointerEvents = v ? 'auto' : 'none';
  }

  hitmarker(kill) {
    const hm = this.el.hitmarker;
    hm.classList.remove('show', 'kill');
    void hm.offsetWidth; // restart animation
    if (kill) hm.classList.add('kill');
    hm.classList.add('show');
  }

  killfeed(text) {
    const div = document.createElement('div');
    div.className = 'feedItem';
    div.innerHTML = text;
    this.el.killfeed.prepend(div);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.lastChild.remove();
    setTimeout(() => { div.style.transition = 'opacity 0.6s'; div.style.opacity = '0'; }, 4200);
    setTimeout(() => div.remove(), 5000);
  }

  banner(text, sub = '', duration = 2600) {
    this.el.banner.textContent = text;
    this.el.banner.style.opacity = '1';
    this.el.subBanner.textContent = sub;
    this.el.subBanner.style.opacity = sub ? '1' : '0';
    clearTimeout(this._bannerTimeout);
    this._bannerTimeout = setTimeout(() => {
      this.el.banner.style.opacity = '0';
      this.el.subBanner.style.opacity = '0';
    }, duration);
  }

  damageFrom(angleRelative) {
    // angleRelative: radians, 0 = ahead, positive = right
    this.el.dmgArc.style.transform = `rotate(${angleRelative}rad)`;
    this.el.dmgArc.style.opacity = '1';
    clearTimeout(this._dmgTimeout);
    this._dmgTimeout = setTimeout(() => { this.el.dmgArc.style.opacity = '0'; }, 700);
    this.damageFlash = 1;
  }

  update(dt, state) {
    // state: { yaw, health, maxHealth, ammo, reserve, kills, streakProgress, streakReady, aiming, spread, dead }
    const deg = ((-state.yaw * 180 / Math.PI) % 360 + 360) % 360;

    // Compass: position marks relative to current heading
    const pxPerDeg = 380 / 90; // 90° visible
    for (const m of this.compassMarks) {
      let d = parseFloat(m.dataset.deg) - deg;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      if (Math.abs(d) > 60) { m.style.display = 'none'; continue; }
      m.style.display = '';
      m.style.left = `${190 + d * pxPerDeg}px`;
    }

    // Crosshair: spread + hide when ADS
    const ch = this.el.crosshair;
    ch.classList.toggle('hidden', state.aiming > 0.6);
    const gap = 7 + state.spread * 340;
    ch.querySelector('.t').style.top = `${-gap - 9}px`;
    ch.querySelector('.b').style.top = `${gap}px`;
    ch.querySelector('.l').style.left = `${-gap - 9}px`;
    ch.querySelector('.r').style.left = `${gap}px`;

    // Ammo
    this.el.ammoMag.textContent = state.ammo;
    this.el.ammoMag.classList.toggle('low', state.ammo <= 6);
    this.el.ammoReserve.textContent = state.reserve;

    // Health
    const hp = clamp(state.health / state.maxHealth, 0, 1);
    this.el.healthFill.style.width = `${hp * 100}%`;
    this.el.healthFill.classList.toggle('hurt', hp < 0.4);
    this.el.lowHealth.style.opacity = hp < 0.42 ? String((1 - hp / 0.42) * 0.9) : '0';

    // Damage vignette decay
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2);
    this.el.damageVignette.style.opacity = String(this.damageFlash * 0.85);

    // Kills + streak
    this.el.killCount.textContent = state.kills;
    this.el.streakFill.style.width = `${clamp(state.streakProgress, 0, 1) * 100}%`;
    this.el.streak.classList.toggle('ready', state.streakReady);
    this.el.streakLabel.textContent = state.streakReady ? 'AIRSTRIKE READY — [4]' : `AIRSTRIKE — ${state.streakKillsLeft} MORE`;

    this.showDeath(state.dead);
  }
}
