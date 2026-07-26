import * as THREE from 'three';
import * as G from '../art/geometry.js';
import * as T from '../art/textures.js';
import { mat } from '../art/materials.js';
import { C, shade, mixHex } from '../art/palette.js';
import { reg, OWNERS } from '../core/assets.js';
import { rngFor } from '../core/rng.js';
import {
  HEAD_VARIANTS, HEAD_BY_ID, headMaterial, toneFamily,
  kestrelInsigniaTexture, BALACLAVA_HEX,
} from './faces.js';

export { HEAD_VARIANTS };

/**
 * Character model factory — Northstar Rescue.
 * Owner: Fable 4.
 *
 * SCALE VERIFICATION (reference hostile, height H = 1.82 m, scale s = H/1.82 = 1):
 *   root            y = 0.000   (ground, pivot of the whole character)
 *   hips            y = 0.960
 *   legX.thigh      y = 0.940   (hip ball joints, x = ±0.100)
 *   legX.shin       y = 0.500   (knees;  thigh segment = 0.440)
 *   legX.foot       y = 0.110   (ankles; shin segment  = 0.390; sole reaches 0.000)
 *   spine           y = 1.080
 *   chest           y = 1.300
 *   armX.upper      y = 1.470   (shoulder joints, x = ±0.180; deltoid r 0.055
 *                                → silhouette shoulder width 2×(0.18+0.05) = 0.46 m)
 *   armX.fore       y = 1.170   (elbows;  upper arm = 0.300)
 *   armX.hand       y = 0.910   (wrists;  forearm   = 0.260; fingertips ≈ 0.735)
 *   neck            y = 1.500
 *   head            y = 1.585   (skull base; skull sphere spans 1.605–1.815,
 *                                jaw shell covers 1.592–1.668 → head ≈ 0.23 m tall)
 *   eye line        y ≈ 1.712 = 0.94 × 1.82  (painted at uv.y ≈ 0.52 on the skull)
 *   crown           y ≈ 1.815–1.84 with helmet  → total height 1.82 ± hat
 * All of the above multiply by s for the other heights (1.78–1.86 hostiles,
 * 1.62–1.80 hostages).
 *
 * LOD: every bone carries a THREE.LOD (built with makeLod from geometry.js)
 * holding the detailed shells at distance 0 and a reduced box/low-seg proxy at
 * LOD_SWITCH_DISTANCE = 18 m. Because the LOD lives *inside* each animated
 * bone, distant characters keep animating while rendering ~70% fewer
 * triangles. `buildHostile(id, { lod: 1 })` (or buildHostileLod1) returns the
 * reduced-only build for offline captures and crowd shots.
 *
 * weaponMount is a child of armR.hand, rotated -90° about X so that in the
 * animator's aim pose (shoulder+elbow+wrist pitching exactly 90° forward) the
 * mount's local -Z points along the character's look direction and +Y is up.
 */

export const LOD_SWITCH_DISTANCE = 18;

/* ------------------------------------------------------------------ */
/* Variant catalogues                                                  */
/* ------------------------------------------------------------------ */

/**
 * The Kestrel Group — a fictional private military contractor invented for
 * this project (no real-world or other-game branding). Slate shield insignia
 * with an ice-white kestrel in a stoop over three gold chevrons.
 */
export const HOSTILE_VARIANTS = [
  {
    id: 'kestrel.assault', name: 'Kestrel Group — Assaulter', height: 1.84,
    jacket: C.hostileJacketA, plate: C.hostilePlate, trousers: 0x343a34, gloves: C.hostileGlove,
    gear: ['magPouches', 'radio', 'kneePads', 'holster'],
    helmet: 'ballistic+goggles', masked: false, plateStyle: 'full', head: 'head.aspen',
    description: 'Line contractor: moss-green fatigues, full plate carrier with triple mag pouches, ballistic helmet with goggles, drop-leg holster.',
  },
  {
    id: 'kestrel.heavy', name: 'Kestrel Group — Breacher', height: 1.86,
    jacket: C.hostileJacketC, plate: shade(C.hostilePlate, 0.85), trousers: 0x2c3138, gloves: C.hostileGlove,
    gear: ['magPouches', 'kneePads', 'satchel'],
    helmet: 'heavy', masked: true, plateStyle: 'heavy', head: 'head.cedar',
    description: 'Breacher: charcoal-blue fatigues, oversized plates with groin and shoulder armour, balaclava under a high-cut heavy helmet, demo satchel.',
  },
  {
    id: 'kestrel.scout', name: 'Kestrel Group — Scout', height: 1.80,
    jacket: C.hostileJacketB, plate: 0x2a2e26, trousers: 0x3b352c, gloves: C.hostileGlove,
    gear: ['radio', 'holster'],
    helmet: 'cap', masked: false, plateStyle: 'rig', head: 'head.birch',
    description: 'Scout: earth-brown softshell, low-profile chest rig instead of plates, patrol cap, radio with whip antenna.',
  },
  {
    id: 'kestrel.warden', name: 'Kestrel Group — Warden', height: 1.82,
    jacket: 0x262b33, plate: 0x1f2226, trousers: 0x23272e, gloves: C.hostileGlove,
    gear: ['holster', 'radio'],
    helmet: 'beret', masked: false, plateStyle: 'slick', head: 'head.flint',
    description: 'Site commander: slate-navy uniform, slick armour vest, maroon beret with the Kestrel flash, insignia armband.',
  },
];

export const HOSTAGE_VARIANTS = [
  {
    id: 'analyst', name: 'Hostage — Analyst (business casual)', height: 1.66,
    shirt: C.hostageShirt, trousers: C.hostageTrouser, head: 'head.larch',
    extras: ['lanyard', 'rolledSleeves'], shoe: 0x33302c,
    description: 'Office analyst: pale shirt with rolled sleeves, slate trousers, ID lanyard, flat shoes. Soft rounded silhouette per the visual bible.',
  },
  {
    id: 'executive', name: 'Hostage — Executive (shirt and tie)', height: 1.76,
    shirt: C.hostageShirtB, trousers: 0x2e333a, head: 'head.birch',
    extras: ['tie', 'belt', 'vest'], shoe: 0x1f1c19,
    description: 'Executive: blue-grey shirt, navy tie and suit vest, dark slacks, leather shoes.',
  },
];

const HOSTILE_BY_ID = Object.fromEntries(HOSTILE_VARIANTS.map((v) => [v.id, v]));
const HOSTAGE_BY_ID = Object.fromEntries(HOSTAGE_VARIANTS.map((v) => [v.id, v]));

/* ------------------------------------------------------------------ */
/* Character-local materials                                           */
/* ------------------------------------------------------------------ */

const CMAT = new Map();

function cmat(key, make) {
  let m = CMAT.get(key);
  if (!m) {
    m = make();
    m.name = key;
    CMAT.set(key, m);
  }
  return m;
}

/** Woven fabric tinted per garment — jackets, trousers, shirts. */
function clothMat(hex, coarse = 1) {
  return cmat(`char.cloth.${hex.toString(16)}.${coarse}`, () => {
    const set = T.fabricWeave({ seed: 700 + (hex % 97), color: hex, coarse });
    return new THREE.MeshStandardMaterial({
      map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap,
      normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.93, metalness: 0,
    });
  });
}

/** Armour polymer — plate carriers, helmets, knee pads. */
function armourMat(hex) {
  return cmat(`char.armour.${hex.toString(16)}`, () => {
    const set = T.hardPlasticTex({ seed: 900 + (hex % 89), color: hex });
    return new THREE.MeshStandardMaterial({
      map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap,
      normalScale: new THREE.Vector2(0.45, 0.45), roughness: 0.55, metalness: 0.08,
    });
  });
}

/** Boot / glove leather. */
function leatherMat(hex) {
  return cmat(`char.leather.${hex.toString(16)}`, () => {
    const set = T.leatherGrain({ seed: 800 + (hex % 83), color: hex });
    return new THREE.MeshStandardMaterial({
      map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap,
      normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.55, metalness: 0,
    });
  });
}

function insigniaMat() {
  return cmat('char.insignia', () => new THREE.MeshStandardMaterial({
    map: kestrelInsigniaTexture(), transparent: true, roughness: 0.85, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -1,
  }));
}

function lensMat() {
  return cmat('char.lens', () => new THREE.MeshStandardMaterial({
    color: 0x16232b, roughness: 0.18, metalness: 0.2, envMapIntensity: 1.4,
  }));
}

/* ------------------------------------------------------------------ */
/* Humanoid builder                                                    */
/* ------------------------------------------------------------------ */

const P = (g, m, p, r, s, name) => ({ g, m, p: p ?? undefined, r: r ?? undefined, s: s ?? undefined, name });

/** Hitbox spec in bone-local metres (already scaled by s when emitted). */
function makeHitboxes(rig, s) {
  const mk = (name, bone, he, off, multiplier) => {
    const halfExtents = he.map((v) => v * s);
    const offset = off.map((v) => v * s);
    return {
      name, bone, halfExtents, offset, multiplier,
      box: new THREE.Box3(
        new THREE.Vector3(offset[0] - halfExtents[0], offset[1] - halfExtents[1], offset[2] - halfExtents[2]),
        new THREE.Vector3(offset[0] + halfExtents[0], offset[1] + halfExtents[1], offset[2] + halfExtents[2]),
      ),
    };
  };
  return [
    mk('head', rig.head, [0.10, 0.125, 0.11], [0, 0.115, 0], 4.0),
    mk('chest', rig.chest, [0.19, 0.155, 0.14], [0, 0.06, 0], 1.0),
    mk('stomach', rig.hips, [0.17, 0.135, 0.12], [0, 0.02, 0], 1.25),
    mk('armL', rig.armL.upper, [0.075, 0.30, 0.075], [0, -0.26, 0], 0.75),
    mk('armR', rig.armR.upper, [0.075, 0.30, 0.075], [0, -0.26, 0], 0.75),
    mk('legL', rig.legL.thigh, [0.09, 0.43, 0.09], [0, -0.40, 0], 0.7),
    mk('legR', rig.legR.thigh, [0.09, 0.43, 0.09], [0, -0.40, 0], 0.7),
  ];
}

/**
 * Shared humanoid constructor. `spec`:
 * { name, height, headId, masked, helmet, jacket|shirt, trousers, gloves,
 *   plateStyle, gear[], extras[], shoe, kind:'hostile'|'hostage'|'operator',
 *   headless, hideArms }
 * `opts`: { lod } — lod===1 builds only the reduced shells.
 */
function buildHumanoid(spec, opts = {}) {
  const s = spec.height / 1.82;
  const lodOnly = opts.lod === 1;
  const hostile = spec.kind === 'hostile';
  const gear = spec.gear ?? [];
  const extras = spec.extras ?? [];

  const group = new THREE.Group();
  group.name = spec.name;

  const mkBone = (name, parent, x, y, z) => {
    const b = new THREE.Object3D();
    b.name = name;
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };

  const root = mkBone('root', group, 0, 0, 0);
  const hips = mkBone('hips', root, 0, 0.96 * s, 0);
  const spine = mkBone('spine', hips, 0, 0.12 * s, 0);
  const chest = mkBone('chest', spine, 0, 0.22 * s, 0);
  const neck = mkBone('neck', chest, 0, 0.20 * s, 0);
  const head = mkBone('head', neck, 0, 0.085 * s, 0);
  const mkArm = (sg) => {
    const upper = mkBone(`arm${sg > 0 ? 'R' : 'L'}.upper`, chest, sg * 0.18 * s, 0.17 * s, 0);
    const fore = mkBone(`arm${sg > 0 ? 'R' : 'L'}.fore`, upper, 0, -0.30 * s, 0);
    const hand = mkBone(`arm${sg > 0 ? 'R' : 'L'}.hand`, fore, 0, -0.26 * s, 0);
    return { upper, fore, hand };
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  const mkLeg = (sg) => {
    const thigh = mkBone(`leg${sg > 0 ? 'R' : 'L'}.thigh`, hips, sg * 0.10 * s, -0.02 * s, 0);
    const shin = mkBone(`leg${sg > 0 ? 'R' : 'L'}.shin`, thigh, 0, -0.44 * s, 0);
    const foot = mkBone(`leg${sg > 0 ? 'R' : 'L'}.foot`, shin, 0, -0.39 * s, 0);
    return { thigh, shin, foot };
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);
  const weaponMount = mkBone('weaponMount', armR.hand, 0, -0.07 * s, -0.02 * s);
  weaponMount.rotation.x = -Math.PI / 2; // -Z = aim direction, +Y = up in the aim pose

  const rig = { root, hips, spine, chest, neck, head, armL, armR, legL, legR, weaponMount };

  /* ---- materials ---- */
  const headId = spec.headId;
  const skin = mat(toneFamily(headId));
  const outerHex = spec.jacket ?? spec.shirt;
  const outer = clothMat(outerHex);
  const base = clothMat(spec.shirt ?? shade(spec.jacket, 0.55));
  const trous = clothMat(spec.trousers);
  const plate = armourMat(spec.plate ?? 0x24282c);
  const glove = spec.gloves != null ? leatherMat(spec.gloves) : skin;
  const boot = leatherMat(spec.shoe ?? 0x3b2f22);
  const rubber = mat('rubber.black');
  const metal = mat('metal.blackAnodised');
  // Value plan (visual bible: silhouette first): near-black plate carrier and
  // webbing over a clearly lighter jacket, pouches in a desaturated tan-olive
  // that breaks the torso outline, tan belt line, brown boots against darker
  // trousers. Read order at 8–15 m: head → plate block → pouches → belt → boots.
  const webbing = clothMat(shade(spec.plate ?? 0x24282c, 0.72), 1.4);
  const pouchM = clothMat(mixHex(outerHex ?? 0x4a4a42, 0xb8a878, 0.45), 1.2);
  const beltM = leatherMat(0x54432c);
  const balaclava = clothMat(BALACLAVA_HEX, 0.8);
  const headM = headMaterial(headId, {
    masked: !!spec.masked,
    goggleStrap: spec.helmet === 'ballistic+goggles',
  });
  const materials = {
    skin, outer, base, trousers: trous, plate, glove, boot, rubber, metal,
    head: headM, insignia: insigniaMat(),
  };

  /** Attach a per-bone LOD: hi shells at 0 m, reduced shells at 18 m. */
  const attach = (bone, hiParts, loParts) => {
    const hi = hiParts.filter(Boolean);
    const lo = (loParts ?? []).filter(Boolean);
    if (!hi.length && !lo.length) return;
    if (lodOnly) {
      bone.add(G.buildParts(lo.length ? lo : hi));
      return;
    }
    if (!lo.length) {
      bone.add(G.buildParts(hi));
      return;
    }
    bone.add(G.makeLod([
      { object: G.buildParts(hi), distance: 0 },
      { object: G.buildParts(lo), distance: LOD_SWITCH_DISTANCE },
    ]));
  };

  /* ---- hips / pelvis ---- */
  {
    const hi = [
      P(G.bevelBox(0.32 * s, 0.20 * s, 0.20 * s, 0.02), trous, [0, -0.01 * s, 0]),
    ];
    if (extras.includes('belt') || hostile || spec.kind === 'operator') {
      // Readable belt line: tan leather, bright buckle, keepers and a rear pouch
      hi.push(P(G.bevelBox(0.34 * s, 0.055 * s, 0.22 * s, 0.008), beltM, [0, 0.075 * s, 0]));
      hi.push(P(G.bevelBox(0.052 * s, 0.038 * s, 0.014 * s, 0.004), mat('metal.brushed'), [0, 0.075 * s, -0.112 * s]));
      if (hostile || spec.kind === 'operator') {
        hi.push(P(G.bevelBox(0.02 * s, 0.062 * s, 0.02 * s, 0.005), webbing, [-0.14 * s, 0.075 * s, -0.098 * s]));
        hi.push(P(G.bevelBox(0.02 * s, 0.062 * s, 0.02 * s, 0.005), webbing, [0.14 * s, 0.075 * s, -0.098 * s]));
        hi.push(P(G.bevelBox(0.11 * s, 0.09 * s, 0.05 * s, 0.012), pouchM, [0, 0.03 * s, 0.125 * s]));
      }
    }
    if (spec.plateStyle === 'heavy') {
      // Groin plate hanging from the carrier
      hi.push(P(G.bevelBox(0.16 * s, 0.13 * s, 0.03 * s, 0.012), plate, [0, -0.02 * s, -0.115 * s], [0.12, 0, 0]));
    }
    if (gear.includes('satchel')) {
      hi.push(P(G.bevelBox(0.20 * s, 0.16 * s, 0.09 * s, 0.02), clothMat(0x33362e, 1.5), [0, 0.0, 0.15 * s], [-0.1, 0, 0]));
      hi.push(P(G.bevelBox(0.19 * s, 0.05 * s, 0.02 * s, 0.008), webbing, [0, 0.06 * s, 0.195 * s]));
    }
    attach(hips, hi, [P(G.box(0.32 * s, 0.22 * s, 0.20 * s), trous, [0, 0.0, 0])]);
  }

  /* ---- spine / stomach ---- */
  {
    const hi = [
      P(G.bevelBox(0.30 * s, 0.20 * s, 0.185 * s, 0.03), base, [0, 0.03 * s, 0]),
    ];
    if (spec.jacket != null) {
      // Jacket hem — a separate, slightly larger shell than the torso
      hi.push(P(G.bevelBox(0.345 * s, 0.21 * s, 0.22 * s, 0.03), outer, [0, 0.025 * s, 0]));
    } else if (extras.includes('vest')) {
      hi.push(P(G.bevelBox(0.335 * s, 0.20 * s, 0.212 * s, 0.03), clothMat(0x2b3038), [0, 0.03 * s, 0]));
    }
    attach(spine, hi, [P(G.box(0.31 * s, 0.22 * s, 0.20 * s), spec.jacket != null ? outer : base, [0, 0.03 * s, 0])]);
  }

  /* ---- chest / torso layers ---- */
  {
    const hi = [
      P(G.bevelBox(0.33 * s, 0.31 * s, 0.195 * s, 0.04), base, [0, 0.055 * s, 0]),
      P(G.cyl(0.072 * s, 0.082 * s, 0.05 * s, 12), spec.masked ? balaclava : (spec.jacket != null ? outer : base), [0, 0.205 * s, 0]),
    ];
    if (spec.jacket != null) {
      hi.push(P(G.bevelBox(0.355 * s, 0.335 * s, 0.225 * s, 0.045), outer, [0, 0.05 * s, 0]));
    } else if (extras.includes('vest')) {
      hi.push(P(G.bevelBox(0.345 * s, 0.325 * s, 0.215 * s, 0.045), clothMat(0x2b3038), [0, 0.05 * s, 0]));
    }
    if (extras.includes('tie')) {
      hi.push(P(G.bevelBox(0.05 * s, 0.04 * s, 0.02 * s, 0.008), clothMat(0x35415e), [0, 0.165 * s, -0.102 * s]));
      hi.push(P(G.bevelBox(0.045 * s, 0.20 * s, 0.012 * s, 0.005), clothMat(0x35415e), [0, 0.045 * s, -0.112 * s], [0.05, 0, 0]));
    }
    if (extras.includes('lanyard')) {
      hi.push(P(G.bevelBox(0.012 * s, 0.16 * s, 0.006 * s, 0.002), clothMat(0x1f6fb2), [-0.05 * s, 0.12 * s, -0.105 * s], [0, 0, 0.32]));
      hi.push(P(G.bevelBox(0.012 * s, 0.16 * s, 0.006 * s, 0.002), clothMat(0x1f6fb2), [0.05 * s, 0.12 * s, -0.105 * s], [0, 0, -0.32]));
      hi.push(P(G.bevelBox(0.052 * s, 0.075 * s, 0.006 * s, 0.002), mat('plastic.white'), [0, 0.015 * s, -0.115 * s]));
    }
    /* Plate carrier — a second angular shell over the jacket */
    const ps = spec.plateStyle;
    if (ps === 'full' || ps === 'heavy') {
      const pw = ps === 'heavy' ? 0.30 : 0.28;
      const ph = ps === 'heavy' ? 0.28 : 0.25;
      hi.push(P(G.bevelBox(pw * s, ph * s, 0.036 * s, 0.012), plate, [0, 0.045 * s, -0.13 * s]));
      hi.push(P(G.bevelBox(pw * s, ph * s, 0.036 * s, 0.012), plate, [0, 0.045 * s, 0.13 * s]));
      // Shoulder straps
      hi.push(P(G.bevelBox(0.06 * s, 0.028 * s, 0.24 * s, 0.008), webbing, [-0.095 * s, 0.198 * s, 0]));
      hi.push(P(G.bevelBox(0.06 * s, 0.028 * s, 0.24 * s, 0.008), webbing, [0.095 * s, 0.198 * s, 0]));
      // Cummerbund sides
      hi.push(P(G.bevelBox(0.048 * s, 0.16 * s, 0.20 * s, 0.012), webbing, [-0.168 * s, 0.01 * s, 0]));
      hi.push(P(G.bevelBox(0.048 * s, 0.16 * s, 0.20 * s, 0.012), webbing, [0.168 * s, 0.01 * s, 0]));
      if (gear.includes('magPouches')) {
        // Lighter tan-olive pouches deliberately break the dark torso block
        for (const px of [-0.085, 0, 0.085]) {
          hi.push(P(G.bevelBox(0.074 * s, 0.135 * s, 0.058 * s, 0.012), pouchM, [px * s, -0.035 * s, -0.172 * s]));
          hi.push(P(G.bevelBox(0.062 * s, 0.024 * s, 0.052 * s, 0.006), rubber, [px * s, 0.038 * s, -0.174 * s]));
        }
        // Admin pouch high on the plate
        hi.push(P(G.bevelBox(0.12 * s, 0.06 * s, 0.03 * s, 0.01), pouchM, [-0.06 * s, 0.13 * s, -0.155 * s]));
      }
      // Kestrel patch on the right chest (character's right = +X)
      hi.push(P(G.plane(0.07 * s, 0.07 * s), materials.insignia, [0.088 * s, 0.135 * s, -0.152 * s], [0, Math.PI, 0]));
    } else if (ps === 'rig') {
      // Low-profile chest rig: crossed straps + tan pouch row over the jacket
      hi.push(P(G.bevelBox(0.045 * s, 0.30 * s, 0.016 * s, 0.006), webbing, [-0.07 * s, 0.10 * s, -0.118 * s], [0, 0, 0.45]));
      hi.push(P(G.bevelBox(0.045 * s, 0.30 * s, 0.016 * s, 0.006), webbing, [0.07 * s, 0.10 * s, -0.118 * s], [0, 0, -0.45]));
      hi.push(P(G.bevelBox(0.21 * s, 0.11 * s, 0.06 * s, 0.012), pouchM, [0, -0.03 * s, -0.145 * s]));
      hi.push(P(G.bevelBox(0.06 * s, 0.026 * s, 0.05 * s, 0.006), rubber, [-0.065 * s, 0.035 * s, -0.15 * s]));
      hi.push(P(G.bevelBox(0.06 * s, 0.026 * s, 0.05 * s, 0.006), rubber, [0.065 * s, 0.035 * s, -0.15 * s]));
      hi.push(P(G.plane(0.065 * s, 0.065 * s), materials.insignia, [0.0, 0.115 * s, -0.134 * s], [0, Math.PI, 0]));
    } else if (ps === 'slick') {
      hi.push(P(G.bevelBox(0.27 * s, 0.24 * s, 0.028 * s, 0.01), plate, [0, 0.05 * s, -0.124 * s]));
      hi.push(P(G.bevelBox(0.27 * s, 0.24 * s, 0.028 * s, 0.01), plate, [0, 0.05 * s, 0.124 * s]));
      hi.push(P(G.bevelBox(0.055 * s, 0.026 * s, 0.22 * s, 0.008), webbing, [-0.09 * s, 0.192 * s, 0]));
      hi.push(P(G.bevelBox(0.055 * s, 0.026 * s, 0.22 * s, 0.008), webbing, [0.09 * s, 0.192 * s, 0]));
      hi.push(P(G.plane(0.07 * s, 0.07 * s), materials.insignia, [0.085 * s, 0.12 * s, -0.14 * s], [0, Math.PI, 0]));
    }
    if (gear.includes('radio')) {
      // Radio brick on the left shoulder strap, whip antenna, shoulder mic + coiled cord
      hi.push(P(G.bevelBox(0.04 * s, 0.10 * s, 0.036 * s, 0.008), mat('plastic.dark'), [-0.15 * s, 0.15 * s, -0.078 * s]));
      hi.push(P(G.cyl(0.0055 * s, 0.0045 * s, 0.24 * s, 6), rubber, [-0.152 * s, 0.315 * s, -0.068 * s], [0, 0, 0.08]));
      hi.push(P(G.sphere(0.008, 6, 5), rubber, [-0.163 * s, 0.435 * s, -0.068 * s], null, [s, s, s]));
      hi.push(P(G.bevelBox(0.03 * s, 0.045 * s, 0.024 * s, 0.006), mat('plastic.dark'), [0.10 * s, 0.20 * s, -0.115 * s], [0.3, 0, 0]));
      hi.push(P(G.torus(0.05 * s, 0.005 * s, 5, 12, Math.PI * 1.2), rubber, [0.045 * s, 0.175 * s, -0.125 * s], [0.2, 0, 2.4]));
    }
    const loM = spec.jacket != null ? outer : base;
    attach(chest, hi, [
      P(G.box(0.36 * s, 0.35 * s, 0.23 * s), loM, [0, 0.05 * s, 0]),
      (ps && ps !== 'rig') ? P(G.box(0.28 * s, 0.25 * s, 0.03 * s), plate, [0, 0.05 * s, -0.13 * s]) : null,
    ]);
  }

  /* ---- neck & head ---- */
  if (!spec.headless) {
    attach(neck, [
      P(G.cyl(0.052 * s, 0.058 * s, 0.10 * s, 10), spec.masked ? balaclava : skin, [0, 0.045 * s, 0]),
    ], [P(G.cyl(0.055 * s, 0.055 * s, 0.10 * s, 6), spec.masked ? balaclava : skin, [0, 0.045 * s, 0])]);

    const hi = [
      // Skull — UV sphere carrying the painted face (u=0.75 faces -Z)
      P(G.sphere(0.5, 24, 18), headM, [0, 0.125 * s, 0], null, [0.156 * s, 0.21 * s, 0.176 * s], 'skull'),
      P(G.bevelBox(0.105 * s, 0.075 * s, 0.10 * s, 0.028), spec.masked ? balaclava : skin, [0, 0.045 * s, -0.018 * s], null, null, 'jaw'),
      P(G.bevelBox(0.028 * s, 0.042 * s, 0.032 * s, 0.01), spec.masked ? balaclava : skin, [0, 0.115 * s, -0.088 * s], null, null, 'nose'),
    ];
    if (!spec.masked) {
      hi.push(P(G.sphere(0.021, 8, 6), skin, [-0.077 * s, 0.115 * s, 0.006 * s], null, [s, 1.3 * s, 0.7 * s]));
      hi.push(P(G.sphere(0.021, 8, 6), skin, [0.077 * s, 0.115 * s, 0.006 * s], null, [s, 1.3 * s, 0.7 * s]));
    }
    switch (spec.helmet) {
      case 'ballistic+goggles':
      case 'ballistic': {
        const shellM = armourMat(0x2c3128);
        hi.push(P(G.sphere(0.5, 20, 14), shellM, [0, 0.175 * s, 0.004 * s], null, [0.20 * s, 0.155 * s, 0.21 * s]));
        // Pale counterweight band: high-contrast profile accent at distance
        hi.push(P(G.torus(0.098 * s, 0.012 * s, 6, 20), clothMat(0x8e9a94, 1.3), [0, 0.145 * s, 0.004 * s], [Math.PI / 2, 0, 0]));
        hi.push(P(G.bevelBox(0.09 * s, 0.045 * s, 0.03 * s, 0.01), pouchM, [0, 0.17 * s, 0.098 * s]));
        hi.push(P(G.bevelBox(0.036 * s, 0.045 * s, 0.02 * s, 0.006), mat('plastic.dark'), [0, 0.185 * s, -0.102 * s]));
        hi.push(P(G.bevelBox(0.012 * s, 0.02 * s, 0.115 * s, 0.004), metal, [-0.10 * s, 0.16 * s, -0.005 * s]));
        hi.push(P(G.bevelBox(0.012 * s, 0.02 * s, 0.115 * s, 0.004), metal, [0.10 * s, 0.16 * s, -0.005 * s]));
        if (spec.helmet === 'ballistic+goggles') {
          hi.push(P(G.bevelBox(0.125 * s, 0.045 * s, 0.032 * s, 0.014), rubber, [0, 0.155 * s, -0.096 * s]));
          hi.push(P(G.bevelBox(0.112 * s, 0.032 * s, 0.026 * s, 0.01), lensMat(), [0, 0.155 * s, -0.103 * s]));
        }
        break;
      }
      case 'heavy': {
        const shellM = armourMat(0x24282e);
        hi.push(P(G.sphere(0.5, 20, 14), shellM, [0, 0.17 * s, 0.006 * s], null, [0.215 * s, 0.17 * s, 0.225 * s]));
        // Pale cat-eye band so the heavy's near-black head still has a profile
        hi.push(P(G.torus(0.107 * s, 0.011 * s, 6, 20), clothMat(0x8e9a94, 1.3), [0, 0.155 * s, 0.006 * s], [Math.PI / 2, 0, 0]));
        hi.push(P(G.bevelBox(0.19 * s, 0.032 * s, 0.045 * s, 0.01), shellM, [0, 0.17 * s, -0.098 * s]));
        hi.push(P(G.bevelBox(0.032 * s, 0.095 * s, 0.10 * s, 0.012), shellM, [-0.102 * s, 0.09 * s, 0.006 * s]));
        hi.push(P(G.bevelBox(0.032 * s, 0.095 * s, 0.10 * s, 0.012), shellM, [0.102 * s, 0.09 * s, 0.006 * s]));
        hi.push(P(G.bevelBox(0.13 * s, 0.06 * s, 0.02 * s, 0.008), shellM, [0, 0.075 * s, 0.108 * s], [0.3, 0, 0]));
        break;
      }
      case 'cap': {
        const capM = clothMat(shade(outerHex, 0.72));
        hi.push(P(G.sphere(0.5, 16, 10), capM, [0, 0.16 * s, 0.004 * s], null, [0.172 * s, 0.10 * s, 0.186 * s]));
        hi.push(P(G.bevelBox(0.13 * s, 0.012 * s, 0.075 * s, 0.005), capM, [0, 0.138 * s, -0.118 * s], [0.12, 0, 0]));
        // Pale front patch keeps the cap readable against dark interiors
        hi.push(P(G.bevelBox(0.05 * s, 0.032 * s, 0.006 * s, 0.003), clothMat(0x8e9a94, 1.3), [0, 0.175 * s, -0.085 * s], [0.35, 0, 0]));
        break;
      }
      case 'beret': {
        const berM = clothMat(0x5a2430);
        hi.push(P(G.sphere(0.5, 16, 10), berM, [0.02 * s, 0.185 * s, 0], [0, 0, -0.16], [0.195 * s, 0.075 * s, 0.19 * s]));
        hi.push(P(G.cyl(0.086 * s, 0.09 * s, 0.02 * s, 14), berM, [0, 0.158 * s, 0]));
        hi.push(P(G.plane(0.035 * s, 0.035 * s), materials.insignia, [-0.055 * s, 0.185 * s, -0.065 * s], [-0.35, Math.PI + 0.6, 0]));
        break;
      }
      default:
        break;
    }
    attach(head, hi, [
      P(G.box(0.16 * s, 0.22 * s, 0.18 * s), headM, [0, 0.115 * s, 0]),
      spec.helmet && spec.helmet !== 'beret' && spec.helmet !== 'cap'
        ? P(G.box(0.19 * s, 0.10 * s, 0.20 * s), armourMat(0x2c3128), [0, 0.20 * s, 0]) : null,
    ]);
  }

  /* ---- arms ---- */
  const rolled = extras.includes('rolledSleeves');
  for (const [sg, arm] of [[-1, armL], [1, armR]]) {
    const sleeveM = spec.jacket != null ? outer : base;
    const upHi = [
      P(G.sphere(0.055, 14, 10), sleeveM, [0, -0.01 * s, 0], null, [s, 1.15 * s, s]),
      P(G.capsule(0.048 * s, 0.19 * s, 4, 12), sleeveM, [0, -0.15 * s, 0]),
    ];
    if (hostile) {
      // Shoulder pad (plate colour) + rolled-sleeve ridge: secondary shapes
      // that break the arm silhouette at 8–15 m
      if (spec.plateStyle === 'heavy' || spec.plateStyle === 'full') {
        upHi.push(P(G.bevelBox(0.095 * s, 0.05 * s, 0.135 * s, 0.014), plate, [sg * 0.022 * s, 0.008 * s, 0]));
      } else {
        upHi.push(P(G.torus(0.052 * s, 0.011 * s, 6, 12), clothMat(shade(outerHex, 1.35)), [0, -0.055 * s, 0], [Math.PI / 2, 0, 0]));
      }
      upHi.push(P(G.torus(0.05 * s, 0.012 * s, 6, 12), clothMat(shade(outerHex, 1.3)), [0, -0.235 * s, 0], [Math.PI / 2, 0, 0], null, 'sleeveRoll'));
    }
    if (hostile && sg < 0) {
      // Kestrel armband on the left upper arm — small high-contrast accent
      upHi.push(P(G.cyl(0.064 * s, 0.064 * s, 0.07 * s, 12), clothMat(0x243447), [0, -0.115 * s, 0]));
      upHi.push(P(G.plane(0.06 * s, 0.06 * s), materials.insignia, [-0.0675 * s, -0.115 * s, 0], [0, -Math.PI / 2, 0]));
    }
    attach(arm.upper, upHi, [P(G.box(0.10 * s, 0.31 * s, 0.10 * s), sleeveM, [0, -0.14 * s, 0])]);

    const foreM = rolled ? skin : sleeveM;
    const foreHi = [
      P(G.sphere(0.047, 12, 8), sleeveM, [0, 0, 0], null, [s, s, s]),
      P(G.capsule(0.042 * s, 0.15 * s, 4, 12), foreM, [0, -0.115 * s, 0]),
    ];
    if (rolled) {
      foreHi.push(P(G.cyl(0.052 * s, 0.055 * s, 0.05 * s, 10), sleeveM, [0, -0.045 * s, 0]));
    }
    foreHi.push(P(G.cyl(0.046 * s, 0.05 * s, 0.055 * s, 10), spec.gloves != null ? glove : foreM, [0, -0.232 * s, 0]));
    attach(arm.fore, foreHi, [P(G.box(0.085 * s, 0.28 * s, 0.085 * s), foreM, [0, -0.125 * s, 0])]);

    const handM = spec.gloves != null ? glove : skin;
    const handHi = [
      P(G.bevelBox(0.072 * s, 0.09 * s, 0.045 * s, 0.016), handM, [0, -0.045 * s, -0.004 * s]),
      P(G.bevelBox(0.066 * s, 0.07 * s, 0.04 * s, 0.015), handM, [0, -0.115 * s, -0.012 * s], [0.25, 0, 0]),
      P(G.bevelBox(0.026 * s, 0.062 * s, 0.028 * s, 0.01), handM, [sg * -0.036 * s, -0.05 * s, -0.022 * s], [0.4, 0, sg * 0.5]),
    ];
    if (spec.gloves != null) {
      handHi.push(P(G.bevelBox(0.014 * s, 0.05 * s, 0.04 * s, 0.006), armourMat(0x1f2226), [sg * 0.041 * s, -0.05 * s, -0.002 * s]));
    }
    attach(arm.hand, handHi, [P(G.box(0.07 * s, 0.16 * s, 0.05 * s), handM, [0, -0.08 * s, 0])]);
  }
  if (spec.hideArms) {
    // First-person body: strip the arm meshes so the FP arms overlay owns them
    for (const arm of [armL, armR]) {
      for (const b of [arm.upper, arm.fore, arm.hand]) {
        for (const child of b.children.slice()) {
          if (child.isMesh || child.isGroup || child.isLOD) b.remove(child);
        }
      }
    }
  }

  /* ---- legs ---- */
  const combatBoot = spec.kind !== 'hostage';
  for (const [sg, leg] of [[-1, legL], [1, legR]]) {
    const thighHi = [
      P(G.sphere(0.075, 12, 10), trous, [0, -0.015 * s, 0], null, [s, s, s]),
      P(G.capsule(0.068 * s, 0.27 * s, 4, 12), trous, [0, -0.19 * s, 0]),
    ];
    if (hostile) {
      thighHi.push(P(G.bevelBox(0.02 * s, 0.11 * s, 0.09 * s, 0.008), clothMat(shade(spec.trousers, 1.4)), [sg * 0.072 * s, -0.235 * s, 0]));
    }
    if (gear.includes('holster') && sg > 0) {
      thighHi.push(P(G.bevelBox(0.038 * s, 0.15 * s, 0.07 * s, 0.012), mat('plastic.dark'), [0.082 * s, -0.26 * s, -0.012 * s]));
      thighHi.push(P(G.cyl(0.072 * s, 0.072 * s, 0.02 * s, 10, true), webbing, [0, -0.31 * s, 0]));
    }
    attach(leg.thigh, thighHi, [P(G.box(0.145 * s, 0.45 * s, 0.145 * s), trous, [0, -0.21 * s, 0])]);

    const shinHi = [
      P(G.sphere(0.06, 12, 10), trous, [0, -0.005 * s, 0], null, [s, s, s]),
      P(G.capsule(0.056 * s, 0.22 * s, 4, 12), trous, [0, -0.155 * s, 0]),
    ];
    if (gear.includes('kneePads')) {
      shinHi.push(P(G.bevelBox(0.09 * s, 0.10 * s, 0.05 * s, 0.022), armourMat(0x3d4248), [0, -0.02 * s, -0.052 * s]));
      shinHi.push(P(G.bevelBox(0.095 * s, 0.022 * s, 0.012 * s, 0.005), webbing, [0, -0.075 * s, 0.055 * s]));
    }
    if (combatBoot) {
      shinHi.push(P(G.cyl(0.06 * s, 0.068 * s, 0.13 * s, 12), boot, [0, -0.325 * s, 0]));
    }
    attach(leg.shin, shinHi, [P(G.box(0.12 * s, 0.42 * s, 0.12 * s), trous, [0, -0.19 * s, 0])]);

    const footHi = combatBoot ? [
      P(G.bevelBox(0.10 * s, 0.08 * s, 0.25 * s, 0.025), boot, [0, -0.055 * s, -0.045 * s]),
      P(G.bevelBox(0.095 * s, 0.055 * s, 0.06 * s, 0.02), rubber, [0, -0.068 * s, -0.155 * s]),
      P(G.bevelBox(0.105 * s, 0.03 * s, 0.27 * s, 0.008), rubber, [0, -0.095 * s, -0.045 * s]),
      P(G.bevelBox(0.088 * s, 0.07 * s, 0.05 * s, 0.015), boot, [0, -0.05 * s, 0.062 * s]),
      P(G.bevelBox(0.06 * s, 0.008 * s, 0.05 * s, 0.003), rubber, [0, -0.026 * s, -0.085 * s], [0.55, 0, 0]),
    ] : [
      P(G.bevelBox(0.088 * s, 0.06 * s, 0.235 * s, 0.02), boot, [0, -0.065 * s, -0.04 * s]),
      P(G.bevelBox(0.092 * s, 0.02 * s, 0.245 * s, 0.006), rubber, [0, -0.10 * s, -0.04 * s]),
    ];
    attach(leg.foot, footHi, [P(G.box(0.10 * s, 0.11 * s, 0.26 * s), boot, [0, -0.055 * s, -0.045 * s])]);
  }

  return { group, rig, materials, s };
}

/* ------------------------------------------------------------------ */
/* Public builders                                                     */
/* ------------------------------------------------------------------ */

/**
 * Build a Kestrel Group hostile.
 * opts: { seed, head: headVariantId, lod: 0|1 }
 * Returns { group, rig, hitboxes, height, materials }.
 */
export function buildHostile(variantId, opts = {}) {
  const v = HOSTILE_BY_ID[variantId] ?? HOSTILE_VARIANTS[0];
  const rng = rngFor(`${v.id}:${opts.seed ?? 0}`);
  const headId = opts.head ?? (opts.seed != null ? rng.pick(HEAD_VARIANTS).id : v.head);
  const built = buildHumanoid({
    kind: 'hostile',
    name: v.name,
    height: v.height,
    headId,
    masked: v.masked,
    helmet: v.helmet,
    // Lift the jacket value so the near-black plate carrier separates cleanly;
    // drop the trousers so the torso/leg boundary reads at gameplay distance.
    jacket: shade(v.jacket, 1.32),
    shirt: shade(v.jacket, 0.6),
    trousers: shade(v.trousers, 0.78),
    gloves: v.gloves,
    plate: v.plate,
    plateStyle: v.plateStyle,
    gear: v.gear,
  }, opts);
  const hitboxes = makeHitboxes(built.rig, built.s);
  built.group.name = `char.${v.id}`;
  return { group: built.group, rig: built.rig, hitboxes, height: v.height, materials: built.materials };
}

/** Reduced-detail build (the same shells the 18 m LOD switch uses). */
export function buildHostileLod1(variantId, opts = {}) {
  return buildHostile(variantId, { ...opts, lod: 1 });
}

/**
 * Build a hostage. Variant ids match layout.js HOSTAGE_SPOTS ('analyst',
 * 'executive'). Returns { group, rig, hitboxes, height, materials }.
 */
export function buildHostage(variantId, opts = {}) {
  const v = HOSTAGE_BY_ID[variantId] ?? HOSTAGE_VARIANTS[0];
  const headId = opts.head ?? v.head;
  const built = buildHumanoid({
    kind: 'hostage',
    name: v.name,
    height: v.height,
    headId,
    masked: false,
    helmet: null,
    jacket: null,
    shirt: v.shirt,
    trousers: v.trousers,
    gloves: null,
    plate: null,
    plateStyle: null,
    gear: [],
    extras: v.extras,
    shoe: v.shoe,
  }, opts);
  const hitboxes = makeHitboxes(built.rig, built.s);
  built.group.name = `char.hostage.${v.id}`;
  return { group: built.group, rig: built.rig, hitboxes, height: v.height, materials: built.materials };
}

/**
 * First-person operator arms.
 *
 * Authored at real scale around the origin for the 65° vertical-FOV overlay
 * camera looking down -Z, WITH the lead's integration offset
 * `viewModel.root.position = (0, 0.155, 0.02)` in mind (keep it): with that
 * offset the weapon bore sits ≈ 22° below the camera axis and the arms fill
 * the lower-right third of the frame.
 *
 * Layout (arms-local, before the integration offset):
 *   shoulders            (±0.21, -0.35, +0.30)   — behind the camera
 *   right palm / mount   (0.115, -0.315, -0.345) — weapon grip origin
 *   left palm (default)  (0.105, -0.362, -0.475) — under the rifle handguard
 * Limbs are view-model-elongated (upper 0.42 m, forearm 0.44 m) so the left
 * hand genuinely REACHES the handguard — both arms are placed with a two-bone
 * analytic IK solve, not aimed-and-hoped.
 *
 * `result.setSupportTarget(vec3)` re-solves the left arm so the palm cups a
 * different point (arms-local space, e.g. a specific weapon's foregrip);
 * fingers stay wrapped because the palm basis is preserved.
 *
 * weaponMount sits in the right palm with world-identity orientation at bind
 * (-Z forward, +Y up). Returns { group, rig, bones, materials,
 * setSupportTarget } — `bones` aliases `rig`.
 */
export function buildOperatorArms(opts = {}) {
  const tone = opts.skinTone ?? 'a';
  const skin = mat(`skin.${tone}`);
  // The overlay key light is top-down and the hemisphere ground is near-black,
  // so camera-facing arm undersides are carried by albedo alone: coyote-brown
  // gloves and a lifted fatigue tone keep sleeve/glove/weapon separated
  // instead of mushing into one silhouette. Grain normals softened for meshes
  // 0.3–0.6 m from the camera.
  const glove = leatherMat(0x5c5142);
  glove.normalScale.set(0.3, 0.3);
  const fatigue = clothMat(shade(C.operatorFatigue, 1.6));
  const knuckle = armourMat(0x1f2226);
  const rubber = mat('rubber.black');
  const metal = mat('metal.brushed');

  const UPPER_LEN = 0.44; // view-model elongated so the support hand reaches
  const FORE_LEN = 0.46;
  const PALM_DEPTH = 0.045; // wrist → palm centre along the hand's -Y

  const group = new THREE.Group();
  group.name = 'char.operator.arms';

  const root = new THREE.Object3D();
  root.name = 'root';
  group.add(root);
  const sway = new THREE.Object3D(); // rig.hips — the animator's bob/sway pivot
  sway.name = 'hips';
  root.add(sway);
  const stub = (name, parent, y = -0.35, z = 0.4) => {
    const b = new THREE.Object3D();
    b.name = name;
    b.position.set(0, y, z);
    parent.add(b);
    return b;
  };
  const spine = stub('spine', sway);
  const chest = stub('chest', spine, 0.0, 0.0);
  const neck = stub('neck', chest, 0.15, 0);
  const head = stub('head', neck, 0.05, 0);
  const legL = { thigh: stub('legL.thigh', sway, -0.5, 0), shin: null, foot: null };
  legL.shin = stub('legL.shin', legL.thigh, -0.4, 0);
  legL.foot = stub('legL.foot', legL.shin, -0.4, 0);
  const legR = { thigh: stub('legR.thigh', sway, -0.5, 0), shin: null, foot: null };
  legR.shin = stub('legR.shin', legR.thigh, -0.4, 0);
  legR.foot = stub('legR.foot', legR.shin, -0.4, 0);

  const DOWN = new THREE.Vector3(0, -1, 0);
  const quatFromDir = (dir) => new THREE.Quaternion().setFromUnitVectors(DOWN, dir.clone().normalize());
  /** World-space orthonormal hand basis: local -Y = finger direction, local -Z = palm normal. */
  const palmBasis = (fingerDir, palmNormal) => {
    const y = fingerDir.clone().normalize().negate();
    const z = palmNormal.clone().normalize().negate();
    z.addScaledVector(y, -z.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };

  /**
   * Two-bone analytic IK: shoulder S (fixed) → wrist target, elbow bent
   * toward `pole`. Writes upper/fore quaternions; returns the achieved wrist.
   */
  const solveArm = (arm, S, wristTarget, pole) => {
    const a = UPPER_LEN;
    const b = FORE_LEN;
    const toT = wristTarget.clone().sub(S);
    const d = THREE.MathUtils.clamp(toT.length(), 0.2, a + b - 0.012);
    const n = toT.clone().normalize();
    const cosA = THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const side = pole.clone().addScaledVector(n, -pole.dot(n));
    if (side.lengthSq() < 1e-8) side.set(0, -1, 0.2).addScaledVector(n, -n.dot(side));
    side.normalize();
    const E = S.clone().addScaledVector(n, a * cosA).addScaledVector(side, a * sinA);
    const W = E.clone().add(wristTarget.clone().sub(E).normalize().multiplyScalar(b));
    const q0 = quatFromDir(E.clone().sub(S));
    arm.upper.quaternion.copy(q0);
    const q1 = quatFromDir(W.clone().sub(E));
    arm.fore.quaternion.copy(q0.clone().invert().multiply(q1));
    return { wrist: W, elbow: E, foreWorldQuat: q1 };
  };

  const buildFinger = (hand, x, z, curl0, curl1, r, lens) => {
    const g0 = new THREE.Object3D();
    g0.position.set(x, -0.078, z);
    g0.rotation.x = curl0;
    hand.add(g0);
    g0.add(G.buildParts([P(G.capsule(r, lens[0], 3, 8), glove, [0, -lens[0] / 2 - r * 0.4, 0])]));
    const g1 = new THREE.Object3D();
    g1.position.set(0, -lens[0] - r, 0);
    g1.rotation.x = curl1;
    g0.add(g1);
    g1.add(G.buildParts([P(G.capsule(r * 0.92, lens[1], 3, 8), glove, [0, -lens[1] / 2 - r * 0.3, 0])]));
    return g0;
  };

  const buildSide = (sg) => {
    const upper = new THREE.Object3D();
    upper.name = `arm${sg > 0 ? 'R' : 'L'}.upper`;
    upper.position.set(sg * 0.21, sg > 0 ? -0.35 : -0.345, sg > 0 ? 0.30 : 0.27);
    sway.add(upper);
    const fore = new THREE.Object3D();
    fore.name = `arm${sg > 0 ? 'R' : 'L'}.fore`;
    fore.position.set(0, -UPPER_LEN, 0);
    upper.add(fore);
    const hand = new THREE.Object3D();
    hand.name = `arm${sg > 0 ? 'R' : 'L'}.hand`;
    hand.position.set(0, -FORE_LEN, 0);
    fore.add(hand);

    /* ---- meshes ---- */
    // Upper arm sleeve (mostly out of frame)
    upper.add(G.buildParts([
      P(G.capsule(0.058, UPPER_LEN * 0.72, 4, 12), fatigue, [0, -UPPER_LEN * 0.52, 0]),
    ]));
    // Forearm, elbow → wrist: fatigue sleeve down to a rolled cuff that stays
    // INSIDE the 65° frame at rest, then a ~2 cm skin window (the left wears
    // the watch there), then a strapped glove cuff to the wrist.
    const b = FORE_LEN;
    const foreParts = [
      P(G.sphere(0.054, 12, 10), fatigue, [0, 0, 0]), // elbow — no joint gap
      P(G.capsule(0.052, 0.24, 4, 12), fatigue, [0, -0.155, 0], null, null, 'sleeve'),
      P(G.cyl(0.06, 0.066, 0.06, 12), fatigue, [0, -0.325, 0], null, null, 'rolledCuff'),
      P(G.torus(0.062, 0.013, 6, 14), fatigue, [0, -0.354, 0], [Math.PI / 2, 0, 0], null, 'cuffRoll'),
      P(G.capsule(0.0435, 0.02, 4, 12), skin, [0, -0.373, 0], null, null, 'skinWindow'),
      P(G.cyl(0.0445, 0.049, 0.075, 12), glove, [0, -0.4125, 0], null, null, 'gloveCuff'),
      P(G.bevelBox(0.022, 0.04, 0.014, 0.004), glove, [sg * 0.042, -0.41, 0], null, null, 'cuffStrap'),
    ];
    fore.add(G.buildParts(foreParts));
    let watch = null;
    if (sg < 0) {
      // Watch on the skin window of the left wrist; the face group is rotated
      // toward the camera after the IK solve.
      watch = new THREE.Object3D();
      watch.name = 'watch';
      watch.position.set(0, -0.368, 0);
      fore.add(watch);
      watch.add(G.buildParts([
        P(G.cyl(0.047, 0.047, 0.022, 14), rubber, [0, 0, 0], null, null, 'watchStrap'),
        P(G.cyl(0.019, 0.019, 0.01, 12), metal, [0, 0, 0.045], [Math.PI / 2, 0, 0], null, 'watchBody'),
        P(G.cyl(0.0145, 0.0145, 0.004, 12), lensMat(), [0, 0, 0.052], [Math.PI / 2, 0, 0], null, 'watchFace'),
      ]));
    }

    // Hand: wrist ball + palm + knuckle plate + articulated fingers
    hand.add(G.buildParts([
      P(G.sphere(0.042, 10, 8), glove, [0, -0.005, 0]), // wrist — no joint gap
      P(G.bevelBox(0.084, 0.082, 0.034, 0.014), glove, [0, -0.042, 0]),
      P(G.bevelBox(0.058, 0.024, 0.038, 0.009), knuckle, [0, -0.066, 0.022], [-0.15, 0, 0], null, 'knucklePlate'),
      P(G.sphere(0.0095, 6, 5), knuckle, [-0.021, -0.078, 0.019]),
      P(G.sphere(0.0095, 6, 5), knuckle, [0, -0.08, 0.019]),
      P(G.sphere(0.0095, 6, 5), knuckle, [0.021, -0.078, 0.019]),
    ]));
    // Right hand strangles the grip; left fingers wrap the 2.5 cm handguard
    // tube tightly so no fingertip pokes above the top rail
    const curls = sg > 0 ? [1.3, 1.35] : [1.25, 1.4];
    const fingers = {
      index: buildFinger(hand, -0.027, -0.004, curls[0] * 0.9, curls[1] * 0.88, 0.0115, [0.026, 0.022]),
      mid: buildFinger(hand, 0, -0.006, curls[0], curls[1], 0.012, [0.029, 0.024]),
      ring: buildFinger(hand, 0.027, -0.004, curls[0] * 1.06, curls[1] * 1.04, 0.011, [0.026, 0.02]),
    };
    const thumb = new THREE.Object3D();
    thumb.position.set(sg * -0.046, -0.035, -0.004);
    thumb.rotation.set(0.5, sg * 0.35, sg * -0.85);
    hand.add(thumb);
    thumb.add(G.buildParts([P(G.capsule(0.013, 0.028, 3, 8), glove, [0, -0.022, 0])]));
    const thumb2 = new THREE.Object3D();
    thumb2.position.set(0, -0.046, 0);
    thumb2.rotation.x = sg > 0 ? 0.75 : 0.35;
    thumb.add(thumb2);
    thumb2.add(G.buildParts([P(G.capsule(0.0115, 0.022, 3, 8), glove, [0, -0.018, 0])]));
    fingers.thumb = thumb;

    return { upper, fore, hand, fingers, watch };
  };

  const armR = buildSide(1);
  const armL = buildSide(-1);

  /* ---- pose the RIGHT arm: palm around the grip at the mount point ---- */
  const MOUNT_POS = new THREE.Vector3(0.115, -0.315, -0.345);
  // Palm against the right-rear grip face, fingers wrapping left around it
  const rHandQuat = palmBasis(new THREE.Vector3(-0.85, -0.35, 0.15), new THREE.Vector3(-0.62, 0.1, -0.55));
  const rPalmPoint = MOUNT_POS.clone().add(new THREE.Vector3(0.028, -0.012, 0.032));
  const rWristTarget = rPalmPoint.clone().addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(rHandQuat), -PALM_DEPTH);
  const rShoulder = armR.upper.position.clone();
  const rSolved = solveArm(armR, rShoulder, rWristTarget, new THREE.Vector3(0.45, -1, 0.15));
  armR.hand.quaternion.copy(rSolved.foreWorldQuat.clone().invert().multiply(rHandQuat));

  /* ---- weaponMount: world-identity orientation in the right palm ---- */
  group.updateMatrixWorld(true);
  const weaponMount = new THREE.Object3D();
  weaponMount.name = 'weaponMount';
  armR.hand.add(weaponMount);
  armR.hand.updateWorldMatrix(true, false);
  const hq = armR.hand.getWorldQuaternion(new THREE.Quaternion());
  weaponMount.quaternion.copy(hq.invert());
  weaponMount.position.copy(armR.hand.worldToLocal(MOUNT_POS.clone()));

  /* ---- LEFT arm support solve, re-runnable via setSupportTarget() ---- */
  // Palm up under the handguard, fingers wrapping up and over to the right
  const lHandQuat = palmBasis(new THREE.Vector3(0.92, 0.18, -0.22), new THREE.Vector3(-0.12, 0.98, 0.05));
  const lShoulder = armL.upper.position.clone();
  const setSupportTarget = (palmPoint) => {
    const target = palmPoint.clone ? palmPoint.clone() : new THREE.Vector3(palmPoint[0], palmPoint[1], palmPoint[2]);
    const wrist = target.addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(lHandQuat), -PALM_DEPTH);
    // Elbow pole points DOWN-forward: the elbow drops below the frame and the
    // forearm rises steeply to the guard, keeping its screen footprint small
    // instead of sweeping across the camera.
    const solved = solveArm(armL, lShoulder, wrist, new THREE.Vector3(0.12, -1, -0.28));
    armL.hand.quaternion.copy(solved.foreWorldQuat.clone().invert().multiply(lHandQuat));
    // Turn the watch face toward the camera (origin) now the pose is final
    if (armL.watch) {
      armL.watch.parent.updateWorldMatrix(true, false);
      const local = armL.watch.parent.worldToLocal(new THREE.Vector3(0, 0.1, 0.2));
      armL.watch.rotation.y = Math.atan2(local.x, local.z);
    }
    return solved;
  };
  // Default: cupping the NW-4 handguard tube (weapon-space (0, 0.02, -0.20)
  // relative to the grip) — visible beside the magazine, not behind the receiver
  setSupportTarget(new THREE.Vector3(0.115, -0.297, -0.545));

  const rig = {
    root, hips: sway, spine, chest, neck, head,
    armL: { upper: armL.upper, fore: armL.fore, hand: armL.hand },
    armR: { upper: armR.upper, fore: armR.fore, hand: armR.hand },
    legL, legR, weaponMount,
    fingersL: armL.fingers, fingersR: armR.fingers,
  };
  const materials = { skin, glove, fatigue, knuckle, rubber, metal };
  return { group, rig, bones: rig, materials, setSupportTarget };
}

/**
 * Visible player body for the main scene (legs/torso seen when looking down).
 * Head and neck shells are omitted; arm meshes are stripped by default so the
 * FP arms overlay owns them (pass { hideArms:false } for full-body captures).
 * Returns { group, rig }.
 */
export function buildOperatorBody(opts = {}) {
  const built = buildHumanoid({
    kind: 'operator',
    name: 'char.operator.body',
    height: 1.83,
    headId: 'head.aspen',
    masked: false,
    helmet: null,
    jacket: C.operatorFatigue,
    shirt: shade(C.operatorFatigue, 0.6),
    trousers: shade(C.operatorFatigue, 0.82),
    gloves: C.hostileGlove,
    plate: 0x232830,
    plateStyle: 'full',
    gear: ['magPouches', 'holster'],
    headless: true,
    hideArms: opts.hideArms ?? true,
  }, opts);
  built.group.name = 'char.operator.body';
  return { group: built.group, rig: built.rig };
}

/* ------------------------------------------------------------------ */
/* Manifest registration                                               */
/* ------------------------------------------------------------------ */

let registered = false;
export function registerCharacterManifest() {
  if (registered) return;
  registered = true;
  const files = ['src/characters/models.js', 'src/characters/faces.js', 'src/characters/animation.js'];
  const rigDoc = 'pivot at ground between the feet, +Y up, faces -Z; rig bones root/hips/spine/chest/neck/head, arms upper/fore/hand, legs thigh/shin/foot, weaponMount in the right palm (-Z aim, +Y up)';
  const lodDoc = `per-bone THREE.LOD (makeLod): detailed shells 0–${LOD_SWITCH_DISTANCE} m, reduced box/low-segment proxies beyond ${LOD_SWITCH_DISTANCE} m; buildHostileLod1() returns the reduced build directly`;
  const anims = 'idle, breathing, walk, run, crouchIdle, crouchWalk, turnL, turnR, aim, fire, reload, flinch, takeCover, investigate, search, death1, death2, death3';

  for (const v of HOSTILE_VARIANTS) {
    reg({
      id: `char.hostile.${v.id.split('.')[1]}`,
      name: v.name,
      category: 'character',
      owner: OWNERS.FABLE4,
      files,
      usedIn: 'AI patrols, guard posts, mission encounters (all floors)',
      dimensions: `${v.height.toFixed(2)} m tall, 0.46 m shoulders, head 0.235 m`,
      pivot: rigDoc,
      materials: ['fabric (jacket/trousers, tinted weave)', 'armour polymer (plates/helmet/knee pads)', `painted head canvas (${v.masked ? 'balaclava overlay' : v.head})`, 'leather (gloves/boots)', 'rubber (soles/antenna)', 'black anodised metal (buckles/rails)'],
      textures: ['face canvas 256²', 'fabric weave + normal + roughness', 'hard plastic set', 'leather grain set', 'Kestrel insignia decal'],
      collision: 'hitboxes: head ×4.0, chest ×1.0, stomach ×1.25, arms ×0.75, legs ×0.7 — AABBs from bone.matrixWorld + offset/halfExtents',
      lod: lodDoc,
      animations: anims,
      status: 'built',
      acceptance: `Height ${v.height.toFixed(2)} m within 1.78–1.86; strong value separation at 8–15 m (near-black ${v.plateStyle} carrier + webbing over a lighter jacket, tan pouches breaking the torso, tan belt line, brown boots under darker trousers); secondary shapes read at distance (shoulder pads/sleeve rolls, knee pads, pale helmet band or cap patch, radio whip antenna + shoulder mic, enlarged Kestrel armband); no joint gaps (spheres at every joint); all meshes cast+receive shadows; original Kestrel insignia only. ${v.description}`,
    });
  }
  for (const v of HOSTAGE_VARIANTS) {
    reg({
      id: `char.hostage.${v.id}`,
      name: v.name,
      category: 'character',
      owner: OWNERS.FABLE4,
      files,
      usedIn: `HOSTAGE_SPOTS in src/map/layout.js (variant '${v.id}')`,
      dimensions: `${v.height.toFixed(2)} m tall, soft silhouette per visual bible`,
      pivot: rigDoc,
      materials: ['fabric (shirt/trousers)', 'skin (hands/head)', 'leather (shoes)', 'rubber (soles)', 'plastic (badge)'],
      textures: ['face canvas 256²', 'fabric weave set', 'leather grain set'],
      collision: 'same hitbox set as hostiles (head ×4.0 … legs ×0.7)',
      lod: lodDoc,
      animations: 'hostageIdle, fear, hostageCrouch, follow, stop, extract, surrender, walk, flinch, death1-3',
      status: 'built',
      acceptance: `Height ${v.height.toFixed(2)} m within 1.62–1.80; reads instantly as a civilian (light values, no gear); ${v.description}`,
    });
  }
  for (const h of HEAD_VARIANTS) {
    reg({
      id: `char.${h.id}`,
      name: `Head — ${h.id.split('.')[1]}`,
      category: 'character',
      owner: OWNERS.FABLE4,
      files: ['src/characters/faces.js'],
      usedIn: 'all hostile and hostage builds (assigned per variant or per seed)',
      dimensions: 'skull 0.156 × 0.21 × 0.176 m + jaw/nose/ear shells',
      pivot: 'head bone at the skull base (y = 1.585 at H = 1.82); painted UV sphere, face at u = 0.75',
      materials: ['painted head canvas (skin/brow/eye/stubble/hair)', `skin.${h.tone} for ears/neck/hands`],
      textures: ['256² canvas: skin tone, brows, eyes, nose, mouth, stubble, hair + optional balaclava/goggle-strap overlays'],
      collision: 'head hitbox ×4.0 (0.20 × 0.25 × 0.22 m box on the head bone)',
      lod: 'texture shared by hi skull sphere and far LOD box head',
      status: 'built',
      acceptance: `Distinct at a glance from the other heads: ${h.description}.`,
    });
  }
  reg({
    id: 'char.operator.arms',
    name: 'Operator first-person arms',
    category: 'character',
    owner: OWNERS.FABLE4,
    files: ['src/characters/models.js'],
    usedIn: 'first-person overlay scene (65° FOV camera at origin, integration offset (0, 0.155, 0.02) on viewModel.root)',
    dimensions: 'view-model scale (upper 0.44 m / forearm 0.46 m); shoulders at z=+0.30/y=-0.35, right grip (0.115,-0.315,-0.345), left palm cupping the handguard at (0.115,-0.297,-0.545) by default',
    pivot: 'group at the camera origin looking -Z; rig.hips is the sway/bob pivot; weaponMount world-identity in the right palm; setSupportTarget(vec3) re-solves the left arm to any foregrip point',
    materials: ['fatigue fabric sleeves + rolled cuffs', 'leather gloves with polymer knuckle plates', 'skin (≤2.5 cm wrist window)', 'rubber watch strap', 'brushed metal watch body'],
    textures: ['skin solid', 'leather grain set', 'fabric weave set'],
    collision: 'none (view-model only)',
    lod: 'single LOD — always within 1 m of the camera',
    animations: 'static IK bind pose; all motion applied by the weapons ViewModel pose layers',
    status: 'built',
    acceptance: 'Both arms covered shoulder→fingertip: fatigue sleeve, rolled cuff, ≤2.5 cm wrist skin (left wears the watch there), strapped glove cuff, glove with knuckle plates and articulated fingers; left palm sits ON the weapon handguard (two-bone IK, retargetable via setSupportTarget); arms do not cross each other or the weapon and stay inside the 65° frame with the (0,0.155,0.02) integration offset — weapon centre ~22° below the camera axis, lower-right third of the frame.',
  });
  reg({
    id: 'char.operator.body',
    name: 'Operator visible body',
    category: 'character',
    owner: OWNERS.FABLE4,
    files: ['src/characters/models.js'],
    usedIn: 'main scene, parented under the player controller (legs/torso when looking down)',
    dimensions: '1.83 m rig (matches UNITS.playerHeightStand), headless, arms stripped by default',
    pivot: rigDoc,
    materials: ['operator fatigue fabric', 'plate carrier polymer', 'leather boots', 'rubber soles'],
    textures: ['fabric weave set', 'hard plastic set', 'leather grain set'],
    collision: 'none (player capsule owns collision)',
    lod: 'per-bone THREE.LOD as hostiles (relevant for shadows/reflections only)',
    animations: 'driven by the shared CharacterAnimator locomotion states',
    status: 'built',
    acceptance: 'No head/neck shells to clip the camera; boots and legs visible looking straight down; shadow-casting body silhouette matches the hostile rig.',
  });
  reg({
    id: 'char.insignia.kestrel',
    name: 'Kestrel Group insignia',
    category: 'decal',
    owner: OWNERS.FABLE4,
    files: ['src/characters/faces.js'],
    usedIn: 'hostile plate carriers, left-arm armbands, warden beret flash',
    dimensions: '128² canvas, worn at 0.05–0.065 m',
    pivot: 'centred decal plane, alpha-transparent background',
    materials: ['standard decal material, polygon-offset over cloth'],
    textures: ['painted canvas: slate shield, ice-white kestrel in a stoop, three gold chevrons, KESTREL wordmark'],
    collision: 'n/a',
    lod: 'dropped with the hi shells beyond 18 m',
    status: 'built',
    acceptance: 'Wholly original fiction — no real-world or third-party game branding anywhere on the characters.',
  });
}
