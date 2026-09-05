import * as THREE from 'three';
import { treadImprint } from '../textures/vehicle.js';
import { SPEC as S } from './spec.js';
import { TYRE_TIP_RADIUS } from './wheels.js';

// ---------------------------------------------------------------------------
// Where the truck meets the dirt. One mesh, one draw call, three jobs:
//
//   1. a contact-occlusion blob under each tyre — tight and near-black at the
//      patch, gone within half a metre — so the tyre reads as pressing on the
//      ground even where the sun's shadow is soft or missing,
//   2. a wider, fainter occlusion pool under the whole chassis,
//   3. tyre tracks: a ring buffer of tread-imprint quads laid behind each wheel
//      as it rolls, fading out as the ring comes round to reuse them.
//
// Everything is world-space geometry that follows the terrain height sample by
// sample, multiply-blended over whatever the ground already is, so it darkens
// sunlit and shadowed dirt alike and can never lift a black or tint a highlight.
// Buffers are allocated once; the per-frame work is a handful of terrain
// lookups and one partial upload.
// ---------------------------------------------------------------------------

const SLOTS = 96; // track quads per wheel: about 29 m of trail at STEP
const STEP = 0.3; // metres rolled per quad
const TRACK_HALF = S.wheelWidth * 0.5 * 1.15;
const PITCH = (2 * Math.PI * TYRE_TIP_RADIUS) / 16; // one lug row along the ground
const BLOB_N = 4; // wheel blob grid, vertices a side
const BLOB_HW = 0.58; // half width, across the tyre
const BLOB_HL = 0.72; // half length, along the roll direction
// Kept on the running surface: the berm beside the trail rises a quarter of a
// metre, and a grid cell bridging road and berm dives under the dirt with a
// hard edge. Seven samples across put one on each rut and one on the crown.
const POOL_NX = 7;
const POOL_NZ = 9;
const POOL_HW = 1.15;
const POOL_HL = 2.75;
// Held just above the sampled surface; polygonOffset does the rest.
const LIFT_BLOB = 0.005;
const LIFT_POOL = 0.012;
const LIFT_TRACK = 0.004;
// A jump bigger than this between frames is a teleport, not driving.
const TELEPORT = 2.5;

const WHEELS = 4;
const BLOB_VERTS = BLOB_N * BLOB_N;
const POOL_VERTS = POOL_NX * POOL_NZ;
const DECAL_VERTS = WHEELS * BLOB_VERTS + POOL_VERTS;
const TRACK_BASE = DECAL_VERTS;
const TRACK_VERTS = WHEELS * SLOTS * 4;
const VERTS = DECAL_VERTS + TRACK_VERTS;

const KIND_BLOB = 0;
const KIND_TRACK = 1;
const KIND_POOL = 2;

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _wf = new THREE.Vector3();
const _wr = new THREE.Vector3();
const _hub = new THREE.Vector3();

export function createGroundContact() {
  const pos = new Float32Array(VERTS * 3);
  const uv = new Float32Array(VERTS * 2);
  const data = new Float32Array(VERTS * 4); // kind, strength, slot, wheel
  const index = [];

  // --- static layout -------------------------------------------------------
  for (let w = 0; w < WHEELS; w++) {
    const base = w * BLOB_VERTS;
    for (let j = 0; j < BLOB_N; j++) {
      for (let k = 0; k < BLOB_N; k++) {
        const v = base + j * BLOB_N + k;
        uv[v * 2] = -BLOB_HW + (2 * BLOB_HW * j) / (BLOB_N - 1);
        uv[v * 2 + 1] = -BLOB_HL + (2 * BLOB_HL * k) / (BLOB_N - 1);
        data[v * 4] = KIND_BLOB;
        data[v * 4 + 1] = 1;
        data[v * 4 + 3] = w;
        if (j < BLOB_N - 1 && k < BLOB_N - 1) {
          index.push(v, v + BLOB_N, v + 1, v + BLOB_N, v + BLOB_N + 1, v + 1);
        }
      }
    }
  }
  const poolBase = WHEELS * BLOB_VERTS;
  for (let j = 0; j < POOL_NX; j++) {
    for (let k = 0; k < POOL_NZ; k++) {
      const v = poolBase + j * POOL_NZ + k;
      uv[v * 2] = -POOL_HW + (2 * POOL_HW * j) / (POOL_NX - 1);
      uv[v * 2 + 1] = -POOL_HL + (2 * POOL_HL * k) / (POOL_NZ - 1);
      data[v * 4] = KIND_POOL;
      data[v * 4 + 1] = 1;
      if (j < POOL_NX - 1 && k < POOL_NZ - 1) {
        index.push(v, v + POOL_NZ, v + 1, v + POOL_NZ, v + POOL_NZ + 1, v + 1);
      }
    }
  }
  for (let w = 0; w < WHEELS; w++) {
    for (let s = 0; s < SLOTS; s++) {
      const v = TRACK_BASE + (w * SLOTS + s) * 4;
      for (let c = 0; c < 4; c++) {
        data[(v + c) * 4] = KIND_TRACK;
        data[(v + c) * 4 + 1] = 0; // unlaid until the wheel has rolled here
        data[(v + c) * 4 + 2] = s;
        data[(v + c) * 4 + 3] = w;
      }
      index.push(v, v + 1, v + 2, v, v + 2, v + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const aUv = new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage);
  const aData = new THREE.BufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', aPos);
  geo.setAttribute('uv', aUv);
  geo.setAttribute('aData', aData);
  geo.setIndex(index);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

  const mat = new THREE.ShaderMaterial({
    name: 'groundContact',
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uMap: { value: null },
        uHead: { value: new THREE.Vector4() },
        // Occlusion is not black: what reaches the dirt under a truck is bounce
        // off the underbody and off the soil itself, which is warm and dim.
        uShade: { value: new THREE.Color(0.3, 0.26, 0.24) },
        // Compressed damp laterite: darker and a shade more saturated than the
        // loose fines around it.
        uRut: { value: new THREE.Color(0.5, 0.39, 0.34) },
      },
    ]),
    vertexShader: /* glsl */ `
      attribute vec4 aData;
      varying vec2 vUv;
      varying vec4 vData;
      varying float vFogDepth;
      void main() {
        vUv = uv;
        vData = aData;
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec4 uHead;
      uniform vec3 uShade, uRut;
      uniform vec3 fogColor;
      uniform float fogDensity;
      varying vec2 vUv;
      varying vec4 vData;
      varying float vFogDepth;
      float rrect( vec2 p, vec2 h ) {
        vec2 q = abs( p ) - h;
        return length( max( q, 0.0 ) ) + min( max( q.x, q.y ), 0.0 );
      }
      void main() {
        vec3 m = vec3( 1.0 );
        if ( vData.x < 0.5 ) {
          // Wheel blob. uv is metres from the patch centre, x across, y along
          // the roll. The tread leaves the ground slowly along the roll, so the
          // occlusion reaches further that way.
          vec2 p = vec2( vUv.x, vUv.y * 0.7 );
          float d = rrect( p, vec2( 0.175, 0.11 ) );
          float crease = 1.0 - smoothstep( 0.0, 0.05, d );
          float pen = exp( -d * 8.0 );
          float occ = clamp( crease * 0.45 + pen * 0.6, 0.0, 1.0 );
          float box = 1.0 - smoothstep( 0.68, 1.0, max( abs( vUv.x ) / ${BLOB_HW.toFixed(3)}, abs( vUv.y ) / ${BLOB_HL.toFixed(3)} ) );
          occ *= box * vData.y;
          m = mix( vec3( 1.0 ), uShade, occ );
        } else if ( vData.x < 1.5 ) {
          // Track. Fades as the ring comes round to overwrite it, so a quad
          // never pops out; a parked truck keeps its tracks.
          float head = vData.w < 0.5 ? uHead.x : vData.w < 1.5 ? uHead.y : vData.w < 2.5 ? uHead.z : uHead.w;
          float age = mod( head - 1.0 - vData.z + ${SLOTS.toFixed(1)}, ${SLOTS.toFixed(1)} ) / ${SLOTS.toFixed(1)};
          float fade = ( 1.0 - smoothstep( 0.68, 0.98, age ) ) * vData.y;
          if ( fade < 0.003 ) discard;
          vec4 t = texture2D( uMap, vUv );
          m = mix( vec3( 1.0 ), uRut, t.r * fade * 0.9 );
          // soil squeezed up at the edges and between the block prints catches
          // the light: the one thing that reads as relief at a grazing angle
          m *= 1.0 + t.g * fade * 0.3;
          m *= 1.0 - ( t.b - 0.5 ) * 0.14 * fade;
        } else {
          // Chassis pool: the sky shut out under 1.8 m of truck at half a metre.
          float d = rrect( vUv, vec2( 0.75, 2.25 ) );
          float occ = exp( -d * 3.6 ) * 0.34;
          float box = 1.0 - smoothstep( 0.7, 1.0, max( abs( vUv.x ) / ${POOL_HW.toFixed(3)}, abs( vUv.y ) / ${POOL_HL.toFixed(3)} ) );
          occ *= box * vData.y;
          m = mix( vec3( 1.0 ), uShade, occ );
        }
        float fogFactor = 1.0 - exp( -fogDensity * fogDensity * vFogDepth * vFogDepth );
        m = mix( m, vec3( 1.0 ), fogFactor );
        // Premultiplied multiply resolves to dst * ( 1 - a + rgb ); with a = 1
        // that is a straight multiply by m.
        gl_FragColor = vec4( m, 1.0 );
      }`,
    transparent: true,
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
    fog: true,
  });
  mat.uniforms.uMap.value = treadImprint();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'groundContact';
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  // The AO prepass swaps every material for a MeshNormalMaterial, which would
  // draw these as solid quads floating over the dirt and hand GTAO a hard black
  // rectangle to render. Same trap the terrain's stone shadows hit.
  mesh.onBeforeRender = (renderer, scene, camera, geometry, material) => {
    if (material.isMeshNormalMaterial) geometry.setDrawRange(0, 0);
  };
  mesh.onAfterRender = (renderer, scene, camera, geometry, material) => {
    if (material.isMeshNormalMaterial) geometry.setDrawRange(0, Infinity);
  };

  // --- per-wheel track state ------------------------------------------------
  const track = [];
  for (let w = 0; w < WHEELS; w++) {
    track.push({ has: false, x: 0, z: 0, lx: 0, ly: 0, lz: 0, rx: 0, ry: 0, rz: 0, along: 0, head: 0 });
  }
  const head = mat.uniforms.uHead.value;

  // Update ranges without allocating: three's addUpdateRange pushes a fresh
  // object per call and empties the list after each upload, so one persistent
  // range per attribute is re-pushed each frame and the tracks laid between
  // two renders are merged into a second one. A clear has to reach the GPU as
  // a whole-buffer upload, which the upload callback confirms.
  const attrs = [aPos, aUv, aData];
  const decalRange = { start: 0, count: DECAL_VERTS * 3 };
  const trackRange = attrs.map(() => ({ start: 0, count: 0 }));
  let pendingFull = false;
  aData.onUpload(() => {
    pendingFull = false;
  });
  const touch = (k, start, count) => {
    const a = attrs[k];
    const r = trackRange[k];
    if (!a.updateRanges.includes(r)) {
      r.start = start;
      r.count = count;
      a.updateRanges.push(r);
    } else {
      const end = Math.max(r.start + r.count, start + count);
      r.start = Math.min(r.start, start);
      r.count = end - r.start;
    }
    a.needsUpdate = true;
  };

  function clearTracks() {
    for (let w = 0; w < WHEELS; w++) {
      track[w].has = false;
      track[w].head = 0;
      track[w].along = 0;
    }
    for (let v = TRACK_BASE; v < VERTS; v++) data[v * 4 + 1] = 0;
    head.set(0, 0, 0, 0);
    pendingFull = true;
    aData.needsUpdate = true;
  }

  const put = (v, x, y, z) => {
    pos[v * 3] = x;
    pos[v * 3 + 1] = y;
    pos[v * 3 + 2] = z;
  };

  // the frame's terrain lookup and fallbacks, held here so nothing closes over
  // them per frame
  let fHeightAt = null;
  let fContacts = null;
  let fY = 0;
  const groundAt = (x, z, i) => {
    if (fHeightAt) {
      const h = fHeightAt(x, z);
      if (Number.isFinite(h)) return h;
    }
    const c = fContacts?.[i];
    return c && Number.isFinite(c.y) ? c.y : fY;
  };

  /**
   * @param frame {
   *   pos, quat        the truck root's world position and orientation
   *   wheels           SPEC.wheelPositions with steer flags
   *   suspension       per-wheel hub offset from rest, metres
   *   steer            front axle steer angle
   *   contacts         the driver's sampled patches, { wx, wz, y }, as a fallback
   *   heightAt(x, z)   terrain height, or null
   * }
   */
  function update(dt, { pos: p, quat, wheels, suspension, steer = 0, contacts = null, heightAt = null }) {
    _fwd.set(0, 0, 1).applyQuaternion(quat);
    _right.set(1, 0, 0).applyQuaternion(quat);
    _up.set(0, 1, 0).applyQuaternion(quat);
    fHeightAt = heightAt;
    fContacts = contacts;
    fY = p.y;

    // a teleport (the capture harness resetting the truck) is not a drive
    let jumped = false;
    for (let i = 0; i < WHEELS; i++) {
      const w = wheels[i];
      const t = track[i];
      const hx = p.x + _right.x * w.x + _fwd.x * w.z;
      const hz = p.z + _right.z * w.x + _fwd.z * w.z;
      if (t.has && Math.hypot(hx - t.x, hz - t.z) > TELEPORT) jumped = true;
    }
    if (jumped) clearTracks();

    for (let i = 0; i < WHEELS; i++) {
      const w = wheels[i];
      const sy = S.axleY + (suspension?.[i] ?? 0);
      _hub.set(p.x + _right.x * w.x + _up.x * sy + _fwd.x * w.z, 0, p.z + _right.z * w.x + _up.z * sy + _fwd.z * w.z);
      // the patch is straight below the hub along the truck's own down
      const cx = _hub.x - _up.x * S.axleY;
      const cz = _hub.z - _up.z * S.axleY;
      const sa = w.steer ? steer : 0;
      const cs = Math.cos(sa);
      const sn = Math.sin(sa);
      _wf.set(_fwd.x * cs + _right.x * sn, 0, _fwd.z * cs + _right.z * sn);
      _wr.set(_right.x * cs - _fwd.x * sn, 0, _right.z * cs - _fwd.z * sn);

      // --- occlusion blob, re-laid on the terrain every frame ---------------
      const base = i * BLOB_VERTS;
      for (let j = 0; j < BLOB_N; j++) {
        const u = -BLOB_HW + (2 * BLOB_HW * j) / (BLOB_N - 1);
        for (let k = 0; k < BLOB_N; k++) {
          const v = -BLOB_HL + (2 * BLOB_HL * k) / (BLOB_N - 1);
          const x = cx + _wr.x * u + _wf.x * v;
          const z = cz + _wr.z * u + _wf.z * v;
          put(base + j * BLOB_N + k, x, groundAt(x, z, i) + LIFT_BLOB, z);
        }
      }

      // --- tracks ------------------------------------------------------------
      const t = track[i];
      if (!t.has) {
        t.has = true;
        t.x = cx;
        t.z = cz;
        t.lx = cx - _wr.x * TRACK_HALF;
        t.lz = cz - _wr.z * TRACK_HALF;
        t.ly = groundAt(t.lx, t.lz, i) + LIFT_TRACK;
        t.rx = cx + _wr.x * TRACK_HALF;
        t.rz = cz + _wr.z * TRACK_HALF;
        t.ry = groundAt(t.rx, t.rz, i) + LIFT_TRACK;
        continue;
      }
      const dx = cx - t.x;
      const dz = cz - t.z;
      const d = Math.hypot(dx, dz);
      if (d < STEP) continue;
      // right of travel, so a reversing wheel lays its quads the other way up
      const px = dz / d;
      const pz = -dx / d;
      const flx = cx - px * TRACK_HALF;
      const flz = cz - pz * TRACK_HALF;
      const frx = cx + px * TRACK_HALF;
      const frz = cz + pz * TRACK_HALF;
      const fly = groundAt(flx, flz, i) + LIFT_TRACK;
      const fry = groundAt(frx, frz, i) + LIFT_TRACK;
      const v0 = t.along / PITCH;
      const v1 = (t.along + d) / PITCH;
      const vert = TRACK_BASE + (i * SLOTS + t.head) * 4;
      put(vert, t.lx, t.ly, t.lz);
      put(vert + 1, t.rx, t.ry, t.rz);
      put(vert + 2, frx, fry, frz);
      put(vert + 3, flx, fly, flz);
      uv[vert * 2] = 0;
      uv[vert * 2 + 1] = v0;
      uv[(vert + 1) * 2] = 1;
      uv[(vert + 1) * 2 + 1] = v0;
      uv[(vert + 2) * 2] = 1;
      uv[(vert + 2) * 2 + 1] = v1;
      uv[(vert + 3) * 2] = 0;
      uv[(vert + 3) * 2 + 1] = v1;
      for (let c = 0; c < 4; c++) data[(vert + c) * 4 + 1] = 1;
      touch(0, vert * 3, 12);
      touch(1, vert * 2, 8);
      touch(2, vert * 4, 16);
      t.head = (t.head + 1) % SLOTS;
      t.along += d;
      t.x = cx;
      t.z = cz;
      t.lx = flx;
      t.ly = fly;
      t.lz = flz;
      t.rx = frx;
      t.ry = fry;
      t.rz = frz;
    }
    head.set(track[0].head, track[1].head, track[2].head, track[3].head);

    // --- chassis pool ------------------------------------------------------
    for (let j = 0; j < POOL_NX; j++) {
      const u = -POOL_HW + (2 * POOL_HW * j) / (POOL_NX - 1);
      for (let k = 0; k < POOL_NZ; k++) {
        const v = -POOL_HL + (2 * POOL_HL * k) / (POOL_NZ - 1);
        const x = p.x + _right.x * u + _fwd.x * v;
        const z = p.z + _right.z * u + _fwd.z * v;
        let y;
        if (heightAt) {
          y = groundAt(x, z, 0);
        } else {
          // no terrain to ask: the plane through the four patches
          const tx = THREE.MathUtils.clamp(0.5 - u / (2 * S.trackHalf), 0, 1);
          const tz = THREE.MathUtils.clamp(0.5 - v / S.wheelbase, 0, 1);
          const f = THREE.MathUtils.lerp(groundAt(x, z, 0), groundAt(x, z, 1), tx);
          const r = THREE.MathUtils.lerp(groundAt(x, z, 2), groundAt(x, z, 3), tx);
          y = THREE.MathUtils.lerp(f, r, tz);
        }
        put(poolBase + j * POOL_NZ + k, x, y + LIFT_POOL, z);
      }
    }

    if (!aPos.updateRanges.includes(decalRange)) aPos.updateRanges.push(decalRange);
    aPos.needsUpdate = true;
    // an empty range list is a whole-buffer upload
    if (pendingFull) for (const a of attrs) a.updateRanges.length = 0;
  }

  return { mesh, material: mat, update, clear: clearTracks };
}
