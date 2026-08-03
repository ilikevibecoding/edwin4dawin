import * as THREE from 'three';
import { getMaterials } from './Materials';
import { boxAt, mergeParts } from './Greeble';
import { anchor, enginePlume, glowDisc, type Anchors, type Plume } from './ShipCommon';
import { radialTexture } from './Textures';
import { clamp } from '../core/MathX';

/**
 * Class-6 escape pod.
 *
 * Roughly five units nose to tail, so it reads as a speck beside the hundred
 * and fifty unit blockade runner and as a small room from inside the bay.
 *
 * The silhouette is a blunt teardrop, but a bare ovoid at close range is just
 * a beach ball: what makes it read as a machine is the stuff bolted to it —
 * a ribbed cage, a recessed forward port, a hatch with a frame and a handle,
 * a thruster cluster, and a hazard band that gives the eye a scale reference.
 *
 * Local frame: nose at -Z, like the ships.
 */

/** Hull half-profile: radius against z, nose first. Lathed about the axis. */
const PROFILE: Array<[number, number]> = [
  [0.0, -2.34],
  [0.34, -2.28],
  [0.66, -2.1],
  [0.92, -1.82],
  [1.1, -1.44],
  [1.21, -1.0],
  [1.28, -0.4],
  [1.3, 0.3],
  [1.24, 0.95],
  [1.12, 1.46],
  [0.97, 1.84],
  [0.88, 2.06],
  [0.88, 2.2],
  [0.0, 2.2],
];

function latheProfile(inflate = 0, phiStart = 0, phiLength = Math.PI * 2, segments = 24): THREE.BufferGeometry {
  const pts = PROFILE.map(([r, z]) => new THREE.Vector2(r > 0 ? r + inflate : r, z));
  const geo = new THREE.LatheGeometry(pts, segments, phiStart, phiLength);
  // Lathes build about +Y; the ships all run nose-first down -Z.
  geo.rotateX(Math.PI / 2);
  return geo;
}

/** Hull radius at a given z, for bolting details flush to the surface. */
function radiusAt(z: number): number {
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [r0, z0] = PROFILE[i];
    const [r1, z1] = PROFILE[i + 1];
    if (z >= z0 && z <= z1) {
      const k = (z - z0) / Math.max(1e-5, z1 - z0);
      return r0 + (r1 - r0) * k;
    }
  }
  return PROFILE[PROFILE.length - 3][0];
}

export class EscapePod {
  readonly root = new THREE.Group();
  readonly anchors: Anchors = {};
  private plume: Plume;
  private glow: THREE.Mesh;
  private clamps: THREE.Object3D[] = [];
  private heatMat: THREE.ShaderMaterial;
  private heatShell: THREE.Mesh;
  private windowMat: THREE.MeshBasicMaterial;
  private strobeMat: THREE.MeshBasicMaterial;
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

    const body = new THREE.Mesh(latheProfile(), M.rebelHull);
    body.castShadow = true;
    body.receiveShadow = true;
    this.root.add(body);

    // Six longitudinal ribs, cut from the same profile so they hug the hull
    // exactly instead of floating off it at the shoulders. Two-sided because
    // a lathe strip has no thickness and would vanish when seen from below.
    const ribMat = M.rebelHullDark.clone();
    ribMat.side = THREE.DoubleSide;
    for (let i = 0; i < 6; i++) {
      const rib = new THREE.Mesh(latheProfile(0.04, (i / 6) * Math.PI * 2, 0.15, 3), ribMat);
      rib.castShadow = true;
      this.root.add(rib);
    }

    // Panel seams. Torus rings sunk just under the skin read as joins between
    // pressed hull sections and break up the long unbroken curve.
    for (const z of [-1.5, -0.55, 0.55, 1.45]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radiusAt(z) - 0.012, 0.026, 5, 26),
        M.rebelTrim,
      );
      ring.position.z = z;
      this.root.add(ring);
    }

    // Hazard band around the waist: the one saturated thing on the pod, and
    // the detail that fixes its size in the eye at any distance.
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xd07a26,
      roughness: 0.72,
      metalness: 0.08,
    });
    const bandGeo = new THREE.CylinderGeometry(radiusAt(-0.05) + 0.008, radiusAt(-0.3) + 0.008, 0.25, 24, 1, true);
    bandGeo.rotateX(Math.PI / 2);
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.z = -0.175;
    this.root.add(band);

    // Upper hatch: a raised plate with a frame and a lever, set into the
    // shoulder where a person would actually climb through.
    const hatch = new THREE.Group();
    hatch.position.set(0, radiusAt(-0.5) - 0.06, -0.5);
    const hatchPlate = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.12, 1.34), M.rebelPlate);
    hatchPlate.castShadow = true;
    hatch.add(hatchPlate);
    const hatchFrame = new THREE.Mesh(
      mergeParts([
        boxAt(1.18, 0.07, 0.09, 0, -0.02, -0.71),
        boxAt(1.18, 0.07, 0.09, 0, -0.02, 0.71),
        boxAt(0.09, 0.07, 1.5, -0.55, -0.02, 0),
        boxAt(0.09, 0.07, 1.5, 0.55, -0.02, 0),
      ]),
      M.rebelHullDark,
    );
    hatch.add(hatchFrame);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.1), M.rebelTrim);
    lever.position.set(0, 0.09, 0.36);
    hatch.add(lever);
    for (const dx of [-0.3, 0.3]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), M.rebelTrim);
      bolt.position.set(dx, 0.08, -0.42);
      hatch.add(bolt);
    }
    this.root.add(hatch);

    // Forward viewport: a recessed dark socket with a lit pane inside it.
    // A flat bright disc on the skin reads as a sticker; the socket is what
    // makes it a window.
    this.windowMat = new THREE.MeshBasicMaterial({ color: 0xffca7a, toneMapped: false });
    const ports: Array<[number, number, number, number, number]> = [
      [0, 0.42, -1.94, 0, 0.34],
      [-0.86, 0.26, -1.42, -0.86, 0.24],
      [0.86, 0.26, -1.42, 0.86, 0.24],
    ];
    for (const [x, y, z, yaw, r] of ports) {
      const socket = new THREE.Group();
      socket.position.set(x, y, z);
      socket.rotation.y = yaw;
      socket.rotation.x = -0.22;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.07, r + 0.1, 0.14, 14), M.rebelHullDark);
      rim.rotation.x = Math.PI / 2;
      socket.add(rim);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 14), this.windowMat);
      glass.position.z = -0.03;
      glass.rotation.y = Math.PI;
      socket.add(glass);
      // A cross brace so the pane is not one clean disc of light.
      const brace = new THREE.Mesh(new THREE.BoxGeometry(r * 2, 0.035, 0.03), M.rebelTrim);
      brace.position.z = -0.05;
      socket.add(brace);
      this.root.add(socket);
    }

    // Machinery on the flanks: gas bottles and a comms blister, so the middle
    // of the hull is not a bare curve.
    for (const side of [-1, 1]) {
      const bottle = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), M.rebelGreeble);
      bottle.rotation.x = Math.PI / 2;
      bottle.position.set(side * (radiusAt(0.4) - 0.12), -0.5, 0.4);
      this.root.add(bottle);
      const blister = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), M.rebelHullDark);
      blister.scale.set(1, 0.6, 1.3);
      blister.position.set(side * (radiusAt(-0.9) - 0.1), 0.5, -0.9);
      this.root.add(blister);
    }

    // Tail: a raised thruster deck with one main bell and three verniers.
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.86, 0.16, 16), M.rebelHullDark);
    deck.rotation.x = Math.PI / 2;
    deck.position.z = 2.22;
    this.root.add(deck);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.56, 0.5, 16, 1, true), M.rebelTrim);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = 2.5;
    this.root.add(nozzle);
    const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 0.48, 16, 1, true), M.bellInterior);
    throat.rotation.x = Math.PI / 2;
    throat.position.z = 2.5;
    this.root.add(throat);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const vern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.24, 8, 1, true), M.rebelTrim);
      vern.rotation.x = Math.PI / 2;
      vern.position.set(Math.cos(a) * 0.66, Math.sin(a) * 0.66, 2.36);
      this.root.add(vern);
    }

    this.glow = glowDisc(0xbfe6ff, 1.5);
    this.glow.position.z = 2.72;
    this.root.add(this.glow);
    this.plume = enginePlume(0.5, 7, 0xe6f6ff, 0x54aeff);
    this.plume.mesh.position.z = 2.74;
    this.root.add(this.plume.mesh);

    // Aerials and a strobe on the spine.
    for (const [x, z, len] of [
      [-0.34, 1.5, 0.5],
      [0.34, 1.62, 0.36],
    ] as const) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, len, 5), M.rebelTrim);
      mast.position.set(x, radiusAt(z) + len * 0.42, z);
      mast.rotation.x = -0.24;
      this.root.add(mast);
    }
    this.strobeMat = new THREE.MeshBasicMaterial({ color: 0xff4433, toneMapped: false });
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), this.strobeMat);
    strobe.position.set(0, radiusAt(0.9) + 0.02, 0.9);
    this.root.add(strobe);

    // Release clamps: four arms that swing away at launch.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const pivot = new THREE.Object3D();
      pivot.position.set(Math.cos(a) * 1.18, Math.sin(a) * 1.08, 0.3);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.6), M.corridorTrim);
      arm.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0);
      pivot.add(arm);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), M.rebelTrim);
      pad.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.74);
      pivot.add(pad);
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
    this.anchors.hatch = anchor(this.root, 'hatch', 0, 1.3, -0.5);
  }

  update(t: number, dt: number): void {
    void dt;
    const th = clamp(this.thrust, 0, 1);
    this.plume.material.uniforms.intensity.value = th;
    this.plume.material.uniforms.time.value = t;
    this.plume.mesh.scale.z = 0.25 + th * 1.0;
    this.plume.mesh.visible = th > 0.02;
    // Dark until it fires. A permanent 20% glow left a soft grey blob sitting
    // in the middle of the thruster deck while the pod was still in its cradle.
    this.glow.scale.setScalar(1.5 * (0.4 + th * 0.85));
    (this.glow.material as THREE.ShaderMaterial).uniforms.intensity.value = clamp(th * 1.15, 0, 1);
    this.glow.visible = th > 0.02;
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
    const beat = Math.pow(Math.max(0, Math.sin(t * 2.4)), 8);
    this.strobeMat.color.setRGB(0.25 + beat * 0.95, 0.06 + beat * 0.22, 0.05 + beat * 0.16);
  }
}