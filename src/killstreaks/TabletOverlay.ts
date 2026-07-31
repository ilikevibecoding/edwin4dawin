/**
 * The targeting tablet's screen.
 *
 * The world imagery is the real level, rendered by the render system from a
 * high camera — that is what makes the tablet show the map the player is actually
 * standing in rather than a schematic of it. `CrtScreen` handles turning that
 * frame monochrome green and putting a CRT through it; everything here is the
 * vector symbology drawn on top.
 *
 * Symbology is 2D canvas: grid and coordinates, compass rose, range rings from
 * the player, enemy blips, landmark labels, the run-in axis with its ordnance
 * footprint, and the reticle. Per-frame data is written into pre-allocated buffers
 * by `Targeting`, so a frame of tablet costs no garbage.
 */
import { CrtScreen } from './Overlay';

const PRIMARY = '125, 255, 168';
const DANGER = '255, 92, 62';
const WARN = '255, 208, 74';

export interface TabletFrame {
  cssWidth: number;
  cssHeight: number;
  /** Reticle position in CSS pixels. */
  reticleX: number;
  reticleY: number;
  headingDeg: number;
  headingText: string;
  gridText: string;
  rangeText: string;
  ordnanceText: string;
  hostileCount: number;
  tooClose: boolean;
  offMap: boolean;
  /** Player position on screen, or negative when off screen. */
  playerX: number;
  playerY: number;
  /** Run-in axis endpoints, CSS pixels. */
  runInAX: number;
  runInAY: number;
  runInBX: number;
  runInBY: number;
  /** Ordnance footprint outline, x/y pairs. */
  footprint: Float32Array;
  footprintCount: number;
  /** Individual aim points along the axis, x/y pairs. */
  aimPoints: Float32Array;
  aimPointCount: number;
  /** Enemy contacts: x, y, strength triples. */
  blips: Float32Array;
  blipCount: number;
  /** Landmark ticks: x, y pairs, with parallel text. */
  labels: Float32Array;
  labelText: string[];
  labelCount: number;
  /** Grid lines: x1, y1, x2, y2 quads. */
  gridLines: Float32Array;
  gridLineCount: number;
  /** Grid coordinate labels: x, y pairs, with parallel text. */
  gridLabels: Float32Array;
  gridLabelText: string[];
  gridLabelCount: number;
  /** Range rings around the player: 8 x/y pairs per ring outline. */
  rings: Float32Array;
  ringRadii: Float32Array;
  ringCount: number;
  /** 0..1 flash on confirm. */
  confirmFlash: number;
  /** 0..1 boot-in progress, drives the wipe. */
  boot: number;
}

const MAX_BLIPS = 48;
const MAX_LABELS = 40;
const MAX_GRID_LINES = 48;
const MAX_RINGS = 4;
/** Samples around the footprint ellipse. */
export const FOOTPRINT_SAMPLES = 48;

export function createTabletFrame(): TabletFrame {
  return {
    cssWidth: 1,
    cssHeight: 1,
    reticleX: 0,
    reticleY: 0,
    headingDeg: 0,
    headingText: '000 N',
    gridText: '---',
    rangeText: '0 M',
    ordnanceText: '',
    hostileCount: 0,
    tooClose: false,
    offMap: false,
    playerX: -1,
    playerY: -1,
    runInAX: 0,
    runInAY: 0,
    runInBX: 0,
    runInBY: 0,
    footprint: new Float32Array(FOOTPRINT_SAMPLES * 2),
    footprintCount: 0,
    aimPoints: new Float32Array(16 * 2),
    aimPointCount: 0,
    blips: new Float32Array(MAX_BLIPS * 3),
    blipCount: 0,
    labels: new Float32Array(MAX_LABELS * 2),
    labelText: new Array<string>(MAX_LABELS).fill(''),
    labelCount: 0,
    gridLines: new Float32Array(MAX_GRID_LINES * 4),
    gridLineCount: 0,
    gridLabels: new Float32Array(MAX_GRID_LINES * 2),
    gridLabelText: new Array<string>(MAX_GRID_LINES).fill(''),
    gridLabelCount: 0,
    rings: new Float32Array(MAX_RINGS * 32 * 2),
    ringRadii: new Float32Array(MAX_RINGS),
    ringCount: 0,
    confirmFlash: 0,
    boot: 0,
  };
}

export const TABLET_LIMITS = {
  blips: MAX_BLIPS,
  labels: MAX_LABELS,
  gridLines: MAX_GRID_LINES,
  rings: MAX_RINGS,
  ringSamples: 32,
} as const;

export class TabletOverlay {
  readonly frame = createTabletFrame();

  private readonly screen = new CrtScreen({
    id: 'ks-tablet',
    tint: '#2bff86',
    tintOpacity: 0.88,
    crush: 'contrast(1.3) brightness(0.78) saturate(0.28)',
    scanlinePitch: 3,
    vignette: 0.72,
  });

  /** Placed label boxes for this frame: x, y, w, h quads. */
  private readonly labelBoxes = new Float32Array(MAX_LABELS * 4);

  private get time(): number {
    return this.screen.time;
  }

  get isOpen(): boolean {
    return this.screen.isOpen;
  }

  mount(): void {
    this.screen.mount();
    this.syncSize();
  }

  unmount(): void {
    this.screen.unmount();
  }

  setOpen(open: boolean): void {
    this.screen.setOpen(open);
    this.syncSize();
  }

  private syncSize(): void {
    this.frame.cssWidth = this.screen.cssWidth;
    this.frame.cssHeight = this.screen.cssHeight;
  }

  render(dt: number): void {
    const ctx = this.screen.begin(dt);
    if (!ctx) return;
    this.syncSize();

    const f = this.frame;
    const w = f.cssWidth;
    const h = f.cssHeight;
    const boot = f.boot;
    if (boot < 1) {
      // Boot wipe: the symbology draws in from the top as the uplink comes up.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h * boot);
      ctx.clip();
    }

    this.drawGrid(ctx, f);
    this.drawRings(ctx, f);
    this.drawLandmarks(ctx, f);
    this.drawRunIn(ctx, f);
    this.drawBlips(ctx, f);
    this.drawPlayer(ctx, f);
    this.drawReticle(ctx, f);

    if (boot < 1) {
      ctx.restore();
      ctx.strokeStyle = `rgba(${PRIMARY}, 0.85)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * boot);
      ctx.lineTo(w, h * boot);
      ctx.stroke();
    }

    this.drawChrome(ctx, f);
    this.drawCompass(ctx, f);
    this.drawSweep(ctx, f);
    this.drawGlitch(ctx, f);

    if (f.confirmFlash > 0.001) {
      ctx.fillStyle = `rgba(${PRIMARY}, ${0.28 * f.confirmFlash})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // -------------------------------------------------------------------------

  private drawGrid(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${PRIMARY}, 0.16)`;
    ctx.beginPath();
    for (let i = 0; i < f.gridLineCount; i++) {
      const o = i * 4;
      ctx.moveTo(f.gridLines[o], f.gridLines[o + 1]);
      ctx.lineTo(f.gridLines[o + 2], f.gridLines[o + 3]);
    }
    ctx.stroke();

    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${PRIMARY}, 0.5)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < f.gridLabelCount; i++) {
      const o = i * 2;
      ctx.fillText(f.gridLabelText[i], f.gridLabels[o], f.gridLabels[o + 1]);
    }
  }

  private drawRings(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    if (f.ringCount === 0) return;
    const samples = TABLET_LIMITS.ringSamples;
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    for (let r = 0; r < f.ringCount; r++) {
      ctx.strokeStyle = `rgba(${PRIMARY}, ${r === 0 ? 0.5 : 0.26})`;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const o = (r * samples + (i % samples)) * 2;
        const x = f.rings[o];
        const y = f.rings[o + 1];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${PRIMARY}, 0.45)`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < f.ringCount; r++) {
      const o = (r * TABLET_LIMITS.ringSamples) * 2;
      ctx.fillText(`${f.ringRadii[r]}M`, f.rings[o] + 4, f.rings[o + 1]);
    }
  }

  /**
   * Landmark ticks always draw; the names only draw where they fit. Thirty-eight
   * names over a 144 m map overlap into an unreadable mat otherwise, and a
   * half-legible label is worse than no label on a surface the player is reading
   * under time pressure.
   */
  private drawLandmarks(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let placed = 0;
    for (let i = 0; i < f.labelCount; i++) {
      const o = i * 2;
      const x = f.labels[o];
      const y = f.labels[o + 1];
      ctx.strokeStyle = `rgba(${PRIMARY}, 0.45)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();

      const text = f.labelText[i];
      const bx = x + 6;
      const by = y - 5;
      const bw = text.length * 5.6;
      const bh = 10;
      if (this.labelCollides(bx, by, bw, bh, placed)) continue;
      const b = placed * 4;
      this.labelBoxes[b] = bx;
      this.labelBoxes[b + 1] = by;
      this.labelBoxes[b + 2] = bw;
      this.labelBoxes[b + 3] = bh;
      placed++;

      ctx.fillStyle = `rgba(${PRIMARY}, 0.62)`;
      ctx.fillText(text, bx, y + 0.5);
    }
  }

  private labelCollides(x: number, y: number, w: number, h: number, placed: number): boolean {
    for (let i = 0; i < placed; i++) {
      const b = i * 4;
      if (x > this.labelBoxes[b] + this.labelBoxes[b + 2]) continue;
      if (x + w < this.labelBoxes[b]) continue;
      if (y > this.labelBoxes[b + 1] + this.labelBoxes[b + 3]) continue;
      if (y + h < this.labelBoxes[b + 1]) continue;
      return true;
    }
    return false;
  }

  private drawRunIn(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    const danger = f.tooClose;
    const colour = danger ? DANGER : WARN;

    // Ordnance footprint: an elongated ellipse along the run-in axis.
    if (f.footprintCount > 2) {
      ctx.beginPath();
      for (let i = 0; i < f.footprintCount; i++) {
        const o = i * 2;
        if (i === 0) ctx.moveTo(f.footprint[o], f.footprint[o + 1]);
        else ctx.lineTo(f.footprint[o], f.footprint[o + 1]);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(${colour}, 0.13)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${colour}, 0.72)`;
      ctx.lineWidth = 1.25;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Run-in axis, dashed, with the direction of flight marked.
    ctx.strokeStyle = `rgba(${colour}, 0.85)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(f.runInAX, f.runInAY);
    ctx.lineTo(f.runInBX, f.runInBY);
    ctx.stroke();
    ctx.setLineDash([]);

    const dx = f.runInBX - f.runInAX;
    const dy = f.runInBY - f.runInAY;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    // Three chevrons along the axis, pointing the way the aircraft fly.
    ctx.strokeStyle = `rgba(${colour}, 0.9)`;
    ctx.lineWidth = 1.5;
    for (const t of [0.18, 0.5, 0.82]) {
      const cx = f.runInAX + dx * t;
      const cy = f.runInAY + dy * t;
      ctx.beginPath();
      ctx.moveTo(cx - ux * 7 - uy * 5, cy - uy * 7 + ux * 5);
      ctx.lineTo(cx + ux * 6, cy + uy * 6);
      ctx.lineTo(cx - ux * 7 + uy * 5, cy - uy * 7 - ux * 5);
      ctx.stroke();
    }

    // Aim points: one tick per bomb.
    ctx.fillStyle = `rgba(${colour}, 0.85)`;
    for (let i = 0; i < f.aimPointCount; i++) {
      const o = i * 2;
      ctx.beginPath();
      ctx.arc(f.aimPoints[o], f.aimPoints[o + 1], 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBlips(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    for (let i = 0; i < f.blipCount; i++) {
      const o = i * 3;
      const x = f.blips[o];
      const y = f.blips[o + 1];
      const strength = f.blips[o + 2];
      if (strength <= 0.01) continue;
      const size = 4 + strength * 2;
      ctx.fillStyle = `rgba(${DANGER}, ${0.35 + strength * 0.55})`;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(${DANGER}, ${strength * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, size + 4 + (1 - strength) * 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    if (f.playerX < 0) return;
    const x = f.playerX;
    const y = f.playerY;
    ctx.strokeStyle = `rgba(${PRIMARY}, 0.95)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${PRIMARY}, 0.8)`;
    ctx.textAlign = 'left';
    ctx.fillText('OWN', x + 12, y + 0.5);
  }

  private drawReticle(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    const x = f.reticleX;
    const y = f.reticleY;
    const danger = f.tooClose || f.offMap;
    const colour = danger ? DANGER : PRIMARY;
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 6);

    ctx.strokeStyle = `rgba(${colour}, ${danger ? pulse : 0.95})`;
    ctx.lineWidth = 1.4;
    // Corner brackets rather than a cross: it stays readable over the footprint.
    const r = 16;
    const arm = 7;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * r, y + sy * r - sy * arm);
      ctx.lineTo(x + sx * r, y + sy * r);
      ctx.lineTo(x + sx * r - sx * arm, y + sy * r);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.stroke();

    // Readout block pinned to the reticle.
    const lines = [
      `GRID ${f.gridText}`,
      `HDG ${f.headingText}`,
      `RNG ${f.rangeText}`,
      `HOSTILES ${f.hostileCount}`,
    ];
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const boxX = x + r + 8;
    const boxY = y - 26;
    ctx.fillStyle = 'rgba(0, 12, 6, 0.5)';
    ctx.fillRect(boxX, boxY, 116, 56);
    ctx.strokeStyle = `rgba(${colour}, 0.5)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, 116, 56);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = `rgba(${PRIMARY}, 0.85)`;
      ctx.fillText(lines[i], boxX + 7, boxY + 11 + i * 12);
    }

    if (f.tooClose) {
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(${DANGER}, ${pulse})`;
      ctx.textAlign = 'center';
      ctx.fillText('TOO CLOSE — DANGER CLOSE ABORT', x, y + r + 22);
    } else if (f.offMap) {
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(${DANGER}, ${pulse})`;
      ctx.textAlign = 'center';
      ctx.fillText('OUTSIDE AREA OF OPERATIONS', x, y + r + 22);
    }
  }

  private drawChrome(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    const w = f.cssWidth;
    const h = f.cssHeight;

    ctx.strokeStyle = `rgba(${PRIMARY}, 0.55)`;
    ctx.lineWidth = 1.5;
    const inset = 18;
    const arm = 26;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const cx = sx < 0 ? inset : w - inset;
      const cy = sy < 0 ? inset : h - inset;
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * -arm);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * -arm, cy);
      ctx.stroke();
    }

    // Clear of the HUD's minimap, which owns the top-left corner and stays up
    // while the tablet is open.
    const headerX = Math.max(inset + 10, 236);
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgba(${PRIMARY}, 0.9)`;
    ctx.fillText('TACTICAL UPLINK · FIRE MISSION', headerX, inset + 22);
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${PRIMARY}, 0.6)`;
    ctx.fillText(f.ordnanceText, headerX, inset + 38);
    ctx.fillText(
      `LINK ${(85 + Math.sin(this.time * 3.1) * 6).toFixed(0)}% · ${
        f.tooClose ? 'FIRE MISSION REFUSED' : 'READY TO COMMIT'
      }`,
      headerX,
      inset + 52,
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(${PRIMARY}, 0.55)`;
    ctx.fillText(`CONTACTS ${f.hostileCount}`, w - inset - 10, h - inset - 34);
    ctx.fillText(`HDG ${f.headingText}`, w - inset - 10, h - inset - 20);

    ctx.textAlign = 'center';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${PRIMARY}, 0.72)`;
    ctx.fillText(
      'LMB  COMMIT       SCROLL  RUN-IN HEADING       RMB / ESC  ABORT',
      w * 0.5,
      h - inset - 20,
    );
  }

  private drawCompass(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    const w = f.cssWidth;
    const cx = w - 88;
    const cy = 96;
    const r = 44;

    ctx.strokeStyle = `rgba(${PRIMARY}, 0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
    ctx.stroke();

    // Ticks every ten degrees, long every thirty. The view is north-up, so the
    // rose is fixed and the needle carries the run-in heading.
    for (let a = 0; a < 360; a += 10) {
      const rad = (a * Math.PI) / 180;
      const long = a % 30 === 0;
      const inner = r - (long ? 10 : 5);
      ctx.strokeStyle = `rgba(${PRIMARY}, ${long ? 0.6 : 0.3})`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(rad) * inner, cy - Math.cos(rad) * inner);
      ctx.lineTo(cx + Math.sin(rad) * r, cy - Math.cos(rad) * r);
      ctx.stroke();
    }

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${PRIMARY}, 0.85)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [label, angle] of [
      ['N', 0],
      ['E', 90],
      ['S', 180],
      ['W', 270],
    ] as const) {
      const rad = (angle * Math.PI) / 180;
      ctx.fillText(label, cx + Math.sin(rad) * (r - 18), cy - Math.cos(rad) * (r - 18));
    }

    // Needle: the bearing the aircraft come from, with the tail showing egress.
    const rad = (f.headingDeg * Math.PI) / 180;
    ctx.strokeStyle = `rgba(${WARN}, 0.95)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - Math.sin(rad) * (r - 12), cy + Math.cos(rad) * (r - 12));
    ctx.lineTo(cx + Math.sin(rad) * (r - 12), cy - Math.cos(rad) * (r - 12));
    ctx.stroke();
    ctx.fillStyle = `rgba(${WARN}, 0.95)`;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(rad) * (r - 12), cy - Math.cos(rad) * (r - 12), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Radar-style refresh band sweeping down the screen. */
  private drawSweep(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    const h = f.cssHeight;
    const y = ((this.time * 0.36) % 1) * h;
    const band = 90;
    const gradient = ctx.createLinearGradient(0, y - band, 0, y + band * 0.25);
    gradient.addColorStop(0, `rgba(${PRIMARY}, 0)`);
    gradient.addColorStop(0.82, `rgba(${PRIMARY}, 0.05)`);
    gradient.addColorStop(1, `rgba(${PRIMARY}, 0.16)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - band, f.cssWidth, band * 1.25);
  }

  /** Occasional torn scanlines. Cheap, and it stops the frame looking like SVG. */
  private drawGlitch(ctx: CanvasRenderingContext2D, f: TabletFrame): void {
    const seed = Math.floor(this.time * 7);
    const noise = (n: number): number => {
      const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    ctx.fillStyle = `rgba(${PRIMARY}, 0.07)`;
    for (let i = 0; i < 3; i++) {
      if (noise(i) < 0.55) continue;
      const y = noise(i + 11) * f.cssHeight;
      ctx.fillRect(0, y, f.cssWidth, 1 + noise(i + 23) * 2);
    }
  }
}
