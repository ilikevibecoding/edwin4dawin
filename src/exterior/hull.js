// Exterior hull: the wedge (dorsal / ventral plateaus, bevels, trench, stern face), thousands of
// instanced armour plates and greebles chunked along z for LOD + culling, the ventral hangar module
// with its bay opening, and the reactor bulb.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { rng, setVertexColor } from "../kit.js";
import { HULL, halfWidth, dorsalH, ventralH, skinPoint, CHUNKS, chunkIndex, chunkCenterZ, HANGAR, REACTOR, CITY } from "./dims.js";

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

/** Non-indexed flat-shaded geometry from a list of triangles (arrays of [x,y,z]). */
function trisToGeometry(tris, uvScale = 0.02) {
  const pos = new Float32Array(tris.length * 9);
  const uv = new Float32Array(tris.length * 6);
  let i = 0;
  let j = 0;
  for (const t of tris) {
    for (const p of t) {
      pos[i++] = p[0];
      pos[i++] = p[1];
      pos[i++] = p[2];
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // planar UVs from the dominant normal axis
  const n = g.attributes.normal;
  for (let k = 0; k < pos.length / 3; k++) {
    const nx = Math.abs(n.getX(k));
    const ny = Math.abs(n.getY(k));
    const nz = Math.abs(n.getZ(k));
    const x = pos[k * 3];
    const y = pos[k * 3 + 1];
    const z = pos[k * 3 + 2];
    let u, v;
    if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else if (nx >= nz) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[j++] = u * uvScale;
    uv[j++] = v * uvScale;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function quad(a, b, c, d) {
  return [
    [a, b, c],
    [a, c, d],
  ];
}

/**
 * Base skin surfaces. side = +1 dorsal, -1 ventral. Returns { plateau, bevel, lip } geometries.
 * The ventral plateau gets a rectangular hole for the hangar module.
 */
function buildSkin(side, rows = 52) {
  const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
  const T = HULL.trenchHalf;
  const tris = [];
  const bevel = [];
  const lips = [];
  const zs = [];
  for (let i = 0; i <= rows; i++) zs.push(HULL.bowZ + ((HULL.sternZ - HULL.bowZ) * i) / rows);
  const H = (z) => (side > 0 ? dorsalH(z) : ventralH(z));
  for (let i = 0; i < rows; i++) {
    const z0 = zs[i];
    const z1 = zs[i + 1];
    const w0 = halfWidth(z0);
    const w1 = halfWidth(z1);
    const y0 = side * H(z0);
    const y1 = side * H(z1);
    // plateau strip (skipping the hangar module footprint on the ventral side — handled as a hole below)
    const hole = side < 0 && z1 > HANGAR.module.z0 && z0 < HANGAR.module.z1;
    if (!hole) {
      const t = quad([-sp * w0, y0, z0], [sp * w0, y0, z0], [sp * w1, y1, z1], [-sp * w1, y1, z1]);
      tris.push(...(side > 0 ? t.map((tr) => [tr[0], tr[2], tr[1]]) : t));
    } else {
      // two side strips beside the module footprint
      const hx = HANGAR.module.x;
      for (const s of [-1, 1]) {
        const a0 = s * hx;
        const b0 = s * sp * w0;
        const a1 = s * hx;
        const b1 = s * sp * w1;
        const t = s > 0 ? quad([a0, y0, z0], [b0, y0, z0], [b1, y1, z1], [a1, y1, z1]) : quad([b0, y0, z0], [a0, y0, z0], [a1, y1, z1], [b1, y1, z1]);
        tris.push(...(side > 0 ? t.map((tr) => [tr[0], tr[2], tr[1]]) : t));
      }
    }
    // bevels both sides: plateau edge -> trench lip (at y = ±T, x = w - inset)
    for (const s of [-1, 1]) {
      const ins = HULL.trenchInset;
      const t = quad([s * sp * w0, y0, z0], [s * (w0 - ins), side * T, z0], [s * (w1 - ins), side * T, z1], [s * sp * w1, y1, z1]);
      // winding so normals point outward (up for dorsal, down for ventral); flip for -x / ventral
      const flip = (s > 0) === (side > 0);
      bevel.push(...(flip ? t.map((tr) => [tr[0], tr[2], tr[1]]) : t));
      // lip: horizontal ledge from the bevel edge outward to the trench wall face line (small overhang)
      const l = quad([s * (w0 - ins), side * T, z0], [s * (w0 + 1.5), side * T, z0], [s * (w1 + 1.5), side * T, z1], [s * (w1 - ins), side * T, z1]);
      lips.push(...(flip ? l.map((tr) => [tr[0], tr[2], tr[1]]) : l));
    }
  }
  return { plateau: trisToGeometry(tris, 0.02), bevel: trisToGeometry(bevel, 0.02), lip: trisToGeometry(lips, 0.05) };
}

/** Trench wall: vertical band at x = ±(w - inset) between y = -T and +T, plus the stern face. */
function buildTrenchAndStern(rows = 52) {
  const T = HULL.trenchHalf;
  const ins = HULL.trenchInset;
  const tris = [];
  for (let i = 0; i < rows; i++) {
    const z0 = HULL.bowZ + ((HULL.sternZ - HULL.bowZ) * i) / rows;
    const z1 = HULL.bowZ + ((HULL.sternZ - HULL.bowZ) * (i + 1)) / rows;
    const w0 = halfWidth(z0) - ins;
    const w1 = halfWidth(z1) - ins;
    for (const s of [-1, 1]) {
      const t = quad([s * w0, -T, z0], [s * w0, T, z0], [s * w1, T, z1], [s * w1, -T, z1]);
      tris.push(...(s > 0 ? t : t.map((tr) => [tr[0], tr[2], tr[1]])));
    }
  }
  // stern face: polygon through the cross-section at z = sternZ
  const z = HULL.sternZ;
  const w = halfWidth(z);
  const pts = [
    [-HULL.plateauDorsal * w, dorsalH(z)],
    [HULL.plateauDorsal * w, dorsalH(z)],
    [w - ins, T],
    [w - ins, -T],
    [HULL.plateauVentral * w, -ventralH(z)],
    [-HULL.plateauVentral * w, -ventralH(z)],
    [-(w - ins), -T],
    [-(w - ins), T],
  ];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const stern = new THREE.ShapeGeometry(shape);
  stern.translate(0, 0, z);
  const nonIdx = stern.toNonIndexed();
  const p = nonIdx.attributes.position;
  nonIdx.computeVertexNormals();
  // world UVs for the stern
  const uv = nonIdx.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 0.02, p.getY(i) * 0.02);
  return { trench: trisToGeometry(tris, 0.05), stern: nonIdx };
}

/**
 * Instanced armour plates over a skin side. Plates follow the local surface frame; sizes and heights
 * are jittered; colours vary per plate. Returns per-chunk arrays of { matrix, color }.
 */
function platePlacements(side, rand, { plateSize = 11, thickness = 2.2, greebleDensity = 0.35 } = {}) {
  const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
  const T = HULL.trenchHalf;
  const chunks = Array.from({ length: CHUNKS }, () => ({ plates: [], greebles: [] }));
  const zStep = plateSize;
  // subtle manufacturing variation: ±3 % per plate, the odd darker replacement plate
  const tone = (base) => {
    const k = 1 + (rand() - 0.5) * 0.06 - (rand() < 0.05 ? 0.07 : 0);
    return [base * k, base * k, base * k * 1.02];
  };
  for (let z = HULL.bowZ + zStep / 2; z < HULL.sternZ - 2; z += zStep) {
    const w = halfWidth(z);
    const H = side > 0 ? dorsalH(z) : ventralH(z);
    const ci = chunkIndex(z);
    // plateau plates: metric spacing across
    const pw = sp * w;
    const nAcross = Math.max(1, Math.round((2 * pw) / plateSize));
    for (let i = 0; i < nAcross; i++) {
      const x = -pw + ((i + 0.5) / nAcross) * 2 * pw;
      const sx = (2 * pw) / nAcross;
      // skip the hangar module footprint on the ventral side and the city footprint on the dorsal side
      if (side < 0 && Math.abs(x) < HANGAR.module.x + 2 && z > HANGAR.module.z0 - 2 && z < HANGAR.module.z1 + 2) continue;
      if (side > 0 && z > CITY.z0 && z < CITY.z1) {
        const t0 = CITY.tiers[0];
        const hw = t0.hw0 + ((t0.hw1 - t0.hw0) * (z - t0.zs)) / (t0.ze - t0.zs);
        if (Math.abs(x) < hw + 3) continue;
      }
      // mostly flush plates with a few raised ones; narrow seams so the field reads as armour, not tiles
      const th = thickness * (rand() < 0.12 ? 1.7 : 0.85 + rand() * 0.3);
      _v.set(x, side * (H + th / 2 - 0.4), z);
      _q.identity();
      _s.set(sx - 0.35, th, zStep - 0.35);
      _m.compose(_v, _q, _s);
      chunks[ci].plates.push({ m: _m.clone(), c: tone(0.86 + (rand() < 0.08 ? -0.1 : 0)) });
      // greebles on some plates: small boxes / raised strips
      if (rand() < greebleDensity) {
        const gw = 1 + rand() * 3.5;
        const gh = 0.8 + rand() * 2.2;
        const gd = 1 + rand() * 4;
        _v.set(x + (rand() - 0.5) * (sx - gw - 1), side * (H + th - 0.4 + gh / 2), z + (rand() - 0.5) * (zStep - gd - 1));
        _s.set(gw, gh, gd);
        _m.compose(_v, _q, _s);
        chunks[ci].greebles.push({ m: _m.clone(), c: tone(0.55 + rand() * 0.25) });
      }
    }
    // bevel plates both sides, laid along the slope
    for (const s of [-1, 1]) {
      const ins = HULL.trenchInset;
      const x0 = s * sp * w;
      const x1 = s * (w - ins);
      const y0 = side * H;
      const y1 = side * T;
      const run = Math.hypot(x1 - x0, y1 - y0);
      const nAlong = Math.max(1, Math.round(run / plateSize));
      const dir = new THREE.Vector3(x1 - x0, y1 - y0, 0).normalize();
      const nrm = new THREE.Vector3(-dir.y * s * side, dir.x * s * side, 0);
      // make the normal point outward (away from the hull centre line)
      if (nrm.y * side < 0) nrm.negate();
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, nrm, new THREE.Vector3(0, 0, 1)));
      for (let i = 0; i < nAlong; i++) {
        const t = (i + 0.5) / nAlong;
        const th = thickness * (rand() < 0.12 ? 1.7 : 0.85 + rand() * 0.3);
        _v.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z).addScaledVector(nrm, th / 2 - 0.4);
        _s.set(run / nAlong - 0.35, th, zStep - 0.35);
        _m.compose(_v, q, _s);
        chunks[ci].plates.push({ m: _m.clone(), c: tone(0.82) });
        if (rand() < greebleDensity * 0.6) {
          const gw = 1 + rand() * 2.5;
          const gh = 0.8 + rand() * 1.6;
          const gd = 1 + rand() * 3;
          _v.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z + (rand() - 0.5) * (zStep - gd - 1)).addScaledVector(nrm, th - 0.4 + gh / 2);
          _s.set(gw, gh, gd);
          _m.compose(_v, q, _s);
          chunks[ci].greebles.push({ m: _m.clone(), c: tone(0.6) });
        }
      }
    }
  }
  return chunks;
}

/** Trench greebles: dense blocks, pipes and lit strips inside the equator band. */
function trenchPlacements(rand) {
  const T = HULL.trenchHalf;
  const ins = HULL.trenchInset;
  const chunks = Array.from({ length: CHUNKS }, () => ({ blocks: [], lights: [] }));
  for (let z = HULL.bowZ + 40; z < HULL.sternZ - 6; z += 6 + rand() * 6) {
    const w = halfWidth(z) - ins;
    const ci = chunkIndex(z);
    for (const s of [-1, 1]) {
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const h = 1.5 + rand() * 5;
        const d = 1.5 + rand() * 4;
        const y = -T + 1 + rand() * (2 * T - h - 2);
        _v.set(s * (w + d / 2 - 0.5), y + h / 2, z + (rand() - 0.5) * 5);
        _s.set(d, h, 1.5 + rand() * 5);
        _q.identity();
        _m.compose(_v, _q, _s);
        chunks[ci].blocks.push({ m: _m.clone(), c: [0.5 + rand() * 0.3, 0.5 + rand() * 0.3, 0.55 + rand() * 0.3] });
      }
      if (rand() < 0.6) {
        _v.set(s * (w + 0.3), -T + 1 + rand() * (2 * T - 2), z);
        _s.set(0.5, 0.35, 2 + rand() * 4);
        _m.compose(_v, _q.identity(), _s);
        chunks[ci].lights.push({ m: _m.clone() });
      }
    }
  }
  return chunks;
}

function instanced(geo, material, items, castShadow = true) {
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  for (let i = 0; i < items.length; i++) {
    mesh.setMatrixAt(i, items[i].m);
    if (items[i].c) mesh.setColorAt(i, _c.setRGB(items[i].c[0], items[i].c[1], items[i].c[2]));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** Ventral hangar module: a box hanging under the ventral plateau with the bay opening in its floor. */
function buildHangarModule(materials) {
  const g = new THREE.Group();
  g.name = "hangarModule";
  const m = HANGAR.module;
  const o = HANGAR.opening;
  const yTop = -ventralH(m.z0) + 0.5; // sits just inside the plateau
  const yBot = m.bottomY;
  // floor plate with the opening: extruded rectangle with a hole (in XZ)
  const shape = new THREE.Shape([new THREE.Vector2(-m.x, m.z0), new THREE.Vector2(m.x, m.z0), new THREE.Vector2(m.x, m.z1), new THREE.Vector2(-m.x, m.z1)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-o.x, o.z0), new THREE.Vector2(-o.x, o.z1), new THREE.Vector2(o.x, o.z1), new THREE.Vector2(o.x, o.z0)]));
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
  // extrude is along +z in shape space; rotate so the shape lies in XZ with thickness along -Y
  plate.rotateX(Math.PI / 2);
  plate.translate(0, yBot + 1.2, 0);
  const uv = plate.attributes.uv;
  const pos = plate.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * 0.02, pos.getZ(i) * 0.02);
  const floor = new THREE.Mesh(plate, materials.hull);
  setVertexColor(plate, PALETTE.hullGrey);
  floor.castShadow = true;
  floor.receiveShadow = true;
  g.add(floor);
  // side walls of the module (from the plateau down to the bottom)
  const wallH = yTop - yBot;
  const wallY = (yTop + yBot) / 2;
  const walls = [
    new THREE.BoxGeometry(2 * m.x + 2, wallH, 2).translate(0, wallY, m.z0 - 1),
    new THREE.BoxGeometry(2 * m.x + 2, wallH, 2).translate(0, wallY, m.z1 + 1),
    new THREE.BoxGeometry(2, wallH, m.z1 - m.z0 + 4).translate(-m.x - 1, wallY, (m.z0 + m.z1) / 2),
    new THREE.BoxGeometry(2, wallH, m.z1 - m.z0 + 4).translate(m.x + 1, wallY, (m.z0 + m.z1) / 2),
  ];
  for (const wgeo of walls) {
    setVertexColor(wgeo, PALETTE.hullDark);
    const mesh = new THREE.Mesh(wgeo, materials.hullDark);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  // opening rim: hazard-lit lip + bay-door rails (doors themselves belong to the hangar interior)
  const rim = new THREE.Group();
  for (const [x0, z0, x1, z1] of [
    [-o.x - 3, o.z0 - 3, o.x + 3, o.z0],
    [-o.x - 3, o.z1, o.x + 3, o.z1 + 3],
    [-o.x - 3, o.z0, -o.x, o.z1],
    [o.x, o.z0, o.x + 3, o.z1],
  ]) {
    const bg = new THREE.BoxGeometry(x1 - x0, 1.6, z1 - z0).translate((x0 + x1) / 2, yBot - 0.8, (z0 + z1) / 2);
    setVertexColor(bg, PALETTE.hullBlack);
    rim.add(new THREE.Mesh(bg, materials.hullDark));
  }
  // running lights around the rim
  const lights = [];
  for (let z = o.z0 + 3; z < o.z1; z += 6) for (const s of [-1, 1]) lights.push([s * (o.x + 1.5), yBot - 1.7, z]);
  for (let x = -o.x + 3; x < o.x; x += 6) for (const s of [-1, 1]) lights.push([x, yBot - 1.7, s > 0 ? o.z1 + 1.5 : o.z0 - 1.5]);
  const lg = new THREE.BoxGeometry(1.2, 0.3, 1.2);
  const lm = new THREE.InstancedMesh(lg, materials.exteriorRed, lights.length);
  lights.forEach((p, i) => lm.setMatrixAt(i, _m.compose(_v.set(...p), _q.identity(), _s.set(1, 1, 1))));
  lm.instanceMatrix.needsUpdate = true;
  rim.add(lm);
  g.add(rim);
  return g;
}

export function buildHull(materials) {
  const group = new THREE.Group();
  group.name = "hull";
  const rand = rng(4242);

  // --- base skins
  for (const side of [1, -1]) {
    const { plateau, bevel, lip } = buildSkin(side);
    for (const [geo, mat, col] of [
      [plateau, materials.hullDark, PALETTE.hullGrey.clone().multiplyScalar(0.75)],
      [bevel, materials.hullDark, PALETTE.hullGrey.clone().multiplyScalar(0.75)],
      [lip, materials.hullDark, PALETTE.hullBlack],
    ]) {
      setVertexColor(geo, col);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = (side > 0 ? "dorsal_" : "ventral_") + (geo === plateau ? "plateau" : geo === bevel ? "bevel" : "lip");
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  const { trench, stern } = buildTrenchAndStern();
  setVertexColor(trench, PALETTE.hullBlack);
  const trenchMesh = new THREE.Mesh(trench, materials.cityDense);
  trenchMesh.name = "trench";
  trenchMesh.receiveShadow = true;
  group.add(trenchMesh);
  setVertexColor(stern, PALETTE.hullDark);
  const sternMesh = new THREE.Mesh(stern, materials.hullDark);
  sternMesh.name = "stern";
  sternMesh.castShadow = true;
  sternMesh.receiveShadow = true;
  group.add(sternMesh);

  // --- plating + greebles per chunk
  const plateGeo = new THREE.BoxGeometry(1, 1, 1);
  setVertexColor(plateGeo, 0xffffff);
  const greebleGeo = new THREE.BoxGeometry(1, 1, 1);
  setVertexColor(greebleGeo, 0xffffff);
  const chunkGroups = [];
  const dorsal = platePlacements(1, rand, { plateSize: 11, thickness: 2.2, greebleDensity: 0.4 });
  const ventral = platePlacements(-1, rand, { plateSize: 13, thickness: 2.0, greebleDensity: 0.25 });
  const trenchP = trenchPlacements(rand);
  let plateCount = 0;
  let greebleCount = 0;
  for (let i = 0; i < CHUNKS; i++) {
    const cg = new THREE.Group();
    cg.name = "chunk_" + i;
    cg.userData.centerZ = chunkCenterZ(i);
    const plates = [...dorsal[i].plates, ...ventral[i].plates];
    const greebles = [...dorsal[i].greebles, ...ventral[i].greebles, ...trenchP[i].blocks];
    const pm = instanced(plateGeo, i % 2 ? materials.hull2 : materials.hull, plates);
    pm.name = "plates";
    pm.userData.lod = 1;
    cg.add(pm);
    const gm = instanced(greebleGeo, materials.hullDark, greebles, false);
    gm.name = "greebles";
    gm.userData.lod = 0;
    cg.add(gm);
    if (trenchP[i].lights.length) {
      const lm = instanced(greebleGeo, materials.exteriorLight, trenchP[i].lights, false);
      lm.name = "trenchLights";
      lm.userData.lod = 0;
      cg.add(lm);
    }
    plateCount += plates.length;
    greebleCount += greebles.length;
    group.add(cg);
    chunkGroups.push(cg);
  }

  // --- hangar module + reactor bulb
  group.add(buildHangarModule(materials));
  {
    const yTop = -ventralH(REACTOR.z);
    const geo = new THREE.SphereGeometry(REACTOR.r, 48, 32);
    setVertexColor(geo, PALETTE.hullGrey);
    const bulb = new THREE.Mesh(geo, materials.hull);
    bulb.position.set(REACTOR.x, yTop - REACTOR.r * 0.45, REACTOR.z);
    bulb.castShadow = true;
    bulb.receiveShadow = true;
    bulb.name = "reactorBulb";
    group.add(bulb);
    // equatorial band + vents on the bulb
    const band = new THREE.CylinderGeometry(REACTOR.r * 0.98, REACTOR.r * 0.98, 6, 48, 1, true);
    setVertexColor(band, PALETTE.hullBlack);
    const bandMesh = new THREE.Mesh(band, materials.cityDense);
    bandMesh.position.copy(bulb.position);
    bandMesh.position.y -= REACTOR.r * 0.1;
    group.add(bandMesh);
  }

  return { group, chunkGroups, stats: { plates: plateCount, greebles: greebleCount } };
}
