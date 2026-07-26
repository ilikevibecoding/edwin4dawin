import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { dustPuff } from './textures/ground.js';

// ---------------------------------------------------------------------------
// Dust kicked up by the rear tyres. A fixed pool of soft billboards recycled
// oldest-first, so there is zero allocation once it is warm.
// ---------------------------------------------------------------------------

export function createWheelDust({ max = 260 } = {}) {
  const positions = new Float32Array(max * 3);
  const data = new Float32Array(max * 4); // age, life, size, seed
  const vel = new Float32Array(max * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aData', new THREE.BufferAttribute(data, 4));
  geo.setDrawRange(0, 0);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: dustPuff() },
      uColor: { value: new THREE.Color(PALETTE.dirtLight) },
      uSun: { value: new THREE.Color(PALETTE.sunColorLow) },
      uOpacity: { value: 0.55 },
      uFog: { value: new THREE.Color(PALETTE.fogColor) },
      uFogDensity: { value: 0.0082 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aData;
      varying float vLife;
      varying float vSeed;
      varying float vDepth;
      void main() {
        float life = clamp( aData.x / aData.y, 0.0, 1.0 );
        vLife = life;
        vSeed = aData.w;
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        vDepth = -mv.z;
        float grow = mix( 0.35, 1.0, pow( life, 0.55 ) );
        gl_PointSize = aData.z * grow * 620.0 / max( vDepth, 0.2 );
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor, uSun, uFog;
      uniform float uOpacity, uFogDensity;
      varying float vLife;
      varying float vSeed;
      varying float vDepth;
      void main() {
        vec2 uv = gl_PointCoord;
        // rotate each puff a little so the pool does not look stamped
        float s = sin( vSeed * 6.28 ), c = cos( vSeed * 6.28 );
        uv = vec2( c * ( uv.x - 0.5 ) - s * ( uv.y - 0.5 ), s * ( uv.x - 0.5 ) + c * ( uv.y - 0.5 ) ) + 0.5;
        vec4 t = texture2D( uMap, uv );
        float fade = smoothstep( 0.0, 0.12, vLife ) * ( 1.0 - smoothstep( 0.35, 1.0, vLife ) );
        float a = t.a * fade * uOpacity;
        if ( a < 0.004 ) discard;
        vec3 col = mix( uColor, uSun, 0.35 ) * ( 0.65 + t.r * 0.6 );
        float fogFactor = 1.0 - exp( -uFogDensity * uFogDensity * vDepth * vDepth );
        col = mix( col, uFog, fogFactor );
        gl_FragColor = vec4( col, a );
      }`,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;

  let head = 0;
  let live = 0;
  let emitAccum = 0;

  function spawn(x, y, z, speed, dir) {
    const i = head;
    head = (head + 1) % max;
    live = Math.min(live + 1, max);
    positions[i * 3] = x + (Math.random() - 0.5) * 0.22;
    positions[i * 3 + 1] = y + Math.random() * 0.1;
    positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.22;
    const back = 0.35 + Math.random() * 0.5;
    vel[i * 3] = -dir.x * speed * back * 0.12 + (Math.random() - 0.5) * 0.7;
    vel[i * 3 + 1] = 0.5 + Math.random() * 0.9;
    vel[i * 3 + 2] = -dir.z * speed * back * 0.12 + (Math.random() - 0.5) * 0.7;
    data[i * 4] = 0;
    data[i * 4 + 1] = 1.5 + Math.random() * 1.5;
    data[i * 4 + 2] = 0.5 + Math.random() * 0.9;
    data[i * 4 + 3] = Math.random();
  }

  /** @param wheels array of world-space contact points */
  function update(dt, { contacts = [], speed = 0, heading = 0 } = {}) {
    const rate = THREE.MathUtils.clamp((Math.abs(speed) - 1.2) * 7, 0, 70);
    emitAccum += rate * dt;
    const dir = { x: Math.sin(heading), z: Math.cos(heading) };
    while (emitAccum >= 1 && contacts.length) {
      emitAccum -= 1;
      const c = contacts[Math.floor(Math.random() * contacts.length)];
      spawn(c.x, c.y, c.z, Math.abs(speed), dir);
    }
    for (let i = 0; i < max; i++) {
      if (data[i * 4 + 1] <= 0) continue;
      data[i * 4] += dt;
      if (data[i * 4] > data[i * 4 + 1]) {
        data[i * 4 + 1] = 0;
        data[i * 4 + 2] = 0;
        continue;
      }
      vel[i * 3] *= 1 - dt * 1.5;
      vel[i * 3 + 1] += (0.35 - vel[i * 3 + 1]) * dt * 1.1;
      vel[i * 3 + 2] *= 1 - dt * 1.5;
      positions[i * 3] += vel[i * 3] * dt;
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    geo.setDrawRange(0, max);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aData.needsUpdate = true;
  }

  function clear() {
    for (let i = 0; i < max; i++) {
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
    }
    geo.attributes.aData.needsUpdate = true;
  }

  return { points, update, clear, spawn };
}
