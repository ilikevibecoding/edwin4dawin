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
 *   +- root                    whole-body tilt, used by fall()
 *      +- hips                 pelvis; carries the walk bob
 *         +- legL, legR        swing at the top of the leg
 *         +- torso             waist twist / lean
 *            +- armL, armR     shoulder
 *            |  +- wrist       fixed forearm bend (static)
 *            |     +- handL/R  wrist twist, carries userData.grip
 *            +- neck
 *            |  +- head        head pivot at the neck
 *            |     +- gear     headgear
 *            +- cape          segmented cloth, see capeSim()
 *
 * Rotation conventions (radians, all "natural direction"):
 *   arms / legs   positive swings the limb forward (-Z)
 *   hands         positive twists the palm about the forearm
 *   headY         positive turns the face toward the figure's left
 *   headX         positive tips the chin up
 *   torsoY        positive twists the chest toward the figure's left
 *   lean          positive leans the upper body forward
 */
import * as THREE from 'three';
import {
  tile, prism, cyl, cone, sphere, panel,
  at, rot, group, bake, mat, glow, norm,
  C,
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
  shortLegLen: 0.65,  // "short legs" figures (jawa, robed droids)
  headR: 0.6,
  torsoD: 1.06,
  elbow: 0.62,        // fixed forearm bend, radians
  handReach: 0.3,     // wrist to the centre of the grip
};

const HIP_BLOCK = 0.55;                            // hips height, hipY .. waistY
const TORSO_H = MINIFIG.neckY - MINIFIG.waistY;    // 1.6
const UPPER_ARM = 0.58;
const FOREARM = 0.5;
const ARM_FLARE = 0.16;                            // shoulder splay, radians
const TOE = 0.66;                                  // sole corner ahead of the hip pivot
/** Torso print size: 1.92 x 1.62 covers the whole trapezoid, shoulders included. */
export const TORSO_PRINT_W = 1.92;
export const TORSO_PRINT_H = 1.62;
/** Hips print size, for belts and sashes. */
export const HIP_PRINT_W = 1.62;
const MOTION = new WeakMap();                      // capeSim motion memory

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const texMatCache = new Map();

/**
 * Standard material carrying an SVG texture. `mat()` from the brick kit keys its
 * cache with JSON.stringify, which cannot take a texture, so every printed part
 * gets its material from here instead.
 * @param {THREE.Texture} map
 * @param {object} [o] {color, rough, metal, transparent, opacity, alphaTest,
 *                      emissive, emissiveIntensity, side}
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
 * for helmet fronts, visors, pauldrons and droid panels. Base at y = 0.
 * A texture maps its full width across the arc, u rising toward the figure's
 * left, which matches the printed-decal convention used everywhere else.
 * @param {number} r radius
 * @param {number} h height
 * @param {object} [o] {span, center, seg, rTop, color, map, glow, opacity, ...}
 *   `center` is the arc's mid angle measured from +Z, so Math.PI is the front.
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
 * The kit's prism() extrudes a top-down footprint upward. slab() needs it in a
 * different orientation, and the fix has to live in the geometry rather than
 * in the mesh transform: at() and rot() *overwrite* position and rotation, so a
 * correction parked on the mesh would vanish the moment a caller wrote
 * `at(slab(...), x, y, z)`. Geometries are cached, hence the clone.
 */
const slabCache = new Map();
function reframed(pts, h, o, key, fix) {
  const ck = key + JSON.stringify(pts) + h + (o.bevel ?? 0.03);
  let geo = slabCache.get(ck);
  if (!geo) {
    geo = prism(pts, h, o).geometry.clone();
    fix(geo);
    geo.computeVertexNormals();
    slabCache.set(ck, geo);
  }
  const m = new THREE.Mesh(geo, mat(o.color ?? C.lightGray, o));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Extrude a front-view outline along Z: trapezoidal torsos, cape plates,
 * side-view wedges. The outline's own y = 0 is the mesh's y = 0 and the
 * extrusion is centred on z = 0, so `at()` places the outline where you drew it.
 * @param {Array<[number,number]>} pts outline as [x, y], +y up
 * @param {number} depth extrusion depth along Z
 */
export function slab(pts, depth, o = {}) {
  const b = o.bevel ?? 0.03;
  return reframed(pts, depth, o, 'z', (g) => {
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, -(1.5 * depth - 2 * b));
  });
}


/**
 * Force a mesh onto the canonical cached material for a colour.
 * The kit's primitives build their material from the whole options object, so
 * `tile(2,2,h,{color:red})` and `cyl(1,h,{color:red,seg:12})` end up on two
 * different red materials and bake() cannot merge them. Repainting fixes that.
 */
export function paint(mesh, color) {
  mesh.material = mat(color);
  return mesh;
}

/** Merge solid meshes into one draw call per material; decals stay separate. */
export function assemble(solids, decals) {
  const g = bake(group(...solids.filter(Boolean)));
  for (const d of (decals || [])) {
    if (!d) continue;
    d.castShadow = false;
    d.receiveShadow = false;
    g.add(d);
  }
  return g;
}

/** Tag every mesh in a subtree so an outer bake() leaves it alone. */
export function markNoBake(root) {
  root.traverse((o) => { if (o.isMesh) o.userData.noBake = true; });
  return root;
}

/** Printed decal quad on a front (-Z) face; art reads as authored. */
export function frontPanel(w, h, tex, x, y, z, o = {}) {
  const p = panel(w, h, tex, o);
  rot(p, o.rx ?? 0, Math.PI, 0);
  at(p, x, y, z);
  p.userData.noBake = true;
  return p;
}

/** Printed decal quad on a back (+Z) face. */
export function backPanel(w, h, tex, x, y, z, o = {}) {
  const p = panel(w, h, tex, o);
  rot(p, o.rx ?? 0, 0, 0);
  at(p, x, y, z);
  p.userData.noBake = true;
  return p;
}

const num = (v) => typeof v === 'number' && isFinite(v);

/** Apply a pose value that is either a number (primary axis) or {x,y,z}. */
function setJoint(j, v, axis) {
  if (!j || v === undefined) return;
  if (v === null) { j.rotation.set(0, 0, 0); return; }
  if (num(v)) { j.rotation.set(0, 0, 0); j.rotation[axis] = v; return; }
  j.rotation.set(v.x || 0, v.y || 0, v.z || 0);
}

/* ------------------------------------------------------------------ */
/* parts                                                              */
/* ------------------------------------------------------------------ */

/** One leg, hanging from the hip pivot at its local origin. */
function legPiece(color, len, bootColor) {
  const footH = len > 1.0 ? 0.34 : 0.26;
  const shaft = len - footH;
  return assemble([
    // rounded top knuckle, hidden inside the hips: keeps the joint clean
    paint(at(rot(cyl(0.34, 0.66, { seg: 14 }), 0, 0, Math.PI / 2), 0.33, 0, 0), color),
    paint(at(tile(0.66, 0.92, shaft), 0, -shaft, 0), color),
    // boot: wider and deeper than the leg, toe projecting forward
    paint(at(tile(0.7, 1.12, footH), 0, -len, -0.1), bootColor ?? color),
  ]);
}

/** Hips block, sitting on the hip pivot. */
function hipPiece(color, tex) {
  return assemble([
    paint(at(tile(1.56, 1.06, HIP_BLOCK - 0.08), 0, 0.08, 0), color),
    paint(at(tile(1.44, 0.96, 0.1), 0, 0, 0), color),
  ], tex ? [frontPanel(1.62, HIP_BLOCK + 0.02, tex, 0, HIP_BLOCK / 2, -0.545)] : null);
}

/** Trapezoidal torso with sloped shoulders, shoulder bosses and neck. */
function torsoPiece(color, tex, backTex) {
  const outline = [
    [-0.72, 0], [0.72, 0],
    [0.86, 0.7], [0.95, 1.2],
    [0.83, 1.45], [0.36, 1.6],
    [-0.36, 1.6], [-0.83, 1.45],
    [-0.95, 1.2], [-0.86, 0.7],
  ];
  const solids = [
    paint(slab(outline, MINIFIG.torsoD), color),
    paint(at(rot(cyl(0.3, 0.16, { seg: 14 }), 0, 0, -Math.PI / 2), 0.94, 1.28, 0), color),
    paint(at(rot(cyl(0.3, 0.16, { seg: 14 }), 0, 0, Math.PI / 2), -0.94, 1.28, 0), color),
    paint(at(cyl(0.3, 0.14, { seg: 14 }), 0, 1.56, 0), color),
  ];
  const decals = [];
  const zf = MINIFIG.torsoD / 2 + 0.012;
  if (tex) decals.push(frontPanel(TORSO_PRINT_W, 1.62, tex, 0, 0.81, -zf));
  if (backTex) decals.push(backPanel(TORSO_PRINT_W, 1.62, backTex, 0, 0.81, zf));
  return assemble(solids, decals);
}

/**
 * One arm as a single rigid piece, plus the wrist frame at its far end.
 * @param {number} color
 * @param {number} sx +1 for the figure's right arm (+X), -1 for the left
 */
function armPiece(color, sx) {
  const chain = new THREE.Group();
  chain.add(paint(at(sphere(0.29, { seg: 14 }), 0, -0.29, 0), color));
  const upper = rot(new THREE.Group(), 0, 0, ARM_FLARE * sx);
  upper.add(paint(at(cyl(0.26, UPPER_ARM, { seg: 14 }), 0, -UPPER_ARM, 0), color));
  const elbow = at(rot(new THREE.Group(), MINIFIG.elbow, 0, 0), 0, -UPPER_ARM, 0);
  elbow.add(paint(at(sphere(0.25, { seg: 12 }), 0, -0.25, 0), color));
  elbow.add(paint(at(cyl(0.235, FOREARM, { seg: 14 }), 0, -FOREARM, 0), color));
  elbow.add(paint(at(cyl(0.155, 0.1, { seg: 10 }), 0, -FOREARM - 0.08, 0), color));
  upper.add(elbow);
  chain.add(upper);

  // read the elbow frame off the built chain so the hand lands exactly on the
  // end of the forearm, flare included
  chain.updateMatrixWorld(true);
  const wrist = new THREE.Group();
  elbow.matrixWorld.decompose(wrist.position, wrist.quaternion, wrist.scale);
  return { piece: bake(chain), wrist };
}

/** C-shaped grabber hand. Local -Y runs down the forearm; the C axis is -Z. */
function handPiece(color) {
  const g = new THREE.Group();
  g.add(paint(at(cyl(0.14, 0.15, { seg: 10 }), 0, -0.15, 0), color));
  const ringGeo = norm(new THREE.TorusGeometry(0.25, 0.075, 6, 18, Math.PI * 1.55));
  ringGeo.rotateZ(-0.86);                          // put the C's gap at -Y
  const c = at(new THREE.Mesh(ringGeo, mat(color)), 0, -0.3, -0.03);
  c.castShadow = true;
  g.add(c);
  const baked = bake(g);
  // grip frame: +Y is the axis of the held bar, -Z points out of the palm
  const grip = at(rot(new THREE.Object3D(), -Math.PI / 2, 0, 0), 0, -0.3, -0.03);
  baked.add(grip);
  baked.userData.grip = grip;
  return baked;
}

/** Head: cylinder, chamfered crown, top stud, optional printed wrap. */
function headPiece(color, tex, noStud) {
  const shell = cyl(0.6, 1.0, { seg: 26 });
  if (tex) shell.material = texMat(tex);
  else paint(shell, color);
  return assemble([
    shell,
    paint(at(cone(0.6, 0.47, 0.2, { seg: 26 }), 0, 1.0, 0), color),
    noStud ? null : paint(at(cyl(0.3, 0.2, { seg: 14 }), 0, 1.2, 0), color),
  ]);
}

/** Segmented cape: a chain of thin plates, each pivoting at its top edge. */
function capePiece(o) {
  const color = o.color ?? C.black;
  const len = o.length ?? 3.2;
  const n = o.segs ?? 5;
  const wTop = o.width ?? 1.7;
  const wBot = o.widthBottom ?? wTop * 1.35;
  const segH = len / n;
  const root = new THREE.Group();
  const segs = [];
  let parent = root;
  for (let i = 0; i < n; i++) {
    const w0 = wTop + (wBot - wTop) * (i / n);
    const w1 = wTop + (wBot - wTop) * ((i + 1) / n);
    const seg = new THREE.Group();
    const m = paint(slab([[-w0 / 2, 0], [w0 / 2, 0], [w1 / 2, -segH], [-w1 / 2, -segH]],
      0.12), color);
    m.userData.noBake = true;
    seg.add(m);
    if (i > 0) seg.position.y = -segH;
    parent.add(seg);
    segs.push(seg);
    parent = seg;
  }
  root.userData.segs = segs;
  root.userData.noBake = true;
  return root;
}

/* ------------------------------------------------------------------ */
/* the figure                                                          */
/* ------------------------------------------------------------------ */

/**
 * Build a minifigure.
 * @param {object} [o]
 *   torso, legs, hips, arms, hands, head, boots  — colours (hex)
 *   headTex, torsoTex, backTex, legTex           — THREE.Texture prints
 *   cape   {color, length, width, widthBottom, segs, y, z}
 *   hat    Object3D or factory, parented to the head
 *   visor  Object3D, or {color, opacity, span, r, h, y}
 *   skirt  {color, length, rTop, rBottom, hideLegs, shoes}
 *   short  true for short legs (the figure becomes 4.2 units tall)
 *   noStud true to drop the stud on top of the head
 * @returns {THREE.Group} soles on y = 0, facing -Z
 */
export function minifig(o = {}) {
  const skin = o.head ?? C.yellow;
  const torsoC = o.torso ?? C.blue;
  const legC = o.legs ?? C.darkGray;
  const hipC = o.hips ?? legC;
  const armC = o.arms ?? torsoC;
  const handC = o.hands ?? skin;
  const legLen = o.short ? MINIFIG.shortLegLen : MINIFIG.legLen;

  const fig = new THREE.Group();
  fig.name = 'minifig';
  const root = new THREE.Group();
  fig.add(root);

  const hips = at(new THREE.Group(), 0, legLen, 0);
  root.add(hips);
  hips.add(hipPiece(hipC, o.legTex));

  const hideLegs = !!(o.skirt && o.skirt.hideLegs !== false);
  let legL = null;
  let legR = null;
  if (!hideLegs) {
    const proto = legPiece(legC, legLen, o.boots ?? hipC);
    legR = at(new THREE.Group(), 0.4, 0, 0);
    legR.add(proto);
    legL = at(new THREE.Group(), -0.4, 0, 0);
    legL.add(proto.clone(true));
    hips.add(legR, legL);
  }
  if (o.skirt) {
    const s = o.skirt;
    const len = s.length ?? legLen + HIP_BLOCK - 0.06;
    hips.add(paint(at(cone(s.rBottom ?? 1.12, s.rTop ?? 0.82, len, { seg: s.seg ?? 22 }),
      0, HIP_BLOCK - len, 0), s.color ?? C.white));
    if (hideLegs) {
      const shoe = paint(tile(0.6, 0.92, 0.24), s.shoes ?? C.darkGray);
      hips.add(at(shoe, 0.3, -legLen, -0.24));
      hips.add(at(shoe.clone(), -0.3, -legLen, -0.24));
    }
  }

  const torso = at(new THREE.Group(), 0, HIP_BLOCK, 0);
  hips.add(torso);
  torso.add(torsoPiece(torsoC, o.torsoTex, o.backTex));

  const arm = {};
  for (const side of ['R', 'L']) {
    const sx = side === 'R' ? 1 : -1;
    const a = armPiece(armC, sx);
    const shoulder = at(new THREE.Group(), sx * MINIFIG.shoulderX,
      MINIFIG.shoulderY - MINIFIG.waistY, 0);
    shoulder.add(a.piece);
    const hand = at(new THREE.Group(), 0, -FOREARM, 0);
    hand.add(handPiece(handC));
    a.wrist.add(hand);
    shoulder.add(a.wrist);
    torso.add(shoulder);
    arm[side] = { shoulder, hand, wrist: a.wrist };
  }

  const neck = at(new THREE.Group(), 0, TORSO_H, 0);
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
        rough: 0.14,
      }), 0, v.y ?? 0.42, 0));
    }
  }
  // eye-line anchor: for close-up framing and for aiming the head at things
  const eye = at(new THREE.Object3D(), 0, 0.62, -0.62);
  head.add(eye);

  let cape = null;
  if (o.cape) {
    cape = capePiece(o.cape);
    at(cape, 0, o.cape.y ?? TORSO_H - 0.08, o.cape.z ?? 0.5);
    torso.add(cape);
  }

  const parts = {
    root, hips, legL, legR, torso,
    armL: arm.L.shoulder, armR: arm.R.shoulder,
    handL: arm.L.hand, handR: arm.R.hand,
    wristL: arm.L.wrist, wristR: arm.R.wrist,
    neck, head, gear, cape, eye,
  };
  // anything the rig animates must survive a bake() by scene code
  for (const k of ['legL', 'legR', 'armL', 'armR', 'handL', 'handR', 'head', 'gear', 'cape']) {
    if (parts[k]) markNoBake(parts[k]);
  }
  fig.userData.parts = parts;
  fig.userData.height = MINIFIG.height - (MINIFIG.legLen - legLen);
  fig.userData.width = 2.4;
  fig.userData.legLen = legLen;
  fig.userData.hipRest = legLen;
  fig.userData.minifig = true;
  return fig;
}

/* ------------------------------------------------------------------ */
/* posing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Absolute pose. Every field is optional; `null` resets that joint. Numbers use
 * the joint's primary axis, objects give {x, y, z}.
 * @param {THREE.Group} fig
 * @param {object} p {armL, armR, handL, handR, legL, legR, head, headX, headY,
 *                    headZ, torsoY, torsoZ, lean, sway, turn, hipsY}
 */
export function pose(fig, p = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  setJoint(q.armR, p.armR, 'x');
  setJoint(q.armL, p.armL, 'x');
  setJoint(q.handR, p.handR, 'y');
  setJoint(q.handL, p.handL, 'y');
  setJoint(q.legR, p.legR, 'x');
  setJoint(q.legL, p.legL, 'x');
  setJoint(q.head, p.head, 'y');
  if (num(p.headY)) q.head.rotation.y = p.headY;
  if (num(p.headX)) q.head.rotation.x = p.headX;
  if (num(p.headZ)) q.head.rotation.z = p.headZ;
  if (num(p.lean)) q.torso.rotation.x = -p.lean;
  if (num(p.torsoY)) q.torso.rotation.y = p.torsoY;
  if (num(p.torsoZ)) q.torso.rotation.z = p.torsoZ;
  if (num(p.sway)) q.hips.rotation.z = p.sway;
  if (num(p.turn)) q.hips.rotation.y = p.turn;
  if (num(p.hipsY)) q.hips.position.y = fig.userData.hipRest + p.hipsY;
  return fig;
}

/** Drop every joint back to the neutral standing pose. */
export function rest(fig) {
  const q = fig.userData.parts;
  if (!q) return fig;
  for (const k of ['hips', 'legL', 'legR', 'torso', 'armL', 'armR', 'handL', 'handR', 'head', 'root']) {
    if (q[k]) q[k].rotation.set(0, 0, 0);
  }
  q.root.position.set(0, 0, 0);
  q.hips.position.y = fig.userData.hipRest;
  return fig;
}

/**
 * Walk cycle. Minifig legs are rigid, so the pelvis dips as they splay — that
 * dip is where the LEGO waddle comes from.
 * @param {THREE.Group} fig
 * @param {number} phase in turns; 1.0 is one full two-step stride
 * @param {object} [opts] {speed, stride, arms, bob, sway, lean, twist}
 */
export function walk(fig, phase, opts = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const sp = opts.speed ?? 1;
  const stride = (opts.stride ?? 0.46) * sp;
  const swing = (opts.arms ?? 0.34) * sp;
  const twist = opts.twist ?? 0.07;
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  if (q.legR) q.legR.rotation.set(stride * s, 0, 0);
  if (q.legL) q.legL.rotation.set(-stride * s, 0, 0);
  q.armR.rotation.set(-swing * s, 0, 0.04);
  q.armL.rotation.set(swing * s, 0, -0.04);
  q.handR.rotation.set(0, 0, 0);
  q.handL.rotation.set(0, 0, 0);
  q.torso.rotation.set(-(opts.lean ?? 0.05), -twist * s, 0);
  q.head.rotation.set(0, twist * 0.5 * s, 0);
  q.hips.rotation.set(0, twist * 0.35 * s, (opts.sway ?? 0.03) * c);
  q.hips.position.y = plant(fig, stride * s, opts.plant);
  return fig;
}

/**
 * Pelvis height that keeps the lowest sole corner on y = 0 for a leg swung by
 * `a` radians. Rigid legs with big flat feet have to rock up onto heel and toe,
 * which is exactly where the LEGO waddle comes from.
 */
function plant(fig, a, k = 1) {
  const L = fig.userData.legLen;
  return L * Math.cos(a) + TOE * Math.abs(Math.sin(a)) * k;
}

/**
 * Run cycle: long stride, forward lean, bent arms and a flight phase where both
 * feet leave the ground.
 */
export function run(fig, phase, opts = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const stride = opts.stride ?? 0.9;
  const swing = opts.arms ?? 0.78;
  const lean = opts.lean ?? 0.3;
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  if (q.legR) q.legR.rotation.set(stride * s, 0, 0);
  if (q.legL) q.legL.rotation.set(-stride * s, 0, 0);
  q.armR.rotation.set(-swing * s + 0.2, 0, 0.12);
  q.armL.rotation.set(swing * s + 0.2, 0, -0.12);
  q.handR.rotation.set(0, -0.5, 0);
  q.handL.rotation.set(0, 0.5, 0);
  q.torso.rotation.set(-lean, -0.14 * s, 0);
  q.head.rotation.set(lean * 0.7, 0.07 * s, 0);
  q.hips.rotation.set(0, 0.16 * s, 0.05 * c);
  const hop = (opts.hop ?? 0.16) * Math.max(0, Math.sin(phase * Math.PI * 4));
  q.hips.position.y = plant(fig, stride * s, opts.plant) + hop;
  return fig;
}

/**
 * Idle: breathing, weight shift and a slow head drift so crowds are never
 * frozen. `seed` decorrelates neighbours.
 */
export function idle(fig, t = 0, seed = 1) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const r = seedBank(seed);
  const ph = r(0) * 6.283;
  const rate = 0.5 + r(1) * 0.4;
  const b = Math.sin(t * rate + ph);
  const b2 = Math.sin(t * rate * 0.61 + ph * 1.7);
  const b3 = Math.sin(t * rate * 0.37 + ph * 2.3);
  q.torso.rotation.set(-0.012 - 0.016 * b, 0.03 * b2, 0.008 * b3);
  q.armR.rotation.set(0.02 + 0.035 * b, 0, 0.05 + 0.02 * b2);
  q.armL.rotation.set(0.02 - 0.035 * b, 0, -0.05 - 0.02 * b2);
  q.handR.rotation.set(0, 0, 0);
  q.handL.rotation.set(0, 0, 0);
  q.head.rotation.set(0.012 * b, 0.1 * b3, 0.01 * b2);
  q.hips.rotation.set(0, 0.012 * b2, 0.006 * b3);
  q.hips.position.y = fig.userData.hipRest - 0.012 + 0.012 * b;
  if (q.legR) q.legR.rotation.set(0.02 * b2, 0, 0);
  if (q.legL) q.legL.rotation.set(-0.02 * b2, 0, 0);
  return fig;
}

const bankCache = new Map();
/** Deterministic per-seed value bank (never Math.random). */
function seedBank(seed) {
  let v = bankCache.get(seed);
  if (!v) {
    let s = (seed >>> 0) || 1;
    const next = () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
    v = [next(), next(), next(), next(), next(), next()];
    bankCache.set(seed, v);
  }
  return (i) => v[i % v.length];
}

/**
 * Aim a hand-held blaster. The forearm bend and the grip frame are set up so
 * that pitch adds straight onto the shoulder swing: the barrel is level at
 * pitch = 0 and rises for positive pitch.
 * @param {THREE.Group} fig
 * @param {object} [o] {side:'R'|'L', pitch, yaw, twoHanded, lean, crouch}
 */
export function aimBlaster(fig, o = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const side = String(o.side || 'R').toUpperCase();
  const pitch = o.pitch ?? 0;
  const yaw = o.yaw ?? 0;
  const sx = side === 'L' ? -1 : 1;
  const main = side === 'L' ? q.armL : q.armR;
  const off = side === 'L' ? q.armR : q.armL;
  const mainHand = side === 'L' ? q.handL : q.handR;
  const offHand = side === 'L' ? q.handR : q.handL;
  const level = Math.PI / 2 - MINIFIG.elbow;

  q.torso.rotation.set(-(o.lean ?? 0.06), yaw * 0.35 - sx * 0.1, 0);
  q.head.rotation.set(pitch * 0.5, yaw * 0.5 - sx * 0.06, 0);
  main.rotation.set(level + pitch, -sx * 0.1, -sx * 0.14);
  if (o.twoHanded) {
    off.rotation.set(level + pitch - 0.14, sx * 0.42, sx * 0.46);
    offHand.rotation.set(0, -sx * 0.45, 0);
  } else {
    off.rotation.set(0.22, 0, -sx * 0.1);
    offHand.rotation.set(0, 0, 0);
  }
  if (q.legR) q.legR.rotation.set(-0.14, 0, 0);
  if (q.legL) q.legL.rotation.set(0.2, 0, 0);
  q.hips.position.y = plant(fig, 0.17) - (o.crouch ?? 0.04);
  // twist the wrist so the barrel ends up exactly on the requested pitch/yaw
  aimHand(fig, mainHand, pitch, yaw);
  return fig;
}

const GRIP_LOCAL = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

/**
 * Solve the wrist rotation that puts a held prop's muzzle (-Z of the grip
 * frame) exactly on `pitch`/`yaw` in the figure's own space.
 */
function aimHand(fig, hand, pitch, yaw) {
  const chain = [];
  for (let o = hand.parent; o && o !== fig; o = o.parent) chain.push(o);
  const parentQ = new THREE.Quaternion();
  for (let i = chain.length - 1; i >= 0; i--) parentQ.multiply(chain[i].quaternion);
  const aimQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  hand.quaternion.copy(parentQ.invert().multiply(aimQ).multiply(GRIP_LOCAL.clone().invert()));
}

/**
 * Knocked-back death pose for the corridor firefight: the hit throws the arms
 * up, the body arches and topples backwards, flat by t ~= 0.85s.
 * @param {THREE.Group} fig
 * @param {number} t seconds since the hit
 */
export function fall(fig, t = 0) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const p = Math.max(0, Math.min(1, t / 0.85));
  const e = p * p * (3 - 2 * p);                    // smoothstep
  const bell = Math.sin(Math.PI * p);               // peaks mid-topple
  const jolt = Math.exp(-t * 7) * Math.sin(t * 34) * 0.16;

  q.root.rotation.set(e * 1.52 + jolt * (1 - e), 0, jolt * 0.4);
  q.root.position.set(0, 0.6 * e + bell * 0.14, e * 0.5);
  q.torso.rotation.set(0.3 * bell - 0.05 * e, 0.1 * e, 0);
  // arms fly up on the hit, then flop out to the sides and lie flat
  q.armR.rotation.set(-1.9 * bell - 0.2 * e - jolt, 0, 0.35 * bell + 0.5 * e);
  q.armL.rotation.set(-1.5 * bell - 0.15 * e - jolt, 0, -0.5 * bell - 0.65 * e);
  q.handR.rotation.set(0, -0.9 * e, 0);
  q.handL.rotation.set(0, 0.9 * e, 0);
  if (q.legR) q.legR.rotation.set(-0.55 * bell + 0.12 * e, 0, 0.12 * e);
  if (q.legL) q.legL.rotation.set(-0.2 * bell - 0.16 * e, 0, -0.12 * e);
  q.head.rotation.set(0.16 * e, -0.18 * e, 0.1 * e);
  q.hips.position.y = fig.userData.hipRest - 0.06 * e;
  return fig;
}

/**
 * Sitting pose (cockpits, gunner seats, the sandcrawler bench). The seat
 * surface ends up at y = 0, so place the figure with `fig.position.y = seatTop`.
 */
export function sit(fig, o = {}) {
  const q = fig.userData.parts;
  if (!q) return fig;
  const splay = o.splay ?? 0.1;
  if (q.legR) q.legR.rotation.set(Math.PI / 2, 0, -splay);
  if (q.legL) q.legL.rotation.set(Math.PI / 2, 0, splay);
  q.armR.rotation.set(o.arms ?? 0.6, 0, 0.14);
  q.armL.rotation.set(o.arms ?? 0.6, 0, -0.14);
  q.handR.rotation.set(0, 0, 0);
  q.handL.rotation.set(0, 0, 0);
  q.torso.rotation.set(-(o.lean ?? 0.04), 0, 0);
  q.head.rotation.set(0, 0, 0);
  q.root.rotation.set(0, 0, 0);
  q.root.position.set(0, 0, 0);
  q.hips.position.y = o.hipY ?? 0.44;
  return fig;
}

/**
 * Parent a prop to a hand with a sane grip transform. Props are authored with
 * the grip at their origin, the held bar along +Y and the muzzle along -Z.
 * @param {THREE.Group} fig
 * @param {THREE.Object3D} obj
 * @param {'L'|'R'} [side]
 */
export function attachToHand(fig, obj, side = 'R') {
  const q = fig.userData.parts;
  if (!q || !obj) return obj;
  const hand = String(side).toUpperCase() === 'L' ? q.handL : q.handR;
  const host = hand.userData.grip
    || hand.children.map((c) => c.userData && c.userData.grip).find(Boolean)
    || hand;
  host.add(obj);
  obj.position.set(0, 0, 0);
  obj.rotation.set(0, 0, 0);
  if (obj.userData.gripOffset) obj.position.fromArray(obj.userData.gripOffset);
  if (obj.userData.gripRot) obj.rotation.fromArray(obj.userData.gripRot);
  obj.userData.heldBy = fig;
  return obj;
}

/**
 * Cheap procedural cape motion: each plate lags the one above it, is pushed by
 * the figure's own travel and by `windVec`, and flutters slowly on the spot.
 * Call once per frame with the scene clock.
 * @param {THREE.Group} fig
 * @param {number} t seconds
 * @param {Array<number>|THREE.Vector3} [windVec] world-space wind
 */
export function capeSim(fig, t = 0, windVec = null) {
  const q = fig.userData.parts;
  const cape = q && q.cape;
  if (!cape) return fig;
  const segs = cape.userData.segs;

  const st = MOTION.get(fig) || { t, pos: null, vel: new THREE.Vector3() };
  fig.updateWorldMatrix(true, false);
  const world = new THREE.Vector3().setFromMatrixPosition(fig.matrixWorld);
  if (st.pos) {
    const dt = t - st.t;
    if (dt > 1e-4 && dt < 0.5) {
      st.vel.lerp(world.clone().sub(st.pos).divideScalar(dt), 0.35);
    }
  } else {
    st.pos = world.clone();
  }
  st.pos.copy(world);
  st.t = t;
  MOTION.set(fig, st);

  const inv = fig.getWorldQuaternion(new THREE.Quaternion()).invert();
  const vel = st.vel.clone().applyQuaternion(inv);
  const wind = windVec
    ? (Array.isArray(windVec) ? new THREE.Vector3().fromArray(windVec) : windVec.clone())
      .applyQuaternion(inv)
    : new THREE.Vector3();

  // travelling forward (-Z) makes the cloth trail backwards (+Z): negative X
  const drive = (-vel.z - wind.z * 0.7) * 0.1;
  const side = (vel.x + wind.x * 0.7) * 0.05;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const lag = (i + 1) / segs.length;
    const flut = Math.sin(t * 1.7 - i * 0.9) * 0.035 + Math.sin(t * 2.9 - i * 1.6) * 0.018;
    s.rotation.x = (i === 0 ? 0.05 : 0.025) - drive * lag * 1.6 + flut * lag;
    s.rotation.z = -side * lag * 1.5 + Math.sin(t * 1.3 - i * 0.7) * 0.02 * lag;
    s.rotation.y = Math.sin(t * 0.9 - i * 0.5) * 0.03 * lag;
  }
  return fig;
}
