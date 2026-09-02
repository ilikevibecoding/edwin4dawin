import * as THREE from 'three';
import { paramSurface, mergeGroups } from './geometry.js';
import { pnoise, fbm, ridged, smoothstep } from './noise.js';
import { bakeNormalMap, CAMO_TILE, SKIN_TILE } from './textures.js';

/**
 * Arm tube: one SkinnedMesh from the shoulder anchor, around the elbow, down the forearm and into the glove
 * cuff. Two material groups: the desert-camo sleeve (rolled-up hem at mid forearm, cloth wrinkles displaced
 * into the vertices and baked into a unique normal map) and the bare wrist skin between hem and glove.
 *
 * u ∈ [0,1) runs around the tube (u = 0 → inside of the elbow bend), v ∈ [0,1] from shoulder to cuff.
 */

const SKIN_LEN = 0.075; // bare forearm between the rolled hem and the glove opening (metres)
const ROLL_LEN = 0.024; // height of the rolled hem
const INTO_CUFF = 0.03; // how far the skin tube continues inside the glove

const _t = new THREE.Vector3();
const _n = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _ref = new THREE.Vector3();

/** Wrinkle height field factory (metres). Positions are metres along the tube; `C` = circumference. */
export function makeWrinkleField(sE, sRoll, C, seed = 0) {
  const wrap = (u) => u - Math.round(u); // → [-0.5, 0.5]
  const coarse = (u, s) => {
    // 1. rings of pushed-up fabric bunching above the rolled hem
    const env1 = smoothstep(sRoll - 0.12, sRoll - 0.045, s) * (1 - smoothstep(sRoll - 0.014, sRoll - 0.002, s));
    const phase = 2.4 * pnoise(u * 4 + seed, s * 15, 4, 64);
    const rings = 0.0028 * env1 * Math.sin((s * Math.PI * 2) / 0.027 + phase) * (0.7 + 0.3 * pnoise(u * 3 + 2, s * 11, 3, 64));
    // 2. slow slouch undulation
    const slouch = 0.0016 * pnoise(u * 2 + seed * 0.5, s * 8 + 1.3, 2, 64) * (1 - smoothstep(sRoll - 0.05, sRoll, s));
    // 3. concentric folds on the inside of the elbow, bulge on the outside
    const du = wrap(u);
    const dIn = Math.sqrt((du * C) ** 2 + (s - sE) ** 2);
    const inside = smoothstep(0.32, 0.12, Math.abs(du));
    const folds = 0.003 * Math.exp(-((dIn / 0.07) ** 2)) * Math.sin((dIn * Math.PI * 2) / 0.021 + 1.5 * pnoise(u * 6, s * 20, 6, 64)) * inside;
    const dOut = Math.sqrt((wrap(u - 0.5) * C) ** 2 + (s - sE) ** 2);
    const bulge = 0.003 * Math.exp(-((dOut / 0.06) ** 2));
    return rings + slouch + folds + bulge;
  };
  const fine = (u, s) => {
    // diagonal tension creases (forearm mostly, some on the upper arm)
    const r = ridged(u * 4 + s * 10 + seed, s * 22, 4, 128, 2);
    const envF = smoothstep(sE + 0.03, sE + 0.12, s) * (1 - smoothstep(sRoll - 0.06, sRoll - 0.01, s)) + 0.45 * (1 - smoothstep(sE - 0.14, sE - 0.04, s));
    const creases = 0.0022 * Math.pow(smoothstep(0.55, 1, r), 1.6) * envF;
    // fine fabric noise
    const grain = 0.0005 * fbm(u * 8, s * 26, 8, 128, 3);
    return creases + grain;
  };
  return { coarse, fine };
}

/**
 * @param {object} p
 * @param {THREE.Vector3} p.S shoulder, p.E elbow, p.W wrist bend point (root space, rest pose)
 * @param {THREE.Vector3} p.handY hand +Y (wrist → knuckles) and p.handZ hand +Z (back of the hand), root space
 * @param {THREE.Matrix4[]} p.restBones [upper, fore, hand] rest matrices (root space)
 * @param {THREE.Bone[]} p.bones [upper, fore, hand]
 * @param {THREE.Material} p.skinMaterial shared bare-skin material
 */
export function buildSleeve(game, { S, E, W, handY, handZ, bones, restBones, side, camo, skinMaterial, seed = 0 }) {
  const { assets } = game;
  // --- centre line: S → rounded elbow → forearm → rounded wrist bend → inside the glove cuff
  const dirFore = _t.copy(W).sub(E).normalize().clone();
  const end = W.clone().addScaledVector(handY, INTO_CUFF);
  const rb = 0.055; // elbow rounding radius
  const rw = 0.045; // wrist rounding radius
  const dSE = E.clone().sub(S);
  const lenSE = dSE.length();
  dSE.normalize();
  const lenEW = W.distanceTo(E);
  const a = E.clone().addScaledVector(dSE, -Math.min(rb, lenSE * 0.45));
  const b = E.clone().addScaledVector(dirFore, Math.min(rb, lenEW * 0.45));
  const c = W.clone().addScaledVector(dirFore, -Math.min(rw, lenEW * 0.3));
  const d = W.clone().addScaledVector(handY, Math.min(rw, INTO_CUFF * 0.8));
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(S.clone(), a));
  path.add(new THREE.QuadraticBezierCurve3(a, E.clone(), b));
  path.add(new THREE.LineCurve3(b, c));
  path.add(new THREE.QuadraticBezierCurve3(c, W.clone(), d));
  path.add(new THREE.LineCurve3(d, end));
  const L = path.getLength();
  const lens = path.curves.map((cv) => cv.getLength());
  const sE = lens[0] + lens[1] * 0.5; // metres along the tube at the elbow
  const sW = lens[0] + lens[1] + lens[2] + lens[3] * 0.5; // at the wrist bend
  const sRollBottom = sW - SKIN_LEN; // where the hem ends and the skin starts
  const sRoll = sRollBottom - ROLL_LEN; // top of the rolled hem (wrinkle envelopes end here)
  const inside = S.clone().add(W).multiplyScalar(0.5).sub(E).normalize(); // toward the inside of the bend
  const C = Math.PI * 2 * 0.05;
  const field = makeWrinkleField(sE, sRoll, C, seed);
  // end-of-tube reference vector for the elliptical wrist section (sign chosen to stay near `inside`)
  const refEnd = handZ.clone().multiplyScalar(Math.sign(handZ.dot(inside)) || 1);

  /** Sleeve radius (metres) at s metres along the tube, before wrinkles. */
  const sleeveRadius = (s) => {
    let r;
    if (s < sE) r = 0.058 - 0.005 * (s / sE);
    else {
      const k = (s - sE) / (sRoll - sE);
      r = 0.053 - 0.006 * k - 0.002 * k * k;
    }
    if (s < 0.05) r *= Math.sqrt(Math.max(0, 1 - ((0.05 - s) / 0.05) ** 2)); // shoulder dome
    // rolled hem: doubled fabric bulging out over ROLL_LEN, then the underside drops to the arm
    const k = (s - sRoll) / ROLL_LEN;
    if (k > 0 && k < 1) r += 0.0075 * Math.pow(Math.sin(Math.pow(k, 1.3) * Math.PI), 0.7) + 0.002 * k;
    return r;
  };
  /** Bare forearm semi-axes (across, thickness) at s. */
  const skinRadius = (s, out) => {
    const k = smoothstep(sRollBottom, sW, s);
    out.x = 0.037 - 0.006 * k;
    out.y = 0.033 - 0.009 * k;
    return out;
  };

  const frame = (v) => {
    path.getPointAt(v, _c);
    path.getTangentAt(v, _t).normalize();
    const s = v * L;
    const kw = smoothstep(sRollBottom - 0.05, sW, s);
    _ref.copy(inside).lerp(refEnd, kw);
    _n.copy(_ref).addScaledVector(_t, -_ref.dot(_t)).normalize();
    _b.crossVectors(_t, _n);
  };

  const s2 = new THREE.Vector2();
  const sleeveEnd = sRollBottom + 0.003; // include the hem underside in the sleeve surface
  const vSleeveEnd = sleeveEnd / L;
  const fnSleeve = (u, along, out) => {
    const v = along * vSleeveEnd;
    const s = v * L;
    frame(v);
    const theta = Math.PI * 2 * (1 - u);
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    let r;
    if (s > sRollBottom) {
      // hem underside: blend from the roll radius down to the arm
      skinRadius(s, s2);
      const k = (s - sRollBottom) / 0.003;
      const rArm = Math.hypot(s2.x * st, s2.y * ct) + 0.0015;
      r = sleeveRadius(sRollBottom) * (1 - k) + rArm * k;
    } else {
      r = sleeveRadius(s) + field.coarse(u, s) * (s > 0.04 ? 1 : s / 0.04);
      // gravity drape: cloth hangs a little below the arm
      const downness = -(ct * _n.y + st * _b.y);
      r += 0.004 * smoothstep(-0.2, 1, downness) * smoothstep(0.03, 0.1, s) * (1 - smoothstep(sRoll - 0.06, sRoll - 0.02, s));
    }
    out.copy(_c).addScaledVector(_n, ct * r).addScaledVector(_b, st * r);
    return out;
  };
  const fnSkin = (u, along, out) => {
    const s0 = sRollBottom - 0.006; // start under the hem
    const v = (s0 + along * (L - s0)) / L;
    const s = v * L;
    frame(v);
    const theta = Math.PI * 2 * (1 - u);
    skinRadius(Math.max(s0, s), s2);
    out.copy(_c).addScaledVector(_n, Math.cos(theta) * s2.y).addScaledVector(_b, Math.sin(theta) * s2.x);
    return out;
  };

  const NV = 44;
  const NU_S = 84;
  const NU_K = 14;
  // paramSurface: its "u" runs along (our v), its "v" runs around (our u)
  const sleeveGeo = paramSurface((along, around, out) => fnSleeve(around, along, out), NU_S, NV, {
    uv: (along, around, p, st) => {
      st[0] = around;
      st[1] = (along * sleeveEnd) / CAMO_TILE;
    },
    color: (along, around, p, rgb) => {
      // soft AO: darker inside the elbow crease, in the bunched rings and under the hem fold
      const s = along * sleeveEnd;
      const du = around - Math.round(around);
      const dIn = Math.sqrt((du * C) ** 2 + (s - sE) ** 2);
      const ao = 1 - 0.22 * Math.exp(-((dIn / 0.06) ** 2)) - 0.1 * smoothstep(sRoll - 0.06, sRoll - 0.014, s) * (1 - smoothstep(sRoll - 0.012, sRoll, s)) - 0.35 * smoothstep(sRollBottom - 0.004, sRollBottom + 0.003, s);
      rgb[0] = rgb[1] = rgb[2] = ao;
    },
  });
  const skinGeo = paramSurface((along, around, out) => fnSkin(around, along, out), NU_K, NV, {
    uv: (along, around, p, st) => {
      st[0] = (around * 0.2) / SKIN_TILE;
      st[1] = (along * (L - sRollBottom)) / SKIN_TILE;
    },
    color: (along, around, p, rgb) => {
      const s = sRollBottom - 0.006 + along * (L - sRollBottom + 0.006);
      // shadow under the hem and inside the glove cuff
      const ao = 1 - 0.45 * (1 - smoothstep(sRollBottom, sRollBottom + 0.03, s)) - 0.5 * smoothstep(sW - 0.01, sW + 0.02, s);
      rgb[0] = rgb[1] = rgb[2] = ao;
    },
  });

  // --- skin weights: upper arm → forearm blend at the elbow, forearm → hand blend at the wrist bend
  const weightsFor = (geo, sAt, nu) => {
    const count = geo.attributes.position.count;
    const skinIndex = new Uint16Array(count * 4);
    const skinWeight = new Float32Array(count * 4);
    for (let i = 0; i <= nu; i++) {
      const s = sAt(i / nu);
      const wf = smoothstep(sE - 0.06, sE + 0.06, s);
      const wh = smoothstep(sW - 0.035, sW + 0.012, s);
      const wUpper = 1 - wf;
      const wFore = wf * (1 - wh);
      const wHand = wf * wh;
      for (let j = 0; j <= NV; j++) {
        const k = i * (NV + 1) + j;
        skinIndex[k * 4] = 0;
        skinIndex[k * 4 + 1] = 1;
        skinIndex[k * 4 + 2] = 2;
        skinIndex[k * 4 + 3] = 0;
        skinWeight[k * 4] = wUpper;
        skinWeight[k * 4 + 1] = wFore;
        skinWeight[k * 4 + 2] = wHand;
        skinWeight[k * 4 + 3] = 0;
      }
    }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  };
  weightsFor(sleeveGeo, (along) => along * sleeveEnd, NU_S);
  weightsFor(skinGeo, (along) => sRollBottom - 0.006 + along * (L - sRollBottom + 0.006), NU_K);

  // --- materials: tiled camo albedo + unique baked wrinkle normal map over the whole sleeve surface
  const normalMap = bakeNormalMap(assets, (u, v) => field.coarse(u, v * sleeveEnd) * 0.35 + field.fine(u, v * sleeveEnd), C, sleeveEnd, 1024, {
    weave: 0.00018,
    strength: 1,
  });
  normalMap.repeat.set(1, CAMO_TILE / sleeveEnd);
  const material = new THREE.MeshStandardMaterial({
    name: side > 0 ? 'SleeveRight' : 'SleeveLeft',
    map: camo.map,
    normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: camo.roughnessMap,
    roughness: 1,
    metalness: 0,
    vertexColors: true,
    envMapIntensity: 0.9,
  });

  const geo = mergeGroups([sleeveGeo, skinGeo]);
  const skeleton = new THREE.Skeleton(bones, restBones.map((m) => m.clone().invert()));
  const mesh = new THREE.SkinnedMesh(geo, [material, skinMaterial]);
  mesh.name = side > 0 ? 'ArmRight' : 'ArmLeft';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.bind(skeleton, new THREE.Matrix4());
  return { mesh, material, length: L };
}
