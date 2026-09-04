// Module-local materials for sys-traffic (manifest.materials(shared) -> {key: Material}).
// One vertex-coloured PBR material serves every fighter and every rack clamp; the shuttle gets a variant
// with a per-instance wing/ramp fold channel evaluated in the vertex shader (one draw call, no bones).
// Effects (engine glow, tractor beams, beacons) are small additive ShaderMaterials. No canvas textures.
import * as THREE from "three";
import { SHUTTLE_SPEC } from "./craft.js";

const FOLD_DEFINES = () => {
  const s = SHUTTLE_SPEC;
  return `
#define TR_HINGE_X ${s.hingeX.toFixed(4)}
#define TR_HINGE_Y ${s.hingeY.toFixed(4)}
#define TR_SPREAD ${s.spreadAngle.toFixed(4)}
#define TR_FOLDED ${s.foldedAngle.toFixed(4)}
#define TR_RAMP_Y ${s.rampHingeY.toFixed(4)}
#define TR_RAMP_Z ${s.rampHingeZ.toFixed(4)}
#define TR_RAMP_ANGLE ${s.rampAngle.toFixed(4)}
`;
};

// Vertex-shader fold: parts 1/2 are the starboard/port wings (rotate about a z-parallel hinge through
// (±TR_HINGE_X, TR_HINGE_Y)), part 3 is the boarding ramp (rotate about an x-parallel hinge). aFold is a
// per-instance attribute: 0 = wings spread for flight, ramp closed; 1 = wings folded up, ramp down.
const FOLD_FUNCS = /* glsl */ `
attribute float aPart;
attribute float aFold;
vec3 trFold(vec3 p, bool isPoint) {
  float f = clamp(aFold, 0.0, 1.0);
  if (aPart > 0.5 && aPart < 2.5) {
    float side = aPart < 1.5 ? 1.0 : -1.0;
    float ang = mix(TR_SPREAD, TR_FOLDED, f) * side;
    float c = cos(ang), s = sin(ang);
    vec3 h = isPoint ? vec3(side * TR_HINGE_X, TR_HINGE_Y, 0.0) : vec3(0.0);
    vec3 q = p - h;
    return h + vec3(c * q.x - s * q.y, s * q.x + c * q.y, q.z);
  }
  if (aPart > 2.5) {
    float ang = TR_RAMP_ANGLE * f;
    float c = cos(ang), s = sin(ang);
    vec3 h = isPoint ? vec3(0.0, TR_RAMP_Y, TR_RAMP_Z) : vec3(0.0);
    vec3 q = p - h;
    return h + vec3(q.x, c * q.y - s * q.z, s * q.y + c * q.z);
  }
  return p;
}
`;

/**
 * Vertex-coloured PBR craft material with a baked emissive channel (attribute aEmit, vec3 radiance) and,
 * for the shuttle, the fold channel above. `roughness`/`metalness` tuned for dark hangar light: mostly
 * dielectric so the hull reads grey under the pool lights instead of mirroring a black environment.
 */
export function makeCraftMaterial({ fold = false, emitScale = 1.0 } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.28,
    envMapIntensity: 0.55,
    fog: false,
  });
  mat.name = fold ? "trafficShuttle" : "trafficHull";
  mat.customProgramCacheKey = () => "traffic-craft-" + (fold ? "fold" : "plain");
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uEmitScale = { value: emitScale };
    mat.userData.shader = shader;
    let vs = shader.vertexShader;
    vs = "attribute vec3 aEmit;\nvarying vec3 vTrEmit;\n" + (fold ? FOLD_DEFINES() + FOLD_FUNCS : "") + vs;
    vs = vs.replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n" + (fold ? "objectNormal = trFold(objectNormal, false);\n" : ""));
    vs = vs.replace("#include <begin_vertex>", "#include <begin_vertex>\nvTrEmit = aEmit;\n" + (fold ? "transformed = trFold(transformed, true);\n" : ""));
    shader.vertexShader = vs;
    let fs = shader.fragmentShader;
    fs = "uniform float uEmitScale;\nvarying vec3 vTrEmit;\n" + fs;
    fs = fs.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vTrEmit * uEmitScale;\n");
    shader.fragmentShader = fs;
  };
  return mat;
}

/** Additive billboard quads for engine glow. Per-instance size = instanceMatrix scale, colour*intensity = instanceColor. */
export function makeGlowMaterial() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vCol;
      void main() {
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float s = length(instanceMatrix[0].xyz);
        float depth = max(0.1, -c.z);
        // never shrink below ~5 px so a patrol fighter 3 km out still reads as a moving light
        float size = max(s, depth * 0.0075);
        c.xy += position.xy * size;
        gl_Position = projectionMatrix * c;
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #else
          vCol = vec3(1.0);
        #endif
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vCol;
      void main() {
        vec2 d = vUv * 2.0 - 1.0;
        float r = length(d);
        float halo = pow(max(0.0, 1.0 - r), 2.4);
        float core = pow(max(0.0, 1.0 - r * 2.6), 1.6);
        gl_FragColor = vec4(vCol * (halo * 0.55 + core * 1.4), 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: false,
  });
  mat.name = "trafficGlow";
  return mat;
}

/**
 * Tractor beam: one mesh, four unit cones (attribute aCone 0..3). The vertex shader stretches each cone
 * from its emitter to the shared target; the fragment shader adds a soft rim, scanlines that travel
 * toward the craft and a slow pulse. uOn scales everything to zero when idle.
 */
export function makeBeamMaterial() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uEmit: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
      uTarget: { value: new THREE.Vector3() },
      uOn: { value: 0 },
      uTime: { value: 0 },
      // outer halo cone radii (emitter end, craft end) and the bright inner core radii
      uR0: { value: 1.0 },
      uR1: { value: 3.6 },
      uC0: { value: 0.12 },
      uC1: { value: 0.5 },
      uColor: { value: new THREE.Color(0.46, 0.7, 1.0) },
    },
    vertexShader: /* glsl */ `
      attribute float aCone;
      uniform vec3 uEmit[4];
      uniform vec3 uTarget;
      uniform float uR0;
      uniform float uR1;
      uniform float uC0;
      uniform float uC1;
      varying float vAlong;
      varying float vLen;
      varying float vCore;
      varying vec3 vN;
      varying vec3 vWorld;
      void main() {
        int i = int(mod(aCone + 0.5, 4.0));
        float core = aCone > 3.5 ? 1.0 : 0.0;
        vec3 e = uEmit[i];
        vec3 axis = uTarget - e;
        float L = max(0.01, length(axis));
        vec3 d = axis / L;
        vec3 up = abs(d.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 p1 = normalize(cross(d, up));
        vec3 p2 = cross(d, p1);
        float r = core > 0.5 ? mix(uC0, uC1, position.y) : mix(uR0, uR1, position.y);
        vec3 radial = p1 * position.x + p2 * position.z;
        vec3 w = e + d * (position.y * L) + radial * r;
        vAlong = position.y;
        vLen = L;
        vCore = core;
        vN = normalize(radial);
        vWorld = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOn;
      uniform float uTime;
      uniform vec3 uColor;
      varying float vAlong;
      varying float vLen;
      varying float vCore;
      varying vec3 vN;
      varying vec3 vWorld;
      void main() {
        vec3 v = normalize(cameraPosition - vWorld);
        float facing = abs(dot(normalize(vN), v));
        // halo: a translucent fill that thickens toward the silhouette (front + back faces add up, so the
        // cone reads as a hazy volume); core: solid bright thread
        float rim = 1.0 - facing;
        float halo = 0.12 + 0.5 * pow(rim, 1.5);
        float body = mix(halo, 1.0, vCore);
        float ends = smoothstep(0.0, 0.04, vAlong) * mix(1.0, 0.45, vAlong);
        float scan = 0.74 + 0.26 * sin((vAlong * vLen / 2.4 - uTime * 3.2) * 6.2831853);
        float fine = 0.88 + 0.12 * sin((vAlong * vLen / 0.55 - uTime * 9.0) * 6.2831853);
        float pulse = 0.9 + 0.1 * sin(uTime * 5.5);
        float a = uOn * body * ends * scan * fine * pulse * mix(0.3, 0.5, vCore);
        gl_FragColor = vec4(uColor * a, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: false,
  });
  mat.name = "trafficBeam";
  return mat;
}

/** Additive point sprites for beacons / landing lights. size attribute in metres, clamped to >= 2 px. */
export function makeBeaconMaterial() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 420.0 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uScale;
      varying vec3 vColor;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float depth = max(0.5, -mv.z);
        gl_PointSize = clamp(aSize * uScale / depth, 2.0, 36.0);
        vColor = aColor;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        vec2 d = gl_PointCoord * 2.0 - 1.0;
        float r = length(d);
        float a = smoothstep(1.0, 0.1, r);
        gl_FragColor = vec4(vColor * a, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  mat.name = "trafficBeacon";
  return mat;
}

export function makeTrafficMaterials(shared) {
  return {
    trafficHull: makeCraftMaterial({ fold: false, emitScale: 1.0 }),
    trafficShuttle: makeCraftMaterial({ fold: true, emitScale: 1.0 }),
    trafficGlow: makeGlowMaterial(),
    trafficBeam: makeBeamMaterial(),
    trafficBeacon: makeBeaconMaterial(),
  };
}
