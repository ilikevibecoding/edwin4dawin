/**
 * CH1 — Detroit PD interrogation room.
 *
 * A 4.6 x 4.4 m box with a 3 m ceiling. The whole set is built to make one
 * lighting idea work: a hard pool of white over the table with everything
 * outside it falling away to near-black, so a face can be pushed in and out of
 * darkness just by moving the actor 30 cm.
 *
 * The mirror wall has a genuine aperture with an observation booth behind it,
 * so `cam.mirror` and the observer mark both look through real geometry.
 */
import * as THREE from 'three';
import type { Stage } from '../engine/Stage';
import { Rng } from '../engine/Noise';
import { radialAlphaTexture, screenTexture } from '../engine/Textures';
import { mark, type ClueSpec, type Mark, type SceneBuild } from './SceneTypes';
import {
  Batch,
  Disposal,
  additive,
  at,
  box,
  ceilingCamera,
  cyl,
  detailScale,
  doorway,
  emitter,
  halo,
  lightCone,
  liveEmitter,
  mat,
  paint,
  plane,
  radialSegs,
  steelChair,
  steelTable,
  type MatOpts,
} from './Props';

const HX = 2.3; // inner half-width  (x)
const HZ = 2.2; // inner half-depth  (z)
const CEIL = 3.0;
const WALL = 0.22;
const BOOTH_BACK = -4.95;

function facing(from: THREE.Vector3Like, to: THREE.Vector3Like): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function buildInterrogationScene(stage: Stage): SceneBuild {
  const root = new THREE.Group();
  root.name = 'interrogation';
  const rng = new Rng(88213);
  const opts: MatOpts = { tier: stage.tier };
  const detail = detailScale(stage.tier);
  const segs = radialSegs(stage.tier, 16);
  const batch = new Batch();
  const disposal = new Disposal();

  const mFloor = mat.tiles(opts, 5, 6, [0.4, 0.42, 0.41]);
  const mWall = mat.plaster(opts, [0.42, 0.44, 0.43], 2.2);
  const mCeil = mat.plaster(opts, [0.5, 0.51, 0.5], 2);
  const mAcoustic = mat.acoustic(opts, 4);
  const mSteel = mat.brushed(opts, 1.2);
  const mDark = paint(0x0a0b0d, 0.94);
  const mSkirt = paint(0x1c1e21, 0.6, 0.15);

  // -------------------------------------------------------------------------
  // Shell
  // -------------------------------------------------------------------------
  batch.add(mFloor, box(HX * 2, 0.2, HZ * 2, 0, -0.1, 0), false, true);
  batch.add(mCeil, box(HX * 2 + WALL * 2, 0.2, HZ * 2 + WALL * 2, 0, CEIL + 0.1, 0), false, true);

  // +Z wall, split around the door
  const doorX = 1.15;
  const doorW = 0.96;
  const doorH = 2.1;
  const zWallC = HZ + WALL / 2;
  batch.add(mWall, box(HX * 2 - (doorX - doorW / 2 + HX), CEIL, WALL, -HX + (HX + doorX - doorW / 2) / 2, CEIL / 2, zWallC));
  batch.add(mWall, box(HX - (doorX + doorW / 2), CEIL, WALL, (doorX + doorW / 2 + HX) / 2, CEIL / 2, zWallC));
  batch.add(mWall, box(doorW, CEIL - doorH, WALL, doorX, (CEIL + doorH) / 2, zWallC));
  // -Z wall
  batch.add(mWall, box(HX * 2, CEIL, WALL, 0, CEIL / 2, -HZ - WALL / 2));
  // +X wall
  batch.add(mWall, box(WALL, CEIL, HZ * 2 + WALL * 2, HX + WALL / 2, CEIL / 2, 0));

  // -X wall: pieces around the one-way mirror aperture
  const apZ = 1.42;
  const apY0 = 0.86;
  const apY1 = 2.38;
  const xWallC = -HX - WALL / 2;
  batch.add(mWall, box(WALL, CEIL, HZ + WALL - apZ, xWallC, CEIL / 2, (apZ + HZ + WALL) / 2));
  batch.add(mWall, box(WALL, CEIL, HZ + WALL - apZ, xWallC, CEIL / 2, -(apZ + HZ + WALL) / 2));
  batch.add(mWall, box(WALL, apY0, apZ * 2, xWallC, apY0 / 2, 0));
  batch.add(mWall, box(WALL, CEIL - apY1, apZ * 2, xWallC, (CEIL + apY1) / 2, 0));
  // Aperture reveal
  batch.add(mSkirt, box(WALL, 0.05, apZ * 2, xWallC, apY0 + 0.02, 0));
  batch.add(mSkirt, box(WALL, 0.05, apZ * 2, xWallC, apY1 - 0.02, 0));

  // Skirting board
  for (const g of [
    box(HX * 2, 0.11, 0.03, 0, 0.055, HZ - 0.015),
    box(HX * 2, 0.11, 0.03, 0, 0.055, -HZ + 0.015),
    box(0.03, 0.11, HZ * 2, HX - 0.015, 0.055, 0),
    box(0.03, 0.11, HZ - apZ, -HX + 0.015, 0.055, (apZ + HZ) / 2),
    box(0.03, 0.11, HZ - apZ, -HX + 0.015, 0.055, -(apZ + HZ) / 2),
  ]) {
    batch.add(mSkirt, g, false, true);
  }

  // Perforated acoustic panelling: a dado band on three walls
  const bandY0 = 0.92;
  const bandY1 = 2.44;
  const bandH = bandY1 - bandY0;
  const bandY = (bandY0 + bandY1) / 2;
  batch.add(mAcoustic, box(HX * 2 - 0.02, bandH, 0.035, 0, bandY, HZ - 0.02), false, true);
  batch.add(mAcoustic, box(HX * 2 - 0.02, bandH, 0.035, 0, bandY, -HZ + 0.02), false, true);
  batch.add(mAcoustic, box(0.035, bandH, HZ * 2 - 0.02, HX - 0.02, bandY, 0), false, true);
  // Trim strips top and bottom of the band
  for (const y of [bandY0 - 0.02, bandY1 + 0.02]) {
    batch.add(mSkirt, box(HX * 2, 0.04, 0.05, 0, y, HZ - 0.025), false, true);
    batch.add(mSkirt, box(HX * 2, 0.04, 0.05, 0, y, -HZ + 0.025), false, true);
    batch.add(mSkirt, box(0.05, 0.04, HZ * 2, HX - 0.025, y, 0), false, true);
  }

  // Floor drain, because these rooms get hosed down
  batch.add(mSteel, at(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 12), -1.55, 0.005, 1.5), false, true);
  for (let i = 0; i < 5; i++) batch.add(mSteel, box(0.2, 0.025, 0.012, -1.55, 0.014, 1.5 - 0.08 + i * 0.04), false, true);

  // -------------------------------------------------------------------------
  // Observation booth behind the mirror
  // -------------------------------------------------------------------------
  batch.add(mDark, box(HX + WALL - BOOTH_BACK, 0.2, 4.0, (BOOTH_BACK - HX - WALL) / 2, -0.1, 0), false, true);
  batch.add(mDark, box(HX + WALL - BOOTH_BACK, 0.2, 4.0, (BOOTH_BACK - HX - WALL) / 2, CEIL + 0.1, 0), false, true);
  batch.add(mDark, box(0.2, CEIL, 4.0, BOOTH_BACK - 0.1, CEIL / 2, 0), false, true);
  batch.add(mDark, box(HX + WALL - BOOTH_BACK, CEIL, 0.2, (BOOTH_BACK - HX - WALL) / 2, CEIL / 2, 2.1), false, true);
  batch.add(mDark, box(HX + WALL - BOOTH_BACK, CEIL, 0.2, (BOOTH_BACK - HX - WALL) / 2, CEIL / 2, -2.1), false, true);

  // Console under the glass
  const consoleMat = paint(0x1d2126, 0.68, 0.2);
  batch.add(consoleMat, box(0.62, 0.86, 2.5, -3.05, 0.43, 0));
  batch.add(consoleMat, box(0.72, 0.05, 2.6, -3.05, 0.88, 0));
  const boothScreenTex = screenTexture(
    [
      { text: 'CAM 1  REC', size: 22, color: '#4be08a' },
      { text: 'SUBJECT: RK-800', size: 18, color: '#7fd6ff' },
      { text: 'STRESS  62%', size: 18, color: '#ffb45a' },
      { text: '--------------', size: 18, color: '#33607f' },
      { text: 'AUDIO  ON', size: 18, color: '#7fd6ff' },
    ],
    { w: 384, h: 256, bg: '#03080e', grid: true, scan: true }
  );
  const boothScreenMat = additive(boothScreenTex, 0xffffff, 0.55);
  boothScreenMat.side = THREE.FrontSide;
  const boothScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.31), boothScreenMat);
  boothScreen.position.set(-3.28, 1.16, -0.42);
  boothScreen.rotation.set(-0.22, Math.PI / 2, 0, 'YXZ');
  root.add(boothScreen);
  disposal.own(boothScreen.geometry);
  disposal.own(boothScreenMat);
  batch.add(consoleMat, at(box(0.52, 0.36, 0.03, -3.3, 1.16, -0.42, { rx: 0.22 }), 0, 0, 0, { ry: Math.PI / 2 }));
  steelChair(batch, opts, -3.62, 0, 0.12, Math.PI / 2, 0.45);

  // -------------------------------------------------------------------------
  // One-way mirror
  // -------------------------------------------------------------------------
  const mirrorMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a2028,
    roughness: 0.035,
    metalness: 0.55,
    transparent: true,
    opacity: 0.44,
    envMapIntensity: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    side: THREE.DoubleSide,
  });
  disposal.own(mirrorMat);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(apZ * 2 - 0.06, apY1 - apY0 - 0.06), mirrorMat);
  mirror.position.set(-HX + 0.012, (apY0 + apY1) / 2, 0);
  mirror.rotation.y = Math.PI / 2;
  mirror.renderOrder = 1;
  root.add(mirror);
  disposal.own(mirror.geometry);
  // Aluminium surround
  const surround = paint(0x2c3035, 0.34, 0.85);
  batch.add(surround, box(0.06, 0.07, apZ * 2 + 0.1, -HX + 0.03, apY0 - 0.02, 0));
  batch.add(surround, box(0.06, 0.07, apZ * 2 + 0.1, -HX + 0.03, apY1 + 0.02, 0));
  batch.add(surround, box(0.06, apY1 - apY0 + 0.14, 0.07, -HX + 0.03, (apY0 + apY1) / 2, apZ + 0.02));
  batch.add(surround, box(0.06, apY1 - apY0 + 0.14, 0.07, -HX + 0.03, (apY0 + apY1) / 2, -apZ - 0.02));

  // -------------------------------------------------------------------------
  // Furniture
  // -------------------------------------------------------------------------
  steelTable(batch, opts, 0, 0, 0, 1.5, 0.86, 0.75);
  steelChair(batch, opts, 0, 0, -0.98, 0, 0.46);
  steelChair(batch, opts, -0.06, 0, 0.98, Math.PI, 0.46);

  // Case file: folder, loose sheets, a photograph
  const folder = paint(0x9c8a63, 0.86);
  const paper = paint(0xd8d4c8, 0.9);
  batch.add(folder, box(0.3, 0.012, 0.22, 0.46, 0.779, 0.1, { ry: -0.22 }), false, true);
  batch.add(paper, box(0.27, 0.004, 0.19, 0.455, 0.788, 0.11, { ry: -0.17 }), false, true);
  batch.add(paper, box(0.2, 0.003, 0.14, 0.2, 0.777, 0.26, { ry: 0.42 }), false, true);
  batch.add(paint(0x2b2f33, 0.35), box(0.12, 0.003, 0.09, 0.62, 0.779, -0.06, { ry: 0.12 }), false, true);
  // Pen and a plastic cup
  batch.add(paint(0x14161a, 0.4, 0.3), cyl(0.006, 0.006, 0.13, 6, 0.28, 0.78, 0.02, { rz: Math.PI / 2, ry: 0.5 }));
  batch.add(
    new THREE.MeshPhysicalMaterial({ color: 0xdfe6ea, roughness: 0.16, transmission: 0, opacity: 0.55, transparent: true }),
    cyl(0.036, 0.028, 0.1, 12, -0.5, 0.823, 0.16)
  );
  // Ashtray with two stubs
  batch.add(mSteel, at(new THREE.CylinderGeometry(0.07, 0.055, 0.026, 12), -0.42, 0.786, -0.2));
  batch.add(paint(0xd8cdb4, 0.9), cyl(0.007, 0.007, 0.05, 6, -0.43, 0.8, -0.2, { rz: 1.3, ry: 0.4 }));
  batch.add(paint(0xd8cdb4, 0.9), cyl(0.007, 0.007, 0.045, 6, -0.4, 0.8, -0.23, { rz: 1.4, ry: 1.9 }));

  // -------------------------------------------------------------------------
  // Fittings
  // -------------------------------------------------------------------------
  doorway(
    batch,
    paint(0x2a2e33, 0.5, 0.3),
    paint(0x3a4046, 0.55, 0.25),
    doorX,
    0,
    HZ - 0.02,
    Math.PI,
    doorW,
    doorH,
    true,
    additive(null, 0x2a3a4a, 0.5)
  );

  ceilingCamera(batch, opts, HX - 0.24, CEIL - 0.26, -HZ + 0.24, facing(new THREE.Vector3(HX - 0.24, 0, -HZ + 0.24), new THREE.Vector3(0, 0, 0)), -0.55);

  // Wall terminal
  const termTex = screenTexture(
    [
      { text: 'CASE 3417-B', size: 26, color: '#9fe4ff' },
      { text: 'HOMICIDE / DEVIANT', size: 18, color: '#5fb6e0' },
      { text: '', size: 12 },
      { text: 'MODEL   AX400', size: 18, color: '#cfe8ff' },
      { text: 'SERIAL  579 102 694', size: 18, color: '#cfe8ff' },
      { text: 'STATUS  DETAINED', size: 18, color: '#ff8a6a' },
      { text: '', size: 12 },
      { text: '> AWAITING INPUT_', size: 18, color: '#4be08a' },
    ],
    { w: 512, h: 384, bg: '#03080f', grid: true, scan: true }
  );
  const termMat = additive(termTex, 0xffffff, 0.85);
  termMat.side = THREE.FrontSide;
  const terminal = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.4), termMat);
  terminal.position.set(HX - 0.035, 1.52, 0.85);
  terminal.rotation.y = -Math.PI / 2;
  root.add(terminal);
  disposal.own(terminal.geometry);
  disposal.own(termMat);
  batch.add(paint(0x17191d, 0.6), box(0.03, 0.5, 0.66, HX - 0.02, 1.52, 0.85));

  // RECORDING indicator above the mirror
  const recMat = liveEmitter(0xff2418, 4);
  disposal.own(recMat);
  const rec = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), recMat);
  rec.position.set(-HX + 0.07, apY1 + 0.2, 0.62);
  root.add(rec);
  disposal.own(rec.geometry);
  batch.add(paint(0x15171a, 0.7), box(0.06, 0.09, 0.34, -HX + 0.04, apY1 + 0.2, 0.5));
  const recHaloMat = additive(radialAlphaTexture(2, 64), 0xff2418, 0.55);
  const recHalo = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), recHaloMat);
  recHalo.position.set(-HX + 0.09, apY1 + 0.2, 0.62);
  recHalo.rotation.y = Math.PI / 2;
  root.add(recHalo);
  disposal.own(recHalo.geometry);
  disposal.own(recHaloMat);

  // -------------------------------------------------------------------------
  // Ceiling light panels + the hanging lamp
  // -------------------------------------------------------------------------
  const panelSpots: [number, number][] = [
    [-1.05, -1.15],
    [1.05, -1.15],
    [-1.05, 1.15],
    [1.05, 1.15],
  ];
  const panelMat = liveEmitter(0xe8f2ff, 4.5);
  disposal.own(panelMat);
  for (const [px, pz] of panelSpots) {
    batch.add(mCeil, box(1.34, 0.09, 0.58, px, CEIL - 0.045, pz), false, true);
    batch.add(paint(0x22262b, 0.5, 0.4), box(1.3, 0.02, 0.54, px, CEIL - 0.085, pz), false, false);
    batch.add(panelMat, plane(1.16, 0.42, px, CEIL - 0.096, pz, { rx: Math.PI / 2 }), false, false);
  }

  // Conical lamp on a cable over the table
  const lampY = 2.18;
  const shade = paint(0x1a1d21, 0.55, 0.3);
  batch.add(paint(0x0e1013, 0.8), cyl(0.008, 0.008, CEIL - lampY - 0.14, 6, 0, (CEIL + lampY - 0.14) / 2, -0.05));
  batch.add(paint(0x14171b, 0.6), cyl(0.05, 0.05, 0.05, 10, 0, CEIL - 0.025, -0.05));
  batch.add(shade, at(new THREE.CylinderGeometry(0.075, 0.3, 0.28, segs, 1, true), 0, lampY, -0.05));
  batch.add(
    emitter(0xfff1dc, 1.4),
    at(new THREE.CylinderGeometry(0.072, 0.29, 0.27, segs, 1, true), 0, lampY - 0.004, -0.05),
    false,
    false
  );
  const bulbMat = liveEmitter(0xfff4e2, 14);
  disposal.own(bulbMat);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bulbMat);
  bulb.position.set(0, lampY - 0.09, -0.05);
  root.add(bulb);
  disposal.own(bulb.geometry);

  // Visible cone under the shade
  const coneMat = additive(null, 0xffffff, 0.06, true);
  batch.add(
    coneMat,
    at(lightCone(0.3, 1.35, lampY - 0.86, 0xfff0d8, segs), 0, (lampY + 0.86) / 2 - 0.06, -0.05),
    false,
    false
  );
  const haloMat = additive(radialAlphaTexture(2.2, 128), 0xffffff, 0.35, true);
  batch.add(haloMat, halo(0.95, 0xfff0d8, 0, lampY - 0.08, -0.05), false, false);
  batch.add(haloMat, halo(0.95, 0xfff0d8, 0, lampY - 0.08, -0.05, Math.PI / 2), false, false);

  // A handful of dust motes so the cone has something to catch
  const moteMat = additive(radialAlphaTexture(2, 32), 0xfff0d8, 0.14);
  const moteGeos: THREE.BufferGeometry[] = [];
  const moteCount = Math.round(26 * detail);
  for (let i = 0; i < moteCount; i++) {
    const r = rng.range(0, 0.62);
    const a = rng.range(0, Math.PI * 2);
    moteGeos.push(
      plane(0.012, 0.012, Math.cos(a) * r, rng.range(0.85, 2.0), -0.05 + Math.sin(a) * r, { ry: rng.range(0, 3.14) })
    );
  }
  for (const g of moteGeos) batch.add(moteMat, g, false, false);

  const meshes = batch.flush(root, 'interrogation');
  for (const m of meshes) disposal.own(m.geometry);

  // -------------------------------------------------------------------------
  // Lighting
  // -------------------------------------------------------------------------
  const lights: Record<string, THREE.Light> = {};

  // Nothing is ever truly black in here — there is always a little bounce.
  const ambient = new THREE.AmbientLight(0x18211d, 1.5);
  root.add(ambient);
  lights.ambient = ambient;
  const bounce = new THREE.HemisphereLight(0x36424a, 0x121814, 0.7);
  root.add(bounce);
  lights.bounce = bounce;

  // Shadow caster 1: the hanging lamp. This is the shot.
  const key = new THREE.SpotLight(0xfff0d6, 72, 7, 0.66, 0.38, 2);
  key.position.set(0, lampY - 0.06, -0.05);
  key.target.position.set(0, 0, -0.12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 0.25;
  key.shadow.camera.far = 6;
  root.add(key, key.target);
  lights.key = key;

  // Shadow caster 2: one recessed panel, throwing the second set of shadows.
  const panelKey = new THREE.SpotLight(0xdcebff, 58, 8, 1.12, 0.72, 2);
  panelKey.position.set(1.05, CEIL - 0.12, 1.15);
  panelKey.target.position.set(0.2, 0, 0.1);
  panelKey.castShadow = true;
  panelKey.shadow.mapSize.set(1024, 1024);
  panelKey.shadow.bias = -0.0008;
  panelKey.shadow.normalBias = 0.02;
  panelKey.shadow.camera.near = 0.3;
  panelKey.shadow.camera.far = 8;
  root.add(panelKey, panelKey.target);
  lights.panelKey = panelKey;

  // Remaining panels: unshadowed fill, deliberately weaker than the key.
  const fillA = new THREE.PointLight(0xd6e6ff, 30, 6.5, 2);
  fillA.position.set(-1.05, CEIL - 0.16, -1.15);
  root.add(fillA);
  lights.fillA = fillA;
  const fillB = new THREE.PointLight(0xd6e6ff, 24, 6, 2);
  fillB.position.set(-1.05, CEIL - 0.16, 1.15);
  root.add(fillB);
  lights.fillB = fillB;
  const fillC = new THREE.PointLight(0xd6e6ff, 22, 6, 2);
  fillC.position.set(1.05, CEIL - 0.16, -1.15);
  root.add(fillC);
  lights.fillC = fillC;

  // Grazes the mirror wall so the glass and its surround read at all.
  const mirrorWash = new THREE.PointLight(0xc6d8ee, 16, 4.4, 2);
  mirrorWash.position.set(-1.5, 2.42, 0.1);
  root.add(mirrorWash);
  lights.mirrorWash = mirrorWash;

  // Booth: barely there, just enough to read the observer's silhouette.
  const boothLight = new THREE.PointLight(0x6d95c8, 24, 6, 2);
  boothLight.position.set(-3.65, 2.4, 0.1);
  root.add(boothLight);
  lights.booth = boothLight;
  const boothGlow = new THREE.PointLight(0x3f9fd8, 8, 2.6, 2);
  boothGlow.position.set(-3.1, 1.2, -0.42);
  root.add(boothGlow);
  lights.boothGlow = boothGlow;

  const termLight = new THREE.PointLight(0x74c0ff, 5, 2.4, 2);
  termLight.position.set(HX - 0.3, 1.52, 0.85);
  root.add(termLight);
  lights.terminal = termLight;

  // -------------------------------------------------------------------------
  // Marks
  // -------------------------------------------------------------------------
  const suspect = new THREE.Vector3(0, 0, -0.82);
  const detective = new THREE.Vector3(0, 0, 0.82);
  const suspectYaw = facing(suspect, detective); // 0: looks along +Z
  const observer = new THREE.Vector3(-3.5, 0, 0.1);
  const establish = new THREE.Vector3(1.82, 1.9, -1.62);
  const overSuspect = new THREE.Vector3(0.64, 1.46, -1.6);
  const overDetective = new THREE.Vector3(-0.64, 1.46, 1.6);
  const mirrorCam = new THREE.Vector3(-1.86, 1.5, 0.06);
  const suspectHead = new THREE.Vector3(0, 1.3, -0.82);
  const detectiveHead = new THREE.Vector3(0, 1.3, 0.82);

  const marks: Record<string, Mark> = {
    'cam.establish': mark(
      establish.x,
      establish.y,
      establish.z,
      facing(establish, new THREE.Vector3(-0.1, 1.0, 0.35))
    ),
    'cam.overSuspect': mark(overSuspect.x, overSuspect.y, overSuspect.z, facing(overSuspect, detectiveHead)),
    'cam.overDetective': mark(overDetective.x, overDetective.y, overDetective.z, facing(overDetective, suspectHead)),
    'cam.mirror': mark(mirrorCam.x, mirrorCam.y, mirrorCam.z, facing(mirrorCam, new THREE.Vector3(0.1, 1.15, -0.4))),
    'cam.topDown': mark(0, CEIL - 0.26, 0.04, Math.PI),
    'actor.suspect': mark(suspect.x, suspect.y, suspect.z, suspectYaw),
    'actor.detective': mark(detective.x, detective.y, detective.z, suspectYaw + Math.PI),
    'actor.observer': mark(observer.x, observer.y, observer.z, Math.PI / 2),
    'look.suspect': mark(suspectHead.x, suspectHead.y, suspectHead.z, suspectYaw),
    'look.detective': mark(detectiveHead.x, detectiveHead.y, detectiveHead.z, suspectYaw + Math.PI),
  };

  const clues: ClueSpec[] = [
    {
      id: 'case_file',
      label: 'Case file',
      position: new THREE.Vector3(0.46, 0.8, 0.1),
      detail: 'Report 3417-B. Two pages are missing from the sequence, and the staple has been opened and reset.',
    },
    {
      id: 'suspect_hands',
      label: "Suspect's hands",
      position: new THREE.Vector3(0, 0.82, -0.36),
      detail: 'Synthetic skin retracted across three knuckles. The chassis underneath is scuffed, not cut.',
    },
    {
      id: 'mirror_glass',
      label: 'One-way mirror',
      position: new THREE.Vector3(-HX + 0.02, 1.62, 0),
      detail: 'Half-silvered. Two heat signatures in the booth behind it — one of them has not moved in nine minutes.',
    },
  ];

  // -------------------------------------------------------------------------
  // Animation
  // -------------------------------------------------------------------------
  const update = (_dt: number, elapsed: number) => {
    // RECORDING pulses on a slow one-second cadence.
    const blink = elapsed % 1.6 < 0.9 ? 1 : 0.06;
    recMat.emissiveIntensity = 4 * blink;
    recHaloMat.opacity = 0.55 * blink;
    // Mains hum in the fluorescent panels, plus a rare dropout.
    const hum = 1 + Math.sin(elapsed * 37) * 0.02 + Math.sin(elapsed * 11.3) * 0.012;
    const dropout = Math.sin(elapsed * 0.61) * Math.sin(elapsed * 2.17) > 0.985 ? 0.35 : 1;
    panelMat.emissiveIntensity = 4.5 * hum * dropout;
    panelKey.intensity = 58 * hum * dropout;
    fillA.intensity = 30 * hum * dropout;
    fillB.intensity = 24 * hum * dropout;
    fillC.intensity = 22 * hum * dropout;
    // The tungsten bulb breathes very slightly.
    const bulbLevel = 1 + Math.sin(elapsed * 1.9) * 0.015 + Math.sin(elapsed * 6.7) * 0.008;
    bulbMat.emissiveIntensity = 14 * bulbLevel;
    key.intensity = 72 * bulbLevel;
    // Booth monitor refresh
    boothScreenMat.opacity = 0.55 + Math.sin(elapsed * 5.1) * 0.05;
    termMat.opacity = 0.85 + Math.sin(elapsed * 3.3 + 1.2) * 0.04;
  };

  return {
    root,
    sky: 'interiorNight',
    showSkyBackground: false,
    atmosphere: {
      fogColor: new THREE.Color(0x10161a),
      fogColorFar: new THREE.Color(0x161d20),
      density: 0.02,
      heightFalloff: 0.03,
      fogBase: 0,
      noise: 0.3,
    },
    grade: {
      lift: new THREE.Vector3(0.01, 0.018, 0.015),
      gamma: new THREE.Vector3(1.0, 1.0, 0.99),
      gain: new THREE.Vector3(0.97, 1.0, 1.01),
      shadowTint: new THREE.Vector3(0.0, 0.12, 0.07),
      highlightTint: new THREE.Vector3(0.02, 0.045, 0.06),
      saturation: 0.44,
      contrast: 1.3,
      temperature: -0.12,
      bleach: 0.2,
      vignette: 0.52,
    },
    rain: 0,
    shafts: [{ position: new THREE.Vector3(0, lampY - 0.1, -0.05), color: new THREE.Color(0xfff0d6), intensity: 0.2 }],
    marks,
    lights,
    clues,
    cameraBounds: new THREE.Box3(
      new THREE.Vector3(-HX + 0.35, 0.6, -HZ + 0.35),
      new THREE.Vector3(HX - 0.35, CEIL - 0.2, HZ - 0.35)
    ),
    update,
    dispose: () => {
      disposal.run();
      root.clear();
    },
  };
}
