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
  saggingCable, cableBundle, cableMaterial, hydraulicRam, trussPanel, ladder,
  handrail, gratingDeck, grille, warningLamp, antennaMast, equipmentCase,
  cableTray, wheel, jackLeg, generatorSet, optimizeStatic, SHARED,
} from './util/kit.js';
import {
  matOliveArmour, matSandArmour, matGrayArmour, matSteel, matSteelDark, matChrome,
  matRubber, matHazard, matHazardRed, matHeat, matWhitePaint, matCanister,
  matEmissive, makeLamp, matGlass, PALETTE,
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
  train.position.set(0, deckY, 0);
  root.add(train);
  const turnRing = cyl(1.5, 0.14, matSteelDark(), 0, 0.07, 0, 20);
  train.add(turnRing);
  train.add(flangeBolts(14, 1.3, 0.028, 0.15, matSteel()));

  const pivot = new THREE.Group();
  pivot.position.set(1.0, 0.36, 0);
  train.add(pivot);
  for (const sz of [-1, 1]) {
    train.add(box(0.5, 0.7, 0.22, matSteelDark(), 1.0, 0.2, sz * 1.05));
    train.add(cyl(0.11, 0.3, matChrome(), 1.0, 0.36, sz * 1.05, 10).rotateX(Math.PI / 2));
  }

  // The erector frame carries the canister pack; +Z is "up the rail".
  const frame = new THREE.Group();
  pivot.add(frame);
  const packW = 2.5, packH = 1.5, packLen = 5.4;

  const frameBase = box(0.24, 0.3, packLen + 0.5, matSteelDark(), 0, -packH / 2 - 0.2, packLen / 2 - 0.4);
  frame.add(frameBase);
  for (const sz of [-1, 1]) {
    const rail = box(0.16, packH + 0.4, packLen + 0.4, matSteel(), sz * (packW / 2 + 0.1), 0, packLen / 2 - 0.4);
    frame.add(rail);
    // Rail lattice
    const lat = trussPanel(packLen, packH + 0.3, 5, 0.07, matSteel());
    lat.rotation.y = Math.PI / 2;
    lat.position.set(sz * (packW / 2 + 0.02), 0, packLen / 2 - 0.4);
    frame.add(lat);
  }
  // Blast deflector at the base of the frame
  const deflector = box(packW + 0.8, 0.1, 1.5, matHeat(), 0, -packH / 2 - 0.3, -0.9);
  deflector.rotation.x = 0.5;
  frame.add(deflector);
  frame.add(box(packW + 0.9, 0.14, 0.2, matHazard(), 0, -packH / 2 - 0.55, -1.6));

  // 8 canisters in a 4 wide x 2 high pack
  const canisters = [];
  const cw = packW / 4, ch = packH / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const can = buildRectCanister({
        w: cw * 0.92, h: ch * 0.92, len: packLen, mat: matCanister(),
        label: `${row * 4 + col + 1}`,
      });
      can.position.set(-packW / 2 + (col + 0.5) * cw, -packH / 2 + (row + 0.5) * ch, packLen / 2 - 0.3);
      frame.add(can);
      canisters.push(can);
    }
  }
  // Pack framing over the canister mouths
  frame.add(box(packW + 0.3, 0.1, 0.12, matSteel(), 0, packH / 2 + 0.1, packLen - 0.3));
  frame.add(box(packW + 0.3, 0.1, 0.12, matSteel(), 0, -packH / 2 - 0.1, packLen - 0.3));

  // Elevation rams, carried on the traversing station
  const rams = [];
  for (const sz of [-1, 1]) {
    const ram = hydraulicRam(2.2, 0.13, 0.08, 1.9);
    ram.position.set(-1.2, 0.28, sz * 1.15);
    ram.rotation.x = -0.32;
    train.add(ram);
    rams.push(ram);
  }
  // Hydraulic hoses from the pump to the station
  for (const sz of [-1, 1]) {
    root.add(saggingCable(
      new THREE.Vector3(-2.2, deckY + 0.4, sz * 0.9),
      new THREE.Vector3(-1.35, deckY + 0.5, sz * 1.0),
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
    root, colliders, canisters, frame, pivot, train, rams,
    panel, beacon, chassis,
    // Elevation rotates the erector about X; 0 = stowed flat, high = firing.
    setElevation: (deg) => { pivot.rotation.x = -deg * DEG; },
    setTrain: (rad) => { train.rotation.y = rad; },
    trainable: true,
    stowedElevation: 4,
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
  train.add(cyl(1.2, 0.5, matGrayArmour(), 0, 0.25, 0, 20));
  // Trunnion towers
  for (const sz of [-1, 1]) {
    const tower = chamferBox(0.7, 1.5, 0.44, 0.05, matGrayArmour());
    tower.position.set(0, 1.05, sz * 1.15);
    train.add(tower);
    train.add(cyl(0.15, 0.34, matChrome(), 0, 1.55, sz * 1.15, 12).rotateX(Math.PI / 2));
    train.add(panelBolts(0.6, 1.3, 0.3, 0.02, sz * 0.23, matSteel()));
  }

  const pivot = new THREE.Group();
  pivot.position.y = 1.55;
  train.add(pivot);

  // 6 large tubes in a 3 wide x 2 high pack, on a long frame
  const frame = new THREE.Group();
  pivot.add(frame);
  const packLen = 8.2, packW = 2.4, packH = 1.9;
  const canisters = [];
  const cw = packW / 3, ch = packH / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const can = buildRoundCanister({
        r: Math.min(cw, ch) * 0.46, len: packLen, mat: matCanister(),
        label: `${row * 3 + col + 1}`,
      });
      can.position.set(-packW / 2 + (col + 0.5) * cw, -packH / 2 + (row + 0.5) * ch, packLen / 2 - 1.0);
      frame.add(can);
      canisters.push(can);
    }
  }
  // Structural cage around the tube pack
  for (const sz of [-1, 1]) {
    const lat = trussPanel(packLen, packH + 0.4, 6, 0.09, matSteel());
    lat.rotation.y = Math.PI / 2;
    lat.position.set(sz * (packW / 2 + 0.18), 0, packLen / 2 - 1.0);
    frame.add(lat);
  }
  for (const sy of [-1, 1]) {
    const lat = trussPanel(packLen, packW + 0.3, 6, 0.09, matSteel());
    lat.rotation.x = Math.PI / 2;
    lat.rotation.z = 0;
    lat.position.set(0, sy * (packH / 2 + 0.22), packLen / 2 - 1.0);
    frame.add(lat);
  }
  // Muzzle-end collar and aft blast plate
  frame.add(box(packW + 0.5, packH + 0.5, 0.22, matSteelDark(), 0, 0, packLen - 1.05));
  frame.add(box(packW + 0.7, packH + 0.7, 0.16, matHeat(), 0, 0, -1.12));
  frame.add(box(packW + 1.4, 0.16, 1.8, matHeat(), 0, -packH / 2 - 0.5, -1.7));
  // Access walkway and rail along the pack
  const walk = gratingDeck(0.5, packLen * 0.8, matSteelDark());
  walk.rotation.y = Math.PI / 2;
  walk.position.set(packW / 2 + 0.62, -packH / 2, packLen / 2 - 1.0);
  frame.add(walk);

  // Elevation rams (long, from the deck to the frame underside)
  const rams = [];
  for (const sz of [-1, 1]) {
    const ram = hydraulicRam(3.0, 0.16, 0.1, 2.6);
    ram.position.set(-0.9, deckY + 0.4, sz * 1.5);
    ram.rotation.x = -0.28;
    root.add(ram);
    rams.push(ram);
  }
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
  const climb = ladder(deckY + 0.6, 0.44, matSteel());
  climb.position.set(0.2, 0, 1.7);
  root.add(climb);

  return {
    root, colliders, canisters, frame, pivot, train, rams,
    panel, beacon, chassis,
    setElevation: (deg) => { pivot.rotation.x = -deg * DEG; },
    setTrain: (rad) => { train.rotation.y = rad; },
    trainable: true,
    stowedElevation: 2,
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
  pivot.position.y = 1.7;
  train.add(pivot);
  for (const sz of [-1, 1]) {
    const tower = chamferBox(1.0, 2.2, 0.6, 0.06, matGrayArmour());
    tower.position.set(0, 0.4, sz * 1.85);
    train.add(tower);
    train.add(cyl(0.2, 0.4, matChrome(), 0, 1.7, sz * 1.85, 14).rotateX(Math.PI / 2));
    train.add(panelBolts(0.85, 1.9, 0.34, 0.026, sz * 0.31, matSteel()));
  }

  const frame = new THREE.Group();
  pivot.add(frame);

  // Two very large round canisters side by side, plus a third stowed
  const packLen = 12.5;
  const canisters = [];
  const r = 0.95;
  for (let i = 0; i < 2; i++) {
    const can = buildRoundCanister({
      r, len: packLen, mat: matCanister(), label: `S${i + 1}`,
    });
    can.position.set(-1.05 + i * 2.1, 0, packLen / 2 - 2.2);
    frame.add(can);
    canisters.push(can);
  }
  // Third round stowed under the cradle - the "limited ammunition" reserve
  const reserve = buildRoundCanister({ r: r * 0.98, len: packLen, mat: matCanister(), label: 'S3' });
  reserve.position.set(0, -1.5, packLen / 2 - 2.2);
  frame.add(reserve);
  canisters.push(reserve);

  // Cradle structure
  for (const sz of [-1, 1]) {
    const lat = trussPanel(packLen, 2.6, 8, 0.11, matSteel());
    lat.rotation.y = Math.PI / 2;
    lat.position.set(sz * 2.15, -0.4, packLen / 2 - 2.2);
    frame.add(lat);
  }
  const spine = box(0.4, 0.5, packLen, matSteelDark(), 0, -2.4, packLen / 2 - 2.2);
  frame.add(spine);
  for (let i = 0; i < 5; i++) {
    frame.add(box(4.6, 0.22, 0.28, matSteel(), 0, -2.1, -1.4 + i * (packLen / 5)));
  }
  // Muzzle collar with heat shielding, and a big aft blast plate
  const collar = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.22, 8, 24), matHeat());
  collar.position.set(0, 0, packLen - 2.3);
  frame.add(collar);
  frame.add(box(5.0, 3.2, 0.3, matHeat(), 0, -0.2, -2.35));
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
  ], 0.9, matSteel());
  rail.position.set(3.25, -1.0, packLen / 2 - 2.2);
  frame.add(rail);

  // Massive elevation rams
  const rams = [];
  for (const sz of [-1, 1]) {
    const ram = hydraulicRam(4.0, 0.24, 0.15, 3.6);
    ram.position.set(0, 1.25, sz * 3.0);
    ram.rotation.x = -0.42;
    train.add(ram);
    rams.push(ram);
  }

  // Surrounding support: gantry, chillers, cable vault, floodlights
  const gantry = new THREE.Group();
  for (const sx of [-1, 1]) {
    gantry.add(cyl(0.16, 7.5, matGrayArmour(), sx * 4.4, 3.75, 0, 10));
    gantry.add(trussPanel(7.4, 1.0, 5, 0.09, matSteel()));
  }
  const beam = trussPanel(9.0, 1.1, 7, 0.1, matSteel());
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
    root, colliders, canisters, frame, pivot, train, rams,
    panel, beacon, chassis: null,
    setElevation: (deg) => { pivot.rotation.x = -deg * DEG; },
    setTrain: (rad) => { train.rotation.y = rad; },
    trainable: true,
    stowedElevation: 0,
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
    // Hydraulic rams follow the elevation so the mechanism reads as connected.
    const t = clamp01((this.elevation - this.rig.stowedElevation)
      / Math.max(1, this.def.flight.launchPitch - this.rig.stowedElevation));
    for (const ram of this.rig.rams) ram.extend(t);
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
