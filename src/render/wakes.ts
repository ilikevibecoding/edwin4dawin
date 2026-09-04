import * as THREE from 'three';

/** Top-down render target holding foam (R) and normal perturbation (GB) for boat and float wakes.
 *  Anything that disturbs the water adds a ribbon mesh to `scene`. */
export class WakeMap {
  readonly rt: THREE.WebGLRenderTarget;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly center = new THREE.Vector2();
  readonly size: number;

  constructor(resolution = 1024, size = 3200) {
    this.size = size;
    this.rt = new THREE.WebGLRenderTarget(resolution, resolution, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.rt.texture.wrapS = this.rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.camera = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 1, 400);
    this.camera.up.set(0, 0, -1);
  }

  get texture(): THREE.Texture { return this.rt.texture; }

  render(renderer: THREE.WebGLRenderer, camX: number, camZ: number): void {
    this.center.set(Math.round(camX / 8) * 8, Math.round(camZ / 8) * 8);
    this.camera.position.set(this.center.x, 200, this.center.y);
    this.camera.lookAt(this.center.x, 0, this.center.y);
    this.camera.updateMatrixWorld();
    const prev = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x008080, 0);
    renderer.clear(true, false, false);
    renderer.render(this.scene, this.camera);
    renderer.setClearColor(prevClear, prevAlpha);
    renderer.setRenderTarget(prev);
  }
}

/** Ribbon material: foam intensity fades along the trail; normals encode a V-shaped wake. */
export const WAKE_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    attribute float aAge;     // 0 fresh .. 1 old
    attribute float aSide;    // -1 .. 1 across the ribbon
    varying float vAge; varying float vSide; varying vec2 vWp;
    void main() { vAge = aAge; vSide = aSide; vWp = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    varying float vAge; varying float vSide; varying vec2 vWp;
    uniform float uStrength;
    float h21(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      float edge = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
      float life = 1.0 - vAge;
      // turbulent white core right behind the hull, fading and thinning with age, plus fainter V arms;
      // kept wide enough to survive the wake map's ~1.6 m texels (the old thin twin lines aliased into dots)
      float core = (1.0 - smoothstep(0.0, 0.9, abs(vSide))) * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 0.5, vAge)));
      float arms = smoothstep(0.45, 0.8, abs(vSide)) * (1.0 - smoothstep(0.85, 1.0, abs(vSide))) * 0.5;
      // world-anchored breakup so a long wake reads as churned foam patches, not a chalk line
      float breakup = 0.55 + 0.45 * vn(vWp * 0.35) * (0.7 + 0.6 * vn(vWp * 1.3 + 4.0));
      float foam = (core + arms) * life * life * edge * uStrength * breakup;
      vec2 n = vec2(sign(vSide) * 0.35 * life * edge, 0.0);
      gl_FragColor = vec4(foam, 0.5 + n.x, 0.5 + n.y, edge * life);
    }
  `,
  uniforms: { uStrength: { value: 1.0 } },
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.NormalBlending,
});

/** Contrail ribbon drawn in the main scene: soft white, fading with age, slightly hazy. */
export const CONTRAIL_MATERIAL = new THREE.ShaderMaterial({
  // drawn in the main scene: must write/compare log depth like every other material there
  vertexShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    attribute float aAge; attribute float aSide;
    varying float vAge; varying float vSide;
    void main() {
      vAge = aAge; vSide = aSide;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying float vAge; varying float vSide;
    uniform float uStrength;
    void main() {
      #include <logdepthbuf_fragment>
      float edge = 1.0 - smoothstep(0.2, 1.0, abs(vSide));
      float life = (1.0 - vAge);
      float a = edge * life * life * uStrength * smoothstep(0.0, 0.05, vAge);
      gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
    }
  `,
  uniforms: { uStrength: { value: 0.7 } },
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/** Hull contact decal: a soft foam/meniscus ring around a floating hull so it never sits on glass. Lives in
 *  the main scene just above the water surface (see HullStamp). */
const HULL_STAMP_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying vec2 vUv;
    uniform vec2 uHull;      // hull half-extents as a fraction of the quad (x along, y across)
    uniform float uStrength;
    float hash21(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 q) {
      vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
    }
    void main() {
      #include <logdepthbuf_fragment>
      vec2 p = (vUv - 0.5) * 2.0;
      // signed distance to the rounded hull outline, in quad units
      vec2 d = abs(p) / uHull;
      float r = length(max(d - 0.6, 0.0)) + min(max(d.x - 0.6, d.y - 0.6), 0.0);
      float outside = max(r - 0.4, 0.0);              // 0 at the hull edge, grows outward
      float ring = exp(-outside * outside * 40.0);     // thin foam meniscus hugging the hull
      float halo = exp(-outside * outside * 6.0) * 0.18; // faint disturbed-water patch
      // break the ring up with two octaves of value noise so it reads as foam, not a glow
      vec2 np = p * vec2(9.0, 4.0);
      float nz = 0.5 * vnoise(np) + 0.5 * vnoise(np * 2.3 + 7.1);
      float foam = (ring * (0.55 + 0.6 * nz) + halo * (0.6 + 0.4 * nz)) * uStrength * smoothstep(1.0, 0.85, max(abs(p.x), abs(p.y)));
      // drawn as a decal in the main scene (the shared wake map is ~3 m/px, far too coarse for a hull ring):
      // sky-lit foam, slightly translucent so the water colour shows through the halo
      gl_FragColor = vec4(vec3(0.90, 0.94, 0.97), clamp(foam, 0.0, 0.85));
    }
  `,
  uniforms: { uHull: { value: new THREE.Vector2(0.72, 0.28) }, uStrength: { value: 1.0 } },
  transparent: true,
  depthTest: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export class HullStamp {
  readonly mesh: THREE.Mesh;
  constructor(length: number, beam: number, strength = 1) {
    const w = length + 2.6, h = beam + 2.2;
    const mat = HULL_STAMP_MATERIAL.clone();
    mat.uniforms.uHull.value = new THREE.Vector2(length / w, beam / h);
    mat.uniforms.uStrength.value = strength;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 6; // after the water surface (5)
  }

  private static readonly flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  private readonly spin = new THREE.Quaternion();
  private static readonly up = new THREE.Vector3(0, 1, 0);

  /** Place the stamp under a hull centre at (x, z); (dx, dz) is the hull's forward direction in the XZ plane. */
  update(x: number, z: number, dx: number, dz: number, active: boolean, strength = 1): void {
    this.mesh.visible = active;
    if (!active) return;
    this.mesh.position.set(x, 0.07, z);
    // lay the quad flat, then turn its local X (hull length) onto the forward direction
    this.spin.setFromAxisAngle(HullStamp.up, Math.atan2(-dz, dx));
    this.mesh.quaternion.copy(this.spin).multiply(HullStamp.flat);
    (this.mesh.material as THREE.ShaderMaterial).uniforms.uStrength.value = strength;
  }
}

/** Fixed-capacity trail of quads following an emitter. Positions are in world space. */
export class WakeTrail {
  readonly mesh: THREE.Mesh;
  private readonly capacity: number;
  private readonly positions: Float32Array;
  private readonly ages: Float32Array;
  private readonly sides: Float32Array;
  private readonly points: { x: number; z: number; dx: number; dz: number; t: number }[] = [];
  private lastX = NaN;
  private lastZ = NaN;
  private readonly geo: THREE.BufferGeometry;

  constructor(capacity: number, private width: number, private lifetime: number, strength = 1, material: THREE.ShaderMaterial = WAKE_MATERIAL) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 2 * 3);
    this.ages = new Float32Array(capacity * 2);
    this.sides = new Float32Array(capacity * 2);
    const idx: number[] = [];
    for (let i = 0; i < capacity - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('aAge', new THREE.BufferAttribute(this.ages, 1));
    this.geo.setAttribute('aSide', new THREE.BufferAttribute(this.sides, 1));
    this.geo.setIndex(idx);
    this.geo.setDrawRange(0, 0);
    const mat = material.clone();
    mat.uniforms.uStrength.value = strength;
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  /** Call every frame with the emitter's world position; `active` false lets the trail fade out. */
  update(x: number, z: number, time: number, active: boolean, speed: number): void {
    if (active && (Number.isNaN(this.lastX) || Math.hypot(x - this.lastX, z - this.lastZ) > Math.max(2.0, speed * 0.25))) {
      const dx = Number.isNaN(this.lastX) ? 1 : x - this.lastX, dz = Number.isNaN(this.lastZ) ? 0 : z - this.lastZ;
      const l = Math.hypot(dx, dz) || 1;
      this.points.push({ x, z, dx: dx / l, dz: dz / l, t: time });
      if (this.points.length > this.capacity) this.points.shift();
      this.lastX = x; this.lastZ = z;
    }
    // drop expired
    while (this.points.length && time - this.points[0].t > this.lifetime) this.points.shift();
    const n = this.points.length;
    for (let i = 0; i < n; i++) {
      const p = this.points[i];
      const age = Math.min(1, (time - p.t) / this.lifetime);
      // the foamy wake spreads slowly with age (the Kelvin wave pattern itself is not foam)
      const w = this.width * (0.6 + 1.8 * age);
      const nx = -p.dz * w, nz = p.dx * w;
      this.positions[i * 6] = p.x - nx; this.positions[i * 6 + 1] = 0.05; this.positions[i * 6 + 2] = p.z - nz;
      this.positions[i * 6 + 3] = p.x + nx; this.positions[i * 6 + 4] = 0.05; this.positions[i * 6 + 5] = p.z + nz;
      this.ages[i * 2] = age; this.ages[i * 2 + 1] = age;
      this.sides[i * 2] = -1; this.sides[i * 2 + 1] = 1;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAge.needsUpdate = true;
    this.geo.attributes.aSide.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
  }

  reset(): void {
    this.points.length = 0;
    this.lastX = NaN; this.lastZ = NaN;
    this.geo.setDrawRange(0, 0);
  }
}
