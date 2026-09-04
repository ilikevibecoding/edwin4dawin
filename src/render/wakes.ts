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
    varying float vAge; varying float vSide;
    void main() { vAge = aAge; vSide = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    varying float vAge; varying float vSide;
    uniform float uStrength;
    void main() {
      float edge = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
      float life = 1.0 - vAge;
      // foam is strongest along the two arms of the V and right behind the hull
      float arms = smoothstep(0.35, 0.75, abs(vSide)) * 0.9 + (1.0 - smoothstep(0.0, 0.3, abs(vSide))) * 0.7 * (1.0 - smoothstep(0.0, 0.35, vAge));
      float foam = arms * life * life * edge * uStrength;
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
  vertexShader: /* glsl */ `
    attribute float aAge; attribute float aSide;
    varying float vAge; varying float vSide;
    void main() { vAge = aAge; vSide = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    varying float vAge; varying float vSide;
    uniform float uStrength;
    void main() {
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
      // wake widens with age (Kelvin pattern ~19.5 degrees)
      const w = this.width * (0.35 + 1.3 * age);
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
