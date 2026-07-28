import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import type { PlayerSystem } from '../player/Player';
import type { WeaponSystem } from '../weapons/WeaponSystem';
import type { KillstreakSystem } from '../killstreaks/Killstreaks';
import { KILLSTREAKS } from '../killstreaks/Killstreaks';
import type { AISystem } from '../ai/AISystem';
import type { AirstrikeSystem } from '../killstreaks/Airstrike';
import {
  AMBER, BAD, DIM, GOOD, INK,
  clearTracking, drawNumerals, numeralWidth, panel, rgba, setType,
} from './HudType';

interface KillfeedEntry { attacker: string; victim: string; weapon: string; headshot: boolean; ttl: number; }
interface Notification { title: string; subtitle: string; tone: string; ttl: number; maxTtl: number; }
interface DamageMark { angle: number; ttl: number; }

/** Short glyph per weapon class, drawn in the killfeed. */
const CLASS_GLYPH: Record<string, string> = {
  AR: 'assault', SMG: 'smg', LMG: 'lmg', DMR: 'dmr', SNIPER: 'sniper',
  SHOTGUN: 'shotgun', PISTOL: 'pistol', LAUNCHER: 'launcher',
};

/**
 * Heads-up display.
 *
 * Drawn to a 2D canvas overlay rather than DOM, which keeps everything on one
 * compositing layer and lets the crosshair react at frame rate.
 *
 * The layout follows the conventions players already know — ammo bottom-right,
 * health as a screen-edge state rather than a bar, compass top-centre,
 * killfeed top-right — because a shooter HUD is a language, and inventing new
 * vocabulary just costs the player reaction time.
 *
 * Three rules hold the visual language together:
 *
 *  - **One corner treatment.** Every panel is a hairline box with the
 *    top-left corner cut and an amber tick across the cut. Nothing else is
 *    ever framed.
 *  - **One type scale, set small and tracked wide.** No webfont ever loads in
 *    this build, so the character of the display has to come from setting
 *    rather than from a typeface; the numbers the player reads under pressure
 *    are vector glyphs instead of text so they are identical everywhere.
 *  - **Everything non-critical fades under the sights.** Aiming is the moment
 *    the player needs the least chrome, so the ammo block, killstreak chips,
 *    compass and objective all drop back while the reticle takes over.
 */
export class HUDSystem implements System {
  readonly name = 'hud';
  readonly order = 95;

  private canvas!: HTMLCanvasElement;
  private c2d!: CanvasRenderingContext2D;
  private ctx!: EngineContext;
  private player!: PlayerSystem;
  private weapons!: WeaponSystem;
  private killstreaks!: KillstreakSystem;
  private ai!: AISystem;
  private airstrike!: AirstrikeSystem;

  private width = 1;
  private height = 1;
  private dpr = 1;
  /** Layout scale, referenced to a 1080p display. */
  private s = 1;

  private hitmarker = 0;
  private hitmarkerLethal = false;
  private hitmarkerHeadshot = false;
  private readonly killfeed: KillfeedEntry[] = [];
  private readonly notifications: Notification[] = [];
  private readonly damageMarks: DamageMark[] = [];
  private lowAmmoPulse = 0;
  private visible = true;
  private time = 0;
  /** Rises while a strike is inbound so the countdown can slam in. */
  private strikeAlert = 0;
  private lastOrdnance = 0;
  private impactFlash = 0;

  /** Smoothed crosshair gap so it breathes with the spread. */
  private crosshairGap = 6;

  private readonly _proj = new THREE.Vector3();

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.player = ctx.get<PlayerSystem>('player')!;
    this.weapons = ctx.get<WeaponSystem>('weapons')!;
    this.killstreaks = ctx.get<KillstreakSystem>('killstreaks')!;
    this.ai = ctx.get<AISystem>('ai')!;
    this.airstrike = ctx.get<AirstrikeSystem>('airstrike')!;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:20';
    document.getElementById('ui-root')!.appendChild(this.canvas);
    this.c2d = this.canvas.getContext('2d', { alpha: true })!;
    this.resize(window.innerWidth, window.innerHeight);

    Signals.on('ui:hitmarker', ({ lethal, headshot }) => {
      this.hitmarker = 1;
      this.hitmarkerLethal = lethal;
      this.hitmarkerHeadshot = headshot;
      Signals.emit('audio:oneshot', {
        id: 'hitmarker',
        volume: headshot ? 0.6 : 0.4,
        pitch: headshot ? 1.35 : 1,
      });
    });

    Signals.on('actor:killed', ({ headshot, cause }) => {
      this.pushKill({
        attacker: 'YOU',
        victim: 'HOSTILE',
        weapon: cause === 'airstrike' || cause === 'explosion'
          ? 'launcher'
          : CLASS_GLYPH[this.weapons.def.class] ?? 'assault',
        headshot,
        ttl: 6,
      });
    });

    Signals.on('ui:killfeed', ({ attacker, victim, weaponId, headshot }) => {
      this.pushKill({ attacker, victim, weapon: weaponId, headshot, ttl: 6 });
    });

    Signals.on('ui:notify', ({ title, subtitle, tone }) => {
      // One at a time, and the newest wins.
      //
      // Stacking these was the single worst thing on the display: two
      // title-and-subtitle pairs set in caps and tracked wide need more
      // vertical room than the gap between them, so the mission banner and the
      // strike callout collided into four lines of interleaved text right as
      // the strike arrived. Anything already up is snapped into its fade-out
      // instead, which reads as one message replacing another.
      const live = this.notifications[0];
      if (live && live.ttl > 0.22) live.ttl = 0.22;
      // Short. Two lines of tracked caps in the upper third are read in well
      // under a second, and the strike they announce puts an aircraft through
      // that exact band of sky about two seconds later — a banner still up
      // when the aeroplane arrives is drawn across the thing it was pointing
      // at. The persistent state lives in the inbound strip; this is the beat.
      this.notifications.unshift({ title, subtitle: subtitle ?? '', tone, ttl: 2.6, maxTtl: 2.6 });
      if (this.notifications.length > 2) this.notifications.pop();
    });

    Signals.on('airstrike:inbound', () => {
      this.strikeAlert = 1;
    });

    Signals.on('player:damaged', ({ direction }) => {
      // Store the world-space bearing; it is converted to a screen angle each
      // frame so the indicator stays correct as the player turns.
      this.damageMarks.push({ angle: Math.atan2(direction.x, direction.z), ttl: 1.8 });
      if (this.damageMarks.length > 6) this.damageMarks.shift();
    });
  }

  /**
   * Whether the strike has actually put ordnance in the air.
   *
   * `active` alone is not enough. A strike that has never flown reads as
   * `ordnanceLeft === 0`, which is indistinguishable from one whose last store
   * has just gone in — both are "none left" — and `phase` is reachable from
   * outside this system, so it cannot be trusted either. Stores pending or a
   * release already logged separates the two, and every readout about the strike
   * is gated on the same answer so they cannot contradict each other.
   */
  private get strikeCommitted(): boolean {
    return this.airstrike.ordnanceLeft > 0 || this.airstrike.sinceRelease >= 0;
  }

  private pushKill(entry: KillfeedEntry): void {
    this.killfeed.unshift(entry);
    if (this.killfeed.length > 5) this.killfeed.pop();
  }

  resize(width: number, height: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = width;
    this.height = height;
    this.s = THREE.MathUtils.clamp(height / 1080, 0.58, 1.7);
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    if (this.c2d) this.c2d.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.canvas.style.display = v ? 'block' : 'none';
  }

  update(dt: number, ctx: EngineContext): void {
    if (!this.visible) return;
    this.time += dt;

    this.hitmarker = Math.max(0, this.hitmarker - dt * 3.4);
    this.impactFlash = Math.max(0, this.impactFlash - dt * 2.6);
    for (let i = this.killfeed.length - 1; i >= 0; i--) {
      this.killfeed[i].ttl -= dt;
      if (this.killfeed[i].ttl <= 0) this.killfeed.splice(i, 1);
    }
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      this.notifications[i].ttl -= dt;
      if (this.notifications[i].ttl <= 0) this.notifications.splice(i, 1);
    }
    for (let i = this.damageMarks.length - 1; i >= 0; i--) {
      this.damageMarks[i].ttl -= dt;
      if (this.damageMarks[i].ttl <= 0) this.damageMarks.splice(i, 1);
    }

    const strike = this.airstrike;
    // The strike stays active while the flight climbs out, which is several
    // seconds past the last bang. The banner retires with the ordnance, not
    // with the killstreak.
    // "Committed" as well as active, because the strip is a report about
    // ordnance and there has to be some.
    //
    // A strike that has never flown reads as `ordnanceLeft === 0`, which the
    // impact branch cannot tell apart from a strike whose last store has just
    // gone in: both are "none left". In the capture harness's firefight
    // scenario — where nothing calls a strike at all — that put a permanent
    // "ON TARGET, 8 of 8" across the top of the frame with every pip filled,
    // reporting a barrage that had not happened. Requiring either stores still
    // in the air or a release already logged separates the two states without
    // having to trust the phase, which is reachable from outside this system.
    const committed = this.strikeCommitted;
    const banner = strike.active && committed
      && (strike.ordnanceLeft > 0 || strike.sinceLastImpact < 0 || strike.sinceLastImpact < 2.2);
    if (banner) {
      this.strikeAlert = Math.min(1, this.strikeAlert + dt * 5);
      if (strike.ordnanceLeft < this.lastOrdnance) this.impactFlash = 1;
      this.lastOrdnance = strike.ordnanceLeft;
    } else if (!committed) {
      // Nothing has ever been called, so there is nothing to ease out of.
      //
      // Easing was the wrong default for this case and it showed. The capture
      // harness reuses one page for every scenario and does not reset this
      // system between them, so a scenario that runs after the airstrike one
      // inherits a display mid-fade — and a fade that takes two thirds of a
      // second at 1.6 per second is most of a forty-tick warmup, which is how
      // "ON TARGET, 8 of 8" ended up across the top of a firefight that had no
      // aircraft anywhere near it. Snapping to zero also makes the readout
      // robust to the value arriving out of range from anywhere else.
      this.strikeAlert = 0;
      this.lastOrdnance = 0;
    } else {
      this.strikeAlert = Math.max(0, this.strikeAlert - dt * 1.6);
      this.lastOrdnance = 0;
    }

    const w = this.weapons.active;
    this.lowAmmoPulse = w.mag <= Math.ceil(w.def.magSize * 0.25) ? this.lowAmmoPulse + dt * 4 : 0;

    this.draw(dt, ctx);
  }

  // ---------------------------------------------------------------- draw ---

  private draw(dt: number, ctx: EngineContext): void {
    const g = this.c2d;
    const W = this.width;
    const H = this.height;
    g.clearRect(0, 0, W, H);
    g.textBaseline = 'alphabetic';

    const ads = this.weapons.adsProgress;
    // Non-critical chrome recedes under the sights — recedes, not leaves.
    //
    // At 0.82 the fade was total: aiming down the sights over sand put the
    // magazine count, the health block, the compass and the killstreak chips all
    // at 0.18 against a background brighter than the ink, so the readable state
    // of the display depended on whether the player happened to be holding the
    // trigger. Shipped shooters pull the chrome back under the sights by about
    // half and no more, because the information does not stop mattering when you
    // aim; it stops being the thing you are looking at.
    const chrome = 1 - ads * 0.5;

    this.drawHealthVignette(g, W, H);
    this.drawCompass(g, W, H, chrome);
    this.drawKillfeed(g, W, chrome);
    this.drawKillstreaks(g, W, H, chrome);
    this.drawAmmo(g, W, H, chrome);
    this.drawVitals(g, W, H, chrome);
    this.drawObjective(g, W, H, chrome);
    this.drawStrikeStatus(g, W, H);
    this.drawCrosshair(g, W, H, dt, ads);
    this.drawReloadArc(g, W, H);
    this.drawHitmarker(g, W, H);
    this.drawNotifications(g, W, H);
    this.drawDamageIndicators(g, W, H);
    if (this.airstrike.targeting) this.drawTargetingOverlay(g, W, H, ctx);
    if (this.killstreaks.uavTimeLeft > 0) this.drawEnemyMarkers(g, W, H, ctx);
    if (!this.player.alive) this.drawDeathOverlay(g, W, H);
  }

  // ------------------------------------------------------------ reticle ---

  private drawCrosshair(
    g: CanvasRenderingContext2D, W: number, H: number, dt: number, ads: number,
  ): void {
    const cx = W / 2;
    const cy = H / 2;
    const s = this.s;

    const alpha = 1 - THREE.MathUtils.smoothstep(ads, 0.35, 0.75);
    if (alpha < 0.01) return;

    // Gap tracks the actual cone of fire, converted to screen pixels through
    // the projection — so the crosshair is a truthful readout, not decoration.
    const spread = this.weapons.currentSpread;
    const fovRad = THREE.MathUtils.degToRad(this.ctx.camera.fov);
    const pixelsPerRadian = H / (2 * Math.tan(fovRad / 2));
    const targetGap = Math.max(4 * s, spread * pixelsPerRadian);
    this.crosshairGap = THREE.MathUtils.damp(this.crosshairGap, targetGap, 14, dt);

    // Floors, not scales. A reticle that shrinks with the layout scale
    // disappears into the dust at low resolutions — four two-pixel ticks read
    // as screen dirt, which is exactly what the first review of this HUD saw.
    const gap = this.crosshairGap;
    const len = Math.max(10, 11 * s);
    const thickness = Math.max(2, 2.4 * s);

    g.save();
    g.globalAlpha = alpha;
    for (const [colour, width] of [
      ['rgba(0,0,0,0.75)', thickness + 2.6],
      [rgba(INK, 0.98), thickness],
    ] as Array<[string, number]>) {
      g.strokeStyle = colour;
      g.lineWidth = width;
      g.lineCap = 'butt';
      g.beginPath();
      g.moveTo(cx, cy - gap - len); g.lineTo(cx, cy - gap);
      g.moveTo(cx, cy + gap); g.lineTo(cx, cy + gap + len);
      g.moveTo(cx - gap - len, cy); g.lineTo(cx - gap, cy);
      g.moveTo(cx + gap, cy); g.lineTo(cx + gap + len, cy);
      g.stroke();
    }
    // Centre dot, ringed in black so it survives on a bright wall.
    const dot = Math.max(1.6, 1.7 * s);
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.beginPath();
    g.arc(cx, cy, dot + 1.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgba(INK, 0.98);
    g.beginPath();
    g.arc(cx, cy, dot, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  private drawReloadArc(g: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this.weapons.reloading) return;
    const s = this.s;
    const p = 1 - this.weapons.reloadTimer / this.weapons.reloadDuration;
    const rx = W / 2;
    const ry = H / 2 + 62 * s;
    const r = 17 * s;

    g.save();
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 4 * s;
    g.beginPath();
    g.arc(rx, ry, r, -Math.PI / 2, Math.PI * 1.5);
    g.stroke();
    g.strokeStyle = rgba(AMBER, 0.95);
    g.lineWidth = 3 * s;
    g.lineCap = 'butt';
    g.beginPath();
    g.arc(rx, ry, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    g.stroke();
    g.textAlign = 'center';
    setType(g, 10 * s, 600, 3 * s);
    g.fillStyle = rgba(INK, 0.8);
    g.fillText('RELOADING', rx, ry + 32 * s);
    clearTracking(g);
    g.restore();
  }

  private drawHitmarker(g: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.hitmarker <= 0.001) return;
    const cx = W / 2;
    const cy = H / 2;
    const t = this.hitmarker;
    const s = this.s;
    // Snap out then fade — the pop is what makes a hit register viscerally.
    const scale = 1 + (1 - t) * 0.5;
    const d1 = 5 * s * scale;
    const d2 = 12 * s * scale;

    g.save();
    g.globalAlpha = Math.min(1, t * 1.6);
    g.strokeStyle = this.hitmarkerLethal
      ? rgba(BAD, 0.98)
      : this.hitmarkerHeadshot
        ? rgba(AMBER, 0.98)
        : rgba(INK, 0.96);
    g.lineWidth = (this.hitmarkerLethal ? 3 : 2.2) * s;
    g.lineCap = 'round';
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.moveTo(cx + sx * d1, cy + sy * d1);
      g.lineTo(cx + sx * d2, cy + sy * d2);
    }
    g.stroke();
    g.restore();
  }

  // --------------------------------------------------------------- ammo ---

  private drawAmmo(g: CanvasRenderingContext2D, W: number, H: number, chrome: number): void {
    const w = this.weapons.active;
    const s = this.s;
    const inset = 46 * s;
    const right = W - inset;
    const base = H - inset;

    const low = w.mag <= Math.ceil(w.def.magSize * 0.25);
    const pulse = low ? 0.62 + 0.38 * Math.sin(this.lowAmmoPulse) : 1;
    const magColour = low ? rgba(BAD, pulse) : rgba(INK, 0.97);

    g.save();
    g.globalAlpha = chrome;
    this.scrim(g, W, H, 'br', chrome);

    // Magazine, then reserve to its right — the order the player reads it in.
    // Flush-righting the magazine instead put the reserve first, which turns
    // "thirty rounds, two hundred and ten spare" into "/210 30".
    const digits = 60 * s;
    const reserve = 24 * s;
    const reserveText = `/${w.reserve}`;
    const reserveWidth = numeralWidth(reserveText, reserve);
    drawNumerals(g, reserveText, right, base, reserve, {
      align: 'right',
      colour: rgba(DIM, 0.88),
      halo: 'rgba(0,0,0,0.7)',
      weight: 0.16,
    });
    // The magazine count itself does not recede with the rest of the block.
    //
    // It is the one number a player reads *while* aiming, and it is drawn as
    // white-on-halo, which is the worst thing to fade over a bright background:
    // at half alpha the fill washes out against sunlit sand before the halo
    // does, so the digits invert into hollow outlines with a ghost offset. The
    // surroundings can go quiet; the count stays a number.
    g.globalAlpha = Math.max(chrome, 0.94);
    drawNumerals(g, String(w.mag), right - reserveWidth - 9 * s, base, digits, {
      align: 'right',
      colour: magColour,
      halo: 'rgba(0,0,0,0.82)',
      weight: 0.155,
    });
    g.globalAlpha = chrome;

    // Magazine state as a segment strip: rounds remaining at a glance without
    // reading the number at all.
    const segTotal = Math.min(w.def.magSize, 30);
    const segW = 4.2 * s;
    const segGap = 2.2 * s;
    const stripW = segTotal * segW + (segTotal - 1) * segGap;
    const stripY = base + 10 * s;
    const filled = Math.round((w.mag / w.def.magSize) * segTotal);
    for (let i = 0; i < segTotal; i++) {
      const x = right - stripW + i * (segW + segGap);
      g.fillStyle = i < filled
        ? (low ? rgba(BAD, 0.85 * pulse) : rgba(AMBER, 0.9))
        : rgba(INK, 0.14);
      g.fillRect(x, stripY, segW, 3 * s);
    }

    // Weapon identity block.
    const nameY = base - 74 * s;
    g.textAlign = 'right';
    g.shadowColor = 'rgba(0,0,0,0.9)';
    g.shadowBlur = 6;
    setType(g, 15 * s, 700, 3.4 * s);
    g.fillStyle = rgba(AMBER, 0.96);
    g.fillText(w.def.name.toUpperCase(), right, nameY);
    setType(g, 11 * s, 700, 2.6 * s);
    g.fillStyle = rgba(INK, 0.7);
    g.fillText(`${w.def.class} · ${this.weapons.fireMode.toUpperCase()}`, right, nameY + 16 * s);
    g.shadowBlur = 0;
    clearTracking(g);

    g.restore();
  }

  /**
   * Corner scrim.
   *
   * Every readout in the corners has to survive being drawn over a sunlit
   * wall. A tiny amount of darkening under each block buys that contrast for
   * far less visual noise than boxing the text or outlining every glyph.
   */
  private scrim(
    g: CanvasRenderingContext2D, W: number, H: number, corner: 'bl' | 'br' | 'tl' | 'tr',
    chrome = 1,
  ): void {
    // One radius, and the rect that receives it is square and the same size.
    //
    // The gradient used to run to 340 px while being painted into a box 190 px
    // tall, so it was still a third opaque where the box ran out: three faint
    // straight edges across the frame where a soft wash should have faded to
    // nothing. Invisible while the whole scrim was also fading under the sights,
    // obvious the moment it was made to hold its weight there.
    const radius = Math.min(270, W * 0.28, H * 0.5);
    const x = corner === 'bl' || corner === 'tl' ? 0 : W - radius;
    const y = corner === 'tl' || corner === 'tr' ? 0 : H - radius;
    const fx = corner === 'bl' || corner === 'tl' ? 0 : W;
    const fy = corner === 'tl' || corner === 'tr' ? 0 : H;
    const grad = g.createRadialGradient(fx, fy, 0, fx, fy, radius);
    // Deepened once the first-person weapon started filling the bottom-right
    // quadrant: the ammo block now sits over a receiver and an optic rather
    // than over the street, and the tonal range it has to survive went from
    // "sunlit sand" to "sunlit sand or gunmetal, one frame apart".
    // Deepened again after measuring it. At 0.62 in the corner the wash had
    // decayed to about 0.42 by the time it reached the magazine numerals, which
    // over the optic's bright rail leaves a mid grey — and amber weapon type on
    // mid grey is the one part of this block that stopped being comfortable to
    // read. The gradient has to be specified for where the *type* is, not for
    // where the corner is.
    grad.addColorStop(0, 'rgba(2,4,6,0.74)');
    grad.addColorStop(0.55, 'rgba(2,4,6,0.4)');
    grad.addColorStop(1, 'rgba(2,4,6,0)');
    g.save();
    // The wash barely fades under the sights, even though everything drawn on
    // top of it does.
    //
    // Fading the two together is self-defeating: the ink loses contrast against
    // the background at exactly the rate the thing providing the contrast gives
    // up, so the block does not recede, it dissolves. Aiming over sand took the
    // magazine count to half alpha over a backing at half alpha and the number
    // stopped being readable at all. Hold the backing and the text alone can go
    // quiet, which is what "receding" means.
    g.globalAlpha = Math.max(chrome, 0.82);
    g.fillStyle = grad;
    g.fillRect(x, y, radius, radius);
    g.restore();
  }

  // -------------------------------------------------------------- health --

  private drawHealthVignette(g: CanvasRenderingContext2D, W: number, H: number): void {
    const frac = this.player.health / this.player.maxHealth;
    if (frac >= 0.999) return;
    const intensity = Math.pow(1 - frac, 1.3);
    const grad = g.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.28,
      W / 2, H / 2, Math.max(W, H) * 0.62,
    );
    grad.addColorStop(0, 'rgba(120,10,6,0)');
    grad.addColorStop(1, `rgba(112,8,5,${intensity * 0.72})`);
    g.save();
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  private drawVitals(g: CanvasRenderingContext2D, W: number, H: number, chrome: number): void {
    const s = this.s;
    const x = 46 * s;
    const base = H - 46 * s;
    const frac = THREE.MathUtils.clamp(this.player.health / this.player.maxHealth, 0, 1);

    g.save();
    g.globalAlpha = chrome;
    this.scrim(g, W, H, 'bl', chrome);
    g.textAlign = 'left';

    setType(g, 11 * s, 700, 3.2 * s);
    g.fillStyle = rgba(INK, 0.6);
    g.fillText('VITALS', x, base - 52 * s);
    clearTracking(g);

    const health = 34 * s;
    const col = frac > 0.6 ? INK : frac > 0.3 ? AMBER : BAD;
    // Held up under the sights for the same reason as the magazine count: it is
    // read mid-engagement, and a hollow outline is not a health readout.
    g.globalAlpha = Math.max(chrome, 0.94);
    drawNumerals(g, String(Math.ceil(this.player.health)), x, base, health, {
      colour: rgba(col, 0.97),
      halo: 'rgba(0,0,0,0.6)',
      weight: 0.16,
    });
    g.globalAlpha = chrome;

    // Segmented condition bar. Segments rather than a continuous fill so the
    // player can read the value without a number.
    const segs = 10;
    const segW = 13 * s;
    const segGap = 2.6 * s;
    const barY = base - 44 * s;
    for (let i = 0; i < segs; i++) {
      const on = frac > i / segs;
      g.fillStyle = on ? rgba(col, 0.86) : rgba(INK, 0.13);
      g.fillRect(x + i * (segW + segGap), barY, segW, 3.4 * s);
    }

    const stanceX = x + numeralWidth(String(Math.ceil(this.player.health)), health) + 14 * s;
    setType(g, 12 * s, 600, 2.4 * s);
    g.fillStyle = rgba(AMBER, 0.82);
    g.fillText(this.player.stance.toUpperCase(), stanceX, base - 2 * s);
    clearTracking(g);

    g.restore();
  }

  // ------------------------------------------------------------- compass --

  private drawCompass(g: CanvasRenderingContext2D, W: number, H: number, chrome: number): void {
    const s = this.s;
    const cx = W / 2;
    const y = 40 * s;
    // Narrower than it was. A tape has to be wide enough to show a useful arc
    // and no wider: at 46 per cent of the frame the ends were out past the
    // killstreak chips with nothing on them but empty grey, which read as a
    // letterbox bar rather than an instrument.
    const width = Math.min(430 * s, W * 0.38);
    const half = width / 2;
    const yaw = this.player.yaw;
    const degPerPixel = 90 / width;
    // Bearings elsewhere in the HUD come from `atan2(dx, dz)`, which puts 0 at
    // +Z. The camera looks down its own -Z, so its forward bearing is the yaw
    // turned through half a circle — without that the strip was consistent
    // with itself and 180 degrees out from every mark drawn on it.
    const playerDeg = ((yaw * 180) / Math.PI + 180) % 360;

    const project = (deg: number): number | null => {
      let delta = deg - playerDeg;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      const px = cx + delta / degPerPixel;
      return px < cx - half || px > cx + half ? null : px;
    };

    g.save();
    g.globalAlpha = chrome;

    const rule = y + 15 * s;

    // No plate. The tape is seated on the frame instead.
    //
    // Every shaped backing tried here failed the same way. A rectangle with a
    // vertical ramp stops dead at its ends, and against a bright sky that
    // vertical edge is the most visible thing in the instrument. An ellipse
    // painted through a radial ramp has no edge, but it has a *shape*: at the
    // opacity the ticks needed it photographed as a dark lens-flare smear
    // across the top of the frame, and the cardinals — which are taller than
    // the band — stuck out of the top of it. Either way the player sees the
    // backing before they see the bearing.
    //
    // What shipped instruments actually do is nothing: outline the marks, and
    // hang the whole row off the top edge of the screen, where a gradient can
    // be anchored to a border the frame already has. This one runs the full
    // width, so it has no ends to give itself away, and it does double duty
    // under the killstreak chips and the killfeed.
    const veil = g.createLinearGradient(0, 0, 0, 104 * s);
    veil.addColorStop(0, 'rgba(3,5,7,0.34)');
    veil.addColorStop(0.45, 'rgba(3,5,7,0.17)');
    veil.addColorStop(1, 'rgba(3,5,7,0)');
    g.fillStyle = veil;
    g.fillRect(0, 0, W, 104 * s);

    // One rule, along the bottom, for the ticks to stand on. Drawn twice —
    // a dark line a pixel low, then the light one over it — for the same
    // reason the ticks are keylined.
    const px1 = Math.max(1, Math.round(s));
    const shade = g.createLinearGradient(cx - half, 0, cx + half, 0);
    shade.addColorStop(0, 'rgba(3,5,7,0)');
    shade.addColorStop(0.5, 'rgba(3,5,7,0.55)');
    shade.addColorStop(1, 'rgba(3,5,7,0)');
    g.fillStyle = shade;
    g.fillRect(cx - half, rule, width, px1 * 2);
    const line = g.createLinearGradient(cx - half, 0, cx + half, 0);
    line.addColorStop(0, rgba(INK, 0));
    line.addColorStop(0.5, rgba(INK, 0.42));
    line.addColorStop(1, rgba(INK, 0));
    g.fillStyle = line;
    g.fillRect(cx - half, rule, width, px1);

    // Ticks every 15 degrees; cardinals labelled. Everything hangs from the
    // bottom rule rather than floating, so the strip has a baseline the eye
    // can follow across the fade at either end.
    for (let d = 0; d < 360; d += 15) {
      const px = project(d);
      if (px === null) continue;
      const fade = THREE.MathUtils.clamp(1 - Math.abs(px - cx) / half, 0.1, 1);
      g.globalAlpha = chrome * fade;
      const major = d % 45 === 0;
      // Sub-pixel marks disappear entirely at 1080p and below, which left the
      // strip reading as an empty grey slab with two letters on it. Whole
      // pixels, and — since there is no plate under them — a dark keyline
      // around each one, which is what lets a white tick survive a sunlit
      // wall without darkening the wall.
      const tw = major ? Math.max(2, Math.round(2.6 * s)) : Math.max(1, Math.round(1.6 * s));
      const th = (major ? 11 : 6) * s;
      const tx = Math.round(px - tw / 2);
      g.fillStyle = 'rgba(3,5,7,0.7)';
      g.fillRect(tx - 1, rule - th - 1, tw + 2, th + 2);
      g.fillStyle = major ? rgba(INK, 1) : rgba(INK, 0.78);
      g.fillRect(tx, rule - th, tw, th);
    }

    const headings: Array<[number, string]> = [
      [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
      [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
    ];
    g.textAlign = 'center';
    for (const [deg, label] of headings) {
      const px = project(deg);
      if (px === null) continue;
      const fade = THREE.MathUtils.clamp(1 - Math.abs(px - cx) / half, 0.12, 1);
      g.globalAlpha = chrome * fade;
      const cardinal = label.length === 1;
      // The cardinals are the only thing on the tape a player reads at a
      // glance, and at sixteen pixels of a system sans they were smaller than
      // the numerals in the heading box underneath them — the label looked
      // like a footnote to its own instrument.
      setType(g, (cardinal ? 21 : 13) * s, 700, (cardinal ? 1 : 1.8) * s);
      g.fillStyle = cardinal ? rgba(AMBER, 1) : rgba(INK, 0.72);
      g.shadowColor = 'rgba(0,0,0,0.8)';
      g.shadowBlur = 5 * s;
      g.fillText(label, px, rule - 15 * s);
      g.shadowBlur = 0;
    }
    clearTracking(g);
    g.globalAlpha = chrome;

    // Hostile bearings. Recon paints every known contact; a hit paints the
    // bearing it came from for as long as the directional indicator lives.
    // Both are the same mark, because to the player they mean the same thing.
    const marks: Array<[number, number]> = [];
    if (this.killstreaks.uavTimeLeft > 0) {
      const from = this.ctx.camera.position;
      for (const pos of this.ai.enemyPositions) {
        const bearing = ((Math.atan2(pos.x - from.x, pos.z - from.z) * 180) / Math.PI + 360) % 360;
        marks.push([bearing, 0.85]);
      }
    }
    for (const mark of this.damageMarks) {
      const bearing = ((mark.angle * 180) / Math.PI + 180 + 360) % 360;
      marks.push([bearing, THREE.MathUtils.clamp(mark.ttl / 1.8, 0, 1)]);
    }
    // Marks stand on the rule, inside the tick row and under the letters, so
    // the tape has one row of marks instead of a fringe of pips floating off
    // the top edge of a plate that has no top edge any more.
    const pip = (px: number, colour: string, filled: boolean): void => {
      const h = 12 * s;
      g.beginPath();
      g.moveTo(px, rule - h);
      g.lineTo(px - 4.5 * s, rule);
      g.lineTo(px + 4.5 * s, rule);
      g.closePath();
      if (filled) {
        g.fillStyle = colour;
        g.fill();
      }
      g.strokeStyle = 'rgba(4,6,8,0.85)';
      g.lineWidth = 1;
      g.stroke();
      if (!filled) {
        g.strokeStyle = colour;
        g.lineWidth = 1.8;
        g.stroke();
      }
    };
    for (const [bearing, alpha] of marks) {
      const px = project(bearing);
      if (px === null) continue;
      g.globalAlpha = chrome * alpha;
      pip(px, rgba(BAD, 0.98), true);
    }

    // A strike in progress gets its own bearing pip so the player can find it.
    if (this.airstrike.active) {
      const from = this.ctx.camera.position;
      const t = this.airstrike.target;
      const bearing = ((Math.atan2(t.x - from.x, t.z - from.z) * 180) / Math.PI + 360) % 360;
      const px = project(bearing);
      if (px !== null) {
        g.globalAlpha = chrome;
        pip(px, rgba(AMBER, 1), false);
      }
    }

    // Heading box, hung off the rule by a tab in the shape of the index.
    //
    // The index used to be a separate arrow with sky showing between it and
    // the numerals, and the two of them plus the tape read as three widgets
    // that happened to be stacked. One shape that starts at the rule and ends
    // at the box is the same information and one instrument.
    g.globalAlpha = chrome;
    const deg = (Math.round(playerDeg) % 360).toString().padStart(3, '0');
    const degSize = 14 * s;
    const boxW = numeralWidth(deg, degSize) + 20 * s;
    const boxH = 20 * s;
    const boxY = rule + 9 * s;
    g.fillStyle = rgba(AMBER, 1);
    g.beginPath();
    g.moveTo(cx - 8 * s, boxY + 1);
    g.lineTo(cx + 8 * s, boxY + 1);
    g.lineTo(cx, rule);
    g.closePath();
    g.fill();
    panel(g, cx - boxW / 2, boxY, boxW, boxH, {
      fill: 0.78,
      hairline: 0.16,
      cut: 5 * s,
    });
    drawNumerals(g, deg, cx, boxY + boxH - 3 * s, degSize, {
      align: 'center',
      colour: rgba(INK, 0.96),
      weight: 0.17,
    });

    g.restore();
  }

  // ------------------------------------------------------------ killfeed --

  private drawKillfeed(g: CanvasRenderingContext2D, W: number, chrome: number): void {
    if (this.killfeed.length === 0) return;
    const s = this.s;
    const right = W - 46 * s;
    let y = 96 * s;

    g.save();
    g.globalAlpha = chrome;
    for (const entry of this.killfeed) {
      const alpha = THREE.MathUtils.clamp(entry.ttl / 0.6, 0, 1);
      g.globalAlpha = chrome * alpha;

      setType(g, 13 * s, 600, 1.8 * s);
      const attackerW = g.measureText(entry.attacker).width;
      const victimW = g.measureText(entry.victim).width;
      const glyphW = 30 * s;
      const rowW = attackerW + glyphW + victimW + 30 * s;
      const rowH = 24 * s;

      panel(g, right - rowW, y - rowH + 5 * s, rowW, rowH, {
        fill: 0.55,
        hairline: 0.1,
        cut: 7 * s,
        accent: entry.headshot ? rgba(AMBER, 0.9) : rgba(INK, 0.28),
      });

      let x = right - rowW + 12 * s;
      g.textAlign = 'left';
      g.fillStyle = rgba(GOOD, 0.92);
      g.fillText(entry.attacker, x, y);
      x += attackerW + 8 * s;

      this.drawWeaponGlyph(g, entry.weapon, x, y - 5 * s, 20 * s,
        entry.headshot ? rgba(AMBER, 0.95) : rgba(INK, 0.8));
      x += glyphW;

      g.fillStyle = rgba(BAD, 0.9);
      g.fillText(entry.victim, x, y);

      clearTracking(g);
      y += 29 * s;
    }
    g.restore();
  }

  /**
   * Weapon glyphs, drawn as a few strokes rather than as an icon font. All of
   * them share a receiver-plus-barrel skeleton so the row reads as a
   * consistent set, and only the silhouette above the line changes.
   */
  private drawWeaponGlyph(
    g: CanvasRenderingContext2D, kind: string, x: number, y: number, w: number, colour: string,
  ): void {
    const u = w / 20;
    g.save();
    g.translate(x, y);
    g.strokeStyle = colour;
    g.fillStyle = colour;
    g.lineWidth = Math.max(1, 1.5 * u);
    g.lineCap = 'butt';
    g.lineJoin = 'miter';
    g.beginPath();
    switch (kind) {
      case 'pistol':
        g.moveTo(3 * u, 0); g.lineTo(15 * u, 0);
        g.moveTo(6 * u, 0); g.lineTo(4 * u, 6 * u);
        break;
      case 'shotgun':
        g.moveTo(0, 0); g.lineTo(20 * u, 0);
        g.moveTo(0, 2.2 * u); g.lineTo(13 * u, 2.2 * u);
        g.moveTo(7 * u, 0); g.lineTo(5 * u, 6 * u);
        break;
      case 'sniper':
      case 'dmr':
        g.moveTo(0, 0); g.lineTo(20 * u, 0);
        g.moveTo(6 * u, -4 * u); g.lineTo(13 * u, -4 * u);
        g.moveTo(8 * u, -4 * u); g.lineTo(8 * u, 0);
        g.moveTo(6 * u, 0); g.lineTo(3 * u, 6 * u);
        break;
      case 'lmg':
        g.moveTo(0, 0); g.lineTo(20 * u, 0);
        g.moveTo(5 * u, 0); g.lineTo(5 * u, 4.5 * u); g.lineTo(11 * u, 4.5 * u); g.lineTo(11 * u, 0);
        g.moveTo(4 * u, 0); g.lineTo(1.5 * u, 6 * u);
        break;
      case 'launcher':
        g.moveTo(0, -1.5 * u); g.lineTo(19 * u, -1.5 * u);
        g.moveTo(0, 2 * u); g.lineTo(19 * u, 2 * u);
        g.moveTo(19 * u, -1.5 * u); g.lineTo(20 * u, 0.25 * u); g.lineTo(19 * u, 2 * u);
        g.moveTo(7 * u, 2 * u); g.lineTo(5 * u, 7 * u);
        break;
      case 'smg':
        g.moveTo(2 * u, 0); g.lineTo(17 * u, 0);
        g.moveTo(7 * u, 0); g.lineTo(6 * u, 6.5 * u);
        g.moveTo(11 * u, 0); g.lineTo(11 * u, -3 * u);
        break;
      default: // assault rifle
        g.moveTo(0, 0); g.lineTo(20 * u, 0);
        g.moveTo(8 * u, 0); g.lineTo(6.5 * u, 6.5 * u);
        g.moveTo(11 * u, 0); g.lineTo(11 * u, -3.2 * u); g.lineTo(14 * u, -3.2 * u);
        break;
    }
    g.stroke();
    g.restore();
  }

  // --------------------------------------------------------- killstreaks --

  private drawKillstreaks(
    g: CanvasRenderingContext2D, W: number, H: number, chrome: number,
  ): void {
    const ks = this.killstreaks;
    const s = this.s;
    const x = 46 * s;
    let y = 96 * s;

    g.save();
    g.globalAlpha = chrome;
    this.scrim(g, W, H, 'tl', chrome);
    g.textAlign = 'left';

    setType(g, 11 * s, 600, 3.2 * s);
    g.fillStyle = rgba(DIM, 0.85);
    g.fillText('STREAK', x, y - 20 * s);
    clearTracking(g);
    drawNumerals(g, String(ks.streak), x + 62 * s, y - 12 * s, 20 * s, {
      colour: rgba(INK, 0.95),
      halo: 'rgba(0,0,0,0.5)',
      weight: 0.17,
    });

    const chipW = 206 * s;
    const chipH = 25 * s;
    for (const def of KILLSTREAKS) {
      const count = ks.available.get(def.id) ?? 0;
      const ready = count > 0;
      const remaining = Math.max(0, def.cost - ks.streak);
      const progress = ready ? 1 : THREE.MathUtils.clamp(ks.streak / def.cost, 0, 1);
      // A streak that is currently running reports its own clock, which is
      // the only thing the player wants from it once it is up. The airstrike has
      // to be committed as well as active, on the same test the inbound strip
      // uses — otherwise the two disagree, and a chip reading "IMPACT" beside a
      // strip that has retired is worse than either alone.
      const running = (def.id === 'uav' && ks.uavTimeLeft > 0)
        || (def.id === 'airstrike' && this.airstrike.active && this.strikeCommitted);
      const lit = ready || running;

      // An unearned streak is quiet, not absent. At the alpha this started on
      // the locked chips vanished completely against a bright sky, which loses
      // the one thing the column is for: showing what the next reward is and
      // how far off it is.
      // The chip's backing keeps most of its weight under the sights for the
      // same reason the corner washes do — see `scrim`. Only the type recedes.
      g.globalAlpha = Math.max(chrome, 0.82) * (lit ? 1 : 0.74);
      panel(g, x, y, chipW, chipH, {
        fill: lit ? 0.62 : 0.56,
        hairline: lit ? 0.16 : 0.1,
        cut: 8 * s,
        accent: lit ? rgba(AMBER, 0.95) : rgba(INK, 0.2),
        scanlines: lit,
      });
      g.globalAlpha = chrome * (lit ? 1 : 0.74);

      // Progress toward the streak, as a fill behind the label.
      if (!ready && progress > 0) {
        g.save();
        g.beginPath();
        g.rect(x, y, chipW * progress, chipH);
        g.clip();
        g.fillStyle = rgba(AMBER, 0.1);
        g.fillRect(x, y, chipW, chipH);
        g.restore();
      }
      g.fillStyle = lit ? rgba(AMBER, 0.95) : rgba(INK, 0.22);
      g.fillRect(x, y, 2.4 * s, chipH);

      setType(g, 11 * s, 700, 1.6 * s);
      g.fillStyle = rgba(AMBER, lit ? 0.95 : 0.5);
      g.fillText(String(def.slot + 3), x + 12 * s, y + 17 * s);
      setType(g, 11 * s, 600, 1.8 * s);
      g.fillStyle = lit ? rgba(INK, 0.95) : rgba(DIM, 0.95);
      g.fillText(def.name, x + 26 * s, y + 17 * s);

      // Status sits in its own right-hand column with a hairline divider, so
      // a long streak name and a long status can never collide.
      const statusX = x + chipW - 8 * s;
      const dividerX = x + chipW - 54 * s;
      g.fillStyle = rgba(INK, lit ? 0.18 : 0.1);
      g.fillRect(dividerX, y + 5 * s, 1, chipH - 10 * s);
      g.textAlign = 'right';
      setType(g, 10 * s, 700, 1.4 * s);
      if (def.id === 'airstrike' && running) {
        // Same two states, and the same two colours, as the inbound strip at
        // the top of the frame. The chip used to be red for the whole run
        // while the strip was still amber, so the display was reporting two
        // different urgencies about one aeroplane.
        // Three states, and the third one matters: the strike stays "running"
        // for several seconds after the last bang while the flight climbs out,
        // and the chip sat on a red IMPACT through all of it while the strip
        // above it had already gone amber and said STRIKE COMPLETE.
        const done = this.airstrike.ordnanceLeft === 0 && this.airstrike.sinceLastImpact >= 0;
        const hot = !done && this.airstrike.inboundSeconds <= 0.05;
        g.fillStyle = rgba(hot ? BAD : AMBER, 0.95);
        g.fillText(done ? 'CLEAR' : hot ? 'IMPACT' : 'ON RUN', statusX, y + 17 * s);
      } else if (running) {
        g.fillStyle = rgba(GOOD, 0.95);
        g.fillText(`${Math.ceil(ks.uavTimeLeft)}S`, statusX, y + 17 * s);
      } else if (ready && count > 1) {
        g.fillStyle = rgba(AMBER, 0.92);
        g.fillText(`x${count}`, statusX, y + 17 * s);
      } else if (ready) {
        g.fillStyle = rgba(GOOD, 0.9);
        g.fillText('READY', statusX, y + 17 * s);
      } else {
        // The kills-to-go count is the reason the locked chips are on screen
        // at all, and at 0.7 behind the 0.74 the whole chip is dimmed to it
        // came out at half strength — the one number in the column a player
        // is actually working toward was the faintest thing in it.
        g.fillStyle = rgba(DIM, 1);
        g.fillText(`+${remaining}`, statusX, y + 17 * s);
      }
      g.textAlign = 'left';
      clearTracking(g);

      y += chipH + 6 * s;
    }
    g.restore();
  }

  // ------------------------------------------------------ inbound strike --

  /**
   * Inbound-strike strip.
   *
   * The single highest-value piece of information the HUD can show during a
   * killstreak: how long until the ordnance arrives. It slams in on the radio
   * call, counts down in the vector numerals, and switches to a live impact
   * tally as the stick walks through.
   *
   * One line, not a card. The aircraft come down the run-in bearing, so if the
   * player is looking at the target the flight enters frame high and dead
   * centre — precisely where a two-row panel sits. Everything is on one row
   * hugging the compass so the sky below it stays clear.
   */
  private drawStrikeStatus(g: CanvasRenderingContext2D, W: number, H: number): void {
    const alert = THREE.MathUtils.clamp(this.strikeAlert, 0, 1);
    if (alert < 0.01) return;
    const strike = this.airstrike;
    const s = this.s;
    const cx = W / 2;
    // Slams down from above on arrival, then holds. The travel is kept short
    // because the strip slides through the compass block on its way in, and
    // the numeric heading sits at the bottom of that block.
    const slide = (1 - Math.pow(alert, 0.4)) * 16 * s;
    const y = 112 * s - slide;
    const w = 348 * s;
    const h = 34 * s;
    const x = cx - w / 2;

    const impacting = strike.inboundSeconds <= 0.05;
    const complete = strike.ordnanceLeft === 0 && strike.sinceLastImpact >= 0;
    // Amber for the finished strike, not green. Green is the UAV's colour and
    // it appeared here for one second beside a row of red pips, which put
    // three accents in a strip thirty pixels tall — the strike is over, and
    // "over" is not a different kind of information from "inbound".
    const accent = impacting && !complete ? BAD : AMBER;
    // Urgency in the last two seconds: the frame pulses, so the player feels
    // the clock without having to read it.
    const urgency = impacting
      ? 0
      : THREE.MathUtils.clamp(1 - strike.inboundSeconds / 2, 0, 1)
        * (0.5 + 0.5 * Math.sin(this.time * 11));

    g.save();
    g.globalAlpha = alert;
    panel(g, x, y, w, h, {
      fill: 0.84,
      hairline: 0.2 + urgency * 0.5,
      cut: 9 * s,
      accent: rgba(accent, 0.95),
      scanlines: true,
    });
    if (urgency > 0.01) {
      g.save();
      g.globalAlpha = alert * urgency * 0.14;
      g.fillStyle = rgba(AMBER, 1);
      g.fillRect(x, y, w, h);
      g.restore();
    }
    // Impact flash, *behind* the readout.
    //
    // This used to be painted last, over the top of everything. Stores land
    // every tenth of a second, so the flash never got a chance to decay and the
    // strip spent the whole impact sequence under a third of a stop of flat
    // red — which over a sunlit street turned a panel of white-on-charcoal
    // instrumentation into muddy brown with red text on it. The one moment the
    // strip has something urgent to say was the one moment it could not be read.
    if (this.impactFlash > 0) {
      g.save();
      g.globalAlpha = alert * this.impactFlash * 0.2;
      g.fillStyle = rgba(BAD, 1);
      g.fillRect(x, y, w, h);
      g.restore();
    }

    // Warning hatching down the left edge while ordnance is still in the air.
    if (!complete) {
      g.save();
      g.beginPath();
      g.rect(x + 3 * s, y + 5 * s, 6 * s, h - 10 * s);
      g.clip();
      g.strokeStyle = rgba(accent, 0.8);
      g.lineWidth = 2 * s;
      const drift = (this.time * 22 * s) % (9 * s);
      for (let i = -2; i < h / (9 * s) + 2; i++) {
        const oy = y + 4 * s + i * 9 * s + drift;
        g.beginPath();
        g.moveTo(x + 1 * s, oy);
        g.lineTo(x + 11 * s, oy - 10 * s);
        g.stroke();
      }
      g.restore();
    }

    // Laid out by measurement, left to right. Fixed offsets put the countdown
    // on top of its own label the moment the label changed length.
    const mid = y + 22 * s;
    // "STORES AWAY" holds the label for a beat after the first store leaves the
    // rack. It is the only report of the release the player can get — see
    // `AirstrikeSystem.sinceRelease` — and it costs no new real estate, because
    // the countdown it sits beside is still the thing being counted.
    const away = strike.sinceRelease >= 0 && strike.sinceRelease < 1.1;
    const label = complete
      ? 'STRIKE COMPLETE'
      : impacting ? 'ON TARGET' : away ? 'STORES AWAY' : 'CAS INBOUND';
    const labelX = x + 18 * s;
    g.textAlign = 'left';
    setType(g, 9.5 * s, 700, 2.6 * s);
    // The label goes white once rounds are landing rather than taking the
    // accent. Red type on a panel with a red flash behind it is the same hue
    // twice: the flash exists to be noticed from the corner of the eye, and it
    // was cancelling out the four words explaining what had been noticed. State
    // is carried by the flash, the chamfer and the pips; the words stay
    // readable. Going white-hot on impact reads as an escalation besides.
    g.fillStyle = impacting && !complete ? rgba(INK, 0.98) : rgba(accent, 0.95);
    g.fillText(label, labelX, mid);
    const labelW = g.measureText(label).width;
    clearTracking(g);
    let cursor = labelX + labelW + 14 * s;

    if (impacting) {
      // Round pips: filled as each store detonates.
      const total = strike.ordnanceTotal;
      const hit = total - strike.ordnanceLeft;
      for (let i = 0; i < total; i++) {
        g.fillStyle = i < hit ? rgba(INK, 0.96) : rgba(INK, 0.2);
        g.beginPath();
        g.arc(cursor + i * 13 * s, mid - 4 * s, 3.8 * s, 0, Math.PI * 2);
        g.fill();
      }
      g.textAlign = 'right';
      setType(g, 9 * s, 700, 2.2 * s);
      g.fillStyle = rgba(INK, 0.86);
      g.fillText(`${hit} / ${total}`, x + w - 14 * s, mid);
      clearTracking(g);
    } else {
      const secs = Math.max(0, strike.inboundSeconds);
      const text = secs.toFixed(1).padStart(4, '0');
      const numH = 20 * s;
      drawNumerals(g, text, cursor, mid + 3 * s, numH, {
        colour: rgba(INK, 0.98),
        halo: 'rgba(0,0,0,0.6)',
        weight: 0.17,
      });
      cursor += numeralWidth(text, numH) + 5 * s;
      g.textAlign = 'left';
      setType(g, 8.5 * s, 700, 1.6 * s);
      g.fillStyle = rgba(DIM, 0.85);
      g.fillText('S', cursor, mid);
      clearTracking(g);

      // The bearing the flight will appear on — the one thing that tells the
      // player where to look. Right-aligned as a measured block so the label
      // and its digits cannot run into each other.
      const runIn = Math.round(((strike.heading * 180) / Math.PI + 360) % 360);
      const digits = String(runIn).padStart(3, '0');
      const digitsW = numeralWidth(digits, 12 * s);
      drawNumerals(g, digits, x + w - 14 * s, mid, 12 * s, {
        align: 'right', colour: rgba(AMBER, 0.95), weight: 0.19,
      });
      g.textAlign = 'right';
      setType(g, 8.5 * s, 700, 1.6 * s);
      g.fillStyle = rgba(DIM, 0.72);
      g.fillText('AXIS', x + w - 20 * s - digitsW, mid);
      clearTracking(g);

      // Time bar across the foot of the strip, inset clear of the chamfer.
      const barY = y + h - 4 * s;
      const barX = x + 10 * s;
      const barW = w - 20 * s;
      g.fillStyle = rgba(INK, 0.12);
      g.fillRect(barX, barY, barW, 1.6 * s);
      g.fillStyle = rgba(accent, 0.9);
      g.fillRect(barX, barY, barW * strike.inboundProgress, 1.6 * s);
    }
    g.restore();

    // Off-screen indicator: if the impact point is not in view, put a chevron
    // at the edge of the frame pointing at it. Nothing is more disorienting
    // than a countdown to something you cannot see.
    this.drawStrikeChevron(g, W, H, alert);
  }

  private drawStrikeChevron(
    g: CanvasRenderingContext2D, W: number, H: number, alert: number,
  ): void {
    const strike = this.airstrike;
    const cam = this.ctx.camera;
    const s = this.s;
    // Front/behind is decided in view space, not from the projected depth.
    //
    // `Vector3.project` divides by w, and for a point behind the eye w is
    // negative, so the result is a reflection of the true position with a depth
    // that can land anywhere — including inside the unit cube. Testing `z < 1`
    // therefore reported a target *behind the player* as being on screen, and
    // the indicator drew a designation diamond next to the reticle pointing at
    // nothing while the actual impact happened over the player's shoulder. In
    // view space the camera looks down −Z, so the sign of z is the whole test.
    this._proj.copy(strike.target).setY(strike.target.y + 1.5)
      .applyMatrix4(cam.matrixWorldInverse);
    const inFront = this._proj.z < 0;
    this._proj.applyMatrix4(cam.projectionMatrix);
    const sx = (this._proj.x * 0.5 + 0.5) * W;
    const sy = (-this._proj.y * 0.5 + 0.5) * H;
    const margin = 74 * s;
    const onScreen = inFront && sx > margin && sx < W - margin && sy > margin && sy < H - margin;

    g.save();
    g.globalAlpha = alert;
    if (onScreen) {
      // Diamond over the aim point, plus a tick per predicted impact.
      g.strokeStyle = rgba(AMBER, 0.9);
      g.lineWidth = 1.8 * s;
      const r = 11 * s;
      g.beginPath();
      g.moveTo(sx, sy - r); g.lineTo(sx + r, sy);
      g.lineTo(sx, sy + r); g.lineTo(sx - r, sy);
      g.closePath();
      g.stroke();
      g.fillStyle = rgba(AMBER, 0.85);
      g.fillRect(sx - 1, sy - 1, 2, 2);
      for (const p of strike.aimPoints) {
        this._proj.copy(p).project(cam);
        if (this._proj.z > 1) continue;
        const px = (this._proj.x * 0.5 + 0.5) * W;
        const py = (-this._proj.y * 0.5 + 0.5) * H;
        g.globalAlpha = alert * 0.4;
        g.strokeStyle = rgba(AMBER, 0.8);
        g.lineWidth = 1.2 * s;
        g.beginPath();
        g.arc(px, py, 4 * s, 0, Math.PI * 2);
        g.stroke();
      }
    } else {
      // Clamp the direction to the frame edge.
      let dx = sx - W / 2;
      let dy = sy - H / 2;
      if (!inFront) { dx = -dx; dy = -dy; }
      const len = Math.max(1e-3, Math.hypot(dx, dy));
      dx /= len; dy /= len;
      const rx = W / 2 - margin;
      const ry = H / 2 - margin;
      const scale = Math.min(Math.abs(rx / (dx || 1e-3)), Math.abs(ry / (dy || 1e-3)));
      const ex = W / 2 + dx * scale;
      const ey = H / 2 + dy * scale;
      const a = Math.atan2(dy, dx);

      // This is the whole cue, so it is built like one.
      //
      // It used to be a flat amber triangle thirteen pixels long. Photographed
      // against a sunlit street it was smaller than the rivets on the weapon
      // and had no keyline, so the one element on the display that answers
      // "where do I look" was the least visible thing on it — and it carried
      // no reading, so a player who did find it still had no idea whether the
      // thing behind them was four seconds out or about to land.
      const secs = Math.max(0, strike.inboundSeconds);
      const impacting = strike.inboundSeconds <= 0.05;
      const urgency = impacting
        ? 1
        : THREE.MathUtils.clamp(1 - secs / 2.5, 0, 1) * (0.5 + 0.5 * Math.sin(this.time * 11));
      const colour = impacting ? BAD : AMBER;

      g.save();
      g.translate(ex, ey);
      g.rotate(a);
      // Solid head, then two trailing chevrons: an arrow that is going
      // somewhere rather than a triangle that is sitting there.
      g.lineJoin = 'round';
      const head = new Path2D();
      head.moveTo(21 * s, 0);
      head.lineTo(-3 * s, -13 * s);
      head.lineTo(2 * s, 0);
      head.lineTo(-3 * s, 13 * s);
      head.closePath();
      g.strokeStyle = 'rgba(3,5,7,0.9)';
      g.lineWidth = 3.5 * s;
      g.stroke(head);
      g.fillStyle = rgba(colour, 0.95);
      g.fill(head);
      for (let i = 0; i < 2; i++) {
        const ox = -(10 + i * 8) * s;
        g.globalAlpha = alert * (0.5 - i * 0.18) * (0.55 + 0.45 * urgency);
        g.strokeStyle = rgba(colour, 1);
        g.lineWidth = 2.2 * s;
        g.beginPath();
        g.moveTo(ox - 5 * s, -9 * s);
        g.lineTo(ox + 3 * s, 0);
        g.lineTo(ox - 5 * s, 9 * s);
        g.stroke();
      }
      g.restore();

      // The reading, set upright and pushed back toward the middle of the frame
      // so it cannot hang off the edge whichever way the arrow points.
      //
      // Which reading depends on whether there is still a clock to run. Once
      // the first store is down `inboundSeconds` is pinned at zero, and a box
      // reading "0.0" next to an arrow is not a countdown — it is a broken one.
      // The tally is the honest answer to "what is happening behind me".
      g.globalAlpha = alert;
      const text = impacting
        ? `${strike.ordnanceTotal - strike.ordnanceLeft}/${strike.ordnanceTotal}`
        : secs.toFixed(1);
      const size = 15 * s;
      const lx = ex - dx * 34 * s;
      const ly = ey - dy * 34 * s;
      const boxW = numeralWidth(text, size) + 16 * s;
      const boxH = 22 * s;
      panel(g, lx - boxW / 2, ly - boxH / 2, boxW, boxH, {
        fill: 0.8,
        hairline: 0.18 + urgency * 0.5,
        cut: 5 * s,
        accent: rgba(colour, 0.95),
      });
      drawNumerals(g, text, lx, ly + boxH / 2 - 4 * s, size, {
        align: 'center', colour: rgba(INK, 0.97), weight: 0.17,
      });
    }
    g.restore();
  }

  // -------------------------------------------------------- notifications --

  private drawNotifications(g: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.notifications.length === 0) return;
    const s = this.s;
    g.save();
    g.textAlign = 'center';
    // Above the reticle, in the band between the inbound strip and the aiming
    // area. Every message occupies the same line and they cross-dissolve, so
    // the block never grows and never has to be laid out around itself.
    //
    // It spent a while below the reticle on the theory that the lower half of
    // the frame is emptier. It is not: the first-person weapon fills the whole
    // bottom-right quadrant and its barrel runs up through the centre, so
    // "DANGER CLOSE" was being set in red over a black receiver at the one
    // moment it matters. Up here the background is sky or distant street, the
    // eye is already on the reticle, and nothing else claims the space.
    //
    // Raised from 0.31 to 0.22 of frame height after tracking where the strike
    // aircraft actually are. They run in at forty metres and cross the frame
    // between 0.28 and 0.42 of the way down it, so a two-line plate at 0.31 sat
    // squarely on top of the pair for the whole ingress — the one beat in the
    // game that consists entirely of looking for two small aeroplanes, played
    // behind a caption. At 0.22 it tucks under the inbound strip instead and the
    // corridor is clear.
    const y = H * 0.22;
    for (const n of this.notifications) {
      const t = n.ttl / n.maxTtl;
      // Snaps in, eases out. These are warnings; a four-hundred-millisecond
      // dissolve on the way in means the line reads at half strength for the
      // whole of the beat it exists to serve.
      const alpha = THREE.MathUtils.clamp(t * 3, 0, 1)
        * THREE.MathUtils.clamp((1 - t) * 22, 0, 1);
      if (alpha < 0.004) continue;
      g.globalAlpha = alpha;
      const col = n.tone === 'good' ? AMBER : n.tone === 'bad' ? BAD : INK;

      setType(g, 21 * s, 700, 5.5 * s);
      const tw = g.measureText(n.title).width;

      // A soft plate behind the line. Amber caps on a sunlit wall are
      // unreadable without one, and a hairline box here would fight the
      // panels; a blurred slab reads as part of the frame instead.
      //
      // The dark has to hold across the whole of the text, not just under its
      // middle. A single centre stop puts peak opacity on one column of pixels
      // and is already two thirds transparent by the ends of the words, which
      // over a black rifle receiver left "DANGER CLOSE" invisible at exactly
      // the moment it was the most important thing on the screen.
      const plateW = tw + 170 * s;
      const plateH = (n.subtitle ? 50 : 34) * s;
      const plateX = W / 2 - plateW / 2;
      const inset = (tw / 2 + 30 * s) / plateW;
      const plate = g.createLinearGradient(plateX, 0, plateX + plateW, 0);
      plate.addColorStop(0, 'rgba(3,5,7,0)');
      plate.addColorStop(0.5 - inset, `rgba(3,5,7,${0.88 * alpha})`);
      plate.addColorStop(0.5 + inset, `rgba(3,5,7,${0.88 * alpha})`);
      plate.addColorStop(1, 'rgba(3,5,7,0)');
      g.globalAlpha = 1;
      g.fillStyle = plate;
      g.fillRect(plateX, y - 18 * s, plateW, plateH);
      // Hairlines top and bottom, fading with the plate, so the block has an
      // edge and reads as part of the display rather than a smudge.
      const edge = g.createLinearGradient(plateX, 0, plateX + plateW, 0);
      edge.addColorStop(0, rgba(col, 0));
      edge.addColorStop(0.5, rgba(col, 0.3 * alpha));
      edge.addColorStop(1, rgba(col, 0));
      g.fillStyle = edge;
      g.fillRect(plateX, y - 18 * s, plateW, 1);
      g.fillRect(plateX, y - 18 * s + plateH - 1, plateW, 1);
      g.globalAlpha = alpha;

      // Rules either side rather than a box: it keeps the centre of the screen
      // clear while still framing the message.
      const ruleY = y - 7 * s;
      const ruleW = 46 * s;
      g.fillStyle = rgba(col, 0.5);
      g.fillRect(W / 2 - tw / 2 - ruleW - 14 * s, ruleY, ruleW, 1);
      g.fillRect(W / 2 + tw / 2 + 14 * s, ruleY, ruleW, 1);

      g.fillStyle = rgba(col, 1);
      g.shadowColor = 'rgba(0,0,0,0.9)';
      g.shadowBlur = 10;
      g.fillText(n.title, W / 2, y);
      g.shadowBlur = 0;

      if (n.subtitle) {
        setType(g, 11 * s, 600, 3 * s);
        g.fillStyle = rgba(DIM, 0.95);
        g.shadowColor = 'rgba(0,0,0,0.9)';
        g.shadowBlur = 8;
        g.fillText(n.subtitle, W / 2, y + 18 * s);
        g.shadowBlur = 0;
      }
      clearTracking(g);
    }
    g.restore();
  }

  // -------------------------------------------------------------- damage --

  private drawDamageIndicators(g: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.damageMarks.length === 0) return;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * 0.19;

    g.save();
    for (const mark of this.damageMarks) {
      let rel = mark.angle - this.player.yaw;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;

      const t = THREE.MathUtils.clamp(mark.ttl / 1.8, 0, 1);
      // Expands slightly as it fades, which reads as an impulse rather than a
      // static arc sitting on the screen.
      const r = radius * (1 + (1 - t) * 0.12);
      g.globalAlpha = Math.pow(t, 0.7) * 0.9;
      const a0 = -Math.PI / 2 + rel - 0.26;
      const a1 = -Math.PI / 2 + rel + 0.26;
      const grad = g.createRadialGradient(cx, cy, r * 0.82, cx, cy, r * 1.16);
      grad.addColorStop(0, rgba(BAD, 0));
      grad.addColorStop(1, rgba(BAD, 0.9));
      g.strokeStyle = grad;
      g.lineWidth = 5 * this.s;
      g.lineCap = 'butt';
      g.beginPath();
      g.arc(cx, cy, r, a0, a1);
      g.stroke();
    }
    g.restore();
  }

  // ----------------------------------------------------------- objective --

  private drawObjective(
    g: CanvasRenderingContext2D, W: number, H: number, chrome: number,
  ): void {
    const s = this.s;
    g.save();
    g.globalAlpha = chrome;
    g.textAlign = 'center';
    setType(g, 11.5 * s, 700, 3.6 * s);
    const text = `HOSTILES ${this.ai.aliveCount}   ·   ELIMINATED ${this.killstreaks.kills}`;
    const y = H - 30 * s;

    // The quietest line on the display, and for a long time the only one with
    // nothing behind it — which over sunlit sand did not make it quiet, it
    // made it absent. A short scrim rather than a panel: it should still
    // recede, just legibly, and a hairline box down here would fight the ammo
    // block sitting a few pixels to the right of it.
    // Spread over 1.3× the text rather than 2×: a gradient that wide has only
    // reached about a third of its stated opacity by the time it gets under the
    // first letter, which is a scrim on the empty frame either side of the line
    // and not on the line.
    const tw = g.measureText(text).width;
    const half = tw * 0.68;
    const plate = g.createLinearGradient(W / 2 - half, 0, W / 2 + half, 0);
    plate.addColorStop(0, 'rgba(3,5,7,0)');
    plate.addColorStop(0.5, 'rgba(3,5,7,0.72)');
    plate.addColorStop(1, 'rgba(3,5,7,0)');
    g.fillStyle = plate;
    g.fillRect(W / 2 - half, y - 13 * s, half * 2, 20 * s);

    g.shadowColor = 'rgba(0,0,0,0.85)';
    g.shadowBlur = 5 * s;
    g.fillStyle = rgba(DIM, 0.95);
    g.fillText(text, W / 2, y);
    g.shadowBlur = 0;
    clearTracking(g);
    g.restore();
  }

  // ------------------------------------------------------------ targeting --

  private drawTargetingOverlay(
    g: CanvasRenderingContext2D, W: number, H: number, ctx: EngineContext,
  ): void {
    const s = this.s;
    const strike = this.airstrike;
    const stage = strike.targetingStage;
    const valid = strike.markerValid || stage === 'heading';
    // Amber for a good designation, red for a bad one. Green would be the
    // obvious choice and it is the wrong one: this display has exactly one
    // accent, and the targeting overlay is the largest thing ever drawn on it.
    const col = valid ? AMBER : BAD;

    g.save();

    // A subtle vignette so the mode change is felt before it is read. Neutral,
    // not the green it used to be: the paragraph above rules green out for the
    // reticle and then the largest single element on the display was tinted
    // with it, which is the inconsistency it was written to avoid.
    const tint = g.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7,
    );
    tint.addColorStop(0, 'rgba(6,8,10,0)');
    tint.addColorStop(1, 'rgba(5,7,9,0.4)');
    g.fillStyle = tint;
    g.fillRect(0, 0, W, H);

    // Corner brackets frame the mode.
    const inset = 58 * s;
    const len = 38 * s;
    g.strokeStyle = rgba(col, 0.72);
    g.lineWidth = 2 * s;
    for (const [x, y, dx, dy] of [
      [inset, inset, 1, 1],
      [W - inset, inset, -1, 1],
      [inset, H - inset, 1, -1],
      [W - inset, H - inset, -1, -1],
    ] as Array<[number, number, number, number]>) {
      g.beginPath();
      g.moveTo(x + dx * len, y);
      g.lineTo(x, y);
      g.lineTo(x, y + dy * len);
      g.stroke();
    }

    // Stage banner, on its own plate below the compass. Set at the top inset
    // it landed inside the compass tape and drew straight through the cardinal
    // letters — two unrelated readouts sharing one row of pixels.
    g.textAlign = 'center';
    setType(g, 12 * s, 700, 5 * s);
    const bannerText = 'CLOSE AIR SUPPORT · TARGETING';
    const bw = g.measureText(bannerText).width + 44 * s;
    const bh = 26 * s;
    const by = 94 * s;
    panel(g, W / 2 - bw / 2, by, bw, bh, {
      fill: 0.72, hairline: 0.16, cut: 8 * s, accent: rgba(col, 0.9),
    });
    g.fillStyle = rgba(col, 0.95);
    g.fillText(bannerText, W / 2 + 2 * s, by + 17 * s);
    clearTracking(g);

    // Explicit two-stage prompt. The old overlay showed the same line in both
    // halves of the flow, which is why nobody could tell them apart.
    const pw = 380 * s;
    // Deep enough for both rows. At 52 the prompt line fell through the bottom
    // edge and hung over the street, unplated and unreadable.
    const ph = 64 * s;
    const px = W / 2 - pw / 2;
    const py = H - inset - ph - 26 * s;
    panel(g, px, py, pw, ph, {
      fill: 0.7, hairline: 0.18, cut: 12 * s, accent: rgba(col, 0.9), scanlines: true,
    });

    const steps: Array<[string, string]> = [
      ['1', 'IMPACT POINT'],
      ['2', 'ATTACK HEADING'],
    ];
    let sx = px + 16 * s;
    for (let i = 0; i < steps.length; i++) {
      const [num, label] = steps[i];
      const activeStep = (stage === 'point' && i === 0) || (stage === 'heading' && i === 1);
      const done = stage === 'heading' && i === 0;
      g.textAlign = 'left';
      g.globalAlpha = activeStep ? 1 : 0.42;
      g.fillStyle = activeStep ? rgba(col, 0.95) : rgba(DIM, 0.8);
      g.beginPath();
      g.arc(sx + 7 * s, py + 21 * s, 8 * s, 0, Math.PI * 2);
      if (done) g.fill();
      else g.stroke();
      setType(g, 10 * s, 700, 0);
      g.textAlign = 'center';
      g.fillStyle = done ? rgba('9,12,14', 0.95) : activeStep ? rgba(col, 0.95) : rgba(DIM, 0.8);
      g.fillText(num, sx + 7 * s, py + 25 * s);
      g.textAlign = 'left';
      setType(g, 11 * s, 600, 2.2 * s);
      g.fillStyle = activeStep ? rgba(INK, 0.95) : rgba(DIM, 0.75);
      g.fillText(label, sx + 22 * s, py + 25 * s);
      sx += 22 * s + g.measureText(label).width + 30 * s;
      clearTracking(g);
    }
    g.globalAlpha = 1;

    g.textAlign = 'center';
    setType(g, 11 * s, 600, 2.6 * s);
    g.fillStyle = rgba(DIM, 0.85);
      g.fillText(
      stage === 'point'
        ? (strike.markerValid ? 'FIRE — CONFIRM POINT   ·   AIM — ABORT' : 'NO LINE OF SIGHT TO GROUND')
        : 'SWEEP TO SET RUN-IN   ·   FIRE — COMMIT   ·   AIM — ABORT',
      W / 2, py + ph - 14 * s,
    );
    clearTracking(g);

    // Live range/bearing readout at the reticle.
    const cam = ctx.camera;
    const dist = strike.target.distanceTo(cam.position);
    const bearing = ((strike.heading * 180) / Math.PI + 360) % 360;
    const cx = W / 2;
    const cy = H / 2;
    const rows = [`RNG ${dist.toFixed(0)} M`];
    if (stage === 'heading') {
      rows.push(`RUN-IN ${String(Math.round(bearing)).padStart(3, '0')}°`);
    }
    g.textAlign = 'left';
    setType(g, 10 * s, 600, 2 * s);
    // On a plate. Amber caps floating on a sunlit street is the one place a
    // readout is guaranteed to be needed and guaranteed to be invisible.
    const readW = Math.max(...rows.map((t) => g.measureText(t).width)) + 16 * s;
    const readH = rows.length * 16 * s + 8 * s;
    panel(g, cx + 22 * s, cy - 18 * s, readW, readH, {
      fill: 0.66, hairline: 0.14, cut: 5 * s,
    });
    g.fillStyle = rgba(col, 0.95);
    for (let i = 0; i < rows.length; i++) {
      g.fillText(rows[i], cx + 30 * s, cy - 5 * s + i * 16 * s);
    }
    clearTracking(g);

    // Targeting reticle: a rotating bracket, distinct from the weapon sight.
    g.strokeStyle = rgba(col, 0.9);
    g.lineWidth = 1.8 * s;
    const r = 18 * s;
    g.save();
    g.translate(cx, cy);
    g.rotate(this.time * 0.6);
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 2);
      g.beginPath();
      g.moveTo(r, -r + 7 * s);
      g.lineTo(r, -r);
      g.lineTo(r - 7 * s, -r);
      g.stroke();
    }
    g.restore();

    // Scan line sweeping the frame.
    const scanY = (this.time * 240) % H;
    const grad = g.createLinearGradient(0, scanY - 44, 0, scanY + 44);
    grad.addColorStop(0, rgba(col, 0));
    grad.addColorStop(0.5, rgba(col, 0.07));
    grad.addColorStop(1, rgba(col, 0));
    g.fillStyle = grad;
    g.fillRect(0, scanY - 44, W, 88);

    g.restore();
  }

  // -------------------------------------------------------------- markers --

  private drawEnemyMarkers(
    g: CanvasRenderingContext2D, W: number, H: number, ctx: EngineContext,
  ): void {
    const cam = ctx.camera;
    const s = this.s;
    g.save();
    for (const pos of this.ai.enemyPositions) {
      this._proj.copy(pos).setY(pos.y + 1.9).project(cam);
      if (this._proj.z > 1) continue;
      const x = (this._proj.x * 0.5 + 0.5) * W;
      const y = (-this._proj.y * 0.5 + 0.5) * H;
      const dist = pos.distanceTo(cam.position);
      const size = THREE.MathUtils.clamp(220 / dist, 6, 22) * s;

      g.globalAlpha = THREE.MathUtils.clamp(1 - dist / 120, 0.25, 0.85);
      g.strokeStyle = rgba(BAD, 0.9);
      g.lineWidth = 1.6 * s;
      g.beginPath();
      g.moveTo(x, y - size * 0.5);
      g.lineTo(x + size * 0.42, y);
      g.lineTo(x, y + size * 0.5);
      g.lineTo(x - size * 0.42, y);
      g.closePath();
      g.stroke();
    }
    g.restore();
  }

  private drawDeathOverlay(g: CanvasRenderingContext2D, W: number, H: number): void {
    const s = this.s;
    g.save();
    g.fillStyle = 'rgba(40,4,2,0.34)';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    setType(g, 40 * s, 700, 10 * s);
    g.fillStyle = rgba(BAD, 0.95);
    g.fillText('KILLED IN ACTION', W / 2, H / 2 - 10 * s);
    setType(g, 12 * s, 600, 4 * s);
    g.fillStyle = rgba(DIM, 0.8);
    g.fillText('REDEPLOYING', W / 2, H / 2 + 22 * s);
    clearTracking(g);
    g.restore();
  }

  dispose(): void {
    this.canvas.remove();
  }
}
