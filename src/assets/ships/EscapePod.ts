import * as THREE from 'three';
import { box, cyl, merge, sphere, torus } from '../geometry';
import { darkMechanical, emissive, gunmetal, rebelHull, rebelHullDark } from '../materials';
import { softDiscMap } from '../textures';
import { EngineBank } from './engines';
import { makeAnchor } from './StarDestroyer';
import { clamp01 } from '../../core/math';

const _flareWorld = new THREE.Vector3();
const _camWorld = new THREE.Vector3();
const _camLocal = new THREE.Vector3();

/**
 * Value noise shared by the two entry-plasma shaders. Cheap, and enough to stop
 * the plume reading as a solid cone of geometry.
 */
const NOISE_GLSL = /* glsl */ `
  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y);
  }
`;

/**
 * Bow-shock envelope ahead of the heat shield.
 *
 * Drawn on a camera-facing quad rather than a sphere cap: any closed surface
 * lit additively ends on a hard silhouette, and the earlier cap version read
 * as an orange bowl bolted to the nose.
 */
function sheathMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uCore: { value: new THREE.Color(0xfff3dc) },
      uEdge: { value: new THREE.Color(0xe4561a) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform float uOpacity;
      uniform float uTime;
      uniform vec3 uCore;
      uniform vec3 uEdge;
      varying vec2 vUv;
      void main() {
        // +Y is the direction of travel; the shock stands off the nose and
        // wraps back over the shoulders of the shield.
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(vec2(p.x, (p.y - 0.16) / 0.74));
        float body = 1.0 - smoothstep(0.28, 1.0, r);
        body *= body;
        float lead = 0.3 + 0.7 * smoothstep(-0.7, 0.45, p.y);
        float turb = 0.76 + 0.24 * vnoise(vec2(p.x * 4.5, p.y * 4.5 - uTime * 3.0));
        vec3 c = mix(uEdge, uCore, smoothstep(0.35, 0.98, body));
        gl_FragColor = vec4(c, uOpacity * body * lead * turb);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/**
 * Ionised wake. A camera-facing ribbon rather than a cone: a cone always shows
 * its silhouette as two straight converging lines, which is exactly what a
 * plasma trail should not look like.
 */
function trailMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uHot: { value: new THREE.Color(0xffd9a0) },
      uCool: { value: new THREE.Color(0xd8451a) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform float uOpacity;
      uniform float uTime;
      uniform vec3 uHot;
      uniform vec3 uCool;
      varying vec2 vUv;
      void main() {
        float along = vUv.y;
        float across = abs(vUv.x - 0.5) * 2.0;
        float width = mix(0.24, 1.0, pow(along, 0.5));
        float radial = 1.0 - smoothstep(width * 0.1, width, across);
        radial *= radial;
        float turb = 0.55 + 0.45 * vnoise(vec2(across * 2.2, along * 9.0 - uTime * 3.4));
        float fade = pow(1.0 - along, 1.4);
        vec3 c = mix(uHot, uCool, smoothstep(0.0, 0.5, along));
        gl_FragColor = vec4(c, uOpacity * radial * fade * turb);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/**
 * Class-6 style escape pod: a stubby white cylinder with a blunt nose, three
 * clamp lugs and a small thruster ring. Roughly 7 m long so it reads as tiny
 * beside the runner and vanishingly small beside the destroyer.
 */
export class EscapePod {
  readonly root = new THREE.Group();
  readonly length: number;
  readonly engines: EngineBank;
  readonly anchors: Record<string, THREE.Object3D> = {};

  private clamps: THREE.Mesh;
  private beacon: THREE.Mesh;
  private beaconLight: THREE.PointLight;
  private heatShield: THREE.Mesh;
  private reentryGlow: THREE.Mesh;
  private flare: THREE.Sprite;
  private trail: THREE.Mesh;
  private trailPivot: THREE.Group;
  private entryLight: THREE.PointLight;
  private reentry = 0;

  constructor(length = 7) {
    const L = (this.length = length);
    const R = L * 0.26;
    this.root.name = 'EscapePod';

    const bodyParts: THREE.BufferGeometry[] = [
      cyl(R, R * 1.02, L * 0.62, 16, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] }),
      sphere(R * 1.01, 16, 10, { pos: [0, 0, L * 0.31], scale: [1, 1, 0.66] }),
      cyl(R * 1.02, R * 0.86, L * 0.16, 16, { pos: [0, 0, -L * 0.39], rot: [Math.PI / 2, 0, 0] }),
    ];
    const body = new THREE.Mesh(merge(bodyParts), rebelHull());
    body.name = 'Pod_Body';
    body.castShadow = true;
    body.receiveShadow = true;
    this.root.add(body);

    // Reinforcing bands and dark equipment strip.
    const bands = new THREE.Mesh(
      merge([
        torus(R * 1.03, R * 0.05, { pos: [0, 0, L * 0.18] }, 6, 20),
        torus(R * 1.03, R * 0.05, { pos: [0, 0, -L * 0.1] }, 6, 20),
        box(R * 0.5, R * 0.16, L * 0.5, { pos: [0, R * 0.98, 0] }),
        box(R * 0.34, R * 0.12, L * 0.36, { pos: [0, -R * 0.98, -L * 0.02] }),
      ]),
      rebelHullDark(),
    );
    this.root.add(bands);

    // Forward viewport band.
    const glass = new THREE.Mesh(
      merge([
        box(R * 0.86, R * 0.3, L * 0.02, { pos: [0, R * 0.26, L * 0.435] }),
        box(R * 0.26, R * 0.26, L * 0.02, { pos: [R * 0.72, R * 0.1, L * 0.33] }),
        box(R * 0.26, R * 0.26, L * 0.02, { pos: [-R * 0.72, R * 0.1, L * 0.33] }),
      ]),
      emissive('podGlass', 0x9fd0ff, 1.1),
    );
    this.root.add(glass);

    // Docking clamp lugs — released at launch.
    this.clamps = new THREE.Mesh(
      merge([
        box(R * 0.3, R * 0.5, R * 0.4, { pos: [R * 0.95, R * 0.4, L * 0.12] }),
        box(R * 0.3, R * 0.5, R * 0.4, { pos: [-R * 0.95, R * 0.4, L * 0.12] }),
        box(R * 0.3, R * 0.5, R * 0.4, { pos: [0, R * 1.05, -L * 0.2] }),
      ]),
      gunmetal(),
    );
    this.root.add(this.clamps);

    // Blunt ablative shield on the nose.
    this.heatShield = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.06, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 0.95, metalness: 0.08 }),
    );
    this.heatShield.rotation.x = Math.PI / 2;
    this.heatShield.position.z = L * 0.3;
    this.heatShield.scale.set(1, 1, 0.7);
    this.root.add(this.heatShield);

    this.reentryGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sheathMaterial());
    this.reentryGlow.rotation.x = Math.PI / 2;
    this.reentryGlow.position.z = L * 0.34;
    this.reentryGlow.renderOrder = 6;

    // Thruster cluster.
    const nozzles = [
      { x: 0, y: 0, radius: R * 0.28 },
      { x: R * 0.52, y: R * 0.3, radius: R * 0.16 },
      { x: -R * 0.52, y: R * 0.3, radius: R * 0.16 },
      { x: 0, y: -R * 0.55, radius: R * 0.16 },
    ];
    const rims = new THREE.Mesh(
      merge(
        nozzles.map((n) =>
          cyl(n.radius * 1.25, n.radius * 1.3, L * 0.04, 10, {
            pos: [n.x, n.y, -L * 0.44],
            rot: [Math.PI / 2, 0, 0],
          }),
        ),
      ),
      darkMechanical(),
    );
    this.root.add(rims);

    this.engines = new EngineBank({
      nozzles,
      z: -L * 0.46,
      color: 0xa8dcff,
      coreColor: 0xffffff,
      plume: 6,
      haloScale: 4.6,
      light: { intensity: 3, distance: L * 6, color: 0xa8dcff },
      emissiveKey: 'podEngine',
    });
    this.engines.throttle = 0;
    this.root.add(this.engines.root);

    // Locator beacon.
    this.beacon = new THREE.Mesh(
      sphere(R * 0.11, 8, 6, { pos: [0, R * 1.12, L * 0.02] }),
      emissive('podBeacon', 0xff6a4a, 3),
    );
    this.root.add(this.beacon);
    this.beaconLight = new THREE.PointLight(0xff6a4a, 0, L * 3, 2);
    this.beaconLight.position.set(0, R * 1.3, L * 0.02);
    this.root.add(this.beaconLight);

    // Entry plasma throws light back onto the hull, which is what sells the
    // shield as hot rather than as an overlay pasted in front of the pod.
    this.entryLight = new THREE.PointLight(0xff8434, 0, L * 5, 2);
    this.entryLight.position.set(0, 0, L * 0.62);
    this.root.add(this.entryLight);

    // Long-range readability. At the end of the show the pod is a 7 m object
    // two kilometres away: without a screen-space-anchored flare and a trail it
    // is literally two pixels, and the closing image has no subject.
    this.flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: softDiscMap(),
        color: 0xffd7a8,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    );
    this.flare.renderOrder = 6;
    this.root.add(this.flare);

    // Wake and bow shock live inside a pivot that rolls about the pod's own
    // axis to keep their faces toward the camera, so neither turns edge-on.
    this.trailPivot = new THREE.Group();
    const ribbon = new THREE.PlaneGeometry(1, 1, 1, 24);
    ribbon.translate(0, 0.5, 0);
    this.trail = new THREE.Mesh(ribbon, trailMaterial());
    this.trail.rotation.x = -Math.PI / 2;
    this.trail.renderOrder = 5;
    this.trailPivot.visible = false;
    this.trailPivot.add(this.trail, this.reentryGlow);
    this.root.add(this.trailPivot);

    this.anchors.nose = makeAnchor('nose', 0, 0, L * 0.5, this.root);
    this.anchors.stern = makeAnchor('stern', 0, 0, -L * 0.55, this.root);
    this.anchors.hatch = makeAnchor('hatch', 0, -R * 0.9, L * 0.05, this.root);
  }

  releaseClamps(): void {
    this.clamps.visible = false;
  }

  attachClamps(): void {
    this.clamps.visible = true;
  }

  /** 0..1 atmospheric-entry heating on the shield. */
  setReentry(v: number): void {
    const t = clamp01(v);
    this.reentry = t;
    const sheath = this.reentryGlow.material as THREE.ShaderMaterial;
    sheath.uniforms.uOpacity.value = t * 1.25;
    const mat = this.heatShield.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(0xff7a2a);
    mat.emissiveIntensity = t * 3.2;
    const shock = this.length * (0.85 + t * 0.75);
    this.reentryGlow.scale.set(shock, shock, 1);
    (this.trail.material as THREE.ShaderMaterial).uniforms.uOpacity.value = t * 0.95;
    this.trailPivot.visible = t > 0.02;
    this.trail.scale.set(this.length * (0.9 + t * 0.9), this.length * (3 + t * 20), 1);
    this.entryLight.intensity = t * 9;
  }

  update(_dt: number, elapsed: number, camera?: THREE.Camera): void {
    this.engines.update(elapsed);
    (this.reentryGlow.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    (this.trail.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    if (camera && this.trailPivot.visible) {
      // Roll the ribbon about the pod's long axis until its face is square to
      // the camera. Anything else shows the plume as a thin bright line.
      this.root.worldToLocal(camera.getWorldPosition(_camLocal));
      this.trailPivot.rotation.z = Math.atan2(-_camLocal.x, _camLocal.y);
    }
    const blink = Math.sin(elapsed * 6.2) > 0.55 ? 1 : 0.08;
    (this.beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 3 * blink;
    this.beaconLight.intensity = 2.4 * blink;

    // Hold the flare at a constant angular size so the pod stays a visible
    // point of light from a hundred metres out to a couple of kilometres. It
    // only fades in once the hull itself is too small to read — up close the
    // pod should look like a machine, not like a light source.
    const flareMat = this.flare.material as THREE.SpriteMaterial;
    if (camera) {
      this.root.getWorldPosition(_flareWorld);
      const dist = camera.getWorldPosition(_camWorld).distanceTo(_flareWorld);
      const size = Math.max(this.length * 1.1, dist * 0.05);
      this.flare.scale.set(size, size, 1);
      const far = clamp01((dist - this.length * 6) / (this.length * 24));
      const heat = 0.35 + this.reentry * 0.65;
      flareMat.opacity = heat * far * (0.85 + 0.15 * Math.sin(elapsed * 3.1));
      flareMat.color.setRGB(1, 0.86 - this.reentry * 0.22, 0.68 - this.reentry * 0.36);
    } else {
      flareMat.opacity = 0;
    }
  }
}
