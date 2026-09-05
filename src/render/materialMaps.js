// Registry for the per-texel material atlases built by src/textures.js: the tangent-space normal atlas and the
// material atlas (R roughness, G metalness, B emissive). Consumers (world / entity / water shaders) read them via
// getMaterialMaps(); until the atlases exist they get 1x1 neutral placeholders (flat normal, rough dielectric).
import * as THREE from 'three';

let normal = null, material = null;

function placeholder(rgba) {
  const tex = new THREE.DataTexture(new Uint8Array(rgba), 1, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function getMaterialMaps() {
  if (!normal) normal = placeholder([128, 128, 255, 255]);
  if (!material) material = placeholder([230, 0, 0, 255]);
  return { normal, material };
}

export function setMaterialMaps(normalTex, materialTex) {
  normal = normalTex;
  material = materialTex;
}
