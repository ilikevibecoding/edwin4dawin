import * as THREE from 'three';
import { getMaterials } from './Materials';
import {
  anchor,
  enginePlume,
  glowDisc,
  RunningLights,
  setGlowIntensity,
  type Anchors,
  type Plume,
} from './ShipCommon';
import {
  blockField,
  boxAt,
  greebleInstances,
  mergeParts,
  windowStrip,
  type SurfaceSample,
} from './Greeble';
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
 * Point and outward normal on the hull ellipse.
 *
 * `across` runs 0 at the crown, ±1 at the beams and ±2 at the keel, which is a
 * convenient way to scatter detail bands without touching raw angles.
 */
function ellipsePoint(
  profile: THREE.Vector2[],
  z: number,
  across: number,
  offset: number,
): SurfaceSample {
  const a = hullRadius(profile, z);
  const b = a * 0.86;
  const theta = Math.PI / 2 - across * (Math.PI / 2);
  const cx = Math.cos(theta);
  const sy = Math.sin(theta);
  const normal = new THREE.Vector3(cx / a, sy / b, 0).normalize();
  const position = new THREE.Vector3(a * cx, b * sy, z).addScaledVector(normal, offset);
  return { position, normal };
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
      new THREE.Vector2(10.4, 62),
      new THREE.Vector2(10.4, 66),
      // Stops short of the engine drum: any hull left inside the drum shows
      // through the open bell throats as a row of white cups.
      new THREE.Vector2(0.01, 66),
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
    // The head is short, deep and much wider than the neck that carries it —
    // roughly a fifth of the ship's length. Stretched any longer it stops
    // reading as a hammer and becomes a plank bolted to a tube.
    const plan = new THREE.Shape();
    // Plan coordinates are (x, -z); extruded upward then laid flat.
    plan.moveTo(-5.0, 52);
    plan.lineTo(-12.0, 60);
    plan.lineTo(-20.0, 66.5);
    plan.lineTo(-22.6, 71);
    plan.lineTo(-21.4, 76.4);
    plan.lineTo(-14.0, 79.4);
    plan.lineTo(14.0, 79.4);
    plan.lineTo(21.4, 76.4);
    plan.lineTo(22.6, 71);
    plan.lineTo(20.0, 66.5);
    plan.lineTo(12.0, 60);
    plan.lineTo(5.0, 52);
    plan.closePath();
    const headGeo = new THREE.ExtrudeGeometry(plan, {
      depth: 8.4,
      bevelEnabled: true,
      bevelSize: 1.4,
      bevelThickness: 1.4,
      bevelSegments: 2,
      curveSegments: 1,
    });
    headGeo.rotateX(-Math.PI / 2);
    headGeo.translate(0, -4.2, 0);
    headGeo.computeVertexNormals();
    const head = new THREE.Mesh(headGeo, M.rebelHull);
    head.name = 'hammerhead';
    head.castShadow = true;
    head.receiveShadow = true;
    this.root.add(head);

    // Cheek pods on the outer corners of the bow.
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 9.0, 12), M.rebelHullDark);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 19.8, -0.6, -72.0);
      pod.castShadow = true;
      this.root.add(pod);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 8), M.rebelTrim);
      cap.position.set(side * 19.8, -0.6, -76.4);
      this.root.add(cap);
    }

    // Neck fairing between head and body: short and clearly narrower than
    // both, so the bow reads as a separate mass on a stalk.
    const neck = new THREE.Mesh(
      mergeParts([
        boxAt(9.6, 7.0, 12, 0, 0, -42),
        boxAt(7.2, 5.4, 8, 0, 0.4, -49),
        boxAt(3.6, 2.0, 16, 0, 4.4, -42),
        boxAt(10.6, 1.6, 6, 0, -3.0, -50),
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
    // A drum no wider than the hull, its aft face recessed, with eleven bells
    // sunk into it — one large, four medium, six small. The bells are holes
    // with light at the bottom, never discs stuck onto a plate.
    const engineDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(11.3, 10.8, 15, 26, 1, true),
      M.rebelHullDark,
    );
    engineDrum.rotation.x = Math.PI / 2;
    engineDrum.position.z = 67.5;
    engineDrum.castShadow = true;
    engineDrum.name = 'engineDrum';
    this.root.add(engineDrum);

    // Reinforcing band around the mouth of the drum.
    const drumRing = new THREE.Mesh(new THREE.TorusGeometry(11.0, 0.55, 6, 26), M.rebelTrim);
    drumRing.position.z = 74.4;
    this.root.add(drumRing);

    // Back wall of the bay, well forward of the bell mouths and dark, so the
    // gaps between the throats read as shadow rather than a lit plate.
    const engineDeck = new THREE.Mesh(new THREE.CircleGeometry(11.0, 26), M.imperialDeep);
    engineDeck.position.z = 66.6;
    engineDeck.name = 'engineDeck';
    this.root.add(engineDeck);

    const engineCluster = new THREE.Group();
    engineCluster.name = 'engineCluster';
    engineCluster.position.z = 70.8;
    this.root.add(engineCluster);
    this.anchors.engineCluster = engineCluster;

    const layout: Array<[number, number, number]> = [[0, 0, 3.1]];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      layout.push([Math.cos(a) * 5.3, Math.sin(a) * 4.6, 1.9]);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      layout.push([Math.cos(a) * 8.4, Math.sin(a) * 7.1, 1.45]);
    }
    const nozzleGeo = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true);
    nozzleGeo.rotateX(Math.PI / 2);
    for (const [x, y, radius] of layout) {
      const nozzle = new THREE.Mesh(nozzleGeo.clone(), M.bellInterior);
      nozzle.scale.set(radius, radius, 7.6);
      nozzle.position.set(x, y, 0);
      engineCluster.add(nozzle);

      // Light sits a couple of units down the throat, so the mouth keeps a
      // dark rim and the drive still reads from off-axis.
      const disc = glowDisc(0x3f9ae8, radius * 1.75, 1);
      disc.position.set(x, y, 1.6);
      engineCluster.add(disc);
      this.glows.push(disc);
    }
    nozzleGeo.dispose();

    // A single soft wash behind the whole bank stands in for the exhaust; one
    // cone per bell just stacks additive alpha until the stern blows out.
    const plume = enginePlume(7.4, 48, 0xcfe9ff, 0x2f7ac8);
    plume.mesh.position.z = 74.5;
    this.root.add(plume.mesh);
    this.plumes.push(plume);

    // Far enough aft that it cannot wash out the ship's own transom; its job
    // is spill on whatever happens to be flying behind the corvette.
    this.engineLight = new THREE.PointLight(0x8ec9ff, 0, 520, 2);
    this.engineLight.position.set(0, 0, 165);
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
    // The corvette's hull is mostly smooth plating; the panel texture carries
    // the fine detail and only a modest, ordered set of shoulder blocks sits
    // proud of the surface, laid out on the hull's own axes.
    const shoulder = blockField(r.fork('dorsal'), {
      rows: Math.max(10, Math.round(26 * quality.greebleScale)),
      cols: 6,
      map: (u, v) => {
        const z = v * 52 + 18;
        const across = u * 0.9;
        // Skip the spine footprint: plates there would float over the box.
        if (Math.abs(across) < 0.3) return null;
        return ellipsePoint(profile, z, across, 0.02);
      },
      cell: [3.4, 4.6],
      heightRange: [0.22, 0.7],
      sparsity: 0.42,
    });
    this.root.add(greebleInstances(shoulder, M.rebelGreeble, 'runnerGreeble'));

    // Lengthwise strakes, the strongest read on the real ship's flanks.
    const strakeParts: THREE.BufferGeometry[] = [];
    for (const across of [-1.02, 1.02]) {
      for (let i = 0; i < 9; i++) {
        const z = -8 + i * 8.6;
        const p = ellipsePoint(profile, z, across, 0.1);
        strakeParts.push(boxAt(1.3, 0.7, 7.2, p.position.x, p.position.y, z));
      }
    }
    this.root.add(new THREE.Mesh(mergeParts(strakeParts), M.rebelGreeble));

    // A handful of larger, deliberately placed dorsal boxes read as equipment
    // rather than noise: sensor housings, a docking ring, vent stacks.
    const fittings = new THREE.Mesh(
      mergeParts([
        boxAt(5.2, 1.6, 9, 0, 10.4, 42),
        boxAt(3.0, 2.2, 3.0, -2.6, 10.0, 26),
        boxAt(3.0, 2.2, 3.0, 2.6, 10.0, 26),
        boxAt(6.4, 1.2, 4.4, 0, 10.0, 2),
        boxAt(2.2, 1.6, 12, -4.4, 8.6, 54),
        boxAt(2.2, 1.6, 12, 4.4, 8.6, 54),
        boxAt(4.6, 1.4, 6.2, 0, -8.8, 8),
        boxAt(3.2, 1.2, 4.0, 0, -8.6, 38),
      ]),
      M.rebelTrim,
    );
    fittings.castShadow = true;
    this.root.add(fittings);

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
      p.material.uniforms.intensity.value = effective * 0.8;
      p.material.uniforms.time.value = t + i * 0.13;
      p.mesh.scale.z = 0.35 + effective * 0.85;
    });
    this.glows.forEach((g, i) => {
      const base = (g.userData.baseScale ?? (g.userData.baseScale = g.scale.x)) as number;
      g.scale.setScalar(base * (0.86 + effective * 0.14));
      setGlowIntensity(g, clamp(effective * (0.94 + 0.06 * Math.sin(t * 17 + i)), 0, 1.2));
    });
    this.engineLight.intensity = effective * 6500;

    const lit = 1 - this.damage * 0.55;
    const emergency = this.damage > 0.4 ? 0.55 + 0.45 * Math.sin(t * 6.2) : 1;
    this.windowMat.color.setRGB(1 * lit * emergency, 0.85 * lit * emergency, 0.63 * lit * emergency);

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
