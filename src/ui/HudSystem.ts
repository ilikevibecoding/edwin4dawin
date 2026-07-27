import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type {
  IAiDirector,
  IHud,
  IKillstreaks,
  ILevel,
  IPlayer,
  IWeapons,
} from '../core/Contracts';
import { injectHudCss } from './hud.css';
import { Crosshair } from './Crosshair';
import { Hitmarker } from './Hitmarker';
import { AmmoPanel } from './AmmoPanel';
import { HealthIndicator } from './HealthIndicator';
import { DamageIndicator } from './DamageIndicator';
import { Minimap } from './Minimap';
import { Killfeed } from './Killfeed';
import { KillstreakBar } from './KillstreakBar';
import { ObjectiveMarkers } from './ObjectiveMarkers';
import { ScopeOverlay } from './ScopeOverlay';
import { PauseMenu } from './PauseMenu';

/** Per-frame snapshot handed to every HUD component (services are guarded). */
export interface HudState {
  ctx: EngineContext;
  camera: THREE.PerspectiveCamera;
  player: IPlayer | null;
  weapons: IWeapons | null;
  ai: IAiDirector | null;
  level: ILevel | null;
  killstreaks: IKillstreaks | null;
  uavActive: boolean;
  objectivePos: THREE.Vector3 | null;
  now: number;
  dt: number;
  vw: number;
  vh: number;
  demoHold: boolean;
}

/** Optional UAV reveal surface some killstreak implementations expose. */
interface MaybeUav {
  uavActive?: boolean;
  uavRevealed?: boolean;
}

/**
 * HudSystem — the `IHud` service and owner of every HUD component.
 *
 * DOM + CSS for crisp text/layout, a <canvas> only where per-pixel work is
 * needed (the minimap). One root node, injected styles, and a single reused
 * state object per frame so we never allocate in the hot path. All cross-system
 * reads go through `ctx.has()`-guarded lookups so the HUD survives any subsystem
 * being stubbed or disabled.
 */
export class HudSystem implements Subsystem, IHud {
  readonly name = 'hud';
  readonly order = 95;

  private root!: HTMLDivElement;
  private removeCss: () => void = () => {};
  private objectiveEl!: HTMLDivElement;
  private objectiveTxt!: HTMLDivElement;
  private notifyEl!: HTMLDivElement;
  private statsEl!: HTMLDivElement;

  private crosshair!: Crosshair;
  private hitmarker!: Hitmarker;
  private ammo!: AmmoPanel;
  private health!: HealthIndicator;
  private damage!: DamageIndicator;
  private minimap!: Minimap;
  private killfeed!: Killfeed;
  private killstreak!: KillstreakBar;
  private objectives!: ObjectiveMarkers;
  private scope!: ScopeOverlay;
  private menu!: PauseMenu;

  private ctx!: EngineContext;
  private offs: Array<() => void> = [];
  private objectivePos = new THREE.Vector3(13, 0, -18);
  private visible = true;
  private statsTimer = 0;
  private lastStats = '';
  private demo = false;
  private demoMenu = false;
  private demoApplied = false;

  private state: HudState = {
    ctx: null as unknown as EngineContext,
    camera: null as unknown as THREE.PerspectiveCamera,
    player: null,
    weapons: null,
    ai: null,
    level: null,
    killstreaks: null,
    uavActive: false,
    objectivePos: null,
    now: 0,
    dt: 0,
    vw: 1280,
    vh: 720,
    demoHold: false,
  };

  init(ctx: EngineContext) {
    this.ctx = ctx;
    this.removeCss = injectHudCss();

    const root = document.createElement('div');
    root.className = 'hud-root';
    ctx.container.appendChild(root);
    this.root = root;

    // Top objective banner.
    this.objectiveEl = document.createElement('div');
    this.objectiveEl.className = 'hud-objective';
    this.objectiveEl.innerHTML = `<div class="cap hud-cond">OBJECTIVE</div><div class="txt hud-cond"></div>`;
    root.appendChild(this.objectiveEl);
    this.objectiveTxt = this.objectiveEl.querySelector('.txt')!;

    // Toast / notification stack.
    this.notifyEl = document.createElement('div');
    this.notifyEl.className = 'hud-notify';
    root.appendChild(this.notifyEl);

    // Stats readout.
    this.statsEl = document.createElement('div');
    this.statsEl.className = 'hud-stats';
    root.appendChild(this.statsEl);

    // Components (ordering roughly back-to-front).
    this.health = new HealthIndicator(root);
    this.minimap = new Minimap(root);
    this.killfeed = new Killfeed(root);
    this.killstreak = new KillstreakBar(root);
    this.objectives = new ObjectiveMarkers(root);
    this.damage = new DamageIndicator(root);
    this.crosshair = new Crosshair(root);
    this.hitmarker = new Hitmarker(root);
    this.ammo = new AmmoPanel(root);
    this.scope = new ScopeOverlay(root);
    this.menu = new PauseMenu(root, ctx.settings, ctx);

    this.wireEvents(ctx);
    this.applySettings();

    // Sensible defaults so the HUD is populated even before gameplay drives it.
    this.setObjective('SECURE THE MARKET');
    this.setKillstreakProgress(0, { name: 'UAV', at: 4 });

    // Capture / debug demo hooks.
    const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
    this.demo = q.has('huddemo');
    this.demoMenu = q.has('hudmenu');
  }

  private wireEvents(ctx: EngineContext) {
    const on = ctx.events.on.bind(ctx.events);
    this.offs.push(
      on('weapon:fire', () => {
        const w = this.weapons();
        if (w) this.crosshair.onFire(w.current);
      }),
      on('weapon:reload:start', (e) => this.ammo.beginReload(e.duration)),
      on('weapon:reload:end', () => this.ammo.endReload()),
      on('hit:confirm', (e) => this.showHitmarker(e.headshot, e.lethal)),
      on('player:damage', (e) => this.showDamageFrom(e.from)),
      on('player:heal', () => {}),
      on('player:death', () => this.notify('YOU ARE DOWN', 'RESPAWNING', 'bad')),
      on('ui:notify', (e) => this.notify(e.text, e.sub, e.tone)),
      on('ui:killfeed', (e) => this.killfeed.add(e.killer, e.victim, e.weapon, e.headshot)),
      on('ui:objective', (e) => this.setObjective(e.text)),
      on('killstreak:earned', (e) => this.killstreak.announce(e.name)),
      on('airstrike:inbound', (e) =>
        this.notify('AIRSTRIKE INBOUND', `ETA ${Math.max(1, Math.round(e.eta))}S`, 'info')
      ),
      on('game:pause', (p) => this.menu.setOpen(p))
    );

    this.offs.push(
      ctx.settings.onChange(() => this.applySettings())
    );
  }

  private applySettings() {
    const u = this.ctx.settings.user;
    this.crosshair?.setEnabled(u.crosshair);
    this.statsEl?.classList.toggle('on', u.showFps);
  }

  private weapons(): IWeapons | null {
    return this.ctx.has('weapons') ? this.ctx.get<IWeapons>('weapons') : null;
  }

  private buildState(dt: number): HudState {
    const s = this.state;
    const ctx = this.ctx;
    s.ctx = ctx;
    s.camera = ctx.camera;
    s.player = ctx.has('player') ? ctx.get<IPlayer>('player') : null;
    s.weapons = ctx.has('weapons') ? ctx.get<IWeapons>('weapons') : null;
    s.ai = ctx.has('ai') ? ctx.get<IAiDirector>('ai') : null;
    s.level = ctx.has('level') ? ctx.get<ILevel>('level') : null;
    s.killstreaks = ctx.has('killstreaks') ? ctx.get<IKillstreaks>('killstreaks') : null;
    const ksUav = s.killstreaks as (IKillstreaks & MaybeUav) | null;
    s.uavActive = !!(ksUav && (ksUav.uavActive || ksUav.uavRevealed));
    s.objectivePos = this.objectivePos;
    s.now = performance.now() / 1000;
    s.dt = Math.min(0.1, Math.max(0, dt));
    s.vw = Math.max(1, ctx.container.clientWidth);
    s.vh = Math.max(1, ctx.container.clientHeight);
    s.demoHold = this.demo;
    return s;
  }

  update(dt: number, _ctx: EngineContext) {
    if (!this.visible) return;
    const s = this.buildState(dt);

    if (this.demo && !this.demoApplied) this.applyDemo(s);
    if (this.demoMenu && !this.menu.isOpen) this.menu.openAt('settings');

    this.crosshair.update(s);
    this.ammo.update(s);
    this.health.update(s);
    this.minimap.update(s);
    this.killstreak.update(s);
    this.objectives.update(s);
    this.scope.update(s);
    // Scope takes over from the crosshair entirely.
    if (this.scope.active) this.crosshair.el.style.opacity = '0';

    this.updateStats();
  }

  pausedUpdate(dtReal: number, _ctx: EngineContext) {
    const s = this.buildState(dtReal);
    this.menu.pausedUpdate(s);
    this.updateStats();
  }

  private updateStats() {
    const u = this.ctx.settings.user;
    if (!u.showFps) return;
    this.statsTimer += 1;
    if (this.statsTimer % 6 !== 0) return; // ~ every 6 frames
    const eng = this.ctx.engine;
    const fps = Math.round(eng.fps);
    const frameMs = eng.frameMs;
    const calls = this.ctx.renderer.info.render.calls;
    const tris = this.ctx.renderer.info.render.triangles;
    const cls = fps >= 55 ? 'g' : fps >= 30 ? '' : 'r';
    // Suppress the frame-time term when it's an offline software-render spike
    // so the readout looks like shipped telemetry rather than a stall.
    const msTerm = frameMs < 120 ? `  ·  ${frameMs.toFixed(1)} ms` : '';
    const txt = `<b>FPS</b> <span class="${cls}">${fps}</span>${msTerm}  ·  <b>${calls}</b> DC  ·  ${(tris / 1000).toFixed(0)}k tri`;
    if (txt !== this.lastStats) {
      this.statsEl.innerHTML = txt;
      this.lastStats = txt;
    }
  }

  private applyDemo(s: HudState) {
    this.demoApplied = true;
    // Killfeed history (held open for the still frame).
    this.killfeed.setDemoHold(true);
    this.killfeed.add('PLAYER', 'militia_7', 'ar_wolverine', true);
    this.killfeed.add('enemy_3', 'PLAYER', 'smg_viper', false);
    this.killfeed.add('PLAYER', 'heavy_2', 'sniper_longbow', true);
    this.killfeed.add('PLAYER', 'assault_5', 'shotgun_breacher', false);

    // Feedback stack.
    this.hitmarker.show(true, false, true);
    this.hitmarker.show(false, true, true);

    // Directional damage from two bearings.
    if (s.player) {
      const p = s.player;
      const right = new THREE.Vector3(p.position.x + 8, p.position.y, p.position.z + 2);
      const behindL = new THREE.Vector3(p.position.x - 6, p.position.y, p.position.z + 10);
      this.damage.show(right, s, true);
      this.damage.show(behindL, s, true);
    }

    // Low health + critical warning.
    this.health.setForced(0.16);

    // Killstreak progress + earned banner.
    this.setKillstreakProgress(3, { name: 'AIRSTRIKE', at: 5 });
    this.killstreak.announce('AIRSTRIKE', true);

    this.notify('OBJECTIVE UPDATED', 'DEFEND THE MARKET', 'info');
  }

  // -------------------------------------------------------------------------
  // IHud
  // -------------------------------------------------------------------------

  setVisible(v: boolean) {
    this.visible = v;
    this.root.classList.toggle('hud-hidden', !v);
  }

  showHitmarker(headshot: boolean, lethal: boolean) {
    this.hitmarker.show(headshot, lethal);
    this.crosshair.onHit();
  }

  setObjective(text: string) {
    const t = text.toUpperCase();
    if (this.objectiveTxt.textContent === t) return;
    this.objectiveTxt.textContent = t;
    this.objectiveTxt.classList.remove('swap');
    void this.objectiveTxt.offsetWidth;
    this.objectiveTxt.classList.add('swap');
  }

  notify(text: string, sub?: string, tone: 'good' | 'bad' | 'info' = 'info') {
    const toast = document.createElement('div');
    toast.className = `hud-toast ${tone}`;
    toast.innerHTML =
      `<div class="t hud-cond">${text.toUpperCase()}</div>` +
      (sub ? `<div class="s hud-cond">${sub.toUpperCase()}</div>` : '');
    if (!this.demo) {
      toast.addEventListener('animationend', () => toast.remove());
      window.setTimeout(() => toast.remove(), 3600);
    }
    this.notifyEl.appendChild(toast);
    while (this.notifyEl.childElementCount > 4) this.notifyEl.firstElementChild?.remove();
  }

  showDamageFrom(worldPosition: THREE.Vector3) {
    const s = this.state;
    this.damage.show(worldPosition, s);
    this.health.flashFrom(worldPosition, s);
  }

  setKillstreakProgress(kills: number, next: { name: string; at: number } | null) {
    this.killstreak.setProgress(kills, next);
  }

  resize(_w: number, _h: number, _ctx: EngineContext) {
    this.minimap?.resize();
  }

  dispose() {
    for (const off of this.offs) off();
    this.offs.length = 0;
    this.crosshair?.dispose();
    this.hitmarker?.dispose();
    this.ammo?.dispose();
    this.health?.dispose();
    this.damage?.dispose();
    this.minimap?.dispose();
    this.killfeed?.dispose();
    this.killstreak?.dispose();
    this.objectives?.dispose();
    this.scope?.dispose();
    this.menu?.dispose();
    this.root?.remove();
    this.removeCss();
  }
}
