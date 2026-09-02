import * as THREE from 'three';

/**
 * Material upgrades for the glTF rifle: max anisotropy on every map, correct colour spaces, a touch of
 * environment response, and a shared "detail" hook other weapon modules can reuse.
 * (The attachments team may extend this with a detail-normal / edge-wear shader injection.)
 */
export function upgradeGunMaterials(game, rig) {
  const aniso = game.assets.anisotropy;
  const mats = new Set();
  rig.gltfScene.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) mats.add(m);
  });
  for (const m of mats) {
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
      const t = m[key];
      if (t) {
        t.anisotropy = aniso;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.needsUpdate = true;
      }
    }
    m.envMapIntensity = 1.1;
    m.roughness = 0.85; // multiplied by the roughness map
    m.metalness = 0.5; // multiplied by the metalness map — part-diffuse so sunlight shapes the forms
    // Lift the very dark albedo: real "black" anodised/parkerised steel reads as mid grey under sunlight.
    m.color.setRGB(3.3, 3.3, 3.4);
    if (m.normalScale) m.normalScale.set(1.0, 1.0);
    m.side = THREE.FrontSide;
    m.needsUpdate = true;
  }
  return Array.from(mats);
}
