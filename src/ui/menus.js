import { ensureStyles } from './styles.js';
import { icons } from './icons.js';

const TIPS = [
  'SLIDE: SPRINT, THEN TAP [C] — MOMENTUM IS ARMOR',
  'HEADSHOTS PAY +50 SCORE. AIM FOR THE HELMET',
  'A 5-KILL STREAK ARMS AN AIRSTRIKE — PRESS [4] AND PAINT THE GRID',
  'SWAPPING TO YOUR M1911 IS ALWAYS FASTER THAN RELOADING',
  'WATCH THE MINIMAP — HOSTILES FLASH RED WHEN THEY FIRE',
  'FRAGS COOK FOR 2.6 SECONDS. BANK THEM OFF WALLS',
];

const CONTROLS = [
  ['W A S D', 'MOVE'], ['SHIFT', 'SPRINT'], ['SPACE', 'JUMP'], ['C', 'CROUCH / SLIDE'],
  ['MOUSE', 'AIM'], ['RMB', 'ADS'], ['R', 'RELOAD'], ['G', 'FRAG'],
  ['1 · 2', 'WEAPONS'], ['4', 'AIRSTRIKE'], ['TAB', 'SCOREBOARD'], ['ESC', 'PAUSE'],
];

/**
 * Loading / main / pause / game-over screens.
 * Public contract (used by main.js): showLoading(), hideLoading(), showMain(onDeploy),
 * showPause(onResume), hideAll().
 *
 * Game-over wiring: on 'game:over' we show the VICTORY/DEFEAT panel and release pointer
 * lock. main.js's pointerlockchange handler then calls showPause(onResume) — while the
 * game-over panel is up we swallow that call and reuse its onResume for the REDEPLOY
 * button, so REDEPLOY = exactly the pause-resume flow (unpause + re-lock pointer).
 *
 * Dev/demo: ?uidemo=loading|main|pause|gameover|defeat forces that screen with fake
 * data and latches it (all API calls become no-ops) for screenshots.
 */
export class Menus {
  constructor(game) {
    this.game = game;
    ensureStyles();

    const el = document.createElement('div');
    el.id = 'menus';
    const bg = `<div class="slate"></div><div class="scan"></div><div class="grain"></div><div class="vig"></div>`;
    const controlsGrid = CONTROLS.map(
      ([k, act]) => `<div class="pair"><span class="act">${act}</span><span class="k">${k}</span></div>`
    ).join('');

    el.innerHTML = `
      <div class="screen loading">${bg}
        <div class="col">
          <div class="eyebrow">CLASSIFIED // SPEC-OPS</div>
          <div class="title">OPERATION BLACKSITE</div>
          <div class="rule"></div>
          <div class="lbar">
            <div class="track"><div class="fill"></div></div>
            <div class="meta"><span class="lbl">INITIALIZING THEATER</span><span class="pct">0%</span></div>
          </div>
        </div>
        <div class="tip"><b>TIP</b><span></span></div>
        <div class="stamp">BLACKSITE 1.0 // BUILD 2026</div>
      </div>

      <div class="screen main">${bg}
        <div class="col">
          <div class="eyebrow">CLASSIFIED // SPEC-OPS</div>
          <div class="title">OPERATION BLACKSITE</div>
          <div class="rule"></div>
          <div class="mode">URBAN WARFARE · TEAM DEATHMATCH</div>
          <div style="height:38px"></div>
          <button class="deploy">DEPLOY</button>
          <div class="loadout">
            <div class="card">${icons.rifle(44)}<span class="nm">M4A1</span><span class="role">PRIMARY</span></div>
            <div class="card">${icons.pistol(30)}<span class="nm">M1911</span><span class="role">SIDEARM</span></div>
            <div class="card">${icons.frag(16)}<span class="nm">FRAG \u00d74</span><span class="role">LETHAL</span></div>
          </div>
          <div class="controls">${controlsGrid}</div>
        </div>
        <div class="corner">CLEARANCE // LEVEL 3</div>
        <div class="stamp">BLACKSITE 1.0 // BUILD 2026</div>
      </div>

      <div class="screen pause">
        <div class="blur"></div><div class="vig"></div>
        <div class="col">
          <div class="eyebrow">OPERATION BLACKSITE</div>
          <div class="title">PAUSED</div>
          <div class="rule"></div>
          <div class="scoreline">
            <span>SCORE<b class="p-sc">0</b></span><span>KILLS<b class="p-k">0</b></span><span>TIME<b class="p-t">00:00</b></span>
          </div>
          <div style="height:30px"></div>
          <button class="resume">RESUME</button>
          <div class="controls">${controlsGrid}</div>
        </div>
        <div class="stamp">BLACKSITE 1.0 // BUILD 2026</div>
      </div>

      <div class="screen gameover">
        <div class="blur"></div><div class="slate" style="opacity:.86"></div><div class="grain"></div><div class="vig"></div>
        <div class="col">
          <div class="eyebrow go-sub">HOSTILE FORCES ELIMINATED</div>
          <div class="verdict win">VICTORY</div>
          <div class="rule"></div>
          <div class="stats">
            <div class="stat"><div class="v go-k">0</div><div class="l">KILLS</div></div>
            <div class="stat"><div class="v go-d">0</div><div class="l">DEATHS</div></div>
            <div class="stat"><div class="v go-kd">0.0</div><div class="l">K/D</div></div>
            <div class="stat"><div class="v go-sc">0</div><div class="l">SCORE</div></div>
            <div class="stat"><div class="v go-t">00:00</div><div class="l">TIME</div></div>
          </div>
          <div style="height:26px"></div>
          <button class="redeploy">REDEPLOY</button>
        </div>
        <div class="stamp">BLACKSITE 1.0 // BUILD 2026</div>
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;
    this.$ = (s) => el.querySelector(s);

    this._tipIdx = 0;
    this._tipTimer = null;
    this._gameOver = false;
    this._pauseResume = null;

    // demo latch (screenshots)
    const q = new URLSearchParams(location.search);
    const ud = q.get('uidemo') || '';
    this.demo = ['loading', 'main', 'pause', 'gameover', 'defeat'].includes(ud) ? ud : null;

    this.game.assets.onProgress((p) => {
      if (this.demo) return;
      this.$('.lbar .fill').style.width = `${Math.round(p * 100)}%`;
      this.$('.lbar .pct').textContent = `${Math.round(p * 100)}%`;
    });

    this.game.events.on('game:over', ({ victory }) => this._showGameOver(!!victory));

    if (this.demo) this._showDemo(ud);
  }

  // ---------------- public API (kept exact) ----------------
  showLoading() { if (this.demo) return; this._show('loading'); this._startTips(); }
  hideLoading() { if (this.demo) return; this.$('.loading').classList.remove('on'); this._stopTips(); }

  showMain(onDeploy) {
    if (this.demo) return;
    this._show('main');
    const b = this.$('.deploy');
    b.onclick = () => { this.hideAll(); onDeploy(); };
    b.focus();
  }

  showPause(onResume) {
    if (this.demo) return;
    this._pauseResume = onResume;
    if (this._gameOver) return; // game-over panel stays up; REDEPLOY reuses onResume
    this._show('pause');
    const st = this.game.state;
    this.$('.p-sc').textContent = st?.score ?? 0;
    this.$('.p-k').textContent = st?.kills ?? 0;
    this.$('.p-t').textContent = fmtTime(this.game.time);
    const b = this.$('.resume');
    b.onclick = () => { this.hideAll(); onResume(); };
    b.focus();
  }

  hideAll() {
    if (this.demo) return;
    this.el.querySelectorAll('.screen').forEach((s) => s.classList.remove('on'));
    this._stopTips();
  }

  // ---------------- game over ----------------
  _showGameOver(victory) {
    if (this.demo) return;
    this._gameOver = true;
    this._fillGameOver(victory, this.game.state, this.game.time);
    this._show('gameover');
    this.game.hud?.hide(); // match ended: results screen owns the frame
    this.game.input.exitPointerLock(); // frees the mouse; main.js will pause via pointerlockchange
    const b = this.$('.redeploy');
    b.onclick = () => {
      this._gameOver = false;
      this.hideAll();
      this.game.hud?.show();
      if (this._pauseResume) this._pauseResume();
      else { this.game.paused = false; this.game.input.requestPointerLock(); }
    };
    b.focus();
  }

  _fillGameOver(victory, st, time) {
    const v = this.$('.gameover .verdict');
    v.textContent = victory ? 'VICTORY' : 'DEFEAT';
    v.classList.toggle('win', victory);
    v.classList.toggle('loss', !victory);
    this.$('.go-sub').textContent = victory ? 'HOSTILE FORCES ELIMINATED' : 'OPERATION FAILED — SQUAD WIPED';
    this.$('.go-k').textContent = st.kills;
    this.$('.go-d').textContent = st.deaths;
    this.$('.go-kd').textContent = (st.kills / Math.max(1, st.deaths)).toFixed(1);
    this.$('.go-sc').textContent = st.score;
    this.$('.go-t').textContent = fmtTime(time);
  }

  // ---------------- internals ----------------
  _show(name) {
    this.el.querySelectorAll('.screen').forEach((s) => s.classList.remove('on'));
    this.$(`.${name}`).classList.add('on');
  }

  _startTips() {
    const set = () => {
      this.$('.tip span').textContent = TIPS[this._tipIdx % TIPS.length];
      this._tipIdx++;
    };
    set();
    this._tipTimer = setInterval(() => {
      const t = this.$('.tip');
      t.style.opacity = '0';
      setTimeout(() => { set(); t.style.opacity = '1'; }, 300);
    }, 3400);
  }
  _stopTips() { clearInterval(this._tipTimer); this._tipTimer = null; }

  _showDemo(which) {
    if (which === 'loading') {
      this._show('loading');
      this.$('.tip span').textContent = TIPS[2]; // fixed tip: deterministic screenshots
      this.$('.lbar .fill').style.width = '62%';
      this.$('.lbar .pct').textContent = '62%';
    } else if (which === 'main') {
      this._show('main');
    } else if (which === 'pause') {
      this._show('pause');
      this.$('.p-sc').textContent = '1250';
      this.$('.p-k').textContent = '8';
      this.$('.p-t').textContent = '04:12';
    } else {
      const victory = which !== 'defeat';
      this._fillGameOver(victory, { kills: 12, deaths: 3, score: 1675 }, 372);
      this._show('gameover');
      const tryHide = () => (this.game.hud ? this.game.hud.hide() : setTimeout(tryHide, 120));
      tryHide();
    }
    // signal the screenshot tool once fonts have settled
    const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => { window.__UIDEMO_READY__ = true; }));
    (document.fonts?.ready ?? Promise.resolve()).then(ready, ready);
  }
}

function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
