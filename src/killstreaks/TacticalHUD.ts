import * as THREE from 'three';

/**
 * The targeting mode's instrument panel.
 *
 * ## Why this is a canvas and not more geometry
 *
 * Everything else the targeting view draws is world-space geometry laid on the
 * ground, and that is right for the things that are *about* the ground: the
 * footprint, the run-in axis, the chevrons on the planned craters. It is wrong
 * for everything else. Text laid flat on a street thirty metres below an
 * isometric camera is text seen at a sixty degree slant, foreshortened along
 * one axis, rotating whenever the run-in rotates, and — because it is measured
 * in metres rather than pixels — a different size in every shot. The first
 * version put the bearing, the hostile count and the countdown on the ground
 * next to the box in seven-segment numerals and the result read exactly like
 * what it was: debug output that happened to be green.
 *
 * A targeting interface has a frame, a header, data blocks with rules between
 * them and a prompt bar along the bottom, and all of those are screen furniture.
 * So they are drawn with a 2D context into an offscreen canvas, uploaded as a
 * texture, and composited by the tactical shader over the desaturated frame.
 * That buys real font rendering, hairlines that are actually one pixel wide,
 * and a layout that can be reasoned about in the units it will be seen in.
 *
 * ## Cost
 *
 * The canvas is redrawn only when something on it changes — which during a ten
 * second targeting session is a handful of times, since the readouts are
 * quantised to a tenth of a degree and a tenth of a second — and the upload is
 * one texture the size of the frame buffer's short edge. Between redraws this
 * costs a string comparison per frame.
 */

/** Backing store resolution. Independent of the window; the shader scales it. */
const W = 1280;
const H = 720;

/**
 * Type sizes, in backing-store pixels.
 *
 * Sized against the *capture* rather than against the canvas. A 1280-wide
 * backing store shown in a 960-wide frame is resampled down by a third, so
 * eleven-pixel label type arrives as eight pixels of grey mush with letter
 * spacing on it — which is what the first pass of this panel photographed as,
 * and it is worse than having no labels at all. Nothing here is smaller than
 * fourteen, and the two numbers a player actually reads at a glance — the
 * streak name and the clock — are set at three times that.
 */
const FONT = "600 19px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const FONT_SMALL = "600 15px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const FONT_LABEL = "600 14px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const FONT_BIG = "300 42px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const FONT_HUGE = "300 56px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/** Width of the two data stacks, in backing-store pixels. */
const BLOCK = 360;

/** Screen margin, in backing-store pixels. */
const M = 54;

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export interface HudState {
  /** Streak name, e.g. "CARPET BOMB". */
  title: string;
  /** Ordnance line, e.g. "7 × 500 LB RETARDED". */
  ordnance: string;
  /** Pattern line, e.g. "92 × 26 M". */
  pattern: string;
  /** Run-in bearing in radians. */
  heading: number;
  /** Hostiles inside the footprint. */
  enemies: number;
  /** Overhead clearance, 0..1. */
  sky: number;
  valid: boolean;
  /** Why not, when invalid. */
  reason: string;
  /** Seconds before the streak is handed back. */
  secondsLeft: number;
  /** Where the aim point is on screen, in 0..1 with y down. -1 when off. */
  markerX: number;
  markerY: number;
  /** Ground range from the player to the aim point, metres. */
  range: number;
}

export class TacticalHUD {
  private readonly canvas: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;

  /** Last painted state, hashed, so a still frame does not repaint. */
  private signature = '';
  private accent = '#7dffb0';
  private dim = '#9fd6c4';

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    const g = this.canvas.getContext('2d', { alpha: true });
    if (!g) throw new Error('killstreaks: 2D context unavailable for the tactical HUD');
    this.g = g;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.name = 'killstreak.tacticalHud';
    // Left untagged and decoded by hand in the shader. A raw `ShaderMaterial`
    // gets none of three's automatic colour-space handling, so tagging this
    // sRGB would change nothing except to make the sampling silently wrong.
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  /**
   * Repaints if anything visible has changed.
   *
   * The signature is deliberately coarse — the marker to the nearest half
   * percent of the screen, the bearing to the degree, the clock to the tenth —
   * because the alternative is a full 2D repaint every frame for changes no
   * one can see.
   */
  update(s: HudState): void {
    const signature =
      `${s.title}|${s.ordnance}|${s.pattern}|${Math.round((s.heading * 180) / Math.PI)}|` +
      `${s.enemies}|${Math.round(s.sky * 20)}|${s.valid ? 1 : 0}|${s.reason}|` +
      `${Math.round(s.secondsLeft * 10)}|${Math.round(s.markerX * 200)}|` +
      `${Math.round(s.markerY * 200)}|${Math.round(s.range)}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.paint(s);
    this.texture.needsUpdate = true;
  }

  /** Forces the next `update` to repaint, after a resize or a mode change. */
  invalidate(): void {
    this.signature = '';
  }

  /* -------------------------------- paint --------------------------------- */

  private paint(s: HudState): void {
    const g = this.g;
    g.clearRect(0, 0, W, H);
    this.accent = s.valid ? '#8effc0' : '#ff6b52';
    this.dim = s.valid ? 'rgba(150,225,200,0.62)' : 'rgba(255,150,130,0.62)';

    g.lineCap = 'butt';
    g.lineJoin = 'miter';
    g.textBaseline = 'alphabetic';

    this.frame();
    this.header(s);
    this.compass(s.heading);
    this.leftBlock(s);
    this.rightBlock(s);
    this.marker(s);
    this.prompt(s);
  }

  /** Corner brackets and the hairline rules that carry the layout. */
  private frame(): void {
    const g = this.g;
    const arm = 38;
    g.strokeStyle = 'rgba(198,240,255,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = i % 2 === 0 ? M : W - M;
      const y = i < 2 ? M : H - M;
      const sx = i % 2 === 0 ? 1 : -1;
      const sy = i < 2 ? 1 : -1;
      g.moveTo(x + sx * arm, y);
      g.lineTo(x, y);
      g.lineTo(x, y + sy * arm);
    }
    g.stroke();

    // Ticks along the frame edge. Free graduation, and they are what stop the
    // brackets reading as four disconnected corners.
    g.strokeStyle = 'rgba(198,240,255,0.24)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 1; i < 24; i++) {
      const x = M + ((W - 2 * M) * i) / 24;
      const long = i % 4 === 0 ? 9 : 4;
      g.moveTo(x, M);
      g.lineTo(x, M + long);
      g.moveTo(x, H - M);
      g.lineTo(x, H - M - long);
    }
    for (let i = 1; i < 12; i++) {
      const y = M + ((H - 2 * M) * i) / 12;
      const long = i % 3 === 0 ? 9 : 4;
      g.moveTo(M, y);
      g.lineTo(M + long, y);
      g.moveTo(W - M, y);
      g.lineTo(W - M - long, y);
    }
    g.stroke();
  }

  private header(s: HudState): void {
    const g = this.g;
    const y = M + 52;

    g.fillStyle = 'rgba(198,240,255,0.62)';
    g.font = FONT_LABEL;
    g.letterSpacing = '4px';
    g.fillText('TACTICAL STRIKE INTERFACE', M + 2, y - 34);
    g.letterSpacing = '0px';

    g.fillStyle = this.accent;
    g.font = FONT_BIG;
    g.letterSpacing = '2px';
    g.fillText(s.title, M, y + 6);
    g.letterSpacing = '0px';

    const width = g.measureText(s.title).width;
    g.strokeStyle = this.dim;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(M, y + 20);
    g.lineTo(M + Math.max(BLOCK, width + 24), y + 20);
    g.stroke();
  }

  /**
   * The run-in ribbon.
   *
   * A strip of the compass a hundred and twenty degrees wide, centred on the
   * chosen bearing, with a caret under the middle. This is the element that
   * makes the heading control legible: rotating the run-in slides the whole
   * ribbon under a fixed pointer, which is what every aircraft in the world
   * does and what no amount of a rotating arrow on the ground conveys.
   */
  private compass(heading: number): void {
    const g = this.g;
    const cx = W * 0.5;
    const top = M + 8;
    const half = 250;
    const span = 60; // degrees either side of centre
    const perDeg = half / span;

    let bearing = ((heading * 180) / Math.PI) % 360;
    if (bearing < 0) bearing += 360;

    g.save();
    g.beginPath();
    g.rect(cx - half, top - 4, half * 2, 46);
    g.clip();

    g.strokeStyle = 'rgba(198,240,255,0.4)';
    g.fillStyle = 'rgba(198,240,255,0.72)';
    g.lineWidth = 1;
    g.textAlign = 'center';

    const first = Math.ceil((bearing - span) / 5) * 5;
    for (let d = first; d <= bearing + span; d += 5) {
      const x = cx + (d - bearing) * perDeg;
      const norm = ((d % 360) + 360) % 360;
      const major = norm % 45 === 0;
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x, top + (major ? 14 : 7));
      g.stroke();
      if (!major) continue;
      g.font = FONT_SMALL;
      g.fillText(CARDINALS[(norm / 45) % 8], x, top + 30);
    }
    g.restore();

    // Fade the ends so the ribbon does not stop dead at a hard edge.
    const fade = g.createLinearGradient(cx - half, 0, cx + half, 0);
    fade.addColorStop(0, 'rgba(11,16,20,1)');
    fade.addColorStop(0.14, 'rgba(11,16,20,0)');
    fade.addColorStop(0.86, 'rgba(11,16,20,0)');
    fade.addColorStop(1, 'rgba(11,16,20,1)');
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = fade;
    g.fillRect(cx - half, top - 6, half * 2, 50);
    g.restore();

    // The pointer, and the bearing spelled out under it.
    g.fillStyle = this.accent;
    g.beginPath();
    g.moveTo(cx, top + 20);
    g.lineTo(cx - 8, top + 6);
    g.lineTo(cx + 8, top + 6);
    g.closePath();
    g.fill();

    g.font = FONT;
    g.textAlign = 'center';
    g.fillText(`RUN-IN ${pad(Math.round(bearing) % 360, 3)}`, cx, top + 52);
    g.textAlign = 'left';
  }

  /** Weapon and pattern, down the left. */
  private leftBlock(s: HudState): void {
    const g = this.g;
    const x = M;
    let y = H - M - 168;
    const rows: Array<[string, string]> = [
      ['ORDNANCE', s.ordnance],
      ['PATTERN', s.pattern],
      ['RANGE', `${Math.round(s.range)} M`],
    ];
    g.strokeStyle = 'rgba(198,240,255,0.3)';
    g.lineWidth = 1;
    for (const [label, value] of rows) {
      g.beginPath();
      g.moveTo(x, y + 8);
      g.lineTo(x + BLOCK, y + 8);
      g.stroke();
      g.font = FONT_LABEL;
      g.fillStyle = 'rgba(198,240,255,0.62)';
      g.letterSpacing = '2px';
      g.fillText(label, x, y);
      g.letterSpacing = '0px';
      g.font = FONT;
      g.fillStyle = 'rgba(232,250,255,0.98)';
      g.textAlign = 'right';
      g.fillText(value, x + BLOCK, y);
      g.textAlign = 'left';
      y += 48;
    }
  }

  /** Clearance, hostiles and the go/no-go, down the right. */
  private rightBlock(s: HudState): void {
    const g = this.g;
    const right = W - M;
    let y = H - M - 168;

    g.textAlign = 'right';
    g.strokeStyle = 'rgba(198,240,255,0.3)';
    g.lineWidth = 1;

    const rows: Array<[string, string, string]> = [
      ['OVERHEAD', `${Math.round(s.sky * 100)}%`, s.sky >= 0.45 ? this.accent : '#ff6b52'],
      ['HOSTILES IN BOX', pad(s.enemies, 2), s.enemies > 0 ? '#ffd166' : 'rgba(232,250,255,0.98)'],
    ];
    for (const [label, value, color] of rows) {
      g.beginPath();
      g.moveTo(right - BLOCK, y + 8);
      g.lineTo(right, y + 8);
      g.stroke();
      g.font = FONT_LABEL;
      g.fillStyle = 'rgba(198,240,255,0.62)';
      g.letterSpacing = '2px';
      g.textAlign = 'left';
      g.fillText(label, right - BLOCK, y);
      g.letterSpacing = '0px';
      g.textAlign = 'right';
      g.font = FONT;
      g.fillStyle = color;
      g.fillText(value, right, y);
      y += 48;
    }

    // The verdict, in a box, because it is the one thing on the panel the
    // player has to read in peripheral vision while the reticle is moving.
    const text = s.valid ? 'CLEARED HOT' : s.reason || 'NO CLEARANCE';
    g.font = FONT;
    g.letterSpacing = '3px';
    const w = g.measureText(text).width + 40;
    const boxY = y - 6;
    g.fillStyle = s.valid ? 'rgba(60,190,120,0.18)' : 'rgba(220,70,50,0.22)';
    g.fillRect(right - w, boxY, w, 40);
    g.strokeStyle = this.accent;
    g.lineWidth = 2;
    g.strokeRect(right - w, boxY, w, 40);
    g.fillStyle = this.accent;
    g.textAlign = 'right';
    g.fillText(text, right - 20, boxY + 28);
    g.letterSpacing = '0px';
    g.textAlign = 'left';
  }

  /**
   * The reticle bracket and its leader.
   *
   * Drawn where the aim point projects on screen, and tied back to the panel
   * with an elbowed leader line. The leader is the whole point: without it the
   * bracket and the data block are two unrelated things in the same frame,
   * and with it the panel is visibly *about* the box on the ground.
   */
  private marker(s: HudState): void {
    if (s.markerX < 0 || s.markerX > 1 || s.markerY < 0 || s.markerY > 1) return;
    const g = this.g;
    const x = s.markerX * W;
    const y = s.markerY * H;
    const r = 54;

    g.strokeStyle = this.accent;
    g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const sx = i % 2 === 0 ? -1 : 1;
      const sy = i < 2 ? -1 : 1;
      g.moveTo(x + sx * r, y + sy * (r - 18));
      g.lineTo(x + sx * r, y + sy * r);
      g.lineTo(x + sx * (r - 18), y + sy * r);
    }
    g.stroke();

    // Elbowed leader out to the right margin, at the height of the verdict.
    const toY = H - M - 168;
    const elbow = Math.min(W - M - BLOCK - 20, x + 120);
    g.strokeStyle = this.dim;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x + r + 8, y);
    g.lineTo(elbow, y);
    g.lineTo(elbow, toY - 24);
    g.lineTo(W - M - BLOCK, toY - 24);
    g.stroke();

    g.fillStyle = this.dim;
    g.beginPath();
    g.arc(x + r + 8, y, 4, 0, Math.PI * 2);
    g.fill();
  }

  /** The countdown and the key prompts, along the bottom. */
  private prompt(s: HudState): void {
    const g = this.g;
    const y = H - M - 24;

    // Countdown. Large, left of the bar, with the bar depleting beside it.
    g.font = FONT_HUGE;
    g.fillStyle = s.secondsLeft < 3 ? '#ff6b52' : this.accent;
    const clock = s.secondsLeft.toFixed(1);
    g.fillText(clock, M, y + 14);
    const clockW = g.measureText(clock).width;

    g.font = FONT_LABEL;
    g.fillStyle = 'rgba(198,240,255,0.62)';
    g.letterSpacing = '2px';
    g.fillText('SEC', M + clockW + 10, y + 14);
    g.letterSpacing = '0px';

    const barX = M + clockW + 66;
    const barW = W - M - barX - 470;
    g.fillStyle = 'rgba(198,240,255,0.16)';
    g.fillRect(barX, y + 2, barW, 10);
    g.fillStyle = this.accent;
    g.fillRect(barX, y + 2, barW * Math.max(0, Math.min(1, s.secondsLeft / 10)), 10);

    g.font = FONT_SMALL;
    g.fillStyle = 'rgba(232,250,255,0.9)';
    g.letterSpacing = '2px';
    g.textAlign = 'right';
    g.fillText('FIRE CONFIRM     WHEEL ROTATE RUN-IN     ESC ABORT', W - M, y + 12);
    g.textAlign = 'left';
    g.letterSpacing = '0px';
  }

  dispose(): void {
    this.texture.dispose();
  }
}

function pad(value: number, digits: number): string {
  const n = Math.max(0, Math.round(value));
  return n.toString().padStart(digits, '0');
}
