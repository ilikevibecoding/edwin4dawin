import * as THREE from 'three';
import {
  antennaCluster,
  box,
  cyl,
  greebleField,
  loft,
  merge,
  scaleUV,
  type LoftSection,
} from '../geometry';
import {
  darkMechanical,
  emissive,
  gunmetal,
  imperialHull,
  imperialHullDark,
  imperialTrench,
  windowBand,
} from '../materials';
import { hullWindowsMap } from '../textures';
import { freshRng } from '../../core/Random';
import { EngineBank } from './engines';
import { Turret } from './Turret';

/**
 * Imperial Star Destroyer — original interpretation of the classic wedge.
 *
 * Convention shared by every ship in the project: the model faces +Z, +Y is
 * dorsal, and the origin sits at the hull's centre of mass. Named anchors are
 * exposed for the camera director and the effects systems instead of raw
 * coordinates being repeated at call sites.
 */

export interface StarDestroyerOptions {
  /** Overall hull length in metres. */
  length?: number;
  /** Greeble density multiplier from the quality tier. */
  detail?: number;
  turretCount?: number;
}

export class StarDestroyer {
  readonly root = new THREE.Group();
  readonly length: number;
  readonly width: number;
  readonly height: number;

  readonly turrets: Turret[] = [];
  readonly engines: EngineBank;
  /** Named locations other systems attach to. */
  readonly anchors: Record<string, THREE.Object3D> = {};
  /** Roughly the world-space bounding radius, used by sanity checks. */
  readonly boundingRadius: number;

  private hangarGlow: THREE.Mesh;
  private bridgeLights: THREE.Mesh;
  private tractorGlow: THREE.Mesh;
  private beacons: THREE.PointLight[] = [];
  private beaconBulbs: THREE.Mesh[] = [];

  constructor(opts: StarDestroyerOptions = {}) {
    const L = (this.length = opts.length ?? 1600);
    const W = (this.width = L * 0.612);
    const H = (this.height = L * 0.163);
    const detail = opts.detail ?? 1;
    const rng = freshRng('star-destroyer');
    this.root.name = 'StarDestroyer';
    this.boundingRadius = L * 0.62;

    const halfL = L / 2;

    // ---- Primary hull -----------------------------------------------------
    const RING = 24;
    const sections: LoftSection[] = [];
    const STEPS = 26;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS; // 0 at nose, 1 at stern
      const z = halfL - t * L;
      const shape = Math.pow(Math.max(t, 0.0001), 0.92);
      const a = (W / 2) * shape;
      const h = H * Math.pow(Math.max(t, 0.0001), 1.05);
      const b = a * 0.78;
      // Nose is a slim blade rather than a point so it catches a highlight.
      const aa = Math.max(a, L * 0.006);
      const bb = Math.max(b, L * 0.004);
      const hh = Math.max(h, L * 0.004);
      const ring: Array<[number, number]> = [];
      // Top edge, left -> right.
      for (let k = 0; k <= RING / 2; k++) {
        const u = k / (RING / 2);
        ring.push([-aa + u * 2 * aa, 0]);
      }
      // Bottom edge, right -> left, with a shallow ventral keel.
      for (let k = 1; k < RING / 2; k++) {
        const u = k / (RING / 2);
        const x = bb - u * 2 * bb;
        const keel = -hh * (1 + 0.06 * Math.cos(u * Math.PI * 2));
        ring.push([x, keel]);
      }
      sections.push({ points: ring, z });
    }
    const hullGeo = scaleUV(loft(sections, true, true), 6, 9);
    const hull = new THREE.Mesh(hullGeo, imperialHull());
    hull.name = 'ISD_Hull';
    hull.castShadow = true;
    hull.receiveShadow = true;
    this.root.add(hull);

    // ---- Dorsal surface detail -------------------------------------------
    // Both greeble fields query the analytic hull profile so plating always
    // sits flush against the real surface instead of a flat imaginary plane.
    const dorsalGreeble = greebleField({
      width: W,
      depth: L * 0.94,
      y: 0,
      count: Math.round(520 * detail),
      minSize: L * 0.0035,
      maxSize: L * 0.019,
      minHeight: L * 0.0008,
      maxHeight: L * 0.0034,
      rng,
      mask: (x, z) => (Math.abs(x) < this.halfWidthAt(z) * 0.9 ? 1 : 0),
      // The wedge narrows towards the nose, so clear the plate against the hull
      // width at its own forward edge; otherwise long runs spear out of the
      // silhouette and read as debris stuck to the ship.
      fits: (x, z, hx, hz) => Math.abs(x) + hx < this.halfWidthAt(z + hz) * 0.96,
      elongate: 5.5,
      origin: [0, -0.4, 0],
      bite: 0.45,
    });
    const dorsal = new THREE.Mesh(dorsalGreeble, imperialHullDark());
    dorsal.name = 'ISD_DorsalGreeble';
    dorsal.castShadow = true;
    dorsal.receiveShadow = true;
    this.root.add(dorsal);

    // Long recessed trenches flanking the spine. Every run is clipped to the
    // analytic hull width at both ends so nothing spears out past the nose.
    const trenchParts: THREE.BufferGeometry[] = [];
    const tRng = rng.fork('isd-trench');
    for (let i = 0; i < Math.round(30 * detail); i++) {
      const zBack = tRng.range(-L * 0.44, L * 0.1);
      const len = L * tRng.range(0.08, 0.42);
      const zFront = Math.min(L * 0.46, zBack + len);
      const zc = (zBack + zFront) / 2;
      const limit = Math.min(this.halfWidthAt(zFront), this.halfWidthAt(zBack)) * 0.88;
      if (limit < L * 0.01) continue;
      const x = tRng.spread(limit);
      trenchParts.push(
        box(L * tRng.range(0.004, 0.011), L * 0.005, zFront - zBack, { pos: [x, -L * 0.0022, zc] }),
      );
    }
    // The two long structural walls that flank the dorsal spine.
    trenchParts.push(
      box(L * 0.04, L * 0.007, L * 0.55, { pos: [0, -L * 0.0024, -L * 0.06] }),
      box(L * 0.012, L * 0.012, L * 0.42, { pos: [W * 0.115, -L * 0.002, -L * 0.12] }),
      box(L * 0.012, L * 0.012, L * 0.42, { pos: [-W * 0.115, -L * 0.002, -L * 0.12] }),
    );
    const trench = new THREE.Mesh(merge(trenchParts), imperialTrench());
    trench.name = 'ISD_Trenches';
    trench.receiveShadow = true;
    this.root.add(trench);

    // Raised spine walls either side of the superstructure.
    const spineWalls = new THREE.Mesh(
      merge([
        box(L * 0.016, H * 0.1, L * 0.36, { pos: [W * 0.075, H * 0.05, -L * 0.3] }),
        box(L * 0.016, H * 0.1, L * 0.36, { pos: [-W * 0.075, H * 0.05, -L * 0.3] }),
        box(W * 0.16, H * 0.035, L * 0.06, { pos: [0, H * 0.017, -L * 0.47] }),
      ]),
      imperialHullDark(),
    );
    spineWalls.castShadow = true;
    spineWalls.receiveShadow = true;
    this.root.add(spineWalls);

    // ---- Superstructure ---------------------------------------------------
    const towerZ = -L * 0.315;
    const tower = new THREE.Group();
    tower.name = 'ISD_Superstructure';
    tower.position.set(0, 0, towerZ);
    this.root.add(tower);

    const tW = W * 0.2;
    const tD = L * 0.135;
    const tH = H * 0.58;
    const towerBody = loft(
      [
        { points: rect(tW * 0.5, tD * 0.5), z: 0 },
        { points: rect(tW * 0.44, tD * 0.46), z: tH * 0.55 },
        { points: rect(tW * 0.34, tD * 0.38), z: tH },
      ].map((s) => ({ points: s.points, z: s.z })),
      true,
      true,
    );
    // Built along +Z then stood upright.
    towerBody.rotateX(-Math.PI / 2);
    const towerMesh = new THREE.Mesh(towerBody, imperialHull());
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    tower.add(towerMesh);

    // Command bridge sits forward and high on the tower.
    const bridgeH = tH * 0.42;
    const bridge = new THREE.Mesh(
      merge([
        box(tW * 0.52, bridgeH, tD * 0.36, { pos: [0, tH + bridgeH * 0.5, tD * 0.1] }),
        box(tW * 0.6, bridgeH * 0.22, tD * 0.44, { pos: [0, tH + bridgeH * 0.96, tD * 0.1] }),
        box(tW * 0.2, bridgeH * 0.5, tD * 0.16, { pos: [0, tH + bridgeH * 1.2, tD * 0.05] }),
      ]),
      imperialHull(),
    );
    bridge.castShadow = true;
    tower.add(bridge);

    // Emissive bridge window band + hull window rows.
    const bridgeGlassGeo = merge([
      box(tW * 0.5, bridgeH * 0.34, 0.6, { pos: [0, tH + bridgeH * 0.58, tD * 0.28] }),
      box(0.6, bridgeH * 0.34, tD * 0.3, { pos: [tW * 0.25, tH + bridgeH * 0.58, tD * 0.12] }),
      box(0.6, bridgeH * 0.34, tD * 0.3, { pos: [-tW * 0.25, tH + bridgeH * 0.58, tD * 0.12] }),
    ]);
    this.bridgeLights = new THREE.Mesh(bridgeGlassGeo, windowBand());
    this.bridgeLights.name = 'ISD_BridgeWindows';
    tower.add(this.bridgeLights);

    // Deflector shield generator globes.
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        merge([
          cyl(tW * 0.05, tW * 0.07, tH * 0.22, 8, { pos: [side * tW * 0.3, tH + tH * 0.11, -tD * 0.22] }),
        ]),
        darkMechanical(),
      );
      tower.add(post);
      const globe = new THREE.Mesh(
        new THREE.IcosahedronGeometry(tW * 0.16, 1),
        imperialHullDark(),
      );
      globe.position.set(side * tW * 0.3, tH + tH * 0.22 + tW * 0.16, -tD * 0.22);
      globe.castShadow = true;
      tower.add(globe);
      this.anchors[`shieldGlobe${side > 0 ? 'R' : 'L'}`] = globe;
    }

    // Comms mast between the globes.
    const mast = new THREE.Mesh(
      merge([
        cyl(tW * 0.02, tW * 0.035, tH * 0.5, 6, { pos: [0, tH + tH * 0.25, -tD * 0.3] }),
        box(tW * 0.16, tW * 0.012, tW * 0.16, { pos: [0, tH + tH * 0.42, -tD * 0.3] }),
      ]),
      gunmetal(),
    );
    tower.add(mast);
    const antennae = new THREE.Mesh(
      antennaCluster(rng.fork('isd-antennae'), Math.round(12 * detail), tW * 0.45, tH * 0.3),
      gunmetal(),
    );
    antennae.position.set(0, tH, -tD * 0.05);
    tower.add(antennae);

    // Tower greeble skirt.
    const towerGreeble = new THREE.Mesh(
      greebleField({
        width: tW * 1.05,
        depth: tD * 1.05,
        y: 0,
        count: Math.round(70 * detail),
        minSize: L * 0.004,
        maxSize: L * 0.014,
        minHeight: L * 0.002,
        maxHeight: L * 0.01,
        rng: rng.fork('isd-tower-greeble'),
        mask: (u, v) => (Math.abs(u) > 0.34 || Math.abs(v) > 0.34 ? 1 : 0),
      }),
      imperialHullDark(),
    );
    tower.add(towerGreeble);

    // Lit hull windows over the tower flanks. The base colour matches the
    // surrounding plating so unlit rows disappear instead of reading as a
    // black rectangle stuck to the hull.
    const winTex = hullWindowsMap();
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x8d959c,
      emissive: new THREE.Color(0xcfe6ff),
      emissiveMap: winTex,
      emissiveIntensity: 1.1,
      roughness: 0.45,
      metalness: 0.3,
    });
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(tD * 0.58, tH * 0.3), winMat);
      panel.position.set(side * (tW * 0.46 + 0.3), tH * 0.42, -tD * 0.02);
      panel.rotation.y = side * Math.PI * 0.5;
      tower.add(panel);
    }

    // ---- Ventral detail: hangar, trench, tractor array --------------------
    const hangarZ = -L * 0.2;
    const hangarW = W * 0.14;
    const hangarD = L * 0.09;
    const hangarY = this.bellyY(hangarZ);
    const hangarRecess = new THREE.Mesh(
      merge([
        box(hangarW * 1.25, H * 0.06, hangarD * 1.3, { pos: [0, hangarY + H * 0.028, hangarZ] }),
      ]),
      imperialTrench(),
    );
    this.root.add(hangarRecess);
    // Lit deck seen up inside the recess. Sunk above the hull line so it never
    // shows as a bar of light along the silhouette when viewed edge-on.
    this.hangarGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(hangarW * 0.9, hangarD * 0.9),
      emissive('isdHangar', 0xffd2a0, 0.35),
    );
    this.hangarGlow.rotation.x = Math.PI / 2;
    this.hangarGlow.position.set(0, hangarY + H * 0.052, hangarZ);
    this.hangarGlow.name = 'ISD_HangarGlow';
    this.root.add(this.hangarGlow);
    const hangarLight = new THREE.PointLight(0xffd2a0, 1.4, L * 0.14, 2);
    hangarLight.position.set(0, hangarY + H * 0.06, hangarZ);
    this.root.add(hangarLight);
    this.anchors.hangar = makeAnchor('hangar', 0, hangarY, hangarZ, this.root);

    const ventralGreeble = new THREE.Mesh(
      greebleField({
        width: W * 0.8,
        depth: L * 0.86,
        y: (x, z) => this.bellySurfaceY(x, z),
        count: Math.round(430 * detail),
        minSize: L * 0.0035,
        maxSize: L * 0.012,
        minHeight: L * 0.0008,
        maxHeight: L * 0.0026,
        rng: rng.fork('isd-ventral'),
        mask: (x, z) => {
          const inHangar = Math.abs(x) < hangarW && Math.abs(z - hangarZ) < hangarD;
          return inHangar ? 0 : 1;
        },
        // Hold plating well inboard of the chine: anything that reaches the
        // edge is seen in silhouette from below and reads as loose panelling.
        fits: (x, z, hx, hz) => Math.abs(x) + hx < this.bellyHalfWidthAt(z + hz) * 0.86,
        elongate: 3.4,
        downward: true,
        bite: 0.5,
      }),
      imperialHullDark(),
    );
    ventralGreeble.name = 'ISD_VentralGreeble';
    this.root.add(ventralGreeble);

    // Ventral trench runs mirroring the dorsal ones.
    const ventralTrenchParts: THREE.BufferGeometry[] = [];
    const vRng = rng.fork('isd-ventral-trench');
    for (let i = 0; i < Math.round(22 * detail); i++) {
      const zBack = vRng.range(-L * 0.45, L * 0.05);
      const len = L * vRng.range(0.1, 0.4);
      const zFront = Math.min(L * 0.4, zBack + len);
      const zc = (zBack + zFront) / 2;
      const limit = Math.min(this.bellyHalfWidthAt(zFront), this.bellyHalfWidthAt(zBack)) * 0.9;
      if (limit < L * 0.012) continue;
      const x = vRng.spread(limit);
      const yc = (this.bellySurfaceY(x, zFront) + this.bellySurfaceY(x, zBack)) / 2;
      ventralTrenchParts.push(
        box(L * vRng.range(0.004, 0.009), L * 0.004, zFront - zBack, { pos: [x, yc + L * 0.0012, zc] }),
      );
    }
    ventralTrenchParts.push(
      box(W * 0.07, H * 0.02, L * 0.5, { pos: [0, this.bellySurfaceY(0, -L * 0.15) + H * 0.009, -L * 0.15] }),
    );
    const ventralTrench = new THREE.Mesh(merge(ventralTrenchParts), imperialTrench());
    ventralTrench.name = 'ISD_VentralTrenches';
    this.root.add(ventralTrench);

    // Tractor-beam projector array under the nose: a shallow housing with three
    // recessed emitter dishes rather than one bare sphere, which at this scale
    // would read as a flat cyan coin pasted over the hull.
    const tractorZ = L * 0.18;
    const tractorY = this.bellySurfaceY(0, tractorZ);
    const emitterR = W * 0.014;
    const housingParts = [
      box(W * 0.075, H * 0.045, L * 0.055, { pos: [0, tractorY - H * 0.02, tractorZ] }),
    ];
    const emitterSpots: Array<[number, number]> = [
      [0, 0],
      [-W * 0.024, -L * 0.012],
      [W * 0.024, -L * 0.012],
    ];
    for (const [ex, ez] of emitterSpots) {
      housingParts.push(
        cyl(emitterR * 1.5, emitterR * 1.25, H * 0.03, 12, {
          pos: [ex, tractorY - H * 0.05, tractorZ + ez],
        }),
      );
    }
    const tractorHousing = new THREE.Mesh(merge(housingParts), darkMechanical());
    this.root.add(tractorHousing);
    this.tractorGlow = new THREE.Mesh(
      merge(
        emitterSpots.map(([ex, ez]) =>
          cyl(emitterR, emitterR, H * 0.004, 12, { pos: [ex, tractorY - H * 0.062, tractorZ + ez] }),
        ),
      ),
      emissive('isdTractor', 0x8fd8ff, 2.4),
    );
    // Dark until the capture chapter powers the array up.
    this.tractorGlow.visible = false;
    this.root.add(this.tractorGlow);
    this.anchors.tractor = makeAnchor('tractor', 0, tractorY - H * 0.075, tractorZ, this.root);

    // ---- Stern & engines --------------------------------------------------
    const sternY = -H * 0.5;
    const sternZ = -halfL;
    const sternPlate = new THREE.Mesh(
      merge([
        box(W * 0.8, H * 0.8, L * 0.02, { pos: [0, sternY, sternZ + L * 0.008] }),
        box(W * 0.6, H * 0.55, L * 0.035, { pos: [0, sternY * 0.85, sternZ + L * 0.02] }),
      ]),
      imperialHullDark(),
    );
    sternPlate.castShadow = true;
    this.root.add(sternPlate);

    const bigR = H * 0.31;
    const smallR = H * 0.15;
    const nozzles = [
      { x: 0, y: sternY * 0.95, radius: bigR },
      { x: -bigR * 2.25, y: sternY * 0.95, radius: bigR },
      { x: bigR * 2.25, y: sternY * 0.95, radius: bigR },
      { x: -bigR * 3.5, y: sternY * 0.85, radius: smallR },
      { x: bigR * 3.5, y: sternY * 0.85, radius: smallR },
      { x: -bigR * 4.5, y: sternY * 0.72, radius: smallR * 0.78 },
      { x: bigR * 4.5, y: sternY * 0.72, radius: smallR * 0.78 },
    ];
    // Housings around each nozzle.
    const housings = nozzles.map((n) =>
      cyl(n.radius * 1.18, n.radius * 1.24, L * 0.035, 18, {
        pos: [n.x, n.y, sternZ + L * 0.017],
        rot: [Math.PI / 2, 0, 0],
      }),
    );
    const housingMesh = new THREE.Mesh(merge(housings), imperialHullDark());
    housingMesh.castShadow = true;
    this.root.add(housingMesh);

    this.engines = new EngineBank({
      nozzles,
      z: sternZ + L * 0.001,
      color: 0x8ec8ff,
      coreColor: 0xe8f4ff,
      plume: 3.4,
      haloScale: 3.0,
      light: { intensity: 40, distance: L * 0.9, color: 0x8ec8ff },
      emissiveKey: 'isdEngine',
    });
    this.root.add(this.engines.root);
    this.anchors.engines = makeAnchor('engines', 0, sternY, sternZ - L * 0.02, this.root);

    // ---- Turrets ----------------------------------------------------------
    const turretScale = L / 1600;
    const turretSpots: Array<[number, number]> = [
      [-0.14, -0.06],
      [0.14, -0.06],
      [-0.2, -0.2],
      [0.2, -0.2],
      [-0.09, 0.14],
      [0.09, 0.14],
      [-0.26, -0.3],
      [0.26, -0.3],
    ];
    const count = Math.min(opts.turretCount ?? 8, turretSpots.length);
    for (let i = 0; i < count; i++) {
      const [ux, uz] = turretSpots[i];
      const t = new Turret(turretScale * 3.2, 9);
      t.root.position.set(ux * W, -0.5, uz * L);
      t.standDown(0, 0.5);
      this.root.add(t.root);
      this.turrets.push(t);
    }

    // ---- Running lights ---------------------------------------------------
    const beaconSpots: Array<[number, number, number, number]> = [
      [0, 2, halfL * 0.9, 0xff5b4a],
      [-W * 0.46, 2, -halfL * 0.92, 0x7fe8a0],
      [W * 0.46, 2, -halfL * 0.92, 0xff5b4a],
    ];
    for (const [i, [x, y, z, color]] of beaconSpots.entries()) {
      // Each strobe pulses on its own phase, so it needs its own material.
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(L * 0.0022, 8, 6),
        emissive(`isdBeacon${i}`, color, 1.5),
      );
      bulb.position.set(x, y, z);
      this.root.add(bulb);
      const pl = new THREE.PointLight(color, 2.5, L * 0.09, 2);
      pl.position.set(x, y + 2, z);
      this.root.add(pl);
      this.beacons.push(pl);
      this.beaconBulbs.push(bulb);
    }

    // Ventral deck lighting. The belly faces away from the sun for the whole
    // capture sequence, and an unlit surface that size reads as a hole in the
    // frame. Scattered recessed strip lights give the underside a scale
    // reference without brightening the hull itself.
    const lRng = rng.fork('isd-ventral-lights');
    const lampParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < Math.round(150 * detail); i++) {
      const z = lRng.range(-L * 0.45, L * 0.42);
      const bw = this.bellyHalfWidthAt(z) * 0.92;
      if (bw < L * 0.02) continue;
      const x = lRng.spread(bw);
      if (Math.abs(x) < hangarW && Math.abs(z - hangarZ) < hangarD) continue;
      const w = L * lRng.range(0.0014, 0.005);
      lampParts.push(
        box(w, L * 0.0006, w * lRng.range(0.25, 0.8), {
          pos: [x, this.bellySurfaceY(x, z) - L * 0.0007, z],
        }),
      );
    }
    const ventralLights = new THREE.Mesh(merge(lampParts), emissive('isdDeckLight', 0xffe4bd, 1.15));
    ventralLights.name = 'ISD_VentralLights';
    this.root.add(ventralLights);

    // ---- Named anchors ----------------------------------------------------
    this.anchors.nose = makeAnchor('nose', 0, -H * 0.05, halfL, this.root);
    this.anchors.bridge = makeAnchor('bridge', 0, tH + bridgeH * 0.6, towerZ + tD * 0.3, this.root);
    this.anchors.dorsalMid = makeAnchor('dorsalMid', 0, 4, -L * 0.05, this.root);
    this.anchors.portFlank = makeAnchor('portFlank', -W * 0.4, -H * 0.4, -L * 0.25, this.root);
    this.anchors.starboardFlank = makeAnchor('starboardFlank', W * 0.4, -H * 0.4, -L * 0.25, this.root);
    this.anchors.underNose = makeAnchor('underNose', 0, -H * 0.35, L * 0.3, this.root);
  }

  /** Analytic dorsal half-width of the wedge at a local Z. */
  halfWidthAt(z: number): number {
    const t = Math.min(1, Math.max(0.0001, (this.length / 2 - z) / this.length));
    return (this.width / 2) * Math.pow(t, 0.92);
  }

  /** Analytic ventral surface height of the wedge at a local Z, on the keel. */
  bellyY(z: number): number {
    const t = Math.min(1, Math.max(0.0001, (this.length / 2 - z) / this.length));
    return -this.height * Math.pow(t, 1.05);
  }

  /** Half-width of the ventral face, which is inset from the dorsal edge. */
  bellyHalfWidthAt(z: number): number {
    return Math.max(this.length * 0.004, this.halfWidthAt(z) * 0.78);
  }

  /**
   * Height of the ventral face at a local (x, z). Mirrors the shallow keel
   * built into the loft profile so attached detail lands on the real surface.
   */
  bellySurfaceY(x: number, z: number): number {
    const bb = this.bellyHalfWidthAt(z);
    if (Math.abs(x) > bb) return this.bellyY(z);
    const u = (bb - x) / (2 * bb);
    return this.bellyY(z) * (1 + 0.06 * Math.cos(u * Math.PI * 2));
  }

  /** Aim every turret at a world point; returns turrets ready to fire. */
  trackTarget(worldPoint: THREE.Vector3): Turret[] {
    const ready: Turret[] = [];
    for (const t of this.turrets) {
      t.aimAt(worldPoint);
      if (t.cooldown <= 0) ready.push(t);
    }
    return ready;
  }

  standDown(): void {
    for (const t of this.turrets) t.standDown(0, 0.45);
  }

  setHangarGlow(v: number): void {
    (this.hangarGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 * v;
  }

  setTractorGlow(v: number): void {
    (this.tractorGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.4 * v;
    this.tractorGlow.visible = v > 0.005;
  }

  update(dt: number, elapsed: number): void {
    this.engines.update(elapsed);
    for (const t of this.turrets) t.update(dt);
    const pulseV = 0.6 + 0.4 * Math.sin(elapsed * 2.1);
    for (let i = 0; i < this.beacons.length; i++) {
      // Navigation strobes: mostly dark with a short bright flash, so they read
      // as blinking lights rather than three permanent coloured smudges.
      const phase = (elapsed * 0.55 + i * 0.31) % 1;
      const flash = phase < 0.12 ? Math.sin((phase / 0.12) * Math.PI) : 0;
      this.beacons[i].intensity = 0.35 + 3.4 * flash;
      const bulbMat = this.beaconBulbs[i].material as THREE.MeshStandardMaterial;
      bulbMat.emissiveIntensity = 0.5 + 3 * flash;
    }
    (this.bridgeLights.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1.35 + 0.1 * pulseV;
  }
}

function rect(hw: number, hd: number): Array<[number, number]> {
  // Trapezoidal footprint, wider at the back of the tower.
  return [
    [-hw, -hd],
    [-hw * 0.86, hd],
    [hw * 0.86, hd],
    [hw, -hd],
  ];
}

function makeAnchor(
  name: string,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D,
): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = `anchor:${name}`;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

export { makeAnchor };
