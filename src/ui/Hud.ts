import * as THREE from 'three';
import type { ChapterFlow } from '../story/State';
import type { StoryState } from '../story/State';
import './hud.css';

/**
 * Head-up display.
 *
 * Owns every piece of on-screen interface: subtitles, the timed choice ring,
 * quick-time prompts, the scan overlay and its world-anchored clue reticles,
 * chapter cards and the end-of-chapter flowchart.
 *
 * World-anchored elements are positioned by projecting a world point through the
 * active camera each frame, which keeps them locked to the geometry without the
 * cost or aliasing of drawing them in the scene.
 */

export interface ChoiceOption {
  /** Short keyword shown on the button, DBH style. */
  label: string;
  /** Optional second line: what the line will actually be. */
  hint?: string;
  /** Screen anchor in 0..1 coordinates. */
  at?: [number, number];
  id: string;
}

export interface ClueMarker {
  id: string;
  label: string;
  world: THREE.Vector3;
  found: boolean;
  el: HTMLElement;
}

export type QteKey = 'W' | 'A' | 'S' | 'D' | 'E' | 'Q' | 'SPACE';

const QTE_CODES: Record<QteKey, string> = {
  W: 'KeyW',
  A: 'KeyA',
  S: 'KeyS',
  D: 'KeyD',
  E: 'KeyE',
  Q: 'KeyQ',
  SPACE: 'Space',
};

export class Hud {
  readonly root: HTMLElement;
  private subtitle: HTMLElement;
  private subWho: HTMLElement;
  private subLine: HTMLElement;
  private choicesEl: HTMLElement;
  private timerEl: HTMLElement;
  private timerFill: HTMLElement;
  private qteEl: HTMLElement;
  private scanEl: HTMLElement;
  private scanReadout: HTMLElement;
  private scanProgressFill: HTMLElement;
  private scanProgressLabel: HTMLElement;
  private statusEl: HTMLElement;
  private cardEl: HTMLElement;
  private flowEl: HTMLElement;
  private promptEl: HTMLElement;
  private toastEl: HTMLElement;
  private fadeEl: HTMLElement;
  private boxTop: HTMLElement;
  private boxBottom: HTMLElement;
  private loadingEl: HTMLElement;
  private loadingFill: HTMLElement;
  private menuEl: HTMLElement;

  private clues: ClueMarker[] = [];
  private choiceEls: HTMLElement[] = [];
  private qteEls: { el: HTMLElement; ring: HTMLElement; world?: THREE.Vector3 }[] = [];
  private toastTimer = 0;

  constructor(container: HTMLElement) {
    const root = document.createElement('div');
    root.id = 'hud';
    root.innerHTML = `
      <div id="scan">
        <div id="scan-frame"></div>
        <div id="scan-readout"></div>
        <div id="scan-progress">
          <div class="label">RECONSTRUCTION</div>
          <div class="bar"><i style="width:0%"></i></div>
        </div>
      </div>
      <div id="status">
        <div class="name"></div>
        <div class="model"></div>
        <div class="gauge">
          <div class="label"><span class="gname">STRESS</span><span class="gval">0%</span></div>
          <div class="bar"><i style="width:0%"></i></div>
        </div>
      </div>
      <div id="qte"></div>
      <div id="choices"></div>
      <div id="choice-timer" style="display:none"><i></i></div>
      <div id="subtitle"><div class="who"></div><div class="line"></div></div>
      <div id="prompt"></div>
      <div id="toast"></div>
      <div id="card"><div class="inner">
        <div class="kicker"></div>
        <div class="title"></div>
        <div class="rule"></div>
        <div class="sub"></div>
      </div></div>
      <div id="flow"></div>
      <div id="letterbox-top"></div>
      <div id="letterbox-bottom"></div>
      <div id="fade"></div>
      <div id="menu" class="off"><div class="panel">
        <div class="brand">Neo&nbsp;Detroit</div>
        <div class="tagline">A story of machines that started to feel</div>
        <button type="button">Begin</button>
        <div class="keys">
          MOVE&nbsp;&nbsp;W A S D &nbsp;&nbsp;·&nbsp;&nbsp; SCAN&nbsp;&nbsp;Q &nbsp;&nbsp;·&nbsp;&nbsp; INTERACT&nbsp;&nbsp;E<br />
          CHOOSE&nbsp;&nbsp;MOUSE / A D &nbsp;&nbsp;·&nbsp;&nbsp; CONFIRM&nbsp;&nbsp;ENTER
        </div>
      </div></div>
      <div id="loading"><div class="wrap">
        <div class="msg">INITIALISING</div>
        <div class="bar"><i></i></div>
      </div></div>
    `;
    container.appendChild(root);
    this.root = root;

    const q = <T extends HTMLElement>(sel: string): T => root.querySelector(sel) as T;
    this.subtitle = q('#subtitle');
    this.subWho = q('#subtitle .who');
    this.subLine = q('#subtitle .line');
    this.choicesEl = q('#choices');
    this.timerEl = q('#choice-timer');
    this.timerFill = q('#choice-timer i');
    this.qteEl = q('#qte');
    this.scanEl = q('#scan');
    this.scanReadout = q('#scan-readout');
    this.scanProgressFill = q('#scan-progress .bar i');
    this.scanProgressLabel = q('#scan-progress .label');
    this.statusEl = q('#status');
    this.cardEl = q('#card');
    this.flowEl = q('#flow');
    this.promptEl = q('#prompt');
    this.toastEl = q('#toast');
    this.fadeEl = q('#fade');
    this.boxTop = q('#letterbox-top');
    this.boxBottom = q('#letterbox-bottom');
    this.loadingEl = q('#loading');
    this.loadingFill = q('#loading .bar i');
    this.menuEl = q('#menu');
  }

  // ------------------------------------------------------------------- boot UI

  setLoading(fraction: number, message?: string): void {
    this.loadingFill.style.width = `${Math.round(fraction * 100)}%`;
    if (message) (this.loadingEl.querySelector('.msg') as HTMLElement).textContent = message;
  }

  hideLoading(): void {
    this.loadingEl.classList.add('off');
  }

  showMenu(onStart: () => void): void {
    this.menuEl.classList.remove('off');
    const button = this.menuEl.querySelector('button') as HTMLButtonElement;
    button.onclick = () => {
      this.menuEl.classList.add('off');
      onStart();
    };
  }

  hideMenu(): void {
    this.menuEl.classList.add('off');
  }

  // ----------------------------------------------------------------- subtitles

  say(who: string, line: string, opts: { thought?: boolean } = {}): void {
    this.subWho.textContent = opts.thought ? '' : who;
    this.subLine.textContent = line;
    this.subtitle.classList.toggle('thought', Boolean(opts.thought));
    this.subtitle.classList.add('on');
  }

  clearSubtitle(): void {
    this.subtitle.classList.remove('on');
  }

  // -------------------------------------------------------------------- prompt

  prompt(html: string | null): void {
    if (!html) {
      this.promptEl.classList.remove('on');
      return;
    }
    this.promptEl.innerHTML = html;
    this.promptEl.classList.add('on');
  }

  toast(text: string, seconds = 2.6): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('on');
    this.toastTimer = seconds;
  }

  // ------------------------------------------------------------------- choices

  /** Lays out choice buttons; returns the elements so the caller can highlight. */
  showChoices(options: ChoiceOption[]): void {
    this.choicesEl.innerHTML = '';
    this.choiceEls = [];
    const n = options.length;
    options.forEach((opt, i) => {
      const el = document.createElement('div');
      el.className = 'choice';
      el.innerHTML = opt.hint
        ? `${opt.label}<span class="sub">${opt.hint}</span>`
        : opt.label;
      // Default layout: a shallow arc across the lower third, which keeps the
      // centre of frame (where the actors are) clear.
      const at = opt.at ?? this.arcAnchor(i, n);
      el.style.left = `${at[0] * 100}%`;
      el.style.top = `${at[1] * 100}%`;
      this.choicesEl.appendChild(el);
      this.choiceEls.push(el);
    });
    this.choicesEl.classList.add('on');
    this.timerEl.style.display = 'block';
  }

  private arcAnchor(i: number, n: number): [number, number] {
    if (n === 1) return [0.5, 0.7];
    const spread = Math.min(0.62, 0.2 * n);
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = 0.5 + (t - 0.5) * spread * 2;
    // Ends of the arc sit slightly lower, like a shallow bowl.
    const y = 0.685 + Math.pow(Math.abs(t - 0.5) * 2, 1.7) * 0.055;
    return [x, y];
  }

  highlightChoice(index: number): void {
    this.choiceEls.forEach((el, i) => el.classList.toggle('hot', i === index));
  }

  markChoicePicked(index: number): void {
    this.choiceEls.forEach((el, i) => {
      el.classList.toggle('picked', i === index);
      if (i !== index) el.style.opacity = '0.25';
    });
  }

  setChoiceTimer(fraction: number): void {
    this.timerFill.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
  }

  hideChoices(): void {
    this.choicesEl.classList.remove('on');
    this.timerEl.style.display = 'none';
    this.choiceEls = [];
  }

  /** Viewport centre of a choice button, so scripted input can point at it. */
  choiceCentre(index: number): [number, number] | null {
    const el = this.choiceEls[index];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  /** Index of the choice nearest the cursor, or -1. */
  choiceAtCursor(x: number, y: number): number {
    let best = -1;
    let bestDist = Infinity;
    this.choiceEls.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return bestDist < 260 ? best : -1;
  }

  // ----------------------------------------------------------------------- QTE

  showQte(keys: QteKey[], anchors?: [number, number][]): void {
    this.qteEl.innerHTML = '';
    this.qteEls = [];
    keys.forEach((key, i) => {
      const el = document.createElement('div');
      el.className = 'qte-key';
      const ring = document.createElement('div');
      ring.className = 'ring';
      el.appendChild(ring);
      const label = document.createElement('span');
      label.textContent = key === 'SPACE' ? '␣' : key;
      el.appendChild(label);
      const at = anchors?.[i] ?? [0.5 + (i - (keys.length - 1) / 2) * 0.11, 0.56];
      el.style.left = `${at[0] * 100}%`;
      el.style.top = `${at[1] * 100}%`;
      this.qteEl.appendChild(el);
      this.qteEls.push({ el, ring });
    });
    this.qteEl.classList.add('on');
  }

  setQteRing(index: number, fraction: number): void {
    const entry = this.qteEls[index];
    if (!entry) return;
    const scale = 1 + Math.max(0, fraction) * 1.5;
    entry.ring.style.transform = `scale(${scale})`;
    entry.ring.style.opacity = `${0.15 + (1 - Math.min(1, fraction)) * 0.85}`;
  }

  markQte(index: number, ok: boolean): void {
    this.qteEls[index]?.el.classList.add(ok ? 'hit' : 'miss');
  }

  hideQte(): void {
    this.qteEl.classList.remove('on');
    this.qteEls = [];
  }

  static codeFor(key: QteKey): string {
    return QTE_CODES[key];
  }

  // ---------------------------------------------------------------- scan / HUD

  beginScan(clues: { id: string; label: string; world: THREE.Vector3 }[], readout: [string, string][]): void {
    for (const c of this.clues) c.el.remove();
    this.clues = clues.map((c) => {
      const el = document.createElement('div');
      el.className = 'clue';
      el.innerHTML = `<div class="box"></div><div class="tag">${c.label}</div>`;
      this.scanEl.appendChild(el);
      return { ...c, found: false, el };
    });
    this.scanReadout.innerHTML = readout
      .map(([k, val]) => `<div><span class="k">${k}</span> ${val}</div>`)
      .join('');
    this.scanEl.classList.add('on');
    this.setScanProgress(0, clues.length);
  }

  setScanProgress(found: number, total: number): void {
    const pct = total ? Math.round((found / total) * 100) : 0;
    this.scanProgressFill.style.width = `${pct}%`;
    this.scanProgressLabel.textContent = `RECONSTRUCTION  ${found}/${total}`;
  }

  markClueFound(id: string): void {
    const clue = this.clues.find((c) => c.id === id);
    if (clue) {
      clue.found = true;
      clue.el.classList.add('found');
      clue.el.classList.remove('active');
    }
  }

  endScan(): void {
    this.scanEl.classList.remove('on');
    for (const c of this.clues) c.el.remove();
    this.clues = [];
  }

  get clueList(): readonly ClueMarker[] {
    return this.clues;
  }

  /** Nearest unfound clue to screen centre, within a tolerance. */
  clueUnderReticle(camera: THREE.Camera, width: number, height: number): ClueMarker | null {
    let best: ClueMarker | null = null;
    let bestDist = Infinity;
    for (const c of this.clues) {
      if (c.found) continue;
      const p = c.world.clone().project(camera);
      if (p.z > 1) continue;
      const sx = (p.x * 0.5 + 0.5) * width;
      const sy = (-p.y * 0.5 + 0.5) * height;
      const d = Math.hypot(sx - width / 2, sy - height / 2);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return bestDist < Math.min(width, height) * 0.16 ? best : null;
  }

  // -------------------------------------------------------------- status panel

  showStatus(name: string, model: string): void {
    (this.statusEl.querySelector('.name') as HTMLElement).textContent = name;
    (this.statusEl.querySelector('.model') as HTMLElement).textContent = model;
    this.statusEl.classList.add('on');
  }

  setGauge(label: string, value: number, color = '#6fe4ff'): void {
    (this.statusEl.querySelector('.gname') as HTMLElement).textContent = label;
    (this.statusEl.querySelector('.gval') as HTMLElement).textContent = `${Math.round(value)}%`;
    const bar = this.statusEl.querySelector('.bar i') as HTMLElement;
    bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    bar.style.background = color;
    bar.style.boxShadow = `0 0 10px ${color}`;
  }

  hideStatus(): void {
    this.statusEl.classList.remove('on');
  }

  // ------------------------------------------------------------- cards / fades

  showCard(kicker: string, title: string, sub: string, opts: { clear?: boolean } = {}): void {
    (this.cardEl.querySelector('.kicker') as HTMLElement).textContent = kicker;
    (this.cardEl.querySelector('.title') as HTMLElement).textContent = title;
    (this.cardEl.querySelector('.sub') as HTMLElement).textContent = sub;
    this.cardEl.classList.toggle('clear', Boolean(opts.clear));
    this.cardEl.classList.add('on');
  }

  hideCard(): void {
    this.cardEl.classList.remove('on');
  }

  fade(to: number, seconds = 0.8): void {
    this.fadeEl.style.transition = `opacity ${seconds}s ease-in-out`;
    this.fadeEl.style.opacity = String(to);
  }

  letterbox(on: boolean): void {
    const h = on ? '7.5%' : '0';
    this.boxTop.style.height = h;
    this.boxBottom.style.height = h;
  }

  // ------------------------------------------------------------------ flowchart

  showFlow(flow: ChapterFlow, state: StoryState): void {
    const cols = Math.max(...flow.nodes.map((n) => n.column)) + 1;
    const rows = Math.max(...flow.nodes.map((n) => n.row)) + 1;
    const pos = (n: { column: number; row: number }): [number, number] => [
      8 + (n.column / Math.max(1, cols - 1)) * 84,
      22 + (rows === 1 ? 30 : (n.row / Math.max(1, rows - 1)) * 58),
    ];

    const lines: string[] = [];
    for (const node of flow.nodes) {
      const [x1, y1] = pos(node);
      for (const nextId of node.next ?? []) {
        const target = flow.nodes.find((n) => n.id === nextId);
        if (!target) continue;
        const [x2, y2] = pos(target);
        const live = state.didVisit(node.id) && state.didVisit(nextId);
        const mid = (x1 + x2) / 2;
        lines.push(
          `<path d="M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}" fill="none" ` +
            `stroke="${live ? '#6fe4ff' : 'rgba(120,170,200,0.18)'}" stroke-width="${live ? 0.28 : 0.16}" />`
        );
      }
    }

    this.flowEl.innerHTML =
      `<h2>${flow.title}</h2><div class="hint">CHAPTER FLOW · PATHS TAKEN HIGHLIGHTED</div>` +
      `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}</svg>` +
      flow.nodes
        .map((n) => {
          const [x, y] = pos(n);
          const cls = [
            'fnode',
            state.didVisit(n.id) ? 'hit' : '',
            n.outcome ? `outcome ${n.outcome}` : '',
          ]
            .filter(Boolean)
            .join(' ');
          return `<div class="${cls}" style="left:${x}%;top:${y}%">${n.label}</div>`;
        })
        .join('');
    this.flowEl.classList.add('on');
  }

  hideFlow(): void {
    this.flowEl.classList.remove('on');
  }

  // ----------------------------------------------------------------- per frame

  update(dt: number, camera: THREE.Camera, width: number, height: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('on');
    }
    if (!this.clues.length) return;
    const v = new THREE.Vector3();
    for (const c of this.clues) {
      v.copy(c.world).project(camera);
      const behind = v.z > 1;
      const sx = (v.x * 0.5 + 0.5) * width;
      const sy = (-v.y * 0.5 + 0.5) * height;
      const onScreen = !behind && sx > -40 && sx < width + 40 && sy > -40 && sy < height + 40;
      c.el.style.display = onScreen ? 'block' : 'none';
      if (onScreen) {
        c.el.style.left = `${sx}px`;
        c.el.style.top = `${sy}px`;
        const near = Math.hypot(sx - width / 2, sy - height / 2) < Math.min(width, height) * 0.16;
        c.el.classList.toggle('active', near && !c.found);
      }
    }
  }

  /** Screen anchor (0..1) for a world point, for placing QTE badges on actors. */
  static projectToAnchor(world: THREE.Vector3, camera: THREE.Camera): [number, number] {
    const p = world.clone().project(camera);
    return [p.x * 0.5 + 0.5, -p.y * 0.5 + 0.5];
  }
}
