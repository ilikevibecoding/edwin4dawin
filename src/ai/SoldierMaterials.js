import * as THREE from 'three';

/**
 * Procedural material pass for Soldier.glb (Mixamo "vanguard"). The source albedo is a light-tan sci-fi
 * armour suit; at load we remap it into a modern tactical palette while keeping every bit of baked
 * shading, scratches and panel detail:
 *
 *   tan plates      → graphite (torso/arms), charcoal-olive (helmet), dark ranger fabric (legs), black boots
 *   olive fabric    → ranger green          brown straps/scuffs → grey webbing / lighter edge wear
 *   grey-blue metal → gunmetal (metallic)   black undersuit → near-black webbing
 *   red stripes     → brick-red patch on the shoulders only; graphite/olive everywhere else
 *
 * The remap is body-part aware: the mesh's UV triangles are rasterised into a part mask (dominant skin
 * joint per vertex → head/torso/arms/hands/legs/feet), so the same tan can become a helmet, a plate or
 * trousers. A second canvas packs roughness (G) and metalness (B) per material class.
 *
 * Output: a small pool of shared body materials (one per tint variant — instances pick one by seed, so
 * nothing is cloned per soldier), a dark glossy visor material and a vertex-coloured gear material.
 */

export const PART = { NONE: 0, HEAD: 1, TORSO: 2, ARMS: 3, HANDS: 4, LEGS: 5, FEET: 6 };
const PART_STEP = 30; // grey level per part id in the rasterised mask

/** Per-soldier variation (picked by seed): hue push ±0.02, value ±0.06 — applied as a material tint. */
const VARIANTS = [
  { dh: 0.0, dv: 0.0 },
  { dh: -0.02, dv: 0.04 },
  { dh: 0.02, dv: -0.05 },
  { dh: 0.01, dv: 0.06 },
  { dh: -0.015, dv: -0.06 },
];

export function partForBone(name) {
  if (/Head|Neck/.test(name)) return PART.HEAD;
  if (/Hand/.test(name)) return PART.HANDS;
  if (/Shoulder|Arm/.test(name)) return PART.ARMS;
  if (/Foot|Toe/.test(name)) return PART.FEET;
  if (/Leg/.test(name)) return PART.LEGS;
  if (/Spine|Hips/.test(name)) return PART.TORSO;
  return PART.NONE;
}

/** Paint each UV triangle with its dominant bone's part id. Returns a w*h Uint8Array of part ids. */
export function rasterizePartMask(skinned, w, h) {
  const geo = skinned.geometry;
  const uv = geo.attributes.uv;
  const ji = geo.attributes.skinIndex;
  const jw = geo.attributes.skinWeight;
  const mask = new Uint8Array(w * h);
  if (!uv || !ji || !jw || !skinned.skeleton) return mask;
  const partOfBone = skinned.skeleton.bones.map((b) => partForBone(b.name));
  const vertPart = new Uint8Array(uv.count);
  for (let v = 0; v < uv.count; v++) {
    let best = 0;
    let bw = -1;
    for (let k = 0; k < 4; k++) {
      const wgt = jw.getComponent(v, k);
      if (wgt > bw) {
        bw = wgt;
        best = ji.getComponent(v, k);
      }
    }
    vertPart[v] = partOfBone[best] || 0;
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  const index = geo.index;
  const triCount = index ? index.count / 3 : uv.count / 3;
  const id = (i) => (index ? index.getX(i) : i);
  // Group triangles by part so we set styles once per part (fill + stroke dilates over UV seams).
  for (let part = 1; part <= 6; part++) {
    const v = part * PART_STEP;
    ctx.fillStyle = ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    let any = false;
    for (let t = 0; t < triCount; t++) {
      const a = id(t * 3);
      if (vertPart[a] !== part) continue;
      const b = id(t * 3 + 1);
      const cc = id(t * 3 + 2);
      ctx.moveTo(uv.getX(a) * w, uv.getY(a) * h);
      ctx.lineTo(uv.getX(b) * w, uv.getY(b) * h);
      ctx.lineTo(uv.getX(cc) * w, uv.getY(cc) * h);
      ctx.closePath();
      any = true;
    }
    if (!any) continue;
    ctx.fill();
    ctx.stroke();
  }
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 0, n = w * h; i < n; i++) mask[i] = Math.round(data[i * 4] / PART_STEP);
  return mask;
}

/* ------------------------------------------------------------------------------------------------ colour */

const _hsl = { h: 0, s: 0, l: 0 };
const _out = [0, 0, 0];

function rgbToHsl(r, g, b, out) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) * 0.5;
  const c = max - min;
  let h = 0;
  let s = 0;
  if (c > 1e-6) {
    s = c / (1 - Math.abs(2 * l - 1) + 1e-6);
    if (max === r) h = ((g - b) / c) % 6;
    else if (max === g) h = (b - r) / c + 2;
    else h = (r - g) / c + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  out.h = h;
  out.s = s;
  out.l = l;
  return out;
}

function hslToRgb(h, s, l, out) {
  h = (((h % 360) + 360) % 360) / 60;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 1) [r, g] = [c, x];
  else if (h < 2) [r, g] = [x, c];
  else if (h < 3) [g, b] = [c, x];
  else if (h < 4) [g, b] = [x, c];
  else if (h < 5) [r, b] = [x, c];
  else [r, b] = [c, x];
  out[0] = r + m;
  out[1] = g + m;
  out[2] = b + m;
  return out;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Remap the source albedo (sRGB bytes) into the tactical palette. Returns { albedo, orm } canvases:
 * albedo is sRGB, orm packs (R unused, G roughness, B metalness) in linear space.
 */
export function remapAlbedo(image, mask, w, h) {
  const albedo = document.createElement('canvas');
  albedo.width = w;
  albedo.height = h;
  const actx = albedo.getContext('2d', { willReadFrequently: true });
  actx.drawImage(image, 0, 0, w, h);
  const img = actx.getImageData(0, 0, w, h);
  const px = img.data;
  const orm = document.createElement('canvas');
  orm.width = w;
  orm.height = h;
  const octx = orm.getContext('2d', { willReadFrequently: true });
  const oimg = octx.createImageData(w, h);
  const opx = oimg.data;

  for (let i = 0, n = w * h; i < n; i++) {
    const o = i * 4;
    const r = px[o] / 255;
    const g = px[o + 1] / 255;
    const b = px[o + 2] / 255;
    const { h: hue, s, l } = rgbToHsl(r, g, b, _hsl);
    const part = mask[i];
    const head = part === PART.HEAD;
    const legs = part === PART.LEGS;
    const feet = part === PART.FEET;
    const arms = part === PART.ARMS;
    let rough = 0.8;
    let metal = 0;
    let H = 0;
    let S = 0;
    let L = 0;

    const isRed = (hue >= 340 || hue < 18) && s > 0.45 && l > 0.12 && l < 0.62;
    const warm = hue >= 8 && hue <= 50;
    if (isRed && arms) {
      // Team patch: muted brick red, only on the shoulders.
      H = 3;
      S = 0.6;
      L = 0.13 + 0.45 * l;
      rough = 0.72;
    } else if ((warm && s > 0.26 && l > 0.4) || (isRed && !arms)) {
      // Tan armour plates (and the ex-red stripes): keep the shading, recolour per body part.
      const t = isRed ? 0.55 : clamp01((l - 0.4) / 0.52);
      // Matte hard surfaces (0.7–0.85): only the worn plate edges get a touch less roughness.
      if (head) {
        H = 100;
        S = 0.09;
        L = 0.14 + 0.2 * t;
        rough = 0.78 - 0.08 * t;
      } else if (legs) {
        H = 88;
        S = 0.17;
        L = 0.12 + 0.17 * t;
        rough = 0.9;
      } else if (feet) {
        H = 28;
        S = 0.08;
        L = 0.07 + 0.11 * t;
        rough = 0.72;
      } else {
        H = 215;
        S = 0.05;
        L = 0.16 + 0.24 * t;
        rough = 0.82 - 0.12 * t;
      }
    } else if (warm && s > 0.18 && l >= 0.14 && l <= 0.4) {
      // Dark-brown scuffs along the plate edges + the brown straps → webbing grey / subtle edge wear.
      const t = clamp01((l - 0.14) / 0.26);
      if (legs) {
        H = 60;
        S = 0.14;
        L = 0.13 + 0.11 * t;
        rough = 0.9;
      } else if (feet) {
        H = 28;
        S = 0.08;
        L = 0.07 + 0.08 * t;
        rough = 0.7;
      } else {
        H = 32;
        S = 0.06;
        L = 0.22 + 0.13 * t;
        rough = 0.78;
      }
    } else if (hue > 50 && hue < 165 && s > 0.1 && l > 0.07 && l < 0.55) {
      // Olive fabric → ranger green.
      H = 96;
      S = 0.22;
      L = 0.09 + 0.55 * l;
      rough = 0.93;
    } else if (hue >= 165 && hue <= 265 && l > 0.18 && l < 0.8 && s > 0.06) {
      // Grey-blue buckles / helmet brim → gunmetal.
      H = 210;
      S = 0.04;
      L = 0.2 + 0.5 * (l - 0.2);
      rough = 0.42;
      metal = 0.85;
    } else if (l < 0.13) {
      // Black undersuit / webbing (lift the floor so it is not a hole).
      H = 0;
      S = 0;
      L = 0.045 + 0.5 * l;
      rough = 0.84;
    } else if (l > 0.72 && s < 0.25) {
      // White chips → worn bare metal (softer on fabric).
      const t = clamp01((l - 0.72) / 0.28);
      if (legs) {
        H = 80;
        S = 0.15;
        L = 0.28 + 0.06 * t;
        rough = 0.85;
      } else {
        H = 210;
        S = 0.03;
        L = 0.38 + 0.25 * t;
        rough = 0.55;
        metal = 0.5;
      }
    } else {
      // Anything else: desaturate and darken (JPEG transitions, odd greys).
      H = hue;
      S = s * 0.25;
      L = 0.07 + 0.55 * l;
      rough = 0.8;
    }
    hslToRgb(H, S, clamp01(L), _out);
    px[o] = _out[0] * 255;
    px[o + 1] = _out[1] * 255;
    px[o + 2] = _out[2] * 255;
    px[o + 3] = 255;
    opx[o] = 255;
    opx[o + 1] = clamp01(rough) * 255;
    opx[o + 2] = clamp01(metal) * 255;
    opx[o + 3] = 255;
  }
  actx.putImageData(img, 0, 0);
  octx.putImageData(oimg, 0, 0);
  return { albedo, orm };
}

/* ------------------------------------------------------------------------------------------------ gear map */

/** Small tileable cordura/nylon weave used (multiplied by vertex colours) on the procedural gear. */
export function makeNylonCanvas(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const weave = ((x >> 1) + (y >> 1)) & 1 ? 8 : -8; // 2 px basket weave
      const ridge = (x & 3) === 0 || (y & 3) === 0 ? -6 : 0;
      const v = 232 + weave + ridge + (rnd() - 0.5) * 22;
      const o = (y * size + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = Math.max(0, Math.min(255, v));
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------------------------------------------------------------------------ materials */

function findMeshes(scene) {
  let body = null;
  let visor = null;
  scene.traverse((o) => {
    if (!o.isSkinnedMesh && !o.isMesh) return;
    if (/visor/i.test(o.name) || /visor/i.test(o.material?.name || '')) visor = o;
    else if (!body) body = o;
  });
  return { body, visor };
}

function variantTint(dh, dv) {
  // Multiplicative tint: a hue push (warm ↔ cool) plus a value offset, kept in linear space.
  const v = 1 + dv;
  return new THREE.Color((1 + dh * 3) * v, v, (1 - dh * 3) * v);
}

/**
 * Build the shared soldier materials from the loaded gltf. Textures are generated once; `body` is an
 * array of tint variants sharing the same maps.
 */
export function createSoldierMaterials(game, gltf) {
  const { body, visor } = findMeshes(gltf.scene);
  const srcMat = body?.material;
  const image = srcMat?.map?.image;
  const anisotropy = game.assets?.anisotropy ?? 8;
  let map = null;
  let ormTex = null;
  if (image && (image.width || image.naturalWidth)) {
    const w = image.width || image.naturalWidth;
    const h = image.height || image.naturalHeight;
    const t0 = performance.now();
    const mask = rasterizePartMask(body, w, h);
    const { albedo, orm } = remapAlbedo(image, mask, w, h);
    map = new THREE.CanvasTexture(albedo);
    map.colorSpace = THREE.SRGBColorSpace;
    ormTex = new THREE.CanvasTexture(orm);
    ormTex.colorSpace = THREE.NoColorSpace;
    for (const t of [map, ormTex]) {
      t.flipY = false; // glTF UV convention (the source textures are flipY = false too)
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = anisotropy;
      t.needsUpdate = true;
    }
    console.info(`[enemies] soldier albedo remapped ${w}×${h} in ${(performance.now() - t0).toFixed(0)} ms`);
  }

  const bodyVariants = VARIANTS.map(({ dh, dv }, i) => {
    const m = new THREE.MeshStandardMaterial({
      name: `SoldierBody${i}`,
      color: variantTint(dh, dv),
      map,
      normalMap: srcMat?.normalMap || null,
      roughnessMap: ormTex,
      metalnessMap: ormTex,
      roughness: ormTex ? 1 : 0.8,
      metalness: ormTex ? 1 : 0,
      envMapIntensity: 1.0,
    });
    if (m.normalMap) m.normalScale.set(1.0, 1.0);
    if (!map) m.color.setRGB(0.08, 0.085, 0.09);
    return m;
  });

  const visorMat = new THREE.MeshStandardMaterial({
    name: 'SoldierVisor',
    color: new THREE.Color(0.006, 0.007, 0.009),
    roughness: 0.15,
    metalness: 0.0,
    envMapIntensity: 1.6,
    normalMap: visor?.material?.normalMap || null,
  });
  if (visorMat.normalMap) visorMat.normalScale.set(0.5, 0.5);

  const nylon = new THREE.CanvasTexture(makeNylonCanvas(128));
  nylon.colorSpace = THREE.SRGBColorSpace;
  nylon.wrapS = nylon.wrapT = THREE.RepeatWrapping;
  nylon.anisotropy = anisotropy;
  nylon.needsUpdate = true;
  const gearMat = new THREE.MeshStandardMaterial({
    name: 'SoldierGear',
    map: nylon,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0.9,
  });

  return { body: bodyVariants, visor: visorMat, gear: gearMat, textures: [map, ormTex, nylon].filter(Boolean) };
}
