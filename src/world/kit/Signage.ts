import * as THREE from 'three';
import { Rng } from '../../core/MathUtils';
import {
  ARABIC_WORDS,
  ARABIC_WORD_KEYS,
  type ArabicWord,
  SHOP_NAMES,
  WARNINGS,
  drawArabic,
  drawLatin,
  measureArabic,
  measureLatin,
} from './Glyphs';
import {
  type CustomOptions,
  type Sink,
  boxGeometry,
  cachedGeometry,
  placed,
  r3,
  transform,
} from './Kit';

/**
 * Painted marks: shop boards, posters, tags, stencils, numbers, plates.
 *
 * Everything a person ever wrote on this town is drawn once into a single canvas
 * atlas and then applied as quads, which is why the map can afford hundreds of
 * them: one texture, two materials, and one merged draw per district. The
 * lettering comes from {@link ./Glyphs}, so nothing here loads a font.
 *
 * The atlas also carries the daylight gradients, for no better reason than that
 * a shaft of light through a window is the same thing as a decal — a quad with a
 * picture on it — and giving it its own 256 kB texture would be waste.
 *
 * Variation is the whole point. A street where every board is the same board is
 * worse than a street with no boards, because the eye reads the repeat as an
 * asset list. So the atlas holds a dozen of each kind, differing in palette,
 * layout, script and how badly they have weathered, and the placement helpers
 * pick per site.
 */

const ATLAS_WIDTH = 2048;
const ATLAS_HEIGHT = 1024;

/** Gutter between cells, in pixels, so mip levels cannot bleed across. */
const PAD = 5;

export interface Cell {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Width over height, so a quad can be sized to the artwork. */
  aspect: number;
}

interface Atlas {
  texture: THREE.CanvasTexture;
  boards: Cell[];
  panels: Cell[];
  posters: Cell[];
  tags: Cell[];
  stencils: Cell[];
  numbers: Cell[];
  plates: Cell[];
  crates: Cell[];
  paints: Cell[];
  roads: Cell[];
  hatch: Cell;
  /** Soft ellipse: the pool of light a window throws on a floor. */
  pool: Cell;
  /** Gradient along its height: the body of a light shaft. */
  shaft: Cell;
  /** Blown-out rectangle: a window seen from a dark room. */
  bloom: Cell;
}

let atlas: Atlas | null = null;
let decalMaterial: THREE.MeshStandardMaterial | null = null;
let glowMat: THREE.MeshBasicMaterial | null = null;
let insideGlowMat: THREE.MeshBasicMaterial | null = null;
const fillMaterials = new Map<number, THREE.MeshStandardMaterial>();

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

/** Board grounds and the ink that reads on them. */
const BOARD_STYLES: ReadonlyArray<{ ground: string; ink: string; trim: string }> = [
  { ground: '#1d4f48', ink: '#f0e6cd', trim: '#e0c063' },
  { ground: '#8d3626', ink: '#f4ead2', trim: '#e8d8a8' },
  { ground: '#1c3c6e', ink: '#f2f0e4', trim: '#cfd8e4' },
  { ground: '#d9a52a', ink: '#31241a', trim: '#7a5c1c' },
  { ground: '#e6ddc6', ink: '#2c3a52', trim: '#a83c2c' },
  { ground: '#254f33', ink: '#eadfc0', trim: '#d2b45a' },
  { ground: '#5c3a6b', ink: '#f1e7d6', trim: '#d8c26a' },
  { ground: '#b8471f', ink: '#f6efdb', trim: '#2f2318' },
];

const SPRAY_COLOURS: readonly string[] = [
  '#1b1b20',
  '#2a3f8c',
  '#8e2222',
  '#d8d2c0',
  '#2c6b3a',
  '#c05a18',
];

const PAINT_COLOURS: readonly string[] = ['#2b3550', '#7d2b20', '#1f4438', '#3a3126', '#8a6a1c'];

// ---------------------------------------------------------------------------
// Atlas construction
// ---------------------------------------------------------------------------

export function signAtlas(): Atlas {
  if (atlas) return atlas;

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = ATLAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[world] 2d canvas unavailable for the signage atlas');
  ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const rng = new Rng(0x51a6f3);
  const shelf = new Shelf();
  const paint = (
    w: number,
    h: number,
    draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
  ): Cell => {
    const [px, py] = shelf.alloc(w, h);
    ctx.save();
    ctx.translate(px, py);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    draw(ctx, w, h);
    ctx.restore();
    return cellAt(px, py, w, h);
  };

  const boards: Cell[] = [];
  for (let i = 0; i < 12; i++) boards.push(paint(320, 80, (c, w, h) => drawBoard(c, w, h, rng, i)));

  const panels: Cell[] = [];
  for (let i = 0; i < 6; i++) panels.push(paint(144, 144, (c, w, h) => drawPanel(c, w, h, rng, i)));

  const posters: Cell[] = [];
  for (let i = 0; i < 8; i++) posters.push(paint(120, 164, (c, w, h) => drawPoster(c, w, h, rng, i)));

  const tags: Cell[] = [];
  for (let i = 0; i < 8; i++) tags.push(paint(240, 120, (c, w, h) => drawTag(c, w, h, rng, i)));

  const stencils: Cell[] = [];
  for (let i = 0; i < 8; i++)
    stencils.push(paint(144, 144, (c, w, h) => drawStencil(c, w, h, rng, i)));

  const numbers: Cell[] = [];
  for (let i = 0; i < 10; i++) numbers.push(paint(80, 80, (c, w, h) => drawNumber(c, w, h, rng, i)));

  const plates: Cell[] = [];
  for (let i = 0; i < 4; i++) plates.push(paint(144, 72, (c, w, h) => drawPlate(c, w, h, rng, i)));

  const crates: Cell[] = [];
  for (let i = 0; i < 6; i++) crates.push(paint(144, 144, (c, w, h) => drawCrate(c, w, h, rng, i)));

  const paints: Cell[] = [];
  for (let i = 0; i < 8; i++) paints.push(paint(320, 80, (c, w, h) => drawPainted(c, w, h, rng, i)));

  const roads: Cell[] = [];
  for (let i = 0; i < 3; i++) roads.push(paint(168, 168, (c, w, h) => drawRoad(c, w, h, rng, i)));

  const hatch = paint(144, 144, drawHatch);
  const pool = paint(128, 128, drawPool);
  const shaft = paint(64, 128, drawShaft);
  const bloom = paint(128, 128, drawBloom);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'world:signage';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  atlas = {
    texture,
    boards,
    panels,
    posters,
    tags,
    stencils,
    numbers,
    plates,
    crates,
    paints,
    roads,
    hatch,
    pool,
    shaft,
    bloom,
  };
  return atlas;
}

class Shelf {
  private x = PAD;
  private y = PAD;
  private rowHeight = 0;

  alloc(width: number, height: number): [number, number] {
    if (this.x + width + PAD > ATLAS_WIDTH) {
      this.x = PAD;
      this.y += this.rowHeight + PAD;
      this.rowHeight = 0;
    }
    const at: [number, number] = [this.x, this.y];
    this.x += width + PAD;
    this.rowHeight = Math.max(this.rowHeight, height);
    if (this.y + height > ATLAS_HEIGHT) {
      console.warn('[world] signage atlas overflow');
    }
    return at;
  }
}

/**
 * UV rect for a cell, pulled half a texel inside it.
 *
 * Without the inset a bilinear tap at the edge of a quad reaches into the
 * gutter, and every sign on the map gets a one-pixel transparent hairline
 * around it that reads as a seam.
 */
function cellAt(px: number, py: number, w: number, h: number): Cell {
  const inset = 0.5;
  return {
    u0: (px + inset) / ATLAS_WIDTH,
    u1: (px + w - inset) / ATLAS_WIDTH,
    v0: 1 - (py + h - inset) / ATLAS_HEIGHT,
    v1: 1 - (py + inset) / ATLAS_HEIGHT,
    aspect: w / h,
  };
}

// ---------------------------------------------------------------------------
// Lettering onto a canvas
// ---------------------------------------------------------------------------

/** Draws one Latin word, fitted into `width` x `capHeight`, centred on `cx`. */
function latinLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  baseline: number,
  capHeight: number,
  width: number,
  weight: number,
  colour: string,
): void {
  const natural = measureLatin(text);
  if (natural <= 0) return;
  const scale = Math.min(capHeight, width / natural);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.translate(cx - (natural * scale) / 2, baseline);
  ctx.scale(scale, scale);
  ctx.lineWidth = weight / scale;
  drawLatin(ctx, text);
  ctx.restore();
}

/**
 * As {@link latinLine}, for a right-to-left Arabic word.
 *
 * Placed by the centre of its block rather than by its baseline. Arabic sits
 * across the joining line — ascenders a full cap above it, tails a third of one
 * below — so a baseline shared with the Latin line puts the two scripts at
 * visibly different weights and hangs the tails off the bottom of the board.
 */
function arabicLine(
  ctx: CanvasRenderingContext2D,
  word: ArabicWord,
  cx: number,
  cy: number,
  height: number,
  width: number,
  weight: number,
  colour: string,
): void {
  const natural = measureArabic(word);
  if (natural <= 0) return;
  const scale = Math.min(height / ARABIC_EXTENT, width / natural);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.translate(cx - (natural * scale) / 2, cy + ARABIC_DROP * scale);
  ctx.scale(scale, scale);
  ctx.lineWidth = weight / scale;
  drawArabic(ctx, word);
  ctx.restore();
}

/** Ascender to tail, in cap heights, and the offset of the block's centre. */
const ARABIC_EXTENT = 1.35;
const ARABIC_DROP = 0.325;

/**
 * Independent random picks put the same name on several cells, and a street
 * where two neighbouring boards read alike is the repeat the review called out.
 * Deal from a shuffled deck instead, so a word only returns once the list is
 * spent. The atlas is painted once, so plain module state is enough.
 */
class Deck<T> {
  private remaining: T[] = [];

  constructor(private readonly items: readonly T[]) {}

  deal(rng: Rng): T {
    if (this.remaining.length === 0) {
      this.remaining = this.items.slice();
      for (let i = this.remaining.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        const held = this.remaining[i];
        this.remaining[i] = this.remaining[j];
        this.remaining[j] = held;
      }
    }
    return this.remaining.pop() as T;
  }
}

const wordDeck = new Deck(ARABIC_WORD_KEYS);
const nameDeck = new Deck(SHOP_NAMES);
const warnDeck = new Deck(WARNINGS);
const cellDecks = new WeakMap<readonly Cell[], Deck<Cell>>();

/**
 * Deals an atlas cell of a given kind.
 *
 * Distinct words per cell is only half of it: a terrace picks a cell per sign, so
 * plain random picks still hang the same painted board on two neighbouring shops,
 * which is what the street looked like on the first pass. One deck per kind means
 * every board in the atlas goes up before any of them goes up twice.
 */
export function dealCell(sink: Sink, cells: readonly Cell[]): Cell {
  let deck = cellDecks.get(cells);
  if (!deck) {
    deck = new Deck(cells);
    cellDecks.set(cells, deck);
  }
  return deck.deal(sink.rng);
}

function pickWord(rng: Rng): ArabicWord {
  return ARABIC_WORDS[wordDeck.deal(rng)];
}

function pickName(rng: Rng): string {
  return nameDeck.deal(rng);
}

// ---------------------------------------------------------------------------
// Cell painters
// ---------------------------------------------------------------------------

function drawBoard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  index: number,
): void {
  const style = BOARD_STYLES[index % BOARD_STYLES.length];
  ctx.fillStyle = style.ground;
  ctx.fillRect(0, 0, w, h);

  // A colour band down one end, which is how half the shopfronts in the
  // reference are painted: the board is the shop's livery, not a label.
  if (rng.bool(0.45)) {
    ctx.fillStyle = style.trim;
    const bandWidth = w * rng.range(0.08, 0.16);
    ctx.fillRect(rng.bool() ? 0 : w - bandWidth, 0, bandWidth, h);
  }
  ctx.strokeStyle = style.trim;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  const bilingual = rng.bool(0.72);
  if (bilingual) {
    arabicLine(ctx, pickWord(rng), w / 2, h * 0.32, h * 0.56, w * 0.8, h * 0.085, style.ink);
    latinLine(ctx, pickName(rng), w / 2, h * 0.9, h * 0.24, w * 0.76, h * 0.05, style.ink);
  } else if (rng.bool(0.5)) {
    arabicLine(ctx, pickWord(rng), w / 2, h * 0.5, h * 0.8, w * 0.86, h * 0.11, style.ink);
  } else {
    latinLine(ctx, pickName(rng), w / 2, h * 0.72, h * 0.44, w * 0.82, h * 0.085, style.ink);
  }

  weather(ctx, w, h, rng, 0.5);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  index: number,
): void {
  const style = BOARD_STYLES[(index + 3) % BOARD_STYLES.length];
  ctx.fillStyle = style.ground;
  if (index % 3 === 0) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    ctx.fillRect(3, 3, w - 6, h - 6);
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = 4;
    ctx.strokeRect(9, 9, w - 18, h - 18);
  }
  arabicLine(ctx, pickWord(rng), w / 2, h * 0.4, h * 0.44, w * 0.7, h * 0.07, style.ink);
  latinLine(ctx, pickName(rng), w / 2, h * 0.79, h * 0.16, w * 0.72, h * 0.036, style.ink);
  weather(ctx, w, h, rng, 0.4);
}

function drawPoster(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  index: number,
): void {
  const grounds = ['#c9bfa4', '#b8452c', '#2b4a6e', '#d8cfae', '#1f5040'];
  const inks = ['#241c14', '#f2ead4'];
  const ground = grounds[index % grounds.length];
  const ink = inks[index % 2];
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);

  // A dark block where the photograph would be. A poster is mostly picture, and
  // an all-type poster reads as a page from a document.
  ctx.fillStyle = index % 3 === 0 ? '#3a3228' : '#7d6f58';
  const blockHeight = h * rng.range(0.34, 0.5);
  ctx.fillRect(w * 0.1, h * 0.08, w * 0.8, blockHeight);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.08 + blockHeight * 0.62, w * 0.17, blockHeight * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  const textTop = h * 0.1 + blockHeight;
  arabicLine(ctx, pickWord(rng), w / 2, textTop + h * 0.11, h * 0.2, w * 0.86, h * 0.03, ink);
  arabicLine(ctx, pickWord(rng), w / 2, textTop + h * 0.29, h * 0.15, w * 0.82, h * 0.024, ink);
  latinLine(ctx, pickName(rng), w / 2, textTop + h * 0.46, h * 0.08, w * 0.82, h * 0.018, ink);

  weather(ctx, w, h, rng, 0.35);
  // Torn: bite chunks out of one edge and lift a corner, so a wall can carry
  // both whole posters and the paper left behind by last year's.
  if (index >= 5) tear(ctx, w, h, rng);
}

function drawTag(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, index: number): void {
  const colour = SPRAY_COLOURS[index % SPRAY_COLOURS.length];
  ctx.save();
  // Spray is soft-edged; a hard stroke reads as a printed decal.
  ctx.shadowColor = colour;
  ctx.shadowBlur = 7;
  if (index % 2 === 0) {
    arabicLine(ctx, pickWord(rng), w / 2, h * 0.68, h * 0.5, w * 0.86, h * 0.1, colour);
  } else {
    latinLine(ctx, pickName(rng), w / 2, h * 0.68, h * 0.42, w * 0.9, h * 0.09, colour);
  }
  ctx.restore();

  // Overspray, a slash through the lot, and drips off the low strokes.
  ctx.strokeStyle = colour;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = h * 0.045;
  if (rng.bool(0.6)) {
    ctx.beginPath();
    ctx.moveTo(w * rng.range(0.02, 0.12), h * rng.range(0.62, 0.82));
    ctx.lineTo(w * rng.range(0.88, 0.98), h * rng.range(0.2, 0.4));
    ctx.stroke();
  }
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 5; i++) {
    const x = w * rng.range(0.12, 0.88);
    const y = h * rng.range(0.6, 0.72);
    ctx.lineWidth = h * rng.range(0.012, 0.03);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h * rng.range(0.08, 0.3));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawStencil(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  index: number,
): void {
  const kind = index % 4;
  const ink = index % 3 === 0 ? '#b0342a' : '#e4dcc8';
  if (kind === 0) {
    // Circle-bar: the international no-entry, hand-painted.
    ctx.strokeStyle = ink;
    ctx.lineWidth = h * 0.09;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.42, h * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.6);
    ctx.lineTo(w * 0.76, h * 0.24);
    ctx.stroke();
    latinLine(ctx, warnDeck.deal(rng), w / 2, h * 0.92, h * 0.14, w * 0.94, h * 0.032, ink);
  } else if (kind === 1) {
    const text = warnDeck.deal(rng).split(' ');
    latinLine(ctx, text[0], w / 2, h * 0.44, h * 0.26, w * 0.9, h * 0.055, ink);
    if (text[1]) latinLine(ctx, text[1], w / 2, h * 0.76, h * 0.26, w * 0.9, h * 0.055, ink);
    arabicLine(ctx, pickWord(rng), w / 2, h * 0.88, h * 0.22, w * 0.88, h * 0.04, ink);
  } else if (kind === 2) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = h * 0.07;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.88);
    ctx.lineTo(w / 2, h * 0.2);
    ctx.moveTo(w * 0.28, h * 0.42);
    ctx.lineTo(w / 2, h * 0.18);
    ctx.lineTo(w * 0.72, h * 0.42);
    ctx.stroke();
    arabicLine(ctx, ARABIC_WORDS.entry, w / 2, h * 0.88, h * 0.2, w * 0.92, h * 0.036, ink);
  } else {
    arabicLine(ctx, pickWord(rng), w / 2, h * 0.3, h * 0.46, w * 0.94, h * 0.08, ink);
    arabicLine(ctx, pickWord(rng), w / 2, h * 0.72, h * 0.4, w * 0.92, h * 0.07, ink);
  }
  // Stencils are sprayed through a plate, so the paint is thin and patchy.
  erode(ctx, w, h, rng, 26);
}

function drawNumber(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  index: number,
): void {
  const plate = index % 3;
  const text = String(index === 0 ? 12 : index * 7 + rng.int(1, 9));
  if (plate === 0) {
    ctx.fillStyle = '#1c3f6b';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = '#e8e2d0';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(9, 9, w - 18, h - 18);
    latinLine(ctx, text, w / 2, h * 0.72, h * 0.44, w * 0.66, h * 0.075, '#f0ecdc');
  } else if (plate === 1) {
    ctx.fillStyle = '#e6dcc2';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
    ctx.fill();
    latinLine(ctx, text, w / 2, h * 0.7, h * 0.42, w * 0.6, h * 0.07, '#2a241c');
  } else {
    // Straight onto the plaster in whatever paint was to hand.
    latinLine(ctx, text, w / 2, h * 0.78, h * 0.6, w * 0.8, h * 0.1, '#2c2a24');
  }
  weather(ctx, w, h, rng, 0.3);
}

function drawPlate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  index: number,
): void {
  ctx.fillStyle = index % 2 === 0 ? '#ddd6c0' : '#d8c250';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#241f18';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = '#2a4a2e';
  ctx.fillRect(3, 3, w * 0.16, h - 6);
  const digits = `${rng.int(10, 99)} ${rng.int(100, 999)}`;
  latinLine(ctx, digits, w * 0.58, h * 0.62, h * 0.4, w * 0.68, h * 0.075, '#1d1a14');
  arabicLine(ctx, pickWord(rng), w * 0.58, h * 0.84, h * 0.26, w * 0.62, h * 0.045, '#1d1a14');
  weather(ctx, w, h, rng, 0.55);
}

function drawCrate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  index: number,
): void {
  const ink = index % 4 === 0 ? '#5a2a22' : '#241f18';
  ctx.strokeStyle = ink;
  ctx.lineWidth = h * 0.02;
  if (index % 2 === 0) ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  latinLine(ctx, index % 3 === 0 ? 'NET 25' : 'DO NOT', w / 2, h * 0.4, h * 0.16, w * 0.8, h * 0.032, ink);
  latinLine(ctx, index % 3 === 0 ? 'KG' : 'STACK', w / 2, h * 0.6, h * 0.16, w * 0.8, h * 0.032, ink);
  arabicLine(ctx, pickWord(rng), w / 2, h * 0.76, h * 0.22, w * 0.78, h * 0.038, ink);
  // Handling arrows up one side.
  ctx.lineWidth = h * 0.024;
  for (const cx of [w * 0.2, w * 0.8]) {
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.74);
    ctx.lineTo(cx, h * 0.2);
    ctx.moveTo(cx - w * 0.05, h * 0.3);
    ctx.lineTo(cx, h * 0.19);
    ctx.lineTo(cx + w * 0.05, h * 0.3);
    ctx.stroke();
  }
  erode(ctx, w, h, rng, 20);
}

function drawPainted(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  index: number,
): void {
  const colour = PAINT_COLOURS[index % PAINT_COLOURS.length];
  if (index % 2 === 0) {
    arabicLine(ctx, pickWord(rng), w / 2, h * 0.36, h * 0.62, w * 0.94, h * 0.1, colour);
    latinLine(ctx, pickName(rng), w / 2, h * 0.94, h * 0.22, w * 0.84, h * 0.045, colour);
  } else {
    latinLine(ctx, pickName(rng), w / 2, h * 0.74, h * 0.52, w * 0.94, h * 0.095, colour);
  }
  // Paint straight onto render fails first, and unevenly.
  erode(ctx, w, h, rng, 40);
}

function drawRoad(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, index: number): void {
  const ink = 'rgba(226,220,200,0.92)';
  if (index === 0) {
    latinLine(ctx, 'SLOW', w / 2, h * 0.56, h * 0.42, w * 0.94, h * 0.085, ink);
    arabicLine(ctx, ARABIC_WORDS.stop, w / 2, h * 0.8, h * 0.36, w * 0.84, h * 0.075, ink);
  } else if (index === 1) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = h * 0.1;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.94);
    ctx.lineTo(w / 2, h * 0.16);
    ctx.moveTo(w * 0.24, h * 0.42);
    ctx.lineTo(w / 2, h * 0.12);
    ctx.lineTo(w * 0.76, h * 0.42);
    ctx.stroke();
  } else {
    latinLine(ctx, 'STOP', w / 2, h * 0.68, h * 0.5, w * 0.94, h * 0.1, ink);
  }
  erode(ctx, w, h, rng, 60);
}

function drawHatch(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#ddd6c2';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#9b3a2a';
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const x = (i / bands) * w * 2 - w * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + w * 0.24, h);
    ctx.lineTo(x + w * 0.24 + h, 0);
    ctx.lineTo(x + h, 0);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Daylight gradients
// ---------------------------------------------------------------------------

function drawPool(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.42, 'rgba(255,250,238,0.72)');
  g.addColorStop(0.78, 'rgba(255,246,226,0.18)');
  g.addColorStop(1, 'rgba(255,244,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The body of a shaft: bright where it leaves the window, gone by the far end,
 * and feathered across its width so the edges of the beam are not lines.
 */
function drawShaft(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  for (let x = 0; x < w; x++) {
    const across = Math.abs((x + 0.5) / w - 0.5) * 2;
    const feather = Math.cos(across * Math.PI * 0.5) ** 1.4;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(255,252,240,${(0.9 * feather).toFixed(3)})`);
    g.addColorStop(0.55, `rgba(255,246,226,${(0.34 * feather).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,242,214,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 1, h);
  }
}

function drawBloom(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.62);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,252,242,0.86)');
  g.addColorStop(1, 'rgba(255,248,232,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// Wear
// ---------------------------------------------------------------------------

/** Dirt streaks and a sun-bleached corner, over whatever was drawn. */
function weather(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  amount: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const streaks = Math.round(5 * amount) + 2;
  for (let i = 0; i < streaks; i++) {
    const x = rng.range(0, w);
    const width = rng.range(w * 0.008, w * 0.032);
    const top = rng.range(-h * 0.1, h * 0.2);
    const g = ctx.createLinearGradient(0, top, 0, top + h * rng.range(0.5, 1.1));
    g.addColorStop(0, `rgba(44,36,26,${(0.2 * amount).toFixed(3)})`);
    g.addColorStop(1, 'rgba(44,36,26,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, top, width, h);
  }
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `rgba(255,246,214,${(0.16 * amount).toFixed(3)})`);
  g.addColorStop(1, `rgba(30,24,16,${(0.14 * amount).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Eats holes in the alpha, for paint that has flaked and stencils that skipped. */
function erode(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, count: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < count; i++) {
    const r = rng.range(h * 0.012, h * 0.06);
    ctx.globalAlpha = rng.range(0.35, 1);
    ctx.beginPath();
    ctx.ellipse(rng.range(0, w), rng.range(0, h), r, r * rng.range(0.5, 1.6), rng.range(0, 3.1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Rips a ragged bite out of one edge and takes a corner off. */
function tear(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  const fromBottom = rng.bool();
  const edgeY = fromBottom ? h : 0;
  const depth = h * rng.range(0.18, 0.42);
  ctx.moveTo(0, edgeY);
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = edgeY + (fromBottom ? -1 : 1) * depth * rng.range(0.15, 1);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, edgeY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

/**
 * Lit, alpha-tested, and pushed towards the camera in depth.
 *
 * Alpha test rather than blending, so signage stays in the opaque pass: a few
 * hundred blended quads would each need sorting against each other and would
 * drop out of the shadow and depth buffers the rest of the frame is built on.
 */
export function signMaterial(): THREE.MeshStandardMaterial {
  if (decalMaterial) return decalMaterial;
  const material = new THREE.MeshStandardMaterial({
    map: signAtlas().texture,
    alphaTest: 0.42,
    roughness: 0.72,
    metalness: 0,
    vertexColors: true,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  material.name = 'world:signage';
  decalMaterial = material;
  return material;
}

/**
 * Signage inside a room, which carries the same emissive bounce its walls do.
 *
 * Quantised to halves, because each level is a material and so a batch: a poster
 * being a shade out against the plaster behind it is not worth a draw call.
 */
export function signFillMaterial(level: number): THREE.MeshStandardMaterial {
  const step = Math.round(level * 2) / 2;
  const existing = fillMaterials.get(step);
  if (existing) return existing;
  const material = signMaterial().clone();
  material.name = `world:signage:fill:${step}`;
  material.emissive.setHex(FILL_COLOUR, THREE.SRGBColorSpace).multiplyScalar(step);
  material.emissiveMap = signAtlas().texture;
  material.emissiveIntensity = 1;
  fillMaterials.set(step, material);
  return material;
}

/** Matches the interior bounce colour the world builder bakes into its batches. */
const FILL_COLOUR = 0x3a3428;

/**
 * Unlit and additive: light, not a surface.
 *
 * No depth write, because a shaft is a volume the room is seen through, and
 * no fog, because an additive quad that has been faded towards the fog colour
 * adds fog to whatever is behind it.
 */
/**
 * Headroom for the additive daylight quads.
 *
 * Per-piece brightness is a vertex colour, which cannot exceed one, and the
 * builder converts tints from sRGB — so the brightest quad the daylight could ask
 * for landed at 1.0 linear, which after the renderer's tonemap is a light grey.
 * A window seen from a dark room has to be past white, not near it, so the
 * material carries the multiplier and the tint stays the dial.
 *
 * Kept small deliberately. The gain multiplies every daylight quad including the
 * soft skirt of the bloom cell and the haze sheets, so a large one does not make
 * the window brighter so much as fill the room with white: only the bloom wants
 * to clip, and it gets there on its tint alone.
 */
const GLOW_GAIN = 1.8;

export function glowMaterial(): THREE.MeshBasicMaterial {
  if (glowMat) return glowMat;
  glowMat = buildGlowMaterial('world:glow', THREE.DoubleSide);
  return glowMat;
}

/**
 * The same additive material, but only drawn from the side its quad faces.
 *
 * A blown-out window is a lie told to the room behind it. Seen from the street it
 * is a lit panel in a wall at midday, and a terrace of them reads as a row of
 * lamps — the recess in the reveal hides it at a glance but not from square on.
 * The quads are built with their normal pointing into the room, so culling the
 * back face is enough to keep the whole effect indoors.
 */
export function insideGlowMaterial(): THREE.MeshBasicMaterial {
  if (insideGlowMat) return insideGlowMat;
  insideGlowMat = buildGlowMaterial('world:glow:inside', THREE.FrontSide);
  return insideGlowMat;
}

function buildGlowMaterial(name: string, side: THREE.Side): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    map: signAtlas().texture,
    color: new THREE.Color().setScalar(GLOW_GAIN),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    vertexColors: true,
    side,
  });
  material.name = name;
  return material;
}

export function disposeSignage(): void {
  atlas?.texture.dispose();
  decalMaterial?.dispose();
  glowMat?.dispose();
  insideGlowMat?.dispose();
  for (const material of fillMaterials.values()) material.dispose();
  fillMaterials.clear();
  atlas = null;
  decalMaterial = null;
  glowMat = null;
  insideGlowMat = null;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Quad carrying one atlas cell, in the XY plane facing +Z.
 *
 * Cached on the cell's UVs and its size, because a hundred door numbers are a
 * hundred copies of one buffer and the batch merger wants them to be.
 */
export function decalQuad(width: number, height: number, cell: Cell): THREE.BufferGeometry {
  const key = `decal|${r3(width)}|${r3(height)}|${r3(cell.u0)}|${r3(cell.v0)}|${r3(cell.u1)}|${r3(cell.v1)}`;
  return cachedGeometry(key, () => {
    const hw = width / 2;
    const hh = height / 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0], 3),
    );
    geometry.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        [cell.u0, cell.v0, cell.u1, cell.v0, cell.u1, cell.v1, cell.u0, cell.v1],
        2,
      ),
    );
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    return geometry;
  });
}

/**
 * Emits a lettered quad into the signage batch.
 *
 * Follows the interior fill, so a poster on a shop's inside wall is lit the same
 * way the wall behind it is and does not come back as a black rectangle.
 */
export function addDecal(
  sink: Sink,
  cell: Cell,
  width: number,
  height: number,
  matrix: THREE.Matrix4,
  opts: CustomOptions = {},
): void {
  const step = Math.round(sink.currentFill() * 2) / 2;
  const geometry = placed(decalQuad(width, height, cell), matrix);
  if (step <= 0) {
    sink.addCustom('sign', geometry, signMaterial(), { tier: 'detail', ...opts });
    return;
  }
  sink.addCustom(`sign:fill:${step}`, geometry, signFillMaterial(step), {
    tier: 'detail',
    ...opts,
  });
}

/** Emits an additive quad into the daylight batch. */
export function addGlow(
  sink: Sink,
  cell: Cell,
  width: number,
  height: number,
  matrix: THREE.Matrix4,
  opts: CustomOptions = {},
  oneSided = false,
): void {
  const material = oneSided ? insideGlowMaterial() : glowMaterial();
  sink.addCustom(oneSided ? 'glowin' : 'glow', placed(decalQuad(width, height, cell), matrix), material, {
    tier: 'detail',
    ...opts,
  });
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

/**
 * Sun-bleach and grime, as a per-piece tint.
 *
 * Every mark on the map comes off the same eleven hundred cells, so without a
 * per-site tint a street of twelve signs reads as three signs printed four
 * times. Colour is the cheapest axis to vary: it survives at any distance and
 * costs nothing but a vertex colour.
 */
function wearTint(sink: Sink): number {
  const shade = sink.rng.range(0.72, 1);
  const warm = sink.rng.range(0.94, 1.06);
  const r = Math.min(255, Math.round(255 * shade * warm));
  const g = Math.round(255 * shade);
  const b = Math.round(255 * shade * (2 - warm));
  return (r << 16) | (g << 8) | b;
}

/** Pushes a point off a wall face along the face normal for yaw. */
function offWall(x: number, z: number, yaw: number, by: number): [number, number] {
  return [x + Math.sin(yaw) * by, z + Math.cos(yaw) * by];
}

/**
 * Painted board over a shopfront: a panel with a lettered face.
 *
 * The board is real geometry rather than a decal on the wall, because the thing
 * that says "shop" from down the street is the shadow under its bottom edge.
 */
export function shopSign(sink: Sink, x: number, y: number, z: number, yaw: number, width: number): void {
  const cell = dealCell(sink, signAtlas().boards);
  const height = width / cell.aspect;
  const [bx, bz] = offWall(x, z, yaw, 0.05);
  sink.addStatic(
    placed(
      boxGeometry(width + 0.07, height + 0.06, 0.08, 0.014, 1),
      transform(bx, y, bz, yaw),
    ),
    {
      material: sink.rng.bool(0.6) ? 'metal_panel' : 'wood_painted',
      tier: 'detail',
      reproject: true,
      tint: sink.rng.bool() ? 0x6d6a63 : 0x7d7568,
    },
  );
  const [fx, fz] = offWall(x, z, yaw, 0.1);
  addDecal(sink, cell, width, height, transform(fx, y, fz, yaw), { tint: wearTint(sink) });
}

/**
 * Sign projecting off the wall at right angles, so it reads along the street
 * rather than only from in front of the shop.
 */
export function hangingSign(sink: Sink, x: number, y: number, z: number, yaw: number, size: number): void {
  const cell = dealCell(sink, signAtlas().panels);
  const height = size / cell.aspect;
  const armYaw = yaw + Math.PI / 2;
  const reach = size * 0.6 + 0.16;
  const [ax, az] = offWall(x, z, yaw, reach * 0.5);
  sink.addStatic(
    placed(boxGeometry(0.05, 0.05, reach, 0.01, 1), transform(ax, y + height * 0.55, az, yaw)),
    { material: 'metal_rusted', tier: 'detail', reproject: true, tint: 0x74695c },
  );
  const [px, pz] = offWall(x, z, yaw, reach * 0.8);
  addDecal(sink, cell, size, height, transform(px, y, pz, armYaw), { tint: wearTint(sink) });
  addDecal(sink, cell, size, height, transform(px, y, pz, armYaw + Math.PI), {
    tint: wearTint(sink),
  });
}

/** Lettering painted straight onto the render, with no board behind it. */
export function paintedSign(sink: Sink, x: number, y: number, z: number, yaw: number, width: number): void {
  const cell = dealCell(sink, signAtlas().paints);
  const [px, pz] = offWall(x, z, yaw, 0.022);
  addDecal(sink, cell, width, width / cell.aspect, transform(px, y, pz, yaw), {
    tint: wearTint(sink),
  });
}

export function wallPoster(sink: Sink, x: number, y: number, z: number, yaw: number, height: number): void {
  const cell = dealCell(sink, signAtlas().posters);
  const [px, pz] = offWall(x, z, yaw, 0.024);
  addDecal(sink, cell, height * cell.aspect, height, transform(px, y, pz, yaw), {
    tint: wearTint(sink),
  });
}

export function sprayTag(sink: Sink, x: number, y: number, z: number, yaw: number, width: number): void {
  const cell = dealCell(sink, signAtlas().tags);
  const [px, pz] = offWall(x, z, yaw, 0.02);
  addDecal(sink, cell, width, width / cell.aspect, transform(px, y, pz, yaw), {
    tint: wearTint(sink),
  });
}

export function wallStencil(sink: Sink, x: number, y: number, z: number, yaw: number, size: number): void {
  const cell = dealCell(sink, signAtlas().stencils);
  const [px, pz] = offWall(x, z, yaw, 0.02);
  addDecal(sink, cell, size, size / cell.aspect, transform(px, y, pz, yaw), {
    tint: wearTint(sink),
  });
}

export function doorNumber(sink: Sink, x: number, y: number, z: number, yaw: number, size: number): void {
  const cell = dealCell(sink, signAtlas().numbers);
  const [px, pz] = offWall(x, z, yaw, 0.026);
  addDecal(sink, cell, size, size / cell.aspect, transform(px, y, pz, yaw), {
    tint: wearTint(sink),
  });
}

/** Plate on a vehicle, or a stencilled unit number on a container door. */
export function unitPlate(sink: Sink, x: number, y: number, z: number, yaw: number, width: number): void {
  const cell = sink.rng.pick(signAtlas().plates);
  const [px, pz] = offWall(x, z, yaw, 0.02);
  addDecal(sink, cell, width, width / cell.aspect, transform(px, y, pz, yaw), {
    tint: wearTint(sink),
  });
}

/** Stencilled handling marks on a crate, a drum or a container flank. */
export function crateMark(sink: Sink, x: number, y: number, z: number, yaw: number, size: number): void {
  const cell = sink.rng.pick(signAtlas().crates);
  const [px, pz] = offWall(x, z, yaw, 0.014);
  addDecal(sink, cell, size, size / cell.aspect, transform(px, y, pz, yaw), {
    tint: wearTint(sink),
  });
}

/** Lettering or an arrow painted flat on the road. */
export function roadStencil(sink: Sink, x: number, y: number, z: number, yaw: number, size: number): void {
  const cell = sink.rng.pick(signAtlas().roads);
  addDecal(
    sink,
    cell,
    size,
    size / cell.aspect,
    transform(x, y, z, yaw, -Math.PI / 2),
    { tint: wearTint(sink), tier: 'ground' },
  );
}

/** Red-and-white hazard banding, for kerbs, barriers and gate posts. */
export function hazardBand(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  height: number,
  pitch = 0,
): void {
  addDecal(sink, signAtlas().hatch, width, height, transform(x, y, z, yaw, pitch), {
    tint: wearTint(sink),
  });
}
