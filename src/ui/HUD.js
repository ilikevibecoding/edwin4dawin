import * as THREE from 'three';
import { el, setText, setClass, setStyle, clamp, formatTime } from './dom.js';
import { RIFLE, KNIFE, SOLDIER, JET, PORTRAIT } from './icons.js';
import { callsignFor } from './callsigns.js';
import { Minimap } from './Minimap.js';
import { KillFeed } from './KillFeed.js';
import { ObjectiveMarker } from './ObjectiveMarker.js';
import { DamageIndicators } from './DamageIndicators.js';

/**
 * In-game HUD (DOM, styled in src/styles/hud.css). Layout and feel follow Black Ops 4:
 *
 *   top-left      rotating circular minimap + team score strip + match timer
 *   top-center    notices (wave incoming, air strike inbound) — banner (match start, killstreak ready) above center
 *   top-right     kill feed
 *   center        dynamic crosshair, hitmarker, capture progress bar, score popups (center-right),
 *                 world-space objective marker, directional damage arcs, low-health vignette
 *   bottom-left   player card (portrait, segmented health, score)
 *   bottom-center [X] AIR STRIKE (kill progress ring) · [E] MELEE · showMessage() line above
 *   bottom-right  ammo (mag | reserve, weapon name, fire mode, rifle silhouette, RELOAD prompt) + knife slot
 *
 * Interface: update(dt) · toggle() · setVisible(bool) · root · showMessage(text, duration)
 *            showBanner(title, sub, duration, tone) · notify(title, sub) · stats · demo(kind)
 * Listens to: weapon:ammo/fire/reload:*, player:health/damaged/died/respawn, ui:hitmarker, enemy:damaged/killed,
 *             score, objective:progress, match:time/end, wave, killstreak:ready/targeting/called, explosion, game:state
 */
export class HUD {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.root = game.hudRoot;
    this.visible = true;
    this.t = 0; // UI clock (advances in every state; fixed-step in shot mode)
    this.u = window.innerHeight / 1080; // 1 "unit" = 1px at 1080p

    this.stats = { kills: 0, headshots: 0, deaths: 0, streak: 0, bestStreak: 0, score: 0, killedBy: null };
    this.s = {
      ammo: 30, magSize: 30, reserve: 180,
      reloading: false, reloadStart: 0, reloadDur: 0,
      health: 100, maxHealth: 100, regen: false,
      teamScore: { blue: 0, red: 0 }, timeRemaining: 600,
      obj: { progress: 0, owner: null, contested: false, playerIn: false, trend: 0 },
      targeting: false, kick: 0, gapPx: -1,
      matchStarted: false,
    };
    this._segments = new Array(10).fill(-1);
    this._popups = [];
    this._hit = { t0: -10, kill: false, headshot: false, frame: -1 };
    this._banner = null;
    this._notice = null;
    this._noticeQueue = [];
    this._message = null;
    this._lastExplosion = null;
    this._mapImageFrame = 0;

    this._build();
    this.minimap = new Minimap(game, this.el.mmCanvas, this.el.mmNorth);
    this.killfeed = new KillFeed(game, this.el.killfeed);
    this.objMarker = new ObjectiveMarker(game, this.el.objmarker);
    this.damage = new DamageIndicators(game, this.el.dmgCanvas, this.el.flash);
    this._bind();
    this._applyHealth(game.player?.health ?? 100, game.player?.maxHealth ?? 100);
    this._updateAmmo();

    this.events.on('game:ready', () => {
      try {
        this.minimap.prepare();
      } catch (err) {
        console.warn('[ui] minimap prepare failed', err);
      }
      this._registerDebugViews();
    });
    this.setVisible(game.state === 'playing');
  }

  // ------------------------------------------------------------------ DOM

  _build() {
    const seg = '<i></i>'.repeat(10);
    this.root.innerHTML = `
      <div class="hud-fx">
        <div class="hud-fx__vignette"></div>
        <div class="hud-fx__flash"></div>
        <canvas class="hud-fx__damage"></canvas>
      </div>

      <div class="hud-tl">
        <div class="minimap">
          <div class="minimap__ring"><canvas class="minimap__canvas"></canvas></div>
          <i class="minimap__tick minimap__tick--n"></i><i class="minimap__tick minimap__tick--e"></i>
          <i class="minimap__tick minimap__tick--s"></i><i class="minimap__tick minimap__tick--w"></i>
          <div class="minimap__north">N</div>
        </div>
        <div class="score">
          <div class="score__row">
            <div class="score__team score__team--blue"><span class="score__icon">${SOLDIER}</span><span class="score__num" data-ref="scoreBlue">0</span></div>
            <div class="score__team score__team--red"><span class="score__icon">${SOLDIER}</span><span class="score__num" data-ref="scoreRed">0</span></div>
          </div>
          <div class="score__timer" data-ref="timer">10:00</div>
        </div>
      </div>

      <div class="hud-tr"><div class="killfeed" data-ref="killfeed"></div></div>

      <div class="notice" data-ref="notice"><div class="notice__title" data-ref="noticeTitle"></div><div class="notice__sub" data-ref="noticeSub"></div></div>

      <div class="banner" data-ref="banner">
        <div class="banner__title" data-ref="bannerTitle"></div>
        <div class="banner__rule"></div>
        <div class="banner__sub" data-ref="bannerSub"></div>
      </div>

      <div class="hud-center">
        <div class="crosshair" data-ref="crosshair">
          <i class="crosshair__l crosshair__l--t"></i><i class="crosshair__l crosshair__l--b"></i>
          <i class="crosshair__l crosshair__l--l"></i><i class="crosshair__l crosshair__l--r"></i>
          <i class="crosshair__dot"></i>
        </div>
        <div class="hitmarker" data-ref="hitmarker"><i></i><i></i><i></i><i></i></div>
        <div class="capture" data-ref="capture">
          <div class="capture__label" data-ref="captureLabel">CAPTURING B</div>
          <div class="capture__bar"><div class="capture__fill" data-ref="captureFill"></div></div>
        </div>
        <div class="popups" data-ref="popups"></div>
      </div>

      <div class="objmarker objmarker--gold" data-ref="objmarker">
        <div class="objmarker__label">CAPTURE</div>
        <div class="objmarker__icon">
          <svg viewBox="0 0 40 44" aria-hidden="true"><path class="objmarker__hex" d="M20 1.5l17 9.8v21.4L20 42.5 3 32.7V11.3z"/></svg>
          <span class="objmarker__letter">B</span>
        </div>
        <div class="objmarker__dist">0 M</div>
      </div>

      <div class="hud-bl">
        <div class="card" data-ref="card">
          <div class="card__portrait">${PORTRAIT}</div>
          <div class="card__body">
            <div class="card__name">PLAYER</div>
            <div class="card__health" data-ref="health">${seg}</div>
          </div>
          <div class="card__score" data-ref="cardScore">0</div>
        </div>
      </div>

      <div class="hud-bc">
        <div class="slots">
          <div class="slot slot--streak" data-ref="slotStreak">
            <div class="slot__key">X</div>
            <div class="slot__box">
              <svg class="slot__ring" viewBox="0 0 40 40" aria-hidden="true">
                <circle class="slot__ring-bg" cx="20" cy="20" r="17.5"/>
                <circle class="slot__ring-fg" data-ref="ring" cx="20" cy="20" r="17.5"/>
              </svg>
              <span class="slot__icon">${JET}</span>
              <span class="slot__count" data-ref="streakCount">0/5</span>
            </div>
            <div class="slot__label" data-ref="streakLabel">AIR STRIKE</div>
          </div>
          <div class="slot slot--melee">
            <div class="slot__key">E</div>
            <div class="slot__box"><span class="slot__icon">${KNIFE}</span></div>
            <div class="slot__label">MELEE</div>
          </div>
        </div>
      </div>

      <div class="hud-message" data-ref="message"></div>

      <div class="hud-br">
        <div class="equip"><span class="equip__icon">${KNIFE}</span><span class="equip__label">KNIFE</span></div>
        <div class="ammo" data-ref="ammo">
          <div class="ammo__prompt" data-ref="ammoPrompt"><span data-ref="ammoPromptText">RELOAD [R]</span><i class="ammo__reloadbar"><b data-ref="reloadFill"></b></i></div>
          <div class="ammo__counts"><span class="ammo__mag" data-ref="mag">30</span><i class="ammo__sep"></i><span class="ammo__reserve" data-ref="reserve">180</span></div>
          <div class="ammo__meta"><span class="ammo__name" data-ref="weaponName">M4A1</span><span class="ammo__mode" data-ref="fireMode">AUTO</span></div>
          <div class="ammo__icon">${RIFLE}</div>
        </div>
      </div>
    `;
    const refs = {};
    for (const node of this.root.querySelectorAll('[data-ref]')) refs[node.dataset.ref] = node;
    refs.mmCanvas = this.root.querySelector('.minimap__canvas');
    refs.mmNorth = this.root.querySelector('.minimap__north');
    refs.dmgCanvas = this.root.querySelector('.hud-fx__damage');
    refs.flash = this.root.querySelector('.hud-fx__flash');
    refs.segments = Array.from(refs.health.children);
    this.el = refs;
  }

  // ------------------------------------------------------------------ events

  _bind() {
    const on = (n, f) => this.events.on(n, f);
    const s = this.s;

    on('game:state', ({ state, prev }) => {
      this.setVisible(state === 'playing');
      if (state === 'playing' && prev === 'menu' && !s.matchStarted) {
        s.matchStarted = true;
        this.showMatchStart();
      }
      if (state === 'playing') this.damage.flash = 0;
    });

    on('weapon:ammo', (e) => {
      s.ammo = e.ammo ?? s.ammo;
      s.magSize = e.magSize ?? s.magSize;
      s.reserve = e.reserve ?? s.reserve;
      this._updateAmmo();
    });
    on('weapon:fire', () => {
      s.kick = Math.min(1, s.kick + 0.3);
    });
    on('weapon:reload:start', (e) => {
      s.reloading = true;
      s.reloadStart = this.t;
      s.reloadDur = Math.max(0.2, e?.duration || 2);
      this._updateAmmo();
    });
    on('weapon:reload:end', () => {
      s.reloading = false;
      this._updateAmmo();
    });
    on('weapon:empty', () => {
      s.kick = Math.min(1, s.kick + 0.15);
    });

    on('player:health', ({ health, max }) => this._applyHealth(health, max ?? s.maxHealth));
    on('player:damaged', ({ amount, from, health }) => {
      this.damage.add(from || null, amount || 20);
      s.regen = false;
      if (health != null) this._applyHealth(health, s.maxHealth);
    });
    on('player:died', ({ from }) => {
      this.stats.deaths++;
      this.stats.streak = 0;
      this.stats.killedBy = this._killerName(from);
      this.killfeed.push({ killer: this.stats.killedBy, killerTeam: 'red', victim: 'PLAYER', victimTeam: 'blue', cause: this._causeFor(from) }, this.t);
    });
    on('player:respawn', () => {
      s.regen = false;
      this.damage.list.length = 0;
      this.damage.flash = 0;
      this._applyHealth(this.game.player?.health ?? 100, this.game.player?.maxHealth ?? 100);
    });

    on('ui:hitmarker', ({ headshot, kill } = {}) => this._hitmarker(!!headshot, !!kill));
    on('enemy:damaged', (e) => {
      if (e?.source === 'player') this._hitmarker(!!e.headshot, false);
    });
    on('enemy:killed', (e) => {
      if (!e) return;
      if (e.source === 'player') {
        this._hitmarker(!!e.headshot, true);
        this.stats.kills++;
        this.stats.streak++;
        this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak);
        if (e.headshot) this.stats.headshots++;
        this.killfeed.push({ killer: 'PLAYER', killerTeam: 'blue', victim: callsignFor(e.enemy), victimTeam: 'red', cause: e.cause || 'bullet', headshot: !!e.headshot }, this.t);
      } else if (e.source && e.source !== 'enemy') {
        this.killfeed.push({ killer: String(e.source).toUpperCase(), killerTeam: 'neutral', victim: callsignFor(e.enemy), victimTeam: 'red', cause: e.cause || 'bullet', headshot: !!e.headshot }, this.t);
      }
    });

    on('score', ({ points, reason, total }) => {
      if (total != null) {
        this.stats.score = total;
        setText(this.el.cardScore, total);
      }
      if (points) this._popup(points, reason);
    });

    on('objective:progress', (e) => {
      const o = s.obj;
      o.trend = e.progress - o.progress;
      o.progress = e.progress;
      o.owner = e.owner;
      o.contested = !!e.contested;
      o.playerIn = !!e.playerIn;
      this.minimap.setObjectiveState(o.owner, o.contested);
    });

    on('match:time', ({ remaining, teamScore }) => {
      if (remaining != null) {
        s.timeRemaining = remaining;
        setText(this.el.timer, formatTime(remaining));
        setClass(this.el.timer, 'score__timer--low', remaining <= 30);
      }
      if (teamScore) {
        s.teamScore = teamScore;
        setText(this.el.scoreBlue, teamScore.blue ?? 0);
        setText(this.el.scoreRed, teamScore.red ?? 0);
      }
    });
    on('match:end', (e) => {
      this.matchResult = e;
    });
    on('wave', ({ index, count }) => this.notify(`WAVE ${index} INCOMING`, `${count} HOSTILES APPROACHING`));

    on('killstreak:ready', () => this.showBanner('AIR STRIKE READY', 'PRESS [X] TO CALL IN', 3, 'gold'));
    on('killstreak:targeting', ({ active }) => {
      s.targeting = !!active;
    });
    on('killstreak:called', () => this.notify('AIR STRIKE INBOUND', 'CLEAR THE TARGET AREA', 'gold'));
    on('explosion', (e) => {
      this._lastExplosion = { position: e.position?.clone?.() || null, t: this.t, kind: e.kind };
    });
  }

  // ------------------------------------------------------------------ public API

  setVisible(v) {
    this.visible = !!v;
    this.root.style.display = v ? '' : 'none';
  }

  toggle() {
    this.setVisible(!this.visible);
  }

  /** Bottom-center message line (e.g. interaction prompts). */
  showMessage(text, duration = 2.5) {
    if (!text) {
      this._message = null;
      setStyle(this.el.message, 'opacity', '0');
      return;
    }
    setText(this.el.message, text);
    this._message = { start: this.t, until: this.t + duration };
  }

  /** Large center banner (match start, killstreak ready). tone: 'white' | 'gold' | 'blue' | 'red'. */
  showBanner(title, sub = '', duration = 3, tone = 'white') {
    setText(this.el.bannerTitle, title);
    setText(this.el.bannerSub, sub);
    const b = this.el.banner;
    b.className = `banner banner--${tone}`;
    this._banner = { start: this.t, until: this.t + duration };
  }

  showMatchStart() {
    const obj = this.game.world?.getObjective?.();
    const name = obj?.name || 'B';
    this.showBanner('DOMINATION', `HOLD ${name} — CAPTURE AND DEFEND THE OBJECTIVE`, 3.2, 'white');
  }

  /** Top-center notice line (wave incoming, air strike inbound). Queued, 3 s each. */
  notify(title, sub = '', tone = 'white') {
    this._noticeQueue.push({ title, sub, tone });
    if (this._noticeQueue.length > 4) this._noticeQueue.shift();
  }

  // ------------------------------------------------------------------ frame update

  update(dt) {
    if (!(dt > 0)) dt = 1 / 60;
    this.t += dt;
    this.u = window.innerHeight / 1080;
    const { game, s } = this;
    if (!this.visible) return;

    this.minimap.update();
    this._updateCrosshair(dt);
    this._updateHitmarker();
    this._updateObjective();
    this.damage.update(dt);
    this._updatePopups();
    this._updateBanner();
    this._updateNotice();
    this._updateMessage();
    this._updateKillstreak();
    this._updateReload();
    this.killfeed.update(this.t);
    if (game.frame % 15 === 0) this._updateWeaponMeta();
    if (s.regen && game.player && game.player.health >= game.player.maxHealth) {
      s.regen = false;
      setClass(this.el.health, 'card__health--regen', false);
    }
  }

  _updateCrosshair(dt) {
    const { game, s } = this;
    const player = game.player;
    const weapon = game.weapons?.current;
    s.kick = Math.max(0, s.kick - dt * 3.5);
    const hidden = !game.isPlaying || !player?.alive || !!weapon?.isAiming || s.targeting || game.debug?.isFreeCam || game.render?.hudVisible === false;
    setClass(this.el.crosshair, 'is-hidden', hidden);
    if (hidden) return;
    const speed = player?.speedFactor || 0;
    const air = player && !player.isGrounded ? 1 : 0;
    const crouch = player?.isCrouching ? -2 : 0;
    const gapU = 5 + speed * 11 + s.kick * 12 + air * 5 + crouch;
    const gapPx = Math.round(gapU * this.u * 2) / 2;
    if (gapPx !== s.gapPx) {
      s.gapPx = gapPx;
      this.el.crosshair.style.setProperty('--gap', `${gapPx}px`);
    }
  }

  _hitmarker(headshot, kill) {
    const h = this._hit;
    const frame = this.game.frame;
    if (h.frame === frame) {
      // Merge duplicates raised by different systems in the same frame (ui:hitmarker + enemy:damaged).
      h.kill = h.kill || kill;
      h.headshot = h.headshot || headshot;
    } else {
      h.frame = frame;
      h.kill = kill;
      h.headshot = headshot;
    }
    h.t0 = this.t;
    setClass(this.el.hitmarker, 'hitmarker--kill', h.kill);
    setClass(this.el.hitmarker, 'hitmarker--hs', h.headshot);
  }

  _updateHitmarker() {
    const h = this._hit;
    const age = this.t - h.t0;
    const life = h.kill ? 0.5 : 0.35;
    const elx = this.el.hitmarker;
    if (age > life) {
      setStyle(elx, 'opacity', '0');
      return;
    }
    // 120 ms punch: scale 1.35 → 1, then hold and fade.
    const punch = age < 0.12 ? 1.35 - (age / 0.12) * 0.35 : 1;
    const fade = age > life * 0.55 ? 1 - (age - life * 0.55) / (life * 0.45) : 1;
    const base = h.headshot ? 1.2 : 1;
    setStyle(elx, 'opacity', fade.toFixed(2));
    setStyle(elx, 'transform', `translate(-50%,-50%) scale(${(punch * base).toFixed(3)})`);
  }

  _updateObjective() {
    const { game, s } = this;
    const o = s.obj;
    const obj = game.world?.getObjective?.();
    if (!obj) {
      this.objMarker.update();
      return;
    }
    const name = obj.name || 'B';
    // Enemies near the objective (for DEFEND / LOSING).
    let enemiesIn = 0;
    let enemiesNear = 0;
    const list = game.enemies?.list;
    if (list) {
      const r = obj.radius || 5;
      for (const e of list) {
        if (!e.alive) continue;
        const d = e.position.distanceTo(obj.position);
        if (d < r) enemiesIn++;
        if (d < r * 2.2) enemiesNear++;
      }
    }
    let label;
    let tone;
    if (o.owner === 'blue') {
      if (o.trend < -1e-6 || (o.progress < 0.999 && enemiesIn > 0)) {
        label = 'LOSING';
        tone = 'red';
      } else if (enemiesNear > 0) {
        label = 'DEFEND';
        tone = 'blue';
      } else {
        label = 'SECURED';
        tone = 'blue';
      }
    } else if (o.owner === 'red') {
      label = o.contested ? 'CONTESTED' : o.playerIn ? (o.progress < 0 ? 'NEUTRALIZING' : 'CAPTURING') : 'CAPTURE';
      tone = 'red';
    } else {
      label = o.contested ? 'CONTESTED' : o.playerIn ? (o.progress < 0 ? 'NEUTRALIZING' : 'CAPTURING') : 'CAPTURE';
      tone = 'gold';
    }
    this.objMarker.setLabel(label, tone);
    this.objMarker.enabled = game.isPlaying || game.state === 'dead';
    this.objMarker.update();

    // Capture bar under the crosshair.
    const captured = o.owner === 'blue' && o.progress >= 0.999 && !o.contested && o.trend >= 0;
    const show = o.playerIn && !captured && game.isPlaying && game.player?.alive;
    setClass(this.el.capture, 'is-shown', show);
    if (show) {
      const cap = this.el.capture;
      const neutralizing = o.progress < 0;
      const text = o.contested ? 'CONTESTED' : neutralizing ? `NEUTRALIZING ${name}` : `CAPTURING ${name}`;
      setText(this.el.captureLabel, text);
      setClass(cap, 'capture--red', neutralizing && !o.contested);
      setClass(cap, 'capture--contested', o.contested);
      const fill = neutralizing ? -o.progress : o.progress;
      setStyle(this.el.captureFill, 'width', `${(clamp(fill, 0, 1) * 100).toFixed(1)}%`);
    }
  }

  _popup(points, reason) {
    const sign = points > 0 ? '+' : '';
    const node = el(`<div class="popup"><span class="popup__pts">${sign}${points}</span><span class="popup__reason">${escapeHtml(reason || '')}</span></div>`);
    this.el.popups.appendChild(node);
    // Newest entry sits at the anchor; older entries are pushed up a row (COD stacks score events).
    for (const p of this._popups) p.stack += 1;
    this._popups.push({ el: node, t0: this.t, stack: 0 });
  }

  _updatePopups() {
    const u = this.u;
    for (let i = this._popups.length - 1; i >= 0; i--) {
      const p = this._popups[i];
      const age = this.t - p.t0;
      if (age > 1.5) {
        p.el.remove();
        this._popups.splice(i, 1);
        continue;
      }
      const rise = age * 24 * u + p.stack * 28 * u;
      const op = age < 0.08 ? age / 0.08 : age > 1.0 ? 1 - (age - 1.0) / 0.5 : 1;
      const sc = age < 0.12 ? 1.25 - (age / 0.12) * 0.25 : 1;
      setStyle(p.el, 'transform', `translate3d(0, ${(-rise).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`);
      setStyle(p.el, 'opacity', clamp(op, 0, 1).toFixed(2));
    }
  }

  _updateBanner() {
    const b = this._banner;
    const node = this.el.banner;
    if (!b) return;
    const age = this.t - b.start;
    const left = b.until - this.t;
    if (left <= -0.05) {
      this._banner = null;
      setStyle(node, 'opacity', '0');
      return;
    }
    const pin = clamp(age / 0.4, 0, 1);
    const pout = clamp(left / 0.35, 0, 1);
    const ease = 1 - Math.pow(1 - pin, 3);
    const op = Math.min(ease, pout);
    const slide = (1 - ease) * -70 * this.u;
    setStyle(node, 'opacity', op.toFixed(2));
    setStyle(node, 'transform', `translate(-50%,-50%) translate3d(${slide.toFixed(1)}px,0,0)`);
    setStyle(this.el.bannerSub, 'opacity', clamp((age - 0.25) / 0.35, 0, 1).toFixed(2));
  }

  _updateNotice() {
    const node = this.el.notice;
    if (!this._notice && this._noticeQueue.length) {
      const n = this._noticeQueue.shift();
      setText(this.el.noticeTitle, n.title);
      setText(this.el.noticeSub, n.sub || '');
      node.className = `notice notice--${n.tone || 'white'}`;
      this._notice = { start: this.t, until: this.t + 3 };
    }
    const n = this._notice;
    if (!n) return;
    const age = this.t - n.start;
    const left = n.until - this.t;
    if (left <= -0.05) {
      this._notice = null;
      setStyle(node, 'opacity', '0');
      return;
    }
    const pin = clamp(age / 0.3, 0, 1);
    const pout = clamp(left / 0.3, 0, 1);
    const ease = 1 - Math.pow(1 - pin, 2);
    setStyle(node, 'opacity', Math.min(ease, pout).toFixed(2));
    setStyle(node, 'transform', `translate(-50%, ${((1 - ease) * -16 * this.u).toFixed(1)}px)`);
  }

  _updateMessage() {
    const m = this._message;
    if (!m) return;
    const left = m.until - this.t;
    const age = this.t - m.start;
    if (left <= 0) {
      this._message = null;
      setStyle(this.el.message, 'opacity', '0');
      return;
    }
    setStyle(this.el.message, 'opacity', Math.min(clamp(age / 0.2, 0, 1), clamp(left / 0.3, 0, 1)).toFixed(2));
  }

  _updateKillstreak() {
    const ks = this.game.killstreaks;
    const kills = ks?.kills ?? 0;
    const req = ks?.killsRequired ?? 5;
    const air = ks?.airstrike;
    const available = !!air?.available;
    const state = air?.state || 'idle';
    const slot = this.el.slotStreak;
    const ready = available && state === 'idle';
    const busy = state === 'targeting' || state === 'inbound';
    setClass(slot, 'slot--ready', ready);
    setClass(slot, 'slot--busy', busy);
    const frac = available ? 1 : clamp(kills / Math.max(1, req), 0, 1);
    const C = 2 * Math.PI * 17.5;
    const off = (C * (1 - frac)).toFixed(1);
    setStyle(this.el.ring, 'strokeDashoffset', off);
    setText(this.el.streakLabel, ready ? 'READY' : busy ? (state === 'targeting' ? 'TARGETING' : 'INBOUND') : 'AIR STRIKE');
    setText(this.el.streakCount, ready || busy ? '' : `${kills}/${req}`);
  }

  _updateAmmo() {
    const s = this.s;
    setText(this.el.mag, s.ammo);
    setText(this.el.reserve, s.reserve);
    const low = s.ammo <= 5;
    const empty = s.ammo <= 0;
    const node = this.el.ammo;
    setClass(node, 'ammo--low', low && !s.reloading);
    setClass(node, 'ammo--empty', empty && !s.reloading);
    setClass(node, 'ammo--reloading', s.reloading);
    const prompt = s.reloading ? 'RELOADING' : empty && s.reserve <= 0 ? 'NO AMMO' : 'RELOAD [R]';
    setText(this.el.ammoPromptText, prompt);
  }

  _updateReload() {
    const s = this.s;
    if (!s.reloading) return;
    const p = clamp((this.t - s.reloadStart) / s.reloadDur, 0, 1);
    setStyle(this.el.reloadFill, 'width', `${(p * 100).toFixed(0)}%`);
  }

  _updateWeaponMeta() {
    const w = this.game.weapons?.current;
    setText(this.el.weaponName, (w?.name || 'M4A1').toUpperCase());
    setText(this.el.fireMode, (w?.fireMode || w?.mode || 'AUTO').toUpperCase());
  }

  _applyHealth(health, max) {
    const s = this.s;
    const prev = s.health;
    s.health = health;
    s.maxHealth = max || 100;
    const frac = clamp(s.health / s.maxHealth, 0, 1);
    const n = this._segments.length;
    for (let i = 0; i < n; i++) {
      const f = clamp((frac * n - i), 0, 1);
      const q = Math.round(f * 20) / 20;
      if (this._segments[i] !== q) {
        this._segments[i] = q;
        this.el.segments[i].style.setProperty('--f', q);
      }
    }
    const low = frac < 0.4 && frac > 0;
    setClass(this.root, 'hud--low', low);
    setClass(this.root, 'hud--critical', frac < 0.2 && frac > 0);
    setClass(this.el.card, 'card--low', low);
    if (health > prev && health < s.maxHealth) {
      s.regen = true;
      setClass(this.el.health, 'card__health--regen', true);
    } else if (health >= s.maxHealth || health <= prev) {
      s.regen = false;
      setClass(this.el.health, 'card__health--regen', false);
    }
  }

  _killerName(from) {
    if (!from) return 'ENEMY';
    const list = this.game.enemies?.list || [];
    let best = null;
    let bestD = 4;
    for (const e of list) {
      if (!e.alive) continue;
      const d = e.position.distanceTo(from);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) return callsignFor(best);
    const ex = this._lastExplosion;
    if (ex?.position && this.t - ex.t < 1 && ex.position.distanceTo(from) < 1) return 'AIR STRIKE';
    return 'ENEMY';
  }

  _causeFor(from) {
    const ex = this._lastExplosion;
    if (from && ex?.position && this.t - ex.t < 1 && ex.position.distanceTo(from) < 1) return 'explosion';
    return 'bullet';
  }

  // ------------------------------------------------------------------ debug / review

  _registerDebugViews() {
    const d = this.game.debug;
    if (!d?.registerView) return;
    // Objective B sits ~5 m left of the view axis so the marker does not cover the crosshair.
    const base = { pos: [5, 0, 22], yaw: 0, pitch: 4 };
    d.registerView('hud_full', { ...base, hud: true, weapon: true });
    d.registerView('hud_ads', { ...base, hud: true, weapon: true, ads: true });
    d.registerView('menu_main', { ...base });
    d.registerView('menu_pause', { ...base });
    d.registerView('death_screen', { ...base });
  }

  /**
   * Populate the HUD for review screenshots. kinds: 'full' | 'ads' | 'lowhealth' | 'capture' | 'reload' | 'menu' | 'pause' | 'death' | 'end'
   * Example: node tools/shot.mjs --view hud_full --enemies --exec "await game.hud.demo('full')"
   */
  async demo(kind = 'full') {
    const g = this.game;
    const ev = g.events;
    const V3 = THREE.Vector3;
    const wait = (sec) => (g.debug?.waitTime ? g.debug.waitTime(sec) : Promise.resolve());
    if (kind === 'menu') return g.setState('menu');
    if (kind === 'pause') return g.setState('paused');
    if (kind === 'end') {
      g.setState('ended');
      ev.emit('match:end', { winner: 'blue', teamScore: { blue: 187, red: 143 }, score: g.gameMode?.score || this.stats.score || 1250 });
      return;
    }
    if (kind === 'death') {
      g.enemies.spawnWave(2);
      this.stats.kills = 7;
      this.stats.headshots = 2;
      this.stats.streak = 3;
      this.stats.bestStreak = 4;
      this.stats.score = 1250;
      const killer = g.enemies.list.find((e) => e.alive);
      g.player.damage(500, killer ? killer.position.clone() : new V3(5, 1, 0));
      await wait(0.4);
      return;
    }
    if (g.enemies.aliveCount < 3) g.enemies.spawnWave(3);
    ev.emit('match:time', { remaining: 63, teamScore: { blue: 26, red: 25 } });
    ev.emit('enemy:killed', { enemy: { id: 1 }, position: new V3(), headshot: true, source: 'player', cause: 'bullet' });
    ev.emit('enemy:killed', { enemy: { id: 2 }, position: new V3(), headshot: false, source: 'player', cause: 'explosion' });
    ev.emit('killstreak:ready', { name: 'airstrike' });
    ev.emit('wave', { index: 3, count: 6 });
    if (kind === 'ads') g.weapons.setAiming(true);
    if (kind === 'reload') ev.emit('weapon:ammo', { ammo: 3, magSize: 30, reserve: 180 });
    await wait(0.3);
    // Transient feedback last so a screenshot taken shortly after still shows it.
    const enemy = g.enemies.list.find((e) => e.alive);
    if (enemy) ev.emit('enemy:fire', { enemy, origin: enemy.position.clone(), direction: new V3(0, 0, 1) });
    ev.emit('score', { points: 100, reason: 'KILL', total: 1250 });
    ev.emit('ui:hitmarker', { headshot: false, kill: true });
    g.player.damage(kind === 'lowhealth' ? 72 : 35, new V3(10, 1, -5));
    if (kind === 'capture') {
      // Stand inside the zone; GameMode re-emits objective:progress every frame from captureProgress.
      const obj = g.world.getObjective();
      g.player.setView(new V3(obj.position.x, obj.position.y, obj.position.z + 2.5), 0, 4);
      if (g.gameMode) g.gameMode.captureProgress = 0.42;
      ev.emit('objective:progress', { progress: 0.42, owner: null, contested: false, playerIn: true });
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
