import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import { QUALITY, setQuality, SHOT_MODE, type QualityTier } from '../core/Config';
import type { AudioSystem } from '../audio/AudioSystem';
import type { HUDSystem } from './HUD';

/**
 * Loading screen, main menu, and pause menu.
 *
 * DOM rather than canvas: menus are text-heavy and need real focus handling,
 * hover states, and accessibility, all of which the browser already does well.
 */
export class MenuSystem implements System {
  readonly name = 'menu';
  readonly order = 96;

  private ctx!: EngineContext;
  private root!: HTMLDivElement;
  private loadingEl!: HTMLDivElement;
  private mainEl!: HTMLDivElement;
  private pauseEl!: HTMLDivElement;
  private barEl!: HTMLDivElement;
  private labelEl!: HTMLDivElement;

  private state: 'loading' | 'main' | 'playing' | 'paused' = 'loading';

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.build();

    if (SHOT_MODE) {
      // Screenshot harness needs the game running immediately with no chrome.
      this.startGame();
      this.root.style.display = 'none';
      return;
    }

    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    });
  }

  setLoadProgress(label: string, frac: number): void {
    if (!this.barEl) return;
    this.barEl.style.width = `${Math.round(frac * 100)}%`;
    this.labelEl.textContent = label === 'ready' ? 'READY' : `INITIALISING · ${label.toUpperCase()}`;
    if (frac >= 1) {
      window.setTimeout(() => this.showMain(), 260);
    }
  }

  private build(): void {
    const style = document.createElement('style');
    style.textContent = `
      .ob-root { position:fixed; inset:0; z-index:40; pointer-events:none;
        font-family:'Rajdhani','Barlow Condensed',system-ui,sans-serif; }
      .ob-panel { position:absolute; inset:0; display:none; place-items:center;
        pointer-events:auto; background:
          radial-gradient(1200px 700px at 50% 40%, rgba(18,24,28,0.72), rgba(4,6,8,0.96));
        backdrop-filter: blur(3px) saturate(0.85); }
      .ob-panel.on { display:grid; }
      .ob-card { width:min(680px, 88vw); padding:44px 48px; }
      .ob-eyebrow { font-size:12px; letter-spacing:6px; color:#c8a04a; margin-bottom:10px;
        text-transform:uppercase; font-weight:600; }
      .ob-title { font-size:clamp(38px,6vw,68px); font-weight:700; letter-spacing:4px;
        color:#eef4f8; line-height:0.98; margin:0 0 6px; text-transform:uppercase; }
      .ob-sub { font-size:15px; letter-spacing:2px; color:#8a969f; margin-bottom:34px; }
      .ob-rule { height:1px; background:linear-gradient(90deg,#c8a04a,rgba(200,160,74,0)); margin:22px 0; }
      .ob-btn { display:block; width:100%; text-align:left; background:rgba(255,255,255,0.03);
        border:1px solid rgba(200,160,74,0.22); border-left:3px solid #c8a04a;
        color:#e6edf2; font:600 17px/1 'Rajdhani',system-ui,sans-serif; letter-spacing:3px;
        padding:15px 18px; margin-bottom:10px; cursor:pointer; text-transform:uppercase;
        transition:background .14s ease, transform .14s ease, border-color .14s ease; }
      .ob-btn:hover { background:rgba(200,160,74,0.14); transform:translateX(4px);
        border-color:rgba(200,160,74,0.6); }
      .ob-btn:active { transform:translateX(1px); }
      .ob-btn small { display:block; font-size:11px; letter-spacing:1.5px; color:#8a969f;
        margin-top:6px; text-transform:none; font-weight:500; }
      .ob-row { display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
      .ob-chip { flex:1 1 auto; background:rgba(255,255,255,0.03);
        border:1px solid rgba(255,255,255,0.09); color:#b9c4cc;
        font:600 12px/1 'Rajdhani',system-ui,sans-serif; letter-spacing:2px; padding:10px 12px;
        cursor:pointer; text-transform:uppercase; transition:all .14s ease; }
      .ob-chip:hover { border-color:rgba(200,160,74,0.5); color:#eef4f8; }
      .ob-chip.on { background:rgba(200,160,74,0.18); border-color:#c8a04a; color:#f3e6c8; }
      .ob-keys { display:grid; grid-template-columns:repeat(2,1fr); gap:4px 22px;
        font-size:13px; color:#8a969f; letter-spacing:1px; }
      .ob-keys b { color:#c8d3db; font-weight:600; }
      .ob-bar { height:2px; background:rgba(255,255,255,0.07); overflow:hidden; }
      .ob-bar i { display:block; height:100%; width:0%; background:#c8a04a;
        transition:width .25s ease; }
      .ob-load-label { font-size:11px; letter-spacing:4px; color:#6f7a83; margin-top:10px; }
    `;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.className = 'ob-root';

    this.loadingEl = document.createElement('div');
    this.loadingEl.className = 'ob-panel on';
    this.loadingEl.innerHTML = `
      <div class="ob-card">
        <div class="ob-eyebrow">Task Force 141 · Classified</div>
        <h1 class="ob-title">Operation<br/>Blacksite</h1>
        <div class="ob-sub">AL-RAHIM BORDER DISTRICT · 0614 LOCAL</div>
        <div class="ob-bar"><i></i></div>
        <div class="ob-load-label">INITIALISING</div>
      </div>`;
    this.barEl = this.loadingEl.querySelector('.ob-bar i')!;
    this.labelEl = this.loadingEl.querySelector('.ob-load-label')!;

    this.mainEl = document.createElement('div');
    this.mainEl.className = 'ob-panel';
    this.mainEl.innerHTML = `
      <div class="ob-card">
        <div class="ob-eyebrow">Task Force 141 · Classified</div>
        <h1 class="ob-title">Operation<br/>Blacksite</h1>
        <div class="ob-sub">AL-RAHIM BORDER DISTRICT · 0614 LOCAL</div>
        <button class="ob-btn" data-act="deploy">Deploy
          <small>Clear the district. Earn killstreaks. Call in close air support.</small>
        </button>
        <div class="ob-rule"></div>
        <div class="ob-eyebrow" style="letter-spacing:4px;margin-bottom:8px">Graphics</div>
        <div class="ob-row" data-quality></div>
        <div class="ob-rule"></div>
        <div class="ob-eyebrow" style="letter-spacing:4px;margin-bottom:8px">Controls</div>
        <div class="ob-keys">
          <div><b>WASD</b> move</div><div><b>MOUSE</b> look</div>
          <div><b>SHIFT</b> sprint</div><div><b>CTRL / C</b> crouch</div>
          <div><b>X</b> prone</div><div><b>SPACE</b> jump / mantle</div>
          <div><b>LMB</b> fire</div><div><b>RMB</b> aim</div>
          <div><b>R</b> reload</div><div><b>B</b> fire mode</div>
          <div><b>1 / 2</b> weapons</div><div><b>I</b> inspect</div>
          <div><b>3</b> recon sweep</div><div><b>4</b> airstrike</div>
          <div><b>5</b> ammo drop</div><div><b>ESC</b> pause</div>
        </div>
      </div>`;

    this.pauseEl = document.createElement('div');
    this.pauseEl.className = 'ob-panel';
    this.pauseEl.innerHTML = `
      <div class="ob-card">
        <div class="ob-eyebrow">Mission Paused</div>
        <h1 class="ob-title" style="font-size:44px">Standby</h1>
        <button class="ob-btn" data-act="resume">Resume</button>
        <button class="ob-btn" data-act="restart">Restart Mission</button>
        <div class="ob-rule"></div>
        <div class="ob-eyebrow" style="letter-spacing:4px;margin-bottom:8px">Graphics</div>
        <div class="ob-row" data-quality></div>
      </div>`;

    this.root.append(this.loadingEl, this.mainEl, this.pauseEl);
    document.getElementById('ui-root')!.appendChild(this.root);
    this.root.style.pointerEvents = 'none';

    for (const holder of this.root.querySelectorAll('[data-quality]')) {
      for (const tier of ['low', 'medium', 'high', 'ultra'] as QualityTier[]) {
        const b = document.createElement('button');
        b.className = 'ob-chip' + (QUALITY.tier === tier ? ' on' : '');
        b.textContent = tier;
        b.onclick = () => {
          setQuality(tier);
          this.ctx.engine.refreshSize();
          for (const other of this.root.querySelectorAll('.ob-chip')) {
            other.classList.toggle('on', other.textContent === tier);
          }
          Signals.emit('engine:quality', { tier });
        };
        holder.appendChild(b);
      }
    }

    this.root.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest('[data-act]')?.getAttribute('data-act');
      if (act === 'deploy') this.startGame();
      else if (act === 'resume') this.resume();
      else if (act === 'restart') location.reload();
    });
  }

  private showMain(): void {
    this.state = 'main';
    this.loadingEl.classList.remove('on');
    this.mainEl.classList.add('on');
    this.root.style.pointerEvents = 'auto';
    this.ctx.engine.simulating = false;
    this.ctx.get<HUDSystem>('hud')?.setVisible(false);
    this.ctx.engine.pipeline.fadeToBlack = 1;
  }

  startGame(): void {
    this.state = 'playing';
    this.loadingEl.classList.remove('on');
    this.mainEl.classList.remove('on');
    this.pauseEl.classList.remove('on');
    this.root.style.pointerEvents = 'none';
    this.ctx.engine.simulating = true;
    this.ctx.get<HUDSystem>('hud')?.setVisible(true);
    this.ctx.input.enabled = true;
    if (!SHOT_MODE) this.ctx.input.requestLock();
    Signals.emit('game:started', {});
    Signals.emit('audio:music', { cue: 'combat' });
    Signals.emit('ui:notify', {
      title: 'CLEAR THE DISTRICT',
      subtitle: 'HOSTILES INBOUND',
      tone: 'neutral',
    });
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.pauseEl.classList.add('on');
    this.root.style.pointerEvents = 'auto';
    this.ctx.engine.simulating = false;
    this.ctx.input.exitLock();
    this.ctx.input.enabled = false;
    this.ctx.get<AudioSystem>('audio')?.setMuted(true);
    Signals.emit('game:paused', { paused: true });
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.pauseEl.classList.remove('on');
    this.root.style.pointerEvents = 'none';
    this.ctx.engine.simulating = true;
    this.ctx.input.enabled = true;
    this.ctx.input.requestLock();
    this.ctx.get<AudioSystem>('audio')?.setMuted(false);
    Signals.emit('game:paused', { paused: false });
  }

  update(dt: number, ctx: EngineContext): void {
    // Fade in once gameplay starts.
    const target = this.state === 'playing' ? 1 : 0.35;
    const p = ctx.engine.pipeline;
    p.fadeToBlack += (target - p.fadeToBlack) * Math.min(1, dt * 2.4);
  }

  dispose(): void {
    this.root.remove();
  }
}
