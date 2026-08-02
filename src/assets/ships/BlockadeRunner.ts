import * as THREE from 'three';
import {
  antennaCluster,
  box,
  cyl,
  greebleField,
  loft,
  merge,
  sphere,
  type LoftSection,
} from '../geometry';
import {
  darkMechanical,
  emissive,
  gunmetal,
  rebelAccent,
  rebelHull,
  rebelHullDark,
  windowBand,
} from '../materials';
import { freshRng } from '../../core/Random';
import { EngineBank } from './engines';
import { makeAnchor } from './StarDestroyer';

/**
 * Rebel blockade runner — an original design in the spirit of the Tantive IV.
 *
 * Silhouette targets: white cylindrical spine, a broad "hammerhead" command
 * section on a slim neck, a fat engine block with a clustered ring of eleven
 * nozzles, and a scattering of weathered plating and escape-pod hatches.
 * Faces +Z like every ship in the project.
 */

export interface BlockadeRunnerOptions {
  length?: number;
  detail?: number;
}

export class BlockadeRunner {
  readonly root = new THREE.Group();
  readonly length: number;
  readonly radius: number;
  readonly engines: EngineBank;
  readonly anchors: Record<string, THREE.Object3D> = {};
  readonly boundingRadius: number;
  /** Hatch the escape pod leaves from — the pod is parented here until launch. */
  readonly podBay: THREE.Object3D;

  private cockpitGlass: THREE.Mesh;
  private runningLights: THREE.Mesh;
  private damageSmokeAnchors: THREE.Object3D[] = [];
  private hullMeshes: THREE.Mesh[] = [];
  private scorchLevel = 0;

  constructor(opts: BlockadeRunnerOptions = {}) {
    const L = (this.length = opts.length ?? 150);
    const detail = opts.detail ?? 1;
    const rng = freshRng('blockade-runner');
    this.root.name = 'BlockadeRunner';
    const R = (this.radius = L * 0.055);
    this.boundingRadius = L * 0.6;

    // ---- Main spine -------------------------------------------------------
    const RING = 18;
    const spineSections: LoftSection[] = [];
    const spineFront = L * 0.2;
    const spineBack = -L * 0.28;
    const SEG = 14;
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const z = spineFront + (spineBack - spineFront) * u;
      // Slight bulge toward the rear where the drive section begins.
      const r = R * (0.82 + 0.28 * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.1)));
      const ring: Array<[number, number]> = [];
      for (let k = 0; k < RING; k++) {
        const a = (k / RING) * Math.PI * 2;
        // Flatten the belly slightly and raise a dorsal spine.
        const shape = 1 + 0.1 * Math.cos(a * 2) - 0.08 * Math.max(0, -Math.sin(a));
        ring.push([Math.cos(a) * r * shape, Math.sin(a) * r * shape * 0.92]);
      }
      spineSections.push({ points: ring, z });
    }
    const spine = new THREE.Mesh(loft(spineSections, true, true), rebelHull());
    spine.name = 'CR_Spine';
    spine.castShadow = true;
    spine.receiveShadow = true;
    this.root.add(spine);
    this.hullMeshes.push(spine);

    // Dorsal fin / spine rail.
    const dorsalRail = new THREE.Mesh(
      merge([
        box(R * 0.5, R * 0.55, L * 0.42, { pos: [0, R * 0.95, -L * 0.05] }),
        box(R * 0.9, R * 0.2, L * 0.3, { pos: [0, R * 1.15, -L * 0.03] }),
      ]),
      rebelHullDark(),
    );
    dorsalRail.castShadow = true;
    this.root.add(dorsalRail);

    // ---- Neck -------------------------------------------------------------
    const neck = new THREE.Mesh(
      merge([
        cyl(R * 0.52, R * 0.78, L * 0.14, 14, { pos: [0, R * 0.05, L * 0.265], rot: [Math.PI / 2, 0, 0] }),
        box(R * 1.5, R * 0.35, L * 0.1, { pos: [0, -R * 0.45, L * 0.27] }),
      ]),
      rebelHullDark(),
    );
    neck.castShadow = true;
    this.root.add(neck);

    // ---- Hammerhead command section ---------------------------------------
    const headZ = L * 0.39;
    const headW = L * 0.28;
    const headH = L * 0.062;
    const headD = L * 0.115;
    const headSections: LoftSection[] = [];
    const headSteps = 6;
    for (let i = 0; i <= headSteps; i++) {
      const u = i / headSteps;
      const z = headZ - headD * 0.5 + headD * u;
      // Widens quickly then squares off; front face is slightly narrower.
      const wScale = 0.55 + 0.45 * Math.sin(Math.min(1, u * 1.25) * Math.PI * 0.5);
      const hScale = 0.72 + 0.28 * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5) - u * u * 0.18;
      const hw = (headW / 2) * wScale;
      const hh = (headH / 2) * hScale;
      const ring: Array<[number, number]> = [];
      const corner = Math.min(hw, hh) * 0.55;
      const outline: Array<[number, number]> = [
        [-hw + corner, hh],
        [hw - corner, hh],
        [hw, hh - corner],
        [hw, -hh + corner],
        [hw - corner, -hh],
        [-hw + corner, -hh],
        [-hw, -hh + corner],
        [-hw, hh - corner],
      ];
      // Resample to a fixed ring size for the loft.
      for (let k = 0; k < 16; k++) {
        const f = (k / 16) * outline.length;
        const i0 = Math.floor(f) % outline.length;
        const i1 = (i0 + 1) % outline.length;
        const t = f - Math.floor(f);
        ring.push([
          outline[i0][0] + (outline[i1][0] - outline[i0][0]) * t,
          outline[i0][1] + (outline[i1][1] - outline[i0][1]) * t,
        ]);
      }
      headSections.push({ points: ring, z });
    }
    const head = new THREE.Mesh(loft(headSections, true, true), rebelHull());
    head.name = 'CR_Hammerhead';
    head.castShadow = true;
    head.receiveShadow = true;
    this.root.add(head);
    this.hullMeshes.push(head);

    // Forward prongs — the "hammer" tips.
    const prongs: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      prongs.push(
        box(L * 0.022, headH * 0.5, L * 0.05, {
          pos: [side * headW * 0.44, headH * 0.06, headZ + headD * 0.55],
        }),
        cyl(L * 0.008, L * 0.012, L * 0.05, 8, {
          pos: [side * headW * 0.44, headH * 0.06, headZ + headD * 0.82],
          rot: [Math.PI / 2, 0, 0],
        }),
      );
    }
    const prongMesh = new THREE.Mesh(merge(prongs), rebelHullDark());
    prongMesh.castShadow = true;
    this.root.add(prongMesh);

    // Cockpit window band across the front of the hammerhead.
    this.cockpitGlass = new THREE.Mesh(
      merge([
        box(headW * 0.66, headH * 0.3, L * 0.004, { pos: [0, headH * 0.12, headZ + headD * 0.5] }),
        box(L * 0.006, headH * 0.26, headD * 0.4, {
          pos: [headW * 0.35, headH * 0.1, headZ + headD * 0.22],
        }),
        box(L * 0.006, headH * 0.26, headD * 0.4, {
          pos: [-headW * 0.35, headH * 0.1, headZ + headD * 0.22],
        }),
      ]),
      windowBand(),
    );
    this.cockpitGlass.name = 'CR_Cockpit';
    this.root.add(this.cockpitGlass);

    // Red identification stripes.
    const stripes = new THREE.Mesh(
      merge([
        box(headW * 0.9, L * 0.004, L * 0.012, { pos: [0, headH * 0.42, headZ - headD * 0.1] }),
        box(L * 0.01, R * 1.6, L * 0.02, { pos: [R * 0.86, 0, L * 0.08] }),
        box(L * 0.01, R * 1.6, L * 0.02, { pos: [-R * 0.86, 0, L * 0.08] }),
      ]),
      rebelAccent(),
    );
    this.root.add(stripes);

    // ---- Engine block -----------------------------------------------------
    // The exhaust plane sits exactly on the block's aft face, otherwise the
    // loft's end cap hides the nozzles.
    const blockZ = -L * 0.44;
    const blockR = R * 1.62;
    const blockSections: LoftSection[] = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const z = spineBack + (blockZ - spineBack) * u;
      const r = R * (1.05 + 0.57 * Math.sin(Math.min(1, u * 1.35) * Math.PI * 0.5));
      const ring: Array<[number, number]> = [];
      for (let k = 0; k < RING; k++) {
        const a = (k / RING) * Math.PI * 2;
        ring.push([Math.cos(a) * r, Math.sin(a) * r * 0.94]);
      }
      blockSections.push({ points: ring, z });
    }
    const engineBlock = new THREE.Mesh(loft(blockSections, false, true), rebelHull());
    engineBlock.name = 'CR_EngineBlock';
    engineBlock.castShadow = true;
    engineBlock.receiveShadow = true;
    this.root.add(engineBlock);

    // Eleven nozzles: 1 centre, ring of 4, ring of 6.
    const nozzles: Array<{ x: number; y: number; radius: number }> = [
      { x: 0, y: 0, radius: R * 0.42 },
    ];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      nozzles.push({ x: Math.cos(a) * R * 0.78, y: Math.sin(a) * R * 0.74, radius: R * 0.3 });
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      nozzles.push({ x: Math.cos(a) * R * 1.26, y: Math.sin(a) * R * 1.19, radius: R * 0.24 });
    }
    const rims = nozzles.map((n) =>
      cyl(n.radius * 1.24, n.radius * 1.34, L * 0.02, 14, {
        pos: [n.x, n.y, blockZ + L * 0.008],
        rot: [Math.PI / 2, 0, 0],
      }),
    );
    // Aft face plate the nozzles are set into.
    rims.push(
      cyl(blockR * 1.02, blockR * 1.02, L * 0.006, 20, {
        pos: [0, 0, blockZ + L * 0.004],
        rot: [Math.PI / 2, 0, 0],
      }),
    );
    const rimMesh = new THREE.Mesh(merge(rims), gunmetal());
    this.root.add(rimMesh);

    this.engines = new EngineBank({
      nozzles,
      z: blockZ,
      color: 0x9fd6ff,
      coreColor: 0xf2fbff,
      plume: 5.5,
      haloScale: 4.2,
      light: { intensity: 14, distance: L * 1.1, color: 0x9fd6ff },
      emissiveKey: 'crEngine',
    });
    this.root.add(this.engines.root);

    // ---- Surface detail ---------------------------------------------------
    const hullRadiusAt = (z: number): number => {
      if (z > L * 0.2) return 0;
      if (z < spineBack) return blockR * 0.9;
      const u = (spineFront - z) / (spineFront - spineBack);
      return R * (0.82 + 0.28 * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.1))) * 0.95;
    };

    const greebleParts: THREE.BufferGeometry[] = [];
    const gRng = rng.fork('cr-greeble');
    for (let i = 0; i < Math.round(120 * detail); i++) {
      const z = gRng.range(spineBack + L * 0.02, spineFront - L * 0.02);
      const a = gRng.range(0, Math.PI * 2);
      const r = hullRadiusAt(z);
      if (r <= 0) continue;
      const w = gRng.range(L * 0.008, L * 0.03);
      const h = gRng.range(L * 0.002, L * 0.008);
      const d = gRng.range(L * 0.006, L * 0.05);
      const g = box(w, h, d);
      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3(Math.cos(a) * (r + h * 0.4), Math.sin(a) * (r + h * 0.4) * 0.92, z);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a - Math.PI / 2));
      m.compose(pos, q, new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(m);
      greebleParts.push(g);
    }
    // Hammerhead top/bottom plating.
    greebleParts.push(
      greebleField({
        width: headW * 0.86,
        depth: headD * 0.8,
        y: headH * 0.5,
        count: Math.round(34 * detail),
        minSize: L * 0.008,
        maxSize: L * 0.026,
        minHeight: L * 0.0015,
        maxHeight: L * 0.005,
        rng: rng.fork('cr-head-greeble'),
        origin: [0, 0, headZ],
      }),
    );
    const greebleMesh = new THREE.Mesh(merge(greebleParts), rebelHullDark());
    greebleMesh.name = 'CR_Greeble';
    greebleMesh.castShadow = true;
    this.root.add(greebleMesh);

    // Escape-pod hatches down the port and starboard flanks.
    const hatchParts: THREE.BufferGeometry[] = [];
    const podZs = [L * 0.13, L * 0.05, -L * 0.03, -L * 0.11, -L * 0.19];
    for (const z of podZs) {
      for (const side of [-1, 1]) {
        const r = hullRadiusAt(z);
        const a = side > 0 ? 0.35 : Math.PI - 0.35;
        hatchParts.push(
          cyl(R * 0.3, R * 0.3, R * 0.1, 6, {
            pos: [Math.cos(a) * r, Math.sin(a) * r * 0.92 - R * 0.25, z],
            rot: [Math.PI / 2, 0, a],
          }),
        );
      }
    }
    const hatches = new THREE.Mesh(merge(hatchParts), rebelHullDark());
    this.root.add(hatches);

    // The pod that actually launches sits low on the starboard flank.
    this.podBay = makeAnchor('podBay', R * 0.72, -R * 0.6, -L * 0.03, this.root);

    // Sensor dish + antennae on the dorsal rail.
    const dish = new THREE.Mesh(
      merge([
        cyl(R * 0.06, R * 0.08, R * 0.5, 6, { pos: [0, R * 1.5, L * 0.06] }),
        sphere(R * 0.22, 10, 6, { pos: [0, R * 1.78, L * 0.06] }),
      ]),
      gunmetal(),
    );
    this.root.add(dish);
    const ants = new THREE.Mesh(
      antennaCluster(rng.fork('cr-ant'), Math.round(6 * detail), R * 0.8, R * 1.1),
      gunmetal(),
    );
    ants.position.set(0, R * 1.05, -L * 0.13);
    this.root.add(ants);

    // Ventral sensor pod / turret blister.
    const blister = new THREE.Mesh(
      merge([
        sphere(R * 0.42, 12, 8, { pos: [0, -R * 1.0, L * 0.02] }),
        cyl(R * 0.16, R * 0.2, R * 0.4, 8, { pos: [0, -R * 0.8, L * 0.02] }),
      ]),
      darkMechanical(),
    );
    this.root.add(blister);

    // ---- Running lights ---------------------------------------------------
    this.runningLights = new THREE.Mesh(
      merge([
        sphere(L * 0.004, 6, 4, { pos: [headW * 0.47, headH * 0.1, headZ + headD * 0.3] }),
        sphere(L * 0.004, 6, 4, { pos: [-headW * 0.47, headH * 0.1, headZ + headD * 0.3] }),
        sphere(L * 0.004, 6, 4, { pos: [0, R * 1.35, -L * 0.2] }),
      ]),
      emissive('crRunning', 0xffd39b, 3),
    );
    this.root.add(this.runningLights);

    // ---- Anchors for camera / effects -------------------------------------
    this.anchors.nose = makeAnchor('nose', 0, 0, headZ + headD * 0.9, this.root);
    this.anchors.cockpit = makeAnchor('cockpit', 0, headH * 0.2, headZ + headD * 0.3, this.root);
    this.anchors.dorsal = makeAnchor('dorsal', 0, R * 1.6, 0, this.root);
    this.anchors.portFlank = makeAnchor('portFlank', -R * 1.8, 0, -L * 0.02, this.root);
    this.anchors.starboardFlank = makeAnchor('starboardFlank', R * 1.8, 0, -L * 0.02, this.root);
    this.anchors.stern = makeAnchor('stern', 0, 0, blockZ - L * 0.02, this.root);
    this.anchors.hullMid = makeAnchor('hullMid', 0, 0, 0, this.root);

    for (const [x, y, z] of [
      [R * 0.9, R * 0.5, -L * 0.14],
      [-R * 0.7, R * 0.8, L * 0.02],
      [0, R * 1.1, -L * 0.24],
    ] as Array<[number, number, number]>) {
      this.damageSmokeAnchors.push(makeAnchor('damage', x, y, z, this.root));
    }
  }

  get smokeAnchors(): THREE.Object3D[] {
    return this.damageSmokeAnchors;
  }

  /** 0 = pristine, 1 = badly scorched and venting. */
  setDamage(v: number): void {
    this.scorchLevel = v;
    const mat = this.hullMeshes[0].material as THREE.MeshStandardMaterial;
    // Darken and roughen the hull as damage accumulates.
    mat.color.setHex(0xe3e1d8).multiplyScalar(1 - 0.22 * v);
    mat.roughness = 0.62 + 0.2 * v;
  }

  get damage(): number {
    return this.scorchLevel;
  }

  setCockpitLights(v: number): void {
    (this.cockpitGlass.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 * v;
  }

  update(_dt: number, elapsed: number): void {
    this.engines.update(elapsed);
    const flick = this.scorchLevel > 0.4 ? (Math.sin(elapsed * 21) > 0.2 ? 1 : 0.25) : 1;
    (this.runningLights.material as THREE.MeshStandardMaterial).emissiveIntensity =
      3 * (0.55 + 0.45 * Math.sin(elapsed * 2.4)) * flick;
  }
}
