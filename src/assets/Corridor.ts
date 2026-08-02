import * as THREE from 'three';
import { getMaterials } from './Materials';
import { boxAt, mergeParts, parametricSurface } from './Greeble';
import { consoleTexture } from './Textures';
import { rng } from '../core/Rng';
import type { QualitySettings } from '../core/Quality';
import { anchor, type Anchors } from './ShipCommon';
import { BlastDoor, SlidingDoor } from './Door';

/**
 * Interior of the blockade runner.
 *
 * The set is a straight corridor running along Z that opens into a wider
 * vestibule at the stern. One segment of geometry is authored once and
 * instanced down the length; only the doors, consoles and damage are unique.
 *
 * Geography (local metres, used by every character path and camera):
 *   z = -15.0  breached door (bow, where the boarders come from)
 *   z = -12..+8  main corridor, 3.4 wide
 *   z = +8..+22 vestibule, 8.2 wide
 *   x = +4.1, z = +17  escape-pod bay hatch
 *   x = -3.4, z = +18  data console alcove
 */

export const SEGMENT_LENGTH = 3;
export const CORRIDOR_HALF_WIDTH = 1.7;
export const CORRIDOR_HEIGHT = 2.9;
export const VESTIBULE_HALF_WIDTH = 4.1;

/** Wall cross-section: x offset and y height for parameter v in [0,1]. */
function wallProfile(v: number, halfWidth: number): [number, number] {
  const y = v * CORRIDOR_HEIGHT;
  const bulge = Math.sin(Math.min(1, v * 1.18) * Math.PI) * 0.09;
  const taper = Math.pow(Math.max(0, v - 0.62) / 0.38, 1.7) * 0.34;
  return [halfWidth + bulge - taper, y];
}

function buildWallGeometry(length: number, halfWidth: number, side: number): THREE.BufferGeometry {
  return parametricSurface(
    8,
    10,
    (u, v, out) => {
      const [x, y] = wallProfile(v, halfWidth);
      out.set(side * x, y, (u - 0.5) * length);
    },
    [length / 2, 1.6],
    side > 0,
  );
}

/** Wall section spanning an explicit z range, used where doorways interrupt. */
function wallSection(zStart: number, zEnd: number, halfWidth: number, side: number): THREE.BufferGeometry {
  const len = zEnd - zStart;
  return buildWallGeometry(len, halfWidth, side).translate(0, 0, (zStart + zEnd) / 2);
}

export class CorridorSet {
  readonly root = new THREE.Group();
  readonly anchors: Anchors = {};
  readonly breachDoor: BlastDoor;
  readonly podBayDoor: SlidingDoor;
  readonly vestibuleDoor: SlidingDoor;
  readonly ceilingLights: THREE.PointLight[] = [];
  readonly alarmLights: THREE.PointLight[] = [];

  private lightMat: THREE.MeshBasicMaterial;
  private alarmMat: THREE.MeshBasicMaterial;
  private tubeLight!: THREE.PointLight;
  private consoleMats: THREE.MeshBasicMaterial[] = [];
  private hazeMat: THREE.ShaderMaterial;

  /** 0 = normal running lights, 1 = red alert. */
  alertLevel = 0;
  /** Extra darkening + cold tint used when Vader enters. */
  vaderPresence = 0;
  private baseLightIntensity: number[] = [];

  constructor(quality: QualitySettings) {
    const M = getMaterials();
    const r = rng('corridor');
    this.root.name = 'CorridorSet';

    const corridorStart = -15;
    const corridorEnd = 8;
    const segCount = Math.round((corridorEnd - corridorStart) / SEGMENT_LENGTH);

    // ------------------------------------------------- instanced corridor
    const wallGeo = mergeParts([
      buildWallGeometry(SEGMENT_LENGTH, CORRIDOR_HALF_WIDTH, -1),
      buildWallGeometry(SEGMENT_LENGTH, CORRIDOR_HALF_WIDTH, 1),
      // Ceiling.
      parametricSurface(
        2,
        4,
        (u, v, out) => {
          out.set((v - 0.5) * 2.72, CORRIDOR_HEIGHT, (u - 0.5) * SEGMENT_LENGTH);
        },
        [SEGMENT_LENGTH / 2, 1],
        false,
      ),
    ]);
    const walls = new THREE.InstancedMesh(wallGeo, M.corridorWall, segCount);
    walls.name = 'corridorWalls';
    walls.receiveShadow = true;
    walls.castShadow = false;

    const floorGeo = new THREE.PlaneGeometry(CORRIDOR_HALF_WIDTH * 2, SEGMENT_LENGTH);
    floorGeo.rotateX(-Math.PI / 2);
    const floors = new THREE.InstancedMesh(floorGeo, M.corridorFloor, segCount);
    floors.name = 'corridorFloor';
    floors.receiveShadow = true;

    // Structural rib + wall inset frames repeated per segment.
    const trimGeo = mergeParts([
      boxAt(0.16, CORRIDOR_HEIGHT, 0.22, -CORRIDOR_HALF_WIDTH + 0.02, CORRIDOR_HEIGHT / 2, -SEGMENT_LENGTH / 2),
      boxAt(0.16, CORRIDOR_HEIGHT, 0.22, CORRIDOR_HALF_WIDTH - 0.02, CORRIDOR_HEIGHT / 2, -SEGMENT_LENGTH / 2),
      boxAt(CORRIDOR_HALF_WIDTH * 2, 0.16, 0.22, 0, CORRIDOR_HEIGHT - 0.03, -SEGMENT_LENGTH / 2),
      boxAt(CORRIDOR_HALF_WIDTH * 2 - 0.1, 0.1, 0.2, 0, 0.06, -SEGMENT_LENGTH / 2),
      // Recessed wall panels.
      boxAt(0.08, 0.9, 1.0, -CORRIDOR_HALF_WIDTH - 0.02, 1.5, 0),
      boxAt(0.08, 0.9, 1.0, CORRIDOR_HALF_WIDTH + 0.02, 1.5, 0),
      // Floor conduit.
      boxAt(0.28, 0.06, SEGMENT_LENGTH, -CORRIDOR_HALF_WIDTH + 0.35, 0.03, 0),
      boxAt(0.28, 0.06, SEGMENT_LENGTH, CORRIDOR_HALF_WIDTH - 0.35, 0.03, 0),
    ]);
    const trims = new THREE.InstancedMesh(trimGeo, M.corridorTrim, segCount);
    trims.name = 'corridorTrim';

    this.lightMat = new THREE.MeshBasicMaterial({ color: 0xf4f1e6, toneMapped: false });
    const lightGeo = new THREE.PlaneGeometry(0.62, SEGMENT_LENGTH * 0.72);
    lightGeo.rotateX(Math.PI / 2);
    lightGeo.translate(0, CORRIDOR_HEIGHT - 0.02, 0);
    const lightPanels = new THREE.InstancedMesh(lightGeo, this.lightMat, segCount);
    lightPanels.name = 'corridorLightPanels';

    const m = new THREE.Matrix4();
    for (let i = 0; i < segCount; i++) {
      const z = corridorStart + SEGMENT_LENGTH * (i + 0.5);
      m.makeTranslation(0, 0, z);
      walls.setMatrixAt(i, m);
      floors.setMatrixAt(i, m);
      trims.setMatrixAt(i, m);
      lightPanels.setMatrixAt(i, m);

      if (i % 2 === 0) {
        const light = new THREE.PointLight(0xfff2dc, 6.5, 9.5, 2);
        light.position.set(0, CORRIDOR_HEIGHT - 0.25, z);
        light.castShadow = quality.shadows && i % 4 === 0;
        if (light.shadow) {
          light.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
          light.shadow.bias = -0.004;
          light.shadow.camera.near = 0.2;
          light.shadow.camera.far = 12;
        }
        this.root.add(light);
        this.ceilingLights.push(light);
        this.baseLightIntensity.push(6.5);
      }
    }
    walls.instanceMatrix.needsUpdate = true;
    floors.instanceMatrix.needsUpdate = true;
    trims.instanceMatrix.needsUpdate = true;
    lightPanels.instanceMatrix.needsUpdate = true;
    this.root.add(walls, floors, trims, lightPanels);

    // ------------------------------------------------------- vestibule
    const vestStart = corridorEnd;
    const vestEnd = 22;
    const vestLen = vestEnd - vestStart;
    const vestCenterZ = (vestStart + vestEnd) / 2;

    const vestWalls = new THREE.Mesh(
      mergeParts([
        wallSection(vestStart, vestEnd, VESTIBULE_HALF_WIDTH, -1),
        // Starboard wall is interrupted by the pod-bay doorway.
        wallSection(vestStart, 15.3, VESTIBULE_HALF_WIDTH, 1),
        wallSection(18.7, vestEnd, VESTIBULE_HALF_WIDTH, 1),
        boxAt(0.24, 0.9, 3.4, VESTIBULE_HALF_WIDTH - 0.05, CORRIDOR_HEIGHT - 0.15, 17),
        parametricSurface(
          2,
          4,
          (u, v, out) => {
            out.set((v - 0.5) * VESTIBULE_HALF_WIDTH * 1.7, CORRIDOR_HEIGHT + 0.3, vestStart + u * vestLen);
          },
          [4, 3],
          false,
        ),
        // Stern wall closing the room, with a doorway cut implied by trim.
        parametricSurface(
          2,
          2,
          (u, v, out) => {
            out.set((u - 0.5) * VESTIBULE_HALF_WIDTH * 2, v * (CORRIDOR_HEIGHT + 0.3), vestEnd);
          },
          [4, 2],
          true,
        ),
        // Transition wall between corridor and vestibule (with the opening).
        boxAt(2.4, CORRIDOR_HEIGHT + 0.3, 0.3, -VESTIBULE_HALF_WIDTH + 1.2, (CORRIDOR_HEIGHT + 0.3) / 2, vestStart),
        boxAt(2.4, CORRIDOR_HEIGHT + 0.3, 0.3, VESTIBULE_HALF_WIDTH - 1.2, (CORRIDOR_HEIGHT + 0.3) / 2, vestStart),
        boxAt(3.4, 0.5, 0.3, 0, CORRIDOR_HEIGHT + 0.05, vestStart),
      ]),
      M.corridorWall,
    );
    vestWalls.receiveShadow = true;
    this.root.add(vestWalls);

    const vestFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(VESTIBULE_HALF_WIDTH * 2, vestLen),
      M.corridorFloor,
    );
    vestFloor.rotation.x = -Math.PI / 2;
    vestFloor.position.set(0, 0, vestCenterZ);
    vestFloor.receiveShadow = true;
    this.root.add(vestFloor);

    // Skirting and ceiling rails only — a full-height rail here would seal the
    // pod-bay doorway shut.
    const vestTrim = new THREE.Mesh(
      mergeParts([
        boxAt(VESTIBULE_HALF_WIDTH * 2, 0.14, 0.2, 0, 0.07, vestStart + 0.2),
        boxAt(VESTIBULE_HALF_WIDTH * 2, 0.14, 0.2, 0, 0.07, vestEnd - 0.2),
        boxAt(0.16, 0.2, vestLen, -VESTIBULE_HALF_WIDTH + 0.06, 0.1, vestCenterZ),
        boxAt(0.16, 0.2, vestLen, VESTIBULE_HALF_WIDTH - 0.06, 0.1, vestCenterZ),
        boxAt(0.16, 0.2, vestLen, -VESTIBULE_HALF_WIDTH + 0.16, CORRIDOR_HEIGHT + 0.18, vestCenterZ),
        boxAt(0.16, 0.2, 7.3, VESTIBULE_HALF_WIDTH - 0.16, CORRIDOR_HEIGHT + 0.18, 11.65),
        boxAt(0.16, 0.2, 3.3, VESTIBULE_HALF_WIDTH - 0.16, CORRIDOR_HEIGHT + 0.18, 20.35),
      ]),
      M.corridorTrim,
    );
    this.root.add(vestTrim);

    for (let i = 0; i < 3; i++) {
      const z = vestStart + 2.6 + i * 4;
      const light = new THREE.PointLight(0xfff0d8, 7.5, 12, 2);
      light.position.set(0, CORRIDOR_HEIGHT + 0.05, z);
      this.root.add(light);
      this.ceilingLights.push(light);
      this.baseLightIntensity.push(7.5);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), this.lightMat);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(0, CORRIDOR_HEIGHT + 0.28, z);
      this.root.add(panel);
    }

    // ------------------------------------------------------------- doors
    this.breachDoor = new BlastDoor(3.0, 2.72);
    this.breachDoor.root.position.set(0, 0, -15);
    this.breachDoor.root.rotation.y = Math.PI; // faces down the corridor
    this.root.add(this.breachDoor.root);

    // Boarding tube on the far side of the door. Without it the breached
    // doorway looks out into empty space instead of into the enemy ship.
    const tube = new THREE.Group();
    tube.position.set(0, 0, -15.2);
    this.root.add(tube);
    const tubeShell = new THREE.Mesh(
      mergeParts([
        buildWallGeometry(7.4, 1.62, -1).translate(0, 0, -3.7),
        buildWallGeometry(7.4, 1.62, 1).translate(0, 0, -3.7),
        boxAt(3.4, 0.16, 7.4, 0, CORRIDOR_HEIGHT - 0.08, -3.7),
        boxAt(3.4, 0.16, 7.4, 0, 0.02, -3.7),
        boxAt(3.4, CORRIDOR_HEIGHT, 0.2, 0, CORRIDOR_HEIGHT / 2, -7.5),
      ]),
      M.imperialDeep,
    );
    tube.add(tubeShell);
    const tubeRibs: THREE.BufferGeometry[] = [];
    for (let i = 1; i < 5; i++) {
      tubeRibs.push(boxAt(3.5, 0.2, 0.24, 0, CORRIDOR_HEIGHT - 0.1, -i * 1.5));
      tubeRibs.push(boxAt(0.2, CORRIDOR_HEIGHT, 0.24, -1.62, CORRIDOR_HEIGHT / 2, -i * 1.5));
      tubeRibs.push(boxAt(0.2, CORRIDOR_HEIGHT, 0.24, 1.62, CORRIDOR_HEIGHT / 2, -i * 1.5));
    }
    tube.add(new THREE.Mesh(mergeParts(tubeRibs), M.imperialTrim));
    this.tubeLight = new THREE.PointLight(0xff7a3a, 3.5, 9, 2);
    this.tubeLight.position.set(0, 2.2, -3.4);
    tube.add(this.tubeLight);
    const tubeGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.28),
      new THREE.MeshBasicMaterial({ color: 0xff6a28, toneMapped: false }),
    );
    tubeGlow.position.set(0, CORRIDOR_HEIGHT - 0.2, -6.9);
    tube.add(tubeGlow);

    this.podBayDoor = new SlidingDoor(2.4, 2.5);
    this.podBayDoor.root.position.set(VESTIBULE_HALF_WIDTH - 0.05, 0, 17);
    this.podBayDoor.root.rotation.y = -Math.PI / 2;
    this.root.add(this.podBayDoor.root);

    this.vestibuleDoor = new SlidingDoor(2.6, 2.6);
    this.vestibuleDoor.root.position.set(0, 0, vestEnd - 0.2);
    this.root.add(this.vestibuleDoor.root);

    // --------------------------------------------------------- pod alcove
    const BAY_X = VESTIBULE_HALF_WIDTH + 2.55;
    const bay = new THREE.Group();
    bay.position.set(BAY_X, 0, 17);
    this.root.add(bay);
    const bayShell = new THREE.Mesh(
      mergeParts([
        boxAt(5.4, 0.2, 4.6, 0, -0.1, 0),
        boxAt(5.4, 0.2, 4.6, 0, CORRIDOR_HEIGHT + 0.1, 0),
        boxAt(0.2, CORRIDOR_HEIGHT, 4.6, 2.6, CORRIDOR_HEIGHT / 2, 0),
        boxAt(5.4, CORRIDOR_HEIGHT, 0.2, 0, CORRIDOR_HEIGHT / 2, -2.2),
        boxAt(5.4, CORRIDOR_HEIGHT, 0.2, 0, CORRIDOR_HEIGHT / 2, 2.2),
      ]),
      M.corridorWall,
    );
    bay.add(bayShell);
    const bayFloor = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 4.6), M.corridorFloor);
    bayFloor.rotation.x = -Math.PI / 2;
    bayFloor.position.y = 0.005;
    bayFloor.receiveShadow = true;
    bay.add(bayFloor);
    const bayLight = new THREE.PointLight(0xffd9a0, 6, 8, 2);
    bayLight.position.set(0, 2.5, 0);
    bay.add(bayLight);
    this.ceilingLights.push(bayLight);
    this.baseLightIntensity.push(6);
    this.anchors.podBay = anchor(this.root, 'podBay', BAY_X, 0, 17);

    // -------------------------------------------------------- consoles
    const consoleTints: Array<'amber' | 'ice' | 'red'> = ['ice', 'amber', 'ice', 'red'];
    const consolePlacements: Array<[number, number, number]> = [
      [-VESTIBULE_HALF_WIDTH + 0.3, 18.4, Math.PI / 2],
      [-VESTIBULE_HALF_WIDTH + 0.3, 12.6, Math.PI / 2],
      [VESTIBULE_HALF_WIDTH - 0.3, 12.0, -Math.PI / 2],
      [-CORRIDOR_HALF_WIDTH + 0.18, -3.5, Math.PI / 2],
    ];
    consolePlacements.forEach(([x, z, ry], i) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      const body = new THREE.Mesh(
        mergeParts([boxAt(1.5, 1.05, 0.5, 0, 0.52, 0), boxAt(1.4, 0.62, 0.28, 0, 1.42, -0.1)]),
        M.corridorTrim,
      );
      body.castShadow = true;
      g.add(body);
      const screenMat = new THREE.MeshBasicMaterial({
        map: consoleTexture(`c${i}`, consoleTints[i]),
        toneMapped: false,
      });
      this.consoleMats.push(screenMat);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 0.5), screenMat);
      screen.position.set(0, 1.42, 0.05);
      g.add(screen);
      const deck = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.42), screenMat);
      deck.rotation.x = -Math.PI / 2.4;
      deck.position.set(0, 1.03, 0.16);
      g.add(deck);
      const spill = new THREE.PointLight(
        consoleTints[i] === 'amber' ? 0xffb44a : consoleTints[i] === 'red' ? 0xff5a48 : 0x8fd3ff,
        1.6,
        3.2,
        2,
      );
      spill.position.set(0, 1.4, 0.5);
      g.add(spill);
      this.root.add(g);
      if (i === 0) this.anchors.dataConsole = anchor(this.root, 'dataConsole', x + 0.9, 0, z);
    });

    // ------------------------------------------------------ alert strobes
    this.alarmMat = new THREE.MeshBasicMaterial({
      color: 0xff2a18,
      toneMapped: false,
      transparent: true,
      opacity: 0,
    });
    for (const z of [-11, -5, 1, 7, 13, 19]) {
      for (const side of [-1, 1]) {
        const halfW = z > 8 ? VESTIBULE_HALF_WIDTH : CORRIDOR_HALF_WIDTH;
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), this.alarmMat);
        lamp.position.set(side * (halfW - 0.16), CORRIDOR_HEIGHT - 0.42, z);
        this.root.add(lamp);
      }
      const l = new THREE.PointLight(0xff3018, 0, 6, 2);
      l.position.set(0, CORRIDOR_HEIGHT - 0.5, z);
      this.root.add(l);
      this.alarmLights.push(l);
    }

    // -------------------------------------------------- clutter and damage
    const clutter: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) {
      // Kept out of the first stretch inside the door so the boarding action
      // and the defenders' firing lines stay clear.
      const z = r.range(-9, 20);
      const side = r.bool() ? 1 : -1;
      const halfW = z > 8 ? VESTIBULE_HALF_WIDTH : CORRIDOR_HALF_WIDTH;
      const w = r.range(0.24, 0.5);
      const h = r.range(0.3, 0.62);
      const d = r.range(0.3, 0.62);
      const x = side * (halfW - w / 2 - 0.06);
      clutter.push(boxAt(w, h, d, x, h / 2, z));
      clutter.push(boxAt(w * 0.7, 0.05, d * 0.7, x, h + 0.03, z));
    }
    // Ceiling conduits.
    for (let i = 0; i < 8; i++) {
      const z = -14 + i * 4.2;
      clutter.push(boxAt(0.16, 0.16, 3.6, r.spread(1.1), CORRIDOR_HEIGHT - 0.22, z));
    }
    const clutterMesh = new THREE.Mesh(mergeParts(clutter), M.corridorTrim);
    clutterMesh.castShadow = true;
    this.root.add(clutterMesh);

    // Scorch decals near the door.
    const scorchMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    for (let i = 0; i < 10; i++) {
      const z = r.range(-14.6, -6);
      const side = r.bool() ? 1 : -1;
      const decal = new THREE.Mesh(new THREE.CircleGeometry(r.range(0.18, 0.5), 10), scorchMat);
      decal.position.set(side * (CORRIDOR_HALF_WIDTH - 0.04), r.range(0.4, 2.2), z);
      decal.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      decal.renderOrder = 1;
      this.root.add(decal);
    }

    // ------------------------------------------------------- volumetric haze
    this.hazeMat = new THREE.ShaderMaterial({
      uniforms: {
        density: { value: 0.05 },
        color: { value: new THREE.Color(0xd8e2f0) },
        time: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos; varying vec2 vUv;
        void main() {
          vUv = uv; vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float density; uniform vec3 color; uniform float time;
        varying vec3 vPos; varying vec2 vUv;
        float h(vec2 p) { return fract(sin(dot(p, vec2(23.1, 91.7))) * 3758.5453); }
        void main() {
          float n = h(floor(vUv * 24.0 + time * 0.15)) * 0.5 + h(floor(vUv * 9.0 - time * 0.08)) * 0.5;
          float a = density * (0.4 + n * 0.6) * smoothstep(0.0, 0.35, vUv.y) * (1.0 - vUv.y * 0.4);
          gl_FragColor = vec4(color * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    // Only four slices, and each is faint: stacked additive planes seen down
    // the length of the corridor accumulate fast and wash out the far end.
    for (let i = 0; i < 4; i++) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, CORRIDOR_HEIGHT), this.hazeMat);
      plane.position.set(0, CORRIDOR_HEIGHT / 2, -12.5 + i * 5.4);
      plane.renderOrder = 4;
      this.root.add(plane);
    }

    // ------------------------------------------------------------ anchors
    this.anchors.breachDoor = anchor(this.root, 'breachDoor', 0, 1.3, -15);
    this.anchors.corridorMid = anchor(this.root, 'corridorMid', 0, 1.5, -4);
    this.anchors.corridorNear = anchor(this.root, 'corridorNear', 0, 1.5, 4);
    this.anchors.vestibuleCenter = anchor(this.root, 'vestibuleCenter', 0, 1.5, 15);
    this.anchors.vestibuleStern = anchor(this.root, 'vestibuleStern', 0, 1.5, 21);
    this.anchors.podHatch = anchor(this.root, 'podHatchInterior', VESTIBULE_HALF_WIDTH + 2.55, 1.1, 17);
  }

  update(t: number, dt: number): void {
    void dt;
    const alert = this.alertLevel;
    const strobe = 0.5 + 0.5 * Math.sin(t * 4.2);
    this.alarmMat.opacity = alert * (0.35 + strobe * 0.65);
    this.alarmMat.color.setRGB(1, 0.16 + strobe * 0.06, 0.09);
    this.alarmLights.forEach((l, i) => {
      l.intensity = alert * (1.6 + 1.5 * Math.max(0, Math.sin(t * 4.2 - i * 0.35)));
    });

    const dim = 1 - this.vaderPresence * 0.55;
    const flick = 1 - alert * 0.12 * (0.5 + 0.5 * Math.sin(t * 17 + Math.sin(t * 5) * 3));
    this.ceilingLights.forEach((l, i) => {
      l.intensity = this.baseLightIntensity[i] * dim * flick;
      l.color.setRGB(1, 0.95 - this.vaderPresence * 0.14, 0.86 - this.vaderPresence * 0.12);
    });

    this.lightMat.color.setRGB(0.78 * dim * flick, 0.76 * dim * flick, 0.72 * dim * flick);
    this.hazeMat.uniforms.time.value = t;
    this.hazeMat.uniforms.density.value = 0.03 + alert * 0.045 + this.vaderPresence * 0.035;
    this.tubeLight.intensity = 1.2 + this.breachProgress * 3.4;
    this.breachDoor.update(this.breachProgress, t);
    this.podBayDoor.update();
    this.vestibuleDoor.update();
    this.consoleMats.forEach((mm, i) => {
      const f = 0.82 + 0.18 * Math.sin(t * (2 + i) + i);
      mm.color.setRGB(f, f, f);
    });
  }

  /** Driven by the timeline; see {@link BlastDoor} for the phase mapping. */
  breachProgress = 0;
}
