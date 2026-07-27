import * as THREE from 'three';
import type { MaterialId, MaterialLibrary } from '../../core/Contracts';
import { Rng } from '../../core/MathUtils';
import { reticleTexture, type ReticleKind } from './Textures';

/**
 * Material palette for the viewmodel.
 *
 * The procgen library owns the surface look; this only splits it into the roles
 * a weapon needs and applies the per-instance variation that stops every rifle
 * in the game looking like it came out of the same crate five minutes ago.
 */
export interface GunPalette {
  /** Receiver, rails, sight bases. */
  metal: THREE.Material;
  /** Barrel, internals, anything in shadow — darker and rougher. */
  metalDark: THREE.Material;
  /** Bolt faces and wear edges — brighter, smoother, more reflective. */
  metalWorn: THREE.Material;
  /**
   * Cerakote/DLC over steel: knife blades, launcher tubes, suppressor bodies.
   * Deliberately only part-metallic. A fully metallic dark surface has no diffuse
   * term at all, so against a dim sky it returns nothing and the part reads as a
   * black hole; a coating has a real albedo and keeps its form.
   */
  coating: THREE.Material;
  /** Furniture: handguard, grip, stock. */
  polymer: THREE.Material;
  polymerDark: THREE.Material;
  wood: THREE.Material;
  /** Slings, pouches, glove knuckle pads. */
  nylon: THREE.Material;
  /** Glove leather: much darker than the uniform so the hands read separately. */
  glove: THREE.Material;
  /** Combat-shirt sleeve on the forearm. */
  sleeve: THREE.Material;
  brass: THREE.Material;
  /** Inside of a bore or a scope tube. */
  bore: THREE.Material;
  rubber: THREE.Material;
  glass: THREE.Material;
  glassAmber: THREE.Material;
  tritium: THREE.Material;
}

const FALLBACK: Record<string, { color: number; roughness: number; metalness: number }> = {
  gun_metal: { color: 0x3c3f43, roughness: 0.42, metalness: 1 },
  gun_polymer: { color: 0x24262a, roughness: 0.74, metalness: 0 },
  gun_wood: { color: 0x5a3a22, roughness: 0.58, metalness: 0 },
  gear_nylon: { color: 0x33352f, roughness: 0.88, metalness: 0 },
};

function baseMaterial(lib: MaterialLibrary | null, id: MaterialId): THREE.MeshStandardMaterial {
  if (lib) return lib.clone(id);
  const f = FALLBACK[id] ?? { color: 0x606060, roughness: 0.6, metalness: 0 };
  return new THREE.MeshStandardMaterial({
    color: f.color,
    roughness: f.roughness,
    metalness: f.metalness,
  });
}

/**
 * Same, but with the texture repeated.
 *
 * The library authors its surfaces for architectural scale: `gear_nylon` tiles
 * every 0.9 m and `gun_wood` every 0.45 m. A forearm is 0.3 m long and an AK
 * stock 0.27 m, so at native scale a third of one tile is stretched over the
 * whole part and it reads as bare colour with a single smear of grain across it.
 * Repeating brings the weave and the figure back to the size they should be when
 * the part is 40 cm from the camera.
 */
function tiledMaterial(
  lib: MaterialLibrary | null,
  id: MaterialId,
  repeat: number,
): THREE.MeshStandardMaterial {
  if (!lib) return baseMaterial(lib, id);
  return lib.tiled(id, repeat, repeat).clone();
}

function tune(
  m: THREE.MeshStandardMaterial,
  name: string,
  color: number,
  roughness: number,
  metalness: number,
  envIntensity = 1,
): THREE.MeshStandardMaterial {
  m.name = name;
  m.color.setHex(color);
  m.roughness = roughness;
  m.metalness = metalness;
  m.envMapIntensity = envIntensity;
  m.needsUpdate = true;
  return m;
}

/**
 * Builds the shared palette; per-weapon wear is layered on top of this.
 *
 * `color` and `roughness` here are multipliers over the library's authored maps,
 * not absolute values — three multiplies both into the map. That is worth being
 * explicit about because it is easy to get backwards: `gun_metal` already paints
 * a 0.52-linear phosphate, so tinting it with a mid grey lands at 0.2, and a
 * fully metallic surface has no diffuse term at all, so a 0.2 F0 receiver simply
 * goes black. Everything below therefore stays close to white and leans on the
 * library for value, deviating only where a role genuinely differs: a nitrided
 * barrel really is darker than its receiver, a bolt face really is polished.
 */
export function createPalette(lib: MaterialLibrary | null): GunPalette {
  // Phosphate over steel. The library paints a 0.52-linear F0, so this lands near
  // 0.25 — the value a Parkerised receiver actually has. Left any brighter it
  // reads as bare stainless, which under a real sun is the single loudest wrong
  // note on the whole weapon because the receiver is the largest metal area.
  const metal = tune(baseMaterial(lib, 'gun_metal'), 'vm_metal', 0xb6bbc2, 0.92, 1.0, 1.05);
  const metalDark = tune(baseMaterial(lib, 'gun_metal'), 'vm_metal_dark', 0x82888f, 1.12, 1.0, 0.9);
  // Bright, but not a mirror. A fully metallic surface at 0.3 roughness returns
  // only what the environment hands it, and in a sparse one that is black with a
  // single streak across it — the reason polished parts on a viewmodel are always
  // kept broader than physical accuracy would suggest.
  const metalWorn = tune(baseMaterial(lib, 'gun_metal'), 'vm_metal_worn', 0xdfe2e8, 0.72, 1.0, 1.2);
  const coating = tune(baseMaterial(lib, 'gun_metal'), 'vm_coating', 0x7f858a, 0.8, 0.34, 0.8);
  // Flat dark earth furniture. Kept below the receiver in value: furniture covers
  // the largest continuous areas of the weapon and a pale tan over most of the
  // frame reads as unpainted plastic, as well as inverting the value relationship
  // between a coated polymer part and the phosphated steel next to it.
  const polymer = tune(baseMaterial(lib, 'gun_polymer'), 'vm_polymer', 0xa1957c, 1.0, 0.0, 0.8);
  const polymerDark = tune(baseMaterial(lib, 'gun_polymer'), 'vm_polymer_dark', 0x4a4e54, 1.06, 0.0, 0.65);
  // The library's walnut is a saturated red-brown, and any multiplier with more
  // red than blue in it lands on traffic-cone orange. Tinting the other way —
  // cooler and darker — is what brings it back to oiled walnut.
  const wood = tune(tiledMaterial(lib, 'gun_wood', 2.6), 'vm_wood', 0x93a6ba, 1.02, 0.0, 0.7);
  wood.normalScale.setScalar(0.55);
  const nylon = tune(tiledMaterial(lib, 'gear_nylon', 2.2), 'vm_nylon', 0x6f6d63, 1.0, 0.0, 0.7);
  const glove = tune(tiledMaterial(lib, 'gear_nylon', 2.6), 'vm_glove', 0x2f2e2b, 0.95, 0.0, 0.45);
  // The arms are supporting cast: kept darker and less saturated than the weapon
  // so the gun stays the brightest thing in the lower third of the frame. Left
  // any lighter, the sunlit forearm becomes the subject of the shot.
  const sleeve = tune(tiledMaterial(lib, 'gear_nylon', 2.2), 'vm_sleeve', 0x3a3931, 1.1, 0.0, 0.4);
  const brass = tune(baseMaterial(lib, 'gun_metal'), 'vm_brass', 0xffcf7a, 0.68, 1.0, 1.5);
  const bore = tune(baseMaterial(lib, 'gun_metal'), 'vm_bore', 0x1d1f24, 1.1, 0.6, 0.15);
  const rubber = tune(baseMaterial(lib, 'gun_polymer'), 'vm_rubber', 0x5f6266, 1.15, 0.0, 0.45);

  const glass = new THREE.MeshPhysicalMaterial({
    name: 'vm_glass',
    color: 0x8fb6c8,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    ior: 1.52,
    specularIntensity: 1,
    envMapIntensity: 2.4,
    side: THREE.DoubleSide,
  });
  const glassAmber = new THREE.MeshPhysicalMaterial({
    name: 'vm_glass_amber',
    color: 0xffb066,
    metalness: 0,
    roughness: 0.12,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    clearcoat: 1,
    ior: 1.5,
    emissive: 0x381400,
    emissiveIntensity: 1,
    envMapIntensity: 1.8,
    side: THREE.DoubleSide,
  });
  const tritium = new THREE.MeshStandardMaterial({
    name: 'vm_tritium',
    color: 0x14200f,
    emissive: 0x2ad855,
    emissiveIntensity: 0.55,
    roughness: 0.45,
    metalness: 0,
  });

  return {
    metal,
    metalDark,
    metalWorn,
    coating,
    polymer,
    polymerDark,
    wood,
    nylon,
    glove,
    sleeve,
    brass,
    bore,
    rubber,
    glass,
    glassAmber,
    tritium,
  };
}

/**
 * Per-weapon wear pass: a fresh clone of the three hero materials with the
 * finish nudged, so two rifles never share the exact same shade of used.
 */
export function weatherPalette(base: GunPalette, seed: number): GunPalette {
  const rng = new Rng(seed >>> 0 || 1);
  const jitter = (m: THREE.Material, hue: number, rough: number, light: number): THREE.Material => {
    const std = m.clone() as THREE.MeshStandardMaterial;
    std.color.offsetHSL(hue, 0, light);
    std.roughness = THREE.MathUtils.clamp(std.roughness + rough, 0.03, 1);
    std.needsUpdate = true;
    return std;
  };
  return {
    ...base,
    metal: jitter(base.metal, rng.range(-0.02, 0.02), rng.range(-0.07, 0.1), rng.range(-0.05, 0.03)),
    metalDark: jitter(base.metalDark, rng.range(-0.02, 0.02), rng.range(-0.05, 0.08), rng.range(-0.04, 0.02)),
    polymer: jitter(base.polymer, rng.range(-0.03, 0.03), rng.range(-0.05, 0.05), rng.range(-0.06, 0.04)),
    polymerDark: jitter(base.polymerDark, rng.range(-0.03, 0.03), rng.range(-0.04, 0.04), rng.range(-0.05, 0.03)),
    wood: jitter(base.wood, rng.range(-0.02, 0.02), rng.range(-0.08, 0.08), rng.range(-0.07, 0.05)),
  };
}

export function reticleMaterial(kind: ReticleKind): THREE.MeshBasicMaterial {
  const r = reticleTexture(kind);
  const m = new THREE.MeshBasicMaterial({
    name: `vm_reticle_${kind}`,
    map: r.texture,
    color: r.color,
    transparent: true,
    depthWrite: false,
    depthTest: !r.additive,
    blending: r.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  if (r.additive) m.opacity = 0.95;
  return m;
}

export function stencilMaterial(texture: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name: 'vm_stencil',
    map: texture,
    alphaMap: texture,
    transparent: true,
    alphaTest: 0.14,
    roughness: 0.72,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    side: THREE.FrontSide,
  });
}

/**
 * Flat black for the eye-relief annulus around a scope's ocular.
 *
 * Ignores depth entirely. The annulus has to hide everything between the eye and
 * the sight picture — the eyecup that protrudes past the ocular plane, the
 * turrets, the mount, the receiver below — and those are on both sides of it in
 * depth, so testing against them would leave gaps. Drawing it unconditionally at
 * a high render order and sitting the reticle above it is simpler and exact.
 * Fadeable, because it spans the whole screen and may only appear once the optic
 * is actually at the eye.
 */
export function blackoutMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    name: 'vm_blackout',
    color: 0x000000,
    toneMapped: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
}
