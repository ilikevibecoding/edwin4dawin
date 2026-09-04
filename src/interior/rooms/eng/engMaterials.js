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

// Crisp red / near-black diagonal hazard stripes for marked work zones (the shared deckMarks hatch
// cell is a worn paint-spill; this one keeps its edges), with only a faint grime mask over it.
function makeHazardRedTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1a1416";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#b8251c";
  for (let k = -1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(k * (size / 2), 0);
    ctx.lineTo(k * (size / 2) + size / 4, 0);
    ctx.lineTo(k * (size / 2) + size / 4 + size, size);
    ctx.lineTo(k * (size / 2) + size, size);
    ctx.closePath();
    ctx.fill();
  }
  // faint grime: a few soft dark smudges at low alpha, nothing that breaks the stripe edges
  let s = 4021;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 14; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.06 + rnd() * 0.12);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(10,10,12,0.22)");
    g.addColorStop(1, "rgba(10,10,12,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Deterministic small PRNG for the authored displays.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Reactor-output display: a dark panel with a title band, a field of tall output bars (blue, bright
// peak caps) against a faint grid, an amber limit line and a readout row at the bottom. Authored so it
// reads as an instrument from across a room (unlike an indicator grid).
function makeBarDisplayTexture(w = 512, h = 256, seed = 11, opts = {}) {
  const { bar = "#3a7cff", cap = "#bcd6ff", limit = "#ffb020", bg = "#050b16" } = opts;
  const rnd = lcg(seed);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // faint grid
  ctx.strokeStyle = "rgba(90,140,220,0.16)";
  ctx.lineWidth = 1;
  for (let y = h * 0.2; y < h * 0.82; y += h * 0.1) {
    ctx.beginPath();
    ctx.moveTo(w * 0.05, y);
    ctx.lineTo(w * 0.95, y);
    ctx.stroke();
  }
  // title band + three status blocks
  ctx.fillStyle = "rgba(60,110,200,0.55)";
  ctx.fillRect(w * 0.04, h * 0.05, w * 0.5, h * 0.08);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 2 ? limit : cap;
    ctx.fillRect(w * (0.62 + i * 0.11), h * 0.06, w * 0.08, h * 0.06);
  }
  // output bars
  const n = 12;
  const bw = (w * 0.9) / n;
  const base = h * 0.82;
  for (let i = 0; i < n; i++) {
    const x = w * 0.05 + i * bw + bw * 0.15;
    const v = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(i * 0.9 + seed)) * (0.7 + 0.3 * rnd());
    const top = base - (base - h * 0.2) * v;
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, bar);
    g.addColorStop(1, "rgba(40,80,160,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(x, top, bw * 0.7, base - top);
    ctx.fillStyle = cap;
    ctx.fillRect(x, top - h * 0.015, bw * 0.7, h * 0.02);
    // segment ticks across each bar so it reads as an LED column
    ctx.fillStyle = "rgba(5,11,22,0.55)";
    for (let y = top + h * 0.03; y < base; y += h * 0.05) ctx.fillRect(x, y, bw * 0.7, 2);
  }
  // amber limit line
  ctx.fillStyle = limit;
  ctx.fillRect(w * 0.05, h * 0.3, w * 0.9, 2);
  // readout row
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 3 === 1 ? "rgba(255,176,32,0.8)" : "rgba(150,190,255,0.7)";
    ctx.fillRect(w * (0.06 + i * 0.115), h * 0.88, w * 0.07, h * 0.05);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Gauge display: three round dials (blue arc, amber needle, tick ring) over a readout strip.
function makeGaugeDisplayTexture(w = 512, h = 256, seed = 17) {
  const rnd = lcg(seed);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050b16";
  ctx.fillRect(0, 0, w, h);
  const r = h * 0.3;
  for (let i = 0; i < 3; i++) {
    const cx = w * (0.18 + i * 0.32);
    const cy = h * 0.42;
    ctx.strokeStyle = "rgba(90,140,220,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    // ticks
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * 0.75 + (k / 10) * Math.PI * 1.5;
      ctx.strokeStyle = k % 5 === 0 ? "#bcd6ff" : "rgba(150,190,255,0.6)";
      ctx.lineWidth = k % 5 === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
      ctx.lineTo(cx + Math.cos(a) * r * 0.96, cy + Math.sin(a) * r * 0.96);
      ctx.stroke();
    }
    // value arc
    const v = 0.3 + rnd() * 0.55;
    ctx.strokeStyle = "#3a7cff";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, Math.PI * 0.75, Math.PI * 0.75 + v * Math.PI * 1.5);
    ctx.stroke();
    // red band at the top of the scale
    ctx.strokeStyle = "#ff3b2a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.96, Math.PI * 2.05, Math.PI * 2.25);
    ctx.stroke();
    // needle
    const a = Math.PI * 0.75 + v * Math.PI * 1.5;
    ctx.strokeStyle = "#ffb020";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
    ctx.stroke();
    ctx.fillStyle = "#bcd6ff";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    // readout block under each dial
    ctx.fillStyle = "rgba(60,110,200,0.55)";
    ctx.fillRect(cx - r * 0.6, h * 0.8, r * 1.2, h * 0.1);
    ctx.fillStyle = "#bcd6ff";
    for (let k = 0; k < 4; k++) ctx.fillRect(cx - r * 0.5 + k * r * 0.28, h * 0.82, r * 0.18, h * 0.06);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function addEngMaterials(mats) {
  if (mats.emitReactor) return mats;
  // authored instrument displays (keys start with "screen" so the framework treats them as displays)
  const display = (tex) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.3, roughness: 0.15, metalness: 0, envMapIntensity: 1.0 });
  mats.screenBars = display(makeBarDisplayTexture(512, 256, 11));
  mats.screenBarsAmber = display(makeBarDisplayTexture(512, 256, 23, { bar: "#d98a1e", cap: "#ffe0a0", limit: "#ff3b2a" }));
  mats.screenGauges = display(makeGaugeDisplayTexture(512, 256, 17));
  // the core: a saturated blue-white at an intensity that keeps its banding readable instead of
  // clipping to white (it is also seen through the Engineering Control window)
  mats.emitReactor = reactorGlowPatch(
    new THREE.MeshStandardMaterial({ color: new THREE.Color("#5a90e0").multiplyScalar(0.05), emissive: new THREE.Color("#7aaaff"), emissiveMap: whiteTexel(), emissiveIntensity: 1.15, roughness: 0.4, metalness: 0 }),
  );
  mats.lightBandCool = new THREE.MeshStandardMaterial({ color: 0x0a1410, emissive: new THREE.Color("#b8ffe6"), emissiveMap: makeLightBand(512, 64, 397), emissiveIntensity: 0.95, roughness: 0.5, metalness: 0 });
  mats.engGlassBlue = new THREE.MeshPhysicalMaterial({ color: 0x3f7fd0, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false, envMapIntensity: 0.8, side: THREE.DoubleSide });
  mats.stain = new THREE.MeshStandardMaterial({ map: makeStainTexture(), transparent: true, depthWrite: false, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.1 });
  mats.hazardRed = new THREE.MeshStandardMaterial({ map: makeHazardRedTexture(), roughness: 0.75, metalness: 0.1, envMapIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // projector cone + plasma core for the holo schematics: additive, single-sided and faded by RGBA
  // vertex colour (the shared double-sided beam material stacked into a solid lampshade); the cone's
  // vertex alpha runs 1/3 -> 1/20 of this opacity, the core uses it in full
  mats.holoCone = new THREE.MeshBasicMaterial({ color: 0x6fa6ff, vertexColors: true, transparent: true, opacity: 0.33, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide });
  // matte deck for the reactor galleries: the shared impDeck maps with a much rougher finish, so the
  // core's point lights do not mirror into white pools on the dark plates
  const deck = mats.impDeck;
  mats.engDeck = new THREE.MeshStandardMaterial({
    map: deck.map,
    roughnessMap: deck.roughnessMap,
    metalnessMap: deck.metalnessMap,
    normalMap: deck.normalMap,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 2.2,
    metalness: 0.6,
    vertexColors: true,
    color: 0xffffff,
    envMapIntensity: 0.35,
  });
  for (const k of ["stain", "engGlassBlue", "lightBandCool", "holoCone"]) NO_SHADOW_KEYS.add(k);
  return mats;
}
