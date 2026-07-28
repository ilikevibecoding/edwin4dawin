import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import { QUALITY, setQuality, SHOT_MODE, type QualityTier } from '../core/Config';
import type { AudioSystem } from '../audio/AudioSystem';
import type { HUDSystem } from './HUD';
import { AMBER, DIM, FONT_STACK, INK } from './HudType';

/**
 * Loading screen, main menu, and pause menu.
 *
 * DOM rather than canvas: menus are text-heavy and need real focus handling,
 * hover states, and accessibility, all of which the browser already does well.
 *
 * The front end is the first thing anybody sees, so it carries the same
 * language as the HUD — near-black ground, one amber accent, everything
 * uppercase and tracked wide, one corner treatment — and nothing else. What
 * makes it feel like a title screen rather than a settings dialog is
 * restraint plus a couple of deliberate moves: a full-bleed letterbox, a
 * title lockup with a rule under it, and a loading readout that reports
 * actual subsystem progress instead of animating a fake bar.
 */

/** Boot lines shown while the world builds. Flavour, but honest flavour. */
const BOOT_LINES: Array<[number, string]> = [
  [0.0, 'ESTABLISHING SECURE LINK'],
  [0.12, 'AUTHENTICATING · TF-141/BLACKSITE'],
  [0.3, 'STREAMING TERRAIN — AL-RAHIM DISTRICT'],
  [0.55, 'SYNTHESISING SURFACE LIBRARY'],
  [0.72, 'PLOTTING PATROL ROUTES'],
  [0.86, 'ARMING CLOSE AIR SUPPORT NET'],
  [0.96, 'WEAPONS FREE'],
];

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
  private pctEl!: HTMLDivElement;
  private logEl!: HTMLDivElement;

  private state: 'loading' | 'main' | 'playing' | 'paused' = 'loading';
  private loggedLines = 0;

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
      if (e.code === 'Escape') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
      } else if (e.code === 'Enter' && this.state === 'main') {
        this.startGame();
      }
    });
  }

  setLoadProgress(label: string, frac: number): void {
    if (!this.barEl) return;
    // The capture harness starts the game during init; letting the loading
    // screen hand off to the main menu later would stop the sim and hide the
    // HUD partway through a scenario's warmup.
    if (SHOT_MODE) return;

    this.barEl.style.width = `${Math.round(frac * 100)}%`;
    this.pctEl.textContent = String(Math.round(frac * 100)).padStart(3, '0');
    this.labelEl.textContent = label === 'ready' ? 'READY' : label.toUpperCase();

    // The log fills in as thresholds are passed, so the panel reads as a
    // machine reporting progress rather than a spinner marking time.
    while (this.loggedLines < BOOT_LINES.length && frac >= BOOT_LINES[this.loggedLines][0]) {
      const line = document.createElement('div');
      line.className = 'ob-logline';
      line.innerHTML = `<i>›</i>${BOOT_LINES[this.loggedLines][1]}`;
      this.logEl.appendChild(line);
      this.loggedLines++;
    }
    this.logEl.scrollTop = this.logEl.scrollHeight;

    if (frac >= 1) window.setTimeout(() => this.showMain(), 420);
  }

  // ------------------------------------------------------------------ dom --

  private build(): void {
    const style = document.createElement('style');
    style.textContent = `
      .ob-root { position:fixed; inset:0; z-index:40; pointer-events:none;
        font-family:${FONT_STACK}; color:rgb(${INK});
        -webkit-font-smoothing:antialiased; }
      .ob-panel { position:absolute; inset:0; display:none; pointer-events:auto;
        background:
          radial-gradient(760px 380px at 6% 106%, rgba(214,138,52,0.15), rgba(0,0,0,0) 68%),
          radial-gradient(1400px 820px at 22% 34%, rgba(26,32,38,0.72), rgba(3,5,7,0.97) 72%),
          linear-gradient(180deg, rgba(3,5,7,1), rgba(4,6,9,0.92));
        overflow:hidden; }
      /* Column flow, so the footer strip is laid out rather than floated over
         the content. Absolute positioning let the controls card grow straight
         down through "Task Force 141" on any viewport short enough to matter,
         and there is no arrangement of fixed insets that survives every
         aspect ratio. */
      .ob-panel.on { display:flex; flex-direction:column; }

      /* Letterbox bars and a scanline wash: cinema framing, one gesture. */
      .ob-panel::before, .ob-panel::after { content:''; position:absolute; left:0; right:0;
        height:44px; background:#000; opacity:0.92; }
      .ob-panel::before { top:0; } .ob-panel::after { bottom:0; }
      .ob-scan { position:absolute; inset:0; pointer-events:none; opacity:0.5;
        background:repeating-linear-gradient(180deg,
          rgba(255,255,255,0.028) 0 1px, rgba(0,0,0,0) 1px 3px); }
      .ob-vig { position:absolute; inset:0; pointer-events:none;
        background:radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.72) 100%); }
      /* A survey grid fading out behind the lockup: enough to stop the field
         reading as flat black without competing with anything on top of it. */
      .ob-map { position:absolute; inset:0; pointer-events:none;
        background:
          repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 1px, rgba(0,0,0,0) 1px 72px),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, rgba(0,0,0,0) 1px 72px);
        -webkit-mask-image:radial-gradient(88% 72% at 28% 42%, #000 6%, rgba(0,0,0,0) 76%);
        mask-image:radial-gradient(88% 72% at 28% 42%, #000 6%, rgba(0,0,0,0) 76%); }
      /* One slow pass of a brighter band. A title screen that is completely
         static reads as a screenshot of a menu rather than a running game. */
      .ob-sweep { position:absolute; left:0; right:0; height:220px; pointer-events:none;
        background:linear-gradient(180deg, rgba(255,255,255,0) 0%,
          rgba(190,214,235,0.035) 48%, rgba(255,255,255,0) 100%);
        animation:ob-sweep 9s linear infinite; }
      @keyframes ob-sweep { from { transform:translateY(-240px); }
                            to { transform:translateY(102vh); } }
      @media (prefers-reduced-motion: reduce) { .ob-sweep { animation:none; opacity:0; } }

      .ob-stage { flex:1 1 auto; min-height:0; display:grid; align-content:center;
        padding:44px clamp(36px, 7vw, 132px) 18px; }

      /* ---- title lockup ---- */
      .ob-eyebrow { font-size:11px; letter-spacing:7px; color:rgb(${AMBER});
        text-transform:uppercase; font-weight:700; display:flex; align-items:center; gap:12px; }
      .ob-eyebrow::after { content:''; flex:1; height:1px; max-width:190px;
        background:linear-gradient(90deg, rgba(${AMBER},0.75), rgba(${AMBER},0)); }
      .ob-title { font-size:clamp(46px,7.4vw,104px); font-weight:700; letter-spacing:9px;
        line-height:0.92; margin:14px 0 0; text-transform:uppercase;
        text-shadow:0 10px 40px rgba(0,0,0,0.85); }
      .ob-title b { font-weight:300; color:rgba(${INK},0.62); display:block; letter-spacing:11px;
        font-size:0.44em; }
      .ob-slug { display:flex; gap:18px; align-items:center; margin-top:18px;
        font-size:11.5px; letter-spacing:4px; color:rgba(${DIM},0.9); }
      .ob-slug span { display:flex; gap:9px; align-items:center; }
      .ob-slug i { width:5px; height:5px; background:rgb(${AMBER}); transform:rotate(45deg);
        font-style:normal; }
      .ob-hr { height:1px; margin:26px 0 30px;
        background:linear-gradient(90deg, rgba(${AMBER},0.85), rgba(${INK},0.14) 42%, rgba(${INK},0)); }

      /* ---- panel chrome: one cut corner, one amber tick ---- */
      .ob-card { position:relative; background:rgba(9,12,14,0.62);
        border:1px solid rgba(${INK},0.1);
        clip-path:polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px);
        padding:18px 20px; }
      .ob-card::before { content:''; position:absolute; left:-1px; top:-1px; width:22px; height:22px;
        background:linear-gradient(45deg, rgba(${AMBER},0) 46%, rgb(${AMBER}) 46%, rgb(${AMBER}) 54%, rgba(${AMBER},0) 54%); }
      .ob-cardlabel { font-size:10px; letter-spacing:4px; color:rgba(${DIM},0.8);
        text-transform:uppercase; margin-bottom:12px; font-weight:600; }

      /* ---- primary action ---- */
      .ob-deploy { position:relative; display:flex; align-items:center; gap:20px; width:100%;
        background:rgba(${AMBER},0.09); border:1px solid rgba(${AMBER},0.42);
        border-left:3px solid rgb(${AMBER}); color:rgb(${INK});
        font-family:inherit; font-size:23px; font-weight:700; letter-spacing:8px;
        padding:20px 24px; cursor:pointer; text-transform:uppercase; text-align:left;
        transition:background .16s ease, transform .16s ease, box-shadow .16s ease; }
      .ob-deploy:hover { background:rgba(${AMBER},0.2); transform:translateX(5px);
        box-shadow:-6px 0 24px rgba(${AMBER},0.16); }
      /* One line, clipped rather than wrapped. As a block it was a flex item
         free to wrap, and "call close air support" broke after "call" — a
         two-line ragged caption beside a one-line button, which is the sort of
         thing that reads as a layout that was never looked at. */
      .ob-deploy small { flex:0 1 auto; min-width:0; white-space:nowrap;
        overflow:hidden; text-overflow:ellipsis;
        font-size:11px; letter-spacing:2.4px;
        color:rgba(${DIM},0.92); font-weight:600; text-transform:uppercase; }
      .ob-deploy .ob-key { margin-left:auto; font-size:10px; letter-spacing:3px;
        color:rgba(${DIM},0.75); border:1px solid rgba(${INK},0.18); padding:5px 9px; }

      .ob-btn { display:block; width:100%; text-align:left; background:rgba(255,255,255,0.028);
        border:1px solid rgba(${INK},0.1); border-left:2px solid rgba(${AMBER},0.55);
        color:rgba(${INK},0.92); font-family:inherit; font-size:14px; font-weight:600;
        letter-spacing:4px; padding:13px 16px; margin-top:8px; cursor:pointer;
        text-transform:uppercase; transition:background .14s ease, transform .14s ease; }
      .ob-btn:hover { background:rgba(${AMBER},0.13); transform:translateX(4px);
        border-left-color:rgb(${AMBER}); }

      /* ---- settings chips ---- */
      .ob-row { display:flex; gap:7px; flex-wrap:wrap; }
      .ob-chip { flex:1 1 0; background:rgba(255,255,255,0.026);
        border:1px solid rgba(${INK},0.1); color:rgba(${DIM},0.95);
        font-family:inherit; font-size:11px; font-weight:700; letter-spacing:3px;
        padding:10px 6px; cursor:pointer; text-transform:uppercase;
        transition:all .14s ease; }
      .ob-chip:hover { border-color:rgba(${AMBER},0.55); color:rgb(${INK}); }
      .ob-chip.on { background:rgba(${AMBER},0.18); border-color:rgb(${AMBER});
        color:rgb(${INK}); box-shadow:inset 0 -2px 0 rgb(${AMBER}); }

      /* ---- controls ---- */
      .ob-keys { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:5px 26px;
        font-size:12px; letter-spacing:1.6px; color:rgba(${DIM},0.86); }
      .ob-keys div { display:flex; justify-content:space-between; gap:10px;
        border-bottom:1px solid rgba(${INK},0.055); padding-bottom:3px; }
      .ob-keys b { color:rgba(${INK},0.92); font-weight:700; letter-spacing:2px; }

      /* ---- loading ---- */
      .ob-load { display:grid; grid-template-columns:minmax(0,1fr); gap:0; max-width:760px; }
      .ob-bar { position:relative; height:3px; background:rgba(${INK},0.08); overflow:hidden; }
      .ob-bar i { position:absolute; inset:0 auto 0 0; width:0%; background:rgb(${AMBER});
        box-shadow:0 0 14px rgba(${AMBER},0.65); transition:width .28s ease; }
      .ob-barrow { display:flex; align-items:baseline; gap:14px; margin-top:12px;
        font-size:11px; letter-spacing:4px; color:rgba(${DIM},0.85); text-transform:uppercase; }
      .ob-pct { margin-left:auto; font-size:26px; font-weight:700; letter-spacing:3px;
        color:rgb(${INK}); line-height:1; }
      .ob-log { margin-top:22px; height:104px; overflow:hidden; font-size:11px;
        letter-spacing:2.4px; color:rgba(${DIM},0.66); line-height:1.85; }
      .ob-logline i { color:rgb(${AMBER}); font-style:normal; margin-right:10px; }
      /* Inside the bottom letterbox bar, and above it.
         The bar is 92% black and painted over everything in the panel, so a
         footer in normal flow was simply under it: the screen ended in a band
         of unexplained empty with two ghosts of text in it. Sitting the strip
         in the bar on purpose is both legible and the thing the bar is for. */
      .ob-foot { position:relative; z-index:2; flex:0 0 44px; display:flex;
        align-items:center; justify-content:space-between;
        padding:0 clamp(36px,7vw,132px);
        font-size:10px; letter-spacing:3.4px; color:rgba(${DIM},0.6); text-transform:uppercase; }

      .ob-grid { display:grid; grid-template-columns:minmax(320px, 1.15fr) minmax(280px, 0.85fr);
        gap:26px; align-items:start; }
      @media (max-width: 900px) { .ob-grid { grid-template-columns:1fr; } }
      /* Short viewports: shed the lockup's breathing room before anything has
         to overflow. The title is the first thing that can afford to give. */
      @media (max-height: 780px) {
        .ob-title { font-size:clamp(38px,5.6vw,70px); margin-top:10px; }
        .ob-slug { margin-top:12px; }
        .ob-hr { margin:16px 0 18px; }
        .ob-deploy { padding:15px 22px; font-size:20px; }
        .ob-card { padding:14px 18px; }
        .ob-keys { gap:3px 22px; font-size:11.5px; }
        .ob-log { height:78px; }
      }
    `;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.className = 'ob-root';

    const chrome = '<div class="ob-map"></div><div class="ob-sweep"></div>'
      + '<div class="ob-scan"></div><div class="ob-vig"></div>';

    const lockup = (sub: string): string => `
      <div class="ob-eyebrow">Task Force 141 · Classified</div>
      <h1 class="ob-title">Operation<b>Blacksite</b></h1>
      <div class="ob-slug">
        <span><i></i>AL-RAHIM BORDER DISTRICT</span>
        <span><i></i>0614 LOCAL</span>
        <span><i></i>${sub}</span>
      </div>
      <div class="ob-hr"></div>`;

    this.loadingEl = document.createElement('div');
    this.loadingEl.className = 'ob-panel on';
    this.loadingEl.innerHTML = `
      ${chrome}
      <div class="ob-stage">
        ${lockup('INSERTION IN PROGRESS')}
        <div class="ob-load">
          <div class="ob-bar"><i></i></div>
          <div class="ob-barrow">
            <span class="ob-load-label">INITIALISING</span>
            <span class="ob-pct">000</span>
          </div>
          <div class="ob-log"></div>
        </div>
      </div>
      <div class="ob-foot"><span>Build 1.0 · Desert Package</span><span>Do not distribute</span></div>`;
    this.barEl = this.loadingEl.querySelector('.ob-bar i')!;
    this.labelEl = this.loadingEl.querySelector('.ob-load-label')!;
    this.pctEl = this.loadingEl.querySelector('.ob-pct')!;
    this.logEl = this.loadingEl.querySelector('.ob-log')!;

    this.mainEl = document.createElement('div');
    this.mainEl.className = 'ob-panel';
    this.mainEl.innerHTML = `
      ${chrome}
      <div class="ob-stage">
        ${lockup('MISSION 01')}
        <div class="ob-grid">
          <div>
            <button class="ob-deploy" data-act="deploy">Deploy
              <small>Earn streaks · call close air support</small>
              <span class="ob-key">ENTER</span>
            </button>
            <div class="ob-card" style="margin-top:14px">
              <div class="ob-cardlabel">Mission Brief</div>
              <div style="font-size:12.5px;letter-spacing:1.4px;line-height:1.75;color:rgba(${DIM},0.92)">
                Hostile cell holds the market quarter. Push the carriageway, break
                their strongpoints, and keep the arch clear for the relief column.
                CAS is on station — five confirmed and the net is yours.
              </div>
            </div>
          </div>
          <div>
            <div class="ob-card">
              <div class="ob-cardlabel">Graphics</div>
              <div class="ob-row" data-quality></div>
            </div>
            <div class="ob-card" style="margin-top:12px">
              <div class="ob-cardlabel">Controls</div>
              <div class="ob-keys">
                <div><span>Move</span><b>WASD</b></div><div><span>Look</span><b>MOUSE</b></div>
                <div><span>Sprint</span><b>SHIFT</b></div><div><span>Crouch</span><b>CTRL</b></div>
                <div><span>Prone</span><b>X</b></div><div><span>Jump</span><b>SPACE</b></div>
                <div><span>Fire</span><b>LMB</b></div><div><span>Aim</span><b>RMB</b></div>
                <div><span>Reload</span><b>R</b></div><div><span>Fire mode</span><b>B</b></div>
                <div><span>Weapons</span><b>1 / 2</b></div><div><span>Inspect</span><b>I</b></div>
                <div><span>Recon</span><b>3</b></div><div><span>Airstrike</span><b>4</b></div>
                <div><span>Ammo</span><b>5</b></div><div><span>Pause</span><b>ESC</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="ob-foot"><span>Build 1.0 · Desert Package</span><span>Task Force 141</span></div>`;

    this.pauseEl = document.createElement('div');
    this.pauseEl.className = 'ob-panel';
    this.pauseEl.innerHTML = `
      ${chrome}
      <div class="ob-stage">
        <div class="ob-eyebrow">Mission Paused</div>
        <h1 class="ob-title" style="font-size:clamp(38px,4.6vw,62px)">Standby</h1>
        <div class="ob-hr"></div>
        <div style="max-width:460px">
          <button class="ob-deploy" data-act="resume" style="font-size:19px">Resume
            <span class="ob-key">ESC</span>
          </button>
          <button class="ob-btn" data-act="restart">Restart Mission</button>
          <div class="ob-card" style="margin-top:14px">
            <div class="ob-cardlabel">Graphics</div>
            <div class="ob-row" data-quality></div>
          </div>
        </div>
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

  // --------------------------------------------------------------- states --

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
