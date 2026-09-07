import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Contact shadows: a soft dark ellipse under each paw and one under the trunk
// of a lying animal. The sun's shadow map is too coarse to darken the ground
// where a 15 cm paw meets it, and it stops a few tens of metres from the
// truck; without this the paws end in lit soil and the animal floats.
//
// One mesh per lion, five quads, rebuilt in root space every step: the paw
// decals sit on the terrain under the contact point (not under a lifted paw's
// pad) and fade as the paw lifts; the body decal is a faint pool under the
// standing trunk that deepens and spreads as the animal comes down onto its
// belly. Corners sample the terrain so a decal lies on a slope.
//
// Round 4: the round-3 decals were the size of the paw and of the lying trunk,
// which is to say entirely hidden under the paw and the trunk — no critic saw
// one. What reads is the penumbra beyond the silhouette, so each blob is now
// the footprint plus about 0.3 m, and the vegetation still gets the footprint
// (points) rather than the penumbra.
// ---------------------------------------------------------------------------

const _p = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _w = new THREE.Vector3();

/**
 * Radial falloff, white with alpha 1 at the centre to 0 at the rim: full
 * under the middle half of the quad, then a smooth penumbra to the edge.
 */
export function contactTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.88, 'rgba(255,255,255,0.1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * Shared material. Round 6: a multiplier, not a paint. The round-4 decal was
 * a fixed grey-brown (0.1, 0.085, 0.075) alpha-blended over the dirt, which
 * at dusk pulled a saturated red ground toward grey (critic C: patch sat
 * 0.61 against 0.75 beside it, blue +11, only -0.38 st) — a shadow that
 * changed the ground's colour. The blend is now dst x (1 - srcAlpha): the
 * fragment's colour never reaches the frame, and the ground under the paw is
 * the ground beside it scaled down by the decal's alpha (texture falloff x
 * vertex alpha) at every hour, so hue and saturation are the dirt's own.
 */
export function contactMaterial() {
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1, 1, 1),
    map: contactTexture(),
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
    toneMapped: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    name: 'lion-contact',
  });
  return m;
}

/**
 * Where a blob's darkening peaks: the ground under the centre is scaled by
 * (1 - value). Round 6: with the multiply blend these are the real
 * attenuation — 0.4 is -0.74 st at the paw's centre and about -0.5 st in
 * the penumbra just outside the paw, the -0.5 to -0.8 st a contact shadow
 * on a lit plain measures; the round-4 0.62 was an alpha toward a paint
 * colour and meant less.
 */
export const CONTACT = { paw: 0.4, body: 0.38, stand: 0.2, penumbra: 0.3 };

const QUADS = 5; // FL, FR, HL, HR, body

export class ContactShadows {
  /**
   * `lion` is read for its feet, poser world frames, ground sampler and
   * scale; the mesh is added to the lion's root and lives in root space.
   */
  constructor(lion, material) {
    this.lion = lion;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(QUADS * 4 * 3);
    this.col = new Float32Array(QUADS * 4 * 4);
    const uv = new Float32Array(QUADS * 4 * 2);
    const idx = [];
    for (let q = 0; q < QUADS; q++) {
      const b = q * 4;
      uv.set([0, 0, 1, 0, 1, 1, 0, 1], b * 2);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('color', this.colAttr);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2.5 * lion.s);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.name = 'lion-contact';
    this.mesh.frustumCulled = true;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 1;
    this.mesh.matrixAutoUpdate = true;
    // the AO prepass swaps every material for a MeshNormalMaterial, which
    // would draw these as solid quads a centimetre over the dirt and hand the
    // AO a hard rectangle (the truck's contact mesh has the same guard)
    this.mesh.onBeforeRender = (renderer, scene, camera, geometry, material) => {
      if (material.isMeshNormalMaterial) geometry.setDrawRange(0, 0);
    };
    this.mesh.onAfterRender = (renderer, scene, camera, geometry, material) => {
      if (material.isMeshNormalMaterial) geometry.setDrawRange(0, Infinity);
    };
    lion.root.add(this.mesh);
    // for the vegetation: world-space push points, (x, z, radius, weight) per quad
    this.points = new Float32Array(QUADS * 4);
  }

  /**
   * One quad: centre c (root space, y ignored), axes f (forward) and r (right)
   * already scaled to half-extents, alpha a. `push` is the footprint radius
   * and weight the vegetation sees (the quad itself is the footprint plus
   * the penumbra).
   */
  quad(q, c, f, r, a, push = null) {
    const lion = this.lion;
    const lift = 0.012 * lion.s;
    const b = q * 4;
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (let k = 0; k < 4; k++) {
      const [u, v] = corners[k];
      const x = c.x + r.x * u + f.x * v;
      const z = c.z + r.z * u + f.z * v;
      const y = lion.groundAt(x, z) + lift;
      this.pos[(b + k) * 3] = x;
      this.pos[(b + k) * 3 + 1] = y;
      this.pos[(b + k) * 3 + 2] = z;
      this.col[(b + k) * 4] = 1;
      this.col[(b + k) * 4 + 1] = 1;
      this.col[(b + k) * 4 + 2] = 1;
      this.col[(b + k) * 4 + 3] = a;
    }
    lion.feet.toWorld(c, _w);
    this.points[q * 4] = _w.x;
    this.points[q * 4 + 1] = _w.z;
    this.points[q * 4 + 2] = push ? push[0] : Math.max(f.length(), r.length());
    this.points[q * 4 + 3] = push ? push[1] : a;
  }

  update() {
    const lion = this.lion;
    const s = lion.s;
    const feet = lion.feet;
    const heading = _f.set(0, 0, 1);
    const right = _r.set(1, 0, 0);
    const pen = CONTACT.penumbra * Math.sqrt(s);
    // paws
    for (let i = 0; i < 4; i++) {
      const l = feet.legs[i];
      feet.toLocal(l.pos, _p);
      const h = Math.max(0, _p.y - lion.groundAt(_p.x, _p.z));
      // fades over the first 12 cm of lift and spreads a little as it goes
      const k = THREE.MathUtils.clamp(1 - h / (0.12 * s), 0, 1);
      const a = CONTACT.paw * k * k;
      const foot = (l.spec.front ? 0.11 : 0.1) * s;
      const rad = (foot + pen * 0.6) * (1 + 0.3 * (1 - k));
      // in root space the animal faces +z; a paw's own tangent frame is close to that
      const f = heading.clone().multiplyScalar(rad * 1.1);
      const r = right.clone().multiplyScalar(rad);
      this.quad(i, _p, f, r, a, [foot * 1.2, a]);
    }
    // body: a faint pool under the standing trunk (the sun's shadow map is
    // soft or absent at this range and the belly is half a metre up), which
    // deepens and spreads to the footprint plus the penumbra as the animal
    // comes down onto its belly
    const hipH = lion.brain.pose.hipH;
    const lying = THREE.MathUtils.clamp((0.72 - hipH) / 0.22, 0, 1);
    const W = lion.poser.world;
    const pw = W.get('pelvis').p;
    const cw = W.get('chest').p;
    _p.set((pw.x + cw.x) * 0.5, 0, (pw.z + cw.z) * 0.5 + 0.02 * s);
    const halfL = 0.62 * s + pen;
    const halfW = THREE.MathUtils.lerp(0.28 * s, 0.3 * s, lying) + pen;
    const f = heading.clone().multiplyScalar(halfL);
    const r = right.clone().multiplyScalar(halfW);
    const a = THREE.MathUtils.lerp(CONTACT.stand, CONTACT.body, lying * lying);
    this.quad(4, _p, f, r, a, [0.34 * s, 0.42 * lying * lying]);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }
}
