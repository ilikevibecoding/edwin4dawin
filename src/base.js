// base.js — procedural fictional air-defense base: terrain, mountains, apron, command shelter,
// fencing, floodlights, vehicles, props. All geometry is generated, merged into per-material
// buckets to keep draw calls low. Registers colliders for player movement.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  tintGeometry, grungeTexture, concreteTexture, asphaltTexture, sandTexture, camoTexture,
  hazardTexture, chainlinkTexture, stencilTexture, scorchTexture, softCircleTexture,
  macroVariationTexture, cableCurve, fbm, clamp, lerp, smoothstep, rngFx, makeCanvas, mulberry32,
} from './utils.js';
import { makeBoxCollider } from './physics.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const E = (x, y, z) => new THREE.Euler(x, y, z);

// analytic terrain height — shared by the terrain mesh and anything scattered on it
export function terrainHeight(x, z, rad = Math.hypot(x, z)) {
  if (rad <= 260) return 0;
  const n = fbm(x * 0.0006 + 7, z * 0.0006 + 3, 4);
  let y = (n - 0.42) * clamp((rad - 260) / 900, 0, 1) * 120;
  y += (fbm(x * 0.0035, z * 0.0035, 3) - 0.5) * clamp((rad - 260) / 600, 0, 1) * 16;
  return y;
}

const _scrubHaze = new THREE.Color(0.62, 0.60, 0.57);

// straw blades on transparent background; alpha-tested, tinted per instance
function grassTuftTexture() {
  const tex = new THREE.CanvasTexture(makeCanvas(128, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const rnd = mulberry32(1234);
    for (let i = 0; i < 26; i++) {
      const x0 = w * (0.18 + rnd() * 0.64);
      const lean = (rnd() - 0.5) * 34;
      const top = h * (0.05 + rnd() * 0.3);
      const v = 175 + Math.floor(rnd() * 80);
      ctx.strokeStyle = `rgb(${v},${v - 12},${v - 40})`;
      ctx.lineWidth = 1.6 + rnd() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x0, h);
      ctx.quadraticCurveTo(x0 + lean * 0.35, h * 0.55, x0 + lean, top);
      ctx.stroke();
    }
  }));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------- geometry kit
// Box UVs scale with physical size (3 m tile) so big surfaces keep texture density.
const UV_TILE = 3;
function scaleBoxUVs(geo, w, h, d) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // ±x, ±y, ±z faces
  for (let f = 0; f < 6; f++) {
    const [su, sv] = dims[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * su / UV_TILE, uv.getY(k) * sv / UV_TILE);
    }
  }
}

export class Kit {
  constructor() { this.buckets = new Map(); }
  _push(key, geo, pos, rot, color) {
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    if (rot) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rot));
    if (pos) geo.translate(pos.x, pos.y, pos.z);
    tintGeometry(geo, color);
    this.buckets.get(key).push(geo);
  }
  box(key, w, h, d, pos, color, rot = null) {
    const geo = new THREE.BoxGeometry(w, h, d);
    scaleBoxUVs(geo, w, h, d);
    this._push(key, geo, pos, rot, color);
  }
  cyl(key, rt, rb, h, pos, color, rot = null, seg = 10) {
    this._push(key, new THREE.CylinderGeometry(rt, rb, h, seg), pos, rot, color);
  }
  tube(key, curve, r, color, seg = 16, radial = 5) {
    this._push(key, new THREE.TubeGeometry(curve, seg, r, radial), null, null, color);
  }
  plane(key, w, h, pos, color, rot = null) {
    this._push(key, new THREE.PlaneGeometry(w, h), pos, rot, color);
  }
  cone(key, r, h, pos, color, rot = null, seg = 8) {
    this._push(key, new THREE.ConeGeometry(r, h, seg), pos, rot, color);
  }
  sphere(key, r, pos, color, seg = 8) {
    this._push(key, new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), pos, null, color);
  }
  custom(key, geo, pos, color, rot = null) { this._push(key, geo, pos, rot, color); }

  build(materials, parent, { shadows = true } = {}) {
    const meshes = {};
    for (const [key, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, materials[key]);
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      parent.add(mesh);
      meshes[key] = mesh;
    }
    this.buckets.clear();
    return meshes;
  }
}

// ---------------------------------------------------------------- base
export class Base {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.colliders = [];
    this.time = 0;
    this.alarm = false;
    this.floodAmount = 0;

    // shared materials (maps repeat: kit boxes emit UVs > 1 for big faces)
    const grunge = grungeTexture(512);
    grunge.wrapS = grunge.wrapT = THREE.RepeatWrapping;
    const concrete = concreteTexture(512);
    concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping;
    this.materials = {
      paint: new THREE.MeshStandardMaterial({ vertexColors: true, map: grunge, roughness: 0.82, metalness: 0.18 }),
      steel: new THREE.MeshStandardMaterial({ vertexColors: true, map: grunge, roughness: 0.42, metalness: 0.78 }),
      concrete: new THREE.MeshStandardMaterial({ vertexColors: true, map: concrete, roughness: 0.96, metalness: 0.02 }),
      lamp: new THREE.MeshStandardMaterial({ color: 0x1c1c18, emissive: 0xfff3d8, emissiveIntensity: 0.0, roughness: 0.4, metalness: 0.3 }),
      redlamp: new THREE.MeshStandardMaterial({ color: 0x220505, emissive: 0xff2211, emissiveIntensity: 1.4, roughness: 0.5 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x0a1210, roughness: 0.12, metalness: 0.85 }),
    };

    // aim points threats care about (fictional target zones on/near the base)
    this.aimPoints = [
      { name: 'APRON', pos: V(6, 0, -26), r: 40 },
      { name: 'FUEL DEPOT', pos: V(-74, 0, 44), r: 18 },
      { name: 'RADAR SITE', pos: V(-44, 0, -8), r: 18 },
      { name: 'SOUTH PAD', pos: V(30, 0, 66), r: 30 },
      { name: 'PERIMETER', pos: V(110, 0, 10), r: 60 },
    ];

    this.padPositions = {
      patriot: { pos: V(58, 0, -52), heading: -0.5 },
      thaad: { pos: V(-64, 0, -56), heading: 0.55 },
      sentinel: { pos: V(16, 0, 74), heading: Math.PI },
    };
    this.radarSite = { pos: V(-44, 0, -8) };
    this.consoleZone = { pos: V(1.4, 0, 13.2), r: 2.4 };
    this.playerSpawn = { pos: V(6, 0, 22), yaw: Math.PI * 0.9 };

    this._buildTerrain();
    this._buildMountains();
    this._buildApron();

    const kit = new Kit();
    this._buildFence(kit);
    this._buildC2(kit);
    this._buildFuelDepot(kit);
    this._buildTrucks(kit);
    this._buildGenerators(kit);
    this._buildAntennaFarm(kit);
    this._buildFloodlights(kit);
    this._buildBarriers(kit);
    this._buildWatchtowerAndGate(kit);
    this._buildBatteryPads(kit);
    this._buildProps(kit);
    this.staticMeshes = kit.build(this.materials, this.group);

    this._buildFlag();
    this._buildWindsock();
    this._buildBeacons();
    this._buildFloodGlow();
    this._buildSigns();
    this._buildScrub();
    this._buildC2Interior();
  }

  // ---------------- terrain: polar grid, flat in base area, dunes further out
  _buildTerrain() {
    const RINGS = 42, SECTORS = 96, RMAX = 20000;
    const pos = [], uv = [], col = [], idx = [];
    const cSand = new THREE.Color(0.56, 0.53, 0.47);
    const cDark = new THREE.Color(0.38, 0.35, 0.30);
    const cHaze = new THREE.Color(0.63, 0.615, 0.59); // baked aerial perspective target
    for (let r = 0; r <= RINGS; r++) {
      const t = r / RINGS;
      const rad = Math.pow(t, 2.1) * RMAX; // dense near center
      for (let s = 0; s <= SECTORS; s++) {
        const a = (s / SECTORS) * Math.PI * 2;
        const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
        const y = terrainHeight(x, z, rad);
        pos.push(x, y, z);
        uv.push(x / 37, z / 37);
        const n2 = fbm(x * 0.002 + 31, z * 0.002, 3);
        const n3 = fbm(x * 0.0007 + 90, z * 0.0007 + 44, 3); // macro wadis/basins
        const c = cSand.clone().lerp(cDark, clamp(n2 * 0.55 + smoothstep(0.55, 0.75, n3) * 0.65, 0, 1));
        // distant desert desaturates and lifts toward haze so the horizon band
        // doesn't stay saturated mustard all the way to the mountain wall; the
        // rim itself (20 km) rides at ~90% scene fog so it dissolves into sky
        c.lerp(cHaze, smoothstep(2000, 12000, rad) * 0.45);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let r = 0; r < RINGS; r++) {
      for (let s = 0; s < SECTORS; s++) {
        const a = r * (SECTORS + 1) + s, b = a + SECTORS + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1); // wound so normals face up
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // Lambert with reflectivity 0: pure diffuse — no fresnel wash, no mirror env reflection
    const mat = new THREE.MeshLambertMaterial({ map: sandTexture(512), vertexColors: true, reflectivity: 0 });
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.anisotropy = 8; // keeps ripple detail at the grazing angles players actually see
    // Two extra samples of a seamless variation texture at very different world
    // scales: breaks the 37 m tile repetition and gives the flats km-scale tonal
    // structure + scrub-field mottling that reads from altitude.
    const macroTex = macroVariationTexture(256);
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uMacro = { value: macroTex };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vMacroXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMacroXZ = position.xz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uMacro;\nvarying vec2 vMacroXZ;')
        .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 mA = texture2D(uMacro, vMacroXZ / 1731.0).rgb;
          vec3 mB = texture2D(uMacro, vMacroXZ / 401.0 + vec2(0.37, 0.11)).rgb;
          // fbm output clusters around 0.5 — stretch it before use
          float lA = smoothstep(0.30, 0.70, mA.r), lB = smoothstep(0.32, 0.68, mB.g);
          diffuseColor.rgb *= (0.74 + 0.48 * lA) * (0.84 + 0.30 * lB);
          // scrub/desert-pavement fields: darker, slightly olive patches
          float scrub = smoothstep(0.28, 0.75, mB.b) * (0.25 + 0.75 * smoothstep(0.15, 0.6, mA.b));
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.70, 0.72, 0.62), scrub);
          // graded gravel ring around the apron, computed per-pixel (the old
          // per-vertex bake interpolated across skinny polar triangles as streaks)
          float apronEdge = max(abs(vMacroXZ.x) / 192.0, abs(vMacroXZ.y) / 172.0);
          apronEdge += (mB.g - 0.5) * 0.16; // ragged outer edge, not a surveyed line
          float gk = smoothstep(1.28, 0.98, apronEdge);
          // compacted-aggregate ring: must stay close to the sand's HUE — a neutral
          // gray of equal luminance reads as a pale blue mist band under the sky light
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.27, 0.225, 0.168) * (0.84 + 0.32 * lB), gk * 0.55);
        }`);
    };
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.receiveShadow = true;
    this.group.add(this.ground);
  }

  _buildMountains() {
    const SECTORS = 300;
    const ROWS = [5400, 5900, 6500, 7200, 8000, 9000, 10200, 12500];
    const HEIGHTS = [20, 180, 430, 780, 1080, 760, 380, 0];
    const pos = [], col = [], idx = [];
    // bajada matched to the desert's *effective* albedo (vertex tint × sand map ≈ 0.18/0.13/0.08)
    // — the mountain mesh has no texture, so a bright foot color reads as a glowing band
    const cFoot = new THREE.Color(0.225, 0.19, 0.145);
    const cLow = new THREE.Color(0.145, 0.118, 0.092);
    const cHigh = new THREE.Color(0.21, 0.185, 0.156);
    // warm-gray haze: the old blue-gray 0.35/0.365/0.43 lit up near-white under the
    // 2.75× day sun and turned the ranges into pale paper cutouts
    const cHaze = new THREE.Color(0.265, 0.252, 0.258);
    for (let r = 0; r < ROWS.length; r++) {
      for (let s = 0; s <= SECTORS; s++) {
        const a = (s / SECTORS) * Math.PI * 2;
        const jag = fbm(Math.cos(a) * 4 + r * 9, Math.sin(a) * 4, 5);
        const jag2 = fbm(Math.cos(a) * 14 + 40, Math.sin(a) * 14 + r * 3, 4);
        // low-frequency massif mask: some sectors drop to passes/gaps
        const massif = 0.15 + 0.85 * smoothstep(0.3, 0.72, fbm(Math.cos(a) * 2.2 + 5, Math.sin(a) * 2.2, 3));
        const rad = ROWS[r] * (1 + (jag - 0.5) * 0.11);
        const h = Math.min(HEIGHTS[r] * (0.35 + jag * 1.1) * (0.72 + jag2 * 0.55) * massif, 1400);
        pos.push(Math.cos(a) * rad, h, Math.sin(a) * rad);
        const rock = cLow.clone().lerp(cHigh, clamp(h / 1000, 0, 1));
        // feet blend into the desert so there is no hard mustard-to-gray seam
        const c = cFoot.clone().lerp(rock, smoothstep(15, 300, h));
        c.offsetHSL(0, (jag2 - 0.5) * 0.04, (jag2 - 0.5) * 0.04);
        // light albedo haze only — real aerial perspective comes from the boosted
        // fog curve on this material (post-lighting), not from bleaching the rock
        c.lerp(cHaze, r >= 5 ? 0.24 : r === 4 ? 0.15 : r === 3 ? 0.08 : 0.04);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let r = 0; r < ROWS.length - 1; r++) {
      for (let s = 0; s < SECTORS; s++) {
        const a = r * (SECTORS + 1) + s, b = a + SECTORS + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1); // wound so normals face up
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, reflectivity: 0 });
    // The ranges sit 5–12 km out where the global FogExp2 only reaches ~10–30%,
    // yet their sunlit faces render near-white (albedo × 2.75 sun) and read as
    // pale paper cutouts. Boost the fog curve for this material only: proper
    // screen-space aerial perspective that tracks each condition's fog color.
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `
      #ifdef USE_FOG
        float mFog = 1.0 - exp(-pow(vFogDepth * fogDensity * 1.55, 2.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, mFog);
      #endif
      `);
    };
    const m = new THREE.Mesh(geo, mat);
    this.group.add(m);
  }

  // ---------------- apron: tiled asphalt base (crisp up close) + painted markings overlay
  _buildApron() {
    const W = 320, H = 280;
    // base: tiling asphalt for close-up detail
    const aTex = asphaltTexture(512);
    aTex.repeat.set(W / 7.5, H / 7.5);
    aTex.anisotropy = 8;
    const baseMat = new THREE.MeshStandardMaterial({ map: aTex, roughness: 0.95, metalness: 0.02, color: 0xf2e8d6 });
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(W, H), baseMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = 0.02;
    apron.receiveShadow = true;
    this.group.add(apron);

    // markings overlay: transparent canvas (paint, stains, panel joints)
    const canvas = makeCanvas(2048, 1792, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const px = w / W; // horizontal pixels per metre
      const py = h / H; // vertical pixels per metre
      const mx = (xm) => (xm + W / 2) * px;
      const my = (zm) => (zm + H / 2) * py;

      // concrete panel joints
      ctx.strokeStyle = 'rgba(16,16,18,0.5)';
      ctx.lineWidth = 2.4;
      for (let gx = -140; gx <= 140; gx += 20) {
        ctx.beginPath(); ctx.moveTo(mx(gx), my(-120)); ctx.lineTo(mx(gx), my(120)); ctx.stroke();
      }
      for (let gz = -120; gz <= 120; gz += 20) {
        ctx.beginPath(); ctx.moveTo(mx(-140), my(gz)); ctx.lineTo(mx(140), my(gz)); ctx.stroke();
      }

      // service roads (darker resurfaced strips)
      const road = (pts) => {
        ctx.beginPath();
        ctx.moveTo(mx(pts[0][0]), my(pts[0][1]));
        for (let i = 1; i < pts.length; i++) ctx.lineTo(mx(pts[i][0]), my(pts[i][1]));
        ctx.stroke();
      };
      ctx.strokeStyle = 'rgba(14,14,16,0.55)';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 9 * px;
      road([[0, 140], [0, 40], [6, -20], [58, -52]]);
      road([[6, -20], [-64, -56]]);
      road([[0, 40], [16, 74]]);
      road([[6, -20], [-44, -8], [-74, 44]]);
      // center dashes
      ctx.strokeStyle = 'rgba(215,205,175,0.6)';
      ctx.lineWidth = 0.3 * px;
      ctx.setLineDash([3.4 * px, 3 * px]);
      road([[0, 140], [0, 40], [6, -20], [58, -52]]);
      road([[6, -20], [-64, -56]]);
      road([[0, 40], [16, 74]]);
      ctx.setLineDash([]);

      // helipad
      const hx = mx(96), hy = my(38);
      ctx.strokeStyle = 'rgba(225,215,185,0.9)';
      ctx.lineWidth = 1.0 * px;
      ctx.beginPath(); ctx.arc(hx, hy, 11 * px, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `700 ${Math.floor(12 * px)}px monospace`;
      ctx.fillStyle = 'rgba(225,215,185,0.9)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('H', hx, hy);

      // launcher pad outlines + labels
      const padMark = (x, z, label) => {
        ctx.strokeStyle = 'rgba(190,55,38,0.8)';
        ctx.lineWidth = 0.45 * px;
        ctx.strokeRect(mx(x - 12), my(z - 12), 24 * px, 24 * py);
        ctx.strokeStyle = 'rgba(215,180,70,0.55)';
        ctx.beginPath(); ctx.arc(mx(x), my(z), 15.5 * px, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(215,205,175,0.7)';
        ctx.font = `700 ${Math.floor(1.4 * px)}px monospace`;
        ctx.fillText(label, mx(x), my(z + 14.2));
      };
      padMark(58, -52, 'PAD A');
      padMark(-64, -56, 'PAD B');
      padMark(16, 74, 'PAD C');

      // parking bays
      ctx.strokeStyle = 'rgba(215,205,175,0.55)';
      ctx.lineWidth = 0.26 * px;
      for (let i = 0; i < 5; i++) {
        ctx.strokeRect(mx(-40 + i * 9), my(26), 7.4 * px, 14 * py);
      }

      // gate text
      ctx.fillStyle = 'rgba(215,205,175,0.7)';
      ctx.font = `700 ${Math.floor(3.2 * px)}px monospace`;
      ctx.fillText('FB CASTLE ROCK', mx(0), my(110));
      ctx.font = `700 ${Math.floor(2.0 * px)}px monospace`;
      ctx.fillText('AUTHORIZED VEHICLES ONLY', mx(0), my(115));
      // stop line at gate
      ctx.fillStyle = 'rgba(215,205,175,0.75)';
      ctx.fillRect(mx(-5), my(122), 10 * px, 0.6 * py);

      // large-scale sun-bleach + resurfacing patches (breaks up the uniform sheet)
      for (let i = 0; i < 16; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 70 + Math.random() * 220;
        const light = Math.random() < 0.6;
        const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
        g.addColorStop(0, light ? 'rgba(238,226,200,0.085)' : 'rgba(22,22,26,0.10)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // oil stains / tire wear
      for (let i = 0; i < 110; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 34;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, 'rgba(10,10,10,0.22)');
        g.addColorStop(1, 'rgba(10,10,10,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // tire tracks along main road
      ctx.strokeStyle = 'rgba(12,12,12,0.25)';
      ctx.lineWidth = 0.35 * px;
      for (const off of [-1.1, 1.1]) {
        ctx.beginPath();
        ctx.moveTo(mx(off), my(140));
        ctx.lineTo(mx(off), my(40));
        ctx.quadraticCurveTo(mx(off), my(0), mx(6 + off), my(-20));
        ctx.stroke();
      }
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    // standard material so markings darken correctly at night
    const overlayMat = new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const overlay = new THREE.Mesh(new THREE.PlaneGeometry(W, H), overlayMat);
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = 0.045;
    overlay.receiveShadow = true;
    overlay.renderOrder = 1;
    this.group.add(overlay);
  }

  // ---------------- perimeter fence
  _buildFence(kit) {
    const X = 150, Z = 132, POST = 3.0;
    const link = chainlinkTexture(128);
    const fenceMat = new THREE.MeshStandardMaterial({
      map: link, transparent: false, alphaTest: 0.32, side: THREE.DoubleSide,
      roughness: 0.55, metalness: 0.55, color: 0x62666a,
    });
    const spans = [
      { from: V(-X, 0, -Z), to: V(X, 0, -Z) },
      { from: V(X, 0, -Z), to: V(X, 0, Z) },
      { from: V(X, 0, Z), to: V(5, 0, Z) },     // gate gap at south center
      { from: V(-5, 0, Z), to: V(-X, 0, Z) },
      { from: V(-X, 0, Z), to: V(-X, 0, -Z) },
    ];
    const fenceGeos = [];
    for (const s of spans) {
      const len = s.from.distanceTo(s.to);
      const g = new THREE.PlaneGeometry(len, POST);
      // set repeat via uv scale
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 2.4, uv.getY(i) * POST / 2.4);
      const mid = V().lerpVectors(s.from, s.to, 0.5); mid.y = POST / 2;
      const angle = Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z);
      g.rotateY(angle + Math.PI / 2);
      g.translate(mid.x, mid.y, mid.z);
      fenceGeos.push(g);
      // posts (non-metallic + dark so they read as silhouettes, not glints)
      const n = Math.floor(len / 6);
      for (let i = 0; i <= n; i++) {
        const p = V().lerpVectors(s.from, s.to, i / n);
        kit.cyl('paint', 0.05, 0.06, POST + 0.4, V(p.x, (POST + 0.4) / 2, p.z), 0x2e322d, null, 6);
      }
      // barbed top rails
      for (let k = 0; k < 2; k++) {
        const y = POST + 0.14 + k * 0.14;
        const c = new THREE.LineCurve3(V(s.from.x, y, s.from.z), V(s.to.x, y, s.to.z));
        kit.tube('paint', c, 0.012, 0x242720, 1, 4);
      }
      // collider
      const size = V(Math.abs(s.to.x - s.from.x) + 0.3, POST, Math.abs(s.to.z - s.from.z) + 0.3);
      this.colliders.push(makeBoxCollider(V(mid.x, POST / 2, mid.z), size));
    }
    const fence = new THREE.Mesh(mergeGeometries(fenceGeos, false), fenceMat);
    fence.castShadow = false; fence.receiveShadow = false;
    this.group.add(fence);
  }

  // ---------------- command & control shelter
  _buildC2(kit) {
    const P = V(0, 0, 14); // center
    const Wd = 9.4, Ht = 3.3, Dp = 4.2;
    const camoCol = 0x4a5240;
    // main shell (door opening cut on south face via flanking walls)
    kit.box('paint', Wd, Ht, 0.16, V(P.x, Ht / 2, P.z - Dp / 2), camoCol);              // north wall
    kit.box('paint', 0.16, Ht, Dp, V(P.x - Wd / 2, Ht / 2, P.z), camoCol);              // west
    kit.box('paint', 0.16, Ht, Dp, V(P.x + Wd / 2, Ht / 2, P.z), camoCol);              // east
    // south wall with door gap (door at x=+2.2, width 1.15)
    kit.box('paint', 5.9, Ht, 0.16, V(P.x - 1.6, Ht / 2, P.z + Dp / 2), camoCol);
    kit.box('paint', 1.9, Ht, 0.16, V(P.x + 3.75, Ht / 2, P.z + Dp / 2), camoCol);
    kit.box('paint', 1.4, Ht - 2.15, 0.16, V(P.x + 2.35, (Ht + 2.15) / 2, P.z + Dp / 2), camoCol); // lintel
    kit.box('paint', Wd + 0.3, 0.2, Dp + 0.3, V(P.x, Ht + 0.08, P.z), 0x3c4436);        // roof
    kit.box('concrete', Wd + 2.4, 0.12, Dp + 2.4, V(P.x, 0.055, P.z), 0x8a8880);         // pad
    // corner posts + rib details
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kit.box('steel', 0.14, Ht + 0.15, 0.14, V(P.x + sx * (Wd / 2), (Ht + 0.15) / 2, P.z + sz * (Dp / 2)), 0x30342c);
    }
    for (let i = -3; i <= 3; i++) {
      kit.box('paint', 0.08, Ht, 0.05, V(P.x + i * 1.3, Ht / 2, P.z - Dp / 2 - 0.09), 0x3c4436);
      if (Math.abs(P.x + i * 1.3 - 2.2) > 1.0) kit.box('paint', 0.08, Ht, 0.05, V(P.x + i * 1.3, Ht / 2, P.z + Dp / 2 + 0.09), 0x3c4436);
    }
    // AC unit + exhaust
    kit.box('paint', 1.1, 0.9, 0.5, V(P.x - Wd / 2 - 0.35, 1.6, P.z - 0.8), 0x565c50);
    kit.cyl('steel', 0.09, 0.09, 1.2, V(P.x - Wd / 2 - 0.3, Ht + 0.6, P.z + 1.2), 0x2e3230);
    // door (open, hinged out)
    kit.box('paint', 0.06, 2.1, 1.05, V(P.x + 2.85, 1.08, P.z + Dp / 2 + 0.5), 0x39412f, E(0, 0.5, 0));
    // roof clutter: vents, cable box, GPS dome, antenna mast
    kit.box('paint', 0.7, 0.3, 0.7, V(P.x - 2.6, Ht + 0.33, P.z - 0.6), 0x4e5546);
    kit.sphere('paint', 0.28, V(P.x + 1.4, Ht + 0.42, P.z - 1.1), 0xd8d4c8, 10);
    kit.cyl('steel', 0.035, 0.05, 4.6, V(P.x + 3.6, Ht + 2.3, P.z - 1.2), 0x30342c);
    kit.cyl('steel', 0.012, 0.012, 1.4, V(P.x + 3.6, Ht + 5.2, P.z - 1.2), 0x666);
    // sat dish on roof
    const dish = new THREE.SphereGeometry(0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.6);
    kit.custom('paint', dish, V(P.x - 3.3, Ht + 0.75, P.z + 0.7), 0xcfcabb, E(-0.9, 0.4, 0));
    kit.cyl('steel', 0.05, 0.07, 0.7, V(P.x - 3.3, Ht + 0.35, P.z + 0.7), 0x30342c);
    // sandbags along front wall
    for (let i = 0; i < 7; i++) {
      for (let row = 0; row < 2 - (i % 2 ? 0 : 1) + 1; row++) {
        kit.box('paint', 0.62, 0.24, 0.34,
          V(P.x - 4.2 + i * 0.66 + (row % 2) * 0.1, 0.13 + row * 0.23, P.z + Dp / 2 + 0.55),
          row % 2 ? 0x7a7259 : 0x6e6750, E(0, (i % 3 - 1) * 0.08, 0));
      }
    }
    // colliders: walls (leave the doorway open)
    this.colliders.push(
      makeBoxCollider(V(P.x, Ht / 2, P.z - Dp / 2), V(Wd, Ht, 0.3)),
      makeBoxCollider(V(P.x - Wd / 2, Ht / 2, P.z), V(0.3, Ht, Dp)),
      makeBoxCollider(V(P.x + Wd / 2, Ht / 2, P.z), V(0.3, Ht, Dp)),
      makeBoxCollider(V(P.x - 1.6, Ht / 2, P.z + Dp / 2), V(5.9, Ht, 0.3)),
      makeBoxCollider(V(P.x + 3.75, Ht / 2, P.z + Dp / 2), V(1.9, Ht, 0.3)),
    );
    this.c2 = { pos: P.clone(), w: Wd, h: Ht, d: Dp };
  }

  _buildC2Interior() {
    const P = this.c2.pos;
    const g = new THREE.Group();
    // painted interior floor: covers the outdoor pad concrete (whose crack/stain
    // pattern read as random scribbles inside the dim room)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.c2.w - 0.3, this.c2.d - 0.3),
      new THREE.MeshStandardMaterial({ color: 0x3d4038, roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(P.x, 0.125, P.z); // just above the pad top (0.115)
    g.add(floor);
    // console desk along north wall
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x23281f, roughness: 0.7, metalness: 0.3 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.85), deskMat);
    desk.position.set(P.x + 0.6, 0.86, P.z - this.c2.d / 2 + 0.62);
    g.add(desk);
    for (const dx of [-2.0, 2.0]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.86, 0.7), deskMat);
      leg.position.set(P.x + 0.6 + dx, 0.43, P.z - this.c2.d / 2 + 0.62);
      g.add(leg);
    }
    // screens (canvas textures updated by radar/ui at low rate)
    this.screenCanvases = [];
    this.screens = [];
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 160;
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const scr = new THREE.Mesh(
        new THREE.PlaneGeometry(1.16, 0.72),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
      );
      scr.position.set(P.x - 0.75 + i * 1.36, 1.45, P.z - this.c2.d / 2 + 0.28);
      scr.rotation.x = -0.1;
      g.add(scr);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.84, 0.1), deskMat);
      frame.position.copy(scr.position); frame.position.z -= 0.06;
      frame.rotation.copy(scr.rotation);
      g.add(frame);
      this.screenCanvases.push(c);
      this.screens.push(tex);
    }
    // rack cabinet
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 0.8), deskMat);
    rack.position.set(P.x - 4.0, 1.0, P.z - 0.6);
    g.add(rack);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x77ff99, toneMapped: false });
    for (let i = 0; i < 8; i++) {
      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.03), i % 3 === 0 ? new THREE.MeshBasicMaterial({ color: 0xffaa44, toneMapped: false }) : lampMat);
      led.position.set(P.x - 3.63, 0.5 + i * 0.19, P.z - 0.78 + (i % 2) * 0.3);
      led.rotation.y = Math.PI / 2;
      g.add(led);
    }
    // chair
    const chair = new THREE.Group();
    const cm = new THREE.MeshStandardMaterial({ color: 0x2a2d28, roughness: 0.85 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.5), cm); seat.position.y = 0.5;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.07), cm); back.position.set(0, 0.85, 0.24);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5), cm); pole.position.y = 0.25;
    chair.add(seat, back, pole);
    chair.position.set(P.x + 0.6, 0, P.z - 0.55);
    chair.rotation.y = 0.3;
    g.add(chair);

    // ---- interior clutter (props that sell the room)
    const propMat = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    // keyboards + mug on desk
    for (const dx of [-0.75, 0.6, 1.95]) {
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.16), propMat(0x1b1e1a));
      kb.position.set(P.x + dx, 0.915, P.z - this.c2.d / 2 + 0.78);
      kb.rotation.y = (dx * 0.05);
      g.add(kb);
    }
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 10), propMat(0x7a2f24, 0.4));
    mug.position.set(P.x + 1.3, 0.945, P.z - this.c2.d / 2 + 0.85);
    g.add(mug);
    // binders on desk end
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.24),
        propMat([0x51442e, 0x2f3a4a, 0x3a4a34][i]));
      b.position.set(P.x - 1.75 + i * 0.07, 1.05, P.z - this.c2.d / 2 + 0.6);
      b.rotation.z = i === 2 ? -0.18 : 0;
      g.add(b);
    }
    // notice board with fictional postings
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85),
      new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(makeCanvas(256, 168, (ctx, w, h) => {
          ctx.fillStyle = '#5b4a33'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#8a7a5e'; ctx.fillRect(6, 6, w - 12, h - 12);
          const notes = ['#d8d2c0', '#c9b98a', '#d8d2c0', '#a8b8c8', '#d8d2c0'];
          const r = mulberry32(9);
          for (let i = 0; i < 7; i++) {
            ctx.fillStyle = notes[i % notes.length];
            const nw = 34 + r() * 30, nh = 30 + r() * 26;
            const x = 14 + r() * (w - nw - 28), y = 12 + r() * (h - nh - 24);
            ctx.save(); ctx.translate(x + nw / 2, y + nh / 2); ctx.rotate((r() - 0.5) * 0.2);
            ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
            ctx.strokeStyle = 'rgba(40,36,28,0.6)'; ctx.lineWidth = 1;
            for (let l = 0; l < 4; l++) { ctx.beginPath(); ctx.moveTo(-nw / 2 + 4, -nh / 2 + 7 + l * 6); ctx.lineTo(nw / 2 - 4, -nh / 2 + 7 + l * 6); ctx.stroke(); }
            ctx.restore();
          }
        })), roughness: 0.9,
      }));
    board.material.map.colorSpace = THREE.SRGBColorSpace;
    board.position.set(P.x - this.c2.w / 2 + 0.1, 1.7, P.z + 0.7);
    board.rotation.y = Math.PI / 2;
    g.add(board);
    // fire extinguisher (red pop by the door)
    const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.45, 10), propMat(0xa22318, 0.35));
    ext.position.set(P.x + 3.9, 0.65, P.z + this.c2.d / 2 - 0.35);
    g.add(ext);
    const extTop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 8), propMat(0x222222));
    extTop.position.set(P.x + 3.9, 0.93, P.z + this.c2.d / 2 - 0.35);
    g.add(extTop);
    // wall cable tray feeding the racks
    const tray = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.1, 0.16), propMat(0x2c2f29, 0.5));
    tray.position.set(P.x, this.c2.h - 0.35, P.z - this.c2.d / 2 + 0.15);
    g.add(tray);
    // second rack + patch panel LEDs
    const rack2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.8), deskMat);
    rack2.position.set(P.x - 4.0, 0.8, P.z + 0.9);
    g.add(rack2);
    // floor mat
    const mat2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: 1 }));
    mat2.rotation.x = -Math.PI / 2;
    mat2.position.set(P.x + 0.6, 0.133, P.z - 0.4); // above the interior floor plane
    g.add(mat2);
    // wall map (sector chart)
    const mapTex = new THREE.CanvasTexture(makeCanvas(256, 192, (ctx, w, h) => {
      ctx.fillStyle = '#20261e'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(140,200,150,0.5)';
      for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = '#b8a878'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(20, h - 30);
      ctx.bezierCurveTo(w * 0.3, h * 0.4, w * 0.6, h * 0.7, w - 24, 26);
      ctx.stroke();
      ctx.fillStyle = '#d86a50';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(216,106,80,0.6)';
      for (const r of [18, 34, 50]) { ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#cfe8d6'; ctx.font = '10px monospace';
      ctx.fillText('SECTOR KILO-9 — FICTIONAL', 12, 14);
    }));
    mapTex.colorSpace = THREE.SRGBColorSpace;
    const wallMap = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1),
      new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 }));
    wallMap.position.set(P.x + this.c2.w / 2 - 0.1, 1.75, P.z - 0.3);
    wallMap.rotation.y = -Math.PI / 2;
    g.add(wallMap);
    // north wall, left of the screens: clock + readiness placard + duty whiteboard
    const wallZ = P.z - this.c2.d / 2 + 0.12;
    const clockTex = new THREE.CanvasTexture(makeCanvas(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#1a1d18'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8d5c8'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 54, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#20241e'; ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(a) * 44, h / 2 + Math.sin(a) * 44);
        ctx.lineTo(w / 2 + Math.cos(a) * 50, h / 2 + Math.sin(a) * 50);
        ctx.stroke();
      }
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + 20, h / 2 - 24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 - 10, h / 2 - 38); ctx.stroke();
    }));
    clockTex.colorSpace = THREE.SRGBColorSpace;
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24),
      new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.7 }));
    clock.position.set(P.x - 3.6, 2.35, wallZ);
    g.add(clock);
    const placardTex = new THREE.CanvasTexture(makeCanvas(256, 96, (ctx, w, h) => {
      ctx.fillStyle = '#242920'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#4c5644'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.fillStyle = '#cfd6c2'; ctx.font = '700 20px monospace'; ctx.textAlign = 'center';
      ctx.fillText('READINESS', w / 2, 30);
      const states = ['#3c4a38', '#c9a13a', '#3c4a38', '#3c4a38'];
      for (let i = 0; i < 4; i++) { ctx.fillStyle = states[i]; ctx.fillRect(22 + i * 56, 46, 44, 30); }
      ctx.fillStyle = '#11130f'; ctx.font = '700 15px monospace';
      const labels = ['1', '2', '3', '4'];
      for (let i = 0; i < 4; i++) ctx.fillText(labels[i], 44 + i * 56, 67);
    }));
    placardTex.colorSpace = THREE.SRGBColorSpace;
    const placard = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36),
      new THREE.MeshStandardMaterial({ map: placardTex, roughness: 0.8 }));
    placard.position.set(P.x - 3.55, 1.78, wallZ);
    g.add(placard);
    const wbTex = new THREE.CanvasTexture(makeCanvas(256, 176, (ctx, w, h) => {
      ctx.fillStyle = '#d3d6cc'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#7a8074'; ctx.lineWidth = 5; ctx.strokeRect(2, 2, w - 4, h - 4);
      ctx.strokeStyle = 'rgba(60,80,100,0.75)'; ctx.lineWidth = 2;
      ctx.font = '700 14px monospace'; ctx.fillStyle = '#3a4a5c'; ctx.textAlign = 'left';
      ctx.fillText('DUTY ROSTER', 14, 24);
      ctx.strokeStyle = 'rgba(50,60,70,0.5)';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(14, 44 + i * 24); ctx.lineTo(w - 14, 44 + i * 24); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(180,60,50,0.8)';
      ctx.beginPath(); ctx.moveTo(150, 40); ctx.lineTo(220, 40); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(120, 92, 46, 14, -0.06, 0, Math.PI * 2); ctx.stroke();
    }));
    wbTex.colorSpace = THREE.SRGBColorSpace;
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.72),
      new THREE.MeshStandardMaterial({ map: wbTex, roughness: 0.6 }));
    wb.position.set(P.x - 2.45, 1.62, wallZ);
    wb.rotation.z = 0.012;
    g.add(wb);
    // interior lights: ceiling fixture + teal monitor spill onto desk/operator
    this.c2Light = new THREE.PointLight(0xcfe0d2, 1.5, 10, 1.5);
    this.c2Light.position.set(P.x, this.c2.h - 0.4, P.z);
    g.add(this.c2Light);
    const screenGlow = new THREE.PointLight(0x9fe8c8, 1.1, 4.5, 1.8);
    screenGlow.position.set(P.x + 0.6, 1.5, P.z - this.c2.d / 2 + 0.85);
    g.add(screenGlow);
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.16), new THREE.MeshBasicMaterial({ color: 0xd8efe0, toneMapped: false }));
    fixture.position.set(P.x, this.c2.h - 0.12, P.z);
    g.add(fixture);
    // desk collider
    this.colliders.push(makeBoxCollider(V(P.x + 0.6, 0.5, P.z - this.c2.d / 2 + 0.62), V(4.4, 1.0, 0.9)));
    this.group.add(g);
  }

  // ---------------- fuel depot (aim target)
  _buildFuelDepot(kit) {
    const P = V(-74, 0, 44);
    kit.box('concrete', 22, 0.14, 16, V(P.x, 0.07, P.z), 0x8d8b82);
    // horizontal tanks
    for (let i = 0; i < 2; i++) {
      const z = P.z - 3 + i * 6;
      kit.cyl('steel', 1.5, 1.5, 8, V(P.x - 4, 1.9, z), 0x7d8074, E(0, 0, Math.PI / 2), 14);
      kit.sphere('steel', 1.5, V(P.x - 8, 1.9, z), 0x7d8074, 12);
      kit.sphere('steel', 1.5, V(P.x, 1.9, z), 0x7d8074, 12);
      for (const dx of [-6.5, -1.5]) {
        kit.box('concrete', 0.5, 1.2, 3.4, V(P.x + dx - 2.5, 0.6, z), 0x77756c);
      }
      kit.cyl('steel', 0.06, 0.06, 1.0, V(P.x - 4, 3.6, z), 0x4a4d44);
    }
    // drum stacks
    for (let i = 0; i < 14; i++) {
      const gx = P.x + 6 + (i % 5) * 0.75, gz = P.z - 5 + Math.floor(i / 5) * 0.8;
      kit.cyl('paint', 0.3, 0.3, 0.9, V(gx, 0.45 + 0.02 * (i % 3), gz), i % 4 === 0 ? 0x6e3f2a : 0x44503c, null, 10);
    }
    // berm walls
    for (const [dx, dz, w, d] of [[0, -8.6, 23, 0.8], [0, 8.6, 23, 0.8], [-11.6, 0, 0.8, 18], [11.6, 0, 0.8, 18]]) {
      kit.box('concrete', w, 1.4, d, V(P.x + dx, 0.7, P.z + dz), 0x7e7a6e);
    }
    this.colliders.push(
      makeBoxCollider(V(P.x - 4, 1.9, P.z), V(10, 3.5, 10)),
      makeBoxCollider(V(P.x + 7.5, 0.7, P.z - 4.4), V(4.5, 1.4, 2.4)),
      makeBoxCollider(V(P.x, 0.7, P.z - 8.6), V(23, 1.4, 0.8)),
      makeBoxCollider(V(P.x, 0.7, P.z + 8.6), V(23, 1.4, 0.8)),
      makeBoxCollider(V(P.x - 11.6, 0.7, P.z), V(0.8, 1.4, 18)),
      makeBoxCollider(V(P.x + 11.6, 0.7, P.z), V(0.8, 1.4, 18)),
    );
  }

  // ---------------- support trucks (kitbashed)
  _truck(kit, x, z, rotY, color, { bed = 'canvas' } = {}) {
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const L = (lx, lz) => V(x + lx * c - lz * s, 0, z + lx * s + lz * c);
    const rot = E(0, -rotY, 0);
    const at = (lx, ly, lz) => { const p = L(lx, lz); p.y = ly; return p; };
    // chassis + cab
    kit.box('paint', 6.6, 0.5, 2.3, at(0, 0.95, 0), 0x2e332b, rot);
    kit.box('paint', 1.9, 1.5, 2.3, at(-2.5, 1.95, 0), color, rot);
    kit.box('glass', 1.7, 0.55, 2.1, at(-2.45, 2.35, 0), 0x0e1512, rot);
    kit.box('paint', 0.35, 0.7, 2.2, at(-3.55, 1.0, 0), color, rot); // bumper
    // exhaust + mirrors
    kit.cyl('steel', 0.05, 0.05, 1.3, at(-1.7, 2.2, 1.16), 0x33352f, rot);
    // bed
    if (bed === 'canvas') {
      kit.box('paint', 4.2, 0.35, 2.3, at(1.2, 1.4, 0), color, rot);
      const arch = new THREE.CylinderGeometry(1.16, 1.16, 4.1, 10, 1, false, -Math.PI / 2 - 0.35, Math.PI + 0.7);
      arch.rotateZ(Math.PI / 2);
      kit.custom('paint', arch, at(1.2, 1.62, 0), 0x585e46, rot);
    } else if (bed === 'flat') {
      kit.box('paint', 4.2, 0.25, 2.3, at(1.2, 1.35, 0), color, rot);
      // spare canisters
      for (let i = 0; i < 2; i++) {
        kit.box('paint', 3.8, 0.5, 0.62, at(1.2, 1.75 + i * 0.5, -0.5 + (i % 2) * 0.9), 0x39412f, rot);
      }
    }
    // wheels
    for (const wx of [-2.5, 0.4, 1.9]) {
      for (const wz of [-1.05, 1.05]) {
        const g = new THREE.CylinderGeometry(0.52, 0.52, 0.4, 12);
        g.rotateX(Math.PI / 2);
        kit.custom('paint', g, at(wx, 0.52, wz), 0x141414, rot);
        const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.42, 8);
        hub.rotateX(Math.PI / 2);
        kit.custom('steel', hub, at(wx, 0.52, wz), 0x5d6157, rot);
      }
    }
    this.colliders.push(makeBoxCollider(V(x, 1.2, z), V(7, 2.6, 2.6), rotY));
  }

  _buildTrucks(kit) {
    this._truck(kit, -34, 30, 0.15, 0x49523e);
    this._truck(kit, -25, 31, 0.05, 0x4e5744);
    this._truck(kit, -43, 29, 0.24, 0x424b39, { bed: 'flat' });
    // reload truck near patriot pad
    this._truck(kit, 47, -34, -1.2, 0x49523e, { bed: 'flat' });
  }

  // ---------------- generators + cable runs
  _generator(kit, x, z, rotY = 0) {
    const rot = E(0, rotY, 0);
    kit.box('paint', 2.3, 1.35, 1.15, V(x, 0.75, z), 0x565c50, rot);
    kit.box('paint', 2.35, 0.12, 1.2, V(x, 1.46, z), 0x3f463a, rot);
    kit.box('concrete', 2.8, 0.12, 1.6, V(x, 0.06, z), 0x85837a);
    kit.cyl('steel', 0.07, 0.07, 0.55, V(x + 0.8, 1.75, z + 0.3), 0x2c2e29);
    // vents
    for (let i = 0; i < 3; i++) kit.box('paint', 0.03, 0.5, 0.72, V(x - 1.16, 0.8, z - 0.35 + i * 0.36), 0x30352c, rot);
    this.colliders.push(makeBoxCollider(V(x, 0.75, z), V(2.4, 1.5, 1.3), rotY));
    return V(x, 1.0, z);
  }

  _cableRun(kit, from, to, sag = 0.18) {
    // ground cable with small sag between posts every ~7 m
    const dist = from.distanceTo(to);
    const n = Math.max(1, Math.floor(dist / 8));
    let prev = from.clone(); prev.y = 0.25;
    for (let i = 1; i <= n; i++) {
      const p = V().lerpVectors(from, to, i / n); p.y = 0.25;
      kit.tube('paint', cableCurve(prev, p, sag, 6), 0.035, 0x1c1e1a, 8, 5);
      if (i < n) kit.box('paint', 0.14, 0.3, 0.14, V(p.x, 0.15, p.z), 0x3a3e35);
      prev = p;
    }
  }

  _buildGenerators(kit) {
    const c2 = this.c2 ? this.c2.pos : V(0, 0, 14);
    const g1 = this._generator(kit, 7.5, 9.5, 0.2);
    this._cableRun(kit, g1, V(c2.x + 3.4, 0, c2.z + 1.8));
    const g2 = this._generator(kit, -38, -16, 1.2);
    this._cableRun(kit, g2, V(-44, 0, -8));
    const g3 = this._generator(kit, 50, -44, -0.4);
    this._cableRun(kit, g3, V(58, 0, -52));
    const g4 = this._generator(kit, -55, -48, 0.8);
    this._cableRun(kit, g4, V(-64, 0, -56));
    const g5 = this._generator(kit, 24, 66, 2.4);
    this._cableRun(kit, g5, V(16, 0, 74));
    // main cable trunk C2 -> radar
    this._cableRun(kit, V(c2.x - 4.5, 0, c2.z), V(-44, 0, -8), 0.12);
  }

  // ---------------- antenna farm
  _buildAntennaFarm(kit) {
    const P = V(34, 0, 34);
    kit.box('concrete', 10, 0.14, 10, V(P.x, 0.07, P.z), 0x8a887f);
    // lattice mast 16 m
    const H = 16;
    for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      kit.cyl('steel', 0.04, 0.06, H, V(P.x + dx * (1 - 0) , H / 2, P.z + dz), 0x8f948c, null, 6);
    }
    for (let y = 1.5; y < H; y += 2) {
      kit.box('steel', 1.14, 0.05, 0.05, V(P.x, y, P.z - 0.5), 0x8f948c);
      kit.box('steel', 1.14, 0.05, 0.05, V(P.x, y, P.z + 0.5), 0x8f948c);
      kit.box('steel', 0.05, 0.05, 1.14, V(P.x - 0.5, y, P.z), 0x8f948c);
      kit.box('steel', 0.05, 0.05, 1.14, V(P.x + 0.5, y, P.z), 0x8f948c);
    }
    // yagi + dishes on mast
    kit.box('steel', 2.2, 0.06, 0.06, V(P.x + 0.8, H - 1.2, P.z), 0xb8bcb2, E(0, 0.5, 0));
    const dish2 = new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2.8);
    kit.custom('paint', dish2, V(P.x - 0.7, H - 3, P.z), 0xd0ccc0, E(-1.2, -0.7, 0));
    // guy wires
    for (const [gx, gz] of [[7, 7], [-7, 7], [7, -7], [-7, -7]]) {
      const anchor = V(P.x + gx, 0.1, P.z + gz);
      kit.tube('steel', new THREE.LineCurve3(V(P.x, H - 0.5, P.z), anchor), 0.012, 0x777, 1, 4);
      kit.box('concrete', 0.5, 0.3, 0.5, V(anchor.x, 0.15, anchor.z), 0x84827a);
    }
    // whip antennas
    for (let i = 0; i < 3; i++) {
      const x = P.x - 3 + i * 3, z = P.z + 3.4;
      kit.cyl('steel', 0.015, 0.03, 5 + i, V(x, (5 + i) / 2, z), 0x33362f, null, 6);
      kit.box('paint', 0.4, 0.5, 0.4, V(x, 0.25, z), 0x4a5240);
    }
    this.colliders.push(makeBoxCollider(V(P.x, 8, P.z), V(1.6, 16, 1.6)));
  }

  // ---------------- floodlight poles (lights themselves managed here, toggled by weather)
  _buildFloodlights(kit) {
    this.floodSpots = [];
    this.floodPositions = [
      V(14, 0, 4), V(-16, 0, 24), V(48, 0, -38), V(-52, 0, -42),
      V(8, 0, 60), V(-60, 0, 30), V(96, 0, 22), V(-6, 0, 108),
    ];
    const H = 9;
    for (const p of this.floodPositions) {
      kit.cyl('steel', 0.09, 0.14, H, V(p.x, H / 2, p.z), 0x565b52, null, 8);
      kit.box('concrete', 1.0, 0.5, 1.0, V(p.x, 0.25, p.z), 0x83817a);
      // twin heads
      for (const s of [-1, 1]) {
        kit.box('paint', 0.5, 0.24, 0.36, V(p.x + s * 0.32, H + 0.1, p.z), 0x3b4037, E(0.5 * s, 0.3 * s, 0));
        kit.plane('lampFace', 0.4, 0.18, V(p.x + s * 0.33, H + 0.03, p.z + 0.12), 0xffffff, E(-0.7, 0.25 * s, 0));
      }
      this.colliders.push({ type: 'cylinder', x: p.x, z: p.z, r: 0.25, y0: 0, y1: H });
      // real spotlight (night only, no shadows)
      const spot = new THREE.SpotLight(0xfff0d0, 0, 60, 0.75, 0.55, 1.3);
      spot.position.set(p.x, H, p.z);
      spot.target.position.set(p.x + 3, 0, p.z + 3);
      this.group.add(spot, spot.target);
      this.floodSpots.push(spot);
    }
    // lampFace bucket uses lamp material
    this.materials.lampFace = this.materials.lamp;
  }

  _buildFloodGlow() {
    const tex = softCircleTexture(128, 0, [255, 236, 190]);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    this.floodGlowMat = mat;
    const geos = [];
    for (const p of this.floodPositions) {
      const g = new THREE.PlaneGeometry(26, 26);
      g.rotateX(-Math.PI / 2);
      g.translate(p.x + 1.2, 0.06, p.z + 1.2);
      geos.push(g);
    }
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.renderOrder = 2;
    this.group.add(m);
  }

  // ---------------- barriers / hesco / equipment
  _buildBarriers(kit) {
    // jersey barriers along main road + battery flanks
    const jersey = (x, z, ry) => {
      const g = new THREE.CylinderGeometry(0.24, 0.5, 1.0, 4, 1);
      g.rotateY(Math.PI / 4);
      g.scale(1, 1, 2.6);
      kit.custom('concrete', g, V(x, 0.5, z), 0x8b897f, E(0, ry, 0));
      this.colliders.push(makeBoxCollider(V(x, 0.5, z), V(1.1, 1.0, 2.7), ry));
    };
    for (let i = 0; i < 6; i++) jersey(4.2, 96 - i * 8.2, 0);
    for (let i = 0; i < 6; i++) jersey(-4.2, 96 - i * 8.2, 0);
    for (let i = 0; i < 3; i++) jersey(44 + i * 6, -60 + i * 1.5, 1.1);
    for (let i = 0; i < 3; i++) jersey(-50 - i * 6, -64 + i * 1.5, -1.1);
    // HESCO bastion cluster near C2
    const hesco = (x, z, n, ry) => {
      for (let i = 0; i < n; i++) {
        const lx = x + Math.cos(ry) * i * 1.4, lz = z + Math.sin(ry) * i * 1.4;
        kit.box('paint', 1.35, 1.35, 1.35, V(lx, 0.68, lz), i % 2 ? 0x8d8468 : 0x968d70);
        kit.box('steel', 1.4, 0.04, 1.4, V(lx, 1.37, lz), 0x6b6f66);
      }
      this.colliders.push(makeBoxCollider(
        V(x + Math.cos(ry) * (n - 1) * 0.7, 0.7, z + Math.sin(ry) * (n - 1) * 0.7),
        V(Math.abs(Math.cos(ry)) * n * 1.4 + 1.4, 1.4, Math.abs(Math.sin(ry)) * n * 1.4 + 1.4)));
    };
    hesco(-8, 6, 5, 0);
    hesco(10, 6, 3, 0);
    hesco(-12, 40, 4, Math.PI / 2);
  }

  // ---------------- watchtower + gate
  _buildWatchtowerAndGate(kit) {
    const P = V(12, 0, 126);
    const H = 7.5;
    for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
      kit.cyl('steel', 0.09, 0.12, H, V(P.x + dx * (1 - 0.35 * 0), H / 2, P.z + dz), 0x4e5348, null, 6);
    }
    // cross braces
    for (let y = 1.6; y < H - 1; y += 2.2) {
      kit.box('steel', 2.9, 0.06, 0.06, V(P.x, y, P.z - 1.3), 0x4e5348, E(0, 0, 0.5));
      kit.box('steel', 2.9, 0.06, 0.06, V(P.x, y, P.z + 1.3), 0x4e5348, E(0, 0, -0.5));
    }
    kit.box('paint', 3.4, 0.16, 3.4, V(P.x, H, P.z), 0x3f463a);
    kit.box('paint', 3.2, 1.1, 0.08, V(P.x, H + 0.55, P.z - 1.6), 0x49523e);
    kit.box('paint', 3.2, 1.1, 0.08, V(P.x, H + 0.55, P.z + 1.6), 0x49523e);
    kit.box('paint', 0.08, 1.1, 3.2, V(P.x - 1.6, H + 0.55, P.z), 0x49523e);
    kit.box('paint', 0.08, 1.1, 3.2, V(P.x + 1.6, H + 0.55, P.z), 0x49523e);
    kit.box('paint', 3.8, 0.12, 3.8, V(P.x, H + 2.2, P.z), 0x39412f);
    for (const [dx, dz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) {
      kit.cyl('steel', 0.05, 0.05, 1.1, V(P.x + dx, H + 1.65, P.z + dz), 0x4e5348, null, 6);
    }
    // ladder
    for (let y = 0.4; y < H; y += 0.4) kit.box('steel', 0.5, 0.04, 0.04, V(P.x - 1.45, y, P.z), 0x6a6f64);
    kit.cyl('steel', 0.03, 0.03, H, V(P.x - 1.45, H / 2, P.z - 0.26), 0x6a6f64, null, 6);
    kit.cyl('steel', 0.03, 0.03, H, V(P.x - 1.45, H / 2, P.z + 0.26), 0x6a6f64, null, 6);
    this.colliders.push(makeBoxCollider(V(P.x, H / 2, P.z), V(3.0, H, 3.0)));

    // guard hut at gate
    const G = V(-8, 0, 128);
    kit.box('paint', 2.6, 2.5, 2.2, V(G.x, 1.25, G.z), 0x4d5544);
    kit.box('glass', 2.3, 0.7, 1.9, V(G.x, 1.8, G.z), 0x101a16);
    kit.box('paint', 3.0, 0.14, 2.6, V(G.x, 2.6, G.z), 0x39412f);
    this.colliders.push(makeBoxCollider(V(G.x, 1.25, G.z), V(2.7, 2.5, 2.3)));
    // barrier arm
    kit.cyl('paint', 0.09, 0.09, 8.4, V(-1.2, 1.05, 131), 0xb8412e, E(0, 0, Math.PI / 2), 8);
    kit.box('paint', 0.5, 1.1, 0.5, V(-5.5, 0.55, 131), 0x3f463a);
    // gate posts
    kit.cyl('steel', 0.12, 0.14, 3.4, V(5, 1.7, 132), 0x565b52, null, 8);
    kit.cyl('steel', 0.12, 0.14, 3.4, V(-5, 1.7, 132), 0x565b52, null, 8);
  }

  // ---------------- battery pads: concrete, T-walls, scorch
  _buildBatteryPads(kit) {
    for (const key of Object.keys(this.padPositions)) {
      const { pos, heading } = this.padPositions[key];
      kit.box('concrete', 24, 0.16, 24, V(pos.x, 0.08, pos.z), 0x908e84);
      // T-walls arc on the back side (launcher forward = (sin h, cos h), so the
      // polar angle of "behind" is π/2 − heading + π in cos/sin convention)
      const back = Math.PI / 2 - heading + Math.PI;
      for (let i = -2; i <= 2; i++) {
        const a = back + i * 0.32;
        const wx = pos.x + Math.cos(a) * 14.5, wz = pos.z + Math.sin(a) * 14.5;
        kit.box('concrete', 3.4, 2.6, 0.4, V(wx, 1.3, wz), 0x8b897e, E(0, -a + Math.PI / 2, 0));
        kit.box('concrete', 3.4, 0.5, 1.1, V(wx, 0.25, wz), 0x83816f, E(0, -a + Math.PI / 2, 0));
        this.colliders.push(makeBoxCollider(V(wx, 1.3, wz), V(3.4, 2.6, 1.1), -a + Math.PI / 2));
      }
    }
    // pre-existing scorch marks on pads
    const scorch = scorchTexture(256);
    const smat = new THREE.MeshBasicMaterial({ map: scorch, transparent: true, opacity: 0.6, depthWrite: false });
    const sg = [];
    for (const key of Object.keys(this.padPositions)) {
      const { pos } = this.padPositions[key];
      const g = new THREE.PlaneGeometry(9, 9);
      g.rotateX(-Math.PI / 2);
      g.rotateY(rngFx.range(0, Math.PI));
      g.translate(pos.x + rngFx.range(-2, 2), 0.18, pos.z + rngFx.range(-2, 2));
      sg.push(g);
    }
    const m = new THREE.Mesh(mergeGeometries(sg, false), smat);
    m.renderOrder = 1;
    this.group.add(m);
  }

  // ---------------- misc props
  _buildProps(kit) {
    // equipment cases near C2
    const caseStack = (x, z, n) => {
      for (let i = 0; i < n; i++) {
        kit.box('paint', 1.1, 0.42, 0.7,
          V(x + rngFx.range(-0.08, 0.08), 0.21 + i * 0.44, z + rngFx.range(-0.08, 0.08)),
          i % 2 ? 0x3a4034 : 0x453f2e, E(0, rngFx.range(-0.12, 0.12), 0));
      }
      this.colliders.push(makeBoxCollider(V(x, n * 0.22, z), V(1.2, n * 0.44, 0.8)));
    };
    caseStack(4.6, 8.6, 3);
    caseStack(-3.2, 9.4, 2);
    caseStack(-30, 26, 2);
    caseStack(52, -40, 3);
    // pallet stacks
    for (let i = 0; i < 4; i++) {
      kit.box('paint', 1.2, 0.14, 1.0, V(-24 + i * 1.6, 0.07, 44), 0x6f6046);
    }
    // flag pole base + pole (flag mesh separate)
    kit.cyl('steel', 0.045, 0.07, 11, V(-6, 5.5, 16), 0x9aa098, null, 8);
    kit.box('concrete', 1.0, 0.4, 1.0, V(-6, 0.2, 16), 0x8a887e);
    this.colliders.push({ type: 'cylinder', x: -6, z: 16, r: 0.2, y0: 0, y1: 11 });
    // windsock pole near helipad
    kit.cyl('steel', 0.04, 0.05, 6.2, V(96, 3.1, 24), 0x9aa098, null, 6);
    this.colliders.push({ type: 'cylinder', x: 96, z: 24, r: 0.15, y0: 0, y1: 6 });
    // weather station
    kit.cyl('steel', 0.05, 0.05, 3.2, V(88, 1.6, 52), 0x8f948c, null, 6);
    kit.box('paint', 0.5, 0.6, 0.4, V(88, 3.3, 52), 0xd6d2c6);
  }

  // ---------------- flag (vertex-waved shader)
  _buildFlag() {
    const emblem = new THREE.CanvasTexture(makeCanvas(256, 160, (ctx, w, h) => {
      ctx.fillStyle = '#26331f';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#d8d2c0'; ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      // winged chevron emblem
      ctx.fillStyle = '#d8d2c0';
      ctx.beginPath();
      ctx.moveTo(w / 2, 34); ctx.lineTo(w / 2 + 40, 84); ctx.lineTo(w / 2 + 16, 84);
      ctx.lineTo(w / 2, 58); ctx.lineTo(w / 2 - 16, 84); ctx.lineTo(w / 2 - 40, 84);
      ctx.closePath(); ctx.fill();
      ctx.font = '700 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ARC WARDEN', w / 2, 118);
      ctx.font = '400 13px monospace';
      ctx.fillText('173rd ADA · SKYWARD', w / 2, 140);
    }));
    emblem.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(2.6, 1.6, 16, 8);
    this.flagUniforms = { uTime: { value: 0 }, uMap: { value: emblem }, uWind: { value: 1 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.flagUniforms,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        uniform float uTime; uniform float uWind;
        varying vec2 vUv; varying float vShade;
        void main() {
          vUv = uv;
          vec3 p = position;
          float k = uv.x;
          float w = sin(p.x * 3.2 - uTime * 6.0) * 0.12 + sin(p.x * 6.4 - uTime * 9.1) * 0.05;
          p.z += w * k * uWind;
          p.y += sin(p.x * 2.1 - uTime * 4.4) * 0.04 * k * uWind;
          vShade = 0.82 + w * k * 1.4;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        varying vec2 vUv; varying float vShade;
        void main() {
          vec4 c = texture2D(uMap, vUv);
          gl_FragColor = vec4(c.rgb * vShade, 1.0);
        }`,
    });
    this.flag = new THREE.Mesh(geo, mat);
    this.flag.position.set(-6 + 1.32, 9.9, 16);
    this.group.add(this.flag);
  }

  _buildWindsock() {
    const geo = new THREE.ConeGeometry(0.28, 1.9, 8, 1, true);
    geo.rotateZ(Math.PI / 2); // point along +x
    const tex = new THREE.CanvasTexture(makeCanvas(64, 16, (ctx, w, h) => {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#d8dade' : '#c2542e';
        ctx.fillRect((i * w) / 4, 0, w / 4, h);
      }
    }));
    tex.colorSpace = THREE.SRGBColorSpace;
    this.windsock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
    this.windsock.position.set(96, 5.9, 24);
    this.group.add(this.windsock);
  }

  // ---------------- blinking obstruction beacons + alarm rotator
  _buildBeacons() {
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2211, toneMapped: false, transparent: true });
    const mk = (x, y, z, s = 0.11) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), this.beaconMat);
      m.position.set(x, y, z);
      this.group.add(m);
      return m;
    };
    this.beacons = [
      mk(34, 16.4, 34),          // antenna mast
      mk(12, 9.95 + 0, 126),     // watchtower... y ≈ H+2.26
    ];
    this.beacons[1].position.y = 9.86;

    // alarm rotator on C2 roof
    this.alarmPivot = new THREE.Group();
    this.alarmPivot.position.set(-1.5, this.c2.h + 0.34, 14 - 0.8);
    const baseM = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a2222, roughness: 0.6 }));
    this.alarmLampMat = new THREE.MeshBasicMaterial({ color: 0xff3322, toneMapped: false, transparent: true, opacity: 0.25 });
    const domeM = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.alarmLampMat);
    domeM.position.y = 0.11;
    const beamGeo = new THREE.PlaneGeometry(3.2, 0.5);
    beamGeo.translate(1.6, 0, 0);
    this.alarmBeamMat = new THREE.MeshBasicMaterial({
      color: 0xff4433, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const beam1 = new THREE.Mesh(beamGeo, this.alarmBeamMat);
    const beam2 = new THREE.Mesh(beamGeo, this.alarmBeamMat);
    beam2.rotation.y = Math.PI;
    beam1.position.y = beam2.position.y = 0.11;
    this.alarmPivot.add(baseM, domeM, beam1, beam2);
    this.alarmLight = new THREE.PointLight(0xff3322, 0, 40, 1.8);
    this.alarmLight.position.y = 0.3;
    this.alarmPivot.add(this.alarmLight);
    this.group.add(this.alarmPivot);
  }

  _buildSigns() {
    const sign = (text, sub, x, z, ry, w = 2.0, h = 0.8) => {
      const g = new THREE.Group();
      const tex = stencilTexture(text, { w: 512, h: 128, size: 42, sub });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ color: 0x3c4335, roughness: 0.9 }));
      const txt = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.9),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
      txt.position.z = 0.012;
      g.add(board, txt);
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5),
          this.materials.steel);
        leg.position.set(s * w * 0.42, -h / 2 - 0.4, -0.02);
        g.add(leg);
      }
      g.position.set(x, 1.55, z);
      g.rotation.y = ry;
      this.group.add(g);
    };
    sign('RESTRICTED AREA', 'USE OF FORCE AUTHORIZED', 6.5, 120, Math.PI, 2.6, 0.9);
    sign('FB CASTLE ROCK', '173rd ADA · ARC WARDEN', -6.5, 120, Math.PI, 2.6, 0.9);
    sign('C2 SHELTER', 'AUTHORIZED PERSONNEL', 3.6, 16.4, Math.PI * 0.5, 1.5, 0.6);
    sign('PAD A', 'MIM-9 RAMPART', 50, -44, 0.8, 1.3, 0.55);
    sign('PAD B', 'TX-11 HIGHGUARD', -55, -50, -0.8, 1.3, 0.55);
    sign('PAD C', 'SENTINEL-X', 10, 66, 0.4, 1.3, 0.55);
    sign('FUEL POINT', 'NO SMOKING', -68, 34, 0.6, 1.5, 0.6);
  }

  // ---------------- desert scrub + rocks (instanced)
  _buildScrub() {
    const m4 = new THREE.Matrix4();
    const cTmp = new THREE.Color();

    // creosote-style bushes: sit on the actual terrain, reach out to the mountain
    // aprons so the mid-ground band doesn't read as bare paint
    const N_BUSH = 620;
    const bushGeo = new THREE.IcosahedronGeometry(1, 0);
    bushGeo.scale(1, 0.55, 1);
    const bushMat = new THREE.MeshLambertMaterial({ flatShading: true, reflectivity: 0 });
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, N_BUSH);
    for (let i = 0; i < N_BUSH; i++) {
      const a = rngFx.range(0, Math.PI * 2);
      const r = Math.pow(rngFx.next(), 0.6) * 4600 + 175;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = rngFx.range(0.35, 1.3) * (r > 800 ? 1.9 : 1);
      m4.makeScale(s, s * rngFx.range(0.6, 1.1), s);
      m4.setPosition(x, terrainHeight(x, z) + s * 0.28, z);
      bushes.setMatrixAt(i, m4);
      // olive → straw variation, hazed with distance to match the terrain bake
      cTmp.setHSL(0.16 + rngFx.range(-0.03, 0.04), rngFx.range(0.18, 0.34), rngFx.range(0.24, 0.34));
      cTmp.lerp(_scrubHaze, smoothstep(1600, 5200, r) * 0.5);
      bushes.setColorAt(i, cTmp);
    }
    bushes.instanceMatrix.needsUpdate = true;
    bushes.frustumCulled = false;
    this.group.add(bushes);

    const N_ROCK = 340;
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshLambertMaterial({ flatShading: true, reflectivity: 0 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, N_ROCK);
    for (let i = 0; i < N_ROCK; i++) {
      const a = rngFx.range(0, Math.PI * 2);
      const r = Math.pow(rngFx.next(), 0.7) * 5000 + 220;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = rngFx.range(0.3, 1.8) * (r > 1200 ? 2.6 : 1);
      m4.makeRotationY(rngFx.range(0, Math.PI * 2));
      m4.scale(new THREE.Vector3(s, s * 0.7, s));
      m4.setPosition(x, terrainHeight(x, z) + s * 0.2, z);
      rocks.setMatrixAt(i, m4);
      cTmp.setHSL(0.09 + rngFx.range(-0.02, 0.02), rngFx.range(0.08, 0.16), rngFx.range(0.3, 0.42));
      cTmp.lerp(_scrubHaze, smoothstep(1600, 5200, r) * 0.5);
      rocks.setColorAt(i, cTmp);
    }
    rocks.instanceMatrix.needsUpdate = true;
    rocks.frustumCulled = false;
    this.group.add(rocks);

    // dry grass tufts: crossed alpha-tested quads near the perimeter where the
    // player actually walks/looks — softens the pad-to-desert edge
    const N_TUFT = 480;
    const tuftGeo = mergeGeometries([
      new THREE.PlaneGeometry(1, 1),
      new THREE.PlaneGeometry(1, 1).applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2)),
    ], false);
    tuftGeo.translate(0, 0.5, 0);
    const tuftMat = new THREE.MeshLambertMaterial({
      map: grassTuftTexture(), transparent: false, alphaTest: 0.42,
      side: THREE.DoubleSide, reflectivity: 0,
    });
    const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, N_TUFT);
    for (let i = 0; i < N_TUFT; i++) {
      const a = rngFx.range(0, Math.PI * 2);
      const r = Math.pow(rngFx.next(), 1.6) * 1100 + 178;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = rngFx.range(0.55, 1.5);
      m4.makeRotationY(rngFx.range(0, Math.PI * 2));
      m4.scale(new THREE.Vector3(s * 1.2, s * 0.62, s * 1.2));
      m4.setPosition(x, terrainHeight(x, z) - 0.02, z);
      tufts.setMatrixAt(i, m4);
      cTmp.setHSL(0.115 + rngFx.range(-0.015, 0.02), rngFx.range(0.26, 0.4), rngFx.range(0.34, 0.46));
      tufts.setColorAt(i, cTmp);
    }
    tufts.instanceMatrix.needsUpdate = true;
    tufts.frustumCulled = false;
    tufts.castShadow = false;
    this.group.add(tufts);
  }

  // ---------------- runtime
  setAlarm(on) { this.alarm = on; }

  setFloodAmount(v) {
    this.floodAmount = v;
    this.materials.lamp.emissiveIntensity = v * 3.2;
    this.floodGlowMat.opacity = v * 0.28;
    for (const s of this.floodSpots) s.intensity = v * 380;
    if (this.c2Light) this.c2Light.intensity = 1.1 + v * 1.3;
  }

  update(dt, t) {
    this.time = t;
    if (this.flagUniforms) {
      this.flagUniforms.uTime.value = t;
      this.flagUniforms.uWind.value = 0.7 + Math.sin(t * 0.31) * 0.3;
    }
    if (this.windsock) {
      this.windsock.rotation.y = Math.sin(t * 0.2) * 0.4 + 0.4;
      this.windsock.rotation.z = Math.sin(t * 2.2) * 0.05 - 0.12;
    }
    // beacons blink
    const blink = (Math.sin(t * 2.4) > 0.55) ? 1 : 0.08;
    this.beaconMat.opacity = blink;
    // alarm rotator
    if (this.alarm) {
      this.alarmPivot.rotation.y = t * 5.2;
      this.alarmBeamMat.opacity = 0.4;
      this.alarmLampMat.opacity = 0.85;
      this.alarmLight.intensity = 12 + Math.sin(t * 10.4) * 6;
    } else {
      this.alarmBeamMat.opacity = 0;
      this.alarmLampMat.opacity = 0.25;
      this.alarmLight.intensity = 0;
    }
  }
}
