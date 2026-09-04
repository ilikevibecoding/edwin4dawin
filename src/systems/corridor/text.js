// Stencil text for signage: one shared 1024² canvas atlas (A–Z 0–9 - / . : + and four arrows in five
// colours, plus big outlined deck numerals) drawn once per page, and two module-local materials that
// sample it. A room registers the materials through its manifest and then places text with the kit:
//
//   import { textMaterials, stencilText, stencilDigit } from "../../systems/corridor/text.js";
//   export default {
//     ...,
//     materials: textMaterials,                       // adds impText (painted) + impTextLit (glowing)
//     build(ctx) {
//       stencilText(ctx.kit, { text: "CARGO BAY 4-E", pos: [x, y, z], normal: [0, 0, 1], size: 0.12, color: "amber", lit: true });
//       stencilDigit(ctx.kit, { digit: "4", pos: [0, floorY + 0.004, 176], normal: [0, 1, 0], up: [0, 0, -1], size: 2.4, color: "grey" });
//     },
//   };
//
// Text is a row of small quads (two triangles per glyph) in the impText / impTextLit draw call; the
// atlas costs one canvas texture for the whole page, whichever module registers it first. Glyphs have
// stencil bridges cut through them; the floor numerals carry a dark outline and slight paint wear.
// When a module has not registered the materials, stencilText returns { skipped: true } and draws
// nothing, so kit builders can call it unconditionally.
import * as THREE from "three";
import { rng } from "../../kit.js";

export const TEXT_MAT = "impText"; // painted stencil (lit by the room)
export const TEXT_LIT_MAT = "impTextLit"; // self-lit sign text

const SIZE = 1024;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/.:+→←↑↓";
const PER_ROW = 23;
const CELL_W = 44;
const CELL_H = 70;
const FONT_PX = 58;
const CAP = 42; // cap height of the 58 px face
const BASE = 57; // baseline inside the cell
export const GLYPH_ASPECT = CELL_W / CELL_H;
/** advance per glyph as a fraction of the glyph height */
export const ADVANCE = 0.56;

// colour sets: name -> [fill, outline]
const SETS = [
  ["white", "#e6eaf1", null],
  ["dark", "#15171b", null],
  ["amber", "#ffa028", null],
  ["blue", "#5a90ff", null],
  ["red", "#ff2a1a", null],
];
const BIG_W = 100;
const BIG_H = 150;
const BIG_FONT = 128;
const BIG_CAP = 92;
const BIG_BASE = 134;
const BIG_SETS = [
  ["grey", "#8d9198", "#111214", true],
  ["white", "#dfe3ea", "#33363c", false],
];
const FONT = (px) => `800 ${px}px "JetBrains Mono ExtraBold", "JetBrains Mono", "DejaVu Sans Mono", "Liberation Mono", "Cousine", monospace`;

let atlas = null;

function drawArrow(c, ch, x, y, w, h, cap, base) {
  const cx = x + w / 2;
  const cy = y + base - cap / 2;
  const L = cap * 0.9;
  const t = cap * 0.16;
  const head = cap * 0.34;
  c.save();
  c.translate(cx, cy);
  const rot = { "→": 0, "↓": Math.PI / 2, "←": Math.PI, "↑": -Math.PI / 2 }[ch] || 0;
  c.rotate(rot);
  c.fillRect(-L / 2, -t / 2, L - head + 2, t);
  c.beginPath();
  c.moveTo(L / 2, 0);
  c.lineTo(L / 2 - head, -head * 0.8);
  c.lineTo(L / 2 - head, head * 0.8);
  c.closePath();
  c.fill();
  c.restore();
}

function bridges(c, x, y, w, base, cap, thick, fracs) {
  c.save();
  c.globalCompositeOperation = "destination-out";
  for (const f of fracs) c.fillRect(x, y + base - cap * f - thick / 2, w, thick);
  c.restore();
}

function buildAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, SIZE, SIZE);
  const cells = new Map(); // `${set}:${glyph}` -> [px, py, w, h]
  let py = 0;
  for (const [name, fill] of SETS) {
    for (let i = 0; i < GLYPHS.length; i++) {
      const ch = GLYPHS[i];
      const px = (i % PER_ROW) * CELL_W;
      const row = Math.floor(i / PER_ROW);
      const cy = py + row * CELL_H;
      c.save();
      c.beginPath();
      c.rect(px, cy, CELL_W, CELL_H);
      c.clip();
      c.fillStyle = fill;
      if ("→←↑↓".includes(ch)) drawArrow(c, ch, px, cy, CELL_W, CELL_H, CAP, BASE);
      else {
        c.font = FONT(FONT_PX);
        c.textAlign = "center";
        c.textBaseline = "alphabetic";
        c.fillText(ch, px + CELL_W / 2, cy + BASE);
        // one thin stencil bridge: two 2.4 px cuts turned dense glyphs (W, M) into stacked bars at
        // reading distance, where a glyph is only 8-10 px tall
        bridges(c, px, cy, CELL_W, BASE, CAP, 1.8, [0.5]);
      }
      c.restore();
      cells.set(`${name}:${ch}`, [px, cy, CELL_W, CELL_H]);
    }
    py += Math.ceil(GLYPHS.length / PER_ROW) * CELL_H;
  }
  // big outlined numerals
  const wear = rng(4242);
  for (const [name, fill, outline, worn] of BIG_SETS) {
    for (let d = 0; d < 10; d++) {
      const px = d * BIG_W;
      c.save();
      c.beginPath();
      c.rect(px, py, BIG_W, BIG_H);
      c.clip();
      c.font = FONT(BIG_FONT);
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.lineJoin = "round";
      c.lineWidth = 9;
      c.strokeStyle = outline;
      c.strokeText(String(d), px + BIG_W / 2, py + BIG_BASE);
      c.fillStyle = fill;
      c.fillText(String(d), px + BIG_W / 2, py + BIG_BASE);
      bridges(c, px, py, BIG_W, BIG_BASE, BIG_CAP, 4, [0.3, 0.68]);
      if (worn) {
        c.globalCompositeOperation = "destination-out";
        for (let k = 0; k < 90; k++) {
          const wx = px + 6 + wear() * (BIG_W - 12);
          const wy = py + 20 + wear() * (BIG_H - 40);
          const s = 1 + wear() * 3;
          c.globalAlpha = 0.35 + wear() * 0.65;
          c.fillRect(wx, wy, s * (1 + wear() * 3), s);
        }
      }
      c.restore();
      cells.set(`big-${name}:${d}`, [px, py, BIG_W, BIG_H]);
    }
    py += BIG_H;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return { canvas, texture, cells };
}

/** The page-wide atlas (built on first use; needs a DOM canvas). */
export function textAtlas() {
  if (!atlas) atlas = buildAtlas();
  return atlas;
}

let mats = null;
/**
 * Module-local materials for the manifest: `materials: textMaterials`. The two instances are shared by
 * every module on the page (the registry only merges references), so the atlas is one texture in total.
 */
export function textMaterials() {
  if (!mats) {
    const tex = textAtlas().texture;
    mats = {
      [TEXT_MAT]: new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, roughness: 0.78, metalness: 0.04, vertexColors: true, envMapIntensity: 0.3 }),
      [TEXT_LIT_MAT]: new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color(0xffffff), emissiveMap: tex, emissiveIntensity: 1.0, alphaTest: 0.4, roughness: 0.5, metalness: 0, vertexColors: true }),
    };
  }
  return { ...mats };
}

const uvRect = ([px, py, w, h]) => [px / SIZE, 1 - (py + h) / SIZE, (px + w) / SIZE, 1 - py / SIZE];

function basis(normal, up) {
  const n = new THREE.Vector3(normal[0], normal[1], normal[2]).normalize();
  let u = new THREE.Vector3(up[0], up[1], up[2]).normalize();
  if (Math.abs(u.dot(n)) > 0.99) u = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const r = new THREE.Vector3().crossVectors(u, n).normalize();
  u = new THREE.Vector3().crossVectors(n, r).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, n));
  return { n, u, r, q };
}

/**
 * A row of stencil glyphs on a surface.
 * @param {import("../../kit.js").Kit} kit
 * @param {object} o
 * @param {string} o.text          upper-cased automatically; unknown characters become spaces
 * @param {number[]} o.pos         centre of the text row (align "center") or its left end ("left") / right end ("right"), ON the surface (put it 2–4 mm proud)
 * @param {number[]} [o.normal]    surface normal toward the reader ([0,0,1])
 * @param {number[]} [o.up]        reading "up" on the surface ([0,1,0]; for floors e.g. [0,0,-1])
 * @param {number} [o.size]        glyph height in metres (0.12)
 * @param {string} [o.color]       "white" | "dark" | "amber" | "blue" | "red"
 * @param {boolean} [o.lit]        use the glowing material
 * @param {string} [o.align]       "center" | "left" | "right"
 * @param {number} [o.spacing]     tracking multiplier (1)
 * @param {number} [o.maxWidth]    shrink the glyph size so the row fits this width
 * @param {number} [o.tint]        vertex colour (dims the painted variant), default white
 * @returns {{width:number, height:number, skipped?:boolean}}
 */
export function stencilText(kit, o) {
  const { text, pos, normal = [0, 0, 1], up = [0, 1, 0], color = "white", lit = false, align = "center", spacing = 1, maxWidth = null, tint = 0xffffff, mat = null } = o;
  const key = mat || (lit ? TEXT_LIT_MAT : TEXT_MAT);
  const str = String(text ?? "").toUpperCase();
  if (!kit.materials || !kit.materials[key] || !str.length) return { width: 0, height: 0, skipped: true };
  let size = o.size ?? 0.12;
  const n = str.length;
  let adv = size * ADVANCE * spacing;
  if (maxWidth && n * adv > maxWidth) {
    size *= maxWidth / (n * adv);
    adv = size * ADVANCE * spacing;
  }
  const width = n * adv;
  const { cells } = textAtlas();
  const { u, r, q } = basis(normal, up);
  const start = align === "left" ? 0 : align === "right" ? -width : -width / 2;
  const gw = size * GLYPH_ASPECT;
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const ch = str[i];
    const cell = cells.get(`${color}:${ch}`);
    if (!cell) continue; // space / unknown
    const cx = start + adv * (i + 0.5);
    p.set(pos[0], pos[1], pos[2]).addScaledVector(r, cx).addScaledVector(u, size * 0.014); // cap centre sits at 0.486 of the cell
    kit.add(key, new THREE.PlaneGeometry(gw, size), { pos: [p.x, p.y, p.z], quat: q, uv: "keep", uvRect: uvRect(cell), color: tint });
  }
  return { width, height: size };
}

/**
 * One big outlined numeral (deck number on a floor or wall). size = numeral cell height in metres;
 * the visible digit is ~0.6·size tall. color: "grey" (worn floor paint) | "white".
 */
export function stencilDigit(kit, o) {
  const { digit = "4", pos, normal = [0, 1, 0], up = [0, 0, -1], size = 2.4, color = "grey", lit = false, tint = 0xffffff, mat = null } = o;
  const key = mat || (lit ? TEXT_LIT_MAT : TEXT_MAT);
  if (!kit.materials || !kit.materials[key]) return { skipped: true };
  const cell = textAtlas().cells.get(`big-${color}:${String(digit)[0]}`);
  if (!cell) return { skipped: true };
  const { q, u } = basis(normal, up);
  const p = new THREE.Vector3(pos[0], pos[1], pos[2]).addScaledVector(u, size * 0.087); // glyph centre sits at 0.413 of the cell
  kit.add(key, new THREE.PlaneGeometry(size * (BIG_W / BIG_H), size), { pos: [p.x, p.y, p.z], quat: q, uv: "keep", uvRect: uvRect(cell), color: tint });
  return { width: size * (BIG_W / BIG_H), height: size };
}

/** Width a text row will take at the given glyph size (for sizing plates). */
export function textWidth(text, size = 0.12, spacing = 1) {
  return String(text ?? "").length * size * ADVANCE * spacing;
}
