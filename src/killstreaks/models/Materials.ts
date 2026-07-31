/**
 * The material set every killstreak asset is built from.
 *
 * Everything comes out of the procgen library so the aircraft sit in the same
 * lighting response as the level, with clones rather than the shared instances
 * because low-visibility grey is a recolour of the panel material rather than a
 * material of its own. The handful of exceptions — the black hole of an intake,
 * an afterburner, a navigation light — have no baked equivalent because they are
 * pure emission or pure absorption.
 *
 * Built once and shared across every instance, so three jets and twelve bombs
 * cost one material set.
 */
import * as THREE from 'three';
import type { MaterialId, MaterialLibrary } from '../../core/Contracts';

export interface AirframeMaterials {
  /** Low-visibility grey, the main airframe skin. */
  skin: THREE.MeshStandardMaterial;
  /** Darker panel, for control surfaces and the radome. */
  panel: THREE.MeshStandardMaterial;
  /** Bare metal, for nozzles, exhaust and gun barrels. */
  metal: THREE.MeshStandardMaterial;
  /** Near-black, for intake ducts and window interiors. */
  cavity: THREE.MeshStandardMaterial;
  /** Canopy glass. */
  glass: THREE.MeshStandardMaterial;
  /** Olive drab, for ordnance bodies and crates. */
  olive: THREE.MeshStandardMaterial;
  /** Bright hazard yellow, for the bands on live ordnance. */
  band: THREE.MeshStandardMaterial;
  /** Canvas, for parachutes and drogues. */
  canvas: THREE.MeshStandardMaterial;
  /** Additive afterburner flame. */
  burner: THREE.MeshBasicMaterial;
  navRed: THREE.MeshBasicMaterial;
  navGreen: THREE.MeshBasicMaterial;
  navWhite: THREE.MeshBasicMaterial;
  dispose(): void;
}

export function buildAirframeMaterials(library: MaterialLibrary | null): AirframeMaterials {
  const owned: Array<{ dispose(): void }> = [];

  const from = (
    id: MaterialId,
    tweak: Partial<THREE.MeshStandardMaterial>,
    fallbackColor: number,
  ): THREE.MeshStandardMaterial => {
    let material: THREE.MeshStandardMaterial;
    if (library && library.has(id)) {
      material = library.clone(id);
    } else {
      material = new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.7 });
      owned.push(material);
    }
    Object.assign(material, tweak);
    return material;
  };

  const skin = from(
    'metal_panel',
    { color: new THREE.Color(0x5f666d), roughness: 0.58, metalness: 0.42 },
    0x5f666d,
  );
  skin.name = 'ks:skin';

  const panel = from(
    'steel_brushed',
    { color: new THREE.Color(0x40464c), roughness: 0.5, metalness: 0.6 },
    0x40464c,
  );
  panel.name = 'ks:panel';

  const metal = from(
    'gun_metal',
    { color: new THREE.Color(0x33383d), roughness: 0.4, metalness: 0.9 },
    0x33383d,
  );
  metal.name = 'ks:metal';

  const cavity = new THREE.MeshStandardMaterial({
    name: 'ks:cavity',
    color: 0x05070a,
    roughness: 0.95,
    metalness: 0,
  });
  owned.push(cavity);

  const glass = from(
    'vehicle_glass',
    {
      color: new THREE.Color(0x1d2a30),
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
    },
    0x1d2a30,
  );
  glass.name = 'ks:glass';

  const olive = from(
    'vehicle_paint_green',
    { color: new THREE.Color(0x4a5240), roughness: 0.66, metalness: 0.22 },
    0x4a5240,
  );
  olive.name = 'ks:olive';

  const band = new THREE.MeshStandardMaterial({
    name: 'ks:band',
    color: 0xb8a03a,
    roughness: 0.62,
    metalness: 0.15,
  });
  owned.push(band);

  const canvas = from(
    'fabric_canvas',
    { color: new THREE.Color(0xa8a294), roughness: 0.9, metalness: 0, side: THREE.DoubleSide },
    0xa8a294,
  );
  canvas.name = 'ks:canvas';

  const burner = new THREE.MeshBasicMaterial({
    name: 'ks:burner',
    color: 0xffb877,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true,
    side: THREE.DoubleSide,
  });
  owned.push(burner);

  const nav = (color: number, name: string): THREE.MeshBasicMaterial => {
    const m = new THREE.MeshBasicMaterial({
      name,
      color,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: true,
    });
    owned.push(m);
    return m;
  };

  return {
    skin,
    panel,
    metal,
    cavity,
    glass,
    olive,
    band,
    canvas,
    burner,
    navRed: nav(0xff2a18, 'ks:navRed'),
    navGreen: nav(0x22ff5a, 'ks:navGreen'),
    navWhite: nav(0xffffff, 'ks:navWhite'),
    dispose(): void {
      // Library clones are owned by the library and disposed with it; only the
      // materials created here are ours to release.
      for (const m of owned) m.dispose();
      owned.length = 0;
    },
  };
}
