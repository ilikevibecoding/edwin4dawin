// Water sheets for the tsunami: one shader shared by the far "sea" sheet beyond the start edge and the preview flood
// disc (the moving crest itself is the voxel strip in crestMesh.js). Everything animated is computed in the shaders
// from uniforms, so a frame costs a handful of uniform writes and one draw call per mesh. The preview also carries a
// direction cue: scrolling chevrons from the source side and a bright ribbon where the front enters the disc.
import * as THREE from 'three';
import { SHARED } from '../../entityMaterial.js';
import { tileUV, TILES } from '../../textures.js';

const VERT = /* glsl */ `
uniform float uTime;
varying vec2 vLocal;
varying float vDist;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vLocal = w.xz * 0.5 + vec2(uTime * 0.08, uTime * 0.05);
  vec4 mv = viewMatrix * w;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 uTile;         // atlas tile origin (u, v) and size
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
uniform float uAlpha;
uniform vec3 uTint;
varying vec2 vLocal; varying float vDist;
void main() {
  vec2 t = fract(vLocal) * 0.9 + 0.05;
  vec4 tex = texture2D(map, uTile.xy + t * uTile.z);
  vec3 light = max(vec3(uSkyLight) * uSkyTint, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * uTint * light;
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDist));
  gl_FragColor = vec4(col, 0.78 * uAlpha);
}`;

function makeMaterial(atlas) {
  const [tu, tv, ts] = tileUV(TILES.water ?? 0);
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: atlas },
      uTile: { value: new THREE.Vector3(tu, tv, ts) },
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

const ARROW_COLOR = new THREE.Color(0.85, 0.97, 1.0);
const RIBBON_COLOR = new THREE.Color(1.0, 0.72, 0.25);

export class WaveVisuals {
  constructor(scene, atlas) {
    this.scene = scene;
    // far sea: a big sheet beyond the start edge of the disc, in the source direction
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1000, 420), makeMaterial(atlas));
    this.sea.geometry.rotateX(-Math.PI / 2);
    this.sea.renderOrder = 10;
    this.sea.visible = false;
    this.sea.frustumCulled = false;
    this.disc = null;       // preview flood plane (created on demand)
    this.arrows = null;     // preview direction chevrons (scrolling)
    this.ribbon = null;     // preview: where the front enters the disc
    this.arrowDir = [1, 0];
    this.arrowSpeed = 6;
    scene.add(this.sea);
  }

  setGeometry(cx, cz, dirX, dirZ, radius, baseY) {
    // sea sheet centred 20 blocks behind the start edge, stretching 420 blocks back
    this.sea.position.set(cx - dirX * (radius + 20 + 210), baseY - 4, cz - dirZ * (radius + 20 + 210));
    this.sea.rotation.y = Math.atan2(dirX, dirZ);
  }

  setSea(y, time, alpha) {
    this.sea.position.y = y;
    const u = this.sea.material.uniforms;
    u.uTime.value = time; u.uAlpha.value = alpha;
    this.sea.visible = alpha > 0.01;
  }

  // Preview: flooded extent, chevrons flowing from the source side and the entry ribbon (orange = destructive).
  showDisc(cx, cz, radius, y, atlas, dirX = 1, dirZ = 0, speed = 6, damage = 0.35) {
    if (!this.disc) {
      this.disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), makeMaterial(atlas));
      this.disc.geometry.rotateX(-Math.PI / 2);
      this.disc.renderOrder = 10;
      this.disc.frustumCulled = false;
      this.disc.material.uniforms.uAlpha.value = 0.75;
      this.disc.material.uniforms.uTint.value.set(0.9, 0.95, 1.1);
      this.scene.add(this.disc);
    }
    this.disc.position.set(cx, y, cz);
    this.disc.visible = true;
    this.arrowDir = [dirX, dirZ];
    this.arrowSpeed = speed;
    if (this.arrows) { this.scene.remove(this.arrows); this.arrows.geometry.dispose(); this.arrows.material.dispose(); }
    if (this.ribbon) { this.scene.remove(this.ribbon); this.ribbon.geometry.dispose(); this.ribbon.material.dispose(); }
    // chevrons: lanes across the disc, one chevron every SPACING blocks along the travel axis (the group scrolls)
    const px = -dirZ, pz = dirX, pos = [];
    const spacing = 14, half = 2.6, len = 3.2;
    const chevron = (ax, az) => {
      // an open "V" pointing along (dirX, dirZ): two slanted bars of width 0.7
      const tipX = ax + dirX * len * 0.5, tipZ = az + dirZ * len * 0.5;
      const backX = ax - dirX * len * 0.5, backZ = az - dirZ * len * 0.5;
      for (const sgn of [-1, 1]) {
        const bx = backX + px * sgn * half, bz = backZ + pz * sgn * half;
        const ox = px * sgn * 0.35 - dirX * 0.35, oz = pz * sgn * 0.35 - dirZ * 0.35; // bar thickness
        pos.push(tipX, y + 0.08, tipZ, bx, y + 0.08, bz, bx + ox, y + 0.08, bz + oz);
        pos.push(tipX, y + 0.08, tipZ, bx + ox, y + 0.08, bz + oz, tipX + ox, y + 0.08, tipZ + oz);
      }
    };
    for (let lane = -3; lane <= 3; lane++) {
      const b = lane * radius * 0.28;
      for (let k = -radius; k <= radius + spacing; k += spacing) {
        const ax = cx + dirX * k + px * b, az = cz + dirZ * k + pz * b;
        if ((ax - cx) ** 2 + (az - cz) ** 2 < (radius - 4) ** 2) chevron(ax, az);
      }
    }
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.arrows = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: ARROW_COLOR, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    this.arrows.renderOrder = 21; this.arrows.frustumCulled = false;
    this.scene.add(this.arrows);
    // entry ribbon: the front 8 blocks after it enters the disc (orange when the crest breaks things, pale otherwise)
    const kR = -radius + 8, hl = Math.sqrt(Math.max(0, radius * radius - kR * kR));
    const rp = [];
    const x0 = cx + dirX * kR, z0 = cz + dirZ * kR, w = 0.9;
    rp.push(x0 - px * hl - dirX * w, y + 0.1, z0 - pz * hl - dirZ * w, x0 + px * hl - dirX * w, y + 0.1, z0 + pz * hl - dirZ * w, x0 + px * hl + dirX * w, y + 0.1, z0 + pz * hl + dirZ * w);
    rp.push(x0 - px * hl - dirX * w, y + 0.1, z0 - pz * hl - dirZ * w, x0 + px * hl + dirX * w, y + 0.1, z0 + pz * hl + dirZ * w, x0 - px * hl + dirX * w, y + 0.1, z0 - pz * hl + dirZ * w);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    const col = RIBBON_COLOR.clone().lerp(ARROW_COLOR, damage > 0.05 ? 0 : 0.8);
    this.ribbon = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    this.ribbon.renderOrder = 22; this.ribbon.frustumCulled = false;
    this.scene.add(this.ribbon);
  }

  setDiscTime(time) {
    if (this.disc) this.disc.material.uniforms.uTime.value = time;
    if (this.arrows) {
      const off = (time * this.arrowSpeed) % 14;
      this.arrows.position.set(this.arrowDir[0] * off, 0, this.arrowDir[1] * off);
    }
  }

  dispose() {
    for (const m of [this.sea, this.disc, this.arrows, this.ribbon]) {
      if (!m) continue;
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this.disc = null; this.arrows = null; this.ribbon = null;
  }
}
