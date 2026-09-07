// 2D "paper doll" projection of an appearance: the humanoid parts (or a droid's box list) plus the geometry
// records, drawn as orthographic front / back / side views straight from the skin canvas. Used by the contact
// sheets; it needs no WebGL so it runs on any 2D context (real canvas or SoftCanvas).
import { PART } from './layout.js';

// pivots of the humanoid parts in world px (model.js: head at the neck y=24, body centre 18, shoulders 22, hips 12)
const PIVOT = { head: [0, 24, 0], body: [0, 18, 0], rightArm: [-6, 22, 0], leftArm: [6, 22, 0], rightLeg: [-2, 12, 0], leftLeg: [2, 12, 0] };

// Boxes in world px (centre + size) with their uv face sets
export function appearanceBoxes(app, { headOnly = false } = {}) {
  const boxes = [];
  if (app.model.kind === 'boxes') {
    for (const p of app.model.parts) boxes.push({ x: p.x, y: p.y, z: p.z, w: p.w, h: p.h, d: p.d, uv: p.uv, name: p.name });
    return boxes;
  }
  boxes.push({ x: 0, y: 28, z: 0, w: 8, h: 8, d: 8, uv: PART.head, name: 'head' });
  if (!headOnly) {
    boxes.push({ x: 0, y: 18, z: 0, w: 8, h: 12, d: 4, uv: PART.body, name: 'body' });
    boxes.push({ x: -6, y: 18, z: 0, w: 4, h: 12, d: 4, uv: PART.arm, name: 'rightArm' }, { x: 6, y: 18, z: 0, w: 4, h: 12, d: 4, uv: PART.arm, name: 'leftArm' });
    boxes.push({ x: -2, y: 6, z: 0, w: 4, h: 12, d: 4, uv: PART.leg, name: 'rightLeg' }, { x: 2, y: 6, z: 0, w: 4, h: 12, d: 4, uv: PART.leg, name: 'leftLeg' });
  }
  for (const rec of app.geometry || []) {
    if (headOnly && rec.attach !== 'head') continue;
    const pv = PIVOT[rec.attach] || PIVOT.body;
    for (const b of rec.boxes) boxes.push({ x: pv[0] + b.x, y: pv[1] + b.y, z: pv[2] + b.z, w: b.w, h: b.h, d: b.d, uv: b.uv, name: rec.kind });
  }
  for (const ov of app.overlays || []) {
    if (!ov.uv) continue;
    const base = boxes.find((b) => b.name === ov.part) || boxes[0];
    const i = ov.inflate || 0.5;
    boxes.push({ x: base.x, y: base.y, z: base.z, w: base.w + 2 * i, h: base.h + 2 * i, d: base.d + 2 * i, uv: ov.uv, name: 'overlay' });
  }
  return boxes;
}

// view: 'front' | 'back' | 'left' (the character's left side) | 'right'
function project(box, view) {
  switch (view) {
    case 'back': return { sx: -box.x - box.w / 2, sy: box.y + box.h / 2, sw: box.w, sh: box.h, depth: -box.z, face: 'back' };
    case 'left': return { sx: -box.z - box.d / 2, sy: box.y + box.h / 2, sw: box.d, sh: box.h, depth: box.x, face: 'left' };
    case 'right': return { sx: box.z - box.d / 2, sy: box.y + box.h / 2, sw: box.d, sh: box.h, depth: -box.x, face: 'right' };
    default: return { sx: box.x - box.w / 2, sy: box.y + box.h / 2, sw: box.w, sh: box.h, depth: box.z, face: 'front' };
  }
}

// Draws the doll with its feet at (ox, oy) screen px and `S` screen px per model px. Returns the drawn bounds.
export function drawDoll(ctx, app, view, ox, oy, S, opts = {}) {
  const boxes = appearanceBoxes(app, opts);
  const sc = opts.applyScale === false ? [1, 1, 1] : (app.model.scale || [1, 1, 1]);
  const items = boxes.map((b) => ({ b, p: project(b, view) })).sort((a, c) => a.p.depth - c.p.depth);
  ctx.imageSmoothingEnabled = false;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const hs = view === 'front' || view === 'back' ? sc[0] : sc[2];
  for (const { b, p } of items) {
    const rect = b.uv && b.uv[p.face];
    if (!rect) continue;
    const x = ox + p.sx * hs * S, y = oy - p.sy * sc[1] * S, w = p.sw * hs * S, h = p.sh * sc[1] * S;
    ctx.drawImage(app.skin, rect[0], rect[1], rect[2], rect[3], Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    minX = Math.min(minX, x); maxX = Math.max(maxX, x + w); minY = Math.min(minY, y); maxY = Math.max(maxY, y + h);
  }
  return { minX, maxX, minY, maxY };
}

// Head front at `S` px per model px (8 -> 128 px), centred at (cx, top)
export function drawHead(ctx, app, cx, top, S) {
  return drawDoll(ctx, app, 'front', cx, top + 32 * S, S, { headOnly: true, applyScale: false });
}
