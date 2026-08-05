// Three fictionalised interceptor batteries. Each has a distinct silhouette,
// moving launcher hardware, status lighting, heat discolouration, decals, cables
// and its own launch signature. Gameplay state (prep / ready / reload / expended)
// lives here too.

import * as THREE from 'three';
import { BATTERIES, BATTERY_BY_ID, EMPLACEMENTS } from './config.js';
import { BATTERY_STATE, bus, state, pushMessage } from './state.js';
import { materials, std, lamp, applyAtmosphere } from './util/materials.js';
import {
  chamferBox,
  mergeParts,
  transform,
  cylinder,
  hydraulicRam,
  wheel,
  ladder,
  handrail,
  trussSegment,
  cableGeometry,
  pathTube,
  greebleField,
  latheProfile,
} from './util/geom.js';
import { stencilDecal, warningStripes, heatDiscolorMap, sootMap } from './util/textures.js';
import { RNG } from './util/rng.js';

const DEG = Math.PI / 180;

function decal(texture, w, h, opts = {}) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = applyAtmosphere(
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      roughness: 0.85,
      metalness: 0.1,
      ...opts,
    })
  );
  return new THREE.Mesh(geo, mat);
}

/* ------------------------------------------------------ shared sub-assemblies */

function buildJack(len = 1.0) {
  const parts = [];
  parts.push({ geometry: cylinder(0.09, 0.09, len, 8), matrix: transform({ pos: [0, len / 2, 0] }) });
  parts.push({ geometry: cylinder(0.13, 0.13, 0.18, 8), matrix: transform({ pos: [0, len, 0] }) });
  parts.push({ geometry: chamferBox(0.5, 0.09, 0.5, 0.02), matrix: transform({ pos: [0, 0.05, 0] }) });
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return g;
}

function buildStatusPanel(colorHex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(chamferBox(0.62, 0.44, 0.14, 0.02), materials().darkMetal);
  g.add(body);
  const lamps = [];
  for (let i = 0; i < 3; i++) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), lamp(i === 0 ? 0x2fff7a : i === 1 ? 0xffc032 : 0xff3324, 0.4));
    l.position.set(-0.18 + i * 0.18, 0.1, 0.08);
    g.add(l);
    lamps.push(l);
  }
  const readout = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.13), lamp(colorHex, 1.8));
  readout.position.set(0, -0.1, 0.08);
  g.add(readout);
  g.userData.lamps = lamps;
  g.userData.readout = readout;
  return g;
}

/** Nozzle-scorched blast deflector plate. */
function buildDeflector(w, h, tilt) {
  const mats = materials();
  const plate = new THREE.Mesh(chamferBox(w, h, 0.14, 0.04), mats.heatMetal);
  plate.rotation.x = tilt;
  const soot = decal(sootMap(256), w * 0.92, h * 0.9, {
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: true,
    opacity: 0.85,
  });
  soot.position.z = 0.09;
  plate.add(soot);
  return plate;
}

/* ------------------------------------------------------------- PATRIOT-style */

function buildPatriotLauncher(rng) {
  const mats = materials();
  const g = new THREE.Group();
  g.name = 'launcher.PATRIOT';

  // --- trailer -------------------------------------------------------
  const tparts = [];
  tparts.push({ geometry: chamferBox(3.0, 0.42, 7.4, 0.06), matrix: transform({ pos: [0, 0.98, 0] }) });
  tparts.push({ geometry: chamferBox(3.2, 0.14, 0.5, 0.03), matrix: transform({ pos: [0, 0.72, 2.6] }) });
  tparts.push({ geometry: chamferBox(3.2, 0.14, 0.5, 0.03), matrix: transform({ pos: [0, 0.72, -2.6] }) });
  // tow bar
  tparts.push({ geometry: chamferBox(0.24, 0.2, 2.4, 0.03), matrix: transform({ pos: [0, 0.86, -4.6] }) });
  tparts.push({ geometry: cylinder(0.16, 0.16, 0.3, 10), matrix: transform({ pos: [0, 0.86, -5.7], rot: [Math.PI / 2, 0, 0] }) });
  // side lockers with greebles
  tparts.push({ geometry: chamferBox(0.42, 0.62, 3.0, 0.04), matrix: transform({ pos: [-1.6, 0.86, 0.6] }) });
  tparts.push({ geometry: chamferBox(0.42, 0.62, 3.0, 0.04), matrix: transform({ pos: [1.6, 0.86, 0.6] }) });
  tparts.push({ geometry: greebleField(2.6, 0.5, rng, { count: 10, maxSize: 0.2, depth: 0.06 }), matrix: transform({ pos: [-1.82, 0.86, 0.6], rot: [0, -Math.PI / 2, 0] }) });
  const trailer = new THREE.Mesh(mergeParts(tparts), mats.oliveMetal);
  trailer.castShadow = true;
  trailer.receiveShadow = true;
  g.add(trailer);
  tparts.forEach((p) => p.geometry.dispose());

  const wgeo = wheel(0.6, 0.4);
  for (const [x, z] of [[-1.5, 1.9], [1.5, 1.9], [-1.5, 0.6], [1.5, 0.6]]) {
    const w = new THREE.Mesh(wgeo, mats.rubber);
    w.position.set(x, 0.6, z);
    w.castShadow = true;
    g.add(w);
  }
  const jackGeo = buildJack(0.95);
  for (const [x, z] of [[-1.75, 3.0], [1.75, 3.0], [-1.75, -3.2], [1.75, -3.2]]) {
    const j = new THREE.Mesh(jackGeo, mats.steel);
    j.position.set(x, 0, z);
    j.castShadow = true;
    g.add(j);
  }

  // --- turntable + erector ------------------------------------------
  const turn = new THREE.Group();
  turn.position.set(0, 1.2, 0.3);
  g.add(turn);
  g.userData.azimuth = turn;

  const ring = new THREE.Mesh(cylinder(1.05, 1.2, 0.3, 20), mats.darkMetal);
  ring.position.y = 0.15;
  ring.castShadow = true;
  turn.add(ring);

  const pivot = new THREE.Group();
  pivot.position.set(0, 0.34, -1.5);
  turn.add(pivot);
  g.userData.elevation = pivot;

  // erector frame carrying four canisters
  const fparts = [];
  fparts.push({ geometry: chamferBox(2.7, 0.22, 5.6, 0.04), matrix: transform({ pos: [0, 0, 2.5] }) });
  const rail = chamferBox(0.16, 0.5, 5.6, 0.03);
  fparts.push({ geometry: rail, matrix: transform({ pos: [-1.25, 0.3, 2.5] }) });
  fparts.push({ geometry: rail, matrix: transform({ pos: [1.25, 0.3, 2.5] }) });
  fparts.push({ geometry: chamferBox(2.7, 0.7, 0.2, 0.03), matrix: transform({ pos: [0, 0.4, -0.1] }) });
  const frame = new THREE.Mesh(mergeParts(fparts), mats.oliveMetal);
  frame.castShadow = true;
  frame.receiveShadow = true;
  pivot.add(frame);
  fparts.forEach((p) => p.geometry.dispose());

  // four rectangular canisters
  const canisters = [];
  const canGroup = new THREE.Group();
  pivot.add(canGroup);
  for (let i = 0; i < 4; i++) {
    const cx = (i % 2 === 0 ? -0.56 : 0.56);
    const cy = 0.44 + Math.floor(i / 2) * 0.98;
    const c = new THREE.Group();
    c.position.set(cx, cy, 2.5);
    const cparts = [];
    cparts.push({ geometry: chamferBox(1.0, 0.92, 5.3, 0.05) });
    const band = chamferBox(1.06, 0.98, 0.1, 0.02);
    for (let k = 0; k < 5; k++) cparts.push({ geometry: band, matrix: transform({ pos: [0, 0, -2.0 + k * 1.0] }) });
    const shell = new THREE.Mesh(mergeParts(cparts), mats.oliveMetal);
    shell.castShadow = true;
    shell.receiveShadow = true;
    c.add(shell);
    cparts.forEach((p) => p.geometry.dispose());

    // frangible front lid
    const lid = new THREE.Mesh(chamferBox(0.94, 0.86, 0.07, 0.03), mats.sandMetal);
    lid.position.set(0, 0, 2.68);
    c.add(lid);
    // rear exhaust cap with heat staining
    const cap = new THREE.Mesh(chamferBox(0.94, 0.86, 0.07, 0.03), mats.heatMetal);
    cap.position.set(0, 0, -2.68);
    c.add(cap);
    // stencil
    const st = decal(stencilDecal([`RD-${i + 1}`], { w: 256, h: 128, color: '#dfd7c2', font: 'bold 74px "Arial Narrow", Impact, sans-serif' }), 0.7, 0.34);
    st.position.set(0.51, 0.1, 1.2);
    st.rotation.y = Math.PI / 2;
    c.add(st);
    canGroup.add(c);
    canisters.push({ node: c, lid, loaded: true, index: i });
  }
  g.userData.canisters = canisters;
  g.userData.launchLocal = canisters.map((c) => new THREE.Vector3(c.node.position.x, c.node.position.y, 5.3));

  // hydraulic erection rams
  const rams = [];
  for (const s of [-1, 1]) {
    const ram = new THREE.Mesh(hydraulicRam(1.5, 1.2, 0.07), mats.steel);
    ram.position.set(s * 1.0, 0.36, -0.9);
    turn.add(ram);
    rams.push(ram);
  }
  g.userData.rams = rams;

  // cables from trailer to erector
  const cableMat = std({ color: 0x191919, roughness: 0.85, metalness: 0.1 });
  const cables = new THREE.Mesh(
    mergeParts([
      { geometry: cableGeometry(new THREE.Vector3(-1.2, 1.25, -2.2), new THREE.Vector3(-0.4, 1.6, -1.2), 0.22, 0.04, 10, 5) },
      { geometry: cableGeometry(new THREE.Vector3(1.2, 1.25, -2.2), new THREE.Vector3(0.4, 1.6, -1.2), 0.22, 0.04, 10, 5) },
    ]),
    cableMat
  );
  g.add(cables);

  // status panel + markings
  const panel = buildStatusPanel(0x5fd0ff);
  panel.position.set(-1.62, 1.35, -1.6);
  panel.rotation.y = -Math.PI / 2;
  g.add(panel);
  g.userData.panel = panel;

  const stripe = decal(warningStripes(512, 64), 3.0, 0.2, { transparent: false });
  stripe.position.set(0, 1.22, 3.72);
  g.add(stripe);
  const nameplate = decal(
    stencilDecal(['HAWKEYE 1', 'LAUNCH STATION'], { w: 512, h: 180, color: '#e8e2d2', font: 'bold 58px "Arial Narrow", Impact, sans-serif' }),
    2.1,
    0.74
  );
  nameplate.position.set(1.83, 0.95, 0.6);
  nameplate.rotation.y = Math.PI / 2;
  g.add(nameplate);

  g.userData.restElevation = 0;
  g.userData.fireElevation = 40 * DEG;
  g.userData.colliders = [
    { type: 'box', pos: [0, 1.0, 0], half: [1.7, 1.0, 4.0], walkable: true },
    { type: 'box', pos: [0, 2.0, 1.0], half: [1.5, 1.0, 3.0], walkable: false },
  ];
  return g;
}

/* --------------------------------------------------------------- THAAD-style */

function buildThaadLauncher(rng) {
  const mats = materials();
  const g = new THREE.Group();
  g.name = 'launcher.THAAD';

  // --- 8x8 style chassis --------------------------------------------
  const cparts = [];
  cparts.push({ geometry: chamferBox(2.9, 0.6, 11.0, 0.07), matrix: transform({ pos: [0, 1.15, 0] }) });
  cparts.push({ geometry: chamferBox(2.7, 1.7, 2.5, 0.09), matrix: transform({ pos: [0, 2.2, -4.2] }) });
  cparts.push({ geometry: chamferBox(2.6, 0.7, 1.0, 0.06), matrix: transform({ pos: [0, 1.6, -5.6] }) });
  cparts.push({ geometry: chamferBox(2.5, 0.5, 1.2, 0.05), matrix: transform({ pos: [0, 2.05, -5.6] }) });
  // side skirts + lockers
  cparts.push({ geometry: chamferBox(0.32, 0.7, 5.2, 0.04), matrix: transform({ pos: [-1.5, 1.1, 1.4] }) });
  cparts.push({ geometry: chamferBox(0.32, 0.7, 5.2, 0.04), matrix: transform({ pos: [1.5, 1.1, 1.4] }) });
  cparts.push({ geometry: greebleField(4.4, 0.55, rng, { count: 14, maxSize: 0.22, depth: 0.06 }), matrix: transform({ pos: [-1.68, 1.1, 1.4], rot: [0, -Math.PI / 2, 0] }) });
  cparts.push({ geometry: chamferBox(2.9, 0.3, 0.3, 0.04), matrix: transform({ pos: [0, 0.9, -6.2] }) });
  const chassis = new THREE.Mesh(mergeParts(cparts), mats.sandMetal);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  g.add(chassis);
  cparts.forEach((p) => p.geometry.dispose());

  const wgeo = wheel(0.78, 0.5);
  for (const [x, z] of [
    [-1.55, -4.0], [1.55, -4.0],
    [-1.55, -2.4], [1.55, -2.4],
    [-1.55, 2.6], [1.55, 2.6],
    [-1.55, 4.2], [1.55, 4.2],
  ]) {
    const w = new THREE.Mesh(wgeo, mats.rubber);
    w.position.set(x, 0.78, z);
    w.castShadow = true;
    g.add(w);
  }

  const cab = new THREE.Mesh(chamferBox(2.45, 0.9, 0.08, 0.02), mats.glass);
  cab.position.set(0, 2.5, -5.42);
  cab.rotation.x = -0.12;
  g.add(cab);

  const jackGeo = buildJack(1.15);
  for (const [x, z] of [[-1.7, 4.9], [1.7, 4.9], [-1.7, 0.4], [1.7, 0.4]]) {
    const j = new THREE.Mesh(jackGeo, mats.steel);
    j.position.set(x, 0, z);
    j.castShadow = true;
    g.add(j);
  }

  // --- pod cradle ---------------------------------------------------
  const turn = new THREE.Group();
  turn.position.set(0, 1.45, 1.6);
  g.add(turn);
  g.userData.azimuth = turn;

  const pivot = new THREE.Group();
  pivot.position.set(0, 0.35, -3.0);
  turn.add(pivot);
  g.userData.elevation = pivot;

  // long launch pod with eight round tubes (2 x 4)
  const podParts = [];
  podParts.push({ geometry: chamferBox(2.4, 2.1, 8.2, 0.08), matrix: transform({ pos: [0, 1.05, 4.0] }) });
  const strap = chamferBox(2.5, 2.2, 0.14, 0.03);
  for (let i = 0; i < 5; i++) podParts.push({ geometry: strap, matrix: transform({ pos: [0, 1.05, 0.7 + i * 1.7] }) });
  const pod = new THREE.Mesh(mergeParts(podParts), mats.sandMetal);
  pod.castShadow = true;
  pod.receiveShadow = true;
  pivot.add(pod);
  podParts.forEach((p) => p.geometry.dispose());

  const canisters = [];
  const tubeGeo = cylinder(0.42, 0.42, 8.0, 16, true);
  const capGeo = new THREE.CircleGeometry(0.42, 16);
  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = -0.82 + col * 0.55;
    const cy = 0.5 + row * 1.1;
    const c = new THREE.Group();
    c.position.set(cx, cy, 4.0);
    const tube = new THREE.Mesh(tubeGeo, mats.darkMetal);
    tube.rotation.x = Math.PI / 2;
    c.add(tube);
    const lid = new THREE.Mesh(capGeo, mats.heatMetal);
    lid.position.z = 4.02;
    c.add(lid);
    canisters.push({ node: c, lid, loaded: true, index: i });
    pivot.add(c);
  }
  g.userData.canisters = canisters;
  g.userData.launchLocal = canisters.map((c) => new THREE.Vector3(c.node.position.x, c.node.position.y, 8.2));

  // heavy erection rams + deflector
  const rams = [];
  for (const s of [-1, 1]) {
    const ram = new THREE.Mesh(hydraulicRam(2.1, 1.8, 0.1), mats.steel);
    ram.position.set(s * 1.15, 0.35, -1.4);
    turn.add(ram);
    rams.push(ram);
  }
  g.userData.rams = rams;

  const defl = buildDeflector(3.0, 2.0, -0.5);
  defl.position.set(0, 0.9, -1.5);
  g.add(defl);

  // walkway + rail along the chassis
  const walk = new THREE.Mesh(chamferBox(0.6, 0.06, 4.6, 0.02), mats.galv);
  walk.position.set(-1.7, 1.48, 1.6);
  g.add(walk);
  const rail = new THREE.Mesh(
    handrail(
      [new THREE.Vector3(-1.95, 0, -0.7), new THREE.Vector3(-1.95, 0, 3.9)],
      0.95
    ),
    mats.galv
  );
  rail.position.y = 1.5;
  g.add(rail);
  const lad = new THREE.Mesh(ladder(1.4, 0.4), mats.galv);
  lad.position.set(-1.95, 0.1, -0.9);
  lad.rotation.y = Math.PI / 2;
  g.add(lad);

  const panel = buildStatusPanel(0xffc46b);
  panel.position.set(-1.55, 1.9, -2.6);
  panel.rotation.y = -Math.PI / 2;
  g.add(panel);
  g.userData.panel = panel;

  const nameplate = decal(
    stencilDecal(['LONGVIEW 2', 'HI-ALT LAUNCHER'], { w: 512, h: 180, color: '#efe6cf', font: 'bold 56px "Arial Narrow", Impact, sans-serif' }),
    2.6,
    0.9
  );
  nameplate.position.set(1.68, 1.25, 1.6);
  nameplate.rotation.y = Math.PI / 2;
  g.add(nameplate);
  const stripe = decal(warningStripes(512, 64), 2.5, 0.22, { transparent: false });
  stripe.position.set(0, 2.9, -4.0);
  stripe.rotation.y = Math.PI;
  g.add(stripe);

  g.userData.restElevation = 0;
  g.userData.fireElevation = 74 * DEG;
  g.userData.colliders = [
    { type: 'box', pos: [0, 1.2, 0], half: [1.7, 1.2, 5.8], walkable: true },
    { type: 'box', pos: [0, 2.4, -4.2], half: [1.5, 1.2, 1.6], walkable: false },
  ];
  return g;
}

/* ------------------------------------------------------- SENTINEL (fictional) */

function buildSentinelLauncher(rng) {
  const mats = materials();
  const g = new THREE.Group();
  g.name = 'launcher.SENTINEL';

  // --- heavy semi-trailer -------------------------------------------
  const cparts = [];
  cparts.push({ geometry: chamferBox(3.6, 0.7, 14.0, 0.08), matrix: transform({ pos: [0, 1.25, 0] }) });
  cparts.push({ geometry: chamferBox(3.4, 0.34, 3.0, 0.05), matrix: transform({ pos: [0, 1.68, -5.2] }) });
  cparts.push({ geometry: chamferBox(0.4, 0.9, 7.0, 0.05), matrix: transform({ pos: [-1.85, 1.2, 1.2] }) });
  cparts.push({ geometry: chamferBox(0.4, 0.9, 7.0, 0.05), matrix: transform({ pos: [1.85, 1.2, 1.2] }) });
  cparts.push({ geometry: greebleField(6.0, 0.7, rng, { count: 18, maxSize: 0.26, depth: 0.08 }), matrix: transform({ pos: [-2.07, 1.2, 1.2], rot: [0, -Math.PI / 2, 0] }) });
  // gooseneck
  cparts.push({ geometry: chamferBox(2.6, 1.0, 2.4, 0.06), matrix: transform({ pos: [0, 1.9, -6.6] }) });
  const chassis = new THREE.Mesh(mergeParts(cparts), mats.darkMetal);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  g.add(chassis);
  cparts.forEach((p) => p.geometry.dispose());

  const wgeo = wheel(0.72, 0.46);
  for (const [x, z] of [
    [-1.9, -3.4], [1.9, -3.4],
    [-1.9, -1.8], [1.9, -1.8],
    [-1.9, 3.4], [1.9, 3.4],
    [-1.9, 5.0], [1.9, 5.0],
    [-1.9, 6.6], [1.9, 6.6],
  ]) {
    const w = new THREE.Mesh(wgeo, mats.rubber);
    w.position.set(x, 0.72, z);
    w.castShadow = true;
    g.add(w);
  }
  const jackGeo = buildJack(1.35);
  for (const [x, z] of [[-2.2, 6.9], [2.2, 6.9], [-2.2, -5.4], [2.2, -5.4], [-2.2, 0.6], [2.2, 0.6]]) {
    const j = new THREE.Mesh(jackGeo, mats.steel);
    j.position.set(x, 0, z);
    j.castShadow = true;
    g.add(j);
  }

  // --- erector with twin large canisters ----------------------------
  const turn = new THREE.Group();
  turn.position.set(0, 1.6, 1.0);
  g.add(turn);
  g.userData.azimuth = turn;

  const collar = new THREE.Mesh(cylinder(1.5, 1.7, 0.4, 24), mats.steel);
  collar.position.y = 0.2;
  collar.castShadow = true;
  turn.add(collar);

  const pivot = new THREE.Group();
  pivot.position.set(0, 0.5, -4.6);
  turn.add(pivot);
  g.userData.elevation = pivot;

  // lattice cradle
  const cradle = new THREE.Mesh(trussSegment(2.4, 11.5, 0.075), mats.galv);
  cradle.rotation.x = -Math.PI / 2;
  cradle.rotation.z = 0;
  cradle.position.set(0, 0, 0);
  cradle.castShadow = true;
  pivot.add(cradle);

  const canisters = [];
  for (let i = 0; i < 2; i++) {
    const cx = i === 0 ? -0.95 : 0.95;
    const c = new THREE.Group();
    c.position.set(cx, 0.9, 5.6);
    const cparts2 = [];
    cparts2.push({ geometry: cylinder(0.82, 0.82, 11.0, 22), matrix: transform({ rot: [Math.PI / 2, 0, 0] }) });
    const band = new THREE.TorusGeometry(0.86, 0.06, 6, 22);
    for (let k = 0; k < 7; k++) cparts2.push({ geometry: band, matrix: transform({ pos: [0, 0, -4.6 + k * 1.55] }) });
    const shell = new THREE.Mesh(mergeParts(cparts2), mats.oliveMetal);
    shell.castShadow = true;
    shell.receiveShadow = true;
    c.add(shell);
    cparts2.forEach((p) => p.geometry.dispose());
    const lid = new THREE.Mesh(
      latheProfile(
        [
          [0.001, 0.5],
          [0.35, 0.4],
          [0.62, 0.2],
          [0.82, 0.02],
          [0.82, 0],
        ],
        20
      ),
      mats.sandMetal
    );
    lid.rotation.x = Math.PI / 2;
    lid.position.z = 5.5;
    c.add(lid);
    const capRear = new THREE.Mesh(new THREE.CircleGeometry(0.82, 22), mats.heatMetal);
    capRear.position.z = -5.5;
    capRear.rotation.y = Math.PI;
    c.add(capRear);
    const st = decal(
      stencilDecal([`SENTINEL`, `RD ${i + 1} — TEST ARTICLE`], { w: 512, h: 160, color: '#e9dfc8', font: 'bold 52px "Arial Narrow", Impact, sans-serif' }),
      2.4,
      0.75
    );
    st.position.set(0.84, 0.1, 1.5);
    st.rotation.y = Math.PI / 2;
    c.add(st);
    canisters.push({ node: c, lid, loaded: true, index: i });
    pivot.add(c);
  }
  g.userData.canisters = canisters;
  g.userData.launchLocal = canisters.map((c) => new THREE.Vector3(c.node.position.x, c.node.position.y, 11.4));

  const rams = [];
  for (const s of [-1, 1]) {
    const ram = new THREE.Mesh(hydraulicRam(3.0, 2.6, 0.14), mats.steel);
    ram.position.set(s * 1.5, 0.5, -2.2);
    turn.add(ram);
    rams.push(ram);
  }
  g.userData.rams = rams;

  // large blast deflector and support gantry
  const defl = buildDeflector(4.6, 3.2, -0.62);
  defl.position.set(0, 1.4, -5.6);
  g.add(defl);

  const gantry = new THREE.Mesh(trussSegment(1.0, 7.0, 0.06), mats.galv);
  gantry.position.set(-2.6, 0, 2.0);
  gantry.castShadow = true;
  g.add(gantry);
  const cross = new THREE.Mesh(chamferBox(2.4, 0.18, 0.5, 0.03), mats.galv);
  cross.position.set(-1.5, 6.9, 2.0);
  g.add(cross);

  // cryo / gas service lines
  const lineMat = std({ color: 0xb8bcc0, roughness: 0.35, metalness: 0.85 });
  const lines = new THREE.Mesh(
    mergeParts([
      { geometry: pathTube([new THREE.Vector3(-2.4, 0.5, 2.0), new THREE.Vector3(-2.1, 2.6, 3.4), new THREE.Vector3(-1.1, 3.0, 5.0)], 0.06, 6) },
      { geometry: pathTube([new THREE.Vector3(-2.4, 0.9, 2.4), new THREE.Vector3(-2.0, 3.0, 3.8), new THREE.Vector3(-1.0, 3.4, 5.4)], 0.045, 6) },
    ]),
    lineMat
  );
  g.add(lines);

  const panel = buildStatusPanel(0xff7de3);
  panel.position.set(-1.95, 2.0, -3.4);
  panel.rotation.y = -Math.PI / 2;
  g.add(panel);
  g.userData.panel = panel;

  const nameplate = decal(
    stencilDecal(['IRONWOOD 3', 'LONG-RANGE TEST'], { w: 512, h: 180, color: '#f0e6d0', font: 'bold 54px "Arial Narrow", Impact, sans-serif' }),
    3.0,
    1.0
  );
  nameplate.position.set(2.08, 1.3, 1.2);
  nameplate.rotation.y = Math.PI / 2;
  g.add(nameplate);
  const stripe = decal(warningStripes(512, 64), 3.4, 0.26, { transparent: false });
  stripe.position.set(0, 1.65, -7.05);
  stripe.rotation.y = Math.PI;
  g.add(stripe);

  g.userData.restElevation = 0;
  g.userData.fireElevation = 84 * DEG;
  g.userData.colliders = [
    { type: 'box', pos: [0, 1.3, 0], half: [2.0, 1.3, 7.2], walkable: true },
    { type: 'box', pos: [0, 3.0, 2.0], half: [1.6, 1.6, 5.0], walkable: false },
  ];
  return g;
}

const LAUNCHER_BUILDERS = {
  PATRIOT: buildPatriotLauncher,
  THAAD: buildThaadLauncher,
  SENTINEL: buildSentinelLauncher,
};

/* -------------------------------------------------------------- Battery ---- */

class Launcher {
  constructor(cfg, emplacement, rng, scene) {
    this.cfg = cfg;
    this.group = LAUNCHER_BUILDERS[cfg.id](rng);
    this.group.position.set(emplacement.pos[0], emplacement.pos[1] + 0.06, emplacement.pos[2]);
    this.group.rotation.y = emplacement.yaw;
    scene.add(this.group);
    this.azimuth = this.group.userData.azimuth;
    this.elevationNode = this.group.userData.elevation;
    this.canisters = this.group.userData.canisters;
    this.launchLocal = this.group.userData.launchLocal;
    this.restElevation = this.group.userData.restElevation;
    this.fireElevation = this.group.userData.fireElevation;
    this.targetElevation = this.restElevation;
    this.targetAzimuth = 0;
    this.currentElevation = this.restElevation;
    this.currentAzimuth = 0;
    this.nextTube = 0;
    this.servoNoise = 0;
  }

  /** World-space muzzle pose of the next loaded tube. */
  launchPose(out = { pos: new THREE.Vector3(), dir: new THREE.Vector3() }) {
    const tube = this.canisters[this.nextTube % this.canisters.length];
    const local = this.launchLocal[tube.index].clone();
    this.elevationNode.updateWorldMatrix(true, false);
    out.pos.copy(local).applyMatrix4(this.elevationNode.matrixWorld);
    out.dir.set(0, 0, 1).transformDirection(this.elevationNode.matrixWorld);
    return out;
  }

  /**
   * Slew the erector so the rail points at the cued intercept point, plus a
   * loft bias so the round arcs over rather than flying a flat trajectory.
   */
  aimAt(worldPoint) {
    const local = this.group.worldToLocal(worldPoint.clone());
    this.targetAzimuth = Math.atan2(local.x, local.z);
    const flat = Math.hypot(local.x, local.z);
    const direct = Math.atan2(local.y, Math.max(1, flat));
    const c = this.cfg;
    const loft = c.loft !== undefined ? c.loft : 0.28;
    const min = c.minElev !== undefined ? c.minElev : 0.4;
    const max = c.maxElev !== undefined ? c.maxElev : 1.4;
    this.targetElevation = THREE.MathUtils.clamp(direct + loft, min, max);
    this.fireElevation = this.targetElevation;
  }

  stand(down) {
    this.targetElevation = down ? this.restElevation : this.fireElevation;
    if (down) this.targetAzimuth = 0;
  }

  update(dt) {
    const eRate = 0.46;
    const aRate = 0.62;
    const de = this.targetElevation - this.currentElevation;
    const da = THREE.MathUtils.euclideanModulo(this.targetAzimuth - this.currentAzimuth + Math.PI, Math.PI * 2) - Math.PI;
    const eStep = Math.sign(de) * Math.min(Math.abs(de), eRate * dt);
    const aStep = Math.sign(da) * Math.min(Math.abs(da), aRate * dt);
    this.currentElevation += eStep;
    this.currentAzimuth += aStep;
    this.moving = Math.abs(eStep) > 1e-5 || Math.abs(aStep) > 1e-5;
    this.elevationNode.rotation.x = -this.currentElevation;
    this.azimuth.rotation.y = this.currentAzimuth;
    // hydraulic rams extend with elevation
    const t = THREE.MathUtils.clamp((this.currentElevation - this.restElevation) / 1.3, 0, 1);
    for (const ram of this.group.userData.rams || []) {
      ram.rotation.x = -0.15 - t * 0.55;
      ram.scale.y = 1 + t * 0.5;
    }
    return this.moving;
  }

  atFiringPosition() {
    return Math.abs(this.currentElevation - this.targetElevation) < 0.01 && Math.abs(this.currentAzimuth - this.targetAzimuth) < 0.02;
  }

  setLamps(stateId) {
    const panel = this.group.userData.panel;
    if (!panel) return;
    const [green, amber, red] = panel.userData.lamps;
    const set = (l, on) => {
      l.material.emissiveIntensity = on ? 4.5 : 0.25;
    };
    set(green, stateId === BATTERY_STATE.READY);
    set(amber, stateId === BATTERY_STATE.PREP || stateId === BATTERY_STATE.RELOAD);
    set(red, stateId === BATTERY_STATE.EXPENDED || stateId === BATTERY_STATE.OFFLINE);
  }

  consumeTube() {
    const tube = this.canisters[this.nextTube % this.canisters.length];
    tube.loaded = false;
    if (tube.lid) tube.lid.visible = false;
    this.nextTube++;
    return tube;
  }

  reloadAll() {
    for (const c of this.canisters) {
      c.loaded = true;
      if (c.lid) c.lid.visible = true;
    }
    this.nextTube = 0;
  }
}

export class Battery {
  constructor(cfg, scene, rng) {
    this.cfg = cfg;
    this.launchers = (EMPLACEMENTS[cfg.id] || []).map((e, i) => new Launcher(cfg, e, rng.fork(`${cfg.id}:${i}`), scene));
    this.ammo = cfg.ammo;
    this.state = BATTERY_STATE.READY;
    this.timer = 0;
    this.assignedTrack = null;
    this.pendingAuthorize = false;
    this.activeLauncher = 0;
    this.salvoLeft = 0;
    this.launchCooldown = 0;
  }

  get id() {
    return this.cfg.id;
  }

  get position() {
    return this.launchers[0].group.position;
  }

  assign(track, predictedPoint) {
    if (this.state === BATTERY_STATE.EXPENDED) return false;
    this.assignedTrack = track;
    if (this.state === BATTERY_STATE.READY || this.state === BATTERY_STATE.PREP) {
      this.state = BATTERY_STATE.PREP;
      this.timer = this.cfg.prepTime;
    }
    for (const l of this.launchers) l.aimAt(predictedPoint);
    return true;
  }

  clearAssignment() {
    this.assignedTrack = null;
    this.pendingAuthorize = false;
    for (const l of this.launchers) l.stand(true);
    if (this.state === BATTERY_STATE.PREP) this.state = BATTERY_STATE.READY;
  }

  authorize() {
    if (!this.assignedTrack) return { ok: false, why: 'NO_ASSIGNMENT' };
    if (this.ammo <= 0) return { ok: false, why: 'NO_ROUNDS' };
    if (this.state === BATTERY_STATE.RELOAD) return { ok: false, why: 'RELOADING' };
    this.pendingAuthorize = true;
    return { ok: true, why: this.readyToFire() ? 'FIRING' : 'QUEUED' };
  }

  readyToFire() {
    return this.state === BATTERY_STATE.PREP && this.timer <= 0 && this.launchers.every((l) => l.atFiringPosition());
  }

  update(dt, onFire) {
    if (this.timer > 0) this.timer = Math.max(0, this.timer - dt);
    if (this.launchCooldown > 0) this.launchCooldown = Math.max(0, this.launchCooldown - dt);
    let moving = false;
    for (const l of this.launchers) moving = l.update(dt) || moving;
    this.moving = moving;

    if (this.state === BATTERY_STATE.RELOAD && this.timer <= 0) {
      this.state = this.ammo > 0 ? BATTERY_STATE.READY : BATTERY_STATE.EXPENDED;
      for (const l of this.launchers) if (l.nextTube >= l.canisters.length) l.reloadAll();
      if (this.assignedTrack) {
        this.state = BATTERY_STATE.PREP;
        this.timer = this.cfg.prepTime * 0.5;
      }
      bus.emit('battery:state', this);
    }

    if (this.pendingAuthorize && this.readyToFire() && this.launchCooldown <= 0) {
      const l = this.launchers[this.activeLauncher % this.launchers.length];
      const pose = l.launchPose();
      const tube = l.consumeTube();
      this.activeLauncher++;
      this.ammo--;
      this.pendingAuthorize = false;
      this.launchCooldown = this.cfg.launchInterval;
      this.state = BATTERY_STATE.RELOAD;
      this.timer = this.cfg.reloadTime;
      onFire(this, pose, l, tube);
      bus.emit('battery:state', this);
    }

    for (const l of this.launchers) l.setLamps(this.state);
    const st = state.batteries[this.id];
    if (st) {
      st.ammo = this.ammo;
      st.state = this.state;
      st.timer = this.timer;
      st.assignedTrackId = this.assignedTrack ? this.assignedTrack.id : null;
    }
  }

  reset() {
    this.ammo = this.cfg.ammo;
    this.state = BATTERY_STATE.READY;
    this.timer = 0;
    this.assignedTrack = null;
    this.pendingAuthorize = false;
    this.launchCooldown = 0;
    this.activeLauncher = 0;
    for (const l of this.launchers) {
      l.reloadAll();
      l.stand(true);
      l.currentElevation = l.restElevation;
      l.currentAzimuth = 0;
    }
  }

  registerColliders(world) {
    for (const l of this.launchers) world.addFromObject(l.group);
  }
}

export class BatteryManager {
  constructor(scene, effects, interceptors, seed = 1) {
    this.scene = scene;
    this.effects = effects;
    this.interceptors = interceptors;
    const rng = new RNG(`batteries:${seed}`);
    this.list = BATTERIES.map((cfg) => new Battery(cfg, scene, rng));
    this.byId = Object.fromEntries(this.list.map((b) => [b.id, b]));
    this.camera = null;
    this.onLaunch = null;
  }

  get(id) {
    return this.byId[id];
  }

  registerColliders(world) {
    for (const b of this.list) b.registerColliders(world);
  }

  update(dt) {
    for (const b of this.list) {
      b.update(dt, (battery, pose, launcher, tube) => {
        const target = battery.assignedTrack ? battery.assignedTrack.threat : null;
        const inter = this.interceptors.launch({
          batteryId: battery.id,
          pos: pose.pos.clone(),
          dir: pose.dir.clone(),
          target,
          trackId: battery.assignedTrack ? battery.assignedTrack.id : null,
        });
        this.effects.launchBlast(pose.pos.clone(), pose.dir.clone(), battery.cfg, this.camera);
        // Canister lid blows clear.
        if (tube && tube.lid) {
          this.effects.puff(pose.pos.clone(), 3 * battery.cfg.plumeScale, 0xd8d0c4, 5);
        }
        if (this.onLaunch) this.onLaunch(battery, inter, pose);
      });
    }
  }

  reset() {
    for (const b of this.list) b.reset();
  }
}
