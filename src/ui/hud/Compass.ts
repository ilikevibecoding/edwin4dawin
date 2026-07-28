/**
 * The compass strip.
 *
 * A horizontal slice of the horizon: degree ticks, cardinal letters and markers
 * that slide along it as the player turns. Because it is the one element that
 * moves whenever the mouse moves, it is drawn on its own small canvas and only
 * when the heading has actually changed by more than a fifth of a degree.
 */
import { CanvasLayer, div, setText } from '../Dom';
import { COLOR } from '../Theme';
import { FONT } from '../Theme';
import { outlinedLine, outlinedText, rgba } from './Draw';
import { angleDelta } from '../../core/MathUtils';

export type MarkKind = 'objective' | 'landmark' | 'streak' | 'hostile';

export interface CompassMark {
  /** World bearing in radians, clockwise from north (-Z). */
  bearing: number;
  kind: MarkKind;
  label?: string;
}

/** Degrees of horizon visible end to end. Narrower reads as a longer lens. */
const SPAN = 104;
/**
 * Where a mark stops tracking its true bearing and parks at the end of the
 * strip. Set from the wrapper's fade mask, which is transparent for the outer
 * 9% of the width: park a mark any further out than this and the thing telling
 * the player which way to turn is the thing the mask has rubbed out.
 */
const EDGE = SPAN * (0.5 - 0.11);
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
/** Which labels win when two marks land on top of each other. */
const PRIORITY: readonly MarkKind[] = ['objective', 'streak', 'hostile', 'landmark'];

export class Compass {
  readonly root: HTMLDivElement;

  private readonly layer: CanvasLayer;
  private readonly headingEl: HTMLDivElement;
  private marks: readonly CompassMark[] = [];
  /** Flat pairs of drawn label extents, reused each frame to avoid allocating. */
  private readonly spans: number[] = [];
  private lastHeading = Number.NaN;
  private lastMarkStamp = -1;
  private markStamp = 0;
  private dirty = true;
  private unit = 10;
  /**
   * The strip is redrawn on almost every frame the player is turning, so the
   * things that do not depend on the heading are built once per resize instead:
   * a gradient object and two font strings per frame is a steady allocation
   * rate for no reason, and it is the only garbage the HUD would produce.
   */
  private shade: CanvasGradient | null = null;
  private tickFont = '';
  private labelFont = '';
  /** Label widths, which only change when the font size does. */
  private readonly widths = new Map<string, number>();

  constructor(parent: HTMLElement) {
    this.root = div('ob-cmp region-tc', parent);
    const inner = div('ob-cmp-inner', this.root);
    this.layer = new CanvasLayer('ob-cmp-canvas', inner);
    div('ob-cmp-needle', inner);
    this.headingEl = div('ob-cmp-heading', this.root);
  }

  resize(unit: number): void {
    this.unit = unit;
    this.layer.measure(2);
    this.shade = null;
    this.tickFont = `700 ${(unit * 1.28).toFixed(1)}px ${FONT.condensed}`;
    this.labelFont = `600 ${(unit * 1.0).toFixed(1)}px ${FONT.condensed}`;
    this.widths.clear();
    this.dirty = true;
  }

  setMarks(marks: readonly CompassMark[]): void {
    this.marks = marks;
    this.markStamp++;
  }

  update(yaw: number): void {
    // North is -Z and yaw rotates the camera about +Y, so the heading the player
    // is facing is the negation of the yaw.
    const heading = normalizeDeg((-yaw * 180) / Math.PI);
    if (
      !this.dirty &&
      this.markStamp === this.lastMarkStamp &&
      Math.abs(deltaDeg(heading, this.lastHeading)) < 0.2
    ) {
      return;
    }
    this.dirty = false;
    this.lastHeading = heading;
    this.lastMarkStamp = this.markStamp;
    setText(this.headingEl, `${Math.round(heading).toString().padStart(3, '0')}°`);
    this.draw(heading);
  }

  private draw(heading: number): void {
    const ctx = this.layer.begin();
    const w = this.layer.width;
    const h = this.layer.height;
    const perDeg = w / SPAN;
    const u = this.unit;

    // Soft top and bottom falloff rather than a filled bar: the strip has to
    // survive a blown-out sky without reading as a black rectangle bolted to the
    // top of the screen. The ends are faded by the wrapper's mask.
    let shade = this.shade;
    if (!shade) {
      shade = ctx.createLinearGradient(0, 0, 0, h);
      shade.addColorStop(0, 'rgba(6, 9, 12, 0)');
      shade.addColorStop(0.3, 'rgba(6, 9, 12, 0.5)');
      shade.addColorStop(0.86, 'rgba(6, 9, 12, 0.58)');
      shade.addColorStop(1, 'rgba(6, 9, 12, 0)');
      this.shade = shade;
    }
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);

    const baseline = h - 1.5;
    outlinedLine(ctx, 0, baseline, w, baseline, 1, 'rgba(255, 255, 255, 0.3)', 0.5);

    // Marks live in a band above the cardinals, joined to the strip by a stem so
    // it is obvious which bearing they sit on. Stems go down first and the tick
    // labels paint over them.
    const markY = u * 1.8;
    this.drawStems(ctx, w, perDeg, heading, markY, baseline, u);

    const first = Math.floor((heading - SPAN / 2) / 5) * 5;
    const last = heading + SPAN / 2 + 5;
    ctx.font = this.tickFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    for (let deg = first; deg <= last; deg += 5) {
      const x = Math.round(w * 0.5 + deltaDeg(deg, heading) * perDeg) + 0.5;
      if (x < -20 || x > w + 20) continue;
      const norm = normalizeDeg(deg);
      const isCardinal = norm % 45 === 0;
      const isMajor = norm % 15 === 0;
      const height = isCardinal ? u * 1.15 : isMajor ? u * 0.85 : u * 0.5;
      const alpha = isCardinal ? 1 : isMajor ? 0.68 : 0.42;
      outlinedLine(
        ctx,
        x,
        baseline,
        x,
        baseline - height,
        isCardinal ? 1.6 : 1,
        `rgba(255, 255, 255, ${alpha})`,
        0.6,
      );
      if (isCardinal) {
        const label = CARDINALS[(norm / 45) % 8];
        outlinedText(
          ctx,
          label,
          x,
          baseline - height - u * 0.22,
          label === 'N' ? COLOR.accent : COLOR.white,
          u * 0.34,
        );
      }
    }

    // Parked at the ends of the strip so a target behind the player still shows
    // which way to turn. Parked marks become arrows rather than staying diamonds:
    // a diamond sitting still at the end of the strip claims a bearing it does
    // not have, and the player needs to be told to keep turning, not where to
    // stop.
    for (const mark of this.marks) {
      const rel = (angleDelta(headingRad(heading), mark.bearing) * 180) / Math.PI;
      const clamped = Math.max(-EDGE, Math.min(EDGE, rel));
      const x = Math.round(w * 0.5 + clamped * perDeg);
      this.drawMark(ctx, x, markY, mark, Math.abs(rel) > EDGE ? Math.sign(rel) : 0, u);
    }
    this.drawLabels(ctx, w, perDeg, heading, markY, u);
  }

  private drawStems(
    ctx: CanvasRenderingContext2D,
    w: number,
    perDeg: number,
    heading: number,
    markY: number,
    baseline: number,
    u: number,
  ): void {
    for (const mark of this.marks) {
      const rel = (angleDelta(headingRad(heading), mark.bearing) * 180) / Math.PI;
      if (Math.abs(rel) > EDGE) continue;
      const x = Math.round(w * 0.5 + rel * perDeg) + 0.5;
      // Outlined like the ticks: a hairline at 22% alpha vanishes over a blown
      // sky, which is precisely the frame where a bearing matters most.
      outlinedLine(ctx, x, markY + u * 0.72, x, baseline, 1, 'rgba(255, 255, 255, 0.38)', 0.5);
    }
  }

  /**
   * Labels in a second pass, most important first, skipping any that would land
   * on one already printed. An objective and a landmark a few degrees apart
   * otherwise overprint into a single unreadable word.
   */
  private drawLabels(
    ctx: CanvasRenderingContext2D,
    w: number,
    perDeg: number,
    heading: number,
    y: number,
    u: number,
  ): void {
    const spans = this.spans;
    spans.length = 0;
    ctx.font = this.labelFont;
    ctx.textAlign = 'center';

    for (const priority of PRIORITY) {
      for (const mark of this.marks) {
        if (mark.kind !== priority || !mark.label) continue;
        const rel = (angleDelta(headingRad(heading), mark.bearing) * 180) / Math.PI;
        if (Math.abs(rel) > EDGE) continue;
        const x = Math.round(w * 0.5 + rel * perDeg);
        let width = this.widths.get(mark.label);
        if (width === undefined) {
          width = ctx.measureText(mark.label).width;
          this.widths.set(mark.label, width);
        }
        const half = width * 0.5 + u * 0.5;
        let clash = false;
        for (let i = 0; i < spans.length; i += 2) {
          if (x + half > spans[i] && x - half < spans[i + 1]) {
            clash = true;
            break;
          }
        }
        if (clash) continue;
        spans.push(x - half, x + half);
        outlinedText(ctx, mark.label, x, y - u * 0.85, rgba(COLOR.white, 0.95), u * 0.34);
      }
    }
  }

  /** `parked` is 0 on the true bearing, or -1/+1 for a mark held at that end. */
  private drawMark(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    mark: CompassMark,
    parked: number,
    u: number,
  ): void {
    const size = u * 0.44;
    const color =
      mark.kind === 'hostile'
        ? COLOR.danger
        : mark.kind === 'streak'
          ? COLOR.warn
          : mark.kind === 'objective'
            ? COLOR.accent
            : 'rgba(226, 232, 240, 0.75)';
    ctx.save();
    ctx.translate(x, y);
    if (parked !== 0) {
      // Outward-pointing chevron. Kept at full strength: this is the only thing
      // on screen saying the contact exists at all, so dimming it to signal
      // "approximate bearing" trades the whole message for the caveat.
      const w = size * 1.25;
      const h = size * 1.15;
      ctx.beginPath();
      ctx.moveTo(parked * w * 1.35, 0);
      ctx.lineTo(-parked * w * 0.5, -h);
      ctx.lineTo(-parked * w * 0.5, h);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fill();
    } else if (mark.kind === 'landmark') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(-size * 0.75, -size * 0.75, size * 1.5, size * 1.5);
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    } else {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-size - 1, -size - 1, (size + 1) * 2, (size + 1) * 2);
      ctx.fillStyle = color;
      ctx.fillRect(-size, -size, size * 2, size * 2);
    }
    ctx.restore();
  }

  dispose(): void {
    this.layer.dispose();
  }
}

const headingRad = (deg: number): number => (deg * Math.PI) / 180;

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/** Signed shortest difference in degrees. */
function deltaDeg(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
