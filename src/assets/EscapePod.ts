import * as THREE from 'three';
import { getMaterials } from './Materials';
import { boxAt, mergeParts } from './Greeble';
import { anchor, enginePlume, glowDisc, type Anchors, type Plume } from './ShipCommon';
import { radialTexture } from './Textures';
import { clamp } from '../core/MathX';

/**
 * Class-6 escape pod: a stubby ovoid with three viewports, four clamp arms
 * and a single thruster. Roughly 5 units long, so it reads as a speck beside
 * the 150 unit blockade runner.
 *
 * Local frame: nose at -Z like the ships.
 */
export class EscapePod {
  readonly root = new THREE.Group();
  readonly anchors: Anchors = {};
  private plume: Plume;
  private glow: THREE.Mesh;
  private clamps: THREE.Object3D[] = [];
  private heatMat: THREE.ShaderMaterial;
  private heatShell: THREE.Mesh;
  private windowMat: THREE.MeshBasicMaterial;
  private light: THREE.PointLight;
  private beacon: THREE.Sprite;
  /** Set by the show each frame so the beacon can hold a constant size. */
  cameraDistance = 60;

  thrust = 0;
  /** 0 = clamped in the bay, 1 = fully released. */
  clampRelease = 0;
  /** 0..1 atmospheric entry heating. */
  entryHeat = 0;

  constructor() {
    const M = getMaterials();
    this.root.name = 'EscapePod';

    const bodyGeo = new THREE.SphereGeometry(1.3, 20, 14);
    bodyGeo.scale(1, 0.94, 1.75);
    const body = new THREE.Mesh(bodyGeo, M.rebelHull);
    body.castShadow = true;
    body.receiveShadow = true;
    this.root.add(body);

    const collar = new THREE.Mesh(
      mergeParts([
        boxAt(2.5, 0.24, 0.3, 0, 1.0, 0.2),
        boxAt(0.3, 0.24, 2.6, 1.15, 0.72, 0),
        boxAt(0.3, 0.24, 2.6, -1.15, 0.72, 0),
        boxAt(2.4, 0.3, 0.5, 0, -0.9, 0.4),
      ]),
      M.rebelHullDark,
    );
    this.root.add(collar);

    // Rear thruster housing.
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 0.9, 14, 1, true), M.rebelTrim);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = 2.2;
    this.root.add(nozzle);

    this.glow = glowDisc(0xbfe6ff, 2.2);
    this.glow.position.z = 2.55;
    this.root.add(this.glow);
    this.plume = enginePlume(0.55, 7, 0xe6f6ff, 0x54aeff);
    this.plume.mesh.position.z = 2.6;
    this.root.add(this.plume.mesh);

    // Viewports.
    this.windowMat = new THREE.MeshBasicMaterial({ color: 0xffca7a, toneMapped: false });
    const winGeo = new THREE.CircleGeometry(0.28, 12);
    for (const [x, y, z, ry] of [
      [0, 0.36, -2.22, 0],
      [-0.92, 0.3, -1.72, -0.7],
      [0.92, 0.3, -1.72, 0.7],
    ] as const) {
      const w = new THREE.Mesh(winGeo.clone(), this.windowMat);
      w.position.set(x, y, z);
      w.rotation.y = ry + Math.PI;
      this.root.add(w);
    }
    winGeo.dispose();

    // Release clamps: four arms that swing away at launch.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const pivot = new THREE.Object3D();
      pivot.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.05, 0.3);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.5), M.corridorTrim);
      arm.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
      pivot.add(arm);
      this.root.add(pivot);
      this.clamps.push(pivot);
    }

    this.light = new THREE.PointLight(0x9fd8ff, 0, 40, 2);
    this.light.position.set(0, 0, 4);
    this.root.add(this.light);

    // Distance-compensated beacon: from a few kilometres away the pod is one
    // pixel of hull, so the story beat needs a point of light that survives.
    this.beacon = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: radialTexture('pod-beacon', 'rgba(255,255,255,1)', 'rgba(255,190,120,0)', 1.8),
        color: 0xffd9a8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
        toneMapped: false,
      }),
    );
    this.beacon.renderOrder = 8;
    this.root.add(this.beacon);

    // Re-entry shell (additive, only visible during descent).
    this.heatMat = new THREE.ShaderMaterial({
      uniforms: {
        heat: { value: 0 },
        time: { value: 0 },
        hot: { value: new THREE.Color(0xffd08a) },
        cool: { value: new THREE.Color(0xff5a1e) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPosL; varying vec3 vNormalW;
        void main() {
          vPosL = normalize(position);
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float heat, time; uniform vec3 hot, cool;
        varying vec3 vPosL; varying vec3 vNormalW;
        void main() {
          float front = max(0.0, -vPosL.z);
          float flick = 0.82 + 0.18 * sin(time * 24.0 + vPosL.y * 9.0);
          float a = heat * pow(front, 1.4) * flick;
          vec3 c = mix(cool, hot, pow(front, 2.0));
          gl_FragColor = vec4(c * a * 2.4, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const shellGeo = new THREE.SphereGeometry(1.55, 18, 12);
    shellGeo.scale(1, 0.96, 1.85);
    this.heatShell = new THREE.Mesh(shellGeo, this.heatMat);
    this.heatShell.visible = false;
    this.root.add(this.heatShell);

    this.anchors.nose = anchor(this.root, 'nose', 0, 0, -2.4);
    this.anchors.tail = anchor(this.root, 'tail', 0, 0, 2.6);
    this.anchors.hatch = anchor(this.root, 'hatch', 0, 0.2, -1.3);
  }

  update(t: number, dt: number): void {
    void dt;
    const th = clamp(this.thrust, 0, 1);
    this.plume.material.uniforms.intensity.value = th;
    this.plume.material.uniforms.time.value = t;
    this.plume.mesh.scale.z = 0.25 + th * 1.0;
    this.plume.mesh.visible = th > 0.02;
    this.glow.scale.setScalar(2.2 * (0.35 + th * 0.9));
    (this.glow.material as THREE.MeshBasicMaterial).opacity = clamp(0.2 + th, 0, 1);
    this.light.intensity = th * 90;

    const rel = clamp(this.clampRelease, 0, 1);
    this.clamps.forEach((c, i) => {
      c.rotation.z = rel * (0.9 + i * 0.05) * (i % 2 === 0 ? 1 : -1);
      c.visible = rel < 0.98;
    });

    this.heatMat.uniforms.heat.value = this.entryHeat;
    this.heatMat.uniforms.time.value = t;
    this.heatShell.visible = this.entryHeat > 0.01;

    const beaconScale = clamp(this.cameraDistance * 0.019, 1.1, 140);
    this.beacon.scale.setScalar(beaconScale);
    const glowStrength = clamp(th * 0.5 + this.entryHeat * 0.8 + 0.18, 0, 1);
    (this.beacon.material as THREE.SpriteMaterial).opacity =
      glowStrength * clamp((this.cameraDistance - 22) / 90, 0, 1);
    (this.beacon.material as THREE.SpriteMaterial).color.setRGB(
      1,
      0.85 - this.entryHeat * 0.24,
      0.66 - this.entryHeat * 0.35,
    );
    this.beacon.visible = (this.beacon.material as THREE.SpriteMaterial).opacity > 0.01;
    const flicker = 0.85 + 0.15 * Math.sin(t * 9);
    this.windowMat.color.setRGB(1 * flicker, 0.79 * flicker, 0.48 * flicker);
  }
}
