import * as THREE from 'three';
import type { Atmosphere } from '../world/atmosphere';
import { LAYER_MIRROR, configureMainCamera } from '../world/culling';
import { GLSL_AERIAL, GLSL_ATMOS_UNIFORMS, GLSL_CLOUD_FIELD, GLSL_NOISE, GLSL_SKY } from './shaders/common.glsl';

/**
 * Planar reflection of the scene in the water plane (y = 0).
 *
 * The main camera is mirrored about the plane and the scene is rendered from there into a reduced-resolution
 * HalfFloat target with an oblique near plane on the water surface (nothing below the surface is mirrored).
 * The water is not drawn (it is the mirror), nor is the sky dome: where nothing is mirrored the target keeps
 * alpha 0 and the water shader falls back to its environment-map sky, so the target is a premultiplied
 * "objects only" layer. A resolve pass then applies the cloud shadows and the aerial perspective of the leg
 * from the water surface to the mirrored object (the post pass adds the camera-to-water leg like for every
 * other pixel); a Gaussian pyramid is then rendered into the mip levels of the result, which the water
 * samples at a level set by its microfacet roughness (box-filtered mips read as blocks once magnified).
 *
 * Shadow maps: the renderer runs with `shadowMap.autoUpdate = false`; the game raises `needsUpdate` once per
 * frame right before this pass, so the cascades are rendered inside the mirror render (they are fit to the
 * main camera by the CSM, which does not depend on the rendering camera) and the main pass reuses them.
 * Objects excluded from the mirror image are hidden for the mirror camera only: the shadow pass, which runs
 * inside the same `renderer.render` call after the camera has culled its render list, sees them exactly as
 * the main pass does, so the shadow maps are the same as without this pass.
 */

export interface ReflectionUniforms {
  uReflTex: THREE.IUniform<THREE.Texture | null>;
  uReflDepth: THREE.IUniform<THREE.Texture | null>;
  /** view-projection of the mirror camera (oblique near plane included; x, y, w are unaffected by it) */
  uReflVP: THREE.IUniform<THREE.Matrix4>;
  /** x: pass active (0/1), y: log-depth constant of the mirror pass, z: focal length in reflection texels, w: top mip level */
  uReflParams: THREE.IUniform<THREE.Vector4>;
  uReflTexel: THREE.IUniform<THREE.Vector2>;
  /** x: streak length per unit of unresolved rms slope (the Cox-Munk value is 2 sqrt(1/2) = 1.41; slightly under it
   *  because the measured slope distribution is peaked: its core is narrower than the Gaussian of the same variance),
   *  y: wave-perturbation scale (1 = the resolved slopes displace the image exactly),
   *  z, w: streak length (fraction of the image height) where the mirror image starts / has finished fading to the
   *  environment sky (a city's lights at night streak a third of the image and must stay) */
  uReflTune: THREE.IUniform<THREE.Vector4>;
}

export function createReflectionUniforms(): ReflectionUniforms {
  return {
    uReflTex: { value: null },
    uReflDepth: { value: null },
    uReflVP: { value: new THREE.Matrix4() },
    uReflParams: { value: new THREE.Vector4(0, 1, 1, 0) },
    uReflTexel: { value: new THREE.Vector2(1, 1) },
    uReflTune: { value: new THREE.Vector4(1.2, 0.6, 0.35, 0.8) },
  };
}

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Cloud shadow + aerial perspective of the water-to-object leg, on the premultiplied mirror image. */
const RESOLVE_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_SKY}
${GLSL_AERIAL}
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform mat4 uInvProj; // inverse of the unclipped projection: the oblique row does not change the ray directions
uniform mat4 uInvView;
uniform vec3 uCamPos;  // mirror camera, below the surface
uniform float uLogDepthFC;
uniform float uCloudShadowStrength;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  float depth = texture2D(tDepth, vUv).r;
  if (c.a <= 0.0 || depth >= 0.99999) { gl_FragColor = c; return; }
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vdir4 = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 vdir = vdir4.xyz / vdir4.w;
  vdir /= -vdir.z;
  float w = exp2(depth * 2.0 / uLogDepthFC) - 1.0;
  vec3 q = (uInvView * vec4(vdir * w, 1.0)).xyz; // the mirrored object, in the real world
  // the mirror ray crosses the surface where the reflected ray leaves the water
  vec3 d = q - uCamPos;
  float t = clamp(-uCamPos.y / max(d.y, 1e-4), 0.0, 1.0);
  vec3 p = uCamPos + d * t;
  vec3 col = c.rgb;
  float cs = cloudShadow(q);
  float sunShare = 0.62 * smoothstep(-0.05, 0.2, uSunDir.y);
  col *= 1.0 - (1.0 - cs) * sunShare * uCloudShadowStrength;
  vec3 dv = q - p;
  float dist = length(dv);
  vec3 dir = dv / max(dist, 1e-3);
  float ext = exp(-opticalDepth(p.y, q.y, dist));
  vec3 skyHaze = skyRadiance(vec3(dir.x, max(dir.y, 0.0), dir.z));
  vec3 haze = mix(skyHaze, uHazeColor * 0.8, smoothstep(0.0, -0.35, dir.y));
  // premultiplied: the in-scattered haze only fills the covered fraction of the texel
  col = col * ext + haze * (1.0 - ext) * c.a;
  gl_FragColor = vec4(col, c.a);
}
`;

/** Gaussian downsample of one pyramid level (3x3 tent on the source, read between its texels: a 4x4 footprint). */
const DOWN_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform float uLod;
uniform vec2 uTexel; // of the source level
varying vec2 vUv;
void main() {
  vec4 c = textureLod(tSrc, vUv, uLod) * 0.25;
  c += (textureLod(tSrc, vUv + vec2(uTexel.x, 0.0), uLod) + textureLod(tSrc, vUv - vec2(uTexel.x, 0.0), uLod)
      + textureLod(tSrc, vUv + vec2(0.0, uTexel.y), uLod) + textureLod(tSrc, vUv - vec2(0.0, uTexel.y), uLod)) * 0.125;
  c += (textureLod(tSrc, vUv + uTexel, uLod) + textureLod(tSrc, vUv - uTexel, uLod)
      + textureLod(tSrc, vUv + vec2(uTexel.x, -uTexel.y), uLod) + textureLod(tSrc, vUv - vec2(uTexel.x, -uTexel.y), uLod)) * 0.0625;
  gl_FragColor = c;
}
`;

/** Diagnostic view of the resolved mirror image: gamma-encoded colour, uncovered texels tinted magenta. */
const DEBUG_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform float uLod;
varying vec2 vUv;
void main() {
  vec4 c = textureLod(tColor, vUv, uLod);
  vec3 col = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2)) + (1.0 - c.a) * vec3(0.35, 0.0, 0.35);
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface ReflectionStats { calls: number; triangles: number; shadowCalls: number; shadowTriangles: number; width: number; height: number; hidden: number; }

/** Distance from `camera` to the edge of an object's world bounding sphere (Infinity when it has none). */
export function distanceToBounds(obj: THREE.Object3D, camera: THREE.Camera): number {
  const mesh = obj as THREE.Mesh;
  const own = (mesh as unknown as { boundingSphere?: THREE.Sphere | null }).boundingSphere; // instanced meshes (set by the world systems)
  if (own) {
    _sphere.copy(own);
  } else {
    const geo = mesh.geometry;
    if (!geo) return Infinity;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    _sphere.copy(geo.boundingSphere!);
  }
  _sphere.applyMatrix4(obj.matrixWorld);
  return Math.max(0, _sphere.center.distanceTo(camera.position) - _sphere.radius);
}

/** Radius of a mesh geometry's bounding sphere in its local space (0 when it has no geometry). */
export function boundsRadius(obj: THREE.Object3D): number {
  const geo = (obj as THREE.Mesh).geometry;
  if (!geo) return 0;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  return geo.boundingSphere!.radius;
}

/** Triangles of one instance of a mesh's geometry (0 when unknown). */
export function trianglesOf(obj: THREE.Object3D): number {
  const geo = (obj as THREE.Mesh).geometry;
  if (!geo) return 0;
  const n = geo.index ? geo.index.count : geo.attributes.position?.count ?? 0;
  return Math.floor(n / 3);
}

const _sphere = new THREE.Sphere();

export class PlanarReflection {
  readonly camera = new THREE.PerspectiveCamera();
  readonly uniforms = createReflectionUniforms();
  /** Height (m) below the surface at which the mirror pass clips: a little of the submerged part of hulls, piers and
   *  beaches is mirrored so the wave-perturbed lookups near the waterline do not fall into empty texels. */
  clipOffset = 0.15;
  enabled = true;
  /** Multiplies the strength of the cloud-shadow darkening of mirrored objects (0 disables, like the post pass). */
  cloudShadowStrength = 1.0;
  readonly stats: ReflectionStats = { calls: 0, triangles: 0, shadowCalls: 0, shadowTriangles: 0, width: 1, height: 1, hidden: 0 };
  private readonly sceneRT: THREE.WebGLRenderTarget;
  private readonly outRT: THREE.WebGLRenderTarget;
  /** one per pyramid level >= 1: the downsample is rendered here, then copied into that mip level of outRT
   *  (a texture cannot be sampled while one of its levels is the draw target) */
  private readonly levelRTs: THREE.WebGLRenderTarget[] = [];
  /** pyramid levels filled each frame (level 0 included); the water clamps its lod to levels - 1 */
  private levels = 1;
  private readonly resolveMat: THREE.ShaderMaterial;
  private readonly downMat: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly excluded: THREE.Object3D[] = [];
  private readonly filters: { root: THREE.Object3D; skip: (child: THREE.Object3D, camera: THREE.PerspectiveCamera) => boolean }[] = [];
  /** objects hidden for the current pass (static exclusions plus this frame's filtered children) */
  private readonly hidden: THREE.Object3D[] = [];
  private readonly wasVisible: boolean[] = [];
  private inPass = false;
  private readonly baseProjInv = new THREE.Matrix4();
  private readonly plane = new THREE.Plane();
  private readonly clip = new THREE.Vector4();
  private readonly q = new THREE.Vector4();
  private readonly prevClear = new THREE.Color();
  private width = 1;
  private height = 1;

  /** @param scale render-target size as a fraction of the frame
   *  @param range distance (m) beyond which the game leaves buildings, props and terrain out of the mirror image */
  constructor(private readonly renderer: THREE.WebGLRenderer, atmos: Atmosphere, readonly scale: number, readonly range: number) {
    configureMainCamera(this.camera);
    this.camera.layers.enable(LAYER_MIRROR);
    const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    // the mip levels are allocated by three.js from the length of texture.mipmaps (set in setSize) and rendered
    // one by one with setRenderTarget(outRT, 0, level)
    this.outRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    this.uniforms.uReflTex.value = this.outRT.texture;
    this.uniforms.uReflDepth.value = depthTexture;
    this.resolveMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: RESOLVE_FRAG,
      uniforms: {
        ...atmos.uniforms,
        tColor: { value: this.sceneRT.texture },
        tDepth: { value: depthTexture },
        uInvProj: { value: this.baseProjInv },
        uInvView: { value: this.camera.matrixWorld },
        uCamPos: { value: this.camera.position },
        uLogDepthFC: { value: 1 },
        uCloudShadowStrength: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.downMat = new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: DOWN_FRAG, uniforms: { tSrc: { value: this.outRT.texture }, uLod: { value: 0 }, uTexel: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.resolveMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    // the shadow pass inside the mirror render must see the scene exactly as the main pass does (see above)
    const sm = renderer.shadowMap;
    const inner = sm.render;
    sm.render = (lights: THREE.Light[], scene: THREE.Scene, camera: THREE.Camera) => {
      if (!this.inPass) { inner.call(sm, lights, scene, camera); return; }
      for (let i = 0; i < this.hidden.length; i++) this.hidden[i].visible = this.wasVisible[i];
      const info = renderer.info.render;
      const c0 = info.calls, t0 = info.triangles;
      inner.call(sm, lights, scene, camera);
      this.stats.shadowCalls = info.calls - c0;
      this.stats.shadowTriangles = info.triangles - t0;
      for (const o of this.hidden) o.visible = false;
    };
  }

  /** Objects never drawn in the mirror image (the water itself, the sky dome, surface decals, particles). */
  exclude(...objects: THREE.Object3D[]): void {
    for (const o of objects) if (!this.excluded.includes(o)) this.excluded.push(o);
  }

  /** Skip the direct children of `root` for which `skip` holds this frame (evaluated on the visible ones only):
   *  e.g. the heavy 3D vegetation meshes and impostor tiles too far away to matter in a blurred reflection. */
  excludeChildrenWhen(root: THREE.Object3D, skip: (child: THREE.Object3D, camera: THREE.PerspectiveCamera) => boolean): void {
    this.filters.push({ root, skip });
  }

  setSize(width: number, height: number): void {
    const w = Math.max(2, Math.round(width * this.scale)), h = Math.max(2, Math.round(height * this.scale));
    if (w === this.width && h === this.height) return;
    this.width = w; this.height = h;
    this.sceneRT.setSize(w, h);
    this.outRT.setSize(w, h);
    // a mipmapped texture is only complete with every level down to 1x1 allocated; the pyramid stops at 4 px
    const total = Math.floor(Math.log2(Math.max(w, h))) + 1;
    this.outRT.texture.mipmaps = Array.from({ length: total }, () => ({})) as unknown as THREE.CompressedTextureMipmap[]; // only the length is read
    this.levels = 1;
    while (this.levels < total && Math.min(w >> this.levels, h >> this.levels) >= 4) this.levels++;
    for (let i = 1; i < this.levels; i++) {
      const rt = this.levelRTs[i] ??= new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      rt.setSize(w >> i, h >> i);
    }
    this.uniforms.uReflTexel.value.set(1 / w, 1 / h);
    this.stats.width = w; this.stats.height = h;
  }

  /** Mirror `main` about y = 0 and give the mirror camera an oblique near plane on the surface (Lengyel). */
  private setupCamera(main: THREE.PerspectiveCamera): void {
    const cam = this.camera;
    const m = main.matrixWorld.elements;
    const px = m[12], py = m[13], pz = m[14];
    const fx = -m[8], fy = -m[9], fz = -m[10];
    cam.position.set(px, -py, pz);
    cam.up.set(m[4], -m[5], m[6]);
    cam.lookAt(px + fx, -(py + fy), pz + fz);
    cam.fov = main.fov; cam.aspect = main.aspect; cam.near = main.near; cam.far = main.far; cam.zoom = main.zoom;
    cam.updateProjectionMatrix();
    this.baseProjInv.copy(cam.projectionMatrixInverse);
    cam.updateMatrixWorld(true);
    // keep everything above y = -clipOffset: plane normal up, in mirror-camera view space
    this.plane.set(_up, this.clipOffset);
    this.plane.applyMatrix4(cam.matrixWorldInverse);
    const clip = this.clip.set(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant);
    const e = cam.projectionMatrix.elements;
    const q = this.q;
    q.x = (Math.sign(clip.x) + e[8]) / e[0];
    q.y = (Math.sign(clip.y) + e[9]) / e[5];
    q.z = -1.0;
    q.w = (1.0 + e[10]) / e[14];
    clip.multiplyScalar(2.0 / clip.dot(q));
    e[2] = clip.x;
    e[6] = clip.y;
    e[10] = clip.z + 1.0;
    e[14] = clip.w;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    this.uniforms.uReflVP.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  }

  /** Render the mirror image for `main`. Leaves the renderer's target as it found it. */
  render(scene: THREE.Scene, main: THREE.PerspectiveCamera): void {
    const params = this.uniforms.uReflParams.value;
    if (!this.enabled || this.scale <= 0 || main.matrixWorld.elements[13] < 0.3) {
      params.x = 0;
      this.stats.calls = this.stats.triangles = this.stats.shadowCalls = this.stats.shadowTriangles = 0;
      return;
    }
    const r = this.renderer;
    this.setupCamera(main);
    const cam = this.camera;
    const logFC = 2.0 / (Math.log(cam.far + 1.0) / Math.LN2);
    params.set(1, logFC, (this.height * 0.5) / Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * cam.fov), this.levels - 1);

    const info = r.info.render;
    const c0 = info.calls, t0 = info.triangles;
    this.stats.shadowCalls = this.stats.shadowTriangles = 0;
    const hidden = this.hidden;
    hidden.length = 0;
    for (const o of this.excluded) hidden.push(o);
    for (const f of this.filters) for (const c of f.root.children) if (c.visible && f.skip(c, main)) hidden.push(c);
    this.wasVisible.length = hidden.length;
    for (let i = 0; i < hidden.length; i++) { this.wasVisible[i] = hidden[i].visible; hidden[i].visible = false; }
    const prevTarget = r.getRenderTarget();
    r.getClearColor(this.prevClear);
    const prevAlpha = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(this.sceneRT);
    this.inPass = true;
    r.render(scene, cam);
    this.inPass = false;
    r.setClearColor(this.prevClear, prevAlpha);
    for (let i = 0; i < hidden.length; i++) hidden[i].visible = this.wasVisible[i];
    this.stats.hidden = hidden.length;

    const u = this.resolveMat.uniforms;
    u.uLogDepthFC.value = logFC;
    u.uCloudShadowStrength.value = this.cloudShadowStrength;
    this.quad.material = this.resolveMat;
    this.outRT.viewport.set(0, 0, this.width, this.height);
    r.setRenderTarget(this.outRT);
    r.render(this.quadScene, this.quadCam);
    // Gaussian pyramid into the mip levels: each level is rendered into its own target (a texture cannot be
    // sampled while one of its levels is the draw target) and blitted from there into the mip level with
    // copyTexSubImage2D (no draw call; the formats match, so the copy is exact)
    this.quad.material = this.downMat;
    for (let i = 1; i < this.levels; i++) {
      this.downMat.uniforms.uLod.value = i - 1;
      this.downMat.uniforms.uTexel.value.set(1 / (this.width >> (i - 1)), 1 / (this.height >> (i - 1)));
      r.setRenderTarget(this.levelRTs[i]);
      r.render(this.quadScene, this.quadCam);
      r.copyFramebufferToTexture(this.outRT.texture, null, i);
    }
    this.quad.material = this.resolveMat;
    r.setRenderTarget(prevTarget);
    this.stats.calls = info.calls - c0 - this.stats.shadowCalls;
    this.stats.triangles = info.triangles - t0 - this.stats.shadowTriangles;
  }

  /** Draw the resolved mirror image over the canvas (debug switch `reflview`). */
  debugLod = 0;
  debugBlit(): void {
    if (!this.debugMat) this.debugMat = new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: DEBUG_FRAG, uniforms: { tColor: { value: this.outRT.texture }, uLod: { value: 0 } }, depthTest: false, depthWrite: false });
    this.debugMat.uniforms.uLod.value = this.debugLod;
    const prev = this.quad.material;
    this.quad.material = this.debugMat;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCam);
    this.quad.material = prev;
  }
  private debugMat: THREE.ShaderMaterial | null = null;
}

const _up = new THREE.Vector3(0, 1, 0);
