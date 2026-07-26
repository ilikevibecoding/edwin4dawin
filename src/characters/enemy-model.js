import * as THREE from 'three';
import { bevelBox, box, cyl, sphere, torus, mesh } from '../map/kit.js';
import { fabric, hardPlastic, plainMaterial, brushedMetal, leather } from '../art/materials.js';
import { generateImageTexture } from '../art/texgen.js';
import { assets } from '../core/assets.js';
import { Rng, hashString } from '../core/rng.js';
import { SkeletonRig, buildSegmentedBody, buildSimplifiedBody, HUMAN } from './rig.js';
import { AnimationController } from './animation.js';
import { registerCharacterAssets } from './manifest.js';

// ---------------------------------------------------------------------------
// Hostile characters.  (owner: fable4)
//
// The hostile force is the "Ash Vector" cell — an ORIGINAL fictional group.
// Their insignia (a fractured diamond over three falling lines) is drawn
// procedurally below and appears as a shoulder patch. No real-world or other
// game's faction is referenced.
//
// Three outfit silhouettes + four head/face builds, assembled from the shared
// segmented rig so every variant runs the same animation set.
// ---------------------------------------------------------------------------

export const ENEMY_VARIANTS = ['breacher', 'runner', 'marksman'];
export const HEAD_VARIANTS = ['balaclava', 'respirator', 'beanie', 'headset'];

const SKIN_TONES = [0xc9a184, 0x9c6d4d, 0xe2b898, 0x77503a];
const HAIR_TONES = [0x2c2118, 0x1a1512, 0x4d3b26, 0x555049];

let spawnCounter = 0;

// --- shared materials ---------------------------------------------------------

const EM = {
  get plate() { return hardPlastic(0x2f3330, 'enemy-plate', 0.62); },
  get webbing() { return fabric(0x3a3d36, 'enemy-webbing'); },
  get rubber() { return hardPlastic(0x1c1e20, 'enemy-rubber', 0.85); },
  get metal() { return brushedMetal(0x4d5258, 'enemy-metal', 0.45); },
  get boot() { return leather(0x241f1a, 'enemy-boot'); },
  get balaclava() { return fabric(0x22252a, 'enemy-balaclava'); },
};

function skinMat(tone) {
  return plainMaterial(tone, { roughness: 0.62 }, `skin-${tone}`);
}

function insigniaTexture() {
  return generateImageTexture('char:insignia:ashvector', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // Patch field.
    ctx.fillStyle = '#23262b';
    ctx.strokeStyle = '#8f9aa4';
    ctx.lineWidth = 5;
    roundedRect(ctx, 8, 8, w - 16, h - 16, 16);
    ctx.fill();
    ctx.stroke();
    // Fractured diamond.
    ctx.strokeStyle = '#c8d4dc';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(64, 22); ctx.lineTo(98, 56); ctx.lineTo(70, 84); ctx.moveTo(58, 84);
    ctx.lineTo(30, 56); ctx.lineTo(64, 22);
    ctx.stroke();
    // Three falling lines ("ash").
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(48, 88); ctx.lineTo(44, 106);
    ctx.moveTo(64, 92); ctx.lineTo(62, 112);
    ctx.moveTo(80, 88); ctx.lineTo(84, 106);
    ctx.stroke();
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function addPart(parent, geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = mesh(geo, mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  if (opts.detail !== false) m.userData.detail = true;
  parent.add(m);
  return m;
}

// --- heads -----------------------------------------------------------------

/**
 * Base head: skull, jaw, brow ridge, nose bridge, cheekbones, ears, eyes.
 * Simple but not featureless; overlays (masks, hats) build on top of it.
 */
function buildBaseHead(headBone, skin, { ears = true } = {}) {
  const g = new THREE.Group();
  g.name = 'head-geo';
  // Skull + jaw.
  const skull = addPart(g, sphere(0.093, 14), skin, 0, 0.115, 0.008, { detail: false });
  skull.scale.set(0.92, 1.05, 1.0);
  addPart(g, bevelBox(0.104, 0.075, 0.098, 0.02), skin, 0, 0.045, 0.012, { detail: false }); // jaw mass
  addPart(g, bevelBox(0.052, 0.03, 0.03, 0.01), skin, 0, 0.028, -0.062);                     // chin
  // Brow ridge.
  addPart(g, bevelBox(0.082, 0.018, 0.022, 0.007), skin, 0, 0.135, -0.072);
  // Nose bridge + tip.
  addPart(g, bevelBox(0.018, 0.05, 0.02, 0.006), skin, 0, 0.098, -0.086, { rx: 0.15 });
  addPart(g, bevelBox(0.024, 0.02, 0.018, 0.006), skin, 0, 0.075, -0.09);
  // Cheekbones.
  addPart(g, bevelBox(0.02, 0.026, 0.03, 0.008), skin, -0.048, 0.095, -0.052, { ry: 0.35 });
  addPart(g, bevelBox(0.02, 0.026, 0.03, 0.008), skin, 0.048, 0.095, -0.052, { ry: -0.35 });
  // Eyes: dark sockets recessed under the brow.
  const eyeMat = plainMaterial(0x1c1a18, { roughness: 0.25 }, 'eye');
  addPart(g, sphere(0.0105, 8), eyeMat, -0.032, 0.118, -0.075);
  addPart(g, sphere(0.0105, 8), eyeMat, 0.032, 0.118, -0.075);
  if (ears) {
    addPart(g, bevelBox(0.014, 0.036, 0.026, 0.006), skin, -0.088, 0.105, 0.01);
    addPart(g, bevelBox(0.014, 0.036, 0.026, 0.006), skin, 0.088, 0.105, 0.01);
  }
  headBone.add(g);
  return g;
}

function headBalaclava(headBone, skin) {
  const g = buildBaseHead(headBone, skin, { ears: false });
  // Knit hood wrapping the whole skull, leaving an eye slit.
  const hood = addPart(g, sphere(0.099, 14), EM.balaclava, 0, 0.115, 0.008);
  hood.scale.set(0.95, 1.08, 1.03);
  addPart(g, bevelBox(0.108, 0.085, 0.1, 0.02), EM.balaclava, 0, 0.04, 0.012);
  // Eye slit frame (skin shows through around the eyes).
  addPart(g, bevelBox(0.078, 0.007, 0.012, 0.003), EM.balaclava, 0, 0.138, -0.088);
  addPart(g, bevelBox(0.078, 0.007, 0.012, 0.003), EM.balaclava, 0, 0.100, -0.09);
  return g;
}

function headRespirator(headBone, skin, hair) {
  const g = buildBaseHead(headBone, skin);
  // Half-mask over nose/mouth with two side filters.
  addPart(g, bevelBox(0.085, 0.06, 0.05, 0.014), EM.rubber, 0, 0.07, -0.075, { rx: 0.2 });
  addPart(g, cyl(0.024, 0.028, 0.02, 10), EM.plate, -0.055, 0.06, -0.055, { rz: Math.PI / 2, ry: 0.5 });
  addPart(g, cyl(0.024, 0.028, 0.02, 10), EM.plate, 0.055, 0.06, -0.055, { rz: Math.PI / 2, ry: -0.5 });
  // Straps.
  addPart(g, box(0.19, 0.012, 0.004), EM.rubber, 0, 0.1, 0.02, { ry: 0 });
  // Short cropped hair.
  const cap = addPart(g, sphere(0.095, 12), hair, 0, 0.13, 0.015);
  cap.scale.set(0.9, 0.85, 0.95);
  return g;
}

function headBeanie(headBone, skin, hair) {
  const g = buildBaseHead(headBone, skin);
  // Watch cap with a folded cuff.
  const cap = addPart(g, sphere(0.098, 12), fabric(0x39424d, 'enemy-beanie'), 0, 0.145, 0.01);
  cap.scale.set(0.93, 0.8, 0.98);
  addPart(g, cyl(0.094, 0.096, 0.035, 14), fabric(0x39424d, 'enemy-beanie'), 0, 0.115, 0.01);
  // Full beard mass around the jaw.
  const beard = addPart(g, bevelBox(0.108, 0.07, 0.095, 0.022), hair, 0, 0.028, -0.005);
  beard.scale.set(1, 1, 1.05);
  addPart(g, bevelBox(0.05, 0.024, 0.02, 0.008), hair, 0, 0.062, -0.088); // moustache
  return g;
}

function headHeadset(headBone, skin, hair) {
  const g = buildBaseHead(headBone, skin);
  // Short hair + field cap.
  const hairCap = addPart(g, sphere(0.094, 12), hair, 0, 0.128, 0.015);
  hairCap.scale.set(0.92, 0.82, 0.96);
  addPart(g, cyl(0.096, 0.099, 0.05, 14), fabric(0x3d4038, 'enemy-cap'), 0, 0.16, 0.008);
  addPart(g, bevelBox(0.09, 0.012, 0.07, 0.005), fabric(0x3d4038, 'enemy-cap'), 0, 0.148, -0.105, { rx: 0.12 });
  // Comms headset: band + ear cups + mic boom.
  const band = addPart(g, torus(0.098, 0.007, 14, 8), EM.rubber, 0, 0.12, 0.01);
  band.rotation.z = Math.PI / 2;
  addPart(g, cyl(0.03, 0.03, 0.024, 10), EM.rubber, -0.1, 0.105, 0.01, { rz: Math.PI / 2 });
  addPart(g, cyl(0.03, 0.03, 0.024, 10), EM.rubber, 0.1, 0.105, 0.01, { rz: Math.PI / 2 });
  addPart(g, cyl(0.004, 0.004, 0.09, 6), EM.rubber, -0.075, 0.075, -0.045, { rz: 0.9, ry: 0.5 });
  addPart(g, sphere(0.009, 6), EM.rubber, -0.045, 0.055, -0.085);
  return g;
}

const HEAD_BUILDERS = {
  balaclava: headBalaclava,
  respirator: headRespirator,
  beanie: headBeanie,
  headset: headHeadset,
};

// --- outfits -----------------------------------------------------------------

function outfitBreacher(rig, rng) {
  const B = rig.bones;
  const olive = fabric(0x3f4438, 'enemy-fatigue-olive');
  const dark = fabric(0x2a2d2f, 'enemy-fatigue-dark');
  const mats = {
    skin: skinMat(rng.pick(SKIN_TONES)),
    torso: olive, hips: dark, arm: olive, forearm: olive,
    hand: EM.rubber, thigh: dark, shin: dark, boot: EM.boot,
  };
  const { parts } = buildSegmentedBody(rig, mats, { bulk: 1.14 });

  // Plate carrier: front + back plates, cummerbund, shoulder straps.
  addPart(B.chest, bevelBox(0.34, 0.30, 0.055, 0.016), EM.plate, 0, 0.09, -0.135);
  addPart(B.chest, bevelBox(0.34, 0.30, 0.05, 0.016), EM.plate, 0, 0.09, 0.135);
  addPart(B.spine, bevelBox(0.36, 0.16, 0.27, 0.02), EM.webbing, 0, 0.06, 0);
  for (const sx of [-1, 1]) {
    addPart(B.chest, bevelBox(0.06, 0.03, 0.24, 0.01), EM.webbing, sx * 0.12, 0.245, 0);
  }
  // Triple mag pouches on the front plate.
  for (let i = -1; i <= 1; i++) {
    addPart(B.chest, bevelBox(0.075, 0.13, 0.045, 0.01), EM.webbing, i * 0.095, 0.02, -0.165);
  }
  // Utility + radio pouch on the hip and a holster on the right thigh.
  addPart(B.hips, bevelBox(0.09, 0.13, 0.07, 0.012), EM.webbing, -0.19, -0.05, 0.02);
  addPart(B.thighR, bevelBox(0.08, 0.16, 0.06, 0.012), EM.rubber, 0.075, -0.16, -0.03);
  // Knee pads: hard caps over the shin tops.
  for (const s of ['L', 'R']) {
    addPart(B[`shin${s}`], sphere(0.062, 10), EM.plate, 0, -0.03, -0.035).scale.set(1, 1.1, 0.8);
  }
  // Elbow pads.
  for (const s of ['L', 'R']) {
    addPart(B[`forearm${s}`], sphere(0.052, 10), EM.rubber, 0, -0.01, 0.02).scale.set(1, 1.2, 0.9);
  }
  return { parts, silhouette: 'heavy' };
}

function outfitRunner(rig, rng) {
  const B = rig.bones;
  const jacket = fabric(0x4a4038, 'enemy-jacket-runner');
  const shirt = fabric(0x565d66, 'enemy-shirt-runner');
  const denim = fabric(0x39414f, 'enemy-denim');
  const mats = {
    skin: skinMat(rng.pick(SKIN_TONES)),
    torso: shirt, hips: denim, arm: jacket, forearm: jacket,
    hand: skinMat(rng.pick(SKIN_TONES)), thigh: denim, shin: denim,
    boot: hardPlastic(0x494340, 'enemy-sneaker', 0.7),
  };
  const { parts } = buildSegmentedBody(rig, mats, { bulk: 0.96 });

  // Open light jacket: two front panels + collar + hem.
  for (const sx of [-1, 1]) {
    addPart(B.chest, bevelBox(0.115, 0.30, 0.03, 0.012), jacket, sx * 0.115, 0.075, -0.115, { ry: sx * 0.12 });
  }
  addPart(B.chest, bevelBox(0.34, 0.32, 0.04, 0.014), jacket, 0, 0.075, 0.115);
  addPart(B.chest, bevelBox(0.24, 0.05, 0.2, 0.012), jacket, 0, 0.245, 0.02);          // collar/yoke
  addPart(B.spine, bevelBox(0.335, 0.10, 0.225, 0.014), jacket, 0, 0.02, 0);           // hem
  // Minimal chest rig: X-straps + two pouches.
  for (const sx of [-1, 1]) {
    addPart(B.chest, box(0.05, 0.3, 0.012), EM.webbing, sx * 0.07, 0.1, -0.135, { rz: sx * 0.35 });
  }
  addPart(B.chest, bevelBox(0.075, 0.11, 0.04, 0.01), EM.webbing, -0.055, 0.0, -0.15);
  addPart(B.chest, bevelBox(0.075, 0.11, 0.04, 0.01), EM.webbing, 0.055, 0.0, -0.15);
  return { parts, silhouette: 'light' };
}

function outfitMarksman(rig, rng) {
  const B = rig.bones;
  const coat = fabric(0x33383e, 'enemy-coat');
  const shirt = fabric(0x44403b, 'enemy-shirt-marksman');
  const trousers = fabric(0x2c2f33, 'enemy-trousers');
  const mats = {
    skin: skinMat(rng.pick(SKIN_TONES)),
    torso: shirt, hips: trousers, arm: coat, forearm: coat,
    hand: skinMat(rng.pick(SKIN_TONES)), thigh: trousers, shin: trousers, boot: EM.boot,
  };
  const { parts } = buildSegmentedBody(rig, mats, { bulk: 1.0 });

  // Long coat: torso shell + knee-length skirt panels that read in silhouette.
  addPart(B.chest, bevelBox(0.38, 0.34, 0.28, 0.02), coat, 0, 0.08, 0);
  addPart(B.spine, bevelBox(0.36, 0.22, 0.26, 0.02), coat, 0, 0.04, 0);
  addPart(B.chest, bevelBox(0.20, 0.06, 0.24, 0.012), coat, 0, 0.26, 0.01);            // collar
  // Skirt: front-left/front-right/back panels hanging from the hips.
  addPart(B.hips, bevelBox(0.155, 0.46, 0.03, 0.012), coat, -0.09, -0.30, -0.115, { rx: -0.08, ry: -0.06 });
  addPart(B.hips, bevelBox(0.155, 0.46, 0.03, 0.012), coat, 0.09, -0.30, -0.115, { rx: -0.08, ry: 0.06 });
  addPart(B.hips, bevelBox(0.33, 0.5, 0.035, 0.014), coat, 0, -0.32, 0.115, { rx: 0.1 });
  // Shoulder rig: strap across the chest + sidearm under the left arm.
  addPart(B.chest, box(0.05, 0.36, 0.012), leather(0x2a2018, 'enemy-rig'), 0.03, 0.08, -0.145, { rz: -0.55 });
  addPart(B.chest, bevelBox(0.045, 0.14, 0.07, 0.01), leather(0x2a2018, 'enemy-rig'), -0.185, -0.02, 0.02);
  // Ammo wallet on the belt.
  addPart(B.hips, bevelBox(0.11, 0.08, 0.05, 0.01), leather(0x2a2018, 'enemy-rig'), 0.16, -0.03, -0.09);
  return { parts, silhouette: 'long' };
}

const OUTFITS = { breacher: outfitBreacher, runner: outfitRunner, marksman: outfitMarksman };

/** Default head style per outfit; runner alternates two styles for variety. */
function pickHead(variant, rng) {
  if (variant === 'breacher') return 'balaclava';
  if (variant === 'marksman') return 'headset';
  return rng.bool(0.5) ? 'beanie' : 'respirator';
}

// --- hit regions ---------------------------------------------------------------

/**
 * Axis-aligned (in bone space) hit boxes used by combat ray tests.
 * `offset` is the box centre relative to the bone origin, `size` full extents.
 */
function makeHitRegions(rig) {
  const B = rig.bones;
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  return [
    { name: 'head', bone: B.head, offset: v(0, 0.10, 0), size: v(0.24, 0.26, 0.26), damageMultiplier: 4.0 },
    { name: 'chest', bone: B.chest, offset: v(0, 0.10, 0), size: v(0.40, 0.36, 0.30), damageMultiplier: 1.0 },
    { name: 'stomach', bone: B.spine, offset: v(0, 0.04, 0), size: v(0.34, 0.26, 0.26), damageMultiplier: 1.25 },
    { name: 'arm_l', bone: B.upperArmL, offset: v(-0.01, -0.28, 0), size: v(0.15, 0.62, 0.15), damageMultiplier: 0.75 },
    { name: 'arm_r', bone: B.upperArmR, offset: v(0.01, -0.28, 0), size: v(0.15, 0.62, 0.15), damageMultiplier: 0.75 },
    { name: 'leg_l', bone: B.thighL, offset: v(0, -0.45, 0), size: v(0.19, 0.95, 0.21), damageMultiplier: 0.75 },
    { name: 'leg_r', bone: B.thighR, offset: v(0, -0.45, 0), size: v(0.19, 0.95, 0.21), damageMultiplier: 0.75 },
  ];
}

// =========================================================================
// buildEnemy
// =========================================================================

export const ENEMY_LOD_DISTANCE = 18; // metres — beyond this the simple body shows

/**
 * @param {'breacher'|'runner'|'marksman'} variant
 * @param {{head?:string, seed?:number}} [opts]
 * @returns {{group, rig, animator, hitRegions, attachWeapon, setLOD, updateLOD, variant, headVariant}}
 */
export function buildEnemy(variant = 'runner', opts = {}) {
  registerCharacterAssets();
  if (!OUTFITS[variant]) variant = 'runner';
  const seed = opts.seed ?? ++spawnCounter;
  const rng = new Rng(hashString(`enemy:${variant}:${seed}`));

  const rig = new SkeletonRig({ scale: 0.985 + rng.float() * 0.045 });
  const { parts } = OUTFITS[variant](rig, rng);
  const headVariant = HEAD_VARIANTS.includes(opts.head) ? opts.head : pickHead(variant, rng);
  const skin = skinMat(rng.pick(SKIN_TONES));
  const hair = plainMaterial(rng.pick(HAIR_TONES), { roughness: 0.85 }, `hair-${seed % 4}`);
  HEAD_BUILDERS[headVariant](rig.bones.head, skin, hair);

  // Shoulder insignia patch (left upper arm).
  const patchMat = new THREE.MeshStandardMaterial({
    map: insigniaTexture(), transparent: true, roughness: 0.9, metalness: 0,
  });
  const patch = mesh(new THREE.PlaneGeometry(0.055, 0.055), patchMat, { cast: false });
  patch.position.set(-0.068, -0.1, 0);
  patch.rotation.y = -Math.PI / 2;
  rig.bones.upperArmL.add(patch);

  const group = new THREE.Group();
  group.name = `enemy:${variant}`;
  group.add(rig.root);

  // Shadows on for the detailed body; the LOD body casts none (cheap).
  const detailMeshes = [];
  rig.root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      detailMeshes.push(o);
    }
  });
  const simpleMats = {
    skin, torso: fabric(0x3a3d36, 'enemy-webbing'), hips: fabric(0x2a2d2f, 'enemy-fatigue-dark'),
    arm: fabric(0x3a3d36, 'enemy-webbing'), thigh: fabric(0x2a2d2f, 'enemy-fatigue-dark'), boot: EM.boot,
  };
  const simpleMeshes = buildSimplifiedBody(rig, simpleMats);

  const animator = new AnimationController(rig, { strideLength: 0.74, seed });
  animator.play('guard', { force: true });
  animator.update(0, { speed: 0 });

  // Weapon mount: align a weapon model's gripR anchor into the right palm so
  // the barrel runs along the fingers (-Y of the hand bone).
  let mountedWeapon = null;
  function attachWeapon(weaponObj) {
    if (mountedWeapon) rig.bones.handR.remove(mountedWeapon);
    mountedWeapon = weaponObj || null;
    if (!mountedWeapon) return;
    const grip = mountedWeapon.getObjectByName('gripR');
    mountedWeapon.rotation.set(-Math.PI / 2, 0, 0);
    const gp = grip ? grip.position : new THREE.Vector3();
    // Palm centre in hand-bone space; subtract the (rotated) grip offset.
    const rotated = gp.clone().applyEuler(mountedWeapon.rotation);
    mountedWeapon.position.set(-rotated.x, -0.075 - rotated.y, -0.012 - rotated.z);
    rig.bones.handR.add(mountedWeapon);
    return mountedWeapon;
  }

  let lodLevel = 0;
  function setLOD(level) {
    level = level >= 1 ? 1 : 0;
    if (level === lodLevel) return;
    lodLevel = level;
    for (const m of detailMeshes) m.visible = level === 0;
    for (const m of simpleMeshes) m.visible = level === 1;
    if (mountedWeapon) mountedWeapon.visible = true; // weapon always shows
  }

  /** Convenience: auto-swap based on camera distance (AI calls per frame). */
  function updateLOD(cameraPos, bias = 1) {
    const d = group.position.distanceTo(cameraPos);
    setLOD(d > ENEMY_LOD_DISTANCE * bias ? 1 : 0);
    return lodLevel;
  }

  const hitRegions = makeHitRegions(rig);
  assets.tag(group, `CHAR-ENEMY-${variant.toUpperCase()}`, { headVariant });

  return {
    group, rig, animator, hitRegions,
    attachWeapon, setLOD, updateLOD,
    get lodLevel() { return lodLevel; },
    get weapon() { return mountedWeapon; },
    variant, headVariant,
  };
}
