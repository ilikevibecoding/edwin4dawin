import * as THREE from 'three';
import { bevelBox, box, cyl, sphere, torus, mesh } from '../map/kit.js';
import { hardPlastic, plainMaterial, leather } from '../art/materials.js';
import { garment, skinSurface } from './charmats.js';
import { generateImageTexture } from '../art/texgen.js';
import { assets } from '../core/assets.js';
import { Rng, hashString } from '../core/rng.js';
import { SkeletonRig, buildSegmentedBody, buildSimplifiedBody, mergeRigMeshesPerBone } from './rig.js';
import { AnimationController } from './animation.js';
import { registerCharacterAssets } from './manifest.js';

// ---------------------------------------------------------------------------
// Hostage characters.  (owner: fable4)
//
//   analyst  — Dr. Rhea Calloway: cardigan over a blouse, lanyard, glasses,
//              hair in a low bun.
//   director — Martin Oyelaran: shirt sleeves rolled to the forearm, tie,
//              clip-on ID badge, short cropped hair.
//
// Both use the shared rig/animator. They start with wrists zip-tied behind
// the back (`hostage_idle` pose + visible tie); `setSecured(true)` removes
// the tie and unlocks the hands-free poses.
// ---------------------------------------------------------------------------

export const HOSTAGE_VARIANTS = ['analyst', 'director'];

function idBadgeTexture(name, accent) {
  return generateImageTexture(`char:badge:${name}`, 64, 96, (ctx, w, h) => {
    ctx.fillStyle = '#e8ecef';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, 18);
    ctx.fillStyle = '#9aa4ac';
    ctx.fillRect(14, 26, 36, 34); // portrait block
    ctx.fillStyle = '#3a4750';
    ctx.fillRect(10, 68, 44, 5);
    ctx.fillRect(10, 78, 30, 5);
  });
}

function addPart(parent, geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = mesh(geo, mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  parent.add(m);
  return m;
}

function civilianHead(headBone, skin, hairMat, { bun = false, glasses = false } = {}) {
  const g = new THREE.Group();
  g.name = 'head-geo';
  const skull = addPart(g, sphere(0.09, 14), skin, 0, 0.112, 0.008);
  skull.scale.set(0.9, 1.04, 0.98);
  addPart(g, bevelBox(0.098, 0.07, 0.092, 0.02), skin, 0, 0.045, 0.01);   // jaw
  addPart(g, bevelBox(0.048, 0.026, 0.026, 0.008), skin, 0, 0.028, -0.058); // chin
  addPart(g, bevelBox(0.078, 0.016, 0.02, 0.006), skin, 0, 0.132, -0.068);  // brow
  addPart(g, bevelBox(0.016, 0.046, 0.018, 0.005), skin, 0, 0.096, -0.082, { rx: 0.15 });
  addPart(g, bevelBox(0.022, 0.018, 0.016, 0.005), skin, 0, 0.073, -0.086); // nose tip
  addPart(g, bevelBox(0.018, 0.024, 0.028, 0.007), skin, -0.045, 0.093, -0.049, { ry: 0.35 });
  addPart(g, bevelBox(0.018, 0.024, 0.028, 0.007), skin, 0.045, 0.093, -0.049, { ry: -0.35 });
  const eyeMat = plainMaterial(0x22201d, { roughness: 0.25 }, 'eye');
  addPart(g, sphere(0.0095, 8), eyeMat, -0.03, 0.115, -0.071);
  addPart(g, sphere(0.0095, 8), eyeMat, 0.03, 0.115, -0.071);
  addPart(g, bevelBox(0.013, 0.032, 0.024, 0.005), skin, -0.084, 0.102, 0.008);
  addPart(g, bevelBox(0.013, 0.032, 0.024, 0.005), skin, 0.084, 0.102, 0.008);

  // Hair cap.
  const hair = addPart(g, sphere(0.093, 12), hairMat, 0, 0.128, 0.018);
  hair.scale.set(0.92, 0.88, 0.98);
  if (bun) {
    addPart(g, sphere(0.038, 10), hairMat, 0, 0.13, 0.098);
    addPart(g, bevelBox(0.16, 0.05, 0.09, 0.02), hairMat, 0, 0.06, 0.055); // nape
  }
  if (glasses) {
    const frame = hardPlastic(0x1f1d1b, 'hostage-glasses', 0.35);
    addPart(g, torus(0.023, 0.0025, 12, 6), frame, -0.032, 0.115, -0.082);
    addPart(g, torus(0.023, 0.0025, 12, 6), frame, 0.032, 0.115, -0.082);
    addPart(g, box(0.02, 0.004, 0.004), frame, 0, 0.118, -0.082);
    addPart(g, box(0.004, 0.004, 0.09), frame, -0.055, 0.118, -0.038, { ry: 0.1 });
    addPart(g, box(0.004, 0.004, 0.09), frame, 0.055, 0.118, -0.038, { ry: -0.1 });
  }
  headBone.add(g);
  return g;
}

function outfitAnalyst(rig, rng) {
  const B = rig.bones;
  const cardigan = garment('hostage-cardigan', { tint: 0x6e6167, mode: 'knit', valueVar: 0.11 });
  const blouse = garment('hostage-blouse', { tint: 0xaeb2b4, mode: 'poplin' });
  const slacks = garment('hostage-slacks', { tint: 0x383c42, mode: 'twill' });
  const skin = skinSurface('analyst', 0xc7a48e);
  const mats = {
    skin, torso: blouse, belly: cardigan, hips: slacks, arm: cardigan, forearm: cardigan,
    hand: skin, thigh: slacks, shin: slacks,
    boot: leather(0x2e2620, 'hostage-flat'),
  };
  const { parts } = buildSegmentedBody(rig, mats, { bulk: 0.9 });

  // Open cardigan panels + back, longer hem.
  for (const sx of [-1, 1]) {
    addPart(B.chest, bevelBox(0.10, 0.3, 0.028, 0.012), cardigan, sx * 0.10, 0.06, -0.104, { ry: sx * 0.15 });
  }
  addPart(B.chest, bevelBox(0.31, 0.32, 0.035, 0.014), cardigan, 0, 0.07, 0.104);
  addPart(B.spine, bevelBox(0.30, 0.14, 0.20, 0.014), cardigan, 0, 0.0, 0.01);

  // Lanyard: two straps meeting at a card on the chest.
  const lanMat = garment('hostage-lanyard', { tint: 0x2e6a8c, mode: 'twill' });
  addPart(B.chest, box(0.012, 0.24, 0.006), lanMat, -0.05, 0.13, -0.118, { rz: 0.32 });
  addPart(B.chest, box(0.012, 0.24, 0.006), lanMat, 0.05, 0.13, -0.118, { rz: -0.32 });
  const badge = mesh(new THREE.PlaneGeometry(0.055, 0.08),
    new THREE.MeshStandardMaterial({ map: idBadgeTexture('calloway', '#2e6a8c'), roughness: 0.5 }),
    { cast: false });
  badge.position.set(0, -0.005, -0.125);
  badge.rotation.y = Math.PI;
  B.chest.add(badge);
  return { parts, skin };
}

function outfitDirector(rig, rng) {
  const B = rig.bones;
  // Off-white shirting, NOT white: the old 0xd9dde2 blew out under the warm
  // exec-office downlights and read as a paper box.
  const shirt = garment('hostage-shirt', { tint: 0xbcb6a8, mode: 'poplin', valueVar: 0.08 });
  const slacks = garment('hostage-suittrousers', { tint: 0x2e323a, mode: 'twill' });
  const skin = skinSurface('director', 0x7c5f4b);
  const mats = {
    skin, torso: shirt, hips: slacks,
    arm: shirt,
    forearm: skin, // sleeves rolled to the elbow
    hand: skin, thigh: slacks, shin: slacks, boot: leather(0x1f1a16, 'hostage-oxford'),
  };
  const { parts } = buildSegmentedBody(rig, mats, { bulk: 1.02 });

  // Rolled sleeve cuffs at the elbows.
  for (const s of ['L', 'R']) {
    addPart(B[`forearm${s}`], cyl(0.052, 0.05, 0.05, 10), shirt, 0, -0.015, 0);
  }
  // Tie: knot + tapering blade, slightly loosened.
  const tieMat = garment('hostage-tie', { tint: 0x5c2530, mode: 'twill', rough: 0.75 });
  addPart(B.chest, bevelBox(0.045, 0.045, 0.03, 0.01), tieMat, 0, 0.21, -0.115);
  addPart(B.chest, bevelBox(0.06, 0.24, 0.014, 0.006), tieMat, 0.008, 0.06, -0.122, { rz: 0.06 });
  addPart(B.spine, bevelBox(0.065, 0.12, 0.014, 0.006), tieMat, 0.014, 0.06, -0.112, { rz: 0.05 });
  // Belt.
  addPart(B.hips, bevelBox(0.31, 0.03, 0.21, 0.008), leather(0x241d16, 'hostage-belt'), 0, 0.075, 0);
  // Clip-on ID badge on the breast pocket.
  const badge = mesh(new THREE.PlaneGeometry(0.05, 0.072),
    new THREE.MeshStandardMaterial({ map: idBadgeTexture('oyelaran', '#8c2e34'), roughness: 0.5 }),
    { cast: false });
  badge.position.set(-0.095, 0.14, -0.122);
  badge.rotation.y = Math.PI;
  B.chest.add(badge);
  return { parts, skin };
}

/**
 * @param {'analyst'|'director'} variant
 * @returns {{group, rig, animator, hitRegions, setSecured, setLOD, updateLOD, variant, displayName}}
 */
export function buildHostage(variant = 'analyst', opts = {}) {
  registerCharacterAssets();
  if (!HOSTAGE_VARIANTS.includes(variant)) variant = 'analyst';
  const rng = new Rng(hashString(`hostage:${variant}`));
  const rig = new SkeletonRig({ scale: variant === 'analyst' ? 0.94 : 1.0 });

  const { skin } = variant === 'analyst' ? outfitAnalyst(rig, rng) : outfitDirector(rig, rng);
  const hair = plainMaterial(variant === 'analyst' ? 0x54382a : 0x14100d, { roughness: 0.85 }, `hair-${variant}`);
  civilianHead(rig.bones.head, skin, hair, {
    bun: variant === 'analyst',
    glasses: variant === 'analyst',
  });

  // Zip-tie around the wrists, visible while bound. A flat nylon band with a
  // pawl head and a protruding tail — the old fat torus read as a beige ring.
  const zipMat = plainMaterial(0xd4d6d0, { roughness: 0.42 }, 'hostage-zip');
  const tie = new THREE.Group();
  const band = mesh(torus(0.042, 0.0038, 10, 18), zipMat, { cast: false });
  band.rotation.x = Math.PI / 2;
  band.scale.set(1, 1, 1.6); // flatten: ~8 mm wide strap, thin radially
  tie.add(band);
  const head = mesh(bevelBox(0.015, 0.014, 0.012, 0.003), zipMat, { cast: false });
  head.position.set(0.046, 0, 0);
  tie.add(head);
  const tail = mesh(box(0.002, 0.008, 0.05), zipMat, { cast: false });
  tail.position.set(0.052, 0.014, -0.02);
  tail.rotation.set(0.5, 0, 0.18);
  tie.add(tail);
  tie.position.set(0, -0.05, 0.02);
  // visibility toggles independently of LOD
  tie.traverse((o) => { if (o.isMesh) o.userData.noMerge = true; });
  rig.bones.handR.add(tie);

  const group = new THREE.Group();
  group.name = `hostage:${variant}`;
  group.add(rig.root);

  rig.root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  const simpleTorso = variant === 'analyst'
    ? garment('hostage-cardigan', { tint: 0x6e6167, mode: 'knit', valueVar: 0.11 })
    : garment('hostage-shirt', { tint: 0xbcb6a8, mode: 'poplin', valueVar: 0.08 });
  const simpleLegs = variant === 'analyst'
    ? garment('hostage-slacks', { tint: 0x383c42, mode: 'twill' })
    : garment('hostage-suittrousers', { tint: 0x2e323a, mode: 'twill' });
  buildSimplifiedBody(rig, {
    skin, torso: simpleTorso, hips: simpleLegs,
    arm: simpleTorso, thigh: simpleLegs,
    boot: leather(0x2e2620, 'hostage-flat'),
  });
  // Per-bone, per-material merge — see mergeRigMeshesPerBone. The zip-tie is
  // flagged noMerge above so its independent visibility keeps working.
  const { detailMeshes, simpleMeshes } = mergeRigMeshesPerBone(rig);

  const animator = new AnimationController(rig, { strideLength: 0.66, seed: hashString(variant) % 97 });
  animator.play('hostage_idle', { force: true });
  animator.update(0, { speed: 0 });

  let secured = false;
  function setSecured(v = true) {
    secured = !!v;
    tie.visible = !secured;
    if (secured && (animator.currentName === 'hostage_idle' || animator.currentName === 'hostage_fear')) {
      animator.play('hostage_stop', { fade: 0.35 });
    }
  }

  let lodLevel = 0;
  function setLOD(level) {
    level = level >= 1 ? 1 : 0;
    if (level === lodLevel) return;
    lodLevel = level;
    for (const m of detailMeshes) m.visible = level === 0;
    for (const m of simpleMeshes) m.visible = level === 1;
    tie.visible = level === 0 && !secured;
  }
  function updateLOD(cameraPos, bias = 1) {
    setLOD(group.position.distanceTo(cameraPos) > 18 * bias ? 1 : 0);
    return lodLevel;
  }

  // Hostages can be hit by stray fire; no multipliers beyond the head.
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const hitRegions = [
    { name: 'head', bone: rig.bones.head, offset: v(0, 0.1, 0), size: v(0.24, 0.26, 0.26), damageMultiplier: 4.0 },
    { name: 'chest', bone: rig.bones.chest, offset: v(0, 0.1, 0), size: v(0.38, 0.36, 0.28), damageMultiplier: 1.0 },
    { name: 'stomach', bone: rig.bones.spine, offset: v(0, 0.04, 0), size: v(0.32, 0.26, 0.24), damageMultiplier: 1.25 },
  ];

  const displayName = variant === 'analyst' ? 'Dr. Rhea Calloway' : 'Martin Oyelaran';
  assets.tag(group, `CHAR-HOSTAGE-${variant.toUpperCase()}`);

  return {
    group, rig, animator, hitRegions,
    setSecured, setLOD, updateLOD,
    get secured() { return secured; },
    variant, displayName,
  };
}
