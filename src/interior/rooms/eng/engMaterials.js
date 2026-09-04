// Engineering-deck material additions. Registered lazily on the shared material library the first
// time an eng room builds (same pattern as addExteriorDetailMaterials): the reactor core's rolling
// energy glow, a mint-green light band for life support, translucent blue housings for the hyperdrive
// conduits, and a dark drip-stain decal for wet machinery. All animation runs in the shader off
// IMP_TIME so it costs nothing on the CPU.
import * as THREE from "three";
import { IMP, IMP_TIME, NO_SHADOW_KEYS } from "../../../materials/imperial.js";
import { makeLightBand } from "../../../materials/imperialTextures.js";

// Rolling energy column: helical bands climbing the core, a slow breathing pulse and a fast shimmer.
// Needs an emissiveMap (a 1x1 white texel) purely so the shader has an emissive UV varying.
function reactorGlowPatch(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = IMP_TIME;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform float uTime;`)
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          vec2 uv = vEmissiveMapUv;
          float bands = 0.55 + 0.45 * sin((uv.y - uTime * 0.28) * 6.2831 + uv.x * 12.566);
          float bands2 = 0.7 + 0.3 * sin((uv.y * 2.7 + uTime * 0.45) * 6.2831 - uv.x * 18.85);
          float pulse = 0.86 + 0.14 * sin(uTime * 1.6);
          float shimmer = 0.94 + 0.06 * sin(uTime * 21.0 + uv.y * 70.0);
          // a bright seam ring that travels up the column every few seconds
          float seam = smoothstep(0.08, 0.0, abs(fract(uv.y * 0.25 - uTime * 0.09) - 0.5)) * 0.8;
          totalEmissiveRadiance *= (0.25 + 0.9 * bands * bands2 + seam) * pulse * shimmer;
        }`,
      );
  };
  material.customProgramCacheKey = () => "engReactorGlow";
  return material;
}

function whiteTexel() {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}

function makeStainTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  // overlapping soft blobs: a drip pool with a darker heart and a few runs downward
  const blob = (x, y, r, a) => {
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, `rgba(8,10,12,${a})`);
    g.addColorStop(0.6, `rgba(10,12,14,${a * 0.55})`);
    g.addColorStop(1, "rgba(12,14,16,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(size * 0.5, size * 0.42, size * 0.42, 0.75);
  blob(size * 0.36, size * 0.5, size * 0.28, 0.5);
  blob(size * 0.62, size * 0.36, size * 0.24, 0.5);
  for (let i = 0; i < 4; i++) {
    const x = size * (0.32 + i * 0.12);
    ctx.fillStyle = "rgba(8,10,12,0.35)";
    ctx.fillRect(x, size * 0.5, size * 0.03, size * (0.25 + (i % 2) * 0.15));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addEngMaterials(mats) {
  if (mats.emitReactor) return mats;
  mats.emitReactor = reactorGlowPatch(
    new THREE.MeshStandardMaterial({ color: new THREE.Color(IMP.engine).multiplyScalar(0.05), emissive: IMP.engine, emissiveMap: whiteTexel(), emissiveIntensity: 1.9, roughness: 0.4, metalness: 0 }),
  );
  mats.lightBandCool = new THREE.MeshStandardMaterial({ color: 0x0a1410, emissive: new THREE.Color("#b8ffe6"), emissiveMap: makeLightBand(512, 64, 397), emissiveIntensity: 1.6, roughness: 0.5, metalness: 0 });
  mats.engGlassBlue = new THREE.MeshPhysicalMaterial({ color: 0x3f7fd0, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false, envMapIntensity: 0.8, side: THREE.DoubleSide });
  mats.stain = new THREE.MeshStandardMaterial({ map: makeStainTexture(), transparent: true, depthWrite: false, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.1 });
  for (const k of ["stain", "engGlassBlue", "lightBandCool"]) NO_SHADOW_KEYS.add(k);
  return mats;
}
