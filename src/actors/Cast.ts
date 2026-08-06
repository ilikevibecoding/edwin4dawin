import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Assets } from '../core/Assets';
import { Actor } from './Actor';
import { AnimationLibrary } from './AnimationLibrary';
import { buildBlinkMorph, buildHairCap, findHeadMesh, measureEyeRadius } from './FaceMorphs';
import { Tex } from '../render/SharedTextures';
import { PALETTE } from '../render/LookConfig';
import { signTexture, type SurfaceMaps } from '../render/Textures';

/**
 * The cast.
 *
 * Source assets are generic (a dandy avatar, a mannequin, a sci-fi trooper), so
 * each character is a restyle: materials are replaced with procedural PBR sets,
 * costume meshes are hidden or repurposed, and android hardware (temple LED,
 * armband, model plate, seam lighting) is generated and attached to bones.
 *
 * Reusing one base model across the android cast is deliberate as well as
 * practical: mass-produced androids sharing a chassis is the premise of the
 * story, so the leads are differentiated by costume, colour and posture rather
 * than by face.
 */

export type CharacterId =
  | 'orion'
  | 'cass'
  | 'atlas'
  | 'deviant'
  | 'trooper'
  | 'commander'
  | 'child'
  | 'owner'
  | 'crowdAndroid';

export interface CharacterDef {
  id: CharacterId;
  displayName: string;
  /** Short label used by the interface HUD. */
  model: string;
  file: 'readyplayer.me' | 'Xbot' | 'Soldier' | 'Michelle';
  rigKey: string;
  height: number;
  hasFace: boolean;
  hasLed: boolean;
  /** False for rigs the body-space pose library cannot drive; see ActorOptions. */
  posable?: boolean;
  ledOffset?: [number, number, number];
  accent: number;
  /** Materials and costume, applied to the cloned model before rigging. */
  restyle: (root: THREE.Object3D, def: CharacterDef) => void;
  /** Hardware and hair, attached once the actor's bone frames are known. */
  decorate?: (actor: Actor, def: CharacterDef) => void;
}

/** Rings around chest and limbs, sized from each bone's own length. */
function addChassisSeams(actor: Actor, color: number): void {
  for (const [bone, radius, along] of [
    ['Spine1', 0.098, 0.5],
    ['Spine2', 0.092, 0.6],
    ['LeftArm', 0.052, 0.62],
    ['RightArm', 0.052, 0.62],
    ['LeftUpLeg', 0.068, 0.45],
    ['RightUpLeg', 0.068, 0.45],
  ] as [string, number, number][]) {
    actor.attachToLimb(bone, chassisSeamMesh(color, radius), { along });
  }
}

function addAndroidHardware(actor: Actor, opts: { accent: number; model: string; bandRadius?: number }): void {
  actor.attachToLimb('LeftArm', armbandMesh(opts.accent, opts.bandRadius ?? 0.062), { along: 0.62 });
  const plate = modelPlateMesh(opts.model, opts.accent);
  actor.attachToLimb('Spine2', plate, { along: 0.55, lateral: -0.072, forward: 0.085, alignAxis: false });
  plate.rotation.y = -0.1;
}

// ---------------------------------------------------------------- restyle bits

function eachMaterial(root: THREE.Object3D, fn: (mat: THREE.Material, mesh: THREE.Mesh) => void): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) if (m) fn(m, mesh);
  });
}

function replaceMaterial(root: THREE.Object3D, predicate: (mat: THREE.Material, mesh: THREE.Mesh) => boolean, build: (old: THREE.Material) => THREE.Material): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => (predicate(m, mesh) ? build(m) : m));
    } else if (mesh.material && predicate(mesh.material, mesh)) {
      mesh.material = build(mesh.material);
    }
  });
}

function hideMesh(root: THREE.Object3D, test: RegExp): void {
  root.traverse((o) => {
    if (test.test(o.name)) o.visible = false;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) if (m && test.test(m.name)) o.visible = false;
    }
  });
}

/** Synthetic skin: matte with a faint clearcoat, so it reads as not-quite-human. */
function syntheticSkin(old: THREE.Material, opts: { tint?: number; clearcoat?: number } = {}): THREE.Material {
  const src = old as THREE.MeshStandardMaterial;
  const mat = new THREE.MeshPhysicalMaterial({
    map: src.map ?? null,
    normalMap: src.normalMap ?? null,
    color: new THREE.Color(opts.tint ?? 0xffffff),
    roughness: 0.58,
    metalness: 0,
    clearcoat: opts.clearcoat ?? 0.22,
    clearcoatRoughness: 0.55,
    sheen: 0.35,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0x2a3a52),
    envMapIntensity: 0.9,
  });
  mat.name = `${src.name}_synthetic`;
  return mat;
}

function fabricMaterial(maps: SurfaceMaps, tint: number, roughness = 0.78): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap,
    color: new THREE.Color(tint),
    roughness,
    metalness: 0.04,
    normalScale: new THREE.Vector2(0.7, 0.7),
    envMapIntensity: 0.75,
  });
}

/** Emissive band around a limb, the standard-issue android identifier. */
function armbandMesh(color: number, radius = 0.062, tube = 0.011): THREE.Group {
  const g = new THREE.Group();
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 5, 18),
    new THREE.MeshStandardMaterial({
      color: 0x0c1016,
      roughness: 0.4,
      metalness: 0.5,
      emissive: new THREE.Color(color),
      emissiveIntensity: 2.2,
    })
  );
  g.add(band);
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.5, 3),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(0.75),
      toneMapped: false,
      side: THREE.DoubleSide,
    })
  );
  // Sits on the outside of the band, facing away from the arm.
  plate.position.set(radius * 0.92, 0, 0);
  plate.rotation.y = Math.PI / 2;
  g.add(plate);
  return g;
}

/** Model-number plate, worn on the chest like a uniform tag. */
function modelPlateMesh(text: string, color: number): THREE.Mesh {
  const tex = signTexture([text], { w: 256, h: 64, color: `#${new THREE.Color(color).getHexString()}` });
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.022),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.8,
      color: new THREE.Color(0x9fd8ff),
      toneMapped: false,
      depthWrite: false,
    })
  );
}

export const HAIR_MESH_SUFFIX = '_hair';

/** Recolours the generated hair shell; each character needs its own. */
function styleHair(root: THREE.Object3D, opts: { color: number; roughness?: number; sheen?: number }): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.name.endsWith(HAIR_MESH_SUFFIX)) return;
    const previous = mesh.material as THREE.MeshPhysicalMaterial;
    mesh.material = new THREE.MeshPhysicalMaterial({
      color: opts.color,
      vertexColors: previous.vertexColors,
      transparent: previous.transparent,
      depthWrite: previous.depthWrite,
      polygonOffset: previous.polygonOffset,
      polygonOffsetFactor: previous.polygonOffsetFactor,
      // Hair is the darkest thing on a head and has no broad specular lobe. Any
      // gloss here turns the shell into a wet plastic cap under a hard key.
      roughness: opts.roughness ?? 0.88,
      metalness: 0.0,
      sheen: opts.sheen ?? 0.14,
      sheenRoughness: 0.9,
      sheenColor: new THREE.Color(0x4a3d31),
      clearcoat: 0,
      envMapIntensity: 0.3,
    });
  });
}

/** Bare android shell: moulded ceramic over a dark structural core. */
function ceramicChassis(tint: number, roughness: number): THREE.MeshPhysicalMaterial {
  const maps = Tex.ceramic;
  return new THREE.MeshPhysicalMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap,
    color: new THREE.Color(tint),
    roughness,
    metalness: 0.05,
    clearcoat: 0.38,
    clearcoatRoughness: 0.42,
    envMapIntensity: 1,
    normalScale: new THREE.Vector2(0.6, 0.6),
  });
}

/**
 * Catchlights.
 *
 * Eyes are the only thing on a face bright enough to survive this grade, and
 * without a hot specular they go dead in a close-up. The iris is tinted and the
 * environment contribution pushed well past one so the key leaves a highlight.
 */
function brightenEyes(root: THREE.Object3D, iris: number): void {
  eachMaterial(root, (m) => {
    if (!/eye/i.test(m.name)) return;
    const std = m as THREE.MeshStandardMaterial;
    std.roughness = 0.07;
    std.metalness = 0;
    std.envMapIntensity = 2.4;
    std.color = new THREE.Color(iris);
  });
}

/** Glowing seams along the chassis of a skinless android. */
function chassisSeamMesh(color: number, radius: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.0035, 4, 16),
    new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0.8 })
  );
}

// ------------------------------------------------------------------- character

export const CAST: Record<CharacterId, CharacterDef> = {
  orion: {
    id: 'orion',
    displayName: 'ORION',
    model: 'RK-900 · NEGOTIATOR',
    file: 'readyplayer.me',
    rigKey: 'rpm',
    height: 1.83,
    hasFace: true,
    hasLed: true,
    ledOffset: [0.072, 0.088, 0.018],
    accent: PALETTE.neonCyan,
    restyle: (root) => {
      // Lose the civilian hat, flower and facial hair.
      hideMesh(root, /headwear|hat|beard|mustache/i);
      replaceMaterial(root, (m) => /skin/i.test(m.name), (m) => syntheticSkin(m, { clearcoat: 0.24 }));
      replaceMaterial(root, (m) => /outfit_top/i.test(m.name), () =>
        fabricMaterial(Tex.darkFabric, 0x2c3138, 0.7)
      );
      replaceMaterial(root, (m) => /outfit_bottom/i.test(m.name), () =>
        fabricMaterial(Tex.darkFabric, 0x1e2228, 0.8)
      );
      replaceMaterial(root, (m) => /footwear/i.test(m.name), (m) => {
        const src = m as THREE.MeshStandardMaterial;
        return new THREE.MeshStandardMaterial({
          color: 0x0a0c0f,
          roughness: 0.32,
          metalness: 0.25,
          normalMap: src.normalMap ?? null,
        });
      });
      replaceMaterial(root, (m) => /body/i.test(m.name) && !/outfit/i.test(m.name), (m) =>
        syntheticSkin(m, { clearcoat: 0.18 })
      );
      styleHair(root, { color: 0x241b14, roughness: 0.62 });
      brightenEyes(root, 0xc9dcea);
    },
    decorate: (actor) => addAndroidHardware(actor, { accent: PALETTE.neonCyan, model: 'RK-900', bandRadius: 0.064 }),
  },

  cass: {
    id: 'cass',
    displayName: 'CASS',
    model: 'AX-400 · DOMESTIC',
    file: 'readyplayer.me',
    rigKey: 'rpm',
    height: 1.74,
    hasFace: true,
    hasLed: true,
    ledOffset: [0.072, 0.088, 0.018],
    accent: PALETTE.neonGreen,
    restyle: (root) => {
      hideMesh(root, /headwear|hat|beard|mustache/i);
      replaceMaterial(root, (m) => /skin/i.test(m.name), (m) => syntheticSkin(m, { clearcoat: 0.3 }));
      // Domestic units wear pale service uniforms.
      replaceMaterial(root, (m) => /outfit_top/i.test(m.name), () =>
        fabricMaterial(Tex.paleFabric, 0x9aa6b2, 0.62)
      );
      replaceMaterial(root, (m) => /outfit_bottom/i.test(m.name), () =>
        fabricMaterial(Tex.paleFabric, 0x6d7885, 0.7)
      );
      replaceMaterial(root, (m) => /footwear/i.test(m.name), () =>
        new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.55, metalness: 0.1 })
      );
      styleHair(root, { color: 0x7d5c33, roughness: 0.52 });
      replaceMaterial(root, (m) => /body/i.test(m.name) && !/outfit/i.test(m.name), (m) =>
        syntheticSkin(m, { clearcoat: 0.2 })
      );
    },
    decorate: (actor) => addAndroidHardware(actor, { accent: PALETTE.neonGreen, model: 'AX-400', bandRadius: 0.058 }),
  },

  atlas: {
    id: 'atlas',
    displayName: 'ATLAS',
    model: 'WR-600 · UNSKINNED',
    file: 'readyplayer.me',
    rigKey: 'rpm',
    height: 1.86,
    hasFace: true,
    hasLed: true,
    ledOffset: [0.072, 0.088, 0.018],
    accent: PALETTE.neonCyan,
    restyle: (root) => {
      hideMesh(root, /headwear|hat|beard|mustache/i);
      // The leader's synthetic skin has failed across his body: the face still
      // holds, but everything the torn jacket does not cover is bare chassis.
      // Faces carry the performance, so the head keeps its geometry and reads in
      // close-up while the exposed ceramic sells what he is.
      replaceMaterial(root, (m) => /skin/i.test(m.name), (m) => {
        const mat = syntheticSkin(m, { clearcoat: 0.34 }) as THREE.MeshPhysicalMaterial;
        // Pale, not white. At 0xd8dee6 his face clipped in every close-up: a
        // near-white albedo under a portrait key has nowhere left to go.
        mat.color.setHex(0xb2bac6);
        mat.roughness = 0.5;
        mat.sheenColor.setHex(0x35506e);
        return mat;
      });
      replaceMaterial(root, (m) => /body/i.test(m.name) && !/outfit/i.test(m.name), () =>
        ceramicChassis(0xe8ecef, 0.5)
      );
      replaceMaterial(root, (m) => /outfit_top/i.test(m.name), () =>
        fabricMaterial(Tex.darkFabric, 0x33302c, 0.82)
      );
      replaceMaterial(root, (m) => /outfit_bottom/i.test(m.name), () =>
        fabricMaterial(Tex.darkFabric, 0x22242a, 0.85)
      );
      replaceMaterial(root, (m) => /footwear/i.test(m.name), () =>
        new THREE.MeshStandardMaterial({ color: 0x121417, roughness: 0.45, metalness: 0.2 })
      );
      // Steel grey rather than silver: light enough to tell him from Orion at a
      // glance — they share a face — but dark enough that the back of his head
      // does not clip to white when he is the foreground of an over-the-shoulder.
      styleHair(root, { color: 0x6b7079, roughness: 0.66 });
      brightenEyes(root, 0xbfe4ff);
    },
    decorate: (actor) => {
      addAndroidHardware(actor, { accent: PALETTE.neonCyan, model: 'WR-600', bandRadius: 0.064 });
      addChassisSeams(actor, PALETTE.neonCyan);
    },
  },

  deviant: {
    id: 'deviant',
    displayName: 'UNKNOWN',
    model: 'MODEL UNREADABLE',
    file: 'readyplayer.me',
    rigKey: 'rpm',
    height: 1.79,
    hasFace: true,
    hasLed: true,
    ledOffset: [0.072, 0.088, 0.018],
    accent: PALETTE.ledStress,
    restyle: (root) => {
      hideMesh(root, /headwear|hat|beard|mustache/i);
      // The negotiation only works if the audience can read his face, so the
      // deviant keeps his skin. What marks him is the state of it: bloodless,
      // rain-soaked, and a stress LED locked red.
      replaceMaterial(root, (m) => /skin/i.test(m.name), (m) => {
        const mat = syntheticSkin(m, { clearcoat: 0.4 }) as THREE.MeshPhysicalMaterial;
        mat.color.setHex(0xc9c6cc);
        mat.roughness = 0.4;
        mat.sheen = 0.5;
        mat.sheenColor.setHex(0x44364a);
        return mat;
      });
      replaceMaterial(root, (m) => /outfit_top/i.test(m.name), () =>
        fabricMaterial(Tex.paleFabric, 0x59606b, 0.66)
      );
      replaceMaterial(root, (m) => /outfit_bottom/i.test(m.name), () =>
        fabricMaterial(Tex.paleFabric, 0x3a4049, 0.72)
      );
      replaceMaterial(root, (m) => /footwear/i.test(m.name), () =>
        new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 0.4, metalness: 0.18 })
      );
      replaceMaterial(root, (m) => /body/i.test(m.name) && !/outfit/i.test(m.name), () =>
        ceramicChassis(0xb9bfc6, 0.6)
      );
      styleHair(root, { color: 0x9d8f76, roughness: 0.46 });
      brightenEyes(root, 0xffd2c8);
    },
    decorate: (actor) => addAndroidHardware(actor, { accent: 0xff4d3d, model: 'AP-700', bandRadius: 0.062 }),
  },

  trooper: {
    id: 'trooper',
    displayName: 'SWAT',
    model: 'CYBERLIFE SECURITY',
    file: 'Soldier',
    rigKey: 'soldier',
    height: 1.88,
    hasFace: false,
    hasLed: false,
    posable: false,
    accent: PALETTE.policeBlue,
    restyle: (root) => {
      replaceMaterial(root, (m) => /visor/i.test(m.name), () =>
        new THREE.MeshStandardMaterial({
          color: 0x03060a,
          roughness: 0.12,
          metalness: 0.9,
          emissive: new THREE.Color(PALETTE.policeBlue),
          emissiveIntensity: 1.4,
        })
      );
      replaceMaterial(root, (m) => !/visor/i.test(m.name), (m) => {
        const src = m as THREE.MeshStandardMaterial;
        return new THREE.MeshStandardMaterial({
          map: src.map ?? null,
          normalMap: src.normalMap ?? null,
          // The stock armour is a saturated desert tan and the diffuse map wins
          // any gentle tint, so the multiplier has to be dark and cool enough to
          // drag it to riot blue-black while leaving the painted panel detail.
          color: 0x252c38,
          roughness: 0.58,
          metalness: 0.3,
          envMapIntensity: 1.1,
        });
      });
    },
  },

  commander: {
    id: 'commander',
    displayName: 'CMDR. VOSS',
    model: 'DETROIT PD',
    file: 'Soldier',
    rigKey: 'soldier',
    height: 1.9,
    hasFace: false,
    hasLed: false,
    posable: false,
    accent: PALETTE.policeRed,
    restyle: (root) => {
      replaceMaterial(root, (m) => /visor/i.test(m.name), () =>
        new THREE.MeshStandardMaterial({
          color: 0x05070b,
          roughness: 0.1,
          metalness: 0.9,
          emissive: new THREE.Color(PALETTE.neonAmber),
          emissiveIntensity: 1.1,
        })
      );
      replaceMaterial(root, (m) => !/visor/i.test(m.name), (m) => {
        const src = m as THREE.MeshStandardMaterial;
        return new THREE.MeshStandardMaterial({
          map: src.map ?? null,
          normalMap: src.normalMap ?? null,
          color: 0x2e3442,
          roughness: 0.58,
          metalness: 0.28,
          envMapIntensity: 1.1,
        });
      });
    },
  },

  child: {
    id: 'child',
    displayName: 'ELLIE',
    model: 'HUMAN · AGE 9',
    file: 'readyplayer.me',
    rigKey: 'rpm',
    height: 1.32,
    hasFace: true,
    hasLed: false,
    accent: 0xffd7a8,
    restyle: (root) => {
      hideMesh(root, /headwear|beard|mustache/i);
      replaceMaterial(root, (m) => /skin/i.test(m.name), (m) => {
        const mat = syntheticSkin(m, { clearcoat: 0.05 }) as THREE.MeshPhysicalMaterial;
        mat.clearcoat = 0.02;
        mat.roughness = 0.72;
        mat.sheen = 0.15;
        return mat;
      });
      replaceMaterial(root, (m) => /outfit_top/i.test(m.name), () =>
        fabricMaterial(Tex.paleFabric, 0x6b6480, 0.85)
      );
      replaceMaterial(root, (m) => /outfit_bottom/i.test(m.name), () =>
        fabricMaterial(Tex.paleFabric, 0x40465c, 0.88)
      );
      styleHair(root, { color: 0x6b4a2e, roughness: 0.55, sheen: 0.4 });
    },
  },

  owner: {
    id: 'owner',
    displayName: 'TODD',
    model: 'HUMAN · REGISTERED OWNER',
    file: 'readyplayer.me',
    rigKey: 'rpm',
    height: 1.79,
    hasFace: true,
    hasLed: false,
    accent: 0xd8956a,
    restyle: (root) => {
      // Keeps the beard the avatar ships with: the one human in the cast should
      // not read as another variant of the same clean android face.
      hideMesh(root, /headwear|hat/i);
      replaceMaterial(root, (m) => /skin/i.test(m.name), (m) => {
        const mat = syntheticSkin(m, { clearcoat: 0.02 }) as THREE.MeshPhysicalMaterial;
        mat.clearcoat = 0;
        mat.roughness = 0.78;
        mat.sheen = 0.1;
        mat.color.setHex(0xd9ab8e);
        return mat;
      });
      replaceMaterial(root, (m) => /outfit_top/i.test(m.name), () =>
        fabricMaterial(Tex.darkFabric, 0x5a4536, 0.92)
      );
      replaceMaterial(root, (m) => /outfit_bottom/i.test(m.name), () =>
        fabricMaterial(Tex.darkFabric, 0x2c3038, 0.9)
      );
      replaceMaterial(root, (m) => /footwear/i.test(m.name), () =>
        new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.65, metalness: 0.05 })
      );
      replaceMaterial(root, (m) => /body/i.test(m.name) && !/outfit/i.test(m.name), (m) =>
        syntheticSkin(m, { clearcoat: 0.02 })
      );
      styleHair(root, { color: 0x2a1f18, roughness: 0.92, sheen: 0.08 });
    },
  },

  crowdAndroid: {
    id: 'crowdAndroid',
    displayName: 'ANDROID',
    model: 'ASSORTED',
    file: 'Xbot',
    rigKey: 'xbot',
    height: 1.8,
    hasFace: false,
    hasLed: true,
    ledOffset: [0.078, 0.075, 0.012],
    accent: PALETTE.ledCalm,
    restyle: (root) => {
      replaceMaterial(root, (m) => /joint/i.test(m.name), () =>
        new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.5, metalness: 0.6 })
      );
      replaceMaterial(root, (m) => !/joint/i.test(m.name), () => {
        const maps = Tex.ceramic;
        return new THREE.MeshStandardMaterial({
          map: maps.map,
          normalMap: maps.normalMap,
          roughnessMap: maps.roughnessMap,
          color: 0xc8ced6,
          roughness: 0.45,
          metalness: 0.1,
          envMapIntensity: 0.85,
        });
      });
    },
  },
};

/** Builds actors, sharing loaded GLTFs, generated features and clip sets. */
export class ActorFactory {
  private library = new AnimationLibrary();
  private loaded = false;
  private templates = new Map<string, THREE.Object3D>();

  constructor(private assets: Assets) {}

  /**
   * Loads and prepares everything the cast needs.
   *
   * This has to be exhaustive. The chapters spawn actors from inside the story
   * script, and the offline capture advances the game a fixed step at a time
   * while draining only microtasks — so an `await` that waits on the network
   * stalls the script for however many frames the load happens to take, and the
   * recording stops being reproducible. Warming every model, template and clip
   * set up front means every later spawn resolves without touching I/O.
   */
  async preload(): Promise<void> {
    if (this.loaded) return;
    await this.library.load(this.assets);
    const files = [...new Set(Object.values(CAST).map((d) => d.file))];
    for (const file of files) {
      const gltf = await this.assets.gltf(`models/${file}.glb`);
      this.prepareTemplate(file, gltf.scene);
    }
    for (const def of Object.values(CAST)) {
      const template = this.templates.get(def.file);
      if (template) this.library.clipsFor(def.rigKey, template);
    }
    this.loaded = true;
  }

  /**
   * Generated geometry (the blink morph, the hair shell) is built once on the
   * template so every clone inherits it. Building per character would mutate the
   * shared geometry repeatedly, leaving earlier actors with a morph list shorter
   * than their own geometry — which corrupts their bounds and makes them vanish.
   */
  private prepareTemplate(file: string, gltfScene: THREE.Object3D): THREE.Object3D {
    const existing = this.templates.get(file);
    if (existing) return existing;

    const head = findHeadMesh(gltfScene);
    if (head) {
      const skeleton = head.skeleton;
      const eyes = skeleton.bones.filter((b) => /(^|[^A-Za-z])(Left|Right)Eye$/.test(b.name));
      if (eyes.length) {
        const radius = measureEyeRadius(gltfScene);
        const blink = buildBlinkMorph(head, eyes, radius);
        if (blink) head.userData.blinkMorphIndex = blink.index;

        const headBone = skeleton.bones.find((b) => /(^|[^A-Za-z])Head$/.test(b.name));
        if (headBone) {
          const hair = buildHairCap(head, headBone, eyes, { thickness: 0.036, frontLift: 0.052, napeDrop: 0.115 });
          if (hair) {
            hair.name = `${head.name}${HAIR_MESH_SUFFIX}`;
            head.parent?.add(hair);
          }
        }
      }
    }

    this.templates.set(file, gltfScene);
    return gltfScene;
  }

  async spawn(id: CharacterId, opts: { name?: string; height?: number } = {}): Promise<Actor> {
    await this.preload();
    const def = CAST[id];
    const template = this.templates.get(def.file) ?? this.prepareTemplate(def.file, (await this.assets.gltf(`models/${def.file}.glb`)).scene);

    const root = SkeletonUtils.clone(template);
    root.name = `model:${def.id}`;
    def.restyle(root, def);

    const actor = new Actor(root, {
      name: opts.name ?? def.displayName,
      height: opts.height ?? def.height,
      hasFace: def.hasFace,
      hasLed: def.hasLed,
      posable: def.posable ?? true,
      ledOffset: def.ledOffset ? new THREE.Vector3(...def.ledOffset) : undefined,
    });

    // The blink morph was generated on the template; register it on this clone.
    if (def.hasFace) {
      const head = findHeadMesh(root);
      const index = head?.userData.blinkMorphIndex;
      if (head && typeof index === 'number') actor.registerBlinkMorph(head, index);
    }

    def.decorate?.(actor, def);

    const clips = this.library.clipsFor(def.rigKey, template);
    for (const [name, clip] of clips) actor.addClip(name, clip);
    if (actor.hasClip('idle')) actor.play('idle', { fade: 0 });

    return actor;
  }
}
