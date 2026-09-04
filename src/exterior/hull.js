// Star Destroyer exterior: wedge hull, side trenches, stern wall with ion engines, terraced
// superstructure, command tower (neck, bridge slab with the real interior window openings, shield domes,
// spire), ventral keel block with the hangar well, and instanced detail layers (armour plates, trench
// machinery, terrace greebles, turrets, sensor domes, antennas, lit window rows).
//
// Lighting: exterior materials carry their own sun term (see sunPatch) so the interior never receives
// stray sunlight and no shadow map is needed; n8ao supplies the contact shadows between plates.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { HULL, SUPERSTRUCTURE, TOWER, ENGINES, HANGAR, ROOMS, roomFloorY } from "../config/shipSpec.js";
import { makeHullPlating, makeTrenchDetail, makeWindowStrips } from "./hullTextures.js";
import { panelWithHoles, rng } from "../kit.js";
import { fbm } from "../textures.js";

// ---------------------------------------------------------------------------
// sun term injected into standard materials
// ---------------------------------------------------------------------------
export function sunPatch(mat, sun) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = sun.dir;
    shader.uniforms.uSunColor = sun.color;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uSunDir;\nuniform vec3 uSunColor;")
      .replace(
        "#include <lights_fragment_begin>",
        `#include <lights_fragment_begin>
  {
    IncidentLight sunLight;
    sunLight.color = uSunColor;
    sunLight.direction = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );
    sunLight.visible = true;
    RE_Direct( sunLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  }`,
      );
  };
  mat.customProgramCacheKey = () => "sunpatch";
  mat.fog = false;
  return mat;
}

// ---------------------------------------------------------------------------
// geometry helpers
// ---------------------------------------------------------------------------
const _tmp = new THREE.Vector3();

// merge indexed and non-indexed geometries alike (everything becomes a triangle soup)
function merge(geos) {
  return mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)), false);
}

// Planar world UVs by dominant normal (like kit.worldUVs) at a hull-scale texel density.
function worldUV(geo, texel) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u;
    let v;
    if (ny >= nx && ny >= nz) (u = x), (v = z);
    else if (nx >= nz) (u = z), (v = y);
    else (u = x), (v = y);
    uv[i * 2] = u * texel;
    uv[i * 2 + 1] = v * texel;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// Vertex colours: macro paint variation, soot toward the stern, dust on upward faces.
function macroColor(geo, { base = 1.0, trench = false } = {}) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm((x + 900) / 2400, (z + 900) / 2400, { octaves: 3, freq: 6, gain: 0.55, seed: 17 });
    const n2 = fbm((z + 900) / 1800, (y + 300) / 900, { octaves: 2, freq: 9, gain: 0.5, seed: 29 });
    let k = base * (0.94 + (n - 0.5) * 0.16 + (n2 - 0.5) * 0.06);
    // soot: darker toward the stern, heaviest around the engine wall
    const soot = THREE.MathUtils.smoothstep(z, 350, 800) * 0.22;
    k *= 1 - soot;
    // dust / lighter on up-facing surfaces, slightly darker on down-facing
    const ny = nor.getY(i);
    k *= 1 + ny * 0.05;
    if (trench) k *= 0.55;
    col[i * 3] = k;
    col[i * 3 + 1] = k * 1.0;
    col[i * 3 + 2] = k * (1.02 - soot * 0.3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

function finish(geo, texel, colorOpts) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  worldUV(g, texel);
  macroColor(g, colorOpts);
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
  return g;
}

// Triangle soup builder for the wedge surfaces.
class Soup {
  constructor() {
    this.p = [];
  }
  tri(a, b, c) {
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }
  quad(a, b, c, d) {
    // a b c d in winding order
    this.tri(a, b, c);
    this.tri(a, c, d);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    return g;
  }
}

const TRENCH_HALF = HULL.trenchHeight / 2;
const TRENCH_DEPTH = 10;

function dorsal(x, z) {
  return HULL.dorsalY(x, z) + TRENCH_HALF;
}
function ventral(x, z) {
  return HULL.ventralY(x, z) - TRENCH_HALF;
}

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
      // dorsal (normal up): winding so the face points +Y
      top.quad([A[0], dorsal(A[0], za), za], [D[0], dorsal(D[0], zb), zb], [C[0], dorsal(C[0], zb), zb], [B[0], dorsal(B[0], za), za]);
      // ventral (normal down)
      bottom.quad([A[0], ventral(A[0], za), za], [B[0], ventral(B[0], za), za], [C[0], ventral(C[0], zb), zb], [D[0], ventral(D[0], zb), zb]);
    }
  }
  // stern wall (faces +Z)
  const stern = new Soup();
  const hwS = HULL.halfWidthAt(HULL.sternZ);
  for (let xi = 0; xi < NX; xi++) {
    const xa = -hwS + (2 * hwS * xi) / NX;
    const xb = -hwS + (2 * hwS * (xi + 1)) / NX;
    stern.quad([xa, ventral(xa, HULL.sternZ), HULL.sternZ], [xb, ventral(xb, HULL.sternZ), HULL.sternZ], [xb, dorsal(xb, HULL.sternZ), HULL.sternZ], [xa, dorsal(xa, HULL.sternZ), HULL.sternZ]);
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
      // top lip (faces down), inner wall (faces outward), bottom lip (faces up)
      const q = (a, b, c, d) => (s > 0 ? lips.quad(a, b, c, d) : lips.quad(a, d, c, b));
      const qi = (a, b, c, d) => (s > 0 ? trench.quad(a, b, c, d) : trench.quad(a, d, c, b));
      q([ea, TRENCH_HALF, za], [ia, TRENCH_HALF, za], [ib, TRENCH_HALF, zb], [eb, TRENCH_HALF, zb]);
      qi([ia, TRENCH_HALF, za], [ia, -TRENCH_HALF, za], [ib, -TRENCH_HALF, zb], [ib, TRENCH_HALF, zb]);
      q([ia, -TRENCH_HALF, za], [ea, -TRENCH_HALF, za], [eb, -TRENCH_HALF, zb], [ib, -TRENCH_HALF, zb]);
    }
  }
  return { top: top.geometry(), bottom: bottom.geometry(), stern: stern.geometry(), trench: trench.geometry(), lips: lips.geometry() };
}

// Box helper producing a positioned BoxGeometry
function box(cx, cy, cz, sx, sy, sz) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(cx, cy, cz);
  return g;
}
function boxMM(min, max) {
  return box((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2, max[0] - min[0], max[1] - min[1], max[2] - min[2]);
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

  const sun = { dir: { value: new THREE.Vector3(-0.46, 0.38, 0.8).normalize() }, color: { value: new THREE.Color(1.0, 0.95, 0.88).multiplyScalar(2.4) } };

  const plating = makeHullPlating(1024, 301);
  const trenchTex = makeTrenchDetail(512, 351);
  const windowsTex = makeWindowStrips(512, 128, 401);
  windowsTex.wrapS = windowsTex.wrapT = THREE.RepeatWrapping;

  const hullMat = sunPatch(
    new THREE.MeshStandardMaterial({
      map: plating.map,
      roughnessMap: plating.roughnessMap,
      metalnessMap: plating.metalnessMap,
      normalMap: plating.normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      vertexColors: true,
      roughness: 1,
      metalness: 1,
      envMapIntensity: 0.3,
    }),
    sun,
  );
  const darkMat = sunPatch(
    new THREE.MeshStandardMaterial({
      map: trenchTex.map,
      roughnessMap: trenchTex.roughnessMap,
      metalnessMap: trenchTex.metalnessMap,
      normalMap: trenchTex.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      vertexColors: true,
      roughness: 1,
      metalness: 1,
      envMapIntensity: 0.25,
    }),
    sun,
  );
  const greebleMat = sunPatch(new THREE.MeshStandardMaterial({ color: 0xa8acb3, roughness: 0.72, metalness: 0.25, envMapIntensity: 0.3 }), sun);
  const greebleDark = sunPatch(new THREE.MeshStandardMaterial({ color: 0x3a3d43, roughness: 0.8, metalness: 0.35, envMapIntensity: 0.2 }), sun);
  const plateMat = sunPatch(
    new THREE.MeshStandardMaterial({
      map: plating.map,
      roughnessMap: plating.roughnessMap,
      metalnessMap: plating.metalnessMap,
      normalMap: plating.normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      color: 0xf2f2f2,
      roughness: 1,
      metalness: 1,
      envMapIntensity: 0.3,
    }),
    sun,
  );
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: windowsTex, emissiveIntensity: 1.6, roughness: 0.6, metalness: 0, fog: false, transparent: true, opacity: 0.999, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const engineGlow = new THREE.MeshBasicMaterial({ color: 0x8fc8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const engineCore = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, fog: false });
  const tractorMat = new THREE.MeshBasicMaterial({ color: 0x4d9dff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const materials = { hullMat, darkMat, greebleMat, greebleDark, plateMat, windowMat, engineGlow };

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
  const hullGeos = [finish(wedge.top, 1 / 24), finish(wedge.bottom, 1 / 24)];
  addMesh(merge(hullGeos), hullMat, "hull");
  addMesh(finish(wedge.stern, 1 / 24, { base: 0.7 }), darkMat, "sternWall");
  addMesh(finish(wedge.trench, 1 / 12, { trench: true }), darkMat, "trenchWall");
  addMesh(finish(wedge.lips, 1 / 24), hullMat, "trenchLips");

  // ---------------- superstructure terraces
  const terraceGeos = [];
  for (const [hx, tz0, tz1, yTop] of SUPERSTRUCTURE.terraces) {
    terraceGeos.push(boxMM([-hx, 0, tz0], [hx, yTop, tz1]));
    // bevelled step face: a slanted plate across the front edge
    const bevel = new THREE.BoxGeometry(hx * 2, 6, 14);
    bevel.rotateX(-0.6);
    bevel.translate(0, yTop - 2, tz0 + 4);
    terraceGeos.push(bevel);
  }
  addMesh(finish(merge(terraceGeos), 1 / 24), hullMat, "terraces");

  // ---------------- command tower
  const { neck, slab, domes, spire } = TOWER;
  const towerGeos = [boxMM([-neck.halfX, neck.y0 - 2, neck.z0], [neck.halfX, neck.y1, neck.z1])];
  // slab: five solid faces + forward face with real window openings
  towerGeos.push(boxMM([-slab.halfX, slab.y0, slab.z0 + 1.2], [slab.halfX, slab.y1, slab.z1]));
  const openings = forwardWindowOpenings();
  const faceW = slab.halfX * 2;
  const faceH = slab.y1 - slab.y0;
  const cy = (slab.y0 + slab.y1) / 2;
  const holes = openings.map((o) => ({ x: (o.x0 + o.x1) / 2, y: (o.y0 + o.y1) / 2 - cy, w: o.x1 - o.x0, h: o.y1 - o.y0 }));
  const face = panelWithHoles(faceW, faceH, 1.2, holes);
  face.translate(0, cy, slab.z0 + 0.6);
  towerGeos.push(face);
  addMesh(finish(merge(towerGeos), 1 / 24), hullMat, "tower");
  // window bay linings (dark) so the interior glass sits in a recess
  const bays = [];
  for (const o of openings) {
    const d = 2.2;
    bays.push(boxMM([o.x0 - 0.5, o.y0 - 0.5, slab.z0], [o.x0, o.y1 + 0.5, slab.z0 + d]));
    bays.push(boxMM([o.x1, o.y0 - 0.5, slab.z0], [o.x1 + 0.5, o.y1 + 0.5, slab.z0 + d]));
    bays.push(boxMM([o.x0 - 0.5, o.y0 - 0.5, slab.z0], [o.x1 + 0.5, o.y0, slab.z0 + d]));
    bays.push(boxMM([o.x0 - 0.5, o.y1, slab.z0], [o.x1 + 0.5, o.y1 + 0.5, slab.z0 + d]));
  }
  addMesh(finish(merge(bays), 1 / 4, { base: 0.6 }), darkMat, "windowBays");
  // shield domes on pedestals + comms spire with dishes
  const domeGeos = [];
  for (const [dx, dy, dz] of domes.positions) {
    domeGeos.push(new THREE.CylinderGeometry(15, 17, 12, 24).translate(dx, slab.y1 + 6, dz));
    domeGeos.push(new THREE.SphereGeometry(domes.radius, 40, 24).translate(dx, dy, dz));
  }
  domeGeos.push(new THREE.CylinderGeometry(2.2, 3.5, spire.y1 - spire.y0, 12).translate(spire.x, (spire.y0 + spire.y1) / 2, spire.z));
  for (let i = 0; i < 4; i++) {
    const y = spire.y0 + 14 + i * 12;
    domeGeos.push(new THREE.BoxGeometry(14 - i * 2, 0.8, 0.8).translate(spire.x, y, spire.z));
    domeGeos.push(new THREE.BoxGeometry(0.8, 0.8, 10 - i * 1.5).translate(spire.x, y + 2, spire.z));
  }
  domeGeos.push(new THREE.CylinderGeometry(6, 0.5, 3, 16).rotateX(-1.1).translate(spire.x + 6, spire.y0 + 30, spire.z + 2));
  addMesh(finish(merge(domeGeos), 1 / 12), hullMat, "domesSpire");

  // ---------------- engines
  const engGeos = [];
  const glowGeos = [];
  const coreGeos = [];
  const engine = (x, y, r) => {
    const len = r * 0.7;
    const nozzle = new THREE.CylinderGeometry(r, r * 0.86, len, 40, 1, true);
    nozzle.rotateX(Math.PI / 2);
    nozzle.translate(x, y, ENGINES.sternZ + len / 2 - 4);
    engGeos.push(nozzle);
    const inner = new THREE.CylinderGeometry(r * 0.98, r * 0.55, len - 2, 40, 1, true);
    inner.rotateX(Math.PI / 2);
    inner.translate(x, y, ENGINES.sternZ + len / 2 - 4);
    engGeos.push(inner);
    const lip = new THREE.TorusGeometry(r, r * 0.06, 10, 48);
    lip.translate(x, y, ENGINES.sternZ + len - 4);
    engGeos.push(lip);
    const glow = new THREE.CircleGeometry(r * 0.62, 40);
    glow.translate(x, y, ENGINES.sternZ + 2);
    glowGeos.push(glow);
    const core = new THREE.CircleGeometry(r * 0.3, 32);
    core.translate(x, y, ENGINES.sternZ + 2.5);
    coreGeos.push(core);
  };
  for (const [x, y] of ENGINES.main.positions) engine(x, y, ENGINES.main.radius);
  for (const [x, y] of ENGINES.aux.positions) engine(x, y, ENGINES.aux.radius);
  const engMesh = addMesh(finish(merge(engGeos), 1 / 8, { base: 0.75 }), darkMat, "engines");
  engMesh.material.side = THREE.DoubleSide;
  addMesh(merge(glowGeos), engineGlow, "engineGlow");
  addMesh(merge(coreGeos), engineCore, "engineCore");

  // ---------------- ventral keel block with the hangar well
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
  // secondary bay door outline (reserved, closed): a slightly recessed plate ahead of the well
  const sb = HANGAR.secondaryBayDoor;
  keelGeos.push(boxMM([sb.x0, k.y - 0.6, sb.z0], [sb.x1, k.y + 1, sb.z1]));
  addMesh(finish(merge(keelGeos), 1 / 24), hullMat, "keelBlock");
  // well throat lining through the plate thickness plus a 0.25 m curb above the hangar deck
  const throatTop = HANGAR.deckY + 0.25;
  const throat = [
    boxMM([HANGAR.well.x0 - 0.6, k.y, HANGAR.well.z0 - 0.6], [HANGAR.well.x0, throatTop, HANGAR.well.z1 + 0.6]),
    boxMM([HANGAR.well.x1, k.y, HANGAR.well.z0 - 0.6], [HANGAR.well.x1 + 0.6, throatTop, HANGAR.well.z1 + 0.6]),
    boxMM([HANGAR.well.x0 - 0.6, k.y, HANGAR.well.z0 - 0.6], [HANGAR.well.x1 + 0.6, throatTop, HANGAR.well.z0]),
    boxMM([HANGAR.well.x0 - 0.6, k.y, HANGAR.well.z1], [HANGAR.well.x1 + 0.6, throatTop, HANGAR.well.z1 + 0.6]),
  ];
  addMesh(finish(merge(throat), 1 / 6, { base: 0.5 }), darkMat, "wellThroat");
  const field = new THREE.PlaneGeometry(wellW, wellD);
  field.rotateX(Math.PI / 2);
  field.translate((HANGAR.well.x0 + HANGAR.well.x1) / 2, k.y + 0.5, (HANGAR.well.z0 + HANGAR.well.z1) / 2);
  const tractor = addMesh(field, tractorMat, "tractorField");

  // ---------------- instanced detail layers
  const detail = { near: new THREE.Group(), mid: new THREE.Group() };
  detail.near.name = "detail_near";
  detail.mid.name = "detail_mid";
  group.add(detail.near, detail.mid);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();

  function instanced(geo, mat, count, parent, fill, name) {
    const im = new THREE.InstancedMesh(geo, mat, count);
    im.name = name;
    let n = 0;
    for (let i = 0; i < count; i++) {
      const ok = fill(i, m4, col);
      if (ok === false) continue;
      im.setMatrixAt(n, m4);
      im.setColorAt(n, col);
      n++;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    parent.add(im);
    return im;
  }

  // surface normal of the dorsal / ventral plane at (x,z)
  function surfaceNormal(x, z, top) {
    const f = top ? dorsal : ventral;
    const e = 2;
    const dydx = (f(x + e, z) - f(x - e, z)) / (2 * e);
    const dydz = (f(x, z + e) - f(x, z - e)) / (2 * e);
    _tmp.set(-dydx, 1, -dydz).normalize();
    if (!top) _tmp.negate();
    return _tmp;
  }

  // random point on the wedge outline interior, avoiding the superstructure footprint on top
  function randomHullPoint(top) {
    for (let tries = 0; tries < 20; tries++) {
      const z = HULL.bowZ + 60 + rand() * (HULL.length - 80);
      const hw = HULL.halfWidthAt(z) - 22;
      if (hw < 10) continue;
      const x = (rand() * 2 - 1) * hw;
      if (top && z > 140 && Math.abs(x) < 170) continue;
      if (!top && z > HULL.keelPlate.z0 - 10 && z < HULL.keelPlate.z1 + 10 && Math.abs(x) < HULL.keelPlate.x + 10) continue;
      return [x, z];
    }
    return null;
  }

  // raised armour plates (mid distance and closer)
  const plateGeo = new THREE.BoxGeometry(1, 1, 1);
  for (const top of [true, false]) {
    instanced(plateGeo, plateMat, 520, detail.mid, (i, m, c) => {
      const pt = randomHullPoint(top);
      if (!pt) return false;
      const [x, z] = pt;
      const w = 14 + rand() * 40;
      const d = 14 + rand() * 60;
      const th = 1.0 + rand() * 1.2;
      const n = surfaceNormal(x, z, top).clone();
      const y = (top ? dorsal(x, z) : ventral(x, z)) + n.y * th * 0.5;
      q.setFromUnitVectors(up, n);
      m.compose(p3.set(x, y, z), q, s3.set(w, th, d));
      const tone = 0.9 + rand() * 0.14;
      c.setRGB(tone, tone, tone * 1.01);
      return true;
    }, top ? "platesTop" : "platesBottom");
  }

  // trench machinery: boxes packed into the recess on both flanks
  const gGeo = new THREE.BoxGeometry(1, 1, 1);
  instanced(gGeo, greebleDark, 1400, detail.mid, (i, m, c) => {
    const z = HULL.bowZ + 80 + rand() * (HULL.length - 100);
    const s = rand() < 0.5 ? -1 : 1;
    const e = s * HULL.halfWidthAt(z);
    const depth = 2 + rand() * (TRENCH_DEPTH - 3);
    const x = e - s * depth;
    const y = (rand() * 2 - 1) * (TRENCH_HALF - 2);
    const sx = 2 + rand() * 6;
    const sy = 1.5 + rand() * 4;
    const sz = 3 + rand() * 14;
    q.identity();
    m.compose(p3.set(x, y, z), q, s3.set(sx, sy, sz));
    const t = 0.35 + rand() * 0.5;
    c.setRGB(t, t, t * 1.05);
    return true;
  }, "trenchGreebles");

  // terrace greebles: blocks on the terrace tops and along their side faces
  instanced(gGeo, greebleMat, 900, detail.near, (i, m, c) => {
    const [hx, tz0, tz1, yTop] = SUPERSTRUCTURE.terraces[i % SUPERSTRUCTURE.terraces.length];
    const onTop = rand() < 0.55;
    let x;
    let y;
    let z;
    let sx;
    let sy;
    let sz;
    if (onTop) {
      x = (rand() * 2 - 1) * (hx - 6);
      z = tz0 + 8 + rand() * (tz1 - tz0 - 16);
      // keep the neck footprint and the next terrace clear
      const next = SUPERSTRUCTURE.terraces[(i % SUPERSTRUCTURE.terraces.length) + 1];
      if (next && Math.abs(x) < next[0] + 4 && z > next[1] - 4) return false;
      if (Math.abs(x) < TOWER.neck.halfX + 6 && z > TOWER.neck.z0 - 6) return false;
      sx = 3 + rand() * 12;
      sy = 2 + rand() * 9;
      sz = 3 + rand() * 12;
      y = yTop + sy / 2;
    } else {
      const side = rand() < 0.5 ? -1 : 1;
      x = side * (hx + 1.5);
      z = tz0 + 6 + rand() * (tz1 - tz0 - 12);
      y = 12 + rand() * (yTop - 20);
      sx = 2 + rand() * 4;
      sy = 2 + rand() * 6;
      sz = 4 + rand() * 12;
    }
    q.identity();
    m.compose(p3.set(x, y, z), q, s3.set(sx, sy, sz));
    const t = 0.55 + rand() * 0.45;
    c.setRGB(t, t, t);
    return true;
  }, "terraceGreebles");

  // heavy turbolaser turrets: base drum, housing, twin barrels (one merged geometry, instanced)
  const turretGeo = merge([
    new THREE.CylinderGeometry(9, 10, 5, 20).translate(0, 2.5, 0),
    new THREE.BoxGeometry(15, 7, 13).translate(0, 8.5, 0),
    new THREE.BoxGeometry(11, 4, 9).translate(0, 13.5, -1),
    new THREE.CylinderGeometry(1.1, 1.3, 26, 10).rotateX(Math.PI / 2 + 0.12).translate(-3.5, 9.5, -17),
    new THREE.CylinderGeometry(1.1, 1.3, 26, 10).rotateX(Math.PI / 2 + 0.12).translate(3.5, 9.5, -17),
    new THREE.BoxGeometry(9, 3, 5).translate(0, 9.5, -7),
  ]);
  turretGeo.computeVertexNormals();
  const heavySpots = [];
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) heavySpots.push([side * (168 + (i % 2) * 14), 200 + i * 80]);
  instanced(turretGeo, greebleMat, heavySpots.length, detail.mid, (i, m, c) => {
    const [x, z] = heavySpots[i];
    const y = dorsal(x, z);
    q.setFromAxisAngle(up, (rand() - 0.5) * 0.9);
    m.compose(p3.set(x, y, z), q, s3.set(1, 1, 1));
    c.setRGB(0.85, 0.86, 0.9);
    return true;
  }, "heavyTurrets");
  // light emplacements along the trench top edge
  instanced(turretGeo, greebleMat, 16, detail.near, (i, m, c) => {
    const side = i < 8 ? -1 : 1;
    const z = -520 + (i % 8) * 150;
    const x = side * (HULL.halfWidthAt(z) - 30);
    const y = dorsal(x, z);
    q.setFromAxisAngle(up, side * -0.5 + (rand() - 0.5) * 0.6);
    m.compose(p3.set(x, y, z), q, s3.set(0.4, 0.4, 0.4));
    c.setRGB(0.8, 0.82, 0.86);
    return true;
  }, "lightTurrets");

  // sensor domes and antennas on the terraces and the slab
  const domeGeo = new THREE.SphereGeometry(1, 16, 10);
  instanced(domeGeo, greebleMat, 26, detail.near, (i, m, c) => {
    const [hx, tz0, tz1, yTop] = SUPERSTRUCTURE.terraces[i % 3];
    const x = (rand() * 2 - 1) * (hx - 10);
    const z = tz0 + 10 + rand() * (tz1 - tz0 - 20);
    if (Math.abs(x) < TOWER.neck.halfX + 10 && z > TOWER.neck.z0 - 10) return false;
    const r = 2.5 + rand() * 4;
    q.identity();
    m.compose(p3.set(x, yTop, z), q, s3.set(r, r, r));
    c.setRGB(0.9, 0.9, 0.92);
    return true;
  }, "sensorDomes");
  const mastGeo = new THREE.CylinderGeometry(0.35, 0.6, 1, 8).translate(0, 0.5, 0);
  instanced(mastGeo, greebleDark, 40, detail.near, (i, m, c) => {
    const onSlab = i < 16;
    let x;
    let z;
    let y;
    if (onSlab) {
      x = (rand() * 2 - 1) * (slab.halfX - 12);
      z = slab.z0 + 8 + rand() * (slab.z1 - slab.z0 - 16);
      y = slab.y1;
      if (Math.abs(Math.abs(x) - 90) < 28 && Math.abs(z - 530) < 28) return false;
    } else {
      const [hx, tz0, tz1, yTop] = SUPERSTRUCTURE.terraces[i % 3];
      x = (rand() * 2 - 1) * (hx - 8);
      z = tz0 + 6 + rand() * (tz1 - tz0 - 12);
      y = yTop;
      if (Math.abs(x) < TOWER.neck.halfX + 8 && z > TOWER.neck.z0 - 8) return false;
    }
    const h = 8 + rand() * 22;
    q.identity();
    m.compose(p3.set(x, y, z), q, s3.set(1, h, 1));
    c.setRGB(0.5, 0.52, 0.55);
    return true;
  }, "antennas");

  // lit window rows: neck faces, slab faces (outside the interior openings), terrace fronts
  const winGeos = [];
  const winQuad = (w, h, pos, rot, repU, repV) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * repU, uv.getY(i) * repV);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)));
    winGeos.push(g);
  };
  // neck: four faces, rows over 100 m of height
  const nH = neck.y1 - neck.y0 - 20;
  const nY = (neck.y0 + neck.y1) / 2;
  winQuad(neck.halfX * 2 - 6, nH, [0, nY, neck.z0 - 0.3], [0, Math.PI, 0], 12, nH / 4);
  winQuad(neck.halfX * 2 - 6, nH, [0, nY, neck.z1 + 0.3], [0, 0, 0], 12, nH / 4);
  winQuad(neck.z1 - neck.z0 - 6, nH, [-neck.halfX - 0.3, nY, (neck.z0 + neck.z1) / 2], [0, -Math.PI / 2, 0], 10, nH / 4);
  winQuad(neck.z1 - neck.z0 - 6, nH, [neck.halfX + 0.3, nY, (neck.z0 + neck.z1) / 2], [0, Math.PI / 2, 0], 10, nH / 4);
  // slab: side faces and aft face, plus the forward face's upper strip
  const sH = slab.y1 - slab.y0 - 10;
  const sY = (slab.y0 + slab.y1) / 2;
  winQuad(slab.z1 - slab.z0 - 8, sH, [-slab.halfX - 0.3, sY, (slab.z0 + slab.z1) / 2], [0, -Math.PI / 2, 0], 16, sH / 4);
  winQuad(slab.z1 - slab.z0 - 8, sH, [slab.halfX + 0.3, sY, (slab.z0 + slab.z1) / 2], [0, Math.PI / 2, 0], 16, sH / 4);
  winQuad(slab.halfX * 2 - 8, sH, [0, sY, slab.z1 + 0.3], [0, 0, 0], 34, sH / 4);
  winQuad(60, 6, [-100, slab.y1 - 6, slab.z0 - 0.3], [0, Math.PI, 0], 8, 1);
  winQuad(60, 6, [100, slab.y1 - 6, slab.z0 - 0.3], [0, Math.PI, 0], 8, 1);
  // terrace fronts and flanks
  for (const [hx, tz0, tz1, yTop] of SUPERSTRUCTURE.terraces) {
    winQuad(hx * 2 - 10, 10, [0, yTop - 12, tz0 - 0.3], [0, Math.PI, 0], hx / 4, 2);
    winQuad(tz1 - tz0 - 10, 10, [-hx - 0.3, yTop - 14, (tz0 + tz1) / 2], [0, -Math.PI / 2, 0], (tz1 - tz0) / 8, 2);
    winQuad(tz1 - tz0 - 10, 10, [hx + 0.3, yTop - 14, (tz0 + tz1) / 2], [0, Math.PI / 2, 0], (tz1 - tz0) / 8, 2);
  }
  addMesh(merge(winGeos), windowMat, "windowRows", detail.mid);

  // ---------------- LOD by camera distance to each detail mesh
  const lodMeshes = [];
  detail.near.traverse((o) => o.isMesh && lodMeshes.push({ mesh: o, range: 1900 }));
  detail.mid.traverse((o) => o.isMesh && lodMeshes.push({ mesh: o, range: 5200 }));
  const sphere = new THREE.Sphere();
  const stats = { visibleDetail: 0 };

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
      e.mesh.visible = d < e.range;
      if (e.mesh.visible) vis++;
    }
    stats.visibleDetail = vis;
    tractor.material.opacity = 0.16 + 0.08 * Math.sin(performance.now() * 0.0016);
  }

  // Which exterior parts to draw from inside: everything for "forward"/"belly" windows, nothing otherwise
  function setInteriorView(windows) {
    const any = windows && windows.length > 0;
    group.visible = any;
  }

  return { group, detail, materials, sun, update, setInteriorView, stats, openings };
}
