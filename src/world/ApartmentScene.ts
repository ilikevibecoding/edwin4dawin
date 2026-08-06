/**
 * CH2 — a small rundown apartment. Night, rain on the windows.
 *
 * Two colour temperatures fight over this room: a warm tungsten pool from the
 * standing lamp and the television, and a cold wash of city light coming
 * through the window wall. The furniture is arranged to leave a clear 2 m
 * playing area between the coffee table and the glass.
 *
 * Room: x = -2.5..2.5, z = -3..3, ceiling 2.6. The window wall is -Z.
 */
import * as THREE from 'three';
import type { Stage } from '../engine/Stage';
import { Rng, fbm2D, hash2, lerp, smoothstep } from '../engine/Noise';
import {
  buildSurface,
  neonSignTexture,
  posterTexture,
  radialAlphaTexture,
  screenTexture,
  type SurfaceFn,
} from '../engine/Textures';
import { mark, type ClueSpec, type Mark, type SceneBuild } from './SceneTypes';
import {
  Batch,
  Disposal,
  additive,
  at,
  bookshelf,
  box,
  buildGlassRain,
  buildSteam,
  buildWindowField,
  coffeeTable,
  cyl,
  detailScale,
  emitter,
  fridge,
  halo,
  kitchenCounter,
  laundryPile,
  liveEmitter,
  mat,
  mug,
  paint,
  paintVC,
  pictureFrame,
  plane,
  radialSegs,
  sink,
  sofa,
  sphere,
  steelChair,
  tint,
  type MatOpts,
  type WindowCell,
} from './Props';

const HX = 2.5;
const HZ = 3.0;
const CEIL = 2.6;
const WALL = 0.16;
const WIN_X0 = -2.05;
const WIN_X1 = 1.15;
const WIN_Y0 = 0.72;
const WIN_Y1 = 2.26;

function facing(from: THREE.Vector3Like, to: THREE.Vector3Like): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** Night skyline for the backdrop plane, written into the emissive channel. */
const cityGlow: SurfaceFn = (u, v, o) => {
  const t = smoothstep(0.36, 1.0, v);
  const cloud = fbm2D(u * 5, v * 5, { octaves: 4, period: 5, seed: 23 });
  let r = lerp(0.16, 0.012, t) * lerp(0.6, 1.5, cloud);
  let g = lerp(0.1, 0.016, t) * lerp(0.6, 1.4, cloud);
  let b = lerp(0.13, 0.036, t) * lerp(0.7, 1.3, cloud);

  const col = Math.floor(u * 34);
  const top = 0.3 + hash2(col, 3, 71) * 0.36;
  const col2 = Math.floor(u * 15 + 0.37);
  const top2 = 0.24 + hash2(col2, 9, 17) * 0.28;
  const roof = Math.max(top, top2);
  if (v < roof) {
    const near = v < top2 && top2 > top;
    r = near ? 0.004 : 0.008;
    g = near ? 0.005 : 0.01;
    b = near ? 0.009 : 0.017;
    const wx = Math.floor(u * 34 * 6);
    const wy = Math.floor(v * 210);
    if (wx % 2 === 0 && wy % 3 === 0) {
      const lit = hash2(wx, wy, 13);
      if (lit > 0.62) {
        const warm = hash2(wx, wy, 99);
        const lvl = (0.2 + lit * 0.85) * (near ? 0.75 : 1);
        r = lvl * lerp(0.45, 1.0, warm);
        g = lvl * lerp(0.6, 0.82, warm);
        b = lvl * lerp(1.0, 0.55, warm);
      }
    }
  } else if (v < roof + 0.006) {
    r = g = b = 0.02;
  }
  o.er = r;
  o.eg = g;
  o.eb = b;
  o.r = 0;
  o.g = 0;
  o.b = 0;
  o.h = 0.5;
  o.rough = 1;
};

/** Rows of block glyphs; four of these cycled gives believable CRT snow. */
function staticFrame(rng: Rng, rows: number): { text: string; size?: number; color?: string }[] {
  const glyphs = ['\u2588', '\u2593', '\u2592', '\u2591', ' ', ' '];
  const out: { text: string; size?: number; color?: string }[] = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < 26; c++) line += rng.pick(glyphs);
    const v = Math.round(rng.range(110, 215));
    out.push({ text: line, size: 19, color: `rgb(${v},${v + 6},${v + 14})` });
  }
  return out;
}

export function buildApartmentScene(stage: Stage): SceneBuild {
  const root = new THREE.Group();
  root.name = 'apartment';
  const rng = new Rng(50231);
  const opts: MatOpts = { tier: stage.tier };
  const detail = detailScale(stage.tier);
  const segs = radialSegs(stage.tier, 14);
  const batch = new Batch();
  const disposal = new Disposal();

  const mFloor = mat.wood(opts, 4);
  const mWall = mat.plaster(opts, [0.44, 0.42, 0.39], 2.4);
  const mCeil = mat.plaster(opts, [0.5, 0.49, 0.47], 2);
  const mTrim = paint(0x2e2822, 0.66);
  const mDark = paint(0x080909, 0.95);
  const mSteel = mat.brushed(opts, 1.2);

  // -------------------------------------------------------------------------
  // Shell
  // -------------------------------------------------------------------------
  batch.add(mFloor, box(HX * 2, 0.2, HZ * 2, 0, -0.1, 0), false, true);
  batch.add(mCeil, box(HX * 2 + WALL * 2, 0.2, HZ * 2 + WALL * 2, 0, CEIL + 0.1, 0), false, true);
  batch.add(mWall, box(WALL, CEIL, HZ * 2 + WALL * 2, HX + WALL / 2, CEIL / 2, 0));
  batch.add(mWall, box(WALL, CEIL, HZ * 2 + WALL * 2, -HX - WALL / 2, CEIL / 2, 0));

  // +Z wall, split around the doorway to the hall
  const doorX = -1.75;
  const doorW = 0.94;
  const doorH = 2.06;
  const zWallC = HZ + WALL / 2;
  batch.add(mWall, box(doorX - doorW / 2 + HX, CEIL, WALL, (-HX + doorX - doorW / 2) / 2, CEIL / 2, zWallC));
  batch.add(mWall, box(HX - doorX - doorW / 2, CEIL, WALL, (doorX + doorW / 2 + HX) / 2, CEIL / 2, zWallC));
  batch.add(mWall, box(doorW, CEIL - doorH, WALL, doorX, (CEIL + doorH) / 2, zWallC));

  // -Z window wall, split around the opening
  const nWallC = -HZ - WALL / 2;
  batch.add(mWall, box(WIN_X0 + HX, CEIL, WALL, (-HX + WIN_X0) / 2, CEIL / 2, nWallC));
  batch.add(mWall, box(HX - WIN_X1, CEIL, WALL, (WIN_X1 + HX) / 2, CEIL / 2, nWallC));
  batch.add(mWall, box(WIN_X1 - WIN_X0, WIN_Y0, WALL, (WIN_X0 + WIN_X1) / 2, WIN_Y0 / 2, nWallC));
  batch.add(mWall, box(WIN_X1 - WIN_X0, CEIL - WIN_Y1, WALL, (WIN_X0 + WIN_X1) / 2, (CEIL + WIN_Y1) / 2, nWallC));

  // Skirting and picture rail
  for (const g of [
    box(HX * 2, 0.12, 0.025, 0, 0.06, HZ - 0.012),
    box(0.025, 0.12, HZ * 2, HX - 0.012, 0.06, 0),
    box(0.025, 0.12, HZ * 2, -HX + 0.012, 0.06, 0),
    box(WIN_X0 + HX, 0.12, 0.025, (-HX + WIN_X0) / 2, 0.06, -HZ + 0.012),
    box(HX - WIN_X1, 0.12, 0.025, (WIN_X1 + HX) / 2, 0.06, -HZ + 0.012),
  ]) {
    batch.add(mTrim, g, false, true);
  }

  // Hall behind the doorway, kept almost black
  batch.add(mDark, box(2.0, CEIL, 0.2, doorX, CEIL / 2, HZ + 1.5), false, true);
  batch.add(mDark, box(0.2, CEIL, 1.6, doorX - 1.0, CEIL / 2, HZ + 0.8), false, true);
  batch.add(mDark, box(0.2, CEIL, 1.6, doorX + 1.0, CEIL / 2, HZ + 0.8), false, true);
  batch.add(mDark, box(2.0, 0.2, 1.6, doorX, CEIL + 0.1, HZ + 0.8), false, true);
  batch.add(mFloor, box(2.0, 0.2, 1.6, doorX, -0.1, HZ + 0.8), false, true);
  // Door frame and a panel standing ajar
  batch.add(mTrim, box(0.07, doorH + 0.07, WALL + 0.04, doorX - doorW / 2 - 0.035, (doorH + 0.07) / 2, zWallC));
  batch.add(mTrim, box(0.07, doorH + 0.07, WALL + 0.04, doorX + doorW / 2 + 0.035, (doorH + 0.07) / 2, zWallC));
  batch.add(mTrim, box(doorW + 0.14, 0.07, WALL + 0.04, doorX, doorH + 0.035, zWallC));
  const doorPanel = paint(0x574c40, 0.7);
  batch.add(
    doorPanel,
    at(box(doorW, doorH, 0.04, doorW / 2 - 0.02, doorH / 2, 0), doorX - doorW / 2, 0, HZ - 0.04, { ry: -0.95 })
  );

  // -------------------------------------------------------------------------
  // Window: frame, glass, running rain
  // -------------------------------------------------------------------------
  const winW = WIN_X1 - WIN_X0;
  const winH = WIN_Y1 - WIN_Y0;
  const winCX = (WIN_X0 + WIN_X1) / 2;
  const winCY = (WIN_Y0 + WIN_Y1) / 2;
  const frameMat = paint(0x312b24, 0.62);
  batch.add(frameMat, box(winW + 0.1, 0.09, 0.2, winCX, WIN_Y0 - 0.03, -HZ + 0.02), false, true);
  batch.add(frameMat, box(winW + 0.1, 0.08, 0.16, winCX, WIN_Y1 + 0.02, -HZ + 0.01));
  batch.add(frameMat, box(0.08, winH, 0.16, WIN_X0 - 0.02, winCY, -HZ + 0.01));
  batch.add(frameMat, box(0.08, winH, 0.16, WIN_X1 + 0.02, winCY, -HZ + 0.01));
  batch.add(frameMat, box(0.07, winH, 0.12, winCX - 0.55, winCY, -HZ + 0.01));
  batch.add(frameMat, box(0.07, winH, 0.12, winCX + 0.55, winCY, -HZ + 0.01));
  batch.add(frameMat, box(winW, 0.06, 0.1, winCX, winCY + 0.26, -HZ + 0.01));
  // Inside sill
  batch.add(mTrim, box(winW + 0.22, 0.05, 0.2, winCX, WIN_Y0 - 0.015, -HZ + 0.12), false, true);

  const paneMat = new THREE.MeshPhysicalMaterial({
    color: 0xaebfd0,
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.13,
    envMapIntensity: 1.4,
    side: THREE.DoubleSide,
  });
  disposal.own(paneMat);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), paneMat);
  pane.position.set(winCX, winCY, -HZ + 0.01);
  pane.renderOrder = 1;
  root.add(pane);
  disposal.own(pane.geometry);

  const glassRain = buildGlassRain(winW, winH, 0.42, 0xa8c8ff);
  glassRain.mesh.position.set(winCX, winCY, -HZ + 0.028);
  glassRain.mesh.renderOrder = 3;
  root.add(glassRain.mesh);
  disposal.own(glassRain);

  // Condensation haze at the corners of the pane
  const hazeMat = additive(radialAlphaTexture(1.4, 64), 0x9fc0e8, 0.1);
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(winW * 0.9, winH * 0.9), hazeMat);
  haze.position.set(winCX, winCY, -HZ + 0.032);
  root.add(haze);
  disposal.own(haze.geometry);
  disposal.own(hazeMat);

  // -------------------------------------------------------------------------
  // What is outside
  // -------------------------------------------------------------------------
  const glowMaps = buildSurface('apartment.cityGlow', cityGlow, { size: 512, emissive: true, normalStrength: 0.1 });
  const backdropMat = new THREE.MeshBasicMaterial({
    map: glowMaps.emissiveMap,
    toneMapped: true,
    depthWrite: false,
    fog: false,
  });
  backdropMat.color.setRGB(1.5, 1.5, 1.7);
  disposal.own(backdropMat);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(110, 46), backdropMat);
  backdrop.position.set(0, 7, -38);
  root.add(backdrop);
  disposal.own(backdrop.geometry);

  // Mid-ground blocks give the view parallax the flat backdrop cannot.
  const outerCells: WindowCell[] = [];
  const mBlock = mat.concrete(opts, 5);
  const outerBlocks: [number, number, number, number][] = [
    [-9.5, -13.5, 13, 7],
    [-1.5, -17.5, 21, 9],
    [7.5, -12.5, 11.5, 6.5],
    [15, -21, 24, 10],
    [-17, -22, 17, 9],
  ];
  for (const [bx, bz, h, w] of outerBlocks) {
    batch.add(mBlock, box(w, h, 7, bx, h / 2 - 3.2, bz - 3.5), false, false);
    const cols = Math.max(2, Math.floor(w / 2.3));
    const rows = Math.max(2, Math.floor((h - 2) / 2.7));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        outerCells.push({
          center: new THREE.Vector3(
            bx - w / 2 + ((c + 0.5) * w) / cols,
            -3.2 + 1.8 + ((r + 0.5) * (h - 2)) / rows,
            bz + 0.01
          ),
          width: 1.15,
          height: 1.5,
          yaw: 0,
        });
      }
    }
  }
  const outerWindows = buildWindowField(outerCells, new Rng(4477), 1.15);
  root.add(outerWindows.group);

  // Distant signage, mostly to break the window grid up with colour
  const distantNeon: [string, string, number, number, number, number, number, boolean][] = [
    ['SUNG', '#ff3ca8', -4.9, 4.4, -9.9, 1.4, 4.2, true],
    ['KIM', '#3ff2ff', 8.4, 1.9, -8.9, 1.2, 3.0, true],
    ['MOTEL', '#ffab34', -13.8, 3.2, -18.4, 4.6, 1.2, false],
  ];
  const flickerNeon: { material: THREE.MeshBasicMaterial; rate: number; phase: number }[] = [];
  distantNeon.forEach(([text, color, nx, ny, nz, nw, nh, vertical], i) => {
    const tex = neonSignTexture(text, color, { vertical });
    const m = additive(tex, 0xffffff, 0.9);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), m);
    sign.position.set(nx, ny, nz);
    root.add(sign);
    disposal.own(sign.geometry);
    disposal.own(m);
    if (i === 1) flickerNeon.push({ material: m, rate: 5.3, phase: 1.9 });
  });

  // -------------------------------------------------------------------------
  // Living area
  // -------------------------------------------------------------------------
  const rugMat = mat.fabric(opts, [0.21, 0.14, 0.13], 3.4, 40);
  batch.add(rugMat, box(2.42, 0.012, 2.62, 0.75, 0.006, -0.6), false, true);
  batch.add(mat.fabric(opts, [0.28, 0.2, 0.16], 2, 36), box(2.62, 0.008, 2.82, 0.75, 0.004, -0.6), false, true);

  sofa(batch, opts, 2.02, 0, -0.6, -Math.PI / 2, 2.0);
  coffeeTable(batch, opts, 0.86, 0, -0.6, Math.PI / 2, 1.05, 0.58);

  // Coffee table clutter
  mug(batch, 0.7, 0.44, -0.92, 0x6f7c84);
  mug(batch, 0.98, 0.44, -0.3, 0xb0a08a, 1.2);
  const tabletBody = paint(0x14161a, 0.35, 0.4);
  batch.add(tabletBody, box(0.19, 0.008, 0.26, 0.86, 0.446, -0.62, { ry: 0.28 }), false, true);
  const tabletTex = screenTexture(
    [
      { text: 'DETROIT NEWS', size: 22, color: '#9fe4ff' },
      { text: 'ANDROID CURFEW', size: 17, color: '#ffb45a' },
      { text: 'EXTENDED TO', size: 17, color: '#cfe8ff' },
      { text: 'ALL DISTRICTS', size: 17, color: '#cfe8ff' },
    ],
    { w: 256, h: 340, bg: '#050d14', scan: true }
  );
  const tabletMat = additive(tabletTex, 0xffffff, 0.7);
  const tablet = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.235), tabletMat);
  tablet.position.set(0.86, 0.452, -0.62);
  tablet.rotation.set(-Math.PI / 2, 0, -0.28, 'YXZ');
  root.add(tablet);
  disposal.own(tablet.geometry);
  disposal.own(tabletMat);
  batch.add(paint(0x1c1e22, 0.5), box(0.045, 0.018, 0.14, 0.62, 0.449, -0.42, { ry: -0.5 }), false, true);

  // A mug of tea still giving off heat
  const teaSteam = buildSteam({
    count: Math.round(30 * detail) + 12,
    radius: 0.05,
    height: 0.55,
    rise: 0.16,
    size: 1.1,
    color: 0xb8c6d8,
    opacity: 0.1,
    drift: new THREE.Vector3(0.25, 0, -0.1),
    seed: 5150,
  });
  teaSteam.object.position.set(0.7, 0.53, -0.92);
  root.add(teaSteam.object);
  disposal.own(teaSteam);

  // -------------------------------------------------------------------------
  // Television
  // -------------------------------------------------------------------------
  const unitMat = paint(0x342b22, 0.68);
  batch.add(unitMat, box(0.44, 0.5, 1.12, -2.24, 0.25, -0.6));
  batch.add(unitMat, box(0.46, 0.03, 1.14, -2.24, 0.28, -0.6));
  batch.add(paint(0x1b1d20, 0.55), box(0.4, 0.14, 0.5, -2.24, 0.12, -0.6));
  const tvBody = paint(0x1e2024, 0.58);
  batch.add(tvBody, box(0.5, 0.58, 0.74, -2.26, 0.79, -0.6));
  batch.add(tvBody, box(0.06, 0.5, 0.66, -1.99, 0.79, -0.6));
  batch.add(paint(0x0a0b0d, 0.45), box(0.02, 0.42, 0.58, -1.985, 0.8, -0.6));
  batch.add(mSteel, cyl(0.006, 0.006, 0.5, 6, -2.34, 1.32, -0.72, { rz: 0.32 }));
  batch.add(mSteel, cyl(0.006, 0.006, 0.44, 6, -2.34, 1.29, -0.48, { rz: -0.28 }));

  const staticRng = new Rng(31337);
  const staticFrames = [0, 1, 2, 3].map(() =>
    screenTexture(staticFrame(staticRng, 13), { w: 320, h: 256, bg: '#0a0c0f', scan: true })
  );
  for (const t of staticFrames) disposal.own(t);
  const tvMat = new THREE.MeshBasicMaterial({ map: staticFrames[0], toneMapped: true });
  tvMat.color.setRGB(1.5, 1.62, 1.95);
  disposal.own(tvMat);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.4), tvMat);
  tvScreen.position.set(-1.978, 0.8, -0.6);
  tvScreen.rotation.y = Math.PI / 2;
  root.add(tvScreen);
  disposal.own(tvScreen.geometry);

  const tvGlowMat = additive(radialAlphaTexture(1.8, 96), 0x8fc0ff, 0.4);
  const tvGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), tvGlowMat);
  tvGlow.position.set(-1.9, 0.85, -0.6);
  tvGlow.rotation.y = Math.PI / 2;
  root.add(tvGlow);
  disposal.own(tvGlow.geometry);
  disposal.own(tvGlowMat);

  // -------------------------------------------------------------------------
  // Shelving, kitchen, dressing
  // -------------------------------------------------------------------------
  bookshelf(batch, opts, rng, -2.34, 0, 1.7, Math.PI / 2);
  kitchenCounter(batch, opts, 0.55, 0, 2.66, Math.PI, 1.9);
  sink(batch, opts, 0.55, 0.925, 2.66, Math.PI);
  fridge(batch, opts, 2.05, 0, 2.55, Math.PI);
  batch.add(paint(0x3f382f, 0.7), box(1.9, 0.66, 0.34, 0.55, 1.86, 2.82));
  batch.add(paint(0x4a433a, 0.62), box(0.9, 0.6, 0.02, 0.1, 1.86, 2.64), false, true);
  batch.add(paint(0x4a433a, 0.62), box(0.9, 0.6, 0.02, 1.0, 1.86, 2.64), false, true);
  const stripMat = liveEmitter(0xffd6a0, 2.2);
  disposal.own(stripMat);
  batch.add(stripMat, box(1.6, 0.02, 0.06, 0.55, 1.52, 2.6), false, false);

  // Kettle and a few tins so the counter is not bare
  batch.add(mSteel, cyl(0.075, 0.085, 0.2, 12, -0.1, 1.02, 2.62));
  batch.add(paint(0x1c1e22, 0.5), box(0.06, 0.09, 0.05, -0.02, 1.06, 2.62));
  for (let i = 0; i < 4; i++) {
    batch.add(
      paint([0x8a4a2a, 0x2a5a4a, 0x6a5a2a, 0x4a3a5a][i], 0.5, 0.3),
      cyl(0.038, 0.038, 0.1, 10, 1.18 + i * 0.09, 0.97, 2.74)
    );
  }

  steelChair(batch, opts, 0.05, 0, 1.86, 0.12, 0.45);
  steelChair(batch, opts, 1.08, 0, 1.9, -0.16, 0.45);

  // Wall pictures above the sofa
  const artA = posterTexture('DETROIT', '1994', ['#2c3a4a', '#101820']);
  const artB = posterTexture('LAKE', 'HURON', ['#3a4a3c', '#141c16']);
  disposal.own(artA);
  disposal.own(artB);
  const artMatA = new THREE.MeshStandardMaterial({ map: artA, roughness: 0.8 });
  const artMatB = new THREE.MeshStandardMaterial({ map: artB, roughness: 0.8 });
  disposal.own(artMatA);
  disposal.own(artMatB);
  pictureFrame(batch, HX - 0.03, 1.62, -1.42, -Math.PI / 2, 0.32, 0.44, 0x3a2f24, artMatA);
  pictureFrame(batch, HX - 0.03, 1.5, -0.72, -Math.PI / 2, 0.26, 0.34, 0x3a2f24, artMatB);
  pictureFrame(batch, HX - 0.03, 1.66, -0.08, -Math.PI / 2, 0.2, 0.26, 0x241d16, artMatB);

  laundryPile(batch, opts, rng, -1.25, 0, 2.2, Math.round(4 * detail) + 2);
  laundryPile(batch, opts, rng, 1.72, 0.62, -1.35, 2);
  laundryPile(batch, opts, rng, -0.4, 0, -2.5, 2);

  // Ceiling fitting: shade only, the bulb is dead
  batch.add(paint(0x15171a, 0.7), cyl(0.03, 0.03, 0.12, 8, 0, 2.54, 0));
  batch.add(paint(0x6a6156, 0.75), at(new THREE.CylinderGeometry(0.1, 0.19, 0.16, segs, 1, true), 0, 2.4, 0));
  batch.add(paint(0x2a2620, 0.9), sphere(0.045, 8, 0, 2.38, 0));

  // Standing lamp
  const lampX = -1.95;
  const lampZ = -2.42;
  const lampY = 1.46;
  batch.add(paint(0x2b2723, 0.5, 0.5), at(new THREE.CylinderGeometry(0.16, 0.19, 0.03, segs), lampX, 0.015, lampZ));
  batch.add(paint(0x2b2723, 0.4, 0.6), cyl(0.014, 0.018, lampY - 0.02, 8, lampX, (lampY - 0.02) / 2, lampZ));
  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0xd8b88a,
    roughness: 0.9,
    side: THREE.DoubleSide,
    emissive: 0xffb066,
    emissiveIntensity: 0.55,
  });
  disposal.own(shadeMat);
  batch.add(shadeMat, at(new THREE.CylinderGeometry(0.16, 0.24, 0.26, segs, 1, true), lampX, lampY + 0.06, lampZ), false, false);
  const lampBulbMat = liveEmitter(0xffc890, 7);
  disposal.own(lampBulbMat);
  const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lampBulbMat);
  lampBulb.position.set(lampX, lampY + 0.04, lampZ);
  root.add(lampBulb);
  disposal.own(lampBulb.geometry);
  const haloMat = additive(radialAlphaTexture(2.2, 128), 0xffffff, 0.28, true);
  batch.add(haloMat, halo(1.1, 0xffb066, lampX, lampY + 0.02, lampZ), false, false);
  batch.add(haloMat, halo(1.1, 0xffb066, lampX, lampY + 0.02, lampZ, Math.PI / 2), false, false);
  batch.add(haloMat, halo(0.9, 0x8fc0ff, -1.94, 0.82, -0.6, Math.PI / 2), false, false);

  // -------------------------------------------------------------------------
  // Clues
  // -------------------------------------------------------------------------
  const photoTex = posterTexture('US', '2035', ['#7a6a58', '#2c2620']);
  disposal.own(photoTex);
  const photoMat = new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.55 });
  disposal.own(photoMat);
  pictureFrame(batch, -2.28, 1.12, 1.7, Math.PI / 2, 0.15, 0.19, 0x6a5a3a, photoMat);

  const drawTex = posterTexture('MOM', 'AND ME', ['#f6e8b0', '#f4c2d8']);
  disposal.own(drawTex);
  const drawMat = new THREE.MeshStandardMaterial({ map: drawTex, roughness: 0.92 });
  disposal.own(drawMat);
  batch.add(drawMat, box(0.23, 0.29, 0.004, 2.03, 1.3, 2.213, { ry: Math.PI, rz: 0.04 }), false, true);
  batch.add(paint(0xd04a5a, 0.5, 0.4), cyl(0.012, 0.012, 0.008, 8, 2.03, 1.43, 2.208, { rx: Math.PI / 2 }), false, false);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd6e2ea,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.42,
    envMapIntensity: 2,
    side: THREE.DoubleSide,
  });
  disposal.own(glassMat);
  batch.add(glassMat, cyl(0.037, 0.031, 0.1, 12, 0.34, 0.038, -1.92, { rz: Math.PI / 2, ry: 0.6 }), true, false);
  const shardRng = new Rng(6060);
  for (let i = 0; i < 9; i++) {
    const a = shardRng.range(0, Math.PI * 2);
    const r = shardRng.range(0.06, 0.42);
    batch.add(
      glassMat,
      box(shardRng.range(0.012, 0.032), 0.004, shardRng.range(0.012, 0.03), 0.34 + Math.cos(a) * r, 0.004, -1.92 + Math.sin(a) * r, {
        ry: shardRng.range(0, Math.PI),
        rx: shardRng.range(-0.2, 0.2),
      }),
      true,
      false
    );
  }
  // Damp patch where the glass fell
  batch.add(
    new THREE.MeshPhysicalMaterial({ color: 0x2a2018, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.5 }),
    box(0.5, 0.002, 0.42, 0.34, 0.002, -1.92),
    false,
    true
  );

  const pillBody = new THREE.MeshPhysicalMaterial({
    color: 0xc46a1e,
    roughness: 0.22,
    metalness: 0,
    transparent: true,
    opacity: 0.78,
  });
  disposal.own(pillBody);
  batch.add(pillBody, cyl(0.026, 0.026, 0.085, 12, 0.72, 0.4825, -0.34));
  batch.add(paint(0xe8e4dc, 0.55), cyl(0.028, 0.028, 0.018, 12, 0.72, 0.534, -0.34));
  batch.add(paint(0xf0ece2, 0.7), box(0.028, 0.006, 0.028, 0.78, 0.443, -0.3, { ry: 0.4 }), false, true);
  batch.add(paint(0xf0ece2, 0.7), box(0.026, 0.006, 0.026, 0.8, 0.443, -0.38, { ry: 1.1 }), false, true);
  batch.add(paint(0xd8cfc0, 0.85), box(0.03, 0.004, 0.022, 0.66, 0.443, -0.24, { ry: -0.6 }), false, true);

  // Scuffs and a taped-up crack, to sell "rundown"
  const scuffMat = paintVC(0.95);
  const scuffRng = new Rng(8080);
  for (let i = 0; i < Math.round(9 * detail) + 4; i++) {
    const c = new THREE.Color().setHSL(0.08, 0.15, scuffRng.range(0.06, 0.16));
    const wz = scuffRng.range(-2.6, 2.6);
    batch.add(
      scuffMat,
      tint(plane(scuffRng.range(0.12, 0.5), scuffRng.range(0.1, 0.4), HX - 0.012, scuffRng.range(0.2, 1.9), wz, { ry: -Math.PI / 2 }), c),
      false,
      true
    );
  }

  const meshes = batch.flush(root, 'apartment');
  for (const m of meshes) disposal.own(m.geometry);

  // -------------------------------------------------------------------------
  // Lighting
  // -------------------------------------------------------------------------
  const lights: Record<string, THREE.Light> = {};

  const ambient = new THREE.AmbientLight(0x161d29, 0.45);
  root.add(ambient);
  lights.ambient = ambient;

  const bounce = new THREE.HemisphereLight(0x2b3a52, 0x1e1610, 0.3);
  root.add(bounce);
  lights.bounce = bounce;

  // Shadow caster 1: the standing lamp, the only warm source in the room.
  const lampKey = new THREE.SpotLight(0xffb066, 38, 8, 1.05, 0.72, 2);
  lampKey.position.set(lampX, lampY + 0.02, lampZ);
  lampKey.target.position.set(-1.0, 0, -1.5);
  lampKey.castShadow = true;
  lampKey.shadow.mapSize.set(2048, 2048);
  lampKey.shadow.bias = -0.0008;
  lampKey.shadow.normalBias = 0.02;
  lampKey.shadow.camera.near = 0.2;
  lampKey.shadow.camera.far = 8;
  root.add(lampKey, lampKey.target);
  lights.lampKey = lampKey;

  // Shadow caster 2: cold city light through the window, which also draws the
  // mullion shadows across the floor.
  const windowKey = new THREE.DirectionalLight(0x7ea6e8, 1.5);
  windowKey.position.set(-4.2, 9.5, -24);
  windowKey.target.position.set(0.3, 0.9, -0.5);
  windowKey.castShadow = true;
  windowKey.shadow.mapSize.set(2048, 2048);
  windowKey.shadow.bias = -0.0008;
  windowKey.shadow.normalBias = 0.02;
  windowKey.shadow.camera.near = 14;
  windowKey.shadow.camera.far = 34;
  windowKey.shadow.camera.left = -5;
  windowKey.shadow.camera.right = 5;
  windowKey.shadow.camera.top = 5;
  windowKey.shadow.camera.bottom = -5;
  root.add(windowKey, windowKey.target);
  lights.windowKey = windowKey;

  // Ambient wash of city light just inside the glass.
  const winFill = new THREE.PointLight(0x6f96d8, 26, 7, 2);
  winFill.position.set(winCX, 1.72, -HZ + 0.5);
  root.add(winFill);
  lights.windowFill = winFill;

  const tvLight = new THREE.PointLight(0x8fc0ff, 13, 5.5, 2);
  tvLight.position.set(-1.82, 0.84, -0.6);
  root.add(tvLight);
  lights.tv = tvLight;

  const lampBounce = new THREE.PointLight(0xffb872, 11, 4.2, 2);
  lampBounce.position.set(lampX, lampY + 0.42, lampZ);
  root.add(lampBounce);
  lights.lampBounce = lampBounce;

  const kitchenLight = new THREE.PointLight(0xffcb8a, 11, 4.6, 2);
  kitchenLight.position.set(0.55, 1.44, 2.44);
  root.add(kitchenLight);
  lights.kitchen = kitchenLight;

  const hallLight = new THREE.PointLight(0x4a6070, 3.5, 4, 2);
  hallLight.position.set(doorX, 1.9, HZ + 0.9);
  root.add(hallLight);
  lights.hall = hallLight;

  // -------------------------------------------------------------------------
  // Marks
  // -------------------------------------------------------------------------
  const hero = new THREE.Vector3(-1.05, 0, -1.75);
  const other = new THREE.Vector3(0.25, 0, -1.05);
  const heroYaw = facing(hero, other);
  const heroHead = new THREE.Vector3(hero.x, 1.6, hero.z);
  const otherHead = new THREE.Vector3(other.x, 1.6, other.z);
  const establish = new THREE.Vector3(1.86, 1.82, 2.32);
  const overShoulder = new THREE.Vector3(-1.66, 1.6, -2.14);
  const windowCam = new THREE.Vector3(0.98, 1.5, -0.52);
  const kitchenCam = new THREE.Vector3(-0.05, 1.62, 0.85);

  const marks: Record<string, Mark> = {
    'cam.establish': mark(establish.x, establish.y, establish.z, facing(establish, new THREE.Vector3(-0.5, 1.15, -1.5))),
    'cam.overShoulder': mark(overShoulder.x, overShoulder.y, overShoulder.z, facing(overShoulder, otherHead)),
    'cam.window': mark(windowCam.x, windowCam.y, windowCam.z, facing(windowCam, new THREE.Vector3(-0.6, 1.5, -HZ))),
    'cam.kitchen': mark(kitchenCam.x, kitchenCam.y, kitchenCam.z, facing(kitchenCam, new THREE.Vector3(1.1, 1.1, 2.7))),
    'actor.hero': mark(hero.x, hero.y, hero.z, heroYaw),
    'actor.other': mark(other.x, other.y, other.z, heroYaw - Math.PI),
    'actor.sofa': mark(1.86, 0, -0.72, -Math.PI / 2 + 0.22),
    'actor.window': mark(-0.72, 0, -2.5, Math.PI),
    'look.hero': mark(heroHead.x, heroHead.y, heroHead.z, heroYaw),
    'look.other': mark(otherHead.x, otherHead.y, otherHead.z, heroYaw - Math.PI),
  };

  const clues: ClueSpec[] = [
    {
      id: 'family_photo',
      label: 'Family photograph',
      position: new THREE.Vector3(-2.26, 1.12, 1.7),
      detail: 'Three people at the lake. The frame has been turned face down and set back up more than once.',
    },
    {
      id: 'broken_glass',
      label: 'Broken glass',
      position: new THREE.Vector3(0.34, 0.06, -1.92),
      detail: 'A tumbler, thrown rather than dropped. The spray pattern points away from the sofa.',
    },
    {
      id: 'pill_bottle',
      label: 'Pill bottle',
      position: new THREE.Vector3(0.72, 0.52, -0.34),
      detail: 'Red ice cut with a sedative. Prescribed to nobody. Two-thirds of it is on the table, not in the bottle.',
    },
    {
      id: 'childs_drawing',
      label: "Child's drawing",
      position: new THREE.Vector3(2.02, 1.3, 2.19),
      detail: 'Two figures in wax crayon, holding hands. One of them has been scribbled over and drawn again.',
    },
  ];

  // -------------------------------------------------------------------------
  // Animation
  // -------------------------------------------------------------------------
  let staticTimer = 0;
  let staticIndex = 0;
  const update = (dt: number, elapsed: number) => {
    outerWindows.update(elapsed);
    glassRain.update(dt);
    teaSteam.update(dt, elapsed);

    // CRT snow: swap frames fast, and let the whole picture breathe.
    staticTimer += dt;
    if (staticTimer > 1 / 14) {
      staticTimer = 0;
      staticIndex = (staticIndex + 1) % staticFrames.length;
      tvMat.map = staticFrames[staticIndex];
      tvMat.needsUpdate = true;
    }
    const roll = 1 + Math.sin(elapsed * 8.3) * 0.09 + Math.sin(elapsed * 23.7) * 0.05;
    const surge = Math.sin(elapsed * 0.9) * Math.sin(elapsed * 2.6) > 0.93 ? 1.7 : 1;
    tvMat.color.setRGB(1.5 * roll * surge, 1.62 * roll * surge, 1.95 * roll * surge);
    tvLight.intensity = 13 * roll * surge;
    tvGlowMat.opacity = 0.4 * roll * surge;

    // The lamp is on a failing socket.
    const lampLevel = 1 + Math.sin(elapsed * 2.3) * 0.02 + Math.sin(elapsed * 7.1) * 0.012;
    lampBulbMat.emissiveIntensity = 7 * lampLevel;
    lampKey.intensity = 38 * lampLevel;
    lampBounce.intensity = 11 * lampLevel;
    stripMat.emissiveIntensity = 2.2 + Math.sin(elapsed * 31) * 0.05;

    for (const s of flickerNeon) {
      const t = elapsed * s.rate + s.phase;
      const n = Math.sin(t) * Math.sin(t * 2.3 + 0.4);
      s.material.opacity = n > 0.02 ? 0.9 : n > -0.3 ? 0.3 : 0.06;
    }
  };

  return {
    root,
    sky: 'interiorNight',
    showSkyBackground: false,
    atmosphere: {
      fogColor: new THREE.Color(0x101725),
      fogColorFar: new THREE.Color(0x1c2130),
      density: 0.022,
      heightFalloff: 0.05,
      fogBase: -2,
      noise: 0.4,
    },
    grade: {
      lift: new THREE.Vector3(0.014, 0.016, 0.03),
      gamma: new THREE.Vector3(1.02, 1.0, 0.99),
      gain: new THREE.Vector3(1.07, 1.0, 1.0),
      shadowTint: new THREE.Vector3(0.0, 0.08, 0.24),
      highlightTint: new THREE.Vector3(0.22, 0.1, 0.0),
      saturation: 1.18,
      contrast: 1.14,
      temperature: 0.06,
      bleach: 0.05,
      vignette: 0.44,
    },
    rain: 0.5,
    shafts: [
      { position: new THREE.Vector3(winCX - 0.4, 1.85, -HZ - 0.1), color: new THREE.Color(0x7ea6e8), intensity: 0.26 },
      { position: new THREE.Vector3(lampX, lampY, lampZ), color: new THREE.Color(0xffb066), intensity: 0.2 },
    ],
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
