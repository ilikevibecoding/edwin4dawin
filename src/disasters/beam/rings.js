// A small set of glowing rings driven entirely by uniforms (radius, width, alpha, height and centre per ring) in
// one geometry: used for the destruction wave (dust wall + shock glow + trailing dust), the cloud rings pushed
// outward where the diagonal beam crosses the cloud layer, and the preview target marker. Rings are flat discs
// (width > 0) or vertical curtains (width < 0 = height). Each ring also has a "body" factor: 0 = pure additive
// glow, 1 = ordinary translucent dust (premultiplied alpha), so a single material/draw call covers both looks.
// Curtains get a slow animated noise so a dust wall reads as billowing dust rather than a flat band.
import * as THREE from 'three';

export const RING_COUNT = 8;
const SEGMENTS = 72;

const VERT = /* glsl */ `
attribute float aRing;
attribute float aEdge;
attribute float aAngle;
uniform vec4 uRings[${RING_COUNT}];   // x radius, y width (negative = vertical band of that height), z alpha, w world y
uniform vec4 uColors[${RING_COUNT}];  // rgb colour, w body (0 additive .. 1 opaque-ish)
uniform vec3 uCenters[${RING_COUNT}]; // x, (unused), z centre per ring
uniform float uTime;
varying float vEdge;
varying float vAlpha;
varying float vVert;
varying float vAngle;
varying vec4 vColor;
void main() {
  int i = int(aRing + 0.5);
  vec4 r = uRings[i];
  vec3 c = uCenters[i];
  float rad = r.y < 0.0 ? r.x : r.x + aEdge * r.y;
  float y = r.y < 0.0 ? r.w - aEdge * r.y : r.w;
  // curtains billow: the top edge undulates around the ring
  if (r.y < 0.0) { float w = 0.92 + 0.08 * sin(aAngle * 9.0 + uTime * 1.7) * sin(aAngle * 4.0 - uTime * 1.1); y = r.w - aEdge * r.y * w; rad += aEdge * (w - 1.0) * 6.0; }
  vec3 world = vec3(c.x + cos(aAngle) * rad, y, c.z + sin(aAngle) * rad);
  vEdge = aEdge; vAlpha = r.z; vColor = uColors[i]; vVert = r.y < 0.0 ? 1.0 : 0.0; vAngle = aAngle;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;
const FRAG = /* glsl */ `
uniform float uTime;
varying float vEdge;
varying float vAlpha;
varying float vVert;
varying float vAngle;
varying vec4 vColor;
void main() {
  // flat rings fade at both edges; vertical bands are dense up to about half their height and thin out to the top
  float a = mix(sin(vEdge * 3.14159), 1.0 - smoothstep(0.6, 1.0, vEdge), vVert) * vAlpha;
  // dusty texture on curtains: two scales of puffs, and a dust wall is darker at its foot and sunlit at the top
  float tex = 0.8 + 0.2 * sin(vAngle * 31.0 + vEdge * 6.0 + uTime * 2.3) * sin(vAngle * 13.0 - uTime * 1.3);
  tex *= 0.9 + 0.1 * sin(vAngle * 71.0 - vEdge * 9.0 + uTime * 3.1);
  float k = vVert * vColor.w;
  a *= mix(1.0, tex, k);
  vec3 col = vColor.rgb * mix(1.0, 0.7 + 0.55 * vEdge, k);
  gl_FragColor = vec4(col * a, a * vColor.w);
}`;

export class RingSet {
  constructor(scene) {
    this.scene = scene;
    const pos = new Float32Array(RING_COUNT * (SEGMENTS + 1) * 2 * 3);
    const ring = [], edge = [], angle = [], idx = [];
    for (let r = 0; r < RING_COUNT; r++) {
      const base = r * (SEGMENTS + 1) * 2;
      for (let s = 0; s <= SEGMENTS; s++) {
        const a = (s / SEGMENTS) * Math.PI * 2;
        ring.push(r, r); edge.push(0, 1); angle.push(a, a);
        if (s < SEGMENTS) { const k = base + s * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); // placeholder; real positions come from the shader
    g.setAttribute('aRing', new THREE.Float32BufferAttribute(ring, 1));
    g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
    g.setAttribute('aAngle', new THREE.Float32BufferAttribute(angle, 1));
    g.setIndex(idx);
    this.geometry = g;
    this.rings = [];
    this.colors = [];
    this.centers = [];
    for (let i = 0; i < RING_COUNT; i++) { this.rings.push(new THREE.Vector4(0, 1, 0, 60)); this.colors.push(new THREE.Vector4(1, 1, 1, 0)); this.centers.push(new THREE.Vector3()); }
    // premultiplied-alpha blending: out = src + dst * (1 - a * body); body 0 is pure additive glow
    this.material = new THREE.ShaderMaterial({
      uniforms: { uRings: { value: this.rings }, uColors: { value: this.colors }, uCenters: { value: this.centers }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  // Centre of every ring (the usual case: everything around the impact point)
  setCenter(x, z) { for (let i = 0; i < RING_COUNT; i++) this.centers[i].set(x, 0, z); }
  // Centre of one ring (e.g. cloud rings where the diagonal beam crosses the cloud layer)
  setRingCenter(i, x, z) { this.centers[i].set(x, 0, z); }
  // body: 0 = additive light, 1 = translucent dust that also darkens/covers what is behind it
  setColor(i, r, g, b, body = 0) { this.colors[i].set(r, g, b, body); }
  set(i, radius, width, alpha, y) { this.rings[i].set(radius, width, alpha, y); }
  hide(i) { this.rings[i].z = 0; }

  // Call once per frame after setting rings: hides the mesh entirely when nothing is visible.
  commit(time = 0) {
    this.material.uniforms.uTime.value = time;
    let any = false;
    for (let i = 0; i < RING_COUNT; i++) if (this.rings[i].z > 0.003) { any = true; break; }
    this.mesh.visible = any;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
