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
export function makeCraftMaterial({ fold = false, emitScale = 1.0, roughness = 0.62, metalness = 0.28, envMapIntensity = 0.55 } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness,
    metalness,
    envMapIntensity,
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
        // gaussian falloff: a hot centre inside a wide soft halo, masked to zero before the quad's edge
        float core = exp(-r * r * 11.0);
        float halo = exp(-r * r * 2.2);
        float edge = smoothstep(1.0, 0.7, r);
        gl_FragColor = vec4(vCol * (core * 1.2 + halo * 0.6) * edge, 1.0);
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
 * Tractor beams + landing light: one mesh, nine unit cones (attribute aCone: 0..3 emitter halos, 4..7
 * emitter cores, 8 the landing-light cone). The vertex shader stretches each emitter cone from its emitter
 * to the shared target (and the landing cone between uLight0/uLight1). The fragment shader makes the cones
 * read as light rather than geometry: the body is brightest where the wall faces the camera (the eye looks
 * through the thickest part of the volume) and fades to nothing at the silhouette, it dims along the length
 * from the emitter toward the craft, and only the thin core keeps a bright focus on the target. Faint
 * scanlines travel toward the craft with a slow pulse. uOn / uLightOn scale each effect to zero when idle
 * (idle cones are clipped away in the vertex shader).
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
      uR1: { value: 2.8 },
      uC0: { value: 0.12 },
      uC1: { value: 0.5 },
      uColor: { value: new THREE.Color(0.46, 0.7, 1.0) },
      // landing-light cone: endpoints, radii (lamp end, far end), gate and warm colour
      uLight0: { value: new THREE.Vector3() },
      uLight1: { value: new THREE.Vector3() },
      uL0: { value: 0.3 },
      uL1: { value: 4.5 },
      uLightOn: { value: 0 },
      uLightColor: { value: new THREE.Color(1.0, 0.9, 0.72) },
    },
    vertexShader: /* glsl */ `
      attribute float aCone;
      uniform vec3 uEmit[4];
      uniform vec3 uTarget;
      uniform float uR0;
      uniform float uR1;
      uniform float uC0;
      uniform float uC1;
      uniform float uOn;
      uniform vec3 uLight0;
      uniform vec3 uLight1;
      uniform float uL0;
      uniform float uL1;
      uniform float uLightOn;
      varying float vAlong;
      varying float vLen;
      varying float vKind;
      varying vec3 vN;
      varying vec3 vAxis;
      varying vec3 vWorld;
      void main() {
        // kind: 0 emitter halo, 1 emitter core, 2 landing light
        float kind = aCone > 7.5 ? 2.0 : (aCone > 3.5 ? 1.0 : 0.0);
        float gate = kind > 1.5 ? uLightOn : uOn;
        if (gate <= 0.0005) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          vAlong = 0.0; vLen = 1.0; vKind = kind; vN = vec3(0.0, 1.0, 0.0); vAxis = vec3(0.0, 1.0, 0.0); vWorld = vec3(0.0);
          return;
        }
        int i = int(mod(aCone + 0.5, 4.0));
        vec3 e = kind > 1.5 ? uLight0 : uEmit[i];
        vec3 axis = (kind > 1.5 ? uLight1 : uTarget) - e;
        float L = max(0.01, length(axis));
        vec3 d = axis / L;
        vec3 up = abs(d.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 p1 = normalize(cross(d, up));
        vec3 p2 = cross(d, p1);
        float r = kind > 1.5 ? mix(uL0, uL1, position.y) : (kind > 0.5 ? mix(uC0, uC1, position.y) : mix(uR0, uR1, position.y));
        vec3 radial = p1 * position.x + p2 * position.z;
        vec3 w = e + d * (position.y * L) + radial * r;
        vAlong = position.y;
        vLen = L;
        vKind = kind;
        vN = normalize(radial);
        vAxis = d;
        vWorld = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOn;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uLightOn;
      uniform vec3 uLightColor;
      varying float vAlong;
      varying float vLen;
      varying float vKind;
      varying vec3 vN;
      varying vec3 vAxis;
      varying vec3 vWorld;
      void main() {
        vec3 v = normalize(cameraPosition - vWorld);
        // soft body: the wall is brightest where it faces the camera (the eye looks through the thickest
        // part of the cone) and fades to nothing at the silhouette, so there is no geometric edge. Looking
        // along the axis every wall fragment is edge-on, so a floor keeps the beam visible end-on.
        float facing = abs(dot(normalize(vN), v));
        float axial = abs(dot(vAxis, v));
        float soft = mix(pow(facing, 1.6), 0.5, pow(axial, 6.0));
        if (vKind > 1.5) {
          // landing light: warm translucent cone, brightest near the lamp, fading out toward the far end,
          // with the same flicker as the landing-light beacon
          float ends = smoothstep(0.0, 0.05, vAlong) * (1.0 - 0.9 * vAlong);
          float flick = 0.86 + 0.14 * sin(uTime * 23.0) * sin(uTime * 7.3);
          float a = uLightOn * soft * ends * flick * 0.16;
          gl_FragColor = vec4(uLightColor * a, 1.0);
          return;
        }
        // along the beam: bright at the emitter where the shaft is narrow, dimming toward the craft where the
        // four halos overlap; the halo fades out over its last 12 % so its end ring never shows, while the
        // core runs all the way in and brightens into the focus on the target
        float start = smoothstep(0.0, 0.05, vAlong);
        float haloAlong = mix(1.0, 0.3, vAlong) * (1.0 - smoothstep(0.88, 1.0, vAlong));
        float focus = 1.0 + 1.5 * smoothstep(0.75, 1.0, vAlong);
        float coreAlong = mix(0.6, 1.0, vAlong) * focus;
        float halo = soft * haloAlong * 0.14;
        float core = soft * coreAlong * 0.24;
        // faint scanlines travel toward the craft (3.2 m period) with a slow pulse
        float scan = 0.85 + 0.15 * sin((vAlong * vLen / 3.2 - uTime * 2.6) * 6.2831853);
        float pulse = 0.92 + 0.08 * sin(uTime * 5.5);
        float a = uOn * mix(halo, core, vKind) * start * scan * pulse;
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
    // fighters + clamps: dark tints, a little rougher and less env sheen so near-black cells stay black
    trafficHull: makeCraftMaterial({ fold: false, emitScale: 1.0, roughness: 0.78, metalness: 0.15, envMapIntensity: 0.35 }),
    trafficShuttle: makeCraftMaterial({ fold: true, emitScale: 1.0 }),
    trafficGlow: makeGlowMaterial(),
    trafficBeam: makeBeamMaterial(),
    trafficBeacon: makeBeaconMaterial(),
  };
}
