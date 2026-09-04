// Module-local materials for the doors system (COORDINATION.md §10: manifest.materials(shared)).
// One canvas texture (black/yellow chevrons) — the shared `hazard` is Kestrel orange.
import * as THREE from "three";
import { makeCanvas, toTexture, mulberry32 } from "../../textures.js";

// Black / yellow diagonal warning stripes with light grime. 6 stripe pairs per tile.
export function makeChevronTexture(size = 512, seed = 7) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const d = img.data;
  const rnd = mulberry32(seed);
  // low-frequency grime field (a few blurred blobs) so the paint never reads as a flat fill;
  // evaluated on a coarse tiling grid and bilinearly sampled per pixel (the per-pixel blob loop
  // was the whole module's build cost)
  const G = 64;
  const blobs = [];
  for (let i = 0; i < 18; i++) blobs.push([rnd(), rnd(), 0.06 + rnd() * 0.16, 0.25 + rnd() * 0.5]);
  const grime = new Float32Array((G + 1) * (G + 1));
  for (let gy = 0; gy <= G; gy++) {
    for (let gx = 0; gx <= G; gx++) {
      const u = gx / G;
      const v = gy / G;
      let s = 0;
      for (const [bx, by, br, bs] of blobs) {
        const dx = Math.min(Math.abs(u - bx), 1 - Math.abs(u - bx));
        const dy = Math.min(Math.abs(v - by), 1 - Math.abs(v - by));
        const dd = Math.sqrt(dx * dx + dy * dy) / br;
        if (dd < 1) s += (1 - dd) * (1 - dd) * bs;
      }
      grime[gy * (G + 1) + gx] = Math.min(0.45, s);
    }
  }
  const Y = [0.92, 0.78, 0.14];
  const K = [0.07, 0.07, 0.08];
  const grimeTint = [0.11, 0.11, 0.12];
  const edgePx = 6 * size; // stripe-space → pixel scale for the ~2 px anti-aliased edge
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * G;
    const gy = Math.floor(fy);
    const ty = fy - gy;
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * G;
      const gx = Math.floor(fx);
      const tx = fx - gx;
      const i00 = gy * (G + 1) + gx;
      const gr = (grime[i00] * (1 - tx) + grime[i00 + 1] * tx) * (1 - ty) + (grime[i00 + G + 1] * (1 - tx) + grime[i00 + G + 2] * tx) * ty + (rnd() - 0.5) * 0.04;
      const s = (((x + y) / size) * 6) % 1;
      const yellow = s < 0.5;
      const A = yellow ? Y : K;
      const B = yellow ? K : Y;
      // blend toward the other colour right at the stripe edge (anti-aliasing baked into the texture)
      const mix = 1 - Math.min(1, (Math.min(Math.abs(s - 0.5), s, 1 - s) * edgePx) / 2);
      const m = 1 - gr;
      const i = (y * size + x) * 4;
      // Uint8ClampedArray rounds and clamps
      d[i] = ((A[0] * (1 - mix) + B[0] * mix) * m + grimeTint[0] * gr) * 255;
      d[i + 1] = ((A[1] * (1 - mix) + B[1] * mix) * m + grimeTint[1] * gr) * 255;
      d[i + 2] = ((A[2] * (1 - mix) + B[2] * mix) * m + grimeTint[2] * gr) * 255;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true });
}

/**
 * @param {Record<string, THREE.Material>} shared shared library (§10)
 * @returns {Record<string, THREE.Material>} keys merged into this module's kit / used by its meshes
 */
export function doorMaterials(shared) {
  const metal = shared.metal || null;
  // Leaves: dark gunmetal, textured with the shared worn-metal maps (vertex colours tint plates,
  // stripes and edge bars; instanceColor gives each door a slight tone shift).
  const doorLeaf = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.6,
    map: metal ? metal.map : null,
    normalMap: metal ? metal.normalMap : null,
    normalScale: new THREE.Vector2(0.5, 0.5),
    envMapIntensity: 1.0,
  });
  // Status lights: unlit, colour comes entirely from instanceColor in HDR (values > 1 bloom).
  const doorLight = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // Threshold / lintel hazard chevrons (blast + bay doors).
  const doorHazard = new THREE.MeshStandardMaterial({
    map: makeChevronTexture(512, 7),
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.08,
    envMapIntensity: 0.5,
  });
  return { doorLeaf, doorLight, doorHazard };
}
