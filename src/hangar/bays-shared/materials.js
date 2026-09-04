// Module-local materials shared by the four Deck 4 side bays (COORDINATION.md §10: manifest.materials
// (shared) -> {key: Material}; <= 2 canvas textures <= 1024^2 per module). One 256^2 canvas (the
// black / yellow hazard tile — the library `hazard` is orange). Instances are cached so the four bays
// share one texture and one material object each.
import * as THREE from "three";

// Imperial marking yellow (floor lines, stair nosings, hazard blocks). Not in PALETTE.
export const YELLOW = 0xe6c34a;

let cache = null;

function hazardTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  let s = 19;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // 45° stripes, 4 yellow / 4 black per tile, anti-aliased over ~1.5 px
      const st = ((u + v) * 4) % 1;
      const edge = Math.min(Math.abs(st), Math.abs(st - 0.5), Math.abs(st - 1)) * size * 0.5;
      const k = Math.min(1, edge / 1.5);
      const yellow = st < 0.5;
      const n = rnd();
      const speck = n > 0.97 ? 0.6 : 1;
      let r = yellow ? 0.88 * speck : 0.07;
      let gg = yellow ? 0.75 * speck : 0.07;
      let b = yellow ? 0.24 * speck : 0.08;
      if (!yellow && n > 0.985) r = gg = b = 0.22;
      // soften toward the neighbouring stripe colour at the edge
      const or = yellow ? 0.07 : 0.88;
      const og = yellow ? 0.07 : 0.75;
      const ob = yellow ? 0.08 : 0.24;
      const m = (1 - k) * 0.5;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round((r * (1 - m) + or * m) * 255);
      img.data[i + 1] = Math.round((gg * (1 - m) + og * m) * 255);
      img.data[i + 2] = Math.round((b * (1 - m) + ob * m) * 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Materials every bay registers: hazardImp (black/yellow), bayFloor (dark reflective plating: the deck
 * normal map for plate relief but no albedo scuffs, tinted by vertex colour), emitCeil (faint ceiling
 * light channel, below the bloom threshold so it reads as a lit plane rather than a fixture).
 */
export function bayMaterials(shared) {
  if (cache) return cache;
  const hazardImp = new THREE.MeshStandardMaterial({
    map: hazardTexture(256),
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.58,
    metalness: 0.08,
    envMapIntensity: 0.5,
  });
  const deck = shared.deck || shared.impFloor;
  const bayFloor = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    normalMap: deck ? deck.normalMap : null,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.4,
    metalness: 0.22,
    envMapIntensity: 0.9,
  });
  const emitCeil = new THREE.MeshStandardMaterial({
    color: 0x0a0c10,
    emissive: new THREE.Color("#aabfe6"),
    emissiveIntensity: 0.8,
    roughness: 0.6,
    metalness: 0,
  });
  cache = { hazardImp, bayFloor, emitCeil };
  return cache;
}
