import * as THREE from 'three';
import { C, FINISH } from './palette.js';
import { mat, glow } from './materials.js';
import {
  STUD, PLATE, BRICK, STUD_R, STUD_H, boxGeo, cylGeo, studGeo, prismGeo,
  torusGeo, sphereGeo, flatten,
} from './parts.js';
import { printedBoxGeometry, printedHeadGeometry, boxAtlasCells, svgAtlas, svgTexture } from './svg.js';

/*
 * Minifigure proportions, in stud units (1 unit = 8 mm).
 * A minifig is 4 bricks tall; every number below is measured off a real one.
 */
export const FIG = {
  headR: 0.60,
  headH: 1.20,
  neckH: 0.10,
  torsoH: 1.95,
  torsoWTop: 1.05,
  torsoWBot: 1.48,
  torsoD: 0.80,
  armLen: 1.05,
  foreLen: 0.72,
  armW: 0.42,
  armD: 0.46,
  handR: 0.26,
  hipH: 0.62,
  hipW: 1.48,
  hipD: 0.88,
  legH: 1.62,
  legW: 0.70,
  legD: 0.88,
  get totalH() { return this.legH + this.hipH + this.torsoH + this.headH + this.neckH; },
};

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

function tapered(geom, yTop, yBot, scaleTop) {
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp((y - yBot) / (yTop - yBot), 0, 1);
    const s = THREE.MathUtils.lerp(1, scaleTop, t);
    pos.setX(i, pos.getX(i) * s);
    pos.setZ(i, pos.getZ(i) * (1 - (1 - s) * 0.35));
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/** The classic bent LEGO arm, as an extruded silhouette. */
function armGeometry() {
  const w = FIG.armW, L = FIG.armLen, F = FIG.foreLen;
  const pts = [
    [-w / 2, 0.16],
    [-w / 2, -L * 0.62],
    [-w / 2 + 0.06, -L * 0.86],
    [w * 0.10, -L - F * 0.62],
    [w * 0.10 + w * 0.86, -L - F * 0.60],
    [w / 2 + 0.10, -L * 0.80],
    [w / 2, -L * 0.50],
    [w / 2, 0.16],
  ];
  const g = prismGeo(pts, FIG.armD, 0.05).clone();
  return g;
}

/** Leg with the little toe kick at the front, extruded across the body's Z. */
function legGeometry() {
  const h = FIG.legH, d = FIG.legD, w = FIG.legW;
  const pts = [
    [-d / 2, 0], [d / 2 - 0.10, 0], [d / 2, 0.16], [d / 2, h], [-d / 2, h],
  ];
  const g = prismGeo(pts, w, 0.05).clone();
  g.rotateY(Math.PI / 2); // profile runs front-to-back, thickness across X
  return g;
}

/**
 * @typedef {object} MinifigSpec
 * @property {number} [skin] head colour
 * @property {number} [torso] torso colour
 * @property {number} [arms]
 * @property {number} [hands]
 * @property {number} [hips]
 * @property {number} [legs]
 * @property {number} [legsLeft] two-tone legs
 * @property {string} [face] SVG for the face print
 * @property {string} [torsoFront] SVG for the torso front print
 * @property {string} [torsoBack] SVG
 * @property {string} [armPrint]
 * @property {(fig:Minifig)=>THREE.Object3D} [headgear] hair / helmet / hood builder
 * @property {object} [cape] { color, w, h, y }
 */

export class Minifig {
  /** @param {MinifigSpec} spec */
  constructor(spec = {}) {
    this.spec = {
      skin: C.yellow,
      torso: C.blue,
      arms: null,
      hands: null,
      hips: C.black,
      legs: C.black,
      ...spec,
    };
    if (this.spec.skin === undefined) this.spec.skin = C.yellow;
    this.root = new THREE.Group();
    this.root.name = spec.name || 'minifig';
    this.t = 0;
    this.walkPhase = 0;
    this.walkSpeed = 0;
    this.blinkTimer = 2 + Math.random() * 3;
    this._build();
  }

  _build() {
    const s = this.spec;
    const skin = s.skin;
    const armColor = s.arms ?? s.torso;
    const handColor = s.hands ?? skin;

    // ---- hips + legs -----------------------------------------------------
    this.hips = new THREE.Group();
    this.hips.position.y = FIG.legH;
    this.root.add(this.hips);

    const hipMesh = new THREE.Mesh(boxGeo(FIG.hipW, FIG.hipH, FIG.hipD, 0.05), mat(s.hips));
    hipMesh.position.y = FIG.hipH / 2;
    hipMesh.castShadow = hipMesh.receiveShadow = true;
    this.hips.add(hipMesh);

    const legGeo = legGeometry();
    this.legs = {};
    for (const side of ['L', 'R']) {
      const pivot = new THREE.Group();
      const sx = side === 'L' ? 1 : -1;
      pivot.position.set(sx * (FIG.legW / 2 + 0.045), 0, 0);
      const color = side === 'L' ? (s.legsLeft ?? s.legs) : s.legs;
      const m = new THREE.Mesh(legGeo, mat(color));
      m.position.y = -FIG.legH;
      m.castShadow = m.receiveShadow = true;
      pivot.add(m);
      if (s.boots) {
        const boot = new THREE.Mesh(boxGeo(FIG.legW + 0.06, 0.34, FIG.legD + 0.06, 0.05), mat(s.boots));
        boot.position.y = -FIG.legH + 0.17;
        pivot.add(boot);
      }
      this.hips.add(pivot);
      this.legs[side] = pivot;
    }

    // ---- torso -----------------------------------------------------------
    this.torso = new THREE.Group();
    this.torso.position.y = FIG.hipH;
    this.hips.add(this.torso);

    const cells = boxAtlasCells(384);
    const bg = s.torso;
    const torsoTex = svgAtlas([
      { ...cells.pz, svg: s.torsoFront || null, background: bg },
      { ...cells.nz, svg: s.torsoBack || null, background: bg },
      { ...cells.px, svg: s.torsoSide || null, background: bg },
      { ...cells.nx, svg: s.torsoSide || null, background: bg },
      { ...cells.py, svg: null, background: s.collar ?? bg },
      { ...cells.ny, svg: null, background: bg },
    ], { w: 384, h: 384, background: bg, key: `torso:${s.name}:${bg}` });

    const torsoGeo = tapered(
      printedBoxGeometry(FIG.torsoWBot, FIG.torsoH, FIG.torsoD).clone(),
      FIG.torsoH / 2, -FIG.torsoH / 2, FIG.torsoWTop / FIG.torsoWBot,
    );
    const torsoMat = mat(0xffffff, FINISH.SOLID, { key: 'torso' + s.name });
    const tm = torsoMat.clone();
    tm.map = torsoTex;
    tm.color = new THREE.Color(0xffffff);
    this.torsoMesh = new THREE.Mesh(torsoGeo, tm);
    this.torsoMesh.position.y = FIG.torsoH / 2;
    this.torsoMesh.castShadow = this.torsoMesh.receiveShadow = true;
    this.torso.add(this.torsoMesh);

    // ---- arms + hands ----------------------------------------------------
    const armGeo = armGeometry();
    this.arms = {}; this.hands = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const shoulder = new THREE.Group();
      shoulder.position.set(sx * (FIG.torsoWTop / 2 + FIG.armW / 2 - 0.04), FIG.torsoH - 0.30, 0);
      shoulder.rotation.z = sx * 0.13;
      const arm = new THREE.Mesh(armGeo, mat(armColor));
      arm.castShadow = true;
      arm.scale.x = sx;
      shoulder.add(arm);

      const hand = new THREE.Group();
      hand.position.set(sx * 0.06, -(FIG.armLen + FIG.foreLen * 0.62), 0.10);
      const ring = new THREE.Mesh(torusGeo(FIG.handR, 0.085, 12, 6), mat(handColor));
      ring.rotation.x = Math.PI / 2 - 0.5;
      hand.add(ring);
      shoulder.add(hand);

      this.torso.add(shoulder);
      this.arms[side] = shoulder;
      this.hands[side] = hand;
    }

    // ---- neck + head -----------------------------------------------------
    this.head = new THREE.Group();
    this.head.position.y = FIG.torsoH + FIG.neckH;
    this.torso.add(this.head);

    const neck = new THREE.Mesh(cylGeo(0.30, 0.30, 0.22, 10), mat(skin));
    neck.position.y = -0.06;
    this.head.add(neck);

    const faceTex = svgTexture(s.face || defaultFace(), {
      w: 512, h: 256, background: skin, key: `face:${s.name}:${skin}:${(s.face || '').length}`,
    });
    const headMat = mat(0xffffff).clone();
    headMat.map = faceTex;
    headMat.color = new THREE.Color(0xffffff);
    const headMesh = new THREE.Mesh(printedHeadGeometry(FIG.headR, FIG.headH, 24), headMat);
    headMesh.position.y = FIG.headH / 2;
    headMesh.castShadow = headMesh.receiveShadow = true;
    this.head.add(headMesh);
    this.headMesh = headMesh;

    const topStud = new THREE.Mesh(studGeo(STUD_R, STUD_H, 10), mat(skin));
    topStud.position.y = FIG.headH;
    this.head.add(topStud);
    this.topStud = topStud;

    if (s.headgear) {
      const hg = s.headgear(this);
      if (hg) { this.head.add(hg); this.headgear = hg; }
    }

    if (s.cape) this._buildCape(s.cape);

    this.root.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });
  }

  _buildCape(opt) {
    const w = opt.w ?? 1.7, h = opt.h ?? 3.0;
    const segX = 5, segY = 7;
    const geo = new THREE.PlaneGeometry(w, h, segX, segY);
    const m = mat(opt.color ?? C.black, FINISH.SOLID, { roughness: 0.75 }).clone();
    m.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = true;
    mesh.position.set(0, (opt.y ?? FIG.torsoH - 0.05) - h / 2, -FIG.torsoD / 2 - 0.06);
    this.torso.add(mesh);
    this.cape = {
      mesh, geo, w, h, segX, segY,
      base: geo.attributes.position.array.slice(),
      swing: 0, swingV: 0,
    };
  }

  // ------------------------------------------------------------------ poses

  setPose(name, amt = 1) {
    const a = this.arms, l = this.legs;
    const set = (o, x = 0, y = 0, z = 0) => {
      o.rotation.x = THREE.MathUtils.lerp(o.rotation.x, x, amt);
      o.rotation.y = THREE.MathUtils.lerp(o.rotation.y, y, amt);
      o.rotation.z = THREE.MathUtils.lerp(o.rotation.z, z, amt);
    };
    switch (name) {
      case 'idle':
        set(a.L, 0, 0, 0.13); set(a.R, 0, 0, -0.13);
        set(l.L); set(l.R);
        break;
      case 'stand_wide':
        set(a.L, 0, 0, 0.30); set(a.R, 0, 0, -0.30);
        set(l.L, 0, 0, 0.12); set(l.R, 0, 0, -0.12);
        break;
      case 'hold_two':      // both hands forward, gripping
        set(a.L, -1.35, 0, 0.30); set(a.R, -1.35, 0, -0.30);
        break;
      case 'hold_right':
        set(a.R, -1.45, 0, -0.18); set(a.L, -0.2, 0, 0.16);
        break;
      case 'aim':
        set(a.R, -1.62, 0, -0.10); set(a.L, -1.35, 0, 0.34);
        break;
      case 'point':
        set(a.R, -1.75, 0, -0.30); set(a.L, 0.1, 0, 0.14);
        break;
      case 'saber_guard':
        set(a.R, -1.15, 0, -0.55); set(a.L, -0.85, 0, 0.62);
        break;
      case 'saber_high':
        set(a.R, -2.55, 0, -0.35); set(a.L, -2.35, 0, 0.35);
        break;
      case 'panic':
        set(a.L, -2.7, 0, 0.5); set(a.R, -2.7, 0, -0.5);
        break;
      case 'surrender':
        set(a.L, -2.9, 0, 0.25); set(a.R, -2.9, 0, -0.25);
        break;
      case 'salute':
        set(a.R, -2.35, 0, -0.75); set(a.L, 0, 0, 0.13);
        break;
      case 'reach':
        set(a.L, -1.9, 0, 0.22); set(a.R, -1.9, 0, -0.22);
        break;
      case 'sit':
        set(l.L, -1.5, 0, 0.05); set(l.R, -1.5, 0, -0.05);
        set(a.L, -0.9, 0, 0.2); set(a.R, -0.9, 0, -0.2);
        break;
      case 'fallen':
        set(a.L, -0.4, 0, 1.3); set(a.R, -0.4, 0, -1.3);
        set(l.L, 0.3, 0, 0.2); set(l.R, 0.25, 0, -0.25);
        break;
      default:
        break;
    }
    this._pose = name;
    return this;
  }

  /** Minifigs walk from the hip with a signature waddle. */
  walk(dt, speed = 1) {
    this.walkSpeed = speed;
    this.walkPhase += dt * speed * 7.0;
    const p = this.walkPhase;
    const amp = 0.52 * Math.min(1, speed);
    this.legs.L.rotation.x = Math.sin(p) * amp;
    this.legs.R.rotation.x = -Math.sin(p) * amp;
    this.arms.L.rotation.x = -Math.sin(p) * amp * 0.8;
    this.arms.R.rotation.x = Math.sin(p) * amp * 0.8;
    this.root.position.y = this._groundY ?? 0;
    this.hips.position.y = FIG.legH - Math.abs(Math.sin(p)) * 0.10 * amp;
    this.hips.rotation.z = Math.sin(p) * 0.05 * amp;
    this.torso.rotation.y = Math.sin(p) * 0.09 * amp;
    return this;
  }

  stopWalk() {
    this.walkSpeed = 0;
    this.hips.position.y = FIG.legH;
    this.hips.rotation.z = 0;
    this.torso.rotation.y = 0;
  }

  lookAt(target, weight = 1) {
    this.head.getWorldPosition(_v);
    _v2.copy(target).sub(_v);
    const parentQ = new THREE.Quaternion();
    this.torso.getWorldQuaternion(parentQ);
    _v2.applyQuaternion(parentQ.invert());
    const yaw = Math.atan2(_v2.x, _v2.z);
    const pitch = -Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z));
    this.head.rotation.y = THREE.MathUtils.clamp(yaw, -1.3, 1.3) * weight;
    this.head.rotation.x = THREE.MathUtils.clamp(pitch, -0.5, 0.5) * weight * 0.6;
    return this;
  }

  attach(side, object3D) {
    this.hands[side].add(object3D);
    return object3D;
  }

  setPosition(x, y, z) { this.root.position.set(x, y, z); this._groundY = y; return this; }
  setRotationY(r) { this.root.rotation.y = r; return this; }

  update(dt, t) {
    this.t = t;
    if (this.cape) {
      const c = this.cape;
      const pos = c.geo.attributes.position;
      const targetSwing = -this.walkSpeed * 0.35;
      c.swingV += (targetSwing - c.swing) * dt * 8;
      c.swingV *= 0.86;
      c.swing += c.swingV * dt * 10;
      for (let i = 0; i <= c.segY; i++) {
        const v = i / c.segY;                 // 0 = top
        for (let j = 0; j <= c.segX; j++) {
          const idx = i * (c.segX + 1) + j;
          const bx = c.base[idx * 3], by = c.base[idx * 3 + 1];
          const u = j / c.segX - 0.5;
          const drape = v * v;
          const flap = Math.sin(t * 2.1 + v * 3.4 + u * 2.0) * 0.055 * drape
            + Math.sin(t * 3.7 - v * 2.0) * 0.03 * drape;
          pos.setX(idx, bx * (1 + drape * 0.28));
          pos.setY(idx, by + drape * 0.10);
          pos.setZ(idx, -drape * (0.30 + c.swing) - flap - Math.abs(u) * drape * 0.22);
        }
      }
      pos.needsUpdate = true;
      c.geo.computeVertexNormals();
    }
    return this;
  }

  get object3D() { return this.root; }
}

function defaultFace() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
    <g fill="#20140a">
      <ellipse cx="216" cy="112" rx="12" ry="15"/>
      <ellipse cx="296" cy="112" rx="12" ry="15"/>
      <path d="M214 160 q42 26 84 0 q-42 14 -84 0z"/>
    </g></svg>`;
}

/** Lightsaber: chromed hilt plus an emissive blade that can ignite over time. */
export class Lightsaber {
  constructor({ color = C.transLightBlue, coreColor = 0xffffff, len = 4.4, hilt = C.flatSilver } = {}) {
    this.root = new THREE.Group();
    this.len = len;
    this.color = color;

    const h = new THREE.Group();
    const body = new THREE.Mesh(cylGeo(0.135, 0.135, 0.95, 10), mat(hilt, FINISH.METAL));
    body.position.y = 0.475;
    h.add(body);
    const grip = new THREE.Mesh(cylGeo(0.15, 0.15, 0.30, 10), mat(C.black, FINISH.RUBBER));
    grip.position.y = 0.36;
    h.add(grip);
    const emitter = new THREE.Mesh(cylGeo(0.115, 0.145, 0.12, 10), mat(C.metallicSilver, FINISH.METAL));
    emitter.position.y = 1.0;
    h.add(emitter);
    this.root.add(h);

    this.blade = new THREE.Group();
    this.blade.position.y = 1.0;
    const core = new THREE.Mesh(cylGeo(0.075, 0.075, 1, 8), glow(coreColor, 1));
    core.position.y = 0.5;
    const halo = new THREE.Mesh(cylGeo(0.155, 0.155, 1, 8), glow(color, 0.55));
    halo.position.y = 0.5;
    const tip = new THREE.Mesh(sphereGeo(0.075, 8, 6), glow(coreColor, 1));
    tip.position.y = 1;
    this.core = core; this.halo = halo; this.tip = tip;
    this.blade.add(core, halo, tip);
    this.root.add(this.blade);

    this.light = new THREE.PointLight(color, 0, 9, 2);
    this.light.position.y = 2.2;
    this.root.add(this.light);

    this.on = 0;
    this.setExtension(0);
  }

  setExtension(v) {
    this.on = THREE.MathUtils.clamp(v, 0, 1);
    const L = this.len * this.on;
    this.blade.visible = this.on > 0.001;
    this.core.scale.y = L; this.core.position.y = L / 2;
    this.halo.scale.y = L; this.halo.position.y = L / 2;
    this.tip.position.y = L;
    this.light.intensity = this.on * 14;
    this.light.position.y = 1 + L * 0.5;
  }

  update(dt, t) {
    if (this.on > 0.01) {
      const flick = 1 + Math.sin(t * 47) * 0.02 + Math.sin(t * 31.3) * 0.015;
      this.halo.scale.x = this.halo.scale.z = flick;
      this.light.intensity = this.on * (13 + Math.sin(t * 23) * 1.5);
    }
  }

  get object3D() { return this.root; }
}
