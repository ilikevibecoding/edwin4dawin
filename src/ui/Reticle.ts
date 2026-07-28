import { Surface, clamp01, smoothstep } from './dom';

/**
 * The centre of the screen: crosshair and hitmarker.
 *
 * Both live on one canvas because both are per-frame vector graphics within a
 * few hundred pixels of the crosshair, and because they have to composite
 * against each other — a hitmarker landing over a wide hip-fire reticle is one
 * drawing, not two overlapping DOM nodes with their own stacking context. It is
 * canvas rather than DOM for the same reason the ammo counter is the opposite:
 * a blade whose length, gap and opacity all change every frame is exactly what
 * a 2D context is for, and exactly what a style recalculation is not.
 *
 * ## Spread is real
 *
 * The gap between the blades is not a decorative animation. `IWeapons.spread`
 * is the half-angle of the cone the next round can go anywhere inside, and the
 * gap is that angle projected through the same lens the world is drawn with:
 *
 *     px = (H / 2) · tan(spread) / tan(fov / 2)
 *
 * So a blade sits exactly where a round could land. That is what makes hip fire
 * legible — the reticle blooms when you sprint because your gun really has, and
 * it closes as you settle because the spread state really is recovering.
 *
 * ## Legibility
 *
 * Every stroke is drawn twice: a dark keyline inflated by a pixel, then the
 * bright blade on top. Over the sunlit ochre end of this level a white
 * crosshair with no keyline disappears completely, and over a dark interior a
 * black one does. The pair survives both, and costs one extra fill per blade.
 */

/** How a weapon class draws its reticle. */
export type ReticleShape = 'cross' | 'compact' | 'precision' | 'spread';

const SHAPE_BY_WEAPON: Record<string, ReticleShape> = {
  rifle: 'cross',
  smg: 'compact',
  sniper: 'precision',
  shotgun: 'spread',
  pistol: 'compact',
};

interface Marker {
  age: number;
  life: number;
  damage: number;
  lethal: boolean;
  headshot: boolean;
}

const INK = 'rgba(236, 246, 250, 0.95)';
const KEYLINE = 'rgba(2, 5, 8, 0.62)';

export class Reticle {
  private readonly surface: Surface;
  private readonly markers: Marker[] = [];
  /** Cursor into a fixed pool; a hitmarker must never allocate. */
  private next = 0;

  /** Smoothed spread in pixels, so the blades glide rather than jitter. */
  private gap = 0;
  private hidden = 0;

  constructor(parent: HTMLElement) {
    this.surface = new Surface('hud-reticle hud-combat', parent);
    for (let i = 0; i < 10; i++) {
      this.markers.push({ age: 10, life: 1, damage: 0, lethal: false, headshot: false });
    }
  }

  resize(width: number, height: number, ratio: number): void {
    // Large enough to hold a shotgun's hip-fire bloom without clipping, small
    // enough that clearing it is not a full-screen operation.
    const size = Math.round(Math.min(width, height) * 0.72);
    this.surface.resize(size, size, ratio);
    this.surface.canvas.style.marginLeft = `${-size / 2}px`;
    this.surface.canvas.style.marginTop = `${-size / 2}px`;
  }

  hit(damage: number, lethal: boolean, headshot: boolean): void {
    const m = this.markers[this.next];
    this.next = (this.next + 1) % this.markers.length;
    m.age = 0;
    m.life = lethal ? 0.46 : 0.32;
    m.damage = damage;
    m.lethal = lethal;
    m.headshot = headshot;
  }

  clearMarkers(): void {
    for (const m of this.markers) m.age = m.life + 1;
  }

  /**
   * @param spread   Half-angle of the current cone of fire, radians.
   * @param fov      Vertical field of view in degrees, as drawn this frame.
   * @param screenH  Viewport height in CSS pixels, for the projection.
   */
  update(
    dt: number,
    opts: {
      spread: number;
      fov: number;
      screenH: number;
      adsFactor: number;
      weaponId: string;
      pelletSpread: number;
      firing: boolean;
      visible: boolean;
      dead: boolean;
    },
  ): void {
    const s = this.surface;
    if (s.width === 0) return;

    let live = false;
    for (const m of this.markers) {
      if (m.age <= m.life) {
        m.age += dt;
        live = true;
      }
    }

    const shape = SHAPE_BY_WEAPON[opts.weaponId] ?? 'cross';
    // A scope replaces the reticle outright, so a precision weapon gives up its
    // crosshair earlier in the aim than a carbine whose red dot it doubles for.
    const fadeStart = shape === 'precision' ? 0.18 : 0.5;
    const fadeEnd = shape === 'precision' ? 0.55 : 0.94;
    const aimHide = smoothstep(fadeStart, fadeEnd, opts.adsFactor);
    const wantHidden = opts.visible && !opts.dead ? aimHide : 1;
    this.hidden += (wantHidden - this.hidden) * Math.min(1, dt * 18);

    const halfTan = Math.tan((opts.fov * Math.PI) / 360);
    const project = (angle: number): number =>
      halfTan > 1e-5 ? (opts.screenH * 0.5 * Math.tan(angle)) / halfTan : 0;

    const targetGap = Math.min(s.width * 0.46, project(Math.max(0, opts.spread)));
    // Fast to open, slower to close: a bloom has to be instant to read as the
    // consequence of the shot that caused it, but a reticle that snaps shut the
    // instant you stop firing looks like a bug.
    const rate = targetGap > this.gap ? 34 : 13;
    this.gap += (targetGap - this.gap) * Math.min(1, dt * rate);

    const alpha = 1 - this.hidden;
    if (alpha < 0.004 && !live) {
      if (this.dirty) {
        s.clear();
        this.dirty = false;
      }
      return;
    }

    s.clear();
    this.dirty = true;
    const g = s.g;
    const cx = s.width * 0.5;
    const cy = s.height * 0.5;
    const u = Math.max(1, opts.screenH / 720);

    if (alpha > 0.004) {
      g.globalAlpha = alpha;
      this.drawCrosshair(g, cx, cy, u, shape, opts.pelletSpread, project, opts.firing);
      g.globalAlpha = 1;
    }
    if (live) this.drawMarkers(g, cx, cy, u);
  }

  private dirty = false;

  /* ------------------------------ crosshair ------------------------------- */

  private drawCrosshair(
    g: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    u: number,
    shape: ReticleShape,
    pelletSpread: number,
    project: (angle: number) => number,
    firing: boolean,
  ): void {
    const gap = this.gap;
    let thickness = Math.max(2, 2.2 * u);
    let length = 9.5 * u;
    let dot = 0;

    switch (shape) {
      case 'compact':
        length = 7.4 * u;
        break;
      case 'precision':
        thickness = Math.max(1.5, 1.6 * u);
        length = 13 * u;
        dot = 1.8 * u;
        break;
      case 'spread':
        length = 6.2 * u;
        thickness = Math.max(2.2, 2.7 * u);
        break;
      default:
        break;
    }

    // The blades open a little further while the trigger is held, on top of the
    // real spread. Recoil is already in `spread`; this is the extra beat of
    // motion that makes automatic fire feel like it has weight.
    const kick = firing ? 1.6 * u : 0;
    const inner = Math.max(2.5 * u, gap) + kick;

    for (let i = 0; i < 4; i++) {
      const horizontal = i % 2 === 1;
      const negative = i > 1;
      const along = negative ? -1 : 1;
      let x: number;
      let y: number;
      let w: number;
      let h: number;
      if (horizontal) {
        w = length;
        h = thickness;
        x = negative ? cx - inner - length : cx + inner;
        y = cy - thickness * 0.5;
      } else {
        w = thickness;
        h = length;
        x = cx - thickness * 0.5;
        y = negative ? cy - inner - length : cy + inner;
      }
      void along;
      this.bar(g, x, y, w, h);
    }

    if (dot > 0) this.bar(g, cx - dot * 0.5, cy - dot * 0.5, dot, dot);

    // A buckshot cone is a real, separate quantity from aim spread, and a
    // shotgun reticle that does not show it is lying about the weapon's reach.
    if (shape === 'spread' && pelletSpread > 0) {
      const r = Math.min(this.surface.width * 0.47, project(pelletSpread) + inner * 0.35);
      g.save();
      g.lineWidth = Math.max(1, 1.1 * u);
      g.setLineDash([2.4 * u, 4.2 * u]);
      g.strokeStyle = KEYLINE;
      g.beginPath();
      g.arc(cx, cy, r + 0.6, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(236, 246, 250, 0.5)';
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }

  /** A blade: dark keyline, then ink, both snapped to the pixel grid. */
  private bar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const px = Math.round(x);
    const py = Math.round(y);
    const pw = Math.max(1, Math.round(w));
    const ph = Math.max(1, Math.round(h));
    g.fillStyle = KEYLINE;
    g.fillRect(px - 1, py - 1, pw + 2, ph + 2);
    g.fillStyle = INK;
    g.fillRect(px, py, pw, ph);
  }

  /* ------------------------------ hitmarker ------------------------------- */

  private drawMarkers(
    g: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    u: number,
  ): void {
    for (const m of this.markers) {
      if (m.age > m.life) continue;
      const t = clamp01(m.age / m.life);

      /*
       * The shape of the animation is the whole feel of the thing. It has to be
       * at full size on the frame the round lands — anything that grows in is
       * read as late, and a hitmarker that reads as late reads as a miss — so
       * it arrives slightly over-sized, snaps down over four frames, holds, and
       * then expands away as it fades. The hold is what makes it feel solid
       * rather than flickery at 200 ms of sustained fire.
       */
      const snap = 1.16 - 0.16 * smoothstep(0, 0.07, m.age);
      const decay = smoothstep(0.42, 1, t);
      const scale = snap + decay * 0.34;
      const alpha = 1 - decay * decay;

      const weight = 0.85 + 0.55 * clamp01(m.damage / 90);
      const gap = (m.lethal ? 5.6 : 4.6) * u * scale;
      const len = (m.lethal ? 13.5 : 11) * u * weight * scale * (m.headshot ? 1.14 : 1);
      const thick = Math.max(2.2, (m.lethal ? 3.6 : 2.8) * u * (m.headshot ? 1.18 : 1));

      const colour = m.lethal
        ? 'rgba(255, 74, 58, 0.98)'
        : m.headshot
          ? 'rgba(255, 208, 74, 0.98)'
          : 'rgba(244, 250, 252, 0.96)';

      g.save();
      g.globalAlpha = alpha;
      g.translate(cx, cy);

      // A kill gets a soft bloom behind it. It is the difference between "that
      // one connected" and "that one dropped him", read without looking.
      if (m.lethal) {
        const r = (gap + len) * 1.35;
        const glow = g.createRadialGradient(0, 0, 0, 0, 0, r);
        glow.addColorStop(0, 'rgba(255, 92, 60, 0.34)');
        glow.addColorStop(0.55, 'rgba(255, 60, 40, 0.12)');
        glow.addColorStop(1, 'rgba(255, 60, 40, 0)');
        g.fillStyle = glow;
        g.beginPath();
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.fill();
      }

      g.rotate(Math.PI / 4);
      this.spokes(g, 4, gap, len, thick, colour);
      g.rotate(-Math.PI / 4);

      // A headshot marks the hole in the middle of the X rather than adding a
      // second set of spokes. Eight spokes read as a sparkle at this size — the
      // X stops being an X — whereas a ring inside it stays unmistakably a
      // hitmarker and is still separable in peripheral vision.
      if (m.headshot) this.ring(g, gap * 0.66, Math.max(1.6, thick * 0.52), colour);
      g.restore();
    }
  }

  private spokes(
    g: CanvasRenderingContext2D,
    count: number,
    gap: number,
    len: number,
    thick: number,
    colour: string,
  ): void {
    for (let i = 0; i < count; i++) {
      g.save();
      g.rotate((i / count) * Math.PI * 2);
      g.fillStyle = KEYLINE;
      g.fillRect(-thick * 0.5 - 1, -gap - len - 1, thick + 2, len + 2);
      g.fillStyle = colour;
      g.fillRect(-thick * 0.5, -gap - len, thick, len);
      g.restore();
    }
  }

  private ring(
    g: CanvasRenderingContext2D,
    radius: number,
    thick: number,
    colour: string,
  ): void {
    g.beginPath();
    g.arc(0, 0, radius, 0, Math.PI * 2);
    g.lineWidth = thick + 2;
    g.strokeStyle = KEYLINE;
    g.stroke();
    g.lineWidth = thick;
    g.strokeStyle = colour;
    g.stroke();
  }

  /** Which reticle a weapon id draws, exposed for the loadout screen. */
  static shapeOf(weaponId: string): ReticleShape {
    return SHAPE_BY_WEAPON[weaponId] ?? 'cross';
  }
}
