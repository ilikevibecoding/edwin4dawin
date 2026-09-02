import * as THREE from 'three';
import { loftY, shellPatch, padProfile, mergeGroups, concat, mirrorX, keyframes } from './geometry.js';
import { KNIT_TILE, LEATHER_TILE } from './textures.js';
import { smoothstep, mix } from './noise.js';

/**
 * Gloved hand built from smooth lofts. Hand-local frame: origin at the palm centre, +Y wrist → knuckles,
 * +Z out of the back of the hand, thumb on the -X side for the right hand (the left hand is a true mirror).
 *
 * Material slots shared by every merged geometry: 0 knit · 1 leather · 2 rubber (TPR) · 3 strap · 4 trim.
 */

const TAU = Math.PI * 2;
const HALF = Math.PI / 2;
/** Knit covers the back and the sides of the palm (±117°); the leather palm face fills the rest. */
const PALM_KNIT = HALF * 1.3;
/** Knit half-angle on the finger backs (±103°). */
const FINGER_KNIT = HALF * 1.15;

/** Right-hand finger data (metres / degrees). */
const FINGERS = [
  { name: 'index', mcp: [-0.0305, 0.049, 0.0005], splay: 7, len: [0.045, 0.026, 0.0225], r: [0.0102, 0.0093, 0.0086] },
  { name: 'middle', mcp: [-0.0095, 0.053, 0.0015], splay: 1, len: [0.05, 0.03, 0.0245], r: [0.0105, 0.0095, 0.0087] },
  { name: 'ring', mcp: [0.0115, 0.05, 0.0005], splay: -5, len: [0.046, 0.028, 0.0235], r: [0.0099, 0.0091, 0.0084] },
  { name: 'pinky', mcp: [0.0315, 0.042, -0.002], splay: -13, len: [0.036, 0.022, 0.021], r: [0.0089, 0.0081, 0.0075] },
];
const THUMB = {
  cmc: [-0.031, -0.026, -0.005],
  dir: [-0.6, 0.7, -0.38],
  nail: [-0.6, -0.3, 0.75],
  len: [0.046, 0.034, 0.03],
  r: [0.0138, 0.0107, 0.0096],
};

/** Glove opening (hand-local y); the bare wrist continues below this line. */
export const CUFF_Y = -0.09;
/** Where the knit back ends and the black neoprene cuff begins. */
const CUFF_KNIT_Y = -0.058;
/** Forearm attach point (IK end effector): at the glove opening so the rigid cuff stays aligned with the hand. */
export const WRIST_LOCAL = new THREE.Vector3(0, CUFF_Y + 0.004, 0.0);
/** Rest flexion of the knuckle row following the palm's cupping (radians). */
export const REST_MCP_TILT = 0.26;

const CLEAN = [0.36, 0.36, 0.38]; // vertex colour of clean leather (× texture ≈ black)
const DUST = [1.0, 0.95, 0.86];

const cup = (y) => (y > -0.01 ? -2.4 * (y + 0.01) * (y + 0.01) : 0);

/** Superellipse section with θ measured from +Z: x = across, y (→ z) = thickness. */
function sectionSE(a, b, n, theta, out) {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const e = 2 / n;
  out.x = a * Math.sign(s) * Math.pow(Math.abs(s), e);
  out.y = b * Math.sign(c) * Math.pow(Math.abs(c), e);
  return out;
}

const palmProfile = keyframes([
  { t: -0.1, a: 0.0335, b: 0.0235, n: 2.15 }, // glove opening (slightly flared)
  { t: -0.072, a: 0.0308, b: 0.0215, n: 2.2 }, // wrist
  { t: -0.052, a: 0.0305, b: 0.0205, n: 2.25 },
  { t: -0.025, a: 0.0365, b: 0.0205, n: 2.7 },
  { t: 0.015, a: 0.0415, b: 0.0165, n: 3.1 },
  { t: 0.046, a: 0.0425, b: 0.0145, n: 3.4 },
  { t: 0.07, a: 0.0425, b: 0.014, n: 3.4 },
]);

const _prof = {};

/* ------------------------------------------------------------------------------------------ palm */

function buildPalmGeometry(side) {
  const section = (y, theta, out) => {
    const p = palmProfile(y, _prof);
    return sectionSE(p.a, p.b, p.n, theta, out);
  };
  const deform = (out, y, theta, scale) => {
    out.z += cup(y);
    const c = Math.cos(theta);
    if (c < 0) {
      const p = palmProfile(y, _prof);
      const xi = out.x / (p.a * (scale || 1) || 1e-6);
      const k = Math.pow(-c, 1.5) * scale;
      // thenar eminence (thumb side) and hypothenar (heel, pinky side)
      const thenar = 0.0085 * Math.exp(-(((xi + 0.5) / 0.42) ** 2)) * Math.exp(-(((y + 0.02) / 0.03) ** 2));
      const hypo = 0.0055 * Math.exp(-(((xi - 0.62) / 0.4) ** 2)) * Math.exp(-(((y + 0.03) / 0.034) ** 2));
      out.z -= (thenar + hypo) * k;
    } else {
      // metacarpal ridges on the back of the hand
      const p = palmProfile(y, _prof);
      const xi = out.x / (p.a * (scale || 1) || 1e-6);
      const ridge = 0.0012 * Math.max(0, Math.cos(xi * Math.PI * 2.0)) * smoothstep(-0.01, 0.03, y) * Math.pow(c, 2) * scale;
      out.z += ridge;
    }
  };
  const thetaDorsal = (v) => PALM_KNIT * (1 - 2 * v);
  const thetaPalmar = (v) => TAU - PALM_KNIT - v * (TAU - 2 * PALM_KNIT);
  const uvDorsal = (u, v, p, st) => {
    st[0] = (thetaDorsal(v) * 0.036) / KNIT_TILE;
    st[1] = p.y / KNIT_TILE;
  };
  const uvPalmar = (u, v, p, st) => {
    st[0] = (thetaPalmar(v) * 0.036) / LEATHER_TILE;
    st[1] = p.y / LEATHER_TILE;
  };
  const colDorsal = (u, v, p, rgb) => {
    // darker in the strap's shadow and toward the opening
    const ao = 1 - 0.14 * smoothstep(-0.05, -0.075, p.y) - 0.08 * smoothstep(-0.085, CUFF_Y, p.y);
    rgb[0] = rgb[1] = rgb[2] = ao;
  };
  const colPalmar = (u, v, p, rgb) => {
    const theta = thetaPalmar(v);
    const edge = smoothstep(0.5, 0.9, Math.abs(Math.sin(theta))) * (1 - smoothstep(-0.05, -0.075, p.y));
    const heel = smoothstep(-0.025, -0.052, p.y) * (1 - smoothstep(-0.058, -0.078, p.y)) * 0.45;
    const d = Math.min(1, edge * 0.5 + heel);
    rgb[0] = mix(CLEAN[0], DUST[0], d);
    rgb[1] = mix(CLEAN[1], DUST[1], d);
    rgb[2] = mix(CLEAN[2], DUST[2], d);
  };
  const common = { cap0: 0, cap1: 0.009, section, deform };
  // knit back of the hand down to the wrist, black neoprene cuff below it (the strap sits on the cuff)
  const dorsal = loftY({ ...common, y0: CUFF_KNIT_Y, y1: 0.046, thetaFn: thetaDorsal, nu: 22, nv: 20, uv: uvDorsal, color: colDorsal });
  const cuff = loftY({
    ...common,
    y0: CUFF_Y,
    y1: CUFF_KNIT_Y,
    cap1: 0,
    thetaFn: thetaDorsal,
    nu: 6,
    nv: 20,
    uv: (u, v, p, st) => {
      st[0] = (thetaDorsal(v) * 0.036) / LEATHER_TILE + 0.5;
      st[1] = p.y / LEATHER_TILE;
    },
    color: (u, v, p, rgb) => {
      const ao = 1 - 0.25 * smoothstep(CUFF_KNIT_Y - 0.01, CUFF_KNIT_Y, p.y);
      rgb[0] = CLEAN[0] * ao;
      rgb[1] = CLEAN[1] * ao;
      rgb[2] = CLEAN[2] * ao;
    },
  });
  const palmar = loftY({ ...common, y0: CUFF_Y, y1: 0.046, thetaFn: thetaPalmar, nu: 26, nv: 16, uv: uvPalmar, color: colPalmar });
  // moulded TPR knuckle plate over the metacarpal heads: three segments separated by shallow grooves
  const plate = shellPatch({
    ya: 0.004,
    yb: 0.046,
    beta: 0.8,
    section,
    deform,
    base: 0.985,
    pad: (u, v) => {
      const prof = padProfile(0.0042, 0.2, 0.16)(u, v);
      const seg = 1 - 0.55 * (Math.exp(-(((v - 0.34) / 0.045) ** 2)) + Math.exp(-(((v - 0.66) / 0.045) ** 2)));
      const vent = 1 - 0.3 * Math.exp(-(((u - 0.5) / 0.1) ** 2)) * smoothstep(0.1, 0.25, Math.min(v, 1 - v));
      return prof * seg * vent;
    },
    nu: 12,
    nv: 24,
    uv: (u, v, p, st) => {
      st[0] = v * 1.4;
      st[1] = p.y / LEATHER_TILE;
    },
    color: (u, v, p, rgb) => {
      rgb[0] = rgb[1] = rgb[2] = 1;
    },
  });
  const g = mergeGroups([dorsal, concat([palmar, cuff]), plate, null, null]);
  if (side < 0) mirrorX(g);
  return g;
}

/* --------------------------------------------------------------------------------------- fingers */

/**
 * One finger/thumb segment from joint (y = 0) to the next joint (y = len) with hemispherical joint caps.
 * Knit back, leather front (wrapping fully over a fingertip), optional moulded TPR guard.
 */
function buildSegmentGeometry({ len, r0, r1, tip = false, guard = true, base = false, side }) {
  const rAt = (y) => {
    const t = Math.min(1, Math.max(0, y / len));
    const s = t * t * (3 - 2 * t);
    return r0 + (r1 - r0) * s;
  };
  const section = (y, theta, out) => {
    const r = rAt(y);
    // slightly boxy cross-section, flatter on the pad side
    const c = Math.cos(theta);
    const flat = c < 0 ? 0.9 - 0.06 * Math.pow(-c, 2) : 0.95;
    return sectionSE(r, r * flat, 2.5, theta, out);
  };
  const alpha = tip ? (u) => FINGER_KNIT * (1 - smoothstep(0.7, 0.96, u)) : () => FINGER_KNIT;
  const tipCap = tip ? r1 * 1.0 : r1;
  const uvKnit = (u, v, p, st) => {
    const a = alpha(u);
    st[0] = (a * (1 - 2 * v) * rAt(p.y)) / KNIT_TILE + 0.5;
    st[1] = p.y / KNIT_TILE;
  };
  const uvLeather = (u, v, p, st) => {
    const a = alpha(u);
    const theta = TAU - a - v * (TAU - 2 * a);
    st[0] = ((theta - Math.PI) * rAt(p.y)) / LEATHER_TILE + 0.5;
    st[1] = p.y / LEATHER_TILE;
  };
  const colKnit = (u, v, p, rgb) => {
    const ao = 1 - 0.3 * (1 - smoothstep(-r0 * 0.6, len * 0.35, p.y)) - (tip ? 0 : 0.12 * smoothstep(len * 0.8, len + r1 * 0.8, p.y));
    rgb[0] = rgb[1] = rgb[2] = ao;
  };
  const colLeather = (u, v, p, rgb) => {
    let d = tip ? 0.5 * smoothstep(len * 0.35, len + r1, p.y) : base ? 0.05 : 0.12 * smoothstep(0, len, p.y);
    if (!tip) d += 0.05;
    rgb[0] = mix(CLEAN[0], DUST[0], d);
    rgb[1] = mix(CLEAN[1], DUST[1], d);
    rgb[2] = mix(CLEAN[2], DUST[2], d);
  };
  const common = { y0: 0, y1: len, cap0: r0, cap1: tipCap, section };
  const dorsal = loftY({ ...common, thetaFn: (v, u) => alpha(u) * (1 - 2 * v), nu: tip ? 18 : 14, nv: 8, uv: uvKnit, color: colKnit });
  const palmar = loftY({
    ...common,
    thetaFn: (v, u) => {
      const a = alpha(u);
      return TAU - a - v * (TAU - 2 * a);
    },
    nu: tip ? 18 : 14,
    nv: 12,
    uv: uvLeather,
    color: colLeather,
  });
  let rubber = null;
  if (guard && !tip && !base) {
    rubber = shellPatch({
      ya: len * 0.2,
      yb: len * 0.84,
      beta: 1.05,
      section,
      base: 0.975,
      pad: (u, v) => {
        const prof = padProfile(0.0031, 0.3, 0.28)(u, v);
        // two soft ridges with a shallow central groove
        const groove = 1 - 0.28 * Math.exp(-(((v - 0.5) / 0.14) ** 2));
        return prof * groove;
      },
      nu: 8,
      nv: 10,
      uv: (u, v, p, st) => {
        st[0] = v * 0.6;
        st[1] = p.y / LEATHER_TILE;
      },
      color: (u, v, p, rgb) => {
        rgb[0] = rgb[1] = rgb[2] = 1;
      },
    });
  }
  const g = mergeGroups([dorsal, palmar, rubber, null, null]);
  if (side < 0) mirrorX(g);
  return g;
}

/* ------------------------------------------------------------------------------------ cuff etc. */

function buildCuffGeometry(side) {
  const section = (y, theta, out) => {
    const p = palmProfile(y, _prof);
    return sectionSE(p.a, p.b, p.n, theta, out);
  };
  const white = (u, v, p, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 1;
  };
  // light grey binding tape around the glove opening (rolled edge, slightly proud of the cuff)
  const trim = loftY({
    y0: CUFF_Y - 0.003,
    y1: CUFF_Y + 0.003,
    cap0: 0,
    cap1: 0,
    section: (y, theta, out) => {
      section(y, theta, out);
      const k = 1.035 + 0.05 * Math.sin(((y - CUFF_Y + 0.003) / 0.006) * Math.PI);
      out.x *= k;
      out.y *= k;
      return out;
    },
    thetaFn: (v) => TAU * (1 - v),
    nu: 4,
    nv: 28,
    uv: (u, v, p, st) => {
      st[0] = (TAU * (1 - v) * 0.033) / KNIT_TILE;
      st[1] = (p.y / KNIT_TILE) * 0.5;
    },
    color: (u, v, p, rgb) => {
      const ao = 1 - 0.3 * smoothstep(CUFF_Y + 0.001, CUFF_Y - 0.003, p.y); // underside darker
      rgb[0] = rgb[1] = rgb[2] = ao;
    },
  });
  // Velcro wrist strap: 325° band, open on the thumb side, plus the folded-over tab on the back of the wrist
  const strap = shellPatch({
    ya: -0.083,
    yb: -0.061,
    thetaCenter: HALF,
    beta: Math.PI - 0.3,
    section,
    base: 1.0,
    pad: (u, v) => {
      const eu = Math.min(u, 1 - u) / 0.18;
      const ev = Math.min(v, 1 - v) / 0.04;
      const a = eu >= 1 ? 1 : Math.sin(Math.min(1, eu) * HALF);
      const b = ev >= 1 ? 1 : Math.sqrt(Math.min(1, ev));
      return 0.0026 * a * b;
    },
    nu: 6,
    nv: 40,
    uv: (u, v, p, st) => {
      st[0] = v * 6;
      st[1] = u * 0.8;
    },
    color: white,
  });
  const tab = shellPatch({
    ya: -0.0815,
    yb: -0.0625,
    thetaCenter: 0.5,
    beta: 0.48,
    section,
    base: 1.0,
    pad: (u, v) => 0.0026 + padProfile(0.0026, 0.18, 0.2)(u, v),
    nu: 6,
    nv: 10,
    uv: (u, v, p, st) => {
      st[0] = v * 1.2;
      st[1] = u * 0.8;
    },
    color: white,
  });
  const g = mergeGroups([null, null, null, concat([strap, tab]), trim]);
  if (side < 0) mirrorX(g);
  return g;
}

/* ------------------------------------------------------------------------------------- assembly */

function basisQuat(yDir, zDir, out) {
  const y = yDir.clone().normalize();
  const z = zDir.clone().addScaledVector(y, -y.dot(zDir)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

const _euler = new THREE.Euler(0, 0, 0, 'ZXY');
const _q = new THREE.Quaternion();

/**
 * Build a posable gloved hand. `side` = +1 right, -1 left. `materials` = [knit, leather, rubber, strap, trim].
 * Returns { root, applyPose(angles), meshes, wrist }. Pose layout (radians): 4 fingers × [mcpFlex, mcpAbd,
 * pipFlex, dipFlex] then thumb [cmcFlex, cmcAbd, mcpFlex, ipFlex] (20 floats).
 */
export function buildHand(side, materials) {
  const root = new THREE.Bone(); // doubles as the skinning bone the sleeve cuff follows
  root.name = side > 0 ? 'HandRight' : 'HandLeft';
  const meshes = [];
  const mk = (geometry, name) => {
    const m = new THREE.Mesh(geometry, materials);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    meshes.push(m);
    return m;
  };

  root.add(mk(buildPalmGeometry(side), 'Palm'));
  root.add(mk(buildCuffGeometry(side), 'Cuff'));

  const fingers = FINGERS.map((f) => {
    const mcp = new THREE.Object3D();
    mcp.name = `${f.name}_mcp`;
    mcp.position.set(f.mcp[0] * side, f.mcp[1], f.mcp[2] + cup(f.mcp[1]));
    mcp.rotation.order = 'ZXY';
    root.add(mcp);
    const pip = new THREE.Object3D();
    pip.name = `${f.name}_pip`;
    pip.position.set(0, f.len[0], 0);
    mcp.add(pip);
    const dip = new THREE.Object3D();
    dip.name = `${f.name}_dip`;
    dip.position.set(0, f.len[1], 0);
    pip.add(dip);
    mcp.add(mk(buildSegmentGeometry({ len: f.len[0], r0: f.r[0], r1: f.r[1], side }), `${f.name}_prox`));
    pip.add(mk(buildSegmentGeometry({ len: f.len[1], r0: f.r[1], r1: f.r[2], side }), `${f.name}_mid`));
    dip.add(mk(buildSegmentGeometry({ len: f.len[2], r0: f.r[2], r1: f.r[2] * 0.93, tip: true, side }), `${f.name}_dist`));
    return { def: f, mcp, pip, dip, len: f.len, r: f.r, splay: THREE.MathUtils.degToRad(f.splay) };
  });

  // Thumb: CMC frame from direction + nail vectors (mirrored for the left hand)
  const cmc = new THREE.Object3D();
  cmc.name = 'thumb_cmc';
  cmc.position.set(THUMB.cmc[0] * side, THUMB.cmc[1], THUMB.cmc[2]);
  const dir = new THREE.Vector3(THUMB.dir[0] * side, THUMB.dir[1], THUMB.dir[2]);
  const nail = new THREE.Vector3(THUMB.nail[0] * side, THUMB.nail[1], THUMB.nail[2]);
  const cmcBase = basisQuat(dir, nail, new THREE.Quaternion());
  cmc.quaternion.copy(cmcBase);
  root.add(cmc);
  const tmcp = new THREE.Object3D();
  tmcp.name = 'thumb_mcp';
  tmcp.position.set(0, THUMB.len[0], 0);
  cmc.add(tmcp);
  const tip = new THREE.Object3D();
  tip.name = 'thumb_ip';
  tip.position.set(0, THUMB.len[1], 0);
  tmcp.add(tip);
  cmc.add(mk(buildSegmentGeometry({ len: THUMB.len[0], r0: THUMB.r[0], r1: THUMB.r[1], base: true, guard: false, side }), 'thumb_meta'));
  tmcp.add(mk(buildSegmentGeometry({ len: THUMB.len[1], r0: THUMB.r[1], r1: THUMB.r[2], side }), 'thumb_prox'));
  tip.add(mk(buildSegmentGeometry({ len: THUMB.len[2], r0: THUMB.r[2], r1: THUMB.r[2] * 0.92, tip: true, side }), 'thumb_dist'));
  const thumb = { cmc, mcp: tmcp, ip: tip, base: cmcBase, len: THUMB.len, r: THUMB.r };

  const applyPose = (a) => {
    for (let i = 0; i < 4; i++) {
      const f = fingers[i];
      const o = i * 4;
      f.mcp.rotation.set(-(a[o] + REST_MCP_TILT), 0, side * (a[o + 1] + f.splay));
      f.pip.rotation.x = -a[o + 2];
      f.dip.rotation.x = -a[o + 3];
    }
    _euler.set(-a[16], 0, side * a[17]);
    _q.setFromEuler(_euler);
    thumb.cmc.quaternion.copy(thumb.base).multiply(_q);
    thumb.mcp.rotation.x = -a[18];
    thumb.ip.rotation.x = -a[19];
  };

  return { root, side, applyPose, meshes, fingers, thumb, wrist: WRIST_LOCAL.clone() };
}
