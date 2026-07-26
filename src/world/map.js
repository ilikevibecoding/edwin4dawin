import * as THREE from 'three';
import { getMaterialLib, tex, canvas, matWithRepeat, scaleBoxUVs } from './textures.js';
import { makeRNG } from '../core/math.js';
import { buildBuilding, buildRuinedBuilding, buildCompoundWall } from './buildings.js';
import {
  buildCar, buildBus, buildJerseyBarrier, buildSandbagWall, buildBarrel,
  buildTireStack, buildCrate, buildPowerPole, buildWire, buildStreetLight,
  buildDumpster, buildMarketStall, buildRubblePile, buildDistantScenery, shadow,
} from './props.js';

/**
 * DUST LINE — a sun-bleached desert-urban street map.
 * Main street runs east-west (X axis). Cross street runs north-south.
 * Returns spawns, cover points, minimap shapes; registers all colliders.
 */

const rng = makeRNG(777);

export function buildMap(scene, colliders) {
  const lib = getMaterialLib();
  const root = new THREE.Group();
  scene.add(root);

  const minimapShapes = [];
  const coverPoints = [];
  const addCover = (x, z) => coverPoints.push(new THREE.Vector3(x, 0, z));

  /* ------------------------------ ground ------------------------------ */

  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), matWithRepeat(lib.dirt, 52, 52));
  dirt.rotation.x = -Math.PI / 2;
  dirt.receiveShadow = true;
  root.add(dirt);

  // Main street asphalt (E-W)
  const road = new THREE.Mesh(new THREE.PlaneGeometry(150, 13), matWithRepeat(lib.asphalt, 30, 2.6));
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  root.add(road);
  minimapShapes.push({ type: 'road', x: 0, z: 0, w: 150, d: 13 });

  // Cross street (N-S)
  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(11, 150), matWithRepeat(lib.asphalt, 2.2, 30));
  road2.rotation.x = -Math.PI / 2;
  road2.position.y = 0.025;
  road2.receiveShadow = true;
  root.add(road2);
  minimapShapes.push({ type: 'road', x: 0, z: 0, w: 11, d: 150 });

  // Worn center dashes on the main street
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xb9b19a, roughness: 0.95, transparent: true, opacity: 0.5 });
  for (let x = -70; x < 74; x += 6) {
    if (Math.abs(x) < 7) continue;
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.16), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x + rng.spread(0.3), 0.035, rng.spread(0.08));
    root.add(dash);
  }
  // Crosswalk across the main street at the west side of the intersection
  for (let i = 0; i < 11; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), dashMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-8.4, 0.04, -5.5 + i * 1.1);
    root.add(stripe);
  }

  // Skid marks
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 1, transparent: true, opacity: 0.4 });
  for (const [x, z, len, rot] of [[14, 1.4, 9, 0.08], [11, 2.2, 7, -0.12]]) {
    const skid = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.3), skidMat);
    skid.rotation.x = -Math.PI / 2;
    skid.rotation.z = rot;
    skid.position.set(x, 0.045, z);
    root.add(skid);
  }

  // Sidewalks with curbs
  const walkGeoN = scaleBoxUVs(new THREE.BoxGeometry(150, 0.16, 3.2), 150, 0.16, 3.2, 0.42, 0.42);
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(walkGeoN, lib.sidewalk);
    walk.position.set(0, 0.08, side * 8.2);
    walk.receiveShadow = true; walk.castShadow = true;
    root.add(walk);
  }

  /* ----------------------------- buildings ---------------------------- */

  const placeBuilding = (opts, x, z, yaw = 0) => {
    const b = buildBuilding(opts);
    b.position.set(x, 0, z);
    b.rotation.y = yaw;
    root.add(b);
    const [w, d] = b.userData.footprint;
    const rot = Math.abs(Math.sin(yaw)) > 0.5;
    minimapShapes.push({ type: 'b', x, z, w: rot ? d : w, d: rot ? w : d });
    return b;
  };

  const shopNames = ['BAZAAR', 'HOTEL AMIR', 'CAFE SAHRA', 'MARKET', 'AL NOOR', 'TAILOR', 'PHARMACY', 'KEBAB'];
  let shopIdx = 0;

  // North row (front facades face +Z toward street at z≈-10)
  const northRow = [
    { w: 13, d: 11, stories: 2, storefront: true },
    { w: 10, d: 12, stories: 3 },
    { w: 15, d: 10, stories: 2, storefront: true },
    { w: 11, d: 12, stories: 2 },
    { w: 14, d: 11, stories: 3, storefront: true },
    { w: 12, d: 10, stories: 2 },
  ];
  let cx = -52;
  for (let i = 0; i < northRow.length; i++) {
    const o = northRow[i];
    const gap = i === 2 ? 4.5 : 0.6; // alley after 3rd building
    cx += o.w / 2;
    if (Math.abs(cx) < 9) cx = 9 + o.w / 2; // keep cross street open
    placeBuilding({ ...o, seed: 100 + i, styleIdx: i % 5, signText: o.storefront ? shopNames[shopIdx++ % shopNames.length] : null },
      cx, -10 - o.d / 2, 0);
    cx += o.w / 2 + gap;
  }

  // South row (facades face -Z; yaw PI)
  const southRow = [
    { w: 14, d: 10, stories: 2, storefront: true },
    { w: 11, d: 11, stories: 3 },
    { w: 12, d: 10, stories: 2, storefront: true },
    { w: 13, d: 12, stories: 2 },
    { w: 10, d: 10, stories: 3 },
    { w: 13, d: 11, stories: 2, storefront: true },
  ];
  cx = -54;
  for (let i = 0; i < southRow.length; i++) {
    const o = southRow[i];
    const gap = i === 3 ? 4 : 0.7;
    cx += o.w / 2;
    if (Math.abs(cx) < 9) cx = 9 + o.w / 2;
    placeBuilding({ ...o, seed: 200 + i, styleIdx: (i + 2) % 5, signText: o.storefront ? shopNames[shopIdx++ % shopNames.length] : null },
      cx, 10 + o.d / 2, Math.PI);
    cx += o.w / 2 + gap;
  }

  // Cross-street buildings (north arm, facing street on X axis)
  placeBuilding({ w: 12, d: 10, stories: 2, seed: 301, styleIdx: 1 }, -12, -24, Math.PI / 2);
  placeBuilding({ w: 11, d: 10, stories: 3, seed: 302, styleIdx: 3 }, 12, -26, -Math.PI / 2);
  placeBuilding({ w: 12, d: 11, stories: 2, seed: 303, styleIdx: 2 }, -12, 26, Math.PI / 2);
  placeBuilding({ w: 12, d: 10, stories: 2, seed: 304, styleIdx: 4 }, 12, 25, -Math.PI / 2);

  // Ruined building — NE of intersection
  const ruin = buildRuinedBuilding({ w: 13, d: 11, seed: 401, styleIdx: 0, h: 7 });
  ruin.position.set(30, 0, -16.5);
  root.add(ruin);
  minimapShapes.push({ type: 'b', x: 30, z: -16.5, w: 13, d: 11 });
  addCover(24, -10); addCover(37, -11);

  /* --------------------------- boundary walls -------------------------- */

  const boundary = (x, z, len, yaw) => {
    const wSeg = buildCompoundWall(len, 3, rng.int(0, 4));
    wSeg.position.set(x, 0, z);
    wSeg.rotation.y = yaw;
    root.add(wSeg);
    minimapShapes.push({ type: 'w', x, z, w: yaw === 0 ? len : 0.6, d: yaw === 0 ? 0.6 : len });
  };
  // West end of street: rubble barricade + wall
  boundary(-62, -4, 9, Math.PI / 2);
  boundary(-62, 4, 9, Math.PI / 2);
  const westRubble = buildRubblePile(4.2, 1.7, 11);
  westRubble.position.set(-64, 0, 0);
  root.add(westRubble);
  colliders.addBox(-65, 2, 0, 6, 4, 14);
  // East end
  boundary(68, -4.5, 10, Math.PI / 2);
  boundary(68, 4.5, 10, Math.PI / 2);
  const eastBarr = buildJerseyBarrier(3);
  for (let i = 0; i < 3; i++) {
    const jb = eastBarr.clone();
    jb.position.set(60, 0, -4 + i * 3.2);
    jb.rotation.y = Math.PI / 2 + rng.spread(0.1);
    root.add(jb);
  }
  colliders.addBox(60.2, 0.5, 0, 1.2, 1, 10);
  addCover(57, -2); addCover(57, 2);
  // North & south arms
  boundary(-4.5, -46, 9, 0);
  boundary(4.5, -46, 9, 0);
  boundary(-4.5, 46, 9, 0);
  boundary(4.5, 46, 9, 0);

  // Hard invisible bounds
  colliders.addBox(0, 5, -75, 240, 10, 4);
  colliders.addBox(0, 5, 75, 240, 10, 4);
  colliders.addBox(-75, 5, 0, 4, 10, 240);
  colliders.addBox(75, 5, 0, 4, 10, 240);

  /* ------------------------------- props ------------------------------- */

  const place = (obj, x, z, yaw = 0, opts = {}) => {
    obj.position.set(x, opts.y ?? 0, z);
    obj.rotation.y = yaw;
    root.add(obj);
    if (opts.collide !== false) {
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      if (opts.collH) box.max.y = box.min.y + opts.collH;
      colliders.boxes.push({ min: box.min.clone(), max: box.max.clone(), tag: opts.tag ?? 'prop' });
    }
    return obj;
  };

  // Wrecked bus — centerpiece mid-street
  place(buildBus({ burned: true }), 10, 1.2, 0, { collH: 3.4 });
  minimapShapes.push({ type: 'p', x: 10, z: 1.2, w: 10, d: 3 });
  addCover(3.5, 1.5); addCover(16.5, 1);

  // Parked / abandoned cars
  const carDefs = [
    [-38, 6.3, 0.15, {}], [-24, -6.6, -0.1, {}], [-13, 6.5, 3.2, {}],
    [20, -6.2, 0.28, { burned: true }], [30, 5.9, -3.05, {}], [44, -5.8, 0.1, { burned: true }],
    [-45, -6.4, 0.05, { pickup: true }], [38, 6.4, 2.9, { pickup: true }],
  ];
  for (const [x, z, yaw, o] of carDefs) {
    place(buildCar(o), x, z, yaw, { collH: 1.5 });
    minimapShapes.push({ type: 'p', x, z, w: 4.4, d: 2 });
    addCover(x - 3, z); addCover(x + 3, z);
  }

  // Jersey barrier chicane near intersection
  for (const [x, z, yaw] of [[-6, -3.4, 0.2], [-3, -3.8, -0.1], [6, 3.6, 0.15], [3, 4, -0.2]]) {
    place(buildJerseyBarrier(3), x, z, yaw, { collH: 0.9 });
    addCover(x, z + (z > 0 ? 1.4 : -1.4));
  }

  // Sandbag positions
  place(buildSandbagWall(3, 6), -46, 1.8, 0.12, { collH: 0.75 });
  addCover(-46, 3);
  place(buildSandbagWall(3, 5), 48, -1.5, -0.08, { collH: 0.75 });
  addCover(48, -3);
  place(buildSandbagWall(2, 4), 0, -12.5, 1.62, { collH: 0.55 });
  addCover(1.5, -12.5);

  // Market stalls on south sidewalk
  place(buildMarketStall(1), -22, 7.6, 0.06, { collH: 1.1 });
  place(buildMarketStall(2), -17.4, 7.8, -0.1, { collH: 1.1 });
  addCover(-19.5, 5.8);

  // Dumpster in north alley
  place(buildDumpster(), -14.5, -11.5, 0.3, { collH: 1.3 });
  addCover(-14.5, -9.6);

  // Barrels, tires, crates
  for (const [x, z] of [[-30.5, -7.4], [-29.7, -7.9], [25, 7.3], [52, 2.8], [51.2, 3.5]]) {
    place(buildBarrel({ color: rng.pick([0x5a6a52, 0x71624a, 0x4a5c66]) }), x, z, rng() * 3, { collH: 0.95 });
  }
  place(buildTireStack(4), -8.5, 7.6, 0, { collH: 1.1 });
  place(buildTireStack(3), 33.5, -6.9, 0, { collH: 0.9 });
  for (const [x, z] of [[42, 7.1], [42.9, 7.4], [42.4, 7.0]]) {
    place(buildCrate(0.75 + rng() * 0.3), x, z, rng(), { collH: 0.9 });
  }
  addCover(42, 5.6);

  // Power poles + wires along north sidewalk
  const poleXs = [-48, -30, -12, 6, 24, 42, 58];
  const poleTops = [];
  for (const px of poleXs) {
    place(buildPowerPole(8), px, -7.6, rng.spread(0.06), { collH: 8, tag: 'pole' });
    poleTops.push(new THREE.Vector3(px, 7.55, -7.6));
  }
  for (let i = 0; i < poleTops.length - 1; i++) {
    for (const off of [-0.6, 0, 0.6]) {
      const a = poleTops[i].clone(); a.x += off * 0.4; a.y += off === 0 ? 0.1 : 0;
      const b = poleTops[i + 1].clone(); b.x += off * 0.4; b.y += off === 0 ? 0.1 : 0;
      a.z += off * 0.12; b.z += off * 0.12;
      root.add(buildWire(a, b, 0.7 + rng() * 0.3));
    }
  }
  // Drop lines across the street to south buildings
  for (const i of [1, 3, 5]) {
    const a = poleTops[i].clone();
    const b = new THREE.Vector3(poleTops[i].x + 3, 6.2, 9.8);
    root.add(buildWire(a, b, 1.1));
  }

  // Street lights on south side
  for (const sx of [-40, -20, 16, 36, 54]) {
    place(buildStreetLight(6.4), sx, 7.4, Math.PI, { collH: 6.4, tag: 'pole' });
  }

  // Extra rubble piles + blast crater east
  place(buildRubblePile(2.6, 1.0, 21), 24, -8.7, 0, { collH: 1.0 });
  place(buildRubblePile(1.8, 0.7, 22), -34, 7.9, 0, { collH: 0.7 });
  const craterMat = new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 1, transparent: true, opacity: 0.85 });
  const crater = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), craterMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(36, 0.05, 1.5);
  root.add(crater);
  place(buildRubblePile(2.0, 0.5, 23), 36, 1.5, 0, { collH: 0.5 });

  /* ---------------------------- street banner --------------------------- */

  const bannerCanvas = canvas(512, 128);
  {
    const c2 = bannerCanvas.getContext('2d');
    c2.fillStyle = '#6a2c22';
    c2.fillRect(0, 0, 512, 128);
    c2.strokeStyle = '#d8c9a8'; c2.lineWidth = 5;
    c2.strokeRect(14, 14, 484, 100);
    c2.fillStyle = '#d8c9a8';
    c2.font = 'bold 56px Georgia';
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText('\u0633\u0648\u0642 \u0627\u0644\u0645\u062F\u064A\u0646\u0629', 256, 64);
    for (let i = 0; i < 120; i++) {
      c2.fillStyle = `rgba(30,20,14,${rng() * 0.3})`;
      c2.fillRect(rng() * 512, rng() * 128, rng() * 26, rng() * 5);
    }
  }
  const bannerMat = new THREE.MeshStandardMaterial({ map: tex(bannerCanvas, { srgb: true }), roughness: 0.95 });
  const bannerGeo = new THREE.PlaneGeometry(11, 2.2, 12, 2);
  {
    const pa = bannerGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i);
      pa.setZ(i, Math.cos((x / 11) * Math.PI) * -0.5);
      pa.setY(i, pa.getY(i) - Math.cos((x / 11) * Math.PI * 2) * 0.18);
    }
    bannerGeo.computeVertexNormals();
  }
  // Two front-facing planes back-to-back so the text is never mirrored
  for (const dir of [1, -1]) {
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(-14 - dir * 0.015, 6.4, 0);
    banner.rotation.y = dir * Math.PI / 2;
    banner.castShadow = true;
    root.add(banner);
  }

  /* --------------------------- ground scatter --------------------------- */

  // Stones
  const stoneGeo = new THREE.DodecahedronGeometry(0.07, 0);
  const stones = new THREE.InstancedMesh(stoneGeo, lib.rubble, 260);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eu = new THREE.Euler();
  for (let i = 0; i < 260; i++) {
    const x = rng.spread(66), z = rng.spread(66);
    eu.set(rng() * 3, rng() * 3, rng() * 3);
    q.setFromEuler(eu);
    const s = 0.5 + rng() * 1.6;
    m4.compose(new THREE.Vector3(x, 0.04, z), q, new THREE.Vector3(s, s * 0.7, s));
    stones.setMatrixAt(i, m4);
  }
  stones.castShadow = true;
  stones.receiveShadow = true;
  root.add(stones);

  // Papers / trash
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 1, side: THREE.DoubleSide });
  const paperGeo = new THREE.PlaneGeometry(0.28, 0.36);
  const papers = new THREE.InstancedMesh(paperGeo, paperMat, 70);
  for (let i = 0; i < 70; i++) {
    const x = rng.spread(60), z = rng.spread(20);
    eu.set(-Math.PI / 2 + rng.spread(0.3), 0, rng() * Math.PI);
    q.setFromEuler(eu);
    m4.compose(new THREE.Vector3(x, 0.05, z), q, new THREE.Vector3(1, 1, 1));
    papers.setMatrixAt(i, m4);
  }
  papers.receiveShadow = true;
  root.add(papers);

  // Sand drifts along curbs
  const driftMat = matWithRepeat(lib.dirt, 5, 0.4);
  for (const [x, z, len] of [[-30, -6.1, 16], [12, 6.15, 20], [40, -6.05, 14]]) {
    const drift = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.4), driftMat);
    drift.rotation.x = -Math.PI / 2;
    drift.position.set(x, 0.06, z);
    root.add(drift);
  }

  /* ---------------------------- distant scenery -------------------------- */

  buildDistantScenery(scene);

  /* --------------------------- collider bake --------------------------- */

  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.userData && o.userData.collider) {
      o.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(o);
      colliders.boxes.push({ min: box.min.clone(), max: box.max.clone(), tag: 'building' });
    }
  });

  /* ------------------------------ metadata ------------------------------ */

  const enemySpawns = [
    new THREE.Vector3(58, 0, -2.5),
    new THREE.Vector3(58, 0, 3),
    new THREE.Vector3(2.5, 0, -42),
    new THREE.Vector3(-2.5, 0, 42),
    new THREE.Vector3(30, 0, -10.5),
    new THREE.Vector3(42, 0, 8.5),
  ];
  // Extra mid-street cover markers
  addCover(-6.5, -2); addCover(6.5, 4.4); addCover(-19, 6); addCover(30, 4.5);

  return {
    root,
    playerSpawn: { pos: new THREE.Vector3(-51, 0, 1.2), yaw: -Math.PI / 2 },
    enemySpawns,
    coverPoints,
    minimapShapes,
    halfSize: 70,
  };
}
