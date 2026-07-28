import { clamp } from '../core/utils.js';

// ===========================================================================
// HUD — DOM overlay styled after modern COD (MW2019/MWII): thin geometric
// sans, high-contrast off-white on soft black shadows, amber accents for
// streaks/alerts, red reserved for damage & kill confirmation. Elements are
// corner-anchored with generous margins and animate in 150-250ms steps.
// ===========================================================================

const CSS = /* css */`
#hud, #hud * { box-sizing: border-box; }
/* zero-specificity reset so class rules below can restore spacing */
:where(#hud, #hud *) { margin: 0; padding: 0; }
#hud {
  position: fixed; inset: 0; pointer-events: none; overflow: hidden;
  font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', 'Liberation Sans', Arial, sans-serif;
  color: #f1efe9; z-index: 10;
  font-feature-settings: 'tnum' 1;
  font-variant-numeric: tabular-nums;
  --amber: #ffb648;
  --red: #ff453a;
  --white: #f1efe9;
  --dim: rgba(241,239,233,0.6);
  --dimmer: rgba(241,239,233,0.42);
  --tsh: 0 1px 2px rgba(0,0,0,0.8), 0 1px 6px rgba(0,0,0,0.4);
}
/* corner clusters sit at .92 so they melt slightly into the scene */
.hud-corner { opacity: 0.92; }

/* ---- Crosshair ---- */
#crosshair { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transition: opacity 0.12s ease-out; }
/* Hairline arms: 1.5px strokes with a soft contact shadow instead of a hard
   1px outline — reads precise, not slab-like, over bright and dark ground */
#crosshair .line {
  position: absolute; background: rgba(255,255,255,0.88);
  box-shadow: 0 0 2.5px rgba(0,0,0,0.55);
}
#crosshair .t { width: 1.5px; height: 9px; left: -0.75px; }
#crosshair .b { width: 1.5px; height: 9px; left: -0.75px; }
#crosshair .l { height: 1.5px; width: 9px; top: -0.75px; }
#crosshair .r { height: 1.5px; width: 9px; top: -0.75px; }
#crosshair .dot {
  position: absolute; width: 1.5px; height: 1.5px; left: -0.75px; top: -0.75px;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 0 2px rgba(0,0,0,0.55);
}
#crosshair.hidden { opacity: 0; }

/* ---- Hitmarker ---- */
#hitmarker { position: absolute; left: 50%; top: 50%; width: 0; height: 0; opacity: 0; }
#hitmarker .hm {
  position: absolute; width: 2.5px; height: 11px; background: #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 0 4px rgba(0,0,0,0.6);
}
#hitmarker.kill .hm { background: var(--red); box-shadow: 0 0 0 1px rgba(0,0,0,0.45), 0 0 7px rgba(255,60,48,0.75); }
#hitmarker .hm1 { transform: translate(-7.5px,-14px) rotate(45deg); }
#hitmarker .hm2 { transform: translate(5px,-14px) rotate(-45deg); }
#hitmarker .hm3 { transform: translate(-7.5px,3px) rotate(-45deg); }
#hitmarker .hm4 { transform: translate(5px,3px) rotate(45deg); }
#hitmarker.show { animation: hmpop 0.26s ease-out; }
#hitmarker.kill.show { animation: hmpop 0.34s ease-out; }
@keyframes hmpop { 0% { opacity: 1; transform: scale(1.28);} 70% { opacity: 1; } 100% { opacity: 0; transform: scale(0.92);} }

/* ---- Compass (top center) ---- */
#compassWrap { position: absolute; top: 28px; left: 50%; transform: translateX(-50%); width: 480px; }
#compassCaret {
  width: 0; height: 0; margin: 0 auto 2px;
  border-left: 5px solid transparent; border-right: 5px solid transparent;
  border-top: 6px solid var(--white);
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
  opacity: 0.95;
}
#compass {
  position: relative; width: 100%; height: 30px; overflow: hidden;
  /* Soft scrim grounds the ticks against bright sky — without it the tick
     drop-shadows read as detached dark marks floating over the horizon */
  background: linear-gradient(180deg, rgba(8,10,12,0.30) 0%, rgba(8,10,12,0.16) 55%, rgba(8,10,12,0) 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
}
#compassTape { position: absolute; top: 0; left: 0; height: 100%; will-change: transform; }
/* Ticks hang from the top edge; labels sit on a fixed row beneath them. */
.cmark { position: absolute; top: 0; height: 100%; }
.cmark .tick { position: absolute; top: 0; left: 50%; transform: translateX(-50%); box-shadow: 0 1px 1px rgba(0,0,0,0.35); }
.cmark .lbl { position: absolute; top: 11px; left: 50%; transform: translateX(-50%); text-shadow: var(--tsh); white-space: nowrap; }
.cmark.card .lbl { font-size: 15px; font-weight: 700; letter-spacing: 0.05em; color: #fff; }
.cmark.card .tick { width: 2px; height: 8px; background: rgba(255,255,255,0.92); }
.cmark.inter .lbl { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; color: rgba(241,239,233,0.85); top: 13px; }
.cmark.inter .tick { width: 1.5px; height: 7px; background: rgba(255,255,255,0.7); }
.cmark.deg .lbl { font-size: 9px; font-weight: 500; letter-spacing: 0.1em; color: rgba(241,239,233,0.6); top: 14px; }
.cmark.deg .tick { width: 1px; height: 6px; background: rgba(255,255,255,0.5); }
.cmark.t5 .tick { width: 1px; height: 4px; background: rgba(255,255,255,0.34); }
#compassHeading {
  margin-top: 2px; text-align: center;
  font-size: 10px; font-weight: 600; letter-spacing: 0.22em; padding-left: 0.22em;
  color: rgba(241,239,233,0.7); text-shadow: var(--tsh);
}

/* ---- Bottom right: ammo ---- */
#ammoBlock { position: absolute; right: 48px; bottom: 42px; text-align: right; text-shadow: var(--tsh); }
/* negative right margins cancel the trailing letter-space so tracked labels
   optically align with the numerals' right edge */
#weaponName { font-size: 12px; letter-spacing: 0.24em; margin-right: -0.24em; color: var(--dim); font-weight: 700; }
#ammoRow { display: flex; align-items: flex-end; justify-content: flex-end; gap: 9px; margin-top: 2px; }
#ammoMag { font-size: 46px; font-weight: 700; line-height: 0.94; letter-spacing: 0.01em; transition: color 0.2s; }
#ammoMag.low { color: var(--red); animation: lowPulse 0.9s ease-in-out infinite; }
@keyframes lowPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
#ammoDiv {
  width: 2px; height: 26px; margin-bottom: 3px;
  background: rgba(241,239,233,0.32); transform: skewX(-18deg);
  box-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
#ammoReserve { font-size: 17px; font-weight: 600; color: var(--dim); margin-bottom: 2px; }
#fireMode { font-size: 9px; letter-spacing: 0.34em; margin-right: -0.34em; color: var(--dimmer); margin-top: 4px; font-weight: 600; }

/* ---- Killstreak widget ---- */
#streak { position: absolute; right: 48px; bottom: 148px; text-align: right; text-shadow: var(--tsh); }
#streak .row { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
#streakIcon { width: 30px; height: 30px; opacity: 0.45; transition: opacity 0.25s ease-out; }
#streakIcon svg { width: 100%; height: 100%; fill: #d6d2c9; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7)); }
#streak.ready #streakIcon { opacity: 1; animation: readyGlow 1.5s ease-in-out infinite; }
#streak.ready #streakIcon svg { fill: var(--amber); }
@keyframes readyGlow {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(255,182,72,0.45)); }
  50% { filter: drop-shadow(0 0 9px rgba(255,182,72,0.95)); }
}
#streakLabel { font-size: 10px; letter-spacing: 0.18em; margin-right: -0.18em; color: var(--dim); font-weight: 700; transition: color 0.25s; }
#streak.ready #streakLabel { color: var(--amber); }
#streakPips { display: flex; justify-content: flex-end; gap: 4px; margin-top: 6px; }
#streakPips i {
  width: 22px; height: 5px; transform: skewX(-18deg);
  background: rgba(10,12,15,0.45);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.4);
  transition: background-color 0.2s ease-out, box-shadow 0.2s ease-out;
}
#streakPips i.on { background: #e9e6de; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.4); }
#streak.ready #streakPips i { background: var(--amber); box-shadow: inset 0 0 0 1px rgba(255,220,160,0.5), 0 0 7px rgba(255,182,72,0.55); }

/* ---- Bottom left: health ---- */
#healthBlock { position: absolute; left: 48px; bottom: 42px; width: 250px; }
#healthTop { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; text-shadow: var(--tsh); }
#healthLabel { font-size: 10px; letter-spacing: 0.3em; color: var(--dim); font-weight: 700; }
#healthNum { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
#healthBar { position: relative; width: 100%; height: 7px; background: rgba(4,5,7,0.5); box-shadow: 0 1px 3px rgba(0,0,0,0.45); }
#healthGhost {
  position: absolute; left: 0; top: 0; height: 100%; width: 100%;
  background: rgba(255,69,58,0.55);
  transition: width 0.45s cubic-bezier(0.3,0.8,0.4,1) 0.3s;
}
#healthFill {
  position: absolute; left: 0; top: 0; height: 100%; width: 100%;
  background: #e9e6de;
  transition: width 0.12s ease-out, background-color 0.3s;
}
#healthFill.hurt { background: var(--red); }
#healthSegs { position: absolute; inset: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14); }
#healthSegs i { position: absolute; top: 0; width: 2px; height: 100%; background: rgba(4,5,7,0.85); }
#healthSegs i:nth-child(1) { left: 25%; }
#healthSegs i:nth-child(2) { left: 50%; }
#healthSegs i:nth-child(3) { left: 75%; }

/* ---- Kill feed ---- */
#killfeed { position: absolute; top: 96px; right: 48px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.feedItem {
  font-size: 12px; font-weight: 600; letter-spacing: 0.07em;
  color: #e8e5dd; text-shadow: 0 1px 2px rgba(0,0,0,0.9);
  background: rgba(6,7,9,0.4); padding: 5px 12px 5px 14px;
  border-right: 2px solid var(--amber);
  animation: feedIn 0.22s cubic-bezier(0.16,1,0.3,1);
}
.feedItem .you { color: var(--amber); }
.feedItem .skull { color: var(--red); font-weight: 700; font-size: 13px; }
@keyframes feedIn { from { transform: translateX(22px); opacity: 0; } }

/* ---- Score (top left) ---- */
#scoreBlock { position: absolute; top: 34px; left: 48px; text-shadow: var(--tsh); }
#killCount { font-size: 30px; font-weight: 700; line-height: 1; letter-spacing: 0.02em; transform-origin: left 70%; }
#killCount.pop { animation: kcPop 0.3s cubic-bezier(0.2,0.9,0.3,1); }
@keyframes kcPop {
  0% { transform: scale(1); }
  30% { transform: scale(1.28); color: var(--amber); text-shadow: 0 0 14px rgba(255,182,72,0.55), var(--tsh); }
  100% { transform: scale(1); }
}
#scoreBlock .lbl { font-size: 9.5px; letter-spacing: 0.32em; color: var(--dim); font-weight: 700; margin-top: 5px; }

/* ---- Damage overlays ---- */
#damageVignette {
  position: absolute; inset: 0; opacity: 0; transition: opacity 0.18s;
  background: radial-gradient(ellipse at center, transparent 38%, rgba(150,12,6,0.5) 78%, rgba(120,0,0,0.62) 100%);
}
#lowHealth { position: absolute; inset: 0; opacity: 0; }
#lowHealth .breathe {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(110,0,0,0.75) 100%);
}
/* breathing runs only while the vignette is active — an always-on animation
   would force full-screen repaints every frame even when invisible */
#lowHealth.active .breathe { animation: lowBreathe 1.5s ease-in-out infinite; }
@keyframes lowBreathe { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
.dmgArc {
  position: absolute; left: 50%; top: 50%; width: 140px; height: 140px;
  margin: -70px 0 0 -70px; opacity: 0; pointer-events: none;
  transition: opacity 0.15s ease-out;
}
.dmgArc::before {
  content: ''; position: absolute; left: 50%; top: -32px; transform: translateX(-50%);
  width: 72px; height: 22px;
  background: radial-gradient(ellipse at 50% 100%, rgba(255,55,42,0.95), transparent 74%);
  clip-path: polygon(16% 100%, 50% 0%, 84% 100%);
}

/* ---- Banners ---- */
#banner {
  position: absolute; top: 25%; left: 50%; transform: translateX(-50%);
  font-size: 27px; font-weight: 700; letter-spacing: 0.4em; padding-left: 0.4em;
  text-align: center; white-space: nowrap;
  color: var(--amber); text-shadow: 0 0 22px rgba(255,182,72,0.4), 0 2px 5px rgba(0,0,0,0.9);
  opacity: 0; transition: opacity 0.25s;
}
#banner.show { animation: bannerIn 0.28s cubic-bezier(0.2,0.9,0.3,1); }
@keyframes bannerIn { from { opacity: 0; transform: translateX(-50%) scale(1.12); } }
#subBanner {
  position: absolute; top: calc(25% + 40px); left: 50%; transform: translateX(-50%);
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.3em; padding-left: 0.3em;
  white-space: nowrap; color: #d9d5cc;
  text-shadow: var(--tsh); opacity: 0; transition: opacity 0.25s;
}
#subBanner.show { animation: subIn 0.34s cubic-bezier(0.2,0.9,0.3,1); }
@keyframes subIn { from { opacity: 0; transform: translateX(-50%) translateY(7px); } }

/* ---- Start / death screens ---- */
#startScreen, #deathScreen {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: auto;
  background: radial-gradient(ellipse at center, rgba(10,12,14,0.55) 0%, rgba(4,5,6,0.93) 100%);
  transition: opacity 0.4s;
  /* interactive affordance: iOS only reliably delivers taps to elements it
     considers clickable, and desktop users expect a pointer over a CTA */
  cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
#startScreen h1 {
  font-size: 62px; font-weight: 700; letter-spacing: 0.28em; padding-left: 0.28em;
  color: #f3f0e8; text-shadow: 0 0 44px rgba(255,182,72,0.22), 0 3px 8px #000;
}
#startScreen .tagRow { display: flex; align-items: center; gap: 16px; margin-top: 10px; }
#startScreen .tagRow::before, #startScreen .tagRow::after {
  content: ''; width: 64px; height: 1px; background: rgba(255,182,72,0.45);
}
#startScreen .tag { font-size: 12px; letter-spacing: 0.62em; padding-left: 0.62em; color: var(--amber); font-weight: 700; }
#startScreen .cta {
  margin-top: 58px; font-size: 14px; letter-spacing: 0.3em; padding: 13px 30px 13px calc(30px + 0.3em);
  font-weight: 700; color: #fff; border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.04); animation: pulse 1.7s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.38; } }
#startScreen .ctaAlt {
  margin-top: 14px; font-size: 10px; letter-spacing: 0.3em; padding-left: 0.3em;
  color: #8f8a82; font-weight: 600;
}
#startScreen .controls {
  margin-top: 44px; font-size: 11px; color: #96918a; line-height: 2.6;
  letter-spacing: 0.14em; text-align: center; font-weight: 500;
}
#startScreen .controls b {
  display: inline-block; padding: 2px 8px; margin: 0 2px;
  border: 1px solid rgba(255,255,255,0.22); border-radius: 3px;
  background: rgba(255,255,255,0.05); color: #e9e6de;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; line-height: 1.5;
}
#deathScreen { opacity: 0; pointer-events: none; background: radial-gradient(ellipse at center, rgba(46,4,2,0.5) 0%, rgba(7,3,3,0.94) 100%); }
#deathScreen h1 {
  font-size: 54px; font-weight: 700; letter-spacing: 0.34em; padding-left: 0.34em;
  color: var(--red); text-shadow: 0 0 34px rgba(255,69,58,0.4), 0 2px 8px #000;
}
#deathScreen .rule { width: 220px; height: 1px; background: rgba(255,69,58,0.4); margin-top: 22px; }
#deathScreen .cta { margin-top: 26px; font-size: 13px; letter-spacing: 0.28em; padding-left: 0.28em; color: #d9d5cc; font-weight: 600; animation: pulse 1.7s ease-in-out infinite; }
.hidden { display: none !important; }
`;

// Top-down fighter jet, swept wings + tail fins.
const AIRSTRIKE_SVG = `<svg viewBox="0 0 24 24"><path d="M12 1.2 L12.9 2.4 L13.2 8.1 L21.6 13.9 L21.6 15.6 L13.3 12.7 L13.3 17.3 L16.2 19.6 L16.2 21 L12 19.9 L7.8 21 L7.8 19.6 L10.7 17.3 L10.7 12.7 L2.4 15.6 L2.4 13.9 L10.8 8.1 L11.1 2.4 Z"/></svg>`;

const COMPASS_W = 480;      // visible tape width in px
const PX_PER_DEG = 6;       // 80° visible window

export class HUD {
  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div id="damageVignette"></div>
      <div id="lowHealth"><div class="breathe"></div></div>
      <div id="crosshair">
        <div class="line t"></div><div class="line b"></div>
        <div class="line l"></div><div class="line r"></div>
        <div class="dot"></div>
      </div>
      <div id="hitmarker">
        <div class="hm hm1"></div><div class="hm hm2"></div>
        <div class="hm hm3"></div><div class="hm hm4"></div>
      </div>
      <div id="compassWrap" class="hud-corner">
        <div id="compassCaret"></div>
        <div id="compass"><div id="compassTape"></div></div>
        <div id="compassHeading">000</div>
      </div>
      <div id="scoreBlock" class="hud-corner"><div id="killCount">0</div><div class="lbl">ELIMINATIONS</div></div>
      <div id="killfeed" class="hud-corner"></div>
      <div id="banner"></div>
      <div id="subBanner"></div>
      <div id="ammoBlock" class="hud-corner">
        <div id="weaponName">AX-4 CARBINE</div>
        <div id="ammoRow"><span id="ammoMag">30</span><span id="ammoDiv"></span><span id="ammoReserve">210</span></div>
        <div id="fireMode">FULL AUTO</div>
      </div>
      <div id="streak" class="hud-corner">
        <div class="row">
          <div>
            <div id="streakLabel">AIRSTRIKE — 4 MORE</div>
            <div id="streakPips"><i></i><i></i><i></i><i></i></div>
          </div>
          <div id="streakIcon">${AIRSTRIKE_SVG}</div>
        </div>
      </div>
      <div id="healthBlock" class="hud-corner">
        <div id="healthTop"><div id="healthLabel">HP</div><div id="healthNum">100</div></div>
        <div id="healthBar">
          <div id="healthGhost"></div>
          <div id="healthFill"></div>
          <div id="healthSegs"><i></i><i></i><i></i></div>
        </div>
      </div>
      <div class="dmgArc" id="dmgArc"></div>
      <div id="startScreen">
        <h1>ASHFALL</h1>
        <div class="tagRow"><div class="tag">PROTOCOL</div></div>
        <div class="cta">CLICK OR TAP TO DEPLOY</div>
        <div class="ctaAlt">OR PRESS [ ENTER ]</div>
        <div class="controls">
          <b>W A S D</b> MOVE &nbsp;&nbsp;<b>SHIFT</b> SPRINT &nbsp;&nbsp;<b>C</b> CROUCH / SLIDE &nbsp;&nbsp;<b>SPACE</b> JUMP<br/>
          <b>MOUSE</b> AIM &nbsp;&nbsp;<b>LMB</b> FIRE &nbsp;&nbsp;<b>RMB</b> ADS &nbsp;&nbsp;<b>R</b> RELOAD &nbsp;&nbsp;<b>4</b> AIRSTRIKE
        </div>
      </div>
      <div id="deathScreen"><h1>K.I.A.</h1><div class="rule"></div><div class="cta">[ SPACE ] REDEPLOY</div></div>
    `;
    document.body.appendChild(this.root);

    this.el = {};
    for (const id of ['crosshair', 'hitmarker', 'compassTape', 'compassHeading', 'killCount', 'killfeed',
      'banner', 'subBanner', 'ammoMag', 'ammoReserve', 'streak', 'streakLabel', 'streakPips', 'healthFill',
      'healthGhost', 'healthNum', 'damageVignette', 'lowHealth', 'dmgArc', 'startScreen', 'deathScreen',
      'streakIcon']) {
      this.el[id] = this.root.querySelector('#' + id);
    }
    // Legacy alias kept so external references to the old bar keep resolving.
    this.el.streakFill = this.el.streakPips;

    this.buildCompass();

    const ch = this.el.crosshair;
    this._chLines = { t: ch.querySelector('.t'), b: ch.querySelector('.b'), l: ch.querySelector('.l'), r: ch.querySelector('.r') };
    this._pipEls = [...this.el.streakPips.children];

    this._bannerTimeout = null;
    this.damageFlash = 0;

    // Per-frame DOM write caches
    this._gap = 11;
    this._cache = { ammo: null, reserve: null, kills: null, hp: -1, heading: null, pips: -1, ready: null, label: null, dead: null, vig: -1, low: -1, aimHidden: null };
  }

  buildCompass() {
    // Tape spans -360..720 so any 80° window around 0..360 is covered; the
    // whole strip scrolls with a single transform per frame.
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    const parts = [];
    for (let a = -360; a <= 720; a += 5) {
      const norm = ((a % 360) + 360) % 360;
      const x = (a + 360) * PX_PER_DEG;
      if (norm % 45 === 0) {
        const cls = norm % 90 === 0 ? 'card' : 'inter';
        parts.push(`<div class="cmark ${cls}" style="left:${x}px"><div class="tick"></div><div class="lbl">${names[norm]}</div></div>`);
      } else if (norm % 15 === 0) {
        parts.push(`<div class="cmark deg" style="left:${x}px"><div class="tick"></div><div class="lbl">${String(norm).padStart(3, '0')}</div></div>`);
      } else {
        parts.push(`<div class="cmark t5" style="left:${x}px"><div class="tick"></div></div>`);
      }
    }
    this.el.compassTape.innerHTML = parts.join('');
    this.compassMarks = [...this.el.compassTape.children];
  }

  hideStart() {
    // Kill hit-testing immediately: the overlay keeps fading for 450ms and
    // must not eat clicks (e.g. the re-lock click) while it does.
    this.el.startScreen.style.pointerEvents = 'none';
    this.el.startScreen.style.opacity = '0';
    setTimeout(() => this.el.startScreen.classList.add('hidden'), 450);
  }
  showStart() {
    this.el.startScreen.classList.remove('hidden');
    this.el.startScreen.style.pointerEvents = 'auto';
    this.el.startScreen.style.opacity = '1';
  }

  showDeath(v) {
    if (this._cache.dead === v) return;
    this._cache.dead = v;
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

    // Kill confirmation: pop the eliminations counter.
    const kc = this.el.killCount;
    kc.classList.remove('pop');
    void kc.offsetWidth;
    kc.classList.add('pop');
  }

  banner(text, sub = '', duration = 2600) {
    const b = this.el.banner, s = this.el.subBanner;
    b.textContent = text;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    b.style.opacity = '1';
    s.textContent = sub;
    if (sub) { s.classList.remove('show'); void s.offsetWidth; s.classList.add('show'); }
    s.style.opacity = sub ? '1' : '0';
    clearTimeout(this._bannerTimeout);
    this._bannerTimeout = setTimeout(() => {
      b.style.opacity = '0';
      s.style.opacity = '0';
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
    // state: { yaw, health, maxHealth, ammo, reserve, kills, streakProgress,
    //          streakKillsLeft, streakReady, aiming, spread, dead }
    const c = this._cache;
    const deg = ((-state.yaw * 180 / Math.PI) % 360 + 360) % 360;

    // Compass: scroll the whole tape with one transform.
    const tx = COMPASS_W / 2 - (deg + 360) * PX_PER_DEG;
    this.el.compassTape.style.transform = `translateX(${tx.toFixed(2)}px)`;
    const heading = String(Math.round(deg) % 360).padStart(3, '0');
    if (heading !== c.heading) { c.heading = heading; this.el.compassHeading.textContent = heading; }

    // Crosshair: bloom/movement widen the gap; smoothed so it never jitters.
    const ch = this.el.crosshair;
    const aimHidden = state.aiming > 0.6;
    if (aimHidden !== c.aimHidden) { c.aimHidden = aimHidden; ch.classList.toggle('hidden', aimHidden); }
    const target = 5 + state.spread * 470;
    this._gap += (target - this._gap) * (1 - Math.exp(-16 * dt));
    if (Math.abs(this._gap - (this._gapDrawn || 0)) > 0.05) {
      this._gapDrawn = this._gap;
      const g = this._gap;
      this._chLines.t.style.top = `${-g - 11}px`;
      this._chLines.b.style.top = `${g}px`;
      this._chLines.l.style.left = `${-g - 11}px`;
      this._chLines.r.style.left = `${g}px`;
    }

    // Ammo
    if (state.ammo !== c.ammo) {
      c.ammo = state.ammo;
      this.el.ammoMag.textContent = state.ammo;
      this.el.ammoMag.classList.toggle('low', state.ammo <= 6);
    }
    if (state.reserve !== c.reserve) { c.reserve = state.reserve; this.el.ammoReserve.textContent = state.reserve; }

    // Health: white bar snaps, red ghost trails 300ms behind.
    const hp = clamp(state.health / state.maxHealth, 0, 1);
    if (Math.abs(hp - c.hp) > 0.0005) {
      c.hp = hp;
      const w = `${(hp * 100).toFixed(1)}%`;
      this.el.healthFill.style.width = w;
      this.el.healthGhost.style.width = w;
      this.el.healthNum.textContent = Math.max(0, Math.round(state.health));
      this.el.healthFill.classList.toggle('hurt', hp < 0.35);
    }
    // sqrt ramp: clearly present as soon as health dips below the threshold,
    // saturating toward full vignette near death
    const low = hp < 0.35 ? Math.sqrt(1 - hp / 0.35) * 0.95 : 0;
    if (Math.abs(low - c.low) > 0.004) {
      c.low = low;
      this.el.lowHealth.style.opacity = low.toFixed(3);
      this.el.lowHealth.classList.toggle('active', low > 0);
    }

    // Damage vignette decay
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2);
    const vig = this.damageFlash * 0.85;
    if (Math.abs(vig - c.vig) > 0.004) { c.vig = vig; this.el.damageVignette.style.opacity = vig.toFixed(3); }

    // Kills + streak
    if (state.kills !== c.kills) { c.kills = state.kills; this.el.killCount.textContent = state.kills; }
    const pips = state.streakReady ? 4 : Math.floor(clamp(state.streakProgress, 0, 1) * 4 + 1e-4);
    if (pips !== c.pips) {
      c.pips = pips;
      this._pipEls.forEach((p, i) => p.classList.toggle('on', i < pips));
    }
    if (state.streakReady !== c.ready) { c.ready = state.streakReady; this.el.streak.classList.toggle('ready', state.streakReady); }
    const label = state.streakReady ? 'AIRSTRIKE READY — [4]' : `AIRSTRIKE — ${state.streakKillsLeft} MORE`;
    if (label !== c.label) { c.label = label; this.el.streakLabel.textContent = label; }

    this.showDeath(state.dead);
  }
}
