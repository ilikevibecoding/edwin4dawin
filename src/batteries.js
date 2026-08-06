/**
 * Interceptor batteries.
 *
 * Three fictional launchers with deliberately different silhouettes, mechanical
 * animation and launch behaviour. Every capability figure comes from config.js
 * and exists purely for gameplay feel - none of it describes a real system.
 *
 * Each battery runs a small state machine:
 *   stowed -> prep (train + elevate) -> ready -> firing -> reload -> ready
 * and exposes launch transforms so interceptors.js can spawn rounds from the
 * correct tube with the correct attitude.
 */

import * as THREE from 'three';
import {
  box, cyl, sphere, cone, chamferBox, bolts, flangeBolts, panelBolts, cable,
  saggingCable, cableBundle, cableMaterial, pinnedRam, trussPanel,
  ladder, handrail, gratingDeck, grille, warningLamp, antennaMast, equipmentCase,
  cableTray, wheel, jackLeg, generatorSet, optimizeStatic, SHARED,
} from './util/kit.js';
import {
  matOliveArmour, matSandArmour, matGrayArmour, matSteel, matSteelDark, matChrome,
  matRubber, matHazard, matHazardRed, matHeat, matWhitePaint, matCanister,
  matEmissive, makeLamp, matGlass, matStructure, PALETTE,
} from './util/materials.js';
import { padMarking, hazardStripes, screenTexture } from './util/textures.js';
import { boxCollider, cylCollider } from './base/structures.js';
import { BATTERIES } from './config.js';
import { clamp, clamp01, damp, lerp, DEG, angleDelta } from './util/mathx.js';
import { Random } from './util/rng.js';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

// ===========================================================================
// Shared launcher sub-assemblies
// ===========================================================================

/** Heavy transporter/erector chassis shared by all three launchers. */
function buildChassis({ length = 9, width = 3, axles = 3, mat = matOliveArmour(), jacks = true }) {
  const g = new THREE.Group();
  const frameY = 0.95;
  // Main rails
  for (const sz of [-1, 1]) {
    g.add(box(length, 0.26, 0.28, matSteelDark(), 0, frameY, sz * (width / 2 - 0.35)));
  }
  // Cross members
  const cross = Math.max(3, Math.round(length / 1.4));
  for (let i = 0; i < cross; i++) {
    g.add(box(0.22, 0.18, width - 0.6, matSteelDark(),
      -length / 2 + (i + 0.5) * (length / cross), frameY - 0.02, 0));
  }
  // Deck plate
  const deck = box(length * 0.98, 0.08, width - 0.4, mat, 0, frameY + 0.17, 0);
  g.add(deck);
  // Side skirts with stowage boxes
  for (const sz of [-1, 1]) {
    g.add(box(length * 0.9, 0.42, 0.1, mat, 0, frameY - 0.2, sz * (width / 2 - 0.12)));
    for (let i = 0; i < 3; i++) {
      const stow = chamferBox(1.3, 0.5, 0.34, 0.03, mat);
      stow.position.set(-length * 0.3 + i * 1.6, frameY - 0.16, sz * (width / 2 + 0.06));
      g.add(stow);
      const latch = box(0.1, 0.14, 0.04, matChrome(), -length * 0.3 + i * 1.6 + 0.5,
        frameY - 0.16, sz * (width / 2 + 0.25));
      g.add(latch);
    }
  }
  // Running gear
  const wheels = [];
  const axleSpan = length * 0.62;
  for (let a = 0; a < axles; a++) {
    const ax = -axleSpan / 2 + (a / Math.max(1, axles - 1)) * axleSpan;
    for (const sz of [-1, 1]) {
      const w = wheel(0.62, 0.42);
      w.position.set(ax, 0.62, sz * (width / 2 - 0.15));
      g.add(w);
      wheels.push(w);
      g.add(box(0.6, 0.16, 0.6, matSteelDark(), ax, 0.66, sz * (width / 2 - 0.6)));
      g.add(box(0.06, 0.42, 0.52, matRubber(), ax + 0.72, 0.42, sz * (width / 2 - 0.15)));
    }
    // Axle tube + suspension
    g.add(cyl(0.09, width - 0.3, matSteelDark(), ax, 0.62, 0, 8).rotateZ(Math.PI / 2));
    for (const sz of [-1, 1]) {
      g.add(cyl(0.06, 0.42, matChrome(), ax, 0.85, sz * (width / 2 - 0.5), 6));
    }
  }
  // Levelling jacks
  const jackLegs = [];
  if (jacks) {
    for (const sx of [-length * 0.4, length * 0.4]) {
      for (const sz of [-1, 1]) {
        const j = jackLeg(0.95);
        j.position.set(sx, 0, sz * (width / 2 + 0.25));
        g.add(j);
        jackLegs.push(j);
      }
    }
  }
  return { group: g, frameY: frameY + 0.21, wheels, jackLegs, length, width };
}

/** Rectangular launch canister with end cap, rails and stencilling. */
function buildRectCanister({ w = 0.66, h = 0.66, len = 5.2, mat = matCanister(), label = '' }) {
  const g = new THREE.Group();
  const body = chamferBox(w, h, len, 0.035, mat);
  g.add(body);
  // Reinforcing bands
  const bands = Math.max(3, Math.round(len / 1.2));
  for (let i = 0; i < bands; i++) {
    const z = -len / 2 + (i + 0.5) * (len / bands);
    g.add(box(w + 0.035, h + 0.035, 0.07, matSteelDark(), 0, 0, z));
  }
  // Front frangible cap and rear blowout disc
  const cap = box(w * 0.98, h * 0.98, 0.07, matWhitePaint(), 0, 0, len / 2 + 0.04);
  g.add(cap);
  const capX = new THREE.Mesh(SHARED.plane, matHazardRed());
  capX.scale.set(w * 0.7, h * 0.7, 1);
  capX.position.z = len / 2 + 0.085;
  g.add(capX);
  const rear = box(w * 0.98, h * 0.98, 0.06, matHeat(), 0, 0, -len / 2 - 0.03);
  g.add(rear);
  // Guide rails and lifting lugs
  for (const sx of [-1, 1]) {
    g.add(box(0.06, 0.1, len * 0.94, matSteel(), sx * (w / 2 + 0.03), -h / 2 + 0.08, 0));
  }
  for (const sz of [-0.3, 0.3]) {
    g.add(box(0.1, 0.06, 0.14, matSteel(), 0, h / 2 + 0.03, sz * len));
  }
  // Connector block and umbilical
  const conn = box(0.16, 0.12, 0.2, matSteelDark(), w / 2 + 0.06, 0, -len * 0.3);
  g.add(conn);
  g.add(panelBolts(w * 0.9, h * 0.9, 0.22, 0.022, len / 2 + 0.075, matSteel()));

  if (label) {
    const sign = new THREE.Mesh(SHARED.plane, new THREE.MeshStandardMaterial({
      map: padMarking(label, { frame: false }), transparent: true,
      roughness: 0.8, metalness: 0.1,
    }));
    sign.scale.set(w * 0.8, w * 0.8, 1);
    sign.position.set(w / 2 + 0.005, 0, len * 0.18);
    sign.rotation.y = Math.PI / 2;
    g.add(sign);
  }
  g.userData.cap = cap;
  g.userData.capX = capX;
  g.userData.len = len;
  return g;
}

/** Round launch canister for the larger fictional systems. */
function buildRoundCanister({ r = 0.5, len = 7, mat = matCanister(), label = '' }) {
  const g = new THREE.Group();
  const body = cyl(r, len, mat, 0, 0, 0, 20);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const bands = Math.max(3, Math.round(len / 1.4));
  for (let i = 0; i < bands; i++) {
    const z = -len / 2 + (i + 0.5) * (len / bands);
    const band = cyl(r + 0.03, 0.09, matSteelDark(), 0, 0, z, 20);
    band.rotation.x = Math.PI / 2;
    g.add(band);
  }
  const cap = cyl(r * 0.99, 0.08, matWhitePaint(), 0, 0, len / 2 + 0.04, 20);
  cap.rotation.x = Math.PI / 2;
  g.add(cap);
  const rear = cyl(r * 0.99, 0.09, matHeat(), 0, 0, -len / 2 - 0.05, 20);
  rear.rotation.x = Math.PI / 2;
  g.add(rear);
  // Longitudinal stiffeners
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rib = box(0.06, 0.05, len * 0.9, matSteel(),
      Math.cos(a) * (r + 0.02), Math.sin(a) * (r + 0.02), 0);
    rib.rotation.z = a;
    g.add(rib);
  }
  const conn = box(0.18, 0.14, 0.24, matSteelDark(), r + 0.08, 0, -len * 0.28);
  g.add(conn);
  if (label) {
    const sign = new THREE.Mesh(SHARED.plane, new THREE.MeshStandardMaterial({
      map: padMarking(label, { frame: false }), transparent: true,
      roughness: 0.8, metalness: 0.1,
    }));
    sign.scale.set(r * 1.3, r * 1.3, 1);
    sign.position.set(r + 0.01, 0, len * 0.14);
    sign.rotation.y = Math.PI / 2;
    g.add(sign);
  }
  g.userData.cap = cap;
  g.userData.len = len;
  return g;
}

/**
 * Pin a pair of elevation rams between the traversing station and the erector.
 *
 * Rams that are simply parked at a fixed angle read as poles standing next to
 * the launcher. These are anchored at both ends: the barrel pivots on the
 * station and the rod stretches to a point that rides on the erector frame, so
 * the mechanism stays believable through the whole travel.
 *
 * The barrel is sized from the travel actually measured by sweeping the
 * mechanism at build time, which keeps the rod partly housed at every angle
 * regardless of how the surrounding geometry is tuned.
 */
function linkElevationRams(rig, {
  base, anchor, elevRange, barrelR = 0.14, rodR = 0.09, pedestal = true,
}) {
  const { train, pivot, frame } = rig;
  const anchors = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Object3D();
    a.position.set(sx * anchor[0], anchor[1], anchor[2]);
    frame.add(a);
    anchors.push(a);
  }

  const baseVec = new THREE.Vector3(base[0], base[1], base[2]);
  const probe = new THREE.Vector3();
  const restore = pivot.rotation.x;
  let minD = Infinity;
  for (let i = 0; i <= 10; i++) {
    pivot.rotation.x = -(elevRange[0] + (i / 10) * (elevRange[1] - elevRange[0])) * DEG;
    train.updateMatrixWorld(true);
    probe.setFromMatrixPosition(anchors[1].matrixWorld);
    train.worldToLocal(probe);
    minD = Math.min(minD, probe.distanceTo(baseVec));
  }
  pivot.rotation.x = restore;
  const barrelLen = Math.max(0.45, minD * 0.78);

  const rams = [];
  for (const sx of [-1, 1]) {
    const ram = pinnedRam(barrelLen, barrelR, rodR);
    ram.position.set(sx * base[0], base[1], base[2]);
    train.add(ram);
    rams.push(ram);
    if (pedestal && base[1] > 0.12) {
      const h = base[1];
      train.add(box(barrelR * 3.6, h, barrelR * 3.6, matSteelDark(), sx * base[0], h / 2, base[2]));
      train.add(box(barrelR * 5.0, 0.06, barrelR * 5.0, matSteel(), sx * base[0], h * 0.06, base[2]));
    }
    // Feed hoses looping from the station into the barrel
    train.add(saggingCable(
      new THREE.Vector3(sx * base[0] * 0.35, Math.max(0.12, base[1]) + 0.1, base[2] - 0.3),
      new THREE.Vector3(sx * base[0], Math.max(0.12, base[1]) + 0.16, base[2]),
      0.16, 0.026, cableMaterial('#1a1a1e'),
    ));
  }

  const p = new THREE.Vector3();
  const aimRams = () => {
    train.updateMatrixWorld(true);
    for (let i = 0; i < rams.length; i++) {
      p.setFromMatrixPosition(anchors[i].matrixWorld);
      train.worldToLocal(p);
      rams[i].aim(p);
    }
  };
  aimRams();
  return { rams, aimRams };
}

/** Status light panel: a small board of coloured indicators. */
function buildStatusPanel(width = 0.7) {
  const g = new THREE.Group();
  g.add(chamferBox(width, width * 0.5, 0.09, 0.02, matSteelDark()));
  const lamps = [];
  const colours = ['#39ff9e', '#ffb028', '#ff3b30', '#4fc3ff'];
  for (let i = 0; i < 4; i++) {
    // Per-battery status lamps need independent materials.
    const l = warningLamp(colours[i], width * 0.055, 2.6, false);
    l.position.set(-width * 0.3 + i * (width * 0.2), width * 0.1, 0.055);
    g.add(l);
    lamps.push(l);
  }
  // Legend text strip
  const strip = new THREE.Mesh(SHARED.plane, new THREE.MeshStandardMaterial({
    map: screenTexture(['RDY  PRP', 'FLT  RLD'], { size: 128, title: '' }),
    emissive: 0x223322, emissiveIntensity: 0.4, roughness: 0.5, metalness: 0.1,
  }));
  strip.scale.set(width * 0.8, width * 0.2, 1);
  strip.position.set(0, -width * 0.14, 0.05);
  g.add(strip);
  g.userData.lamps = lamps;
  return g;
}

// ===========================================================================
// MK-9 VANGUARD - terminal battery (Patriot-inspired silhouette)
// ===========================================================================

function buildVanguard(def) {
  const root = new THREE.Group();
  root.name = 'battery-vanguard';
  const colliders = [];
  const chassis = buildChassis({ length: 8.6, width: 2.9, axles: 2, mat: matOliveArmour() });
  root.add(chassis.group);
  colliders.push(boxCollider(0, 0, 4.4, 1.7, 2.0));

  const deckY = chassis.frameY;

  // Forward power/electronics module
  const epp = chamferBox(2.0, 1.35, 2.4, 0.06, matOliveArmour());
  epp.position.set(-3.1, deckY + 0.68, 0);
  root.add(epp);
  const eppGrille = grille(0.9, 0.9, 7);
  eppGrille.position.set(-4.12, deckY + 0.66, 0);
  eppGrille.rotation.y = -Math.PI / 2;
  root.add(eppGrille);
  root.add(cyl(0.07, 0.9, matHeat(), -2.4, deckY + 1.7, -0.8, 8));
  colliders.push(boxCollider(-3.1, 0, 1.1, 1.3, 2.6));

  // Traversing launching station: the whole erector, its trunnions and its rams
  // rotate together on the trailer deck.
  const train = new THREE.Group();
  train.position.set(0.6, deckY, 0);
  root.add(train);
  const turnRing = cyl(1.7, 0.16, matSteelDark(), 0, 0.08, 0, 24);
  train.add(turnRing);
  train.add(flangeBolts(16, 1.5, 0.028, 0.17, matSteel()));
  // Traversing deck the whole launching station stands on
  train.add(box(3.5, 0.14, 4.6, matSteelDark(), 0, 0.23, 0.7));
  train.add(gratingDeck(1.0, 2.4, matSteelDark()).translateY(0.31).translateX(1.85));

  // Rear trunnion towers: the erector hinges at the aft end of the pack.
  const pivot = new THREE.Group();
  pivot.position.set(0, 1.05, -0.5);
  train.add(pivot);
  for (const sz of [-1, 1]) {
    const tower = chamferBox(0.42, 1.4, 0.85, 0.05, matGrayArmour());
    tower.position.set(sz * 1.72, 0.62, -0.5);
    train.add(tower);
    train.add(cyl(0.15, 0.34, matChrome(), sz * 1.72, 1.05, -0.5, 12).rotateZ(Math.PI / 2));
    const plate = panelBolts(0.7, 1.2, 0.3, 0.02, 0, matSteel());
    plate.rotation.y = sz * Math.PI / 2;
    plate.position.set(sz * 1.94, 0.62, -0.5);
    train.add(plate);
  }

  // The erector frame carries the canister pack; +Z is "up the rail".
  const frame = new THREE.Group();
  pivot.add(frame);
  const packW = 3.24, packH = 1.86, packLen = 5.8;

  const frameBase = box(packW * 0.5, 0.32, packLen + 0.7, matGrayArmour(), 0, -packH / 2 - 0.24, packLen / 2 - 0.5);
  frame.add(frameBase);
  // Open side cages: two longerons with a lattice between them, so the tubes
  // stay visible through the structure instead of behind a plate.
  for (const sz of [-1, 1]) {
    for (const sy of [-1, 1]) {
      frame.add(box(0.2, 0.24, packLen + 0.5, matGrayArmour(),
        sz * (packW / 2 + 0.14), sy * (packH / 2 + 0.16), packLen / 2 - 0.5));
    }
    const lat = trussPanel(packLen + 0.3, packH + 0.06, 5, 0.09, matStructure());
    lat.rotation.y = Math.PI / 2;
    lat.position.set(sz * (packW / 2 + 0.14), 0, packLen / 2 - 0.5);
    frame.add(lat);
    // Cable run and hand line down the outside of the cage
    frame.add(cable([
      new THREE.Vector3(sz * (packW / 2 + 0.24), -packH / 2 - 0.05, -0.4),
      new THREE.Vector3(sz * (packW / 2 + 0.24), -packH / 2 - 0.05, packLen - 0.6),
    ], 0.035, cableMaterial('#121214')));
  }
  // Aft end: efflux deflector, tie-down beam and a scorched apron. This is the
  // face the site sees while the launcher is parked downrange, so it carries
  // as much detail as the muzzle end.
  const deflector = box(packW + 0.9, 0.12, 1.7, matHeat(), 0, -packH / 2 - 0.34, -1.05);
  deflector.rotation.x = 0.5;
  frame.add(deflector);
  frame.add(box(packW + 1.0, 0.16, 0.22, matHazard(), 0, -packH / 2 - 0.62, -1.8));
  for (const sy of [-1, 1]) {
    frame.add(box(packW + 0.4, 0.16, 0.22, matHeat(), 0, sy * (packH / 2 + 0.16), -0.55));
  }
  for (const sx of [-1, 1]) {
    frame.add(box(0.16, packH + 0.4, 0.22, matHeat(), sx * (packW / 2 + 0.16), 0, -0.55));
    // Umbilical break-away connectors on the aft face
    frame.add(cyl(0.09, 0.22, matSteel(), sx * (packW / 2 - 0.35), packH / 2 - 0.2, -0.62, 8)
      .rotateX(Math.PI / 2));
  }

  // 8 canisters in a 4 wide x 2 high pack. The tubes are deliberately spaced so
  // the individual squares read as canisters rather than as one slab.
  const canisters = [];
  const cw = packW / 4, ch = packH / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const can = buildRectCanister({
        w: cw * 0.86, h: ch * 0.86, len: packLen,
        mat: matCanister(), label: `${row * 4 + col + 1}`,
      });
      can.position.set(-packW / 2 + (col + 0.5) * cw, -packH / 2 + (row + 0.5) * ch, packLen / 2 - 0.4);
      frame.add(can);
      canisters.push(can);
    }
  }
  // Egg-crate webs between the tubes: thin, so the gaps stay legible.
  for (let col = 1; col < 4; col++) {
    frame.add(box(0.06, packH + 0.08, 0.14, matSteelDark(), -packW / 2 + col * cw, 0, -0.3));
    frame.add(box(0.06, packH + 0.08, 0.14, matSteelDark(), -packW / 2 + col * cw, 0, packLen * 0.45));
    frame.add(box(0.06, packH + 0.08, 0.14, matSteelDark(), -packW / 2 + col * cw, 0, packLen - 0.55));
  }
  for (const z of [-0.3, packLen * 0.45, packLen - 0.55]) {
    frame.add(box(packW + 0.02, 0.06, 0.14, matSteelDark(), 0, 0, z));
  }
  // Open muzzle collar: a rectangle of bars rather than a plate over the mouths
  const collarBar = 0.13;
  for (const sy of [-1, 1]) {
    frame.add(box(packW + 0.4, collarBar, 0.2, matGrayArmour(), 0, sy * (packH / 2 + 0.14), packLen - 0.5));
  }
  for (const sx of [-1, 1]) {
    frame.add(box(collarBar, packH + 0.4, 0.2, matGrayArmour(), sx * (packW / 2 + 0.14), 0, packLen - 0.5));
  }
  frame.add(panelBolts(packW + 0.28, packH + 0.28, 0.42, 0.024, packLen - 0.38, matSteel()));

  // Elevation rams: pinned on the station, riding an anchor under the pack.
  const { rams, aimRams } = linkElevationRams(
    { train, pivot, frame },
    {
      base: [1.16, 0.32, 2.05],
      anchor: [1.16, -packH / 2 - 0.42, 2.7],
      elevRange: [30, 86], barrelR: 0.15, rodR: 0.095,
    },
  );
  // Hydraulic hoses from the pump to the station
  for (const sz of [-1, 1]) {
    root.add(saggingCable(
      new THREE.Vector3(-2.2, deckY + 0.4, sz * 0.9),
      new THREE.Vector3(-0.9, deckY + 0.5, sz * 1.0),
      0.18, 0.028, cableMaterial('#26262a'),
    ));
  }
  // Umbilical harness from the electronics module up the frame
  const umbilical = cableBundle(
    new THREE.Vector3(-2.1, deckY + 0.7, 0.9),
    new THREE.Vector3(0.7, deckY + 0.55, 1.0),
    4, 0.35, 0.03, cableMaterial('#141416'),
  );
  root.add(umbilical);

  // Status panel and lamps
  const panel = buildStatusPanel(0.72);
  panel.position.set(-3.1, deckY + 1.1, 1.22);
  root.add(panel);
  const beacon = warningLamp('#ffb028', 0.075, 3, false);
  beacon.position.set(-3.1, deckY + 1.45, 0);
  root.add(beacon);

  // Site kit around the launcher
  const gen = generatorSet(matOliveArmour());
  gen.position.set(-2.0, 0, 5.2);
  gen.rotation.y = -0.35;
  root.add(gen);
  colliders.push(boxCollider(-2.0, 5.2, 1.5, 1.0, 1.8, -0.35));
  root.add(cableBundle(
    new THREE.Vector3(-2.0, 1.0, 4.2),
    new THREE.Vector3(-3.2, deckY + 0.4, 1.4),
    3, 0.5, 0.032, cableMaterial('#101012'),
  ));
  const tray = cableTray(4.4, matSteelDark());
  tray.position.set(-2.6, 0, 3.0);
  tray.rotation.y = Math.PI / 2;
  root.add(tray);

  return {
    root, colliders, canisters, frame, pivot, train, rams, aimRams,
    panel, beacon, chassis,
    // Elevation rotates the erector about X; 0 = stowed flat, high = firing.
    setElevation: (deg) => { pivot.rotation.x = -deg * DEG; },
    setTrain: (rad) => { train.rotation.y = rad; },
    trainable: true,
    stowedElevation: 34,
    muzzleLocal: (i) => {
      const can = canisters[i % canisters.length];
      return new THREE.Vector3(can.position.x, can.position.y, can.position.z + packLen / 2);
    },
    canisterParent: frame,
  };
}

// ===========================================================================
// HIGH LANCE - high-altitude battery (THAAD-inspired silhouette)
// ===========================================================================

function buildHighLance(def) {
  const root = new THREE.Group();
  root.name = 'battery-highlance';
  const colliders = [];

  const chassis = buildChassis({ length: 11.5, width: 3.2, axles: 3, mat: matSandArmour() });
  root.add(chassis.group);
  colliders.push(boxCollider(0, 0, 5.8, 1.8, 2.0));
  const deckY = chassis.frameY;

  // Forward cab (this launcher is a self-propelled vehicle)
  const cab = chamferBox(2.4, 1.9, 2.8, 0.1, matSandArmour());
  cab.position.set(-4.4, deckY + 0.85, 0);
  root.add(cab);
  root.add(box(0.08, 0.9, 2.2, matGlass(), -5.62, deckY + 1.15, 0));
  for (const sz of [-1, 1]) {
    root.add(box(1.0, 0.7, 0.06, matGlass(), -3.9, deckY + 1.15, sz * 1.41));
    root.add(cyl(0.02, 0.6, matSteelDark(), -5.3, deckY + 1.9, sz * 1.5, 5));
  }
  const cabGrille = grille(1.8, 0.5, 6);
  cabGrille.position.set(-5.66, deckY + 0.4, 0);
  cabGrille.rotation.y = -Math.PI / 2;
  root.add(cabGrille);
  for (const sz of [-0.9, 0.9]) {
    const lamp = warningLamp('#fff0d0', 0.11, 1.2);
    lamp.position.set(-5.66, deckY + 0.45, sz);
    root.add(lamp);
  }
  root.add(cyl(0.08, 2.0, matHeat(), -3.2, deckY + 1.5, -1.35, 10));
  colliders.push(boxCollider(-4.4, 0, 1.4, 1.6, 3.2));

  // Trainable turntable
  const turnBase = cyl(1.7, 0.3, matSteelDark(), 1.9, deckY + 0.15, 0, 24);
  root.add(turnBase);
  const turnBolts = flangeBolts(20, 1.52, 0.03, deckY + 0.31, matSteel());
  turnBolts.position.x = 1.9;
  root.add(turnBolts);

  const train = new THREE.Group();
  train.position.set(1.9, deckY + 0.3, 0);
  root.add(train);
  train.add(cyl(1.45, 0.55, matGrayArmour(), 0, 0.27, 0, 24));
  train.add(box(2.5, 0.16, 3.4, matSteelDark(), 0, 0.6, 0.2));
  // Trunnion towers: tall enough that the erector visibly stands on them
  for (const sz of [-1, 1]) {
    const tower = chamferBox(0.8, 1.6, 0.6, 0.05, matGrayArmour());
    tower.position.set(0, 1.0, sz * 1.32);
    train.add(tower);
    const brace = trussPanel(1.5, 1.3, 2, 0.09, matStructure());
    brace.rotation.y = Math.PI / 2;
    brace.position.set(0, 0.95, sz * 1.32);
    train.add(brace);
    train.add(cyl(0.17, 0.4, matChrome(), 0, 1.55, sz * 1.32, 12).rotateX(Math.PI / 2));
    train.add(cyl(0.26, 0.16, matSteelDark(), 0, 1.55, sz * 1.44, 14).rotateX(Math.PI / 2));
    train.add(panelBolts(0.7, 1.4, 0.3, 0.02, sz * 1.63, matSteel()));
  }

  const pivot = new THREE.Group();
  pivot.position.y = 1.55;
  train.add(pivot);

  // 6 large tubes in a 3 wide x 2 high pack, on a long frame
  const frame = new THREE.Group();
  pivot.add(frame);
  const packLen = 8.2, packW = 2.85, packH = 1.96;
  const canisters = [];
  const cw = packW / 3, ch = packH / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const can = buildRoundCanister({
        r: Math.min(cw, ch) * 0.47, len: packLen, mat: matCanister(),
        label: `${row * 3 + col + 1}`,
      });
      can.position.set(-packW / 2 + (col + 0.5) * cw, -packH / 2 + (row + 0.5) * ch, packLen / 2 - 1.0);
      frame.add(can);
      canisters.push(can);
    }
  }
  // Structural cage: side lattices between longerons, open top and bottom so
  // the tube pack keeps its shape from every angle.
  const cz = packLen / 2 - 1.0;
  for (const sz of [-1, 1]) {
    const lat = trussPanel(packLen, packH + 0.4, 6, 0.085, matStructure());
    lat.rotation.y = Math.PI / 2;
    lat.position.set(sz * (packW / 2 + 0.18), 0, cz);
    frame.add(lat);
    for (const sy of [-1, 1]) {
      frame.add(box(0.2, 0.2, packLen, matStructure(),
        sz * (packW / 2 + 0.18), sy * (packH / 2 + 0.2), cz));
    }
  }
  for (let i = 0; i <= 5; i++) {
    const z = -1.0 + (i / 5) * packLen;
    for (const sy of [-1, 1]) {
      frame.add(box(packW + 0.4, 0.12, 0.14, matStructure(), 0, sy * (packH / 2 + 0.2), z));
    }
  }
  // Open muzzle collar and a deep aft blast structure
  for (const sy of [-1, 1]) {
    frame.add(box(packW + 0.62, 0.2, 0.3, matStructure(), 0, sy * (packH / 2 + 0.24), packLen - 1.05));
  }
  for (const sx of [-1, 1]) {
    frame.add(box(0.2, packH + 0.62, 0.3, matStructure(), sx * (packW / 2 + 0.24), 0, packLen - 1.05));
  }
  frame.add(panelBolts(packW + 0.42, packH + 0.42, 0.44, 0.026, packLen - 0.88, matSteel()));
  frame.add(box(packW + 0.7, packH + 0.7, 0.16, matHeat(), 0, 0, -1.12));
  frame.add(box(packW + 1.4, 0.16, 1.8, matHeat(), 0, -packH / 2 - 0.5, -1.7));
  // Access walkway tucked against the cage, with a rail
  const walk = gratingDeck(0.55, packLen * 0.78, matSteelDark());
  walk.rotation.y = Math.PI / 2;
  walk.position.set(packW / 2 + 0.5, -packH / 2 - 0.24, cz);
  frame.add(walk);
  const walkRail = handrail([
    new THREE.Vector3(0, 0, -packLen * 0.36), new THREE.Vector3(0, 0, packLen * 0.36),
  ], 0.8, matStructure());
  walkRail.position.set(packW / 2 + 0.74, -packH / 2 - 0.22, cz);
  frame.add(walkRail);

  // Elevation rams, carried on the turntable so they slew with the pack
  const { rams, aimRams } = linkElevationRams(
    { train, pivot, frame },
    {
      base: [1.34, 0.56, 2.4],
      anchor: [1.34, -packH / 2 - 0.5, 3.1],
      elevRange: [22, 82], barrelR: 0.18, rodR: 0.115,
    },
  );
  root.add(cableBundle(
    new THREE.Vector3(-2.6, deckY + 0.5, 1.2),
    new THREE.Vector3(1.2, deckY + 0.6, 1.4),
    5, 0.4, 0.034, cableMaterial('#121214'),
  ));

  // Aft equipment: power unit, coolant skid, spares
  const gen = generatorSet(matSandArmour());
  gen.position.set(4.6, 0, 3.4);
  gen.rotation.y = 0.5;
  root.add(gen);
  colliders.push(boxCollider(4.6, 3.4, 1.5, 1.0, 1.8, 0.5));
  const coolant = chamferBox(1.8, 1.1, 1.2, 0.05, matSandArmour());
  coolant.position.set(5.4, deckY + 0.5, -0.4);
  root.add(coolant);
  for (let i = 0; i < 3; i++) {
    root.add(saggingCable(
      new THREE.Vector3(4.7, deckY + 0.9, -0.4 + i * 0.2),
      new THREE.Vector3(2.6, deckY + 0.5, 0.4),
      0.3, 0.04, cableMaterial('#1e1e22'),
    ));
  }
  const panel = buildStatusPanel(0.8);
  panel.position.set(-2.6, deckY + 1.0, 1.55);
  root.add(panel);
  const beacon = warningLamp('#ffb028', 0.08, 3, false);
  beacon.position.set(-4.4, deckY + 1.9, 0);
  root.add(beacon);
  const climb = ladder(deckY + 0.6, 0.44, matStructure());
  climb.position.set(0.2, 0, 1.7);
  root.add(climb);

  return {
    root, colliders, canisters, frame, pivot, train, rams, aimRams,
    panel, beacon, chassis,
    setElevation: (deg) => { pivot.rotation.x = -deg * DEG; },
    setTrain: (rad) => { train.rotation.y = rad; },
    trainable: true,
    stowedElevation: 26,
    muzzleLocal: (i) => {
      const can = canisters[i % canisters.length];
      return new THREE.Vector3(can.position.x, can.position.y, can.position.z + packLen / 2);
    },
    canisterParent: frame,
  };
}

// ===========================================================================
// SENTINEL LR - fictional long-range test battery
// ===========================================================================

function buildSentinel(def) {
  const root = new THREE.Group();
  root.name = 'battery-sentinel';
  const colliders = [];

  // Fixed emplacement rather than a road-mobile launcher: a heavy concrete
  // ring with a trainable erector. Distinct silhouette on the skyline.
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8f8b83, roughness: 0.95, metalness: 0.02 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.8, 1.1, 32), ringMat);
  ring.position.y = 0.55;
  ring.receiveShadow = true; ring.castShadow = true;
  root.add(ring);
  colliders.push(cylCollider(0, 0, 5.6, 1.1));
  // Hazard kerb and access steps
  const kerb = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.14, 8, 40), matHazard());
  kerb.rotation.x = Math.PI / 2;
  kerb.position.y = 1.1;
  root.add(kerb);
  for (let i = 0; i < 3; i++) {
    root.add(box(2.2, 0.24, 0.7, ringMat, 0, 0.12 + i * 0.28, 6.4 - i * 0.7));
  }

  // Flame pit with grating
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 1.0, 24, 1, true), matHeat());
  pit.position.y = 0.6;
  root.add(pit);
  const pitFloor = cyl(2.2, 0.1, matHeat(), 0, 0.14, 0, 24);
  root.add(pitFloor);
  const pitGrate = gratingDeck(5.2, 5.2, matSteelDark());
  pitGrate.position.y = 1.12;
  root.add(pitGrate);

  // Trainable base
  const train = new THREE.Group();
  train.position.y = 1.1;
  root.add(train);
  const turn = cyl(2.6, 0.6, matGrayArmour(), 0, 0.3, 0, 28);
  train.add(turn);
  train.add(flangeBolts(28, 2.35, 0.04, 0.62, matSteel()));
  // Drive housing and cable wrap
  const drive = chamferBox(1.3, 0.9, 1.0, 0.05, matGrayArmour());
  drive.position.set(2.2, 0.75, 0);
  train.add(drive);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    train.add(saggingCable(
      new THREE.Vector3(Math.cos(a) * 2.4, 0.4, Math.sin(a) * 2.4),
      new THREE.Vector3(Math.cos(a + 0.6) * 2.9, 0.2, Math.sin(a + 0.6) * 2.9),
      0.2, 0.04, cableMaterial('#121214'),
    ));
  }

  // Twin-tower erector cradle
  const pivot = new THREE.Group();
  pivot.position.y = 2.7;
  train.add(pivot);
  for (const sz of [-1, 1]) {
    const tower = chamferBox(1.1, 3.2, 0.7, 0.06, matGrayArmour());
    tower.position.set(0, 1.05, sz * 1.9);
    train.add(tower);
    train.add(trussPanel(1.0, 2.6, 3, 0.09, matStructure()).translateY(1.1).translateZ(sz * 1.9));
    train.add(cyl(0.22, 0.44, matChrome(), 0, 2.7, sz * 1.9, 14).rotateX(Math.PI / 2));
    train.add(panelBolts(0.9, 2.8, 0.4, 0.026, sz * 0.36, matSteel()));
  }

  const frame = new THREE.Group();
  pivot.add(frame);

  // Two very large round canisters side by side, plus a third stowed
  const packLen = 12.5;
  const canisters = [];
  const r = 0.92;
  for (let i = 0; i < 2; i++) {
    const can = buildRoundCanister({
      r, len: packLen, mat: matCanister(), label: `S${i + 1}`,
    });
    can.position.set(-1.32 + i * 2.64, 0, packLen / 2 - 2.2);
    frame.add(can);
    canisters.push(can);
  }
  // Third round stowed under the cradle - the "limited ammunition" reserve
  const reserve = buildRoundCanister({ r: r * 0.98, len: packLen, mat: matCanister(), label: 'S3' });
  reserve.position.set(0, -1.62, packLen / 2 - 2.2);
  frame.add(reserve);
  canisters.push(reserve);
  // Saddle ribs that hold the three rounds apart on the cradle
  for (let i = 0; i < 5; i++) {
    const z = -1.6 + i * (packLen / 5);
    frame.add(box(0.16, 3.0, 0.22, matStructure(), 0, -0.7, z));
    frame.add(box(4.4, 0.16, 0.22, matStructure(), 0, 0, z));
  }

  // Cradle structure
  for (const sz of [-1, 1]) {
    const lat = trussPanel(packLen, 2.6, 8, 0.11, matStructure());
    lat.rotation.y = Math.PI / 2;
    lat.position.set(sz * 2.15, -0.4, packLen / 2 - 2.2);
    frame.add(lat);
  }
  const spine = box(0.4, 0.5, packLen, matSteelDark(), 0, -2.4, packLen / 2 - 2.2);
  frame.add(spine);
  for (let i = 0; i < 5; i++) {
    frame.add(box(4.6, 0.22, 0.28, matSteel(), 0, -2.1, -1.4 + i * (packLen / 5)));
  }
  // Muzzle collar and aft blast structure. Both are open frames: on a launcher
  // this size a solid plate reads as a billboard rather than as hardware.
  for (const sy of [-1, 1]) {
    frame.add(box(5.2, 0.26, 0.36, matStructure(), 0, sy * 1.32, packLen - 2.35));
    frame.add(box(5.2, 0.22, 0.3, matHeat(), 0, sy * 1.32, -2.3));
  }
  for (const sx of [-1, 1]) {
    frame.add(box(0.26, 2.9, 0.36, matStructure(), sx * 2.6, 0, packLen - 2.35));
    frame.add(box(0.22, 2.9, 0.3, matHeat(), sx * 2.6, 0, -2.3));
    frame.add(cyl(0.2, 0.5, matHeat(), sx * 1.32, -1.6, -2.4, 14).rotateX(Math.PI / 2));
  }
  frame.add(panelBolts(4.9, 2.7, 0.55, 0.03, packLen - 2.16, matSteel()));
  // Efflux deflector under the aft end
  const aftDeflect = box(5.4, 0.18, 2.2, matHeat(), 0, -2.3, -3.0);
  aftDeflect.rotation.x = 0.42;
  frame.add(aftDeflect);
  // Umbilical mast that swings clear of the round
  const mast = new THREE.Group();
  mast.position.set(-2.6, -0.6, 1.0);
  frame.add(mast);
  mast.add(box(0.28, 0.28, 6.0, matGrayArmour(), 0, 0, 3.0));
  for (let i = 0; i < 4; i++) {
    mast.add(saggingCable(
      new THREE.Vector3(0, 0.15, 1.0 + i * 1.4),
      new THREE.Vector3(1.4, -0.1, 1.2 + i * 1.4),
      0.28, 0.045, cableMaterial('#17171a'),
    ));
  }
  // Walkway and rails along the cradle
  const walk = gratingDeck(0.7, packLen * 0.7, matSteelDark());
  walk.rotation.y = Math.PI / 2;
  walk.position.set(2.9, -1.0, packLen / 2 - 2.2);
  frame.add(walk);
  const rail = handrail([
    new THREE.Vector3(0, 0, -packLen * 0.32), new THREE.Vector3(0, 0, packLen * 0.32),
  ], 0.9, matStructure());
  rail.position.set(3.25, -1.0, packLen / 2 - 2.2);
  frame.add(rail);

  // Massive elevation rams
  const { rams, aimRams } = linkElevationRams(
    { train, pivot, frame },
    {
      base: [2.35, 0.62, 1.7],
      anchor: [2.35, -2.35, 2.7],
      elevRange: [18, 84], barrelR: 0.26, rodR: 0.165,
    },
  );

  // Surrounding support: gantry, chillers, cable vault, floodlights
  const gantry = new THREE.Group();
  for (const sx of [-1, 1]) {
    gantry.add(cyl(0.16, 7.5, matGrayArmour(), sx * 4.4, 3.75, 0, 10));
    gantry.add(trussPanel(7.4, 1.0, 5, 0.09, matStructure()));
  }
  const beam = trussPanel(9.0, 1.1, 7, 0.1, matStructure());
  beam.position.set(0, 7.6, 0);
  gantry.add(beam);
  const hoist = chamferBox(0.9, 0.7, 0.8, 0.04, matHazard());
  hoist.position.set(-2.0, 7.0, 0);
  gantry.add(hoist);
  gantry.add(cable([
    new THREE.Vector3(-2.0, 6.7, 0), new THREE.Vector3(-2.0, 4.4, 0),
  ], 0.02, cableMaterial('#2c2c2c')));
  const hook = box(0.2, 0.36, 0.16, matSteel(), -2.0, 4.2, 0);
  gantry.add(hook);
  gantry.position.set(0, 0, -9.5);
  root.add(gantry);
  for (const sx of [-1, 1]) {
    colliders.push(cylCollider(sx * 4.4, -9.5, 0.4, 7.5));
  }

  const chiller = chamferBox(3.4, 2.0, 2.2, 0.06, matGrayArmour());
  chiller.position.set(-8.6, 1.0, 3.0);
  chiller.rotation.y = 0.4;
  root.add(chiller);
  const chillGrille = grille(2.4, 1.4, 9);
  chillGrille.position.set(-7.6, 1.0, 4.2);
  chillGrille.rotation.y = 0.4;
  root.add(chillGrille);
  colliders.push(boxCollider(-8.6, 3.0, 1.8, 1.2, 2.0, 0.4));
  const gen = generatorSet(matGrayArmour());
  gen.position.set(8.4, 0, 4.0);
  gen.rotation.y = -0.6;
  root.add(gen);
  colliders.push(boxCollider(8.4, 4.0, 1.5, 1.0, 1.8, -0.6));
  root.add(cableBundle(
    new THREE.Vector3(8.0, 1.0, 3.2),
    new THREE.Vector3(3.4, 0.6, 1.4),
    5, 0.6, 0.05, cableMaterial('#0f0f11'),
  ));

  const panel = buildStatusPanel(1.0);
  panel.position.set(3.4, 1.9, 4.4);
  panel.rotation.y = -0.5;
  root.add(panel);
  const beacon = warningLamp('#ff3b30', 0.11, 3.4, false);
  beacon.position.set(0, 9.2, -9.5);
  root.add(beacon);

  return {
    root, colliders, canisters, frame, pivot, train, rams, aimRams,
    panel, beacon, chassis: null,
    setElevation: (deg) => { pivot.rotation.x = -deg * DEG; },
    setTrain: (rad) => { train.rotation.y = rad; },
    trainable: true,
    stowedElevation: 22,
    muzzleLocal: (i) => {
      const can = canisters[i % canisters.length];
      return new THREE.Vector3(can.position.x, can.position.y, can.position.z + packLen / 2);
    },
    canisterParent: frame,
  };
}

const BUILDERS = {
  vanguard: buildVanguard,
  highlance: buildHighLance,
  sentinel: buildSentinel,
};

// ===========================================================================
// Battery runtime
// ===========================================================================

/**
 * All three rigs are modelled with the canister axis along local +Z. A group
 * rotated by `y` points its +Z at world (sin y, 0, cos y), whose site bearing
 * (measured from -Z, clockwise) is `PI - y`. So converting a target bearing
 * into a training angle means `y = PI - bearing`, and a launcher parked at
 * `y = PI` faces due north, downrange toward the threat sector.
 */
const FRAME_AZIMUTH_OFFSET = Math.PI;

/** Training angle, local to the battery, that points the tubes at `bearing`. */
function trainForBearing(bearing, heading) {
  return FRAME_AZIMUTH_OFFSET - bearing - heading;
}

export const BATTERY_STATE = {
  STOWED: 'stowed',
  PREP: 'prep',
  READY: 'ready',
  FIRING: 'firing',
  RELOAD: 'reload',
  EMPTY: 'empty',
};

export class Battery {
  constructor(def, scene, effects) {
    this.def = def;
    this.effects = effects;
    const built = BUILDERS[def.id](def);
    this.rig = built;
    // Collapse the launcher into a few draw calls, working from the innermost
    // moving part outward so each merge only bakes transforms that are final.
    // Frangible caps toggle visibility when a tube fires, so they stay separate.
    for (const can of built.canisters) {
      if (can.userData.cap) can.userData.cap.userData.noMerge = true;
      if (can.userData.capX) can.userData.capX.userData.noMerge = true;
    }
    optimizeStatic(built.frame);
    built.frame.userData.noMerge = true;
    for (const ram of built.rams) {
      if (ram.userData.rod) ram.userData.rod.userData.noMerge = true;
      optimizeStatic(ram);
      ram.userData.noMerge = true;
    }
    built.panel.userData.noMerge = true;
    built.beacon.userData.noMerge = true;
    if (built.pivot) {
      optimizeStatic(built.pivot);
      built.pivot.userData.noMerge = true;
    }
    if (built.train) {
      optimizeStatic(built.train);
      built.train.userData.noMerge = true;
    }
    optimizeStatic(built.root);
    this.group = new THREE.Group();
    this.group.name = 'battery-' + def.id;
    this.group.add(built.root);
    this.group.position.set(def.position.x, 0, def.position.z);
    this.group.rotation.y = def.heading;
    scene.add(this.group);

    this.colliders = built.colliders.map((c) => {
      // Rotate local colliders into world space.
      const cosA = Math.cos(def.heading), sinA = Math.sin(def.heading);
      if (c.type === 'box') {
        return {
          ...c,
          x: def.position.x + c.x * cosA + c.z * sinA,
          z: def.position.z - c.x * sinA + c.z * cosA,
          rotY: (c.rotY || 0) + def.heading,
        };
      }
      return {
        ...c,
        x: def.position.x + c.x * cosA + c.z * sinA,
        z: def.position.z - c.x * sinA + c.z * cosA,
      };
    });

    this.state = BATTERY_STATE.STOWED;
    this.ammo = def.ammo;
    this.maxAmmo = def.ammo;
    this.nextTube = 0;
    this.elevation = built.stowedElevation;
    this.targetElevation = built.stowedElevation;
    // Parked facing downrange so a slew onto a target is short and readable.
    this.stowTrain = trainForBearing(0, def.heading);
    this.train = this.stowTrain;
    this.targetTrain = this.stowTrain;
    this.elevRate = def.slew?.elevation ?? 18;
    this.trainRate = def.slew?.train ?? 0.55;
    this.timer = 0;
    this.assignedTrackId = null;
    this.blockedReason = null;
    this.lampPhase = 0;
    this.firedThisSalvo = 0;
    this.tubeSpent = new Array(built.canisters.length).fill(false);
    this._ramElev = NaN;
    this._applyRig();
  }

  get worldPosition() {
    return this.group.position;
  }

  /** True while the launcher is pointing where it was told to point. */
  get aimed() {
    return Math.abs(this.elevation - this.targetElevation) < 1.5
      && Math.abs(angleDelta(this.train, this.targetTrain)) < 0.06;
  }

  get statusLabel() {
    switch (this.state) {
      case BATTERY_STATE.READY: return 'READY';
      case BATTERY_STATE.PREP: return 'PREP';
      case BATTERY_STATE.FIRING: return 'FIRING';
      case BATTERY_STATE.RELOAD: return 'RELOAD';
      case BATTERY_STATE.EMPTY: return this.ammo > 0 ? 'STOWED' : 'EMPTY';
      default: return this.ammo > 0 ? 'STOWED' : 'EMPTY';
    }
  }

  get statusClass() {
    switch (this.state) {
      case BATTERY_STATE.READY: return 'ready';
      case BATTERY_STATE.PREP: return 'busy';
      case BATTERY_STATE.FIRING: return 'busy';
      case BATTERY_STATE.RELOAD: return 'reload';
      case BATTERY_STATE.EMPTY: return this.ammo > 0 ? 'idle' : 'empty';
      // Stowed with rounds available is a normal resting state, not a fault.
      default: return this.ammo > 0 ? 'idle' : 'empty';
    }
  }

  get canFire() {
    return this.state === BATTERY_STATE.READY && this.ammo > 0;
  }

  /**
   * Check whether a track sits inside this battery's fictional envelope.
   * Used for the UI's feasibility cue and for explaining misses afterwards.
   */
  envelopeCheck(threat) {
    const e = this.def.envelope;
    const range = Math.hypot(
      threat.pos.x - this.group.position.x,
      threat.pos.z - this.group.position.z,
    );
    const alt = threat.pos.y;
    if (alt > e.maxAlt) return { ok: false, reason: 'TARGET ABOVE ENVELOPE' };
    if (range > e.maxRange) return { ok: false, reason: 'TARGET BEYOND ENVELOPE' };
    // Predicted crossing of the lower bound: can this battery still reach it?
    if (alt < e.minAlt) return { ok: false, reason: 'TARGET BELOW ENVELOPE' };
    if (range < e.minRange) return { ok: false, reason: 'TARGET INSIDE MINIMUM RANGE' };
    return { ok: true, reason: null };
  }

  /**
   * Begin the prep sequence: train toward a bearing (radians, world) and
   * elevate to the pitch the fire solution asks for.
   */
  prepare(bearing, pitchDeg) {
    if (this.state === BATTERY_STATE.RELOAD || this.ammo <= 0) return false;
    const range = this.def.flight.pitchRange ?? [45, this.def.flight.launchPitch];
    this.targetElevation = pitchDeg === undefined
      ? this.def.flight.launchPitch
      : clamp(pitchDeg, range[0], range[1]);
    if (this.rig.trainable && bearing !== undefined) {
      this.targetTrain = trainForBearing(bearing, this.def.heading);
    }
    if (this.state !== BATTERY_STATE.READY && this.state !== BATTERY_STATE.FIRING) {
      this.state = BATTERY_STATE.PREP;
      this.timer = this.def.prepTime;
    }
    return true;
  }

  /** Update the aim of an already-assigned battery as the solution drifts. */
  retarget(bearing, pitchDeg) {
    if (this.state === BATTERY_STATE.RELOAD || this.state === BATTERY_STATE.EMPTY) return;
    const range = this.def.flight.pitchRange ?? [45, this.def.flight.launchPitch];
    if (pitchDeg !== undefined) this.targetElevation = clamp(pitchDeg, range[0], range[1]);
    if (this.rig.trainable && bearing !== undefined) {
      this.targetTrain = trainForBearing(bearing, this.def.heading);
    }
  }

  stow() {
    if (this.state === BATTERY_STATE.FIRING) return;
    this.state = this.ammo > 0 ? BATTERY_STATE.STOWED : BATTERY_STATE.EMPTY;
    this.targetElevation = this.rig.stowedElevation;
    this.targetTrain = this.stowTrain;
    this.assignedTrackId = null;
  }

  /**
   * Consume a round and return the world-space launch transform.
   * @returns {{position: THREE.Vector3, direction: THREE.Vector3, tube: number}|null}
   */
  fire(rng) {
    if (!this.canFire) return null;
    let tube = -1;
    for (let i = 0; i < this.tubeSpent.length; i++) {
      const t = (this.nextTube + i) % this.tubeSpent.length;
      if (!this.tubeSpent[t]) { tube = t; break; }
    }
    if (tube < 0) return null;
    this.tubeSpent[tube] = true;
    this.nextTube = (tube + 1) % this.tubeSpent.length;
    this.ammo--;

    const local = this.rig.muzzleLocal(tube);
    const parent = this.rig.canisterParent;
    parent.updateWorldMatrix(true, false);
    const position = local.clone().applyMatrix4(parent.matrixWorld);
    // Launch direction is the canister axis (+Z of the frame) in world space.
    const direction = new THREE.Vector3(0, 0, 1)
      .transformDirection(parent.matrixWorld).normalize();
    // A little dispersion so a salvo does not look like a copy-paste.
    const spread = this.def.flight.launchSpread * DEG;
    if (rng) {
      direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), rng.gauss(0, spread));
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rng.gauss(0, spread));
    }
    direction.normalize();

    // Blow the frangible cap off the tube we just used.
    const can = this.rig.canisters[tube];
    if (can?.userData?.cap) {
      can.userData.cap.visible = false;
      if (can.userData.capX) can.userData.capX.visible = false;
    }

    this.state = BATTERY_STATE.FIRING;
    this.timer = this.def.salvoDelay;
    this.firedThisSalvo++;
    return { position, direction, tube };
  }

  beginReload() {
    this.state = BATTERY_STATE.RELOAD;
    this.timer = this.def.reloadTime;
    this.targetElevation = this.rig.stowedElevation;
  }

  completeReload() {
    this.ammo = this.maxAmmo;
    this.tubeSpent.fill(false);
    for (const can of this.rig.canisters) {
      if (can.userData.cap) can.userData.cap.visible = true;
      if (can.userData.capX) can.userData.capX.visible = true;
    }
    this.state = BATTERY_STATE.STOWED;
    this.nextTube = 0;
  }

  reset() {
    this.state = BATTERY_STATE.STOWED;
    this.ammo = this.maxAmmo;
    this.tubeSpent.fill(false);
    this.nextTube = 0;
    this.timer = 0;
    this.assignedTrackId = null;
    this.targetElevation = this.rig.stowedElevation;
    this.targetTrain = this.stowTrain;
    this.elevation = this.rig.stowedElevation;
    this.train = this.stowTrain;
    this.firedThisSalvo = 0;
    for (const can of this.rig.canisters) {
      if (can.userData.cap) can.userData.cap.visible = true;
      if (can.userData.capX) can.userData.capX.visible = true;
    }
    this._applyRig();
  }

  _applyRig() {
    this.rig.setElevation(this.elevation);
    if (this.rig.trainable) this.rig.setTrain(this.train);
    // Rams are pinned at both ends, so they only need re-solving when the
    // erector has actually moved.
    if (this.rig.aimRams && Math.abs(this.elevation - this._ramElev) > 0.02) {
      this._ramElev = this.elevation;
      this.rig.aimRams();
    }
  }

  update(dt, selected) {
    // Mechanical motion: elevation and training slew at fixed, fictional rates
    // that give each launcher its own sense of mass.
    const de = this.targetElevation - this.elevation;
    if (Math.abs(de) > 0.01) {
      this.elevation += clamp(de, -this.elevRate * dt, this.elevRate * dt);
    }
    if (this.rig.trainable) {
      const dTrain = angleDelta(this.train, this.targetTrain);
      if (Math.abs(dTrain) > 0.001) {
        this.train += clamp(dTrain, -this.trainRate * dt, this.trainRate * dt);
      }
    }
    this._applyRig();

    if (this.timer > 0) this.timer -= dt;

    switch (this.state) {
      case BATTERY_STATE.PREP:
        if (this.timer <= 0 && this.aimed) this.state = BATTERY_STATE.READY;
        break;
      case BATTERY_STATE.FIRING:
        if (this.timer <= 0) {
          this.state = this.ammo > 0 ? BATTERY_STATE.READY : BATTERY_STATE.EMPTY;
          this.firedThisSalvo = 0;
          if (this.ammo <= 0) this.beginReload();
        }
        break;
      case BATTERY_STATE.RELOAD:
        if (this.timer <= 0) this.completeReload();
        break;
      default:
        break;
    }

    // Status lighting -------------------------------------------------------
    this.lampPhase += dt;
    const lamps = this.rig.panel.userData.lamps;
    const blink = (period, duty = 0.5) => (this.lampPhase % period) / period < duty;
    lamps[0].setOn(this.state === BATTERY_STATE.READY, 1.4);
    lamps[1].setOn(this.state === BATTERY_STATE.PREP && blink(0.5), 1.6);
    lamps[2].setOn(this.state === BATTERY_STATE.FIRING && blink(0.24), 2.2);
    lamps[3].setOn(this.state === BATTERY_STATE.RELOAD && blink(0.9), 1.2);
    const hot = this.state === BATTERY_STATE.READY || this.state === BATTERY_STATE.FIRING;
    this.rig.beacon.setOn(hot ? blink(0.7, 0.35) : selected && blink(1.6, 0.2), hot ? 1.8 : 1);
  }
}

/** Build all three batteries and return them keyed by id. */
export function createBatteries(scene, effects) {
  const list = BATTERIES.map((def) => new Battery(def, scene, effects));
  const byId = {};
  for (const b of list) byId[b.def.id] = b;
  return { list, byId };
}
