// Star Destroyer exterior: wedge hull with the equatorial trenches, finely tessellated stern wall with
// heat-discoloured ion engines, terraced superstructure with sloped fronts, command tower (neck, bridge
// slab with the real interior window openings and their bezels, shield domes, comms spire), ventral keel
// block with the hangar well and the reserved secondary bay, plus the instanced detail layers from
// greebles.js / turrets.js / engines.js / exteriorLights.js (armour plates, city blocks, trench machinery,
// turrets, hatches, docking pads, window rows, running lights).
//
// Lighting: exterior materials carry their own sun + fill terms (see hullShader.js) so the interior never
// receives stray sunlight and no shadow map is needed; n8ao supplies the contact shadows between plates.
import * as THREE from "three";
import { HULL, TOWER, HANGAR, ENGINES, ROOMS, roomFloorY } from "../config/shipSpec.js";
import { makeHullPlating, makeHullDetail, makeMachinery, makeWindowStrips, makeDetailAtlas } from "./hullTextures.js";
import { makeSun, exteriorPatch, sunPatch } from "./hullShader.js";
import { panelWithHoles, rng } from "../kit.js";
import { TRENCH_HALF, TRENCH_DEPTH, dorsal, ventral, merge, box, boxMM, worldUV, macroColor, finish, Soup, atlasQuad } from "./util.js";
import { terraceDescriptors, buildHullPlates, buildHullFittings, buildDockingPads, padRects, buildSuperstructure, buildTrench } from "./greebles.js";
import { buildTurrets, turretRects } from "./turrets.js";
import { buildEngines, sternHeatTint } from "./engines.js";
import { createWindowRows, buildRunningLights } from "./exteriorLights.js";

export { sunPatch };

// ---------------------------------------------------------------------------
// base wedge
// ---------------------------------------------------------------------------
function buildWedge() {
  const NZ = 40;
  const NX = 16;
  const z0 = HULL.bowZ + 6;
  const L = HULL.sternZ - z0;
  const top = new Soup();
  const bottom = new Soup();
  for (let zi = 0; zi < NZ; zi++) {
    const za = z0 + (zi / NZ) * L;
    const zb = z0 + ((zi + 1) / NZ) * L;
    const hwa = HULL.halfWidthAt(za);
    const hwb = HULL.halfWidthAt(zb);
    for (let xi = 0; xi < NX; xi++) {
      const sa = -1 + (2 * xi) / NX;
      const sb = -1 + (2 * (xi + 1)) / NX;
      const A = [sa * hwa, 0, za];
      const B = [sb * hwa, 0, za];
      const C = [sb * hwb, 0, zb];
      const D = [sa * hwb, 0, zb];
      top.quad([A[0], dorsal(A[0], za), za], [D[0], dorsal(D[0], zb), zb], [C[0], dorsal(C[0], zb), zb], [B[0], dorsal(B[0], za), za]);
      bottom.quad([A[0], ventral(A[0], za), za], [B[0], ventral(B[0], za), za], [C[0], ventral(C[0], zb), zb], [D[0], ventral(D[0], zb), zb]);
    }
  }
  // stern wall (faces +Z), finely tessellated so the heat discolouration reads as smooth gradients; cells
  // under the engine nozzles are left out (the bells' mounting flanges cover the jagged hole edges)
  const stern = new Soup();
  const hwS = HULL.halfWidthAt(HULL.sternZ);
  const SX = 150;
  const SY = 40;
  const nozzles = [...ENGINES.main.positions.map(([x, y]) => [x, y, ENGINES.main.radius]), ...ENGINES.aux.positions.map(([x, y]) => [x, y, ENGINES.aux.radius])];
  const underNozzle = (x, y, halfDiag) => nozzles.some(([ex, ey, R]) => Math.hypot(x - ex, y - ey) < R + halfDiag);
  for (let xi = 0; xi < SX; xi++) {
    const xa = -hwS + (2 * hwS * xi) / SX;
    const xb = -hwS + (2 * hwS * (xi + 1)) / SX;
    const ya0 = ventral(xa, HULL.sternZ);
    const ya1 = dorsal(xa, HULL.sternZ);
    const yb0 = ventral(xb, HULL.sternZ);
    const yb1 = dorsal(xb, HULL.sternZ);
    for (let yi = 0; yi < SY; yi++) {
      const t0 = yi / SY;
      const t1 = (yi + 1) / SY;
      const cx = (xa + xb) / 2;
      const cy = (ya0 + (ya1 - ya0) * (t0 + t1) * 0.5 + yb0 + (yb1 - yb0) * (t0 + t1) * 0.5) / 2;
      const halfDiag = Math.hypot(xb - xa, (ya1 - ya0) * (t1 - t0)) / 2;
      if (underNozzle(cx, cy, halfDiag)) continue;
      stern.quad([xa, ya0 + (ya1 - ya0) * t0, HULL.sternZ], [xb, yb0 + (yb1 - yb0) * t0, HULL.sternZ], [xb, yb0 + (yb1 - yb0) * t1, HULL.sternZ], [xa, ya0 + (ya1 - ya0) * t1, HULL.sternZ]);
    }
  }
  // trenches: lips + recessed inner wall, both flanks
  const trench = new Soup();
  const lips = new Soup();
  for (let zi = 0; zi < NZ; zi++) {
    const za = z0 + (zi / NZ) * L;
    const zb = z0 + ((zi + 1) / NZ) * L;
    for (const s of [-1, 1]) {
      const ea = s * HULL.halfWidthAt(za);
      const eb = s * HULL.halfWidthAt(zb);
      const ia = ea - s * TRENCH_DEPTH;
      const ib = eb - s * TRENCH_DEPTH;
      const q = (a, b, c, d) => (s > 0 ? lips.quad(a, b, c, d) : lips.quad(a, d, c, b));
      const qi = (a, b, c, d) => (s > 0 ? trench.quad(a, b, c, d) : trench.quad(a, d, c, b));
      q([ea, TRENCH_HALF, za], [ia, TRENCH_HALF, za], [ib, TRENCH_HALF, zb], [eb, TRENCH_HALF, zb]);
      qi([ia, TRENCH_HALF, za], [ib, TRENCH_HALF, zb], [ib, -TRENCH_HALF, zb], [ia, -TRENCH_HALF, za]);
      q([ia, -TRENCH_HALF, za], [ea, -TRENCH_HALF, za], [eb, -TRENCH_HALF, zb], [ib, -TRENCH_HALF, zb]);
    }
  }
  return { top: top.geometry(), bottom: bottom.geometry(), stern: stern.geometry(), trench: trench.geometry(), lips: lips.geometry() };
}

// Terrace block with a sloped front face: top, front slope, back wall, two side walls (base is inside the hull).
function terraceGeometry(t) {
  const s = new Soup();
  const { hx, z0, z1, yTop, inset } = t;
  const zf = z0 + inset;
  s.quad([-hx, yTop, zf], [-hx, yTop, z1], [hx, yTop, z1], [hx, yTop, zf]); // top (+y)
  s.quad([-hx, 0, z0], [-hx, yTop, zf], [hx, yTop, zf], [hx, 0, z0]); // sloped front (-z, +y)
  s.quad([hx, 0, z1], [hx, yTop, z1], [-hx, yTop, z1], [-hx, 0, z1]); // back (+z)
  s.quad([hx, 0, z0], [hx, yTop, zf], [hx, yTop, z1], [hx, 0, z1]); // starboard side (+x)
  s.quad([-hx, 0, z1], [-hx, yTop, z1], [-hx, yTop, zf], [-hx, 0, z0]); // port side (-x)
  return s.geometry();
}

// ---------------------------------------------------------------------------
// exterior window openings derived from rooms with forward windows
// ---------------------------------------------------------------------------
export function forwardWindowOpenings() {
  const out = [];
  for (const r of ROOMS) {
    if (!r.windows || !r.windows.includes("forward")) continue;
    const y0 = roomFloorY(r);
    if (r.id === "bridge") out.push({ x0: r.x0 - 0.6, x1: r.x1 + 0.6, y0: y0 + 0.9, y1: y0 + 5.2, room: r.id });
    else if (r.id === "flightControl") out.push({ x0: r.x0 - 0.5, x1: r.x1 + 0.5, y0: y0 + 0.9, y1: y0 + 2.8, room: r.id });
    else out.push({ x0: r.x0 - 0.5, x1: r.x1 + 0.5, y0: y0 + 0.6, y1: y0 + r.height - 0.4, room: r.id });
  }
  return out;
}

// ---------------------------------------------------------------------------
// main builder
// ---------------------------------------------------------------------------
export function buildExterior(scene) {
  const group = new THREE.Group();
  group.name = "exterior";
  scene.add(group);

  const sun = makeSun();

  // ---------------- textures (5 sets, all <= 1024^2)
  const plating = makeHullPlating(1024, 301);
  const detailTex = makeHullDetail(512, 311);
  const machinery = makeMachinery(512, 351);
  const windowsTex = makeWindowStrips(512, 64, 401);
  const atlas = makeDetailAtlas(1024, 421);

  // ---------------- materials
  const detailLayer = { map: detailTex.map, normalMap: detailTex.normalMap, scale: 1 / 3.5, strength: 0.8 };
  const platingParams = () => ({
    map: plating.map,
    roughnessMap: plating.roughnessMap,
    metalnessMap: plating.metalnessMap,
    normalMap: plating.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    vertexColors: true,
    roughness: 1,
    metalness: 1,
    envMapIntensity: 0.25,
  });
  const hullMat = exteriorPatch(new THREE.MeshStandardMaterial(platingParams()), sun, { worldTexel: 1 / 24, detail: detailLayer });
  const plateMat = exteriorPatch(new THREE.MeshStandardMaterial({ ...platingParams(), color: 0xf6f6f6 }), sun, { worldTexel: 1 / 24, detail: detailLayer });
  const hullUvMat = exteriorPatch(new THREE.MeshStandardMaterial(platingParams()), sun, { detail: detailLayer });
  const machineryParams = () => ({
    map: machinery.map,
    roughnessMap: machinery.roughnessMap,
    metalnessMap: machinery.metalnessMap,
    normalMap: machinery.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    vertexColors: true,
    roughness: 1,
    metalness: 1,
    envMapIntensity: 0.2,
  });
  const darkMat = exteriorPatch(new THREE.MeshStandardMaterial(machineryParams()), sun, { worldTexel: 1 / 12 });
  const engineMat = exteriorPatch(new THREE.MeshStandardMaterial({ ...machineryParams(), side: THREE.DoubleSide }), sun, { worldTexel: 1 / 12 });
  const greebleMat = exteriorPatch(new THREE.MeshStandardMaterial({ color: 0xb6bac0, roughness: 0.68, metalness: 0.22, envMapIntensity: 0.25 }), sun);
  const greebleDark = exteriorPatch(new THREE.MeshStandardMaterial({ color: 0x62666e, roughness: 0.78, metalness: 0.35, envMapIntensity: 0.2 }), sun);
  const atlasMat = exteriorPatch(
    new THREE.MeshStandardMaterial({ map: atlas.map, emissiveMap: atlas.emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.7, roughness: 0.7, metalness: 0.15, envMapIntensity: 0.2 }),
    sun,
  );
  const windowMat = new THREE.MeshStandardMaterial({ map: windowsTex, emissiveMap: windowsTex, emissive: 0xffffff, emissiveIntensity: 1.6, alphaTest: 0.5, roughness: 0.5, metalness: 0, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const engineCore = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const engineGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const tractorMat = new THREE.MeshBasicMaterial({ color: 0x4d9dff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false });
  const materials = { hullMat, darkMat, greebleMat, greebleDark, plateMat, windowMat, engineGlow, engineCore, hullUvMat, engineMat, atlasMat };
  const mats = { hull: hullMat, plate: plateMat, hullUv: hullUvMat, dark: darkMat, engine: engineMat, greeble: greebleMat, greebleDark, atlas: atlasMat, windows: windowMat, engineCore, engineGlow };

  const rand = rng(4242);
  const addMesh = (geo, mat, name, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.frustumCulled = true;
    parent.add(m);
    return m;
  };

  // ---------------- base hull (always visible)
  const wedge = buildWedge();
  addMesh(finish(wedge.top), hullMat, "hull");
  // The ventral surface runs through the keel block (y -58..-63 over the hangar, i.e. inside the closed block,
  // never visible from outside), so it is its own chunk that the belly windows leave out: from the hangar deck
  // it read as a low light-grey ceiling hiding the racks, girders and the real ceiling.
  addMesh(finish(wedge.bottom), hullMat, "hullBottom");
  addMesh(finish(wedge.stern, 1 / 12, { base: 0.72, tint: sternHeatTint }), darkMat, "sternWall");
  addMesh(finish(wedge.trench, 1 / 12, { trench: true }), darkMat, "trenchWall");
  addMesh(finish(wedge.lips), hullMat, "trenchLips");

  // ---------------- superstructure terraces (sloped fronts)
  const terraces = terraceDescriptors();
  addMesh(finish(merge(terraces.map(terraceGeometry))), hullMat, "terraces");

  // ---------------- command tower
  const { neck, slab, domes, spire } = TOWER;
  const towerGeos = [boxMM([-neck.halfX, neck.y0 - 2, neck.z0], [neck.halfX, neck.y1, neck.z1])];
  towerGeos.push(boxMM([-slab.halfX, slab.y0, slab.z0 + 1.2], [slab.halfX, slab.y1, slab.z1]));
  const openings = forwardWindowOpenings();
  const faceW = slab.halfX * 2;
  const faceH = slab.y1 - slab.y0;
  const cy = (slab.y0 + slab.y1) / 2;
  const holes = openings.map((o) => ({ x: (o.x0 + o.x1) / 2, y: (o.y0 + o.y1) / 2 - cy, w: o.x1 - o.x0, h: o.y1 - o.y0 }));
  const face = panelWithHoles(faceW, faceH, 1.2, holes);
  face.translate(0, cy, slab.z0 + 0.6);
  towerGeos.push(face);
  addMesh(finish(merge(towerGeos)), hullMat, "tower");
  // window bay linings (dark) so the interior glass sits in a recess
  const bays = [];
  for (const o of openings) {
    const d = 2.2;
    bays.push(boxMM([o.x0 - 0.5, o.y0 - 0.5, slab.z0], [o.x0, o.y1 + 0.5, slab.z0 + d]));
    bays.push(boxMM([o.x1, o.y0 - 0.5, slab.z0], [o.x1 + 0.5, o.y1 + 0.5, slab.z0 + d]));
    bays.push(boxMM([o.x0 - 0.5, o.y0 - 0.5, slab.z0], [o.x1 + 0.5, o.y0, slab.z0 + d]));
    bays.push(boxMM([o.x0 - 0.5, o.y1, slab.z0], [o.x1 + 0.5, o.y1 + 0.5, slab.z0 + d]));
  }
  // recessed dark window channels along the slab faces (the lit rows sit inside them)
  {
    const sY = (slab.y0 + slab.y1) / 2;
    const bands = [
      [sY - 11.75, sY - 8.25],
      [sY - 1, sY + 5],
      [sY + 10.25, sY + 13.75],
    ];
    for (const [ya, yb] of bands) {
      bays.push(boxMM([-slab.halfX - 0.15, ya, slab.z0 + 4], [-slab.halfX + 0.3, yb, slab.z1 - 4]));
      bays.push(boxMM([slab.halfX - 0.3, ya, slab.z0 + 4], [slab.halfX + 0.15, yb, slab.z1 - 4]));
      bays.push(boxMM([-slab.halfX + 4, ya, slab.z1 - 0.3], [slab.halfX - 4, yb, slab.z1 + 0.15]));
    }
    for (const sx of [-1, 1]) {
      for (const [ya, yb] of [
        [slab.y0 + 7.25, slab.y0 + 10.75],
        [slab.y0 + 15.5, slab.y0 + 21.5],
        [slab.y1 - 7.25, slab.y1 - 3.75],
      ]) {
        bays.push(boxMM([Math.min(sx * 53, sx * 129), ya, slab.z0 - 0.15], [Math.max(sx * 53, sx * 129), yb, slab.z0 + 0.3]));
      }
    }
  }
  addMesh(finish(merge(bays), 1 / 4, { base: 0.6 }), darkMat, "windowBays");

  // shield domes on pedestals (spherical UVs so the plating seams wrap the sphere) + comms spire
  {
    const domeGeos = [];
    const uvGeos = [];
    for (const [dx, dy, dz] of domes.positions) {
      const sphere = new THREE.SphereGeometry(domes.radius, 48, 28);
      const uv = sphere.attributes.uv;
      const circ = 2 * Math.PI * domes.radius;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * circ) / 24, (uv.getY(i) * (Math.PI * domes.radius)) / 24);
      sphere.translate(dx, dy, dz);
      domeGeos.push(sphere);
      uvGeos.push(new THREE.CylinderGeometry(15, 17.5, 12, 32).translate(dx, slab.y1 + 6, dz));
      uvGeos.push(new THREE.TorusGeometry(domes.radius + 0.2, 0.5, 8, 64).rotateX(Math.PI / 2).translate(dx, dy, dz));
      uvGeos.push(new THREE.CylinderGeometry(2.6, 3.2, 1.6, 16).translate(dx, dy + domes.radius + 0.4, dz));
      uvGeos.push(new THREE.CylinderGeometry(0.2, 0.3, 4, 6).translate(dx, dy + domes.radius + 3, dz));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        uvGeos.push(box(dx + Math.cos(a) * 17.2, slab.y1 + 1.4, dz + Math.sin(a) * 17.2, 2.4, 2.8, 2.4).rotateY(0));
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const clamp = box(0, 0, 0, 1.6, 6, 3);
        clamp.translate(0, slab.y1 + 9, 16.8);
        clamp.rotateY(a);
        clamp.translate(dx, 0, dz);
        uvGeos.push(clamp);
      }
    }
    // spire: tapered mast, cross arms with dishes, sensor array, whip antenna
    const sh = spire.y1 - spire.y0;
    uvGeos.push(new THREE.CylinderGeometry(2.0, 3.6, sh, 12).translate(spire.x, spire.y0 + sh / 2, spire.z));
    uvGeos.push(new THREE.CylinderGeometry(4.5, 5.2, 4, 12).translate(spire.x, spire.y0 + 2, spire.z));
    for (let i = 0; i < 4; i++) {
      const y = spire.y0 + 16 + i * 11;
      const w = 16 - i * 2.5;
      uvGeos.push(box(spire.x, y, spire.z, w, 0.9, 0.9));
      uvGeos.push(box(spire.x, y + 2.2, spire.z, 0.9, 0.9, w * 0.7));
      uvGeos.push(box(spire.x + w / 2, y, spire.z, 1.4, 2.2, 1.4));
      uvGeos.push(box(spire.x - w / 2, y, spire.z, 1.4, 2.2, 1.4));
    }
    const dishPts = [];
    for (let i = 0; i <= 8; i++) dishPts.push(new THREE.Vector2((i / 8) * 5.5, 0.3 * (i / 8) * (i / 8) * 5.5));
    for (const [ox, oy, rx, ry] of [
      [7, 30, -1.1, 0.4],
      [-7, 41, -1.0, -0.6],
      [0, 52, -0.7, 2.4],
    ]) {
      const dish = new THREE.LatheGeometry(dishPts, 20);
      dish.rotateX(rx);
      dish.rotateY(ry);
      dish.translate(spire.x + ox, spire.y0 + oy, spire.z + 1.5);
      uvGeos.push(dish);
      uvGeos.push(new THREE.CylinderGeometry(0.35, 0.35, 5, 6).rotateZ(Math.PI / 2).translate(spire.x + ox / 2, spire.y0 + oy, spire.z + 1.5));
    }
    uvGeos.push(box(spire.x, spire.y0 + 62, spire.z, 9, 5, 0.7));
    uvGeos.push(box(spire.x, spire.y1 + 2, spire.z, 0.5, 5, 0.5));
    const uvMerged = merge(uvGeos);
    worldUV(uvMerged, 1 / 12);
    const all = merge([merge(domeGeos), uvMerged]);
    macroColor(all, {});
    all.computeBoundingSphere();
    addMesh(all, hullUvMat, "domesSpire");
  }

  // ---------------- ventral keel block with the hangar well and the reserved secondary bay
  const k = HULL.keelPlate;
  const keelGeos = [];
  const wellW = HANGAR.well.x1 - HANGAR.well.x0;
  const wellD = HANGAR.well.z1 - HANGAR.well.z0;
  // 1.5 m plate: its top (k.y + 1.5) stays below the interior hangar deck slab, so no coplanar faces
  // rotateX(+90°) maps the shape's local +y onto world +z, so the hole offset keeps the sign of (well - plate)
  const plate = panelWithHoles(k.x * 2, k.z1 - k.z0, 1.5, [{ x: (HANGAR.well.x0 + HANGAR.well.x1) / 2, y: (HANGAR.well.z0 + HANGAR.well.z1) / 2 - (k.z0 + k.z1) / 2, w: wellW, h: wellD }]);
  plate.rotateX(Math.PI / 2); // lies flat, faces down
  plate.translate(0, k.y + 0.75, (k.z0 + k.z1) / 2);
  keelGeos.push(plate);
  keelGeos.push(boxMM([-k.x - 1, k.y, k.z0 - 1], [-k.x, -20, k.z1 + 1]));
  keelGeos.push(boxMM([k.x, k.y, k.z0 - 1], [k.x + 1, -20, k.z1 + 1]));
  keelGeos.push(boxMM([-k.x - 1, k.y, k.z0 - 1], [k.x + 1, -20, k.z0]));
  keelGeos.push(boxMM([-k.x - 1, k.y, k.z1], [k.x + 1, -20, k.z1 + 1]));
  // chamfered skirt so the block meets the hull with a bevel instead of a raw step
  for (const sx of [-1, 1]) {
    const skirt = box(sx * (k.x + 3.5), (k.y + 12) / 2 - 6, (k.z0 + k.z1) / 2, 6, 24, k.z1 - k.z0 + 2);
    skirt.rotateZ(sx * 0.35);
    keelGeos.push(skirt);
  }
  addMesh(finish(merge(keelGeos)), hullMat, "keelBlock");
  // secondary bay door outline (reserved, closed): proud dark plate with the painted door stamp
  const sb = HANGAR.secondaryBayDoor;
  addMesh(finish(boxMM([sb.x0 - 1, k.y - 0.7, sb.z0 - 1], [sb.x1 + 1, k.y + 1, sb.z1 + 1]), 1 / 6, { base: 0.6 }), darkMat, "secondaryBayFrame");
  {
    const door = atlasQuad(sb.x1 - sb.x0, sb.z1 - sb.z0, atlas.cells.bayDoor);
    door.rotateX(Math.PI / 2);
    door.translate((sb.x0 + sb.x1) / 2, k.y - 0.75, (sb.z0 + sb.z1) / 2);
    addMesh(door, atlasMat, "secondaryBayDoor");
  }
  // well throat lining through the plate thickness plus a 0.25 m curb above the hangar deck
  const throatTop = HANGAR.deckY + 0.25;
  const throat = [
    boxMM([HANGAR.well.x0 - 0.6, k.y, HANGAR.well.z0 - 0.6], [HANGAR.well.x0, throatTop, HANGAR.well.z1 + 0.6]),
    boxMM([HANGAR.well.x1, k.y, HANGAR.well.z0 - 0.6], [HANGAR.well.x1 + 0.6, throatTop, HANGAR.well.z1 + 0.6]),
    boxMM([HANGAR.well.x0 - 0.6, k.y, HANGAR.well.z0 - 0.6], [HANGAR.well.x1 + 0.6, throatTop, HANGAR.well.z0]),
    boxMM([HANGAR.well.x0 - 0.6, k.y, HANGAR.well.z1], [HANGAR.well.x1 + 0.6, throatTop, HANGAR.well.z1 + 0.6]),
  ];
  addMesh(finish(merge(throat), 1 / 6, { base: 0.5 }), darkMat, "wellThroat");
  // hazard rim and approach lights around the well mouth
  {
    const rim = merge([
      atlasQuad(wellW + 8, 3, atlas.cells.hazard).rotateX(Math.PI / 2).translate((HANGAR.well.x0 + HANGAR.well.x1) / 2, k.y - 0.05, HANGAR.well.z0 - 2.2),
      atlasQuad(wellW + 8, 3, atlas.cells.hazard).rotateX(Math.PI / 2).translate((HANGAR.well.x0 + HANGAR.well.x1) / 2, k.y - 0.05, HANGAR.well.z1 + 2.2),
      atlasQuad(wellD, 3, atlas.cells.hazard).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(HANGAR.well.x0 - 2.2, k.y - 0.05, (HANGAR.well.z0 + HANGAR.well.z1) / 2),
      atlasQuad(wellD, 3, atlas.cells.hazard).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(HANGAR.well.x1 + 2.2, k.y - 0.05, (HANGAR.well.z0 + HANGAR.well.z1) / 2),
      atlasQuad(wellD + 8, 2, atlas.cells.edgeLights).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(HANGAR.well.x0 - 5, k.y - 0.05, (HANGAR.well.z0 + HANGAR.well.z1) / 2),
      atlasQuad(wellD + 8, 2, atlas.cells.edgeLights).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(HANGAR.well.x1 + 5, k.y - 0.05, (HANGAR.well.z0 + HANGAR.well.z1) / 2),
    ]);
    addMesh(rim, atlasMat, "wellRim");
  }
  // faint field sheet across the mouth, facing down: read from below the ship, invisible from the deck
  // (the hangar's own emitter cones carry the effect inside)
  const field = new THREE.PlaneGeometry(wellW - 0.4, wellD - 0.4).toNonIndexed();
  field.rotateX(Math.PI / 2);
  field.translate((HANGAR.well.x0 + HANGAR.well.x1) / 2, k.y + 0.4, (HANGAR.well.z0 + HANGAR.well.z1) / 2);
  const tractor = addMesh(field, tractorMat, "tractorField");

  // ---------------- instanced detail layers
  const detail = { near: new THREE.Group(), mid: new THREE.Group() };
  detail.near.name = "detail_near";
  detail.mid.name = "detail_mid";
  group.add(detail.near, detail.mid);

  const windowRows = createWindowRows();
  const ctx = {
    rand,
    mats,
    detail,
    group,
    atlas,
    openings,
    exclude: { top: [...turretRects(), ...padRects()], bottom: [] },
    windowQuad: (w, h, pos, rot) => windowRows.add(w, h, pos, rot),
  };

  buildEngines(ctx);
  buildTurrets(ctx);
  buildDockingPads(ctx);
  const cells = buildHullPlates(ctx);
  buildHullFittings(ctx, cells);
  buildSuperstructure(ctx);
  buildTrench(ctx);

  // slab window rows: sides, aft, forward face outside the real openings (which stay clear)
  {
    const sY = (slab.y0 + slab.y1) / 2;
    const sLen = slab.z1 - slab.z0 - 8;
    const sZ = (slab.z0 + slab.z1) / 2;
    for (const yy of [sY - 10, sY + 2, sY + 12]) {
      windowRows.add(sLen, yy === sY + 2 ? 5 : 2.5, [-slab.halfX - 0.25, yy, sZ], [0, -Math.PI / 2, 0]);
      windowRows.add(sLen, yy === sY + 2 ? 5 : 2.5, [slab.halfX + 0.25, yy, sZ], [0, Math.PI / 2, 0]);
      windowRows.add(slab.halfX * 2 - 8, yy === sY + 2 ? 5 : 2.5, [0, yy, slab.z1 + 0.25], [0, 0, 0]);
    }
    for (const sx of [-1, 1]) {
      windowRows.add(74, 2.5, [sx * 91, slab.y0 + 9, slab.z0 - 0.25], [0, Math.PI, 0]);
      windowRows.add(74, 5, [sx * 91, slab.y0 + 18.5, slab.z0 - 0.25], [0, Math.PI, 0]);
      windowRows.add(74, 2.5, [sx * 91, slab.y1 - 5.5, slab.z0 - 0.25], [0, Math.PI, 0]);
    }
    // short lit strip over the bridge windows, just under the slab roof line
    windowRows.add(100, 2.5, [0, slab.y1 - 2.4, slab.z0 - 0.25], [0, Math.PI, 0]);
  }
  windowRows.build(windowMat, group);
  const running = buildRunningLights(ctx);

  // ---------------- LOD by camera distance to each detail mesh
  const lodMeshes = [];
  detail.near.traverse((o) => o.isMesh && lodMeshes.push({ mesh: o, range: 1900 }));
  detail.mid.traverse((o) => o.isMesh && lodMeshes.push({ mesh: o, range: 5200 }));
  const lodSet = new Set(lodMeshes.map((e) => e.mesh));
  const baseMeshes = [];
  group.traverse((o) => o.isMesh && !lodSet.has(o) && baseMeshes.push(o));
  const sphere = new THREE.Sphere();
  const stats = { visibleDetail: 0, culledInside: 0 };

  // ---------------- interior window culling
  // From inside only the chunks that can be seen through the room's windows are drawn: forward windows
  // (tower slab) look down the dorsal hull toward the bow, belly windows (hangar deck) look down through
  // the well. Chunks are matched by mesh name so anything unlisted stays visible.
  const HIDE_INSIDE = {
    forward: /^(sternWall|trenchWall|keelBlock|secondaryBay|wellThroat|wellRim|tractorField|domesSpire|engine|stern|trench(Units|Pipes|Ribs|Bays|Windows|Ducts))/,
    belly: /^(hullBottom|sternWall|trenchWall|terraces|tower|windowBays|windowRows|domesSpire|engine|stern|trench(Units|Pipes|Ribs|Bays|Windows|Ducts)|dockingPads|city|bays|machineryBlocks|gantries|sensorDomes|antennaMasts|dishes|buttresses|wallBoxes|wallPipes|smallPlates|windowBezels|heavyTurret)/,
  };
  let culled = null; // Set of meshes hidden for the current interior view; null = draw everything
  const applyCulling = () => {
    for (const m of baseMeshes) m.visible = !(culled && culled.has(m));
    if (culled) for (const e of lodMeshes) if (culled.has(e.mesh)) e.mesh.visible = false;
    stats.culledInside = culled ? culled.size : 0;
  };
  // The camera modes and main.js announce "back outside" with `exterior.group.visible = true`
  // (mode change, start of the exit flight); route that through a setter so the culling is dropped at
  // the same moment and the whole ship is there for the fly-out.
  let groupVisible = group.visible;
  Object.defineProperty(group, "visible", {
    configurable: true,
    enumerable: true,
    get: () => groupVisible,
    set: (v) => {
      groupVisible = v;
      if (v && culled) {
        culled = null;
        applyCulling();
      }
    },
  });

  function update(camPos, sunWorld) {
    if (sunWorld) sun.dir.value.copy(sunWorld);
    let vis = 0;
    for (const e of lodMeshes) {
      let bs;
      if (e.mesh.isInstancedMesh) {
        if (!e.mesh.boundingSphere) e.mesh.computeBoundingSphere();
        bs = e.mesh.boundingSphere;
      } else {
        if (!e.mesh.geometry.boundingSphere) e.mesh.geometry.computeBoundingSphere();
        bs = e.mesh.geometry.boundingSphere;
      }
      sphere.copy(bs).applyMatrix4(e.mesh.matrixWorld);
      const d = sphere.center.distanceTo(camPos) - sphere.radius;
      e.mesh.visible = d < e.range && !(culled && culled.has(e.mesh));
      if (e.mesh.visible) vis++;
    }
    stats.visibleDetail = vis;
    const now = performance.now();
    tractor.material.opacity = 0.05 + 0.02 * Math.sin(now * 0.0016);
    if (group.visible) running.update(now * 0.001);
  }

  // Which exterior parts to draw from inside: the chunks visible through "forward"/"belly" windows
  // (see HIDE_INSIDE), everything for unknown window kinds, nothing when the room has no windows.
  function setInteriorView(windows) {
    const kinds = (windows || []).map((w) => (String(w).startsWith("forward") ? "forward" : String(w)));
    group.visible = kinds.length > 0;
    culled = null;
    if (kinds.length && kinds.every((k) => HIDE_INSIDE[k])) {
      culled = new Set();
      group.traverse((o) => {
        if (o.isMesh && kinds.every((k) => HIDE_INSIDE[k].test(o.name))) culled.add(o);
      });
    }
    applyCulling();
  }

  return { group, detail, materials, sun, update, setInteriorView, stats, openings };
}
