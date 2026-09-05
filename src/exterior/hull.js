// Star Destroyer exterior: wedge hull with the equatorial trenches, finely tessellated stern wall with
// heat-discoloured ion engines, terraced superstructure with sloped fronts, command tower (neck, bridge
// slab with the real interior window openings and their bezels, shield domes, comms spire), ventral keel
// block with the hangar well and the reserved secondary bay, plus the instanced detail layers from
// greebles.js / turrets.js / engines.js / exteriorLights.js (armour plates, city blocks, trench machinery,
// turrets, hatches, docking pads, window rows, running lights).
//
// Lighting: in "exterior" mode a shadow-casting DirectionalLight fitted to the ship's bounding box lights
// the hull (tower and superstructure throw real shadows) and the materials' own sun term is zeroed; in
// "interior" mode the light is off and the materials' sun term (see hullShader.js) lights the chunks seen
// through windows, so the interior never receives it. Shaped ambient fills keep shadows from crushing;
// n8ao supplies the contact shadows between plates.
import * as THREE from "three";
import { HULL, TOWER, HANGAR, ENGINES, ROOMS, roomFloorY } from "../config/shipSpec.js";
import { makeHullPlating, makeHullDetail, makeMachinery, makeWindowStrips, makeDetailAtlas } from "./hullTextures.js";
import { makeSun, exteriorPatch, sunPatch, SUN_COLOR, SUN_INTENSITY } from "./hullShader.js";
import { panelWithHoles, rng } from "../kit.js";
import { TRENCH_HALF, TRENCH_DEPTH, dorsal, ventral, merge, box, boxMM, worldUV, macroColor, finish, Soup } from "./util.js";
import { SPINE, terraceDescriptors, buildHullPlates, buildHullFittings, buildDockingPads, padRects, buildSuperstructure, buildTrench } from "./greebles.js";
import { buildTurrets, turretRects } from "./turrets.js";
import { buildEngines, sternHeatTint } from "./engines.js";
import { buildVentral, buildVentralSurface } from "./ventral.js";
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
  return { top: top.geometry(), stern: stern.geometry(), trench: trench.geometry(), lips: lips.geometry() };
}

// Dorsal spine ridge: a low trapezoidal rib along the centreline from near the bow to the first terrace,
// crossed by bulkhead blocks at irregular pitch. Its two long slopes take the sun differently from the
// deck, so the wedge reads as a roof with a ridge from 1–5 km whatever the sun's bearing.
function buildSpine() {
  const rand = rng(9001);
  const { halfBase: hb, halfTop: ht, height: h, z0, z1 } = SPINE;
  const s = new Soup();
  const N = 16;
  const section = (z) => {
    const k = Math.max(0, Math.min(1, (z - z0) / 60, (z1 - z) / 12)); // tapers to nothing at both ends
    const yc = dorsal(0, z) + h * k;
    return { bl: [-hb, dorsal(-hb, z) - 0.2, z], br: [hb, dorsal(hb, z) - 0.2, z], tl: [-ht * k, yc, z], tr: [ht * k, yc, z] };
  };
  let prev = section(z0);
  for (let i = 1; i <= N; i++) {
    const cur = section(z0 + ((z1 - z0) * i) / N);
    s.quad(prev.bl, cur.bl, cur.tl, prev.tl); // port slope (-x, +y)
    s.quad(prev.tl, cur.tl, cur.tr, prev.tr); // top (+y)
    s.quad(prev.br, prev.tr, cur.tr, cur.br); // starboard slope (+x, +y)
    prev = cur;
  }
  const parts = [s.geometry()];
  for (let z = z0 + 90; z < z1 - 40; z += 55 + rand() * 90) {
    const d = 4 + rand() * 4;
    parts.push(box(0, dorsal(0, z) - 0.2 + (h + 1.1) / 2, z, hb * 2 + 2, h + 1.1, d));
    if (rand() < 0.5) parts.push(box(0, dorsal(0, z) + h + 1.5, z, 4, 1.6, d + 3));
  }
  return merge(parts);
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
    // the environment map is a capture of the lit interior: kept to a faint sheen so it cannot flatten the
    // sun / shadow modelling (the shaped fills in hullShader.js carry the ambient)
    envMapIntensity: 0.06,
  });
  const hullMat = exteriorPatch(new THREE.MeshStandardMaterial(platingParams()), sun, { worldTexel: 1 / 24, detail: detailLayer });
  const plateMat = exteriorPatch(new THREE.MeshStandardMaterial({ ...platingParams(), color: 0xf6f6f6 }), sun, { worldTexel: 1 / 24, detail: detailLayer });
  const hullUvMat = exteriorPatch(new THREE.MeshStandardMaterial(platingParams()), sun, { detail: detailLayer });
  // belly: the same plating at a coarser 32 m tile with its seams and relief softened, so from 600 m the
  // underside reads as large plate groups with value variation instead of a hard uniform grid
  const bellyOpts = { worldTexel: 1 / 32, detail: { ...detailLayer, strength: 0.35 }, contrast: 0.4 };
  const bellyParams = () => ({ ...platingParams(), normalScale: new THREE.Vector2(0.35, 0.35) });
  const hullBottomMat = exteriorPatch(new THREE.MeshStandardMaterial(bellyParams()), sun, bellyOpts);
  const machineryParams = () => ({
    map: machinery.map,
    roughnessMap: machinery.roughnessMap,
    metalnessMap: machinery.metalnessMap,
    normalMap: machinery.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    vertexColors: true,
    roughness: 1,
    metalness: 1,
    envMapIntensity: 0.05,
  });
  const darkMat = exteriorPatch(new THREE.MeshStandardMaterial(machineryParams()), sun, { worldTexel: 1 / 12 });
  const engineMat = exteriorPatch(new THREE.MeshStandardMaterial({ ...machineryParams(), side: THREE.DoubleSide }), sun, { worldTexel: 1 / 12 });
  // detail-layer materials read vertex colours: instance colours and the baked layers' per-vertex tints
  const greebleMat = exteriorPatch(new THREE.MeshStandardMaterial({ color: 0xb6bac0, roughness: 0.68, metalness: 0.22, envMapIntensity: 0.06, vertexColors: true }), sun);
  // dark grey (not black) fittings with panel lines: the plating map at an 8 m tile, darkened by colour
  const greebleDark = exteriorPatch(new THREE.MeshStandardMaterial({ ...platingParams(), color: 0x8a8e96, envMapIntensity: 0.05 }), sun, { worldTexel: 1 / 8 });
  const atlasParams = () => ({ map: atlas.map, emissiveMap: atlas.emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.7, metalness: 0.15, envMapIntensity: 0.05, vertexColors: true });
  const atlasMat = exteriorPatch(new THREE.MeshStandardMaterial(atlasParams()), sun);
  const windowMat = new THREE.MeshStandardMaterial({ map: windowsTex, emissiveMap: windowsTex, emissive: 0xffffff, emissiveIntensity: 1.5, alphaTest: 0.5, roughness: 0.5, metalness: 0, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  // flat decals that lie on hull surfaces: offset in depth instead of raised, so no slivers z-fight or
  // sparkle. The slope factor stays at one pixel-depth so nearby real geometry is never swallowed; the dark
  // channels take two more depth units than the paint plates, so where they cross the channel wins.
  const flat = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 };
  const flatDeep = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };
  const paintMat = exteriorPatch(new THREE.MeshStandardMaterial({ ...bellyParams(), ...flat, color: 0xf4f4f4 }), sun, bellyOpts);
  // the machinery map is trench-dark; lifted here so recessed channels read as dark grey, not black
  const darkFlatMat = exteriorPatch(new THREE.MeshStandardMaterial({ ...machineryParams(), ...flatDeep, color: new THREE.Color(1.9, 1.9, 1.9) }), sun, { worldTexel: 1 / 12 });
  const atlasFlatMat = exteriorPatch(new THREE.MeshStandardMaterial({ ...atlasParams(), ...flatDeep }), sun);
  const rimLightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.65, 2.05), fog: false });
  const engineCore = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const engineGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  // the plume shells fade where they are seen edge-on, so the nested cones read as a soft volume without a
  // polygonal outline (the mouth discs face the stern camera and keep their full value)
  engineGlow.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n  vec3 glowN = normalize( normalMatrix * normal );\n  vec3 glowP = ( modelViewMatrix * vec4( position, 1.0 ) ).xyz;\n  vFacing = abs( dot( glowN, normalize( -glowP ) ) );",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n  diffuseColor.rgb *= smoothstep( 0.0, 0.7, vFacing );");
  };
  engineGlow.customProgramCacheKey = () => "engineGlowSoft";
  const tractorMat = new THREE.MeshBasicMaterial({ color: 0x4d9dff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false });
  const materials = { hullMat, hullBottomMat, darkMat, greebleMat, greebleDark, plateMat, paintMat, darkFlatMat, atlasFlatMat, rimLightMat, windowMat, engineGlow, engineCore, hullUvMat, engineMat, atlasMat };
  const mats = { hull: hullMat, plate: plateMat, paint: paintMat, hullUv: hullUvMat, dark: darkMat, darkFlat: darkFlatMat, engine: engineMat, greeble: greebleMat, greebleDark, atlas: atlasMat, atlasFlat: atlasFlatMat, rimLight: rimLightMat, windows: windowMat, engineCore, engineGlow };

  const rand = rng(4242);
  const addMesh = (geo, mat, name, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.frustumCulled = true;
    parent.add(m);
    return m;
  };

  // ---------------- base hull (always visible): both planes, the trench lips and the dorsal spine ridge
  const wedge = buildWedge();
  addMesh(merge([finish(wedge.top), finish(wedge.lips), finish(buildSpine(), 1 / 12)]), hullMat, "hull");
  // The ventral plane (built in ventral.js with its recessed channels and the reactor recess) runs through
  // the keel block (inside the closed block, never visible from outside), so it is its own chunk that the
  // belly windows leave out: from the hangar deck it read as a low light-grey ceiling hiding the racks,
  // girders and the real ceiling. Its recess walls and floors go to the keel's dark mesh via ctx.
  const ventralSurface = buildVentralSurface();
  addMesh(finish(ventralSurface.surface, 1 / 32), hullBottomMat, "hullBottom");
  addMesh(finish(wedge.stern, 1 / 12, { base: 0.72, tint: sternHeatTint }), darkMat, "sternWall");
  addMesh(finish(wedge.trench, 1 / 12, { trench: true }), darkMat, "trenchWall");

  // ---------------- superstructure terraces (sloped fronts) + command tower, one mesh (one shadow pass)
  const terraces = terraceDescriptors();
  const towerParts = [finish(merge(terraces.map(terraceGeometry)))];

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
  towerParts.push(finish(merge(towerGeos)));
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
  const band = {
    x: Math.max(...openings.map((o) => Math.max(Math.abs(o.x0), Math.abs(o.x1)))) + 6,
    y0: Math.min(...openings.map((o) => o.y0)) - 1.6,
    y1: Math.max(...openings.map((o) => o.y1)) + 1.6,
  };
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
    // forward face: two sparse wing channels per side (the third row is gone)
    for (const sx of [-1, 1]) {
      bays.push(boxMM([Math.min(sx * 62, sx * 122), slab.y0 + 7.25, slab.z0 - 0.15], [Math.max(sx * 62, sx * 122), slab.y0 + 10.75, slab.z0 + 0.3]));
      bays.push(boxMM([Math.min(sx * 74, sx * 114), slab.y0 + 15.5, slab.z0 - 0.15], [Math.max(sx * 74, sx * 114), slab.y0 + 21.5, slab.z0 + 0.3]));
    }
    // wide recessed viewport band around the real openings (holes stay exactly the openings + bezel)
    const bandPanel = panelWithHoles(
      band.x * 2,
      band.y1 - band.y0,
      0.5,
      openings.map((o) => ({ x: (o.x0 + o.x1) / 2, y: (o.y0 + o.y1) / 2 - (band.y0 + band.y1) / 2, w: o.x1 - o.x0 + 1.6, h: o.y1 - o.y0 + 1.6 })),
    );
    bandPanel.translate(0, (band.y0 + band.y1) / 2, slab.z0 - 0.2);
    bays.push(bandPanel);
  }
  addMesh(finish(merge(bays), 1 / 4, { base: 0.6 }), darkMat, "windowBays");
  // raised brow over the viewport band, sill under it, and the trim where the neck meets the slab
  {
    const trim = [
      box(0, band.y1 + 1.2, slab.z0 - 1.7, band.x * 2 + 6, 2.4, 3.4), // brow
      box(0, band.y0 - 0.7, slab.z0 - 1.0, band.x * 2 + 3, 1.4, 2.0), // sill
      boxMM([-neck.halfX - 2.6, slab.y0 - 3.2, neck.z0 - 2.6], [neck.halfX + 2.6, slab.y0, neck.z1 + 2.6]), // neck collar
      boxMM([-neck.halfX - 1.2, slab.y0 - 9, neck.z0 - 1.2], [neck.halfX + 1.2, slab.y0 - 3.2, neck.z1 + 1.2]), // collar step
      boxMM([-slab.halfX - 0.9, slab.y0 - 0.6, slab.z0 - 0.9], [slab.halfX + 0.9, slab.y0 + 1.1, slab.z0 + 0.3]), // forward ledge
      boxMM([-slab.halfX - 0.9, slab.y0 - 0.6, slab.z0 - 0.9], [-slab.halfX, slab.y0 + 1.1, slab.z1 + 0.9]), // port ledge
      boxMM([slab.halfX, slab.y0 - 0.6, slab.z0 - 0.9], [slab.halfX + 0.9, slab.y0 + 1.1, slab.z1 + 0.9]), // starboard ledge
      boxMM([-slab.halfX - 0.9, slab.y0 - 0.6, slab.z1], [slab.halfX + 0.9, slab.y0 + 1.1, slab.z1 + 0.9]), // aft ledge
    ];
    towerParts.push(finish(merge(trim), 1 / 12));
  }
  addMesh(merge(towerParts), hullMat, "towerTerraces");

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
  // a shade darker than the plane so its sunlit flanks stay plated grey rather than blowing out
  addMesh(finish(merge(keelGeos), 1 / 24, { base: 0.84 }), hullMat, "keelBlock");
  // the keel's dark fittings (secondary bay frame, well throat, well collar with its lit rim, decals) are
  // built by buildVentral
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
    ventralChannels: ventralSurface.channels,
  };

  buildEngines(ctx);
  buildTurrets(ctx);
  buildDockingPads(ctx);
  buildVentral(ctx);
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
    // sparse wing windows: two short rows per side inside their recessed channels
    for (const sx of [-1, 1]) {
      windowRows.add(58, 2.5, [sx * 92, slab.y0 + 9, slab.z0 - 0.25], [0, Math.PI, 0]);
      windowRows.add(38, 5, [sx * 94, slab.y0 + 18.5, slab.z0 - 0.25], [0, Math.PI, 0]);
    }
    // short lit strip above the brow, just under the slab roof line
    windowRows.add(60, 2.5, [0, slab.y1 - 3.2, slab.z0 - 0.25], [0, Math.PI, 0]);
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
  const stats = { visibleDetail: 0, culledInside: 0, mode: "exterior" };

  // ---------------- shadow flags
  // Every lit mesh receives; casters are the masses that throw readable shadows (hull with its spine,
  // terraces and tower, domes, keel block, reactor bulb, engines, city blocks, turrets, raised plates).
  // Flat stamps, glows, window strips and hair-thin fittings only receive, so the shadow pass is a dozen
  // draws.
  const CASTERS = new Set(["hull", "towerTerraces", "domesSpire", "keelBlock", "reactorBulb", "engines", "cityBlocks", "turrets", "plates"]);
  const casters = [];
  group.traverse((o) => {
    if (!o.isMesh || !o.material.isMeshStandardMaterial) return;
    o.receiveShadow = true;
    if (CASTERS.has(o.name)) casters.push(o);
  });
  // casting is an exterior-mode thing: inside, the pooled spots must not spend shadow passes on the hull
  const setCasting = (on) => {
    for (const m of casters) m.castShadow = on;
  };

  // ---------------- real sun for the exterior: shadow-casting directional light fitted to the ship
  const sunLight = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
  sunLight.name = "exteriorSun";
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(4096, 4096);
  // ~0.45 m texels over a 1.7 km footprint: a metre of slope-scaled bias plus a normal offset of a texel
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 1.4;
  group.add(sunLight, sunLight.target);
  const shipBox = new THREE.Box3();
  for (const m of baseMeshes) if (m.geometry.attributes.position) shipBox.expandByObject(m);
  shipBox.expandByScalar(12);
  const shipCenter = shipBox.getCenter(new THREE.Vector3());
  const shipRadius = shipBox.getSize(new THREE.Vector3()).length() / 2;
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? shipBox.max.x : shipBox.min.x, i & 2 ? shipBox.max.y : shipBox.min.y, i & 4 ? shipBox.max.z : shipBox.min.z));
  const lightView = new THREE.Matrix4();
  const lightUp = new THREE.Vector3(0, 1, 0);
  const cornerV = new THREE.Vector3();
  const lastFit = new THREE.Vector3();
  function fitShadow(dir) {
    if (lastFit.distanceToSquared(dir) < 1e-6 && sunLight.shadow.camera.far > 1) return;
    lastFit.copy(dir);
    sunLight.position.copy(shipCenter).addScaledVector(dir, shipRadius + 40);
    sunLight.target.position.copy(shipCenter);
    // same view convention as DirectionalLightShadow (camera at the light looking at the target, +Y up)
    lightView.lookAt(sunLight.position, shipCenter, lightUp).setPosition(sunLight.position).invert();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const c of corners) {
      cornerV.copy(c).applyMatrix4(lightView);
      minX = Math.min(minX, cornerV.x);
      maxX = Math.max(maxX, cornerV.x);
      minY = Math.min(minY, cornerV.y);
      maxY = Math.max(maxY, cornerV.y);
      minZ = Math.min(minZ, cornerV.z);
      maxZ = Math.max(maxZ, cornerV.z);
    }
    const cam = sunLight.shadow.camera;
    cam.left = minX - 4;
    cam.right = maxX + 4;
    cam.bottom = minY - 4;
    cam.top = maxY + 4;
    cam.near = Math.max(1, -maxZ - 20);
    cam.far = -minZ + 20;
    cam.updateProjectionMatrix();
  }
  fitShadow(sun.dir.value);

  // "exterior": the real light casts shadows and the shader sun term is zeroed so nothing is lit twice.
  // "interior": the light is off (the interior never receives it) and the sun term returns for the hull
  // chunks seen through windows. The camera modes call this; setInteriorView / the group's visible=true
  // setter mirror it as a fallback so the state always follows the mode changes.
  function setMode(mode) {
    const ext = mode !== "interior";
    stats.mode = ext ? "exterior" : "interior";
    sunLight.visible = ext;
    setCasting(ext);
    if (ext) sun.color.value.setScalar(0);
    else sun.color.value.copy(SUN_COLOR).multiplyScalar(SUN_INTENSITY);
  }
  setMode("exterior");

  // ---------------- interior window culling
  // From inside only the chunks that can be seen through the room's windows are drawn: forward windows
  // (tower slab) look down the dorsal hull toward the bow, belly windows (hangar deck) look down through
  // the well. Chunks are matched by mesh name so anything unlisted stays visible.
  const HIDE_INSIDE = {
    forward: /^(sternWall|trenchWall|keelBlock|keelDark|wellRimLight|tractorField|ventral|reactor|plates_paint|domesSpire|engine|stern|trench(Units|Ribs|Bays))/,
    belly: /^(hullBottom|sternWall|trenchWall|towerTerraces|terraceRecess|windowBays|windowRows|domesSpire|engine|stern|trench(Units|Ribs|Bays)|dockingPads|city|bays|gantries|sensorDomes|dishes|smallPlates|plates|hatches|wallVents|turrets|ventral|reactor|wellRimLight)/,
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
      if (v) setMode("exterior");
    },
  });

  function update(camPos, sunWorld) {
    if (sunWorld) sun.dir.value.copy(sunWorld);
    if (sunLight.visible) fitShadow(sun.dir.value);
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
    setMode("interior");
  }

  return { group, detail, materials, sun, sunLight, update, setInteriorView, setMode, stats, openings };
}
