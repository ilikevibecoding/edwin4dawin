import * as THREE from 'three';
import { CELL, WALL_T, FLOOR_T, MATERIALS } from './config.js';
import { makeBox, unionBounds } from './utils.js';
import { getTextures } from './textures.js';

const geoCache = new Map();
export function boxGeo(w, h, d) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}

const matCache = new Map();
export function structureMaterial(material, variant = 'wall') {
  const key = `${material}|${variant}`;
  let m = matCache.get(key);
  if (!m) {
    const tex = getTextures()[material];
    const tint = variant === 'floor' ? 0xd0d0d0 : variant === 'ramp' ? 0xe0e0e0 : 0xffffff;
    m = new THREE.MeshLambertMaterial({ map: tex, color: tint });
    matCache.set(key, m);
  }
  return m;
}

export const RAMP_LEN = Math.sqrt(2) * CELL;

export function structureKey(type, i, k, j, orient = 0) {
  return type === 'wall' ? `w:${i}:${k}:${j}:${orient}` : `${type[0]}:${i}:${k}:${j}`;
}

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _euler = new THREE.Euler();

function partMatrix(x, y, z, rx = 0, ry = 0, rz = 0) {
  _pos.set(x, y, z);
  _quat.setFromEuler(_euler.set(rx, ry, rz));
  return new THREE.Matrix4().compose(_pos, _quat, _scale);
}

/**
 * Builds a grid-aligned structure piece described as instanced `parts`.
 *  wall : orient 0 -> lies along Z at x = i*CELL, spanning z in [j*CELL, (j+1)*CELL]
 *         orient 1 -> lies along X at z = j*CELL, spanning x in [i*CELL, (i+1)*CELL]
 *  floor: covers cell (i, j) at level k
 *  ramp : covers cell (i, j), rising from level k to k+1 in direction orient (0:+X 1:+Z 2:-X 3:-Z)
 * variant: 'solid' | 'door' | 'window' (walls only)
 */
export function createStructure(type, i, k, j, orient, material, variant = 'solid', built = false) {
  const mat = MATERIALS[material];
  const parts = [];
  const boxes = [];
  let ramp = null;
  const y0 = k * CELL;

  if (type === 'wall') {
    const alongZ = orient === 0;
    const baseX = i * CELL;
    const baseZ = j * CELL;
    let segs;
    if (variant === 'door') segs = [[0, 1.2, 0, 4], [2.8, 4, 0, 4], [1.2, 2.8, 2.8, 4]];
    else if (variant === 'window') segs = [[0, 4, 0, 1.1], [0, 4, 2.7, 4], [0, 0.7, 1.1, 2.7], [3.3, 4, 1.1, 2.7]];
    else segs = [[0, 4, 0, 4]];
    const wallMat = structureMaterial(material, 'wall');
    for (const [u0, u1, v0, v1] of segs) {
      const len = u1 - u0;
      const hgt = v1 - v0;
      const geometry = boxGeo(len, hgt, WALL_T);
      let matrix;
      let box;
      if (alongZ) {
        matrix = partMatrix(baseX, y0 + v0 + hgt / 2, baseZ + u0 + len / 2, 0, Math.PI / 2, 0);
        box = makeBox(baseX - WALL_T / 2, y0 + v0, baseZ + u0, baseX + WALL_T / 2, y0 + v1, baseZ + u1);
      } else {
        matrix = partMatrix(baseX + u0 + len / 2, y0 + v0 + hgt / 2, baseZ);
        box = makeBox(baseX + u0, y0 + v0, baseZ - WALL_T / 2, baseX + u1, y0 + v1, baseZ + WALL_T / 2);
      }
      if (variant !== 'solid') box.noStand = true;
      boxes.push(box);
      parts.push({ key: `wall:${len}x${hgt}|${material}`, geometry, material: wallMat, matrix, capacity: 512 });
    }
  } else if (type === 'floor') {
    parts.push({
      key: `floor|${material}`,
      geometry: boxGeo(CELL, FLOOR_T, CELL),
      material: structureMaterial(material, 'floor'),
      matrix: partMatrix(i * CELL + CELL / 2, y0 + 0.05, j * CELL + CELL / 2),
      capacity: 512,
    });
    boxes.push(makeBox(i * CELL, y0 - 0.1, j * CELL, (i + 1) * CELL, y0 + 0.2, (j + 1) * CELL));
  } else if (type === 'ramp') {
    const alongX = orient === 0 || orient === 2;
    const geometry = alongX ? boxGeo(RAMP_LEN, FLOOR_T, CELL) : boxGeo(CELL, FLOOR_T, RAMP_LEN);
    const cx = i * CELL + CELL / 2;
    const cy = y0 + CELL / 2 - 0.12;
    const cz = j * CELL + CELL / 2;
    let matrix;
    if (orient === 0) matrix = partMatrix(cx, cy, cz, 0, 0, Math.PI / 4);
    else if (orient === 2) matrix = partMatrix(cx, cy, cz, 0, 0, -Math.PI / 4);
    else if (orient === 1) matrix = partMatrix(cx, cy, cz, -Math.PI / 4, 0, 0);
    else matrix = partMatrix(cx, cy, cz, Math.PI / 4, 0, 0);
    parts.push({ key: `ramp${alongX ? 'X' : 'Z'}|${material}`, geometry, material: structureMaterial(material, 'ramp'), matrix, capacity: 128 });
    ramp = { minX: i * CELL, maxX: (i + 1) * CELL, minZ: j * CELL, maxZ: (j + 1) * CELL, y0, dir: orient };
  }

  const bounds = ramp
    ? makeBox(ramp.minX, y0, ramp.minZ, ramp.maxX, y0 + CELL, ramp.maxZ)
    : unionBounds(boxes);

  return {
    kind: 'structure',
    type,
    variant,
    material,
    i, k, j, orient,
    key: structureKey(type, i, k, j, orient),
    hp: mat.hp,
    maxHp: mat.hp,
    boxes,
    ramp,
    bounds,
    parts,
    blocksShots: true,
    built,
    centerX: bounds.minX + (bounds.maxX - bounds.minX) / 2,
    centerZ: bounds.minZ + (bounds.maxZ - bounds.minZ) / 2,
  };
}

/** Translucent preview mesh for the build ghost. */
export function createGhost() {
  const okMat = new THREE.MeshBasicMaterial({ color: 0x4bd6ff, transparent: true, opacity: 0.35, depthWrite: false });
  const badMat = new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.35, depthWrite: false });
  const wallZ = new THREE.Mesh(boxGeo(WALL_T, CELL, CELL), okMat);
  const wallX = new THREE.Mesh(boxGeo(CELL, CELL, WALL_T), okMat);
  const floor = new THREE.Mesh(boxGeo(CELL, FLOOR_T, CELL), okMat);
  const rampX = new THREE.Mesh(boxGeo(RAMP_LEN, FLOOR_T, CELL), okMat);
  const rampZ = new THREE.Mesh(boxGeo(CELL, FLOOR_T, RAMP_LEN), okMat);
  const group = new THREE.Group();
  for (const m of [wallZ, wallX, floor, rampX, rampZ]) {
    m.visible = false;
    group.add(m);
  }
  group.visible = false;
  return { group, okMat, badMat, meshes: { wallZ, wallX, floor, rampX, rampZ } };
}
