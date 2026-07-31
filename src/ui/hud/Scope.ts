/**
 * The scope overlay.
 *
 * The weapons module already renders the sight picture properly: the world is
 * drawn a second time through a narrow-FOV camera onto the ocular disc, a
 * reticle plane sits at the focal plane, and above 3x magnification a modelled
 * annulus blacks out everything outside the aperture. So this is deliberately
 * *not* another reticle — it is the surround and the post treatment, and it is
 * sized from the same numbers the optic uses so the two line up instead of
 * fighting.
 *
 * The aperture's on-screen radius is derived in the weapons module as
 * `0.26 + 0.5 * smoothstep(2, 4.6, zoom)` NDC half-heights, which is a fraction
 * of half the viewport height. Reproducing that here (see `apertureRadius`) is
 * the whole trick: the mask's inner edge is placed 1.5% outside the aperture, so
 * it can only ever reinforce the modelled annulus, never clip the sight picture
 * when recoil shifts it.
 */
import { CanvasLayer, div, setClass, setStyle, setText, span } from '../Dom';
import { COLOR, FONT } from '../Theme';
import type { FrameState, ScopeKind } from '../HudState';
import { outlinedLine, outlinedText, rgba, shadowText } from './Draw';
import { clamp, saturate, smoothstep } from '../../core/MathUtils';

/** Magnification at and above which the optic owns the whole frame. */
const FULL_BLACKOUT_ZOOM = 3;

/** How far outside the aperture the mask's inner edge sits. */
const MASK_SLACK = 1.015;

export class Scope {
  readonly root: HTMLDivElement;

  private readonly mask: HTMLDivElement;
  private readonly vignette: HTMLDivElement;
  private readonly layer: CanvasLayer;
  private readonly rangeEl: HTMLElement;
  private readonly magEl: HTMLElement;
  private readonly windEl: HTMLElement;

  private kind: ScopeKind = 'none';
  private amount = 0;
  private zoom = 1;
  private radius = 0;
  private live = false;
  private preGraded = false;
  private height = 1;
  private drawnRadius = -1;
  private drawnKind = '';
  /** Metres to whatever is under the crosshair; -1 when nothing was hit. */
  private range = -1;

  constructor(parent: HTMLElement) {
    this.root = div('ob-scope grade', parent);
    this.mask = div('ob-scope-mask', this.root);
    this.vignette = div('ob-scope-vig', this.root);
    div('ob-scope-lens', this.root);
    this.layer = new CanvasLayer('ob-scope-marks', this.root);
    const read = div('ob-scope-read', this.root);
    this.magEl = span(undefined, read, '4.6x');
    this.rangeEl = span(undefined, read, '--- M');
    this.windEl = span(undefined, read, 'W 0.0');
  }

  /** Called by the weapons module every frame it is aiming a magnified optic. */
  set(kind: ScopeKind, amount: number): void {
    this.kind = kind;
    this.amount = saturate(amount);
  }

  /**
   * Whether some other module is already grading the frame beneath the UI.
   *
   * Only thermal cares. In the shipped game its one caller is the door gunner,
   * which desaturates and crushes the picture on its own compositor layer, so
   * grading again here would be a second full-screen backdrop pass over the
   * busiest twenty seconds in the game for no visible gain. Anyone else asking
   * for a thermal sight gets the grade from here, because brackets over a
   * full-colour world do not read as a sensor at all.
   */
  setFramePreGraded(graded: boolean): void {
    if (this.preGraded === graded) return;
    this.preGraded = graded;
    setClass(this.root, 'grade', !graded);
  }

  resize(height: number): void {
    this.height = height;
    this.layer.measure(1.5);
    this.drawnRadius = -1;
  }

  setRange(metres: number): void {
    this.range = metres;
  }

  /** True while the overlay is opaque enough to be worth a rangefinder ping. */
  get wantsRange(): boolean {
    return this.live && this.amount > 0.6 && this.kind === 'sniper';
  }

  update(state: FrameState): void {
    const kind = this.kind;
    const active = kind !== 'none' && this.amount > 0.004;
    if (active !== this.live) {
      this.live = active;
      setClass(this.root, 'live', active);
    }
    if (!active) {
      // Report the fade to the crosshair even on the frame it switches off, so
      // the two never both show.
      state.scope = kind;
      state.scopeAmount = 0;
      return;
    }

    if (state.scopeZoom !== this.zoom) this.zoom = state.scopeZoom;
    const radius = apertureRadius(kind, this.zoom, this.height);
    if (Math.abs(radius - this.radius) > 0.5) {
      this.radius = radius;
      setStyle(this.root, '--r', `${radius.toFixed(1)}px`);
    }
    if (this.root.dataset.kind !== kind) this.root.dataset.kind = kind;

    // Opacity is the only per-frame write, and it is quantised so a slow ADS
    // ramp costs a handful of style writes rather than one per frame.
    const eased = smoothstep(0.12, 0.92, this.amount);
    setStyle(this.root, 'opacity', eased.toFixed(2));
    // A hard blackout only makes sense once the eye is behind the tube; below
    // that the surround has to stay see-through or the transition reads as a
    // shutter closing.
    // Thermal is the gunner's sight, not an optic on a rifle: it has no tube to
    // black out and no magnification of its own to read the threshold from.
    const blackout = kind !== 'thermal' && this.zoom >= FULL_BLACKOUT_ZOOM && eased > 0.55;
    setClass(this.mask, 'blackout', blackout);
    setClass(this.vignette, 'dimmed', eased > 0.35);

    state.scope = kind;
    state.scopeAmount = eased;

    if (kind === 'sniper') this.updateReadout();
    this.redraw(kind, radius);
  }

  private updateReadout(): void {
    setText(this.magEl, `${this.zoom.toFixed(1)}X`);
    setText(this.rangeEl, this.range >= 0 ? `${Math.round(this.range)} M` : '--- M');
    // Windage is presented as a turret setting rather than invented weather: the
    // ballistics are hitscan, so anything else would be a lie on the glass.
    setText(this.windEl, 'W 0.0');
  }

  /**
   * Peripheral instrument marks. Static for a given kind and radius, so this
   * runs on a weapon change or a resize and never in the steady state.
   */
  private redraw(kind: ScopeKind, radius: number): void {
    if (kind === this.drawnKind && Math.abs(radius - this.drawnRadius) < 0.5) return;
    this.drawnKind = kind;
    this.drawnRadius = radius;

    const ctx = this.layer.begin();
    const cx = this.layer.width * 0.5;
    const cy = this.layer.height * 0.5;
    const u = clamp(this.layer.height / 90, 6, 18);

    if (kind === 'sniper') this.drawSniperFurniture(ctx, cx, cy, radius, u);
    else if (kind === 'acog') this.drawPrismFurniture(ctx, cx, cy, radius, u);
    else if (kind === 'thermal') this.drawThermalFurniture(ctx, cx, cy, radius, u);
    else this.drawHoloFurniture(ctx, cx, cy, radius, u);
  }

  /**
   * Outside the tube: a graduated bezel with the turret indices a shooter would
   * actually read, and elevation stadia down the left of the frame. Nothing is
   * drawn inside the aperture — that space belongs to the optic's own reticle.
   */
  private drawSniperFurniture(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    u: number,
  ): void {
    const bezel = r * MASK_SLACK;
    ctx.strokeStyle = rgba(COLOR.white, 0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, bezel + u * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Index marks every 15 degrees, longer at the quarters: the turret ring.
    for (let deg = 0; deg < 360; deg += 15) {
      const a = (deg * Math.PI) / 180;
      const major = deg % 90 === 0;
      const inner = bezel + u * 0.5;
      const outer = inner + (major ? u * 1.35 : u * 0.62);
      ctx.strokeStyle = rgba(major ? COLOR.accent : COLOR.white, major ? 0.55 : 0.22);
      ctx.lineWidth = major ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.stroke();
    }

    // Elevation ladder, hanging off the left of the bezel in 100 m steps.
    ctx.font = `400 ${(u * 0.95).toFixed(1)}px ${FONT.mono}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const top = cy - r * 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = top + i * (r * 0.2);
      const x = cx - bezel - u * 2;
      ctx.strokeStyle = rgba(COLOR.white, i % 2 === 0 ? 0.3 : 0.16);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (i % 2 === 0 ? u * 1.2 : u * 0.6), y);
      ctx.stroke();
      if (i % 2 === 0) {
        shadowText(ctx, `${(i + 1) * 100}`, x - u * 0.5, y, rgba(COLOR.white, 0.4));
      }
    }
  }

  /** A prism sight leaves the rifle in shot, so this is only the bell shadow. */
  private drawPrismFurniture(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    u: number,
  ): void {
    ctx.strokeStyle = rgba(COLOR.white, 0.14);
    ctx.lineWidth = u * 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, r * MASK_SLACK + u * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    // Four short witness marks at the cardinals, the housing's own casting lines.
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const inner = r * MASK_SLACK + u * 0.4;
      ctx.strokeStyle = rgba(COLOR.white, 0.3);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * (inner + u), cy + Math.sin(a) * (inner + u));
      ctx.stroke();
    }
  }

  /**
   * A thermal sight is a sensor, so it gets a sensor's frame rather than a tube.
   * The killstreak module already crushes the whole picture to white-hot and
   * draws its own gunnery symbology underneath, so this adds the 4:3 sensor
   * bezel around it and nothing that would sit on the target.
   */
  private drawThermalFurniture(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    u: number,
  ): void {
    const halfH = r * MASK_SLACK;
    const halfW = Math.min(halfH * 4 / 3, cx - u * 2);
    // Rimmed rather than plain: the killstreak module crushes the whole frame to
    // white-hot underneath this, and a thin 45%-white line has nothing left to
    // sit against once the midtones have been taken out of the picture.
    const bright = rgba(COLOR.white, 0.82);
    const corner = u * 2.4;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = cx + sx * halfW;
        const y = cy + sy * halfH;
        outlinedLine(ctx, x - sx * corner, y, x, y, 1.6, bright, 0.7);
        outlinedLine(ctx, x, y, x, y - sy * corner, 1.6, bright, 0.7);
      }
    }
    // Edge-centre index ticks: the sensor's boresight, which is what a gunner
    // walks tracer onto.
    for (const [x0, y0, x1, y1] of [
      [cx, cy - halfH, cx, cy - halfH + u],
      [cx, cy + halfH, cx, cy + halfH - u],
      [cx - halfW, cy, cx - halfW + u, cy],
      [cx + halfW, cy, cx + halfW - u, cy],
    ]) {
      outlinedLine(ctx, x0, y0, x1, y1, 1.2, rgba(COLOR.white, 0.6), 0.7);
    }
    ctx.font = `400 ${(u * 0.95).toFixed(1)}px ${FONT.mono}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    outlinedText(ctx, 'WHOT · FFC AUTO', cx - halfW, cy - halfH - u * 0.9, bright);
  }

  /** A holographic sight has no tube; the only furniture is the window frame. */
  private drawHoloFurniture(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    u: number,
  ): void {
    const w = r * 1.35;
    const h = r * 1.05;
    ctx.strokeStyle = rgba(COLOR.white, 0.2);
    ctx.lineWidth = u * 0.3;
    ctx.strokeRect(cx - w, cy - h, w * 2, h * 2);
  }

  dispose(): void {
    this.layer.dispose();
  }
}

/**
 * Aperture radius in CSS pixels, matching the weapons module's own derivation.
 * Non-magnified optics have no tube on screen, so they fall back to a window
 * sized off the viewport rather than off a magnification they do not have.
 */
function apertureRadius(kind: ScopeKind, zoom: number, viewportHeight: number): number {
  if (kind === 'holo' || kind === 'none') return viewportHeight * 0.17;
  // A gunship sensor owns the frame; it is not an optic sitting on the rifle the
  // player happens to be carrying, so the weapon's magnification says nothing
  // about how big it should be.
  if (kind === 'thermal') return viewportHeight * 0.42;
  const coverage = 0.26 + 0.5 * smoothstep(2, 4.6, zoom);
  return coverage * viewportHeight * 0.5;
}
