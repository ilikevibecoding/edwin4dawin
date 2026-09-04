// Water visuals for the tsunami: one shader shared by the moving crest strip, the far "sea" sheet and the
// preview flood disc. Everything animated is computed in the vertex shader from uniforms, so a frame costs
// a handful of uniform writes and one draw call per mesh (no per-frame geometry uploads).
import * as THREE from 'three';
import { SHARED } from '../../entityMaterial.js';
import { tileUV, TILES } from '../../textures.js';

const VERT = /* glsl */ `
uniform float uMode;        // 0 = flat sheet (local xz plane, world y from the mesh transform), 1 = crest strip
uniform vec2 uCenter;       // disc centre (x, z)
uniform vec2 uDir;          // travel direction (unit, x/z)
uniform float uS;           // front distance from the start edge of the disc
uniform float uRadius;
uniform float uBaseY;       // ground the crest foot runs on
uniform float uBackY;       // flood surface right behind the crest
uniform float uCrestTop;    // crest peak height
uniform float uTime;
varying vec2 vLocal;
varying float vFoam;
varying float vDist;
varying float vEdge;
void main() {
  vec3 p;
  if (uMode < 0.5) {
    vec4 w = modelMatrix * vec4(position, 1.0);
    p = w.xyz;
    vLocal = w.xz * 0.5 + vec2(uTime * 0.08, uTime * 0.05);
    vFoam = 0.0;
    vEdge = 1.0;
  } else {
    float u = position.x;                 // -1..1 along the front line
    float v = position.y;                 // 0 = back of the wave, 1 = foot at the front
    float k = uS - uRadius;               // signed offset of the front from the disc centre
    float halfLen = sqrt(max(0.0, uRadius * uRadius - k * k)) + 6.0;
    float along = u * halfLen;
    vec2 perp = vec2(-uDir.y, uDir.x);
    float bump = sin(3.14159265 * pow(v, 1.5));
    float wob = 0.86 + 0.14 * sin(along * 0.31 + uTime * 1.3) * sin(along * 0.071 + 1.7);
    float h = (uCrestTop - uBaseY) * wob;
    float d = mix(-10.0, 1.6, v) + 2.4 * bump * smoothstep(0.35, 0.95, v);
    float y = mix(uBackY, uBaseY, v) + h * pow(bump, 1.25);
    y += (0.22 * sin(along * 0.9 + uTime * 5.0) + 0.12 * sin(along * 2.3 - uTime * 7.0)) * bump;
    vec2 xz = uCenter + uDir * (k + d) + perp * along;
    p = vec3(xz.x, y, xz.y);
    vLocal = vec2(along * 0.25, d * 0.25 - uTime * 0.7);
    vFoam = smoothstep(0.55, 0.95, bump) * (0.72 + 0.28 * sin(along * 1.7 + uTime * 3.0));
    vEdge = 1.0 - smoothstep(halfLen - 8.0, halfLen, abs(along));
  }
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 uTile;         // atlas tile origin (u, v) and size
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
uniform float uAlpha;
uniform vec3 uTint;
varying vec2 vLocal; varying float vFoam; varying float vDist; varying float vEdge;
void main() {
  vec2 t = fract(vLocal) * 0.9 + 0.05;
  vec4 tex = texture2D(map, uTile.xy + t * uTile.z);
  vec3 light = max(vec3(uSkyLight) * uSkyTint, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * uTint * light;
  vec3 foam = vec3(0.93, 0.96, 1.0) * light;
  col = mix(col, foam, vFoam);
  float a = mix(0.74, 0.97, vFoam) * uAlpha * vEdge;
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDist));
  gl_FragColor = vec4(col, a);
}`;

function makeMaterial(atlas, mode) {
  const [tu, tv, ts] = tileUV(TILES.water ?? 0);
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: atlas },
      uTile: { value: new THREE.Vector3(tu, tv, ts) },
      uMode: { value: mode },
      uCenter: { value: new THREE.Vector2() },
      uDir: { value: new THREE.Vector2(1, 0) },
      uS: { value: 0 },
      uRadius: { value: 100 },
      uBaseY: { value: 57 },
      uBackY: { value: 60 },
      uCrestTop: { value: 63 },
      uTime: { value: 0 },
      uAlpha: { value: 1 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor,
      uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

// Unit grid: x in [-1,1] (along the front), y in [0,1] (profile back -> front).
function crestGeometry(nu = 128, nv = 12) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3);
  let k = 0;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { pos[k++] = (i / nu) * 2 - 1; pos[k++] = j / nv; pos[k++] = 0; }
  const idx = new Uint32Array(nu * nv * 6);
  k = 0;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

export class WaveVisuals {
  constructor(scene, atlas) {
    this.scene = scene;
    this.crest = new THREE.Mesh(crestGeometry(), makeMaterial(atlas, 1));
    this.crest.frustumCulled = false;
    this.crest.renderOrder = 11;
    this.crest.visible = false;
    // far sea: a big sheet beyond the start edge of the disc, in the source direction
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1000, 420), makeMaterial(atlas, 0));
    this.sea.geometry.rotateX(-Math.PI / 2);
    this.sea.renderOrder = 10;
    this.sea.visible = false;
    this.sea.frustumCulled = false;
    this.disc = null; // preview flood plane (created on demand)
    scene.add(this.crest);
    scene.add(this.sea);
  }

  setGeometry(cx, cz, dirX, dirZ, radius, baseY, crestTop) {
    for (const m of [this.crest, this.sea]) {
      const u = m.material.uniforms;
      u.uCenter.value.set(cx, cz); u.uDir.value.set(dirX, dirZ); u.uRadius.value = radius; u.uBaseY.value = baseY; u.uCrestTop.value = crestTop;
    }
    // sea sheet centred 20 blocks behind the start edge, stretching 420 blocks back
    this.sea.position.set(cx - dirX * (radius + 20 + 210), baseY - 4, cz - dirZ * (radius + 20 + 210));
    this.sea.rotation.y = Math.atan2(dirX, dirZ);
  }

  // per-frame crest state
  setFront(s, backY, time, alpha) {
    const u = this.crest.material.uniforms;
    u.uS.value = s; u.uBackY.value = backY; u.uTime.value = time; u.uAlpha.value = alpha;
    this.crest.visible = alpha > 0.01;
  }

  setSea(y, time, alpha) {
    this.sea.position.y = y;
    const u = this.sea.material.uniforms;
    u.uTime.value = time; u.uAlpha.value = alpha;
    this.sea.visible = alpha > 0.01;
  }

  showDisc(cx, cz, radius, y, atlas) {
    if (!this.disc) {
      this.disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), makeMaterial(atlas, 0));
      this.disc.geometry.rotateX(-Math.PI / 2);
      this.disc.renderOrder = 10;
      this.disc.frustumCulled = false;
      this.disc.material.uniforms.uAlpha.value = 0.6;
      this.disc.material.uniforms.uTint.value.set(0.9, 0.95, 1.1);
      this.scene.add(this.disc);
    }
    this.disc.position.set(cx, y, cz);
    this.disc.visible = true;
  }

  setDiscTime(time) { if (this.disc) this.disc.material.uniforms.uTime.value = time; }

  dispose() {
    for (const m of [this.crest, this.sea, this.disc]) {
      if (!m) continue;
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this.disc = null;
  }
}
