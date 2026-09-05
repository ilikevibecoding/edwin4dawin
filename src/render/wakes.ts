import * as THREE from 'three';

/** Top-down render target holding foam (R) and normal perturbation (GB) for boat and float wakes.
 *  Anything that disturbs the water adds a ribbon mesh to `scene`. */
export class WakeMap {
  readonly rt: THREE.WebGLRenderTarget;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly center = new THREE.Vector2();
  readonly size: number;
  /** every wake ribbon (boats, floats) in one draw; trails are created with it as their target */
  readonly batch = new WakeBatch();

  constructor(resolution = 1024, size = 3200) {
    this.size = size;
    this.rt = new THREE.WebGLRenderTarget(resolution, resolution, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.rt.texture.wrapS = this.rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.camera = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 1, 400);
    this.camera.up.set(0, 0, -1);
    this.scene.add(this.batch.mesh);
  }

  get texture(): THREE.Texture { return this.rt.texture; }

  render(renderer: THREE.WebGLRenderer, camX: number, camZ: number): void {
    this.batch.upload();
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
    attribute float aFade;    // 0 at a trail start / gap, 1 in the body
    varying float vAge; varying float vSide; varying vec2 vWp; varying float vFade;
    void main() { vAge = aAge; vSide = aSide; vFade = aFade; vWp = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    varying float vAge; varying float vSide; varying vec2 vWp; varying float vFade;
    uniform float uStrength;
    float h21(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      float edge = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
      float life = 1.0 - vAge;
      // turbulent white core right behind the hull, fading and thinning with age, plus fainter V arms;
      // kept wide enough to survive the wake map's ~1.6 m texels (the old thin twin lines aliased into dots)
      float core = (1.0 - smoothstep(0.0, 0.9, abs(vSide))) * (0.45 + 0.4 * (1.0 - smoothstep(0.0, 0.5, vAge)));
      float arms = smoothstep(0.45, 0.8, abs(vSide)) * (1.0 - smoothstep(0.85, 1.0, abs(vSide))) * 0.5;
      // world-anchored breakup so a long wake reads as churned foam patches, not a chalk line; the
      // contrast is highest right behind the hull where the fresh froth is most turbulent
      float breakup = 0.4 + 0.6 * vn(vWp * 0.35) * (0.6 + 0.8 * vn(vWp * 1.3 + 4.0));
      breakup = mix(breakup, 0.3 + 0.9 * vn(vWp * 2.6 + 11.0) * breakup, 1.0 - smoothstep(0.0, 0.25, vAge));
      float foam = (core + arms) * life * life * edge * uStrength * breakup * vFade;
      vec2 n = vec2(sign(vSide) * 0.35 * life * edge * vFade, 0.0);
      gl_FragColor = vec4(foam, 0.5 + n.x, 0.5 + n.y, edge * life * vFade);
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
    attribute float aAge; attribute float aSide; attribute float aFade;
    varying float vAge; varying float vSide; varying float vFade;
    void main() {
      vAge = aAge; vSide = aSide; vFade = aFade;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying float vAge; varying float vSide; varying float vFade;
    uniform float uStrength;
    void main() {
      #include <logdepthbuf_fragment>
      float edge = 1.0 - smoothstep(0.2, 1.0, abs(vSide));
      float life = (1.0 - vAge);
      float a = edge * life * life * uStrength * smoothstep(0.0, 0.05, vAge) * vFade;
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
      vec2 p = (vUv - 0.5) * 2.0;              // x: -1 stern .. +1 bow, y across
      // waterline plan of a float: fullest a little aft of midships, drawn to a fine bow and a narrower stern
      float along = clamp(p.x / uHull.x, -1.0, 1.0);
      float bowT = smoothstep(-0.2, 1.0, along), sternT = smoothstep(0.1, -1.0, along);
      float halfBeam = uHull.y * (1.0 - 0.94 * pow(bowT, 2.2)) * (1.0 - 0.55 * pow(sternT, 1.8));
      float side = abs(p.y) - halfBeam;
      float ends = abs(p.x) - uHull.x;
      float outside = max(max(side, ends), 0.0);      // 0 inside the hull outline, grows outward (quad units)
      float inside = max(-max(side, ends), 0.0);
      // streaky, world-scale foam grain stretched along the hull (the meniscus is fed by the tiny bow wave and
      // trails aft along the waterline rather than forming an even ring)
      vec2 np = vec2(p.x * 7.0, p.y * 26.0);
      float grain = 0.55 * vnoise(np) + 0.45 * vnoise(np * 2.1 + vec2(3.7, 9.2));
      float streak = vnoise(vec2(p.x * 3.0, p.y * 40.0) + 1.3);
      // meniscus: a thin bright line on the hull side, strongest at the bow, thinning toward the stern
      float lineW = 0.018 + 0.03 * bowT;
      float meniscus = exp(-outside * outside / (lineW * lineW)) * (0.6 + 0.5 * bowT) * (0.55 + 0.7 * grain);
      // bow ripple: two faint crescents ahead of the stem
      vec2 stem = vec2(uHull.x, 0.0);
      float rb = length((p - stem) * vec2(1.0, 1.6));
      float ahead = smoothstep(-0.05, 0.15, p.x - uHull.x) * smoothstep(0.7, 0.2, rb);
      float ripple = (0.5 + 0.5 * cos(rb * 44.0)) * ahead * 0.35 * smoothstep(0.02, 0.08, rb);
      // disturbed water: a soft halo hugging the waterline, dragged aft into a faint streak behind the stern
      float halo = exp(-outside * 14.0) * 0.16 * (0.6 + 0.6 * streak);
      float wake = smoothstep(0.0, 0.6, -p.x - uHull.x) * exp(-abs(p.y) * abs(p.y) / (uHull.y * uHull.y * 0.5)) * 0.10 * (0.5 + streak);
      // the hull itself covers the inside; fade the decal there so nothing shows through gaps at the bow/stern
      float coverage = 1.0 - smoothstep(0.0, 0.06, inside);
      float foam = (meniscus + ripple + halo + wake) * coverage * uStrength * smoothstep(1.0, 0.85, max(abs(p.x), abs(p.y)));
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

/**
 * Every wake ribbon of the wake map in one draw. Each trail keeps its own ribbon arrays; before the map is
 * rendered the batch copies the live points of every trail, in the order the trails were added (the order
 * the separate meshes used to be drawn in, so the blending of crossing wakes is unchanged), into shared
 * buffers and builds the index for the quads that exist this frame. The trail strength, a uniform of the
 * per-trail materials before, rides along as a flat per-vertex attribute.
 */
export class WakeBatch {
  readonly mesh: THREE.Mesh;
  private readonly trails: WakeTrail[] = [];
  private readonly geo = new THREE.BufferGeometry();
  private capacity = 0;
  private positions = new Float32Array(0);
  private ages = new Float32Array(0);
  private sides = new Float32Array(0);
  private fades = new Float32Array(0);
  private strengths = new Float32Array(0);
  private index = new Uint32Array(0);

  constructor() {
    const mat = WAKE_MATERIAL.clone();
    mat.vertexShader = mat.vertexShader
      .replace('attribute float aFade;', 'attribute float aFade; attribute float aStrength;')
      .replace('varying float vFade;', 'varying float vFade; flat varying float vStrength;')
      .replace('vFade = aFade;', 'vFade = aFade; vStrength = aStrength;');
    mat.fragmentShader = mat.fragmentShader
      .replace('varying float vFade;', 'varying float vFade; flat varying float vStrength;')
      .replace('uniform float uStrength;', '')
      .replace('* uStrength *', '* vStrength *');
    mat.uniforms = {};
    this.geo.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  add(trail: WakeTrail): void {
    this.trails.push(trail);
    this.capacity += trail.capacity;
  }

  /** Gather the ribbons of every trail into the shared buffers. */
  upload(): void {
    if (this.positions.length !== this.capacity * 6) this.allocate();
    let v = 0, n = 0;
    const { positions, ages, sides, fades, strengths, index } = this;
    for (const t of this.trails) {
      const pts = t.count;
      if (pts === 0) continue;
      const verts = pts * 2;
      positions.set(t.positions.subarray(0, verts * 3), v * 3);
      ages.set(t.ages.subarray(0, verts), v);
      sides.set(t.sides.subarray(0, verts), v);
      fades.set(t.fades.subarray(0, verts), v);
      strengths.fill(t.strength, v, v + verts);
      for (let i = 0; i < pts - 1; i++) {
        const a = v + i * 2, b = a + 1, c = a + 2, d = a + 3;
        index[n++] = a; index[n++] = c; index[n++] = b; index[n++] = b; index[n++] = c; index[n++] = d;
      }
      v += verts;
    }
    const g = this.geo;
    for (const name of ['position', 'aAge', 'aSide', 'aFade', 'aStrength']) {
      const attr = g.getAttribute(name) as THREE.BufferAttribute;
      attr.clearUpdateRanges();
      if (v > 0) attr.addUpdateRange(0, v * attr.itemSize);
      attr.needsUpdate = true;
    }
    const idx = g.index!;
    idx.clearUpdateRanges();
    if (n > 0) idx.addUpdateRange(0, n);
    idx.needsUpdate = true;
    g.setDrawRange(0, n);
  }

  private allocate(): void {
    const cap = this.capacity;
    this.positions = new Float32Array(cap * 6);
    this.ages = new Float32Array(cap * 2);
    this.sides = new Float32Array(cap * 2);
    this.fades = new Float32Array(cap * 2);
    this.strengths = new Float32Array(cap * 2);
    this.index = new Uint32Array(Math.max(6, cap * 6));
    const g = this.geo;
    g.dispose();
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAge', new THREE.BufferAttribute(this.ages, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSide', new THREE.BufferAttribute(this.sides, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aFade', new THREE.BufferAttribute(this.fades, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aStrength', new THREE.BufferAttribute(this.strengths, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(this.index, 1).setUsage(THREE.DynamicDrawUsage));
  }
}

/** Fixed-capacity trail of quads following an emitter. Positions are in world space. Standalone trails
 *  (contrails, wingtip vortices in the main scene) own a mesh; trails given a WakeBatch are drawn by it. */
export class WakeTrail {
  /** null for a batched trail */
  readonly mesh: THREE.Mesh | null = null;
  readonly capacity: number;
  readonly strength: number;
  readonly positions: Float32Array;
  readonly ages: Float32Array;
  readonly sides: Float32Array;
  readonly fades: Float32Array;
  /** live points (vertices = 2 * count, quads = count - 1) */
  count = 0;
  private readonly points: { x: number; z: number; dx: number; dz: number; t: number; fade: number }[] = [];
  private lastX = NaN;
  private lastZ = NaN;
  /** points still to emit at reduced strength after a trail start or a gap */
  private ramp = 0;
  private readonly geo: THREE.BufferGeometry | null = null;

  constructor(capacity: number, private width: number, private lifetime: number, strength = 1, target: THREE.ShaderMaterial | WakeBatch = WAKE_MATERIAL) {
    this.capacity = capacity;
    this.strength = strength;
    this.positions = new Float32Array(capacity * 2 * 3);
    this.ages = new Float32Array(capacity * 2);
    this.sides = new Float32Array(capacity * 2);
    this.fades = new Float32Array(capacity * 2);
    if (target instanceof WakeBatch) { target.add(this); return; }
    const idx: number[] = [];
    for (let i = 0; i < capacity - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('aAge', new THREE.BufferAttribute(this.ages, 1));
    this.geo.setAttribute('aSide', new THREE.BufferAttribute(this.sides, 1));
    this.geo.setAttribute('aFade', new THREE.BufferAttribute(this.fades, 1));
    this.geo.setIndex(idx);
    this.geo.setDrawRange(0, 0);
    const mat = target.clone();
    mat.uniforms.uStrength.value = strength;
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  /** Call every frame with the emitter's world position; `active` false lets the trail fade out. */
  update(x: number, z: number, time: number, active: boolean, speed: number): void {
    const RAMP = 4;
    const fresh = Number.isNaN(this.lastX);
    const dist = fresh ? 0 : Math.hypot(x - this.lastX, z - this.lastZ);
    if (active && (fresh || dist > Math.max(2.0, speed * 0.25))) {
      const dx = fresh ? 1 : x - this.lastX, dz = fresh ? 0 : z - this.lastZ;
      const l = Math.hypot(dx, dz) || 1;
      // the emitter left the surface (bounce, skip, take-off) and came back: close the old ribbon with a
      // zero-length invisible quad and start a new one here instead of bridging the gap with foam
      const gap = !fresh && dist > Math.max(12, speed * 1.5);
      if (gap) {
        const last = this.points[this.points.length - 1];
        if (last) this.points.push({ ...last, fade: 0 });
      }
      if (fresh || gap) this.ramp = RAMP;
      const fade = this.ramp > 0 ? 1 - this.ramp-- / (RAMP + 1) : 1;
      this.points.push({ x, z, dx: dx / l, dz: dz / l, t: time, fade });
      while (this.points.length > this.capacity) this.points.shift();
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
      this.fades[i * 2] = p.fade; this.fades[i * 2 + 1] = p.fade;
    }
    this.count = n;
    const geo = this.geo;
    if (!geo) return;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAge.needsUpdate = true;
    geo.attributes.aSide.needsUpdate = true;
    geo.attributes.aFade.needsUpdate = true;
    geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
  }

  reset(): void {
    this.points.length = 0;
    this.lastX = NaN; this.lastZ = NaN;
    this.ramp = 0;
    this.count = 0;
    this.geo?.setDrawRange(0, 0);
  }
}
