import * as THREE from 'three';
import { settings } from './settings.js';
import { Rng } from './util/rng.js';
import { Noise } from './util/noise.js';
import * as G from './util/geo.js';
import * as M from './materials.js';
import * as T from './util/textures.js';
import { clamp, saturate, lerp, smoothstep } from './util/mathx.js';

/**
 * FORWARD OPERATING SITE "AEGIS LINE" - the fictional air-defence base the
 * player walks around.
 *
 * Everything here is procedural: terrain from noise, structures kit-bashed from
 * primitives, all merged per material so the whole site costs a few dozen draw
 * calls.
 */

const terrainNoise = new Noise(0xa11ce);

/** Site convention: north is -Z. Threats arrive from the north. */
export const NORTH = new THREE.Vector3(0, 0, -1);

/** Height of the natural desert floor at a world position. */
export function terrainHeight(x, z) {
  const d = Math.hypot(x, z);
  // The pad and its immediate surroundings are graded flat.
  const flat = smoothstep(150, 420, d);

  const rolling =
    terrainNoise.fbm2(x / 620, z / 620, 4) * 9 + terrainNoise.fbm2(x / 170, z / 170, 3) * 2.2;

  // Distant ranges: ridged noise that only switches on past a few kilometres.
  const far = smoothstep(2600, 7200, d);
  const ridge = Math.pow(terrainNoise.ridged2(x / 3100, z / 3100, 6), 2.1);
  const ridge2 = Math.pow(terrainNoise.ridged2(x / 1250 + 40, z / 1250 - 70, 5), 2.6);
  const mountains = far * (ridge * 1250 + ridge2 * 320);

  // A shallow basin so the base sits in a bowl ringed by high ground.
  const basin = -smoothstep(300, 2400, d) * 12;

  return rolling * flat + mountains + basin;
}

/** Walkable ground height (concrete pads read as flat 0). */
export function groundHeight(x, z) {
  return Math.max(0, terrainHeight(x, z));
}

/* ------------------------------------------------------------------ *
 * Merge kit - accumulate geometry per material, emit merged meshes
 * ------------------------------------------------------------------ */
class Kit {
  constructor() {
    this.byMaterial = new Map();
  }

  add(material, geometry) {
    if (!geometry) return;
    let list = this.byMaterial.get(material);
    if (!list) this.byMaterial.set(material, (list = []));
    list.push(geometry);
  }

  /** Convenience: add a geometry with a transform applied. */
  place(material, geometry, pos, rot, scale) {
    this.add(material, G.xform(geometry, pos, rot, scale));
  }

  build(name, { castShadow = true, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.byMaterial) {
      const geo = G.merge(list);
      G.finalize(geo, `${name}:${mat.name || 'mat'}`);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `${name}:${mat.name || 'mat'}`;
      mesh.castShadow = castShadow && settings.quality.shadows;
      mesh.receiveShadow = receiveShadow && settings.quality.shadows;
      group.add(mesh);
    }
    this.byMaterial.clear();
    return group;
  }
}

export { Kit };

/* ------------------------------------------------------------------ *
 * Reusable props
 * ------------------------------------------------------------------ */

/** Jersey / concrete barrier. */
function jerseyBarrier(len = 3.0) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.32, 0);
  shape.lineTo(0.32, 0);
  shape.lineTo(0.21, 0.28);
  shape.lineTo(0.11, 0.95);
  shape.lineTo(-0.11, 0.95);
  shape.lineTo(-0.21, 0.28);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -len / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Hesco-style gabion: a wire cage full of graded fill. */
function gabion(w = 1.5, h = 1.4, d = 1.2) {
  const parts = [G.roundedBox(w, h, d, 0.06)];
  parts[0].translate(0, h / 2, 0);
  return G.merge(parts);
}

/** Diesel generator set on a skid, with radiator grille and exhaust stack. */
function generatorUnit(kit, pos, yaw = 0) {
  const body = M.painted('#5f6459', { repeat: 2.2 });
  const dark = M.darkMetal();
  const heat = M.heatMat('#3e3c38');

  const skidH = 0.22;
  kit.place(dark, new THREE.BoxGeometry(3.4, skidH, 1.7), [pos[0], pos[1] + skidH / 2, pos[2]], [0, yaw, 0]);
  const shell = G.roundedBox(3.1, 1.5, 1.5, 0.07);
  kit.place(body, shell, [pos[0], pos[1] + skidH + 0.78, pos[2]], [0, yaw, 0]);

  // Radiator louvres on one end.
  const louvre = new THREE.BoxGeometry(0.04, 1.0, 1.15);
  for (let i = 0; i < 7; i++) {
    const off = -0.5 + (i / 6) * 1.0;
    const local = new THREE.Vector3(1.53, off, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    kit.place(dark, louvre, [pos[0] + local.x, pos[1] + skidH + 0.78 + off, pos[2] + local.z], [0, yaw, -0.22]);
  }
  // Exhaust stack.
  const stackLocal = new THREE.Vector3(-1.1, 0, 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  kit.place(
    heat,
    G.pipe(0.11, 1.5, 0.02, 10),
    [pos[0] + stackLocal.x, pos[1] + skidH + 1.55 + 0.75, pos[2] + stackLocal.z],
    [0, yaw, 0]
  );
  // Control box + fuel drum.
  const boxLocal = new THREE.Vector3(0.6, 0, -0.9).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  kit.place(dark, G.roundedBox(0.6, 0.7, 0.22, 0.03), [pos[0] + boxLocal.x, pos[1] + 1.1, pos[2] + boxLocal.z], [0, yaw, 0]);
  return { light: [pos[0], pos[1] + 1.62, pos[2]] };
}

/** Antenna mast: truss tower with whips, a small dish and guy wires. */
function antennaMast(kit, pos, height = 9, yaw = 0) {
  const steel = M.metal('#7c8079', 0.5, 0.85);
  const dark = M.darkMetal();
  kit.place(steel, G.truss(height, 0.55), [pos[0], pos[1], pos[2]], [0, yaw, 0]);
  kit.place(dark, new THREE.BoxGeometry(1.3, 0.14, 1.3), [pos[0], pos[1] + height, pos[2]], [0, yaw, 0]);
  // Whip antennas.
  for (let i = 0; i < 4; i++) {
    const a = yaw + (i / 4) * Math.PI * 2;
    kit.place(
      dark,
      new THREE.CylinderGeometry(0.012, 0.006, 2.4, 5),
      [pos[0] + Math.cos(a) * 0.45, pos[1] + height + 1.2, pos[2] + Math.sin(a) * 0.45],
      [Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]
    );
  }
  // Small parabolic dish.
  const dish = new THREE.SphereGeometry(0.75, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
  dish.scale(1, 0.45, 1);
  kit.place(M.painted('#b9b8b0', { repeat: 1.2, panels: 2 }), dish, [pos[0], pos[1] + height * 0.72, pos[2] + 0.75], [Math.PI * 0.62, 0, 0]);
  kit.place(dark, new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), [pos[0], pos[1] + height * 0.72, pos[2] + 0.4], [Math.PI / 2, 0, 0]);
  // Guy wires.
  const hose = M.hoseMat();
  for (let i = 0; i < 3; i++) {
    const a = yaw + (i / 3) * Math.PI * 2 + 0.4;
    kit.add(
      hose,
      G.cable(
        [pos[0], pos[1] + height * 0.92, pos[2]],
        [pos[0] + Math.cos(a) * height * 0.55, pos[1], pos[2] + Math.sin(a) * height * 0.55],
        0.25,
        0.012,
        10
      )
    );
  }
  return { top: [pos[0], pos[1] + height + 2.4, pos[2]] };
}

/** Floodlight mast: four heads on a crossbar with a small cabinet at the base. */
function floodlightMast(kit, pos, height = 10, yaw = 0) {
  const steel = M.metal('#6e7269', 0.55, 0.8);
  const dark = M.darkMetal();
  kit.place(steel, new THREE.CylinderGeometry(0.13, 0.19, height, 10), [pos[0], pos[1] + height / 2, pos[2]], [0, yaw, 0]);
  kit.place(dark, new THREE.CylinderGeometry(0.55, 0.55, 0.16, 12), [pos[0], pos[1] + 0.08, pos[2]]);
  kit.place(steel, new THREE.BoxGeometry(2.6, 0.12, 0.16), [pos[0], pos[1] + height, pos[2]], [0, yaw, 0]);
  kit.place(dark, G.roundedBox(0.5, 0.7, 0.32, 0.03), [pos[0] + 0.32, pos[1] + 1.0, pos[2]], [0, yaw, 0]);
  const heads = [];
  for (let i = 0; i < 4; i++) {
    const t = (i / 3 - 0.5) * 2.3;
    const local = new THREE.Vector3(t, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const hp = [pos[0] + local.x, pos[1] + height + 0.16, pos[2] + local.z];
    kit.place(dark, G.roundedBox(0.5, 0.34, 0.28, 0.04), hp, [0.42, yaw, 0]);
    heads.push({ pos: hp, yaw, tilt: 0.42 });
  }
  // Ladder + cable down the pole.
  kit.place(steel, G.ladder(height * 0.85, 0.32), [pos[0] + 0.2, pos[1], pos[2] + 0.2], [0, yaw, 0]);
  kit.add(M.hoseMat(), G.cable([pos[0] - 0.14, pos[1] + height - 0.4, pos[2]], [pos[0] - 0.14, pos[1] + 1.2, pos[2]], 0.05, 0.018, 6));
  return heads;
}

/** Support truck: cab, bed, canvas tilt, wheels. */
function supportTruck(kit, pos, yaw = 0, { tilt = true, variant = 'desert' } = {}) {
  const body = M.camoMat(variant, 1.1);
  const dark = M.darkMetal();
  const glass = M.glassMat('#101c1e', 0.5);
  const tyre = M.rubberMat(1.4);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const P = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];

  // Chassis.
  kit.place(dark, new THREE.BoxGeometry(6.6, 0.28, 2.1), P(0, 0.72, 0), [0, yaw, 0]);
  // Cab.
  kit.place(body, G.roundedBox(2.0, 1.5, 2.2, 0.1), P(-2.0, 1.62, 0), [0, yaw, 0]);
  kit.place(glass, new THREE.BoxGeometry(0.06, 0.68, 1.85), P(-2.98, 1.9, 0), [0, yaw, 0.14]);
  kit.place(body, G.roundedBox(1.1, 0.75, 2.15, 0.08), P(-3.35, 1.15, 0), [0, yaw, 0]);
  // Bumper + grille.
  kit.place(dark, new THREE.BoxGeometry(0.2, 0.34, 2.3), P(-3.95, 0.85, 0), [0, yaw, 0]);
  // Bed.
  kit.place(body, new THREE.BoxGeometry(3.8, 0.7, 2.3), P(1.3, 1.2, 0), [0, yaw, 0]);
  if (tilt) {
    const arch = new THREE.CylinderGeometry(1.15, 1.15, 3.7, 14, 1, true, 0, Math.PI);
    arch.rotateZ(Math.PI / 2);
    kit.place(M.tarpMat('#5f5a49'), arch, P(1.3, 1.55, 0), [0, yaw, 0]);
    kit.place(M.tarpMat('#5f5a49'), new THREE.CircleGeometry(1.15, 14, 0, Math.PI), P(3.15, 1.55, 0), [0, yaw + Math.PI / 2, 0]);
  }
  // Wheels.
  const wheel = new THREE.CylinderGeometry(0.62, 0.62, 0.44, 14);
  wheel.rotateX(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.46, 8);
  hub.rotateX(Math.PI / 2);
  for (const [lx, lz] of [
    [-2.3, 1.05], [-2.3, -1.05],
    [1.2, 1.05], [1.2, -1.05],
    [2.35, 1.05], [2.35, -1.05]
  ]) {
    kit.place(tyre, wheel, P(lx, 0.62, lz), [0, yaw, 0]);
    kit.place(M.metal('#6a6a64', 0.5, 0.8), hub, P(lx, 0.62, lz), [0, yaw, 0]);
  }
  // Details: mirrors, jerry cans, spare wheel.
  kit.place(dark, new THREE.BoxGeometry(0.1, 0.34, 0.16), P(-2.9, 2.1, 1.25), [0, yaw, 0]);
  kit.place(dark, new THREE.BoxGeometry(0.1, 0.34, 0.16), P(-2.9, 2.1, -1.25), [0, yaw, 0]);
  kit.place(M.painted('#4f5443', { repeat: 1 }), G.roundedBox(0.42, 0.5, 0.18, 0.03), P(0.2, 1.0, 1.15), [0, yaw, 0]);
  kit.place(tyre, wheel, P(0.4, 1.05, -1.2), [Math.PI / 2, yaw, 0]);
}

/** Stacked equipment cases / ammo boxes. */
function equipmentStack(kit, pos, rng, count = 4, yaw = 0) {
  const caseMat = M.painted('#4d5344', { repeat: 1.4, panels: 2 });
  const dark = M.darkMetal();
  let y = pos[1];
  for (let i = 0; i < count; i++) {
    const w = 1.0 + rng.float() * 0.5;
    const h = 0.34 + rng.float() * 0.2;
    const d = 0.6 + rng.float() * 0.3;
    const jitter = rng.spread(0.16);
    kit.place(caseMat, G.roundedBox(w, h, d, 0.03), [pos[0] + jitter, y + h / 2, pos[2] + rng.spread(0.16)], [0, yaw + rng.spread(0.3), 0]);
    // Latches.
    kit.place(dark, new THREE.BoxGeometry(0.07, 0.09, d * 0.9), [pos[0] + jitter + w * 0.36, y + h / 2, pos[2]], [0, yaw, 0]);
    y += h;
  }
}

/** Cable trays and loose cable runs snaking between structures. */
function cableRun(kit, from, to, rng, { sag = 0.35, radius = 0.035, strands = 3 } = {}) {
  const hose = M.hoseMat();
  for (let i = 0; i < strands; i++) {
    const off = (i - (strands - 1) / 2) * radius * 2.4;
    kit.add(
      hose,
      G.cable(
        [from[0] + off, from[1] + rng.spread(0.05), from[2]],
        [to[0] + off, to[1] + rng.spread(0.05), to[2]],
        sag + rng.spread(0.08),
        radius,
        12
      )
    );
  }
}

/** Sandbag revetment. */
function sandbagWall(kit, from, to, rng, rows = 3) {
  const bagMat = M.tarpMat('#7c7156');
  const a = new THREE.Vector3().fromArray(from);
  const b = new THREE.Vector3().fromArray(to);
  const len = a.distanceTo(b);
  const perBag = 0.42;
  const n = Math.max(2, Math.round(len / perBag));
  const bag = G.roundedBox(0.44, 0.2, 0.28, 0.09, 1);
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n - r; i++) {
      const t = (i + (r % 2) * 0.5) / Math.max(1, n - 1);
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      kit.place(
        bagMat,
        bag,
        [p.x + rng.spread(0.03), p.y + 0.1 + r * 0.19, p.z + rng.spread(0.03)],
        [rng.spread(0.06), Math.atan2(b.x - a.x, b.z - a.z) + rng.spread(0.12), rng.spread(0.06)]
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * The base
 * ------------------------------------------------------------------ */

export class MilitaryBase {
  constructor(scene, collision) {
    this.scene = scene;
    this.collision = collision;
    this.rng = new Rng(settings.seed ^ 0xba5e);
    this.group = new THREE.Group();
    this.group.name = 'base';
    scene.add(this.group);

    this.animated = {
      radarArray: null,
      radarDish: null,
      beacons: [],
      floodlights: [],
      windsock: null
    };
    this.time = 0;
    this.nightMode = false;
    /** Azimuth the search array is currently facing (radians, 0 = north). */
    this.sweepAzimuth = 0;

    // Anchors that the rest of the game hangs off.
    this.anchors = {
      patriot: { pos: new THREE.Vector3(-54, 0, -22), yaw: THREE.MathUtils.degToRad(12) },
      thaad: { pos: new THREE.Vector3(46, 0, -30), yaw: THREE.MathUtils.degToRad(-16) },
      sentinel: { pos: new THREE.Vector3(-4, 0, -66), yaw: THREE.MathUtils.degToRad(2) },
      radar: { pos: new THREE.Vector3(30, 0, 12), yaw: THREE.MathUtils.degToRad(-8) },
      shelter: { pos: new THREE.Vector3(-8, 0, 34), yaw: 0 }
    };
    this.playerSpawn = new THREE.Vector3(-8, 0, 47);
    // Yaw 0 faces -Z, which is north here: straight up the apron at the pads.
    this.playerSpawnYaw = 0;
    this.consoleSeat = new THREE.Vector3(-8, 0, 36.6);
    this.consoleFocus = new THREE.Vector3(-8, 1.15, 33.4);
  }

  build() {
    this._buildTerrain();
    this._buildApron();
    this._buildShelter();
    this._buildRadarStation();
    this._buildSupportArea();
    this._buildPerimeter();
    this._buildMarkings();
    this.collision.build();
    return this;
  }

  /* ---------------------------------------------------- terrain */
  _buildTerrain() {
    const q = settings.quality;

    // Far terrain: one big displaced plane carrying the mountain ranges.
    const farSize = 34000;
    const farSeg = Math.max(96, Math.floor(q.terrainSegments * 1.15));
    const farGeo = new THREE.PlaneGeometry(farSize, farSize, farSeg, farSeg);
    farGeo.rotateX(-Math.PI / 2);
    this._displace(farGeo, true);
    const farMat = new THREE.MeshStandardMaterial({
      map: (() => {
        const t = T.sand({}).clone();
        t.needsUpdate = true;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(420, 420);
        return t;
      })(),
      vertexColors: true,
      roughness: 0.97,
      metalness: 0.0
    });
    const farMesh = new THREE.Mesh(farGeo, farMat);
    farMesh.name = 'terrain-far';
    farMesh.receiveShadow = false;
    this.group.add(farMesh);

    // Near terrain: fine mesh around the site so footfalls and berms read.
    const nearSize = 1400;
    const nearSeg = Math.max(64, Math.floor(q.terrainSegments * 0.85));
    const nearGeo = new THREE.PlaneGeometry(nearSize, nearSize, nearSeg, nearSeg);
    nearGeo.rotateX(-Math.PI / 2);
    this._displace(nearGeo, false);
    const nearMat = new THREE.MeshStandardMaterial({
      map: (() => {
        const t = T.sand({}).clone();
        t.needsUpdate = true;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(90, 90);
        t.anisotropy = q.anisotropy;
        return t;
      })(),
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.0
    });
    const nearMesh = new THREE.Mesh(nearGeo, nearMat);
    nearMesh.name = 'terrain-near';
    nearMesh.receiveShadow = settings.quality.shadows;
    nearMesh.position.y = 0.02;
    this.group.add(nearMesh);

    // Scattered rocks and desert scrub for close-up interest.
    this._scatterGroundDetail();
  }

  _displace(geo, isFar) {
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const sandCol = new THREE.Color('#b39a72');
    const rockCol = new THREE.Color('#6d6355');
    const highCol = new THREE.Color('#9a9188');
    const dryCol = new THREE.Color('#8e7f60');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let y = terrainHeight(x, z);
      if (isFar) {
        // Sink the coarse sheet under the fine one so they never z-fight.
        const d = Math.hypot(x, z);
        y -= (1 - smoothstep(620, 1000, d)) * 3.5;
      }
      pos.setY(i, y);

      const d = Math.hypot(x, z);
      const alt = saturate((y - 40) / 900);
      const mix = saturate((y - 8) / 120);
      c.copy(sandCol).lerp(dryCol, saturate(terrainNoise.fbm2(x / 240, z / 240, 3) * 0.5 + 0.5));
      c.lerp(rockCol, mix * 0.85);
      c.lerp(highCol, Math.pow(alt, 1.6) * 0.8);
      // Slight darkening right around the pad from vehicle traffic.
      const traffic = 1 - saturate((d - 90) / 160) * 0.0;
      c.multiplyScalar(0.94 + terrainNoise.fbm2(x / 55, z / 55, 2) * 0.12 * traffic);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
  }

  _scatterGroundDetail() {
    const rng = this.rng.fork('scatter');
    const q = settings.quality;
    const rockCount = Math.floor(340 * q.groundDetail);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = M.metal('#6a6055', 0.98, 0.02);
    rockMat.flatShading = true;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rocks.castShadow = q.shadows;
    rocks.receiveShadow = q.shadows;
    const m = new THREE.Matrix4();
    const qt = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const p = new THREE.Vector3();
    let placed = 0;
    let guard = 0;
    while (placed < rockCount && guard++ < rockCount * 12) {
      const a = rng.float() * Math.PI * 2;
      const r = 24 + Math.pow(rng.float(), 0.6) * 620;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // Keep rocks off the apron.
      if (Math.abs(x) < 108 && z > -104 && z < 62) continue;
      p.set(x, terrainHeight(x, z) - 0.15, z);
      qt.setFromEuler(new THREE.Euler(rng.spread(0.5), rng.float() * 6.28, rng.spread(0.5)));
      const s = 0.25 + Math.pow(rng.float(), 2.4) * 2.4;
      sc.set(s, s * (0.5 + rng.float() * 0.5), s * (0.7 + rng.float() * 0.6));
      m.compose(p, qt, sc);
      rocks.setMatrixAt(placed++, m);
    }
    rocks.count = placed;
    rocks.instanceMatrix.needsUpdate = true;
    rocks.name = 'rocks';
    this.group.add(rocks);

    // Desert scrub: crossed alpha cards, cheap and effective.
    const scrubCount = Math.floor(420 * q.groundDetail);
    const blade = new THREE.PlaneGeometry(1.5, 1.0);
    blade.translate(0, 0.5, 0);
    const blade2 = blade.clone();
    blade2.rotateY(Math.PI / 2);
    const scrubGeo = G.merge([blade, blade2]);
    const scrubMat = new THREE.MeshStandardMaterial({
      map: this._scrubTexture(),
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      color: '#8e8258'
    });
    const scrub = new THREE.InstancedMesh(scrubGeo, scrubMat, scrubCount);
    scrub.castShadow = false;
    scrub.receiveShadow = false;
    let sPlaced = 0;
    guard = 0;
    while (sPlaced < scrubCount && guard++ < scrubCount * 12) {
      const a = rng.float() * Math.PI * 2;
      const r = 30 + Math.pow(rng.float(), 0.7) * 500;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 106 && z > -102 && z < 60) continue;
      p.set(x, terrainHeight(x, z) - 0.05, z);
      qt.setFromEuler(new THREE.Euler(0, rng.float() * 6.28, 0));
      const s = 0.5 + rng.float() * 1.5;
      sc.set(s, s * (0.7 + rng.float() * 0.8), s);
      m.compose(p, qt, sc);
      scrub.setMatrixAt(sPlaced++, m);
    }
    scrub.count = sPlaced;
    scrub.instanceMatrix.needsUpdate = true;
    scrub.name = 'scrub';
    this.group.add(scrub);
  }

  _scrubTexture() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const x0 = size * 0.5 + (Math.random() - 0.5) * size * 0.25;
      const y0 = size;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const len = size * (0.35 + Math.random() * 0.55);
      const g = 130 + Math.random() * 90;
      ctx.strokeStyle = `rgba(${g | 0},${(g * 0.92) | 0},${(g * 0.6) | 0},${0.55 + Math.random() * 0.45})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(
        x0 + Math.cos(ang) * len * 0.5 + (Math.random() - 0.5) * 20,
        y0 + Math.sin(ang) * len * 0.5,
        x0 + Math.cos(ang) * len,
        y0 + Math.sin(ang) * len
      );
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* ---------------------------------------------------- apron & roads */
  _buildApron() {
    const kit = new Kit();
    const conc = M.concreteMat(14);
    const grav = M.gravelMat(26);

    // Main apron slab, slightly proud of the ground.
    const apron = new THREE.BoxGeometry(196, 0.24, 168);
    kit.place(conc, apron, [-4, 0.12, -12]);

    // Battery hardstands.
    for (const key of ['patriot', 'thaad', 'sentinel']) {
      const a = this.anchors[key];
      kit.place(conc, new THREE.BoxGeometry(34, 0.3, 30), [a.pos.x, 0.28, a.pos.z], [0, a.yaw, 0]);
      // Low earth revetment on the flanks.
      const berm = new THREE.BoxGeometry(36, 1.5, 2.4);
      kit.place(M.gravelMat(8), berm, [a.pos.x, 0.7, a.pos.z + 16.5], [0, a.yaw, 0]);
    }

    // Service roads out from the apron.
    const road = (x1, z1, x2, z2, w) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const geo = new THREE.BoxGeometry(w, 0.14, len);
      kit.place(grav, geo, [(x1 + x2) / 2, 0.19, (z1 + z2) / 2], [0, Math.atan2(dx, dz), 0]);
    };
    road(-4, 72, -4, 250, 9);
    road(-4, 72, 60, 120, 7);
    road(-100, -12, -190, 20, 7);

    this.group.add(kit.build('apron', { castShadow: false, receiveShadow: true }));

    // The apron slab is solid: register a thin collider so the player stands on it.
    this.collision.addBox(-4, 0.06, -12, 98, 0.12, 84, 0, 'apron');
  }

  /* ---------------------------------------------------- command shelter */
  _buildShelter() {
    const kit = new Kit();
    const rng = this.rng.fork('shelter');
    const a = this.anchors.shelter;
    const ox = a.pos.x;
    const oz = a.pos.z;

    const W = 15.5; // east-west
    const D = 9.0; // north-south
    const H = 3.6;
    const wall = M.painted('#6b6f60', { repeat: 2.6, panels: 5 });
    const dark = M.darkMetal();
    const trim = M.painted('#4a4e42', { repeat: 2 });

    // Concrete plinth.
    kit.place(M.concreteMat(4), new THREE.BoxGeometry(W + 2.4, 0.4, D + 2.4), [ox, 0.2, oz]);

    // Walls: corrugated panels with a big north-facing observation window.
    const t = 0.28;
    const winW = 8.4;
    const winH = 1.5;
    const winSillY = 1.35;

    // South wall (behind the console) with a door.
    const doorW = 1.5;
    kit.place(wall, G.corrugated((W - doorW) / 2, H, 0.06), [ox - (W + doorW) / 4, 0.4 + H / 2, oz + D / 2], [0, Math.PI, 0]);
    kit.place(wall, G.corrugated((W - doorW) / 2, H, 0.06), [ox + (W + doorW) / 4, 0.4 + H / 2, oz + D / 2], [0, Math.PI, 0]);
    kit.place(wall, new THREE.BoxGeometry(doorW, 0.6, t), [ox, 0.4 + H - 0.3, oz + D / 2]);
    // Door frame + open door leaf.
    kit.place(dark, new THREE.BoxGeometry(doorW + 0.2, 0.1, t + 0.06), [ox, 0.4 + 2.2, oz + D / 2]);
    kit.place(trim, new THREE.BoxGeometry(0.06, 2.15, 0.9), [ox - doorW / 2 - 0.05, 0.4 + 1.07, oz + D / 2 + 0.45], [0, 0.9, 0]);

    // North wall with the window band.
    kit.place(wall, G.corrugated(W, winSillY, 0.06), [ox, 0.4 + winSillY / 2, oz - D / 2]);
    kit.place(wall, G.corrugated(W, H - winSillY - winH, 0.06), [ox, 0.4 + winSillY + winH + (H - winSillY - winH) / 2, oz - D / 2]);
    kit.place(wall, new THREE.BoxGeometry((W - winW) / 2, winH, t), [ox - (W + winW) / 4, 0.4 + winSillY + winH / 2, oz - D / 2]);
    kit.place(wall, new THREE.BoxGeometry((W - winW) / 2, winH, t), [ox + (W + winW) / 4, 0.4 + winSillY + winH / 2, oz - D / 2]);
    kit.place(M.glassMat('#14262a', 0.24), new THREE.BoxGeometry(winW, winH, 0.04), [ox, 0.4 + winSillY + winH / 2, oz - D / 2]);
    // Window mullions.
    for (let i = 1; i < 4; i++) {
      kit.place(dark, new THREE.BoxGeometry(0.07, winH, 0.16), [ox - winW / 2 + (winW * i) / 4, 0.4 + winSillY + winH / 2, oz - D / 2]);
    }
    kit.place(dark, new THREE.BoxGeometry(winW + 0.2, 0.1, 0.34), [ox, 0.4 + winSillY - 0.05, oz - D / 2 - 0.06]);
    kit.place(dark, new THREE.BoxGeometry(winW + 0.2, 0.1, 0.34), [ox, 0.4 + winSillY + winH + 0.05, oz - D / 2 - 0.06]);

    // East / west walls.
    kit.place(wall, G.corrugated(D, H, 0.06), [ox - W / 2, 0.4 + H / 2, oz], [0, Math.PI / 2, 0]);
    kit.place(wall, G.corrugated(D, H, 0.06), [ox + W / 2, 0.4 + H / 2, oz], [0, -Math.PI / 2, 0]);

    // Roof: slight camber plus rooftop clutter.
    kit.place(trim, new THREE.BoxGeometry(W + 0.9, 0.24, D + 0.9), [ox, 0.4 + H + 0.12, oz]);
    kit.place(dark, G.railing(W - 0.6, D - 0.6, 0.85), [ox, 0.4 + H + 0.24, oz]);
    kit.place(M.painted('#7d8175', { repeat: 1.4 }), G.roundedBox(1.6, 0.9, 1.2, 0.06), [ox + 4.2, 0.4 + H + 0.7, oz + 1.4]);
    kit.place(dark, new THREE.CylinderGeometry(0.5, 0.5, 0.34, 12), [ox + 4.2, 0.4 + H + 1.32, oz + 1.4]);
    kit.place(dark, G.roundedBox(1.1, 0.5, 0.8, 0.04), [ox - 5.2, 0.4 + H + 0.5, oz - 1.6]);
    kit.place(M.metal('#8b8f88', 0.4, 0.9), G.ladder(H + 0.6, 0.4), [ox + W / 2 + 0.22, 0.4, oz + 2.6], [0, -Math.PI / 2, 0]);

    // A/C condensers and cable bundles on the east wall.
    kit.place(dark, G.roundedBox(1.0, 0.8, 0.5, 0.04), [ox + W / 2 + 0.3, 1.4, oz - 2.2]);
    cableRun(kit, [ox + W / 2 + 0.3, 1.05, oz - 2.2], [ox + W / 2 + 0.3, 0.5, oz + 1.5], rng, { sag: 0.5, strands: 4 });

    // Sandbags and barriers around the entrance.
    sandbagWall(kit, [ox - W / 2 - 1.6, 0.4, oz + D / 2 + 1.4], [ox - 1.6, 0.4, oz + D / 2 + 1.4], rng, 3);
    sandbagWall(kit, [ox + 1.6, 0.4, oz + D / 2 + 1.4], [ox + W / 2 + 1.6, 0.4, oz + D / 2 + 1.4], rng, 3);

    // ---- interior ----
    this._buildConsole(kit, ox, oz, D);

    // Floor.
    kit.place(M.concreteMat(3), new THREE.BoxGeometry(W - 0.5, 0.06, D - 0.5), [ox, 0.42, oz]);

    // Interior clutter.
    equipmentStack(kit, [ox + 5.4, 0.45, oz + 2.4], rng, 3, 0.3);
    kit.place(M.painted('#4a4e42', { repeat: 1 }), G.roundedBox(0.8, 1.9, 0.6, 0.05), [ox - 6.6, 0.45 + 0.95, oz + 2.6], [0, 0.2, 0]);
    kit.place(dark, G.roundedBox(1.4, 0.75, 0.7, 0.04), [ox + 6.2, 0.45 + 0.38, oz - 2.4]);

    this.group.add(kit.build('shelter'));

    // Colliders: walls, not the doorway.
    const y = 0.4 + H / 2;
    this.collision.addBox(ox - (W + doorW) / 4, y, oz + D / 2, (W - doorW) / 4, H / 2, 0.3, 0, 'shelter');
    this.collision.addBox(ox + (W + doorW) / 4, y, oz + D / 2, (W - doorW) / 4, H / 2, 0.3, 0, 'shelter');
    this.collision.addBox(ox, y, oz - D / 2, W / 2, H / 2, 0.3, 0, 'shelter');
    this.collision.addBox(ox - W / 2, y, oz, 0.3, H / 2, D / 2, 0, 'shelter');
    this.collision.addBox(ox + W / 2, y, oz, 0.3, H / 2, D / 2, 0, 'shelter');
    this.collision.addBox(ox, 0.2, oz, W / 2 + 1.2, 0.22, D / 2 + 1.2, 0, 'shelter-plinth');
  }

  /** The primary control console: desk, screens and the holo radar plinth. */
  _buildConsole(kit, ox, oz, D) {
    const dark = M.darkMetal();
    const body = M.painted('#3d4139', { repeat: 1.6, panels: 3 });
    const zFront = oz - D / 2 + 1.9;

    // Desk.
    kit.place(body, G.roundedBox(6.4, 0.12, 1.15, 0.03), [ox, 1.16, zFront]);
    kit.place(body, G.roundedBox(6.4, 0.75, 0.12, 0.03), [ox, 0.8, zFront + 0.5]);
    kit.place(dark, new THREE.BoxGeometry(0.14, 0.7, 1.0), [ox - 3.0, 0.77, zFront]);
    kit.place(dark, new THREE.BoxGeometry(0.14, 0.7, 1.0), [ox + 3.0, 0.77, zFront]);
    // Rack pedestals with vents.
    kit.place(body, G.roundedBox(1.2, 0.72, 1.0, 0.04), [ox - 2.2, 0.78, zFront]);
    kit.place(body, G.roundedBox(1.2, 0.72, 1.0, 0.04), [ox + 2.2, 0.78, zFront]);
    for (let i = 0; i < 6; i++) {
      kit.place(dark, new THREE.BoxGeometry(1.0, 0.03, 0.02), [ox - 2.2, 0.5 + i * 0.08, zFront - 0.51]);
      kit.place(dark, new THREE.BoxGeometry(1.0, 0.03, 0.02), [ox + 2.2, 0.5 + i * 0.08, zFront - 0.51]);
    }

    // Angled monitor bank.
    const screens = [
      { x: -2.35, label: 'TRACK FILE', hue: '#7ff2d0', yaw: 0.34 },
      { x: 2.35, label: 'BTY STATUS', hue: '#ffcf6a', yaw: -0.34 }
    ];
    for (const s of screens) {
      kit.place(dark, G.roundedBox(1.5, 0.95, 0.1, 0.03), [ox + s.x, 1.72, zFront - 0.18], [-0.22, s.yaw, 0]);
      kit.place(
        M.screenMat(s.label, { hue: s.hue, rows: 6 }),
        new THREE.PlaneGeometry(1.36, 0.82),
        [ox + s.x + Math.sin(s.yaw) * 0.06, 1.72, zFront - 0.24 - Math.cos(s.yaw) * 0.0],
        [-0.22, s.yaw, 0]
      );
    }

    // Keyboard trays and a bank of covered switches.
    kit.place(dark, G.roundedBox(1.1, 0.04, 0.36, 0.02), [ox - 0.9, 1.24, zFront - 0.28], [-0.12, 0, 0]);
    kit.place(dark, G.roundedBox(1.1, 0.04, 0.36, 0.02), [ox + 0.9, 1.24, zFront - 0.28], [-0.12, 0, 0]);
    for (let i = 0; i < 8; i++) {
      kit.place(M.hazardMat(1), new THREE.BoxGeometry(0.09, 0.05, 0.09), [ox - 0.35 + i * 0.1, 1.25, zFront + 0.24]);
    }

    // Holo radar plinth in the middle of the desk.
    kit.place(dark, new THREE.CylinderGeometry(0.62, 0.72, 0.14, 24), [ox, 1.29, zFront - 0.05]);
    kit.place(M.metal('#2a2d29', 0.4, 0.9), new THREE.TorusGeometry(0.64, 0.03, 8, 32), [ox, 1.36, zFront - 0.05], [Math.PI / 2, 0, 0]);
    this.holoAnchor = new THREE.Vector3(ox, 1.38, zFront - 0.05);

    // Overhead light bar.
    kit.place(dark, new THREE.BoxGeometry(6.0, 0.1, 0.3), [ox, 3.55, zFront + 0.3]);
    const tube = new THREE.BoxGeometry(5.6, 0.05, 0.18);
    kit.place(M.lamp('#cfe6ff', 1.6), tube, [ox, 3.5, zFront + 0.3]);

    // Chair.
    kit.place(dark, new THREE.CylinderGeometry(0.32, 0.36, 0.08, 12), [ox, 0.52, zFront + 1.5]);
    kit.place(dark, new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), [ox, 0.72, zFront + 1.5]);
    kit.place(M.tarpMat('#2c2f2b'), G.roundedBox(0.52, 0.1, 0.5, 0.05), [ox, 0.95, zFront + 1.5]);
    kit.place(M.tarpMat('#2c2f2b'), G.roundedBox(0.52, 0.6, 0.1, 0.05), [ox, 1.28, zFront + 1.74], [0.16, 0, 0]);
  }

  /* ---------------------------------------------------- radar station */
  _buildRadarStation() {
    const kit = new Kit();
    const rng = this.rng.fork('radar');
    const a = this.anchors.radar;
    const ox = a.pos.x;
    const oz = a.pos.z;
    const yaw = a.yaw;

    const body = M.painted('#6a6e60', { repeat: 2 });
    const dark = M.darkMetal();

    // Trailer chassis with outriggers.
    kit.place(M.concreteMat(3), new THREE.BoxGeometry(13, 0.3, 9), [ox, 0.15, oz], [0, yaw, 0]);
    kit.place(dark, new THREE.BoxGeometry(9.5, 0.5, 3.0), [ox, 0.85, oz], [0, yaw, 0]);
    kit.place(body, G.roundedBox(6.5, 1.9, 2.8, 0.08), [ox - 1.2, 2.05, oz], [0, yaw, 0]);
    for (const sx of [-4.4, 4.4]) {
      for (const sz of [-1.7, 1.7]) {
        const p = new THREE.Vector3(sx, 0, sz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        kit.place(dark, new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8), [ox + p.x, 0.5, oz + p.z]);
        kit.place(M.metal('#8d918a', 0.4, 0.9), new THREE.BoxGeometry(0.55, 0.12, 0.55), [ox + p.x, 0.2, oz + p.z], [0, yaw, 0]);
      }
    }
    // Wheels.
    const wheel = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 14);
    wheel.rotateX(Math.PI / 2);
    for (const sx of [-3.2, -1.8, 3.0]) {
      for (const sz of [-1.6, 1.6]) {
        const p = new THREE.Vector3(sx, 0, sz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        kit.place(M.rubberMat(1.2), wheel, [ox + p.x, 0.7, oz + p.z], [0, yaw, 0]);
      }
    }

    // Cooling and power skids beside the trailer.
    generatorUnit(kit, [ox - 7.0, 0.3, oz + 3.0], yaw + 0.2);
    generatorUnit(kit, [ox - 7.0, 0.3, oz - 3.2], yaw - 0.15);
    cableRun(kit, [ox - 5.6, 1.1, oz + 3.0], [ox - 2.6, 0.95, oz + 1.2], rng, { strands: 4, sag: 0.55 });

    this.group.add(kit.build('radar-static'));

    // ---- rotating array (separate group so it can spin) ----
    const arrKit = new Kit();
    const arrayW = 5.2;
    const arrayH = 4.0;
    // Backing structure.
    arrKit.place(M.painted('#5e6256', { repeat: 2 }), G.roundedBox(arrayW, arrayH, 0.42, 0.06), [0, arrayH / 2, 0]);
    // Emitter face: a grid of small radiating elements.
    const faceMat = M.metal('#2f342f', 0.35, 0.95);
    const elem = new THREE.BoxGeometry(0.14, 0.14, 0.07);
    const cols = 22;
    const rows = 17;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = -arrayW / 2 + 0.22 + (i / (cols - 1)) * (arrayW - 0.44);
        const y = 0.26 + (j / (rows - 1)) * (arrayH - 0.52);
        arrKit.place(faceMat, elem, [x, y, -0.25]);
      }
    }
    arrKit.place(M.metal('#8d918a', 0.42, 0.92), new THREE.BoxGeometry(arrayW + 0.2, 0.14, 0.6), [0, arrayH + 0.05, -0.1]);
    arrKit.place(M.metal('#8d918a', 0.42, 0.92), new THREE.BoxGeometry(arrayW + 0.2, 0.14, 0.6), [0, -0.05, -0.1]);
    // Tilt actuators behind the array.
    for (const sx of [-1.5, 1.5]) {
      arrKit.place(M.chrome(), new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), [sx, 1.1, 0.55], [0.5, 0, 0]);
      arrKit.place(M.darkMetal(), new THREE.CylinderGeometry(0.1, 0.1, 1.1, 10), [sx, 0.55, 0.85], [0.5, 0, 0]);
    }
    const arrayGroup = arrKit.build('radar-array');
    // Mount the array on a yoke that rotates.
    const yokeKit = new Kit();
    yokeKit.place(M.painted('#5b5f54', { repeat: 1.6 }), new THREE.CylinderGeometry(1.05, 1.25, 0.55, 18), [0, 0.28, 0]);
    yokeKit.place(M.metal('#7d817a', 0.45, 0.9), new THREE.BoxGeometry(0.3, 1.5, 0.3), [-1.6, 1.3, 0]);
    yokeKit.place(M.metal('#7d817a', 0.45, 0.9), new THREE.BoxGeometry(0.3, 1.5, 0.3), [1.6, 1.3, 0]);
    const yoke = yokeKit.build('radar-yoke');
    arrayGroup.position.set(0, 1.1, 0);
    // Tilt the emitter face up toward the search volume.
    arrayGroup.rotation.x = 0.3;
    yoke.add(arrayGroup);
    yoke.position.set(ox - 1.2, 3.0, oz);
    this.group.add(yoke);
    this.animated.radarArray = yoke;
    this.animated.radarArrayFace = arrayGroup;

    // ---- secondary rotating dish on a mast ----
    const mastKit = new Kit();
    mastKit.place(M.metal('#767a72', 0.5, 0.85), G.truss(7.5, 0.7), [0, 0, 0]);
    const mast = mastKit.build('radar-mast');
    mast.position.set(ox + 5.4, 0.3, oz);
    this.group.add(mast);

    const dishKit = new Kit();
    const dishGeo = new THREE.SphereGeometry(1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.4);
    dishGeo.scale(1, 0.5, 1);
    dishKit.place(M.painted('#c3c2b8', { repeat: 1.2, panels: 3 }), dishGeo, [0, 0, 0], [Math.PI * 0.62, 0, 0]);
    dishKit.place(M.metal('#5c605a', 0.4, 0.9), new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), [0, 0.42, 0.62], [Math.PI * 0.62, 0, 0]);
    dishKit.place(M.metal('#5c605a', 0.4, 0.9), new THREE.SphereGeometry(0.16, 10, 8), [0, 0.72, 1.05]);
    dishKit.place(M.darkMetal(), new THREE.BoxGeometry(0.6, 0.5, 0.6), [0, -0.5, 0]);
    const dish = dishKit.build('radar-dish');
    dish.position.set(ox + 5.4, 8.2, oz);
    this.group.add(dish);
    this.animated.radarDish = dish;

    antennaMast(kit, [ox + 9.5, 0.3, oz - 4.5], 11, yaw);
    this.group.add(kit.build('radar-extra'));

    this.collision.addBox(ox - 1.2, 1.8, oz, 3.6, 1.8, 1.8, yaw, 'radar');
    this.collision.addBox(ox + 5.4, 3.5, oz, 0.6, 3.5, 0.6, 0, 'radar-mast');
    this.collision.addBox(ox, 0.16, oz, 6.5, 0.16, 4.5, yaw, 'radar-pad');
  }

  /* ---------------------------------------------------- support area */
  _buildSupportArea() {
    const kit = new Kit();
    const rng = this.rng.fork('support');

    // Vehicle park east of the shelter.
    supportTruck(kit, [26, 0.24, 46], -0.35, { variant: 'desert' });
    supportTruck(kit, [34, 0.24, 44], -0.2, { variant: 'olive' });
    supportTruck(kit, [-40, 0.24, 40], 1.9, { variant: 'desert', tilt: false });
    this.collision.addBox(26, 1.4, 46, 3.4, 1.4, 1.4, -0.35, 'truck');
    this.collision.addBox(34, 1.4, 44, 3.4, 1.4, 1.4, -0.2, 'truck');
    this.collision.addBox(-40, 1.4, 40, 3.4, 1.4, 1.4, 1.9, 'truck');

    // Generator farm + fuel bladders.
    generatorUnit(kit, [-26, 0.24, 30], 0.1);
    generatorUnit(kit, [-26, 0.24, 25.5], 0.1);
    generatorUnit(kit, [-26, 0.24, 21], 0.1);
    this.collision.addBox(-26, 1.1, 25.5, 2.0, 1.1, 6.5, 0, 'generators');
    cableRun(kit, [-24.4, 1.2, 25.5], [-15.6, 0.9, 32], rng, { strands: 5, sag: 0.7 });

    const fuel = new THREE.CylinderGeometry(1.5, 1.5, 5.4, 18);
    fuel.rotateZ(Math.PI / 2);
    kit.place(M.painted('#5a5f4e', { repeat: 1.6, panels: 3 }), fuel, [-34, 1.74, 27], [0, 0.1, 0]);
    kit.place(M.darkMetal(), new THREE.BoxGeometry(6.0, 0.3, 3.4), [-34, 0.39, 27], [0, 0.1, 0]);
    this.collision.addBox(-34, 1.7, 27, 3.0, 1.7, 1.6, 0.1, 'fuel');

    // Antenna field.
    antennaMast(kit, [-52, 0.24, 24], 12, 0.4);
    antennaMast(kit, [-58, 0.24, 30], 8, -0.3);
    this.collision.addBox(-52, 3, 24, 0.5, 3, 0.5, 0, 'mast');
    this.collision.addBox(-58, 2.4, 30, 0.45, 2.4, 0.45, 0, 'mast');

    // Equipment cases and pallets scattered around working areas.
    for (const p of [
      [-16, 0.24, 26], [-13, 0.24, 27.5], [18, 0.24, 30], [21, 0.24, 28],
      [-46, 0.24, -6], [40, 0.24, -8], [4, 0.24, -46]
    ]) {
      equipmentStack(kit, p, rng, 2 + rng.int(0, 3), rng.float() * Math.PI);
      this.collision.addBox(p[0], 0.7, p[2], 0.9, 0.7, 0.7, 0, 'cases');
    }

    // Jersey barriers guiding the road onto the apron.
    const barrier = jerseyBarrier(3.0);
    const barrMat = M.concreteMat(2);
    const barrierRow = (x1, z1, x2, z2, n) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = lerp(x1, x2, t);
        const z = lerp(z1, z2, t);
        const yaw = Math.atan2(x2 - x1, z2 - z1);
        kit.place(barrMat, barrier, [x, 0.24, z], [0, yaw + Math.PI / 2, 0]);
        this.collision.addBox(x, 0.72, z, 0.35, 0.5, 1.5, yaw + Math.PI / 2, 'barrier');
      }
    };
    barrierRow(-14, 62, -14, 74, 5);
    barrierRow(6, 62, 6, 74, 5);
    barrierRow(-70, -4, -70, 14, 7);
    barrierRow(64, -6, 64, 12, 7);

    // Floodlight masts around the operating area.
    const floodPositions = [
      [-72, 0.24, 34], [30, 0.24, 40], [-70, 0.24, -50], [66, 0.24, -46], [-6, 0.24, -92], [80, 0.24, 8]
    ];
    for (const p of floodPositions) {
      const heads = floodlightMast(kit, p, 10 + rng.float() * 2, rng.float() * Math.PI);
      this.animated.floodlights.push(...heads);
      this.collision.addBox(p[0], 1.2, p[2], 0.35, 1.2, 0.35, 0, 'mast');
    }

    // Windsock on a pole - a nice readable cue for the wind direction.
    const sockKit = new Kit();
    sockKit.place(M.metal('#8b8f88', 0.5, 0.85), new THREE.CylinderGeometry(0.07, 0.09, 6, 8), [0, 3, 0]);
    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.16, 2.2, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: '#e06a2a', roughness: 0.9, side: THREE.DoubleSide })
    );
    sock.rotation.z = Math.PI / 2;
    sock.position.set(1.2, 6, 0);
    const sockGroup = new THREE.Group();
    sockGroup.add(sock);
    sockGroup.position.set(52, 0.24, 34);
    const sockPole = sockKit.build('windsock-pole');
    sockPole.position.set(52, 0.24, 34);
    this.group.add(sockPole);
    this.group.add(sockGroup);
    this.animated.windsock = sockGroup;
    this.collision.addBox(52, 3, 34, 0.25, 3, 0.25, 0, 'mast');

    this.group.add(kit.build('support'));
  }

  /* ---------------------------------------------------- perimeter */
  _buildPerimeter() {
    const kit = new Kit();
    const rng = this.rng.fork('fence');
    const postMat = M.metal('#7b7f78', 0.55, 0.85);
    const meshMat = M.chainLinkMat(1);
    const wireMat = M.metal('#9aa09a', 0.4, 0.9);

    const half = { x: 128, z: 118 };
    const centre = { x: -4, z: -12 };
    const H = 2.6;
    const spacing = 3.2;

    const runFence = (x1, z1, x2, z2, gap = null) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const n = Math.max(2, Math.round(len / spacing));
      const yaw = Math.atan2(dx, dz);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        if (gap && t > gap[0] && t < gap[1]) continue;
        const x = lerp(x1, x2, t);
        const z = lerp(z1, z2, t);
        const gy = groundHeight(x, z);
        kit.place(postMat, new THREE.CylinderGeometry(0.055, 0.065, H, 7), [x, gy + H / 2, z]);
        // Barbed wire outriggers.
        kit.place(postMat, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), [x, gy + H + 0.2, z], [0.5 * Math.cos(yaw), 0, 0.5 * Math.sin(yaw)]);
      }
      // Mesh panels.
      const panels = Math.max(1, Math.round(len / 8));
      for (let i = 0; i < panels; i++) {
        const t0 = i / panels;
        const t1 = (i + 1) / panels;
        if (gap && t1 > gap[0] && t0 < gap[1]) continue;
        const mx = lerp(x1, x2, (t0 + t1) / 2);
        const mz = lerp(z1, z2, (t0 + t1) / 2);
        const gy = groundHeight(mx, mz);
        const panelLen = len / panels;
        const geo = new THREE.PlaneGeometry(panelLen, H);
        const mat = meshMat;
        kit.place(mat, geo, [mx, gy + H / 2, mz], [0, yaw + Math.PI / 2, 0]);
      }
      // Top rail + three strands of barbed wire, laid along the run.
      for (let i = 0; i < 3; i++) {
        const yOff = H + 0.12 + i * 0.16;
        const geo = new THREE.CylinderGeometry(0.014, 0.014, len, 4);
        geo.rotateX(Math.PI / 2);
        kit.place(
          wireMat,
          geo,
          [(x1 + x2) / 2, groundHeight((x1 + x2) / 2, (z1 + z2) / 2) + yOff, (z1 + z2) / 2],
          [0, yaw, 0]
        );
      }
    };

    const c = centre;
    runFence(c.x - half.x, c.z - half.z, c.x + half.x, c.z - half.z);
    runFence(c.x + half.x, c.z - half.z, c.x + half.x, c.z + half.z);
    runFence(c.x + half.x, c.z + half.z, c.x - half.x, c.z + half.z, [0.53, 0.61]);
    runFence(c.x - half.x, c.z + half.z, c.x - half.x, c.z - half.z);

    // Fence colliders as four thin walls with a gate gap on the south run.
    this.collision.addBox(c.x, 1.3, c.z - half.z, half.x, 1.3, 0.2, 0, 'fence');
    this.collision.addBox(c.x + half.x, 1.3, c.z, 0.2, 1.3, half.z, 0, 'fence');
    this.collision.addBox(c.x - half.x, 1.3, c.z, 0.2, 1.3, half.z, 0, 'fence');
    this.collision.addBox(c.x - 62, 1.3, c.z + half.z, 66, 1.3, 0.2, 0, 'fence');
    this.collision.addBox(c.x + 62, 1.3, c.z + half.z, 66, 1.3, 0.2, 0, 'fence');

    // Gate house + boom barrier at the south entrance.
    const gx = c.x - 4;
    const gz = c.z + half.z;
    kit.place(M.painted('#6b6f60', { repeat: 1.6 }), G.roundedBox(2.4, 2.6, 2.4, 0.06), [gx - 6, groundHeight(gx - 6, gz) + 1.3, gz]);
    kit.place(M.glassMat('#16282c', 0.35), new THREE.BoxGeometry(1.9, 0.9, 0.05), [gx - 6, groundHeight(gx - 6, gz) + 1.8, gz - 1.22]);
    kit.place(M.hazardMat(6), new THREE.CylinderGeometry(0.07, 0.07, 7, 8), [gx, groundHeight(gx, gz) + 1.1, gz], [0, 0, Math.PI / 2]);
    kit.place(M.darkMetal(), new THREE.BoxGeometry(0.4, 1.2, 0.4), [gx - 3.4, groundHeight(gx - 3.4, gz) + 0.6, gz]);
    this.collision.addBox(gx - 6, 1.3, gz, 1.2, 1.3, 1.2, 0, 'gatehouse');

    // Warning signage every so often on the fence line.
    const signMat = M.decalMat(['RESTRICTED', 'AREA'], { w: 512, h: 256, color: '#e8e2cf' });
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const ang = t * Math.PI * 2;
      const x = c.x + Math.cos(ang) * half.x * 0.98;
      const z = c.z + Math.sin(ang) * half.z * 0.98;
      const yaw = Math.atan2(c.x - x, c.z - z);
      kit.place(signMat, new THREE.PlaneGeometry(1.1, 0.55), [x, groundHeight(x, z) + 1.5, z], [0, yaw, 0]);
    }

    this.group.add(kit.build('perimeter', { castShadow: false }));
  }

  /* ---------------------------------------------------- painted markings */
  _buildMarkings() {
    const group = new THREE.Group();
    group.name = 'markings';

    const addDecal = (lines, x, z, w, h, yaw = 0, opts = {}) => {
      const mat = M.decalMat(lines, { w: 512, h: 256, color: opts.color || '#ddd8c4', font: opts.font });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.rotation.set(-Math.PI / 2, 0, yaw);
      mesh.position.set(x, 0.26, z);
      mesh.receiveShadow = false;
      mesh.renderOrder = 1;
      group.add(mesh);
    };

    addDecal(['AEGIS LINE', 'SITE 07'], -4, 44, 18, 9, 0);
    addDecal(['PAD A', 'PATRIOT-TYPE'], this.anchors.patriot.pos.x, this.anchors.patriot.pos.z + 11, 12, 6, this.anchors.patriot.yaw);
    addDecal(['PAD B', 'HIGH ALT'], this.anchors.thaad.pos.x, this.anchors.thaad.pos.z + 11, 12, 6, this.anchors.thaad.yaw);
    addDecal(['PAD C', 'SENTINEL'], this.anchors.sentinel.pos.x, this.anchors.sentinel.pos.z + 11, 12, 6, this.anchors.sentinel.yaw);
    addDecal(['NO ENTRY', 'BLAST ZONE'], 18, 6, 10, 5, 0.4);

    // Hazard chevrons around each launcher hardstand.
    const stripe = M.hazardMat(10);
    for (const key of ['patriot', 'thaad', 'sentinel']) {
      const a = this.anchors[key];
      for (const [dx, dz, w, d] of [
        [0, -14.6, 32, 1.2],
        [0, 14.6, 32, 1.2],
        [-16.6, 0, 1.2, 30],
        [16.6, 0, 1.2, 30]
      ]) {
        const geo = new THREE.PlaneGeometry(w, d);
        const mesh = new THREE.Mesh(geo, stripe);
        mesh.rotation.x = -Math.PI / 2;
        const off = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), a.yaw);
        mesh.position.set(a.pos.x + off.x, 0.3, a.pos.z + off.z);
        mesh.rotation.z = a.yaw;
        mesh.renderOrder = 1;
        group.add(mesh);
      }
    }

    // Taxiway centre line down the apron.
    const lineMat = new THREE.MeshStandardMaterial({ color: '#d8cf9e', roughness: 0.9, metalness: 0 });
    for (let i = 0; i < 26; i++) {
      const z = 62 - i * 6.5;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 3.2), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(-4, 0.26, z);
      dash.renderOrder = 1;
      group.add(dash);
    }

    this.group.add(group);
  }

  /* ---------------------------------------------------- runtime */

  /** Floodlights and beacons come on for sunset and night. */
  setNight(on, intensityScale = 1) {
    this.nightMode = on;
    if (!this._floodLights) {
      this._floodLights = [];
      // Real spot lights are expensive: use a handful of the closest masts and
      // fake the rest with emissive lamp housings plus visible light cones.
      const maxReal = settings.quality.shadows ? 4 : 2;
      const kit = new Kit();
      const lampMat = M.lamp('#fff0d0', 2.6);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xffe6b8,
        transparent: true,
        opacity: 0.055,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false
      });
      this._floodCones = [];
      this.animated.floodlights.forEach((head, i) => {
        const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), lampMat);
        lens.position.set(head.pos[0], head.pos[1] - 0.05, head.pos[2]);
        lens.rotation.set(-Math.PI / 2 + head.tilt + 0.6, head.yaw, 0);
        lens.visible = false;
        this.group.add(lens);
        this._floodLights.push({ lens, light: null });

        if (i < maxReal * 4 && settings.quality.lightCones) {
          const h = head.pos[1];
          const cone = new THREE.Mesh(new THREE.ConeGeometry(9, h + 3, 14, 1, true), coneMat);
          cone.position.set(head.pos[0], h / 2 - 1.2, head.pos[2]);
          cone.visible = false;
          cone.renderOrder = 6;
          this.group.add(cone);
          this._floodCones.push(cone);
        }
        if (i % 4 === 0 && this._realFloodCount === undefined) this._realFloodCount = 0;
        if (i % 4 === 0 && this._realFloodCount < maxReal) {
          const light = new THREE.SpotLight(0xffe9c6, 0, 90, 0.95, 0.55, 1.4);
          light.position.set(head.pos[0], head.pos[1], head.pos[2]);
          light.target.position.set(head.pos[0], 0, head.pos[2] + 6);
          light.castShadow = false;
          this.group.add(light);
          this.group.add(light.target);
          this._floodLights[this._floodLights.length - 1].light = light;
          this._realFloodCount++;
        }
      });
      void kit;
    }
    for (const f of this._floodLights) {
      f.lens.visible = on;
      if (f.light) f.light.intensity = on ? 130 * intensityScale : 0;
    }
    if (this._floodCones) for (const c of this._floodCones) c.visible = on;
  }

  update(dt, ctx) {
    this.time += dt;

    // Radar array sweeps back and forth through its fictional search sector;
    // the secondary dish rotates continuously.
    if (this.animated.radarArray) {
      const sweep = Math.sin(this.time * 0.62) * 0.95;
      this.sweepAzimuth = this.anchors.radar.yaw + sweep;
      this.animated.radarArray.rotation.y = this.sweepAzimuth;
    }
    if (this.animated.radarDish) {
      this.animated.radarDish.rotation.y = -this.time * 0.9;
    }
    if (this.animated.windsock && ctx?.weather) {
      const w = ctx.weather;
      this.animated.windsock.rotation.y = Math.atan2(w.windDir.x, w.windDir.z) + Math.PI / 2;
      this.animated.windsock.children[0].rotation.x = Math.sin(this.time * 1.7) * 0.12;
    }
  }
}
