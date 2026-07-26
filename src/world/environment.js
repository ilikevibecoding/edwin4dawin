// ============================================================================
// Exterior environment & snow atmosphere (Fable 2 ownership).
// Everything OUTSIDE the playable envelope: sky dome, snowfield terrain,
// access roads, distant city context, site propping and falling snow.
// All procedural (canvas textures only), merged aggressively:
// ~14 draw calls, ~45k triangles for the whole exterior world.
//
//   buildEnvironment(game) -> { group: THREE.Group, update(dt) }
//
// Nothing in here is enterable and nothing carries collision; every shape is
// kept outside the playable bounds (courtyard x -54..-38 z -12..12, building
// x -38..38 z -22..18.5) — wall drifts stop at the wall centerline so they
// can never poke through into rooms.
// ============================================================================
import * as THREE from 'three';
import { getMaterial } from '../assets/materials.js';
import { makeCanvasTexture, valueNoise, speckle, streaks, mulberry } from '../assets/textures.js';
import { mergeGeos } from '../assets/geo.js';
import { settings } from '../core/settings.js';
import { registerAsset } from '../assets/registry.js';

// ---------------------------------------------------------------------------
// palette / tuning
// ---------------------------------------------------------------------------
const SKY_HORIZON = '#cdd6dd';   // warm-pale winter horizon
const SKY_ZENITH = '#8fa6bd';    // cold blue-gray overcast zenith
const SKY_BELOW = '#a9bccc';     // must match scene fog color
const SKY_R = 200;               // camera far is 260 and the player can be
                                 // ~55 m from origin: 200+55 < 260, no clip

// playable / kept-flat zones: [x0, z0, x1, z1]
const FLAT_ZONES = [
  [-57.5, -25.5, 41.5, 22.0],    // building + courtyard + margin
  [-172, -7.0, -50, 7.0],        // west access road corridor
  [34, -5.5, 172, 10.5],         // east access road corridor
  [-58.5, 11, -36, 33],          // parking lot
];
const FLAT_FADE = 9;             // m over which undulation ramps in

// west road: centered on the courtyard gate axis (z=0)
const ROAD_W = { x0: -168, x1: -53.6, z: 0, w: 8 };
// east road: centered on the garage exit shutter (z 0..5)
const ROAD_E = { x0: 37.6, x1: 168, z: 2.5, w: 8 };

// ---------------------------------------------------------------------------
// lazy shared textures (no DOM at import time)
// ---------------------------------------------------------------------------
let _tex = null;
function tex() {
  if (_tex) return _tex;
  _tex = {
    sky: skyTexture(),
    road: roadTexture(),
    facade: facadeTextures(),
    fence: fenceTexture(),
    flake: flakeTexture(),
    wisp: wispTexture(),
  };
  return _tex;
}

// Sky gradient with a soft bright patch toward the NW (sun at (-46,34,-38)).
function skyTexture() {
  return makeCanvasTexture(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, SKY_ZENITH);
    g.addColorStop(0.30, '#9db1c4');
    g.addColorStop(0.46, '#bccad4');
    g.addColorStop(0.52, SKY_HORIZON);       // horizon sits at v=0.5 (y=0)
    // below-horizon: long fade to fog color (only the QA fly-cam can see it;
    // from the ground the terrain covers everything under v=0.52)
    g.addColorStop(0.7, '#b5c4d1');
    g.addColorStop(0.88, SKY_BELOW);
    g.addColorStop(1.0, SKY_BELOW);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // subtle stratus banding so the overcast isn't a perfect ramp
    streaks(ctx, w, h, { dir: 'h', count: 8, alpha: 0.05, light: '#d3dde4', dark: '#8ba0b6', seed: 601, widthRange: [6, 22], wobble: 4 });
    valueNoise(ctx, w, h, { scale: 5, octaves: 2, alpha: 0.05, color: '#7e94ab', seed: 602 });
    // veiled sun glow, NW sky, ~30 deg elevation (u=0.89, v=2/3 -> canvas y=h/3)
    const cy = h * 0.333;
    for (const cx of [w * 0.89, w * -0.11]) {   // wrapped copy for seam safety
      const rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, w * 0.24);
      rg.addColorStop(0, 'rgba(246,244,238,0.55)');
      rg.addColorStop(0.35, 'rgba(232,233,231,0.22)');
      rg.addColorStop(1, 'rgba(232,233,231,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
    // gentle horizon brightening all around (light bouncing off snow plain)
    const hg = ctx.createLinearGradient(0, h * 0.38, 0, h * 0.52);
    hg.addColorStop(0, 'rgba(226,232,235,0)');
    hg.addColorStop(1, 'rgba(226,232,235,0.35)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, h * 0.38, w, h * 0.15);
  }, { anisotropy: 2 });
}

// Plowed access road: snow-dusted asphalt, two dark tire lanes, plow scrape.
// Canvas maps to 24 m along x 8 m across.
function roadTexture() {
  return makeCanvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c4c9ce';                       // packed snow base (neutral)
    ctx.fillRect(0, 0, w, h);
    valueNoise(ctx, w, h, { scale: 6, octaves: 3, alpha: 0.13, color: '#999fa7', seed: 611 });
    valueNoise(ctx, w, h, { scale: 24, octaves: 2, alpha: 0.09, color: '#e8ebee', seed: 612 });
    // exposed asphalt tire lanes (car track ~1.7 m apart, each ~1.1 m wide)
    const lane = (cy) => {
      const half = h * (0.55 / 8);
      const g = ctx.createLinearGradient(0, cy - half * 2, 0, cy + half * 2);
      g.addColorStop(0, 'rgba(49,53,58,0)');
      g.addColorStop(0.5, 'rgba(41,45,50,0.92)');
      g.addColorStop(1, 'rgba(49,53,58,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, cy - half * 2, w, half * 4);
    };
    lane(h * 0.395);
    lane(h * 0.605);
    // wet sheen streaks + slush inside the lanes
    streaks(ctx, w, h, { dir: 'h', count: 26, alpha: 0.1, light: '#70777d', dark: '#212429', seed: 613, widthRange: [1.5, 4], wobble: 2 });
    // snow blown back over the lanes in patches
    speckle(ctx, w, h, { count: 90, rmin: 3, rmax: 14, colors: ['#ced4da', '#c1c8cf'], alpha: 0.35, seed: 614, squashY: 0.35 });
    // plow scrape lines along the whole width
    streaks(ctx, w, h, { dir: 'h', count: 40, alpha: 0.05, light: '#eff2f4', dark: '#8e959c', seed: 615, widthRange: [0.6, 1.6] });
    // dirty crusted edges near the banks
    for (const [y0, y1] of [[0, h * 0.09], [h * 0.91, h]]) {
      ctx.fillStyle = 'rgba(149,154,159,0.4)';
      ctx.fillRect(0, y0, w, y1 - y0);
    }
    valueNoise(ctx, w, h, { scale: 40, octaves: 1, alpha: 0.05, color: '#7e848a', seed: 616 });
  }, { anisotropy: 4 });
}

// Distant office block: dark facade + window grid. One cell = 3.2 m
// (canvas covers 12.8 m; UVs on the boxes are meters / 12.8).
function facadeTextures() {
  const cell = 64;
  const map = makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#39424e';
    ctx.fillRect(0, 0, w, h);
    valueNoise(ctx, w, h, { scale: 4, octaves: 2, alpha: 0.1, color: '#242b34', seed: 621 });
    const rnd = mulberry(622);
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const x = i * cell, y = j * cell;
        ctx.fillStyle = rnd() < 0.75 ? '#2a333c' : '#4a5764';
        ctx.fillRect(x + 7, y + 16, cell - 14, cell - 30);
        ctx.fillStyle = 'rgba(18,22,27,0.7)';
        ctx.fillRect(x + 7, y + cell - 15, cell - 14, 3);
      }
    }
  }, { anisotropy: 2 });
  const emissiveMap = makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry(623);
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        if (rnd() > 0.24) continue;              // ~1/4 of windows lit at dawn
        const x = i * cell, y = j * cell;
        ctx.fillStyle = rnd() < 0.55 ? '#c8a86a' : '#9fc0d8';
        ctx.fillRect(x + 7, y + 16, cell - 14, cell - 30);
      }
    }
  }, {});
  return { map, emissiveMap };
}

// Chain-link mesh on transparent background (1 m x 1 m per tile). Rendered
// with alpha blending (not alphaTest) so distant mips fade to a light haze
// instead of collapsing into a solid gray band.
function fenceTexture() {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#b6bdc2';
    ctx.lineWidth = 3.2;
    ctx.globalAlpha = 0.9;
    const step = w / 8;
    ctx.beginPath();
    for (let k = -8; k <= 16; k++) {
      ctx.moveTo(k * step, 0); ctx.lineTo(k * step + h, h);
      ctx.moveTo(k * step, 0); ctx.lineTo(k * step - h, h);
    }
    ctx.stroke();
  }, { anisotropy: 4 });
}

// Soft round snowflake sprite.
function flakeTexture() {
  return makeCanvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(250,252,255,0.85)');
    g.addColorStop(1, 'rgba(245,250,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, {});
}

// Elongated soft streak for ground snow wisps.
function wispTexture() {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, 0.34);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = g;
    ctx.fillRect(0, -h, w, h * 3);
    ctx.restore();
    streaks(ctx, w, h, { dir: 'h', count: 14, alpha: 0.28, light: '#ffffff', dark: '#ffffff', seed: 641, widthRange: [1, 3], wobble: 3 });
  }, {});
}

// ---------------------------------------------------------------------------
// terrain heightfield
// ---------------------------------------------------------------------------
function smoothstep(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

function distToRect(x, z, [x0, z0, x1, z1]) {
  const dx = Math.max(x0 - x, 0, x - x1);
  const dz = Math.max(z0 - z, 0, z - z1);
  return Math.hypot(dx, dz);
}

// 0 inside protected zones -> 1 in the open snowfield
function openMask(x, z) {
  let m = 1;
  for (const r of FLAT_ZONES) m = Math.min(m, smoothstep(distToRect(x, z, r) / FLAT_FADE));
  return m;
}

function duneHeight(x, z) {
  let hgt =
    0.5 * Math.sin(x * 0.045 + 1.7) * Math.sin(z * 0.052 + 0.6) +
    0.4 * Math.sin(x * 0.021 + 4.2) * Math.sin(z * 0.018 + 2.1) +
    0.26 * Math.sin((x + z * 0.7) * 0.032 + 0.9) +
    0.18 * Math.sin((x * 0.6 - z) * 0.061 + 3.3);
  hgt += 0.34;
  if (hgt < 0) hgt *= 0.25;                        // soften hollows
  const r = Math.hypot(x, z);
  hgt += smoothstep((r - 105) / 75) * 1.5;         // distant rolling rise
  return hgt;
}

// Final terrain surface height. Hidden (-0.12, under the base snow plane at
// -0.04) inside every protected zone so nothing enters playable space.
function terrainY(x, z) {
  const m = openMask(x, z);
  if (m <= 0.001) return -0.12;
  return -0.12 + (0.16 + duneHeight(x, z)) * m;
}

function groundY(x, z) { return Math.max(terrainY(x, z), -0.06); }

// ---------------------------------------------------------------------------
// geometry helpers
// ---------------------------------------------------------------------------
function tintGeo(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// squashed snow dome (hemisphere), sunk slightly into the ground
function domeGeo(x, z, rx, ry, rz, yaw = 0, baseY = null) {
  const g = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(rx, ry, rz);
  if (yaw) g.rotateY(yaw);
  const y = (baseY == null ? groundY(x, z) : baseY) - ry * 0.18;
  g.translate(x, y, z);
  g.computeVertexNormals();
  return g;
}

function cylGeo(rTop, rBot, h, seg = 7) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg, 1);
}

// place a geometry: rotate around Y then translate
function put(geo, x, y, z, yaw = 0) {
  if (yaw) geo.rotateY(yaw);
  geo.translate(x, y, z);
  return geo;
}

// ---------------------------------------------------------------------------
// vegetation builders (merged, vertex-colored)
// ---------------------------------------------------------------------------
const SPRUCE_GREEN = 0x2e4033;
const SPRUCE_SNOW = 0xe8eef4;
const BARK = 0x3b332d;

// 3-cone spruce with snow-capped tiers. Returns world-space geometries.
function spruceGeos(x, z, s = 1, tint = 0, baseY = null) {
  const parts = [];
  const green = new THREE.Color(SPRUCE_GREEN).offsetHSL(0, 0, tint);
  const y0 = (baseY == null ? groundY(x, z) : baseY) - 0.1;
  parts.push(tintGeo(put(cylGeo(0.09 * s, 0.14 * s, 1.4 * s, 6), x, y0 + 0.7 * s, z), BARK));
  const tiers = [
    { r: 1.35, h: 2.5, y: 1.1 },
    { r: 1.05, h: 2.2, y: 2.7 },
    { r: 0.7, h: 2.0, y: 4.15 },
  ];
  for (const t of tiers) {
    const cone = new THREE.ConeGeometry(t.r * s, t.h * s, 8, 1);
    parts.push(tintGeo(put(cone, x, y0 + (t.y + t.h / 2) * s, z), green.getHex()));
    // snow cap: narrower cone riding the upper half of each tier
    const cap = new THREE.ConeGeometry(t.r * 0.72 * s, t.h * 0.62 * s, 8, 1);
    parts.push(tintGeo(put(cap, x, y0 + (t.y + t.h * 0.62) * s, z), SPRUCE_SNOW));
  }
  return parts;
}

// leafless deciduous tree: trunk + tapered branch cylinders. Branches are
// kept short, fairly thick and mostly upright so the crown reads as a tree
// and not a wire antenna at 20-40 m.
function bareTreeGeos(x, z, s = 1, seed = 1, baseY = null) {
  const rnd = mulberry(seed * 337 + 5);
  const parts = [];
  const y0 = (baseY == null ? groundY(x, z) : baseY) - 0.08;
  parts.push(tintGeo(put(cylGeo(0.1 * s, 0.17 * s, 2.4 * s, 7), x, y0 + 1.2 * s, z), BARK));
  const nB = 6;
  for (let i = 0; i < nB; i++) {
    const len = (1.05 + rnd() * 0.75) * s;
    const b = cylGeo(0.028 * s, 0.062 * s, len, 5);
    b.translate(0, len / 2, 0);
    b.rotateZ(0.38 + rnd() * 0.3);                 // lean out from the trunk
    b.rotateY(i * ((Math.PI * 2) / nB) + rnd() * 0.7);
    b.translate(x, y0 + (1.75 + rnd() * 0.75) * s, z);
    parts.push(tintGeo(b, 0x453b33));
    // one short twig per branch
    const tl = len * 0.45;
    const t = cylGeo(0.016 * s, 0.03 * s, tl, 4);
    t.translate(0, tl / 2, 0);
    t.rotateZ(0.55 + rnd() * 0.4);
    t.rotateY(i * ((Math.PI * 2) / nB) + 0.5 + rnd());
    t.translate(x, y0 + (2.2 + rnd() * 0.8) * s, z);
    parts.push(tintGeo(t, 0x453b33));
  }
  // upper trunk lead with a couple of top shoots
  const lead = cylGeo(0.03 * s, 0.075 * s, 1.7 * s, 5);
  lead.translate(0, 0.85 * s, 0);
  lead.rotateZ(0.1);
  lead.translate(x, y0 + 2.3 * s, z);
  parts.push(tintGeo(lead, BARK));
  for (const rot of [0.42, -0.5]) {
    const shoot = cylGeo(0.018 * s, 0.034 * s, 0.9 * s, 4);
    shoot.translate(0, 0.45 * s, 0);
    shoot.rotateZ(rot);
    shoot.rotateY(rnd() * Math.PI * 2);
    shoot.translate(x, y0 + 3.1 * s, z);
    parts.push(tintGeo(shoot, 0x453b33));
  }
  return parts;
}

// ---------------------------------------------------------------------------
// snowed-in car (body vertex-colored; snow blanket returned separately)
// ---------------------------------------------------------------------------
const CAR_COLORS = [0x5a6470, 0x424a52, 0x6e5a50, 0x4a5a6e, 0x757a7e, 0x3e4a44];

function carGeos(x, z, yaw, colorHex, baseY = null) {
  const gy = baseY == null ? groundY(x, z) : baseY;
  const body = [];
  const snow = [];
  const world = (g) => { g.rotateY(yaw); g.translate(x, 0, z); return g; };
  const mkBox = (w, h, d, cy, cz, hex) => {
    const g = new THREE.BoxGeometry(w, h, d);
    // cheap "bevel": pull the top verts inward for a shoulder line
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.93); p.setZ(i, p.getZ(i) * 0.95); }
    }
    g.translate(0, cy, cz);
    world(g);
    g.computeVertexNormals();
    return tintGeo(g, hex);
  };
  // lower body (wheels buried in the snow skirt) + dark glass cabin
  body.push(mkBox(1.78, 0.52, 4.35, gy + 0.5, 0, colorHex));
  body.push(mkBox(1.58, 0.5, 2.15, gy + 1.0, -0.25, 0x11151a));
  const dome = (cz, cy, rAcross, ry, rAlong) => {
    const d = new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    d.scale(rAcross, ry, rAlong);
    d.translate(0, cy, cz);
    world(d);
    d.computeVertexNormals();
    return d;
  };
  // generous blankets: the roof/hood/trunk should read as one snow mass with
  // only the sides and glass showing
  snow.push(dome(-0.25, gy + 1.22, 0.86, 0.2, 1.32));   // roof blanket
  snow.push(dome(1.55, gy + 0.76, 0.9, 0.16, 0.95));    // hood
  snow.push(dome(-1.8, gy + 0.78, 0.9, 0.16, 0.8));     // trunk
  snow.push(dome(0, gy + 0.06, 1.4, 0.44, 2.65));       // drift skirt
  return { body, snow };
}

// ---------------------------------------------------------------------------
// snowfall particle system
// ---------------------------------------------------------------------------
// volumes: [{x0,y0,z0,x1,y1,z1}], particle share weighted by footprint
function makeSnowfall(count, volumes, sizeMin, sizeMax, speedMin, speedMax, opacity) {
  const weights = volumes.map((v) => (v.x1 - v.x0) * (v.z1 - v.z0));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const rnd = mulberry(7040 + count);
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  // aux per particle: vol, speed, phase, amp, baseX, baseZ
  const aux = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    let pick = rnd() * wSum, vi = 0;
    while (vi < volumes.length - 1 && pick > weights[vi]) { pick -= weights[vi]; vi++; }
    const v = volumes[vi];
    const bx = v.x0 + rnd() * (v.x1 - v.x0);
    const bz = v.z0 + rnd() * (v.z1 - v.z0);
    pos[i * 3] = bx;
    pos[i * 3 + 1] = v.y0 + rnd() * (v.y1 - v.y0);
    pos[i * 3 + 2] = bz;
    size[i] = sizeMin + rnd() * (sizeMax - sizeMin);
    aux[i * 6] = vi;
    aux[i * 6 + 1] = speedMin + rnd() * (speedMax - speedMin);
    aux[i * 6 + 2] = rnd() * Math.PI * 2;
    aux[i * 6 + 3] = 0.25 + rnd() * 0.85;          // sway amplitude
    aux[i * 6 + 4] = bx;
    aux[i * 6 + 5] = bz;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.PointsMaterial({
    size: 1, map: tex().flake, transparent: true, opacity,
    depthWrite: false, sizeAttenuation: true, color: 0xf7fafd,
  });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('uniform float size;', 'attribute float size;');
  };
  mat.customProgramCacheKey = () => 'nsr_env_snowfall';
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.name = 'env-snowfall';
  return {
    points,
    update(t, dt, windX, windZ) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const v = volumes[aux[i * 6] | 0];
        let y = p[i * 3 + 1] - aux[i * 6 + 1] * dt;
        if (y < v.y0) {
          y += v.y1 - v.y0;
          // re-seed the column so respawns don't stripe
          aux[i * 6 + 4] = v.x0 + ((aux[i * 6 + 4] - v.x0 + 13.7) % (v.x1 - v.x0));
        }
        // anchors wander with the wind, wrapped inside the volume
        let bx = aux[i * 6 + 4] + windX * dt;
        let bz = aux[i * 6 + 5] + windZ * dt;
        if (bx > v.x1) bx -= v.x1 - v.x0; else if (bx < v.x0) bx += v.x1 - v.x0;
        if (bz > v.z1) bz -= v.z1 - v.z0; else if (bz < v.z0) bz += v.z1 - v.z0;
        aux[i * 6 + 4] = bx;
        aux[i * 6 + 5] = bz;
        const ph = aux[i * 6 + 2], amp = aux[i * 6 + 3];
        p[i * 3] = bx + Math.sin(t * 0.8 + ph + y * 0.22) * amp;
        p[i * 3 + 1] = y;
        p[i * 3 + 2] = bz + Math.cos(t * 0.62 + ph * 1.7 + y * 0.18) * amp * 0.6;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------------------
// main build
// ---------------------------------------------------------------------------
export function buildEnvironment(game) {
  const T = tex();
  const group = new THREE.Group();
  group.name = 'environment';
  const rnd = mulberry(9021);

  // batches (merged per material at the end)
  const snowGeos = [];      // getMaterial('floor_snow')  (world-projected UVs)
  const metalGeos = [];     // getMaterial('metal_dark')
  const vegGeos = [];       // vertex-colored matte
  const carGeos_ = [];      // vertex-colored semi-gloss
  const roadGeos = [];
  const buildingGeos = [];
  const fenceGeos = [];
  const ledGeos = [];

  // ---------------------------------------------------------------- 1. sky
  // The dome follows the camera in x/z (update()) so its horizon band always
  // sits at the true horizon no matter where the player stands.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_R, 48, 24),
    new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  sky.name = 'env-sky';
  group.add(sky);

  // ------------------------------------------------------------ 2. terrain
  {
    // 440 m so the rim sits past the fog end (220) and can never show
    const segs = 92, size = 440;
    const plane = new THREE.PlaneGeometry(size, size, segs, segs);
    plane.rotateX(-Math.PI / 2);
    const p = plane.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, terrainY(p.getX(i), p.getZ(i)));
    plane.computeVertexNormals();
    snowGeos.push(plane);
  }

  // plowed banks along both roads
  for (const road of [ROAD_W, ROAD_E]) {
    for (let x = road.x0 + 3; x < road.x1 - 2; x += 5.5 + rnd() * 3) {
      for (const s of [-1, 1]) {
        if (rnd() < 0.15) continue;
        const rx = 2.6 + rnd() * 1.8, ry = 0.5 + rnd() * 0.45, rz = 1.1 + rnd() * 0.7;
        snowGeos.push(domeGeo(x, road.z + s * (road.w / 2 + rz * 0.55), rx, ry, rz, rnd() * 0.4 - 0.2));
      }
    }
  }

  // drifts against exterior walls. Each run: [dir, wallCoord, outwardSign,
  // lo, hi] — dome reach is clamped to the wall centerline so nothing can
  // cross into interior rooms (exterior walls are 0.3 m thick).
  const driftRuns = [
    ['h', -22, -1, -36.5, 29.5],     // north facade (wall ends at x=30)
    ['v', -38, -1, -21.5, -13],      // west facade (records, N of courtyard)
    ['h', 12, 1, -37.5, -32.5],      // waiting room south wall
    ['h', 10.5, 1, -31, -15],        // south corridor wall (west part)
    ['v', -14, -1, 11.5, 17.5],      // restroom block west wall
    ['h', 18.5, 1, -13, 7.5],        // restroom block south wall
    ['v', 8, 1, 11.5, 17.5],         // electrical room east wall
    ['h', 10.5, 1, 9, 37],           // service + garage south wall
    ['v', 38, 1, -3.4, -0.8],        // garage east wall, north of the shutter
    ['v', 38, 1, 6.2, 9.6],          // garage east wall, south of the shutter
    ['v', 30, 1, -21, -5],           // NE service notch west wall
    ['h', -4, -1, 30.5, 37.5],       // NE service notch south wall
    // outside faces of the courtyard boundary walls
    ['h', -12, -1, -53, -39],        // courtyard north wall
    ['h', 12, 1, -53, -44],          // courtyard south wall (parking side)
    ['v', -54, -1, -11, -5],         // courtyard west wall, N of the gate
    ['v', -54, -1, 5, 11],           // courtyard west wall, S of the gate
  ];
  for (const [dir, coord, sign, lo, hi] of driftRuns) {
    for (let a = lo + 1.2; a < hi - 0.9; a += 3.4 + rnd() * 2.6) {
      const rz = 0.9 + rnd() * 0.8;                 // extent away from wall
      const rx = 2.0 + rnd() * 1.8;                 // extent along wall
      const ry = 0.28 + rnd() * 0.3;
      const c = coord + sign * rz;                  // reach exactly = centerline
      if (dir === 'h') snowGeos.push(domeGeo(a, c, rx, ry, rz, 0));
      else snowGeos.push(domeGeo(c, a, rz, ry, rx, 0));
    }
  }

  // ------------------------------------------------------------- 3. roads
  for (const road of [ROAD_W, ROAD_E]) {
    const len = road.x1 - road.x0;
    const g = new THREE.PlaneGeometry(len, road.w, 1, 1);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 24));
    g.translate((road.x0 + road.x1) / 2, 0.02, road.z);
    roadGeos.push(g);
  }

  // --------------------------------------------------- 4. distant context
  const farBlocks = [
    { x: -78, z: -128, w: 26, h: 24, d: 20, r: 0.14 },
    { x: -18, z: -112, w: 18, h: 11, d: 16, r: -0.1 },
    { x: 42, z: -138, w: 30, h: 30, d: 24, r: 0.06 },
    { x: 98, z: -102, w: 20, h: 9, d: 26, r: 0.2 },
    { x: -128, z: -52, w: 22, h: 17, d: 18, r: 0.05 },
    { x: -140, z: 26, w: 18, h: 8.5, d: 26, r: -0.16 },
    { x: -74, z: 118, w: 24, h: 26, d: 20, r: 0.1 },
    { x: 26, z: 122, w: 20, h: 13, d: 18, r: -0.06 },
    { x: 126, z: 44, w: 24, h: 19, d: 20, r: 0.12 },
    { x: 134, z: -40, w: 18, h: 10, d: 22, r: -0.2 },
  ];
  for (const b of farBlocks) {
    const base = groundY(b.x, b.z) - 1.1;
    const g = new THREE.BoxGeometry(b.w, b.h, b.d);
    // meter-scale UVs so the 3.2 m window grid reads true on every face
    const uv = g.attributes.uv;
    const dims = [[b.d, b.h], [b.d, b.h], [b.w, b.d], [b.w, b.d], [b.w, b.h], [b.w, b.h]];
    for (let f = 0; f < 6; f++) {
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v;
        uv.setXY(i, (uv.getX(i) * dims[f][0]) / 12.8, (uv.getY(i) * dims[f][1]) / 12.8);
      }
    }
    put(g, b.x, base + b.h / 2, b.z, b.r);
    buildingGeos.push(g);
    // rooftop bulkhead on the taller blocks
    if (b.h > 15) {
      const rt = new THREE.BoxGeometry(b.w * 0.3, 2.2, b.d * 0.3);
      const ruv = rt.attributes.uv;
      for (let i = 0; i < ruv.count; i++) ruv.setXY(i, 0.02, 0.02); // dark texel
      put(rt, b.x, base + b.h + 0.8, b.z, b.r);
      buildingGeos.push(rt);
    }
    // snow apron hugging the base so the block sits IN the snow, not ON it
    snowGeos.push(domeGeo(b.x, b.z, b.w * 0.78, 1.9, b.d * 0.78, b.r));
    snowGeos.push(domeGeo(b.x + b.w * 0.3, b.z - b.d * 0.35, b.w * 0.52, 1.3, b.d * 0.48, b.r * 0.5));
  }

  // water tower silhouette (SW skyline)
  {
    const cx = -96, cz = 78;
    const base = groundY(cx, cz) - 0.5;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = cylGeo(0.34, 0.46, 17.5, 6);
      leg.translate(0, 8.75, 0);
      leg.rotateZ(0.045);
      leg.rotateY(a);
      leg.translate(cx + Math.cos(a) * 2.7, base, cz + Math.sin(a) * 2.7);
      metalGeos.push(leg);
    }
    // brace rings so the legs read as one structure
    for (const by of [6, 12]) {
      const ring = new THREE.CylinderGeometry(3.1, 3.25, 0.28, 10, 1, true);
      metalGeos.push(put(ring, cx, base + by, cz));
    }
    metalGeos.push(put(cylGeo(4.6, 3.6, 6.5, 12), cx, base + 19.5, cz));
    metalGeos.push(put(new THREE.ConeGeometry(4.8, 2.4, 12), cx, base + 24, cz));
    snowGeos.push(domeGeo(cx, cz, 6.5, 1.1, 6.5));
  }
  // transmission tower silhouette (N skyline)
  {
    const cx = 66, cz = -122;
    const base = groundY(cx, cz) - 0.5;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = cylGeo(0.16, 0.3, 30, 5);
      leg.translate(0, 15, 0);
      leg.rotateZ(sx * 0.06);
      leg.rotateX(-sz * 0.06);
      leg.translate(cx + sx * 2.2, base, cz + sz * 2.2);
      metalGeos.push(leg);
    }
    for (const [w, y] of [[9, 21], [7.5, 25], [6, 29]]) {
      metalGeos.push(put(new THREE.BoxGeometry(w, 0.55, 0.55), cx, base + y, cz));
    }
    metalGeos.push(put(cylGeo(0.1, 0.18, 6, 5), cx, base + 32.5, cz));
    snowGeos.push(domeGeo(cx, cz, 5, 0.9, 5));
  }

  // spruce lines: north + west (plus a few east for the garage vista and a
  // handful south past the parking lot)
  const spruceSpots = [];
  for (let x = -66; x <= 48; x += 6.5) {
    spruceSpots.push([x + rnd() * 3 - 1.5, -42 - rnd() * 14]);
  }
  for (let z = -50; z <= 34; z += 7) {
    spruceSpots.push([-72 - rnd() * 14, z + rnd() * 3 - 1.5]);
  }
  for (let z = -18; z <= 26; z += 7.5) {
    if (z > -6 && z < 11) continue;                 // keep the east road open
    spruceSpots.push([62 + rnd() * 16, z + rnd() * 3]);
  }
  for (let x = -52; x <= -18; x += 8) {
    spruceSpots.push([x + rnd() * 3, 44 + rnd() * 12]);
  }
  for (const [sx, sz] of spruceSpots) {
    const s = 0.78 + rnd() * 0.5;
    for (const g of spruceGeos(sx, sz, s, (rnd() - 0.5) * 0.045)) vegGeos.push(g);
    if (rnd() < 0.5) snowGeos.push(domeGeo(sx, sz, 1.5 * s, 0.3, 1.5 * s));
  }

  // bare trees near the courtyard walls (outside; crowns visible over 2.6 m)
  const bareSpots = [[-57.5, -7.5, 1.0], [-57, 8.5, 0.9], [-39.8, 15.2, 0.95], [-42.5, -16, 0.85]];
  let bareSeed = 11;
  for (const [bx, bz, bs] of bareSpots) {
    for (const g of bareTreeGeos(bx, bz, bs, bareSeed++)) vegGeos.push(g);
    snowGeos.push(domeGeo(bx, bz, 1.1 * bs, 0.32, 1.1 * bs));
  }

  // -------------------------------------------- 5. near propping: parking
  const carSpots = [
    { x: -51.5, z: 16.6, yaw: 0.02 },
    { x: -48.6, z: 16.8, yaw: -0.04 },
    { x: -45.8, z: 16.5, yaw: 0.05 },
    { x: -42.9, z: 16.8, yaw: -0.02 },
    { x: -50.5, z: 24.5, yaw: Math.PI + 0.06 },
    { x: -44.6, z: 24.9, yaw: Math.PI - 0.05 },
  ];
  let ci = 0;
  for (const c of carSpots) {
    const { body, snow } = carGeos(c.x, c.z, c.yaw, CAR_COLORS[ci++ % CAR_COLORS.length]);
    for (const g of body) carGeos_.push(g);
    for (const g of snow) snowGeos.push(g);
  }

  // light poles: parking lot (twin arms over both car rows) + east road
  const poleSpots = [
    { x: -47.2, z: 20.6, rots: [Math.PI / 2, -Math.PI / 2] },  // arms N + S rows
    { x: 50, z: -2.6, rots: [-Math.PI / 2] },                  // arm over the road
  ];
  for (const ps of poleSpots) {
    const gy = groundY(ps.x, ps.z);
    metalGeos.push(put(cylGeo(0.06, 0.09, 5.6, 7), ps.x, gy + 2.8, ps.z));
    for (const rot of ps.rots) {
      const arm = new THREE.BoxGeometry(1.3, 0.09, 0.09);
      arm.translate(0.62, gy + 5.45, 0);
      arm.rotateY(rot);
      arm.translate(ps.x, 0, ps.z);
      metalGeos.push(arm);
      const head = new THREE.BoxGeometry(0.62, 0.1, 0.24);
      head.translate(1.15, gy + 5.38, 0);
      head.rotateY(rot);
      head.translate(ps.x, 0, ps.z);
      ledGeos.push(head);
    }
  }

  // gate posts where the west road meets the courtyard wall, and at the
  // fence line site entrance
  for (const [px, pz] of [[-54.7, -4.5], [-54.7, 4.5], [-58, -5], [-58, 5.2]]) {
    metalGeos.push(put(cylGeo(0.08, 0.1, 1.6, 7), px, groundY(px, pz) + 0.8, pz));
  }

  // ------------------------------------------------------------- 6. fence
  // [dir, fixed coord, lo, hi] — split around both road gaps
  const fenceRuns = [
    ['h', -30, -50, 42],          // north perimeter
    ['v', -58, -38, -5],          // west perimeter, N of the road
    ['v', -58, 5.2, 12],          // west perimeter, S of the road
    ['v', -58, 14, 34],           // west, parking side
    ['h', 34, -58, -14],          // south perimeter behind the parking lot
    ['v', 55, -30, -1.8],         // east, north of the road gap
    ['v', 55, 7, 34],             // east, south of the road gap
  ];
  const FH = 1.85;
  for (const [dir, coord, lo, hi] of fenceRuns) {
    // subdivide runs so the mesh follows the terrain without floating
    const pieces = Math.max(1, Math.ceil((hi - lo) / 6.5));
    for (let k = 0; k < pieces; k++) {
      const a0 = lo + ((hi - lo) * k) / pieces;
      const a1 = lo + ((hi - lo) * (k + 1)) / pieces;
      const len = a1 - a0;
      const g = new THREE.PlaneGeometry(len, FH + 0.4, 1, 1);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len, uv.getY(i) * (FH + 0.4));
      if (dir === 'v') g.rotateY(Math.PI / 2);
      const cx = dir === 'h' ? (a0 + a1) / 2 : coord;
      const cz = dir === 'h' ? coord : (a0 + a1) / 2;
      g.translate(cx, groundY(cx, cz) + (FH + 0.4) / 2 - 0.35, cz);
      fenceGeos.push(g);
    }
    // posts + top rail
    const len = hi - lo;
    const n = Math.max(2, Math.round(len / 3.2) + 1);
    for (let i = 0; i < n; i++) {
      const a = lo + (len * i) / (n - 1);
      const px = dir === 'h' ? a : coord;
      const pz = dir === 'h' ? coord : a;
      metalGeos.push(put(cylGeo(0.035, 0.035, FH + 0.4, 6), px, groundY(px, pz) + FH / 2 - 0.1, pz));
    }
    const cx = dir === 'h' ? (lo + hi) / 2 : coord;
    const cz = dir === 'h' ? coord : (lo + hi) / 2;
    const rail = cylGeo(0.025, 0.025, len, 6);
    rail.rotateZ(Math.PI / 2);
    if (dir === 'v') rail.rotateY(Math.PI / 2);
    rail.translate(cx, groundY(cx, cz) + FH + 0.02, cz);
    metalGeos.push(rail);
  }

  // gate barrier across the east road (extraction vista)
  {
    const bx = 52;
    metalGeos.push(put(cylGeo(0.09, 0.11, 1.15, 8), bx, 0.6, ROAD_E.z - ROAD_E.w / 2 + 0.6));
    metalGeos.push(put(cylGeo(0.07, 0.09, 1.0, 8), bx, 0.5, ROAD_E.z + ROAD_E.w / 2 - 0.6));
    // striped boom arm (vertex-colored, merged into the car batch)
    const segN = 6, armLen = ROAD_E.w - 1.2;
    for (let i = 0; i < segN; i++) {
      const sl = armLen / segN;
      const seg = new THREE.BoxGeometry(0.09, 0.09, sl);
      put(seg, bx, 1.06, ROAD_E.z - armLen / 2 + sl * (i + 0.5));
      carGeos_.push(tintGeo(seg, i % 2 ? 0xb03a30 : 0xe8e4dc));
    }
  }

  // ------------------------------------------------------- merge batches
  const addMerged = (geos, material, name, { shadows = true } = {}) => {
    const merged = mergeGeos(geos);
    if (!merged) return null;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    mesh.matrixAutoUpdate = false;
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };

  addMerged(snowGeos, getMaterial('floor_snow'), 'env-snow');
  addMerged(metalGeos, getMaterial('metal_dark'), 'env-metal');
  addMerged(vegGeos, vegMaterial(), 'env-vegetation');
  addMerged(carGeos_, carMaterial(), 'env-cars');
  addMerged(roadGeos, roadMaterial(), 'env-roads', { shadows: false });
  addMerged(buildingGeos, buildingMaterial(), 'env-buildings-far', { shadows: false });
  addMerged(fenceGeos, fenceMaterial(), 'env-fence', { shadows: false });
  addMerged(ledGeos, ledMaterial(), 'env-led', { shadows: false });

  // -------------------------------------------------------- 7. snowfall
  // halve particle counts on the low quality preset
  const q = settings.quality();
  const scale = (q.particleBudget || 1200) < 700 ? 0.5 : 1;
  // Outer volumes form a ring AROUND the building envelope (x -38..38,
  // z -22..18.5) with a 1.4 m margin: wind sway is at most ~1.1 m, so no
  // flake can ever drift through a wall into a room. Same margin logic on
  // the inner (courtyard / near-window) volumes.
  const outer = makeSnowfall(
    Math.round(1350 * scale),
    [
      { x0: -48, y0: 0, z0: -50, x1: 52, y1: 26, z1: -23.4 },     // north strip
      { x0: -48, y0: 0, z0: 19.9, x1: 52, y1: 26, z1: 46 },       // south strip
      { x0: -48, y0: 0, z0: -23.4, x1: -39.3, y1: 26, z1: 19.9 }, // west (courtyard)
      { x0: 39.3, y0: 0, z0: -23.4, x1: 52, y1: 26, z1: 19.9 },   // east (exit vista)
    ],
    0.09, 0.16, 0.6, 1.2, 0.8);
  const inner = makeSnowfall(
    Math.round(520 * scale),
    [
      { x0: -53, y0: 0, z0: -11, x1: -39.3, y1: 11, z1: 11 },     // courtyard
      { x0: -37, y0: 0, z0: -26, x1: 31, y1: 8, z1: -23.4 },      // outside N windows
      { x0: -42.8, y0: 0, z0: -21.5, x1: -39.3, y1: 8, z1: -13 }, // outside W windows
    ],
    0.05, 0.105, 0.55, 1.0, 0.85);
  group.add(outer.points, inner.points);

  // ------------------------------------------- 8. ground wind-blown wisps
  const wisps = [];
  {
    const baseMat = new THREE.MeshBasicMaterial({
      map: T.wisp, transparent: true, opacity: 0, depthWrite: false,
      color: 0xf2f6fa,
    });
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.6), i === 0 ? baseMat : baseMat.clone());
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rnd() * Math.PI;
      m.position.set(-52 + i * 6, 0.05 + i * 0.02, -4 + i * 8);
      m.renderOrder = 2;
      wisps.push({ mesh: m, phase: i * 2.6, speed: 0.55 + i * 0.2 });
      group.add(m);
    }
  }

  // ------------------------------------------------------------ animation
  let t = 0;
  function update(dt) {
    dt = Math.min(dt || 0.016, 0.1);
    t += dt;
    // keep the sky dome centered on the camera (x/z only; horizon stays at y=0)
    const cam = game && game.camera;
    if (cam) {
      sky.position.x = cam.position.x;
      sky.position.z = cam.position.z;
    }
    // slow gusting wind, generally from the NW (pushes +x, +z)
    const gust = 0.5 + 0.5 * Math.sin(t * 0.13 + 1.2);
    const windX = 0.35 + gust * 0.55;
    const windZ = 0.15 + gust * 0.3;
    outer.update(t, dt, windX, windZ);
    inner.update(t, dt, windX * 0.6, windZ * 0.6);
    for (const wsp of wisps) {
      const cyc = (t * wsp.speed * 0.11 + wsp.phase) % 1;
      wsp.mesh.position.x = -53.5 + cyc * 14;
      wsp.mesh.position.z = -6 + Math.sin(wsp.phase * 3.1) * 9 + Math.sin(t * 0.4 + wsp.phase) * 0.8;
      // fade in/out over the slide so it never pops
      const fade = smoothstep(cyc / 0.25) * smoothstep((1 - cyc) / 0.25);
      wsp.mesh.material.opacity = 0.2 * fade * (0.6 + 0.4 * Math.sin(t * 0.9 + wsp.phase));
    }
  }

  return { group, update };
}

// ---------------------------------------------------------------------------
// materials (cheap, shared, lazy)
// ---------------------------------------------------------------------------
const _mats = {};
function vegMaterial() {
  if (!_mats.veg) _mats.veg = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.0 });
  return _mats.veg;
}
function carMaterial() {
  if (!_mats.car) _mats.car = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.25 });
  return _mats.car;
}
function roadMaterial() {
  if (!_mats.road) _mats.road = new THREE.MeshStandardMaterial({ map: tex().road, roughness: 0.9, metalness: 0.0 });
  return _mats.road;
}
function buildingMaterial() {
  if (!_mats.bld) {
    _mats.bld = new THREE.MeshStandardMaterial({
      map: tex().facade.map, emissiveMap: tex().facade.emissiveMap,
      emissive: 0xffffff, emissiveIntensity: 0.5,
      roughness: 0.85, metalness: 0.1,
    });
  }
  return _mats.bld;
}
function fenceMaterial() {
  if (!_mats.fence) {
    // blended, no depth write: distant mips soften into haze instead of
    // becoming an opaque gray wall
    _mats.fence = new THREE.MeshStandardMaterial({
      map: tex().fence, transparent: true, alphaTest: 0.08, depthWrite: false,
      side: THREE.DoubleSide, roughness: 0.55, metalness: 0.4, color: 0xcdd2d6,
    });
  }
  return _mats.fence;
}
function ledMaterial() {
  if (!_mats.led) {
    _mats.led = new THREE.MeshStandardMaterial({
      color: 0x1c2126, emissive: 0xd7e6ff, emissiveIntensity: 2.2, roughness: 0.4,
    });
  }
  return _mats.led;
}

// ---------------------------------------------------------------------------
// asset registry (gallery samples)
// ---------------------------------------------------------------------------
function reg(id, name, build) {
  registerAsset({
    id, name, category: 'environment', agent: 'fable2', status: 'built',
    files: 'src/world/environment.js', build,
  });
}

reg('env_skydome', 'Winter Sky Dome', () => {
  const g = new THREE.Group();
  const s = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 32, 20),
    new THREE.MeshBasicMaterial({ map: tex().sky }));
  s.position.y = 1.0;
  g.add(s);
  return g;
});

reg('env_terrain_snow', 'Snowfield Terrain Patch', () => {
  const g = new THREE.Group();
  const plane = new THREE.PlaneGeometry(2.6, 2.6, 14, 14);
  plane.rotateX(-Math.PI / 2);
  const p = plane.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, 0.16 * Math.sin(x * 2.6 + 1) * Math.sin(z * 2.2 + 0.4) + 0.1);
  }
  plane.computeVertexNormals();
  const m = new THREE.Mesh(
    mergeGeos([plane, domeGeo(0.5, -0.4, 0.7, 0.3, 0.5, 0.4, 0.12)]),
    getMaterial('floor_snow'));
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
});

reg('env_road', 'Plowed Access Road', () => {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(3, 1.9, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5);
  geo.translate(0, 0.05, 0);
  const m = new THREE.Mesh(geo, roadMaterial());
  m.receiveShadow = true;
  g.add(m);
  return g;
});

reg('env_buildings_far', 'Distant City Blocks', () => {
  const g = new THREE.Group();
  for (const [x, h, w] of [[0, 1.6, 0.8], [0.9, 1.0, 0.7], [-0.9, 0.8, 0.65]]) {
    const geo = new THREE.BoxGeometry(w, h, w);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 0.4), uv.getY(i) * (h / 0.4));
    const m = new THREE.Mesh(geo, buildingMaterial());
    m.position.set(x, h / 2, 0);
    m.rotation.y = x;
    g.add(m);
  }
  return g;
});

reg('env_trees_spruce', 'Snow-Capped Spruce', () => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(mergeGeos(spruceGeos(0, 0, 0.34, 0, 0.12)), vegMaterial());
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
});

reg('env_tree_bare', 'Leafless Tree', () => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(mergeGeos(bareTreeGeos(0, 0, 0.42, 3, 0.1)), vegMaterial());
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
});

reg('env_cars_snowed', 'Snowed-In Car', () => {
  const g = new THREE.Group();
  const { body, snow } = carGeos(0, 0, 0.5, CAR_COLORS[0], 0.02);
  const bm = new THREE.Mesh(mergeGeos(body), carMaterial());
  const sm = new THREE.Mesh(mergeGeos(snow), getMaterial('floor_snow'));
  for (const m of [bm, sm]) {
    m.scale.setScalar(0.55);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
});

reg('env_light_pole', 'Parking LED Light Pole', () => {
  const g = new THREE.Group();
  const pole = cylGeo(0.06, 0.09, 5.6, 8);
  pole.translate(0, 2.8, 0);
  const arm = new THREE.BoxGeometry(1.3, 0.09, 0.09);
  arm.translate(0.62, 5.45, 0);
  const metal = new THREE.Mesh(mergeGeos([pole, arm]), getMaterial('metal_dark'));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.24), ledMaterial());
  head.position.set(1.15, 5.38, 0);
  const s = 0.42;
  metal.scale.setScalar(s);
  head.scale.setScalar(s);
  head.position.multiplyScalar(s);
  metal.castShadow = true;
  g.add(metal, head);
  return g;
});

reg('env_fence', 'Chain-Link Site Fence', () => {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(2.4, 1.85, 1, 1);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.4, uv.getY(i) * 1.85);
  geo.translate(0, 1.85 / 2, 0);
  g.add(new THREE.Mesh(geo, fenceMaterial()));
  for (const px of [-1.2, 1.2]) {
    const post = new THREE.Mesh(cylGeo(0.035, 0.035, 2.0, 8), getMaterial('metal_dark'));
    post.position.set(px, 1.0, 0);
    post.castShadow = true;
    g.add(post);
  }
  return g;
});

reg('env_snowfall', 'Falling Snow System', () => {
  const g = new THREE.Group();
  const rnd = mulberry(77);
  const n = 130;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rnd() - 0.5) * 2.2;
    pos[i * 3 + 1] = rnd() * 2.4;
    pos[i * 3 + 2] = (rnd() - 0.5) * 2.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.045, map: tex().flake, transparent: true, opacity: 0.85,
    depthWrite: false, sizeAttenuation: true, color: 0xf7fafd,
  });
  g.add(new THREE.Points(geo, mat));
  return g;
});
