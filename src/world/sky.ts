import * as THREE from 'three';
import { GLSL_AERIAL, GLSL_ATMOS_UNIFORMS, GLSL_CLOUD_FIELD, GLSL_NOISE, GLSL_SKY } from '../render/shaders/common.glsl';
import type { Atmosphere } from './atmosphere';
import { createCloudNoiseTexture } from './noiseTexture';

const SKY_FRAG = /* glsl */ `
precision highp sampler3D;
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_SKY}
${GLSL_AERIAL}
uniform sampler3D uNoise3D;
uniform vec3 uCamPos;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform vec2 uResolution;
uniform float uCloudSteps;
uniform float uMoonPhase;
in vec2 vUv;

float cloudDensity(vec3 p, float cov) {
  float hf = (p.y - uCloudBase) / (uCloudTop - uCloudBase);
  float top = 0.45 + cov * 0.5;
  float vert = smoothstep(0.0, 0.08, hf) * (1.0 - smoothstep(top * 0.55, top, hf));
  if (vert <= 0.0) return 0.0;
  vec3 q = (p + vec3(uCloudWind.x, 0.0, uCloudWind.y)) * (1.0 / 1650.0);
  vec4 n = texture(uNoise3D, q);
  float shape = n.r;
  float d = cov * 1.35 * vert - 0.28;
  d -= (1.0 - shape) * 0.62;
  if (d <= 0.0) return 0.0;
  float detail = texture(uNoise3D, q * 4.7 + vec3(0.13, 0.31, 0.71)).g;
  d -= detail * 0.22 * (1.0 - smoothstep(0.0, 0.35, d));
  // wispier tops
  d *= 1.0 - 0.35 * smoothstep(0.6, 1.0, hf);
  return max(d, 0.0);
}

float lightMarch(vec3 p, float cov) {
  float stepLen = (uCloudTop - uCloudBase) * 0.22;
  float od = 0.0;
  for (int i = 0; i < 4; i++) {
    p += uSunDir * stepLen;
    if (p.y > uCloudTop) break;
    od += cloudDensity(p, cloudCoverage2D(p.xz)) * stepLen;
  }
  return exp(-od * 0.0075) * 0.9 + 0.1 * exp(-od * 0.0006);
}

float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }

vec3 stars(vec3 dir) {
  vec3 d = dir * 220.0;
  vec3 c = floor(d);
  float h = hash12(c.xy + c.z * 17.0);
  float star = smoothstep(0.985, 1.0, h) * step(0.15, dir.y);
  vec3 f = fract(d) - 0.5;
  star *= smoothstep(0.35, 0.0, length(f));
  return vec3(star) * (0.6 + 0.4 * hash12(c.zx));
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 clip = vec4(ndc, 1.0, 1.0);
  vec4 vpos = uInvProj * clip;
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);

  vec3 sky = skyRadiance(dir);
  sky += sunDisc(dir);
  // moon (opposite the sun-ish)
  vec3 moonDir = normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z));
  float cm = dot(dir, moonDir);
  float moon = smoothstep(0.99975, 0.99992, cm) * 1.6 + pow(max(cm, 0.0), 700.0) * 0.08;
  sky += vec3(0.75, 0.8, 0.95) * moon * uNight;
  sky += stars(dir) * uNight * 0.7;

  // ---- volumetric cloud layer
  float transmittance = 1.0;
  vec3 cloudCol = vec3(0.0);
  float ro_y = uCamPos.y;
  float t0 = -1.0, t1 = -1.0;
  float tb = (uCloudBase - ro_y) / dir.y;
  float tt = (uCloudTop - ro_y) / dir.y;
  if (ro_y < uCloudBase) { if (dir.y > 0.012) { t0 = tb; t1 = tt; } }
  else if (ro_y > uCloudTop) { if (dir.y < -0.012) { t0 = tt; t1 = tb; } }
  else { t0 = 0.0; t1 = dir.y > 0.0 ? tt : tb; }
  float maxDist = 42000.0;
  float meanDist = t0;
  if (t0 >= 0.0) {
    t1 = min(t1, maxDist);
    if (t1 > t0) {
      float steps = uCloudSteps;
      float dt = (t1 - t0) / steps;
      // static per-pixel jitter (never animated => temporally stable)
      float jitter = hash12(gl_FragCoord.xy) * dt;
      float t = t0 + jitter;
      float cosSun = dot(dir, uSunDir);
      float phase = hg(cosSun, 0.5) * 0.9 + hg(cosSun, -0.2) * 0.3 + 0.12;
      vec3 ambient = mix(uHorizonColor, uZenithColor, 0.45) * 1.05;
      vec3 sunLight = uSunColor * 2.6;
      float sigma = 0.011;
      float wsum = 0.0;
      meanDist = 0.0;
      for (int i = 0; i < 40; i++) {
        if (float(i) >= steps || transmittance < 0.015) break;
        vec3 p = uCamPos + dir * t;
        float cov = cloudCoverage2D(p.xz);
        if (cov > 0.001) {
          float dens = cloudDensity(p, cov);
          if (dens > 0.001) {
            float hf = clamp((p.y - uCloudBase) / (uCloudTop - uCloudBase), 0.0, 1.0);
            float lt = lightMarch(p, cov);
            float powder = 1.0 - exp(-dens * 6.0);
            vec3 amb = ambient * mix(0.42, 1.0, hf);
            vec3 scat = sunLight * lt * phase * mix(0.5, 1.0, powder) + amb * mix(0.55, 1.0, lt);
            float a = 1.0 - exp(-dens * sigma * dt);
            cloudCol += transmittance * a * scat;
            meanDist += transmittance * a * t;
            wsum += transmittance * a;
            transmittance *= 1.0 - a;
          }
        }
        t += dt;
      }
      if (wsum > 0.0) meanDist /= wsum; else meanDist = t0;
      // aerial perspective on the cloud colour
      float alpha = 1.0 - transmittance;
      if (alpha > 0.001) {
        vec3 far = uCamPos + dir * meanDist;
        vec3 hazed = applyAerial(cloudCol / alpha, uCamPos, far);
        cloudCol = hazed * alpha;
      }
      // very distant clouds fade fully into the horizon haze
      float horizonFade = smoothstep(0.012, 0.06, dir.y);
      transmittance = mix(1.0, transmittance, horizonFade);
      cloudCol *= horizonFade;
    }
  }
  vec3 col = sky * transmittance + cloudCol;
  gl_FragColor = vec4(col, 1.0);
}
`;

const SKY_VERT = /* glsl */ `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const DOME_VERT = /* glsl */ `
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`;
const DOME_FRAG = /* glsl */ `
uniform sampler2D uSkyTex;
uniform vec2 uResolution;
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  gl_FragColor = vec4(texture(uSkyTex, uv).rgb, 1.0);
}
`;

/** Environment-probe version: analytic sky only (used for IBL / reflections), rendered on a dome. */
const ENV_VERT = /* glsl */ `
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ENV_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_SKY}
in vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  vec3 col = skyRadiance(dir);
  // clouds as a soft brightening band so reflections pick up overcast light
  float cov = uCloudCoverage;
  col = mix(col, mix(uHorizonColor, uZenithColor, 0.4) * 1.1, cov * 0.35 * smoothstep(0.0, 0.3, dir.y));
  vec3 sun = sunDisc(dir);
  col += min(sun, vec3(12.0));
  // sea below the horizon for reflections
  col = mix(col, uHazeColor * 0.55, smoothstep(0.0, -0.05, dir.y));
  gl_FragColor = vec4(col, 1.0);
}
`;

export class Sky {
  readonly dome: THREE.Mesh;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private rt: THREE.WebGLRenderTarget;
  private scale: number;
  private readonly envScene = new THREE.Scene();
  private readonly envMat: THREE.ShaderMaterial;
  private pmrem: THREE.PMREMGenerator | null = null;
  envMap: THREE.Texture | null = null;
  private readonly noise: THREE.Data3DTexture;

  constructor(private atmos: Atmosphere, renderer: THREE.WebGLRenderer, opts: { cloudSteps: number; scale: number }) {
    this.noise = createCloudNoiseTexture(64);
    this.scale = opts.scale;
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        ...atmos.uniforms,
        uNoise3D: { value: this.noise },
        uCamPos: { value: new THREE.Vector3() },
        uInvProj: { value: new THREE.Matrix4() },
        uInvView: { value: new THREE.Matrix4() },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCloudSteps: { value: opts.cloudSteps },
        uMoonPhase: { value: 0.5 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.skyMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

    const domeMat = new THREE.ShaderMaterial({
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      uniforms: { uSkyTex: { value: this.rt.texture }, uResolution: { value: new THREE.Vector2(1, 1) } },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), domeMat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1000;
    (this.dome as unknown as { isSky: boolean }).isSky = true;

    this.envMat = new THREE.ShaderMaterial({
      vertexShader: ENV_VERT,
      fragmentShader: ENV_FRAG,
      uniforms: { ...atmos.uniforms },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.envMat);
    this.envScene.add(envDome);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
  }

  setCloudSteps(n: number): void {
    this.skyMat.uniforms.uCloudSteps.value = n;
  }

  /** Re-render the environment map (IBL for every PBR material). Cheap enough to call every few frames. */
  updateEnvironment(): THREE.Texture {
    if (this.envMap) this.envMap.dispose();
    const rt = this.pmrem!.fromScene(this.envScene, 0, 0.1, 200);
    this.envMap = rt.texture;
    return this.envMap;
  }

  /** Render the sky + clouds into the offscreen buffer for this camera. */
  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, width: number, height: number): void {
    const w = Math.max(2, Math.round(width * this.scale)), h = Math.max(2, Math.round(height * this.scale));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    const u = this.skyMat.uniforms;
    u.uCamPos.value.copy(camera.position);
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uInvView.value.copy(camera.matrixWorld);
    u.uResolution.value.set(w, h);
    (this.dome.material as THREE.ShaderMaterial).uniforms.uResolution.value.set(width, height);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.render(this.quadScene, this.quadCam);
    renderer.setRenderTarget(prev);
    // keep the dome centred on the camera, far enough to sit behind everything
    this.dome.position.copy(camera.position);
    this.dome.scale.setScalar(camera.far * 0.9);
  }
}
