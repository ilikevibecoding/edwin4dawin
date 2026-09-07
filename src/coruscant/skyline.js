// Far skyline impostors for Coruscant: one merged mesh - per tower lot the shells of its envelope (towers/envelope.js:
// chamfered / octagonal prisms that recede with height, discs on a stalk, twin shafts, the crown frustum on the top
// shell, the spine tower's lit column), the landmark silhouettes, plus the street lattice (boulevard-deck slabs and
// skybridge tubes, see latticeBoxes) - drawn with their own long fog so the city reads to the horizon while real
// chunks only stream ~10 chunks out. Inside the streamed radius each piece sits inside its real tower and is hidden
// by it; beyond it the piece is a silhouette in the tower's palette tint whose facade is the same language as the
// blueprint's (docs/rubrics/18_architecture_v2.md rules 6-9): full-height light strips at the tower's strip pitch,
// a continuous glazing band per floor lit floor by floor, lit ring ledges, recessed seams - lines, never a lattice
// of random lit squares - fading into the haze over several hundred blocks. One draw call, < 120k triangles
// (scripts/test-farlod.mjs); uniforms are refreshed from the material's onBeforeRender hook (no game-loop wiring).
import * as THREE from 'three';
import { SHARED } from '../entityMaterial.js';
import { B } from '../blocks.js';
import { LEVELS, PLATEAU } from './layout.js';
import { blueprintFor } from './buildings.js';
import { resolveFamily, lotCrown, archFor } from './towers/index.js';
import { envelopeFor, envelopeProfile, twinShafts, FAMILY_ENVELOPE_OPTS } from './towers/envelope.js';
import { stripPlan } from './towers/strips.js';
import { PALETTES, RHYTHM_CODE } from './facade.js';

const INSET = 0.35;
// albedo of the palette wall blocks (textures.js panelBase colours), so an impostor is the colour of the tower that
// streams in over it
const BODY_TINT = new Map([
  [B.PANEL_LIGHT, [0.67, 0.68, 0.71]], [B.PANEL_GREY, [0.41, 0.42, 0.45]], [B.PANEL_BLACK, [0.12, 0.12, 0.14]], [B.PANEL_BRONZE, [0.50, 0.38, 0.27]],
  [B.DURASTEEL, [0.59, 0.60, 0.63]], [B.DURASTEEL_DARK, [0.31, 0.32, 0.35]], [B.HULL_PLATE, [0.48, 0.49, 0.53]], [B.PANEL_SAND, [0.78, 0.72, 0.62]],
]);
const DEFAULT_TINT = [0.35, 0.36, 0.40];
const GROUND_TINT = [0.16, 0.17, 0.20];
const SPINE_TINT = [0.45, 0.70, 1.0];
const LIGHT_WARMTH = { blue: 0, white: 0.5, warm: 1 };
export const STYLE_GLOW = 6;     // aStyle.x code of a lit column (the spine): drawn in its light colour, no facade

const VERT = /* glsl */ `
attribute float aSeed;
attribute vec2 aCenter;
attribute vec3 aTint;
attribute vec4 aStyle;
uniform vec3 uCamPos; uniform float uChunkFar;
varying vec3 vWorld;
varying float vSeed;
varying float vDist;
varying vec3 vTint;
varying vec4 vStyle;
void main() {
  // pieces inside the streamed radius are hidden by their real building: push them out of clip space so they cost
  // no fill (the fragment fade alone would still shade every covered pixel)
  if (distance(aCenter, uCamPos.xz) < uChunkFar * 0.8) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vWorld = vec3(0.0); vSeed = 0.0; vDist = 0.0; vTint = vec3(0.0); vStyle = vec4(0.0); return; }
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz; vSeed = aSeed; vTint = aTint; vStyle = aStyle;
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
// aStyle: x = rhythm code (facade.js RHYTHM_CODE: 0 ribbon, 1 slit, 2 curtain, 3 panel, 4 strip, 5 industrial; 6 =
// lit column), y = light-strip pitch in blocks (0 = no strips), z = ring ledge every z floors, w = light warmth
// (0 blue-white .. 1 warm). aSeed classes: < 1.5 tower, 2..3 landmark, >= 4 street lattice.
const FRAG = /* glsl */ `
uniform vec3 uFogColor; uniform float uSkyLight; uniform float uNear; uniform float uFar; uniform float uChunkFar;
uniform vec3 uCamPos; uniform float uGroundY;
varying vec3 vWorld; varying float vSeed; varying float vDist; varying vec3 vTint; varying vec4 vStyle;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float band(float v, float a, float b) { return step(a, v) * step(v, b); }
void main() {
  // face orientation from derivatives: tops lighter, the facets of a chamfered shell shaded apart so its edges read
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float top = step(0.5, abs(N.y));
  float side = 1.0 - top;
  float lmOrDeck = step(1.5, vSeed);
  float deck = step(3.5, vSeed);
  float lm = lmOrDeck - deck;
  float tower = 1.0 - lmOrDeck;
  float glow = tower * step(5.5, vStyle.x);
  float night = clamp(1.0 - uSkyLight * 1.2, 0.0, 1.0);
  float sky = 0.25 + 0.75 * uSkyLight;
  // (0.72: the terrain's sun / ambient shading lands a sunlit texel at about that fraction of its albedo)
  float facet = 0.80 + 0.14 * abs(N.x) + 0.06 * max(N.z, 0.0);
  vec3 body = vTint * sky * 0.72 * mix(facet, 1.12, top);
  // the facade lattice: u along the face, floors of 5 blocks above the ground, one module of pitch cells
  float u = abs(N.x) > 0.5 ? vWorld.z : vWorld.x;
  float hf = (vWorld.y - uGroundY) / 5.0;
  float fl = floor(hf), fy = fract(hf);
  float seedI = floor(vSeed * 97.0 + 0.5);
  float pitch = max(vStyle.y, 3.0);
  float phase = mod(seedI, pitch);
  float su = mod(u + phase, pitch);
  float above = step(1.5, fl);
  float r = vStyle.x;
  float isRibbon = step(abs(r), 0.5), isSlit = step(abs(r - 1.0), 0.5), isCurtain = step(abs(r - 2.0), 0.5);
  float isPanel = step(abs(r - 3.0), 0.5), isStrip = step(abs(r - 4.0), 0.5), isInd = step(abs(r - 5.0), 0.5);
  // lines of light: one full-height strip column per module above the podium, the ring ledge every ledgeEvery floors
  float strip = tower * side * above * step(0.5, vStyle.y) * step(su, 1.0);
  float ledge = tower * side * above * step(fy, 0.2) * step(mod(fl, max(vStyle.z, 3.0)), 0.5);
  // glazing: a continuous band per floor (ribbon 2 rows, curtain 3 rows between fins) lit floor by floor, or one
  // slit per module (slit / panel) lit column by column - lines either way; panel fields skip every fifth floor
  // (with strips the blueprint lights ~22% of its bands, without ~45%: the strips carry the night look)
  float litFloor = step(mix(0.55, 0.78, step(0.5, vStyle.y)), hash(vec3(fl, seedI, 3.0)));
  float litCol = step(0.4, hash(vec3(floor((u + phase) / pitch), seedI, 5.0)));
  float fin = band(su, 1.0, 2.0);
  float mid = floor(pitch * 0.5);
  float slitCol = band(su, mid, mid + 1.0);
  float service = isPanel * step(abs(mod(fl, 5.0) - 4.0), 0.5);
  float glass = tower * side * clamp(isRibbon * band(fy, 0.2, 0.6) + isCurtain * band(fy, 0.2, 0.8) * (1.0 - fin)
    + (isSlit + isPanel) * slitCol * band(fy, 0.2, 0.8) * (1.0 - service) + isInd * band(su, 2.0, 3.0) * band(fy, 0.2, 0.8), 0.0, 1.0);
  float glassLit = mix(litFloor, litCol, clamp(isSlit + isPanel + isInd, 0.0, 1.0));
  // recessed seams (panel / slit / strip fields), the trench line under every industrial slab, chrome curtain fins
  float seam = tower * side * ((isPanel + isSlit + isStrip) * fin + isInd * step(fy, 0.2));
  float chrome = tower * side * isCurtain * fin;
  // landmarks: ribbed bands (one glazed row per floor) instead of an office grid
  float lmBand = lm * side * band(fy, 0.3, 0.55);
  vec3 lightCol = mix(vec3(0.55, 0.78, 1.0), vec3(1.0, 0.82, 0.55), vStyle.w);
  vec3 warm = vec3(1.0, 0.85, 0.58);
  vec3 glassCol = mix(vec3(0.05, 0.06, 0.09), vec3(0.40, 0.48, 0.60), uSkyLight);
  // lit glazing is the dim amber of the streamed towers' lit bands (textures.js window_band_lit), well under the strips
  glassCol = mix(glassCol, warm * 0.55, night * glassLit * 0.9);
  vec3 col = body;
  col = mix(col, glassCol, glass);
  col = mix(col, body * 0.55, seam);
  col = mix(col, vec3(0.72, 0.75, 0.80) * sky, chrome);
  // the lines of light: at the streamed towers a one-block strip is a texel column the mipmaps average into its
  // dark wall, so the impostor's analytic line is drawn at the same weight - the strips lead, the ring ledges sit
  // under them, and both thin out with distance instead of turning the far skyline into a bright cage
  float lineFade = 1.0 - 0.45 * smoothstep(uChunkFar, uFar, vDist);
  vec3 lineCol = mix(mix(vec3(0.62, 0.68, 0.78), vec3(0.78, 0.72, 0.62), vStyle.w) * sky, lightCol * 0.95, night);
  col = mix(col, lineCol, (strip * 0.8 + (1.0 - strip) * ledge * 0.5) * lineFade);
  vec3 lmCol = mix(vec3(0.35, 0.40, 0.50) * sky, warm, night * litFloor);
  col = mix(col, lmCol, lmBand);
  col = mix(col, lightCol * (0.6 + 0.6 * night), glow);
  // the decks' lane lights and blue under-strips: a faint blue glow on the lattice tops after dark
  col += deck * top * vec3(0.10, 0.16, 0.30) * night;
  // hidden inside the streamed radius (the real tower is there), then fades into the haze far away
  float show = smoothstep(uChunkFar * 0.85, uChunkFar * 1.05, vDist);
  float f = smoothstep(uNear, uFar, vDist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, show * (1.0 - f * 0.85));
  if (gl_FragColor.a < 0.02) discard;
}`;

// Landmark silhouettes: the signature buildings are not plain boxes, so their impostors are built from the real
// blueprint - column tops sampled on a 3-block grid and merged into row runs - so a dome, a stepped tower or a spire
// keeps its outline from across the city.
const LM_CELL = 3;
// approximate exterior colour per landmark, so the impostor matches the real building when its chunks stream in
const LM_TINT = {
  senate: [0.50, 0.52, 0.53], temple: [0.72, 0.66, 0.55], republica: [0.78, 0.75, 0.68], chancellery: [0.62, 0.59, 0.52],
  medcenter: [0.85, 0.86, 0.86], holonet: [0.36, 0.38, 0.44], detention: [0.13, 0.13, 0.14], opera: [0.55, 0.57, 0.60],
  works: [0.30, 0.30, 0.32], market: [0.50, 0.50, 0.50], plaza_monument: [0.45, 0.45, 0.44], underworld: [0.25, 0.25, 0.27],
};
const LM_MIN_HEIGHT = 40;   // low landmarks (plaza, market halls, the undercity deck) read as rubble stubs from afar; skip them
export function landmarkBoxes(layout) {
  const out = [];
  for (const lot of layout.lots) {
    if (lot.kind !== 'landmark' || (lot.height || 0) < LM_MIN_HEIGHT) continue;
    const tint = LM_TINT[lot.family] || [0.55, 0.53, 0.48];
    let bp = null;
    try { bp = blueprintFor(lot, layout); } catch (e) { console.warn('skyline: landmark blueprint failed', lot.family, e); }
    if (!bp || !bp.blocks) continue;
    const { w, h, d, blocks } = bp;
    const cols = Math.ceil(w / LM_CELL), rows = Math.ceil(d / LM_CELL);
    const top = new Int16Array(cols * rows).fill(-1);
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
      const base = (x * d + z) * h;
      let t = -1;
      for (let y = h - 1; y >= 1; y--) { const v = blocks[base + y]; if (v !== 0 && v !== 255) { t = y; break; } }
      const i = Math.floor(x / LM_CELL) * rows + Math.floor(z / LM_CELL);
      if (t > top[i]) top[i] = t;
    }
    for (let cx = 0; cx < cols; cx++) {
      let cz = 0;
      while (cz < rows) {
        const t = top[cx * rows + cz];
        if (t < 2) { cz++; continue; }
        let cz1 = cz;
        while (cz1 + 1 < rows && Math.abs(top[cx * rows + cz1 + 1] - t) <= 1) cz1++;
        out.push({ x0: lot.x0 + cx * LM_CELL, x1: lot.x0 + Math.min(w, (cx + 1) * LM_CELL), z0: lot.z0 + cz * LM_CELL, z1: lot.z0 + Math.min(d, (cz1 + 1) * LM_CELL), y1: bp.y0 + t + 1, id: lot.id, landmark: true, tint });
        cz = cz1 + 1;
      }
    }
  }
  return out;
}

// Street lattice impostors (view distances beyond the streamed ring): one slab per mid-level boulevard-deck segment
// (city.js paints the deck at y 94..95 with kerbs on top) and one box per skybridge (plate at y, glass tube to y + 3).
// Deck segments run the whole plateau, so they are chopped into <= 64-block pieces: the per-box centre cull in the
// vertex shader and the distance fade stay meaningful along a 1000-block boulevard. Boxes are inset like the towers
// so, inside the ring, each sits inside its real deck/tube and never z-fights it.
const DECK_PIECE = 64;
const DECK_TINT = [0.42, 0.44, 0.48];      // durasteel sidewalks + chrome lanes read as a mid-grey lattice over the dark ground
const BRIDGE_TINT = [0.55, 0.62, 0.70];    // steel-glass tubes
export function latticeBoxes(layout) {
  const out = [];
  const yTop = LEVELS.deck + 1 - 0.3, yBot = LEVELS.deck - 1 + 0.3;
  for (const s of layout.boulevards || []) {
    if (s.level !== 'mid') continue;
    const a0 = s.axis === 'x' ? s.x0 : s.z0, a1 = s.axis === 'x' ? s.x1 : s.z1;
    for (let a = a0; a < a1; a += DECK_PIECE) {
      const b = Math.min(a1, a + DECK_PIECE);
      const r = s.axis === 'x' ? { x0: a, x1: b, z0: s.z0, z1: s.z1 } : { x0: s.x0, x1: s.x1, z0: a, z1: b };
      out.push({ x0: r.x0 + INSET, x1: r.x1 - INSET, z0: r.z0 + INSET, z1: r.z1 - INSET, y0: yBot, y1: yTop, id: 1000 + s.id, deck: true, tint: DECK_TINT });
    }
  }
  for (const br of layout.bridges || []) {
    out.push({ x0: br.x0 + INSET, x1: br.x1 - INSET, z0: br.z0 + INSET, z1: br.z1 - INSET, y0: br.y + 0.3, y1: br.y + 4 - 0.3, id: 2000 + br.id, deck: true, tint: BRIDGE_TINT });
  }
  return out;
}

// The impostor pieces of one tower lot, from the same records the blueprint builds from (towers/index.js archFor:
// envelope kind, palette, rhythm; envelope.js: the shells; crowns.js via lotCrown: the crown; strips.js: the strip
// pitch) and no blueprint: per shell a prism { x0, x1, z0, z1, y0, y1, chamfer } (world coordinates, inset by INSET
// so it hides inside the real walls), the crown frustum { taper } on the top shell, and for a spine tower its lit
// column (style STYLE_GLOW). style = the aStyle vector (see FRAG), tint = the palette wall albedo.
// -> { pieces, family, arch, crown }
export function towerPieces(lot, ground = LEVELS.ground) {
  const g0 = ground + 1;
  const family = resolveFamily(lot).name;
  const arch = archFor(lot, family);
  const crown = lotCrown(lot, ground);
  const strips = stripPlan(lot, family);
  const pal = PALETTES[arch.palette] || PALETTES.fin_grey;
  const tint = BODY_TINT.get(pal.wall) || DEFAULT_TINT;
  const front = lot.front || (lot.door && lot.door.side) || 'S';
  const nF = Math.max(2, Math.round(Math.max(10, lot.height ?? 60) / 5));
  const midDoorF = lot.midDoor ? 7 : -1;
  const yBody = g0 + lot.height - (crown.base || 0) - 0.5;    // the crown starts here (crownEat took the top floors)
  const style = [RHYTHM_CODE[arch.rhythm] ?? 0, strips ? strips.pitch : (arch.rhythm === 'strip' ? 4 : 0), 6, LIGHT_WARMTH[pal.light] ?? 0.5];
  const twinLike = family === 'twin' || family === 'spine';
  const tw = twinLike ? twinShafts(lot.w, lot.d, front) : null;
  const shafts = tw
    ? [{ ext: tw.rectA, front: tw.frontA, door: tw.doorA, nF, noInset: ['f'] }, { ext: tw.rectB, front: tw.frontB, door: tw.doorB, nF: family === 'spine' && nF >= 14 ? nF - 2 : nF, noInset: ['f'] }]
    : [{ ext: { x0: 0, z0: 0, x1: lot.w - 1, z1: lot.d - 1 }, front, door: lot.door ? { x: lot.door.x - lot.x0, z: lot.door.z - lot.z0 } : null, nF }];
  const pieces = [];
  let topPiece = null;
  shafts.forEach((sh, si) => {
    const opts = { ...(FAMILY_ENVELOPE_OPTS[family] || {}), ext: sh.ext, front: sh.front, nF: sh.nF, midDoorF };
    if (sh.door) opts.door = sh.door;
    if (sh.noInset) opts.noInset = sh.noInset;
    if (family === 'spine') { opts.deck = front === 'S' || front === 'E' ? 'l' : 'r'; opts.deckEvery = 6; }
    if (family === 'twin') opts.deck = false;
    const env = envelopeFor(lot, family, arch.envelope, opts);
    style[2] = env.ledgeEvery;
    const yTop = si === 0 ? yBody : Math.min(yBody, g0 + 5 * sh.nF - 0.5);
    for (const p of envelopeProfile(env)) {
      const y0 = p.index === 0 ? g0 : g0 + 5 * p.f0, y1 = Math.min(yTop, g0 + 5 * (p.f1 + 1));
      if (y1 - y0 < 1) continue;
      const piece = { x0: lot.x0 + p.ext.x0 + INSET, x1: lot.x0 + p.ext.x1 + 1 - INSET, z0: lot.z0 + p.ext.z0 + INSET, z1: lot.z0 + p.ext.z1 + 1 - INSET, y0, y1, chamfer: p.chamfer, bottom: p.disc && p.index > 0, shape: p.shape, id: lot.id, tint, style };
      pieces.push(piece);
      if (si === 0) topPiece = piece;
    }
  });
  if (crown.height > 0 && topPiece) {
    if (family === 'spine' && tw) {
      // the 3x3 lit spine column behind the door axis in the arcade (spine.js), through the canopy to its tip
      const tS = (front === 'S' || front === 'E') ? tw.dc - 4 : tw.dc + 2;
      const a0 = tw.mid - 1, a1 = tw.mid + 1;
      const r = tw.alongX ? { x0: a0, x1: a1 + 1, z0: tS, z1: tS + 3 } : { x0: tS, x1: tS + 3, z0: a0, z1: a1 + 1 };
      pieces.push({ x0: lot.x0 + r.x0 + INSET, x1: lot.x0 + r.x1 - INSET, z0: lot.z0 + r.z0 + INSET, z1: lot.z0 + r.z1 - INSET, y0: g0, y1: Math.min(254, g0 + 5 * nF + 18), chamfer: 0, id: lot.id, tint: SPINE_TINT, style: [STYLE_GLOW, 0, 0, 0], glow: true });
    } else {
      pieces.push({ x0: topPiece.x0, x1: topPiece.x1, z0: topPiece.z0, z1: topPiece.z1, y0: yBody, y1: yBody + crown.height, chamfer: 0, taper: crown.taper, id: lot.id, tint, style, crown: true });
    }
  }
  return { pieces, family, arch, crown };
}

// ------------------------------------------------------------------------------------------------ mesh assembly
// Faces are emitted with their own vertices (flat derivative normals per face). Winding: counter-clockwise seen from
// outside (three.js FrontSide). Side faces walk the plan polygon N face east->west, then W, S, E.
class MeshBuf {
  constructor() { this.pos = []; this.seed = []; this.ctr = []; this.tnt = []; this.sty = []; this.idx = []; this.n = 0; }
  face(points, attrs) {
    const { seed, cx, cz, tint, style } = attrs, base = this.n;
    for (const p of points) { this.pos.push(p[0], p[1], p[2]); this.seed.push(seed); this.ctr.push(cx, cz); this.tnt.push(tint[0], tint[1], tint[2]); this.sty.push(style[0], style[1], style[2], style[3]); }
    for (let i = 1; i + 1 < points.length; i++) this.idx.push(base, base + i, base + i + 1);
    this.n += points.length;
  }
  // a plain box (6 faces, 24 vertices - the landmark / lattice boxes and the ground-hidden podiums)
  box(b, attrs) {
    const { x0, x1, z0, z1, y0, y1 } = b;
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    for (const f of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]]) this.face(f.map((k) => c[k]), attrs);
  }
  // a prism over a chamfered rect (chamfer 0 = box): sides + top, the bottom only when asked (overhanging discs)
  prism(b, attrs) {
    const { x0, x1, z0, z1, y0, y1 } = b, c = Math.min(b.chamfer || 0, (Math.min(x1 - x0, z1 - z0) - 1) / 2);
    const P = c > 0
      ? [[x1 - c, z0], [x0 + c, z0], [x0, z0 + c], [x0, z1 - c], [x0 + c, z1], [x1 - c, z1], [x1, z1 - c], [x1, z0 + c]]
      : [[x1, z0], [x0, z0], [x0, z1], [x1, z1]];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], d = P[(i + 1) % P.length];
      this.face([[a[0], y0, a[1]], [d[0], y0, d[1]], [d[0], y1, d[1]], [a[0], y1, a[1]]], attrs);
    }
    this.face(P.map((p) => [p[0], y1, p[1]]), attrs);
    if (b.bottom) this.face(P.slice().reverse().map((p) => [p[0], y0, p[1]]), attrs);
  }
  // crown frustum: base corners inset by taper / 2, top corners by taper (fractions of the half extents)
  frustum(b, attrs) {
    const { x0, x1, z0, z1, y0, y1 } = b, tp = b.taper || 0;
    const bx = (x1 - x0) / 2 * tp * 0.5, bz = (z1 - z0) / 2 * tp * 0.5, ux = (x1 - x0) / 2 * tp, uz = (z1 - z0) / 2 * tp;
    const c = [[x0 + bx, y0, z0 + bz], [x1 - bx, y0, z0 + bz], [x1 - ux, y1, z0 + uz], [x0 + ux, y1, z0 + uz], [x0 + bx, y0, z1 - bz], [x1 - bx, y0, z1 - bz], [x1 - ux, y1, z1 - uz], [x0 + ux, y1, z1 - uz]];
    for (const f of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]]) this.face(f.map((k) => c[k]), attrs);
  }
}
const NO_STYLE = [0, 0, 0, 0];

export function buildSkyline(layout) {
  const lots = layout.lots.filter((l) => l.kind === 'tower');
  const g0 = LEVELS.ground + 1;
  const buf = new MeshBuf();
  let towerTris = 0;
  for (const l of lots) {
    const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
    const seed = (l.id % 97) / 97;
    for (const p of towerPieces(l, LEVELS.ground).pieces) {
      const attrs = { seed, cx, cz, tint: p.tint, style: p.style };
      if (p.crown) buf.frustum(p, attrs); else buf.prism(p, attrs);
    }
    towerTris = buf.idx.length / 3;
  }
  for (const b of landmarkBoxes(layout)) buf.box({ ...b, y0: b.y0 ?? g0 }, { seed: (b.id % 97) / 97 + 2, cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, tint: b.tint, style: NO_STYLE });
  for (const b of latticeBoxes(layout)) buf.box(b, { seed: (b.id % 97) / 97 + 4, cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, tint: b.tint, style: NO_STYLE });
  // ground sheet: one quad over the whole city footprint just under the plateau top, so the streets between the far
  // impostors read as dark ground instead of sky showing through; never culled (its centre is parked far away)
  const pb = PLATEAU, gy = LEVELS.ground + 0.6;
  buf.face([[pb.x0, gy, pb.z0], [pb.x0, gy, pb.z1], [pb.x1, gy, pb.z1], [pb.x1, gy, pb.z0]], { seed: 0.5, cx: 1e6, cz: 1e6, tint: GROUND_TINT, style: NO_STYLE });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf.pos), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(buf.seed), 1));
  geo.setAttribute('aCenter', new THREE.BufferAttribute(new Float32Array(buf.ctr), 2));
  geo.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(buf.tnt), 3));
  geo.setAttribute('aStyle', new THREE.BufferAttribute(new Float32Array(buf.sty), 4));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(buf.idx), 1));
  geo.computeBoundingSphere();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFogColor: SHARED.uFogColor, uSkyLight: SHARED.uSkyLight, uNear: { value: 400 }, uFar: { value: 1400 }, uChunkFar: { value: 160 }, uCamPos: { value: new THREE.Vector3() }, uGroundY: { value: LEVELS.ground } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: true, side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -5;   // behind everything else that is transparent
  mesh.name = 'coruscant-skyline';
  mesh.userData.towerTris = towerTris;
  return mesh;
}

// Adds the impostor mesh to the scene; uniforms follow the terrain's render distance and fog each render.
export function installSkyline(game, layout) {
  if (!game || !game.scene) return null;
  const mesh = buildSkyline(layout);
  mesh.onBeforeRender = (renderer, scene, camera) => {
    const u = mesh.material.uniforms;
    // the ring of real chunks ends at nearRadius (terrain.js); the view distance itself may reach much further
    const R = (game.terrain ? (game.terrain.nearRadius ?? game.terrain.renderDistance) : 8) * 16;
    u.uChunkFar.value = R;
    u.uNear.value = R * 1.6;
    u.uFar.value = Math.max(R * 5, 900);
    u.uCamPos.value.copy(camera.position);
  };
  game.scene.add(mesh);
  return mesh;
}
