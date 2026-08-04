import * as THREE from 'three';
import { deckYAt, railHalfWidthAt, railYAt, tAtZ } from './hull.js';

/**
 * Masts, spars, canvas and cordage. Sails and flags keep a copy of their flat
 * geometry so they can be re-billowed every frame from the wind strength.
 */

const MASTS = [
  { name: 'fore', z: 7.6, baseY: 2.45, lower: 13.5, upper: 9.5, radius: 0.42 },
  { name: 'main', z: -1.0, baseY: 2.42, lower: 16.0, upper: 11.5, radius: 0.5 },
  { name: 'mizzen', z: -9.6, baseY: 4.55, lower: 11.0, upper: 7.0, radius: 0.34 },
];

const RAKE = -0.045; // masts lean aft

/**
 * Flat sail grid in the XY plane: y = 0 at the head (bent to the yard) down to
 * y = -height at the foot. The width factor lets the same builder make square
 * sails, tapered courses and triangular headsails.
 */
function sailGeometry(width, height, headFactor, footFactor, wSegs = 14, hSegs = 10) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= hSegs; j++) {
    const v = j / hSegs;
    const factor = headFactor + (footFactor - headFactor) * v;
    for (let i = 0; i <= wSegs; i++) {
      const u = i / wSegs;
      positions.push((u - 0.5) * width * factor, -v * height, 0);
      uvs.push(u, 1 - v);
    }
  }
  for (let j = 0; j < hSegs; j++) {
    for (let i = 0; i < wSegs; i++) {
      const a = j * (wSegs + 1) + i;
      const b = a + wSegs + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.base = Float32Array.from(positions);
  return geometry;
}

function makeSail(materials, options) {
  const { width, height, headFactor = 1, footFactor = 1, belly = 1, phase = 0 } = options;
  const geometry = sailGeometry(width, height, headFactor, footFactor);
  const mesh = new THREE.Mesh(geometry, materials.sail);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.sail = { belly, phase, width, height };
  mesh.userData.dynamic = true;
  return mesh;
}

/** Push the canvas out into a belly and ripple it; called every frame. */
export function billowSail(mesh, wind, time) {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const base = geometry.userData.base;
  const uv = geometry.attributes.uv;
  const { belly, phase, width, height } = mesh.userData.sail;
  const strength = (0.16 + wind * 0.84) * belly;

  for (let i = 0; i < position.count; i++) {
    const u = uv.getX(i);
    const v = 1 - uv.getY(i);
    const across = Math.sin(Math.PI * u);
    const down = Math.sin(Math.PI * Math.pow(v, 0.85));
    const bulge = across * down * strength * width * 0.13;
    const ripple =
      Math.sin(u * 7.0 + time * 2.4 + phase) * Math.sin(v * 4.0 - time * 1.7) * strength * 0.16;
    const luff = (1 - wind) * Math.sin(v * 9.0 + time * 3.4 + phase) * across * 0.25;

    position.setX(i, base[i * 3] * (1 - 0.05 * strength * down));
    position.setY(i, base[i * 3 + 1] + down * strength * height * 0.012);
    position.setZ(i, bulge + ripple + luff);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function taperedSpar(length, radius, materials) {
  const spar = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius, length, 10, 1),
    materials.timber,
  );
  spar.castShadow = true;
  return spar;
}

/** Yard with its sail, plus footropes and lifts. */
function buildYard(materials, { height, length, sailWidth, sailHeight, belly, phase }, sails) {
  const group = new THREE.Group();
  group.position.y = height;

  const yard = taperedSpar(length, 0.19, materials);
  yard.rotation.z = Math.PI / 2;
  group.add(yard);

  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), materials.darkTimber);
    cap.position.x = (side * length) / 2;
    group.add(cap);
  }

  const sail = makeSail(materials, {
    width: sailWidth,
    height: sailHeight,
    headFactor: 1,
    footFactor: 1.12,
    belly,
    phase,
  });
  sail.position.y = -0.12;
  group.add(sail);
  sails.push(sail);

  // Footrope slung under the yard, plus lifts running up to the masthead.
  const half = length / 2;
  const ropes = [];
  const sag = (x) => -0.75 + Math.cos((x / half) * 1.2) * 0.22;
  for (let i = 0; i < 8; i++) {
    const x0 = -half + (i / 8) * length;
    const x1 = -half + ((i + 1) / 8) * length;
    ropes.push(x0, sag(x0), 0.1, x1, sag(x1), 0.1);
  }
  ropes.push(-half, 0, 0, 0, 6.5, 0.1, half, 0, 0, 0, 6.5, 0.1);
  group.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(ropes, 3)),
      materials.rope,
    ),
  );

  return group;
}

function buildTop(materials, radius) {
  const group = new THREE.Group();

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.85, 0.22, 12),
    materials.timber,
  );
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.94, 0.055, 6, 16), materials.darkTimber);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.75;
  group.add(rail);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5), materials.darkTimber);
    post.position.set(Math.cos(angle) * radius * 0.94, 0.4, Math.sin(angle) * radius * 0.94);
    group.add(post);
  }

  // Crosstrees under the platform.
  for (const rot of [0, Math.PI / 2]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.1, 0.16, 0.18), materials.darkTimber);
    beam.position.y = -0.18;
    beam.rotation.y = rot;
    group.add(beam);
  }

  return group;
}

function makeFlag(materials, { length, height, phase }) {
  const geometry = sailGeometry(length, height, 1, 1, 16, 6);
  // Re-hang the flag from its hoist: x becomes the fly direction.
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setX(i, position.getX(i) + length / 2);
  }
  geometry.userData.base = Float32Array.from(position.array);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, materials.flag);
  mesh.castShadow = true;
  mesh.userData.flag = { length, height, phase };
  mesh.userData.dynamic = true;
  return mesh;
}

export function waveFlag(mesh, wind, time) {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const base = geometry.userData.base;
  const { length, phase } = mesh.userData.flag;
  const strength = 0.35 + wind * 0.65;

  for (let i = 0; i < position.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const along = x / length;
    const travel = Math.sin(along * 6.5 - time * 5.0 + phase);
    const swing = Math.sin(along * 3.2 - time * 3.1 + phase * 0.5);
    position.setX(i, x * (1 - 0.06 * along * strength));
    position.setY(i, y + travel * along * 0.22 * strength);
    position.setZ(i, swing * along * 0.75 * strength + travel * along * 0.2);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function ratlines(ropes, top, anchors) {
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    for (let step = 1; step <= 14; step++) {
      const k = step / 15;
      const ax = a[0] + (top[0] - a[0]) * k;
      const ay = a[1] + (top[1] - a[1]) * k;
      const az = a[2] + (top[2] - a[2]) * k;
      const bx = b[0] + (top[0] - b[0]) * k;
      const by = b[1] + (top[1] - b[1]) * k;
      const bz = b[2] + (top[2] - b[2]) * k;
      ropes.push([ax, ay, az], [bx, by, bz]);
    }
  }
}

export function buildRig(materials) {
  const group = new THREE.Group();
  group.name = 'rig';
  const sails = [];
  const flags = [];
  const worldRopes = [];

  const mastTops = {};

  for (const spec of MASTS) {
    const mast = new THREE.Group();
    mast.position.set(0, spec.baseY, spec.z);
    mast.rotation.x = RAKE;

    const lower = taperedSpar(spec.lower, spec.radius, materials);
    lower.position.y = spec.lower / 2;
    mast.add(lower);

    const upper = taperedSpar(spec.upper, spec.radius * 0.6, materials);
    upper.position.y = spec.lower + spec.upper / 2 - 1.2;
    upper.position.z = -0.1;
    mast.add(upper);

    // Mast bands.
    for (const y of [1.2, spec.lower * 0.5, spec.lower - 0.6]) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(spec.radius * 1.08, spec.radius * 1.08, 0.16, 10),
        materials.iron,
      );
      band.position.y = y;
      mast.add(band);
    }

    const top = buildTop(materials, spec.radius * 4.2);
    top.position.y = spec.lower - 1.0;
    mast.add(top);

    const yardSpecs = {
      fore: [
        { height: 8.4, length: 12.5, sailWidth: 11.4, sailHeight: 6.2, belly: 1.0, phase: 0.4 },
        { height: 15.8, length: 9.5, sailWidth: 8.6, sailHeight: 5.4, belly: 0.9, phase: 1.9 },
        { height: 21.0, length: 6.4, sailWidth: 5.6, sailHeight: 3.8, belly: 0.8, phase: 3.1 },
      ],
      main: [
        { height: 9.4, length: 15.0, sailWidth: 13.8, sailHeight: 7.2, belly: 1.0, phase: 0.0 },
        { height: 17.6, length: 11.5, sailWidth: 10.4, sailHeight: 6.4, belly: 0.92, phase: 1.3 },
        { height: 24.2, length: 7.6, sailWidth: 6.8, sailHeight: 4.4, belly: 0.85, phase: 2.6 },
      ],
      mizzen: [
        { height: 12.4, length: 8.2, sailWidth: 7.4, sailHeight: 4.6, belly: 0.85, phase: 2.2 },
      ],
    }[spec.name];

    for (const yardSpec of yardSpecs) {
      mast.add(buildYard(materials, yardSpec, sails));
    }

    // Masthead truck and a pennant on fore and mizzen.
    const truck = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), materials.darkTimber);
    truck.position.y = spec.lower + spec.upper - 1.2;
    mast.add(truck);

    mastTops[spec.name] = new THREE.Vector3(0, spec.baseY + spec.lower - 1.0, spec.z + 0.6);
    group.add(mast);
    mast.userData.spec = spec;

    if (spec.name === 'main') {
      const flag = makeFlag(materials, { length: 4.6, height: 2.9, phase: 0 });
      flag.position.set(0.1, spec.lower + spec.upper - 4.4, 0);
      mast.add(flag);
      flags.push(flag);

      // Crow's nest barrel on the main top.
      const nest = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 0.85, 1.25, 12, 1, true),
        materials.tarp,
      );
      nest.position.y = spec.lower - 0.35;
      nest.castShadow = true;
      mast.add(nest);
      for (const y of [-0.4, 0.4]) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 5, 14), materials.iron);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = spec.lower - 0.35 + y;
        mast.add(hoop);
      }
    } else {
      const pennant = makeFlag(materials, {
        length: 3.0,
        height: 0.9,
        phase: spec.name === 'fore' ? 1.1 : 2.3,
      });
      pennant.position.set(0.08, spec.lower + spec.upper - 2.0, 0);
      mast.add(pennant);
      flags.push(pennant);
    }
  }

  // ---- Bowsprit and headsails -------------------------------------------
  const bowsprit = new THREE.Group();
  bowsprit.position.set(0, 4.2, 14.2);
  bowsprit.rotation.x = -0.42; // steeved up over the stem
  const spritSpar = taperedSpar(13.5, 0.34, materials);
  spritSpar.rotation.x = -Math.PI / 2;
  spritSpar.position.z = 6.75;
  bowsprit.add(spritSpar);
  const spritCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), materials.darkTimber);
  spritCap.position.z = 13.5;
  bowsprit.add(spritCap);
  group.add(bowsprit);

  const spritTip = new THREE.Vector3(0, 4.2 + Math.sin(0.42) * 13.0, 14.2 + Math.cos(0.42) * 13.0);
  const spritMid = new THREE.Vector3(0, 4.2 + Math.sin(0.42) * 7.0, 14.2 + Math.cos(0.42) * 7.0);

  const headsails = [
    { tack: spritTip, head: mastTops.fore.clone().setY(mastTops.fore.y + 7.5), width: 5.4, phase: 0.8 },
    { tack: spritMid, head: mastTops.fore.clone().setY(mastTops.fore.y + 3.0), width: 4.6, phase: 2.0 },
  ];
  for (const spec of headsails) {
    const luff = spec.head.clone().sub(spec.tack);
    const length = luff.length();
    const sail = makeSail(materials, {
      width: spec.width,
      height: length,
      headFactor: 0.05,
      footFactor: 1,
      belly: 0.8,
      phase: spec.phase,
    });
    sail.position.copy(spec.head);
    // Swing the canvas into the centreline plane, then hang it down the stay.
    sail.rotation.y = Math.PI / 2;
    sail.rotation.z = Math.atan2(luff.z, luff.y);
    group.add(sail);
    sails.push(sail);
    worldRopes.push([spec.tack.x, spec.tack.y, spec.tack.z], [spec.head.x, spec.head.y, spec.head.z]);
  }

  // ---- Spanker: the fore-and-aft sail on the mizzen ----------------------
  const mizzen = MASTS[2];
  const boomY = 7.9;
  const gaffY = 12.7;
  const spankerLength = 5.4;
  const centreZ = mizzen.z - 0.2 - spankerLength / 2;

  const spankerGroup = new THREE.Group();
  const boom = taperedSpar(spankerLength + 0.9, 0.17, materials);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, boomY, centreZ - 0.3);
  spankerGroup.add(boom);

  const gaff = taperedSpar(spankerLength + 0.3, 0.14, materials);
  gaff.rotation.x = Math.PI / 2 - 0.17;
  gaff.position.set(0, gaffY + 0.25, centreZ);
  spankerGroup.add(gaff);

  const spanker = makeSail(materials, {
    width: spankerLength,
    height: gaffY - boomY,
    headFactor: 0.95,
    footFactor: 1.0,
    belly: 0.75,
    phase: 1.4,
  });
  spanker.rotation.y = Math.PI / 2;
  spanker.position.set(0, gaffY - 0.15, centreZ);
  spankerGroup.add(spanker);
  sails.push(spanker);
  group.add(spankerGroup);

  // ---- Standing rigging --------------------------------------------------
  const ropePoints = [...worldRopes];
  const push = (a, b) => ropePoints.push([a.x, a.y, a.z], [b.x, b.y, b.z]);

  for (const spec of MASTS) {
    const topPoint = mastTops[spec.name];
    const upperTop = new THREE.Vector3(0, spec.baseY + spec.lower + spec.upper - 1.6, spec.z + 1.2);
    const t = tAtZ(spec.z);

    for (const side of [-1, 1]) {
      const anchors = [];
      for (let i = 0; i < 5; i++) {
        const z = spec.z - 2.6 + i * 1.35;
        const st = tAtZ(z);
        anchors.push([side * (railHalfWidthAt(st) + 0.5), railYAt(st) + 0.1, z]);
      }
      for (const anchor of anchors) {
        ropePoints.push(anchor, [topPoint.x, topPoint.y, topPoint.z]);
      }
      ratlines(ropePoints, [topPoint.x, topPoint.y, topPoint.z], anchors);

      // Topmast shrouds fan out from the top platform.
      for (let i = 0; i < 3; i++) {
        ropePoints.push(
          [side * (spec.radius * 4.0 - i * 0.9), topPoint.y + 0.1, spec.z + 0.4],
          [upperTop.x, upperTop.y, upperTop.z],
        );
      }

      // Backstays down to the quarter.
      ropePoints.push(
        [upperTop.x, upperTop.y, upperTop.z],
        [side * (railHalfWidthAt(tAtZ(spec.z - 7)) + 0.2), railYAt(tAtZ(spec.z - 7)) + 0.1, spec.z - 7],
      );
    }

    // Forestay.
    const forwardZ = spec.z + 9;
    const ft = tAtZ(forwardZ);
    const anchor =
      spec.name === 'fore'
        ? spritMid
        : new THREE.Vector3(0, deckYAt(ft) + 1.2, Math.min(forwardZ, 15));
    push(upperTop, anchor);
    push(topPoint, anchor.clone().setY(anchor.y - 0.4));
  }

  push(mastTops.fore.clone().setY(mastTops.fore.y + 7.5), spritTip);

  const rigging = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(ropePoints.flat(), 3),
    ),
    materials.rope,
  );
  rigging.name = 'rigging';
  group.add(rigging);

  return { group, sails, flags };
}
