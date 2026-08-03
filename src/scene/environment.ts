/**
 * Procedural image-based lighting.
 *
 * Physically based metals look dead without something to reflect. Rather than
 * shipping an HDRI, two tiny environments are rendered from primitives and
 * pre-filtered with `PMREMGenerator`:
 *
 *   space    — near-black void, one hot warm sun, a broad ochre glow from the
 *              planet below and a faint cool galactic band;
 *   interior — an off-white box with bright ceiling strips and a dark floor,
 *              which is exactly what a spacecraft corridor reflects.
 */

import * as THREE from 'three';

function buildSpaceScene(sunDir: THREE.Vector3, planetDir: THREE.Vector3): THREE.Scene {
  const scene = new THREE.Scene();

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uSun: { value: sunDir.clone().normalize() },
        uPlanet: { value: planetDir.clone().normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun;
        uniform vec3 uPlanet;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          // Deep space floor. Lifted off pure black so that metals facing away
          // from every source still resolve as grey rather than as holes.
          vec3 col = vec3(0.030, 0.034, 0.044);
          // Faint cool galactic band across the sky.
          col += vec3(0.05, 0.062, 0.095) * pow(max(0.0, 1.0 - abs(d.y) * 2.4), 3.0);
          // Bounce from the planet. Desaturated on purpose: a saturated ochre
          // hemisphere turns every grey hull in the piece brown.
          float p = max(0.0, dot(d, uPlanet));
          col += vec3(0.34, 0.30, 0.26) * pow(p, 1.5) * 0.95;
          // The primary star: small, extremely bright.
          float s = max(0.0, dot(d, uSun));
          col += vec3(1.0, 0.95, 0.88) * pow(s, 900.0) * 34.0;
          col += vec3(0.62, 0.60, 0.56) * pow(s, 18.0) * 0.55;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  scene.add(shell);
  return scene;
}

function buildInteriorScene(): THREE.Scene {
  const scene = new THREE.Scene();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          // Dark grated floor below, warm-white walls, bright ceiling strip.
          float up = d.y * 0.5 + 0.5;
          vec3 floorC = vec3(0.035, 0.037, 0.042);
          vec3 wallC  = vec3(0.34, 0.335, 0.315);
          vec3 ceilC  = vec3(0.72, 0.73, 0.78);
          vec3 col = mix(floorC, wallC, smoothstep(0.0, 0.5, up));
          col = mix(col, ceilC, smoothstep(0.62, 0.98, up));
          // The overhead light strip runs fore–aft, so brighten a band in Z.
          float strip = smoothstep(0.86, 1.0, d.y) * smoothstep(0.55, 0.0, abs(d.x));
          col += vec3(1.1, 1.12, 1.2) * strip * 2.6;
          // A hint of amber from floor guide lighting.
          col += vec3(0.16, 0.1, 0.03) * smoothstep(0.35, 0.0, up);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  scene.add(shell);
  return scene;
}

export type EnvironmentName = 'space' | 'interior';

/**
 * Owns the two pre-filtered environments and swaps `scene.environment`
 * between them. Both are generated once at load and disposed on teardown.
 */
export class EnvironmentSet {
  private pmrem: THREE.PMREMGenerator;
  private maps = new Map<EnvironmentName, THREE.Texture>();
  private current: EnvironmentName | null = null;

  constructor(renderer: THREE.WebGLRenderer, sunDir: THREE.Vector3, planetDir: THREE.Vector3) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();

    const space = buildSpaceScene(sunDir, planetDir);
    this.maps.set('space', this.pmrem.fromScene(space, 0.04).texture);
    disposeScene(space);

    const interior = buildInteriorScene();
    this.maps.set('interior', this.pmrem.fromScene(interior, 0.02).texture);
    disposeScene(interior);
  }

  apply(scene: THREE.Scene, name: EnvironmentName, intensity = 1): void {
    const tex = this.maps.get(name);
    if (!tex) return;
    if (this.current !== name) {
      scene.environment = tex;
      this.current = name;
    }
    scene.environmentIntensity = intensity;
  }

  dispose(): void {
    for (const t of this.maps.values()) t.dispose();
    this.maps.clear();
    this.pmrem.dispose();
  }
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | undefined;
    if (mat) mat.dispose();
  });
}
