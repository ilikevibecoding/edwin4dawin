/**
 * IN-MISSION HUD — Northstar Rescue
 * Owner: Fable 1.
 *
 * Minimal at rest, everything driven by `update(state)` once per frame.
 * All text/bar writes go through change-detection so a steady state costs
 * no DOM mutations. Red is reserved for danger, per the visual bible.
 */

import { settings as settingsSingleton } from '../core/settings.js';
import { bus, EV } from '../core/events.js';
import { icon, iconMarkup, weaponIcon, keycap, applyUiPrefs, registerUiManifest } from './icons.js';
import { Minimap } from './minimap.js';

registerUiManifest();

const DEG2RAD = Math.PI / 180;
const COMPASS_PX_PER_DEG = 2.4;
const CARDINALS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === undefined || c === null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/** Cached text setter: skips the DOM write when nothing changed. */
function setText(el, value) {
  const s = String(value);
  if (el.__t !== s) {
    el.__t = s;
    el.textContent = s;
  }
}

function setStyle(el, prop, value) {
  if (el.__s?.[prop] !== value) {
    (el.__s ??= {})[prop] = value;
    el.style.setProperty(prop, value);
  }
}

function setClass(el, cls, on) {
  const key = `c:${cls}`;
  if (el.__s?.[key] !== !!on) {
    (el.__s ??= {})[key] = !!on;
    el.classList.toggle(cls, !!on);
  }
}

const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;

function ringSvg(cls) {
  const tpl = document.createElement('template');
  tpl.innerHTML = `<svg class="${cls}" viewBox="0 0 36 36" aria-hidden="true">
    <circle class="ring-bg" cx="18" cy="18" r="${RING_R}"/>
    <circle class="ring-fg" cx="18" cy="18" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${RING_C.toFixed(1)}"/>
  </svg>`.trim();
  return tpl.content.firstChild;
}

export class Hud {
  constructor(rootEl) {
    this.settings = settingsSingleton;
    this._disposed = false;
    this._subQueue = [];
    this._lastHitFeedback = null;
    this._sig = {}; // structural signatures (hostage strip, utility row)

    this.el = h('div', { class: 'hud hud-hidden', 'data-testid': 'hud-root', 'aria-hidden': 'true' });
    this._build();
    rootEl.appendChild(this.el);

    this._applySettings();
    this._offSettings = bus.on(EV.SETTINGS_CHANGED, () => this._applySettings());
  }

  /* -------------------------------------------------------------- */
  /* DOM                                                             */
  /* -------------------------------------------------------------- */

  _build() {
    const { el } = this;

    // Full-screen effect layers.
    this.vignette = h('div', { class: 'hud-vignette' });
    this.flash = h('div', { class: 'hud-flash' });
    this.scope = h('div', { class: 'hud-scope', html: '<div class="scope-h"></div><div class="scope-v"></div>' });
    this.dmg = h('div', { class: 'hud-dmg' });
    el.append(this.vignette, this.flash, this.scope, this.dmg);

    // Crosshair.
    this.ch = h('div', { class: 'ch', 'data-testid': 'hud-crosshair', 'data-style': 'dynamic' },
      h('span', { class: 'ch-line ch-t' }), h('span', { class: 'ch-line ch-b' }),
      h('span', { class: 'ch-line ch-l' }), h('span', { class: 'ch-line ch-r' }),
      h('span', { class: 'ch-dot' }));
    this.reloadRing = ringSvg('ch-ring');
    this.ch.appendChild(this.reloadRing);
    this.hits = h('div', { class: 'hud-hits' });
    el.append(this.ch, this.hits);

    // Top band: compass + timer.
    this.compassStrip = h('div', { class: 'compass-strip' });
    this._buildCompassTicks();
    this.timerText = h('span', { class: 'timer-text', text: '--:--' });
    this.timerEl = h('div', { class: 'hud-timer', 'data-testid': 'hud-timer' }, icon('timer', { size: 15 }), this.timerText);
    el.appendChild(h('header', { class: 'hud-top' },
      h('div', { class: 'hud-compass', 'data-testid': 'hud-compass' },
        this.compassStrip, h('div', { class: 'compass-needle' })),
      this.timerEl));

    // Left column: objective + hostage strip.
    this.objStep = h('span', { class: 'obj-step' });
    this.objTitle = h('div', { class: 'obj-title' });
    this.objDetail = h('div', { class: 'obj-detail' });
    this.objEl = h('section', { class: 'hud-objective hidden', 'data-testid': 'hud-objective' },
      h('div', { class: 'obj-kicker' }, icon('objective', { size: 12 }), h('span', { text: 'Objective' }), this.objStep),
      this.objTitle, this.objDetail);
    this.hostagesEl = h('ul', { class: 'hud-hostages', 'data-testid': 'hud-hostages' });
    el.appendChild(h('div', { class: 'hud-left' }, this.objEl, this.hostagesEl));

    // Right column: minimap + location line.
    this.mapCanvas = h('canvas', { class: 'minimap', 'data-testid': 'hud-minimap' });
    this.locEl = h('div', { class: 'hud-loc' });
    this.mapWrap = h('div', { class: 'hud-map' }, this.mapCanvas, this.locEl);
    el.appendChild(this.mapWrap);
    this.minimap = new Minimap(this.mapCanvas);

    // Centre feed + interact + subtitles.
    this.notifyEl = h('div', { class: 'hud-notify', 'data-testid': 'hud-notify' });
    this.interactRing = ringSvg('int-ring');
    this.interactKey = h('span', { class: 'int-key' });
    this.interactText = h('span', { class: 'int-text' });
    this.interactEl = h('div', { class: 'hud-interact hidden', 'data-testid': 'hud-interact' },
      h('span', { class: 'int-cap' }, this.interactRing, this.interactKey), this.interactText);
    this.subEl = h('div', { class: 'hud-subtitles hidden', 'data-testid': 'hud-subtitles' });
    el.append(this.notifyEl, this.interactEl, this.subEl);

    // Bottom band: vitals (left) and weapon (right).
    this.healthBar = h('span', { class: 'bar-fill' });
    this.healthNum = h('span', { class: 'vital-num', text: '100' });
    this.armorBar = h('span', { class: 'bar-fill' });
    this.armorNum = h('span', { class: 'vital-num', text: '0' });
    const healthEl = h('div', { class: 'vital vital-health', 'data-testid': 'hud-health' },
      icon('health', { size: 16 }), h('span', { class: 'bar' }, this.healthBar), this.healthNum);
    this.armorEl = h('div', { class: 'vital vital-armor', 'data-testid': 'hud-armor' },
      icon('armor', { size: 15 }), h('span', { class: 'bar' }, this.armorBar), this.armorNum);
    el.appendChild(h('div', { class: 'hud-vitals' }, healthEl, this.armorEl));

    this.wpnIconBox = h('span', { class: 'wpn-icon' });
    this.wpnName = h('span', { class: 'wpn-name' });
    this.ammoMag = h('span', { class: 'ammo-mag', text: '--' });
    this.ammoRes = h('span', { class: 'ammo-res', text: '--' });
    this.reloadBar = h('span', { class: 'bar-fill' });
    this.reloadEl = h('div', { class: 'wpn-reload hidden' }, h('span', { class: 'bar' }, this.reloadBar), h('span', { class: 'wpn-reload-label', text: 'RELOADING' }));
    this.utilityEl = h('div', { class: 'wpn-utility', 'data-testid': 'hud-utility' });
    this.ammoEl = h('div', { class: 'wpn-ammo', 'data-testid': 'hud-ammo' },
      this.ammoMag, h('span', { class: 'ammo-sep', text: '/' }), this.ammoRes);
    el.appendChild(h('div', { class: 'hud-weapon', 'data-testid': 'hud-weapon' },
      h('div', { class: 'wpn-head' }, this.wpnIconBox, this.wpnName),
      this.ammoEl, this.reloadEl, this.utilityEl));

    this.fpsEl = h('div', { class: 'hud-fps', 'data-testid': 'hud-fps' });
    el.appendChild(this.fpsEl);
  }

  _buildCompassTicks() {
    const frag = document.createDocumentFragment();
    for (let deg = -360; deg <= 720; deg += 15) {
      const norm = ((deg % 360) + 360) % 360;
      const label = CARDINALS[norm];
      const tick = h('span', {
        class: 'compass-tick' + (label ? ' cardinal' : norm % 45 === 0 ? ' inter' : ''),
        style: `left:${(deg * COMPASS_PX_PER_DEG).toFixed(1)}px`,
      });
      if (label) tick.appendChild(h('i', { text: label }));
      frag.appendChild(tick);
    }
    this.compassStrip.appendChild(frag);
  }

  /* -------------------------------------------------------------- */
  /* Settings                                                        */
  /* -------------------------------------------------------------- */

  _applySettings() {
    const s = this.settings;
    applyUiPrefs(s);
    this._chVisible = s.get('crosshairVisible') !== false;
    this._chStyle = s.get('crosshairStyle') ?? 'dynamic';
    this._showMinimap = s.get('showMinimap') !== false;
    this._showHitmarkers = s.get('showHitmarkers') !== false;
    this._subtitlesOn = s.get('subtitles') !== false;
    this.ch.setAttribute('data-style', this._chVisible ? this._chStyle : 'none');
    setClass(this.mapWrap, 'hidden', !this._showMinimap);
  }

  /* -------------------------------------------------------------- */
  /* Per-frame update                                                */
  /* -------------------------------------------------------------- */

  update(state) {
    if (this._disposed || !state) return;

    setClass(this.el, 'hud-dead', state.alive === false);

    /* Vitals */
    const health = Math.max(0, Math.round(state.health ?? 100));
    const armor = Math.max(0, Math.round(state.armor ?? 0));
    setText(this.healthNum, health);
    setStyle(this.healthBar, 'width', `${Math.min(100, health)}%`);
    setClass(this.healthBar.parentElement.parentElement, 'warn', health <= 60 && health > 30);
    setClass(this.healthBar.parentElement.parentElement, 'danger', health <= 30);
    setText(this.armorNum, armor);
    setStyle(this.armorBar, 'width', `${Math.min(100, armor)}%`);
    setClass(this.armorEl, 'hidden', armor <= 0);
    setStyle(this.vignette, 'opacity', String(Math.min(1, Math.max(0, (45 - health) / 45)).toFixed(3)));

    /* Weapon */
    const w = state.weapon;
    if (w) {
      if (this._sig.weapon !== w.id) {
        this._sig.weapon = w.id;
        this.wpnIconBox.replaceChildren(weaponIcon(w.icon ?? w.family ?? 'rifle'));
      }
      setText(this.wpnName, w.name ?? '');
      const isMelee = (w.magazineMax ?? 0) <= 0 && (w.reserve ?? 0) <= 0 && (w.family === 'melee' || w.id?.startsWith('knife'));
      setClass(this.ammoEl, 'hidden', isMelee);
      if (!isMelee) {
        setText(this.ammoMag, w.magazine ?? 0);
        setText(this.ammoRes, w.reserve ?? 0);
        const max = w.magazineMax || 1;
        setClass(this.ammoEl, 'warn', w.magazine > 0 && w.magazine <= Math.ceil(max * 0.25));
        setClass(this.ammoEl, 'danger', (w.magazine ?? 0) === 0);
      }
      setClass(this.reloadEl, 'hidden', !w.reloading);
      const rp = w.reloading ? Math.min(1, Math.max(0, w.reloadProgress ?? 0)) : 0;
      setStyle(this.reloadBar, 'width', `${(rp * 100).toFixed(1)}%`);
      const fg = this.reloadRing.querySelector('.ring-fg');
      setClass(this.reloadRing, 'active', !!w.reloading);
      if (w.reloading) setStyle(fg, 'stroke-dashoffset', String((RING_C * (1 - rp)).toFixed(1)));

      const scoped = !!w.scoped && (w.adsFactor ?? 0) > 0.55;
      setClass(this.scope, 'active', scoped);
      setClass(this.ch, 'suppressed', scoped);
    }

    /* Utility counts */
    const util = state.utility ?? [];
    const usig = util.map((u) => `${u.id}:${u.count}`).join('|');
    if (this._sig.util !== usig) {
      this._sig.util = usig;
      this.utilityEl.replaceChildren(...util.map((u) =>
        h('span', { class: 'util-item' + (u.count > 0 ? '' : ' depleted'), title: u.name ?? u.id },
          icon(u.icon ?? 'flash', { size: 15 }), h('b', { text: `×${u.count}` }))));
    }

    /* Objective */
    const obj = state.objective;
    setClass(this.objEl, 'hidden', !obj);
    if (obj) {
      setText(this.objStep, obj.total ? `${obj.step ?? 1} / ${obj.total}` : '');
      setText(this.objTitle, obj.title ?? '');
      setText(this.objDetail, obj.detail ?? '');
    }

    /* Hostage strip */
    const hostages = state.hostages ?? [];
    const hsig = hostages.map((x) => `${x.id}:${x.state}:${Math.round(x.distance ?? -1)}`).join('|');
    if (this._sig.hostages !== hsig) {
      this._sig.hostages = hsig;
      this.hostagesEl.replaceChildren(...hostages.map((x) =>
        h('li', { class: `hostage hs-${x.state ?? 'unknown'}` },
          icon('hostage', { size: 13 }),
          h('span', { class: 'hs-name', text: x.name ?? x.id }),
          h('span', { class: 'hs-state', text: (x.state ?? 'unknown').toUpperCase() }),
          x.distance != null && x.state !== 'extracted' && x.state !== 'down'
            ? h('span', { class: 'hs-dist', text: `${Math.round(x.distance)}m` }) : null)));
    }

    /* Timer */
    const t = state.timer;
    if (t && t.remaining != null) {
      const secs = Math.max(0, Math.ceil(t.remaining));
      setText(this.timerText, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
      setClass(this.timerEl, 'critical', !!t.critical);
      setClass(this.timerEl, 'hidden', false);
    } else {
      setClass(this.timerEl, 'hidden', true);
    }

    /* Interact prompt */
    const it = state.interact;
    setClass(this.interactEl, 'hidden', !it?.available);
    if (it?.available) {
      setText(this.interactKey, it.key ?? 'E');
      setText(this.interactText, [it.verb ?? 'Use', it.target].filter(Boolean).join(' — '));
      const fg = this.interactRing.querySelector('.ring-fg');
      const p = Math.min(1, Math.max(0, it.progress ?? 0));
      setStyle(fg, 'stroke-dashoffset', String((RING_C * (1 - p)).toFixed(1)));
      setClass(this.interactEl, 'holding', p > 0);
    }

    /* Compass */
    if (state.compassDeg != null) {
      const deg = ((state.compassDeg % 360) + 360) % 360;
      setStyle(this.compassStrip, 'transform', `translateX(${(-deg * COMPASS_PX_PER_DEG).toFixed(1)}px)`);
    }

    /* Crosshair spread */
    if (typeof state.crosshairSpread === 'number') this.setCrosshairSpread(state.crosshairSpread);

    /* Hit feedback pushed through state (in addition to hitMarker()) */
    if (state.hitFeedback && state.hitFeedback !== this._lastHitFeedback) {
      const kind = typeof state.hitFeedback === 'string' ? state.hitFeedback : state.hitFeedback.kind ?? 'hit';
      this.hitMarker(kind);
    }
    this._lastHitFeedback = state.hitFeedback ?? null;

    /* Location + minimap */
    if (state.roomName || state.floor) {
      setText(this.locEl, [state.roomName, state.floor === 'upper' ? 'Floor 2' : 'Floor 1'].filter(Boolean).join(' · '));
    }
    if (this._showMinimap && state.position) {
      this.minimap.update({
        playerPos: state.position,
        playerYaw: state.compassDeg != null ? state.compassDeg * DEG2RAD : undefined,
        floor: state.floor,
      });
    }

    /* FPS (faint diagnostics) */
    setText(this.fpsEl, state.fps ? `${Math.round(state.fps)} fps` : '');
  }

  /* -------------------------------------------------------------- */
  /* Event-style API                                                 */
  /* -------------------------------------------------------------- */

  show() {
    this.el.classList.remove('hud-hidden');
    this.el.setAttribute('aria-hidden', 'false');
  }

  hide() {
    this.el.classList.add('hud-hidden');
    this.el.setAttribute('aria-hidden', 'true');
  }

  /** kinds: 'info' | 'objective' | 'warn' | 'danger' | 'success' */
  notify(text, kind = 'info') {
    if (this._disposed || !text) return;
    const glyph = { info: 'star', objective: 'objective', warn: 'alert', danger: 'alert', success: 'check' }[kind] ?? 'star';
    const note = h('div', { class: `note note-${kind}`, 'data-kind': kind, html: iconMarkup(glyph, { size: 14 }) });
    note.appendChild(h('span', { text }));
    this.notifyEl.appendChild(note);
    while (this.notifyEl.children.length > 4) this.notifyEl.firstChild.remove();
    const ttl = kind === 'objective' ? 6000 : 4200;
    setTimeout(() => {
      note.classList.add('note-out');
      setTimeout(() => note.remove(), 400);
    }, ttl);
  }

  subtitle(text, speaker = '', ms = 0) {
    if (this._disposed || !text || !this._subtitlesOn) return;
    this._subQueue.push({ text, speaker, ms: ms || Math.max(1800, 900 + text.length * 55) });
    if (!this._subActive) this._nextSubtitle();
  }

  _nextSubtitle() {
    const next = this._subQueue.shift();
    if (!next) {
      this._subActive = false;
      this.subEl.classList.add('hidden');
      return;
    }
    this._subActive = true;
    this.subEl.replaceChildren(
      next.speaker ? h('b', { text: next.speaker.toUpperCase() }) : null,
      h('span', { text: next.text }));
    this.subEl.classList.remove('hidden');
    this._subTimer = setTimeout(() => this._nextSubtitle(), next.ms);
  }

  /** kinds: 'hit' | 'armor' | 'headshot' | 'kill' */
  hitMarker(kind = 'hit') {
    if (this._disposed || !this._showHitmarkers) return;
    const hm = h('span', { class: `hm hm-${kind}` },
      h('i'), h('i'), h('i'), h('i'));
    this.hits.appendChild(hm);
    while (this.hits.children.length > 3) this.hits.firstChild.remove();
    setTimeout(() => hm.remove(), kind === 'kill' ? 520 : 340);
  }

  /** dirDegrees: 0 = straight ahead, clockwise positive, screen-relative. */
  damageFrom(dirDegrees, amount = 10) {
    if (this._disposed) return;
    const ind = h('span', { class: 'dmg-ind' });
    ind.style.transform = `rotate(${dirDegrees}deg)`;
    ind.style.opacity = String(Math.min(1, 0.45 + amount / 50));
    this.dmg.appendChild(ind);
    while (this.dmg.children.length > 8) this.dmg.firstChild.remove();
    setTimeout(() => ind.remove(), 1100);
    if (amount >= 10) {
      this.flash.classList.remove('flash-on');
      // Force a reflow so re-adding the class retriggers the animation.
      void this.flash.offsetWidth;
      this.flash.classList.add('flash-on');
    }
  }

  setCrosshairSpread(pixels) {
    setStyle(this.ch, '--spread', `${Math.max(0, Number(pixels) || 0).toFixed(1)}px`);
  }

  /** Optional helper for the lead: expand/collapse the tactical map (M key). */
  setMapExpanded(bool) {
    setClass(this.mapWrap, 'expanded', !!bool);
    this.minimap.setExpanded(!!bool);
  }

  dispose() {
    this._disposed = true;
    clearTimeout(this._subTimer);
    this._offSettings?.();
    this.minimap?.dispose();
    this.el.remove();
  }
}
