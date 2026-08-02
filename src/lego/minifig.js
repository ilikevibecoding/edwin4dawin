import * as THREE from 'three';
import { Kit, PLATE, STUD_R, STUD_H } from './kit.js';
import { C } from './palette.js';
import { getMaterial, uniqueMaterial, FINISH } from '../core/materials.js';

/*
 * The minifigure.
 *
 * Proportions follow the real part: four bricks tall (4.8 stud units) from sole
 * to the top of the head stud, 1.6 wide at the shoulders. Everything is a
 * separate Object3D so the film can pose and animate it:
 *
 *   fig.userData.pose({ armL, armR, legL, legR, headTurn, ... })
 *   fig.userData.walk(t, 1.0)
 *
 * Printing (faces, uniforms, droid panels) is drawn to a canvas and mapped onto
 * a thin curved shell that floats a hair off the part surface, which avoids
 * fighting cylinder UV seams and lets a print be swapped at runtime.
 */

export const FIG = {
  legH: 1.55,          // sole to hip joint
  hipH: 0.35,          // hip block
  torsoH: 1.78,
  neckH: 0.16,
  headR: 0.60,
  headH: 1.10,
  shoulderY: 3.06,     // relative to feet, before hips offset
  shoulderX: 0.72,
  armLen: 0.92,
  foreLen: 0.78,
  width: 1.52,
  depth: 0.78,
  get totalH() { return this.legH + this.hipH + this.torsoH + this.neckH + this.headH + STUD_H; },
};

// ---------------------------------------------------------------- printing --

const printCache = new Map();

export function printTexture(key, draw, w = 256, h = 256) {
  let t = printCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, w, h);
  draw(g, w, h);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  printCache.set(key, t);
  return t;
}

/**
 * Curved decal shell hugging a cylinder of radius r, centred on -Z (the front).
 * CylinderGeometry lays vertices out as x = r·sin(theta), z = r·cos(theta), so
 * theta = PI is the -Z face and u = 0 lands on the figure's own right.
 */
function curvedPrint(texture, { r, h, arc = 2.4, yOffset = 0, opacity = 1, emissive = 0 }) {
  const g = new THREE.CylinderGeometry(r, r, h, 32, 1, true, Math.PI - arc / 2, arc);
  const mat = new THREE.MeshStandardMaterial({
    map: texture, transparent: true, alphaTest: 0.02, roughness: 0.4, metalness: 0,
    side: THREE.DoubleSide, opacity, depthWrite: false, polygonOffset: true,
    polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    emissive: new THREE.Color(emissive ? 0xffffff : 0x000000), emissiveMap: emissive ? texture : null,
    emissiveIntensity: emissive,
  });
  const m = new THREE.Mesh(g, mat);
  m.position.y = yOffset;
  m.renderOrder = 2;
  return m;
}

/**
 * Flat decal plate, slightly bowed to sit on the torso's taper.
 * facing -1 puts it on the figure's front (-Z), +1 on its back.
 */
function flatPrint(texture, { w, h, y, z, opacity = 1, facing = -1 }) {
  const g = new THREE.PlaneGeometry(w, h, 8, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setZ(i, -Math.abs(p.getX(i)) * 0.10);
  }
  if (facing < 0) g.rotateY(Math.PI);   // face -Z, and put u=0 on the figure's right
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: texture, transparent: true, alphaTest: 0.02, roughness: 0.42, metalness: 0,
    opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.position.set(0, y, z);
  m.renderOrder = 2;
  return m;
}

// -------------------------------------------------------------- face prints --

const EYE = '#241f1c';

export function drawFace(g, w, h, opts = {}) {
  const {
    eyeY = 0.42, mouth = 'smile', brows = false, sad = false, angry = false,
    skin = null, beard = null, eyeStyle = 'dot', shades = false, scar = false,
  } = opts;
  if (skin) { g.fillStyle = skin; g.fillRect(0, 0, w, h); }
  const cx = w / 2;
  const ey = h * eyeY;
  const dx = w * 0.185;
  const r = w * 0.062;

  if (shades) {
    g.fillStyle = '#161616';
    g.beginPath();
    g.roundRect(cx - dx * 1.9, ey - r * 2.2, dx * 3.8, r * 4.0, r * 1.2);
    g.fill();
  } else {
    g.fillStyle = EYE;
    for (const s of [-1, 1]) {
      g.beginPath();
      if (eyeStyle === 'oval') g.ellipse(cx + s * dx, ey, r * 0.85, r * 1.15, 0, 0, 7);
      else g.arc(cx + s * dx, ey, r, 0, 7);
      g.fill();
      if (eyeStyle !== 'flat') {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(cx + s * dx - r * 0.3, ey - r * 0.3, r * 0.3, 0, 7);
        g.fill();
        g.fillStyle = EYE;
      }
    }
  }

  if (brows || angry) {
    g.strokeStyle = beard || '#3b2a1c';
    g.lineWidth = w * 0.022;
    g.lineCap = 'round';
    for (const s of [-1, 1]) {
      g.beginPath();
      const y0 = ey - r * (angry ? 2.0 : 2.4);
      g.moveTo(cx + s * (dx - r * 1.3), y0 + (angry ? -r * 0.5 : 0));
      g.lineTo(cx + s * (dx + r * 1.5), y0 + (angry ? r * 0.9 : r * 0.15));
      g.stroke();
    }
  }

  g.strokeStyle = EYE;
  g.lineWidth = w * 0.024;
  g.lineCap = 'round';
  const my = h * 0.66;
  g.beginPath();
  if (mouth === 'smile') g.arc(cx, my - h * 0.06, w * 0.11, 0.35 * Math.PI, 0.65 * Math.PI);
  else if (mouth === 'grin') { g.arc(cx, my - h * 0.09, w * 0.13, 0.25 * Math.PI, 0.75 * Math.PI); }
  else if (mouth === 'open') {
    g.fillStyle = EYE;
    g.beginPath(); g.ellipse(cx, my, w * 0.075, h * 0.055, 0, 0, 7); g.fill();
  } else if (mouth === 'frown') g.arc(cx, my + h * 0.07, w * 0.11, 1.35 * Math.PI, 1.65 * Math.PI);
  else if (mouth === 'flat') { g.moveTo(cx - w * 0.09, my); g.lineTo(cx + w * 0.09, my); }
  else if (mouth === 'worried') { g.arc(cx, my + h * 0.05, w * 0.09, 1.2 * Math.PI, 1.8 * Math.PI); }
  if (mouth !== 'open') g.stroke();

  if (beard) {
    g.fillStyle = beard;
    g.beginPath();
    g.moveTo(cx - w * 0.24, h * 0.5);
    g.quadraticCurveTo(cx, h * 1.02, cx + w * 0.24, h * 0.5);
    g.quadraticCurveTo(cx, h * 0.72, cx - w * 0.24, h * 0.5);
    g.fill();
    g.beginPath();
    g.ellipse(cx, h * 0.585, w * 0.13, h * 0.05, 0, Math.PI, 2 * Math.PI);
    g.fill();
  }
  if (scar) {
    g.strokeStyle = '#a4553f';
    g.lineWidth = w * 0.012;
    g.beginPath();
    g.moveTo(cx + dx * 1.5, ey - r * 2.6); g.lineTo(cx + dx * 1.2, ey + r * 2.2);
    g.stroke();
  }
}

export const FACES = {
  neutral: (g, w, h) => drawFace(g, w, h, { mouth: 'flat' }),
  smile: (g, w, h) => drawFace(g, w, h, { mouth: 'smile' }),
  grin: (g, w, h) => drawFace(g, w, h, { mouth: 'grin' }),
  worried: (g, w, h) => drawFace(g, w, h, { mouth: 'worried', brows: true }),
  shout: (g, w, h) => drawFace(g, w, h, { mouth: 'open', brows: true, angry: true }),
  determined: (g, w, h) => drawFace(g, w, h, { mouth: 'flat', brows: true, angry: true }),
  scared: (g, w, h) => drawFace(g, w, h, { mouth: 'open', eyeStyle: 'oval', brows: true }),
};

// ------------------------------------------------------------------- parts --

function makeHead(spec) {
  const g = new THREE.Group();
  g.name = 'head';
  const color = spec.skin ?? C.yellow;
  const kit = new Kit('head');
  kit.cyl(0, 0, 0, FIG.headR, FIG.headH, color, { seg: 24 });
  kit.cyl(0, FIG.headH, 0, STUD_R, STUD_H, color, { seg: 14 });
  g.add(kit.build({ name: 'headMesh' }));
  if (spec.face) {
    const key = 'face:' + (spec.faceKey || spec.face.name || 'custom') + ':' + (spec.skin ?? 'y');
    const tex = printTexture(key, (ctx, w, h) => spec.face(ctx, w, h), 192, 192);
    const p = curvedPrint(tex, { r: FIG.headR * 1.012, h: FIG.headH * 0.95, arc: 2.15, yOffset: FIG.headH * 0.5 });
    g.add(p);
  }
  return g;
}

function makeTorso(spec) {
  const kit = new Kit('torso');
  const color = spec.torso ?? C.blue;
  const h = FIG.torsoH;
  // Tapered body: LEGO torsos are narrower at the waist than the shoulders.
  kit.custom(torsoGeometry(), color, {});
  const g = new THREE.Group();
  g.name = 'torso';
  g.add(kit.build({ name: 'torsoMesh' }));

  // neck stud
  const neck = new Kit('neck');
  neck.cyl(0, h, 0, 0.30, FIG.neckH + 0.06, spec.neck ?? color, { seg: 14 });
  g.add(neck.build());

  if (spec.torsoPrint) {
    const tex = printTexture('torso:' + (spec.torsoKey || 'custom'), spec.torsoPrint, 256, 256);
    g.add(flatPrint(tex, { w: 1.44, h: 1.5, y: h * 0.53, z: -FIG.depth / 2 - 0.012 }));
  }
  if (spec.backPrint) {
    const tex = printTexture('back:' + (spec.backKey || 'custom'), spec.backPrint, 256, 256);
    g.add(flatPrint(tex, { w: 1.40, h: 1.5, y: h * 0.53, z: FIG.depth / 2 + 0.012, facing: 1 }));
  }
  return g;
}

let _torsoGeo = null;
function torsoGeometry() {
  if (_torsoGeo) return _torsoGeo;
  const h = FIG.torsoH;
  const wTop = 0.73, wBot = 0.60, d = FIG.depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-wBot, 0); shape.lineTo(wBot, 0);
  shape.lineTo(wTop, h * 0.72); shape.lineTo(wTop, h);
  shape.lineTo(-wTop, h); shape.lineTo(-wTop, h * 0.72);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d * 2 - 0.08, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2,
  });
  geo.translate(0, 0, -d + 0.04);
  geo.computeVertexNormals();
  _torsoGeo = geo;
  return geo;
}

function makeArm(spec, side) {
  const root = new THREE.Group();
  root.name = side < 0 ? 'armL' : 'armR';
  const color = spec.arms ?? spec.torso ?? C.blue;
  const kit = new Kit('arm');
  // shoulder ball, mostly buried in the torso
  kit.sphere(0, 0, 0, 0.26, color, { seg: 14 });
  // upper arm angled outward
  kit.push().rotZ(side * -0.13).translate(0, -FIG.armLen / 2, 0);
  kit.box(0, -FIG.armLen / 2, 0, 0.46, FIG.armLen, 0.50, color, {});
  kit.pop();
  root.add(kit.build({ name: 'upperArm' }));

  const fore = new THREE.Group();
  fore.name = 'fore' + (side < 0 ? 'L' : 'R');
  fore.position.set(side * 0.10, -FIG.armLen * 0.92, 0);
  const kit2 = new Kit('forearm');
  kit2.sphere(0, 0, 0, 0.26, color, { seg: 12 });
  kit2.box(0, -FIG.foreLen / 2, 0, 0.44, FIG.foreLen, 0.46, color, {});
  fore.add(kit2.build({ name: 'foreArm' }));

  const hand = new THREE.Group();
  hand.name = 'hand' + (side < 0 ? 'L' : 'R');
  hand.position.set(0, -FIG.foreLen + 0.02, 0);
  const kit3 = new Kit('hand');
  const hc = spec.hands ?? spec.skin ?? C.yellow;
  kit3.torus(0, -0.13, 0, 0.20, 0.085, hc, { seg: 18, tseg: 8, arc: Math.PI * 1.55, rot: [Math.PI / 2, 0, 0] });
  kit3.cyl(0, -0.05, 0, 0.115, 0.16, hc, { seg: 12 });
  hand.add(kit3.build({ name: 'handMesh' }));
  fore.add(hand);
  root.add(fore);
  root.userData.hand = hand;
  root.userData.fore = fore;
  return root;
}

function makeLegs(spec) {
  const g = new THREE.Group();
  g.name = 'legs';
  const hipC = spec.hips ?? spec.legs ?? C.darkBluishGray;
  const legC = spec.legs ?? C.darkBluishGray;
  const hip = new Kit('hips');
  hip.box(0, FIG.legH, 0, FIG.width - 0.06, FIG.hipH, FIG.depth, hipC, {});
  g.add(hip.build({ name: 'hipMesh' }));

  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'legL' : 'legR';
    leg.position.set(side * 0.40, FIG.legH, 0);
    const kit = new Kit('leg');
    kit.box(0, -FIG.legH, 0, 0.74, FIG.legH, FIG.depth * 0.92, legC, {});
    // foot spur
    kit.box(0, -FIG.legH, -0.14, 0.74, 0.22, FIG.depth * 0.4, spec.feet ?? legC, {});
    leg.add(kit.build({ name: 'legMesh' }));
    if (spec.legPrint) {
      const tex = printTexture('leg:' + (spec.legKey || 'custom') + side, spec.legPrint, 128, 192);
      const p = flatPrint(tex, { w: 0.7, h: 1.3, y: -FIG.legH * 0.55, z: -FIG.depth * 0.46 - 0.012 });
      leg.add(p);
    }
    g.add(leg);
    g.userData[side < 0 ? 'legL' : 'legR'] = leg;
  }
  return g;
}

function makeCape(spec) {
  const o = Object.assign({ color: 0x1a1a1a, w: 1.75, h: 2.55, sway: 1 }, spec);
  const geo = new THREE.PlaneGeometry(o.w, o.h, 10, 14);
  const mat = uniqueMaterial(o.color, FINISH.matte, {});
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.name = 'cape';
  const base = geo.attributes.position.array.slice();
  mesh.userData.update = (t, dt, params = {}) => {
    const p = geo.attributes.position;
    const gust = params.gust ?? 0;
    const speed = params.speed ?? 0;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const v = (o.h / 2 - y) / o.h;             // 0 at top, 1 at hem
      const wave = Math.sin(t * 2.1 + v * 4.2 + x * 1.2) * 0.09 * v * o.sway;
      const flare = v * v * (0.35 + speed * 0.9 + gust);
      p.setX(i, x * (1 + v * 0.30));
      p.setY(i, y - v * 0.10);
      p.setZ(i, base[i * 3 + 2] + flare + wave);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  mesh.userData.update(0, 0);
  return mesh;
}

// ---------------------------------------------------------------- assembly --

export function createMinifig(spec = {}) {
  const fig = new THREE.Group();
  fig.name = spec.name || 'minifig';

  const legs = makeLegs(spec);
  fig.add(legs);

  const body = new THREE.Group();       // everything above the hips
  body.name = 'body';
  body.position.y = FIG.legH + FIG.hipH;
  fig.add(body);

  const torso = makeTorso(spec);
  body.add(torso);

  const armL = makeArm(spec, -1);
  armL.position.set(-FIG.shoulderX, FIG.torsoH - 0.28, 0);
  const armR = makeArm(spec, 1);
  armR.position.set(FIG.shoulderX, FIG.torsoH - 0.28, 0);
  body.add(armL, armR);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = FIG.torsoH + FIG.neckH;
  body.add(neck);
  const head = makeHead(spec);
  neck.add(head);

  if (spec.headgear) {
    const hg = typeof spec.headgear === 'function' ? spec.headgear() : spec.headgear;
    if (hg) { hg.name = 'headgear'; head.add(hg); }
  }
  if (spec.cape) {
    const cape = makeCape(spec.cape);
    cape.position.set(0, FIG.torsoH - 0.16 - (spec.cape.h ?? 2.55) / 2 + 0.15, 0.44);
    cape.rotation.x = -0.08;
    body.add(cape);
    fig.userData.cape = cape;
  }
  if (spec.accessoryL) armL.userData.hand.add(spec.accessoryL);
  if (spec.accessoryR) armR.userData.hand.add(spec.accessoryR);

  fig.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const parts = { legs, body, torso, armL, armR, neck, head,
    legL: legs.userData.legL, legR: legs.userData.legR,
    handL: armL.userData.hand, handR: armR.userData.hand,
    foreL: armL.userData.fore, foreR: armR.userData.fore };
  fig.userData.parts = parts;
  fig.userData.spec = spec;

  // Sign convention for every joint: positive rotates FORWARD, i.e. toward -Z,
  // the direction the figure faces. armLOut/armROut splay the arms outward.
  const pose = (p = {}) => {
    if (p.armL !== undefined) parts.armL.rotation.x = p.armL;
    if (p.armR !== undefined) parts.armR.rotation.x = p.armR;
    if (p.armLOut !== undefined) parts.armL.rotation.z = -p.armLOut;
    if (p.armROut !== undefined) parts.armR.rotation.z = p.armROut;
    if (p.elbowL !== undefined) parts.foreL.rotation.x = p.elbowL;
    if (p.elbowR !== undefined) parts.foreR.rotation.x = p.elbowR;
    if (p.legL !== undefined) parts.legL.rotation.x = p.legL;
    if (p.legR !== undefined) parts.legR.rotation.x = p.legR;
    if (p.headTurn !== undefined) parts.neck.rotation.y = p.headTurn;
    if (p.headTilt !== undefined) parts.neck.rotation.x = p.headTilt;
    if (p.lean !== undefined) parts.body.rotation.x = p.lean;
    if (p.twist !== undefined) parts.body.rotation.y = p.twist;
    if (p.crouch !== undefined) parts.body.position.y = FIG.legH + FIG.hipH - p.crouch;
  };
  fig.userData.pose = pose;

  // Canonical relaxed stance: arms hanging, forearms turned in.
  pose({ armL: 0.08, armR: 0.08, elbowL: 0.55, elbowR: 0.55 });

  fig.userData.walk = (t, speed = 1, opts = {}) => {
    const f = t * speed * 7.0;
    const amp = opts.amp ?? 0.62;
    pose({
      legL: Math.sin(f) * amp,
      legR: Math.sin(f + Math.PI) * amp,
      armL: Math.sin(f + Math.PI) * amp * 0.75 + 0.05,
      armR: Math.sin(f) * amp * 0.75 + 0.05,
      elbowL: 0.35, elbowR: 0.35,
      lean: (opts.lean ?? 0.06),
    });
    // LEGO figures rock side to side because the legs do not bend
    fig.rotation.z = Math.sin(f) * 0.045 * (opts.roll ?? 1);
    return Math.abs(Math.sin(f));
  };

  fig.userData.idle = (t, seedPhase = 0) => {
    const s = Math.sin(t * 1.3 + seedPhase);
    pose({ armL: 0.08 + s * 0.05, armR: 0.08 - s * 0.05, elbowL: 0.55, elbowR: 0.55,
      headTurn: Math.sin(t * 0.55 + seedPhase) * 0.16 });
    fig.position.y = (fig.userData.baseY || 0) + Math.abs(Math.sin(t * 1.3)) * 0.012;
  };

  fig.userData.update = (t, dt) => {
    if (fig.userData.cape) fig.userData.cape.userData.update(t, dt, fig.userData.capeParams || {});
  };

  return fig;
}

/** Standard-issue accessory: a blaster held in a minifig hand. */
export function createBlaster(opts = {}) {
  const kit = new Kit('blaster');
  const c = opts.color ?? C.black;
  const long = opts.long ?? false;
  kit.box(0, 0, -0.05, 0.16, 0.34, 0.18, c, {});                   // grip
  kit.box(0, 0.30, -0.32, 0.17, 0.19, long ? 1.25 : 0.72, c, {});  // body
  if (long) {
    kit.cyl(0, 0.36, -1.0, 0.055, 0.5, c, { axis: 'z', seg: 10 });
    kit.box(0, 0.20, 0.26, 0.14, 0.16, 0.5, c, {});                // stock
  }
  kit.box(0, 0.44, -0.30, 0.10, 0.07, 0.30, C.darkBluishGray, {}); // sight
  const g = kit.build({ name: 'blaster' });
  g.rotation.x = Math.PI / 2 + 0.15;
  g.position.set(0, -0.30, 0.06);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.36, long ? -1.28 : -0.72);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  return g;
}

export { curvedPrint, flatPrint, makeCape };

export const EXHIBITS = {
  'minifig-blank': () => createMinifig({ torso: C.blue, legs: C.darkBluishGray, face: FACES.smile, faceKey: 'smile' }),
  'minifig-poses': () => {
    const g = new THREE.Group();
    const faces = ['smile', 'worried', 'determined', 'shout', 'scared'];
    faces.forEach((f, i) => {
      const m = createMinifig({
        torso: [C.red, C.blue, C.green, C.orange, C.tan][i],
        legs: C.darkBluishGray, face: FACES[f], faceKey: f,
      });
      m.position.x = (i - 2) * 2.4;
      m.userData.pose({ armL: -0.9 + i * 0.3, armR: -0.3, legL: 0.3, legR: -0.3 });
      g.add(m);
    });
    return g;
  },
  'minifig-cape': () => createMinifig({
    torso: C.black, legs: C.black, arms: C.black, hands: C.black, skin: C.black,
    face: (g, w, h) => drawFace(g, w, h, { mouth: 'flat', shades: true }), faceKey: 'shade',
    cape: { color: 0x141414, w: 1.8, h: 2.6 },
  }),
};
