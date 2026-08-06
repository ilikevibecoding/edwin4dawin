/**
 * Site structures. Every building, vehicle and piece of ground support kit is
 * assembled here from the kit-bash library. Each builder returns its root group
 * plus any colliders the player capsule needs to respect.
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {
  box, cyl, sphere, cone, chamferBox, bolts, flangeBolts, panelBolts, cable,
  saggingCable, cableBundle, cableMaterial, hydraulicRam, trussPanel, ladder,
  handrail, gratingDeck, grille, warningLamp, floodlightHead, antennaMast,
  yagiAntenna, equipmentCase, barrierBlock, jerseyBarrier, cableTray, wheel,
  jackLeg, generatorSet, camoNetAwning, optimizeStatic, SHARED,
} from '../util/kit.js';
import {
  matOliveArmour, matSandArmour, matGrayArmour, matShelter, matSteel, matSteelDark,
  matChrome, matRubber, matTyre, matHazard, matHazardRed, matHeat, matWhitePaint,
  matGlass, matRadome, matEmissive, makeLamp, matGravel, matFence, matConcrete,
  matLensGlass, PALETTE,
} from '../util/materials.js';
import {
  concreteMaps, padMarking, screenTexture, hazardStripes, macroGround,
} from '../util/textures.js';
import { Random } from '../util/rng.js';

/** Collider helper: axis-aligned-ish box with optional Y rotation. */
export function boxCollider(x, z, hw, hd, height, rotY = 0, y = 0) {
  return { type: 'box', x, y, z, hw, hd, height, rotY };
}
export function cylCollider(x, z, radius, height, y = 0) {
  return { type: 'cyl', x, y, z, radius, height };
}

// ===========================================================================
// Command and control shelter
// ===========================================================================

export function buildCommandShelter() {
  const g = new THREE.Group();
  g.name = 'c2-shelter';
  const colliders = [];
  const W = 15, D = 8.4, H = 3.5;
  const wall = 0.22;
  const shell = matShelter();

  // Raised plinth
  const conc = concreteMaps(512, 21);
  const plinthMat = new THREE.MeshStandardMaterial({
    map: conc.map, normalMap: conc.normalMap, roughnessMap: conc.roughnessMap,
    roughness: 0.95, metalness: 0.02, color: 0xa5a099,
  });
  const plinth = box(W + 2.4, 0.42, D + 2.4, plinthMat, 0, 0.21, 0);
  g.add(plinth);
  colliders.push(boxCollider(0, 0, (W + 2.4) / 2, (D + 2.4) / 2, 0.42));

  const floorY = 0.42;

  // Walls with a doorway on the +Z face
  const doorW = 1.5;
  const mk = (w, h, d, x, y, z) => {
    const m = box(w, h, d, shell, x, y, z);
    return m;
  };
  // Back and sides
  g.add(mk(W, H, wall, 0, floorY + H / 2, -D / 2));
  g.add(mk(wall, H, D, -W / 2, floorY + H / 2, 0));
  g.add(mk(wall, H, D, W / 2, floorY + H / 2, 0));
  // Front with door gap slightly right of centre
  const doorX = 2.6;
  const leftW = (W / 2 + doorX - doorW / 2);
  const rightW = (W / 2 - doorX - doorW / 2);
  g.add(mk(leftW, H, wall, -W / 2 + leftW / 2, floorY + H / 2, D / 2));
  g.add(mk(rightW, H, wall, W / 2 - rightW / 2, floorY + H / 2, D / 2));
  // Lintel over the door
  g.add(mk(doorW + 0.3, H - 2.1, wall, doorX, floorY + 2.1 + (H - 2.1) / 2, D / 2));

  colliders.push(boxCollider(0, -D / 2, W / 2, wall, H, 0, floorY));
  colliders.push(boxCollider(-W / 2, 0, wall, D / 2, H, 0, floorY));
  colliders.push(boxCollider(W / 2, 0, wall, D / 2, H, 0, floorY));
  colliders.push(boxCollider(-W / 2 + leftW / 2, D / 2, leftW / 2, wall, H, 0, floorY));
  colliders.push(boxCollider(W / 2 - rightW / 2, D / 2, rightW / 2, wall, H, 0, floorY));

  // Floor and ceiling
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2d3230, roughness: 0.7, metalness: 0.2 });
  g.add(box(W - wall * 2, 0.06, D - wall * 2, floorMat, 0, floorY + 0.03, 0));
  g.add(box(W, 0.24, D, shell, 0, floorY + H + 0.12, 0));

  // Slightly pitched roof with ribs, kit and a camo net
  const roofY = floorY + H + 0.24;
  for (let i = 0; i < 7; i++) {
    g.add(box(W * 0.98, 0.1, 0.22, matSteelDark(), 0, roofY + 0.05, -D / 2 + (i + 0.5) * (D / 7)));
  }
  // Roof-mounted environmental unit
  const hvac = chamferBox(2.2, 0.9, 1.5, 0.06, matGrayArmour());
  hvac.position.set(-4.4, roofY + 0.45, 0.5);
  g.add(hvac);
  const hvacGrille = grille(1.9, 0.66, 7);
  hvacGrille.position.set(-4.4, roofY + 0.45, 1.27);
  g.add(hvacGrille);
  const fan = cyl(0.42, 0.12, matSteelDark(), -4.4, roofY + 0.95, 0.5, 12);
  g.add(fan);
  const fanBlades = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const b = box(0.62, 0.02, 0.16, matSteel(), 0, 0, 0);
    b.rotation.y = (i / 5) * Math.PI * 2;
    b.rotation.z = 0.3;
    fanBlades.add(b);
  }
  fanBlades.position.set(-4.4, roofY + 0.99, 0.5);
  fanBlades.userData.noMerge = true;
  g.add(fanBlades);

  // Antennas on the roof
  const mast = antennaMast(4.2);
  mast.position.set(6.4, roofY, -2.6);
  g.add(mast);
  const yagi = yagiAntenna(1.6);
  yagi.position.set(-6.2, roofY + 1.4, -2.2);
  yagi.rotation.y = 0.6;
  g.add(yagi);
  g.add(cyl(0.06, 1.4, matSteelDark(), -6.2, roofY + 0.7, -2.2, 6));
  // Satcom dish
  const dishMount = cyl(0.09, 1.1, matSteelDark(), 4.0, roofY + 0.55, 2.2, 8);
  g.add(dishMount);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.36),
    matRadome(),
  );
  dish.rotation.x = -1.05;
  dish.rotation.y = 0.4;
  dish.position.set(4.0, roofY + 1.15, 2.2);
  g.add(dish);
  g.add(cyl(0.05, 0.7, matSteelDark(), 4.0, roofY + 1.45, 2.55, 6));

  // Door frame, hazard stripe and a step
  const frame = matSteel();
  g.add(box(0.12, 2.2, 0.3, frame, doorX - doorW / 2, floorY + 1.1, D / 2));
  g.add(box(0.12, 2.2, 0.3, frame, doorX + doorW / 2, floorY + 1.1, D / 2));
  g.add(box(doorW + 0.24, 0.12, 0.3, frame, doorX, floorY + 2.2, D / 2));
  const step = box(doorW + 0.9, 0.42, 0.9, plinthMat, doorX, 0.21, D / 2 + 1.6);
  g.add(step);
  const openDoor = box(doorW, 2.05, 0.07, matOliveArmour(), 0, 0, 0);
  openDoor.position.set(doorX - doorW / 2 - 0.05, floorY + 1.03, D / 2 + 0.7);
  openDoor.rotation.y = -1.15;
  g.add(openDoor);

  // Exterior detail: cable entries, boxes, signage, lamps
  const shelterTray = cableTray(6.4, matSteelDark());
  shelterTray.position.set(-3, 0.42, D / 2 + 1.3);
  g.add(shelterTray);
  const entryBox = chamferBox(0.7, 0.9, 0.34, 0.04, matGrayArmour());
  entryBox.position.set(-5.5, floorY + 1.2, D / 2 + 0.2);
  g.add(entryBox);
  for (let i = 0; i < 4; i++) {
    g.add(saggingCable(
      new THREE.Vector3(-5.5 + i * 0.12, floorY + 0.8, D / 2 + 0.36),
      new THREE.Vector3(-4.2 + i * 0.3, 0.5, D / 2 + 1.4),
      0.32, 0.028, cableMaterial('#181818'),
    ));
  }
  const doorLamp = warningLamp('#ffd9a0', 0.09, 2.2);
  doorLamp.position.set(doorX, floorY + 2.45, D / 2 + 0.2);
  g.add(doorLamp);
  const beacon = warningLamp('#ff3b30', 0.11, 3.2);
  beacon.position.set(W / 2 - 0.6, roofY + 0.5, D / 2 - 0.6);
  g.add(beacon);

  // Sign board by the door
  const sign = new THREE.Mesh(
    SHARED.plane,
    new THREE.MeshStandardMaterial({
      map: padMarking('C2', { sub: 'AEGIS LINE', frame: true }),
      transparent: true, roughness: 0.8, metalness: 0.1,
    }),
  );
  sign.scale.set(0.9, 0.9, 1);
  sign.position.set(doorX + 1.5, floorY + 1.7, D / 2 + 0.13);
  g.add(sign);

  // ---------------------------------------------------------------- interior
  const interior = new THREE.Group();
  interior.name = 'c2-interior';
  g.add(interior);

  // Console desk along the -Z wall
  const deskY = floorY + 0.06;
  const desk = chamferBox(6.2, 0.09, 1.05, 0.03, matGrayArmour());
  desk.position.set(-1.2, deskY + 0.86, -D / 2 + 1.0);
  interior.add(desk);
  for (const sx of [-2.8, 0, 2.8]) {
    interior.add(box(0.1, 0.86, 0.9, matSteelDark(), -1.2 + sx, deskY + 0.43, -D / 2 + 1.0));
  }
  // Equipment racks under the desk
  for (const sx of [-2.0, 1.5]) {
    const rack = chamferBox(1.5, 0.7, 0.8, 0.02, matSteelDark());
    rack.position.set(-1.2 + sx, deskY + 0.36, -D / 2 + 1.05);
    interior.add(rack);
    for (let i = 0; i < 5; i++) {
      const panel = box(1.36, 0.1, 0.03, matGrayArmour(), -1.2 + sx, deskY + 0.08 + i * 0.13, -D / 2 + 1.46);
      interior.add(panel);
      const led = warningLamp(i % 2 ? '#39ff9e' : '#ffb028', 0.016, 2.6);
      led.position.set(-1.2 + sx + 0.58, deskY + 0.08 + i * 0.13, -D / 2 + 1.49);
      interior.add(led);
    }
  }

  // Three canted display panels
  const screens = [];
  const screenSpecs = [
    { x: -4.0, rot: 0.42, w: 1.5, h: 1.0, title: 'SITE STATUS' },
    { x: -1.2, rot: 0.0, w: 1.9, h: 1.25, title: 'SURVEILLANCE' },
    { x: 1.75, rot: -0.42, w: 1.5, h: 1.0, title: 'BATTERY STATUS' },
  ];
  for (const spec of screenSpecs) {
    const bezel = chamferBox(spec.w + 0.09, spec.h + 0.09, 0.07, 0.02, matSteelDark());
    const tex = screenTexture(['', '', ''], { title: spec.title, size: 256 });
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.25,
      roughness: 0.3, metalness: 0.1, color: 0x111111,
    });
    const panel = new THREE.Mesh(SHARED.plane, mat);
    panel.scale.set(spec.w, spec.h, 1);
    panel.position.z = 0.038;
    const holder = new THREE.Group();
    holder.add(bezel); holder.add(panel);
    holder.position.set(spec.x, deskY + 1.55, -D / 2 + 0.62);
    holder.rotation.y = spec.rot;
    holder.rotation.x = -0.12;
    interior.add(holder);
    // Support arm
    const arm = cyl(0.035, 0.55, matSteelDark(), spec.x, deskY + 1.14, -D / 2 + 0.66, 6);
    interior.add(arm);
    screens.push({ mesh: panel, material: mat, texture: tex, title: spec.title });
  }

  // Keyboards, trackballs, mugs, a headset - the lived-in details
  for (const sx of [-4.0, -1.2, 1.75]) {
    const kb = chamferBox(0.62, 0.03, 0.22, 0.01, matSteelDark());
    kb.position.set(sx, deskY + 0.9, -D / 2 + 1.28);
    kb.rotation.x = -0.06;
    interior.add(kb);
    const ball = sphere(0.055, matChrome(), sx + 0.45, deskY + 0.93, -D / 2 + 1.3);
    interior.add(ball);
  }
  const mug = cyl(0.045, 0.11, matWhitePaint(), 0.4, deskY + 0.94, -D / 2 + 1.4, 10);
  interior.add(mug);

  // The prominent launch authorisation panel: keyed switch + guarded button
  const authPanel = chamferBox(0.95, 0.42, 0.12, 0.02, matGrayArmour());
  authPanel.position.set(0.5, deskY + 1.02, -D / 2 + 1.02);
  authPanel.rotation.x = -0.62;
  interior.add(authPanel);
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.1, 10, 1, true),
    matHazardRed(),
  );
  guard.position.set(0.72, deskY + 1.1, -D / 2 + 0.96);
  guard.rotation.x = -0.62 + Math.PI / 2;
  interior.add(guard);
  const bigButton = cyl(0.075, 0.06, matEmissive('#ff2a20', 2.2), 0.72, deskY + 1.1, -D / 2 + 0.96, 12);
  bigButton.rotation.x = -0.62 + Math.PI / 2;
  interior.add(bigButton);
  const keySwitch = cyl(0.04, 0.05, matChrome(), 0.24, deskY + 1.05, -D / 2 + 0.99, 8);
  keySwitch.rotation.x = -0.62 + Math.PI / 2;
  interior.add(keySwitch);

  // Operator chair
  const chair = new THREE.Group();
  chair.add(cyl(0.28, 0.05, matSteelDark(), 0, 0.03, 0, 10));
  chair.add(cyl(0.05, 0.44, matChrome(), 0, 0.25, 0, 8));
  const seatPad = chamferBox(0.52, 0.1, 0.5, 0.04, matRubber());
  seatPad.position.set(0, 0.5, 0);
  chair.add(seatPad);
  const backRest = chamferBox(0.5, 0.62, 0.09, 0.04, matRubber());
  backRest.position.set(0, 0.84, -0.24);
  backRest.rotation.x = -0.14;
  chair.add(backRest);
  chair.position.set(-1.2, floorY + 0.06, -D / 2 + 2.1);
  chair.rotation.y = 0.2;
  interior.add(chair);

  // Wall kit: map board, fire extinguisher, cable runs, ceiling lights
  const mapBoard = box(2.6, 1.5, 0.05, matWhitePaint(), -3.0, floorY + 1.9, D / 2 - 0.26);
  interior.add(mapBoard);
  const ext = cyl(0.09, 0.5, matHazardRed(), W / 2 - 0.45, floorY + 0.85, 1.6, 10);
  interior.add(ext);

  const lights = [];
  for (const lz of [-2.2, 0.6, 2.8]) {
    const strip = box(2.6, 0.06, 0.22, matEmissive('#e8f4ff', 1.9), 0, floorY + H - 0.14, lz);
    interior.add(strip);
    const housing = box(2.75, 0.1, 0.3, matSteelDark(), 0, floorY + H - 0.06, lz);
    interior.add(housing);
    lights.push(strip);
  }
  // Interior fill light so the room reads without relying on the sun
  const roomLight = new THREE.PointLight(0xcfe4ff, 6, 16, 2);
  roomLight.position.set(-0.5, floorY + H - 0.5, 0);
  interior.add(roomLight);
  const deskGlow = new THREE.PointLight(0x8fffd0, 2.4, 6, 2);
  deskGlow.position.set(-1.2, deskY + 1.3, -D / 2 + 1.4);
  interior.add(deskGlow);

  // Interior wall panels to hide the outside through the doorway
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x3a423c, roughness: 0.9, metalness: 0.15 });
  g.add(box(W - 0.5, H - 0.1, 0.04, innerMat, 0, floorY + (H - 0.1) / 2, -D / 2 + wall / 2 + 0.03));

  return {
    group: g, colliders, screens, interiorLights: lights,
    consoleAnchor: new THREE.Vector3(-1.2, floorY, -D / 2 + 2.2),
    doorAnchor: new THREE.Vector3(doorX, floorY, D / 2 + 1.2),
    roomLight, deskGlow, beacon, doorLamp, fanBlades,
    size: { W, D, H },
  };
}

// ===========================================================================
// Radar installation - rotating search array plus a phased-array face
// ===========================================================================

export function buildRadarStation() {
  const g = new THREE.Group();
  g.name = 'radar-station';
  const colliders = [];

  // Trailer chassis on jacks
  const chassis = chamferBox(8.2, 0.6, 3.0, 0.06, matOliveArmour());
  chassis.position.y = 1.05;
  g.add(chassis);
  g.add(box(8.4, 0.16, 0.24, matSteelDark(), 0, 0.72, -1.35));
  g.add(box(8.4, 0.16, 0.24, matSteelDark(), 0, 0.72, 1.35));
  for (const sx of [-3.4, -1.2, 1.2, 3.4]) {
    for (const sz of [-1.0, 1.0]) {
      const j = jackLeg(1.0);
      j.position.set(sx, 0, sz * 1.5);
      j.deploy(0.85);
      g.add(j);
    }
  }
  for (const sx of [-2.6, 2.6]) {
    for (const sz of [-1, 1]) {
      const w = wheel(0.52, 0.34);
      w.position.set(sx, 0.52, sz * 1.55);
      g.add(w);
    }
  }
  colliders.push(boxCollider(0, 0, 4.2, 1.7, 1.7));

  // Equipment cabin at one end
  const cabin = chamferBox(2.6, 2.0, 2.8, 0.06, matOliveArmour());
  cabin.position.set(-2.8, 2.35, 0);
  g.add(cabin);
  const cabinGrille = grille(1.0, 1.2, 8);
  cabinGrille.position.set(-4.11, 2.35, 0.6);
  cabinGrille.rotation.y = -Math.PI / 2;
  g.add(cabinGrille);
  const cabinLamp = warningLamp('#39ff9e', 0.05, 2.6);
  cabinLamp.position.set(-1.5, 3.1, 1.42);
  g.add(cabinLamp);
  colliders.push(boxCollider(-2.8, 0, 1.4, 1.5, 3.4));

  // Turntable and mast
  const turnBase = cyl(1.5, 0.36, matSteelDark(), 1.6, 1.5, 0, 20);
  g.add(turnBase);
  const turnBolts = flangeBolts(16, 1.32, 0.032, 1.7, matSteel());
  turnBolts.position.x = 1.6;
  g.add(turnBolts);

  const rotator = new THREE.Group();
  rotator.position.set(1.6, 1.72, 0);
  rotator.userData.noMerge = true;
  g.add(rotator);

  const column = cyl(0.46, 1.5, matGrayArmour(), 0, 0.75, 0, 16);
  rotator.add(column);
  rotator.add(cyl(0.56, 0.12, matSteelDark(), 0, 0.06, 0, 18));
  // Slip-ring housing detail
  rotator.add(cyl(0.3, 0.3, matChrome(), 0, 1.62, 0, 12));

  // Planar array face on an elevation trunnion
  const tilt = new THREE.Group();
  tilt.position.y = 1.8;
  rotator.add(tilt);

  const arrayW = 4.4, arrayH = 3.0;
  const arrayFrame = chamferBox(arrayW, arrayH, 0.32, 0.05, matGrayArmour());
  tilt.add(arrayFrame);
  // Radiating face: emissive-lit element grid
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x22282c, roughness: 0.45, metalness: 0.7,
    emissive: 0x0d3a2c, emissiveIntensity: 0.6,
  });
  const face = box(arrayW - 0.22, arrayH - 0.22, 0.06, faceMat, 0, 0, 0.19);
  tilt.add(face);
  const cols = 12, rows = 9;
  const elemGeo = new THREE.CylinderGeometry(0.055, 0.075, 0.09, 6);
  const elemMat = new THREE.MeshStandardMaterial({
    color: 0x2f3a38, roughness: 0.4, metalness: 0.85,
    emissive: 0x123c30, emissiveIntensity: 0.9,
  });
  const elems = new THREE.InstancedMesh(elemGeo, elemMat, cols * rows);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
  let ei = 0;
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      v3.set(
        -arrayW / 2 + 0.34 + cx * ((arrayW - 0.68) / (cols - 1)),
        -arrayH / 2 + 0.3 + cy * ((arrayH - 0.6) / (rows - 1)),
        0.24,
      );
      m4.compose(v3, q4, s3);
      elems.setMatrixAt(ei++, m4);
    }
  }
  elems.instanceMatrix.needsUpdate = true;
  tilt.add(elems);
  tilt.add(panelBolts(arrayW, arrayH, 0.5, 0.03, 0.17, matSteel()));

  // Back structure: stiffening truss, cooling manifolds, hoses
  const backTruss = trussPanel(arrayW * 0.92, arrayH * 0.8, 4, 0.07, matSteel());
  backTruss.position.z = -0.34;
  tilt.add(backTruss);
  for (const sy of [-0.9, 0.9]) {
    const manifold = cyl(0.1, arrayW * 0.85, matSteelDark(), 0, sy, -0.5, 10);
    manifold.rotation.z = Math.PI / 2;
    tilt.add(manifold);
  }
  for (let i = 0; i < 5; i++) {
    tilt.add(saggingCable(
      new THREE.Vector3(-1.6 + i * 0.8, -0.9, -0.55),
      new THREE.Vector3(-1.6 + i * 0.8, 0.9, -0.55),
      -0.22, 0.035, cableMaterial('#1c1c1e'),
    ));
  }
  // Elevation rams
  for (const sx of [-1.5, 1.5]) {
    const ram = hydraulicRam(1.1, 0.09, 0.055, 0.55);
    ram.position.set(sx, -arrayH / 2 - 0.2, -0.8);
    ram.rotation.x = -0.5;
    ram.extend(0.45);
    tilt.add(ram);
  }
  tilt.rotation.x = -0.42;

  // Identification-friend-or-foe style secondary rotating dish above
  const dishRot = new THREE.Group();
  dishRot.position.y = arrayH / 2 + 0.5;
  tilt.add(dishRot);
  const dishArm = cyl(0.06, 0.9, matSteelDark(), 0, 0.45, 0, 6);
  dishRot.add(dishArm);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.38),
    matRadome(),
  );
  dish.rotation.x = -1.35;
  dish.position.y = 0.95;
  dishRot.add(dish);
  dishRot.add(cyl(0.03, 0.5, matSteelDark(), 0, 1.25, 0.2, 5));

  // Cable drops from the rotator to the trailer
  for (let i = 0; i < 3; i++) {
    g.add(saggingCable(
      new THREE.Vector3(1.6 + (i - 1) * 0.2, 1.9, 0.5),
      new THREE.Vector3(-1.0, 1.4, 1.3 + i * 0.12),
      0.5, 0.04, cableMaterial('#141416'),
    ));
  }
  // Warning lamps on the corners of the array
  const arrayLamps = [];
  for (const sx of [-1, 1]) {
    const l = warningLamp('#ffb028', 0.055, 3.2);
    l.position.set(sx * (arrayW / 2 + 0.1), arrayH / 2 - 0.1, 0);
    tilt.add(l);
    arrayLamps.push(l);
  }

  // Ground kit
  const gen = generatorSet(matOliveArmour());
  gen.position.set(-1.5, 0, -5.4);
  gen.rotation.y = 0.3;
  g.add(gen);
  colliders.push(boxCollider(-1.5, -5.4, 1.5, 1.0, 1.8, 0.3));
  g.add(cableBundle(
    new THREE.Vector3(-1.5, 1.0, -4.3),
    new THREE.Vector3(-2.4, 1.1, -1.5),
    4, 0.5, 0.035, cableMaterial('#101012'),
  ));

  const caseA = equipmentCase(1.1, 0.7, 0.8, matOliveArmour());
  caseA.position.set(3.6, 0.35, 2.6);
  caseA.rotation.y = 0.3;
  g.add(caseA);
  const caseB = equipmentCase(0.9, 0.55, 0.7, matSandArmour());
  caseB.position.set(4.5, 0.28, 2.1);
  caseB.rotation.y = -0.5;
  g.add(caseB);

  // Collapse the array head bottom-up: each merge bakes only final transforms.
  optimizeStatic(dishRot);
  dishRot.userData.noMerge = true;
  optimizeStatic(tilt);
  tilt.userData.noMerge = true;
  optimizeStatic(rotator);

  return {
    group: g, colliders, rotator, tilt, dishRot, face, faceMat, elemMat,
    arrayLamps, cabinLamp, generator: gen,
  };
}

// ===========================================================================
// Support vehicles
// ===========================================================================

export function buildSupportTruck({ variant = 'cargo', seed = 1 } = {}) {
  const g = new THREE.Group();
  const rng = new Random(seed);
  const bodyMat = rng.bool(0.5) ? matOliveArmour() : matSandArmour();

  // Chassis rails
  g.add(box(6.8, 0.18, 0.22, matSteelDark(), 0, 0.72, -0.55));
  g.add(box(6.8, 0.18, 0.22, matSteelDark(), 0, 0.72, 0.55));
  g.add(box(6.8, 0.1, 1.3, matSteelDark(), 0, 0.66, 0));

  // Cab
  const cab = chamferBox(2.1, 1.5, 2.3, 0.09, bodyMat);
  cab.position.set(-2.1, 1.62, 0);
  g.add(cab);
  const wind = box(0.06, 0.72, 1.9, matGlass(), -3.13, 1.9, 0);
  g.add(wind);
  for (const sz of [-1, 1]) {
    g.add(box(0.9, 0.6, 0.05, matGlass(), -1.8, 1.9, sz * 1.16));
  }
  // Bonnet, grille, bumper, lights
  const bonnet = chamferBox(1.0, 0.66, 2.1, 0.06, bodyMat);
  bonnet.position.set(-3.55, 1.35, 0);
  g.add(bonnet);
  const truckGrille = grille(1.7, 0.5, 6);
  truckGrille.position.set(-4.06, 1.3, 0);
  truckGrille.rotation.y = -Math.PI / 2;
  g.add(truckGrille);
  g.add(box(0.24, 0.26, 2.5, matSteelDark(), -4.15, 0.92, 0));
  // Headlamps are dark reflectors in daylight, not lit lamps: an emissive lens
  // on a parked truck reads as headlights left on at noon.
  for (const sz of [-0.85, 0.85]) {
    g.add(cyl(0.115, 0.06, matSteelDark(), -4.1, 1.34, sz, 12).rotateZ(Math.PI / 2));
    const lens = cyl(0.1, 0.02, matLensGlass(), -4.14, 1.34, sz, 12);
    lens.rotation.z = Math.PI / 2;
    g.add(lens);
  }
  // Mirrors, exhaust, spare wheel
  for (const sz of [-1, 1]) {
    g.add(cyl(0.02, 0.5, matSteelDark(), -3.0, 2.15, sz * 1.35, 5));
    const mirror = box(0.05, 0.3, 0.16, matSteelDark(), -3.0, 2.35, sz * 1.5);
    g.add(mirror);
  }
  const stack = cyl(0.075, 1.9, matHeat(), -1.05, 2.3, -1.2, 10);
  g.add(stack);
  g.add(cyl(0.09, 0.1, matSteelDark(), -1.05, 3.3, -1.2, 10));

  if (variant === 'cargo') {
    const bed = chamferBox(4.0, 0.16, 2.4, 0.03, matSteelDark());
    bed.position.set(1.3, 0.86, 0);
    g.add(bed);
    for (const sz of [-1, 1]) {
      g.add(box(4.0, 0.7, 0.1, bodyMat, 1.3, 1.28, sz * 1.2));
    }
    g.add(box(0.1, 0.7, 2.4, bodyMat, 3.3, 1.28, 0));
    // Tilt frame and canvas
    for (let i = 0; i < 5; i++) {
      const hoop = new THREE.Mesh(SHARED.torus, matSteel());
      hoop.scale.set(1.2, 1.2, 1);
      hoop.rotation.y = Math.PI / 2;
      hoop.position.set(-0.5 + i * 0.95, 1.62, 0);
      g.add(hoop);
    }
    const canvasMat = new THREE.MeshStandardMaterial({ color: 0x4e563e, roughness: 0.96, metalness: 0 });
    const tilt = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 4.0, 14, 1, true, 0, Math.PI), canvasMat);
    tilt.rotation.z = Math.PI / 2;
    tilt.position.set(1.3, 1.62, 0);
    g.add(tilt);
    // Cargo: crates and drums under the tilt
    for (let i = 0; i < 3; i++) {
      const cr = equipmentCase(0.8, 0.6, 0.7, matSandArmour());
      cr.position.set(0.2 + i * 0.9, 1.24, rng.float(-0.5, 0.5));
      cr.rotation.y = rng.float(-0.3, 0.3);
      g.add(cr);
    }
  } else if (variant === 'reload') {
    // Crane-equipped reload vehicle
    const deck = box(4.2, 0.18, 2.5, matSteelDark(), 1.3, 0.88, 0);
    g.add(deck);
    const craneBase = cyl(0.42, 0.7, matGrayArmour(), -0.3, 1.3, 0, 12);
    g.add(craneBase);
    const craneRot = new THREE.Group();
    craneRot.position.set(-0.3, 1.6, 0);
    g.add(craneRot);
    const boom1 = box(0.3, 0.34, 3.2, matHazard(), 0, 0.4, 1.3);
    boom1.rotation.x = -0.45;
    craneRot.add(boom1);
    const boom2 = box(0.22, 0.24, 2.4, matHazard(), 0, 1.35, 3.0);
    boom2.rotation.x = -0.1;
    craneRot.add(boom2);
    craneRot.add(cable([
      new THREE.Vector3(0, 1.5, 4.1), new THREE.Vector3(0, 0.9, 4.1),
    ], 0.012, cableMaterial('#2a2a2a')));
    const hook = box(0.12, 0.24, 0.1, matSteel(), 0, 0.8, 4.1);
    craneRot.add(hook);
    craneRot.rotation.y = 0.5;
    // Spare canister on the deck
    const spare = chamferBox(0.9, 0.9, 3.4, 0.06, matSandArmour());
    spare.position.set(2.1, 1.4, 0.6);
    g.add(spare);
    for (const sz of [-1.1, 1.1]) {
      const band = box(0.94, 0.94, 0.1, matHazard(), 2.1, 1.4, 0.6 + sz);
      g.add(band);
    }
    for (const sx of [-1, 1]) {
      const strap = box(1.0, 0.06, 0.1, matSteelDark(), 2.1 + sx * 0.42, 1.87, 0.6);
      g.add(strap);
    }
  }

  // Wheels: three axles
  for (const [ax, r] of [[-3.0, 0.62], [1.2, 0.62], [2.7, 0.62]]) {
    for (const sz of [-1, 1]) {
      const w = wheel(r, 0.4);
      w.position.set(ax, r, sz * 1.12);
      g.add(w);
      g.add(box(0.5, 0.14, 0.5, matSteelDark(), ax, r + 0.02, sz * 0.8));
    }
    // Mudflaps
    for (const sz of [-1, 1]) {
      g.add(box(0.06, 0.4, 0.5, matRubber(), ax + 0.7, 0.4, sz * 1.12));
    }
  }
  // Roof beacon
  const beacon = warningLamp('#ffb028', 0.07, 2.6);
  beacon.position.set(-2.1, 2.42, 0.7);
  g.add(beacon);

  const colliders = [boxCollider(0, 0, 3.6, 1.4, 2.6)];
  return { group: g, colliders, beacon };
}

// ===========================================================================
// Floodlight mast
// ===========================================================================

export function buildFloodlightMast({ height = 9, heads = 4, aim = new THREE.Vector3(0, 0, 0) } = {}) {
  const g = new THREE.Group();
  const colliders = [cylCollider(0, 0, 0.5, height)];

  // Ballasted base
  g.add(box(1.8, 0.3, 1.8, matSteelDark(), 0, 0.15, 0));
  g.add(flangeBolts(8, 0.42, 0.03, 0.32, matSteel()));
  const pole = cyl(0.13, height, matGrayArmour(), 0, height / 2, 0, 10);
  g.add(pole);
  // Tapered upper section and cable conduit
  g.add(cyl(0.1, height * 0.3, matGrayArmour(), 0, height * 0.9, 0, 8));
  g.add(cyl(0.03, height * 0.92, cableMaterial('#1a1a1a'), 0.15, height * 0.46, 0, 5));
  // Guy wires
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(cable([
      new THREE.Vector3(0, height * 0.72, 0),
      new THREE.Vector3(Math.cos(a) * 2.6, 0.1, Math.sin(a) * 2.6),
    ], 0.012, cableMaterial('#2c2c2c'), 2, 4));
  }

  const crossbar = box(2.6, 0.12, 0.12, matSteelDark(), 0, height, 0);
  g.add(crossbar);
  const lampHeads = [];
  const spots = [];
  for (let i = 0; i < heads; i++) {
    const head = floodlightHead('#fff2d0', 0.52);
    const x = -1.1 + (i / Math.max(1, heads - 1)) * 2.2;
    head.position.set(x, height - 0.25, 0);
    const dir = new THREE.Vector3().copy(aim).sub(new THREE.Vector3(x, height, 0));
    head.lookAt(head.position.clone().add(dir));
    g.add(head);
    lampHeads.push(head);
  }
  const beacon = warningLamp('#ff3b30', 0.06, 3);
  beacon.position.set(0, height + 0.2, 0);
  g.add(beacon);

  return { group: g, colliders, lampHeads, spots, beacon, height };
}

// ===========================================================================
// Antenna farm and misc site kit
// ===========================================================================

export function buildAntennaFarm(seed = 3) {
  const g = new THREE.Group();
  const rng = new Random(seed);
  const colliders = [];
  const masts = [];
  for (let i = 0; i < 4; i++) {
    const h = rng.float(6, 11);
    const mast = antennaMast(h);
    const x = rng.float(-6, 6), z = rng.float(-4, 4);
    mast.position.set(x, 0, z);
    g.add(mast);
    g.add(box(0.9, 0.24, 0.9, matSteelDark(), x, 0.12, z));
    masts.push(mast);
    colliders.push(cylCollider(x, z, 0.45, h));
    // Guy wires
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + i;
      g.add(cable([
        new THREE.Vector3(x, h * 0.8, z),
        new THREE.Vector3(x + Math.cos(a) * h * 0.42, 0.1, z + Math.sin(a) * h * 0.42),
      ], 0.01, cableMaterial('#333'), 2, 4));
    }
  }
  // Interconnect shelter and cable tray
  const cabinet = chamferBox(1.6, 1.9, 1.1, 0.05, matGrayArmour());
  cabinet.position.set(0, 0.95, 4.6);
  g.add(cabinet);
  const cabGrille = grille(1.2, 0.7, 6);
  cabGrille.position.set(0, 1.1, 5.17);
  g.add(cabGrille);
  colliders.push(boxCollider(0, 4.6, 0.9, 0.7, 1.9));
  const tray = cableTray(5.0, matSteelDark());
  tray.position.set(0, 0, 2.2);
  tray.rotation.y = Math.PI / 2;
  g.add(tray);
  const lamp = warningLamp('#39ff9e', 0.04, 2.4);
  lamp.position.set(0.6, 1.7, 5.18);
  g.add(lamp);
  return { group: g, colliders, masts, lamp };
}

/** Sweeping searchlight used for the night scenario. */
export function buildSearchlight({ height = 5.2 } = {}) {
  const g = new THREE.Group();
  g.add(box(1.4, 0.26, 1.4, matSteelDark(), 0, 0.13, 0));
  g.add(cyl(0.12, height, matGrayArmour(), 0, height / 2, 0, 10));
  const yaw = new THREE.Group();
  yaw.position.y = height;
  yaw.userData.noMerge = true;
  g.add(yaw);
  const pitch = new THREE.Group();
  yaw.add(pitch);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.75, 20, 1, true), matGrayArmour());
  drum.rotation.x = Math.PI / 2;
  pitch.add(drum);
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a18, emissive: 0xfff4d8, emissiveIntensity: 3.2,
    roughness: 0.2, metalness: 0.1,
  });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), lensMat);
  lens.position.z = 0.38;
  pitch.add(lens);
  pitch.add(cyl(0.66, 0.08, matSteelDark(), 0, 0, 0.36, 20).rotateX(Math.PI / 2));
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), matGrayArmour());
  back.rotation.x = Math.PI / 2;
  back.position.z = -0.36;
  pitch.add(back);
  // Handles and cabling
  pitch.add(cyl(0.02, 0.5, matSteelDark(), 0.6, 0, -0.1, 5));
  g.add(saggingCable(
    new THREE.Vector3(0.1, height - 0.3, 0.1),
    new THREE.Vector3(0.4, 0.2, 0.6), 0.4, 0.03, cableMaterial('#141414'),
  ));

  const spot = new THREE.SpotLight(0xfff4d8, 0, 900, 0.14, 0.55, 1.2);
  spot.position.set(0, 0, 0.4);
  const target = new THREE.Object3D();
  target.position.set(0, 0, 40);
  pitch.add(spot);
  pitch.add(target);
  spot.target = target;

  // Visible beam cone (additive, fades along length)
  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xfff0d0) },
      uOpacity: { value: 0.0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vViewPos;
      varying vec3 vNormalView;
      void main() {
        vUv = uv;
        vNormalView = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vViewPos;
      varying vec3 vNormalView;
      void main() {
        float along = 1.0 - vUv.y;
        float rim = 1.0 - abs(dot(normalize(vNormalView), normalize(-vViewPos)));
        // A high rim power keeps the beam reading as scattered light rather
        // than as the hollow cone it actually is - at low powers the silhouette
        // of the geometry is plainly visible against a dark sky.
        rim = pow(clamp(rim, 0.0, 1.0), 3.2);
        float a = pow(along, 2.4) * (0.06 + rim * 0.85) * uOpacity;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * (0.7 + rim * 0.6), a);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 20, 560, 20, 1, true), beamMat);
  beam.geometry.translate(0, -280, 0);
  beam.rotation.x = -Math.PI / 2;
  beam.position.z = 0.4;
  beam.frustumCulled = false;
  beam.userData.noMerge = true;
  pitch.add(beam);

  optimizeStatic(pitch);
  pitch.userData.noMerge = true;
  optimizeStatic(yaw);

  return {
    group: g, colliders: [cylCollider(0, 0, 0.55, height)],
    yaw, pitch, spot, lens, lensMat, beam, beamMat,
  };
}

// ===========================================================================
// Ground infrastructure: pads, roads, barriers, fencing
// ===========================================================================

/**
 * Weather a concrete slab: sand drifting in from the edges, dark service
 * staining, and broad tonal drift across the pour.
 *
 * A tiled concrete map alone gives a slab one flat tone with a visible repeat,
 * and a hard sand-to-concrete edge that reads as a decal dropped on the desert.
 * The un-repeated slab UV is recovered by dividing out the map repeat, so this
 * survives the static-merge pass that moves pads out of their own object space.
 */
function addPadWeathering(mat, repU, repV, sandTint = 0x9d8f6f) {
  const macro = macroGround(256, 4);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPadMacro = { value: macro };
    shader.uniforms.uPadRepeat = { value: new THREE.Vector2(repU, repV) };
    shader.uniforms.uPadSand = { value: new THREE.Color(sandTint) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', /* glsl */`
        #include <common>
        uniform sampler2D uPadMacro;
        uniform vec2 uPadRepeat;
        uniform vec3 uPadSand;
      `)
      .replace('#include <color_fragment>', /* glsl */`
        #include <color_fragment>
        {
          vec2 pu = vMapUv / uPadRepeat;
          vec3 mA = texture2D(uPadMacro, pu * 0.85 + 0.31).rgb;
          vec3 mB = texture2D(uPadMacro, pu * 3.1).rgb;
          // Broad drift across the pour, centred so mean albedo is unchanged.
          diffuseColor.rgb *= 1.0 + ((mA.r - 0.5) * 1.1 + (mB.b - 0.5) * 0.6) * 0.42;
          // Service staining: fuel, hydraulic fluid, rubber.
          diffuseColor.rgb *= 1.0 - smoothstep(0.52, 0.84, mB.g) * 0.46;
          // Sand blows in from the edges and never stops. The noise makes the
          // reach of the drift uneven, which is what stops it reading as a
          // vignette painted round the border.
          float border = min(min(pu.x, 1.0 - pu.x), min(pu.y, 1.0 - pu.y));
          float reach = 0.06 + mA.g * 0.22;
          float drift = 1.0 - smoothstep(0.0, reach, border);
          drift *= 0.3 + mB.r * 1.05;
          diffuseColor.rgb = mix(diffuseColor.rgb, uPadSand, clamp(drift, 0.0, 0.95));
        }
      `);
  };
  mat.customProgramCacheKey = () => 'padweather';
  return mat;
}

export function buildConcretePad(w, d, { marking = null, sub = '', seed = 5, kerb = true } = {}) {
  const g = new THREE.Group();
  const conc = concreteMaps(512, seed);
  const mat = new THREE.MeshStandardMaterial({
    map: conc.map.clone(), normalMap: conc.normalMap.clone(), roughnessMap: conc.roughnessMap.clone(),
    roughness: 0.94, metalness: 0.02, color: 0xa8a49c,
  });
  const rep = Math.max(1, Math.round(Math.max(w, d) / 8));
  const repV = rep * (d / w);
  for (const t of [mat.map, mat.normalMap, mat.roughnessMap]) {
    t.repeat.set(rep, repV);
    t.needsUpdate = true;
  }
  addPadWeathering(mat, rep, repV);
  const slab = box(w, 0.24, d, mat, 0, 0.11, 0);
  slab.receiveShadow = true;
  g.add(slab);

  if (kerb) {
    for (const sz of [-1, 1]) {
      g.add(box(w + 0.5, 0.16, 0.25, matHazard(), 0, 0.2, sz * (d / 2 + 0.12)));
    }
    for (const sx of [-1, 1]) {
      g.add(box(0.25, 0.16, d, matHazard(), sx * (w / 2 + 0.12), 0.2, 0));
    }
  }

  if (marking) {
    const decal = new THREE.Mesh(
      SHARED.plane,
      // Lit rather than unlit: painted concrete has to darken at dusk with the
      // slab it sits on, or the stencil floats above the scene at night.
      new THREE.MeshStandardMaterial({
        map: padMarking(marking, { sub }), transparent: true, depthWrite: false,
        roughness: 0.95, metalness: 0.0,
        polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      }),
    );
    // Stencils are painted at a legible walking scale, not stretched across
    // the whole apron, and set back toward one end so the pad stays usable.
    const s = Math.min(Math.min(w, d) * 0.42, 5.5);
    decal.scale.set(s, s, 1);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 0.235, d * 0.5 - s * 0.75);
    decal.renderOrder = 3;
    g.add(decal);
  }
  return { group: g, collider: boxCollider(0, 0, w / 2, d / 2, 0.24) };
}

export function buildRoad(points, width = 7) {
  // Ribbon of gravel following the given ground path.
  const g = new THREE.Group();
  const shape = [];
  const verts = [];
  const uvs = [];
  const idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const side = new THREE.Vector3();
  let arc = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    dir.subVectors(b, a).setY(0).normalize();
    side.crossVectors(up, dir).normalize().multiplyScalar(width / 2);
    if (i > 0) arc += points[i].distanceTo(points[i - 1]);
    verts.push(p.x - side.x, 0.045, p.z - side.z);
    verts.push(p.x + side.x, 0.045, p.z + side.z);
    uvs.push(0, arc / width, 1, arc / width);
    if (i < points.length - 1) {
      const o = i * 2;
      idx.push(o, o + 1, o + 3, o, o + 3, o + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = matGravel();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  g.add(mesh);
  return { group: g };
}

export function buildPerimeter({ radius = 152, posts = 72, gateAngle = Math.PI / 2 } = {}) {
  const g = new THREE.Group();
  const colliders = [];
  const postMat = matSteelDark();
  const height = 2.6;
  const fenceMat = matFence();
  const gateHalfWidth = 0.14; // radians

  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, height, 6);
  const postInst = new THREE.InstancedMesh(postGeo, postMat, posts);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  let pi = 0;
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    let d = Math.abs(a - gateAngle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < gateHalfWidth) continue;
    v.set(Math.cos(a) * radius, height / 2, Math.sin(a) * radius);
    m.compose(v, q, s);
    postInst.setMatrixAt(pi++, m);
  }
  postInst.count = pi;
  postInst.instanceMatrix.needsUpdate = true;
  postInst.castShadow = true;
  g.add(postInst);

  // Mesh panels between posts, merged into a single alpha-tested draw call.
  const panelGeos = [];
  const tmp = new THREE.Object3D();
  for (let i = 0; i < posts; i++) {
    const a0 = (i / posts) * Math.PI * 2;
    const a1 = ((i + 1) / posts) * Math.PI * 2;
    let d = Math.abs((a0 + a1) / 2 - gateAngle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < gateHalfWidth) continue;
    const p0 = new THREE.Vector3(Math.cos(a0) * radius, 0, Math.sin(a0) * radius);
    const p1 = new THREE.Vector3(Math.cos(a1) * radius, 0, Math.sin(a1) * radius);
    const len = p0.distanceTo(p1);
    const geo = new THREE.PlaneGeometry(len, height * 0.86);
    tmp.position.copy(p0).lerp(p1, 0.5).setY(height * 0.5);
    tmp.lookAt(0, height * 0.5, 0);
    tmp.updateMatrix();
    geo.applyMatrix4(tmp.matrix);
    panelGeos.push(geo);
    colliders.push(boxCollider(tmp.position.x, tmp.position.z, len / 2, 0.12, height,
      Math.atan2(-tmp.position.x, -tmp.position.z) + Math.PI / 2));
  }
  if (panelGeos.length) {
    const mergedPanels = BufferGeometryUtils.mergeGeometries(panelGeos);
    panelGeos.forEach((x) => x.dispose());
    g.add(new THREE.Mesh(mergedPanels, fenceMat));
  }

  // Barbed wire: three strands on angled arms
  const wireMat = cableMaterial('#4a4a48', 0.7);
  for (let k = 0; k < 3; k++) {
    const r = radius + 0.1 + k * 0.14;
    const y = height + 0.12 + k * 0.11;
    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y + Math.sin(a * 20) * 0.015, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.014, 4, true), wireMat);
    g.add(wire);
  }

  // Gate: two leaves, one swung open
  const gx = Math.cos(gateAngle) * radius, gz = Math.sin(gateAngle) * radius;
  const gateGroup = new THREE.Group();
  gateGroup.position.set(gx, 0, gz);
  gateGroup.lookAt(0, 0, 0);
  for (const sx of [-1, 1]) {
    const post = cyl(0.1, height + 0.5, matSteelDark(), sx * 4.2, (height + 0.5) / 2, 0, 8);
    gateGroup.add(post);
  }
  const leaf = new THREE.Group();
  const leafFrame = trussPanel(4.0, height * 0.9, 4, 0.07, matSteel());
  leafFrame.position.set(2.0, height * 0.5, 0);
  leaf.add(leafFrame);
  const leafMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.0, height * 0.86), fenceMat);
  leafMesh.position.set(2.0, height * 0.5, 0);
  leaf.add(leafMesh);
  leaf.position.set(-4.2, 0, 0);
  leaf.rotation.y = -1.1;
  gateGroup.add(leaf);
  const leaf2 = leaf.clone();
  leaf2.position.set(4.2, 0, 0);
  leaf2.rotation.y = Math.PI + 1.1;
  gateGroup.add(leaf2);
  // Guard post and signage
  const guard = chamferBox(1.6, 2.3, 1.6, 0.06, matSandArmour());
  guard.position.set(-6.6, 1.15, -2.2);
  gateGroup.add(guard);
  gateGroup.add(box(1.2, 0.7, 0.06, matGlass(), -6.6, 1.6, -1.42));
  const sign = new THREE.Mesh(SHARED.plane, new THREE.MeshStandardMaterial({
    map: padMarking('RESTRICTED', { sub: 'FICTIONAL RANGE', frame: true }),
    transparent: true, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide,
  }));
  sign.scale.set(1.5, 1.5, 1);
  sign.position.set(-5.2, 1.6, 0.3);
  gateGroup.add(sign);
  g.add(gateGroup);

  return { group: g, colliders, gateAnchor: new THREE.Vector3(gx, 0, gz) };
}

export function buildBarrierRun(from, to, { height = 1.0, kind = 'jersey' } = {}) {
  const g = new THREE.Group();
  const colliders = [];
  const dir = new THREE.Vector3().subVectors(to, from).setY(0);
  const len = dir.length();
  dir.normalize();
  const seg = kind === 'jersey' ? 3.0 : 4.0;
  const n = Math.max(1, Math.floor(len / seg));
  const rot = Math.atan2(dir.x, dir.z);
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector3().copy(from).addScaledVector(dir, (i + 0.5) * (len / n));
    let piece;
    if (kind === 'jersey') {
      piece = jerseyBarrier(len / n - 0.08, matConcrete());
      piece.scale.y = height;
    } else {
      piece = barrierBlock(len / n - 0.1, height, 1.1, matSandArmour());
    }
    piece.position.copy(p);
    piece.rotation.y = rot + Math.PI / 2;
    g.add(piece);
    colliders.push(boxCollider(p.x, p.z, (len / n) / 2, 0.6, height, rot + Math.PI / 2));
  }
  return { group: g, colliders };
}

/** Cluster of loose site kit: cases, drums, pallets, a spool, a cone or two. */
export function buildEquipmentCluster(seed = 7) {
  const g = new THREE.Group();
  const rng = new Random(seed);
  const colliders = [];
  const n = rng.int(3, 6);
  for (let i = 0; i < n; i++) {
    const kind = rng.int(0, 4);
    const x = rng.float(-3, 3), z = rng.float(-2.4, 2.4);
    if (kind === 0) {
      const c = equipmentCase(rng.float(0.7, 1.4), rng.float(0.5, 0.9), rng.float(0.6, 1.0),
        rng.bool() ? matOliveArmour() : matSandArmour());
      c.position.set(x, 0.45, z);
      c.rotation.y = rng.float(0, 3.14);
      g.add(c);
    } else if (kind === 1) {
      const drum = cyl(0.29, 0.88, rng.bool() ? matHazard() : matGrayArmour(), x, 0.44, z, 14);
      g.add(drum);
      g.add(cyl(0.3, 0.05, matSteelDark(), x, 0.74, z, 14));
      g.add(cyl(0.3, 0.05, matSteelDark(), x, 0.2, z, 14));
    } else if (kind === 2) {
      const pallet = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        pallet.add(box(1.2, 0.08, 0.14, matWhitePaint(), 0, 0.1, -0.4 + k * 0.4));
      }
      pallet.add(box(1.2, 0.06, 1.0, matWhitePaint(), 0, 0.17, 0));
      pallet.position.set(x, 0, z);
      pallet.rotation.y = rng.float(0, 3.14);
      g.add(pallet);
    } else if (kind === 3) {
      // Cable spool
      const spool = new THREE.Group();
      for (const sx of [-1, 1]) {
        spool.add(cyl(0.55, 0.06, matWhitePaint(), sx * 0.28, 0, 0, 16).rotateZ(Math.PI / 2));
      }
      const wound = cyl(0.4, 0.5, cableMaterial('#1b1b1b'), 0, 0, 0, 18);
      wound.rotation.z = Math.PI / 2;
      spool.add(wound);
      spool.position.set(x, 0.55, z);
      spool.rotation.y = rng.float(0, 3.14);
      g.add(spool);
    } else {
      const c = cone(0.22, 0.62, matHazardRed());
      c.position.set(x, 0.31, z);
      g.add(c);
      g.add(box(0.44, 0.04, 0.44, matHazardRed(), x, 0.02, z));
    }
  }
  return { group: g, colliders };
}
