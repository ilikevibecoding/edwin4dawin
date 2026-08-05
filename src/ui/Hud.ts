import { clamp, easeOutCubic, smoothstep } from '../engine/math';
import type { ChoiceOption, FlowNode } from '../story/types';

const $ = (id: string) => document.getElementById(id)!;

interface ChoiceView {
  option: ChoiceOption;
  el: HTMLElement;
  timerEl: HTMLElement;
}

export interface MeterView {
  key: string;
  label: string;
  value: number;
  display: number;
  warm?: boolean;
  el?: HTMLElement;
  fill?: HTMLElement;
}

/**
 * All UI state is advanced from the simulation clock rather than CSS timelines,
 * so an offline render at 1 fps looks identical to real-time play.
 */
export class Hud {
  private dialogue = $('dialogue');
  private speaker = $('speaker');
  private line = $('line');
  private choicesEl = $('choices');
  private qteEl = $('qte');
  private objectiveEl = $('objective');
  private objectiveText = $('objective-text');
  private titlecard = $('titlecard');
  private stressEl = $('stress');
  private stressFill = $('stress-fill');
  private stressValue = $('stress-value');
  private flowchartEl = $('flowchart');
  private markersEl = $('markers');
  private scanOverlay = $('scan-overlay');
  private fadeEl = $('fade');
  private letterboxEl = $('letterbox');
  private hudEl = $('hud');
  private metersEl = $('meters');
  private ledEl = $('hud-led');
  private perfEl = $('perf');

  private lineText = '';
  private lineTime = 0;
  private lineDuration = 1;
  private titleTime = 0;
  private titleVisible = false;
  private choices: ChoiceView[] = [];
  private choiceTime = 0;
  private choiceDuration = 0;
  private selected = 0;
  private meters = new Map<string, MeterView>();
  private stressShown = false;
  private stress = 0;
  private stressDisplay = 0;
  private qteTime = 0;
  private qteDuration = 0;
  private qteKeys: string[] = [];
  private qteIndex = 0;
  private qteResult: 'pending' | 'hit' | 'miss' = 'pending';
  private qteResultTime = 0;
  private flowTime = 0;
  private flowNodes: { node: FlowNode; el: HTMLElement }[] = [];

  constructor(captureMode = false) {
    // Capture builds disable CSS keyframes; every animation is clock-driven.
    if (captureMode) document.body.classList.add('capture');
  }

  // -------------------------------------------------------------- dialogue
  showLine(who: string, text: string, duration: number, thought = false) {
    this.dialogue.classList.remove('hidden');
    this.dialogue.classList.toggle('thought', thought);
    this.speaker.textContent = thought ? `${who} · analysis` : who;
    this.lineText = text;
    this.lineTime = 0;
    this.lineDuration = duration;
    this.line.textContent = '';
  }

  hideLine() {
    this.dialogue.classList.add('hidden');
    this.lineText = '';
  }

  // ---------------------------------------------------------------- choices
  showChoices(options: ChoiceOption[], duration: number) {
    this.choicesEl.classList.remove('hidden');
    this.choicesEl.innerHTML = '';
    this.choices = options.map((option, i) => {
      const el = document.createElement('div');
      el.className = 'choice';
      el.style.animation = 'none';
      el.style.opacity = '0';
      const key = document.createElement('div');
      key.className = 'key';
      key.textContent = String(i + 1);
      el.appendChild(key);
      const label = document.createElement('div');
      label.textContent = option.label;
      el.appendChild(label);
      if (option.hint) {
        const hint = document.createElement('div');
        hint.className = 'choice-hint';
        hint.textContent = option.hint;
        el.appendChild(hint);
      }
      const timerEl = document.createElement('div');
      timerEl.className = 'choice-timer';
      timerEl.style.width = '100%';
      el.appendChild(timerEl);
      this.choicesEl.appendChild(el);
      return { option, el, timerEl };
    });
    this.choiceTime = 0;
    this.choiceDuration = duration;
    this.selected = 0;
  }

  setSelected(index: number) {
    this.selected = clamp(index, 0, Math.max(0, this.choices.length - 1));
    this.choices.forEach((c, i) => c.el.classList.toggle('sel', i === this.selected));
  }

  get selectedIndex() {
    return this.selected;
  }

  get choiceCount() {
    return this.choices.length;
  }

  markChoiceTaken(index: number) {
    this.choices[index]?.el.classList.add('taken');
  }

  hideChoices() {
    this.choicesEl.classList.add('hidden');
    this.choicesEl.innerHTML = '';
    this.choices = [];
  }

  // -------------------------------------------------------------------- QTE
  showQte(keys: string[], duration: number, label?: string) {
    this.qteEl.classList.remove('hidden');
    this.qteEl.innerHTML = '';
    this.qteKeys = keys;
    this.qteIndex = 0;
    this.qteTime = 0;
    this.qteDuration = duration;
    this.qteResult = 'pending';
    const prompt = document.createElement('div');
    prompt.className = 'qte-prompt';
    prompt.id = 'qte-prompt';
    const ring = document.createElement('div');
    ring.className = 'qte-ring';
    ring.id = 'qte-ring';
    const keyEl = document.createElement('div');
    keyEl.className = 'qte-key';
    keyEl.id = 'qte-keyel';
    keyEl.textContent = keys[0];
    prompt.appendChild(ring);
    prompt.appendChild(keyEl);
    this.qteEl.appendChild(prompt);
    if (label) {
      const banner = document.createElement('div');
      banner.className = 'qte-banner';
      banner.textContent = label;
      banner.style.animation = 'none';
      this.qteEl.appendChild(banner);
    }
  }

  advanceQte(): boolean {
    this.qteIndex++;
    const keyEl = document.getElementById('qte-keyel');
    if (this.qteIndex >= this.qteKeys.length) return true;
    if (keyEl) keyEl.textContent = this.qteKeys[this.qteIndex];
    this.qteTime = 0;
    return false;
  }

  get qteKey() {
    return this.qteKeys[this.qteIndex];
  }

  get qteProgress() {
    return this.qteDuration > 0 ? clamp(this.qteTime / this.qteDuration) : 1;
  }

  flashQte(result: 'hit' | 'miss') {
    this.qteResult = result;
    this.qteResultTime = 0;
    const prompt = document.getElementById('qte-prompt');
    if (prompt) prompt.classList.add(result);
  }

  banner(text: string, fail = false) {
    const banner = document.createElement('div');
    banner.className = `qte-banner${fail ? ' fail' : ''}`;
    banner.textContent = text;
    banner.style.animation = 'none';
    this.qteEl.classList.remove('hidden');
    this.qteEl.appendChild(banner);
    window.setTimeout(() => banner.remove(), 1200);
  }

  hideQte() {
    this.qteEl.classList.add('hidden');
    this.qteEl.innerHTML = '';
    this.qteKeys = [];
  }

  // -------------------------------------------------------------- objective
  setObjective(text: string, done = false) {
    this.objectiveEl.classList.toggle('done', done);
    this.objectiveText.textContent = text;
  }

  // -------------------------------------------------------------- titlecard
  showTitle(chapter: string, title: string, sub: string) {
    $('tc-kicker').textContent = chapter;
    $('tc-title').textContent = title;
    $('tc-sub').textContent = sub;
    this.titlecard.classList.remove('hidden');
    this.titleTime = 0;
    this.titleVisible = true;
    for (const el of [$('tc-kicker'), $('tc-title'), $('tc-sub')]) {
      el.style.animation = 'none';
      el.style.opacity = '0';
    }
  }

  hideTitle() {
    this.titlecard.classList.add('hidden');
    this.titleVisible = false;
  }

  // ----------------------------------------------------------------- meters
  hudVisible(show: boolean) {
    this.hudEl.classList.toggle('hidden', !show);
  }

  letterbox(show: boolean) {
    this.letterboxEl.classList.toggle('hidden', !show);
  }

  setLed(state: 'blue' | 'amber' | 'red') {
    this.ledEl.classList.remove('amber', 'red');
    if (state !== 'blue') this.ledEl.classList.add(state);
  }

  setMeter(key: string, label: string, value: number, warm = false) {
    let m = this.meters.get(key);
    if (!m) {
      const el = document.createElement('div');
      el.className = `meter${warm ? ' warm' : ''}`;
      el.style.animation = 'none';
      el.innerHTML = `<div class="meter-top"><span>${label}</span><span class="meter-num">0%</span></div><div class="meter-track"><div class="meter-fill"></div></div>`;
      this.metersEl.appendChild(el);
      m = { key, label, value, display: value, warm, el, fill: el.querySelector('.meter-fill') as HTMLElement };
      this.meters.set(key, m);
    }
    m.value = clamp(value, 0, 1);
  }

  removeMeters() {
    this.metersEl.innerHTML = '';
    this.meters.clear();
  }

  showStress(value: number, show = true) {
    this.stress = clamp(value, 0, 1);
    this.stressShown = show;
    this.stressEl.classList.toggle('hidden', !show);
    this.stressEl.classList.toggle('critical', this.stress > 0.75);
  }

  // -------------------------------------------------------------- scan / world
  setScanMode(on: boolean, found = 0, total = 0) {
    this.scanOverlay.classList.toggle('hidden', !on);
    $('scan-count').textContent = String(found);
    $('scan-total').textContent = String(total);
  }

  setMarkers(
    markers: { x: number; y: number; label: string; done?: boolean; visible?: boolean; kind?: 'scan' | 'interact' }[],
  ) {
    while (this.markersEl.children.length < markers.length) {
      const el = document.createElement('div');
      el.className = 'marker';
      el.innerHTML = '<div class="marker-dot"></div><div class="marker-label"></div>';
      this.markersEl.appendChild(el);
    }
    for (let i = 0; i < this.markersEl.children.length; i++) {
      const el = this.markersEl.children[i] as HTMLElement;
      const m = markers[i];
      if (!m || m.visible === false) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.style.left = `${m.x * 100}%`;
      el.style.top = `${m.y * 100}%`;
      el.classList.toggle('done', !!m.done);
      el.classList.toggle('interact', m.kind === 'interact');
      (el.querySelector('.marker-label') as HTMLElement).textContent = m.label;
    }
  }

  // ------------------------------------------------------------------- fades
  setFade(value: number) {
    this.fadeEl.style.opacity = String(clamp(value));
  }

  setPerf(text: string) {
    this.perfEl.classList.toggle('hidden', !text);
    this.perfEl.textContent = text;
  }

  // --------------------------------------------------------------- flowchart
  showFlowchart(chapter: string, nodes: FlowNode[], taken: Set<string>, stats: [string, string][]) {
    this.flowchartEl.classList.remove('hidden');
    $('fc-sub').textContent = chapter;
    const body = $('fc-body');
    body.innerHTML = '';
    this.flowNodes = [];
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'fc-svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    body.appendChild(svg);
    const cols = Math.max(...nodes.map((n) => n.col)) + 1;
    const rows = Math.max(...nodes.map((n) => n.row)) + 1;
    const pos = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      const el = document.createElement('div');
      const on = !node.flag || taken.has(node.flag);
      el.className = `fc-node ${on ? 'on' : 'off'}`;
      el.style.animation = 'none';
      el.style.opacity = '0';
      el.innerHTML = `${node.kind ? `<div class="fc-kind">${node.kind}</div>` : ''}${node.label}`;
      const x = ((node.col + 0.5) / cols) * 100;
      const y = ((node.row + 0.5) / rows) * 100;
      el.style.left = `calc(${x}% - clamp(48px, 5.5vw, 84px))`;
      el.style.top = `calc(${y}% - 1.4em)`;
      body.appendChild(el);
      pos.set(node.id, { x, y });
      this.flowNodes.push({ node, el });
    }
    for (const node of nodes) {
      for (const from of node.from ?? []) {
        const a = pos.get(from);
        const b = pos.get(node.id);
        if (!a || !b) continue;
        const path = document.createElementNS(svgNS, 'path');
        const midX = (a.x + b.x) / 2;
        path.setAttribute('d', `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`);
        const on = (!node.flag || taken.has(node.flag)) && true;
        path.setAttribute('stroke', on ? 'rgba(79,210,255,0.55)' : 'rgba(255,255,255,0.12)');
        path.setAttribute('stroke-width', '0.35');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
      }
    }
    const statsEl = $('fc-stats');
    statsEl.innerHTML = '';
    for (const [label, value] of stats) {
      const el = document.createElement('div');
      el.className = 'fc-stat';
      el.innerHTML = `<div class="fc-stat-label">${label}</div><div class="fc-stat-val">${value}</div>`;
      statsEl.appendChild(el);
    }
    this.flowTime = 0;
  }

  hideFlowchart() {
    this.flowchartEl.classList.add('hidden');
    this.flowNodes = [];
  }

  get flowchartVisible() {
    return !this.flowchartEl.classList.contains('hidden');
  }

  // ------------------------------------------------------------------ update
  update(dt: number) {
    // Typewriter reveal.
    if (this.lineText) {
      this.lineTime += dt;
      const reveal = clamp(this.lineTime / Math.max(0.2, this.lineDuration * 0.62));
      const count = Math.floor(reveal * this.lineText.length);
      this.line.textContent = this.lineText.slice(0, count);
      const fade = smoothstep(0, 0.18, this.lineTime);
      this.dialogue.style.opacity = String(fade);
    }

    // Choice entrance + timer bars.
    if (this.choices.length) {
      this.choiceTime += dt;
      this.choices.forEach((c, i) => {
        const t = clamp((this.choiceTime - i * 0.07) / 0.3);
        const e = easeOutCubic(t);
        c.el.style.opacity = String(e);
        c.el.style.transform = `translateY(${(1 - e) * 0.8}em)`;
        if (this.choiceDuration > 0) {
          const left = clamp(1 - this.choiceTime / this.choiceDuration);
          c.timerEl.style.width = `${left * 100}%`;
        }
      });
    }

    // QTE ring shrink.
    if (this.qteKeys.length) {
      this.qteTime += dt;
      const ring = document.getElementById('qte-ring');
      const keyEl = document.getElementById('qte-keyel');
      if (ring) {
        const p = clamp(this.qteTime / Math.max(0.05, this.qteDuration));
        const scale = 2.6 - p * 1.6;
        ring.style.transform = `scale(${scale})`;
        ring.style.opacity = String(0.35 + (1 - p) * 0.65);
      }
      if (keyEl && this.qteResult !== 'pending') {
        this.qteResultTime += dt;
        const p = clamp(this.qteResultTime / 0.3);
        keyEl.style.transform = `scale(${1 + p * 0.5})`;
        keyEl.style.opacity = String(1 - p);
      }
    }

    // Title card reveal.
    if (this.titleVisible) {
      this.titleTime += dt;
      const parts: [HTMLElement, number][] = [
        [$('tc-kicker'), 0.1],
        [$('tc-title'), 0.32],
        [$('tc-sub'), 0.64],
      ];
      for (const [el, delay] of parts) {
        const t = clamp((this.titleTime - delay) / 0.7);
        const e = easeOutCubic(t);
        el.style.opacity = String(e * 0.96);
        el.style.transform = `translateX(${(1 - e) * -1.2}em)`;
      }
    }

    // Meters.
    for (const m of this.meters.values()) {
      m.display += (m.value - m.display) * clamp(dt * 4);
      if (m.fill) m.fill.style.width = `${m.display * 100}%`;
      const num = m.el?.querySelector('.meter-num');
      if (num) num.textContent = `${Math.round(m.display * 100)}%`;
    }

    // Stress bar.
    if (this.stressShown) {
      this.stressDisplay += (this.stress - this.stressDisplay) * clamp(dt * 3.5);
      this.stressFill.style.width = `${this.stressDisplay * 100}%`;
      this.stressValue.textContent = `${Math.round(this.stressDisplay * 100)}%`;
    }

    // Flowchart node reveal.
    if (this.flowNodes.length) {
      this.flowTime += dt;
      this.flowNodes.forEach(({ el }, i) => {
        const t = clamp((this.flowTime - i * 0.08) / 0.35);
        const e = easeOutCubic(t);
        el.style.opacity = String(e);
        el.style.transform = `scale(${0.92 + e * 0.08})`;
      });
    }
  }
}
