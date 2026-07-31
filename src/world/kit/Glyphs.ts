/**
 * Procedural lettering.
 *
 * The map needs writing on it — shop boards, stencils, door numbers, plates —
 * and it cannot load a font to get any. So the alphabets are drawn here as
 * stroke skeletons on a normalised grid and painted into a canvas, which the
 * signage atlas then hands to the GPU as one texture.
 *
 * Two scripts. Latin is a monoline stroke face: each glyph is a set of
 * polylines on a unit cap-height box, with the curved letters hand-plotted
 * rather than derived, because a circle sampled from an arc and a letter O are
 * not the same shape. Arabic is assembled from fifteen skeletons plus dots,
 * which is how the script is actually built: `ba`, `ta`, `tha`, `nun` and `ya`
 * share one body and differ only in how many dots sit above or below it, so
 * drawing the body once and the dots separately gets twenty-two letters out of
 * fifteen shapes. Each skeleton has a connected form (a tooth or a loop sitting
 * on the joining line) and a terminal form (the full bowl or tail), and a run
 * of connected letters draws its own segment of the joining line, so the run
 * comes out as one continuous stroke the way handwriting does.
 */

const TAU = Math.PI * 2;

/** One polyline in glyph space: x to the right, y up from the baseline. */
type Stroke = readonly number[];

interface Glyph {
  /** Horizontal advance, in cap heights. */
  advance: number;
  strokes: readonly Stroke[];
  /** Dot count and side: positive above the body, negative below. */
  dots?: number;
  /** Where along the advance the dots sit. */
  dotAt?: number;
  /** Whether the letter joins the one that follows it (Arabic only). */
  joins?: boolean;
}

// ---------------------------------------------------------------------------
// Latin
// ---------------------------------------------------------------------------

function ring(cx: number, cy: number, rx: number, ry: number, steps = 16): number[] {
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    out.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return out;
}

const LATIN: Record<string, Glyph> = {
  A: { advance: 0.62, strokes: [[0.02, 0, 0.31, 1, 0.6, 0], [0.13, 0.34, 0.49, 0.34]] },
  B: {
    advance: 0.62,
    strokes: [
      [0, 0, 0, 1],
      [0, 1, 0.34, 1, 0.54, 0.86, 0.5, 0.64, 0.3, 0.54, 0, 0.54],
      [0, 0.54, 0.38, 0.54, 0.58, 0.4, 0.54, 0.14, 0.32, 0, 0, 0],
    ],
  },
  C: {
    advance: 0.62,
    strokes: [[0.58, 0.82, 0.44, 0.98, 0.2, 1, 0.06, 0.84, 0.02, 0.5, 0.06, 0.16, 0.2, 0.02, 0.44, 0.04, 0.58, 0.18]],
  },
  D: {
    advance: 0.62,
    strokes: [[0, 0, 0, 1], [0, 1, 0.32, 1, 0.56, 0.82, 0.6, 0.5, 0.56, 0.18, 0.32, 0, 0, 0]],
  },
  E: { advance: 0.6, strokes: [[0, 0, 0, 1], [0, 1, 0.54, 1], [0, 0.52, 0.44, 0.52], [0, 0, 0.56, 0]] },
  F: { advance: 0.58, strokes: [[0, 0, 0, 1], [0, 1, 0.54, 1], [0, 0.52, 0.42, 0.52]] },
  G: {
    advance: 0.64,
    strokes: [
      [0.6, 0.82, 0.44, 0.98, 0.2, 1, 0.06, 0.84, 0.02, 0.5, 0.06, 0.16, 0.22, 0.02, 0.46, 0.04, 0.6, 0.2, 0.6, 0.42],
      [0.6, 0.42, 0.36, 0.42],
    ],
  },
  H: { advance: 0.62, strokes: [[0, 0, 0, 1], [0.6, 0, 0.6, 1], [0, 0.52, 0.6, 0.52]] },
  I: { advance: 0.26, strokes: [[0.13, 0, 0.13, 1]] },
  J: { advance: 0.54, strokes: [[0.5, 1, 0.5, 0.24, 0.4, 0.05, 0.2, 0.02, 0.06, 0.16]] },
  K: { advance: 0.62, strokes: [[0, 0, 0, 1], [0.58, 1, 0.04, 0.44], [0.2, 0.6, 0.6, 0]] },
  L: { advance: 0.56, strokes: [[0, 1, 0, 0, 0.54, 0]] },
  M: { advance: 0.74, strokes: [[0, 0, 0, 1, 0.36, 0.34, 0.72, 1, 0.72, 0]] },
  N: { advance: 0.62, strokes: [[0, 0, 0, 1, 0.6, 0, 0.6, 1]] },
  O: { advance: 0.66, strokes: [ring(0.33, 0.5, 0.31, 0.5)] },
  P: {
    advance: 0.6,
    strokes: [[0, 0, 0, 1], [0, 1, 0.34, 1, 0.56, 0.86, 0.54, 0.62, 0.34, 0.5, 0, 0.5]],
  },
  Q: { advance: 0.68, strokes: [ring(0.33, 0.5, 0.31, 0.5), [0.42, 0.2, 0.64, -0.08]] },
  R: {
    advance: 0.62,
    strokes: [
      [0, 0, 0, 1],
      [0, 1, 0.34, 1, 0.56, 0.86, 0.54, 0.62, 0.32, 0.5, 0, 0.5],
      [0.28, 0.5, 0.6, 0],
    ],
  },
  S: {
    advance: 0.6,
    strokes: [
      [0.56, 0.84, 0.42, 0.99, 0.18, 0.98, 0.05, 0.82, 0.14, 0.64, 0.36, 0.56, 0.54, 0.44, 0.57, 0.24, 0.44, 0.04, 0.2, 0.02, 0.04, 0.16],
    ],
  },
  T: { advance: 0.64, strokes: [[0, 1, 0.62, 1], [0.31, 1, 0.31, 0]] },
  U: { advance: 0.62, strokes: [[0, 1, 0, 0.24, 0.12, 0.05, 0.31, 0.01, 0.5, 0.05, 0.6, 0.24, 0.6, 1]] },
  V: { advance: 0.62, strokes: [[0.02, 1, 0.31, 0, 0.6, 1]] },
  W: { advance: 0.84, strokes: [[0, 1, 0.16, 0, 0.4, 0.6, 0.64, 0, 0.8, 1]] },
  X: { advance: 0.62, strokes: [[0.02, 1, 0.6, 0], [0.6, 1, 0.02, 0]] },
  Y: { advance: 0.62, strokes: [[0.02, 1, 0.31, 0.48, 0.6, 1], [0.31, 0.48, 0.31, 0]] },
  Z: { advance: 0.6, strokes: [[0.02, 1, 0.58, 1, 0.04, 0.02, 0.6, 0.02]] },
  '0': { advance: 0.62, strokes: [ring(0.31, 0.5, 0.28, 0.5)] },
  '1': { advance: 0.48, strokes: [[0.05, 0.78, 0.26, 1, 0.26, 0], [0.05, 0, 0.47, 0]] },
  '2': { advance: 0.6, strokes: [[0.04, 0.82, 0.16, 0.98, 0.4, 1, 0.56, 0.86, 0.54, 0.62, 0.02, 0.02, 0.6, 0.02]] },
  '3': {
    advance: 0.6,
    strokes: [
      [0.04, 0.86, 0.2, 1, 0.44, 0.98, 0.54, 0.82, 0.42, 0.62, 0.24, 0.56],
      [0.24, 0.56, 0.46, 0.52, 0.58, 0.34, 0.5, 0.1, 0.26, 0.01, 0.04, 0.12],
    ],
  },
  '4': { advance: 0.62, strokes: [[0.42, 0, 0.42, 1, 0.02, 0.3, 0.6, 0.3]] },
  '5': {
    advance: 0.6,
    strokes: [[0.56, 1, 0.1, 1, 0.06, 0.56, 0.3, 0.62, 0.52, 0.54, 0.58, 0.32, 0.48, 0.08, 0.24, 0.01, 0.04, 0.1]],
  },
  '6': {
    advance: 0.6,
    strokes: [
      [0.52, 0.92, 0.34, 1, 0.14, 0.9, 0.04, 0.56, 0.04, 0.26, 0.16, 0.04, 0.4, 0.02, 0.56, 0.16, 0.56, 0.34, 0.4, 0.48, 0.16, 0.46, 0.05, 0.32],
    ],
  },
  '7': { advance: 0.58, strokes: [[0.02, 1, 0.58, 1, 0.24, 0]] },
  '8': {
    advance: 0.6,
    strokes: [
      [0.31, 0.52, 0.12, 0.6, 0.08, 0.8, 0.2, 0.98, 0.42, 0.98, 0.54, 0.8, 0.5, 0.6, 0.31, 0.52, 0.1, 0.42, 0.04, 0.2, 0.18, 0.02, 0.44, 0.02, 0.58, 0.2, 0.52, 0.42, 0.31, 0.52],
    ],
  },
  '9': {
    advance: 0.6,
    strokes: [
      [0.08, 0.08, 0.26, 0.01, 0.46, 0.1, 0.56, 0.44, 0.56, 0.74, 0.44, 0.96, 0.2, 0.98, 0.05, 0.84, 0.05, 0.66, 0.2, 0.52, 0.44, 0.54, 0.56, 0.68],
    ],
  },
  '-': { advance: 0.5, strokes: [[0.06, 0.48, 0.44, 0.48]] },
  '.': { advance: 0.3, strokes: [[0.13, 0.04, 0.16, 0.04]] },
  '/': { advance: 0.52, strokes: [[0.02, 0, 0.5, 1]] },
  ':': { advance: 0.3, strokes: [[0.13, 0.06, 0.16, 0.06], [0.13, 0.6, 0.16, 0.6]] },
  ' ': { advance: 0.34, strokes: [] },
};

const LATIN_TRACK = 0.14;

export function measureLatin(text: string): number {
  let width = 0;
  for (const ch of text.toUpperCase()) {
    const glyph = LATIN[ch];
    if (!glyph) continue;
    width += glyph.advance + LATIN_TRACK;
  }
  return Math.max(0, width - LATIN_TRACK);
}

/**
 * Paints `text` with its baseline at the origin and cap height 1.
 *
 * The caller sets the transform, so a sign board scales the whole word into its
 * panel rather than the letters carrying a size of their own.
 */
export function drawLatin(ctx: CanvasRenderingContext2D, text: string): void {
  let x = 0;
  for (const ch of text.toUpperCase()) {
    const glyph = LATIN[ch];
    if (!glyph) continue;
    for (const stroke of glyph.strokes) {
      strokePath(ctx, stroke, x);
    }
    x += glyph.advance + LATIN_TRACK;
  }
}

function strokePath(ctx: CanvasRenderingContext2D, pts: Stroke, dx: number): void {
  if (pts.length < 4) {
    // A degenerate "stroke" is a dot; a round cap on a zero-length line is not
    // drawn by every rasteriser, so give it a length it can see.
    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(dx + pts[0], -pts[1]);
      ctx.lineTo(dx + pts[0] + 0.001, -pts[1]);
      ctx.stroke();
    }
    return;
  }
  ctx.beginPath();
  ctx.moveTo(dx + pts[0], -pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(dx + pts[i], -pts[i + 1]);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Arabic
// ---------------------------------------------------------------------------

/** Height of the joining line above the baseline of the box. */
const JOIN_Y = 0.06;

interface Skeleton {
  /** Initial and medial form: sits on the joining line. */
  connected?: Glyph;
  /** Final and isolated form: carries the bowl or the tail. */
  terminal: Glyph;
  /** False for the letters that never join to the one after them. */
  joins: boolean;
}

const SK: Record<string, Skeleton> = {
  alif: {
    joins: false,
    terminal: { advance: 0.3, strokes: [[0.15, JOIN_Y, 0.15, 0.98]] },
  },
  // ba, ta, tha, nun, ya: one tooth joined, one bowl on its own.
  ba: {
    joins: true,
    connected: { advance: 0.42, strokes: [[0, JOIN_Y, 0.1, JOIN_Y, 0.21, 0.34, 0.32, JOIN_Y, 0.42, JOIN_Y]] },
    terminal: {
      advance: 0.68,
      strokes: [[0.03, 0.36, 0.02, 0.12, 0.12, -0.16, 0.34, -0.24, 0.56, -0.15, 0.65, 0.1, 0.66, 0.34]],
    },
  },
  // jim, ha, kha: an angular head, and a bowl swung under the line.
  jim: {
    joins: true,
    connected: { advance: 0.44, strokes: [[0, JOIN_Y, 0.08, JOIN_Y, 0.3, 0.4, 0.44, 0.34]] },
    terminal: {
      advance: 0.64,
      strokes: [
        [0.14, 0.44, 0.42, 0.46, 0.5, 0.3, 0.3, 0.2],
        [0.3, 0.2, 0.08, 0.1, 0.05, -0.16, 0.26, -0.3, 0.54, -0.24, 0.62, -0.06],
      ],
    },
  },
  // dal, dhal: a wedge that sits on the line and stops the run.
  dal: {
    joins: false,
    terminal: { advance: 0.46, strokes: [[0.06, JOIN_Y, 0.36, JOIN_Y, 0.42, 0.24, 0.3, 0.46, 0.16, 0.42]] },
  },
  // ra, zay: a bare diagonal falling below the line.
  ra: {
    joins: false,
    terminal: { advance: 0.42, strokes: [[0.38, 0.44, 0.3, 0.16, 0.14, -0.12, 0.0, -0.24]] },
  },
  // sin, shin: three teeth, and a shallow saucer at the end.
  sin: {
    joins: true,
    connected: {
      advance: 0.78,
      strokes: [[0, JOIN_Y, 0.08, JOIN_Y, 0.17, 0.34, 0.26, JOIN_Y, 0.37, 0.34, 0.46, JOIN_Y, 0.57, 0.34, 0.66, JOIN_Y, 0.78, JOIN_Y]],
    },
    terminal: {
      advance: 1.02,
      strokes: [
        [0.04, JOIN_Y, 0.13, 0.34, 0.22, JOIN_Y, 0.33, 0.34, 0.42, JOIN_Y, 0.53, 0.34, 0.6, JOIN_Y],
        [0.6, JOIN_Y, 0.62, -0.12, 0.78, -0.22, 0.96, -0.12, 1.0, 0.2],
      ],
    },
  },
  // sad, dad: a flat loop, then the saucer.
  sad: {
    joins: true,
    connected: {
      advance: 0.66,
      strokes: [[0, JOIN_Y, 0.06, JOIN_Y, 0.1, 0.3, 0.3, 0.36, 0.44, 0.24, 0.4, JOIN_Y, 0.66, JOIN_Y]],
    },
    terminal: {
      advance: 0.94,
      strokes: [
        [0.04, JOIN_Y, 0.08, 0.3, 0.28, 0.36, 0.42, 0.24, 0.38, JOIN_Y, 0.5, JOIN_Y],
        [0.5, JOIN_Y, 0.52, -0.16, 0.7, -0.26, 0.88, -0.14, 0.92, 0.16],
      ],
    },
  },
  // ta, za (emphatic): the loop with the mast beside it.
  tta: {
    joins: true,
    connected: {
      advance: 0.66,
      strokes: [
        [0, JOIN_Y, 0.08, JOIN_Y, 0.12, 0.28, 0.32, 0.34, 0.46, 0.22, 0.42, JOIN_Y, 0.66, JOIN_Y],
        [0.5, JOIN_Y, 0.5, 0.92],
      ],
    },
    terminal: {
      advance: 0.7,
      strokes: [
        [0.04, JOIN_Y, 0.08, 0.28, 0.28, 0.34, 0.44, 0.22, 0.4, JOIN_Y, 0.68, JOIN_Y],
        [0.52, JOIN_Y, 0.52, 0.92],
      ],
    },
  },
  // ayn, ghayn: the open head, with a swept bowl when it ends a word.
  ayn: {
    joins: true,
    connected: { advance: 0.5, strokes: [[0, JOIN_Y, 0.1, JOIN_Y, 0.14, 0.3, 0.34, 0.44, 0.46, 0.32, 0.34, 0.2, 0.5, JOIN_Y]] },
    terminal: {
      advance: 0.72,
      strokes: [
        [0.16, 0.46, 0.36, 0.5, 0.44, 0.36, 0.28, 0.26],
        [0.28, 0.26, 0.12, 0.1, 0.08, -0.16, 0.34, -0.3, 0.62, -0.2, 0.7, 0.02],
      ],
    },
  },
  // fa, qaf: a head loop on the line; qaf drops a deeper bowl.
  fa: {
    joins: true,
    connected: {
      advance: 0.58,
      strokes: [[0, JOIN_Y, 0.08, JOIN_Y, 0.1, 0.28, 0.28, 0.4, 0.44, 0.3, 0.4, JOIN_Y, 0.58, JOIN_Y]],
    },
    terminal: {
      advance: 0.76,
      strokes: [
        [0.24, JOIN_Y, 0.22, 0.3, 0.4, 0.42, 0.56, 0.32, 0.52, JOIN_Y],
        [0.52, JOIN_Y, 0.5, -0.14, 0.32, -0.24, 0.12, -0.14, 0.08, 0.06],
      ],
    },
  },
  // kaf: the folded mast.
  kaf: {
    joins: true,
    connected: { advance: 0.56, strokes: [[0, JOIN_Y, 0.14, JOIN_Y, 0.14, 0.86, 0.44, 0.62], [0.2, 0.36, 0.4, 0.42], [0.14, JOIN_Y, 0.56, JOIN_Y]] },
    terminal: {
      advance: 0.7,
      strokes: [[0.12, 0.9, 0.12, 0.16, 0.24, JOIN_Y, 0.68, JOIN_Y], [0.12, 0.62, 0.42, 0.72]],
    },
  },
  lam: {
    joins: true,
    connected: { advance: 0.4, strokes: [[0.14, 0.96, 0.14, JOIN_Y], [0, JOIN_Y, 0.4, JOIN_Y]] },
    terminal: {
      advance: 0.66,
      strokes: [[0.58, 0.96, 0.58, 0.12, 0.48, -0.18, 0.26, -0.26, 0.06, -0.14, 0.02, 0.12]],
    },
  },
  // mim: the small closed head, with a straight tail when it ends a word.
  mim: {
    joins: true,
    connected: { advance: 0.44, strokes: [ringAt(0.22, 0.2, 0.13, 0.13), [0, JOIN_Y, 0.44, JOIN_Y]] },
    terminal: { advance: 0.46, strokes: [ringAt(0.26, 0.2, 0.14, 0.14), [0.24, 0.07, 0.2, -0.34]] },
  },
  ha: {
    joins: true,
    connected: { advance: 0.42, strokes: [ringAt(0.21, 0.24, 0.15, 0.17), [0, JOIN_Y, 0.42, JOIN_Y]] },
    terminal: { advance: 0.46, strokes: [ringAt(0.23, 0.26, 0.18, 0.22)] },
  },
  waw: {
    joins: false,
    terminal: { advance: 0.5, strokes: [ringAt(0.28, 0.28, 0.16, 0.16), [0.22, 0.14, 0.12, -0.1, 0.02, -0.24]] },
  },
};

function ringAt(cx: number, cy: number, rx: number, ry: number): number[] {
  return ring(cx, cy, rx, ry, 10);
}

/** Letter table: skeleton plus the dots that tell the family apart. */
const ARABIC: Record<string, { sk: string; dots: number }> = {
  alif: { sk: 'alif', dots: 0 },
  ba: { sk: 'ba', dots: -1 },
  ta: { sk: 'ba', dots: 2 },
  tha: { sk: 'ba', dots: 3 },
  nun: { sk: 'ba', dots: 1 },
  ya: { sk: 'ba', dots: -2 },
  jim: { sk: 'jim', dots: -1 },
  hha: { sk: 'jim', dots: 0 },
  kha: { sk: 'jim', dots: 1 },
  dal: { sk: 'dal', dots: 0 },
  dhal: { sk: 'dal', dots: 1 },
  ra: { sk: 'ra', dots: 0 },
  zay: { sk: 'ra', dots: 1 },
  sin: { sk: 'sin', dots: 0 },
  shin: { sk: 'sin', dots: 3 },
  sad: { sk: 'sad', dots: 0 },
  dad: { sk: 'sad', dots: 1 },
  tta: { sk: 'tta', dots: 0 },
  zza: { sk: 'tta', dots: 1 },
  ayn: { sk: 'ayn', dots: 0 },
  ghayn: { sk: 'ayn', dots: 1 },
  fa: { sk: 'fa', dots: 1 },
  qaf: { sk: 'fa', dots: 2 },
  kaf: { sk: 'kaf', dots: 0 },
  lam: { sk: 'lam', dots: 0 },
  mim: { sk: 'mim', dots: 0 },
  ha: { sk: 'ha', dots: 0 },
  waw: { sk: 'waw', dots: 0 },
};

/** A word is a list of letter keys in reading order, right to left. */
export type ArabicWord = readonly string[];

/**
 * Real words rather than decorative noise: at sign scale the difference is not
 * legibility, it is that a made-up letter run tends to come out with shapes no
 * scribe would join, and that does read as wrong.
 */
export const ARABIC_WORDS: Readonly<Record<string, ArabicWord>> = {
  restaurant: ['mim', 'tta', 'ayn', 'mim'],
  bakery: ['mim', 'kha', 'ba', 'zay'],
  bread: ['kha', 'ba', 'zay'],
  market: ['sin', 'waw', 'qaf'],
  cafe: ['mim', 'qaf', 'ha', 'ya'],
  grocery: ['ba', 'qaf', 'alif', 'lam', 'ta'],
  barber: ['hha', 'lam', 'alif', 'qaf'],
  clothes: ['mim', 'lam', 'alif', 'ba', 'sin'],
  phone: ['ha', 'alif', 'ta', 'fa'],
  pharmacy: ['sad', 'ya', 'dal', 'lam', 'ya', 'ta'],
  stop: ['qaf', 'fa'],
  forbidden: ['mim', 'mim', 'nun', 'waw', 'ayn'],
  entry: ['alif', 'lam', 'dal', 'kha', 'waw', 'lam'],
  forsale: ['lam', 'lam', 'ba', 'ya', 'ayn'],
  rashid: ['alif', 'lam', 'ra', 'shin', 'ya', 'dal'],
  tools: ['alif', 'dal', 'waw', 'alif', 'ta'],
  electric: ['kaf', 'ha', 'ra', 'ba', 'alif'],
  street: ['shin', 'alif', 'ra', 'ayn'],
  general: ['ayn', 'alif', 'mim'],
  parking: ['mim', 'waw', 'qaf', 'fa'],
};

export const ARABIC_WORD_KEYS: readonly string[] = Object.keys(ARABIC_WORDS);

interface Placed {
  glyph: Glyph;
  dots: number;
}

function shape(word: ArabicWord): Placed[] {
  const out: Placed[] = [];
  let joinedBehind = false;
  for (let i = 0; i < word.length; i++) {
    const entry = ARABIC[word[i]];
    if (!entry) continue;
    const skeleton = SK[entry.sk];
    const last = i === word.length - 1;
    const connected = skeleton.connected && skeleton.joins && !last;
    out.push({
      glyph: connected ? (skeleton.connected as Glyph) : skeleton.terminal,
      dots: entry.dots,
    });
    joinedBehind = skeleton.joins;
  }
  // The flag is only read for the trailing form above, but keeping it assigned
  // documents that the run's break points are the non-joining letters.
  void joinedBehind;
  return out;
}

export function measureArabic(word: ArabicWord): number {
  let width = 0;
  for (const placed of shape(word)) width += placed.glyph.advance;
  return width;
}

/**
 * Paints an Arabic word right to left, its joining line on the origin and its
 * ascenders reaching y = 1.
 */
export function drawArabic(ctx: CanvasRenderingContext2D, word: ArabicWord): void {
  const placed = shape(word);
  let x = 0;
  for (const p of placed) x += p.glyph.advance;
  // Advance leftwards from the right-hand edge, which is where the word starts.
  for (const p of placed) {
    x -= p.glyph.advance;
    for (const stroke of p.glyph.strokes) strokePath(ctx, stroke, x);
    if (p.dots !== 0) drawDots(ctx, x + p.glyph.advance * 0.5, p.dots, ctx.lineWidth);
  }
}

function drawDots(ctx: CanvasRenderingContext2D, cx: number, dots: number, weight: number): void {
  const count = Math.abs(dots);
  const above = dots > 0;
  const y = above ? 0.62 : -0.34;
  const radius = weight * 0.6;
  const gap = weight * 2.1;
  for (let i = 0; i < count; i++) {
    const x = cx + (i - (count - 1) / 2) * gap;
    // Three dots stack into a caret, which is how they are actually written.
    const dy = count === 3 && i === 1 ? (above ? gap * 0.8 : -gap * 0.8) : 0;
    ctx.beginPath();
    ctx.arc(x, -(y + dy), radius, 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Word banks
// ---------------------------------------------------------------------------

export const SHOP_NAMES: readonly string[] = [
  'AL RASHID',
  'MARKET',
  'BAKERY',
  'PHARMACY',
  'HARDWARE',
  'TEA HOUSE',
  'AUTO PARTS',
  'BARBER',
  'GROCERY',
  'TAILOR',
  'ELECTRIC',
  'PHONE CARDS',
  'SPARE PARTS',
  'FRESH BREAD',
  'COLD DRINKS',
];

export const WARNINGS: readonly string[] = [
  'NO ENTRY',
  'NO PARKING',
  'DANGER',
  'KEEP CLEAR',
  'STOP',
  'CHECKPOINT',
  'SLOW',
  'PRIVATE',
];

/**
 * Fitted text: scale so the longer of the two axes just fits the box.
 *
 * Returned as a scale rather than applied, because a board draws its Latin and
 * Arabic lines at different heights inside the same panel and both have to be
 * measured before either is placed.
 */
export function fitScale(width: number, height: number, textWidth: number): number {
  return Math.min(height, textWidth > 0 ? width / textWidth : height);
}
