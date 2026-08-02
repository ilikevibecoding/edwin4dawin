import * as THREE from 'three';
import { getMaterials } from './Materials';
import { anchor, enginePlume, glowDisc, RunningLights, type Anchors, type Plume } from './ShipCommon';
import { boxAt, greebleInstances, mergeParts, scatterOnPlane, windowStrip } from './Greeble';
import { rng } from '../core/Rng';
import type { QualitySettings } from '../core/Quality';
import { clamp } from '../core/MathX';

/** Hull radius at a given z, interpolated from the lathe profile. */
function hullRadius(profile: THREE.Vector2[], z: number): number {
  if (z <= profile[0].y) return profile[0].x;
  const last = profile[profile.length - 1];
  if (z >= last.y) return last.x;
  for (let i = 1; i < profile.length; i++) {
    if (z <= profile[i].y) {
      const a = profile[i - 1];
      const b = profile[i];
      const t = (z - a.y) / Math.max(1e-6, b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return last.x;
}

/** A point just outside the hull ellipse at height `y` on the given side. */
function surfacePoint(
  profile: THREE.Vector2[],
  z: number,
  y: number,
  side: number,
  offset: number,
): THREE.Vector3 {
  const r = hullRadius(profile, z);
  const b = r * 0.86;
  const ratio = Math.min(0.96, Math.abs(y) / Math.max(0.001, b));
  const x = r * Math.sqrt(Math.max(0.02, 1 - ratio * ratio));
  return new THREE.Vector3(side * (x + offset), y, z);
}

/**
 * The rebel diplomatic ship: a slim white hull with a hammerhead bow, a
 * dorsal spine, and an oversized rear engine cluster.
 *
 * Local frame: nose at -Z, stern at +Z, 150 units long. Everything is built
 * around named anchors so the timeline never has to hard-code coordinates.
 */
export class BlockadeRunner {
  readonly root = new THREE.Group();
  readonly anchors: Anchors = {};
  readonly length = 150;

  private plumes: Plume[] = [];
  private glows: THREE.Mesh[] = [];
  private navLights: RunningLights;
  private engineLight: THREE.PointLight;
  private windowMat: THREE.MeshBasicMaterial;
  private shieldMesh: THREE.Mesh;
  private shieldMat: THREE.ShaderMaterial;
  private podHatchCover: THREE.Mesh;

  /** 0 = engines cold, 1 = full burn. Drives glow, plume and light spill. */
  enginePower = 1;
  /** 0 = pristine, 1 = fully disabled: lights flicker and engines die. */
  damage = 0;
  private shieldFlash = 0;

  constructor(quality: QualitySettings) {
    const M = getMaterials();
    const r = rng('blockade-runner');
    this.root.name = 'BlockadeRunner';

    // ---------------------------------------------------------- main hull
    // Lathe profile runs nose (-41) to stern (+72); the axis is rotated so the
    // ship points down -Z like every other flyable object in the project.
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.01, -41),
      new THREE.Vector2(3.4, -41),
      new THREE.Vector2(3.9, -38.5),
      new THREE.Vector2(4.8, -33),
      new THREE.Vector2(6.2, -24),
      new THREE.Vector2(7.6, -10),
      new THREE.Vector2(8.8, 8),
      new THREE.Vector2(9.8, 28),
      new THREE.Vector2(10.6, 48),
      new THREE.Vector2(11.0, 64),
      new THREE.Vector2(10.2, 70.5),
      new THREE.Vector2(6.4, 72),
      new THREE.Vector2(0.01, 72),
    ];
    const bodyGeo = new THREE.LatheGeometry(profile, 22);
    bodyGeo.rotateX(Math.PI / 2); // lathe axis Y -> +Z (stern)
    bodyGeo.scale(1, 0.86, 1);
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, M.rebelHull);
    body.name = 'hull';
    body.castShadow = true;
    body.receiveShadow = true;
    this.root.add(body);

    // ------------------------------------------------------- hammerhead
    // The bow is a broad, flat wedge on a narrow neck; that contrast is the
    // ship's signature, so the head is deliberately much wider than the hull.
    const plan = new THREE.Shape();
    // Plan coordinates are (x, -z); extruded upward then laid flat.
    plan.moveTo(-3.4, 44);
    plan.lineTo(-9.0, 55);
    plan.lineTo(-17.0, 63);
    plan.lineTo(-20.4, 69);
    plan.lineTo(-19.2, 75.0);
    plan.lineTo(-12.5, 78.5);
    plan.lineTo(12.5, 78.5);
    plan.lineTo(19.2, 75.0);
    plan.lineTo(20.4, 69);
    plan.lineTo(17.0, 63);
    plan.lineTo(9.0, 55);
    plan.lineTo(3.4, 44);
    plan.closePath();
    const headGeo = new THREE.ExtrudeGeometry(plan, {
      depth: 5.6,
      bevelEnabled: true,
      bevelSize: 1.1,
      bevelThickness: 1.1,
      bevelSegments: 2,
      curveSegments: 1,
    });
    headGeo.rotateX(-Math.PI / 2);
    headGeo.translate(0, -2.8, 0);
    headGeo.computeVertexNormals();
    const head = new THREE.Mesh(headGeo, M.rebelHull);
    head.name = 'hammerhead';
    head.castShadow = true;
    head.receiveShadow = true;
    this.root.add(head);

    // Cheek pods on the outer corners of the bow.
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 7.6, 12), M.rebelHullDark);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 18.2, -0.4, -70.5);
      pod.castShadow = true;
      this.root.add(pod);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), M.rebelTrim);
      cap.position.set(side * 18.2, -0.4, -74.2);
      this.root.add(cap);
    }

    // Neck fairing between head and body: narrow, so the head reads as a head.
    const neck = new THREE.Mesh(
      mergeParts([
        boxAt(8.2, 6.0, 14, 0, 0, -35),
        boxAt(6.0, 4.6, 8, 0, 0.4, -44),
        boxAt(3.6, 1.8, 24, 0, 3.8, -32),
        boxAt(9.6, 1.4, 6, 0, -2.4, -46),
      ]),
      M.rebelHullDark,
    );
    neck.castShadow = true;
    this.root.add(neck);

    // ------------------------------------------------------ dorsal spine
    const spine = new THREE.Mesh(
      mergeParts([
        boxAt(6.6, 3.6, 84, 0, 8.2, 18),
        boxAt(5.0, 2.2, 24, 0, 10.6, 34),
        boxAt(8.2, 2.4, 12, 0, 7.6, -20),
        boxAt(3.0, 3.4, 8, 0, 11.2, -6),
      ]),
      M.rebelHull,
    );
    spine.castShadow = true;
    this.root.add(spine);

    // Ventral keel and sensor blisters.
    const keel = new THREE.Mesh(
      mergeParts([
        boxAt(7.4, 2.6, 62, 0, -7.6, 24),
        boxAt(4.4, 2.0, 16, 0, -8.4, -14),
        boxAt(10.0, 1.6, 8, 0, -6.4, 50),
      ]),
      M.rebelHullDark,
    );
    this.root.add(keel);

    // ---------------------------------------------------------- bridge
    const bridge = new THREE.Mesh(
      mergeParts([
        boxAt(12.0, 3.0, 13.0, 0, 3.9, -63),
        boxAt(8.6, 1.9, 8.0, 0, 5.8, -64),
        boxAt(2.0, 2.4, 2.0, 0, 7.4, -60),
      ]),
      M.rebelHull,
    );
    bridge.name = 'bridgeDeck';
    bridge.castShadow = true;
    this.root.add(bridge);

    // Bridge window band.
    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.3, 0.5), M.emissiveWarm);
    bridgeGlass.position.set(0, 4.1, -69.4);
    bridgeGlass.name = 'bridgeGlass';
    this.root.add(bridgeGlass);

    // ------------------------------------------------------------- fins
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 6.2);
    finShape.lineTo(11, 1.6);
    finShape.lineTo(10.4, 0);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 1.0,
      bevelEnabled: true,
      bevelSize: 0.2,
      bevelThickness: 0.2,
      bevelSegments: 1,
      curveSegments: 1,
    });
    finGeo.rotateY(Math.PI / 2); // fin length now runs along -Z
    finGeo.translate(-0.5, 0, 0);
    for (const side of [1, -1]) {
      const fin = new THREE.Mesh(finGeo.clone(), M.rebelHullDark);
      fin.scale.set(1, side, 1);
      fin.position.set(0, side * 7.2, 56);
      fin.castShadow = true;
      this.root.add(fin);
    }
    finGeo.dispose();

    // ------------------------------------------------------- engine bank
    const engineHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(12.2, 11.2, 6, 20, 1, false),
      M.rebelTrim,
    );
    engineHousing.rotation.x = Math.PI / 2;
    engineHousing.position.z = 73.5;
    engineHousing.castShadow = true;
    this.root.add(engineHousing);

    const engineCluster = new THREE.Group();
    engineCluster.name = 'engineCluster';
    engineCluster.position.z = 75.5;
    this.root.add(engineCluster);
    this.anchors.engineCluster = engineCluster;

    const layout: Array<[number, number, number]> = [[0, 0, 3.6]];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      layout.push([Math.cos(a) * 5.6, Math.sin(a) * 4.9, 2.5]);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      layout.push([Math.cos(a) * 9.4, Math.sin(a) * 7.8, 1.85]);
    }
    const nozzleGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
    nozzleGeo.rotateX(Math.PI / 2);
    for (const [x, y, radius] of layout) {
      const nozzle = new THREE.Mesh(nozzleGeo.clone(), M.rebelTrim);
      nozzle.scale.set(radius, radius, 3.2);
      nozzle.position.set(x, y, -1.4);
      engineCluster.add(nozzle);

      const disc = glowDisc(0xa8e6ff, radius * 3.3);
      disc.position.set(x, y, 0.5);
      engineCluster.add(disc);
      this.glows.push(disc);

      const plume = enginePlume(radius * 0.95, radius * 13, 0xdff4ff, 0x3aa4ff);
      plume.mesh.position.set(x, y, 0.8);
      engineCluster.add(plume.mesh);
      this.plumes.push(plume);
    }
    nozzleGeo.dispose();

    this.engineLight = new THREE.PointLight(0x8ec9ff, 0, 260, 2);
    this.engineLight.position.set(0, 0, 84);
    this.root.add(this.engineLight);

    // ---------------------------------------------------------- windows
    this.windowMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false });
    const winPositions: THREE.Vector3[] = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 26; i++) {
        const z = -20 + i * 3.4;
        winPositions.push(surfacePoint(profile, z, 2.2, side, 0.35));
      }
    }
    const winL = windowStrip(
      winPositions.filter((p) => p.x < 0),
      new THREE.Vector2(1.5, 0.7),
      this.windowMat,
      new THREE.Vector3(-1, 0.12, 0).normalize(),
    );
    const winR = windowStrip(
      winPositions.filter((p) => p.x > 0),
      new THREE.Vector2(1.5, 0.7),
      this.windowMat,
      new THREE.Vector3(1, 0.12, 0).normalize(),
    );
    winL.name = 'windowsPort';
    winR.name = 'windowsStarboard';
    this.root.add(winL, winR);

    // --------------------------------------------------------- greebles
    const greebleCount = Math.round(220 * quality.greebleScale);
    const specs = [
      ...scatterOnPlane(r.fork('dorsal'), {
        count: greebleCount,
        map: (u, v) => {
          const z = v * 60 + 12;
          const x = u * 5.2;
          if (Math.abs(x) > 3.6 && Math.abs(z - 60) < 12) return null;
          return new THREE.Vector3(x, 10.1, z);
        },
        normal: new THREE.Vector3(0, 1, 0),
        sizeRange: [0.5, 2.1],
        heightRange: [0.12, 0.55],
        elongation: 1.8,
      }),
    ];
    const greeble = greebleInstances(specs, M.rebelHullDark, 'runnerGreeble');
    this.root.add(greeble);

    // Flank plating rides on the hull ellipse so nothing sinks into the body.
    for (const side of [1, -1]) {
      const flank = scatterOnPlane(r.fork(`flank${side}`), {
        count: Math.round(greebleCount * 0.35),
        map: (u, v) => surfacePoint(profile, v * 44 + 24, u * 4.6, side, 0.06),
        normal: new THREE.Vector3(side, 0, 0),
        sizeRange: [0.4, 1.4],
        heightRange: [0.08, 0.3],
      });
      this.root.add(greebleInstances(flank, M.rebelHullDark, `runnerFlank${side}`));
    }

    // ------------------------------------------------------- escape pods
    // Six pod hatches down the starboard flank; the story uses hatch #3.
    const hatchGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.5, 14);
    hatchGeo.rotateZ(Math.PI / 2);
    let cover: THREE.Mesh | null = null;
    for (let i = 0; i < 6; i++) {
      const z = 4 + i * 9;
      const hatch = new THREE.Mesh(hatchGeo.clone(), M.rebelHullDark);
      hatch.position.set(8.5, -2.4, z);
      hatch.name = `podHatch${i}`;
      this.root.add(hatch);
      if (i === 2) {
        cover = hatch;
        this.anchors.podHatch = anchor(this.root, 'podHatch', 10.6, -2.4, z);
      }
    }
    hatchGeo.dispose();
    this.podHatchCover = cover as THREE.Mesh;

    // ------------------------------------------------------ running lights
    this.navLights = new RunningLights(
      [
        new THREE.Vector3(-13.4, 0.2, -68),
        new THREE.Vector3(13.4, 0.2, -68),
        new THREE.Vector3(0, 11.4, 30),
        new THREE.Vector3(0, -9.0, 30),
        new THREE.Vector3(-11.2, 1.0, 66),
        new THREE.Vector3(11.2, 1.0, 66),
      ],
      [
        new THREE.Color(0xff4a3a),
        new THREE.Color(0x54ff86),
        new THREE.Color(0xffffff),
        new THREE.Color(0xffffff),
        new THREE.Color(0xff4a3a),
        new THREE.Color(0x54ff86),
      ],
      2.6,
    );
    this.root.add(this.navLights.points);

    // -------------------------------------------------------- shield shell
    this.shieldMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x7fd4ff) },
        intensity: { value: 0 },
        impact: { value: new THREE.Vector3(0, 0, -1) },
        time: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalW; varying vec3 vPosL;
        void main() {
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vPosL = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 color; uniform float intensity; uniform vec3 impact; uniform float time;
        varying vec3 vNormalW; varying vec3 vPosL;
        void main() {
          float facing = 1.0 - abs(dot(normalize(vNormalW), vec3(0.0, 0.0, 1.0)));
          float local = pow(max(dot(vPosL, normalize(impact)), 0.0), 5.0);
          float hex = 0.5 + 0.5 * sin(vPosL.x * 42.0) * sin(vPosL.y * 42.0) * sin(vPosL.z * 42.0);
          float a = intensity * (local * 1.4 + 0.12) * (0.55 + 0.45 * hex) * (0.45 + 0.55 * facing);
          a *= 0.85 + 0.15 * sin(time * 40.0);
          gl_FragColor = vec4(color * a * 2.2, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
      toneMapped: false,
    });
    const shieldGeo = new THREE.SphereGeometry(1, 24, 16);
    shieldGeo.scale(22, 18, 84);
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.position.z = 4;
    this.shieldMesh.frustumCulled = false;
    this.shieldMesh.renderOrder = 3;
    this.root.add(this.shieldMesh);

    // ------------------------------------------------------------ anchors
    this.anchors.nose = anchor(this.root, 'nose', 0, 0, -74);
    this.anchors.tail = anchor(this.root, 'tail', 0, 0, 76);
    this.anchors.bridge = anchor(this.root, 'bridge', 0, 6.5, -62);
    this.anchors.dorsalMid = anchor(this.root, 'dorsalMid', 0, 12, 10);
    this.anchors.dockPort = anchor(this.root, 'dockPort', -11, 0, 20);
    this.anchors.starboardMid = anchor(this.root, 'starboardMid', 12, 0, 10);
    this.anchors.corridorWindow = anchor(this.root, 'corridorWindow', 9.2, 2.2, 26);
    this.anchors.damageA = anchor(this.root, 'damageA', 6.4, 6.2, 34);
    this.anchors.damageB = anchor(this.root, 'damageB', -7.2, 3.2, -4);
    this.anchors.damageC = anchor(this.root, 'damageC', 0, -7.4, 52);
  }

  /** Trigger a shield bloom at a world-space impact point. */
  flashShield(worldPoint: THREE.Vector3): void {
    const local = this.root.worldToLocal(worldPoint.clone()).normalize();
    this.shieldMat.uniforms.impact.value.copy(local);
    this.shieldFlash = 1;
  }

  update(t: number, dt: number): void {
    const power = clamp(this.enginePower, 0, 1.6);
    const flicker = this.damage > 0.05 ? 0.6 + 0.4 * Math.sin(t * 23 + Math.sin(t * 7) * 3) : 1;
    const effective = power * (1 - this.damage * 0.92) * flicker;

    this.plumes.forEach((p, i) => {
      p.material.uniforms.intensity.value = effective * 0.9;
      p.material.uniforms.time.value = t + i * 0.13;
      p.mesh.scale.z = 0.35 + effective * 0.85;
    });
    this.glows.forEach((g, i) => {
      const base = g.userData.baseScale ?? (g.userData.baseScale = g.scale.x);
      const s = base * (0.35 + effective * 0.8) * (1 + 0.04 * Math.sin(t * 17 + i));
      g.scale.setScalar(s);
      (g.material as THREE.MeshBasicMaterial).opacity = clamp(0.25 + effective, 0, 1);
    });
    this.engineLight.intensity = effective * 3200;

    const lit = 1 - this.damage * 0.55;
    const emergency = this.damage > 0.4 ? 0.55 + 0.45 * Math.sin(t * 6.2) : 1;
    this.windowMat.color.setRGB(1 * lit * emergency, 0.85 * lit * emergency, 0.63 * lit);

    this.navLights.update(t);

    this.shieldFlash = Math.max(0, this.shieldFlash - dt * 2.4);
    this.shieldMat.uniforms.intensity.value = this.shieldFlash * (1 - this.damage * 0.8);
    this.shieldMat.uniforms.time.value = t;
    this.shieldMesh.visible = this.shieldFlash > 0.01;
  }

  /** Hide the hatch cover once the pod is away. */
  setPodLaunched(launched: boolean): void {
    this.podHatchCover.visible = !launched;
  }
}
