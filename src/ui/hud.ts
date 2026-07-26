import { clamp01, TAU } from '../core/math';
import { drawItemIcon, HOTBAR, ItemKind } from '../player/items';

export interface ReadoutRow {
  label: string;
  value: string;
  warn?: boolean;
}

export interface QuestObjective {
  text: string;
  done: boolean;
}

export interface MapIsland {
  name: string;
  x: number;
  z: number;
  radius: number;
  kind: 'island' | 'outpost' | 'rock';
}

export interface MapState {
  extent: number;
  islands: MapIsland[];
  ship: { x: number; z: number; heading: number };
  player: { x: number; z: number };
  marks: { x: number; z: number; label: string }[];
  storm: { x: number; z: number; radius: number } | null;
  enemies: { x: number; z: number }[];
}

const CARDINALS: { angle: number; label: string; major: boolean }[] = [];
for (let i = 0; i < 16; i++) {
  const angle = (i / 16) * 360;
  const labels: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
  const half: Record<number, string> = { 45: 'NE', 135: 'SE', 225: 'SW', 315: 'NW' };
  CARDINALS.push({ angle, label: labels[angle] ?? half[angle] ?? '', major: angle % 90 === 0 });
}

/**
 * All the on-screen furniture: vitals, ship readout, compass ribbon, prompts,
 * hotbar, toasts, the parchment chart and the title/death overlays. Everything
 * is drawn with DOM and canvas 2D, so there are no UI assets to load.
 */
export class Hud {
  private root = document.getElementById('hud') as HTMLElement;
  private healthFill = document.getElementById('bar-health-fill') as HTMLElement;
  private goldAmount = document.getElementById('gold-amount') as HTMLElement;
  private shipReadout = document.getElementById('ship-readout') as HTMLElement;
  private questLog = document.getElementById('hud-quest') as HTMLElement;
  private prompt = document.getElementById('hud-prompt') as HTMLElement;
  private crosshair = document.getElementById('hud-crosshair') as HTMLElement;
  private hotbar = document.getElementById('hud-hotbar') as HTMLElement;
  private toasts = document.getElementById('hud-toasts') as HTMLElement;
  private compass = document.getElementById('compass-canvas') as HTMLCanvasElement;
  private compassCtx = this.compass.getContext('2d')!;
  private mapOverlay = document.getElementById('map-overlay') as HTMLElement;
  private mapCanvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  private mapCtx = this.mapCanvas.getContext('2d')!;
  private titleScreen = document.getElementById('title-screen') as HTMLElement;
  private deathScreen = document.getElementById('death-screen') as HTMLElement;
  private deathReason = document.getElementById('death-reason') as HTMLElement;
  private loading = document.getElementById('loading') as HTMLElement;
  private hurtFlashEl: HTMLElement;

  private icons = new Map<ItemKind, string>();
  private slotEls: HTMLElement[] = [];
  private lastReadout = '';
  private lastQuest = '';
  private lastPrompt = '';
  private flashStrength = 0;

  constructor() {
    this.hurtFlashEl = document.createElement('div');
    this.hurtFlashEl.className = 'hurt-flash';
    this.root.appendChild(this.hurtFlashEl);
    this.buildHotbar();
  }

  private buildHotbar(): void {
    this.hotbar.innerHTML = '';
    HOTBAR.forEach((def, index) => {
      if (!this.icons.has(def.kind)) this.icons.set(def.kind, drawItemIcon(def.kind));
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.innerHTML = `
        <span class="idx">${index + 1}</span>
        <img src="${this.icons.get(def.kind)}" alt="${def.label}" width="34" height="34" />
        <span class="count"></span>
        <span class="name">${def.label}</span>
      `;
      this.hotbar.appendChild(slot);
      this.slotEls.push(slot);
    });
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
  }

  setLoading(visible: boolean, text?: string): void {
    this.loading.classList.toggle('hidden', !visible);
    if (text) (document.getElementById('loading-text') as HTMLElement).textContent = text;
  }

  showTitle(visible: boolean): void {
    this.titleScreen.classList.toggle('hidden', !visible);
  }

  showDeath(visible: boolean, reason = ''): void {
    this.deathScreen.classList.toggle('hidden', !visible);
    if (reason) this.deathReason.textContent = reason;
  }

  setHealth(fraction: number): void {
    this.healthFill.style.width = `${clamp01(fraction) * 100}%`;
  }

  setGold(gold: number): void {
    this.goldAmount.textContent = gold.toLocaleString('en-GB');
  }

  setShipReadout(title: string, rows: ReadoutRow[]): void {
    const key = title + rows.map((r) => `${r.label}${r.value}${r.warn ? '!' : ''}`).join('|');
    if (key === this.lastReadout) return;
    this.lastReadout = key;
    this.shipReadout.innerHTML =
      `<div class="head">${title}</div>` +
      rows
        .map((row) => `<div class="row${row.warn ? ' warn' : ''}"><span>${row.label}</span><b>${row.value}</b></div>`)
        .join('');
  }

  setQuest(title: string, objectives: QuestObjective[]): void {
    const key = title + objectives.map((o) => `${o.text}${o.done}`).join('|');
    if (key === this.lastQuest) return;
    this.lastQuest = key;
    if (!title) {
      this.questLog.innerHTML = '';
      return;
    }
    this.questLog.innerHTML =
      `<h4>${title}</h4>` +
      objectives.map((o) => `<div class="objective${o.done ? ' done' : ''}">${o.text}</div>`).join('');
  }

  setPrompt(text: string | null, key = 'E', progress = -1): void {
    const signature = `${text ?? ''}|${key}|${progress >= 0 ? Math.round(progress * 20) : -1}`;
    if (signature === this.lastPrompt) return;
    this.lastPrompt = signature;

    if (!text) {
      this.prompt.classList.add('hidden');
      return;
    }
    this.prompt.classList.remove('hidden');
    const bar = progress >= 0 ? `<span class="progress" style="width:${clamp01(progress) * 100}%"></span>` : '';
    this.prompt.innerHTML = `<span class="key">${key}</span>${text}${bar}`;
  }

  setCrosshair(visible: boolean): void {
    this.crosshair.classList.toggle('hidden', !visible);
  }

  setHotbar(activeSlot: number, counts: Record<string, number>): void {
    this.slotEls.forEach((el, index) => {
      const def = HOTBAR[index];
      el.classList.toggle('active', index === activeSlot);
      const countEl = el.querySelector('.count') as HTMLElement;
      if (def.stackable) {
        const count = counts[def.kind] ?? 0;
        countEl.textContent = String(count);
        el.style.opacity = count > 0 ? '1' : '0.45';
      } else {
        countEl.textContent = '';
        el.style.opacity = '1';
      }
    });
  }

  toast(text: string, kind: 'info' | 'gold' | 'bad' = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast ${kind === 'info' ? '' : kind}`;
    el.textContent = text;
    this.toasts.appendChild(el);
    setTimeout(() => el.remove(), 4200);
    while (this.toasts.children.length > 5) this.toasts.firstElementChild?.remove();
  }

  hurtFlash(strength = 1): void {
    this.flashStrength = Math.min(1, this.flashStrength + strength);
  }

  /** Called every frame: fades the damage flash. */
  update(dt: number): void {
    if (this.flashStrength > 0.001) {
      this.flashStrength = Math.max(0, this.flashStrength - dt * 1.6);
      this.hurtFlashEl.style.opacity = String(this.flashStrength);
    }
  }

  /**
   * Compass ribbon: cardinal marks scroll past a fixed centre needle, with a
   * separate marker showing where the wind is blowing from.
   */
  drawCompass(headingDeg: number, windFromDeg: number, lowHealth: number): void {
    const ctx = this.compassCtx;
    const w = this.compass.width;
    const h = this.compass.height;
    ctx.clearRect(0, 0, w, h);

    const centre = w / 2;
    const pixelsPerDegree = w / 150;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(6, 22, w - 12, 44, 6);
    const grad = ctx.createLinearGradient(0, 22, 0, 66);
    grad.addColorStop(0, 'rgba(38, 26, 15, 0.82)');
    grad.addColorStop(1, 'rgba(16, 11, 6, 0.88)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(227, 176, 75, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.clip();

    ctx.font = '600 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const mark of CARDINALS) {
      for (const wrap of [-360, 0, 360]) {
        const delta = mark.angle + wrap - headingDeg;
        const x = centre + delta * pixelsPerDegree;
        if (x < -30 || x > w + 30) continue;
        const fade = 1 - Math.min(1, Math.abs(delta) / 80);
        ctx.globalAlpha = 0.25 + fade * 0.75;
        if (mark.label) {
          ctx.fillStyle = mark.major ? '#ffd77a' : '#e8d5a8';
          ctx.fillText(mark.label, x, 44);
        } else {
          ctx.fillStyle = 'rgba(232, 213, 168, 0.7)';
          ctx.fillRect(x - 0.75, 38, 1.5, 12);
        }
      }
    }

    // Wind marker.
    const windDelta = ((windFromDeg - headingDeg + 540) % 360) - 180;
    const windX = centre + windDelta * pixelsPerDegree;
    if (windX > -20 && windX < w + 20) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#8fd8e8';
      ctx.beginPath();
      ctx.moveTo(windX, 28);
      ctx.lineTo(windX - 6, 36);
      ctx.lineTo(windX + 6, 36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Centre needle.
    ctx.globalAlpha = 1;
    ctx.fillStyle = lowHealth > 0.4 ? '#ff8b6a' : '#ffd77a';
    ctx.beginPath();
    ctx.moveTo(centre, 70);
    ctx.lineTo(centre - 7, 78);
    ctx.lineTo(centre + 7, 78);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(centre - 1, 20, 2, 50);
  }

  toggleMap(visible: boolean): void {
    this.mapOverlay.classList.toggle('hidden', !visible);
  }

  get mapVisible(): boolean {
    return !this.mapOverlay.classList.contains('hidden');
  }

  /** Renders the world onto a parchment chart. */
  drawMap(state: MapState): void {
    const ctx = this.mapCtx;
    const size = this.mapCanvas.width;
    const toX = (x: number) => ((x + state.extent) / (state.extent * 2)) * size;
    const toY = (z: number) => ((z + state.extent) / (state.extent * 2)) * size;

    // Parchment.
    ctx.fillStyle = '#e0c893';
    ctx.fillRect(0, 0, size, size);
    const vignette = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.72);
    vignette.addColorStop(0, 'rgba(228, 205, 155, 0)');
    vignette.addColorStop(1, 'rgba(120, 88, 44, 0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    // Sea texture: sparse hatching.
    ctx.strokeStyle = 'rgba(120, 100, 62, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 46; i++) {
      const y = (i / 46) * size;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 24) {
        ctx.lineTo(x, y + Math.sin((x / size) * 9 + i) * 3);
      }
      ctx.stroke();
    }

    // Border.
    ctx.strokeStyle = 'rgba(90, 62, 30, 0.8)';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, size - 28, size - 28);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 24, size - 48, size - 48);

    // Islands.
    for (const island of state.islands) {
      const cx = toX(island.x);
      const cy = toY(island.z);
      const r = (island.radius / (state.extent * 2)) * size * 1.15;
      ctx.beginPath();
      // Wobbly coastline.
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * TAU;
        const wobble = 1 + Math.sin(a * 3 + island.x * 0.01) * 0.12 + Math.cos(a * 5 + island.z * 0.01) * 0.08;
        const px = cx + Math.cos(a) * r * wobble;
        const py = cy + Math.sin(a) * r * wobble;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = island.kind === 'rock' ? '#a08a5e' : '#c2ab72';
      ctx.fill();
      ctx.strokeStyle = 'rgba(74, 50, 22, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (island.kind !== 'rock') {
        ctx.fillStyle = 'rgba(58, 38, 16, 0.9)';
        ctx.font = `${island.kind === 'outpost' ? '600 ' : ''}${Math.max(18, r * 0.5)}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(island.name, cx, cy + r * 1.3 + 18);
        if (island.kind === 'outpost') {
          // A little anchor glyph for outposts.
          ctx.strokeStyle = 'rgba(58, 38, 16, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 8);
          ctx.lineTo(cx, cy + 8);
          ctx.moveTo(cx - 7, cy + 2);
          ctx.quadraticCurveTo(cx, cy + 12, cx + 7, cy + 2);
          ctx.moveTo(cx - 5, cy - 6);
          ctx.lineTo(cx + 5, cy - 6);
          ctx.stroke();
        }
      }
    }

    // Storm.
    if (state.storm) {
      const cx = toX(state.storm.x);
      const cy = toY(state.storm.z);
      const r = (state.storm.radius / (state.extent * 2)) * size;
      ctx.strokeStyle = 'rgba(60, 70, 95, 0.6)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(60, 70, 95, 0.14)';
      ctx.fill();
    }

    // Quest marks.
    for (const mark of state.marks) {
      const cx = toX(mark.x);
      const cy = toY(mark.z);
      ctx.strokeStyle = '#8e2018';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 10);
      ctx.lineTo(cx + 10, cy + 10);
      ctx.moveTo(cx + 10, cy - 10);
      ctx.lineTo(cx - 10, cy + 10);
      ctx.stroke();
      if (mark.label) {
        ctx.fillStyle = '#8e2018';
        ctx.font = 'italic 15px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(mark.label, cx, cy - 16);
      }
    }

    // Enemy sails.
    for (const enemy of state.enemies) {
      const cx = toX(enemy.x);
      const cy = toY(enemy.z);
      ctx.fillStyle = 'rgba(52, 74, 48, 0.9)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx + 7, cy + 7);
      ctx.lineTo(cx - 7, cy + 7);
      ctx.closePath();
      ctx.fill();
    }

    // The player themselves, when they have gone ashore.
    const px = toX(state.player.x);
    const py = toY(state.player.z);
    if (Math.hypot(state.player.x - state.ship.x, state.player.z - state.ship.z) > 25) {
      ctx.fillStyle = 'rgba(58, 38, 16, 0.9)';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(240, 230, 200, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Player ship.
    const sx = toX(state.ship.x);
    const sy = toY(state.ship.z);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(state.ship.heading + Math.PI / 2);
    ctx.fillStyle = '#8e2018';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(10, 12);
    ctx.lineTo(0, 7);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Compass rose in a spare corner.
    const rx = size * 0.86;
    const ry = size * 0.14;
    ctx.strokeStyle = 'rgba(74, 50, 22, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, ry, 42, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(74, 50, 22, 0.85)';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const long = i % 2 === 0 ? 38 : 22;
      ctx.beginPath();
      ctx.moveTo(rx + Math.cos(a) * long, ry + Math.sin(a) * long);
      ctx.lineTo(rx + Math.cos(a + 0.16) * 8, ry + Math.sin(a + 0.16) * 8);
      ctx.lineTo(rx + Math.cos(a - 0.16) * 8, ry + Math.sin(a - 0.16) * 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = '600 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', rx, ry - 46);
  }
}
