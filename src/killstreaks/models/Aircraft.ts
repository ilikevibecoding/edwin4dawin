/**
 * Procedural airframes.
 *
 * All four are built nose-along-+Z so `Object3D.lookAt(position + velocity)`
 * orients them correctly with no adapter quaternion.
 *
 * Proportions are the load-bearing decision. A strike aircraft is 15 m long on a
 * 10.5 m span, and a viewer knows that ratio without being able to name it — get
 * it wrong and the thing reads as a toy no matter how good the surface is. The
 * numbers here are lifted from the class of aircraft they represent, and the
 * silhouette is built up in the order a viewer resolves it at range: fuselage
 * taper first, then wing planform, then the tail group, then everything else.
 *
 * Geometry is merged per material so a jet is four draw calls rather than
 * twenty, and the merged parts are shared between instances.
 */
import * as THREE from 'three';
import type { AirframeMaterials } from './Materials';
import { airfoilWing, loftSections, mergeAll, tube, type LoftStation } from './Loft';

export interface AircraftModel {
  root: THREE.Group;
  /** Wingtip nodes, for contrails and navigation lights. */
  wingtips: readonly THREE.Object3D[];
  /** Hardpoints carrying ordnance, in release order. */
  hardpoints: readonly THREE.Object3D[];
  /** Afterburner cones, scaled with throttle. */
  burners: readonly THREE.Mesh[];
  /** Anti-collision strobe, blinked by the caller. */
  strobe: THREE.Mesh | null;
  /** Spinning parts: propellers and rotors. */
  spinners: readonly THREE.Object3D[];
  dispose(): void;
}

const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------
// Strike jet — 15.2 m long, 10.4 m span, single fin, twin nozzles
// ---------------------------------------------------------------------------

export function buildStrikeJet(m: AirframeMaterials): AircraftModel {
  const root = new THREE.Group();
  root.name = 'ks:strikeJet';

  // Fuselage. The exponent walks from a circular radome to the flat-bottomed
  // rounded square of the engine bay and back to a round tail, and offsetY drops
  // the nose below the spine — the single detail that separates a fighter
  // fuselage from a length of pipe.
  const stations: LoftStation[] = [
    { z: 7.6, halfWidth: 0.02, halfHeight: 0.02, offsetY: -0.14, exponent: 2 },
    { z: 7.1, halfWidth: 0.2, halfHeight: 0.18, offsetY: -0.13, exponent: 2 },
    { z: 6.2, halfWidth: 0.42, halfHeight: 0.38, offsetY: -0.1, exponent: 2.1 },
    { z: 5.0, halfWidth: 0.6, halfHeight: 0.54, offsetY: -0.04, exponent: 2.3 },
    { z: 3.4, halfWidth: 0.76, halfHeight: 0.66, offsetY: 0.02, exponent: 2.7, bellyFlatten: 0.1 },
    { z: 1.6, halfWidth: 0.94, halfHeight: 0.76, offsetY: 0.0, exponent: 3.2, bellyFlatten: 0.18 },
    { z: -0.6, halfWidth: 0.98, halfHeight: 0.8, offsetY: -0.02, exponent: 3.4, bellyFlatten: 0.2 },
    { z: -2.8, halfWidth: 0.94, halfHeight: 0.79, offsetY: -0.02, exponent: 3.2, bellyFlatten: 0.16 },
    { z: -4.8, halfWidth: 0.86, halfHeight: 0.75, offsetY: 0.0, exponent: 2.9 },
    { z: -6.4, halfWidth: 0.8, halfHeight: 0.72, offsetY: 0.02, exponent: 2.6 },
    { z: -7.4, halfWidth: 0.74, halfHeight: 0.68, offsetY: 0.02, exponent: 2.4 },
  ];
  const skinParts: THREE.BufferGeometry[] = [loftSections(stations, 16, true)];

  // Leading-edge root extensions: the strakes that run from the intakes to the
  // radome. They widen the forward silhouette, which is most of what tells a
  // viewer they are looking at a combat aircraft rather than a business jet.
  for (const side of [1, -1]) {
    const lerx = airfoilWing({
      rootChord: 4.1,
      tipChord: 1.0,
      span: 0.62,
      sweep: 72 * DEG,
      thickness: 0.1,
      rootLeadingEdgeZ: 5.6,
      rootOffset: 0.6,
      mirror: side < 0,
      chordPoints: 10,
      spanPoints: 2,
      taperTip: false,
    });
    lerx.translate(0, 0.06, 0);
    skinParts.push(lerx);
  }

  // Main wing: 40 degree leading-edge sweep, 3.6:1 taper, 6% thick, 3 degrees of
  // dihedral. Span works out at 2 x 4.25 + 1.9 of fuselage = 10.4 m.
  for (const side of [1, -1]) {
    skinParts.push(
      airfoilWing({
        rootChord: 5.3,
        tipChord: 1.48,
        span: 4.25,
        sweep: 40 * DEG,
        thickness: 0.06,
        dihedral: 3 * DEG,
        twist: -1.6 * DEG,
        rootLeadingEdgeZ: 1.35,
        rootOffset: 0.92,
        mirror: side < 0,
        chordPoints: 18,
        spanPoints: 5,
      }),
    );
  }

  // All-moving tailplanes, with a touch of anhedral so they separate from the
  // wing when the aircraft is seen head-on.
  for (const side of [1, -1]) {
    skinParts.push(
      airfoilWing({
        rootChord: 2.35,
        tipChord: 0.88,
        span: 1.95,
        sweep: 38 * DEG,
        thickness: 0.07,
        dihedral: -6 * DEG,
        rootLeadingEdgeZ: -4.65,
        rootOffset: 0.82,
        mirror: side < 0,
        chordPoints: 12,
        spanPoints: 3,
      }),
    );
  }

  // Vertical stabiliser, built as a wing and stood on its edge.
  const fin = airfoilWing({
    rootChord: 3.5,
    tipChord: 1.3,
    span: 2.62,
    sweep: 46 * DEG,
    thickness: 0.055,
    rootLeadingEdgeZ: -3.1,
    rootOffset: 0.0,
    chordPoints: 14,
    spanPoints: 4,
  });
  fin.rotateZ(-90 * DEG);
  fin.translate(0, 0.62, 0);
  skinParts.push(fin);

  // Ventral strakes under the tail.
  for (const side of [1, -1]) {
    const strake = airfoilWing({
      rootChord: 1.5,
      tipChord: 0.5,
      span: 0.68,
      sweep: 52 * DEG,
      thickness: 0.09,
      rootLeadingEdgeZ: -5.0,
      rootOffset: 0.45,
      mirror: side < 0,
      chordPoints: 8,
      spanPoints: 2,
      taperTip: false,
    });
    strake.rotateZ(side > 0 ? 118 * DEG : -118 * DEG);
    strake.translate(0, -0.5, 0);
    skinParts.push(strake);
  }

  // Intake trunks. Boxy side inlets with a raked lip, hung off the LERX root.
  for (const side of [1, -1]) {
    const trunk = loftSections(
      [
        { z: 3.5, halfWidth: 0.34, halfHeight: 0.44, exponent: 3.6 },
        { z: 2.2, halfWidth: 0.38, halfHeight: 0.46, exponent: 3.4 },
        { z: 0.4, halfWidth: 0.34, halfHeight: 0.4, exponent: 3 },
        { z: -0.8, halfWidth: 0.26, halfHeight: 0.32, exponent: 2.6 },
      ],
      10,
      true,
    );
    trunk.translate(side * 1.06, -0.16, 0);
    skinParts.push(trunk);
  }

  const skinMesh = new THREE.Mesh(mergeAll(skinParts), m.skin);
  skinMesh.name = 'ks:jetSkin';
  root.add(skinMesh);

  // Darker panel group: radome, nozzle housings, pylons.
  const panelParts: THREE.BufferGeometry[] = [];
  const radome = loftSections(
    [
      { z: 7.62, halfWidth: 0.02, halfHeight: 0.02, offsetY: -0.14 },
      { z: 7.0, halfWidth: 0.22, halfHeight: 0.2, offsetY: -0.13 },
      { z: 6.24, halfWidth: 0.43, halfHeight: 0.39, offsetY: -0.1 },
    ],
    14,
    false,
  );
  panelParts.push(radome);

  for (const side of [1, -1]) {
    const housing = tube(0.44, 1.5, 12, 0.92);
    housing.translate(side * 0.48, -0.02, -7.0);
    panelParts.push(housing);
  }

  const pylonX = [0, 1.78, 2.86, 3.62];
  const hardpointPositions: THREE.Vector3[] = [];
  for (const x of pylonX) {
    for (const side of x === 0 ? [1] : [1, -1]) {
      const px = side * x;
      // Wing pylons hang from the local wing underside; the centreline pylon
      // hangs from the belly, which is lower.
      const y = x === 0 ? -0.78 : -0.24 + Math.tan(3 * DEG) * x;
      const z = x === 0 ? -0.4 : 1.35 - Math.tan(40 * DEG) * x - 1.5;
      const pylon = loftSections(
        [
          { z: z + 0.95, halfWidth: 0.07, halfHeight: 0.24, exponent: 3 },
          { z: z + 0.2, halfWidth: 0.1, halfHeight: 0.3, exponent: 3.2 },
          { z: z - 0.85, halfWidth: 0.08, halfHeight: 0.26, exponent: 3 },
        ],
        8,
        true,
      );
      pylon.translate(px, y - 0.24, 0);
      panelParts.push(pylon);
      if (x === 0 || x === 1.78) hardpointPositions.push(new THREE.Vector3(px, y - 0.52, z));
    }
  }

  const panelMesh = new THREE.Mesh(mergeAll(panelParts), m.panel);
  panelMesh.name = 'ks:jetPanel';
  root.add(panelMesh);

  // Intake mouths and nozzle interiors: the dark holes that make the airframe
  // read as machinery rather than as a solid casting.
  const cavityParts: THREE.BufferGeometry[] = [];
  for (const side of [1, -1]) {
    const mouth = new THREE.PlaneGeometry(0.6, 0.8);
    mouth.rotateY(side > 0 ? 0.1 : -0.1);
    mouth.rotateX(-0.16);
    mouth.translate(side * 1.06, -0.16, 3.52);
    cavityParts.push(mouth);
    const nozzle = tube(0.34, 0.9, 12, 1.1);
    nozzle.translate(side * 0.48, -0.02, -7.5);
    cavityParts.push(nozzle);
  }
  const cavityMesh = new THREE.Mesh(mergeAll(cavityParts), m.cavity);
  cavityMesh.name = 'ks:jetCavity';
  cavityMesh.renderOrder = 1;
  root.add(cavityMesh);

  // Canopy: a lofted bubble with a spine fairing behind it.
  const canopy = loftSections(
    [
      { z: 5.55, halfWidth: 0.04, halfHeight: 0.03, offsetY: 0.42, exponent: 2 },
      { z: 5.1, halfWidth: 0.28, halfHeight: 0.2, offsetY: 0.46, exponent: 2.2 },
      { z: 4.3, halfWidth: 0.46, halfHeight: 0.38, offsetY: 0.5, exponent: 2.4 },
      { z: 3.3, halfWidth: 0.5, halfHeight: 0.42, offsetY: 0.54, exponent: 2.5 },
      { z: 2.4, halfWidth: 0.44, halfHeight: 0.34, offsetY: 0.56, exponent: 2.6 },
      { z: 1.7, halfWidth: 0.3, halfHeight: 0.2, offsetY: 0.56, exponent: 2.8 },
    ],
    12,
    false,
  );
  const canopyMesh = new THREE.Mesh(canopy, m.glass);
  canopyMesh.name = 'ks:jetCanopy';
  root.add(canopyMesh);

  const spine = loftSections(
    [
      { z: 1.9, halfWidth: 0.3, halfHeight: 0.2, offsetY: 0.54, exponent: 2.8 },
      { z: 0.2, halfWidth: 0.3, halfHeight: 0.2, offsetY: 0.5, exponent: 3 },
      { z: -2.2, halfWidth: 0.24, halfHeight: 0.16, offsetY: 0.46, exponent: 3 },
      { z: -3.4, halfWidth: 0.14, halfHeight: 0.1, offsetY: 0.44, exponent: 3 },
    ],
    10,
    true,
  );
  root.add(new THREE.Mesh(spine, m.skin));

  // Afterburners: additive cones that live inside the nozzles.
  const burners: THREE.Mesh[] = [];
  for (const side of [1, -1]) {
    const flame = new THREE.ConeGeometry(0.3, 2.6, 10, 1, true);
    flame.rotateX(Math.PI / 2);
    flame.translate(0, 0, 1.3);
    const mesh = new THREE.Mesh(flame, m.burner);
    mesh.name = 'ks:burner';
    mesh.position.set(side * 0.48, -0.02, -8.0);
    mesh.renderOrder = 4;
    root.add(mesh);
    burners.push(mesh);
  }

  // Navigation lights: red to port, green to starboard, white strobe on the fin.
  const bulb = new THREE.SphereGeometry(0.14, 8, 6);
  const wingtips: THREE.Object3D[] = [];
  for (const side of [1, -1]) {
    const tipX = side * (0.92 + 4.25);
    const tipY = Math.tan(3 * DEG) * 4.25;
    const tipZ = 1.35 - Math.tan(40 * DEG) * 4.25 - 0.9;
    const anchor = new THREE.Object3D();
    anchor.name = 'ks:wingtip';
    anchor.position.set(tipX, tipY, tipZ - 0.3);
    root.add(anchor);
    wingtips.push(anchor);

    const light = new THREE.Mesh(bulb, side > 0 ? m.navGreen : m.navRed);
    light.name = 'ks:navLight';
    light.position.set(tipX, tipY + 0.02, tipZ);
    light.renderOrder = 4;
    root.add(light);
  }

  const strobe = new THREE.Mesh(bulb, m.navWhite);
  strobe.name = 'ks:strobe';
  strobe.position.set(0, 3.2, -5.1);
  strobe.renderOrder = 4;
  root.add(strobe);

  const hardpoints: THREE.Object3D[] = [];
  // Release order runs outboard-inboard-centre, which is how a rack is actually
  // sequenced: the aircraft stays in trim through the stick.
  for (const p of [hardpointPositions[1], hardpointPositions[2], hardpointPositions[0]]) {
    if (!p) continue;
    const node = new THREE.Object3D();
    node.name = 'ks:hardpoint';
    node.position.copy(p);
    root.add(node);
    hardpoints.push(node);
  }

  applyRenderFlags(root);
  return {
    root,
    wingtips,
    hardpoints,
    burners,
    strobe,
    spinners: [],
    dispose: () => disposeTree(root),
  };
}

// ---------------------------------------------------------------------------
// Reconnaissance drone — 3.4 m long, 5.8 m span, twin boom tail, nose prop
// ---------------------------------------------------------------------------

export function buildReconDrone(m: AirframeMaterials): AircraftModel {
  const root = new THREE.Group();
  root.name = 'ks:reconDrone';

  const skinParts: THREE.BufferGeometry[] = [
    loftSections(
      [
        { z: 1.75, halfWidth: 0.16, halfHeight: 0.15, exponent: 2 },
        { z: 1.45, halfWidth: 0.24, halfHeight: 0.22, exponent: 2 },
        { z: 0.85, halfWidth: 0.3, halfHeight: 0.3, exponent: 2.2 },
        { z: 0.0, halfWidth: 0.3, halfHeight: 0.3, exponent: 2.4 },
        { z: -0.9, halfWidth: 0.24, halfHeight: 0.24, exponent: 2.4 },
        { z: -1.62, halfWidth: 0.1, halfHeight: 0.1, exponent: 2.2 },
      ],
      12,
      true,
    ),
  ];

  // High wing, almost straight, thick section — a loiter platform, not a fighter.
  for (const side of [1, -1]) {
    skinParts.push(
      airfoilWing({
        rootChord: 0.86,
        tipChord: 0.54,
        span: 2.6,
        sweep: 3 * DEG,
        thickness: 0.13,
        dihedral: 2 * DEG,
        rootLeadingEdgeZ: 0.5,
        rootOffset: 0.28,
        mirror: side < 0,
        chordPoints: 10,
        spanPoints: 3,
      }),
    );
    // Tail boom running aft from the wing.
    const boom = tube(0.075, 2.5, 8, 1);
    boom.translate(side * 1.0, 0.16, -1.05);
    skinParts.push(boom);
    // Fin on each boom.
    const boomFin = airfoilWing({
      rootChord: 0.62,
      tipChord: 0.34,
      span: 0.7,
      sweep: 18 * DEG,
      thickness: 0.08,
      rootLeadingEdgeZ: -1.9,
      rootOffset: 0,
      chordPoints: 8,
      spanPoints: 2,
      taperTip: false,
    });
    boomFin.rotateZ(-90 * DEG);
    boomFin.translate(side * 1.0, 0.2, 0);
    skinParts.push(boomFin);
  }

  // Horizontal stabiliser bridging the booms.
  const stab = airfoilWing({
    rootChord: 0.6,
    tipChord: 0.6,
    span: 2.0,
    sweep: 0,
    thickness: 0.09,
    rootLeadingEdgeZ: -2.1,
    rootOffset: -1.0,
    chordPoints: 8,
    spanPoints: 2,
    taperTip: false,
  });
  stab.translate(0, 0.86, 0);
  skinParts.push(stab);

  root.add(new THREE.Mesh(mergeAll(skinParts), m.skin));

  // Sensor turret under the nose: the reason the thing exists.
  const ball = new THREE.SphereGeometry(0.26, 12, 8);
  ball.translate(0, -0.36, 1.0);
  const turret = new THREE.Mesh(ball, m.panel);
  root.add(turret);
  const lens = new THREE.CircleGeometry(0.13, 12);
  lens.rotateX(-0.5);
  lens.translate(0, -0.56, 1.1);
  root.add(new THREE.Mesh(lens, m.cavity));

  // Two-blade nose propeller. Modelled, not a disc: at the drone's orbit radius
  // the blades are individually visible.
  const prop = propeller(m, 2, 0.62, 0.2, 0.1, -18 * DEG);
  prop.name = 'ks:prop';
  prop.position.set(0, 0, 1.8);
  root.add(prop);

  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), m.navWhite);
  strobe.position.set(0, 0.52, -1.4);
  strobe.renderOrder = 4;
  root.add(strobe);

  applyRenderFlags(root);
  return {
    root,
    wingtips: [],
    hardpoints: [],
    burners: [],
    strobe,
    spinners: [prop],
    dispose: () => disposeTree(root),
  };
}

// ---------------------------------------------------------------------------
// Gunship — 14 m fuselage, 4-blade main rotor, side door with a minigun
// ---------------------------------------------------------------------------

export interface GunshipModel extends AircraftModel {
  /** Node the door gun and the gunner camera hang off, on the left side. */
  doorMount: THREE.Object3D;
  /** Muzzle of the minigun. */
  muzzle: THREE.Object3D;
  /** The traversable gun body. */
  gun: THREE.Object3D;
  /** Rotating barrel cluster. */
  barrels: THREE.Object3D;
}

export function buildGunship(m: AirframeMaterials): GunshipModel {
  const root = new THREE.Group();
  root.name = 'ks:gunship';

  const skinParts: THREE.BufferGeometry[] = [
    loftSections(
      [
        { z: 6.3, halfWidth: 0.5, halfHeight: 0.5, offsetY: -0.35, exponent: 2.2 },
        { z: 5.3, halfWidth: 0.95, halfHeight: 0.85, offsetY: -0.15, exponent: 2.4 },
        { z: 3.6, halfWidth: 1.28, halfHeight: 1.18, offsetY: 0, exponent: 2.8, bellyFlatten: 0.15 },
        { z: 1.2, halfWidth: 1.35, halfHeight: 1.3, offsetY: 0.05, exponent: 3.2, bellyFlatten: 0.22 },
        { z: -1.4, halfWidth: 1.3, halfHeight: 1.26, offsetY: 0.05, exponent: 3.2, bellyFlatten: 0.2 },
        { z: -3.0, halfWidth: 1.0, halfHeight: 1.0, offsetY: 0.12, exponent: 2.8 },
        { z: -4.4, halfWidth: 0.5, halfHeight: 0.58, offsetY: 0.3, exponent: 2.4 },
        { z: -5.4, halfWidth: 0.26, halfHeight: 0.3, offsetY: 0.42, exponent: 2.2 },
      ],
      14,
      true,
    ),
  ];

  // Tail boom and fin.
  const boom = loftSections(
    [
      { z: -5.0, halfWidth: 0.26, halfHeight: 0.3, offsetY: 0.42, exponent: 2.2 },
      { z: -7.2, halfWidth: 0.2, halfHeight: 0.24, offsetY: 0.5, exponent: 2.2 },
      { z: -8.6, halfWidth: 0.16, halfHeight: 0.2, offsetY: 0.56, exponent: 2.2 },
    ],
    10,
    true,
  );
  skinParts.push(boom);

  const tailFin = airfoilWing({
    rootChord: 1.6,
    tipChord: 0.7,
    span: 1.5,
    sweep: 30 * DEG,
    thickness: 0.09,
    rootLeadingEdgeZ: -7.4,
    rootOffset: 0,
    chordPoints: 8,
    spanPoints: 2,
  });
  tailFin.rotateZ(-90 * DEG);
  tailFin.translate(0, 0.6, 0);
  skinParts.push(tailFin);

  const stabiliser = airfoilWing({
    rootChord: 0.9,
    tipChord: 0.5,
    span: 1.1,
    sweep: 12 * DEG,
    thickness: 0.1,
    rootLeadingEdgeZ: -7.6,
    rootOffset: 0.14,
    chordPoints: 8,
    spanPoints: 2,
  });
  skinParts.push(stabiliser);
  const stabiliserL = airfoilWing({
    rootChord: 0.9,
    tipChord: 0.5,
    span: 1.1,
    sweep: 12 * DEG,
    thickness: 0.1,
    rootLeadingEdgeZ: -7.6,
    rootOffset: 0.14,
    mirror: true,
    chordPoints: 8,
    spanPoints: 2,
  });
  skinParts.push(stabiliserL);

  // Engine deck above the cabin, and the stub wings that carry the sponsons.
  const deck = loftSections(
    [
      { z: 1.8, halfWidth: 0.72, halfHeight: 0.4, offsetY: 1.35, exponent: 3.2 },
      { z: -0.6, halfWidth: 0.8, halfHeight: 0.46, offsetY: 1.4, exponent: 3.4 },
      { z: -2.6, halfWidth: 0.62, halfHeight: 0.36, offsetY: 1.3, exponent: 3 },
    ],
    10,
    true,
  );
  skinParts.push(deck);

  root.add(new THREE.Mesh(mergeAll(skinParts), m.skin));

  // Cockpit glazing: two side panels and a windscreen.
  const glassParts: THREE.BufferGeometry[] = [];
  const screen = loftSections(
    [
      { z: 6.1, halfWidth: 0.52, halfHeight: 0.42, offsetY: 0.3, exponent: 2.4 },
      { z: 5.2, halfWidth: 0.92, halfHeight: 0.66, offsetY: 0.5, exponent: 2.6 },
      { z: 4.1, halfWidth: 1.1, halfHeight: 0.6, offsetY: 0.66, exponent: 2.8 },
    ],
    12,
    false,
  );
  glassParts.push(screen);
  root.add(new THREE.Mesh(mergeAll(glassParts), m.glass));

  // Skids.
  const panelParts: THREE.BufferGeometry[] = [];
  for (const side of [1, -1]) {
    const skid = tube(0.075, 5.0, 8, 1);
    skid.translate(side * 1.25, -1.65, 0.3);
    panelParts.push(skid);
    for (const z of [2.0, -1.2]) {
      const strut = tube(0.06, 0.95, 6, 1);
      strut.rotateX(Math.PI / 2);
      strut.rotateZ(side * 0.3);
      strut.translate(side * 1.15, -1.2, z);
      panelParts.push(strut);
    }
  }
  // Rotor mast.
  const mast = tube(0.16, 0.8, 8, 1);
  mast.rotateX(Math.PI / 2);
  mast.translate(0, 2.1, -0.2);
  panelParts.push(mast);
  root.add(new THREE.Mesh(mergeAll(panelParts), m.panel));

  // Main rotor: four modelled blades on a hub. The blade as built already has its
  // span radial and its chord tangential for a disc in the XZ plane, so the only
  // placement needed is the clock angle.
  const rotor = new THREE.Group();
  rotor.name = 'ks:mainRotor';
  rotor.userData.spinAxis = 'y';
  const bladeParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const blade = airfoilWing({
      rootChord: 0.52,
      tipChord: 0.42,
      span: 7.2,
      sweep: 1 * DEG,
      thickness: 0.09,
      twist: -4 * DEG,
      rootLeadingEdgeZ: 0.26,
      rootOffset: 0.4,
      chordPoints: 6,
      spanPoints: 3,
      taperTip: false,
    });
    blade.applyMatrix4(new THREE.Matrix4().makeRotationY((i / 4) * Math.PI * 2));
    bladeParts.push(blade);
  }
  rotor.add(new THREE.Mesh(mergeAll(bladeParts), m.panel));
  rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.3, 10), m.metal));
  rotor.position.set(0, 2.5, -0.2);
  root.add(rotor);

  // Tail rotor: the same blade stood on edge so the disc faces sideways.
  const tailRotor = new THREE.Group();
  tailRotor.name = 'ks:tailRotor';
  tailRotor.userData.spinAxis = 'x';
  const tailBladeParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 2; i++) {
    const blade = airfoilWing({
      rootChord: 0.24,
      tipChord: 0.18,
      span: 1.3,
      sweep: 2 * DEG,
      thickness: 0.1,
      rootLeadingEdgeZ: 0.12,
      rootOffset: 0.1,
      chordPoints: 6,
      spanPoints: 2,
      taperTip: false,
    });
    blade.rotateZ(Math.PI / 2);
    blade.applyMatrix4(new THREE.Matrix4().makeRotationX(i * Math.PI));
    tailBladeParts.push(blade);
  }
  tailRotor.add(new THREE.Mesh(mergeAll(tailBladeParts), m.panel));
  tailRotor.position.set(0.28, 1.2, -8.5);
  root.add(tailRotor);

  // Door gun: a six-barrel minigun on a pintle in the left doorway.
  const doorMount = new THREE.Object3D();
  doorMount.name = 'ks:doorMount';
  doorMount.position.set(-1.45, 0.05, 0.6);
  root.add(doorMount);

  const gun = new THREE.Group();
  gun.name = 'ks:doorGun';
  const gunParts: THREE.BufferGeometry[] = [];
  const receiver = loftSections(
    [
      { z: 0.36, halfWidth: 0.13, halfHeight: 0.13, exponent: 3 },
      { z: -0.1, halfWidth: 0.16, halfHeight: 0.16, exponent: 3.2 },
      { z: -0.5, halfWidth: 0.14, halfHeight: 0.14, exponent: 3 },
    ],
    10,
    true,
  );
  gunParts.push(receiver);
  const ammoCan = new THREE.BoxGeometry(0.26, 0.24, 0.36);
  ammoCan.translate(0.0, -0.28, -0.3);
  gunParts.push(ammoCan);
  gun.add(new THREE.Mesh(mergeAll(gunParts), m.metal));

  // The barrel cluster is its own node so it can spin up before the first round
  // leaves — the sound and the sight of a minigun winding up is half of it.
  const barrels = new THREE.Group();
  barrels.name = 'ks:barrels';
  barrels.userData.spinAxis = 'z';
  const barrelParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const barrel = tube(0.022, 0.86, 6, 1);
    barrel.translate(Math.cos(a) * 0.062, Math.sin(a) * 0.062, 0.78);
    barrelParts.push(barrel);
  }
  barrels.add(new THREE.Mesh(mergeAll(barrelParts), m.metal));
  gun.add(barrels);
  doorMount.add(gun);

  const muzzle = new THREE.Object3D();
  muzzle.name = 'ks:muzzle';
  muzzle.position.set(0, 0, 1.24);
  gun.add(muzzle);

  applyRenderFlags(root);
  return {
    root,
    wingtips: [],
    hardpoints: [],
    burners: [],
    strobe: null,
    spinners: [rotor, tailRotor],
    doorMount,
    muzzle,
    gun,
    barrels,
    dispose: () => disposeTree(root),
  };
}

// ---------------------------------------------------------------------------
// Transport — 19 m fuselage, 26 m straight high wing, T-tail, twin turboprops
// ---------------------------------------------------------------------------

export function buildTransport(m: AirframeMaterials): AircraftModel {
  const root = new THREE.Group();
  root.name = 'ks:transport';

  const skinParts: THREE.BufferGeometry[] = [
    loftSections(
      [
        { z: 9.5, halfWidth: 0.4, halfHeight: 0.5, offsetY: -0.2, exponent: 2.2 },
        { z: 8.4, halfWidth: 0.95, halfHeight: 1.05, offsetY: -0.05, exponent: 2.4 },
        { z: 6.6, halfWidth: 1.42, halfHeight: 1.5, offsetY: 0, exponent: 2.8 },
        { z: 2.0, halfWidth: 1.55, halfHeight: 1.62, offsetY: 0, exponent: 3.2, bellyFlatten: 0.12 },
        { z: -3.0, halfWidth: 1.55, halfHeight: 1.62, offsetY: 0, exponent: 3.2, bellyFlatten: 0.12 },
        { z: -6.2, halfWidth: 1.3, halfHeight: 1.45, offsetY: 0.25, exponent: 2.9 },
        { z: -8.4, halfWidth: 0.72, halfHeight: 0.9, offsetY: 0.7, exponent: 2.5 },
        { z: -9.6, halfWidth: 0.3, halfHeight: 0.4, offsetY: 0.95, exponent: 2.3 },
      ],
      14,
      true,
    ),
  ];

  for (const side of [1, -1]) {
    skinParts.push(
      airfoilWing({
        rootChord: 3.4,
        tipChord: 1.6,
        span: 11.6,
        sweep: 4 * DEG,
        thickness: 0.14,
        dihedral: 1.5 * DEG,
        rootLeadingEdgeZ: 2.6,
        rootOffset: 1.3,
        mirror: side < 0,
        chordPoints: 12,
        spanPoints: 4,
      }),
    );
    // Engine nacelle on the wing.
    const nacelle = loftSections(
      [
        { z: 3.6, halfWidth: 0.5, halfHeight: 0.5, exponent: 2.2 },
        { z: 2.6, halfWidth: 0.62, halfHeight: 0.62, exponent: 2.4 },
        { z: 0.2, halfWidth: 0.56, halfHeight: 0.56, exponent: 2.4 },
        { z: -1.4, halfWidth: 0.3, halfHeight: 0.3, exponent: 2.2 },
      ],
      10,
      true,
    );
    nacelle.translate(side * 4.4, 0.1, 0);
    skinParts.push(nacelle);
  }

  // T-tail.
  const fin = airfoilWing({
    rootChord: 3.6,
    tipChord: 1.7,
    span: 4.4,
    sweep: 32 * DEG,
    thickness: 0.09,
    rootLeadingEdgeZ: -5.6,
    rootOffset: 0,
    chordPoints: 10,
    spanPoints: 3,
  });
  fin.rotateZ(-90 * DEG);
  fin.translate(0, 1.2, 0);
  skinParts.push(fin);
  for (const side of [1, -1]) {
    const tailplane = airfoilWing({
      rootChord: 2.2,
      tipChord: 1.1,
      span: 4.0,
      sweep: 12 * DEG,
      thickness: 0.1,
      rootLeadingEdgeZ: -7.4,
      rootOffset: 0.2,
      mirror: side < 0,
      chordPoints: 10,
      spanPoints: 3,
    });
    tailplane.translate(0, 5.5, 0);
    skinParts.push(tailplane);
  }

  root.add(new THREE.Mesh(mergeAll(skinParts), m.skin));

  const glass = loftSections(
    [
      { z: 9.2, halfWidth: 0.45, halfHeight: 0.4, offsetY: 0.5, exponent: 2.4 },
      { z: 8.2, halfWidth: 0.9, halfHeight: 0.62, offsetY: 0.7, exponent: 2.6 },
      { z: 7.0, halfWidth: 1.15, halfHeight: 0.5, offsetY: 0.9, exponent: 2.8 },
    ],
    12,
    false,
  );
  root.add(new THREE.Mesh(glass, m.glass));

  const spinners: THREE.Object3D[] = [];
  for (const side of [1, -1]) {
    const prop = propeller(m, 4, 1.75, 0.3, 0.16, -22 * DEG);
    prop.name = 'ks:prop';
    prop.position.set(side * 4.4, 0.1, 3.8);
    root.add(prop);
    spinners.push(prop);
  }

  // Cargo ramp hardpoint the crate leaves from.
  const hardpoint = new THREE.Object3D();
  hardpoint.name = 'ks:cargoDoor';
  hardpoint.position.set(0, -1.2, -6.0);
  root.add(hardpoint);

  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), m.navWhite);
  strobe.position.set(0, 5.9, -7.6);
  strobe.renderOrder = 4;
  root.add(strobe);

  applyRenderFlags(root);
  return {
    root,
    wingtips: [],
    hardpoints: [hardpoint],
    burners: [],
    strobe,
    spinners,
    dispose: () => disposeTree(root),
  };
}

// ---------------------------------------------------------------------------

/**
 * A propeller disc in the XY plane, spinning about +Z.
 *
 * A blade is a wing whose span is radial and whose chord is tangential, so the
 * wing section comes out of the builder rotated a quarter turn about its own span
 * before it is placed at its clock angle. Getting that wrong produces blades that
 * lie along the shaft, which is invisible from the front and wrong from the side.
 */
function propeller(
  m: AirframeMaterials,
  blades: number,
  radius: number,
  rootChord: number,
  tipChord: number,
  twist: number,
): THREE.Group {
  const group = new THREE.Group();
  group.userData.spinAxis = 'z';
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < blades; i++) {
    const blade = airfoilWing({
      rootChord,
      tipChord,
      span: radius,
      sweep: 5 * DEG,
      thickness: 0.1,
      twist,
      rootLeadingEdgeZ: rootChord * 0.5,
      rootOffset: radius * 0.09,
      chordPoints: 6,
      spanPoints: 2,
      taperTip: false,
    });
    blade.rotateX(Math.PI / 2);
    blade.applyMatrix4(new THREE.Matrix4().makeRotationZ((i / blades) * Math.PI * 2));
    parts.push(blade);
  }
  group.add(new THREE.Mesh(mergeAll(parts), m.panel));
  const hub = new THREE.SphereGeometry(radius * 0.11, 8, 6);
  hub.scale(1, 1, 1.6);
  group.add(new THREE.Mesh(hub, m.metal));
  return group;
}

/** Advances every rotor and propeller about the axis it was built around. */
export function spinRotors(model: AircraftModel, dt: number, rate: number): void {
  for (const spinner of model.spinners) {
    const axis = (spinner.userData.spinAxis as 'x' | 'y' | 'z' | undefined) ?? 'y';
    spinner.rotation[axis] = (spinner.rotation[axis] + dt * rate) % (Math.PI * 2);
  }
}

/**
 * Aircraft fly at 45-250 m, well outside every shadow cascade, so shadow casting
 * is off across the board: it would cost cascade updates and produce nothing.
 * Frustum culling stays on, but with a generous bounding sphere so a wing sticking
 * out of a merged part cannot pop the whole airframe out at the screen edge.
 */
function applyRenderFlags(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (mesh.geometry.boundingSphere) mesh.geometry.boundingSphere.radius *= 1.35;
  });
}

export function disposeTree(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry?.dispose();
  });
  root.removeFromParent();
}
