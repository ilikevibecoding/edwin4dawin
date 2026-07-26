import { events } from '../core/events';
import { settings } from '../core/settings';
import { Minimap, type MinimapMarker } from './minimap';
import type { ObjectiveId, ObjectiveState } from '../game/types';

export interface HudState {
  health: number;
  armor: number;
  mag: number;
  reserve: number;
  weaponName: string;
  weaponSlot: number;
  phase: string;
  spread: number;
  timeLeft: number;
  extractCountdown: number | null;
  hostages: { id: string; name: string; state: string }[];
  playerPos: { x: number; z: number; floor: 0 | 1; yaw: number };
  markers: MinimapMarker[];
  interactPrompt: string | null;
  urgentTimer: boolean;
}

/** In-game HUD (Fable 1): minimal corners, teal/gold/red language. */
export class Hud {
  readonly root: HTMLDivElement;
  private healthFill!: HTMLDivElement;
  private armorFill!: HTMLDivElement;
  private healthNum!: HTMLSpanElement;
  private armorNum!: HTMLSpanElement;
  private ammoCount!: HTMLDivElement;
  private weaponName!: HTMLDivElement;
  private slotEls: HTMLDivElement[] = [];
  private reloadHint!: HTMLDivElement;
  private timerEl!: HTMLDivElement;
  private extractEl!: HTMLDivElement;
  private objectivesEl!: HTMLDivElement;
  private hostagesEl!: HTMLDivElement;
  private crosshair!: HTMLDivElement;
  private hitmarker!: HTMLDivElement;
  private interactEl!: HTMLDivElement;
  private announceEl!: HTMLDivElement;
  private subtitlesEl!: HTMLDivElement;
  private damageVignette!: HTMLDivElement;
  private flashOverlay!: HTMLDivElement;
  private damageDir!: HTMLDivElement;
  private minimapCanvas!: HTMLCanvasElement;
  private minimap = new Minimap();
  private objectives = new Map<ObjectiveId, { state: ObjectiveState; text: string }>();
  private announceT = 0;
  private damageT = 0;
  private flashT = 0;
  private damageDirYaw: number | null = null;
  private subtitleT = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="vignette-standing"></div>
      <div id="damage-vignette"></div>
      <div id="damage-dir"><div class="arc"></div></div>
      <div id="flash-overlay"></div>
      <div id="hud-objectives"></div>
      <div id="hud-timer">12:00</div>
      <div id="hud-hostages"></div>
      <div id="minimap-wrap"><canvas id="minimap" width="352" height="352"></canvas></div>
      <div id="crosshair">
        <div class="line l-t"></div><div class="line l-b"></div>
        <div class="line l-l"></div><div class="line l-r"></div>
        <div class="dot"></div>
      </div>
      <div id="hitmarker"><div class="h1"></div><div class="h2"></div><div class="h3"></div><div class="h4"></div></div>
      <div id="interact-prompt"></div>
      <div id="announce"></div>
      <div id="subtitles"></div>
      <div class="hud-corner" id="hud-vitals">
        <div id="extract-timer"></div>
        <div class="vital-label">Armor</div>
        <div class="vital-bar"><div class="vital-fill armor"></div><span class="vital-num"></span></div>
        <div class="vital-label">Integrity</div>
        <div class="vital-bar"><div class="vital-fill hp"></div><span class="vital-num hp-num"></span></div>
      </div>
      <div class="hud-corner" id="hud-ammo">
        <div id="reload-hint"></div>
        <div id="ammo-count">30<span class="reserve"> / 90</span></div>
        <div id="weapon-name">C-7 CARBINE</div>
        <div id="weapon-slots"></div>
      </div>
    `;
    parent.appendChild(this.root);

    this.healthFill = this.root.querySelector('.vital-fill.hp')!;
    this.armorFill = this.root.querySelector('.vital-fill.armor')!;
    this.healthNum = this.root.querySelector('.vital-num.hp-num')!;
    this.armorNum = this.root.querySelector('.vital-bar .vital-num')!;
    this.ammoCount = this.root.querySelector('#ammo-count')!;
    this.weaponName = this.root.querySelector('#weapon-name')!;
    this.reloadHint = this.root.querySelector('#reload-hint')!;
    this.timerEl = this.root.querySelector('#hud-timer')!;
    this.extractEl = this.root.querySelector('#extract-timer')!;
    this.objectivesEl = this.root.querySelector('#hud-objectives')!;
    this.hostagesEl = this.root.querySelector('#hud-hostages')!;
    this.crosshair = this.root.querySelector('#crosshair')!;
    this.hitmarker = this.root.querySelector('#hitmarker')!;
    this.interactEl = this.root.querySelector('#interact-prompt')!;
    this.announceEl = this.root.querySelector('#announce')!;
    this.subtitlesEl = this.root.querySelector('#subtitles')!;
    this.damageVignette = this.root.querySelector('#damage-vignette')!;
    this.flashOverlay = this.root.querySelector('#flash-overlay')!;
    this.damageDir = this.root.querySelector('#damage-dir')!;
    this.minimapCanvas = this.root.querySelector('#minimap')!;

    const slotWrap = this.root.querySelector('#weapon-slots')!;
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('div');
      s.className = 'slot';
      s.textContent = String(i);
      slotWrap.appendChild(s);
      this.slotEls.push(s);
    }

    events.on('objective:update', ({ id, state, text }) => {
      this.objectives.set(id as ObjectiveId, { state: state as ObjectiveState, text });
      this.renderObjectives();
    });
    events.on('announce', ({ text, kind }) => this.announce(text, kind));
    events.on('player:damaged', ({ dirYaw }) => {
      this.damageT = 1;
      this.damageDirYaw = dirYaw;
    });
    events.on('ui:hitmarker', ({ kill }) => {
      this.hitmarker.classList.remove('show', 'kill');
      void this.hitmarker.offsetWidth;
      if (kill) this.hitmarker.classList.add('kill');
      this.hitmarker.classList.add('show');
    });
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('visible', v);
  }

  flash(power: number): void {
    this.flashT = Math.max(this.flashT, power);
  }

  announce(text: string, kind: string): void {
    this.announceEl.textContent = text;
    this.announceEl.className = `show ${kind}`;
    this.announceT = 3.6;
    if (settings.get('subtitles') && (kind === 'objective' || kind === 'danger' || kind === 'success')) {
      this.subtitlesEl.textContent = text;
      this.subtitlesEl.style.display = 'block';
      this.subtitleT = 3.2;
    }
  }

  private renderObjectives(): void {
    const order: ObjectiveId[] = ['infiltrate', 'hostageA', 'hostageB', 'extract'];
    this.objectivesEl.innerHTML = '';
    for (const id of order) {
      const o = this.objectives.get(id);
      if (!o || o.state === 'hidden') continue;
      const div = document.createElement('div');
      div.className = `obj-item ${o.state}`;
      div.innerHTML = `<span class="dot"></span><span>${o.text}</span>`;
      this.objectivesEl.appendChild(div);
    }
  }

  update(dt: number, s: HudState): void {
    // vitals
    this.healthFill.style.transform = `scaleX(${Math.max(0, s.health) / 100})`;
    this.healthFill.classList.toggle('low', s.health < 35);
    this.healthNum.textContent = String(Math.max(0, Math.ceil(s.health)));
    this.armorFill.style.transform = `scaleX(${Math.max(0, s.armor) / 100})`;
    this.armorNum.textContent = String(Math.max(0, Math.ceil(s.armor)));
    // ammo
    if (s.weaponName.includes('Blade')) {
      this.ammoCount.innerHTML = '—';
    } else {
      this.ammoCount.innerHTML = `${s.mag}<span class="reserve"> / ${s.reserve}</span>`;
    }
    this.weaponName.textContent = s.weaponName.toUpperCase();
    this.slotEls.forEach((el, i) => el.classList.toggle('active', i + 1 === s.weaponSlot));
    this.reloadHint.textContent = s.phase === 'reload' ? 'RELOADING' : (s.mag === 0 && s.reserve > 0 ? 'PRESS R TO RELOAD' : '');
    // timer
    const m = Math.floor(s.timeLeft / 60);
    const sec = Math.floor(s.timeLeft % 60);
    this.timerEl.textContent = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    this.timerEl.classList.toggle('urgent', s.urgentTimer);
    this.extractEl.textContent = s.extractCountdown !== null ? `EXTRACTION ${s.extractCountdown.toFixed(0)}s — HOLD POSITION` : '';
    // hostages
    this.hostagesEl.innerHTML = '';
    for (const h of s.hostages) {
      const chip = document.createElement('div');
      chip.className = `hostage-chip ${h.state}`;
      chip.innerHTML = `<span>${h.name}</span><span class="st">${h.state.toUpperCase()}</span>`;
      this.hostagesEl.appendChild(chip);
    }
    // crosshair
    const showCross = settings.get('crosshair');
    this.crosshair.style.display = showCross ? 'block' : 'none';
    if (showCross) {
      const gap = 6 + s.spread * 900;
      (this.crosshair.querySelector('.l-t') as HTMLElement).style.top = `${22 - gap - 9}px`;
      (this.crosshair.querySelector('.l-b') as HTMLElement).style.bottom = `${22 - gap - 9}px`;
      (this.crosshair.querySelector('.l-l') as HTMLElement).style.left = `${22 - gap - 9}px`;
      (this.crosshair.querySelector('.l-r') as HTMLElement).style.right = `${22 - gap - 9}px`;
    }
    // interact
    if (s.interactPrompt) {
      this.interactEl.innerHTML = `<b>E</b>&ensp;${s.interactPrompt}`;
      this.interactEl.style.display = 'block';
    } else {
      this.interactEl.style.display = 'none';
    }
    // minimap
    const ctx = this.minimapCanvas.getContext('2d')!;
    this.minimap.draw(ctx, 352, 352, s.playerPos.floor, s.markers, { x: s.playerPos.x, z: s.playerPos.z, zoom: 9 });
    // timed elements
    if (this.announceT > 0) {
      this.announceT -= dt;
      if (this.announceT <= 0) this.announceEl.classList.remove('show');
    }
    if (this.subtitleT > 0) {
      this.subtitleT -= dt;
      if (this.subtitleT <= 0) this.subtitlesEl.style.display = 'none';
    }
    if (this.damageT > 0) {
      this.damageT -= dt * 1.6;
      this.damageVignette.style.opacity = String(Math.min(1, this.damageT) * 0.9);
      const arc = this.damageDir.querySelector('.arc') as HTMLElement;
      if (this.damageDirYaw !== null) {
        arc.style.opacity = String(Math.min(1, this.damageT));
        arc.style.transform = `translate(-50%, -50%) rotate(${-(this.damageDirYaw - s.playerPos.yaw) + Math.PI}rad)`;
      }
      if (this.damageT <= 0) {
        this.damageVignette.style.opacity = '0';
        arc.style.opacity = '0';
      }
    }
    if (this.flashT > 0) {
      this.flashT -= dt * 0.55;
      this.flashOverlay.style.opacity = String(Math.max(0, Math.min(1, this.flashT)));
    }
  }

  reset(): void {
    this.objectives.clear();
    this.renderObjectives();
    this.announceT = 0;
    this.damageT = 0;
    this.flashT = 0;
    this.announceEl.classList.remove('show');
    this.flashOverlay.style.opacity = '0';
    this.damageVignette.style.opacity = '0';
  }
}
