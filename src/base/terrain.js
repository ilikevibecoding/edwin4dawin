/**
 * Terrain: a flat desert operating area ringed by rolling ground and a distant
 * mountain silhouette. Built as a single displaced grid with vertex colours,
 * plus instanced rock and scrub scatter near the site for close-up detail.
 */

import * as THREE from 'three';
import { WORLD } from '../config.js';
import { noise, noiseB, Noise } from '../util/noise.js';
import { clamp01, smoothstep, lerp } from '../util/mathx.js';
import { Random } from '../util/rng.js';
import { sandMaps, gravelMap, macroGround } from '../util/textures.js';
import { matGravel } from '../util/materials.js';

const ridgeNoise = new Noise(4242);

/**
 * Break up a tiled ground material with world-space macro variation.
 *
 * A detail map tiled a couple of hundred times reads as one flat tone with an
 * obvious repeat, because every square metre gets the same average colour. This
 * injects two much larger scales of tonal drift plus a gravel-patch blend keyed
 * off world XZ, so the surface gains the drifts and washes that make desert
 * ground legible. The terrain meshes sit at the origin, so object-space XZ is
 * world XZ and no extra attribute is needed.
 */
function addGroundMacro(mat, {
  broad = 900, patch = 260, tint = 0x6c6355, strength = 0.34, patchAmount = 0.42,
} = {}) {
  const macro = macroGround(256, 4);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMacro = { value: macro };
    shader.uniforms.uMacroBroad = { value: 1 / broad };
    shader.uniforms.uMacroPatch = { value: 1 / patch };
    shader.uniforms.uMacroTint = { value: new THREE.Color(tint) };
    shader.uniforms.uMacroStrength = { value: strength };
    shader.uniforms.uMacroPatchAmount = { value: patchAmount };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXZ = position.xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', /* glsl */`
        #include <common>
        varying vec2 vGroundXZ;
        uniform sampler2D uMacro;
        uniform float uMacroBroad;
        uniform float uMacroPatch;
        uniform vec3  uMacroTint;
        uniform float uMacroStrength;
        uniform float uMacroPatchAmount;
      `)
      .replace('#include <color_fragment>', /* glsl */`
        #include <color_fragment>
        {
          vec3 mA = texture2D(uMacro, vGroundXZ * uMacroBroad).rgb;
          vec3 mB = texture2D(uMacro, vGroundXZ * uMacroPatch).rgb;
          // Tonal drift across two scales, centred so the average albedo is
          // unchanged and the lighting balance of the site is preserved.
          float drift = (mA.r - 0.5) * 1.15 + (mB.b - 0.5) * 0.75;
          diffuseColor.rgb *= 1.0 + drift * uMacroStrength;
          // Gravel and rock scatter collect in patches rather than evenly.
          float grav = smoothstep(0.52, 0.78, mA.g * 0.55 + mB.g * 0.55);
          diffuseColor.rgb = mix(diffuseColor.rgb, uMacroTint, grav * uMacroPatchAmount);
        }
      `);
  };
  // Any change to the injected program needs a fresh compile.
  mat.customProgramCacheKey = () => `groundmacro:${broad}:${patch}:${tint}`;
  return mat;
}

/**
 * Site elevation. Flat and level across the operating area, then rolling
 * ground, then a mountain ring far enough out to read as a horizon feature.
 */
export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);

  // Keep the pad dead flat, then ease into the landscape.
  const flat = smoothstep((r - 210) / 320);
  if (flat <= 0) return 0;

  const broad = noise.fbm2(x / 3400, z / 3400, 4) * 105;
  const hills = noise.fbm2(x / 780, z / 780, 4) * 20;
  const bumps = noiseB.fbm2(x / 190, z / 190, 3) * 3.0;

  // Mountain ring: ridged noise whose amplitude ramps up with range.
  // Wavelengths are kept long relative to the mesh resolution out there, so
  // ridges resolve as massifs instead of aliasing into spikes.
  const mtnMask = smoothstep((r - 4600) / 4800);
  let mtn = 0;
  if (mtnMask > 0) {
    const ang = Math.atan2(z, x);
    // Angular modulation breaks the ring into distinct massifs with gaps.
    const massifN = ridgeNoise.noise2(Math.cos(ang) * 1.4, Math.sin(ang) * 1.4) * 0.5 + 0.5;
    const massif = smoothstep((massifN - 0.16) * 1.5);
    const range = ridgeNoise.ridged2(x / 5200, z / 5200, 3, 2.05, 0.5);
    const shoulders = ridgeNoise.fbm2(x / 2100, z / 2100, 3) * 0.5 + 0.5;
    // Long-wavelength ridge lines carry the silhouette; shoulders soften them.
    mtn = (range * 0.82 + shoulders * 0.3) * 1750 * massif * mtnMask;
    // Foothills spill inward from the range without spiking.
    mtn += shoulders * 240 * mtnMask;
  }

  return flat * (broad + hills + bumps) + mtn;
}

/** Slope magnitude, used for material blending and rock scatter. */
function terrainSlope(x, z, eps = 12) {
  const dx = terrainHeight(x + eps, z) - terrainHeight(x - eps, z);
  const dz = terrainHeight(x, z + eps) - terrainHeight(x, z - eps);
  return Math.hypot(dx, dz) / (2 * eps);
}

export function createTerrain(quality) {
  const group = new THREE.Group();
  group.name = 'terrain';

  const extent = WORLD.terrainExtent * 2.4;
  const segs = quality.terrainSegments;
  const geo = new THREE.PlaneGeometry(extent, extent, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const lowland = new THREE.Color(0x8e8367);
  const sandy = new THREE.Color(0xa79a7b);
  const rock = new THREE.Color(0x6a6257);
  const darkRock = new THREE.Color(0x4a4641);
  const pale = new THREE.Color(0x8b857a);

  for (let i = 0; i < pos.count; i++) {
    // Push vertices toward the centre so the near field gets more resolution.
    let x = pos.getX(i), z = pos.getZ(i);
    const nx = x / (extent / 2), nz = z / (extent / 2);
    const rr = Math.max(Math.abs(nx), Math.abs(nz));
    if (rr > 0.0001) {
      const warp = Math.pow(rr, 1.85) / rr;
      x *= warp; z *= warp;
      pos.setX(i, x); pos.setZ(i, z);
    }
    const h = terrainHeight(x, z);
    pos.setY(i, h);

    const slope = terrainSlope(x, z, 26);
    const mottle = noise.fbm2(x / 420, z / 420, 3) * 0.5 + 0.5;
    c.copy(lowland).lerp(sandy, mottle);
    c.lerp(rock, clamp01(slope * 2.6));
    c.lerp(darkRock, clamp01((slope - 0.55) * 1.4));
    c.lerp(pale, clamp01((h - 900) / 1400) * 0.55);
    // Subtle darkening in the hollows.
    c.multiplyScalar(0.9 + mottle * 0.2);
    colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();

  const sand = sandMaps(512);
  const mat = new THREE.MeshStandardMaterial({
    map: sand.map,
    normalMap: sand.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    vertexColors: true,
    roughness: 0.97,
    metalness: 0.0,
  });
  mat.map.repeat.set(240, 240);
  mat.normalMap.repeat.set(240, 240);
  // Broad scales out here: the far terrain covers 21 km, so the drifts have to
  // be kilometres across to read as landscape rather than as noise.
  addGroundMacro(mat, { broad: 2600, patch: 620, strength: 0.30, patchAmount: 0.34 });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'far-terrain';
  group.add(mesh);

  // Near ground: finer texture tiling over the walkable area.
  const nearGeo = new THREE.PlaneGeometry(1100, 1100, 24, 24);
  nearGeo.rotateX(-Math.PI / 2);
  const nearSand = sandMaps(512);
  const nearMat = new THREE.MeshStandardMaterial({
    map: nearSand.map.clone(),
    normalMap: nearSand.normalMap.clone(),
    normalScale: new THREE.Vector2(1.0, 1.0),
    // Tuned to sit against the far terrain's vertex colours so the join between
    // the two meshes is invisible from eye height.
    color: 0x9b9074,
    roughness: 0.95,
    metalness: 0,
  });
  nearMat.map.repeat.set(90, 90);
  nearMat.map.needsUpdate = true;
  nearMat.normalMap.repeat.set(90, 90);
  nearMat.normalMap.needsUpdate = true;
  // Tighter scales in the walkable area, where the player can see individual
  // gravel patches and scuffed ground rather than landscape-scale drift.
  addGroundMacro(nearMat, { broad: 340, patch: 74, strength: 0.36, patchAmount: 0.46 });
  const near = new THREE.Mesh(nearGeo, nearMat);
  near.position.y = 0.012;
  near.receiveShadow = true;
  near.name = 'near-ground';
  group.add(near);

  // Rock and scrub scatter -------------------------------------------------
  const rng = new Random(6161);
  const rockGeoBase = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6f6659, roughness: 0.95, metalness: 0.02 });
  const rockCount = quality.id === 'low' ? 240 : 620;
  const rocks = new THREE.InstancedMesh(rockGeoBase, rockMat, rockCount);
  rocks.castShadow = true; rocks.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const v = new THREE.Vector3(), s = new THREE.Vector3();
  let placed = 0;
  for (let i = 0; i < rockCount * 3 && placed < rockCount; i++) {
    const a = rng.float(0, Math.PI * 2);
    const r = 170 + Math.pow(rng.float(0, 1), 0.65) * 760;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = terrainHeight(x, z);
    const sz = rng.float(0.22, 1.5) * (r > 500 ? 1.7 : 1);
    e.set(rng.float(0, 6.3), rng.float(0, 6.3), rng.float(0, 6.3));
    q.setFromEuler(e);
    v.set(x, y + sz * 0.25, z);
    s.set(sz, sz * rng.float(0.5, 0.9), sz * rng.float(0.8, 1.2));
    m.compose(v, q, s);
    rocks.setMatrixAt(placed++, m);
  }
  rocks.count = placed;
  rocks.instanceMatrix.needsUpdate = true;
  group.add(rocks);

  // Desert scrub: crossed alpha cards, cheap and effective at distance.
  const scrubCount = quality.id === 'low' ? 220 : 700;
  const bladeGeo = buildScrubGeometry();
  const scrubMat = new THREE.MeshStandardMaterial({
    color: 0x6e6a44, roughness: 0.95, metalness: 0,
    side: THREE.DoubleSide, transparent: true, alphaTest: 0.4,
    map: scrubTexture(),
  });
  const scrub = new THREE.InstancedMesh(bladeGeo, scrubMat, scrubCount);
  scrub.castShadow = false; scrub.receiveShadow = false;
  let sp = 0;
  for (let i = 0; i < scrubCount * 3 && sp < scrubCount; i++) {
    const a = rng.float(0, Math.PI * 2);
    const r = 150 + Math.pow(rng.float(0, 1), 0.6) * 820;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = terrainHeight(x, z);
    const sz = rng.float(0.5, 1.5);
    e.set(0, rng.float(0, 6.3), 0);
    q.setFromEuler(e);
    v.set(x, y, z);
    s.set(sz, sz * rng.float(0.7, 1.3), sz);
    m.compose(v, q, s);
    scrub.setMatrixAt(sp++, m);
  }
  scrub.count = sp;
  scrub.instanceMatrix.needsUpdate = true;
  group.add(scrub);

  return { group, heightAt: terrainHeight, mesh, rocks, scrub };
}

function buildScrubGeometry() {
  const a = new THREE.PlaneGeometry(1.1, 0.85);
  a.translate(0, 0.42, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2.2);
  const c = a.clone();
  c.rotateY(-Math.PI / 2.6);
  const merged = new THREE.BufferGeometry();
  const geos = [a, b, c];
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const indices = [];
  let off = 0;
  for (const g of geos) {
    positions.set(g.attributes.position.array, off * 3);
    normals.set(g.attributes.normal.array, off * 3);
    uvs.set(g.attributes.uv.array, off * 2);
    for (let i = 0; i < g.index.count; i++) indices.push(g.index.array[i] + off);
    off += g.attributes.position.count;
    g.dispose();
  }
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  return merged;
}

let scrubTex = null;
function scrubTexture() {
  if (scrubTex) return scrubTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const rng = new Random(31);
  for (let i = 0; i < 46; i++) {
    const x0 = size * 0.5 + rng.float(-0.32, 0.32) * size;
    const len = rng.float(0.35, 0.95);
    const bend = rng.float(-0.3, 0.3);
    ctx.strokeStyle = `rgba(${110 + rng.int(0, 40)},${104 + rng.int(0, 34)},${58 + rng.int(0, 26)},${rng.float(0.6, 1)})`;
    ctx.lineWidth = rng.float(1.2, 3.2);
    ctx.beginPath();
    ctx.moveTo(x0, size);
    ctx.quadraticCurveTo(x0 + bend * size * 0.5, size * (1 - len * 0.6), x0 + bend * size, size * (1 - len));
    ctx.stroke();
  }
  scrubTex = new THREE.CanvasTexture(c);
  scrubTex.colorSpace = THREE.SRGBColorSpace;
  return scrubTex;
}
