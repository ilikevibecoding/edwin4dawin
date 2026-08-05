/**
 * DOM interface layer: subtitles, dialogue wheel with timer, QTE prompts, scan
 * overlay, objectives, title cards, flowchart. Keeping the interface in HTML/CSS
 * gives crisp type at any resolution and keeps the render loop free of UI work.
 */
import * as THREE from 'three';
import { clamp } from '../engine/math';
import type { ChoiceOption, FlowNode } from './script';
import type { ScanTargetDef } from '../sets/types';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

export class UI {
  private subs = $('subs');
  private subsWho = $('subs-who');
  private subsLine = $('subs-line');
  private choices = $('choices');
  private choiceList = $('choice-list');
  private choiceArc = $<HTMLElement>('choice-arc');
  private choiceTimer = $('choice-timer');
  private qte = $('qte');
  private card = $('card');
  private cardKicker = $('card-kicker');
  private cardTitle = $('card-title');
  private cardSub = $('card-sub');
  private hud = $('hud');
  private hudActor = $('hud-actor-name');
  private hudModel = $('hud-actor-model');
  private hudLed = $('hud-led');
  private objective = $('hud-objective');
  private objectiveText = $('hud-objective-text');
  private stabilityWrap = $('hud-stability');
  private stabilityFill = $('hud-stability-fill');
  private scan = $('scan');
  private scanMarkers = $('scan-markers');
  private scanReadout = $('scan-readout');
  private scanProgress = $('scan-progress');
  private scanHint = $('hud-scanhint');
  private precon = $('precon');
  private preconFill = $('precon-fill');
  private preconLabel = $('precon-label');
  private fade = $('fade');
  private toastEl = $('toast');
  private letterbox = $('letterbox');
  private flow = $('flow');
  private flowCanvas = $('flow-canvas');
  private flowSub = $('flow-sub');
  private flowStats = $('flow-stats');
  private perf = $('perf');

  /* --------------------------------------------------------------- basics */

  setLetterbox(on: boolean): void {
    this.letterbox.classList.toggle('cinema', on);
  }

  showHud(on: boolean, actor?: string, model?: string): void {
    this.hud.classList.toggle('hidden', !on);
    if (actor) this.hudActor.textContent = actor;
    if (model) this.hudModel.textContent = model;
  }

  setLed(state: 'blue' | 'yellow' | 'red' | 'off'): void {
    this.hudLed.className = 'led' + (state === 'yellow' ? ' warn' : state === 'red' ? ' bad' : '');
  }

  setObjective(text: string, done = false): void {
    this.objectiveText.textContent = text;
    this.objective.classList.toggle('done', done);
  }

  setInstability(v: number): void {
    const pct = clamp(v) * 100;
    this.stabilityFill.style.width = `${Math.max(4, pct)}%`;
    this.stabilityWrap.classList.toggle('hot', v > 0.55);
  }

  say(who: string, text: string, think = false): void {
    this.subs.classList.remove('hidden');
    this.subs.classList.toggle('think', think);
    this.subsWho.textContent = think ? `${who} — ANALYSING` : who;
    this.subsLine.textContent = text;
  }
  clearSay(): void {
    this.subs.classList.add('hidden');
  }

  toast(text: string, warn = false): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.toggle('warn', warn);
    this.toastEl.classList.remove('hidden');
    window.setTimeout(() => this.toastEl.classList.add('hidden'), 2600);
  }

  setFade(on: boolean, white = false, dur = 0.7): void {
    this.fade.style.transitionDuration = `${dur}s`;
    this.fade.classList.toggle('white', white);
    this.fade.classList.toggle('on', on);
  }

  showCard(kicker: string, title: string, sub: string): void {
    this.cardKicker.textContent = kicker;
    this.cardTitle.textContent = title;
    this.cardSub.textContent = sub;
    this.card.classList.remove('hidden');
    // Restart the entry animation.
    const inner = this.card.firstElementChild as HTMLElement;
    inner.style.animation = 'none';
    void inner.offsetHeight;
    inner.style.animation = '';
  }
  hideCard(): void {
    this.card.classList.add('hidden');
  }

  showPerf(text: string | null): void {
    if (text === null) {
      this.perf.classList.add('hidden');
      return;
    }
    this.perf.classList.remove('hidden');
    this.perf.textContent = text;
  }

  /* -------------------------------------------------------------- choices */

  private choiceEls: HTMLElement[] = [];
  private choiceResolve: ((index: number) => void) | null = null;
  private choiceTotal = 0;
  private choiceLeft = 0;
  private choiceHot = 0;

  askChoice(options: ChoiceOption[], time: number, onPick: (index: number) => void): void {
    this.choiceList.innerHTML = '';
    this.choiceEls = [];
    this.choiceResolve = onPick;
    this.choiceTotal = time;
    this.choiceLeft = time;
    this.choiceHot = 0;
    options.forEach((o, i) => {
      const el = document.createElement('button');
      el.className = 'opt' + (o.risk ? ' risk' : '');
      el.innerHTML = `<span class="key">${i + 1}</span><span class="lbl"></span>${o.hint ? '<span class="hint"></span>' : ''}`;
      (el.querySelector('.lbl') as HTMLElement).textContent = o.label;
      if (o.hint) (el.querySelector('.hint') as HTMLElement).textContent = o.hint;
      el.addEventListener('click', () => this.pick(i));
      el.addEventListener('mouseenter', () => this.highlight(i));
      this.choiceList.appendChild(el);
      this.choiceEls.push(el);
    });
    this.choices.classList.remove('hidden');
    this.choiceTimer.classList.toggle('hidden', time <= 0);
    this.highlight(0);
  }

  highlight(i: number): void {
    this.choiceHot = clamp(i, 0, this.choiceEls.length - 1);
    this.choiceEls.forEach((el, k) => el.classList.toggle('hot', k === this.choiceHot));
  }
  moveHighlight(delta: number): void {
    if (!this.choiceEls.length) return;
    this.highlight((this.choiceHot + delta + this.choiceEls.length) % this.choiceEls.length);
  }
  get highlighted(): number {
    return this.choiceHot;
  }

  pick(i: number): void {
    if (!this.choiceResolve) return;
    const el = this.choiceEls[i];
    if (el) el.classList.add('picked');
    const cb = this.choiceResolve;
    this.choiceResolve = null;
    window.setTimeout(() => {
      this.choices.classList.add('hidden');
      cb(i);
    }, 260);
  }

  get choosing(): boolean {
    return this.choiceResolve !== null;
  }

  updateChoiceTimer(dt: number): void {
    if (!this.choiceResolve || this.choiceTotal <= 0) return;
    this.choiceLeft = Math.max(0, this.choiceLeft - dt);
    const frac = this.choiceLeft / this.choiceTotal;
    const circumference = 2 * Math.PI * 44;
    this.choiceArc.style.strokeDashoffset = `${circumference * (1 - frac)}`;
    this.choiceTimer.classList.toggle('low', frac < 0.3);
    if (this.choiceLeft <= 0) {
      // Timeout selects the last option — silence is a choice.
      this.pick(this.choiceEls.length - 1);
    }
  }

  /* ------------------------------------------------------------------ qte */

  private qteState: {
    key: string;
    kind: 'press' | 'hold' | 'mash';
    left: number;
    total: number;
    hits: number;
    need: number;
    resolve: (ok: boolean) => void;
    el: HTMLElement;
    fill?: HTMLElement;
  } | null = null;

  askQte(
    key: string,
    kind: 'press' | 'hold' | 'mash',
    window_: number,
    caption: string,
    onDone: (ok: boolean) => void,
  ): void {
    const el = document.createElement('div');
    el.className = 'prompt';
    const label = key === ' ' ? 'SPACE' : key.toUpperCase();
    el.innerHTML = `
      <div class="ring2" style="animation-duration:${window_}s"></div>
      <div class="disc"><span>${label}</span></div>
      <div class="cap">${caption}</div>
      ${kind === 'mash' ? '<div class="mash"><i></i></div>' : ''}`;
    // Prompts appear off-centre so they do not cover the performance.
    el.style.left = `${46 + (Math.random() * 16 - 8)}%`;
    el.style.top = `${44 + (Math.random() * 14 - 7)}%`;
    this.qte.innerHTML = '';
    this.qte.appendChild(el);
    this.qte.classList.remove('hidden');
    this.qteState = {
      key: key.toLowerCase(),
      kind,
      left: window_,
      total: window_,
      hits: 0,
      need: kind === 'mash' ? 8 : 1,
      resolve: onDone,
      el,
      fill: el.querySelector('.mash i') as HTMLElement | undefined,
    };
  }

  get qteActive(): boolean {
    return this.qteState !== null;
  }

  qteKey(key: string): void {
    const s = this.qteState;
    if (!s) return;
    if (key.toLowerCase() !== s.key) return;
    s.hits++;
    if (s.fill) s.fill.style.width = `${Math.min(100, (s.hits / s.need) * 100)}%`;
    if (s.hits >= s.need) this.finishQte(true);
  }

  private finishQte(ok: boolean): void {
    const s = this.qteState;
    if (!s) return;
    this.qteState = null;
    s.el.classList.add(ok ? 'hit' : 'miss');
    window.setTimeout(() => {
      this.qte.classList.add('hidden');
      this.qte.innerHTML = '';
    }, 420);
    s.resolve(ok);
  }

  updateQte(dt: number): void {
    const s = this.qteState;
    if (!s) return;
    s.left -= dt;
    if (s.kind === 'hold' && s.hits > 0) {
      // Holding accumulates while the key is down (tracked by the caller).
      s.hits += dt * 3;
      if (s.hits > 2) this.finishQte(true);
    }
    if (s.left <= 0) this.finishQte(false);
  }

  /* ----------------------------------------------------------------- scan */

  private scanMarkerEls = new Map<string, HTMLElement>();
  private scanFound = new Set<string>();
  private scanActive = false;
  private scanTargets: ScanTargetDef[] = [];
  private scanNeed = 0;
  private scanResolve: ((found: string[]) => void) | null = null;
  private scanHoverId: string | null = null;

  showScanHint(on: boolean): void {
    this.scanHint.classList.toggle('show', on);
  }

  beginScan(targets: ScanTargetDef[], need: number, onDone: (found: string[]) => void): void {
    this.scanTargets = targets;
    this.scanNeed = Math.min(need, targets.length);
    this.scanResolve = onDone;
    this.scanFound.clear();
    this.scanMarkerEls.clear();
    this.scanMarkers.innerHTML = '';
    this.scanReadout.classList.remove('show');
    for (const t of targets) {
      const el = document.createElement('div');
      el.className = 'marker';
      el.innerHTML = `<div class="ring"><div class="core"></div></div><div class="tag">${t.label}</div>`;
      this.scanMarkers.appendChild(el);
      this.scanMarkerEls.set(t.id, el);
    }
    this.scan.classList.remove('hidden');
    this.scanActive = true;
    this.updateScanProgress();
  }

  endScan(): void {
    this.scanActive = false;
    this.scan.classList.add('hidden');
    this.scanReadout.classList.remove('show');
    const cb = this.scanResolve;
    this.scanResolve = null;
    if (cb) cb([...this.scanFound]);
  }

  get scanning(): boolean {
    return this.scanActive;
  }

  private updateScanProgress(): void {
    this.scanProgress.textContent = `${this.scanFound.size} / ${this.scanNeed}`;
  }

  /** Project markers to screen space and handle hover/selection. */
  updateScan(camera: THREE.PerspectiveCamera, pointer: { x: number; y: number }): void {
    if (!this.scanActive) return;
    const v = new THREE.Vector3();
    let best: { id: string; dist: number } | null = null;
    for (const t of this.scanTargets) {
      const el = this.scanMarkerEls.get(t.id);
      if (!el) continue;
      v.set(t.at[0], t.at[1], t.at[2]).project(camera);
      const behind = v.z > 1;
      const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
      const onScreen = !behind && v.x > -1.05 && v.x < 1.05 && v.y > -1.05 && v.y < 1.05;
      el.style.display = onScreen ? 'block' : 'none';
      if (!onScreen) continue;
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      const d = Math.hypot(sx - pointer.x, sy - pointer.y);
      if (d < 90 && (!best || d < best.dist)) best = { id: t.id, dist: d };
      el.classList.toggle('found', this.scanFound.has(t.id));
    }
    for (const [id, el] of this.scanMarkerEls) el.classList.toggle('hot', best?.id === id);
    this.scanHoverId = best?.id ?? null;
  }

  /** Confirm the currently hovered marker. Returns the target if newly found. */
  confirmScan(): ScanTargetDef | null {
    if (!this.scanActive || !this.scanHoverId) return null;
    if (this.scanFound.has(this.scanHoverId)) return null;
    const t = this.scanTargets.find((x) => x.id === this.scanHoverId);
    if (!t) return null;
    this.scanFound.add(t.id);
    this.updateScanProgress();
    this.scanReadout.innerHTML =
      `<b>${t.label}</b><br>` + t.readout.map((r) => `· ${r}`).join('<br>');
    this.scanReadout.classList.add('show');
    if (this.scanFound.size >= this.scanNeed) {
      window.setTimeout(() => this.endScan(), 1500);
    }
    return t;
  }

  /* ----------------------------------------------------- preconstruction */

  showPrecon(label: string): void {
    this.preconLabel.textContent = label;
    this.preconFill.style.width = '0%';
    this.precon.classList.remove('hidden');
  }
  updatePrecon(frac: number): void {
    this.preconFill.style.width = `${clamp(frac) * 100}%`;
  }
  hidePrecon(): void {
    this.precon.classList.add('hidden');
  }

  /* ------------------------------------------------------------ flowchart */

  showFlow(
    chapterTitle: string,
    nodes: FlowNode[],
    taken: Set<string>,
    stats: { label: string; value: string }[],
  ): void {
    this.flowSub.textContent = chapterTitle;
    this.flowCanvas.innerHTML = '';
    const cols = Math.max(...nodes.map((n) => n.col)) + 1;
    const rows = Math.max(...nodes.map((n) => n.row)) + 1;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'flow-svg');
    this.flowCanvas.appendChild(svg);

    const posOf = (n: FlowNode) => ({
      x: ((n.col + 0.5) / cols) * 100,
      y: ((n.row + 0.5) / rows) * 100,
    });

    for (const n of nodes) {
      const p = posOf(n);
      const el = document.createElement('div');
      const isTaken = taken.has(n.id);
      el.className = `fnode ${isTaken ? 'taken' : 'missed'}${n.kind === 'death' ? ' death' : ''}`;
      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;
      el.style.animationDelay = `${n.col * 90}ms`;
      el.innerHTML = `<span class="n-kind">${n.kind ?? 'beat'}</span>${n.label}`;
      this.flowCanvas.appendChild(el);

      for (const from of n.from ?? []) {
        const src = nodes.find((x) => x.id === from);
        if (!src) continue;
        const a = posOf(src);
        const path = document.createElementNS(svgNS, 'path');
        const midX = (a.x + p.x) / 2;
        path.setAttribute(
          'd',
          `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${p.y}, ${p.x} ${p.y}`,
        );
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        if (isTaken && taken.has(from)) path.setAttribute('class', 'taken');
        svg.appendChild(path);
      }
    }
    // SVG uses a percentage coordinate space so nodes and links line up.
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    this.flowStats.innerHTML = stats.map((s) => `${s.label}: <b>${s.value}</b>`).join(' &nbsp;·&nbsp; ');
    this.flow.classList.remove('hidden');
  }

  hideFlow(): void {
    this.flow.classList.add('hidden');
  }
  get flowVisible(): boolean {
    return !this.flow.classList.contains('hidden');
  }
}
