import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import type { PlayerSystem } from '../player/Player';
import type { WeaponSystem } from '../weapons/WeaponSystem';
import type { KillstreakSystem } from '../killstreaks/Killstreaks';
import { KILLSTREAKS } from '../killstreaks/Killstreaks';
import type { AISystem } from '../ai/AISystem';
import type { AirstrikeSystem } from '../killstreaks/Airstrike';

interface KillfeedEntry { text: string; headshot: boolean; ttl: number; }
interface Notification { title: string; subtitle: string; tone: string; ttl: number; maxTtl: number; }
interface DamageMark { angle: number; ttl: number; }

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

  private hitmarker = 0;
  private hitmarkerLethal = false;
  private hitmarkerHeadshot = false;
  private readonly killfeed: KillfeedEntry[] = [];
  private readonly notifications: Notification[] = [];
  private readonly damageMarks: DamageMark[] = [];
  private lowAmmoPulse = 0;
  private visible = true;
  private time = 0;

  /** Smoothed crosshair gap so it breathes with the spread. */
  private crosshairGap = 6;

  private readonly _v = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
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
      Signals.emit('audio:oneshot', { id: 'hitmarker', volume: headshot ? 0.6 : 0.4, pitch: headshot ? 1.35 : 1 });
    });

    Signals.on('actor:killed', ({ headshot }) => {
      this.killfeed.unshift({
        text: `YOU  ▸  HOSTILE`,
        headshot,
        ttl: 5.5,
      });
      if (this.killfeed.length > 5) this.killfeed.pop();
    });

    Signals.on('ui:notify', ({ title, subtitle, tone }) => {
      this.notifications.unshift({ title, subtitle: subtitle ?? '', tone, ttl: 3.2, maxTtl: 3.2 });
      if (this.notifications.length > 3) this.notifications.pop();
    });

    Signals.on('player:damaged', ({ direction }) => {
      // Store the world-space bearing; it is converted to a screen angle each
      // frame so the indicator stays correct as the player turns.
      this.damageMarks.push({
        angle: Math.atan2(direction.x, direction.z),
        ttl: 1.6,
      });
      if (this.damageMarks.length > 6) this.damageMarks.shift();
    });
  }

  resize(width: number, height: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = width;
    this.height = height;
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

    const w = this.weapons.active;
    this.lowAmmoPulse = w.mag <= Math.ceil(w.def.magSize * 0.25) ? (this.lowAmmoPulse + dt * 4) : 0;

    this.draw(dt, ctx);
  }

  // ---------------------------------------------------------------- draw ---

  private draw(dt: number, ctx: EngineContext): void {
    const g = this.c2d;
    const W = this.width;
    const H = this.height;
    g.clearRect(0, 0, W, H);

    const ads = this.weapons.adsProgress;

    this.drawCrosshair(g, W, H, dt, ads);
    this.drawHitmarker(g, W, H);
    this.drawAmmo(g, W, H, ads);
    this.drawHealth(g, W, H);
    this.drawCompass(g, W, H, ctx);
    this.drawKillfeed(g, W);
    this.drawNotifications(g, W, H);
    this.drawKillstreaks(g, W, H);
    this.drawDamageIndicators(g, W, H);
    this.drawObjective(g, W, H);
    if (this.airstrike.targeting) this.drawTargetingOverlay(g, W, H);
    if (this.killstreaks.uavTimeLeft > 0) this.drawEnemyMarkers(g, W, H, ctx);
    if (!this.player.alive) this.drawDeathOverlay(g, W, H);
  }

  private drawCrosshair(g: CanvasRenderingContext2D, W: number, H: number, dt: number, ads: number): void {
    const cx = W / 2;
    const cy = H / 2;

    // Hide the crosshair when the optic reticle takes over.
    const alpha = 1 - THREE.MathUtils.smoothstep(ads, 0.35, 0.75);
    if (alpha < 0.01) {
      // Still draw a 1px centre dot so the eye has an anchor mid-transition.
      return;
    }

    // Gap tracks the actual cone of fire, converted to screen pixels through
    // the projection — so the crosshair is a truthful readout, not decoration.
    const spread = this.weapons.currentSpread;
    const fovRad = THREE.MathUtils.degToRad(this.ctx.camera.fov);
    const pixelsPerRadian = H / (2 * Math.tan(fovRad / 2));
    const targetGap = Math.max(4, spread * pixelsPerRadian);
    this.crosshairGap = THREE.MathUtils.damp(this.crosshairGap, targetGap, 14, dt);

    const gap = this.crosshairGap;
    const len = 7;
    const thickness = 2;

    g.save();
    g.globalAlpha = alpha;

    // Outline first so the crosshair stays readable against any background.
    for (const [colour, width, offset] of [
      ['rgba(0,0,0,0.55)', thickness + 2, 0],
      ['rgba(235,242,246,0.95)', thickness, 0],
    ] as Array<[string, number, number]>) {
      g.strokeStyle = colour;
      g.lineWidth = width;
      g.lineCap = 'butt';
      g.beginPath();
      g.moveTo(cx, cy - gap - len - offset); g.lineTo(cx, cy - gap);
      g.moveTo(cx, cy + gap); g.lineTo(cx, cy + gap + len + offset);
      g.moveTo(cx - gap - len - offset, cy); g.lineTo(cx - gap, cy);
      g.moveTo(cx + gap, cy); g.lineTo(cx + gap + len + offset, cy);
      g.stroke();
    }

    // Centre dot.
    g.fillStyle = 'rgba(235,242,246,0.9)';
    g.fillRect(cx - 1, cy - 1, 2, 2);
    g.restore();
  }

  private drawHitmarker(g: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.hitmarker <= 0.001) return;
    const cx = W / 2;
    const cy = H / 2;
    const t = this.hitmarker;
    // Snap out then fade — the pop is what makes a hit register viscerally.
    const scale = 1 + (1 - t) * 0.5;
    const d1 = 5 * scale;
    const d2 = 12 * scale;

    g.save();
    g.globalAlpha = Math.min(1, t * 1.6);
    g.strokeStyle = this.hitmarkerLethal
      ? 'rgba(255,60,40,0.98)'
      : this.hitmarkerHeadshot
        ? 'rgba(255,196,60,0.98)'
        : 'rgba(250,250,250,0.95)';
    g.lineWidth = this.hitmarkerLethal ? 3 : 2.2;
    g.lineCap = 'round';
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.moveTo(cx + sx * d1, cy + sy * d1);
      g.lineTo(cx + sx * d2, cy + sy * d2);
    }
    g.stroke();
    g.restore();
  }

  private drawAmmo(g: CanvasRenderingContext2D, W: number, H: number, ads: number): void {
    const w = this.weapons.active;
    const x = W - 46;
    const y = H - 46;

    g.save();
    g.globalAlpha = 0.92 - ads * 0.5;
    g.textAlign = 'right';

    const low = w.mag <= Math.ceil(w.def.magSize * 0.25);
    const pulse = low ? 0.6 + 0.4 * Math.sin(this.lowAmmoPulse) : 1;

    // Magazine count.
    g.font = '600 54px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
    g.fillStyle = low ? `rgba(232,86,60,${pulse})` : 'rgba(238,244,248,0.97)';
    g.shadowColor = 'rgba(0,0,0,0.75)';
    g.shadowBlur = 8;
    g.fillText(String(w.mag), x, y);

    // Reserve.
    g.font = '500 22px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
    g.fillStyle = 'rgba(190,200,208,0.8)';
    g.fillText(`/ ${w.reserve}`, x, y + 22);

    // Weapon name and fire mode.
    g.font = '600 15px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
    g.fillStyle = 'rgba(200,160,74,0.92)';
    g.letterSpacing = '2px';
    g.fillText(w.def.name, x, y - 58);
    g.font = '500 13px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
    g.fillStyle = 'rgba(170,180,190,0.7)';
    g.fillText(`${w.def.class} · ${this.weapons.fireMode.toUpperCase()}`, x, y - 40);
    g.letterSpacing = '0px';

    // Reload progress arc.
    if (this.weapons.reloading) {
      const p = 1 - this.weapons.reloadTimer / this.weapons.reloadDuration;
      const rx = W / 2;
      const ry = H / 2 + 58;
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(rx, ry, 17, -Math.PI / 2, Math.PI * 1.5);
      g.stroke();
      g.strokeStyle = 'rgba(200,160,74,0.95)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(rx, ry, 17, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      g.stroke();
      g.font = '600 11px Rajdhani, system-ui, sans-serif';
      g.fillStyle = 'rgba(230,238,244,0.85)';
      g.textAlign = 'center';
      g.fillText('RELOADING', rx, ry + 34);
    }

    g.restore();
  }

  private drawHealth(g: CanvasRenderingContext2D, W: number, H: number): void {
    const frac = this.player.health / this.player.maxHealth;

    // Screen-edge blood vignette rather than a bar: it keeps the player's
    // eyes at the centre of the screen where the fight is.
    if (frac < 0.999) {
      const intensity = Math.pow(1 - frac, 1.3);
      const grad = this.c2d.createRadialGradient(
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

    // A compact readout bottom-left for exact state.
    const x = 46;
    const y = H - 46;
    g.save();
    g.textAlign = 'left';
    g.font = '600 15px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
    g.fillStyle = 'rgba(170,180,190,0.7)';
    g.letterSpacing = '2px';
    g.fillText('VITALS', x, y - 30);
    g.letterSpacing = '0px';

    const barW = 168;
    const barH = 4;
    g.fillStyle = 'rgba(10,14,16,0.62)';
    g.fillRect(x, y - 22, barW, barH);
    const col = frac > 0.6 ? 'rgba(120,208,150,0.92)' : frac > 0.3 ? 'rgba(226,178,64,0.94)' : 'rgba(232,72,52,0.96)';
    g.fillStyle = col;
    g.fillRect(x, y - 22, barW * frac, barH);

    g.font = '600 30px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
    g.fillStyle = 'rgba(238,244,248,0.95)';
    g.shadowColor = 'rgba(0,0,0,0.7)';
    g.shadowBlur = 6;
    g.fillText(String(Math.ceil(this.player.health)), x, y + 6);

    // Stance indicator.
    g.font = '500 13px Rajdhani, system-ui, sans-serif';
    g.fillStyle = 'rgba(200,160,74,0.8)';
    g.fillText(this.player.stance.toUpperCase(), x + 54, y + 4);
    g.restore();
  }

  private drawCompass(g: CanvasRenderingContext2D, W: number, H: number, ctx: EngineContext): void {
    const cx = W / 2;
    const y = 34;
    const width = Math.min(460, W * 0.42);
    const yaw = this.player.yaw;

    g.save();
    // Backing.
    const grad = g.createLinearGradient(cx - width / 2, 0, cx + width / 2, 0);
    grad.addColorStop(0, 'rgba(8,11,13,0)');
    grad.addColorStop(0.2, 'rgba(8,11,13,0.5)');
    grad.addColorStop(0.8, 'rgba(8,11,13,0.5)');
    grad.addColorStop(1, 'rgba(8,11,13,0)');
    g.fillStyle = grad;
    g.fillRect(cx - width / 2, y - 15, width, 30);

    g.textAlign = 'center';
    // 90 degrees of arc across the compass strip.
    const degPerPixel = 90 / width;

    const headings: Array<[number, string]> = [
      [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
      [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
    ];

    const playerDeg = ((-yaw * 180) / Math.PI + 360) % 360;

    for (const [deg, label] of headings) {
      let delta = deg - playerDeg;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      const px = cx + delta / degPerPixel;
      if (px < cx - width / 2 || px > cx + width / 2) continue;
      const fade = 1 - Math.abs(delta) / 50;
      g.globalAlpha = THREE.MathUtils.clamp(fade, 0.15, 1);
      g.font = label.length === 1
        ? '700 16px Rajdhani, system-ui, sans-serif'
        : '600 12px Rajdhani, system-ui, sans-serif';
      g.fillStyle = label.length === 1 ? 'rgba(200,160,74,0.95)' : 'rgba(210,220,228,0.8)';
      g.fillText(label, px, y + 5);
    }

    // Minor ticks every 15 degrees.
    for (let d = 0; d < 360; d += 15) {
      let delta = d - playerDeg;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      const px = cx + delta / degPerPixel;
      if (px < cx - width / 2 || px > cx + width / 2) continue;
      if (d % 45 === 0) continue;
      g.globalAlpha = THREE.MathUtils.clamp(1 - Math.abs(delta) / 50, 0.1, 0.5);
      g.fillStyle = 'rgba(200,212,220,0.7)';
      g.fillRect(px - 0.5, y - 8, 1, 5);
    }

    // Centre marker.
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(200,160,74,1)';
    g.beginPath();
    g.moveTo(cx, y + 12);
    g.lineTo(cx - 4, y + 18);
    g.lineTo(cx + 4, y + 18);
    g.closePath();
    g.fill();

    g.restore();
    void ctx;
  }

  private drawKillfeed(g: CanvasRenderingContext2D, W: number): void {
    g.save();
    g.textAlign = 'right';
    let y = 78;
    for (const entry of this.killfeed) {
      const alpha = THREE.MathUtils.clamp(entry.ttl / 0.6, 0, 1);
      g.globalAlpha = alpha;
      g.font = '600 14px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
      const text = entry.headshot ? `⌖  ${entry.text}` : entry.text;
      const metrics = g.measureText(text);
      g.fillStyle = 'rgba(8,11,13,0.55)';
      g.fillRect(W - 42 - metrics.width - 10, y - 14, metrics.width + 20, 22);
      g.fillStyle = entry.headshot ? 'rgba(226,178,64,0.95)' : 'rgba(226,234,240,0.9)';
      g.fillText(text, W - 46, y);
      y += 26;
    }
    g.restore();
  }

  private drawNotifications(g: CanvasRenderingContext2D, W: number, H: number): void {
    g.save();
    g.textAlign = 'center';
    let y = H * 0.24;
    for (const n of this.notifications) {
      const t = n.ttl / n.maxTtl;
      const alpha = THREE.MathUtils.clamp(t * 3, 0, 1) * THREE.MathUtils.clamp((1 - t) * 8, 0, 1);
      g.globalAlpha = alpha;
      const col = n.tone === 'good' ? 'rgba(200,160,74,1)'
        : n.tone === 'bad' ? 'rgba(232,72,52,1)'
        : 'rgba(226,234,240,1)';
      g.font = '700 26px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
      g.letterSpacing = '4px';
      g.fillStyle = col;
      g.shadowColor = 'rgba(0,0,0,0.8)';
      g.shadowBlur = 10;
      g.fillText(n.title, W / 2, y);
      if (n.subtitle) {
        g.font = '500 14px Rajdhani, system-ui, sans-serif';
        g.letterSpacing = '2px';
        g.fillStyle = 'rgba(198,208,216,0.85)';
        g.fillText(n.subtitle, W / 2, y + 22);
      }
      g.letterSpacing = '0px';
      y += 62;
    }
    g.restore();
  }

  private drawKillstreaks(g: CanvasRenderingContext2D, W: number, H: number): void {
    const ks = this.killstreaks;
    const x = 46;
    let y = 88;

    g.save();
    g.textAlign = 'left';
    g.font = '600 12px Rajdhani, system-ui, sans-serif';
    g.letterSpacing = '2px';
    g.fillStyle = 'rgba(170,180,190,0.55)';
    g.fillText('STREAK', x, y - 16);
    g.letterSpacing = '0px';

    g.font = '700 24px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
    g.fillStyle = 'rgba(238,244,248,0.95)';
    g.fillText(String(ks.streak), x, y + 6);

    y += 30;
    for (const def of KILLSTREAKS) {
      const count = ks.available.get(def.id) ?? 0;
      const ready = count > 0;
      const remaining = Math.max(0, def.cost - ks.streak);

      g.globalAlpha = ready ? 1 : 0.42;
      // Slot chip.
      g.fillStyle = ready ? 'rgba(200,160,74,0.16)' : 'rgba(20,26,30,0.5)';
      g.fillRect(x, y - 13, 150, 22);
      g.fillStyle = ready ? 'rgba(200,160,74,0.95)' : 'rgba(150,160,170,0.7)';
      g.fillRect(x, y - 13, 3, 22);

      g.font = '600 12px Rajdhani, system-ui, sans-serif';
      g.fillStyle = ready ? 'rgba(238,226,200,0.96)' : 'rgba(170,180,190,0.75)';
      g.fillText(`${def.slot + 3}  ${def.name}`, x + 10, y + 2);

      if (!ready && remaining > 0) {
        g.textAlign = 'right';
        g.fillStyle = 'rgba(150,160,170,0.6)';
        g.fillText(`+${remaining}`, x + 142, y + 2);
        g.textAlign = 'left';
      } else if (count > 1) {
        g.textAlign = 'right';
        g.fillStyle = 'rgba(200,160,74,0.9)';
        g.fillText(`x${count}`, x + 142, y + 2);
        g.textAlign = 'left';
      }

      y += 26;
    }
    g.restore();
  }

  private drawDamageIndicators(g: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.damageMarks.length === 0) return;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * 0.19;

    g.save();
    for (const mark of this.damageMarks) {
      // Convert the stored world bearing into a screen-relative angle.
      let rel = mark.angle - this.player.yaw;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;

      const alpha = THREE.MathUtils.clamp(mark.ttl / 1.6, 0, 1);
      g.globalAlpha = alpha * 0.85;
      g.strokeStyle = 'rgba(228,54,38,0.95)';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(cx, cy, radius, -Math.PI / 2 + rel - 0.24, -Math.PI / 2 + rel + 0.24);
      g.stroke();
    }
    g.restore();
  }

  private drawObjective(g: CanvasRenderingContext2D, W: number, H: number): void {
    g.save();
    g.textAlign = 'center';
    g.font = '500 12px Rajdhani, system-ui, sans-serif';
    g.letterSpacing = '3px';
    g.fillStyle = 'rgba(170,180,190,0.5)';
    g.fillText(`HOSTILES ${this.ai.aliveCount}  ·  ELIMINATED ${this.killstreaks.kills}`, W / 2, H - 28);
    g.letterSpacing = '0px';
    g.restore();
  }

  private drawTargetingOverlay(g: CanvasRenderingContext2D, W: number, H: number): void {
    g.save();
    // Corner brackets to frame the targeting mode.
    const inset = 54;
    const len = 34;
    g.strokeStyle = 'rgba(46,255,160,0.7)';
    g.lineWidth = 2;
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

    g.textAlign = 'center';
    g.font = '600 13px Rajdhani, system-ui, sans-serif';
    g.letterSpacing = '3px';
    g.fillStyle = 'rgba(46,255,160,0.85)';
    g.fillText('CAS TARGETING — DESIGNATE IMPACT POINT', W / 2, inset - 14);
    g.letterSpacing = '0px';

    // Scan line sweeping the frame.
    const scanY = (this.time * 220) % H;
    const grad = g.createLinearGradient(0, scanY - 40, 0, scanY + 40);
    grad.addColorStop(0, 'rgba(46,255,160,0)');
    grad.addColorStop(0.5, 'rgba(46,255,160,0.06)');
    grad.addColorStop(1, 'rgba(46,255,160,0)');
    g.fillStyle = grad;
    g.fillRect(0, scanY - 40, W, 80);
    g.restore();
  }

  private drawEnemyMarkers(g: CanvasRenderingContext2D, W: number, H: number, ctx: EngineContext): void {
    const cam = ctx.camera;
    g.save();
    for (const pos of this.ai.enemyPositions) {
      this._proj.copy(pos).setY(pos.y + 1.9).project(cam);
      if (this._proj.z > 1) continue;
      const x = (this._proj.x * 0.5 + 0.5) * W;
      const y = (-this._proj.y * 0.5 + 0.5) * H;
      const dist = pos.distanceTo(cam.position);
      const size = THREE.MathUtils.clamp(220 / dist, 6, 22);

      g.globalAlpha = THREE.MathUtils.clamp(1 - dist / 120, 0.25, 0.85);
      g.strokeStyle = 'rgba(232,72,52,0.9)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x, y - size * 0.5);
      g.lineTo(x + size * 0.42, y);
      g.lineTo(x, y + size * 0.5);
      g.lineTo(x - size * 0.42, y);
      g.closePath();
      g.stroke();
    }
    g.restore();
    void this._v;
    void this._v2;
  }

  private drawDeathOverlay(g: CanvasRenderingContext2D, W: number, H: number): void {
    g.save();
    g.fillStyle = 'rgba(40,4,2,0.34)';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    g.font = '700 44px Rajdhani, "Barlow Condensed", system-ui, sans-serif';
    g.letterSpacing = '8px';
    g.fillStyle = 'rgba(232,72,52,0.95)';
    g.fillText('YOU WERE KILLED', W / 2, H / 2 - 12);
    g.font = '500 15px Rajdhani, system-ui, sans-serif';
    g.letterSpacing = '3px';
    g.fillStyle = 'rgba(210,220,228,0.75)';
    g.fillText('RESPAWNING…', W / 2, H / 2 + 22);
    g.letterSpacing = '0px';
    g.restore();
  }

  dispose(): void {
    this.canvas.remove();
  }
}
