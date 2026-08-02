/**
 * The canonical LEGO minifigure: rig, costume hooks and animation.
 *
 * Everything is built from the brick kit. The figure faces -Z, stands with its
 * soles on y = 0 and is exactly 5.0 units tall (4 bricks + the head stud).
 *
 *   5.00  top of the head stud            <- total height
 *   4.80  top of the head                 (4 bricks)
 *   3.60  neck, head pivot
 *   3.28  shoulder pivot
 *   2.00  waist: top of the hips, bottom of the torso
 *   1.45  hip pivot: top of the legs
 *   0.00  soles
 *
 * Joint tree (every joint is a Group whose origin is the anatomical pivot):
 *
 *   fig
 *   +- root                     whole-body tilt, used by fall()
 *      +- hips                  pelvis; carries the walk bob
 *         +- legL, legR         swing at the top of the leg
 *         +- torso             waist twist / lean
 *            +- armL, armR     shoulder
 *            |  +- wrist       fixed forearm bend
 *            |     +- handL/R  wrist twist, holds userData.grip
 *            +- neck
 *            |  +- head        head pivot at the neck
 *            |     +- gear     headgear
 *            +- cape           segmented cloth, see capeSim()
 *
 * Rotation conventions (radians, all "natural direction"):
 *   arms / legs   positive swings the limb forward (-Z)
 *   hands         positive twists the palm outward about the forearm
 *   headY         positive turns the face toward the figure's left
 *   headX         positive tips the chin up
 *   torsoY        positive twists the chest toward the figure's left
 *   lean          positive leans the upper body forward
 */
import * as THREE from 'three';
import {
  tile, prism, cyl, cone, sphere, bar, panel,
  at, rot, group, bake, mat, glow, norm,
  C, PLATE, BRICK,
} from './bricks.js';

/** Canonical measurements, exported so scene code can place props and cameras. */
export const MINIFIG = {
  height: 5.0,        // soles to the top of the head stud
  headTop: 4.8,       // soles to the crown
  neckY: 3.6,         // head pivot
  shoulderY: 3.28,    // arm pivot
  shoulderX: 0.9,     // arm pivot offset from the centre line
  waistY: 2.0,        // top of the hips
  hipY: 1.45,         // leg pivot
  legLen: 1.45,
  shortLegLen: 0.65,  // "short legs" figures (jawa, droids in robes)
  headR: 0.6,
  torsoD: 1.06,
  elbow: 0.62,        // fixed forearm bend, radians
  handReach: 0.3,     // wrist to the centre of the grip
};

const HIP_BLOCK = 0.55;                 // hips height, hipY .. waistY
const TORSO_H = MINIFIG.neckY - MINIFIG.waistY;   // 1.6
const PREV = new WeakMap();             // capeSim motion memory

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const texMatCache = new Map();

/**
 * Standard material carrying an SVG texture.
 * `mat()` from the brick kit keys its cache with JSON.stringify, which cannot
 * handle a texture, so printed parts get their materials from here.
 * @param {THREE.Texture} map
 * @param {object} [o] {color, rough, metal, transparent, alphaTest, emissive, emissiveIntensity}
 */
export function texMat(map, o = {}) {
  const key = map.uuid + '|' + JSON.stringify(o);
  let m = texMatCache.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({
    map,
    color: o.color ?? 0xffffff,
    roughness: o.rough ?? 0.42,
    metalness: o.metal ?? 0,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    alphaTest: o.alphaTest ?? (o.transparent ? 0.03 : 0),
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    side: o.side || THREE.FrontSide,
  });
  texMatCache.set(key, m);
  return m;
}

/**
 * Curved shell: an open cylinder wall spanning part of a circle. The workhorse
 * for helmet fronts, visors and droid panels. Base at y = 0, centred on X/Z.
 * @param {number} r radius
 * @param {number} h height
 * @param {object} [o] {span, center, seg, rTop, color, map, glow, opacity, ...}
 *   `center` is the arc's mid angle measured from +Z (so Math.PI = the front).
 */
export function arcShell(r, h, o = {}) {
  const span = o.span ?? Math.PI * 2;
  const center = o.center ?? Math.PI;
  const seg = o.seg ?? Math.max(6, Math.round((span / (Math.PI * 2)) * 26));
  const g = norm(new THREE.CylinderGeometry(
    o.rTop ?? r, r, h, seg, 1, true, center - span / 2, span));
  g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, o.map ? texMat(o.map, o)
    : o.glow ? glow(o.color ?? C.transClear, o.opacity ?? 1)
      : mat(o.color ?? C.lightGray, o));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Extrude a front-view outline along Z: the shape for trapezoidal torsos,
 * wedges seen from the side, hip skirts and so on.
 * Compensates for prism()'s vertical offset so the outline's y = 0 is y = 0.
 * @param {Array<[number,number]>} pts outline as [x, y], +y up
 * @param {number} depth extrusion depth (Z), centred on z = 0
 */
export function slab(pts, depth, o = {}) {
  const b = o.bevel ?? 0.03;
  const m = prism(pts, depth, o);
  rot(m, Math.PI / 2, 0, 0);
  m.position.z = -(1.5 * depth - 2 * b);
  return m;
}

/** Flat polygon in the XZ plane (top-down outline), base at y = 0. */
export function slabXZ(pts, h, o = {}) {
  const b = o.bevel ?? 0.03;
  const m = prism(pts.map(([x, z]) => [x, -z]), h, o);
  m.position.y = -(h - 2 * b);
  return m;
}

/** Merge solid meshes into one draw call; decal panels stay separate. */
function assemble(solids, decals) {
  const g = bake(group(...solids.filter(Boolean)));
  for (const d of (decals || [])) {
    if (!d) continue;
    d.castShadow = false;
    d.receiveShadow = false;
    g.add(d);
  }
  return g;
}

/** A decal quad standing on the model's front (-Z) face. */
export function frontPanel(w, h, tex, x, y, z, o = {}) {
  const p = panel(w, h, tex, o);
  rot(p, o.rx ?? 0, Math.PI, 0);
  at(p, x, y, z);
  p.userData.noBake = true;
  return p;
}

/** A decal quad on the model's back (+Z) face. */
export function backPanel(w, h, tex, x, y, z, o = {}) {
  const p = panel(w, h, tex, o);
  at(p, x, y, z);
  p.userData.noBake = true;
  return p;
}

const num = (v) => typeof v === 'number' && isFinite(v);

/** Apply a pose value that may be a number (primary axis) or {x,y,z}. */
function setJoint(j, v, axis, def) {
  if (!j) return;
  if (v === undefined) return;
  if (v === null) { j.rotation.set(def[0], def[1], def[2]); return; }
  if (num(v)) {
    j.rotation.set(def[0], def[1], def[2]);
    j.rotation[axis] = def[axis === 'x' ? 0 : axis === 'y' ? 1 : 2] + v;
    return;
  }
  j.rotation.set(
    def[0] + (v.x || 0),
    def[1] + (v.y || 0),
    def[2] + (v.z || 0),
  );
}

/* ------------------------------------------------------------------ */
/* parts                                                              */
/* ------------------------------------------------------------------ */

/** One leg, hanging from the hip pivot at its local origin. */
function legPiece(color, len, hipColor) {
  const shoe = len > 1.0;
  const footH = shoe ? 0.34 : 0.26;
  const shaft = len - footH;
  const solids = [
    // rounded top knuckle: hidden inside the hips, keeps the hip joint clean
    at(rot(cyl(0.35, 0.7, { color, seg: 14 }), 0, 0, Math.PI / 2), 0.35, 0, 0),
    at(tile(0.72, 0.92, shaft, { color }), 0, -shaft, 0),
    // boot: deeper than the leg, toe projecting forward
    at(tile(0.74, 1.12, footH, { color: hipColor ?? color }), 0, -len, -0.1),
  ];
  return assemble(solids);
}

/** Hips block, sitting on top of the hip pivot. */
function hipPiece(color, tex) {
  const solids = [
    at(tile(1.56, 1.06, HIP_BLOCK - 0.08, { color }), 0, 0.08, 0),
    at(tile(1.44, 0.96, 0.1, { color }), 0, 0, 0),
  ];
  const decals = tex
    ? [frontPanel(1.6, HIP_BLOCK, tex, 0, HIP_BLOCK / 2, -0.542)]
    : null;
  return assemble(solids, decals);
}

/** Trapezoidal torso with sloped shoulders and the neck stub. */
function torsoPiece(color, tex, backTex) {
  const outline = [
    [-0.72, 0], [0.72, 0],
    [0.86, 0.72], [0.95, 1.22],
    [0.84, 1.44], [0.36, 1.6],
    [-0.36, 1.6], [-0.84, 1.44],
    [-0.95, 1.22], [-0.86, 0.72],
  ];
  const solids = [
    slab(outline, MINIFIG.torsoD, { color }),
    // shoulder pads: the little bosses the arms plug into
    at(rot(cyl(0.3, 0.16, { color, seg: 14 }), 0, 0, Math.PI / 2), 0.94, 1.28, 0),
    at(rot(cyl(0.3, 0.16, { color, seg: 14 }), 0, 0, -Math.PI / 2), -0.94, 1.28, 0),
    // neck
    at(cyl(0.3, 0.14, { color, seg: 14 }), 0, 1.56, 0),
  ];
  const decals = [];
  if (tex) decals.push(frontPanel(1.78, 1.6, tex, 0, 0.8, -(MINIFIG.torsoD / 2 + 0.012)));
  if (backTex) decals.push(backPanel(1.78, 1.6, backTex, 0, 0.8, MINIFIG.torsoD / 2 + 0.012));
  return assemble(solids, decals);
}

/**
 * One arm: shoulder ball, upper arm angled outward, forearm bent forward.
 * Returns {piece, wristY, wristZ, tilt} so the hand can be hung off the end.
 */
function armPiece(color, sx) {
  const upperLen = 0.58;
  const foreLen = 0.5;
  const tilt = 0.16 * sx;                       // outward flare
  const g = new THREE.Group();
  g.add(at(sphere(0.29, { color, seg: 14 }), 0, -0.29, 0));
  const upper = rot(new THREE.Group(), 0, 0, tilt);
  upper.add(at(cyl(0.26, upperLen, { color, seg: 14 }), 0, -upperLen, 0));
  const elbow = at(rot(new THREE.Group(), MINIFIG.elbow, 0, 0), 0, -upperLen, 0);
  elbow.add(at(sphere(0.25, { color, seg: 12 }), 0, -0.25, 0));
  elbow.add(at(cyl(0.235, foreLen, { color, seg: 14 }), 0, -foreLen, 0));
  elbow.add(at(cyl(0.15, 0.12, { color, seg: 10 }), 0, -foreLen - 0.1, 0));
  upper.add(elbow);
  g.add(upper);
  const baked = bake(g);
  return { piece: baked, foreLen, upperLen, tilt };
}

/** C-shaped grabber hand. Local -Y runs down the forearm; the C axis is -Z. */
function handPiece(color) {
  const g = new THREE.Group();
  g.add(at(cyl(0.14, 0.14, { color, seg: 10 }), 0, -0.14, 0));
  const ringGeo = norm(new THREE.TorusGeometry(0.255, 0.075, 6, 18, Math.PI * 1.55));
  ringGeo.rotateZ(-0.86);                     // open the C toward -Y
  const c = new THREE.Mesh(ringGeo, mat(color));
  c.castShadow = true;
  at(c, 0, -0.3, -0.03);
  g.add(c);
  const baked = bake(g);
  // grip: +Y is the held bar's axis, -Z points out of the palm
  const grip = rot(new THREE.Object3D(), -Math.PI / 2, 0, 0);
  at(grip, 0, -0.3, -0.03);
  baked.add(grip);
  baked.userData.grip = grip;
  return baked;
}

/** Head: cylinder, chamfered crown, top stud, optional printed wrap. */
function headPiece(color, tex, noStud) {
  const solids = [
    tex ? cylMapped(0.6, 1.0, color, tex) : cyl(0.6, 1.0, { color, seg: 22 }),
    at(cone(0.6, 0.47, 0.2, { color, seg: 22 }), 0, 1.0, 0),
    noStud ? null : at(cyl(0.3, 0.2, { color, seg: 14 }), 0, 1.2, 0),
  ];
  // the map has to survive baking, so keep the printed shell as its own mesh
  const g = new THREE.Group();
  const plain = solids.filter((s, i) => i > 0 && s);
  g.add(bake(group(...plain)));
  g.add(solids[0]);
  return g;
}

/** Full-wrap printed cylinder: u = 0.5 is the front (-Z). */
function cylMapped(r, h, color, tex) {
  const m = cyl(r, h, { color, seg: 26 });
  m.material = texMat(tex);
  return m;
}

/** Segmented cape: a chain of thin plates, each pivoting at its top edge. */
function capePiece(o) {
  const color = o.color ?? C.black;
  const len = o.length ?? 3.2;
  const n = o.segs ?? 5;
  const wTop = o.width ?? 1.7;
  const wBot = o.widthBottom ?? wTop * 1.34;
  const segH = len / n;
  const root = new THREE.Group();
  const segs = [];
  let parent = root;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const k2 = (i + 1) / n;
    const w0 = wTop + (wBot - wTop) * k;
    const w1 = wTop + (wBot - wTop) * k2;
    const seg = new THREE.Group();
    const m = slab([
      [-w0 / 2, 0], [w0 / 2, 0], [w1 / 2, -segH], [-w1 / 2, -segH],
    ], 0.13, { color });
    m.userData.noBake = true;
    seg.add(m);
    seg.userData.h = segH;
    parent.add(seg);
    if (i > 0) seg.position.y = -segH;
    segs.push(seg);
    parent = seg;
  }
  root.userData.segs = segs;
  return root;
}

/* ------------------------------------------------------------------ */
/* the figure                                                          */
/* ------------------------------------------------------------------ */

/**
 * Build a minifigure.
 * @param {object} [o]
 *   torso, legs, hips, arms, hands, head  — colours (hex)
 *   headTex, torsoTex, backTex, legTex    — THREE.Texture prints
 *   cape   {color, length, width, widthBottom, segs, y, z}
 *   hat    Object3D (or factory) parented to the head
 *   visor  Object3D, or {color, opacity, span, y, r, h}
 *   skirt  {color, length, rTop, rBottom, hideLegs}
 *   short  true for short legs (figure becomes 4.2 units tall)
 *   noStud true to drop the stud on top of the head
 * @returns {THREE.Group} feet on y = 0, facing -Z
 */
export function minifig(o = {}) {
  const skin = o.head ?? C.yellow;
  const torsoC = o.torso ?? C.blue;
  const legC = o.legs ?? C.darkGray;
  const hipC = o.hips ?? legC;
  const armC = o.arms ?? torsoC;
  const handC = o.hands ?? skin;
  const legLen = o.short ? MINIFIG.shortLegLen : MINIFIG.legLen;
  const hipY = legLen;

  const fig = new THREE.Group();
  fig.name = 'minifig';
  const root = new THREE.Group();
  fig.add(root);

  const hips = at(new THREE.Group(), 0, hipY, 0);
  root.add(hips);
  hips.add(hipPiece(hipC, o.legTex));

  const hideLegs = o.skirt && o.skirt.hideLegs !== false;
  let legL = null, legR = null;
  if (!hideLegs) {
    const proto = legPiece(legC, legLen, o.boots ?? hipC);
    legR = at(new THREE.Group(), 0.37, 0, 0);
    legR.add(proto);
    legL = at(new THREE.Group(), -0.37, 0, 0);
    legL.add(proto.clone(true));
    hips.add(legR, legL);
  }
  if (o.skirt) {
    const s = o.skirt;
    const len = s.length ?? hipY + HIP_BLOCK - 0.05;
    const sk = at(cone(s.rBottom ?? 1.12, s.rTop ?? 0.82, len, {
      color: s.color ?? C.white, seg: s.seg ?? 22,
    }), 0, HIP_BLOCK - len, 0);
    hips.add(sk);
    if (hideLegs) {
      // shoes peeking out from under the hem
      const shoe = tile(0.6, 0.9, 0.24, { color: s.shoes ?? C.darkGray });
      hips.add(at(shoe, 0.31, -hipY, -0.22));
      hips.add(at(shoe.clone(), -0.31, -hipY, -0.22));
    }
  }

  const torso = at(new THREE.Group(), 0, HIP_BLOCK, 0);
  hips.add(torso);
  torso.add(torsoPiece(torsoC, o.torsoTex, o.backTex));

  const arms = {};
  for (const side of ['R', 'L']) {
    const sx = side === 'R' ? 1 : -1;
    const a = armPiece(armC, sx);
    const armG = at(new THREE.Group(), sx * MINIFIG.shoulderX, MINIFIG.shoulderY - MINIFIG.waistY, 0);
    armG.add(a.piece);
    // fixed forearm bend so the wrist frame follows the forearm
    const wrist = at(rot(new THREE.Group(), MINIFIG.elbow, 0, 0), sx * 0.093, -a.upperLen, 0);
    const hand = at(new THREE.Group(), 0, -a.foreLen, 0);
    hand.add(handPiece(handC));
    wrist.add(hand);
    armG.add(wrist);
    torso.add(armG);
    arms[side] = { armG, hand, wrist };
  }

  const neck = at(new THREE.Group(), 0, MINIFIG.neckY - MINIFIG.waistY, 0);
  torso.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  head.add(headPiece(skin, o.headTex, o.noStud || !!o.hat));

  const gear = new THREE.Group();
  head.add(gear);
  if (o.hat) gear.add(typeof o.hat === 'function' ? o.hat() : o.hat);
  if (o.visor) {
    if (o.visor.isObject3D) gear.add(o.visor);
    else {
      const v = o.visor;
      gear.add(at(arcShell(v.r ?? 0.63, v.h ?? 0.34, {
        span: v.span ?? Math.PI * 1.05,
        color: v.color ?? C.black,
        transparent: (v.opacity ?? 1) < 1,
        opacity: v.opacity ?? 1,
        rough: 0.16,
      }), 0, v.y ?? 0.42, 0));
    }
  }
  // eye-line anchor: useful for framing close-ups and for aim solving
  const eye = at(new THREE.Object3D(), 0, 0.62, -0.6);
  head.add(eye);

  let cape = null;
  if (o.cape) {
    cape = capePiece(o.cape);
    at(cape, 0, (o.cape.y ?? TORSO_H - 0.1), (o.cape.z ?? 0.5));
    torso.add(cape);
  }

  const parts = {
    root, hips, legL, legR, torso,
    armL: arms.L.armG, armR: arms.R.armG,
    handL: arms.L.hand, handR: arms.R.hand,
    wristL: arms.L.wrist, wristR: arms.R.wrist,
    neck, head, gear, cape, eye,
  };
  fig.userData.parts = parts;
  fig.userData.height = o.short ? MINIFIG.height - (MINIFIG.legLen - MINIFIG.shortLegLen) : MINIFIG.height;
  fig.userData.width = 2.4;
  fig.userData.legLen = legLen;
  fig.userData.rest = {
    hipY,
    arm: MINIFIG.elbow,
  };
  fig.userData.minifig = true;
  return fig;
}

/* ------------------------------------------------------------------ */
/* posing                                                             */
/* ------------------------------------------------------------------ */

const Z3 = [0, 0, 0];

/**
 * Absolute pose. Every field is optional; `null` resets that joint.
 * Numbers use the primary axis of the joint, objects give {x,y,z}.
 * @param {THREE.Group} fig
 * @param {object} p {armL, armR, handL, handR, legL, legR, headY, headX,
 *                    head, torsoY, lean, hipsY, sway}
 */
export function pose(fig, p = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  setJoint(q.armR, p.armR, 'x', Z3);
  setJoint(q.armL, p.armL, 'x', Z3);
  setJoint(q.handR, p.handR, 'y', Z3);
  setJoint(q.handL, p.handL, 'y', Z3);
  setJoint(q.legR, p.legR, 'x', Z3);
  setJoint(q.legL, p.legL, 'x', Z3);
  if (p.head !== undefined) setJoint(q.head, p.head, 'y', Z3);
  if (num(p.headY)) q.head.rotation.y = p.headY;
  if (num(p.headX)) q.head.rotation.x = p.headX;
  if (num(p.headZ)) q.head.rotation.z = p.headZ;
  if (num(p.torsoY)) q.torso.rotation.y = p.torsoY;
  if (num(p.lean)) q.torso.rotation.x = -p.lean;
  if (num(p.torsoZ)) q.torso.rotation.z = p.torsoZ;
  if (num(p.sway)) q.hips.rotation.z = p.sway;
  if (num(p.hipsY)) q.hips.position.y = fig.userData.rest.hipY + p.hipsY;
  if (num(p.turn)) q.hips.rotation.y = p.turn;
  return fig;
}

/** Drop every joint back to the neutral standing pose. */
export function rest(fig) {
  const q = fig.userData.parts;
  if (!q) return fig;
  for (const k of ['hips', 'legL', 'legR', 'torso', 'armL', 'armR', 'handL', 'handR', 'head']) {
    if (q[k]) q[k].rotation.set(0, 0, 0);
  }
  q.root.rotation.set(0, 0, 0);
  q.root.position.set(0, 0, 0);
  q.hips.position.y = fig.userData.rest.hipY;
  return fig;
}

/**
 * Walk cycle. Rigid minifig legs: the pelvis dips as the legs splay, which is
 * where the characteristic LEGO waddle comes from.
 * @param {THREE.Group} fig
 * @param {number} phase in turns; 1.0 is a full two-step stride
 * @param {object} [opts] {stride, arms, bob, sway, lean, twist, speed}
 */
export function walk(fig, phase, opts = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const sp = opts.speed ?? 1;
  const stride = (opts.stride ?? 0.46) * sp;
  const swing = (opts.arms ?? 0.34) * sp;
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  const legLen = fig.userData.legLen;

  if (q.legR) q.legR.rotation.set(stride * s, 0, 0);
  if (q.legL) q.legL.rotation.set(-stride * s, 0, 0);
  q.armR.rotation.set(-swing * s, 0, 0.04);
  q.armL.rotation.set(swing * s, 0, -0.04);
  q.handR.rotation.set(0, 0, 0);
  q.handL.rotation.set(0, 0, 0);
  q.torso.rotation.set(-(opts.lean ?? 0.05), -(opts.twist ?? 0.07) * s, 0);
  q.head.rotation.set(0, (opts.twist ?? 0.07) * s * 0.5, 0);
  q.hips.rotation.set(0, (opts.twist ?? 0.07) * s * 0.35, (opts.sway ?? 0.03) * c);
  const dip = legLen * (1 - Math.cos(stride * Math.abs(s)));
  q.hips.position.y = fig.userData.rest.hipY - dip + (opts.bob ?? 0.02) * Math.abs(c);
  return fig;
}

/**
 * Run cycle: longer stride, forward lean, bent arms, and a flight phase where
 * both feet leave the ground.
 */
export function run(fig, phase, opts = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const stride = opts.stride ?? 0.92;
  const swing = opts.arms ?? 0.8;
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  const legLen = fig.userData.legLen;
  if (q.legR) q.legR.rotation.set(stride * s, 0, 0);
  if (q.legL) q.legL.rotation.set(-stride * s, 0, 0);
  q.armR.rotation.set(-swing * s + 0.15, 0, 0.1);
  q.armL.rotation.set(swing * s + 0.15, 0, -0.1);
  q.handR.rotation.set(0, -0.5, 0);
  q.handL.rotation.set(0, 0.5, 0);
  q.torso.rotation.set(-(opts.lean ?? 0.3), -0.14 * s, 0);
  q.head.rotation.set(opts.lean !== undefined ? opts.lean * 0.6 : 0.2, 0.07 * s, 0);
  q.hips.rotation.set(0, 0.16 * s, 0.05 * c);
  const dip = legLen * (1 - Math.cos(stride * Math.abs(s)));
  const hop = (opts.hop ?? 0.18) * Math.max(0, Math.sin(phase * Math.PI * 4));
  q.hips.position.y = fig.userData.rest.hipY - dip + hop;
  return fig;
}

/**
 * Idle: breathing, weight shift and a slow head drift, so a crowd of figures
 * never looks frozen. `seed` decorrelates neighbours.
 */
export function idle(fig, t = 0, seed = 1) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const r = rngv(seed);
  const ph = r(0) * 6.283;
  const rate = 0.55 + r(1) * 0.35;
  const b = Math.sin(t * rate + ph);
  const b2 = Math.sin(t * rate * 0.61 + ph * 1.7);
  const b3 = Math.sin(t * rate * 0.37 + ph * 2.3);
  q.torso.rotation.set(-0.012 - 0.016 * b, 0.03 * b2, 0.008 * b3);
  q.armR.rotation.set(0.02 + 0.035 * b, 0, 0.05 + 0.02 * b2);
  q.armL.rotation.set(0.02 - 0.035 * b, 0, -0.05 - 0.02 * b2);
  q.head.rotation.set(0.01 * b, 0.1 * b3, 0.01 * b2);
  q.hips.rotation.set(0, 0.012 * b2, 0.006 * b3);
  q.hips.position.y = fig.userData.rest.hipY - 0.012 + 0.012 * b;
  if (q.legR) q.legR.rotation.set(0.02 * b2, 0, 0);
  if (q.legL) q.legL.rotation.set(-0.02 * b2, 0, 0);
  return fig;
}

/** Deterministic per-seed value bank (never Math.random). */
const rngCache = new Map();
function rngv(seed) {
  let v = rngCache.get(seed);
  if (!v) {
    const r = rngHelper(seed);
    v = [r(), r(), r(), r(), r(), r()];
    rngCache.set(seed, v);
  }
  return (i) => v[i % v.length];
}
function rngHelper(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Aim a hand-held blaster. Because the forearm bend and the grip frame line up,
 * pitch is just added to the shoulder swing: the barrel ends up level at
 * pitch = 0 and pointing up for positive pitch.
 * @param {THREE.Group} fig
 * @param {object} [o] {side:'R'|'L', pitch, yaw, twoHanded, lean, crouch}
 */
export function aimBlaster(fig, o = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const side = (o.side || 'R').toUpperCase();
  const pitch = o.pitch ?? 0;
  const yaw = o.yaw ?? 0;
  const main = side === 'L' ? q.armL : q.armR;
  const off = side === 'L' ? q.armR : q.armL;
  const mainHand = side === 'L' ? q.handL : q.handR;
  const offHand = side === 'L' ? q.handR : q.handL;
  const sx = side === 'L' ? -1 : 1;
  const level = Math.PI / 2 - MINIFIG.elbow;

  main.rotation.set(level + pitch, -sx * 0.12, -sx * 0.16);
  mainHand.rotation.set(0, 0, 0);
  if (o.twoHanded) {
    off.rotation.set(level + pitch - 0.1, sx * 0.5, sx * 0.5);
    offHand.rotation.set(0, -sx * 0.5, 0);
  } else {
    off.rotation.set(0.24, 0, -sx * 0.12);
    offHand.rotation.set(0, 0, 0);
  }
  q.torso.rotation.set(-(o.lean ?? 0.06), yaw - sx * 0.12, 0);
  q.head.rotation.set(pitch * 0.5, -yaw * 0.2 - sx * 0.05, 0);
  if (q.legR) q.legR.rotation.set(-0.14, 0, 0);
  if (q.legL) q.legL.rotation.set(0.2, 0, 0);
  q.hips.position.y = fig.userData.rest.hipY - (o.crouch ?? 0.04);
  return fig;
}

/**
 * Knocked-back death pose for the corridor firefight.
 * @param {THREE.Group} fig
 * @param {number} t seconds since the hit; the body is flat by t ~ 0.85
 */
export function fall(fig, t = 0) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const p = Math.max(0, Math.min(1, t / 0.85));
  const e = p * p * (3 - 2 * p);                   // smoothstep
  const settle = Math.max(0, Math.min(1, (t - 0.85) / 0.35));
  const jolt = Math.exp(-t * 7) * Math.sin(t * 34) * 0.16;

  q.root.rotation.set(e * 1.48 + jolt * (1 - e), 0, jolt * 0.4);
  q.root.position.set(0, Math.sin(Math.PI * Math.min(p, 1)) * 0.16, e * 0.55);
  q.torso.rotation.set(0.34 * e, 0.12 * e, 0);
  q.armR.rotation.set(-1.9 * e - jolt, 0, 0.5 * e);
  q.armL.rotation.set(-1.6 * e - jolt, 0, -0.7 * e);
  q.handR.rotation.set(0, -0.9 * e, 0);
  q.handL.rotation.set(0, 0.9 * e, 0);
  if (q.legR) q.legR.rotation.set(-0.5 * e + 0.24 * settle, 0, 0);
  if (q.legL) q.legL.rotation.set(-0.16 * e - 0.2 * settle, 0, 0);
  q.head.rotation.set(-0.34 * e, -0.2 * e, 0.1 * e);
  q.hips.position.y = fig.userData.rest.hipY - 0.06 * e;
  return fig;
}

/**
 * Sitting pose (cockpits, gunner seats, the sandcrawler bench).
 * The seat surface is y = 0, so `fig.position.y = seatTop`.
 */
export function sit(fig, o = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const splay = o.splay ?? 0.1;
  if (q.legR) q.legR.rotation.set(Math.PI / 2, 0, -splay);
  if (q.legL) q.legL.rotation.set(Math.PI / 2, 0, splay);
  q.armR.rotation.set(o.arms ?? 0.62, 0, 0.12);
  q.armL.rotation.set(o.arms ?? 0.62, 0, -0.12);
  q.handR.rotation.set(0, 0, 0);
  q.handL.rotation.set(0, 0, 0);
  q.torso.rotation.set(-(o.lean ?? 0.04), 0, 0);
  q.head.rotation.set(0, 0, 0);
  q.hips.position.y = o.hipY ?? 0.46;
  return fig;
}

/**
 * Parent a prop to a hand with a sane grip transform. Props are authored with
 * their grip at the origin, the held bar along +Y and the muzzle along -Z.
 * @param {THREE.Group} fig
 * @param {THREE.Object3D} obj
 * @param {'L'|'R'} [side]
 */
export function attachToHand(fig, obj, side = 'R') {
  const q = fig.userData.parts;
  if (!q || !obj) return obj;
  const hand = String(side).toUpperCase() === 'L' ? q.handL : q.handR;
  const grip = hand.userData.grip || hand.children.find((c) => c.userData && c.userData.grip)?.userData.grip;
  const host = grip || hand;
  host.add(obj);
  obj.position.set(0, 0, 0);
  obj.rotation.set(0, 0, 0);
  if (obj.userData.gripOffset) obj.position.fromArray(obj.userData.gripOffset);
  if (obj.userData.gripRot) obj.rotation.fromArray(obj.userData.gripRot);
  obj.userData.heldBy = fig;
  return obj;
}

/**
 * Cheap procedural cape motion: each plate lags the one above it, gets pushed
 * by the figure's own movement and by `windVec`, and flutters slowly.
 * @param {THREE.Group} fig
 * @param {number} t seconds
 * @param {Array<number>|THREE.Vector3} [windVec] world-space wind
 */
export function capeSim(fig, t = 0, windVec = null) {
  const q = fig.userData.parts;
  const cape = q && q.cape;
  if (!cape) return fig;
  const segs = cape.userData.segs;

  // world motion, expressed in the figure's own frame
  const st = PREV.get(fig) || { t: t, pos: null, vel: new THREE.Vector3() };
  fig.updateWorldMatrix(true, false);
  const world = new THREE.Vector3().setFromMatrixPosition(fig.matrixWorld);
  if (st.pos) {
    const dt = t - st.t;
    if (dt > 1e-4 && dt < 0.5) {
      const v = world.clone().sub(st.pos).divideScalar(dt);
      st.vel.lerp(v, 0.35);
    }
  } else st.pos = world.clone();
  st.pos.copy(world);
  st.t = t;
  PREV.set(fig, st);

  const q4 = new THREE.Quaternion();
  fig.getWorldQuaternion(q4).invert();
  const local = st.vel.clone().applyQuaternion(q4);
  let wind = new THREE.Vector3();
  if (windVec) {
    wind = Array.isArray(windVec) ? new THREE.Vector3().fromArray(windVec) : windVec.clone();
    wind.applyQuaternion(q4);
  }

  // forward travel (-Z) makes the cloth trail backwards (+Z): negative X rot
  const drive = (-local.z + -wind.z * 0.6) * 0.09;
  const side = (local.x + wind.x * 0.6) * 0.05;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const lag = (i + 1) / segs.length;
    const flut = Math.sin(t * 1.7 - i * 0.9) * 0.035 + Math.sin(t * 2.9 - i * 1.6) * 0.018;
    const droop = i === 0 ? 0.06 : 0.03;
    s.rotation.x = droop - drive * lag * 1.5 + flut * lag;
    s.rotation.z = -side * lag * 1.4 + Math.sin(t * 1.3 - i * 0.7) * 0.02 * lag;
    s.rotation.y = Math.sin(t * 0.9 - i * 0.5) * 0.03 * lag;
  }
  return fig;
}

/** Spin every wheel-ish child of a droid: shared by astromech/mouseDroid. */
export function rollWheels(list, distance, radius) {
  for (const w of list) w.rotation.x = distance / radius;
}
