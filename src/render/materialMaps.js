// Material maps contract (rubric 5, criterion 2). The texture builder (R2) produces two atlases laid out exactly like
// the colour atlas (same tile grid, same tile indices, NearestFilter, per-tile mipmaps allowed) and hands them over
// with setMaterialMaps(); until then the shaders sample 1x1 placeholders that mean "flat, rough, non-metal, no glow".
//
//   normal   RGB = tangent-space normal, OpenGL convention: R = +u (texture right), G = toward the TOP of the tile
//            canvas (decreasing v), B = out of the surface. (128,128,255) is flat.
//   material R = roughness (0 mirror .. 1 rough), G = metalness, B = emissive strength 0..1, A unused (255).
//
// Emissive output is albedo * B * 2.2 (HDR, unaffected by shadows and sky light, still fogged); metals reflect the
// sky gradient tinted by their albedo; roughness drives the sun's GGX-lite highlight.
import * as THREE from 'three';

function dataTexture(rgba, size = 1) {
  const t = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

const FLAT_NORMAL = dataTexture(new Uint8Array([128, 128, 255, 255]));
const FLAT_MATERIAL = dataTexture(new Uint8Array([230, 0, 0, 255]));   // roughness 0.9, metalness 0, emissive 0

const maps = { normal: FLAT_NORMAL, material: FLAT_MATERIAL, placeholder: true };
const listeners = new Set();

export function getMaterialMaps() { return maps; }

// Installs the real atlases (or `null` to go back to the placeholders). Materials pick the change up immediately
// because the uniform objects are shared; listeners (the pipeline) are told so they can log / re-bind.
export function setMaterialMaps(normalTex, materialTex) {
  maps.normal = normalTex || FLAT_NORMAL;
  maps.material = materialTex || FLAT_MATERIAL;
  maps.placeholder = !normalTex && !materialTex;
  MATERIAL_MAP_UNIFORMS.uNormalMap.value = maps.normal;
  MATERIAL_MAP_UNIFORMS.uMaterialMap.value = maps.material;
  for (const fn of listeners) fn(maps);
  return maps;
}

export function onMaterialMaps(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Shared uniform objects (bind into every material that samples the maps).
export const MATERIAL_MAP_UNIFORMS = {
  uNormalMap: { value: FLAT_NORMAL },
  uMaterialMap: { value: FLAT_MATERIAL },
};

export function bindMaterialMaps(material) {
  material.uniforms.uNormalMap = MATERIAL_MAP_UNIFORMS.uNormalMap;
  material.uniforms.uMaterialMap = MATERIAL_MAP_UNIFORMS.uMaterialMap;
  return material;
}

// ---------------------------------------------------------------------------------------------------------------
// Dev-only generators (never used by default; `?normaltest=1` / `?matdebug=1`). They exist so the tangent-frame
// sign convention and the material response can be verified before the real atlases land.

// Every tile gets a raised square in the middle (a bevel 2 px wide at the atlas resolution): with the OpenGL
// convention, the edge of the square facing the sun must be lit and the far edge dark.
export function buildTestNormalAtlas(atlasCanvas, tilePx, tilesPerRow) {
  const size = tilesPerRow * tilePx;
  const data = new Uint8Array(size * size * 4);
  const q = Math.max(2, Math.round(tilePx / 4));      // inset of the square
  const bevel = Math.max(1, Math.round(tilePx / 8));
  for (let ty = 0; ty < tilesPerRow; ty++) for (let tx = 0; tx < tilesPerRow; tx++) {
    for (let y = 0; y < tilePx; y++) for (let x = 0; x < tilePx; x++) {
      let nx = 0, ny = 0;
      const inX = x >= q && x < tilePx - q, inY = y >= q && y < tilePx - q;
      if (inX && inY) {
        if (x < q + bevel) nx = -0.7;                  // left edge of the square slopes toward -u
        else if (x >= tilePx - q - bevel) nx = 0.7;    // right edge slopes toward +u
        if (y < q + bevel) ny = 0.7;                   // top edge (small v) slopes toward the canvas top
        else if (y >= tilePx - q - bevel) ny = -0.7;
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const o = ((ty * tilePx + y) * size + tx * tilePx + x) * 4;
      data[o] = Math.round(128 + nx * 127); data[o + 1] = Math.round(128 + ny * 127); data[o + 2] = Math.round(128 + nz * 127); data[o + 3] = 255;
    }
  }
  return dataTexture(data, size);
}

// Derives plausible maps from the colour atlas: height = luminance (bumps), metal/rough/emissive from block names.
// Only a stand-in for verification screenshots; the real maps are authored per material class by the texture builder.
export function buildDerivedMaps(atlasCanvas, tilePx, tilesPerRow, tileNames, blocks) {
  const size = tilesPerRow * tilePx;
  const ctx = atlasCanvas.getContext('2d');
  const img = ctx.getImageData(0, 0, size, size).data;
  const normal = new Uint8Array(size * size * 4);
  const material = new Uint8Array(size * size * 4);
  const lum = (o) => (img[o] * 0.299 + img[o + 1] * 0.587 + img[o + 2] * 0.114) / 255;
  const classOf = (name) => {
    if (/chrome/.test(name)) return { rough: 0.12, metal: 1.0 };
    if (/durasteel|deck_plate|hull|vent|console|iron_block|anvil|iron_bars|rail|panel_/.test(name)) return { rough: 0.45, metal: 0.85 };
    if (/gold/.test(name)) return { rough: 0.35, metal: 1.0 };
    if (/steel_glass|glass|window/.test(name)) return { rough: 0.08, metal: 0.0 };
    if (/water/.test(name)) return { rough: 0.1, metal: 0.0 };
    if (/planks|log|door|crate|barrel|shelf|sign|fence|table|piano/.test(name)) return { rough: 0.75, metal: 0.0 };
    if (/stone|brick|cobble|sandstone|gravestone|plaster|smooth/.test(name)) return { rough: 0.85, metal: 0.0 };
    return { rough: 0.92, metal: 0.0 };
  };
  const emitByTile = new Map();
  for (const b of blocks) if (b && b.emit > 0 && b.tex) for (const t of b.tex) emitByTile.set(t, Math.max(emitByTile.get(t) || 0, b.emit / 15));
  for (let ti = 0; ti < tilesPerRow * tilesPerRow; ti++) {
    const name = tileNames[ti] || '';
    const cls = classOf(name);
    const emit = emitByTile.get(ti) || 0;
    const tx = (ti % tilesPerRow) * tilePx, ty = Math.floor(ti / tilesPerRow) * tilePx;
    const h = (x, y) => lum((((ty + ((y + tilePx) % tilePx)) * size) + tx + ((x + tilePx) % tilePx)) * 4);
    for (let y = 0; y < tilePx; y++) for (let x = 0; x < tilePx; x++) {
      const o = ((ty + y) * size + tx + x) * 4;
      const dx = (h(x + 1, y) - h(x - 1, y)) * 2.2, dy = (h(x, y + 1) - h(x, y - 1)) * 2.2;
      // height increases with luminance; the slope toward +u is -dh/du, toward the canvas top is +dh/dv
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      normal[o] = Math.round(128 + nx * 127); normal[o + 1] = Math.round(128 + ny * 127); normal[o + 2] = Math.round(128 + nz * 127); normal[o + 3] = 255;
      const bright = h(x, y);
      material[o] = Math.round(cls.rough * 255);
      material[o + 1] = Math.round(cls.metal * 255);
      material[o + 2] = Math.round(Math.min(1, emit * Math.max(0, (bright - 0.35) / 0.65)) * 255);
      material[o + 3] = 255;
    }
  }
  return { normal: dataTexture(normal, size), material: dataTexture(material, size) };
}
