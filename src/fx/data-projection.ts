/**
 * The stolen plans, rendered as a holographic data projection.
 *
 * Deliberately *not* a copy of any film hologram: this is an engineering
 * readout. A latitude/longitude wire sphere with an equatorial construction
 * trench and a recessed focusing dish, wrapped in three counter-rotating
 * annotation rings and a drifting scanline band. Everything is additive cyan
 * with a horizontal jitter so it reads as a projection rather than a model.
 */

import * as THREE from 'three';
import { PALETTE } from '../assets/materials';
import { Rng } from '../core/rng';
import type { QualitySettings } from '../core/quality';

const holoVert = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uJitter;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  void main() {
    vPos = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec3 p = position;
    // Horizontal band jitter: a projector fighting interference.
    float band = floor((p.y + uTime * 0.35) * 22.0);
    p.x += (hash(band) - 0.5) * uJitter * step(0.982, hash(band + 3.7));
    // The image assembles from the bottom up as it is revealed: h is the
    // fraction of the way up the authored volume, uReveal is the wavefront.
    float h = clamp((p.y + 1.2) / 2.4, 0.0, 1.0);
    float appear = smoothstep(0.0, 0.22, uReveal * 1.3 - h);
    p *= mix(0.001, 1.0, appear);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const holoFrag = /* glsl */ `
  uniform vec3  uColor;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 1.5);
    // Travelling scanlines plus a slow vertical sweep.
    float scan = 0.55 + 0.45 * sin((vPos.y * 46.0) - uTime * 5.0);
    float sweep = smoothstep(0.0, 0.14, abs(fract(vPos.y * 0.5 - uTime * 0.14) - 0.5));
    float a = (0.16 + fres * 0.9) * scan * uOpacity * mix(1.0, 0.45, sweep);
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * a * 1.6, a);
  }
`;

export class DataProjection {
  readonly group = new THREE.Group();
  private station = new THREE.Group();
  private rings: THREE.Object3D[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  private lineMaterials: THREE.LineBasicMaterial[] = [];
  private glyphGroup = new THREE.Group();
  private beamMat: THREE.MeshBasicMaterial;
  private beam: THREE.Mesh;
  private reveal = 0;
  private light: THREE.PointLight;

  constructor(quality: QualitySettings, seed = 'plans') {
    this.group.name = 'DataProjection';
    const rng = new Rng(seed);
    const colour = new THREE.Color(PALETTE.hologram);

    const makeHoloMat = (opacity: number) => {
      const m = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: colour.clone() },
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          uReveal: { value: 0 },
          uJitter: { value: 0.012 },
        },
        vertexShader: holoVert,
        fragmentShader: holoFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      this.materials.push(m);
      return m;
    };

    const lineMat = (opacity: number) => {
      const m = new THREE.LineBasicMaterial({
        color: colour,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      this.lineMaterials.push(m);
      return m;
    };

    /* ---- the station: a sphere with a trench and a focusing dish ---- */
    const seg = quality.level === 'low' ? 20 : 32;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg / 2), makeHoloMat(0.34));
    this.station.add(shell);

    // Wire meridians and parallels. Drawn explicitly rather than with
    // WireframeGeometry: a triangulated sphere produces a diagonal mesh so
    // dense that it swamps every feature actually worth reading.
    const circle = (radius: number, points = 72) =>
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: points + 1 }, (_, i) => {
          const a = (i / points) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        }),
      );
    for (let i = 1; i < 8; i++) {
      const lat = (i / 8) * Math.PI;
      const ring = new THREE.Line(circle(Math.sin(lat) * 1.004), lineMat(0.3));
      ring.position.y = Math.cos(lat);
      this.station.add(ring);
    }
    for (let i = 0; i < 12; i++) {
      const meridian = new THREE.Line(circle(1.004), lineMat(0.22));
      meridian.rotation.set(Math.PI / 2, 0, (i / 12) * Math.PI);
      this.station.add(meridian);
    }

    // Equatorial construction trench. This and the dish are the two features
    // that make the readout legible as a *station* at a glance, so both are
    // drawn well above the value of the shell they sit on.
    const trench = new THREE.Mesh(new THREE.TorusGeometry(1.01, 0.075, 8, 72), makeHoloMat(1.8));
    trench.rotation.x = Math.PI / 2;
    this.station.add(trench);
    for (const r of [1.055, 0.99]) {
      const rail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 97 }, (_, i) => {
            const a = (i / 96) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
          }),
        ),
        lineMat(1),
      );
      this.station.add(rail);
    }
    // Cross-ties across the trench, every few degrees.
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), makeHoloMat(0.9));
      tie.position.set(Math.cos(a) * 1.02, 0, Math.sin(a) * 1.02);
      this.station.add(tie);
    }

    // Recessed focusing dish on the upper hemisphere. Built inside a group
    // whose +Y is the surface normal, so the crater, its rim and the focal
    // spike stay aligned with each other and with the sphere underneath.
    const dishNormal = new THREE.Vector3(0.34, 0.62, -0.71).normalize();
    const dishGroup = new THREE.Group();
    dishGroup.position.copy(dishNormal).multiplyScalar(0.88);
    dishGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dishNormal);
    this.station.add(dishGroup);
    const crater = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 22, 10, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44),
      makeHoloMat(0.85),
    );
    crater.scale.set(1, 0.55, 1);
    crater.position.y = 0.17;
    dishGroup.add(crater);
    for (const [r, o] of [[0.42, 1.9], [0.3, 1.1], [0.17, 0.9]] as const) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.05, 6, 44), makeHoloMat(o));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.02 - (0.42 - r) * 0.22;
      dishGroup.add(rim);
    }
    // Eight emitter posts around the crater lip.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.035), makeHoloMat(1.2));
      post.position.set(Math.cos(a) * 0.42, 0.07, Math.sin(a) * 0.42);
      dishGroup.add(post);
    }
    const focus = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), makeHoloMat(2.4));
    focus.position.y = 0.05;
    dishGroup.add(focus);
    const spike = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 0.62, 0)]),
      lineMat(0.75),
    );
    dishGroup.add(spike);

    // Surface plating segments — a handful of raised quads.
    const plateCount = quality.level === 'low' ? 14 : 34;
    for (let i = 0; i < plateCount; i++) {
      const u = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(1 - u * u);
      const pos = new THREE.Vector3(Math.cos(theta) * r, u, Math.sin(theta) * r);
      if (pos.distanceTo(dishNormal) < 0.6) continue;
      const size = rng.range(0.08, 0.2);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(size, size * rng.range(0.6, 1.5)), makeHoloMat(0.7));
      plate.position.copy(pos).multiplyScalar(1.012);
      plate.lookAt(pos.clone().multiplyScalar(2));
      this.station.add(plate);
    }
    // Radial surface trenches running away from the dish, so the sphere has
    // some direction to it rather than reading as a bare globe.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const len = rng.range(0.25, 0.6);
      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 14 }, (_, k) => {
            const t = (k / 13) * len;
            const p = new THREE.Vector3(Math.cos(a) * Math.sin(t), Math.cos(t), Math.sin(a) * Math.sin(t));
            return p.multiplyScalar(1.008);
          }),
        ),
        lineMat(0.5),
      );
      arc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dishNormal);
      this.station.add(arc);
    }

    this.station.scale.setScalar(0.78);
    this.group.add(this.station);

    /* ---- annotation rings ---- */
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Group();
      const radius = 0.9 + i * 0.16;
      const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.004, 4, 72), makeHoloMat(0.55));
      torus.rotation.x = Math.PI / 2;
      ring.add(torus);
      // Tick marks around the ring.
      const ticks = 24 + i * 8;
      for (let k = 0; k < ticks; k++) {
        const a = (k / ticks) * Math.PI * 2;
        const h = k % 4 === 0 ? 0.075 : 0.035;
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.006, h, 0.006), makeHoloMat(0.7));
        tick.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        ring.add(tick);
      }
      ring.rotation.set(rng.range(-0.5, 0.5), rng.range(0, Math.PI), rng.range(-0.5, 0.5));
      this.rings.push(ring);
      this.group.add(ring);
    }

    /* ---- annotation glyph bars: abstract readout, not language ---- */
    for (let i = 0; i < (quality.level === 'low' ? 10 : 22); i++) {
      const w = rng.range(0.04, 0.16);
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.012), makeHoloMat(rng.range(0.4, 0.95)));
      const side = rng.chance(0.5) ? 1 : -1;
      bar.position.set(side * rng.range(0.85, 1.35), rng.range(-0.75, 0.85), rng.range(-0.3, 0.3));
      this.glyphGroup.add(bar);
    }
    this.group.add(this.glyphGroup);

    /* ---- projector beam cone ---- */
    this.beamMat = new THREE.MeshBasicMaterial({
      color: colour,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.05, 20, 1, true), this.beamMat);
    this.beam.position.y = -1.22;
    this.group.add(this.beam);

    // The projection is a practical light: it is what lights her face.
    this.light = new THREE.PointLight(colour, 0, 6.5, 2);
    this.group.add(this.light);
  }

  /** 0 = nothing, 1 = fully materialised. */
  setReveal(v: number): void {
    this.reveal = THREE.MathUtils.clamp(v, 0, 1);
    for (const m of this.materials) m.uniforms.uReveal.value = this.reveal;
    this.group.visible = this.reveal > 0.005;
  }

  /** Scale in world units (the projection is authored at roughly 2 m tall). */
  setScale(s: number): void {
    this.group.scale.setScalar(s);
  }

  update(dt: number, elapsed: number): void {
    if (!this.group.visible) return;
    this.station.rotation.y += dt * 0.32;
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].rotation.y += dt * (0.18 + i * 0.11) * (i % 2 ? -1 : 1);
      this.rings[i].rotation.z += dt * 0.04 * (i % 2 ? 1 : -1);
    }
    this.glyphGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.14;
    const flicker = 0.9 + Math.sin(elapsed * 26) * 0.06 + Math.sin(elapsed * 7.7) * 0.04;
    for (const m of this.materials) {
      m.uniforms.uTime.value = elapsed;
      m.uniforms.uJitter.value = 0.006 + (1 - this.reveal) * 0.05;
    }
    for (const m of this.lineMaterials) m.opacity = Math.min(1, m.opacity);
    this.beamMat.opacity = 0.09 * this.reveal * flicker;
    this.light.intensity = 7.5 * this.reveal * flicker;
  }
}
