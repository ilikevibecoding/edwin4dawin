import * as THREE from 'three';
import { FOG, PALETTE } from './palette.js';
import { sunDirection } from './sky.js';
import { reportWheelContacts } from './terrain.js';
import { dustPuff } from './textures/ground.js';

/**
 * The puff sprite is a 2x2 atlas. Mipmapping it averages all four cells
 * together at the smaller mips, which makes every sprite resolve into a solid
 * dark square — the plume renders as a cloud of hard-edged shards. Dust is soft
 * and low contrast, so dropping the mip chain costs nothing here.
 */
let _atlas = null;
function dustAtlas() {
  if (_atlas) return _atlas;
  const tex = dustPuff().clone();
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  _atlas = tex;
  return tex;
}
import { SPEC } from './vehicle/spec.js';

// ---------------------------------------------------------------------------
// Dust kicked up by the rear tyres.
//
// Three roles out of one pool and one draw call: the rising plume that trails
// behind the truck, a low sheet that hugs the ground right at the contact
// patch, and coarse grit thrown backwards on a ballistic arc. Instanced quads
// rather than gl_Points, because a two metre puff three metres from the lens
// blows straight past the point-size cap and gets clipped the moment its
// centre leaves the frame.
//
// The pool is fixed and recycled oldest-first, so nothing allocates once warm.
// ---------------------------------------------------------------------------

const PLUME = 0;
const SHEET = 1;
const GRIT = 2;

export function createWheelDust({ max = 560 } = {}) {
  const pos = new Float32Array(max * 3);
  const vel = new Float32Array(max * 3);
  const data = new Float32Array(max * 4); // age, life, size, seed
  const extra = new Float32Array(max * 2); // ground height reference, role

  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3),
  );
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const iPos = new THREE.InstancedBufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const iData = new THREE.InstancedBufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage);
  const iExtra = new THREE.InstancedBufferAttribute(extra, 2).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', iPos);
  geo.setAttribute('iData', iData);
  geo.setAttribute('iExtra', iExtra);
  geo.instanceCount = max;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: dustAtlas() },
      uSunDir: { value: sunDirection() },
      // Dust is dirt in the air, lit by the same key and sky as the ground it
      // came off. The trail underneath it is now damp compacted earth rather
      // than pale dust, so the plume is the *lighter* element and its hue is
      // what has to carry it: a warm ochre tan reads as fines, the same value
      // in a neutral grey reads as exhaust smoke.
      uSunCol: { value: new THREE.Color(0xe8c290).multiplyScalar(0.78) },
      uShadeCol: { value: new THREE.Color(0x8a6f52).multiplyScalar(0.3) },
      uFog: { value: new THREE.Color(PALETTE.fogColor) },
      uFogDensity: { value: FOG.density },
      // low enough that the truck and the road stay visible through the plume:
      // a hundred overlapping billboards at any more than this stack up into a
      // solid smoke bank rather than dust
      uOpacity: { value: 0.24 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 iPos;
      attribute vec4 iData;
      attribute vec2 iExtra;
      uniform vec3 uSunDir;
      varying vec2 vUv;
      varying float vFade;
      varying float vErode;
      varying float vDepth;
      varying float vScatter;
      varying float vAbove;
      void main() {
        if ( iData.y <= 0.0 ) {
          // dead slot: park the quad outside the clip volume
          gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
          vUv = vec2( 0.0 );
          vFade = 0.0;
          vErode = 1.0;
          vDepth = 1.0;
          vScatter = 0.0;
          vAbove = 1.0;
          return;
        }
        float life = clamp( iData.x / iData.y, 0.0, 1.0 );
        float seed = iData.w;
        float role = iExtra.y;

        // a puff expands as it dissipates; grit does not
        float grow = mix( mix( 0.5, 1.0, sqrt( life ) ), 1.0, step( 1.5, role ) );
        float size = iData.z * grow;

        float ang = seed * 6.2831 + life * mix( -0.7, 0.7, fract( seed * 31.0 ) );
        float s = sin( ang );
        float c = cos( ang );
        vec2 off = vec2( c * position.x - s * position.y, s * position.x + c * position.y ) * size;

        vec4 mv = viewMatrix * vec4( iPos, 1.0 );
        mv.xy += off;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;

        // one of four atlas cells; grit always takes the last one
        vec2 cellSel = role > 1.5
          ? vec2( 1.0, 1.0 )
          : vec2( step( 0.5, fract( seed * 7.3 ) ), step( 0.5, fract( seed * 17.1 ) ) );
        vUv = cellSel * 0.5 + ( uv * 0.984 + 0.008 ) * 0.5;

        // a long tail: the plume has to thin out over a 20 m trail, not fade
        // out in the first two metres and leave a blob behind the truck
        vFade = smoothstep( 0.0, 0.06, life ) * ( 1.0 - smoothstep( 0.15, 1.0, life ) );
        vErode = mix( 0.06, 0.8, sqrt( life ) );

        // forward scattering: dust looking into the sun is far brighter than
        // dust the sun is behind the camera for
        vec3 toCam = normalize( cameraPosition - iPos );
        vScatter = clamp( dot( -toCam, uSunDir ), 0.0, 1.0 );

        // world height of this corner, so the sprite can fade out where it
        // would otherwise be sliced by the ground it is sitting on
        float worldY = iPos.y + off.x * viewMatrix[ 1 ][ 0 ] + off.y * viewMatrix[ 1 ][ 1 ];
        vAbove = worldY - iExtra.x;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uSunCol, uShadeCol, uFog;
      uniform float uFogDensity, uOpacity;
      varying vec2 vUv;
      varying float vFade;
      varying float vErode;
      varying float vDepth;
      varying float vScatter;
      varying float vAbove;
      void main() {
        vec4 t = texture2D( uMap, vUv );
        // erode the alpha threshold up as the puff ages, so it comes apart
        // instead of dimming uniformly
        float a = smoothstep( vErode, vErode + 0.55, t.a ) * vFade * uOpacity;
        a *= smoothstep( -0.12, 0.3, vAbove );
        if ( a < 0.004 ) discard;
        vec3 col = mix( uShadeCol, uSunCol, 0.3 + vScatter * vScatter * 0.7 );
        col *= 0.68 + t.r * 0.55;
        float fogFactor = 1.0 - exp( -uFogDensity * uFogDensity * vDepth * vDepth );
        col = mix( col, uFog, fogFactor );
        gl_FragColor = vec4( col, a );
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'wheelDust';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;

  let head = 0;
  const accum = [0, 0, 0];

  function alloc() {
    // oldest-first: walk forward to the next dead slot, else evict the head
    for (let n = 0; n < max; n++) {
      const i = (head + n) % max;
      if (data[i * 4 + 1] <= 0) {
        head = (i + 1) % max;
        return i;
      }
    }
    const i = head;
    head = (head + 1) % max;
    return i;
  }

  const rnd = () => Math.random();

  function spawn(role, c, sp, f, r) {
    const i = alloc();
    const lat = (rnd() - 0.5) * (role === SHEET ? 1.1 : 0.55);
    const back = role === GRIT ? 0.1 + rnd() * 0.2 : 0.1 + rnd() * 0.6;
    pos[i * 3] = c.x + r.x * lat - f.x * back;
    pos[i * 3 + 2] = c.z + r.z * lat - f.z * back;
    const jx = (rnd() - 0.5) * 0.8;
    const jz = (rnd() - 0.5) * 0.8;
    if (role === PLUME) {
      pos[i * 3 + 1] = c.y + 0.08 + rnd() * 0.22;
      const kick = 0.2 + rnd() * 0.5;
      vel[i * 3] = -f.x * sp * kick * 0.34 + jx + r.x * lat * 0.9;
      vel[i * 3 + 1] = 0.55 + rnd() * 1.1;
      vel[i * 3 + 2] = -f.z * sp * kick * 0.34 + jz + r.z * lat * 0.9;
      data[i * 4 + 1] = 1.7 + rnd() * 1.6;
      data[i * 4 + 2] = 0.95 + rnd() * 1.15;
    } else if (role === SHEET) {
      pos[i * 3 + 1] = c.y + 0.05 + rnd() * 0.1;
      vel[i * 3] = -f.x * sp * 0.16 + jx * 1.6 + r.x * lat * 2.4;
      vel[i * 3 + 1] = 0.1 + rnd() * 0.24;
      vel[i * 3 + 2] = -f.z * sp * 0.16 + jz * 1.6 + r.z * lat * 2.4;
      data[i * 4 + 1] = 0.85 + rnd() * 0.8;
      data[i * 4 + 2] = 0.5 + rnd() * 0.6;
    } else {
      pos[i * 3 + 1] = c.y + 0.05;
      vel[i * 3] = -f.x * sp * 0.55 + jx * 2.2;
      vel[i * 3 + 1] = 1.4 + rnd() * 2.6;
      vel[i * 3 + 2] = -f.z * sp * 0.55 + jz * 2.2;
      data[i * 4 + 1] = 0.5 + rnd() * 0.5;
      data[i * 4 + 2] = 0.05 + rnd() * 0.11;
    }
    data[i * 4] = 0;
    data[i * 4 + 3] = rnd();
    extra[i * 2] = c.y;
    extra[i * 2 + 1] = role;
  }

  const _f = { x: 0, z: 1 };
  const _r = { x: 1, z: 0 };
  const patches = [];

  /** @param wheels array of world-space contact points, rear axle */
  function update(dt, { contacts = [], speed = 0, heading = 0 } = {}) {
    dt = THREE.MathUtils.clamp(dt, 1e-4, 0.1);
    const sp = Math.abs(speed);
    _f.x = Math.sin(heading);
    _f.z = Math.cos(heading);
    _r.x = _f.z;
    _r.z = -_f.x;

    // main.js only forwards the rear contact points, so step the known
    // wheelbase forward to recover the front pair for the terrain shader
    patches.length = 0;
    for (const c of contacts) {
      const gy = c.y - 0.06;
      patches.push({ x: c.x, y: gy, z: c.z, strength: 1 });
      patches.push({
        x: c.x + _f.x * SPEC.wheelbase,
        y: gy,
        z: c.z + _f.z * SPEC.wheelbase,
        strength: 0.85,
      });
    }
    reportWheelContacts(patches);

    const rate = THREE.MathUtils.clamp((sp - 0.8) * 11, 0, 95);
    const rates = [rate, rate * 0.3, rate * 0.26];
    for (let role = 0; role < 3; role++) {
      accum[role] += rates[role] * dt;
      while (accum[role] >= 1) {
        accum[role] -= 1;
        if (!contacts.length) {
          accum[role] = 0;
          break;
        }
        spawn(role, contacts[(Math.random() * contacts.length) | 0], sp, _f, _r);
      }
    }

    for (let i = 0; i < max; i++) {
      const life = data[i * 4 + 1];
      if (life <= 0) continue;
      const age = (data[i * 4] += dt);
      if (age > life) {
        data[i * 4 + 1] = 0;
        continue;
      }
      const role = extra[i * 2 + 1];
      if (role === GRIT) {
        vel[i * 3 + 1] -= 11 * dt;
        vel[i * 3] *= 1 - dt * 0.9;
        vel[i * 3 + 2] *= 1 - dt * 0.9;
      } else {
        const drag = role === SHEET ? 2.6 : 1.15;
        vel[i * 3] *= 1 - dt * drag;
        vel[i * 3 + 2] *= 1 - dt * drag;
        // the plume keeps drifting up slowly once the initial kick is gone
        const rise = role === SHEET ? 0.06 : 0.3;
        vel[i * 3 + 1] += (rise - vel[i * 3 + 1]) * dt * 1.4;
        // a hint of wind so the trail leans instead of standing straight up
        vel[i * 3] += 0.22 * dt;
        vel[i * 3 + 2] -= 0.14 * dt;
      }
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      // grit that has fallen back to the ground stops there and fades
      if (role === GRIT && pos[i * 3 + 1] < extra[i * 2] + 0.02) {
        pos[i * 3 + 1] = extra[i * 2] + 0.02;
        vel[i * 3 + 1] = 0;
        vel[i * 3] *= 0.4;
        vel[i * 3 + 2] *= 0.4;
      }
    }

    iPos.needsUpdate = true;
    iData.needsUpdate = true;
    iExtra.needsUpdate = true;
  }

  function clear() {
    for (let i = 0; i < max; i++) {
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
    }
    accum[0] = accum[1] = accum[2] = 0;
    iData.needsUpdate = true;
  }

  return { points: mesh, mesh, material: mat, update, clear, spawn };
}
