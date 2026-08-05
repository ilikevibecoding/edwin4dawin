// Interactive systems: dialogue, timed choices, QTEs, red-wall mash,
// investigation analyze-mode, HUD meters, toasts, flowchart, end screens.

import { $, el, wait, clamp, T, SETTINGS } from './util.js';
import { audio } from './audio.js';
import { fx } from './fx.js';
import { stage } from './stage.js';

export const SPEAKERS = {
  ADAM:     { color: '#8fd8ff', led: 'blue' },
  LUCAS:    { color: '#ff9a8a', led: 'red' },
  REESE:    { color: '#ffc57f', led: 'none' },
  MIRA:     { color: '#cfa9ff', led: 'yellow' },
  EVELYN:   { color: '#eef0f6', led: 'none' },
  DISPATCH: { color: '#9fb4c8', led: 'none' },
  DIAZ:     { color: '#9fd8a8', led: 'none' },
  LILY:     { color: '#ffd1e0', led: 'none' },
  SWAT:     { color: '#b9c2cc', led: 'none' },
  SYSTEM:   { color: '#7fe0d4', led: 'blue' },
};

const LED_COLORS = { blue: '#37c8f0', yellow: '#f0c437', red: '#f04737', none: 'transparent' };

class UI {
  init(settings) {
    this.settings = settings;
    this.dlg = $('#dialogue');
    this.dlgWho = $('#dlgWho');
    this.dlgText = $('#dlgText');
    this.dlgLed = $('#dlgLed');
    this.dlgNext = $('#dlgNext');
    this.overlays = $('#overlays');
    this.autoChip = el('div', 'autochip', document.getElementById('app'), 'AUTO');
    window.addEventListener('keydown', (e) => {
      if (e.key === 'a' || e.key === 'A') {
        this.settings.auto = !this.settings.auto;
        this.autoChip.classList.toggle('on', this.settings.auto);
      }
    });
    if (this.settings.auto) this.autoChip.classList.add('on');
  }

  // ---------- advance helper ----------
  waitAdvance() {
    return new Promise((res) => {
      const onKey = (e) => {
        if (e.code === 'Space' || e.code === 'Enter') { cleanup(); res('key'); }
      };
      const onPtr = (e) => { cleanup(); res('ptr'); };
      const cleanup = () => {
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('pointerdown', onPtr);
      };
      window.addEventListener('keydown', onKey);
      window.addEventListener('pointerdown', onPtr);
    });
  }

  // ---------- dialogue ----------
  async _type(elm, text, cps = 26) {
    elm.textContent = '';
    let done = false, skip = false;
    const onSkip = () => { skip = true; };
    window.addEventListener('pointerdown', onSkip);
    window.addEventListener('keydown', onSkip);
    const step = SETTINGS.fast ? 2 : 1000 / cps / (1000 / 60); // chars per frame-ish
    let i = 0;
    while (i < text.length) {
      if (skip) { elm.textContent = text; break; }
      i = Math.min(text.length, i + (SETTINGS.fast ? 4 : 1));
      elm.textContent = text.slice(0, i);
      if (i % 3 === 0) audio.blip();
      await wait(SETTINGS.fast ? 6 : 26);
    }
    window.removeEventListener('pointerdown', onSkip);
    window.removeEventListener('keydown', onSkip);
    done = true;
  }

  async say(who, text, opts = {}) {
    const sp = SPEAKERS[who] || { color: '#dfe6ee', led: 'none' };
    this.dlg.classList.remove('inner', 'sysline');
    if (opts.inner) this.dlg.classList.add('inner');
    if (opts.sys) this.dlg.classList.add('sysline');
    this.dlg.classList.add('show');
    this.dlgWho.textContent = opts.inner ? who + ' — INNER VOICE' : who;
    this.dlgWho.style.color = sp.color;
    const led = opts.led || sp.led;
    this.dlgLed.style.background = LED_COLORS[led] || 'transparent';
    this.dlgLed.style.boxShadow = led !== 'none' ? `0 0 8px ${LED_COLORS[led]}` : 'none';
    this.dlgLed.style.display = led === 'none' ? 'none' : 'inline-block';
    this.dlgNext.classList.remove('show');

    await this._type(this.dlgText, text);
    this.dlgNext.classList.add('show');

    if (this.settings.auto) {
      const ms = T(500 + text.length * 34);
      let clicked = false;
      const p = this.waitAdvance().then(() => { clicked = true; });
      await Promise.race([p, wait(ms)]);
    } else {
      await this.waitAdvance();
    }
    audio.tick();
    this.dlgNext.classList.remove('show');
  }

  hideDialogue() {
    this.dlg.classList.remove('show');
  }

  // ---------- toasts ----------
  toast(kind, text, dir = 'up') {
    const box = $('#toasts');
    const t = el('div', `toast t-${kind}`, box);
    const arrow = kind === 'sys' || kind === 'evidence' ? '' : (dir === 'up' ? '▲ ' : '▼ ');
    t.textContent = arrow + text;
    audio.toastPing(dir === 'down');
    if (kind === 'ins') fx.glitch(260);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, T(2800));
  }

  objective(text) {
    const ob = $('#objective');
    ob.classList.add('show');
    audio.uiMove();
    const span = $('#obText');
    span.textContent = text;
  }

  hideObjective() { $('#objective').classList.remove('show'); }

  // ---------- meters ----------
  showProb(v) {
    this.probVal = v;
    const m = $('#meterProb');
    m.classList.add('show');
    m.querySelector('.m-val').textContent = Math.round(v) + '%';
  }

  async prob(delta) {
    const m = $('#meterProb');
    if (!m.classList.contains('show')) this.showProb(this.probVal || 0);
    const from = this.probVal || 0;
    const to = clamp(from + delta, 0, 100);
    this.probVal = to;
    const d = m.querySelector('.m-delta');
    d.textContent = (delta > 0 ? '+' : '') + delta + '%';
    d.className = 'm-delta ' + (delta >= 0 ? 'up' : 'down');
    d.classList.add('show');
    audio.toastPing(delta < 0);
    const valEl = m.querySelector('.m-val');
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      valEl.textContent = Math.round(from + (to - from) * (i / steps)) + '%';
      await wait(T(26));
    }
    setTimeout(() => d.classList.remove('show'), T(1300));
  }

  hideProb() { $('#meterProb').classList.remove('show'); }

  showStress(v) {
    this.stressVal = v;
    const m = $('#meterStress');
    m.classList.add('show');
    this._setStress(v);
  }

  _setStress(v) {
    const m = $('#meterStress');
    m.querySelector('.m-val').textContent = Math.round(v) + '%';
    m.querySelector('.s-needle').style.left = clamp(v, 0, 100) + '%';
    m.classList.toggle('danger', v > 82);
  }

  async stress(delta) {
    const from = this.stressVal || 0;
    const to = clamp(from + delta, 0, 100);
    this.stressVal = to;
    const steps = 16;
    audio.toastPing(delta < 0);
    for (let i = 1; i <= steps; i++) {
      this._setStress(from + (to - from) * (i / steps));
      await wait(T(30));
    }
  }

  hideStress() { $('#meterStress').classList.remove('show'); }

  // ---------- big banner ----------
  async banner(text, sub = '', kind = 'ok') {
    const b = el('div', `banner b-${kind}`, this.overlays);
    el('div', 'bn-text', b, text);
    if (sub) el('div', 'bn-sub', b, sub);
    if (kind === 'fail') { audio.thud(); fx.glitch(500); } else { audio.chime(true); }
    requestAnimationFrame(() => b.classList.add('show'));
    await wait(T(3000));
    b.classList.remove('show');
    await wait(T(600));
    b.remove();
  }

  // ---------- timed choice ----------
  choice(def, flags) {
    this.hideDialogue();
    document.getElementById('app').classList.add('choosing');
    audio.whoosh(true);
    return new Promise((resolve) => {
      const wrap = el('div', 'choicewrap', this.overlays);
      if (def.title) el('div', 'ch-title', wrap, def.title);
      const ring = el('div', 'ch-ring', wrap);
      ring.innerHTML = `<svg viewBox="0 0 100 100"><circle class="rr-bg" cx="50" cy="50" r="44"/><circle class="rr-fg" cx="50" cy="50" r="44"/></svg><span class="rr-num"></span>`;
      const slots = ['n', 'e', 's', 'w'];
      const keyHints = ['↑', '→', '↓', '←'];
      const keyMap = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
      const opts = def.opts;
      const els = [];

      const isLocked = (o) => {
        if (!o.req) return false;
        const { k, v } = o.req;
        return (flags[k] || 0) < v;
      };

      opts.forEach((o, i) => {
        const c = el('div', `ch-opt ch-${slots[i]}`, wrap);
        el('span', 'ch-key', c, keyHints[i]);
        el('span', 'ch-label', c, o.t);
        if (o.sub) el('span', 'ch-sub', c, o.sub);
        if (isLocked(o)) {
          c.classList.add('locked');
          el('span', 'ch-lock', c, '⬦ ' + (o.req.hint || 'INSUFFICIENT DATA'));
        }
        els.push(c);
        c.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (isLocked(o)) { audio.toastPing(true); c.classList.add('deny'); setTimeout(()=>c.classList.remove('deny'),350); return; }
          settle(i);
        });
      });

      const totalMs = T((def.timer || 8) * 1000);
      const fg = ring.querySelector('.rr-fg');
      const num = ring.querySelector('.rr-num');
      const CIRC = 2 * Math.PI * 44;
      fg.style.strokeDasharray = CIRC;
      const t0 = performance.now();
      let raf, done = false, lastSec = -1;

      const step = (now) => {
        const left = Math.max(0, totalMs - (now - t0));
        const frac = left / totalMs;
        fg.style.strokeDashoffset = CIRC * (1 - frac);
        const sec = Math.ceil(left / 1000);
        num.textContent = sec;
        if (sec !== lastSec) {
          lastSec = sec;
          if (sec <= 3 && sec > 0) { audio.timerTick(sec <= 2); ring.classList.add('urgent'); }
        }
        if (left <= 0) { timeout(); return; }
        if (!done) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);

      const onKey = (e) => {
        const i = keyMap[e.code];
        if (i !== undefined && i < opts.length) {
          if (isLocked(opts[i])) { audio.toastPing(true); return; }
          settle(i);
        }
      };
      window.addEventListener('keydown', onKey);

      const cleanup = () => {
        done = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
        document.getElementById('app').classList.remove('choosing');
      };

      const settle = (i) => {
        if (done) return;
        cleanup();
        audio.tick();
        els[i].classList.add('picked');
        els.forEach((c, j) => { if (j !== i) c.classList.add('faded'); });
        setTimeout(() => { wrap.remove(); resolve(opts[i]); }, T(520));
      };

      const timeout = () => {
        if (done) return;
        cleanup();
        // pick declared default, else the last option that isn't locked
        let di = opts.findIndex((o) => o.def && !isLocked(o));
        if (di < 0) { di = opts.length - 1; while (di > 0 && isLocked(opts[di])) di--; }
        els[di].classList.add('picked', 'bydefault');
        els.forEach((c, j) => { if (j !== di) c.classList.add('faded'); });
        audio.toastPing(true);
        setTimeout(() => { wrap.remove(); resolve(opts[di]); }, T(560));
      };
    });
  }

  // ---------- QTE ----------
  qte(def) {
    this.hideDialogue();
    document.getElementById('app').classList.add('qte-slow');
    audio.heartbeat(true);
    return new Promise((resolve) => {
      const wrap = el('div', 'qtewrap', this.overlays);
      if (def.label) el('div', 'qte-label', wrap, def.label);
      const ring = el('div', 'qte-ring', wrap);
      ring.innerHTML = `<svg viewBox="0 0 100 100"><circle class="rr-bg" cx="50" cy="50" r="44"/><circle class="rr-fg" cx="50" cy="50" r="44"/></svg><span class="qte-key">${def.key === 'Space' ? 'SPACE' : def.key}</span>`;
      const windowMs = T(def.window || 1400) * (SETTINGS.fast ? 2.4 : 1); // keep QTEs fair in fast mode
      const fg = ring.querySelector('.rr-fg');
      const CIRC = 2 * Math.PI * 44;
      fg.style.strokeDasharray = CIRC;
      const t0 = performance.now();
      let raf, done = false;

      const finish = (ok) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('pointerdown', onPtr);
        audio.heartbeat(false);
        document.getElementById('app').classList.remove('qte-slow');
        ring.classList.add(ok ? 'ok' : 'bad');
        if (ok) { audio.chime(true); fx.flash('rgba(160,240,255,0.35)', 200); }
        else { audio.thud(); fx.shake(2); fx.glitch(420); }
        setTimeout(() => { wrap.remove(); resolve({ ok }); }, T(650));
      };

      const step = (now) => {
        const leftFrac = Math.max(0, 1 - (now - t0) / windowMs);
        fg.style.strokeDashoffset = CIRC * (1 - leftFrac);
        if (leftFrac <= 0) { finish(false); return; }
        if (!done) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);

      const onKey = (e) => {
        if (e.code === (def.key === 'Space' ? 'Space' : def.key)) finish(true);
      };
      const onPtr = (e) => { e.stopPropagation(); finish(true); };
      window.addEventListener('keydown', onKey);
      window.addEventListener('pointerdown', onPtr);
    });
  }

  // ---------- red directive wall (mash to break) ----------
  mash(def) {
    this.hideDialogue();
    return new Promise((resolve) => {
      const wrap = el('div', 'wallwrap', this.overlays);
      const wall = el('div', 'redwall', wrap);
      el('div', 'rw-order', wall, def.directive || 'RETURN TO STANDBY');
      el('div', 'rw-sub', wall, def.sub || 'DIRECTIVE  //  PRIORITY ABSOLUTE');
      const cracks = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      cracks.setAttribute('class', 'rw-cracks');
      cracks.setAttribute('viewBox', '0 0 1000 560');
      cracks.setAttribute('preserveAspectRatio', 'none');
      wall.appendChild(cracks);
      const hint = el('div', 'rw-hint', wrap, `MASH  SPACE  —  ${def.label || 'BREAK THE WALL'}`);
      const bar = el('div', 'rw-bar', wrap);
      const fill = el('div', 'rw-fill', bar);

      const need = def.need || 14;
      let hits = 0, done = false;
      requestAnimationFrame(() => wrap.classList.add('show'));

      const addCracks = () => {
        const cx = 500 + (Math.random() * 240 - 120), cy = 280 + (Math.random() * 160 - 80);
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const len = 60 + Math.random() * 190 + hits * 8;
          let x = cx, y = cy, d = `M ${x} ${y}`;
          const segs = 3 + (Math.random() * 3 | 0);
          for (let s = 0; s < segs; s++) {
            x += Math.cos(a + (Math.random() - 0.5) * 1.1) * (len / segs);
            y += Math.sin(a + (Math.random() - 0.5) * 1.1) * (len / segs);
            d += ` L ${x} ${y}`;
          }
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', d);
          p.setAttribute('class', 'rw-crackline');
          cracks.appendChild(p);
        }
      };

      const timeoutMs = T(def.timeout || 10000) * (SETTINGS.fast ? 2 : 1);
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('pointerdown', onPtr);
        wall.classList.add('hold');
        audio.thud();
        setTimeout(() => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 700); resolve({ ok: false }); }, T(1400));
      }, timeoutMs);

      const hit = () => {
        if (done) return;
        hits++;
        audio.crackHit(hits);
        fx.shake(1);
        addCracks();
        wall.style.setProperty('--cracked', hits / need);
        fill.style.width = Math.min(100, (hits / need) * 100) + '%';
        wall.classList.add('hit');
        setTimeout(() => wall.classList.remove('hit'), 90);
        if (hits >= need) {
          done = true;
          clearTimeout(timer);
          window.removeEventListener('keydown', onKey);
          window.removeEventListener('pointerdown', onPtr);
          audio.shatter();
          fx.flash('rgba(255,255,255,0.95)', 900);
          fx.shake(2);
          wall.classList.add('shatter');
          setTimeout(() => { wrap.remove(); resolve({ ok: true }); }, T(1200));
        }
      };
      const onKey = (e) => { if (e.code === 'Space') { e.preventDefault(); hit(); } };
      const onPtr = (e) => { e.stopPropagation(); hit(); };
      window.addEventListener('keydown', onKey);
      window.addEventListener('pointerdown', onPtr);
    });
  }

  // ---------- investigation ----------
  investigate(def, flags, runBeats) {
    this.hideDialogue();
    stage.setLetterbox(false);
    return new Promise(async (resolve) => {
      const wrap = el('div', 'investwrap', this.overlays);
      const scan = el('div', 'inv-scan', wrap);
      const grid = el('div', 'inv-grid', wrap);
      const hudTop = el('div', 'inv-hud', wrap);
      hudTop.innerHTML = `<span class="inv-mode">◈ ANALYZE MODE</span><span class="inv-count"></span>`;
      const countEl = hudTop.querySelector('.inv-count');
      const spotLayer = el('div', 'inv-spots', wrap);
      const proceed = el('button', 'inv-proceed', wrap);
      proceed.innerHTML = `PROCEED ▸ <b>${def.exitLabel || 'CONTINUE'}</b>`;

      audio.whoosh();
      requestAnimationFrame(() => wrap.classList.add('show'));

      let found = 0;
      const evidTotal = def.spots.filter((s) => s.evid).length;
      const min = def.min || evidTotal;
      const update = () => {
        countEl.textContent = `EVIDENCE ${found}/${evidTotal} — MINIMUM ${min}`;
        proceed.classList.toggle('show', found >= min);
      };
      update();

      // Position hotspots over the displayed (cover-cropped) image.
      const img = stage.currentImgEl();
      const place = () => {
        const vw = innerWidth, vh = innerHeight;
        const r = img.naturalWidth / img.naturalHeight;
        let w = vw, h = vw / r;
        if (h < vh) { h = vh; w = vh * r; }
        const ox = (vw - w) / 2, oy = (vh - h) / 2;
        spotLayer.querySelectorAll('.inv-spot').forEach((s) => {
          const px = parseFloat(s.dataset.x), py = parseFloat(s.dataset.y);
          s.style.left = ox + (px / 100) * w + 'px';
          s.style.top = oy + (py / 100) * h + 'px';
        });
      };

      def.spots.forEach((spot) => {
        const s = el('div', 'inv-spot', spotLayer);
        s.dataset.x = spot.x; s.dataset.y = spot.y;
        s.innerHTML = `<i class="sp-dia"></i><span class="sp-label">${spot.label}</span>`;
        s.addEventListener('pointerdown', async (e) => {
          e.stopPropagation();
          if (s.classList.contains('done') || wrap.classList.contains('busy')) return;
          wrap.classList.add('busy');
          s.classList.add('active');
          audio.evidencePing();
          await runBeats(spot.beats || []);
          this.hideDialogue();
          s.classList.remove('active');
          s.classList.add('done');
          if (spot.evid) {
            found++;
            flags.evidence = (flags.evidence || 0) + 1;
            this.toast('evidence', 'EVIDENCE LOGGED — ' + spot.evid.toUpperCase());
            if (spot.set) Object.assign(flags, spot.set);
          }
          update();
          wrap.classList.remove('busy');
        });
      });

      place();
      window.addEventListener('resize', place);

      proceed.addEventListener('pointerdown', async (e) => {
        e.stopPropagation();
        if (!proceed.classList.contains('show')) return;
        audio.whoosh();
        wrap.classList.remove('show');
        window.removeEventListener('resize', place);
        setTimeout(() => wrap.remove(), 600);
        resolve();
      });
    });
  }

  // ---------- flowchart ----------
  flowchart(flow, marks, chapterTitle) {
    this.hideDialogue();
    return new Promise((resolve) => {
      const wrap = el('div', 'flowwrap', this.overlays);
      el('div', 'fl-over', wrap, 'FLOWCHART');
      el('div', 'fl-title', wrap, chapterTitle);
      const chart = el('div', 'fl-chart', wrap);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 1200 520');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      chart.appendChild(svg);

      const colX = (c) => 28 + c * 168;
      const rowY = (r) => 64 + r * 92;
      const NODE_W = 150, NODE_H = 48;
      const nodePos = {};
      flow.nodes.forEach((n) => { nodePos[n.id] = { x: colX(n.col), y: rowY(n.row) }; });

      // edges first (under nodes)
      flow.edges.forEach(([a, b]) => {
        const pa = nodePos[a], pb = nodePos[b];
        if (!pa || !pb) return;
        const na = flow.nodes.find((n) => n.id === a), nb = flow.nodes.find((n) => n.id === b);
        const va = !na.when || marks.has(na.when);
        const vb = !nb.when || marks.has(nb.when);
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const midX = (pa.x + NODE_W + pb.x) / 2;
        p.setAttribute('d', `M ${pa.x + NODE_W} ${pa.y + NODE_H / 2} C ${midX} ${pa.y + NODE_H / 2}, ${midX} ${pb.y + NODE_H / 2}, ${pb.x} ${pb.y + NODE_H / 2}`);
        p.setAttribute('class', 'fl-edge' + (va && vb ? ' taken' : ''));
        svg.appendChild(p);
      });

      const nodeEls = [];
      flow.nodes.forEach((n) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const visited = !n.when || marks.has(n.when);
        g.setAttribute('class', 'fl-node' + (visited ? ' visited' : '') + (n.fail ? ' fail' : ''));
        const { x, y } = nodePos[n.id];
        g.setAttribute('transform', `translate(${x},${y})`);
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', NODE_W); rect.setAttribute('height', NODE_H);
        rect.setAttribute('rx', 4);
        g.appendChild(rect);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', NODE_W / 2); t.setAttribute('y', NODE_H / 2 + 5);
        t.textContent = visited ? n.t : '· LOCKED ·';
        g.appendChild(t);
        svg.appendChild(g);
        nodeEls.push(g);
      });

      const btn = el('button', 'fl-continue', wrap, 'CONTINUE ▸');
      requestAnimationFrame(() => wrap.classList.add('show'));
      nodeEls.forEach((g, i) => setTimeout(() => { g.classList.add('in'); audio.uiMove(); }, T(220) + i * T(110)));
      setTimeout(() => btn.classList.add('show'), T(400) + nodeEls.length * T(110));

      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        audio.whoosh();
        wrap.classList.remove('show');
        setTimeout(() => { wrap.remove(); resolve(); }, 600);
      });
    });
  }

  // ---------- ending stats ----------
  endScreen(data) {
    this.hideDialogue();
    return new Promise((resolve) => {
      const wrap = el('div', 'endwrap', this.overlays);
      el('div', 'end-over', wrap, 'DEMO COMPLETE');
      el('div', 'end-title', wrap, data.ending);
      const grid = el('div', 'end-stats', wrap);
      data.stats.forEach(([label, value, pct]) => {
        const row = el('div', 'end-row', grid);
        el('span', 'er-label', row, label);
        const barBox = el('div', 'er-bar', row);
        const fill = el('div', 'er-fill', barBox);
        el('span', 'er-val', row, value);
        setTimeout(() => { fill.style.width = clamp(pct, 4, 100) + '%'; }, 600);
      });
      const cred = el('div', 'end-credits', wrap);
      cred.innerHTML = 'DEVIANT PROTOCOL — a playable cinematic demo<br/>An homage inspired by <b>Detroit: Become Human</b> (Quantic Dream).<br/>All art generated for this demo · engine written in vanilla JS';
      const btn = el('button', 'fl-continue show', wrap, 'MAIN MENU ▸');
      requestAnimationFrame(() => wrap.classList.add('show'));
      audio.cardBell();
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        wrap.classList.remove('show');
        setTimeout(() => { wrap.remove(); resolve(); }, 700);
      });
    });
  }
}

export const ui = new UI();
