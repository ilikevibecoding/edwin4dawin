/**
 * Imperial destroyer — the "Iron Sabre".
 *
 * Silhouette brief: an enormous grey dagger. Flat sloped flanks rising to a
 * recessed dorsal plate scored with trenches, a blocky command superstructure
 * set well aft carrying a bridge and twin sensor globes, a deep ventral belly
 * with a lit hangar throat, and a stern wall of blue-white engine bells.
 *
 * Local space: bow at −Z, stern at +Z, origin amidships on the hull centreline.
 * Length 1600 m, beam 890 m. Everything about this ship exists to make the
 * 150 m runner look like a moth.
 */

import * as THREE from 'three';
import {
  hullMaterial,
  metalMaterial,
  emissiveMaterial,
  nozzleMaterial,
  additiveMaterial,
  plumeMaterial,
  PALETTE,
} from '../assets/materials';
import { prismGeometry, roundedBox, greebleField, antennaCluster, finRing } from '../assets/geometry';
import { flareSprite } from '../assets/textures';
import { Turret } from './turret';
import type { QualitySettings } from '../core/quality';

export const DESTROYER_LENGTH = 1600;
export const DESTROYER_BEAM = 890;

const HALF_BEAM = DESTROYER_BEAM / 2;
const BOW_Z = -DESTROYER_LENGTH / 2;
const STERN_Z = DESTROYER_LENGTH / 2;

/** Height of the flat dorsal plate above the hull origin. */
export const DECK_Y = 92;

/** Half-width of the *lower* hull at a given station. */
function hullHalfWidth(z: number): number {
  const t = THREE.MathUtils.clamp((z - BOW_Z) / (DESTROYER_LENGTH - 60), 0, 1);
  return HALF_BEAM * t;
}

/**
 * Half-width of the dorsal plate. The plate is the lower outline scaled in and
 * pushed aft, which is what produces the destroyer's forward-raked flanks.
 */
const DECK_X_SCALE = 0.7;
const DECK_Z_SCALE = 0.94;
const DECK_Z_OFFSET = 46;
function deckHalfWidth(z: number): number {
  const zLower = (z - DECK_Z_OFFSET) / DECK_Z_SCALE;
  return hullHalfWidth(zLower) * DECK_X_SCALE;
}
/** True when (x, z) lies on the dorsal plate with a little margin. */
function onDeck(x: number, z: number, margin = 14): boolean {
  const hw = deckHalfWidth(z) - margin;
  return hw > 4 && Math.abs(x) < hw && z > BOW_Z * DECK_Z_SCALE + DECK_Z_OFFSET + 20 && z < STERN_Z - 20;
}

export interface DestroyerAnchors {
  bridge: THREE.Object3D;
  /** Mouth of the ventral hangar — where boarding craft and the pod pass. */
  hangar: THREE.Object3D;
  /** Emitter used for the tractor beam that reels the runner in. */
  tractorEmitter: THREE.Object3D;
  /** Where the captured runner is held alongside. */
  captiveBerth: THREE.Object3D;
  bow: THREE.Object3D;
  stern: THREE.Object3D;
}

export class ImperialDestroyer {
  readonly group = new THREE.Group();
  readonly anchors: DestroyerAnchors;
  readonly turrets: Turret[] = [];

  private engineMat: THREE.MeshStandardMaterial;
  private engineFlares: THREE.Mesh[] = [];
  private plumeMats: THREE.ShaderMaterial[] = [];
  private engineLights: THREE.PointLight[] = [];
  private windowMat: THREE.MeshStandardMaterial;
  private hangarLight: THREE.PointLight;
  private tractorBeam: THREE.Mesh;
  private tractorMat: THREE.MeshBasicMaterial;
  private tractorStrength = 0;
  private throttle = 1;

  constructor(quality: QualitySettings, seed = 'destroyer') {
    this.group.name = 'ImperialDestroyer';

    // Armour plate is painted, not bare metal. High metalness looked correct in
    // isolation but turned the whole ship into a mirror for an almost-black
    // sky, which is why the underside kept reading as a hole rather than grey.
    const hull = hullMaterial('isd', {
      color: PALETTE.imperialHull,
      grimeTint: 'cool',
      grime: 0.2,
      cell: 64,
      roughness: 0.6,
      metalness: 0.16,
      seed: `${seed}-hull`,
      repeat: 9,
      normalScale: 0.28,
    });
    const hullDark = hullMaterial('isdDark', {
      color: '#7b828a',
      grimeTint: 'cool',
      grime: 0.22,
      cell: 40,
      roughness: 0.64,
      metalness: 0.14,
      seed: `${seed}-dark`,
      repeat: 12,
      normalScale: 0.22,
    });
    const towerMat = hullMaterial('isdTower', {
      color: '#a3a9b0',
      grimeTint: 'cool',
      grime: 0.15,
      cell: 34,
      windows: 30,
      roughness: 0.58,
      metalness: 0.14,
      seed: `${seed}-tower`,
      repeat: 2,
    });
    const trimMetal = metalMaterial('isdTrim', '#575d64', 0.48, 0.7);
    // Ventral detail sits one step *below* the keel plating. Raised structure
    // brighter than the hull reads as tape stuck on the ship; slightly darker
    // reads as a frame the plating is stretched over.
    const bellyDetail = metalMaterial('isdBelly', '#71767d', 0.68, 0.2);
    const deepShadow = metalMaterial('isdDeep', '#3a3f45', 0.8, 0.2);
    this.windowMat = emissiveMaterial('isdWin', '#b9d6ff', 0.9).clone();
    this.engineMat = nozzleMaterial('isdEngine', '#cfe6ff', 3.4).clone();

    /* ------------------------------------------------------- primary wedge */
    // Lower outline: a long isosceles triangle with a flat, slightly inset
    // stern. Wound so the generated prism normals face outward.
    const outline: Array<[number, number]> = [
      [0, BOW_Z],
      [-HALF_BEAM, STERN_Z - 60],
      [-HALF_BEAM * 0.96, STERN_Z],
      [HALF_BEAM * 0.96, STERN_Z],
      [HALF_BEAM, STERN_Z - 60],
    ];

    const wedge = new THREE.Mesh(
      prismGeometry(outline, DECK_Y, [DECK_X_SCALE, DECK_Z_SCALE], [0, DECK_Z_OFFSET]),
      hull,
    );
    wedge.name = 'DestroyerWedge';
    wedge.position.y = DECK_Y / 2;
    wedge.castShadow = true;
    wedge.receiveShadow = true;
    this.group.add(wedge);

    // Ventral keel: the same plan, full width at the top, tapering downward.
    const keelDepth = 86;
    const keel = new THREE.Mesh(
      prismGeometry(outline, keelDepth, [1, 1], [0, 0], [0.6, 0.9], [0, 66]),
      hullDark,
    );
    keel.name = 'DestroyerKeel';
    keel.position.y = -keelDepth / 2;
    keel.receiveShadow = true;
    this.group.add(keel);

    /* ------------------------------------------------------- dorsal detail */
    // Trenches: recessed strips with raised lips. They read at any distance and
    // give the deck a direction of travel.
    const laneX = [-208, -104, 0, 104, 208];
    for (const x of laneX) {
      const halfWidth = x === 0 ? 24 : 15;
      const zStart = -300 + Math.abs(x) * 1.1;
      const zEnd = 480;
      const len = zEnd - zStart;
      const midZ = (zStart + zEnd) / 2;
      if (Math.abs(x) + halfWidth > deckHalfWidth(zEnd) - 20) continue;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfWidth * 2, len), deepShadow);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(x, DECK_Y - 7, midZ);
      this.group.add(floor);
      for (const s of [-1, 1]) {
        const lip = new THREE.Mesh(new THREE.BoxGeometry(5, 8, len), hullDark);
        lip.position.set(x + s * (halfWidth + 2.5), DECK_Y - 3, midZ);
        this.group.add(lip);
      }
      // Cross-braces every so often break the trenches into readable bays.
      for (let z = zStart + 60; z < zEnd - 40; z += 118) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 2, 6, 12), hullDark);
        brace.position.set(x, DECK_Y - 5, z);
        this.group.add(brace);
      }
    }

    // Forward sensor spine and bow cheek plates.
    const bowSpine = new THREE.Mesh(roundedBox(30, 16, 330, 4), hullDark);
    bowSpine.position.set(0, DECK_Y + 2, -450);
    this.group.add(bowSpine);
    for (const s of [-1, 1]) {
      const cheek = new THREE.Mesh(roundedBox(52, 12, 250, 4), hullDark);
      cheek.position.set(s * 86, DECK_Y + 1, -300);
      cheek.rotation.y = s * 0.1;
      this.group.add(cheek);
    }
    // Bow tip cap so the leading edge is a bevel rather than a knife.
    const bowCap = new THREE.Mesh(roundedBox(26, 46, 40, 8), hullDark);
    bowCap.position.set(0, 30, BOW_Z + 14);
    this.group.add(bowCap);

    /* ------------------------------------------------------ superstructure */
    const tower = new THREE.Group();
    tower.name = 'Superstructure';
    tower.position.set(0, DECK_Y, 430);
    this.group.add(tower);

    // Stepped trapezoidal base — two blocks, strongly raked at the front.
    const baseA = new THREE.Mesh(
      prismGeometry([[-200, -190], [-200, 200], [200, 200], [200, -190]], 32, [0.9, 0.94], [0, 8]),
      towerMat,
    );
    baseA.position.y = 16;
    tower.add(baseA);
    const baseB = new THREE.Mesh(
      prismGeometry([[-170, -140], [-170, 160], [170, 160], [170, -140]], 34, [0.85, 0.9], [0, 8]),
      towerMat,
    );
    baseB.position.y = 49;
    tower.add(baseB);

    // Command tower neck.
    const neck = new THREE.Mesh(
      prismGeometry([[-92, -60], [-92, 66], [92, 66], [92, -60]], 52, [0.92, 0.94], [0, 2]),
      towerMat,
    );
    neck.position.set(0, 92, 4);
    tower.add(neck);

    // Bridge: a wide flat slab overhanging the neck, window band facing forward.
    const bridge = new THREE.Mesh(roundedBox(190, 30, 78, 4), towerMat);
    bridge.position.set(0, 131, -6);
    tower.add(bridge);
    const bridgeWindows = new THREE.Mesh(new THREE.BoxGeometry(168, 8, 3), this.windowMat);
    bridgeWindows.position.set(0, 132, -45.5);
    tower.add(bridgeWindows);
    const brow = new THREE.Mesh(roundedBox(186, 6, 12, 2), trimMetal);
    brow.position.set(0, 140, -43);
    tower.add(brow);
    const chin = new THREE.Mesh(roundedBox(186, 5, 10, 2), trimMetal);
    chin.position.set(0, 123, -43);
    tower.add(chin);

    // Twin sensor globes on short outriggers.
    const globeMat = metalMaterial('isdGlobe', '#a4a9af', 0.55, 0.35);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 34, 8), trimMetal);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(s * 108, 150, 10);
      tower.add(arm);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 14, 10), trimMetal);
      collar.rotation.z = Math.PI / 2;
      collar.position.set(s * 122, 150, 10);
      tower.add(collar);
      const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(28, 2), globeMat);
      globe.position.set(s * 150, 150, 10);
      globe.name = `SensorGlobe${s > 0 ? 'S' : 'P'}`;
      tower.add(globe);
    }

    // Deflector generators on the base flanks.
    for (const s of [-1, 1]) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(22, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2),
        metalMaterial('isdDome', '#878d94', 0.5, 0.5),
      );
      dome.position.set(s * 140, 32, 130);
      tower.add(dome);
    }

    const masts = antennaCluster(`${seed}-ant`, trimMetal, 8, 2.2);
    masts.position.set(0, 150, 74);
    tower.add(masts);

    // Illuminated window bands on the front face of the superstructure — the
    // single strongest cue that this thing is a kilometre and a half long.
    for (let row = 0; row < 4; row++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(300 - row * 40, 3, 2.5), this.windowMat);
      w.position.set(0, 12 + row * 21, -186 + row * 16);
      tower.add(w);
    }
    for (const s of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 240));
        w.material = this.windowMat;
        w.position.set(s * (188 - row * 16), 12 + row * 21, 20);
        tower.add(w);
      }
    }

    /* ------------------------------------------------------------- ventral */
    // Hangar throat: a recessed bay with a lit ceiling and a landing deck, set
    // behind a heavy frame. A single emissive block reads as a lens flare stuck
    // to the hull; a real cavity reads as a door into a ship.
    const hangarZ = 250;
    const hangarY = -keelDepth + 4;
    const bayW = 190;
    const bayD = 168;
    const bayH = 74;
    const bay = new THREE.Group();
    bay.position.set(0, hangarY, hangarZ);
    this.group.add(bay);

    const bayShell = new THREE.Mesh(new THREE.BoxGeometry(bayW, bayH, bayD), deepShadow);
    bayShell.material = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.85, metalness: 0.12, side: THREE.BackSide });
    bayShell.position.y = bayH / 2;
    bay.add(bayShell);
    // Deck plating, lit from strips rather than glowing on its own. An emissive
    // deck fills the whole mouth and reads from outside as an orange lens flare
    // taped to the keel instead of a cavity with a floor in it.
    const bayDeck = new THREE.Mesh(
      new THREE.PlaneGeometry(bayW - 12, bayD - 12),
      metalMaterial('hangarDeck', '#6a6e74', 0.7, 0.3),
    );
    bayDeck.rotation.x = -Math.PI / 2;
    bayDeck.position.y = bayH - 4;
    bay.add(bayDeck);
    for (const z of [-58, -20, 20, 58]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(bayW - 46, 3, 7),
        emissiveMaterial('hangarStrip', '#ffe2b4', 1.15),
      );
      strip.position.set(0, bayH - 13, z);
      bay.add(strip);
    }
    // Approach lights down both walls of the throat.
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(4, 4, 12),
          emissiveMaterial('hangarLamp', '#ffcf94', 1.0),
        );
        lamp.position.set(s * (bayW / 2 - 6), 22, -bayD / 2 + 24 + i * 30);
        bay.add(lamp);
      }
    }
    // Mouth: a heavy rectangular frame flush with the keel.
    for (const s of [-1, 1]) {
      const lip = new THREE.Mesh(roundedBox(24, 20, bayD + 34, 4), hullDark);
      lip.position.set(s * (bayW / 2 + 10), 0, 0);
      bay.add(lip);
      const end = new THREE.Mesh(roundedBox(bayW + 60, 20, 24, 4), hullDark);
      end.position.set(0, 0, s * (bayD / 2 + 10));
      bay.add(end);
    }
    // Inside the throat, with a radius that stops just short of the mouth so
    // the surrounding keel is not washed amber.
    this.hangarLight = new THREE.PointLight(0xffc98e, 6000, 200, 2);
    this.hangarLight.position.set(0, hangarY + 38, hangarZ);
    this.group.add(this.hangarLight);

    // Longitudinal keel ribs and grooves. Long straight lines give a hull this
    // size a readable direction and a sense of length. Each is trimmed to the
    // station where the keel is actually wide enough to carry it, otherwise it
    // hangs off the edge of the ship in mid-space.
    const keelHalfWidthAt = (z: number) => hullHalfWidth((z - 66) / 0.9) * 0.6;
    const ribSpan = (x: number, margin: number): [number, number] | null => {
      let zStart = STERN_Z;
      for (let z = BOW_Z; z < STERN_Z; z += 10) {
        if (keelHalfWidthAt(z) > Math.abs(x) + margin) {
          zStart = z;
          break;
        }
      }
      const zEnd = STERN_Z - 40;
      return zEnd - zStart > 90 ? [zStart, zEnd] : null;
    };
    for (const [x, w, mat, dy] of [
      [-196, 22, bellyDetail, 4],
      [-100, 22, bellyDetail, 4],
      [100, 22, bellyDetail, 4],
      [196, 22, bellyDetail, 4],
      [-150, 26, deepShadow, 8],
      [-50, 26, deepShadow, 8],
      [50, 26, deepShadow, 8],
      [150, 26, deepShadow, 8],
    ] as Array<[number, number, THREE.Material, number]>) {
      const span = ribSpan(x, w);
      if (!span) continue;
      const len = span[1] - span[0];
      const rib = new THREE.Mesh(roundedBox(w, dy > 5 ? 8 : 13, len, 3), mat);
      rib.position.set(x, -keelDepth + dy, (span[0] + span[1]) / 2);
      this.group.add(rib);
    }
    // Transverse frames every 150 m, trimmed to the keel outline.
    for (let z = -340; z < 620; z += 150) {
      const hw2 = keelHalfWidthAt(z) - 22;
      if (hw2 < 40) continue;
      const frame = new THREE.Mesh(roundedBox(hw2 * 2, 9, 15, 3), bellyDetail);
      frame.position.set(0, -keelDepth + 3, z);
      this.group.add(frame);
    }

    // Main reactor bulb aft of the hangar.
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(70, 20, 14), hullDark);
    bulb.position.set(0, -96, 540);
    bulb.scale.set(1.3, 0.66, 1.1);
    this.group.add(bulb);
    const bulbRing = finRing(20, 58, 84, 5, 14, trimMetal);
    bulbRing.position.set(0, -100, 540);
    this.group.add(bulbRing);

    /* ------------------------------------------------------------- engines */
    const sternFace = STERN_Z + 2;
    // Stern wall so the engine bells sit in a plate rather than floating.
    const sternPlate = new THREE.Mesh(new THREE.BoxGeometry(HALF_BEAM * 1.9, 178, 26), hullDark);
    sternPlate.position.set(0, 4, sternFace - 14);
    this.group.add(sternPlate);

    const engineLayout: Array<[number, number, number]> = [
      [0, 16, 66],
      [-158, 16, 60],
      [158, 16, 60],
      [-268, 6, 34],
      [268, 6, 34],
      [-86, -70, 26],
      [86, -70, 26],
    ];
    const flareTex = flareSprite();
    for (const [x, y, r] of engineLayout) {
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.16, r * 1.06, 30, 20), hullDark);
      housing.rotation.x = Math.PI / 2;
      housing.position.set(x, y, sternFace - 10);
      this.group.add(housing);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.06, r * 0.08, 8, 22), trimMetal);
      ring.position.set(x, y, sternFace + 5);
      this.group.add(ring);
      const core = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 22), this.engineMat);
      core.position.set(x, y, sternFace + 6);
      this.group.add(core);
      const flare = new THREE.Mesh(
        new THREE.PlaneGeometry(r * 2.5, r * 2.5),
        additiveMaterial(`isdFlare${r}`, '#79b4ff', 0.26, flareTex).clone(),
      );
      flare.position.set(x, y, sternFace + 10);
      this.engineFlares.push(flare);
      this.group.add(flare);

      // Tapered plume, apex aft, so the drive reads as thrust rather than a lamp.
      const plumeLen = r * 6;
      const pmat = plumeMaterial('#5aa0ff', 0.42);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, plumeLen, 16, 1, true), pmat);
      plume.rotation.x = Math.PI / 2;
      plume.position.set(x, y, sternFace + plumeLen / 2);
      plume.name = 'plume';
      this.plumeMats.push(pmat);
      this.group.add(plume);
    }
    const lights = quality.level === 'low' ? 1 : 3;
    for (let i = 0; i < lights; i++) {
      const l = new THREE.PointLight(0x9fd0ff, 0, 2400, 2);
      l.position.set(i === 0 ? 0 : i === 1 ? -200 : 200, 14, sternFace + 70);
      this.group.add(l);
      this.engineLights.push(l);
    }

    /* ------------------------------------------------------------ greebles */
    if (quality.greebleScale > 0) {
      const deckGreeble = greebleField(hullDark, {
        count: Math.round(520 * quality.greebleScale),
        area: { x: [-300, 300], z: [-330, 620] },
        y: DECK_Y,
        minSize: 5,
        maxSize: 16,
        maxHeight: 6,
        seed: `${seed}-deck`,
        lanes: laneX,
        laneWeight: 0.5,
        towerChance: 0.05,
        mask: (x, z) => onDeck(x, z, 18) && !(Math.abs(x) < 210 && z > 230 && z < 640),
      });
      this.group.add(deckGreeble);

      const bowGreeble = greebleField(hullDark, {
        count: Math.round(190 * quality.greebleScale),
        area: { x: [-180, 180], z: [-680, -300] },
        y: DECK_Y,
        minSize: 4,
        maxSize: 11,
        maxHeight: 4,
        seed: `${seed}-bow`,
        mask: (x, z) => onDeck(x, z, 14) && Math.abs(x) > 18,
      });
      this.group.add(bowGreeble);

      const bellyGreeble = greebleField(bellyDetail, {
        count: Math.round(420 * quality.greebleScale),
        area: { x: [-250, 250], z: [-420, 640] },
        y: -keelDepth + 2,
        minSize: 8,
        maxSize: 26,
        maxHeight: 11,
        seed: `${seed}-belly`,
        mask: (x, z) => {
          const hw = hullHalfWidth((z - 66) / 0.9) * 0.6 - 24;
          const inHangar = Math.abs(x) < 130 && Math.abs(z - hangarZ) < 110;
          return hw > 6 && Math.abs(x) < hw && !inHangar;
        },
      });
      bellyGreeble.scale.y = -1;
      this.group.add(bellyGreeble);
    }

    /* ------------------------------------------------------- hull lighting */
    // Rows of small running lights along the flanks and keel. On a hull this
    // large they are the single clearest scale cue: the eye counts them.
    {
      const lampGeo = new THREE.SphereGeometry(1.7, 6, 4);
      const lampMat = emissiveMaterial('isdRunning', '#cfe2ff', 1.05);
      const positions: THREE.Vector3[] = [];
      const rows = 48;
      for (let i = 0; i < rows; i++) {
        const z = THREE.MathUtils.lerp(BOW_Z + 90, STERN_Z - 40, i / (rows - 1));
        const hw = hullHalfWidth(z);
        if (hw < 20) continue;
        for (const s of [-1, 1]) {
          // Just inboard of the chine, on the shoulder between deck and flank.
          positions.push(new THREE.Vector3(s * (hw - 14), 6, z));
          if (i % 2 === 0) positions.push(new THREE.Vector3(s * (hw * 0.62 - 9), -keelDepth + 9, z));
          if (i % 3 === 0) positions.push(new THREE.Vector3(s * (hw * 0.7 * DECK_X_SCALE), DECK_Y - 2, z * 0.94 + DECK_Z_OFFSET));
        }
      }
      const lamps = new THREE.InstancedMesh(lampGeo, lampMat, positions.length);
      const m4 = new THREE.Matrix4();
      positions.forEach((p, i) => lamps.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
      lamps.instanceMatrix.needsUpdate = true;
      lamps.frustumCulled = false;
      lamps.name = 'RunningLights';
      this.group.add(lamps);

      // Broad ventral fill. Hung well below the keel so the falloff arrives as
      // a wash across the whole belly; close in, each one burns a bright pool
      // into the plating that reads as a lens artefact.
      for (const z of [-420, -160, 120, 400, 620]) {
        const l = new THREE.PointLight(0xc2d6f2, 42000, 1700, 2);
        l.position.set(0, -keelDepth - 190, z);
        this.group.add(l);
      }
    }

    /* ------------------------------------------------------------- turrets */
    const turretSpots: Array<[number, number, number]> = [
      [-156, DECK_Y, 130],
      [156, DECK_Y, 130],
      [-190, DECK_Y, 300],
      [190, DECK_Y, 300],
      [-62, DECK_Y, -200],
      [62, DECK_Y, -200],
      [0, DECK_Y, 40],
    ];
    for (const [x, y, z] of turretSpots) {
      const t = new Turret({
        scale: 7,
        barrels: 2,
        hullColor: PALETTE.imperialHullDark,
        boltColor: PALETTE.laserRed,
        slew: 0.6,
        name: 'DestroyerTurret',
      });
      t.group.position.set(x, y, z);
      this.group.add(t.group);
      this.turrets.push(t);
    }

    /* --------------------------------------------------------- tractor beam */
    this.tractorMat = additiveMaterial('tractor', '#8fd4ff', 0, flareTex).clone();
    this.tractorMat.opacity = 0;
    this.tractorBeam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), this.tractorMat);
    this.tractorBeam.name = 'TractorBeam';
    this.tractorBeam.visible = false;
    this.group.add(this.tractorBeam);

    /* --------------------------------------------------------------- anchors */
    const mk = (name: string, x: number, y: number, z: number) => {
      const o = new THREE.Object3D();
      o.name = name;
      o.position.set(x, y, z);
      this.group.add(o);
      return o;
    };
    this.anchors = {
      bridge: mk('ISDBridge', 0, DECK_Y + 132, 424),
      hangar: mk('ISDHangar', 0, hangarY - 30, hangarZ),
      tractorEmitter: mk('ISDTractor', 0, -70, -260),
      // Held off the port bow, well below the flank and clear of all geometry.
      captiveBerth: mk('ISDBerth', -430, -230, -330),
      bow: mk('ISDBow', 0, 30, BOW_Z),
      stern: mk('ISDStern', 0, 20, STERN_Z),
    };
  }

  setThrottle(v: number): void {
    this.throttle = THREE.MathUtils.clamp(v, 0, 1);
  }

  /**
   * Point the tractor beam at a world position. The cone is rebuilt each call
   * so it always terminates exactly on the captured ship.
   */
  setTractorBeam(worldTarget: THREE.Vector3 | null, strength: number): void {
    this.tractorStrength = worldTarget ? THREE.MathUtils.clamp(strength, 0, 1) : 0;
    if (!worldTarget || this.tractorStrength <= 0.001) {
      this.tractorBeam.visible = false;
      this.tractorMat.opacity = 0;
      return;
    }
    const localTo = this.group.worldToLocal(worldTarget.clone());
    const localFrom = this.anchors.tractorEmitter.position.clone();
    const dist = localFrom.distanceTo(localTo);
    this.tractorBeam.visible = true;
    this.tractorBeam.position.copy(localFrom).lerp(localTo, 0.5);
    this.tractorBeam.scale.set(34, dist, 34);
    const dir = localTo.clone().sub(localFrom).normalize();
    this.tractorBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  update(dt: number, elapsed: number): void {
    const flicker = 0.94 + Math.sin(elapsed * 5.1) * 0.03 + Math.sin(elapsed * 13.3) * 0.03;
    const level = this.throttle * flicker;
    this.engineMat.emissiveIntensity = 0.4 + level * 3.2;
    for (const f of this.engineFlares) {
      (f.material as THREE.MeshBasicMaterial).opacity = 0.2 * level;
      f.visible = level > 0.01;
    }
    for (const m of this.plumeMats) m.uniforms.uIntensity.value = 0.42 * level;
    for (const l of this.engineLights) l.intensity = 60000 * level;
    this.hangarLight.intensity = 30000 * (0.9 + Math.sin(elapsed * 0.7) * 0.1);
    if (this.tractorBeam.visible) {
      this.tractorMat.opacity = 0.14 * this.tractorStrength * (0.8 + Math.sin(elapsed * 9) * 0.2);
    }
    for (const t of this.turrets) t.update(dt);
  }
}
