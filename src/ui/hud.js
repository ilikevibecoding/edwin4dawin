// ---------------------------------------------------------------------------
// NORTHSTAR RESCUE — in-game HUD  (owner: fable1)
//
// Philosophy: the HUD is an instrument cluster, not a dashboard. Nothing sits
// in the centre of the screen except the crosshair and (briefly) a hitmarker.
// Persistent data lives in the four corners; transient feedback fades fast.
//
// `state()` returns a plain-JSON snapshot of everything currently displayed,
// consumed by Game.renderToText() for Playwright assertions.
// ---------------------------------------------------------------------------

import { bus, EVT } from '../core/events.js';
import { settings } from '../core/settings.js';
import { floorForY, EXTRACTION } from '../map/layout.js';
import { el, fmtKey, fmtTime } from './screens/base.js';
import { icon, weaponGlyph } from './icons.js';
import { MinimapRenderer } from './minimap.js';

const POLL_INTERVAL = 0.25;   // seconds between mission/hostage polls
const MINIMAP_INTERVAL = 0.12;

export class Hud {
  /** @param {import('./manager.js').UIManager} ui */
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    this.root = el('div', { id: 'hud', 'aria-hidden': 'true' });

    // Transient display state.
    this._indicators = [];       // { source:[x,y,z], time, strength }
    this._killfeed = [];         // { text, time, el }
    this._subs = [];             // { el, until }
    this._announce = null;       // { text, sub, tone, until }
    this._prompt = null;         // { text, until }
    this._hitmarker = { until: 0, headshot: false, kill: false };
    this._kick = 0;              // crosshair fire bump (deg)
    this._damagePulse = 0;
    this._pollTimer = POLL_INTERVAL; // poll mission state on the first update
    this._mapTimer = 0;
    this._time = 0;
    this._minimapOn = true;
    this._objectivesExpanded = false;
    this._doorStates = {};
    this._mission = null;
    this._hostages = [];
    this._crossCache = '';

    this._snap = this._blankSnapshot();
    this._build();
    this._subscribe();
  }

  // ------------------------------------------------------------------ DOM --

  _build() {
    const r = this.root;

    // Full-screen overlays (never intercept the pointer).
    r.append(this._vignette = el('div', { id: 'vignette' }));
    r.append(this._damageVignette = el('div', { id: 'damage-vignette' }));
    r.append(this._flashOverlay = el('div', { id: 'flash-overlay' }));
    r.append(this._indicatorLayer = el('div', { id: 'damage-indicators' }));

    // Centre.
    this._crossCanvas = el('canvas', { width: 96, height: 96, 'aria-hidden': 'true' });
    r.append(el('div', { id: 'crosshair' }, this._crossCanvas));
    this._hitEl = el('div', { id: 'hitmarker', html: hitmarkerSvg() });
    r.append(this._hitEl);

    // Top left: objectives + hostage chips.
    this._objList = el('div', { class: 'objective-items' });
    this._hostageStrip = el('div', { class: 'hostage-strip' });
    r.append(el('div', { class: 'hud-corner hud-tl' },
      el('div', { class: 'objective-panel' },
        this._objHead = el('div', { class: 'objective-head', text: 'Objectives' }),
        this._objList,
        this._hostageStrip)));

    // Top centre: mission timer.
    this._timerValue = el('div', { class: 'mission-timer', text: '' });
    this._timerWrap = el('div', { class: 'hud-corner hud-tc', style: 'display:none' },
      el('div', { class: 'timer-label', text: 'Storm window' }),
      this._timerValue);
    r.append(this._timerWrap);

    // Top right: minimap + killfeed.
    this._mapCanvas = el('canvas', { 'aria-label': 'Minimap' });
    this._mapWrap = el('div', { id: 'minimap' }, this._mapCanvas,
      this._mapLabel = el('span', { class: 'minimap-label', text: 'GROUND' }));
    this._killfeedEl = el('div', { class: 'killfeed' });
    r.append(el('div', { class: 'hud-corner hud-tr' }, this._mapWrap, this._killfeedEl));
    this.minimap = new MinimapRenderer(this._mapCanvas, { style: 'hud' });

    // Bottom left: vitals.
    this._healthValue = el('span', { class: 'vital-value', text: '100' });
    this._healthBar = el('div', { class: 'vital-bar health' }, el('i'));
    this._armorValue = el('span', { class: 'vital-value', text: '100' });
    this._armorBar = el('div', { class: 'vital-bar armor' }, el('i'));
    r.append(el('div', { class: 'hud-corner hud-bl' },
      el('div', { class: 'vitals' },
        el('div', { class: 'vital' },
          el('span', { class: 'vital-label', html: `${icon('health', 'vital-icon')} Condition` }),
          el('div', { class: 'vital-row' }, this._healthValue),
          this._healthBar),
        el('div', { class: 'vital' },
          el('span', { class: 'vital-label', html: `${icon('armor', 'vital-icon')} Vest` }),
          el('div', { class: 'vital-row' }, this._armorValue),
          this._armorBar))));

    // Bottom right: ammunition + weapon identity.
    this._ammoMag = el('span', { class: 'ammo-mag', text: '—' });
    this._ammoReserve = el('span', { class: 'ammo-reserve', text: '' });
    this._weaponName = el('div', { class: 'weapon-name', text: '' });
    this._weaponGlyphEl = el('span', { class: 'weapon-glyph-wrap' });
    this._fireMode = el('span', { class: 'fire-mode', text: '' });
    this._gadgetRow = el('div', { class: 'gadget-row' });
    r.append(el('div', { class: 'hud-corner hud-br' },
      el('div', { class: 'ammo-block' },
        this._ammoMag, el('span', { class: 'ammo-sep', text: '/' }), this._ammoReserve),
      el('div', { class: 'row weapon-id' }, this._weaponGlyphEl, this._weaponName, this._fireMode),
      this._gadgetRow));

    // Bottom centre: interaction prompt + flash prompt toast.
    this._interactKey = el('span', { class: 'interact-key', text: 'E' });
    this._interactLabel = el('span', { class: 'interact-label', text: '' });
    this._interactArc = el('span', { class: 'interact-arc', html: arcSvg() });
    this._interact = el('div', { class: 'interact-prompt' },
      this._interactKey, this._interactLabel, this._interactArc);
    this._toast = el('div', { class: 'hud-toast', text: '' });
    r.append(el('div', { class: 'hud-corner hud-bc' }, this._interact, this._toast));

    // Announcer + subtitles.
    r.append(this._announcer = el('div', { id: 'announcer' }));
    r.append(this._subtitleEl = el('div', { id: 'subtitles' }));
  }

  _subscribe() {
    bus.on(EVT.PLAYER_DAMAGE, (p) => {
      const amount = Number(p?.amount) || 0;
      this._damagePulse = Math.min(1, this._damagePulse + amount / 45 + 0.18);
      if (p?.sourcePos) {
        const s = p.sourcePos;
        const src = Array.isArray(s) ? s : [s.x || 0, s.y || 0, s.z || 0];
        this._indicators.push({ source: src, time: this._time, strength: Math.min(1, amount / 30 + 0.4) });
        if (this._indicators.length > 8) this._indicators.shift();
      }
    });
    bus.on('combat:hitmarker', (p) => {
      this._hitmarker = {
        until: this._time + (p?.killed ? 0.55 : 0.35),
        headshot: !!p?.headshot,
        kill: !!p?.killed,
      };
      this._renderHitmarker();
    });
    bus.on(EVT.WEAPON_FIRE, () => { this._kick = Math.min(3, this._kick + 0.55); });
    bus.on(EVT.OBJECTIVE_UPDATE, (p) => {
      this._pollTimer = POLL_INTERVAL; // refresh next frame
      const text = p?.announce || p?.text || p?.label;
      if (text && p?.silent !== true) this.announce(String(text), p?.sub || '', p?.tone || 'info');
    });
    bus.on(EVT.HOSTAGE_STATE, (p) => {
      this._pollTimer = POLL_INTERVAL;
      const state = String(p?.state || p?.status || '').toLowerCase();
      const name = p?.name || p?.hostage?.name || 'Hostage';
      if (state.includes('secure') || state.includes('follow')) this.announce(`${name} — with you`, 'Escort to the vehicle bay', 'good');
      else if (state.includes('extract')) this.announce(`${name} — extracted`, '', 'good');
      else if (state.includes('dead') || state.includes('lost')) this.announce(`${name} — lost`, '', 'alert');
    });
    bus.on(EVT.ANNOUNCE, (p) => {
      if (!p) return;
      this.announce(String(p.text || p.title || p.message || ''), String(p.sub || p.detail || ''), p.tone || p.kind || 'info');
      if (p.voice || p.speaker) this._subtitle(p.speaker || 'Command', String(p.text || ''), 'command');
    });
    bus.on(EVT.ENEMY_VOICE, (p) => {
      const line = p?.text || p?.line || p?.phrase;
      if (line) this._subtitle(p?.name || 'Hostile', String(line), 'enemy');
    });
    bus.on(EVT.ENEMY_DEATH, (p) => {
      const how = p?.headshot ? 'Headshot' : p?.melee ? 'Blade' : null;
      this._addKillfeed(how ? `Hostile down — ${how}` : 'Hostile down');
    });
    bus.on(EVT.DOOR_STATE, (p) => {
      const id = p?.id || p?.door;
      if (!id) return;
      this._doorStates[id] = { open: !!(p.open ?? p.isOpen), locked: !!p.locked };
    });
    bus.on('input:key', (p) => {
      if (!p?.code) return;
      const binds = this.game?.input?.bindings;
      const isMap = (binds?.map || ['KeyM']).includes(p.code);
      const isObjectives = (binds?.objectives || ['Tab']).includes(p.code);
      if (p.down && this.game?.state === 'playing') {
        if (isMap) this._minimapOn = !this._minimapOn;
        if (isObjectives) {
          this._objectivesExpanded = true;
          this._renderObjectives();
        }
      }
      if (!p.down && isObjectives && this._objectivesExpanded) {
        this._objectivesExpanded = false;
        this._renderObjectives();
      }
    });
  }

  // -------------------------------------------------------------- control --

  setVisible(v) {
    this.root.classList.toggle('visible', !!v);
    this.root.setAttribute('aria-hidden', String(!v));
  }

  reset() {
    this._indicators.length = 0;
    this._killfeed.length = 0;
    this._subs.length = 0;
    this._announce = null;
    this._prompt = null;
    this._hitmarker = { until: 0, headshot: false, kill: false };
    this._kick = 0;
    this._damagePulse = 0;
    this._doorStates = {};
    this._mission = null;
    this._hostages = [];
    this._objectivesExpanded = false;
    this._pollTimer = POLL_INTERVAL;
    this._killfeedEl.replaceChildren();
    this._subtitleEl.replaceChildren();
    this._announcer.replaceChildren();
    this._indicatorLayer.replaceChildren();
    this._toast.classList.remove('visible');
    this._snap = this._blankSnapshot();
  }

  flashPrompt(text) {
    this._prompt = { text: String(text || ''), until: this._time + 2.4 };
    this._toast.textContent = this._prompt.text;
    this._toast.classList.add('visible');
  }

  announce(text, sub = '', tone = 'info') {
    if (!text) return;
    this._announce = { text, sub, tone, until: this._time + 4.2 };
    const cls = tone === 'alert' || tone === 'danger' ? 'alert' : tone === 'good' ? 'good' : '';
    const line = el('div', { class: `announce-line ${cls}` },
      document.createTextNode(text),
      sub ? el('span', { class: 'sub', text: sub }) : null);
    this._announcer.replaceChildren(line);
    setTimeout(() => { if (line.isConnected) line.remove(); }, 4600);
  }

  _subtitle(who, text, tone = 'enemy') {
    if (!settings.get('subtitles')) return;
    const line = el('div', { class: `subtitle-line ${tone}` },
      el('span', { class: 'who', text: `${who}:` }), document.createTextNode(text));
    this._subtitleEl.append(line);
    const entry = { el: line, until: this._time + 3.6, who, text, tone };
    this._subs.push(entry);
    while (this._subs.length > 3) this._subs.shift().el.remove();
  }

  _addKillfeed(text) {
    const node = el('div', { class: 'killfeed-item', text });
    this._killfeedEl.prepend(node);
    this._killfeed.unshift({ text, time: this._time, el: node });
    while (this._killfeed.length > 4) this._killfeed.pop().el.remove();
  }

  // --------------------------------------------------------------- update --

  update(dt) {
    this._time += dt;
    const g = this.game;
    const playing = g?.state === 'playing';

    this._pollTimer += dt;
    if (this._pollTimer >= POLL_INTERVAL) {
      this._pollTimer = 0;
      this._mission = safeCall(() => g?.director?.toJSON?.()) || this._mission;
      this._hostages = normaliseHostages(safeCall(() => g?.hostages?.toJSON?.(g?.player?.position)));
      this._renderObjectives();
      this._renderHostages();
    }

    const vitals = this._updateVitals();
    const ammo = this._updateAmmo();
    const cross = this._updateCrosshair(dt);
    const interact = this._updateInteraction();
    const timer = this._updateTimer();
    this._updateIndicators();
    this._updateOverlays(dt);
    this._updateTransients();
    const map = this._updateMinimap(dt);

    this._snap = {
      visible: this.root.classList.contains('visible'),
      playing,
      crosshair: cross,
      vitals,
      ammo: ammo.ammo,
      weapon: ammo.weapon,
      timer,
      objectives: this._snapObjectives,
      hostages: this._hostages.map((h) => ({ id: h.id, name: h.name, state: h.state })),
      interaction: interact,
      prompt: this._prompt && this._time < this._prompt.until ? this._prompt.text : null,
      hitmarker: {
        visible: this._time < this._hitmarker.until,
        headshot: this._hitmarker.headshot,
        kill: this._hitmarker.kill,
      },
      damageIndicators: this._indicators.map((i) => ({
        angleDegrees: Math.round(this._indicatorAngle(i) * 180 / Math.PI),
        age: +(this._time - i.time).toFixed(2),
      })),
      announcement: this._announce && this._time < this._announce.until
        ? { text: this._announce.text, sub: this._announce.sub, tone: this._announce.tone } : null,
      subtitles: this._subs.filter((s) => this._time < s.until)
        .map((s) => ({ who: s.who, text: s.text, tone: s.tone })),
      killfeed: this._killfeed.filter((k) => this._time - k.time < 3.5).map((k) => k.text),
      minimap: map,
      overlays: {
        damageVignette: +this._damagePulse.toFixed(3),
        flashBlind: +(safeCall(() => this.game?.weapons?.blindFactor) || 0).toFixed(3),
        lowHealth: vitals.low,
      },
    };
  }

  state() {
    // Deep, plain-JSON copy: tests must not share references with the DOM layer.
    return JSON.parse(JSON.stringify(this._snap));
  }

  _blankSnapshot() {
    this._snapObjectives = [];
    return {
      visible: false, playing: false, crosshair: null, vitals: null, ammo: null,
      weapon: null, timer: null, objectives: [], hostages: [], interaction: null,
      prompt: null, hitmarker: { visible: false, headshot: false, kill: false },
      damageIndicators: [], announcement: null, subtitles: [], killfeed: [],
      minimap: { visible: false, floor: 'ground' },
      overlays: { damageVignette: 0, flashBlind: 0, lowHealth: false },
    };
  }

  // --------------------------------------------------------------- pieces --

  _updateVitals() {
    const p = this.game?.player;
    const health = Math.max(0, Math.round(p?.health ?? 100));
    const maxHealth = Math.round(p?.maxHealth ?? 100);
    const armor = Math.max(0, Math.round(p?.armor ?? p?.armour ?? 0));
    const maxArmor = Math.round(p?.maxArmor ?? 100);
    const low = health <= 25;

    this._healthValue.textContent = String(health);
    this._healthValue.classList.toggle('low', low);
    this._healthValue.classList.toggle('warn', !low && health <= 50);
    this._healthBar.classList.toggle('low', low);
    this._healthBar.firstChild.style.width = `${Math.min(100, (health / Math.max(1, maxHealth)) * 100)}%`;
    this._armorValue.textContent = String(armor);
    this._armorBar.firstChild.style.width = `${Math.min(100, (armor / Math.max(1, maxArmor)) * 100)}%`;
    return { health, maxHealth, armor, maxArmor, low };
  }

  _updateAmmo() {
    const ws = this.game?.weapons;
    const cur = ws?.current;
    const def = cur?.def;
    if (!cur || !def) {
      this._ammoMag.textContent = '—';
      this._ammoReserve.textContent = '';
      this._weaponName.textContent = '';
      this._fireMode.textContent = '';
      return { ammo: null, weapon: null };
    }

    const firearm = !!def.isFirearm;
    const gadget = !!def.isGadget;
    const mag = firearm ? (cur.ammo ?? 0) : gadget ? (cur.count ?? 0) : null;
    const magSize = firearm ? (def.loadedMax ?? 0) : gadget ? (def.maxCount ?? 3) : null;
    const reserve = firearm ? (cur.reserve ?? 0) : null;
    const low = firearm && mag !== null && mag <= Math.max(1, Math.ceil(magSize * 0.25));
    const empty = firearm && mag === 0;

    this._ammoMag.textContent = mag === null ? '—' : String(mag);
    this._ammoMag.classList.toggle('low', low && !empty);
    this._ammoMag.classList.toggle('empty', empty);
    this._ammoReserve.textContent = reserve === null ? (gadget ? 'carried' : '') : String(reserve);
    this._weaponName.textContent = cur.name || '';
    if (this._lastGlyphKey !== cur.key) {
      this._lastGlyphKey = cur.key;
      this._weaponGlyphEl.innerHTML = weaponGlyph(def.family || cur.key);
    }
    const reloading = !!ws.reloadState;
    this._fireMode.textContent = reloading ? 'RELOADING' : String(cur.mode || '').toUpperCase();

    // Gadget count chips.
    const flash = ws.slots?.flash?.count ?? 0;
    const smoke = ws.slots?.smoke?.count ?? 0;
    if (this._lastGadgets !== `${flash}/${smoke}`) {
      this._lastGadgets = `${flash}/${smoke}`;
      this._gadgetRow.replaceChildren(
        el('span', { class: `gadget-chip${flash ? '' : ' spent'}`, html: `${weaponGlyph('flash', 'gadget-glyph')}<span>${flash}</span>` }),
        el('span', { class: `gadget-chip${smoke ? '' : ' spent'}`, html: `${weaponGlyph('smoke', 'gadget-glyph')}<span>${smoke}</span>` }));
    }

    return {
      ammo: firearm || gadget ? { magazine: mag, magazineSize: magSize, reserve, low, empty } : null,
      weapon: {
        name: cur.name || '', key: cur.key || '', slotIndex: cur.slotIndex ?? 0,
        fireMode: cur.mode || null, reloading,
        gadgets: { flash, smoke },
      },
    };
  }

  _updateCrosshair(dt) {
    this._kick = Math.max(0, this._kick - dt * 6);
    const ws = this.game?.weapons;
    const def = ws?.current?.def;
    const style = settings.get('crosshairStyle') || 'dynamic';
    const enabled = settings.get('crosshair') !== false;
    const scoped = !!(def?.scope && (ws?.adsFactor ?? 0) > 0.5);
    const spread = Number(safeCall(() => ws?.spreadDegrees)) || 0;
    const visible = enabled && !scoped;

    // Convert degrees of cone to on-screen pixels using the camera projection.
    const cam = this.game?.camera;
    const h = this.game?.engine?.viewportHeight || globalThis.innerHeight || 800;
    const fov = (cam?.fov || 82) * Math.PI / 180;
    const pxPerDeg = (h / 2) / Math.tan(fov / 2) * (Math.PI / 180);
    const gapPx = style === 'dynamic'
      ? Math.min(38, 3.5 + (spread + this._kick) * pxPerDeg)
      : 4;

    const cacheKey = `${visible}|${style}|${gapPx.toFixed(1)}`;
    if (cacheKey !== this._crossCache) {
      this._crossCache = cacheKey;
      drawCrosshair(this._crossCanvas, { visible, style, gap: gapPx });
    }
    return {
      visible, style, spreadDegrees: +spread.toFixed(3), gapPx: +gapPx.toFixed(1), scoped,
    };
  }

  _updateInteraction() {
    const t = this.game?.currentInteractable;
    const active = !!t && this.game?.state === 'playing';
    this._interact.classList.toggle('visible', active);
    if (!active) return null;
    const label = t.label || 'Interact';
    const key = t.key || fmtKey(this.game?.input?.bindings?.use?.[0] || 'KeyE');
    const locked = !!t.locked;
    const progress = Math.max(0, Math.min(1, Number(t.progress ?? t.holdProgress ?? 0)));
    this._interactLabel.textContent = label;
    this._interactKey.textContent = key;
    this._interact.classList.toggle('locked', locked);
    setArc(this._interactArc, progress);
    return { label, key, kind: t.kind || null, locked, progress: +progress.toFixed(2) };
  }

  _updateTimer() {
    const m = this._mission;
    const remaining = pickNumber(m, ['timeRemaining', 'timeLeft', 'remaining', 'remainingSeconds'])
      ?? (pickNumber(m, ['timeLimit']) !== null && pickNumber(m, ['elapsed', 'time']) !== null
        ? pickNumber(m, ['timeLimit']) - pickNumber(m, ['elapsed', 'time'])
        : null);
    const show = typeof remaining === 'number' && Number.isFinite(remaining) && remaining >= 0
      && pickNumber(m, ['timeLimit', 'timeRemaining', 'timeLeft']) !== null;
    this._timerWrap.style.display = show ? '' : 'none';
    if (!show) return null;
    const display = fmtTime(remaining);
    const urgent = remaining <= 60;
    this._timerValue.textContent = display;
    this._timerValue.classList.toggle('urgent', urgent);
    return { seconds: Math.round(remaining), display, urgent };
  }

  _renderObjectives() {
    const raw = Array.isArray(this._mission?.objectives) ? this._mission.objectives : [];
    const items = raw.map((o, i) => ({
      id: String(o?.id ?? i),
      text: String(o?.text || o?.label || o?.name || o?.title || 'Objective'),
      state: objectiveState(o),
    }));
    this._snapObjectives = items;
    const list = this._objectivesExpanded ? items : items.filter((o) => o.state !== 'done').slice(0, 4);
    this._objList.replaceChildren(...list.map((o) => el('div', { class: `objective-item ${o.state}` },
      el('span', { class: 'objective-marker', text: o.state === 'done' ? '\u2713' : o.state === 'failed' ? '\u2715' : '\u25C6' }),
      el('span', { text: o.text }))));
    this._objHead.textContent = items.length ? 'Objectives' : 'Objectives — awaiting tasking';
  }

  _renderHostages() {
    this._hostageStrip.replaceChildren(...this._hostages.map((h) => el('span', {
      class: `hostage-chip ${h.state}`,
    }, el('span', { class: 'dot' }), el('span', { text: h.name }))));
  }

  _updateIndicators() {
    const alive = [];
    const frag = [];
    for (const ind of this._indicators) {
      const age = this._time - ind.time;
      if (age > 2.6) continue;
      alive.push(ind);
      const angle = this._indicatorAngle(ind);
      const opacity = Math.min(1, ind.strength) * (1 - age / 2.6);
      const node = el('div', {
        class: 'damage-arrow',
        style: `transform: translate(-50%,-50%) rotate(${(angle * 180 / Math.PI).toFixed(1)}deg); opacity: ${opacity.toFixed(2)}; left:50%; top:50%;`,
        html: damageArrowSvg(),
      });
      frag.push(node);
    }
    this._indicators = alive;
    this._indicatorLayer.replaceChildren(...frag);
  }

  /** World angle from player to damage source, relative to the view. */
  _indicatorAngle(ind) {
    const p = this.game?.player;
    if (!p?.position) return 0;
    const dx = ind.source[0] - p.position.x;
    const dz = ind.source[2] - p.position.z;
    // atan2(dx, -dz): 0 when the source is due north (-Z); subtract view yaw.
    return Math.atan2(dx, -dz) + (p.yaw || 0);
  }

  _updateOverlays(dt) {
    this._damagePulse = Math.max(0, this._damagePulse - dt * 0.65);
    const health = this.game?.player?.health ?? 100;
    const lowHealth = health <= 25 ? (1 - health / 25) * 0.55 : 0;
    this._damageVignette.style.opacity = Math.min(1, this._damagePulse + lowHealth).toFixed(2);
    const blind = safeCall(() => this.game?.weapons?.blindFactor) || 0;
    this._flashOverlay.style.opacity = Math.min(1, blind).toFixed(2);
    this._vignette.style.display = settings.get('vignette') === false ? 'none' : '';
  }

  _updateTransients() {
    if (this._time >= this._hitmarker.until && this._hitEl.classList.contains('show')) {
      this._hitEl.classList.remove('show', 'headshot', 'kill');
    }
    if (this._prompt && this._time >= this._prompt.until) {
      this._prompt = null;
      this._toast.classList.remove('visible');
    }
    for (let i = this._subs.length - 1; i >= 0; i--) {
      if (this._time >= this._subs[i].until) {
        this._subs[i].el.remove();
        this._subs.splice(i, 1);
      }
    }
    for (let i = this._killfeed.length - 1; i >= 0; i--) {
      if (this._time - this._killfeed[i].time > 3.5) {
        this._killfeed[i].el.remove();
        this._killfeed.splice(i, 1);
      }
    }
  }

  _renderHitmarker() {
    this._hitEl.classList.remove('show', 'headshot', 'kill');
    void this._hitEl.offsetWidth; // restart the CSS animation
    this._hitEl.classList.add('show');
    if (this._hitmarker.headshot) this._hitEl.classList.add('headshot');
    if (this._hitmarker.kill) this._hitEl.classList.add('kill');
  }

  _updateMinimap(dt) {
    const p = this.game?.player;
    const visible = this._minimapOn && !!p;
    this._mapWrap.style.display = visible ? '' : 'none';
    const floor = p ? floorForY(p.position?.y ?? 0) : 'ground';
    if (!visible) return { visible: false, floor };

    this._mapTimer += dt;
    if (this._mapTimer >= MINIMAP_INTERVAL) {
      this._mapTimer = 0;
      const markers = [];
      if (EXTRACTION?.center) {
        markers.push({ x: EXTRACTION.center[0], z: EXTRACTION.center[2], kind: 'extraction', floor: 'ground' });
      }
      for (const h of this._hostages) {
        if (!h.revealed || !h.pos) continue;
        if (h.state === 'extracted') continue;
        markers.push({
          x: h.pos[0], z: h.pos[2], kind: 'hostage',
          floor: (h.pos[1] ?? 0) > 2 ? 'upper' : 'ground',
        });
      }
      for (const o of this._snapObjectives) {
        // Directors may attach positions to objectives; show them if present.
        const raw = (this._mission?.objectives || []).find((x) => String(x?.id ?? '') === o.id);
        const pos = raw?.position || raw?.pos || raw?.marker;
        if (Array.isArray(pos) && o.state === 'active') {
          markers.push({ x: pos[0], z: pos[2] ?? pos[1], kind: 'objective', floor });
        }
      }
      this.minimap.render({
        floor,
        player: p ? { x: p.position.x, z: p.position.z, yaw: p.yaw || 0 } : null,
        markers,
        doorStates: this._doorStates,
        showLabels: false,
        showCompass: false,
      });
      this._mapLabel.textContent = floor === 'upper' ? 'MEZZANINE' : 'GROUND';
    }
    return { visible: true, floor };
  }
}

// -------------------------------------------------------------- utilities --

function safeCall(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

function pickNumber(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function objectiveState(o) {
  if (!o || typeof o !== 'object') return 'active';
  const s = String(o.state || o.status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete') || s.includes('success') || o.done === true || o.complete === true) return 'done';
  if (s.includes('fail') || o.failed === true) return 'failed';
  if (s.includes('inactive') || s.includes('pending') || o.active === false) return 'pending';
  return 'active';
}

function normaliseHostages(raw) {
  const list = Array.isArray(raw) ? raw : (raw?.list || raw?.hostages || []);
  if (!Array.isArray(list)) return [];
  return list.map((h, i) => {
    const s = String(h?.state || h?.status || 'captive').toLowerCase();
    let state = 'captive';
    if (s.includes('extract') || s.includes('safe')) state = 'extracted';
    else if (s.includes('follow') || s.includes('escort')) state = 'following';
    else if (s.includes('secure') || s.includes('freed') || s.includes('rescued')) state = 'secured';
    else if (s.includes('dead') || s.includes('lost') || s.includes('down')) state = 'dead';
    const pos = Array.isArray(h?.position) ? h.position
      : h?.position ? [h.position.x || 0, h.position.y || 0, h.position.z || 0] : null;
    return {
      id: String(h?.id ?? i),
      name: shortName(h?.name || h?.id || `Hostage ${i + 1}`),
      state,
      pos,
      revealed: !!(h?.revealed ?? h?.known ?? h?.discovered ?? h?.spotted
        ?? (state !== 'captive')),
    };
  });
}

function shortName(name) {
  const parts = String(name).replace(/^Dr\.\s*/i, '').trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

// ------------------------------------------------------------ tiny drawing --

function drawCrosshair(canvas, { visible, style, gap }) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const c = w / 2;
  ctx.clearRect(0, 0, w, w);
  if (!visible) return;
  ctx.strokeStyle = 'rgba(232, 238, 244, 0.94)';
  ctx.fillStyle = 'rgba(232, 238, 244, 0.94)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 2;
  ctx.lineWidth = 1.6;

  if (style === 'dot') {
    ctx.beginPath();
    ctx.arc(c, c, 1.8, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const len = 7;
  const g = style === 'classic' ? 4 : gap;
  ctx.beginPath();
  ctx.moveTo(c, c - g - len); ctx.lineTo(c, c - g);
  ctx.moveTo(c, c + g); ctx.lineTo(c, c + g + len);
  ctx.moveTo(c - g - len, c); ctx.lineTo(c - g, c);
  ctx.moveTo(c + g, c); ctx.lineTo(c + g + len, c);
  ctx.stroke();
  if (style === 'classic') {
    ctx.beginPath();
    ctx.arc(c, c, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function hitmarkerSvg() {
  return `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke-linecap="round">
    <g class="hm-ticks" stroke="currentColor" stroke-width="2.4">
      <path d="M14 14l7 7M34 14l-7 7M14 34l7-7M34 34l-7-7"/>
    </g>
    <circle class="hm-ring" cx="24" cy="24" r="13" stroke="currentColor" stroke-width="1.4"/>
  </svg>`;
}

function damageArrowSvg() {
  return `<svg viewBox="0 0 190 190" fill="none">
    <path d="M95 8 L112 40 Q95 32 78 40 Z" fill="rgba(255, 77, 67, 0.88)"/>
  </svg>`;
}

function arcSvg() {
  // r = 9, circumference ≈ 56.5; stroke-dashoffset drives the sweep.
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <circle cx="12" cy="12" r="9" stroke="rgba(120,165,190,0.3)" stroke-width="2"/>
    <circle class="arc-fill" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"
      stroke-dasharray="56.5" stroke-dashoffset="56.5" transform="rotate(-90 12 12)"/>
  </svg>`;
}

function setArc(wrap, progress) {
  const circle = wrap.querySelector('.arc-fill');
  if (!circle) return;
  circle.style.strokeDashoffset = String(56.5 * (1 - progress));
  wrap.style.display = progress > 0 ? '' : 'none';
}
