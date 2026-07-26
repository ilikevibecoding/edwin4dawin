import * as THREE from 'three';
import * as G from '../art/geometry.js';
import * as T from '../art/textures.js';
import { mat } from '../art/materials.js';
import { reg, OWNERS } from '../core/assets.js';
import { WEAPONS } from './defs.js';

/**
 * Weapon model factory — Northstar Rescue.
 * Owner: Fable 4.
 *
 * Every model is an original fictional design (Vasco Defence, Kestrel Arms,
 * Northwind Systems, Borealis Ordnance, Meridian Precision, Talon Edge, and
 * the issued Halo/Veil devices). No real-manufacturer or other-game branding.
 *
 * LOCAL FRAME (all weapons): muzzle points along -Z, +Y is up, and the firing
 * grip wraps the origin. Anchors returned as Object3D children of the group:
 *   muzzleTip  — at the muzzle exit, identity orientation (-Z forward)
 *   ejectPoint — at the ejection port, identity orientation (+X out the port)
 *   sightPoint — on the aiming line behind the rear sight; the aiming line is
 *                authored at x = 0, y = sightY so looking down -Z through
 *                sightPoint centres the front post in the rear notch exactly
 *   magPoint   — at the magazine well / loading port
 *
 * SIGHT MATHS (verified numerically by the build harness): for each firearm a
 * single sight height `sightY` above the grip origin carries the front-post
 * tip, the rear-notch floor (or aperture/ghost-ring/scope centre) and the
 * sightPoint. All three share x = 0, so the post-tip → notch → eye ray is
 * exactly parallel to -Z and the alignment error is zero up to float rounding.
 *
 * Moving sub-assemblies (slide, bolt, chargingHandle, magazine, pumpGrip,
 * trigger) are separate named groups so the ViewModel can translate/rotate
 * them; travel distances live in group.userData.anim.
 *
 * LOD: `lod: 0` full detail (2–5 mm bevels everywhere, 16–24 seg barrels);
 * `lod: 1` drops serrations, rail slats, brand decals, pins and interior
 * detail and halves the radial segments — roughly 40 % of the triangles.
 */

export const WEAPON_MODEL_IDS = [
  'pistol.vsc9', 'smg.kestrel', 'rifle.northwind', 'shotgun.borealis',
  'dmr.meridian', 'knife.talon', 'flash.halo', 'smoke.veil',
];

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function P(g, m, p, r, s, name) {
  const part = { g, m, p, name };
  if (r) part.r = r;
  if (s != null) part.s = s;
  return part;
}

function grp(name, parts) {
  const g = G.buildParts(parts, { name });
  return g;
}

function mark(name, x, y, z, parent) {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  if (parent) parent.add(o);
  return o;
}

const LMAT = new Map();
function lmat(key, make) {
  let m = LMAT.get(key);
  if (!m) {
    m = make();
    m.name = key;
    LMAT.set(key, m);
  }
  return m;
}

const cavityMat = () =>
  lmat('wpn.cavity', () => new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.92, metalness: 0.25 }));
const lensMat = () =>
  lmat('wpn.lens', () => new THREE.MeshStandardMaterial({
    color: 0x0c1a24, roughness: 0.06, metalness: 0.4, emissive: 0x0f2c3e, emissiveIntensity: 0.55,
  }));
const reticleMat = () =>
  lmat('wpn.reticle', () => new THREE.MeshStandardMaterial({
    color: 0x230604, emissive: 0xff5238, emissiveIntensity: 3.0, roughness: 0.4, metalness: 0,
  }));
const pickupRingMat = () =>
  lmat('wpn.pickupRing', () => new THREE.MeshStandardMaterial({
    color: 0x06121c, emissive: 0x7fd4ff, emissiveIntensity: 1.7, roughness: 0.5, metalness: 0,
    transparent: true, opacity: 0.92,
  }));
const pickupGlowMat = () =>
  lmat('wpn.pickupGlow', () => new THREE.MeshStandardMaterial({
    color: 0x0a1824, emissive: 0x2b7fb4, emissiveIntensity: 0.55, roughness: 0.7, metalness: 0,
    transparent: true, opacity: 0.38, depthWrite: false,
  }));

/** Subtle maker's-mark decal (painted, alpha-cut, no external files). */
function brandMat(text, sub = '') {
  const key = `wpn.brand.${text}.${sub}`;
  return lmat(key, () => {
    const tex = T.decalTexture(key, 256, (ctx, size) => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(196,204,211,0.44)';
      ctx.font = '700 40px "Bahnschrift", "Arial Narrow", system-ui, sans-serif';
      ctx.fillText(text, size / 2, sub ? size * 0.42 : size / 2);
      if (sub) {
        ctx.fillStyle = 'rgba(176,184,191,0.36)';
        ctx.font = '600 26px "Bahnschrift", "Arial Narrow", system-ui, sans-serif';
        ctx.fillText(sub, size / 2, size * 0.63);
      }
    });
    return new THREE.MeshStandardMaterial({
      map: tex, transparent: true, roughness: 0.5, metalness: 0.35,
      polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false,
    });
  });
}

/** Text band that wraps once around a cylinder (grenade labels). */
function bandMat(key, text, rgba) {
  return lmat(`wpn.band.${key}`, () => {
    const tex = T.painted(`wpn.band.${key}`, 256, (ctx, w, h) => {
      ctx.fillStyle = rgba;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(20,24,28,0.85)';
      ctx.font = '700 26px "Bahnschrift", "Arial Narrow", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w * 0.25, h / 2);
      ctx.fillText(text, w * 0.75, h / 2);
    }, { height: 64, wrap: THREE.RepeatWrapping });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.1 });
  });
}

function brandPlate(text, w, h, p, side = -1, sub = '') {
  // side -1 = left face (-X), +1 = right face (+X)
  return P(G.plane(w, h), brandMat(text, sub), p, [0, (side > 0 ? 1 : -1) * (Math.PI / 2), 0], null, `brand.${text}`);
}

/** Front sight: group origin sits exactly at the post TIP (the aim point). */
function frontSightGroup(mate, { postH, ears = true, d = true, width = 0.0028 }) {
  const B = smallBox(d);
  const parts = [
    P(B(width, postH, 0.0045, 0.001), mate, [0, -postH / 2, 0], null, null, 'post'),
    P(B(0.016, 0.006, 0.013, 0.002), mate, [0, -postH - 0.003, 0], null, null, 'base'),
  ];
  if (ears && d) {
    parts.push(P(G.bevelBox(0.0028, postH * 0.96, 0.009, 0.001), mate, [-0.0085, -postH / 2, 0], null, null, 'earL'));
    parts.push(P(G.bevelBox(0.0028, postH * 0.96, 0.009, 0.001), mate, [0.0085, -postH / 2, 0], null, null, 'earR'));
  }
  return grp('sight.front', parts);
}

/** Rear sight: origin at the aim point (notch floor / aperture centre). */
function rearSightGroup(mate, { style = 'notch', d = true, earH = 0.0045 }) {
  const B = smallBox(d);
  const parts = [];
  if (style === 'aperture') {
    parts.push(P(G.torus(0.0042, 0.0016, 6, d ? 16 : 10), mate, [0, 0, 0], null, null, 'aperture'));
    parts.push(P(B(0.006, 0.008, 0.006, 0.0015), mate, [0, -0.0083, 0], null, null, 'stem'));
    parts.push(P(B(0.018, 0.006, 0.011, 0.002), mate, [0, -0.0138, 0], null, null, 'base'));
  } else if (style === 'ghost') {
    parts.push(P(G.torus(0.006, 0.002, 6, d ? 16 : 10), mate, [0, 0, 0], null, null, 'ring'));
    parts.push(P(B(0.007, 0.009, 0.007, 0.0015), mate, [0, -0.0098, 0], null, null, 'stem'));
    parts.push(P(B(0.02, 0.006, 0.012, 0.002), mate, [0, -0.016, 0], null, null, 'base'));
  } else {
    parts.push(P(B(0.0044, earH, 0.0062, 0.001), mate, [-0.0052, earH / 2 - 0.0008, 0], null, null, 'earL'));
    parts.push(P(B(0.0044, earH, 0.0062, 0.001), mate, [0.0052, earH / 2 - 0.0008, 0], null, null, 'earR'));
    parts.push(P(B(0.0148, 0.005, 0.0062, 0.0015), mate, [0, -0.0033, 0], null, null, 'base'));
  }
  return grp('sight.rear', parts);
}

/**
 * Ejection port with a real recessed opening. Group origin sits at the port
 * centre on the +X receiver skin; a dark cavity box sinks inward and a raised
 * rim frames the opening.
 */
function ejectionPortGroup(mate, { len, h, depth = 0.011, d = true }) {
  const parts = [
    P(G.box(depth, h, len), cavityMat(), [-depth / 2 - 0.0008, 0, 0], null, null, 'cavity'),
  ];
  if (d) {
    parts.push(P(G.bevelBox(0.0035, 0.0032, len + 0.007, 0.001), mate, [0.0006, h / 2 + 0.0014, 0], null, null, 'rimTop'));
    parts.push(P(G.bevelBox(0.0035, 0.0032, len + 0.007, 0.001), mate, [0.0006, -h / 2 - 0.0014, 0], null, null, 'rimBottom'));
    parts.push(P(G.bevelBox(0.0035, h + 0.006, 0.0032, 0.001), mate, [0.0006, 0, -len / 2 - 0.0014], null, null, 'rimFront'));
    parts.push(P(G.bevelBox(0.0035, h + 0.006, 0.0032, 0.001), mate, [0.0006, 0, len / 2 + 0.0014], null, null, 'rimRear'));
  }
  return grp('ejectionPort', parts);
}

/** Visible safety selector: pivot hub + lever, mounted on a receiver flank. */
function safetyGroup(mate, side = -1) {
  return grp('safety', [
    P(G.cyl(0.0045, 0.0045, 0.004, 10), mate, [0, 0, 0], [0, 0, Math.PI / 2], null, 'hub'),
    P(G.bevelBox(0.0028, 0.0055, 0.018, 0.001), mate, [side * 0.0006, 0.001, -0.009], null, null, 'lever'),
  ]);
}

const slingLoop = (mate, p, r = [Math.PI / 2, 0, 0]) =>
  P(G.torus(0.0075, 0.0022, 5, 10), mate, p, r, null, 'slingLoop');

/**
 * Small-part geometry: bevelled up close (lod 0), plain box at lod 1 where
 * the house rule permits sharp edges. Keeps LOD 1 near 40 % of the triangles.
 */
const smallBox = (d) => (w, h, dep, bev = 0.002) => (d ? G.bevelBox(w, h, dep, bev) : G.box(w, h, dep));

/** Slide/receiver grasping serrations: thin ridges spanning the full width. */
function serrations(mate, { w, y, z0, n, dz = 0.0055, h = 0.016 }) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    parts.push(P(G.box(w, h, 0.0022), mate, [0, y, z0 + i * dz], null, null, 'serration'));
  }
  return parts;
}

/** Invented "N-rail" mounting strip with cross slats. */
function railParts(mate, { len, y, zc, w = 0.021, d = true }) {
  const parts = [P(G.bevelBox(w, 0.007, len, 0.0018), mate, [0, y, zc], null, null, 'rail')];
  if (d) {
    const n = Math.floor(len / 0.011);
    for (let i = 0; i < n; i++) {
      const z = zc - len / 2 + 0.0065 + i * 0.011;
      parts.push(P(G.box(w + 0.002, 0.0028, 0.0045), mate, [0, y + 0.0034, z], null, null, 'railSlat'));
    }
  }
  return parts;
}

function sharedMats() {
  return {
    gm: mat('metal.gunmetal'),
    anod: mat('metal.blackAnodised'),
    alu: mat('metal.aluminium'),
    poly: mat('plastic.dark'),
    polyS: mat('plastic.smooth'),
    rub: mat('rubber.black'),
    wood: mat('wood.dark'),
  };
}

/* ------------------------------------------------------------------ */
/* VSC-9 — Vasco Defence service pistol                                */
/* 0.195 long × 0.135 tall × 0.032 wide, bore y = 0.056                */
/* ------------------------------------------------------------------ */

function buildVsc9(o) {
  const { d, fp, seg, m } = o;
  const B = smallBox(d);
  const group = new THREE.Group();
  const sightY = 0.0865;
  const gs = fp ? 1.05 : 1;

  /* frame (polymer receiver) */
  const recParts = [
    P(G.bevelBox(0.028, 0.02, 0.088, 0.003), m.poly, [0, 0.042, -0.044], null, null, 'dustCover'),
    P(G.bevelBox(0.03, 0.024, 0.078, 0.003), m.poly, [0, 0.04, 0.022], null, null, 'frameCentre'),
    P(B(0.024, 0.011, 0.022, 0.003), m.poly, [0, 0.047, 0.059], null, null, 'beavertail'),
    // trigger guard — front strap + bottom bar
    P(B(0.005, 0.024, 0.006, 0.0018), m.poly, [0, 0.016, -0.0265], null, null, 'guardFront'),
    P(B(0.005, 0.006, 0.038, 0.0018), m.poly, [0, 0.0055, -0.009], null, null, 'guardBottom'),
    // grip, raked back 18°
    P(G.bevelBox(0.03 * gs, 0.086, 0.044 * gs, 0.006), m.poly, [0, 0.004, 0.033], [-0.315, 0, 0], null, 'gripCore'),
    P(B(0.034, 0.011, 0.046, 0.0025), m.poly, [0, -0.037, 0.044], [-0.315, 0, 0], null, 'magwellMouth'),
  ];
  if (d) {
    // stipple panels + accessory rail nub + lanyard loop
    recParts.push(P(G.bevelBox(0.0324 * gs, 0.05, 0.03, 0.0025), m.rub, [0, 0.002, 0.036], [-0.315, 0, 0], null, 'stipple'));
    recParts.push(P(G.bevelBox(0.022, 0.006, 0.032, 0.0015), m.poly, [0, 0.0305, -0.06], null, null, 'railNub'));
    recParts.push(P(G.torus(0.005, 0.0018, 5, 10), m.anod, [0, -0.0395, 0.058], [0, 0, Math.PI / 2], null, 'lanyardLoop'));
    recParts.push(brandPlate('VSC-9', 0.03, 0.009, [0.0152, 0.04, 0.012], 1));
    recParts.push(P(G.box(0.0335, 0.004, 0.012), m.poly, [0, 0.036, -0.052], null, null, 'takedownRidge'));
  }
  const receiver = grp('receiver', recParts);
  group.add(receiver);

  /* slide (blowback part) */
  const slideParts = [
    P(G.bevelBox(0.032, 0.03, 0.185, 0.004), m.gm, [0, 0, -0.022], null, null, 'slideBody'),
    P(G.cyl(0.009, 0.009, 0.0025, seg(16)), cavityMat(), [0, -0.004, -0.1138], [Math.PI / 2, 0, 0], null, 'muzzlePort'),
    P(B(0.024, 0.008, 0.006, 0.0015), m.gm, [0, 0.002, 0.0685], null, null, 'coverPlate'),
  ];
  if (d) {
    slideParts.push(...serrations(m.gm, { w: 0.0334, y: -0.001, z0: 0.036, n: 6 }));
    slideParts.push(...serrations(m.gm, { w: 0.0334, y: -0.001, z0: -0.098, n: 3 }));
    slideParts.push(P(G.bevelBox(0.006, 0.003, 0.02, 0.001), m.gm, [0.014, 0.0135, 0.03], null, null, 'extractor'));
    slideParts.push(brandPlate('VASCO', 0.042, 0.01, [-0.0165, 0.001, -0.03], -1, 'DEFENCE 9MM'));
  }
  const slide = grp('slide', slideParts);
  slide.position.set(0, 0.066, 0);
  group.add(slide);

  // sights ride the slide; aim line y = 0.0865 world → 0.0205 slide-local
  const front = frontSightGroup(m.gm, { postH: 0.0055, ears: false, d });
  front.position.set(0, 0.0205, -0.104);
  slide.add(front);
  const rear = rearSightGroup(m.gm, { d, earH: 0.0045 });
  rear.position.set(0, 0.0205, 0.058);
  slide.add(rear);

  // ejection port on the right of the slide, with the barrel hood showing
  const ePort = ejectionPortGroup(m.gm, { len: 0.032, h: 0.015, d });
  ePort.position.set(0.016, 0.004, 0.03);
  ePort.rotation.z = -0.08;
  slide.add(ePort);

  /* barrel — visible at the front port and through the ejection opening */
  const barrel = grp('barrel', [
    P(G.cyl(0.0082, 0.0082, 0.16, seg(20)), m.gm, [0, 0.062, -0.033], [Math.PI / 2, 0, 0], null, 'barrelTube'),
    P(B(0.0145, 0.0125, 0.03, 0.002), m.alu, [0.003, 0.068, 0.03], null, null, 'chamberHood'),
  ]);
  group.add(barrel);

  /* muzzle device — thread protector collar */
  const muzzleDevice = grp('muzzleDevice', [
    P(G.cyl(0.0095, 0.0095, 0.012, seg(16)), m.anod, [0, 0.062, -0.119], [Math.PI / 2, 0, 0], null, 'collar'),
  ]);
  group.add(muzzleDevice);

  /* trigger */
  const trigger = grp('trigger', [
    P(B(0.005, 0.019, 0.0045, 0.0015), m.polyS, [0, -0.011, -0.001], [0.16, 0, 0], null, 'blade'),
  ]);
  trigger.position.set(0, 0.028, -0.006);
  group.add(trigger);

  /* magazine — pivot at the well mouth, drops along the grip axis */
  const magParts = [
    P(G.bevelBox(0.024, 0.1, 0.036, 0.003), m.polyS, [0, 0.048, -0.001], null, null, 'magBody'),
    P(B(0.0305, 0.009, 0.042, 0.002), m.polyS, [0, -0.0045, 0], null, null, 'basePlate'),
  ];
  if (d) magParts.push(P(G.box(0.0245, 0.07, 0.004), m.anod, [0, 0.045, -0.0195], null, null, 'witnessSpine'));
  const magazine = grp('magazine', magParts);
  magazine.position.set(0, -0.037, 0.047);
  magazine.rotation.x = -0.315;
  group.add(magazine);

  /* controls */
  if (d) {
    const safety = safetyGroup(m.anod, -1);
    safety.position.set(-0.0163, 0.052, 0.05);
    group.add(safety);
    group.add(grp('slideCatch', [
      P(G.bevelBox(0.0025, 0.005, 0.02, 0.001), m.anod, [-0.0163, 0.053, 0.012], null, null, 'catchLever'),
    ]));
  }

  return {
    group,
    parts: {
      receiver, barrel, slide, magazine, muzzleDevice, trigger,
      sights: { front, rear },
      ejectionPort: ePort,
    },
    anchors: {
      muzzle: [0, 0.062, -0.125],
      eject: [0.02, 0.073, 0.03],
      sight: [0, sightY, 0.16],
      mag: [0, -0.041, 0.048],
    },
    sightInfo: { y: sightY, frontZ: -0.104, rearZ: 0.058 },
    anim: { blowback: 'slide', travel: 0.034, magDrop: 0.12, magDir: [0, -1, 0.33] },
  };
}

/* ------------------------------------------------------------------ */
/* Kestrel K-7 — compact PDW                                           */
/* 0.50 long (stock extended) × 0.24 tall, bore y = 0.06               */
/* ------------------------------------------------------------------ */

function buildKestrel(o) {
  const { d, fp, seg, m } = o;
  const B = smallBox(d);
  const group = new THREE.Group();
  const sightY = 0.094;
  const gs = fp ? 1.05 : 1;

  /* tubular upper + polymer lower */
  const recParts = [
    P(G.cyl(0.021, 0.021, 0.2, seg(20)), m.anod, [0, 0.06, 0], [Math.PI / 2, 0, 0], null, 'upperTube'),
    P(G.cyl(0.0215, 0.0215, 0.012, seg(20)), m.anod, [0, 0.06, 0.096], [Math.PI / 2, 0, 0], null, 'endCap'),
    P(G.bevelBox(0.034, 0.03, 0.2, 0.004), m.poly, [0, 0.028, -0.03], null, null, 'lowerHousing'),
    // magwell forward of the trigger
    P(G.bevelBox(0.034, 0.032, 0.04, 0.004), m.poly, [0, 0.004, -0.058], [0.06, 0, 0], null, 'magwell'),
    // trigger guard
    P(B(0.005, 0.02, 0.006, 0.0018), m.poly, [0, 0.0, -0.026], null, null, 'guardFront'),
    P(B(0.005, 0.006, 0.04, 0.0018), m.poly, [0, -0.009, -0.007], null, null, 'guardBottom'),
    // grip
    P(G.bevelBox(0.028 * gs, 0.085, 0.04 * gs, 0.005), m.poly, [0, -0.032, 0.014], [-0.28, 0, 0], null, 'gripCore'),
  ];
  if (d) {
    recParts.push(P(G.bevelBox(0.03 * gs, 0.044, 0.028, 0.0025), m.rub, [0, -0.033, 0.017], [-0.28, 0, 0], null, 'gripPanel'));
    recParts.push(brandPlate('KESTREL ARMS', 0.06, 0.011, [-0.0172, 0.055, -0.01], -1));
    recParts.push(brandPlate('K-7', 0.024, 0.009, [0.0172, 0.006, -0.058], 1));
    recParts.push(slingLoop(m.anod, [-0.0195, 0.066, -0.115], [0, 0, Math.PI / 2]));
  }
  recParts.push(...railParts(m.anod, { len: 0.13, y: 0.0855, zc: 0.028, d }));
  const receiver = grp('receiver', recParts);
  group.add(receiver);

  /* handguard — octagonal shell with vent slots */
  const hgParts = [
    P(G.cyl(0.024, 0.024, 0.125, 8), m.poly, [0, 0.06, -0.165], [Math.PI / 2, 0, 0], null, 'shell'),
  ];
  if (d) {
    for (let i = 0; i < 4; i++) {
      const z = -0.135 - i * 0.021;
      hgParts.push(P(G.box(0.0505, 0.006, 0.013), cavityMat(), [0, 0.06, z], null, null, 'ventSlot'));
    }
    hgParts.push(slingLoop(m.anod, [-0.026, 0.06, -0.2], [0, 0, Math.PI / 2]));
  }
  hgParts.push(...railParts(m.anod, { len: 0.09, y: 0.0875, zc: -0.185, d }));
  const handguard = grp('handguard', hgParts);
  group.add(handguard);

  /* barrel + slotted linear compensator */
  const barrel = grp('barrel', [
    P(G.cyl(0.009, 0.009, 0.16, seg(18)), m.gm, [0, 0.06, -0.175], [Math.PI / 2, 0, 0], null, 'barrelTube'),
  ]);
  group.add(barrel);
  const mdParts = [
    P(G.cyl(0.013, 0.013, 0.05, seg(18)), m.anod, [0, 0.06, -0.272], [Math.PI / 2, 0, 0], null, 'canBody'),
    P(G.cyl(0.0085, 0.0085, 0.003, seg(12)), cavityMat(), [0, 0.06, -0.2975], [Math.PI / 2, 0, 0], null, 'exitPort'),
  ];
  if (d) {
    for (let i = 0; i < 3; i++) {
      mdParts.push(P(G.torus(0.0131, 0.0012, 5, seg(18)), m.gm, [0, 0.06, -0.258 - i * 0.013], [0, 0, 0], null, 'ringGroove'));
    }
  }
  const muzzleDevice = grp('muzzleDevice', mdParts);
  group.add(muzzleDevice);

  /* folding strut stock, extended */
  const stock = grp('stock', [
    P(G.cyl(0.006, 0.006, 0.115, seg(12)), m.alu, [-0.012, 0.066, 0.1475], [Math.PI / 2, 0, 0], null, 'strutL'),
    P(G.cyl(0.006, 0.006, 0.115, seg(12)), m.alu, [0.012, 0.066, 0.1475], [Math.PI / 2, 0, 0], null, 'strutR'),
    P(B(0.03, 0.02, 0.02, 0.004), m.poly, [0, 0.066, 0.108], null, null, 'hinge'),
    P(G.bevelBox(0.032, 0.09, 0.016, 0.004), m.rub, [0, 0.038, 0.2075], null, null, 'buttPad'),
    P(B(0.026, 0.016, 0.05, 0.003), m.poly, [0, 0.083, 0.175], null, null, 'cheekRest'),
  ]);
  group.add(stock);
  if (d) stock.add(grp('stockLoop', [slingLoop(m.anod, [0, 0.012, 0.198], [0, Math.PI / 2, 0])]));

  /* sights — post front, aperture rear */
  const front = frontSightGroup(m.anod, { postH: 0.006, ears: true, d });
  front.position.set(0, sightY, -0.198);
  group.add(front);
  const rear = rearSightGroup(m.anod, { style: 'aperture', d });
  rear.position.set(0, sightY, 0.072);
  group.add(rear);

  /* ejection port + bolt visible inside */
  const ePort = ejectionPortGroup(m.anod, { len: 0.04, h: 0.016, d });
  ePort.position.set(0.0205, 0.062, -0.005);
  group.add(ePort);
  const bolt = grp('bolt', [
    P(B(0.012, 0.014, 0.05, 0.002), m.alu, [0, 0, 0], null, null, 'boltBlock'),
  ]);
  bolt.position.set(0.008, 0.06, -0.005);
  group.add(bolt);

  /* charging handle — left side, reciprocates */
  const chargingHandle = grp('chargingHandle', [
    P(G.cyl(0.0055, 0.0055, 0.014, seg(12)), m.poly, [-0.0295, 0, 0], [0, 0, Math.PI / 2], null, 'knob'),
    P(G.cyl(0.0032, 0.0032, 0.014, seg(10)), m.gm, [-0.019, 0, 0], [0, 0, Math.PI / 2], null, 'stem'),
  ]);
  chargingHandle.position.set(0, 0.064, -0.03);
  group.add(chargingHandle);

  /* trigger + safety */
  const trigger = grp('trigger', [
    P(B(0.005, 0.018, 0.0045, 0.0015), m.polyS, [0, -0.01, -0.001], [0.15, 0, 0], null, 'blade'),
  ]);
  trigger.position.set(0, 0.012, -0.004);
  group.add(trigger);
  if (d) {
    const safety = safetyGroup(m.anod, -1);
    safety.position.set(-0.0175, 0.018, 0.012);
    group.add(safety);
  }

  /* magazine — straight stick in the forward well */
  const magParts = [
    P(G.bevelBox(0.026, 0.15, 0.044, 0.004), m.polyS, [0, -0.073, 0.001], null, null, 'magBody'),
    P(B(0.03, 0.01, 0.05, 0.002), m.polyS, [0, -0.152, 0.002], null, null, 'basePlate'),
  ];
  if (d) {
    magParts.push(P(G.box(0.0265, 0.11, 0.005), m.anod, [0, -0.075, -0.021], null, null, 'witnessSpine'));
  }
  const magazine = grp('magazine', magParts);
  magazine.position.set(0, 0.01, -0.058);
  magazine.rotation.x = 0.06;
  group.add(magazine);

  return {
    group,
    parts: {
      receiver, barrel, bolt, magazine, handguard, stock, muzzleDevice, trigger, chargingHandle,
      sights: { front, rear },
      ejectionPort: ePort,
    },
    anchors: {
      muzzle: [0, 0.06, -0.3],
      eject: [0.028, 0.066, -0.005],
      sight: [0, sightY, 0.16],
      mag: [0, -0.01, -0.062],
    },
    sightInfo: { y: sightY, frontZ: -0.198, rearZ: 0.072 },
    anim: { blowback: 'bolt', travel: 0.05, magDrop: 0.17, magDir: [0, -1, 0.06], charge: 'chargingHandle', chargeTravel: 0.055 },
  };
}

/* ------------------------------------------------------------------ */
/* Northwind NW-4 — tactical carbine                                   */
/* 0.84 long × 0.26 tall, bore y = 0.065, aim line y = 0.104           */
/* ------------------------------------------------------------------ */

function buildNorthwind(o) {
  const { d, fp, seg, m } = o;
  const B = smallBox(d);
  const group = new THREE.Group();
  const sightY = 0.104;
  const gs = fp ? 1.05 : 1;
  const stockShift = fp ? -0.03 : 0; // keep the butt clear of the camera in FP

  /* upper + lower receiver */
  const recParts = [
    P(G.bevelBox(0.036, 0.05, 0.185, 0.004), m.anod, [0, 0.062, -0.008], null, null, 'upper'),
    P(G.bevelBox(0.034, 0.038, 0.135, 0.004), m.poly, [0, 0.026, 0.023], null, null, 'lower'),
    // flared magwell
    P(G.bevelBox(0.038, 0.034, 0.048, 0.004), m.poly, [0, 0.005, -0.023], [0.08, 0, 0], null, 'magwell'),
    // trigger guard
    P(B(0.005, 0.02, 0.006, 0.0018), m.poly, [0, 0.0, 0.008], null, null, 'guardFront'),
    P(B(0.005, 0.006, 0.042, 0.0018), m.poly, [0, -0.009, 0.028], null, null, 'guardBottom'),
    // grip
    P(G.bevelBox(0.03 * gs, 0.09, 0.042 * gs, 0.006), m.poly, [0, -0.035, 0.052], [-0.3, 0, 0], null, 'gripCore'),
  ];
  if (d) {
    recParts.push(P(G.bevelBox(0.032 * gs, 0.046, 0.03, 0.0025), m.rub, [0, -0.036, 0.055], [-0.3, 0, 0], null, 'gripPanel'));
    recParts.push(brandPlate('NORTHWIND', 0.055, 0.011, [-0.0182, 0.052, 0.01], -1, 'NW-4 5.56'));
    recParts.push(brandPlate('NW-4', 0.026, 0.009, [0.0192, 0.005, -0.023], 1));
    recParts.push(P(G.bevelBox(0.008, 0.014, 0.01, 0.002), m.anod, [-0.021, 0.05, 0.045], null, null, 'boltCatch'));
    recParts.push(P(G.cyl(0.004, 0.004, 0.04, seg(10)), m.anod, [0, 0.028, 0.083], [Math.PI / 2, 0, 0], null, 'takedownPin'));
  }
  recParts.push(...railParts(m.anod, { len: 0.185, y: 0.0905, zc: -0.008, d }));
  const receiver = grp('receiver', recParts);
  group.add(receiver);

  /* slim octagonal handguard with slot rows and a hand stop */
  const hgParts = [
    P(G.cyl(0.025, 0.025, 0.24, 8), m.anod, [0, 0.065, -0.23], [Math.PI / 2, 0, 0], null, 'tube'),
    P(B(0.016, 0.02, 0.024, 0.004), m.poly, [0, 0.036, -0.3], null, null, 'handStop'),
  ];
  if (d) {
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 7; i++) {
        hgParts.push(P(G.box(0.004, 0.007, 0.016), cavityMat(), [side * 0.0245, 0.065, -0.135 - i * 0.028], null, null, 'mountSlot'));
      }
    }
    for (let i = 0; i < 7; i++) {
      hgParts.push(P(G.box(0.007, 0.004, 0.016), cavityMat(), [0, 0.041, -0.135 - i * 0.028], null, null, 'mountSlotBottom'));
    }
    hgParts.push(slingLoop(m.anod, [-0.027, 0.065, -0.31], [0, 0, Math.PI / 2]));
  }
  hgParts.push(...railParts(m.anod, { len: 0.24, y: 0.0905, zc: -0.23, d }));
  const handguard = grp('handguard', hgParts);
  group.add(handguard);

  /* barrel, gas block, three-prong flash hider */
  const barrel = grp('barrel', [
    P(G.cyl(0.01, 0.011, 0.17, seg(20)), m.gm, [0, 0.065, -0.425], [Math.PI / 2, 0, 0], null, 'barrelTube'),
    P(B(0.018, 0.02, 0.018, 0.003), m.gm, [0, 0.07, -0.365], null, null, 'gasBlock'),
  ]);
  group.add(barrel);
  const mdParts = [
    P(G.cyl(0.0135, 0.0135, 0.022, seg(16)), m.anod, [0, 0.065, -0.508], [Math.PI / 2, 0, 0], null, 'hiderBase'),
  ];
  const prongAng = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  for (const a of prongAng) {
    mdParts.push(P(B(0.004, 0.006, 0.026, 0.0012), m.anod,
      [Math.sin(a) * 0.0105, 0.065 + Math.cos(a) * 0.0105, -0.522], [0, 0, -a], null, 'prong'));
  }
  const muzzleDevice = grp('muzzleDevice', mdParts);
  group.add(muzzleDevice);

  /* buffer tube + sliding stock */
  const stockParts = [
    P(G.cyl(0.016, 0.016, 0.14, seg(14)), m.anod, [0, 0.06, 0.15 + stockShift], [Math.PI / 2, 0, 0], null, 'bufferTube'),
    P(G.bevelBox(0.036, 0.052, 0.075, 0.005), m.poly, [0, 0.052, 0.263 + stockShift], null, null, 'stockBody'),
    P(G.bevelBox(0.036, 0.098, 0.03, 0.005), m.poly, [0, 0.028, 0.292 + stockShift], null, null, 'buttBlock'),
    P(B(0.034, 0.104, 0.012, 0.003), m.rub, [0, 0.028, 0.306 + stockShift], null, null, 'buttPad'),
    P(B(0.03, 0.014, 0.06, 0.003), m.poly, [0, 0.085, 0.26 + stockShift], null, null, 'cheekRiser'),
  ];
  if (d) {
    stockParts.push(P(G.bevelBox(0.014, 0.02, 0.02, 0.003), m.poly, [0, 0.005, 0.256 + stockShift], null, null, 'adjustLatch'));
    stockParts.push(slingLoop(m.anod, [-0.02, 0.03, 0.27 + stockShift], [0, 0, Math.PI / 2]));
  }
  const stock = grp('stock', stockParts);
  group.add(stock);

  /* sights: folding post + aperture, plus a compact reflex optic (co-witnessed) */
  const front = frontSightGroup(m.anod, { postH: 0.007, ears: true, d });
  front.position.set(0, sightY, -0.325);
  group.add(front);
  const rear = rearSightGroup(m.anod, { style: 'aperture', d });
  rear.position.set(0, sightY, 0.068);
  group.add(rear);
  const opticParts = [
    P(B(0.026, 0.012, 0.042, 0.003), m.anod, [0, -0.0155, 0], null, null, 'opticBase'),
    P(G.cyl(0.0135, 0.0135, 0.03, seg(18), true), m.anod, [0, 0, -0.001], [Math.PI / 2, 0, 0], null, 'hood'),
    P(G.cyl(0.0115, 0.0115, 0.002, seg(16)), lensMat(), [0, 0, 0.012], [Math.PI / 2, 0, 0], null, 'lens'),
  ];
  if (d) {
    opticParts.push(P(G.cyl(0.0016, 0.0016, 0.0015, 8), reticleMat(), [0, 0, 0.0105], [Math.PI / 2, 0, 0], null, 'dot'));
    opticParts.push(P(G.cyl(0.005, 0.005, 0.006, seg(10)), m.anod, [0.0155, 0.004, 0], [0, 0, Math.PI / 2], null, 'brightnessKnob'));
  }
  const optic = grp('sight.optic', opticParts);
  optic.position.set(0, sightY, -0.028); // emitter axis on the iron-sight line
  group.add(optic);

  /* ejection port with hinged dust cover + visible bolt */
  const ePort = ejectionPortGroup(m.anod, { len: 0.045, h: 0.016, d });
  ePort.position.set(0.018, 0.062, 0.018);
  group.add(ePort);
  if (d) {
    group.add(grp('dustCover', [
      P(G.bevelBox(0.0022, 0.014, 0.048, 0.001), m.anod, [0.0195, 0.046, 0.018], [0.5, 0, 0], null, 'coverFlap'),
    ]));
    group.add(grp('shellDeflector', [
      P(G.bevelBox(0.008, 0.014, 0.01, 0.002), m.anod, [0.019, 0.062, 0.046], null, null, 'bump'),
    ]));
  }
  const bolt = grp('bolt', [
    P(B(0.011, 0.013, 0.052, 0.002), m.alu, [0, 0, 0], null, null, 'carrier'),
  ]);
  bolt.position.set(0.009, 0.062, 0.018);
  group.add(bolt);

  /* rear T charging handle */
  const chargingHandle = grp('chargingHandle', [
    P(B(0.05, 0.006, 0.012, 0.002), m.anod, [0, 0, 0.004], null, null, 'tBar'),
    P(B(0.012, 0.006, 0.05, 0.002), m.anod, [0, 0, -0.024], null, null, 'shaft'),
  ]);
  chargingHandle.position.set(0, 0.083, 0.08);
  group.add(chargingHandle);

  /* trigger + safety */
  const trigger = grp('trigger', [
    P(B(0.005, 0.018, 0.0045, 0.0015), m.polyS, [0, -0.01, -0.001], [0.15, 0, 0], null, 'blade'),
  ]);
  trigger.position.set(0, 0.012, 0.03);
  group.add(trigger);
  if (d) {
    const safety = safetyGroup(m.anod, -1);
    safety.position.set(-0.0175, 0.028, 0.05);
    group.add(safety);
  }

  /* curved magazine */
  const magParts = [
    P(G.bevelBox(0.024, 0.048, 0.05, 0.004), m.polyS, [0, -0.026, -0.002], [0.12, 0, 0], null, 'magSeg0'),
    P(G.bevelBox(0.024, 0.048, 0.05, 0.004), m.polyS, [0, -0.07, -0.012], [0.3, 0, 0], null, 'magSeg1'),
    P(G.bevelBox(0.024, 0.046, 0.05, 0.004), m.polyS, [0, -0.108, -0.027], [0.48, 0, 0], null, 'magSeg2'),
    P(B(0.028, 0.01, 0.056, 0.002), m.polyS, [0, -0.13, -0.036], [0.48, 0, 0], null, 'basePlate'),
  ];
  if (d) magParts.push(P(G.box(0.025, 0.095, 0.005), m.anod, [0, -0.065, -0.036], [0.3, 0, 0], null, 'witnessSpine'));
  const magazine = grp('magazine', magParts);
  magazine.position.set(0, 0.0, -0.023);
  group.add(magazine);

  return {
    group,
    parts: {
      receiver, barrel, bolt, magazine, handguard, stock, muzzleDevice, trigger, chargingHandle,
      sights: { front, rear, optic },
      ejectionPort: ePort,
    },
    anchors: {
      muzzle: [0, 0.065, -0.53],
      eject: [0.026, 0.066, 0.018],
      sight: [0, sightY, 0.15],
      mag: [0, -0.012, -0.027],
    },
    sightInfo: { y: sightY, frontZ: -0.325, rearZ: 0.068 },
    anim: { blowback: 'bolt', travel: 0.045, magDrop: 0.16, magDir: [0, -1, -0.28], charge: 'chargingHandle', chargeTravel: 0.05 },
  };
}

/* ------------------------------------------------------------------ */
/* Borealis B-12 — 12-gauge with wood furniture                        */
/* 1.02 long × 0.23 tall, bore y = 0.06, aim line y = 0.103            */
/* ------------------------------------------------------------------ */

function buildBorealis(o) {
  const { d, fp, seg, m } = o;
  const B = smallBox(d);
  const group = new THREE.Group();
  const sightY = 0.103;
  const stockShift = fp ? -0.075 : 0;

  /* receiver */
  const recParts = [
    P(G.bevelBox(0.042, 0.062, 0.15, 0.005), m.gm, [0, 0.058, -0.025], null, null, 'body'),
    P(B(0.036, 0.02, 0.05, 0.004), m.gm, [0, 0.022, 0.02], null, null, 'tang'),
    // loading port under the receiver — a real opening
    P(G.box(0.03, 0.01, 0.06), cavityMat(), [0, 0.025, -0.03], null, null, 'loadingPort'),
    // trigger guard
    P(B(0.006, 0.022, 0.007, 0.002), m.gm, [0, 0.002, -0.026], null, null, 'guardFront'),
    P(B(0.006, 0.007, 0.046, 0.002), m.gm, [0, -0.008, -0.004], null, null, 'guardBottom'),
  ];
  if (d) {
    recParts.push(brandPlate('BOREALIS', 0.06, 0.012, [-0.0212, 0.06, -0.03], -1, 'ORDNANCE 12GA'));
    recParts.push(brandPlate('B-12', 0.026, 0.01, [0.0212, 0.075, -0.06], 1));
    recParts.push(P(G.cyl(0.004, 0.004, 0.046, seg(10)), m.anod, [0, 0.075, 0.03], [Math.PI / 2, 0, 0], null, 'pin'));
  }
  const receiver = grp('receiver', recParts);
  group.add(receiver);

  /* barrel + under-barrel tube magazine */
  const barrel = grp('barrel', [
    P(G.cyl(0.0115, 0.0122, 0.52, seg(22)), m.gm, [0, 0.0715, -0.355], [Math.PI / 2, 0, 0], null, 'barrelTube'),
    P(B(0.012, 0.014, 0.02, 0.003), m.gm, [0, 0.086, -0.1], null, null, 'chamberRib'),
  ]);
  group.add(barrel);
  const magParts = [
    P(G.cyl(0.0105, 0.0105, 0.34, seg(18)), m.gm, [0, 0.045, -0.265], [Math.PI / 2, 0, 0], null, 'tube'),
    P(G.cyl(0.0115, 0.0115, 0.014, seg(16)), m.anod, [0, 0.045, -0.432], [Math.PI / 2, 0, 0], null, 'capNut'),
  ];
  if (d) {
    magParts.push(P(G.bevelBox(0.008, 0.028, 0.014, 0.002), m.gm, [0, 0.058, -0.425], null, null, 'barrelClamp'));
    magParts.push(slingLoop(m.anod, [0, 0.031, -0.425], [0, Math.PI / 2, 0]));
  }
  const magazine = grp('magazine', magParts);
  group.add(magazine);

  /* castellated standoff breacher muzzle */
  const mdParts = [
    P(G.cyl(0.0145, 0.0145, 0.032, seg(18)), m.anod, [0, 0.0715, -0.622], [Math.PI / 2, 0, 0], null, 'standoff'),
  ];
  if (d) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      mdParts.push(P(G.box(0.005, 0.005, 0.006), m.anod,
        [Math.sin(a) * 0.0115, 0.0715 + Math.cos(a) * 0.0115, -0.639], null, null, 'tooth'));
    }
  }
  const muzzleDevice = grp('muzzleDevice', mdParts);
  group.add(muzzleDevice);

  /* sliding wooden fore-end (pumpGrip) around the mag tube */
  const pumpParts = [
    P(G.bevelBox(0.048, 0.05, 0.155, 0.008), m.wood, [0, 0.052, 0], null, null, 'foreEnd'),
  ];
  if (d) {
    for (let i = 0; i < 4; i++) {
      pumpParts.push(P(G.box(0.0492, 0.0035, 0.005), m.wood, [0, 0.035, -0.055 + i * 0.036], null, null, 'grooveRidge'));
    }
  }
  const pumpGrip = grp('pumpGrip', pumpParts);
  pumpGrip.position.set(0, 0, -0.24);
  group.add(pumpGrip);

  /* wooden stock with rubber recoil pad */
  const stockParts = [
    P(G.bevelBox(0.04, 0.056, 0.1, 0.007), m.wood, [0, 0.035, 0.075 + stockShift], [-0.12, 0, 0], null, 'wrist'),
    P(G.bevelBox(0.042, 0.05, 0.22, 0.007), m.wood, [0, 0.058, 0.21 + stockShift], [0.055, 0, 0], null, 'comb'),
    P(G.bevelBox(0.042, 0.125, 0.1, 0.008), m.wood, [0, -0.005, 0.318 + stockShift], [-0.1, 0, 0], null, 'buttBlock'),
    P(B(0.04, 0.05, 0.062, 0.007), m.wood, [0, -0.072, 0.335 + stockShift], [-0.24, 0, 0], null, 'toe'),
    P(B(0.04, 0.132, 0.016, 0.004), m.rub, [0, -0.004, 0.372 + stockShift], [-0.06, 0, 0], null, 'recoilPad'),
  ];
  if (d) {
    stockParts.push(slingLoop(m.anod, [0, -0.088, 0.3 + stockShift], [0, Math.PI / 2, 0]));
    stockParts.push(P(G.bevelBox(0.043, 0.012, 0.05, 0.003), m.rub, [0, 0.085, 0.2 + stockShift], null, null, 'cheekPad'));
  }
  const stock = grp('stock', stockParts);
  group.add(stock);

  /* sights: brass-tone bead on a ramp + ghost ring */
  const front = frontSightGroup(m.alu, { postH: 0.004, ears: false, d, width: 0.003 });
  front.position.set(0, sightY, -0.59);
  if (d) {
    front.add(G.buildParts([P(G.sphere(0.0026, 10, 8), m.alu, [0, 0, 0], null, null, 'bead')]));
  }
  group.add(front);
  const rear = rearSightGroup(m.anod, { style: 'ghost', d });
  rear.position.set(0, sightY, 0.042);
  group.add(rear);

  /* big ejection port + reciprocating bolt with its charging handle */
  const ePort = ejectionPortGroup(m.gm, { len: 0.062, h: 0.024, depth: 0.014, d });
  ePort.position.set(0.021, 0.062, -0.045);
  group.add(ePort);
  const bolt = grp('bolt', [
    P(B(0.014, 0.02, 0.06, 0.003), m.alu, [0, 0, 0], null, null, 'boltBlock'),
  ]);
  bolt.position.set(0.011, 0.062, -0.045);
  group.add(bolt);
  const chargingHandle = grp('chargingHandle', [
    P(B(0.016, 0.008, 0.012, 0.002), m.anod, [0.014, 0, 0.01], null, null, 'handleTab'),
  ]);
  chargingHandle.position.set(0.011, 0.062, -0.045);
  group.add(chargingHandle);

  /* trigger + cross-bolt safety */
  const trigger = grp('trigger', [
    P(B(0.005, 0.019, 0.005, 0.0015), m.gm, [0, -0.011, -0.001], [0.14, 0, 0], null, 'blade'),
  ]);
  trigger.position.set(0, 0.014, -0.004);
  group.add(trigger);
  if (d) {
    group.add(grp('safety', [
      P(G.cyl(0.0045, 0.0045, 0.048, seg(10)), m.anod, [0, 0.004, 0.018], [0, 0, Math.PI / 2], null, 'crossBolt'),
    ]));
  }

  return {
    group,
    parts: {
      receiver, barrel, bolt, magazine, stock, muzzleDevice, trigger, chargingHandle, pumpGrip,
      sights: { front, rear },
      ejectionPort: ePort,
      handguard: pumpGrip,
    },
    anchors: {
      muzzle: [0, 0.0715, -0.64],
      eject: [0.031, 0.066, -0.045],
      sight: [0, sightY, 0.14],
      mag: [0, 0.018, -0.03],
    },
    sightInfo: { y: sightY, frontZ: -0.59, rearZ: 0.042 },
    anim: { blowback: 'bolt', travel: 0.055, pump: 'pumpGrip', pumpTravel: 0.085, shell: true },
  };
}

/* ------------------------------------------------------------------ */
/* Meridian M-700 — precision rifle with scope                         */
/* 1.16 long × 0.29 tall, bore y = 0.065, scope axis y = 0.14          */
/* ------------------------------------------------------------------ */

function buildMeridian(o) {
  const { d, fp, seg, m } = o;
  const B = smallBox(d);
  const group = new THREE.Group();
  const sightY = 0.14; // scope optical axis
  const gs = fp ? 1.05 : 1;
  const stockShift = fp ? -0.16 : 0;

  /* round receiver in an aluminium chassis */
  const recParts = [
    P(G.cyl(0.021, 0.021, 0.185, seg(20)), m.gm, [0, 0.068, 0.02], [Math.PI / 2, 0, 0], null, 'action'),
    P(G.bevelBox(0.046, 0.045, 0.27, 0.005), m.alu, [0, 0.038, -0.005], null, null, 'chassisCentre'),
    // trigger guard
    P(B(0.006, 0.02, 0.007, 0.002), m.alu, [0, 0.0, 0.028], null, null, 'guardFront'),
    P(B(0.006, 0.007, 0.05, 0.002), m.alu, [0, -0.009, 0.052], null, null, 'guardBottom'),
    // vertical target grip
    P(G.bevelBox(0.032 * gs, 0.098, 0.046 * gs, 0.007), m.polyS, [0, -0.042, 0.085], [-0.16, 0, 0], null, 'gripCore'),
  ];
  if (d) {
    recParts.push(P(G.bevelBox(0.034 * gs, 0.05, 0.032, 0.003), m.rub, [0, -0.045, 0.088], [-0.16, 0, 0], null, 'gripPanel'));
    recParts.push(brandPlate('MERIDIAN', 0.062, 0.012, [-0.0232, 0.038, -0.05], -1, 'PRECISION 7.62'));
    recParts.push(brandPlate('M-700', 0.028, 0.01, [0.0232, 0.038, 0.04], 1));
  }
  recParts.push(...railParts(m.anod, { len: 0.16, y: 0.096, zc: 0.0, d }));
  const receiver = grp('receiver', recParts);
  group.add(receiver);

  /* fore-end with cooling slots + bipod stud */
  const hgParts = [
    P(G.bevelBox(0.048, 0.055, 0.245, 0.006), m.alu, [0, 0.052, -0.245], null, null, 'foreEnd'),
  ];
  if (d) {
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 5; i++) {
        hgParts.push(P(G.box(0.005, 0.018, 0.03), cavityMat(), [side * 0.024, 0.052, -0.16 - i * 0.042], null, null, 'coolingSlot'));
      }
    }
    hgParts.push(P(G.cyl(0.004, 0.004, 0.008, 8), m.anod, [0, 0.022, -0.33], null, null, 'bipodStud'));
    hgParts.push(slingLoop(m.anod, [-0.026, 0.045, -0.34], [0, 0, Math.PI / 2]));
  }
  const handguard = grp('handguard', hgParts);
  group.add(handguard);

  /* heavy tapered barrel + side-ported brake */
  const barrel = grp('barrel', [
    P(G.cyl(0.011, 0.0135, 0.42, seg(24)), m.gm, [0, 0.068, -0.46], [Math.PI / 2, 0, 0], null, 'barrelTube'),
  ]);
  group.add(barrel);
  const mdParts = [
    P(G.bevelBox(0.028, 0.028, 0.048, 0.004), m.anod, [0, 0.068, -0.676], null, null, 'brakeBody'),
    P(G.cyl(0.0075, 0.0075, 0.004, seg(12)), cavityMat(), [0, 0.068, -0.6995], [Math.PI / 2, 0, 0], null, 'exitPort'),
  ];
  if (d) {
    for (let i = 0; i < 3; i++) {
      mdParts.push(P(G.box(0.032, 0.012, 0.007), cavityMat(), [0, 0.068, -0.664 - i * 0.011], null, null, 'brakePort'));
    }
  }
  const muzzleDevice = grp('muzzleDevice', mdParts);
  group.add(muzzleDevice);

  /* skeletal precision stock */
  const stockParts = [
    P(G.bevelBox(0.036, 0.05, 0.22, 0.005), m.polyS, [0, 0.05, 0.245 + stockShift], null, null, 'spine'),
    P(B(0.032, 0.02, 0.13, 0.004), m.polyS, [0, 0.092, 0.27 + stockShift], null, null, 'cheekRiser'),
    P(G.bevelBox(0.038, 0.13, 0.06, 0.006), m.polyS, [0, 0.008, 0.4 + stockShift], null, null, 'buttFrame'),
    P(B(0.036, 0.135, 0.016, 0.004), m.rub, [0, 0.008, 0.442 + stockShift], null, null, 'recoilPad'),
    P(G.bevelBox(0.028, 0.05, 0.11, 0.005), m.polyS, [0, -0.075, 0.352 + stockShift], [0.28, 0, 0], null, 'hook'),
  ];
  if (d) {
    stockParts.push(P(G.cyl(0.008, 0.008, 0.01, seg(12)), m.anod, [0.021, 0.092, 0.3 + stockShift], [0, 0, Math.PI / 2], null, 'cheekKnob'));
    stockParts.push(P(G.cyl(0.008, 0.008, 0.01, seg(12)), m.anod, [0.021, 0.02, 0.395 + stockShift], [0, 0, Math.PI / 2], null, 'lopKnob'));
    stockParts.push(slingLoop(m.anod, [0, -0.098, 0.33 + stockShift], [0, Math.PI / 2, 0]));
  }
  const stock = grp('stock', stockParts);
  group.add(stock);

  /* scope — the primary optic; axis carries the aim line */
  const scopeParts = [
    P(G.cyl(0.0155, 0.0155, 0.17, seg(20)), m.anod, [0, 0, -0.015], [Math.PI / 2, 0, 0], null, 'mainTube'),
    P(G.cyl(0.0215, 0.0165, 0.055, seg(20)), m.anod, [0, 0, -0.125], [-Math.PI / 2, 0, 0], null, 'objectiveBell'),
    P(G.cyl(0.0175, 0.0155, 0.045, seg(20)), m.anod, [0, 0, 0.082], [Math.PI / 2, 0, 0], null, 'ocularBell'),
    P(G.cyl(0.0185, 0.0185, 0.002, seg(18)), lensMat(), [0, 0, -0.1515], [Math.PI / 2, 0, 0], null, 'objectiveLens'),
    P(G.cyl(0.0145, 0.0145, 0.002, seg(16)), lensMat(), [0, 0, 0.1035], [Math.PI / 2, 0, 0], null, 'ocularLens'),
    // rings + mounts to the rail
    P(B(0.026, 0.03, 0.014, 0.003), m.anod, [0, -0.024, -0.06], null, null, 'mountFront'),
    P(B(0.026, 0.03, 0.014, 0.003), m.anod, [0, -0.024, 0.045], null, null, 'mountRear'),
    P(G.torus(0.016, 0.0035, 6, seg(18)), m.anod, [0, 0, -0.06], null, null, 'ringFront'),
    P(G.torus(0.016, 0.0035, 6, seg(18)), m.anod, [0, 0, 0.045], null, null, 'ringRear'),
  ];
  if (d) {
    scopeParts.push(P(G.cyl(0.009, 0.009, 0.016, seg(14)), m.anod, [0, 0.021, -0.008], null, null, 'elevationTurret'));
    scopeParts.push(P(G.cyl(0.009, 0.009, 0.016, seg(14)), m.anod, [0.021, 0, -0.008], [0, 0, Math.PI / 2], null, 'windageTurret'));
    scopeParts.push(P(G.cyl(0.0165, 0.0165, 0.012, seg(16)), m.anod, [0, 0, 0.062], [Math.PI / 2, 0, 0], null, 'magRing'));
  }
  const optic = grp('sight.optic', scopeParts);
  optic.position.set(0, sightY, -0.04);
  group.add(optic);

  /* folded backup irons (stowed flat on the rail) */
  const front = grp('sight.front', [
    P(B(0.014, 0.005, 0.018, 0.0015), m.anod, [0, 0, 0], null, null, 'foldedFront'),
  ]);
  front.position.set(0, 0.102, -0.35);
  group.add(front);
  const rear = grp('sight.rear', [
    P(B(0.016, 0.005, 0.016, 0.0015), m.anod, [0, 0, 0], null, null, 'foldedRear'),
  ]);
  rear.position.set(0, 0.102, 0.078);
  group.add(rear);

  /* bolt with handle — lifts and travels */
  const boltParts = [
    P(G.cyl(0.0095, 0.0095, 0.075, seg(14)), m.alu, [0, 0, 0.02], [Math.PI / 2, 0, 0], null, 'boltBody'),
    P(G.cyl(0.0045, 0.0045, 0.032, seg(10)), m.gm, [0.019, -0.008, 0.042], [0, 0, 1.02], null, 'handleStem'),
    P(G.sphere(0.0085, seg(12), 8), m.polyS, [0.0315, -0.018, 0.042], null, null, 'handleKnob'),
    P(G.cyl(0.01, 0.01, 0.012, seg(14)), m.gm, [0, 0, 0.062], [Math.PI / 2, 0, 0], null, 'boltShroud'),
  ];
  const bolt = grp('bolt', boltParts);
  bolt.position.set(0, 0.068, 0.055);
  group.add(bolt);

  /* ejection port on the right of the action */
  const ePort = ejectionPortGroup(m.gm, { len: 0.05, h: 0.017, d });
  ePort.position.set(0.019, 0.07, -0.015);
  group.add(ePort);

  /* trigger + tang safety */
  const trigger = grp('trigger', [
    P(B(0.005, 0.018, 0.0045, 0.0015), m.alu, [0, -0.01, -0.001], [0.12, 0, 0], null, 'blade'),
  ]);
  trigger.position.set(0, 0.012, 0.032);
  group.add(trigger);
  if (d) {
    const safety = safetyGroup(m.anod, 1);
    safety.position.set(0.0165, 0.062, 0.085);
    group.add(safety);
  }

  /* five-round box magazine */
  const magParts = [
    P(G.bevelBox(0.027, 0.072, 0.062, 0.004), m.polyS, [0, -0.036, 0], [0.1, 0, 0], null, 'magBody'),
    P(B(0.031, 0.01, 0.068, 0.002), m.polyS, [0, -0.073, -0.004], [0.1, 0, 0], null, 'basePlate'),
  ];
  const magazine = grp('magazine', magParts);
  magazine.position.set(0, 0.016, -0.02);
  group.add(magazine);

  return {
    group,
    parts: {
      receiver, barrel, bolt, magazine, handguard, stock, muzzleDevice, trigger,
      sights: { front, rear, optic },
      ejectionPort: ePort,
    },
    anchors: {
      muzzle: [0, 0.068, -0.7],
      eject: [0.027, 0.074, -0.015],
      sight: [0, sightY, 0.19],
      mag: [0, -0.02, -0.022],
    },
    sightInfo: { y: sightY, frontZ: -0.1915, rearZ: 0.0635 }, // scope objective / ocular lens stations
    anim: { blowback: null, magDrop: 0.11, magDir: [0, -1, 0.1], boltLift: 1.0, boltTravel: 0.07 },
  };
}

/* ------------------------------------------------------------------ */
/* Talon TX — tactical knife                                           */
/* 0.28 overall, 0.16 blade                                            */
/* ------------------------------------------------------------------ */

function buildTalon(o) {
  const { d, m } = o;
  const group = new THREE.Group();

  /* blade — clip-point profile, dark coat with a bright grind line */
  const outline = [
    [0, 0.013], [0.098, 0.013], [0.152, 0.005], [0.158, 0.001],
    [0.156, -0.001], [0.1, -0.0125], [0.02, -0.014], [0, -0.014],
  ];
  const bladeGeo = G.extrude(outline, 0.0042, 0.0014, 2);
  const bladeParts = [
    { g: bladeGeo, m: m.gm, p: [0, 0.0, -0.079], r: [0, Math.PI / 2, 0], name: 'bladeCore' },
  ];
  if (d) {
    // bright edge grind + fuller groove
    bladeParts.push(P(G.box(0.0016, 0.0035, 0.135), m.alu, [0, -0.0115, -0.082], [-0.02, 0, 0], null, 'edgeGrind'));
    bladeParts.push(P(G.box(0.0052, 0.0028, 0.08), m.anod, [0, 0.0065, -0.06], null, null, 'fuller'));
  }
  const blade = grp('blade', bladeParts);
  group.add(blade);

  /* guard, handle, pommel */
  const B = smallBox(d);
  const guard = grp('guard', [
    P(B(0.012, 0.046, 0.008, 0.0025), m.alu, [0, 0, 0.002], null, null, 'crossGuard'),
  ]);
  group.add(guard);
  const handleParts = [
    P(G.bevelBox(0.02, 0.03, 0.105, 0.006), m.rub, [0, -0.001, 0.059], [0.06, 0, 0], null, 'handleCore'),
  ];
  if (d) {
    for (let i = 0; i < 3; i++) {
      handleParts.push(P(G.torus(0.0148, 0.0022, 5, 12), m.rub, [0, -0.001, 0.03 + i * 0.026], [0, 0, 0], null, 'gripRing'));
    }
    handleParts.push(brandPlate('TALON', 0.032, 0.008, [0.0108, 0.004, 0.056], 1));
  }
  const handle = grp('handle', handleParts);
  group.add(handle);
  const pommel = grp('pommel', [
    P(B(0.019, 0.028, 0.014, 0.005), m.anod, [0, -0.004, 0.116], null, null, 'cap'),
  ]);
  group.add(pommel);
  const lanyard = grp('lanyardHole', [
    P(G.torus(0.005, 0.0018, 5, 12), m.anod, [0, -0.004, 0.1225], [0, Math.PI / 2, 0], null, 'ring'),
  ]);
  group.add(lanyard);

  // contract aliases for the non-firearm
  const sightsFront = mark('sight.front', 0, 0.013, -0.15, group);
  const sightsRear = mark('sight.rear', 0, 0.013, 0.11, group);
  const trigger = mark('trigger', 0, -0.012, 0.03, group);

  return {
    group,
    parts: {
      receiver: handle, barrel: blade, magazine: pommel, muzzleDevice: guard,
      sights: { front: sightsFront, rear: sightsRear },
      ejectionPort: lanyard, trigger,
    },
    anchors: {
      muzzle: [0, 0.001, -0.158],
      eject: [0.01, -0.004, 0.1225],
      sight: [0, 0.013, 0.16],
      mag: [0, -0.02, 0.06],
    },
    sightInfo: null,
    anim: { melee: true },
  };
}

/* ------------------------------------------------------------------ */
/* Halo / Veil — issued cylindrical devices                            */
/* 0.135 tall × 0.055 dia                                              */
/* ------------------------------------------------------------------ */

function buildGrenade(o, kind) {
  const { d, seg, m } = o;
  const B = smallBox(d);
  const group = new THREE.Group();
  const isFlash = kind === 'flash';
  const bodyMat = isFlash ? m.anod : m.poly;
  const baseY = -0.048;

  /* body — lathe profile, base at y = baseY */
  const profile = [
    [0.004, 0], [0.02, 0.0015], [0.0262, 0.007], [0.0273, 0.016],
    [0.0273, 0.082], [0.0258, 0.093], [0.017, 0.099], [0.0125, 0.101],
    [0.0118, 0.108], [0.003, 0.109],
  ];
  const bodyParts = [
    { g: G.lathe(profile, seg(22)), m: bodyMat, p: [0, baseY, 0], name: 'canister' },
  ];
  // label band
  bodyParts.push(P(
    G.cyl(0.0278, 0.0278, 0.02, seg(22), true),
    isFlash ? bandMat('halo', 'HALO M2 FLASH', 'rgba(214,222,228,0.96)') : bandMat('veil', 'VEIL S4 SMOKE', 'rgba(150,168,180,0.96)'),
    [0, baseY + 0.052, 0], null, null, 'labelBand',
  ));
  if (d) {
    if (isFlash) {
      // vent hole rows
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + row * 0.5;
          bodyParts.push(P(G.cyl(0.0028, 0.0028, 0.0018, 8), cavityMat(),
            [Math.sin(a) * 0.0272, baseY + 0.022 + row * 0.058, Math.cos(a) * 0.0272],
            [Math.PI / 2, a, 0], null, 'ventHole'));
        }
      }
    } else {
      // top emission ports
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        bodyParts.push(P(G.cyl(0.0035, 0.0035, 0.0018, 8), cavityMat(),
          [Math.sin(a) * 0.017, baseY + 0.1, Math.cos(a) * 0.017], null, null, 'emissionPort'));
      }
    }
  }
  const body = grp('body', bodyParts);
  group.add(body);

  /* fuze head */
  const fuze = grp('fuzeHead', [
    P(G.cyl(0.0105, 0.0118, 0.014, seg(14)), m.alu, [0, baseY + 0.115, 0], null, null, 'fuzeBody'),
    P(B(0.016, 0.012, 0.02, 0.003), m.alu, [0, baseY + 0.126, 0.002], null, null, 'fuzeCap'),
  ]);
  group.add(fuze);

  /* safety lever hugging the body */
  const lever = grp('lever', [
    P(B(0.014, 0.02, 0.0028, 0.001), m.alu, [0, baseY + 0.121, 0.0135], [0.45, 0, 0], null, 'leverTop'),
    P(B(0.014, 0.062, 0.0025, 0.001), m.alu, [0, baseY + 0.082, 0.0285], [-0.06, 0, 0], null, 'leverArm'),
  ]);
  group.add(lever);

  /* pull ring + pin */
  const pinParts = [
    P(G.torus(0.0105, 0.0018, 5, seg(14)), m.alu, [0, baseY + 0.121, -0.019], [0, Math.PI / 2, 0], null, 'pullRing'),
    P(G.cyl(0.0016, 0.0016, 0.014, 8), m.alu, [0, baseY + 0.126, -0.007], [0, 0, Math.PI / 2], null, 'pin'),
  ];
  const pin = grp('pin', pinParts);
  group.add(pin);

  const sightsFront = mark('sight.front', 0, 0.06, -0.02, group);
  const sightsRear = mark('sight.rear', 0, 0.06, 0.02, group);

  return {
    group,
    parts: {
      receiver: body, barrel: fuze, magazine: pin, muzzleDevice: fuze,
      sights: { front: sightsFront, rear: sightsRear },
      ejectionPort: lever, trigger: lever,
    },
    anchors: {
      muzzle: [0, baseY + 0.132, 0],
      eject: [0.012, baseY + 0.121, -0.019],
      sight: [0, 0.08, 0.05],
      mag: [0, baseY, 0],
    },
    sightInfo: null,
    anim: { throwable: true },
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const BUILDERS = {
  'pistol.vsc9': buildVsc9,
  'smg.kestrel': buildKestrel,
  'rifle.northwind': buildNorthwind,
  'shotgun.borealis': buildBorealis,
  'dmr.meridian': buildMeridian,
  'knife.talon': buildTalon,
  'flash.halo': (o) => buildGrenade(o, 'flash'),
  'smoke.veil': (o) => buildGrenade(o, 'smoke'),
};

/**
 * Build a weapon model.
 * Returns { group, parts, muzzleTip, ejectPoint, sightPoint, magPoint, boundingHeight }.
 */
export function buildWeaponModel(weaponId, { firstPerson = false, lod = 0 } = {}) {
  const builder = BUILDERS[weaponId];
  if (!builder) throw new Error(`[weapons] unknown weapon id "${weaponId}"`);
  const d = lod === 0;
  const o = {
    d,
    fp: firstPerson,
    seg: (n) => (d ? n : Math.max(8, Math.round(n * 0.55))),
    m: sharedMats(),
  };
  const r = builder(o);
  const group = r.group;
  group.name = `wpn.${weaponId}${firstPerson ? '.fp' : ''}${lod ? `.lod${lod}` : ''}`;

  const muzzleTip = mark('muzzleTip', ...r.anchors.muzzle, group);
  const ejectPoint = mark('ejectPoint', ...r.anchors.eject, group);
  const sightPoint = mark('sightPoint', ...r.anchors.sight, group);
  const magPoint = mark('magPoint', ...r.anchors.mag, group);
  if (r.sightInfo) {
    mark('aim.front', 0, r.sightInfo.y, r.sightInfo.frontZ, group);
    mark('aim.rear', 0, r.sightInfo.y, r.sightInfo.rearZ, group);
  }

  const bb = new THREE.Box3().setFromObject(group);
  const boundingHeight = bb.max.y - bb.min.y;
  group.userData = {
    weaponId, firstPerson, lod,
    anim: r.anim ?? {},
    sightInfo: r.sightInfo ?? null,
  };

  return { group, parts: r.parts, muzzleTip, ejectPoint, sightPoint, magPoint, boundingHeight };
}

/**
 * A weapon posed for a floor pickup: reduced LOD model lying naturally over a
 * subtle emissive base ring. Returns a THREE.Group whose origin is the floor
 * contact point; the game may slow-rotate group.userData.spinner.
 */
export function buildPickup(weaponId) {
  const { group: model } = buildWeaponModel(weaponId, { lod: 1 });
  const root = new THREE.Group();
  root.name = `pickup.${weaponId}`;

  const spinner = new THREE.Group();
  spinner.name = 'spinner';
  root.add(spinner);

  const upright = weaponId.startsWith('flash.') || weaponId.startsWith('smoke.') || weaponId.startsWith('knife.');
  if (upright) {
    model.rotation.set(weaponId.startsWith('knife.') ? -Math.PI / 2 : 0, 0.6, 0);
  } else {
    model.rotation.set(0, 0.35, -Math.PI / 2 + 0.14); // lying on its right flank
  }
  spinner.add(model);
  spinner.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(spinner);
  model.position.y -= bb.min.y - 0.015; // rest just above the ring

  const size = new THREE.Vector3();
  bb.getSize(size);
  const radius = Math.min(0.42, Math.max(0.14, Math.max(size.x, size.z) * 0.5 + 0.05));
  const ring = new THREE.Mesh(G.torus(radius, 0.008, 6, 36), pickupRingMat());
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.012;
  ring.name = 'baseRing';
  root.add(ring);
  const glow = new THREE.Mesh(G.cyl(radius - 0.01, radius - 0.01, 0.002, 28), pickupGlowMat());
  glow.position.y = 0.006;
  glow.name = 'baseGlow';
  root.add(glow);

  root.userData = { weaponId, spinner };
  return root;
}

/* ------------------------------------------------------------------ */
/* Manifest registration                                               */
/* ------------------------------------------------------------------ */

const MODEL_SPECS = {
  'pistol.vsc9': {
    dims: '0.195 L × 0.135 H × 0.032 W',
    materials: ['metal.gunmetal (slide, barrel)', 'metal.blackAnodised (controls, collar)', 'metal.aluminium (chamber hood)', 'plastic.dark (frame, grip)', 'plastic.smooth (magazine, trigger)', 'rubber.black (grip stipple)'],
    accept: 'Polymer frame reads as plastic against the steel slide; slide, magazine and trigger are separate animatable groups; front post centres in the rear notch from sightPoint; recessed ejection port with barrel hood visible; VASCO maker\'s mark on the slide.',
  },
  'smg.kestrel': {
    dims: '0.50 L (stock extended) × 0.24 H',
    materials: ['metal.blackAnodised (tube receiver, rails)', 'metal.gunmetal (barrel)', 'metal.aluminium (bolt, stock struts)', 'plastic.dark (housing, handguard, grip)', 'plastic.smooth (magazine)', 'rubber.black (butt pad, grip panel)'],
    accept: 'Tubular receiver with vented handguard and slotted compensator; reciprocating left-side charging handle and visible bolt in a recessed port; aperture rear + protected post; KESTREL ARMS mark.',
  },
  'rifle.northwind': {
    dims: '0.84 L × 0.26 H',
    materials: ['metal.blackAnodised (upper, handguard, rails)', 'metal.gunmetal (barrel, gas block)', 'metal.aluminium (bolt carrier)', 'plastic.dark (lower, grip, stock)', 'plastic.smooth (magazine)', 'rubber.black (butt pad, grip panel)'],
    accept: 'Slotted octagonal handguard, three-prong hider, curved three-segment magazine, T charging handle, dust-covered ejection port with a visible carrier, co-witnessed reflex optic over flip irons; NORTHWIND mark.',
  },
  'shotgun.borealis': {
    dims: '1.02 L × 0.23 H',
    materials: ['metal.gunmetal (receiver, barrel, mag tube)', 'metal.blackAnodised (cap, standoff, safety)', 'metal.aluminium (bolt, bead)', 'wood.dark (stock, sliding fore-end)', 'rubber.black (recoil pad, cheek pad)'],
    accept: 'Dark wood furniture clearly distinct from the steel; sliding fore-end (pumpGrip), reciprocating bolt with handle tab, under-barrel tube magazine, real loading port, ghost ring + bead; BOREALIS mark.',
  },
  'dmr.meridian': {
    dims: '1.16 L (with optic) × 0.29 H',
    materials: ['metal.gunmetal (action, barrel)', 'metal.aluminium (chassis, fore-end, bolt)', 'metal.blackAnodised (scope, brake, knobs)', 'plastic.smooth (stock, grip, magazine)', 'rubber.black (recoil pad, grip panel)'],
    accept: 'Heavy tapered barrel with a side-ported brake, full scope with objective/ocular lenses, turrets and rings on the chassis rail, lifting/travelling bolt with ball knob, folded backup irons; MERIDIAN mark.',
  },
  'knife.talon': {
    dims: '0.28 overall, 0.16 blade',
    materials: ['metal.gunmetal (blade coat)', 'metal.aluminium (edge grind, guard)', 'metal.blackAnodised (fuller, pommel)', 'rubber.black (handle)'],
    accept: 'Clip-point extruded blade with a bright edge grind and fuller, rubber handle with grip rings, guard, pommel with lanyard ring; TALON mark.',
  },
  'flash.halo': {
    dims: '0.135 H × 0.055 dia',
    materials: ['metal.blackAnodised (canister)', 'metal.aluminium (fuze, lever, pin)'],
    accept: 'Lathe-turned canister with two rows of vent holes, painted HALO M2 FLASH band, sprung lever, pull ring and pin as separate groups.',
  },
  'smoke.veil': {
    dims: '0.135 H × 0.055 dia',
    materials: ['plastic.dark (canister)', 'metal.aluminium (fuze, lever, pin)'],
    accept: 'Lathe-turned canister with top emission ports, painted VEIL S4 SMOKE band, sprung lever, pull ring and pin as separate groups.',
  },
};

let registered = false;
export function registerWeaponModelManifest() {
  if (registered) return;
  registered = true;
  for (const id of WEAPON_MODEL_IDS) {
    const def = WEAPONS[id];
    const spec = MODEL_SPECS[id];
    reg({
      id: `wpn.model.${id}`,
      name: `${def?.fullName ?? id} — weapon model`,
      category: 'weapon',
      owner: OWNERS.FABLE4,
      files: ['src/weapons/models.js'],
      usedIn: 'first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery',
      dimensions: spec.dims,
      pivot: 'grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint',
      materials: spec.materials,
      textures: ['procedural material sets (brushed/painted metal, plastics, rubber, wood)', 'painted() alpha maker\'s-mark decals'],
      collision: 'none — attached to hands; pickups use a game-side trigger radius',
      lod: 'lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail',
      animations: 'moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim',
      status: 'built',
      acceptance: spec.accept,
    });
  }
  reg({
    id: 'wpn.pickup.base',
    name: 'Weapon pickup base ring',
    category: 'weapon',
    owner: OWNERS.FABLE4,
    files: ['src/weapons/models.js'],
    usedIn: 'floor weapon pickups (buildPickup)',
    dimensions: 'ring radius 0.14–0.42 m auto-fit to the posed weapon',
    pivot: 'floor contact point, +Y up',
    materials: ['emissive cyan ring (brand accent)', 'faint additive glow disc'],
    textures: ['none — solid emissive'],
    collision: 'none',
    lod: 'single LOD (36-seg torus)',
    status: 'built',
    acceptance: 'Reduced-LOD weapon rests naturally above a subtle emissive ring; emissive stays below bloom threshold at default exposure.',
  });
}
