// Crowd cells (P6): the instanced Coruscant crowd (npc/coruscant/crowd.js) draws every person from one atlas whose
// 128x64 cells are painted by the appearance composer instead of the old 22 x 6 hand-painted skins. This module is
// the pure part - no THREE, no DOM - so the offline test (scripts/test-crowd.mjs) can build the very same table and
// pixels in node:
//
//   const table = buildCrowdCellTable();                 // deterministic cell records + groups (archetype x gender)
//   const cell = table.cellFor('tourist', variant, female [, personKey]);   // atlas cell index for a citizen
//   const info = composeCrowdCell(table.cells[cell]);   // { raster (128x64), boxes, eyes, lid, scale, species ... }
//   fillCellRow(tab, cell, info);                       // per-cell shader table (blink rects, body scale, part boxes)
//
// Cell = (crowd archetype, gender, variant): 19 humanoid archetypes x 2 genders x CELLS_PER_GENDER composer seeds,
// a child group (the census scales children to 0.72; their cells use the composer's child archetype), and the three
// droid archetypes (protocol droids are composer cells with emissive photoreceptors; astromechs and sweepers keep
// the skins-sw.js painters upscaled 2x because the composer's droid box models do not fit the crowd's droid meshes).
// Seeds derive from the key alone; the choice step (no pixels) is used to keep every visible face id unique across
// the whole atlas and every hidden-face (helmet) cell distinct within its group. No Math.random anywhere.
import { composeUncached, chooseAppearance, HEAD_HEADGEAR } from './compose.js';
import { resolveArchetype, ARCHETYPES } from './archetypes.js';
import { TEX_W, TEX_H } from './layout.js';
import { Raster, SoftCanvas, rgb } from './raster.js';
import { subSeed } from './faces.js';
import { paintSWSkin, CELL_W as SW_W, CELL_H as SW_H, EMISSIVE_ALPHA } from '../skins-sw.js';

export const CELL_W = TEX_W, CELL_H = TEX_H;      // 128 x 64: the classic layout at 2x
export const ATLAS_COLS = 16;                     // 16 x 128 = 2048 px wide
export const ATLAS_MAX_ROWS = 32;                 // 32 x 64 = 2048 px tall (the GPU-side cap)
export const CELLS_PER_GENDER = 12;               // composer seeds per (archetype, gender)
export const CHILD_CELLS_PER_GENDER = 8;
export const DROID_CELLS = 8;                     // astromech / sweeper cells (skins-sw.js painters)
export const PROTOCOL_CELLS = 16;                 // protocol droid cells (composer; 19 of them stand on the Senate plaza)
export const MAX_BOXES = 8;                       // geometry boxes carried per cell (species parts first, then hair, hats, capes...)
export const TAB_W = 8 + MAX_BOXES * 8;           // texels per cell row of the shader table
export const T_EYE_A = 0, T_SCALE = 1, T_LID = 2, T_EYE_B = 3, T_BOX0 = 8;   // table texel slots
export const EMISSIVE_BYTE = Math.round(EMISSIVE_ALPHA * 255);               // 191: alpha the crowd shader reads as "lit"
export const BOX_FACES = ['left', 'right', 'top', 'bottom', 'front', 'back']; // BoxGeometry face order (+x, -x, +y, -y, +z, -z)

// the crowd's archetype names (census.js / rooms.js JOB_ARCHETYPE), in atlas order
export const CROWD_HUMANOIDS = ['office worker', 'resident', 'senator', 'senate aide', 'senate guard', 'security officer', 'pilot', 'mechanic', 'dock worker', 'vendor', 'cook', 'bartender', 'medic', 'patient', 'tourist', 'courier', 'jedi', 'bounty hunter', 'journalist'];
export const CROWD_DROIDS = ['protocol droid', 'astromech', 'sweeper droid'];
export const CHILD_ARCHETYPE = 'child';
const SW_DROIDS = new Set(['astromech', 'sweeper droid']);   // painted by skins-sw.js
// crowd names the composer's aliases do not cover ('security officer' would fall back to 'resident')
export const ARCH_OVERRIDE = { 'security officer': 'csf_officer' };

// humanoid part index (crowd.js shader) and the part boxes / pivot shifts of model.js
export const PART_INDEX = { head: 0, body: 1, rightArm: 2, leftArm: 3, rightLeg: 4, leftLeg: 5 };
const PART_BOX = { head: [8, 8, 8, [0, 4, 0]], body: [8, 12, 4, [0, 0, 0]], rightArm: [4, 12, 4, [0, -4, 0]], leftArm: [4, 12, 4, [0, -4, 0]], rightLeg: [4, 12, 4, [0, -6, 0]], leftLeg: [4, 12, 4, [0, -6, 0]] };
const CHILD_BODY = [0.74, 0.68, 0.74];   // compose.js bodyScale child factor (the crowd already scales children by 0.72)

export function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const keyHash = (key) => (typeof key === 'number' ? (Math.imul(key | 0, 0x9e3779b1) ^ 0x7f4a7c15) >>> 0 : strHash(String(key)));

const DROID_LIKE = (name) => CROWD_DROIDS.includes(name);
export const isCrowdDroid = DROID_LIKE;

// ---------------------------------------------------------------------------------------------------------------
export class CrowdCellTable {
  constructor() {
    this.cells = [];     // { index, archetype, arch, gender, variant, seed, kind: 'compose' | 'sw', group, key, faceId, species, outfit, colourway, wear, hiddenFace }
    this.groups = [];    // { id, archetype, arch, gender, start, count, droid, child }
    this.groupByKey = new Map();
    this.seen = new Set();
  }
  get count() { return this.cells.length; }
  get rows() { return Math.ceil(this.cells.length / ATLAS_COLS); }
  get atlasWidth() { return ATLAS_COLS * CELL_W; }
  get atlasHeight() { return this.rows * CELL_H; }
  cellRect(i) { return [(i % ATLAS_COLS) * CELL_W, Math.floor(i / ATLAS_COLS) * CELL_H, CELL_W, CELL_H]; }

  addGroup(archetype, gender, count, { arch = null, child = false } = {}) {
    const droid = DROID_LIKE(archetype);
    const composerArch = arch || ARCH_OVERRIDE[archetype] || resolveArchetype(archetype);
    const g = { id: `${archetype}|${gender}`, archetype, arch: composerArch, gender, start: this.cells.length, count, droid, child };
    this.groups.push(g);
    this.groupByKey.set(g.id, g);
    for (let v = 0; v < count; v++) this.cells.push(this.makeCell(g, v));
    return g;
  }

  // Deterministic seed per (group, variant): bumped while the choice collides with an earlier cell (same visible
  // face id anywhere in the atlas, or the same outfit / colourway / wear / species for a hidden face in the group).
  makeCell(g, variant) {
    const key = `${g.archetype}|${g.gender}|${variant}`;
    const base = strHash(key);
    if (SW_DROIDS.has(g.archetype)) {
      const seed = CROWD_DROIDS.indexOf(g.archetype) * 100 + variant + 1;   // the seeds the W4 atlas used
      return { index: this.cells.length, archetype: g.archetype, arch: g.arch, gender: 'none', variant, seed, kind: 'sw', group: g, key, faceId: null, species: 'droid', outfit: g.archetype, colourway: 'v' + variant, wear: 'worn', hiddenFace: true };
    }
    let seed = 0, choice = null, uniq = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      seed = (subSeed(base, 'crowd:' + attempt) | 0) || 1;
      choice = chooseAppearance(seed, { archetype: g.arch, gender: g.gender === 'none' ? undefined : g.gender });
      const hidden = !choice.face || HEAD_HEADGEAR.has(choice.outfit.headgear || 'none');
      uniq = hidden ? `${g.id}|${choice.outfit.id}|${choice.colourway.id}|${choice.wear}|${choice.species}` : 'face|' + faceKey(choice.face);
      if (!this.seen.has(uniq)) break;
    }
    this.seen.add(uniq);
    const hidden = !choice.face || HEAD_HEADGEAR.has(choice.outfit.headgear || 'none');
    return {
      index: this.cells.length, archetype: g.archetype, arch: g.arch, gender: choice.gender, variant, seed, kind: 'compose', group: g, key,
      faceId: choice.face ? faceKey(choice.face) : null, species: choice.species, outfit: choice.outfit.id, colourway: choice.colourway.id, wear: choice.wear, age: choice.age, hiddenFace: hidden,
    };
  }

  groupOf(archetype, female = false, child = false) {
    const droid = DROID_LIKE(archetype);
    if (child && !droid) return this.groupByKey.get(`${CHILD_ARCHETYPE}|${female ? 'feminine' : 'masculine'}`) || this.groupOf(archetype, female, false);
    const name = CROWD_HUMANOIDS.includes(archetype) || droid ? archetype : 'resident';
    return this.groupByKey.get(`${name}|${droid ? 'none' : female ? 'feminine' : 'masculine'}`) || this.groups[0];
  }
  // Atlas cell for a citizen. `variant` is the census's 0..7; `key` (optional, e.g. person.key) spreads the pick
  // over the group's whole run of cells - the hook for the integrator (index.js passes archetype, variant, female).
  cellFor(archetype, variant = 0, female = false, key = null) {
    const g = this.groupOf(archetype, female);
    const n = g.count;
    const v = key != null && !g.droid ? keyHash(key) % n : ((Math.floor(variant) % n) + n) % n;
    return g.start + v;
  }
  groupOfCell(i) { const c = this.cells[i]; return c ? c.group : this.groups[0]; }
  // the child group's cell for a small person whose base cell is `cell` (same gender, same variant slot)
  childCellFor(cell) {
    const c = this.cells[cell];
    if (!c || c.group.droid || c.group.child) return cell;
    const g = this.groupByKey.get(`${CHILD_ARCHETYPE}|${c.gender === 'feminine' ? 'feminine' : 'masculine'}`);
    return g ? g.start + (c.variant % g.count) : cell;
  }
  // Spread: the first cell of `base`'s group, starting at base, whose index is not in `used` (a Set of cells worn
  // by people nearby); base itself when the whole group is taken.
  spread(base, used) {
    if (!used || !used.has(base)) return base;
    const g = this.groupOfCell(base);
    for (let k = 1; k < g.count; k++) { const c = g.start + ((base - g.start + k) % g.count); if (!used.has(c)) return c; }
    return base;
  }
  speciesByArchetype() {
    const out = {};
    for (const c of this.cells) { const k = c.archetype; out[k] = out[k] || {}; out[k][c.species] = (out[k][c.species] || 0) + 1; }
    return out;
  }
}

export function faceKey(face) {
  return [face.tone.id, face.eyeColour.id, face.eyeShape, face.brow, face.nose, face.mouth, face.facialHair, face.hairStyle, face.hairColour.id, face.age, face.marking, face.gender[0]].join('/');
}

let cached = null;
export function buildCrowdCellTable({ perGender = CELLS_PER_GENDER, childPerGender = CHILD_CELLS_PER_GENDER, droidCells = DROID_CELLS, protocolCells = PROTOCOL_CELLS, fresh = false } = {}) {
  const standard = perGender === CELLS_PER_GENDER && childPerGender === CHILD_CELLS_PER_GENDER && droidCells === DROID_CELLS && protocolCells === PROTOCOL_CELLS;
  if (cached && !fresh && standard) return cached;
  const t = new CrowdCellTable();
  for (const a of CROWD_HUMANOIDS) { t.addGroup(a, 'masculine', perGender); t.addGroup(a, 'feminine', perGender); }
  t.addGroup(CHILD_ARCHETYPE, 'masculine', childPerGender, { arch: 'child', child: true });
  t.addGroup(CHILD_ARCHETYPE, 'feminine', childPerGender, { arch: 'child', child: true });
  for (const d of CROWD_DROIDS) t.addGroup(d, 'none', SW_DROIDS.has(d) ? droidCells : protocolCells);
  if (t.rows > ATLAS_MAX_ROWS) throw new Error(`crowd atlas: ${t.count} cells need ${t.rows} rows (max ${ATLAS_MAX_ROWS})`);
  if (standard) cached = t;
  return t;
}

// ---------------------------------------------------------------------------------------------------------------
// Paints one cell. Returns { raster, boxes, eyes, lid, scale, species, faceId, outfit, description, id, parts }.
export function composeCrowdCell(cell) {
  if (cell.kind === 'sw') return paintSWCell(cell);
  const app = composeUncached(cell.seed, { archetype: cell.arch, gender: cell.gender === 'none' ? undefined : cell.gender }, { canvas: false });
  const r = app.raster;
  // droid photoreceptors: the lamp centres get the emissive alpha (the composer paints them opaque)
  if (app.debug && app.debug.eyeLamps) for (const [x, y, w, h] of app.debug.eyeLamps) { const cx = x + (w >> 1), cy = y + (h >> 1); const p = r.get(cx, cy); r.px(cx, cy, [p[0], p[1], p[2], EMISSIVE_BYTE]); }
  const boxes = collectBoxes(app);
  const eyes = app.eyes && app.debug && app.debug.eyeRects && app.debug.eyeRects.length >= 2 ? app.debug.eyeRects.slice(0, 2).map((e) => e.slice()) : null;
  const lid = app.eyes ? rgb(app.eyes.lid) : null;
  let scale = app.model.kind === 'humanoid' && app.model.scale ? app.model.scale.slice() : [1, 1, 1];
  if (cell.arch === 'child') scale = scale.map((v, i) => v / CHILD_BODY[i]);
  const parts = [...new Set(boxes.map((b) => b.name))];
  return { raster: r, boxes, eyes, lid, scale, species: app.species, faceId: app.face ? app.face.id : null, outfit: app.outfit, description: app.description, id: app.id, parts, dropped: countBoxes(app) - boxes.length };
}

function countBoxes(app) { let n = 0; for (const rec of app.geometry) if (PART_INDEX[rec.attach] != null) n += rec.boxes.filter((b) => b.uv).length; return n + (app.overlays || []).filter((o) => o.uv).length; }

// Geometry records -> up to MAX_BOXES crowd boxes (part-local px, six uv rects). Species parts come first in
// app.geometry, then hair volume, then outfit parts; overlays (hood up) last.
export function collectBoxes(app) {
  const out = [];
  for (const rec of app.geometry || []) {
    const part = PART_INDEX[rec.attach];
    if (part == null) continue;
    for (const b of rec.boxes) {
      if (!b.uv) continue;
      if (out.length >= MAX_BOXES) return out;
      out.push({ part, x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, d: b.d, uv: b.uv, kind: rec.kind, name: rec.part || rec.kind });
    }
  }
  for (const ov of app.overlays || []) {
    if (!ov.uv) continue;
    if (out.length >= MAX_BOXES) return out;
    const spec = PART_BOX[ov.part] || PART_BOX.head;
    const i = ov.inflate ?? 0.5;
    out.push({ part: PART_INDEX[ov.part] ?? 0, x: spec[3][0], y: spec[3][1], z: spec[3][2], w: spec[0] + 2 * i, h: spec[1] + 2 * i, d: spec[2] + 2 * i, uv: ov.uv, kind: ov.kind || 'overlay', name: ov.kind || 'hood' });
  }
  return out;
}

// astromech / sweeper: the W4 painter at 64x32 into a soft canvas, replicated 2x2 into the 128x64 cell (the glow
// texels keep their EMISSIVE_ALPHA)
function paintSWCell(cell) {
  const c = new SoftCanvas(SW_W, SW_H);
  paintSWSkin(c.getContext('2d'), 0, 0, cell.archetype, cell.seed, null);
  const src = c.raster, r = new Raster(CELL_W, CELL_H);
  for (let y = 0; y < SW_H; y++) for (let x = 0; x < SW_W; x++) { const p = src.get(x, y); if (p[3]) r.rect(x * 2, y * 2, 2, 2, p); }
  return { raster: r, boxes: [], eyes: null, lid: null, scale: [1, 1, 1], species: 'droid', faceId: null, outfit: { id: cell.archetype, colourway: 'v' + cell.variant, wear: 'worn' }, description: `${cell.archetype} unit ${cell.variant}`, id: `sw.${cell.archetype}.${cell.variant}`, parts: [], dropped: 0 };
}

// Copies a painted cell into the atlas raster.
export function blitCell(atlas, table, i, raster) {
  const [x0, y0] = table.cellRect(i);
  const W = atlas.w;
  for (let y = 0; y < CELL_H; y++) atlas.d.set(raster.d.subarray(y * CELL_W * 4, (y + 1) * CELL_W * 4), ((y0 + y) * W + x0) * 4);
}

// ---------------------------------------------------------------------------------------------------------------
// Shader table (RGBA float, TAB_W texels per cell row): texel 0 / 3 = eye rects A / B in cell px (w = 0: no
// blink), 1 = body scale xyz + box count, 2 = eyelid colour, 8 + b*8 .. = box b: centre xyz + attach part + 1,
// size xyz, then the six face rects [left, right, top, bottom, front, back].
export function emptyCellRow(tab, row) {
  const o = row * TAB_W * 4;
  tab.fill(0, o, o + TAB_W * 4);
  tab[o + T_SCALE * 4] = 1; tab[o + T_SCALE * 4 + 1] = 1; tab[o + T_SCALE * 4 + 2] = 1;
}
export function fillCellRow(tab, row, info) {
  emptyCellRow(tab, row);
  const o = row * TAB_W * 4;
  const put = (t, a, b, c, d) => { const k = o + t * 4; tab[k] = a; tab[k + 1] = b; tab[k + 2] = c; tab[k + 3] = d; };
  if (info.eyes && info.eyes.length >= 2) { put(T_EYE_A, info.eyes[0][0], info.eyes[0][1], info.eyes[0][2], info.eyes[0][3]); put(T_EYE_B, info.eyes[1][0], info.eyes[1][1], info.eyes[1][2], info.eyes[1][3]); }
  const s = info.scale || [1, 1, 1];
  put(T_SCALE, s[0], s[1], s[2], info.boxes ? info.boxes.length : 0);
  if (info.lid) put(T_LID, info.lid[0] / 255, info.lid[1] / 255, info.lid[2] / 255, 1);
  (info.boxes || []).slice(0, MAX_BOXES).forEach((b, i) => {
    const t = T_BOX0 + i * 8;
    put(t, b.x, b.y, b.z, b.part + 1);
    put(t + 1, b.w, b.h, b.d, 0);
    BOX_FACES.forEach((f, k) => { const rc = b.uv[f] || b.uv.front || [0, 0, 1, 1]; put(t + 2 + k, rc[0], rc[1], rc[2], rc[3]); });
  });
}
// reads a row back (tests / debug)
export function readCellRow(tab, row) {
  const o = row * TAB_W * 4, tex = (t) => [tab[o + t * 4], tab[o + t * 4 + 1], tab[o + t * 4 + 2], tab[o + t * 4 + 3]];
  const scale = tex(T_SCALE), boxes = [];
  for (let b = 0; b < MAX_BOXES; b++) {
    const c = tex(T_BOX0 + b * 8);
    if (c[3] <= 0) break;
    const s = tex(T_BOX0 + b * 8 + 1), uv = {};
    BOX_FACES.forEach((f, k) => { uv[f] = tex(T_BOX0 + b * 8 + 2 + k); });
    boxes.push({ part: c[3] - 1, x: c[0], y: c[1], z: c[2], w: s[0], h: s[1], d: s[2], uv });
  }
  const eA = tex(T_EYE_A), eB = tex(T_EYE_B);
  return { eyes: eA[2] > 0 ? [eA, eB] : null, scale: scale.slice(0, 3), boxCount: scale[3], lid: tex(T_LID), boxes };
}

export const CROWD_STATS = () => {
  const t = buildCrowdCellTable();
  return { cells: t.count, groups: t.groups.length, rows: t.rows, atlas: [t.atlasWidth, t.atlasHeight], perGender: CELLS_PER_GENDER, childPerGender: CHILD_CELLS_PER_GENDER, droidCells: DROID_CELLS, protocolCells: PROTOCOL_CELLS, humanoidArchetypes: CROWD_HUMANOIDS.length, composerArchetypes: [...new Set(t.groups.map((g) => g.arch))].filter((a) => ARCHETYPES[a]).length, maxBoxes: MAX_BOXES, tableTexels: TAB_W };
};

// the small per-cell record the renderer keeps after painting (census / debug; the pixels and boxes live in the atlas + table)
export function cellSummary(cell, info) {
  return { cell: cell.index, archetype: cell.archetype, arch: cell.arch, gender: cell.gender, species: info.species, faceId: info.faceId, outfit: info.outfit ? info.outfit.id : null, colourway: info.outfit ? info.outfit.colourway : null, parts: info.parts, boxes: info.boxes.length, dropped: info.dropped, eyes: !!info.eyes, id: info.id };
}
