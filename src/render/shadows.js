// Cascaded shadow maps from the sun (moon at night). Hand-rolled: per cascade an orthographic camera fitted to the
// player camera's near frustum slice (radius 48 sharp / 160 soft), texel-snapped so the shadows do not shimmer
// when the camera moves, rendered with a depth-only override material into a depth texture.
//
// Casters live on the shadow layers: chunk meshes (terrain.js enables SHADOW_LAYER when a chunk mesh is created;
// the override material alpha-tests them through the atlas so leaves and fences cast holes) and every visible
// Mesh/InstancedMesh that opted in through object.castShadow, object.userData.shadowCaster, or a material with
// material.userData.shadowCaster (entity materials set it) - the layer bit is refreshed every frame from those
// flags, so nothing has to be reparented. Entities only go into the near cascade (SHADOW_LAYER_NEAR).
// Culling: only casters that can reach a visible receiver are drawn. The cascade's ortho frustum bounds the visible
// slice, and the slice's view-frustum planes that survive a sweep toward the light are handed to the terrain's
// exact chunk-AABB culling hook (scene.onBeforeRender -> cullChunks, camera.userData.cullPlanes) and applied to
// entity bounding spheres here. Receivers sample the maps through SHADING_PARS (PCF 3x3, slope-scaled bias,
// normal offset, cascade blending).
import * as THREE from 'three';
import { SHADING_UNIFORMS, SHADOW_LAYER, SHADOW_LAYER_NEAR } from './shading.js';

const DEPTH_VERT = /* glsl */ `
attribute float aFace;
varying vec2 vUv;
varying float vAtlas;
void main() {
  vUv = uv;
  // chunk meshes carry aFace (0..250); every other caster gets the material's default value 255 -> no alpha test
  vAtlas = aFace > 254.5 ? 0.0 : 1.0;
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`;
const DEPTH_FRAG = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying float vAtlas;
void main() {
  if (vAtlas > 0.5 && texture2D(map, vUv).a < 0.5) discard;
  gl_FragColor = vec4(1.0);
}`;

// Radii (blocks) of the cascades for 2 cascades and for the single-cascade preset.
export const CASCADE_RADII_2 = [48, 160];
export const CASCADE_RADII_1 = [64];
const CASTER_EXTENT = 300;   // how far toward the light casters are still collected (tall towers, low sun)
const FIT = 0.9;             // the visible part of the radius-R sphere fits a light-space square of half-size 0.9 R

const BIAS_MAT = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

// Sphere against inward-facing planes (same convention as THREE.Frustum; terrain.js has the AABB twin).
function sphereInPlanes(planes, center, radius) {
  for (let i = 0; i < planes.length; i++) if (planes[i].distanceToPoint(center) < -radius) return false;
  return true;
}

export class CascadedShadows {
  constructor(renderer, atlas) {
    this.renderer = renderer;
    this.cascades = [];
    this.count = 0;
    this.size = 2048;
    this.enabled = false;
    this.depthMat = new THREE.ShaderMaterial({ uniforms: { map: { value: atlas } }, vertexShader: DEPTH_VERT, fragmentShader: DEPTH_FRAG, side: THREE.FrontSide, colorWrite: false });
    this.depthMat.defaultAttributeValues = { uv: [0, 0], aFace: [255] };
    this.extraCasters = new Set();   // objects registered explicitly (debris instanced mesh, ...)
    this.stats = { chunkDraws: 0, objectDraws: 0, cascades: 0 };
    this._v = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._center = new THREE.Vector3();
    this._lightUp = new THREE.Vector3(0, 0, 1);
    this._sliceCam = new THREE.PerspectiveCamera();
    this._m4 = new THREE.Matrix4();
    this._sphere = new THREE.Sphere();
  }

  // count: 0 (off), 1 or 2 cascades; size: texels per cascade. Safe to call every frame (only rebuilds on change).
  configure(count, size) {
    count = Math.max(0, Math.min(2, count | 0));
    size = Math.max(256, Math.min(4096, size | 0));
    if (count === this.count && size === this.size && this.cascades.length === count) return;
    this.dispose();
    this.count = count; this.size = size;
    const radii = count === 2 ? CASCADE_RADII_2 : CASCADE_RADII_1;
    for (let i = 0; i < count; i++) {
      const depthTexture = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
      depthTexture.minFilter = THREE.NearestFilter; depthTexture.magFilter = THREE.NearestFilter;
      const target = new THREE.WebGLRenderTarget(size, size, {
        format: THREE.RedFormat, type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
        depthBuffer: true, stencilBuffer: false, depthTexture, generateMipmaps: false,
      });
      const radius = radii[i];
      const half = radius * FIT * 1.03;   // margin for the half-texel snapping shift
      const depthRange = 2 * (radius + CASTER_EXTENT);
      const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, depthRange);
      cam.layers.set(SHADOW_LAYER);
      if (i === 0) cam.layers.enable(SHADOW_LAYER_NEAR);
      cam.userData.cullPlanes = [];
      this.cascades.push({ radius, target, camera: cam, matrix: new THREE.Matrix4(), texelWorld: 2 * half / size, depthRange, sliceFrustum: new THREE.Frustum() });
    }
    this.enabled = count > 0;
    this._publish();
  }

  _publish() {
    const u = SHADING_UNIFORMS;
    u.uShadowCascades.value = this.count;
    for (let i = 0; i < 2; i++) {
      const c = this.cascades[i];
      const map = u['uShadowMap' + i], params = u['uShadowParams' + i], mat = u['uShadowMat' + i];
      if (!c) { params.value.set(1 / 2048, 1, 1, 0); continue; }
      map.value = c.target.depthTexture;
      mat.value = c.matrix;
      // normal offset ~1.1 texels of this cascade (0.05 blocks at 2048/48, 0.16 at 2048/160)
      params.value.set(1 / this.size, c.radius, c.depthRange, c.texelWorld * 1.1);
    }
    if (this.count === 0) { u.uShadowMap0.value = u.uShadowMap1.value = dummyTex(); }
    else if (this.count === 1) u.uShadowMap1.value = u.uShadowMap0.value;
  }

  // GPU bytes held by the shadow targets (R8 colour + 32-bit depth per texel).
  memoryBytes() { return this.cascades.length * this.size * this.size * 5; }

  // Planes of the view frustum truncated at `far` that still bound it after sweeping every point toward the light
  // (inward normal . lightDir >= 0): casters outside them cannot shadow anything inside the slice.
  _sweepPlanes(camera, far, lightDir, frustum, out) {
    const sc = this._sliceCam;
    sc.fov = camera.fov; sc.aspect = camera.aspect; sc.near = camera.near; sc.far = far;
    sc.updateProjectionMatrix();
    frustum.setFromProjectionMatrix(this._m4.multiplyMatrices(sc.projectionMatrix, camera.matrixWorldInverse));
    out.length = 0;
    const planes = frustum.planes;
    for (let i = 0; i < 6; i++) if (planes[i].normal.dot(lightDir) >= 0) out.push(planes[i]);
    return out;
  }

  // Fits every cascade around the camera along the light and renders the casters. lightDir points TOWARD the light.
  render(scene, camera, lightDir, terrainGroup) {
    this.stats.chunkDraws = 0; this.stats.objectDraws = 0; this.stats.cascades = this.count;
    if (this.count === 0) return;
    const renderer = this.renderer;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    const up = Math.abs(lightDir.z) > 0.97 ? this._lightUp.set(0, 1, 0) : this._lightUp.set(0, 0, 1);
    const fwd = this._fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    for (const c of this.cascades) this._sweepPlanes(camera, c.radius * 1.02, lightDir, c.sliceFrustum, c.camera.userData.cullPlanes);
    this._markCasters(scene, terrainGroup, this.cascades[0].camera.userData.cullPlanes);
    const prevTarget = renderer.getRenderTarget();
    const prevOverride = scene.overrideMaterial;
    const prevAuto = scene.matrixWorldAutoUpdate;
    scene.overrideMaterial = this.depthMat;
    scene.matrixWorldAutoUpdate = false;   // matrices were updated above; the extra render() calls must not redo it
    const info = renderer.info.render;
    for (let ci = 0; ci < this.cascades.length; ci++) {
      const c = this.cascades[ci], cam = c.camera;
      const dist = c.radius + CASTER_EXTENT;
      // the visible slice within `radius` of the camera fits a sphere centred half a radius ahead
      const center = this._center.copy(camera.position).addScaledVector(fwd, c.radius * 0.5);
      // light view: look along -lightDir at the slice centre from `dist` toward the light
      cam.position.copy(center).addScaledVector(lightDir, dist);
      cam.up.copy(up);
      cam.lookAt(center);
      cam.updateMatrixWorld();
      // texel snapping: quantise the light-space xy of the shadow camera itself to whole texels, so the world ->
      // texel mapping only changes in texel steps while the player moves (no crawling edges)
      const t = c.texelWorld;
      const X = this._v.setFromMatrixColumn(cam.matrixWorld, 0);
      const ox = cam.position.dot(X);
      cam.position.addScaledVector(X, Math.round(ox / t) * t - ox);
      const Y = this._v.setFromMatrixColumn(cam.matrixWorld, 1);
      const oy = cam.position.dot(Y);
      cam.position.addScaledVector(Y, Math.round(oy / t) * t - oy);
      cam.updateMatrixWorld();
      c.matrix.copy(BIAS_MAT).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);

      renderer.setRenderTarget(c.target);
      renderer.clear(false, true, false);
      const calls0 = info.calls;
      renderer.render(scene, cam);   // scene.onBeforeRender -> terrain.cullChunks(cam): exact chunk AABB culling
      const calls = info.calls >= calls0 ? info.calls - calls0 : info.calls;
      let chunks = 0;
      if (terrainGroup) {
        const ch = terrainGroup.children;
        for (let i = 0; i < ch.length; i++) if (ch[i].visible && ch[i].layers.test(cam.layers)) chunks++;
      }
      this.stats.chunkDraws += chunks;
      this.stats.objectDraws += Math.max(0, calls - chunks);
    }
    scene.overrideMaterial = prevOverride;
    scene.matrixWorldAutoUpdate = prevAuto;
    renderer.setRenderTarget(prevTarget);
  }

  // Refreshes the near-cascade layer bit on every opted-in mesh outside the terrain group (chunk meshes are handled
  // by terrain.js when they are created), dropping casters whose bounding sphere cannot reach the visible slice.
  _markCasters(node, skip, planes) {
    if (node === skip || node.visible === false) return;
    if (node.isMesh || node.isInstancedMesh) {
      const mat = node.material;
      let caster = node.castShadow || node.userData.shadowCaster || (mat && mat.userData && mat.userData.shadowCaster) || this.extraCasters.has(node);
      if (caster && node.frustumCulled && node.geometry) {
        const geo = node.geometry;
        if (geo.boundingSphere === null) geo.computeBoundingSphere();
        this._sphere.copy(geo.boundingSphere).applyMatrix4(node.matrixWorld);
        caster = sphereInPlanes(planes, this._sphere.center, this._sphere.radius);
      }
      if (caster) node.layers.enable(SHADOW_LAYER_NEAR); else node.layers.disable(SHADOW_LAYER_NEAR);
    }
    const ch = node.children;
    for (let i = 0; i < ch.length; i++) this._markCasters(ch[i], skip, planes);
  }

  addCaster(o) { if (o) { this.extraCasters.add(o); o.layers.enable(SHADOW_LAYER_NEAR); } }
  removeCaster(o) { if (o) { this.extraCasters.delete(o); o.layers.disable(SHADOW_LAYER_NEAR); } }

  dispose() {
    for (const c of this.cascades) { c.target.dispose(); }
    this.cascades.length = 0;
    this.count = 0;
    this.enabled = false;
  }
}

let _dummy = null;
function dummyTex() {
  if (!_dummy) { _dummy = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat); _dummy.needsUpdate = true; }
  return _dummy;
}
