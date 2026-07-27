import * as THREE from 'three';
import { generateTextureSet } from '../art/texgen.js';
import { makeFbm, makeWorley } from '../art/noise.js';
import { hashString } from '../core/rng.js';

// ---------------------------------------------------------------------------
// Character surface materials.  (owner: fable4)
//
// The shared prop families in art/materials.js tile at ~1 metre, so a 0.36 m
// torso samples a third of one repeat and reads as flat untextured colour
// (QA: "the hostages read as mannequins"). These surfaces are authored for
// garment scale: ~0.2 m per repeat so weave/knit structure resolves at the
// 2-4 m the player actually views a character from, plus heather and fold-
// scale value break-up so no clothing panel reads as one flat tone.
// ---------------------------------------------------------------------------

const charMatCache = new Map();

/**
 * A procedural garment surface. `mode` selects the cloth structure:
 *   'poplin'  fine shirting weave — subtle warp/weft tooth, crisp
 *   'twill'   diagonal rib — trousers, fatigues, denim
 *   'knit'    vertical ribs + fuzz — cardigans, beanies, balaclavas
 */
export function garment(key, {
  tint, mode = 'twill', rough = 0.9, roughVar = 0.05,
  valueVar = 0.09, repeat = 5, normalStrength = 0.7,
}) {
  const ck = `garment:${key}`;
  if (charMatCache.has(ck)) return charMatCache.get(ck);
  const maps = generateTextureSet(ck, 128, (a) => {
    const { ctx, size } = a;
    const fbm = makeFbm(hashString(`gmf${key}`), { octaves: 3 });
    const r = (tint >> 16) & 255, g = (tint >> 8) & 255, b = tint & 255;
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        let weave; // -0.5..0.5 cloth structure
        if (mode === 'poplin') {
          // Fine plain weave: alternating warp/weft picks, barely resolved.
          weave = (((x >> 1) + (y >> 1)) % 2 === 0
            ? Math.sin(x * Math.PI / 2) : Math.sin(y * Math.PI / 2)) * 0.22;
        } else if (mode === 'knit') {
          // Vertical rib columns with a slight row wobble.
          weave = Math.sin(x * Math.PI / 3 + Math.sin(y * 0.8) * 0.6) * 0.32
            + Math.sin(y * Math.PI / 5) * 0.1;
        } else { // twill
          weave = Math.sin((x + y * 0.55) * Math.PI / 3) * 0.26;
        }
        // Heathered yarn + fold-scale shading so panels never read flat.
        const heather = fbm(u * 26, v * 26, 26) * 0.35;
        const fold = fbm(u * 2.5, v * 2.5, 2.5) * 0.45;
        const fuzz = fbm(u * 90, v * 90, 90) * 0.2;
        const t = weave + heather + fold + fuzz;
        const f = 1 + t * valueVar * 2;
        const i = (y * size + x) * 4;
        d[i] = Math.max(0, Math.min(255, r * f));
        d[i + 1] = Math.max(0, Math.min(255, g * f));
        d[i + 2] = Math.max(0, Math.min(255, b * f));
        d[i + 3] = 255;
        a.height[y * size + x] = 0.5 + weave * 0.55 + fuzz * 0.3;
        a.rough[y * size + x] = rough + weave * roughVar + fold * roughVar;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { baseRoughness: rough, normalStrength, ao: false, repeat });
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: maps.map, normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap, roughness: 1, metalness: 0,
  });
  m.normalScale = new THREE.Vector2(normalStrength, normalStrength);
  m.userData.materialKey = ck;
  charMatCache.set(ck, m);
  return m;
}

/**
 * Skin with subtle tonal mottle and matte-but-alive roughness. A uniform
 * MeshStandardMaterial at roughness 0.6 is what made faces read as plastic;
 * this keeps the value/rough variation small enough to hold at distance.
 */
export function skinSurface(key, tint, { rough = 0.72 } = {}) {
  const ck = `skin:${key}`;
  if (charMatCache.has(ck)) return charMatCache.get(ck);
  const maps = generateTextureSet(ck, 64, (a) => {
    const { ctx, size } = a;
    const fbm = makeFbm(hashString(`skf${key}`), { octaves: 3 });
    const worley = makeWorley(hashString(`skw${key}`), 26);
    const r = (tint >> 16) & 255, g = (tint >> 8) & 255, b = tint & 255;
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const mottle = fbm(u * 8, v * 8, 8) * 0.5;
        const pore = Math.min(1, worley(u, v).edge * 30) * 0.5 - 0.25;
        const f = 1 + mottle * 0.10 + pore * 0.04;
        const i = (y * size + x) * 4;
        // Mottle drifts slightly redder in the troughs, like real skin.
        d[i] = Math.max(0, Math.min(255, r * (f + 0.015)));
        d[i + 1] = Math.max(0, Math.min(255, g * f));
        d[i + 2] = Math.max(0, Math.min(255, b * (f - 0.01)));
        d[i + 3] = 255;
        a.height[y * size + x] = 0.5 + pore * 0.2;
        a.rough[y * size + x] = rough + mottle * 0.08 - pore * 0.05;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { baseRoughness: rough, normalStrength: 0.35, ao: false, repeat: 3 });
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: maps.map, normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap, roughness: 1, metalness: 0,
  });
  m.normalScale = new THREE.Vector2(0.35, 0.35);
  m.userData.materialKey = ck;
  charMatCache.set(ck, m);
  return m;
}
