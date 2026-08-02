import * as THREE from 'three';
import { getMaterials } from './Materials';
import { boxAt, mergeParts } from './Greeble';
import { clamp, smoothstep } from '../core/MathX';

/**
 * A pressure door that can be cut open from the far side.
 *
 * States are driven by a single 0..1 `breach` parameter so the timeline can
 * scrub backwards and forwards without the door getting stuck half-open:
 *   0.00-0.55  cutting: the seam glows and the plate bulges inward
 *   0.55-0.62  burst: plate blows in and tumbles
 *   0.62-1.00  aftermath: open frame with glowing molten edges
 */
export class BlastDoor {
  readonly root = new THREE.Group();
  readonly openingCenter = new THREE.Vector3();

  private plate: THREE.Mesh;
  private plateInner: THREE.Mesh;
  private glowMat: THREE.MeshBasicMaterial;
  private seam: THREE.Mesh;
  private seamMat: THREE.ShaderMaterial;
  private rimLight: THREE.PointLight;
  private width: number;
  private height: number;

  constructor(width = 3.0, height = 2.75) {
    const M = getMaterials();
    this.width = width;
    this.height = height;
    this.root.name = 'BlastDoor';

    // Frame.
    const t = 0.34;
    const frame = new THREE.Mesh(
      mergeParts([
        boxAt(width + 1.5, t, 0.5, 0, height + t / 2, 0),
        boxAt(0.75, height + t, 0.5, -(width / 2 + 0.375), (height + t) / 2, 0),
        boxAt(0.75, height + t, 0.5, width / 2 + 0.375, (height + t) / 2, 0),
        boxAt(width + 1.5, 0.16, 0.55, 0, 0.08, 0),
      ]),
      M.corridorTrim,
    );
    frame.castShadow = true;
    frame.receiveShadow = true;
    this.root.add(frame);

    // Door plate: two halves that read as a single sealed slab.
    const plateGeo = mergeParts([
      boxAt(width - 0.06, height - 0.06, 0.18, 0, height / 2, 0),
      boxAt(width - 0.7, 0.1, 0.24, 0, height * 0.62, 0.02),
      boxAt(width - 0.7, 0.1, 0.24, 0, height * 0.34, 0.02),
      boxAt(0.14, height - 0.5, 0.24, -width * 0.34, height / 2, 0.02),
      boxAt(0.14, height - 0.5, 0.24, width * 0.34, height / 2, 0.02),
    ]);
    this.plate = new THREE.Mesh(plateGeo, M.corridorPanel);
    this.plate.castShadow = true;
    this.plate.receiveShadow = true;
    this.root.add(this.plate);

    // Inner glow that grows as the cutting torch works through.
    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xff5a1e,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.plateInner = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.2, height - 0.3), this.glowMat);
    this.plateInner.position.set(0, height / 2, 0.11);
    this.root.add(this.plateInner);

    // Molten cut line travelling around the plate.
    this.seamMat = new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0 },
        time: { value: 0 },
        color: { value: new THREE.Color(0xff8a2a) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float progress, time; uniform vec3 color;
        varying vec2 vUv;
        void main() {
          // Distance to the plate border in normalised units.
          float border = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
          float ring = smoothstep(0.045, 0.0, border);
          // Angle around the plate centre drives the travelling cut.
          vec2 d = vUv - 0.5;
          float ang = (atan(d.y, d.x) + 3.14159265) / 6.2831853;
          float cut = step(ang, progress);
          float hot = exp(-abs(ang - progress) * 60.0);
          float a = ring * (cut * 0.75 + hot * 1.4);
          a *= 0.85 + 0.15 * sin(time * 45.0);
          gl_FragColor = vec4(color * a * 2.2, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.seam = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.seamMat);
    this.seam.position.set(0, height / 2, 0.14);
    this.root.add(this.seam);

    this.rimLight = new THREE.PointLight(0xff6a24, 0, 9, 2);
    this.rimLight.position.set(0, height / 2, 0.9);
    this.root.add(this.rimLight);

    this.openingCenter.set(0, height / 2, 0);
  }

  /** Where the plate ends up after it blows in (world space, for debris). */
  get plateWorldPosition(): THREE.Vector3 {
    return this.plate.getWorldPosition(new THREE.Vector3());
  }

  update(breach: number, time: number): void {
    const b = clamp(breach, 0, 1);
    const cutting = clamp(b / 0.55, 0, 1);
    this.seamMat.uniforms.progress.value = cutting;
    this.seamMat.uniforms.time.value = time;
    this.seam.visible = b > 0.001 && b < 0.62;

    this.glowMat.opacity = b < 0.55 ? Math.pow(cutting, 2.2) * 0.55 : 0;
    this.plateInner.visible = this.glowMat.opacity > 0.002;
    this.rimLight.intensity = b < 0.6 ? Math.pow(cutting, 2) * 7 : 0;

    if (b < 0.55) {
      // Bulge: the plate leans into the corridor as pressure builds.
      const bulge = Math.pow(cutting, 3);
      this.plate.position.set(0, 0, bulge * 0.16);
      this.plate.rotation.set(bulge * 0.05, 0, 0);
      this.plate.scale.setScalar(1);
      this.plate.visible = true;
    } else if (b < 0.75) {
      const k = smoothstep(0.55, 0.75, b);
      this.plate.position.set(0, -k * 0.9, k * 6.5);
      this.plate.rotation.set(-k * 2.4, k * 0.5, k * 1.1);
      this.plate.visible = k < 0.98;
    } else {
      this.plate.visible = false;
    }
  }

  get size(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}

/** A simple sliding door used for the vestibule and pod bay. */
export class SlidingDoor {
  readonly root = new THREE.Group();
  private leftLeaf: THREE.Mesh;
  private rightLeaf: THREE.Mesh;
  private width: number;
  /** 0 closed, 1 fully open. */
  open = 0;

  constructor(width = 2.6, height = 2.7) {
    const M = getMaterials();
    this.width = width;
    this.root.name = 'SlidingDoor';

    const frame = new THREE.Mesh(
      mergeParts([
        boxAt(width + 1.1, 0.26, 0.44, 0, height + 0.13, 0),
        boxAt(0.55, height, 0.44, -(width / 2 + 0.275), height / 2, 0),
        boxAt(0.55, height, 0.44, width / 2 + 0.275, height / 2, 0),
      ]),
      M.corridorTrim,
    );
    this.root.add(frame);

    const leafGeo = mergeParts([
      boxAt(width / 2 - 0.02, height - 0.05, 0.14, 0, 0, 0),
      boxAt(width / 2 - 0.35, 0.09, 0.19, 0, height * 0.16, 0.01),
      boxAt(width / 2 - 0.35, 0.09, 0.19, 0, -height * 0.16, 0.01),
    ]);
    this.leftLeaf = new THREE.Mesh(leafGeo, M.corridorPanel);
    this.leftLeaf.position.set(-width / 4, height / 2, 0);
    this.rightLeaf = new THREE.Mesh(leafGeo.clone(), M.corridorPanel);
    this.rightLeaf.position.set(width / 4, height / 2, 0);
    this.leftLeaf.castShadow = this.rightLeaf.castShadow = true;
    this.root.add(this.leftLeaf, this.rightLeaf);
  }

  update(): void {
    const o = clamp(this.open, 0, 1);
    this.leftLeaf.position.x = -this.width / 4 - o * (this.width / 2);
    this.rightLeaf.position.x = this.width / 4 + o * (this.width / 2);
  }
}
