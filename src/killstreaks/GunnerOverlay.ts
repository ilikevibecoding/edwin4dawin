/**
 * The door gunner's sight.
 *
 * White-hot thermal rather than the tablet's green, on the same compositor path:
 * the tint layer desaturates the frame and the crush layer pushes the contrast up
 * hard, which is what makes a thermal image read — a thermal sight is not a grey
 * picture, it is a picture with the midtones taken out of it.
 *
 * `ui.setScopeOverlay('thermal', 1)` is called alongside this so the HUD can apply
 * its own optic treatment if it has one. The two stack cleanly because this layer
 * sits below `#ui-root`.
 *
 * The symbology is deliberately sparse. A gunner's sight is a reticle, a traverse
 * scale so the player knows how much arc is left before the stops, a range
 * readout, barrel heat and the clock. Everything else is in the way of the target.
 */
import { CrtScreen } from './Overlay';
import { CHOPPER } from './Tuning';

const HOT = '236, 238, 240';
const WARN = '255, 176, 64';
const DANGER = '255, 92, 62';

export interface GunnerFrame {
  yaw: number;
  pitch: number;
  /** 0..1 barrel heat; the gun cuts out at 1. */
  heat: number;
  firing: boolean;
  rounds: number;
  hits: number;
  altitude: number;
  /** Seconds left on station. */
  remaining: number;
  /** Slant range to whatever the gun is pointed at, metres. */
  groundRange: number;
}

export class GunnerOverlay {
  readonly frame: GunnerFrame = {
    yaw: 0,
    pitch: 0,
    heat: 0,
    firing: false,
    rounds: 0,
    hits: 0,
    altitude: 0,
    remaining: 0,
    groundRange: 0,
  };

  private readonly screen = new CrtScreen({
    id: 'ks-gunner',
    tint: '#c8d2d8',
    tintOpacity: 0.96,
    crush: 'contrast(1.75) brightness(0.86) saturate(0.06)',
    scanlinePitch: 4,
    vignette: 0.86,
  });

  mount(): void {
    this.screen.mount();
  }

  unmount(): void {
    this.screen.unmount();
  }

  setOpen(open: boolean): void {
    this.screen.setOpen(open);
  }

  render(dt: number): void {
    const ctx = this.screen.begin(dt);
    if (!ctx) return;
    const w = this.screen.cssWidth;
    const h = this.screen.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const f = this.frame;

    this.drawReticle(ctx, cx, cy, f);
    this.drawTraverse(ctx, w, h, f);
    this.drawChrome(ctx, w, h, f);
  }

  private drawReticle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    f: GunnerFrame,
  ): void {
    const overheated = f.heat >= 1;
    const colour = overheated ? DANGER : HOT;
    ctx.strokeStyle = `rgba(${colour}, 0.92)`;
    ctx.lineWidth = 1.4;

    // Open cross with a gap: a minigun reticle has to leave the aim point clear
    // because the tracer stream is what the player is actually reading.
    const gap = 14;
    const arm = 26;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * gap, cy + dy * gap);
      ctx.lineTo(cx + dx * arm, cy + dy * arm);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(${colour}, 0.42)`;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.stroke();

    // Stadia below the reticle: the drop marks a door gunner would use.
    ctx.strokeStyle = `rgba(${colour}, 0.35)`;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = cy + 46 + i * 22;
      const width = 12 - i * 2;
      ctx.beginPath();
      ctx.moveTo(cx - width, y);
      ctx.lineTo(cx + width, y);
      ctx.stroke();
    }

    if (f.firing && !overheated) {
      // Muzzle bloom washing the bottom of the sight, which is what a thermal
      // camera does when six barrels are going off next to it.
      const gradient = ctx.createRadialGradient(cx, cy + 90, 0, cx, cy + 90, 220);
      gradient.addColorStop(0, `rgba(${HOT}, 0.2)`);
      gradient.addColorStop(1, `rgba(${HOT}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - 240, cy - 140, 480, 340);
    }
  }

  /** Traverse tape across the top: how much arc is left before the stops. */
  private drawTraverse(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    f: GunnerFrame,
  ): void {
    const left = w * 0.5 - 190;
    const width = 380;
    const y = 42;
    const span = CHOPPER.yawMax - CHOPPER.yawMin;
    const t = (f.yaw - CHOPPER.yawMin) / span;

    ctx.strokeStyle = `rgba(${HOT}, 0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
    for (let i = 0; i <= 8; i++) {
      const x = left + (width * i) / 8;
      const long = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + (long ? 8 : 4));
      ctx.stroke();
    }

    const near = t < 0.06 || t > 0.94;
    ctx.fillStyle = `rgba(${near ? WARN : HOT}, 0.95)`;
    const px = left + width * Math.min(1, Math.max(0, t));
    ctx.beginPath();
    ctx.moveTo(px, y - 9);
    ctx.lineTo(px + 5, y - 1);
    ctx.lineTo(px - 5, y - 1);
    ctx.closePath();
    ctx.fill();

    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = `rgba(${HOT}, 0.6)`;
    ctx.fillText('TRAVERSE', w * 0.5, y + 12);

    // Elevation tape down the right edge.
    const pitchSpan = CHOPPER.pitchMax - CHOPPER.pitchMin;
    const pt = (f.pitch - CHOPPER.pitchMin) / pitchSpan;
    const top = h * 0.5 - 110;
    const tall = 220;
    ctx.strokeStyle = `rgba(${HOT}, 0.4)`;
    ctx.beginPath();
    ctx.moveTo(w - 62, top);
    ctx.lineTo(w - 62, top + tall);
    ctx.stroke();
    ctx.fillStyle = `rgba(${HOT}, 0.95)`;
    const py = top + tall * Math.min(1, Math.max(0, pt));
    ctx.beginPath();
    ctx.moveTo(w - 53, py);
    ctx.lineTo(w - 62, py - 5);
    ctx.lineTo(w - 62, py + 5);
    ctx.closePath();
    ctx.fill();
  }

  private drawChrome(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    f: GunnerFrame,
  ): void {
    const inset = 26;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${HOT}, 0.9)`;
    ctx.fillText('DOOR GUN · WHITE HOT', inset, inset + 6);
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${HOT}, 0.62)`;
    ctx.fillText(`ALT ${f.altitude.toFixed(0)} M`, inset, inset + 22);
    ctx.fillText(`RNG ${f.groundRange > 0 ? f.groundRange.toFixed(0) : '---'} M`, inset, inset + 36);
    ctx.fillText(`ROUNDS ${f.rounds}   HITS ${f.hits}`, inset, inset + 50);

    // Station clock, which is the only real pressure the player is under.
    ctx.textAlign = 'right';
    ctx.font = '700 15px "JetBrains Mono", monospace';
    const urgent = f.remaining < 6;
    ctx.fillStyle = `rgba(${urgent ? WARN : HOT}, 0.95)`;
    ctx.fillText(`${f.remaining.toFixed(1)}s`, w - inset, inset + 8);
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${HOT}, 0.55)`;
    ctx.fillText('ON STATION', w - inset, inset + 24);

    // Heat bar. Firing through the stop is not allowed, and the bar is the only
    // warning the player gets.
    const barWidth = 168;
    const barX = w - inset - barWidth;
    const barY = h - inset - 16;
    ctx.strokeStyle = `rgba(${HOT}, 0.45)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, 8);
    ctx.fillStyle = f.heat > 0.75 ? `rgba(${DANGER}, 0.85)` : `rgba(${HOT}, 0.7)`;
    ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * f.heat, 6);
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(${f.heat >= 1 ? DANGER : HOT}, 0.8)`;
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText(f.heat >= 1 ? 'BARRELS COOKED' : 'BARREL HEAT', w - inset, barY - 6);

    ctx.textAlign = 'left';
    ctx.fillStyle = `rgba(${HOT}, 0.6)`;
    ctx.fillText('LMB  FIRE        ESC / RMB  HAND BACK', inset, h - inset);
  }
}
