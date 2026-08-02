import * as THREE from 'three';
import { rng } from '../core/Rng';
import { clamp, smoothstep } from '../core/MathX';

/**
 * The stolen plans, shown as an abstract holographic readout rather than any
 * reproduction of an existing film graphic: a wireframe shell, an equatorial
 * service band, a focusing emitter, orbital reference rings and drifting
 * schematic glyphs, all in cold projector blue.
 */
export class DataProjection {
  readonly root = new THREE.Group();
  private shell: THREE.LineSegments;
  private band: THREE.Mesh;
  private emitter: THREE.Mesh;
  private rings: THREE.Group;
  private glyphs: THREE.Points;
  private beam: THREE.Mesh;
  private beamMat: THREE.ShaderMaterial;
  private lineMat: THREE.LineBasicMaterial;
  private surfaceMat: THREE.MeshBasicMaterial;
  private glyphMat: THREE.PointsMaterial;
  private scanMat: THREE.ShaderMaterial;
  private scan: THREE.Mesh;
  private downlink!: THREE.Mesh;
  private downlinkMat!: THREE.ShaderMaterial;
  private downlinkStrength = 0;

  /** 0 = off, 1 = fully materialised. */
  intensity = 0;
  /** Rises while the data is being copied into the droid. */
  transfer = 0;

  constructor(radius = 0.55) {
    this.root.name = 'DataProjection';
    const r = rng('data-projection');
    const color = new THREE.Color(0x8ad4ff);

    this.lineMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.surfaceMat = new THREE.MeshBasicMaterial({
      color: 0x2f7fbe,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    const sphere = new THREE.SphereGeometry(radius, 22, 14);
    this.shell = new THREE.LineSegments(new THREE.WireframeGeometry(sphere), this.lineMat);
    this.root.add(this.shell);
    const shellSkin = new THREE.Mesh(sphere, this.surfaceMat);
    this.root.add(shellSkin);

    // Equatorial service trench.
    const bandGeo = new THREE.TorusGeometry(radius * 1.005, radius * 0.045, 6, 48);
    bandGeo.rotateX(Math.PI / 2);
    this.band = new THREE.Mesh(bandGeo, this.lineMat);
    this.root.add(this.band);

    // Focusing emitter dish on the upper hemisphere.
    const dish = new THREE.SphereGeometry(radius * 0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    this.emitter = new THREE.Mesh(dish, this.surfaceMat);
    this.emitter.position.set(0, radius * 0.5, -radius * 0.62);
    this.emitter.rotation.x = -0.6;
    this.root.add(this.emitter);
    const dishRim = new THREE.LineSegments(new THREE.WireframeGeometry(dish), this.lineMat);
    dishRim.position.copy(this.emitter.position);
    dishRim.rotation.copy(this.emitter.rotation);
    this.root.add(dishRim);

    // Orbital reference rings.
    this.rings = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(radius * (1.3 + i * 0.26), radius * 0.006, 4, 64);
      const ring = new THREE.Mesh(ringGeo, this.lineMat);
      ring.rotation.x = Math.PI / 2 + r.spread(0.5);
      ring.rotation.z = r.spread(0.7);
      this.rings.add(ring);
    }
    this.root.add(this.rings);

    // Floating schematic glyphs.
    const count = 220;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = r.next() * Math.PI * 2;
      const b = Math.acos(r.next() * 2 - 1);
      const rad = radius * r.range(1.02, 1.9);
      pos[i * 3] = Math.sin(b) * Math.cos(a) * rad;
      pos[i * 3 + 1] = Math.cos(b) * rad * 0.7;
      pos[i * 3 + 2] = Math.sin(b) * Math.sin(a) * rad;
    }
    const glyphGeo = new THREE.BufferGeometry();
    glyphGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.glyphMat = new THREE.PointsMaterial({
      color: 0xd6efff,
      size: radius * 0.035,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.glyphs = new THREE.Points(glyphGeo, this.glyphMat);
    this.root.add(this.glyphs);

    // Scan sweep plane.
    this.scanMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, intensity: { value: 0 }, color: { value: color } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float time, intensity; uniform vec3 color; varying vec2 vUv;
        void main() {
          float sweep = fract(vUv.y * 1.0 - time * 0.35);
          float line = exp(-sweep * 22.0) + exp(-(1.0 - sweep) * 60.0);
          float grid = step(0.96, fract(vUv.x * 18.0)) + step(0.96, fract(vUv.y * 18.0));
          float a = (line * 0.5 + grid * 0.1) * intensity * 0.6;
          gl_FragColor = vec4(color * a * 1.8, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.scan = new THREE.Mesh(new THREE.PlaneGeometry(radius * 3.4, radius * 3.4), this.scanMat);
    this.scan.rotation.x = -Math.PI / 2;
    this.scan.position.y = -radius * 1.25;
    this.root.add(this.scan);

    // Projector cone rising from the emitter plate below.
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { intensity: { value: 0 }, time: { value: 0 }, color: { value: color } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float intensity, time; uniform vec3 color; varying vec2 vUv;
        void main() {
          float radial = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.5);
          float rise = smoothstep(0.0, 0.5, vUv.y) * (1.0 - vUv.y * 0.7);
          float flick = 0.85 + 0.15 * sin(time * 26.0 + vUv.y * 20.0);
          float a = radial * rise * intensity * 0.32 * flick;
          gl_FragColor = vec4(color * a * 2.0, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const beamGeo = new THREE.CylinderGeometry(radius * 1.5, radius * 0.16, radius * 2.6, 18, 1, true);
    beamGeo.translate(0, -radius * 0.02, 0);
    this.beam = new THREE.Mesh(beamGeo, this.beamMat);
    this.beam.position.y = -radius * 0.05;
    this.root.add(this.beam);

    // Downlink: the visible stream of data leaving the projection for the
    // droid. Without it the most important action in the film is invisible.
    this.downlinkMat = new THREE.ShaderMaterial({
      uniforms: { strength: { value: 0 }, time: { value: 0 }, color: { value: new THREE.Color(0xbfe8ff) } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float strength, time; uniform vec3 color; varying vec2 vUv;
        void main() {
          float core = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.2);
          // Packets running down the beam.
          float packet = 0.0;
          for (int i = 0; i < 4; i++) {
            float phase = fract(time * 1.35 + float(i) * 0.25);
            packet += exp(-abs(fract(vUv.y + phase) - 0.5) * 26.0);
          }
          float a = core * (0.22 + packet * 0.9) * strength;
          gl_FragColor = vec4(color * a * 2.0, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const linkGeo = new THREE.CylinderGeometry(0.055, 0.11, 1, 10, 1, true);
    linkGeo.translate(0, -0.5, 0);
    this.downlink = new THREE.Mesh(linkGeo, this.downlinkMat);
    this.downlink.visible = false;
    this.downlink.frustumCulled = false;
    this.root.add(this.downlink);

    this.root.traverse((o) => (o.renderOrder = 6));
    this.setIntensity(0);
  }

  /** Point the downlink at a world-space target. */
  aimDownlink(worldTarget: THREE.Vector3, strength: number): void {
    this.downlinkStrength = strength;
    if (strength <= 0.01) {
      this.downlink.visible = false;
      return;
    }
    const dir = this.root.worldToLocal(worldTarget.clone());
    const len = Math.max(0.2, dir.length());
    this.downlink.visible = true;
    this.downlink.scale.set(1, len, 1);
    this.downlink.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      dir.normalize(),
    );
  }

  private setIntensity(v: number): void {
    const k = clamp(v, 0, 1);
    this.lineMat.opacity = 0.9 * k;
    this.surfaceMat.opacity = 0.16 * k;
    this.glyphMat.opacity = k;
    this.scanMat.uniforms.intensity.value = k;
    this.beamMat.uniforms.intensity.value = k;
    this.root.visible = k > 0.01;
  }

  update(t: number, dt: number): void {
    void dt;
    this.setIntensity(this.intensity);
    const spin = t * 0.32;
    this.shell.rotation.y = spin;
    this.band.rotation.y = spin;
    this.emitter.rotation.y = spin;
    this.glyphs.rotation.y = -spin * 0.5;
    this.rings.rotation.y = spin * 0.8;
    this.rings.rotation.x = Math.sin(t * 0.3) * 0.1;
    this.scanMat.uniforms.time.value = t;
    this.beamMat.uniforms.time.value = t;
    this.downlinkMat.uniforms.time.value = t;
    this.downlinkMat.uniforms.strength.value = this.downlinkStrength;

    // During transfer the projection compresses and streams downward.
    const tr = clamp(this.transfer, 0, 1);
    const squash = 1 - smoothstep(0, 1, tr) * 0.35;
    this.root.scale.setScalar(squash);
    this.glyphMat.size = 0.02 + tr * 0.03;
    this.lineMat.color.setRGB(0.54 + tr * 0.3, 0.83, 1);
  }
}
