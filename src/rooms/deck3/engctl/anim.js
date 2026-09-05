// Animated emitters for the engineering rooms: every moving light needs a visible emitter that moves
// with it, and every animated mesh is a draw call. This module gives a room ONE extra mesh for all of
// its animated emissive pieces (plus any static emitter keys it chooses to fold in, so the room can
// trade a kit key for the animated mesh and stay at 16 calls).
//
// Geometry is still kit-bashed: a room adds pieces with `kit.add(animKey(MODE.X, {...}), geo, opts)`
// exactly like a normal material key (placement, vertex-colour tint, UVs all handled by the Kit).
// `buildAnimatedEmitters` then pulls those virtual keys — and any `adopt`ed real emitter keys — out of
// `kit.groups` before the Kit builds, stamps per-vertex animation attributes on them and merges them
// into one mesh with a cloned emissive material whose shader reads a single `uTime` uniform. Rooms
// mirror the same functions in JS (`anim.*`) for the light descriptors that pair with the emitters, so
// lamp and light never drift apart.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const MODE = {
  STEADY: 0, // constant (adopted static emitters)
  PULSE: 1, // reactor core breathing: base * animPulse(t)
  CHASE: 2, // comet running through discrete steps: phase = step position (0..1), rate = cycles/s
  SWEEP: 3, // comet running round a ring: phase from the fragment's angle about aux.xz, rate = rev/s
  FLICKER: 4, // faulty fixture: irregular, seeded by phase
  BLINK: 5, // hard on/off: rate = Hz, phase = offset, aux.x = duty
  CHARGE: 6, // hyperdrive coil ring: phase = ring position fore→aft (0..1) in the 12 s sequence
  BEAD: 7, // hyperdrive slot strip: energy bead travels along z with the sequence; aux = [z0, length]
  SWING: 8, // gauge needle: rotate about aux (pivot, xy plane) by rate*sin(...)
  FAINT: 9, // faint content flicker (0.9..1.0), seeded by phase
  BURST: 10, // housing disc: pulses at the end of each hyperdrive sequence
};

const PREFIX = "anim:";

/** Virtual kit key. params: { phase, base, rate, aux:[x,y,z] } — the tint comes from the kit `color` opt. */
export function animKey(mode, { phase = 0, base = 1, rate = 0, aux = [0, 0, 0] } = {}) {
  return PREFIX + JSON.stringify([mode, phase, base, rate, aux]);
}

const GLSL_FUNCS = /* glsl */ `
uniform float uTime;
float animPulse(float t) { return 1.0 + 0.108 * sin(t * 1.3) + 0.027 * sin(t * 4.1); }
float animFlicker(float t, float seed) {
  float s = 0.5 + 0.3 * sin(t * 9.1 + seed) + 0.2 * sin(t * 23.7 + seed * 1.7) + 0.25 * sin(t * 3.3 + seed * 0.4);
  return 0.08 + 0.92 * smoothstep(0.25, 0.6, s);
}
float animBlink(float t, float rate, float phase, float duty) {
  float c = fract(t * rate + phase);
  return 0.1 + 0.9 * smoothstep(0.0, 0.05, c) * (1.0 - smoothstep(duty - 0.05, duty, c));
}
float animSeq(float t) { return mod(t, 12.0); }
float animCharge(float seq, float p) { return smoothstep(p * 6.0, p * 6.0 + 0.5, seq) * (1.0 - smoothstep(9.0, 10.2, seq)); }
float animBurst(float seq) {
  float e = clamp(seq - 6.0, 0.0, 3.5);
  return step(6.0, seq) * (1.0 - step(9.5, seq)) * exp(-e * 0.7) * (0.55 + 0.45 * sin(e * 9.42));
}
float animSwing(float t, float phase) { return sin(t * 2.5 + phase * 6.2831853) + 0.3 * sin(t * 6.1 + phase * 12.566371); }
`;

// JS mirrors of the shader functions (same formulas) for the light descriptors paired with the emitters.
const smoothstep = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const fract = (x) => x - Math.floor(x);
export const anim = {
  pulse: (t) => 1 + 0.108 * Math.sin(t * 1.3) + 0.027 * Math.sin(t * 4.1),
  flicker: (t, seed) => {
    const s = 0.5 + 0.3 * Math.sin(t * 9.1 + seed) + 0.2 * Math.sin(t * 23.7 + seed * 1.7) + 0.25 * Math.sin(t * 3.3 + seed * 0.4);
    return 0.08 + 0.92 * smoothstep(0.25, 0.6, s);
  },
  blink: (t, rate, phase, duty = 0.5) => {
    const c = fract(t * rate + phase);
    return 0.1 + 0.9 * smoothstep(0, 0.05, c) * (1 - smoothstep(duty - 0.05, duty, c));
  },
  seq: (t) => t - 12 * Math.floor(t / 12),
  charge: (seq, p) => smoothstep(p * 6, p * 6 + 0.5, seq) * (1 - smoothstep(9.0, 10.2, seq)),
  burst: (seq) => {
    const e = Math.min(3.5, Math.max(0, seq - 6));
    return (seq >= 6 && seq < 9.5 ? 1 : 0) * Math.exp(-e * 0.7) * (0.55 + 0.45 * Math.sin(e * 9.42));
  },
  swing: (t, phase) => Math.sin(t * 2.5 + phase * 6.2831853) + 0.3 * Math.sin(t * 6.1 + phase * 12.566371),
  // bead position along a BEAD strip (0..1) and its visibility during the travel leg
  bead: (seq) => ({ pos: Math.min(1, seq / 6), on: 1 - smoothstep(5.9, 6.4, seq) }),
};

function stamp(geo, mode, phase, base, rate, aux, tint) {
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 4);
  const x = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 4] = phase;
    a[i * 4 + 1] = mode;
    a[i * 4 + 2] = base;
    a[i * 4 + 3] = rate;
    x[i * 3] = aux[0];
    x[i * 3 + 1] = aux[1];
    x[i * 3 + 2] = aux[2];
  }
  geo.setAttribute("aAnim", new THREE.BufferAttribute(a, 4));
  geo.setAttribute("aAux", new THREE.BufferAttribute(x, 3));
  if (tint) {
    // adopted static emitters: the material's emissive colour times the kit's per-piece tint (a
    // `faceColor` on a lamp face survives the merge), since the merged material's emissive is white
    const c = geo.attributes.color;
    for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * tint.r, c.getY(i) * tint.g, c.getZ(i) * tint.b);
  }
}

/**
 * Collect the room's virtual `anim:` keys (and the static emitter keys in `adopt`) from the kit and
 * build the single animated emitter mesh. Call at the end of detail(), before the rig runs kit.build().
 * Returns { mesh, material, uniforms } — set `uniforms.uTime.value = t` in update().
 */
export function buildAnimatedEmitters(ctx, { adopt = [] } = {}) {
  const { kit, materials } = ctx;
  const geos = [];
  for (const [key, list] of [...kit.groups]) {
    if (!key.startsWith(PREFIX)) continue;
    const [mode, phase, base, rate, aux] = JSON.parse(key.slice(PREFIX.length));
    for (const g of list) {
      stamp(g, mode, phase, base, rate, aux, null);
      geos.push(g);
    }
    kit.groups.delete(key);
  }
  for (const key of adopt) {
    const list = kit.groups.get(key);
    if (!list) continue;
    const m = materials[key];
    const tint = m && m.emissive ? m.emissive : new THREE.Color(0xffffff);
    const base = m && m.emissiveIntensity != null ? m.emissiveIntensity : 1;
    for (const g of list) {
      stamp(g, MODE.STEADY, 0, base, 0, [0, 0, 0], tint);
      geos.push(g);
    }
    kit.groups.delete(key);
  }
  if (!geos.length) return null;
  const merged = mergeGeometries(geos, false);
  merged.computeBoundingSphere();
  const uniforms = { uTime: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.5, metalness: 0, vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aAnim; attribute vec3 aAux; varying vec4 vAnim; varying vec3 vAux; varying vec3 vAPos;\n" + GLSL_FUNCS)
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        vAnim = aAnim;
        vAux = aAux;
        vAPos = position;
        if (aAnim.y > 7.5 && aAnim.y < 8.5) {
          float th = aAnim.w * animSwing(uTime, aAnim.x);
          vec2 p = transformed.xy - aAux.xy;
          transformed.xy = aAux.xy + vec2(cos(th) * p.x - sin(th) * p.y, sin(th) * p.x + cos(th) * p.y);
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec4 vAnim; varying vec3 vAux; varying vec3 vAPos;\n" + GLSL_FUNCS)
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
        {
          float aM = vAnim.y;
          float aP = vAnim.x;
          float aB = vAnim.z;
          float aR = vAnim.w;
          if (aM < 0.5) {
          } else if (aM < 1.5) {
            aB *= animPulse(uTime);
          } else if (aM < 2.5) {
            float d = fract(uTime * aR - aP);
            aB *= 0.3 + 0.7 * pow(1.0 - d, 6.0);
          } else if (aM < 3.5) {
            float ph = fract(atan(vAPos.z - vAux.z, vAPos.x - vAux.x) / 6.2831853);
            float d = fract(uTime * aR - ph);
            aB *= 0.12 + 1.4 * pow(1.0 - d, 5.0);
          } else if (aM < 4.5) {
            aB *= animFlicker(uTime, aP * 37.0);
          } else if (aM < 5.5) {
            aB *= animBlink(uTime, aR, aP, vAux.x);
          } else if (aM < 6.5) {
            float seq = animSeq(uTime);
            float lit = animCharge(seq, aP);
            float flash = exp(-pow((seq - (aP * 6.0 + 0.5)) * 3.0, 2.0));
            aB *= 0.18 + 0.82 * lit + 0.3 * lit * flash;
          } else if (aM < 7.5) {
            float seq = animSeq(uTime);
            float ph = (vAPos.z - vAux.x) / vAux.y;
            float travel = clamp(seq / 6.0, 0.0, 1.0);
            float bead = exp(-pow((ph - travel) * 18.0, 2.0)) * (1.0 - smoothstep(5.9, 6.4, seq));
            aB *= 0.55 + 1.2 * bead;
          } else if (aM < 8.5) {
          } else if (aM < 9.5) {
            float s = 0.5 + 0.5 * sin(uTime * 7.0 + aP * 40.0) * sin(uTime * 2.3 + aP * 9.0);
            aB *= 0.9 + 0.1 * s;
          } else {
            aB *= 1.0 + 0.9 * animBurst(animSeq(uTime));
          }
          totalEmissiveRadiance *= vColor.rgb * aB;
        }`,
      );
  };
  material.customProgramCacheKey = () => "engineering-anim-emitters";
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = "anim_emitters";
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  ctx.group.add(mesh);
  return { mesh, material, uniforms };
}
