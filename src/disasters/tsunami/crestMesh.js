// Voxel crest: the visible wave. A strip of unit cells around the front line is rebuilt on the CPU whenever the front
// moves half a block. Each cell is a column of water blocks standing on the street (or porch step) and reaching the
// wave profile - a 1..depth staircase behind the foot, then a foamy lip that rises above the flood surface - and is
// clipped by the world: walls, fences and awnings cut it (the wave wraps around facades instead of sliding through
// them). Water the chunk mesh already shows is not drawn again (only what stands above it), so the strip covers
// exactly the relight/remesh lag of the real water plus the part of the wave that stands above the flood level.
// The faces are plain block faces (water tile; snow tile for the foam of the toe, the lip and the churn on the
// stairs) lit by the world light, one draw call.
import * as THREE from 'three';
import { BLOCKS, B } from '../../blocks.js';
import { tileUV, TILES } from '../../textures.js';
import { SHARED } from '../../entityMaterial.js';
import { hash2 } from '../../rng.js';

export const STEP_DIST = 0.75;   // the water behind the crest gains one block of depth per STEP_DIST blocks
export const CREST_BACK = 14;    // blocks behind the front covered by the strip
const LIP_LEN = 5.5;             // length of the breaking lip (blocks) behind the staircase
const AHEAD = 1.5;               // cells this far ahead of the front are still considered
const VIEW = 130;                // cells farther than this from the camera are not built (beyond the fog)
const MAX_QUADS = 24000;
const FLOATS_PER_VERT = 9;       // pos 3, uv 2, light 2, shade 1, foam 1
const K_NONE = 0, K_DRAWN = 1, K_SOLID = 2, K_COVERED = 3;
const SHADE_X = 0.6, SHADE_Z = 0.8, SHADE_TOP = 1.0;
const INSET = 0.012;

// Wave profile: water depth in blocks above street level `behind` blocks behind the front (unquantised).
// 0 ahead of the foot; a 1..depth staircase over (depth-1)*STEP_DIST blocks; then the lip rises `lip` blocks above
// the flood surface as a hump and falls back to the flood level, which the strip keeps to its back edge.
export function crestDepth(behind, depth, lip) {
  if (behind < 0) return 0;
  const stair = Math.max(0, depth - 1) * STEP_DIST;
  if (behind < stair) return Math.min(depth, 1 + behind / STEP_DIST);
  if (behind < stair + LIP_LEN) return depth + lip * Math.sin(Math.PI * (behind - stair) / LIP_LEN);
  return depth;
}

const VERT = /* glsl */ `
attribute vec2 aLight;
attribute float aShade;
attribute float aFoam;
varying vec2 vUv; varying vec2 vLight; varying float vShade; varying float vFoam; varying float vDist;
void main() {
  vUv = uv; vLight = aLight; vShade = aShade; vFoam = aFoam;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
// Foam is the water tile blended toward the white tile (same atlas tile size, so the second sample is an offset),
// so foamy faces still show the water's streaks instead of turning into snow blocks.
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
uniform float uAlpha; uniform vec3 uTint; uniform vec2 uFoamOff;
varying vec2 vUv; varying vec2 vLight; varying float vShade; varying float vFoam; varying float vDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec3 water = texture2D(map, vUv).rgb * uTint;
  vec3 foam = texture2D(map, vUv + uFoamOff).rgb * vec3(0.96, 0.98, 1.0);
  float sky = lightCurve(vLight.x) * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = mix(water, foam, vFoam) * light * vShade;
  float a = mix(0.82, 0.95, vFoam) * uAlpha;
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDist));
  gl_FragColor = vec4(col, a);
}`;

export class VoxelCrest {
  constructor(scene, atlas, world, manager) {
    this.scene = scene; this.world = world; this.m = manager;
    const [wu, wv, ws] = tileUV(TILES.water ?? 0), [su, sv] = tileUV(TILES.snow ?? 0);
    this.wu = wu; this.wv = wv; this.ts = ws; this.su = su; this.sv = sv;
    this.data = new Float32Array(MAX_QUADS * 4 * FLOATS_PER_VERT);
    const idx = new Uint32Array(MAX_QUADS * 6);
    for (let q = 0, k = 0; q < MAX_QUADS; q++) { const v = q * 4; idx[k++] = v; idx[k++] = v + 1; idx[k++] = v + 2; idx[k++] = v; idx[k++] = v + 2; idx[k++] = v + 3; }
    const geo = new THREE.BufferGeometry();
    const buf = new THREE.InterleavedBuffer(this.data, FLOATS_PER_VERT);
    buf.setUsage(THREE.DynamicDrawUsage);
    this.buffer = buf;
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 3, 0));
    geo.setAttribute('uv', new THREE.InterleavedBufferAttribute(buf, 2, 3));
    geo.setAttribute('aLight', new THREE.InterleavedBufferAttribute(buf, 2, 5));
    geo.setAttribute('aShade', new THREE.InterleavedBufferAttribute(buf, 1, 7));
    geo.setAttribute('aFoam', new THREE.InterleavedBufferAttribute(buf, 1, 8));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: atlas }, uAlpha: { value: 1 }, uTint: { value: new THREE.Vector3(0.88, 0.93, 1.0) },
        uFoamOff: { value: new THREE.Vector2(su - wu, sv - wv) },
        uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.FrontSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 11;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.quads = 0;
    this.lastS = -1e9; this.lastTime = -1e9; this.lastCamX = 0; this.lastCamZ = 0;
    // strip grid scratch (rows along the travel axis x columns across it)
    this.nv = Math.ceil(CREST_BACK + AHEAD) + 4;
    this.nb = 2 * VIEW + 4;
    this.kind = new Uint8Array(this.nv * this.nb);
    this.lo = new Int16Array(this.nv * this.nb);
    this.hi = new Int16Array(this.nv * this.nb);
    this.foam = new Uint8Array(this.nv * this.nb);
    this.lightS = new Float32Array(this.nv * this.nb);
    this.lightB = new Float32Array(this.nv * this.nb);
    this.chunkState = new Map();
    this.cellCount = 0;
  }

  // Per frame. st: { s, cx, cz, dx, dz, r, baseY, depth, lip, time, camX, camZ, alpha, paused }
  update(dt, st) {
    if (st.alpha < 0.01) { this.mesh.visible = false; return; }
    this.material.uniforms.uAlpha.value = st.alpha;
    const camMoved = Math.abs(st.camX - this.lastCamX) + Math.abs(st.camZ - this.lastCamZ) > 3;
    if (Math.abs(st.s - this.lastS) >= 0.5 || st.time - this.lastTime >= 0.14 || camMoved || !this.mesh.visible) {
      this.lastS = st.s; this.lastTime = st.time; this.lastCamX = st.camX; this.lastCamZ = st.camZ;
      this.build(st);
    }
    this.mesh.visible = this.quads > 0;
  }

  build(st) {
    const world = this.world, kind = this.kind, lo = this.lo, hi = this.hi, foam = this.foam;
    const { s, cx, cz, dx, dz, r, baseY, depth, lip, time, camX, camZ } = st;
    const fx = Math.floor(cx), fz = Math.floor(cz);
    const k = s - r;
    const halfLen = Math.sqrt(Math.max(0, r * r - k * k)) + 2;
    const camB = -(camX - cx) * dz + (camZ - cz) * dx;
    const bLo = Math.max(Math.floor(-halfLen - 1), Math.floor(camB - VIEW)), bHi = Math.min(Math.ceil(halfLen + 1), Math.ceil(camB + VIEW));
    const nb = bHi - bLo + 1;
    if (nb <= 0) { this.quads = 0; this.geo.setDrawRange(0, 0); return; }
    // rows: a (offset along the travel axis from the disc centre) such that behind(a) is within [-AHEAD, CREST_BACK]
    const aHi = Math.ceil(s - r + AHEAD + 1), aLo = Math.floor(s - r - CREST_BACK - 1);
    const nv = Math.min(this.nv, aHi - aLo + 1);
    const nbUsed = Math.min(this.nb, nb);
    const stride = nbUsed;
    const r2 = (r + 1) * (r + 1), view2 = VIEW * VIEW;
    const tq = Math.floor(time * 1.5), tf = time * 1.5 - tq;
    this.chunkState.clear();
    kind.fill(K_NONE, 0, nv * stride);
    // pass 1: classify every cell of the strip
    for (let v = 0; v < nv; v++) {
      const a = aHi - v;
      for (let u = 0; u < nbUsed; u++) {
        const b = bLo + u, idx = v * stride + u;
        const x = fx + a * dx - b * dz, z = fz + a * dz + b * dx;
        const ex = x + 0.5 - cx, ez = z + 0.5 - cz;
        if (ex * ex + ez * ez > r2) continue;
        const dcx = x + 0.5 - camX, dcz = z + 0.5 - camZ;
        if (dcx * dcx + dcz * dcz > view2) continue;
        const behind = s - (ex * dx + ez * dz + r);
        if (behind < -AHEAD || behind > CREST_BACK) continue;
        // per-column wobble (drifts slowly) so the front is jagged in whole blocks rather than a straight line; never
        // negative, so the drawn staircase always stands at or above the real water placed by the simulation
        const w0 = hash2(b, tq, 91), w1 = hash2(b, tq + 1, 91);
        const wob = (w0 + (w1 - w0) * tf) * 1.3;
        const hv = Math.floor(crestDepth(behind + wob, depth, lip) + 0.35);
        if (hv <= 0) continue;
        const topY = baseY + hv - 1;
        // floor: highest solid at or below street level + 1 (porch steps count); nothing within 5 -> a pit, skip
        let floorY = baseY - 6;
        for (let y = baseY + 1; y >= baseY - 5; y--) if (BLOCKS[world.getBlock(x, y, z)].solid) { floorY = y; break; }
        if (floorY < baseY - 5) continue;
        const from = floorY + 1;
        if (from > topY) continue;
        if (BLOCKS[world.getBlock(x, from, z)].solid) {
          // blocked at its base (wall, fence post, furniture): record the top of the solid run so faces of the
          // neighbouring water columns are only drawn above it
          let top = from;
          while (top < topY + 3 && BLOCKS[world.getBlock(x, top + 1, z)].solid) top++;
          kind[idx] = K_SOLID; lo[idx] = from; hi[idx] = top;
          continue;
        }
        let ceil = topY;
        for (let y = from + 1; y <= topY; y++) if (BLOCKS[world.getBlock(x, y, z)].solid) { ceil = y - 1; break; }
        lo[idx] = from; hi[idx] = ceil;
        // foam: the breaking lip (2), a patchy white toe where the bore meets the street (3), churn on the stairs (1)
        const isLip = hv > depth, isToe = behind + wob < STEP_DIST * 1.6;
        const fm = isLip ? 2 : isToe ? (hash2(x, z, tq + 3) < 0.7 ? 3 : 0) : (behind < (depth - 1) * STEP_DIST + 1.5 && hash2(x, z, tq + 7) < 0.3 ? 1 : 0);
        // water the chunk mesh already shows: draw only what stands above it (the whole column when a relight or
        // remesh is pending, so the strip covers the lag), keeping a foam top on the toe and the lip
        if (world.getBlock(x, from, z) === B.WATER && this._chunkCurrent(x, z)) {
          let shown = from;
          while (shown < ceil && world.getBlock(x, shown + 1, z) === B.WATER) shown++;
          if (shown >= ceil && fm === 0) { kind[idx] = K_COVERED; continue; }
          lo[idx] = shown + 1;
        }
        kind[idx] = K_DRAWN;
        foam[idx] = fm;
        const l = world.sampleLight(x, Math.min(ceil + 1, topY + 1), z);
        this.lightS[idx] = Math.max(l[0], 0.25); this.lightB[idx] = l[1];
      }
    }
    // pass 2: faces
    this.quads = 0;
    const data = this.data;
    let q = 0;
    const push = (px, py, pz, uu, vv, ls, lb, sh, fm) => {
      const o = q * FLOATS_PER_VERT;
      data[o] = px; data[o + 1] = py; data[o + 2] = pz; data[o + 3] = uu; data[o + 4] = vv; data[o + 5] = ls; data[o + 6] = lb; data[o + 7] = sh; data[o + 8] = fm;
      q++;
    };
    const ts = this.ts;
    for (let v = 0; v < nv && this.quads < MAX_QUADS - 8; v++) {
      const a = aHi - v;
      for (let u = 0; u < nbUsed; u++) {
        const idx = v * stride + u;
        if (kind[idx] !== K_DRAWN) continue;
        const b = bLo + u;
        const x = fx + a * dx - b * dz, z = fz + a * dz + b * dx;
        const cLo = lo[idx], cHi = hi[idx], ls = this.lightS[idx], lb = this.lightB[idx], fm = foam[idx];
        // foam amount: the lip is nearly white, the toe and the churn on the stairs frothy (varied per cell)
        const topFoam = fm === 2 ? 0.85 : fm === 3 ? 0.5 + 0.3 * hash2(x, z, 5) : fm === 1 ? 0.35 + 0.25 * hash2(x, z, 6) : 0;
        const tu = this.wu, tv = this.wv;
        const yTop = cHi + 0.9;
        // top face (+y), counter-clockwise seen from above
        push(x, yTop, z + 1, tu + INSET * ts, tv + (1 - INSET) * ts, ls, lb, SHADE_TOP, topFoam);
        push(x + 1, yTop, z + 1, tu + (1 - INSET) * ts, tv + (1 - INSET) * ts, ls, lb, SHADE_TOP, topFoam);
        push(x + 1, yTop, z, tu + (1 - INSET) * ts, tv + INSET * ts, ls, lb, SHADE_TOP, topFoam);
        push(x, yTop, z, tu + INSET * ts, tv + INSET * ts, ls, lb, SHADE_TOP, topFoam);
        this.quads++;
        // side faces where the neighbour column is lower
        for (let d = 0; d < 4; d++) {
          const nx = d === 0 ? 1 : d === 1 ? -1 : 0, nz = d === 2 ? 1 : d === 3 ? -1 : 0;
          const na = a + nx * dx + nz * dz, nbb = b - nx * dz + nz * dx;
          const nv2 = aHi - na, nu = nbb - bLo;
          let nHi;
          if (nv2 < 0 || nu < 0 || nu >= nbUsed) nHi = -1e4;                 // ahead of the front / beyond the sides: open
          else if (nv2 >= nv) nHi = 1e4;                                       // behind the strip: the flood continues, no wall
          else {
            const nk = kind[nv2 * stride + nu];
            nHi = nk === K_NONE ? -1e4 : hi[nv2 * stride + nu];
          }
          if (nHi >= cHi) continue;
          const yFrom = Math.max(cLo, nHi + 1);
          const shade = nx !== 0 ? SHADE_X : SHADE_Z;
          for (let y = yFrom; y <= cHi && this.quads < MAX_QUADS; y++) {
            const y1 = y === cHi ? yTop : y + 1;
            // froth runs down the top block of the lip and the toe, fading out toward its base
            const fTop = fm >= 2 && y === cHi ? topFoam * 0.9 : 0, fBot = fTop * 0.25;
            const vTop = tv + INSET * ts, vBot = tv + (INSET + (1 - 2 * INSET) * (y1 - y)) * ts;
            const u0 = tu + INSET * ts, u1 = tu + (1 - INSET) * ts;
            if (d === 0) {        // +x face
              push(x + 1, y, z + 1, u0, vBot, ls, lb, shade, fBot); push(x + 1, y, z, u1, vBot, ls, lb, shade, fBot);
              push(x + 1, y1, z, u1, vTop, ls, lb, shade, fTop); push(x + 1, y1, z + 1, u0, vTop, ls, lb, shade, fTop);
            } else if (d === 1) { // -x face
              push(x, y, z, u0, vBot, ls, lb, shade, fBot); push(x, y, z + 1, u1, vBot, ls, lb, shade, fBot);
              push(x, y1, z + 1, u1, vTop, ls, lb, shade, fTop); push(x, y1, z, u0, vTop, ls, lb, shade, fTop);
            } else if (d === 2) { // +z face
              push(x, y, z + 1, u0, vBot, ls, lb, shade, fBot); push(x + 1, y, z + 1, u1, vBot, ls, lb, shade, fBot);
              push(x + 1, y1, z + 1, u1, vTop, ls, lb, shade, fTop); push(x, y1, z + 1, u0, vTop, ls, lb, shade, fTop);
            } else {              // -z face
              push(x + 1, y, z, u0, vBot, ls, lb, shade, fBot); push(x, y, z, u1, vBot, ls, lb, shade, fBot);
              push(x, y1, z, u1, vTop, ls, lb, shade, fTop); push(x + 1, y1, z, u0, vTop, ls, lb, shade, fTop);
            }
            this.quads++;
          }
        }
      }
    }
    this.geo.setDrawRange(0, this.quads * 6);
    if (this.quads > 0) {
      this.buffer.clearUpdateRanges();
      this.buffer.addUpdateRange(0, this.quads * 4 * FLOATS_PER_VERT);
      this.buffer.needsUpdate = true;
    }
  }

  // The chunk's mesh shows its current blocks (no relight pending, not dirty)
  _chunkCurrent(x, z) {
    const key = this.world.chunkKeyAt(x, z);
    let cur = this.chunkState.get(key);
    if (cur === undefined) {
      const c = this.world.chunks.get(key);
      const pending = this.m.pendingRelight && this.m.pendingRelight.has(key);
      cur = !!(c && c.generated && c.meshed && !c.dirty && !c.needsRelight && !pending) && !this.m.touched.has(key);
      this.chunkState.set(key, cur);
    }
    return cur;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geo.dispose();
    this.material.dispose();
  }
}
