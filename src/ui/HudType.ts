/**
 * HUD type system.
 *
 * There is no network in this build, so a webfont never arrives and every
 * `font-family` in the HUD silently resolves to whatever the platform's
 * default sans happens to be. Two consequences follow, and both are handled
 * here rather than scattered through the draw code.
 *
 * First, the *voice* of the display cannot come from a typeface, so it comes
 * from setting instead: everything is uppercase, tracked wide, and drawn small
 * against generous space. That reads as instrumentation on any sans-serif.
 *
 * Second, the numbers that the player actually reads under pressure — the
 * magazine count, the strike countdown, health — are drawn as vector paths.
 * A chamfered technical numeral is unmistakably on-brand, is identical on
 * every machine, and stays crisp at any size, which is exactly what a system
 * font fallback cannot promise.
 */

export const INK = '233,238,242';
export const AMBER = '214,167,74';
export const DIM = '150,161,171';
export const BAD = '226,74,54';
export const GOOD = '124,204,148';
export const PANEL = '9,12,14';

export const FONT_STACK =
  "'Rajdhani','Barlow Condensed','Oswald','Roboto Condensed'," +
  "'Liberation Sans Narrow','DejaVu Sans Condensed',ui-sans-serif,system-ui,sans-serif";

export function rgba(colour: string, alpha: number): string {
  return `rgba(${colour},${alpha})`;
}

/**
 * Sets a tracked, uppercase-friendly face.
 * `weight` 400..700, `size` in CSS px, `track` in px.
 */
export function setType(
  g: CanvasRenderingContext2D,
  size: number,
  weight = 600,
  track = 0,
): void {
  g.font = `${weight} ${Math.round(size)}px ${FONT_STACK}`;
  g.letterSpacing = `${track.toFixed(2)}px`;
}

export function clearTracking(g: CanvasRenderingContext2D): void {
  g.letterSpacing = '0px';
}

/**
 * Chamfered technical numerals, authored as centre-line polylines on a
 * 0.62 x 1.0 grid and stroked. Every corner is cut at 45 degrees, which is
 * what gives instrument faces their machined look, and stroking rather than
 * filling outlines keeps the glyph set to a few dozen coordinates.
 */
type Glyph = { paths: number[][][]; advance: number };

const D = 0.06; // left inset
const R = 0.56; // right edge
const T = 0.06; // top
const B = 0.94; // bottom
const C = 0.14; // chamfer size

const GLYPHS: Record<string, Glyph> = {
  '0': {
    advance: 0.72,
    paths: [[
      [D, T + C], [D + C, T], [R - C, T], [R, T + C],
      [R, B - C], [R - C, B], [D + C, B], [D, B - C], [D, T + C],
    ]],
  },
  '1': {
    advance: 0.52,
    paths: [
      [[0.08, 0.26], [0.30, T], [0.30, B]],
      [[0.10, B], [0.52, B]],
    ],
  },
  '2': {
    advance: 0.72,
    paths: [[
      [D, T + C], [D + C, T], [R - C, T], [R, T + C],
      [R, 0.36], [D, B], [R, B],
    ]],
  },
  '3': {
    advance: 0.72,
    paths: [
      [[D, T], [R, T], [0.30, 0.44]],
      [[0.26, 0.44], [R - C, 0.44], [R, 0.44 + C], [R, B - C], [R - C, B], [D + C, B], [D, B - C]],
    ],
  },
  '4': {
    advance: 0.72,
    paths: [
      [[0.42, T], [D, 0.66], [0.58, 0.66]],
      [[0.42, T], [0.42, B]],
    ],
  },
  '5': {
    advance: 0.72,
    paths: [[
      [R, T], [D, T], [D, 0.44], [R - C, 0.44], [R, 0.44 + C],
      [R, B - C], [R - C, B], [D + C, B], [D, B - C],
    ]],
  },
  '6': {
    advance: 0.72,
    paths: [
      [[R, T + 0.04], [R - C, T], [D + C, T], [D, T + C], [D, B - C], [D + C, B],
        [R - C, B], [R, B - C], [R, 0.58], [R - C, 0.46], [D + C, 0.46], [D, 0.56]],
    ],
  },
  '7': {
    advance: 0.68,
    paths: [[[D, T], [R, T], [0.24, B]]],
  },
  '8': {
    advance: 0.72,
    paths: [
      [[D + C, T], [R - C, T], [R, T + C], [R, 0.36], [R - C, 0.48],
        [D + C, 0.48], [D, 0.36], [D, T + C], [D + C, T]],
      [[D + C, 0.48], [R - C, 0.48], [R, 0.60], [R, B - C], [R - C, B],
        [D + C, B], [D, B - C], [D, 0.60], [D + C, 0.48]],
    ],
  },
  '9': {
    advance: 0.72,
    paths: [
      [[D, B - 0.04], [D + C, B], [R - C, B], [R, B - C], [R, T + C], [R - C, T],
        [D + C, T], [D, T + C], [D, 0.42], [D + C, 0.54], [R - C, 0.54], [R, 0.44]],
    ],
  },
  '/': { advance: 0.52, paths: [[[0.06, B], [0.44, T]]] },
  '-': { advance: 0.52, paths: [[[0.06, 0.52], [0.44, 0.52]]] },
  // Long enough to survive being stroked with a butt cap: at an eighth of the
  // glyph height the decimal point in the strike countdown came out shorter
  // than the pen drawing it and read as a speck of dirt.
  '.': { advance: 0.36, paths: [[[0.10, B], [0.30, B]]] },
  ':': { advance: 0.30, paths: [[[0.14, 0.30], [0.20, 0.30]], [[0.14, 0.70], [0.20, 0.70]]] },
  'T': { advance: 0.68, paths: [[[D, T], [R, T]], [[0.31, T], [0.31, B]]] },
  '+': { advance: 0.58, paths: [[[0.06, 0.5], [0.48, 0.5]], [[0.27, 0.29], [0.27, 0.71]]] },
  'X': { advance: 0.66, paths: [[[D, T], [R, B]], [[R, T], [D, B]]] },
  ' ': { advance: 0.42, paths: [] },
};

export function numeralWidth(text: string, height: number, tracking = 0.1): number {
  let w = 0;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    w += (glyph.advance + tracking) * height;
  }
  return Math.max(0, w - tracking * height);
}

export interface NumeralOptions {
  /** Stroke width as a fraction of glyph height. */
  weight?: number;
  align?: 'left' | 'right' | 'center';
  colour?: string;
  /** Drawn behind at a wider stroke, for legibility on any background. */
  halo?: string;
  tracking?: number;
  alpha?: number;
}

/**
 * Draws `text` with the vector numeral set. `y` is the glyph baseline
 * (the bottom of the digits), matching canvas text conventions.
 */
export function drawNumerals(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  height: number,
  opts: NumeralOptions = {},
): void {
  const weight = opts.weight ?? 0.15;
  const tracking = opts.tracking ?? 0.1;
  const total = numeralWidth(text, height, tracking);
  let ox = x;
  if (opts.align === 'right') ox = x - total;
  else if (opts.align === 'center') ox = x - total / 2;
  const top = y - height;

  const stroke = (colour: string, widthScale: number): void => {
    g.strokeStyle = colour;
    g.lineWidth = Math.max(1, height * weight * widthScale);
    g.lineJoin = 'miter';
    g.lineCap = 'butt';
    g.miterLimit = 3;
    let cx = ox;
    g.beginPath();
    for (const ch of text) {
      const glyph = GLYPHS[ch];
      if (!glyph) continue;
      for (const path of glyph.paths) {
        for (let i = 0; i < path.length; i++) {
          const px = cx + path[i][0] * height;
          const py = top + path[i][1] * height;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
      }
      cx += (glyph.advance + tracking) * height;
    }
    g.stroke();
  };

  g.save();
  if (opts.alpha !== undefined) g.globalAlpha *= opts.alpha;
  if (opts.halo) stroke(opts.halo, 2.4);
  stroke(opts.colour ?? rgba(INK, 0.96), 1);
  g.restore();
}

/**
 * Panel chrome: a hairline box with the top-left corner cut away and an amber
 * tick on the cut. One corner treatment used everywhere is most of what makes
 * a set of overlays look like one designed system rather than a pile of
 * widgets.
 */
export function panel(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { cut?: number; fill?: number; accent?: string; hairline?: number; scanlines?: boolean } = {},
): void {
  const cut = opts.cut ?? Math.min(10, h * 0.34);
  g.save();
  g.beginPath();
  g.moveTo(x + cut, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.lineTo(x, y + cut);
  g.closePath();

  if (opts.fill !== undefined && opts.fill > 0) {
    g.fillStyle = rgba(PANEL, opts.fill);
    g.fill();
  }
  if (opts.scanlines) {
    g.save();
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.028)';
    for (let sy = y; sy < y + h; sy += 3) g.fillRect(x, sy, w, 1);
    g.restore();
  }
  if (opts.hairline !== undefined && opts.hairline > 0) {
    g.strokeStyle = rgba(INK, opts.hairline);
    g.lineWidth = 1;
    g.stroke();
  }
  if (opts.accent) {
    g.strokeStyle = opts.accent;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x + cut, y);
    g.lineTo(x, y + cut);
    g.stroke();
  }
  g.restore();
}
