import * as THREE from 'three';
import { mergeStatic } from './merge.js';
import {
  BOW_Z,
  STERN_Z,
  deckHalfWidthAt,
  deckYAt,
  hullNormal,
  hullPoint,
  railHalfWidthAt,
  railYAt,
  tAtZ,
  transomZAt,
  vAtHeight,
} from './hull.js';

/**
 * Everything that sits on, hangs off or pokes through the hull: raised decks,
 * the great cabin, guns, ground tackle, and the clutter that makes a deck feel
 * lived on.
 */

function plankedPlatform(zFrom, zTo, y, inset, material) {
  const steps = 24;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= steps; i++) {
    const z = zFrom + (zTo - zFrom) * (i / steps);
    const hw = Math.max(deckHalfWidthAt(tAtZ(z)) - inset, 0.2);
    positions.push(-hw, y, z, hw, y, z);
    uvs.push(z / 16, -hw / 7.8, z / 16, hw / 7.8);
  }
  for (let i = 0; i < steps; i++) {
    const p = i * 2;
    indices.push(p, p + 2, p + 3, p, p + 3, p + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Posts and a top rail following the deck edge between two stations. */
function railing(zFrom, zTo, y, inset, height, materials, { sides = [-1, 1] } = {}) {
  const group = new THREE.Group();
  const steps = Math.max(3, Math.round(Math.abs(zTo - zFrom) / 1.3));
  for (const side of sides) {
    const railPoints = [];
    for (let i = 0; i <= steps; i++) {
      const z = zFrom + (zTo - zFrom) * (i / steps);
      const hw = Math.max(deckHalfWidthAt(tAtZ(z)) - inset, 0.2);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, 0.12), materials.darkTimber);
      post.position.set(side * hw, y + height / 2, z);
      post.castShadow = true;
      group.add(post);
      railPoints.push(new THREE.Vector3(side * hw, y + height, z));
    }
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPoints), steps * 2, 0.075, 5, false),
      materials.darkTimber,
    );
    rail.castShadow = true;
    group.add(rail);
    const midRail = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(railPoints.map((p) => p.clone().setY(p.y - height * 0.5))),
        steps * 2,
        0.05,
        5,
        false,
      ),
      materials.darkTimber,
    );
    group.add(midRail);
  }
  return group;
}

/** Bulkhead closing the front of a raised deck, with a door and windows. */
function bulkhead(z, deckY, topY, materials, { door = true, windows = 0 } = {}) {
  const group = new THREE.Group();
  const hw = deckHalfWidthAt(tAtZ(z));
  const height = topY - deckY;

  const wall = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, height, 0.22), materials.deck);
  wall.position.set(0, deckY + height / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 0.1, 0.16, 0.3), materials.trim);
  trim.position.set(0, topY - 0.1, z);
  group.add(trim);

  if (door) {
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.12), materials.darkTimber);
    doorMesh.position.set(0, deckY + 0.95, z + 0.16);
    group.add(doorMesh);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), materials.brass);
    knob.position.set(0.38, deckY + 1.0, z + 0.24);
    group.add(knob);
  }

  for (let i = 0; i < windows; i++) {
    const offset = (i - (windows - 1) / 2) * 1.5;
    if (Math.abs(offset) < 0.9) continue;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.1), materials.darkTimber);
    frame.position.set(offset, deckY + height * 0.62, z + 0.16);
    group.add(frame);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.62), materials.glass);
    pane.position.set(offset, deckY + height * 0.62, z + 0.23);
    group.add(pane);
  }

  return group;
}

function ladder(x, zTop, fromY, toY, materials) {
  const group = new THREE.Group();
  const rise = toY - fromY;
  const run = rise * 0.75;
  const steps = Math.max(3, Math.round(rise / 0.32));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 0.34), materials.timber);
    step.position.set(x, fromY + rise * k - 0.05, zTop + run * (1 - k) + 0.2);
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
  }
  for (const side of [-0.6, 0.6]) {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, Math.hypot(rise, run)), materials.darkTimber);
    stringer.position.set(x + side, fromY + rise / 2, zTop + run / 2 + 0.2);
    stringer.rotation.x = -Math.atan2(rise, run) + Math.PI / 2;
    group.add(stringer);
  }
  return group;
}

function barrel(materials, radius = 0.45, height = 1.1) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.86, radius * 0.86, height, 14, 1),
    materials.timber,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height * 0.5, 14, 1), materials.timber);
  group.add(belly);
  for (const y of [-height * 0.36, 0, height * 0.36]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.94, 0.035, 5, 16), materials.iron);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
    group.add(hoop);
  }
  return group;
}

function crate(materials, size = 0.9) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.82, size * 1.1), materials.deck);
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);
  for (const axis of ['x', 'z']) {
    const strap = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(size + 0.04, 0.09, size * 1.1 + 0.04)
        : new THREE.BoxGeometry(size + 0.04, size * 0.82 + 0.04, 0.09),
      materials.darkTimber,
    );
    group.add(strap);
  }
  return group;
}

function ropeCoil(materials, radius = 0.42) {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(radius - i * 0.09, 0.055, 5, 18),
      materials.timber,
    );
    loop.rotation.x = Math.PI / 2;
    loop.position.y = i * 0.1;
    loop.castShadow = true;
    group.add(loop);
  }
  return group;
}

function lantern(materials, scale = 1) {
  const group = new THREE.Group();
  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26 * scale, 0.3 * scale, 0.5 * scale, 6, 1, true),
    materials.brass,
  );
  group.add(cage);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.19 * scale, 10, 8), materials.glass);
  group.add(glow);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34 * scale, 0.26 * scale, 6), materials.brass);
  cap.position.y = 0.36 * scale;
  group.add(cap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.24 * scale, 0.12 * scale, 6), materials.brass);
  base.position.y = -0.29 * scale;
  group.add(base);

  const light = new THREE.PointLight('#ffb257', 6 * scale * scale, 14 * scale, 2);
  group.add(light);
  group.userData.dynamic = true;
  group.userData.light = light;
  group.userData.baseIntensity = light.intensity;
  group.userData.glow = glow;
  return group;
}

/** Height of the bore above the deck; the gunports are cut to match. */
const BARREL_HEIGHT = 0.66;

/** A muzzle-loading gun on a four-truck carriage, barrel pointing +X. */
function cannon(materials) {
  const group = new THREE.Group();
  const barrel = new THREE.Group();

  const breech = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.85, 12), materials.iron);
  breech.rotation.z = -Math.PI / 2;
  breech.position.x = 0.1;
  barrel.add(breech);

  const chase = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.19, 1.35, 12), materials.iron);
  chase.rotation.z = -Math.PI / 2;
  chase.position.x = 1.15;
  barrel.add(chase);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.145, 0.24, 12), materials.iron);
  muzzle.rotation.z = -Math.PI / 2;
  muzzle.position.x = 1.92;
  barrel.add(muzzle);

  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10), materials.black);
  bore.rotation.z = -Math.PI / 2;
  bore.position.x = 2.03;
  barrel.add(bore);

  const cascabel = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), materials.iron);
  cascabel.position.x = -0.36;
  barrel.add(cascabel);

  for (const x of [0.55, 1.0]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 6, 14), materials.iron);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    barrel.add(ring);
  }
  for (const side of [-1, 1]) {
    const trunnion = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), materials.iron);
    trunnion.rotation.x = Math.PI / 2;
    trunnion.position.set(0.62, -0.02, side * 0.22);
    barrel.add(trunnion);
  }

  barrel.position.y = BARREL_HEIGHT;
  barrel.traverse((child) => {
    child.castShadow = true;
  });
  group.add(barrel);

  const carriage = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, 0.7), materials.darkTimber);
  bed.position.y = 0.3;
  carriage.add(bed);
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 0.13), materials.darkTimber);
    cheek.position.set(-0.05, 0.5, side * 0.28);
    carriage.add(cheek);
  }
  for (const x of [-0.4, 0.42]) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 10), materials.darkTimber);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.17, side * 0.32);
      carriage.add(wheel);
    }
  }
  carriage.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  group.add(carriage);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(2.15, BARREL_HEIGHT, 0);
  muzzleAnchor.userData.keep = true;
  group.add(muzzleAnchor);
  group.userData.muzzle = muzzleAnchor;

  // Guns recoil as a unit, so bake each one down to a handful of draw calls.
  mergeStatic(group);
  group.userData.dynamic = true;
  return group;
}

/** Ship's wheel on its binnacle stand. */
function helm(materials) {
  const group = new THREE.Group();

  for (const side of [-1, 1]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.35, 0.3), materials.darkTimber);
    stand.position.set(side * 0.62, 0.68, 0);
    stand.castShadow = true;
    group.add(stand);
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 12), materials.timber);
  drum.rotation.z = Math.PI / 2;
  drum.position.y = 1.15;
  group.add(drum);

  const wheel = new THREE.Group();
  wheel.position.y = 1.15;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.07, 8, 28), materials.timber);
  wheel.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 10), materials.brass);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.05, 6), materials.timber);
    spoke.rotation.z = angle;
    wheel.add(spoke);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.42, 6), materials.darkTimber);
    handle.position.set(Math.cos(angle) * 1.03, Math.sin(angle) * 1.03, 0);
    handle.rotation.z = angle;
    wheel.add(handle);
  }
  wheel.traverse((child) => {
    child.castShadow = true;
  });
  mergeStatic(wheel);
  wheel.userData.dynamic = true;
  group.add(wheel);
  group.userData.wheel = wheel;

  return group;
}

function capstan(materials) {
  const group = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.0, 12), materials.timber);
  drum.position.y = 0.5;
  drum.castShadow = true;
  group.add(drum);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.24, 12), materials.darkTimber);
  head.position.y = 1.05;
  group.add(head);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.7, 6), materials.timber);
    bar.rotation.z = Math.PI / 2;
    bar.rotation.y = angle;
    bar.position.set(Math.cos(angle) * 0.85, 1.02, Math.sin(angle) * 0.85);
    bar.castShadow = true;
    group.add(bar);
  }
  return group;
}

function grating(materials, width, length) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, 0.18, length + 0.24), materials.darkTimber);
  group.add(frame);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, length), materials.black);
  hole.position.y = 0.03;
  group.add(hole);
  for (let x = -width / 2 + 0.15; x < width / 2; x += 0.3) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, length), materials.timber);
    bar.position.set(x, 0.12, 0);
    group.add(bar);
  }
  for (let z = -length / 2 + 0.15; z < length / 2; z += 0.3) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.06), materials.timber);
    bar.position.set(0, 0.14, z);
    group.add(bar);
  }
  group.traverse((child) => {
    child.receiveShadow = true;
  });
  return group;
}

/** Small open boat stowed on deck, lofted like a miniature of the ship. */
function longboat(materials) {
  const length = 5.4;
  const beam = 1.7;
  const depth = 0.85;
  const stations = 18;
  const sections = 8;
  const ringSize = sections * 2 + 1;
  const positions = [];
  const uvs = [];
  const indices = [];

  const widthAt = (t) => Math.sin(Math.pow(Math.min(t * 1.06, 1), 0.8) * Math.PI) * 0.92 + 0.08;

  for (let i = 0; i < stations; i++) {
    const t = i / (stations - 1);
    const z = (t - 0.5) * length;
    const halfBeam = (beam / 2) * widthAt(t);
    const keelY = -depth * (0.65 + 0.35 * Math.sin(t * Math.PI));
    for (let j = 0; j < ringSize; j++) {
      const side = j < sections ? -1 : 1;
      const v = j < sections ? 1 - j / sections : (j - sections) / sections;
      const w = Math.sin(Math.pow(v, 0.6) * Math.PI * 0.5);
      positions.push(side * halfBeam * w, keelY + (0 - keelY) * v, z);
      uvs.push(t * 2, v);
    }
  }
  for (let i = 0; i < stations - 1; i++) {
    for (let j = 0; j < ringSize - 1; j++) {
      const a = i * ringSize + j;
      const b = (i + 1) * ringSize + j;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = materials.deck.clone();
  material.side = THREE.DoubleSide;
  const boat = new THREE.Group();
  const shell = new THREE.Mesh(geometry, material);
  shell.castShadow = true;
  shell.receiveShadow = true;
  boat.add(shell);

  for (const z of [-1.4, 0.1, 1.6]) {
    const thwart = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.28), materials.timber);
    thwart.position.set(0, -0.08, z);
    boat.add(thwart);
  }
  const oars = new THREE.Group();
  for (const side of [-1, 1]) {
    const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 3.4, 6), materials.timber);
    oar.rotation.x = Math.PI / 2;
    oar.position.set(side * 0.35, -0.2, 0.4);
    oars.add(oar);
  }
  boat.add(oars);

  return boat;
}

function anchor(materials) {
  const group = new THREE.Group();
  const shank = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), materials.iron);
  group.add(shank);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.22), materials.timber);
  stock.position.y = 1.5;
  group.add(stock);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 16), materials.iron);
  ring.position.y = 1.95;
  group.add(ring);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.18), materials.iron);
    arm.position.set(side * 0.62, -1.5, 0);
    arm.rotation.z = side * 0.55;
    group.add(arm);
    const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 4), materials.iron);
    fluke.position.set(side * 1.15, -1.05, 0);
    fluke.rotation.z = side * -0.6;
    group.add(fluke);
  }
  group.traverse((child) => {
    child.castShadow = true;
  });
  return group;
}

/** Carved and gilded transom with the great cabin windows. */
function sternGallery(materials) {
  const group = new THREE.Group();
  const rake = 0.15; // the board leans aft, so fittings tilt with it

  const windowY = 3.15;
  for (let i = -1; i <= 1; i++) {
    const z = transomZAt(windowY);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.45, 0.14), materials.darkTimber);
    frame.position.set(i * 1.42, windowY, z - 0.07);
    frame.rotation.x = rake;
    group.add(frame);

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 1.22), materials.glass);
    pane.position.set(i * 1.42, windowY, z - 0.15);
    pane.rotation.y = Math.PI;
    pane.rotation.x = -rake;
    group.add(pane);

    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.3, 0.05), materials.darkTimber);
    mullion.position.set(i * 1.42, windowY, z - 0.18);
    mullion.rotation.x = rake;
    group.add(mullion);
    const transomBar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.05), materials.darkTimber);
    transomBar.position.set(i * 1.42, windowY, z - 0.18);
    transomBar.rotation.x = rake;
    group.add(transomBar);
  }

  for (const y of [2.1, 4.75]) {
    const halfWidth = Math.abs(hullPoint(0, vAtHeight(0, y), 1, new THREE.Vector3()).x);
    const band = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 2 + 0.1, 0.2, 0.16), materials.trim);
    band.position.set(0, y, transomZAt(y) - 0.1);
    band.rotation.x = rake;
    group.add(band);
  }

  const nameY = 4.2;
  const nameBoard = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.78, 0.12), materials.nameBoard);
  nameBoard.position.set(0, nameY, transomZAt(nameY) - 0.09);
  nameBoard.rotation.x = rake;
  group.add(nameBoard);

  for (const side of [-1, 1]) {
    const scroll = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 14, Math.PI * 1.4), materials.trim);
    scroll.position.set(side * 2.35, 4.2, transomZAt(4.2) - 0.12);
    scroll.rotation.y = Math.PI / 2;
    scroll.rotation.z = side * 0.5;
    group.add(scroll);
  }

  const crest = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), materials.trim);
  crest.position.set(0, 5.2, transomZAt(5.2) - 0.08);
  crest.scale.set(1.5, 0.8, 0.45);
  group.add(crest);

  group.traverse((child) => {
    child.castShadow = true;
  });
  return group;
}

export function buildDetails(materials) {
  const group = new THREE.Group();
  group.name = 'details';
  const cannons = [];
  const lanterns = [];

  const QUARTER_Y = 4.62;
  const QUARTER_Z0 = STERN_Z + 0.4;
  const QUARTER_Z1 = -4.2;
  const FORE_Y = 4.45;
  const FORE_Z0 = 9.6;
  const FORE_Z1 = BOW_Z - 0.6;

  // ---- Raised decks ------------------------------------------------------
  const quarterDeck = plankedPlatform(QUARTER_Z0, QUARTER_Z1, QUARTER_Y, 0, materials.deck);
  group.add(quarterDeck);
  group.add(bulkhead(QUARTER_Z1, deckYAt(tAtZ(QUARTER_Z1)), QUARTER_Y, materials, { windows: 4 }));
  group.add(railing(QUARTER_Z1 + 0.2, QUARTER_Z0 + 1.5, QUARTER_Y, 0.05, 0.95, materials));

  const foreDeck = plankedPlatform(FORE_Z0, FORE_Z1, FORE_Y, 0, materials.deck);
  group.add(foreDeck);
  group.add(bulkhead(FORE_Z0, deckYAt(tAtZ(FORE_Z0)), FORE_Y, materials, { door: false, windows: 2 }));
  group.add(railing(FORE_Z0 + 0.3, FORE_Z1 - 0.4, FORE_Y, 0.05, 0.85, materials));

  // Supporting beams under the raised decks.
  for (const [z0, z1, y] of [
    [QUARTER_Z0, QUARTER_Z1, QUARTER_Y],
    [FORE_Z0, FORE_Z1, FORE_Y],
  ]) {
    for (let z = Math.min(z0, z1) + 0.8; z < Math.max(z0, z1); z += 1.6) {
      const hw = deckHalfWidthAt(tAtZ(z));
      const beam = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.22, 0.2), materials.darkTimber);
      beam.position.set(0, y - 0.16, z);
      beam.castShadow = true;
      group.add(beam);
    }
  }

  group.add(ladder(-2.2, QUARTER_Z1 - 0.1, deckYAt(tAtZ(QUARTER_Z1)), QUARTER_Y, materials));
  group.add(ladder(2.2, QUARTER_Z1 - 0.1, deckYAt(tAtZ(QUARTER_Z1)), QUARTER_Y, materials));

  const foreLadder = ladder(0, -FORE_Z0 - 0.1, deckYAt(tAtZ(FORE_Z0)), FORE_Y, materials);
  foreLadder.rotation.y = Math.PI;
  group.add(foreLadder);

  group.add(sternGallery(materials));

  // ---- Helm, capstan, hatches -------------------------------------------
  const wheelStand = helm(materials);
  wheelStand.position.set(0, QUARTER_Y, -6.6);
  group.add(wheelStand);

  const capstanMesh = capstan(materials);
  capstanMesh.position.set(0, deckYAt(tAtZ(2.4)), 2.4);
  group.add(capstanMesh);

  const mainHatch = grating(materials, 2.4, 3.0);
  mainHatch.position.set(0, deckYAt(tAtZ(-1.0)) + 0.05, 4.9);
  group.add(mainHatch);

  const foreHatch = grating(materials, 1.6, 1.8);
  foreHatch.position.set(0, deckYAt(tAtZ(6.6)) + 0.05, 6.6);
  group.add(foreHatch);

  // ---- Guns --------------------------------------------------------------
  const gunStations = [-2.2, 0.9, 4.0, 7.1];
  const surface = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (const z of gunStations) {
    const t = tAtZ(z);
    const deckY = deckYAt(t);
    const portY = deckY + BARREL_HEIGHT;
    const v = vAtHeight(t, portY);

    for (const side of [-1, 1]) {
      hullPoint(t, v, side, surface);
      hullNormal(t, v, side, normal);

      const gun = cannon(materials);
      gun.position.set(side * (deckHalfWidthAt(t) - 1.05), deckY, z);
      gun.rotation.y = side > 0 ? 0 : Math.PI;
      gun.userData.home = gun.position.clone();
      gun.userData.side = side;
      group.add(gun);
      cannons.push(gun);

      // Gunport: a dark opening in the bulwark, framed, with its lid triced up.
      const port = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.9), materials.black);
      port.position.copy(surface).addScaledVector(normal, 0.02);
      port.lookAt(surface.clone().addScaledVector(normal, 2));
      group.add(port);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.08, 0.1), materials.darkTimber);
      frame.position.copy(surface).addScaledVector(normal, -0.04);
      frame.lookAt(surface.clone().addScaledVector(normal, 2));
      group.add(frame);

      const hinge = new THREE.Group();
      hinge.position.copy(surface).addScaledVector(normal, 0.06).setY(portY + 0.5);
      hinge.lookAt(hinge.position.clone().addScaledVector(normal, 2));
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.96, 0.07), materials.deck);
      lid.position.set(0, 0.48, 0.01);
      hinge.add(lid);
      const batten = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.1, 0.05), materials.darkTimber);
      batten.position.set(0, 0.48, 0.06);
      hinge.add(batten);
      hinge.rotateX(0.95);
      group.add(hinge);
    }
  }

  // Stern chasers on the quarterdeck, pointing aft.
  for (const side of [-1, 1]) {
    const gun = cannon(materials);
    gun.position.set(side * 1.9, QUARTER_Y, STERN_Z + 2.6);
    gun.rotation.y = -Math.PI / 2;
    gun.userData.home = gun.position.clone();
    gun.userData.side = side;
    gun.scale.setScalar(0.85);
    group.add(gun);
    cannons.push(gun);
  }

  // ---- Channels: the ledges the shrouds are set up to ---------------------
  for (const z of [7.6, -1.0, -9.6]) {
    for (const side of [-1, 1]) {
      const t = tAtZ(z);
      const channel = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 4.4), materials.darkTimber);
      channel.position.set(side * (railHalfWidthAt(t) + 0.3), railYAt(t) - 0.15, z - 0.6);
      channel.castShadow = true;
      group.add(channel);
      for (let i = 0; i < 5; i++) {
        const deadeye = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 8), materials.timber);
        deadeye.position.set(side * (railHalfWidthAt(t) + 0.5), railYAt(t) - 0.02, z - 2.6 + i * 1.35);
        group.add(deadeye);
      }
    }
  }

  // ---- Ground tackle -----------------------------------------------------
  const bowAnchor = anchor(materials);
  const anchorT = tAtZ(12.2);
  hullPoint(anchorT, vAtHeight(anchorT, 3.9), 1, surface);
  hullNormal(anchorT, vAtHeight(anchorT, 3.9), 1, normal);
  bowAnchor.position.copy(surface).addScaledVector(normal, 0.35);
  bowAnchor.rotation.z = 0.12;
  bowAnchor.rotation.y = -0.35;
  group.add(bowAnchor);

  // ---- Deck clutter ------------------------------------------------------
  const clutter = [
    { make: () => barrel(materials), x: -2.9, z: -2.6 },
    { make: () => barrel(materials, 0.4, 0.95), x: -3.2, z: -1.5 },
    { make: () => barrel(materials, 0.42, 1.0), x: 3.1, z: 5.9 },
    { make: () => crate(materials, 1.0), x: 2.9, z: -2.2, rot: 0.3 },
    { make: () => crate(materials, 0.8), x: 3.1, z: -3.3, rot: -0.2 },
    { make: () => ropeCoil(materials), x: -3.3, z: 3.6 },
    { make: () => ropeCoil(materials, 0.34), x: 3.3, z: 1.2 },
    { make: () => barrel(materials, 0.38, 0.9), x: -3.0, z: 7.4 },
  ];
  for (const item of clutter) {
    const object = item.make();
    object.position.set(item.x, deckYAt(tAtZ(item.z)), item.z);
    object.rotation.y = item.rot || 0;
    group.add(object);
  }

  const boat = longboat(materials);
  boat.position.set(0, deckYAt(tAtZ(0.2)) + 1.05, 0.2);
  group.add(boat);
  for (const z of [-1.9, 2.3]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.2), materials.darkTimber);
    skid.position.set(0, deckYAt(tAtZ(z)) + 0.55, z);
    group.add(skid);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), materials.darkTimber);
      post.position.set(side * 1.45, deckYAt(tAtZ(z)) + 0.1, z);
      group.add(post);
    }
  }

  // ---- Lights ------------------------------------------------------------
  const sternLantern = lantern(materials, 1.6);
  sternLantern.position.set(0, railYAt(0) + 1.5, STERN_Z + 1.0);
  group.add(sternLantern);
  lanterns.push(sternLantern);

  for (const side of [-1, 1]) {
    const quarterLantern = lantern(materials, 0.9);
    quarterLantern.position.set(side * 2.4, QUARTER_Y + 1.5, -5.0);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), materials.iron);
    post.position.set(side * 2.4, QUARTER_Y + 0.75, -5.0);
    group.add(post, quarterLantern);
    lanterns.push(quarterLantern);
  }

  // ---- Rudder ------------------------------------------------------------
  const rudder = new THREE.Group();
  rudder.userData.dynamic = true;
  rudder.position.set(0, 0.6, STERN_Z + 0.55);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 1.6), materials.darkTimber);
  blade.position.set(0, -1.9, -0.65);
  blade.castShadow = true;
  rudder.add(blade);
  const tiller = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 2.2, 8), materials.timber);
  tiller.rotation.x = Math.PI / 2;
  tiller.position.set(0, 0.2, 1.0);
  rudder.add(tiller);
  group.add(rudder);

  return {
    group,
    wheel: wheelStand.userData.wheel,
    rudder,
    cannons,
    lanterns,
  };
}
