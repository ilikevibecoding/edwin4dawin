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
  frustumBox,
  greebleInstances,
  mergeParts,
  parametricSurface,
  windowStrip,
} from './Greeble';
import { radialTexture } from './Textures';
import { rng } from '../core/Rng';
import type { QualitySettings } from '../core/Quality';
import { clamp, damp } from '../core/MathX';

/**
 * The Imperial destroyer: a 1600 unit dagger.
 *
 * The silhouette is the whole point, so the hull is a clean lofted wedge and
 * all the noise lives in instanced greeble, trenches and the superstructure.
 * Local frame matches every other ship: nose at -Z, stern at +Z.
 */

const LENGTH = 1600;
const HALF_LEN = LENGTH / 2;
const STERN_HALF_WIDTH = 495;
const NOSE_HALF_WIDTH = 6;

/** Plan half-width as a function of normalised nose→stern parameter. */
const halfWidth = (t: number): number => NOSE_HALF_WIDTH + (STERN_HALF_WIDTH - NOSE_HALF_WIDTH) * t;
// Depth matters as much as plan: a wedge only a sixth as thick as it is wide
// reads as a paper dart. At the transom this hull stands 250 units in a 990
// unit beam, which is what lets the reveal feel like a building going past.
const topY = (t: number): number => 6 + 146 * Math.pow(t, 0.92);
const botY = (t: number): number => -4 - 100 * Math.pow(t, 1.12);
const zAt = (t: number): number => -HALF_LEN + LENGTH * t;
export const destroyerParamAtZ = (z: number): number => clamp((z + HALF_LEN) / LENGTH, 0, 1);

/** Smooth 0..1 pulse centred on `c` with half-width `w`. */
function lane(a: number, c: number, w: number): number {
  const d = Math.abs(a - c) / w;
  return d >= 1 ? 0 : Math.pow(Math.cos(d * Math.PI * 0.5), 2);
}

/**
 * Longitudinal service trenches cut into the plating.
 *
 * `across` is the lateral position as a fraction of the local half-width. The
 * lanes are modelled into the loft rather than faked with dark strips so they
 * self-shadow and catch the key light along one wall.
 */
function dorsalGroove(across: number): number {
  const a = Math.abs(across);
  return -(lane(a, 0.62, 0.09) * 9 + lane(a, 0.34, 0.055) * 5);
}
function ventralGroove(across: number): number {
  const a = Math.abs(across);
  return lane(a, 0.55, 0.1) * 11 + lane(a, 0.26, 0.07) * 6 + lane(a, 0.86, 0.06) * 4;
}

export interface Turret {
  root: THREE.Group;
  yoke: THREE.Group;
  barrels: THREE.Group;
  muzzles: THREE.Object3D[];
  side: number;
}

export class StarDestroyer {
  readonly root = new THREE.Group();
  readonly anchors: Anchors = {};
  readonly length = LENGTH;
  readonly turrets: Turret[] = [];
  readonly ventralTurrets: Turret[] = [];

  private plumes: Plume[] = [];
  private glows: THREE.Mesh[] = [];
  private navLights: RunningLights;
  private engineLights: THREE.PointLight[] = [];
  private hangarLight: THREE.PointLight;
  private windowMat: THREE.MeshBasicMaterial;
  private tractorCone: THREE.Mesh;
  private tractorMat: THREE.ShaderMaterial;

  enginePower = 1;
  /** 0..1 strength of the tractor beam reaching down to the captured ship. */
  tractorBeam = 0;

  constructor(quality: QualitySettings) {
    const M = getMaterials();
    const r = rng('star-destroyer');
    this.root.name = 'StarDestroyer';

    const seg = quality.name === 'low' ? 24 : 48;

    // ------------------------------------------------------- hull surfaces
    // One plating tile covers TILE units in both directions on every surface,
    // so panels stay square from the needle bow to the 990-unit stern.
    const TILE = 165;
    const across = quality.name === 'low' ? 40 : 72;
    const dorsal = parametricSurface(
      seg,
      across,
      (u, v, out) => {
        const w = halfWidth(u);
        const a = v * 2 - 1;
        out.set(a * w, topY(u) + dorsalGroove(a) * Math.min(1, u * 3), zAt(u));
      },
      [1, 1],
      true,
      (u, v, out) => out.set((zAt(u) + HALF_LEN) / TILE, ((v * 2 - 1) * halfWidth(u)) / TILE),
    );
    const ventral = parametricSurface(
      seg,
      across,
      (u, v, out) => {
        const w = halfWidth(u) * 0.72;
        const a = v * 2 - 1;
        out.set(a * w, botY(u) + ventralGroove(a) * Math.min(1, u * 3), zAt(u));
      },
      [1, 1],
      false,
      (u, v, out) =>
        out.set((zAt(u) + HALF_LEN) / TILE, ((v * 2 - 1) * halfWidth(u) * 0.72) / TILE),
    );
    const sideL = parametricSurface(
      seg,
      3,
      (u, v, out) => {
        const wTop = halfWidth(u);
        const wBot = wTop * 0.72;
        out.set(-(wTop + (wBot - wTop) * v), topY(u) + (botY(u) - topY(u)) * v, zAt(u));
      },
      [1, 1],
      false,
      (u, v, out) => out.set((zAt(u) + HALF_LEN) / TILE, (v * (topY(u) - botY(u))) / TILE),
    );
    const sideR = parametricSurface(
      seg,
      3,
      (u, v, out) => {
        const wTop = halfWidth(u);
        const wBot = wTop * 0.72;
        out.set(wTop + (wBot - wTop) * v, topY(u) + (botY(u) - topY(u)) * v, zAt(u));
      },
      [1, 1],
      true,
      (u, v, out) => out.set((zAt(u) + HALF_LEN) / TILE, (v * (topY(u) - botY(u))) / TILE),
    );
    const sternCap = parametricSurface(
      3,
      3,
      (u, v, out) => {
        const w = halfWidth(1) * (1 - v * 0.28);
        out.set((u * 2 - 1) * w, topY(1) + (botY(1) - topY(1)) * v, HALF_LEN);
      },
      [1, 1],
      false,
      (u, v, out) =>
        out.set((u * 2 - 1) * halfWidth(1) / TILE, (v * (topY(1) - botY(1))) / TILE),
    );

    const hull = new THREE.Mesh(
      mergeParts([dorsal, ventral, sideL, sideR, sternCap]),
      M.imperialHull,
    );
    hull.name = 'hull';
    hull.castShadow = true;
    hull.receiveShadow = true;
    this.root.add(hull);

    // --------------------------------------------------- dorsal structure
    // The trenches are cut into the loft; what is left to build is the raised
    // spine that runs from the bow to the superstructure and its side strata.
    const spineParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 30; i++) {
      const t = 0.08 + (i / 30) * 0.62;
      const z = zAt(t);
      const w = halfWidth(t);
      spineParts.push(boxAt(w * 0.26, 6.5, LENGTH * 0.021, 0, topY(t) + 2.4, z));
    }
    const spine = new THREE.Mesh(mergeParts(spineParts), M.imperialHullDark);
    spine.name = 'dorsalSpine';
    this.root.add(spine);

    // Stepped strata between the spine and the outer trench.
    const plateParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 18; i++) {
      const t = 0.2 + (i / 18) * 0.52;
      const w = halfWidth(t);
      for (const side of [-1, 1]) {
        plateParts.push(
          boxAt(w * 0.15, 3.4, LENGTH * 0.028, side * w * 0.47, topY(t) + 1.5, zAt(t)),
        );
      }
    }
    const plates = new THREE.Mesh(mergeParts(plateParts), M.imperialHullDark);
    this.root.add(plates);

    // ------------------------------------------------------ superstructure
    // The command island is the ship's second silhouette: a broad stepped
    // castle at the transom, a narrow neck, then the bridge deck flanked by
    // two domes. Its faces are plain grey — the plating normal map smeared
    // over a 400-unit slab produced a single mirror-bright band across the
    // front of the tower, which is the one thing that must never happen here.
    const superGroup = new THREE.Group();
    superGroup.name = 'superstructure';
    this.root.add(superGroup);

    const baseT = 0.76;
    const baseZ = zAt(baseT);
    const baseY = topY(baseT);

    const l1 = new THREE.Mesh(frustumBox(212, 168, 190, 150, 52), M.imperialPlate);
    l1.position.set(0, baseY - 4, baseZ + 178);
    superGroup.add(l1);

    const l2 = new THREE.Mesh(frustumBox(178, 136, 150, 116, 46), M.imperialPlate);
    l2.position.set(0, baseY + 46, baseZ + 182);
    superGroup.add(l2);

    // Trench between the castle and the tower, so the neck reads.
    const shoulders = new THREE.Mesh(
      mergeParts([
        boxAt(300, 12, 40, 0, baseY + 92, baseZ + 92),
        boxAt(40, 14, 150, -272, baseY + 90, baseZ + 178),
        boxAt(40, 14, 150, 272, baseY + 90, baseZ + 178),
      ]),
      M.imperialHullDark,
    );
    superGroup.add(shoulders);

    const tower = new THREE.Mesh(frustumBox(104, 84, 92, 72, 76), M.imperialHullDark);
    tower.position.set(0, baseY + 90, baseZ + 186);
    superGroup.add(tower);

    // Command deck: wider than the neck it sits on, which is the read.
    const bridge = new THREE.Mesh(frustumBox(132, 54, 124, 46, 30), M.imperialPlate);
    bridge.position.set(0, baseY + 164, baseZ + 178);
    superGroup.add(bridge);
    this.anchors.bridge = anchor(superGroup, 'bridge', 0, baseY + 186, baseZ + 150);

    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(212, 9, 3), M.emissiveIce);
    bridgeGlass.position.set(0, baseY + 180, baseZ + 128);
    bridgeGlass.name = 'imperialBridgeGlass';
    superGroup.add(bridgeGlass);

    // Deflector domes on outriggers either side of the bridge.
    for (const side of [-1, 1]) {
      const domeStalk = new THREE.Mesh(new THREE.CylinderGeometry(11, 14, 34, 10), M.imperialTrim);
      domeStalk.position.set(side * 88, baseY + 190, baseZ + 202);
      superGroup.add(domeStalk);
      const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 1), M.imperialPlate);
      dome.position.set(side * 88, baseY + 224, baseZ + 202);
      superGroup.add(dome);
      const domeRing = new THREE.Mesh(new THREE.TorusGeometry(29, 3, 6, 18), M.imperialTrim);
      domeRing.rotation.x = Math.PI / 2;
      domeRing.position.copy(dome.position);
      superGroup.add(domeRing);
    }

    // Comms mast.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 60, 8), M.imperialTrim);
    mast.position.set(0, baseY + 208, baseZ + 192);
    superGroup.add(mast);

    superGroup.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });

    // ------------------------------------------------------------ engines
    const engineGroup = new THREE.Group();
    engineGroup.position.z = HALF_LEN + 4;
    this.root.add(engineGroup);
    this.anchors.engines = engineGroup;

    // Three main thrusters high on the transom, four auxiliaries below them.
    const bells: Array<[number, number, number]> = [
      [-212, 58, 90],
      [0, 62, 96],
      [212, 58, 90],
      [-322, -30, 40],
      [322, -30, 40],
      [-108, -46, 36],
      [108, -46, 36],
    ];

    // A raised housing band across the transom ties the three mains together
    // so they read as one drive block rather than three unrelated holes.
    const sternBlock = new THREE.Mesh(
      mergeParts([
        boxAt(660, 224, 40, 0, 56, -22),
        boxAt(720, 26, 26, 0, 172, -20),
        boxAt(30, 200, 30, -336, 56, -18),
        boxAt(30, 200, 30, 336, 56, -18),
      ]),
      M.imperialHullDark,
    );
    sternBlock.name = 'engineBlock';
    engineGroup.add(sternBlock);

    const ringGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
    ringGeo.rotateX(Math.PI / 2);
    bells.forEach(([x, y, radius], i) => {
      // A deep tube through the transom read from inside: the far wall is in
      // shadow, so the mouth is a genuine hole with light sitting in it.
      const housing = new THREE.Mesh(ringGeo.clone(), M.bellInterior);
      housing.scale.set(radius * 1.06, radius * 1.06, 140);
      housing.position.set(x, y, -56);
      engineGroup.add(housing);

      // Rim ring, so the mouth has a lip catching the key light.
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.06, radius * 0.075, 6, 22),
        M.imperialTrim,
      );
      rim.position.set(x, y, 12);
      engineGroup.add(rim);

      const disc = glowDisc(0x3f9ae8, radius * 1.85, 1);
      disc.position.set(x, y, 7);
      engineGroup.add(disc);
      this.glows.push(disc);

      const plume = enginePlume(radius * 0.9, radius * 5.5, 0xcfe9ff, 0x2f7ac8);
      plume.mesh.position.set(x, y, 16);
      engineGroup.add(plume.mesh);
      this.plumes.push(plume);

      if (i < 3) {
        const light = new THREE.PointLight(0x8fc9ff, 0, 1800, 2);
        light.position.set(x, y, 180);
        engineGroup.add(light);
        this.engineLights.push(light);
      }
    });
    ringGeo.dispose();

    // ------------------------------------------------------------- hangar
    // The hangar mouth reads from below as a lit rectangle inside a raised
    // frame; it is the one warm accent on an otherwise grey underside.
    const hangarT = 0.86;
    const hangarZ = zAt(hangarT);
    const hangarY = botY(hangarT);
    const hangarFrame = new THREE.Mesh(
      mergeParts([
        boxAt(250, 14, 34, 0, hangarY - 3, hangarZ - 92),
        boxAt(250, 14, 34, 0, hangarY - 3, hangarZ + 92),
        boxAt(34, 14, 216, -124, hangarY - 3, hangarZ),
        boxAt(34, 14, 216, 124, hangarY - 3, hangarZ),
      ]),
      M.imperialTrim,
    );
    this.root.add(hangarFrame);
    // A real well with walls: the glow sits at its ceiling, 34 units up, so the
    // bay reads as a lit recess rather than an orange card stuck to the belly.
    const wellDepth = 42;
    const wellW = 214;
    const wellD = 182;
    const wellParts = [
      boxAt(wellW, 5, wellD, 0, hangarY + wellDepth, hangarZ),
      boxAt(wellW, wellDepth, 6, 0, hangarY + wellDepth / 2, hangarZ - wellD / 2),
      boxAt(wellW, wellDepth, 6, 0, hangarY + wellDepth / 2, hangarZ + wellD / 2),
      boxAt(6, wellDepth, wellD, -wellW / 2, hangarY + wellDepth / 2, hangarZ),
      boxAt(6, wellDepth, wellD, wellW / 2, hangarY + wellDepth / 2, hangarZ),
    ];
    const hangarWell = new THREE.Mesh(mergeParts(wellParts), M.imperialDeep);
    hangarWell.name = 'hangarWell';
    this.root.add(hangarWell);
    const hangarGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(196, 164),
      new THREE.MeshBasicMaterial({
        map: radialTexture('hangar-bay', 'rgba(255,214,164,1)', 'rgba(120,58,20,0)', 1.15),
        color: 0x8f5a24,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    hangarGlow.rotation.x = Math.PI / 2;
    hangarGlow.position.set(0, hangarY + wellDepth - 4, hangarZ);
    hangarGlow.name = 'hangarGlow';
    this.root.add(hangarGlow);
    // Landing-guide strips along the lip of the opening.
    const lipLights = new THREE.Mesh(
      mergeParts([
        boxAt(180, 1.5, 4, 0, hangarY + 1, hangarZ - 84),
        boxAt(180, 1.5, 4, 0, hangarY + 1, hangarZ + 84),
      ]),
      M.emissiveAmber,
    );
    this.root.add(lipLights);
    this.hangarLight = new THREE.PointLight(0xffa64a, 0, 320, 2);
    this.hangarLight.position.set(0, hangarY + 6, hangarZ);
    this.root.add(this.hangarLight);
    this.anchors.hangar = anchor(this.root, 'hangar', 0, hangarY - 6, hangarZ);

    // ------------------------------------------------------------ windows
    // Two lit deck lines along each flank. Ordered rows, not scatter: random
    // ports read as confetti at any distance where the whole ship is in frame,
    // and the colour stays under the bloom threshold so they light the deck
    // rather than speckling the hull with stars.
    this.windowMat = new THREE.MeshBasicMaterial({ color: 0x86adcc, toneMapped: false });
    const winPos: THREE.Vector3[] = [];
    for (const deck of [0.42, 0.66]) {
      for (let i = 0; i < 22; i++) {
        const t = 0.4 + (i / 21) * 0.5;
        if (r.bool(0.18)) continue; // a few dark cabins
        const top = topY(t);
        const depth = top - botY(t);
        const drop = depth * deck;
        const v = drop / depth;
        // The side wall leans inboard as it drops, so x has to follow the loft;
        // a fixed fraction of the beam buries every port inside the hull.
        const x = halfWidth(t) * (1 - 0.28 * v) + 1.2;
        for (const side of [-1, 1]) {
          winPos.push(new THREE.Vector3(side * x, top - drop, zAt(t)));
        }
      }
    }
    const winL = windowStrip(
      winPos.filter((p) => p.x < 0),
      new THREE.Vector2(9, 1.1),
      this.windowMat,
      new THREE.Vector3(-1, 0, 0),
    );
    const winR = windowStrip(
      winPos.filter((p) => p.x > 0),
      new THREE.Vector2(9, 1.1),
      this.windowMat,
      new THREE.Vector3(1, 0, 0),
    );
    this.root.add(winL, winR);

    // ----------------------------------------------------------- greebles
    // Surface texture does the fine work; these are the deliberate structures
    // laid out on the hull's own axes so the wedge reads as engineered.
    const density = quality.greebleScale;
    const UP = new THREE.Vector3(0, 1, 0);
    const DOWN = new THREE.Vector3(0, -1, 0);

    const dorsalBlocks = blockField(r.fork('dorsal'), {
      rows: Math.max(10, Math.round(30 * density)),
      cols: Math.max(6, Math.round(16 * density)),
      map: (u, v) => {
        const t = 0.1 + (v * 0.5 + 0.5) * 0.82;
        const w = halfWidth(t);
        const a = u * 0.9;
        const x = a * w;
        // Keep the superstructure footprint, the central spine, the trenches
        // and the outer hull edge clear so the silhouette stays crisp.
        if (t > 0.66 && Math.abs(x) < 230 && t < 0.96) return null;
        if (Math.abs(a) < 0.2 || Math.abs(x) > w - 14) return null;
        if (dorsalGroove(a) < -1.2) return null;
        return { position: new THREE.Vector3(x, topY(t) + dorsalGroove(a), zAt(t)), normal: UP };
      },
      cell: (_u, v) => {
        const t = 0.1 + (v * 0.5 + 0.5) * 0.82;
        return [halfWidth(t) * 0.11, LENGTH * 0.026];
      },
      heightRange: [1.2, 4.0],
      sparsity: 0.34,
    });
    this.root.add(greebleInstances(dorsalBlocks, M.imperialGreeble, 'destroyerGreeble'));

    // The belly is seen from very close during the reveal, so it gets its own
    // structure: shallow pans between long service lanes, never loose crates.
    const ventralBlocks = blockField(r.fork('ventral'), {
      rows: Math.max(10, Math.round(26 * density)),
      cols: Math.max(6, Math.round(12 * density)),
      map: (u, v) => {
        const t = 0.16 + (v * 0.5 + 0.5) * 0.74;
        const w = halfWidth(t) * 0.72;
        const a = u * 0.88;
        const x = a * w;
        if (t > 0.78 && Math.abs(x) < 150) return null;
        if (Math.abs(x) > w - 12) return null;
        if (ventralGroove(a) > 1.2) return null;
        return { position: new THREE.Vector3(x, botY(t) + ventralGroove(a), zAt(t)), normal: DOWN };
      },
      cell: (_u, v) => {
        const t = 0.16 + (v * 0.5 + 0.5) * 0.74;
        return [halfWidth(t) * 0.1, LENGTH * 0.024];
      },
      heightRange: [0.7, 2.0],
      sparsity: 0.4,
    });
    this.root.add(greebleInstances(ventralBlocks, M.imperialGreeble, 'destroyerVentralGreeble'));

    // ------------------------------------------------------------ turrets
    const turretSpots: Array<[number, number]> = [
      [0.42, 0.66],
      [0.52, 0.74],
      [0.62, 0.58],
      [0.36, 0.5],
      [0.7, 0.8],
    ];
    for (const [t, lateral] of turretSpots) {
      for (const side of [-1, 1]) {
        const w = halfWidth(t);
        const turret = this.buildTurret(M, side);
        turret.root.position.set(side * w * lateral, topY(t) + 1.5, zAt(t));
        this.root.add(turret.root);
        this.turrets.push(turret);
      }
    }

    // Ventral batteries — these are the ones that can actually bear on a ship
    // running below the wedge, so the chase fires from here.
    const ventralSpots: Array<[number, number]> = [
      [0.34, 0.42],
      [0.5, 0.55],
      [0.66, 0.4],
    ];
    for (const [t, lateral] of ventralSpots) {
      for (const side of [-1, 1]) {
        const w = halfWidth(t) * 0.72;
        const turret = this.buildTurret(M, side);
        turret.root.position.set(side * w * lateral, botY(t) - 1.5, zAt(t));
        turret.root.rotation.z = Math.PI; // hang the mount upside down
        this.root.add(turret.root);
        this.turrets.push(turret);
        this.ventralTurrets.push(turret);
      }
    }

    // ------------------------------------------------------ running lights
    // Four beacons a side, right on the chine. Sixteen a side turned the wedge
    // into a runway and swamped the silhouette the reveal depends on.
    const navPositions: THREE.Vector3[] = [];
    const navColors: THREE.Color[] = [];
    for (let i = 0; i < 4; i++) {
      const t = 0.3 + (i / 3) * 0.62;
      const w = halfWidth(t);
      navPositions.push(new THREE.Vector3(-w - 2, topY(t) - 3, zAt(t)));
      navColors.push(new THREE.Color(0xff4a3a));
      navPositions.push(new THREE.Vector3(w + 2, topY(t) - 3, zAt(t)));
      navColors.push(new THREE.Color(0x54ff86));
    }
    this.navLights = new RunningLights(navPositions, navColors, 7);
    this.root.add(this.navLights.points);

    // -------------------------------------------------------- tractor beam
    // A single open cone shaded as if it were a volume: the shell is brightest
    // where the camera looks along it, so the edges glow and the middle stays
    // transparent. Ring banding across the surface reads as a stack of
    // crescents instead of a beam, so the striations run lengthwise only.
    this.tractorMat = new THREE.ShaderMaterial({
      uniforms: {
        intensity: { value: 0 },
        time: { value: 0 },
        color: { value: new THREE.Color(0x9fd0ff) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vViewW;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vViewW = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float intensity; uniform float time; uniform vec3 color;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vViewW;
        void main() {
          // A solid cone is thickest through its axis, so the shell has to be
          // brightest where it faces the camera and fade out at the silhouette.
          // Shading it the other way round — bright at the edges — turns the
          // beam into a flat ribbon with two hard sides.
          float facing = abs(dot(normalize(vNormalW), normalize(vViewW)));
          float depth = pow(facing, 0.7);

          // Striations run with the beam: they vary around the circumference
          // and drift lengthwise. Banding across it reads as stacked rings.
          float flow = sin(vUv.x * 6.2831 * 26.0 + vUv.y * 5.0 - time * 1.8);
          float streak = 0.86 + 0.14 * flow;

          // Hot at the emitter, thinning as it reaches for the prize.
          float head = smoothstep(0.0, 0.1, vUv.y) * (1.0 + 0.5 * (1.0 - smoothstep(0.0, 0.3, vUv.y)));
          float tail = 1.0 - smoothstep(0.72, 1.0, vUv.y);

          float a = depth * streak * head * tail * intensity * 0.32;
          gl_FragColor = vec4(color * a * 1.6, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const coneGeo = new THREE.CylinderGeometry(24, 54, 1, 32, 1, true);
    coneGeo.translate(0, -0.5, 0);
    this.tractorCone = new THREE.Mesh(coneGeo, this.tractorMat);
    this.tractorCone.position.set(0, botY(0.8) - 2, zAt(0.8));
    this.tractorCone.visible = false;
    this.tractorCone.frustumCulled = false;
    this.root.add(this.tractorCone);
    this.anchors.tractorEmitter = anchor(this.root, 'tractorEmitter', 0, botY(0.8) - 2, zAt(0.8));

    // ------------------------------------------------------------ anchors
    this.anchors.nose = anchor(this.root, 'nose', 0, 0, -HALF_LEN - 8);
    this.anchors.stern = anchor(this.root, 'stern', 0, 20, HALF_LEN + 40);
    this.anchors.dorsalMid = anchor(this.root, 'dorsalMid', 0, topY(0.5) + 30, zAt(0.5));
    this.anchors.underNose = anchor(this.root, 'underNose', 0, botY(0.18) - 40, zAt(0.18));
    this.anchors.portFlank = anchor(this.root, 'portFlank', -halfWidth(0.6) - 60, 0, zAt(0.6));
    this.anchors.starboardFlank = anchor(
      this.root,
      'starboardFlank',
      halfWidth(0.6) + 60,
      0,
      zAt(0.6),
    );
  }

  /**
   * A heavy turbolaser emplacement: sunken ring, rotating tub, twin barrels.
   *
   * Kept deliberately matte and dark. These sit on the belly during the reveal
   * with a lit planet filling the sky behind the camera, and anything glossy
   * here turns the underside into a field of white studs.
   */
  private buildTurret(M: ReturnType<typeof getMaterials>, side: number): Turret {
    const root = new THREE.Group();
    root.name = 'turret';
    // Recessed collar the tub sits in, so the mount grows out of the plating.
    const base = new THREE.Mesh(new THREE.CylinderGeometry(15, 17, 3.4, 14), M.imperialGreeble);
    base.position.y = -0.6;
    root.add(base);

    const yoke = new THREE.Group();
    yoke.position.y = 1.4;
    root.add(yoke);

    const tub = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 12, 8, 12), M.imperialTurret);
    tub.position.y = 4;
    yoke.add(tub);

    // Trunnion cheeks either side of the barrels give the tub a real axis.
    for (const dx of [-9, 9]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(4, 9, 12), M.imperialTurret);
      cheek.position.set(dx, 8, 0);
      yoke.add(cheek);
    }

    const barrels = new THREE.Group();
    barrels.position.set(0, 8, 0);
    yoke.add(barrels);

    const mantlet = new THREE.Mesh(new THREE.BoxGeometry(15, 8, 14), M.imperialTurret);
    mantlet.position.z = -1;
    barrels.add(mantlet);

    const muzzles: THREE.Object3D[] = [];
    const barrelGeo = new THREE.CylinderGeometry(1.5, 2.1, 34, 8);
    barrelGeo.rotateX(-Math.PI / 2);
    barrelGeo.translate(0, 0, -17);
    for (const dx of [-4.6, 4.6]) {
      const b = new THREE.Mesh(barrelGeo.clone(), M.imperialTurret);
      b.position.set(dx, 0, -6);
      barrels.add(b);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(dx, 0, -40);
      barrels.add(muzzle);
      muzzles.push(muzzle);
    }
    barrelGeo.dispose();

    return { root, yoke, barrels, muzzles, side };
  }

  /** Smoothly slew every turret toward a world-space target. */
  aimTurretsAt(worldTarget: THREE.Vector3, dt: number, snap = false): void {
    const local = new THREE.Vector3();
    for (const turret of this.turrets) {
      local.copy(worldTarget);
      turret.root.worldToLocal(local);
      const yaw = Math.atan2(local.x, -local.z);
      const pitch = clamp(Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.28, 1.15);
      if (snap) {
        turret.yoke.rotation.y = yaw;
        turret.barrels.rotation.x = pitch;
      } else {
        turret.yoke.rotation.y = damp(turret.yoke.rotation.y, yaw, 2.6, dt);
        turret.barrels.rotation.x = damp(turret.barrels.rotation.x, pitch, 2.6, dt);
      }
    }
  }

  update(t: number, dt: number): void {
    const power = clamp(this.enginePower, 0, 1.4);
    this.plumes.forEach((p, i) => {
      // Seven overlapping cones this size stack into a fog bank across the
      // whole transom when the camera comes round the stern, so each one is
      // kept faint and the glow discs carry the drive instead.
      p.material.uniforms.intensity.value = power * 0.16;
      p.material.uniforms.time.value = t + i * 0.21;
      p.mesh.scale.z = 0.5 + power * 0.7;
    });
    this.glows.forEach((g, i) => {
      const base = (g.userData.baseScale ?? (g.userData.baseScale = g.scale.x)) as number;
      g.scale.setScalar(base * (0.9 + power * 0.1));
      setGlowIntensity(g, clamp(power * (0.95 + 0.05 * Math.sin(t * 9 + i)), 0, 1.2));
    });
    this.engineLights.forEach((l) => (l.intensity = power * 260000));
    this.hangarLight.intensity = 26000;
    this.navLights.update(t);
    this.windowMat.color.setRGB(0.72, 0.88, 1);

    this.tractorMat.uniforms.intensity.value = damp(
      this.tractorMat.uniforms.intensity.value as number,
      this.tractorBeam,
      3,
      dt,
    );
    this.tractorMat.uniforms.time.value = t;
    this.tractorCone.visible = (this.tractorMat.uniforms.intensity.value as number) > 0.01;
  }

  /** Stretch the tractor cone so it lands on a world point. */
  aimTractor(worldTarget: THREE.Vector3): void {
    const local = this.root.worldToLocal(worldTarget.clone());
    const origin = this.tractorCone.position;
    const dir = local.clone().sub(origin);
    const len = Math.max(1, dir.length());
    this.tractorCone.scale.set(1, len, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      dir.clone().normalize(),
    );
    this.tractorCone.quaternion.copy(q);
  }
}
