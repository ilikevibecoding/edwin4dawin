import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  plasterMaterial, brickMaterial, concreteMaterial, asphaltMaterial,
  dirtMaterial, flatMaterial, woodMaterial,
} from './materials.js';
import {
  jerseyBarrier, sandbagWall, barrel, crate, wreckedCar, powerPole, wire,
  tireStack, rubblePile, metalFence, streetLight, awning, acUnit, waterTank,
} from './props.js';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// "DUST DISTRICT" — war-torn urban combat map, ~170m x 170m.
// Classic 3-lane layout: main street (N-S), cross street (E-W), central
// intersection kill-zone. Buildings enclose the space; props provide cover.
// ===========================================================================

const FLOOR_H = 3.3;

// Scale a BoxGeometry's per-face UVs so 1 texture tile = texScale meters.
function scaleBoxUV(geo, w, h, d, texScale = 3) {
  const uv = geo.attributes.uv;
  // BoxGeometry face order: +x -x +y -y +z -z ; 4 verts each
  const faceDims = [
    [d, h], [d, h], [w, d], [w, d], [w, h], [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = faceDims[f];
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * (su / texScale), uv.getY(idx) * (sv / texScale));
    }
  }
  uv.needsUpdate = true;
  return geo;
}

function texturedBox(w, h, d, mat, texScale = 3) {
  const geo = scaleBoxUV(new THREE.BoxGeometry(w, h, d), w, h, d, texScale);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.colliders = [];        // THREE.Box3 world-space, for physics + bullets
    this.spawnPoints = [];      // enemy spawns
    this.coverSpots = [];       // positions AI can take cover at
    this.rng = makeRNG(424242);

    this.windowGlassMatrices = [];
    this.windowGlassColors = [];
    this.windowFrameMatrices = [];

    this.buildGround();
    this.buildRoads();
    this.buildBlocks();
    this.buildLandmarks();
    this.buildStreetProps();
    this.buildBoundary();
    this.buildDistantSkyline();
    this.flushWindowInstances();

    scene.add(this.group);
  }

  addCollider(cx, cy, cz, w, h, d) {
    const b = new THREE.Box3(
      new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
      new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2)
    );
    this.colliders.push(b);
    return b;
  }

  placeProp(builder, x, z, rotY = 0, registerCover = false) {
    const p = builder();
    p.position.set(x, 0, z);
    p.rotation.y = rotY;
    this.group.add(p);
    const c = p.userData.collider;
    if (c) {
      // Axis-align the box for 90° rotations; swap w/d when rotated ~90°
      const quarter = Math.abs(Math.sin(rotY));
      const w = c.w * (1 - quarter) + c.d * quarter;
      const d = c.d * (1 - quarter) + c.w * quarter;
      this.addCollider(x, c.h / 2, z, w, c.h, d);
      if (registerCover) this.coverSpots.push(new THREE.Vector3(x, 0, z));
    }
    return p;
  }

  // ------------------------------------------------------------------ ground
  buildGround() {
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), dirtMaterial());
    dirt.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 34; });
    dirt.rotation.x = -Math.PI / 2;
    dirt.receiveShadow = true;
    this.group.add(dirt);
  }

  // ------------------------------------------------------------------- roads
  buildRoads() {
    const road = asphaltMaterial();
    const mkRoad = (w, l, x, z, rot = 0) => {
      const geo = new THREE.PlaneGeometry(w, l);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 9), uv.getY(i) * (l / 9));
      const m = new THREE.Mesh(geo, road);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.02, z);
      m.receiveShadow = true;
      this.group.add(m);
    };
    mkRoad(10, 168, 0, 0);                 // main N-S street
    mkRoad(9, 168, 0, 0, Math.PI / 2);     // cross E-W street

    // Sidewalks with curbs
    const walk = concreteMaterial(33, 1.02);
    const mkWalk = (w, l, x, z) => {
      const m = texturedBox(w, 0.14, l, walk, 2.2);
      m.position.set(x, 0.07, z);
      this.group.add(m);
      this.addCollider(x, 0.07, z, w, 0.14, l); // step-up handled by physics
    };
    // Along main street
    mkWalk(2.6, 66, -6.3, -41.5); mkWalk(2.6, 66, 6.3, -41.5);
    mkWalk(2.6, 66, -6.3, 41.5); mkWalk(2.6, 66, 6.3, 41.5);
    // Along cross street
    mkWalk(66, 2.6, -41.5, -5.8); mkWalk(66, 2.6, -41.5, 5.8);
    mkWalk(66, 2.6, 41.5, -5.8); mkWalk(66, 2.6, 41.5, 5.8);

    // Lane markings: dashed center line
    const lineMat = flatMaterial(0xb8b09b, 0.9);
    const dash = new THREE.PlaneGeometry(0.16, 2.2);
    for (let z = -78; z < 80; z += 6) {
      if (Math.abs(z) < 6) continue;
      const m = new THREE.Mesh(dash, lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.035, z);
      m.receiveShadow = true;
      this.group.add(m);
    }
    const dashH = new THREE.PlaneGeometry(2.2, 0.16);
    for (let x = -78; x < 80; x += 6) {
      if (Math.abs(x) < 6) continue;
      const m = new THREE.Mesh(dashH, lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.035, 0);
      m.receiveShadow = true;
      this.group.add(m);
    }
    // Crosswalk stripes at intersection
    const stripe = new THREE.PlaneGeometry(0.55, 3.4);
    for (const zSide of [-6.8, 6.8]) {
      for (let x = -3.8; x <= 3.8; x += 1.1) {
        const m = new THREE.Mesh(stripe, lineMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.033, zSide);
        this.group.add(m);
      }
    }
  }

  // ------------------------------------------------------- buildings & blocks
  buildBlocks() {
    const r = this.rng;
    const tints = [0xcbb89a, 0xd6c3a0, 0xbfa27c, 0xcfc0a8, 0xb9a88a, 0xc9ad86, 0xd8c8b2];

    // Building slots: [x, z, facing] — facing is the direction the front looks
    const slots = [];
    // West side of main street (front faces +x)
    for (let z = -66; z <= 66; z += 17) { if (Math.abs(z) > 10) slots.push([-14.5, z, 'px']); }
    // East side (front faces -x)
    for (let z = -66; z <= 66; z += 17) { if (Math.abs(z) > 10) slots.push([14.5, z, 'nx']); }
    // North side of cross street (front faces +z)
    for (let x = -66; x <= 66; x += 19) { if (Math.abs(x) > 24) slots.push([x, -14, 'pz']); }
    // South side (front faces -z)
    for (let x = -66; x <= 66; x += 19) { if (Math.abs(x) > 24) slots.push([x, 14, 'nz']); }
    // Back-row filler for skyline depth
    for (let z = -60; z <= 60; z += 24) { slots.push([-34, z + 6, 'px', true]); slots.push([34, z - 6, 'nx', true]); }
    for (let x = -58; x <= 58; x += 26) { slots.push([x + 4, -34, 'pz', true]); slots.push([x - 4, 34, 'nz', true]); }

    let idx = 0;
    for (const [x, z, facing, backRow] of slots) {
      idx++;
      const ruin = !backRow && (idx % 9 === 4); // a few street-front ruins
      const floors = backRow ? r.int(3, 5) : r.int(2, 4);
      const w = r.range(11, 15.5);
      const d = r.range(9, 13);
      const tint = tints[idx % tints.length];
      if (ruin) {
        this.buildRuin(x, z, w, d, tint, idx);
      } else {
        this.buildBuilding(x, z, w, d, floors, facing, tint, idx);
      }
    }
  }

  buildBuilding(x, z, w, d, floors, facing, tint, seed) {
    const r = makeRNG(seed * 3131);
    const h = floors * FLOOR_H;
    const mat = r.chance(0.22) ? brickMaterial(21 + (seed % 3)) : plasterMaterial(tint, 11 + (seed % 5));
    const body = texturedBox(w, h, d, mat, mat.map.image.width === 512 && r.chance(0.2) ? 1.8 : 3.2);
    body.position.set(x, h / 2, z);
    this.group.add(body);
    this.addCollider(x, h / 2, z, w, h, d);

    // Parapet
    const parapetMat = concreteMaterial(37, 0.92);
    const pp = texturedBox(w + 0.3, 0.55, d + 0.3, parapetMat, 2.5);
    pp.position.set(x, h + 0.27, z);
    this.group.add(pp);

    // Roof clutter
    if (r.chance(0.5)) { const t = waterTank(); t.position.set(x + r.range(-w / 4, w / 4), h + 0.5, z + r.range(-d / 4, d / 4)); this.group.add(t); }
    if (r.chance(0.6)) { const a = acUnit(); a.position.set(x + r.range(-w / 4, w / 4), h + 0.8, z + r.range(-d / 4, d / 4)); this.group.add(a); }

    // Windows on the two long faces + front
    const faces = facing === 'px' || facing === 'nx'
      ? [{ nx: 1, axis: 'x' }, { nx: -1, axis: 'x' }]
      : [{ nx: 1, axis: 'z' }, { nx: -1, axis: 'z' }];
    for (const face of faces) {
      const across = face.axis === 'x' ? d : w;
      const cols = Math.max(2, Math.floor(across / 3.4));
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          if (r.chance(0.12)) continue;
          const cy = f * FLOOR_H + FLOOR_H * 0.58;
          const offset = (c - (cols - 1) / 2) * (across / cols);
          let wx = x, wz = z, roty = 0;
          if (face.axis === 'x') { wx = x + face.nx * (w / 2 + 0.02); wz = z + offset; roty = face.nx > 0 ? Math.PI / 2 : -Math.PI / 2; }
          else { wz = z + face.nx * (d / 2 + 0.02); wx = x + offset; roty = face.nx > 0 ? 0 : Math.PI; }
          this.addWindow(wx, cy, wz, roty, r);
        }
      }
    }

    // Ground-floor door on facing side
    const doorMat = woodMaterial(83 + seed);
    const dw = 1.3, dh = 2.4;
    const door = texturedBox(dw, dh, 0.12, doorMat, 1.4);
    if (facing === 'px') { door.position.set(x + w / 2 + 0.02, dh / 2, z + r.range(-d / 4, d / 4)); door.rotation.y = Math.PI / 2; }
    if (facing === 'nx') { door.position.set(x - w / 2 - 0.02, dh / 2, z + r.range(-d / 4, d / 4)); door.rotation.y = Math.PI / 2; }
    if (facing === 'pz') { door.position.set(x + r.range(-w / 4, w / 4), dh / 2, z + d / 2 + 0.02); }
    if (facing === 'nz') { door.position.set(x + r.range(-w / 4, w / 4), dh / 2, z - d / 2 - 0.02); }
    this.group.add(door);

    // Occasional awning over the door / shopfront (anchored to the wall face)
    if (r.chance(0.4) && (facing === 'px' || facing === 'nx')) {
      const aw = awning(2.8, r.pick([0x8c3b2e, 0x365a4d, 0x7a6232]));
      const s = facing === 'px' ? 1 : -1;
      aw.position.set(x + s * (w / 2 + 0.03), 2.6, door.position.z);
      aw.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.group.add(aw);
    }
  }

  addWindow(x, y, z, rotY, r) {
    const frameM = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
      new THREE.Vector3(1, 1, 1)
    );
    this.windowFrameMatrices.push(frameM);
    this.windowGlassMatrices.push(frameM.clone());
    // Vary glass: metalness-driven env reflections need brightish base colors.
    const roll = r();
    let c;
    if (roll < 0.12) c = new THREE.Color(0x141210);                                   // blown out / boarded
    else if (roll < 0.28) c = new THREE.Color(0x8a7a62).multiplyScalar(0.8 + r() * 0.3); // curtains behind glass
    else c = new THREE.Color(0x9db4c8).multiplyScalar(0.55 + r() * 0.55);             // sky-reflecting pane
    this.windowGlassColors.push(c);
  }

  flushWindowInstances() {
    const n = this.windowFrameMatrices.length;
    if (!n) return;
    // Frame: hollow border built from 4 bars + sill, merged into one geometry
    const t = 0.09, W = 1.5, H = 1.9, D = 0.16;
    const bars = [
      new THREE.BoxGeometry(W, t, D).translate(0, H / 2 - t / 2, 0),
      new THREE.BoxGeometry(W, t, D).translate(0, -H / 2 + t / 2, 0),
      new THREE.BoxGeometry(t, H - 2 * t, D).translate(-W / 2 + t / 2, 0, 0),
      new THREE.BoxGeometry(t, H - 2 * t, D).translate(W / 2 - t / 2, 0, 0),
      new THREE.BoxGeometry(t * 0.7, H - 2 * t, D * 0.5).translate(0, 0, -0.02), // center mullion
      new THREE.BoxGeometry(W + 0.16, 0.09, D + 0.14).translate(0, -H / 2 - 0.04, 0.02), // sill
    ];
    const frameGeo = mergeGeometries(bars);
    const frameMat = flatMaterial(0x4d443a, 0.85);
    const frames = new THREE.InstancedMesh(frameGeo, frameMat, n);
    // Glass: pane recessed behind the frame
    const glassGeo = new THREE.PlaneGeometry(W - t, H - t).translate(0, 0, -0.045);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.9, envMapIntensity: 1.6 });
    const glass = new THREE.InstancedMesh(glassGeo, glassMat, n);
    for (let i = 0; i < n; i++) {
      frames.setMatrixAt(i, this.windowFrameMatrices[i]);
      glass.setMatrixAt(i, this.windowGlassMatrices[i]);
      glass.setColorAt(i, this.windowGlassColors[i]);
    }
    frames.castShadow = true; frames.receiveShadow = true;
    glass.receiveShadow = true;
    frames.instanceMatrix.needsUpdate = true;
    glass.instanceMatrix.needsUpdate = true;
    if (glass.instanceColor) glass.instanceColor.needsUpdate = true;
    this.group.add(frames);
    this.group.add(glass);
  }

  buildRuin(x, z, w, d, tint, seed) {
    const r = makeRNG(seed * 7373);
    const mat = plasterMaterial(tint, 11 + (seed % 5));
    const inner = concreteMaterial(39, 0.8);
    // Jagged standing walls: segments of varying height along the perimeter
    const segs = 7;
    for (let side = 0; side < 4; side++) {
      const horizontal = side % 2 === 0;
      const len = horizontal ? w : d;
      const segLen = len / segs;
      for (let s = 0; s < segs; s++) {
        if (r.chance(0.3)) continue; // gaps blasted through
        const hh = r.range(1.2, FLOOR_H * 2.1);
        const t = 0.4;
        const off = (s + 0.5) * segLen - len / 2;
        let bx = x, bz = z, bw, bd;
        if (side === 0) { bz = z - d / 2; bx = x + off; bw = segLen; bd = t; }
        if (side === 1) { bx = x + w / 2; bz = z + off; bw = t; bd = segLen; }
        if (side === 2) { bz = z + d / 2; bx = x + off; bw = segLen; bd = t; }
        if (side === 3) { bx = x - w / 2; bz = z + off; bw = t; bd = segLen; }
        const wall = texturedBox(bw, hh, bd, r.chance(0.75) ? mat : inner, 3.0);
        wall.position.set(bx, hh / 2, bz);
        wall.rotation.y = r.range(-0.02, 0.02);
        this.group.add(wall);
        this.addCollider(bx, hh / 2, bz, bw + 0.05, hh, bd + 0.05);
      }
    }
    // Rubble inside and spilling out
    const pile = rubblePile(Math.min(w, d) * 0.42, seed);
    pile.position.set(x, 0, z);
    this.group.add(pile);
    this.addCollider(x, 0.35, z, w * 0.5, 0.7, d * 0.5);
    this.coverSpots.push(new THREE.Vector3(x + w / 2 + 1, 0, z));
    this.spawnPoints.push(new THREE.Vector3(x, 0, z + d / 2 + 2));
  }

  // ---------------------------------------------------------------- landmarks
  buildLandmarks() {
    // Minaret tower at NE corner of the intersection — the map's visual anchor
    const x = 11.5, z = -11.5;
    const mat = plasterMaterial(0xd8c8b0, 17);
    const trim = concreteMaterial(41, 1.05);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.1, 21, 14), mat);
    tower.position.set(x, 10.5, z);
    tower.castShadow = true; tower.receiveShadow = true;
    this.group.add(tower);
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 1.1, 14), trim);
    balcony.position.set(x, 21, z);
    balcony.castShadow = true;
    this.group.add(balcony);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.5, 3.2, 12), mat);
    top.position.set(x, 23.2, z);
    top.castShadow = true;
    this.group.add(top);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 12), new THREE.MeshStandardMaterial({ color: 0x3f6156, roughness: 0.5, metalness: 0.65, envMapIntensity: 1.2 }));
    cone.position.set(x, 26.1, z);
    cone.castShadow = true;
    this.group.add(cone);
    this.addCollider(x, 10.5, z, 4.2, 21, 4.2);

    // Small mosque body with dome next to it
    const bw = 14, bd = 12, bh = 7.5;
    const bx = 20, bz = -16;
    const body = texturedBox(bw, bh, bd, mat, 3.2);
    body.position.set(bx, bh / 2, bz);
    this.group.add(body);
    this.addCollider(bx, bh / 2, bz, bw, bh, bd);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.4, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x47695d, roughness: 0.42, metalness: 0.7, envMapIntensity: 1.3 }));
    dome.position.set(bx, bh, bz);
    dome.castShadow = true;
    this.group.add(dome);

    // Central intersection: blasted fountain base as centerpiece cover
    const fx = 0, fz = 0;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.85, 18), concreteMaterial(43, 0.9));
    rim.position.set(fx, 0.42, fz);
    rim.castShadow = true; rim.receiveShadow = true;
    this.group.add(rim);
    this.addCollider(fx, 0.42, fz, 6.4, 0.85, 6.4);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.1, 12), concreteMaterial(43, 0.82));
    pillar.position.set(fx, 1.5, fz);
    pillar.castShadow = true;
    this.group.add(pillar);
    this.coverSpots.push(new THREE.Vector3(4.5, 0, 0), new THREE.Vector3(-4.5, 0, 0), new THREE.Vector3(0, 0, 4.5), new THREE.Vector3(0, 0, -4.5));
  }

  // ------------------------------------------------------------- street props
  buildStreetProps() {
    const r = this.rng;

    // Wrecked cars on the roads
    const cars = [
      [2.4, -30, 0.5, true], [-2.8, 22, -0.4, true], [1.8, 48, 2.6, false],
      [-26, 2.2, 1.9, true], [33, -2.4, 1.2, true], [-3, -55, 0.2, false],
    ];
    for (const [x, z, rot, burned] of cars) {
      this.placeProp(() => wreckedCar(burned, r.pick([0x6b7a8c, 0x8c7a52, 0x5d6b5a, 0x7d5b4a])), x, z, rot, true);
    }

    // Jersey barrier chains near the intersection (kill-zone cover)
    const barriers = [
      [-4.8, -12, 0], [-4.8, -14.2, 0], [-4.8, -16.4, 0],
      [4.8, 12, 0], [4.8, 14.2, 0], [4.8, 16.4, 0],
      [-12, 4.8, Math.PI / 2], [-14.2, 4.8, Math.PI / 2],
      [12, -4.8, Math.PI / 2], [14.2, -4.8, Math.PI / 2],
    ];
    for (const [x, z, rot] of barriers) this.placeProp(jerseyBarrier, x, z, rot, true);

    // Sandbag nests at corners
    const nests = [[-8.5, -8.5, Math.PI / 4], [8.5, 8.5, Math.PI / 4], [8.5, -8.5, -Math.PI / 4], [-8.5, 8.5, -Math.PI / 4]];
    for (const [x, z, rot] of nests) this.placeProp(() => sandbagWall(3, 5), x, z, rot, true);

    // Barrels + crates clusters
    const clusters = [[-9, -28], [10, 34], [-11, 52], [28, 8], [-30, -7], [9, -46], [-9, 63], [44, -8]];
    for (const [cx, cz] of clusters) {
      const n = r.int(2, 4);
      for (let i = 0; i < n; i++) {
        const px = cx + r.range(-1.6, 1.6), pz = cz + r.range(-1.6, 1.6);
        if (r.chance(0.55)) this.placeProp(() => barrel(r.pick([0x5a6b46, 0x6b4a3a, 0x46566b])), px, pz, r.range(0, Math.PI), i === 0);
        else this.placeProp(() => crate(r.range(0.6, 0.95)), px, pz, r.range(0, Math.PI), i === 0);
      }
    }

    // Tire stacks
    for (const [x, z] of [[-7.6, 30], [7.8, -22], [22, 7.6], [-19, -7.7]]) {
      this.placeProp(() => tireStack(r.int(2, 4)), x, z, r.range(0, Math.PI), true);
    }

    // Power poles with sagging wires along main street (west sidewalk)
    let prevTop = null;
    for (let z = -70; z <= 70; z += 20) {
      this.placeProp(powerPole, -7.2, z, r.range(-0.06, 0.06));
      const top = new THREE.Vector3(-7.2, 6.9, z);
      if (prevTop) {
        this.group.add(wire(prevTop.clone().add(new THREE.Vector3(0.6, 0, 0)), top.clone().add(new THREE.Vector3(0.6, 0, 0)), 1.0));
        this.group.add(wire(prevTop.clone().add(new THREE.Vector3(-0.6, 0, 0)), top.clone().add(new THREE.Vector3(-0.6, 0, 0)), 1.15));
      }
      prevTop = top;
    }

    // Street lights along cross street
    for (const x of [-30, -55, 30, 55]) {
      this.placeProp(streetLight, x, -6.8, 0);
      this.placeProp(streetLight, -x, 6.8, Math.PI);
    }

    // Metal fences plugging alley gaps between some buildings
    const fences = [[-14.5, -23.5, 0, 10], [14.5, 25.5, 0, 10], [-40, -14, Math.PI / 2, 8], [42, 14, Math.PI / 2, 8]];
    for (const [x, z, rot, len] of fences) {
      this.placeProp(() => metalFence(len, 2.3), x, z, rot);
    }

    // Scattered rubble piles + debris in open areas
    for (const [x, z, s] of [[-22, 30, 1.4], [26, -34, 1.8], [-36, -30, 1.2], [38, 40, 1.5], [-52, 8, 1.1], [55, -9, 1.3]]) {
      this.placeProp(() => rubblePile(s, Math.floor(x * z)), x, z, 0, true);
    }

    // Enemy spawn points spread around the map edges + mid lanes
    const spawns = [
      [0, -62], [0, 62], [-62, 0], [62, 0],
      [-24, -40], [24, 40], [-40, 24], [40, -24],
      [-24, 44], [24, -44], [46, 22], [-46, -22],
    ];
    for (const [x, z] of spawns) this.spawnPoints.push(new THREE.Vector3(x, 0, z));

    // Cover spots along lanes
    for (const [x, z] of [[-4.8, -13], [4.8, 13], [-13, 4.8], [13, -4.8], [2.4, -30], [-2.8, 22], [-9, -28], [10, 34]]) {
      this.coverSpots.push(new THREE.Vector3(x, 0, z));
    }
  }

  // ------------------------------------------------------------------ boundary
  buildBoundary() {
    const mat = concreteMaterial(45, 0.88);
    const H = 4.2, T = 0.6, L = 172;
    const walls = [
      [0, -86, L, T], [0, 86, L, T], [-86, 0, T, L], [86, 0, T, L],
    ];
    for (const [x, z, w, d] of walls) {
      const m = texturedBox(w, H, d, mat, 3.4);
      m.position.set(x, H / 2, z);
      this.group.add(m);
      this.addCollider(x, H / 2, z, w, H, d);
    }
  }

  // ----------------------------------------------------- distant skyline (set)
  buildDistantSkyline() {
    const r = makeRNG(5150);
    const mat = new THREE.MeshStandardMaterial({ color: 0xa08a6c, roughness: 1 });
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const count = 90;
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + r.range(-0.03, 0.03);
      const dist = 210 + r.range(0, 160);
      const w = r.range(10, 30), h = r.range(8, 42), d = r.range(10, 30);
      m4.compose(
        new THREE.Vector3(Math.cos(ang) * dist, h / 2 - 1, Math.sin(ang) * dist),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r.range(0, Math.PI), 0)),
        new THREE.Vector3(w, h, d)
      );
      inst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
  }
}
