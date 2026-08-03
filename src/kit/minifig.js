/**
 * The LEGO minifigure.
 *
 * Builds a posable figure out of the brick kit and returns a hierarchy of
 * named pivots so scenes can animate it. Proportions follow a real minifig
 * (about five studs tall) scaled into engine units where one stud = 1.
 *
 *   const fig = await buildMinifig({ ... });
 *   scene.add(fig.root);
 *   poseWalk(fig, t, { speed: 2.2 });
 *
 * All posing helpers are pure functions of time so the offline renderer can
 * jump to any frame.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Bricks, brickMaterial, chamferBox, taperBox } from '../engine/brick.js';
import { COLORS } from '../engine/palette.js';
import { svgImage } from '../engine/svg.js';

export const FIG = {
  legH: 1.62,      // hip pivot height above the floor
  hipH: 0.46,      // hip block
  torsoH: 1.92,
  torsoWBot: 1.50,
  torsoWTop: 1.80,
  torsoDBot: 0.90,
  torsoDTop: 1.02,
  neckH: 0.05,
  headR: 0.645,
  headH: 1.04,
  armLen: 1.34,
  armW: 0.44,
  armD: 0.56,
  handR: 0.215,
  legW: 0.70,
  legD: 0.82,
  footD: 1.02,
};
FIG.hipY = FIG.legH;
FIG.torsoY = FIG.legH + FIG.hipH;
FIG.shoulderY = FIG.torsoY + FIG.torsoH - 0.30;
FIG.neckY = FIG.torsoY + FIG.torsoH;
FIG.headY = FIG.neckY + FIG.neckH;
FIG.height = FIG.headY + FIG.headH + 0.19;

// ---------------------------------------------------------------------------
// Decal helpers
// ---------------------------------------------------------------------------

function colorCss(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

/**
 * Wrap-around head texture: the head colour everywhere, with the face art
 * composited at u = 0.5 so it lands on +z once the cylinder's thetaStart is
 * rotated to match.
 */
async function headTexture(faceUrl, headColor) {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = colorCss(headColor);
  ctx.fillRect(0, 0, W, H);
  if (faceUrl) {
    try {
      const img = await svgImage(faceUrl);
      // The face occupies a quarter of the circumference, centred at u=0.5.
      const fw = W * 0.3;
      const fh = fw;
      ctx.drawImage(img, W / 2 - fw / 2, H * 0.5 - fh * 0.52, fw, fh);
    } catch (e) {
      console.warn('face decal missing', faceUrl, e.message);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Flat decal texture for a torso print, composited over the torso colour. */
async function printTexture(url, baseColor, { transparent = true } = {}) {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  if (!transparent) {
    ctx.fillStyle = colorCss(baseColor);
    ctx.fillRect(0, 0, S, S);
  }
  try {
    const img = await svgImage(url);
    ctx.drawImage(img, 0, 0, S, S);
  } catch (e) {
    console.warn('print decal missing', url, e.message);
    return null;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------------
// Part geometry
// ---------------------------------------------------------------------------

function legGeometry() {
  // Anchored at the hip pivot (y = 0 here), extending down to the floor.
  const b = new Bricks();
  const { legW, legD, legH, footD } = FIG;
  // thigh + shin as one moulded piece
  b.addGeometry(chamferBox(legW, legH - 0.3, legD, 0.06), { x: 0, y: -(legH - 0.3) / 2 - 0.16, z: -0.04 });
  // rounded hip knuckle so the leg reads as hinged
  b.addGeometry(new THREE.CylinderGeometry(legW * 0.44, legW * 0.44, legW * 0.99, 12), {
    x: 0,
    y: -0.12,
    z: -0.04,
    rot: [0, 0, Math.PI / 2],
  });
  // foot: sticks forward, like the moulded toe of a minifig leg
  b.addGeometry(chamferBox(legW, 0.34, footD, 0.06), { x: 0, y: -legH + 0.17, z: 0.06 });
  return b;
}

function armGeometry() {
  // Pivot at the shoulder. The minifig arm drops, then angles forward.
  const b = new Bricks();
  const { armW, armD, armLen } = FIG;
  const upper = armLen * 0.5;
  const lower = armLen * 0.58;
  const bend = 0.62; // radians the forearm swings forward

  // shoulder cap
  b.addGeometry(new THREE.CylinderGeometry(armD * 0.5, armD * 0.5, armW, 14), {
    x: 0,
    y: 0,
    z: 0,
    rot: [0, 0, Math.PI / 2],
  });
  // upper arm
  b.addGeometry(chamferBox(armW, upper, armD * 0.92, 0.06), { x: 0, y: -upper / 2, z: 0.01 });
  // elbow
  b.addGeometry(new THREE.CylinderGeometry(armD * 0.44, armD * 0.44, armW * 0.98, 12), {
    x: 0,
    y: -upper,
    z: 0.02,
    rot: [0, 0, Math.PI / 2],
  });
  // forearm, angled forward
  const cx = Math.sin(bend) * lower * 0.5;
  const cy = -Math.cos(bend) * lower * 0.5;
  b.addGeometry(chamferBox(armW * 0.94, lower, armD * 0.84, 0.06), {
    x: 0,
    y: -upper + cy,
    z: 0.02 + cx,
    rot: [-bend, 0, 0],
  });
  return b;
}

/** Wrist position in arm-local space, where the hand clips on. */
function wristOffset() {
  const { armLen, armD } = FIG;
  const upper = armLen * 0.5;
  const lower = armLen * 0.58;
  const bend = 0.62;
  return new THREE.Vector3(0, -upper - Math.cos(bend) * lower, 0.02 + Math.sin(bend) * lower - armD * 0.02);
}

function handGeometry() {
  // The classic C-shaped clip: a partial torus plus a wrist stub.
  const b = new Bricks();
  const r = FIG.handR;
  const g = new THREE.TorusGeometry(r, r * 0.42, 8, 18, Math.PI * 1.62);
  b.addGeometry(g, { x: 0, y: -r * 0.1, z: 0, rot: [0, Math.PI / 2, Math.PI * 0.72] });
  b.addGeometry(new THREE.CylinderGeometry(r * 0.5, r * 0.46, r * 1.3, 10), { x: 0, y: r * 0.62, z: 0 });
  return b;
}

function torsoGeometry() {
  const b = new Bricks();
  const { torsoH, torsoWBot, torsoWTop, torsoDBot, torsoDTop } = FIG;
  // One moulded tapered body -- no visible seams.
  b.addGeometry(taperBox(torsoWBot, torsoWTop, torsoH, torsoDBot, torsoDTop, 0.07), {
    x: 0,
    y: torsoH / 2,
    z: 0,
  });
  // shoulder shrouds: rounded corners where the arms hang
  for (const sx of [-1, 1]) {
    b.addGeometry(new THREE.CylinderGeometry(0.3, 0.3, 0.26, 12), {
      x: sx * (torsoWTop / 2 - 0.02),
      y: torsoH - 0.3,
      z: 0.01,
      rot: [0, 0, Math.PI / 2],
    });
  }
  // neck
  b.addGeometry(new THREE.CylinderGeometry(0.3, 0.32, 0.22, 12), { x: 0, y: torsoH + 0.06, z: 0 });
  return b;
}

function headGeometry() {
  // thetaStart = PI puts u = 0.5 (the face decal) on +z
  const g = new THREE.CylinderGeometry(FIG.headR, FIG.headR * 0.985, FIG.headH, 26, 1, false, Math.PI, Math.PI * 2);
  g.translate(0, FIG.headH / 2, 0);
  return g;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * @param {object} o
 * @param {number} o.shirt      torso colour
 * @param {number} o.legs       leg colour
 * @param {number} o.hips       hip colour (defaults to legs)
 * @param {number} o.arms       arm colour (defaults to shirt)
 * @param {number} o.hands      hand colour
 * @param {number} o.head       head colour
 * @param {string} o.face       url of a face decal SVG (optional)
 * @param {string} o.torsoPrint url of a torso print SVG (optional)
 * @param {number} o.scale      overall scale
 * @param {boolean} o.headStud  draw the stud on top of the head
 */
export async function buildMinifig(o = {}) {
  const shirt = o.shirt ?? COLORS.blue;
  const legs = o.legs ?? COLORS.darkBluishGray;
  const hips = o.hips ?? legs;
  const arms = o.arms ?? shirt;
  const hands = o.hands ?? COLORS.lightFlesh;
  const headColor = o.head ?? COLORS.yellow;
  const finish = o.finish ?? 'plastic';

  const root = new THREE.Group();
  const body = new THREE.Group(); // everything above the feet, for crouches
  root.add(body);

  // --- legs
  const pelvis = new THREE.Group();
  pelvis.position.y = FIG.hipY;
  body.add(pelvis);

  const hipMesh = new Bricks()
    .addGeometry(taperBox(FIG.torsoWBot * 0.99, FIG.torsoWBot, FIG.hipH, FIG.torsoDBot * 0.96, FIG.torsoDBot * 0.98, 0.06), {
      x: 0,
      y: FIG.hipH / 2,
      z: 0,
      color: hips,
      opts: { finish },
    })
    .build();
  pelvis.add(hipMesh);

  const legGeo = legGeometry();
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  for (const [grp, sx] of [[legL, 1], [legR, -1]]) {
    const b = new Bricks();
    b.push();
    b.merge(legGeo);
    b.pop();
    const mesh = b.build();
    for (const m of mesh.children) m.material = brickMaterial(legs, { finish });
    grp.add(mesh);
    grp.position.set(sx * (FIG.legW / 2 + 0.02), 0, 0);
    pelvis.add(grp);
  }

  // --- torso
  const torso = new THREE.Group();
  torso.position.y = FIG.torsoY;
  body.add(torso);
  const torsoMesh = torsoGeometry().build();
  for (const m of torsoMesh.children) m.material = brickMaterial(shirt, { finish });
  torso.add(torsoMesh);

  if (o.torsoPrint) {
    const tex = await printTexture(o.torsoPrint, shirt);
    if (tex) {
      const decal = new THREE.Mesh(
        new THREE.PlaneGeometry(FIG.torsoWTop * 0.98, FIG.torsoH * 0.96),
        new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          roughness: 0.4,
          metalness: 0,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      decal.position.set(0, FIG.torsoH * 0.52, FIG.torsoDTop / 2 + 0.006);
      decal.rotation.x = -0.045;
      torso.add(decal);
    }
  }

  // --- arms
  const armGeo = armGeometry();
  const handGeo = handGeometry();
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  const handL = new THREE.Group();
  const handR = new THREE.Group();
  for (const [arm, hand, sx] of [[armL, handL, 1], [armR, handR, -1]]) {
    const b = new Bricks();
    b.merge(armGeo);
    const mesh = b.build();
    for (const m of mesh.children) m.material = brickMaterial(arms, { finish });
    arm.add(mesh);
    arm.position.set(sx * (FIG.torsoWTop / 2 + FIG.armW * 0.52), FIG.torsoH - 0.3, 0.01);
    torso.add(arm);

    const hb = new Bricks();
    hb.merge(handGeo);
    const hmesh = hb.build();
    for (const m of hmesh.children) m.material = brickMaterial(hands, { finish });
    hand.add(hmesh);
    const w = wristOffset();
    hand.position.copy(w);
    hand.rotation.x = -0.62;
    arm.add(hand);
  }

  // --- head
  const neck = new THREE.Group();
  neck.position.y = FIG.headY;
  torso.add(neck);
  neck.position.y = FIG.neckY - FIG.torsoY + FIG.neckH;

  const headTex = await headTexture(o.face, headColor);
  const headMat = new THREE.MeshStandardMaterial({
    map: headTex,
    roughness: 0.36,
    metalness: 0,
  });
  const head = new THREE.Group();
  const headMesh = new THREE.Mesh(headGeometry(), headMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  head.add(headMesh);
  // cap the top and bottom of the head cylinder
  const capMat = brickMaterial(headColor, { finish });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(FIG.headR, FIG.headR, 0.02, 24), capMat);
  cap.position.y = FIG.headH;
  head.add(cap);
  if (o.headStud !== false) {
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.19, 12), capMat);
    stud.position.y = FIG.headH + 0.095;
    stud.castShadow = true;
    head.add(stud);
  }
  neck.add(head);

  const accessory = new THREE.Group(); // hair, helmets, hats
  head.add(accessory);

  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });

  if (o.scale) root.scale.setScalar(o.scale);

  // Named so that cheap crowd clones can still be posed:
  // `clone.getObjectByName('armL')`.
  root.name = 'figRoot';
  body.name = 'body';
  pelvis.name = 'pelvis';
  legL.name = 'legL';
  legR.name = 'legR';
  torso.name = 'torso';
  armL.name = 'armL';
  armR.name = 'armR';
  handL.name = 'handL';
  handR.name = 'handR';
  neck.name = 'neck';
  head.name = 'head';
  accessory.name = 'accessory';

  const fig = {
    root,
    body,
    pelvis,
    legL,
    legR,
    torso,
    armL,
    armR,
    handL,
    handR,
    neck,
    head,
    accessory,
    height: FIG.height * (o.scale ?? 1),
    colors: { shirt, legs, arms, hands, head: headColor },
    seed: o.seed ?? 0,
  };
  poseStand(fig, 0);
  return fig;
}

// ---------------------------------------------------------------------------
// Posing (pure functions of t)
// ---------------------------------------------------------------------------

export function poseStand(fig, t = 0, opts = {}) {
  const s = opts.sway ?? 0.02;
  const p = t * (opts.rate ?? 1.1) + (fig.seed ?? 0);
  fig.legL.rotation.x = 0;
  fig.legR.rotation.x = 0;
  fig.armL.rotation.set(Math.sin(p) * s, 0, -0.06);
  fig.armR.rotation.set(Math.sin(p + 1.7) * s, 0, 0.06);
  fig.torso.rotation.set(0, 0, 0);
  fig.torso.position.y = FIG.torsoY + Math.sin(p * 0.8) * 0.008;
  fig.head.rotation.set(0, Math.sin(p * 0.37) * 0.06, 0);
}

export function poseWalk(fig, t, opts = {}) {
  const speed = opts.speed ?? 2.4;
  const amp = opts.amp ?? 0.62;
  const p = t * speed * Math.PI + (fig.seed ?? 0);
  fig.legL.rotation.x = Math.sin(p) * amp;
  fig.legR.rotation.x = -Math.sin(p) * amp;
  fig.armL.rotation.x = -Math.sin(p) * amp * 0.72;
  fig.armR.rotation.x = Math.sin(p) * amp * 0.72;
  fig.armL.rotation.z = -0.05;
  fig.armR.rotation.z = 0.05;
  // A minifig can't bend its knees, so it rocks side to side and bobs.
  fig.body.position.y = Math.abs(Math.sin(p)) * (opts.bob ?? 0.09);
  fig.body.rotation.z = Math.sin(p) * (opts.roll ?? 0.05);
  fig.torso.rotation.y = Math.sin(p) * 0.07;
  fig.head.rotation.y = -Math.sin(p) * 0.05;
}

export function poseRun(fig, t, opts = {}) {
  poseWalk(fig, t, { speed: opts.speed ?? 4.2, amp: opts.amp ?? 0.95, bob: 0.16, roll: 0.08 });
  fig.torso.rotation.x = opts.lean ?? 0.22;
}

/** Both arms forward, holding a blaster. */
export function poseAim(fig, t = 0, opts = {}) {
  const jitter = Math.sin(t * 9 + (fig.seed ?? 0)) * 0.012;
  fig.armL.rotation.set(-1.42 + jitter, 0, -0.18);
  fig.armR.rotation.set(-1.46 + jitter, 0, 0.14);
  fig.legL.rotation.x = 0.22;
  fig.legR.rotation.x = -0.18;
  fig.torso.rotation.set(0.05, opts.yaw ?? 0, 0);
}

/** Arms raised, e.g. a cheer or surrender. */
export function poseArmsUp(fig, t = 0, amount = 1) {
  fig.armL.rotation.set(0, 0, -2.2 * amount);
  fig.armR.rotation.set(0, 0, 2.2 * amount);
}

/**
 * Wrap a cloned figure root so the pose helpers work on it.
 * Cloning is far cheaper than building another minifig, which is how crowds
 * of forty are affordable.
 */
export function figFromClone(root, seed = 0) {
  const get = (n) => root.getObjectByName(n);
  return {
    root,
    body: get('body'),
    pelvis: get('pelvis'),
    legL: get('legL'),
    legR: get('legR'),
    torso: get('torso'),
    armL: get('armL'),
    armR: get('armR'),
    handL: get('handL'),
    handR: get('handR'),
    neck: get('neck'),
    head: get('head'),
    accessory: get('accessory'),
    height: FIG.height,
    seed,
  };
}

/**
 * Bake a posed figure down to a flat list of `{geometry, material}` in the
 * figure's own space. Used to turn characters into instanced crowd extras.
 */
export function bakeFigure(fig) {
  fig.root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(fig.root.matrixWorld).invert();
  const byMat = new Map();
  fig.root.traverse((n) => {
    if (!n.isMesh || !n.geometry) return;
    const g = (n.geometry.index ? n.geometry.toNonIndexed() : n.geometry).clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld));
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    const key = n.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { material: n.material, geos: [] });
    byMat.get(key).geos.push(g);
  });
  const out = [];
  for (const { material, geos } of byMat.values()) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (merged) out.push({ geometry: merged, material });
  }
  return out;
}

/**
 * A crowd of extras drawn with instancing.
 *
 * A hall full of forty figures as individual minifigs costs several hundred
 * draw calls, which the software renderer cannot afford. Baking each template
 * into a handful of instanced meshes brings that down to a dozen.
 *
 *   const crowd = new Crowd([bakeFigure(figA), bakeFigure(figB)], placements);
 *   scene.add(crowd.object);
 *   crowd.update(t, (i, seed, out) => { out.y = Math.abs(Math.sin(t*4+seed))*0.2; });
 */
export class Crowd {
  /**
   * @param {Array<Array<{geometry,material}>>} baked  one entry per template
   * @param {Array<{template:number,position:[number,number,number],rotationY:number,scale?:number,seed?:number}>} placements
   */
  constructor(baked, placements, opts = {}) {
    this.object = new THREE.Group();
    this.placements = placements;
    this.templates = [];
    // Every template is sized for the whole crowd so `out.template` can move a
    // figure between poses on any frame -- that is what lets an instanced
    // runner actually cycle its legs instead of sliding in a fixed stride.
    const capacity = placements.length;
    for (let ti = 0; ti < baked.length; ti++) {
      const meshes = baked[ti].map(({ geometry, material }) => {
        const im = new THREE.InstancedMesh(geometry, material, capacity);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.castShadow = opts.castShadow ?? true;
        im.receiveShadow = opts.receiveShadow ?? true;
        im.frustumCulled = false;
        im.count = 0;
        this.object.add(im);
        return im;
      });
      this.templates.push(meshes);
    }
    this._d = new THREE.Object3D();
    this._out = { y: 0, rotY: 0, tilt: 0, scale: 1, x: 0, z: 0, template: 0, hidden: false };
    this._counts = new Array(baked.length).fill(0);
  }

  /**
   * @param {number} t
   * @param {(index:number, seed:number, out:{y,rotY,tilt,scale,x,z,template,hidden}) => void} fn
   */
  update(t, fn) {
    const d = this._d;
    const out = this._out;
    this._counts.fill(0);
    for (let i = 0; i < this.placements.length; i++) {
      const p = this.placements[i];
      out.y = 0;
      out.rotY = 0;
      out.tilt = 0;
      out.x = 0;
      out.z = 0;
      out.scale = p.scale ?? 1;
      out.template = p.template ?? 0;
      out.hidden = false;
      fn?.(i, p.seed ?? 0, out);
      if (out.hidden) continue;
      const ti = Math.max(0, Math.min(this.templates.length - 1, out.template | 0));
      d.position.set(p.position[0] + out.x, p.position[1] + out.y, p.position[2] + out.z);
      d.rotation.set(out.tilt, (p.rotationY ?? 0) + out.rotY, 0);
      d.scale.setScalar(out.scale);
      d.updateMatrix();
      const slot = this._counts[ti]++;
      for (const m of this.templates[ti]) m.setMatrixAt(slot, d.matrix);
    }
    for (let ti = 0; ti < this.templates.length; ti++) {
      for (const m of this.templates[ti]) {
        m.count = this._counts[ti];
        m.instanceMatrix.needsUpdate = true;
      }
    }
  }
}

/** Turn the head (and optionally the torso) toward a world position. */
export function lookAt(fig, target, opts = {}) {
  const v = new THREE.Vector3().copy(target);
  fig.head.updateWorldMatrix(true, false);
  const inv = new THREE.Matrix4().copy(fig.neck.matrixWorld).invert();
  v.applyMatrix4(inv);
  const yaw = Math.atan2(v.x, v.z);
  fig.head.rotation.y = THREE.MathUtils.clamp(yaw, -(opts.limit ?? 1.2), opts.limit ?? 1.2);
}

/** Attach a prop to a hand; returns the prop for further placement. */
export function holdInHand(fig, obj, side = 'R', opts = {}) {
  const hand = side === 'L' ? fig.handL : fig.handR;
  obj.position.set(opts.x ?? 0, opts.y ?? 0.1, opts.z ?? 0.06);
  if (opts.rot) obj.rotation.set(...opts.rot);
  hand.add(obj);
  return obj;
}

// ---------------------------------------------------------------------------
// Common accessories
// ---------------------------------------------------------------------------

/** Simple moulded hair cap. */
export function hairPiece(color = COLORS.reddishBrown, opts = {}) {
  const b = new Bricks();
  const r = FIG.headR * (opts.r ?? 1.06);
  b.addGeometry(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), {
    x: 0,
    y: FIG.headH * (opts.y ?? 0.78),
    z: 0,
    color,
  });
  b.addGeometry(chamferBox(r * 2, FIG.headH * 0.42, r * 1.1, 0.06), {
    x: 0,
    y: FIG.headH * 0.72,
    z: -r * 0.42,
    color,
  });
  if (opts.fringe !== false) {
    b.addGeometry(chamferBox(r * 1.9, FIG.headH * 0.22, 0.16, 0.04), {
      x: 0,
      y: FIG.headH * 0.86,
      z: r * 0.92,
      color,
    });
  }
  const g = b.build();
  return g;
}

/** A cape hanging from the shoulders; `wave` animates it. */
export function cape(color = COLORS.trueBlack, opts = {}) {
  const w = opts.width ?? 2.1;
  const h = opts.height ?? 2.6;
  const geo = new THREE.PlaneGeometry(w, h, 8, 12);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const base = geo.attributes.position.array.slice();
  mesh.userData.wave = (t, amt = 1) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const v = (h / 2 - y) / h; // 0 at the top, 1 at the hem
      const z =
        -0.42 * Math.pow(v, 1.5) * w * 0.5 -
        Math.sin(x * 2.1 + t * 2.2) * 0.09 * v * amt -
        Math.sin(t * 1.6 + v * 3.0) * 0.12 * v * amt;
      pos.setZ(i, z);
      pos.setX(i, x * (1 + v * 0.22));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  mesh.userData.wave(0, 1);
  mesh.position.set(0, -h / 2 + 0.06, -FIG.torsoDTop / 2 - 0.03);
  return mesh;
}

/** Turntable entries for `preview.html`. */
export const PREVIEW = {
  'minifig-plain': async () => {
    const fig = await buildMinifig({ shirt: COLORS.blue, legs: COLORS.darkBluishGray, face: 'svg/face-neutral.svg' });
    fig.root.userData.previewUpdate = (t) => poseWalk(fig, t, { speed: 1.8 });
    return fig.root;
  },
  'minifig-parts': async () => {
    const g = new THREE.Group();
    const specs = [
      { shirt: COLORS.red, legs: COLORS.blue, head: COLORS.yellow },
      { shirt: COLORS.white, legs: COLORS.white, head: COLORS.white },
      { shirt: COLORS.trueBlack, legs: COLORS.trueBlack, head: COLORS.trueBlack },
    ];
    for (let i = 0; i < specs.length; i++) {
      const fig = await buildMinifig(specs[i]);
      fig.root.position.x = (i - 1) * 3;
      g.add(fig.root);
    }
    return g;
  },
};

/** Standard LEGO blaster: a short barrel with a grip. */
export function blaster(color = COLORS.trueBlack, opts = {}) {
  const b = new Bricks();
  const len = opts.len ?? 0.95;
  b.addGeometry(new THREE.CylinderGeometry(0.075, 0.075, len, 8), { x: 0, y: 0, z: len / 2, rot: [Math.PI / 2, 0, 0], color });
  b.addGeometry(chamferBox(0.14, 0.3, 0.34, 0.03), { x: 0, y: -0.16, z: -0.02, color });
  b.addGeometry(chamferBox(0.16, 0.16, 0.3, 0.03), { x: 0, y: 0.02, z: 0.1, color });
  if (opts.scope) b.addGeometry(chamferBox(0.1, 0.1, 0.4, 0.02), { x: 0, y: 0.14, z: 0.2, color: COLORS.darkBluishGray });
  const g = b.build();
  g.userData.muzzle = new THREE.Vector3(0, 0, len);
  return g;
}

/** Lightsaber hilt plus a glowing blade; `blade` scales along its length. */
export function lightsaber(bladeColor = 0x66ddff, opts = {}) {
  const group = new THREE.Group();
  const b = new Bricks();
  b.addGeometry(new THREE.CylinderGeometry(0.085, 0.085, 0.62, 10), { x: 0, y: 0.31, z: 0, color: COLORS.flatSilver, opts: { finish: 'metal' } });
  b.addGeometry(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 10), { x: 0, y: 0.6, z: 0, color: COLORS.darkBluishGray, opts: { finish: 'metal' } });
  group.add(b.build());

  const len = opts.length ?? 3.2;
  const blade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.06, len, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  );
  blade.position.y = 0.62 + len / 2;
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.16, len, 10),
    new THREE.MeshBasicMaterial({
      color: bladeColor,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.position.y = blade.position.y;
  const bladeGroup = new THREE.Group();
  bladeGroup.add(blade, glow);
  bladeGroup.scale.y = opts.on === false ? 0.001 : 1;
  group.add(bladeGroup);
  group.userData.blade = bladeGroup;
  group.userData.setExtension = (v) => {
    bladeGroup.scale.y = Math.max(0.001, v);
    blade.position.y = 0.62 + (len * v) / 2 / Math.max(0.001, v);
  };
  return group;
}
